from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.crud import crud
from app.schemas.schemas import (
    OfficeHoursEntry, OfficeHoursEntryCreate, OfficeHoursEntryUpdate
)

router = APIRouter()

@router.get("/", response_model=List[OfficeHoursEntry])
def read_office_hours_entries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all office hours entries"""
    entries = crud.get_office_hours_entries(db, skip=skip, limit=limit)
    return entries

@router.get("/{entry_id}", response_model=OfficeHoursEntry)
def read_office_hours_entry(entry_id: int, db: Session = Depends(get_db)):
    """Get a specific office hours entry"""
    entry = crud.get_office_hours_entry(db, entry_id=entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Office hours entry not found")
    return entry

@router.get("/date/{date}", response_model=OfficeHoursEntry)
def read_office_hours_entry_by_date(date: str, db: Session = Depends(get_db)):
    """Get office hours entry by date"""
    entry = crud.get_office_hours_entry_by_date(db, date=date)
    if entry is None:
        raise HTTPException(status_code=404, detail="Office hours entry not found for this date")
    return entry

@router.post("/", response_model=OfficeHoursEntry)
def create_office_hours_entry(entry: OfficeHoursEntryCreate, db: Session = Depends(get_db)):
    """Create a new office hours entry"""
    # Check if entry for this date already exists
    existing_entry = crud.get_office_hours_entry_by_date(db, date=entry.date)
    if existing_entry:
        raise HTTPException(status_code=400, detail="Office hours entry for this date already exists")
    
    return crud.create_office_hours_entry(db=db, entry=entry)

@router.put("/{entry_id}", response_model=OfficeHoursEntry)
def update_office_hours_entry(
    entry_id: int, 
    entry_update: OfficeHoursEntryUpdate, 
    db: Session = Depends(get_db)
):
    """Update an office hours entry"""
    entry = crud.update_office_hours_entry(db, entry_id=entry_id, entry_update=entry_update)
    if entry is None:
        raise HTTPException(status_code=404, detail="Office hours entry not found")
    return entry

@router.delete("/{entry_id}")
def delete_office_hours_entry(entry_id: int, db: Session = Depends(get_db)):
    """Delete an office hours entry"""
    success = crud.delete_office_hours_entry(db, entry_id=entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="Office hours entry not found")
    return {"message": "Office hours entry deleted successfully"}
