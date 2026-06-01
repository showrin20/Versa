# Technical Reference

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router 7, Axios |
| Backend | FastAPI 0.115, Python 3.11, Uvicorn |
| ORM | SQLAlchemy 2.0 |
| Database | PostgreSQL 15 |
| Object storage | MinIO (S3-compatible) |
| TTS | edge-tts (Microsoft Neural TTS) |
| Audio processing | pydub + ffmpeg |
| Web server | nginx (fronts the React SPA and proxies `/api/` to FastAPI) |
| Container runtime | Docker + Docker Compose |

---

## Database schema

All tables are created automatically via `Base.metadata.create_all()` at startup.

### `office_hours_entries`

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| date | String | YYYY-MM-DD |
| check_in_time | String | nullable |
| check_out_time | String | nullable |
| break_start | String | nullable |
| break_end | String | nullable |
| total_hours | Float | default 0 |
| break_duration | Float | default 0 |
| notes | Text | nullable |
| created_at | DateTime | server default now() |
| updated_at | DateTime | on update now() |

### `tasks`

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| title | String | |
| description | Text | nullable |
| category | String | urgent_important / urgent_not_important / not_urgent_important / not_urgent_not_important |
| priority | Integer | default 1 |
| completed | Boolean | default false |
| due_date | DateTime | nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

### `pdf_books`

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| name | String | display name |
| original_filename | String | |
| file_path | String | MinIO URL or local path |
| total_pages | Integer | |
| current_page | Integer | |
| current_chunk | Integer | |
| current_sentence | Integer | |
| progress_percentage | Float | |
| reading_mode | String | "chunk" or "sentence" |
| status | String | "reading", "completed", "paused" |
| audiobook_path | String | MinIO URL or local path; nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

### `reading_sessions`

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| book_id | Integer | FK to pdf_books.id (no DB constraint) |
| chunks_read | Integer | |
| time_spent | Float | minutes |
| session_date | DateTime | server default now() |

---

## Object storage layout (MinIO)

| Bucket | Contents |
|--------|----------|
| `pdfs` | Uploaded PDF files at path `uploads/<filename>` |
| `audiobooks` | Generated MP3 files at path `<sanitized_book_name>.mp3` |

Both buckets are created automatically and set to **public read** on backend startup.  
Files stored in MinIO have their URLs persisted in the database (`file_path`, `audiobook_path`).  
When MinIO is unreachable, files are saved locally (`backend/uploads/` and `backend/data/audiobooks/`) and the local path is stored instead.

---

## Audiobook generation pipeline

1. Frontend extracts text from the PDF and sends it in the POST `/audiobooks/start` body.
2. Backend queues an async task (in-memory `JOBS` dict).
3. `_run_generation` chunks the text (max 2 500 chars), filters non-speakable content, and calls `edge_tts.Communicate` per chunk.
4. Raw audio bytes are written to temporary `.wav` files in `data/audiobooks/`.
5. `pydub` + ffmpeg concatenates all parts into a single `.mp3`.
6. The MP3 is uploaded to MinIO; the local temp file is deleted on success.
7. The `pdf_books.audiobook_path` column is updated with the MinIO URL.
8. Frontend polls `GET /audiobooks/{job_id}/status` until `state == "completed"`.

Note: the in-memory `JOBS` dict resets on restart. For production workloads, replace it with Redis + Celery or a persistent job queue.

---

## API endpoints

See `backend/app/api/endpoints/` for full implementation. Interactive docs at `http://localhost:8000/docs`.

### Office Hours — `/api/v1/office-hours`
- `GET /` — list all
- `POST /` — create
- `GET /{id}` — get one
- `GET /date/{date}` — get by date string
- `PUT /{id}` — update
- `DELETE /{id}` — delete

### Tasks — `/api/v1/tasks`
- `GET /` — list all
- `POST /` — create
- `GET /{id}` — get one
- `GET /category/{category}` — filter by category
- `PUT /{id}` — update
- `DELETE /{id}` — delete

### PDF Books — `/api/v1/pdf-books`
- `GET /` — list all
- `POST /upload` — multipart upload
- `GET /{id}` — get one
- `GET /{id}/download` — download file (redirect to MinIO URL or FileResponse)
- `PUT /{id}` — update progress/status
- `DELETE /{id}` — delete record + file
- `POST /{id}/sessions` — create reading session
- `GET /{id}/sessions` — list sessions for book

### Audiobooks — `/api/v1/audiobooks`
- `POST /start` — begin generation job
- `GET /{job_id}/status` — poll status (`queued` → `running` → `completed` / `failed`)
- `GET /{job_id}/download` — download MP3
- `GET /book/{book_id}/download` — download via book ID

### Reading Sessions — `/api/v1/reading-sessions`
- `GET /`, `POST /`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`

---

## Deployment considerations

### Docker Compose (recommended)
The `docker-compose.yml` at the repo root defines four services: `postgres`, `minio`, `backend`, `frontend`.  
Service startup order is enforced via health checks (`depends_on: condition: service_healthy`).

### Scaling
- The backend is stateless except for the in-memory `JOBS` dict. A single replica is safe; multiple replicas require a shared job store (Redis).
- MinIO can be configured as a distributed cluster for production; update `MINIO_ENDPOINT` in the backend environment.

### TLS / Reverse proxy
Set `MINIO_SECURE=true` and `MINIO_ENDPOINT=minio.yourdomain.com:443` when fronting MinIO with an HTTPS reverse proxy.  
Update `MINIO_PUBLIC_URL` to the public HTTPS URL so generated download links work from the browser.

### Secrets
Never commit `.env` to version control. In CI/CD, inject secrets as environment variables rather than using a `.env` file.  
Generate `SECRET_KEY` with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Backend exits immediately | PostgreSQL not ready | Compose health check retries 5×; ensure `postgres` container is healthy |
| `minio.S3Error: NoSuchBucket` | Bucket creation race | Storage class creates buckets on init; restart backend |
| Audiobook stuck at `running` | ffmpeg not in PATH | Dockerfile installs ffmpeg; for local dev install it manually |
| PDF upload returns 500 | MinIO unreachable | Check `MINIO_ENDPOINT`; file will fall back to local `uploads/` |
| CORS error in browser | `FRONTEND_URL` mismatch | Set `FRONTEND_URL` env var to the exact origin used by the browser |
| `psycopg2.OperationalError` | Wrong `DATABASE_URL` | Verify host (`postgres` in Docker, `localhost` locally), credentials, and DB name |
