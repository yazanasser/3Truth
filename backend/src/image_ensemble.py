"""Region-aware image analysis helpers.

The functions here are deliberately model-agnostic. They create multiple views of
an image and measure whether an existing vision detector remains directionally
stable. Instability is uncertainty, not proof of manipulation.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Sequence, Tuple

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


View = Tuple[str, Image.Image]


def generate_views(image: Image.Image) -> List[View]:
    image = image.convert("RGB")
    width, height = image.size
    views: List[View] = [("original", image)]

    # Center crop, quadrants and a mild resize are useful because AI edits may be
    # localized and because a global image classifier can hide small manipulated areas.
    crop = min(width, height)
    if crop >= 128:
        left = (width - crop) // 2
        top = (height - crop) // 2
        views.append(("center_crop", image.crop((left, top, left + crop, top + crop))))

    if width >= 256 and height >= 256:
        boxes = {
            "top_left": (0, 0, width // 2, height // 2),
            "top_right": (width // 2, 0, width, height // 2),
            "bottom_left": (0, height // 2, width // 2, height),
            "bottom_right": (width // 2, height // 2, width, height),
        }
        for name, box in boxes.items():
            views.append((name, image.crop(box)))

    # Mild transformations should preserve semantics while perturbing fragile
    # classifier artifacts. Large transformations are intentionally avoided.
    views.append(("mild_sharpen", image.filter(ImageFilter.UnsharpMask(radius=1, percent=80, threshold=3))))
    views.append(("mild_contrast", ImageEnhance.Contrast(image).enhance(1.08)))
    return views


def run_region_consistency(
    image: Image.Image,
    predictor: Callable[[Image.Image], float],
    min_views: int = 3,
) -> Dict[str, Any]:
    """Run an existing AI probability function over independent spatial views."""
    outputs: List[Dict[str, Any]] = []
    for name, view in generate_views(image):
        try:
            score = float(predictor(view))
            if not np.isfinite(score):
                continue
            outputs.append({"view": name, "score": float(max(0.0, min(1.0, score)))})
        except Exception as exc:
            outputs.append({"view": name, "error": str(exc)})

    scores = [item["score"] for item in outputs if "score" in item]
    if len(scores) < min_views:
        return {
            "applicable": False,
            "reason": f"Only {len(scores)} usable regional predictions were available.",
            "views": outputs,
        }

    mean = float(np.mean(scores))
    std = float(np.std(scores))
    median = float(np.median(scores))
    q1, q3 = np.percentile(scores, [25, 75])
    iqr = float(q3 - q1)

    # Consistency is high when independent regions agree. It is not a correctness score.
    consistency = float(max(0.0, min(1.0, 1.0 - std / 0.30)))
    return {
        "applicable": True,
        "views": outputs,
        "mean_probability": mean,
        "median_probability": median,
        "std_probability": std,
        "iqr_probability": iqr,
        "consistency": consistency,
        "localized_disagreement": bool(iqr > 0.35 or std > 0.22),
    }
