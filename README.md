# 3truth AI Forensic Platform

3truth is a local-first forensic analysis platform for text, images, and video. It combines a hardened Node.js gateway, a Python evidence-fusion service, and a framework-free ES-module frontend. The product reports uncertainty and unavailable detectors instead of presenting uncalibrated probabilities as certainty.

## Architecture

```text
Browser (HTML + compiled Tailwind + ES modules)
  -> Node gateway :5001 (validation, limits, CORS, static assets, degraded fallback)
      -> Python forensic service :5003 (text/image/video detector ensembles)
          -> local model artifacts under backend/models
```

All analysis is project-owned and runs locally. No third-party AI-detection API is used. Network model downloads are disabled by default.

Every detector response has a shared evidence contract:

- `ai_probability`, `confidence_score`, and `uncertainty`
- `review_required` and `verdict_status`
- ranked `feature_importance`
- `detector_specific_analysis`
- an `evidence_report` containing fusion method, calibration state, uncertainty reasons, contributors, and unavailable detectors

## Run locally

Prerequisites: Node.js 22+, Python 3.10+, and the Python packages in `backend/requirements.txt`.

```powershell
cd backend
npm install
python -m pip install -r requirements.txt
python src/ml_server.py
```

In a second terminal:

```powershell
cd backend
npm start
```

Open `http://127.0.0.1:5001`. If the Python service is unavailable, the gateway returns an explicitly labeled, high-uncertainty deterministic fallback instead of failing silently.

## Verification

With the gateway running:

```powershell
cd backend
npm run test:integration
npm run tw:build
npm run benchmark
python ../tests/smoke_text_api.py
```

The recorded local benchmark and its scope are in `backend/docs/BENCHMARKS.md`. Model provisioning, calibration requirements, and deployment controls are in `backend/docs/PRODUCTION_MODE.md`.

## Security configuration

- Enable Firebase Email Link authentication and register every production callback domain.
- Deploy `firestore.rules`; the browser may read only its own user record and cannot grant itself an entitlement.
- Set `ALLOWED_ORIGINS` to the exact comma-separated production origins.
- Keep `ALLOW_MODEL_DOWNLOADS=0` at runtime. Provision models separately and verify their manifest/checksums.
- Rotate any credential that was ever committed or shared. A Gmail app password was found in the previous gateway implementation and removed; it must be revoked at the provider because source deletion cannot invalidate a leaked secret.
