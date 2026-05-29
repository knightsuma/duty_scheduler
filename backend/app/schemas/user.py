from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    login_id: str
    password: str
    user_name: str
    role: str = "USER"
    work_type: Optional[str] = None


class UserUpdate(BaseModel):
    user_name: Optional[str] = None
    role: Optional[str] = None
    work_type: Optional[str] = None
    use_yn: Optional[str] = None


class PasswordReset(BaseModel):
    new_password: str


class UserResponse(BaseModel):
    id: int
    login_id: str
    user_name: str
    role: str
    work_type: Optional[str] = None
    use_yn: str

    class Config:
        from_attributes = True
