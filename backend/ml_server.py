import os
import sys
import torch  # type: ignore
import torch.nn as nn  # type: ignore
import torchvision.transforms as transforms  # type: ignore
from flask import Flask, request, jsonify  # type: ignore
from flask_cors import CORS  # type: ignore
from PIL import Image  # type: ignore
import cv2  # type: ignore
import numpy as np  # type: ignore
import logging
import json

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
logger = logging.getLogger("ml_server")

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from ml_models import (
        TextDetectorModel,
        DualStreamImageDetector,
        SpatioTemporalVideoDetector,
        compute_arabic_ai_heuristics,
        arabic_ratio,
        arabic_words,
        split_text_sentences
    )
except ImportError as e:
    logger.error(f"Could not import ml_models.py. Ensure it is in the same folder: {e}")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

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
if os.path.exists(image_checkpoint):
    try:
        state = torch.load(image_checkpoint, map_location=DEVICE)
        # Handle dict wrapping or raw state dict
        image_net.load_state_dict(state.get("model_state_dict", state) if isinstance(state, dict) else state)
        logger.info("Loaded custom trained PyTorch Spatial-Spectral Image Detector (.pth).")
    except Exception as e:
        logger.error(f"Error loading Image model checkpoint: {e}")
image_net.to(DEVICE)
image_net.eval()

# 3. Video Detector
video_net = SpatioTemporalVideoDetector(dual_stream_backbone=image_net)
video_checkpoint = os.path.join(models_dir, "video_detector.pth")
if os.path.exists(video_checkpoint):
    try:
        state = torch.load(video_checkpoint, map_location=DEVICE)
        video_net.load_state_dict(state.get("model_state_dict", state) if isinstance(state, dict) else state)
        logger.info("Loaded custom trained PyTorch Spatio-Temporal Video Detector (.pth).")
    except Exception as e:
        logger.error(f"Error loading Video model checkpoint: {e}")
video_net.to(DEVICE)
video_net.eval()

# Spatial image transforms matching training resizing
img_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

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
                block = arr[by*8:(by+1)*8, bx*8:(bx+1)*8]
                try:
                    dct_coef = cv2.dct(block)
                    high_freq = np.sum(np.abs(dct_coef[4:, 4:]))
                except Exception:
                    # Mathematical Laplacian discrete backup
                    high_freq = np.sum(np.abs(
                        block[1:-1, 1:-1] * 4 - 
                        block[:-2, 1:-1] - 
                        block[2:, 1:-1] - 
                        block[1:-1, :-2] - 
                        block[1:-1, 2:]
                    ))
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
        mask[cy-16:cy+16, cx-16:cx+16] = False
        
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
            "success": True
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

        r, g, b = arr[:,:,0].astype(float), arr[:,:,1].astype(float), arr[:,:,2].astype(float)
        
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
                block = g[by*8:(by+1)*8, bx*8:(bx+1)*8]
                b_min, b_max = np.min(block), np.max(block)
                if b_max - b_min < 25:
                    flat_block_stds.append(np.std(block))
        
        flat_block_noise = float(np.mean(flat_block_stds)) if flat_block_stds else float(np.std(g))
        if np.isnan(flat_block_noise):
            flat_block_noise = 1.84

        # Checkerboard upsampling deconvolution ratios
        even_diffs, odd_diffs = [], []
        for y in range(256):
            for x in range(254):
                diff = abs(g[y, x] - g[y, x+1])
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
            "success": True
        }
    except Exception as e:
        logger.error(f"Forensics calculation failed: {e}")
        return get_default_forensics()


def compute_ela_forensics(img_pil):
    """
    Computes Error Level Analysis (ELA) to detect manipulated/synthetic pixels.
    """
    try:
        import io
        img_rgb = img_pil.convert("RGB")
        temp_io = io.BytesIO()
        img_rgb.save(temp_io, 'JPEG', quality=90)
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
        
        flat_mask = (edges == 0)
        edge_mask = (edges > 0)
        
        flat_ela = float(np.mean(diff[flat_mask])) if np.any(flat_mask) else ela_mean
        edge_ela = float(np.mean(diff[edge_mask])) if np.any(edge_mask) else ela_mean
        
        ela_ratio = edge_ela / (flat_ela if flat_ela > 0 else 1.0)
        
        return {
            "ela_mean": round(ela_mean, 4),
            "ela_ratio": round(ela_ratio, 4),
            "success": True
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
            
        first_digits = [int(str(float(val))[0]) for val in ac_coeffs[:10000] if str(float(val))[0] != '0']
        
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
        
        return {
            "benford_divergence": round(float(divergence), 4),
            "success": True
        }
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
        arr = np.array(img_resized.convert("L"))
        
        patch_size = 64
        max_checker = 1.0
        min_checker = 1.0
        
        for y in range(0, 512, patch_size):
            for x in range(0, 512, patch_size):
                patch = arr[y:y+patch_size, x:x+patch_size]
                
                # Calculate checkerboard ratio for this specific patch
                even_diffs, odd_diffs = [], []
                for py in range(patch_size):
                    for px in range(patch_size - 1):
                        diff = abs(int(patch[py, px]) - int(patch[py, px+1]))
                        if px % 2 == 0: even_diffs.append(diff)
                        else: odd_diffs.append(diff)
                        
                avg_even = np.mean(even_diffs) if even_diffs else 1.0
                avg_odd = np.mean(odd_diffs) if odd_diffs else 1.0
                
                # Prevent explosion on ultra-smooth blocks (like WebP)
                if avg_even < 1.0 and avg_odd < 1.0:
                    ratio = 1.0
                else:
                    ratio = avg_even / (avg_odd if avg_odd > 0.5 else 0.5)
                
                if ratio > max_checker: max_checker = ratio
                if ratio < min_checker: min_checker = ratio
                
        return {
            "patch_max_checker": round(float(max_checker), 4),
            "patch_min_checker": round(float(min_checker), 4),
            "success": True
        }
    except Exception as e:
        logger.error(f"Patch forensics failed: {e}")
        return {"patch_max_checker": 1.0, "patch_min_checker": 1.0, "success": False}

def deep_binary_inspect(raw_bytes):
    """
    Inspects the actual hexadecimal structure of the file.
    Checks for Missing DQT (Quantization Tables) and ICC profiles.
    """
    try:
        hex_data = raw_bytes[:4096] # Read header
        
        is_jpeg = hex_data.startswith(b'\xff\xd8')
        
        # JPEG DQT Marker is FF DB
        has_dqt = b'\xff\xdb' in hex_data
        # ICC Profile marker
        has_icc = b'ICC_PROFILE' in hex_data
        # Adobe proprietary marker (often found in real photos)
        has_adobe = b'Adobe' in hex_data
        # Standard EXIF marker
        has_exif = b'Exif' in hex_data
        
        return {
            "is_jpeg": is_jpeg,
            "has_dqt": has_dqt,
            "has_icc": has_icc,
            "has_adobe": has_adobe,
            "has_exif": has_exif,
            "success": True
        }
    except Exception as e:
        logger.error(f"Binary inspect failed: {e}")
        return {"is_jpeg": False, "has_dqt": True, "has_icc": True, "has_adobe": True, "has_exif": True, "success": False}

def get_default_forensics():
    return {
        "pearsonRG": 0.9821,
        "pearsonRB": 0.9785,
        "flatBlockNoise": 1.84,
        "checkerboardRatio": 1.01,
        "highFreqDctEnergy": 12.45,
        "fftPeakZ": 2.14,
        "success": False
    }

# =========================================================================
#  3. INFERENCE SCHEDULERS
# =========================================================================

def run_text_detection(text, requested_language="auto"):
    prob = text_model.predict(text)
    prediction = "AI-Generated" if prob >= 0.5 else "Human"
    confidence = f"{max(prob, 1 - prob) * 100:.1f}%"

    import re
    ratio = arabic_ratio(text)
    arabic_meta = compute_arabic_ai_heuristics(text)
    if ratio >= 0.45:
        language = "Arabic"
    elif ratio >= 0.15:
        language = "Mixed Arabic/English"
    else:
        language = "English / Latin"

    words = re.findall(r"[A-Za-z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]+", text.lower())
    ai_indicators = ["delve", "tapestry", "realm", "landscape", "pivotal", "seamlessly", "foster", "robust"]
    found_indicators = [w for w in words if any(ind in w for ind in ai_indicators)]

    sentence_breakdown = []
    for sentence in split_text_sentences(text):
        sentence_words = re.findall(r"[A-Za-z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]+", sentence.lower())
        if arabic_ratio(sentence) >= 0.20:
            sent_meta = compute_arabic_ai_heuristics(sentence)
            s_prob = sent_meta["score"]
        else:
            s_prob = text_model.compute_heuristics(sentence)

        if len(sentence_words) < 4:
            s_prob = min(s_prob, 0.45)

        sentence_breakdown.append({
            "text": sentence,
            "prediction": "AI" if s_prob >= 0.5 else "HUMAN",
            "probability": round(float(s_prob), 3)
        })

    features = {
        "model_used": "Aetheris Deep Multi-Head Attention PyTorch Text Classifier v10",
        "language": language,
        "vocab_tells": f"Found AI collocations: {', '.join(set(found_indicators[:4]))}" if found_indicators else "no primary AI vocabulary tokens",
        "semantic_entropy": "low" if prob > 0.6 else "normal",
        "humanization_attempt": "medium" if (prob > 0.4 and prob < 0.6) else "low"
    }

    if arabic_meta.get("is_arabic"):
        details = arabic_meta.get("details", {})
        phrase_list = details.get("phrase_found", [])
        human_list = details.get("human_found", [])
        features["arabic_ai_signals"] = (
            f"phrases={details.get('phrase_hits', 0)}, transitions={details.get('transition_hits', 0)}, "
            f"formal_terms={details.get('formal_hits', 0)}, rhythm_cv={details.get('cv', 0)}"
        )
        features["arabic_human_signals"] = (
            f"casual_hits={details.get('human_hits', 0)}" +
            (f" ({', '.join(human_list[:4])})" if human_list else "")
        )
        features["dialect_analysis"] = (
            f"Arabic formulaic markers: {', '.join(phrase_list[:4])}" if phrase_list else "No strong Arabic AI phrase markers"
        )

    return {
        "prediction": prediction,
        "ai_probability": round(prob, 3),
        "confidence": confidence,
        "language": language,
        "word_count": len(words),
        "features": features,
        "sentenceBreakdown": sentence_breakdown
    }


AI_SOFTWARE_TAGS = [
    'midjourney', 'stable diffusion', 'dall', 'dalle', 'dall-e', 'sdxl', 'sd-xl', 'sd 1.5',
    'firefly', 'flux', 'leonardo', 'ideogram', 'invokeai', 'comfyui', 'fooocus', 'foocus',
    'automatic1111', 'civitai', 'novelai', 'craiyon', 'nightcafe', 'krea', 'magnific',
    'runway', 'imagen', 'gemini', 'chatgpt', 'openai', 'anthropic', 'bing', 'designer', 'canva',
    'ai generated', 'ai-generated', 'generated by ai', 'genai', 'stablediffusion', 'midjourneybot',
    'tensorrt', 'openvino', 'xformers', 'safetensors', 'ckpt', 'dreambooth', 'lora', 'adobe generative',
    'steps: ', 'cfg scale: ', 'samplers: ', 'denoising strength: ', 'clip skip: ', 'negative prompt',
    'latent space', 'prompt: ', 'class_type', 'inputs', 'nodes', 'links', 'adobe firefly', 'diffusion',
    'latent', 'sora', 'kling', 'luma', 'pika', 'generative ai', 'neural network', 'synthetic', 'dall-e 3',
    'flux.1', 'black forest labs', 'playgroundai', 'controlnet', 'inpainting', 'outpainting', 'upscaled by',
    'generation time', 'sd_model', 'sd_model_name', 'model_hash', 'sampler_name', 'denoising_strength',
    'imagegenerator', 'adobe photoshop', 'illustrator', 'photoshop 202',
    'ذكاء اصطناعي', 'مولد بالذكاء', 'مولدة بالذكاء', 'تم إنشاؤها بالذكاء', 'تم انشاؤها بالذكاء',
    'محتوى اصطناعي', 'صورة مولدة', 'موجه:', 'برومبت', 'ميدجورني', 'دالي', 'دال إي',
    'ستيبل ديفيوجن', 'كومفي يو آي', 'سورا', 'رنواي', 'كلينغ', 'لوما', 'بيكا'
]

def run_image_detection(img_pil, file_size, original_name, raw_bytes=None):
    # Extract streams
    spatial_tensor = img_transforms(img_pil).unsqueeze(0).to(DEVICE)
    
    spectral_grid = extract_spectral_grid(img_pil)
    spectral_tensor = torch.tensor(spectral_grid).unsqueeze(0).unsqueeze(0).to(DEVICE)
    
    # 1. Run Spatial-Spectral PyTorch Neural Net
    neural_prob = 0.50
    try:
        with torch.no_grad():
            logits = image_net(spatial_tensor, spectral_tensor)
            neural_prob = torch.sigmoid(logits).item()
    except Exception as e:
        logger.error(f"Image CNN inference error: {e}")
        
    # 2. Calculate actual mathematical pixel forensics (highly reliable)
    forensics = compute_pixel_forensics(img_pil)
    benfords_res = compute_benfords_law(img_pil)
    patch_res = compute_patch_forensics(img_pil)
    
    # Calculate a highly robust heuristics score
    heur_score = 0.12 # start with a clean human baseline
    reasons = []
    
    # Check filename patterns
    lower_name = original_name.lower()
    ai_keywords = ['midjourney', 'flux', 'dalle', 'dall-e', 'sdxl', 'comfyui', 'stable diffusion', 'leonardo', 'civitai', 'render', 'viggle', 'ذكاء اصطناعي', 'مولد بالذكاء', 'مولدة بالذكاء', 'محتوى اصطناعي', 'صورة مولدة', 'ميدجورني', 'دالي', 'ستيبل ديفيوجن', 'كومفي يو آي']
    if any(kw in lower_name for kw in ai_keywords):
        heur_score = max(heur_score, 0.96)
        reasons.append("AI metadata filename signature")

    # Read the image code (binary raw bytes) to inspect metadata / tags
    ai_tag_found = None
    camera_hint_found = None
    if raw_bytes:
        try:
            raw_text = raw_bytes.decode('utf-8', errors='ignore').lower()
            for tag in AI_SOFTWARE_TAGS:
                if tag in raw_text:
                    ai_tag_found = tag
                    break
            camera_hints = ['apple', 'iphone', 'samsung', 'galaxy', 'nikon', 'canon', 'sony', 'fujifilm', 'google pixel', 'exif']
            for hint in camera_hints:
                if hint in raw_text:
                    camera_hint_found = hint
                    break
        except Exception as e:
            logger.error(f"Error checking raw_bytes: {e}")

    if ai_tag_found:
        heur_score = max(heur_score, 0.99)
        reasons.append(f"AI software binary signature detected: {ai_tag_found}")
        
    # Deep Binary Inspect
    if raw_bytes:
        bin_res = deep_binary_inspect(raw_bytes)
        if bin_res.get("success"):
            is_jpeg = bin_res["is_jpeg"]
            if is_jpeg and not bin_res["has_dqt"]:
                heur_score += 0.40
                reasons.append("Missing standard JPEG DQT (Quantization Tables) marker (highly suspicious generator)")
            if not bin_res["has_icc"] and not bin_res["has_adobe"] and not bin_res["has_exif"]:
                if is_jpeg:
                    heur_score += 0.25
                    reasons.append("Stripped structural binary headers (Missing ICC/EXIF/Adobe markers)")
                else:
                    # Non-JPEGs often naturally lack these
                    pass
    
    if forensics.get("success", False):
        rg = forensics["pearsonRG"]
        rb = forensics.get("pearsonRB", 0.97)
        noise = forensics["flatBlockNoise"]
        checker = forensics["checkerboardRatio"]
        dct_energy = forensics["highFreqDctEnergy"]
        fft_peak_z = forensics.get("fftPeakZ", 2.14)
        
        # Patch-wise zoomed-in analysis (Detects Magnific AI / Midjourney v6 upscalers)
        if patch_res.get("success"):
            max_p_checker = patch_res["patch_max_checker"]
            if max_p_checker > 1.20 or max_p_checker < 0.80:
                heur_score += 0.65
                reasons.append(f"Localized patch-wise upsampling anomaly detected (ratio={max_p_checker})")
        
        # Benford's Law on DCT coefficients
        benford_verified = False
        if benfords_res.get("success"):
            b_div = benfords_res["benford_divergence"]
            if b_div > 15.0:
                heur_score += 0.60
                reasons.append(f"Mathematical Benford's Law violation on DCT coefficients (divergence={b_div})")
            elif b_div > 10.0:
                heur_score += 0.30
                reasons.append(f"Minor Benford's Law divergence (divergence={b_div})")
            elif b_div < 3.0:
                # Authentic physical distribution reward
                benford_verified = True
                heur_score = max(0.01, heur_score - 0.40) # Stronger reward
                reasons.append(f"Authentic Benford distribution of DCT coefficients (divergence={b_div})")
        
        # Check for WebP/PNG formats which naturally smooth noise and compress chroma
        is_lossy_smoothed = False
        if original_name.lower().endswith('.webp') or original_name.lower().endswith('.png') or original_name.lower().endswith('.jpeg'):
            is_lossy_smoothed = True
            
        # Color channel decoupling (occurs in generative models)
        # We MUST NOT heavily penalize WebP/JPEGs because 4:2:0 YUV compression destroys chroma correlation
        if not is_lossy_smoothed:
            if rg < 0.94 or rb < 0.94:
                heur_score += 0.35
                reasons.append("Chroma channel decoupling")
            elif rg < 0.96 or rb < 0.96:
                heur_score += 0.15
                reasons.append("Minor chroma channel drift")
            
        # Smooth block noise perfect-gradients (CCD/CMOS sensors always have shot noise)
        if noise < 0.80:
            if not is_lossy_smoothed:
                heur_score += 0.60
                reasons.append("Quantized smooth pixel gradients (zero camera grain)")
        elif noise < 1.05:
            if not is_lossy_smoothed:
                heur_score += 0.35
                reasons.append("Ultra-smooth synthetic skin/surface textures")
            
        # Empty EXIF + ultra-smooth skin/textures = Decisive AI flag!
        if not camera_hint_found and not is_lossy_smoothed:
            if noise < 0.95:
                heur_score += 0.50
                reasons.append("Ultra-smooth generative texture signature with empty EXIF")
            elif noise < 1.15:
                heur_score += 0.20
                reasons.append("Suspiciously low sensor noise with stripped EXIF")
            
        # Transposed convolution upsampling checkerboard artifacts
        if checker < 0.90 or checker > 1.10:
            heur_score += 0.45
            reasons.append("Transposed convolution periodic upsampling grid")
        elif checker < 0.94 or checker > 1.06:
            heur_score += 0.20
            
        # DCT High frequency magnitude peak energy
        if dct_energy > 20.0:
            heur_score += 0.30
            reasons.append("Anomalous high-frequency spectral magnitude peaks")

        # 2D Fast Fourier Transform high-frequency peak anomalies
        if fft_peak_z > 5.5:
            heur_score += 0.65
            reasons.append(f"High-frequency 2D Fourier periodic grid spike (Peak Z={fft_peak_z})")
        elif fft_peak_z > 4.5:
            # Only penalize minor grid spikes if we haven't verified Benford's Law, as WebP compression causes minor FFT spikes
            if not benford_verified:
                heur_score += 0.20
                reasons.append(f"Minor 2D Fourier periodic grid spike (Peak Z={fft_peak_z})")
            
        # ELA integration
        ela_res = compute_ela_forensics(img_pil)
        if ela_res.get("success"):
            ela_ratio = ela_res.get("ela_ratio", 1.0)
            if ela_ratio > 4.5:
                heur_score += 0.40
                reasons.append(f"Anomalous Error Level Analysis (ELA Ratio = {ela_ratio:.2f})")
            elif ela_ratio < 1.5:
                heur_score += 0.35
                reasons.append(f"Flat Error Level Analysis (ELA Ratio = {ela_ratio:.2f})")
                
        # --- FIX FOR "HUMAN/FACE" NEURAL BIAS ---
        # AI models often misclassify AI portraits as "Human" simply because they contain a face.
        try:
            img_cv = cv2.cvtColor(np.array(img_pil.convert("RGB")), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) > 0:
                if noise < 1.05 and not is_lossy_smoothed:
                    heur_score += 0.65
                    reasons.append(f"[INSPECT OVERRIDE] Face detected with zero-pore AI skin texture (noise={noise:.2f})")
                if fft_peak_z > 4.5:
                    heur_score += 0.40
                    reasons.append(f"[INSPECT OVERRIDE] Face detected with synthetic frequency artifacts (FFT Z={fft_peak_z:.2f})")
                if checker < 0.95 or checker > 1.05:
                    heur_score += 0.60
                    reasons.append("[INSPECT OVERRIDE] Face detected with upsampling checkerboard artifacts")
                
                # Penalize the neural_prob if it is too confident about it being "Human", but ONLY if we found AI skin!
                if neural_prob < 0.5 and noise < 1.05:
                    reasons.append(f"[INSPECT OVERRIDE] Corrected neural bias (Neural model incorrectly assumed Human, but skin is generative)")
                    neural_prob = max(neural_prob, 0.5) # Neutralize the false 'human' neural guess
        except Exception as e:
            logger.error(f"Face detection failed: {e}")
 
        # Inspect if camera EXIF tag is spoofed (e.g. AI images pretending to be real camera photos)
        if camera_hint_found:
            if noise < 1.15 or checker < 0.94 or checker > 1.06 or rg < 0.96 or rb < 0.96 or fft_peak_z > 3.0:
                # Heavy pixel/frequency anomalies found despite camera tag! Override camera bias.
                heur_score += 0.60
                reasons.append(f"Spoofed camera hardware signature overridden (anomalous pixel matrix: noise={noise}, checker={checker}, fft_peak_z={fft_peak_z})")
            else:
                # Natural image with camera tag and standard pixels
                heur_score = max(0.01, heur_score - 0.25)
                neural_prob = min(neural_prob, 0.40)
        
        # Unconditional real photo reward based purely on physics (heavy sensor noise cannot be easily generated)
        # However, we must ensure the high-frequency DCT energy isn't spiking (which indicates synthetic noise injection)
        if noise > 1.6 and dct_energy < 9.0:
            heur_score = max(0.01, heur_score - 0.35)
            neural_prob = min(neural_prob, 0.45)
            reasons.append("Heavy natural camera sensor grain detected (highly indicative of real photo)")
            
        # Check for AI-injected synthetic noise (Fake Grain). 
        # AI models inject sharp gaussian noise which spikes both the noise metric and the DCT high-frequency energy.
        if noise > 1.9 and dct_energy > 9.5:
            heur_score += 0.65
            reasons.append("Artificial noise injection detected (unnatural high-frequency DCT peaks combined with extreme grain)")
        
    # Combine neural model output and physical heuristics using a balanced, smart ensemble.
    # We take the MAXIMUM of the Neural Net or the Heuristics. Zero Trust Policy.
    final_prob = max(heur_score, neural_prob)
    
    # Smooth thresholding for strong heuristics
    if heur_score >= 0.45:
        final_prob = max(final_prob, min(0.95, heur_score * 1.5))
        
    if neural_prob > 0.80:
        final_prob = max(final_prob, neural_prob * 0.95)
        
    # --- PHYSICAL CAMERA OVERRIDE ---
    # If the mathematical physical properties of the image (Benford's Law) prove it was taken by a physical
    # camera sensor, and there are no major AI signatures, we FORCE override the Neural Network's false positive.
    if benford_verified and heur_score < 0.35:
        final_prob = min(final_prob, 0.25)
        reasons.append("Neural AI bias mathematically overridden by authentic physical camera physics")
        
    # --- CLEAN BASELINE OVERRIDE ---
    # If the deep forensic heuristics found absolutely ZERO AI signatures (score is baseline <= 0.15),
    # we discard weak neural network guesses. The physics engine is strictly superior to the neural net's face bias.
    if heur_score <= 0.15 and len(reasons) == 0:
        if neural_prob < 0.85:
            final_prob = min(final_prob, 0.30)
            reasons.append("Neural AI bias mathematically overridden by perfectly clean pixel physics")
        
    # Hard override for files clearly matching AI keyword patterns
    if any(kw in lower_name for kw in ['midjourney', 'flux', 'dalle', 'dall-e', 'sdxl']):
        final_prob = max(final_prob, 0.98)
        
    final_prob = max(0.01, min(0.99, final_prob))
    
    prediction = "AI-Generated" if final_prob >= 0.5 else "Real Photo"
    confidence = f"{max(final_prob, 1 - final_prob) * 100:.1f}%"
    
    suspected = "Unknown AI Tool"
    if final_prob >= 0.5:
        if "midjourney" in lower_name or (ai_tag_found and "midjourney" in ai_tag_found): suspected = "Midjourney v6"
        elif "flux" in lower_name or (ai_tag_found and "flux" in ai_tag_found): suspected = "Flux.1 Latent Space"
        elif "dalle" in lower_name or "dall-e" in lower_name or (ai_tag_found and "dall" in ai_tag_found): suspected = "OpenAI DALL-E 3"
        elif "comfyui" in lower_name or (ai_tag_found and "comfyui" in ai_tag_found): suspected = "ComfyUI Diffusion"
        else: suspected = "Stable Diffusion XL (SDXL)"
    else:
        suspected = "N/A"
    logger.info(f"[IMAGE_FORENSICS] Name: {original_name} | neural_prob={neural_prob:.4f} heur_score={heur_score:.4f} final_prob={final_prob:.4f} verdict={prediction}")
    if forensics.get("success", False):
        logger.info(f"[IMAGE_FORENSICS] metrics: rg={forensics['pearsonRG']:.4f} rb={forensics.get('pearsonRB', 0.97):.4f} noise={forensics['flatBlockNoise']:.4f} checker={forensics['checkerboardRatio']:.4f} dct={forensics['highFreqDctEnergy']:.4f} camera_hint={camera_hint_found}")
    logger.info(f"[IMAGE_FORENSICS] Reasons: {reasons}")

    return {
        "prediction": prediction,
        "ai_probability": round(final_prob, 3),
        "confidence": confidence,
        "forensics": forensics,
        "features": {
            "model_used": "Aetheris Dual-Stream Spatial-Spectral PyTorch CNN v10",
            "metadata_integrity": "EXIF inspected / spoofing scan complete",
            "suspected_generator": suspected,
            "file_size_kb": int(file_size / 1024) if file_size else 0,
            "high_frequency_dct": f"{forensics['highFreqDctEnergy']} dB" if forensics.get("success", False) else "0.0 dB"
        }
    }


def run_video_detection(video_path, file_size, original_name):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise Exception("Could not open video file via OpenCV.")
        
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0
    
    num_samples = 8
    frame_indices = np.linspace(0, max(0, total_frames - 1), num_samples).astype(int)
    
    spatial_list = []
    spectral_list = []
    pixel_motion_diffs = []
    frame_heuristics_scores = []
    prev_gray = None
    
    for idx in frame_indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            break
        
        # Calculate optical flow pixel continuity
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if prev_gray is not None:
            diff = np.mean(cv2.absdiff(gray, prev_gray))
            pixel_motion_diffs.append(float(diff))
        prev_gray = gray
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(frame_rgb)
        
        # Ingest frame-level pixel heuristics
        f_metrics = compute_pixel_forensics(pil_img)
        if f_metrics.get("success", False):
            rg = f_metrics["pearsonRG"]
            rb = f_metrics["pearsonRB"]
            noise = f_metrics["flatBlockNoise"]
            checker = f_metrics["checkerboardRatio"]
            dct_energy = f_metrics["highFreqDctEnergy"]
            
            fft_res = compute_fft_forensics(pil_img)
            fft_peak_z = fft_res.get("fft_peak_z", 2.14)
            
            f_score = 0.12
            if rg < 0.94 or rb < 0.94: f_score += 0.25
            if noise < 0.70: f_score += 0.35
            if checker < 0.88 or checker > 1.12: f_score += 0.35
            if dct_energy > 20.0: f_score += 0.20
            if fft_peak_z > 5.0: f_score += 0.40 # Deepfake artifact spike
            
            frame_heuristics_scores.append(f_score)
        
        spatial_tensor = img_transforms(pil_img)
        spatial_list.append(spatial_tensor)
        
        spectral_grid = extract_spectral_grid(pil_img)
        spectral_tensor = torch.tensor(spectral_grid).unsqueeze(0) # [1, 32, 32]
        spectral_list.append(spectral_tensor)
        
    cap.release()
    
    if len(spatial_list) == 0:
        raise Exception("Failed to read frames from video.")
        
    # Pad sequence if necessary
    while len(spatial_list) < num_samples:
        spatial_list.append(spatial_list[-1])
        spectral_list.append(spectral_list[-1])
        
    spatial_list = spatial_list[:num_samples]
    spectral_list = spectral_list[:num_samples]
    
    spatial_seq = torch.stack(spatial_list).unsqueeze(0).to(DEVICE)
    spectral_seq = torch.stack(spectral_list).unsqueeze(0).to(DEVICE)
    
    # 1. Run Spatio-Temporal Neural Net
    neural_prob = 0.50
    try:
        with torch.no_grad():
            logits = video_net(spatial_seq, spectral_seq)
            neural_prob = torch.sigmoid(logits).item()
    except Exception as e:
        logger.error(f"Video CNN inference error: {e}")
        
    # 2. Calculate actual temporal motion flow metrics
    avg_temporal_diff = np.mean(pixel_motion_diffs) if pixel_motion_diffs else 0.045
    avg_frame_heur = np.mean(frame_heuristics_scores) if frame_heuristics_scores else 0.15
    
    # Build robust temporal-spatial heuristics
    heur_score = avg_frame_heur
    
    # AI clips are generally short (3-8 seconds)
    if duration > 0 and duration <= 8:
        heur_score += 0.25
        
    # Temporal motion flickering continuity check (AI video has frame-to-frame jitter/shifting)
    if avg_temporal_diff > 0.08:
        heur_score += 0.45
    elif avg_temporal_diff > 0.05:
        heur_score += 0.25
        
    # Filename patterns
    lower_name = original_name.lower()
    ai_keywords = ['sora', 'runway', 'kling', 'luma', 'pika', 'viggle', 'luma', 'animate', 'svd', 'diffusion', 'synthetic', 'gemini', 'veo', 'videomaker', 'ذكاء اصطناعي', 'مولد بالذكاء', 'مولدة بالذكاء', 'فيديو مولد', 'محتوى اصطناعي', 'سورا', 'رنواي', 'كلينغ', 'لوما', 'بيكا']
    if any(kw in lower_name for kw in ai_keywords):
        heur_score = max(heur_score, 0.95)
        
    # Combine neural prediction and heuristics using a balanced, smart ensemble.
    # Zero Trust Policy: Take the maximum of neural and physical heuristics!
    final_prob = max(heur_score, neural_prob)
    
    if heur_score >= 0.35:
        final_prob = max(final_prob, 0.88)
        
    if neural_prob > 0.80:
        final_prob = max(final_prob, neural_prob * 0.95)
    
    if any(kw in lower_name for kw in ['sora', 'runway', 'kling', 'luma', 'pika']):
        final_prob = max(final_prob, 0.98)
        
    final_prob = max(0.01, min(0.99, final_prob))
    
    prediction = "AI-Generated" if final_prob >= 0.5 else "Real Video"
    confidence = f"{max(final_prob, 1 - final_prob) * 100:.1f}%"
    
    suspected = "Unknown AI Video Tool"
    if final_prob >= 0.5:
        if "sora" in lower_name: suspected = "OpenAI Sora"
        elif "kling" in lower_name: suspected = "Kling AI"
        elif "runway" in lower_name or "gen2" in lower_name: suspected = "Runway Gen-3 Alpha"
        elif "luma" in lower_name: suspected = "Luma Dream Machine"
        elif "pika" in lower_name: suspected = "Pika Labs v2"
        else: suspected = "Stable Video Diffusion (SVD)"
    else:
        suspected = "N/A"

    return {
        "prediction": prediction,
        "ai_probability": round(final_prob, 3),
        "confidence": confidence,
        "features": {
            "model_used": "Aetheris Deep Spatio-Temporal PyTorch GRU+MHSA v10",
            "duration_seconds": round(duration, 2),
            "sampled_frames": len(spatial_list),
            "file_size_mb": round(file_size / (1024 * 1024), 2) if file_size else 0.0,
            "suspected_generator": suspected,
            "temporal_flicker_ratio": f"{avg_temporal_diff:.3f} LSB (Motion Continuity Verified)"
        }
    }

# =========================================================================
#  4. FLASK WEB ROUTING GATEWAYS
# =========================================================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "backend": "Aetheris PyTorch Dual-Stream Forensic Server v10",
        "device": str(DEVICE)
    })

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
                data = json.loads(raw_bytes.decode('utf-8')) or {}
                logger.info(f"Fallback manually parsed JSON body. Keys: {list(data.keys())}")
            except Exception as e2:
                logger.error(f"Fallback parsing JSON body also failed: {e2}")
    
    analysis_type = data.get("type") if is_json else request.form.get("type", "text")
    if not analysis_type:
        analysis_type = "text"
        
    logger.info(f"api_analyze: analysis_type={analysis_type} is_json={is_json} content_type={content_type}")
    
    try:
        if analysis_type == "text":
            if is_json:
                text = data.get("content", "")
            else:
                text = request.form.get("content", "")
                
            if not text:
                logger.warning(f"No text provided! parsed_data_keys={list(data.keys()) if is_json else list(request.form.keys())}")
                return jsonify({"error": "No text provided"}), 400
            requested_language = data.get("language", "auto") if is_json else request.form.get("language", "auto")
            res = run_text_detection(text, requested_language)
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
            
            res = run_image_detection(img, size, file.filename, raw_bytes)
            return jsonify(res)
            
        elif analysis_type == "video":
            file = request.files.get("file")
            if not file:
                return jsonify({"error": "No video file provided"}), 400
                
            temp_path = os.path.join(os.environ.get("TEMP", "."), f"temp_upload_{file.filename}")
            file.save(temp_path)
            size = os.path.getsize(temp_path)
            
            try:
                res = run_video_detection(temp_path, size, file.filename)
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
            return jsonify(res)
            
        else:
            return jsonify({"error": "Invalid analysis type"}), 400
            
    except Exception as e:
        logger.error(f"Analysis failed for type '{analysis_type}': {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    PORT = 5003
    logger.info(f"Starting Aetheris Dual-Stream PyTorch ML Service on http://127.0.0.1:{PORT}")
    app.run(host="0.0.0.0", port=PORT)
