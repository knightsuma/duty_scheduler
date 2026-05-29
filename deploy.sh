#!/bin/bash
set -e

echo "========================================"
echo " 업무 스케줄 관리 시스템 배포 스크립트"
echo "========================================"

# ── Docker / Docker Compose 확인 ──────────────
if ! command -v docker &>/dev/null; then
  echo "[오류] Docker가 설치되어 있지 않습니다."
  echo "  Ubuntu: sudo apt install docker.io docker-compose-plugin -y"
  exit 1
fi

# ── .env.prod 확인 ────────────────────────────
if [ ! -f .env.prod ]; then
  echo "[오류] .env.prod 파일이 없습니다."
  echo "  .env.prod 파일의 비밀번호와 SECRET_KEY를 반드시 변경하세요!"
  exit 1
fi

echo ""
echo "[1/4] 기존 컨테이너 정리..."
docker compose down --remove-orphans 2>/dev/null || true

echo ""
echo "[2/4] 이미지 빌드..."
docker compose build --no-cache

echo ""
echo "[3/4] 서비스 시작..."
docker compose --env-file .env.prod up -d

echo ""
echo "[4/4] 상태 확인..."
sleep 5
docker compose ps

echo ""
echo "========================================"
echo " 배포 완료!"
echo " 접속 주소: http://$(hostname -I | awk '{print $1}')"
echo " 초기 계정: admin / admin1234"
echo "========================================"
