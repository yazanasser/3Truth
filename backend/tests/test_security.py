import pytest
from ml_server import run_image_detection, run_video_detection
from security_validator import FileValidator, SecurityException

def test_image_magic_bytes_rejection():
    # Provide an invalid magic byte sequence (e.g. random text)
    raw_bytes = b"This is not an image file"
    result = run_image_detection(img_pil=None, file_size=1024, original_name="test.jpg", raw_bytes=raw_bytes)
    assert "error" in result
    assert "Invalid image magic bytes" in result["error"]

def test_image_size_rejection():
    # Provide valid bytes but massive size
    raw_bytes = b"\xff\xd8\xff this is jpeg"
    result = run_image_detection(img_pil=None, file_size=FileValidator.MAX_IMAGE_SIZE_BYTES + 1, original_name="test.jpg", raw_bytes=raw_bytes)
    assert "error" in result
    assert "Image exceeds max size" in result["error"]

def test_video_size_rejection():
    # We can pass an invalid file size to trigger the size check before file opening
    result = run_video_detection(video_path="dummy.mp4", file_size=FileValidator.MAX_VIDEO_SIZE_BYTES + 1, original_name="dummy.mp4")
    assert "error" in result
    assert "Video exceeds max size" in result["error"]
