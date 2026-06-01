"""
YouTube upload service — zero FastAPI or database imports.
Independently unit-testable. All config comes from environment variables.
"""
import logging
import math
import os
import subprocess
import time
from typing import List, Optional

logger = logging.getLogger(__name__)


class YouTubeAuthError(Exception):
    """Raised when OAuth2 credential construction fails."""


class YouTubeUploadError(Exception):
    """Raised on non-retriable YouTube API upload errors (4xx)."""


class YouTubeUploaderService:
    """
    Handles thumbnail generation and resumable YouTube video uploads.

    Args:
        All configuration is read from environment variables at construction
        time so the instance can be created inside a Celery worker without
        any application context.

    Environment variables:
        YOUTUBE_CLIENT_ID       — OAuth2 client ID (required)
        YOUTUBE_CLIENT_SECRET   — OAuth2 client secret (required)
        YOUTUBE_REFRESH_TOKEN   — Long-lived refresh token (required)
        YOUTUBE_PRIVACY         — "unlisted" | "public" | "private" (default: "unlisted")
        YOUTUBE_CATEGORY_ID     — YouTube category ID string (default: "22")
        YOUTUBE_UPLOAD_CHUNK_SIZE_MB — Resumable chunk size in MB (default: 1)
    """

    def __init__(self) -> None:
        self.client_id: str = os.environ.get("YOUTUBE_CLIENT_ID", "")
        self.client_secret: str = os.environ.get("YOUTUBE_CLIENT_SECRET", "")
        self.refresh_token: str = os.environ.get("YOUTUBE_REFRESH_TOKEN", "")
        self.privacy: str = os.environ.get("YOUTUBE_PRIVACY", "unlisted")
        self.category_id: str = os.environ.get("YOUTUBE_CATEGORY_ID", "22")
        chunk_mb: int = int(os.environ.get("YOUTUBE_UPLOAD_CHUNK_SIZE_MB", "1"))
        self.chunk_size: int = chunk_mb * 1024 * 1024

    # ──────────────────────────────────────────────────────────────────────────
    # Public helpers
    # ──────────────────────────────────────────────────────────────────────────

    def is_configured(self) -> bool:
        """
        Return True only if all three required credential env vars are non-empty.

        Returns:
            bool: True when credentials are present, False for graceful skip.
        """
        return bool(self.client_id and self.client_secret and self.refresh_token)

    def build_credentials(self):
        """
        Build Google OAuth2 Credentials from the stored refresh token.

        Returns:
            google.oauth2.credentials.Credentials: Ready-to-use credentials.

        Raises:
            YouTubeAuthError: If the credentials object cannot be constructed.

        Note:
            The refresh token must be obtained with the
            https://www.googleapis.com/auth/youtube scope to support both
            video uploads and playlist management.
        """
        try:
            from google.oauth2.credentials import Credentials

            credentials = Credentials(
                token=None,
                refresh_token=self.refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=["https://www.googleapis.com/auth/youtube"],
            )
            return credentials
        except Exception as exc:
            raise YouTubeAuthError(f"Failed to build YouTube credentials: {exc}") from exc

    def generate_thumbnail(self, title: str, output_path: str) -> str:
        """
        Generate a 1280×720 PNG thumbnail using Pillow only (no network calls).

        Args:
            title:       Book title drawn centred on the canvas.
            output_path: Absolute file path where the PNG will be saved.

        Returns:
            str: The output_path passed in, for chaining.
        """
        from PIL import Image, ImageDraw, ImageFont

        width, height = 1280, 720
        img = Image.new("RGB", (width, height))
        draw = ImageDraw.Draw(img)

        # Vertical gradient: #1a1a2e → #16213e
        top_color = (26, 26, 46)
        bottom_color = (22, 33, 62)
        for y in range(height):
            t = y / height
            r = int(top_color[0] + (bottom_color[0] - top_color[0]) * t)
            g = int(top_color[1] + (bottom_color[1] - top_color[1]) * t)
            b = int(top_color[2] + (bottom_color[2] - top_color[2]) * t)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        # Red accent rectangle top-left
        draw.rectangle([30, 30, 110, 50], fill="#e94560")

        # Title font — auto-scale down for long titles
        title_font = self._load_font(size=72)
        wrapped_lines = self._wrap_text(title, max_chars=40, max_lines=3)
        if len(wrapped_lines) > 2:
            title_font = self._load_font(size=54)
        if len(wrapped_lines) > 3:
            wrapped_lines = wrapped_lines[:3]
            wrapped_lines[-1] = wrapped_lines[-1][:37] + "..."

        line_height = title_font.size + 16 if hasattr(title_font, "size") else 90
        total_text_height = len(wrapped_lines) * line_height
        start_y = (height - total_text_height) // 2

        for i, line in enumerate(wrapped_lines):
            try:
                bbox = draw.textbbox((0, 0), line, font=title_font)
                text_width = bbox[2] - bbox[0]
            except AttributeError:
                # Older Pillow fallback
                text_width, _ = draw.textsize(line, font=title_font)  # type: ignore[attr-defined]
            x = (width - text_width) // 2
            y = start_y + i * line_height
            # Subtle shadow
            draw.text((x + 2, y + 2), line, font=title_font, fill=(0, 0, 0, 120))
            draw.text((x, y), line, font=title_font, fill="white")

        # Bottom-right watermark
        watermark_font = self._load_font(size=24)
        watermark = "Generated by Versa"
        try:
            bbox = draw.textbbox((0, 0), watermark, font=watermark_font)
            wm_width = bbox[2] - bbox[0]
            wm_height = bbox[3] - bbox[1]
        except AttributeError:
            wm_width, wm_height = draw.textsize(watermark, font=watermark_font)  # type: ignore[attr-defined]
        draw.text(
            (width - wm_width - 30, height - wm_height - 30),
            watermark,
            font=watermark_font,
            fill="#888888",
        )

        img.save(output_path, "PNG")
        logger.info("Thumbnail saved to %s", output_path)
        return output_path

    def upload(
        self,
        mp3_path: str,
        title: str,
        description: str,
        thumbnail_path: Optional[str] = None,
    ) -> str:
        """
        Upload an MP3 file to YouTube as a resumable video upload.

        YouTube accepts MP3 with mimetype video/mp4 for its upload API;
        the content is stored and served as audio-only.

        Args:
            mp3_path:       Absolute path to the MP3 file.
            title:          Video title (truncated to 100 chars).
            description:    Video description.
            thumbnail_path: Optional path to a PNG thumbnail file.

        Returns:
            str: Full YouTube watch URL, e.g. https://www.youtube.com/watch?v=XXXXX

        Raises:
            YouTubeAuthError:  When credentials cannot be refreshed.
            YouTubeUploadError: On non-retriable HTTP 4xx errors.
        """
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
        from googleapiclient.http import MediaFileUpload

        credentials = self.build_credentials()

        youtube = build("youtube", "v3", credentials=credentials, cache_discovery=False)

        truncated_title = title[:100]
        body = {
            "snippet": {
                "title": truncated_title,
                "description": description,
                "tags": ["audiobook", "AI narrated", title[:50]],
                "categoryId": self.category_id,
            },
            "status": {
                "privacyStatus": self.privacy,
            },
        }

        # YouTube Data API v3 accepts MP3 files via the video upload endpoint
        # when using mimetype "video/mp4" — it processes it as audio-only.
        media = MediaFileUpload(
            mp3_path,
            mimetype="video/mp4",
            chunksize=self.chunk_size,
            resumable=True,
        )

        insert_request = youtube.videos().insert(
            part=",".join(body.keys()),
            body=body,
            media_body=media,
        )

        video_id = self._execute_resumable_upload(insert_request)
        logger.info("YouTube upload complete: video_id=%s", video_id)

        if thumbnail_path and os.path.isfile(thumbnail_path):
            try:
                youtube.thumbnails().set(
                    videoId=video_id,
                    media_body=MediaFileUpload(thumbnail_path, mimetype="image/png"),
                ).execute()
                logger.info("Thumbnail attached to video %s", video_id)
            except Exception as thumb_exc:
                # Thumbnail failure must never fail the upload
                logger.warning(
                    "Thumbnail upload failed for video %s (non-fatal): %s",
                    video_id,
                    thumb_exc,
                )

        return f"https://www.youtube.com/watch?v={video_id}"

    @staticmethod
    def get_audio_duration(mp3_path: str) -> float:
        """
        Return the duration of an audio file in seconds via ffprobe.

        Args:
            mp3_path: Absolute path to the audio file.

        Returns:
            float: Duration in seconds.

        Raises:
            RuntimeError: If ffprobe fails or returns no output.
        """
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                mp3_path,
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"ffprobe failed: {result.stderr.strip()}")
        raw = result.stdout.strip()
        if not raw:
            raise RuntimeError(f"ffprobe returned no duration for {mp3_path}")
        return float(raw)

    @staticmethod
    def split_audio(mp3_path: str, segment_secs: int, output_dir: str) -> List[str]:
        """
        Split an MP3 into fixed-duration segments using ffmpeg stream copy.

        Args:
            mp3_path:     Absolute path to the source MP3.
            segment_secs: Maximum duration per segment in seconds.
            output_dir:   Directory where segment files are written.

        Returns:
            list[str]: Ordered list of absolute paths to created segment files.

        Raises:
            RuntimeError: If ffprobe or ffmpeg returns a non-zero exit code.
        """
        duration_result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                mp3_path,
            ],
            capture_output=True,
            text=True,
        )
        if duration_result.returncode != 0:
            raise RuntimeError(f"ffprobe failed: {duration_result.stderr.strip()}")
        total_duration = float(duration_result.stdout.strip())
        n_segments = math.ceil(total_duration / segment_secs)

        segments: List[str] = []
        for i in range(n_segments):
            start = i * segment_secs
            seg_path = os.path.join(output_dir, f"segment_{i + 1:03d}.mp3")
            cmd = [
                "ffmpeg", "-y", "-loglevel", "error",
                "-ss", str(start),
                "-t", str(segment_secs),
                "-i", mp3_path,
                "-acodec", "copy",
                seg_path,
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True)
            if proc.returncode != 0:
                raise RuntimeError(
                    f"ffmpeg split failed for segment {i + 1}: {proc.stderr.strip()}"
                )
            if os.path.isfile(seg_path):
                segments.append(seg_path)
            else:
                logger.warning("Segment %d not created at %s", i + 1, seg_path)

        return segments

    def create_playlist(self, title: str, description: str, video_ids: List[str]) -> str:
        """
        Create a YouTube playlist, insert videos in order, and return the URL.

        Args:
            title:       Playlist title (truncated to 100 chars).
            description: Playlist description.
            video_ids:   Ordered list of YouTube video IDs to insert.

        Returns:
            str: Full YouTube playlist URL.

        Raises:
            YouTubeAuthError:   On credential construction failure.
            YouTubeUploadError: On non-retriable API errors.
        """
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError

        credentials = self.build_credentials()
        youtube = build("youtube", "v3", credentials=credentials, cache_discovery=False)

        try:
            playlist_resp = youtube.playlists().insert(
                part="snippet,status",
                body={
                    "snippet": {
                        "title": title[:100],
                        "description": description[:5000],
                    },
                    "status": {"privacyStatus": self.privacy},
                },
            ).execute()
        except HttpError as exc:
            raise YouTubeUploadError(
                f"Failed to create playlist: HTTP {exc.resp.status}: {exc}"
            ) from exc

        playlist_id = playlist_resp["id"]
        logger.info("Created YouTube playlist %s", playlist_id)

        for position, video_id in enumerate(video_ids):
            try:
                youtube.playlistItems().insert(
                    part="snippet",
                    body={
                        "snippet": {
                            "playlistId": playlist_id,
                            "resourceId": {"kind": "youtube#video", "videoId": video_id},
                            "position": position,
                        }
                    },
                ).execute()
                logger.debug("Inserted video %s at position %d", video_id, position)
            except HttpError as exc:
                logger.warning(
                    "Failed to insert video %s into playlist %s (non-fatal): %s",
                    video_id,
                    playlist_id,
                    exc,
                )

        return f"https://www.youtube.com/playlist?list={playlist_id}"

    # ──────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _execute_resumable_upload(self, insert_request) -> str:
        """
        Drive a resumable upload to completion with retry logic.

        Args:
            insert_request: A googleapiclient MediaFileUpload insert request.

        Returns:
            str: The YouTube video ID.

        Raises:
            YouTubeUploadError: On non-retriable HTTP errors or exhausted retries.
        """
        from googleapiclient.errors import HttpError

        RETRIABLE_STATUS_CODES = {500, 502, 503, 504}
        MAX_RETRIES = 3
        response = None

        while response is None:
            retries = 0
            while retries <= MAX_RETRIES:
                try:
                    logger.debug("Executing next upload chunk (attempt %d)", retries + 1)
                    status, response = insert_request.next_chunk()
                    if status:
                        logger.debug(
                            "Upload progress: %.1f%%",
                            status.progress() * 100,
                        )
                    if response is not None:
                        break
                    retries = 0  # Chunk succeeded, reset retry counter for next chunk
                except HttpError as http_err:
                    status_code = http_err.resp.status
                    if status_code in RETRIABLE_STATUS_CODES:
                        if retries < MAX_RETRIES:
                            retries += 1
                            wait = 5 * retries
                            logger.warning(
                                "Retriable HTTP %d on upload chunk, retry %d/%d in %ds",
                                status_code,
                                retries,
                                MAX_RETRIES,
                                wait,
                            )
                            time.sleep(wait)
                        else:
                            raise YouTubeUploadError(
                                f"Upload failed after {MAX_RETRIES} retries on HTTP {status_code}"
                            ) from http_err
                    else:
                        # 400, 403, 404, etc. — non-retriable
                        raise YouTubeUploadError(
                            f"Non-retriable HTTP {status_code}: {http_err}"
                        ) from http_err

        if not response or "id" not in response:
            raise YouTubeUploadError("Upload completed but no video ID in response")

        return response["id"]

    @staticmethod
    def _load_font(size: int):
        """Load a PIL font at the given size, falling back to default."""
        from PIL import ImageFont

        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/Windows/Fonts/arialbd.ttf",
        ]
        for path in candidates:
            if os.path.isfile(path):
                try:
                    return ImageFont.truetype(path, size)
                except Exception:
                    continue
        return ImageFont.load_default()

    @staticmethod
    def _wrap_text(text: str, max_chars: int = 40, max_lines: int = 3) -> list:
        """
        Wrap text into lines of at most max_chars characters, word-aware.

        Args:
            text:      Input string.
            max_chars: Maximum characters per line.
            max_lines: Maximum number of lines to return.

        Returns:
            list[str]: Wrapped lines.
        """
        words = text.split()
        lines: list = []
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip() if current else word
            if len(candidate) <= max_chars:
                current = candidate
            else:
                if current:
                    lines.append(current)
                    if len(lines) >= max_lines:
                        break
                current = word
        if current and len(lines) < max_lines:
            lines.append(current)
        return lines
