@echo off
title 업무스케줄 관리 시스템 시작
echo ========================================
echo  업무 스케줄 관리 시스템 시작
echo ========================================

echo [1/2] 백엔드 서버 시작...
start "Backend (FastAPI)" cmd /k "cd /d D:\workspace\duty_scheduler\backend && C:\Users\user\AppData\Local\Python\bin\python3.exe -m uvicorn app.main:app --reload --port 8000"

timeout /t 5 /nobreak > nul

echo [2/2] 프론트엔드 서버 시작...
start "Frontend (React)" cmd /k "cd /d D:\workspace\duty_scheduler\frontend && npm run dev"

timeout /t 8 /nobreak > nul

echo.
echo ========================================
echo  브라우저에서 접속하세요:
echo  http://localhost:5173
echo.
echo  초기 로그인:  admin / admin1234
echo ========================================
start http://localhost:5173
