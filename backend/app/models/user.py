from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    login_id = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(200), nullable=False)
    user_name = Column(String(100), nullable=False)
    role = Column(String(20), default="USER")       # USER, MANAGER, ADMIN
    work_type = Column(String(50), nullable=True)   # 업무구분 코드
    use_yn = Column(String(1), default="Y")

    schedules = relationship("Schedule", back_populates="user")
