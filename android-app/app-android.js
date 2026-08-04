// =============================================================
// PLIXORA.BO — MODIFICACIONES SOLO PARA ANDROID (APK)
// =============================================================
// Este archivo se APPENDEA a www/app.js durante la construccion
// de la APK. NO editar directamente - usa android-app/app-android.js
// =============================================================

// ── STATUSBAR (Android) ────────────────────────────────────
(function initAndroid() {
    if (!window.Capacitor?.isNativePlatform()) return;

    // StatusBar - se integra con el navbar
    setTimeout(async () => {
        try {
            const { StatusBar } = window.Capacitor.Plugins;
            if (StatusBar) await StatusBar.setStyle({ style: 'DARK' });
        } catch (e) { /* StatusBar no disponible */ }
    }, 300);

    // Disparar evento para notificaciones push
    window.dispatchEvent(new Event('appReady'));
})();

// ── PUSH NOTIFICATIONS (Android) ───────────────────────────
(function initExpirationNotifications() {
    if (!window.Capacitor?.isNativePlatform()) return;

    let _notifScheduled = {};

    async function requestNotifPermission() {
        if (!window.Capacitor?.isNativePlatform()) return;
        try {
            const { LocalNotifications } = window.Capacitor.Plugins;
            if (LocalNotifications) {
                const perm = await LocalNotifications.requestPermissions();
                if (perm.display !== 'granted') {
                    console.warn('Permiso de notificaciones no concedido');
                }
            }
        } catch (e) { /* Not available */ }
    }

    function scheduleExpirationNotifs() {
        if (!window.Capacitor?.isNativePlatform()) return;
        if (!sales || sales.length === 0) return;

        const today = nowBolivia(); today.setHours(0,0,0,0);
        const notifications = [];

        sales.forEach(sale => {
            if (!sale.expireDate) return;
            if (sale.alertDismissed) return;
            const prodName = (sale.productName || '').toLowerCase();
            if (prodName.includes('netflix')) return;

            const expDate = new Date(sale.expireDate); expDate.setHours(0,0,0,0);
            const diffDays = Math.ceil((expDate - today) / 86400000);
            if (diffDays < 0 || diffDays > 7) return;
            if (_notifScheduled[sale.id]) return;

            const title = diffDays === 0
                ? 'Vence HOY'
                : diffDays === 1
                    ? 'Vence MANANA'
                    : `Vence en ${diffDays} dias`;
            const body = `${sale.productName} - ${sale.customerName || sale.customer}`;

            notifications.push({
                id: parseInt(sale.id.slice(-8), 10) % 2147483647,
                title: `PLIXORA: ${title}`,
                body: body,
                schedule: { at: new Date(Date.now() + 1000) },
                smallIcon: 'ic_launcher',
                largeIcon: 'ic_launcher',
                ongoing: false,
                autoCancel: true
            });
            _notifScheduled[sale.id] = true;
        });

        if (notifications.length > 0) {
            (async () => {
                try {
                    const { LocalNotifications } = window.Capacitor.Plugins;
                    if (LocalNotifications) {
                        await LocalNotifications.schedule({ notifications });
                        console.log(`[PLIXORA] ${notifications.length} notificaciones programadas`);
                    }
                } catch (e) {
                    console.warn('Error programando notificaciones:', e);
                }
            })();
        }
    }

    window.addEventListener('appReady', () => {
        requestNotifPermission();
        scheduleExpirationNotifs();
    });

    const origUpdate = window.updateDashboard;
    window.updateDashboard = function() {
        if (origUpdate) origUpdate();
        scheduleExpirationNotifs();
    };
})();
