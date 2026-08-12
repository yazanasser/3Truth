import sys
import os
import unittest

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend/src'))

from detector_registry import DetectorRegistry, DetectionSignal

class TestDetectorRegistry(unittest.TestCase):

    def setUp(self):
        self.registry = DetectorRegistry()

    def test_register_and_run_detector(self):
        def mock_detector(data, context):
            return DetectionSignal(
                detector_name="MockDetector",
                detector_version="1.0",
                modality="text",
                score=0.9,
                confidence=0.8,
                evidence={"info": data},
            )
        
        self.registry.register_detector("mock_1", "text", mock_detector, {"version": "1.0"})
        signals = self.registry.run_detectors("text", "hello world", {})
        
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].detector_name, "MockDetector")
        self.assertEqual(signals[0].score, 0.9)
        self.assertEqual(signals[0].evidence["info"], "hello world")
        self.assertFalse(signals[0].failed)

    def test_detector_failure_resilience(self):
        def mock_success(data, context):
            return DetectionSignal("SuccessMock", "1.0", "image", 0.5, 0.5, {})
            
        def mock_fail(data, context):
            raise ValueError("Simulated PyTorch OOM or syntax error")
            
        self.registry.register_detector("success_1", "image", mock_success)
        self.registry.register_detector("fail_1", "image", mock_fail)
        
        signals = self.registry.run_detectors("image", "fake_image_data", {})
        
        self.assertEqual(len(signals), 2)
        success_sig = next(s for s in signals if s.detector_name == "SuccessMock")
        fail_sig = next(s for s in signals if s.detector_name == "fail_1")
        
        self.assertFalse(success_sig.failed)
        self.assertTrue(fail_sig.failed)
        self.assertIn("Simulated PyTorch OOM", fail_sig.error_message)

    def test_missing_detector(self):
        signals = self.registry.run_detectors("audio", "audio_data", {})
        self.assertEqual(len(signals), 0)

    def test_enable_disable(self):
        def mock_det(data, context):
            return DetectionSignal("MockDet", "1.0", "video", 0.1, 0.1, {})
            
        self.registry.register_detector("vid_mock", "video", mock_det)
        
        signals = self.registry.run_detectors("video", "data", {})
        self.assertEqual(len(signals), 1)
        
        self.registry.disable_detector("vid_mock")
        signals2 = self.registry.run_detectors("video", "data", {})
        self.assertEqual(len(signals2), 0)
        
        self.registry.enable_detector("vid_mock")
        signals3 = self.registry.run_detectors("video", "data", {})
        self.assertEqual(len(signals3), 1)

    def test_base_detector_orchestration(self):
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '../backend/src'))
        from base_detector import BaseDetector

        class DummyDetector(BaseDetector):
            def preprocess(self, input_data, context):
                return str(input_data).strip()
            def extract_features(self, preprocessed_data, context):
                return len(preprocessed_data)
            def predict_raw(self, features, context):
                return features / 100.0
            def calibrate(self, raw_score, context):
                return min(1.0, raw_score * 1.5)
            def evaluate_signal_quality(self, features, context):
                return 0.9

        detector = DummyDetector("Dummy", "1.0", "text")
        
        # Test success
        signal = detector.execute("  hello world  ")
        self.assertEqual(signal.detector_name, "Dummy")
        self.assertEqual(signal.score, 11 / 100.0) # len("hello world") = 11
        self.assertEqual(signal.calibrated_probability, min(1.0, 0.11 * 1.5))
        self.assertEqual(signal.signal_quality, 0.9)
        self.assertFalse(signal.failed)
        
        # Test failure handling
        class FailingDetector(DummyDetector):
            def extract_features(self, data, context):
                raise ValueError("Oops")
                
        fail_det = FailingDetector("Fail", "1.0", "text")
        fail_sig = fail_det.execute("data")
        self.assertTrue(fail_sig.failed)
        self.assertEqual(fail_sig.score, 0.0)
        self.assertEqual(fail_sig.prediction, None)
        self.assertIn("Oops", fail_sig.error_message)

if __name__ == '__main__':
    unittest.main()
