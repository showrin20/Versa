from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Office Hours Schemas
class OfficeHoursEntryBase(BaseModel):
    date: str
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    break_start: Optional[str] = None
    break_end: Optional[str] = None
    total_hours: Optional[float] = 0.0
    break_duration: Optional[float] = 0.0
    notes: Optional[str] = None

class OfficeHoursEntryCreate(OfficeHoursEntryBase):
    pass

class OfficeHoursEntryUpdate(BaseModel):
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    break_start: Optional[str] = None
    break_end: Optional[str] = None
    total_hours: Optional[float] = None
    break_duration: Optional[float] = None
    notes: Optional[str] = None

class OfficeHoursEntry(OfficeHoursEntryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    priority: int = 1
    completed: bool = False
    due_date: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = None
    completed: Optional[bool] = None
    due_date: Optional[datetime] = None

class Task(TaskBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# PDF Book Schemas
class PDFBookBase(BaseModel):
    name: str
    total_pages: int = 0
    current_page: int = 1
    current_chunk: int = 0
    current_sentence: int = 0
    progress_percentage: float = 0.0
    reading_mode: str = "chunk"
    status: str = "reading"
    audiobook_path: Optional[str] = None

class PDFBookCreate(BaseModel):
    name: str

class PDFBookUpdate(BaseModel):
    name: Optional[str] = None
    current_page: Optional[int] = None
    current_chunk: Optional[int] = None
    current_sentence: Optional[int] = None
    progress_percentage: Optional[float] = None
    reading_mode: Optional[str] = None
    status: Optional[str] = None
    audiobook_path: Optional[str] = None

class PDFBook(PDFBookBase):
    id: int
    original_filename: str
    file_path: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Reading Session Schemas
class ReadingSessionBase(BaseModel):
    book_id: int
    chunks_read: int = 0
    time_spent: float = 0.0

class ReadingSessionCreate(ReadingSessionBase):
    pass

class ReadingSession(ReadingSessionBase):
    id: int
    session_date: datetime
    
    class Config:
        from_attributes = True
