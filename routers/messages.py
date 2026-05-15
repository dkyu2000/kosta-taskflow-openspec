from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter(tags=["messages"])


def _require_member(db: Session, team_id: int, user_id: int):
    if not db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == user_id,
    ).first():
        raise HTTPException(status_code=403, detail={"code": "NOT_MEMBER", "msg": "팀 멤버가 아닙니다"})


def _msg_to_dict(msg: models.Message) -> dict:
    return {
        "message_id": msg.id,
        "user_id": msg.user_id,
        "email": msg.user.email if msg.user else "",
        "content": msg.content,
        "created_at": msg.created_at.isoformat() + "Z",
    }


@router.post("/api/teams/{team_id}/messages", status_code=201)
def send_message(
    team_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_member(db, team_id, current_user.id)
    content = body.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=422, detail={"code": "EMPTY_MESSAGE", "msg": "메시지를 입력해주세요"})
    if len(content) > 1000:
        raise HTTPException(status_code=422, detail={"code": "MESSAGE_TOO_LONG", "msg": "메시지는 1000자 이내여야 합니다"})

    msg = models.Message(team_id=team_id, user_id=current_user.id, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    db.refresh(msg, attribute_names=["user"])
    return _msg_to_dict(msg)


@router.get("/api/teams/{team_id}/messages")
def list_messages(
    team_id: int,
    since: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_member(db, team_id, current_user.id)
    query = db.query(models.Message).filter(models.Message.team_id == team_id)

    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00")).replace(tzinfo=None)
            query = query.filter(models.Message.created_at > since_dt)
        except ValueError:
            pass

    messages = query.order_by(models.Message.created_at.asc()).all()
    return [_msg_to_dict(m) for m in messages]


@router.get("/api/messages/{message_id}")
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    msg = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail={"code": "MESSAGE_NOT_FOUND", "msg": "메시지를 찾을 수 없습니다"})
    _require_member(db, msg.team_id, current_user.id)
    return _msg_to_dict(msg)


@router.delete("/api/messages/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    msg = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail={"code": "MESSAGE_NOT_FOUND", "msg": "메시지를 찾을 수 없습니다"})
    _require_member(db, msg.team_id, current_user.id)
    db.delete(msg)
    db.commit()
    return {"msg": "삭제되었습니다"}
