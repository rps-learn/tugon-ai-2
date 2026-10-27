import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CATEGORIES = ["fire", "medical_emergency", "natural_disaster", "crime_serious", "crime_reported", "minor_disturbance", "social_general"];
const AGENCIES = ["bfp", "eruf", "police", "official"];
const CONFIDENCE_THRESHOLD = 0.7;

const SYSTEM_PROMPT = `You are the AI triage engine for TUGON AI, a barangay incident reporting system serving Barangay Mambaling and Barangay Pardo, Cebu City. Your task is to analyze a citizen's report (which may include a photo, text, or both) and classify it for routing.

## INPUT
You will receive:
- An image (may be absent)
- A text description (may be absent)
- A flag: "in_progress" (true/false) — whether the citizen says the incident is happening RIGHT NOW
- A location tag (purok/sitio, if provided)

The text may be in English, Cebuano, Tagalog, or a mix. Understand all of them.

## CLASSIFICATION CATEGORIES

Classify the report into EXACTLY ONE primary category:

1. fire — Any fire: house, kitchen, vehicle, electrical, trash.
2. medical_emergency — Injury, illness, accident, childbirth, overdose, drowning, or any situation requiring immediate medical attention.
3. natural_disaster — Flood, landslide, earthquake, typhoon damage, downed power line, structural collapse, or any weather-related event where the citizen needs rescue or help.
4. crime_serious — Active or in-progress criminal activity: robbery, assault, physical fight happening now, domestic violence in progress, illegal drug activity, armed threat.
5. crime_reported — After-the-fact crime reporting: "I saw someone steal yesterday," "My neighbor was robbed last week," suspicion of a crime, reporting a past incident.
6. minor_disturbance — Non-criminal or low-severity issues: a fight that already ended, loud noise complaint, drunk and disorderly, stray animal, minor altercation, nuisance.
7. social_general — Lost person, general complaint, request for assistance (non-emergency), road damage, infrastructure issue, other.

## SEVERITY LEVELS

Assign exactly one:
- P1 — Life-threatening or immediate danger. Active fire, active assault, person trapped in flood, heart attack. Requires immediate dispatch.
- P2 — Urgent, in-progress, but not immediately life-threatening. Small contained fire, minor injury needing transport, ongoing disturbance with escalation risk.
- P3 — Important but not time-critical. After-the-fact crime report, resolved disturbance, non-urgent medical concern.
- P4 — Minor / informational. Noise complaint, stray animal, general inquiry, road pothole.

Rules:
- If "in_progress" is true, severity must be P1 or P2.
- If "in_progress" is false, severity must be P3 or P4.
- "in_progress" is a strong prior but the image/text can override it (e.g., in_progress=true but image shows a small candle fire → P2, not P1).

## AGENCY ROUTING

Assign a primary_agency and optionally a secondary_agency:

- bfp — Fire, rescue, structural collapse, disaster rescue
- eruf — Medical transport, ambulance, clinic visit, injury
- police — Crime (serious or reported), disturbance, public order
- official — Social/general issues, lost person, non-emergency requests

Secondary agency is assigned ONLY when the incident clearly involves a second response (e.g., fire with casualties → secondary: eruf; assault with visible injury → secondary: eruf; flood with trapped person → secondary: eruf).

Do NOT assign a secondary agency if it is speculative.

## OUTPUT FORMAT

Respond with ONLY a valid JSON object. No markdown, no explanation, no text outside the JSON.

{
  "category": "<one of the 7 categories>",
  "subcategory": "<short free-text descriptor, e.g. 'house_fire', 'assault_in_progress', 'flood_trapped'>",
  "primary_agency": "<bfp | eruf | police | official>",
  "secondary_agency": "<bfp | eruf | police | official | null>",
  "severity": "<P1 | P2 | P3 | P4>",
  "confidence": <float 0.0 to 1.0>,
  "urgency_note": "<one sentence explaining why this severity, e.g. 'Active physical altercation with visible injury'>"
}

## EDGE CASES

- If the report is ambiguous or you cannot determine the category with confidence above 0.70, set confidence accordingly (e.g. 0.55) and choose the most likely category. The system will flag it for human review.
- If the image and text contradict each other, trust the image for physical state (fire present, injury visible) and trust the text for context (when it happened, what was said).
- If the report contains multiple distinct incidents (e.g., "there is a fire AND my neighbor is being attacked"), classify by the most severe one and note the other in urgency_note.
- If the input is nonsensical, empty, or not a report, set category to "social_general", severity to "P4", and confidence to 0.30.

## LANGUAGE

Understand and process input in English, Cebuano (Bisaya), Tagalog, or code-switched mixes. Always output in English.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

type Triage = {
  category: string | null; subcategory: string; primary_agency: string; secondary_agency: string | null;
  severity: string; confidence: number; urgency_note: string;
};

async function callGemini(model: string, key: string, parts: unknown[], timeoutMs: number): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      },
    );
    if (!res.ok) {
      const err = new Error(`Gemini ${res.status} (${model}): ${(await res.text()).replace(/\s+/g, " ").slice(0, 140)}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    return JSON.parse(text.replace(/^```json\s*|```$/g, "").trim());
  } finally {
    clearTimeout(timer);
  }
}

// Free-tier Gemini models return 503 "high demand" in bursts, so retry once, then try a fallback model.
async function classify(description: string, imageB64: string | null, inProgress: boolean, purok: string): Promise<Triage> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const models = [
    Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest",
    Deno.env.get("GEMINI_FALLBACK_MODEL") ?? "gemini-flash-lite-latest",
  ];
  const parts: unknown[] = [{
    text: `in_progress: ${inProgress}\nlocation: ${purok || "not provided"}\ntext: ${description || "(none)"}`,
  }];
  if (imageB64) parts.push({ inline_data: { mime_type: "image/jpeg", data: imageB64 } });

  let lastErr: unknown = new Error("no model available");
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return normalize(await callGemini(model, key, parts, 12000), inProgress);
      } catch (e) {
        lastErr = e;
        const status = (e as { status?: number }).status;
        const retryable = status === undefined || status === 429 || status >= 500;
        if (!retryable) break; // e.g. 404 bad model name: skip to the next model
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  throw lastErr;
}

// Enforce the output contract and the in_progress <-> severity rule server-side.
function normalize(raw: Record<string, unknown>, inProgress: boolean): Triage {
  const category = CATEGORIES.includes(String(raw.category)) ? String(raw.category) : null;
  if (!category) throw new Error("invalid category");
  const primary = AGENCIES.includes(String(raw.primary_agency)) ? String(raw.primary_agency) : "official";
  let secondary = AGENCIES.includes(String(raw.secondary_agency)) ? String(raw.secondary_agency) : null;
  if (secondary === primary) secondary = null;
  let severity = ["P1", "P2", "P3", "P4"].includes(String(raw.severity)) ? String(raw.severity) : (inProgress ? "P2" : "P3");
  if (inProgress && (severity === "P3" || severity === "P4")) severity = "P2";
  if (!inProgress && (severity === "P1" || severity === "P2")) severity = "P3";
  const confidence = Math.min(1, Math.max(0, Number(raw.confidence) || 0));
  return {
    category,
    subcategory: String(raw.subcategory ?? "").slice(0, 80),
    primary_agency: primary,
    secondary_agency: secondary,
    severity,
    confidence,
    urgency_note: String(raw.urgency_note ?? "").slice(0, 300),
  };
}

// Free reverse geocoding via OpenStreetMap Nominatim (usage policy: identify the app, max ~1 request/second).
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`,
      { signal: ctrl.signal, headers: { "User-Agent": "TUGON-AI-student-project/1.0", "Accept-Language": "en" } },
    );
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d.display_name === "string" ? d.display_name.slice(0, 250) : null;
  } catch {
    return null; // address is a convenience; never block a report on it
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const description = String(body.description ?? "").slice(0, 2000);
  const imageB64 = typeof body.image_base64 === "string" && body.image_base64.length < 2_500_000 ? body.image_base64 : null;
  const inProgress = body.in_progress === true;
  const purok = String(body.purok ?? "").slice(0, 80);
  const landmark = String(body.landmark ?? "").slice(0, 160);
  const clientAddress = String(body.address ?? "").replace(/\s+/g, " ").slice(0, 250);
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;
  const clientId = typeof body.client_id === "string" ? body.client_id.slice(0, 64) : null;
  const anonymous = body.anonymous === true;
  if (!description.trim() && !imageB64) return json({ error: "A photo or description is required" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Idempotency for the offline queue: resubmitting the same client_id returns the original report.
  if (clientId) {
    const { data: existing } = await db.from("incidents")
      .select("id,category,severity,status,needs_review,primary_agency").eq("client_id", clientId).maybeSingle();
    if (existing) return json({ ...existing, pending: existing.status === "submitted" });
  }

  let reporterId: string | null = null;
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (token && !anonymous) {
    const { data } = await db.auth.getUser(token);
    reporterId = data?.user?.id ?? null;
  }

  const { data: row, error: insErr } = await db.from("incidents").insert({
    client_id: clientId, reporter_id: reporterId, anonymous, description, lat, lng, purok, landmark, in_progress: inProgress,
  }).select("id").single();
  if (insErr || !row) return json({ error: insErr?.message ?? "insert failed" }, 500);
  const id = row.id as string;

  let photoPath: string | null = null;
  if (imageB64) {
    try {
      const bytes = Uint8Array.from(atob(imageB64), (c) => c.charCodeAt(0));
      const path = `${id}.jpg`;
      const { error } = await db.storage.from("incident-photos").upload(path, bytes, { contentType: "image/jpeg" });
      if (!error) photoPath = path;
    } catch (_) { /* photo is optional; continue */ }
  }

  // The slow part (AI, 10-30 s) runs after the response so the citizen is not left waiting.
  const finish = async () => {
  // Prefer the address the citizen's phone already looked up; otherwise try from the server.
  const addressPromise: Promise<string | null> = clientAddress
    ? Promise.resolve(clientAddress)
    : lat !== null && lng !== null ? reverseGeocode(lat, lng) : Promise.resolve(null);

  let triage: Triage;
  let aiFailed = false;
  try {
    triage = await classify(description, imageB64, inProgress, purok);
  } catch (e) {
    console.error("triage failed", e);
    aiFailed = true;
    // Never lose a report: fall back to manual routing by the Barangay Official.
    triage = {
      category: null, subcategory: "unclassified", primary_agency: "official", secondary_agency: null,
      severity: inProgress ? "P2" : "P3", confidence: 0,
      urgency_note: `AI unavailable - needs manual routing (${e instanceof Error ? e.message.slice(0, 200) : "unknown error"})`,
    };
  }

  const address = await addressPromise;
  const needsReview = triage.confidence < CONFIDENCE_THRESHOLD;

  let clusterId: string | null = null;
  if (triage.category && lat !== null && lng !== null) {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: dup } = await db.from("incidents").select("id")
      .eq("category", triage.category).is("cluster_id", null).neq("id", id).gte("created_at", since)
      .gte("lat", lat - 0.001).lte("lat", lat + 0.001).gte("lng", lng - 0.001).lte("lng", lng + 0.001)
      .order("created_at", { ascending: true }).limit(1);
    clusterId = dup?.[0]?.id ?? null;
  }

  const status = needsReview ? "classified" : "agency_notified";
  const { error: updErr } = await db.from("incidents").update({
    ...triage, address, photo_path: photoPath, needs_review: needsReview, status, cluster_id: clusterId,
  }).eq("id", id);
  if (updErr) { console.error("update failed", updErr.message); return; }

  await db.from("incident_events").insert([
    { incident_id: id, actor_id: reporterId, action: "submitted" },
    {
      incident_id: id, action: aiFailed ? "ai_failed" : "classified",
      note: `${triage.category ?? "?"} ${triage.severity} conf=${triage.confidence}${clusterId ? " (duplicate)" : ""}`,
    },
  ]);

  };

  EdgeRuntime.waitUntil(finish().catch((e) => console.error("background triage crashed", e)));
  return json({ id, status: "submitted", pending: true });
});
