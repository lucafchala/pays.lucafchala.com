/* subs — UI. Pure logic lives in core.js (SubsCore); theme/lang bootstrap in
   theme.js (lfPrefs). Data stays in this browser's localStorage only. */
(function () {
    'use strict';
    var C = window.SubsCore;
    var P = window.lfPrefs;

    var KEY = 'subsData', RATE_KEY = 'subsRates', EXPORT_KEY = 'subsLastExport', BACKUP_KEY = 'subsBackup';
    var FALLBACK_RATES = { BRL: 1, USD: 5.5, EUR: 6 };
    var RATE_URL = 'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL';

    var T = {
        pt: {
            skip: 'Pular para o conteúdo', prefs: 'Preferências', theme: 'Alternar tema', tagline: 'assinaturas · custos recorrentes', summary: 'Resumo',
            monthly: 'Total mensal', yearly: 'Total anual', active: 'Ativas', next: 'Próxima renovação', none: 'nenhuma',
            upcoming_rule: 'PRÓXIMOS 30 DIAS', calendar_rule: 'CALENDÁRIO', breakdown_rule: 'POR CATEGORIA', add_rule: 'NOVA ASSINATURA', edit_rule: 'EDITAR ASSINATURA', list_rule: 'ASSINATURAS',
            prev_month: 'Mês anterior', next_month: 'Próximo mês', nothing_upcoming: 'Nada nos próximos 30 dias.', empty: 'Nenhuma assinatura ainda — adicione a primeira acima.', no_match: 'Nada encontrado.',
            f_name: 'Nome', f_domain: 'Site (para o ícone)', f_price: 'Valor', f_currency: 'Moeda', f_cycle: 'Ciclo', f_renews: 'Próxima cobrança', f_status: 'Situação', f_tags: 'Tags (separadas por vírgula)', f_notes: 'Notas',
            c_monthly: 'mensal', c_yearly: 'anual', c_weekly: 'semanal', s_active: 'ativa', s_paused: 'pausada', s_cancelled: 'cancelada',
            add: 'adicionar', save: 'salvar', cancel: 'cancelar', edit: 'editar', del: 'remover', pause: 'pausar', resume: 'reativar', undo: 'desfazer',
            filter_label: 'Filtrar', filter_ph: 'filtrar por nome, tag, nota…', sort_label: 'Ordenar', sort_next: 'próxima cobrança', sort_cost: 'custo mensal', sort_name: 'nome',
            export_json: 'exportar JSON', import_json: 'importar JSON', export_ics: 'exportar calendário (.ics)', export_now: 'exportar agora',
            backup_nag: 'Os dados ficam só neste navegador — exporte um backup de vez em quando.',
            err_name: 'Informe o nome.', err_price: 'Informe um valor válido.', err_date: 'Informe a data da próxima cobrança.',
            removed: 'Removida:', imported: 'Importado.', import_title: 'Importar JSON', import_bad: 'Arquivo inválido — esperava uma lista de assinaturas.',
            import_summary: function (n, u, e) { return n + ' nova(s), ' + u + ' atualizada(s)' + (e ? ', ' + e + ' ignorada(s) (sem nome)' : '') + '.'; },
            merge: 'mesclar', replace: 'substituir tudo', replace_note: 'Substituir guarda uma cópia dos dados atuais como backup local.',
            rates_live: 'cotação', rates_cached: 'cotação salva de', rates_fallback: 'cotação padrão (offline)',
            per_month: '/mês', of_total: 'do total', untagged: 'sem tag', by_currency: 'Por moeda', in_days: function (n) { return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : 'em ' + n + ' dias'; },
            ics_prefix: 'Cobrança: ', cal_name: 'Assinaturas', weekdays: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
        },
        en: {
            skip: 'Skip to content', prefs: 'Preferences', theme: 'Toggle theme', tagline: 'subscriptions · recurring costs', summary: 'Summary',
            monthly: 'Monthly total', yearly: 'Yearly total', active: 'Active', next: 'Next renewal', none: 'none',
            upcoming_rule: 'NEXT 30 DAYS', calendar_rule: 'CALENDAR', breakdown_rule: 'BY CATEGORY', add_rule: 'NEW SUBSCRIPTION', edit_rule: 'EDIT SUBSCRIPTION', list_rule: 'SUBSCRIPTIONS',
            prev_month: 'Previous month', next_month: 'Next month', nothing_upcoming: 'Nothing in the next 30 days.', empty: 'No subscriptions yet — add the first one above.', no_match: 'Nothing found.',
            f_name: 'Name', f_domain: 'Website (for the icon)', f_price: 'Price', f_currency: 'Currency', f_cycle: 'Cycle', f_renews: 'Next charge', f_status: 'Status', f_tags: 'Tags (comma separated)', f_notes: 'Notes',
            c_monthly: 'monthly', c_yearly: 'yearly', c_weekly: 'weekly', s_active: 'active', s_paused: 'paused', s_cancelled: 'cancelled',
            add: 'add', save: 'save', cancel: 'cancel', edit: 'edit', del: 'remove', pause: 'pause', resume: 'resume', undo: 'undo',
            filter_label: 'Filter', filter_ph: 'filter by name, tag, note…', sort_label: 'Sort', sort_next: 'next charge', sort_cost: 'monthly cost', sort_name: 'name',
            export_json: 'export JSON', import_json: 'import JSON', export_ics: 'export calendar (.ics)', export_now: 'export now',
            backup_nag: 'Data lives only in this browser — export a backup now and then.',
            err_name: 'Enter a name.', err_price: 'Enter a valid price.', err_date: 'Enter the next charge date.',
            removed: 'Removed:', imported: 'Imported.', import_title: 'Import JSON', import_bad: 'Invalid file — expected a list of subscriptions.',
            import_summary: function (n, u, e) { return n + ' new, ' + u + ' updated' + (e ? ', ' + e + ' skipped (no name)' : '') + '.'; },
            merge: 'merge', replace: 'replace all', replace_note: 'Replacing keeps a copy of the current data as a local backup.',
            rates_live: 'rate', rates_cached: 'saved rate from', rates_fallback: 'default rate (offline)',
            per_month: '/mo', of_total: 'of total', untagged: 'untagged', by_currency: 'By currency', in_days: function (n) { return n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; },
            ics_prefix: 'Charge: ', cal_name: 'Subscriptions', weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        }
    };

    function t(k) { var v = T[P.lang][k]; return v != null ? v : T.pt[k]; }
    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;'); }
    var store = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
    };

    /* ── State ── */
    function load() {
        var raw = store.get(KEY);
        if (!raw) return [];
        try {
            var data = JSON.parse(raw);
            return Array.isArray(data) ? data.filter(function (r) { return r && r.name; }).map(function (r) { return C.normalize(r); }) : [];
        } catch (e) {
            store.set(KEY + '.corrupt', raw);
            return [];
        }
    }
    var subs = load();
    var rates = FALLBACK_RATES, ratesAt = null, ratesSource = 'fallback';
    var calCursor = (function () { var n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1 }; })();

    function persist() { store.set(KEY, JSON.stringify(subs)); }

    /* ── Formatting ── */
    function locale() { return P.lang === 'pt' ? 'pt-BR' : 'en-US'; }
    function money(amount, cur) {
        try { return new Intl.NumberFormat(locale(), { style: 'currency', currency: cur || 'BRL' }).format(amount); }
        catch (e) { return (cur || 'BRL') + ' ' + amount.toFixed(2); }
    }
    function dateLabel(isoDate, opts) {
        var p = C.parse(isoDate);
        return new Intl.DateTimeFormat(locale(), opts || { day: 'numeric', month: 'short' }).format(new Date(p.y, p.m - 1, p.d));
    }
    function daysUntil(isoDate, today) {
        var a = C.parse(today), b = C.parse(isoDate);
        return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 864e5);
    }
    function monthlyBRL(s) { return C.toBRL(C.monthlyValue(s), s.currency, rates); }

    /* ── Rates: render at once with the cached/fallback rate, refresh in the background ── */
    function loadCachedRates() {
        try {
            var c = JSON.parse(store.get(RATE_KEY) || 'null');
            if (c && c.USD > 0 && c.EUR > 0) { rates = { BRL: 1, USD: c.USD, EUR: c.EUR }; ratesAt = c.at; ratesSource = 'cached'; }
        } catch (e) { /* keep fallback */ }
    }
    function fetchRates() {
        var ctrl = window.AbortController ? new AbortController() : null;
        var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
        fetch(RATE_URL, { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (d) {
                var usd = parseFloat(d && d.USDBRL && d.USDBRL.ask), eur = parseFloat(d && d.EURBRL && d.EURBRL.ask);
                if (!(usd > 0 && usd < 100 && eur > 0 && eur < 100)) throw new Error('bad rate');
                rates = { BRL: 1, USD: usd, EUR: eur }; ratesAt = Date.now(); ratesSource = 'live';
                store.set(RATE_KEY, JSON.stringify({ USD: usd, EUR: eur, at: ratesAt }));
                render();
            })
            .catch(function () { renderRates(); })
            .then(function () { clearTimeout(timer); });
    }
    function renderRates() {
        var f = function (v) { return v.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
        var src = ratesSource === 'live' ? t('rates_live') + ' ' + new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(ratesAt))
            : ratesSource === 'cached' ? t('rates_cached') + ' ' + new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(new Date(ratesAt))
            : t('rates_fallback');
        $('rates').textContent = 'USD/BRL ' + f(rates.USD) + ' · EUR/BRL ' + f(rates.EUR) + ' · ' + src;
    }

    /* ── Icons: DuckDuckGo favicon (no referrer), coloured monogram fallback ── */
    function monogram(name) {
        var el = document.createElement('span');
        el.className = 'logo mono';
        el.setAttribute('aria-hidden', 'true');
        el.textContent = (String(name).trim()[0] || '?').toUpperCase();
        var h = 0;
        for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
        el.style.setProperty('--hue', h);
        return el;
    }
    function logo(s) {
        var box = document.createElement('span');
        box.className = 'logo-box';
        box.appendChild(monogram(s.name));
        if (s.domain) {
            var img = new Image();
            img.className = 'logo';
            img.alt = '';
            img.loading = 'lazy';
            img.referrerPolicy = 'no-referrer';
            img.addEventListener('load', function () { if (img.naturalWidth > 1) box.replaceChildren(img); });
            img.src = 'https://icons.duckduckgo.com/ip3/' + encodeURIComponent(s.domain) + '.ico';
        }
        return box;
    }

    /* ── Rendering ── */
    function active() { return subs.filter(function (s) { return s.status === 'active'; }); }

    function renderDashboard(today) {
        var list = active();
        var monthly = list.reduce(function (sum, s) { return sum + monthlyBRL(s); }, 0);
        var yearly = list.reduce(function (sum, s) { return sum + C.toBRL(s.cycle === 'yearly' ? s.price : s.cycle === 'weekly' ? s.price * 52 : s.price * 12, s.currency, rates); }, 0);
        $('total-monthly').textContent = money(monthly, 'BRL');
        $('total-yearly').textContent = money(yearly, 'BRL');
        $('total-count').textContent = list.length + ' / ' + subs.length;
        var next = list.map(function (s) { return { s: s, d: C.nextOccurrence(s, today) }; }).filter(function (x) { return x.d; })
            .sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; })[0];
        $('next-renewal').textContent = next ? next.s.name + ' · ' + dateLabel(next.d) : t('none');
    }

    function renderUpcoming(today) {
        var end = C.addDays(today, 30), items = [];
        active().forEach(function (s) { C.occurrences(s, today, end).forEach(function (d) { items.push({ s: s, d: d }); }); });
        items.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : a.s.name.localeCompare(b.s.name); });
        var ul = $('upcoming');
        ul.replaceChildren();
        if (!items.length) { ul.innerHTML = '<li class="empty">' + esc(t('nothing_upcoming')) + '</li>'; return; }
        items.forEach(function (x) {
            var li = document.createElement('li');
            li.innerHTML = '<span class="up-date">' + esc(dateLabel(x.d)) + '<small>' + esc(t('in_days')(daysUntil(x.d, today))) + '</small></span>' +
                '<span class="up-name">' + esc(x.s.name) + '</span><span class="up-amount">' + esc(money(x.s.price, x.s.currency)) + '</span>';
            ul.appendChild(li);
        });
    }

    function renderCalendar(today) {
        var y = calCursor.y, m = calCursor.m, days = C.daysIn(y, m);
        var first = C.iso(y, m, 1), last = C.iso(y, m, days);
        $('cal-title').textContent = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
        var byDay = {};
        active().forEach(function (s) { C.occurrences(s, first, last).forEach(function (d) { (byDay[d] = byDay[d] || []).push(s); }); });
        var grid = $('calendar-grid');
        grid.replaceChildren();
        t('weekdays').forEach(function (w) { var h = document.createElement('div'); h.className = 'cal-wd'; h.setAttribute('aria-hidden', 'true'); h.textContent = w; grid.appendChild(h); });
        var offset = new Date(y, m - 1, 1).getDay();
        for (var i = 0; i < offset; i++) { var pad = document.createElement('div'); pad.className = 'cal-day pad'; pad.setAttribute('aria-hidden', 'true'); grid.appendChild(pad); }
        for (var d = 1; d <= days; d++) {
            var key = C.iso(y, m, d), list = byDay[key] || [];
            var cell = document.createElement('div');
            cell.className = 'cal-day' + (key === today ? ' today' : '') + (list.length ? ' has' : '');
            cell.setAttribute('role', 'listitem');
            var label = dateLabel(key, { day: 'numeric', month: 'long' });
            cell.setAttribute('aria-label', list.length ? label + ': ' + list.map(function (s) { return s.name; }).join(', ') : label);
            if (list.length) cell.title = list.map(function (s) { return s.name + ' — ' + money(s.price, s.currency); }).join('\n');
            var num = document.createElement('span');
            num.className = 'cal-num';
            num.textContent = d;
            cell.appendChild(num);
            if (list.length) {
                var icons = document.createElement('span');
                icons.className = 'cal-icons';
                list.slice(0, 2).forEach(function (s) { icons.appendChild(monogram(s.name)); });
                if (list.length > 2) { var more = document.createElement('span'); more.className = 'cal-more'; more.textContent = '+' + (list.length - 2); icons.appendChild(more); }
                cell.appendChild(icons);
            }
            grid.appendChild(cell);
        }
    }

    function renderBreakdown() {
        var list = active(), total = list.reduce(function (sum, s) { return sum + monthlyBRL(s); }, 0);
        var box = $('breakdown');
        box.replaceChildren();
        if (!list.length) return;
        var byTag = {}, byCur = {};
        list.forEach(function (s) {
            var v = monthlyBRL(s), tags = C.tagList(s);
            (tags.length ? tags : [t('untagged')]).forEach(function (tag) { byTag[tag] = (byTag[tag] || 0) + v / (tags.length || 1); });
            byCur[s.currency] = (byCur[s.currency] || 0) + C.monthlyValue(s);
        });
        var rows = Object.keys(byTag).sort(function (a, b) { return byTag[b] - byTag[a]; });
        rows.forEach(function (tag) {
            var row = document.createElement('div');
            row.className = 'bd-row';
            var pct = total ? byTag[tag] / total : 0;
            row.innerHTML = '<span class="bd-tag">' + esc(tag) + '</span><span class="bd-bar"><span></span></span><span class="bd-val">' + esc(money(byTag[tag], 'BRL')) + '<small>' + Math.round(pct * 100) + '%</small></span>';
            row.querySelector('.bd-bar span').style.width = (pct * 100).toFixed(1) + '%';
            box.appendChild(row);
        });
        var cur = document.createElement('p');
        cur.className = 'bd-cur';
        cur.textContent = t('by_currency') + ': ' + Object.keys(byCur).map(function (c) { return money(byCur[c], c) + t('per_month'); }).join(' · ');
        box.appendChild(cur);
    }

    function renderList(today) {
        var q = $('q').value.trim().toLowerCase(), sort = $('sort').value;
        var list = subs.filter(function (s) { return !q || [s.name, s.tags, s.notes, s.domain].join(' ').toLowerCase().indexOf(q) !== -1; });
        var nextOf = {};
        list.forEach(function (s) { nextOf[s.id] = s.status === 'active' ? C.nextOccurrence(s, today) || '9999' : '9999'; });
        list.sort(function (a, b) {
            if (sort === 'cost') return monthlyBRL(b) - monthlyBRL(a);
            if (sort === 'name') return a.name.localeCompare(b.name, locale());
            return nextOf[a.id] < nextOf[b.id] ? -1 : nextOf[a.id] > nextOf[b.id] ? 1 : a.name.localeCompare(b.name);
        });
        var ul = $('subs-list');
        ul.replaceChildren();
        if (!list.length) { ul.innerHTML = '<li class="empty">' + esc(t(subs.length ? 'no_match' : 'empty')) + '</li>'; return; }
        list.forEach(function (s) {
            var li = document.createElement('li');
            li.className = 'sub ' + s.status;
            li.appendChild(logo(s));
            var body = document.createElement('div');
            body.className = 'sub-body';
            var next = s.status === 'active' ? C.nextOccurrence(s, today) : null;
            body.innerHTML = '<span class="sub-name">' + esc(s.name) + (s.status !== 'active' ? ' <span class="badge">' + esc(t('s_' + s.status)) + '</span>' : '') + '</span>' +
                '<span class="sub-meta">' + esc(money(s.price, s.currency)) + ' · ' + esc(t('c_' + s.cycle)) +
                (s.currency !== 'BRL' || s.cycle !== 'monthly' ? ' · ≈ ' + esc(money(monthlyBRL(s), 'BRL')) + esc(t('per_month')) : '') +
                (next ? ' · ' + esc(dateLabel(next)) : '') + '</span>' +
                (s.tags ? '<span class="sub-tags">' + C.tagList(s).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('') + '</span>' : '') +
                (s.notes ? '<span class="sub-notes">' + esc(s.notes) + '</span>' : '');
            li.appendChild(body);
            var acts = document.createElement('div');
            acts.className = 'sub-actions';
            acts.innerHTML = '<button class="act-btn" type="button" data-action="edit" data-id="' + esc(s.id) + '">' + esc(t('edit')) + '</button>' +
                '<button class="act-btn" type="button" data-action="toggle" data-id="' + esc(s.id) + '">' + esc(t(s.status === 'active' ? 'pause' : 'resume')) + '</button>' +
                '<button class="act-btn del" type="button" data-action="delete" data-id="' + esc(s.id) + '" aria-label="' + esc(t('del') + ' ' + s.name) + '">✕</button>';
            li.appendChild(acts);
            ul.appendChild(li);
        });
    }

    function renderBackupNag() {
        var last = parseInt(store.get(EXPORT_KEY) || '0', 10);
        $('backup-banner').hidden = !subs.length || Date.now() - last < 30 * 864e5;
    }

    function render() {
        var today = C.todayISO();
        renderRates(); renderDashboard(today); renderUpcoming(today); renderCalendar(today); renderBreakdown(); renderList(today); renderBackupNag();
    }

    /* ── Form ── */
    function fillForm(s) {
        $('sub-id').value = s ? s.id : '';
        $('sub-name').value = s ? s.name : '';
        $('sub-domain').value = s ? s.domain : '';
        $('sub-price').value = s ? s.price : '';
        $('sub-currency').value = s ? s.currency : 'BRL';
        $('sub-cycle').value = s ? s.cycle : 'monthly';
        $('sub-renews').value = s ? C.nextOccurrence(s, C.todayISO()) || s.renews : '';
        $('sub-status').value = s ? s.status : 'active';
        $('sub-tags').value = s ? s.tags : '';
        $('sub-notes').value = s ? s.notes : '';
        $('btn-submit').setAttribute('data-i18n', s ? 'save' : 'add');
        $('btn-submit').textContent = t(s ? 'save' : 'add');
        $('form-rule').setAttribute('data-i18n', s ? 'edit_rule' : 'add_rule');
        $('form-rule').textContent = t(s ? 'edit_rule' : 'add_rule');
        $('btn-cancel-edit').hidden = !s;
        showError('');
    }
    function showError(msg) { $('form-error').textContent = msg; $('form-error').hidden = !msg; }

    function submit(e) {
        e.preventDefault();
        var name = $('sub-name').value.trim(), price = $('sub-price').value, renews = $('sub-renews').value;
        if (!name) { showError(t('err_name')); $('sub-name').focus(); return; }
        if (price === '' || !(Number(price) >= 0)) { showError(t('err_price')); $('sub-price').focus(); return; }
        if (!C.isISO(renews)) { showError(t('err_date')); $('sub-renews').focus(); return; }
        var id = $('sub-id').value;
        var prev = id ? subs.filter(function (s) { return s.id === id; })[0] : null;
        var rec = C.normalize({
            id: id || undefined, name: name, domain: $('sub-domain').value, price: price, currency: $('sub-currency').value, cycle: $('sub-cycle').value,
            renews: renews, day: prev && prev.renews === renews ? prev.day : undefined, status: $('sub-status').value, tags: $('sub-tags').value, notes: $('sub-notes').value
        });
        if (prev) subs[subs.indexOf(prev)] = rec; else subs.push(rec);
        persist();
        fillForm(null);
        render();
        if (prev) $('subs-list').scrollIntoView({ block: 'start' });
    }

    /* ── Dialog + toasts ── */
    function dialog(title, bodyHtml, actions) {
        var dlg = $('dialog');
        $('dialog-title').textContent = title;
        $('dialog-body').innerHTML = bodyHtml;
        $('dialog-actions').innerHTML = actions.map(function (a, i) { return '<button type="button" class="act-btn' + (a.primary ? ' ok' : '') + '" data-i="' + i + '">' + esc(a.label) + '</button>'; }).join('');
        return new Promise(function (resolve) {
            var done = function (v) { dlg.close(); resolve(v); };
            $('dialog-actions').onclick = function (e) { var b = e.target.closest('[data-i]'); if (b) done(actions[+b.getAttribute('data-i')].value); };
            dlg.onclose = function () { resolve(null); };
            dlg.showModal();
        });
    }
    function toast(msg, action) {
        var el = document.createElement('div');
        el.className = 'toast';
        el.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button" class="act-btn ok">' + esc(action.label) + '</button>' : '');
        if (action) el.querySelector('button').addEventListener('click', function () { action.run(); el.remove(); });
        $('toasts').appendChild(el);
        setTimeout(function () { el.remove(); }, action ? 7000 : 3500);
    }

    /* ── Import / export ── */
    function download(name, text, type) {
        var url = URL.createObjectURL(new Blob([text], { type: type }));
        var a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
    function stampExport() { store.set(EXPORT_KEY, String(Date.now())); renderBackupNag(); }
    function exportJSON() { download('assinaturas-' + C.todayISO() + '.json', JSON.stringify(subs, null, 2) + '\n', 'application/json'); stampExport(); }
    function exportICS() {
        download('assinaturas.ics', C.toICS(subs, { prefix: t('ics_prefix'), calName: t('cal_name'), fmt: money }), 'text/calendar;charset=utf-8');
        stampExport();
    }
    function importJSON(file) {
        file.text().then(function (text) {
            var res = C.parseImport(text);
            if (!res.items.length) { dialog(t('import_title'), '<p>' + esc(t('import_bad')) + '</p>', [{ label: t('cancel'), value: null, primary: true }]); return; }
            var ids = {};
            subs.forEach(function (s) { ids[s.id] = true; });
            var updated = res.items.filter(function (s) { return ids[s.id]; }).length;
            dialog(t('import_title'), '<p>' + esc(t('import_summary')(res.items.length - updated, updated, res.errors.length)) + '</p><p class="hint">' + esc(t('replace_note')) + '</p>',
                [{ label: t('cancel'), value: null }, { label: t('merge'), value: 'merge' }, { label: t('replace'), value: 'replace', primary: true }])
                .then(function (mode) {
                    if (!mode) return;
                    if (mode === 'replace') { store.set(BACKUP_KEY, JSON.stringify(subs)); subs = res.items; }
                    else res.items.forEach(function (n) { var i = subs.map(function (s) { return s.id; }).indexOf(n.id); if (i === -1) subs.push(n); else subs[i] = n; });
                    persist(); render(); toast(t('imported'));
                });
        });
    }

    /* ── Events ── */
    document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-action]');
        if (!b) return;
        var id = b.getAttribute('data-id');
        var s = id ? subs.filter(function (x) { return x.id === id; })[0] : null;
        switch (b.getAttribute('data-action')) {
            case 'edit': fillForm(s); $('sub-form').scrollIntoView({ block: 'start' }); $('sub-name').focus(); break;
            case 'cancel-edit': fillForm(null); break;
            case 'toggle': s.status = s.status === 'active' ? 'paused' : 'active'; persist(); render(); break;
            case 'delete': {
                var idx = subs.indexOf(s);
                subs.splice(idx, 1); persist(); render();
                toast(t('removed') + ' ' + s.name, { label: t('undo'), run: function () { subs.splice(idx, 0, s); persist(); render(); } });
                break;
            }
            case 'cal-prev': calCursor = C.addMonths(calCursor.y, calCursor.m, -1); renderCalendar(C.todayISO()); break;
            case 'cal-next': calCursor = C.addMonths(calCursor.y, calCursor.m, 1); renderCalendar(C.todayISO()); break;
            case 'export-json': exportJSON(); break;
            case 'export-ics': exportICS(); break;
            case 'import-json': $('import-file').click(); break;
        }
    });
    $('sub-form').addEventListener('submit', submit);
    $('q').addEventListener('input', function () { renderList(C.todayISO()); });
    $('sort').addEventListener('change', function () { renderList(C.todayISO()); });
    $('import-file').addEventListener('change', function (e) { var f = e.target.files[0]; e.target.value = ''; if (f) importJSON(f); });
    $('dialog').addEventListener('click', function (e) { if (e.target === $('dialog')) $('dialog').close(); });
    /* Another tab changed the data: pick it up instead of overwriting it later. */
    window.addEventListener('storage', function (e) { if (e.key === KEY) { subs = load(); render(); } });

    P.wire(T);
    P.onLang(render);
    loadCachedRates();
    render();
    fetchRates();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
})();
