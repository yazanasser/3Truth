import os
from typing import List, Dict, Any, Optional
from base_detector import BaseDetector, DetectionSignal
from fusion_engine import EvidenceFusionEngine

class AudioSpectrumAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Audio Spectrum Analyzer", "1.0", "audio")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"audio_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import production_detectors
        audio_path = preprocessed_data["audio_path"]
        result = production_detectors.analyze_audio_spectrum(audio_path)
        return result

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return 1.0 if features.get("applicable", True) else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("applicable", True):
            return 0.5
            
        score = 0.5
        # ElevenLabs/Vocoders often have low Zero-Crossing Rate because of noise suppression
        zcr = features.get("zero_crossing_rate", 0.05)
        if zcr < 0.02:
            score += 0.3
            
        # Synthetic voices can have unnaturally consistent spectral variance
        spec_var = features.get("spectral_variance", 1.0)
        if spec_var < 0.01:
            score += 0.2
            
        # Discontinuities in pitch (stitching artifacts)
        discontinuities = features.get("pitch_discontinuities", 0)
        if discontinuities > 5:
            score += 0.25
            
        return min(max(score, 0.0), 1.0)

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class NeuralAudioAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Neural Voice Cloning Analyzer", "1.0", "audio")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"audio_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import production_detectors
        audio_path = preprocessed_data["audio_path"]
        
        try:
            result = production_detectors.predict_audio_deepfake(audio_path)
        except Exception as e:
            return {"applicable": False, "reason": str(e)}
            
        return result

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return 1.0 if features.get("applicable", True) else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("applicable", True):
            return 0.5
            
        # prediction result has 'score' (0-1) where 1 means fake
        raw_prob = features.get("score", 0.5)
        return raw_prob

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class AudioTemporalOrchestrator:
    def __init__(self):
        self.detectors = [
            AudioSpectrumAnalyzer(),
            NeuralAudioAnalyzer()
        ]
        self.fusion_engine = EvidenceFusionEngine()

    def analyze(self, audio_path: str, context: Optional[Dict[str, Any]] = None) -> dict:
        ctx = context or {}
        signals = []
        
        for det in self.detectors:
            try:
                signal = det.execute(audio_path, ctx)
                if signal.signal_quality > 0.1:
                    signals.append(signal)
            except Exception as e:
                print(f"Failed to execute {det.name}: {e}")
                
        fusion_result = self.fusion_engine.fuse(signals)
        return fusion_result
