import pytest
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))
from image_detector import ImageProvenanceOrchestrator

def test_missing_metadata_is_neutral():
    """
    Test that an image with no metadata or generic metadata
    defaults to a neutral score (0.5), avoiding false positives/negatives.
    """
    orchestrator = ImageProvenanceOrchestrator()
    
    # Just an empty JPEG stub (no metadata)
    raw_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00"
    
    signals = orchestrator.analyze(raw_bytes)
    
    # Missing metadata should return no high quality signals (they drop out or return 0.5)
    # The orchestrator drops signals with quality < 0.1
    # For Hardware Provenance, missing metadata gives quality 0.1, score 0.5
    # For Software, missing gives quality 0.1, score 0.5
    assert len(signals) == 2
    for sig in signals:
        assert sig.score == 0.5
        assert sig.signal_quality <= 0.1

def test_confirmed_camera_metadata():
    """
    Test that strong EXIF hardware markers output high human confidence (low AI score).
    """
    orchestrator = ImageProvenanceOrchestrator()
    
    # Fake EXIF bytes with camera hints
    raw_bytes = b"EXIF... make: Nikon model: D850 exposuretime: 1/1000 fnumber: 2.8"
    
    signals = orchestrator.analyze(raw_bytes)
    
    hardware_sig = next(s for s in signals if s.detector_name == "Hardware Provenance Analyzer")
    assert hardware_sig.score <= 0.1  # Strong human indicator
    assert hardware_sig.signal_quality == 1.0

def test_ai_generator_metadata():
    """
    Test that known generative AI traces trigger high AI confidence.
    """
    orchestrator = ImageProvenanceOrchestrator()
    
    # Fake metadata block with AI signature
    raw_bytes = b"parameters: Midjourney v6 prompt: highly detailed... cfg scale: 7"
    
    signals = orchestrator.analyze(raw_bytes)
    
    software_sig = next(s for s in signals if s.detector_name == "Software Metadata Analyzer")
    assert software_sig.score >= 0.90  # Strong AI indicator
    assert software_sig.signal_quality == 1.0

def test_weak_ai_metadata():
    """
    Test that weak AI metadata without strong context does not trigger false positives.
    """
    orchestrator = ImageProvenanceOrchestrator()
    
    # 'workflow' is a weak tag, but without 'midjourney' etc., it should not trigger AI certainty
    raw_bytes = b"this is just a workflow document"
    
    signals = orchestrator.analyze(raw_bytes)
    software_sig = next(s for s in signals if s.detector_name == "Software Metadata Analyzer")
    assert software_sig.score == 0.5
