from typing import List, Dict, Any, Optional
from base_detector import BaseDetector, DetectionSignal

class C2PAMetadataAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("C2PA Metadata Analyzer", "1.0", "provenance")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"raw_bytes": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        raw_bytes = preprocessed_data["raw_bytes"]
        if not raw_bytes:
            return {"success": False}
            
        # Simplistic offline check for C2PA 'jumb' box (JUMBF) or 'c2pa' marker
        raw_str = raw_bytes.decode("utf-8", errors="ignore").lower()
        has_c2pa = "c2pa" in raw_str or "jumb" in raw_str
        
        return {
            "success": True,
            "has_c2pa": has_c2pa,
            "is_valid": False,  # Mocking cryptographic validation (currently stubbed)
            "stubbed": True
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("success"): return 0.0
        # Reduced quality because cryptographic validation is stubbed
        return 0.1 if features.get("has_c2pa") else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        # Since validation is stubbed, we cannot confidently assert it's 0.99 AI
        return 0.5

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class EXIFSoftwareAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Software Provenance Analyzer", "1.0", "provenance")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"raw_bytes": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        raw_bytes = preprocessed_data["raw_bytes"]
        if not raw_bytes: return {"success": False}
        
        raw_str = raw_bytes.decode("utf-8", errors="ignore").lower()
        
        ai_tags = ["midjourney", "stable diffusion", "dall-e", "comfyui", "leonardo", "runway", "sora", "pika", "kling"]
        hit = next((tag for tag in ai_tags if tag in raw_str), None)
        
        return {
            "success": True,
            "hit": hit
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("success"): return 0.0
        return 1.0 if features.get("hit") else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("hit"):
            return 0.999
        return 0.5

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class HardwareSignatureAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Hardware Metadata Analyzer", "1.0", "provenance")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"raw_bytes": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        raw_bytes = preprocessed_data["raw_bytes"]
        if not raw_bytes: return {"success": False}
        
        raw_str = raw_bytes.decode("utf-8", errors="ignore").lower()
        hw_tags = ["apple", "iphone", "samsung", "galaxy", "sony", "canon", "nikon"]
        hit = next((tag for tag in hw_tags if tag in raw_str), None)
        
        return {
            "success": True,
            "hit": hit
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("success"): return 0.0
        # Hardware signatures override untrained pixel noise when present
        return 0.85 if features.get("hit") else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("hit"):
            return 0.01
        return 0.5

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class ProvenanceOrchestrator:
    def __init__(self):
        self.detectors = [
            C2PAMetadataAnalyzer(),
            EXIFSoftwareAnalyzer(),
            HardwareSignatureAnalyzer()
        ]

    def analyze(self, raw_bytes: bytes, context: Optional[Dict[str, Any]] = None) -> List[DetectionSignal]:
        ctx = context or {}
        signals = []
        
        for det in self.detectors:
            try:
                signal = det.execute(raw_bytes, ctx)
                if signal.signal_quality > 0.05:
                    signals.append(signal)
            except Exception as e:
                print(f"Failed to execute {det.name}: {e}")
                
        return signals
