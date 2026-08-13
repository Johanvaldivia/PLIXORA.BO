// =============================================================
// PLIXORA.BO - GLOBAL CONFIGURATION (multi-entorno)
// =============================================================

(function () {
    'use strict';

    // Detectar entorno: producción si el hostname NO es localhost/127.0.0.1
    const isProd = !/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);

    window.PLIXORA_CONFIG = {
        // URL base del bot WhatsApp
        // En producción: rutas relativas que Render reescribe al VPS (evita Mixed Content HTTPS→HTTP)
        // En local: directo a localhost:3000
        WA_BOT_URL: isProd
            ? '/api/wa/send-message'
            : 'http://localhost:3000/api/send-message',
        WA_BOT_IMAGE_URL: isProd
            ? '/api/wa/send-image'
            : 'http://localhost:3000/api/send-image',
        WA_BOT_STATUS_URL: isProd
            ? '/api/wa-status'
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
    window.waBotFetch = function (url, body, timeoutMs) {
        const headers = { 'Content-Type': 'application/json' };
        if (window.PLIXORA_CONFIG.WA_BOT_TOKEN) {
            headers['Authorization'] = 'Bearer ' + window.PLIXORA_CONFIG.WA_BOT_TOKEN;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs || 10000);
        
        return fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal })
            .finally(() => clearTimeout(timer));
    };

    window.waBotFetchRetry = async function (url, body, maxRetries, delayMs) {
        maxRetries = maxRetries || 2;
        delayMs = delayMs || 800;
        let lastErr;
        for (let i = 0; i <= maxRetries; i++) {
            try {
                const resp = await window.waBotFetch(url, body);
                const data = await resp.json();
                if (data.success) return data;
                lastErr = new Error(data.error || 'Bot error');
            } catch (e) {
                lastErr = e;
                if (i < maxRetries) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
            }
        }
        throw lastErr;
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