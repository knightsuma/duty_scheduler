from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class CodeGroup(Base):
    __tablename__ = "code_group"

    id = Column(Integer, primary_key=True, index=True)
    group_code = Column(String(50), unique=True, nullable=False)
    group_name = Column(String(100), nullable=False)

    details = relationship("CodeDetail", back_populates="group", cascade="all, delete-orphan")


class CodeDetail(Base):
    __tablename__ = "code_detail"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("code_group.id"), nullable=False)
    code = Column(String(50), nullable=False)
    code_name = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0)
    use_yn = Column(String(1), default="Y")

    group = relationship("CodeGroup", back_populates="details")
