import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db

# Use local SQLite database file for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

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
    # Override get_db dependency to point to SQLite test database
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_auth_flow(client):
    # 1. Register Admin User
    response = client.post("/api/auth/register", json={
        "email": "testadmin@test.com",
        "password": "password123",
        "full_name": "Test Admin",
        "role_name": "Administrator"
    })
    assert response.status_code == 201
    assert response.json()["email"] == "testadmin@test.com"
    
    # 2. Login User
    response = client.post("/api/auth/login", data={
        "username": "testadmin@test.com",
        "password": "password123"
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token is not None

    # 3. Retrieve User Details (me)
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "testadmin@test.com"
    assert response.json()["role"]["name"] == "Administrator"

def test_store_crud(client):
    # Login to acquire active JWT token
    response = client.post("/api/auth/login", data={
        "username": "testadmin@test.com",
        "password": "password123"
    })
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a store
    response = client.post("/api/stores/", json={
        "name": "Test Store",
        "location": "Dallas",
        "description": "Test store layout description"
    }, headers=headers)
    assert response.status_code == 201
    store_id = response.json()["id"]

    # 2. Read store details
    response = client.get(f"/api/stores/{store_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Test Store"

    # 3. Update store name
    response = client.put(f"/api/stores/{store_id}", json={
        "name": "Updated Test Store"
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Test Store"

    # 4. Delete store
    response = client.delete(f"/api/stores/{store_id}", headers=headers)
    assert response.status_code == 204
