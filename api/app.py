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
"""

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlmodel import select

from api.db import init_db, get_session
from api.db_models import Model, Category, Subcategory, Score, ModelCategory
from services.scoring_service import (
    compute_model_scores,
    get_model_full as svc_get_model_full,
    upsert_model_from_payload,
)

# App setup
app = FastAPI(title="ABUS API", version="0.1.0")

# Allow local static page to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure tables exist (safe if already created)
init_db()

# Utilities
@app.get("/")
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"ok": True}

# Read-only endpoints
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
        out = {}
        scores = s.exec(select(Score).where(Score.model_id == m.id)).all()
        for sc in scores:
            sub = s.get(Subcategory, sc.subcategory_id)
            cat = s.get(Category, sub.category_id)
            out.setdefault(cat.name, {})[sub.name] = sc.value
        return out

@app.get("/api/models/{name}/full")
def get_model_full(name: str):
    with get_session() as s:
        try:
            return svc_get_model_full(s, name)
        except ValueError as e:
            raise HTTPException(404, str(e))

# Compute/scoring
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

# Upsert (create/update a full model via payload)
@app.post("/api/models/upsert")
def models_upsert(payload: dict = Body(...)):
    with get_session() as s, s.begin():
        try:
            model_name = upsert_model_from_payload(s, payload)
        except ValueError as e:
            raise HTTPException(400, str(e))
        return {"ok": True, "name": model_name}
