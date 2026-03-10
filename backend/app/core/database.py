import re
from urllib.parse import quote
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


def _safe_database_url(url: str) -> str:
    """
    Re-encode special characters (e.g. '#') in the password part of a database URL.
    Standard URL parsers treat '#' as a fragment delimiter, which breaks connection strings.
    """
    # Match: scheme://user:password@rest
    match = re.match(r'^(postgresql(?:\+\w+)?://[^:]+:)([^@]+)(@.+)$', url)
    if match:
        scheme_user = match.group(1)
        password = match.group(2)
        rest = match.group(3)
        if any(c in password for c in '#@?%'):
            encoded_password = quote(password, safe='')
            return f"{scheme_user}{encoded_password}{rest}"
    return url


# For Supabase with pgbouncer, remove the pgbouncer parameter
# psycopg2 doesn't recognize it, but the pooler connection still works
database_url = settings.database_url
if "pgbouncer=true" in database_url:
    database_url = database_url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")

# Encode any special characters in the password
database_url = _safe_database_url(database_url)

# Create engine with appropriate settings for PostgreSQL or SQLite
if database_url.startswith("postgresql"):
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10
    )
else:
    # SQLite settings
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
