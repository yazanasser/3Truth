import math
from abc import ABC, abstractmethod
from collections import defaultdict
from typing import Any, Dict, List, Tuple

from detector_registry import DetectionSignal  # type: ignore


class BaseFusionEngine(ABC):
    @abstractmethod
    def fuse(self, signals: List[DetectionSignal]) -> Dict[str, Any]:
        """Fuse detector signals into an evidence report."""
        raise NotImplementedError


class BaseDecisionEngine(ABC):
    @abstractmethod
    def classify(self, fusion_result: Dict[str, Any]) -> Dict[str, Any]:
        """Map a fusion result to a decision."""
        raise NotImplementedError


class EvidenceFusionEngine(BaseFusionEngine, BaseDecisionEngine):
    """
    Conservative evidence fusion for AI-content detection.

    Important design rules:
    - A metadata/provenance detector is not cryptographic provenance merely because
      its name contains the word "provenance".
    - Correlated detectors are grouped so nine variants of the same pixel heuristic
      cannot masquerade as nine independent observations.
    - Detector scores are treated as evidence, not as calibrated probabilities unless
      the detector explicitly declares calibration in its signal evidence.
    - Missing or degraded evidence reduces confidence; it never becomes evidence for
      the opposite class.
    - Disagreement produces an abstention/uncertainty state instead of an artificial
      confidence boost.
    """

    # These are intentionally modest. They are reliability ceilings, not accuracy claims.
    CATEGORY_CAPS = {
        "verified_cryptographic_provenance": 1.00,
        "verified_watermark": 0.85,
        "signed_provenance": 0.80,
        "forensic": 0.70,
        "ml_classifier": 0.70,
        "heuristic": 0.35,
    }

    # Independent evidence families. Detector names are mapped into these families so
    # correlated measurements (FFT + spectral + DCT, for example) are not double-counted.
    FAMILY_KEYWORDS = {
        "provenance": ("c2pa", "content credential", "cryptographic", "signed provenance", "signature"),
        "metadata": ("metadata", "exif", "software metadata", "filename"),
        "neural": ("neural", "vit", "clip", "transformer", "classifier", "ensemble", "diffusion fingerprint", "gan face"),
        "pixel_noise": ("pixel noise", "prnu", "sensor noise", "noise domain", "residual"),
        "frequency": ("frequency", "fourier", "fft", "dct", "wavelet", "spectral", "azimuthal"),
        "compression": ("compression", "jpeg", "ela", "recompression", "block artifact"),
        "scene": ("scene", "lighting", "shadow", "geometry", "texture", "physical"),
        "biometric": ("biometric", "face", "eye", "specular", "landmark", "blink", "head pose"),
        "temporal": ("temporal", "optical flow", "klt", "flicker", "motion", "sync"),
        "audio": ("audio", "voice", "spectrogram", "speech", "wav2vec", "asr"),
        "linguistic": ("linguistic", "stylometry", "morphology", "syntactic", "perplexity", "burstiness", "arabic"),
    }

    def classify(self, fusion_result: Dict[str, Any]) -> Dict[str, Any]:
        return fusion_result

    @staticmethod
    def _clip_probability(value: Any, default: float = 0.5) -> float:
        try:
            value = float(value)
        except (TypeError, ValueError):
            value = default
        return max(0.001, min(0.999, value))

    @classmethod
    def _prob_to_logit(cls, value: Any) -> float:
        p = cls._clip_probability(value)
        return math.log(p / (1.0 - p))

    @staticmethod
    def _logit_to_prob(logit: float) -> float:
        logit = max(-20.0, min(20.0, float(logit)))
        return 1.0 / (1.0 + math.exp(-logit))

    @classmethod
    def _is_verified_provenance(cls, signal: DetectionSignal) -> bool:
        name = signal.detector_name.lower()
        evidence = signal.evidence or {}
        text = " ".join(str(v).lower() for v in evidence.values())
        return (
            any(token in name for token in ("c2pa", "cryptographic provenance", "signed provenance"))
            or bool(evidence.get("cryptographically_verified"))
            or bool(evidence.get("signature_valid"))
            or "signature valid" in text
        )

    @classmethod
    def _category(cls, signal: DetectionSignal) -> str:
        name = signal.detector_name.lower()
        evidence = signal.evidence or {}

        if cls._is_verified_provenance(signal):
            return "verified_cryptographic_provenance"
        if "watermark" in name and bool(evidence.get("verified", evidence.get("cryptographically_verified", False))):
            return "verified_watermark"
        if any(k in name for k in ("metadata", "exif", "software", "filename", "container", "bitstream", "provenance")):
            return "signed_provenance" if evidence.get("signature_valid") else "metadata"
        if any(k in name for k in ("neural", "classifier", "ensemble", "vit", "clip", "transformer", "stylometry")):
            return "ml_classifier"
        if any(k in name for k in ("pixel", "frequency", "optical", "temporal", "perplexity", "entropy", "forensic", "prnu", "fourier", "spectral", "bayer", "biometric", "sync", "audio", "linguistic", "morphology")):
            return "forensic"
        return "heuristic"

    @classmethod
    def _family(cls, signal: DetectionSignal) -> str:
        name = signal.detector_name.lower()
        # Prefer the first explicit family match. Metadata/provenance are kept separate.
        for family, keywords in cls.FAMILY_KEYWORDS.items():
            if any(keyword in name for keyword in keywords):
                return family
        return f"detector:{name}"

    @classmethod
    def _declares_calibration(cls, signal: DetectionSignal) -> bool:
        evidence = signal.evidence or {}
        diagnostics = signal.diagnostic_information or {}
        return bool(
            signal.calibrated_probability is not None
            and (
                evidence.get("calibrated") is True
                or evidence.get("calibration_method")
                or diagnostics.get("calibrated") is True
                or diagnostics.get("calibration_method")
            )
        )

    @classmethod
    def _effective_probability(cls, signal: DetectionSignal) -> Tuple[float, bool]:
        """Return probability plus whether it was explicitly declared calibrated."""
        if cls._declares_calibration(signal):
            return cls._clip_probability(signal.calibrated_probability), True
        # Legacy detector scores are evidence scores, not trustworthy probabilities.
        # Shrink them toward 0.5 before fusion to prevent overconfident hand-written rules.
        raw = cls._clip_probability(signal.score)
        return 0.5 + (raw - 0.5) * 0.55, False

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
        decision_status: str,
        uncertainty_reasons: List[str],
        independent_families: int,
    ) -> Dict[str, Any]:
        return {
            "classification": classification,
            "ai_probability": round(ai_probability, 4),
            "confidence": round(confidence, 4),
            "evidence_strength": evidence_strength,
            "decision_status": decision_status,
            "raw_outputs": raw_outputs,
            "calibrated_outputs": calibrated_outputs,
            "fused_evidence_summary": "Evidence was reliability-weighted, family-capped, and disagreement-aware; no agreement-count boost is applied.",
            "contradictions": contradictions,
            "warnings": warnings,
            "uncertainty_reasons": uncertainty_reasons,
            "independent_evidence_families": independent_families,
            "recommend_human_review": decision_status != "DECISIVE" or bool(contradictions),
            "known_limitations": [
                "AI-content detection is probabilistic and can fail on unseen generators and transformed media.",
                "Missing metadata is neutral evidence, not evidence of human authorship.",
                "Pixel/forensic signals can be degraded by resizing, recompression, screenshots, and editing.",
                "Cryptographic provenance can establish provenance claims but does not by itself establish that the underlying real-world event is truthful.",
            ],
        }

    def fuse(self, signals: List[DetectionSignal]) -> Dict[str, Any]:
        if not signals:
            return self._build_response(
                "INCONCLUSIVE", 0.5, 0.0, "WEAK", [], [], [], ["No detector signals available"],
                "INSUFFICIENT_EVIDENCE", ["No usable detector evidence"], 0,
            )

        warnings: List[str] = []
        contradictions: List[str] = []
        uncertainty_reasons: List[str] = []
        raw_outputs: List[Dict[str, Any]] = []
        calibrated_outputs: List[Dict[str, Any]] = []

        valid = [s for s in signals if not s.failed and (s.signal_quality or 0.0) > 0.0]
        if not valid:
            return self._build_response(
                "INCONCLUSIVE", 0.5, 0.0, "WEAK", [], [], [], ["No valid detector signals"],
                "INSUFFICIENT_EVIDENCE", ["All detectors failed or produced unusable evidence"], 0,
            )

        # First pass: create family-level evidence. This prevents correlated signals from
        # overwhelming independent evidence merely by being numerous.
        families: Dict[str, List[Tuple[DetectionSignal, float, bool]]] = defaultdict(list)
        for signal in valid:
            probability, calibrated = self._effective_probability(signal)
            family = self._family(signal)
            families[family].append((signal, probability, calibrated))

            raw_outputs.append({
                "detector": signal.detector_name,
                "raw_probability": round(self._clip_probability(signal.score), 4),
                "effective_probability": round(probability, 4),
                "calibrated": calibrated,
                "signal_quality": round(float(signal.signal_quality or 0.0), 4),
            })

        family_logits: Dict[str, float] = {}
        family_weights: Dict[str, float] = {}
        family_details: Dict[str, Dict[str, Any]] = {}

        for family, items in families.items():
            evidence_values = []
            total_item_weight = 0.0
            weighted_logit = 0.0

            for signal, probability, calibrated in items:
                quality = max(0.0, min(1.0, float(signal.signal_quality or 0.0)))
                confidence = max(0.0, min(1.0, float(signal.confidence or 0.0)))
                item_weight = quality * confidence
                if calibrated:
                    item_weight *= 1.15
                else:
                    item_weight *= 0.85
                item_weight = min(1.0, item_weight)
                if item_weight <= 0.0:
                    continue

                logit = self._prob_to_logit(probability)
                weighted_logit += logit * item_weight
                total_item_weight += item_weight
                evidence_values.append(probability)

                calibrated_outputs.append({
                    "detector": signal.detector_name,
                    "family": family,
                    "category": self._category(signal),
                    "item_weight": round(item_weight, 4),
                    "effective_probability": round(probability, 4),
                })

            if total_item_weight <= 0.0:
                continue

            family_logit = weighted_logit / total_item_weight
            # Diminishing returns inside one family. A family can contribute at most one
            # full-strength observation regardless of detector count.
            family_cap = 1.0
            category = self._category(items[0][0])
            if category in self.CATEGORY_CAPS:
                family_cap = self.CATEGORY_CAPS[category]
            family_weight = min(family_cap, total_item_weight / max(len(items), 1) + 0.15)

            family_logits[family] = family_logit
            family_weights[family] = family_weight
            family_details[family] = {
                "detectors": len(items),
                "mean_probability": sum(evidence_values) / len(evidence_values),
                "weight": family_weight,
                "category": category,
            }

        if not family_logits:
            return self._build_response(
                "INCONCLUSIVE", 0.5, 0.0, "WEAK", raw_outputs, calibrated_outputs, [],
                ["No detector family produced usable evidence"],
                "INSUFFICIENT_EVIDENCE", ["Usable signal quality was zero after reliability filtering"], 0,
            )

        # Combine family evidence. The prior is neutral; there is no arbitrary agreement multiplier.
        total_weight = sum(family_weights.values())
        combined_logit = sum(family_logits[f] * family_weights[f] for f in family_logits) / max(total_weight, 1e-9)
        ai_probability = self._logit_to_prob(combined_logit)

        # Detect genuine cross-family conflict. A detector near 0.5 is not a contradiction.
        ai_families = [f for f, p in ((f, self._logit_to_prob(v)) for f, v in family_logits.items()) if p >= 0.65]
        human_families = [f for f, p in ((f, self._logit_to_prob(v)) for f, v in family_logits.items()) if p <= 0.35]
        if ai_families and human_families:
            contradictions.append(
                "Independent evidence families disagree: AI-leaning=" + ", ".join(ai_families) +
                "; human-leaning=" + ", ".join(human_families)
            )

        independent_families = len(family_logits)
        if independent_families < 2:
            uncertainty_reasons.append("Only one independent evidence family was available")
        if not any(self._declares_calibration(s) for s in valid):
            uncertainty_reasons.append("No detector declared a validated calibration artifact")
        if len(valid) < 2:
            uncertainty_reasons.append("Only one usable detector signal was available")

        # Confidence is based on evidence diversity and separation from 0.5, not detector count.
        separation = min(1.0, abs(ai_probability - 0.5) * 2.0)
        diversity = min(1.0, independent_families / 4.0)
        mean_quality = sum(float(s.signal_quality or 0.0) for s in valid) / len(valid)
        confidence = 0.55 * separation + 0.30 * diversity + 0.15 * mean_quality
        if contradictions:
            confidence *= 0.35
            uncertainty_reasons.append("Strong cross-family disagreement")
        if "No detector declared a validated calibration artifact" in uncertainty_reasons:
            confidence *= 0.80

        # Abstain whenever the evidence is not separated enough to support a trustworthy decision.
        decisive = (
            independent_families >= 2
            and confidence >= 0.55
            and not contradictions
            and (ai_probability >= 0.70 or ai_probability <= 0.30)
        )
        if decisive:
            classification = "AI Generated" if ai_probability >= 0.70 else "Human"
            decision_status = "DECISIVE"
        else:
            classification = "INCONCLUSIVE"
            decision_status = "ABSTAINED"
            if ai_probability > 0.5:
                uncertainty_reasons.append("AI evidence did not clear the conservative decision threshold")
            else:
                uncertainty_reasons.append("Human evidence did not clear the conservative decision threshold")

        if confidence >= 0.75 and decisive:
            evidence_strength = "STRONG"
        elif confidence >= 0.50:
            evidence_strength = "MODERATE"
        else:
            evidence_strength = "WEAK"

        warnings.extend(
            [
                f"Evidence families evaluated: {independent_families}",
                "Family-level correlation controls are active; detector count is not treated as independent evidence.",
            ]
        )

        result = self._build_response(
            classification=classification,
            ai_probability=ai_probability,
            confidence=confidence,
            evidence_strength=evidence_strength,
            raw_outputs=raw_outputs,
            calibrated_outputs=calibrated_outputs,
            contradictions=contradictions,
            warnings=warnings,
            decision_status=decision_status,
            uncertainty_reasons=uncertainty_reasons,
            independent_families=independent_families,
        )
        result["evidence_families"] = family_details
        return result
