// =============================================================
// PLIXORA.BO — Módulo de Cuentas Grupales v4.0
// Diseño: VERSION 2 (Modo Noche) & VERSION 2.1 (Modo Día)
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
        const addBtn = document.getElementById('ga-btn-add-account');
        if (addBtn) addBtn.addEventListener('click', openAddAccountModal);
        window.renderGroupAccounts = renderAll;

        // Load local cache immediately
        try {
            gaAccounts = JSON.parse(localStorage.getItem('ga_accounts') || '[]');
            renderAll();
        } catch (e) {}

        // Observer to re-trigger count-up when group-accounts view becomes active
        const gaSection = document.getElementById('group-accounts');
        if (gaSection && window.MutationObserver) {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(m => {
                    if (m.attributeName === 'class' && gaSection.classList.contains('active')) {
                        triggerGACountUp();
                    }
                });
            });
            observer.observe(gaSection, { attributes: true });
        }
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
                try { localStorage.setItem('ga_accounts', JSON.stringify(gaAccounts)); } catch(e) {}
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
        return (typeof window.nowBolivia === 'function' ? window.nowBolivia() : new Date()) > exp;
    }

    // ── SERVICE LOGO RESOLVER ──────────────────────────────────────
    function getServiceLogo(serviceName) {
        const s = (serviceName || '').toLowerCase();
        
        if (s.includes('disney') && (s.includes('hbo') || s.includes('max'))) {
            return `
                <div style="display:flex;align-items:center;justify-content:center;gap:3px;">
                    <img src="assets/logos/disney.svg" alt="Disney+" style="width:16px;height:16px;object-fit:contain;">
                    <span style="font-size:10px;font-weight:800;color:var(--ga-text-muted);line-height:1;">+</span>
                    <img src="assets/logos/hbomax-dark.png" alt="HBO Max" style="width:16px;height:16px;object-fit:contain;">
                </div>
            `;
        }
        if (s.includes('disney')) {
            return `<img src="assets/logos/disney.svg" alt="Disney+" style="width:24px;height:24px;object-fit:contain;">`;
        }
        if (s.includes('hbo') || s.includes('max')) {
            return `<img src="assets/logos/hbomax-dark.png" alt="HBO Max" style="width:24px;height:24px;object-fit:contain;">`;
        }
        if (s.includes('prime')) {
            return `<img src="assets/logos/primevideo.svg" alt="Prime Video" style="width:24px;height:24px;object-fit:contain;">`;
        }
        if (s.includes('netflix')) {
            return `<img src="assets/logos/netflix.png" alt="Netflix" style="width:22px;height:22px;object-fit:contain;">`;
        }
        if (s.includes('spotify')) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const spLogo = isDark ? 'assets/logos/spotify-dark.png' : 'assets/logos/spotify-light.png';
            return `<img src="${spLogo}" alt="Spotify" style="width:22px;height:22px;object-fit:contain;">`;
        }
        if (s.includes('youtube')) {
            return `<img src="assets/logos/youtube.svg" alt="YouTube" style="width:24px;height:24px;object-fit:contain;">`;
        }
        if (s.includes('capcut')) {
            return `<img src="assets/logos/capcut.svg" alt="CapCut" style="width:24px;height:24px;object-fit:contain;">`;
        }

        // Lucide Icon: Tv2 fallback
        return `
            <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24">
                <rect height="14" rx="2" width="20" x="2" y="7"></rect>
                <path d="M17 2l-5 5-5-5"></path>
            </svg>
        `;
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

        gaAccounts.forEach((acc, cardIdx) => {
            const members = acc.members || [];
            const accountCost = parseFloat(acc.accountCost) || 0;
            const totalRevenue = members.reduce((s, m) => s + (parseFloat(m.price) || 0), 0);
            const profit = totalRevenue - accountCost;
            const slotsUsed = members.length;
            const maxSlots = acc.maxSlots || 5;
            const expDate = formatExpDate(acc.createdAt);
            const expired = isExpired(acc.createdAt);

            const safeServiceName = (acc.serviceName || 'Servicio').replace(/"/g, '&quot;');
            const safeEmail = (acc.email || '').replace(/"/g, '&quot;');
            const safePass = (acc.password || '').replace(/"/g, '&quot;');

            const card = document.createElement('article');
            card.className = `ga-card animate-card`;
            card.innerHTML = `
                <div class="ga-card-inner-stack">
                    <!-- Top Row: Logo/Icon + Service Title + Badges -->
                    <div class="ga-card-top">
                        <div class="ga-card-service-info">
                            <div class="ga-service-icon-box">
                                ${getServiceLogo(acc.serviceName)}
                            </div>
                            <div class="ga-service-text">
                                <h2 class="ga-service-title" title="${safeServiceName}">${safeServiceName}</h2>
                                <p class="ga-service-sub">${slotsUsed}/${maxSlots} perfiles ocupados</p>
                            </div>
                        </div>
                        <div class="ga-card-top-badges">
                            <span class="ga-badge-status ${slotsUsed >= maxSlots ? 'full badge-subtle-pulse' : 'avail'}">
                                ${slotsUsed >= maxSlots ? 'LLENA' : 'CON LIBRES'}
                            </span>
                            <span class="ga-badge-expiry" title="Fecha de vencimiento">
                                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                    <rect height="18" rx="2" width="18" x="3" y="4"></rect>
                                    <line x1="16" x2="16" y1="2" y2="6"></line>
                                    <line x1="8" x2="8" y1="2" y2="6"></line>
                                    <line x1="3" x2="21" y1="10" y2="10"></line>
                                </svg>
                                <span>Vence: ${expDate}</span>
                            </span>
                        </div>
                    </div>

                    <!-- Credentials Box -->
                    <div class="ga-creds-box">
                        <!-- Email -->
                        <div class="ga-cred-row">
                            <div class="ga-cred-data">
                                <svg class="ga-cred-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                    <rect height="16" rx="2" width="20" x="2" y="4"></rect>
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                                </svg>
                                <span class="ga-cred-lbl">Correo:</span>
                                <span class="ga-cred-val" title="${safeEmail}">${safeEmail || '—'}</span>
                            </div>
                            <button class="ga-copy-trigger" onclick="window.gaTriggerCopy('${(acc.email || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\')}', this, 'Correo')" title="Copiar Correo" type="button">
                                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                    <rect height="13" rx="2" ry="2" width="13" x="9" y="9"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>
                        <!-- Password -->
                        <div class="ga-cred-row border-top-subtle">
                            <div class="ga-cred-data">
                                <svg class="ga-cred-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                    <circle cx="7.5" cy="15.5" r="5.5"></circle>
                                    <path d="m21 2-9.6 9.6"></path>
                                    <path d="m15.5 7.5 3 3"></path>
                                </svg>
                                <span class="ga-cred-lbl">Contraseña:</span>
                                <span class="ga-cred-val ga-cred-pass" data-password="${safePass}" data-visible="false" onclick="window.gaTogglePassword(this)" title="Clic para ver/ocultar">••••••••</span>
                            </div>
                            <button class="ga-copy-trigger" onclick="window.gaTriggerCopy('${(acc.password || '').replace(/'/g, "\\'").replace(/\\/g, '\\\\')}', this, 'Contraseña')" title="Copiar Contraseña" type="button">
                                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                    <rect height="13" rx="2" ry="2" width="13" x="9" y="9"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Financial Badges -->
                    <div class="ga-finance-grid">
                        <div class="ga-finance-cell">
                            <span class="ga-finance-label">INVERSIÓN</span>
                            <span class="ga-finance-num invest">
                                <span class="count-up-metric" data-value="${accountCost.toFixed(2)}">0.00</span>
                                <span class="ga-finance-unit">Bs</span>
                            </span>
                        </div>
                        <div class="ga-finance-cell">
                            <span class="ga-finance-label">COBRADO</span>
                            <span class="ga-finance-num charged">
                                <span class="count-up-metric" data-value="${totalRevenue.toFixed(2)}">0.00</span>
                                <span class="ga-finance-unit">Bs</span>
                            </span>
                        </div>
                        <div class="ga-finance-cell">
                            <span class="ga-finance-label">GANANCIA</span>
                            <span class="ga-finance-num ${profit >= 0 ? 'profit pulse-profit' : 'loss'}">
                                <span class="count-up-metric" data-prefix="${profit >= 0 ? '+' : ''}" data-value="${profit.toFixed(2)}">${profit >= 0 ? '+' : ''}0.00</span>
                                <span class="ga-finance-unit">Bs</span>
                            </span>
                        </div>
                    </div>

                    <!-- Section: Assigned Profiles -->
                    <div class="ga-members-section">
                        <div class="ga-members-header">
                            <div class="ga-members-title">
                                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <span>Perfiles Asignados</span>
                            </div>
                            <span class="ga-members-count-pill">${slotsUsed}/${maxSlots}</span>
                        </div>

                        <!-- Profile Rows List -->
                        <div class="ga-members-list">
                            ${members.map((m, i) => {
                                const mName = (m.name || 'Cliente').replace(/"/g, '&quot;');
                                const rawPhone = (m.phone || '').replace(/[^0-9]/g, '');
                                const displayPrice = (parseFloat(m.price) || 0).toFixed(2);
                                return `
                                    <div class="profile-item">
                                        <div class="ga-profile-left">
                                            <span class="ga-profile-num-badge">#${i + 1}</span>
                                            <div class="ga-profile-user-info">
                                                <p class="ga-profile-name" title="${mName}">${mName}</p>
                                                <p class="ga-profile-phone">
                                                    <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                                        <rect height="18" rx="2" width="12" x="6" y="3"></rect>
                                                        <line x1="12" x2="12.01" y1="18" y2="18"></line>
                                                    </svg>
                                                    ${m.phone || '—'}
                                                </p>
                                            </div>
                                        </div>
                                        <div class="ga-profile-right">
                                            <span class="ga-profile-price-tag">${displayPrice} Bs</span>
                                            <!-- WhatsApp -->
                                            <a class="ga-btn-action ga-btn-action-wa" href="https://wa.me/${rawPhone}" target="_blank" title="Abrir WhatsApp">
                                                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                                </svg>
                                            </a>
                                            <!-- Notificar -->
                                            <button class="ga-btn-action ga-btn-action-notify" onclick="window.gaResendToMember('${acc.id}', ${i})" title="Reenviar datos por WhatsApp" type="button">
                                                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                                    <line x1="22" x2="11" y1="2" y2="13"></line>
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                                </svg>
                                            </button>
                                            <!-- Eliminar -->
                                            <button class="ga-btn-action ga-btn-action-delete" onclick="window.gaRemoveMember('${acc.id}', ${i}, this)" title="Eliminar perfil" type="button">
                                                <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" viewBox="0 0 24 24">
                                                    <path d="M18 6 6 18"></path>
                                                    <path d="m6 6 12 12"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}

                            ${slotsUsed < maxSlots ? `
                                <div class="ga-slot-available-btn" onclick="window.gaOpenAddMember('${acc.id}', '${(acc.serviceName || '').replace(/'/g, "\\'")}', ${maxSlots}, ${slotsUsed})">
                                    <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                        <path d="M12 5v14"></path>
                                        <path d="M5 12h14"></path>
                                    </svg>
                                    <span>Perfil ${slotsUsed + 1} disponible — Asignar cliente</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Card Footer & Tools -->
                <div class="ga-card-footer">
                    <button class="ga-btn-add-client-card" onclick="window.gaOpenAddMember('${acc.id}', '${(acc.serviceName || '').replace(/'/g, "\\'")}', ${maxSlots}, ${slotsUsed})" type="button">
                        <svg fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M12 5v14"></path>
                            <path d="M5 12h14"></path>
                        </svg>
                        <span>Agregar Cliente</span>
                    </button>
                    <div class="ga-footer-tools-grid">
                        <button class="ga-tool-action-btn ga-tool-btn-replace" onclick="window.gaOpenReplace('${acc.id}', '${(acc.serviceName || '').replace(/'/g, "\\'")}')" title="Reemplazar cuenta por caída" type="button">
                            <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                                <path d="M3 3v5h5"></path>
                            </svg>
                            <span>Reemplazar</span>
                        </button>
                        <button class="ga-tool-action-btn ga-tool-btn-notify" onclick="window.gaBulkNotify('${acc.id}')" title="Enviar aviso masivo a todos los miembros" type="button">
                            <svg fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            </svg>
                            <span>Aviso</span>
                        </button>
                        <button class="ga-tool-action-btn ga-tool-btn-delete" onclick="window.gaDeleteAccount('${acc.id}', '${(acc.serviceName || '').replace(/'/g, "\\'")}')" title="Eliminar cuenta grupal" type="button">
                            <svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // Trigger smooth progressive count-up animations
        triggerGACountUp();
    }

    // ── PROGRESSIVE COUNT-UP ANIMATION (EASING CUBIC) ──────────────
    function triggerGACountUp() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const countUpElements = document.querySelectorAll('#group-accounts .count-up-metric');
        if (!countUpElements.length) return;

        if (prefersReducedMotion) {
            countUpElements.forEach(el => {
                const rawTarget = parseFloat(el.getAttribute('data-value')) || 0;
                const prefix = el.getAttribute('data-prefix') || '';
                el.textContent = (prefix && rawTarget > 0 ? prefix : '') + rawTarget.toFixed(2);
            });
            return;
        }

        countUpElements.forEach(el => {
            const rawTarget = parseFloat(el.getAttribute('data-value')) || 0;
            const prefix = el.getAttribute('data-prefix') || (rawTarget > 0 && el.parentElement && el.parentElement.textContent.includes('+') ? '+' : '');
            const duration = 1200;
            const startTimestamp = performance.now();

            function updateNumber(now) {
                const progress = Math.min((now - startTimestamp) / duration, 1);
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = rawTarget * easeOut;
                el.textContent = (prefix && current > 0 ? prefix : '') + current.toFixed(2);

                if (progress < 1) {
                    requestAnimationFrame(updateNumber);
                } else {
                    el.textContent = (prefix && rawTarget > 0 ? prefix : '') + rawTarget.toFixed(2);
                }
            }

            requestAnimationFrame(updateNumber);
        });
    }

    // ── MICRO-INTERACTIONS: COPY TO CLIPBOARD ─────────────────────
    window.gaTriggerCopy = function(text, btn, label) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showToast(`${label || 'Dato'} copiado al portapapeles`);
        }).catch(() => {
            showToast('Texto copiado');
        });

        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.classList.add('copied');
            btn.innerHTML = `
                <svg fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = originalHTML;
            }, 1500);
        }
    };

    // ── PASSWORD TOGGLE ───────────────────────────────────────────
    window.gaTogglePassword = function(span) {
        if (!span) return;
        const pass = span.getAttribute('data-password') || '';
        const isVisible = span.getAttribute('data-visible') === 'true';
        if (isVisible) {
            span.textContent = '••••••••';
            span.setAttribute('data-visible', 'false');
        } else {
            span.textContent = pass;
            span.setAttribute('data-visible', 'true');
        }
    };

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
            const newAcc = {
                id: 'ga_' + Date.now(),
                serviceName,
                email,
                password,
                maxSlots,
                accountCost: parseFloat(accountCost),
                members: [],
                createdAt: new Date().toISOString()
            };
            if (gaDB) {
                await gaDB.collection('group_accounts').add(newAcc);
            } else {
                gaAccounts.unshift(newAcc);
                try { localStorage.setItem('ga_accounts', JSON.stringify(gaAccounts)); } catch(e) {}
                renderAll();
            }
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

        if (typeof window.sanitizeBoliviaPhone === 'function') {
            phone = window.sanitizeBoliviaPhone(phone);
        }

        if (!name || !phone || !price) {
            showToast('❌ Completa todos los campos.');
            return;
        }

        const btnSave = document.getElementById('ga-btn-save-only');
        const btnSend = document.getElementById('ga-btn-save-send');
        if (btnSave) btnSave.disabled = true;
        if (btnSend) btnSend.disabled = true;

        try {
            const account = gaAccounts.find(a => a.id === accountId);
            if (!account) { showToast('❌ Cuenta no encontrada.'); return; }

            const members = [...(account.members || [])];
            const profileNum = members.length + 1;
            const salePrice = parseFloat(price);

            members.push({
                name,
                phone,
                price: salePrice,
                addedAt: new Date().toISOString()
            });

            if (gaDB) {
                await gaDB.collection('group_accounts').doc(accountId).update({ members });
            } else {
                account.members = members;
                try { localStorage.setItem('ga_accounts', JSON.stringify(gaAccounts)); } catch(e) {}
                renderAll();
            }

            // Register sale in main sales history
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
                if (gaDB) {
                    await gaDB.collection('plixora_sales').doc(saleId).set(saleData);
                } else {
                    const localSales = JSON.parse(localStorage.getItem('plixora_sales') || '[]');
                    localSales.unshift(saleData);
                    try { localStorage.setItem('plixora_sales', JSON.stringify(localSales)); } catch(e) {}
                    if (window.sales) window.sales = localSales;
                    if (typeof window.updateDashboard === 'function') window.updateDashboard();
                }
            } catch (saleErr) {
                console.error('Error registering sale:', saleErr);
            }

            if (sendWhatsApp) {
                const svcLower = (account.serviceName || '').toLowerCase();
                let msg = '';

                if (svcLower.includes('disney') || svcLower.includes('hbo')) {
                    msg = `🎬 *PLIXORA.BO — Cuenta de Streaming*\n\n` +
                          `Hola *${name}* 👋\n\n` +
                          `Tu cuenta de *${account.serviceName}* ya está lista. Aquí están tus datos de acceso:\n\n` +
                          `📧 *Correo:* \`${account.email}\`\n` +
                          `🔑 *Contraseña:* \`${account.password}\`\n` +
                          `👤 *Perfil:* Perfil ${profileNum}\n\n` +
                          `📌 *NOTA:* Estos mismos datos te sirven para iniciar sesión tanto en *Disney Plus* como en *HBO Max*.\n\n` +
                          `⚠️ *Importante:*\n` +
                          `• No cambies la contraseña ni el correo.\n` +
                          `• No compartas estos datos con nadie.\n` +
                          `• No elimines ni modifiques otros perfiles.\n\n` +
                          `🔧 _En caso de que la cuenta se caiga o esté fuera de servicio, el reemplazo se realiza en un plazo máximo de *24 horas*._\n\n` +
                          `_PLIXORA.BO — Gracias por tu compra 🧡_`;
                } else if (svcLower.includes('prime')) {
                    msg = `🎬 *PLIXORA.BO — Cuenta de Streaming*\n\n` +
                          `Hola *${name}* 👋\n\n` +
                          `Tu cuenta de *${account.serviceName}* ya está lista. Aquí están tus datos de acceso:\n\n` +
                          `📧 *Correo:* \`${account.email}\`\n` +
                          `🔑 *Contraseña:* \`${account.password}\`\n` +
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
                    msg = `🎬 *PLIXORA.BO — Cuenta de Streaming*\n\n` +
                          `Hola *${name}* 👋\n\n` +
                          `Tu cuenta de *${account.serviceName}* ya está lista para que la disfrutes. Aquí están tus datos de acceso:\n\n` +
                          `📧 *Correo:* \`${account.email}\`\n` +
                          `🔑 *Contraseña:* \`${account.password}\`\n` +
                          `👤 *Perfil:* Perfil ${profileNum}\n\n` +
                          `⚠️ *Importante:*\n` +
                          `• No cambies la contraseña ni el correo.\n` +
                          `• No compartas estos datos con nadie.\n` +
                          `• No elimines ni modifiques otros perfiles.\n\n` +
                          `🔧 _En caso de que la cuenta se caiga o esté fuera de servicio, el reemplazo se realiza en un plazo máximo de *24 horas*._\n\n` +
                          `_PLIXORA.BO — Gracias por tu compra 🧡_`;
                }

                try {
                    const data = await waBotFetchRetry(window.PLIXORA_CONFIG.WA_BOT_URL, { phone, message: msg });
                    if (data.success) {
                        showToast('✅ Cliente agregado, venta registrada y mensaje enviado por WhatsApp.');
                    } else {
                        showToast('✅ Cliente agregado y venta registrada. ⚠️ El bot no pudo enviar el mensaje.');
                    }
                } catch (waErr) {
                    console.error('WA send error:', waErr);
                    showToast('✅ Cliente agregado y venta registrada. ⚠️ ' + waErr.message);
                }
            } else {
                showToast('✅ Cliente agregado y venta registrada correctamente.');
            }

            window.gaCloseAddMemberModal();
        } catch (e) {
            showToast('❌ Error: ' + e.message);
        } finally {
            if (btnSave) btnSave.disabled = false;
            if (btnSend) btnSend.disabled = false;
        }
    }

    window.gaSubmitNewMember = function () { return saveNewMember(true); };
    window.gaSaveOnlyMember = function () { return saveNewMember(false); };

    // ── REMOVE MEMBER ─────────────────────────────────────────────
    window.gaRemoveMember = async function (accountId, memberIndex, btnEl) {
        const account = gaAccounts.find(a => a.id === accountId);
        if (!account) return;
        const members = [...(account.members || [])];
        const m = members[memberIndex];
        const mName = m ? (m.name || `Perfil ${memberIndex + 1}`) : `Perfil ${memberIndex + 1}`;

        const confirmed = await window.plixoraConfirm({
            title: '¿Estás seguro?',
            message: `¿Eliminar a ${mName} de esta cuenta? Sus datos se liberarán de la cuenta grupal.`,
            confirmText: 'Sí, eliminar miembro',
            cancelText: 'No'
        });
        if (!confirmed) return;

        if (btnEl) {
            const row = btnEl.closest('.profile-item');
            if (row) {
                row.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(-12px) scale(0.96)';
            }
        }

        try {
            members.splice(memberIndex, 1);
            if (gaDB) {
                await gaDB.collection('group_accounts').doc(accountId).update({ members });
            } else {
                account.members = members;
                try { localStorage.setItem('ga_accounts', JSON.stringify(gaAccounts)); } catch(e) {}
                renderAll();
            }
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
                listEl.innerHTML = '<p style="color:var(--ga-text-muted);font-size:0.85rem;">No hay miembros para notificar.</p>';
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
            if (gaDB) {
                await gaDB.collection('group_accounts').doc(accountId).update({
                    email: newEmail,
                    password: newPassword,
                    createdAt: new Date().toISOString()
                });
            } else {
                account.email = newEmail;
                account.password = newPassword;
                account.createdAt = new Date().toISOString();
                try { localStorage.setItem('ga_accounts', JSON.stringify(gaAccounts)); } catch(e) {}
                renderAll();
            }

            const members = account.members || [];
            let sent = 0;
            let failed = 0;

            for (let i = 0; i < members.length; i++) {
                const m = members[i];
                const svcLower = (account.serviceName || '').toLowerCase();
                const isDisneyHbo = svcLower.includes('disney') || svcLower.includes('hbo');
                const notaCombo = isDisneyHbo ? `\n\n📌 *NOTA:* Estos mismos datos te sirven para iniciar sesión tanto en *Disney Plus* como en *HBO Max*. Por favor, cierra sesión en tu cuenta antigua e inicia sesión con los datos nuevos.` : '';
                const msg = `🔄 *PLIXORA.BO — Actualización de Cuenta*\n\nHola *${m.name}* 👋\n\nTe informamos que los datos de acceso de tu cuenta de *${account.serviceName}* han sido actualizados. Aquí tienes las nuevas credenciales:\n\n📧 *Nuevo Correo:* \`${newEmail}\`\n🔑 *Nueva Contraseña:* \`${newPassword}\`\n👤 *Tu Perfil:* Perfil ${i + 1}${notaCombo}\n\n⚠️ *Importante:*\n• Los datos anteriores ya no funcionan.\n• No cambies la contraseña ni el correo.\n• No compartas estos datos con nadie.\n\n🔧 _El reemplazo o restablecimiento de cuenta se realiza en un plazo máximo de *24 horas*._\n\n_PLIXORA.BO — Disculpa las molestias. Si tienes alguna duda, escríbenos. 🙏_`;

                try {
                    const data = await waBotFetchRetry(window.PLIXORA_CONFIG.WA_BOT_URL, { phone: m.phone, message: msg });
                    if (data.success) {
                        sent++;
                    } else {
                        console.warn('WA replace: bot no envió a ' + m.phone, data.error);
                        failed++;
                    }
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
        const confirmed = await window.plixoraConfirm({
            title: '¿Estás seguro?',
            message: `¿Eliminar la cuenta grupal "${serviceName}"? Se perderán todos los miembros asignados.`,
            confirmText: 'Sí, eliminar cuenta',
            cancelText: 'No'
        });
        if (!confirmed) return;
        try {
            if (gaDB) {
                await gaDB.collection('group_accounts').doc(accountId).delete();
            } else {
                gaAccounts = gaAccounts.filter(a => a.id !== accountId);
                try { localStorage.setItem('ga_accounts', JSON.stringify(gaAccounts)); } catch(e) {}
                renderAll();
            }
            showToast('✅ Cuenta grupal eliminada.');
        } catch (e) {
            showToast('❌ Error: ' + e.message);
        }
    };

    // ── BULK NOTIFY (Aviso Masivo) ─────────────────────────────────
    window.gaBulkNotify = async function (accountId) {
        const account = gaAccounts.find(a => a.id === accountId);
        if (!account) { showToast('❌ Cuenta no encontrada.'); return; }

        const members = account.members || [];
        if (members.length === 0) {
            showToast('⚠️ No hay miembros en esta cuenta para notificar.');
            return;
        }

        const serviceName = account.serviceName || 'Servicio';
        const email = account.email || '—';
        const password = account.password || '—';

        const createdAt = account.createdAt ? new Date(account.createdAt) : null;
        let expDateStr = '—';
        if (createdAt) {
            const exp = new Date(createdAt.getFullYear(), createdAt.getMonth() + 1, createdAt.getDate());
            expDateStr = `${exp.getDate()}/${MONTH_NAMES[exp.getMonth()]}/${exp.getFullYear()}`;
        }

        const confirmed = typeof window.plixoraConfirm === 'function'
            ? await window.plixoraConfirm({
                title: 'Aviso Masivo WhatsApp',
                message: `¿Enviar aviso masivo a ${members.length} miembro(s) de "${serviceName}"?\n\nSe les enviará sus credenciales y fecha de vencimiento por WhatsApp.`,
                confirmText: 'Sí, enviar a todos',
                cancelText: 'Cancelar'
            })
            : confirm(`¿Enviar aviso masivo a ${members.length} miembro(s) de "${serviceName}"?`);

        if (!confirmed) return;

        showToast(`📤 Enviando aviso masivo a ${members.length} miembro(s)...`);

        let sent = 0;
        let failed = 0;

        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            if (!m.phone) { failed++; continue; }

            const profileNum = i + 1;

            const svcLower = serviceName.toLowerCase();
            let notaExtra = '';
            if (svcLower.includes('disney') || svcLower.includes('hbo')) {
                notaExtra = `\n\n📌 *NOTA:* Estos mismos datos te sirven para iniciar sesión tanto en *Disney Plus* como en *HBO Max*.`;
            } else if (svcLower.includes('prime')) {
                notaExtra = `\n\n📌 *Importante*\nSOLO INGRESAR EN 1 DISPOSITIVO\nNO CAMBIAR DE DISPOSITIVO\n✔️ Use su perfil asignado.\n✔️ No compartir perfil.\n✔️ Si necesitas un código, avísanos.`;
            }

            const msg = `🔔 *PLIXORA.BO — Recordatorio de Cuenta*\n\n` +
                `Hola *${m.name}* 👋\n\n` +
                `Te recordamos los datos de acceso de tu cuenta de *${serviceName}*:\n\n` +
                `📧 *Correo:* \`${email}\`\n` +
                `🔑 *Contraseña:* \`${password}\`\n` +
                `👤 *Tu Perfil:* Perfil ${profileNum}\n` +
                `📅 *Vence:* ${expDateStr}${notaExtra}\n\n` +
                `⚠️ *Importante:*\n` +
                `• No cambies la contraseña ni el correo.\n` +
                `• No compartas estos datos con nadie.\n` +
                `• No elimines ni modifiques otros perfiles.\n\n` +
                `🔧 _En caso de que la cuenta se caiga, el reemplazo se realiza en un plazo máximo de *24 horas*._\n\n` +
                `_PLIXORA.BO — Gracias por tu preferencia 🧡_`;

            try {
                const data = await waBotFetchRetry(window.PLIXORA_CONFIG.WA_BOT_URL, { phone: m.phone, message: msg });
                if (data.success) {
                    sent++;
                } else {
                    console.warn('Bulk notify: bot no envió a ' + m.phone, data.error);
                    failed++;
                }
            } catch (err) {
                console.error(`Bulk notify error for ${m.name} (${m.phone}):`, err);
                failed++;
            }

            if (i < members.length - 1) {
                await new Promise(r => setTimeout(r, 1200));
            }
        }

        if (failed === 0) {
            showToast(`✅ Aviso masivo enviado a ${sent} miembro(s) exitosamente.`);
        } else {
            showToast(`⚠️ Aviso masivo: ${sent} enviados, ${failed} fallaron.`);
        }
    };

    // ── REENVIAR DATOS A UN MIEMBRO ──────────────────────────────
    window.gaResendToMember = async function(accountId, memberIndex) {
        const account = gaAccounts.find(a => a.id === accountId);
        if (!account) { showToast('❌ Cuenta no encontrada.'); return; }

        const members = account.members || [];
        const m = members[memberIndex];
        if (!m) { showToast('❌ Miembro no encontrado.'); return; }

        const profileNum = memberIndex + 1;
        const svcLower = (account.serviceName || '').toLowerCase();

        let notaExtra = '';
        if (svcLower.includes('disney') || svcLower.includes('hbo')) {
            notaExtra = `\n\n📌 *NOTA:* Estos mismos datos te sirven para iniciar sesión tanto en *Disney Plus* como en *HBO Max*.`;
        } else if (svcLower.includes('prime')) {
            notaExtra = `\n\n📌 *Importante*\nSOLO INGRESAR EN 1 DISPOSITIVO\nNO CAMBIAR DE DISPOSITIVO\n✔️ Use su perfil asignado.\n✔️ No compartir perfil.\n✔️ Si necesitas un código, avísanos.`;
        }

        const msg = `🔔 *PLIXORA.BO — Datos de tu Cuenta*\n\n` +
            `Hola *${m.name}* 👋\n\n` +
            `Aquí tienes los datos de acceso de tu cuenta de *${account.serviceName}*:\n\n` +
            `📧 *Correo:* \`${account.email}\`\n` +
            `🔑 *Contraseña:* \`${account.password}\`\n` +
            `👤 *Tu Perfil:* Perfil ${profileNum}${notaExtra}\n\n` +
            `⚠️ *Importante:*\n` +
            `• No cambies la contraseña ni el correo.\n` +
            `• No compartas estos datos con nadie.\n` +
            `• No elimines ni modifiques otros perfiles.\n\n` +
            `🔧 _En caso de que la cuenta se caiga, el reemplazo se realiza en un plazo máximo de *24 horas*._\n\n` +
            `_PLIXORA.BO — Gracias por tu preferencia 🧡_`;

        try {
            const data = await waBotFetchRetry(window.PLIXORA_CONFIG.WA_BOT_URL, { phone: m.phone, message: msg });
            if (data.success) {
                showToast(`✅ Datos enviados a ${m.name} por WhatsApp.`);
            } else {
                showToast(`⚠️ El bot no pudo enviar a ${m.name}.`);
            }
        } catch (err) {
            console.error('Resend error:', err);
            showToast(`⚠️ No se pudo enviar a ${m.name}. ` + err.message);
        }
    };

    // ── TOAST HELPER ──────────────────────────────────────────────
    function showToast(msg) {
        const toast = document.getElementById('ga-toast-notify');
        const toastMsg = document.getElementById('ga-toast-message');
        if (toast && toastMsg) {
            toastMsg.textContent = msg;
            toast.classList.add('show');
            clearTimeout(window._gaToastTimer);
            window._gaToastTimer = setTimeout(() => {
                toast.classList.remove('show');
            }, 2200);
        }
        if (typeof window.showToast === 'function') {
            window.showToast(msg);
        }
    }

    // Run init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
