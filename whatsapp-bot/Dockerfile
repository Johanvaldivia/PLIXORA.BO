# =============================================================
# PLIXORA.BO — WhatsApp Bot (Docker con Baileys Puro)
# Consumo ultra-ligero: ~40 MB RAM (Cero Chromium)
# Uso: docker build -t plixora-bot . && docker run -p 3000:3000 plixora-bot
# =============================================================
FROM node:20-slim

WORKDIR /app

# Dependencias (Caché eficiente de Docker)
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Código fuente y recursos
COPY server.js ./
COPY netflix-instrucciones.png ./

# Directorio de autenticación persistente
RUN mkdir -p auth_info_baileys

EXPOSE 3000

CMD ["node", "server.js"]
