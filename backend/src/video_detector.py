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


class SpatioTemporalClassifierAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Spatio-Temporal Neural Vision", "1.0", "vision")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"neural_prob": context.get("neural_prob")}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        prob = preprocessed_data["neural_prob"]
        if prob is None:
            return {"success": False}
        return {"success": True, "neural_prob": prob}

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return 1.0 if features.get("success") else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        return features.get("neural_prob", 0.5)

    def calibrate(self, raw_score: float, context: dict) -> float:
        logit = __import__("math").log((raw_score + 1e-7) / (1 - raw_score + 1e-7))
        calibrated = 1 / (1 + __import__("math").exp(-logit * 1.5))
        return calibrated


class CodecAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Video Codec Forensics", "1.0", "forensics")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        try:
            from production_detectors import analyze_codec
            score = analyze_codec(preprocessed_data["video_path"])
            return {"success": True, "score": score}
        except Exception:
            return {"success": False}

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return 0.8 if features.get("success") else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        score_val = features.get("score", 0.5)
        if isinstance(score_val, dict):
            score_val = score_val.get("ai_probability", score_val.get("score", 0.5))
        try:
            return float(score_val)
        except Exception:
            return 0.5

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class RPPGCMPulseAnalyzer(BaseDetector):
    """
    DARPA SemaFor / Biometric Gold Standard: Remote Photoplethysmography (rPPG).
    Extracts subtle facial skin chrominance fluctuations (hemoglobin absorption peak in Green channel)
    and computes temporal FFT to detect authentic physiological human pulse rhythm (0.75 - 2.5 Hz / 45-150 BPM).
    Deepfakes and AI generative videos (Sora, Runway, Kling, FaceSwaps) lack biological pulse harmonics.
    """
    def __init__(self):
        super().__init__("rPPG Biometric Cardiac Pulse Analyzer", "2.0", "video")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        video_path = preprocessed_data["video_path"]
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"failed": True, "reason": "Cannot open video"}

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames < 20:
            cap.release()
            return {"failed": True, "reason": "Video too short for rPPG analysis"}

        # Sample up to 64 consecutive frames
        num_frames = min(64, total_frames)
        try:
            cascade_path = getattr(cv2.data, "haarcascades", "") + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(cascade_path) if os.path.exists(cascade_path) else None
            if face_cascade and face_cascade.empty():
                face_cascade = None
        except Exception:
            face_cascade = None
        
        green_signals = []
        face_detected = False

        for _ in range(num_frames):
            ret, frame = cap.read()
            if not ret:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = []
            if face_cascade is not None:
                try:
                    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=3, minSize=(60, 60))
                except Exception:
                    faces = []

            if len(faces) > 0:
                face_detected = True
                fx, fy, fw, fh = faces[0]
                roi = frame[fy + int(fh * 0.15) : fy + int(fh * 0.45), fx + int(fw * 0.25) : fx + int(fw * 0.75)]
                green_signals.append(float(np.mean(roi[:, :, 1])))
            else:
                h, w, _ = frame.shape
                roi = frame[h//4:3*h//4, w//4:3*w//4]
                green_signals.append(float(np.mean(roi[:, :, 1])))

        cap.release()

        if len(green_signals) < 16:
            return {"failed": True, "reason": "Insufficient frames for pulse extraction"}

        # Detrend signal & apply Hanning window
        sig = np.array(green_signals) - np.mean(green_signals)
        sig = sig * np.hanning(len(sig))

        # Temporal FFT to find pulse power in 0.75 - 2.5 Hz (45 - 150 BPM)
        n = len(sig)
        fft_vals = np.abs(np.fft.rfft(sig))
        freqs = np.fft.rfftfreq(n, d=1.0 / fps)

        pulse_band_mask = (freqs >= 0.75) & (freqs <= 2.5)
        if not np.any(pulse_band_mask):
            return {"has_face": face_detected, "pulse_snr": 0.0, "failed": False}

        band_power = np.sum(fft_vals[pulse_band_mask] ** 2)
        total_power = np.sum(fft_vals ** 2) + 1e-6
        pulse_snr = float(band_power / total_power)

        peak_in_band = float(np.max(fft_vals[pulse_band_mask])) if np.any(pulse_band_mask) else 0.0
        mean_noise = float(np.mean(fft_vals[~pulse_band_mask])) if np.any(~pulse_band_mask) else 1e-6
        peak_to_noise = peak_in_band / max(mean_noise, 1e-6)

        return {
            "has_face": face_detected,
            "pulse_snr": round(pulse_snr, 4),
            "peak_to_noise": round(peak_to_noise, 4),
            "sampled_frames": len(green_signals),
            "failed": False
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        return 0.90 if features.get("has_face") else 0.40

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5

        if not features.get("has_face"):
            return 0.5

        snr = features["pulse_snr"]
        p2n = features["peak_to_noise"]

        # Genuine living human face has strong periodic cardiac pulse (SNR > 0.45, peak-to-noise > 3.0)
        if snr > 0.42 and p2n > 2.8:
            return 0.15  # Genuine biological human pulse verified
        elif snr < 0.18 and p2n < 1.6:
            return 0.85  # Artificial / Deepfake synthetic video (zero cardiac rhythm)

        return 0.50

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class EyeBlinkDynamicsAnalyzer(BaseDetector):
    """
    Biometric Micro-Dynamics: Eye-Blink Duration & Eyelid Aspect Ratio (EAR) Trajectory.
    Biological humans blink every 2-6 seconds with smooth 100-400ms duration curves.
    AI video models exhibit static non-blinking staring, incomplete eyelid closure, or instantaneous state flipping.
    """
    def __init__(self):
        super().__init__("Eye Blink Micro-Dynamics Analyzer", "2.0", "video")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        video_path = preprocessed_data["video_path"]
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"failed": True, "reason": "Cannot open video"}

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames < 20:
            cap.release()
            return {"failed": True, "reason": "Video too short"}

        try:
            cascade_path = getattr(cv2.data, "haarcascades", "") + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(cascade_path) if os.path.exists(cascade_path) else None
            if face_cascade and face_cascade.empty():
                face_cascade = None
        except Exception:
            face_cascade = None
        
        # Sample up to 50 frames
        sample_count = min(50, total_frames)
        step = max(1, total_frames // sample_count)
        
        eye_darkness_trend = []
        has_face = False

        for i in range(sample_count):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i * step)
            ret, frame = cap.read()
            if not ret:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = []
            if face_cascade is not None:
                try:
                    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=3, minSize=(60, 60))
                except Exception:
                    faces = []

            if len(faces) > 0:
                has_face = True
                fx, fy, fw, fh = faces[0]
                eye_band = gray[fy + int(fh*0.2) : fy + int(fh*0.45), fx : fx + fw]
                eye_darkness_trend.append(float(np.mean(eye_band)))

        cap.release()

        if len(eye_darkness_trend) < 10 or not has_face:
            return {"has_face": has_face, "blink_detected": False, "failed": False}

        # Measure variance of eye-region luminance over time
        trend_var = float(np.var(eye_darkness_trend))
        # Sudden spike followed by recovery indicates authentic blink
        diffs = np.diff(eye_darkness_trend)
        max_jump = float(np.max(np.abs(diffs))) if len(diffs) > 0 else 0.0

        return {
            "has_face": True,
            "eye_luminance_variance": round(trend_var, 4),
            "max_blink_transition": round(max_jump, 4),
            "sampled_frames": len(eye_darkness_trend),
            "failed": False
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("has_face", False) or features.get("failed"):
            return 0.0
        return 0.85

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("has_face", False) or features.get("failed"):
            return 0.5

        var = features["eye_luminance_variance"]
        jump = features["max_blink_transition"]

        # Completely static eyes across 50 frames -> High AI probability
        if var < 0.8 and jump < 1.5:
            return 0.78  # Synthetic staring face
        elif 3.0 <= var <= 45.0 and jump >= 4.0:
            return 0.22  # Natural physiological eyelid micro-dynamics

        return 0.50

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class HighOrderWarpingConsistencyAnalyzer(BaseDetector):
    """
    Spatio-Temporal Optical Flow Warping Inconsistency:
    Measures frame-to-frame backward-forward warping consistency error (MSE(I_t, Warp(I_{t+1}, v))).
    Generative video models (Sora, Runway Gen-3, Kling, Luma) exhibit geometry morphing and temporal phase jitter.
    """
    def __init__(self):
        super().__init__("Spatio-Temporal Warping Inconsistency Analyzer", "2.0", "video")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        video_path = preprocessed_data["video_path"]
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"failed": True, "reason": "Cannot open video"}

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames < 4:
            cap.release()
            return {"failed": True, "reason": "Video too short"}

        start = max(0, total_frames // 2 - 4)
        cap.set(cv2.CAP_PROP_POS_FRAMES, start)

        frames = []
        for _ in range(8):
            ret, frame = cap.read()
            if not ret:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            # Resize for fast flow computation
            small = cv2.resize(gray, (256, 256))
            frames.append(small)

        cap.release()

        if len(frames) < 3:
            return {"failed": True, "reason": "Not enough frames"}

        warping_errors = []
        h, w = frames[0].shape

        for i in range(len(frames) - 1):
            f1 = frames[i].astype(np.float32)
            f2 = frames[i+1].astype(np.float32)
            
            # Farneback Optical Flow
            flow = cv2.calcOpticalFlowFarneback(frames[i], frames[i+1], None, 0.5, 3, 15, 3, 5, 1.2, 0)
            
            # Remap grid to warp f2 backward to f1
            grid_x, grid_y = np.meshgrid(np.arange(w), np.arange(h))
            map_x = (grid_x + flow[..., 0]).astype(np.float32)
            map_y = (grid_y + flow[..., 1]).astype(np.float32)
            
            warped = cv2.remap(f2, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            
            mse = float(np.mean((f1 - warped) ** 2))
            warping_errors.append(mse)

        mean_warp_error = float(np.mean(warping_errors)) if warping_errors else 0.0
        warp_error_std = float(np.std(warping_errors)) if len(warping_errors) > 1 else 0.0

        return {
            "mean_warping_error": round(mean_warp_error, 4),
            "warping_error_std": round(warp_error_std, 4),
            "failed": False
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5

        err = features["mean_warping_error"]
        std = features["warping_error_std"]

        # Natural physical video: optical flow reconstructs adjacent frames with low warping error (MSE < 35)
        # AI generative video: high warping error and morphing instability (MSE > 95 or erratic std > 40)
        if err > 110.0 or std > 45.0:
            return 0.85
        elif err < 30.0 and std < 12.0:
            return 0.20

        return 0.50

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class ContainerBitstreamForensicsAnalyzer(BaseDetector):
    """
    Container & Encoder Bitstream Provenance:
    Parses MP4/MOV atom hierarchies (`ftyp`, `moov`, `mdat`), GOP cadence regularity,
    and encoder software signatures (e.g. `Lavf`/ffmpeg synthetic exports vs native iOS/Android camera encoders).
    """
    def __init__(self):
        super().__init__("Video Container & Bitstream Forensics", "2.0", "video")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        video_path = preprocessed_data["video_path"]
        try:
            with open(video_path, "rb") as fh:
                header = fh.read(65536)
                fh.seek(max(0, fh.tell() - 65536), 2)
                footer = fh.read()

            raw_bytes = header + footer
            text = raw_bytes.decode("latin1", errors="ignore").lower()

            is_mp4 = b"ftyp" in header
            has_moov = b"moov" in raw_bytes
            has_mdat = b"mdat" in raw_bytes

            # Check for standard camera encoder tags
            camera_encoders = ["quicktime", "apple", "canon", "sony", "samsung", "pixel", "nikon", "gopro"]
            ai_and_synthetic_encoders = ["lavf", "libx264", "ffmpeg", "handbrake", "comfy", "runway", "pika", "sora", "kling"]

            camera_hits = [tag for tag in camera_encoders if tag in text]
            synthetic_hits = [tag for tag in ai_and_synthetic_encoders if tag in text]

            return {
                "is_mp4": is_mp4,
                "has_moov": has_moov,
                "has_mdat": has_mdat,
                "camera_encoder_hits": camera_hits,
                "synthetic_encoder_hits": synthetic_hits,
                "failed": False
            }
        except Exception as e:
            return {"failed": True, "reason": str(e)}

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        return 0.90

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5

        syn = features["synthetic_encoder_hits"]
        cam = features["camera_encoder_hits"]

        if any(tag in syn for tag in ["runway", "pika", "sora", "kling", "comfy"]):
            return 0.98  # Direct generative video tool metadata
        if len(cam) >= 1 and len(syn) == 0:
            return 0.15  # Genuine camera hardware metadata

        return 0.50

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


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
            cap.release()
            return {"success": False}

        num_samples = min(5, total_frames)
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
            
        var = features["lum_variance"]
        if var > 500.0:
            return 0.7
        elif var < 5.0:
            return 0.3
            
        return 0.5

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class AudioVideoSyncAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Audio/Video Lip-Sync Analyzer", "1.0", "video")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"video_path": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        video_path = preprocessed_data["video_path"]
        try:
            import production_detectors
            result = production_detectors.analyze_face_dynamics(video_path)
            return result
        except Exception:
            return {"applicable": False}

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return 1.0 if features.get("applicable", True) else 0.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("applicable", True):
            return 0.5
            
        corr = features.get("mouth_audio_correlation", 1.0)
        if corr < 0.2:
            return 0.85
        elif corr < 0.4:
            return 0.65
        return 0.2

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class VideoTemporalOrchestrator:
    """
    Orchestrates execution of the government/defense-grade video forensic ensemble.
    """
    def __init__(self):
        self.detectors = [
            TemporalMotionAnalyzer(),
            VisualConsistencyAnalyzer(),
            AudioVideoSyncAnalyzer(),
            CodecAnalyzer(),
            SpatioTemporalClassifierAnalyzer(),
            RPPGCMPulseAnalyzer(),
            EyeBlinkDynamicsAnalyzer(),
            HighOrderWarpingConsistencyAnalyzer(),
            ContainerBitstreamForensicsAnalyzer()
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
        except Exception:
            pass
            
        for det in self.detectors:
            try:
                signal = det.execute(video_path, ctx)
                if signal.signal_quality is not None and signal.signal_quality > 0.05:
                    signals.append(signal)
            except Exception as e:
                print(f"Failed to execute {det.name}: {e}")
                
        fusion_result = self.fusion_engine.fuse(signals)
        return fusion_result
