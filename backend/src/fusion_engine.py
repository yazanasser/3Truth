import math
from typing import Any, Dict, List
from detector_registry import DetectionSignal  # type: ignore


class EvidenceFusionEngine:
    """
    Central decision engine implementing hierarchical weighting and calibrated evidence fusion.
    """

    def __init__(self):
        # Weight assignments for the Provenance Priority Hierarchy
        self.HIERARCHY_WEIGHTS = {
            "verified_cryptographic_provenance": 10.0,
            "verified_watermark": 8.0,
            "signed_metadata": 6.0,
            "forensic_evidence": 4.0,
            "ml_classifier": 2.0,
            "heuristics": 1.0,
        }

    def _determine_hierarchy_category(self, signal: DetectionSignal) -> str:
        name = signal.detector_name.lower()
        if "c2pa" in name or "provenance" in name:
            return "verified_cryptographic_provenance"
        elif "watermark" in name:
            return "verified_watermark"
        elif "metadata" in name:
            return "signed_metadata"
        elif any(
            k in name
            for k in [
                "pixel",
                "frequency",
                "semantic",
                "optical",
                "temporal",
                "perplexity",
                "entropy",
                "burstiness",
                "sync",
                "forensic",
            ]
        ):
            return "forensic_evidence"
        elif any(
            k in name
            for k in [
                "ensemble",
                "classifier",
                "neural",
                "stylometry",
                "vit",
                "clip",
                "transformer",
            ]
        ):
            return "ml_classifier"
        return "heuristics"

    def fuse(self, signals: List[DetectionSignal]) -> Dict[str, Any]:
        if not signals:
            return self._build_response(
                "INCONCLUSIVE", 0.0, 0.0, "WEAK", [], ["No signals available"], []
            )

        warnings = []
        contradictions = []

        # Extract meta-signals from adversarial detectors
        meta_signals = [s for s in signals if s.modality == "meta"]
        data_signals = [s for s in signals if s.modality != "meta" and not s.failed]

        confidence_penalty = 0.0
        for meta in meta_signals:
            if "Adversarial" in meta.detector_name:
                flag = meta.evidence.get("flag", "NONE")
                if flag == "HIGH_MODEL_DISAGREEMENT":
                    contradictions.append(
                        meta.evidence.get("details", "Models disagreed strongly")
                    )
                    confidence_penalty = max(
                        confidence_penalty, meta.evidence.get("confidence_penalty", 0.0)
                    )
                warnings.extend(meta.warnings)

        if not data_signals:
            return self._build_response(
                "INCONCLUSIVE",
                0.0,
                0.0,
                "WEAK",
                [s.to_dict() for s in signals],
                contradictions,
                warnings + ["No valid data signals"],
            )

        # Compute AI Probability using Provenance Hierarchy
        total_weight = 0.0
        weighted_score_sum = 0.0
        max_hierarchy_weight = 0.0

        for s in data_signals:
            category = self._determine_hierarchy_category(s)
            base_weight = self.HIERARCHY_WEIGHTS.get(category, 1.0)

            # Scale weight by detector's own reported confidence
            actual_weight = base_weight * max(0.1, s.confidence)

            weighted_score_sum += s.score * actual_weight
            total_weight += actual_weight

            if base_weight > max_hierarchy_weight:
                max_hierarchy_weight = base_weight

        ai_probability = weighted_score_sum / total_weight if total_weight > 0 else 0.5

        # Compute Overall Confidence
        # Base confidence grows logarithmically with total combined weight of evidence
        base_confidence = min(1.0, math.log10(1 + total_weight / 2.0))

        # Boost confidence if high-hierarchy evidence (provenance/watermark) is present
        if max_hierarchy_weight >= self.HIERARCHY_WEIGHTS["verified_watermark"]:
            base_confidence = min(1.0, base_confidence + 0.2)

        final_confidence = max(0.0, base_confidence - confidence_penalty)

        # Classification Logic
        # The internal decision engine maps everything to a strictly binary final output for the user,
        # relying on `ai_probability` as the decider, while keeping `final_confidence` as a separate internal metric.
        classification = "AI" if ai_probability >= 0.50 else "HUMAN"

        # Evidence Strength mapping
        if final_confidence >= 0.8:
            evidence_strength = "STRONG"
        elif final_confidence >= 0.5:
            evidence_strength = "MODERATE"
        else:
            evidence_strength = "WEAK"

        return self._build_response(
            classification=classification,
            ai_probability=ai_probability,
            confidence=final_confidence,
            evidence_strength=evidence_strength,
            signals=[s.to_dict() for s in signals],
            contradictions=contradictions,
            warnings=warnings,
        )

    def _build_response(
        self,
        classification: str,
        ai_probability: float,
        confidence: float,
        evidence_strength: str,
        signals: List[Dict[str, Any]],
        contradictions: List[str],
        warnings: List[str],
    ) -> Dict[str, Any]:
        return {
            "classification": classification,
            "ai_probability": round(ai_probability, 4),
            "confidence": round(confidence, 4),
            "evidence_strength": evidence_strength,
            "signals": signals,
            "contradictions": contradictions,
            "warnings": warnings,
        }


def fuse_evidence(signals: List[DetectionSignal]) -> Dict[str, Any]:
    engine = EvidenceFusionEngine()
    return engine.fuse(signals)
