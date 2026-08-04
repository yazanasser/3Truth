#!/usr/bin/env python3
"""Train a calibrated CPU-friendly Arabic AI-authorship classifier."""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
    roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import FeatureUnion


LOGGER = logging.getLogger("train_arabic_cpu_classifier")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=Path("data/train.jsonl"))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("backend/models/arabic_text/classical.joblib"),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("backend/models/arabic_text/classical_report.json"),
    )
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def load_records(path: Path) -> tuple[list[str], np.ndarray, np.ndarray]:
    if not path.is_file() or path.stat().st_size == 0:
        raise FileNotFoundError(f"Training dataset is missing or empty: {path.resolve()}")

    texts: list[str] = []
    labels: list[int] = []
    groups: list[str] = []
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            record = json.loads(line)
            text = str(record.get("text", "")).strip()
            label = int(record.get("label", -1))
            group = str(record.get("group", "")).strip()
            if not text or label not in {0, 1} or not group:
                raise ValueError(f"Invalid record at {path}:{line_number}")
            texts.append(text)
            labels.append(label)
            groups.append(group)
    return texts, np.asarray(labels, dtype=np.int64), np.asarray(groups, dtype=object)


def split_indices(labels: np.ndarray, groups: np.ndarray, seed: int) -> dict[str, np.ndarray]:
    indices = np.arange(len(labels))
    outer = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=seed)
    train_val, test = next(outer.split(indices, labels, groups))
    inner = GroupShuffleSplit(n_splits=1, test_size=0.125, random_state=seed + 1)
    train_rel, validation_rel = next(
        inner.split(train_val, labels[train_val], groups[train_val])
    )
    return {
        "train": train_val[train_rel],
        "validation": train_val[validation_rel],
        "test": test,
    }


def metrics(labels: np.ndarray, probabilities: np.ndarray, threshold: float) -> dict:
    predictions = (probabilities >= threshold).astype(np.int64)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, predictions, average="binary", zero_division=0
    )
    return {
        "accuracy": float(accuracy_score(labels, predictions)),
        "balanced_accuracy": float(balanced_accuracy_score(labels, predictions)),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "roc_auc": float(roc_auc_score(labels, probabilities)),
        "confusion_matrix": confusion_matrix(labels, predictions, labels=[0, 1]).tolist(),
    }


def select_threshold(labels: np.ndarray, probabilities: np.ndarray) -> float:
    candidates = np.linspace(0.25, 0.75, 201)
    scored = [
        (balanced_accuracy_score(labels, probabilities >= threshold), -abs(threshold - 0.5), threshold)
        for threshold in candidates
    ]
    return float(max(scored)[2])


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    args = parse_args()
    texts, labels, groups = load_records(args.dataset)
    splits = split_indices(labels, groups, args.seed)
    LOGGER.info(
        "Rows=%d train=%d validation=%d test=%d",
        len(texts),
        len(splits["train"]),
        len(splits["validation"]),
        len(splits["test"]),
    )

    vectorizer = FeatureUnion(
        [
            (
                "characters",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    min_df=2,
                    max_df=0.995,
                    max_features=80_000,
                    sublinear_tf=True,
                    dtype=np.float32,
                ),
            ),
            (
                "words",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    min_df=2,
                    max_df=0.995,
                    max_features=40_000,
                    sublinear_tf=True,
                    dtype=np.float32,
                    token_pattern=r"(?u)\b\w+\b",
                ),
            ),
        ]
    )
    train_texts = [texts[index] for index in splits["train"]]
    LOGGER.info("Fitting Arabic character and word features.")
    train_features = vectorizer.fit_transform(train_texts)
    classifier = SGDClassifier(
        loss="log_loss",
        penalty="elasticnet",
        alpha=1e-5,
        l1_ratio=0.05,
        max_iter=150,
        tol=1e-4,
        class_weight="balanced",
        average=True,
        random_state=args.seed,
    )
    classifier.fit(train_features, labels[splits["train"]])

    validation_features = vectorizer.transform(
        [texts[index] for index in splits["validation"]]
    )
    validation_raw = classifier.predict_proba(validation_features)[:, 1]
    calibrator = IsotonicRegression(out_of_bounds="clip")
    validation_probabilities = calibrator.fit_transform(
        validation_raw, labels[splits["validation"]]
    )
    threshold = select_threshold(labels[splits["validation"]], validation_probabilities)

    test_features = vectorizer.transform([texts[index] for index in splits["test"]])
    test_raw = classifier.predict_proba(test_features)[:, 1]
    test_probabilities = calibrator.predict(test_raw)
    validation_metrics = metrics(
        labels[splits["validation"]], validation_probabilities, threshold
    )
    test_metrics = metrics(labels[splits["test"]], test_probabilities, threshold)

    artifact = {
        "schema_version": 1,
        "vectorizer": vectorizer,
        "classifier": classifier,
        "calibrator": calibrator,
        "threshold": threshold,
        "validation_metrics": validation_metrics,
        "test_metrics": test_metrics,
        "training_rows": len(splits["train"]),
        "dataset": str(args.dataset.resolve()),
        "coverage": "Arabic academic abstracts and informal review text; four AI generators",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    joblib.dump(artifact, temporary, compress=3)
    temporary.replace(args.output)

    report = {
        key: value
        for key, value in artifact.items()
        if key not in {"vectorizer", "classifier", "calibrator"}
    }
    args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")
    LOGGER.info("Validation metrics: %s", validation_metrics)
    LOGGER.info("Test metrics: %s", test_metrics)
    LOGGER.info("Saved %s", args.output)


if __name__ == "__main__":
    main()
