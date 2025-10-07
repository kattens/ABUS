# api/db.py
"""
Handles database connection and session management for ABUS.
- Loads DATABASE_URL from .env (default: SQLite file abus.db)
- Creates an engine
- IMPORTANT: imports db_models before create_all so tables are registered
- Provides helpers to initialize tables and open sessions
"""
import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./abus.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

def init_db():
    # ensure model classes are imported so SQLModel knows about them
    from api import db_models  # noqa: F401

    SQLModel.metadata.create_all(engine)

def get_session():
    return Session(engine)
