import unittest
import sys
import os
from typing import Dict, Any, List

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend/src'))

from watermark_detector import WatermarkDetector, watermark_registry, watermark_detector_wrapper # type: ignore


class MockSynthIDImage(WatermarkDetector):
    def __init__(self, should_detect=False, should_fail=False):
        self.should_detect = should_detect
        self.should_fail = should_fail
        
    def get_supported_modalities(self) -> List[str]:
        return ["image"]
        
    def detect(self, data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        if self.should_fail:
            raise RuntimeError("SynthID SDK crashed.")
            
        return {
            "detected": self.should_detect,
            "technology": "SynthID",
            "provider": "Google DeepMind",
            "confidence": 0.99 if self.should_detect else 0.0,
            "evidence": {"watermark_bits": "101010"} if self.should_detect else {},
            "robustness": {"resisted_cropping": True}
        }


class MockTextWatermark(WatermarkDetector):
    def get_supported_modalities(self) -> List[str]:
        return ["text"]
        
    def detect(self, data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "detected": True,
            "technology": "KGW",
            "provider": "OpenAI",
            "confidence": 0.95,
            "evidence": {"p_value": 0.001},
            "robustness": {}
        }


class TestWatermarkSubsystem(unittest.TestCase):
    def setUp(self):
        watermark_registry.clear()

    def test_watermark_present(self):
        watermark_registry.register(MockSynthIDImage(should_detect=True))
        
        signal = watermark_detector_wrapper({}, {}, "image")
        
        self.assertEqual(signal.modality, "image")
        self.assertEqual(signal.score, 1.0)
        self.assertEqual(signal.confidence, 0.99)
        self.assertTrue(len(signal.evidence["watermarks"]) > 0)
        self.assertTrue(signal.evidence["watermarks"][0]["detected"])
        
    def test_watermark_absent(self):
        watermark_registry.register(MockSynthIDImage(should_detect=False))
        
        signal = watermark_detector_wrapper({}, {}, "image")
        
        # When no watermark is detected, score remains 0, as it's not proof of human origin.
        self.assertEqual(signal.score, 0.0)
        self.assertEqual(signal.confidence, 0.0)
        self.assertFalse(signal.evidence["watermarks"][0]["detected"])

    def test_detector_failure(self):
        watermark_registry.register(MockSynthIDImage(should_fail=True))
        
        signal = watermark_detector_wrapper({}, {}, "image")
        
        # The wrapper should not crash, it should catch the error and report it in the evidence.
        self.assertEqual(signal.score, 0.0)
        self.assertEqual(signal.confidence, 0.0)
        
        watermark = signal.evidence["watermarks"][0]
        self.assertFalse(watermark["detected"])
        self.assertIn("error", watermark["evidence"])
        self.assertEqual(watermark["evidence"]["error"], "SynthID SDK crashed.")

    def test_modality_filtering(self):
        # Register a text watermark detector
        watermark_registry.register(MockTextWatermark())
        
        # Call it with "image" modality
        signal = watermark_detector_wrapper({}, {}, "image")
        
        # Should return empty results because no image detectors are registered
        self.assertEqual(signal.score, 0.0)
        self.assertEqual(len(signal.evidence["watermarks"]), 0)


if __name__ == '__main__':
    unittest.main()
