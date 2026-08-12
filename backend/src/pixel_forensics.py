from typing import Any, Dict, List, Optional
from base_detector import BaseDetector
from detector_registry import DetectionSignal, DetectorRegistry
import numpy as np

class NoiseDomainAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Pixel Noise Analyzer", "1.0", "image")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"img": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import ml_server
        metrics = ml_server.compute_pixel_forensics(preprocessed_data["img"])
        return metrics

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.0
        # If noise is extremely low, it might be due to aggressive social media compression.
        # We drop the signal quality slightly so it doesn't completely override other signals.
        noise = features.get("flatBlockNoise", 1.84)
        if noise < 0.2:
            return 0.4 # Degraded confidence due to severe smoothing
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.5
        
        noise = features.get("flatBlockNoise", 1.84)
        rg = features.get("pearsonRG", 0.98)
        rb = features.get("pearsonRB", 0.97)
        
        # High noise = physical camera. Low noise / high correlation = synthetic
        score = 0.5
        if noise < 0.35:
            score += 0.15
        if rg < 0.85 or rb < 0.85:
            score += 0.15
        
        return min(max(score, 0.0), 1.0)

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class CompressionArtifactAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Compression Artifact Analyzer", "1.0", "image")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"img": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import ml_server
        img = preprocessed_data["img"]
        ela = ml_server.compute_ela_forensics(img)
        patch = ml_server.compute_patch_forensics(img)
        jpeg = ml_server.compute_jpeg_block_forensics(img)
        
        return {
            "ela": ela,
            "patch": patch,
            "jpeg": jpeg,
            "success": ela.get("success") or patch.get("success") or jpeg.get("success")
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("success"):
            return 0.0
        
        # If the image was heavily downscaled, high-frequency DCT grids are destroyed.
        # We can infer this if dct_energy is extremely low (near zero).
        dct = features.get("dct_energy", 12.0)
        if dct < 1.0:
            return 0.3 # Reduced reliability on tiny/blurred images
            
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("success"):
            return 0.5
            
        score = 0.5
        ela = features.get("ela", {})
        patch = features.get("patch", {})
        jpeg = features.get("jpeg", {})
        
        # ELA ratio > 3.0 indicates spliced/manipulated areas
        if ela.get("ela_ratio", 1.0) > 3.0:
            score += 0.15
            
        # Checkerboard upsampling is a hallmark of transposed convolutions in GANs/Diffusion
        max_checker = patch.get("patch_max_checker", 1.0)
        if max_checker > 1.3 or max_checker < 0.7:
            score += 0.15
            
        # Missing JPEG block boundaries when expected (or perfectly aligned boundaries)
        if jpeg.get("score", 0.5) > 0.90:
            score += 0.15
            
        return min(max(score, 0.0), 1.0)

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class FrequencyDomainAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Frequency Domain Analyzer", "1.0", "image")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"img": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import ml_server
        img = preprocessed_data["img"]
        benfords = ml_server.compute_benfords_law(img)
        fft = ml_server.compute_fft_forensics(img)
        pixel_metrics = ml_server.compute_pixel_forensics(img)
        
        return {
            "benfords": benfords,
            "fft": fft,
            "dct_energy": pixel_metrics.get("highFreqDctEnergy", 12.0),
            "success": benfords.get("success") or fft.get("success")
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("success"):
            return 0.0
        
        # If the image was heavily downscaled, high-frequency DCT grids are destroyed.
        # We can infer this if dct_energy is extremely low (near zero).
        dct = features.get("dct_energy", 12.0)
        if dct < 1.0:
            return 0.3 # Reduced reliability on tiny/blurred images
            
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("success"):
            return 0.5
            
        score = 0.5
        benfords = features.get("benfords", {})
        fft = features.get("fft", {})
        dct_energy = features.get("dct_energy", 12.0)
        
        # High Benford's Law divergence means artificial latent generation
        div = benfords.get("benford_divergence", 0.0)
        if div > 0.08:
            score += 0.15
            
        # FFT peak Z-score measures repeating spectral artifacts
        z = fft.get("fft_peak_z", 0.0)
        if z > 7.0:
            score += 0.15
            
        # Extremely high DCT energy means unnatural sharpening or generation
        if dct_energy > 25.0:
            score += 0.1
            
        return min(max(score, 0.0), 1.0)

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class PixelForensicsOrchestrator:
    def __init__(self):
        self.detectors = [
            NoiseDomainAnalyzer(),
            CompressionArtifactAnalyzer(),
            FrequencyDomainAnalyzer(),
            PhysicalSceneAnalyzer(),
            MultiviewForensicsAnalyzer()
        ]

    def analyze(self, img_pil, context: Optional[Dict[str, Any]] = None) -> List[DetectionSignal]:
        ctx = context or {}
        signals = []
        
        for det in self.detectors:
            try:
                signal = det.execute(img_pil, ctx)
                if signal.signal_quality is not None and signal.signal_quality > 0.1:
                    signals.append(signal)
            except Exception as e:
                print(f"Failed to execute {det.name}: {e}")
                
        return signals


class PhysicalSceneAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Physical Scene Analyzer", "1.0", "image")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"img": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import ml_server
        img = preprocessed_data["img"]
        advanced = ml_server.compute_advanced_image_forensics(img)
        return advanced

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.0
        # If noise is extremely low, it might be due to aggressive social media compression.
        # We drop the signal quality slightly so it doesn't completely override other signals.
        noise = features.get("flatBlockNoise", 1.84)
        if noise < 0.2:
            return 0.4 # Degraded confidence due to severe smoothing
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.5
            
        # The advanced forensics compute lighting, shadows, geometry, texture.
        # It outputs individual scores.
        # Higher score typically means higher confidence in real/synthetic depending on logic.
        # But wait! 'advanced' actually returns 
        # "lighting_score" (0-1), "shadow_score" (0-1), "geometry_score" (0-1)
        # where < 0.5 means synthetic (fake physics), > 0.5 means physical (real).
        # We want to return ai_probability (0-1) where 1 is AI.
        
        score_sum = 0.0
        count = 0
        
        for k in ["lighting_score", "shadow_score", "geometry_score", "texture_score"]:
            if k in features:
                val = features[k]
                # If val < 0.5, it's AI. If val > 0.5, it's human.
                # So ai_prob = 1.0 - val
                ai_prob = 1.0 - val
                score_sum += ai_prob
                count += 1
                
        if count == 0:
            return 0.5
            
        return score_sum / count

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class MultiviewForensicsAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Multiview Inpainting Analyzer", "1.0", "image")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"img": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import ml_server
        img = preprocessed_data["img"]
        multiview = ml_server.compute_multiview_image_forensics(img)
        return multiview

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.0
        # If noise is extremely low, it might be due to aggressive social media compression.
        # We drop the signal quality slightly so it doesn't completely override other signals.
        noise = features.get("flatBlockNoise", 1.84)
        if noise < 0.2:
            return 0.4 # Degraded confidence due to severe smoothing
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.5
            
        # The multiview heuristics track variance across views.
        # High variance across views implies localized AI morphing or masked generation.
        score = 0.5
        variance = features.get("multiview_score_variance", 0.0)
        
        if variance > 0.15:
            score = 0.8
        elif variance > 0.10:
            score = 0.65
        else:
            score = 0.4
            
        return score

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score
