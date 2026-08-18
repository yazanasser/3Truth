import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from detector_registry import DetectionSignal
from fusion_engine import EvidenceFusionEngine


def signal(name, score, quality=1.0, confidence=0.9, family_hint=None, calibrated=False):
    evidence = {}
    if family_hint:
        evidence["test_family"] = family_hint
    if calibrated:
        evidence["calibrated"] = True
        evidence["calibration_method"] = "test"
    return DetectionSignal(
        detector_name=name,
        detector_version="test",
        modality="image",
        score=score,
        confidence=confidence,
        evidence=evidence,
        calibrated_probability=score if calibrated else None,
        signal_quality=quality,
        reliability=quality,
    )


def test_missing_evidence_is_not_human_evidence():
    result = EvidenceFusionEngine().fuse([signal("Metadata Analyzer", 0.5)])
    assert result["classification"] == "INCONCLUSIVE"
    assert result["decision_status"] == "ABSTAINED"


def test_correlated_detector_count_does_not_create_decisive_result():
    signals = [
        signal("Frequency Domain Analyzer", 0.95),
        signal("2D FFT Azimuthal Radial Spectral Analyzer", 0.95),
        signal("Compression Artifact Analyzer", 0.92),
        signal("JPEG Block Analyzer", 0.94),
    ]
    result = EvidenceFusionEngine().fuse(signals)
    assert result["independent_evidence_families"] <= 3
    assert result["classification"] in {"INCONCLUSIVE", "AI Generated"}
    assert result["recommend_human_review"] is True or result["decision_status"] == "DECISIVE"


def test_cross_family_conflict_abstains():
    signals = [
        signal("Neural Vision Analyzer", 0.95, calibrated=True),
        signal("PRNU Hardware Sensor Noise Analyzer", 0.05, calibrated=True),
        signal("Bayer CFA Demosaicing Invariance Analyzer", 0.10, calibrated=True),
    ]
    result = EvidenceFusionEngine().fuse(signals)
    assert result["classification"] == "INCONCLUSIVE"
    assert result["decision_status"] == "ABSTAINED"
    assert result["contradictions"]
