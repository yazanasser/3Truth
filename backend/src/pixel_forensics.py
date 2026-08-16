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


class PRNUSensorPatternAnalyzer(BaseDetector):
    """
    Interpol / ENFSI Forensic Gold Standard: Photo-Response Non-Uniformity (PRNU) & Sensor Pattern Noise.
    Physical CMOS/CCD sensors possess unique hardware silicon noise fingerprints with stationary variance.
    AI diffusion models (Midjourney, DALL-E 3, SDXL, Flux) lack physical sensor PRNU, exhibiting either
    artificially smooth latent residuals or synthetic periodic lattice artifacts.
    """
    def __init__(self):
        super().__init__("PRNU Hardware Sensor Noise Analyzer", "2.0", "image")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"img": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import cv2
        img = preprocessed_data["img"]
        if img is None:
            return {"failed": True, "reason": "No image provided"}

        try:
            arr = np.array(img.convert("RGB")).astype(np.float32)
            if arr.shape[0] < 64 or arr.shape[1] < 64:
                return {"failed": True, "reason": "Image too small"}

            # Convert to luminance
            gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
            
            # High-pass filter to extract high-frequency sensor noise residual (Wiener/Gaussian proxy)
            blurred = cv2.GaussianBlur(gray, (5, 5), 1.2)
            noise_residual = gray - blurred

            # Calculate local block variance across non-flat regions
            h, w = noise_residual.shape
            block_size = 32
            block_variances = []
            
            for y in range(0, h - block_size, block_size):
                for x in range(0, w - block_size, block_size):
                    block = noise_residual[y:y+block_size, x:x+block_size]
                    gray_block = gray[y:y+block_size, x:x+block_size]
                    # Select smooth/flat blocks where texture does not obscure sensor noise
                    if np.std(gray_block) < 30.0:
                        block_variances.append(float(np.var(block)))

            mean_prnu_var = float(np.mean(block_variances)) if block_variances else float(np.var(noise_residual))

            # Cross-channel noise correlation (Physical sensor CFA creates distinct inter-channel noise ratios)
            res_r = arr[:, :, 0] - cv2.GaussianBlur(arr[:, :, 0], (5, 5), 1.2)
            res_g = arr[:, :, 1] - cv2.GaussianBlur(arr[:, :, 1], (5, 5), 1.2)
            res_b = arr[:, :, 2] - cv2.GaussianBlur(arr[:, :, 2], (5, 5), 1.2)

            rg_corr = float(np.corrcoef(res_r.flatten(), res_g.flatten())[0, 1])
            gb_corr = float(np.corrcoef(res_g.flatten(), res_b.flatten())[0, 1])

            return {
                "prnu_variance": round(mean_prnu_var, 4),
                "noise_rg_corr": round(rg_corr, 4),
                "noise_gb_corr": round(gb_corr, 4),
                "valid_blocks": len(block_variances),
                "failed": False
            }
        except Exception as e:
            return {"failed": True, "reason": str(e)}

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        return 1.0 if features.get("valid_blocks", 0) >= 4 else 0.6

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5

        prnu_var = features["prnu_variance"]
        rg = features["noise_rg_corr"]

        score = 0.5
        # Physical camera sensors have authentic PRNU variance (typically 0.65 - 8.0)
        # AI images either have near-zero sensor noise (< 0.25) due to latent sampling, or synthetic noise
        if prnu_var < 0.28:
            score += 0.35  # Strong synthetic/AI indicator (hyper-clean latent generation)
        elif prnu_var > 0.85 and rg > 0.50:
            score -= 0.30  # Strong physical camera sensor noise

        return max(0.05, min(0.95, score))

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class AzimuthalFourierSpectralAnalyzer(BaseDetector):
    """
    DARPA MediFor / Defense Forensics: 2D FFT Radial & Azimuthal Power Spectrum Integration.
    Detects characteristic high-frequency grid artifacts, checkerboard convolution harmonics,
    and unnatural radial energy fall-off produced by Generative Adversarial Networks (GANs)
    and Latent Diffusion Models (LDMs/Flow Matching).
    """
    def __init__(self):
        super().__init__("2D FFT Azimuthal Radial Spectral Analyzer", "2.0", "image")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"img": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import cv2
        img = preprocessed_data["img"]
        if img is None:
            return {"failed": True, "reason": "No image provided"}

        try:
            arr = np.array(img.convert("L")).astype(np.float32)
            h, w = arr.shape
            if h < 128 or w < 128:
                return {"failed": True, "reason": "Image too small for spectral analysis"}

            # Crop or resize center 512x512 for standardized frequency analysis
            crop_size = min(h, w, 512)
            cy, cx = h // 2, w // 2
            patch = arr[cy - crop_size // 2 : cy + crop_size // 2, cx - crop_size // 2 : cx + crop_size // 2]
            
            # Apply Hanning window to eliminate boundary spectral leakage
            window_y = np.hanning(crop_size)
            window_x = np.hanning(crop_size)
            window_2d = np.outer(window_y, window_x)
            windowed = patch * window_2d

            # 2D Fast Fourier Transform
            f_transform = np.fft.fft2(windowed)
            f_shift = np.fft.fftshift(f_transform)
            magnitude_spectrum = np.abs(f_shift) ** 2
            log_spectrum = np.log1p(magnitude_spectrum)

            # Azimuthal Radial Profile Integration
            center_y, center_x = crop_size // 2, crop_size // 2
            y_indices, x_indices = np.indices((crop_size, crop_size))
            r = np.sqrt((x_indices - center_x) ** 2 + (y_indices - center_y) ** 2).astype(np.int32)

            max_radius = crop_size // 2
            radial_bins = np.bincount(r.ravel(), weights=log_spectrum.ravel())[:max_radius]
            radial_counts = np.bincount(r.ravel())[:max_radius]
            radial_profile = radial_bins / np.maximum(radial_counts, 1)

            # Spectral slope: natural images follow power law 1/f^alpha (linear on log-log plot with alpha in 1.8-2.4)
            freqs = np.arange(1, len(radial_profile))
            log_f = np.log(freqs)
            log_p = np.log(np.maximum(radial_profile[1:], 1e-6))

            slope, intercept = np.polyfit(log_f, log_p, 1)
            spectral_alpha = -float(slope)

            # High-frequency spectral peak anomaly (Checkerboard / Upconvolution Grid Z-score)
            hf_spectrum = log_spectrum[crop_size // 4 : 3 * crop_size // 4, crop_size // 4 : 3 * crop_size // 4]
            mean_hf = float(np.mean(hf_spectrum))
            std_hf = float(np.std(hf_spectrum))
            max_peak_z = float((np.max(hf_spectrum) - mean_hf) / max(std_hf, 1e-6))

            return {
                "spectral_decay_alpha": round(spectral_alpha, 4),
                "high_frequency_peak_z": round(max_peak_z, 4),
                "failed": False
            }
        except Exception as e:
            return {"failed": True, "reason": str(e)}

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5

        alpha = features["spectral_decay_alpha"]
        peak_z = features["high_frequency_peak_z"]

        score = 0.5
        # GAN/Diffusion spectral peaks (upsampling grid artifacts) exhibit peak_z > 5.5
        if peak_z > 6.0:
            score += 0.30
        elif peak_z > 4.5:
            score += 0.15

        # Unnatural spectral decay slope: natural optical systems obey 1.6 <= alpha <= 2.6
        if alpha < 1.30 or alpha > 3.10:
            score += 0.20
        elif 1.70 <= alpha <= 2.45:
            score -= 0.15

        return max(0.05, min(0.95, score))

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class BayerDemosaicingCFAAnalyzer(BaseDetector):
    """
    Physical Optical Forensics: Bayer Color Filter Array (CFA) Demosaicing Invariance.
    Physical camera sensors capture light through an RGGB Bayer mosaic, requiring demosaicing
    algorithms (Bilinear, AHD, Malvar) that create micro-scale cross-channel gradient covariance.
    AI image generators synthesize RGB tensors jointly, lacking authentic Bayer demosaicing artifacts.
    """
    def __init__(self):
        super().__init__("Bayer CFA Demosaicing Invariance Analyzer", "2.0", "image")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"img": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import cv2
        img = preprocessed_data["img"]
        if img is None:
            return {"failed": True, "reason": "No image"}

        try:
            arr = np.array(img.convert("RGB")).astype(np.float32)
            h, w, _ = arr.shape
            if h < 64 or w < 64:
                return {"failed": True, "reason": "Image too small"}

            r_channel = arr[:, :, 0]
            g_channel = arr[:, :, 1]
            b_channel = arr[:, :, 2]

            # Compute Laplacian 2nd-order derivatives for Green vs Red/Blue
            lap_g = cv2.Laplacian(g_channel, cv2.CV_32F)
            lap_r = cv2.Laplacian(r_channel, cv2.CV_32F)
            lap_b = cv2.Laplacian(b_channel, cv2.CV_32F)

            # Micro-gradient demosaicing periodicity check (2x2 Bayer grid phase alignment)
            # In genuine Bayer demosaicing, green gradient energy alternates systematically on even/odd lines
            g_even = lap_g[0::2, 0::2]
            g_odd = lap_g[1::2, 1::2]
            
            cfa_phase_ratio = float(np.mean(np.abs(g_even)) / max(np.mean(np.abs(g_odd)), 1e-6))

            # Cross-gradient correlation (Bayer interpolation causes high correlation in high-frequency edges)
            corr_gr = float(np.corrcoef(lap_g.flatten(), lap_r.flatten())[0, 1])
            corr_gb = float(np.corrcoef(lap_g.flatten(), lap_b.flatten())[0, 1])

            return {
                "cfa_phase_ratio": round(cfa_phase_ratio, 4),
                "cfa_gr_corr": round(corr_gr, 4),
                "cfa_gb_corr": round(corr_gb, 4),
                "failed": False
            }
        except Exception as e:
            return {"failed": True, "reason": str(e)}

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        return 0.9

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5

        gr = features["cfa_gr_corr"]
        gb = features["cfa_gb_corr"]
        phase = features["cfa_phase_ratio"]

        score = 0.5
        # In real cameras, demosaicing couples Laplacian gradients: gr and gb are tightly in 0.65 - 0.95
        # AI generators produce disconnected gradient noise or unnaturally uniform correlations (> 0.98 or < 0.40)
        if gr < 0.45 or gb < 0.45:
            score += 0.25  # Missing Bayer CFA coupling
        elif 0.68 <= gr <= 0.92 and 0.68 <= gb <= 0.92 and 0.85 <= phase <= 1.18:
            score -= 0.25  # Genuine physical Bayer demosaicing signature

        return max(0.05, min(0.95, score))

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class BiometricSpecularReflectionAnalyzer(BaseDetector):
    """
    Biometric & Anatomical Forensics: Corneal Specular Light Convergence & Bilateral Eye Reflection.
    AI generated portraits (Midjourney, Flux, Stable Diffusion, FaceSwaps) often fail 3D ray-tracing physics,
    exhibiting divergent corneal light reflection angles or asymmetric pupil geometries.
    """
    def __init__(self):
        super().__init__("Biometric Corneal Specular Reflection Analyzer", "2.0", "image")

    def preprocess(self, input_data: Any, context: dict) -> dict:
        return {"img": input_data}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        import cv2
        img = preprocessed_data["img"]
        if img is None:
            return {"failed": True, "reason": "No image"}

        try:
            arr = np.array(img.convert("RGB"))
            gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
            
            # Simple Haar cascade for face detection
            try:
                cascade_path = getattr(cv2.data, "haarcascades", "") + "haarcascade_frontalface_default.xml"
                face_cascade = cv2.CascadeClassifier(cascade_path) if os.path.exists(cascade_path) else None
                if face_cascade and face_cascade.empty():
                    face_cascade = None
            except Exception:
                face_cascade = None

            faces = []
            if face_cascade is not None:
                try:
                    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(80, 80))
                except Exception:
                    faces = []

            if len(faces) == 0:
                return {"has_face": False, "failed": False}

            x, y, w, h = faces[0]
            face_roi = gray[y:y+h, x:x+w]

            # Eye region heuristic (upper half of the face)
            upper_face = face_roi[int(h*0.2):int(h*0.55), :]
            
            # Specular highlight detection: look for brightest 1% pixels in eye band
            thresh = np.percentile(upper_face, 99.0)
            specular_mask = (upper_face >= thresh).astype(np.uint8)

            # Measure bilateral highlight symmetry
            left_half = specular_mask[:, :w//2]
            right_half = np.fliplr(specular_mask[:, w//2:])

            min_w = min(left_half.shape[1], right_half.shape[1])
            sym_diff = np.mean(np.abs(left_half[:, :min_w] - right_half[:, :min_w]))

            return {
                "has_face": True,
                "specular_symmetry_diff": round(float(sym_diff), 4),
                "failed": False
            }
        except Exception as e:
            return {"failed": True, "reason": str(e)}

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("has_face", False) or features.get("failed"):
            return 0.0
        return 0.85

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("has_face", False) or features.get("failed"):
            return 0.5

        diff = features["specular_symmetry_diff"]
        # AI generated faces often have extreme specular asymmetry (> 0.08) in eye lighting
        if diff > 0.075:
            return 0.80
        elif diff < 0.030:
            return 0.25
        return 0.50

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


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
        noise = features.get("flatBlockNoise", 1.84)
        if noise < 0.2:
            return 0.4
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.5
            
        score_sum = 0.0
        count = 0
        for k in ["lighting_score", "shadow_score", "geometry_score", "texture_score"]:
            if k in features:
                val = features[k]
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
        noise = features.get("flatBlockNoise", 1.84)
        if noise < 0.2:
            return 0.4
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("success", False):
            return 0.5
            
        variance = features.get("multiview_score_variance", 0.0)
        if variance < 0.01:
            return 0.8
        elif variance > 0.10:
            return 0.45
        return 0.4

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class PixelForensicsOrchestrator:
    """
    Orchestrates execution of the multi-layered image forensic ensemble.
    """
    def __init__(self):
        self.detectors = [
            NoiseDomainAnalyzer(),
            CompressionArtifactAnalyzer(),
            FrequencyDomainAnalyzer(),
            PhysicalSceneAnalyzer(),
            MultiviewForensicsAnalyzer(),
            PRNUSensorPatternAnalyzer(),
            AzimuthalFourierSpectralAnalyzer(),
            BayerDemosaicingCFAAnalyzer(),
            BiometricSpecularReflectionAnalyzer()
        ]

    def analyze(self, img_pil, context: Optional[Dict[str, Any]] = None) -> List[DetectionSignal]:
        ctx = context or {}
        signals = []
        
        for det in self.detectors:
            try:
                signal = det.execute(img_pil, ctx)
                if signal.signal_quality is not None and signal.signal_quality > 0.05:
                    signals.append(signal)
            except Exception as e:
                print(f"Failed to execute {det.name}: {e}")
                
        return signals
