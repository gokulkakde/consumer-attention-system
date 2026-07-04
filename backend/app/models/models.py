from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    role = relationship("Role", back_populates="users")

class Store(Base):
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    zones = relationship("Zone", back_populates="store", cascade="all, delete-orphan")
    cameras = relationship("Camera", back_populates="store", cascade="all, delete-orphan")

class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="zones")
    shelves = relationship("Shelf", back_populates="zone", cascade="all, delete-orphan")
    cameras = relationship("Camera", back_populates="zone")

class Shelf(Base):
    __tablename__ = "shelves"
    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    layout_details = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    zone = relationship("Zone", back_populates="shelves")
    products = relationship("ShelfProduct", back_populates="shelf", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    sku = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(100))
    price = Column(Numeric(10, 2), nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    shelves = relationship("ShelfProduct", back_populates="product", cascade="all, delete-orphan")

class ShelfProduct(Base):
    __tablename__ = "shelf_products"
    shelf_id = Column(Integer, ForeignKey("shelves.id", ondelete="CASCADE"), primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    position = Column(String(100))

    shelf = relationship("Shelf", back_populates="products")
    product = relationship("Product", back_populates="shelves")

class Camera(Base):
    __tablename__ = "cameras"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="CASCADE"))
    zone_id = Column(Integer, ForeignKey("zones.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(100), nullable=False)
    rtsp_url = Column(String(255), nullable=False)
    status = Column(String(50), default="active") # active, inactive, maintenance
    camera_config = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="cameras")
    zone = relationship("Zone", back_populates="cameras")

class DwellTime(Base):
    __tablename__ = "dwell_times"
    id = Column(Integer, primary_key=True, index=True)
    shelf_id = Column(Integer, ForeignKey("shelves.id", ondelete="CASCADE"))
    average_dwell_time = Column(Numeric(10, 2), nullable=False, default=0.0)
    interaction_count = Column(Integer, nullable=False, default=0)
    attractiveness_score = Column(Numeric(5, 2), nullable=False, default=0.0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    shelf = relationship("Shelf")

