from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List
import shutil
import tempfile
import os
from bson import ObjectId

from app.api import deps
from app.core.database import get_db, mongo_db
from app.schemas import schemas
from app.models import models
from app.services.tracking import ShopperTracker
from app.services.dataset_loader import DatasetLoader

router = APIRouter()

# Restrict viewing analytics to analysts, managers, and admins
view_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager", "Retail Analyst", "Marketing Manager"]))
# Restrict uploading videos to admins and managers
edit_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager"]))

@router.get("/dwell-times", response_model=List[schemas.DwellTime])
def read_dwell_times(db: Session = Depends(get_db), current_user: models.User = view_dependency):
    dwells = db.query(models.DwellTime).all()
    return dwells

@router.get("/attractiveness")
def read_attractiveness_scores(db: Session = Depends(get_db), current_user: models.User = view_dependency):
    dwells = db.query(models.DwellTime).all()
    result = []
    for d in dwells:
        shelf = db.query(models.Shelf).filter(models.Shelf.id == d.shelf_id).first()
        result.append({
            "shelf_id": d.shelf_id,
            "shelf_name": shelf.name if shelf else f"Shelf #{d.shelf_id}",
            "interaction_count": d.interaction_count,
            "average_dwell_time": float(d.average_dwell_time),
            "attractiveness_score": float(d.attractiveness_score)
        })
    return result

@router.get("/sessions")
def read_shopper_sessions(store_id: int, limit: int = 20, current_user: models.User = view_dependency):
    sessions_col = mongo_db["sessions"]
    cursor = sessions_col.find({"store_id": store_id}).sort("entry_time", -1).limit(limit)
    
    result = []
    for doc in cursor:
        result.append({
            "id": str(doc["_id"]),
            "shopper_id": doc["shopper_id"],
            "store_id": doc["store_id"],
            "entry_time": doc["entry_time"],
            "exit_time": doc["exit_time"],
            "dwell_time_seconds": doc["dwell_time_seconds"],
            "path_points": doc.get("path_points", []),
            "gaze_interactions": doc.get("gaze_interactions", [])
        })
    return result

@router.post("/upload-video", status_code=status.HTTP_202_ACCEPTED)
def upload_store_video(
    store_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = edit_dependency
):
    if not file.filename.endswith((".mp4", ".avi", ".mov", ".mkv")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported video format. Please upload MP4, AVI, MOV, or MKV."
        )

    # Create temporary directory inside the workspace (avoiding system tmp directory restrictions)
    temp_dir = os.path.join(os.getcwd(), "temp_uploads")
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    temp_path = os.path.join(temp_dir, f"upload_{ObjectId()}_{file.filename}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        tracker = ShopperTracker(db, store_id)
        result = tracker.process_video(temp_path)
        
        return {
            "message": "Video uploaded and analyzed successfully.",
            "file_name": file.filename,
            "metrics": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during video analysis: {str(e)}"
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/datasets/coco")
def get_coco_sample(current_user: models.User = view_dependency):
    return DatasetLoader.load_coco_sample()

@router.get("/datasets/sku110k")
def get_sku110k_sample(current_user: models.User = view_dependency):
    return DatasetLoader.load_sku110k_sample()

@router.get("/datasets/traffic")
def get_traffic_sample(current_user: models.User = view_dependency):
    return DatasetLoader.load_retail_traffic_sample()

@router.get("/datasets/checkout")
def get_checkout_sample(current_user: models.User = view_dependency):
    return DatasetLoader.load_retail_checkout_sample()
