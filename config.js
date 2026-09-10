// =============================================================
// PLIXORA.BO - GLOBAL CONFIGURATION (multi-entorno v2.0)
// =============================================================

(function () {
    'use strict';

    // Detectar entorno local: localhost, 127.0.0.1, [::1], o apertura por archivo directo file:///
    const isLocal = !window.location.hostname ||
                    /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname) ||
                    window.location.protocol === 'file:';

    // URL base del bot configurable guardada por el usuario en localStorage
    const savedBotUrl = (function() {
        try { return localStorage.getItem('plixora_bot_url'); } catch(e) { return null; }
    })();

    // Base URL normalizada (por defecto siempre apunta a http://localhost:3000 si no se configura otra)
    const defaultBot = 'http://localhost:3000';
    const botBase = (savedBotUrl || defaultBot).trim().replace(/\/+$/, '');

    window.PLIXORA_CONFIG = {
        BOT_BASE_URL: botBase,
        WA_BOT_URL: botBase + '/api/send-message',
        WA_BOT_IMAGE_URL: botBase + '/api/send-image',
        WA_BOT_STATUS_URL: botBase + '/status',
        WA_BOT_TOKEN: 'f58v6XkUscoxyIEGVgez7dRuJLHq4Sip',
        PRODUCTION_URL: 'https://plixora-bo.onrender.com',
        CURRENCY: 'Bs',
        TIMEZONE: 'America/La_Paz',
        IS_LOCAL: isLocal,
        IS_PROD: !isLocal
    };

    // Helper para cambiar la URL del bot dinámicamente desde la interfaz
    window.setCustomBotUrl = function(newUrl) {
        if (!newUrl || newUrl.trim() === '' || newUrl.trim() === defaultBot) {
            try { localStorage.removeItem('plixora_bot_url'); } catch(e) {}
        } else {
            let clean = newUrl.trim().replace(/\/+$/, '');
            if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
                clean = 'http://' + clean;
            }
            try { localStorage.setItem('plixora_bot_url', clean); } catch(e) {}
        }
        window.location.reload();
    };

    // ── Global WA Notifications ─────────────────────────────────
    window.showWAToast = function(msg = 'Mensaje Enviado') {
        const container = document.getElementById('wa-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'wa-toast';
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
    window.waBotFetch = async function (url, body, timeoutMs) {
        if (!window.PLIXORA_CONFIG.IS_LOCAL && !savedBotUrl) {
            throw new Error('El bot de WhatsApp funciona en tu PC local. Abre el sistema en tu computadora con INICIAR_SISTEMA.bat o configura una URL de túnel.');
        }

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
                throw new Error('El bot de WhatsApp tardó demasiado en responder. Verifica que esté abierto en tu PC.');
            }
            throw new Error('No se pudo conectar al bot de WhatsApp (' + (window.PLIXORA_CONFIG.BOT_BASE_URL) + '). Asegúrate de haber ejecutado INICIAR_BOT.bat.');
        } finally {
            clearTimeout(timer);
        }

        // Validar que la respuesta sea JSON
        const ct = (resp.headers.get('content-type') || '');
        if (!ct.includes('application/json')) {
            const snippet = (await resp.text()).substring(0, 150);
            console.error('Respuesta no-JSON del bot WA:', resp.status, snippet);
            throw new Error('El bot devolvió un error (HTTP ' + resp.status + '). Abre http://localhost:3000/status para verificarlo.');
        }

        const data = await resp.json();
        if (!resp.ok) {
            throw new Error(data.error || 'Error del bot (HTTP ' + resp.status + ')');
        }

        return data;
    };

    // Envío con reintentos automáticos
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
        // En entorno remoto sin túnel personalizado configurado, no intentamos fetch a localhost
        if (!window.PLIXORA_CONFIG.IS_LOCAL && !savedBotUrl) {
            return {
                ready: false,
                isRemoteMode: true,
                status: 'El bot opera de forma local en tu computadora'
            };
        }

        const url = window.PLIXORA_CONFIG.WA_BOT_STATUS_URL;
        if (!url) return { ready: false, status: 'URL de status no configurada' };
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const headers = {};
            if (window.PLIXORA_CONFIG.WA_BOT_TOKEN) {
                headers['Authorization'] = 'Bearer ' + window.PLIXORA_CONFIG.WA_BOT_TOKEN;
            }
            const resp = await fetch(url, { signal: controller.signal, headers });
            clearTimeout(timer);
            if (!resp.ok) return { ready: false, status: 'Error HTTP ' + resp.status };
            const data = await resp.json();
            return data;
        } catch (e) {
            return {
                ready: false,
                status: 'Bot apagado o no alcanzable (' + (e.name === 'AbortError' ? 'timeout' : 'sin conexión') + ')'
            };
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