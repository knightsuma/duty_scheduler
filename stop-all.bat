@echo off
title 업무스케줄 관리 시스템 종료
echo ========================================
echo  업무 스케줄 관리 시스템 종료
echo ========================================

:: ── 백엔드 (포트 8000) ──────────────────
echo [1/2] 백엔드 서버 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo       PID %%a 종료
    taskkill /PID %%a /F >nul 2>&1
)
taskkill /FI "WINDOWTITLE eq Backend (FastAPI)*" /F >nul 2>&1

:: ── 프론트엔드 (포트 5173) ──────────────
echo [2/2] 프론트엔드 서버 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo       PID %%a 종료
    taskkill /PID %%a /F >nul 2>&1
)
taskkill /FI "WINDOWTITLE eq Frontend (React)*" /F >nul 2>&1

echo.
echo ========================================
echo  모든 서버가 종료되었습니다.
echo ========================================
timeout /t 3 /nobreak > nul
