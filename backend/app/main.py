from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import Base, engine
from app.api.endpoints import auth, users, stores, zones, shelves, products, cameras, events, analytics, behavior_api

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any missing database tables on startup
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_STR}/openapi.json",
    lifespan=lifespan
)

# CORS middleware configuration to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_STR}/auth", tags=["Authentication"])
app.include_router(users.router, prefix=f"{settings.API_STR}/users", tags=["User Management"])
app.include_router(stores.router, prefix=f"{settings.API_STR}/stores", tags=["Store Management"])
app.include_router(zones.router, prefix=f"{settings.API_STR}/zones", tags=["Zone Management"])
app.include_router(shelves.router, prefix=f"{settings.API_STR}/shelves", tags=["Shelf Management"])
app.include_router(products.router, prefix=f"{settings.API_STR}/products", tags=["Product Management"])
app.include_router(cameras.router, prefix=f"{settings.API_STR}/cameras", tags=["Camera Management"])
app.include_router(events.router, prefix=f"{settings.API_STR}/events", tags=["Event Logs (MongoDB)"])
app.include_router(analytics.router, prefix=f"{settings.API_STR}/analytics", tags=["Attention Analytics"])
app.include_router(behavior_api.router, prefix=f"{settings.API_STR}/behavior", tags=["Behavior Analytics"])

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0"
    }
