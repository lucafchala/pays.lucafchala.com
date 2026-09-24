# CLAUDE.md — pays.lucafchala.com (`subs`)

Client-side subscription tracker. No backend; data lives in the browser's `localStorage`. No build step; Cloudflare Pages deploys `main`.

- **Split:** pure logic in `core.js` (`window.SubsCore`, no DOM — keep it that way, it's unit-tested with `node --test tests/*.test.mjs`); UI in `app.js`; theme/lang in `theme.js` (`window.lfPrefs`, shared `lf_*` cookies across `*.lucafchala.com`).
- **Data compatibility matters.** `subsData` and the JSON export are a plain array whose v1 fields (`id, name, domain, price, currency, cycle, day, tags`) keep their names and types — the export feeds an external Python script. Add fields, never rename or retype existing ones. `normalize()` in `core.js` is the only place records are shaped or migrated.
- **Optional `priceHistory`** is added by `withPriceHistory()` when an edit changes the price, and only exists when non-empty, so old records keep their exact shape.
- **Encrypted backup** (`encryptBackup` / `decryptBackup` / `isEncryptedBackup` in `core.js`): the envelope is `{format:'subs-backup', v:1, kdf, salt, iv, ct}`. Never lower the PBKDF2 iterations for new files; `decryptBackup` refuses fewer than 100k.
- **`dialog()`** ignores a `close` event that arrives while it's open again (chained dialogs). Keep that guard.
- **Dates are `YYYY-MM-DD` strings in local time.** Use the helpers in `core.js` (`occurrences`, `nextOccurrence`, `nextMonthDay`, `prevMonthDay`, `addDays`, `daysIn`). `day` is the intended day of the month; `renews` is a known charge date; no occurrence is generated before `renews`.
- **`.ics` output must stay RFC 5545-valid:** CRLF, 75-octet folding, escaping, `UID` + `DTSTAMP`, `VALARM`. The tests cover it — run them after touching `toICS`.
- **CSP is `script-src 'self'; style-src 'self'`:**
  - no inline scripts, no `on*=`, and no `style="…"` in HTML or in markup built by `innerHTML` — set styles through `element.style` (CSSOM is allowed);
  - escape every interpolated value with `esc()`;
  - CI greps for violations.
- **Every `<script>` has `data-cfasync="false"`.**
- **Keep `<h1 class="name">subs</h1>` exactly** — status.lucafchala.com looks for `subs`.
- **Strings** go in the `T.pt` / `T.en` objects in `app.js`. Static elements use `data-i18n` / `data-i18n-attr`.
