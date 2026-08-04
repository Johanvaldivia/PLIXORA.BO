# =============================================================
# PLIXORA.BO — WhatsApp Bot (Docker)
# Uso: docker build -t plixora-bot . && docker run -p 3000:3000 plixora-bot
# =============================================================
FROM node:20-slim

# Chromium para whatsapp-web.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libxss1 \
    libasound2 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgtk-3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar dependencias primero (cache de capas)
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copiar código
COPY server.js ./
COPY netflix-instrucciones.png ./

# Exponer puerto
EXPOSE 3000

CMD ["node", "server.js"]
