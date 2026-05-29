from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class HolidayCreate(BaseModel):
    holiday_date: date
    name: str
    type: str = "HOLIDAY"   # HOLIDAY | EVENT
    color: Optional[str] = None


class HolidayUpdate(BaseModel):
    holiday_date: Optional[date] = None
    name: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None


class HolidayResponse(BaseModel):
    id: int
    holiday_date: date
    name: str
    type: str
    color: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
