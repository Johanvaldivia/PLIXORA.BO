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
let db = null;
let unsubscribe = null;

// ---- DOM ----
const navItems      = document.querySelectorAll('.nav-item');
const views         = document.querySelectorAll('.view');
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
function initSnapshot() {
    if (!db) return;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    unsubscribe = db.collection('plixora_sales')
        .orderBy('date', 'desc')
        .onSnapshot(
            { includeMetadataChanges: true },
            snapshot => {
                const fromServer = !snapshot.metadata.fromCache;
                sales = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                localStorage.setItem('plixora_sales', JSON.stringify(sales));
                updateDashboard();
                setCloudStatus(fromServer ? 'online' : 'cache');
            },
            error => {
                setCloudStatus('error', error.message);
                showToast(`❌ Error Firebase: ${error.code}`);
            }
        );
}

// ---- GUARDAR VENTA ----

// ---- ELIMINAR VENTA ----

// ---- CALCULAR VENCIMIENTO ----

// ---- BADGE DE VENCIMIENTO ----

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
    let data;
    if (filter === 'all') {
        data = catalogData;
    } else if (filter === 'individual' || filter === 'completa' || filter === 'combo') {
        data = catalogData.filter(p => p.category === filter);
    } else {
        data = catalogData.filter(p => p.type === filter);
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
    card.innerHTML = `
        <div class="product-badge" ${badgeStyle}>${badgeText}</div>
        <div class="product-type">${product.duration}</div>
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">${priceDisplay}</div>
        <ul class="product-features">${product.features.map(f => `<li>${f}</li>`).join('')}</ul>
        <div class="product-profit">${profitDisplay}</div>
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

    catalogData.forEach(p => {
        if (p.id.startsWith('nf-')) return; // Ocultar Netflix del formulario genérico
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.duration}) - ${p.salePrice} Bs`;
        if (p.type === 'combo') {
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

    selectProduct.addEventListener('change', e => {
        const p = catalogData.find(x => x.id === e.target.value);
        if (p) {
            document.getElementById('summary-price').textContent  = `${p.salePrice} Bs`;
            document.getElementById('summary-cost').textContent   = `${p.cost} Bs`;
            document.getElementById('summary-profit').textContent = `${p.profit} Bs`;
            saleSummary.style.display = 'block';
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

        const product = catalogData.find(p => p.id === productId);
        const submitBtn = formNewSale.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        let waVal = document.getElementById('sale-customer').value.trim();
        waVal = sanitizeBoliviaPhone(waVal);

        const timestampId = Date.now().toString();
        const code = 'PLX-' + Math.floor(1000 + Math.random() * 9000); // e.g. PLX-4829

        const newSale = {
            id:          timestampId,
            orderCode:   code,
            date:        nowBolivia().toISOString(),
            productName: `${product.name} (${product.duration})`,
            price:       product.salePrice,
            profit:      product.profit,
            customerName:document.getElementById('sale-customer-name').value.trim() || '',
            customer:    waVal || 'Anónimo',
            email:       document.getElementById('sale-email').value.trim()    || '',
            password:    document.getElementById('sale-password').value.trim() || '',
            expireDate:  calculateExpirationDate(product.duration)
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

        if (sendWhatsApp && newSale.customer && newSale.customer !== 'Anónimo' && window.pendingSaleContext) {
            try {
                const response = await fetch(window.PLIXORA_CONFIG.WA_BOT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: newSale.customer, message: window.pendingSaleContext.messageText })
                });
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

// ---- ONE-TIME HISTORY REPAIR ----
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!db || window.netflixNamesFixed) return;
        window.netflixNamesFixed = true;
        db.collection('plixora_sales').get().then(snap => {
            const b = db.batch();
            let count = 0;
            snap.forEach(doc => {
                const s = doc.data();
                let newName = s.productName || '';
                let changed = false;

                if (s.customer === '75650364' && newName.includes('Netflix (Perfil)')) {
                    newName = 'Netflix Perfil P3 (NF-001)';
                    changed = true;
                }
                if (s.customer === '75650364' && newName.includes('[2 Meses]')) {
                    newName = newName.replace(' [2 Meses]', '');
                    changed = true;
                }
                if (s.customer === '62045098' && newName.includes('P5')) {
                    newName = newName.replace('P5', 'P3');
                    changed = true;
                }
                if (changed) {
                    b.update(doc.ref, { productName: newName });
                    count++;
                }
            });
            if (count > 0) b.commit().then(() => console.log('Historial reparado', count));
        }).catch(e => console.error(e));

        // One-time fix for Netflix account '2 Meses' bug for Jhulian
        db.collection('netflix_accounts').where('codigo', '==', 'NF-001').get().then(snap => {
            if (!snap.empty) {
                const doc = snap.docs[0];
                const acc = doc.data();
                let changed = false;
                const perfiles = [...acc.perfiles];
                const pIdx = perfiles.findIndex(p => p.whatsapp === '75650364');
                if (pIdx !== -1 && perfiles[pIdx].plan === '2m') {
                    perfiles[pIdx].plan = '1m';
                    changed = true;
                }
                if (changed) {
                    db.collection('netflix_accounts').doc(doc.id).update({ perfiles });
                    console.log('Perfil NF-001 reparado: Plan vuelto a 1m');
                }
            }
        }).catch(e => console.error(e));

    }, 4000);
});

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
