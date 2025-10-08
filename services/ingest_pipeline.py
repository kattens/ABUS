# services/ingest_pipeline.py
"""
Pipeline to turn a paper's text into ABUS JSON:
1) Fetch schema from DB (categories/subfeatures)
2) Run provider (rule-based or LLM) to get 0/1/2 + note for each subfeature
3) Assemble payload with optional category weights
4) (Optional) Upsert into DB
"""

from __future__ import annotations
from typing import Dict, Any, Optional
from services.schema_service import get_schema_from_db
from services.llm_providers import RuleBasedProvider, LLMProvider
from services.scoring_service import upsert_model_from_payload

def build_payload_from_scores(model_name: str,
                              scores: Dict[str, Dict[str, Dict[str, Any]]],
                              weights: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
    categories: Dict[str, Any] = {}
    for cat, subdict in scores.items():
        categories[cat] = {
            "weight": float(weights.get(cat, 0.0) if isinstance(weights, dict) else 0.0),
            "subfeatures": subdict
        }
    return {"name": model_name, "categories": categories}

def ingest_paper_to_json(model_name: str,
                         paper_text: str,
                         weights: Optional[Dict[str, float]] = None,
                         provider: Optional[LLMProvider] = None) -> Dict[str, Any]:
    provider = provider or RuleBasedProvider()
    schema = get_schema_from_db()
    scored = provider.score(paper_text, schema)
    payload = build_payload_from_scores(model_name, scored, weights=weights)
    return payload

def ingest_and_save(model_name: str,
                    paper_text: str,
                    weights: Optional[Dict[str, float]] = None,
                    provider: Optional[LLMProvider] = None) -> Dict[str, Any]:
    """
    End-to-end: score + save to DB (upsert). Returns payload.
    """
    payload = ingest_paper_to_json(model_name, paper_text, weights=weights, provider=provider)
    # persist
    from api.db import get_session
    with get_session() as s, s.begin():
        upsert_model_from_payload(s, payload)
    return payload
