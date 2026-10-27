# TUGON AI: Setup Guide

Everything here uses free tools. Limits are as of writing; check each provider's pricing page before relying on them.

## 1. What you need

| Tool | Used for | Account needed | Cost |
|---|---|---|---|
| [Supabase](https://supabase.com) | Database, login, photo storage, realtime, the AI Edge Function | Yes | Free plan |
| [Google AI Studio](https://aistudio.google.com/apikey) | Gemini API key (AI classification) | Google account | Free tier |
| [Vercel](https://vercel.com) | Hosting the web app (HTTPS, required for PWA install and GPS) | Yes | Hobby (free) plan |
| [Node.js](https://nodejs.org) 20 or newer | Building and running the app locally | No | Free |
| OpenStreetMap + Leaflet | Maps | No (no key) | Free |

Optional: a GitHub account (Vercel can deploy from a repo), and Chrome or Edge for testing.

## 2. Project layout

```
tugon-ai-v2/
  .env                      Server-side secrets (GEMINI_API_KEY). Never commit.
  app/                      The PWA (Vite + React + TypeScript)
    .env                    Public settings (Supabase URL + publishable key)
  supabase/
    schema.sql              Tables, security rules, functions
    seed.sql                Demo accounts and sample incidents
    functions/triage/       The AI Edge Function
  docs/                     This documentation
```

## 3. Run it locally

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173. The app talks to the Supabase project configured in `app/.env`.

### `app/.env` (public settings, safe to be in the browser)

| Variable | Meaning |
|---|---|
| `VITE_SUPABASE_URL` | Your project URL, `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The Supabase **publishable** key (`sb_publishable_...`) |
| `VITE_DEMO_MODE` | `true` shows one-click demo logins on the sign-in page. Set `false` for real use. |

### Root `.env` (server-side secrets, never put these in `app/.env`)

| Variable | Meaning |
|---|---|
| `GEMINI_API_KEY` | Your key from Google AI Studio |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash` |

Variables starting with `VITE_` are bundled into the public website. Never give a secret that prefix.

## 4. Get the Gemini API key

1. Go to https://aistudio.google.com/apikey and sign in with a Google account.
2. Create an API key and copy it.
3. Paste it into the root `.env` as `GEMINI_API_KEY=...`.
4. **Give it to Supabase too.** The AI call runs inside a Supabase Edge Function, which cannot read your local `.env`.
   - Dashboard: Project, Edge Functions, Secrets, add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`).
   - Or with the CLI: `npx supabase secrets set --env-file .env --project-ref <project-ref>`

Until the secret is set, reports still work, but every report is sent to the Barangay Official's review queue for manual routing.

### Choosing the Gemini model
Google retires and renames Gemini models often, and some are closed to new accounts (for example `gemini-2.5-flash` returned a 404 "no longer available to new users" for this project). The function therefore uses these defaults:

| Secret (optional) | Default | Purpose |
|---|---|---|
| `GEMINI_MODEL` | `gemini-flash-latest` | Main model. This alias always points to the current Flash model. |
| `GEMINI_FALLBACK_MODEL` | `gemini-flash-lite-latest` | Used if the main model is busy or unavailable. |

The function retries once on temporary errors (503 "high demand", 429, timeouts), then tries the fallback model. If a model name stops working, set `GEMINI_MODEL` to a current Flash model name from AI Studio. No redeploy is needed.

If AI classification fails, the reason is written into the report's **AI note** (visible in the Official's Review tab), for example `Gemini 404 (...)`.

## 5. Supabase setup

The existing project is **tugon ai 2** (ref `amalxkwwytrlxbxekvxw`) and is already set up. To recreate it from scratch, for example for another group:

1. Create a free project at https://supabase.com/dashboard. Pick the Singapore region for the shortest delay from Cebu.
2. Open **SQL Editor** and run `supabase/schema.sql`, then `supabase/seed.sql` (demo data, optional).
3. Deploy the Edge Function. In the repo root, with the Supabase CLI:
   ```bash
   npx supabase login
   npx supabase functions deploy triage --no-verify-jwt --project-ref <project-ref>
   ```
   `--no-verify-jwt` is intentional so guests (no account) can submit reports. The function validates input itself.
4. Add the `GEMINI_API_KEY` secret (section 4).
5. **Authentication, Providers, Email:** turn off **Confirm email** if you want citizen sign-ups to work instantly. Guests can always report without an account.
6. Copy the project URL and publishable key (Project Settings, API Keys) into `app/.env`.

### Security design (why citizens cannot see each other's reports)

- Row-level security is enabled on every table. Agencies can only read incidents routed to them. The Barangay Official reads all.
- Nobody can insert or update incidents directly from the browser. Reports go through the Edge Function. Status changes and re-routing go through checked database functions.
- Photos are stored in a private bucket. Only responder roles can view them.

## 6. Deploy to Vercel

1. Push the repo to GitHub, or use the CLI below.
2. In Vercel: **Add New, Project**, import the repo.
3. Set **Root Directory** to `app`. Vercel detects Vite automatically.
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEMO_MODE` (`true` for a demo or defense, `false` for real use)
5. Deploy. `app/vercel.json` already handles page refreshes on sub-pages.

CLI alternative:
```bash
cd app
npx vercel --prod
```

After changing environment variables in Vercel, **redeploy**. Vite reads them at build time.

## 7. Install as an app (PWA)

- **Android (Chrome):** open the site, menu, **Install app** or **Add to Home screen**.
- **iPhone (Safari):** Share, **Add to Home Screen**.
- Location and camera require HTTPS, so test on the Vercel URL, not an `http://` address (localhost is the only exception).

## 8. Free-tier limits to know before the defense

| Service | What to watch |
|---|---|
| Supabase Free | Projects **pause after about a week of inactivity**. Open the dashboard and click Restore before your demo. A free account is limited to 2 active projects. There are also storage, database size and bandwidth caps. |
| Gemini free tier | Requests per minute and per day are capped, so a burst of reports can hit the limit. Reports still save and fall back to manual review. Google may use free-tier inputs to improve its products, so **do not use real personal photos or data**. |
| Vercel Hobby | For non-commercial use. A real barangay deployment may need a different plan or host. |
| OpenStreetMap tiles | Fine for a demo. For heavy traffic, use a tile provider with its own free tier. |

## 9. Demo accounts

Created by `supabase/seed.sql` (the password is in that file):

| Role | Email |
|---|---|
| Barangay Official | `official@tugon.test` |
| BFP | `bfp@tugon.test` |
| ERUF | `eruf@tugon.test` |
| Police | `police@tugon.test` |
| Citizen | `citizen@tugon.test` |

**Before any real-world use:** delete these users in Supabase (Authentication, Users), remove the sample incidents, and set `VITE_DEMO_MODE=false`.

To make a real person an agency user: they sign up as a citizen, then in the SQL Editor run
```sql
update public.profiles set role = 'bfp' where id = '<their user id>';
```
Valid roles: `citizen`, `official`, `bfp`, `eruf`, `police`.

## 10. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Every report says "A barangay official is reviewing it" | Open the report in the Official's **Review** tab and read the **AI note**. `GEMINI_API_KEY not set` means the Supabase secret is missing. `Gemini 400/403` means a bad key. `Gemini 404` means the model name is retired, so set `GEMINI_MODEL`. `Gemini 429/503` means free-tier limits or high demand: wait and retry. |
| Sign-in fails for a new citizen | Email confirmation is still on, so confirm the email or disable it (section 5). |
| Page is blank after deploy | Environment variables missing in Vercel. Add them and redeploy. |
| Refreshing `/console` gives a 404 | Root Directory is not `app`, so `vercel.json` is not being used. |
| No location | The browser blocked permission, or the site is not on HTTPS. The user can tap the map to place the pin. |
| Console shows no incidents | Agencies only see **open** incidents routed to them. Tick **Show resolved**, or use the seeded open incidents. |
| Everything is slow or errors after days idle | The free Supabase project paused. Restore it in the dashboard. |
| `npm run build` fails on `react-is` | Run `npm install react-is` in `app/`. |

## 11. Known limitations (student scope)

- No SMS or push notifications. Agencies get a live in-app list with a sound alert while the console is open.
- No broadcast advisories, PDF reports, trend alerts or predictions.
- The report endpoint has no rate limiting.
- Map tiles do not work offline (reports still queue offline).
- The privacy policy is a template and should be reviewed by a data protection officer before real use.
