# api/app.py
import os, sys
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import select

from api.db import init_db, get_session
from api.db_models import Model, Category, Subcategory, Score
from services.scoring_service import (
    compute_model_scores,
    get_model_full as svc_get_model_full,
    upsert_model_from_payload,
)

# ---------------------------------------------------------------------
# FastAPI setup
# ---------------------------------------------------------------------
app = FastAPI(title="ABUS API", version="0.1.0")

# Allow local & container access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB tables (safe if already exists)
init_db()

# Serve static files from /web folder (frontend)
ROOT = os.path.dirname(os.path.dirname(__file__))  # project root
WEB_DIR = os.path.join(ROOT, "web")
if os.path.isdir(WEB_DIR):
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")

@app.get("/")
def root():
    # Redirect root to web index.html
    return RedirectResponse("/index.html")

@app.get("/health")
def health():
    return {"ok": True}

# ---------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------
@app.get("/api/models")
def list_models():
    with get_session() as s:
        names = [m.name for m in s.exec(select(Model)).all()]
    return {"models": sorted(names)}

@app.get("/api/models/{name}")
def get_model(name: str):
    with get_session() as s:
        m = s.exec(select(Model).where(Model.name == name)).first()
        if not m:
            raise HTTPException(404, f"Model '{name}' not found")

        out = {}
        scores = s.exec(select(Score).where(Score.model_id == m.id)).all()
        for sc in scores:
            sub = s.get(Subcategory, sc.subcategory_id)
            cat = s.get(Category, sub.category_id)
            out.setdefault(cat.name, {})[sub.name] = float(sc.value)
        return out

@app.get("/api/models/{name}/full")
def get_model_full(name: str):
    with get_session() as s:
        try:
            return svc_get_model_full(s, name)
        except ValueError as e:
            raise HTTPException(404, str(e))

@app.get("/api/score/{name}")
def get_score(name: str):
    with get_session() as s:
        try:
            return compute_model_scores(s, name)
        except ValueError as e:
            raise HTTPException(404, str(e))

@app.post("/api/compute")
def compute(a: float, b: float):
    if a == 0 or b == 0:
        return {"result": 0.0}
    return {"result": 2 * (a * b) / (a + b)}  # harmonic mean

@app.post("/api/models/upsert")
def models_upsert(payload: dict = Body(...)):
    with get_session() as s, s.begin():
        try:
            model_name = upsert_model_from_payload(s, payload)
        except ValueError as e:
            raise HTTPException(400, str(e))
        return {"ok": True, "name": model_name}
