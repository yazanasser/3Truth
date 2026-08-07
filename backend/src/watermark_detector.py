import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from detector_registry import DetectionSignal  # type: ignore

logger = logging.getLogger("watermark_detector")


class WatermarkDetector(ABC):
    """
    Abstract base class for all watermark detection plugins.
    """

    @abstractmethod
    def get_supported_modalities(self) -> List[str]:
        """
        Returns a list of supported modalities, e.g., ["text", "image", "video", "audio"]
        """
        pass

    @abstractmethod
    def detect(self, data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs the watermark detection algorithm.
        Must return a strict JSON dictionary:
        {
          "detected": bool,
          "technology": str | None,
          "provider": str | None,
          "confidence": float,
          "evidence": dict,
          "robustness": dict
        }
        """
        pass


class WatermarkRegistry:
    """
    Registry for managing watermark detection plugins.
    """

    def __init__(self):
        self.plugins: List[WatermarkDetector] = []

    def register(self, plugin: WatermarkDetector):
        """Register a watermark plugin."""
        self.plugins.append(plugin)
        logger.info(f"Registered watermark plugin: {plugin.__class__.__name__}")

    def clear(self):
        """Clear all registered plugins (mostly for testing)."""
        self.plugins = []

    def run_all(
        self, modality: str, data: Dict[str, Any], context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Run all applicable watermark plugins for a given modality.
        """
        results = []
        for plugin in self.plugins:
            if modality in plugin.get_supported_modalities():
                try:
                    res = plugin.detect(data, context)
                    # Validate schema loosely
                    if not isinstance(res, dict) or "detected" not in res:
                        raise ValueError("Plugin returned invalid schema.")
                    results.append(res)
                except Exception as e:
                    logger.error(
                        f"Watermark plugin {plugin.__class__.__name__} failed: {e}"
                    )
                    results.append(
                        {
                            "detected": False,
                            "technology": plugin.__class__.__name__,
                            "provider": "Unknown",
                            "confidence": 0.0,
                            "evidence": {"error": str(e)},
                            "robustness": {},
                        }
                    )
        return results


# Shared global watermark registry
watermark_registry = WatermarkRegistry()


def watermark_detector_wrapper(
    data: Dict[str, Any], context: Dict[str, Any], modality: str
) -> DetectionSignal:
    """
    Wrapper to integrate the watermark subsystem into the main DetectorRegistry.
    """
    results = watermark_registry.run_all(modality, data, context)

    # A watermark being detected by any plugin is strong evidence of AI generation.
    # If no watermark is detected, it is NOT proof of human content (score 0).
    detected = any(r.get("detected", False) for r in results)

    score = 0.0
    confidence = 0.0

    if detected:
        score = 1.0
        # Confidence is the maximum confidence among all positively detected watermarks
        confidence = max(
            [r.get("confidence", 0.0) for r in results if r.get("detected")],
            default=0.0,
        )

    return DetectionSignal(
        detector_name="AI_Watermark_Detector",
        detector_version="1.0",
        modality=modality,
        score=score,
        confidence=confidence,
        evidence={"watermarks": results},
    )
