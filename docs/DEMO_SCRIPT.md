# TUGON AI: Demo Script and Practice Scenario

Use this to learn the app and to rehearse your defense. It follows one story: **a fire is reported, routed, responded to, and analyzed**, then covers the other cases (medical, crime, unclear reports, offline).

> The AI's exact answers can vary slightly between runs. The expected results below are what you should *typically* see. The urgency rule is enforced by the system: "happening now = Yes" always gives P1 or P2, and "No" always gives P3 or P4.

## 0. Before you start (5-minute checklist)

- [ ] The Supabase project is **active** (not paused). Open the dashboard and click Restore if needed.
- [ ] `GEMINI_API_KEY` is saved under Supabase, Edge Functions, **Secrets**.
- [ ] The Vercel site loads on HTTPS and shows the demo login buttons (`VITE_DEMO_MODE=true`).
- [ ] You have a phone (the citizen) and a laptop (the responders).
- [ ] You have 2-3 sample photos on your phone (a fire, a flood, a road pothole; stock images are fine). **Never use real people's photos.**

### Set up your screens
You can only be signed in as one role per browser profile, so use separate windows:

| Screen | Who | How |
|---|---|---|
| Phone | Citizen (guest, no login) | Open the site. Optionally install it to the home screen. |
| Laptop, normal window | Barangay Official | Sign in with the **Barangay Official** demo button. |
| Laptop, private/incognito window | BFP | Open the same site and use the **BFP** demo button. |

Having the Official and BFP windows side by side lets the audience see reports arrive live.

---

## 1. Scenario: "Fire in Purok 3"

### Step 1: A citizen reports a fire (phone)

1. Open the site and **Allow location** when asked.
2. Tap **Add photo** and pick a fire photo.
3. In **What happened?** type (Cebuano):
   `Nagsiga ang kalayo sa ikaduhang andana sa balay sa among silingan, daghan og aso, naay bata nga naipit sa sulod.`
4. Tap the **Fire** chip.
5. **Is it happening right now?** Tap **Yes**.
6. Type `Purok 3` as the purok. Leave "Report anonymously" unticked.
7. Tap **Submit report**.

**Expected:** a big **P1** circle and "Help is on the way".
**AI result (typical):** category fire, severity P1, primary agency BFP, secondary ERUF (a child is trapped).

### Step 2: The agencies receive it (laptop)

1. In the **BFP** window, open **Console**. The new fire appears at the top with a red **P1** badge, a sound plays, and a red banner says "New P1 incident". (Click anywhere on the page once beforehand so the browser allows sound.)
2. Click the card to expand it. Show the **AI note** (reason and confidence) and the **photo**.
3. Press **Acknowledge**, then **En route**, then **On scene**, then **Resolve** and type a note such as `Fire out, 2 residents treated.`
4. Sign in as **ERUF** (in the Official window, sign out first, or use another private window). Show that ERUF also sees this fire because it was the **secondary** agency.
5. Sign in as **Police**. Show that Police does **not** see the fire. This is the **role-based access control** the research claims.

### Step 3: The citizen tracks it (phone)

Open **My reports**. The steps tick forward as BFP presses the buttons: Submitted, Classified, Agency notified, Acknowledged, ..., Resolved. It refreshes every 15 seconds.

### Step 4: Analytics (Official window)

Open **Console**, then **Analytics**:
- Show **incidents per month**, **severity per month**, **by incident type**.
- Show **response time by agency** (average minutes to acknowledge and resolve). This is the study's KPI.
- Change **Period** to 30 days and pick an **Agency** filter.
- Click **Export CSV** to show data export.

---

## 2. More test reports (try each one)

Run these from the phone as a guest. "Now?" is the happening-right-now toggle.

| # | Case | Text to type | Now? | Typical result |
|---|---|---|---|---|
| 1 | Medical (Tagalog) | `Nawalan ng malay ang lola ko at hindi na siya humihinga nang maayos, pakitulungan po.` | Yes | medical_emergency, P1, ERUF |
| 2 | Serious crime | `Gi-assault ang akong silingan sa dalan, nagdugo ang iyang ulo.` | Yes | crime_serious, P1, Police + ERUF |
| 3 | After-the-fact crime | `Kagabi may nagnakaw ng motor sa tapat ng tindahan namin sa Purok 5.` | No | crime_reported, P3, Police |
| 4 | Noise complaint | `Kusog kaayo ang karaoke sa among kasilinganan hangtod alas-2 sa buntag.` | No | minor_disturbance, P4, Police |
| 5 | Road damage (use a pothole photo) | `Dako nga lungag sa dalan duol sa kapilya.` | No | social_general, P4, Barangay Official |
| 6 | Flood | `Mitaas ang tubig-baha, naipit mi sa ikaduhang andana.` | Yes | natural_disaster, P1 or P2, BFP + ERUF |
| 7 | Unclear report | `Naay problema diri palihug lang.` | Yes | **Low confidence** goes to the Official's **Review** tab |
| 8 | SOS | Tap **SOS**, then **Send SOS now** | (automatic) | Low confidence, so it goes to review |

### Show the "human in the loop" (cases 7 and 8)
1. In the Official window open **Review (1)**.
2. Read the AI's note and confidence (below 70%).
3. Choose a category, severity and agency, then tap **Route and notify agency**.
4. Show that the right agency's console now has it, and that it was **invisible to agencies before** you routed it.

### Show duplicate clustering
1. Submit the fire report (scenario step 1) **twice** from the same phone within 30 minutes, at the same location.
2. In the console, one card appears with a **"+1 similar"** badge instead of two separate incidents.

### Show anonymous reporting
Submit a report with **Report anonymously** ticked, for example: `Naay gihilabtan ug gibunalan sa kasilinganan, palihug tabang.` Explain that it is not linked to any account.

### Show offline mode
1. On a laptop browser: Developer Tools (F12), **Network** tab, set **Offline**.
2. Submit a report. The citizen sees "Saved on your device..." and a yellow banner shows **1 waiting to send**.
3. Set the network back to **No throttling**. Within a few seconds the report sends automatically, and it appears in the console.

### Show the language switch
Use the dropdown in the top bar to switch to **Cebuano** and **Tagalog**, then back to English. The citizen screens change language. Responder screens stay in English.

---

## 3. Suggested 10-minute defense flow

| Time | What to show | What to say |
|---|---|---|
| 0:00 | The problem | Slow, unorganized barangay incident reporting. Responders do not know which reports are urgent. |
| 1:00 | Citizen report (fire, with photo) | One screen, photo and GPS, and the "happening now" toggle. |
| 3:00 | BFP console | The report arrived instantly, ranked by urgency, with the AI's reason. |
| 4:00 | Police and ERUF consoles | Each agency only sees what is routed to it (RBAC). |
| 5:00 | Status updates and citizen tracking | Transparency for citizens. |
| 6:00 | Unclear report in the Review tab | AI is not trusted blindly. Low confidence goes to a human. |
| 7:00 | Analytics and CSV | Response-time KPI and trends for DRRM planning. |
| 8:30 | Offline and language | Works with weak signal, in Cebuano and Tagalog. |
| 9:30 | Limits and future work | See section 5. |

---

## 4. Likely panel questions

**Why use AI instead of just asking the citizen to pick a category?**
People in an emergency pick wrong or do not have time. The AI reads the photo and text, in Bisaya or Tagalog, and also scores urgency, which a category dropdown cannot do.

**What if the AI is wrong?**
Three safeguards. A confidence threshold (below 70% goes to a human). The Barangay Official can re-route any report. And the system enforces the urgency rule regardless of what the AI says.

**What if the AI service is down or the internet fails?**
If the AI fails, the report is still saved and goes to the Official's review queue. If the phone is offline, the report is queued on the device and sent when the signal returns.

**How do you protect privacy?**
Row-level security means each agency only reads its own incidents. Photos are in a private bucket. Citizens can report anonymously. There is a data retention and privacy page. (Note: the free Gemini tier may use inputs to improve the model, which is why we only test with sample data.)

**How do you measure success?**
Response time, meaning the minutes from report to acknowledgement and to resolution, per agency. It is calculated automatically and charted in Analytics.

**Does it cost anything?**
No. Supabase, Gemini, Vercel and OpenStreetMap are all on free tiers.

**What are the limitations?**
Be honest, because panels respect that.
- No SMS or push notifications. The console alerts only while it is open.
- Free-tier limits (Supabase pauses when idle; Gemini rate limits).
- AI accuracy was not formally evaluated yet; a test set of labeled reports is future work.
- No rate limiting on the public report endpoint.
- No trend prediction or PDF reports yet.

---

## 5. Resetting after rehearsal

Practice reports stay in the database. To remove **only** the reports created through the app (the seeded history and demo incidents are kept), run this in Supabase, SQL Editor:

```sql
delete from public.incidents where client_id is not null;
```

The seeded "open" demo incidents show their age ("4 min ago" becomes "3 days ago") as time passes, and the new-incident alert only triggers for fresh ones. To refresh them, delete the old ones and re-run the last part of `supabase/seed.sql` (the section starting with `-- Open demo incidents`):

```sql
delete from public.incidents where urgency_note like 'Demo open incident%';
```

## 6. If something goes wrong during the defense

| Problem | Quick fix |
|---|---|
| Report says "A barangay official is reviewing it" for everything | The Gemini key is missing or the quota is used. Use this as a demo of the fallback (Review tab), then explain. |
| The site is blank or errors | The Supabase project may be paused, so restore it in the dashboard (takes about a minute). |
| Location is blocked | Tap the map to place the pin manually. |
| No sound for alerts | Click once anywhere on the console page, then submit again. |
| Demo logins not showing | `VITE_DEMO_MODE` is not `true` in Vercel. Set it and redeploy. |
| Wi-Fi is bad | Show the offline queue on purpose, and keep a short screen recording of the full flow as a backup. |
