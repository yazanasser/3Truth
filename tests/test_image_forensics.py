import pytest
from PIL import Image
import numpy as np
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))
from pixel_forensics import PixelForensicsOrchestrator

def create_synthetic_noise_image():
    # A totally flat image with zero sensor noise (synthetic)
    arr = np.zeros((256, 256, 3), dtype=np.uint8)
    # Add a slight gradient to prevent division by zero
    for i in range(256):
        arr[:, i] = [i, i, i]
    return Image.fromarray(arr)

def create_natural_camera_image():
    # A random noise image simulating physical sensor grain
    arr = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
    return Image.fromarray(arr)

def test_pixel_noise_forensics():
    """
    Test that the pixel forensics orchestrator correctly differentiates
    between zero-noise synthetic textures and high-noise physical sensors.
    """
    orchestrator = PixelForensicsOrchestrator()
    
    # 1. Test Synthetic Image (Flat Block Noise)
    synth_img = create_synthetic_noise_image()
    signals_synth = orchestrator.analyze(synth_img)
    
    # NoiseDomainAnalyzer should catch the low noise
    noise_sig = next((s for s in signals_synth if s.detector_name == "Pixel Noise Analyzer"), None)
    assert noise_sig is not None
    assert noise_sig.score > 0.6  # High probability of AI due to low noise
    
    # 2. Test Natural Image (Sensor Grain)
    nat_img = create_natural_camera_image()
    signals_nat = orchestrator.analyze(nat_img)
    
    noise_sig_nat = next((s for s in signals_nat if s.detector_name == "Pixel Noise Analyzer"), None)
    assert noise_sig_nat is not None
    assert noise_sig_nat.score < 0.6  # Score drops because it has physical noise

def test_orchestrator_execution():
    """
    Test that the orchestrator executes all detectors without crashing
    and returns valid DetectionSignal objects.
    """
    orchestrator = PixelForensicsOrchestrator()
    img = create_natural_camera_image()
    signals = orchestrator.analyze(img)
    
    detector_names = [s.detector_name for s in signals]
    assert "Pixel Noise Analyzer" in detector_names
    assert "Compression Artifact Analyzer" in detector_names
    assert "Frequency Domain Analyzer" in detector_names
    
    for s in signals:
        assert s.score >= 0.0 and s.score <= 1.0
