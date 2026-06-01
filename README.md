# Versa

A full-stack productivity platform — ADHD-friendly PDF reader, office hours tracker, task management (Eisenhower Matrix), and AI-narrated audiobook generation.

---

## Features

- **PDF Reader** — chunk-based reading with progress tracking and session logs
- **Audiobook Generation** — convert PDFs to MP3 using edge-tts, stored in MinIO
- **Office Hours Tracker** — precise check-in/out, break management, daily summaries
- **Task Management** — Eisenhower Matrix quadrants with real-time updates

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Docker Engine | 20.10 |
| Docker Compose | 2.0 |

For local development without Docker:

| Tool | Minimum version |
|------|----------------|
| Python | 3.11 |
| Node.js | 18 |
| PostgreSQL | 15 |
| MinIO | RELEASE.2024+ |
| ffmpeg | 4.x |

---

## Quick start — Docker Compose

```bash
# 1. Clone the repo
git clone <repo-url>
cd Versa

# 2. Create your environment file
cp .env.example .env
#    Edit .env if you want non-default credentials.

# 3. Build and start all services
docker compose up --build

# 4. Open the app
#    Frontend:        http://localhost
#    Backend API:     http://localhost:8000
#    API docs:        http://localhost:8000/docs
#    MinIO console:   http://localhost:9001  (login: minioadmin / minioadmin123)
```

To stop: `docker compose down`  
To wipe volumes too: `docker compose down -v`

---

## Environment variables

Copy `.env.example` to `.env`. The defaults work for Docker Compose out of the box.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://versa:versa@postgres:5432/versa` | PostgreSQL connection string |
| `MINIO_ENDPOINT` | `minio:9000` | MinIO endpoint (internal, used by backend) |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin123` | MinIO secret key |
| `MINIO_SECURE` | `false` | Set `true` if MinIO is behind TLS |
| `MINIO_PUBLIC_URL` | `http://localhost:9000` | Browser-accessible MinIO URL for file downloads |
| `MINIO_BUCKET_PDF` | `pdfs` | Bucket name for PDFs |
| `MINIO_BUCKET_AUDIOBOOKS` | `audiobooks` | Bucket name for MP3 audiobooks |
| `SECRET_KEY` | *(must change)* | JWT signing key |
| `FRONTEND_URL` | `http://localhost` | Allowed CORS origin |

---

## Local development (without Docker)

### 1. Start dependencies

```bash
# PostgreSQL
# macOS: brew install postgresql && brew services start postgresql
# Linux: sudo systemctl start postgresql

# MinIO
# Download from https://min.io/download
./minio server /tmp/minio-data --console-address :9001
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Create a .env pointing at localhost
cat > .env <<EOF
DATABASE_URL=postgresql://versa:versa@localhost:5432/versa
MINIO_ENDPOINT=localhost:9000
MINIO_PUBLIC_URL=http://localhost:9000
EOF

uvicorn app.main:app --reload
```

### 3. Frontend

```bash
cd frontend
npm install

# Point the dev server at the local backend
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env

npm run dev
```

Access at `http://localhost:5173`.

---

## Project structure

```
Versa/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/endpoints/    # Route handlers
│   │   ├── core/             # config, database, storage (MinIO)
│   │   ├── crud/             # SQLAlchemy CRUD helpers
│   │   ├── models/           # ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Standalone services (YouTube uploader)
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/api.ts   # Axios API client
│   │   └── types/
│   ├── nginx.conf            # Production nginx config
│   └── Dockerfile
├── scripts/                  # Utility scripts
│   ├── assets/AI.png         # Cover image for MP4 generation
│   ├── mp3_to_mp4.py         # Split audiobook MP3 into MP4 segments
│   └── migrate_db.py         # Bootstrap database tables
├── docs/
│   └── TECHNICAL.md          # Architecture and deployment details
├── docker-compose.yml
└── .env.example
```

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/office-hours/` | List all entries |
| POST | `/api/v1/office-hours/` | Create entry |
| PUT | `/api/v1/office-hours/{id}` | Update entry |
| DELETE | `/api/v1/office-hours/{id}` | Delete entry |
| GET | `/api/v1/tasks/` | List all tasks |
| POST | `/api/v1/tasks/` | Create task |
| PUT | `/api/v1/tasks/{id}` | Update task |
| DELETE | `/api/v1/tasks/{id}` | Delete task |
| GET | `/api/v1/pdf-books/` | List all books |
| POST | `/api/v1/pdf-books/upload` | Upload PDF |
| GET | `/api/v1/pdf-books/{id}/download` | Download PDF |
| DELETE | `/api/v1/pdf-books/{id}` | Delete book |
| POST | `/api/v1/audiobooks/start` | Start audiobook generation |
| GET | `/api/v1/audiobooks/{job_id}/status` | Poll generation status |
| GET | `/api/v1/audiobooks/{job_id}/download` | Download completed audiobook |

Interactive docs: `http://localhost:8000/docs`

---

## License

MIT
