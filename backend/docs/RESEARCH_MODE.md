# Research detector configuration

The API uses content-derived detectors as primary evidence. Filename and
ordinary metadata signals are supplementary and receive only 20% of their
declared confidence during fusion.

## Arabic text model

Set `ARABIC_AI_DETECTOR_MODEL` to a local path or Hugging Face identifier for a
fine-tuned Arabic or multilingual AI-authorship sequence classifier. AraBERT,
MARBERT, CAMeLBERT, and multilingual backbones are accepted only when they have
a trained classification head. A base language model with an untrained head is
not accepted.

The model must expose one label containing `ai`, `machine`, or `generated`.
Otherwise set `ARABIC_AI_LABEL_INDEX` explicitly. Network downloads are disabled
by default; set `ALLOW_MODEL_DOWNLOADS=1` only in a controlled provisioning step.
Dialect, code-switching, and Arabizi coverage is limited to what the selected
model card and evaluation dataset demonstrate.

## Confidence calibration

Without `models/fusion_calibration.json`, probabilities are reported as
uncalibrated and confidence cannot be `High`. Fit Platt calibration on a held-out,
representative set containing Arabic MSA, major dialects, mixed Arabic-English,
Arabizi, camera images, generated images, authentic videos, and generated videos:

```powershell
python scripts/fit_fusion_calibration.py held_out_reports.jsonl models/fusion_calibration.json
```

Each JSONL row needs `modality`, `label`, and the raw probability from
`evidence_report.fusion.raw_probability`. Do not calibrate on training data.

Unavailable detectors remain in `evidence_report.detectors` with a reason. They
are never assigned an estimated score and never enter fusion.
