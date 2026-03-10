"""
One-time setup script to create Supabase Storage buckets and database tables.
Run this once before deploying:
  cd backend && python setup_supabase.py
Requires SUPABASE_SERVICE_KEY in .env (the service_role key from Supabase dashboard).
"""
import os
from dotenv import load_dotenv
load_dotenv(override=True)

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    print("Get the service_role key from: Supabase Dashboard → Settings → API → service_role")
    exit(1)

client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("Creating Supabase Storage buckets...")
for bucket_name in ["pdfs", "audiobooks"]:
    try:
        client.storage.create_bucket(bucket_name, options={"public": True})
        print(f"  ✓ Created bucket: {bucket_name}")
    except Exception as e:
        msg = str(e)
        if "already exists" in msg.lower() or "Duplicate" in msg:
            print(f"  • Bucket already exists: {bucket_name}")
        else:
            print(f"  ✗ Error creating {bucket_name}: {e}")

# Verify buckets
buckets = client.storage.list_buckets()
print(f"\nExisting buckets: {[b.name for b in buckets]}")

# Create database tables
print("\nCreating database tables...")
try:
    from app.core.database import engine, Base
    import app.models.models  # noqa: F401 - ensure models are registered
    Base.metadata.create_all(bind=engine)
    print("  ✓ All tables created successfully")
    print("  Tables:", [t.name for t in Base.metadata.sorted_tables])
except Exception as e:
    print(f"  ✗ Error creating tables: {e}")

print("\nSetup complete!")
