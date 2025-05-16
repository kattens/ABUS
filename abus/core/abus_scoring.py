"""
Load scoring data from a JSON file

Retrieve or update subfeature scores and notes

List available categories and subfeatures

Export the full JSON structure

"""

# abus/core/scoring_engine.py

import json
from typing import Dict, Any

class ScoringEngine:
    def __init__(self, scoring_data: Dict[str, Any]):
        self.data = scoring_data

    def get_subfeature_score(self, category: str, subfeature: str) -> int:
        try:
            return self.data[category]["subfeatures"][subfeature]["score"]
        except KeyError:
            return 0  # Default to 0 if missing

    def get_subfeature_note(self, category: str, subfeature: str) -> str:
        try:
            return self.data[category]["subfeatures"][subfeature].get("note", "")
        except KeyError:
            return ""

    def list_categories(self):
        return list(self.data.keys())

    def list_subfeatures(self, category: str):
        return list(self.data.get(category, {}).get("subfeatures", {}).keys())

    @classmethod
    def from_json_file(cls, filepath: str):
        with open(filepath, 'r') as f:
            data = json.load(f)
        return cls(data)

    def to_json(self) -> str:
        return json.dumps(self.data, indent=2)

    def update_score(self, category: str, subfeature: str, score: int, note: str = ""):
        if category not in self.data:
            self.data[category] = {"subfeatures": {}}
        if "subfeatures" not in self.data[category]:
            self.data[category]["subfeatures"] = {}
        self.data[category]["subfeatures"][subfeature] = {
            "score": score,
            "note": note
        }
