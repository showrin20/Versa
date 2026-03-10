from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

# Force reload of environment variables
load_dotenv(override=True)

class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./versatile.db"
    direct_url: Optional[str] = None  # Direct connection for migrations
    
    # Supabase Storage
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None                  # anon public key
    supabase_service_key: Optional[str] = None          # service_role key (for server-side uploads)
    supabase_storage_url: Optional[str] = None
    
    # API
    api_v1_str: str = "/api/v1"
    project_name: str = "Versatile"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30
    
    # Upload settings
    upload_max_size: int = 50 * 1024 * 1024  # 50MB
    upload_folder: str = "uploads"

    # Frontend URL for CORS (set to your Vercel deployment URL in production)
    frontend_url: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
