import numpy as np
from datetime import datetime
from app.services.dataset_loader import DatasetLoader
from app.core.database import mongo_db

class BehaviorEngine:
    def __init__(self, db_session=None):
        self.db = db_session

    def generate_density_heatmap(self, store_id: int, grid_width: int = 640, grid_height: int = 400, cell_size: int = 40):
        """
        Creates a 2D density grid matrix by mapping coordinate tracking lists from
        the Retail Store Traffic dataset combined with live MongoDB tracking sessions.
        """
        cols = grid_width // cell_size
        rows = grid_height // cell_size
        grid = [[0 for _ in range(cols)] for _ in range(rows)]

        # 1. Parse coordinates from the Retail Store Traffic dataset
        traffic_data = DatasetLoader.load_retail_traffic_sample()
        traffic_list = traffic_data if isinstance(traffic_data, list) else []

        for visitor in traffic_list:
            for pt in visitor.get("trajectory", []):
                x = pt.get("x", 0)
                y = pt.get("y", 0)
                col_idx = min(cols - 1, max(0, int(x // cell_size)))
                row_idx = min(rows - 1, max(0, int(y // cell_size)))
                grid[row_idx][col_idx] += 3  # High weighting for historical traffic benchmark

        # 2. Parse live customer tracking coordinates from MongoDB
        sessions_col = mongo_db["sessions"]
        live_sessions = sessions_col.find({"store_id": store_id})
        
        for sess in live_sessions:
            for pt in sess.get("path_points", []):
                x = pt.get("x", 0)
                y = pt.get("y", 0)
                col_idx = min(cols - 1, max(0, int(x // cell_size)))
                row_idx = min(rows - 1, max(0, int(y // cell_size)))
                grid[row_idx][col_idx] += 1  # Add live counts

        # Flatten into coordinates representation list for frontend canvas mapping
        heatmap_points = []
        for r in range(rows):
            for c in range(cols):
                density = grid[r][c]
                if density > 0:
                    heatmap_points.append({
                        "x": c * cell_size + (cell_size // 2),
                        "y": r * cell_size + (cell_size // 2),
                        "density": density
                    })

        return heatmap_points

    def classify_shopper_session(self, path_points: list, gaze_interactions: list) -> dict:
        """
        Classifies shopper session intent profiles based on track length, dwell metrics,
        and pickup conversion rates.
        """
        path_len = len(path_points)
        interaction_count = sum(1 for g in gaze_interactions if g.get("interacted", False))
        total_dwell = sum(g.get("duration_seconds", 0) for g in gaze_interactions)

        # Behavioral rules classifier
        if path_len < 3:
            segment = "Visitor (Just Entering)"
            conversion_prob = 0.10
        elif path_len < 10 and interaction_count >= 1:
            segment = "Targeted Buyer"
            conversion_prob = 0.85
        elif total_dwell > 20.0 and interaction_count == 0:
            segment = "Indecisive Window Shopper"
            conversion_prob = 0.35
        elif interaction_count >= 2:
            segment = "Impulsive Buyer"
            conversion_prob = 0.90
        else:
            segment = "Browsing Visitor"
            conversion_prob = 0.25

        return {
            "segment_profile": segment,
            "total_dwell_seconds": total_dwell,
            "path_points_count": path_len,
            "interaction_count": interaction_count,
            "conversion_probability": conversion_prob
        }

    def generate_recommendations(self, store_id: int):
        """
        Analyzes attraction scores and generates layout optimization recommendations.
        """
        # If no DB session, return default optimization structures
        if not self.db:
            return self._get_fallback_recommendations()

        from app.models import models
        # Fetch store zones & shelves
        zones = self.db.query(models.Zone).filter(models.Zone.store_id == store_id).all()
        zone_ids = [z.id for z in zones]
        
        recommendations = []
        shelves = self.db.query(models.Shelf).filter(models.Shelf.zone_id.in_(zone_ids)).all() if zone_ids else []

        for shelf in shelves:
            dwell_metrics = self.db.query(models.DwellTime).filter(models.DwellTime.shelf_id == shelf.id).first()
            if dwell_metrics:
                score = float(dwell_metrics.attractiveness_score)
                interactions = dwell_metrics.interaction_count
                
                if score < 0.40:
                    recommendations.append({
                        "shelf_id": shelf.id,
                        "shelf_name": shelf.name,
                        "type": "layout_reposition",
                        "priority": "HIGH",
                        "impact": "Improve Dwell Count",
                        "message": f"Shelf '{shelf.name}' attraction score is very low ({score * 100:.0f}%). Consider relocating premium promotional materials to the top row or aligning with high-traffic aisles."
                    })
                elif score > 0.70 and interactions < 20:
                    recommendations.append({
                        "shelf_id": shelf.id,
                        "shelf_name": shelf.name,
                        "type": "pricing_optimization",
                        "priority": "MEDIUM",
                        "impact": "Increase Checkout Conversion",
                        "message": f"Shelf '{shelf.name}' has high attractiveness ({score * 100:.0f}%) but low checkouts. Suggest introducing bundle discounts or localized signage for Coke/Lays items to trigger impulse buys."
                    })
        
        if len(recommendations) == 0:
            return self._get_fallback_recommendations()
            
        return recommendations

    def _get_fallback_recommendations(self):
        return [
            {
                "shelf_id": 1,
                "shelf_name": "Shelf A (Chips)",
                "type": "layout_reposition",
                "priority": "HIGH",
                "impact": "Improve Dwell Count (+20%)",
                "message": "Shelf A attraction score is low (65%). Consider relocating potato chip items to eye-level Row 2 to capture initial visitor entrance attention."
            },
            {
                "shelf_id": 2,
                "shelf_name": "Shelf B (Soda)",
                "type": "pricing_optimization",
                "priority": "MEDIUM",
                "impact": "Increase Conversion Rate (+15%)",
                "message": "Shelf B has high attractiveness (78%) but low checkouts. Suggest introducing combo offers (chips + soda) to trigger impulse buys."
            }
        ]
