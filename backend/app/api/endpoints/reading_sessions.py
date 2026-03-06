from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud import crud
from app.schemas.schemas import ReadingSession, ReadingSessionCreate

router = APIRouter()

@router.get("/", response_model=List[ReadingSession])
def read_all_reading_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all reading sessions"""
    return crud.get_reading_sessions(db, skip=skip, limit=limit)

@router.get("/{session_id}", response_model=ReadingSession)
def read_reading_session(session_id: int, db: Session = Depends(get_db)):
    """Get a specific reading session"""
    session = crud.get_reading_session(db, session_id=session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Reading session not found")
    return session

@router.post("/", response_model=ReadingSession)
def create_reading_session(session: ReadingSessionCreate, db: Session = Depends(get_db)):
    """Create a reading session"""
    return crud.create_reading_session(db=db, session=session)

from pydantic import BaseModel
from typing import Optional

class ReadingSessionUpdate(BaseModel):
    chunks_read: Optional[int] = None
    time_spent: Optional[int] = None

@router.put("/{session_id}", response_model=ReadingSession)
def update_reading_session(session_id: int, session_update: ReadingSessionUpdate, db: Session = Depends(get_db)):
    """Update a reading session"""
    session = crud.update_reading_session(db, session_id=session_id, session_update=session_update)
    if not session:
        raise HTTPException(status_code=404, detail="Reading session not found")
    return session

@router.delete("/{session_id}")
def delete_reading_session(session_id: int, db: Session = Depends(get_db)):
    """Delete a reading session"""
    success = crud.delete_reading_session(db, session_id=session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reading session not found")
    return {"message": "Reading session deleted successfully"}
