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
    { id: 'cb-privado',name: 'Combo Privado',         type: 'combo',  category: 'combo',      duration: '1 mes',    salePrice: 45,  cost: 36,   profit: 9,  features: ['Express VPN', 'YouTube Premium'] },

    // ══════════════════════════════════════════════════════════
    // ── 📺 SECCIÓN TV — Streaming para TV, Celular y PC ──
    // ══════════════════════════════════════════════════════════

    // ── MAGIS TV PRO (Oleada TV) ──
    { id: 'mgtv-1p-1m',  name: 'Magis TV PRO',           type: 'single', category: 'tv', duration: '1 mes',                salePrice: 12,  cost: 5,   profit: 7,   features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'mgtv-1p-3m',  name: 'Magis TV PRO',           type: 'single', category: 'tv', duration: '3 meses',              salePrice: 25,  cost: 15,  profit: 10,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'mgtv-1p-6m',  name: 'Magis TV PRO',           type: 'single', category: 'tv', duration: '6+1 mes gratis',       salePrice: 40,  cost: 30,  profit: 10,  features: ['1 pantalla', 'Incluye Liga Boliviana', '7 meses total'] },
    { id: 'mgtv-1p-12m', name: 'Magis TV PRO',           type: 'single', category: 'tv', duration: '12+2 meses gratis',    salePrice: 80,  cost: 60,  profit: 20,  features: ['1 pantalla', 'Incluye Liga Boliviana', '14 meses total'] },
    { id: 'mgtv-cc-1m',  name: 'Magis TV PRO (Completa)',type: 'single', category: 'tv', duration: '1 mes',                salePrice: 22,  cost: 15,  profit: 7,   features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'mgtv-cc-3m',  name: 'Magis TV PRO (Completa)',type: 'single', category: 'tv', duration: '3 meses',              salePrice: 60,  cost: 45,  profit: 15,  features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'mgtv-cc-6m',  name: 'Magis TV PRO (Completa)',type: 'single', category: 'tv', duration: '6+1 mes gratis',       salePrice: 115, cost: 90,  profit: 25,  features: ['3 pantallas', 'Incluye Liga Boliviana', '7 meses total'] },
    { id: 'mgtv-cc-12m', name: 'Magis TV PRO (Completa)',type: 'single', category: 'tv', duration: '12+2 meses gratis',    salePrice: 220, cost: 175, profit: 45,  features: ['3 pantallas', 'Incluye Liga Boliviana', '14 meses total'] },

    // ── FLUJO TV ──
    { id: 'fltv-1p-1m',  name: 'Flujo TV',               type: 'single', category: 'tv', duration: '1 mes',                salePrice: 14,  cost: 8,   profit: 6,   features: ['1 pantalla', 'Mejor estabilidad del mercado', 'Renovable'] },
    { id: 'fltv-1p-3m',  name: 'Flujo TV',               type: 'single', category: 'tv', duration: '3 meses',              salePrice: 34,  cost: 24,  profit: 10,  features: ['1 pantalla', 'Mejor estabilidad del mercado', 'Renovable'] },
    { id: 'fltv-1p-6m',  name: 'Flujo TV',               type: 'single', category: 'tv', duration: '6+1 mes gratis',       salePrice: 65,  cost: 48,  profit: 17,  features: ['1 pantalla', 'Mejor estabilidad del mercado', '7 meses total'] },
    { id: 'fltv-1p-12m', name: 'Flujo TV',               type: 'single', category: 'tv', duration: '12+2 meses gratis',    salePrice: 125, cost: 96,  profit: 29,  features: ['1 pantalla', 'Mejor estabilidad del mercado', '14 meses total'] },
    { id: 'fltv-cc-1m',  name: 'Flujo TV (Completa)',    type: 'single', category: 'tv', duration: '1 mes',                salePrice: 35,  cost: 24,  profit: 11,  features: ['3 pantallas', 'Mejor estabilidad del mercado', 'Cuenta completa'] },
    { id: 'fltv-cc-3m',  name: 'Flujo TV (Completa)',    type: 'single', category: 'tv', duration: '3 meses',              salePrice: 95,  cost: 72,  profit: 23,  features: ['3 pantallas', 'Mejor estabilidad del mercado', 'Cuenta completa'] },
    { id: 'fltv-cc-6m',  name: 'Flujo TV (Completa)',    type: 'single', category: 'tv', duration: '6+1 mes gratis',       salePrice: 180, cost: 144, profit: 36,  features: ['3 pantallas', 'Mejor estabilidad del mercado', '7 meses total'] },
    { id: 'fltv-cc-12m', name: 'Flujo TV (Completa)',    type: 'single', category: 'tv', duration: '12+2 meses gratis',    salePrice: 360, cost: 288, profit: 72,  features: ['3 pantallas', 'Mejor estabilidad del mercado', '14 meses total'] },

    // ── IPTV SMARTER PRO ──
    { id: 'iptv-1p-1m',  name: 'IPTV Smarter Pro',       type: 'single', category: 'tv', duration: '1 mes',                salePrice: 12,  cost: 6,   profit: 6,   features: ['1 pantalla', 'Entretenimiento completo', 'Renovable'] },
    { id: 'iptv-1p-3m',  name: 'IPTV Smarter Pro',       type: 'single', category: 'tv', duration: '2+1 mes gratis',       salePrice: 20,  cost: 10,  profit: 10,  features: ['1 pantalla', 'Entretenimiento completo', '3 meses total'] },
    { id: 'iptv-1p-5m',  name: 'IPTV Smarter Pro',       type: 'single', category: 'tv', duration: '3+2 meses gratis',     salePrice: 30,  cost: 15,  profit: 15,  features: ['1 pantalla', 'Entretenimiento completo', '5 meses total'] },
    { id: 'iptv-1p-9m',  name: 'IPTV Smarter Pro',       type: 'single', category: 'tv', duration: '6+3 meses gratis',     salePrice: 50,  cost: 30,  profit: 20,  features: ['1 pantalla', 'Entretenimiento completo', '9 meses total'] },
    { id: 'iptv-1p-16m', name: 'IPTV Smarter Pro',       type: 'single', category: 'tv', duration: '12+4 meses gratis',    salePrice: 85,  cost: 60,  profit: 25,  features: ['1 pantalla', 'Entretenimiento completo', '16 meses total'] },
    { id: 'iptv-cc-1m',  name: 'IPTV Smarter Pro (Completa)', type: 'single', category: 'tv', duration: '1 mes',           salePrice: 20,  cost: 12,  profit: 8,   features: ['3 pantallas', 'Entretenimiento completo', 'Cuenta completa'] },
    { id: 'iptv-cc-3m',  name: 'IPTV Smarter Pro (Completa)', type: 'single', category: 'tv', duration: '2+1 mes gratis',  salePrice: 35,  cost: 22,  profit: 13,  features: ['3 pantallas', 'Entretenimiento completo', '3 meses total'] },
    { id: 'iptv-cc-5m',  name: 'IPTV Smarter Pro (Completa)', type: 'single', category: 'tv', duration: '3+2 meses gratis',salePrice: 50,  cost: 33,  profit: 17,  features: ['3 pantallas', 'Entretenimiento completo', '5 meses total'] },
    { id: 'iptv-cc-9m',  name: 'IPTV Smarter Pro (Completa)', type: 'single', category: 'tv', duration: '6+3 meses gratis',salePrice: 90,  cost: 66,  profit: 24,  features: ['3 pantallas', 'Entretenimiento completo', '9 meses total'] },
    { id: 'iptv-cc-16m', name: 'IPTV Smarter Pro (Completa)', type: 'single', category: 'tv', duration: '12+4 meses gratis',salePrice: 170, cost: 132, profit: 38, features: ['3 pantallas', 'Entretenimiento completo', '16 meses total'] },

    // ── IPTV SMARTER PRO-Z TV ──
    { id: 'iptvz-1p-1m',  name: 'IPTV Smarter Pro-Z TV',  type: 'single', category: 'tv', duration: '1 mes',               salePrice: 10,  cost: 4,   profit: 6,   features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'iptvz-1p-3m',  name: 'IPTV Smarter Pro-Z TV',  type: 'single', category: 'tv', duration: '3 meses',             salePrice: 25,  cost: 12,  profit: 13,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'iptvz-1p-6m',  name: 'IPTV Smarter Pro-Z TV',  type: 'single', category: 'tv', duration: '6 meses',             salePrice: 40,  cost: 24,  profit: 16,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'iptvz-1p-12m', name: 'IPTV Smarter Pro-Z TV',  type: 'single', category: 'tv', duration: '12 meses',            salePrice: 70,  cost: 48,  profit: 22,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'iptvz-cc-1m',  name: 'IPTV Smarter Pro-Z TV (Completa)', type: 'single', category: 'tv', duration: '1 mes',     salePrice: 20,  cost: 12,  profit: 8,   features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'iptvz-cc-3m',  name: 'IPTV Smarter Pro-Z TV (Completa)', type: 'single', category: 'tv', duration: '3 meses',   salePrice: 50,  cost: 33,  profit: 17,  features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'iptvz-cc-6m',  name: 'IPTV Smarter Pro-Z TV (Completa)', type: 'single', category: 'tv', duration: '6 meses',   salePrice: 90,  cost: 66,  profit: 24,  features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'iptvz-cc-12m', name: 'IPTV Smarter Pro-Z TV (Completa)', type: 'single', category: 'tv', duration: '12 meses',  salePrice: 165, cost: 132, profit: 33,  features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },

    // ── TELE LATINO MAX ──
    { id: 'tl-1p-1m',  name: 'Tele Latino Max',         type: 'single', category: 'tv', duration: '1 mes',                 salePrice: 12,  cost: 6,   profit: 6,   features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'tl-1p-3m',  name: 'Tele Latino Max',         type: 'single', category: 'tv', duration: '3 meses',               salePrice: 30,  cost: 18,  profit: 12,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'tl-1p-6m',  name: 'Tele Latino Max',         type: 'single', category: 'tv', duration: '6 meses',               salePrice: 50,  cost: 36,  profit: 14,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'tl-1p-12m', name: 'Tele Latino Max',         type: 'single', category: 'tv', duration: '12 meses',              salePrice: 95,  cost: 72,  profit: 23,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'tl-cc-1m',  name: 'Tele Latino Max (Completa)', type: 'single', category: 'tv', duration: '1 mes',              salePrice: 30,  cost: 22,  profit: 8,   features: ['4 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'tl-cc-3m',  name: 'Tele Latino Max (Completa)', type: 'single', category: 'tv', duration: '3 meses',            salePrice: 85,  cost: 66,  profit: 19,  features: ['4 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'tl-cc-6m',  name: 'Tele Latino Max (Completa)', type: 'single', category: 'tv', duration: '6 meses',            salePrice: 165, cost: 132, profit: 33,  features: ['4 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'tl-cc-12m', name: 'Tele Latino Max (Completa)', type: 'single', category: 'tv', duration: '12 meses',           salePrice: 330, cost: 264, profit: 66,  features: ['4 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },

    // ── NUBIA TV - GX MAX ──
    { id: 'nubia-1p-1m',  name: 'Nubia TV - GX MAX',     type: 'single', category: 'tv', duration: '1 mes',                salePrice: 40,  cost: 30,  profit: 10,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'nubia-1p-3m',  name: 'Nubia TV - GX MAX',     type: 'single', category: 'tv', duration: '3 meses',              salePrice: 110, cost: 85,  profit: 25,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'nubia-1p-6m',  name: 'Nubia TV - GX MAX',     type: 'single', category: 'tv', duration: '6+1 mes gratis',       salePrice: 210, cost: 170, profit: 40,  features: ['1 pantalla', 'Incluye Liga Boliviana', '7 meses total'] },
    { id: 'nubia-1p-12m', name: 'Nubia TV - GX MAX',     type: 'single', category: 'tv', duration: '12+2 meses gratis',    salePrice: 420, cost: 340, profit: 80,  features: ['1 pantalla', 'Incluye Liga Boliviana', '14 meses total'] },
    { id: 'nubia-cc-1m',  name: 'Nubia TV - GX MAX (Completa)', type: 'single', category: 'tv', duration: '1 mes',         salePrice: 65,  cost: 50,  profit: 15,  features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'nubia-cc-3m',  name: 'Nubia TV - GX MAX (Completa)', type: 'single', category: 'tv', duration: '3 meses',       salePrice: 175, cost: 140, profit: 35,  features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'nubia-cc-6m',  name: 'Nubia TV - GX MAX (Completa)', type: 'single', category: 'tv', duration: '6+1 mes gratis',salePrice: 330, cost: 270, profit: 60,  features: ['3 pantallas', 'Incluye Liga Boliviana', '7 meses total'] },
    { id: 'nubia-cc-12m', name: 'Nubia TV - GX MAX (Completa)', type: 'single', category: 'tv', duration: '12+2 meses gratis',salePrice: 650, cost: 520, profit: 130, features: ['3 pantallas', 'Incluye Liga Boliviana', '14 meses total'] },

    // ── VELTIX ──
    { id: 'vltx-1p-1m',  name: 'Veltix',                 type: 'single', category: 'tv', duration: '1 mes',                salePrice: 40,  cost: 30,  profit: 10,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'vltx-1p-3m',  name: 'Veltix',                 type: 'single', category: 'tv', duration: '3 meses',              salePrice: 110, cost: 85,  profit: 25,  features: ['1 pantalla', 'Incluye Liga Boliviana', 'Renovable'] },
    { id: 'vltx-1p-6m',  name: 'Veltix',                 type: 'single', category: 'tv', duration: '6+1 mes gratis',       salePrice: 210, cost: 170, profit: 40,  features: ['1 pantalla', 'Incluye Liga Boliviana', '7 meses total'] },
    { id: 'vltx-1p-12m', name: 'Veltix',                 type: 'single', category: 'tv', duration: '12+2 meses gratis',    salePrice: 420, cost: 340, profit: 80,  features: ['1 pantalla', 'Incluye Liga Boliviana', '14 meses total'] },
    { id: 'vltx-cc-1m',  name: 'Veltix (Completa)',      type: 'single', category: 'tv', duration: '1 mes',                salePrice: 65,  cost: 50,  profit: 15,  features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'vltx-cc-3m',  name: 'Veltix (Completa)',      type: 'single', category: 'tv', duration: '3 meses',              salePrice: 175, cost: 140, profit: 35,  features: ['3 pantallas', 'Incluye Liga Boliviana', 'Cuenta completa'] },
    { id: 'vltx-cc-6m',  name: 'Veltix (Completa)',      type: 'single', category: 'tv', duration: '6+1 mes gratis',       salePrice: 330, cost: 270, profit: 60,  features: ['3 pantallas', 'Incluye Liga Boliviana', '7 meses total'] },
    { id: 'vltx-cc-12m', name: 'Veltix (Completa)',      type: 'single', category: 'tv', duration: '12+2 meses gratis',    salePrice: 650, cost: 520, profit: 130, features: ['3 pantallas', 'Incluye Liga Boliviana', '14 meses total'] },

    // ── PLEX TV ──
    { id: 'plex-1p-1m',  name: 'Plex TV',                type: 'single', category: 'tv', duration: '1 mes',                salePrice: 12,  cost: 6,   profit: 6,   features: ['1 pantalla', 'Streaming estable', 'Renovable'] },
    { id: 'plex-cc-2p',  name: 'Plex TV (2 Personas)',   type: 'single', category: 'tv', duration: '1 mes',                salePrice: 20,  cost: 12,  profit: 8,   features: ['2 personas', 'Streaming estable', 'Cuenta completa'] },
    { id: 'plex-cc-4p',  name: 'Plex TV (4 Personas)',   type: 'single', category: 'tv', duration: '1 mes',                salePrice: 35,  cost: 24,  profit: 11,  features: ['4 personas', 'Streaming estable', 'Cuenta completa'] }
];
