-- TUGON AI schema. Run in Supabase SQL editor (or apply as a migration).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'citizen'
    check (role in ('citizen','official','bfp','eruf','police')),
  created_at timestamptz not null default now()
);

create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'citizen');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  client_id text unique,                       -- offline-queue idempotency key
  reporter_id uuid references auth.users(id) on delete set null,
  anonymous boolean not null default false,
  description text,
  photo_path text,
  lat double precision,
  lng double precision,
  purok text,
  in_progress boolean not null default false,
  category text,
  subcategory text,
  primary_agency text check (primary_agency in ('bfp','eruf','police','official')),
  secondary_agency text check (secondary_agency in ('bfp','eruf','police','official')),
  severity text check (severity in ('P1','P2','P3','P4')),
  confidence real,
  urgency_note text,
  needs_review boolean not null default false,
  status text not null default 'submitted'
    check (status in ('submitted','classified','agency_notified','acknowledged','en_route','on_scene','resolved')),
  cluster_id uuid references public.incidents(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);
create index on public.incidents (created_at desc);
create index on public.incidents (primary_agency);
create index on public.incidents (secondary_agency);
create index on public.incidents (reporter_id);
create index on public.incidents (cluster_id);

create table public.incident_events (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);
create index on public.incident_events (incident_id);

alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_events enable row level security;

create policy "own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_role_name() = 'official');

-- RBAC: each agency sees only reports routed to it. Inserts happen only
-- through the triage edge function (service role); updates only via RPCs below.
create policy "incident visibility" on public.incidents for select to authenticated
using (
  reporter_id = auth.uid()
  or public.current_role_name() = 'official'
  or (
    public.current_role_name() in ('bfp','eruf','police')
    and needs_review = false
    and (primary_agency = public.current_role_name() or secondary_agency = public.current_role_name())
  )
);

create policy "event visibility" on public.incident_events for select to authenticated
using (exists (select 1 from public.incidents i where i.id = incident_id));

create or replace function public.update_incident_status(p_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r text := public.current_role_name();
  i public.incidents;
begin
  if p_status not in ('acknowledged','en_route','on_scene','resolved') then
    raise exception 'invalid status';
  end if;
  select * into i from public.incidents where id = p_id;
  if not found then raise exception 'not found'; end if;
  if not (r = 'official' or (r in ('bfp','eruf','police') and not i.needs_review
          and (i.primary_agency = r or i.secondary_agency = r))) then
    raise exception 'forbidden';
  end if;
  update public.incidents set
    status = p_status,
    acknowledged_at = coalesce(acknowledged_at, now()),
    resolved_at = case when p_status = 'resolved' then now() else resolved_at end,
    resolution_note = case when p_status = 'resolved' then p_note else resolution_note end
  where id = p_id;
  insert into public.incident_events (incident_id, actor_id, action, note)
  values (p_id, auth.uid(), 'status:' || p_status, p_note);
end $$;

create or replace function public.reroute_incident(
  p_id uuid, p_category text, p_primary text, p_secondary text, p_severity text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_role_name() <> 'official' then raise exception 'forbidden'; end if;
  update public.incidents set
    category = p_category, primary_agency = p_primary,
    secondary_agency = nullif(p_secondary, ''), severity = p_severity,
    needs_review = false, status = 'agency_notified'
  where id = p_id;
  insert into public.incident_events (incident_id, actor_id, action, note)
  values (p_id, auth.uid(), 'reroute',
          p_category || ' / ' || p_primary || ' / ' || coalesce(p_secondary, '-') || ' / ' || p_severity);
end $$;

-- Lets guests (no account) track their own reports by the unguessable ids kept on their device.
create or replace function public.get_report_status(p_ids uuid[])
returns table (id uuid, category text, severity text, status text,
               created_at timestamptz, acknowledged_at timestamptz, resolved_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, category, severity, status, created_at, acknowledged_at, resolved_at
  from public.incidents where id = any(p_ids)
$$;

revoke execute on function public.update_incident_status(uuid, text, text) from public, anon;
revoke execute on function public.reroute_incident(uuid, text, text, text, text) from public, anon;
grant execute on function public.update_incident_status(uuid, text, text) to authenticated;
grant execute on function public.reroute_incident(uuid, text, text, text, text) to authenticated;
grant execute on function public.get_report_status(uuid[]) to anon, authenticated;

insert into storage.buckets (id, name, public) values ('incident-photos', 'incident-photos', false)
on conflict do nothing;

create policy "responders read photos" on storage.objects for select to authenticated
using (bucket_id = 'incident-photos'
       and public.current_role_name() in ('official','bfp','eruf','police'));

alter publication supabase_realtime add table public.incidents;

-- Hardening: trigger/helper functions must not be callable through the public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.current_role_name() from public, anon;
grant execute on function public.current_role_name() to authenticated;
