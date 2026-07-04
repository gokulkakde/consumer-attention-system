import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Consumer Attention Mapping System API"
    API_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "9a2f7cde3281a8bfe728aef0921a9c3fb2b23a9d20c382103328e1c66708b7e2"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Database (PostgreSQL)
    DATABASE_URL: str = "postgresql://postgres:password123@localhost:5432/consumer_attention_db"
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017/"
    MONGODB_DB: str = "consumer_attention_mongodb"

    model_config = ConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
