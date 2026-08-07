import sys
import os
import unittest
from unittest.mock import patch, MagicMock

sys.path.append(os.path.join(os.path.dirname(__file__), '../backend/src'))

from provenance_detector import evaluate_provenance_and_metadata # type: ignore

class TestProvenanceDetector(unittest.TestCase):

    def setUp(self):
        self.mock_image = MagicMock()
        self.mock_image.getexif.return_value = {}

    def test_missing_metadata(self):
        # Empty EXIF, no C2PA bytes
        evidence = evaluate_provenance_and_metadata(self.mock_image, None)
        
        self.assertEqual(evidence["score"], 0.0)
        self.assertEqual(evidence["provenance_status"], "MISSING")
        self.assertEqual(evidence["metadata_anomalies"], [])
        
    def test_normal_camera_metadata(self):
        # EXIF claims physical camera, no synthetic flags
        self.mock_image.getexif.return_value = {
            271: b"Canon",         # Make
            272: b"Canon EOS 5D",  # Model
            305: b"Firmware 1.0"   # Software
        }
        
        evidence = evaluate_provenance_and_metadata(self.mock_image, None)
        self.assertEqual(evidence["score"], 0.0)
        self.assertEqual(evidence["provenance_status"], "MISSING")
        self.assertEqual(evidence["metadata_anomalies"], [])

    def test_edited_image_metadata_anomaly(self):
        # EXIF claims physical camera, BUT software indicates manipulation
        self.mock_image.getexif.return_value = {
            271: b"Sony",               # Make
            272: b"ILCE-7M3",           # Model
            305: b"Adobe Photoshop 24"  # Software
        }
        
        evidence = evaluate_provenance_and_metadata(self.mock_image, None)
        
        self.assertTrue(evidence["score"] >= 0.8)
        self.assertTrue(any("Contradiction" in anomaly for anomaly in evidence["metadata_anomalies"]))

    def test_synthetic_metadata(self):
        # EXIF claims Midjourney directly
        self.mock_image.getexif.return_value = {
            305: b"Midjourney v5"
        }
        
        evidence = evaluate_provenance_and_metadata(self.mock_image, None)
        
        self.assertTrue(evidence["score"] >= 0.6)
        self.assertTrue(any("Software signature indicates synthetic" in anomaly for anomaly in evidence["metadata_anomalies"]))

    def test_malformed_metadata(self):
        # Simulate an exception in EXIF parsing
        self.mock_image.getexif.side_effect = Exception("Corrupt EXIF header")
        
        # Should catch gracefully and return score 0
        evidence = evaluate_provenance_and_metadata(self.mock_image, None)
        self.assertEqual(evidence["score"], 0.0)

    @patch('provenance_detector.c2pa')
    def test_valid_c2pa(self, mock_c2pa):
        mock_reader = MagicMock()
        mock_reader.json.return_value = '{"active_manifest": "m1", "manifests": {"m1": {"signature_info": {"issuer": "Adobe"}, "assertions": [{"label": "c2pa.actions", "data": {"actions": [{"action": "c2pa.created", "parameters": {"description": "Photoshop"}}]}}]}}}'
        mock_c2pa.Reader.try_create.return_value = mock_reader
        
        evidence = evaluate_provenance_and_metadata(self.mock_image, b"fake_bytes")
        
        self.assertEqual(evidence["provenance_status"], "VERIFIED")
        self.assertEqual(evidence["issuer"], "Adobe")
        self.assertEqual(evidence["origin"], "Photoshop")
        self.assertIn("c2pa.created", evidence["editing_history"])
        
    @patch('provenance_detector.c2pa')
    def test_invalid_c2pa(self, mock_c2pa):
        mock_reader = MagicMock()
        mock_reader.json.return_value = '{"active_manifest": "m1", "validation_status": [{"code": "signature_mismatch"}], "manifests": {"m1": {}}}'
        mock_c2pa.Reader.try_create.return_value = mock_reader
        
        evidence = evaluate_provenance_and_metadata(self.mock_image, b"fake_bytes")
        
        self.assertEqual(evidence["provenance_status"], "INVALID")
        self.assertTrue(any("signature_mismatch" in anomaly for anomaly in evidence["metadata_anomalies"]))

if __name__ == '__main__':
    unittest.main()
