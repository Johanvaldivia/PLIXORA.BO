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
        try {
            const s = localStorage.getItem('plixora_bot_url');
            if (s && (s.includes('localhost') || s.includes('127.0.0.1'))) {
                localStorage.removeItem('plixora_bot_url');
                return null;
            }
            return s;
        } catch(e) { return null; }
    })();

    // Base URL del bot: 100% Nube Virtual Oracle Cloud 24/7 (plixora-bot.duckdns.org)
    const cloudBot = 'http://plixora-bot.duckdns.org:3000';
    const defaultBot = cloudBot;
    const botBase = (savedBotUrl || defaultBot).trim().replace(/\/+$/, '');

    window.PLIXORA_CONFIG = {
        BOT_BASE_URL: botBase,
        CLOUD_BOT_URL: cloudBot,
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
        if (typeof window.showToast === 'function') {
            window.showToast('WhatsApp', msg, 'success');
            return;
        }
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

    window.handleLoginNotice = function(msg) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg);
        } else {
            console.info('[PLIXORA]', msg);
        }
    };

    // ── Helpers API Bot ────────────────────────────────────────
    window.waBotFetch = async function (url, body, timeoutMs) {
        const headers = { 'Content-Type': 'application/json' };
        if (window.PLIXORA_CONFIG.WA_BOT_TOKEN) {
            headers['Authorization'] = 'Bearer ' + window.PLIXORA_CONFIG.WA_BOT_TOKEN;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs || 5000);

        let resp;
        try {
            resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                throw new Error('El bot tardó más de 5s en responder.');
            }
            throw new Error('No se pudo conectar al bot de WhatsApp (' + (window.PLIXORA_CONFIG.BOT_BASE_URL) + ').');
        } finally {
            clearTimeout(timer);
        }

        // Validar que la respuesta sea JSON
        const ct = (resp.headers.get('content-type') || '');
        if (!ct.includes('application/json')) {
            const snippet = (await resp.text()).substring(0, 150);
            console.error('Respuesta no-JSON del bot WA:', resp.status, snippet);
            throw new Error('El bot devolvió un error (HTTP ' + resp.status + '). Abre http://plixora-bot.duckdns.org:3000/status para verificarlo.');
        }

        const data = await resp.json();
        if (!resp.ok) {
            throw new Error(data.error || 'Error del bot (HTTP ' + resp.status + ')');
        }

        return data;
    };

    // Envío con reintentos automáticos y fallback tangible inmediato
    window.waBotFetchRetry = async function (url, body, maxRetries, delayMs) {
        maxRetries = maxRetries !== undefined ? maxRetries : 1;
        delayMs = delayMs || 800;
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

        // 🟢 PLAN B TANGIBLE INMEDIATO:
        // Si el bot falló tras los reintentos, activar el modal de respaldo para que el usuario nunca pierda el envío
        if (typeof window.openWhatsAppFallbackModal === 'function' && body && (body.phone || body.customer)) {
            window.openWhatsAppFallbackModal({
                phone: body.phone || body.customer,
                message: body.message || '',
                imageUrl: body.imageUrl || '',
                caption: body.caption || '',
                reason: (lastErr && lastErr.message) ? lastErr.message : 'El bot no pudo completar el envío.',
                onRetry: () => window.waBotFetchRetry(url, body, 1, delayMs)
            });
        }

        throw lastErr;
    };

    // ── Verificar estado del bot ──────────────────────────────
    window.checkWaBotStatus = async function () {
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
                status: 'Bot en la nube no alcanzable (' + (e.name === 'AbortError' ? 'timeout' : 'sin conexión') + ')'
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

    // ── MODAL UNIVERSAL DE CONFIRMACIÓN (ESTILO MINIMAL SHIELD) ──
    let _confirmResolve = null;

    window.plixoraConfirm = function ({
        title = '¿Estás seguro?',
        message = 'Puedes volver a iniciar sesión más tarde en tu cuenta.',
        confirmText = 'Sí, continuar',
        cancelText = 'No'
    } = {}) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('plx-confirm-overlay');
            const titleEl = document.getElementById('plx-confirm-title');
            const msgEl = document.getElementById('plx-confirm-msg');
            const btnCancel = document.getElementById('plx-confirm-btn-cancel');
            const btnOk = document.getElementById('plx-confirm-btn-ok');

            if (!overlay) {
                return resolve(window.confirm(`${title}\n\n${message}`));
            }

            if (_confirmResolve) {
                _confirmResolve(false);
            }
            _confirmResolve = resolve;

            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;
            if (btnCancel) btnCancel.textContent = cancelText;
            if (btnOk) btnOk.textContent = confirmText;

            overlay.style.display = 'flex';
            void overlay.offsetWidth; // trigger reflow for smooth transition
            overlay.classList.add('active');

            const cleanup = (result) => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 220);

                window.removeEventListener('keydown', onKeyDown);
                overlay.removeEventListener('click', onBackdrop);
                btnCancel.onclick = null;
                btnOk.onclick = null;

                if (_confirmResolve) {
                    const cb = _confirmResolve;
                    _confirmResolve = null;
                    cb(result);
                }
            };

            const onKeyDown = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cleanup(false);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    cleanup(true);
                }
            };

            const onBackdrop = (e) => {
                if (e.target === overlay) {
                    cleanup(false);
                }
            };

            btnCancel.onclick = () => cleanup(false);
            btnOk.onclick = () => cleanup(true);

            window.addEventListener('keydown', onKeyDown);
            overlay.addEventListener('click', onBackdrop);
        });
    };

    window.confirmLogout = async function () {
        const confirmed = await window.plixoraConfirm({
            title: '¿Estás seguro?',
            message: 'Puedes volver a iniciar sesión más tarde en tu cuenta.',
            confirmText: 'Sí, cerrar sesión',
            cancelText: 'No'
        });
        if (confirmed) {
            if (typeof window.plixoraLogout === 'function') {
                window.plixoraLogout();
            }
        }
    };
})();