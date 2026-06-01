from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv

load_dotenv(override=True)


class Settings(BaseSettings):
    # Database (PostgreSQL)
    database_url: str = "postgresql://versa:versa@localhost:5432/versa"

    # MinIO Object Storage
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_secure: bool = False
    minio_public_url: Optional[str] = None  # browser-accessible URL, e.g. http://localhost:9000
    minio_bucket_pdf: str = "pdfs"
    minio_bucket_audiobooks: str = "audiobooks"

    # API
    api_v1_str: str = "/api/v1"
    project_name: str = "Versatile"

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 30

    # Upload settings
    upload_max_size: int = 50 * 1024 * 1024  # 50MB
    upload_folder: str = "uploads"

    # Redis (Celery broker/backend)
    redis_url: str = "redis://localhost:6379/0"

    # YouTube OAuth2 (optional — upload is skipped when these are absent)
    youtube_client_id: str = ""
    youtube_client_secret: str = ""
    youtube_refresh_token: str = ""
    youtube_privacy: str = "unlisted"

    # Frontend URL for CORS
    frontend_url: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()
