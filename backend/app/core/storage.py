"""
MinIO object storage for PDF and audiobook files.
Falls back gracefully when MinIO is not configured.
"""
import io
import json
from typing import Optional
from urllib.parse import urlparse

from app.core.config import settings


class MinioStorage:
    def __init__(self):
        from minio import Minio

        self.client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        self.pdf_bucket = settings.minio_bucket_pdf
        self.audiobook_bucket = settings.minio_bucket_audiobooks
        self._ensure_bucket(self.pdf_bucket)
        self._ensure_bucket(self.audiobook_bucket)

    def _ensure_bucket(self, bucket: str) -> None:
        if not self.client.bucket_exists(bucket):
            self.client.make_bucket(bucket)
        # Set public read policy so stored URLs are directly accessible
        policy = json.dumps({
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"AWS": "*"},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket}/*"],
            }],
        })
        self.client.set_bucket_policy(bucket, policy)

    def _public_url(self, bucket: str, path: str) -> str:
        base = settings.minio_public_url or f"http://{settings.minio_endpoint}"
        return f"{base}/{bucket}/{path}"

    def upload_pdf_bytes(self, file_bytes: bytes, destination_path: str) -> str:
        self.client.put_object(
            self.pdf_bucket,
            destination_path,
            io.BytesIO(file_bytes),
            length=len(file_bytes),
            content_type="application/pdf",
        )
        return self._public_url(self.pdf_bucket, destination_path)

    def upload_audiobook_bytes(self, file_bytes: bytes, destination_path: str) -> str:
        self.client.put_object(
            self.audiobook_bucket,
            destination_path,
            io.BytesIO(file_bytes),
            length=len(file_bytes),
            content_type="audio/mpeg",
        )
        return self._public_url(self.audiobook_bucket, destination_path)

    def delete_pdf(self, object_key: str) -> bool:
        try:
            self.client.remove_object(self.pdf_bucket, object_key)
            return True
        except Exception as e:
            print(f"Error deleting PDF from MinIO: {e}")
            return False

    def delete_audiobook(self, object_key: str) -> bool:
        try:
            self.client.remove_object(self.audiobook_bucket, object_key)
            return True
        except Exception as e:
            print(f"Error deleting audiobook from MinIO: {e}")
            return False

    def get_pdf_url(self, object_key: str) -> str:
        return self._public_url(self.pdf_bucket, object_key)

    def get_audiobook_url(self, object_key: str) -> str:
        return self._public_url(self.audiobook_bucket, object_key)


def _extract_object_key(url: str) -> str:
    """Extract the object key from a MinIO URL: http://host:port/bucket/key → key"""
    parsed = urlparse(url)
    parts = parsed.path.lstrip("/").split("/", 1)
    return parts[1] if len(parts) == 2 else parsed.path.lstrip("/")


_storage_instance: Optional[MinioStorage] = None


def get_storage() -> Optional[MinioStorage]:
    global _storage_instance
    if _storage_instance is None:
        try:
            _storage_instance = MinioStorage()
        except Exception as e:
            print(f"MinIO storage not available: {e}")
            return None
    return _storage_instance
