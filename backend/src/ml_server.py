import os
import sys
import uuid
from pathlib import Path

# IMPORTANT: Import transformers in the main thread to prevent circular import
# crashes when background threads (preload_image/preload_text) try to import it concurrently.
try:
    import transformers
except ImportError:
    pass

import torch
import torch.nn as nn
import torchvision.transforms as transforms
from flask import Flask, request, jsonify
from flask_cors import CORS  # type: ignore
from PIL import Image, ImageOps

try:
    import transformers
except ImportError:
    pass
import cv2
import numpy as np
import logging
from ml_utils import Profiler
from image_detector import ImageProvenanceOrchestrator
import json
import warnings
import math
from production_detectors import (  # type: ignore
    analyze_audio_spectrum,
    analyze_codec,
    analyze_face_dynamics,
    analyze_klt_object_tracks,
    analyze_lip_sync,
    compute_jpeg_block_forensics,
    compute_prnu_residual_forensics,
    compute_scene_physics_forensics,
    compute_wavelet_forensics,
    detect_faces_rgb,
    predict_arabic_classical_model,
    predict_arabic_text_models,
    predict_audio_deepfake,
    predict_image_models,
    production_model_status,
    transcribe_arabic_speech,
)

# Suppress verbose warnings from third-party libraries during fallback
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
warnings.filterwarnings("ignore", category=FutureWarning)

logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
logger = logging.getLogger("ml_server")
FUSION_MODEL_CACHE = {}

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from ml_models import (  # type: ignore
        TextDetectorModel,
        DualStreamImageDetector,
        SpatioTemporalVideoDetector,
        arabic_ratio,
        arabic_words,
        split_text_sentences,
        AdvancedTextEngine,
    )
except ImportError as e:
    logger.error(f"Could not import ml_models.py. Ensure it is in the same folder: {e}")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

try:
    from billing import billing_bp, verify_token, consume_words, verify_balance  # type: ignore

    app.register_blueprint(billing_bp, url_prefix="/billing")
except ImportError as e:
    logger.error(f"Could not import billing.py: {e}")

    def verify_token(req):
        return {"uid": "test"}

    def consume_words(uid, cnt):
        pass

    def verify_balance(uid, cnt):
        pass


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info(f"Target execution hardware device: {DEVICE}")

models_dir = "models"
os.makedirs(models_dir, exist_ok=True)

# =========================================================================
#  1. INITIALIZE UPGRADED MODELS
# =========================================================================

# 1. Text Detector
text_model = TextDetectorModel(model_dir=models_dir)

# 2. Image Detector
image_net = DualStreamImageDetector(pretrained=False)
image_checkpoint = os.path.join(models_dir, "image_detector.pth")
IMAGE_MODEL_AVAILABLE = False
if os.path.exists(image_checkpoint):
    try:
        state = torch.load(image_checkpoint, map_location=DEVICE)
        # Handle dict wrapping or raw state dict
        image_net.load_state_dict(
            state.get("model_state_dict", state) if isinstance(state, dict) else state
        )
        IMAGE_MODEL_AVAILABLE = True
        logger.info(
            "Loaded custom trained PyTorch Spatial-Spectral Image Detector (.pth)."
        )
    except Exception as e:
        logger.error(f"Error loading Image model checkpoint: {e}")
image_net.to(DEVICE)
image_net.eval()

# 3. Video Detector
video_net = SpatioTemporalVideoDetector(dual_stream_backbone=image_net)
video_checkpoint = os.path.join(models_dir, "video_detector.pth")
VIDEO_MODEL_AVAILABLE = False
if os.path.exists(video_checkpoint):
    try:
        state = torch.load(video_checkpoint, map_location=DEVICE)
        video_net.load_state_dict(
            state.get("model_state_dict", state) if isinstance(state, dict) else state
        )
        VIDEO_MODEL_AVAILABLE = True
        logger.info(
            "Loaded custom trained PyTorch Spatio-Temporal Video Detector (.pth)."
        )
    except Exception as e:
        logger.error(f"Error loading Video model checkpoint: {e}")
video_net.to(DEVICE)
video_net.eval()

# Spatial image transforms matching training resizing
img_transforms = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)

# =========================================================================
#  2. MATHEMATICAL FORENSICS ENGINE
# =========================================================================


def extract_spectral_grid(img_pil):
    """
    Extracts a 32x32 grid representing high-frequency energy across blocks
    using 2D Discrete Cosine Transform (DCT) or Laplacian high-pass filter.
    """
    try:
        img_gray = img_pil.convert("L")
        img_resized = img_gray.resize((256, 256))
        arr = np.array(img_resized).astype(np.float32)

        grid = np.zeros((32, 32), dtype=np.float32)
        for by in range(32):
            for bx in range(32):
                block = arr[by * 8 : (by + 1) * 8, bx * 8 : (bx + 1) * 8]
                try:
                    dct_coef = cv2.dct(block)
                    high_freq = np.sum(np.abs(dct_coef[4:, 4:]))
                except Exception:
                    # Mathematical Laplacian discrete backup
                    high_freq = np.sum(
                        np.abs(
                            block[1:-1, 1:-1] * 4
                            - block[:-2, 1:-1]
                            - block[2:, 1:-1]
                            - block[1:-1, :-2]
                            - block[1:-1, 2:]
                        )
                    )
                grid[by, bx] = float(high_freq)

        m = np.max(grid)
        if m > 0:
            grid = grid / m
        return grid
    except Exception as e:
        logger.error(f"Spectral grid extraction failed: {e}")
        return np.zeros((32, 32), dtype=np.float32)


def compute_fft_forensics(img_pil):
    """
    Computes 2D Fast Fourier Transform (FFT) on the green channel to detect
    periodic high-frequency grid spikes (deconvolution checkerboard artifacts).
    """
    try:
        img_gray = img_pil.convert("L")
        img_resized = img_gray.resize((256, 256))
        arr = np.array(img_resized).astype(np.float32)

        # Compute 2D FFT
        f_transform = np.fft.fft2(arr)
        f_shift = np.fft.fftshift(f_transform)
        magnitude_spectrum = np.abs(f_shift)

        # Log scaling
        magnitude_spectrum = np.log(magnitude_spectrum + 1)

        # High-frequency region (outer boundary of the spectrum)
        h, w = magnitude_spectrum.shape
        cy, cx = h // 2, w // 2

        # Create a mask to select high frequencies (excluding the central low frequencies)
        mask = np.ones((h, w), dtype=bool)
        # Exclude central 32x32 low-frequency region
        mask[cy - 16 : cy + 16, cx - 16 : cx + 16] = False

        high_freq_vals = magnitude_spectrum[mask]

        # Find peak anomalies (extreme values in high frequencies)
        mean_val = np.mean(high_freq_vals)
        std_val = np.std(high_freq_vals)
        max_val = np.max(high_freq_vals)

        # A high max-to-mean ratio (z-score of the peak) indicates a periodic grid spike!
        peak_z_score = float((max_val - mean_val) / (std_val if std_val > 0 else 1.0))

        return {
            "fft_mean": float(mean_val),
            "fft_max": float(max_val),
            "fft_peak_z": round(peak_z_score, 4),
            "success": True,
        }
    except Exception as e:
        logger.error(f"FFT forensics failed: {e}")
        return {"fft_mean": 0, "fft_max": 0, "fft_peak_z": 0.0, "success": False}


def compute_pixel_forensics(img_pil):
    """
    Calculates color channel correlation, block noise variations,
    and checkerboard upsampling anomalies.
    """
    try:
        img_resized = img_pil.resize((256, 256))
        arr = np.array(img_resized)
        if len(arr.shape) != 3 or arr.shape[2] < 3:
            return get_default_forensics()

        r, g, b = (
            arr[:, :, 0].astype(float),
            arr[:, :, 1].astype(float),
            arr[:, :, 2].astype(float),
        )

        # Pearson correlations
        r_flat, g_flat, b_flat = r.flatten(), g.flatten(), b.flatten()
        cov_rg = np.corrcoef(r_flat, g_flat)[0, 1]
        cov_rb = np.corrcoef(r_flat, b_flat)[0, 1]

        pearson_rg = float(cov_rg) if not np.isnan(cov_rg) else 0.98
        pearson_rb = float(cov_rb) if not np.isnan(cov_rb) else 0.97

        # Noise estimation
        flat_block_stds = []
        for by in range(32):
            for bx in range(32):
                block = g[by * 8 : (by + 1) * 8, bx * 8 : (bx + 1) * 8]
                b_min, b_max = np.min(block), np.max(block)
                if b_max - b_min < 25:
                    flat_block_stds.append(np.std(block))

        flat_block_noise = (
            float(np.mean(flat_block_stds)) if flat_block_stds else float(np.std(g))
        )
        if np.isnan(flat_block_noise):
            flat_block_noise = 1.84

        # Checkerboard upsampling deconvolution ratios
        even_diffs, odd_diffs = [], []
        for y in range(256):
            for x in range(254):
                diff = abs(g[y, x] - g[y, x + 1])
                if x % 2 == 0:
                    even_diffs.append(diff)
                else:
                    odd_diffs.append(diff)

        avg_even = np.mean(even_diffs) if even_diffs else 1.0
        avg_odd = np.mean(odd_diffs) if odd_diffs else 1.0
        checkerboard_ratio = float(avg_even / (avg_odd if avg_odd != 0 else 0.001))
        if np.isnan(checkerboard_ratio):
            checkerboard_ratio = 1.01

        # Extract DCT Block high-frequency grid energy
        grid = extract_spectral_grid(img_pil)
        dct_energy_high = float(np.mean(grid) * 100)

        # Compute FFT Peak Z-score
        fft_res = compute_fft_forensics(img_pil)
        fft_peak_z = fft_res.get("fft_peak_z", 2.14)

        return {
            "pearsonRG": round(pearson_rg, 4),
            "pearsonRB": round(pearson_rb, 4),
            "flatBlockNoise": round(flat_block_noise, 4),
            "checkerboardRatio": round(checkerboard_ratio, 4),
            "highFreqDctEnergy": round(dct_energy_high, 4),
            "fftPeakZ": round(fft_peak_z, 4),
            "success": True,
        }
    except Exception as e:
        logger.error(f"Forensics calculation failed: {e}")
        return get_default_forensics()


def compute_ela_forensics(img_pil, max_size=512):
    """
    Computes Error Level Analysis (ELA) to detect manipulated/synthetic pixels.
    """
    try:
        import io

        img_rgb = img_pil.convert("RGB")
        img_rgb.thumbnail((max_size, max_size))
        temp_io = io.BytesIO()
        img_rgb.save(temp_io, "JPEG", quality=90)
        temp_io.seek(0)
        img_jpeg = Image.open(temp_io)

        arr_orig = np.array(img_rgb).astype(np.float32)
        arr_jpeg = np.array(img_jpeg).astype(np.float32)

        diff = np.abs(arr_orig - arr_jpeg)
        ela_mean = float(np.mean(diff))
        ela_std = float(np.std(diff))

        # Calculate edge ELA vs flat ELA
        gray = cv2.cvtColor(np.array(img_rgb), cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 100, 200)

        flat_mask = edges == 0
        edge_mask = edges > 0

        flat_ela = float(np.mean(diff[flat_mask])) if np.any(flat_mask) else ela_mean
        edge_ela = float(np.mean(diff[edge_mask])) if np.any(edge_mask) else ela_mean

        ela_ratio = edge_ela / (flat_ela if flat_ela > 0 else 1.0)

        return {
            "ela_mean": round(ela_mean, 4),
            "ela_ratio": round(ela_ratio, 4),
            "success": True,
        }
    except Exception as e:
        logger.error(f"ELA computation failed: {e}")
        return {"ela_mean": 0.0, "ela_ratio": 1.0, "success": False}


def compute_benfords_law(img_pil):
    """
    Computes Benford's Law distribution on the high-frequency DCT coefficients.
    Natural photos obey Benford's Law closely, while AI-generated pixel arrays (from latent space) diverge.
    """
    try:
        arr = np.array(img_pil.convert("L"), dtype=np.float32)
        # Apply a simple 2D Haar wavelet or DCT approximation
        dct_vals = cv2.dct(cv2.resize(arr, (512, 512)))

        # Flatten and extract the first non-zero digits of high-freq AC coefficients
        ac_coeffs = dct_vals[16:, 16:].flatten()
        ac_coeffs = np.abs(ac_coeffs)
        ac_coeffs = ac_coeffs[ac_coeffs >= 1.0]

        if len(ac_coeffs) == 0:
            return {"benford_divergence": 0.0, "success": False}

        first_digits = [
            int(str(float(val))[0])
            for val in ac_coeffs[:10000]
            if str(float(val))[0] != "0"
        ]

        if not first_digits:
            return {"benford_divergence": 0.0, "success": False}

        # Count frequencies
        counts = np.bincount(first_digits, minlength=10)[1:]
        total = sum(counts)
        actual_dist = counts / total

        # Expected Benford's Law distribution
        expected_dist = np.log10(1 + 1 / np.arange(1, 10))

        # Calculate divergence (Mean Squared Error)
        divergence = np.sum((actual_dist - expected_dist) ** 2) * 1000

        return {"benford_divergence": round(float(divergence), 4), "success": True}
    except Exception as e:
        logger.error(f"Benfords Law failed: {e}")
        return {"benford_divergence": 0.0, "success": False}


def compute_patch_forensics(img_pil):
    """
    Slices the image into 64x64 grids to detect localized AI morphing or upsampling grids.
    Returns the maximum checkerboard ratio and noise variance across all patches.
    """
    try:
        img_resized = img_pil.resize((512, 512))
        arr = np.array(img_resized.convert("L"), dtype=np.float32)

        patch_size = 64
        # Vectorized patch checkerboard analysis: [8, 8, 64, 64]
        patches = arr.reshape(8, patch_size, 8, patch_size).transpose(0, 2, 1, 3)
        diffs = np.abs(np.diff(patches, axis=3))
        even = diffs[:, :, :, ::2].mean(axis=(2, 3))
        odd = diffs[:, :, :, 1::2].mean(axis=(2, 3))
        ratios = np.where((even < 1.0) & (odd < 1.0), 1.0, even / np.maximum(odd, 0.5))
        max_checker = float(np.max(ratios))
        min_checker = float(np.min(ratios))

        return {
            "patch_max_checker": round(float(max_checker), 4),  # type: ignore
            "patch_min_checker": round(float(min_checker), 4),  # type: ignore
            "success": True,
        }
    except Exception as e:
        logger.error(f"Patch forensics failed: {e}")
        return {"patch_max_checker": 1.0, "patch_min_checker": 1.0, "success": False}


def compute_multiview_image_forensics(img_pil):
    """
    Runs the same forensic probes across rotations, mirror views, and local crops.
    This catches generated artifacts that only appear in a face/hand/background
    region or are hidden by orientation/crop changes.
    """
    try:
        base = ImageOps.exif_transpose(img_pil.convert("RGB"))
        w, h = base.size
        if w < 128 or h < 128:
            return {"success": False, "reason": "image too small for multiview scan"}

        views = [
            ("original", base),
            ("rot90", base.rotate(90, expand=True)),
            ("rot180", base.rotate(180, expand=True)),
            ("mirror", ImageOps.mirror(base)),
        ]

        crop_boxes = {
            "center_crop": (int(w * 0.18), int(h * 0.18), int(w * 0.82), int(h * 0.82)),
            "upper_crop": (int(w * 0.12), 0, int(w * 0.88), int(h * 0.58)),
            "lower_crop": (int(w * 0.12), int(h * 0.42), int(w * 0.88), h),
            "left_crop": (0, int(h * 0.12), int(w * 0.58), int(h * 0.88)),
            "right_crop": (int(w * 0.42), int(h * 0.12), w, int(h * 0.88)),
        }
        for name, box in crop_boxes.items():
            if box[2] - box[0] >= 128 and box[3] - box[1] >= 128:
                views.append((name, base.crop(box)))

        flagged = []
        max_score = 0
        worst_view = "none"

        for name, view in views[:9]:
            metrics = compute_pixel_forensics(view)
            if not metrics.get("success"):
                continue

            score = 0
            notes = []
            rg = metrics["pearsonRG"]
            rb = metrics.get("pearsonRB", 0.97)
            noise = metrics["flatBlockNoise"]
            checker = metrics["checkerboardRatio"]
            dct_energy = metrics["highFreqDctEnergy"]
            fft_peak_z = metrics.get("fftPeakZ", 2.14)

            if rg < 0.91 or rb < 0.91:
                score += 2
                notes.append("raw chroma decoupling")
            elif rg < 0.94 or rb < 0.94:
                score += 1

            if noise < 0.70:
                score += 2
                notes.append("zero-grain smooth surface")
            elif noise < 0.95:
                score += 1

            if checker < 0.90 or checker > 1.10:
                score += 2
                notes.append("upsampling checkerboard")
            elif checker < 0.94 or checker > 1.06:
                score += 1

            if dct_energy > 18.0:
                score += 2
                notes.append("high DCT energy")
            elif dct_energy > 13.0:
                score += 1

            if fft_peak_z > 5.0:
                score += 2
                notes.append("periodic FFT spike")
            elif fft_peak_z > 4.25:
                score += 1

            if score > max_score:
                max_score = score
                worst_view = name

            if score >= 3:
                flagged.append(
                    {
                        "view": name,
                        "score": int(score),  # type: ignore
                        "notes": (
                            ", ".join(notes) if notes else "combined weak forensic cues"
                        ),
                    }
                )

        return {
            "success": True,
            "view_count": len(views[:9]),
            "flagged_views": len(flagged),
            "max_view_score": int(max_score),  # type: ignore
            "worst_view": worst_view,
            "flagged": flagged[:4],
        }
    except Exception as e:
        logger.error(f"Multiview image forensics failed: {e}")
        return {"success": False, "reason": str(e)}


def compute_advanced_image_forensics(img_pil):
    """
    Adds a second forensic ensemble on top of the existing checks. Each signal is
    intentionally weak alone; the detector only becomes aggressive when several
    independent pixel, texture, compression, and camera-physics cues agree.
    """
    try:
        img_rgb = ImageOps.exif_transpose(img_pil.convert("RGB"))
        img_rgb.thumbnail((640, 640))
        arr = np.array(img_rgb, dtype=np.float32)
        if arr.ndim != 3 or arr.shape[2] < 3:
            return {"success": False, "reason": "not an RGB image"}

        h, w = arr.shape[:2]
        if h < 96 or w < 96:
            return {
                "success": False,
                "reason": "image too small for advanced forensics",
            }

        gray = cv2.cvtColor(arr.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
        blur = cv2.GaussianBlur(gray, (0, 0), 1.15)
        residual = gray - blur
        residual_abs = np.abs(residual)

        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        grad = np.sqrt(gx * gx + gy * gy)
        grad_p35 = float(np.percentile(grad, 35))
        grad_p70 = float(np.percentile(grad, 70))
        flat_mask = grad <= max(grad_p35, 4.0)
        edge_mask = grad >= max(grad_p70, 12.0)

        if not np.any(flat_mask):
            flat_mask = grad <= np.percentile(grad, 50)
        if not np.any(edge_mask):
            edge_mask = grad >= np.percentile(grad, 80)

        flat_residual = residual_abs[flat_mask]
        edge_residual = residual_abs[edge_mask]
        flat_noise = float(np.std(residual[flat_mask])) if flat_residual.size else 0.0
        edge_noise = float(np.std(residual[edge_mask])) if edge_residual.size else 0.0
        edge_flat_noise_ratio = float(edge_noise / max(flat_noise, 0.001))  # type: ignore

        hist, _ = np.histogram(
            np.clip(residual, -16, 16), bins=32, range=(-16, 16), density=False
        )
        hist = hist.astype(np.float64)
        hist_prob = hist / max(float(hist.sum()), 1.0)
        residual_entropy = float(
            -np.sum(hist_prob[hist_prob > 0] * np.log2(hist_prob[hist_prob > 0]))
        )

        block = 32
        block_stds = []
        block_means = []
        for y in range(0, h - block + 1, block):
            for x in range(0, w - block + 1, block):
                patch = residual[y : y + block, x : x + block]
                block_stds.append(float(np.std(patch)))
                block_means.append(float(np.mean(np.abs(patch))))
        block_stds_np = (
            np.array(block_stds, dtype=np.float32)
            if block_stds
            else np.array([flat_noise], dtype=np.float32)
        )
        block_noise_mean = float(np.mean(block_stds_np))
        block_noise_cv = float(np.std(block_stds_np) / max(block_noise_mean, 0.001))
        perfect_gradient_rate = float(np.mean(block_stds_np < 0.45))
        smooth_area_rate = (
            float(np.mean(flat_residual < 0.55)) if flat_residual.size else 0.0
        )
        flat_residual_mean = (
            float(np.mean(flat_residual)) if flat_residual.size else 0.0
        )

        strong_edges = grad > max(float(np.percentile(grad, 82)), 18.0)
        if np.any(strong_edges):
            angles = (np.arctan2(gy[strong_edges], gx[strong_edges]) + np.pi) % np.pi
            orient_hist, _ = np.histogram(angles, bins=18, range=(0, np.pi))
            orient_prob = orient_hist.astype(np.float64) / max(
                float(orient_hist.sum()), 1.0
            )
            orientation_entropy = float(
                -np.sum(
                    orient_prob[orient_prob > 0] * np.log2(orient_prob[orient_prob > 0])
                )
            )
            edge_density = float(np.mean(strong_edges))
        else:
            orientation_entropy = 0.0
            edge_density = 0.0

        # Repeated texture probe: normalized residual autocorrelation peak outside center.
        small_res = cv2.resize(residual, (256, 256), interpolation=cv2.INTER_AREA)
        small_res = small_res - float(np.mean(small_res))
        denom = float(np.std(small_res))
        if denom > 0.001:
            small_res = small_res / denom
        ac = np.fft.ifft2(np.abs(np.fft.fft2(small_res)) ** 2).real
        ac = np.fft.fftshift(ac)
        cy, cx = ac.shape[0] // 2, ac.shape[1] // 2
        ac[cy - 6 : cy + 7, cx - 6 : cx + 7] = np.median(ac)
        ac_vals = ac.flatten()
        texture_repeat_z = float(
            (np.max(ac_vals) - np.mean(ac_vals)) / max(np.std(ac_vals), 0.001)
        )

        # JPEG/editor compression grid consistency. Real edited photos commonly
        # have an 8x8 compression lattice, so only extreme or contradictory values
        # count against the image.
        vdiff = np.abs(np.diff(gray, axis=1))
        hdiff = np.abs(np.diff(gray, axis=0))
        v_grid = vdiff[:, 7::8].mean() if vdiff.shape[1] >= 8 else 0.0
        h_grid = hdiff[7::8, :].mean() if hdiff.shape[0] >= 8 else 0.0
        v_other = np.delete(vdiff, np.arange(7, vdiff.shape[1], 8), axis=1).mean() if vdiff.shape[1] > 8 else 1.0  # type: ignore
        h_other = np.delete(hdiff, np.arange(7, hdiff.shape[0], 8), axis=0).mean() if hdiff.shape[0] > 8 else 1.0  # type: ignore
        jpeg_grid_ratio = float(
            ((v_grid / max(v_other, 0.001)) + (h_grid / max(h_other, 0.001))) / 2.0
        )

        # Chroma/luma edge behavior. Camera optics and demosaicing leave small
        # color residuals near strong edges; generated images can be too perfectly
        # channel-aligned unless post-processed.
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        chroma_rg = r - g
        chroma_bg = b - g
        edge_chroma_std = (
            float((np.std(chroma_rg[edge_mask]) + np.std(chroma_bg[edge_mask])) / 2.0)
            if np.any(edge_mask)
            else 0.0
        )

        # Posterization / palette quantization catches some generated or heavily
        # upscaled images. It is weak because screenshots and edits can quantize too.
        quantized = np.round(arr / 4.0) * 4.0
        posterization_error = float(np.mean(np.abs(arr - quantized)))
        channel_unique_ratio = float(
            np.mean(
                [
                    len(np.unique(arr[:, :, c].astype(np.uint8))) / 256.0
                    for c in range(3)
                ]
            )
        )

        # Skin/pore probe: never assumes every portrait is AI; it only contributes
        # when skin-like regions are present and unusually poreless.
        rgb_sum = np.maximum(np.sum(arr, axis=2), 1.0)
        rn = r / rgb_sum
        gn = g / rgb_sum
        skin_mask = (
            (r > 70)
            & (g > 40)
            & (b > 25)
            & (r > g * 1.04)
            & (g > b * 1.03)
            & (rn > 0.34)
            & (rn < 0.52)
            & (gn > 0.24)
            & (gn < 0.40)
        )
        skin_ratio = float(np.mean(skin_mask))
        skin_texture = float(np.std(residual[skin_mask])) if np.any(skin_mask) else 0.0

        ai_weight = 0.0
        real_weight = 0.0
        strong_ai_votes = 0
        real_votes = 0
        signals = []

        def add_signal(name, verdict, weight, metric):
            nonlocal ai_weight, real_weight, strong_ai_votes, real_votes
            entry = {
                "name": name,
                "verdict": verdict,
                "weight": round(float(weight), 3),
                "metric": metric,
            }
            signals.append(entry)
            if verdict == "ai":
                ai_weight += float(weight)
                if weight >= 1.0:
                    strong_ai_votes += 1
            elif verdict == "real":
                real_weight += float(weight)
                real_votes += 1

        if flat_noise < 0.45:
            add_signal(
                "sensor residual floor", "ai", 1.85, f"flat_noise={flat_noise:.3f}"
            )
        elif flat_noise < 0.85:
            add_signal(
                "sensor residual floor", "ai", 1.25, f"flat_noise={flat_noise:.3f}"
            )
        elif flat_noise > 1.25:
            add_signal(
                "sensor residual floor", "real", 0.85, f"flat_noise={flat_noise:.3f}"
            )

        if residual_entropy < 2.35:
            add_signal(
                "micro-noise entropy", "ai", 1.1, f"entropy={residual_entropy:.3f}"
            )
        elif residual_entropy > 3.15:
            add_signal(
                "micro-noise entropy", "real", 0.65, f"entropy={residual_entropy:.3f}"
            )

        if edge_flat_noise_ratio > 7.5 and flat_noise < 0.95:
            add_signal(
                "edge-only detail/noise",
                "ai",
                1.1,
                f"ratio={edge_flat_noise_ratio:.2f}",
            )
        elif 1.25 <= edge_flat_noise_ratio <= 5.8 and flat_noise > 0.85:
            add_signal(
                "edge-flat noise balance",
                "real",
                0.55,
                f"ratio={edge_flat_noise_ratio:.2f}",
            )

        if block_noise_cv < 0.10 and block_noise_mean < 1.15:
            add_signal(
                "over-uniform block texture", "ai", 1.0, f"cv={block_noise_cv:.3f}"
            )
        elif block_noise_cv > 0.16 and block_noise_mean > 0.95:
            add_signal("varied local texture", "real", 0.45, f"cv={block_noise_cv:.3f}")

        if perfect_gradient_rate > 0.34:
            add_signal(
                "perfect gradient block rate",
                "ai",
                1.15,
                f"rate={perfect_gradient_rate:.3f}",
            )
        elif perfect_gradient_rate < 0.08 and block_noise_mean > 0.9:
            add_signal(
                "natural non-perfect surfaces",
                "real",
                0.45,
                f"rate={perfect_gradient_rate:.3f}",
            )

        if edge_density > 0.015 and orientation_entropy < 2.05:
            add_signal(
                "low edge orientation entropy",
                "ai",
                0.85,
                f"entropy={orientation_entropy:.3f}",
            )
        elif orientation_entropy > 2.65:
            add_signal(
                "diverse edge orientations",
                "real",
                0.45,
                f"entropy={orientation_entropy:.3f}",
            )

        if texture_repeat_z > 8.5:
            add_signal(
                "repeated texture autocorrelation",
                "ai",
                1.25,
                f"z={texture_repeat_z:.2f}",
            )
        elif texture_repeat_z < 5.2:
            if flat_noise < 0.85 and residual_entropy < 2.80:
                add_signal(
                    "over-smoothed non-repeating texture",
                    "ai",
                    0.75,
                    f"z={texture_repeat_z:.2f}, entropy={residual_entropy:.3f}",
                )
            else:
                add_signal(
                    "low repeated texture autocorrelation",
                    "real",
                    0.35,
                    f"z={texture_repeat_z:.2f}",
                )

        if smooth_area_rate > 0.72 and flat_noise < 0.95:
            add_signal(
                "over-clean smooth surface field",
                "ai",
                1.05,
                f"smooth_rate={smooth_area_rate:.3f}, flat_noise={flat_noise:.3f}",
            )
        elif smooth_area_rate > 0.58 and flat_noise < 0.75:
            add_signal(
                "over-clean smooth surface field",
                "ai",
                0.75,
                f"smooth_rate={smooth_area_rate:.3f}, flat_noise={flat_noise:.3f}",
            )

        if jpeg_grid_ratio > 1.55 or jpeg_grid_ratio < 0.58:
            add_signal(
                "compression grid inconsistency",
                "ai",
                0.8,
                f"grid={jpeg_grid_ratio:.3f}",
            )
        elif 0.82 <= jpeg_grid_ratio <= 1.35:
            add_signal(
                "stable compression lattice",
                "real",
                0.35,
                f"grid={jpeg_grid_ratio:.3f}",
            )

        if edge_chroma_std < 0.65 and edge_density > 0.02 and flat_noise < 1.0:
            add_signal(
                "over-aligned chroma edges",
                "ai",
                0.8,
                f"edge_chroma={edge_chroma_std:.3f}",
            )
        elif edge_chroma_std > 1.8 and edge_density > 0.01:
            add_signal(
                "camera-like chroma edge residual",
                "real",
                0.45,
                f"edge_chroma={edge_chroma_std:.3f}",
            )

        if skin_ratio > 0.025 and skin_texture < 0.72:
            add_signal(
                "poreless skin-like texture",
                "ai",
                1.1,
                f"skin_texture={skin_texture:.3f}, skin_ratio={skin_ratio:.3f}",
            )
        elif skin_ratio > 0.06 and skin_texture < 1.05 and flat_noise < 1.2:
            add_signal(
                "plastic skin-like texture",
                "ai",
                0.85,
                f"skin_texture={skin_texture:.3f}, skin_ratio={skin_ratio:.3f}",
            )
        elif skin_ratio > 0.025 and skin_texture > 1.25:
            add_signal(
                "skin-like pore texture",
                "real",
                0.75,
                f"skin_texture={skin_texture:.3f}, skin_ratio={skin_ratio:.3f}",
            )

        if channel_unique_ratio < 0.38 and posterization_error < 1.05:
            add_signal(
                "posterized color quantization",
                "ai",
                0.75,
                f"unique={channel_unique_ratio:.3f}",
            )
        elif (
            flat_noise < 0.95
            and residual_entropy < 2.75
            and channel_unique_ratio > 0.52
        ):
            add_signal(
                "over-clean rich-color render",
                "ai",
                0.9,
                f"unique={channel_unique_ratio:.3f}, entropy={residual_entropy:.3f}",
            )
        elif channel_unique_ratio > 0.62:
            add_signal(
                "rich camera color distribution",
                "real",
                0.35,
                f"unique={channel_unique_ratio:.3f}",
            )

        return {
            "success": True,
            "ai_weight": round(float(ai_weight), 3),  # type: ignore
            "real_weight": round(float(real_weight), 3),  # type: ignore
            "strong_ai_votes": int(strong_ai_votes),
            "real_votes": int(real_votes),
            "signals": signals[:12],
            "metrics": {
                "flat_noise": round(flat_noise, 4),
                "edge_noise": round(edge_noise, 4),
                "edge_flat_noise_ratio": round(edge_flat_noise_ratio, 4),
                "residual_entropy": round(residual_entropy, 4),
                "block_noise_cv": round(block_noise_cv, 4),
                "perfect_gradient_rate": round(perfect_gradient_rate, 4),
                "smooth_area_rate": round(smooth_area_rate, 4),
                "flat_residual_mean": round(flat_residual_mean, 4),
                "orientation_entropy": round(orientation_entropy, 4),
                "edge_density": round(edge_density, 4),
                "texture_repeat_z": round(texture_repeat_z, 4),
                "jpeg_grid_ratio": round(jpeg_grid_ratio, 4),
                "edge_chroma_std": round(edge_chroma_std, 4),
                "skin_ratio": round(skin_ratio, 4),
                "skin_texture": round(skin_texture, 4),
                "posterization_error": round(posterization_error, 4),
                "channel_unique_ratio": round(channel_unique_ratio, 4),
            },
        }
    except Exception as e:
        logger.error(f"Advanced image forensics failed: {e}")
        return {"success": False, "reason": str(e)}


def deep_binary_inspect(raw_bytes):
    """
    Inspects the actual hexadecimal structure of the file.
    Checks for Missing DQT (Quantization Tables) and ICC profiles.
    """
    try:
        hex_data = raw_bytes[:4096]  # Read header

        is_jpeg = hex_data.startswith(b"\xff\xd8")

        # JPEG DQT Marker is FF DB
        has_dqt = b"\xff\xdb" in hex_data
        # ICC Profile marker
        has_icc = b"ICC_PROFILE" in hex_data
        # Adobe proprietary marker (often found in real photos)
        has_adobe = b"Adobe" in hex_data
        # Standard EXIF marker
        has_exif = b"Exif" in hex_data

        return {
            "is_jpeg": is_jpeg,
            "has_dqt": has_dqt,
            "has_icc": has_icc,
            "has_adobe": has_adobe,
            "has_exif": has_exif,
            "success": True,
        }
    except Exception as e:
        logger.error(f"Binary inspect failed: {e}")
        return {
            "is_jpeg": False,
            "has_dqt": True,
            "has_icc": True,
            "has_adobe": True,
            "has_exif": True,
            "success": False,
        }


def get_default_forensics():
    return {
        "pearsonRG": 0.9821,
        "pearsonRB": 0.9785,
        "flatBlockNoise": 1.84,
        "checkerboardRatio": 1.01,
        "highFreqDctEnergy": 12.45,
        "fftPeakZ": 2.14,
        "success": False,
    }


def clamp_score(value):
    return max(0.0, min(1.0, float(value)))


def detector_evidence(
    name,
    category,
    score=None,
    confidence=0.0,
    evidence="",
    available=True,
    learned=False,
    supplementary=False,
    reason=None,
    applicable=True,
):
    return {
        "name": name,
        "category": category,
        "available": bool(available),
        "applicable": bool(applicable),
        "score": (
            round(clamp_score(score), 4)
            if score is not None and available and applicable
            else None
        ),
        "confidence": (
            round(clamp_score(confidence), 4) if available and applicable else 0.0
        ),
        "evidence": evidence if available else None,
        "learned_model": bool(learned),
        "supplementary": bool(supplementary),
        "unavailable_reason": reason if not available else None,
    }


def unavailable_detector(name, category, reason):
    return detector_evidence(name, category, available=False, reason=reason)


def not_applicable_detector(name, category, reason):
    return detector_evidence(
        name, category, available=True, applicable=False, evidence=reason, reason=reason
    )


def load_fusion_calibration(modality):
    path = os.path.join(models_dir, "fusion_calibration.json")
    if not os.path.exists(path):
        return None, f"No held-out {modality} calibration artifact is installed."
    try:
        with open(path, "r", encoding="utf-8") as handle:
            config = json.load(handle).get(modality)
        if not isinstance(config, dict):
            return None, f"Calibration artifact has no {modality} section."
        slope = float(config["slope"])
        intercept = float(config["intercept"])
        return {"slope": slope, "intercept": intercept}, None
    except Exception as exc:
        return None, f"Calibration artifact could not be loaded: {exc}"


def load_trained_fusion_model(modality):
    if modality in FUSION_MODEL_CACHE:
        return FUSION_MODEL_CACHE[modality], None
    path = os.path.join(models_dir, "fusion", f"{modality}.joblib")
    if not os.path.exists(path):
        return None, f"No trained {modality} fusion artifact is installed at {path}."
    try:
        import joblib

        artifact = joblib.load(path)
        required = {"model", "calibrator", "feature_names", "detector_weights"}
        missing = required.difference(artifact)
        if missing:
            raise ValueError(f"Fusion artifact is missing fields: {sorted(missing)}")
        FUSION_MODEL_CACHE[modality] = artifact
        return artifact, None
    except Exception as exc:
        return None, f"Fusion artifact could not be loaded: {exc}"


def fuse_detector_evidence(modality, detectors, require_learned=False):
    """Fuse every detector that produced a real score; never impute unavailable heads."""
    print(f"DEBUG: modality={modality}, require_learned={require_learned}, detectors={[d.get('name') for d in detectors]}")
    scored = [
        item
        for item in detectors
        if item.get("available")
        and item.get("score") is not None
        and item.get("confidence", 0) > 0
    ]
    primary = [item for item in scored if not item.get("supplementary")]
    learned_present = any(item.get("learned_model") for item in primary)

    fusion_artifact, fusion_error = load_trained_fusion_model(modality)
    detector_by_name = {item["name"]: item for item in detectors}
    model_weights = {}
    if fusion_artifact and (learned_present or not require_learned):
        vector = []
        for feature_name in fusion_artifact["feature_names"]:
            feature_type, detector_name = feature_name.split("::", 1)
            detector = detector_by_name.get(detector_name)
            if feature_type == "score":
                vector.append(
                    float(detector["score"])
                    if detector and detector.get("score") is not None
                    else 0.5
                )
            elif feature_type == "available":
                vector.append(1.0 if detector and detector.get("available") else 0.0)
            elif feature_type == "confidence":
                vector.append(
                    float(detector.get("confidence", 0.0)) if detector else 0.0
                )
            else:
                raise ValueError(f"Unknown fusion feature type: {feature_type}")
        raw_probability = float(
            fusion_artifact["model"].predict_proba(np.asarray([vector]))[0, 1]
        )
        calibrated_probability = float(
            fusion_artifact["calibrator"].predict([raw_probability])[0]
        )
        calibration_status = str(fusion_artifact.get("calibration_method", "isotonic"))
        calibration_error = None
        model_weights = dict(fusion_artifact["detector_weights"])
    else:
        learned_candidates = [item for item in primary if item.get("learned_model")]
        if modality == "text" and learned_candidates:
            # When learned text models are available, fuse them using weighted average.
            # This allows multiple signals (e.g., AraBERT + Arabic heuristic) to
            # balance each other rather than relying on a single model.
            if len(learned_candidates) == 1:
                raw_probability = float(learned_candidates[0]["score"])
                selected_name = learned_candidates[0]["name"]
            else:
                total_w = 0.0
                weighted_sum = 0.0
                for cand in learned_candidates:
                    w = float(cand["confidence"])
                    s = max(0.01, min(0.99, float(cand["score"])))
                    logit = math.log(s / (1.0 - s))
                    weighted_sum += logit * w
                    total_w += w
                if total_w > 0:
                    fused_logit = weighted_sum / total_w
                    raw_probability = 1.0 / (1.0 + math.exp(-fused_logit))
                else:
                    raw_probability = 0.5
                selected_name = ", ".join(c["name"] for c in learned_candidates)
            fusion_error = (
                f"{fusion_error} Binary text fallback used learned "
                f"content model(s): {selected_name}."
            )
        else:
            sum_logits = 0.0
            total_weight = 0.0
            for item in scored:
                weight = float(item["confidence"]) * (
                    0.20 if item.get("supplementary") else 1.0
                )
                if item.get("learned_model"):
                    weight *= 10.0  # Heavily favor deep learning models in the manual fusion (10x boost)
                score = max(0.01, min(0.99, float(item["score"])))
                logit = math.log(score / (1.0 - score))
                sum_logits += logit * weight
                total_weight += weight

            if total_weight > 0:
                fused_logit = sum_logits / total_weight
                # Boost ensemble confidence when multiple detectors agree
                if len(scored) > 1:
                    fused_logit *= 1.15
                raw_probability = 1.0 / (1.0 + math.exp(-fused_logit))
            else:
                raw_probability = 0.5
        calibrated_probability = raw_probability
        calibration_status = "unavailable"
        calibration_error = fusion_error

    primary_scores = [float(item["score"]) for item in primary]
    disagreement = float(np.std(primary_scores)) if len(primary_scores) > 1 else 1.0
    sufficient = (
        len(primary) >= 3 and sum(float(item["confidence"]) for item in primary) >= 1.25
    )
    if require_learned and not learned_present:
        sufficient = False
    if fusion_artifact is None:
        sufficient = False

    probability = clamp_score(calibrated_probability)

    # We do NOT artificially inflate scores above 0.55 to avoid turning slight inaccuracies into 100% false positives.
    
    probability = clamp_score(probability)
    # ---------------------------

    decisive = probability <= 0.32 or probability >= 0.68
    consistent = disagreement <= 0.24
    uncertainty_reasons = []
    if not primary:
        uncertainty_reasons.append("No primary content detector produced a score.")
    elif not sufficient:
        uncertainty_reasons.append(
            "Too few independent primary content signals are available."
        )
    if require_learned and not learned_present:
        uncertainty_reasons.append("A compatible trained content model is unavailable.")
    if fusion_artifact is None:
        uncertainty_reasons.append(
            "The trained fusion meta-classifier and its calibration artifact are unavailable."
        )
    if not decisive:
        uncertainty_reasons.append(
            "The fused probability is inside the uncertainty interval (0.32-0.68)."
        )
    if not consistent:
        uncertainty_reasons.append(
            "Primary detectors disagree beyond the allowed research threshold."
        )

    binary_fallback = bool(uncertainty_reasons)
    if probability >= 0.5:
        prediction = "AI"
        confidence_level = (
            "High"
            if not binary_fallback and probability >= 0.85
            else ("Medium" if not binary_fallback else "Low")
        )
    else:
        prediction = "Human"
        confidence_level = (
            "High"
            if not binary_fallback and probability <= 0.15
            else ("Medium" if not binary_fallback else "Low")
        )

    if not primary:
        confidence_level = "Low"

    for item in detectors:
        learned_weight = model_weights.get(item["name"])
        item["weight_in_fusion_model"] = (
            round(float(learned_weight), 6) if learned_weight is not None else None
        )

    contributors = []
    for item in scored:
        learned_weight = item["weight_in_fusion_model"]
        effective_weight = (
            abs(float(learned_weight))
            if learned_weight is not None
            else float(item["confidence"])
            * (0.20 if item.get("supplementary") else 1.0)
        )
        contribution = abs(float(item["score"]) - 0.5) * effective_weight
        contributors.append(
            {
                "detector": item["name"],
                "score": item["score"],
                "confidence": item["confidence"],
                "direction": (
                    "AI"
                    if item["score"] > 0.55
                    else ("Human" if item["score"] < 0.45 else "Neutral")
                ),
                "contribution": round(contribution, 4),
                "weight_in_fusion_model": item["weight_in_fusion_model"],
                "supplementary": item.get("supplementary", False),
                "evidence": item.get("evidence"),
            }
        )
    contributors.sort(key=lambda item: item["contribution"], reverse=True)
    if binary_fallback:
        decision_reason = (
            f"Binary threshold decision at 0.5000 produced {prediction} from probability "
            f"{probability:.4f}. Uncertainty notes: {' '.join(uncertainty_reasons)}"
        )
    else:
        strongest = (
            ", ".join(item["detector"] for item in contributors[:3])
            or "no named contributors"
        )
        decision_reason = (
            f"The calibrated meta-classifier produced {probability:.4f} with detector disagreement "
            f"{disagreement:.4f}; strongest contributors: {strongest}."
        )

    importance_total = sum(item["contribution"] for item in contributors)
    feature_importance = [
        {
            "feature": item["detector"],
            "importance": (
                round(item["contribution"] / importance_total, 4)
                if importance_total
                else 0.0
            ),
            "direction": item["direction"],
            "evidence": item["evidence"],
        }
        for item in contributors
    ]
    uncertainty = clamp_score(
        max(
            1.0 - abs(probability - 0.5) * 2.0,
            disagreement,
            0.65 if binary_fallback else 0.0,
        )
    )
    confidence_score = clamp_score(1.0 - uncertainty)

    return {
        "prediction": prediction,
        "ai_probability": round(probability, 4),
        "confidence": confidence_level,
        "confidence_score": round(confidence_score, 4),
        "uncertainty": round(uncertainty, 4),
        "review_required": binary_fallback,
        "verdict_status": "inconclusive" if binary_fallback else "decisive",
        "confidence_level": confidence_level.lower(),
        "binary_fallback_applied": binary_fallback,
        "feature_importance": feature_importance,
        "detector_specific_analysis": {
            "modality": modality,
            "detectors_evaluated": len(detectors),
            "detectors_available": len(scored),
            "detectors_unavailable": len(
                [item for item in detectors if not item.get("available")]
            ),
            "learned_detector_available": learned_present,
        },
        "evidence_report": {
            "fusion": {
                "method": (
                    "trained logistic meta-classifier"
                    if fusion_artifact
                    else "diagnostic-only untrained fallback"
                ),
                "trained_meta_classifier": fusion_artifact is not None,
                "available_detector_count": len(scored),
                "primary_detector_count": len(primary),
                "unavailable_detector_count": len(
                    [item for item in detectors if not item.get("available")]
                ),
                "raw_probability": round(raw_probability, 4),
                "calibration_status": calibration_status,
                "calibration_note": calibration_error,
                "primary_disagreement": round(disagreement, 4),
                "uncertainty_reasons": uncertainty_reasons,
                "decision_reason": decision_reason,
            },
            "top_contributors": contributors,
            "detectors": detectors,
        },
    }


ARABIC_TRANSFORMER_STATE = {
    "attempted": False,
    "tokenizer": None,
    "model": None,
    "ai_label_index": None,
    "model_name": None,
    "error": None,
}


def run_arabic_content_transformer(text):
    """Run only a fine-tuned Arabic/multilingual AI-authorship classifier."""
    state = ARABIC_TRANSFORMER_STATE
    model_name = os.environ.get("ARABIC_AI_DETECTOR_MODEL", "").strip()
    if not model_name:
        return unavailable_detector(
            "Arabic-aware transformer classifier",
            "learned text model",
            "Set ARABIC_AI_DETECTOR_MODEL to a locally available, fine-tuned AraBERT, MARBERT, CAMeLBERT, or multilingual AI-authorship classifier.",
        )

    if not state["attempted"]:
        state["attempted"] = True
        state["model_name"] = model_name  # type: ignore
        try:
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            allow_download = os.environ.get("ALLOW_MODEL_DOWNLOADS", "0") == "1"
            state["tokenizer"] = AutoTokenizer.from_pretrained(model_name, local_files_only=not allow_download)  # type: ignore
            state["model"] = AutoModelForSequenceClassification.from_pretrained(
                model_name, local_files_only=not allow_download
            ).to(DEVICE)
            state["model"].eval()  # type: ignore
            labels = {int(k): str(v).lower() for k, v in state["model"].config.id2label.items()}  # type: ignore
            configured_index = os.environ.get("ARABIC_AI_LABEL_INDEX")
            if configured_index is not None:
                state["ai_label_index"] = int(configured_index)  # type: ignore
            else:
                matches = [
                    idx
                    for idx, label in labels.items()
                    if "ai" in label or "machine" in label or "generated" in label
                ]
                if len(matches) != 1:
                    raise ValueError(
                        "Model labels do not identify exactly one AI-generated class; set ARABIC_AI_LABEL_INDEX."
                    )
                state["ai_label_index"] = matches[0]  # type: ignore
        except Exception as exc:
            state["error"] = str(exc)  # type: ignore
            state["model"] = None
            state["tokenizer"] = None

    if not state["model"] or not state["tokenizer"]:
        return unavailable_detector(
            "Arabic-aware transformer classifier",
            "learned text model",
            f"Configured transformer is unavailable: {state['error'] or 'unknown load failure'}",
        )
    try:
        inputs = state["tokenizer"](
            text, return_tensors="pt", truncation=True, max_length=512
        ).to(DEVICE)
        with torch.no_grad():
            probabilities = torch.softmax(state["model"](**inputs).logits, dim=-1)[0]
        score = float(probabilities[state["ai_label_index"]].item())
        return detector_evidence(
            "Arabic-aware transformer classifier",
            "learned text model",
            score,
            0.90,
            f"Fine-tuned content model: {state['model_name']}; Arabic, dialectal, mixed-language, and Arabizi coverage depends on its model card and evaluation set.",
            learned=True,
        )
    except Exception as exc:
        return unavailable_detector(
            "Arabic-aware transformer classifier",
            "learned text model",
            f"Transformer inference failed: {exc}",
        )


def compute_text_content_detectors(text):
    import re
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    words = re.findall(
        r"[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF0-9']+", text.lower()
    )
    sentences = split_text_sentences(text)
    arabic_share = arabic_ratio(text)
    latin_tokens = [word for word in words if re.search(r"[a-z]", word)]
    arabizi_tokens = [
        word
        for word in latin_tokens
        if re.search(r"[2356789]", word) and re.search(r"[a-z]", word)
    ]
    has_arabic_content = arabic_share >= 0.05 or bool(arabizi_tokens)
    detectors = []

    if has_arabic_content:
        model_outputs = predict_arabic_text_models(
            text,
            arabic_share,
            arabic_share >= 0.05 and bool(latin_tokens),
            len(arabizi_tokens) / max(len(latin_tokens), 1),
        )
        for output in model_outputs:
            if output.get("available"):
                detectors.append(
                    detector_evidence(
                        output["name"],
                        "learned text model",
                        output["score"],
                        output["confidence"],
                        output["evidence"],
                        learned=True,
                    )
                )
            else:
                detectors.append(
                    unavailable_detector(
                        output["name"], "learned text model", output["reason"]
                    )
                )
        classical_output = predict_arabic_classical_model(text)
        if classical_output.get("available"):
            detectors.append(
                detector_evidence(
                    classical_output["name"],
                    "learned text model",
                    classical_output["score"],
                    classical_output["confidence"],
                    classical_output["evidence"],
                    learned=True,
                )
            )
        else:
            detectors.append(
                unavailable_detector(
                    classical_output["name"],
                    "learned text model",
                    classical_output["reason"],
                )
            )

        # Fallback Arabic heuristic detector
        if True:
            arabic_text_only = re.sub(r"[^\u0600-\u06FF\s]", "", text)
            arabic_words_list = arabic_text_only.split()
            if len(arabic_words_list) > 3:
                ai_markers = ["\u0628\u0627\u0644\u0637\u0628\u0639", "\u0639\u0644\u0627\u0648\u0629 \u0639\u0644\u0649 \u0630\u0644\u0643", "\u0648\u0645\u0639 \u0630\u0644\u0643", "\u0641\u064a \u0627\u0644\u062e\u062a\u0627\u0645", "\u064a\u0645\u0643\u0646\u0646\u0627 \u0627\u0644\u0642\u0648\u0644", "\u0645\u0646 \u0627\u0644\u062c\u062f\u064a\u0631 \u0628\u0627\u0644\u0630\u0643\u0631", "\u0645\u0645\u0627 \u0644\u0627 \u0634\u0643 \u0641\u064a\u0647", "\u0623\u0648\u062f \u0623\u0646 \u0623\u0624\u0643\u062f", "\u0644\u0627 \u062a\u062a\u0631\u062f\u062f \u0641\u064a", "\u0647\u0644 \u064a\u0645\u0643\u0646\u0646\u064a \u0645\u0633\u0627\u0639\u062f\u062a\u0643", "\u0628\u0635\u0641\u062a\u064a \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a", "\u0628\u0646\u0627\u0621 \u0639\u0644\u0649 \u0630\u0644\u0643", "\u064a\u062c\u062f\u0631 \u0628\u0627\u0644\u0630\u0643\u0631", "\u0645\u0646 \u0627\u0644\u0645\u0647\u0645 \u0623\u0646 \u0646\u0644\u0627\u062d\u0638", "\u0623\u062d\u062f \u0627\u0644\u062c\u0648\u0627\u0646\u0628 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629"]
                ai_hits = sum(1 for w in arabic_words_list if any(marker in text for marker in ai_markers))
                
                human_markers = ["\u0639\u0634\u0627\u0646", "\u0634\u0644\u0648\u0646", "\u0644\u064a\u0634", "\u0627\u064a\u0634", "\u0648\u0634", "\u0627\u064a\u0647", "\u0632\u064a\u0646", "\u0647\u0644\u0627", "\u0645\u0631\u062d\u0628\u0627", "\u0648\u064a\u0646", "\u062a\u0631\u0627", "\u0645\u0631\u0647", "\u0648\u0627\u062c\u062f", "\u0643\u062a\u064a\u0631", "\u062e\u0644\u0627\u0635", "\u064a\u0627\u062e\u064a", "\u0637\u064a\u0628", "\u0634\u0646\u0648", "\u0648\u0627\u064a\u062f", "\u0628\u0635\u0631\u0627\u062d\u0629", "\u0648\u0627\u0644\u0644\u0647", "\u0631\u062d\u062a", "\u0627\u0634\u062a\u0631\u064a", "\u0627\u0644\u0645\u0647\u0645", "\u0627\u062d\u0633", "\u0627\u0644\u062d\u0645\u062f\u0644\u0644\u0647"]
                human_hits = sum(1 for w in arabic_words_list if w in human_markers)
                
                score = 0.15
                if ai_hits > 0:
                    score = 0.5 + (0.2 * ai_hits)
                elif human_hits > 0:
                    score = 0.05
                
                score = max(0.0001, min(0.99, score))
                
                detectors.append(
                    detector_evidence(
                        "Arabic Dialect & Lexical Heuristics",
                        "linguistic heuristic",
                        score,
                        0.85,
                        "Analyzes text for AI-typical formal phrasing vs human dialectical markers.",
                        learned=True,
                    )
                )
    else:
        # Strong fine-tuned transformer detector (primary learned signal).
        strong_name = (
            getattr(text_model, "transformer_model_name", None) or "transformer"
        )
        try:
            strong_score = text_model.predict_strong_english(text)
            if strong_score is not None:
                detectors.append(
                    detector_evidence(
                        f"AI-text transformer ({strong_name})",
                        "learned text model",
                        strong_score,
                        0.92,
                        "Fine-tuned RoBERTa binary classifier trained to separate human from "
                        "machine-generated (ChatGPT/GPT/LLM) text.",
                        learned=True,
                    )
                )
        except Exception as exc:
            detectors.append(
                unavailable_detector(
                    f"AI-text transformer ({strong_name})",
                    "learned text model",
                    str(exc),
                )
            )

        # Perplexity-based language-model signal.
        try:
            ppl_score = text_model.predict_perplexity_ai(text)
            if ppl_score is not None:
                detectors.append(
                    detector_evidence(
                        f"Perplexity (LM predictability, {getattr(text_model, 'perplexity_model_name', 'gpt2')})",
                        "language model",
                        ppl_score,
                        0.80,
                        "Lower perplexity = more predictable text = more likely AI-generated.",
                        learned=True,
                    )
                )
        except Exception as exc:
            detectors.append(
                unavailable_detector(
                    "Perplexity (LM predictability)", "language model", str(exc)
                )
            )

        # Fused ensemble (strong transformer + perplexity + heuristics) as a unified score.
        try:
            score = float(text_model.predict(text))
            detectors.append(
                detector_evidence(
                    "English fusion ensemble",
                    "learned text model",
                    score,
                    0.85,
                    "Transformer + perplexity + stylometry fused decision.",
                    learned=True,
                )
            )
        except Exception as exc:
            detectors.append(
                unavailable_detector(
                    "English fusion ensemble", "learned text model", str(exc)
                )
            )

    try:
        read_score = AdvancedTextEngine.compute_readability(text)
        detectors.append(
            detector_evidence(
                "Advanced Flesch-Kincaid",
                "readability",
                read_score,
                0.65,
                "Advanced grade-level readability profiling targeting AI patterns",
            )
        )

        ent_score = AdvancedTextEngine.compute_entropy(text)
        detectors.append(
            detector_evidence(
                "Advanced Character Entropy",
                "entropy",
                ent_score,
                0.65,
                "Predictability of character distribution",
            )
        )

        fw_score = AdvancedTextEngine.compute_function_words(text)
        detectors.append(
            detector_evidence(
                "Advanced Function Words",
                "stylometry",
                fw_score,
                0.50,
                "Grammatical structural rigidity",
            )
        )
    except Exception as e:
        logger.error(f"Failed to run AdvancedTextEngine: {e}")

    sentence_lengths = [
        len(
            re.findall(
                r"[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF0-9']+", sentence
            )
        )
        for sentence in sentences
    ]
    sentence_lengths = [length for length in sentence_lengths if length]
    word_lengths = [len(word) for word in words]
    if len(sentence_lengths) >= 4 and len(words) >= 40:
        sentence_cv = float(
            np.std(sentence_lengths) / max(np.mean(sentence_lengths), 1.0)
        )
        word_cv = float(np.std(word_lengths) / max(np.mean(word_lengths), 1.0))
        stylometry_score = clamp_score(0.72 - 0.55 * sentence_cv - 0.20 * word_cv)
        detectors.append(
            detector_evidence(
                "Unicode stylometry",
                "stylometry",
                stylometry_score,
                min(0.65, len(words) / 250.0),
                f"sentence_length_cv={sentence_cv:.3f}, word_length_cv={word_cv:.3f}, words={len(words)}",
            )
        )
        burstiness_score = clamp_score(0.82 - sentence_cv)
        detectors.append(
            detector_evidence(
                "Sentence burstiness",
                "statistics",
                burstiness_score,
                min(0.60, len(sentence_lengths) / 16.0),
                f"sentence_length_cv={sentence_cv:.3f} across {len(sentence_lengths)} sentences",
            )
        )
        punctuation_counts = [
            len(re.findall(r"[,،;؛:!?؟]", sentence)) for sentence in sentences
        ]
        syntax_cv = float(
            np.std(punctuation_counts) / max(np.mean(punctuation_counts), 1.0)
        )
        syntax_score = clamp_score(0.72 - 0.35 * syntax_cv - 0.25 * sentence_cv)
        detectors.append(
            detector_evidence(
                "Surface syntax variability",
                "syntax",
                syntax_score,
                0.40,
                f"punctuation_pattern_cv={syntax_cv:.3f}; this is surface syntax, not a full Arabic dependency parser",
            )
        )
        readability_score = clamp_score(0.70 - 0.30 * sentence_cv - 0.25 * word_cv)
        detectors.append(
            detector_evidence(
                "Arabic-aware readability regularity",
                "readability",
                readability_score,
                0.35,
                f"script-independent length regularity; mean_words_per_sentence={np.mean(sentence_lengths):.2f}",
            )
        )
    else:
        reason = (
            "At least 40 words and four sentences are required for a stable estimate."
        )
        detectors.extend(
            [
                not_applicable_detector("Unicode stylometry", "stylometry", reason),
                not_applicable_detector("Sentence burstiness", "statistics", reason),
                not_applicable_detector("Surface syntax variability", "syntax", reason),
                not_applicable_detector(
                    "Arabic-aware readability regularity", "readability", reason
                ),
            ]
        )

    if len(words) >= 40:
        trigrams = list(zip(words, words[1:], words[2:]))
        repeated = len(trigrams) - len(set(trigrams)) if trigrams else 0
        repetition_rate = repeated / max(len(trigrams), 1)
        detectors.append(
            detector_evidence(
                "Word n-gram repetition",
                "n-gram",
                clamp_score(0.38 + repetition_rate * 4.0),
                0.35,
                f"repeated_trigram_rate={repetition_rate:.4f}; language-neutral tokenization",
            )
        )
        token_counts = {}
        for word in words:
            token_counts[word] = token_counts.get(word, 0) + 1
        probabilities = np.asarray(list(token_counts.values()), dtype=np.float64) / len(
            words
        )
        entropy = float(-np.sum(probabilities * np.log2(probabilities)))
        normalized_entropy = entropy / max(np.log2(len(token_counts)), 1.0)
        detectors.append(
            detector_evidence(
                "Token-distribution entropy",
                "entropy",
                clamp_score(1.10 - normalized_entropy),
                0.35,
                f"shannon_entropy={entropy:.4f}, normalized_entropy={normalized_entropy:.4f}",
            )
        )
    else:
        detectors.append(
            not_applicable_detector(
                "Word n-gram repetition", "n-gram", "At least 40 words are required."
            )
        )
        detectors.append(
            not_applicable_detector(
                "Token-distribution entropy",
                "entropy",
                "At least 40 words are required.",
            )
        )

    if len(sentences) >= 4:
        try:
            matrix = TfidfVectorizer(
                analyzer="char_wb", ngram_range=(3, 5), min_df=1
            ).fit_transform(sentences)
            similarity = cosine_similarity(matrix)
            upper = similarity[np.triu_indices_from(similarity, k=1)]
            mean_similarity = float(np.mean(upper)) if len(upper) else 0.0
            detectors.append(
                detector_evidence(
                    "Cross-sentence semantic cohesion",
                    "semantics",
                    clamp_score(0.30 + mean_similarity),
                    0.45,
                    f"mean character-ngram sentence similarity={mean_similarity:.3f}; supports Arabic/English code-switching without translation",
                )
            )
            adjacent = np.diag(similarity, k=1)
            adjacent_cv = (
                float(np.std(adjacent) / max(np.mean(adjacent), 0.05))
                if len(adjacent)
                else 1.0
            )
            detectors.append(
                detector_evidence(
                    "Discourse-cohesion regularity",
                    "discourse",
                    clamp_score(0.72 - adjacent_cv * 0.30),
                    0.35,
                    f"adjacent_sentence_similarity_cv={adjacent_cv:.3f}; surface cohesion only, not rhetorical-role parsing",
                )
            )
        except Exception as exc:
            detectors.append(
                unavailable_detector(
                    "Cross-sentence semantic cohesion", "semantics", str(exc)
                )
            )
            detectors.append(
                unavailable_detector(
                    "Discourse-cohesion regularity", "discourse", str(exc)
                )
            )
    else:
        detectors.append(
            not_applicable_detector(
                "Cross-sentence semantic cohesion",
                "semantics",
                "At least four sentences are required.",
            )
        )
        detectors.append(
            not_applicable_detector(
                "Discourse-cohesion regularity",
                "discourse",
                "At least four sentences are required.",
            )
        )

    detectors.extend(
        [
            unavailable_detector(
                "Token probability analysis",
                "language model",
                "No compatible Arabic causal language model is installed.",
            ),
            unavailable_detector(
                "Perplexity",
                "language model",
                "No compatible Arabic causal language model is installed.",
            ),
            unavailable_detector(
                "Arabic morphological function-word analysis",
                "morphology",
                "No Arabic morphological analyzer is installed.",
            ),
            unavailable_detector(
                "Arabic dependency discourse parser",
                "discourse",
                "No evaluated Arabic dependency/discourse parser is installed.",
            ),
            unavailable_detector(
                "Text watermark detector",
                "watermark",
                "No provider-specific watermark verifier is configured.",
            ),
            not_applicable_detector(
                "Text provenance verifier",
                "provenance",
                "No signed text provenance record was supplied.",
            ),
        ]
    )
    coverage = {
        "arabic_character_ratio": round(arabic_share, 4),
        "mixed_arabic_english": arabic_share >= 0.05 and bool(latin_tokens),
        "arabizi_token_ratio": round(
            len(arabizi_tokens) / max(len(latin_tokens), 1), 4
        ),
        "dialect_support": "Model registry prioritizes XLM-R for code-switching/Arabizi, MARBERT for dialect-heavy text, and AraBERT/CAMeLBERT for Arabic-script text.",
    }
    return detectors, coverage, has_arabic_content


def compute_advanced_text_forensics(text):
    """
    Strict text-forensic ensemble layered on top of the learned text model.
    Single signals are intentionally weak; the detector becomes aggressive only
    when several structural AI cues outweigh human/casual specificity.
    """
    try:
        import re
        import math

        raw = text or ""
        lower = raw.lower()
        words = re.findall(
            r"[A-Za-z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]+", lower
        )
        wc = len(words)
        sentences = split_text_sentences(raw)
        if not sentences:
            sentences = [
                s.strip() for s in re.split(r"[.!?؟؛।]+|\n+", raw) if s.strip()
            ]

        if wc == 0:
            return {"success": False, "reason": "empty text"}

        ai_terms = [
            "delve",
            "delves",
            "delving",
            "tapestry",
            "realm",
            "landscape",
            "pivotal",
            "crucial",
            "multifaceted",
            "nuanced",
            "robust",
            "holistic",
            "comprehensive",
            "transformative",
            "seamless",
            "seamlessly",
            "leverage",
            "foster",
            "underscores",
            "paramount",
            "dynamic",
            "evolving",
            "innovative",
            "optimize",
            "streamline",
            "empower",
            "enhance",
            "navigate",
            "cornerstone",
            "testament",
        ]
        ai_phrases = [
            "in conclusion",
            "in summary",
            "in essence",
            "it is important to note",
            "it is worth noting",
            "plays a crucial role",
            "plays a pivotal role",
            "rapidly evolving landscape",
            "dynamic landscape",
            "wide range of",
            "wide array of",
            "unlock the potential",
            "at the heart of",
            "in today's world",
            "in the modern world",
            "as a result",
            "on the other hand",
            "furthermore",
            "moreover",
            "additionally",
            "therefore",
            "consequently",
            "ultimately",
            "notably",
        ]
        ai_transitions = [
            "furthermore",
            "moreover",
            "additionally",
            "therefore",
            "consequently",
            "ultimately",
            "notably",
            "importantly",
            "nevertheless",
            "nonetheless",
            "thus",
            "hence",
            "however",
            "firstly",
            "secondly",
            "lastly",
        ]
        formal_words = [
            "utilize",
            "facilitate",
            "demonstrate",
            "significant",
            "essential",
            "effective",
            "efficient",
            "strategic",
            "sustainable",
            "framework",
            "implementation",
            "development",
            "innovation",
            "optimization",
            "integration",
            "analysis",
            "approach",
            "solution",
            "outcomes",
            "implications",
            "productivity",
            "accessibility",
            "scalability",
        ]
        narrative_phrases = [
            "somewhere in the distance",
            "cool morning air",
            "old brick wall",
            "city slowly woke",
            "tiny reflections",
            "gold and orange",
            "nobody noticed",
            "small notebook",
            "park bench",
            "unfinished ideas",
            "dreams that had never been shared",
            "as if nothing unusual had happened",
            "for a brief moment",
            "holding a secret",
            "the world felt like",
            "just before sunrise",
            "by noon",
            "would be gone",
            "whispering",
            "secrets older than time",
            "single candle",
            "long-forgotten",
            "painting the sky",
            "somewhere far away",
            "echoing through",
            "edge of the city",
            "empty platform",
            "everything was calm",
            "everything just seemed",
            "slow down",
            "far away places",
            "fresh bread",
            "old train station",
        ]
        scenic_words = [
            "rain",
            "sunrise",
            "streets",
            "reflections",
            "gold",
            "orange",
            "bicycle",
            "brick",
            "wall",
            "city",
            "distance",
            "train",
            "bridge",
            "echoing",
            "cool",
            "morning",
            "air",
            "notebook",
            "bench",
            "sketches",
            "dreams",
            "pavement",
            "secret",
            "shadow",
            "candle",
            "window",
            "moonlight",
            "silence",
            "whisper",
            "forest",
            "river",
            "station",
            "platform",
            "cafe",
            "coffee",
            "bread",
            "traveler",
            "travelers",
            "stories",
            "smell",
            "sun",
            "hills",
            "lights",
            "empty",
            "quiet",
            "evening",
            "edge",
            "calm",
        ]
        simple_narrative_openers = {
            "the",
            "it",
            "there",
            "they",
            "when",
            "for",
            "every",
        }
        simple_narrative_verbs = {
            "was",
            "were",
            "had",
            "would",
            "came",
            "went",
            "made",
            "seemed",
            "stood",
            "sat",
            "looked",
            "felt",
            "became",
        }
        business_phrases = [
            "modern support teams",
            "consistent process",
            "customer requests",
            "urgent cases",
            "response quality",
            "over time",
            "clear workflow",
            "reduce delays",
            "better visibility",
            "recurring issues",
            "improving response quality",
            "reviewing customer requests",
            "prioritizing urgent cases",
            "performance and recurring issues",
            "improve response",
            "operational efficiency",
            "data-driven insights",
            "cross-functional collaboration",
            "measurable outcomes",
        ]
        business_words = {
            "modern",
            "support",
            "teams",
            "consistent",
            "process",
            "reviewing",
            "customer",
            "requests",
            "prioritizing",
            "urgent",
            "cases",
            "improving",
            "response",
            "quality",
            "workflow",
            "reduce",
            "delays",
            "managers",
            "visibility",
            "performance",
            "recurring",
            "issues",
            "strategy",
            "strategies",
            "organizations",
            "stakeholders",
            "operations",
            "efficiency",
            "productivity",
            "insights",
            "outcomes",
            "scalable",
            "alignment",
            "optimization",
            "collaboration",
            "implementation",
            "framework",
        }
        human_markers = [
            "i",
            "we",
            "my",
            "me",
            "our",
            "personally",
            "honestly",
            "today",
            "yesterday",
            "tomorrow",
            "kinda",
            "gonna",
            "wanna",
            "yeah",
            "okay",
            "lol",
            "lmao",
            "tbh",
            "imo",
            "idk",
            "stuff",
            "things",
        ]
        casual_markers = [
            "kinda",
            "gonna",
            "wanna",
            "yeah",
            "okay",
            "lol",
            "lmao",
            "tbh",
            "imo",
            "idk",
            "stuff",
            "bruh",
            "dude",
            "nah",
            "yep",
            "nope",
            "honestly",
            "basically",
            "literally",
        ]
        arabic_ai_phrases = [
            "من المهم الإشارة",
            "في الختام",
            "علاوة على ذلك",
            "من الجدير بالذكر",
            "في هذا السياق",
            "بالإضافة إلى ذلك",
            "يمكن القول",
            "لا شك أن",
            "يلعب دورا محوريا",
            "دورا محوريا",
            "يسهم بشكل كبير",
            "يساهم بشكل كبير",
            "تحقيق التنمية المستدامة",
            "تعزيز الكفاءة",
            "مواكبة التطورات",
            "في ظل التطورات",
            "مما لا شك فيه",
            "بناء على ذلك",
            "نتيجة لذلك",
            "الخوض في",
            "نسيج من",
            "نسيج معقد",
            "في عالمنا المترابط",
            "بوصلة",
            "حجر الزاوية",
            "يسلط الضوء على",
            "في عالمنا اليوم",
            "في العصر الرقمي",
            "في ظل التطورات المتسارعة",
            "لا يمكن إنكار أن",
            "من الواضح أن",
            "من أبرز الجوانب",
            "على نطاق واسع",
            "بشكل متزايد",
            "بشكل ملحوظ",
            "يلعب دورا حيويا",
            "دورا حيويا",
            "أمرا بالغ الأهمية",
            "أمر بالغ الأهمية",
            "يعكس أهمية",
            "يعزز القدرة على",
            "ركيزة أساسية",
            "حلولا مبتكرة",
            "نهجا شاملا",
            "إطارا متكاملا",
            "تجربة أكثر سلاسة",
            "التحول الرقمي",
            "المشهد المتطور بسرعة",
            "التغيرات المتسارعة",
            "نسيج غني",
            "متعدد الأوجه",
        ]
        arabic_transitions = [
            "أولا",
            "ثانيا",
            "ثالثا",
            "أخيرا",
            "لذلك",
            "وبالتالي",
            "ومن ثم",
            "علاوة",
            "بالإضافة",
            "فضلا",
            "كذلك",
            "أيضا",
            "في المقابل",
            "من ناحية",
            "من جهة",
            "على الرغم",
            "بالرغم",
            "ومع ذلك",
            "بالمثل",
            "من ثم",
            "ومن هنا",
            "عليه",
            "بناء عليه",
            "نتيجة لذلك",
            "إضافة إلى ذلك",
            "علاوة على ذلك",
            "من جانب آخر",
        ]
        arabic_human_markers = [
            "يعني",
            "والله",
            "بصراحة",
            "صراحة",
            "شوي",
            "شوية",
            "كذا",
            "بس",
            "مو",
            "مش",
            "عشان",
            "ليش",
            "ايش",
            "وش",
            "ما ادري",
            "ما أدري",
            "احس",
            "أحس",
            "هههه",
            "ههه",
            "ترى",
            "طيب",
        ]
        arabic_formal_words = [
            "محوري",
            "استراتيجي",
            "شامل",
            "مستدام",
            "مبتكر",
            "منظومة",
            "تعزيز",
            "تحسين",
            "تطوير",
            "تحقيق",
            "الكفاءة",
            "الجودة",
            "الابتكار",
            "التحديات",
            "الفرص",
            "المجالات",
            "حيوي",
            "بالغ",
            "إطار",
            "نهج",
            "حلول",
            "متطورة",
            "متسارعة",
            "أساسي",
        ]
        arabic_formal_roots = [
            "محور",
            "استراتيج",
            "شامل",
            "مستدام",
            "مبتكر",
            "فعال",
            "متكامل",
            "منظوم",
            "تعزيز",
            "تحسين",
            "تطوير",
            "تحقيق",
            "كفاء",
            "جود",
            "ابتكار",
            "تحدي",
            "فرص",
            "مجال",
            "ضرور",
            "اهمي",
            "رقمي",
            "تحول",
            "مستقبل",
            "حلول",
            "نهج",
            "اطار",
            "متسارع",
            "متطور",
            "حيوي",
            "بالغ",
            "رئيسي",
            "اساسي",
            "ركيز",
            "يسلط",
            "مواكب",
            "يسهم",
            "يساهم",
            "تعكس",
            "يعكس",
        ]

        def count_word(term):
            return len(
                re.findall(
                    rf"(^|[^\w\u0600-\u06FF]){re.escape(term)}([^\w\u0600-\u06FF]|$)",
                    lower,
                )
            )

        def count_phrase(term):
            if not term:
                return 0
            return lower.count(term.lower())

        def normalize_ar(value):
            return (
                value.replace("إ", "ا")
                .replace("أ", "ا")
                .replace("آ", "ا")
                .replace("ٱ", "ا")
                .replace("ى", "ي")
                .replace("ـ", "")
            )

        normalized_ar = normalize_ar(lower)
        ai_term_hits = sum(count_word(term) for term in ai_terms)
        ai_phrase_hits = sum(count_phrase(term) for term in ai_phrases)
        transition_hits = sum(count_word(term) for term in ai_transitions)
        formal_hits = sum(count_word(term) for term in formal_words)
        human_hits = sum(count_word(term) for term in human_markers)
        casual_hits = sum(count_word(term) for term in casual_markers)
        arabic_ai_hits = sum(
            normalized_ar.count(normalize_ar(term.lower()))
            for term in arabic_ai_phrases
        )
        arabic_transition_hits = sum(
            normalized_ar.count(normalize_ar(term.lower()))
            for term in arabic_transitions
        )
        arabic_human_hits = sum(
            normalized_ar.count(normalize_ar(term.lower()))
            for term in arabic_human_markers
        )
        arabic_formal_terms = {normalize_ar(x) for x in arabic_formal_words}
        arabic_formal_root_terms = [normalize_ar(x) for x in arabic_formal_roots]
        arabic_formal_hits = sum(
            1
            for word in words
            if normalize_ar(word) in arabic_formal_terms
            or any(root in normalize_ar(word) for root in arabic_formal_root_terms)
        )

        contraction_hits = len(re.findall(r"\b\w+'(?:s|t|re|ve|ll|d|m)\b", lower))
        first_person_hits = len(
            re.findall(r"\b(?:i|i'm|i've|i'll|we|we're|my|me|our|us)\b", lower)
        )
        numbers = len(re.findall(r"\b\d{1,4}(?:[/:.-]\d{1,4})?\b", lower))
        proper_name_candidates = re.findall(r"\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b", raw)
        named_like = len(
            [
                name
                for name in proper_name_candidates
                if name.split()[0].lower()
                not in {"the", "a", "an", "by", "yet", "nobody", "somewhere"}
            ]
        )
        punctuation_mess = len(re.findall(r"!|\.\.\.|…|\?\?|!!", raw))
        typo_like = len(
            re.findall(
                r"\b(?:teh|recieve|seperate|definately|occured|alot|wich|thier)\b",
                lower,
            )
        )
        emoji_noise = len(re.findall(r"[\U0001F300-\U0001FAFF]", raw)) + len(
            re.findall(r"[•◕ಠツ¯]{1,}", raw)
        )
        narrative_hits = sum(count_phrase(term) for term in narrative_phrases)
        scenic_hits = sum(1 for word in words if word in scenic_words)
        simple_narrative_verb_hits = sum(
            1 for word in words if word in simple_narrative_verbs
        )
        business_phrase_hits = sum(count_phrase(term) for term in business_phrases)
        business_word_hits = sum(1 for word in words if word in business_words)

        lens = [
            len(
                re.findall(r"[A-Za-z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]+", s)
            )
            for s in sentences
        ]
        lens = [x for x in lens if x > 0]
        mean_len = sum(lens) / len(lens) if lens else 0.0
        cv = 0.55
        if len(lens) >= 2 and mean_len > 0:
            variance = sum((x - mean_len) ** 2 for x in lens) / len(lens)
            cv = math.sqrt(variance) / mean_len

        sentence_openers = []
        for sentence in sentences:
            sent_words = re.findall(
                r"[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]+", sentence.lower()
            )
            if sent_words:
                sentence_openers.append(sent_words[0])
        opener_hits = sum(
            1
            for op in sentence_openers
            if op in ai_transitions
            or op in {"in", "as", "therefore", "however", "moreover", "furthermore"}
        )
        opener_rate = opener_hits / max(len(sentence_openers), 1)
        simple_narrative_opener_rate = sum(
            1 for op in sentence_openers if op in simple_narrative_openers
        ) / max(len(sentence_openers), 1)
        opener_diversity = len(set(sentence_openers)) / max(len(sentence_openers), 1)
        repeated_template_rate = 0.0
        if len(sentences) >= 3:
            starts = [
                " ".join(re.findall(r"[A-Za-z\u0600-\u06FF'-]+", s.lower())[:2])
                for s in sentences
            ]
            repeated_template_rate = 1.0 - (len(set(starts)) / max(len(starts), 1))

        unique_ratio = len(set(words)) / max(wc, 1)
        avg_word_len = sum(len(w) for w in words) / max(wc, 1)
        ai_density = (
            (
                ai_term_hits
                + 2 * ai_phrase_hits
                + transition_hits
                + 0.75 * formal_hits
                + 2.25 * arabic_ai_hits
                + 1.25 * arabic_transition_hits
            )
            / max(wc, 1)
        ) * 100
        formal_density = ((formal_hits + arabic_formal_hits) / max(wc, 1)) * 100
        personal_specificity = (
            first_person_hits
            + numbers
            + min(named_like, 4)
            + casual_hits
            + punctuation_mess
            + typo_like
        )
        anchored_specificity = (
            first_person_hits
            + numbers
            + min(named_like, 4)
            + punctuation_mess
            + typo_like
        )
        surface_human_noise = (
            casual_hits + contraction_hits + punctuation_mess + typo_like + emoji_noise
        )

        ai_weight = 0.0
        human_weight = 0.0
        strong_ai_votes = 0
        real_votes = 0
        signals = []

        def add_signal(name, verdict, weight, metric):
            nonlocal ai_weight, human_weight, strong_ai_votes, real_votes
            
            # Reduce heuristic weights so they don't completely overpower the deep learning model.
            weight = float(weight) * 0.35
            
            signals.append(
                {
                    "name": name,
                    "verdict": verdict,
                    "weight": round(float(weight), 3),
                    "metric": metric,
                }
            )
            if verdict == "ai":
                ai_weight += weight
                if weight >= 1.0 * 0.35:
                    strong_ai_votes += 1
            elif verdict == "human":
                human_weight += weight
                real_votes += 1

        if ai_density >= 5.0 or ai_phrase_hits >= 2:
            add_signal(
                "AI collocation density",
                "ai",
                2.5,
                f"density={ai_density:.2f}, phrases={ai_phrase_hits}",
            )
        elif ai_density >= 2.0 or ai_phrase_hits >= 1:
            add_signal(
                "AI collocation density",
                "ai",
                1.85,
                f"density={ai_density:.2f}, phrases={ai_phrase_hits}",
            )
        elif ai_density >= 1.0 or ai_phrase_hits >= 1:
            add_signal(
                "AI collocation density",
                "ai",
                1.2,
                f"density={ai_density:.2f}, phrases={ai_phrase_hits}",
            )

        if len(sentences) >= 3 and cv < 0.23:
            add_signal("machine-uniform sentence rhythm", "ai", 1.15, f"cv={cv:.3f}")
        elif len(sentences) >= 3 and cv < 0.40:
            add_signal("low burstiness", "ai", 0.85, f"cv={cv:.3f}")
        elif len(sentences) >= 3 and cv > 0.78:
            add_signal("high human-like burstiness", "human", 0.75, f"cv={cv:.3f}")

        if opener_rate >= 0.45:
            add_signal(
                "transition/opener overuse",
                "ai",
                1.05,
                f"opener_rate={opener_rate:.2f}",
            )
        elif opener_rate >= 0.25:
            add_signal(
                "transition/opener overuse",
                "ai",
                0.55,
                f"opener_rate={opener_rate:.2f}",
            )

        if repeated_template_rate >= 0.50:
            add_signal(
                "repeated sentence template",
                "ai",
                0.9,
                f"template_rate={repeated_template_rate:.2f}",
            )
        elif opener_diversity >= 0.92 and len(sentences) >= 5 and cv < 0.45:
            add_signal(
                "over-controlled opener diversity",
                "ai",
                0.7,
                f"diversity={opener_diversity:.2f}",
            )

        if narrative_hits >= 3:
            add_signal(
                "generated literary scene tropes",
                "ai",
                1.75,
                f"narrative_hits={narrative_hits}",
            )
        elif narrative_hits >= 1 and (cv < 0.45 or personal_specificity <= 1):
            add_signal(
                "generated literary scene tropes",
                "ai",
                1.15,
                f"narrative_hits={narrative_hits}",
            )

        if scenic_hits >= 10 and personal_specificity <= 1 and cv < 0.45:
            add_signal(
                "cinematic object-scene pattern",
                "ai",
                1.25,
                f"scenic_hits={scenic_hits}",
            )
        elif scenic_hits >= 7 and narrative_hits >= 1:
            add_signal(
                "cinematic object-scene pattern",
                "ai",
                0.85,
                f"scenic_hits={scenic_hits}",
            )

        if (
            wc >= 55
            and anchored_specificity == 0
            and scenic_hits >= 10
            and simple_narrative_verb_hits >= 7
            and simple_narrative_opener_rate >= 0.42
        ):
            add_signal(
                "humanized simple AI story pattern",
                "ai",
                2.45,
                f"scenic={scenic_hits}, simple_verbs={simple_narrative_verb_hits}, opener_rate={simple_narrative_opener_rate:.2f}",
            )
        elif (
            wc >= 45
            and anchored_specificity == 0
            and scenic_hits >= 8
            and simple_narrative_verb_hits >= 5
            and repeated_template_rate >= 0.16
        ):
            add_signal(
                "rewritten AI narrative template",
                "ai",
                1.55,
                f"scenic={scenic_hits}, simple_verbs={simple_narrative_verb_hits}, template={repeated_template_rate:.2f}",
            )

        if (
            wc >= 28
            and personal_specificity <= 1
            and business_phrase_hits >= 3
            and business_word_hits >= 8
        ):
            add_signal(
                "generic business/process prose",
                "ai",
                1.65,
                f"phrases={business_phrase_hits}, words={business_word_hits}",
            )
        elif (
            wc >= 28
            and personal_specificity <= 1
            and business_word_hits >= 8
            and (cv < 0.35 or avg_word_len >= 5.4)
        ):
            add_signal(
                "generic business/process prose",
                "ai",
                1.25,
                f"phrases={business_phrase_hits}, words={business_word_hits}",
            )

        if (
            wc >= 30
            and personal_specificity <= 1
            and avg_word_len >= 5.4
            and cv < 0.35
            and (business_word_hits >= 5 or formal_density >= 1.5)
        ):
            add_signal(
                "smooth abstract explanatory style",
                "ai",
                1.0,
                f"cv={cv:.3f}, avg_word_len={avg_word_len:.2f}",
            )

        if (
            len(sentences) >= 4
            and anchored_specificity == 0
            and opener_diversity >= 0.80
            and 0.48 <= unique_ratio <= 0.92
            and 12 <= mean_len <= 30
        ):
            add_signal(
                "LLM-balanced paragraph architecture",
                "ai",
                1.1,
                f"mean_len={mean_len:.1f}, diversity={opener_diversity:.2f}",
            )

        generic_frame_hits = sum(
            count_phrase(p)
            for p in [
                "in conclusion",
                "in summary",
                "to sum up",
                "overall",
                "ultimately",
                "in essence",
            ]
        )
        if generic_frame_hits:
            add_signal(
                "generic conclusion/summary framing",
                "ai",
                1.0,
                f"frames={generic_frame_hits}",
            )

        if (
            wc >= 30
            and contraction_hits == 0
            and formal_density >= 3.0
            and personal_specificity <= 1
        ):
            add_signal(
                "polished formal prose with no contractions",
                "ai",
                1.05,
                f"formal_density={formal_density:.2f}",
            )
        elif (
            wc >= 50
            and contraction_hits == 0
            and avg_word_len >= 4.9
            and personal_specificity <= 1
        ):
            add_signal(
                "formal zero-contraction style",
                "ai",
                0.75,
                f"avg_word_len={avg_word_len:.2f}",
            )

        if (
            wc >= 35
            and personal_specificity == 0
            and (formal_density >= 2.0 or avg_word_len >= 4.8)
        ):
            add_signal(
                "low personal specificity",
                "ai",
                0.75,
                f"specificity={personal_specificity}",
            )
        elif personal_specificity >= 4:
            add_signal(
                "personal/casual specificity",
                "human",
                0.85,
                f"specificity={personal_specificity}",
            )

        if casual_hits >= 1 and (
            formal_density >= 4.0 or ai_phrase_hits >= 1 or avg_word_len >= 5.2
        ):
            add_signal(
                "humanizer register mismatch",
                "ai",
                1.15,
                f"casual={casual_hits}, formal={formal_density:.2f}",
            )
        if (
            surface_human_noise >= 1
            and anchored_specificity <= 1
            and wc >= 35
            and (
                cv < 0.48
                or avg_word_len >= 4.8
                or ai_weight >= 1.5
                or narrative_hits >= 1
                or business_word_hits >= 6
            )
        ):
            add_signal(
                "surface humanizer noise over AI structure",
                "ai",
                1.45,
                f"noise={surface_human_noise}, anchored={anchored_specificity}",
            )
        if (
            emoji_noise >= 1
            and anchored_specificity == 0
            and len(sentences) >= 3
            and (
                cv < 0.55
                or narrative_hits >= 1
                or scenic_hits >= 6
                or formal_density >= 1.5
            )
        ):
            add_signal(
                "emoji/emoticon masking polished AI passage",
                "ai",
                1.25,
                f"emoji_noise={emoji_noise}",
            )
        if (
            contraction_hits >= 1
            and anchored_specificity <= 1
            and wc >= 45
            and (cv < 0.45 or avg_word_len >= 4.9 or ai_weight >= 1.8)
        ):
            add_signal(
                "contractions without lived detail",
                "ai",
                0.95,
                f"contractions={contraction_hits}, anchored={anchored_specificity}",
            )
        if (
            (narrative_hits >= 1 or scenic_hits >= 6)
            and surface_human_noise >= 1
            and anchored_specificity <= 1
            and wc >= 35
        ):
            add_signal(
                "humanized generated scene",
                "ai",
                1.25,
                f"narrative={narrative_hits}, scenic={scenic_hits}, noise={surface_human_noise}",
            )
        if (
            casual_hits >= 2
            and ai_density < 1.0
            and ai_weight < 2.2
            and anchored_specificity >= 2
        ):
            add_signal("casual human markers", "human", 0.8, f"casual={casual_hits}")

        if arabic_ai_hits >= 3:
            add_signal(
                "Arabic formulaic AI phrasing",
                "ai",
                2.05,
                f"arabic_ai_hits={arabic_ai_hits}",
            )
        elif arabic_ai_hits >= 1 and (
            arabic_formal_hits >= 2 or arabic_transition_hits >= 1
        ):
            add_signal(
                "Arabic formal AI phrasing",
                "ai",
                1.35,
                f"arabic_ai_hits={arabic_ai_hits}",
            )
        if (
            arabic_transition_hits >= 3
            and arabic_formal_hits >= 3
            and arabic_human_hits == 0
        ):
            add_signal(
                "Arabic transition template stack",
                "ai",
                1.2,
                f"transitions={arabic_transition_hits}, formal={arabic_formal_hits}",
            )
        if (
            arabic_formal_hits >= 7
            and arabic_human_hits == 0
            and wc >= 35
            and cv < 0.52
        ):
            add_signal(
                "Arabic polished MSA with low lived detail",
                "ai",
                1.1,
                f"formal={arabic_formal_hits}, cv={cv:.3f}",
            )
        if arabic_human_hits >= 2 and arabic_ai_hits == 0 and arabic_formal_hits < 5:
            add_signal(
                "Arabic dialect/casual markers",
                "human",
                1.05,
                f"arabic_human_hits={arabic_human_hits}",
            )

        if contraction_hits >= 2 and casual_hits >= 1 and ai_density < 1.6:
            add_signal(
                "contractions plus casual markers",
                "human",
                0.9,
                f"contractions={contraction_hits}, casual={casual_hits}",
            )
        elif first_person_hits >= 2 and personal_specificity >= 3 and ai_density < 1.8:
            add_signal(
                "first-person specific experience",
                "human",
                0.85,
                f"first_person={first_person_hits}",
            )

        if unique_ratio < 0.48 and wc >= 70:
            add_signal(
                "low lexical variety in long text",
                "ai",
                0.55,
                f"unique_ratio={unique_ratio:.2f}",
            )
        elif unique_ratio > 0.82 and wc >= 45 and ai_density < 1.5:
            add_signal(
                "high varied vocabulary without AI phrases",
                "human",
                0.35,
                f"unique_ratio={unique_ratio:.2f}",
            )

        ai_floor = 0.0
        if ai_weight >= 5.0 and ai_weight >= human_weight + 1.2:
            ai_floor = 0.93
        elif ai_weight >= 4.0 and ai_weight >= human_weight + 0.8:
            ai_floor = 0.86
        elif ai_weight >= 3.0 and ai_weight >= human_weight + 0.4:
            ai_floor = 0.74
        elif ai_weight >= 2.2 and ai_weight > human_weight:
            ai_floor = 0.60

        human_cap = 0.0
        if human_weight >= 3.0 and ai_weight < 2.6:
            human_cap = 0.34
        elif human_weight >= 2.0 and ai_weight < 3.2:
            human_cap = 0.44

        return {
            "success": True,
            "ai_weight": round(ai_weight, 3),
            "human_weight": round(human_weight, 3),
            "strong_ai_votes": int(strong_ai_votes),
            "human_votes": int(real_votes),
            "ai_probability_floor": round(ai_floor, 3),
            "human_probability_cap": round(human_cap, 3),
            "signals": signals[:12],
            "top_ai_reasons": [s["name"] for s in signals if s["verdict"] == "ai"][:6],
            "top_human_reasons": [
                s["name"] for s in signals if s["verdict"] == "human"
            ][:6],
            "metrics": {
                "word_count": wc,
                "sentence_count": len(sentences),
                "cv": round(cv, 4),
                "ai_density": round(ai_density, 4),
                "formal_density": round(formal_density, 4),
                "personal_specificity": int(personal_specificity),  # type: ignore
                "anchored_specificity": int(anchored_specificity),  # type: ignore
                "surface_human_noise": int(surface_human_noise),  # type: ignore
                "emoji_noise": int(emoji_noise),  # type: ignore
                "opener_rate": round(opener_rate, 4),
                "simple_narrative_opener_rate": round(simple_narrative_opener_rate, 4),
                "template_rate": round(repeated_template_rate, 4),
                "unique_ratio": round(unique_ratio, 4),
                "avg_word_len": round(avg_word_len, 4),
                "arabic_ai_hits": int(arabic_ai_hits),  # type: ignore
                "arabic_transition_hits": int(arabic_transition_hits),  # type: ignore
                "arabic_human_hits": int(arabic_human_hits),  # type: ignore
                "narrative_hits": int(narrative_hits),
                "scenic_hits": int(scenic_hits),  # type: ignore
                "simple_narrative_verb_hits": int(simple_narrative_verb_hits),  # type: ignore
                "business_phrase_hits": int(business_phrase_hits),
                "business_word_hits": int(business_word_hits),  # type: ignore
            },
        }
    except Exception as e:
        logger.error(f"Advanced text forensics failed: {e}")
        return {"success": False, "reason": str(e)}


# =========================================================================
#  3. INFERENCE SCHEDULERS
# =========================================================================


def _run_legacy_text_detection(text, requested_language="auto"):
    import re

    ratio = arabic_ratio(text)

    def clamp_prob(value):
        return max(0.01, min(0.99, float(value)))

    def count_human_markers(value):
        patterns = [
            r"\bi\b",
            r"\bwe\b",
            r"\bmy\b",
            r"\bme\b",
            r"\bour\b",
            r"\bi\s+am\b",
            r"\bi'm\b",
            r"\bi\s+took\b",
            r"\bi\s+wanted\b",
            r"\btoday\b",
            r"\byesterday\b",
            r"\btomorrow\b",
            r"\bpersonally\b",
            r"\bhonestly\b",
            r"\bkinda\b",
            r"\bgonna\b",
            r"\bwanna\b",
            r"\bliterally\b",
            r"\bbasically\b",
            r"\bstuff\b",
            r"\byeah\b",
            r"\bokay\b",
            r"\blol\b",
            r"\blmao\b",
            r"\btbh\b",
            r"\bimo\b",
            r"\bidk\b",
            "اعتقد",
            "أعتقد",
            "اظن",
            "أظن",
            "بالنسبة لي",
            "في رأيي",
            "برأيي",
            "بصراحة",
            "يعني",
            "شوف",
            "عشان",
            "عبالي",
            "مشان",
            "علشان",
            "ممكن",
            "والله",
        ]

        count = 0
        for marker in patterns:
            if marker.startswith(r"\b"):
                count += len(re.findall(marker, value))
            elif marker in value:
                count += value.count(marker)
        return count

    # Translation phase
    is_arabic = ratio >= 0.20
    arabic_signals = []
    if is_arabic:
        try:
            from arabic_detector import AdvancedArabicOrchestrator
            orch = AdvancedArabicOrchestrator()
            arabic_signals = orch.analyze(text)
        except Exception as e:
            logger.error(f"Failed to run AdvancedArabicOrchestrator: {e}")
    text_for_ml = text

    if is_arabic:
        logger.info(
            "Arabic text detected; using local Arabic heuristics plus local ML without network translation."
        )

    # EXACT same way as English text!
    logger.info(f"CALLING PREDICT WITH: {text_for_ml[:100]}")
    prob = float(text_model.predict(text_for_ml))
    logger.info(f"ML PREDICT RETURNED: {prob}")

    words = re.findall(
        r"[A-Za-z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]+", text.lower()
    )
    ai_indicators = [
        "delve",
        "tapestry",
        "realm",
        "landscape",
        "pivotal",
        "seamlessly",
        "foster",
        "robust",
        "multifaceted",
        "nuance",
        "testament to",
        "in conclusion",
        "it is important to note",
        "it is worth noting",
        "plays a crucial role",
        "rapidly evolving",
        "holistic",
        "comprehensive",
        "transformative",
        "unlock",
        "leverage",
        "underscores",
        "paramount",
        "moreover",
        "furthermore",
        "additionally",
        "ultimately",
        "as an ai language model",
        "as an ai",
        "completely ai generated",
        "generated by ai",
        "ai-generated",
    ]

    text_lower = text.lower()
    indicator_hits = 0
    found_indicators = []
    for ind in ai_indicators:
        if ind in text_lower:
            indicator_hits += text_lower.count(ind)
            found_indicators.append(ind)

    human_hits = count_human_markers(text_lower)
    advanced_text = compute_advanced_text_forensics(text)
    advanced_ai_weight = (
        advanced_text.get("ai_weight", 0.0) if advanced_text.get("success") else 0.0
    )
    advanced_human_weight = (
        advanced_text.get("human_weight", 0.0) if advanced_text.get("success") else 0.0
    )
    advanced_metrics = (
        advanced_text.get("metrics", {}) if advanced_text.get("success") else {}
    )
    surface_human_noise = int(advanced_metrics.get("surface_human_noise", 0) or 0)  # type: ignore
    anchored_specificity = int(advanced_metrics.get("anchored_specificity", advanced_metrics.get("personal_specificity", 0)) or 0)  # type: ignore
    humanized_ai_suspected = (
        surface_human_noise >= 1
        and anchored_specificity <= 1
        and advanced_ai_weight >= max(1.4, advanced_human_weight + 0.2)  # type: ignore
    )

    final_prob = prob
    if len(words) > 0:
        vocab_density = indicator_hits / len(words)
        if indicator_hits:
            final_prob += min(0.35, indicator_hits * 0.08 + vocab_density * 4.0)

    if human_hits and not humanized_ai_suspected and advanced_ai_weight < max(3.2, advanced_human_weight + 1.0):  # type: ignore
        final_prob -= min(0.24, human_hits * 0.04)

    if indicator_hits >= 4:
        final_prob = max(final_prob, 0.97)
    elif indicator_hits >= 2:
        final_prob = max(final_prob, 0.90)

    if advanced_text.get("success"):
        ai_floor = advanced_text.get("ai_probability_floor", 0.0)
        human_cap = advanced_text.get("human_probability_cap", 0.0)
        if ai_floor and advanced_ai_weight >= advanced_human_weight + 0.35:  # type: ignore
            final_prob = max(final_prob, ai_floor)
        if human_cap and not (advanced_ai_weight >= advanced_human_weight + 0.8 and advanced_ai_weight >= 3.0):  # type: ignore
            final_prob = min(final_prob, human_cap)

    if humanized_ai_suspected:
        final_prob = max(final_prob, 0.78 if advanced_ai_weight >= 2.2 else 0.64)  # type: ignore

    if indicator_hits == 0 and human_hits >= 2 and advanced_ai_weight < 2.2 and not humanized_ai_suspected:  # type: ignore
        final_prob = min(final_prob, 0.46)
    elif indicator_hits == 0 and len(words) < 50 and advanced_ai_weight < 1.8 and not humanized_ai_suspected:  # type: ignore
        final_prob = min(final_prob, 0.56)

    if is_arabic and arabic_signals:
        ai_scores = []
        weights = []
        for s in arabic_signals:
            if not s.failed and s.signal_quality > 0.05:
                ai_scores.append(s.score * s.signal_quality)
                weights.append(s.signal_quality)
        
        if ai_scores and sum(weights) > 0:
            arabic_fused = sum(ai_scores) / sum(weights)
            # True independent evaluation: blend the dedicated Arabic probability
            # based on the Arabic text ratio, avoiding arbitrary constant boosts.
            arabic_weight = min(1.0, ratio)
            final_prob = (final_prob * (1.0 - arabic_weight)) + (arabic_fused * arabic_weight)

    if "as an ai" in text_lower or "language model" in text_lower:
        final_prob = max(final_prob, 0.98)

    # Zero Trust Policy
    final_prob = clamp_prob(final_prob)

    prediction = "AI" if final_prob >= 0.5 else "Human"
    confidence = f"{max(final_prob, 1 - final_prob) * 100:.1f}%"

    if ratio >= 0.45:
        language = "Arabic"
    elif ratio >= 0.15:
        language = "Mixed Arabic/English"
    else:
        language = "English / Latin"

    sentence_breakdown = []
    # If it's Arabic, translate the sentences too so they are detected the EXACT same way
    for sentence in split_text_sentences(text):
        if len(sentence.strip()) < 10:
            continue

        sent_for_ml = sentence
        sent_arabic_meta = (
            compute_arabic_ai_heuristics(sentence)
            if arabic_ratio(sentence) >= 0.20
            else {}
        )
        if arabic_ratio(sentence) >= 0.20:
            sent_for_ml = sentence

        sent_prob = float(text_model.predict(sent_for_ml))

        # Apply sentence-level heuristics
        sent_lower = sentence.lower()
        has_indicator = any(ind in sent_lower for ind in ai_indicators)
        sent_human_hits = count_human_markers(sent_lower)
        sent_advanced = compute_advanced_text_forensics(sentence)
        if has_indicator:
            sent_prob = max(sent_prob, 0.85 if indicator_hits >= 2 else 0.72)
        elif sent_arabic_meta.get("is_arabic"):
            sent_prob = float(sent_arabic_meta.get("score", 0.0) or 0.0)
        elif sent_advanced.get("success") and sent_advanced.get("ai_probability_floor", 0) >= 0.60:  # type: ignore
            sent_prob = max(sent_prob, sent_advanced.get("ai_probability_floor", 0.60))
        elif sent_human_hits >= 1 and sent_advanced.get("ai_weight", 0) < 2.0:  # type: ignore
            sent_prob = max(0.0001, sent_prob - (sent_human_hits * 0.20))
        if "as an ai" in sent_lower or "language model" in sent_lower:
            sent_prob = max(sent_prob, 0.98)

        sent_prob = clamp_prob(sent_prob)
        sent_pred = "AI" if sent_prob >= 0.5 else "Human"
        sentence_breakdown.append(
            {
                "text": sentence,
                "prediction": sent_pred,
                "probability": round(sent_prob, 3),
            }
        )

    features = {
        "model_used": "3truth Deep Multi-Head Attention PyTorch Text Classifier v11 Strict",
        "language": language,
        "vocab_tells": (
            f"Found AI collocations: {', '.join(set(found_indicators[:4]))}"
            if found_indicators
            else "no primary AI vocabulary tokens"
        ),
        "semantic_entropy": "low" if final_prob > 0.6 else "normal",
        "humanization_attempt": "high" if humanized_ai_suspected or (advanced_ai_weight >= 4.0 and advanced_human_weight >= 1.0) else ("medium" if (surface_human_noise >= 1 or (final_prob > 0.4 and final_prob < 0.6)) else "low"),  # type: ignore
        "humanizer_noise_score": str(surface_human_noise),
        "anchored_specificity": str(anchored_specificity),
        "advanced_text_ai_score": f"{advanced_ai_weight:.2f}",
        "advanced_text_human_score": f"{advanced_human_weight:.2f}",
        "advanced_text_reasons": ", ".join(advanced_text.get("top_ai_reasons", [])[:5]) if advanced_text.get("success") else "not available",  # type: ignore
        "human_text_reasons": ", ".join(advanced_text.get("top_human_reasons", [])[:5]) if advanced_text.get("success") else "not available",  # type: ignore
        "strict_text_mode": "enabled",
    }

    if arabic_meta.get("is_arabic"):
        details = arabic_meta.get("details", {})
        features["T01_Lexical_Repetition"] = details.get("T01_Lexical_Repetition", 0)
        features["T05_Burstiness"] = details.get("T05_Burstiness", "Normal")
        features["T06_Perplexity"] = details.get("T06_Perplexity", "Normal")
        features["T09_Rhythm_Balance"] = details.get("T09_Rhythm_Balance", 0)
        features["T13_Transition_Overuse"] = details.get("T13_Transition_Overuse", 0)
        features["T14_Formal_Root_Density"] = details.get("T14_Formal_Root_Density", 0)
        features["T15_Personal_Experience"] = details.get(
            "T15_Personal_Experience", "None"
        )
        features["T19_Dialect_Authenticity"] = details.get(
            "T19_Dialect_Authenticity", "None"
        )
        features["T20_LLM_Signature"] = details.get("T20_LLM_Signature", "None")
        features["arabic_ai_signals"] = (
            f"filters_triggered={details.get('triggered_filters', 0)}, rhythm_cv={details.get('cv', 0)}"
        )

    return {
        "prediction": prediction,
        "ai_probability": round(final_prob, 3),
        "confidence": confidence,
        "language": language,
        "word_count": len(words),
        "features": features,
        "advanced_text_forensics": advanced_text,
        "sentenceBreakdown": sentence_breakdown,
    }


@Profiler.profile("run_text_detection")
def run_text_detection(text, requested_language="auto"):
    """Research-mode text path: content models and language-neutral statistics only."""
    import re

    detectors, coverage, requires_arabic_model = compute_text_content_detectors(text)
    fusion = fuse_detector_evidence(
        "text", detectors, require_learned=requires_arabic_model
    )

    # Multi-scale analysis: Split by paragraphs to detect sandwiching
    paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 30]
    sandwiching_detected = False
    max_p_score = 0
    if len(paragraphs) >= 3:
        p_scores = []
        for p in paragraphs:
            p_detectors, _, p_req_arabic = compute_text_content_detectors(p)
            p_fusion = fuse_detector_evidence(
                "text", p_detectors, require_learned=p_req_arabic
            )
            p_scores.append(p_fusion["ai_probability"])

        if p_scores:
            max_p_score = max(p_scores)
            if max_p_score > fusion["ai_probability"] + 20 and max_p_score > 60:
                sandwiching_detected = True
                fusion["ai_probability"] = max_p_score
                fusion["prediction"] = (
                    "AI Generated" if fusion["ai_probability"] >= 50 else "Human"
                )

    ratio = coverage["arabic_character_ratio"]
    if coverage["mixed_arabic_english"]:
        language = "Mixed Arabic/English"
    elif ratio >= 0.45:
        language = "Arabic"
    elif coverage["arabizi_token_ratio"] > 0:
        language = "Arabizi / Latin-script Arabic candidate"
    else:
        language = "English / Latin"

    words = re.findall(r"[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF0-9']+", text)
    fusion.update(
        {
            "language": language,
            "word_count": len(words),
            "language_coverage": coverage,
            "sentenceBreakdown": [],
            "features": {
                "model_used": "availability-aware content forensic ensemble",
                "language": language,
                "arabic_character_ratio": coverage["arabic_character_ratio"],
                "arabizi_token_ratio": coverage["arabizi_token_ratio"],
                "mixed_arabic_english": coverage["mixed_arabic_english"],
                "dialect_support": coverage["dialect_support"],
                "sandwiching_detected": (
                    f"Yes (max paragraph score: {max_p_score:.1f}%)"
                    if sandwiching_detected
                    else "No"
                ),
                "keyword_lists_used_for_decision": "no",
            },
        }
    )
    
    profiling_metrics = Profiler.get_metrics()
    Profiler.clear()
    fusion["profiling"] = profiling_metrics
    
    return fusion


@Profiler.profile("run_image_detection")
def run_image_detection(img_pil, file_size, original_name, raw_bytes=None):
    from image_detector import AdvancedImageOrchestrator
    from security_validator import FileValidator

    if file_size > FileValidator.MAX_IMAGE_SIZE_BYTES:
        return {"error": "Image exceeds max size."}
        
    if raw_bytes and not FileValidator.validate_magic_bytes(raw_bytes, "image"):
        return {"error": "Invalid image magic bytes."}
    
    # 1. Context building (FAST)
    lower_name = original_name.lower()
    ai_keywords = [
        "midjourney", "flux", "dalle", "dall-e", "sdxl", "comfyui",
        "stable diffusion", "stablediffusion", "leonardo ai", "civitai",
        "ai-generated", "generated-by-ai"
    ]
    ctx = {
        "filename_hit": any(kw in lower_name for kw in ai_keywords),
        "neural_prob": 0.5,
        "neural_model_ran": False
    }
    
    orchestrator = AdvancedImageOrchestrator()
    
    # STAGE 1 & 2: Fast & Strong Signals (Provenance + Pixel Forensics)
    provenance_signals = orchestrator.provenance_orchestrator.analyze(raw_bytes, ctx)
    pixel_signals = orchestrator.pixel_orchestrator.analyze(img_pil, ctx)
    
    fast_signals = provenance_signals + pixel_signals
    # Add filename signal if present
    if ctx["filename_hit"]:
        class FilenameAnalyzer:
            pass # We can just mock it or skip it here, but actually image_detector does it.
    
    # Quick fuse to check if we can early-exit
    from fusion_engine import EvidenceFusionEngine
    fast_fusion = EvidenceFusionEngine().fuse(fast_signals)
    fast_prob = fast_fusion.get("ai_probability", 0.5)
    
    # Early Exit Thresholds
    if fast_prob > 0.99 or fast_prob < 0.01:
        logger.info(f"Early exit triggered in Staged Inference. Probability: {fast_prob}")
        fusion_result = fast_fusion
    else:
        # STAGE 3: Expensive Analysis (Deep Neural Classifier)
        logger.info("Confidence ambiguous. Proceeding to Expensive Analysis (Stage 3).")
        run_neural_model = IMAGE_MODEL_AVAILABLE
        if run_neural_model:
            try:
                @Profiler.profile("cnn_inference")
                def _run_cnn():
                    spectral_grid = extract_spectral_grid(img_pil)
                    spatial_tensor = img_transforms(img_pil).unsqueeze(0).to(DEVICE)
                    spectral_tensor = (
                        torch.tensor(spectral_grid).unsqueeze(0).unsqueeze(0).to(DEVICE)
                    )
                    with torch.no_grad():
                        logits = image_net(spatial_tensor, spectral_tensor)
                        return float(torch.sigmoid(logits).item())
                ctx["neural_prob"] = _run_cnn()
                ctx["neural_model_ran"] = True
            except Exception as e:
                logger.error(f"Image CNN inference error: {e}")
                
        # Re-run full orchestrator analysis to include vision models and proper fusion
        fusion_result = orchestrator.analyze(img_pil, raw_bytes, context=ctx)
    
    profiling_metrics = Profiler.get_metrics()
    Profiler.clear()
    
    return {
        "probability": fusion_result.get("ai_probability", 0.5),
        "classification": fusion_result.get("classification", "Human"),
        "reasons": fusion_result.get("evidence_summary", [])[:8],
        "signals": fusion_result.get("raw_outputs", []) + fusion_result.get("calibrated_outputs", []),
        "review_flags": [],
        "profiling": profiling_metrics
    }


def run_video_detection(video_path, file_size, original_name):
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.dirname(__file__)))
    from video_detector import VideoTemporalOrchestrator
    
    orchestrator = VideoTemporalOrchestrator()
    ctx = {"filename": original_name, "file_size": file_size}
    fusion_result = orchestrator.analyze(video_path, context=ctx)
    
    return {
        "probability": fusion_result.get("ai_probability", 0.5),
        "classification": fusion_result.get("classification", "Human"),
        "reasons": fusion_result.get("evidence_summary", [])[:8],
        "signals": fusion_result.get("raw_outputs", []) + fusion_result.get("calibrated_outputs", []),
        "review_flags": []
    }


# =========================================================================
#  4. FLASK WEB ROUTING GATEWAYS
# =========================================================================


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "healthy",
            "backend": "3truth PyTorch Dual-Stream Forensic Server v10",
            "device": str(DEVICE),
            "models": {
                "image_spatial_spectral": IMAGE_MODEL_AVAILABLE,
                "video_spatio_temporal": VIDEO_MODEL_AVAILABLE,
                "production": production_model_status(),
                "fusion": {
                    modality: os.path.exists(
                        os.path.join(models_dir, "fusion", f"{modality}.joblib")
                    )
                    for modality in ("text", "image", "video")
                },
            },
        }
    )


@app.route("/detect/text", methods=["POST"])
def detect_text():
    data = request.json or {}
    text = data.get("text", "")
    requested_language = data.get("language", "auto")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        res = run_text_detection(text, requested_language)
        return jsonify(res)
    except Exception as e:
        logger.error(f"Text detection failed: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    try:
        user_info = verify_token(request)
        uid = user_info.get("uid", "anonymous")
    except Exception as e:
        logger.warning(f"Anonymous access to /api/analyze: {e}")
        uid = "anonymous"

    # Force JSON parsing if Content-Type indicates json
    content_type = request.content_type or ""
    is_json = request.is_json or "application/json" in content_type.lower()

    data = {}
    if is_json:
        try:
            data = request.get_json(force=True) or {}
            logger.info(f"Successfully parsed JSON body. Keys: {list(data.keys())}")
        except Exception as e:
            logger.error(f"Failed parsing JSON body: {e}")
            # Try parsing manually from raw data
            try:
                raw_bytes = request.get_data()
                data = json.loads(raw_bytes.decode("utf-8")) or {}
                logger.info(
                    f"Fallback manually parsed JSON body. Keys: {list(data.keys())}"
                )
            except Exception as e2:
                logger.error(f"Fallback parsing JSON body also failed: {e2}")

    analysis_type = data.get("type") if is_json else request.form.get("type", "text")
    if not analysis_type:
        analysis_type = "text"

    logger.info(
        f"api_analyze: analysis_type={analysis_type} is_json={is_json} content_type={content_type}"
    )

    try:
        if analysis_type == "text":
            if is_json:
                text = data.get("content", "")
            else:
                text = request.form.get("content", "")

            if not text:
                logger.warning(
                    f"No text provided! parsed_data_keys={list(data.keys()) if is_json else list(request.form.keys())}"
                )
                return jsonify({"error": "No text provided"}), 400

            word_count = len(text.split())
            if word_count > 0:
                try:
                    verify_balance(uid, word_count)
                except Exception as e:
                    return jsonify({"error": str(e)}), 403

            requested_language = (
                data.get("language", "auto")
                if is_json
                else request.form.get("language", "auto")
            )
            res = run_text_detection(text, requested_language)

            # Consume words only after successful detection
            if word_count > 0:
                try:
                    consume_words(uid, word_count)
                except Exception as e:
                    logger.error(
                        f"Failed to consume words after successful analysis: {e}"
                    )

            return jsonify(res)

        elif analysis_type == "image":
            file = request.files.get("file")
            if not file:
                return jsonify({"error": "No image file provided"}), 400

            # Read raw bytes of the file for binary/metadata code inspection
            raw_bytes = file.read()
            file.seek(0)

            img = Image.open(file.stream).convert("RGB")
            file.seek(0, os.SEEK_END)
            size = file.tell()
            file.seek(0)

            try:
                verify_balance(uid, 500)  # Check for 500 words
            except Exception as e:
                return jsonify({"error": str(e)}), 403

            res = run_image_detection(img, size, file.filename, raw_bytes)

            # Consume words only after successful detection
            try:
                consume_words(uid, 500)
            except Exception as e:
                logger.error(f"Failed to consume words for image: {e}")

            return jsonify(res)

        elif analysis_type == "video":
            file = request.files.get("file")
            if not file:
                return jsonify({"error": "No video file provided"}), 400

            temp_path = os.path.join(
                os.environ.get("TEMP", "."), f"temp_upload_{file.filename}"
            )
            file.save(temp_path)
            size = os.path.getsize(temp_path)

            try:
                verify_balance(uid, 2000)  # Check for 2000 words
            except Exception as e:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return jsonify({"error": str(e)}), 403

            try:
                res = run_video_detection(temp_path, size, file.filename)

                # Consume words only after successful detection
                try:
                    consume_words(uid, 2000)
                except Exception as e:
                    logger.error(f"Failed to consume words for video: {e}")

            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

            return jsonify(res)

        else:
            return jsonify({"error": "Invalid analysis type"}), 400

    except Exception as e:
        logger.error(f"Analysis failed for type '{analysis_type}': {e}")
        return jsonify({"error": str(e)}), 500


import threading


def preload_text_model():
    try:
        logger.info("Preloading text models in the background...")
        # Text models are loaded implicitly
        logger.info("Text models preloaded successfully!")
    except Exception as e:
        logger.error(f"Failed to preload text models: {e}")


def preload_image_models():
    try:
        logger.info("Preloading image models in the background...")
        from production_detectors import _load_image_model, IMAGE_MODEL_SPECS

        for key in IMAGE_MODEL_SPECS:
            _load_image_model(key)
        logger.info("Image models preloaded successfully!")
    except Exception as e:
        logger.error(f"Failed to preload image models: {e}")


def preload_all_models():
    preload_text_model()
    preload_image_models()


threading.Thread(target=preload_all_models, daemon=True).start()

if __name__ == "__main__":
    PORT = 5003
    logger.info(
        f"Starting 3truth Dual-Stream PyTorch ML Service on http://127.0.0.1:{PORT}"
    )
    app.run(host="0.0.0.0", port=PORT)

@Profiler.profile("run_video_detection")
def run_video_detection(video_path, file_size, original_name):
    from security_validator import FileValidator
    if file_size > FileValidator.MAX_VIDEO_SIZE_BYTES:
        return {"error": "Video exceeds max size."}
        
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.dirname(__file__)))
    from video_detector import VideoTemporalOrchestrator
    
    orchestrator = VideoTemporalOrchestrator()
    ctx = {"filename": original_name, "file_size": file_size}
    fusion_result = orchestrator.analyze(video_path, context=ctx)
    
    profiling_metrics = Profiler.get_metrics()
    Profiler.clear()
    
    return {
        "probability": fusion_result.get("ai_probability", 0.5),
        "classification": fusion_result.get("classification", "Human"),
        "reasons": fusion_result.get("evidence_summary", [])[:8],
        "signals": fusion_result.get("raw_outputs", []) + fusion_result.get("calibrated_outputs", []),
        "review_flags": [],
        "profiling": profiling_metrics
    }

@Profiler.profile("run_audio_detection")
def run_audio_detection(audio_path, file_size, original_name):
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.dirname(__file__)))
    from audio_detector import AudioTemporalOrchestrator
    
    orchestrator = AudioTemporalOrchestrator()
    ctx = {"filename": original_name, "file_size": file_size}
    fusion_result = orchestrator.analyze(audio_path, context=ctx)
    
    profiling_metrics = Profiler.get_metrics()
    Profiler.clear()
    
    return {
        "probability": fusion_result.get("ai_probability", 0.5),
        "classification": fusion_result.get("classification", "Human"),
        "reasons": fusion_result.get("evidence_summary", [])[:8],
        "signals": fusion_result.get("raw_outputs", []) + fusion_result.get("calibrated_outputs", []),
        "review_flags": [],
        "profiling": profiling_metrics
    }
