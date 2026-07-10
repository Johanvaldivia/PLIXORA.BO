// =============================================================
// dashboard.js
// =============================================================

const HISTORY_PER_PAGE = 15;
let historyPage = 1;

// ── NOTIFICATION SOUND ──────────────────────────────────────
window.playNotificationSound = function(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
        }
    } catch (e) { /* Silently fail if audio not supported */ }
};

window.updateDashboard = function() {
    // Hide skeleton, show table
    const skeleton = document.getElementById('recent-sales-skeleton');
    const tableWrap = document.getElementById('recent-sales-table-wrap');
    if (skeleton) skeleton.style.display = 'none';
    if (tableWrap) tableWrap.style.display = '';

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

    // Sort by date descending
    filteredHistory.sort((a,b) => new Date(b.date) - new Date(a.date));

    // Pagination
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
    const totalPages = Math.max(1, Math.ceil(sales.length / HISTORY_PER_PAGE));
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

    urgentList.innerHTML = '';
    soonList.innerHTML = '';

    const today = nowBolivia(); today.setHours(0,0,0,0);

    let urgentCount = 0;
    let soonCount = 0;

    sales.forEach(sale => {
        if (!sale.expireDate) return;
        // EXCLUIR Netflix de las alertas
        const prodName = (sale.productName || '').toLowerCase();
        if (prodName.includes('netflix')) return;
        // Skip explicitly dismissed alerts
        if (sale.alertDismissed) return;

        const expDate = new Date(sale.expireDate); expDate.setHours(0,0,0,0);
        const diffDays = Math.ceil((expDate - today) / 86400000);

        // Auto-eliminar ventas vencidas hace 2+ dias de las alertas (sin guardar en BD)
        if (diffDays <= -2) {
            return;
        }

        if (diffDays <= 7) {
            const urgency = diffDays <= 3 ? 'urgent' : 'soon';
            const badgeLabel = diffDays <= 0
                ? (diffDays === 0 ? 'Hoy' : `Vencido`)
                : `${diffDays}d`;
            const badgeClass = diffDays <= 0
                ? (diffDays === 0 ? 'notif-card-badge vence-hoy' : 'notif-card-badge vencido')
                : `notif-card-badge ${urgency}`;

            const itemHTML = `
                <div class="notif-card">
                    <div class="notif-card-icon ${urgency}">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
                    </div>
                    <div class="notif-card-body">
                        <div class="notif-card-title">${sale.productName}</div>
                        <div class="notif-card-customer">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                            ${sale.customerName || sale.customer}
                        </div>
                    </div>
                    <div class="notif-card-actions">
                        <span class="${badgeClass}">${badgeLabel}</span>
                        <div class="notif-card-row">
                            <button class="notif-btn-notify${sale.notifiedRenewal ? ' sent' : ''}" onclick="notifyRenewal('${sale.id}')" title="${sale.notifiedRenewal ? 'Aviso Enviado' : 'Notificar'}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg></button>
                            <button class="notif-btn-dismiss" onclick="dismissAlert('${sale.id}')" title="Descartar">&times;</button>
                        </div>
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

    if (urgentCount === 0) urgentList.innerHTML = '<div class="notif-empty" style="padding:1.25rem 1rem;"><div class="notif-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><span class="notif-empty-title">Sin urgencias</span><span style="font-size:0.78rem;">Todo está al día</span></div>';
    if (soonCount === 0) soonList.innerHTML = '<div class="notif-empty" style="padding:1.25rem 1rem;"><div class="notif-empty-icon" style="background:rgba(245,158,11,0.1);"><svg xmlns="http://www.w3.org/2000/svg" style="color:#f59e0b;" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><span class="notif-empty-title">Sin vencimientos próximos</span><span style="font-size:0.78rem;">Nada que renovar pronto</span></div>';

    const totalAlerts = urgentCount + soonCount;
    // Play notification sound for new alerts (only if there are alerts and not on first load)
    if (totalAlerts > 0 && window._alertsInitialized) {
        if (typeof window.playNotificationSound === 'function') {
            window.playNotificationSound('alert');
        }
    }
    window._alertsInitialized = true;
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
            notifList.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><span class="notif-empty-title">Todo tranquilo</span><span style="font-size:0.78rem;">No hay alertas de vencimiento</span></div>';
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
    if (!db) { showToast('Error: No hay conexión a la base de datos'); return; }
    
    db.collection('plixora_sales').doc(saleId).update({ alertDismissed: true })
        .then(() => {
            showToast('✅ Alerta descartada en todos los dispositivos');
            // La actualización local se manejará automáticamente por el onSnapshot
        })
        .catch(err => {
            console.error('Error al descartar alerta:', err);
            showToast('❌ Error al descartar alerta');
        });
};

window.dismissAllAlerts = function() {
    if (!confirm('¿Descartar todas las alertas de vencimiento actuales?')) return;
    if (!db) { showToast('Error: No hay conexión'); return; }

    const batch = db.batch();
    let count = 0;

    sales.forEach(sale => {
        if (!sale.expireDate) return;
        const prodName = (sale.productName || '').toLowerCase();
        if (prodName.includes('netflix')) return;
        
        // Si no está ya descartada, añadirla al batch
        if (!sale.alertDismissed) {
            const today = nowBolivia(); today.setHours(0,0,0,0);
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

