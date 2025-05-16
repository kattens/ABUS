"""
load_json: safely loads a JSON file

save_json: saves structured JSON with indentation

validate_model_schema: basic schema check to ensure subfeatures and score keys exist

"""

# abus/utils/parser.py

import json
from typing import Dict, Any

class JSONLoader:
    @staticmethod
    def load_json(filepath: str) -> Dict[str, Any]:
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON file: {filepath}\n{e}")
        except FileNotFoundError:
            raise FileNotFoundError(f"File not found: {filepath}")

    @staticmethod
    def save_json(data: Dict[str, Any], filepath: str):
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

    @staticmethod
    def validate_model_schema(data: Dict[str, Any]) -> bool:
        """
        Very basic schema check: each category must contain subfeatures with scores.
        """
        try:
            for category, cat_data in data.items():
                if "subfeatures" not in cat_data:
                    return False
                for sf, sf_data in cat_data["subfeatures"].items():
                    if "score" not in sf_data:
                        return False
            return True
        except Exception:
            return False
