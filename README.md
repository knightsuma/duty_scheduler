# 업무 스케줄 관리 시스템

## 기술 스택
- **Frontend**: React 18 + Vite + MUI + AG-Grid + FullCalendar
- **Backend**: Python FastAPI + SQLAlchemy
- **DB**: MariaDB

---

## 실행 방법

### 1. MariaDB 준비

```sql
-- MariaDB 접속 후 실행
source backend/init_db.sql
```

### 2. 백엔드 실행

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# .env 파일에서 DATABASE_URL 수정
# mysql+pymysql://duty_user:duty_pass123@localhost:3306/duty_scheduler

uvicorn app.main:app --reload --port 8000
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

### 4. 초기 접속

- URL: http://localhost:5173
- 아이디: `admin`
- 비밀번호: `admin1234`

---

## 화면 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| 로그인 | `/login` | JWT 인증 |
| 대시보드 | `/dashboard` | 달력 + 일별 근태 현황 |
| 월간 현황 | `/monthly` | AG-Grid 스프레드시트 |
| 사용자 관리 | `/users` | ADMIN 전용 |
| 코드 관리 | `/codes` | ADMIN 전용 |

---

## 권한 구조

| 권한 | 설명 |
|------|------|
| USER | 본인 스케줄만 입력/수정 |
| MANAGER | 전체 사용자 스케줄 수정 |
| ADMIN | 코드·사용자 관리 + 전체 스케줄 |

---

## API 문서

백엔드 실행 후 http://localhost:8000/docs 에서 Swagger UI 확인
