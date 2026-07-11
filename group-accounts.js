// =============================================================
// PLIXORA.BO — Módulo de Cuentas Grupales v2
// Gestión de cuentas compartidas con reemplazo y notificación WA
// =============================================================

(function () {
    'use strict';

    let gaDB = null;
    let gaAccounts = [];
    let gaUnsubscribe = null;

    // Abreviaciones de meses
    const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // ── INIT ──────────────────────────────────────────────────────
    function init() {
        // UI initialization
        const addBtn = document.getElementById('ga-btn-add-account');
        if (addBtn) addBtn.addEventListener('click', openAddAccountModal);
        window.renderGroupAccounts = renderAll;
    }

    // Called by app.js when Firebase is ready
    window.gaSetDb = function(firebaseDb) {
        gaDB = firebaseDb;
        listenAccounts();
    };

    // ── FIRESTORE LISTENER ────────────────────────────────────────
    function listenAccounts() {
        if (!gaDB) return;
        if (gaUnsubscribe) gaUnsubscribe();
        gaUnsubscribe = gaDB.collection('group_accounts').orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                gaAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderAll();
            }, err => {
                console.error('GA Firestore error:', err);
            });
    }

    // ── FORMAT EXPIRATION DATE ─────────────────────────────────────
    function formatExpDate(isoDate) {
        if (!isoDate) return '—';
        const created = new Date(isoDate);
        const exp = new Date(created.getFullYear(), created.getMonth() + 1, created.getDate());
        return `${exp.getDate()}/${MONTH_NAMES[exp.getMonth()]}`;
    }

    function isExpired(isoDate) {
        if (!isoDate) return false;
        const created = new Date(isoDate);
        const exp = new Date(created.getFullYear(), created.getMonth() + 1, created.getDate());
        return new Date() > exp;
    }

    // ── RENDER ALL ────────────────────────────────────────────────
    function renderAll() {
        const grid = document.getElementById('ga-accounts-grid');
        const empty = document.getElementById('ga-empty-state');
        if (!grid) return;

        grid.innerHTML = '';

        if (gaAccounts.length === 0) {
            if (empty) empty.style.display = 'flex';
            return;
        }
        if (empty) empty.style.display = 'none';

        gaAccounts.forEach(acc => {
            const members = acc.members || [];
            const accountCost = parseFloat(acc.accountCost) || 0;
            const totalRevenue = members.reduce((s, m) => s + (parseFloat(m.price) || 0), 0);
            const profit = totalRevenue - accountCost;
            const slotsUsed = members.length;
            const maxSlots = acc.maxSlots || 5;
            const expDate = formatExpDate(acc.createdAt);
            const expired = isExpired(acc.createdAt);

            const card = document.createElement('div');
            card.className = 'ga-card';
            card.innerHTML = `
                <div class="ga-card-header">
                    <div class="ga-card-title">
                        <span class="ga-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg></span>
                        <div>
                            <h3>${acc.serviceName}</h3>
                            <p class="ga-card-subtitle">${slotsUsed}/${maxSlots} perfiles ocupados</p>
                        </div>
                    </div>
                    <div class="ga-header-badges">
                        <div class="ga-card-status ${slotsUsed >= maxSlots ? 'ga-full' : 'ga-available'}">
                            ${slotsUsed >= maxSlots ? 'Llena' : 'Disponible'}
                        </div>
                        <div class="ga-card-expiry ${expired ? 'ga-expired' : ''}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px; vertical-align:text-top;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Vence: ${expDate}
                        </div>
                    </div>
                </div>
                <div class="ga-card-creds">
                    <div class="ga-cred-row">
                        <span class="ga-cred-label"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Correo:</span>
                        <span class="ga-cred-value">${acc.email || '—'}</span>
                    </div>
                    <div class="ga-cred-row">
                        <span class="ga-cred-label"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> Contraseña:</span>
                        <span class="ga-cred-value ga-password" data-visible="false" onclick="this.dataset.visible = this.dataset.visible === 'true' ? 'false' : 'true'; this.textContent = this.dataset.visible === 'true' ? '${acc.password || '—'}' : '••••••••'">••••••••</span>
                    </div>
                </div>
                <div class="ga-card-stats">
                    <div class="ga-stat">
                        <span class="ga-stat-label">Invertido</span>
                        <span class="ga-stat-value ga-cost">${accountCost.toFixed(2)} Bs</span>
                    </div>
                    <div class="ga-stat">
                        <span class="ga-stat-label">Recaudado</span>
                        <span class="ga-stat-value ga-revenue">${totalRevenue.toFixed(2)} Bs</span>
                    </div>
                    <div class="ga-stat">
                        <span class="ga-stat-label">Ganancia</span>
                        <span class="ga-stat-value ${profit >= 0 ? 'ga-profit-pos' : 'ga-profit-neg'}">${profit >= 0 ? '+' : ''}${profit.toFixed(2)} Bs</span>
                    </div>
                </div>
                <div class="ga-card-members-title" style="display:flex;align-items:center;gap:0.4rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>Miembros (${slotsUsed})</span>
                </div>
                <div class="ga-members-list" id="ga-members-${acc.id}">
                    ${members.length === 0 ? '<p class="ga-no-members">Sin miembros aún</p>' :
                        members.map((m, i) => `
                            <div class="ga-member-row">
                                <div class="ga-member-info">
                                    <span class="ga-member-badge">${i + 1}</span>
                                    <div>
                                        <span class="ga-member-name">${m.name}</span>
                                        <span class="ga-member-phone"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> ${m.phone}</span>
                                    </div>
                                </div>
                                <div class="ga-member-prices">
                                    <span class="ga-member-sale">Venta: ${(parseFloat(m.price) || 0).toFixed(2)} Bs</span>
                                </div>
                                <button class="ga-btn-remove-member" onclick="window.gaRemoveMember('${acc.id}', ${i})" title="Eliminar miembro">✕</button>
                            </div>
                        `).join('')
                    }
                </div>
                <div class="ga-card-actions">
                    <button class="ga-btn ga-btn-add-member" onclick="window.gaOpenAddMember('${acc.id}', '${acc.serviceName}', ${maxSlots}, ${slotsUsed})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                        Agregar Cliente
                    </button>
                    <button class="ga-btn ga-btn-replace" onclick="window.gaOpenReplace('${acc.id}', '${acc.serviceName}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Reemplazar Cuenta
                    </button>
                    <button class="ga-btn ga-btn-delete" onclick="window.gaDeleteAccount('${acc.id}', '${acc.serviceName}')" style="padding:0.55rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // ── MODAL: ADD ACCOUNT ────────────────────────────────────────
    function openAddAccountModal() {
        document.getElementById('ga-add-account-modal').style.display = 'flex';
        document.getElementById('ga-new-service-name').value = '';
        document.getElementById('ga-new-email').value = '';
        document.getElementById('ga-new-password').value = '';
        document.getElementById('ga-new-max-slots').value = '5';
        document.getElementById('ga-new-account-cost').value = '';
    }

    window.gaCloseAddAccountModal = function () {
        document.getElementById('ga-add-account-modal').style.display = 'none';
    };

    window.gaSubmitNewAccount = async function () {
        const serviceName = document.getElementById('ga-new-service-name').value.trim();
        const email = document.getElementById('ga-new-email').value.trim();
        const password = document.getElementById('ga-new-password').value.trim();
        const maxSlots = parseInt(document.getElementById('ga-new-max-slots').value) || 5;
        const accountCost = document.getElementById('ga-new-account-cost').value.trim();

        if (!serviceName || !email || !password || !accountCost) {
            showToast('❌ Completa todos los campos obligatorios.');
            return;
        }

        try {
            await gaDB.collection('group_accounts').add({
                serviceName,
                email,
                password,
                maxSlots,
                accountCost: parseFloat(accountCost),
                members: [],
                createdAt: new Date().toISOString()
            });
            showToast('✅ Cuenta grupal creada exitosamente.');
            window.gaCloseAddAccountModal();
        } catch (e) {
            showToast('❌ Error al crear: ' + e.message);
        }
    };

    // ── MODAL: ADD MEMBER ─────────────────────────────────────────
    window.gaOpenAddMember = function (accountId, serviceName, maxSlots, currentSlots) {
        if (currentSlots >= maxSlots) {
            showToast('⚠️ Esta cuenta ya está llena (' + maxSlots + ' perfiles).');
            return;
        }
        document.getElementById('ga-add-member-modal').style.display = 'flex';
        document.getElementById('ga-member-account-id').value = accountId;
        document.getElementById('ga-member-service-label').textContent = serviceName;
        document.getElementById('ga-member-name').value = '';
        document.getElementById('ga-member-phone').value = '';
        document.getElementById('ga-member-price').value = '';
    };

    window.gaCloseAddMemberModal = function () {
        document.getElementById('ga-add-member-modal').style.display = 'none';
    };

    // Core function: save member + optionally send WhatsApp
    async function saveNewMember(sendWhatsApp) {
        const accountId = document.getElementById('ga-member-account-id').value;
        const name = document.getElementById('ga-member-name').value.trim();
        let phone = document.getElementById('ga-member-phone').value.trim();
        const price = document.getElementById('ga-member-price').value.trim();

        // Standardize phone number using app.js function if available
        if (typeof window.sanitizeBoliviaPhone === 'function') {
            phone = window.sanitizeBoliviaPhone(phone);
        }

        if (!name || !phone || !price) {
            showToast('❌ Completa todos los campos.');
            return;
        }

        // Disable buttons to prevent double-click
        const btnSave = document.getElementById('ga-btn-save-only');
        const btnSend = document.getElementById('ga-btn-save-send');
        if (btnSave) btnSave.disabled = true;
        if (btnSend) btnSend.disabled = true;

        try {
            const account = gaAccounts.find(a => a.id === accountId);
            if (!account) { showToast('❌ Cuenta no encontrada.'); return; }

            // Use spread to avoid mutating cached data
            const members = [...(account.members || [])];
            const profileNum = members.length + 1;
            const salePrice = parseFloat(price);

            members.push({
                name,
                phone,
                price: salePrice,
                addedAt: new Date().toISOString()
            });

            await gaDB.collection('group_accounts').doc(accountId).update({ members });

            // Register sale in main sales history (FIXED: correct collection + ID)
            try {
                const saleId = Date.now().toString();
                const saleData = {
                    id: saleId,
                    productName: account.serviceName + ' (Perfil ' + profileNum + ')',
                    price: salePrice,
                    profit: salePrice - ((parseFloat(account.accountCost) || 0) / (account.maxSlots || 5)),
                    customer: phone,
                    customerName: name,
                    date: new Date().toISOString(),
                    orderCode: 'GA-' + accountId.substring(0, 6).toUpperCase() + '-' + profileNum,
                    expireDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()).toISOString(),
                    source: 'group-account'
                };
                await gaDB.collection('plixora_sales').doc(saleId).set(saleData);
            } catch (saleErr) {
                console.error('Error registering sale:', saleErr);
            }

            if (sendWhatsApp) {
                // Build delivery message based on service type
                const svcLower = (account.serviceName || '').toLowerCase();
                let msg = '';

                if (svcLower.includes('disney') || svcLower.includes('hbo')) {
                    // Disney + HBO Max combo message
                    msg = `🎬 *PLIXORA.BO — Cuenta de Streaming*\n\n` +
                          `Hola *${name}* 👋\n\n` +
                          `Tu cuenta de *${account.serviceName}* ya está lista. Aquí están tus datos de acceso:\n\n` +
                          `📧 *Correo:* ${account.email}\n` +
                          `🔑 *Contraseña:* ${account.password}\n` +
                          `👤 *Perfil:* Perfil ${profileNum}\n\n` +
                          `📌 *NOTA:* Estos mismos datos te sirven para iniciar sesión tanto en *Disney Plus* como en *HBO Max*.\n\n` +
                          `⚠️ *Importante:*\n` +
                          `• No cambies la contraseña ni el correo.\n` +
                          `• No compartas estos datos con nadie.\n` +
                          `• No elimines ni modifiques otros perfiles.\n\n` +
                          `🔧 _En caso de que la cuenta se caiga o esté fuera de servicio, el reemplazo se realiza en un plazo máximo de *24 horas*._\n\n` +
                          `_PLIXORA.BO — Gracias por tu compra 🧡_`;
                } else if (svcLower.includes('prime')) {
                    // Prime Video message
                    msg = `🎬 *PLIXORA.BO — Cuenta de Streaming*\n\n` +
                          `Hola *${name}* 👋\n\n` +
                          `Tu cuenta de *${account.serviceName}* ya está lista. Aquí están tus datos de acceso:\n\n` +
                          `📧 *Correo:* ${account.email}\n` +
                          `🔑 *Contraseña:* ${account.password}\n` +
                          `👤 *Perfil:* Perfil ${profileNum}\n\n` +
                          `📌 *Importante*\n` +
                          `SOLO INGRESAR EN 1 DISPOSITIVO\n` +
                          `NO CAMBIAR DE DISPOSITIVO\n` +
                          `✔️ Use su perfil asignado.\n` +
                          `✔️ No compartir perfil.\n` +
                          `✔️ Si necesitas un código, avísanos\n\n` +
                          `🔧 _En caso de que la cuenta se caiga o esté fuera de servicio, el reemplazo se realiza en un plazo máximo de *24 horas*._\n\n` +
                          `_PLIXORA.BO — Gracias por tu compra 🧡_`;
                } else {
                    // Generic streaming message
                    msg = `🎬 *PLIXORA.BO — Cuenta de Streaming*\n\n` +
                          `Hola *${name}* 👋\n\n` +
                          `Tu cuenta de *${account.serviceName}* ya está lista para que la disfrutes. Aquí están tus datos de acceso:\n\n` +
                          `📧 *Correo:* ${account.email}\n` +
                          `🔑 *Contraseña:* ${account.password}\n` +
                          `👤 *Perfil:* Perfil ${profileNum}\n\n` +
                          `⚠️ *Importante:*\n` +
                          `• No cambies la contraseña ni el correo.\n` +
                          `• No compartas estos datos con nadie.\n` +
                          `• No elimines ni modifiques otros perfiles.\n\n` +
                          `🔧 _En caso de que la cuenta se caiga o esté fuera de servicio, el reemplazo se realiza en un plazo máximo de *24 horas*._\n\n` +
                          `_PLIXORA.BO — Gracias por tu compra 🧡_`;
                }

                try {
                    await fetch(window.PLIXORA_CONFIG.WA_BOT_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone, message: msg })
                    });
                    showToast('✅ Cliente agregado, venta registrada y mensaje enviado por WhatsApp.');
                } catch (waErr) {
                    console.error('WA send error:', waErr);
                    showToast('✅ Cliente agregado y venta registrada. ⚠️ No se pudo enviar el mensaje de WhatsApp.');
                }
            } else {
                showToast('✅ Cliente agregado y venta registrada correctamente.');
            }

            window.gaCloseAddMemberModal();
        } catch (e) {
            showToast('❌ Error: ' + e.message);
        } finally {
            // Re-enable buttons
            if (btnSave) btnSave.disabled = false;
            if (btnSend) btnSend.disabled = false;
        }
    }

    // Two public functions for the two buttons
    window.gaSubmitNewMember = function () { return saveNewMember(true); };
    window.gaSaveOnlyMember = function () { return saveNewMember(false); };

    // ── REMOVE MEMBER ─────────────────────────────────────────────
    window.gaRemoveMember = async function (accountId, memberIndex) {
        if (!confirm('¿Estás seguro de eliminar este miembro?')) return;
        try {
            const account = gaAccounts.find(a => a.id === accountId);
            if (!account) return;
            const members = [...(account.members || [])];
            members.splice(memberIndex, 1);
            await gaDB.collection('group_accounts').doc(accountId).update({ members });
            showToast('✅ Miembro eliminado.');
        } catch (e) {
            showToast('❌ Error: ' + e.message);
        }
    };

    // ── MODAL: REPLACE ACCOUNT ────────────────────────────────────
    window.gaOpenReplace = function (accountId, serviceName) {
        document.getElementById('ga-replace-modal').style.display = 'flex';
        document.getElementById('ga-replace-account-id').value = accountId;
        document.getElementById('ga-replace-service-label').textContent = serviceName;
        document.getElementById('ga-replace-email').value = '';
        document.getElementById('ga-replace-password').value = '';

        const account = gaAccounts.find(a => a.id === accountId);
        const listEl = document.getElementById('ga-replace-notify-list');
        if (account && listEl) {
            const members = account.members || [];
            if (members.length === 0) {
                listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No hay miembros para notificar.</p>';
            } else {
                listEl.innerHTML = members.map(m =>
                    `<div class="ga-notify-item">📱 <strong>${m.name}</strong> — ${m.phone}</div>`
                ).join('');
            }
        }
    };

    window.gaCloseReplaceModal = function () {
        document.getElementById('ga-replace-modal').style.display = 'none';
    };

    window.gaSubmitReplace = async function () {
        const accountId = document.getElementById('ga-replace-account-id').value;
        const newEmail = document.getElementById('ga-replace-email').value.trim();
        const newPassword = document.getElementById('ga-replace-password').value.trim();

        if (!newEmail || !newPassword) {
            showToast('❌ Ingresa el nuevo correo y contraseña.');
            return;
        }

        try {
            const account = gaAccounts.find(a => a.id === accountId);
            if (!account) { showToast('❌ Cuenta no encontrada.'); return; }

            // Update credentials and reset expiration date
            await gaDB.collection('group_accounts').doc(accountId).update({
                email: newEmail,
                password: newPassword,
                createdAt: new Date().toISOString() // Reset 1 month timer
            });

            const members = account.members || [];
            let sent = 0;
            let failed = 0;

            for (let i = 0; i < members.length; i++) {
                const m = members[i];
                const svcLower = (account.serviceName || '').toLowerCase();
                const isDisneyHbo = svcLower.includes('disney') || svcLower.includes('hbo');
                const notaCombo = isDisneyHbo ? `\n\n📌 *NOTA:* Estos mismos datos te sirven para iniciar sesión tanto en *Disney Plus* como en *HBO Max*. Por favor, cierra sesión en tu cuenta antigua e inicia sesión con los datos nuevos.` : '';
                const msg = `🔄 *PLIXORA.BO — Actualización de Cuenta*\n\nHola *${m.name}* 👋\n\nTe informamos que los datos de acceso de tu cuenta de *${account.serviceName}* han sido actualizados. Aquí tienes las nuevas credenciales:\n\n📧 *Nuevo Correo:* ${newEmail}\n🔑 *Nueva Contraseña:* ${newPassword}\n👤 *Tu Perfil:* Perfil ${i + 1}${notaCombo}\n\n⚠️ *Importante:*\n• Los datos anteriores ya no funcionan.\n• No cambies la contraseña ni el correo.\n• No compartas estos datos con nadie.\n\n🔧 _El reemplazo o restablecimiento de cuenta se realiza en un plazo máximo de *24 horas*._\n\n_PLIXORA.BO — Disculpa las molestias. Si tienes alguna duda, escríbenos. 🙏_`;

                try {
                    await fetch(window.PLIXORA_CONFIG.WA_BOT_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: m.phone, message: msg })
                    });
                    sent++;
                } catch (waErr) {
                    console.error('WA replace error for ' + m.phone, waErr);
                    failed++;
                }
            }

            if (failed === 0) {
                showToast(`✅ Cuenta reemplazada. ${sent} mensaje(s) enviado(s) por WhatsApp.`);
            } else {
                showToast(`⚠️ Cuenta reemplazada. ${sent} enviados, ${failed} fallaron.`);
            }

            window.gaCloseReplaceModal();
        } catch (e) {
            showToast('❌ Error: ' + e.message);
        }
    };

    // ── DELETE ACCOUNT ────────────────────────────────────────────
    window.gaDeleteAccount = async function (accountId, serviceName) {
        if (!confirm(`¿Estás seguro de eliminar la cuenta grupal "${serviceName}"? Se perderán todos los miembros.`)) return;
        try {
            await gaDB.collection('group_accounts').doc(accountId).delete();
            showToast('✅ Cuenta grupal eliminada.');
        } catch (e) {
            showToast('❌ Error: ' + e.message);
        }
    };

    // ── TOAST helper ──────────────────────────────────────────────
    function showToast(msg) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg);
        } else {
            const t = document.getElementById('toast');
            if (t) {
                t.textContent = msg;
                t.classList.add('show');
                setTimeout(() => t.classList.remove('show'), 3000);
            }
        }
    }

    // Run init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
