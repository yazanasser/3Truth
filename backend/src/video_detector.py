from provenance_engine import ProvenanceOrchestrator
import cv2
import numpy as np
import re
from typing import List, Dict, Any, Optional
from base_detector import BaseDetector, DetectionSignal
from fusion_engine import EvidenceFusionEngine

class TemporalMotionAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Temporal Motion Analyzer", "1.0", "video")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        video_path = preprocessed_data["video_path"]
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"success": False}

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 1:
            return {"success": False}

        # Intelligent sampling: extract a dense chunk for motion analysis (e.g., 10 frames in middle)
        start_frame = max(0, total_frames // 2 - 5)
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        
        frames = []
        for _ in range(10):
            ret, frame = cap.read()
            if not ret:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            frames.append(gray)
            
        cap.release()

        if len(frames) < 2:
            return {"success": False}

        optical_flows = []
        for i in range(1, len(frames)):
            flow = cv2.calcOpticalFlowFarneback(frames[i-1], frames[i], None, 0.5, 3, 15, 3, 5, 1.2, 0)
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            optical_flows.append(np.mean(mag))
            
        # Sora/Pika often have extreme optical flow consistency (no motion blur noise)
        # or completely erratic temporal morphing.
        flow_variance = float(np.var(optical_flows)) if len(optical_flows) > 1 else 0.0
        
        return {
            "success": True,
            "flow_variance": flow_variance,
            "mean_flow": float(np.mean(optical_flows))
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return 1.0 if features.get("success", False) else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.5
            
        # Extremely smooth optical flow variance across 10 frames implies AI interpolation
        variance = features["flow_variance"]
        mean_flow = features["mean_flow"]
        
        # If there's high motion but practically zero variance, it's artificially smoothed (AI generation)
        if mean_flow > 2.0 and variance < 0.1:
            return 0.8
        # If variance is massively erratic (hallucinated morphing)
        elif variance > 10.0:
            return 0.75
            
        return 0.4 # Natural physical camera movement

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class VideoProvenanceAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Video Provenance Analyzer", "1.0", "video")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        video_path = preprocessed_data["video_path"]
        raw_text = ""
        try:
            with open(video_path, "rb") as fh:
                raw = fh.read()
                if len(raw) > 4_000_000:
                    raw = raw[:2_000_000] + raw[-2_000_000:]
                raw_text = raw.decode("utf-8", errors="ignore").replace("\x00", "").lower()
        except:
            return {"success": False}
            
        video_ai_tags = ["runway", "pika", "sora", "kling", "luma", "midjourney", "stable video", "gen-2"]
        video_camera_tags = ["apple", "iphone", "samsung", "galaxy", "sony", "canon", "quicktime"]
        
        has_ai = any(tag in raw_text for tag in video_ai_tags)
        has_camera = any(tag in raw_text for tag in video_camera_tags)
        
        return {
            "success": True,
            "has_ai": has_ai,
            "has_camera": has_camera
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return 1.0 if features.get("success", False) else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("has_ai"):
            return 0.95
        if features.get("has_camera"):
            return 0.2
        return 0.5

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class VideoTemporalOrchestrator:
    def __init__(self):
        self.detectors = [
            TemporalMotionAnalyzer(),
            VisualConsistencyAnalyzer(),
            AudioVideoSyncAnalyzer()
        ]
        self.fusion_engine = EvidenceFusionEngine()

    def analyze(self, video_path: str, context: Optional[Dict[str, Any]] = None) -> dict:
        ctx = context or {}
        signals = []
        
        # Get provenance signals
        prov_orch = ProvenanceOrchestrator()
        try:
            with open(video_path, "rb") as fh:
                raw = fh.read()
            prov_signals = prov_orch.analyze(raw, ctx)
            signals.extend(prov_signals)
        except:
            pass
            
        for det in self.detectors:
            try:
                signal = det.execute(video_path, ctx)
                if signal.signal_quality > 0.1:
                    signals.append(signal)
            except Exception as e:
                print(f"Failed to execute {det.name}: {e}")
                
        # Neural Vision frame integration could happen here if we sampled keyframes
        
        fusion_result = self.fusion_engine.fuse(signals)
        return fusion_result


class VisualConsistencyAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Visual Consistency Analyzer", "1.0", "video")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        video_path = preprocessed_data["video_path"]
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"success": False}

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 1:
            return {"success": False}

        # Intelligent sampling: scene changes / facial regions
        # We sample 5 frames across the video and check background luminance stability
        num_samples = 5
        frame_indices = np.linspace(0, max(0, total_frames - 1), num_samples).astype(int)
        
        luminance_means = []
        for idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            luminance_means.append(np.mean(gray))
            
        cap.release()
        
        if len(luminance_means) < 2:
            return {"success": False}
            
        lum_variance = float(np.var(luminance_means))
        
        return {
            "success": True,
            "lum_variance": lum_variance
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return 1.0 if features.get("success", False) else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.5
            
        # AI generated videos often have strangely shifting background lighting or flicker
        var = features["lum_variance"]
        if var > 500.0:
            return 0.7 # High flickering
        elif var < 5.0:
            return 0.3 # Natural consistent lighting
            
        return 0.5

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class AudioVideoSyncAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Audio/Video Lip-Sync Analyzer", "1.0", "video")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import production_detectors
        video_path = preprocessed_data["video_path"]
        result = production_detectors.analyze_face_dynamics(video_path)
        return result

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return 1.0 if features.get("applicable", True) else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("applicable", True):
            return 0.5
            
        score = 0.5
        # mouth_audio_correlation: high correlation = human (lips move with audio).
        # low correlation = AI dubbing / Wav2Lip / deepfake
        corr = features.get("mouth_audio_correlation", 1.0)
        
        if corr < 0.2:
            score = 0.85 # Strong AI evidence (unsynced)
        elif corr < 0.4:
            score = 0.65
        else:
            score = 0.2 # Strongly synced (Human)
            
        return score

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score
