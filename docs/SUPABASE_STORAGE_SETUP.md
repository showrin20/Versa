# Supabase Storage Setup Guide

## 🎯 Overview
Your Versa app is now configured to use Supabase Storage for PDFs and audiobooks instead of local file storage.

## ✅ What's Been Set Up

1. **Storage Configuration**: Added Supabase storage URLs to `.env`
2. **Storage Utility**: Created `/app/core/storage.py` with upload/download functions
3. **Python Client**: Installed `supabase` package

## 🔑 Required: Get Your Supabase API Key

You need to add your Supabase anonymous key to the `.env` file:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (eyjcdihbpybabtxukopa)
3. Go to **Settings** → **API**
4. Copy the **anon/public** key
5. Update `.env` file:

```env
SUPABASE_KEY=your-actual-anon-key-here
```

## 📦 Create Storage Buckets

Before uploading files, you need to create two storage buckets in Supabase:

### Method 1: Using Supabase Dashboard

1. Go to **Storage** in your Supabase dashboard
2. Click **New Bucket**
3. Create bucket named `pdfs`
   - Set as **Public bucket** (so files can be downloaded)
   - Click **Create bucket**
4. Create another bucket named `audiobooks`
   - Set as **Public bucket**
   - Click **Create bucket**

### Method 2: Using SQL (Run in Supabase SQL Editor)

```sql
-- Create pdfs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true);

-- Create audiobooks bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audiobooks', 'audiobooks', true);

-- Set up storage policies to allow public access
CREATE POLICY "Public Access for PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdfs');

CREATE POLICY "Public Access for Audiobooks"
ON storage.objects FOR SELECT
USING (bucket_id = 'audiobooks');

-- Allow authenticated uploads (adjust as needed)
CREATE POLICY "Authenticated uploads for PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Authenticated uploads for Audiobooks"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audiobooks');
```

## 🔄 How to Use Storage

### Upload a PDF
```python
from app.core.storage import get_storage

storage = get_storage()
if storage:
    public_url = storage.upload_pdf(
        file_path="/local/path/to/book.pdf",
        destination_path="books/unique-book-id.pdf"
    )
    print(f"PDF uploaded: {public_url}")
```

### Upload an Audiobook
```python
from app.core.storage import get_storage

storage = get_storage()
if storage:
    public_url = storage.upload_audiobook(
        file_path="/local/path/to/audiobook.mp3",
        destination_path="audiobooks/unique-book-id.mp3"
    )
    print(f"Audiobook uploaded: {public_url}")
```

### Get File URLs
```python
# Get public URL for existing files
pdf_url = storage.get_pdf_url("books/my-book.pdf")
audio_url = storage.get_audiobook_url("audiobooks/my-book.mp3")
```

### Delete Files
```python
storage.delete_pdf("books/my-book.pdf")
storage.delete_audiobook("audiobooks/my-book.mp3")
```

## 📁 Migration Strategy

### Option 1: Migrate Existing Files
If you have existing PDFs and audiobooks locally, you can migrate them:

```python
import os
from app.core.storage import get_storage
from app.core.database import SessionLocal
from app.models.models import PDFBook

storage = get_storage()
db = SessionLocal()

# Migrate PDFs
books = db.query(PDFBook).all()
for book in books:
    if os.path.exists(book.file_path):
        # Upload to Supabase
        dest_path = f"books/{book.id}_{book.original_filename}"
        public_url = storage.upload_pdf(book.file_path, dest_path)
        
        # Update database
        book.file_path = public_url
        db.commit()
        print(f"✅ Migrated: {book.name}")
```

### Option 2: Hybrid Approach
- Keep existing files local
- Use Supabase Storage for new uploads
- Update upload endpoints to use storage

## 🔧 Update Your API Endpoints

### For PDF Upload (modify `pdf_books.py`):
```python
from app.core.storage import get_storage

@router.post("/upload", response_model=PDFBook)
async def upload_pdf_book(
    file: UploadFile = File(...),
    name: str = None,
    db: Session = Depends(get_db)
):
    storage = get_storage()
    
    if storage:
        # Save temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Upload to Supabase
        dest_path = f"books/{uuid.uuid4()}_{file.filename}"
        public_url = storage.upload_pdf(temp_path, dest_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        # Store URL in database
        book_create = PDFBookCreate(name=name or file.filename)
        return crud.create_pdf_book(
            db=db,
            book=book_create,
            file_path=public_url,  # Store Supabase URL
            original_filename=file.filename
        )
    else:
        # Fallback to local storage
        # ... existing code ...
```

### For Audiobook Generation (modify `audiobooks.py`):
```python
# After generating audiobook
storage = get_storage()
if storage:
    dest_path = f"audiobooks/{sanitized_book_name}.mp3"
    public_url = storage.upload_audiobook(str(out_file), dest_path)
    
    # Update database with Supabase URL
    crud.update_pdf_book(db_session, book_id=book_id, book_update={"audiobook_path": public_url})
    
    # Optionally delete local file
    out_file.unlink()
```

## 🔐 Security Considerations

1. **API Keys**: Never commit your SUPABASE_KEY to git
2. **Bucket Policies**: Configure Row Level Security (RLS) policies
3. **File Size Limits**: Set upload limits in Supabase dashboard
4. **Rate Limiting**: Enable rate limiting for uploads

## 📊 Storage Limits

- **Free Plan**: 1 GB storage
- **Pro Plan**: 100 GB storage
- File upload size limit: Configure in dashboard

## 🧪 Testing

Test your setup:

```bash
cd backend
python -c "from app.core.storage import get_storage; s = get_storage(); print('✅ Storage configured!' if s else '❌ Config missing')"
```

## 🔄 Next Steps

1. ✅ Add your SUPABASE_KEY to `.env`
2. ✅ Create `pdfs` and `audiobooks` buckets
3. ✅ Update API endpoints to use Supabase Storage
4. ✅ Test file uploads
5. ✅ (Optional) Migrate existing files

---

**Benefits of Supabase Storage:**
- 🌐 CDN-backed for fast global access
- 🔒 Secure with built-in authentication
- 📈 Scalable storage
- 💰 Cost-effective
- 🔄 Automatic backups
- 🎯 Direct file access via URLs

Need help? Check the [Supabase Storage docs](https://supabase.com/docs/guides/storage)
