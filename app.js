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
let catalogOverrides = JSON.parse(localStorage.getItem('plixora_catalog_overrides')) || {};
window.catalogOverrides = catalogOverrides;
let db = null;
let unsubscribe = null;
let unsubscribeCustomPlans = null;
let unsubscribeCatalogOverrides = null;
let plixoraContacts = JSON.parse(localStorage.getItem('plixora_contacts')) || [];
let contactsUnsubscribe = null;
window.plixoraContacts = plixoraContacts;

function applyCatalogOverrides() {
    if (!window.catalogData) return;
    Object.keys(catalogOverrides).forEach(id => {
        const item = window.catalogData.find(p => p.id === id);
        if (item) {
            const ov = catalogOverrides[id];
            if (ov.salePrice !== undefined) item.salePrice = Number(ov.salePrice);
            if (ov.cost !== undefined) item.cost = Number(ov.cost);
            if (ov.profit !== undefined) item.profit = Number(ov.profit);
            else if (ov.salePrice !== undefined && ov.cost !== undefined) item.profit = Math.round((item.salePrice - item.cost) * 100) / 100;
        }
    });
}
window.applyCatalogOverrides = applyCatalogOverrides;

const debouncedUpdateDashboard = window.debounce(function() {
    if (typeof updateDashboard === 'function') updateDashboard();
}, 250);

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
function initApp() {
    initTheme();
    setupNavigation();
    setupNotificationBell();
    applyCatalogOverrides();
    renderCatalog('all');
    populateSelect();
    setupForm();
    updateCurrentDate();
    setupPeriodTabs();
    setupHistoryControls();
    if (typeof initContacts === 'function') initContacts();
    initFirebase();
}

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
        // BUT allow data-action buttons to propagate to the document-level delegation
        dropdown.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                // Let notify/dismiss actions bubble up to the document delegation handler
                // but still close the dropdown
                dropdown.classList.add('hidden');
                return;
            }
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
                    debouncedUpdateDashboard();

                    // Conectar el módulo Netflix a Firebase en cuanto haya datos (caché o servidor)
                    if (typeof window.nfSetDb === 'function' && !window.nfDbConnected) {
                        window.nfDbConnected = true;
                        window.nfSetDb(db);
                    } else if (window.nfDbConnected && typeof window.nfRenderAll === 'function') {
                        if (!window._debouncedNfRender) {
                            window._debouncedNfRender = window.debounce(() => window.nfRenderAll(), 200);
                        }
                        window._debouncedNfRender();
                    }

                    // Conectar el módulo Cuentas Grupales
                    if (typeof window.gaSetDb === 'function' && !window.gaDbConnected) {
                        window.gaDbConnected = true;
                        window.gaSetDb(db);
                    } else if (window.gaDbConnected && typeof window.renderGroupAccounts === 'function') {
                        if (!window._debouncedGaRender) {
                            window._debouncedGaRender = window.debounce(() => window.renderGroupAccounts(), 200);
                        }
                        window._debouncedGaRender();
                    }

                    // Actualizar analíticas si está en esa pestaña
                    const activeView = document.querySelector('.view.active');
                    if (activeView && activeView.id === 'analytics' && typeof window.renderAnalytics === 'function') {
                        if (!window._debouncedAnRender) {
                            window._debouncedAnRender = window.debounce(() => window.renderAnalytics(), 300);
                        }
                        window._debouncedAnRender();
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

        // Listener para Sobrescritura de Precios del Catálogo
        unsubscribeCatalogOverrides = db.collection('settings').doc('catalog_overrides')
            .onSnapshot(doc => {
                if (doc.exists) {
                    catalogOverrides = doc.data() || {};
                    window.catalogOverrides = catalogOverrides;
                    localStorage.setItem('plixora_catalog_overrides', JSON.stringify(catalogOverrides));
                    applyCatalogOverrides();
                    const activeFilter = document.querySelector('.filter-btn.active');
                    renderCatalog(activeFilter ? activeFilter.dataset.filter : 'all');
                    if (typeof populateSelect === 'function') populateSelect();
                }
            }, error => {
                console.error('Error Firebase catalog_overrides:', error);
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
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.target);
        });
    });

    // Mobile pill nav buttons
    document.querySelectorAll('.pill-nav-item[data-target]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.target);
        });
    });

    // Delegación a nivel de document para máxima confiabilidad (inmune a re-renders o retardos)
    document.addEventListener('click', (e) => {
        const navBtn = e.target.closest('.nav-item, .pill-nav-item');
        if (navBtn && navBtn.dataset && navBtn.dataset.target) {
            navigateTo(navBtn.dataset.target);
        }
    });
}

// ---- CATÁLOGO ----
function renderCatalog(filter) {
    productsGrid.innerHTML = '';
    const allProducts = [...catalogData, ...customPlans];
    let data;
    if (filter === 'all') {
        data = allProducts;
    } else if (filter === 'individual' || filter === 'completa' || filter === 'combo' || filter === 'tv') {
        data = allProducts.filter(p => p.category === filter);
    } else {
        data = allProducts.filter(p => p.type === filter);
    }

    // Group by category for 'all' view
    const categories = [
        { key: 'individual', label: '👤 Cuentas Individuales', items: data.filter(p => p.category === 'individual') },
        { key: 'completa',   label: '🔑 Cuentas Completas',    items: data.filter(p => p.category === 'completa') },
        { key: 'combo',      label: '🔥 Combos',               items: data.filter(p => p.category === 'combo') },
        { key: 'tv',         label: '📺 Sección TV',            items: data.filter(p => p.category === 'tv') }
    ];

    if (filter === 'all' || filter === 'individual' || filter === 'completa' || filter === 'combo' || filter === 'tv') {
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
    card.id = 'product-card-' + (product.id || 'p-' + Math.random().toString(36).substr(2, 9));
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
    } else if (product.category === 'tv') {
        badgeText = '📺 TV';
        badgeStyle = 'style="color:#8b5cf6;background:rgba(139,92,246,0.15);"';
    }
    const priceDisplay = product.salePrice > 0 ? `${product.salePrice} <span>Bs</span>` : '<span style="color:#f59e0b;font-size:0.9rem;">A PEDIDO</span>';
    const profitDisplay = product.profit > 0 ? `Ganancia: ${product.profit} Bs` : 'Consultar precio';
    
    let customBadgeHTML = '';
    let customActionsHTML = '';
    let credsProfileHTML = '';
    
    if (product.isCustom) {
        customBadgeHTML = `<div class="custom-plan-badge"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Personalizado</div>`;
        
        if (product.credentials && (product.credentials.profileName || product.credentials.profilePin)) {
            const parts = [];
            if (product.credentials.profileName) parts.push(`👤 ${product.credentials.profileName}`);
            if (product.credentials.profilePin) parts.push(`🔒 PIN: ${product.credentials.profilePin}`);
            credsProfileHTML = `<div style="font-size:0.75rem; color:var(--orange); background:rgba(254,91,41,0.08); border:1px solid rgba(254,91,41,0.2); border-radius:6px; padding:2px 7px; margin-top:5px; display:inline-block; font-weight:600;">${parts.join(' • ')}</div>`;
        } else if (product.comboServices && product.comboServices.length > 0) {
            const listStr = product.comboServices.map(c => typeof c === 'object' ? `${c.name} (${c.duration || product.duration})` : c).join(' • ');
            credsProfileHTML = `<div style="font-size:0.75rem; color:#ef4444; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:6px; padding:2px 7px; margin-top:5px; display:inline-block; font-weight:600;">📦 Incluye: ${listStr}</div>`;
        }

        customActionsHTML = `
            <div class="plan-actions" style="margin-top:auto; padding-top:0.75rem;">
                <button class="plan-btn" onclick="window.editCustomPlan('${product.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> Editar</button>
                <button class="plan-btn plan-btn-delete" onclick="window.deleteCustomPlan('${product.id}', '${product.name}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Eliminar</button>
            </div>
        `;
    }

    let actionsHTML = '';
    if (product.isCustom) {
        actionsHTML = customActionsHTML;
    } else {
        actionsHTML = `
            <div class="plan-actions" style="margin-top:auto; padding-top:0.75rem;">
                <button type="button" class="plan-btn" onclick="window.openEditProductPriceModal('${product.id}')" style="width:100%; justify-content:center; gap:6px; font-weight:600;" title="Modificar precio de venta y costo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    <span>Editar Precio</span>
                </button>
            </div>
        `;
    }

    card.innerHTML = `
        ${customBadgeHTML}
        <div class="product-badge" ${badgeStyle} ${product.isCustom ? 'style="top: 2.8rem;"' : ''}>${badgeText}</div>
        <div class="product-type">${product.duration}</div>
        <h3 class="product-title">${product.name}</h3>
        ${credsProfileHTML}
        <div class="product-price">${priceDisplay}</div>
        <ul class="product-features">${product.features.map(f => `<li>${f}</li>`).join('')}</ul>
        <div class="product-profit">${profitDisplay}</div>
        ${actionsHTML}
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
window.createSaleAccountCardHTML = function(index, serviceName = '', duration = '1 Mes', email = '', password = '', profileName = '', profilePin = '') {
    return `
        <div class="sale-account-card credential-group" data-index="${index}">
            <div class="sale-account-card-header">
                <div class="sale-account-title">
                    <span class="sale-account-num">#${index}</span>
                    <input type="text" class="sale-service-name" placeholder="Nombre de la cuenta (ej: Netflix)" value="${serviceName || `Cuenta ${index}`}">
                    <div class="sale-account-dur-wrap" title="Duración de esta cuenta">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <input type="text" class="sale-account-duration" placeholder="Duración" value="${duration || '1 Mes'}">
                    </div>
                </div>
                <button type="button" class="sale-account-del-btn" onclick="window.removeSaleCredentialCard(this)" title="Quitar cuenta">✕ Quitar</button>
            </div>
            <div class="form-row" style="margin-bottom:0.55rem;">
                <div class="form-group half">
                    <label class="cred-email-label">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                        Correo / Usuario <span class="label-optional">(Opcional)</span>
                    </label>
                    <input type="text" class="sale-email-input" placeholder="correo@ejemplo.com" value="${email}">
                </div>
                <div class="form-group half">
                    <label class="cred-password-label">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Contraseña <span class="label-optional">(Opcional)</span>
                    </label>
                    <input type="text" class="sale-password-input" placeholder="Contraseña de acceso" value="${password}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group half">
                    <label>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Perfil / Pantalla <span class="label-optional">(Opcional)</span>
                    </label>
                    <input type="text" class="sale-profile-input" placeholder="Ej: Perfil 1 / Juan" value="${profileName}">
                </div>
                <div class="form-group half">
                    <label>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="m7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        PIN del Perfil <span class="label-optional">(Opcional)</span>
                    </label>
                    <input type="text" class="sale-pin-input" placeholder="Ej: 1234" value="${profilePin}">
                </div>
            </div>
        </div>
    `;
};

window.renderSaleCredentialCards = function(servicesList = [], defaultDuration = '1 Mes') {
    const container = document.getElementById('dynamic-credentials-container');
    if (!container) return;
    
    container.innerHTML = '';
    const list = servicesList.length > 0 ? servicesList : [{ name: 'Cuenta 1', duration: defaultDuration }];
    list.forEach((srv, idx) => {
        const srvName = typeof srv === 'object' && srv !== null ? (srv.name || `Cuenta ${idx + 1}`) : srv;
        const srvDur = typeof srv === 'object' && srv !== null ? (srv.duration || defaultDuration) : defaultDuration;
        container.insertAdjacentHTML('beforeend', window.createSaleAccountCardHTML(idx + 1, srvName, srvDur));
    });
    window.updateSaleCredentialIndexes();
};

window.addSaleCredentialCard = function(defaultServiceName = '', defaultDuration = '1 Mes') {
    const container = document.getElementById('dynamic-credentials-container');
    if (!container) return;
    const cards = container.querySelectorAll('.sale-account-card');
    const newIdx = cards.length + 1;
    container.insertAdjacentHTML('beforeend', window.createSaleAccountCardHTML(newIdx, defaultServiceName, defaultDuration));
    window.updateSaleCredentialIndexes();
    
    const lastCard = container.lastElementChild;
    if (lastCard) {
        lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const nameInput = lastCard.querySelector('.sale-service-name');
        if (nameInput) nameInput.focus();
    }
};

window.removeSaleCredentialCard = function(btn) {
    const card = btn.closest('.sale-account-card');
    if (!card) return;
    const container = document.getElementById('dynamic-credentials-container');
    if (container && container.querySelectorAll('.sale-account-card').length > 1) {
        card.remove();
        window.updateSaleCredentialIndexes();
    } else {
        showToast('⚠️ La venta debe incluir al menos una cuenta');
    }
};

window.updateSaleCredentialIndexes = function() {
    const container = document.getElementById('dynamic-credentials-container');
    if (!container) return;
    const cards = container.querySelectorAll('.sale-account-card');
    cards.forEach((c, idx) => {
        c.dataset.index = idx + 1;
        const num = c.querySelector('.sale-account-num');
        if (num) num.textContent = `#${idx + 1}`;
        const delBtn = c.querySelector('.sale-account-del-btn');
        if (delBtn) {
            delBtn.style.display = cards.length > 1 ? 'inline-block' : 'none';
        }
    });
    const badge = document.getElementById('sale-creds-badge');
    if (badge) {
        badge.textContent = `${cards.length} ${cards.length === 1 ? 'Cuenta' : 'Cuentas'}`;
    }
};

function populateSelect() {
    selectProduct.innerHTML = '<option value="" disabled selected>Selecciona un producto...</option>';
    const grpCombo      = document.createElement('optgroup'); grpCombo.label      = '🔥 Combos';
    const grpIndividual = document.createElement('optgroup'); grpIndividual.label = '👤 Cuentas Individuales';
    const grpCompleta   = document.createElement('optgroup'); grpCompleta.label   = '🔑 Cuentas Completas';
    const grpTV         = document.createElement('optgroup'); grpTV.label         = '📺 Sección TV & Streaming';
    const grpCustom     = document.createElement('optgroup'); grpCustom.label     = '⭐ Planes Personalizados';

    const allProducts = [...catalogData, ...customPlans];

    allProducts.forEach(p => {
        if (p.id.startsWith('nf-')) return; // Ocultar Netflix del formulario genérico
        const opt = document.createElement('option');
        opt.value = p.id;
        
        const isCombo = p.category === 'combo' || p.type === 'combo' || (p.comboServices && p.comboServices.length > 1);
        if (isCombo) {
            opt.textContent = `🔥 ${p.name} (${p.duration}) - ${p.salePrice} Bs`;
            grpCombo.appendChild(opt);
        } else if (p.category === 'tv') {
            opt.textContent = `📺 ${p.name} (${p.duration}) - ${p.salePrice} Bs`;
            grpTV.appendChild(opt);
        } else if (p.category === 'completa') {
            opt.textContent = `🔑 ${p.name} (${p.duration}) - ${p.salePrice} Bs`;
            grpCompleta.appendChild(opt);
        } else if (p.category === 'individual' || p.category === 'perfil') {
            opt.textContent = `👤 ${p.name} (${p.duration}) - ${p.salePrice} Bs`;
            grpIndividual.appendChild(opt);
        } else if (p.isCustom) {
            opt.textContent = `⭐ ${p.name} (${p.duration}) - ${p.salePrice} Bs`;
            grpCustom.appendChild(opt);
        } else {
            opt.textContent = `${p.name} (${p.duration}) - ${p.salePrice} Bs`;
            grpIndividual.appendChild(opt);
        }
    });
    
    if (grpCombo.children.length > 0) selectProduct.appendChild(grpCombo);
    if (grpIndividual.children.length > 0) selectProduct.appendChild(grpIndividual);
    if (grpCompleta.children.length > 0) selectProduct.appendChild(grpCompleta);
    if (grpTV.children.length > 0) selectProduct.appendChild(grpTV);
    if (grpCustom.children.length > 0) selectProduct.appendChild(grpCustom);

    selectProduct.addEventListener('change', e => {
        const allProds = [...catalogData, ...customPlans];
        const p = allProds.find(x => x.id === e.target.value);
        if (p) {
            document.getElementById('summary-price').textContent  = `${p.salePrice} Bs`;
            document.getElementById('summary-cost').textContent   = `${p.cost} Bs`;
            document.getElementById('summary-profit').textContent = `${p.profit} Bs`;
            saleSummary.style.display = 'block';

            // Generar campos de credenciales según el producto o combo seleccionado
            const isCombo = p.category === 'combo' || p.type === 'combo' || (p.comboServices && p.comboServices.length > 1);
            let servicesToRender = [];
            if (isCombo) {
                if (p.comboServices && p.comboServices.length > 0) {
                    servicesToRender = p.comboServices.map(c => typeof c === 'object' ? c : { name: c, duration: p.duration || '1 Mes' });
                } else if (p.credentials && p.credentials.combo && p.credentials.combo.length > 0) {
                    servicesToRender = p.credentials.combo.map(c => ({ name: c.name || 'Cuenta', duration: c.duration || p.duration || '1 Mes' }));
                } else if (p.features && p.features.length > 1) {
                    servicesToRender = p.features.map(f => ({ name: f, duration: p.duration || '1 Mes' }));
                } else {
                    const count = p.accountsCount || 2;
                    for (let i = 1; i <= count; i++) servicesToRender.push({ name: `Cuenta ${i}`, duration: p.duration || '1 Mes' });
                }
            } else {
                servicesToRender = [{ name: p.name, duration: p.duration || '1 Mes' }];
            }
            window.renderSaleCredentialCards(servicesToRender, p.duration || '1 Mes');
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
        submitBtn.classList.add('loading');

        let waVal = document.getElementById('sale-customer').value.trim();
        waVal = sanitizeBoliviaPhone(waVal);

        const timestampId = Date.now().toString();
        const code = generateOrderCode();

        const credentialCards = formNewSale.querySelectorAll('.sale-account-card');
        const credentials = [];
        credentialCards.forEach((card, idx) => {
            const serviceName = card.querySelector('.sale-service-name')?.value.trim() || `Cuenta ${idx + 1}`;
            const duration = card.querySelector('.sale-account-duration')?.value.trim() || product.duration || '1 Mes';
            const email = card.querySelector('.sale-email-input')?.value.trim() || '';
            const password = card.querySelector('.sale-password-input')?.value.trim() || '';
            const profileName = card.querySelector('.sale-profile-input')?.value.trim() || '';
            const profilePin = card.querySelector('.sale-pin-input')?.value.trim() || '';
            credentials.push({
                serviceName,
                duration,
                email,
                password,
                profileName,
                profilePin
            });
        });

        // Para retrocompatibilidad
        const first = credentials.length > 0 ? credentials[0] : {};

        const newSale = {
            id:          timestampId,
            orderCode:   code,
            date:        nowBolivia().toISOString(),
            productName: `${product.name} (${product.duration})`,
            price:       product.salePrice,
            profit:      product.profit,
            customerName:document.getElementById('sale-customer-name').value.trim() || '',
            customer:    waVal || 'Anónimo',
            email:       first.email || '',
            password:    first.password || '',
            profileName: first.profileName || '',
            profilePin:  first.profilePin || '',
            credentials: credentials, // Guardamos todas las cuentas y credenciales
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
    submitBtn.classList.add('loading');

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
                const data = await waBotFetchRetry(window.PLIXORA_CONFIG.WA_BOT_URL, { phone: newSale.customer, message: window.pendingSaleContext.messageText });
                if (data.success) {
                    showToast('💬 Mensaje enviado por WhatsApp');
                } else {
                    showToast('⚠️ Venta registrada, pero no se pudo enviar el mensaje de WhatsApp.');
                }
            } catch (apiErr) {
                console.warn('WA send error en venta:', apiErr.message);
                showToast('⚠️ Venta registrada. ' + apiErr.message);
            }
        }

        navigateTo('dashboard');
    } catch (err) {
        console.error('Error guardando venta:', err);
        showToast('❌ Error guardando venta');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

window.closeSalePreview = function() {
    document.getElementById('sale-preview-modal').style.display = 'none';
    window.pendingSaleContext = null;
    const submitBtn = formNewSale.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
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
if (btnGenerateWA) {
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


📺 *SECCIÓN TV & STREAMING*

📡 Magis TV PRO (1 pantalla) → desde 12 Bs
🌊 Flujo TV (1 pantalla) → desde 14 Bs
📡 IPTV Smarter Pro (1 pantalla) → desde 12 Bs
📡 IPTV Smarter Pro-Z TV (1 pantalla) → desde 10 Bs
📡 Tele Latino Max (1 pantalla) → desde 12 Bs
🔥 Nubia TV - GX MAX (1 pantalla) → desde 40 Bs
🔥 Veltix (1 pantalla) → desde 40 Bs
📡 Plex TV (1 pantalla) → desde 12 Bs

💡 *Consultanos por planes de 3, 6 y 12 meses con DESCUENTO*
💡 *Cuentas completas disponibles (3-4 pantallas)*

📲 *WhatsApp:* 73651440`;

    window.copyToClipboardWithToast(text, 'Menú');
    });
}

// ---- GENERAR MENÚ TV PARA WHATSAPP ----
window.copyTVMenu = function() {
    const text = `📺 *PLIXORA.BO — CATÁLOGO TV & STREAMING*

🟢 *Cuentas por pantalla y completas*
🟢 *Totalmente renovables*

━━━━━━━━━━━━━━━━━━━

📡 *MAGIS TV PRO* (Liga Boliviana)
🖥️ 1 Pantalla:
• 1 mes → 12 Bs
• 3 meses → 25 Bs
• 6+1 mes gratis → 40 Bs
• 12+2 meses gratis → 80 Bs
📺 Cuenta Completa (3 pantallas):
• 1 mes → 22 Bs
• 3 meses → 60 Bs
• 6+1 mes gratis → 115 Bs
• 12+2 meses gratis → 220 Bs

━━━━━━━━━━━━━━━━━━━

🌊 *FLUJO TV* (Mejor estabilidad)
🖥️ 1 Pantalla:
• 1 mes → 14 Bs
• 3 meses → 34 Bs
• 6+1 mes gratis → 65 Bs
• 12+2 meses gratis → 125 Bs
📺 Cuenta Completa (3 pantallas):
• 1 mes → 35 Bs
• 3 meses → 95 Bs
• 6+1 mes gratis → 180 Bs
• 12+2 meses gratis → 360 Bs

━━━━━━━━━━━━━━━━━━━

📡 *IPTV SMARTER PRO*
🖥️ 1 Pantalla:
• 1 mes → 12 Bs
• 2+1 mes gratis → 20 Bs
• 3+2 meses gratis → 30 Bs
• 6+3 meses gratis → 50 Bs
• 12+4 meses gratis → 85 Bs
📺 Cuenta Completa (3 pantallas):
• 1 mes → 20 Bs
• 2+1 mes gratis → 35 Bs
• 3+2 meses gratis → 50 Bs
• 6+3 meses gratis → 90 Bs
• 12+4 meses gratis → 170 Bs

━━━━━━━━━━━━━━━━━━━

📡 *IPTV SMARTER PRO-Z TV* (Liga Boliviana)
🖥️ 1 Pantalla:
• 1 mes → 10 Bs
• 3 meses → 25 Bs
• 6 meses → 40 Bs
• 12 meses → 70 Bs
📺 Cuenta Completa (3 pantallas):
• 1 mes → 20 Bs
• 3 meses → 50 Bs
• 6 meses → 90 Bs
• 12 meses → 165 Bs

━━━━━━━━━━━━━━━━━━━

📡 *TELE LATINO MAX* (Liga Boliviana)
🖥️ 1 Pantalla:
• 1 mes → 12 Bs
• 3 meses → 30 Bs
• 6 meses → 50 Bs
• 12 meses → 95 Bs
📺 Cuenta Completa (4 pantallas):
• 1 mes → 30 Bs
• 3 meses → 85 Bs
• 6 meses → 165 Bs
• 12 meses → 330 Bs

━━━━━━━━━━━━━━━━━━━

🔥 *NUBIA TV - GX MAX* (Liga Boliviana)
🖥️ 1 Pantalla:
• 1 mes → 40 Bs
• 3 meses → 110 Bs
• 6+1 mes gratis → 210 Bs
• 12+2 meses gratis → 420 Bs
📺 Cuenta Completa (3 pantallas):
• 1 mes → 65 Bs
• 3 meses → 175 Bs
• 6+1 mes gratis → 330 Bs
• 12+2 meses gratis → 650 Bs

━━━━━━━━━━━━━━━━━━━

🔥 *VELTIX* (Liga Boliviana)
🖥️ 1 Pantalla:
• 1 mes → 40 Bs
• 3 meses → 110 Bs
• 6+1 mes gratis → 210 Bs
• 12+2 meses gratis → 420 Bs
📺 Cuenta Completa (3 pantallas):
• 1 mes → 65 Bs
• 3 meses → 175 Bs
• 6+1 mes gratis → 330 Bs
• 12+2 meses gratis → 650 Bs

━━━━━━━━━━━━━━━━━━━

📡 *PLEX TV*
🖥️ 1 Pantalla → 12 Bs/mes
📺 2 Personas → 20 Bs/mes
📺 4 Personas → 35 Bs/mes

━━━━━━━━━━━━━━━━━━━

🛡️ *Garantía incluida*
⚡ *Entrega inmediata*
🔄 *Totalmente renovables*

📲 *WhatsApp:* 73651440`;

    window.copyToClipboardWithToast(text, 'Menú TV');
};

// ---- TOAST ----
function showToast(message, durationMs) {
    const container = document.getElementById('toast-container') || (function() {
        const c = document.createElement('div');
        c.id = 'toast-container';
        c.style.cssText = 'position:fixed;bottom:2.5rem;left:50%;transform:translateX(-50%);z-index:999999;display:flex;flex-direction:column-reverse;align-items:center;gap:0.5rem;pointer-events:none;';
        document.body.appendChild(c);
        return c;
    })();
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    container.appendChild(toast);
    const dur = durationMs || 3000;
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    }, dur);
}
window.showToast = showToast;

// Helper global para copiar al portapapeles con feedback de burbuja (toast) y animación de icono
window.copyToClipboardWithToast = function(text, label, btnEl) {
    const val = (text || '').trim();
    if (!val) {
        showToast('⚠️ No hay texto para copiar');
        return;
    }

    const onCopied = () => {
        showToast(`📋 ${label} copiado al portapapeles`);
        if (btnEl) {
            btnEl.classList.add('copied');
            const origTitle = btnEl.getAttribute('title') || '';
            btnEl.setAttribute('title', '¡Copiado!');
            setTimeout(() => {
                btnEl.classList.remove('copied');
                if (origTitle) btnEl.setAttribute('title', origTitle);
            }, 1800);
        }
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(val).then(onCopied).catch(() => fallbackCopy(val, onCopied));
    } else {
        fallbackCopy(val, onCopied);
    }

    function fallbackCopy(str, cb) {
        try {
            const ta = document.createElement('textarea');
            ta.value = str;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            cb();
        } catch (e) {
            console.error('Error al copiar:', e);
            showToast('❌ Error al copiar');
        }
    }
};

// ---- NAVIGATE TO VIEW (shared by desktop + mobile nav) ----
function navigateTo(target) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const desktopBtn = document.querySelector(`.nav-item[data-target="${target}"]`);
    if (desktopBtn) desktopBtn.classList.add('active');

    document.querySelectorAll('.pill-nav-item[data-target]').forEach(n => n.classList.remove('active'));
    const pillBtn = document.querySelector(`.pill-nav-item[data-target="${target}"]`);
    if (pillBtn) {
        pillBtn.classList.add('active');
        try {
            pillBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } catch(e) {}
    }

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
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){}
}
window.navigateTo = navigateTo;

// ============================================================
// MÓDULO: CLIENTES FRECUENTES (Contactos)
// ============================================================





// --- Manage Contacts Modal ---

window.closeContactsModal = function() {
    document.getElementById('contacts-modal').style.display = 'none';
};




// ==========================================
// SISTEMA DE PRODUCTOS PERSONALIZADOS (MODERNO & DINÁMICO)
// ==========================================

const SERVICE_PRESETS = [
    { id: 'netflix', name: 'Netflix 4K UHD', type: 'individual', icon: '🍿', color: '#E50914', duration: '1 Mes', features: ['Calidad 4K HDR', '1 Pantalla privada', 'Descargas activadas', 'Garantía total'], defaultSale: 35, defaultCost: 20 },
    { id: 'disney', name: 'Disney+ Premium', type: 'individual', icon: '🏰', color: '#113CCF', duration: '1 Mes', features: ['Calidad 4K UHD', 'Catálogo Disney/Marvel/Star Wars', 'Audio Dolby Atmos'], defaultSale: 25, defaultCost: 15 },
    { id: 'max', name: 'Max Platino', type: 'individual', icon: '⚡', color: '#002BE7', duration: '1 Mes', features: ['Calidad 4K UHD', 'Contenido HBO + Discovery', 'Sin anuncios'], defaultSale: 25, defaultCost: 15 },
    { id: 'youtube', name: 'YouTube Premium', type: 'individual', icon: '▶️', color: '#FF0000', duration: '1 Mes', features: ['Sin anuncios', 'Reproducción en segundo plano', 'YouTube Music incluido'], defaultSale: 20, defaultCost: 10 },
    { id: 'spotify', name: 'Spotify Premium', type: 'individual', icon: '🎵', color: '#1DB954', duration: '1 Mes', features: ['Sin anuncios', 'Descargas offline', 'Calidad 320kbps'], defaultSale: 20, defaultCost: 10 },
    { id: 'prime', name: 'Prime Video', type: 'individual', icon: '📦', color: '#00A8E1', duration: '1 Mes', features: ['Calidad 4K UHD', 'Catálogo Prime completo', '1 Pantalla privada'], defaultSale: 20, defaultCost: 12 },
    { id: 'magis', name: 'Magis TV Pro', type: 'completa', icon: '📺', color: '#FF6B00', duration: '1 Mes', features: ['1200+ Canales en vivo', 'Series y películas', 'Deportes y PPV'], defaultSale: 65, defaultCost: 40 },
    { id: 'canva', name: 'Canva Pro', type: 'individual', icon: '🎨', color: '#00C4CC', duration: '1 Mes', features: ['100M+ Recursos premium', 'Kit de marcas y fuentes', 'Descargas ilimitadas HD'], defaultSale: 25, defaultCost: 10 },
    { id: 'capcut', name: 'CapCut Pro', type: 'individual', icon: '🎬', color: '#00E5FF', duration: '1 Mes', features: ['Efectos y transiciones Pro', 'Eliminador de fondo IA', 'Exportación 4K 60fps'], defaultSale: 25, defaultCost: 12 }
];

window.renderServicePresets = function() {
    const container = document.getElementById('cp-presets-grid');
    if (!container) return;
    container.innerHTML = '';
    
    SERVICE_PRESETS.forEach(preset => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cp-preset-chip';
        chip.dataset.presetId = preset.id;
        chip.innerHTML = `
            <span class="cp-preset-chip-dot" style="background:${preset.color};"></span>
            <span>${preset.icon} ${preset.name}</span>
        `;
        chip.onclick = () => window.applyServicePreset(preset.id);
        container.appendChild(chip);
    });
};

window.applyServicePreset = function(presetId) {
    const preset = SERVICE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    // Actualizar campos
    document.getElementById('cp-name').value = preset.name;
    window.selectProductType(preset.type);
    window.setDurationPreset(preset.duration);
    document.getElementById('cp-features').value = preset.features.join(', ');
    
    // Si los precios están vacíos o en 0, sugerir precios recomendados
    const saleInp = document.getElementById('cp-salePrice');
    const costInp = document.getElementById('cp-cost');
    if (!saleInp.value || parseFloat(saleInp.value) === 0) saleInp.value = preset.defaultSale;
    if (!costInp.value || parseFloat(costInp.value) === 0) costInp.value = preset.defaultCost;
    
    // Generar plantilla inicial
    document.getElementById('cp-wa-template').value = window.generateLocalWaTemplate(
        preset.name,
        preset.type,
        preset.duration,
        preset.features
    );

    // Resaltar chip activo
    document.querySelectorAll('.cp-preset-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.presetId === presetId);
    });

    window.calcCustomProfit();
};

window.setDurationPreset = function(durationText) {
    const inp = document.getElementById('cp-duration');
    if (inp) inp.value = durationText;

    document.querySelectorAll('.cp-chip-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === durationText.trim().toLowerCase());
    });
};

window.selectProductType = function(type) {
    // Update hidden input
    document.getElementById('cp-category').value = type;
    
    // Update switch buttons visual state
    document.querySelectorAll('.product-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    const singleCreds = document.getElementById('cp-single-credentials');
    const profileFields = document.getElementById('cp-profile-fields');
    const comboCreds = document.getElementById('cp-combo-credentials');
    
    if (type === 'combo') {
        if (singleCreds) singleCreds.style.display = 'none';
        if (comboCreds) comboCreds.style.display = 'block';
        window.updateComboIndexes();
    } else if (type === 'individual') {
        if (singleCreds) singleCreds.style.display = 'block';
        if (profileFields) profileFields.style.display = 'grid';
        if (comboCreds) comboCreds.style.display = 'none';
        document.getElementById('cp-accounts-count').value = 1;
    } else { // completa
        if (singleCreds) singleCreds.style.display = 'block';
        if (profileFields) profileFields.style.display = 'none';
        if (comboCreds) comboCreds.style.display = 'none';
        document.getElementById('cp-accounts-count').value = 1;
    }
};

window.addComboItem = function(initialName = '', initialDuration = '1 Mes') {
    const container = document.getElementById('cp-combo-items');
    if (!container) return;
    const items = container.querySelectorAll('.combo-platform-row');
    const count = items.length + 1;
    
    const item = document.createElement('div');
    item.className = 'combo-platform-row';
    item.dataset.index = count;
    item.innerHTML = `
        <div class="combo-row-badge">#${count}</div>
        <div class="ga-form-group" style="flex:2; margin-bottom:0;">
            <input type="text" class="combo-product-name" placeholder="Nombre de la plataforma (ej: Max)" value="${initialName}">
        </div>
        <div class="ga-form-group" style="flex:1; min-width:115px; margin-bottom:0;">
            <input type="text" class="combo-platform-duration" placeholder="Duración" value="${initialDuration || '1 Mes'}">
        </div>
        <button type="button" class="combo-del-btn" onclick="window.removeComboItem(this)" title="Quitar plataforma">✕</button>
    `;
    container.appendChild(item);
    window.updateComboIndexes();
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.removeComboItem = function(btn) {
    const row = btn.closest('.combo-platform-row');
    if (!row) return;
    const container = document.getElementById('cp-combo-items');
    if (container && container.querySelectorAll('.combo-platform-row').length > 1) {
        row.remove();
        window.updateComboIndexes();
    } else {
        showToast('⚠️ El combo debe tener al menos una plataforma');
    }
};

window.updateComboIndexes = function() {
    const container = document.getElementById('cp-combo-items');
    if (!container) return;
    const rows = container.querySelectorAll('.combo-platform-row');
    rows.forEach((r, idx) => {
        const badge = r.querySelector('.combo-row-badge');
        if (badge) badge.textContent = `#${idx + 1}`;
        r.dataset.index = idx + 1;
        const delBtn = r.querySelector('.combo-del-btn');
        if (delBtn) {
            delBtn.style.display = rows.length > 1 ? 'flex' : 'none';
        }
    });
    const countInput = document.getElementById('cp-accounts-count');
    if (countInput) countInput.value = rows.length;
    const countLabel = document.getElementById('cp-combo-count-label');
    if (countLabel) countLabel.textContent = `${rows.length} ${rows.length === 1 ? 'plataforma' : 'plataformas'}`;
};

window.toggleWAPlateAccordion = function() {
    const body = document.getElementById('cp-accordion-body');
    const acc = document.getElementById('cp-wa-accordion');
    if (!body || !acc) return;
    
    const isHidden = body.style.display === 'none' || !body.style.display;
    body.style.display = isHidden ? 'block' : 'none';
    acc.classList.toggle('expanded', isHidden);
};

window.insertWATag = function(tag) {
    const textarea = document.getElementById('cp-wa-template');
    if (!textarea) return;
    
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + tag + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    textarea.focus();
};

window.calcCustomProfit = function() {
    const sale = parseFloat(document.getElementById('cp-salePrice').value) || 0;
    const cost = parseFloat(document.getElementById('cp-cost').value) || 0;
    const profit = sale - cost;
    const margin = sale > 0 ? Math.round((profit / sale) * 100) : 0;
    
    const profitEl = document.getElementById('cp-profit-preview');
    const marginEl = document.getElementById('cp-margin-preview');
    const statusEl = document.getElementById('cp-profit-status');
    const cardEl = document.getElementById('cp-profit-card');

    if (profitEl) profitEl.textContent = `${profit.toFixed(2)} Bs`;
    if (marginEl) marginEl.textContent = `${margin}%`;

    if (statusEl && cardEl) {
        if (profit > 0) {
            cardEl.classList.remove('warning');
            statusEl.textContent = `✅ Rentable (${margin}%)`;
        } else if (profit === 0) {
            cardEl.classList.add('warning');
            statusEl.textContent = `⚠️ Sin margen (0%)`;
        } else {
            cardEl.classList.add('warning');
            statusEl.textContent = `🔴 Pérdida (${profit.toFixed(2)} Bs)`;
        }
    }
};

window.openCustomPlanModal = function() {
    document.getElementById('custom-plan-title').textContent = 'Nuevo Producto';
    document.getElementById('custom-plan-form').reset();
    document.getElementById('cp-id').value = '';
    document.getElementById('cp-wa-template').value = '';
    document.getElementById('cp-accounts-count').value = 1;
    
    // Clear profile & PIN inputs
    const profileInp = document.getElementById('cp-single-profile');
    const pinInp = document.getElementById('cp-single-pin');
    if (profileInp) profileInp.value = '';
    if (pinInp) pinInp.value = '';
    
    // Clear credentials inputs
    const singleEmail = document.getElementById('cp-single-email');
    const singlePass = document.getElementById('cp-single-password');
    if (singleEmail) singleEmail.value = '';
    if (singlePass) singlePass.value = '';
    
    const comboContainer = document.getElementById('cp-combo-items');
    if (comboContainer) {
        comboContainer.innerHTML = `
            <div class="combo-platform-row" data-index="1">
                <div class="combo-row-badge">#1</div>
                <div class="ga-form-group" style="flex:2; margin-bottom:0;">
                    <input type="text" class="combo-product-name" placeholder="Nombre de la plataforma (ej: Netflix)">
                </div>
                <div class="ga-form-group" style="flex:1; min-width:115px; margin-bottom:0;">
                    <input type="text" class="combo-platform-duration" placeholder="Duración" value="1 Mes">
                </div>
                <button type="button" class="combo-del-btn" onclick="window.removeComboItem(this)" title="Quitar plataforma" style="display:none;">✕</button>
            </div>
            <div class="combo-platform-row" data-index="2">
                <div class="combo-row-badge">#2</div>
                <div class="ga-form-group" style="flex:2; margin-bottom:0;">
                    <input type="text" class="combo-product-name" placeholder="Nombre de la plataforma (ej: Disney+)">
                </div>
                <div class="ga-form-group" style="flex:1; min-width:115px; margin-bottom:0;">
                    <input type="text" class="combo-platform-duration" placeholder="Duración" value="1 Mes">
                </div>
                <button type="button" class="combo-del-btn" onclick="window.removeComboItem(this)" title="Quitar plataforma">✕</button>
            </div>
        `;
        window.updateComboIndexes();
    }

    // Render & reset presets
    window.renderServicePresets();
    document.querySelectorAll('.cp-preset-chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.cp-chip-btn').forEach(b => b.classList.remove('active'));

    // Collapse WA accordion by default
    const body = document.getElementById('cp-accordion-body');
    const acc = document.getElementById('cp-wa-accordion');
    if (body) body.style.display = 'none';
    if (acc) acc.classList.remove('expanded');

    // Default duration chip
    window.setDurationPreset('1 Mes');

    // Reset switch to 'individual'
    window.selectProductType('individual');
    window.calcCustomProfit();
    
    document.getElementById('custom-plan-modal').style.display = 'flex';
};

window.closeCustomPlanModal = function() {
    document.getElementById('custom-plan-modal').style.display = 'none';
};

window.submitCustomPlan = async function() {
    const name = document.getElementById('cp-name').value.trim();
    if (!name) {
        showToast('⚠️ Ingresa un nombre para el producto');
        document.getElementById('cp-name').focus();
        return;
    }

    const duration = document.getElementById('cp-duration').value.trim() || '1 Mes';
    const id = document.getElementById('cp-id').value || `cp-${Date.now()}`;
    const featuresStr = document.getElementById('cp-features').value;
    const features = featuresStr ? featuresStr.split(',').map(f => f.trim()).filter(f => f) : [];
    
    const salePrice = parseFloat(document.getElementById('cp-salePrice').value) || 0;
    const cost = parseFloat(document.getElementById('cp-cost').value) || 0;
    const category = document.getElementById('cp-category').value;

    let waTemplate = document.getElementById('cp-wa-template').value.trim();
    if (!waTemplate) {
        waTemplate = window.generateLocalWaTemplate(
            name,
            category,
            duration,
            features
        );
    }

    // Recolectar credenciales / plataformas
    let credentials = {};
    let comboServices = [];
    if (category === 'combo') {
        const comboRows = document.querySelectorAll('#cp-combo-items .combo-platform-row');
        comboRows.forEach((row, i) => {
            const nameInput = row.querySelector('.combo-product-name');
            const durInput = row.querySelector('.combo-platform-duration');
            const srvName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : `Plataforma ${i + 1}`;
            const srvDur = (durInput && durInput.value.trim()) ? durInput.value.trim() : (duration || '1 Mes');
            comboServices.push({ name: srvName, duration: srvDur });
        });
        if (comboServices.length === 0) {
            comboServices = [
                { name: 'Plataforma 1', duration: duration || '1 Mes' },
                { name: 'Plataforma 2', duration: duration || '1 Mes' }
            ];
        }
        credentials.combo = comboServices.map(srv => ({ name: srv.name, duration: srv.duration }));
    } else {
        credentials.email = document.getElementById('cp-single-email')?.value?.trim() || '';
        credentials.password = document.getElementById('cp-single-password')?.value?.trim() || '';
        credentials.profileName = document.getElementById('cp-single-profile')?.value?.trim() || '';
        credentials.profilePin = document.getElementById('cp-single-pin')?.value?.trim() || '';
    }

    const plan = {
        id,
        name,
        category,
        duration,
        salePrice,
        cost,
        profit: salePrice - cost,
        features: features.length > 0 ? features : (category === 'combo' ? comboServices.map(s => `${s.name} (${s.duration})`) : []),
        type: category === 'combo' ? 'combo' : 'single',
        accountsCount: category === 'combo' ? comboServices.length : 1,
        comboServices: category === 'combo' ? comboServices : [],
        isCustom: true,
        credentials,
        aiWamessageTemplate: waTemplate,
        createdAt: new Date().toISOString()
    };

    // 1. Inmediatamente actualizar memoria local
    const existingIdx = customPlans.findIndex(p => p.id === id);
    if (existingIdx >= 0) {
        customPlans[existingIdx] = plan;
    } else {
        customPlans.unshift(plan);
    }
    window.customPlans = customPlans;

    // 2. Guardar en localStorage de inmediato
    try {
        localStorage.setItem('plixora_custom_plans', JSON.stringify(customPlans));
    } catch(err) {
        console.warn('Error guardando en localStorage:', err);
    }

    // 3. Renderizar de inmediato el catálogo y selector de ventas
    try {
        renderCatalog('all');
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.filter === 'all');
        });
        if (typeof window.populateSelect === 'function') {
            window.populateSelect();
        }
    } catch(err) {
        console.error('Error renderizando catálogo:', err);
    }

    // 4. Cerrar modal y mostrar confirmación
    window.closeCustomPlanModal();
    showToast('✅ ¡Producto guardado y visible en el catálogo!');

    // 5. Scroll suave y efecto resplandor en la tarjeta creada
    setTimeout(() => {
        const newCard = document.getElementById('product-card-' + plan.id);
        if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newCard.classList.add('new-product-highlight');
            setTimeout(() => newCard.classList.remove('new-product-highlight'), 3000);
        }
    }, 100);

    // 6. Sincronizar asíncronamente en segundo plano con Firestore
    if (typeof db !== 'undefined' && db) {
        db.collection('plixora_custom_plans').doc(id).set(plan)
            .then(() => {
                console.log('✅ Plan sincronizado exitosamente en la nube Firestore:', id);
            })
            .catch(e => {
                console.warn('⚠️ Guardado local exitoso. Firestore se sincronizará cuando haya conexión:', e);
            });
    }
};

window.editCustomPlan = function(id) {
    const plan = customPlans.find(p => p.id === id);
    if (!plan) return;

    document.getElementById('custom-plan-title').textContent = 'Editar Producto';
    document.getElementById('cp-id').value = plan.id;
    document.getElementById('cp-name').value = plan.name;
    
    window.selectProductType(plan.category || 'individual');
    
    document.getElementById('cp-duration').value = plan.duration;
    window.setDurationPreset(plan.duration);
    
    document.getElementById('cp-salePrice').value = plan.salePrice;
    document.getElementById('cp-cost').value = plan.cost;
    document.getElementById('cp-features').value = plan.features ? plan.features.join(', ') : '';
    document.getElementById('cp-wa-template').value = plan.aiWamessageTemplate || '';
    
    // Preset bar setup
    window.renderServicePresets();
    
    if (plan.category === 'combo') {
        const comboContainer = document.getElementById('cp-combo-items');
        if (comboContainer) {
            comboContainer.innerHTML = '';
            const services = (plan.comboServices && plan.comboServices.length > 0)
                ? plan.comboServices
                : (plan.credentials && plan.credentials.combo ? plan.credentials.combo : ['Plataforma 1', 'Plataforma 2']);
            services.forEach(srv => {
                const srvName = typeof srv === 'object' ? (srv.name || '') : srv;
                const srvDur = typeof srv === 'object' ? (srv.duration || plan.duration || '1 Mes') : (plan.duration || '1 Mes');
                window.addComboItem(srvName, srvDur);
            });
            window.updateComboIndexes();
        }
    } else if (plan.credentials) {
        const singleEmail = document.getElementById('cp-single-email');
        const singlePass = document.getElementById('cp-single-password');
        const singleProfile = document.getElementById('cp-single-profile');
        const singlePin = document.getElementById('cp-single-pin');

        if (singleEmail) singleEmail.value = plan.credentials.email || '';
        if (singlePass) singlePass.value = plan.credentials.password || '';
        if (singleProfile) singleProfile.value = plan.credentials.profileName || '';
        if (singlePin) singlePin.value = plan.credentials.profilePin || '';
    }
    
    window.calcCustomProfit();
    document.getElementById('custom-plan-modal').style.display = 'flex';
};

window.deleteCustomPlan = async function(id, name) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${name}"?\nEsto NO afectará a las ventas ya registradas.`)) return;

    // 1. Eliminar inmediatamente de memoria y localStorage
    customPlans = customPlans.filter(p => p.id !== id);
    window.customPlans = customPlans;
    try {
        localStorage.setItem('plixora_custom_plans', JSON.stringify(customPlans));
    } catch(e) {}

    // 2. Re-renderizar catálogo inmediatamente
    renderCatalog('all');
    if (typeof window.populateSelect === 'function') {
        window.populateSelect();
    }
    showToast('✅ Producto eliminado del catálogo');

    // 3. Sincronizar borrado en Firestore
    try {
        if (typeof db !== 'undefined' && db) {
            await db.collection('plixora_custom_plans').doc(id).delete();
        }
    } catch (e) {
        console.error('Error eliminando producto de Firestore:', e);
    }
};

// ==========================================
// MODAL: EDICIÓN RÁPIDA DE PRECIOS DEL CATÁLOGO
// ==========================================
window.openEditProductPriceModal = function(productId) {
    const allProds = [...(window.catalogData || []), ...(window.customPlans || [])];
    const product = allProds.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('catalog-edit-price-modal');
    if (!modal) return;

    document.getElementById('cep-product-id').value = product.id;
    document.getElementById('cep-product-title').textContent = `Editar: ${product.name}`;
    document.getElementById('cep-product-name-badge').textContent = product.name;
    document.getElementById('cep-product-duration-badge').textContent = product.duration || '1 Mes';
    document.getElementById('cep-sale-price').value = product.salePrice ?? 0;
    document.getElementById('cep-cost').value = product.cost ?? 0;

    window.calcCatalogEditProfit();
    modal.style.display = 'flex';
};

window.closeEditProductPriceModal = function() {
    const modal = document.getElementById('catalog-edit-price-modal');
    if (modal) modal.style.display = 'none';
};

window.calcCatalogEditProfit = function() {
    const salePrice = parseFloat(document.getElementById('cep-sale-price').value) || 0;
    const cost = parseFloat(document.getElementById('cep-cost').value) || 0;
    const profit = Math.round((salePrice - cost) * 100) / 100;
    const margin = salePrice > 0 ? Math.round((profit / salePrice) * 100) : 0;

    const profitEl = document.getElementById('cep-profit-preview');
    const marginEl = document.getElementById('cep-margin-badge');

    if (profitEl) {
        profitEl.textContent = `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} Bs`;
        profitEl.style.color = profit >= 0 ? '#10b981' : '#ef4444';
    }
    if (marginEl) {
        marginEl.textContent = `${margin}% Margen`;
        marginEl.style.background = profit >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
        marginEl.style.color = profit >= 0 ? '#10b981' : '#ef4444';
    }
};

window.saveCatalogProductPrice = async function() {
    const id = document.getElementById('cep-product-id').value;
    const salePrice = parseFloat(document.getElementById('cep-sale-price').value);
    const cost = parseFloat(document.getElementById('cep-cost').value);

    if (isNaN(salePrice) || isNaN(cost)) {
        showToast('⚠️ Ingresa un precio y costo válidos');
        return;
    }

    const profit = Math.round((salePrice - cost) * 100) / 100;

    // 1. Verificar si es producto estándar del catálogo o personalizado
    const standardItem = (window.catalogData || []).find(p => p.id === id);
    if (standardItem) {
        standardItem.salePrice = salePrice;
        standardItem.cost = cost;
        standardItem.profit = profit;

        catalogOverrides[id] = { salePrice, cost, profit, updatedAt: new Date().toISOString() };
        window.catalogOverrides = catalogOverrides;
        try {
            localStorage.setItem('plixora_catalog_overrides', JSON.stringify(catalogOverrides));
        } catch(e) {
            console.warn('Error guardando catalogOverrides local:', e);
        }

        if (typeof db !== 'undefined' && db) {
            db.collection('settings').doc('catalog_overrides').set(catalogOverrides, { merge: true })
                .then(() => console.log('✅ Sobrescritura de precios sincronizada en Firestore'))
                .catch(e => console.warn('Error sincronizando catalog_overrides:', e));
        }
    } else {
        const customPlan = (customPlans || []).find(p => p.id === id);
        if (customPlan) {
            customPlan.salePrice = salePrice;
            customPlan.cost = cost;
            customPlan.profit = profit;
            try {
                localStorage.setItem('plixora_custom_plans', JSON.stringify(customPlans));
            } catch(e) {}
            if (typeof db !== 'undefined' && db) {
                db.collection('plixora_custom_plans').doc(id).update({ salePrice, cost, profit })
                    .catch(e => console.warn('Error actualizando custom_plan:', e));
            }
        }
    }

    // 2. Re-renderizar catálogo y selectores de venta
    const activeFilter = document.querySelector('.filter-btn.active');
    renderCatalog(activeFilter ? activeFilter.dataset.filter : 'all');
    if (typeof populateSelect === 'function') {
        populateSelect();
    }

    // 3. Si el producto estaba seleccionado en el formulario de ventas, actualizar resumen
    const currentSelectedId = selectProduct ? selectProduct.value : null;
    if (currentSelectedId === id) {
        const summaryPrice = document.getElementById('summary-price');
        const summaryCost = document.getElementById('summary-cost');
        const summaryProfit = document.getElementById('summary-profit');
        if (summaryPrice) summaryPrice.textContent = `${salePrice} Bs`;
        if (summaryCost) summaryCost.textContent = `${cost} Bs`;
        if (summaryProfit) summaryProfit.textContent = `${profit} Bs`;
    }

    // 4. Cerrar modal y notificar
    window.closeEditProductPriceModal();
    showToast('✅ Precio actualizado correctamente');
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
    } else if (lowerName.includes('hbo') || lowerName.includes('disney') || lowerName.includes('prime') || lowerName.includes('max')) {
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
        if (category === 'individual') {
            credsBlock += `│ 👤 *Perfil:* {perfil}\n`;
            credsBlock += `│ 🔒 *PIN:* {pin}\n`;
        }
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
        .replace(/{producto}/g, plan.name)
        .replace(/{duracion}/g, plan.duration)
        .replace(/{correo}/g, (plan.credentials && plan.credentials.email) || 'cliente-premium@plixora.bo')
        .replace(/{contrasena}/g, (plan.credentials && plan.credentials.password) || 'plixora2026*')
        .replace(/{perfil}/g, (plan.credentials && plan.credentials.profileName) || 'Perfil 2')
        .replace(/{pin}/g, (plan.credentials && plan.credentials.profilePin) || '1234');

    if (plan.credentials && plan.credentials.combo) {
        plan.credentials.combo.forEach((c, idx) => {
            const i = idx + 1;
            previewText = previewText
                .replace(new RegExp(`{correo_${i}}`, 'g'), c.email || `combo${i}@plixora.bo`)
                .replace(new RegExp(`{contrasena_${i}}`, 'g'), c.password || `pass${i}*2026`);
        });
    } else {
        for (let i = 1; i <= 5; i++) {
            previewText = previewText
                .replace(new RegExp(`{correo_${i}}`, 'g'), `cuenta${i}@plixora.bo`)
                .replace(new RegExp(`{contrasena_${i}}`, 'g'), `pass${i}*2026`);
        }
    }

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

// =============================================================
// WHATSAPP BOT STATUS & MODAL CONTROLLER
// =============================================================
(function() {
    let pollIntervalId = null;

    window.updateWaBotIndicator = function(data) {
        const dot = document.getElementById('wa-bot-indicator-dot');
        const label = document.getElementById('wa-bot-indicator-label');
        const btn = document.getElementById('btn-wa-bot-status');
        if (!dot || !label) return;

        dot.classList.remove('online', 'pending', 'offline', 'local-only');

        if (data && data.isRemoteMode) {
            dot.classList.add('local-only');
            label.textContent = 'Bot Local';
            if (btn) btn.title = 'Bot de WhatsApp (Se ejecuta de forma local en tu computadora)';
            return;
        }

        if (!data || (!data.ready && !data.hasQR && data.status && data.status.includes('apagado'))) {
            dot.classList.add('offline');
            label.textContent = 'Bot Off';
            if (btn) btn.title = 'Bot de WhatsApp apagado o no iniciado';
        } else if (data.ready) {
            dot.classList.add('online');
            label.textContent = 'Bot Activo';
            if (btn) btn.title = 'Bot de WhatsApp Conectado (' + (data.phone ? '+' + data.phone : 'Listo') + ')';
        } else if (data.hasQR) {
            dot.classList.add('pending');
            label.textContent = 'Escanear QR';
            if (btn) btn.title = 'Bot de WhatsApp requiere escanear QR';
        } else {
            dot.classList.add('pending');
            label.textContent = 'Iniciando...';
            if (btn) btn.title = data.status || 'Iniciando bot...';
        }
    };

    window.openWaBotModal = function() {
        const modal = document.getElementById('wa-bot-modal');
        if (!modal) return;

        const customInput = document.getElementById('wa-bot-custom-url');
        if (customInput) {
            customInput.value = localStorage.getItem('plixora_bot_url') || window.PLIXORA_CONFIG.BOT_BASE_URL || 'http://localhost:3000';
        }

        const qrLink = document.getElementById('wa-bot-open-qr-link');
        if (qrLink) {
            qrLink.href = (window.PLIXORA_CONFIG.BOT_BASE_URL || 'http://localhost:3000') + '/qr';
        }

        modal.style.display = 'flex';
        window.checkWaBotModalStatus(false);
    };

    window.closeWaBotModal = function() {
        const modal = document.getElementById('wa-bot-modal');
        if (modal) modal.style.display = 'none';
    };

    window.saveWaBotUrl = function() {
        const input = document.getElementById('wa-bot-custom-url');
        if (!input) return;
        const val = input.value.trim();
        window.setCustomBotUrl(val);
        showToast('✅ URL del bot guardada');
    };

    window.launchLocalBot = function() {
        if (!window.PLIXORA_CONFIG.IS_LOCAL) {
            showToast('💻 El bot opera en tu computadora. Usa el lanzador en tu PC.');
            return;
        }
        window.location.href = 'plixora://start';
        showToast('🚀 Iniciando bot de WhatsApp en segundo plano...');
        setTimeout(() => {
            window.checkWaBotModalStatus(false);
        }, 3500);
        setTimeout(() => {
            window.checkWaBotModalStatus(false);
        }, 7000);
    };

    window.checkWaBotModalStatus = async function(showToastFeedback) {
        const badge = document.getElementById('wa-bot-status-badge');
        const detail = document.getElementById('wa-bot-status-detail');
        const phoneRow = document.getElementById('wa-bot-phone-row');
        const phoneVal = document.getElementById('wa-bot-phone-val');
        const qrContainer = document.getElementById('wa-bot-modal-qr-container');
        const qrImgDiv = document.getElementById('wa-bot-modal-qr-img');

        if (badge) {
            badge.style.background = 'rgba(255,255,255,0.1)';
            badge.style.color = '#aaa';
            badge.textContent = 'Comprobando...';
        }

        const data = await window.checkWaBotStatus();
        window.updateWaBotIndicator(data);

        if (!badge || !detail) return;

        if (data.isRemoteMode) {
            badge.style.background = 'rgba(59, 130, 246, 0.15)';
            badge.style.color = '#3b82f6';
            badge.textContent = '● PC LOCAL';
            detail.innerHTML = 'El bot de WhatsApp está diseñado para ejecutarse localmente en tu computadora.<br><br>💡 Para vincularlo y usarlo, abre el sistema en tu PC mediante <b>INICIAR_SISTEMA.bat</b>. Si cuentas con un túnel HTTPS (Cloudflare o VPS), puedes configurarlo abajo.';
            if (phoneRow) phoneRow.style.display = 'none';
            if (qrContainer) qrContainer.style.display = 'none';
            if (showToastFeedback) showToast('💻 El bot opera de forma local en tu PC');
            return;
        }

        if (data.ready) {
            badge.style.background = 'rgba(37,211,102,0.15)';
            badge.style.color = '#25D366';
            badge.textContent = '● CONECTADO';
            detail.textContent = data.status || 'El bot está conectado y listo para enviar mensajes.';
            if (data.phone) {
                if (phoneRow) phoneRow.style.display = 'block';
                if (phoneVal) phoneVal.textContent = '+' + data.phone;
            }
            if (qrContainer) qrContainer.style.display = 'none';
            if (showToastFeedback) showToast('✅ Bot conectado correctamente');
        } else if (data.hasQR) {
            badge.style.background = 'rgba(245,158,11,0.15)';
            badge.style.color = '#f59e0b';
            badge.textContent = '● ESCANEAR QR';
            detail.textContent = 'Se requiere vincular con WhatsApp Business.';
            if (phoneRow) phoneRow.style.display = 'none';
            if (qrContainer) {
                qrContainer.style.display = 'block';
                if (qrImgDiv) {
                    qrImgDiv.innerHTML = '<a href="' + (window.PLIXORA_CONFIG.BOT_BASE_URL) + '/qr" target="_blank" style="color:#25D366;font-weight:bold;text-decoration:underline;">Abrir página /qr para escanear</a>';
                }
            }
            if (showToastFeedback) showToast('⚠️ Escanea el código QR en /qr');
        } else {
            badge.style.background = 'rgba(239,68,68,0.15)';
            badge.style.color = '#ef4444';
            badge.textContent = '● DESCONECTADO';
            detail.textContent = data.status || 'No se pudo contactar al bot. Inicia INICIAR_BOT.bat en tu PC.';
            if (phoneRow) phoneRow.style.display = 'none';
            if (qrContainer) qrContainer.style.display = 'none';
            if (showToastFeedback) showToast('❌ Bot no alcanzable (' + (data.status || 'apagado') + ')');
        }
    };

    // Polling en segundo plano cada 30s
    function startWaBotPolling() {
        if (pollIntervalId) clearInterval(pollIntervalId);

        // Si estamos en entorno remoto sin URL personalizada configurada, no hacemos polling contra localhost
        if (!window.PLIXORA_CONFIG.IS_LOCAL && !localStorage.getItem('plixora_bot_url')) {
            window.updateWaBotIndicator({ isRemoteMode: true });
            return;
        }

        setTimeout(async () => {
            const data = await window.checkWaBotStatus();
            window.updateWaBotIndicator(data);
        }, 2000);

        pollIntervalId = setInterval(async () => {
            const data = await window.checkWaBotStatus();
            window.updateWaBotIndicator(data);
        }, 30000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startWaBotPolling);
    } else {
        startWaBotPolling();
    }
})();

// =============================================================
// BOOTSTRAP INITIALIZATION
// =============================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
