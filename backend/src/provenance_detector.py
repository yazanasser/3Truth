import os
import json
import logging
import io
from PIL import Image
from PIL.ExifTags import TAGS
from detector_registry import DetectionSignal  # type: ignore

try:
    import c2pa
except ImportError:
    c2pa = None

try:
    import piexif
except ImportError:
    piexif = None

logger = logging.getLogger(__name__)

# Known AI generators or synthetic software flags
SYNTHETIC_SOFTWARE_TAGS = [
    "midjourney",
    "dall-e",
    "stable diffusion",
    "adobe firefly",
    "photoshop",
    "gimp",
    "canva",
    "generative fill",
    "runway",
    "comfyui",
]


def extract_exif_data(img_pil: Image.Image):
    """Safely extracts EXIF data from a PIL image into a readable dict."""
    exif_data = {}
    if not img_pil:
        return exif_data

    # Standard PIL EXIF extraction
    try:
        exif = img_pil.getexif()
        if exif:
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                # Keep values safe, convert bytes to string representation if needed
                if isinstance(value, bytes):
                    try:
                        value = value.decode("utf-8", errors="ignore").strip("\x00")
                    except Exception:
                        value = "<binary>"
                exif_data[tag] = str(value)
    except Exception as e:
        logger.warning(f"Error extracting PIL EXIF: {e}")

    return exif_data


from typing import Optional, Dict, Any, List


def evaluate_provenance_and_metadata(
    img_pil: Optional[Image.Image], raw_bytes: Optional[bytes]
) -> Dict[str, Any]:
    evidence: Dict[str, Any] = {
        "provenance_status": "MISSING",
        "issuer": None,
        "origin": None,
        "editing_history": [],
        "metadata_anomalies": [],
        "exif_summary": {},
        "confidence": 0.0,
        "score": 0.0,
    }

    # 1. EXIF Analysis
    exif = extract_exif_data(img_pil) if img_pil is not None else {}
    evidence["exif_summary"] = exif

    software = exif.get("Software", "").lower()
    model = exif.get("Model", "").lower()
    make = exif.get("Make", "").lower()

    claims_physical = bool(
        make or model or exif.get("FocalLength") or exif.get("ExposureTime")
    )
    claims_synthetic = any(t in software for t in SYNTHETIC_SOFTWARE_TAGS) or any(
        t in model for t in SYNTHETIC_SOFTWARE_TAGS
    )

    if claims_synthetic:
        evidence["metadata_anomalies"].append(
            "Software signature indicates synthetic generation or heavy editing."
        )
        evidence["score"] = max(evidence["score"], 0.6)
        evidence["confidence"] = 0.8

    if claims_physical and claims_synthetic:
        evidence["metadata_anomalies"].append(
            "Contradiction: Hardware camera metadata coexists with synthetic software signature."
        )
        evidence["score"] = max(evidence["score"], 0.8)
        evidence["confidence"] = 0.9

    # 2. C2PA (Content Credentials) Analysis
    if c2pa and raw_bytes:
        import tempfile

        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                tmp.write(raw_bytes)
                tmp_path = tmp.name

            try:
                reader = c2pa.Reader.try_create(format_or_path=tmp_path)  # type: ignore
                if reader:
                    manifest_json = reader.json()  # type: ignore
                    if manifest_json:
                        manifest_store = json.loads(manifest_json)
                        active_manifest_id = manifest_store.get("active_manifest")
                        if active_manifest_id:
                            manifests = manifest_store.get("manifests", {})
                            active_manifest = manifests.get(active_manifest_id, {})

                            validation_status = manifest_store.get(
                                "validation_status", []
                            )
                            if not validation_status:
                                evidence["provenance_status"] = "VERIFIED"
                                evidence["confidence"] = 0.99
                            else:
                                evidence["provenance_status"] = "INVALID"
                                evidence["confidence"] = 0.99
                                for err in validation_status:
                                    evidence["metadata_anomalies"].append(
                                        f"C2PA Validation Error: {err.get('code')}"
                                    )

                            signature_info = active_manifest.get("signature_info", {})
                            evidence["issuer"] = signature_info.get("issuer", "Unknown")

                            assertions = active_manifest.get("assertions", [])
                            for assertion in assertions:
                                label = assertion.get("label", "")
                                data = assertion.get("data", {})
                                if label == "c2pa.actions":
                                    for action in data.get("actions", []):
                                        action_name = action.get("action")
                                        if action_name:
                                            evidence["editing_history"].append(
                                                action_name
                                            )
                                        if action_name == "c2pa.created":
                                            evidence["origin"] = action.get(
                                                "parameters", {}
                                            ).get("description", "Created")
                                        if (
                                            action_name
                                            and "generative" in str(action_name).lower()
                                        ):
                                            evidence["score"] = max(
                                                evidence["score"], 0.95
                                            )
                                            evidence["origin"] = "AI Generative Model"

            finally:
                os.unlink(tmp_path)

        except Exception as e:
            logger.error(f"C2PA Parsing Error: {e}")
            evidence["metadata_anomalies"].append("Malformed or unparseable C2PA data.")

    return evidence


def provenance_detector_wrapper(
    data: Dict[str, Any], context: Dict[str, Any]
) -> DetectionSignal:
    img_pil = data.get("img_pil")
    raw_bytes = data.get("raw_bytes")

    if img_pil is None and raw_bytes is None:
        raise ValueError(
            "Either img_pil or raw_bytes is required for provenance detection."
        )

    evidence = evaluate_provenance_and_metadata(img_pil, raw_bytes)

    return DetectionSignal(
        detector_name="ProvenanceAndMetadataForensics",
        detector_version="1.0",
        modality="image",
        score=evidence["score"],
        confidence=evidence["confidence"],
        evidence=evidence,
    )
