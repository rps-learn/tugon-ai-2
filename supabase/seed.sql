-- DEMO DATA ONLY. Creates 5 demo accounts (password: Tugon#2026demo) and ~180 sample resolved incidents.
-- Delete the demo accounts before any real deployment.

do $$
declare u record; uid uuid;
begin
  for u in select * from (values
    ('official@tugon.test', 'Barangay Official (Demo)', 'official'),
    ('bfp@tugon.test',      'BFP Station (Demo)',       'bfp'),
    ('eruf@tugon.test',     'ERUF Clinic (Demo)',       'eruf'),
    ('police@tugon.test',   'Barangay Police (Demo)',   'police'),
    ('citizen@tugon.test',  'Juan Dela Cruz (Demo)',    'citizen')
  ) v(email, name, role)
  loop
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', u.email,
      crypt('Tugon#2026demo', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name),
      now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', u.email), 'email', now(), now(), now());
    update public.profiles set role = u.role where id = uid;
  end loop;
end $$;

with base as (
  select now() - random() * interval '180 days' as ts,
         2 + random() * 20 as ack,
         1 + floor(random() * 9)::int as k,
         random() as r_conf, random() as r_lat, random() as r_lng, random() as r_purok, random() as r_res
  from generate_series(1, 180)
), cat(k, category, sub, pa, sa, sev) as (
  values
    (1, 'fire', 'house_fire', 'bfp', 'eruf', 'P1'),
    (2, 'fire', 'kitchen_fire', 'bfp', null, 'P2'),
    (3, 'medical_emergency', 'injury', 'eruf', null, 'P2'),
    (4, 'medical_emergency', 'cardiac', 'eruf', null, 'P1'),
    (5, 'natural_disaster', 'flood', 'bfp', 'eruf', 'P2'),
    (6, 'crime_serious', 'assault_in_progress', 'police', 'eruf', 'P1'),
    (7, 'crime_reported', 'theft_reported', 'police', null, 'P3'),
    (8, 'minor_disturbance', 'noise_complaint', 'police', null, 'P4'),
    (9, 'social_general', 'road_damage', 'official', null, 'P4')
)
insert into public.incidents (category, subcategory, primary_agency, secondary_agency, severity, confidence,
  urgency_note, status, needs_review, in_progress, description, lat, lng, purok,
  created_at, acknowledged_at, resolved_at)
select c.category, c.sub, c.pa, c.sa, c.sev, round((0.75 + b.r_conf * 0.24)::numeric, 2),
  'Sample historical report', 'resolved', false, c.sev in ('P1', 'P2'), 'Sample historical report',
  10.2700 + b.r_lat * 0.025, 123.8550 + b.r_lng * 0.015, 'Purok ' || (1 + floor(b.r_purok * 6))::int,
  b.ts, b.ts + interval '1 minute' * b.ack, b.ts + interval '1 minute' * (b.ack + 10 + b.r_res * 90)
from base b join cat c using (k);

-- Open demo incidents (so the consoles are not empty) + one duplicate cluster.
with fire as (
  insert into public.incidents (description, category, subcategory, primary_agency, secondary_agency, severity, confidence,
    urgency_note, status, in_progress, lat, lng, purok, created_at)
  values ('May sunog sa among silingan! Daghan kaayo og aso.', 'fire', 'house_fire', 'bfp', 'eruf', 'P1', 0.96,
    'Demo open incident: active structure fire with possible casualties', 'agency_notified', true,
    10.2812, 123.8601, 'Purok 2', now() - interval '4 minutes')
  returning id
)
insert into public.incidents (description, category, subcategory, primary_agency, severity, confidence,
  urgency_note, status, in_progress, lat, lng, purok, created_at, cluster_id)
select 'Sunog sa Purok 2, palihug dali', 'fire', 'house_fire', 'bfp', 'P1', 0.93,
  'Demo open incident: duplicate of nearby fire report', 'agency_notified', true,
  10.2813, 123.8603, 'Purok 2', now() - interval '2 minutes', id from fire;

insert into public.incidents (description, category, subcategory, primary_agency, secondary_agency, severity, confidence,
  urgency_note, status, in_progress, lat, lng, purok, created_at, acknowledged_at) values
 ('Nawad-an og pulso ang akong tatay, lisud ug ginhawa.', 'medical_emergency', 'cardiac', 'eruf', null, 'P1', 0.94,
  'Demo open incident: possible cardiac arrest', 'acknowledged', true, 10.2745, 123.8570, 'Purok 5',
  now() - interval '15 minutes', now() - interval '12 minutes'),
 ('Gi-assault ang akong silingan sa gawas sa balay, nagdugo siya.', 'crime_serious', 'assault_in_progress', 'police', 'eruf', 'P1', 0.91,
  'Demo open incident: active assault with visible injury', 'agency_notified', true, 10.2850, 123.8660, 'Purok 1',
  now() - interval '7 minutes', null),
 ('Taas na ang tubig-baha, naipit mi sa ikaduha nga andana.', 'natural_disaster', 'flood_trapped', 'bfp', 'eruf', 'P2', 0.88,
  'Demo open incident: residents stranded by floodwater', 'en_route', true, 10.2690, 123.8540, 'Purok 4',
  now() - interval '30 minutes', now() - interval '25 minutes'),
 ('Kusog kaayo ang karaoke sa kasilinganan hangtod alas-2 sa buntag.', 'minor_disturbance', 'noise_complaint', 'police', null, 'P4', 0.9,
  'Demo open incident: noise complaint', 'agency_notified', false, 10.2790, 123.8620, 'Purok 3',
  now() - interval '1 hour', null),
 ('Dako nga lungag sa dalan duol sa eskwelahan.', 'social_general', 'road_damage', 'official', null, 'P4', 0.85,
  'Demo open incident: road damage', 'agency_notified', false, 10.2770, 123.8600, 'Purok 6',
  now() - interval '3 hours', null);
