from fastapi import APIRouter, BackgroundTasks, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
import uuid
import os
import re
from pathlib import Path
from pydub import AudioSegment
import asyncio
import edge_tts

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
async def start_audiobook_generation(request: AudiobookGenerationRequest):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"state": "queued", "progress": 0, "error": None, "audio_path": None}

    # background run
    asyncio.create_task(_run_generation(
        job_id, 
        request.book_id, 
        request.voice, 
        request.style, 
        request.format,
        request.text
    ))
    return {"job_id": job_id}


@router.get("/{job_id}/status")
def audiobook_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    resp = {k: v for k, v in job.items() if k != "_internal"}
    if job.get("audio_path"):
        resp["download_url"] = f"/data/audiobooks/{os.path.basename(job['audio_path'])}"
    return resp


async def _run_generation(job_id: str, book_id: int, voice: str, style: str, fmt: str = "mp3", text: Optional[str] = None):
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

        out_file = OUTPUT_DIR / f"audiobook_{job_id}.{fmt}"
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

        JOBS[job_id]["state"] = "completed"
        JOBS[job_id]["progress"] = 100
        JOBS[job_id]["audio_path"] = str(out_file)
        print(f"[Audiobook Job {job_id}] Generation completed successfully")
    except Exception as e:
        print(f"[Audiobook Job {job_id}] FAILED: {str(e)}")
        JOBS[job_id]["state"] = "failed"
        JOBS[job_id]["error"] = str(e)
