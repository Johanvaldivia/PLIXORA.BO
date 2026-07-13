// =============================================================
// PLIXORA.BO - GLOBAL CONFIGURATION
// =============================================================

window.PLIXORA_CONFIG = {
    WA_BOT_URL: 'https://plixora-bot.duckdns.org/api/send-message',
    WA_BOT_IMAGE_URL: 'https://plixora-bot.duckdns.org/api/send-image',
    WA_BOT_TOKEN: '',  // Token de autenticación para el bot (configurar en producción)
    PRODUCTION_URL: 'https://plixora-ventas.netlify.app',
    CURRENCY: 'Bs',
    TIMEZONE: 'America/La_Paz'
};

window.waBotFetch = function(url, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (window.PLIXORA_CONFIG.WA_BOT_TOKEN) {
        headers['Authorization'] = 'Bearer ' + window.PLIXORA_CONFIG.WA_BOT_TOKEN;
    }
    return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
};

window.generateOrderCode = function() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'PLX-' + code;
};
