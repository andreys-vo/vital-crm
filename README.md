# vital-crm

A custom dashboard widget for **Zoho CRM**, built for VITAL OP. It embeds directly
inside a CRM Account record and shows that client's open tasks, notes, and
meetings in one place — with quick actions to create/edit tasks, notes, and
meetings (including Microsoft Teams online meetings) without leaving the page.

## How it works

- Single-file app (`index.html`) — vanilla HTML/CSS/JS, no build step, no framework.
- Talks to Zoho directly via the [Zoho CRM Embedded App SDK](https://www.zoho.com/crm/developer/docs/widgets/) (`ZOHO.embeddedApp`, `ZOHO.CRM.API`, `ZOHO.CRM.META`).
- Deployed via **GitHub Pages** off this repo's `main` branch. Zoho CRM's widget
  configuration points at the live GitHub Pages URL — there is no packaged
  extension install step.
- Has a built-in debug console (⚙ DEBUG button, bottom-left) for inspecting
  Zoho field schemas and API responses while developing against Zoho's Events/
  Tasks/Accounts modules.

## Local development

Zoho's "Test Locally" widget option requires the widget to be served over
HTTPS, even on localhost. `dev-server.js` is a minimal static HTTPS server for
this (plain Node, no dependencies).

1. Generate a self-signed cert (once — `cert.pem`/`key.pem` are gitignored, not shared):
   ```sh
   openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=127.0.0.1"
   ```
2. Start the dev server:
   ```sh
   npm run dev
   ```
   This serves `index.html` at `https://127.0.0.1:5001/index.html`.
3. Open that URL directly in your browser once and accept the self-signed
   certificate warning (Advanced → Proceed), so the browser trusts it before
   Zoho tries to load it in an iframe.
4. In Zoho CRM: **Setup → Developer Hub → Widgets** (or the widget's settings
   in Marketplace/Extensions) → enable **Test Locally** → point it at
   `https://127.0.0.1:5001/index.html`.

This lets you iterate locally without touching the live GitHub Pages
deployment that production CRM users pull from.

### Testing without Zoho CRM (mock mode)

The steps above still require an actual Zoho CRM org and its "Test Locally"
setting to get a working `ZOHO` SDK object — there was previously no way to
exercise the UI at all without that. `mock-zoho-sdk.js` is a local stand-in
for Zoho's embedded-app SDK that implements the same surface `index.html`
calls (`ZOHO.embeddedApp.init/on`, `ZOHO.CRM.API.getAllRecords/
getRelatedRecords/searchRecords/insertRecord/updateRecord`,
`ZOHO.CRM.META.getFields`), backed by a small seeded dataset (3 accounts,
contacts, tasks, notes, and 4 meetings — including one online Teams meeting,
one today, one past-and-not-completed to exercise the "needs recap"
highlighting, and one completed).

**To use it:** open `https://127.0.0.1:5001/index.html` directly in a browser
(not embedded in Zoho — just visit the URL). `index.html` auto-detects it's
running standalone (`localhost`/`127.0.0.1`/`file://`, or a `?mock=1` query
param) and loads `mock-zoho-sdk.js` instead of Zoho's real SDK; a "🧪 מצב
בדיקה" banner at the top confirms mock mode is active. Everything works
normally against the fake data — selecting a client, creating/editing tasks,
notes, and meetings, and the meeting-recap flow. Inserts/updates persist to
`localStorage` so they survive a reload; use the "🔄 אפס נתוני בדיקה" button
(bottom-left) to wipe local test data and reseed.

This is what to use for quick UI iteration and for testing anything that
doesn't depend on Zoho's actual behavior. It is **not** a substitute for a
real "Test Locally" pass before shipping a change, since the mock doesn't
replicate Zoho-specific quirks (real field validation, actual Teams meeting
provisioning, workflow triggers, per-org customizations, real auth/session
behavior). Production (GitHub Pages, embedded in Zoho's iframe) always uses
the real SDK regardless of this — the mock only ever activates when the page
is opened directly, outside Zoho's iframe.

## Online meeting provisioning

Creating a meeting with the "פגישת Microsoft Teams מקוונת" checkbox actually
provisions a real Microsoft Teams link (`$meeting_details.joinmeeting_url`) by
sending, in `saveMeeting()`'s `apiData`:

```js
apiData.$meeting_details = { tool_name: "MicrosoftTeamsMeeting" };
```

This is the *only* thing that triggers provisioning. It was not obvious and
took a long debugging session to find, so the reasoning is captured here in
full:

- `Events.Meeting_Venue__s` / `Meeting_Provider__s` **do not trigger
  provisioning** at all, despite looking like the obvious fields (they're
  the venue/provider picklists shown in Zoho's UI). Setting them via
  `insertRecord`/`updateRecord` gets accepted, but a few seconds later Zoho
  silently reverts `Meeting_Venue__s` to `"Client location"` and clears
  `Meeting_Provider__s` to `null` — no error, no `$meeting_details`, no
  `Online_Meeting_External_UUID__s`. They're read-only *display* fields that
  Zoho derives automatically after a meeting is actually provisioned, not an
  input that causes provisioning.
- `ZOHO.CRM.META.getFields` reports `Meeting_Provider__s`'s only
  `actual_value` as `"MicrosoftTeamsMeeting"` — this looks authoritative but
  is a red herring for API writes. Zoho's own native meeting editor lists
  `"MicrosoftTeamsMeeting"` and `"Microsoft Teams"` as two distinct provider
  entries; selecting `"MicrosoftTeamsMeeting"` there throws "disabled for
  your organization". Neither value provisions anything when sent via the
  public REST API through `Meeting_Provider__s` — the field just isn't the
  mechanism, regardless of which value you send.
- Zoho's native meeting editor provisions the real link through internal,
  session-cookie-authenticated endpoints (`crm.zoho.com/.../
  EditCommonModule.do` and a `phonebridge.zoho.com/meetingbridge/...`
  lookup) that aren't part of the public API and aren't reachable from a
  widget or a Deluge function — there's no way to replicate that path
  programmatically.
- The actual mechanism was found in a Zoho community thread with a working
  PHP sample: provisioning is triggered by sending `$meeting_details` (the
  same field name that's read-only on *read* responses) as an *input* field
  containing `{ "tool_name": "ZoomMeeting" }`. By that naming pattern,
  `"MicrosoftTeamsMeeting"` — the value `getFields` reported as
  `Meeting_Provider__s`'s `actual_value` — turned out to be the correct
  `tool_name`, just in the wrong field. This is confirmed working in this
  org.

If this ever breaks again (e.g. a different provider is added, or Zoho
changes behavior), use the "▶ Trace Meeting Creation" debug button — it
creates an isolated test meeting and polls it at 0/3/6/10/15s, logging
`Meeting_Venue__s`, `Meeting_Provider__s`, `Online_Meeting_External_UUID__s`,
and `$meeting_details` at each step, so you can see exactly when/whether
provisioning actually happened rather than guessing from the UI.

## Deploying

Push to `main` and enable/refresh GitHub Pages — Zoho CRM will pick up the new
`index.html` on next load (no separate build/package step). The browser can
cache the previous `app.js` though (especially inside Zoho's widget iframe) —
if a change doesn't seem to take effect, fully close and reopen the CRM tab
(a plain refresh doesn't always re-fetch an iframe's cached resources) before
assuming the code itself is wrong.
