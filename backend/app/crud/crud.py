from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.models import OfficeHoursEntry, Task, PDFBook, ReadingSession
from app.schemas.schemas import (
    OfficeHoursEntryCreate, OfficeHoursEntryUpdate,
    TaskCreate, TaskUpdate,
    PDFBookCreate, PDFBookUpdate,
    ReadingSessionCreate
)

# Office Hours CRUD
def get_office_hours_entries(db: Session, skip: int = 0, limit: int = 100) -> List[OfficeHoursEntry]:
    return db.query(OfficeHoursEntry).offset(skip).limit(limit).all()

def get_office_hours_entry(db: Session, entry_id: int) -> Optional[OfficeHoursEntry]:
    return db.query(OfficeHoursEntry).filter(OfficeHoursEntry.id == entry_id).first()

def get_office_hours_entry_by_date(db: Session, date: str) -> Optional[OfficeHoursEntry]:
    return db.query(OfficeHoursEntry).filter(OfficeHoursEntry.date == date).first()

def create_office_hours_entry(db: Session, entry: OfficeHoursEntryCreate) -> OfficeHoursEntry:
    db_entry = OfficeHoursEntry(**entry.model_dump())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def update_office_hours_entry(db: Session, entry_id: int, entry_update: OfficeHoursEntryUpdate) -> Optional[OfficeHoursEntry]:
    db_entry = db.query(OfficeHoursEntry).filter(OfficeHoursEntry.id == entry_id).first()
    if db_entry:
        update_data = entry_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_entry, field, value)
        db.commit()
        db.refresh(db_entry)
    return db_entry

def delete_office_hours_entry(db: Session, entry_id: int) -> bool:
    db_entry = db.query(OfficeHoursEntry).filter(OfficeHoursEntry.id == entry_id).first()
    if db_entry:
        db.delete(db_entry)
        db.commit()
        return True
    return False

# Tasks CRUD
def get_tasks(db: Session, skip: int = 0, limit: int = 100) -> List[Task]:
    return db.query(Task).offset(skip).limit(limit).all()

def get_task(db: Session, task_id: int) -> Optional[Task]:
    return db.query(Task).filter(Task.id == task_id).first()

def get_tasks_by_category(db: Session, category: str) -> List[Task]:
    return db.query(Task).filter(Task.category == category).all()

def create_task(db: Session, task: TaskCreate) -> Task:
    db_task = Task(**task.model_dump())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: int, task_update: TaskUpdate) -> Optional[Task]:
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task:
        update_data = task_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_task, field, value)
        db.commit()
        db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: int) -> bool:
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False

# PDF Books CRUD
def get_pdf_books(db: Session, skip: int = 0, limit: int = 100) -> List[PDFBook]:
    return db.query(PDFBook).offset(skip).limit(limit).all()

def get_pdf_book(db: Session, book_id: int) -> Optional[PDFBook]:
    return db.query(PDFBook).filter(PDFBook.id == book_id).first()

def create_pdf_book(db: Session, book: PDFBookCreate, file_path: str, original_filename: str) -> PDFBook:
    db_book = PDFBook(
        **book.model_dump(),
        file_path=file_path,
        original_filename=original_filename
    )
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book

def update_pdf_book(db: Session, book_id: int, book_update: PDFBookUpdate) -> Optional[PDFBook]:
    db_book = db.query(PDFBook).filter(PDFBook.id == book_id).first()
    if db_book:
        update_data = book_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_book, field, value)
        db.commit()
        db.refresh(db_book)
    return db_book

def delete_pdf_book(db: Session, book_id: int) -> bool:
    db_book = db.query(PDFBook).filter(PDFBook.id == book_id).first()
    if db_book:
        db.delete(db_book)
        db.commit()
        return True
    return False

# Reading Sessions CRUD
def create_reading_session(db: Session, session: ReadingSessionCreate) -> ReadingSession:
    db_session = ReadingSession(**session.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_reading_sessions_by_book(db: Session, book_id: int) -> List[ReadingSession]:
    return db.query(ReadingSession).filter(ReadingSession.book_id == book_id).all()
