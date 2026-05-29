from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.code import CodeGroup, CodeDetail
from app.models.user import User


def seed_initial_data(db: Session):
    # 코드 그룹 및 상세 초기 데이터
    _seed_codes(db)
    # 관리자 계정
    _seed_admin(db)


def _seed_codes(db: Session):
    groups = [
        {
            "group_code": "WORK_TYPE",
            "group_name": "업무구분",
            "details": [
                ("BROADCAST", "방송", 1),
                ("TELECOM", "통신", 2),
                ("TEAM_LEADER", "팀장", 3),
                ("ETC", "기타", 4),
            ],
        },
        {
            "group_code": "ATTENDANCE",
            "group_name": "근태종류",
            "details": [
                ("ALWAYS", "상시출근", 1),
                ("DAY", "주간출근", 2),
                ("DUTY", "당직", 3),
                ("LEAVE", "퇴근", 4),
                ("ANNUAL", "연차", 5),
                ("WORKER", "작업자", 6),
                ("ALT_REST", "대체휴무", 7),
                ("EARLY", "5시퇴근", 8),
                ("ETC", "기타", 9),
            ],
        },
    ]

    for g_data in groups:
        group = db.query(CodeGroup).filter(CodeGroup.group_code == g_data["group_code"]).first()
        if not group:
            group = CodeGroup(group_code=g_data["group_code"], group_name=g_data["group_name"])
            db.add(group)
            db.flush()
            for code, name, order in g_data["details"]:
                db.add(CodeDetail(group_id=group.id, code=code, code_name=name, sort_order=order))
    db.commit()


def _seed_admin(db: Session):
    if not db.query(User).filter(User.login_id == "admin").first():
        admin = User(
            login_id="admin",
            password=get_password_hash("admin1234"),
            user_name="관리자",
            role="ADMIN",
            use_yn="Y",
        )
        db.add(admin)
        db.commit()
