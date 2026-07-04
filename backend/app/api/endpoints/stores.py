from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()

# Define RBAC dependency helpers
view_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager", "Retail Analyst", "Marketing Manager"]))
edit_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager"]))
delete_dependency = Depends(deps.RoleChecker(["Administrator"]))

@router.get("/", response_model=List[schemas.Store], dependencies=[view_dependency])
def read_stores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    stores = db.query(models.Store).offset(skip).limit(limit).all()
    return stores

@router.get("/{store_id}", response_model=schemas.Store, dependencies=[view_dependency])
def read_store(store_id: int, db: Session = Depends(get_db)):
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store

@router.post("/", response_model=schemas.Store, status_code=status.HTTP_201_CREATED, dependencies=[edit_dependency])
def create_store(store_in: schemas.StoreCreate, db: Session = Depends(get_db)):
    new_store = models.Store(
        name=store_in.name,
        location=store_in.location,
        description=store_in.description
    )
    db.add(new_store)
    db.commit()
    db.refresh(new_store)
    return new_store

@router.put("/{store_id}", response_model=schemas.Store, dependencies=[edit_dependency])
def update_store(store_id: int, store_update: schemas.StoreUpdate, db: Session = Depends(get_db)):
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    if store_update.name is not None:
        store.name = store_update.name
    if store_update.location is not None:
        store.location = store_update.location
    if store_update.description is not None:
        store.description = store_update.description
        
    db.commit()
    db.refresh(store)
    return store

@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[delete_dependency])
def delete_store(store_id: int, db: Session = Depends(get_db)):
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    db.delete(store)
    db.commit()
    return None
