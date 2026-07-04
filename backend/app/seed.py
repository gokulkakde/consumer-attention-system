import sys
import os
import datetime
from datetime import timezone
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, mongo_db, engine, Base
from app.core import security
from app.models import models

def seed_db():
    # 0. Ensure all tables are created first
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed Roles in PostgreSQL
        roles_data = [
            ("Administrator", "Full system access and configurations"),
            ("Store Manager", "Manage specific store layouts, shelves, cameras, and views"),
            ("Retail Analyst", "Access heatmaps, dwell times, and attractiveness scores"),
            ("Marketing Manager", "Access product performance metrics and promotion effectiveness")
        ]
        
        roles = {}
        for role_name, desc in roles_data:
            role = db.query(models.Role).filter(models.Role.name == role_name).first()
            if not role:
                role = models.Role(name=role_name, description=desc)
                db.add(role)
                db.commit()
                db.refresh(role)
            roles[role_name] = role
            
        # 2. Seed Default Admin User in PostgreSQL
        admin_email = "admin@attentionmap.com"
        admin = db.query(models.User).filter(models.User.email == admin_email).first()
        if not admin:
            hashed_pwd = security.get_password_hash("password123")
            admin_user = models.User(
                email=admin_email,
                hashed_password=hashed_pwd,
                full_name="System Administrator",
                role_id=roles["Administrator"].id,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("Successfully seeded database with default Admin: admin@attentionmap.com / password123")
        else:
            print("Admin user already exists.")

        # 3. Seed Default Store, Zone, Shelves, Products, and Cameras
        store = db.query(models.Store).filter(models.Store.name == "Supermart NYC").first()
        if not store:
            store = models.Store(
                name="Supermart NYC", 
                location="Broadway, New York", 
                description="Flagship Retail Store Location"
            )
            db.add(store)
            db.commit()
            db.refresh(store)
            print("Created default Store: Supermart NYC")

            # Create Zones
            snacks_zone = models.Zone(name="Snacks", description="Chips, cookies, and nuts aisle", store_id=store.id)
            drinks_zone = models.Zone(name="Beverages", description="Soda, juice, and energy drinks", store_id=store.id)
            db.add(snacks_zone)
            db.add(drinks_zone)
            db.commit()
            db.refresh(snacks_zone)
            db.refresh(drinks_zone)

            # Create Shelves
            shelf_a = models.Shelf(name="Shelf A (Chips)", layout_details={"rows": 3, "cols": 4}, zone_id=snacks_zone.id)
            shelf_b = models.Shelf(name="Shelf B (Soda)", layout_details={"rows": 4, "cols": 4}, zone_id=drinks_zone.id)
            db.add(shelf_a)
            db.add(shelf_b)
            db.commit()
            db.refresh(shelf_a)
            db.refresh(shelf_b)

            # Create Products
            lays = models.Product(name="Lays Potato Chips 150g", sku="SKU-LAYS-001", category="Snacks", price=Decimal("3.99"), description="Classic salted potato chips")
            coke = models.Product(name="Diet Coke 500ml", sku="SKU-COKE-002", category="Beverages", price=Decimal("1.89"), description="Zero calorie cola soda")
            db.add(lays)
            db.add(coke)
            db.commit()
            db.refresh(lays)
            db.refresh(coke)

            # Map products to shelves
            db.add(models.ShelfProduct(shelf_id=shelf_a.id, product_id=lays.id, position="Row 1, Col 1"))
            db.add(models.ShelfProduct(shelf_id=shelf_b.id, product_id=coke.id, position="Row 1, Col 2"))
            db.commit()

            # Create Camera
            camera = models.Camera(
                name="Cam-02 Snacks Overhead",
                rtsp_url="rtsp://admin:pass@192.168.1.100/stream1",
                status="active",
                camera_config={"resolution": "1080p", "fps": 25},
                store_id=store.id,
                zone_id=snacks_zone.id
            )
            db.add(camera)
            db.commit()
            print("Successfully seeded layout objects.")
        else:
            print("Store layout objects already exist.")

        # 4. Seed DwellTime aggregated metrics (Robust Check)
        dwell_count = db.query(models.DwellTime).count()
        if dwell_count == 0:
            shelf_a = db.query(models.Shelf).filter(models.Shelf.name == "Shelf A (Chips)").first()
            shelf_b = db.query(models.Shelf).filter(models.Shelf.name == "Shelf B (Soda)").first()
            if shelf_a and shelf_b:
                dwell_data = [
                    models.DwellTime(shelf_id=shelf_a.id, average_dwell_time=Decimal("18.40"), interaction_count=42, attractiveness_score=Decimal("0.65")),
                    models.DwellTime(shelf_id=shelf_b.id, average_dwell_time=Decimal("24.20"), interaction_count=68, attractiveness_score=Decimal("0.78"))
                ]
                db.add_all(dwell_data)
                db.commit()
                print("Successfully seeded relational retail layout and dwell time metrics.")
        else:
            print("Dwell time metrics already seeded.")

        # 5. Seed MongoDB Events
        events_col = mongo_db["events"]
        if events_col.count_documents({}) == 0:
            events_data = [
                {
                    "message": "Shopper #104 paused at Shelf A (Dwell: 14s)", 
                    "type": "info", 
                    "timestamp": datetime.datetime.now(timezone.utc) - datetime.timedelta(minutes=5)
                },
                {
                    "message": "Attention spike detected on product 'Diet Coke 500ml' (+15%)", 
                    "type": "success", 
                    "timestamp": datetime.datetime.now(timezone.utc) - datetime.timedelta(minutes=3)
                },
                {
                    "message": "Camera 'Aisle 3 Overhead' stream re-calibrated successfully", 
                    "type": "success", 
                    "timestamp": datetime.datetime.now(timezone.utc) - datetime.timedelta(minutes=2)
                },
                {
                    "message": "Shopper #211 entered Zone: Snacks", 
                    "type": "info", 
                    "timestamp": datetime.datetime.now(timezone.utc) - datetime.timedelta(minutes=1)
                }
            ]
            events_col.insert_many(events_data)
            print("Successfully seeded MongoDB with default events.")
        else:
            print("MongoDB events already seeded.")

    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
