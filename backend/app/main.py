from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router
from app.core.config import settings
from app.core.database import engine, Base
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Ensure required directories exist
Path("./data/audiobooks").mkdir(parents=True, exist_ok=True)
Path("./uploads").mkdir(parents=True, exist_ok=True)

# Create tables (no-op for already-existing tables)
Base.metadata.create_all(bind=engine)

# Add any new columns that didn't exist when the container was first started.
# Uses IF NOT EXISTS so it's safe to run on every boot.
_YOUTUBE_COLUMNS = [
    ("youtube_upload_state", "VARCHAR"),
    ("youtube_video_ids", "TEXT"),
    ("youtube_playlist_url", "VARCHAR"),
    ("youtube_upload_job_id", "VARCHAR"),
    ("youtube_current_part", "INTEGER"),
    ("youtube_total_parts", "INTEGER"),
]
from sqlalchemy import text as _text
with engine.connect() as _conn:
    for _col, _type in _YOUTUBE_COLUMNS:
        try:
            _conn.execute(_text(
                f"ALTER TABLE pdf_books ADD COLUMN IF NOT EXISTS {_col} {_type}"
            ))
            _conn.commit()
        except Exception:
            _conn.rollback()

app = FastAPI(
    title="Versatile API",
    description="Backend API for Versatile productivity platform",
    version="1.0.0"
)

# Build CORS allowed origins
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
if settings.frontend_url:
    allowed_origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# Serve generated files (pdfs, audiobooks) from /data only if directory exists
data_dir = Path("./data")
if data_dir.exists():
    app.mount("/data", StaticFiles(directory="./data"), name="data")


@app.get("/")
async def root():
    return {"message": "Welcome to Versatile API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
