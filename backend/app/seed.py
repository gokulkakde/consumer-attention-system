import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.core import security
from app.models import models

def seed_db():
    db = SessionLocal()
    try:
        # 1. Seed Roles
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
            
        # 2. Seed Default Admin User
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
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
