#!/usr/bin/env bash
set -Eeuo pipefail

# BSCH reverse-tunnel VPS bootstrap
# Usage: sudo APP_DOMAIN=app.example.com bash setup-vps.sh

: "${APP_DOMAIN:?ضع اسم النطاق: APP_DOMAIN=app.example.com}"
TUNNEL_USER="${TUNNEL_USER:-hospital-tunnel}"
TUNNEL_PORT="${TUNNEL_PORT:-18080}"
SSH_PORT="${SSH_PORT:-22}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "شغّل السكربت بصلاحية root: sudo APP_DOMAIN=... bash setup-vps.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl openssh-server ufw

if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

if ! id "${TUNNEL_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /usr/sbin/nologin "${TUNNEL_USER}"
fi

install -d -m 0755 /etc/caddy
cat > /etc/caddy/Caddyfile <<EOF
${APP_DOMAIN} {
    encode gzip
    reverse_proxy 127.0.0.1:${TUNNEL_PORT}
    header Cache-Control "no-store"
}
EOF

# Keep the forwarded listener local to the VPS; never expose it directly.
cat > /etc/ssh/sshd_config.d/bsch-tunnel.conf <<EOF
Match User ${TUNNEL_USER}
    AllowTcpForwarding remote
    GatewayPorts no
    X11Forwarding no
    AllowAgentForwarding no
    PermitTTY no
    PasswordAuthentication no
    PubkeyAuthentication yes
    PermitListen 127.0.0.1:${TUNNEL_PORT}
EOF

sshd -t
systemctl reload ssh || systemctl restart ssh
caddy validate --config /etc/caddy/Caddyfile
systemctl enable --now caddy

ufw allow "${SSH_PORT}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

cat <<EOF
تم إعداد VPS.

1. أضف DNS A record للنطاق ${APP_DOMAIN} إلى IP هذا الـVPS.
2. أضف المفتاح العام إلى /home/${TUNNEL_USER}/.ssh/authorized_keys.
3. لا تفتح المنفذ ${TUNNEL_PORT} في الجدار الناري؛ يجب أن يبقى محليًا.
4. اختبر بعد تشغيل نفق Windows: curl -I https://${APP_DOMAIN}
EOF
