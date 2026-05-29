from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.schedule import Schedule
from app.models.user import User
from app.models.code import CodeGroup, CodeDetail
from app.schemas.schedule import (
    ScheduleCreate, ScheduleUpdate, ScheduleResponse,
    MonthlyScheduleRow, DailySummary, DailyDetail,
)

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


def _get_attendance_name(db: Session, code: str) -> str:
    group = db.query(CodeGroup).filter(CodeGroup.group_code == "ATTENDANCE").first()
    if not group:
        return code
    detail = db.query(CodeDetail).filter(
        CodeDetail.group_id == group.id,
        CodeDetail.code == code,
    ).first()
    return detail.code_name if detail else code


@router.get("/monthly", response_model=List[MonthlyScheduleRow])
def monthly_schedules(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    users = db.query(User).filter(User.use_yn == "Y").order_by(User.user_name).all()
    start = date(year, month, 1)
    import calendar
    last_day = calendar.monthrange(year, month)[1]
    end = date(year, month, last_day)

    schedules = (
        db.query(Schedule)
        .filter(Schedule.work_date >= start, Schedule.work_date <= end)
        .all()
    )

    schedule_map: dict[int, dict[int, dict]] = {}
    for s in schedules:
        schedule_map.setdefault(s.user_id, {})[s.work_date.day] = {
            "attendance_type": s.attendance_type,
            "etc_reason": s.etc_reason,
            "schedule_id": s.id,
        }

    return [
        MonthlyScheduleRow(
            user_id=u.id,
            user_name=u.user_name,
            work_type=u.work_type,
            schedules=schedule_map.get(u.id, {}),
        )
        for u in users
    ]


@router.get("/daily", response_model=List[DailyDetail])
def daily_schedules(
    work_date: date = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    schedules = (
        db.query(Schedule, User)
        .join(User, Schedule.user_id == User.id)
        .filter(Schedule.work_date == work_date, User.use_yn == "Y")
        .all()
    )
    result = []
    for s, u in schedules:
        result.append(DailyDetail(
            user_id=u.id,
            user_name=u.user_name,
            attendance_type=s.attendance_type,
            attendance_name=_get_attendance_name(db, s.attendance_type),
            etc_reason=s.etc_reason,
            schedule_id=s.id,
        ))
    return result


@router.get("/daily/summary", response_model=List[DailySummary])
def daily_summary(
    work_date: date = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from sqlalchemy import func
    rows = (
        db.query(Schedule.attendance_type, func.count(Schedule.id).label("cnt"))
        .join(User, Schedule.user_id == User.id)
        .filter(Schedule.work_date == work_date, User.use_yn == "Y")
        .group_by(Schedule.attendance_type)
        .all()
    )
    return [
        DailySummary(
            attendance_type=r.attendance_type,
            attendance_name=_get_attendance_name(db, r.attendance_type),
            count=r.cnt,
        )
        for r in rows
    ]


@router.post("", response_model=ScheduleResponse)
def create_schedule(
    body: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "USER" and body.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인 스케줄만 입력할 수 있습니다.")

    existing = db.query(Schedule).filter(
        Schedule.user_id == body.user_id,
        Schedule.work_date == body.work_date,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="해당 날짜에 이미 스케줄이 존재합니다. 수정 API를 사용하세요.")

    schedule = Schedule(
        **body.model_dump(),
        created_by=current_user.login_id,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return ScheduleResponse(
        **{c.name: getattr(schedule, c.name) for c in schedule.__table__.columns},
        user_name=schedule.user.user_name,
    )


@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    body: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다.")
    if current_user.role == "USER" and schedule.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인 스케줄만 수정할 수 있습니다.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(schedule, field, value)
    db.commit()
    db.refresh(schedule)
    return ScheduleResponse(
        **{c.name: getattr(schedule, c.name) for c in schedule.__table__.columns},
        user_name=schedule.user.user_name,
    )


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다.")
    if current_user.role == "USER" and schedule.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인 스케줄만 삭제할 수 있습니다.")
    db.delete(schedule)
    db.commit()
    return {"message": "삭제되었습니다."}


@router.post("/bulk", response_model=List[ScheduleResponse])
def bulk_upsert(
    body: List[ScheduleCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """월간 스프레드시트에서 여러 셀을 한번에 저장하는 API"""
    if current_user.role == "USER":
        for item in body:
            if item.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="본인 스케줄만 입력할 수 있습니다.")

    results = []
    for item in body:
        existing = db.query(Schedule).filter(
            Schedule.user_id == item.user_id,
            Schedule.work_date == item.work_date,
        ).first()
        if existing:
            for field, value in item.model_dump(exclude_none=True).items():
                setattr(existing, field, value)
            db.commit()
            db.refresh(existing)
            results.append(existing)
        else:
            schedule = Schedule(**item.model_dump(), created_by=current_user.login_id)
            db.add(schedule)
            db.commit()
            db.refresh(schedule)
            results.append(schedule)

    return [
        ScheduleResponse(
            **{c.name: getattr(s, c.name) for c in s.__table__.columns},
            user_name=s.user.user_name,
        )
        for s in results
    ]
