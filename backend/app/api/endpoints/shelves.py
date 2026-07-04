from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.api import deps
from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()

# RBAC helpers
view_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager", "Retail Analyst", "Marketing Manager"]))
edit_dependency = Depends(deps.RoleChecker(["Administrator", "Store Manager"]))

@router.get("/zone/{zone_id}", response_model=List[schemas.Shelf], dependencies=[view_dependency])
def read_shelves_by_zone(zone_id: int, db: Session = Depends(get_db)):
    # Verify zone exists
    zone = db.query(models.Zone).filter(models.Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    # We use joinedload to eagerly load the products on shelves
    shelves = (
        db.query(models.Shelf)
        .filter(models.Shelf.zone_id == zone_id)
        .options(joinedload(models.Shelf.products).joinedload(models.ShelfProduct.product))
        .all()
    )
    return shelves

@router.post("/", response_model=schemas.Shelf, status_code=status.HTTP_201_CREATED, dependencies=[edit_dependency])
def create_shelf(shelf_in: schemas.ShelfCreate, db: Session = Depends(get_db)):
    # Verify zone exists
    zone = db.query(models.Zone).filter(models.Zone.id == shelf_in.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    new_shelf = models.Shelf(
        name=shelf_in.name,
        layout_details=shelf_in.layout_details,
        zone_id=shelf_in.zone_id
    )
    db.add(new_shelf)
    db.commit()
    db.refresh(new_shelf)
    return new_shelf

@router.put("/{shelf_id}", response_model=schemas.Shelf, dependencies=[edit_dependency])
def update_shelf(shelf_id: int, shelf_update: schemas.ShelfUpdate, db: Session = Depends(get_db)):
    shelf = db.query(models.Shelf).filter(models.Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")
        
    if shelf_update.name is not None:
        shelf.name = shelf_update.name
    if shelf_update.layout_details is not None:
        shelf.layout_details = shelf_update.layout_details
        
    db.commit()
    db.refresh(shelf)
    return shelf

@router.delete("/{shelf_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[edit_dependency])
def delete_shelf(shelf_id: int, db: Session = Depends(get_db)):
    shelf = db.query(models.Shelf).filter(models.Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")
        
    db.delete(shelf)
    db.commit()
    return None

# --- Product assignment on shelf ---

@router.post("/{shelf_id}/products", response_model=schemas.ShelfProduct, status_code=status.HTTP_201_CREATED, dependencies=[edit_dependency])
def assign_product_to_shelf(
    shelf_id: int, placement_in: schemas.ShelfProductCreate, db: Session = Depends(get_db)
):
    # Verify shelf exists
    shelf = db.query(models.Shelf).filter(models.Shelf.id == shelf_id).first()
    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf not found")
        
    # Verify product exists
    product = db.query(models.Product).filter(models.Product.id == placement_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Check if placement already exists
    existing = db.query(models.ShelfProduct).filter(
        models.ShelfProduct.shelf_id == shelf_id,
        models.ShelfProduct.product_id == placement_in.product_id
    ).first()
    
    if existing:
        # Update position
        existing.position = placement_in.position
        db.commit()
        db.refresh(existing)
        return existing
        
    # Create new mapping
    new_placement = models.ShelfProduct(
        shelf_id=shelf_id,
        product_id=placement_in.product_id,
        position=placement_in.position
    )
    db.add(new_placement)
    db.commit()
    db.refresh(new_placement)
    return new_placement

@router.delete("/{shelf_id}/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[edit_dependency])
def remove_product_from_shelf(shelf_id: int, product_id: int, db: Session = Depends(get_db)):
    placement = db.query(models.ShelfProduct).filter(
        models.ShelfProduct.shelf_id == shelf_id,
        models.ShelfProduct.product_id == product_id
    ).first()
    
    if not placement:
        raise HTTPException(status_code=404, detail="Product is not assigned to this shelf.")
        
    db.delete(placement)
    db.commit()
    return None
