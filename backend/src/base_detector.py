import time
import traceback
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

# We assume it will run in the same directory as detector_registry
from detector_registry import DetectionSignal

logger = logging.getLogger("base_detector")

class BaseDetector(ABC):
    """
    Modular detector interface enforcing separation of concerns.
    """
    def __init__(self, name: str, version: str, modality: str, model_name: Optional[str] = None, model_version: Optional[str] = None):
        self.name = name
        self.version = version
        self.modality = modality
        self.model_name = model_name
        self.model_version = model_version

    @abstractmethod
    def preprocess(self, input_data: Any, context: dict) -> Any:
        """Normalize and preprocess raw input."""
        pass

    @abstractmethod
    def extract_features(self, preprocessed_data: Any, context: dict) -> Any:
        """Extract features/embeddings from preprocessed data."""
        pass

    @abstractmethod
    def predict_raw(self, features: Any, context: dict) -> float:
        """Run the core detection logic and return a raw score (uncalibrated probability or logit)."""
        pass

    @abstractmethod
    def calibrate(self, raw_score: float, context: dict) -> float:
        """Apply calibration (e.g., Platt scaling, Isotonic regression) to the raw score."""
        pass

    @abstractmethod
    def evaluate_signal_quality(self, features: Any, context: dict) -> float:
        """Evaluate the quality/reliability of the extracted signal (0.0 to 1.0)."""
        pass

    def get_evidence(self, features: Any, context: dict) -> Dict[str, Any]:
        """Optional override to extract evidence for the final signal."""
        return features if isinstance(features, dict) else {}
        
    def get_diagnostics(self, features: Any, context: dict) -> Dict[str, Any]:
        """Optional override to extract diagnostic info."""
        return context.get('diagnostics', {})

    def execute(self, input_data: Any, context: Optional[dict] = None) -> DetectionSignal:
        """
        Orchestrates the detector pipeline and catches failures cleanly.
        """
        context = context or {}
        start_time = time.time()
        
        try:
            preprocessed = self.preprocess(input_data, context)
            features = self.extract_features(preprocessed, context)
            raw_score = self.predict_raw(features, context)
            calibrated = self.calibrate(raw_score, context)
            signal_quality = self.evaluate_signal_quality(features, context)
            
            evidence = self.get_evidence(features, context)
            diagnostics = self.get_diagnostics(features, context)
            
            # Record timing
            latency_ms = (time.time() - start_time) * 1000.0
            
            return DetectionSignal(
                detector_name=self.name,
                detector_version=self.version,
                modality=self.modality,
                score=raw_score,
                confidence=signal_quality,  # using quality as legacy confidence mapping
                evidence=evidence,
                prediction=calibrated,
                calibrated_probability=calibrated,
                reliability=signal_quality,
                signal_quality=signal_quality,
                diagnostic_information=diagnostics,
                latency_ms=latency_ms,
                model_name=self.model_name,
                model_version=self.model_version
            )
            
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000.0
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            logger.error(f"Detector '{self.name}' failed during execute: {e}")
            
            return DetectionSignal(
                detector_name=self.name,
                detector_version=self.version,
                modality=self.modality,
                score=0.0,
                confidence=0.0,
                evidence={},
                failed=True,
                error_message=error_msg,
                latency_ms=latency_ms,
                model_name=self.model_name,
                model_version=self.model_version,
                prediction=None,
                calibrated_probability=None,
                reliability=0.0,
                signal_quality=0.0,
                diagnostic_information={'error': str(e)}
            )
