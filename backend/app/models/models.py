from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Boolean
from sqlalchemy.sql import func
from app.core.database import Base

class OfficeHoursEntry(Base):
    __tablename__ = "office_hours_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False)
    check_in_time = Column(String, nullable=True)
    check_out_time = Column(String, nullable=True)
    break_start = Column(String, nullable=True)
    break_end = Column(String, nullable=True)
    total_hours = Column(Float, default=0.0)
    break_duration = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)  # urgent_important, urgent_not_important, etc.
    priority = Column(Integer, default=1)
    completed = Column(Boolean, default=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class PDFBook(Base):
    __tablename__ = "pdf_books"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    total_pages = Column(Integer, default=0)
    current_page = Column(Integer, default=1)
    current_chunk = Column(Integer, default=0)
    current_sentence = Column(Integer, default=0)
    progress_percentage = Column(Float, default=0.0)
    reading_mode = Column(String, default="chunk")  # chunk or sentence
    status = Column(String, default="reading")  # reading, completed, paused
    audiobook_path = Column(String, nullable=True)  # Path to generated audiobook file
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ReadingSession(Base):
    __tablename__ = "reading_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, nullable=False)
    chunks_read = Column(Integer, default=0)
    time_spent = Column(Float, default=0.0)  # in minutes
    session_date = Column(DateTime(timezone=True), server_default=func.now())
