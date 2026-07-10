// =============================================================
// dashboard.js
// =============================================================

window.updateDashboard = function() {
    const filtered = filterSalesByPeriod(sales);

    const mSales = document.getElementById('metric-sales-count');
    const mRev = document.getElementById('metric-revenue');
    const mProf = document.getElementById('metric-profit');

    // Remove animation class
    mSales.classList.remove('pop-in');
    mRev.classList.remove('pop-in');
    mProf.classList.remove('pop-in');

    // Update values
    mSales.textContent = filtered.length;
    const totalRevenue = filtered.reduce((s, v) => s + v.price, 0);
    const totalProfit = filtered.reduce((s, v) => s + v.profit, 0);
    mRev.textContent = totalRevenue;
    mProf.textContent = totalProfit;

    // Animate progress bar (profit margin %)
    const progressBar = document.getElementById('profit-progress');
    if (progressBar && totalRevenue > 0) {
        const margin = Math.min(Math.max((totalProfit / totalRevenue) * 100, 0), 100);
        progressBar.style.width = '0%';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                progressBar.style.width = margin + '%';
            });
        });
    } else if (progressBar) {
        progressBar.style.width = '0%';
    }

    // Trigger reflow and re-add animation
    void mSales.offsetWidth;

    mSales.classList.add('pop-in');
    mRev.classList.add('pop-in');
    mProf.classList.add('pop-in');

    const badge = document.getElementById('recent-sales-badge');
    if (badge) badge.textContent = filtered.length + ' registros';
    renderSalesTable(filtered);
    renderHistoryTable();
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
        tr.innerHTML = `
            <td>${date}</td>
            <td>
                <div style="font-weight:500">${sale.productName}</div>
                ${sale.orderCode ? `<div style="font-size:0.75rem; color:var(--text-muted);">Ref: ${sale.orderCode}</div>` : ''}
            </td>
            <td><a href="https://wa.me/591${sale.customer}" target="_blank" style="color:var(--accent-blue);text-decoration:none;">${sale.customer}</a></td>
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

window.renderHistoryTable = function() {
    const tbody = document.getElementById('history-sales-list');
    const empty = document.getElementById('empty-history-state');
    const table = document.querySelector('#history .sales-table');
    if (!tbody || !empty || !table) return;

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
            return true;
        });
    }

    // Apply search filter
    if (historySearchTerm) {
        filteredHistory = filteredHistory.filter(s => {
            const customerName = (s.customerName || '').toLowerCase();
            const customerWA = (s.customer || '').toLowerCase();
            const orderCode = (s.orderCode || '').toLowerCase();
            return customerName.includes(historySearchTerm) || customerWA.includes(historySearchTerm) || orderCode.includes(historySearchTerm);
        });
    }

    if (!filteredHistory.length) {
        empty.style.display = 'block'; table.style.display = 'none';
    } else {
        empty.style.display = 'none'; table.style.display = 'table';
    }

    [...filteredHistory].sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(sale => {
        const tr = document.createElement('tr');
        const date = new Date(sale.date).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
        tr.innerHTML = `
            <td>${date}</td>
            <td>
                <div style="font-weight:500">${sale.productName}</div>
                ${sale.orderCode ? `<div style="font-size:0.75rem; color:var(--text-muted);">Ref: ${sale.orderCode}</div>` : ''}
            </td>
            <td>${sale.customer}</td>
            <td>${sale.price} Bs</td>
            <td>${buildExpireBadge(sale.expireDate)}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon view" title="Ver Detalle" onclick="openSaleDetail('${sale.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.574-3.007-9.964-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </button>
                    <button class="btn-icon copy" title="Copiar Detalle" onclick="copySaleDetail('${sale.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/></svg>
                    </button>
                    <button class="btn-icon notify ${sale.notifiedRenewal ? 'active' : ''}" title="${sale.notifiedRenewal ? 'Aviso Enviado' : 'Aviso Renovación WA'}" onclick="notifyRenewal('${sale.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
                    </button>
                    <button class="btn-icon replace" title="Reemplazar Cuenta" onclick="openReplaceAccount('${sale.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>
                    </button>
                    <button class="btn-icon delete" title="Eliminar Venta" onclick="deleteSale('${sale.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderExpirationAlerts();
}

window.renderExpirationAlerts = function() {
    const urgentList = document.getElementById('expiring-urgent-list');
    const soonList = document.getElementById('expiring-soon-list');
    const badge = document.getElementById('expiration-badge');
    const badgeCount = document.getElementById('expiration-badge-count');

    if (!urgentList || !soonList) return;

    urgentList.innerHTML = '';
    soonList.innerHTML = '';

    const today = nowBolivia(); today.setHours(0,0,0,0);

    // Load dismissed alerts from localStorage
    let dismissedAlerts = JSON.parse(localStorage.getItem('plixora_dismissed_alerts')) || [];

    let urgentCount = 0;
    let soonCount = 0;

    sales.forEach(sale => {
        if (!sale.expireDate) return;
        // EXCLUIR Netflix de las alertas
        const prodName = (sale.productName || '').toLowerCase();
        if (prodName.includes('netflix')) return;
        // Skip dismissed alerts
        if (dismissedAlerts.includes(sale.id)) return;

        const expDate = new Date(sale.expireDate); expDate.setHours(0,0,0,0);
        const diffDays = Math.ceil((expDate - today) / 86400000);

        // Auto-eliminar ventas vencidas hace 2+ dias de las alertas
        if (diffDays <= -2) {
            dismissedAlerts.push(sale.id);
            return;
        }

        if (diffDays <= 7) {
            const itemHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:0.6rem; border-radius:8px; border:1px solid var(--border); font-size:0.85rem; box-shadow: var(--shadow-sm); transition: var(--ease);">
                    <div>
                        <strong style="display:block; color:var(--text-main); margin-bottom: 0.2rem;">${sale.productName}</strong>
                        <span style="color:var(--text-muted); font-size: 0.8rem; display: flex; align-items: center; gap: 0.2rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                            ${sale.customerName || sale.customer}
                        </span>
                    </div>
                    <div style="display:flex; gap:0.4rem; align-items:center;">
                        <span style="color:${diffDays <= 3 ? '#ef4444' : '#d97706'}; font-weight:700; font-size: 0.8rem; background: ${diffDays <= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'}; padding: 0.2rem 0.4rem; border-radius: 4px;">${diffDays <= 0 ? (diffDays === 0 ? 'Vence HOY' : 'Vencido') : `En ${diffDays} d`}</span>
                        <button class="btn-icon notify" onclick="notifyRenewal('${sale.id}')" style="width:28px;height:28px;border-color:${sale.notifiedRenewal ? '#10b981' : 'rgba(16,185,129,0.3)'};color:${sale.notifiedRenewal ? '#fff' : '#10b981'};background:${sale.notifiedRenewal ? '#10b981' : 'transparent'};" title="${sale.notifiedRenewal ? 'Aviso Enviado' : 'Notificar'}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg></button>
                        <button onclick="dismissAlert('${sale.id}')" style="width:28px;height:28px;background:none;border:1px solid rgba(239,68,68,0.25);color:#ef4444;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.7rem;transition:var(--ease);" title="Descartar alerta">&times;</button>
                    </div>
                </div>
            `;

            if (diffDays <= 3) {
                urgentList.insertAdjacentHTML('beforeend', itemHTML);
                urgentCount++;
            } else {
                soonList.insertAdjacentHTML('beforeend', itemHTML);
                soonCount++;
            }
        }
    });

    // Save auto-dismissed
    localStorage.setItem('plixora_dismissed_alerts', JSON.stringify(dismissedAlerts));

    if (urgentCount === 0) urgentList.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:0.5rem; text-align: center; border: 1px dashed var(--border); border-radius: 8px;">✅ Sin urgencias.</div>';
    if (soonCount === 0) soonList.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:0.5rem; text-align: center; border: 1px dashed var(--border); border-radius: 8px;">✅ Sin vencimientos próximos.</div>';

    const totalAlerts = urgentCount + soonCount;
    const badgeDesktop = document.getElementById('nav-badge-desktop');
    const badgeMobile = document.getElementById('nav-badge-mobile');
    const notifBellBadge = document.getElementById('notif-bell-badge');
    const notifBellCount = document.getElementById('notif-bell-count');
    const notifList = document.getElementById('notif-list');
    const notifDismissAll = document.getElementById('notif-dismiss-all');

    // Populate the dropdown
    if (notifList) {
        if (totalAlerts > 0) {
            notifList.innerHTML = urgentList.innerHTML + soonList.innerHTML;
            if (notifDismissAll) notifDismissAll.style.display = 'block';
        } else {
            notifList.innerHTML = '<div class="notif-empty">No hay alertas de vencimiento.</div>';
            if (notifDismissAll) notifDismissAll.style.display = 'none';
        }
    }

    // Update dismiss all button visibility in History
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

window.dismissAlert = function(saleId) {
    let dismissed = JSON.parse(localStorage.getItem('plixora_dismissed_alerts')) || [];
    if (!dismissed.includes(saleId)) dismissed.push(saleId);
    localStorage.setItem('plixora_dismissed_alerts', JSON.stringify(dismissed));
    renderHistoryTable();
    showToast('✅ Alerta descartada');
};

window.dismissAllAlerts = function() {
    if (!confirm('¿Descartar todas las alertas de vencimiento?')) return;
    const dismissed = JSON.parse(localStorage.getItem('plixora_dismissed_alerts')) || [];
    sales.forEach(sale => {
        if (!sale.expireDate) return;
        const prodName = (sale.productName || '').toLowerCase();
        if (prodName.includes('netflix')) return;
        if (!dismissed.includes(sale.id)) dismissed.push(sale.id);
    });
    localStorage.setItem('plixora_dismissed_alerts', JSON.stringify(dismissed));
    renderHistoryTable();
    showToast('✅ Todas las alertas descartadas');
};

