import numpy as np
from ..utils.math_utils import calculate_weights, fuzzy_evaluation

class DiagnosisEngine:
    def __init__(self):
        # 13 Indicators categorized into 4 dimensions
        self.dimensions = ["Structure", "EcoHealth", "EcoSafety", "EcoService"]
        # Indicators: [Slope, Organic_Matter, Connectivity, NPP, ...] (Simplified for prototype)
        self.indicators = [
            "Slope", "SoilOrganicMatter", "ConnectivityIndex", "VegNPP", 
            "VegCoverage", "Biodiversity", "Disturbance", "Stability"
        ]
        
        # Default Weights (can be loaded from DB/config)
        # Simplified example weights for 8 indicators
        self.weights = np.array([0.15, 0.15, 0.20, 0.10, 0.10, 0.15, 0.05, 0.10])

    def diagnose(self, indicator_values):
        """
        :param indicator_values: dict of values for indicators
        :return: diagnosis result with score and level
        """
        # 1. Define membership functions (Simplified: Linear mapping to 4 grades: Excellent, Good, Fair, Poor)
        # In a real system, these would be specific to each indicator (S-shape/Z-shape functions)
        grades = ["Excellent", "Good", "Fair", "Poor"]
        
        # For prototype: generate a mock membership matrix based on values (0.0 - 1.0 normalized)
        relation_matrix = []
        for ind in self.indicators:
            val = indicator_values.get(ind, 0.5) # Default 0.5
            # Simple membership logic: 
            # val=0.9 -> [0.8, 0.2, 0.0, 0.0]
            # val=0.1 -> [0.0, 0.0, 0.2, 0.8]
            m = [0.0] * 4
            if val >= 0.8: m[0], m[1] = 0.8, 0.2
            elif val >= 0.6: m[1], m[0], m[2] = 0.7, 0.15, 0.15
            elif val >= 0.4: m[2], m[1], m[3] = 0.7, 0.15, 0.15
            else: m[3], m[2] = 0.8, 0.2
            relation_matrix.append(m)
            
        relation_matrix = np.array(relation_matrix)
        
        # 2. Compute FCE
        result_vector = fuzzy_evaluation(self.weights, relation_matrix)
        
        # 3. Calculate Final Score (Standard Score: 100, 80, 60, 40)
        grade_scores = np.array([100, 80, 60, 40])
        final_score = np.dot(result_vector, grade_scores)
        
        # 4. Determine Level
        level_idx = np.argmax(result_vector)
        level = grades[level_idx]
        
        return {
            "score": round(final_score, 2),
            "level": level,
            "vector": result_vector.tolist(),
            "indicators": indicator_values
        }

    def get_recommendations(self, diagnosis):
        """
        Rule-based recommendation engine.
        """
        recs = []
        vals = diagnosis["indicators"]
        
        if vals.get("ConnectivityIndex", 1.0) < 0.5:
            recs.append("Restore longitudinal connectivity (e.g., ecological sluice regulation).")
        if vals.get("SoilOrganicMatter", 1.0) < 0.3:
            recs.append("Soil improvement using organic substrate or nitrogen-fixing plants.")
        if vals.get("VegCoverage", 1.0) < 0.4:
            recs.append("Revegetation with native riparian species.")
        if vals.get("Slope", 0.0) > 0.4: # Negative indicator: high slope is bad for stability/access
            recs.append("Gentle slope modification or flexible bio-embankment construction.")
            
        if not recs:
            recs.append("Maintain current ecological status; periodic monitoring required.")
            
        return recs
