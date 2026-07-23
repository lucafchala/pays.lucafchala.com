// Configurações Globais e Estado
let subs = JSON.parse(localStorage.getItem('subsData')) || [];
let usdRate = 5.00; // Fallback inicial

// Temas
const themeBtn = document.getElementById('theme-toggle');
themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// Fetch Cotação USD (AwesomeAPI)
async function fetchExchangeRate() {
    try {
        const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
        const data = await res.json();
        usdRate = parseFloat(data.USDBRL.ask);
        document.getElementById('exchange-rate').innerText = `R$ ${usdRate.toFixed(2)}`;
        render();
    } catch (e) {
        console.warn('Falha ao buscar cotação. Usando fallback.');
        document.getElementById('exchange-rate').innerText = `R$ ${usdRate.toFixed(2)} (Fallback)`;
        render();
    }
}

// Matemática: Normalização Mensal/Anual
function calculateBRL(price, currency) {
    return currency === 'USD' ? price * usdRate : price;
}

function getMonthlyValue(sub) {
    const brlPrice = calculateBRL(sub.price, sub.currency);
    switch (sub.cycle) {
        case 'weekly': return brlPrice * 4.3333;
        case 'yearly': return brlPrice / 12;
        case 'monthly': 
        default: return brlPrice;
    }
}

// Renderização Geral
function render() {
    renderDashboard();
    renderCalendar();
    renderList();
    localStorage.setItem('subsData', JSON.stringify(subs));
}

function renderDashboard() {
    let monthlyTotal = 0;
    subs.forEach(sub => monthlyTotal += getMonthlyValue(sub));
    const yearlyTotal = monthlyTotal * 12;

    document.getElementById('total-monthly').innerText = `R$ ${monthlyTotal.toFixed(2)}`;
    document.getElementById('total-yearly').innerText = `R$ ${yearlyTotal.toFixed(2)}`;
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    // Grid fixo de 31 dias para representação visual contínua
    for (let i = 1; i <= 31; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';
        dayDiv.innerText = i;
        
        // Encontra assinaturas deste dia
        const daySubs = subs.filter(s => s.day == i);
        daySubs.forEach((sub, idx) => {
            if (idx > 0) return; // Mostra apenas 1 logo por dia no grid mobile
            const img = document.createElement('img');
            img.src = sub.domain ? `https://logo.clearbit.com/${sub.domain}` : 'favicon.svg';
            img.className = 'cal-logo';
            img.onerror = () => { img.style.display = 'none'; };
            dayDiv.appendChild(img);
        });
        
        grid.appendChild(dayDiv);
    }
}

function renderList() {
    const list = document.getElementById('subs-list');
    list.innerHTML = '';

    subs.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'hub';
        
        const imgSrc = sub.domain ? `https://logo.clearbit.com/${sub.domain}` : 'favicon.svg';
        
        // Parse de tags
        const tagsHtml = (sub.tags || '').split(',').map(t => t.trim()).filter(t => t).map(t => `<span class="tag">[${t}]</span>`).join('');
        
        div.innerHTML = `
            <img src="${imgSrc}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTZlMWQ2IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0zIDNoMTh2MThIM3oiLz48L3N2Zz4='">
            <div class="hub-details">
                <div class="hub-title">${sub.name}</div>
                <div class="hub-meta">${tagsHtml} ${sub.currency} ${sub.price} / ${sub.cycle} (Dia ${sub.day})</div>
            </div>
            <button class="act-btn" onclick="removeSub('${sub.id}')">Del</button>
        `;
        list.appendChild(div);
    });
}

// Interações
document.getElementById('sub-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const newSub = {
        id: crypto.randomUUID(),
        name: document.getElementById('sub-name').value,
        domain: document.getElementById('sub-domain').value.replace(/^https?:\/\//, ''),
        price: parseFloat(document.getElementById('sub-price').value),
        currency: document.getElementById('sub-currency').value,
        cycle: document.getElementById('sub-cycle').value,
        day: parseInt(document.getElementById('sub-day').value),
        tags: document.getElementById('sub-tags').value
    };
    subs.push(newSub);
    e.target.reset();
    render();
});

window.removeSub = (id) => {
    subs = subs.filter(s => s.id !== id);
    render();
};

// Exportar JSON (Para ingestão do script Python)
document.getElementById('btn-export-json').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(subs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "assinaturas_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});

// Importar JSON
document.getElementById('btn-import-json').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            subs = JSON.parse(event.target.result);
            render();
        } catch (err) {
            alert('JSON inválido.');
        }
    };
    reader.readAsText(file);
});

// Exportar Calendário (Webcal / .ics)
document.getElementById('btn-export-ics').addEventListener('click', () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LucaFChala//Subs//PT\n";
    
    subs.forEach(sub => {
        // Gerar um evento recorrente (Mensal ou Anual) todo dia X do mês atual
        const now = new Date();
        const startDay = sub.day.toString().padStart(2, '0');
        const startMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const startYear = now.getFullYear();
        const freq = sub.cycle === 'yearly' ? 'YEARLY' : (sub.cycle === 'weekly' ? 'WEEKLY' : 'MONTHLY');

        icsContent += "BEGIN:VEVENT\n";
        icsContent += `DTSTART;VALUE=DATE:${startYear}${startMonth}${startDay}\n`;
        icsContent += `RRULE:FREQ=${freq}\n`;
        icsContent += `SUMMARY:Vencimento: ${sub.name}\n`;
        icsContent += `DESCRIPTION:Pagamento de ${sub.currency} ${sub.price}\n`;
        icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "vencimentos.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Init
fetchExchangeRate();
