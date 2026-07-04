from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()

# Protect all routes under this router for Administrator role only
admin_dependency = Depends(deps.RoleChecker(["Administrator"]))

@router.get("/", response_model=List[schemas.User], dependencies=[admin_dependency])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.put("/{user_id}/role", response_model=schemas.User, dependencies=[admin_dependency])
def update_user_role(user_id: int, role_update: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if role_update.role_id is not None:
        role = db.query(models.Role).filter(models.Role.id == role_update.role_id).first()
        if not role:
            raise HTTPException(status_code=400, detail="Invalid Role ID")
        user.role_id = role_update.role_id
        
    if role_update.is_active is not None:
        user.is_active = role_update.is_active

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[admin_dependency])
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(deps.get_current_active_user)):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself.")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return None
