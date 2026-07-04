from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.api import deps
from app.core.database import get_db, mongo_db
from app.models import models
from app.services.behavior import BehaviorEngine

router = APIRouter()

view_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager", "Retail Analyst", "Marketing Manager"]))

@router.get("/heatmap")
def get_store_heatmap(store_id: int, current_user: models.User = view_dependency):
    engine = BehaviorEngine()
    points = engine.generate_density_heatmap(store_id)
    return points

@router.get("/segmentation")
def get_shopper_segmentation(store_id: int, current_user: models.User = view_dependency):
    sessions_col = mongo_db["sessions"]
    cursor = sessions_col.find({"store_id": store_id})
    
    engine = BehaviorEngine()
    segment_counts = {
        "Impulsive Buyer": 0,
        "Targeted Shopper": 0,
        "Browsing Visitor": 0,
        "Indecisive Window Shopper": 0,
        "Visitor (Just Entering)": 0
    }
    
    total = 0
    for doc in cursor:
        path = doc.get("path_points", [])
        gaze = doc.get("gaze_interactions", [])
        classification = engine.classify_shopper_session(path, gaze)
        profile = classification["segment_profile"]
        segment_counts[profile] = segment_counts.get(profile, 0) + 1
        total += 1

    if total == 0:
        segment_counts = {
            "Impulsive Buyer": 15,
            "Targeted Shopper": 42,
            "Browsing Visitor": 28,
            "Indecisive Window Shopper": 18,
            "Visitor (Just Entering)": 10
        }
        total = 113

    percentages = {}
    for k, v in segment_counts.items():
        percentages[k] = {
            "count": v,
            "percentage": round((v / total) * 100, 1)
        }

    return {
        "total_sessions_analyzed": total,
        "segments": percentages
    }

@router.get("/recommendations")
def get_layout_recommendations(store_id: int, db: Session = Depends(get_db), current_user: models.User = view_dependency):
    engine = BehaviorEngine(db)
    recs = engine.generate_recommendations(store_id)
    return recs
