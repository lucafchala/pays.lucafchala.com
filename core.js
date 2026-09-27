/* subs — pure logic (no DOM): data normalisation and migration, recurring
   dates, money and the .ics export. Loaded before app.js; also imported by
   tests/core.test.mjs under Node. */
(function (root) {
    'use strict';

    var CURRENCIES = ['BRL', 'USD', 'EUR'];
    var CYCLES = ['monthly', 'yearly', 'weekly'];
    var STATUSES = ['active', 'paused', 'cancelled'];

    /* ── Dates (plain YYYY-MM-DD strings in local time — billing is per day) ── */
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function iso(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
    function parse(s) { var p = String(s).split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
    function isISO(s) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
        var p = parse(s);
        return p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= daysIn(p.y, p.m);
    }
    function daysIn(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
    function todayISO(now) { var t = now || new Date(); return iso(t.getFullYear(), t.getMonth() + 1, t.getDate()); }
    function addDays(s, n) { var p = parse(s); var t = new Date(Date.UTC(p.y, p.m - 1, p.d + n)); return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
    function addMonths(y, m, n) { var z = (y * 12 + (m - 1)) + n; return { y: Math.floor(z / 12), m: (z % 12) + 1 }; }

    /* First date on or after `from` that is day `day` of a month (clamped to
       the month's length: day 31 bills on Feb 28/29). */
    function nextMonthDay(day, from) {
        var f = parse(from);
        for (var i = 0; i < 13; i++) {
            var ym = addMonths(f.y, f.m, i);
            var d = iso(ym.y, ym.m, Math.min(day, daysIn(ym.y, ym.m)));
            if (d >= from) return d;
        }
        return from;
    }

    /* Latest date on or before `from` that is day `day` of a month (clamped). */
    function prevMonthDay(day, from) {
        var f = parse(from);
        for (var i = 0; i < 13; i++) {
            var ym = addMonths(f.y, f.m, -i);
            var d = iso(ym.y, ym.m, Math.min(day, daysIn(ym.y, ym.m)));
            if (d <= from) return d;
        }
        return from;
    }

    /* Every billing date of `s` between `from` and `to` (inclusive). Nothing
       before `renews`: when you say the next charge is on the 31st, the 30th
       of this month is not one. */
    function occurrences(s, from, to) {
        if (from < s.renews) from = s.renews;
        if (from > to) return [];
        var out = [], a = parse(s.renews), f = parse(from), t = parse(to), ym, d, y;
        if (s.cycle === 'weekly') {
            var span = Math.round((Date.UTC(f.y, f.m - 1, f.d) - Date.UTC(a.y, a.m - 1, a.d)) / 864e5);
            d = addDays(s.renews, Math.ceil(span / 7) * 7);
            for (; d <= to; d = addDays(d, 7)) if (d >= from) out.push(d);
        } else if (s.cycle === 'yearly') {
            for (y = f.y; y <= t.y; y++) {
                d = iso(y, a.m, Math.min(s.day, daysIn(y, a.m)));
                if (d >= from && d <= to) out.push(d);
            }
        } else {
            for (ym = { y: f.y, m: f.m }; ym.y < t.y || (ym.y === t.y && ym.m <= t.m); ym = addMonths(ym.y, ym.m, 1)) {
                d = iso(ym.y, ym.m, Math.min(s.day, daysIn(ym.y, ym.m)));
                if (d >= from && d <= to) out.push(d);
            }
        }
        return out;
    }
    function nextOccurrence(s, from) { return occurrences(s, from, addDays(from, 400))[0] || null; }

    /* ── Normalisation / migration ──
       v1 records were {id, name, domain, price, currency, cycle, day, tags}
       with price possibly a string and no month for yearly plans. The shape
       stays a plain array with the same field names (the JSON export feeds
       an external script); new fields are only added. */
    function uuid() {
        if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
        return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }
    function cleanDomain(v) {
        var s = String(v || '').trim().toLowerCase();
        if (!s) return '';
        try { s = new URL(/^[a-z]+:\/\//.test(s) ? s : 'https://' + s).hostname; } catch (e) { return ''; }
        return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s) ? s.replace(/^www\./, '') : '';
    }
    function cleanTags(v) {
        var list = Array.isArray(v) ? v : String(v || '').split(',');
        var seen = {};
        return list.map(function (t) { return String(t).trim().toLowerCase().slice(0, 32); })
            .filter(function (t) { if (!t || seen[t]) return false; seen[t] = 1; return true; }).join(', ');
    }
    function tagList(s) { return s.tags ? s.tags.split(', ') : []; }

    function normalize(raw, today) {
        var r = raw && typeof raw === 'object' ? raw : {};
        var price = Number(String(r.price == null ? '' : r.price).replace(',', '.'));
        var cycle = CYCLES.indexOf(r.cycle) !== -1 ? r.cycle : 'monthly';
        /* `day` is the intended day of the month (31 stays 31 even when this
           month's bill falls on the 30th); `renews` is one known billing date. */
        var rawDay = parseInt(r.day, 10);
        rawDay = rawDay >= 1 && rawDay <= 31 ? rawDay : null;
        var renews, day;
        if (isISO(r.renews)) {
            renews = r.renews;
            var p = parse(renews);
            day = rawDay && rawDay > p.d && p.d === daysIn(p.y, p.m) ? rawDay : p.d;
        } else {
            /* v1 only knew the day of the month: anchor on the latest charge, so
               this month's bill still shows on the calendar. */
            day = rawDay || 1;
            renews = prevMonthDay(day, today || todayISO());
        }
        if (cycle === 'weekly') day = parse(renews).d;
        var out = {
            id: typeof r.id === 'string' && r.id ? r.id.slice(0, 64) : uuid(),
            name: text(r.name).trim().slice(0, 80),
            domain: cleanDomain(r.domain),
            price: isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : 0,
            currency: CURRENCIES.indexOf(r.currency) !== -1 ? r.currency : 'BRL',
            cycle: cycle,
            day: day,
            renews: renews,
            tags: cleanTags(r.tags),
            status: STATUSES.indexOf(r.status) !== -1 ? r.status : 'active',
            notes: text(r.notes).slice(0, 500)
        };
        var hist = cleanHistory(r.priceHistory);
        /* Only present when there is history, so records without it keep the
           exact v1/v2 shape the external script reads. */
        if (hist.length) out.priceHistory = hist;
        return out;
    }

    /* A hand-edited or foreign import can carry an object or array here;
       String() would turn it into the literal "[object Object]". */
    function text(v) {
        return typeof v === 'string' ? v : typeof v === 'number' && isFinite(v) ? String(v) : '';
    }

    /* ── Price history ── */
    /* Each entry is a price that was in effect until `date` (the day it changed). */
    var HISTORY_MAX = 50;
    function cleanHistory(v) {
        if (!Array.isArray(v)) return [];
        return v.filter(function (h) { return h && isISO(h.date) && isFinite(Number(h.price)) && Number(h.price) >= 0; })
            .map(function (h) {
                return { date: h.date, price: Math.round(Number(h.price) * 100) / 100, currency: CURRENCIES.indexOf(h.currency) !== -1 ? h.currency : 'BRL' };
            })
            .slice(-HISTORY_MAX);
    }
    function withPriceHistory(prev, next, today) {
        var hist = cleanHistory(prev && prev.priceHistory);
        if (prev && (prev.price !== next.price || prev.currency !== next.currency)) {
            hist.push({ date: today || todayISO(), price: prev.price, currency: prev.currency });
        }
        var out = {};
        Object.keys(next).forEach(function (k) { if (k !== 'priceHistory') out[k] = next[k]; });
        if (hist.length) out.priceHistory = hist.slice(-HISTORY_MAX);
        return out;
    }

    /* ── Encrypted backup ── */
    /* The data only lives in this browser. An encrypted export can be kept
       anywhere (cloud drive, e-mail) without exposing it: PBKDF2-SHA256
       (600k iterations, OWASP 2023) derives an AES-256-GCM key from the
       passphrase; GCM also detects a wrong passphrase or a tampered file. */
    var BACKUP_FORMAT = 'subs-backup';
    var KDF_ITERATIONS = 600000;
    function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
    function unb64(str) { var s = atob(str), out = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
    function deriveKey(passphrase, salt, iterations) {
        var subtle = root.crypto.subtle;
        return subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']).then(function (base) {
            return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        });
    }
    function isEncryptedBackup(text) {
        try { var d = JSON.parse(text); return !!d && d.format === BACKUP_FORMAT; } catch (e) { return false; }
    }
    function encryptBackup(plaintext, passphrase, iterations) {
        var it = iterations || KDF_ITERATIONS;
        var salt = root.crypto.getRandomValues(new Uint8Array(16));
        var iv = root.crypto.getRandomValues(new Uint8Array(12));
        return deriveKey(passphrase, salt, it).then(function (key) {
            return root.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(plaintext));
        }).then(function (ct) {
            return JSON.stringify({ format: BACKUP_FORMAT, v: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: it }, cipher: 'AES-GCM', salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }) + '\n';
        });
    }
    /* Rejects with Error('bad-pass') for a wrong passphrase or a damaged file,
       Error('bad-file') when the envelope itself is unreadable. */
    function decryptBackup(text, passphrase) {
        var d;
        try { d = JSON.parse(text); } catch (e) { return Promise.reject(new Error('bad-file')); }
        if (!d || d.format !== BACKUP_FORMAT || d.v !== 1 || !d.kdf || !(d.kdf.iterations >= 100000)) return Promise.reject(new Error('bad-file'));
        var salt, iv, ct;
        try { salt = unb64(d.salt); iv = unb64(d.iv); ct = unb64(d.ct); } catch (e) { return Promise.reject(new Error('bad-file')); }
        return deriveKey(passphrase, salt, d.kdf.iterations)
            .then(function (key) { return root.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct); })
            .then(function (pt) { return new TextDecoder().decode(pt); }, function () { throw new Error('bad-pass'); });
    }

    /* Returns {items, errors}; entries without a name are rejected. */
    function parseImport(text, today) {
        var data;
        try { data = JSON.parse(text); } catch (e) { return { items: [], errors: ['json'] }; }
        var list = Array.isArray(data) ? data : data && Array.isArray(data.subs) ? data.subs : null;
        if (!list) return { items: [], errors: ['shape'] };
        var items = [], errors = [];
        list.forEach(function (r, i) {
            if (!r || typeof r !== 'object' || !String(r.name || '').trim()) { errors.push(i + 1); return; }
            items.push(normalize(r, today));
        });
        return { items: items, errors: errors };
    }

    /* ── Money ── */
    function monthlyValue(s) {
        if (s.cycle === 'yearly') return s.price / 12;
        if (s.cycle === 'weekly') return s.price * 52 / 12;
        return s.price;
    }
    function toBRL(amount, currency, rates) { return currency === 'BRL' ? amount : amount * (rates[currency] || 0); }

    /* ── iCalendar (RFC 5545) ── */
    function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
    /* Lines are folded at 75 octets (not characters), never splitting a
       UTF-8 sequence. */
    var enc = new TextEncoder();
    function fold(line) {
        var out = [], cur = '', size = 0, limit = 75;
        for (var i = 0; i < line.length; i++) {
            var ch = line[i];
            var code = line.charCodeAt(i);
            if (code >= 0xD800 && code <= 0xDBFF && i + 1 < line.length) { ch += line[++i]; }
            var b = enc.encode(ch).length;
            if (size + b > limit) { out.push(cur); cur = ' '; size = 1; limit = 75; }
            cur += ch; size += b;
        }
        out.push(cur);
        return out.join('\r\n');
    }
    function stamp(now) {
        var t = now || new Date();
        return t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()) + 'T' + pad(t.getUTCHours()) + pad(t.getUTCMinutes()) + pad(t.getUTCSeconds()) + 'Z';
    }
    function rrule(s) {
        if (s.cycle === 'weekly') return 'FREQ=WEEKLY';
        if (s.cycle === 'yearly') return 'FREQ=YEARLY';
        /* Day 29–31 would be skipped in shorter months; the set trick bills on
           the last day that exists instead (e.g. 31 → Feb 28/29, Apr 30). */
        if (s.day > 28) {
            var days = [];
            for (var d = 28; d <= s.day; d++) days.push(d);
            return 'FREQ=MONTHLY;BYMONTHDAY=' + days.join(',') + ';BYSETPOS=-1';
        }
        return 'FREQ=MONTHLY;BYMONTHDAY=' + s.day;
    }
    function toICS(subs, opts) {
        opts = opts || {};
        var today = opts.today || todayISO(), dtstamp = stamp(opts.now);
        var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//lucafchala.com//subs//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEscape(opts.calName || 'Assinaturas')];
        subs.filter(function (s) { return s.status === 'active'; }).forEach(function (s) {
            var first = nextOccurrence(s, today) || s.renews;
            var label = (opts.fmt ? opts.fmt(s.price, s.currency) : s.currency + ' ' + s.price.toFixed(2));
            L.push('BEGIN:VEVENT',
                'UID:' + s.id + '@pays.lucafchala.com',
                'DTSTAMP:' + dtstamp,
                'DTSTART;VALUE=DATE:' + first.replace(/-/g, ''),
                'DTEND;VALUE=DATE:' + addDays(first, 1).replace(/-/g, ''),
                'RRULE:' + rrule(s),
                'SUMMARY:' + icsEscape((opts.prefix || '') + s.name + ' — ' + label),
                'DESCRIPTION:' + icsEscape(label + (s.notes ? '\n' + s.notes : '')),
                'TRANSP:TRANSPARENT');
            if (s.tags) L.push('CATEGORIES:' + tagList(s).map(icsEscape).join(','));
            L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-P1D', 'DESCRIPTION:' + icsEscape(s.name), 'END:VALARM', 'END:VEVENT');
        });
        L.push('END:VCALENDAR');
        return L.map(fold).join('\r\n') + '\r\n';
    }

    root.SubsCore = {
        CURRENCIES: CURRENCIES, CYCLES: CYCLES, STATUSES: STATUSES,
        iso: iso, parse: parse, isISO: isISO, daysIn: daysIn, todayISO: todayISO, addDays: addDays, addMonths: addMonths,
        nextMonthDay: nextMonthDay, prevMonthDay: prevMonthDay, occurrences: occurrences, nextOccurrence: nextOccurrence,
        normalize: normalize, parseImport: parseImport, cleanDomain: cleanDomain, cleanTags: cleanTags, tagList: tagList,
        monthlyValue: monthlyValue, toBRL: toBRL, toICS: toICS, fold: fold, icsEscape: icsEscape, rrule: rrule,
        withPriceHistory: withPriceHistory, isEncryptedBackup: isEncryptedBackup, encryptBackup: encryptBackup, decryptBackup: decryptBackup
    };
})(typeof window !== 'undefined' ? window : globalThis);
