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

@router.get("/store/{store_id}", response_model=List[schemas.Camera], dependencies=[view_dependency])
def read_cameras_by_store(store_id: int, db: Session = Depends(get_db)):
    # Verify store exists
    store = db.query(models.Store).filter(models.Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    cameras = db.query(models.Camera).filter(models.Camera.store_id == store_id).all()
    return cameras

@router.post("/", response_model=schemas.Camera, status_code=status.HTTP_201_CREATED, dependencies=[edit_dependency])
def register_camera(camera_in: schemas.CameraCreate, db: Session = Depends(get_db)):
    # Verify store exists
    store = db.query(models.Store).filter(models.Store.id == camera_in.store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    # Verify zone if provided
    if camera_in.zone_id is not None:
        zone = db.query(models.Zone).filter(models.Zone.id == camera_in.zone_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        if zone.store_id != camera_in.store_id:
            raise HTTPException(status_code=400, detail="The assigned zone must belong to the same store.")

    new_camera = models.Camera(
        name=camera_in.name,
        rtsp_url=camera_in.rtsp_url,
        status=camera_in.status,
        camera_config=camera_in.camera_config,
        store_id=camera_in.store_id,
        zone_id=camera_in.zone_id
    )
    db.add(new_camera)
    db.commit()
    db.refresh(new_camera)
    return new_camera

@router.put("/{camera_id}", response_model=schemas.Camera, dependencies=[edit_dependency])
def update_camera(camera_id: int, camera_update: schemas.CameraUpdate, db: Session = Depends(get_db)):
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    # Verify zone if updated
    if camera_update.zone_id is not None:
        zone = db.query(models.Zone).filter(models.Zone.id == camera_update.zone_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        if zone.store_id != camera.store_id:
            raise HTTPException(status_code=400, detail="The assigned zone must belong to the same store.")
        camera.zone_id = camera_update.zone_id
    elif camera_update.zone_id == 0:  # Allow unassigning zone by passing 0 or null depending on convention
        camera.zone_id = None
        
    if camera_update.name is not None:
        camera.name = camera_update.name
    if camera_update.rtsp_url is not None:
        camera.rtsp_url = camera_update.rtsp_url
    if camera_update.status is not None:
        camera.status = camera_update.status
    if camera_update.camera_config is not None:
        camera.camera_config = camera_update.camera_config
        
    db.commit()
    db.refresh(camera)
    return camera

@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[edit_dependency])
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    db.delete(camera)
    db.commit()
    return None
