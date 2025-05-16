"""
filter_models: Applies user-defined queries like "usability.code_availability": ">= 1.5"

recommend: Returns the top-k models ranked by ABUS score using your scoring function

"""

from typing import Dict, List, Any
from operator import itemgetter

class Recommender:
    def __init__(self, all_models: Dict[str, Any], score_func):
        """
        all_models: dictionary of model name to scoring structure
        score_func: function that takes model data and returns ABUS score
        """
        self.models = all_models
        self.score_func = score_func

    def filter_models(self, query: Dict[str, str]) -> Dict[str, Any]:
        """Filter models based on dot-notation query like 'usability.code_availability': '>= 1.5'"""
        def match(model_data: Dict[str, Any], condition: str, actual: float) -> bool:
            if condition.startswith('>='):
                return actual >= float(condition[2:])
            elif condition.startswith('>'):
                return actual > float(condition[1:])
            elif condition.startswith('<='):
                return actual <= float(condition[2:])
            elif condition.startswith('<'):
                return actual < float(condition[1:])
            elif condition.startswith('=='):
                return actual == float(condition[2:])
            return False

        filtered = {}
        for name, model in self.models.items():
            keep = True
            for key, condition in query.items():
                try:
                    category, subfeature = key.split('.')
                    score = model[category]["subfeatures"][subfeature]["score"]
                    if not match(model, condition, score):
                        keep = False
                        break
                except Exception:
                    keep = False
                    break
            if keep:
                filtered[name] = model
        return filtered

    def recommend(self, query: Dict[str, str], top_k: int = 5) -> List[Dict[str, Any]]:
        """Return top-k models satisfying query, ranked by ABUS score"""
        filtered_models = self.filter_models(query)
        ranked = [
            {"name": name, "score": self.score_func(data), "data": data}
            for name, data in filtered_models.items()
        ]
        return sorted(ranked, key=itemgetter("score"), reverse=True)[:top_k]
