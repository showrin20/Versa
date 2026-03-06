# Docker Setup for Versa

This guide explains how to run the Versa productivity platform using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB of available disk space

## Quick Start

### 1. Production Deployment

```bash
# Build and start services
./docker-run.sh build
./docker-run.sh up

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Documentation: http://localhost:8000/docs
```

### 2. Development Environment

```bash
# Start development environment with hot reloading
./docker-run.sh dev

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
```

## Docker Management Script

The `docker-run.sh` script provides convenient commands for managing the Docker environment:

```bash
./docker-run.sh [command]
```

### Available Commands

| Command | Description |
|---------|-------------|
| `build` | Build Docker images |
| `up` | Start production services |
| `down` | Stop services |
| `dev` | Start development environment |
| `dev-down` | Stop development environment |
| `logs` | Show production logs |
| `logs-dev` | Show development logs |
| `clean` | Clean up containers and images |
| `reset` | Reset everything (clean + rebuild) |
| `status` | Show container status |
| `shell-backend` | Access backend container shell |
| `shell-frontend` | Access frontend container shell |
| `help` | Show help message |

## Architecture

### Services

1. **Backend** (`versa-backend`)
   - FastAPI application
   - Python 3.11 slim base image
   - Port: 8000
   - Health checks enabled

2. **Frontend** (`versa-frontend`)
   - React application served by Nginx
   - Multi-stage build (Node.js build + Nginx serve)
   - Port: 80 (production) / 5173 (development)
   - API proxy to backend

### Networks

- **versa-network**: Bridge network for production
- **versa-network-dev**: Bridge network for development

### Volumes

- **backend_data**: Persistent SQLite database storage
- **backend_data_dev**: Development database storage

## Configuration Files

### Docker Compose Files

- `docker-compose.yml`: Production environment
- `docker-compose.dev.yml`: Development environment with hot reloading

### Dockerfiles

- `backend/Dockerfile`: Production backend image
- `frontend/Dockerfile`: Production frontend image (multi-stage)
- `frontend/Dockerfile.dev`: Development frontend image

### Nginx Configuration

- `frontend/nginx.conf`: Nginx configuration for serving React app and proxying API calls

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `PYTHONPATH` | Python path | `/app` |
| `DATABASE_URL` | SQLite database URL | `sqlite:///./data/app.db` |
| `RELOAD` | Enable auto-reload (dev only) | `false` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL (dev only) | `http://localhost:8000` |

## Data Persistence

The SQLite database is stored in a Docker volume to ensure data persistence across container restarts:

- **Production**: `backend_data` volume mounted to `/app/data`
- **Development**: `backend_data_dev` volume mounted to `/app/data`

## Development Workflow

### 1. Start Development Environment

```bash
./docker-run.sh dev
```

This starts both services with:
- Hot reloading enabled
- Source code mounted as volumes
- Development ports exposed

### 2. View Logs

```bash
# All services
./docker-run.sh logs-dev

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend-dev
```

### 3. Access Container Shells

```bash
# Backend container
./docker-run.sh shell-backend

# Frontend container (development)
docker-compose -f docker-compose.dev.yml exec frontend-dev sh
```

### 4. Make Changes

- Backend changes are automatically reloaded via uvicorn
- Frontend changes trigger Vite hot module replacement

## Production Deployment

### 1. Build and Start

```bash
./docker-run.sh build
./docker-run.sh up
```

### 2. Monitor Services

```bash
# Check status
./docker-run.sh status

# View logs
./docker-run.sh logs

# Check health
docker-compose ps
```

### 3. Updates

```bash
# Rebuild and restart
./docker-run.sh reset
```

## Networking

### Internal Communication

- Frontend → Backend: `http://backend:8000`
- Services communicate via Docker's internal DNS

### External Access

- Frontend: `http://localhost` (port 80)
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

### Development Ports

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

## Security Features

### Frontend (Nginx)

- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- CORS handling for API requests
- Gzip compression enabled
- Static asset caching

### Backend

- Non-root user execution
- Minimal system dependencies
- Health checks

### General

- No unnecessary ports exposed
- Isolated networks
- Volume permissions

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check if ports are in use
   lsof -i :80
   lsof -i :8000
   lsof -i :5173
   ```

2. **Build failures**
   ```bash
   # Clean build cache
   docker builder prune
   
   # Rebuild without cache
   ./docker-run.sh clean
   ./docker-run.sh build
   ```

3. **Database issues**
   ```bash
   # Reset database
   docker volume rm versa_backend_data
   ./docker-run.sh up
   ```

4. **Network issues**
   ```bash
   # Recreate networks
   docker network prune
   ./docker-run.sh up
   ```

### Debugging

1. **Check logs**
   ```bash
   ./docker-run.sh logs
   ```

2. **Inspect containers**
   ```bash
   docker-compose ps
   docker inspect versa-backend
   docker inspect versa-frontend
   ```

3. **Test connectivity**
   ```bash
   # Test backend health
   curl http://localhost:8000/

   # Test frontend
   curl http://localhost/
   ```

## Resource Usage

### Minimum Requirements

- **CPU**: 1 core
- **RAM**: 1GB
- **Disk**: 2GB

### Recommended for Development

- **CPU**: 2+ cores
- **RAM**: 4GB+
- **Disk**: 5GB+

## Backup and Restore

### Backup Database

```bash
# Create backup directory
mkdir -p backups

# Copy database from volume
docker run --rm -v versa_backend_data:/data -v $(pwd)/backups:/backup alpine cp /data/app.db /backup/app-$(date +%Y%m%d-%H%M%S).db
```

### Restore Database

```bash
# Stop services
./docker-run.sh down

# Restore database
docker run --rm -v versa_backend_data:/data -v $(pwd)/backups:/backup alpine cp /backup/app-YYYYMMDD-HHMMSS.db /data/app.db

# Start services
./docker-run.sh up
```

## Performance Optimization

### Production

- Multi-stage builds minimize image size
- Nginx serves static files efficiently
- Gzip compression reduces bandwidth
- Health checks ensure service reliability

### Development

- Volume mounts enable hot reloading
- Separate development images
- Optimized for development workflow

## Contributing

When making changes to the Docker setup:

1. Test both production and development environments
2. Update this documentation
3. Ensure backwards compatibility
4. Test on different platforms (macOS, Linux, Windows)

## Support

For Docker-related issues:

1. Check the logs: `./docker-run.sh logs`
2. Verify container status: `./docker-run.sh status`
3. Try resetting: `./docker-run.sh reset`
4. Check Docker installation and version
