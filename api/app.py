# api/app.py
"""
ABUS API
- GET  /api/models                 -> list model names
- GET  /api/models/{name}          -> {category: {subcategory: score}}
- GET  /api/models/{name}/full     -> {category: {weight, subfeatures:{name:{score,note}}}}
- POST /api/compute?a=&b=          -> demo math endpoint
- GET  /                           -> redirects to /docs
- GET  /health                     -> "ok"
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, PlainTextResponse
from sqlmodel import select
from api.db import init_db, get_session
from api.db_models import Model, Category, Subcategory, Score, ModelCategory

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


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health", response_class=PlainTextResponse, include_in_schema=False)
def health():
    return "ok"


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
        m = s.exec(select(Model).where(Model.name == name)).first()
        if not m:
            raise HTTPException(404, f"Model '{name}' not found")

        # Collect per-category weight for this model
        cat_weights = {}
        for mc in s.exec(select(ModelCategory).where(ModelCategory.model_id == m.id)).all():
            cat_weights[mc.category_id] = mc.weight

        # Build: {category: {weight, subfeatures:{sub:{score, note}}}}
        out = {}
        scores = s.exec(select(Score).where(Score.model_id == m.id)).all()
        for sc in scores:
            sub = s.get(Subcategory, sc.subcategory_id)
            cat = s.get(Category, sub.category_id)
            if cat.name not in out:
                out[cat.name] = {
                    "weight": cat_weights.get(cat.id, 0.0),
                    "subfeatures": {}
                }
            out[cat.name]["subfeatures"][sub.name] = {
                "score": sc.value,
                "note": sc.note
            }
        return out


@app.post("/api/compute")
def compute(a: float, b: float):
    # Placeholder math; replace with your real logic
    if a == 0 or b == 0:
        return {"result": 0.0}
    return {"result": 2 * (a * b) / (a + b)}  # harmonic-mean style
