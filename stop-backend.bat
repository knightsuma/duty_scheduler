@echo off
title 업무스케줄 - Backend 종료
echo ========================================
echo  백엔드 서버 종료 중...
echo ========================================

:: 포트 8000 을 점유한 PID 찾아서 종료
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    echo [종료] PID %%a (포트 8000)
    taskkill /PID %%a /F >nul 2>&1
)

:: 타이틀이 "Backend (FastAPI)" 인 cmd 창 종료
taskkill /FI "WINDOWTITLE eq Backend (FastAPI)*" /F >nul 2>&1

echo  백엔드 서버가 종료되었습니다.
echo ========================================
timeout /t 2 /nobreak > nul
