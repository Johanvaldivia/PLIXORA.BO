// =============================================================
// PLIXORA.BO — Módulo Netflix
// Gestión de cuentas y perfiles
// =============================================================
(function () {
    'use strict';

    let db = null;
    let nfAccounts = [];
    let nfFilter = 'all';
    let currentDetailId = null;
    let assignProfileIndex = null;
    let transferSourceAccountId = null;
    let transferSourceProfileIdx = null;

    // ── Exponer db desde app.js ──────────────────────────────
    window.nfSetDb = function (firebaseDb) {
        db = firebaseDb;
        loadAccounts();
    };

    window.nfInitLocal = function () {
        nfAccounts = JSON.parse(localStorage.getItem('nf_accounts') || '[]');
        renderAll();
    };

    // ── FIREBASE LOAD ────────────────────────────────────────
    function loadAccounts() {
        if (!db) { window.nfInitLocal(); return; }
        db.collection('netflix_accounts')
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                snap => {
                    nfAccounts = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                    localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
                    renderAll();
                    // Refresh detail modal if open
                    if (currentDetailId && document.getElementById('nf-detail-modal').style.display !== 'none') {
                        renderDetailModal(currentDetailId);
                    }
                },
                err => console.error('NF error:', err)
            );
    }

    // ── HELPERS ──────────────────────────────────────────────
    function generateCode() {
        const max = nfAccounts.reduce((m, a) => {
            const n = parseInt((a.codigo || 'NF-000').replace('NF-', '')) || 0;
            return n > m ? n : m;
        }, 0);
        return 'NF-' + String(max + 1).padStart(3, '0');
    }

    function generateProfiles(prefix) {
        const p = prefix || 'Perfil ';
        return [1, 2, 3, 4, 5].map(n => ({
            nombre: p + n, estado: 'libre',
            cliente: '', whatsapp: '', inicio: '', vencimiento: '', obs: ''
        }));
    }

    function daysTo(dateStr) {
        if (!dateStr) return null;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const exp = new Date(dateStr); exp.setHours(0, 0, 0, 0);
        return Math.ceil((exp - today) / 86400000);
    }

    function expireBadge(dateStr) {
        if (!dateStr) return '<span style="color:var(--text-muted);font-size:0.8rem">—</span>';
        const d = daysTo(dateStr);
        const label = new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        if (d < 0)  return `<span class="nf-badge expired">Vencido</span>`;
        if (d === 0) return `<span class="nf-badge expiring">Vence HOY</span>`;
        if (d <= 5) return `<span class="nf-badge expiring">En ${d}d ⚠️</span>`;
        return `<span class="nf-badge active-badge">${label}</span>`;
    }

    function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

    // Local date string (YYYY-MM-DD) — avoids UTC shift from toISOString()
    function toLocalDateStr(d) {
        const dt = d || new Date();
        return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    }

    // Delete sale(s) from history by orderCode — robust cross-module helper
    async function deleteSaleByOrderCode(orderCode) {
        if (!orderCode) return;
        try {
            if (db) {
                const snap = await db.collection('plixora_sales').where('orderCode', '==', orderCode).get();
                const batch = db.batch();
                snap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
            // Also remove from local sales array if accessible
            if (typeof window.removeSale === 'function') {
                const localSales = JSON.parse(localStorage.getItem('plixora_sales') || '[]');
                const match = localSales.find(s => s.orderCode === orderCode);
                if (match) await window.removeSale(match.id);
            }
        } catch (e) { console.error('Error eliminando venta:', e); }
    }

    // Delete ALL sales for a given account (by matching account code in productName)
    async function deleteAllSalesForAccount(acc) {
        if (!acc) return;
        try {
            // Delete by orderCode for each occupied profile
            for (const p of (acc.perfiles || [])) {
                if (p && p.orderCode) {
                    await deleteSaleByOrderCode(p.orderCode);
                }
            }
        } catch (e) { console.error('Error eliminando ventas de cuenta:', e); }
    }

    // ── RENDER ALL ───────────────────────────────────────────
    window.nfRenderAll = function renderAll() {
        renderStats();
        renderAccountsList();
    }

    // ── STATS ────────────────────────────────────────────────
    function renderStats() {
        try {
            let occupied = 0;
            const activeAccounts = nfAccounts.filter(a => {
                const st = (a.estado || '').trim().toLowerCase();
                return st === 'activa' || st === '';
            });
            const closedAccountsCount = nfAccounts.filter(a => {
                const st = (a.estado || '').trim().toLowerCase();
                return st !== 'activa' && st !== '';
            }).length;
            activeAccounts.forEach(a => {
                (a.perfiles || []).forEach(p => {
                    if (p && p.estado === 'ocupado') {
                        occupied++;
                    }
                });
            });
            const total = activeAccounts.length * 5;
            setText('nf-stat-accounts', activeAccounts.length);
            setText('nf-stat-total', total);
            setText('nf-stat-occupied', occupied);
            setText('nf-stat-free', total - occupied);
            setText('nf-stat-closed', closedAccountsCount);
        } catch (e) {
            console.error('Error in renderStats:', e);
        }
    }

    // ── ACCOUNTS LIST ────────────────────────────────────────
    function renderAccountsList() {
        try {
            const tbody = document.getElementById('nf-accounts-list');
            const empty = document.getElementById('nf-empty-state');
            const table = document.getElementById('nf-accounts-table');
            const badge = document.getElementById('nf-accounts-badge');
            if (!tbody) return;

            let data = [...nfAccounts];
            if (nfFilter === 'activa') {
                data = data.filter(a => {
                    const st = (a.estado || '').trim().toLowerCase();
                    return st === 'activa' || st === '';
                });
            } else if (nfFilter === 'free') {
                data = data.filter(a => {
                    const st = (a.estado || '').trim().toLowerCase();
                    return (st === 'activa' || st === '') && (a.perfiles || []).some(p => p && p.estado === 'libre');
                });
            } else if (nfFilter === 'full') {
                data = data.filter(a => {
                    const st = (a.estado || '').trim().toLowerCase();
                    return (st === 'activa' || st === '') && (a.perfiles || []).every(p => p && p.estado === 'ocupado');
                });
            } else if (nfFilter === 'cerrada') {
                data = data.filter(a => {
                    const st = (a.estado || '').trim().toLowerCase();
                    return st !== 'activa' && st !== '';
                });
            } else if (nfFilter === 'all') { /* shows all including cerradas */ }

            if (badge) badge.textContent = data.length + ' cuentas';

            if (!data.length) {
                empty.style.display = 'block';
                if (table) table.style.display = 'none';
                return;
            }
            empty.style.display = 'none';
            if (table) table.style.display = 'table';

            tbody.innerHTML = data.map(acc => {
                const occ = (acc.perfiles || []).filter(p => p && p.estado === 'ocupado').length;
                const pct = (occ / 5) * 100;
                const barColor = occ === 5 ? '#ef4444' : occ >= 3 ? '#f59e0b' : '#10b981';

                let estadoBadge = '<span class="nf-badge inactive-badge">Inactiva</span>';
                if ((acc.estado || '').toLowerCase() === 'cerrada') {
                    estadoBadge = '<span class="nf-badge" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3)">Cerrada</span>';
                } else if (acc.estado === 'activa' || !acc.estado) {
                    estadoBadge = '<span class="nf-badge active-badge">Activa</span>';

                    if (acc.fecha_creada) {
                        const hoy = new Date();
                        hoy.setHours(0,0,0,0);
                        const [yyyy, mm, dd] = acc.fecha_creada.split('-');
                        const fechaCreada = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
                        fechaCreada.setHours(0,0,0,0);
                        const diaCreada = parseInt(dd, 10);

                        let proxPago = new Date(hoy.getFullYear(), hoy.getMonth(), diaCreada);
                        if (proxPago < hoy) proxPago = new Date(hoy.getFullYear(), hoy.getMonth() + 1, diaCreada);
                        if (proxPago.getTime() === fechaCreada.getTime()) proxPago = new Date(proxPago.getFullYear(), proxPago.getMonth() + 1, diaCreada);

                        const diasFaltantes = Math.ceil((proxPago - hoy) / 86400000);
                        if (diasFaltantes <= 3 && diasFaltantes >= 0) {
                            estadoBadge = `<span class="nf-badge" style="background:#fef3c7;color:#d97706;border:1px solid #fcd34d;">Por Vencer</span>`;
                        }
                    }
                }

                const fecha = acc.fecha_creada
                    ? new Date(acc.fecha_creada + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—';
                return `<tr>
                    <td><strong style="font-family:monospace;font-size:0.88rem">${acc.codigo}</strong></td>
                    <td style="font-size:0.82rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${acc.correo}</td>
                    <td>${estadoBadge}</td>
                    <td>
                        <div class="nf-occ-wrap">
                            <div class="nf-occ-bar"><div class="nf-occ-fill" style="width:${pct}%;background:${barColor}"></div></div>
                            <span class="nf-occ-label">${occ}/5</span>
                        </div>
                    </td>
                    <td style="font-size:0.8rem;color:var(--text-muted)">${fecha}</td>
                    <td>
                        <button class="btn-icon view" onclick="window.nfOpenDetail('${acc.id}')" title="Ver detalle" style="width:34px;height:34px">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.574-3.007-9.964-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </button>
                    </td>
                </tr>`;
            }).join('');
        } catch (e) {
            console.error('Error in renderAccountsList:', e);
        }
    }

    // ── FILTERS ──────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.nf-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nf-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                nfFilter = btn.dataset.nffilter;
                renderAccountsList();
            });
        });

        // Netflix plan change listener for auto expiration date
        const planSelect = document.getElementById('nf-a-plan');
        if (planSelect) {
            planSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                const months = parseInt(val.replace('m', ''));
                if (!months) return;

                if (typeof currentAssignAcc !== 'undefined' && currentAssignAcc && currentAssignAcc.fecha_creada) {
                    const baseDate = new Date(currentAssignAcc.fecha_creada + 'T12:00:00');
                    const accDay = baseDate.getDate();
                    
                    const inicioStr = document.getElementById('nf-a-inicio').value;
                    const inicioDate = inicioStr ? new Date(inicioStr + 'T12:00:00') : new Date();
                    
                    let billing = new Date(inicioDate);
                    billing.setDate(accDay);
                    if (billing <= inicioDate) {
                        billing.setMonth(billing.getMonth() + 1);
                    }
                    billing.setMonth(billing.getMonth() + (months - 1));
                    billing.setDate(billing.getDate() - 1);
                    document.getElementById('nf-a-venc').value = toLocalDateStr(billing);
                } else {
                    const inicioStr = document.getElementById('nf-a-inicio').value;
                    const inicioDate = inicioStr ? new Date(inicioStr + 'T12:00:00') : new Date();
                    inicioDate.setMonth(inicioDate.getMonth() + months);
                    inicioDate.setDate(inicioDate.getDate() - 1);
                    document.getElementById('nf-a-venc').value = toLocalDateStr(inicioDate);
                }
            });
        }
    });

    // ── ADD ACCOUNT MODAL ────────────────────────────────────
    window.openNFAddModal = function () {
        document.getElementById('nf-form').reset();
        document.getElementById('nf-fecha').value = toLocalDateStr();
        document.getElementById('nf-add-modal').style.display = 'flex';
    };

    window.closeNFAddModal = function () {
        document.getElementById('nf-add-modal').style.display = 'none';
    };

    window.submitNFAccount = async function () {
        let hasError = false;
        const requiredInputs = document.querySelectorAll('#nf-form input[required], #nf-form select[required]');

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.remove('shake-error');
                void input.offsetWidth;
                input.classList.add('shake-error');
                hasError = true;
            } else {
                input.classList.remove('shake-error');
            }
        });

        if (hasError) return;

        const correo  = document.getElementById('nf-correo').value.trim();
        const password= document.getElementById('nf-password').value.trim();
        const estado  = document.getElementById('nf-estado').value;
        const fecha   = document.getElementById('nf-fecha').value;
        const obs     = document.getElementById('nf-obs').value.trim();

        const account = {
            id: Date.now().toString(),
            codigo: generateCode(),
            correo, password, estado,
            fecha_creada: fecha || toLocalDateStr(),
            observacion: obs,
            perfiles: generateProfiles(),
            createdAt: new Date().toISOString()
        };

        // ── Optimistic update: add locally BEFORE Firebase confirms ──
        nfAccounts.unshift(account);
        localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
        window.nfRenderAll();
        closeNFAddModal();
        showNFToast('✅ Cuenta ' + account.codigo + ' creada con 5 perfiles');

        try {
            if (db) {
                await db.collection('netflix_accounts').doc(account.id).set(account);
                // onSnapshot will sync & re-render; no need to do anything else
            }
        } catch (e) {
            // Rollback on error
            nfAccounts = nfAccounts.filter(a => a.id !== account.id);
            localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
            window.nfRenderAll();
            alert('Error al guardar en la nube: ' + e.message);
        }
    };

    // ── DETAIL MODAL ─────────────────────────────────────────
    window.nfOpenDetail = function (accountId) {
        currentDetailId = accountId;
        window.nfRenderDetailModal(accountId);
        document.getElementById('nf-detail-modal').style.display = 'flex';
    };

    window.nfGetCurrentDetailId = function () {
        return currentDetailId;
    };

    window.closeNFDetail = function () {
        document.getElementById('nf-detail-modal').style.display = 'none';
        currentDetailId = null;
    };

    window.nfRenderDetailModal = function renderDetailModal(accountId) {
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;

        document.getElementById('nf-detail-title').textContent = acc.codigo;
        document.getElementById('nf-detail-correo-sub').textContent = acc.correo;
        const passEl = document.getElementById('nf-detail-pass');
        passEl.textContent = '••••••••';
        passEl.dataset.pass = acc.password;
        passEl.dataset.visible = 'false';

        let estadoBadge = '<span class="nf-badge inactive-badge">Inactiva</span>';
        if ((acc.estado || '').toLowerCase() === 'cerrada') {
            estadoBadge = '<span class="nf-badge" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3)">Cerrada</span>';
        } else if (acc.estado === 'activa' || !acc.estado) {
            estadoBadge = '<span class="nf-badge active-badge">Activa</span>';
        }
        document.getElementById('nf-detail-estado').innerHTML = estadoBadge;
        document.getElementById('nf-detail-obs').textContent = acc.observacion || '—';

        // Profiles table
        const tbody = document.getElementById('nf-profiles-tbody');
        const svgTransfer = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>`;
        const svgWA  = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>`;
        const svgFree= `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>`;
        const svgPlus= `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>`;
        const svgSend= `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/></svg>`;

        tbody.innerHTML = (acc.perfiles || []).map((p, i) => {
            const occ = p.estado === 'ocupado';

            let statusBadge = '';
            if (occ) {
                statusBadge = '<div style="display:flex; flex-direction:column; gap:0.25rem; align-items:flex-start;">';
                statusBadge += '<span class="nf-badge occupied-badge">Ocupado</span>';
                const planMonths = parseInt((p.plan || '').replace('m',''));
                if (planMonths >= 2) {
                    statusBadge += `<span class="nf-badge" style="background:#fef08a;color:#854d0e;border:1px solid #facc15;font-weight:600;font-size:0.7rem;padding:0.1rem 0.4rem;">${planMonths} Meses</span>`;
                }
                statusBadge += '</div>';
            } else {
                statusBadge = '<span class="nf-badge free-badge">Libre</span>';
            }

            return `<tr>
                <td><strong style="font-family:monospace">${p.nombre}</strong></td>
                <td>${statusBadge}</td>
                <td style="font-size:0.82rem">${occ ? (p.cliente || '—') : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="font-size:0.82rem">${occ && p.whatsapp ? `<a href="https://wa.me/591${p.whatsapp}" target="_blank" style="color:var(--accent-blue);text-decoration:none">${p.whatsapp}</a>` : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td>${occ ? expireBadge(p.vencimiento) : '<span style="color:var(--text-muted);font-size:0.8rem">—</span>'}</td>
                <td>
                    <div class="actions-cell">
                    ${occ ? `
                        <button class="btn-icon send" title="Enviar datos por WhatsApp" onclick="window.nfSendAccess('${accountId}',${i})">${svgSend}</button>
                        <button class="btn-icon view" title="Ver Detalle" onclick="window.nfViewSale('${accountId}',${i})">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.574-3.007-9.964-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </button>
                        <button class="btn-icon transfer" title="Transferir perfil" onclick="window.nfOpenTransfer('${accountId}',${i})">${svgTransfer}</button>
                        <button class="btn-icon notify ${p.notifiedRenewal ? 'active' : ''}" title="${p.notifiedRenewal ? 'Aviso Enviado' : 'Avisar renovación'}" onclick="window.nfNotify('${accountId}',${i})">${svgWA}</button>
                        <button class="btn-icon free" title="Liberar perfil" onclick="window.nfFree('${accountId}',${i})">${svgFree}</button>
                    ` : `
                        <button class="btn-icon assign" title="Asignar perfil" onclick="window.nfOpenAssign('${accountId}',${i})">${svgPlus}</button>
                    `}
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // Toggle password visibility
    window.nfTogglePass = function (el) {
        const isVisible = el.dataset.visible === 'true';
        el.textContent = isVisible ? '••••••••' : el.dataset.pass;
        el.dataset.visible = isVisible ? 'false' : 'true';
        el.title = isVisible ? 'Clic para mostrar' : 'Clic para ocultar';
    };

    // Cerrar account
    window.nfCloseAccount = async function () {
        if (!currentDetailId) return;
        const acc = nfAccounts.find(a => a.id === currentDetailId);
        if (!acc) return;
        if (!confirm(`¿Marcar la cuenta ${acc.codigo} como CERRADA? Ya no contará en los activos.`)) return;
        try {
            acc.estado = 'cerrada';
            if (db) {
                await db.collection('netflix_accounts').doc(currentDetailId).update({ estado: 'cerrada' });
            } else {
                localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
            }
            window.nfRenderAll();
            closeNFDetail();
            showNFToast('🔒 Cuenta cerrada');
        } catch (e) {
            console.error(e);
            alert('Error al cerrar la cuenta');
        }
    };

    // Delete account
    window.nfDeleteAccount = async function () {
        if (!currentDetailId) return;
        const acc = nfAccounts.find(a => a.id === currentDetailId);
        if (!acc) return;
        if (!confirm(`¿Eliminar la cuenta ${acc.codigo} (${acc.correo}) y todos sus perfiles? También se eliminarán los registros de venta asociados.`)) return;
        try {
            // Delete all associated sales first
            await deleteAllSalesForAccount(acc);

            if (db) {
                await db.collection('netflix_accounts').doc(currentDetailId).delete();
            } else {
                nfAccounts = nfAccounts.filter(a => a.id !== currentDetailId);
                localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
                window.nfRenderAll();
            }
            closeNFDetail();
            showNFToast('🗑️ Cuenta eliminada y ventas asociadas borradas');
        } catch (e) { alert('Error: ' + e.message); }
    };


    // ── ASSIGN PROFILE MODAL ─────────────────────────────────
    let currentAssignAcc = null;

    window.nfOpenAssign = function (accountId, profileIndex) {
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;
        currentAssignAcc = acc;
        assignProfileIndex = profileIndex;
        const perfil = acc.perfiles[profileIndex];
        document.getElementById('nf-assign-profile-name').textContent = perfil.nombre;
        document.getElementById('nf-assign-form').reset();
        document.getElementById('nf-a-perfil-nombre').value = '';
        const today = toLocalDateStr();
        document.getElementById('nf-a-inicio').value = today;
        document.getElementById('nf-a-plan').value = '1m';
        document.getElementById('nf-a-plan').dispatchEvent(new Event('change'));
        document.getElementById('nf-assign-modal').style.display = 'flex';
    };

    window.closeNFAssign = function () {
        document.getElementById('nf-assign-modal').style.display = 'none';
    };

    window.submitNFAssign = async function () {
        let hasError = false;
        const requiredInputs = document.querySelectorAll('#nf-assign-form input[required], #nf-assign-form select[required]');

        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.remove('shake-error');
                void input.offsetWidth;
                input.classList.add('shake-error');
                hasError = true;
            } else {
                input.classList.remove('shake-error');
            }
        });

        if (hasError) return;

        const perfilNombre = document.getElementById('nf-a-perfil-nombre').value.trim();
        const cliente = document.getElementById('nf-a-cliente').value.trim();
        let wa      = document.getElementById('nf-a-wa').value.trim();
        // Remove non-numeric chars and '591' prefix if present
        wa = wa.replace(/[^0-9]/g, '');
        if (wa.startsWith('591')) wa = wa.substring(3);

        const inicio  = document.getElementById('nf-a-inicio').value;
        const venc    = document.getElementById('nf-a-venc').value;
        const plan    = document.getElementById('nf-a-plan').value;
        const obs     = document.getElementById('nf-a-obs').value.trim();

        let precio = 0;
        let profit = 0;
        if (plan === '1m') { precio = 15; profit = 7; }
        else if (plan === '2m') { precio = 29; profit = 13; }
        else if (plan === '3m') { precio = 40; profit = 16; }
        else if (plan === '4m') { precio = 55; profit = 32; }

        const acc = nfAccounts.find(a => a.id === currentDetailId);
        if (!acc) return;

        const perfiles = [...acc.perfiles];
        const newCode = 'PLX-' + Math.floor(1000 + Math.random() * 9000);
        perfiles[assignProfileIndex] = { ...perfiles[assignProfileIndex], nombre: perfilNombre, estado: 'ocupado', cliente, whatsapp: wa, inicio, vencimiento: venc, plan, obs, orderCode: newCode };

        // ── Optimistic update: apply locally BEFORE Firebase confirms ──
        acc.perfiles = perfiles;
        localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
        window.nfRenderAll();
        closeNFAssign();
        window.nfRenderDetailModal(currentDetailId);
        showNFToast(`✅ Perfil ${perfiles[assignProfileIndex].nombre} asignado a ${cliente}`);

        try {
            if (db) {
                await db.collection('netflix_accounts').doc(currentDetailId).update({ perfiles });
                // Register in main sales history
                if (precio > 0) {
                    const sale = {
                        id: Date.now().toString(),
                        orderCode: newCode,
                        date: new Date().toISOString(),
                        productName: `Netflix Perfil ${perfiles[assignProfileIndex].nombre} (${acc.codigo})${plan !== '1m' ? ' [' + plan.replace('m',' Meses') + ']' : ''}`,
                        price: precio,
                        profit: profit,
                        customerName: cliente,
                        customer: wa,
                        email: acc.correo,
                        password: acc.password,
                        expireDate: new Date(venc).toISOString()
                    };
                    await db.collection('plixora_sales').doc(sale.id).set(sale);
                }
            }
        } catch (e) {
            // Rollback on error
            acc.perfiles[assignProfileIndex] = { ...acc.perfiles[assignProfileIndex], estado: 'libre', cliente: '', whatsapp: '', inicio: '', vencimiento: '', plan: '', obs: '' };
            localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
            window.nfRenderAll();
            alert('Error al guardar en la nube: ' + e.message);
        }
    };

    // ── TRANSFER PROFILE ─────────────────────────────────────
    window.nfOpenTransfer = function (accountId, idx) {
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;
        const p = acc.perfiles[idx];

        transferSourceAccountId = accountId;
        transferSourceProfileIdx = idx;

        // Show source info
        document.getElementById('nf-transfer-source').textContent =
            `${p.cliente} — ${p.nombre.toUpperCase()} — ${p.whatsapp}`;

        // Populate destination accounts (active with free profiles, excluding current)
        const destSelect = document.getElementById('nf-transfer-dest');
        destSelect.innerHTML = '<option value="" disabled selected>Selecciona cuenta destino...</option>';

        nfAccounts
            .filter(a => a.id !== accountId && (a.estado || '').toLowerCase() !== 'cerrada')
            .filter(a => (a.perfiles || []).some(pr => pr && pr.estado === 'libre'))
            .forEach(a => {
                const freeCount = (a.perfiles || []).filter(pr => pr && pr.estado === 'libre').length;
                const opt = document.createElement('option');
                opt.value = a.id;
                opt.textContent = `${a.codigo} — ${a.correo} (${freeCount} perfil${freeCount > 1 ? 'es' : ''} libre${freeCount > 1 ? 's' : ''})`;
                destSelect.appendChild(opt);
            });

        // Reset plan
        document.getElementById('nf-transfer-plan').value = '';

        document.getElementById('nf-transfer-modal').style.display = 'flex';
    };

    window.closeNFTransfer = function () {
        document.getElementById('nf-transfer-modal').style.display = 'none';
        transferSourceAccountId = null;
        transferSourceProfileIdx = null;
    };

    window.confirmNFTransfer = async function () {
        const destAccountId = document.getElementById('nf-transfer-dest').value;
        const plan = document.getElementById('nf-transfer-plan').value;

        if (!destAccountId) { showNFToast('❌ Selecciona una cuenta destino'); return; }
        if (!plan) { showNFToast('❌ Selecciona la duración del plan'); return; }

        const srcAcc = nfAccounts.find(a => a.id === transferSourceAccountId);
        const destAcc = nfAccounts.find(a => a.id === destAccountId);
        if (!srcAcc || !destAcc) return;

        const srcProfile = srcAcc.perfiles[transferSourceProfileIdx];

        // Find first free profile in destination
        const destIdx = destAcc.perfiles.findIndex(p => p && p.estado === 'libre');
        if (destIdx === -1) { showNFToast('❌ No hay perfiles libres en esa cuenta'); return; }

        // Calculate dates
        const today = new Date();
        const inicio = toLocalDateStr(today);
        const vencDate = new Date(today);
        vencDate.setHours(12, 0, 0, 0);
        const months = parseInt(plan.replace('m', ''));
        vencDate.setMonth(vencDate.getMonth() + months);
        vencDate.setDate(vencDate.getDate() - 1); // Aviso 1 día antes del corte
        const venc = toLocalDateStr(vencDate);

        // Price/profit
        let precio = 0, profit = 0;
        if (plan === '1m') { precio = 15; profit = 7; }
        else if (plan === '2m') { precio = 29; profit = 13; }
        else if (plan === '3m') { precio = 40; profit = 16; }
        else if (plan === '4m') { precio = 55; profit = 32; }

        const newCode = 'PLX-' + Math.floor(1000 + Math.random() * 9000);

        // Update destination profile with transferred data
        const destPerfiles = [...destAcc.perfiles];
        destPerfiles[destIdx] = {
            ...destPerfiles[destIdx],
            nombre: srcProfile.nombre,
            estado: 'ocupado',
            cliente: srcProfile.cliente,
            whatsapp: srcProfile.whatsapp,
            inicio: inicio,
            vencimiento: venc,
            plan: plan,
            obs: `Transferido desde ${srcAcc.codigo}`,
            orderCode: newCode
        };

        // Optimistic update
        destAcc.perfiles = destPerfiles;
        localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
        window.nfRenderAll();
        closeNFTransfer();

        // Re-render detail modal if open
        if (currentDetailId && document.getElementById('nf-detail-modal').style.display !== 'none') {
            window.nfRenderDetailModal(currentDetailId);
        }

        showNFToast(`✅ ${srcProfile.cliente} transferido a ${destAcc.codigo} — Perfil ${destPerfiles[destIdx].nombre}`);

        try {
            if (db) {
                await db.collection('netflix_accounts').doc(destAccountId).update({ perfiles: destPerfiles });
                // Register sale
                if (precio > 0) {
                    const sale = {
                        id: Date.now().toString(),
                        orderCode: newCode,
                        date: new Date().toISOString(),
                        productName: `Netflix Perfil ${destPerfiles[destIdx].nombre} (${destAcc.codigo})${plan !== '1m' ? ' [' + plan.replace('m', ' Meses') + ']' : ''}`,
                        price: precio,
                        profit: profit,
                        customerName: srcProfile.cliente,
                        customer: srcProfile.whatsapp,
                        email: destAcc.correo,
                        password: destAcc.password,
                        expireDate: new Date(venc).toISOString()
                    };
                    await db.collection('plixora_sales').doc(sale.id).set(sale);
                }
            }
        } catch (e) {
            // Rollback on error
            destAcc.perfiles[destIdx] = { nombre: destPerfiles[destIdx].nombre, estado: 'libre', cliente: '', whatsapp: '', inicio: '', vencimiento: '', plan: '', obs: '' };
            localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
            window.nfRenderAll();
            alert('Error al transferir: ' + e.message);
        }
    };

    // ── SEND ACCESS VIA WHATSAPP BOT ─────────────────────────
    let pendingWAPayload = null;

    window.closeNFPreview = function() {
        document.getElementById('nf-preview-modal').style.display = 'none';
        pendingWAPayload = null;
    };

    window.nfSendAccess = function (accountId, idx) {
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;
        const p = acc.perfiles[idx];
        if (!p.whatsapp) { showNFToast('❌ Sin número de WhatsApp'); return; }

        // Capturar valores como strings primitivos para evitar que una actualización de Firebase cambie la referencia
        const phone = String(p.whatsapp);
        const clienteName = String(p.cliente || '');
        const msg1 = `*PLIXORA.BO* | 🎬 *Netflix Premium*\n` +
                     (p.orderCode ? `🎫 *Pedido:* ${p.orderCode}\n` : '') +
                     `\n` +
                     `📧 *Correo:* ${acc.correo}\n` +
                     `🔑 *Contraseña:* ${acc.password}\n` +
                     `📺 *Perfil:* *${p.nombre.toUpperCase()}*\n\n` +
                     `⚠️ *(LA CONTRASEÑA INCLUYE MÁS CON EL * )*\n` +
                     `*POR FAVOR INGRESAR BIEN LA CONTRASEÑA*\n\n` +
                     `🔒 _Puedes crear un PIN en tu perfil si deseas mayor privacidad._\n\n` +
                     `🚫 _Está prohibido cambiar el nombre del perfil. Caso contrario, se dará de baja automáticamente el acceso._`;

        const msg2 = `📌 *Momento de ingresar:*\n` +
                     `Dar clic en *"OBTENER AYUDA"* y luego *"ACCEDER CON CONTRASEÑA"*`;

        pendingWAPayload = { phone, clienteName, msg1, msg2 };

        document.getElementById('nf-prev-cliente').textContent = `${clienteName} (${phone})`;
        document.getElementById('nf-prev-msg1').textContent = msg1;
        document.getElementById('nf-prev-msg2').textContent = msg2;

        document.getElementById('nf-preview-modal').style.display = 'flex';
    };

    window.confirmNFSend = async function() {
        if (!pendingWAPayload) return;
        const { phone, clienteName, msg1, msg2 } = pendingWAPayload;
        closeNFPreview();

        showNFToast('📤 Enviando datos por WhatsApp...');

        try {
            // Enviar mensaje 1 - datos de la cuenta
            const resp1 = await fetch('https://plixora-bot.duckdns.org/api/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone, message: msg1 })
            });
            const data1 = await resp1.json();
            if (!data1.success) throw new Error(data1.error || 'Error enviando mensaje 1');

            // Pequeña pausa para que lleguen en orden
            await new Promise(r => setTimeout(r, 1500));

            // Enviar mensaje 2 - instrucciones con imagen (usa el MISMO phone capturado)
            const resp2 = await fetch('https://plixora-bot.duckdns.org/api/send-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone,
                    imageUrl: window.location.origin + '/netflix-instrucciones.png',
                    caption: msg2
                })
            });
            const data2 = await resp2.json();
            if (!data2.success) throw new Error(data2.error || 'Error enviando imagen');

            showNFToast('✅ Datos enviados por WhatsApp a ' + clienteName);
        } catch (error) {
            console.error('Error enviando por WhatsApp:', error);
            showNFToast('❌ Error: ' + error.message);
        }
    };

    let pendingNotifyPayload = null;

    window.closeNFNotify = function() {
        document.getElementById('nf-notify-modal').style.display = 'none';
        pendingNotifyPayload = null;
    };

    window.nfNotify = function (accountId, idx) {
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;
        const p = acc.perfiles[idx];
        if (!p.whatsapp) { showNFToast('❌ Sin número de WhatsApp'); return; }

        const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
        let vencLabel = 'próximamente';
        if (p.vencimiento) {
            const d = new Date(p.vencimiento + 'T12:00:00');
            vencLabel = `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
        }

        const codeDisplay = p.orderCode ? ` / ${p.orderCode}` : '';
        const msg = `🎟️ *TICKET DE VENCIMIENTO | PLIXORA.BO* 🎟️\n\n` +
                    `👤 *Cliente:* ${p.cliente || ''}\n` +
                    `📺 *Servicio:* Netflix Perfil ${p.nombre.toUpperCase()}${codeDisplay}\n` +
                    `⏳ *Válido hasta:* ${vencLabel}\n\n` +
                    `Tus credenciales de ingreso:\n` +
                    `• Correo: ${acc.correo}\n` +
                    `• Clave: ${acc.password}\n\n` +
                    `¿Deseas prolongar tu suscripción? \n` +
                    `1️⃣ Responde *RENOVAR*\n` +
                    `2️⃣ Responde *NO RENOVAR*\n\n` +
                    `¡Gracias por elegirnos! 🍿✨`;

        pendingNotifyPayload = { accountId, idx, phone: p.whatsapp, cliente: p.cliente };

        document.getElementById('nf-notify-cliente').textContent = `${p.cliente} (${p.whatsapp})`;
        document.getElementById('nf-notify-msg').value = msg;

        document.getElementById('nf-notify-modal').style.display = 'flex';
    };

    window.confirmNFNotifySend = async function() {
        if (!pendingNotifyPayload) return;
        const { phone, cliente } = pendingNotifyPayload;
        const msg = document.getElementById('nf-notify-msg').value.trim();

        if (!msg) { showNFToast('❌ El mensaje no puede estar vacío'); return; }

        closeNFNotify();
        showNFToast('📤 Enviando aviso por WhatsApp...');

        try {
            const resp = await fetch('https://plixora-bot.duckdns.org/api/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone, message: msg })
            });
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || 'Error enviando mensaje');

            const acc = nfAccounts.find(a => a.id === pendingNotifyPayload.accountId);
            if (acc && acc.perfiles[pendingNotifyPayload.idx]) {
                acc.perfiles[pendingNotifyPayload.idx].notifiedRenewal = true;
                const perfiles = [...acc.perfiles];
                localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
                try {
                    if (db) {
                        await db.collection('netflix_accounts').doc(acc.id).update({ perfiles });
                    }
                } catch(e) { console.error('Error guardando notifiedRenewal:', e); }
                // Re-render the detail modal immediately so the button turns green
                window.nfRenderAll();
                if (currentDetailId && document.getElementById('nf-detail-modal').style.display !== 'none') {
                    window.nfRenderDetailModal(currentDetailId);
                }
            }

            showNFToast('✅ Aviso enviado por WhatsApp a ' + cliente);
        } catch (error) {
            console.error('Error enviando aviso por WhatsApp:', error);
            showNFToast('❌ Error: ' + error.message);
        }
    };

    window.nfViewSale = function (accountId, idx) {
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;
        const p = acc.perfiles[idx];

        const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
        const fmtDate = (d) => {
            if (!d) return '—';
            const dt = new Date(d + 'T12:00:00');
            return `${dt.getDate()} de ${meses[dt.getMonth()]} de ${dt.getFullYear()}`;
        };

        const row = (label, value) => `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:0.5rem">
            <span style="color:var(--text-muted);font-size:0.8rem;font-weight:600">${label}</span>
            <span style="font-size:0.88rem;font-weight:600;color:var(--text-main);text-align:right;max-width:60%;word-break:break-all">${value}</span>
        </div>`;

        const body = document.getElementById('nf-client-detail-body');
        body.innerHTML =
            row('👤 Cliente', p.cliente || '—') +
            row('📺 Perfil', p.nombre) +
            row('📱 WhatsApp', p.whatsapp ? `<a href="https://wa.me/591${p.whatsapp}" target="_blank" style="color:var(--accent-blue);text-decoration:none">${p.whatsapp}</a>` : '—') +
            row('📧 Correo', acc.correo) +
            row('🔑 Contraseña', acc.password) +
            row('📅 Inicio', fmtDate(p.inicio)) +
            row('📅 Vencimiento', fmtDate(p.vencimiento)) +
            row('📋 Plan', {'1m':'1 Mes','2m':'2 Meses','3m':'3 Meses','4m':'4 Meses'}[p.plan] || p.plan || '—') +
            row('💬 Observación', p.obs || '—');

        document.getElementById('nf-client-detail-modal').style.display = 'flex';
    };

    window.nfFree = async function (accountId, idx) {
        if (!confirm('¿Liberar este perfil? Se borrarán los datos del cliente asignado y su registro de venta (si existe).')) return;
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;
        const perfiles = [...acc.perfiles];
        const p = perfiles[idx];

        // Eliminar del historial de ventas usando orderCode
        if (p.orderCode) {
            await deleteSaleByOrderCode(p.orderCode);
        }

        perfiles[idx] = { nombre: perfiles[idx].nombre, estado: 'libre', cliente: '', whatsapp: '', inicio: '', vencimiento: '', plan: '', obs: '' };
        try {
            if (db) {
                await db.collection('netflix_accounts').doc(accountId).update({ perfiles });
            } else {
                acc.perfiles = perfiles;
                localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
                window.nfRenderAll();
            }
            window.nfRenderDetailModal(accountId);
            showNFToast(`🔓 Perfil ${perfiles[idx].nombre} liberado y venta eliminada`);
        } catch (e) { alert('Error: ' + e.message); }
    };

    // ── TOAST ────────────────────────────────────────────────
    function showNFToast(msg) {
        const t = document.getElementById('toast');
        if (t) { t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3500); }
    }

    // Expose sync function for app.js to call
    window.nfSyncProfileEdit = function(accCodigo, profileIndex, newName, newPhone) {
        try {
            const acc = nfAccounts.find(a => a.codigo === accCodigo);
            if (!acc) return;
            const perfil = (acc.perfiles || [])[profileIndex];
            if (!perfil) return;
            if (newName) perfil.cliente = newName;
            if (newPhone) perfil.whatsapp = newPhone;
            saveToFirebase();
        } catch(e) {
            console.error('nfSyncProfileEdit error:', e);
        }
    };

})();
