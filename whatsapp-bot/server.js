// =============================================================
// PLIXORA.BO — WHATSAPP BOT API (server.js)
// Unificado: funciona en Windows y Linux (nube/VPS).
// - Sesión persistente (LocalAuth) en .wwebjs_auth
// - Página /qr para escanear desde el navegador
// - /status para ver estado en JSON
// - /api/send-message y /api/send-image con token de seguridad
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
let statusMsg = 'Iniciando...';
let startTime = Date.now();

// ── Configuración de Puppeteer (multi-plataforma) ─────────────
const possiblePaths = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Linux (system)
    '/snap/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    // Linux (Puppeteer cache)
    '/home/opc/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome'
];

let executablePath;
for (const p of possiblePaths) {
    const matches = require('glob').sync(p);
    if (matches.length > 0) {
        executablePath = matches[0];
        break;
    }
}

const puppeteerOptions = {
    headless: 'new',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--headless=new'
    ]
};
if (executablePath) {
    puppeteerOptions.executablePath = executablePath;
    console.log(`Chrome detectado: ${executablePath}`);
} else {
    console.warn('⚠️ No se encontró Chrome/Chromium. Intentando con el que traiga Puppeteer...');
}

// ── Cliente WhatsApp (con reintentos) ─────────────────────────
let client = null;
let retryCount = 0;
const MAX_RETRIES = 5;

function createClient() {
    return new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
        puppeteer: puppeteerOptions
    });
}

function startClient() {
    statusMsg = `Iniciando... (intento ${retryCount + 1}/${MAX_RETRIES + 1})`;
    client = createClient();

    client.on('qr', (qr) => {
        currentQR = qr;
        retryCount = 0;
        statusMsg = 'PENDIENTE: escanea el QR en /qr';
        console.log('\n===================================================');
        console.log('📱 ESCANEA EL QR EN:  http://localhost:' + PORT + '/qr');
        console.log('===================================================\n');
        try {
            const QRCodeTerminal = require('qrcode-terminal');
            QRCodeTerminal.generate(qr, { small: true });
        } catch (e) { /* terminal QR opcional */ }
    });

    client.on('authenticated', () => {
        currentQR = null;
        retryCount = 0;
        statusMsg = 'Autenticado';
        console.log('✅ Autenticación exitosa.');
    });

    client.on('ready', () => {
        currentQR = null;
        isClientReady = true;
        retryCount = 0;
        statusMsg = 'LISTO - WhatsApp conectado';
        console.log('🎉 WhatsApp LISTO para enviar mensajes!');
    });

    client.on('disconnected', (reason) => {
        isClientReady = false;
        currentQR = null;
        statusMsg = 'Desconectado: ' + reason;
        console.log('⚠️ Cliente desconectado:', reason);
        // Auto-reconectar después de desconexion
        console.log('↻ Intentando reconectar en 5s...');
        setTimeout(() => {
            retryCount = 0;
            startClient();
        }, 5000);
    });

    client.on('auth_failure', (msg) => {
        statusMsg = 'Fallo de autenticación: ' + (msg || '');
        console.error('❌ Fallo de autenticación:', msg);
        // Limpiar sesión corrupta y reintentar
        console.log('🗑️ Limpiando sesión corrupta...');
        const authPath = path.join(__dirname, '.wwebjs_auth');
        try {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('✅ Sesión eliminada. Reiniciando para generar nuevo QR...');
        } catch (e) { console.error('Error limpiando sesión:', e.message); }
        setTimeout(() => {
            retryCount = 0;
            startClient();
        }, 3000);
    });

    client.initialize().catch(err => {
        console.error('Error iniciando cliente:', err.message);
        if (retryCount < MAX_RETRIES && !isClientReady && !currentQR) {
            retryCount++;
            console.log(`↻ Reintentando en 3s... (${retryCount}/${MAX_RETRIES})`);
            statusMsg = `Reintentando... (${retryCount}/${MAX_RETRIES})`;
            setTimeout(startClient, 3000);
        }
    });
}

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
    origin: ['https://plixora-bo.onrender.com', /localhost/, /127\.0\.0\.1/],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Autenticación por token para la API (excepto /qr, /status, /)
function requireToken(req, res, next) {
    if (!BOT_TOKEN) return next(); // Sin token configurado = acceso abierto (solo local)
    const auth = req.headers.authorization || '';
    if (auth === 'Bearer ' + BOT_TOKEN) return next();
    return res.status(401).json({ success: false, error: 'Token inválido o faltante.' });
}

// ── Rutas web ─────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.redirect('/qr');
});

app.get('/qr', async (req, res) => {
    if (isClientReady) {
        return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PLIXORA Bot</title></head>
        <body style="background:#111;color:#0f0;font-family:Arial;text-align:center;padding:50px;">
            <h1>✅ WhatsApp YA está conectado</h1>
            <p style="color:#aaa">El bot está listo para enviar mensajes.</p>
            <script>setTimeout(function(){location.reload()},5000)</script>
        </body></html>`);
    }
    if (!currentQR) {
        return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PLIXORA Bot</title></head>
        <body style="background:#111;color:#fff;font-family:Arial;text-align:center;padding:50px;">
            <h1>⏳ Esperando QR...</h1>
            <p style="color:#aaa">El cliente se está iniciando. Recarga en unos segundos.</p>
            <script>setTimeout(function(){location.reload()},3000)</script>
        </body></html>`);
    }
    try {
        const qrImage = await QRCode.toDataURL(currentQR, { width: 420, margin: 2 });
        res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PLIXORA Bot - QR</title></head>
        <body style="background:#0f0f10;color:#fff;font-family:Arial,Helvetica,sans-serif;text-align:center;padding:40px 16px;">
            <h1 style="color:#25D366">📱 PLIXORA.BO — Vincular WhatsApp</h1>
            <p style="color:#bbb;max-width:520px;margin:12px auto;">
                Abre <strong style="color:#fff">WhatsApp Business</strong> en tu celular → <strong style="color:#fff">Dispositivos vinculados</strong>
                → <strong style="color:#fff">Vincular dispositivo</strong> y escanea este código.
            </p>
            <div style="background:#fff;display:inline-block;border-radius:16px;padding:16px;margin:20px 0;">
                <img src="${qrImage}" style="display:block;max-width:100%;" alt="QR de WhatsApp"/>
            </div>
            <p style="color:#888;font-size:13px;">El código se actualiza automáticamente. Si se vence, espera a que se regenere.</p>
            <script>setTimeout(function(){location.reload()},20000)</script>
        </body></html>`);
    } catch (err) {
        res.status(500).send('Error generando QR: ' + err.message);
    }
});

app.get('/status', (req, res) => {
    const uptimeS = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptimeS / 3600);
    const m = Math.floor((uptimeS % 3600) / 60);
    res.json({
        ready: isClientReady,
        status: statusMsg,
        hasQR: !!currentQR,
        uptime: `${h}h ${m}m`,
        uptimeSeconds: uptimeS
    });
});

// ── API ───────────────────────────────────────────────────────
app.post('/api/send-message', requireToken, async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp no está conectado.' });
        }
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros (phone, message).' });
        }
        let fp = String(phone).replace(/[^0-9]/g, '');
        if (!fp.startsWith('591') && fp.length === 8) {
            fp = '591' + fp;
        }
        await client.sendMessage(fp + '@c.us', String(message));
        console.log(`✅ Mensaje enviado a ${fp}`);
        return res.status(200).json({ success: true, message: 'Mensaje enviado.' });
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
        return res.status(500).json({ success: false, error: error.toString() });
    }
});

app.post('/api/send-image', requireToken, async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp no está conectado.' });
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
        // Imagen local si es netflix-instrucciones.png
        if (String(imageUrl).includes('netflix-instrucciones.png')) {
            const localPath = path.join(__dirname, 'netflix-instrucciones.png');
            if (fs.existsSync(localPath)) {
                media = MessageMedia.fromFilePath(localPath);
                console.log('📦 Cargando netflix-instrucciones.png desde el bot');
            }
        }
        if (!media) {
            media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
        }
        await client.sendMessage(fp + '@c.us', media, { caption: caption || '' });
        console.log(`✅ Imagen enviada a ${fp}`);
        return res.status(200).json({ success: true, message: 'Imagen enviada.' });
    } catch (error) {
        console.error('❌ Error al enviar imagen:', error);
        return res.status(500).json({ success: false, error: error.toString() });
    }
});

// ── Inicio ────────────────────────────────────────────────────
startClient();

app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Servidor API en http://0.0.0.0:' + PORT);
    console.log('📱 Página QR:        http://localhost:' + PORT + '/qr');
    console.log('📊 Estado:           http://localhost:' + PORT + '/status');
    console.log('💬 Enviar mensaje:   POST /api/send-message');
    console.log('🖼️ Enviar imagen:    POST /api/send-image');
});

// ── Manejo de errores fatales (evitar que el proceso muera silenciosamente) ──
process.on('uncaughtException', (err) => {
    console.error('💥 Error no capturado:', err.message);
    // Si es un error de Puppeteer/Chrome, reiniciar el cliente
    if (err.message.includes('Protocol error') || err.message.includes('Target closed') || err.message.includes('Session closed')) {
        console.log('↻ Reiniciando cliente WA por crash de Chrome...');
        isClientReady = false;
        currentQR = null;
        statusMsg = 'Reiniciando por crash...';
        setTimeout(() => {
            retryCount = 0;
            startClient();
        }, 5000);
    }
});

process.on('unhandledRejection', (reason) => {
    console.error('💥 Promise no capturada:', reason);
});
