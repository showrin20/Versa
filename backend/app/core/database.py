import re
from urllib.parse import quote
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


def _safe_database_url(url: str) -> str:
    """Re-encode special characters (e.g. '#') in the password portion of a database URL."""
    match = re.match(r'^(postgresql(?:\+\w+)?://[^:]+:)([^@]+)(@.+)$', url)
    if match:
        scheme_user, password, rest = match.group(1), match.group(2), match.group(3)
        if any(c in password for c in '#@?%'):
            return f"{scheme_user}{quote(password, safe='')}{rest}"
    return url


engine = create_engine(
    _safe_database_url(settings.database_url),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
