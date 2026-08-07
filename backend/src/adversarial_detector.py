import abc
from typing import Any, Dict, List, Optional
import numpy as np
from detector_registry import DetectionSignal  # type: ignore


class TextTransformationAnalyzer:
    def analyze(self, text: str) -> Dict[str, Any]:
        # Mock logic for text transformations
        return {
            "paraphrasing_detected": False,
            "translation_artifacts": 0.1,
            "synonym_replacement_rate": 0.05,
            "sentence_restructuring": False,
            "ai_rewriting_signature": 0.15,
            "humanization_prompt_traces": False,
            "grammar_modification_anomalies": 0.2,
        }


class ImageTransformationAnalyzer:
    def analyze(self, input_data: Any) -> Dict[str, Any]:
        # Mock logic for image transformations
        return {
            "crop_detected": False,
            "resize_detected": False,
            "screenshot_artifacts": 0.05,
            "jpeg_compression_count": 1,
            "filtering_detected": False,
            "sharpening_artifacts": 0.1,
            "blur_signature": 0.0,
            "color_space_changes": False,
            "metadata_stripping": True,
        }


class VideoTransformationAnalyzer:
    def analyze(self, input_data: Any) -> Dict[str, Any]:
        # Mock logic for video transformations
        return {
            "re_encoding_detected": True,
            "frame_dropping_ratio": 0.02,
            "frame_interpolation_artifacts": 0.1,
            "resizing_detected": False,
            "cropping_detected": False,
            "compression_artifacts": 0.4,
            "filtering_detected": False,
        }


class DisagreementTracker:
    def evaluate(self, signals: List[DetectionSignal]) -> Dict[str, Any]:
        if not signals:
            return {"flag": "NONE", "confidence_penalty": 0.0, "details": "No signals"}

        scores = [s.score for s in signals if not s.failed and s.confidence > 0.5]
        if len(scores) < 2:
            return {
                "flag": "NONE",
                "confidence_penalty": 0.0,
                "details": "Insufficient confident signals",
            }

        variance = float(np.var(scores))
        max_score = max(scores)
        min_score = min(scores)

        # If one detector strongly says AI (>0.85) and another says Human (<0.2)
        if max_score > 0.85 and min_score < 0.2:
            return {
                "flag": "HIGH_MODEL_DISAGREEMENT",
                "confidence_penalty": 0.4,
                "details": f"Strong contradiction detected (max: {max_score:.2f}, min: {min_score:.2f})",
            }

        if variance > 0.1:
            return {
                "flag": "HIGH_MODEL_DISAGREEMENT",
                "confidence_penalty": 0.25,
                "details": f"High variance across models (var: {variance:.3f})",
            }

        return {
            "flag": "CONSISTENT",
            "confidence_penalty": 0.0,
            "details": "Models agree",
        }


class TransformationGraphBuilder:
    def build_graph(
        self, modality: str, transformation_evidence: Dict[str, Any]
    ) -> Dict[str, Any]:
        # Conceptual representation
        has_transformation = any(
            v is True or (isinstance(v, (int, float)) and v > 0.6)
            for k, v in transformation_evidence.items()
            if isinstance(v, (bool, int, float))
        )

        graph = {"nodes": ["ORIGINAL"], "edges": []}

        graph["nodes"].append("AI GENERATION")
        graph["edges"].append("ORIGINAL -> AI GENERATION")

        if has_transformation:
            graph["nodes"].append("TRANSFORMATION")
            graph["edges"].append("AI GENERATION -> TRANSFORMATION")
            graph["nodes"].append("UPLOADED CONTENT")
            graph["edges"].append("TRANSFORMATION -> UPLOADED CONTENT")
        else:
            graph["nodes"].append("UPLOADED CONTENT")
            graph["edges"].append("AI GENERATION -> UPLOADED CONTENT")

        return graph


def run_adversarial_analysis(
    modality: str,
    input_data: Any,
    signals: List[DetectionSignal],
    context: Optional[Dict[str, Any]] = None,
) -> List[DetectionSignal]:
    """
    Runs meta-analysis on the extracted signals and raw input, producing adversarial meta-signals.
    These signals do NOT dictate the final verdict. They append transformation evidence and disagreement
    tracking to be handled by the fusion engine.
    """
    new_signals = []

    # 1. Disagreement Tracking
    tracker = DisagreementTracker()
    disagreement_evidence = tracker.evaluate(signals)

    new_signals.append(
        DetectionSignal(
            detector_name="Adversarial Disagreement Tracker",
            detector_version="1.0",
            modality="meta",
            score=0.0,
            confidence=1.0,
            evidence=disagreement_evidence,
            warnings=(
                [disagreement_evidence["flag"]]
                if disagreement_evidence["flag"] != "CONSISTENT"
                else []
            ),
            latency_ms=5.0,
            model_name="meta_tracker",
            model_version="1.0",
        )
    )

    # 2. Transformation Analysis
    trans_evidence = {}
    if modality == "text":
        trans_evidence = TextTransformationAnalyzer().analyze(input_data)
    elif modality == "image":
        trans_evidence = ImageTransformationAnalyzer().analyze(input_data)
    elif modality == "video":
        trans_evidence = VideoTransformationAnalyzer().analyze(input_data)

    # 3. Transformation Graph
    graph = TransformationGraphBuilder().build_graph(modality, trans_evidence)
    trans_evidence["transformation_graph"] = graph

    # Transformation detection doesn't mean AI. Score represents probability of transformation.
    trans_score = 0.8 if len(graph["nodes"]) > 3 else 0.1

    new_signals.append(
        DetectionSignal(
            detector_name="Adversarial Transformation Graph",
            detector_version="1.0",
            modality=modality,
            score=trans_score,
            confidence=0.9,
            evidence=trans_evidence,
            warnings=[],
            latency_ms=25.0,
            model_name="adversarial_engine",
            model_version="1.0",
        )
    )

    return new_signals
