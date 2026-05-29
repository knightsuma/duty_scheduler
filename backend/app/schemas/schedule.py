from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


class ScheduleCreate(BaseModel):
    user_id: int
    work_date: date
    attendance_type: str
    etc_reason: Optional[str] = None


class ScheduleUpdate(BaseModel):
    attendance_type: Optional[str] = None
    etc_reason: Optional[str] = None


class ScheduleResponse(BaseModel):
    id: int
    user_id: int
    work_date: date
    attendance_type: str
    etc_reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class MonthlyScheduleRow(BaseModel):
    user_id: int
    user_name: str
    work_type: Optional[str] = None
    schedules: dict  # {day: attendance_type}


class DailySummary(BaseModel):
    attendance_type: str
    attendance_name: str
    count: int


class DailyDetail(BaseModel):
    user_id: int
    user_name: str
    attendance_type: str
    attendance_name: str
    etc_reason: Optional[str] = None
    schedule_id: Optional[int] = None
