import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))

import pytest
from text_detector import StylometryAnalyzer, BurstinessAnalyzer, EntropyAnalyzer, ParaphraseAnalyzer
from fusion_engine import EvidenceFusionEngine
from detector_registry import DetectionSignal

def test_outlier_rejection():
    """
    Simulates a scenario where Stylometry collapses (e.g. forced typos) giving 0.1,
    but Entropy and Burstiness remain strong AI indicators (0.95).
    Without outlier rejection, 0.1 would significantly drag the average down.
    With robust outlier rejection, the 0.1 should be downweighted.
    """
    engine = EvidenceFusionEngine()
    
    # 3 forensic signals + 1 ML classifier
    signals = [
        DetectionSignal("Stylometry Analyzer", "1.0", "text", 0.1, 0.9, 0.9, {}, [], []),  # OUTLIER
        DetectionSignal("Burstiness Analyzer", "1.0", "text", 0.95, 0.9, 0.9, {}, [], []),
        DetectionSignal("Entropy Analyzer", "1.0", "text", 0.90, 0.9, 0.9, {}, [], []),
        DetectionSignal("ML Classifier", "1.0", "text", 0.92, 0.9, 0.9, {}, [], [])
    ]
    
    result = engine.fuse(signals)
    
    # Median of [0.1, 0.9, 0.92, 0.95] is around 0.91
    # 0.1 deviates by 0.81, so its weight collapses.
    # Weighted average of [0.95, 0.90, 0.92] is roughly 0.923.
    # Assert that final AI probability remains high (> 0.85) despite the 0.1 outlier.
    assert result["ai_probability"] > 0.85, f"AI prob collapsed due to outlier: {result['ai_probability']}"
    assert result["classification"] == "AI"

def test_cryptographic_bypass():
    """
    Ensures that cryptographic signals (C2PA/watermark) bypass outlier rejection.
    If forensic analysis strongly disagrees with cryptographic provenance, the cryptography should win.
    """
    engine = EvidenceFusionEngine()
    
    signals = [
        DetectionSignal("Stylometry Analyzer", "1.0", "text", 0.1, 0.9, 0.9, {}, [], []),
        DetectionSignal("Burstiness Analyzer", "1.0", "text", 0.15, 0.9, 0.9, {}, [], []),
        DetectionSignal("Verified Watermark", "1.0", "provenance", 0.99, 1.0, 1.0, {}, [], [])  # STRONG AI
    ]
    
    result = engine.fuse(signals)
    
    # Watermark has weight 8.0, forensics have weight 4.0 (down to actual weights)
    # The watermark should heavily influence the probability.
    assert result["ai_probability"] > 0.60, f"Crypto signal ignored: {result['ai_probability']}"
    assert result["classification"] == "AI"

def test_paraphrase_detector():
    """
    Tests the ParaphraseAnalyzer for suspiciously uniform sentence lengths.
    """
    detector = ParaphraseAnalyzer()
    
    # Highly uniform text (AI rewriting/translation)
    ai_text = "This is a test. Here is a test. That is a test. Test is a test. What is a test. It is a test."
    ctx = {"text": ai_text, "language": "english"}
    
    signal = detector.execute(ai_text, ctx)
    assert signal.score >= 0.8  # Flagged as suspiciously uniform

    # High variance text (Human drafting)
    human_text = "Short one. But then suddenly there is an extremely long and convoluted sentence that drags on forever! What? Yes, exactly."
    signal_human = detector.execute(human_text, ctx)
    assert signal_human.score <= 0.3  # Flagged as human variance

