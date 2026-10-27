# TUGON AI: UX/UI Design Decisions

A short note for your defense. Every choice below maps to a recognized usability principle.

## Design system (all in `app/src/index.css`)

| Token | Values |
|---|---|
| Spacing (8pt soft grid) | 4, 8, 16, 24, 40, 64 px. No other spacing values. |
| Type scale (16px base, rem) | caption 12, body 16, lead 20, heading 24, page title 32 px |
| Touch targets | 44px minimum, 48px on form fields and primary buttons, 8px between neighbors |
| Breakpoints (mobile-first) | 480, 768, 1024 px |
| Accent (blue) | **Only** for things you can press: buttons, links, selected controls, focus ring |
| Red | **Only** for emergencies and errors: SOS, P1, error messages |

## Principles applied

| Principle | How the app uses it |
|---|---|
| **Mental models / Jakob's Law** | Familiar layout: logo (links home) and language and sign-in at the top, a footer with Privacy, bottom tab bar on phones like other mobile apps, header navigation on bigger screens. No account needed to report. |
| **Hick's Law / magic number 4** | Incident type shows 4 choices, with the rest behind "More types". Navigation has at most 3 items. Privacy moved to the footer. |
| **Visual hierarchy** | One page title per page. SOS is the only red block on the report screen, so it stands out. The next step on an incident is the primary button; other steps are secondary. |
| **Common region / proximity** | Cards group related fields. Whitespace separates sections. |
| **Feedback and system status** | Loading spinners, a "report received, checking urgency" state, a banner when reports are waiting offline, buttons that show progress and disable while working. |
| **Error handling (recognize, diagnose, recover)** | Errors appear next to the field, with a warning icon, a thicker red border and plain text saying what to do. Not color alone. |
| **Error prevention** | The citizen can't send without saying whether it is happening now. A half-written report is saved and restored after a reload or lost signal. Offline reports queue automatically. |
| **Accessibility** | Visible focus ring, skip link, real labels on every field, `aria-live` for status messages, severity badges checked for contrast and always shown with text (P1 to P4), not just color. |
| **Real 404 page** | Unknown links show a "Page not found" screen with a way back. |

## Responsive behavior

- **Phone (under 768px):** single column, bottom navigation within thumb reach, full-width buttons, map above the incident list.
- **Tablet (768px and up):** navigation moves into the header, form fields and filters use multiple columns.
- **Desktop (1024px and up):** responder console shows the map beside the incident list; the map stays visible while scrolling.

## Known limitations

- No dark theme (light theme only).
- Contrast was checked by calculation, not with an assistive-technology audit. Run a Lighthouse or axe check before real-world use.
- The map's zoom buttons and attribution come from the Leaflet library. The zoom buttons were enlarged to 44px, but the attribution text is small by design.
- Responder screens are in English only.
