// =============================================================
// PLIXORA.BO — WHATSAPP FALLBACK ASISTIDO (wa-fallback.js)
// Sistema Híbrido con Respaldo Tangible:
// Garantiza que NINGUNA venta o aviso se pierda si el bot está
// apagado, se desconecta o si se usa el sistema desde el celular.
// =============================================================

(function () {
    'use strict';

    // Normalizar número telefónico para WhatsApp (Bolivia 8 dígitos -> 591)
    function formatWaNumber(phone) {
        if (!phone) return '';
        let clean = String(phone).replace(/[^0-9]/g, '');
        if (clean.length === 8 && !clean.startsWith('591')) {
            clean = '591' + clean;
        }
        return clean;
    }

    // Construir enlace universal wa.me
    function buildWaLink(phone, message) {
        const num = formatWaNumber(phone);
        if (!num) return '';
        const encoded = encodeURIComponent(message || '');
        return `https://api.whatsapp.com/send?phone=${num}&text=${encoded}`;
    }

    // Inyectar modal dinámicamente si no existe en el DOM
    function ensureModalExists() {
        if (document.getElementById('wa-fallback-modal')) return;

        const modalHtml = `
        <div id="wa-fallback-modal" class="nf-overlay" style="display:none; z-index:3050; backdrop-filter:blur(6px);">
            <div class="nf-modal" style="max-width: 480px; width: 92%; border: 1px solid var(--border); box-shadow: 0 25px 60px rgba(0,0,0,0.5); border-radius: 18px; overflow: hidden; background: var(--bg-card);">
                <!-- Header con diseño distintivo -->
                <div style="padding: 1.1rem 1.4rem; background: linear-gradient(135deg, rgba(37,211,102,0.12), rgba(16,185,129,0.04)); border-bottom: 1px solid rgba(37,211,102,0.2); display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: #25D366; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 12px rgba(37,211,102,0.35);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
                        </div>
                        <div>
                            <h3 id="wa-fb-title" style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-main); display:flex; align-items:center; gap:0.4rem;">
                                Respaldo Tangible de WhatsApp
                            </h3>
                            <span id="wa-fb-subtitle" style="font-size: 0.76rem; color: #10b981; font-weight: 600;">Plan B activado: Tus datos están listos para enviar</span>
                        </div>
                    </div>
                    <button class="nf-close" onclick="window.closeWhatsAppFallbackModal()" style="font-size:1.2rem; cursor:pointer; background:none; border:none; color:var(--text-muted);">✕</button>
                </div>

                <div style="padding: 1.25rem 1.4rem;">
                    <!-- Alerta de motivo -->
                    <div id="wa-fb-reason-box" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 0.65rem 0.85rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span id="wa-fb-reason-text" style="font-size: 0.8rem; color: var(--text-main); line-height: 1.35;">El bot automático no estaba activo o tardó en responder.</span>
                    </div>

                    <!-- Datos del destinatario -->
                    <div style="background: var(--bg-main); border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem 0.9rem; margin-bottom: 0.9rem; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.82rem; color: var(--text-muted);">Destinatario:</span>
                        <strong id="wa-fb-phone-display" style="font-size: 0.92rem; color: var(--text-main); font-family: monospace;">+591 —</strong>
                    </div>

                    <!-- Mensaje listo para enviar -->
                    <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">
                        Mensaje formateado:
                    </label>
                    <textarea id="wa-fb-msg-preview" readonly style="width: 100%; box-sizing: border-box; background: var(--bg-main); border: 1px solid var(--border); border-radius: 10px; padding: 0.75rem; font-size: 0.8rem; color: var(--text-main); font-family: inherit; line-height: 1.5; min-height: 110px; max-height: 160px; resize: vertical; margin-bottom: 0.9rem;"></textarea>

                    <!-- Caja para imagen opcional (Netflix, comprobantes, etc.) -->
                    <div id="wa-fb-image-box" style="display: none; background: rgba(59, 130, 246, 0.08); border: 1px dashed rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 0.6rem 0.8rem; margin-bottom: 1rem; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--text-main);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            <span>Incluye imagen de instrucciones</span>
                        </div>
                        <a id="wa-fb-image-link" href="#" target="_blank" class="btn btn-outline" style="padding: 0.35rem 0.7rem; font-size: 0.75rem; border-radius: 6px; text-decoration: none;">Ver Imagen</a>
                    </div>

                    <!-- Botones de Acción Inmediata -->
                    <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                        <a id="wa-fb-direct-btn" href="#" target="_blank" class="btn" style="background: #25D366; color: #000; font-weight: 700; font-size: 0.95rem; padding: 0.85rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; text-decoration: none; box-shadow: 0 4px 15px rgba(37,211,102,0.35); transition: transform 0.15s, background 0.15s;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/></svg>
                            <span>Abrir en WhatsApp (wa.me)</span>
                        </a>

                        <div style="display: flex; gap: 0.6rem;">
                            <button type="button" class="btn btn-outline" style="flex: 1; padding: 0.7rem; border-radius: 10px; font-weight: 600; font-size: 0.84rem; display:flex; align-items:center; justify-content:center; gap:0.35rem;" onclick="window.copyWhatsAppFallbackText()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                <span>Copiar Mensaje</span>
                            </button>

                            <button id="wa-fb-retry-btn" type="button" class="btn btn-outline" style="flex: 1; padding: 0.7rem; border-radius: 10px; font-weight: 600; font-size: 0.84rem; display:flex; align-items:center; justify-content:center; gap:0.35rem;" onclick="window.retryWhatsAppFallback()">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                                <span>Reintentar Bot</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    let currentFallbackContext = null;

    // Función principal para abrir el modal de respaldo tangible
    window.openWhatsAppFallbackModal = function (options) {
        ensureModalExists();

        const {
            phone = '',
            message = '',
            imageUrl = '',
            caption = '',
            reason = 'El bot no estaba disponible en este momento.',
            title = 'Respaldo Tangible de WhatsApp',
            onRetry = null
        } = options || {};

        currentFallbackContext = { phone, message, imageUrl, caption, onRetry };

        const modal = document.getElementById('wa-fallback-modal');
        const titleEl = document.getElementById('wa-fb-title');
        const reasonTextEl = document.getElementById('wa-fb-reason-text');
        const phoneDisplay = document.getElementById('wa-fb-phone-display');
        const msgPreview = document.getElementById('wa-fb-msg-preview');
        const directBtn = document.getElementById('wa-fb-direct-btn');
        const imageBox = document.getElementById('wa-fb-image-box');
        const imageLink = document.getElementById('wa-fb-image-link');
        const retryBtn = document.getElementById('wa-fb-retry-btn');

        if (titleEl) titleEl.textContent = title;
        if (reasonTextEl) reasonTextEl.textContent = reason;

        const formattedPhone = formatWaNumber(phone);
        if (phoneDisplay) phoneDisplay.textContent = formattedPhone ? `+${formattedPhone}` : '(Sin número)';

        // Texto que se mostrará y copiará
        let fullText = message;
        if (caption && !fullText.includes(caption)) {
            fullText = fullText ? `${fullText}\n\n${caption}` : caption;
        }
        if (msgPreview) msgPreview.value = fullText;

        // Enlace directo wa.me
        if (directBtn) {
            directBtn.href = buildWaLink(phone, fullText);
            directBtn.onclick = function () {
                if (typeof window.showToast === 'function') {
                    window.showToast('📱 Abriendo WhatsApp...');
                }
            };
        }

        // Imagen adjunta opcional
        if (imageBox && imageLink) {
            if (imageUrl) {
                imageBox.style.display = 'flex';
                imageLink.href = imageUrl;
            } else {
                imageBox.style.display = 'none';
            }
        }

        // Botón reintentar
        if (retryBtn) {
            retryBtn.style.display = typeof onRetry === 'function' ? 'flex' : 'none';
        }

        modal.style.display = 'flex';
    };

    window.closeWhatsAppFallbackModal = function () {
        const modal = document.getElementById('wa-fallback-modal');
        if (modal) modal.style.display = 'none';
        currentFallbackContext = null;
    };

    window.copyWhatsAppFallbackText = function () {
        const preview = document.getElementById('wa-fb-msg-preview');
        if (!preview || !preview.value) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(preview.value).then(() => {
                if (typeof window.showToast === 'function') {
                    window.showToast('📋 Mensaje copiado al portapapeles');
                }
            }).catch(() => fallbackCopy(preview.value));
        } else {
            fallbackCopy(preview.value);
        }
    };

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            if (typeof window.showToast === 'function') {
                window.showToast('📋 Mensaje copiado al portapapeles');
            }
        } catch (e) {}
        document.body.removeChild(ta);
    }

    window.retryWhatsAppFallback = async function () {
        if (!currentFallbackContext || typeof currentFallbackContext.onRetry !== 'function') {
            window.closeWhatsAppFallbackModal();
            return;
        }
        const retryFn = currentFallbackContext.onRetry;
        window.closeWhatsAppFallbackModal();
        if (typeof window.showToast === 'function') {
            window.showToast('🔄 Reintentando envío por bot...');
        }
        try {
            await retryFn();
        } catch (err) {
            console.error('Error en reintento:', err);
        }
    };

    // Helper exportado globalmente para construir enlaces rápidos desde cualquier parte
    window.buildWhatsAppDirectUrl = function (phone, message) {
        return buildWaLink(phone, message);
    };

})();
