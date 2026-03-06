from fastapi import APIRouter
from app.api.endpoints import office_hours, tasks, pdf_books, reading_sessions, audiobooks

api_router = APIRouter()

api_router.include_router(office_hours.router, prefix="/office-hours", tags=["office-hours"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(pdf_books.router, prefix="/pdf-books", tags=["pdf-books"])
api_router.include_router(reading_sessions.router, prefix="/reading-sessions", tags=["reading-sessions"])
api_router.include_router(audiobooks.router, prefix="/audiobooks", tags=["audiobooks"])
