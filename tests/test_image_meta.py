import pytest
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))
from image_detector import AdversarialImageMetaAnalyzer
from detector_registry import DetectionSignal

def test_adversarial_disagreement():
    analyzer = AdversarialImageMetaAnalyzer()
    
    # Simulate a scenario where the CNN says AI, but physics says Human
    signals = [
        DetectionSignal("Neural Vision Analyzer", "1.0", "image", 0.95, 1.0, {"neural_prob": 0.95}),
        DetectionSignal("Hardware Provenance Analyzer", "1.0", "image", 0.1, 1.0, {"camera_workflow": True}),
        DetectionSignal("Pixel Noise Analyzer", "1.0", "image", 0.15, 1.0, {"flatBlockNoise": 1.5})
    ]
    
    ctx = {}
    meta_sig = analyzer.execute(signals, ctx)
    
    assert meta_sig.evidence.get("flag") == "HIGH_MODEL_DISAGREEMENT"
    assert meta_sig.signal_quality == 1.0
