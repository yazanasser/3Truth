import pytest
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))
from provenance_engine import ProvenanceOrchestrator

def test_provenance_c2pa():
    """
    Test that the ProvenanceOrchestrator detects C2PA markers with high confidence
    and successfully lowers the confidence of easily spoofed hardware strings.
    """
    orchestrator = ProvenanceOrchestrator()
    
    # 1. Test missing provenance (should NOT prove Human)
    signals_missing = orchestrator.analyze(b"just random bytes here")
    # All signals should drop below quality threshold or return 0.5 (neutral)
    for s in signals_missing:
        assert s.score <= 0.5 
    
    # 2. Test hardware signature (should have low quality due to spoofability)
    # The iPhone EXIF string
    signals_hw = orchestrator.analyze(b"exif data iphone 15 pro max")
    hw_sig = next((s for s in signals_hw if s.detector_name == "Hardware Provenance Analyzer"), None)
    assert hw_sig is not None
    # Even if detected, its quality must be heavily penalized
    assert hw_sig.signal_quality <= 0.3
    # And its score is a weak indicator of Human (e.g. 0.1)
    assert hw_sig.score < 0.5
    
    # 3. Test C2PA signature (should have absolute high confidence as AI)
    # The JUMBF box is used by C2PA/Content Credentials
    signals_c2pa = orchestrator.analyze(b"uuid jumb c2pa midjourney")
    c2pa_sig = next((s for s in signals_c2pa if s.detector_name == "C2PA Metadata Analyzer"), None)
    
    assert c2pa_sig is not None
    assert c2pa_sig.signal_quality == 1.0 # 100% reliable metric
    assert c2pa_sig.score >= 0.95 # Absolute proof of AI
    
    # 4. Test Software EXIF signature (should have high confidence as AI)
    soft_sig = next((s for s in signals_c2pa if s.detector_name == "EXIF Software Analyzer"), None)
    assert soft_sig is not None
    assert soft_sig.signal_quality == 1.0
    assert soft_sig.score >= 0.95
