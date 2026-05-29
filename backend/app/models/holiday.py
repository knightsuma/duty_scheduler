from sqlalchemy import Column, Integer, String, Date, DateTime, func

from app.core.database import Base


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    holiday_date = Column(Date, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    type = Column(String(20), nullable=False, default="HOLIDAY")  # HOLIDAY | EVENT
    color = Column(String(20), nullable=True)                     # hex color, nullable → 타입별 기본색 사용
    created_by = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
