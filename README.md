# pays.lucafchala.com — `subs`

> A private, client-side subscription tracker: what each plan costs per month and per year in BRL, when the next charges fall, and an `.ics` calendar with reminders. No backend; the data never leaves the browser.

**Live:** [pays.lucafchala.com](https://pays.lucafchala.com) · **Stack:** HTML/CSS/JS, no build · **Host:** Cloudflare Pages

Part of the [lucafchala.com ecosystem](https://github.com/lucafchala/lucafchala.com#the-ecosystem); follows the [shared design system](https://github.com/lucafchala/lucafchala.com#design-system).

---

## Features

- **Totals in BRL:** monthly and yearly totals, active count, and the next renewal. USD and EUR prices are converted at the live rate from [AwesomeAPI](https://economia.awesomeapi.com.br). The page renders immediately with the last saved rate (or a default when offline) and shows where the rate came from and when.
- **Next 30 days:** every upcoming charge, in date order, with "in N days".
- **Calendar:** a real month view (weekday-aligned, today highlighted, previous/next month). Each day shows up to two monograms plus "+N"; the day's label lists every charge.
- **By category:** monthly cost per tag with bars and percentages, plus totals per currency.
- **Add / edit:** name, website (for the icon), price, currency (BRL, USD, EUR), cycle (monthly, yearly, weekly), next charge date, status (active, paused, cancelled), tags, notes. Paused and cancelled plans stay listed but leave the totals, calendar and `.ics`.
- **Billing days:**
  - a plan billed on the 31st bills on the last day of shorter months;
  - yearly plans keep their month;
  - nothing is billed before the "next charge" date you entered.
- **List:** filter (name, tag, note, site), sort (next charge, monthly cost, name), pause/resume, and remove with undo.
- **Import / export:**
  - export JSON;
  - import JSON with validation and a *merge* / *replace all* choice (replacing keeps a local backup of the previous data);
  - export `.ics`;
  - **encrypted backup:** exported with a passphrase (PBKDF2-SHA256, 600k iterations → AES-256-GCM, in the browser via WebCrypto), so the file can be kept in a cloud drive or e-mail. Importing detects it and asks for the passphrase. There's no recovery without it.
- **`.ics` calendar** (RFC 5545):
  - one recurring event per active plan, with a stable `UID` and a `DTSTAMP`;
  - the correct first date;
  - `BYMONTHDAY=28,29,30,31;BYSETPOS=-1` for end-of-month plans;
  - escaped and folded lines, CRLF;
  - a reminder (`VALARM`) one day before each charge.
- **Icons:** the site's favicon from DuckDuckGo (requested with `no-referrer`), falling back to a coloured monogram. This replaces Clearbit's logo API, which HubSpot shut down.
- **Price history:** editing a plan's price records the old one with the date it changed (`priceHistory`). The edit form lists previous prices.
- **Safety net:**
  - asks the browser for persistent storage;
  - nags for a backup when there's data and no export in 30 days;
  - keeps corrupt stored data aside instead of crashing;
  - picks up changes made in another tab (`storage` event) instead of overwriting them.
- PT/EN and dark/light, shared with every `*.lucafchala.com` site.

## Data

Stored in the browser's `localStorage` under `subsData`, as a **plain array** — the same format the JSON export produces (it can feed external scripts). The original fields keep their names and types; newer fields are only added:

```json
[
  {
    "id": "7c0e…",            "name": "Netflix",        "domain": "netflix.com",
    "price": 39.9,             "currency": "BRL",        "cycle": "monthly",
    "day": 5,                  "renews": "2026-10-05",   "tags": "streaming, casa",
    "status": "active",        "notes": ""
  }
]
```

| Field | Meaning |
|---|---|
| `id` | Stable identifier (also the `.ics` UID) |
| `name`, `domain`, `notes` | Free text; `domain` is reduced to a bare hostname |
| `price` | Number, 2 decimals, in `currency` (`BRL` \| `USD` \| `EUR`) |
| `cycle` | `monthly` \| `yearly` \| `weekly` |
| `day` | Intended day of the month (31 stays 31 even when a month's charge falls on the 30th) |
| `renews` | A known charge date (`YYYY-MM-DD`); later charges are computed from it |
| `tags` | Comma-separated string (kept as a string for compatibility with v1 exports) |
| `status` | `active` \| `paused` \| `cancelled` (added in v2) |
| `priceHistory` | Optional, only present once a price changed: `[{ date, price, currency }]`, each a price in effect **until** `date` (max 50) |

**Migration:** v1 records (no `renews`, price sometimes a string) are upgraded when loaded. `renews` becomes the most recent charge on `day`, so this month's bill still shows. Other keys: `subsRates` (last good exchange rates), `subsLastExport`, `subsBackup` (data before the last "replace all" import), `theme` / `lang`.

## Architecture

| File | Role |
|---|---|
| `index.html` | Markup only |
| `core.js` | Pure logic — dates and recurrences, normalisation/migration, import parsing, money, `.ics` — no DOM; unit-tested under Node |
| `app.js` | UI: rendering, form, dialogs, toasts, rates, import/export |
| `theme.js` | Theme + language bootstrap shared across the ecosystem (`lf_theme` / `lf_lang` cookies) |
| `style.css` | Styles (no inline styles anywhere) |
| `manifest.json`, `icon.svg` | PWA manifest and icon |
| `_headers` | Security headers (below) |
| `robots.txt` | `Disallow: /`, plus `noindex`: personal tool, nothing to index |
| `tests/core.test.mjs` | `node --test` suite |

**CSP:** `script-src 'self'; style-src 'self'; connect-src 'self' https://economia.awesomeapi.com.br; img-src 'self' data: https://icons.duckduckgo.com; font-src 'self'`, plus `Referrer-Policy: no-referrer`. Every value written into the page is HTML-escaped (a crafted import can't inject markup), and there are no inline handlers.

## Decisions

- **No subscribable (`webcal://`) calendar.** A live feed needs a server holding the data, which contradicts "no backend". The `.ics` stays a download: re-export after adding plans.
- **No sync.** Cross-device transfer is the encrypted backup file, carried by you.

## Development

```bash
python3 -m http.server 8000     # open http://localhost:8000
node --test tests/*.test.mjs    # core logic
```

CI (`.github/workflows/checks.yml`):
- JSON validity, `_headers` present, `node --check`;
- no inline scripts, handlers or `style=` attributes (including in markup built by the JS);
- the unit tests;
- the status-monitor marker `<h1 class="name">subs</h1>`.

## Status

**In production** (personal use). The status page monitors that the page renders.
