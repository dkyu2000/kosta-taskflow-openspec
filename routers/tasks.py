from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import get_current_user

router = APIRouter(tags=["tasks"])

VALID_STATUSES = {"TODO", "DOING", "DONE"}


def _require_member(db: Session, team_id: int, user_id: int):
    if not db.query(models.TeamMember).filter(
        models.TeamMember.team_id == team_id,
        models.TeamMember.user_id == user_id,
    ).first():
        raise HTTPException(status_code=403, detail={"code": "NOT_MEMBER", "msg": "팀 멤버가 아닙니다"})


def _task_to_dict(task: models.Task) -> dict:
    return {
        "task_id": task.id,
        "title": task.title,
        "status": task.status,
        "creator_id": task.creator_id,
        "assignee_id": task.assignee_id,
        "created_at": task.created_at.isoformat() + "Z" if task.created_at else None,
    }


@router.post("/api/teams/{team_id}/tasks", status_code=201)
def create_task(
    team_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_member(db, team_id, current_user.id)
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=422, detail={"code": "MISSING_TITLE", "msg": "태스크 제목을 입력해주세요"})

    assignee_id = body.get("assignee_id")
    task = models.Task(
        team_id=team_id,
        title=title,
        status="TODO",
        creator_id=current_user.id,
        assignee_id=assignee_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_dict(task)


@router.get("/api/teams/{team_id}/tasks")
def list_tasks(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_member(db, team_id, current_user.id)
    tasks = db.query(models.Task).filter(models.Task.team_id == team_id).all()
    return [_task_to_dict(t) for t in tasks]


@router.get("/api/tasks/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail={"code": "TASK_NOT_FOUND", "msg": "태스크를 찾을 수 없습니다"})
    _require_member(db, task.team_id, current_user.id)
    return _task_to_dict(task)


@router.put("/api/tasks/{task_id}")
def update_task(
    task_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail={"code": "TASK_NOT_FOUND", "msg": "태스크를 찾을 수 없습니다"})
    _require_member(db, task.team_id, current_user.id)

    if "status" in body:
        if body["status"] not in VALID_STATUSES:
            raise HTTPException(
                status_code=422,
                detail={"code": "INVALID_STATUS", "msg": "status는 TODO, DOING, DONE 중 하나여야 합니다"},
            )
        task.status = body["status"]

    if "title" in body:
        title = body["title"].strip()
        if not title:
            raise HTTPException(status_code=422, detail={"code": "MISSING_TITLE", "msg": "태스크 제목을 입력해주세요"})
        task.title = title

    if "assignee_id" in body:
        task.assignee_id = body["assignee_id"]

    db.commit()
    db.refresh(task)
    return _task_to_dict(task)


@router.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail={"code": "TASK_NOT_FOUND", "msg": "태스크를 찾을 수 없습니다"})
    _require_member(db, task.team_id, current_user.id)
    db.delete(task)
    db.commit()
    return {"msg": "삭제되었습니다"}
