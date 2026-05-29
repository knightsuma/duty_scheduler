from pydantic import BaseModel
from typing import List, Optional


class CodeDetailBase(BaseModel):
    code: str
    code_name: str
    sort_order: int = 0
    use_yn: str = "Y"


class CodeDetailCreate(CodeDetailBase):
    pass


class CodeDetailUpdate(BaseModel):
    code_name: Optional[str] = None
    sort_order: Optional[int] = None
    use_yn: Optional[str] = None


class CodeDetailResponse(CodeDetailBase):
    id: int
    group_id: int

    class Config:
        from_attributes = True


class CodeGroupBase(BaseModel):
    group_code: str
    group_name: str


class CodeGroupCreate(CodeGroupBase):
    pass


class CodeGroupResponse(CodeGroupBase):
    id: int
    details: List[CodeDetailResponse] = []

    class Config:
        from_attributes = True
