from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
from pathlib import Path
from app.core.database import get_db
from app.crud import crud
from app.schemas.schemas import PDFBook, PDFBookCreate, PDFBookUpdate, ReadingSession, ReadingSessionCreate
from app.core.config import settings

router = APIRouter()

@router.get("/", response_model=List[PDFBook])
def read_pdf_books(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all PDF books"""
    books = crud.get_pdf_books(db, skip=skip, limit=limit)
    return books

@router.get("/{book_id}", response_model=PDFBook)
def read_pdf_book(book_id: int, db: Session = Depends(get_db)):
    """Get a specific PDF book"""
    book = crud.get_pdf_book(db, book_id=book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="PDF book not found")
    return book

from fastapi.responses import FileResponse

@router.get("/{book_id}/download")
def download_pdf_book(book_id: int, db: Session = Depends(get_db)):
    """Download a specific PDF book"""
    book = crud.get_pdf_book(db, book_id=book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="PDF book not found")
    if not os.path.exists(book.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server")
    
    return FileResponse(
        path=book.file_path,
        media_type="application/pdf",
        filename=os.path.basename(book.original_filename) if hasattr(book, 'original_filename') else "book.pdf"
    )

@router.post("/upload", response_model=PDFBook)
async def upload_pdf_book(
    file: UploadFile = File(...),
    name: str = None,
    db: Session = Depends(get_db)
):
    """Upload a new PDF book"""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Create upload directory if it doesn't exist
    upload_dir = Path(settings.upload_folder)
    upload_dir.mkdir(exist_ok=True)
    
    # Save file
    file_path = upload_dir / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create book record
    book_name = name or file.filename.replace(".pdf", "")
    book_create = PDFBookCreate(name=book_name)
    
    return crud.create_pdf_book(
        db=db, 
        book=book_create, 
        file_path=str(file_path),
        original_filename=file.filename
    )

@router.put("/{book_id}", response_model=PDFBook)
def update_pdf_book(book_id: int, book_update: PDFBookUpdate, db: Session = Depends(get_db)):
    """Update a PDF book's reading progress"""
    book = crud.update_pdf_book(db, book_id=book_id, book_update=book_update)
    if book is None:
        raise HTTPException(status_code=404, detail="PDF book not found")
    return book

@router.delete("/{book_id}")
def delete_pdf_book(book_id: int, db: Session = Depends(get_db)):
    """Delete a PDF book"""
    # Get book to find file path
    book = crud.get_pdf_book(db, book_id=book_id)
    if book:
        # Delete file if it exists
        if os.path.exists(book.file_path):
            os.remove(book.file_path)
    
    success = crud.delete_pdf_book(db, book_id=book_id)
    if not success:
        raise HTTPException(status_code=404, detail="PDF book not found")
    return {"message": "PDF book deleted successfully"}

@router.post("/{book_id}/sessions", response_model=ReadingSession)
def create_reading_session(
    book_id: int, 
    session: ReadingSessionCreate, 
    db: Session = Depends(get_db)
):
    """Create a new reading session"""
    # Verify book exists
    book = crud.get_pdf_book(db, book_id=book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="PDF book not found")
    
    return crud.create_reading_session(db=db, session=session)

@router.get("/{book_id}/sessions", response_model=List[ReadingSession])
def read_reading_sessions(book_id: int, db: Session = Depends(get_db)):
    """Get reading sessions for a book"""
    sessions = crud.get_reading_sessions_by_book(db, book_id=book_id)
    return sessions
