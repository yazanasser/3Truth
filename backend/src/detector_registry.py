import time
import logging
import traceback
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Callable

logger = logging.getLogger("detector_registry")


@dataclass
class DetectionSignal:
    detector_name: str
    detector_version: str
    modality: str
    score: float
    confidence: float
    evidence: Dict[str, Any]
    prediction: Optional[Any] = None
    calibrated_probability: Optional[float] = None
    reliability: Optional[float] = None
    signal_quality: Optional[float] = None
    diagnostic_information: Dict[str, Any] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    latency_ms: float = 0.0
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    failed: bool = False
    error_message: Optional[str] = None

    def to_dict(self):
        return asdict(self)


class DetectorRegistry:
    def __init__(self):
        # Format: { 'modality': { 'detector_name': { 'func': Callable, 'metadata': dict, 'enabled': bool } } }
        self._detectors: Dict[str, Dict[str, dict]] = {}

    def register_detector(
        self, name: str, modality: str, func: Callable, metadata: Optional[dict] = None
    ):
        """Register a new detector for a specific modality."""
        if modality not in self._detectors:
            self._detectors[modality] = {}

        self._detectors[modality][name] = {
            "func": func,
            "metadata": metadata or {},
            "enabled": True,
        }
        logger.info(f"Registered detector '{name}' for modality '{modality}'")

    def unregister_detector(self, name: str, modality: Optional[str] = None):
        """Unregister a detector."""
        modalities_to_search = [modality] if modality else list(self._detectors.keys())
        for mod in modalities_to_search:
            if mod in self._detectors and name in self._detectors[mod]:
                del self._detectors[mod][name]
                logger.info(f"Unregistered detector '{name}' from modality '{mod}'")

    def enable_detector(self, name: str, modality: Optional[str] = None):
        """Enable a detector."""
        self._set_detector_state(name, modality, True)

    def disable_detector(self, name: str, modality: Optional[str] = None):
        """Disable a detector."""
        self._set_detector_state(name, modality, False)

    def _set_detector_state(self, name: str, modality: Optional[str], state: bool):
        modalities_to_search = [modality] if modality else list(self._detectors.keys())
        for mod in modalities_to_search:
            if mod in self._detectors and name in self._detectors[mod]:
                self._detectors[mod][name]["enabled"] = state
                state_str = "Enabled" if state else "Disabled"
                logger.info(f"{state_str} detector '{name}' in modality '{mod}'")

    def run_detectors(
        self, modality: str, input_data: Any, context: Optional[dict] = None
    ) -> List[DetectionSignal]:
        """
        Run all enabled detectors for a specific modality.
        Returns a list of DetectionSignals. If a detector fails, it returns a failed DetectionSignal.
        """
        if modality not in self._detectors:
            logger.warning(f"No detectors registered for modality '{modality}'")
            return []

        signals = []
        context = context or {}

        for name, config in self._detectors[modality].items():
            if not config["enabled"]:
                continue

            func = config["func"]
            meta = config["metadata"]

            start_time = time.time()
            try:
                # The detector function must return a DetectionSignal or raise an Exception
                signal_result = func(input_data, context)

                # Support single signal or list of signals
                if not isinstance(signal_result, list):
                    signal_result = [signal_result]

                for signal in signal_result:
                    if not isinstance(signal, DetectionSignal):
                        raise ValueError(
                            f"Detector '{name}' returned invalid type: {type(signal)}"
                        )

                    signal.latency_ms = (time.time() - start_time) * 1000
                    signals.append(signal)

            except Exception as e:
                # Graceful failure handling
                latency = (time.time() - start_time) * 1000
                error_msg = f"{str(e)}\n{traceback.format_exc()}"
                logger.error(f"Detector '{name}' failed for modality '{modality}': {e}")

                failed_signal = DetectionSignal(
                    detector_name=name,
                    detector_version=meta.get("version", "unknown"),
                    modality=modality,
                    score=0.0,
                    confidence=0.0,
                    evidence={},
                    latency_ms=latency,
                    model_name=meta.get("model_name"),
                    model_version=meta.get("model_version"),
                    failed=True,
                    error_message=error_msg,
                )
                signals.append(failed_signal)

        return signals

    def get_detector_metadata(self) -> dict:
        """Returns metadata about all registered detectors."""
        meta = {}
        for mod, detectors in self._detectors.items():
            meta[mod] = {}
            for name, config in detectors.items():
                meta[mod][name] = {
                    "metadata": config["metadata"],
                    "enabled": config["enabled"],
                }
        return meta
