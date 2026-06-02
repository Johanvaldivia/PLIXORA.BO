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
        return [1, 2, 3, 4, 5].map(n => ({
            nombre: prefix + n, estado: 'libre',
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

    // ── RENDER ALL ───────────────────────────────────────────
    window.nfRenderAll = function renderAll() {
        renderStats();
        renderAccountsList();
    }

    // ── STATS ────────────────────────────────────────────────
    function renderStats() {
        try {
            let occupied = 0, expiring = 0;
            const activeAccounts = nfAccounts.filter(a => a.estado !== 'cerrada');
            activeAccounts.forEach(a => {
                (a.perfiles || []).forEach(p => {
                    if (p && p.estado === 'ocupado') {
                        occupied++;
                        const d = daysTo(p.vencimiento);
                        if (d !== null && d >= 0 && d <= 5) expiring++;
                    }
                });
            });
            const total = activeAccounts.length * 5;
            setText('nf-stat-accounts', activeAccounts.length);
            setText('nf-stat-total', total);
            setText('nf-stat-occupied', occupied);
            setText('nf-stat-free', total - occupied);
            setText('nf-stat-expiring', expiring);
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

            let data = [...nfAccounts].filter(a => a.estado !== 'cerrada');
            if (nfFilter === 'activa') data = data.filter(a => a.estado === 'activa' || !a.estado);
            else if (nfFilter === 'free') data = data.filter(a => (a.perfiles || []).some(p => p && p.estado === 'libre'));
            else if (nfFilter === 'full') data = data.filter(a => (a.perfiles || []).every(p => p && p.estado === 'ocupado'));

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
                if (acc.estado === 'activa' || !acc.estado) {
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
                        <button class="btn-icon" onclick="window.nfOpenDetail('${acc.id}')" title="Ver detalle" style="width:34px;height:34px">
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
                const inicioStr = document.getElementById('nf-a-inicio').value;
                const inicioDate = inicioStr ? new Date(inicioStr) : new Date();
                inicioDate.setHours(12,0,0,0); // Avoid timezone issues
                if (val === '1m') {
                    inicioDate.setMonth(inicioDate.getMonth() + 1);
                } else if (val === '2m') {
                    inicioDate.setMonth(inicioDate.getMonth() + 2);
                }
                document.getElementById('nf-a-venc').value = inicioDate.toISOString().slice(0, 10);
            });
        }
    });

    // ── ADD ACCOUNT MODAL ────────────────────────────────────
    window.openNFAddModal = function () {
        document.getElementById('nf-form').reset();
        document.getElementById('nf-fecha').value = new Date().toISOString().slice(0, 10);
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
        const prefijo = document.getElementById('nf-prefijo').value;
        const fecha   = document.getElementById('nf-fecha').value;
        const obs     = document.getElementById('nf-obs').value.trim();

        const account = {
            id: Date.now().toString(),
            codigo: generateCode(),
            correo, password, estado, prefijo,
            fecha_creada: fecha || new Date().toISOString().slice(0, 10),
            observacion: obs,
            perfiles: generateProfiles(prefijo),
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

        document.getElementById('nf-detail-estado').innerHTML = acc.estado === 'activa'
            ? '<span class="nf-badge active-badge">Activa</span>'
            : '<span class="nf-badge inactive-badge">Inactiva</span>';
        document.getElementById('nf-detail-obs').textContent = acc.observacion || '—';

        // Profiles table
        const tbody = document.getElementById('nf-profiles-tbody');
        const svgCopy = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/></svg>`;
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
                if (p.plan === '2m') {
                    statusBadge += '<span class="nf-badge" style="background:#fef08a;color:#854d0e;border:1px solid #facc15;font-weight:600;font-size:0.7rem;padding:0.1rem 0.4rem;">2 Meses</span>';
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
                        <button class="btn-icon send" style="color:#25d366;border-color:rgba(37,211,102,0.3)" title="Enviar datos por WhatsApp" onclick="window.nfSendAccess('${accountId}',${i})">${svgSend}</button>
                        <button class="btn-icon" style="color:#0ea5e9;border-color:rgba(14,165,233,0.3)" title="Ver Detalle" onclick="window.nfViewSale('${accountId}',${i})">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.574-3.007-9.964-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </button>
                        <button class="btn-icon copy"   title="Copiar acceso"     onclick="window.nfCopyAccess('${accountId}',${i})">${svgCopy}</button>
                        <button class="btn-icon notify" title="${p.notifiedRenewal ? 'Aviso Enviado' : 'Avisar renovación'}" onclick="window.nfNotify('${accountId}',${i})" style="color:${p.notifiedRenewal ? '#fff' : ''};background:${p.notifiedRenewal ? '#10b981' : ''};border-color:${p.notifiedRenewal ? '#10b981' : ''};">${svgWA}</button>
                        <button class="btn-icon delete" title="Liberar perfil"    onclick="window.nfFree('${accountId}',${i})">${svgFree}</button>
                    ` : `
                        <button class="btn-icon" style="color:#10b981;border-color:rgba(16,185,129,0.3)" title="Asignar perfil" onclick="window.nfOpenAssign('${accountId}',${i})">${svgPlus}</button>
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

    // Delete account
    window.nfDeleteAccount = async function () {
        if (!currentDetailId) return;
        const acc = nfAccounts.find(a => a.id === currentDetailId);
        if (!acc) return;
        if (!confirm(`¿Eliminar la cuenta ${acc.codigo} (${acc.correo}) y todos sus perfiles?`)) return;
        try {
            if (db) {
                await db.collection('netflix_accounts').doc(currentDetailId).delete();
            } else {
                nfAccounts = nfAccounts.filter(a => a.id !== currentDetailId);
                localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
                window.nfRenderAll();
            }
            closeNFDetail();
            showNFToast('🗑️ Cuenta eliminada');
        } catch (e) { alert('Error: ' + e.message); }
    };


    // ── ASSIGN PROFILE MODAL ─────────────────────────────────
    window.nfOpenAssign = function (accountId, profileIndex) {
        currentDetailId = accountId;
        assignProfileIndex = profileIndex;
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;
        const perfil = acc.perfiles[profileIndex];
        document.getElementById('nf-assign-profile-name').textContent = perfil.nombre;
        document.getElementById('nf-assign-form').reset();
        document.getElementById('nf-a-perfil-nombre').value = '';
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('nf-a-inicio').value = today;
        // Default vencimiento = 1 mes
        const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1);
        document.getElementById('nf-a-venc').value = nextMonth.toISOString().slice(0, 10);
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
        if (plan === '1m') {
            precio = 15;
            profit = 7;
        } else if (plan === '2m') {
            precio = 29;
            profit = 13;
        }

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
                        productName: `Netflix Perfil ${perfiles[assignProfileIndex].nombre} (${acc.codigo})${plan === '2m' ? ' [2 Meses]' : ''}`,
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

    // ── PROFILE ACTIONS ──────────────────────────────────────
    window.nfCopyAccess = function (accountId, idx) {
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;
        const p = acc.perfiles[idx];
        const codeDisplay = p.orderCode ? ` / ${p.orderCode}` : '';
        const text = `Netflix Perfil ${p.nombre}${codeDisplay}\n\nCorreo: ${acc.correo}\nContraseña: ${acc.password}\n\n(LA CONTRASEÑA INCLUYE MÁS CON EL * )\nPOR FAVOR INGRESAR BIEN LA CONTRASEÑA\n\n(Puedes crear un PIN en tu perfil si deseas mayor privacidad.)\n\n(Está prohibido cambiar el nombre del perfil. Caso contrario, se dará de baja automáticamente el acceso.)\n\nPLIXORA.BO\n----------------------------`;
        navigator.clipboard.writeText(text).then(() => showNFToast('📋 Acceso copiado'));
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
        const codeDisplay = p.orderCode ? ` / ${p.orderCode}` : '';

        const msg1 = `*PLIXORA.BO* | 🎬 *Netflix Premium*\n\n` +
                     `📧 *Correo:* ${acc.correo}\n` +
                     `🔑 *Contraseña:* ${acc.password}\n` +
                     `📺 *Perfil:* ${p.nombre}${codeDisplay}\n\n` +
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
        const msg = `\u26A0\uFE0F *AVISO DE VENCIMIENTO \u2013 PLIXORA.BO* \u26A0\uFE0F\n\n` +
                    `Hola ${p.cliente || ''} \uD83D\uDC4B\n` +
                    `Tu suscripción de *Netflix Perfil ${p.nombre}${codeDisplay}* est\u00E1 pr\u00F3xima a vencer.\n\n` +
                    `\uD83D\uDCE7 *Correo:* ${acc.correo}\n` +
                    `\uD83D\uDD11 *Contrase\u00F1a:* ${acc.password}\n` +
                    `\uD83D\uDCC5 *Vence el:* ${vencLabel}\n\n` +
                    `Para continuar, responde con una opci\u00F3n:\n\n` +
                    `\u2705 *RENOVAR*\n` +
                    `\u274C *NO RENOVAR*\n\n` +
                    `Quedamos atentos a tu respuesta \uD83D\uDE0A\n` +
                    `*PLIXORA.BO*`;

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
                saveNFToStorage();
                renderNetflixTable();
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
            row('📋 Plan', p.plan === '2m' ? '2 Meses' : p.plan === '1m' ? '1 Mes' : (p.plan || '—')) +
            row('💬 Observación', p.obs || '—');

        document.getElementById('nf-client-detail-modal').style.display = 'flex';
    };

    window.nfFree = async function (accountId, idx) {
        if (!confirm('¿Liberar este perfil? Se borrarán los datos del cliente asignado y su registro de venta (si existe).')) return;
        const acc = nfAccounts.find(a => a.id === accountId);
        if (!acc) return;
        const perfiles = [...acc.perfiles];
        const p = perfiles[idx];

        // Eliminar del historial de ventas automáticamente
        if (typeof sales !== 'undefined' && typeof window.removeSale === 'function') {
            const sale = sales.find(s => s.productName && s.productName.includes(`Perfil ${p.nombre}`) && s.productName.includes(acc.codigo) && s.customer === p.whatsapp);
            if (sale) {
                try {
                    await window.removeSale(sale.id);
                } catch(e) { console.error('Error al eliminar venta asociada', e); }
            }
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

})();
