# tools/check_db.py
import os
from dotenv import load_dotenv, find_dotenv
from sqlmodel import create_engine, SQLModel
from sqlalchemy import text, func, select

# Load .env robustly even if cwd is different
load_dotenv(find_dotenv())

url = os.getenv("DATABASE_URL", "sqlite:///./abus.db")
print("DATABASE_URL =", url)

# Build engine like api/db.py
connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
engine = create_engine(url, echo=False, connect_args=connect_args)

with engine.connect() as con:
    # Show which file SQLite opened
    if url.startswith("sqlite"):
        rows = con.execute(text("PRAGMA database_list;")).fetchall()
        print("SQLite database_list:", rows)

    # List tables
    tables = con.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")).fetchall()
    print("Tables:", [t[0] for t in tables])

    # Count rows if tables exist
    for t in ("models", "categories", "subcategories", "scores"):
        try:
            n = con.execute(text(f"SELECT COUNT(*) FROM {t};")).scalar_one()
            print(f"{t}: {n} rows")
        except Exception as e:
            print(f"{t}: (no table) {e}")
