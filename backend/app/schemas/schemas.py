from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# --- Role Schemas ---
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class Role(RoleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str
    role_name: Optional[str] = "Retail Analyst"  # Default role for new signups

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    role_id: int
    role: Optional[Role] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Store Schemas ---
class StoreBase(BaseModel):
    name: str
    location: str
    description: Optional[str] = None

class StoreCreate(StoreBase):
    pass

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None

class Store(StoreBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Zone Schemas ---
class ZoneBase(BaseModel):
    name: str
    description: Optional[str] = None
    store_id: int

class ZoneCreate(ZoneBase):
    pass

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Zone(ZoneBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    sku: str
    category: Optional[str] = None
    price: Decimal
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    price: Optional[Decimal] = None
    description: Optional[str] = None

class Product(ProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Shelf Product Placement Schemas ---
class ShelfProductBase(BaseModel):
    product_id: int
    position: Optional[str] = None

class ShelfProductCreate(ShelfProductBase):
    pass

class ShelfProduct(ShelfProductBase):
    shelf_id: int
    product: Optional[Product] = None

    class Config:
        from_attributes = True

# --- Shelf Schemas ---
class ShelfBase(BaseModel):
    name: str
    layout_details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    zone_id: int

class ShelfCreate(ShelfBase):
    pass

class ShelfUpdate(BaseModel):
    name: Optional[str] = None
    layout_details: Optional[Dict[str, Any]] = None

class Shelf(ShelfBase):
    id: int
    created_at: datetime
    products: List[ShelfProduct] = []

    class Config:
        from_attributes = True

# --- Camera Schemas ---
class CameraBase(BaseModel):
    name: str
    rtsp_url: str
    status: Optional[str] = "active"  # active, inactive, maintenance
    camera_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    store_id: int
    zone_id: Optional[int] = None

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    rtsp_url: Optional[str] = None
    status: Optional[str] = None
    camera_config: Optional[Dict[str, Any]] = None
    zone_id: Optional[int] = None

class Camera(CameraBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- MongoDB Event Schemas ---
class EventBase(BaseModel):
    message: str
    type: str = "info"  # info, success, warning

class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: str
    timestamp: datetime

