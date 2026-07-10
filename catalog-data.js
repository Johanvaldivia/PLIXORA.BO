// =============================================================
// CATÁLOGO DE PRODUCTOS - PLIXORA.BO
// =============================================================

window.catalogData = [
    // ── CUENTAS INDIVIDUALES (perfiles / invitaciones) ──
    { id: 'yt-1m',    name: 'YouTube Premium',        type: 'single', category: 'individual', duration: '1 mes',    salePrice: 25,  cost: 18,  profit: 7,  features: ['Sin anuncios', 'Segundo plano', 'Descargas offline'] },
    { id: 'nf-1m',    name: 'Netflix (Perfil)',       type: 'single', category: 'individual', duration: '1 mes',    salePrice: 15,  cost: 8,   profit: 7,  features: ['Perfil individual', 'Contenido premium'] },
    { id: 'nf-2m',    name: 'Netflix (Perfil)',       type: 'single', category: 'individual', duration: '2 meses',  salePrice: 29,  cost: 16,  profit: 13, features: ['Perfil individual', 'Contenido premium'] },
    { id: 'hb-1m',    name: 'HBO MAX PLATINO',        type: 'single', category: 'individual', duration: '1 mes',    salePrice: 10,  cost: 5,   profit: 5,  features: ['Cuenta individual', 'Contenido premium'] },
    { id: 'hb-2m',    name: 'HBO MAX PLATINO',        type: 'single', category: 'individual', duration: '2 meses',  salePrice: 18,  cost: 10,  profit: 8,  features: ['Cuenta individual', 'Contenido premium'] },
    { id: 'hb-3m',    name: 'HBO MAX PLATINO',        type: 'single', category: 'individual', duration: '3 meses',  salePrice: 70,  cost: 50,  profit: 20, features: ['2 dispositivos', 'Contenido premium'] },
    { id: 'ds-1m',    name: 'Disney Plus Estándar',   type: 'single', category: 'individual', duration: '1 mes',    salePrice: 10,  cost: 6.2, profit: 3.8,features: ['Sin ESPN'] },
    { id: 'cv-edu',   name: 'Canva Pro EDU',          type: 'single', category: 'individual', duration: '1 año',    salePrice: 18,  cost: 0,   profit: 18, features: ['Garantía de 1 año', 'A correo propio'] },
    { id: 'cv-pro',   name: 'Canva Pro Individual',   type: 'single', category: 'individual', duration: '1 mes',    salePrice: 18,  cost: 0,   profit: 18, features: ['Kit de marca', 'Plantillas Pro'] },
    { id: 'gp-1m',    name: 'Gemini Pro',             type: 'single', category: 'individual', duration: '1 mes',    salePrice: 15,  cost: 0,   profit: 15, features: ['Inteligencia artificial premium', 'Directo a correo'] },
    { id: 'gp-2m',    name: 'Gemini Pro',             type: 'single', category: 'individual', duration: '2 meses',  salePrice: 30,  cost: 0,   profit: 30, features: ['Inteligencia artificial premium', 'Directo a correo'] },
    { id: 'pv-perfil',name: 'Prime Video (Perfil)',   type: 'single', category: 'individual', duration: '1 mes',    salePrice: 10,  cost: 5,   profit: 5,  features: ['Perfil individual', '1 dispositivo'] },
    // ── CUENTAS COMPLETAS ──
    { id: 'sp-1m',    name: 'Spotify Premium',        type: 'single', category: 'completa',   duration: '1 mes',    salePrice: 20,  cost: 0,   profit: 20, features: ['Sin anuncios', 'Música offline'] },
    { id: 'sp-3m',    name: 'Spotify Premium',        type: 'single', category: 'completa',   duration: '3 meses',  salePrice: 55,  cost: 30,  profit: 25, features: ['Sin anuncios', 'Música offline'] },
    { id: 'sp-6m',    name: 'Spotify Premium',        type: 'single', category: 'completa',   duration: '6 meses',  salePrice: 80,  cost: 55,  profit: 25, features: ['Sin anuncios', 'Música offline'] },
    { id: 'sp-12m',   name: 'Spotify Premium',        type: 'single', category: 'completa',   duration: '12 meses', salePrice: 150, cost: 100, profit: 50, features: ['Sin anuncios', 'Música offline'] },
    { id: 'nf-cc',    name: 'Netflix (Cuenta Completa)',type: 'single',category: 'completa',   duration: '1 mes',    salePrice: 65,  cost: 42,  profit: 23, features: ['Cuenta completa', 'Hasta 5 dispositivos'] },
    { id: 'cc-1m',    name: 'CapCut Pro',             type: 'single', category: 'completa',   duration: '1 mes',    salePrice: 25,  cost: 15,  profit: 10, features: ['1 dispositivo'] },
    { id: 'pv-1m',    name: 'Prime Video',            type: 'single', category: 'completa',   duration: '1 mes',    salePrice: 30,  cost: 20,  profit: 10, features: ['Cuenta completa', '4 a 5 dispositivos'] },
    { id: 'pv-3m',    name: 'Prime Video',            type: 'single', category: 'completa',   duration: '3 meses',  salePrice: 75,  cost: 50,  profit: 25, features: ['Cuenta completa', '4 a 5 dispositivos'] },
    { id: 'ap-6m',    name: 'Amazon Prime',           type: 'single', category: 'completa',   duration: '6 meses',  salePrice: 75,  cost: 60,  profit: 15, features: ['Autopay mensual', 'Cuenta privada bajo nuestro dominio', 'Acceso completo a películas y series'] },
    { id: 'cr-1m',    name: 'Crunchyroll Fan',        type: 'single', category: 'completa',   duration: '1 mes',    salePrice: 34,  cost: 26,  profit: 8,  features: ['Cuenta completa', '1 dispositivo'] },
    { id: 'cr-1y',    name: 'Crunchyroll Fan Anual',  type: 'single', category: 'completa',   duration: '1 año',    salePrice: 140, cost: 100, profit: 40, features: ['Cuenta completa', '1 dispositivo'] },
    { id: 'cr-6m',    name: 'Crunchyroll Mega Fan',   type: 'single', category: 'completa',   duration: '6 meses',  salePrice: 70,  cost: 50,  profit: 20, features: ['Cuenta completa', '2 dispositivos'] },
    { id: 'ad-1m',    name: 'Adobe Creative Cloud',   type: 'single', category: 'completa',   duration: '1 mes',    salePrice: 65,  cost: 50,  profit: 15, features: ['Todas las Apps', 'Hasta 2 dispositivos'] },
    { id: 'vpn-1m',   name: 'Express VPN',            type: 'single', category: 'completa',   duration: '1 mes',    salePrice: 25,  cost: 18,  profit: 7,  features: ['De 4 a 8 dispositivos'] },
    { id: 'dshbo-1m', name: 'Disney Plus + HBO Max',  type: 'single', category: 'completa',   duration: '1 mes',    salePrice: 23,  cost: 11.2,profit: 11.8,features: ['Mismos datos para ambos', 'Cuenta grupal compartida'] },
    { id: 'ytf-1m',   name: 'YouTube Premium Familiar',type: 'single',category: 'completa',   duration: '1 mes',    salePrice: 35,  cost: 0,   profit: 35, features: ['Cuenta con correo y contraseña', 'Plan Familiar (4 invitaciones extra)', 'Sin anuncios + Segundo plano'] },
    // ── COMBOS ──
    { id: 'cb-stream', name: 'Combo Stream',          type: 'combo',  category: 'combo',      duration: '1 mes',    salePrice: 32,  cost: 24.2, profit: 7.8, features: ['Disney+', 'YouTube Premium'] },
    { id: 'cb-diseno', name: 'Combo Diseño',          type: 'combo',  category: 'combo',      duration: '1 mes',    salePrice: 80,  cost: 50,   profit: 30, features: ['Canva EDU', 'Adobe Creative Cloud'] },
    { id: 'cb-creator',name: 'Combo Creator Pro',     type: 'combo',  category: 'combo',      duration: '1 mes',    salePrice: 125, cost: 110,  profit: 15, features: ['CapCut Pro', 'Adobe Creative Cloud'] },
    { id: 'cb-office', name: 'Combo Office',          type: 'combo',  category: 'combo',      duration: '1 año',    salePrice: 160, cost: 100,  profit: 60, features: ['Microsoft 365', 'Canva EDU'] },
    { id: 'cb-ultra',  name: 'Combo Ultra',           type: 'combo',  category: 'combo',      duration: 'Mix',      salePrice: 210, cost: 150,  profit: 60, features: ['Microsoft 365', 'Adobe', 'Canva EDU'] },
    { id: 'cb-privado',name: 'Combo Privado',         type: 'combo',  category: 'combo',      duration: '1 mes',    salePrice: 45,  cost: 36,   profit: 9,  features: ['Express VPN', 'YouTube Premium'] }
];
