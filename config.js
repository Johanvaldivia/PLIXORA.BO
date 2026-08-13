// =============================================================
// PLIXORA.BO - GLOBAL CONFIGURATION (multi-entorno)
// =============================================================

(function () {
    'use strict';

    // Detectar entorno: producción si el hostname NO es localhost/127.0.0.1
    const isProd = !/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);

    window.PLIXORA_CONFIG = {
        // URL base del bot WhatsApp
        // En producción: directo al VPS via HTTPS (nginx + Certbot en plixora-bot.duckdns.org)
        // En local: directo a localhost:3000
        WA_BOT_URL: isProd
            ? 'https://plixora-bot.duckdns.org/api/send-message'
            : 'http://localhost:3000/api/send-message',
        WA_BOT_IMAGE_URL: isProd
            ? 'https://plixora-bot.duckdns.org/api/send-image'
            : 'http://localhost:3000/api/send-image',
        WA_BOT_STATUS_URL: isProd
            ? 'https://plixora-bot.duckdns.org/status'
            : 'http://localhost:3000/status',
        WA_BOT_TOKEN: 'f58v6XkUscoxyIEGVgez7dRuJLHq4Sip',
        PRODUCTION_URL: 'https://plixora-bo.onrender.com',
        CURRENCY: 'Bs',
        TIMEZONE: 'America/La_Paz',
        IS_PROD: isProd
    };




    // ── Global WA Notifications ─────────────────────────────────
    window.showWAToast = function(msg = 'Mensaje Enviado') {
        const container = document.getElementById('wa-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'wa-toast';
        // Check if tabler icons are available, else use a fallback emoji
        toast.innerHTML = `<i class="ti ti-brand-whatsapp" style="font-size:1.2rem; margin-right:4px;"></i> <span>${msg}</span>`;
        container.appendChild(toast);
        
        void toast.offsetWidth; // force reflow
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode === container) container.removeChild(toast);
            }, 400);
        }, 3000);
    };

    // ── Helpers API Bot ────────────────────────────────────────
    // Timeout por defecto: 15s (imágenes pueden tardar más)
    window.waBotFetch = async function (url, body, timeoutMs) {
        const headers = { 'Content-Type': 'application/json' };
        if (window.PLIXORA_CONFIG.WA_BOT_TOKEN) {
            headers['Authorization'] = 'Bearer ' + window.PLIXORA_CONFIG.WA_BOT_TOKEN;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs || 15000);

        let resp;
        try {
            resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                throw new Error('El bot de WhatsApp no respondió (timeout). Verifica que esté encendido.');
            }
            throw new Error('No se pudo conectar al bot de WhatsApp. Verifica tu conexión.');
        } finally {
            clearTimeout(timer);
        }

        // Validar que la respuesta sea JSON (evitar crash al parsear HTML de errores 502/504)
        const ct = (resp.headers.get('content-type') || '');
        if (!ct.includes('application/json')) {
            const snippet = (await resp.text()).substring(0, 150);
            console.error('Respuesta no-JSON del bot WA:', resp.status, snippet);
            throw new Error('El servidor del bot devolvió un error (status ' + resp.status + '). Verifica que el bot esté activo.');
        }

        // Parsear JSON y verificar status HTTP
        const data = await resp.json();
        if (!resp.ok) {
            throw new Error(data.error || 'Error del bot (HTTP ' + resp.status + ')');
        }

        return data;
    };

    // Envío con reintentos automáticos (2 reintentos, backoff 1s, 2s)
    // Devuelve { success: true, ... } o lanza Error
    window.waBotFetchRetry = async function (url, body, maxRetries, delayMs) {
        maxRetries = maxRetries || 2;
        delayMs = delayMs || 1000;
        let lastErr;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                const data = await window.waBotFetch(url, body);
                if (data.success) return data;
                lastErr = new Error(data.error || 'El bot no pudo enviar el mensaje.');
            } catch (e) {
                lastErr = e;
            }
            if (i < maxRetries) {
                console.log('↻ Reintentando envío WA (' + (i + 1) + '/' + maxRetries + ')...');
                await new Promise(r => setTimeout(r, delayMs * (i + 1)));
            }
        }
        throw lastErr;
    };

    // ── Verificar estado del bot ──────────────────────────────
    window.checkWaBotStatus = async function () {
        const url = window.PLIXORA_CONFIG.WA_BOT_STATUS_URL;
        if (!url) return { ready: false, status: 'URL de status no configurada' };
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const headers = {};
            if (window.PLIXORA_CONFIG.WA_BOT_TOKEN) {
                headers['Authorization'] = 'Bearer ' + window.PLIXORA_CONFIG.WA_BOT_TOKEN;
            }
            const resp = await fetch(url, { signal: controller.signal, headers });
            clearTimeout(timer);
            if (!resp.ok) return { ready: false, status: 'Bot respondió con error HTTP ' + resp.status };
            const data = await resp.json();
            return data; // { ready: bool, status: string, hasQR: bool }
        } catch (e) {
            return { ready: false, status: 'No se pudo contactar al bot: ' + (e.name === 'AbortError' ? 'timeout' : e.message) };
        }
    };

    // ── Utilidades ─────────────────────────────────────────────
    window.generateOrderCode = function () {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'PLX-' + code;
    };

    window.debounce = function (fn, delay) {
        let timer;
        return function () {
            const ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(ctx, args), delay);
        };
    };

    window.batchedLSSetItem = (function () {
        let pending = {};
        let timeoutId = null;
        const FLUSH_MS = 300;
        return function (key, value) {
            pending[key] = value;
            if (!timeoutId) {
                timeoutId = setTimeout(() => {
                    for (const k in pending) {
                        try { localStorage.setItem(k, pending[k]); } catch (e) { /* quota exceeded */ }
                    }
                    pending = {};
                    timeoutId = null;
                }, FLUSH_MS);
            }
        };
    })();
})();