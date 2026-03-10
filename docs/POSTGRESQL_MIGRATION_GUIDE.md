# PostgreSQL (Supabase) Migration Guide

## ✅ What Has Been Set Up

1. **Environment Configuration**: Created `.env` file with your Supabase PostgreSQL connection
2. **Database Driver**: Added `psycopg2-binary` to requirements.txt
3. **Database Configuration**: Updated to support both SQLite and PostgreSQL
4. **Migration Scripts**: Created scripts to set up and migrate data

## 🚀 Migration Steps

### Step 1: Install PostgreSQL Driver

```bash
cd backend
pip install psycopg2-binary
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

### Step 2: Create Tables in PostgreSQL

Run the migration script to create all tables:

```bash
python migrate_to_postgresql.py
```

This will create:
- `office_hours_entries` table
- `tasks` table
- `pdf_books` table (with `audiobook_path` column)
- `reading_sessions` table

### Step 3 (Optional): Migrate Existing Data

If you have existing data in SQLite that you want to keep:

```bash
python migrate_sqlite_to_postgresql.py
```

⚠️ **Note**: If you're starting fresh, skip this step!

### Step 4: Update File Paths (if migrating data)

If you migrated data and have PDF files, make sure the file paths in `pdf_books` table are accessible from your server.

### Step 5: Restart Your Backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🔧 Configuration Details

### Database Connection String
```
postgresql://postgres:%23Labibshowrin7@db.eyjcdihbpybabtxukopa.supabase.co:5432/postgres
```

**Note**: The `%23` is URL-encoded `#` symbol in your password.

### Environment Variables (.env)
```env
DATABASE_URL=postgresql://postgres:%23Labibshowrin7@db.eyjcdihbpybabtxukopa.supabase.co:5432/postgres
```

## 📊 Supabase Dashboard

You can view your data in the Supabase dashboard:
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to "Table Editor" to see your tables

## 🔍 Verification

After migration, verify the setup:

```bash
# Check tables exist
python -c "from app.core.database import engine; from sqlalchemy import inspect; print(inspect(engine).get_table_names())"
```

## 🔄 Switching Back to SQLite (if needed)

If you need to switch back to SQLite:

1. Update `.env`:
   ```env
   DATABASE_URL=sqlite:///./versatile.db
   ```

2. Restart the backend

## 📝 Table Structure

### office_hours_entries
- id, date, check_in_time, check_out_time
- break_start, break_end, total_hours, break_duration
- notes, created_at, updated_at

### tasks
- id, title, description, category
- priority, completed, due_date
- created_at, updated_at

### pdf_books
- id, name, original_filename, file_path
- total_pages, current_page, current_chunk, current_sentence
- progress_percentage, reading_mode, status
- **audiobook_path** (NEW!)
- created_at, updated_at

### reading_sessions
- id, book_id, chunks_read, time_spent
- session_date

## 🎯 Benefits of PostgreSQL

- **Scalability**: Better for production
- **Concurrent Access**: Multiple users can access simultaneously
- **Cloud Hosted**: Your data is backed up on Supabase
- **Better Performance**: For larger datasets
- **Remote Access**: Access from anywhere

## ⚠️ Important Notes

1. **File Storage**: PDF files and audiobooks are still stored locally. Consider moving to Supabase Storage or S3 for production.

2. **Connection Pooling**: The app uses connection pooling (pool_size=10, max_overflow=20) for better performance.

3. **Backup**: Supabase provides automatic backups, but consider periodic manual backups for critical data.

4. **Security**: 
   - Change your SECRET_KEY in .env for production
   - Consider using connection pooling services like PgBouncer
   - Never commit .env file to git

## 🐛 Troubleshooting

### Connection Errors
```bash
# Test connection
python -c "from app.core.database import engine; engine.connect(); print('✅ Connected!')"
```

### Password Issues
If you have special characters in password, make sure they're URL-encoded:
- `#` → `%23`
- `@` → `%40`
- `&` → `%26`

### Table Not Found
Run the migration script again:
```bash
python migrate_to_postgresql.py
```

## 📞 Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Verify connection string
3. Ensure psycopg2-binary is installed
4. Check firewall/network settings

---

**Status**: Ready to migrate! Follow the steps above. 🚀
