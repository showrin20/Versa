from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./versatile.db"
    
    # API
    api_v1_str: str = "/api/v1"
    project_name: str = "Versatile"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    
    # Upload settings
    upload_max_size: int = 50 * 1024 * 1024  # 50MB
    upload_folder: str = "uploads"
    
    class Config:
        env_file = ".env"

settings = Settings()
