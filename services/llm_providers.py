# services/llm_providers.py
"""
Pluggable providers that turn a paper's text into 0/1/2 scores per subfeature.
- Base interface: LLMProvider
- RuleBasedProvider: deterministic keyword heuristics (no network)
- (Optional) OpenAIProvider/HFProvider: add later
"""

from __future__ import annotations
from typing import Dict, Any, Iterable
import re

class LLMProvider:
    def score(self, paper_text: str, schema: Dict[str, Any]) -> Dict[str, Dict[str, Dict[str, Any]]]:
        """
        Returns:
        {
          "category": {
            "subfeature": {"score": 0|1|2, "note": "why"}
          }
        }
        """
        raise NotImplementedError


class RuleBasedProvider(LLMProvider):
    """
    Very simple keyword-based scorer for demo/dev use.
    You should replace with a real LLM-based provider when ready.
    Heuristic: count keyword hits -> 0/1/2
    """
    KEYWORDS = {
        # Example keyword sets, adjust per your rubric
        "adaptability": {
            "modular_architecture": ["modular", "adapter", "plugin", "component", "modularity"],
            "transferability": ["transfer", "generalize", "few-shot", "multi-task", "domain adaptation"]
        },
        "bioinformatics_relevance": {
            "biological_input_modalities": ["sequence", "structure", "phenotype", "annotation", "omics"],
            "structural_awareness": ["3d", "folding", "torsion", "angle", "structural"]
        },
        "usability": {
            "code_availability": ["github", "repository", "open-source", "code", "license"],
            "documentation_quality": ["readme", "docs", "documentation", "tutorial", "api reference"],
            "setup_ease": ["pip install", "conda", "requirements.txt", "docker", "setup"]
        },
        "computational_efficiency": {
            "parameter_count_efficiency": ["parameters", "million", "billion", "lightweight", "compact"],
            "runtime_scalability": ["throughput", "latency", "scalable", "speed", "gpu", "inference"]
        },
        "output_suitability": {
            "output_interpretability": ["interpret", "attention", "explain", "saliency", "attribution"],
            "task_alignment": ["function prediction", "secondary structure", "mutation effect", "phenotype"]
        }
    }

    def __init__(self, score_thresholds=(0, 2, 5)):
        """
        thresholds: (#hits) -> {0,1,2}. E.g., hits <2 => 0, <5 => 1, else => 2
        """
        self.t0, self.t1, self.t2 = score_thresholds

    def _score_for_hits(self, n: int) -> int:
        if n < self.t1:
            return 0
        if n < self.t2:
            return 1
        return 2

    def score(self, paper_text: str, schema: Dict[str, Any]) -> Dict[str, Dict[str, Dict[str, Any]]]:
        t = paper_text.lower()
        out: Dict[str, Dict[str, Dict[str, Any]]] = {}
        for cat, subdict in schema.items():
            out[cat] = {}
            for sub in subdict.keys():
                keywords = self.KEYWORDS.get(cat, {}).get(sub, [])
                hits = 0
                note_bits: list[str] = []
                for kw in keywords:
                    # crude token match
                    count = len(re.findall(rf"\b{re.escape(kw.lower())}\b", t))
                    if count:
                        hits += count
                        note_bits.append(f"{kw}×{count}")
                score = self._score_for_hits(hits)
                note = " | ".join(note_bits) if note_bits else "no keyword evidence"
                out[cat][sub] = {"score": score, "note": note}
        return out
