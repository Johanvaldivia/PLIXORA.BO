#!/bin/bash
# =============================================================
# PLIXORA.BO — Deploy del WhatsApp Bot en VPS/Linux
# Uso: chmod +x deploy-vps.sh && ./deploy-vps.sh
# Requisitos: Docker y Docker Compose instalados
# =============================================================
set -e

echo "=== PLIXORA.BO - Deploy WhatsApp Bot ==="

# 1. Realizar build con Docker
echo "[1/4] Construyendo imagen..."
docker build -t plixora-bot .

# 2. Detener contenedor antiguo si existe
echo "[2/4] Deteniendo contenedor antiguo..."
docker rm -f plixora-bot 2>/dev/null || true

# 3. Crear volumen persistente para la sesión del bot
echo "[3/4] Creando volumen de sesión (persistente)..."
docker volume create plixora-bot-session 2>/dev/null || true

# 4. Levantar el contenedor
echo "[4/4] Levantando contenedor..."
docker run -d \
  --name plixora-bot \
  --restart always \
  -p 3000:3000 \
  -e PORT=3000 \
  -e WA_BOT_TOKEN="${WA_BOT_TOKEN:-}" \
  -v plixora-bot-session:/app/.wwebjs_auth \
  plixora-bot

echo ""
echo "=== BOT DESPLEGADO ==="
echo "QR:      http://TU_IP_DE_LA_VM:3000/qr"
echo "Estado:  http://TU_IP_DE_LA_VM:3000/status"
echo ""
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -n "$IP" ]; then
  echo "IP detectada: http://$IP:3000/qr"
  echo ""
  echo "Abre esa URL en tu navegador y escanea el QR con WhatsApp Business."
  echo "La sesión se guarda en el volumen 'plixora-bot-session' — si reinicias,"
  echo "NO necesitarás escanear de nuevo."
fi