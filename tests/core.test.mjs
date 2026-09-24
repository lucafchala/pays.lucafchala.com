import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { TextEncoder, URL, crypto: globalThis.crypto };
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(new URL('../core.js', import.meta.url), 'utf8'), ctx);
const C = ctx.SubsCore;
const plain = x => JSON.parse(JSON.stringify(x));

test('nothing is billed before the next charge you entered', () => {
  const s = C.normalize({ name: 'x', price: 1, day: 31, renews: '2026-10-31' });
  assert.equal(C.nextOccurrence(s, '2026-09-30'), '2026-10-31');
  assert.deepEqual(plain(C.occurrences(s, '2026-09-01', '2026-09-30')), []);
});

test('v1 records migrate: string price, day → next renewal, tags kept as a string', () => {
  const s = C.normalize({ id: 'a', name: ' Netflix ', domain: 'https://www.netflix.com/br', price: '39,90', currency: 'BRL', cycle: 'monthly', day: 31, tags: 'streaming, Casa,streaming' }, '2026-09-24');
  assert.deepEqual(plain(s), { id: 'a', name: 'Netflix', domain: 'netflix.com', price: 39.9, currency: 'BRL', cycle: 'monthly', day: 31, renews: '2026-08-31', tags: 'streaming, casa', status: 'active', notes: '' });
});

test('day 31 clamps to the last day of short months', () => {
  const s = C.normalize({ name: 'x', price: 1, cycle: 'monthly', renews: '2026-01-31' });
  assert.deepEqual(plain(C.occurrences(s, '2026-02-01', '2026-05-31')), ['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
  assert.equal(C.nextOccurrence(s, '2027-02-01'), '2027-02-28');
});

test('a clamped renewal date keeps the intended day', () => {
  const s = C.normalize({ name: 'x', price: 1, day: 31, renews: '2026-02-28' });
  assert.equal(s.day, 31);
  assert.deepEqual(plain(C.occurrences(s, '2026-03-01', '2026-03-31')), ['2026-03-31']);
});

test('yearly plans renew on their month, weekly every 7 days', () => {
  const y = C.normalize({ name: 'y', price: 120, cycle: 'yearly', renews: '2026-03-15' });
  assert.deepEqual(plain(C.occurrences(y, '2026-01-01', '2027-12-31')), ['2026-03-15', '2027-03-15']);
  const w = C.normalize({ name: 'w', price: 10, cycle: 'weekly', renews: '2026-09-01' });
  assert.deepEqual(plain(C.occurrences(w, '2026-09-10', '2026-09-30')), ['2026-09-15', '2026-09-22', '2026-09-29']);
  assert.equal(C.monthlyValue(w).toFixed(4), (10 * 52 / 12).toFixed(4));
  assert.equal(C.monthlyValue(y), 10);
});

test('import rejects junk, accepts arrays and {subs:[…]}, never throws', () => {
  assert.deepEqual(plain(C.parseImport('not json').errors), ['json']);
  assert.deepEqual(plain(C.parseImport('{"a":1}').errors), ['shape']);
  const r = C.parseImport(JSON.stringify([{ name: 'ok', price: '5' }, { price: 3 }, null, { name: '<img src=x onerror=alert(1)>', price: 'abc', currency: 'XXX', cycle: 'daily' }]));
  assert.equal(r.items.length, 2);
  assert.deepEqual(plain(r.errors), [2, 3]);
  assert.equal(r.items[1].price, 0);
  assert.equal(r.items[1].currency, 'BRL');
  assert.equal(r.items[1].cycle, 'monthly');
  assert.equal(C.parseImport(JSON.stringify({ subs: [{ name: 'z' }] })).items.length, 1);
});

test('domains are reduced to a bare hostname or dropped', () => {
  assert.equal(C.cleanDomain('AWS.amazon.com/console'), 'aws.amazon.com');
  assert.equal(C.cleanDomain('javascript:alert(1)'), '');
  assert.equal(C.cleanDomain('"><script>'), '');
});

test('ICS is valid RFC 5545: CRLF, UID, DTSTAMP, real dates, VALARM, folding, escaping', () => {
  const subs = [
    C.normalize({ id: 'm31', name: 'Hosting; VPS, EU', price: 10, currency: 'USD', day: 31, renews: '2026-10-31', tags: 'infra, work', notes: 'line1\nline2' }),
    C.normalize({ id: 'y1', name: 'Domain', price: 80, cycle: 'yearly', renews: '2027-02-10' }),
    C.normalize({ id: 'p1', name: 'Paused', price: 5, renews: '2026-10-01', status: 'paused' }),
    C.normalize({ id: 'long', name: 'Assinatura com um nome bem comprido — ação, café, pão e mais coisas até passar de setenta e cinco bytes', price: 1, renews: '2026-10-05' }),
  ];
  const ics = C.toICS(subs, { today: '2026-09-30', now: new Date(Date.UTC(2026, 8, 30, 12, 0, 0)) });
  assert.ok(ics.endsWith('\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'bare LF found');
  const lines = ics.split('\r\n');
  for (const l of lines) assert.ok(new TextEncoder().encode(l).length <= 75, `line over 75 octets: ${l}`);
  const unfolded = ics.replace(/\r\n /g, '');
  assert.equal((unfolded.match(/BEGIN:VEVENT/g) || []).length, 3, 'paused plans are not exported');
  assert.match(unfolded, /UID:m31@pays\.lucafchala\.com/);
  assert.match(unfolded, /DTSTAMP:20260930T120000Z/);
  assert.match(unfolded, /DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101/);
  assert.match(unfolded, /RRULE:FREQ=MONTHLY;BYMONTHDAY=28,29,30,31;BYSETPOS=-1/);
  assert.match(unfolded, /DTSTART;VALUE=DATE:20270210\r\nDTEND;VALUE=DATE:20270211\r\nRRULE:FREQ=YEARLY/);
  assert.match(unfolded, /SUMMARY:Hosting\\; VPS\\, EU/);
  assert.match(unfolded, /DESCRIPTION:USD 10\.00\\nline1\\nline2/);
  assert.match(unfolded, /CATEGORIES:infra,work/);
  assert.equal((unfolded.match(/BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-P1D/g) || []).length, 3);
  for (const m of unfolded.matchAll(/VALUE=DATE:(\d{4})(\d{2})(\d{2})/g)) assert.ok(C.isISO(`${m[1]}-${m[2]}-${m[3]}`), `invalid date ${m[0]}`);
});

test('ISO validation rejects impossible dates', () => {
  assert.equal(C.isISO('2026-09-31'), false);
  assert.equal(C.isISO('2028-02-29'), true);
  assert.equal(C.isISO('2026-2-1'), false);
});
