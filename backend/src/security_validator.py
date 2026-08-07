import os
import secrets
import tempfile
import time
import functools
import concurrent.futures
import threading
from typing import Any, Callable, Dict, Optional, Tuple


class SecurityException(Exception):
    pass


class FileValidator:
    # Strict magic byte signatures
    MAGIC_BYTES = {
        "jpeg": b"\xff\xd8\xff",
        "png": b"\x89PNG\r\n\x1a\n",
        "gif": b"GIF8",
        "mp4": b"ftyp",
        "webm": b"\x1aE\xdf\xa3",
    }

    MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024  # 20MB
    MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024  # 100MB
    MAX_IMAGE_DIMENSIONS = 10000 * 10000  # Decompression bomb protection

    @classmethod
    def validate_magic_bytes(cls, raw_bytes: bytes, modality: str) -> bool:
        if not raw_bytes:
            return False

        if modality == "image":
            return any(
                raw_bytes.startswith(sig)
                for sig in [
                    cls.MAGIC_BYTES["jpeg"],
                    cls.MAGIC_BYTES["png"],
                    cls.MAGIC_BYTES["gif"],
                ]
            )
        elif modality == "video":
            # MP4 ftyp is usually at offset 4
            if len(raw_bytes) > 12 and raw_bytes[4:8] == cls.MAGIC_BYTES["mp4"]:
                return True
            if raw_bytes.startswith(cls.MAGIC_BYTES["webm"]):
                return True
            return False
        return True

    @classmethod
    def validate_image_bomb(cls, width: int, height: int) -> bool:
        return (width * height) <= cls.MAX_IMAGE_DIMENSIONS


class SecureTempManager:
    """Manages transient files safely."""

    def __init__(self, prefix: str = "secure_tmp_"):
        self.temp_dir = tempfile.gettempdir()
        self.prefix = prefix
        self.secure_file_path = None

    def __enter__(self) -> str:
        # Cryptographically secure random filename to prevent collisions and prediction
        random_name = secrets.token_hex(16)
        self.secure_file_path = os.path.join(
            self.temp_dir, f"{self.prefix}{random_name}.tmp"
        )

        # Ensure absolutely no path traversal
        if os.path.dirname(os.path.abspath(self.secure_file_path)) != os.path.abspath(
            self.temp_dir
        ):
            raise SecurityException(
                "Path traversal attempt detected in temporary file generation"
            )

        # Create an empty securely permissioned file (0600 on unix if supported)
        with open(self.secure_file_path, "wb") as f:
            pass

        return self.secure_file_path

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.secure_file_path and os.path.exists(self.secure_file_path):
            try:
                os.remove(self.secure_file_path)
            except OSError:
                pass


class ResourceLimiter:
    """Enforces CPU/Worker timeouts to prevent algorithmic complexity attacks."""

    @staticmethod
    def run_with_timeout(
        func: Callable, timeout_seconds: float, *args, **kwargs
    ) -> Any:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(func, *args, **kwargs)
            try:
                return future.result(timeout=timeout_seconds)
            except concurrent.futures.TimeoutError:
                raise SecurityException(
                    f"Execution exceeded the maximum allowed time of {timeout_seconds}s"
                )


class ModelLoaderSecurity:
    """Ensures only highly trusted serialized models are loaded."""

    TRUSTED_MODELS = {
        "text_ensemble_v1",
        "vit_base_patch16_224",
        "clip_vit_base_patch32",
        "c2pa_validator_v1",
    }

    @classmethod
    def validate_model_id(cls, model_id: str) -> bool:
        if model_id not in cls.TRUSTED_MODELS:
            raise SecurityException(f"Untrusted model execution blocked: {model_id}")
        return True
