"""
Celery tasks for YouTube audiobook uploads.

All upload, splitting, and playlist orchestration runs here — no API request
context is held open. State is persisted to the database after every meaningful
step so partial success is always visible and recoverable.
"""
import json
import logging
import os
import shutil
import tempfile
import time
from typing import List, Optional

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.youtube_uploader import YouTubeUploaderService, YouTubeUploadError

logger = logging.getLogger(__name__)

MAX_SEGMENT_SECS = 50 * 60  # 50 minutes
_SEGMENT_RETRY_DELAYS = [5, 15, 45]  # exponential-ish back-off in seconds


# ──────────────────────────────────────────────────────────────────────────────
# DB helpers — operates on a caller-supplied session so no session leaks
# ──────────────────────────────────────────────────────────────────────────────

def _patch_book(db, book_id: int, **fields) -> None:
    """Set arbitrary fields on PDFBook and commit; silent no-op if missing."""
    from app.models.models import PDFBook

    book = db.query(PDFBook).filter(PDFBook.id == book_id).first()
    if not book:
        logger.warning("_patch_book: book %d not found", book_id)
        return
    for k, v in fields.items():
        setattr(book, k, v)
    db.commit()


def _append_video_id(db, book_id: int, video_id: str) -> None:
    """Append a newly uploaded video_id to the JSON list stored in the DB."""
    from app.models.models import PDFBook

    book = db.query(PDFBook).filter(PDFBook.id == book_id).first()
    if not book:
        return
    existing: List[str] = []
    if book.youtube_video_ids:
        try:
            existing = json.loads(book.youtube_video_ids)
        except (ValueError, TypeError):
            pass
    existing.append(video_id)
    book.youtube_video_ids = json.dumps(existing)
    db.commit()


# ──────────────────────────────────────────────────────────────────────────────
# Upload helper — per-segment retry with exponential back-off
# ──────────────────────────────────────────────────────────────────────────────

def _upload_segment(
    uploader: YouTubeUploaderService,
    seg_path: str,
    title: str,
    description: str,
    thumbnail_path: Optional[str],
) -> str:
    """
    Upload one segment, retrying on transient errors.

    Returns:
        YouTube video ID (str), extracted from the watch URL.

    Raises:
        YouTubeUploadError: After all retry attempts are exhausted.
    """
    last_exc: Optional[Exception] = None
    for attempt, delay in enumerate([0] + _SEGMENT_RETRY_DELAYS):
        if delay:
            logger.warning(
                "Retrying segment upload (attempt %d/%d) in %ds: %s",
                attempt + 1,
                len(_SEGMENT_RETRY_DELAYS) + 1,
                delay,
                last_exc,
            )
            time.sleep(delay)
        try:
            url = uploader.upload(seg_path, title, description, thumbnail_path)
            return url.split("v=")[-1]
        except YouTubeUploadError as exc:
            last_exc = exc
            continue
        except Exception as exc:
            last_exc = exc
            continue

    raise YouTubeUploadError(
        f"All {len(_SEGMENT_RETRY_DELAYS) + 1} upload attempts failed: {last_exc}"
    )


# ──────────────────────────────────────────────────────────────────────────────
# Audio fetch helper
# ──────────────────────────────────────────────────────────────────────────────

def _resolve_audio(audio_path: str) -> tuple:
    """
    Return (local_path, temp_path_or_None).

    If audio_path is a URL, stream-download it to a temp file and return
    (temp_path, temp_path) so the caller can clean it up. Otherwise return
    (audio_path, None) — caller must not delete the original.
    """
    if not audio_path.startswith("http"):
        return audio_path, None

    import requests

    logger.info("Downloading audiobook from %s", audio_path)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    try:
        with requests.get(audio_path, stream=True, timeout=180) as resp:
            resp.raise_for_status()
            for chunk in resp.iter_content(chunk_size=65536):
                tmp.write(chunk)
    finally:
        tmp.close()
    logger.info("Downloaded to %s (%d bytes)", tmp.name, os.path.getsize(tmp.name))
    return tmp.name, tmp.name


# ──────────────────────────────────────────────────────────────────────────────
# Main Celery task
# ──────────────────────────────────────────────────────────────────────────────

@celery_app.task(bind=True, name="youtube.upload_audiobook", max_retries=0)
def upload_audiobook_to_youtube(
    self,
    book_id: int,
    audio_path: str,
    title: str,
    description: str = "",
):
    """
    Orchestrate split → upload segments → create playlist for one audiobook.

    State machine written to the DB:
        pending          (set by the API endpoint before enqueue)
        uploading        (task begins)
        playlist_pending (all segments done, building playlist)
        completed        (everything succeeded)
        partial          (some segments failed after retries)
        failed           (no segments uploaded at all)

    Failure handling:
        - Individual segment failures retry with back-off; the others continue.
        - Playlist creation failure is logged but does not affect upload state.
        - Any unhandled exception marks the book "failed".
    """
    uploader = YouTubeUploaderService()
    if not uploader.is_configured():
        logger.warning("YouTube not configured — skipping upload for book %d", book_id)
        return

    db = SessionLocal()
    temp_download: Optional[str] = None
    temp_seg_dir: Optional[str] = None
    thumb_dir: Optional[str] = None

    try:
        _patch_book(db, book_id, youtube_upload_state="uploading")

        local_path, temp_download = _resolve_audio(audio_path)

        if not os.path.isfile(local_path):
            raise FileNotFoundError(f"Audio file not found: {local_path}")

        duration = uploader.get_audio_duration(local_path)
        logger.info(
            "Book %d: duration=%.1fs (%.1f min)", book_id, duration, duration / 60
        )

        if duration <= MAX_SEGMENT_SECS:
            segment_paths = [local_path]
            total_parts = 1
        else:
            import math
            total_parts = math.ceil(duration / MAX_SEGMENT_SECS)
            temp_seg_dir = tempfile.mkdtemp(prefix="versa_yt_")
            segment_paths = uploader.split_audio(local_path, MAX_SEGMENT_SECS, temp_seg_dir)
            logger.info("Book %d: split into %d segments", book_id, len(segment_paths))

        _patch_book(
            db, book_id,
            youtube_total_parts=total_parts,
            youtube_current_part=0,
            youtube_video_ids=json.dumps([]),
        )

        thumb_dir = tempfile.mkdtemp(prefix="versa_thumb_")
        any_failed = False

        for idx, seg_path in enumerate(segment_paths):
            part_num = idx + 1
            _patch_book(db, book_id, youtube_current_part=part_num)

            part_title = (
                title
                if total_parts == 1
                else f"{title} (Part {part_num}/{total_parts})"
            )
            seg_description = description or f"Audiobook narration of: {title}"
            if total_parts > 1:
                seg_description += f"\n\nPart {part_num} of {total_parts}."

            thumb_path = os.path.join(thumb_dir, f"thumb_{part_num:03d}.png")
            try:
                uploader.generate_thumbnail(part_title, thumb_path)
            except Exception as exc:
                logger.warning("Thumbnail failed for part %d: %s", part_num, exc)
                thumb_path = None

            try:
                video_id = _upload_segment(
                    uploader, seg_path, part_title, seg_description, thumb_path
                )
                _append_video_id(db, book_id, video_id)
                logger.info(
                    "Book %d part %d/%d uploaded → video_id=%s",
                    book_id, part_num, total_parts, video_id,
                )
            except Exception as exc:
                logger.error(
                    "Book %d part %d/%d upload failed (non-blocking): %s",
                    book_id, part_num, total_parts, exc,
                )
                any_failed = True

            if thumb_path and os.path.isfile(thumb_path):
                try:
                    os.unlink(thumb_path)
                except Exception:
                    pass

        # Re-read persisted video IDs to determine final state
        db.expire_all()
        from app.models.models import PDFBook as _PDFBook
        book_row = db.query(_PDFBook).filter(_PDFBook.id == book_id).first()
        uploaded_ids: List[str] = []
        if book_row and book_row.youtube_video_ids:
            try:
                uploaded_ids = json.loads(book_row.youtube_video_ids)
            except (ValueError, TypeError):
                pass

        if not uploaded_ids:
            _patch_book(db, book_id, youtube_upload_state="failed")
            return

        # Create playlist when more than one video was uploaded
        playlist_url: Optional[str] = None
        if len(uploaded_ids) > 1:
            _patch_book(db, book_id, youtube_upload_state="playlist_pending")
            try:
                playlist_url = uploader.create_playlist(
                    title, description or title, uploaded_ids
                )
                logger.info("Book %d playlist created: %s", book_id, playlist_url)
            except Exception as exc:
                logger.warning(
                    "Playlist creation failed for book %d (uploads preserved): %s",
                    book_id, exc,
                )

        final_state = "partial" if any_failed else "completed"
        _patch_book(
            db, book_id,
            youtube_upload_state=final_state,
            youtube_playlist_url=playlist_url,
        )
        logger.info(
            "Book %d YouTube upload → %s | videos=%s | playlist=%s",
            book_id, final_state, uploaded_ids, playlist_url,
        )

    except Exception as exc:
        logger.exception("YouTube upload task crashed for book %d: %s", book_id, exc)
        try:
            _patch_book(db, book_id, youtube_upload_state="failed")
        except Exception:
            pass
    finally:
        db.close()

        if temp_download and os.path.isfile(temp_download):
            try:
                os.unlink(temp_download)
            except Exception:
                pass

        if temp_seg_dir:
            shutil.rmtree(temp_seg_dir, ignore_errors=True)

        if thumb_dir:
            shutil.rmtree(thumb_dir, ignore_errors=True)
