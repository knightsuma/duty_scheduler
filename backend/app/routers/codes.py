from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin, get_current_user
from app.models.code import CodeGroup, CodeDetail
from app.models.user import User
from app.schemas.code import (
    CodeGroupCreate, CodeGroupResponse,
    CodeDetailCreate, CodeDetailUpdate, CodeDetailResponse,
)

router = APIRouter(prefix="/api/codes", tags=["codes"])


@router.get("/groups", response_model=List[CodeGroupResponse])
def list_groups(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(CodeGroup).all()


@router.post("/groups", response_model=CodeGroupResponse)
def create_group(
    body: CodeGroupCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if db.query(CodeGroup).filter(CodeGroup.group_code == body.group_code).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 그룹 코드입니다.")
    group = CodeGroup(**body.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.get("/groups/{group_code}", response_model=CodeGroupResponse)
def get_group(group_code: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    group = db.query(CodeGroup).filter(CodeGroup.group_code == group_code).first()
    if not group:
        raise HTTPException(status_code=404, detail="코드 그룹을 찾을 수 없습니다.")
    return group


@router.post("/groups/{group_id}/details", response_model=CodeDetailResponse)
def create_detail(
    group_id: int,
    body: CodeDetailCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    group = db.query(CodeGroup).filter(CodeGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="코드 그룹을 찾을 수 없습니다.")
    detail = CodeDetail(group_id=group_id, **body.model_dump())
    db.add(detail)
    db.commit()
    db.refresh(detail)
    return detail


@router.put("/details/{detail_id}", response_model=CodeDetailResponse)
def update_detail(
    detail_id: int,
    body: CodeDetailUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    detail = db.query(CodeDetail).filter(CodeDetail.id == detail_id).first()
    if not detail:
        raise HTTPException(status_code=404, detail="코드를 찾을 수 없습니다.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(detail, field, value)
    db.commit()
    db.refresh(detail)
    return detail


@router.delete("/details/{detail_id}")
def delete_detail(
    detail_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    detail = db.query(CodeDetail).filter(CodeDetail.id == detail_id).first()
    if not detail:
        raise HTTPException(status_code=404, detail="코드를 찾을 수 없습니다.")
    db.delete(detail)
    db.commit()
    return {"message": "삭제되었습니다."}
