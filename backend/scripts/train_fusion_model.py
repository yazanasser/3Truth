"""Train and isotonic-calibrate a modality fusion classifier from held-out reports."""

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit


def load_rows(path, modality):
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            row = json.loads(line)
            if row.get("modality") != modality:
                continue
            if row.get("label") not in (0, 1):
                raise ValueError(f"Line {line_number}: binary label is required")
            detectors = row.get("evidence_report", {}).get("detectors", [])
            if not detectors:
                raise ValueError(f"Line {line_number}: evidence_report.detectors is required")
            rows.append({
                "label": int(row["label"]),
                "group": str(row.get("group") or row.get("source") or f"row-{line_number}"),
                "detectors": {item["name"]: item for item in detectors},
            })
    return rows


def build_matrix(rows, detector_names):
    feature_names = []
    for name in detector_names:
        feature_names.extend([f"score::{name}", f"available::{name}", f"confidence::{name}"])
    matrix = []
    for row in rows:
        features = []
        for name in detector_names:
            detector = row["detectors"].get(name)
            available = bool(detector and detector.get("available") and detector.get("score") is not None)
            features.extend([
                float(detector["score"]) if available else 0.5,
                1.0 if available else 0.0,
                float(detector.get("confidence", 0.0)) if detector else 0.0,
            ])
        matrix.append(features)
    return np.asarray(matrix, dtype=np.float64), feature_names


def split_groups(rows, seed):
    labels = np.asarray([row["label"] for row in rows])
    groups = np.asarray([row["group"] for row in rows])
    indexes = np.arange(len(rows))
    first = GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=seed)
    train, holdout = next(first.split(indexes, labels, groups))
    second = GroupShuffleSplit(n_splits=1, test_size=0.50, random_state=seed + 1)
    validation_rel, test_rel = next(second.split(holdout, labels[holdout], groups[holdout]))
    return train, holdout[validation_rel], holdout[test_rel]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--modality", required=True, choices=["text", "image", "video"])
    parser.add_argument("--minimum-samples", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rows = load_rows(args.input, args.modality)
    if len(rows) < args.minimum_samples:
        raise ValueError(f"Need at least {args.minimum_samples} labeled {args.modality} reports; found {len(rows)}")
    detector_names = sorted({name for row in rows for name in row["detectors"]})
    matrix, feature_names = build_matrix(rows, detector_names)
    labels = np.asarray([row["label"] for row in rows], dtype=np.int64)
    train, validation, test = split_groups(rows, args.seed)
    for split_name, split in [("train", train), ("validation", validation), ("test", test)]:
        if len(np.unique(labels[split])) != 2:
            raise ValueError(f"{split_name} split does not contain both classes; provide more source groups")

    model = LogisticRegression(max_iter=4000, class_weight="balanced", C=0.5)
    model.fit(matrix[train], labels[train])
    validation_raw = model.predict_proba(matrix[validation])[:, 1]
    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(validation_raw, labels[validation])
    test_raw = model.predict_proba(matrix[test])[:, 1]
    test_probability = calibrator.predict(test_raw)

    detector_weights = {}
    for name in detector_names:
        score_index = feature_names.index(f"score::{name}")
        detector_weights[name] = float(model.coef_[0, score_index])

    metrics = {
        "sample_count": len(rows),
        "train_count": len(train),
        "validation_count": len(validation),
        "test_count": len(test),
        "roc_auc": float(roc_auc_score(labels[test], test_probability)),
        "brier_score": float(brier_score_loss(labels[test], test_probability)),
        "log_loss": float(log_loss(labels[test], np.clip(test_probability, 1e-6, 1 - 1e-6))),
    }
    artifact = {
        "model": model,
        "calibrator": calibrator,
        "calibration_method": "isotonic",
        "feature_names": feature_names,
        "detector_weights": detector_weights,
        "metrics": metrics,
        "modality": args.modality,
        "source": str(args.input),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, args.output)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
