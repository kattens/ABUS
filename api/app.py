"""
FastAPI app exposing:
- GET /api/models                 -> list of model names
- GET /api/models/{name}          -> {category: {subcategory: score}}
- GET /api/models/{name}/full     -> includes weights + notes
- GET /api/score/{name}           -> computed per-category averages + overall
- POST /api/models/upsert         -> upsert model with categories/subfeatures
- POST /api/compute?a=..&b=..     -> demo math endpoint
- GET /health                     -> health check
- GET /                           -> redirect to docs

Also mounts /web (static) so you can open the site from the API (same origin).
"""

# --- ensure project root (parent of /api) is importable, so 'services' works ---
import os, sys
ROOT = os.path.dirname(os.path.dirname(__file__))  # ABUS project root
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from typing import Dict
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

# -----------------------------------------------------------------------------
# App setup
# -----------------------------------------------------------------------------
app = FastAPI(title="ABUS API", version="0.1.0")

# CORS for local dev (allow web on 127.0.0.1:5500 OR same-origin if using /web)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "*",  # fine for local dev; tighten in prod
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure tables exist (safe if already created)
init_db()

# Optionally serve the frontend from the same origin to avoid CORS entirely
WEB_DIR = os.path.join(ROOT, "web")
if os.path.isdir(WEB_DIR):
    app.mount("/web", StaticFiles(directory=WEB_DIR, html=True), name="web")

# -----------------------------------------------------------------------------
# Utilities
# -----------------------------------------------------------------------------
@app.get("/")
def root():
    # Open API docs by default; you can switch to "/web/" if you prefer landing on the site.
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"ok": True}

# -----------------------------------------------------------------------------
# Read-only endpoints
# -----------------------------------------------------------------------------
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

        # Build nested shape: {category: {subcategory: score}}
        out: Dict[str, Dict[str, float]] = {}
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

# -----------------------------------------------------------------------------
# Compute/scoring
# -----------------------------------------------------------------------------
@app.get("/api/score/{name}")
def get_score(name: str):
    with get_session() as s:
        try:
            return compute_model_scores(s, name)
        except ValueError as e:
            raise HTTPException(404, str(e))

@app.post("/api/compute")
def compute(a: float, b: float):
    # Placeholder math; swap in your real formula when ready
    if a == 0 or b == 0:
        return {"result": 0.0}
    return {"result": 2 * (a * b) / (a + b)}  # harmonic-mean style

# -----------------------------------------------------------------------------
# Upsert (create/update a full model via payload)
# -----------------------------------------------------------------------------
@app.post("/api/models/upsert")
def models_upsert(payload: dict = Body(...)):
    with get_session() as s, s.begin():
        try:
            model_name = upsert_model_from_payload(s, payload)
        except ValueError as e:
            raise HTTPException(400, str(e))
        return {"ok": True, "name": model_name}
