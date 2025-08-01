#!/bin/bash

# Versatile Project Development Setup Script

echo "🚀 Starting Versatile Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Backend Setup
echo -e "${BLUE}📦 Setting up Backend...${NC}"
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Create database if it doesn't exist
echo -e "${YELLOW}Setting up database...${NC}"
python -c "
from app.core.database import engine, Base
from app.models import models
print('Creating database tables...')
Base.metadata.create_all(bind=engine)
print('Database setup complete!')
"

# Go back to root and setup frontend
cd ..
echo -e "${BLUE}⚛️  Setting up Frontend...${NC}"
cd frontend

# Install Node dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
npm install

# Go back to root
cd ..

echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${BLUE}📝 To start the development servers:${NC}"
echo -e "1. Backend:  ${YELLOW}cd backend && source venv/bin/activate && uvicorn app.main:app --reload${NC}"
echo -e "2. Frontend: ${YELLOW}cd frontend && npm run dev${NC}"
echo ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo -e "Frontend: ${YELLOW}http://localhost:5173${NC}"
echo -e "Backend:  ${YELLOW}http://localhost:8000${NC}"
echo -e "API Docs: ${YELLOW}http://localhost:8000/docs${NC}"
