from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from typing import List
import os
from pathlib import Path
from app.core.database import get_db
from app.crud import crud
from app.schemas.schemas import PDFBook, PDFBookCreate, PDFBookUpdate, ReadingSession, ReadingSessionCreate
from app.core.config import settings
from app.core.storage import get_storage, _extract_object_key

router = APIRouter()


@router.get("/", response_model=List[PDFBook])
def read_pdf_books(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_pdf_books(db, skip=skip, limit=limit)


@router.get("/{book_id}", response_model=PDFBook)
def read_pdf_book(book_id: int, db: Session = Depends(get_db)):
    book = crud.get_pdf_book(db, book_id=book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="PDF book not found")
    return book


@router.get("/{book_id}/download")
def download_pdf_book(book_id: int, db: Session = Depends(get_db)):
    book = crud.get_pdf_book(db, book_id=book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="PDF book not found")

    if book.file_path.startswith("http"):
        return RedirectResponse(url=book.file_path)

    if not os.path.exists(book.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server")

    return FileResponse(
        path=book.file_path,
        media_type="application/pdf",
        filename=book.original_filename,
    )


@router.post("/upload", response_model=PDFBook)
async def upload_pdf_book(
    file: UploadFile = File(...),
    name: str = None,
    db: Session = Depends(get_db),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")

    file_bytes = await file.read()

    storage = get_storage()
    if storage:
        try:
            destination_path = f"uploads/{file.filename}"
            file_path = storage.upload_pdf_bytes(file_bytes, destination_path)
        except Exception as e:
            print(f"MinIO upload failed, falling back to local storage: {e}")
            file_path = _save_locally(file_bytes, file.filename)
    else:
        file_path = _save_locally(file_bytes, file.filename)

    book_name = name or file.filename.replace(".pdf", "")
    return crud.create_pdf_book(
        db=db,
        book=PDFBookCreate(name=book_name),
        file_path=file_path,
        original_filename=file.filename,
    )


def _save_locally(file_bytes: bytes, filename: str) -> str:
    upload_dir = Path(settings.upload_folder)
    upload_dir.mkdir(exist_ok=True)
    local_path = upload_dir / filename
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    return str(local_path)


@router.put("/{book_id}", response_model=PDFBook)
def update_pdf_book(book_id: int, book_update: PDFBookUpdate, db: Session = Depends(get_db)):
    book = crud.update_pdf_book(db, book_id=book_id, book_update=book_update)
    if book is None:
        raise HTTPException(status_code=404, detail="PDF book not found")
    return book


@router.delete("/{book_id}")
def delete_pdf_book(book_id: int, db: Session = Depends(get_db)):
    book = crud.get_pdf_book(db, book_id=book_id)
    if book:
        if book.file_path.startswith("http"):
            storage = get_storage()
            if storage:
                try:
                    storage.delete_pdf(_extract_object_key(book.file_path))
                except Exception as e:
                    print(f"Failed to delete PDF from MinIO: {e}")
        elif os.path.exists(book.file_path):
            os.remove(book.file_path)

    success = crud.delete_pdf_book(db, book_id=book_id)
    if not success:
        raise HTTPException(status_code=404, detail="PDF book not found")
    return {"message": "PDF book deleted successfully"}


@router.post("/{book_id}/sessions", response_model=ReadingSession)
def create_reading_session(
    book_id: int,
    session: ReadingSessionCreate,
    db: Session = Depends(get_db),
):
    book = crud.get_pdf_book(db, book_id=book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="PDF book not found")
    return crud.create_reading_session(db=db, session=session)


@router.get("/{book_id}/sessions", response_model=List[ReadingSession])
def read_reading_sessions(book_id: int, db: Session = Depends(get_db)):
    return crud.get_reading_sessions_by_book(db, book_id=book_id)
