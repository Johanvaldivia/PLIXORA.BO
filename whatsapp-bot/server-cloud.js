require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let currentQR = null;
let isClientReady = false;
let statusMsg = 'Iniciando...';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/snap/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote']
    }
});

client.on('qr', (qr) => {
    currentQR = qr;
    statusMsg = 'Esperando escaneo QR...';
    console.log('Nuevo QR generado - Abre http://TU_IP:3000/qr para escanearlo');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    currentQR = null;
    statusMsg = 'Autenticado!';
    console.log('Autenticacion exitosa.');
});

client.on('ready', () => {
    currentQR = null;
    statusMsg = 'LISTO - WhatsApp conectado!';
    isClientReady = true;
    console.log('WhatsApp LISTO para enviar mensajes!');
});

client.on('disconnected', (reason) => {
    statusMsg = 'Desconectado: ' + reason;
    isClientReady = false;
});

client.initialize();

app.get('/qr', async (req, res) => {
    if (isClientReady) {
        return res.send('<html><body style="background:#111;color:#0f0;font-size:24px;text-align:center;padding:50px;"><h1>WhatsApp YA esta conectado!</h1></body></html>');
    }
    if (!currentQR) {
        return res.send('<html><body style="background:#111;color:#fff;font-size:24px;text-align:center;padding:50px;"><h1>Esperando QR... Recarga en unos segundos</h1><script>setTimeout(function(){location.reload()},3000)</script></body></html>');
    }
    try {
        const qrImage = await QRCode.toDataURL(currentQR, { width: 400 });
        res.send('<html><body style="background:#111;text-align:center;padding:50px;"><h1 style="color:#0f0">Escanea con WhatsApp Business</h1><img src="' + qrImage + '" style="border:8px solid #fff;border-radius:12px;"/><p style="color:#fff">Si se vence, recarga la pagina</p><script>setTimeout(function(){location.reload()},25000)</script></body></html>');
    } catch(err) {
        res.send('Error generando QR');
    }
});

app.get('/status', (req, res) => {
    res.json({ ready: isClientReady, status: statusMsg });
});

app.post('/api/send-message', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ success: false, error: 'Bot no listo.' });
        }
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ success: false, error: 'Faltan phone y message.' });
        }
        let fp = phone.replace(/[^0-9]/g, '');
        if (!fp.startsWith('591') && fp.length === 8) {
            fp = '591' + fp;
        }
        await client.sendMessage(fp + '@c.us', message);
        console.log('Mensaje enviado a ' + fp);
        return res.status(200).json({ success: true, message: 'Enviado.' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.toString() });
    }
});

// Endpoint para enviar imagen con caption
app.post('/api/send-image', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ success: false, error: 'Bot no listo.' });
        }
        const { phone, imageUrl, caption } = req.body;
        if (!phone || !imageUrl) {
            return res.status(400).json({ success: false, error: 'Faltan phone y imageUrl.' });
        }
        let fp = phone.replace(/[^0-9]/g, '');
        if (!fp.startsWith('591') && fp.length === 8) {
            fp = '591' + fp;
        }
        const { MessageMedia } = require('whatsapp-web.js');
        let media;
        const path = require('path');
        const fs = require('fs');

        // Cargar imagen local si es para netflix-instrucciones.png y existe
        if (imageUrl && imageUrl.includes('netflix-instrucciones.png')) {
            const localPath = path.join(__dirname, 'netflix-instrucciones.png');
            if (fs.existsSync(localPath)) {
                try {
                    media = MessageMedia.fromFilePath(localPath);
                    console.log('📦 Cargando netflix-instrucciones.png desde almacenamiento local del bot');
                } catch (localErr) {
                    console.error('⚠️ Error al cargar imagen local:', localErr);
                }
            }
        }

        if (!media) {
            media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
        }
        await client.sendMessage(fp + '@c.us', media, { caption: caption || '' });
        console.log('Imagen enviada a ' + fp);
        return res.status(200).json({ success: true, message: 'Imagen enviada.' });
    } catch (error) {
        console.error('Error enviando imagen:', error);
        return res.status(500).json({ success: false, error: error.toString() });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Servidor en http://0.0.0.0:' + PORT);
});
