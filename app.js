// =============================================================
// PLIXORA.BO - Sistema de Ventas
// Con sincronización Firebase en tiempo real + respaldo local
// =============================================================

// ---- CATÁLOGO DE PRODUCTOS ----
const catalogData = [
    { id: 'cc-1m',    name: 'CapCut Pro',             type: 'single', duration: '1 mes',            salePrice: 70,  cost: 60,  profit: 10, features: ['Hasta 2 dispositivos'] },
    { id: 'yt-1m',    name: 'YouTube Premium',        type: 'single', duration: '1 mes',            salePrice: 25,  cost: 18,  profit: 7,  features: ['Sin anuncios', 'Segundo plano', 'Descargas offline'] },
    { id: 'nf-1m',    name: 'Netflix (Perfil)',       type: 'single', duration: '1 mes',            salePrice: 15,  cost: 8,   profit: 7,  features: ['Perfil individual', 'Contenido premium'] },
    { id: 'nf-2m',    name: 'Netflix (Perfil)',       type: 'single', duration: '2 meses',          salePrice: 29,  cost: 16,  profit: 13, features: ['Perfil individual', 'Contenido premium'] },
    { id: 'nf-cc',    name: 'Netflix (Cuenta Completa)',type: 'single', duration: '1 mes',          salePrice: 65,  cost: 42,  profit: 23, features: ['Cuenta completa', 'Hasta 5 dispositivos'] },
    { id: 'hb-1m',    name: 'HBO MAX PLATINO',        type: 'single', duration: '1 mes',            salePrice: 10,  cost: 5,   profit: 5,  features: ['Cuenta individual', 'Contenido premium'] },
    { id: 'hb-2m',    name: 'HBO MAX PLATINO',        type: 'single', duration: '2 meses',          salePrice: 18,  cost: 10,  profit: 8,  features: ['Cuenta individual', 'Contenido premium'] },
    { id: 'hb-3m',    name: 'HBO MAX PLATINO',        type: 'single', duration: '3 meses',          salePrice: 70,  cost: 50,  profit: 20, features: ['2 dispositivos', 'Contenido premium'] },
    { id: 'ds-1m',    name: 'Disney Plus Estándar',   type: 'single', duration: '1 mes',            salePrice: 10,  cost: 6.2, profit: 3.8,features: ['Sin ESPN'] },
    { id: 'pv-1m',    name: 'Prime Video',            type: 'single', duration: '1 mes',            salePrice: 30,  cost: 20,  profit: 10, features: ['Cuenta completa', '4 a 5 dispositivos'] },
    { id: 'pv-3m',    name: 'Prime Video',            type: 'single', duration: '3 meses',          salePrice: 75,  cost: 50,  profit: 25, features: ['Cuenta completa', '4 a 5 dispositivos'] },
    { id: 'cr-1m',    name: 'Crunchyroll Fan',        type: 'single', duration: '1 mes',            salePrice: 34,  cost: 26,  profit: 8,  features: ['Cuenta completa', '1 dispositivo'] },
    { id: 'cr-1y',    name: 'Crunchyroll Fan Anual',  type: 'single', duration: '1 año',            salePrice: 140, cost: 100, profit: 40, features: ['Cuenta completa', '1 dispositivo'] },
    { id: 'cr-6m',    name: 'Crunchyroll Mega Fan',   type: 'single', duration: '6 meses',          salePrice: 70,  cost: 50,  profit: 20, features: ['Cuenta completa', '2 dispositivos'] },
    { id: 'cv-edu',   name: 'Canva Pro EDU',          type: 'single', duration: '1 año',            salePrice: 18,  cost: 0,   profit: 18, features: ['Garantía de 1 año', 'A correo propio'] },
    { id: 'cv-pro',   name: 'Canva Pro Individual',   type: 'single', duration: '1 mes',            salePrice: 18,  cost: 0,   profit: 18, features: ['Kit de marca', 'Plantillas Pro'] },
    { id: 'sp-1m',    name: 'Spotify Premium',        type: 'single', duration: '1 mes',            salePrice: 20,  cost: 0,   profit: 20, features: ['Sin anuncios', 'Música offline'] },
    { id: 'sp-3m',    name: 'Spotify Premium',        type: 'single', duration: '3 meses',          salePrice: 55,  cost: 30,  profit: 25, features: ['Sin anuncios', 'Música offline'] },
    { id: 'sp-12m',   name: 'Spotify Premium',        type: 'single', duration: '12 meses',         salePrice: 150, cost: 100, profit: 50, features: ['Sin anuncios', 'Música offline'] },
    { id: 'ad-1m',    name: 'Adobe Creative Cloud',   type: 'single', duration: '1 mes',            salePrice: 65,  cost: 50,  profit: 15, features: ['Todas las Apps', 'Hasta 2 dispositivos'] },
    { id: 'vpn-1m',   name: 'Express VPN',            type: 'single', duration: '1 mes',            salePrice: 25,  cost: 18,  profit: 7,  features: ['De 4 a 8 dispositivos'] },
    // COMBOS PRINCIPALES
    { id: 'cb-stream', name: 'Combo Stream',          type: 'combo',  duration: '1 mes',            salePrice: 32,  cost: 24.2, profit: 7.8, features: ['Disney+', 'YouTube Premium'] },
    { id: 'cb-diseno', name: 'Combo Diseño',          type: 'combo',  duration: '1 mes',            salePrice: 80,  cost: 50,   profit: 30, features: ['Canva EDU', 'Adobe Creative Cloud'] },
    { id: 'cb-creator',name: 'Combo Creator Pro',     type: 'combo',  duration: '1 mes',            salePrice: 125, cost: 110,  profit: 15, features: ['CapCut Pro', 'Adobe Creative Cloud'] },
    { id: 'cb-office', name: 'Combo Office',          type: 'combo',  duration: '1 año',            salePrice: 160, cost: 100,  profit: 60, features: ['Microsoft 365', 'Canva EDU'] },
    { id: 'cb-ultra',  name: 'Combo Ultra',           type: 'combo',  duration: 'Mix',              salePrice: 210, cost: 150,  profit: 60, features: ['Microsoft 365', 'Adobe', 'Canva EDU'] },
    { id: 'cb-privado',name: 'Combo Privado',         type: 'combo',  duration: '1 mes',            salePrice: 45,  cost: 36,   profit: 9,  features: ['Express VPN', 'YouTube Premium'] }
];

// ---- ZONA HORARIA BOLIVIA (UTC-4) ----
function nowBolivia() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
}

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

// ---- INICIALIZACIÓN ----
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    renderCatalog('all');
    populateSelect();
    setupForm();
    updateCurrentDate();
    setupPeriodTabs();
    setupHistoryControls();
    initFirebase();
});

// ---- PERIOD TABS ----
let currentPeriod = 'today';
const PAGE_TITLES = { dashboard:'Dashboard', catalog:'Catálogo', newsale:'Nueva Venta', history:'Historial', netflix:'Netflix' };

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

function filterSalesByPeriod(salesArr) {
    const now = nowBolivia();
    if (currentPeriod === 'all') return salesArr;
    return salesArr.filter(s => {
        const d = new Date(s.date);
        if (currentPeriod === 'today') {
            return d.toDateString() === now.toDateString();
        } else if (currentPeriod === 'week') {
            const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
            return d >= weekAgo;
        } else if (currentPeriod === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
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

                    if (fromServer) {
                        setCloudStatus('online');
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

// Migrar ventas locales que no están en Firebase (ejecución única)
async function migrateLocalToFirebase() {
    // DESACTIVADO: Se desactiva esta función porque causaba el error de "datos zombie".
    // Si un dispositivo eliminaba una venta, otro dispositivo que aún la tenía en su localStorage
    // la volvía a subir a Firebase al abrir la aplicación.
    return;
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
    const topBar = document.querySelector('.top-bar');
    if (topBar) topBar.insertAdjacentElement('afterend', banner);
    updateDashboard();
}

// Actualiza el indicador de estado en la barra superior
function setCloudStatus(status, detail) {
    const el = document.getElementById('cloud-status-indicator');
    if (!el) return;

    el.dataset.status = status;

    const configs = {
        connecting: { text: '⏳ Conectando...', cls: 'status-connecting' },
        online:     { text: '☁️ Sincronizado', cls: 'status-online' },
        cache:      { text: '💾 Caché local',  cls: 'status-cache' },
        error:      { text: '❌ Sin sync',     cls: 'status-error' },
    };
    const cfg = configs[status] || configs.error;
    el.innerHTML = cfg.text;
    el.className = 'cloud-status-indicator ' + cfg.cls;
    if (detail) el.title = `Error: ${detail}. Haz clic para reintentar.`;
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
async function saveSale(newSale) {
    if (db) {
        // Firebase: el listener onSnapshot actualiza la UI automáticamente
        await db.collection('plixora_sales').doc(newSale.id).set(newSale);
    } else {
        // Fallback local
        sales.push(newSale);
        localStorage.setItem('plixora_sales', JSON.stringify(sales));
        updateDashboard();
    }
}

// ---- ELIMINAR VENTA ----
window.removeSale = async function(id) {
    if (db) {
        await db.collection('plixora_sales').doc(id).delete();
    } else {
        sales = sales.filter(s => s.id !== id);
        localStorage.setItem('plixora_sales', JSON.stringify(sales));
        updateDashboard();
    }
}

// ---- CALCULAR VENCIMIENTO ----
function calculateExpirationDate(durationStr) {
    const today = nowBolivia();
    if (durationStr.includes('35 días')) {
        today.setDate(today.getDate() + 35);
        return today.toISOString();
    }
    
    const monthMatch = durationStr.match(/(\d+)\s*mes(es)?/i);
    if (monthMatch) {
        const months = parseInt(monthMatch[1], 10);
        today.setMonth(today.getMonth() + months);
        return today.toISOString();
    }

    return null;
}

// ---- BADGE DE VENCIMIENTO ----
function buildExpireBadge(expireDate) {
    if (!expireDate) return '<span style="color: var(--text-muted); font-size: 0.85rem;">Indefinido</span>';

    const today = nowBolivia(); today.setHours(0,0,0,0);
    const expDate = new Date(expireDate); expDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((expDate - today) / 86400000);

    let color, text;
    if (diffDays < 0) {
        color = 'var(--accent-red)';
        text = `Venció hace ${Math.abs(diffDays)} d.`;
    } else if (diffDays === 0) {
        color = '#f59e0b';
        text = 'Vence HOY ⚠️';
    } else if (diffDays <= 5) {
        color = '#f59e0b';
        text = `En ${diffDays} días ⚠️`;
    } else {
        color = 'var(--accent-green)';
        text = `En ${diffDays} días`;
    }

    return `<div style="display:flex; flex-direction:column; gap:0.2rem;">
        <span style="font-size:0.85rem;">${new Date(expireDate).toLocaleDateString('es-ES')}</span>
        <span style="color:${color}; font-size:0.75rem; font-weight:600; background:${color}20; padding:0.15rem 0.5rem; border-radius:4px; display:inline-block;">${text}</span>
    </div>`;
}

// ---- NAVEGACIÓN ----
function setupNavigation() {
    // Desktop sidebar buttons
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.target));
    });

    // Mobile bottom nav buttons
    document.querySelectorAll('.mobile-nav-item[data-target]').forEach(item => {
        item.addEventListener('click', () => navigateTo(item.dataset.target));
    });

    // Mobile WA button (same as desktop WA button)
    const mobileWABtn = document.getElementById('btn-generate-wa-mobile');
    if (mobileWABtn) {
        mobileWABtn.addEventListener('click', () => {
            document.getElementById('btn-generate-wa').click();
        });
    }
}

// ---- CATÁLOGO ----
function renderCatalog(filter) {
    productsGrid.innerHTML = '';
    const data = filter === 'all' ? catalogData : catalogData.filter(p => p.type === filter);

    data.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        const isCombo = product.type === 'combo';
        const badgeColor = isCombo ? 'style="color:var(--accent-red);background:rgba(239,68,68,0.15);"' : '';
        card.innerHTML = `
            <div class="product-badge" ${badgeColor}>${isCombo ? '🔥 COMBO' : 'CUENTA'}</div>
            <div class="product-type">${product.duration}</div>
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">${product.salePrice} <span>Bs</span></div>
            <ul class="product-features">${product.features.map(f => `<li>${f}</li>`).join('')}</ul>
            <div class="product-profit">Ganancia: ${product.profit} Bs</div>
        `;
        productsGrid.appendChild(card);
    });
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
    const grpSingle = document.createElement('optgroup'); grpSingle.label = 'Cuentas Individuales';
    const grpCombo  = document.createElement('optgroup'); grpCombo.label  = 'Combos 🔥';

    catalogData.forEach(p => {
        if (p.id.startsWith('nf-')) return; // Ocultar Netflix del formulario genérico
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.duration}) - ${p.salePrice} Bs`;
        (p.type === 'single' ? grpSingle : grpCombo).appendChild(opt);
    });
    selectProduct.appendChild(grpSingle);
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
        waVal = waVal.replace(/[^0-9]/g, '');
        if (waVal.startsWith('591')) waVal = waVal.substring(3);

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

        try {
            await saveSale(newSale);
            formNewSale.reset();
            saleSummary.style.display = 'none';
            showToast('✅ Venta registrada y sincronizada');
            
            // INTENTO DE ENVIAR WHATSAPP AUTOMÁTICO AL CLIENTE (Si es que el bot está encendido y tiene número)
            if (newSale.customer && newSale.customer !== 'Anónimo') {
                const messageText = `¡Hola! Aquí tienes los detalles de tu compra en PLIXORA.BO 🌟\n\n` + generateSaleDetailsText(newSale);
                
                try {
                    const response = await fetch('https://plixora-bot.duckdns.org/api/send-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone: newSale.customer, message: messageText })
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
            console.error(err);
            showToast('❌ Error al guardar. Reintentando...');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrar Venta';
        }
    });
}

// ---- DASHBOARD ----
function updateDashboard() {
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
    mRev.textContent = filtered.reduce((s, v) => s + v.price,  0);
    mProf.textContent = filtered.reduce((s, v) => s + v.profit, 0);

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

function renderSalesTable(filtered) {
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
}

function renderHistoryTable() {
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
                    <button class="btn-icon" title="Ver Detalle" onclick="openSaleDetail('${sale.id}')" style="color:var(--accent-blue);">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.574-3.007-9.964-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    </button>
                    <button class="btn-icon copy"   title="Copiar Detalle"     onclick="copySaleDetail('${sale.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/></svg>
                    </button>
                    <button class="btn-icon notify" title="${sale.notifiedRenewal ? 'Aviso Enviado' : 'Aviso Renovación WA'}" onclick="notifyRenewal('${sale.id}')" style="color:${sale.notifiedRenewal ? '#fff' : ''};background:${sale.notifiedRenewal ? '#10b981' : ''};border-color:${sale.notifiedRenewal ? '#10b981' : ''};">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
                    </button>
                    <button class="btn-icon delete" title="Eliminar Venta"      onclick="deleteSale('${sale.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderExpirationAlerts();
}

function renderExpirationAlerts() {
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

    // Filter valid sales and process them
    sales.forEach(sale => {
        if (!sale.expireDate) return;
        const expDate = new Date(sale.expireDate); expDate.setHours(0,0,0,0);
        const diffDays = Math.ceil((expDate - today) / 86400000);

        if (diffDays <= 7) {
            const itemHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.7); padding:0.6rem; border-radius:8px; border:1px solid var(--border); font-size:0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: var(--ease);">
                    <div>
                        <strong style="display:block; color:var(--text-main); margin-bottom: 0.2rem;">${sale.productName}</strong>
                        <span style="color:var(--text-muted); font-size: 0.8rem; display: flex; align-items: center; gap: 0.2rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:12px;height:12px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                            ${sale.customerName || sale.customer}
                        </span>
                    </div>
                    <div style="display:flex; gap:0.6rem; align-items:center;">
                        <span style="color:${diffDays <= 3 ? '#ef4444' : '#d97706'}; font-weight:700; font-size: 0.8rem; background: ${diffDays <= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'}; padding: 0.2rem 0.4rem; border-radius: 4px;">${diffDays <= 0 ? (diffDays === 0 ? 'Vence HOY' : 'Vencido') : `En ${diffDays} d`}</span>
                        <button class="btn-icon notify" onclick="notifyRenewal('${sale.id}')" style="width:30px;height:30px;border-color:${sale.notifiedRenewal ? '#10b981' : 'rgba(16,185,129,0.3)'};color:${sale.notifiedRenewal ? '#fff' : '#10b981'};background:${sale.notifiedRenewal ? '#10b981' : 'transparent'};" title="${sale.notifiedRenewal ? 'Aviso Enviado' : 'Notificar a Cliente'}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg></button>
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

    if (urgentCount === 0) urgentList.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:0.5rem; text-align: center; border: 1px dashed var(--border); border-radius: 8px;">✅ Sin urgencias.</div>';
    if (soonCount === 0) soonList.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem; padding:0.5rem; text-align: center; border: 1px dashed var(--border); border-radius: 8px;">✅ Sin vencimientos próximos.</div>';

    const totalAlerts = urgentCount + soonCount;
    const badgeDesktop = document.getElementById('nav-badge-desktop');
    const badgeMobile = document.getElementById('nav-badge-mobile');

    if (totalAlerts > 0) {
        badgeCount.textContent = totalAlerts;
        badge.dataset.open = "true";
        if (badgeDesktop) badgeDesktop.dataset.open = "true";
        if (badgeMobile) badgeMobile.dataset.open = "true";
    } else {
        badge.dataset.open = "false";
        if (badgeDesktop) badgeDesktop.dataset.open = "false";
    }
}

function generateSaleDetailsText(sale) {
    let text = sale.customerName ? `👤 Cliente: ${sale.customerName}\n\n` : '';
    const prodName = (sale.productName || '').toLowerCase();
    
    const prodWithCode = sale.orderCode ? `${sale.productName} / ${sale.orderCode}` : sale.productName;
    const codeLine = sale.orderCode ? `🎫 *Pedido:* ${sale.orderCode}\n` : '';

    if (prodName.includes('capcut')) {
        text += `*${sale.productName}*\n${codeLine}\nCorreo: ${sale.email || ''}\nContraseña: ${sale.password || ''}\n\n(Prohibido cambiar o tocar la facturación mensual de CapCut. Prohibido cambiar la contraseña. Caso contrario, la cuenta será dada de baja automáticamente.)\n\nPLIXORA.BO`;
    } else if (prodName.includes('spotify')) {
        text += `*${sale.productName}*\n${codeLine}\nCorreo: ${sale.email || ''}\nContraseña: ${sale.password || ''}\n\n(Prohibido cambiar la contraseña. Caso contrario, la cuenta será dada de baja automáticamente.)\n\nPLIXORA.BO`;
    } else if (prodName.includes('netflix')) {
        text += `*${sale.productName}*\n${codeLine}\nCorreo: ${sale.email || ''}\nContraseña: ${sale.password || ''}\n\n(Prohibido cambiar la contraseña y prohibido entrar a otros perfiles. Caso contrario, la cuenta será dada de baja automáticamente.)\n\nPLIXORA.BO`;
    } else if (prodName.includes('disney')) {
        text += `*${sale.productName}*\n${codeLine}\nCorreo: ${sale.email || ''}\nContraseña: ${sale.password || ''}\n\n(Prohibido cambiar la contraseña y correo. Caso contrario, la cuenta será dada de baja automáticamente.)\n\nPLIXORA.BO`;
    } else if (prodName.includes('canva')) {
        text += `*${sale.productName}*\n${codeLine}\nHola ${sale.customerName || 'Cliente'} 👋,\n\nSe ha activado y mandado la invitación vía correo al siguiente email:\n📧 ${sale.email || ''}\n\nPor favor, revisar y aceptar la invitación. Luego, asegurarse de estar en el equipo *PLIXORA (CLASS)* para que tenga acceso siempre a los beneficios Pro.\n\nPLIXORA.BO`;
    } else if (prodName.includes('crunchyroll')) {
        const isAnual = prodName.includes('anual');
        text += `🍥 *INFORMACIÓN – CRUNCHYROLL FAN${isAnual ? ' ANUAL' : ''}*

Crunchyroll Fan${isAnual ? ' Anual' : ''} se entrega como cuenta completa individual, lista para usar.

📌 *Duración:* ${isAnual ? '1 año' : '1 mes'}
💰 *Precio:* ${isAnual ? '140 Bs' : '34 Bs'}
👤 *Tipo:* Cuenta completa individual
📺 *Plan:* Fan
📱 *Dispositivos:* Solo 1 dispositivo
📩 *Entrega:* Correo y contraseña de la cuenta
⚡ *Entrega:* Inmediata, según disponibilidad

Correo: ${sale.email || ''}
Contraseña: ${sale.password || ''}

Ideal para ${isAnual ? 'tener acceso por largo tiempo sin renovar cada mes' : 'disfrutar anime desde tu dispositivo'}.

✅ Garantía completa incluida en PLIXORA.BO`;
    } else {
        text += `Venta: ${sale.productName}\nPrecio: ${sale.price} Bs\nFecha: ${new Date(sale.date).toLocaleDateString('es-ES')}\nCliente WA: ${sale.customer}`;
        if (sale.email)      text += `\nCorreo: ${sale.email}`;
        if (sale.password)   text += `\nContraseña: ${sale.password}`;
        if (sale.expireDate) text += `\nVencimiento: ${new Date(sale.expireDate).toLocaleDateString('es-ES')}`;
    }
    return text;
}

// ---- ACCIONES HISTORIAL ----
window.copySaleDetail = function(id) {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;

    const text = generateSaleDetailsText(sale);
    navigator.clipboard.writeText(text).then(() => showToast('📋 Detalle copiado'));
};

let pendingHistNotifyPayload = null;

window.closeHistNotify = function() {
    document.getElementById('hist-notify-modal').style.display = 'none';
    pendingHistNotifyPayload = null;
};

window.notifyRenewal = function(id) {
    const sale = sales.find(s => s.id === id);
    if (!sale || sale.customer === 'Anónimo') { showToast('❌ Sin número de cliente válido'); return; }

    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    let vencLabel = 'próximamente';
    if (sale.expireDate) {
        const expDate = new Date(sale.expireDate); expDate.setHours(0,0,0,0);
        vencLabel = `${expDate.getDate()} de ${meses[expDate.getMonth()]} de ${expDate.getFullYear()}`;
    }

    let extraData = '';
    if (sale.email) {
        extraData += `\uD83D\uDCE7 *Correo:* ${sale.email}\n`;
    }
    if (sale.password) {
        extraData += `\uD83D\uDD11 *Contrase\u00F1a:* ${sale.password}\n`;
    }

    const prodWithCode = sale.orderCode ? `${sale.productName} / ${sale.orderCode}` : sale.productName;
    const msg = `\u26A0\uFE0F *AVISO DE VENCIMIENTO \u2013 PLIXORA.BO* \u26A0\uFE0F\n\n` +
                `Hola ${sale.customerName || ''} \uD83D\uDC4B\n` +
                `Tu suscripción de *${prodWithCode}* est\u00E1 pr\u00F3xima a vencer.\n\n` +
                extraData +
                `\uD83D\uDCC5 *Vence el:* ${vencLabel}\n\n` +
                `Para continuar, responde con una opci\u00F3n:\n\n` +
                `\u2705 *RENOVAR*\n` +
                `\u274C *NO RENOVAR*\n\n` +
                `Quedamos atentos a tu respuesta \uD83D\uDE0A\n` +
                `*PLIXORA.BO*`;

    pendingHistNotifyPayload = { id: sale.id, phone: sale.customer, cliente: sale.customerName || sale.customer };

    document.getElementById('hist-notify-cliente').textContent = pendingHistNotifyPayload.cliente + ' (' + pendingHistNotifyPayload.phone + ')';
    document.getElementById('hist-notify-msg').value = msg;
    
    document.getElementById('hist-notify-modal').style.display = 'flex';
};

window.confirmHistNotifySend = async function() {
    if (!pendingHistNotifyPayload) return;
    const { phone, cliente } = pendingHistNotifyPayload;
    const msg = document.getElementById('hist-notify-msg').value.trim();
    
    if (!msg) { showToast('❌ El mensaje no puede estar vacío'); return; }

    closeHistNotify();
    showToast('📤 Enviando aviso por WhatsApp...');

    try {
        const resp = await fetch('https://plixora-bot.duckdns.org/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, message: msg })
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error || 'Error enviando mensaje');

        const saleId = pendingHistNotifyPayload.id;
        if (db) {
            await db.collection('plixora_sales').doc(saleId).update({ notifiedRenewal: true });
        } else {
            const idx = sales.findIndex(s => s.id === saleId);
            if (idx !== -1) {
                sales[idx].notifiedRenewal = true;
                localStorage.setItem('plixora_sales', JSON.stringify(sales));
            }
        }
        updateDashboard(); // Re-render tables to show green button

        showToast('✅ Aviso enviado a ' + cliente);
    } catch (error) {
        console.error('Error enviando aviso:', error);
        showToast('❌ Error: ' + error.message);
    }
};

window.deleteSale = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    try {
        await removeSale(id);
        showToast('🗑️ Venta eliminada');
    } catch (e) {
        showToast('❌ Error al eliminar');
    }
};

let currentEditingSaleId = null;

window.openSaleDetail = function(id) {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;
    currentEditingSaleId = id;

    document.getElementById('hd-product').textContent = sale.productName || '—';
    document.getElementById('hd-price').textContent = sale.price || '0';
    document.getElementById('hd-profit').textContent = sale.profit || '0';
    document.getElementById('hd-date').textContent = new Date(sale.date).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
    document.getElementById('hd-expire').textContent = sale.expireDate ? new Date(sale.expireDate).toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' }) : 'Indefinido';
    document.getElementById('hd-email').textContent = sale.email || '—';
    document.getElementById('hd-password').textContent = sale.password || '—';

    document.getElementById('hd-customer-name').value = sale.customerName || '';
    document.getElementById('hd-customer-wa').value = sale.customer !== 'Anónimo' ? sale.customer : '';

    document.getElementById('history-detail-modal').style.display = 'flex';
};

window.closeSaleDetail = function() {
    document.getElementById('history-detail-modal').style.display = 'none';
    currentEditingSaleId = null;
};

window.saveCustomerEdit = async function() {
    if (!currentEditingSaleId) return;
    const name = document.getElementById('hd-customer-name').value.trim();
    const wa = document.getElementById('hd-customer-wa').value.trim() || 'Anónimo';

    const oldSale = sales.find(s => s.id === currentEditingSaleId);

    if (db) {
        try {
            await db.collection('plixora_sales').doc(currentEditingSaleId).update({
                customerName: name,
                customer: wa
            });
            showToast('✅ Datos del cliente actualizados');
            
            if (oldSale && oldSale.productName && oldSale.productName.includes('Netflix Perfil')) {
                await syncNetflixProfileEdit(oldSale, name, wa);
            }
            
            closeSaleDetail();
        } catch(e) {
            console.error(e);
            showToast('❌ Error al actualizar datos');
        }
    } else {
        const idx = sales.findIndex(s => s.id === currentEditingSaleId);
        if (idx !== -1) {
            sales[idx].customerName = name;
            sales[idx].customer = wa;
            localStorage.setItem('plixora_sales', JSON.stringify(sales));
            updateDashboard();
            
            if (oldSale && oldSale.productName && oldSale.productName.includes('Netflix Perfil')) {
                syncNetflixProfileEdit(oldSale, name, wa);
            }

            showToast('✅ Datos del cliente actualizados (Local)');
            closeSaleDetail();
        }
    }
};

async function syncNetflixProfileEdit(sale, newName, newWa) {
    if (typeof nfAccounts === 'undefined') return;
    
    const match = sale.productName.match(/Perfil (.*?) \((.*?)\)/);
    if (!match) return;
    const pNombre = match[1];
    const accCodigo = match[2];
    
    const acc = nfAccounts.find(a => a.codigo === accCodigo);
    if (!acc) return;
    
    const pIdx = acc.perfiles.findIndex(p => p.nombre === pNombre);
    if (pIdx !== -1) {
        const perfiles = [...acc.perfiles];
        perfiles[pIdx].cliente = newName;
        perfiles[pIdx].whatsapp = newWa;
        
        acc.perfiles = perfiles;
        
        try {
            if (db) {
                await db.collection('netflix_accounts').doc(acc.id).update({ perfiles });
            } else {
                localStorage.setItem('nf_accounts', JSON.stringify(nfAccounts));
            }
            if (typeof window.nfRenderAll === 'function') window.nfRenderAll();
            if (typeof window.nfRenderDetailModal === 'function' && typeof window.nfGetCurrentDetailId === 'function') {
                const currentId = window.nfGetCurrentDetailId();
                if (currentId === acc.id) window.nfRenderDetailModal(acc.id);
            }
        } catch(e) { console.error('Error syncing netflix edit', e); }
    }
}

// ---- GENERAR MENÚ WA ----
btnGenerateWA.addEventListener('click', () => {
    const text = `🏪 *PLIXORA.BO – CATÁLOGO GENERAL*

🎬 *CAPCUT PRO*
• 1 mes → 70 Bs
• Hasta 2 dispositivos

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
• 1 mes → 49 Bs
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

🚀 Combo Creator Pro (CapCut Pro + Adobe Creative Cloud) → 125 Bs

💻 Combo Office (Microsoft 365 + Canva EDU) → 160 Bs

👑 Combo Ultra (Microsoft 365 + Adobe + Canva EDU) → 210 Bs

🛡️ Combo Privado (Express VPN + YouTube Premium) → 45 Bs

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

    document.querySelectorAll('.mobile-nav-item[data-target]').forEach(n => n.classList.remove('active'));
    const mobileBtn = document.querySelector(`.mobile-nav-item[data-target="${target}"]`);
    if (mobileBtn) mobileBtn.classList.add('active');

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
