// =============================================================
// PLIXORA.BO — WHATSAPP BOT API (server.js) v6.0 (E2EE Signal Blindado)
// Motor 100% Baileys Puro (WebSocket Directo sin Chromium)
// - Cero Navegador / Cero Puppeteer (Apto para VM de 1 GB RAM)
// - Consumo de RAM: ~35 - 45 MB
// - Almacén de Pre-Claves en RAM: makeCacheableSignalKeyStore
// - Gestor de Reintentos Criptográficos: msgRetryCounterCache (NodeCache)
// - Almacén de Mensajes en RAM de 5 min: getMessage callback (NodeCache)
// - Eliminación definitiva del error: "Esperando mensaje. Esto puede tomar tiempo"
// - Vinculación de Confianza: Pairing Code de 8 Dígitos de Meta
// =============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const QRCode = require('qrcode');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    proto
} = require('@whiskeysockets/baileys');
const NodeCache = require('node-cache');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.WA_BOT_TOKEN || 'f58v6XkUscoxyIEGVgez7dRuJLHq4Sip';
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

// ── 1. Cachés Criptográficas Signal en Memoria ───────────────
// msgRetryCounterCache: Administra los contadores de reintentos de llaves
const msgRetryCounterCache = new NodeCache();

// messageStoreCache: Guarda mensajes por 5 minutos (stdTTL: 300s)
// Permite que getMessage devuelva la carga útil cuando el receptor envía retry-receipt
const messageStoreCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ── Estado del bot ────────────────────────────────────────────
let sock = null;
let currentQR = null;
let currentQRImage = null;
let currentPairingCode = null;
let pairingCodePhone = process.env.PAIR_PHONE || '59173651440';
let pairingCodeGeneratedAt = 0;
let isGeneratingPairCode = false;
let isClientReady = false;
let isStarting = false;
let statusMsg = 'Iniciando Baileys E2EE Blindado...';
let startTime = Date.now();

// ── Cola de Envíos Serializada (FIFO MessageQueue) ─────────────
class MessageQueue {
    constructor(delayBetweenMs = 1500) {
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
            setTimeout(() => {
                this.processing = false;
                this.processNext();
            }, this.delayBetweenMs);
        }
    }
}
const messageQueue = new MessageQueue(1500);

// ── Destrucción segura del socket previo ──────────────────────
async function safeDestroyClient() {
    if (sock) {
        try {
            console.log('🛑 Cerrando socket Baileys previo...');
            sock.ev.removeAllListeners();
            sock.end(undefined);
        } catch (e) {
            console.warn('Nota al cerrar socket:', e.message);
        }
        sock = null;
    }
}

// ── Iniciar cliente Baileys Blindado ──────────────────────────
async function startClient() {
    if (isStarting) return;
    isStarting = true;

    try {
        await safeDestroyClient();

        isClientReady = false;
        statusMsg = 'Iniciando conexión WebSocket Baileys...';
        console.log(`\n🚀 [${new Date().toLocaleTimeString()}] ${statusMsg}`);

        if (!fs.existsSync(AUTH_DIR)) {
            fs.mkdirSync(AUTH_DIR, { recursive: true });
        }

        // 1. Autenticación multi-archivo
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

        // 2. Última versión oficial de WhatsApp Web Meta
        const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1043857760], isLatest: true }));
        console.log(`📡 [WHATSAPP] Protocolo Web v${version.join('.')} (Última versión oficial: ${isLatest})`);

        // 3. Inicialización del socket con soporte criptográfico en memoria
        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false, // Desactivado para priorizar Pairing Code seguro
            auth: {
                creds: state.creds,
                // Almacén de claves en RAM envuelto para evitar latencia de disco
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            // Caché de reintentos para responder al teléfono del receptor
            msgRetryCounterCache,
            // Emulación de navegador limpio y legítimo
            browser: ['Ubuntu', 'Chrome', '120.0.0.0'],
            syncFullHistory: false, // Crítico para VPS de 1 GB RAM: no descarga historiales pesados
            generateHighQualityLinkPreview: false,
            markOnlineOnConnect: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,

            // ── CALLBACK getMessage (Crítico para solucionar "Esperando mensaje...") ──
            // Cuando el teléfono del destinatario no puede descifrar el paquete inicial,
            // envía un retry-receipt. WhatsApp llama a getMessage para volver a enviar
            // el contenido original cifrado con las nuevas claves sincronizadas.
            getMessage: async (key) => {
                if (key?.id) {
                    const cachedMsg = messageStoreCache.get(key.id);
                    if (cachedMsg) {
                        console.log(`🔄 [E2EE] Respondiendo reintento de descifrado para mensaje ID: ${key.id}`);
                        return cachedMsg;
                    }
                }
                return proto.Message.fromObject({});
            }
        });

        // Callback requerido por Baileys para eventos de mensajes entrantes/reintentos
        sock.ev.on('messages.upsert', async () => {});

        // Guardar credenciales de forma persistente
        sock.ev.on('creds.update', saveCreds);

        // ── VINCULACIÓN POR CÓDIGO (Pairing Code de 8 dígitos) ───
        if (!state.creds.registered) {
            setTimeout(async () => {
                try {
                    let phoneToPair = pairingCodePhone || process.env.PAIR_PHONE || '59173651440';

                    // Si hay terminal interactiva TTY disponible, permitir ingresar número
                    if (process.stdin.isTTY && !process.env.PAIR_PHONE) {
                        try {
                            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                            const question = (q) => new Promise((res) => rl.question(q, res));
                            const userNumber = await question('Ingresa tu número de WhatsApp con código de país (Ej: 59173651440): ');
                            if (userNumber && userNumber.trim()) {
                                phoneToPair = userNumber.trim();
                            }
                            rl.close();
                        } catch (e) {}
                    }

                    const clean = String(phoneToPair).replace(/[^0-9]/g, '');
                    console.log('\n======================================================');
                    console.log('   🔑 VINCULACIÓN SEGURA POR PAIRING CODE (ANTI-BLOQUEO)');
                    console.log('======================================================');
                    const rawCode = await sock.requestPairingCode(clean);
                    currentPairingCode = rawCode;
                    pairingCodePhone = clean;
                    pairingCodeGeneratedAt = Date.now();

                    const fmt = (rawCode && rawCode.length === 8) ? `${rawCode.slice(0, 4)}-${rawCode.slice(4)}` : rawCode;
                    statusMsg = `Código activo: ${fmt}`;
                    console.log(`  Teléfono: +${clean}`);
                    console.log(`  CÓDIGO DE 8 DÍGITOS:  ${fmt}`);
                    console.log('  👉 En tu celular: Ajustes > Dispositivos vinculados > Vincular un dispositivo > Vincular con el número de teléfono.');
                    console.log('======================================================\n');
                } catch (err) {
                    console.warn('Nota en auto-generación de código:', err.message);
                }
            }, 3000);
        }

        if (state.creds && state.creds.registered) {
            statusMsg = 'Restaurando sesión guardada...';
        }

        // Manejo de eventos de conexión
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Mantener QR disponible en background para el endpoint web /qr
            if (qr) {
                currentQR = qr;
                try {
                    currentQRImage = await QRCode.toDataURL(qr, { width: 340, margin: 2 });
                    const buf = await QRCode.toBuffer(qr, { width: 340, margin: 2 });
                    fs.writeFileSync(path.join(__dirname, 'latest_qr.png'), buf);
                } catch (e) {
                    currentQRImage = null;
                }
            }

            if (connection === 'connecting') {
                statusMsg = 'Conectando con servidores de WhatsApp (WebSocket)...';
                console.log('⏳ Conectando socket Baileys...');
            }

            if (connection === 'open') {
                isClientReady = true;
                currentQR = null;
                currentQRImage = null;
                currentPairingCode = null;

                const myJid = sock.user?.id || '';
                const myNumber = myJid.split(':')[0].split('@')[0] || 'Conectado';
                statusMsg = `LISTO - WhatsApp conectado (+${myNumber})`;

                const ramMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
                console.log(`\n🎉 ===================================================`);
                console.log(`🎉 [SISTEMA CONECTADO] WhatsApp listo y sincronizado!`);
                console.log(`📱 Teléfono: +${myNumber}`);
                console.log(`⚡ Consumo RAM: ~${ramMB} MB (Cero Chromium, Blindaje E2EE Activo)`);
                console.log(`=====================================================\n`);
            }

            if (connection === 'close') {
                isClientReady = false;
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                const reason = DisconnectReason[statusCode] || (lastDisconnect?.error?.message) || 'Desconocido';
                statusMsg = `Desconectado: ${reason} (código ${statusCode || 'N/A'})`;
                console.log(`⚠️ Conexión Baileys cerrada. Motivo: ${reason} (${statusCode})`);

                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                if (!shouldReconnect) {
                    console.log('🗑️ Sesión desvinculada desde el teléfono. Eliminando credenciales...');
                    try {
                        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                    } catch (e) {}
                }

                console.log('↻ Reconectando Baileys en 4s...');
                setTimeout(() => {
                    startClient();
                }, 4000);
            }
        });

    } catch (err) {
        console.error('❌ Error al inicializar Baileys:', err.message || err);
        statusMsg = 'Error: ' + (err.message || String(err));
        isClientReady = false;
        setTimeout(() => {
            startClient();
        }, 5000);
    } finally {
        isStarting = false;
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

// ── Rutas Web y API ───────────────────────────────────────────
app.get('/', (req, res) => {
    res.redirect('/qr');
});

// Página Reactiva /qr (con opción de código de 8 dígitos y QR)
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
            --accent-hover: #1eb956;
            --text: #ffffff;
            --muted: #8f9bb3;
        }
        * { box-sizing: border-box; }
        body { background: var(--bg-body); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 32px 28px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.6); }
        .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(37, 211, 102, 0.15); color: var(--accent); font-weight: 700; padding: 7px 16px; border-radius: 99px; font-size: 0.82rem; border: 1px solid rgba(37, 211, 102, 0.3); }
        .dot { width: 9px; height: 9px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 8px var(--accent); }
        h1 { font-size: 1.45rem; margin: 14px 0 6px; color: var(--text); }
        p { color: var(--muted); font-size: 0.88rem; line-height: 1.45; margin: 0; }
        
        .code-panel { margin: 16px 0; }
        .input-group { display: flex; gap: 8px; margin: 15px 0 12px; }
        .input-prefix { background: #0c0e14; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; color: #cbd5e1; font-weight: 600; font-size: 0.95rem; }
        .phone-input { flex: 1; background: #0c0e14; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 0.95rem; font-weight: 600; outline: none; }
        .phone-input:focus { border-color: var(--accent); }
        .btn-action { width: 100%; background: var(--accent); color: #000; border: none; border-radius: 12px; padding: 13px; font-weight: 700; font-size: 0.92rem; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-action:hover { background: var(--accent-hover); }
        .btn-action:disabled { background: #2a3441; color: #64748b; cursor: not-allowed; }

        .code-box { display: none; background: #0c0e14; border: 2px dashed rgba(37, 211, 102, 0.4); border-radius: 16px; padding: 22px; margin: 18px 0; }
        .code-display { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 2.1rem; font-weight: 800; letter-spacing: 5px; color: var(--accent); user-select: all; cursor: pointer; }
        .copy-hint { color: var(--muted); font-size: 0.8rem; margin-top: 8px; }

        .steps { background: #0e1017; border-radius: 12px; padding: 14px 16px; text-align: left; font-size: 0.82rem; color: #cbd5e1; line-height: 1.6; border: 1px solid #1f2430; margin: 16px 0 12px; }
        .steps strong { color: #fff; }
        
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
            <div class="badge"><span class="dot"></span> MOTOR BAILEYS E2EE ONLINE</div>
            <h1 style="color:var(--accent);">¡WhatsApp Conectado!</h1>
            <p style="margin-bottom:20px;">Tu bot de PLIXORA.BO está en línea con cifrado Signal blindado.</p>
            <div style="background:#0e1017; border-radius:12px; padding:16px; text-align:left; border:1px solid var(--border); margin-bottom:20px;">
                <div class="info-row"><span class="info-label">Teléfono:</span><span id="conn-phone" class="info-val" style="color:var(--accent);">+591 —</span></div>
                <div class="info-row"><span class="info-label">Motor:</span><span class="info-val">Baileys WebSocket Puro</span></div>
                <div class="info-row"><span class="info-label">Blindaje E2EE:</span><span class="info-val" style="color:#10b981;">NodeCache Activo (Anti-Espera)</span></div>
                <div class="info-row"><span class="info-label">Memoria RAM:</span><span id="conn-ram" class="info-val" style="color:#10b981;">— MB</span></div>
            </div>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button onclick="if(confirm('¿Deseas reconectar el bot?')) location.href='/api/restart-bot'" style="background:rgba(255,255,255,0.06); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); padding:10px 18px; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.85rem;">↻ Reconectar</button>
                <button onclick="if(confirm('¿Seguro que deseas desvincular WhatsApp y generar una nueva sesión?')) location.href='/api/logout'" style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:10px 18px; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.85rem;">🗑️ Desvincular y Reiniciar</button>
            </div>
        </div>

        <!-- VISTA: VINCULACIÓN POR CÓDIGO -->
        <div id="view-linking">
            <div class="badge"><span class="dot"></span> VINCULACIÓN POR PAIRING CODE</div>
            <h1>Vincular Bot de WhatsApp</h1>
            <p>Conexión segura oficial de Meta (sin carteles de espera):</p>

            <div class="code-panel">
                <div class="input-group">
                    <div class="input-prefix">+591</div>
                    <input id="input-phone" type="tel" class="phone-input" value="73651440" placeholder="Número de celular" maxlength="12" />
                </div>
                <button id="btn-get-code" class="btn-action" onclick="solicitarCodigo()">
                    <span>Obtener Código de Vinculación</span>
                </button>

                <div id="code-result-box" class="code-box">
                    <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:8px; text-transform:uppercase; letter-spacing:1px; font-weight:700;">Tu código de WhatsApp:</div>
                    <div id="pairing-code-display" class="code-display">————</div>
                    <div class="copy-hint">Toca el código para copiarlo al portapapeles</div>
                </div>

                <div class="steps">
                    1. En tu celular, abre <strong>WhatsApp Business</strong> (+591 73651440).<br>
                    2. Toca <strong>Menú (⋮)</strong> o <strong>Ajustes</strong> ➔ <strong>Dispositivos vinculados</strong>.<br>
                    3. Toca <strong>Vincular un dispositivo</strong>.<br>
                    4. En la parte inferior, toca <strong>"Vincular con el número de teléfono"</strong>.<br>
                    5. Escribe el código de 8 dígitos generado arriba.
                </div>
            </div>

            <div style="font-size:0.78rem; color:#10b981; display:flex; align-items:center; justify-content:center; gap:6px;">
                <span style="width:7px; height:7px; background:#10b981; border-radius:50%; display:inline-block;"></span>
                <span>Servidor WebSocket activo con NodeCache</span>
            </div>
        </div>
    </div>

    <script>
        let isRequestingCode = false;

        async function solicitarCodigo() {
            if (isRequestingCode) return;
            const phoneVal = document.getElementById('input-phone').value.trim();
            if (!phoneVal) {
                alert('Por favor ingresa tu número de WhatsApp.');
                return;
            }

            const btn = document.getElementById('btn-get-code');
            btn.disabled = true;
            btn.innerHTML = 'Conectando con Meta...';
            isRequestingCode = true;

            try {
                const res = await fetch('/api/pair-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: '591' + phoneVal.replace(/[^0-9]/g, '').replace(/^591/, '') })
                });
                const data = await res.json();
                if (data.success && data.code) {
                    mostrarCodigo(data.formatted || data.code);
                } else {
                    alert('Aviso: ' + (data.error || data.message || 'No se pudo generar el código. Reintenta en 5 segundos.'));
                }
            } catch (err) {
                alert('Error al conectar con el servidor: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>Obtener Código de Vinculación</span>';
                isRequestingCode = false;
            }
        }

        function mostrarCodigo(codeStr) {
            const box = document.getElementById('code-result-box');
            const disp = document.getElementById('pairing-code-display');
            disp.textContent = codeStr;
            box.style.display = 'block';

            disp.onclick = () => {
                const clean = codeStr.replace(/-/g, '');
                navigator.clipboard.writeText(clean).then(() => {
                    alert('¡Código ' + clean + ' copiado al portapapeles!');
                }).catch(() => {});
            };
        }

        async function pollStatus() {
            try {
                const res = await fetch('/status');
                if (res.ok) {
                    const data = await res.json();
                    if (data.ready) {
                        document.getElementById('view-linking').style.display = 'none';
                        document.getElementById('view-connected').style.display = 'block';
                        document.getElementById('conn-phone').textContent = '+' + (data.phone || 'Activo');
                        document.getElementById('conn-ram').textContent = (data.memoryMB || 35) + ' MB';
                        return;
                    }
                    if (data.pairingCode) {
                        const formatted = data.pairingCode.length === 8 
                            ? data.pairingCode.slice(0, 4) + '-' + data.pairingCode.slice(4)
                            : data.pairingCode;
                        mostrarCodigo(formatted);
                    }
                }
            } catch(e) {}
            setTimeout(pollStatus, 2000);
        }

        pollStatus();
    </script>
</body>
</html>`);
});

// ── Endpoint de Estado JSON ───────────────────────────────────
app.get('/status', (req, res) => {
    const uptimeS = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptimeS / 3600);
    const m = Math.floor((uptimeS % 3600) / 60);
    const memoryMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const phone = (sock && sock.user && sock.user.id)
        ? sock.user.id.split(':')[0].split('@')[0]
        : (isClientReady ? '59173651440' : null);

    res.json({
        ready: isClientReady,
        status: statusMsg,
        hasQR: !!currentQRImage,
        qr: currentQR,
        qrImage: currentQRImage,
        pairingCode: currentPairingCode,
        pairingCodePhone: pairingCodePhone,
        phone: phone,
        loadingPercent: isClientReady ? 100 : 0,
        engine: 'Baileys Pure WebSocket (E2EE Blindado con NodeCache)',
        cachedMessages: messageStoreCache.getStats().keys,
        memoryMB: memoryMB,
        uptime: `${h}h ${m}m`,
        uptimeSeconds: uptimeS
    });
});

// ── Endpoint para Código de Emparejamiento de 8 Dígitos ───────
app.all(['/api/pair-code', '/pair-code'], async (req, res) => {
    try {
        let phone = req.body?.phone || req.query?.phone || pairingCodePhone || '59173651440';
        let clean = String(phone).replace(/[^0-9]/g, '');
        if (clean.length === 8 && !clean.startsWith('591')) {
            clean = '591' + clean;
        }

        if (isClientReady) {
            return res.json({
                success: false,
                alreadyConnected: true,
                message: 'El bot ya está conectado a WhatsApp.'
            });
        }

        if (!sock) {
            return res.status(503).json({
                success: false,
                error: 'El cliente de WhatsApp aún está iniciando. Espera unos segundos e intenta nuevamente.'
            });
        }

        const force = req.query.force === 'true' || req.query.force === '1' || req.body?.force === true;
        const now = Date.now();

        if (currentPairingCode && (now - pairingCodeGeneratedAt < 120000) && !force) {
            const rawCode = currentPairingCode.replace(/[^A-Z0-9]/gi, '');
            const formatted = rawCode.length === 8 ? `${rawCode.slice(0, 4)}-${rawCode.slice(4)}` : currentPairingCode;
            const remainingSecs = Math.max(0, Math.round((120000 - (now - pairingCodeGeneratedAt)) / 1000));
            return res.json({
                success: true,
                phone: pairingCodePhone || clean,
                code: rawCode,
                formatted: formatted,
                expiresInSeconds: remainingSecs,
                message: 'Ingresa este código en WhatsApp > Dispositivos vinculados > Vincular con el número de teléfono.'
            });
        }

        if (isGeneratingPairCode) {
            for (let w = 0; w < 20; w++) {
                await new Promise(r => setTimeout(r, 500));
                if (currentPairingCode) {
                    const rawCode = currentPairingCode.replace(/[^A-Z0-9]/gi, '');
                    const formatted = rawCode.length === 8 ? `${rawCode.slice(0, 4)}-${rawCode.slice(4)}` : currentPairingCode;
                    return res.json({
                        success: true,
                        phone: pairingCodePhone || clean,
                        code: rawCode,
                        formatted: formatted,
                        message: 'Ingresa este código en WhatsApp > Dispositivos vinculados > Vincular con el número de teléfono.'
                    });
                }
            }
        }

        isGeneratingPairCode = true;
        pairingCodePhone = clean;
        statusMsg = `Generando código de 8 dígitos para +${clean}...`;
        console.log(`🔢 Solicitando pairing code a Meta para +${clean}...`);

        const rawCode = await sock.requestPairingCode(clean);
        currentPairingCode = rawCode;
        pairingCodeGeneratedAt = Date.now();

        const formatted = (rawCode && rawCode.length === 8)
            ? `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`
            : rawCode;

        statusMsg = `Código activo: ${formatted}`;
        console.log(`✅ Código de vinculación generado: ${formatted}`);

        return res.json({
            success: true,
            phone: clean,
            code: rawCode,
            formatted: formatted,
            message: 'Ingresa este código en WhatsApp > Dispositivos vinculados > Vincular con el número de teléfono.'
        });

    } catch (err) {
        console.error('❌ Error al solicitar código de emparejamiento:', err.message || err);
        return res.status(500).json({
            success: false,
            error: err.message || String(err)
        });
    } finally {
        isGeneratingPairCode = false;
    }
});

// ── Endpoint para Servir Imagen QR (Opcional) ─────────────────
app.get('/api/qr-image', async (req, res) => {
    if (!currentQRImage && !currentQR) {
        return res.status(404).send('No hay código QR pendiente.');
    }
    try {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        if (currentQRImage && currentQRImage.startsWith('data:image/')) {
            const base64Data = currentQRImage.replace(/^data:image\/\w+;base64,/, '');
            return res.send(Buffer.from(base64Data, 'base64'));
        }
        const buffer = await QRCode.toBuffer(currentQR, { width: 340, margin: 2 });
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Error generando imagen QR');
    }
});

// ── Endpoint para Reiniciar Conexión ──────────────────────────
app.all(['/api/restart-bot', '/restart'], async (req, res) => {
    console.log('🔄 Petición de reinicio manual recibida...');
    if (req.accepts('html') && !req.xhr) {
        res.send('<body style="background:#111;color:#0f0;font-family:sans-serif;text-align:center;padding:50px;"><h2>↻ Reiniciando bot Baileys...</h2><p>Redirigiendo a /qr en 2 segundos...</p><script>setTimeout(()=>location.href="/qr",2000)</script></body>');
    } else {
        res.json({ success: true, message: 'Reiniciando cliente de WhatsApp...' });
    }

    setTimeout(() => {
        startClient();
    }, 500);
});

// ── Endpoint para Cerrar Sesión y Generar Nueva ───────────────
app.all(['/api/logout', '/logout'], async (req, res) => {
    console.log('🗑️ Petición de cierre de sesión y reseteo recibida...');
    try {
        isClientReady = false;
        currentQR = null;
        currentQRImage = null;
        currentPairingCode = null;

        await safeDestroyClient();

        try {
            if (fs.existsSync(AUTH_DIR)) {
                fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                console.log(`📁 Carpeta ${AUTH_DIR} eliminada exitosamente.`);
            }
        } catch (e) {
            console.warn('Advertencia al borrar credenciales:', e.message);
        }

        setTimeout(() => {
            startClient();
        }, 1000);

        if (req.accepts('html') && !req.xhr) {
            return res.redirect('/qr');
        }
        return res.json({ success: true, message: 'Sesión eliminada. Generando nueva sesión.' });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ── API: Enviar Mensaje de Texto (Blindado con Caché E2EE) ────
app.post('/api/send-message', requireToken, async (req, res) => {
    try {
        if (!isClientReady || !sock) {
            return res.status(503).json({
                success: false,
                error: 'El bot de WhatsApp no está conectado todavía. Abre /qr para vincularlo.'
            });
        }
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Faltan parámetros obligatorios (phone, message).'
            });
        }

        const jid = formatJid(phone);

        const result = await messageQueue.enqueue(async () => {
            // 1. Simular presencia (escribiendo...) para validar actividad humana legítima
            try {
                await sock.sendPresenceUpdate('composing', jid);
                await new Promise((r) => setTimeout(r, 800));
                await sock.sendPresenceUpdate('paused', jid);
            } catch (e) {}

            // 2. Enviar el mensaje
            const sent = await sock.sendMessage(jid, { text: String(message) });

            // 3. Guardar en messageStoreCache por 5 minutos para responder a reintentos (retry-receipt)
            if (sent?.key?.id && sent?.message) {
                messageStoreCache.set(sent.key.id, sent.message);
            }

            return sent;
        });

        console.log(`💬 Mensaje entregado con éxito a ${jid} (ID: ${result?.key?.id})`);
        return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente.', result });
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error.message || error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

// ── API: Enviar Imagen con Texto (Blindado con Caché E2EE) ─────
app.post('/api/send-image', requireToken, async (req, res) => {
    try {
        if (!isClientReady || !sock) {
            return res.status(503).json({
                success: false,
                error: 'El bot de WhatsApp no está conectado todavía. Abre /qr para vincularlo.'
            });
        }
        const { phone, imageUrl, caption } = req.body;
        if (!phone || !imageUrl) {
            return res.status(400).json({
                success: false,
                error: 'Faltan parámetros (phone, imageUrl).'
            });
        }

        const jid = formatJid(phone);
        let imagePayload = null;

        // 1. Archivo local conocido
        if (String(imageUrl).includes('netflix-instrucciones.png')) {
            const localPath = path.join(__dirname, 'netflix-instrucciones.png');
            if (fs.existsSync(localPath)) {
                imagePayload = fs.readFileSync(localPath);
                console.log('📦 Cargando netflix-instrucciones.png desde disco local');
            }
        }

        // 2. Archivo por URL remota, ruta en disco o base64
        if (!imagePayload) {
            if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                try {
                    const response = await fetch(imageUrl);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        imagePayload = Buffer.from(arrayBuffer);
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } catch (fetchErr) {
                    console.warn(`Aviso: Error descargando imagen (${fetchErr.message}), pasando URL directa a Baileys.`);
                    imagePayload = { url: imageUrl };
                }
            } else if (typeof imageUrl === 'string' && fs.existsSync(imageUrl)) {
                imagePayload = fs.readFileSync(imageUrl);
            } else if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
                const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
                imagePayload = Buffer.from(base64Data, 'base64');
            } else {
                imagePayload = { url: imageUrl };
            }
        }

        const result = await messageQueue.enqueue(async () => {
            // 1. Simular presencia (escribiendo...)
            try {
                await sock.sendPresenceUpdate('composing', jid);
                await new Promise((r) => setTimeout(r, 800));
                await sock.sendPresenceUpdate('paused', jid);
            } catch (e) {}

            // 2. Enviar la imagen
            const sent = await sock.sendMessage(jid, {
                image: imagePayload,
                caption: caption ? String(caption) : ''
            });

            // 3. Guardar en messageStoreCache por 5 minutos para reintentos E2EE
            if (sent?.key?.id && sent?.message) {
                messageStoreCache.set(sent.key.id, sent.message);
            }

            return sent;
        });

        console.log(`🖼️ Imagen entregada con éxito a ${jid} (ID: ${result?.key?.id})`);
        return res.status(200).json({ success: true, message: 'Imagen enviada correctamente.', result });
    } catch (error) {
        console.error('❌ Error al enviar imagen:', error.message || error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

// ── Inicio del Servidor Express ───────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n============================================================');
    console.log(`🚀 SERVIDOR PLIXORA BOT (BAILEYS WEBSOCKET) ACTIVO EN PUERTO ${PORT}`);
    console.log(`📱 Código de Vinculación:   http://localhost:${PORT}/qr`);
    console.log(`📊 Estado en JSON:          http://localhost:${PORT}/status`);
    console.log(`⚡ Motor:                  @whiskeysockets/baileys (E2EE Signal Blindado)`);
    console.log(`💡 Memoria Objetivo:       < 50 MB RAM`);
    console.log('============================================================\n');

    startClient();
});

// ── Control de Errores y Cierre Limpio ────────────────────────
process.on('uncaughtException', (err) => {
    console.error('💥 uncaughtException:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.warn('⚠️ unhandledRejection:', reason && reason.message ? reason.message : reason);
});

process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor y cliente Baileys...');
    await safeDestroyClient();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Señal SIGTERM recibida. Cerrando...');
    await safeDestroyClient();
    process.exit(0);
});
