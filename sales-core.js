// =============================================================
// sales-core.js
// =============================================================

window.nowBolivia = function() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
}

window.sanitizeBoliviaPhone = function(raw) {
    if (!raw) return '';
    let digits = raw.replace(/[^0-9]/g, '');
    // Quitar código de país 591 si está al inicio
    if (digits.startsWith('591') && digits.length > 8) {
        digits = digits.substring(3);
    }
    // Quitar 0 inicial si tiene (ej: 073651440)
    if (digits.startsWith('0') && digits.length > 8) {
        digits = digits.substring(1);
    }
    // Tomar los últimos 8 dígitos como número boliviano
    if (digits.length > 8) {
        digits = digits.slice(-8);
    }
    return digits;
}

window.filterSalesByPeriod = function(salesArr) {
    const now = nowBolivia();
    if (currentPeriod === 'all') return salesArr;
    return salesArr.filter(s => {
        const d = new Date(s.date);
        if (currentPeriod === 'today') {
            return d.toDateString() === now.toDateString();
        } else if (currentPeriod === 'week') {
            const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
            return d >= weekAgo;
        } else if (currentPeriod === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return true;
    });
}

window.generateOrderCode = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'PLX-' + rand;
}

window.calculateExpirationDate = function(durationStr) {
    const today = nowBolivia();
    if (durationStr.includes('35 días')) {
        today.setDate(today.getDate() + 35);
        return today.toISOString();
    }

    const monthMatch = durationStr.match(/(\d+)\s*mes(es)?/i);
    if (monthMatch) {
        const months = parseInt(monthMatch[1], 10);
        today.setMonth(today.getMonth() + months);
        today.setDate(today.getDate() - 1); // Aviso 1 día antes del corte
        return today.toISOString();
    }

    const yearMatch = durationStr.match(/(\d+)\s*año/i);
    if (yearMatch) {
        today.setFullYear(today.getFullYear() + parseInt(yearMatch[1], 10));
        return today.toISOString();
    }

    return null;
}

window.buildExpireBadge = function(expireDate) {
    if (!expireDate) return '<span style="color: var(--text-muted); font-size: 0.85rem;">Indefinido</span>';

    const today = nowBolivia(); today.setHours(0,0,0,0);
    const expDate = new Date(expireDate); expDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((expDate - today) / 86400000);

    let color, text;
    if (diffDays < 0) {
        color = 'var(--accent-red)';
        text = `Venció hace ${Math.abs(diffDays)} d.`;
    } else if (diffDays === 0) {
        color = '#f59e0b';
        text = 'Vence HOY ⚠️';
    } else if (diffDays <= 5) {
        color = '#f59e0b';
        text = `En ${diffDays} días ⚠️`;
    } else {
        color = 'var(--accent-green)';
        text = `En ${diffDays} días`;
    }

    return `<div style="display:flex; flex-direction:column; gap:0.2rem;">
        <span style="font-size:0.85rem;">${new Date(expireDate).toLocaleDateString('es-ES')}</span>
        <span style="color:${color}; font-size:0.75rem; font-weight:600; background:${color}20; padding:0.15rem 0.5rem; border-radius:4px; display:inline-block;">${text}</span>
    </div>`;
}

window.generateSaleDetailsText = function(sale) {
    const prodName = (sale.productName || '').toLowerCase();
    const codeLine = sale.orderCode ? `🎫 *Pedido:* ${sale.orderCode}\n` : '';
    const clienteName = sale.customerName || 'Cliente';

    // Format duration instead of expiration
    let duracionLine = '';
    const matchDuracion = (sale.productName || '').match(/\[(.*?)\]/) || (sale.productName || '').match(/\((.*?meses?.*?|.*?año.*?)\)/i);
    if (matchDuracion) {
        let textDur = matchDuracion[1] || matchDuracion[0].replace(/[()\[\]]/g, '');
        duracionLine = `📌 *Duración:* ${textDur}\n`;
    }

    // Standard prohibition (applies to ALL products)
    const prohibicion = `\n⚠️ _Prohibido cambiar la contraseña, correo o tocar la facturación. Caso contrario, se dará de baja automáticamente._`;
    const footer = `\n_PLIXORA.BO — Gracias por tu compra 🧡_`;

    // ── CapCut Pro ──
    if (prodName.includes('capcut')) {
        return `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `      *PLIXORA.BO* 🌟\n` +
               `  ✂️ *CAPCUT PRO*\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               codeLine + `\n` +
               `Hola *${clienteName}* 👋\n\n` +
               `¡Tu cuenta de *CapCut Pro* ya está *activa* y lista para usar! 🎉\n\n` +
               duracionLine +
               `┌─────────────────────────\n` +
               `│ 📧 *Correo:* \`${sale.email || ''}\`\n` +
               `│ 🔑 *Contraseña:* \`${sale.password || ''}\`\n` +
               `└─────────────────────────\n\n` +
               `🛡️ *PARA EVITAR BLOQUEOS:*\n` +
               `✅ Usa la cuenta solo en tu dispositivo.\n` +
               `✅ No cambies la contraseña.\n` +
               `✅ No cierres la sesión de otros usuarios.\n` +
               `✅ No compartas el acceso con otra persona.\n` +
               `✅ Ingresa con cuidado los datos de acceso.\n\n` +
               `❌ _Si la cuenta se bloquea por mal uso, no hay cambio, devolución ni garantía._\n\n` +
               `✅ _La garantía solo aplica si la cuenta deja de funcionar por problema de facturación._\n\n` +
               `🔧 _En caso de que la cuenta se caiga o esté fuera de servicio, el reemplazo o restablecimiento se realiza en un plazo máximo de *24 horas*._\n\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `_PLIXORA.BO — Gracias por tu compra 🧡_\n` +
               `_Ante cualquier consulta, estamos para ayudarte._`;
    }

    // ── Amazon Prime ──
    if (prodName.includes('amazon prime')) {
        let duracionFinal = duracionLine || `📌 *Duración:* 6 Meses\n`;

        return `*PLIXORA.BO* | 📦 *Amazon Prime Video*\n` +
               codeLine + `\n` +
               `Hola *${clienteName}* 👋\n\n` +
               `¡Tu cuenta de *Amazon Prime Video* ya está activa y lista para usar! 🎉\n\n` +
               duracionFinal +
               `📧 *Correo:* \`${sale.email || ''}\`\n` +
               `🔑 *Contraseña:* \`${sale.password || ''}\`\n\n` +
               `📋 *DETALLES DE TU CUENTA:*\n` +
               `✅ Cuenta personal registrada y gestionada exclusivamente bajo nuestro dominio.\n` +
               `✅ Autopay mensual: cada mes se renueva automáticamente.\n` +
               `✅ Acceso completo a películas, series y funciones Prime.\n` +
               `✅ Cuenta privada y personal, no compartida ni EDU.\n\n` +
               `ℹ️ _Las cuentas son autopay mensuales (se cobran cada mes), no facturadas por 6 meses._\n\n` +
               `⚠️ _Prohibido cambiar la contraseña, correo o tocar la facturación. Caso contrario, se dará de baja automáticamente._\n\n` +
               `🔧 _En caso de que la cuenta se caiga o esté fuera de servicio, el reemplazo o restablecimiento se realiza en un plazo máximo de *24 horas*._\n\n` +
               `_PLIXORA.BO — Gracias por tu compra 🧡_`;
    }

    // ── Spotify Premium ──
    if (prodName.includes('spotify')) {
        let durLine = duracionLine;
        if (!durLine) {
            // Fallback for duration if regex fails
            if (prodName.includes('1 mes')) durLine = `📌 *Duración:* 1 mes\n`;
            else if (prodName.includes('3 mes')) durLine = `📌 *Duración:* 3 meses\n`;
            else if (prodName.includes('6 mes')) durLine = `📌 *Duración:* 6 meses\n`;
            else if (prodName.includes('12 mes')) durLine = `📌 *Duración:* 12 meses\n`;
        }
        return `Hola *${clienteName}*, gracias por tu compra en *PLIXORA.BO* 👋\n\n` +
               `Tu cuenta de *Spotify Premium* está activada con éxito.\n` +
               durLine + `\n` +
               `📩 *TUS DATOS DE ACCESO:*\n` +
               `*Correo:* \`${sale.email || ''}\`\n` +
               `*Contraseña:* \`${sale.password || ''}\`\n\n` +
               `📌 _Nota: Inicia sesión ingresando el correo y contraseña directamente en Spotify, no uses la opción de "Ingresar con Google"._\n\n` +
               `⚠️ *ADVERTENCIA:*\n` +
               `Para mantener tu garantía activa, está estrictamente prohibido cambiar la contraseña, el correo o los datos de facturación.\n\n` +
               `🛡️ *GARANTÍA O REEMPLAZO:*\n` +
               `En caso de que haya una interrupción o deje de funcionar el servicio, por favor envíame tu *N° de Pedido (${sale.orderCode || 'PLX-####'})* y el nombre del servicio. ` +
               `Una vez verificado y aceptado el reporte, el restablecimiento tardará un máximo de *12 a 24 horas*.\n\n` +
               `¡Disfruta tu música sin anuncios! 🎵✨`;
    }

    // ── Netflix (from history, matches module style) ──
    if (prodName.includes('netflix')) {
        return `*PLIXORA.BO* | 🎬 *Netflix Premium*\n` +
               codeLine + `\n` +
               duracionLine +
               `📧 *Correo:* \`${sale.email || ''}\`\n` +
               `🔑 *Contraseña:* \`${sale.password || ''}\`\n\n` +
               `⚠️ *(LA CONTRASEÑA INCLUYE MÁS CON EL * )*\n` +
               `*POR FAVOR INGRESAR BIEN LA CONTRASEÑA*\n\n` +
               `🔒 _Puedes crear un PIN en tu perfil si deseas mayor privacidad._\n\n` +
               `🚫 *REGLAS ESTRICTAS DE USO:*\n` +
               `• *Prohibido cambiar el nombre del perfil.*\n` +
               `• 📺 *LÍMITE DE PANTALLA:* Solo se permite reproducir contenido en *1 dispositivo a la vez*.\n` +
               `_Si el sistema detecta reproducción simultánea en 2 o más pantallas, tu perfil será suspendido automáticamente sin derecho a reembolso o se aplicará una multa por incumplimiento de términos y condiciones._`;
    }

    // ── Disney Plus ──
    if (prodName.includes('disney')) {
        return `*PLIXORA.BO* | 🏰 *Disney Plus Estándar*\n` +
               codeLine + `\n` +
               duracionLine +
               `📧 *Correo:* \`${sale.email || ''}\`\n` +
               `🔑 *Contraseña:* \`${sale.password || ''}\`\n` +
               prohibicion + `\n` + footer;
    }

    // ── Canva Pro EDU (NO TOCAR) ──
    if (prodName.includes('canva') && (prodName.includes('edu') || prodName.includes('class'))) {
        return `*${sale.productName}*\n${codeLine}\nHola ${clienteName} 👋,\n\nSe ha activado y mandado la invitación vía correo al siguiente email:\n📧 \`${sale.email || ''}\`\n\nPor favor, revisar y aceptar la invitación. Luego, asegurarse de estar en el equipo *PLIXORA (CLASS)* para que tenga acceso siempre a los beneficios Pro.\n\nPLIXORA.BO`;
    }

    // ── Gemini Pro ──
    if (prodName.toLowerCase().includes('gemini pro')) {
        return `*PLIXORA.BO* | 🚀 *Gemini Advanced (Pro)*\n` +
               codeLine + `\n` +
               `Hola *${clienteName}* 👋,\n\n` +
               `Se ha activado su suscripción y se le ha enviado la invitación oficial de Google al siguiente correo electrónico:\n` +
               `📧 \`${sale.email || ''}\`\n\n` +
               `Por favor, revise su bandeja de entrada (o spam) y acepte la invitación para comenzar a disfrutar de todos los beneficios de la inteligencia artificial.\n\n` +
               `✅ _Activación directa en su cuenta personal y 100% privada._\n` +
               footer;
    }

    // ── Canva Pro Individual ──
    if (prodName.includes('canva')) {
        return `*PLIXORA.BO* | 🎨 *Canva Pro Individual*\n` +
               codeLine + `\n` +
               duracionLine +
               `📧 *Correo:* \`${sale.email || ''}\`\n` +
               `🔑 *Contraseña:* \`${sale.password || ''}\`\n` +
               prohibicion + `\n` + footer;
    }

    // ── Crunchyroll (Fan / Fan Anual / Mega Fan) ──
    if (prodName.includes('crunchyroll')) {
        return `*PLIXORA.BO* | 🍥 *${sale.productName}*\n` +
               codeLine + `\n` +
               duracionLine +
               `📧 *Correo:* \`${sale.email || ''}\`\n` +
               `🔑 *Contraseña:* \`${sale.password || ''}\`\n` +
               prohibicion + `\n\n` +
               `✅ _Garantía completa incluida en PLIXORA.BO_`;
    }

    // ── HBO MAX PLATINO ──
    if (prodName.includes('hbo')) {
        return `*PLIXORA.BO* | 📺 *HBO MAX PLATINO*\n` +
               codeLine + `\n` +
               duracionLine +
               `📧 *Correo:* \`${sale.email || ''}\`\n` +
               `🔑 *Contraseña:* \`${sale.password || ''}\`\n` +
               prohibicion + `\n` + footer;
    }

    // ── YouTube Premium Familiar (cuenta completa con invitaciones) ──
    if (prodName.includes('youtube') && prodName.includes('familiar')) {
        return `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `      *PLIXORA.BO* 🌟\n` +
               `  ▶️ *YOUTUBE PREMIUM FAMILIAR*\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
               codeLine +
               `Hola *${clienteName}* 👋\n\n` +
               `¡Tu cuenta de *YouTube Premium Familiar* ya está *activa* y lista para usar! 🎉\n\n` +
               `📌 *DATOS DE ACCESO:*\n` +
               `┌─────────────────────────\n` +
               `│ 📧 *Correo:* \`${sale.email || ''}\`\n` +
               `│ 🔑 *Contraseña:* \`${sale.password || ''}\`\n` +
               `└─────────────────────────\n\n` +
               `📋 *PASOS PARA ACTIVAR:*\n\n` +
               `1️⃣ Ingresa a *youtube.com* o abre la app de YouTube.\n` +
               `2️⃣ Inicia sesión en Google con el *correo y contraseña* que se te proporcionó arriba.\n` +
               `3️⃣ ¡Listo! Tu cuenta ya está activa y funcionando con todos los beneficios Premium. ✅\n\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `👨‍👩‍👧‍👦 *PLAN FAMILIAR — 4 INVITACIONES*\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
               `Tu plan incluye la posibilidad de activar *YouTube Premium* en *4 correos adicionales* mediante invitación.\n\n` +
               `✉️ *¿Cómo activar las invitaciones?*\n` +
               `• Desde la cuenta, ve a *Ajustes > Plan Familiar* y envía las invitaciones a los correos que desees.\n` +
               `• O si prefieres, *nosotros te ayudamos* con mucho gusto. Solo envíanos los correos de Gmail y nos encargamos de enviar las invitaciones por ti. 😊\n\n` +
               `⚠️ *IMPORTANTE:*\n` +
               `• _Prohibido cambiar la contraseña, correo o tocar la facturación del plan. Caso contrario, se dará de baja automáticamente._\n` +
               `• _Los correos invitados deben aceptar la invitación desde su Gmail para que se active correctamente._\n\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `_PLIXORA.BO — Gracias por tu compra 🧡_\n` +
               `_Ante cualquier consulta, estamos para ayudarte._`;
    }

    // ── YouTube Premium Individual (invitación vía correo) ──
    if (prodName.includes('youtube')) {
        return `*PLIXORA.BO* | ▶️ *YouTube Premium*\n` +
               codeLine + `\n` +
               `Hola *${clienteName}* 👋\n\n` +
               `Ya se le activó su cuenta de *YouTube Premium* y se encuentra ya su invitación enviada al siguiente correo:\n` +
               `📧 \`${sale.email || ''}\`\n\n` +
               `Por favor, revise su correo de Gmail para aceptar y unirse al plan familiar de YouTube Premium y disfrutar sin anuncios 🎉\n` +
               prohibicion + `\n` + footer;
    }

    // ── Prime Video ──
    if (prodName.includes('prime')) {
        return `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `      *PLIXORA.BO* 🌟\n` +
               `  🎬 *PRIME VIDEO*\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               codeLine + `\n` +
               `Hola *${clienteName}* 👋\n\n` +
               `¡Tu cuenta de *Prime Video* ya está *activa*! 🎉\n\n` +
               duracionLine +
               `📩 *TUS DATOS DE ACCESO:*\n` +
               `*Correo:* \`${sale.email || ''}\`\n` +
               `*Contraseña:* \`${sale.password || ''}\`\n\n` +
               `📌 *Importante*\n` +
               `SOLO INGRESAR EN 1 DISPOSITIVO\n` +
               `NO CAMBIAR DE DISPOSITIVO\n` +
               `✔️ Use su perfil asignado.\n` +
               `✔️ No compartir perfil.\n` +
               `✔️ Si necesitas un código, avísanos.\n` +
               prohibicion + `\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               footer;
    }

    // ── Adobe Creative Cloud ──
    if (prodName.includes('adobe')) {
        return `*PLIXORA.BO* | 🎨 *Adobe Creative Cloud*\n` +
               codeLine + `\n` +
               duracionLine +
               `📧 *Correo:* \`${sale.email || ''}\`\n` +
               `🔑 *Contraseña:* \`${sale.password || ''}\`\n\n` +
               `⚠️ *POR FAVOR INGRESAR BIEN LA CONTRASEÑA*\n` +
               prohibicion + `\n` + footer;
    }

    // ── Express VPN ──
    if (prodName.includes('vpn') || prodName.includes('express')) {
        return `*PLIXORA.BO* | 🔐 *Express VPN*\n` +
               codeLine + `\n` +
               duracionLine +
               `📧 *Correo:* \`${sale.email || ''}\`\n` +
               `🔑 *Contraseña:* \`${sale.password || ''}\`\n` +
               prohibicion + `\n` + footer;
    }

    // ── Combos y cualquier otro producto ──
    return `*PLIXORA.BO* | 🛒 *${sale.productName}*\n` +
           codeLine + `\n` +
           duracionLine +
           (sale.email ? `📧 *Correo:* \`${sale.email}\`\n` : '') +
           (sale.password ? `🔑 *Contraseña:* \`${sale.password}\`\n` : '') +
           prohibicion + `\n` + footer;
}

window.saveSale = async function(newSale) {
    if (db) {
        // Firebase: el listener onSnapshot actualiza la UI automáticamente
        await db.collection('plixora_sales').doc(newSale.id).set(newSale);
    } else {
        // Fallback local
        sales.push(newSale);
        localStorage.setItem('plixora_sales', JSON.stringify(sales));
        updateDashboard();
    }
}

window.removeSale = async function(id) {
    if (db) {
        await db.collection('plixora_sales').doc(id).delete();
    } else {
        sales = sales.filter(s => s.id !== id);
        localStorage.setItem('plixora_sales', JSON.stringify(sales));
        updateDashboard();
    }
}

