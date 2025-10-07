# tools/check_db.py
"""
Confirms which SQLite file is used, lists tables, and shows row counts.
Run:  python tools/check_db.py
"""
import os
from dotenv import load_dotenv
from sqlmodel import create_engine
from sqlalchemy import text

load_dotenv()
url = os.getenv("DATABASE_URL", "sqlite:///./abus.db")
print(f"DATABASE_URL = {url}")

# Build engine exactly like api/db.py (works for sqlite path issues)
connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
engine = create_engine(url, echo=False, connect_args=connect_args)

with engine.connect() as con:
    # What file is SQLite actually opening?
    if url.startswith("sqlite"):
        fp = con.execute(text("PRAGMA database_list;")).fetchall()
        print("SQLite database_list:", fp)

    # List tables
    tables = con.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")).fetchall()
    print("Tables:", [t[0] for t in tables])

    # Row counts (if tables exist)
    for t in ["models", "categories", "subcategories", "scores"]:
        try:
            c = con.execute(text(f"SELECT COUNT(*) FROM {t};")).scalar_one()
            print(f"{t}: {c} rows")
        except Exception as e:
            pass
