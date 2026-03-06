#!/bin/bash

# Versa Docker Management Script
# Usage: ./docker-run.sh [command]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    echo "Versa Docker Management Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build         Build Docker images"
    echo "  up            Start services (production)"
    echo "  down          Stop services"
    echo "  dev           Start development environment"
    echo "  dev-down      Stop development environment"
    echo "  logs          Show logs"
    echo "  logs-dev      Show development logs"
    echo "  clean         Clean up containers and images"
    echo "  reset         Reset everything (clean + rebuild)"
    echo "  status        Show container status"
    echo "  shell-backend Access backend container shell"
    echo "  shell-frontend Access frontend container shell"
    echo "  help          Show this help message"
    echo ""
}

# Build images
build_images() {
    print_status "Building Docker images..."
    docker-compose build --no-cache
    print_success "Images built successfully!"
}

# Start production services
start_services() {
    print_status "Starting Versa services..."
    docker-compose up -d
    print_success "Services started! Access the app at http://localhost"
    print_status "Backend API: http://localhost:8000"
    print_status "API Documentation: http://localhost:8000/docs"
}

# Stop services
stop_services() {
    print_status "Stopping services..."
    docker-compose down
    print_success "Services stopped!"
}

# Start development environment
start_dev() {
    print_status "Starting development environment..."
    docker-compose -f docker-compose.dev.yml up -d
    print_success "Development environment started!"
    print_status "Frontend: http://localhost:5173"
    print_status "Backend API: http://localhost:8000"
}

# Stop development environment
stop_dev() {
    print_status "Stopping development environment..."
    docker-compose -f docker-compose.dev.yml down
    print_success "Development environment stopped!"
}

# Show logs
show_logs() {
    docker-compose logs -f
}

# Show development logs
show_dev_logs() {
    docker-compose -f docker-compose.dev.yml logs -f
}

# Clean up
cleanup() {
    print_warning "This will remove all Versa containers and images!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker-compose -f docker-compose.dev.yml down -v --remove-orphans
        docker system prune -f
        print_success "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Reset everything
reset_all() {
    cleanup
    build_images
}

# Show container status
show_status() {
    print_status "Container Status:"
    docker-compose ps
    echo ""
    print_status "Development Container Status:"
    docker-compose -f docker-compose.dev.yml ps
}

# Access backend shell
backend_shell() {
    docker-compose exec backend bash
}

# Access frontend shell
frontend_shell() {
    docker-compose exec frontend sh
}

# Main script logic
case "${1:-help}" in
    build)
        build_images
        ;;
    up)
        start_services
        ;;
    down)
        stop_services
        ;;
    dev)
        start_dev
        ;;
    dev-down)
        stop_dev
        ;;
    logs)
        show_logs
        ;;
    logs-dev)
        show_dev_logs
        ;;
    clean)
        cleanup
        ;;
    reset)
        reset_all
        ;;
    status)
        show_status
        ;;
    shell-backend)
        backend_shell
        ;;
    shell-frontend)
        frontend_shell
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
