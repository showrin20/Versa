"""
Direct migration script - bypasses config.py caching
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv(override=True)

# For migrations, use DIRECT_URL which doesn't have pgbouncer
DATABASE_URL = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')

print(f"📡 Connecting to: {DATABASE_URL[:50]}...")

# Import after setting up connection
from app.models.models import Base

# Create engine directly
if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

def migrate():
    """Create all tables"""
    print("🔄 Creating all tables in database...")
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        
        print("\n📋 Created tables:")
        for table in Base.metadata.sorted_tables:
            print(f"   - {table.name}")
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise

if __name__ == "__main__":
    migrate()
