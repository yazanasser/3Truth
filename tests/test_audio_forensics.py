import pytest
import tempfile
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))
from audio_detector import AudioTemporalOrchestrator

def test_audio_graceful_degradation(monkeypatch):
    """
    Test that if the Neural deepfake checkpoint is missing (or fails),
    the audio pipeline gracefully degrades to offline spectral heuristics.
    """
    # Create a dummy audio path
    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    
    import production_detectors
    
    # Mock neural to fail
    def mock_predict(*args, **kwargs):
        raise Exception("Audio deepfake checkpoint not found")
        
    # Mock spectrum to succeed (offline heuristic)
    def mock_spectrum(*args, **kwargs):
        return {
            "applicable": True,
            "zero_crossing_rate": 0.01,
            "spectral_variance": 0.005,
            "pitch_discontinuities": 8
        }
        
    monkeypatch.setattr(production_detectors, "predict_audio_deepfake", mock_predict)
    monkeypatch.setattr(production_detectors, "analyze_audio_spectrum", mock_spectrum)
    
    try:
        orchestrator = AudioTemporalOrchestrator()
        result = orchestrator.analyze(path)
        
        signals = result.get("raw_outputs", [])
        detector_names = [s["detector"] for s in signals]
        
        # Neural should NOT be present (because applicable = False due to exception)
        # But Spectrum MUST be present
        assert "Audio Spectrum Analyzer" in detector_names
        assert "Neural Voice Cloning Analyzer" not in detector_names
        
        # Because ZCR is very low and discontinuities are high in our mock, 
        # it should strongly predict AI generated.
        assert result["ai_probability"] > 0.5
        
    finally:
        if os.path.exists(path):
            os.remove(path)
