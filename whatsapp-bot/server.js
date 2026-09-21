// =============================================================
// PLIXORA.BO — WHATSAPP BOT API (server.js) v4.0 (Chromium Oficial)
// Motor 100% Oficial con WhatsApp Web (Chromium Headless)
// - Cero errores de "Esperando mensaje" (E2EE 100% nativo de Meta)
// - Sesión 100% persistente con LocalAuth (.wwebjs_auth)
// - Cola serializada Anti-Colisión (FIFO)
// - Optimizado para 350-450 MB de RAM con 3.5 GB SWAP
// - Soporta Reconexión, Desvinculación y Nuevo QR al instante
// =============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const { globSync } = require('glob');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.WA_BOT_TOKEN || 'f58v6XkUscoxyIEGVgez7dRuJLHq4Sip';
const AUTH_DIR = path.join(__dirname, '.wwebjs_auth');

// ── Estado del bot ────────────────────────────────────────────
let currentQR = null;
let currentQRImage = null;
let currentPairingCode = null;
let pairingCodePhone = null;
let isClientReady = false;
let statusMsg = 'Iniciando WhatsApp Web Oficial...';
let loadingPercent = 0;
let startTime = Date.now();
let client = null;
let isRestarting = false;
let retryCount = 0;
const MAX_RETRIES = 10;
const REAL_CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

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
            setTimeout(() => {
                this.processing = false;
                this.processNext();
            }, this.delayBetweenMs);
        }
    }
}
const messageQueue = new MessageQueue(850);

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
            const matches = globSync(p);
            if (matches && matches.length > 0 && fs.existsSync(matches[0])) {
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

// ── Limpieza de locks huérfanos y procesos zombies de Chromium ──
function cleanStaleChromiumLocks() {
    try {
        if (process.platform === 'win32') {
            const { spawnSync } = require('child_process');
            const psScript = "Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'chrome.exe' -or $_.Name -eq 'msedge.exe') -and ($_.CommandLine -like '*wwebjs_auth*' -or $_.CommandLine -like '*whatsapp-bot*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }";
            spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], { timeout: 8000 });
        } else {
            const { execSync } = require('child_process');
            execSync('pkill -9 -f "wwebjs_auth" || true', { stdio: 'ignore' });
        }
    } catch (e) {}

    const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session');
    if (!fs.existsSync(sessionDir)) return;

    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile', 'DevToolsActivePort'];
    for (const file of lockFiles) {
        const fp = path.join(sessionDir, file);
        if (fs.existsSync(fp)) {
            try {
                fs.unlinkSync(fp);
                console.log(`🧹 Lock huérfano eliminado: ${file}`);
            } catch (e) {}
        }
    }

    const defaultLocks = [
        path.join(sessionDir, 'Default', 'lockfile'),
        path.join(sessionDir, 'Default', 'LOCK')
    ];
    for (const fp of defaultLocks) {
        if (fs.existsSync(fp)) {
            try { fs.unlinkSync(fp); } catch (e) {}
        }
    }
}

// ── Destrucción segura del cliente anterior ───────────────────
async function safeDestroyClient() {
    if (client) {
        try {
            console.log('🛑 Cerrando cliente previo con seguridad...');
            client.removeAllListeners();
            await Promise.race([
                client.destroy(),
                new Promise(r => setTimeout(r, 2500))
            ]);
            console.log('✅ Cliente previo cerrado.');
        } catch (e) {
            console.warn('⚠️ Nota al cerrar cliente previo:', e.message);
        }
    }
    client = null;
    cleanStaleChromiumLocks();
}

// ── Crear y configurar cliente ────────────────────────────────
function createClient() {
    cleanStaleChromiumLocks();

    const puppeteerConfig = {
        headless: true,
        protocolTimeout: 180000,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--renderer-process-limit=1',
            '--disable-extensions',
            '--disable-component-update',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-blink-features=AutomationControlled',
            `--user-agent=${REAL_CHROME_UA}`,
            '--js-flags=--max-old-space-size=384'
        ]
    };

    if (executablePath) {
        puppeteerConfig.executablePath = executablePath;
    }

    return new Client({
        authStrategy: new LocalAuth({
            dataPath: AUTH_DIR
        }),
        puppeteer: puppeteerConfig,
        userAgent: REAL_CHROME_UA,
        takeoverOnConflict: true,
        takeoverTimeoutMs: 1000,
        qrMaxRetries: 0,
        webVersionCache: {
            type: 'none'
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

        client.on('qr', async (qr) => {
            currentQR = qr;
            retryCount = 0;
            statusMsg = 'PENDIENTE: Escanea el código QR o vincula con código de 8 dígitos';
            try {
                currentQRImage = await QRCode.toDataURL(qr, { width: 340, margin: 2 });
            } catch (e) {
                currentQRImage = null;
            }
            console.log('\n===================================================');
            console.log('📱 VINCULACIÓN DISPONIBLE (QR o CÓDIGO 8 DÍGITOS):');
            console.log(`   Abre en tu navegador: http://localhost:${PORT}/qr`);
            console.log('===================================================\n');
            try {
                const QRCodeTerminal = require('qrcode-terminal');
                QRCodeTerminal.generate(qr, { small: true });
            } catch (e) {}
        });

        client.on('code', (code) => {
            currentPairingCode = code;
            statusMsg = `Código de vinculación activo: ${code}`;
            console.log('\n===================================================');
            console.log(`🔢 [WHATSAPP-WEB.JS] CÓDIGO DE VINCULACIÓN RECIBIDO: ${code}`);
            console.log('===================================================\n');
        });

        client.on('loading_screen', (percent, message) => {
            loadingPercent = percent;
            currentQR = null;
            currentQRImage = null;
            currentPairingCode = null;
            statusMsg = `Sincronizando chats (${percent}%)...`;
            console.log(`⏳ Cargando WhatsApp: ${percent}% - ${message || 'Sincronizando'}`);
        });

        client.on('authenticated', () => {
            currentQR = null;
            currentQRImage = null;
            currentPairingCode = null;
            retryCount = 0;
            statusMsg = 'Autenticado correctamente. Sincronizando sesión...';
            console.log('✅ Autenticación exitosa. Cargando WhatsApp Web...');
        });

        client.on('ready', () => {
            currentQR = null;
            currentQRImage = null;
            currentPairingCode = null;
            isClientReady = true;
            loadingPercent = 100;
            retryCount = 0;
            const myNumber = client.info && client.info.wid ? client.info.wid.user : 'Conectado';
            statusMsg = `LISTO - WhatsApp conectado (+${myNumber})`;
            console.log(`\n🎉 ===================================================`);
            console.log(`🎉 WHATSAPP OFICIAL CONECTADO Y OPERATIVO!`);
            console.log(`📱 Teléfono: +${myNumber}`);
            console.log(`⚡ Consumo RAM: ~${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);
            console.log(`=====================================================\n`);
        });

        client.on('disconnected', async (reason) => {
            isClientReady = false;
            currentQR = null;
            currentQRImage = null;
            currentPairingCode = null;
            loadingPercent = 0;
            statusMsg = 'Desconectado: ' + reason;
            console.log('⚠️ Cliente desconectado. Motivo:', reason);

            console.log('↻ Reconectando en 5s manteniendo la sesión guardada...');
            setTimeout(() => {
                isRestarting = false;
                startClient();
            }, 5000);
        });

        client.on('auth_failure', (msg) => {
            isClientReady = false;
            statusMsg = 'Aviso de autenticación: ' + (msg || '');
            console.warn('⚠️ auth_failure recibido:', msg);
            console.log('↻ Reintentando conexión con sesión guardada en 5s...');
            setTimeout(() => {
                isRestarting = false;
                startClient();
            }, 5000);
        });

        await client.initialize();
        isRestarting = false;

    } catch (err) {
        console.error('❌ Error al inicializar cliente:', err.message || err);
        statusMsg = 'Error: ' + (err.message || String(err));
        isClientReady = false;
        isRestarting = false;

        retryCount++;
        if (retryCount <= MAX_RETRIES) {
            console.log(`↻ Reintentando inicio en 5s... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(() => {
                startClient();
            }, 5000);
        } else {
            console.error('💥 Máximo de reintentos alcanzado. Se requiere reinicio manual.');
            statusMsg = 'Error permanente al iniciar Chromium. Usa /api/restart-bot';
        }
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

function formatChatId(phone) {
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.length === 8 && !clean.startsWith('591')) {
        clean = '591' + clean;
    }
    return `${clean}@c.us`;
}

// ── Rutas Web ─────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.redirect('/qr');
});

// // Página Reactiva en Tiempo Real /qr (Soporta Código de 8 Dígitos y QR)
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
        .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(37, 211, 102, 0.15); color: var(--accent); font-weight: 700; padding: 7px 16px; border-radius: 99px; font-size: 0.85rem; border: 1px solid rgba(37, 211, 102, 0.3); }
        .dot { width: 9px; height: 9px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 8px var(--accent); }
        h1 { font-size: 1.45rem; margin: 14px 0 6px; color: var(--text); }
        p { color: var(--muted); font-size: 0.88rem; line-height: 1.45; margin: 0; }
        
        /* Pestañas */
        .tabs { display: flex; gap: 8px; background: #0c0e14; padding: 5px; border-radius: 14px; margin: 20px 0 16px; border: 1px solid var(--border); }
        .tab-btn { flex: 1; padding: 10px 14px; border: none; background: transparent; color: var(--muted); font-weight: 600; font-size: 0.85rem; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
        .tab-btn.active { background: #1e2433; color: #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.3); }

        /* Contenedor Código de 8 Dígitos */
        .code-panel { margin: 12px 0; }
        .input-group { display: flex; gap: 8px; margin: 15px 0 12px; }
        .input-prefix { background: #0c0e14; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; color: #cbd5e1; font-weight: 600; font-size: 0.95rem; }
        .phone-input { flex: 1; background: #0c0e14; border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; color: #fff; font-size: 0.95rem; font-weight: 600; outline: none; }
        .phone-input:focus { border-color: var(--accent); }
        .btn-action { width: 100%; background: var(--accent); color: #000; border: none; border-radius: 12px; padding: 13px; font-weight: 700; font-size: 0.92rem; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-action:hover { background: var(--accent-hover); }
        .btn-action:disabled { background: #2a3441; color: #64748b; cursor: not-allowed; }

        .code-box { display: none; background: #0c0e14; border: 2px dashed rgba(37, 211, 102, 0.4); border-radius: 16px; padding: 22px; margin: 18px 0; }
        .code-display { font-family: 'SF Mono', Monaco, Consolas, monospace; font-size: 2.1rem; font-weight: 800; letter-spacing: 5px; color: var(--accent); user-select: all; }
        .copy-hint { color: var(--muted); font-size: 0.8rem; margin-top: 8px; }

        /* Contenedor QR */
        .qr-box { background: #fff; display: inline-block; border-radius: 18px; padding: 14px; box-shadow: 0 10px 35px rgba(0,0,0,0.5); margin: 16px 0; min-height: 270px; min-width: 270px; position: relative; }
        .qr-box img { display: block; width: 250px; height: 250px; border-radius: 8px; }
        .qr-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 250px; width: 250px; color: #111; gap: 12px; font-size: 0.85rem; font-weight: 600; }
        .spinner { width: 34px; height: 34px; border: 3px solid rgba(37,211,102,0.25); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.9s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }

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
            <div class="badge"><span class="dot"></span> MOTOR OFICIAL ONLINE</div>
            <h1 style="color:var(--accent);">¡WhatsApp Conectado!</h1>
            <p style="margin-bottom:20px;">Tu bot de PLIXORA.BO está en línea y operando con Chromium Oficial.</p>
            <div style="background:#0e1017; border-radius:12px; padding:16px; text-align:left; border:1px solid var(--border); margin-bottom:20px;">
                <div class="info-row"><span class="info-label">Teléfono:</span><span id="conn-phone" class="info-val" style="color:var(--accent);">+591 —</span></div>
                <div class="info-row"><span class="info-label">Motor:</span><span class="info-val">Chromium (WhatsApp Web Oficial)</span></div>
                <div class="info-row"><span class="info-label">Memoria RAM:</span><span id="conn-ram" class="info-val">— MB</span></div>
                <div class="info-row"><span class="info-label">Cifrado E2EE:</span><span class="info-val" style="color:var(--accent);">100% Nativo de Meta</span></div>
            </div>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button onclick="if(confirm('¿Deseas reconectar el bot?')) location.href='/api/restart-bot'" style="background:rgba(255,255,255,0.06); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); padding:10px 18px; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.85rem;">↻ Reconectar</button>
                <button onclick="if(confirm('¿Seguro que deseas desvincular WhatsApp y generar una nueva sesión?')) location.href='/api/logout'" style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:10px 18px; border-radius:10px; cursor:pointer; font-weight:600; font-size:0.85rem;">🗑️ Desvincular y Reiniciar</button>
            </div>
        </div>

        <!-- VISTA: VINCULACIÓN -->
        <div id="view-linking">
            <div class="badge"><span class="dot"></span> VINCULACIÓN WHATSAPP</div>
            <h1>Vincular Bot de WhatsApp</h1>
            <p>Elige tu método preferido para enlazar tu cuenta oficial:</p>

            <!-- Pestañas -->
            <div class="tabs">
                <button id="tab-btn-code" class="tab-btn active" onclick="switchTab('code')">🔢 Código de 8 Dígitos</button>
                <button id="tab-btn-qr" class="tab-btn" onclick="switchTab('qr')">📷 Código QR</button>
            </div>

            <!-- PANEL 1: CÓDIGO DE 8 DÍGITOS -->
            <div id="panel-code" class="code-panel">
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

            <!-- PANEL 2: CÓDIGO QR -->
            <div id="panel-qr" style="display:none;">
                <div class="qr-box">
                    <div id="qr-loading" class="qr-loading">
                        <div class="spinner"></div>
                        <span id="qr-loading-txt">Iniciando Chromium oficial...</span>
                    </div>
                    <img id="qr-img" style="display:none;" alt="QR Code"/>
                </div>

                <div class="steps">
                    1. Abre <strong>WhatsApp Business</strong> en tu celular.<br>
                    2. Toca <strong>Dispositivos vinculados</strong> ➔ <strong>Vincular un dispositivo</strong>.<br>
                    3. Apunta tu cámara a este código QR.
                </div>
            </div>

            <div style="font-size:0.78rem; color:#10b981; display:flex; align-items:center; justify-content:center; gap:6px;">
                <span style="width:7px; height:7px; background:#10b981; border-radius:50%; display:inline-block;"></span>
                <span id="qr-live-status">Servidor en vivo y sincronizado</span>
            </div>
        </div>
    </div>

    <script>
        let currentTab = 'code';
        let isRequestingCode = false;

        function switchTab(tab) {
            currentTab = tab;
            document.getElementById('tab-btn-code').classList.toggle('active', tab === 'code');
            document.getElementById('tab-btn-qr').classList.toggle('active', tab === 'qr');
            document.getElementById('panel-code').style.display = (tab === 'code') ? 'block' : 'none';
            document.getElementById('panel-qr').style.display = (tab === 'qr') ? 'block' : 'none';
        }

        async function solicitarCodigo() {
            if (isRequestingCode) return;
            const phoneVal = document.getElementById('input-phone').value.trim();
            if (!phoneVal) {
                alert('Por favor ingresa tu número de WhatsApp.');
                return;
            }

            const btn = document.getElementById('btn-get-code');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;margin:0;"></span> Generando código en WhatsApp Web...';
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
                    alert('Aviso: ' + (data.error || data.message || 'No se pudo generar el código. Intenta con QR o reintenta en 5 segundos.'));
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
                    alert('Código ' + clean + ' copiado al portapapeles!');
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
                        document.getElementById('conn-ram').textContent = (data.memoryMB || 350) + ' MB';
                        return;
                    }

                    // Si hay un código de vinculación activo en el servidor, mostrarlo
                    if (data.pairingCode) {
                        const formatted = data.pairingCode.length === 8 
                            ? data.pairingCode.slice(0, 4) + '-' + data.pairingCode.slice(4)
                            : data.pairingCode;
                        mostrarCodigo(formatted);
                    }

                    // Actualizar QR
                    if (data.hasQR && data.qrImage) {
                        const qrImg = document.getElementById('qr-img');
                        const qrLoading = document.getElementById('qr-loading');
                        qrImg.src = data.qrImage;
                        qrImg.style.display = 'block';
                        qrLoading.style.display = 'none';
                    } else if (data.status) {
                        const loadingTxt = document.getElementById('qr-loading-txt');
                        if (loadingTxt) loadingTxt.textContent = data.status;
                    }
                }
            } catch(e) {}
            setTimeout(pollStatus, 1800);
        }

        pollStatus();
    </script>
</body>
</html>`);
});

// Endpoint de estado JSON para el frontend
app.get('/status', (req, res) => {
    const uptimeS = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(uptimeS / 3600);
    const m = Math.floor((uptimeS % 3600) / 60);
    const memoryMB = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const phone = client && client.info && client.info.wid ? client.info.wid.user : null;

    res.json({
        ready: isClientReady,
        status: statusMsg,
        hasQR: !!currentQR,
        qr: currentQR,
        qrImage: currentQRImage,
        pairingCode: currentPairingCode,
        pairingCodePhone: pairingCodePhone,
        phone: phone,
        loadingPercent: isClientReady ? 100 : loadingPercent,
        engine: 'Chromium (WhatsApp Web Oficial)',
        memoryMB: memoryMB,
        uptime: `${h}h ${m}m`,
        uptimeSeconds: uptimeS
    });
});

// Endpoint para solicitar código de emparejamiento de 8 dígitos (Flujo Oficial DOM)
app.all(['/api/pair-code', '/pair-code'], async (req, res) => {
    try {
        let phone = req.body?.phone || req.query?.phone || '59173651440';
        let clean = String(phone).replace(/[^0-9]/g, '');
        if (clean.startsWith('591') && clean.length > 8) {
            clean = clean.slice(3);
        }

        if (isClientReady) {
            return res.json({
                success: false,
                alreadyConnected: true,
                message: 'El bot ya está conectado a WhatsApp.'
            });
        }

        if (!client || !client.pupPage) {
            return res.status(503).json({
                success: false,
                error: 'El navegador WhatsApp aún está iniciando. Espera unos segundos e intenta nuevamente.'
            });
        }

        console.log(`🔢 Solicitando código de emparejamiento para celular ${clean}...`);
        statusMsg = `Generando código de 8 dígitos para +591 ${clean}...`;
        pairingCodePhone = '591' + clean;

        const result = await client.pupPage.evaluate(async (cleanPhone) => {
            const findCodeOnPage = () => {
                const el = Array.from(document.querySelectorAll('div[role="button"], span, div'))
                    .map(x => (x.innerText || x.textContent || '').trim())
                    .find(t => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(t) || /^[A-Z0-9]{8}$/.test(t));
                return el || null;
            };

            let codeNow = findCodeOnPage();
            if (codeNow) return { success: true, code: codeNow };

            let input = document.querySelector('input[aria-label*="número de teléfono"], input[type="text"]');
            if (!input) {
                const buttons = Array.from(document.querySelectorAll('span, button, div[role="button"]'));
                const linkBtn = buttons.find(b => {
                    const txt = (b.innerText || b.textContent || '').toLowerCase();
                    return txt.includes('vincular con el número') || txt.includes('link with phone');
                });
                if (linkBtn) linkBtn.click();
                await new Promise(r => setTimeout(r, 1200));
                input = document.querySelector('input[aria-label*="número de teléfono"], input[type="text"]');
            }

            if (!input) {
                return { success: false, error: 'No se encontró el campo de teléfono en pantalla.' };
            }

            input.focus();
            input.value = cleanPhone;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            await new Promise(r => setTimeout(r, 600));

            const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
            const nextBtn = buttons.find(b => {
                const txt = (b.innerText || b.textContent || '').toLowerCase().trim();
                return txt === 'siguiente' || txt === 'next';
            });
            if (nextBtn) nextBtn.click();

            for (let i = 0; i < 25; i++) {
                await new Promise(r => setTimeout(r, 500));
                const c = findCodeOnPage();
                if (c) return { success: true, code: c };
            }

            return { success: false, error: 'Tiempo de espera agotado para el código.' };
        }, clean);

        if (result && result.success && result.code) {
            currentPairingCode = result.code;
            statusMsg = `Código activo: ${result.code}`;
            console.log(`✅ Código generado exitosamente: ${result.code}`);

            return res.json({
                success: true,
                phone: '591' + clean,
                code: result.code.replace(/-/g, ''),
                formatted: result.code,
                message: 'Ingresa este código en WhatsApp > Dispositivos vinculados > Vincular con el número de teléfono.'
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error || 'No se pudo obtener el código de WhatsApp Web.'
            });
        }
    } catch (err) {
        console.error('❌ Error al solicitar código de emparejamiento:', err.message || err);
        return res.status(500).json({
            success: false,
            error: err.message || String(err)
        });
    }
});

// Endpoint de diagnóstico para pairing y prueba de clic
app.get('/api/debug-pairing', async (req, res) => {
    try {
        if (!client || !client.pupPage) {
            return res.json({ error: 'Navegador no inicializado' });
        }

        const submitPhone = req.query.submitPhone;
        let submitResult = null;

        if (submitPhone) {
            submitResult = await client.pupPage.evaluate(async (rawPhone) => {
                let clean = String(rawPhone).replace(/[^0-9]/g, '');
                if (clean.startsWith('591') && clean.length > 8) {
                    clean = clean.slice(3);
                }

                // 1. Si no estamos en la pantalla de teléfono, hacer clic en "Vincular con el número de teléfono"
                let input = document.querySelector('input[aria-label*="número de teléfono"], input[type="text"]');
                if (!input) {
                    const buttons = Array.from(document.querySelectorAll('span, button, div[role="button"]'));
                    const linkBtn = buttons.find(b => {
                        const txt = (b.innerText || b.textContent || '').toLowerCase();
                        return txt.includes('vincular con el número') || txt.includes('link with phone');
                    });
                    if (linkBtn) linkBtn.click();
                    await new Promise(r => setTimeout(r, 1200));
                    input = document.querySelector('input[aria-label*="número de teléfono"], input[type="text"]');
                }

                if (!input) {
                    return { success: false, error: 'No se encontró el campo de teléfono en la pantalla.' };
                }

                // 2. Ingresar el número en el campo de texto usando eventos nativos
                input.focus();
                input.value = clean;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                await new Promise(r => setTimeout(r, 600));

                // 3. Hacer clic en "Siguiente"
                const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                const nextBtn = buttons.find(b => {
                    const txt = (b.innerText || b.textContent || '').toLowerCase().trim();
                    return txt === 'siguiente' || txt === 'next';
                });

                if (!nextBtn) {
                    return { success: false, error: 'No se encontró el botón Siguiente' };
                }

                nextBtn.click();

                // 4. Esperar a que WhatsApp Web cargue y muestre el código de 8 dígitos
                let codeFound = null;
                for (let i = 0; i < 20; i++) {
                    await new Promise(r => setTimeout(r, 500));

                    // Buscar elementos con el código (usualmente spans de 1 carácter o contenedor de código)
                    const codeSpans = Array.from(document.querySelectorAll('[data-testid*="code"], [aria-details*="code"], div[role="presentation"] span, span[dir="ltr"]'))
                        .map(s => (s.innerText || s.textContent || '').trim())
                        .filter(t => /^[A-Z0-9]{4,8}$/.test(t) || /^[A-Z0-9]-[A-Z0-9]/.test(t));

                    if (codeSpans.length > 0) {
                        codeFound = codeSpans[0];
                        break;
                    }

                    // Buscar secuencia de 8 caracteres en cualquier span
                    const allText = Array.from(document.querySelectorAll('span, div'))
                        .map(x => (x.innerText || x.textContent || '').trim())
                        .find(t => /^[A-Z0-9]{4}[ -]?[A-Z0-9]{4}$/.test(t));
                    if (allText) {
                        codeFound = allText;
                        break;
                    }
                }

                const allTexts = Array.from(document.querySelectorAll('h1, h2, span, div'))
                    .map(x => (x.innerText || x.textContent || '').trim())
                    .filter(t => t.length > 1 && t.length < 50)
                    .slice(0, 20);

                return {
                    success: !!codeFound,
                    code: codeFound,
                    phoneEntered: clean,
                    pageTexts: allTexts
                };
            }, submitPhone);
        }

        const diag = await client.pupPage.evaluate(() => {
            const hasRequire = typeof window.require === 'function';
            let modulesFound = {};
            const candidates = [
                'WAWebAltDeviceLinkingApi',
                'WAWebSocketModel',
                'WAWebCompanionRegClientUtils'
            ];
            if (hasRequire) {
                for (const c of candidates) {
                    try {
                        const m = window.require(c);
                        modulesFound[c] = m ? Object.keys(m) : true;
                    } catch(e) {
                        modulesFound[c] = 'Error: ' + e.message;
                    }
                }
            }

            const elements = Array.from(document.querySelectorAll('span, button, div[role="button"], h1, h2, [data-testid]'))
                .map(el => ({
                    tag: el.tagName,
                    role: el.getAttribute('role'),
                    testid: el.getAttribute('data-testid'),
                    text: (el.innerText || el.textContent || '').trim().slice(0, 80)
                }))
                .filter(x => x.text.length > 2)
                .slice(0, 15);

            return {
                url: window.location.href,
                hasAuthStore: !!window.AuthStore,
                modulesFound,
                elements
            };
        });

        res.json({ diag, submitResult });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/qr-image', async (req, res) => {
    if (!currentQR) {
        return res.status(404).send('No hay código QR pendiente.');
    }
    try {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const buffer = await QRCode.toBuffer(currentQR, { width: 340, margin: 2 });
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Error generando imagen QR');
    }
});

// Endpoint para reiniciar la conexión del bot
app.all(['/api/restart-bot', '/restart'], async (req, res) => {
    console.log('🔄 Petición de reinicio manual recibida...');
    isRestarting = false;
    retryCount = 0;

    if (req.accepts('html') && !req.xhr) {
        res.send('<body style="background:#111;color:#0f0;font-family:sans-serif;text-align:center;padding:50px;"><h2>↻ Reiniciando bot...</h2><p>Redirigiendo a /qr en 3 segundos...</p><script>setTimeout(()=>location.href="/qr",3000)</script></body>');
    } else {
        res.json({ success: true, message: 'Reiniciando cliente de WhatsApp...' });
    }

    setTimeout(() => {
        startClient();
    }, 500);
});

// Endpoint para cerrar sesión y generar nuevo QR limpio
app.all(['/api/logout', '/logout'], async (req, res) => {
    console.log('🗑️ Petición de cierre de sesión y reseteo recibida...');
    try {
        isClientReady = false;
        currentQR = null;
        currentQRImage = null;

        await safeDestroyClient();

        try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            console.log('📁 Carpeta .wwebjs_auth eliminada exitosamente.');
        } catch (e) {
            console.warn('Advertencia al borrar auth:', e.message);
        }

        setTimeout(() => {
            isRestarting = false;
            startClient();
        }, 1500);

        if (req.accepts('html') && !req.xhr) {
            return res.redirect('/qr');
        }
        return res.json({ success: true, message: 'Sesión eliminada. Generando nuevo código QR.' });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ── Helper Seguro para Enviar Mensajes ─────────────────────────
async function safeSendMessage(chatId, content, options = {}) {
    if (!client || !isClientReady) {
        throw new Error('El bot de WhatsApp no está conectado todavía. Abre /qr para vincularlo.');
    }
    return await messageQueue.enqueue(async () => {
        return await client.sendMessage(chatId, content, options);
    });
}

// ── API: Enviar Mensaje de Texto (Con Cola Serializada) ───────
app.post('/api/send-message', requireToken, async (req, res) => {
    try {
        if (!isClientReady || !client) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp no está conectado todavía. Abre /qr para vincularlo.' });
        }
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros obligatorios (phone, message).' });
        }

        const chatId = formatChatId(phone);
        await safeSendMessage(chatId, String(message));

        console.log(`💬 Mensaje enviado con éxito a ${chatId}`);
        return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente.' });
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error.message || error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

// ── API: Enviar Imagen con Texto (Con Cola Serializada) ────────
app.post('/api/send-image', requireToken, async (req, res) => {
    try {
        if (!isClientReady || !client) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp no está conectado todavía. Abre /qr para vincularlo.' });
        }
        const { phone, imageUrl, caption } = req.body;
        if (!phone || !imageUrl) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros (phone, imageUrl).' });
        }

        const chatId = formatChatId(phone);

        let media = null;
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

        await safeSendMessage(chatId, media, { caption: caption || '' });

        console.log(`🖼️ Imagen enviada con éxito a ${chatId}`);
        return res.status(200).json({ success: true, message: 'Imagen enviada correctamente.' });
    } catch (error) {
        console.error('❌ Error al enviar imagen:', error.message || error);
        return res.status(500).json({ success: false, error: error.message || String(error) });
    }
});

// ── Inicio del Servidor Express ───────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n============================================================');
    console.log(`🚀 SERVIDOR PLIXORA BOT (CHROMIUM OFICIAL) ACTIVO EN PUERTO ${PORT}`);
    console.log(`📱 Código QR / Vinculación: http://localhost:${PORT}/qr`);
    console.log(`📊 Estado en JSON:          http://localhost:${PORT}/status`);
    console.log(`⚡ Motor:                  Google Chrome Headless (Meta Nativo)`);
    console.log('============================================================\n');

    startClient();
});

// ── Control de Errores Globales ───────────────────────────────
process.on('uncaughtException', (err) => {
    console.error('💥 uncaughtException:', err.message);
    if (err.message.includes('Protocol error') || err.message.includes('Target closed') || err.message.includes('Session closed')) {
        console.log('↻ Recuperando cliente tras cierre de Chromium...');
        isClientReady = false;
        setTimeout(() => {
            if (!isRestarting) startClient();
        }, 4000);
    }
});

process.on('unhandledRejection', (reason) => {
    console.warn('⚠️ unhandledRejection:', reason && reason.message ? reason.message : reason);
});

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
