# services/schema_service.py
"""
Utilities to fetch the canonical ABUS scoring schema from the DB:
{ category_name: { subfeature_name: {} } }
"""

from __future__ import annotations
from typing import Dict, Any
from sqlmodel import select
from api.db_models import Category, Subcategory
from api.db import get_session

def get_schema_from_db() -> Dict[str, Dict[str, Any]]:
    """
    Returns:
    {
      "adaptability": { "modular_architecture": {}, "transferability": {} },
      ...
    }
    """
    out: Dict[str, Dict[str, Any]] = {}
    with get_session() as s:
        cats = s.exec(select(Category)).all()
        for c in cats:
            out[c.name] = {}
        subs = s.exec(select(Subcategory)).all()
        for sub in subs:
            cat = s.get(Category, sub.category_id)
            out.setdefault(cat.name, {})
            out[cat.name][sub.name] = {}
    return out
