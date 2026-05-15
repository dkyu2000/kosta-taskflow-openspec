import secrets
import string
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter(prefix="/api/teams", tags=["teams"])


def generate_invite_code() -> str:
    chars = string.ascii_uppercase + string.digits
    part = lambda: "".join(secrets.choice(chars) for _ in range(4))
    return f"{part()}-{part()}"


class CreateTeamRequest(BaseModel):
    name: str


class JoinTeamRequest(BaseModel):
    invite_code: str


def _is_member(db: Session, team_id: int, user_id: int) -> bool:
    return db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == user_id,
    ).first() is not None


@router.post("", status_code=201)
def create_team(
    body: CreateTeamRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not body.name or not body.name.strip():
        raise HTTPException(status_code=422, detail={"code": "MISSING_NAME", "msg": "팀 이름을 입력해주세요"})

    invite_code = generate_invite_code()
    while db.query(models.Team).filter(models.Team.invite_code == invite_code).first():
        invite_code = generate_invite_code()

    team = models.Team(name=body.name.strip(), invite_code=invite_code, owner_id=current_user.id)
    db.add(team)
    db.flush()

    db.add(models.TeamMember(team_id=team.id, user_id=current_user.id))
    db.commit()
    db.refresh(team)

    return {"team_id": team.id, "name": team.name, "invite_code": team.invite_code}


@router.get("")
def list_teams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    memberships = db.query(models.TeamMember).filter(
        models.TeamMember.user_id == current_user.id
    ).all()
    result = []
    for m in memberships:
        t = db.query(models.Team).filter(models.Team.id == m.team_id).first()
        if t:
            result.append({"team_id": t.id, "name": t.name, "invite_code": t.invite_code})
    return result


@router.post("/join")
def join_team(
    body: JoinTeamRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    team = db.query(models.Team).filter(models.Team.invite_code == body.invite_code).first()
    if not team:
        raise HTTPException(status_code=404, detail={"code": "INVALID_INVITE_CODE", "msg": "유효하지 않은 초대코드입니다"})

    if _is_member(db, team.id, current_user.id):
        raise HTTPException(status_code=409, detail={"code": "ALREADY_MEMBER", "msg": "이미 팀원입니다"})

    db.add(models.TeamMember(team_id=team.id, user_id=current_user.id))
    db.commit()

    return {"team_id": team.id, "name": team.name}


@router.get("/{team_id}/members")
def list_members(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not _is_member(db, team_id, current_user.id):
        raise HTTPException(status_code=403, detail={"code": "NOT_MEMBER", "msg": "팀 멤버가 아닙니다"})

    memberships = db.query(models.TeamMember).filter(models.TeamMember.team_id == team_id).all()
    result = []
    for m in memberships:
        u = db.query(models.User).filter(models.User.id == m.user_id).first()
        if u:
            result.append({"user_id": u.id, "email": u.email})
    return result
