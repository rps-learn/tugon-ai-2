# TUGON AI: User Guide

TUGON AI lets residents of Barangay Mambaling and Barangay Pardo report incidents with a photo and/or text. AI suggests the type, urgency and responsible agency, and the report goes to the right responders.

> **In a life-threatening emergency, also call 911 or your barangay hotline.** This app does not replace emergency calls.

## Urgency levels

| Level | Meaning | What the citizen sees |
|---|---|---|
| **P1** | Life-threatening, immediate danger | "Help is on the way" |
| **P2** | Urgent, happening now, not immediately life-threatening | "Report received, agency notified" |
| **P3** | Important, not time-critical | "Report logged" |
| **P4** | Minor or informational | "Thank you for reporting" |

If the AI is not confident enough (below 70%) or is unavailable, the citizen sees "Report received. A barangay official is reviewing it." and the Barangay Official routes it by hand.

## Agencies

| Agency | Handles |
|---|---|
| BFP | Fire, rescue, disaster rescue |
| ERUF | Medical, ambulance, injuries |
| Barangay Police | Crimes, disturbances, public order |
| Barangay Official | Social and general issues, and anything the AI could not route |

---

## Citizens

You do not need an account to report.

### Send a quick report
1. Open the app and allow **location** when asked. You can also tap the map to move the pin.
2. Add a photo if you can do so safely: tap **Take photo** to use the camera, or **Upload photo** to choose one from your gallery. Tap **Remove** to change it.
3. Describe what happened in English, Bisaya or Tagalog. Optionally tap a type chip (Fire, Medical, Disaster, Crime, Disturbance, Other).
4. Answer **Is it happening right now?** This is required, because it decides how urgent the report is.
5. Optionally enter your Purok or Sitio and a **landmark** (for example "near the basketball court"). A readable address for your pin appears under the map so you can check it. Tick **Report anonymously** for sensitive issues such as domestic violence.
6. Tap **Submit report**. Within a couple of seconds you see "Report received. Checking how urgent it is…" with a ⏳ icon. After a few more seconds (usually 5 to 30) the AI finishes and the message updates to the urgency result, for example "Help is on the way". Your report is already saved and visible to the barangay while the AI works, so you can leave the screen safely.

### Emergency SOS
Tap the big red **SOS** button. Choose **Take a photo** or **Send SOS now**. It sends your location marked as happening now, and **every responder agency (BFP, ERUF and Police) is alerted at once**, without waiting for the AI. Add details by also sending a normal report if you can. If you see "Too many reports from this connection", too many were sent in the last hour; call 911 or your barangay hotline.

### No signal?
The report is saved on your phone and sent automatically when you are back online. A yellow banner shows how many are waiting. A half-written report is also saved as you type, so you can close the app and return to it. Only the four most common incident types are shown at first; tap **More types** for the rest.

### Track your reports
Open **My reports**. Each report shows its progress: Submitted, Classified, Agency notified, then Acknowledged / En route / On scene, then Resolved. The page refreshes every 15 seconds.
Guest reports are tracked on the **same phone and browser** that sent them. Sign in with a citizen account to keep reports across devices.

### Change language
Use the dropdown in the top bar: English, Cebuano or Tagalog. This also changes the responder screens (Console, Review, Analytics and the audit trail).

### Light or dark screen
The sun / moon button in the top bar switches between Auto (follows your phone), Light and Dark.

### Install on your phone
Android Chrome: menu, **Install app**. iPhone Safari: Share, **Add to Home Screen**.

---

## Barangay Official

Sign in, then open **Console**. You see **all** reports.

### Incidents tab
- Live map (colored by urgency; a thick ring means "needs review") and a list sorted most urgent first.
- A sound and red banner alert you when a new P1 or P2 arrives while the console is open.
- Similar reports of the same incident (same type, close by, within 30 minutes) are grouped as "**+N similar**".
- Tap a card to see the AI's reason and confidence, the photo, and status buttons. Tick **Show resolved** to see closed incidents.
- Each card shows who reported it: **Registered account** (signed in), **Guest** or **Anonymous**. Guest and anonymous reports are not wrong, but confirm them first when resources are limited. An **SOS** badge marks emergency button reports.

### Review tab (manual routing)
Shows reports the AI was unsure about or could not classify. Agencies **cannot see these until you route them**.
1. Read the description and the AI's note.
2. Set Category, Severity, Primary and (optional) Secondary agency.
3. Tap **Route and notify agency** (or **Confirm / re-route** if you agree with the AI).
Every re-route is logged.

### Audit trail tab
A list of everything that happened to every report: when it was submitted and classified, every re-route, every status change and every outcome, with who did it. Use **Show more** to load older entries.

### Analytics tab
- Choose a period (30 / 90 / 180 days / 1 year) and filter by agency, category and severity.
- KPIs compare against the previous period of equal length. Charts show incidents per month, severity per month, incident types, and agency response times.
- **False alarm rate** shows how many reports responders marked as false alarms, out of those they checked.
- **Trend alerts** list the same type of incident in the same purok, 3 or more times in the last 7 days and more than the 7 days before. This is a simple comparison, not a prediction.
- **Hotspot map**: darker, larger circles mean more incidents in the same area (about 100 m).
- **Export CSV** downloads the filtered data. **Print / save as PDF** opens the browser's print window with a clean report page for barangay meetings. Handle exports under the privacy policy.

---

## BFP, ERUF and Police

Sign in with your agency account, then open **Console**. You see **only** reports routed to your agency, as primary or secondary, plus every **SOS** (all three agencies see an SOS). For example, a fire with possible casualties appears for both BFP and ERUF.

### Handle an incident
1. Tap a card to open it: description, photo, AI note and location. The map jumps to the incident, and the card shows the **landmark**, an approximate **address**, the coordinates, an **Open in Google Maps** link for navigation, and a **Show on map** link. Reports without GPS show a "No GPS location" warning, so ask the reporter for details.
2. Press the next status button as work progresses:
   - **Acknowledge**, then **En route**, then **On scene**, then **Resolve** (you can add resolution notes).
   - After you acknowledge, a **Was this report real?** row appears: **Confirmed**, **False alarm** or **Unable to verify**. Record it when you know. It feeds the false alarm rate in Analytics and the audit trail.
3. Response times are calculated automatically: report to acknowledgement, and report to resolution. These feed the Analytics tab.

Acknowledge quickly. The time to acknowledge is the main response-time measure.

### Analytics
Same as the Official's, but limited to your agency's data.

---

## Frequently asked questions

**Why can't my agency see a report that was just sent?**
It may be waiting in the Official's review queue, or it may belong to another agency.

**The AI got it wrong. What now?**
The Barangay Official can re-route and correct it. The correction is saved with the incident.

**What happens if someone sends a false report?**
Responders mark it as a False alarm, and the Barangay Official can see the pattern in Analytics and the audit trail. The app does not punish anyone automatically. What to do about repeat false reports is for the barangay to decide under its own rules and the Data Privacy Act.

**Is my report anonymous?**
If you tick **Report anonymously**, it is not linked to any account. Your photo and text are still visible to responders, so avoid including your name if you want to stay anonymous.

**Who can see my photo?**
Only the Barangay Official and the agency it was routed to. See the in-app **Privacy** page.
