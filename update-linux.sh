#!/bin/bash
# 코드 업데이트 시 재배포 스크립트
set -e

APP_DIR="/opt/duty_scheduler"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$EUID" -ne 0 ]; then
  echo "[오류] sudo 로 실행해주세요: sudo bash update-linux.sh"
  exit 1
fi

echo "=== 업무 스케줄 시스템 업데이트 ==="

# 백엔드 코드 복사
echo "[1/4] 백엔드 코드 업데이트..."
cp -r "$SCRIPT_DIR/backend/app" "$APP_DIR/backend/"
chown -R duty:duty "$APP_DIR/backend"

# Python 패키지 업데이트
echo "[2/4] Python 패키지 업데이트..."
"$APP_DIR/venv/bin/pip" install -r "$APP_DIR/backend/requirements.txt" -q

# 프론트엔드 빌드
echo "[3/4] 프론트엔드 재빌드..."
cp -r "$SCRIPT_DIR/frontend/src" "$APP_DIR/frontend/"
cp "$SCRIPT_DIR/frontend/package.json" "$APP_DIR/frontend/"
cd "$APP_DIR/frontend"
npm ci --silent
npm run build

# 백엔드 재시작
echo "[4/4] 백엔드 서비스 재시작..."
systemctl restart duty-scheduler

echo ""
echo "=== 업데이트 완료 ==="
systemctl status duty-scheduler --no-pager
