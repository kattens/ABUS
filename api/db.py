# api/db.py
"""
Database engine + session management.
- Reads DATABASE_URL from .env (default sqlite:///./abus.db)
- Enables SQLite foreign keys for data integrity
- Ensures models are imported before create_all()
"""

import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import event

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./abus.db")

# SQLite dev convenience; safe for local use. For Postgres, this is ignored.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)

# Enforce foreign keys on SQLite (off by default).
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()


def init_db() -> None:
    """
    Import model definitions and create tables if they don't exist.
    Must be called once at startup or before seeding.
    """
    # Important: ensure table metadata is registered
    from api import db_models  # noqa: F401
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    """Open a new DB session. Use with: `with get_session() as s:`"""
    return Session(engine)
