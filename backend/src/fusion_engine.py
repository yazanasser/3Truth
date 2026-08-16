import statistics
import math
from abc import ABC, abstractmethod
from typing import Any, Dict, List
from detector_registry import DetectionSignal  # type: ignore

class BaseFusionEngine(ABC):
    @abstractmethod
    def fuse(self, signals: List[DetectionSignal]) -> Dict[str, Any]:
        """Fuses multiple detector signals into a cohesive evidence structure."""
        pass

class BaseDecisionEngine(ABC):
    @abstractmethod
    def classify(self, fusion_result: Dict[str, Any]) -> Dict[str, Any]:
        """Maps fusion results to a final verdict/classification."""
        pass

class EvidenceFusionEngine(BaseFusionEngine, BaseDecisionEngine):
    """
    Central decision engine implementing calibrated log-odds evidence fusion.
    """

    def __init__(self):
        # Reliability weight assignments for the Provenance Priority Hierarchy
        # These act as multipliers for the log-odds (logits) during fusion.
        self.HIERARCHY_WEIGHTS = {
            "verified_cryptographic_provenance": 10.0,
            "verified_watermark": 8.0,
            "signed_metadata": 6.0,
            "forensic_evidence": 3.0,
            "ml_classifier": 2.0,
            "heuristics": 1.0,
        }

    def classify(self, fusion_result: Dict[str, Any]) -> Dict[str, Any]:
        return fusion_result

    def _determine_hierarchy_category(self, signal: DetectionSignal) -> str:
        name = signal.detector_name.lower()
        if "c2pa" in name or "cryptographic" in name or "provenance" in name:
            return "verified_cryptographic_provenance"
        elif "watermark" in name or "steganography" in name:
            return "verified_watermark"
        elif "metadata" in name or "exif" in name or "software" in name or "container" in name or "bitstream" in name:
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
                "prnu",
                "fourier",
                "azimuthal",
                "spectral",
                "bayer",
                "demosaicing",
                "biometric",
                "specular",
                "rppg",
                "cardiac",
                "pulse",
                "blink",
                "warping",
                "zipfian",
                "syntactic",
                "markov",
                "clause",
                "dialectal"
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

    def _prob_to_logit(self, p: Any) -> float:
        if isinstance(p, dict):
            p = p.get("ai_probability", p.get("score", 0.5))
        try:
            p = float(p)
        except Exception:
            p = 0.5
        # Clip to prevent infinity
        p = max(0.001, min(0.999, p))
        return math.log(p / (1.0 - p))

    def _logit_to_prob(self, logit: float) -> float:
        return 1.0 / (1.0 + math.exp(-logit))

    def fuse(self, signals: List[DetectionSignal]) -> Dict[str, Any]:
        if not signals:
            return self._build_response(
                "INCONCLUSIVE", 0.5, 0.0, "WEAK", [], [], [], ["No signals available"]
            )

        warnings = []
        contradictions = []
        raw_outputs = []
        calibrated_outputs = []

        # Extract meta-signals
        meta_signals = [s for s in signals if s.modality == "meta" and "Adversarial" in s.detector_name]
        data_signals = [s for s in signals if s.modality != "meta" and not s.failed]

        for meta in meta_signals:
            flag = meta.evidence.get("flag", "NONE")
            if flag == "HIGH_MODEL_DISAGREEMENT":
                contradictions.append(meta.evidence.get("details", "Models disagreed strongly"))
            warnings.extend(meta.warnings)

        if not data_signals:
            return self._build_response(
                "INCONCLUSIVE", 0.5, 0.0, "WEAK", [], contradictions, warnings + ["No valid data signals"]
            )

        # Baseline log-odds (assuming 0.5 prior)
        accumulated_logits = 0.0
        total_weight = 0.0

        for s in data_signals:
            category = self._determine_hierarchy_category(s)
            base_weight = self.HIERARCHY_WEIGHTS.get(category, 1.0)
            
            # Reliability-aware weighting (combines detector historical confidence and signal quality)
            # signal_quality limits the influence of weak evidence (e.g. spoofable strings)
            reliability_weight = base_weight * max(0.1, s.confidence) * max(0.01, s.signal_quality)
            
            raw_logit = self._prob_to_logit(s.score)
            calibrated_logit = raw_logit * reliability_weight
            
            accumulated_logits += calibrated_logit
            total_weight += reliability_weight
            
            raw_outputs.append({
                "detector": s.detector_name,
                "raw_probability": s.score,
                "raw_logit": raw_logit,
            })
            calibrated_outputs.append({
                "detector": s.detector_name,
                "category": category,
                "reliability_weight": reliability_weight,
                "calibrated_logit": calibrated_logit
            })

        # Final Sigmoid activation (using weighted average of logits to prevent overconfidence)
        if total_weight > 0:
            averaged_logit = accumulated_logits / total_weight
            # Boost confidence slightly when multiple signals agree, but safely
            if len(data_signals) > 1:
                averaged_logit *= 1.25
            ai_probability = self._logit_to_prob(averaged_logit)
        else:
            ai_probability = 0.5
        # Compute Overall Confidence mathematically based on total accumulated weight
        final_confidence = min(1.0, math.log10(1 + total_weight))
        
        # Cross-cluster disagreement suppression
        if contradictions:
            final_confidence *= 0.5  # Strongly penalize confidence on disagreement
            
            # Pull probability closer to 0.5 (uncertainty)
            if ai_probability > 0.5:
                ai_probability = 0.5 + (ai_probability - 0.5) * 0.5
            else:
                ai_probability = 0.5 - (0.5 - ai_probability) * 0.5

        # Classification strictly preserves user-facing standards
        classification = "AI Generated" if ai_probability >= 0.50 else "Human"

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
            raw_outputs=raw_outputs,
            calibrated_outputs=calibrated_outputs,
            contradictions=contradictions,
            warnings=warnings,
        )

    def _build_response(
        self,
        classification: str,
        ai_probability: float,
        confidence: float,
        evidence_strength: str,
        raw_outputs: List[Dict[str, Any]],
        calibrated_outputs: List[Dict[str, Any]],
        contradictions: List[str],
        warnings: List[str],
    ) -> Dict[str, Any]:
        recommend_human_review = 0.35 <= ai_probability <= 0.65 or len(contradictions) > 0

        return {
            "classification": classification,
            "ai_probability": round(ai_probability, 4),
            "confidence": round(confidence, 4),
            "evidence_strength": evidence_strength,
            "raw_outputs": raw_outputs,
            "calibrated_outputs": calibrated_outputs,
            "fused_evidence_summary": "Fusion completed via calibrated log-odds accumulation.",
            "contradictions": contradictions,
            "warnings": warnings,
            "recommend_human_review": recommend_human_review,
            "known_limitations": [
                "100% accuracy is impossible. Always verify critical findings.",
                "Adversarial compression can strip provenance signatures.",
                "Extensive manual editing of physical photos can trigger pixel anomaly alarms."
            ]
        }
