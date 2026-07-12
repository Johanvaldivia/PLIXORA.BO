require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración dinámica del navegador para Windows o Linux (Nube)
const puppeteerConfig = {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
};

if (process.platform === 'win32') {
    puppeteerConfig.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

// Inicializar cliente de WhatsApp (Usando LocalAuth para mantener la sesión)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerConfig
});

let isClientReady = false;

// Evento: Generar QR
client.on('qr', (qr) => {
    console.log('===================================================');
    console.log('ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP BUSINESS:');
    console.log('===================================================');
    qrcode.generate(qr, { small: true });
});

// Evento: Autenticación exitosa
client.on('authenticated', () => {
    console.log('Autenticación exitosa.');
});

// Evento: Cliente listo para enviar mensajes
client.on('ready', () => {
    console.log('¡El cliente de WhatsApp está LISTO para enviar mensajes!');
    isClientReady = true;
});

// Evento: Desconexión
client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
    isClientReady = false;
});

// Arrancar el cliente
client.initialize();

// Endpoint de la API para enviar mensajes
app.post('/api/send-message', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp aún no está listo o conectado.' });
        }

        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros (phone, message).' });
        }

        // Formatear número (Ejemplo de Bolivia: 591 + número)
        // whatsapp-web.js requiere el formato número@c.us
        let formattedPhone = phone.replace(/[^0-9]/g, '');
        if (!formattedPhone.startsWith('591') && formattedPhone.length === 8) {
            formattedPhone = `591${formattedPhone}`;
        }

        const chatId = `${formattedPhone}@c.us`;

        // Enviar el mensaje
        await client.sendMessage(chatId, message);
        console.log(`✅ Mensaje enviado exitosamente a ${formattedPhone}`);

        return res.status(200).json({ success: true, message: 'Mensaje enviado.' });

    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
        return res.status(500).json({ success: false, error: error.toString() });
    }
});

// Endpoint para enviar imagen con caption
app.post('/api/send-image', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({ success: false, error: 'El bot de WhatsApp aún no está listo o conectado.' });
        }
        const { phone, imageUrl, caption } = req.body;
        if (!phone || !imageUrl) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros (phone, imageUrl).' });
        }
        let formattedPhone = phone.replace(/[^0-9]/g, '');
        if (!formattedPhone.startsWith('591') && formattedPhone.length === 8) {
            formattedPhone = `591${formattedPhone}`;
        }
        const chatId = `${formattedPhone}@c.us`;
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
        await client.sendMessage(chatId, media, { caption: caption || '' });
        console.log(`✅ Imagen enviada exitosamente a ${formattedPhone}`);
        return res.status(200).json({ success: true, message: 'Imagen enviada.' });
    } catch (error) {
        console.error('❌ Error al enviar imagen:', error);
        return res.status(500).json({ success: false, error: error.toString() });
    }
});

// Iniciar servidor Express
app.listen(PORT, () => {
    console.log(`🚀 Servidor API escuchando en http://localhost:${PORT}`);
    console.log('Iniciando el bot de WhatsApp, por favor espera el código QR...');
});
