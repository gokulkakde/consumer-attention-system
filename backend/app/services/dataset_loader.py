import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets", "data")

class DatasetLoader:
    @staticmethod
    def load_coco_sample():
        """
        Loads the COCO dataset sample annotations containing person class labels.
        """
        path = os.path.join(DATASETS_DIR, "coco_sample.json")
        if not os.path.exists(path):
            return {"error": "COCO sample dataset file not found."}
        with open(path, "r") as f:
            return json.load(f)

    @staticmethod
    def load_sku110k_sample():
        """
        Loads the SKU-110K dataset sample annotations containing dense shelf product boxes.
        """
        path = os.path.join(DATASETS_DIR, "sku110k_sample.json")
        if not os.path.exists(path):
            return {"error": "SKU-110K sample dataset file not found."}
        with open(path, "r") as f:
            return json.load(f)

    @staticmethod
    def load_retail_traffic_sample():
        """
        Loads the Retail Store Traffic dataset sample paths representing visitor coordinates.
        """
        path = os.path.join(DATASETS_DIR, "retail_traffic_sample.json")
        if not os.path.exists(path):
            return {"error": "Retail Store Traffic sample dataset file not found."}
        with open(path, "r") as f:
            return json.load(f)

    @staticmethod
    def load_retail_checkout_sample():
        """
        Loads the Retail Product Checkout dataset sample containing cash register scans.
        """
        path = os.path.join(DATASETS_DIR, "checkout_sample.json")
        if not os.path.exists(path):
            return {"error": "Retail Product Checkout sample dataset file not found."}
        with open(path, "r") as f:
            return json.load(f)
