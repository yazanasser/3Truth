# Production detector

## Runtime contract

The browser talks only to the Node gateway. The gateway enforces origin, body,
upload, and timeout limits and delegates to the Python evidence service over a
private loopback or service network. Configure these values in the process
environment:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5001` | Node gateway port |
| `ALLOWED_ORIGINS` | local development origins | exact comma-separated browser origins |
| `JSON_BODY_LIMIT` | `1mb` | Express JSON request limit |
| `MAX_UPLOAD_BYTES` | `104857600` | multipart file limit |
| `PYTHON_SERVICE_URL` | `http://127.0.0.1:5003` | private Python service URL |
| `PYTHON_HEALTH_TIMEOUT_MS` | `5000` | health probe budget; covers CPU model cold start |
| `PYTHON_TEXT_TIMEOUT_MS` | `45000` | text inference budget |
| `PYTHON_IMAGE_TIMEOUT_MS` | `90000` | image inference budget |
| `PYTHON_VIDEO_TIMEOUT_MS` | `120000` | video inference budget |
| `ALLOW_MODEL_DOWNLOADS` | `0` | opt-in network provisioning only |

Keep model downloading disabled in the serving process. Provision artifacts in
a controlled job, verify the source, license, label mapping, and checksum, then
deploy the immutable model directory.

The `python src/ml_server.py` entry point uses Flask's development server and is
for local verification only. In production, expose the `ml_server:app` WSGI
application through a production process manager on a private interface, place
the Node gateway behind TLS and authenticated rate limiting, and configure
health/readiness checks independently. Do not publish port 5003.

The gateway's deterministic fallback is an availability feature, not an
equivalent substitute for the trained ensemble. It is labeled degraded mode,
raises uncertainty, and includes the missing-service reason in the evidence
report.

## Provisioned runtime

- Fine-tuned AraBERT Arabic AI-authorship classifier.
- Calibrated CPU Arabic character/word classifier with a paired-group held-out
  test result of 93.98% accuracy and 93.78% F1 on the available research corpus.
- General AI-image ViT, SDXL specialist ViT, and StyleGAN-face specialist ViT.
- FFT, DCT, wavelet, JPEG-block, ELA, PRNU-residual, texture, lighting,
  shadow-boundary, and perspective-line analysis.
- Farneback optical flow, temporal/flicker/scene consistency, KLT feature-region
  tracking, MediaPipe facial landmarks, eye-aspect-ratio blinks, PnP head pose,
  mouth/audio correlation, PyAV codec inspection, and librosa spectrograms.
- `faster-whisper-small` CPU INT8 speech recognition with Arabic transcript
  authorship analysis.

CPU ASR runs in an isolated worker with a 20-second default latency budget
(`ASR_TIMEOUT_SECONDS`). A timeout is reported as detector failure without
blocking the rest of the video report.

Model weights are installed locally under `backend/models/` and intentionally
ignored by Git. Their source identifiers and label maps are recorded in
`model_manifest.json`.

The Wav2Vec2 audio-deepfake checkpoint is provisioned at
`models/audio_deepfake`. Spectrogram analysis, audio decoding, lip correlation,
and Arabic ASR remain independent evidence channels.

## Arabic ensemble training

Prepare a reproducible research corpus from the pinned SDAIA-KFUPM datasets:

```powershell
python scripts/prepare_arabic_detection_dataset.py --overwrite
```

This creates a balanced `data/train.jsonl` and `data/DATASET_MANIFEST.json`.
The source cards currently declare no SPDX license, so the generated corpus is
research-only unless suitable deployment rights are obtained from the owners.

The four requested encoders are base language models, not interchangeable
AI-authorship detectors. The training script extracts frozen embeddings from all
four encoders, checkpoints each output, and trains a calibrated fusion MLP:

```powershell
python scripts/train_arabic_text_ensemble.py `
  --dataset-dir data `
  --dataset-file arageneval.jsonl `
  --dataset-file kfupm_abstracts.jsonl `
  --dataset-file dialect_code_switch_arabizi.jsonl `
  --artifacts-dir models/arabic_text_fusion `
  --dataset-cache-dir data/datasets_cache `
  --hf-cache-dir models/huggingface_cache
```

Each row must contain `text`, binary `label`, and preferably a leakage-control
field such as `group`, `source`, or `document_id`. The training corpus should hold out entire
domains and generator families, including GPT, Claude, Gemini, Llama, Qwen,
DeepSeek, Mistral, Jais, and ALLAM. Do not report production accuracy until the
separate test groups include every claimed dialect and code-switching mode.

The script downloads missing AraBERT, MARBERT, CAMeLBERT, and XLM-R assets into
the cache, saves per-encoder embeddings plus `fusion_classifier.pt`, and writes
both `fusion_report.json` and `fusion_report.txt`. It aborts fusion if any encoder
output is absent.

## Fusion training

Generate labeled detector reports and train one fusion artifact per modality:

```powershell
python scripts/train_fusion_model.py reports.jsonl models/fusion/text.joblib --modality text
python scripts/train_fusion_model.py reports.jsonl models/fusion/image.joblib --modality image
python scripts/train_fusion_model.py reports.jsonl models/fusion/video.joblib --modality video
```

Fusion uses detector scores, availability masks, and confidence features. The
training script performs source-group splits, trains logistic meta-classification,
and fits isotonic calibration on a separate validation partition. Runtime output
includes each detector's learned coefficient as `weight_in_fusion_model`.

Without a trained modality fusion artifact, the API returns a low-confidence
binary threshold decision and records the missing calibration under
`uncertainty_reasons`. Such fallback probabilities are not calibrated output.

## Current host constraint

This host has no CUDA device. It can run CPU inference, but it cannot practically
fine-tune four 110M-parameter transformer families on the requested large corpus.
Use the provided training script on a CUDA GPU and deploy the exported directories
to the paths in `model_manifest.json`.
