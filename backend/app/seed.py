import sys
import os
import datetime
from datetime import timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, mongo_db
from app.core import security
from app.models import models

def seed_db():
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

        # 3. Seed MongoDB Events
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
