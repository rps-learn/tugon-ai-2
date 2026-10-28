# TUGON AI

AI-assisted barangay incident reporting and routing for Barangay Mambaling and Barangay Pardo, Cebu City. A free-tier PWA: React + Vite, Supabase, Gemini, Vercel.

**Pipeline:** Classify, Route, Measure, Analyze.

- [Setup guide](docs/SETUP.md): accounts, keys, env vars, Vercel deploy, free-tier limits
- [User guide](docs/USER_GUIDE.md): citizen, Barangay Official, BFP / ERUF / Police
- [Demo script](docs/DEMO_SCRIPT.md): sample scenario, test data, defense flow and likely panel questions
- [Design decisions](docs/DESIGN.md): the UX/UI principles, design tokens and responsive behavior

## Quick start

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173 (demo logins appear on the sign-in page when `VITE_DEMO_MODE=true`).

Put your Gemini API key in the root `.env`, and also add it as a `GEMINI_API_KEY` secret in Supabase (Edge Functions, Secrets). See the setup guide.
