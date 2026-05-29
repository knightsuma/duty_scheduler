@echo off
title 업무스케줄 - Backend (FastAPI)
cd /d D:\workspace\duty_scheduler\backend
echo [백엔드 시작중...] http://localhost:8000
C:\Users\user\AppData\Local\Python\bin\python3.exe -m uvicorn app.main:app --reload --port 8000
pause
