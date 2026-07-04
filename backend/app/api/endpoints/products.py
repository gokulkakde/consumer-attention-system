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

@router.get("/", response_model=List[schemas.Product], dependencies=[view_dependency])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    return products

@router.get("/{product_id}", response_model=schemas.Product, dependencies=[view_dependency])
def read_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=schemas.Product, status_code=status.HTTP_201_CREATED, dependencies=[edit_dependency])
def create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db)):
    # Check if SKU is unique
    existing = db.query(models.Product).filter(models.Product.sku == product_in.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists.")
        
    new_product = models.Product(
        name=product_in.name,
        sku=product_in.sku,
        category=product_in.category,
        price=product_in.price,
        description=product_in.description
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.put("/{product_id}", response_model=schemas.Product, dependencies=[edit_dependency])
def update_product(product_id: int, product_update: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    if product_update.sku is not None:
        # Check SKU uniqueness if changed
        if product_update.sku != product.sku:
            existing = db.query(models.Product).filter(models.Product.sku == product_update.sku).first()
            if existing:
                raise HTTPException(status_code=400, detail="Product with this SKU already exists.")
            product.sku = product_update.sku
            
    if product_update.name is not None:
        product.name = product_update.name
    if product_update.category is not None:
        product.category = product_update.category
    if product_update.price is not None:
        product.price = product_update.price
    if product_update.description is not None:
        product.description = product_update.description
        
    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[edit_dependency])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    db.delete(product)
    db.commit()
    return None
