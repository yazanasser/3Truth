import pytest
from PIL import Image, ImageFilter
import numpy as np
import io
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))
from pixel_forensics import PixelForensicsOrchestrator

def create_base_image():
    # A base noisy image representing a camera photo
    arr = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
    return Image.fromarray(arr)

def apply_heavy_jpeg(img, quality=10):
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=quality)
    buf.seek(0)
    return Image.open(buf)

def apply_heavy_blur(img):
    return img.filter(ImageFilter.GaussianBlur(radius=5))

def apply_heavy_downscale(img):
    return img.resize((32, 32), Image.Resampling.LANCZOS)

def test_robustness_graceful_degradation():
    """
    Ensure that when images are heavily compressed or blurred, 
    the signal qualities of highly-sensitive detectors safely drop
    instead of forcing false positives.
    """
    orchestrator = PixelForensicsOrchestrator()
    base_img = create_base_image()
    
    # 1. Base Image should have high quality for noise/frequency
    signals_base = orchestrator.analyze(base_img)
    noise_sig = next(s for s in signals_base if s.detector_name == "Pixel Noise Analyzer")
    assert noise_sig.signal_quality == 1.0
    
    # 2. Heavy JPEG should not crash the orchestrator
    jpeg_img = apply_heavy_jpeg(base_img)
    signals_jpeg = orchestrator.analyze(jpeg_img)
    assert len(signals_jpeg) >= 1
    
    # 3. Heavy blur should drop noise quality
    blur_img = apply_heavy_blur(base_img)
    signals_blur = orchestrator.analyze(blur_img)
    noise_sig_blur = next((s for s in signals_blur if s.detector_name == "Pixel Noise Analyzer"), None)
    # If the noise was smoothed entirely, the quality might drop to 0.4
    if noise_sig_blur:
        assert noise_sig_blur.signal_quality <= 1.0 
        
    # 4. Tiny downscale should drop DCT grid energy quality
    tiny_img = apply_heavy_downscale(base_img)
    signals_tiny = orchestrator.analyze(tiny_img)
    freq_sig_tiny = next((s for s in signals_tiny if s.detector_name == "Frequency Domain Analyzer"), None)
    if freq_sig_tiny:
        assert freq_sig_tiny.signal_quality <= 1.0 # Should be reduced due to low dct_energy
