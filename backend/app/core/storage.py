"""
Supabase Storage utility for handling PDF and audiobook uploads
"""
from supabase import create_client, Client
from app.core.config import settings
from typing import Optional


class SupabaseStorage:
    """Handle file uploads to Supabase Storage"""

    def __init__(self):
        if not settings.supabase_url or not settings.supabase_key:
            raise ValueError("Supabase URL and Key must be set in environment variables")

        # Use service_role key for server-side operations (bypasses RLS)
        # Fall back to anon key if service key not provided
        api_key = settings.supabase_service_key or settings.supabase_key
        self.client: Client = create_client(settings.supabase_url, api_key)
        self.pdf_bucket = "pdfs"
        self.audiobook_bucket = "audiobooks"

    def upload_pdf(self, file_path: str, destination_path: str) -> str:
        """Upload a PDF file from disk to Supabase Storage, returns public URL."""
        with open(file_path, 'rb') as f:
            file_data = f.read()
        return self.upload_pdf_bytes(file_data, destination_path)

    def upload_pdf_bytes(self, file_bytes: bytes, destination_path: str) -> str:
        """Upload PDF bytes to Supabase Storage, returns public URL."""
        self.client.storage.from_(self.pdf_bucket).upload(
            path=destination_path,
            file=file_bytes,
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
        return self.client.storage.from_(self.pdf_bucket).get_public_url(destination_path)

    def upload_audiobook(self, file_path: str, destination_path: str) -> str:
        """Upload an audiobook file from disk to Supabase Storage, returns public URL."""
        with open(file_path, 'rb') as f:
            file_data = f.read()
        return self.upload_audiobook_bytes(file_data, destination_path)

    def upload_audiobook_bytes(self, file_bytes: bytes, destination_path: str) -> str:
        """Upload audiobook bytes to Supabase Storage, returns public URL."""
        self.client.storage.from_(self.audiobook_bucket).upload(
            path=destination_path,
            file=file_bytes,
            file_options={"content-type": "audio/mpeg", "upsert": "true"}
        )
        return self.client.storage.from_(self.audiobook_bucket).get_public_url(destination_path)

    def delete_pdf(self, file_path: str) -> bool:
        """Delete a PDF from storage"""
        try:
            self.client.storage.from_(self.pdf_bucket).remove([file_path])
            return True
        except Exception as e:
            print(f"Error deleting PDF: {e}")
            return False

    def delete_audiobook(self, file_path: str) -> bool:
        """Delete an audiobook from storage"""
        try:
            self.client.storage.from_(self.audiobook_bucket).remove([file_path])
            return True
        except Exception as e:
            print(f"Error deleting audiobook: {e}")
            return False

    def get_pdf_url(self, file_path: str) -> str:
        """Get public URL for a PDF"""
        return self.client.storage.from_(self.pdf_bucket).get_public_url(file_path)

    def get_audiobook_url(self, file_path: str) -> str:
        """Get public URL for an audiobook"""
        return self.client.storage.from_(self.audiobook_bucket).get_public_url(file_path)


# Singleton instance
_storage_instance: Optional[SupabaseStorage] = None


def get_storage() -> Optional[SupabaseStorage]:
    """Get or create storage instance"""
    global _storage_instance

    if _storage_instance is None:
        try:
            _storage_instance = SupabaseStorage()
        except ValueError as e:
            print(f"Supabase Storage not configured: {e}")
            return None

    return _storage_instance
