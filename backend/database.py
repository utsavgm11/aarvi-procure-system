import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load connection strings from your .env file
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("CRITICAL ERROR: DATABASE_URL is missing from your .env file!")

# Initialize the SQLAlchemy engine with pool safety options for serverless cloud databases
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # 🎯 NEW: Checks connection health before executing queries to prevent 500 errors
    pool_recycle=300     # 🎯 NEW: Automatically closes and refreshes connections older than 5 minutes
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to inject fresh database sessions into your API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()