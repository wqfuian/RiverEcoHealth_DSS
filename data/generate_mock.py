import json
import random

def generate_mock_shorelines():
    # Central coordinates for Zhengzhou (Long, Lat)
    # Jialu River approximate path segment
    base_coords = [
        [113.55, 34.80], [113.58, 34.81], [113.62, 34.82], 
        [113.65, 34.81], [113.68, 34.80], [113.72, 34.79],
        [113.75, 34.78], [113.78, 34.77], [113.82, 34.76]
    ]
    
    features = []
    types = ["Natural", "Near-nature", "Hardened"]
    
    for i in range(len(base_coords) - 1):
        segment = [base_coords[i], base_coords[i+1]]
        stype = random.choice(types)
        
        # Random indicators for diagnosis
        indicators = {
            "Slope": round(random.uniform(0.1, 0.6), 2),
            "SoilOrganicMatter": round(random.uniform(0.1, 0.8), 2),
            "ConnectivityIndex": round(random.uniform(0.2, 0.9), 2),
            "VegNPP": round(random.uniform(0.2, 0.9), 2),
            "VegCoverage": round(random.uniform(0.1, 0.9), 2),
            "Biodiversity": round(random.uniform(0.3, 0.8), 2),
            "Disturbance": round(random.uniform(0.1, 0.7), 2),
            "Stability": round(random.uniform(0.4, 0.9), 2)
        }
        
        feature = {
            "type": "Feature",
            "id": i + 1,
            "properties": {
                "name": f"Jialu River Segment {i+1}",
                "type": stype,
                "length_km": round(random.uniform(1.2, 3.5), 1),
                **indicators
            },
            "geometry": {
                "type": "LineString",
                "coordinates": segment
            }
        }
        features.append(feature)
        
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    with open("c:/Users/WQF/.gemini/antigravity/RiverEcoHealth_DSS/data/shorelines_mock.json", "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    generate_mock_shorelines()
    print("Mock GeoJSON generated successfully.")
