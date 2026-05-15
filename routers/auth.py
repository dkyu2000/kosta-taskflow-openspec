from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db
import models
from auth_utils import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup", status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if len(body.password) < 8:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_PASSWORD", "msg": "비밀번호는 8자 이상이어야 합니다"},
        )
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(
            status_code=409,
            detail={"code": "EMAIL_EXISTS", "msg": "이미 사용 중인 이메일입니다"},
        )
    user = models.User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "user_id": user.id}


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "msg": "이메일 또는 비밀번호가 올바르지 않습니다"},
        )
    return {"token": create_token(user.id), "user_id": user.id}


@router.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return {"user_id": current_user.id, "email": current_user.email}


@router.post("/logout")
def logout():
    return {"msg": "로그아웃되었습니다"}
