from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router
from app.core.config import settings
from app.core.database import engine, Base
from fastapi.staticfiles import StaticFiles

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Versatile API",
    description="Backend API for Versatile productivity platform",
    version="1.0.0"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "http://127.0.0.1:5173", 
        "http://localhost:5174", 
        "http://127.0.0.1:5174"
    ],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# Serve generated files (pdfs, audiobooks) from /data
app.mount("/data", StaticFiles(directory="./data"), name="data")

@app.get("/")
async def root():
    return {"message": "Welcome to Versatile API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
