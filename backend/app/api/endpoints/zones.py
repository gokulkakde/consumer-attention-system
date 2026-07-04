from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()

# RBAC helpers
view_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager", "Retail Analyst", "Marketing Manager"]))
edit_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager"]))

@router.get("/store/{store_id}", response_model=List[schemas.Zone], dependencies=[view_dependency])
def read_zones_by_store(store_id: int, db: Session = Depends(get_db)):
    # Check if store exists
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    zones = db.query(models.Zone).filter(models.Zone.store_id == store_id).all()
    return zones

@router.post("/", response_model=schemas.Zone, status_code=status.HTTP_201_CREATED, dependencies=[edit_dependency])
def create_zone(zone_in: schemas.ZoneCreate, db: Session = Depends(get_db)):
    # Verify store exists
    store = db.query(models.Store).filter(models.Store.id == zone_in.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    new_zone = models.Zone(
        name=zone_in.name,
        description=zone_in.description,
        store_id=zone_in.store_id
    )
    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)
    return new_zone

@router.put("/{zone_id}", response_model=schemas.Zone, dependencies=[edit_dependency])
def update_zone(zone_id: int, zone_update: schemas.ZoneUpdate, db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    if zone_update.name is not None:
        zone.name = zone_update.name
    if zone_update.description is not None:
        zone.description = zone_update.description
        
    db.commit()
    db.refresh(zone)
    return zone

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[edit_dependency])
def delete_zone(zone_id: int, db: Session = Depends(get_db)):
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    db.delete(zone)
    db.commit()
    return None
