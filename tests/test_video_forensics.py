import pytest
import cv2
import numpy as np
import tempfile
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))
from video_detector import VideoTemporalOrchestrator

def create_synthetic_video():
    fd, path = tempfile.mkstemp(suffix=".mp4")
    os.close(fd)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(path, fourcc, 10.0, (128, 128))
    
    # Create 20 frames of completely erratic AI morphing
    # (High optical flow variance, flickering luminance)
    for _ in range(20):
        frame = np.random.randint(0, 255, (128, 128, 3), dtype=np.uint8)
        out.write(frame)
        
    out.release()
    return path

def test_video_orchestrator():
    """
    Test that the video orchestrator correctly extracts temporal motion
    and visual consistency signals.
    """
    video_path = create_synthetic_video()
    try:
        orchestrator = VideoTemporalOrchestrator()
        result = orchestrator.analyze(video_path)
        
        signals = result.get("raw_outputs", [])
        detector_names = [s["detector"] for s in signals]
        
        # Provenance might fail because it's an OpenCV synthetic, but temporal motion must run
        assert "Temporal Motion Analyzer" in detector_names
        assert "Visual Consistency Analyzer" in detector_names
        
        # Under calibrated log-odds fusion, two signals < 0.5 will yield a strong < 0.5 probability.
        assert result["ai_probability"] < 0.5
    finally:
        if os.path.exists(video_path):
            os.remove(video_path)
