from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from fastapi.responses import FileResponse, RedirectResponse
from typing import Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uuid
import os
import re
from pathlib import Path
from pydub import AudioSegment
import asyncio
import edge_tts
from app.core.database import get_db
from app.crud import crud

router = APIRouter()

# Simple in-memory job store. For production use a persistent queue (Redis/RQ/Celery).
JOBS: Dict[str, Dict[str, Any]] = {}

OUTPUT_DIR = Path(__file__).resolve().parents[3] / "data" / "audiobooks"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


class AudiobookGenerationRequest(BaseModel):
    book_id: int
    voice: str = "en-GB-SoniaNeural"
    style: str = ""
    format: str = "mp3"
    narrator_id: Optional[str] = None
    text: Optional[str] = None  # Optional: frontend can send extracted text directly


@router.post("/start")
async def start_audiobook_generation(request: AudiobookGenerationRequest, db: Session = Depends(get_db)):
    # Get book details for naming
    book = crud.get_pdf_book(db, book_id=request.book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "state": "queued", 
        "progress": 0, 
        "error": None, 
        "audio_path": None,
        "book_id": request.book_id,
        "book_name": book.name
    }

    # background run
    asyncio.create_task(_run_generation(
        job_id, 
        request.book_id, 
        request.voice, 
        request.style, 
        request.format,
        request.text,
        book.name,
        db
    ))
    return {"job_id": job_id}


@router.get("/{job_id}/status")
def audiobook_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    resp = {k: v for k, v in job.items() if k != "_internal"}
    if job.get("audio_path"):
        resp["download_url"] = f"/api/v1/audiobooks/{job_id}/download"
    return resp


@router.get("/{job_id}/download")
def download_audiobook(job_id: str):
    """Download the completed audiobook file."""
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["state"] != "completed" or not job.get("audio_path"):
        raise HTTPException(status_code=400, detail="Audiobook not ready for download")

    audio_path = job["audio_path"]

    # If stored in Supabase Storage, redirect to public URL
    if audio_path.startswith("http"):
        return RedirectResponse(url=audio_path)

    audio_file = Path(audio_path)
    if not audio_file.exists():
        raise HTTPException(status_code=404, detail="Audiobook file not found on disk")

    filename = audio_file.name
    return FileResponse(
        path=str(audio_file),
        media_type="audio/mpeg",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/book/{book_id}/download")
def download_book_audiobook(book_id: int, db: Session = Depends(get_db)):
    """Download the audiobook for a specific book."""
    book = crud.get_pdf_book(db, book_id=book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if not book.audiobook_path:
        raise HTTPException(status_code=404, detail="No audiobook generated for this book yet")

    # If stored in Supabase Storage, redirect to public URL
    if book.audiobook_path.startswith("http"):
        return RedirectResponse(url=book.audiobook_path)

    audio_path = Path(book.audiobook_path)
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audiobook file not found on disk")

    filename = audio_path.name
    return FileResponse(
        path=str(audio_path),
        media_type="audio/mpeg",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


async def _run_generation(job_id: str, book_id: int, voice: str, style: str, fmt: str = "mp3", text: Optional[str] = None, book_name: str = "audiobook", db: Session = None):
    JOBS[job_id]["state"] = "running"
    try:
        # Use provided text if available, otherwise look for extracted file
        if text:
            content_text = text
        else:
            text_path = Path(__file__).resolve().parents[3] / "data" / "uploads" / f"book_{book_id}.txt"
            if text_path.exists():
                content_text = text_path.read_text(encoding="utf-8")
            else:
                content_text = f"This is a generated audiobook for book id {book_id}. No extracted text was found on the server."

        # Split into chunks for streaming synthesis
        # First split by double newlines (paragraphs)
        paragraphs = [p.strip() for p in content_text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [content_text]
        
        # Further split large paragraphs to avoid edge-tts limitations (max ~3000 chars per request)
        MAX_CHUNK_SIZE = 2500
        MIN_CHUNK_SIZE = 10  # Minimum characters to avoid edge-tts errors
        final_chunks = []
        for para in paragraphs:
            # Skip chunks that are too small
            if len(para) < MIN_CHUNK_SIZE:
                continue
                
            if len(para) <= MAX_CHUNK_SIZE:
                final_chunks.append(para)
            else:
                # Split by sentences for large paragraphs
                sentences = re.split(r'(?<=[.!?])\s+', para)
                current_chunk = ""
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) <= MAX_CHUNK_SIZE:
                        current_chunk += " " + sentence if current_chunk else sentence
                    else:
                        if current_chunk and len(current_chunk) >= MIN_CHUNK_SIZE:
                            final_chunks.append(current_chunk.strip())
                        current_chunk = sentence
                if current_chunk and len(current_chunk) >= MIN_CHUNK_SIZE:
                    final_chunks.append(current_chunk.strip())
        
        # Filter out any remaining small chunks
        paragraphs = [p for p in final_chunks if len(p) >= MIN_CHUNK_SIZE]
        
        if not paragraphs:
            raise RuntimeError("No valid text chunks found to generate audio")

        parts_files = []
        total = len(paragraphs)
        print(f"[Audiobook Job {job_id}] Processing {total} text chunks")
        
        MAX_RETRIES = 3
        for idx, para in enumerate(paragraphs):
            JOBS[job_id]["progress"] = int((idx / total) * 100)
            
            # Validate and clean the text
            cleaned_para = para.strip()
            if len(cleaned_para) < 10:
                # If chunk is too short, merge with previous or next chunk's text
                print(f"[Audiobook Job {job_id}] Chunk {idx+1} too short ({len(cleaned_para)} chars), merging with context")
                if idx > 0 and len(paragraphs[idx - 1]) < 2000:
                    # Merge with previous chunk
                    paragraphs[idx - 1] = paragraphs[idx - 1] + " " + cleaned_para
                    continue
                elif idx < len(paragraphs) - 1:
                    # Merge with next chunk
                    paragraphs[idx + 1] = cleaned_para + " " + paragraphs[idx + 1]
                    continue
                else:
                    # Last chunk and too short, try to use it anyway if possible
                    if len(cleaned_para) < 5:
                        print(f"[Audiobook Job {job_id}] Chunk {idx+1} too short to process, skipping")
                        continue
            
            # Retry logic for each chunk
            tmp_wav = OUTPUT_DIR / f"{job_id}_{idx}.wav"
            success = False
            
            for attempt in range(MAX_RETRIES):
                try:
                    if attempt > 0:
                        print(f"[Audiobook Job {job_id}] Retrying chunk {idx+1}/{total} (attempt {attempt + 1}/{MAX_RETRIES})")
                        await asyncio.sleep(1)  # Small delay before retry
                    else:
                        print(f"[Audiobook Job {job_id}] Generating chunk {idx+1}/{total} ({len(cleaned_para)} chars)")
                    
                    communicate = edge_tts.Communicate(cleaned_para, voice)
                    audio_data = bytearray()
                    
                    # edge-tts provides an async stream
                    async for chunk in communicate.stream():
                        chunk_type = chunk["type"]
                        if chunk_type == "audio":
                            audio_data.extend(chunk["data"])
                        elif chunk_type == "WordBoundary":
                            # Word boundary info, can be ignored for now
                            pass
                    
                    if len(audio_data) == 0:
                        if attempt < MAX_RETRIES - 1:
                            print(f"[Audiobook Job {job_id}] No audio data received for chunk {idx+1}, retrying...")
                            continue
                        else:
                            raise RuntimeError(f"No audio data generated after {MAX_RETRIES} attempts")
                    
                    # Write the audio data to file
                    with open(tmp_wav, "wb") as f:
                        f.write(audio_data)
                    
                    # Verify file was created and has content
                    if not tmp_wav.exists() or tmp_wav.stat().st_size == 0:
                        if attempt < MAX_RETRIES - 1:
                            print(f"[Audiobook Job {job_id}] Failed to create audio file for chunk {idx+1}, retrying...")
                            continue
                        else:
                            raise RuntimeError(f"Failed to create audio file after {MAX_RETRIES} attempts")
                    
                    parts_files.append(tmp_wav)
                    print(f"[Audiobook Job {job_id}] Chunk {idx+1}/{total} completed ({tmp_wav.stat().st_size} bytes)")
                    success = True
                    break
                    
                except Exception as chunk_error:
                    if attempt < MAX_RETRIES - 1:
                        print(f"[Audiobook Job {job_id}] Error on chunk {idx+1} (attempt {attempt + 1}): {str(chunk_error)}, retrying...")
                        continue
                    else:
                        # After all retries failed, this is critical - we can't skip text
                        print(f"[Audiobook Job {job_id}] CRITICAL: Failed to generate chunk {idx+1} after {MAX_RETRIES} attempts")
                        print(f"[Audiobook Job {job_id}] Error: {str(chunk_error)}")
                        raise RuntimeError(f"Failed to generate chunk {idx+1} (text: '{cleaned_para[:100]}...') after {MAX_RETRIES} attempts: {str(chunk_error)}")
        
        if len(parts_files) == 0:
            raise RuntimeError("No audio chunks were successfully generated")

        print(f"[Audiobook Job {job_id}] Successfully generated all {len(parts_files)} chunks, concatenating into single audiobook file")
        
        # Concatenate with pydub
        combined = None
        for idx, fpath in enumerate(parts_files):
            try:
                print(f"[Audiobook Job {job_id}] Concatenating file {idx+1}/{len(parts_files)}: {fpath.name}")
                seg = AudioSegment.from_file(fpath)
                if combined is None:
                    combined = seg
                else:
                    combined += seg
            except Exception as concat_error:
                print(f"[Audiobook Job {job_id}] Error concatenating {fpath.name}: {str(concat_error)}")
                raise RuntimeError(f"Failed to concatenate audio file {idx}: {str(concat_error)}")

        # Use book name for the audiobook filename (sanitize it)
        sanitized_book_name = re.sub(r'[^\w\s-]', '', book_name).strip().replace(' ', '_')
        if not sanitized_book_name:
            sanitized_book_name = f"book_{book_id}"
        out_file = OUTPUT_DIR / f"{sanitized_book_name}.{fmt}"
        
        # If file exists, append a number to make it unique
        counter = 1
        while out_file.exists():
            out_file = OUTPUT_DIR / f"{sanitized_book_name}_{counter}.{fmt}"
            counter += 1
        
        if combined is None:
            raise RuntimeError("No audio was generated")
        
        print(f"[Audiobook Job {job_id}] Exporting final audiobook to {out_file}")
        combined.export(out_file, format=fmt)
        print(f"[Audiobook Job {job_id}] Export completed ({out_file.stat().st_size} bytes)")

        # Cleanup parts
        print(f"[Audiobook Job {job_id}] Cleaning up temporary files")
        for fpath in parts_files:
            try:
                fpath.unlink()
            except Exception:
                pass

        # Try to upload the finished audiobook to Supabase Storage
        final_audio_path = str(out_file)
        try:
            from app.core.storage import get_storage
            storage = get_storage()
            if storage:
                print(f"[Audiobook Job {job_id}] Uploading audiobook to Supabase Storage")
                with open(out_file, "rb") as f:
                    audio_bytes = f.read()
                supabase_url = storage.upload_audiobook_bytes(audio_bytes, out_file.name)
                final_audio_path = supabase_url
                print(f"[Audiobook Job {job_id}] Uploaded to Supabase: {supabase_url}")
                # Clean up local file after successful upload
                try:
                    out_file.unlink()
                except Exception:
                    pass
        except Exception as upload_err:
            print(f"[Audiobook Job {job_id}] Supabase upload failed, keeping local file: {upload_err}")

        JOBS[job_id]["state"] = "completed"
        JOBS[job_id]["progress"] = 100
        JOBS[job_id]["audio_path"] = final_audio_path

        # Update the book record in the database with the audiobook path
        try:
            from app.core.database import SessionLocal
            from app.schemas.schemas import PDFBookUpdate
            db_session = SessionLocal()
            try:
                crud.update_pdf_book(db_session, book_id=book_id, book_update=PDFBookUpdate(audiobook_path=final_audio_path))
                db_session.commit()
                print(f"[Audiobook Job {job_id}] Updated book {book_id} with audiobook path")
            finally:
                db_session.close()
        except Exception as db_error:
            print(f"[Audiobook Job {job_id}] Failed to update book record: {str(db_error)}")
        
        print(f"[Audiobook Job {job_id}] Generation completed successfully")
    except Exception as e:
        print(f"[Audiobook Job {job_id}] FAILED: {str(e)}")
        JOBS[job_id]["state"] = "failed"
        JOBS[job_id]["error"] = str(e)
