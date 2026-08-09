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

## Deploying

Push to `main` and enable/refresh GitHub Pages — Zoho CRM will pick up the new
`index.html` on next load (no separate build/package step).
