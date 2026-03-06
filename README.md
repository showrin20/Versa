# Versatile - Modern Productivity Platform

A full-stack productivity platform built with React, FastAPI, and SQLite.

## 🚀 Features

### 📚 ADHD-Friendly PDF Reader
- **Chunk-based reading**: Break down documents into manageable pieces
- **Progress tracking**: Monitor your reading sessions and progress
- **Time tracking**: See how much time you spend reading
- **Session management**: Start and stop reading sessions with detailed logs

### ⏰ Office Hours Tracker
- **Precise time tracking**: Check in/out with exact timestamps
- **Break management**: Track break times automatically
- **Daily summaries**: See total hours worked and break time
- **Historical data**: View past work sessions and patterns
- **Notes support**: Add notes to your work sessions

### 📋 Task Management Hub (Eisenhower Matrix)
- **Priority quadrants**: Organize tasks by urgency and importance
- **Task categories**: 
  - Urgent & Important (Do First)
  - Urgent & Not Important (Delegate) 
  - Not Urgent & Important (Schedule)
  - Not Urgent & Not Important (Eliminate)
- **Task completion**: Mark tasks as complete
- **Real-time updates**: Changes sync immediately

### 🎯 Productivity Center
- **Curated tips**: Research-backed productivity techniques
- **ADHD-specific strategies**: Tailored advice for ADHD minds
- **Category filtering**: Find tips by focus area
- **Quick tool access**: Easy navigation to all productivity tools

## 🛠 Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **SQLite**: Lightweight, serverless database
- **Pydantic**: Data validation using Python type hints
- **Alembic**: Database migration tool
- **Python 3.9+**: Core language

### Frontend
- **React 18**: Modern UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

### Deployment & Infrastructure
- **Docker**: Containerization platform
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Web server and reverse proxy (production)
- **Multi-stage builds**: Optimized production images

## 📦 Project Structure

```
Versa/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   │   └── endpoints/
│   │   ├── core/           # Core configuration
│   │   ├── crud/           # Database operations
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── main.py         # FastAPI app entry point
│   ├── requirements.txt    # Python dependencies
│   └── venv/              # Python virtual environment
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript type definitions
│   │   └── App.tsx        # Main app component
│   ├── public/            # Static assets
│   ├── package.json       # Node dependencies
│   └── vite.config.ts     # Vite configuration
├── setup-dev.sh           # Development setup script
└── README.md              # This file
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

#### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

#### Production Deployment
```bash
# Build and start services
./docker-run.sh build
./docker-run.sh up

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Documentation: http://localhost:8000/docs
```

#### Development Environment
```bash
# Start development environment with hot reloading
./docker-run.sh dev

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
```

See [DOCKER.md](DOCKER.md) for detailed Docker documentation.

### Option 2: Local Development

#### Prerequisites
- Python 3.9 or higher
- Node.js 16 or higher
- npm or yarn

#### 1. Clone and Setup
```bash
# Navigate to the project directory
cd /Users/showrinrahman/Desktop/Versatile/Versa

# Run the setup script (macOS/Linux)
./setup-dev.sh

# Or setup manually:
```

### 2. Manual Setup

#### Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create database
python -c "from app.core.database import engine, Base; from app.models import models; Base.metadata.create_all(bind=engine)"
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install
```

### 3. Start Development Servers

#### Backend (Terminal 1)
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

#### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📋 API Endpoints

### Office Hours
- `GET /api/v1/office-hours/` - Get all entries
- `POST /api/v1/office-hours/` - Create new entry
- `GET /api/v1/office-hours/{id}` - Get entry by ID
- `PUT /api/v1/office-hours/{id}` - Update entry
- `DELETE /api/v1/office-hours/{id}` - Delete entry
- `GET /api/v1/office-hours/date/{date}` - Get entry by date

### Tasks
- `GET /api/v1/tasks/` - Get all tasks
- `POST /api/v1/tasks/` - Create new task
- `GET /api/v1/tasks/{id}` - Get task by ID
- `PUT /api/v1/tasks/{id}` - Update task
- `DELETE /api/v1/tasks/{id}` - Delete task
- `GET /api/v1/tasks/category/{category}` - Get tasks by category

### PDF Books
- `GET /api/v1/pdf-books/` - Get all books
- `POST /api/v1/pdf-books/upload` - Upload new book
- `GET /api/v1/pdf-books/{id}` - Get book by ID
- `PUT /api/v1/pdf-books/{id}` - Update book
- `DELETE /api/v1/pdf-books/{id}` - Delete book

### Reading Sessions
- `GET /api/v1/reading-sessions/` - Get all sessions
- `POST /api/v1/reading-sessions/` - Create new session
- `GET /api/v1/reading-sessions/{id}` - Get session by ID
- `PUT /api/v1/reading-sessions/{id}` - Update session
- `DELETE /api/v1/reading-sessions/{id}` - Delete session

## 🎨 Features Overview

### ADHD-Friendly Design
- **Clear visual hierarchy**: Easy to scan and understand
- **Minimal distractions**: Clean, focused interface
- **Progress indicators**: Visual feedback on all actions
- **Chunk-based reading**: Break complex content into manageable pieces
- **Time awareness**: Always visible time tracking

### Responsive Design
- **Mobile-first**: Works great on all device sizes
- **Touch-friendly**: Large click targets and intuitive gestures
- **Fast loading**: Optimized for performance

### Data Persistence
- **Local database**: All data stored locally in SQLite
- **Real-time sync**: Changes reflected immediately
- **Data validation**: Type-safe operations throughout

## 🔧 Development

### Adding New Features
1. **Backend**: Add new models, schemas, CRUD operations, and endpoints
2. **Frontend**: Create components, add types, and integrate with API
3. **Database**: Use Alembic for migrations if schema changes are needed

### Code Style
- **Backend**: Follow PEP 8 Python style guide
- **Frontend**: Use ESLint and Prettier for consistent formatting
- **TypeScript**: Strict type checking enabled

### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests  
cd frontend
npm test
```

## 📈 Future Enhancements

- [ ] User authentication and multi-user support
- [ ] Cloud sync and backup
- [ ] Advanced analytics and reporting
- [ ] Mobile app (React Native)
- [ ] Calendar integration
- [ ] Email notifications
- [ ] Dark mode theme
- [ ] Import/export functionality
- [ ] Advanced PDF features (annotations, bookmarks)
- [ ] Collaboration features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Original HTML/CSS/JS version provided the foundation
- ADHD community for productivity insights
- Open source libraries that made this possible

## 📞 Support

If you encounter any issues or have questions:
1. Check the API documentation at http://localhost:8000/docs
2. Review the console for error messages
3. Ensure both frontend and backend servers are running
4. Verify database is properly initialized

---

**Built with ❤️ for productivity and ADHD-friendly workflows**
