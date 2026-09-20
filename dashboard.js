// =============================================================
// dashboard.js
// =============================================================

const HISTORY_PER_PAGE = 15;
let historyPage = 1;
let lastFilteredHistoryTotal = 0;

// ── NOTIFICATION SOUND ──────────────────────────────────────
let _audioCtx = null;
function getAudioCtx() {
    if (!_audioCtx) {
        try {
            _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return null; }
    }
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
}

window.playNotificationSound = function(type) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'sale') {
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'alert') {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.setValueAtTime(400, ctx.currentTime + 0.15);
            osc.frequency.setValueAtTime(600, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } else if (type === 'wasent') {
            // A quick, distinct double pop sound for WhatsApp sent
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.setValueAtTime(900, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        }
        // Suspend context after sound finishes to free resources
        setTimeout(() => { if (_audioCtx && _audioCtx.state === 'running') _audioCtx.suspend(); }, 600);
    } catch (e) { /* Silently fail if audio not supported */ }
};

// ── STITCH METRIC COUNTER ANIMATION (Quartic Ease-Out) ────────
function animateMetricCounter(element, targetVal, duration = 1200) {
    if (!element) return;
    const isInteger = Number.isInteger(targetVal);
    const startVal = parseFloat(element.getAttribute('data-last-val')) || 0;
    element.setAttribute('data-last-val', targetVal);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.textContent = isInteger ? targetVal : targetVal.toFixed(2);
        return;
    }

    const startTime = performance.now();
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Quartic ease-out from Stitch preview: 1 - (1 - progress)^4
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const current = startVal + (targetVal - startVal) * easeOut;
        element.textContent = isInteger ? Math.round(current) : current.toFixed(2);

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = isInteger ? targetVal : targetVal.toFixed(2);
        }
    }
    requestAnimationFrame(updateCounter);
}

// ── METRIC CARDS INTERACTION (Static Cards, Cursor Sheen Tracking & Ripple) ──
function initStitchMetricCards() {
    const cards = document.querySelectorAll('.metric-card');
    if (!cards.length) return;

    cards.forEach(card => {
        if (card.dataset.stitchInitialized) return;
        card.dataset.stitchInitialized = 'true';

        // 1. Ensure sheen overlay exists
        let sheen = card.querySelector('.sheen-overlay');
        if (!sheen) {
            sheen = document.createElement('div');
            sheen.className = 'sheen-overlay';
            card.prepend(sheen);
        }

        // 2. Cursor Sheen Tracking (Static card, NO 3D parallax tilt)
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });

        // 3. Card Action Button Ripple & Micro-interaction
        const btn = card.querySelector('.metric-icon-box');
        if (btn) {
            btn.addEventListener('click', function(e) {
                const circle = document.createElement('span');
                const diameter = Math.max(this.clientWidth, this.clientHeight);
                const radius = diameter / 2;
                const rect = this.getBoundingClientRect();

                circle.style.width = circle.style.height = `${diameter}px`;
                circle.style.left = `${e.clientX - rect.left - radius}px`;
                circle.style.top = `${e.clientY - rect.top - radius}px`;
                circle.className = 'card-btn-ripple';

                const existingRipple = this.querySelector('.card-btn-ripple');
                if (existingRipple) existingRipple.remove();

                this.appendChild(circle);

                const iconSvg = this.querySelector('svg');
                if (iconSvg) {
                    iconSvg.classList.add('scale-125');
                    setTimeout(() => iconSvg.classList.remove('scale-125'), 250);
                }
            });
        }
    });
}

// ── TRIGGER CARDS ENTRANCE ANIMATION ─────────────────────────
window.triggerMetricCardsEntrance = function() {
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach((card, idx) => {
        card.classList.remove('animate-card-entrance');
        card.style.animationDelay = `${idx * 0.1}s`;
        void card.offsetWidth; // force reflow
        card.classList.add('animate-card-entrance');

        const badge = card.querySelector('.metric-trend-badge');
        if (badge) {
            badge.classList.remove('animate-badge-pop');
            void badge.offsetWidth;
            badge.classList.add('animate-badge-pop');
        }
    });
};

window.updateDashboard = function() {
    // Hide skeleton, show table
    const skeleton = document.getElementById('recent-sales-skeleton');
    const tableWrap = document.getElementById('recent-sales-table-wrap');
    if (skeleton) skeleton.style.display = 'none';
    if (tableWrap) tableWrap.style.display = '';

    // Initialize Stitch card interactions
    initStitchMetricCards();

    const filtered = filterSalesByPeriod(sales);

    const mSales = document.getElementById('metric-sales-count');
    const mRev = document.getElementById('metric-revenue');
    const mProf = document.getElementById('metric-profit');

    const totalRevenue = filtered.reduce((s, v) => s + (v.price || 0), 0);
    const totalProfit = filtered.reduce((s, v) => s + (v.profit || 0), 0);

    // Stitch smooth count-up quartic animation
    animateMetricCounter(mSales, filtered.length, 1200);
    animateMetricCounter(mRev, totalRevenue, 1200);
    animateMetricCounter(mProf, totalProfit, 1200);

    const badge = document.getElementById('recent-sales-badge');
    if (badge) badge.textContent = filtered.length + ' registros';

    // Update modern metric trend statistics
    updateMetricTrends(filtered, totalRevenue, totalProfit);

    renderSalesTable(filtered);
    renderHistoryTable();
    if (typeof window.renderIncidentReportCard === 'function') {
        window.renderIncidentReportCard();
    }
}

function getPreviousPeriodSales(salesArr) {
    if (!salesArr || !salesArr.length) return [];
    const now = typeof nowBolivia === 'function' ? nowBolivia() : new Date();
    if (currentPeriod === 'today') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        return salesArr.filter(s => {
            const d = new Date(s.date);
            return d.toDateString() === yesterday.toDateString();
        });
    } else if (currentPeriod === 'week') {
        const startPrevWeek = new Date(now);
        startPrevWeek.setDate(now.getDate() - 14);
        const endPrevWeek = new Date(now);
        endPrevWeek.setDate(now.getDate() - 7);
        return salesArr.filter(s => {
            const d = new Date(s.date);
            return d >= startPrevWeek && d < endPrevWeek;
        });
    } else if (currentPeriod === 'month') {
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return salesArr.filter(s => {
            const d = new Date(s.date);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });
    }
    return [];
}

function calculateMetricTrend(curr, prev) {
    if (!prev || prev <= 0) {
        if (curr > 0) return { pct: '+100%', dir: 'positive' };
        return { pct: '+0%', dir: 'neutral' };
    }
    const diff = ((curr - prev) / prev) * 100;
    const sign = diff >= 0 ? '+' : '';
    const pct = `${sign}${diff.toFixed(1)}%`;
    const dir = diff > 0 ? 'positive' : (diff < 0 ? 'negative' : 'neutral');
    return { pct, dir };
}

function updateMetricTrends(filtered, totalRevenue, totalProfit) {
    const prevSales = getPreviousPeriodSales(sales);
    const prevRevenue = prevSales.reduce((s, v) => s + (v.price || 0), 0);
    const prevProfit = prevSales.reduce((s, v) => s + (v.profit || 0), 0);

    const compareText = currentPeriod === 'today' ? 'vs. ayer' :
                        currentPeriod === 'week' ? 'vs. semana anterior' :
                        currentPeriod === 'month' ? 'vs. mes anterior' : 'histórico acumulado';

    const sTrend = calculateMetricTrend(filtered.length, prevSales.length);
    const rTrend = calculateMetricTrend(totalRevenue, prevRevenue);
    const pTrend = calculateMetricTrend(totalProfit, prevProfit);

    const applyTrend = (badgeId, valId, compareId, sparkLabelId, trend) => {
        const badge = document.getElementById(badgeId);
        const val = document.getElementById(valId);
        const comp = document.getElementById(compareId);
        const sparkLabel = document.getElementById(sparkLabelId);
        if (badge && val) {
            badge.className = 'metric-trend-badge badge-glow animate-badge-pop ' + trend.dir;
            val.textContent = trend.pct;
            const arrow = badge.querySelector('.metric-trend-arrow');
            if (arrow) {
                if (trend.dir === 'negative') {
                    arrow.innerHTML = '<line x1="7" y1="7" x2="17" y2="17"></line><polyline points="17 7 17 17 7 17"></polyline>';
                } else {
                    arrow.innerHTML = '<line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline>';
                }
            }
        }
        if (comp) comp.textContent = compareText;
        if (sparkLabel) sparkLabel.textContent = `${trend.pct} ciclo`;
    };

    applyTrend('metric-sales-trend', 'metric-sales-trend-val', 'metric-sales-compare', 'sparkline-sales-label', sTrend);
    applyTrend('metric-rev-trend', 'metric-rev-trend-val', 'metric-rev-compare', 'sparkline-rev-label', rTrend);
    applyTrend('metric-prof-trend', 'metric-prof-trend-val', 'metric-prof-compare', 'sparkline-prof-label', pTrend);
}

window.renderSalesTable = function(filtered) {
    const src = filtered || filterSalesByPeriod(sales);
    const tbody = document.getElementById('recent-sales-list');
    const empty = document.getElementById('empty-sales-state');
    const table = document.querySelector('#dashboard .sales-table');
    tbody.innerHTML = '';

    if (!src.length) {
        empty.style.display = 'block'; if(table) table.style.display = 'none'; return;
    }
    empty.style.display = 'none'; if(table) table.style.display = 'table';

    [...src].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,10).forEach(sale => {
        const tr = document.createElement('tr');
        const date = new Date(sale.date).toLocaleDateString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
        const customerHTML = (sale.customer && sale.customer !== 'Anónimo')
            ? `<a href="https://wa.me/591${sale.customer}" target="_blank" style="color:var(--accent-blue);text-decoration:none;">${sale.customer}</a>`
            : `<span style="color:var(--text-muted);">Anónimo</span>`;
        tr.innerHTML = `
            <td>${date}</td>
            <td>
                <div style="font-weight:500">${sale.productName}</div>
                ${sale.orderCode ? `<div style="font-size:0.75rem; color:var(--text-muted);">Ref: ${sale.orderCode}</div>` : ''}
            </td>
            <td>${customerHTML}</td>
            <td>${sale.price} Bs</td>
            <td class="profit-badge">+${sale.profit} Bs</td>
        `;
        tbody.appendChild(tr);
    });

    const analyticsView = document.getElementById('analytics');
    if (analyticsView && analyticsView.classList.contains('active')) {
        if (typeof window.renderAnalytics === 'function') {
            window.renderAnalytics();
        }
    }
}

window.getProductLogoInfo = function(productName) {
    const p = (productName || '').toLowerCase();
    
    if (p.includes('netflix')) {
        return {
            src: 'assets/logos/netflix.png',
            bg: '#000000',
            fallback: 'N'
        };
    }
    if (p.includes('spotify')) {
        return {
            src: 'assets/logos/spotify-dark.png',
            bg: '#121212',
            fallback: 'S'
        };
    }
    if (p.includes('disney') || p.includes('star+') || p.includes('star plus')) {
        return {
            src: 'assets/logos/disney.svg',
            bg: '#040714',
            fallback: 'D+'
        };
    }
    if (p.includes('hbo') || p.includes('max')) {
        return {
            src: 'assets/logos/hbomax-dark.png',
            bg: '#000000',
            fallback: 'MAX'
        };
    }
    if (p.includes('capcut')) {
        return {
            src: 'assets/logos/capcut.svg',
            bg: '#000000',
            fallback: 'CC'
        };
    }
    if (p.includes('youtube')) {
        return {
            src: 'assets/logos/youtube.svg',
            bg: '#ffffff',
            fallback: 'YT'
        };
    }
    if (p.includes('prime') || p.includes('amazon')) {
        return {
            src: 'assets/logos/primevideo.svg',
            bg: '#00050d',
            fallback: 'PV'
        };
    }
    if (p.includes('tv') || p.includes('magis') || p.includes('flujo') || p.includes('iptv') || p.includes('latino') || p.includes('nubia') || p.includes('veltix') || p.includes('plex')) {
        return {
            isTvIcon: true,
            bg: 'rgba(254, 91, 41, 0.12)',
            color: '#fe5b29',
            fallback: 'TV'
        };
    }
    return {
        isGeneric: true,
        bg: 'rgba(99, 102, 241, 0.14)',
        color: '#6366f1',
        fallback: (productName ? productName.trim().slice(0, 2).toUpperCase() : 'PL')
    };
};

window.buildStatusBadge = function(expireDate) {
    if (!expireDate) {
        return `<span class="hist-status-badge active"><span class="hist-status-dot"></span>Activo</span>`;
    }
    const today = (typeof nowBolivia === 'function' ? nowBolivia() : new Date());
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expireDate);
    expDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate - today) / 86400000);

    if (diffDays < 0) {
        return `<span class="hist-status-badge expired" title="Venció hace ${Math.abs(diffDays)} días"><span class="hist-status-dot"></span>Vencido</span>`;
    } else if (diffDays === 0) {
        return `<span class="hist-status-badge warning" title="Vence hoy"><span class="hist-status-dot"></span>Vence Hoy</span>`;
    } else if (diffDays <= 5) {
        return `<span class="hist-status-badge warning" title="Vence en ${diffDays} días"><span class="hist-status-dot"></span>${diffDays} d. rest.</span>`;
    } else {
        return `<span class="hist-status-badge active" title="Vence en ${diffDays} días"><span class="hist-status-dot"></span>Activo</span>`;
    }
};

window.renderHistoryTable = function() {
    const tbody = document.getElementById('history-sales-list');
    const empty = document.getElementById('empty-history-state');
    const table = document.querySelector('#history .sales-table');
    const skeleton = document.getElementById('history-skeleton');
    const historyTable = document.getElementById('history-table');
    if (!tbody || !empty || !table) return;

    // Hide skeleton, show table
    if (skeleton) skeleton.style.display = 'none';
    if (historyTable) historyTable.style.display = 'table';

    tbody.innerHTML = '';

    let filteredHistory = sales;

    // Apply product filter
    if (historyProductFilter !== 'all') {
        filteredHistory = filteredHistory.filter(s => {
            const p = (s.productName || '').toLowerCase();
            if (historyProductFilter === 'netflix') return p.includes('netflix');
            if (historyProductFilter === 'spotify') return p.includes('spotify');
            if (historyProductFilter === 'capcut') return p.includes('capcut');
            if (historyProductFilter === 'youtube') return p.includes('youtube');
            if (historyProductFilter === 'hbo') return p.includes('hbo max') || p.includes('hbo');
            if (historyProductFilter === 'tv') return p.includes('tv') || p.includes('magis') || p.includes('flujo') || p.includes('iptv') || p.includes('latino') || p.includes('nubia') || p.includes('veltix') || p.includes('plex');
            return true;
        });
    }

    // Apply search filter
    if (historySearchTerm) {
        filteredHistory = filteredHistory.filter(s => {
            const customerName = (s.customerName || '').toLowerCase();
            const customerWA = (s.customer || '').toLowerCase();
            const orderCode = (s.orderCode || '').toLowerCase();
            const productName = (s.productName || '').toLowerCase();
            return customerName.includes(historySearchTerm) || customerWA.includes(historySearchTerm) || orderCode.includes(historySearchTerm) || productName.includes(historySearchTerm);
        });
    }

    // Sort by date descending
    filteredHistory.sort((a,b) => new Date(b.date) - new Date(a.date));

    // Pagination
    lastFilteredHistoryTotal = filteredHistory.length;
    const totalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PER_PAGE));
    if (historyPage > totalPages) historyPage = totalPages;
    const start = (historyPage - 1) * HISTORY_PER_PAGE;
    const pageData = filteredHistory.slice(start, start + HISTORY_PER_PAGE);

    if (!filteredHistory.length) {
        empty.style.display = 'block'; table.style.display = 'none';
        const paginationEl = document.getElementById('history-pagination');
        if (paginationEl) paginationEl.style.display = 'none';
    } else {
        empty.style.display = 'none'; table.style.display = 'table';
    }

    pageData.forEach(sale => {
        const tr = document.createElement('tr');
        
        // 1. Fecha
        const dObj = new Date(sale.date);
        const dateFormatted = isNaN(dObj.getTime()) ? '—' : dObj.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });

        // 2. ID (Código de referencia PLX)
        const orderId = sale.orderCode || ('PLX-' + (sale.id ? String(sale.id).slice(-5).toUpperCase() : '0001'));

        // 3. Producto con Logo Avatar Redondo
        const logoInfo = getProductLogoInfo(sale.productName);
        const logoHtml = logoInfo.src ? 
            `<div class="hist-avatar-circle" style="background:${logoInfo.bg};">
                <img src="${logoInfo.src}" alt="${sale.productName}" class="hist-avatar-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                <span class="hist-avatar-fallback" style="display:none;">${logoInfo.fallback}</span>
            </div>` :
            `<div class="hist-avatar-circle" style="background:${logoInfo.bg};color:${logoInfo.color || '#fff'};">
                ${logoInfo.isTvIcon ? 
                    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>` : 
                    `<span class="hist-avatar-fallback">${logoInfo.fallback}</span>`
                }
            </div>`;

        // 4. Nombre del Cliente
        const customerName = sale.customerName || (sale.customer && !/^\+?\d+$/.test(sale.customer.replace(/[\s\-\+]/g, '')) ? sale.customer : 'Cliente');

        // 5. Número de Teléfono
        const phoneRaw = (sale.customer || sale.whatsapp || '').trim();
        const cleanPhone = phoneRaw.replace(/\D/g, '');
        let phoneHtml = '<span style="color:var(--text-muted);">—</span>';
        if (cleanPhone) {
            const waNumber = cleanPhone.length <= 8 ? '591' + cleanPhone : cleanPhone;
            phoneHtml = `<a href="https://wa.me/${waNumber}" target="_blank" class="hist-phone-link" title="Abrir WhatsApp">
                <svg class="hist-wa-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                <span>${phoneRaw}</span>
            </a>`;
        }

        // 6. Precio del producto (Bs, sin $)
        const priceFormatted = Number.isInteger(sale.price) ? sale.price : Number(sale.price).toFixed(2);

        // 7. Estado de la cuenta
        const statusHtml = buildStatusBadge(sale.expireDate);

        // 8. Botones de acciones
        const actionsHtml = `
            <div class="actions-cell">
                <button class="btn-icon view" title="Ver Detalle" onclick="openSaleDetail('${sale.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.574-3.007-9.964-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                </button>
                <button class="btn-icon copy" title="Copiar Detalle" onclick="copySaleDetail('${sale.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/></svg>
                </button>
                <button class="btn-icon notify ${sale.notifiedRenewal ? 'active' : ''}" title="${sale.notifiedRenewal ? 'Aviso Enviado' : 'Aviso Renovación WA'}" onclick="notifyRenewal('${sale.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
                </button>
                <button class="btn-icon replace" title="Reemplazar Cuenta" onclick="openReplaceAccount('${sale.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
                </button>
                <button class="btn-icon delete" title="Eliminar Venta" onclick="deleteSale('${sale.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                </button>
            </div>
        `;

        tr.innerHTML = `
            <td class="hist-td-date">${dateFormatted}</td>
            <td class="hist-td-id"><span class="hist-order-code">${orderId}</span></td>
            <td class="hist-td-prod">
                <div class="hist-product-wrap">
                    ${logoHtml}
                    <span class="hist-product-name" title="${sale.productName}">${sale.productName}</span>
                </div>
            </td>
            <td class="hist-td-customer"><span class="hist-customer-name" title="${customerName}">${customerName}</span></td>
            <td class="hist-td-phone">${phoneHtml}</td>
            <td class="hist-td-price"><span class="hist-price-val">${priceFormatted} <small>Bs</small></span></td>
            <td class="hist-td-status">${statusHtml}</td>
            <td class="hist-td-actions" style="text-align:right;">${actionsHtml}</td>
        `;
        tbody.appendChild(tr);
    });

    renderPaginationControls(filteredHistory.length, totalPages);
    renderExpirationAlerts();
}

function renderPaginationControls(totalItems, totalPages) {
    const container = document.getElementById('history-pagination');
    if (!container) return;
    if (totalItems === 0) { container.style.display = 'none'; return; }
    container.style.display = 'flex';

    const start = (historyPage - 1) * HISTORY_PER_PAGE + 1;
    const end = Math.min(historyPage * HISTORY_PER_PAGE, totalItems);

    let html = `<span style="font-size:0.8rem;color:var(--text-muted);margin-right:1rem;">${start}-${end} de ${totalItems}</span>`;

    // Previous button
    html += `<button class="pag-btn" onclick="goHistoryPage(${historyPage - 1})" ${historyPage <= 1 ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>`;

    // Page numbers (show max 5 around current)
    const maxVisible = 5;
    let pageStart = Math.max(1, historyPage - Math.floor(maxVisible / 2));
    let pageEnd = Math.min(totalPages, pageStart + maxVisible - 1);
    if (pageEnd - pageStart + 1 < maxVisible) pageStart = Math.max(1, pageEnd - maxVisible + 1);

    for (let i = pageStart; i <= pageEnd; i++) {
        html += `<button class="pag-btn ${i === historyPage ? 'pag-active' : ''}" onclick="goHistoryPage(${i})">${i}</button>`;
    }

    // Next button
    html += `<button class="pag-btn" onclick="goHistoryPage(${historyPage + 1})" ${historyPage >= totalPages ? 'disabled' : ''}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;

    container.innerHTML = html;
}

window.goHistoryPage = function(page) {
    const count = lastFilteredHistoryTotal !== undefined ? lastFilteredHistoryTotal : sales.length;
    const totalPages = Math.max(1, Math.ceil(count / HISTORY_PER_PAGE));
    if (page < 1 || page > totalPages) return;
    historyPage = page;
    renderHistoryTable();
};

window.renderExpirationAlerts = function() {
    const urgentList = document.getElementById('expiring-urgent-list');
    const soonList = document.getElementById('expiring-soon-list');
    const badge = document.getElementById('expiration-badge');
    const badgeCount = document.getElementById('expiration-badge-count');

    if (!urgentList || !soonList) return;

    const today = nowBolivia(); today.setHours(0,0,0,0);

    let urgentHTML = '';
    let soonHTML = '';
    let urgentCount = 0;
    let soonCount = 0;

    const svgBell = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>';
    const svgUser = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>';
    const svgWA = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>';

    for (let i = 0; i < sales.length; i++) {
        const sale = sales[i];
        if (!sale.expireDate) continue;
        const prodName = (sale.productName || '').toLowerCase();
        if (prodName.includes('netflix')) continue;
        if (sale.alertDismissed) continue;

        const expDate = new Date(sale.expireDate); expDate.setHours(0,0,0,0);
        const diffDays = Math.ceil((expDate - today) / 86400000);
        if (diffDays <= -2 || diffDays > 7) continue;

        const urgency = diffDays <= 3 ? 'urgent' : 'soon';
        const badgeLabel = diffDays <= 0 ? (diffDays === 0 ? 'Hoy' : 'Vencido') : diffDays + 'd';
        const badgeClass = diffDays <= 0
            ? (diffDays === 0 ? 'notif-card-badge vence-hoy' : 'notif-card-badge vencido')
            : 'notif-card-badge ' + urgency;

        const itemHTML = '<div class="notif-card"><div class="notif-card-icon ' + urgency + '">' + svgBell + '</div><div class="notif-card-body"><div class="notif-card-title">' + sale.productName + '</div><div class="notif-card-customer">' + svgUser + ' ' + (sale.customerName || sale.customer) + '</div></div><div class="notif-card-actions"><span class="' + badgeClass + '">' + badgeLabel + '</span><div class="notif-card-row"><button class="notif-btn-notify' + (sale.notifiedRenewal ? ' sent' : '') + '" data-action="notify" data-saleid="' + sale.id + '" title="' + (sale.notifiedRenewal ? 'Aviso Enviado' : 'Notificar') + '">' + svgWA + '</button><button class="notif-btn-dismiss" data-action="dismiss" data-saleid="' + sale.id + '" title="Descartar">&times;</button></div></div></div>';

        if (diffDays <= 3) { urgentHTML += itemHTML; urgentCount++; }
        else { soonHTML += itemHTML; soonCount++; }
    }

    urgentList.innerHTML = urgentHTML || '<div class="notif-empty" style="padding:1.25rem 1rem;"><div class="notif-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><span class="notif-empty-title">Sin urgencias</span><span style="font-size:0.78rem;">Todo está al día</span></div>';
    soonList.innerHTML = soonHTML || '<div class="notif-empty" style="padding:1.25rem 1rem;"><div class="notif-empty-icon" style="background:rgba(245,158,11,0.1);"><svg xmlns="http://www.w3.org/2000/svg" style="color:#f59e0b;" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><span class="notif-empty-title">Sin vencimientos próximos</span><span style="font-size:0.78rem;">Nada que renovar pronto</span></div>';

    const totalAlerts = urgentCount + soonCount;
    if (totalAlerts > 0 && window._alertsPrevCount !== undefined && totalAlerts > window._alertsPrevCount) {
        if (typeof window.playNotificationSound === 'function') {
            window.playNotificationSound('alert');
        }
    }
    window._alertsPrevCount = totalAlerts;

    const badgeDesktop = document.getElementById('nav-badge-desktop');
    const badgeMobile = document.getElementById('nav-badge-mobile');
    const notifBellBadge = document.getElementById('notif-bell-badge');
    const notifBellCount = document.getElementById('notif-bell-count');
    const notifList = document.getElementById('notif-list');
    const notifDismissAll = document.getElementById('notif-dismiss-all');

    if (notifList) {
        if (totalAlerts > 0) {
            notifList.innerHTML = urgentHTML + soonHTML;
            if (notifDismissAll) notifDismissAll.style.display = 'block';
        } else {
            notifList.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><span class="notif-empty-title">Todo tranquilo</span><span style="font-size:0.78rem;">No hay alertas de vencimiento</span></div>';
            if (notifDismissAll) notifDismissAll.style.display = 'none';
        }
    }

    const dismissAllBtn = document.getElementById('dismiss-all-alerts-btn');
    if (dismissAllBtn) dismissAllBtn.style.display = totalAlerts > 0 ? 'inline-block' : 'none';

    if (totalAlerts > 0) {
        badgeCount.textContent = totalAlerts;
        badge.dataset.open = "true";
        if (badgeDesktop) badgeDesktop.dataset.open = "true";
        if (badgeMobile) badgeMobile.dataset.open = "true";
        if (notifBellBadge) {
            notifBellBadge.dataset.open = "true";
            if (notifBellCount) notifBellCount.textContent = totalAlerts;
        }
    } else {
        badge.dataset.open = "false";
        if (badgeDesktop) badgeDesktop.dataset.open = "false";
        if (badgeMobile) badgeMobile.dataset.open = "false";
        if (notifBellBadge) notifBellBadge.dataset.open = "false";
    }
}

// Event delegation for expiration alert buttons
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const saleId = btn.dataset.saleid;
    if (action === 'dismiss' && saleId) dismissAlert(saleId);
    if (action === 'notify' && saleId) notifyRenewal(saleId);
});

window.dismissAlert = function(saleId) {
    if (!db) {
        const targetSale = (window.sales || []).find(s => s.id === saleId);
        if (targetSale) {
            targetSale.alertDismissed = true;
            try { localStorage.setItem('plixora_sales', JSON.stringify(window.sales)); } catch(e) {}
            if (typeof window.updateDashboard === 'function') window.updateDashboard();
            showToast('✅ Alerta descartada (modo local)');
        }
        return;
    }
    
    db.collection('plixora_sales').doc(saleId).update({ alertDismissed: true })
        .then(() => {
            showToast('✅ Alerta descartada en todos los dispositivos');
        })
        .catch(err => {
            console.error('Error al descartar alerta:', err);
            showToast('❌ Error al descartar alerta');
        });
};

window.dismissAllAlerts = async function() {
    const confirmed = typeof window.plixoraConfirm === 'function'
        ? await window.plixoraConfirm({
            title: 'Descartar Alertas',
            message: '¿Descartar todas las alertas de vencimiento actuales?',
            confirmText: 'Sí, descartar',
            cancelText: 'Cancelar'
        })
        : confirm('¿Descartar todas las alertas de vencimiento actuales?');

    if (!confirmed) return;

    const salesList = window.sales || [];
    const today = typeof nowBolivia === 'function' ? nowBolivia() : new Date();
    today.setHours(0,0,0,0);

    if (!db) {
        let count = 0;
        salesList.forEach(sale => {
            if (!sale.expireDate) return;
            const prodName = (sale.productName || '').toLowerCase();
            if (prodName.includes('netflix')) return;
            if (!sale.alertDismissed) {
                const expDate = new Date(sale.expireDate); expDate.setHours(0,0,0,0);
                const diffDays = Math.ceil((expDate - today) / 86400000);
                if (diffDays <= 7 && diffDays > -2) {
                    sale.alertDismissed = true;
                    count++;
                }
            }
        });
        try { localStorage.setItem('plixora_sales', JSON.stringify(salesList)); } catch(e) {}
        if (typeof window.updateDashboard === 'function') window.updateDashboard();
        showToast(count > 0 ? `✅ ${count} alertas descartadas localmente` : 'ℹ️ No hay alertas para descartar');
        return;
    }

    const batch = db.batch();
    let count = 0;

    salesList.forEach(sale => {
        if (!sale.expireDate) return;
        const prodName = (sale.productName || '').toLowerCase();
        if (prodName.includes('netflix')) return;
        
        // Si no está ya descartada, añadirla al batch
        if (!sale.alertDismissed) {
            const expDate = new Date(sale.expireDate); expDate.setHours(0,0,0,0);
            const diffDays = Math.ceil((expDate - today) / 86400000);
            
            // Solo descartar las que están en el rango de alerta (<= 7 días y > -2)
            if (diffDays <= 7 && diffDays > -2) {
                const docRef = db.collection('plixora_sales').doc(sale.id);
                batch.update(docRef, { alertDismissed: true });
                count++;
            }
        }
    });

    if (count > 0) {
        batch.commit().then(() => {
            showToast(`✅ ${count} alertas descartadas globalmente`);
        }).catch(err => {
            console.error('Error en batch dismiss:', err);
            showToast('❌ Error al descartar alertas');
        });
    } else {
        showToast('ℹ️ No hay alertas para descartar');
    }
};

// =============================================================
// ── INCIDENT REPORT CARD (ESTADÍSTICAS & RENDIMIENTO) ────────
// =============================================================
let incidentChartInstance = null;

window.renderIncidentReportCard = function () {
    const canvas = document.getElementById('plx-incident-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Generar 7 días (offset de 6 días atrás hasta hoy)
    const now = new Date();
    const offsets = [6, 5, 4, 3, 2, 1, 0];
    const labels = [];
    const seriesSales = [];
    const seriesRevenue = [];
    const seriesProfit = [];

    const allSales = (typeof sales !== 'undefined' && Array.isArray(sales)) ? sales : [];

    offsets.forEach(offset => {
        const d = new Date(now);
        d.setDate(now.getDate() - offset);
        const y = d.getFullYear();
        const m = d.getMonth();
        const day = d.getDate();

        // Label formato 'M/D' exacto al snippet (ej. 9/15, 9/16, o 'Hoy')
        labels.push(offset === 0 ? 'Hoy' : `${m + 1}/${day}`);

        // Filtrar ventas de este día calendario
        const daySales = allSales.filter(s => {
            if (!s || !s.date) return false;
            const sd = new Date(s.date);
            return sd.getFullYear() === y && sd.getMonth() === m && sd.getDate() === day;
        });

        const dayCount = daySales.length;
        const dayRev = daySales.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
        const dayProf = daySales.reduce((acc, s) => acc + (Number(s.profit) || 0), 0);

        seriesSales.push(dayCount);
        seriesRevenue.push(dayRev);
        seriesProfit.push(dayProf);
    });

    const totalCount7d = seriesSales.reduce((a, b) => a + b, 0);
    const totalRev7d = seriesRevenue.reduce((a, b) => a + b, 0);
    const totalProf7d = seriesProfit.reduce((a, b) => a + b, 0);

    let displaySeriesSales = seriesSales;
    let displaySeriesRevenue = seriesRevenue;
    let displaySeriesProfit = seriesProfit;

    // Actualizar métricas inferiores con correlación de datos 100% reales
    const avgDailyRev = totalRev7d > 0 ? (totalRev7d / 7).toFixed(1) : '0.00';
    const totalProfitDisplay = totalProf7d > 0 ? (Number.isInteger(totalProf7d) ? totalProf7d : totalProf7d.toFixed(1)) : '0.00';
    const profitMargin = (totalRev7d > 0 && totalProf7d > 0) ? Math.round((totalProf7d / totalRev7d) * 100) : 0;

    const elVal1 = document.getElementById('plx-rep-val-1');
    const elVal2 = document.getElementById('plx-rep-val-2');
    const elVal3 = document.getElementById('plx-rep-val-3');

    if (elVal1) elVal1.textContent = `${avgDailyRev} Bs`;
    if (elVal2) elVal2.textContent = `${totalProfitDisplay} Bs`;
    if (elVal3) elVal3.textContent = `${profitMargin}%`;

    // Re-disparar animación escalonada de las filas de métricas
    const rows = document.querySelectorAll('.plx-report-metric-row');
    rows.forEach((row, i) => {
        row.style.animation = 'none';
        void row.offsetWidth;
        row.style.animation = `plxMetricRowFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.05 + i * 0.08}s forwards`;
    });

    // Renderizar gráfico con Chart.js
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (incidentChartInstance) {
        incidentChartInstance.destroy();
        incidentChartInstance = null;
    }

    // Crear gradientes correspondientes a la paleta exacta:
    // DLP: #5B14C5
    // SysLog: #B58BF3
    // Threat Intel: #DAC5F9
    const gradDLP = ctx.createLinearGradient(0, 0, 0, 190);
    gradDLP.addColorStop(0, 'rgba(91, 20, 197, 0.45)');
    gradDLP.addColorStop(1, 'rgba(91, 20, 197, 0.0)');

    const gradSysLog = ctx.createLinearGradient(0, 0, 0, 190);
    gradSysLog.addColorStop(0, 'rgba(181, 139, 243, 0.40)');
    gradSysLog.addColorStop(1, 'rgba(181, 139, 243, 0.0)');

    const gradThreat = ctx.createLinearGradient(0, 0, 0, 190);
    gradThreat.addColorStop(0, 'rgba(218, 197, 249, 0.35)');
    gradThreat.addColorStop(1, 'rgba(218, 197, 249, 0.0)');

    incidentChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'DLP (Ventas)',
                    data: displaySeriesSales,
                    borderColor: '#5B14C5',
                    backgroundColor: gradDLP,
                    fill: true,
                    tension: 0.45,
                    borderWidth: 2.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#5B14C5',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                },
                {
                    label: 'Threat Intel (Ganancia)',
                    data: displaySeriesProfit,
                    borderColor: '#DAC5F9',
                    backgroundColor: gradThreat,
                    fill: true,
                    tension: 0.45,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#DAC5F9',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                },
                {
                    label: 'SysLog (Ingresos)',
                    data: displaySeriesRevenue,
                    borderColor: '#B58BF3',
                    backgroundColor: gradSysLog,
                    fill: true,
                    tension: 0.45,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#B58BF3',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: 'easeInOutCubic'
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(10, 10, 12, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                    titleColor: isDark ? '#ffffff' : '#0f172a',
                    bodyColor: isDark ? '#9ca3af' : '#475569',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    usePointStyle: true
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: isDark ? '#A0AEC0' : '#9A9AAF',
                        font: {
                            family: "'Inter', monospace",
                            size: 11
                        }
                    }
                },
                y: {
                    border: {
                        display: false
                    },
                    grid: {
                        color: isDark ? 'rgba(74, 85, 104, 0.35)' : 'rgba(126, 126, 143, 0.22)',
                        drawTicks: false
                    },
                    ticks: {
                        display: false
                    }
                }
            }
        }
    });
};

// Auto-initialize Stitch metric cards on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof initStitchMetricCards === 'function') initStitchMetricCards();
    });
} else {
    if (typeof initStitchMetricCards === 'function') initStitchMetricCards();
}

