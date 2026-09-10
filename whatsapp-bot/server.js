// =============================================================
// PLIXORA.BO — WHATSAPP BOT API (server.js) v2.0
// Unificado y ultra-estable: funciona en Windows y Linux (VPS/Docker).
// - Sesión 100% persistente (LocalAuth en .wwebjs_auth)
// - No borra la sesión ante desconexiones de red
// - Limpieza de locks huérfanos de Chromium en Windows
// - Puppeteer moderno con User-Agent real de Google Chrome
// - Captura de eventos loading_screen para feedback visual
// - Página /qr mejorada con actualización en vivo
// - /status ampliado y endpoints seguros con token
// =============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.WA_BOT_TOKEN || '';

// ── Estado del bot ────────────────────────────────────────────
let currentQR = null;
let isClientReady = false;
let statusMsg = 'Iniciando servicio...';
let loadingPercent = 0;
let startTime = Date.now();
let client = null;
let isRestarting = false;
let retryCount = 0;
const MAX_RETRIES = 10;

// ── Detección de Chrome/Chromium ──────────────────────────────
const possiblePaths = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // Linux (system)
    '/snap/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    // Linux (Puppeteer cache)
    '/home/opc/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome'
];

let executablePath = null;
for (const p of possiblePaths) {
    if (p.includes('*')) {
        try {
            const matches = require('glob').sync(p);
            if (matches.length > 0 && fs.existsSync(matches[0])) {
                executablePath = matches[0];
                break;
            }
        } catch (e) { /* ignore */ }
    } else if (fs.existsSync(p)) {
        executablePath = p;
        break;
    }
}

if (executablePath) {
    console.log(`🌐 Navegador detectado: ${executablePath}`);
} else {
    console.warn('⚠️ No se encontró Chrome en rutas fijas. Usando navegador integrado de Puppeteer...');
}

// ── Limpieza de locks huérfanos de Chromium (Windows) ─────────
function cleanStaleChromiumLocks() {
    const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session');
    if (!fs.existsSync(sessionDir)) return;

    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
    for (const file of lockFiles) {
        const fp = path.join(sessionDir, file);
        if (fs.existsSync(fp)) {
            try {
                fs.unlinkSync(fp);
                console.log(`🧹 Lock huérfano eliminado: ${file}`);
            } catch (e) {
                // Si el archivo está ocupado por otro proceso, no forzar
            }
        }
    }
}

// ── Destrucción segura del cliente anterior ───────────────────
async function safeDestroyClient() {
    if (!client) return;
    try {
        console.log('🛑 Cerrando cliente previo con seguridad...');
        client.removeAllListeners();
        // Intentar destruir el cliente y cerrar el navegador
        await Promise.race([
            client.destroy(),
            new Promise(r => setTimeout(r, 6000))
        ]);
        console.log('✅ Cliente previo cerrado.');
    } catch (e) {
        console.warn('⚠️ Nota al cerrar cliente previo:', e.message);
    } finally {
        client = null;
        cleanStaleChromiumLocks();
    }
}

// ── Crear y configurar cliente ────────────────────────────────
function createClient() {
    cleanStaleChromiumLocks();

    const puppeteerConfig = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
        ]
    };

    if (executablePath) {
        puppeteerConfig.executablePath = executablePath;
    }

    return new Client({
        authStrategy: new LocalAuth({
            dataPath: path.join(__dirname, '.wwebjs_auth')
        }),
        puppeteer: puppeteerConfig,
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html',
            strict: false
        }
    });
}

// ── Iniciar cliente con ciclo de vida seguro ──────────────────
async function startClient() {
    if (isRestarting) return;
    isRestarting = true;

    try {
        await safeDestroyClient();

        isClientReady = false;
        loadingPercent = 0;
        statusMsg = `Iniciando cliente WhatsApp... (intento ${retryCount + 1}/${MAX_RETRIES})`;
        console.log(`\n🚀 [${new Date().toLocaleTimeString()}] ${statusMsg}`);

        client = createClient();

        client.on('qr', (qr) => {
            currentQR = qr;
            retryCount = 0;
            statusMsg = 'PENDIENTE: Escanea el código QR con WhatsApp Business';
            console.log('\n===================================================');
            console.log('📱 CÓDIGO QR DISPONIBLE:');
            console.log(`   Abre en tu navegador: http://localhost:${PORT}/qr`);
            console.log('===================================================\n');
            try {
                const QRCodeTerminal = require('qrcode-terminal');
                QRCodeTerminal.generate(qr, { small: true });
            } catch (e) { /* terminal QR opcional */ }
        });

        client.on('loading_screen', (percent, message) => {
            loadingPercent = percent;
            currentQR = null;
            statusMsg = `Sincronizando chats (${percent}%)...`;
            console.log(`⏳ Cargando WhatsApp: ${percent}% - ${message || 'Sincronizando'}`);
        });

        client.on('authenticated', () => {
            currentQR = null;
            retryCount = 0;
            statusMsg = 'Autenticado correctamente. Sincronizando sesión...';
            console.log('✅ Autenticación exitosa. Cargando WhatsApp Web...');
        });

        client.on('ready', () => {
            currentQR = null;
            isClientReady = true;
            loadingPercent = 100;
            retryCount = 0;
            const myNumber = client.info && client.info.wid ? client.info.wid.user : 'Conectado';
            statusMsg = `LISTO - WhatsApp conectado (${myNumber})`;
            console.log(`🎉 WhatsApp LISTO y operativo! Teléfono: ${myNumber}`);
        });

        client.on('disconnected', async (reason) => {
            isClientReady = false;
            currentQR = null;
            loadingPercent = 0;
            statusMsg = 'Desconectado: ' + reason;
            console.log('⚠️ Cliente desconectado. Motivo:', reason);

            // Si el usuario cerró sesión expresamente desde el móvil:
            if (reason === 'LOGOUT') {
                console.log('📱 Sesión cerrada desde el celular. Se generará un nuevo QR...');
                const authPath = path.join(__dirname, '.wwebjs_auth');
                try {
                    fs.rmSync(authPath, { recursive: true, force: true });
                } catch (e) { /* ignore */ }
                setTimeout(() => {
                    retryCount = 0;
                    startClient();
                }, 3000);
                return;
            }

            // Para cualquier otra caída (red, reconexión, reinicio):
            // NUNCA borrar la carpeta de sesión. Mantener sesión y reconectar.
            console.log('↻ Reconectando en 5s manteniendo la sesión guardada...');
            setTimeout(() => {
                startClient();
            }, 5000);
        });

        client.on('auth_failure', (msg) => {
            isClientReady = false;
            statusMsg = 'Aviso de autenticación: ' + (msg || '');
            console.warn('⚠️ auth_failure recibido:', msg);
            // NOTA IMPORTANTE: No borramos la sesión aquí.
            // WhatsApp suele disparar esto por timeouts temporales de socket.
            console.log('↻ Reintentando conexión con sesión guardada en 5s...');
            setTimeout(() => {
                startClient();
            }, 5000);
        });

        // Inicializar cliente
        await client.initialize();
        isRestarting = false;

    } catch (err) {
        isRestarting = false;
        const msg = err && err.message ? err.message : String(err);
        console.error('❌ Error iniciando cliente WhatsApp:', msg);
        statusMsg = 'Error de inicio: ' + msg;

        if (retryCount < MAX_RETRIES && !isClientReady) {
            retryCount++;
            console.log(`↻ Reintentando en 6s... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(startClient, 6000);
        }
    }
}

// ── Middleware ────────────────────────────────────────────────
// CORS permisivo para local, localhost en cualquier puerto, file:// (origin null) y Render
app.use(cors({
    origin: (origin, callback) => {
        // Permitir solicitudes sin origin (como herramientas locales, Postman o file://)
        if (!origin || origin === 'null') return callback(null, true);
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return callback(null, true);
        if (origin.includes('onrender.com') || origin.includes('trycloudflare.com') || origin.includes('duckdns.org')) {
            return callback(null, true);
        }
        return callback(null, true); // Permitir cualquier origen local de la red
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));

// Autenticación por token para la API (excepto /qr, /status, /)
function requireToken(req, res, next) {
    if (!BOT_TOKEN) return next(); // Sin token configurado = acceso libre en local
    const auth = req.headers.authorization || '';
    if (auth === 'Bearer ' + BOT_TOKEN) return next();
    return res.status(401).json({ success: false, error: 'Token de seguridad inválido o faltante.' });
}

// ── Rutas Web ─────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.redirect('/qr');
});

app.get('/qr', async (req, res) => {
    // Si ya está conectado
    if (isClientReady) {
        const phone = client && client.info && client.info.wid ? client.info.wid.user : 'Activo';
        return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PLIXORA Bot - Conectado</title>
    <style>
        body { background: #0f1117; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #1a1d26; border: 1px solid #2a2f40; border-radius: 20px; padding: 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(37, 211, 102, 0.15); color: #25D366; font-weight: 600; padding: 8px 18px; border-radius: 99px; font-size: 0.9rem; margin-bottom: 20px; border: 1px solid rgba(37, 211, 102, 0.3); }
        .dot { width: 10px; height: 10px; background: #25D366; border-radius: 50%; box-shadow: 0 0 10px #25D366; }
        h1 { margin: 0 0 10px; font-size: 1.6rem; }
        p { color: #8f9bb3; line-height: 1.5; margin: 0 0 24px; font-size: 0.95rem; }
        .info-box { background: #13151c; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left; font-size: 0.9rem; }
        .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #202433; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #8f9bb3; }
        .info-val { font-weight: 600; color: #fff; }
        .btn { display: inline-block; background: #25D366; color: #000; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 10px; cursor: pointer; border: none; font-size: 0.95rem; transition: all 0.2s; }
        .btn:hover { background: #1eb956; transform: translateY(-1px); }
        .btn-restart { background: rgba(255,255,255,0.08); color: #ff5e3a; border: 1px solid rgba(255,94,58,0.3); margin-top: 10px; }
        .btn-restart:hover { background: rgba(255,94,58,0.15); }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge"><span class="dot"></span> ONLINE Y LISTO</div>
        <h1>WhatsApp Conectado</h1>
        <p>El bot de PLIXORA.BO está vinculado y listo para enviar mensajes automáticamente.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Teléfono vinculado:</span><span class="info-val">+${phone}</span></div>
            <div class="info-row"><span class="info-label">Sesión:</span><span class="info-val" style="color:#25D366;">Persistente (.wwebjs_auth)</span></div>
            <div class="info-row"><span class="info-label">Puerto API:</span><span class="info-val">${PORT}</span></div>
        </div>
        <p style="font-size:0.8rem; color:#667085;">Puedes cerrar esta pestaña. El bot seguirá funcionando en segundo plano.</p>
        <button class="btn btn-restart" onclick="if(confirm('¿Deseas reiniciar la conexión del bot? (Tu sesión guardada NO se borrará)')) location.href='/api/restart-bot'">↻ Reiniciar Conexión</button>
    </div>
</body>
</html>`);
    }

    // Si está sincronizando chats
    if (loadingPercent > 0 && loadingPercent < 100) {
        return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PLIXORA Bot - Sincronizando</title>
    <meta http-equiv="refresh" content="3">
    <style>
        body { background: #0f1117; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1a1d26; border: 1px solid #2a2f40; border-radius: 20px; padding: 40px; max-width: 440px; width: 100%; text-align: center; }
        .progress-bar-bg { background: #13151c; border-radius: 12px; height: 12px; overflow: hidden; margin: 24px 0 12px; border: 1px solid #2a2f40; }
        .progress-bar { background: #25D366; height: 100%; width: ${loadingPercent}%; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="card">
        <h2>⏳ Sincronizando WhatsApp...</h2>
        <p style="color:#8f9bb3;">Descargando tus chats y preparando el servicio.</p>
        <div class="progress-bar-bg"><div class="progress-bar"></div></div>
        <strong style="color:#25D366; font-size:1.4rem;">${loadingPercent}%</strong>
        <p style="font-size:0.85rem; color:#667085; margin-top:16px;">Esta pantalla se actualizará automáticamente en unos segundos.</p>
    </div>
</body>
</html>`);
    }

    // Si todavía no hay QR generado
    if (!currentQR) {
        return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PLIXORA Bot - Iniciando</title>
    <meta http-equiv="refresh" content="3">
    <style>
        body { background: #0f1117; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1a1d26; border: 1px solid #2a2f40; border-radius: 20px; padding: 40px; max-width: 440px; width: 100%; text-align: center; }
        .spinner { width: 44px; height: 44px; border: 4px solid rgba(37,211,102,0.2); border-top-color: #25D366; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h2>Iniciando WhatsApp...</h2>
        <p style="color:#8f9bb3;">${statusMsg}</p>
        <p style="font-size:0.8rem; color:#667085;">Cargando perfil seguro. Recargando en 3s...</p>
    </div>
</body>
</html>`);
    }

    // Mostrar código QR
    try {
        const qrImage = await QRCode.toDataURL(currentQR, { width: 400, margin: 2 });
        res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vincular WhatsApp - PLIXORA.BO</title>
    <meta http-equiv="refresh" content="20">
    <style>
        body { background: #0b0c10; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #151821; border: 1px solid #252a38; border-radius: 24px; padding: 36px 30px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.6); }
        h1 { font-size: 1.4rem; margin: 0 0 8px; color: #25D366; display: flex; align-items: center; justify-content: center; gap: 8px; }
        p { color: #9aa5b8; font-size: 0.9rem; line-height: 1.45; margin: 0 0 20px; }
        .qr-box { background: #fff; display: inline-block; border-radius: 18px; padding: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.4); margin-bottom: 20px; }
        .qr-box img { display: block; max-width: 100%; width: 320px; height: 320px; border-radius: 8px; }
        .steps { background: #0e1017; border-radius: 12px; padding: 14px 18px; text-align: left; font-size: 0.84rem; color: #cbd5e1; line-height: 1.6; margin-bottom: 16px; border: 1px solid #1f2430; }
        .steps strong { color: #fff; }
        .timer { font-size: 0.78rem; color: #64748b; }
    </style>
</head>
<body>
    <div class="card">
        <h1>📱 Vincular WhatsApp</h1>
        <p>Escanea este código QR una sola vez para que el sistema envíe tus pedidos automáticamente.</p>
        
        <div class="qr-box">
            <img src="${qrImage}" alt="Código QR de WhatsApp"/>
        </div>

        <div class="steps">
            1. Abre <strong>WhatsApp Business</strong> en tu celular.<br>
            2. Toca <strong>Menú (⋮)</strong> o <strong>Ajustes</strong> → <strong>Dispositivos vinculados</strong>.<br>
            3. Toca <strong>Vincular un dispositivo</strong> y apunta tu cámara aquí.
        </div>

        <div class="timer">↻ El código se actualiza automáticamente. Tu sesión quedará guardada permanentemente.</div>
    </div>
</body>
</html>`);
    } catch (err) {
        res.status(500).send('Error generando QR: ' + err.message);
    }
});

// Endpoint de reinicio manual
app.get('/api/restart-bot', async (req, res) => {
    console.log('🔄 Petición manual de reinicio del bot...');
    res.send('<body style="background:#111;color:#0f0;font-family:sans-serif;text-align:center;padding:50px;"><h2>↻ Reiniciando bot...</h2><p>Redirigiendo a /qr en 4 segundos...</p><script>setTimeout(()=>location.href="/qr",4000)</script></body>');
    setTimeout(() => {
        retryCount = 0;
        startClient();
    }, 1000);
});

// Estado en JSON para el frontend
app.get('/status', (req, res) => {
    const uptimeS = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptimeS / 3600);
    const m = Math.floor((uptimeS % 3600) / 60);
    const phone = client && client.info && client.info.wid ? client.info.wid.user : null;

    res.json({
        ready: isClientReady,
        status: statusMsg,
        hasQR: !!currentQR,
        qr: currentQR,
        phone: phone,
        loadingPercent: loadingPercent,
        uptime: `${h}h ${m}m`,
        uptimeSeconds: uptimeS
    });
});

// ── API: Enviar Mensaje de Texto ──────────────────────────────
app.post('/api/send-message', requireToken, async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp no está conectado todavía. Verifica en /qr' });
        }
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros obligatorios (phone, message).' });
        }

        let fp = String(phone).replace(/[^0-9]/g, '');
        // Bolivia: Si tiene 8 dígitos, anteponer 591
        if (!fp.startsWith('591') && fp.length === 8) {
            fp = '591' + fp;
        }

        const chatId = fp + '@c.us';
        await client.sendMessage(chatId, String(message));
        console.log(`💬 Mensaje enviado exitosamente a ${fp}`);
        return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente.' });
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
        return res.status(500).json({ success: false, error: error.message || error.toString() });
    }
});

// ── API: Enviar Imagen con Texto ──────────────────────────────
app.post('/api/send-image', requireToken, async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp no está conectado todavía. Verifica en /qr' });
        }
        const { phone, imageUrl, caption } = req.body;
        if (!phone || !imageUrl) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros (phone, imageUrl).' });
        }

        let fp = String(phone).replace(/[^0-9]/g, '');
        if (!fp.startsWith('591') && fp.length === 8) {
            fp = '591' + fp;
        }

        let media;
        // Si es netflix-instrucciones.png, buscarlo localmente en la carpeta del bot
        if (String(imageUrl).includes('netflix-instrucciones.png')) {
            const localPath = path.join(__dirname, 'netflix-instrucciones.png');
            if (fs.existsSync(localPath)) {
                media = MessageMedia.fromFilePath(localPath);
                console.log('📦 Cargando netflix-instrucciones.png desde disco local');
            }
        }

        if (!media) {
            media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
        }

        const chatId = fp + '@c.us';
        await client.sendMessage(chatId, media, { caption: caption || '' });
        console.log(`🖼️ Imagen enviada exitosamente a ${fp}`);
        return res.status(200).json({ success: true, message: 'Imagen enviada correctamente.' });
    } catch (error) {
        console.error('❌ Error al enviar imagen:', error);
        return res.status(500).json({ success: false, error: error.message || error.toString() });
    }
});

// ── Inicio del Servidor Express ───────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n============================================================');
    console.log(`🚀 SERVIDOR PLIXORA BOT ACTIVO EN PUERTO ${PORT}`);
    console.log(`📱 Código QR y Estado: http://localhost:${PORT}/qr`);
    console.log(`📊 Estado en JSON:     http://localhost:${PORT}/status`);
    console.log(`💬 Enviar Mensaje:     POST http://localhost:${PORT}/api/send-message`);
    console.log('============================================================\n');

    // Iniciar cliente de WhatsApp
    startClient();
});

// ── Control de Errores Globales ───────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('💥 Error no capturado:', err.message);
    if (err.message.includes('Protocol error') || err.message.includes('Target closed') || err.message.includes('Session closed')) {
        console.log('↻ Recuperando cliente tras caída de Chromium...');
        isClientReady = false;
        setTimeout(() => {
            startClient();
        }, 5000);
    }
});

process.on('unhandledRejection', (reason) => {
    console.warn('⚠️ Advertencia unhandledRejection:', reason && reason.message ? reason.message : reason);
});

// Cierre ordenado en Ctrl+C
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor y cliente WhatsApp...');
    await safeDestroyClient();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🛑 Señal SIGTERM recibida. Cerrando...');
    await safeDestroyClient();
    process.exit(0);
});
