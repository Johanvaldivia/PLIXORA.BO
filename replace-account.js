// =============================================================
// replace-account.js
// =============================================================

window.openReplaceAccount = function(id) {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;
    pendingReplaceSaleId = id;

    const clienteLabel = sale.customerName ? `${sale.customerName} (${sale.customer})` : sale.customer;
    document.getElementById('replace-sale-info').textContent = `${sale.productName} — ${clienteLabel}`;
    document.getElementById('replace-email').value = sale.email || '';
    document.getElementById('replace-password').value = sale.password || '';

    document.getElementById('replace-account-modal').style.display = 'flex';
};

window.closeReplaceAccount = function() {
    document.getElementById('replace-account-modal').style.display = 'none';
    pendingReplaceSaleId = null;
};

window.executeReplace = async function(sendWA) {
    if (!pendingReplaceSaleId) return;
    const sale = sales.find(s => s.id === pendingReplaceSaleId);
    if (!sale) return;

    const newEmail = document.getElementById('replace-email').value.trim();
    const newPassword = document.getElementById('replace-password').value.trim();

    if (!newEmail || !newPassword) { showToast('❌ Ingresa correo y contraseña'); return; }

    const updates = { email: newEmail, password: newPassword };

    if (db) {
        try {
            await db.collection('plixora_sales').doc(pendingReplaceSaleId).update(updates);
            showToast('✅ Cuenta reemplazada correctamente');
        } catch(e) {
            console.error(e);
            showToast('❌ Error al reemplazar cuenta');
            return;
        }
    } else {
        const idx = sales.findIndex(s => s.id === pendingReplaceSaleId);
        if (idx !== -1) {
            sales[idx].email = newEmail;
            sales[idx].password = newPassword;
            localStorage.setItem('plixora_sales', JSON.stringify(sales));
            updateDashboard();
        }
        showToast('✅ Cuenta reemplazada (local)');
    }

    if (sendWA && sale.customer && sale.customer !== 'Anónimo') {
        // Create a temporary sale object with new credentials for message generation
        const updatedSale = { ...sale, email: newEmail, password: newPassword };
        const msgText = `🔄 *ACTUALIZACIÓN DE CUENTA — PLIXORA.BO*\n\n` +
                        `Hola ${sale.customerName || ''} 👋\n\n` +
                        `Se ha actualizado tu cuenta de *${sale.productName}*. Aquí están tus nuevos datos de acceso:\n\n` +
                        generateSaleDetailsText(updatedSale);

        try {
            const resp = await fetch(window.PLIXORA_CONFIG.WA_BOT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: sale.customer, message: msgText })
            });
            const data = await resp.json();
            if (data.success) {
                showToast('💬 Mensaje enviado al cliente');
            } else {
                showToast('⚠️ Cuenta guardada pero no se pudo enviar WA');
            }
        } catch(e) {
            console.log('Bot de WhatsApp no disponible.');
            showToast('⚠️ Cuenta guardada. Bot WA no disponible.');
        }
    }

    closeReplaceAccount();
}


window.confirmReplaceOnly = function() { window.executeReplace(false); };
window.confirmReplaceAndSend = function() { window.executeReplace(true); };
