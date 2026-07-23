# pays.lucafchala.com

Static, client-side-only subscription manager and visual calendar. Built to track recurring costs (BRL and USD) without requiring a backend.

**Live:** [pays.lucafchala.com](https://pays.lucafchala.com) · **Stack:** HTML/CSS/JS · **Host:** Cloudflare Pages

## Features
* **Zero Backend:** Uses `localStorage` for state management.
* **Multi-Currency:** Auto-fetches live USD/BRL rates from AwesomeAPI, recalculating exact monthly and yearly projections.
* **Auto-Enrichment:** Clearbit API pulls logos automatically based on domain names.
* **Ecosystem Ready:** Exports raw JSON for ingestion into Python quantitative models and generates `.ics` Webcal files to sync billing alerts to your calendar.

## Design System
Follows the exact `lucafchala.com` apex design system (Cormorant Garamond + JetBrains Mono, grain overlay, standard color tokens).
