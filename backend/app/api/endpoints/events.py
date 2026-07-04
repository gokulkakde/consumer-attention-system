from fastapi import APIRouter, Depends, status
from typing import List
from datetime import datetime, timezone

from app.api import deps
from app.core.database import mongo_db
from app.schemas import schemas
from app.models import models

router = APIRouter()

# Allow all authenticated roles to view events log
view_dependency = Depends(deps.get_current_active_user)
# Allow Admin and Store Managers to write event logs
edit_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager"]))

@router.get("/", response_model=List[schemas.Event])
def read_events(limit: int = 50, current_user: models.User = view_dependency):
    events_col = mongo_db["events"]
    # Get last N events sorted by timestamp desc
    cursor = events_col.find().sort("timestamp", -1).limit(limit)
    
    result = []
    for doc in cursor:
        result.append(schemas.Event(
            id=str(doc["_id"]),
            message=doc["message"],
            type=doc.get("type", "info"),
            timestamp=doc["timestamp"]
        ))
    return result

@router.post("/", response_model=schemas.Event, status_code=status.HTTP_201_CREATED)
def create_event(event_in: schemas.EventCreate, current_user: models.User = edit_dependency):
    events_col = mongo_db["events"]
    
    event_doc = {
        "message": event_in.message,
        "type": event_in.type,
        "timestamp": datetime.now(timezone.utc)
    }
    
    insert_result = events_col.insert_one(event_doc)
    
    return schemas.Event(
        id=str(insert_result.inserted_id),
        message=event_doc["message"],
        type=event_doc["type"],
        timestamp=event_doc["timestamp"]
    )
