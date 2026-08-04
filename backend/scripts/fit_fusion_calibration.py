"""Fit Platt calibration from held-out detector reports.

Input is JSONL with `modality`, binary `label` (1=AI, 0=human/authentic),
and either `raw_probability` or `evidence_report.fusion.raw_probability`.
Do not fit this on the detector training set.
"""

import argparse
import json
import math
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss


def logit(probability):
    probability = min(1.0 - 1e-6, max(1e-6, float(probability)))
    return math.log(probability / (1.0 - probability))


def load_rows(path):
    grouped = {"text": [], "image": [], "video": []}
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            row = json.loads(line)
            modality = row.get("modality")
            if modality not in grouped:
                raise ValueError(f"Line {line_number}: invalid modality {modality!r}")
            probability = row.get("raw_probability")
            if probability is None:
                probability = row.get("evidence_report", {}).get("fusion", {}).get("raw_probability")
            if probability is None or row.get("label") not in (0, 1):
                raise ValueError(f"Line {line_number}: raw probability and binary label are required")
            grouped[modality].append((float(probability), int(row["label"])))
    return grouped


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="Held-out labeled JSONL detector reports")
    parser.add_argument("output", type=Path, help="fusion_calibration.json destination")
    parser.add_argument("--minimum-samples", type=int, default=100)
    args = parser.parse_args()

    output = {}
    for modality, rows in load_rows(args.input).items():
        if not rows:
            continue
        labels = np.asarray([label for _, label in rows], dtype=np.int64)
        if len(rows) < args.minimum_samples or len(np.unique(labels)) != 2:
            raise ValueError(f"{modality}: need at least {args.minimum_samples} rows containing both classes")
        features = np.asarray([[logit(probability)] for probability, _ in rows], dtype=np.float64)
        model = LogisticRegression(C=1e6, solver="lbfgs")
        model.fit(features, labels)
        calibrated = model.predict_proba(features)[:, 1]
        output[modality] = {
            "slope": float(model.coef_[0, 0]),
            "intercept": float(model.intercept_[0]),
            "sample_count": len(rows),
            "positive_count": int(labels.sum()),
            "brier_score": float(brier_score_loss(labels, calibrated)),
            "log_loss": float(log_loss(labels, calibrated)),
            "source": str(args.input)
        }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
