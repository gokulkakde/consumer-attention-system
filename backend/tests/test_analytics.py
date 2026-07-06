import os
# Configure SQLite DB file for testing before app imports to prevent connecting to production DB
os.environ["DATABASE_URL"] = "sqlite:///./test_analytics.db"
os.environ["MONGODB_DB"] = "test_consumer_attention_mongodb"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import io

from app.main import app
from app.core.database import Base, get_db

# SQLite DB file for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_analytics.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db():
    # Setup test schema
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Seed default roles required for users mapping
    from app.models import models
    roles = [
        models.Role(id=1, name="Administrator", description="Full system access"),
        models.Role(id=2, name="Store Manager", description="Store manager"),
        models.Role(id=3, name="Retail Analyst", description="Retail analyst"),
        models.Role(id=4, name="Marketing Manager", description="Marketing manager")
    ]
    db.add_all(roles)
    db.commit()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_analytics_endpoints(client):
    # 1. Register Admin User
    response = client.post("/api/auth/register", json={
        "email": "analyst_test@attentionmap.com",
        "password": "password123",
        "full_name": "Test Analyst User",
        "role_name": "Administrator"
    })
    assert response.status_code == 201
    
    # 2. Login User
    response = client.post("/api/auth/login", data={
        "username": "analyst_test@attentionmap.com",
        "password": "password123"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create a store layout to test coordinates mapping
    response = client.post("/api/stores/", json={
        "name": "Supermart Test Store",
        "location": "Boston",
        "description": "Test store layout for analytics validation"
    }, headers=headers)
    assert response.status_code == 201
    store_id = response.json()["id"]

    # 4. Create a zone
    response = client.post("/api/zones/", json={
        "name": "Promo Zone",
        "description": "Aisle 1 front",
        "store_id": store_id
    }, headers=headers)
    assert response.status_code == 201
    zone_id = response.json()["id"]

    # 5. Create a shelf
    response = client.post("/api/shelves/", json={
        "name": "Endcap Shelf",
        "layout_details": {"x": 100, "y": 100, "w": 200, "h": 200},
        "zone_id": zone_id
    }, headers=headers)
    assert response.status_code == 201

    # 6. Test Dwell Times list
    response = client.get("/api/analytics/dwell-times", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

    # 7. Test Attractiveness Scores list
    response = client.get("/api/analytics/attractiveness", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

    # 8. Test Shopper Sessions list
    response = client.get(f"/api/analytics/sessions?store_id={store_id}", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

    # 9. Test Video Upload Validation - Rejected file type
    response = client.post(
        "/api/analytics/upload-video",
        data={"store_id": store_id},
        files={"file": ("test.txt", io.BytesIO(b"dummy text"), "text/plain")},
        headers=headers
    )
    assert response.status_code == 400
    assert "Unsupported video format" in response.json()["detail"]

    # 10. Test Video Upload Validation - Accepted file type (but dummy content)
    response = client.post(
        "/api/analytics/upload-video",
        data={"store_id": store_id},
        files={"file": ("test.mp4", io.BytesIO(b"dummy mp4 frames content"), "video/mp4")},
        headers=headers
    )
    # The cv2 VideoCapture fails to open the dummy bytes, returning a 202 with an error details body
    assert response.status_code == 202
    assert "error" in response.json()["metrics"]
