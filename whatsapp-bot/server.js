// =============================================================
// PLIXORA.BO — WHATSAPP BOT API (server.js) v3.2 (Baileys Engine)
// - Motor Baileys (WebSockets Multi-Device)
// - Cero Chrome / Cero Puppeteer (~40 MB de RAM)
// - Doble método de vinculación:
//     1. Código QR en vivo con auto-actualización sin recargar
//     2. Código de Emparejamiento de 8 Dígitos (Pairing Code)
// - Cola Serializada FIFO (Anti-Colisión y Anti-Spam)
// - Sesión permanente en ./auth_info_baileys
// =============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.WA_BOT_TOKEN || 'f58v6XkUscoxyIEGVgez7dRuJLHq4Sip';
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

// ── Estado del bot ────────────────────────────────────────────
let sock = null;
let currentQR = null;
let currentQRImage = null;
let isClientReady = false;
let statusMsg = 'Iniciando servicio Baileys...';
let connectedPhone = null;
let startTime = Date.now();
let isConnecting = false;
let reconnectAttempts = 0;
let lastQRTimestamp = 0;

const logger = pino({ level: 'error' });

// ── Cola de Envíos Serializada (FIFO MessageQueue) ─────────────
class MessageQueue {
    constructor(delayBetweenMs = 850) {
        this.queue = [];
        this.processing = false;
        this.delayBetweenMs = delayBetweenMs;
    }

    enqueue(taskFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ taskFn, resolve, reject });
            this.processNext();
        });
    }

    async processNext() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        const { taskFn, resolve, reject } = this.queue.shift();
        try {
            const result = await taskFn();
            resolve(result);
        } catch (err) {
            reject(err);
        } finally {
            await new Promise(r => setTimeout(r, this.delayBetweenMs));
            this.processing = false;
            this.processNext();
        }
    }
}

const messageQueue = new MessageQueue(850);

// ── Iniciar Cliente Baileys ───────────────────────────────────
async function startBaileys() {
    if (isConnecting) return;
    isConnecting = true;

    try {
        if (!fs.existsSync(AUTH_DIR)) {
            fs.mkdirSync(AUTH_DIR, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1043857760], isLatest: true }));

        console.log(`\n🚀 [${new Date().toLocaleTimeString()}] Conectando Baileys v${version.join('.')}...`);
        statusMsg = 'Conectando con servidores de WhatsApp...';

        sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            connectTimeoutMs: 30000,
            keepAliveIntervalMs: 15000,
            defaultQueryTimeoutMs: 60000
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                currentQR = qr;
                lastQRTimestamp = Date.now();
                statusMsg = 'PENDIENTE: Escanea el código QR o usa el código de 8 dígitos';
                try {
                    currentQRImage = await QRCode.toDataURL(qr, { width: 360, margin: 2 });
                } catch (e) {
                    currentQRImage = null;
                }

                console.log('\n===================================================');
                console.log('📱 CÓDIGO QR / VINCULACIÓN LISTO:');
                console.log(`   Abre en tu navegador: http://localhost:${PORT}/qr`);
                console.log('===================================================\n');

                try {
                    const qrcodeTerminal = require('qrcode-terminal');
                    qrcodeTerminal.generate(qr, { small: true });
                } catch (e) {}
            }

            if (connection === 'close') {
                isClientReady = false;
                currentQR = null;
                currentQRImage = null;
                connectedPhone = null;

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.message || 'Conexión cerrada';
                statusMsg = `Desconectado: ${reason} (Código ${statusCode || 'N/A'})`;
                console.log(`⚠️ Conexión cerrada. Motivo: ${statusMsg}`);

                const isLoggedOut = statusCode === DisconnectReason.loggedOut;

                if (isLoggedOut) {
                    console.log('🛑 Sesión cerrada en el celular. Limpiando credenciales...');
                    statusMsg = 'Sesión cerrada. Generando nuevo código de vinculación...';
                    try {
                        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                    } catch (e) {}
                    setTimeout(() => {
                        isConnecting = false;
                        startBaileys();
                    }, 1500);
                } else {
                    // Si expiró el QR (código 408) o se desconectó el socket temporalmente, reconectar de inmediato
                    const waitTime = statusCode === 408 ? 1000 : 2500;
                    console.log(`↻ Reconectando en ${waitTime / 1000}s para mantener el QR/Socket activo...`);
                    setTimeout(() => {
                        isConnecting = false;
                        startBaileys();
                    }, waitTime);
                }
            } else if (connection === 'open') {
                isClientReady = true;
                currentQR = null;
                currentQRImage = null;
                reconnectAttempts = 0;

                if (sock.user && sock.user.id) {
                    connectedPhone = sock.user.id.split(':')[0].split('@')[0];
                } else {
                    connectedPhone = 'Conectado';
                }

                statusMsg = `LISTO - WhatsApp conectado (+${connectedPhone})`;
                console.log(`\n🎉 ===================================================`);
                console.log(`🎉 WHATSAPP VINCULADO Y OPERATIVO!`);
                console.log(`📱 Teléfono: +${connectedPhone}`);
                console.log(`⚡ Consumo de RAM: ~${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
                console.log(`=====================================================\n`);
            }
        });

        isConnecting = false;

    } catch (err) {
        isConnecting = false;
        console.error('❌ Error al inicializar Baileys:', err.message || err);
        statusMsg = 'Error de inicio: ' + (err.message || String(err));
        setTimeout(startBaileys, 3000);
    }
}

// ── Middleware Express ────────────────────────────────────────
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));

function requireToken(req, res, next) {
    if (!BOT_TOKEN) return next();
    const auth = req.headers.authorization || '';
    if (auth === 'Bearer ' + BOT_TOKEN) return next();
    return res.status(401).json({ success: false, error: 'Token de seguridad inválido o faltante.' });
}

function formatJid(phone) {
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.length === 8 && !clean.startsWith('591')) {
        clean = '591' + clean;
    }
    return `${clean}@s.whatsapp.net`;
}

// ── Rutas Web ─────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.redirect('/qr');
});

// Página Reactiva en Tiempo Real /qr con Tabs (Código QR + Código de 8 Dígitos)
app.get('/qr', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vincular WhatsApp - PLIXORA.BO</title>
    <style>
        :root {
            --bg-body: #0b0c10;
            --bg-card: #151821;
            --border: #252a38;
            --accent: #25D366;
            --text: #ffffff;
            --muted: #8f9bb3;
        }
        * { box-sizing: border-box; }
        body { background: var(--bg-body); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 32px 28px; max-width: 460px; width: 100%; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.6); }
        .header { margin-bottom: 20px; }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(37, 211, 102, 0.15); color: var(--accent); font-weight: 700; padding: 7px 16px; border-radius: 99px; font-size: 0.85rem; border: 1px solid rgba(37, 211, 102, 0.3); }
        .dot { width: 9px; height: 9px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 8px var(--accent); }
        h1 { font-size: 1.45rem; margin: 12px 0 6px; color: var(--text); }
        p { color: var(--muted); font-size: 0.88rem; line-height: 1.45; margin: 0; }

        /* Tabs */
        .tabs { display: flex; gap: 8px; background: #0e1017; padding: 5px; border-radius: 12px; margin: 20px 0; border: 1px solid var(--border); }
        .tab-btn { flex: 1; padding: 9px; border-radius: 8px; border: none; background: transparent; color: var(--muted); font-weight: 600; font-size: 0.82rem; cursor: pointer; transition: all 0.2s; }
        .tab-btn.active { background: #202433; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }

        /* Tab Content */
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* QR Box */
        .qr-box { background: #fff; display: inline-block; border-radius: 18px; padding: 14px; box-shadow: 0 10px 35px rgba(0,0,0,0.5); margin-bottom: 16px; min-height: 280px; min-width: 280px; position: relative; }
        .qr-box img { display: block; width: 270px; height: 270px; border-radius: 8px; }
        .qr-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 270px; width: 270px; color: #111; gap: 12px; font-size: 0.85rem; font-weight: 600; }

        .spinner { width: 36px; height: 36px; border: 3px solid rgba(37,211,102,0.25); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.9s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Pairing Code Form */
        .pair-box { background: #0e1017; border-radius: 14px; padding: 18px; border: 1px solid var(--border); margin-bottom: 16px; text-align: left; }
        .pair-label { font-size: 0.8rem; font-weight: 600; color: var(--muted); display: block; margin-bottom: 8px; }
        .pair-input-row { display: flex; gap: 8px; }
        .pair-input { flex: 1; background: var(--bg-card); border: 1.5px solid var(--border); color: #fff; padding: 11px 14px; border-radius: 10px; font-size: 0.95rem; font-family: inherit; }
        .pair-input:focus { outline: none; border-color: var(--accent); }
        .pair-btn { background: var(--accent); color: #000; font-weight: 700; border: none; padding: 11px 18px; border-radius: 10px; cursor: pointer; font-size: 0.9rem; transition: transform 0.15s; }
        .pair-btn:hover { transform: translateY(-1px); }

        .code-display { background: #1a1d26; border: 2px dashed var(--accent); border-radius: 12px; padding: 16px; text-align: center; margin-top: 14px; display: none; }
        .code-number { font-size: 1.8rem; font-family: monospace; font-weight: 800; letter-spacing: 4px; color: var(--accent); margin: 6px 0; }

        /* Steps */
        .steps { background: #0e1017; border-radius: 12px; padding: 14px 16px; text-align: left; font-size: 0.83rem; color: #cbd5e1; line-height: 1.6; border: 1px solid #1f2430; margin-bottom: 14px; }
        .steps strong { color: #fff; }

        /* Connected View */
        .connected-card { display: none; }
        .info-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #1a1d26; font-size: 0.88rem; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: var(--muted); }
        .info-val { font-weight: 600; color: #fff; }
    </style>
</head>
<body>
    <div class="card">
        <!-- VISTA: YA CONECTADO -->
        <div id="view-connected" class="connected-card">
            <div class="badge"><span class="dot"></span> BOT WHATSAPP ONLINE</div>
            <h1 style="color:var(--accent);">¡WhatsApp Conectado!</h1>
            <p style="margin-bottom:20px;">Tu bot de PLIXORA.BO está vinculado y listo para enviar credenciales automáticamente.</p>
            <div style="background:#0e1017; border-radius:12px; padding:16px; text-align:left; border:1px solid var(--border); margin-bottom:20px;">
                <div class="info-row"><span class="info-label">Teléfono:</span><span id="conn-phone" class="info-val" style="color:var(--accent);">+591 —</span></div>
                <div class="info-row"><span class="info-label">Motor:</span><span class="info-val">Baileys v3 (WebSockets)</span></div>
                <div class="info-row"><span class="info-label">Memoria RAM:</span><span id="conn-ram" class="info-val">— MB</span></div>
                <div class="info-row"><span class="info-label">Cola Anti-colisión:</span><span class="info-val" style="color:var(--accent);">Activa (900ms)</span></div>
            </div>
            <p style="font-size:0.8rem; color:#64748b; margin-bottom:16px;">Puedes cerrar esta pestaña en cualquier momento.</p>
            <button onclick="if(confirm('¿Deseas reiniciar la conexión?')) location.href='/api/restart-bot'" style="background:rgba(255,255,255,0.06); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); padding:10px 18px; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.85rem;">↻ Reconectar</button>
        </div>

        <!-- VISTA: VINCULAR (QR o CÓDIGO) -->
        <div id="view-linking">
            <div class="header">
                <div class="badge"><span class="dot"></span> VINCULACIÓN INSTANTÁNEA</div>
                <h1>Vincular WhatsApp</h1>
                <p>Elige tu método favorito para conectar tu WhatsApp Business:</p>
            </div>

            <!-- Selector de Método -->
            <div class="tabs">
                <button class="tab-btn active" onclick="switchTab('qr')">📷 Escanear QR</button>
                <button class="tab-btn" onclick="switchTab('code')">🔢 Código de 8 Dígitos</button>
            </div>

            <!-- TAB 1: CÓDIGO QR EN VIVO -->
            <div id="tab-qr" class="tab-content active">
                <div class="qr-box">
                    <div id="qr-loading" class="qr-loading">
                        <div class="spinner"></div>
                        <span>Generando código QR...</span>
                    </div>
                    <img id="qr-img" style="display:none;" alt="QR Code"/>
                </div>

                <div class="steps">
                    1. Abre <strong>WhatsApp Business</strong> en tu celular.<br>
                    2. Toca <strong>Menú (⋮)</strong> o <strong>Ajustes</strong> ➔ <strong>Dispositivos vinculados</strong>.<br>
                    3. Toca <strong>Vincular un dispositivo</strong> y apunta tu cámara aquí.
                </div>

                <div style="font-size:0.78rem; color:#10b981; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <span style="width:7px; height:7px; background:#10b981; border-radius:50%; display:inline-block;"></span>
                    <span id="qr-live-status">Actualización en vivo activa</span>
                </div>
            </div>

            <!-- TAB 2: CÓDIGO DE 8 DÍGITOS (PAIRING CODE) -->
            <div id="tab-code" class="tab-content">
                <div class="pair-box">
                    <label class="pair-label">Número de WhatsApp (con o sin +591):</label>
                    <div class="pair-input-row">
                        <input type="text" id="pair-phone" class="pair-input" placeholder="Ej: 73651440" value="73651440"/>
                        <button class="pair-btn" onclick="requestPairCode()">Obtener Código</button>
                    </div>

                    <div id="code-box" class="code-display">
                        <span style="font-size:0.75rem; color:var(--muted); text-transform:uppercase; font-weight:700;">Tu código de vinculación:</span>
                        <div id="code-val" class="code-number">---- - ----</div>
                        <span style="font-size:0.75rem; color:#10b981;">Toca la notificación en tu celular o ingresa este código en WhatsApp</span>
                    </div>
                </div>

                <div class="steps">
                    1. Abre <strong>WhatsApp Business</strong> en tu celular.<br>
                    2. Toca <strong>Menú (⋮)</strong> ➔ <strong>Dispositivos vinculados</strong> ➔ <strong>Vincular un dispositivo</strong>.<br>
                    3. En la parte inferior, toca <strong>"Vincular con el número de teléfono"</strong>.<br>
                    4. Escribe el código de 8 caracteres mostrado arriba.
                </div>
            </div>
        </div>
    </div>

    <script>
        function switchTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            if (tab === 'qr') {
                document.querySelectorAll('.tab-btn')[0].classList.add('active');
                document.getElementById('tab-qr').classList.add('active');
            } else {
                document.querySelectorAll('.tab-btn')[1].classList.add('active');
                document.getElementById('tab-code').classList.add('active');
            }
        }

        let isPolling = true;

        async function pollStatus() {
            if (!isPolling) return;
            try {
                const res = await fetch('/status');
                if (res.ok) {
                    const data = await res.json();
                    
                    if (data.ready) {
                        document.getElementById('view-linking').style.display = 'none';
                        document.getElementById('view-connected').style.display = 'block';
                        document.getElementById('conn-phone').textContent = '+' + (data.phone || 'Activo');
                        document.getElementById('conn-ram').textContent = (data.memoryMB || 45) + ' MB';
                        return;
                    }

                    if (data.hasQR && data.qrImage) {
                        const qrImg = document.getElementById('qr-img');
                        const qrLoading = document.getElementById('qr-loading');
                        qrImg.src = data.qrImage;
                        qrImg.style.display = 'block';
                        qrLoading.style.display = 'none';
                    }
                }
            } catch(e) {}
            setTimeout(pollStatus, 1800);
        }

        async function requestPairCode() {
            const phone = document.getElementById('pair-phone').value.trim();
            if (!phone) {
                alert('Por favor ingresa tu número de teléfono.');
                return;
            }

            const codeBox = document.getElementById('code-box');
            const codeVal = document.getElementById('code-val');
            codeBox.style.display = 'block';
            codeVal.textContent = 'Generando...';

            try {
                const res = await fetch('/api/pair-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });
                const data = await res.json();
                if (data.success && data.code) {
                    const raw = String(data.code).replace(/[^A-Za-z0-9]/g, '');
                    const formatted = raw.length === 8 ? (raw.slice(0,4) + ' - ' + raw.slice(4)) : data.code;
                    codeVal.textContent = formatted;
                } else {
                    codeVal.textContent = 'Error';
                    alert(data.error || 'No se pudo generar el código. Asegúrate de que el bot esté activo.');
                }
            } catch(err) {
                codeVal.textContent = 'Error';
                alert('Error al contactar con el bot: ' + err.message);
            }
        }

        pollStatus();
    </script>
</body>
</html>`);
});

// Endpoint de vinculación por Código de 8 Dígitos (Pairing Code)
app.post('/api/pair-code', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Por favor ingresa tu número de WhatsApp.' });
        }
        let clean = String(phone).replace(/[^0-9]/g, '');
        if (clean.length === 8 && !clean.startsWith('591')) {
            clean = '591' + clean;
        }

        if (!sock || isClientReady) {
            return res.status(400).json({ success: false, error: 'El bot ya está conectado o el socket no está disponible.' });
        }

        const code = await sock.requestPairingCode(clean);
        console.log(`🔑 Código de vinculación generado para +${clean}: ${code}`);
        return res.json({ success: true, code: code });
    } catch (err) {
        console.error('Error al generar pairing code:', err);
        return res.status(500).json({ success: false, error: err.message || 'Error al generar código.' });
    }
});

// Endpoint de estado JSON para el frontend
app.get('/status', (req, res) => {
    const uptimeS = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptimeS / 3600);
    const m = Math.floor((uptimeS % 3600) / 60);
    const memoryMB = Math.round(process.memoryUsage().rss / 1024 / 1024);

    res.json({
        ready: isClientReady,
        status: statusMsg,
        hasQR: !!currentQR,
        qr: currentQR,
        qrImage: currentQRImage,
        phone: connectedPhone,
        loadingPercent: isClientReady ? 100 : (currentQR ? 50 : 10),
        engine: 'Baileys v3 (WebSockets)',
        memoryMB: memoryMB,
        uptime: `${h}h ${m}m`,
        uptimeSeconds: uptimeS
    });
});

app.get('/api/qr-image', async (req, res) => {
    if (!currentQR) {
        return res.status(404).send('No hay código QR pendiente.');
    }
    try {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const buffer = await QRCode.toBuffer(currentQR, { width: 360, margin: 2 });
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Error generando imagen QR');
    }
});

app.get('/api/restart-bot', async (req, res) => {
    console.log('🔄 Reiniciando socket de Baileys...');
    isClientReady = false;
    reconnectAttempts = 0;

    if (sock) {
        try { sock.end(undefined); } catch (e) {}
    }

    if (req.headers.accept && req.headers.accept.includes('text/html')) {
        res.send('<body style="background:#111;color:#0f0;font-family:sans-serif;text-align:center;padding:50px;"><h2>↻ Reiniciando socket de WhatsApp...</h2><p>Redirigiendo a /qr en 2 segundos...</p><script>setTimeout(()=>location.href="/qr",2000)</script></body>');
    } else {
        res.json({ success: true, message: 'Reiniciando cliente de WhatsApp...' });
    }

    setTimeout(() => {
        isConnecting = false;
        startBaileys();
    }, 1000);
});

// ── API: Enviar Mensaje de Texto (Con Cola Serializada) ───────
app.post('/api/send-message', requireToken, async (req, res) => {
    try {
        if (!isClientReady || !sock) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp no está conectado todavía. Abre http://localhost:3000/qr para vincularlo.' });
        }
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros obligatorios (phone, message).' });
        }

        const jid = formatJid(phone);

        await messageQueue.enqueue(async () => {
            await sock.sendMessage(jid, { text: String(message) });
        });

        console.log(`💬 Mensaje enviado con éxito a ${jid}`);
        return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente.' });
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error.message || error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

// ── API: Enviar Imagen con Texto (Con Cola Serializada) ────────
app.post('/api/send-image', requireToken, async (req, res) => {
    try {
        if (!isClientReady || !sock) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp no está conectado todavía. Abre http://localhost:3000/qr para vincularlo.' });
        }
        const { phone, imageUrl, caption } = req.body;
        if (!phone || !imageUrl) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros (phone, imageUrl).' });
        }

        const jid = formatJid(phone);

        let imageBuffer = null;
        if (String(imageUrl).includes('netflix-instrucciones.png')) {
            const localPath = path.join(__dirname, 'netflix-instrucciones.png');
            if (fs.existsSync(localPath)) {
                imageBuffer = fs.readFileSync(localPath);
                console.log('📦 Cargando netflix-instrucciones.png desde disco local');
            }
        }

        if (!imageBuffer) {
            const fetchResp = await fetch(imageUrl);
            if (!fetchResp.ok) {
                throw new Error(`No se pudo descargar la imagen (HTTP ${fetchResp.status})`);
            }
            const arrayBuf = await fetchResp.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuf);
        }

        await messageQueue.enqueue(async () => {
            await sock.sendMessage(jid, {
                image: imageBuffer,
                caption: caption || ''
            });
        });

        console.log(`🖼️ Imagen enviada con éxito a ${jid}`);
        return res.status(200).json({ success: true, message: 'Imagen enviada correctamente.' });
    } catch (error) {
        console.error('❌ Error al enviar imagen:', error.message || error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

// ── Inicio del Servidor Express ───────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n============================================================');
    console.log(`🚀 SERVIDOR PLIXORA BOT (BAILEYS v3.2) ACTIVO EN PUERTO ${PORT}`);
    console.log(`📱 Código QR / Vinculación: http://localhost:${PORT}/qr`);
    console.log(`📊 Estado en JSON:          http://localhost:${PORT}/status`);
    console.log(`⚡ Motor:                  Baileys (WebSockets - Cero Chrome)`);
    console.log('============================================================\n');

    startBaileys();
});

process.on('uncaughtException', (err) => {
    console.error('💥 uncaughtException:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.warn('⚠️ unhandledRejection:', reason && reason.message ? reason.message : reason);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor Baileys...');
    if (sock) {
        try { sock.end(undefined); } catch (e) {}
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Señal SIGTERM recibida. Cerrando...');
    if (sock) {
        try { sock.end(undefined); } catch (e) {}
    }
    process.exit(0);
});
