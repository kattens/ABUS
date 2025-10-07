"""
Domain services for ABUS:
- get_model_full(session, model_name) -> nested dict with weights, scores, notes
- compute_model_scores(session, model_name) -> per-category + overall score
- upsert_model_from_payload(session, payload) -> create/update a full model entry
"""

from __future__ import annotations
from typing import Dict, Any, Tuple
from sqlmodel import select
from api.db_models import Model, Category, Subcategory, Score, ModelCategory


def _get_model(session, name: str) -> Model:
    m = session.exec(select(Model).where(Model.name == name)).first()
    if not m:
        raise ValueError(f"Model '{name}' not found")
    return m


def get_model_full(session, model_name: str) -> Dict[str, Any]:
    """
    Returns:
    {
      "category_name": {
        "weight": float,
        "subfeatures": {
          "sub_name": {"score": float, "note": str | None}
        }
      },
      ...
    }
    """
    m = _get_model(session, model_name)

    # Load weights per category for this model
    weights = {}
    for mc in session.exec(select(ModelCategory).where(ModelCategory.model_id == m.id)).all():
        weights[mc.category_id] = mc.weight

    # Build nested
    out: Dict[str, Any] = {}
    scores = session.exec(select(Score).where(Score.model_id == m.id)).all()
    for sc in scores:
        sub = session.get(Subcategory, sc.subcategory_id)
        cat = session.get(Category, sub.category_id)
        if cat.name not in out:
            out[cat.name] = {"weight": float(weights.get(cat.id, 0.0)), "subfeatures": {}}
        out[cat.name]["subfeatures"][sub.name] = {"score": float(sc.value), "note": sc.note}
    return out


def compute_model_scores(session, model_name: str) -> Dict[str, Any]:
    """
    Aggregates per-category scores and overall.

    Assumptions:
      - Category score = average of its subfeature scores (if any).
      - Overall score  = weighted average over categories using ModelCategory.weight.
        If all weights are 0 or missing, use equal weights across categories that have scores.

    Returns:
    {
      "model": "<name>",
      "categories": { "cat": {"weight": w, "avg": x, "count": n} , ... },
      "overall": float
    }
    """
    full = get_model_full(session, model_name)

    cat_avgs: Dict[str, Tuple[float, int]] = {}
    for cat, blob in full.items():
        subs = blob.get("subfeatures", {})
        vals = [x.get("score") for x in subs.values() if isinstance(x.get("score"), (int, float))]
        if vals:
            avg = sum(vals) / len(vals)
            cat_avgs[cat] = (avg, len(vals))

    cats = list(full.keys())
    weights = [float(full[c]["weight"]) for c in cats]
    total_weight = sum(weights)

    # If weights are all zero/missing, fall back to equal weights over categories that have scores
    if total_weight <= 0:
        active_cats = [c for c in cats if c in cat_avgs]
        if not active_cats:
            return {"model": model_name, "categories": {}, "overall": 0.0}
        eq_w = 1.0 / len(active_cats)
        overall = sum(cat_avgs[c][0] * eq_w for c in active_cats)
    else:
        weighted = []
        for c, w in zip(cats, weights):
            if c in cat_avgs:
                avg, _ = cat_avgs[c]
                weighted.append(avg * (w / total_weight))
        overall = sum(weighted) if weighted else 0.0

    # Detailed category block
    categories_out = {}
    for c in cats:
        w = float(full[c]["weight"])
        if c in cat_avgs:
            avg, cnt = cat_avgs[c]
            categories_out[c] = {"weight": w, "avg": avg, "count": cnt}
        else:
            categories_out[c] = {"weight": w, "avg": 0.0, "count": 0}

    return {"model": model_name, "categories": categories_out, "overall": overall}


def upsert_model_from_payload(session, payload: Dict[str, Any]) -> str:
    """
    Accepts payload like:
    {
      "name": "MULAN",
      "categories": {
        "adaptability": {
          "weight": 20,
          "subfeatures": {
            "transferability": {"score": 2, "note": "..."},
            ...
          }
        },
        ...
      }
    }
    Creates/updates the model, its weights, and subfeature scores/notes.
    Returns the model name.
    """
    name = payload.get("name")
    if not name or not isinstance(name, str):
        raise ValueError("payload.name is required")

    # Upsert model
    m = session.exec(select(Model).where(Model.name == name)).first()
    if not m:
        m = Model(name=name)
        session.add(m)
        session.flush()

    categories = payload.get("categories", {})
    if not isinstance(categories, dict):
        raise ValueError("payload.categories must be an object")

    # Helpers
    def get_or_create_category(cat_name: str) -> Category:
        c = session.exec(select(Category).where(Category.name == cat_name)).first()
        if not c:
            c = Category(name=cat_name)
            session.add(c)
            session.flush()
        return c

    def get_or_create_sub(category_id: int, sub_name: str) -> Subcategory:
        sub = session.exec(
            select(Subcategory).where(Subcategory.category_id == category_id, Subcategory.name == sub_name)
        ).first()
        if not sub:
            sub = Subcategory(category_id=category_id, name=sub_name)
            session.add(sub)
            session.flush()
        return sub

    for cat_name, cat_blob in categories.items():
        c = get_or_create_category(cat_name)

        # Upsert weight
        weight = None
        if isinstance(cat_blob, dict) and "weight" in cat_blob:
            try:
                weight = float(cat_blob["weight"])
            except Exception:
                weight = None
        mc = session.exec(
            select(ModelCategory).where(ModelCategory.model_id == m.id, ModelCategory.category_id == c.id)
        ).first()
        if not mc:
            mc = ModelCategory(model_id=m.id, category_id=c.id, weight=float(weight or 0.0))
            session.add(mc)
        else:
            if weight is not None:
                mc.weight = float(weight)
                session.add(mc)

        # Upsert subfeatures
        if isinstance(cat_blob, dict) and "subfeatures" in cat_blob and isinstance(cat_blob["subfeatures"], dict):
            subfeatures = cat_blob["subfeatures"]
        elif isinstance(cat_blob, dict):
            # tolerate flat old-style categories
            subfeatures = cat_blob
        else:
            subfeatures = {}

        for sub_name, sub_val in subfeatures.items():
            # normalize to {score, note}
            if isinstance(sub_val, dict) and "score" in sub_val:
                score = float(sub_val["score"])
                note = sub_val.get("note")
            elif isinstance(sub_val, (int, float)):
                score = float(sub_val)
                note = None
            else:
                raise ValueError(f"Bad subfeature shape for {cat_name}/{sub_name}")

            sub = get_or_create_sub(c.id, sub_name)
            existing = session.exec(
                select(Score).where(Score.model_id == m.id, Score.subcategory_id == sub.id)
            ).first()
            if existing:
                existing.value = score
                existing.note = note
                session.add(existing)
            else:
                session.add(Score(model_id=m.id, subcategory_id=sub.id, value=score, note=note))

    return m.name
