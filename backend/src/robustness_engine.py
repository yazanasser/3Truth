"""Transformation-aware quality and robustness analysis.

This module deliberately does not call transformations evidence of AI generation.
It measures whether common post-processing operations have degraded forensic
signals, so the decision engine can reduce confidence instead of over-interpreting
artifacts introduced by the transformation itself.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from io import BytesIO
from typing import Any, Dict, Iterable, List

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance


@dataclass
class RobustnessReport:
    transformations_detected: List[str]
    forensic_quality: float
    metadata_available: bool
    recompression_suspected: bool
    screenshot_like: bool
    resize_or_crop_suspected: bool
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _jpeg_roundtrip_delta(image: Image.Image, quality: int) -> float:
    """Measure image change after a controlled JPEG round trip."""
    source = image.convert("RGB")
    buffer = BytesIO()
    source.save(buffer, format="JPEG", quality=quality, optimize=False)
    buffer.seek(0)
    roundtrip = Image.open(buffer).convert("RGB")
    a = np.asarray(source, dtype=np.float32)
    b = np.asarray(roundtrip, dtype=np.float32)
    return float(np.mean(np.abs(a - b)))


def analyze_image_robustness(image: Image.Image, raw_bytes: bytes | None = None) -> Dict[str, Any]:
    """Return quality flags that should gate forensic confidence.

    This is intentionally conservative. A screenshot, crop, resize, blur, or
    recompression can happen to both human and synthetic media, so none of these
    observations is an AI verdict.
    """
    warnings: List[str] = []
    transformations: List[str] = []
    image = image.convert("RGB")
    width, height = image.size

    metadata_available = bool(raw_bytes and len(raw_bytes) > 64)
    if not metadata_available:
        warnings.append("Container metadata is unavailable or stripped; provenance confidence is reduced.")

    # Small dimensions and extreme aspect ratios are common after social-media
    # resizing/cropping and screenshots. They reduce high-frequency forensic value.
    screenshot_like = width < 900 and height < 900
    resize_or_crop_suspected = width < 512 or height < 512
    if resize_or_crop_suspected:
        transformations.append("small_or_downscaled")
        warnings.append("Small dimensions limit pixel/frequency forensic reliability.")

    try:
        delta_95 = _jpeg_roundtrip_delta(image, 95)
        delta_55 = _jpeg_roundtrip_delta(image, 55)
    except Exception:
        delta_95 = delta_55 = 0.0

    # A low-quality JPEG round trip causing a large change indicates that the
    # current file is already near a lossy compression boundary. This is a
    # reliability flag, not an AI indicator.
    recompression_suspected = delta_95 > 1.5 or delta_55 > 4.0
    if recompression_suspected:
        transformations.append("lossy_recompression")
        warnings.append("Lossy compression may have destroyed or introduced forensic artifacts.")

    # Estimate clipping and smoothness. Both can be introduced by camera pipelines,
    # HDR, screenshots, denoising, or AI generation; therefore they only affect quality.
    arr = np.asarray(image, dtype=np.float32)
    clipped_fraction = float(np.mean((arr <= 1.0) | (arr >= 254.0)))
    grayscale = np.mean(arr, axis=2)
    smoothness = float(np.mean(np.abs(np.diff(grayscale, axis=0)))) if height > 1 else 0.0
    smoothness += float(np.mean(np.abs(np.diff(grayscale, axis=1)))) if width > 1 else 0.0
    smoothness *= 0.5

    if clipped_fraction > 0.08:
        warnings.append("Substantial pixel clipping detected; highlight/shadow forensic features may be unreliable.")

    quality = 1.0
    if resize_or_crop_suspected:
        quality *= 0.65
    if recompression_suspected:
        quality *= 0.70
    if clipped_fraction > 0.08:
        quality *= 0.85
    if smoothness < 1.5:
        quality *= 0.80
        warnings.append("Very smooth pixel structure detected; this may reflect denoising, blur, screenshot scaling, or synthesis.")

    report = RobustnessReport(
        transformations_detected=transformations,
        forensic_quality=float(max(0.10, min(1.0, quality))),
        metadata_available=metadata_available,
        recompression_suspected=recompression_suspected,
        screenshot_like=screenshot_like,
        resize_or_crop_suspected=resize_or_crop_suspected,
        warnings=warnings,
    )
    return report.to_dict()
