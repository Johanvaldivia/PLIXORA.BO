// =============================================================
// PLIXORA.BO - Sistema de Ventas
// Con sincronización Firebase en tiempo real + respaldo local
// =============================================================

// ---- CATÁLOGO DE PRODUCTOS (Movido a catalog-data.js) ----

// ---- ZONA HORARIA BOLIVIA (UTC-4) ----

// ---- SANITIZAR TELÉFONO BOLIVIA ----
// Limpia cualquier formato: +591 73651440, 59173651440, 073651440, etc.
// Siempre devuelve los últimos 8 dígitos (formato boliviano)

// ---- ESTADO ----
let sales = JSON.parse(localStorage.getItem('plixora_sales')) || [];
let customPlans = JSON.parse(localStorage.getItem('plixora_custom_plans')) || [];
window.customPlans = customPlans;
let db = null;
let unsubscribe = null;
let unsubscribeCustomPlans = null;

// ---- DOM ----
const productsGrid  = document.getElementById('products-grid');
const filterBtns    = document.querySelectorAll('.filter-btn');
const selectProduct = document.getElementById('sale-product');
const saleSummary   = document.getElementById('sale-summary');
const formNewSale   = document.getElementById('form-new-sale');
const btnGenerateWA = document.getElementById('btn-generate-wa');

// ---- THEME LOGIC ----
function getSavedTheme() {
    return localStorage.getItem("theme") || "light";
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    syncThemeButtons(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
}

function syncThemeButtons(theme) {
    const isDark = theme === "dark";
    const label = document.getElementById("themeLabel");
    const thumb = document.getElementById("themeThumb");
    const switchBtn = document.getElementById("themeSwitch");
    const mobileBtn = document.getElementById("themeSwitchMobile");

    if (switchBtn) switchBtn.classList.toggle("active", isDark);

    if (mobileBtn) {
        mobileBtn.textContent = isDark ? "🌙" : "☀️";
        mobileBtn.classList.toggle("active", isDark);
    }
}

function initTheme() {
    const saved = getSavedTheme();
    applyTheme(saved);
    const switchBtn = document.getElementById("themeSwitch");
    const mobileBtn = document.getElementById("themeSwitchMobile");
    if (switchBtn) switchBtn.addEventListener("click", toggleTheme);
    if (mobileBtn) mobileBtn.addEventListener("click", toggleTheme);
}

// ---- INICIALIZACIÓN ----
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupNavigation();
    setupNotificationBell();
    renderCatalog('all');
    populateSelect();
    setupForm();
    updateCurrentDate();
    setupPeriodTabs();
    setupHistoryControls();
    initContacts();
    initFirebase();
});

// ---- NOTIFICATION BELL ----
function setupNotificationBell() {
    const bellBtn = document.getElementById('notif-bell-btn');
    const dropdown = document.getElementById('notif-dropdown');
    
    if (bellBtn && dropdown) {
        // Toggle dropdown on bell click
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        
        // Prevent clicks inside dropdown from closing it
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (!dropdown.classList.contains('hidden')) {
                dropdown.classList.add('hidden');
            }
        });
    }

    // Profile Dropdown Setup
    const profileBtn = document.getElementById('profile-menu-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });
        
        profileDropdown.addEventListener('click', (e) => {
            // Do not stop propagation if clicking a valid action item
            if(e.target.closest('.profile-dropdown-item')) {
                profileDropdown.classList.add('hidden');
            } else {
                e.stopPropagation();
            }
        });
        
        document.addEventListener('click', () => {
            if (!profileDropdown.classList.contains('hidden')) {
                profileDropdown.classList.add('hidden');
            }
        });
    }
}

// ---- PERIOD TABS ----
let currentPeriod = 'today';
const PAGE_TITLES = { dashboard:'Dashboard', catalog:'Catálogo', newsale:'Nueva Venta', history:'Historial', netflix:'Netflix', analytics:'Analíticas', 'group-accounts':'Cuentas Grupales' };

function setupPeriodTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            updateDashboard();
        });
    });
}


// ---- FECHA ACTUAL ----
function updateCurrentDate() {
    // Desktop
    const el = document.getElementById('current-date-display');
    const dateStr = nowBolivia().toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).toUpperCase();
    if (el) el.textContent = dateStr;

    // Mobile header (short format)
    const elMobile = document.getElementById('current-date-display-mobile');
    if (elMobile) {
        elMobile.textContent = nowBolivia().toLocaleDateString('es-ES', {
            weekday: 'short', day: 'numeric', month: 'short'
        });
    }
}

// ---- FIREBASE INIT ----
function initFirebase() {
    // FIREBASE_CONFIGURED viene de firebase-config.js
    if (typeof FIREBASE_CONFIGURED === 'undefined' || !FIREBASE_CONFIGURED) {
        showSetupBanner();
        updateDashboard();
        return;
    }
    setCloudStatus('connecting');

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            if (!window.firestoreInitialized) {
                window.firestoreInitialized = true;
                try {
        db = firebase.firestore();

        // CRÍTICO: Habilitar persistencia offline
        // Esto permite que la app funcione sin internet y sincronice cuando vuelve
        db.enablePersistence({ synchronizeTabs: true })
            .catch(err => {
                if (err.code === 'failed-precondition') {
                    // Múltiples tabs abiertas, solo una puede tener persistencia
                    console.warn('Persistencia: múltiples tabs abiertas.');
                } else if (err.code === 'unimplemented') {
                    console.warn('Persistencia no disponible en este navegador.');
                }
            });

        // Migrar datos de localStorage a Firebase (primera vez)
        migrateLocalToFirebase();

        // Listener en tiempo real con metadatos para saber si viene de caché o servidor
        unsubscribe = db.collection('plixora_sales')
            .orderBy('date', 'desc')
            .onSnapshot(
                { includeMetadataChanges: true },
                snapshot => {
                    const fromServer = !snapshot.metadata.fromCache;
                    sales = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    localStorage.setItem('plixora_sales', JSON.stringify(sales));
                    updateDashboard();

                    // Conectar el módulo Netflix a Firebase en cuanto haya datos (caché o servidor)
                    if (typeof window.nfSetDb === 'function' && !window.nfDbConnected) {
                        window.nfDbConnected = true;
                        window.nfSetDb(db);
                    } else if (window.nfDbConnected && typeof window.nfRenderAll === 'function') {
                        // Ya conectado, solo re-renderizar si llegan datos nuevos
                        window.nfRenderAll();
                    }

                    // Conectar el módulo Cuentas Grupales
                    if (typeof window.gaSetDb === 'function' && !window.gaDbConnected) {
                        window.gaDbConnected = true;
                        window.gaSetDb(db);
                    } else if (window.gaDbConnected && typeof window.renderGroupAccounts === 'function') {
                        window.renderGroupAccounts();
                    }

                    // Actualizar analíticas si está en esa pestaña
                    const activeView = document.querySelector('.view.active');
                    if (activeView && activeView.id === 'analytics' && typeof window.renderAnalytics === 'function') {
                        window.renderAnalytics();
                    }

                    if (fromServer) {
                        setCloudStatus('online');
                        if (!window.contactsFirebaseInit) {
                            window.contactsFirebaseInit = true;
                            initContactsFirebase();
                        }
                        if (!window.netflixProfitFixed) {
                            fixNetflixProfits();
                            window.netflixProfitFixed = true;
                        }
                    } else {
                        setCloudStatus('cache');
                    }
                },
                error => {
                    console.error('Error Firebase onSnapshot:', error);
                    setCloudStatus('error', error.message);
                    // Mostrar datos locales mientras tanto
                    sales = JSON.parse(localStorage.getItem('plixora_sales')) || [];
                    updateDashboard();
                    showToast(`❌ Error de sincronización: ${error.code || error.message}`);
                    // Cargar Netflix desde caché local si Firebase falla
                    if (!window.nfDbConnected && typeof window.nfInitLocal === 'function') {
                        window.nfDbConnected = true;
                        window.nfInitLocal();
                    }
                }
            );

        // Listener para Planes Personalizados
        unsubscribeCustomPlans = db.collection('plixora_custom_plans')
            .onSnapshot(snapshot => {
                customPlans = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                window.customPlans = customPlans;
                localStorage.setItem('plixora_custom_plans', JSON.stringify(customPlans));
                
                // Re-renderizar catálogo o vista activa si es necesario
                const activeView = document.querySelector('.view.active');
                if (activeView && activeView.id === 'catalog' && typeof window.renderCatalog === 'function') {
                    const activeFilter = document.querySelector('.filter-btn.active');
                    window.renderCatalog(activeFilter ? activeFilter.dataset.filter : 'all');
                } else if (activeView && activeView.id === 'newsale' && typeof window.populateSelect === 'function') {
                    window.populateSelect();
                }
            }, error => {
                console.error('Error Firebase custom_plans:', error);
                customPlans = JSON.parse(localStorage.getItem('plixora_custom_plans')) || [];
                window.customPlans = customPlans;
            });

        // Verificar conexión real con Firestore después de 5s
        setTimeout(() => {
            const statusEl = document.getElementById('cloud-status-indicator');
            if (statusEl && statusEl.dataset.status === 'connecting') {
                setCloudStatus('error', 'Tiempo de espera agotado. Revisa tu config de Firebase.');
                showToast('⚠️ No se pudo conectar a Firebase. Revisa la guía.');
            }
        }, 8000);

    } catch (e) {
        console.error('Firebase init error:', e);
        setCloudStatus('error', e.message);
        showToast(`❌ Error al iniciar Firebase: ${e.message}`);
        sales = JSON.parse(localStorage.getItem('plixora_sales')) || [];
        updateDashboard();
    }
            }
        }
    });
}

// Migrar ventas locales que no están en Firebase (ejecución única)
async function migrateLocalToFirebase() {
    if (localStorage.getItem('plixora_migrated')) return;
    
    try {
        const localSales = JSON.parse(localStorage.getItem('plixora_sales')) || [];
        if (localSales.length === 0) {
            localStorage.setItem('plixora_migrated', 'true');
            return;
        }

        console.log('Migrando ventas locales a Firebase...');
        const batch = db.batch();
        const salesRef = db.collection('plixora_sales');
        
        let migratedCount = 0;
        for (const sale of localSales) {
            if (!sale.id) continue;
            // Verificar si ya existe (para evitar sobreescribir si otro dispositivo ya lo subió)
            const doc = await salesRef.doc(sale.id).get();
            if (!doc.exists) {
                batch.set(salesRef.doc(sale.id), sale);
                migratedCount++;
            }
        }
        
        if (migratedCount > 0) {
            await batch.commit();
            console.log(`Migración completada: ${migratedCount} ventas subidas.`);
        }
        
        localStorage.setItem('plixora_migrated', 'true');
    } catch (e) {
        console.error('Error en migración:', e);
    }
}

// Corregir ganancias antiguas de Netflix
async function fixNetflixProfits() {
    if (!db) return;
    try {
        const snap = await db.collection('plixora_sales').get();
        const batch = db.batch();
        let changes = 0;
        snap.forEach(doc => {
            const data = doc.data();
            if (data.productName && data.productName.toLowerCase().includes('netflix')) {
                let newProfit = data.profit;
                if (data.price === 15 && data.profit !== 7) newProfit = 7;
                if (data.price === 29 && data.profit !== 13) newProfit = 13;
                if (newProfit !== data.profit) {
                    batch.update(doc.ref, { profit: newProfit });
                    changes++;
                }
            }
        });
        if (changes > 0) {
            await batch.commit();
            console.log(`Corregidas ${changes} ventas de Netflix con ganancia incorrecta.`);
        }
    } catch (e) {
        console.error("Error corrigiendo ganancias de Netflix:", e);
    }
}

// ---- BANNER DE ESTADO DE NUBE ----
function showSetupBanner() {
    const banner = document.createElement('div');
    banner.id = 'setup-banner';
    banner.innerHTML = `
        <span>⚠️ <strong>Modo local:</strong> Firebase no configurado. Los datos solo se guardan en este dispositivo.</span>
        <a href="GUIA_FIREBASE.html" target="_blank" style="color:#fbbf24;font-weight:600;margin-left:1rem;">📖 Ver guía →</a>
    `;
    banner.style.cssText = `background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
        color:#fcd34d;padding:0.75rem 1.5rem;font-size:0.9rem;border-radius:10px;
        margin-bottom:1rem;display:flex;align-items:center;flex-wrap:wrap;gap:0.5rem;`;
    const topBar = document.querySelector('.page-topbar');
    if (topBar) topBar.insertAdjacentElement('afterend', banner);
    updateDashboard();
}

// Actualiza el indicador de estado en la barra superior
function setCloudStatus(status, detail) {
    const configs = {
        connecting: { text: '⏳ Conectando...', cls: 'status-connecting' },
        online:     { text: '☁️ Sincronizado', cls: 'status-online' },
        cache:      { text: '💾 Caché local',  cls: 'status-cache' },
        error:      { text: '❌ Sin sync',     cls: 'status-error' },
    };
    const cfg = configs[status] || configs.error;
    const ids = ['cloud-status-indicator', 'cloud-status-indicator-mobile'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.dataset.status = status;
        el.innerHTML = cfg.text;
        el.className = 'cloud-status-indicator ' + cfg.cls;
        if (detail) el.title = `Error: ${detail}. Haz clic para reintentar.`;
    });
}

// Re-suscribir el listener (útil para reintentar)
// ---- NAVEGACIÓN ----
function setupNavigation() {
    // Desktop top nav buttons
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.target));
    });

    // Mobile pill nav buttons
    document.querySelectorAll('.pill-nav-item[data-target]').forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.target));
    });
}

// ---- CATÁLOGO ----
function renderCatalog(filter) {
    productsGrid.innerHTML = '';
    const allProducts = [...catalogData, ...customPlans];
    let data;
    if (filter === 'all') {
        data = allProducts;
    } else if (filter === 'individual' || filter === 'completa' || filter === 'combo') {
        data = allProducts.filter(p => p.category === filter);
    } else {
        data = allProducts.filter(p => p.type === filter);
    }

    // Group by category for 'all' view
    const categories = [
        { key: 'individual', label: '👤 Cuentas Individuales', items: data.filter(p => p.category === 'individual') },
        { key: 'completa',   label: '🔑 Cuentas Completas',    items: data.filter(p => p.category === 'completa') },
        { key: 'combo',      label: '🔥 Combos',               items: data.filter(p => p.category === 'combo') }
    ];

    if (filter === 'all' || filter === 'individual' || filter === 'completa' || filter === 'combo') {
        categories.forEach(cat => {
            if (cat.items.length === 0) return;
            // Section header
            const header = document.createElement('div');
            header.style.cssText = 'grid-column: 1 / -1; margin-top: 1.5rem; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border);';
            header.innerHTML = `<h3 style="color: var(--text-main); font-size: 1.1rem; font-weight: 600;">${cat.label}</h3>`;
            productsGrid.appendChild(header);

            cat.items.forEach(product => {
                productsGrid.appendChild(createProductCard(product));
            });
        });
    } else {
        data.forEach(product => {
            productsGrid.appendChild(createProductCard(product));
        });
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const isCombo = product.type === 'combo';
    const isCompleta = product.category === 'completa';
    let badgeText = 'PERFIL';
    let badgeStyle = '';
    if (isCombo) {
        badgeText = '🔥 COMBO';
        badgeStyle = 'style="color:var(--accent-red);background:rgba(239,68,68,0.15);"';
    } else if (isCompleta) {
        badgeText = '🔑 COMPLETA';
        badgeStyle = 'style="color:#10b981;background:rgba(16,185,129,0.15);"';
    }
    const priceDisplay = product.salePrice > 0 ? `${product.salePrice} <span>Bs</span>` : '<span style="color:#f59e0b;font-size:0.9rem;">A PEDIDO</span>';
    const profitDisplay = product.profit > 0 ? `Ganancia: ${product.profit} Bs` : 'Consultar precio';
    
    let customBadgeHTML = '';
    let customActionsHTML = '';
    
    if (product.isCustom) {
        customBadgeHTML = `<div class="custom-plan-badge"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Personalizado</div>`;
        customActionsHTML = `
            <div class="plan-actions">
                <button class="plan-btn" onclick="window.editCustomPlan('${product.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Editar</button>
                <button class="plan-btn plan-btn-delete" onclick="window.deleteCustomPlan('${product.id}', '${product.name}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Eliminar</button>
            </div>
        `;
    }

    card.innerHTML = `
        ${customBadgeHTML}
        <div class="product-badge" ${badgeStyle} ${product.isCustom ? 'style="top: 2.8rem;"' : ''}>${badgeText}</div>
        <div class="product-type">${product.duration}</div>
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">${priceDisplay}</div>
        <ul class="product-features">${product.features.map(f => `<li>${f}</li>`).join('')}</ul>
        <div class="product-profit">${profitDisplay}</div>
        ${customActionsHTML}
    `;
    return card;
}

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCatalog(btn.dataset.filter);
    });
});

// ---- HISTORIAL: FILTROS Y BÚSQUEDA ----
let historySearchTerm = '';
let historyProductFilter = 'all';

function setupHistoryControls() {
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            historySearchTerm = e.target.value.toLowerCase();
            renderHistoryTable();
        });
    }

    const filters = document.querySelectorAll('#history-product-filters .filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            historyProductFilter = btn.dataset.filter;
            renderHistoryTable();
        });
    });
}

// ---- FORMULARIO NUEVA VENTA ----
function populateSelect() {
    selectProduct.innerHTML = '<option value="" disabled selected>Selecciona un producto...</option>';
    const grpIndividual = document.createElement('optgroup'); grpIndividual.label = '👤 Cuentas Individuales';
    const grpCompleta   = document.createElement('optgroup'); grpCompleta.label   = '🔑 Cuentas Completas';
    const grpCombo      = document.createElement('optgroup'); grpCombo.label      = '🔥 Combos';
    const grpCustom     = document.createElement('optgroup'); grpCustom.label     = '⭐ Planes Personalizados';

    const allProducts = [...catalogData, ...customPlans];

    allProducts.forEach(p => {
        if (p.id.startsWith('nf-')) return; // Ocultar Netflix del formulario genérico
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.duration}) - ${p.salePrice} Bs`;
        
        if (p.isCustom) {
            grpCustom.appendChild(opt);
        } else if (p.type === 'combo') {
            grpCombo.appendChild(opt);
        } else if (p.category === 'completa') {
            grpCompleta.appendChild(opt);
        } else {
            grpIndividual.appendChild(opt);
        }
    });
    
    selectProduct.appendChild(grpIndividual);
    selectProduct.appendChild(grpCompleta);
    selectProduct.appendChild(grpCombo);
    if (grpCustom.children.length > 0) {
        selectProduct.appendChild(grpCustom);
    }

    selectProduct.addEventListener('change', e => {
        const allProds = [...catalogData, ...customPlans];
        const p = allProds.find(x => x.id === e.target.value);
        if (p) {
            document.getElementById('summary-price').textContent  = `${p.salePrice} Bs`;
            document.getElementById('summary-cost').textContent   = `${p.cost} Bs`;
            document.getElementById('summary-profit').textContent = `${p.profit} Bs`;
            saleSummary.style.display = 'block';

            // Generar campos de credenciales dinámicos
            const container = document.getElementById('dynamic-credentials-container');
            if (container) {
                const accountsCount = p.accountsCount || 1;
                container.innerHTML = '';
                for (let i = 1; i <= accountsCount; i++) {
                    const isCombo = accountsCount > 1;
                    const indexStr = isCombo ? ` (Cuenta ${i})` : '';
                    container.innerHTML += `
                        <div class="form-row credential-group" data-index="${i}">
                            <div class="form-group half">
                                <label class="cred-email-label">Correo de la Cuenta${indexStr} (Opcional)</label>
                                <input type="email" class="sale-email-input" placeholder="correo@ejemplo.com">
                            </div>
                            <div class="form-group half">
                                <label class="cred-password-label">Contraseña${indexStr} (Opcional)</label>
                                <input type="text" class="sale-password-input" placeholder="Contraseña de acceso">
                            </div>
                        </div>
                    `;
                }
            }
        }
    });
}

function setupForm() {
    formNewSale.addEventListener('submit', async e => {
        e.preventDefault();

        let hasError = false;

        const productId = selectProduct.value;
        if (!productId) {
            selectProduct.classList.remove('shake-error');
            void selectProduct.offsetWidth;
            selectProduct.classList.add('shake-error');
            hasError = true;
        }

        const requiredInputs = formNewSale.querySelectorAll('input[required]');
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

        const allProds = [...catalogData, ...customPlans];
        const product = allProds.find(p => p.id === productId);
        const submitBtn = formNewSale.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        let waVal = document.getElementById('sale-customer').value.trim();
        waVal = sanitizeBoliviaPhone(waVal);

        const timestampId = Date.now().toString();
        const code = generateOrderCode();

        const credentialGroups = formNewSale.querySelectorAll('.credential-group');
        const credentials = [];
        credentialGroups.forEach(group => {
            credentials.push({
                email: group.querySelector('.sale-email-input').value.trim() || '',
                password: group.querySelector('.sale-password-input').value.trim() || ''
            });
        });

        // Para retrocompatibilidad
        const firstEmail = credentials.length > 0 ? credentials[0].email : '';
        const firstPassword = credentials.length > 0 ? credentials[0].password : '';

        const newSale = {
            id:          timestampId,
            orderCode:   code,
            date:        nowBolivia().toISOString(),
            productName: `${product.name} (${product.duration})`,
            price:       product.salePrice,
            profit:      product.profit,
            customerName:document.getElementById('sale-customer-name').value.trim() || '',
            customer:    waVal || 'Anónimo',
            email:       firstEmail,
            password:    firstPassword,
            credentials: credentials, // Guardamos todas las credenciales
            expireDate:  calculateExpirationDate(product.duration),
            isCustom:    product.isCustom || false,
            aiWamessageTemplate: product.aiWamessageTemplate || ''
        };

        let pendingSaleMsg = '';
        const hasPhone = newSale.customer && newSale.customer !== 'Anónimo';

        if (hasPhone) {
            pendingSaleMsg = `¡Hola! Aquí tienes los detalles de tu compra en PLIXORA.BO 🌟\n\n` + generateSaleDetailsText(newSale);
            window.pendingSaleContext = { sale: newSale, messageText: pendingSaleMsg, formNewSale, selectProduct, saleSummary };

            document.getElementById('sale-prev-cliente').textContent = `${newSale.customerName || 'Cliente'} (${newSale.customer})`;
            document.getElementById('sale-prev-msg').textContent = pendingSaleMsg;
            document.getElementById('sale-preview-modal').style.display = 'flex';
        } else {
            // Si no hay número de WhatsApp, simplemente guardar directamente
            await executeSaveSale(newSale, false);
        }
    });
}

async function executeSaveSale(newSale, sendWhatsApp) {
    const submitBtn = formNewSale.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
        await saveSale(newSale);
        // Auto-save contact
        autoSaveContact(newSale.customerName, newSale.customer);
        formNewSale.reset();
        // Reset contact selector
        const contactSel = document.getElementById('sale-contact');
        if (contactSel) contactSel.value = '';
        document.getElementById('sale-summary').style.display = 'none';
        showToast('✅ Venta registrada y sincronizada');
        if (typeof window.playNotificationSound === 'function') {
            window.playNotificationSound('sale');
        }

        if (sendWhatsApp && newSale.customer && newSale.customer !== 'Anónimo' && window.pendingSaleContext) {
            try {
                const response = await waBotFetch(window.PLIXORA_CONFIG.WA_BOT_URL, { phone: newSale.customer, message: window.pendingSaleContext.messageText });
                const resData = await response.json();
                if (resData.success) {
                    showToast('💬 Mensaje enviado por WhatsApp');
                } else {
                    console.warn('Bot de WhatsApp no listo o no pudo enviar:', resData.error);
                }
            } catch (apiErr) {
                console.log('Bot de WhatsApp apagado o no disponible.');
            }
        }

        navigateTo('dashboard');
    } catch (err) {
        console.error('Error guardando venta:', err);
        showToast('❌ Error guardando venta');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Registrar Venta';
    }
}

window.closeSalePreview = function() {
    document.getElementById('sale-preview-modal').style.display = 'none';
    window.pendingSaleContext = null;
    const submitBtn = formNewSale.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Registrar Venta';
};

window.confirmSaleOnly = function() {
    document.getElementById('sale-preview-modal').style.display = 'none';
    if (window.pendingSaleContext) {
        executeSaveSale(window.pendingSaleContext.sale, false);
    }
};

window.confirmSaleAndSend = function() {
    document.getElementById('sale-preview-modal').style.display = 'none';
    if (window.pendingSaleContext) {
        executeSaveSale(window.pendingSaleContext.sale, true);
    }
};

// ---- DASHBOARD ----




// Dismiss individual alert

// Dismiss all alerts


// ---- ACCIONES HISTORIAL ----

let pendingHistNotifyPayload = null;





let currentEditingSaleId = null;





// ---- GENERAR MENÚ WA ----
btnGenerateWA.addEventListener('click', () => {
    const text = `🏪 *PLIXORA.BO – CATÁLOGO GENERAL*

🎬 *CAPCUT PRO*
• 1 mes → 25 Bs
• 1 dispositivo

▶️ *YOUTUBE PREMIUM*
• 1 mes → 25 Bs

🎬 *NETFLIX (PERFIL)*
• 1 mes → 15 Bs
• 2 meses → 29 Bs

🎬 *NETFLIX PLAN PREMIUM – CUENTA COMPLETA*
• 1 mes → 65 Bs
• Hasta 5 dispositivos simultáneos

⭐ *DISNEY PLUS ESTÁNDAR (NO ESPN)*
• 1 mes → 10 Bs

🍿 *HBO MAX PLATINO*
• 1 mes → 10 Bs
• 2 meses → 18 Bs

🍿 *DISNEY PLUS ESTÁNDAR + HBO MAX – CUENTA COMPLETA*
• 1 mes → 23 Bs
• Cuentas completas
• Hasta 5 dispositivos simultáneos en cada cuenta

🍥 *CRUNCHYROLL FAN – CUENTA COMPLETA*
• 1 mes → 34 Bs
• 1 año → 140 Bs
• Solo 1 dispositivo

🎨 *CANVA PRO EDU*
• 1 año → 18 Bs
• Garantía de 1 año
• Activación a correo propio

🎧 *SPOTIFY PREMIUM*
• 1 mes → 20 Bs
• 3 meses → 55 Bs
• 6 meses → 80 Bs
• 12 meses → 150 Bs

🅰️ *ADOBE CREATIVE CLOUD*
• Todas las Apps x 1 mes → 65 Bs
• Acceso hasta 2 dispositivos

🛡️ *EXPRESS VPN*
• 1 mes → 25 Bs
• Acceso hasta 4 a 8 dispositivos

✨ *GEMINI PRO*
• 1 año → 35 Bs
• Incluye GG 5TB
• NotebookLM Pro
• Veo3 1K créditos
• 3 meses de garantía

💻 *MICROSOFT 365 FAMILY*
• 1 año → 150 Bs
• Garantía de 10 meses
• Activación en correo

📦 *COMBOS PRINCIPALES*

🔥 Combo Stream (Disney + YouTube Premium) → 32 Bs

🎨 Combo Diseño (Canva EDU + Adobe Creative Cloud) → 80 Bs

🚀 Combo Creator Pro (CapCut Pro + Adobe Creative Cloud) → 80 Bs

💻 Combo Office (Microsoft 365 + Canva EDU) → 160 Bs

👑 Combo Ultra (Microsoft 365 + Adobe + Canva EDU) → 210 Bs

🛡️ Combo Privado (Express VPN + YouTube Premium) → 45 Bs

▶️ *YOUTUBE PREMIUM FAMILIAR*
• 1 mes → 35 Bs
• Cuenta con correo y contraseña
• Plan Familiar (4 invitaciones extra)
• Sin anuncios + Segundo plano

🛡️ *Garantía incluida*
⚡ *Entrega inmediata*

📲 *WhatsApp:* 73651440`;

    navigator.clipboard.writeText(text)
        .then(() => showToast('📋 Menú copiado al portapapeles'))
        .catch(() => showToast('❌ Error al copiar'));
});

// ---- TOAST ----
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// ---- NAVIGATE TO VIEW (shared by desktop + mobile nav) ----
function navigateTo(target) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const desktopBtn = document.querySelector(`.nav-item[data-target="${target}"]`);
    if (desktopBtn) desktopBtn.classList.add('active');

    document.querySelectorAll('.pill-nav-item[data-target]').forEach(n => n.classList.remove('active'));
    const pillBtn = document.querySelector(`.pill-nav-item[data-target="${target}"]`);
    if (pillBtn) pillBtn.classList.add('active');

    const views = document.querySelectorAll('.view');
    views.forEach(v => {
        v.classList.remove('active');
        v.classList.remove('view-sliding-in');
        if (v.id === target) {
            v.classList.add('active');
            void v.offsetWidth;
            v.classList.add('view-sliding-in');
        }
    });

    const titleEl = document.getElementById('page-title');
    if (titleEl && PAGE_TITLES[target]) titleEl.textContent = PAGE_TITLES[target];

    if (target === 'analytics' && typeof window.renderAnalytics === 'function') {
        window.renderAnalytics();
    }

    try { document.querySelector('.main-content').scrollTo({ top:0, behavior:'smooth' }); } catch(e){}
}

// ============================================================
// MÓDULO: CLIENTES FRECUENTES (Contactos)
// ============================================================
let plixoraContacts = [];
let contactsUnsubscribe = null;





// --- Manage Contacts Modal ---

window.closeContactsModal = function() {
    document.getElementById('contacts-modal').style.display = 'none';
};




// ============================================================
// MÓDULO: REEMPLAZAR CUENTA
// ============================================================
let pendingReplaceSaleId = null;

// ==========================================
// SISTEMA DE PLANES PERSONALIZADOS
// ==========================================

window.openCustomPlanModal = function() {
    document.getElementById('custom-plan-title').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Nuevo Plan Personalizado';
    document.getElementById('custom-plan-form').reset();
    document.getElementById('cp-id').value = '';
    document.getElementById('cp-wa-template').value = '';
    document.getElementById('cp-accounts-count-container').style.display = 'none';
    document.getElementById('cp-accounts-count').value = 1;
    document.getElementById('cp-profit-preview').textContent = '0.00 Bs';
    document.getElementById('custom-plan-modal').style.display = 'flex';
};

window.closeCustomPlanModal = function() {
    document.getElementById('custom-plan-modal').style.display = 'none';
};

window.calcCustomProfit = function() {
    const sale = parseFloat(document.getElementById('cp-salePrice').value) || 0;
    const cost = parseFloat(document.getElementById('cp-cost').value) || 0;
    const profit = (sale - cost).toFixed(2);
    const el = document.getElementById('cp-profit-preview');
    el.textContent = `${profit} Bs`;
    el.style.color = profit >= 0 ? 'var(--green)' : 'var(--accent-red)';
};

window.submitCustomPlan = async function() {
    const id = document.getElementById('cp-id').value || `cp-${Date.now()}`;
    const featuresStr = document.getElementById('cp-features').value;
    const features = featuresStr ? featuresStr.split(',').map(f => f.trim()).filter(f => f) : [];
    
    const salePrice = parseFloat(document.getElementById('cp-salePrice').value) || 0;
    const cost = parseFloat(document.getElementById('cp-cost').value) || 0;

    let waTemplate = document.getElementById('cp-wa-template').value;
    if (!waTemplate) {
        // Generar plantilla local por defecto si no se optimizó con IA
        waTemplate = window.generateLocalWaTemplate(
            document.getElementById('cp-name').value.trim(),
            document.getElementById('cp-category').value,
            document.getElementById('cp-duration').value.trim(),
            features
        );
    }

    const plan = {
        id,
        name: document.getElementById('cp-name').value.trim(),
        category: document.getElementById('cp-category').value,
        duration: document.getElementById('cp-duration').value.trim(),
        salePrice,
        cost,
        profit: salePrice - cost,
        features,
        type: document.getElementById('cp-category').value === 'combo' ? 'combo' : 'single',
        accountsCount: document.getElementById('cp-category').value === 'combo' ? (parseInt(document.getElementById('cp-accounts-count').value) || 1) : 1,
        isCustom: true,
        aiWamessageTemplate: waTemplate,
        createdAt: new Date().toISOString()
    };

    try {
        if (!db) throw new Error("Firebase no inicializado");
        
        const btn = document.querySelector('#custom-plan-form .ga-btn-submit');
        const ogText = btn.textContent;
        btn.textContent = 'Guardando...';
        btn.disabled = true;

        await db.collection('plixora_custom_plans').doc(id).set(plan);
        window.closeCustomPlanModal();
        showToast('✅ Plan guardado exitosamente');
        
        btn.textContent = ogText;
        btn.disabled = false;

        // Mostrar la hermosa vista previa de WhatsApp
        setTimeout(() => {
            window.showCustomPlanPreview(plan);
        }, 300);

    } catch (e) {
        console.error('Error guardando plan:', e);
        showToast('❌ Error al guardar el plan');
        const btn = document.querySelector('#custom-plan-form .ga-btn-submit');
        if (btn) {
            btn.textContent = 'Guardar Plan';
            btn.disabled = false;
        }
    }
};

window.editCustomPlan = function(id) {
    const plan = customPlans.find(p => p.id === id);
    if (!plan) return;

    document.getElementById('custom-plan-title').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Editar Plan Personalizado';
    document.getElementById('cp-id').value = plan.id;
    document.getElementById('cp-name').value = plan.name;
    document.getElementById('cp-category').value = plan.category;
    document.getElementById('cp-accounts-count-container').style.display = plan.category === 'combo' ? 'block' : 'none';
    document.getElementById('cp-accounts-count').value = plan.accountsCount || 1;
    document.getElementById('cp-duration').value = plan.duration;
    document.getElementById('cp-salePrice').value = plan.salePrice;
    document.getElementById('cp-cost').value = plan.cost;
    document.getElementById('cp-features').value = plan.features.join(', ');
    document.getElementById('cp-wa-template').value = plan.aiWamessageTemplate || '';
    
    window.calcCustomProfit();
    document.getElementById('custom-plan-modal').style.display = 'flex';
};

window.deleteCustomPlan = async function(id, name) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el plan "${name}"?\nEsto NO afectará a las ventas ya registradas con este plan.`)) return;

    try {
        if (!db) throw new Error("Firebase no inicializado");
        await db.collection('plixora_custom_plans').doc(id).delete();
        showToast('✅ Plan eliminado exitosamente');
    } catch (e) {
        console.error('Error eliminando plan:', e);
        showToast('❌ Error al eliminar el plan');
    }
};

// ==========================================
// MÓDULO INTELIGENTE: OPTIMIZADOR CON IA Y VISTA PREVIA
// ==========================================

window.optimizePlanWithAI = function() {
    const name = document.getElementById('cp-name').value.trim();
    if (!name) {
        showToast('⚠️ Escribe el nombre del plan antes de optimizar.');
        return;
    }

    const key = localStorage.getItem('plixora_gemini_api_key');
    if (!key) {
        document.getElementById('gemini-api-key').value = '';
        document.getElementById('gemini-key-modal').style.display = 'flex';
    } else {
        window.runAIOptimization(key);
    }
};

window.closeGeminiKeyModal = function() {
    document.getElementById('gemini-key-modal').style.display = 'none';
};

window.saveGeminiKey = function() {
    const key = document.getElementById('gemini-api-key').value.trim();
    if (!key) {
        showToast('⚠️ Introduce una clave de API válida.');
        return;
    }
    localStorage.setItem('plixora_gemini_api_key', key);
    window.closeGeminiKeyModal();
    window.runAIOptimization(key);
};

window.useLocalOptimizer = function() {
    window.closeGeminiKeyModal();
    window.runLocalOptimization();
};

window.runAIOptimization = async function(apiKey) {
    const name = document.getElementById('cp-name').value.trim();
    const category = document.getElementById('cp-category').value;
    const duration = document.getElementById('cp-duration').value.trim() || '1 mes';
    const featuresStr = document.getElementById('cp-features').value.trim();
    const accountsCount = category === 'combo' ? (parseInt(document.getElementById('cp-accounts-count').value) || 1) : 1;

    let comboPrompt = '';
    if (accountsCount > 1) {
        comboPrompt = `\n\nIMPORTANTE: Este producto es un COMBO que contiene ${accountsCount} cuentas distintas. Por lo tanto, en la plantilla de WhatsApp DEBES generar ${accountsCount} bloques de credenciales independientes usando las siguientes etiquetas exactas: `;
        for (let i = 1; i <= accountsCount; i++) {
            comboPrompt += `{correo_${i}} y {contrasena_${i}}` + (i < accountsCount ? ', ' : '');
        }
        comboPrompt += `.\nPor favor estructura el mensaje para que cada cuenta quede clara (ej: Cuenta 1, Cuenta 2, etc). No uses {correo} ni {contrasena} sin número.`;
    }

    const optBtn = document.querySelector('.ai-opt-btn');
    const ogHTML = optBtn.innerHTML;
    optBtn.innerHTML = '<span>⏳ Optimizando...</span>';
    optBtn.disabled = true;

    const prompt = `Eres un copywriter experto para la tienda de streaming y software PLIXORA.BO.${comboPrompt}
Tu tarea es tomar la entrada del usuario y mejorar tanto las características para el catálogo como la plantilla de WhatsApp que se le enviará al cliente al entregarle sus credenciales.

Debes seguir el estilo y tono característico de PLIXORA.BO:
- Muy profesional, ordenado, usando emojis representativos.
- Saludo personalizado con el nombre del cliente incluyendo la etiqueta '{cliente}'.
- DEBES incluir una sección "🌟 *Características de tu plan:*" donde enumeres las características mejoradas que generaste en el campo 'features'.
- Datos de acceso claramente delimitados, preferiblemente dentro de un cuadro estilizado con caracteres o viñetas y usando texto monoespaciado para correo y contraseña (ej: \`{correo}\` y \`{contrasena}\`).
- Reglas de uso muy claras y estrictas para evitar reclamos y caídas (basadas en el tipo de producto).
- Advertencia clara de garantía y qué está prohibido (ej. no cambiar datos de facturación ni contraseña, no compartir con terceros).
- Firma al final: \n_PLIXORA.BO — Gracias por tu compra 🧡_

Aquí tienes ejemplos reales de plantillas que usamos en PLIXORA.BO para que aprendas el formato exacto:

EJEMPLO 1 (Para productos tipo Cuentas Compartidas o Perfiles, ej. Netflix):
🎬 *Netflix Premium (1 mes)*
🎫 *Pedido:* {pedido}

Hola *{cliente}* 👋
¡Tu suscripción de *Netflix Premium* ya está activa y lista para usar! 🎉

📌 *Duración:* {duracion}

🌟 *Características de tu plan:*
• Perfil individual y privado
• Calidad Ultra HD 4K
• Sin caídas ni interrupciones

📧 *Correo:* \`{correo}\`
🔑 *Contraseña:* \`{contrasena}\`

⚠️ *(LA CONTRASEÑA INCLUYE MÁS CON EL * )*
*POR FAVOR INGRESAR BIEN LA CONTRASEÑA*

🔒 _Puedes crear un PIN en tu perfil si deseas mayor privacidad._

🚫 *REGLAS ESTRICTAS DE USO:*
• *Prohibido cambiar el nombre del perfil.*
• 📺 *LÍMITE DE PANTALLA:* Solo se permite reproducir contenido en *1 dispositivo a la vez*.
_Si el sistema detecta reproducción simultánea en 2 o más pantallas, tu perfil será suspendido automáticamente sin derecho a reembolso o garantía._

_PLIXORA.BO — Gracias por tu compra 🧡_

EJEMPLO 2 (Para herramientas de software o cuentas completas, ej. CapCut Pro):
━━━━━━━━━━━━━━━━━━━━━━━━
      *PLIXORA.BO* 🌟
  ✂️ *CAPCUT PRO*
━━━━━━━━━━━━━━━━━━━━━━━━
🎫 *Pedido:* {pedido}

Hola *{cliente}* 👋

¡Tu cuenta de *CapCut Pro* ya está *activa* y lista para usar! 🎉

📌 *Duración:* {duracion}

┌─────────────────────────
│ 📧 *Correo:* \`{correo}\`
│ 🔑 *Contraseña:* \`{contrasena}\`
└─────────────────────────

🛡️ *PARA EVITAR BLOQUEOS:*
✅ Usa la cuenta solo en tu dispositivo.
✅ No cambies la contraseña.
✅ No compartas el acceso con otra persona.
✅ Ingresa con cuidado los datos de acceso.

❌ _Si la cuenta se bloquea por mal uso, no hay cambio, devolución ni garantía._
✅ _La garantía solo aplica si la cuenta deja de funcionar por problema de facturación._
🔧 _En caso de que la cuenta se caiga o esté fuera de servicio, el reemplazo o restablecimiento se realiza en un plazo máximo de *24 horas*._

━━━━━━━━━━━━━━━━━━━━━━━━
_PLIXORA.BO — Gracias por tu compra 🧡_
_Ante cualquier consulta, estamos para ayudarte._

Ahora, procesa el siguiente producto nuevo:
- Nombre del Plan/Combo: "${name}"
- Categoría del Plan: "${category}"
- Duración: "${duration}"
- Características provistas por el usuario: "${featuresStr || 'Servicio de alta calidad'}"

Genera un JSON estrictamente válido que contenga:
1. "features": Un array con 3 o 4 características súper pulidas, profesionales y cortas con emojis para mostrar en el catálogo.
2. "waTemplate": La plantilla de WhatsApp para este producto siguiendo los ejemplos anteriores. Debe usar las etiquetas {cliente}, {pedido}, {duracion}, y los placeholders correspondientes de {correo} y {contrasena} (o numerados si es un combo múltiple) para que sean reemplazadas dinámicamente más tarde. Si el producto es un Combo, asegúrate de mencionar todos los servicios del combo de forma ordenada y clara.

Devuelve ÚNICAMENTE el código JSON puro, sin decoraciones de ningún tipo, sin bloques de código de markdown de tipo \`\`\`json.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) throw new Error('Error al conectar con la API de Gemini');

        const result = await response.json();
        let aiText = result.candidates[0].content.parts[0].text.trim();
        
        // Limpiar posible formato markdown en la respuesta de la IA
        if (aiText.startsWith('```')) {
            aiText = aiText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }
        
        // Buscar el bloque JSON real por si acaso hay texto explicativo
        const firstBrace = aiText.indexOf('{');
        const lastBrace = aiText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            aiText = aiText.substring(firstBrace, lastBrace + 1);
        }

        const data = JSON.parse(aiText);
        
        if (data.features && Array.isArray(data.features)) {
            document.getElementById('cp-features').value = data.features.join(', ');
        }
        if (data.waTemplate) {
            document.getElementById('cp-wa-template').value = data.waTemplate;
        }

        showToast('✨ ¡Optimización con IA completada!');
    } catch (e) {
        console.error('Gemini error:', e);
        showToast('⚠️ Hubo un problema con la IA. Usando optimizador local...');
        window.runLocalOptimization();
    } finally {
        optBtn.innerHTML = ogHTML;
        optBtn.disabled = false;
    }
};

window.runLocalOptimization = function() {
    const name = document.getElementById('cp-name').value.trim();
    const category = document.getElementById('cp-category').value;
    const duration = document.getElementById('cp-duration').value.trim() || '1 mes';
    const featuresStr = document.getElementById('cp-features').value.trim();
    const featuresArr = featuresStr ? featuresStr.split(',').map(f => f.trim()).filter(f => f) : [];

    // Mejorar características localmente
    const enhancedFeatures = [];
    if (featuresArr.length > 0) {
        featuresArr.forEach(f => {
            enhancedFeatures.push(`✨ ${f}`);
        });
    } else {
        enhancedFeatures.push('⭐ Suscripción premium sin interrupciones');
        enhancedFeatures.push('⚡ Entrega inmediata y soporte postventa');
        enhancedFeatures.push('🛡️ Garantía completa por todo el periodo contratado');
    }

    document.getElementById('cp-features').value = enhancedFeatures.join(', ');

    const accountsCount = category === 'combo' ? (parseInt(document.getElementById('cp-accounts-count').value) || 1) : 1;

    // Generar plantilla
    const waTemplate = window.generateLocalWaTemplate(name, category, duration, enhancedFeatures, accountsCount);
    document.getElementById('cp-wa-template').value = waTemplate;

    showToast('✨ Optimizado localmente con éxito');
};

window.generateLocalWaTemplate = function(name, category, duration, features, accountsCount = 1) {
    let rules = '• Prohibido compartir o revender la cuenta.\n• Reportar caídas de inmediato para gestionar garantía.';
    const lowerName = name.toLowerCase();

    if (lowerName.includes('netflix') || lowerName.includes('nf')) {
        rules = '• 📺 *LÍMITE DE PANTALLA:* Solo se permite reproducir en *1 dispositivo a la vez*.\n• Prohibido cambiar el nombre del perfil.\n• Puedes crear un PIN en tu perfil si deseas mayor privacidad.';
    } else if (lowerName.includes('spotify') || lowerName.includes('sp')) {
        rules = '• Inicia sesión directamente ingresando correo y contraseña en Spotify.\n• No usar "Iniciar sesión con Google".';
    } else if (lowerName.includes('hbo') || lowerName.includes('disney') || lowerName.includes('prime')) {
        rules = '• Usar únicamente el perfil asignado.\n• No alterar la facturación o planes contratados.';
    }

    let credsBlock = '';
    if (accountsCount > 1) {
        for(let i = 1; i <= accountsCount; i++) {
            credsBlock += `┌── CUENTA ${i} ──────────────\n`;
            credsBlock += `│ 📧 *Correo:* \`{correo_${i}}\`\n`;
            credsBlock += `│ 🔑 *Contraseña:* \`{contrasena_${i}}\`\n`;
            credsBlock += `└─────────────────────────\n`;
        }
    } else {
        credsBlock += `┌─────────────────────────\n`;
        credsBlock += `│ 📧 *Correo:* \`{correo}\`\n`;
        credsBlock += `│ 🔑 *Contraseña:* \`{contrasena}\`\n`;
        credsBlock += `└─────────────────────────\n`;
    }

    return `━━━━━━━━━━━━━━━━━━━━━━━━
      *PLIXORA.BO* 🌟
  🎬 *${name.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━
🎫 *Pedido:* {pedido}

Hola *{cliente}* 👋
¡Tu suscripción de *${name}* ya está activa y lista para usar! 🎉

📌 *Duración:* {duracion}

🌟 *Características de tu plan:*
${features.map(f => `• ${f}`).join('\n')}

${credsBlock.trim()}

🚫 *REGLAS ESTRICTAS DE USO:*
${rules}

❌ _Si la cuenta se bloquea por mal uso, no hay cambio, devolución ni garantía._
✅ _La garantía solo aplica si la cuenta deja de funcionar por problema de facturación._

━━━━━━━━━━━━━━━━━━━━━━━━
_PLIXORA.BO — Gracias por tu compra 🧡_`;
};

window.showCustomPlanPreview = function(plan) {
    let template = plan.aiWamessageTemplate || '';
    if (!template) {
        template = window.generateLocalWaTemplate(plan.name, plan.category, plan.duration, plan.features);
    }

    // Reemplazar marcadores por datos simulados para la vista previa
    let previewText = template
        .replace(/{cliente}/g, 'Johan Valdivia')
        .replace(/{pedido}/g, 'PLX-MOCK12')
        .replace(/{duracion}/g, plan.duration)
        .replace(/{correo}/g, 'cliente-premium@plixora.bo')
        .replace(/{contrasena}/g, 'plixora2026*');

    document.getElementById('wa-preview-text').innerHTML = window.formatWhatsappMarkdown(previewText);
    
    // Poner la hora actual
    const now = new Date();
    document.getElementById('wa-preview-time').textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    document.getElementById('wa-preview-modal').style.display = 'flex';
};

window.closeWaPreviewModal = function() {
    document.getElementById('wa-preview-modal').style.display = 'none';
};

window.formatWhatsappMarkdown = function(text) {
    if (!text) return '';
    // Sanitizar HTML básico
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    
    // Reemplazos de markdown de Whatsapp
    // Negrita: *texto* -> <strong>texto</strong>
    escaped = escaped.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    // Cursiva: _texto_ -> <em>texto</em>
    escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>');
    // Monoespaciado: `texto` -> <code style="background:rgba(0,0,0,0.06); padding:2px 4px; border-radius:4px; font-family:monospace; color:#222;">$1</code>');
    escaped = escaped.replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.06); padding:2px 4px; border-radius:4px; font-family:monospace; color:#222;">$1</code>');
    // Tachado: ~texto~ -> <del>$1</del>
    escaped = escaped.replace(/~(.*?)~/g, '<del>$1</del>');
    
    return escaped;
};






// TYPEWRITER EFFECT FOR BRAND LOGO
document.addEventListener('DOMContentLoaded', () => {
    const typewriterElement = document.getElementById('typewriter-text');
    if (!typewriterElement) return;

    const phrases = ['PLIXORA.BO', 'PLIXORA.BO'];
    let currentPhraseIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    let typingSpeed = 200;
    
    function type() {
        const currentPhrase = phrases[currentPhraseIndex];
        
        if (isDeleting) {
            currentCharIndex--;
        } else {
            currentCharIndex++;
        }
        
        typewriterElement.textContent = currentPhrase.substring(0, currentCharIndex);
        
        let speed = typingSpeed;
        if (isDeleting) {
            speed /= 2;
        }
        
        if (!isDeleting && currentCharIndex === currentPhrase.length) {
            speed = 2500;
            isDeleting = true;
        } else if (isDeleting && currentCharIndex === 0) {
            isDeleting = false;
            currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
            speed = 500;
        }
        
        setTimeout(type, speed);
    }
    
    setTimeout(type, 1000);
});
