"""
calculate_category_score: computes a normalized [0–1] score per category

calculate_abus_score: computes the final weighted ABUS score on a 0–100 scale

calculate_detailed_scores: returns per-category scores for visualization or debugging

"""

from typing import Dict, Any

class ScoreCalculator:
    def __init__(self, scoring_data: Dict[str, Any]):
        self.data = scoring_data

    def calculate_category_score(self, category: str) -> float:
        category_data = self.data.get(category, {})
        subfeatures = category_data.get("subfeatures", {})
        if not subfeatures:
            return 0.0

        total_weight = 0
        weighted_sum = 0

        for feature, info in subfeatures.items():
            score = info.get("score", 0)
            weight = info.get("weight", 1)  # Default subfeature weight = 1
            weighted_sum += score * weight
            total_weight += weight

        if total_weight == 0:
            return 0.0
        return (weighted_sum / total_weight) / 2  # Normalize by max score 2

    def calculate_abus_score(self) -> float:
        total_weight = 0
        final_score = 0

        for category, cat_data in self.data.items():
            weight = cat_data.get("weight", 0)
            cat_score = self.calculate_category_score(category)
            final_score += cat_score * weight
            total_weight += weight

        if total_weight == 0:
            return 0.0
        return final_score  # Already normalized over 100

    def calculate_detailed_scores(self) -> Dict[str, float]:
        result = {}
        for category in self.data.keys():
            result[category] = self.calculate_category_score(category)
        return result