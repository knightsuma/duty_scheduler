from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.holiday import Holiday
from app.models.user import User
from app.schemas.holiday import HolidayCreate, HolidayUpdate, HolidayResponse

router = APIRouter(prefix="/api/holidays", tags=["holidays"])


@router.get("", response_model=List[HolidayResponse])
def list_holidays(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Holiday)
    if year and month:
        from datetime import date
        import calendar
        start = date(year, month, 1)
        end = date(year, month, calendar.monthrange(year, month)[1])
        q = q.filter(Holiday.holiday_date >= start, Holiday.holiday_date <= end)
    elif year:
        from datetime import date
        q = q.filter(Holiday.holiday_date >= date(year, 1, 1), Holiday.holiday_date <= date(year, 12, 31))
    return q.order_by(Holiday.holiday_date).all()


@router.post("", response_model=HolidayResponse)
def create_holiday(
    body: HolidayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    holiday = Holiday(**body.model_dump(), created_by=current_user.login_id)
    db.add(holiday)
    db.commit()
    db.refresh(holiday)
    return holiday


@router.put("/{holiday_id}", response_model=HolidayResponse)
def update_holiday(
    holiday_id: int,
    body: HolidayUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="휴일을 찾을 수 없습니다.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(holiday, field, value)
    db.commit()
    db.refresh(holiday)
    return holiday


@router.delete("/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    holiday = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="휴일을 찾을 수 없습니다.")
    db.delete(holiday)
    db.commit()
    return {"message": "삭제되었습니다."}
