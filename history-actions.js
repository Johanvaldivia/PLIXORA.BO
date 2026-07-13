// =============================================================
// history-actions.js
// =============================================================

window.copySaleDetail = function(id) {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;

    const text = generateSaleDetailsText(sale);
    navigator.clipboard.writeText(text).then(() => showToast('📋 Detalle copiado'));
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
        extraData += `📧 *Correo:* \`${sale.email}\`\n`;
    }
    if (sale.password) {
        extraData += `🔑 *Contraseña:* \`${sale.password}\`\n`;
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

window.closeHistNotify = function() {
    document.getElementById('hist-notify-modal').style.display = 'none';
    pendingHistNotifyPayload = null;
};

window.confirmHistNotifySend = async function() {
    if (!pendingHistNotifyPayload) return;
    const { id: saleId, phone, cliente } = pendingHistNotifyPayload;
    const msg = document.getElementById('hist-notify-msg').value.trim();

    if (!msg) { showToast('❌ El mensaje no puede estar vacío'); return; }

    closeHistNotify();
    showToast('📤 Enviando aviso por WhatsApp...');

    try {
        const resp = await waBotFetch(window.PLIXORA_CONFIG.WA_BOT_URL, { phone: phone, message: msg });

        const contentType = resp.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const textSnippet = (await resp.text()).substring(0, 120);
            console.error('Respuesta no JSON del bot:', textSnippet);
            throw new Error(`El bot respondió con HTML (status ${resp.status}). Verifica que el servidor esté activo.`);
        }

        const data = await resp.json();
        if (!data.success) throw new Error(data.error || 'Error enviando mensaje');

        if (db) {
            await db.collection('plixora_sales').doc(saleId).update({ notifiedRenewal: true });
        } else {
            const idx = sales.findIndex(s => s.id === saleId);
            if (idx !== -1) {
                sales[idx].notifiedRenewal = true;
                localStorage.setItem('plixora_sales', JSON.stringify(sales));
            }
        }
        updateDashboard();

        showToast('✅ Aviso enviado a ' + cliente);
    } catch (error) {
        console.error('Error enviando aviso:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showToast('❌ No se pudo conectar al bot de WhatsApp. Verifica tu conexión.');
        } else {
            showToast('❌ ' + error.message);
        }
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

window.syncNetflixProfileEdit = async function(sale, newName, newWa) {
    // Delegate to netflix.js exposed function
    if (typeof window.nfSyncProfileEdit !== 'function') return;

    const match = sale.productName.match(/Perfil (.*?) \((.*?)\)/);
    if (!match) return;
    const pNombre = match[1];
    const accCodigo = match[2];

    // Find profile index by name
    try {
        window.nfSyncProfileEdit(accCodigo, pNombre, newName, newWa);
    } catch(e) { console.error('Error syncing netflix edit', e); }
}

