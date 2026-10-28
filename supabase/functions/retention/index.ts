import { createClient } from "jsr:@supabase/supabase-js@2";

// Deletes reports (and their photos) older than the retention period promised on the Privacy page.
// Safe to leave public: it can only remove data that is already past its retention date.
const RETENTION_MONTHS = Number(Deno.env.get("RETENTION_MONTHS") ?? 12);

Deno.serve(async () => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

  const { data: old, error } = await db.from("incidents").select("id,photo_path")
    .lt("created_at", cutoff.toISOString()).limit(500);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const ids = (old ?? []).map((r) => r.id as string);
  const photos = (old ?? []).map((r) => r.photo_path as string | null).filter((p): p is string => !!p);
  if (photos.length) await db.storage.from("incident-photos").remove(photos);
  if (ids.length) await db.from("incidents").delete().in("id", ids); // incident_events cascade

  // Rate-limit hashes are only needed for an hour.
  const logCutoff = new Date(Date.now() - 2 * 86400000).toISOString();
  await db.from("report_log").delete().lt("created_at", logCutoff);

  return new Response(JSON.stringify({ deleted_incidents: ids.length, deleted_photos: photos.length, cutoff: cutoff.toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
});
