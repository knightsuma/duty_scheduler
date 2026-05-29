#!/bin/bash
# ============================================================
#  업무 스케줄 관리 시스템 - Linux 직접 설치 스크립트
#  Ubuntu 22.04 / Debian 12 기준
# ============================================================
set -e

APP_DIR="/opt/duty_scheduler"
SERVICE_USER="duty"

echo "========================================"
echo " 업무 스케줄 관리 시스템 설치 시작"
echo "========================================"

# ── root 권한 확인 ──────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo "[오류] sudo 로 실행해주세요: sudo bash install-linux.sh"
  exit 1
fi

# ── 1. 패키지 업데이트 ───────────────────────
echo ""
echo "[1/8] 시스템 패키지 업데이트..."
apt-get update -q

# ── 2. 필수 패키지 설치 ──────────────────────
echo ""
echo "[2/8] 필수 패키지 설치 (MariaDB, Python, Node.js, Nginx)..."

# MariaDB
apt-get install -y mariadb-server mariadb-client

# Python
apt-get install -y python3 python3-pip python3-venv python3-dev \
                   libmariadb-dev gcc pkg-config

# Node.js 20.x
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Nginx
apt-get install -y nginx

# ── 3. MariaDB 설정 ───────────────────────────
echo ""
echo "[3/8] MariaDB 데이터베이스 설정..."

systemctl start mariadb
systemctl enable mariadb

# DB/유저 생성 (.env.prod 에서 값 읽기)
if [ -f "$APP_DIR/.env.prod" ]; then
  source <(grep -v '^#' "$APP_DIR/.env.prod" | sed 's/ *= */=/g')
else
  # 기본값
  MYSQL_DATABASE="duty_scheduler"
  MYSQL_USER="duty_user"
  MYSQL_PASSWORD="duty_pass123!"
fi

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost'
  IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
echo "  DB: ${MYSQL_DATABASE}, User: ${MYSQL_USER} 생성 완료"

# ── 4. 앱 디렉토리 준비 ──────────────────────
echo ""
echo "[4/8] 앱 파일 설치..."

# 서비스 전용 사용자 생성
if ! id "$SERVICE_USER" &>/dev/null; then
  useradd -r -s /bin/false -d "$APP_DIR" "$SERVICE_USER"
fi

# 현재 디렉토리의 파일을 APP_DIR로 복사
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$APP_DIR"
cp -r "$SCRIPT_DIR/backend" "$APP_DIR/"
cp -r "$SCRIPT_DIR/frontend" "$APP_DIR/"

# .env.prod → backend/.env 복사
if [ -f "$SCRIPT_DIR/.env.prod" ]; then
  cp "$SCRIPT_DIR/.env.prod" "$APP_DIR/backend/.env"
fi

chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR"

# ── 5. Python 가상환경 + 패키지 설치 ─────────
echo ""
echo "[5/8] Python 패키지 설치..."

python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --upgrade pip -q
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt" -q
echo "  Python 패키지 설치 완료"

# ── 6. 프론트엔드 빌드 ───────────────────────
echo ""
echo "[6/8] React 프론트엔드 빌드..."

cd "$APP_DIR/frontend"
npm ci --silent
npm run build
echo "  빌드 완료: $APP_DIR/frontend/dist"

# ── 7. systemd 서비스 등록 ───────────────────
echo ""
echo "[7/8] systemd 백엔드 서비스 등록..."

cat > /etc/systemd/system/duty-scheduler.service <<EOF
[Unit]
Description=업무 스케줄 관리 시스템 - FastAPI Backend
After=network.target mariadb.service
Requires=mariadb.service

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${APP_DIR}/backend
Environment=PATH=${APP_DIR}/venv/bin
ExecStart=${APP_DIR}/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable duty-scheduler
systemctl start duty-scheduler
echo "  서비스 등록 및 시작 완료"

# ── 8. Nginx 설정 ────────────────────────────
echo ""
echo "[8/8] Nginx 설정..."

# 서버 IP 자동 감지
SERVER_IP=$(hostname -I | awk '{print $1}')

cat > /etc/nginx/sites-available/duty-scheduler <<EOF
server {
    listen 80;
    server_name ${SERVER_IP} _;

    # 프론트엔드 정적 파일
    root ${APP_DIR}/frontend/dist;
    index index.html;

    # React SPA 라우팅
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API → FastAPI 프록시
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    # 정적 자원 캐시
    location ~* \.(js|css|png|jpg|ico|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    client_max_body_size 10M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
EOF

# 기본 사이트 비활성화, 우리 사이트 활성화
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/duty-scheduler \
       /etc/nginx/sites-enabled/duty-scheduler

nginx -t
systemctl restart nginx
systemctl enable nginx

# ── 완료 ─────────────────────────────────────
echo ""
echo "========================================"
echo " 설치 완료!"
echo ""
echo " 접속 주소: http://${SERVER_IP}"
echo " 초기 계정: admin / admin1234"
echo ""
echo " 유용한 명령어:"
echo "   서비스 상태: systemctl status duty-scheduler"
echo "   로그 보기:   journalctl -u duty-scheduler -f"
echo "   재시작:      systemctl restart duty-scheduler"
echo "========================================"
