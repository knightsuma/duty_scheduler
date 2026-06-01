from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models import CodeGroup, CodeDetail, User, Schedule, Holiday  # noqa: register models
from app.routers import auth, codes, users, schedules, holidays
from app.services.seed import seed_initial_data

app = FastAPI(title="업무 스케줄 관리 시스템", version="1.0.0")

import os

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    ALLOWED_ORIGINS.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(codes.router)
app.include_router(users.router)
app.include_router(schedules.router)
app.include_router(holidays.router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
