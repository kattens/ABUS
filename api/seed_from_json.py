# api/seed_from_json.py
"""
Now stores:
- category weights in ModelCategory
- subfeature notes in Score.note
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, Iterator, Tuple
from sqlmodel import select
from sqlalchemy import func
from api.db import get_session, init_db
from api.db_models import Model, Category, Subcategory, Score, ModelCategory

def _find_json() -> Path:
    candidates = [
        Path("abus/data/model_scores.json"),
        Path("ABUS/abus/data/model_scores.json"),
        Path("ABUS-Scoring/abus/data/model_scores.json"),
    ]
    for c in candidates:
        if c.exists(): return c.resolve()
    matches = list(Path(".").rglob("model_scores.json"))
    if matches: return matches[0].resolve()
    raise FileNotFoundError("model_scores.json not found (expected under ./abus/data/).")

def _extract_score_and_note(raw: Any, ctx: str) -> Tuple[float, str | None]:
    if isinstance(raw, (int, float)):
        return float(raw), None
    if isinstance(raw, dict):
        if "score" in raw:
            try:
                score = float(raw["score"])
            except Exception:
                raise ValueError(f"Score at {ctx} must be numeric; got {raw['score']!r}")
            note = raw.get("note")
            if note is not None and not isinstance(note, str):
                note = str(note)
            return score, note
    raise ValueError(f"Expected number or {{'score': number, ...}} at {ctx}; got {raw!r}")

def _iter_subfeatures(cat_val: Any, model: str, cat: str) -> Iterator[Tuple[str, float, str | None]]:
    # New shape: { "weight": ..., "subfeatures": { sub: {score, note} } }
    if isinstance(cat_val, dict) and "subfeatures" in cat_val and isinstance(cat_val["subfeatures"], dict):
        for sub_name, sub_raw in cat_val["subfeatures"].items():
            score, note = _extract_score_and_note(sub_raw, f"{model}/{cat}/{sub_name}")
            yield sub_name, score, note
        return
    # Old/simple shape: { sub: number | {score, note} }
    if isinstance(cat_val, dict):
        for sub_name, sub_raw in cat_val.items():
            score, note = _extract_score_and_note(sub_raw, f"{model}/{cat}/{sub_name}")
            yield sub_name, score, note
        return
    raise ValueError(f"Category value must be object for {model}/{cat}; got {type(cat_val).__name__}")

def _get_category_weight(cat_val: Any) -> float | None:
    if isinstance(cat_val, dict) and "weight" in cat_val:
        try:
            return float(cat_val["weight"])
        except Exception:
            return None
    return None

def _count_rows(session) -> dict:
    def c(model):
        return session.exec(select(func.count()).select_from(model)).one()
    return {
        "models": c(Model),
        "categories": c(Category),
        "subcategories": c(Subcategory),
        "scores": c(Score),
        "model_categories": c(ModelCategory),
    }

def seed() -> None:
    json_path = _find_json()
    print(f"[seed] Using JSON: {json_path}")

    data = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit("Top-level JSON must be an object mapping model -> categories")

    init_db()

    with get_session() as s, s.begin():
        before = _count_rows(s)
        print(f"[seed] Rows before: {before}")

        def upsert(obj):
            s.add(obj); s.flush(); return obj

        def get_or_create_model(name: str) -> Model:
            m = s.exec(select(Model).where(Model.name == name)).first()
            return m or upsert(Model(name=name))

        def get_or_create_category(name: str) -> Category:
            c = s.exec(select(Category).where(Category.name == name)).first()
            return c or upsert(Category(name=name))

        def get_or_create_subcategory(category_id: int, name: str) -> Subcategory:
            sub = s.exec(
                select(Subcategory).where(Subcategory.category_id == category_id, Subcategory.name == name)
            ).first()
            return sub or upsert(Subcategory(name=name, category_id=category_id))

        def get_or_create_model_category(model_id: int, category_id: int) -> ModelCategory:
            mc = s.exec(
                select(ModelCategory).where(
                    ModelCategory.model_id == model_id,
                    ModelCategory.category_id == category_id,
                )
            ).first()
            return mc or upsert(ModelCategory(model_id=model_id, category_id=category_id, weight=0.0))

        for model_name, categories in data.items():
            if not isinstance(categories, dict):
                raise ValueError(f"Model '{model_name}' must map to a dict of categories")

            m = get_or_create_model(model_name)

            for cat_name, cat_val in categories.items():
                c = get_or_create_category(cat_name)

                # store per-model category weight if present
                w = _get_category_weight(cat_val)
                mc = get_or_create_model_category(m.id, c.id)
                if w is not None:
                    mc.weight = w
                    s.add(mc)

                # store subfeature scores (+ notes)
                for sub_name, score_val, note in _iter_subfeatures(cat_val, model_name, cat_name):
                    sub = get_or_create_subcategory(c.id, sub_name)
                    existing = s.exec(
                        select(Score).where(Score.model_id == m.id, Score.subcategory_id == sub.id)
                    ).first()
                    if existing:
                        existing.value = score_val
                        existing.note = note
                        s.add(existing)
                    else:
                        s.add(Score(model_id=m.id, subcategory_id=sub.id, value=score_val, note=note))

        after = _count_rows(s)
        print(f"[seed] Rows after:  {after}")
        print("[seed] Seed complete")

if __name__ == "__main__":
    try:
        seed()
    except Exception as e:
        import traceback
        print("[seed] ERROR:", e)
        traceback.print_exc()
        raise
