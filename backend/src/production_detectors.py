import gc
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import torch

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR.parent / "models"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


TEXT_MODEL_SPECS = {
    "arabert": {
        "name": "AraBERT AI-authorship classifier",
        "path": MODELS_DIR / "arabic_text" / "arabert",
        "ai_index": 1,
        "coverage": "Modern Standard Arabic and limited dialectal Arabic",
    },
    "marbert": {
        "name": "MARBERT AI-authorship classifier",
        "path": MODELS_DIR / "arabic_text" / "marbert",
        "ai_index": 1,
        "coverage": "Dialectal Arabic and Modern Standard Arabic",
    },
    "camelbert": {
        "name": "CAMeLBERT AI-authorship classifier",
        "path": MODELS_DIR / "arabic_text" / "camelbert",
        "ai_index": 1,
        "coverage": "Modern Standard Arabic and dialectal Arabic",
    },
    "xlmr": {
        "name": "XLM-R AI-authorship classifier",
        "path": MODELS_DIR / "arabic_text" / "xlmr",
        "ai_index": 1,
        "coverage": "Arabic-English code-switching and Arabizi",
    },
}


IMAGE_MODEL_SPECS = {
    "general_vit": {
        "name": "General AI-image ViT",
        "path": MODELS_DIR / "image_vit",
        "ai_index": 1,
        "coverage": "CIFAKE AI-versus-real image classifier",
    },
    "diffusion_vit": {
        "name": "SDXL diffusion fingerprint ViT",
        "path": MODELS_DIR / "image_diffusion_vit",
        "ai_index": 1,
        "coverage": "Stable Diffusion XL specialist",
    },
    "gan_face_vit": {
        "name": "StyleGAN face fingerprint ViT",
        "path": MODELS_DIR / "image_gan_vit",
        "ai_index": 0,
        "coverage": "StyleGAN and AI-generated face specialist",
        "requires_face": True,
    },
}


_text_models = {}
_arabic_classical_model = None
_image_models = {}
_active_image_model_key = None
_whisper_model = None
_audio_deepfake_model = None


def _model_files_exist(path):
    path = Path(path)
    return (path / "config.json").exists() and any(
        (path / filename).exists()
        for filename in ("model.safetensors", "pytorch_model.bin")
    )


def _load_text_model(key):
    if key in _text_models:
        return _text_models[key]
    spec = TEXT_MODEL_SPECS[key]
    if not _model_files_exist(spec["path"]):
        raise FileNotFoundError(f"Fine-tuned checkpoint not found at {spec['path']}")
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(str(spec["path"]), local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(
        str(spec["path"]), local_files_only=True
    ).to(DEVICE)
    model.eval()
    _text_models[key] = (tokenizer, model)
    return tokenizer, model


def predict_arabic_text_models(text, arabic_share, mixed_language, arabizi_ratio):
    if mixed_language or arabizi_ratio > 0.05:
        preference = ["xlmr", "marbert", "arabert", "camelbert"]
    elif arabic_share >= 0.65:
        preference = ["arabert", "camelbert", "marbert", "xlmr"]
    else:
        preference = ["marbert", "xlmr", "arabert", "camelbert"]

    outputs = []
    selected = next(
        (
            key
            for key in preference
            if _model_files_exist(TEXT_MODEL_SPECS[key]["path"])
        ),
        None,
    )
    for key in preference:
        spec = TEXT_MODEL_SPECS[key]
        if not _model_files_exist(spec["path"]):
            outputs.append(
                {
                    "key": key,
                    "name": spec["name"],
                    "available": False,
                    "reason": f"No fine-tuned AI-authorship checkpoint is installed at {spec['path']}",
                    "selected": False,
                }
            )
            continue
        try:
            tokenizer, model = _load_text_model(key)
            if tokenizer is None or model is None:
                raise RuntimeError("Text model failed to load")
            encoded = tokenizer(
                text, return_tensors="pt", truncation=True, max_length=512
            ).to(DEVICE)
            with torch.inference_mode():
                probabilities = torch.softmax(model(**encoded).logits, dim=-1)[0]
            score = float(probabilities[spec["ai_index"]].item())
            outputs.append(
                {
                    "key": key,
                    "name": spec["name"],
                    "available": True,
                    "score": score,
                    "confidence": 0.90 if key == selected else 0.78,
                    "selected": key == selected,
                    "evidence": f"checkpoint={spec['path'].name}; coverage={spec['coverage']}; selected={key == selected}",
                }
            )
        except Exception as exc:
            outputs.append(
                {
                    "key": key,
                    "name": spec["name"],
                    "available": False,
                    "reason": f"Model inference failed: {exc}",
                    "selected": False,
                }
            )
    return outputs


def predict_arabic_classical_model(text):
    """Run the calibrated CPU Arabic content classifier when provisioned."""

    global _arabic_classical_model
    model_path = MODELS_DIR / "arabic_text" / "classical.joblib"
    if not model_path.is_file():
        return {
            "available": False,
            "name": "Arabic character/word content classifier",
            "reason": f"No trained CPU checkpoint is installed at {model_path}",
        }
    try:
        if _arabic_classical_model is None:
            import joblib

            _arabic_classical_model = joblib.load(model_path)
        artifact = _arabic_classical_model
        features = artifact["vectorizer"].transform([text])
        raw_probability = float(artifact["classifier"].predict_proba(features)[0, 1])
        probability = float(artifact["calibrator"].predict([raw_probability])[0])
        test_metrics = artifact.get("test_metrics", {})
        measured_f1 = float(test_metrics.get("f1", 0.70))
        return {
            "available": True,
            "name": "Arabic character/word content classifier",
            "score": probability,
            "confidence": min(0.96, max(0.55, measured_f1)),
            "evidence": (
                f"calibrated CPU content model; held-out test F1={measured_f1:.4f}; "
                f"coverage={artifact.get('coverage', 'Arabic training corpus')}"
            ),
        }
    except Exception as exc:
        return {
            "available": False,
            "name": "Arabic character/word content classifier",
            "reason": f"CPU classifier inference failed: {exc}",
        }


def _load_image_model(key):
    global _active_image_model_key
    if key in _image_models:
        return _image_models[key]

    spec = IMAGE_MODEL_SPECS[key]
    if not _model_files_exist(spec["path"]):
        raise FileNotFoundError(f"Image checkpoint not found at {spec['path']}")
    try:
        from transformers import AutoImageProcessor, AutoModelForImageClassification
    except ImportError:
        from transformers import (
            AutoFeatureExtractor as AutoImageProcessor,
            AutoModelForImageClassification,
        )

    processor = AutoImageProcessor.from_pretrained(
        str(spec["path"]), local_files_only=True
    )
    model = AutoModelForImageClassification.from_pretrained(
        str(spec["path"]), local_files_only=True
    ).to(DEVICE)
    model.eval()
    _image_models[key] = (processor, model)
    _active_image_model_key = key
    return processor, model


def predict_image_models(image, face_present=False):
    outputs = []
    for key, spec in IMAGE_MODEL_SPECS.items():
        if spec.get("requires_face") and not face_present:
            outputs.append(
                {
                    "key": key,
                    "name": spec["name"],
                    "available": True,
                    "applicable": False,
                    "reason": "The specialist model is applicable only when a face is detected.",
                }
            )
            continue
        try:
            processor, model = _load_image_model(key)
            if processor is None or model is None:
                raise RuntimeError("Image model failed to load")
            inputs = processor(images=image.convert("RGB"), return_tensors="pt").to(
                DEVICE
            )
            with torch.inference_mode():
                probabilities = torch.softmax(model(**inputs).logits, dim=-1)[0]
            outputs.append(
                {
                    "key": key,
                    "name": spec["name"],
                    "available": True,
                    "applicable": True,
                    "score": float(probabilities[int(str(spec["ai_index"]))].item()),
                    "confidence": 0.82 if key == "general_vit" else 0.72,
                    "evidence": f"checkpoint={Path(str(spec['path'])).name}; scope={spec['coverage']}",
                }
            )
        except Exception as exc:
            outputs.append(
                {
                    "key": key,
                    "name": spec["name"],
                    "available": False,
                    "applicable": True,
                    "reason": f"Model inference failed: {exc}",
                }
            )
    return outputs


def compute_wavelet_forensics(image):
    import pywt
    from scipy.stats import kurtosis

    gray = np.asarray(image.convert("L").resize((512, 512)), dtype=np.float32) / 255.0
    approximation, (horizontal, vertical, diagonal) = pywt.dwt2(gray, "db2")
    high = np.concatenate([horizontal.ravel(), vertical.ravel(), diagonal.ravel()])
    total_energy = float(np.mean(gray * gray)) + 1e-8
    high_energy = float(np.mean(high * high))
    energy_ratio = high_energy / total_energy
    tail_kurtosis = float(kurtosis(high, fisher=False, bias=False))
    orientation = np.asarray(
        [
            np.mean(np.abs(horizontal)),
            np.mean(np.abs(vertical)),
            np.mean(np.abs(diagonal)),
        ]
    )
    orientation_cv = float(np.std(orientation) / max(np.mean(orientation), 1e-8))
    score = float(
        np.clip(
            0.35
            + max(0.0, 0.012 - energy_ratio) * 12.0
            + max(0.0, 2.5 - tail_kurtosis) * 0.08,
            0,
            1,
        )
    )
    return {
        "score": score,
        "confidence": 0.46,
        "energy_ratio": energy_ratio,
        "kurtosis": tail_kurtosis,
        "orientation_cv": orientation_cv,
    }


def compute_prnu_residual_forensics(image):
    rgb = np.asarray(image.convert("RGB").resize((512, 512)), dtype=np.float32) / 255.0
    residuals = []
    correlations = []
    periodicity = []
    for channel in range(3):
        plane = rgb[..., channel]
        denoised = (
            cv2.fastNlMeansDenoising(
                (plane * 255).astype(np.uint8), None, 5, 7, 21
            ).astype(np.float32)
            / 255.0
        )
        residual = plane - denoised
        residuals.append(residual)
        if np.std(residual) > 1e-8 and np.std(plane) > 1e-8:
            correlations.append(
                float(np.corrcoef(residual.ravel(), plane.ravel())[0, 1])
            )
        spectrum = np.abs(np.fft.fftshift(np.fft.fft2(residual)))
        periodicity.append(float(np.max(spectrum) / max(np.mean(spectrum), 1e-8)))
    residual_std = float(np.mean([np.std(item) for item in residuals]))
    intensity_correlation = float(np.nanmean(correlations)) if correlations else 0.0
    periodic_peak = float(np.mean(periodicity))
    score = float(
        np.clip(
            0.48
            + max(0.0, 0.006 - residual_std) * 25.0
            + max(0.0, periodic_peak - 14.0) * 0.015,
            0,
            1,
        )
    )
    return {
        "score": score,
        "confidence": 0.38,
        "residual_std": residual_std,
        "intensity_correlation": intensity_correlation,
        "periodic_peak": periodic_peak,
        "reference_attribution": False,
    }


def compute_scene_physics_forensics(image):
    from skimage.feature import local_binary_pattern

    rgb = np.asarray(image.convert("RGB").resize((512, 512)), dtype=np.uint8)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    illumination = cv2.GaussianBlur(gray.astype(np.float32), (0, 0), 32)
    gx = cv2.Sobel(illumination, cv2.CV_32F, 1, 0, ksize=5)
    gy = cv2.Sobel(illumination, cv2.CV_32F, 0, 1, ksize=5)
    angles = np.arctan2(gy, gx)
    magnitudes = np.hypot(gx, gy)
    valid = magnitudes > np.percentile(magnitudes, 65)
    lighting_resultant = (
        float(np.hypot(np.mean(np.cos(angles[valid])), np.mean(np.sin(angles[valid]))))
        if np.any(valid)
        else 0.0
    )

    dark_mask = gray < np.percentile(gray, 20)
    edges = cv2.Canny(gray, 80, 180) > 0
    shadow_boundary = (
        cv2.morphologyEx(
            dark_mask.astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)
        )
        > 0
    )
    shadow_edge_overlap = float(
        np.sum(shadow_boundary & edges) / max(np.sum(shadow_boundary), 1)
    )

    lines = cv2.HoughLinesP(
        edges.astype(np.uint8) * 255, 1, np.pi / 180, 50, minLineLength=40, maxLineGap=8
    )
    if lines is not None and len(lines) >= 4:
        line_angles = np.asarray(
            [math.atan2(y2 - y1, x2 - x1) for [[x1, y1, x2, y2]] in lines]
        )
        geometry_concentration = float(
            np.hypot(np.mean(np.cos(2 * line_angles)), np.mean(np.sin(2 * line_angles)))
        )
    else:
        geometry_concentration = 0.0

    lbp = local_binary_pattern(gray, 8, 1, method="uniform")
    histogram, _ = np.histogram(lbp.ravel(), bins=np.arange(11), density=True)
    histogram = histogram[histogram > 0]
    texture_entropy = float(-np.sum(histogram * np.log2(histogram)))

    return {
        "lighting_score": float(np.clip(0.58 - 0.28 * lighting_resultant, 0, 1)),
        "lighting_confidence": 0.28,
        "lighting_direction_consistency": lighting_resultant,
        "shadow_score": float(np.clip(0.62 - 0.55 * shadow_edge_overlap, 0, 1)),
        "shadow_confidence": 0.24,
        "shadow_edge_overlap": shadow_edge_overlap,
        "geometry_score": float(np.clip(0.55 - 0.20 * geometry_concentration, 0, 1)),
        "geometry_confidence": 0.24,
        "geometry_line_concentration": geometry_concentration,
        "texture_score": float(np.clip(0.72 - 0.18 * texture_entropy, 0, 1)),
        "texture_confidence": 0.32,
        "texture_lbp_entropy": texture_entropy,
    }


def compute_jpeg_block_forensics(image):
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    if gray.shape[0] < 16 or gray.shape[1] < 16:
        raise ValueError("Image is too small for block artifact analysis")
    vertical = np.abs(np.diff(gray, axis=1))
    horizontal = np.abs(np.diff(gray, axis=0))
    boundary = np.concatenate([vertical[:, 7::8].ravel(), horizontal[7::8, :].ravel()])
    interior = np.concatenate([vertical[:, 3::8].ravel(), horizontal[3::8, :].ravel()])
    block_ratio = float(np.mean(boundary) / max(np.mean(interior), 1e-6))
    score = float(np.clip(0.45 + max(0.0, block_ratio - 1.8) * 0.18, 0, 1))
    return {"score": score, "confidence": 0.34, "block_boundary_ratio": block_ratio}


def detect_faces_rgb(rgb_frame):
    try:
        import cv2.data  # type: ignore

        gray = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2GRAY)
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        return cascade.detectMultiScale(gray, 1.1, 4)
    except Exception as e:
        import logging

        logging.getLogger(__name__).warning(
            f"Face detection skipped due to cv2 error: {e}"
        )
        return []


def analyze_klt_object_tracks(rgb_frames):
    if len(rgb_frames) < 3:
        raise ValueError("At least three frames are required")
    grays = [cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY) for frame in rgb_frames]
    points = cv2.goodFeaturesToTrack(
        grays[0], maxCorners=250, qualityLevel=0.01, minDistance=7
    )
    if points is None or len(points) < 10:
        raise ValueError("Insufficient trackable features")
    initial_count = len(points)
    survival = []
    displacement_cv = []
    previous = grays[0]
    current_points = points
    for gray in grays[1:]:
        next_points, status, _ = cv2.calcOpticalFlowPyrLK(previous, gray, current_points, nextPts=None)  # type: ignore
        if next_points is None or status is None:
            break
        good_new = next_points[status.ravel() == 1]
        good_old = current_points[status.ravel() == 1]
        if len(good_new) < 5:
            survival.append(0.0)
            break
        displacement = np.linalg.norm(good_new - good_old, axis=1)
        displacement_cv.append(
            float(np.std(displacement) / max(np.mean(displacement), 1e-6))
        )
        survival.append(len(good_new) / initial_count)
        current_points = good_new.reshape(-1, 1, 2)
        previous = gray
    mean_survival = float(np.mean(survival)) if survival else 0.0
    motion_cv = float(np.mean(displacement_cv)) if displacement_cv else 2.0
    score = float(
        np.clip(0.70 - 0.40 * mean_survival + max(0.0, motion_cv - 1.2) * 0.12, 0, 1)
    )
    return {
        "score": score,
        "confidence": 0.42,
        "initial_tracks": initial_count,
        "mean_track_survival": mean_survival,
        "motion_cv": motion_cv,
    }


def _eye_aspect_ratio(landmarks, indices, width, height):
    points = np.asarray(
        [(landmarks[index].x * width, landmarks[index].y * height) for index in indices]
    )
    vertical_a = np.linalg.norm(points[1] - points[5])
    vertical_b = np.linalg.norm(points[2] - points[4])
    horizontal = np.linalg.norm(points[0] - points[3])
    return float((vertical_a + vertical_b) / max(2.0 * horizontal, 1e-6))


def analyze_face_dynamics(rgb_frames):
    import mediapipe as mp

    left_eye = [33, 160, 158, 133, 153, 144]
    right_eye = [362, 385, 387, 263, 373, 380]
    ears = []
    yaw_pitch = []
    detected = 0
    with mp.solutions.face_mesh.FaceMesh(  # type: ignore
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as mesh:
        for frame in rgb_frames:
            result = mesh.process(frame)
            if not result.multi_face_landmarks:
                continue
            detected += 1
            landmarks = result.multi_face_landmarks[0].landmark
            height, width = frame.shape[:2]
            ear = (
                _eye_aspect_ratio(landmarks, left_eye, width, height)
                + _eye_aspect_ratio(landmarks, right_eye, width, height)
            ) / 2.0
            ears.append(ear)
            image_points = np.asarray(
                [
                    (landmarks[1].x * width, landmarks[1].y * height),
                    (landmarks[152].x * width, landmarks[152].y * height),
                    (landmarks[33].x * width, landmarks[33].y * height),
                    (landmarks[263].x * width, landmarks[263].y * height),
                    (landmarks[61].x * width, landmarks[61].y * height),
                    (landmarks[291].x * width, landmarks[291].y * height),
                ],
                dtype=np.float64,
            )
            model_points = np.asarray(
                [
                    (0.0, 0.0, 0.0),
                    (0.0, -63.6, -12.5),
                    (-43.3, 32.7, -26.0),
                    (43.3, 32.7, -26.0),
                    (-28.9, -28.9, -24.1),
                    (28.9, -28.9, -24.1),
                ],
                dtype=np.float64,
            )
            focal = width
            camera = np.asarray(
                [[focal, 0, width / 2], [0, focal, height / 2], [0, 0, 1]],
                dtype=np.float64,
            )
            ok, rotation, _ = cv2.solvePnP(
                model_points,
                image_points,
                camera,
                np.zeros((4, 1)),
                flags=cv2.SOLVEPNP_ITERATIVE,
            )
            if ok:
                matrix, _ = cv2.Rodrigues(rotation)
                angles, _, _, _, _, _ = cv2.RQDecomp3x3(matrix)
                yaw_pitch.append((angles[1], angles[0]))

    if detected < 3:
        return {
            "applicable": False,
            "face_frames": detected,
            "reason": "A stable face was not visible in enough sampled frames.",
        }
    blink_count = 0
    closed = False
    threshold = max(0.16, float(np.median(ears)) * 0.72)
    for value in ears:
        if value < threshold and not closed:
            closed = True
        elif value >= threshold and closed:
            blink_count += 1
            closed = False
    pose_jitter = (
        float(np.mean(np.linalg.norm(np.diff(np.asarray(yaw_pitch), axis=0), axis=1)))
        if len(yaw_pitch) >= 2
        else 0.0
    )
    score = float(
        np.clip(
            0.35
            + max(0.0, pose_jitter - 12.0) * 0.025
            + (0.12 if blink_count == 0 and detected >= 8 else 0.0),
            0,
            1,
        )
    )
    return {
        "applicable": True,
        "score": score,
        "confidence": 0.48,
        "face_frames": detected,
        "blink_count": blink_count,
        "median_ear": float(np.median(ears)),
        "head_pose_jitter_degrees": pose_jitter,
    }


def analyze_codec(video_path):
    import av

    with av.open(video_path) as container:
        stream = next(
            (item for item in container.streams if item.type == "video"), None
        )
        if stream is None:
            raise ValueError("No video stream")
        context = stream.codec_context
        return {
            "codec": context.name,
            "profile": context.profile or "unknown",  # type: ignore
            "pixel_format": str(context.format.name if context.format else "unknown"),  # type: ignore
            "bit_rate": int(context.bit_rate or stream.bit_rate or 0),  # type: ignore
            "has_b_frames": int(context.has_b_frames or 0),  # type: ignore
            "time_base": str(stream.time_base),
        }


def analyze_audio_spectrum(video_path, max_seconds=45):
    from scipy.signal import stft

    audio, sample_rate = decode_audio_mono(video_path, max_seconds=max_seconds)
    if audio is None:
        return {"applicable": False, "reason": "No decodable audio stream exists."}
    frequencies, _, spectrum = stft(
        audio, fs=sample_rate, nperseg=512, noverlap=256, boundary=None
    )
    power = np.abs(spectrum) ** 2 + 1e-12
    flatness = np.exp(np.mean(np.log(power), axis=0)) / np.mean(power, axis=0)
    centroid = np.sum(frequencies[:, None] * power, axis=0) / np.sum(power, axis=0)
    cumulative = np.cumsum(power, axis=0)
    thresholds = cumulative[-1] * 0.85
    rolloff_indexes = np.argmax(cumulative >= thresholds[None, :], axis=0)
    rolloff = frequencies[rolloff_indexes]
    zcr = np.mean(np.abs(np.diff(np.signbit(audio).astype(np.int8))))
    flatness_cv = float(np.std(flatness) / max(np.mean(flatness), 1e-6))
    score = float(
        np.clip(
            0.58
            - min(flatness_cv, 2.0) * 0.14
            + max(0.0, np.mean(centroid) - 4500) / 12000,
            0,
            1,
        )
    )
    return {
        "applicable": True,
        "score": score,
        "confidence": 0.30,
        "duration_seconds": len(audio) / sample_rate,
        "spectral_flatness_mean": float(np.mean(flatness)),
        "spectral_flatness_cv": flatness_cv,
        "spectral_centroid_hz": float(np.mean(centroid)),
        "spectral_rolloff_hz": float(np.mean(rolloff)),
        "zero_crossing_rate": float(zcr),
    }


def decode_audio_mono(video_path, max_seconds=45):
    import av

    samples = []
    sample_rate = 16000
    with av.open(video_path) as container:
        stream = next(
            (item for item in container.streams if item.type == "audio"), None
        )
        if stream is None:
            return None, sample_rate
        resampler = av.AudioResampler(format="s16", layout="mono", rate=sample_rate)
        for frame in container.decode(stream):  # type: ignore
            for converted in resampler.resample(frame):
                samples.append(converted.to_ndarray().reshape(-1))
            if sum(len(item) for item in samples) >= sample_rate * max_seconds:
                break
    if not samples:
        return None, sample_rate
    audio = (
        np.concatenate(samples)[: sample_rate * max_seconds].astype(np.float32)
        / 32768.0
    )
    return audio, sample_rate


def analyze_lip_sync(video_path, rgb_frames, timestamps):
    import mediapipe as mp

    audio, sample_rate = decode_audio_mono(
        video_path, max_seconds=max(timestamps, default=0) + 1
    )
    if audio is None:
        return {"applicable": False, "reason": "No decodable audio stream exists."}
    mouth_values = []
    audio_values = []
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True) as mesh:  # type: ignore
        for frame, timestamp in zip(rgb_frames, timestamps):
            result = mesh.process(frame)
            if not result.multi_face_landmarks:
                continue
            landmarks = result.multi_face_landmarks[0].landmark
            height, width = frame.shape[:2]
            top = np.asarray([landmarks[13].x * width, landmarks[13].y * height])
            bottom = np.asarray([landmarks[14].x * width, landmarks[14].y * height])
            left = np.asarray([landmarks[61].x * width, landmarks[61].y * height])
            right = np.asarray([landmarks[291].x * width, landmarks[291].y * height])
            mouth_values.append(
                float(
                    np.linalg.norm(top - bottom)
                    / max(np.linalg.norm(left - right), 1e-6)
                )
            )
            center = int(timestamp * sample_rate)
            radius = int(0.10 * sample_rate)
            window = audio[max(0, center - radius) : min(len(audio), center + radius)]
            audio_values.append(
                float(np.sqrt(np.mean(window * window))) if len(window) else 0.0
            )
    if (
        len(mouth_values) < 5
        or np.std(mouth_values) < 1e-5
        or np.std(audio_values) < 1e-6
    ):
        return {
            "applicable": False,
            "reason": "Insufficient visible mouth motion or voiced audio for synchronization.",
        }
    correlation = float(np.corrcoef(mouth_values, audio_values)[0, 1])
    score = float(np.clip(0.62 - max(correlation, -0.2) * 0.45, 0, 1))
    return {
        "applicable": True,
        "score": score,
        "confidence": 0.34,
        "mouth_audio_correlation": correlation,
        "sample_count": len(mouth_values),
    }


def predict_audio_deepfake(video_path):
    global _audio_deepfake_model
    model_path = MODELS_DIR / "audio_deepfake"
    if not _model_files_exist(model_path):
        raise FileNotFoundError(f"Audio deepfake checkpoint not found at {model_path}")
    audio, sample_rate = decode_audio_mono(video_path, max_seconds=30)
    if audio is None:
        return {"applicable": False, "reason": "No decodable audio stream exists."}
    if _audio_deepfake_model is None:
        from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

        extractor = AutoFeatureExtractor.from_pretrained(
            str(model_path), local_files_only=True
        )
        model = AutoModelForAudioClassification.from_pretrained(
            str(model_path), local_files_only=True
        ).to(DEVICE)
        model.eval()
        labels = {
            int(key): str(value).lower() for key, value in model.config.id2label.items()
        }
        fake_matches = [
            index
            for index, label in labels.items()
            if "fake" in label or "spoof" in label or "synthetic" in label
        ]
        if len(fake_matches) != 1:
            raise ValueError(
                f"Audio checkpoint labels do not identify one fake class: {labels}"
            )
        _audio_deepfake_model = (extractor, model, fake_matches[0])
    extractor, model, fake_index = _audio_deepfake_model
    inputs = extractor(
        audio, sampling_rate=sample_rate, return_tensors="pt", padding=True
    ).to(DEVICE)
    with torch.inference_mode():
        probabilities = torch.softmax(model(**inputs).logits, dim=-1)[0]
    return {
        "applicable": True,
        "score": float(probabilities[fake_index].item()),
        "confidence": 0.72,
        "checkpoint": str(model_path),
    }


def _find_whisper_snapshot():
    root = (
        MODELS_DIR / "whisper" / "models--Systran--faster-whisper-small" / "snapshots"
    )
    if not root.exists():
        return None
    return next((path for path in root.iterdir() if path.is_dir()), None)


def transcribe_arabic_speech_local(video_path, max_seconds=45):
    global _whisper_model
    snapshot = _find_whisper_snapshot()
    if snapshot is None:
        raise FileNotFoundError(
            "The provisioned faster-whisper-small checkpoint was not found"
        )
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(str(snapshot), device="cpu", compute_type="int8")
    segments, info = _whisper_model.transcribe(
        video_path, beam_size=3, vad_filter=True, clip_timestamps=f"0,{max_seconds}"
    )
    transcript = " ".join(
        segment.text.strip() for segment in segments if segment.text.strip()
    )
    return {
        "transcript": transcript,
        "language": info.language,
        "language_probability": info.language_probability,
        "model": "faster-whisper-small-int8",
    }


def transcribe_arabic_speech(video_path, max_seconds=30):
    worker = BASE_DIR / "scripts" / "asr_worker.py"
    timeout = float(
        os.environ.get(
            "ASR_TIMEOUT_SECONDS", "20" if not torch.cuda.is_available() else "60"
        )
    )
    environment = dict(os.environ)
    environment.setdefault("HF_HUB_OFFLINE", "1")
    environment.setdefault("TRANSFORMERS_OFFLINE", "1")
    try:
        result = subprocess.run(
            [sys.executable, str(worker), str(video_path), str(max_seconds)],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=environment,
            check=True,
        )
    except subprocess.TimeoutExpired as exc:
        raise TimeoutError(
            f"Arabic ASR exceeded the {timeout:.0f}s production latency budget"
        ) from exc
    payload = json.loads(result.stdout.strip().splitlines()[-1])
    if payload.get("error"):
        raise RuntimeError(payload["error"])
    return payload


def release_optional_models():
    global _active_image_model_key
    _image_models.clear()
    _active_image_model_key = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def production_model_status():
    return {
        "arabic_text": {
            key: _model_files_exist(spec["path"])
            for key, spec in TEXT_MODEL_SPECS.items()
        },
        "arabic_cpu_classifier": (
            MODELS_DIR / "arabic_text" / "classical.joblib"
        ).is_file(),
        "image": {
            key: _model_files_exist(spec["path"])
            for key, spec in IMAGE_MODEL_SPECS.items()
        },
        "whisper_arabic_asr": _find_whisper_snapshot() is not None,
        "audio_deepfake": _model_files_exist(MODELS_DIR / "audio_deepfake"),
    }
