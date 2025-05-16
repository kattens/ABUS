"""
RubricEvaluator: a class that auto-assigns subfeature scores based on keyword cues in justification text

evaluate_text: returns a score (0–2) from evidence text

auto_score_model: applies rubric rules to every subfeature in a model's dataset

"""

from typing import Dict, Any

class RubricEvaluator:
    """
    Maps raw textual evidence to a 0-2 score based on heuristic cues.
    """

    def __init__(self):
        self.rules = {
            2: ["open-source", "fully supported", "includes structure", "modular", "multi-modal"],
            1: ["partially supported", "limited", "some support", "pending"],
            0: ["not supported", "no code", "unclear"]
        }

    def evaluate_text(self, text: str) -> int:
        text_lower = text.lower()
        for score in [2, 1, 0]:
            for keyword in self.rules[score]:
                if keyword in text_lower:
                    return score
        return 0  # default if no keywords match

    def auto_score_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate all subfeatures and return updated scoring structure."""
        updated = {}
        for category, cat_data in model_data.items():
            updated[category] = {"weight": cat_data.get("weight", 0), "subfeatures": {}}
            for subfeature, feature_data in cat_data.get("subfeatures", {}).items():
                note = feature_data.get("note", "")
                score = self.evaluate_text(note)
                updated[category]["subfeatures"][subfeature] = {
                    "score": score,
                    "note": note
                }
        return updated