#!/usr/bin/env python3
"""Train an Arabic four-encoder fusion classifier.

The script validates input files first, downloads missing Hugging Face assets,
extracts one embedding per text from every encoder, checkpoints those fusion
artifacts, and trains a calibrated binary fusion classifier.
"""

from __future__ import annotations

import argparse
import gc
import json
import logging
import os
import random
import sys
from contextlib import nullcontext
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import torch
from datasets import Dataset, concatenate_datasets, load_dataset
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
    roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit, train_test_split
from torch import nn
from torch.utils.data import DataLoader, TensorDataset
from transformers import AutoModel, AutoTokenizer


LOGGER = logging.getLogger("arabic_fusion_training")

MODEL_SPECS = {
    "arabert": "aubmindlab/bert-base-arabertv2",
    "marbert": "UBC-NLP/MARBERT",
    "camelbert": "CAMeL-Lab/bert-base-arabic-camelbert-mix",
    "xlmr": "xlm-roberta-base",
}

HUMAN_LABELS = {"0", "human", "real", "authentic"}
AI_LABELS = {"1", "ai", "generated", "synthetic", "machine"}


class FusionClassifier(nn.Module):
    """Small MLP trained over concatenated frozen encoder embeddings."""

    def __init__(self, input_dim: int, hidden_dim: int, dropout: float) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, 2),
        )

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        return self.network(features)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract Arabic transformer embeddings and train fusion classifier."
    )
    parser.add_argument(
        "--dataset-dir",
        type=Path,
        default=Path("data"),
        help="Directory containing the training data (default: ./data).",
    )
    parser.add_argument(
        "--dataset-file",
        action="append",
        type=Path,
        default=[],
        help="Dataset file, absolute or relative to --dataset-dir. Repeat as needed.",
    )
    parser.add_argument(
        "--expected-file",
        action="append",
        type=Path,
        default=[],
        help="Required file relative to --dataset-dir. Repeat as needed.",
    )
    parser.add_argument(
        "--artifacts-dir",
        "--output",
        dest="artifacts_dir",
        type=Path,
        default=Path("artifacts"),
        help="Fusion artifact and report output directory.",
    )
    parser.add_argument(
        "--hf-cache-dir",
        type=Path,
        default=Path("models/huggingface_cache"),
        help="Persistent Hugging Face model/tokenizer cache.",
    )
    parser.add_argument(
        "--dataset-cache-dir",
        type=Path,
        default=Path("data/datasets_cache"),
        help="Writable Hugging Face datasets cache inside the workspace.",
    )
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--embedding-batch-size", type=int, default=8)
    parser.add_argument("--fusion-batch-size", type=int, default=64)
    parser.add_argument("--fusion-epochs", type=int, default=30)
    parser.add_argument("--fusion-hidden-dim", type=int, default=256)
    parser.add_argument("--fusion-dropout", type=float, default=0.2)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--early-stopping-patience", type=int, default=5)
    parser.add_argument("--minimum-samples", type=int, default=100)
    parser.add_argument("--minimum-text-chars", type=int, default=20)
    parser.add_argument("--cpu-threads", type=int, default=None)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Use only locally cached Hugging Face assets; never download.",
    )
    parser.add_argument(
        "--reuse-artifacts",
        action="store_true",
        help="Reuse valid per-model embedding artifacts instead of extracting again.",
    )
    return parser.parse_args()


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def validate_dataset_inputs(
    dataset_dir: Path,
    dataset_files: Iterable[Path],
    expected_files: Iterable[Path],
) -> list[Path]:
    """Fail before device/model setup when required training data is absent."""

    root = dataset_dir.expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(
            f"Dataset directory does not exist: {root}\n"
            "Create it and place the training data there, for example:\n"
            f"  {root / 'train.jsonl'}\n"
            "Each row must contain at least: "
            '{"text": "Arabic text", "label": 0 or 1}. '
        )
    if not root.is_dir():
        raise FileNotFoundError(f"Dataset path is not a directory: {root}")

    requested = list(dataset_files) + list(expected_files)
    if not requested:
        requested = [Path("train.jsonl")]

    resolved: list[Path] = []
    missing: list[Path] = []
    for item in requested:
        path = item.expanduser()
        path = path.resolve() if path.is_absolute() else (root / path).resolve()
        if not path.is_file() or path.stat().st_size == 0:
            missing.append(path)
        else:
            resolved.append(path)

    if missing:
        formatted = "\n".join(f"  - {path}" for path in missing)
        raise FileNotFoundError(
            "Required training dataset files are missing or empty:\n"
            f"{formatted}\n"
            f"Place JSON, JSONL, CSV, or Parquet files under {root}, or pass "
            "--dataset-file with the correct path. Required fields are 'text' "
            "and 'label' (0=human, 1=AI)."
        )

    unsupported = [
        path for path in resolved if path.suffix.lower() not in {".json", ".jsonl", ".csv", ".parquet"}
    ]
    if unsupported:
        raise ValueError(
            "Unsupported dataset format(s): "
            + ", ".join(str(path) for path in unsupported)
            + ". Supported formats: .json, .jsonl, .csv, .parquet."
        )

    LOGGER.info("Dataset preflight passed for %d file(s).", len(resolved))
    return resolved


def configure_device(cpu_threads: int | None) -> torch.device:
    if torch.cuda.is_available():
        device = torch.device("cuda")
        properties = torch.cuda.get_device_properties(device)
        LOGGER.info(
            "CUDA available: %s (%.1f GiB).",
            properties.name,
            properties.total_memory / (1024**3),
        )
        torch.backends.cudnn.benchmark = True
        return device

    threads = cpu_threads or min(max(os.cpu_count() or 1, 1), 8)
    torch.set_num_threads(threads)
    try:
        torch.set_num_interop_threads(max(1, min(threads // 2, 4)))
    except RuntimeError:
        # PyTorch allows this setting only before inter-op work starts.
        LOGGER.debug("Could not change PyTorch inter-op thread count.")
    LOGGER.warning(
        "CUDA is unavailable. Falling back to CPU with %d PyTorch threads; "
        "four-model embedding extraction will be substantially slower.",
        threads,
    )
    return torch.device("cpu")


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def load_one_dataset(path: Path, cache_dir: Path) -> Dataset:
    suffix = path.suffix.lower()
    loader = "json" if suffix in {".json", ".jsonl"} else suffix.lstrip(".")
    return load_dataset(
        loader, data_files=str(path), split="train", cache_dir=str(cache_dir)
    )


def parse_binary_label(value: Any) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, np.integer)) and int(value) in {0, 1}:
        return int(value)
    normalized = str(value).strip().lower()
    if normalized in HUMAN_LABELS:
        return 0
    if normalized in AI_LABELS:
        return 1
    raise ValueError(
        f"Unsupported label {value!r}. Use 0/human or 1/ai for every sample."
    )


def load_and_normalize_dataset(
    paths: list[Path],
    minimum_samples: int,
    minimum_text_chars: int,
    cache_dir: Path,
) -> Dataset:
    datasets: list[Dataset] = []
    cache_dir.mkdir(parents=True, exist_ok=True)
    for path in paths:
        dataset = load_one_dataset(path, cache_dir)
        if "text" not in dataset.column_names or "label" not in dataset.column_names:
            raise ValueError(
                f"Dataset {path} must contain 'text' and 'label' columns; "
                f"found: {dataset.column_names}."
            )
        source = path.stem

        def normalize(row: dict[str, Any], index: int) -> dict[str, Any]:
            text = str(row.get("text", "")).strip()
            group = row.get("group") or row.get("document_id") or row.get("source")
            return {
                "text": text,
                "label": parse_binary_label(row.get("label")),
                "group": str(group) if group is not None else source,
                "sample_id": f"{source}:{index}",
            }

        dataset = dataset.map(
            normalize,
            with_indices=True,
            remove_columns=dataset.column_names,
            desc=f"Normalizing {path.name}",
        )
        dataset = dataset.filter(
            lambda row: len(row["text"]) >= minimum_text_chars,
            desc=f"Filtering short rows from {path.name}",
        )
        datasets.append(dataset)

    combined = concatenate_datasets(datasets) if len(datasets) > 1 else datasets[0]
    if len(combined) < minimum_samples:
        raise ValueError(
            f"Only {len(combined)} valid rows remain; at least {minimum_samples} are "
            "required. Add more labeled Arabic human and AI text or lower "
            "--minimum-samples for a smoke test."
        )

    labels = np.asarray(combined["label"], dtype=np.int64)
    counts = np.bincount(labels, minlength=2)
    if np.any(counts == 0):
        raise ValueError(
            f"Both classes are required; found human={counts[0]}, AI={counts[1]}."
        )
    LOGGER.info(
        "Loaded %d rows: %d human and %d AI.", len(combined), counts[0], counts[1]
    )
    return combined


def create_split_indices(
    labels: np.ndarray, groups: np.ndarray, seed: int
) -> dict[str, np.ndarray]:
    indices = np.arange(len(labels))
    unique_groups = np.unique(groups)

    if len(unique_groups) >= 5:
        outer = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=seed)
        train_val_idx, test_idx = next(outer.split(indices, labels, groups))
        inner = GroupShuffleSplit(n_splits=1, test_size=0.125, random_state=seed + 1)
        train_rel, val_rel = next(
            inner.split(train_val_idx, labels[train_val_idx], groups[train_val_idx])
        )
        train_idx = train_val_idx[train_rel]
        val_idx = train_val_idx[val_rel]
    else:
        LOGGER.warning(
            "Only %d unique group(s) found. Using a stratified row split; add a "
            "'group' or 'document_id' column to prevent source leakage.",
            len(unique_groups),
        )
        train_val_idx, test_idx = train_test_split(
            indices, test_size=0.2, random_state=seed, stratify=labels
        )
        train_idx, val_idx = train_test_split(
            train_val_idx,
            test_size=0.125,
            random_state=seed + 1,
            stratify=labels[train_val_idx],
        )

    split = {
        "train": np.asarray(train_idx, dtype=np.int64),
        "validation": np.asarray(val_idx, dtype=np.int64),
        "test": np.asarray(test_idx, dtype=np.int64),
    }
    for name, values in split.items():
        if len(np.unique(labels[values])) < 2:
            raise ValueError(
                f"The {name} split contains only one class. Add more diverse groups "
                "or samples before training."
            )
    return split


def masked_mean_pool(
    hidden_state: torch.Tensor, attention_mask: torch.Tensor
) -> torch.Tensor:
    mask = attention_mask.unsqueeze(-1).to(hidden_state.dtype)
    summed = (hidden_state * mask).sum(dim=1)
    return summed / mask.sum(dim=1).clamp_min(1e-6)


def atomic_torch_save(payload: Any, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    torch.save(payload, temporary)
    temporary.replace(destination)


def extract_embeddings(
    model_key: str,
    model_id: str,
    texts: list[str],
    device: torch.device,
    cache_dir: Path,
    max_length: int,
    batch_size: int,
    offline: bool,
) -> torch.Tensor:
    LOGGER.info("Loading %s from %s.", model_key, model_id)
    common_kwargs = {
        "cache_dir": str(cache_dir),
        "local_files_only": offline,
    }
    tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=True, **common_kwargs)
    model = AutoModel.from_pretrained(model_id, **common_kwargs)
    model.eval().to(device)

    chunks: list[torch.Tensor] = []
    for start in range(0, len(texts), batch_size):
        batch_text = texts[start : start + batch_size]
        encoded = tokenizer(
            batch_text,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
        )
        encoded = {name: tensor.to(device) for name, tensor in encoded.items()}
        autocast_context = (
            torch.autocast(device_type="cuda", dtype=torch.float16)
            if device.type == "cuda"
            else nullcontext()
        )
        with torch.inference_mode(), autocast_context:
            output = model(**encoded)
            hidden_state = getattr(output, "last_hidden_state", None)
            if hidden_state is None:
                raise RuntimeError(f"{model_key} did not return last_hidden_state.")
            pooled = masked_mean_pool(hidden_state, encoded["attention_mask"])
        chunks.append(pooled.detach().float().cpu())

        processed = min(start + batch_size, len(texts))
        if processed == len(texts) or processed % max(batch_size * 100, 1) == 0:
            LOGGER.info("%s embeddings: %d/%d", model_key, processed, len(texts))

    embeddings = torch.cat(chunks, dim=0)
    if embeddings.shape[0] != len(texts) or not torch.isfinite(embeddings).all():
        raise RuntimeError(
            f"Invalid {model_key} embedding output: shape={tuple(embeddings.shape)}."
        )

    del model, tokenizer, encoded, chunks
    gc.collect()
    if device.type == "cuda":
        torch.cuda.empty_cache()
    return embeddings


def valid_reusable_artifact(
    artifact: dict[str, Any], model_id: str, sample_ids: list[str]
) -> bool:
    embeddings = artifact.get("embeddings")
    return (
        artifact.get("model_id") == model_id
        and artifact.get("sample_ids") == sample_ids
        and isinstance(embeddings, torch.Tensor)
        and embeddings.ndim == 2
        and embeddings.shape[0] == len(sample_ids)
        and bool(torch.isfinite(embeddings).all())
    )


def build_fusion_artifacts(
    dataset: Dataset,
    device: torch.device,
    artifacts_dir: Path,
    cache_dir: Path,
    max_length: int,
    batch_size: int,
    offline: bool,
    reuse_artifacts: bool,
) -> dict[str, torch.Tensor]:
    texts = [str(text) for text in dataset["text"]]
    labels = torch.tensor(dataset["label"], dtype=torch.long)
    sample_ids = [str(value) for value in dataset["sample_id"]]
    outputs: dict[str, torch.Tensor] = {}
    failures: dict[str, str] = {}

    for model_key, model_id in MODEL_SPECS.items():
        artifact_path = artifacts_dir / f"{model_key}_embeddings.pt"
        try:
            artifact: dict[str, Any] | None = None
            if reuse_artifacts and artifact_path.is_file():
                candidate = torch.load(artifact_path, map_location="cpu", weights_only=False)
                if isinstance(candidate, dict) and valid_reusable_artifact(
                    candidate, model_id, sample_ids
                ):
                    artifact = candidate
                    LOGGER.info("Reusing %s.", artifact_path)
                else:
                    LOGGER.warning("Ignoring stale or invalid artifact %s.", artifact_path)

            if artifact is None:
                embeddings = extract_embeddings(
                    model_key=model_key,
                    model_id=model_id,
                    texts=texts,
                    device=device,
                    cache_dir=cache_dir,
                    max_length=max_length,
                    batch_size=batch_size,
                    offline=offline,
                )
                artifact = {
                    "schema_version": 1,
                    "model_key": model_key,
                    "model_id": model_id,
                    "pooling": "attention_mask_mean",
                    "sample_ids": sample_ids,
                    "labels": labels,
                    "embeddings": embeddings.to(torch.float16),
                }
                atomic_torch_save(artifact, artifact_path)
                LOGGER.info("Saved %s fusion artifact to %s.", model_key, artifact_path)

            outputs[model_key] = artifact["embeddings"].float()
        except Exception as exc:  # Keep trying so the log reports every missing encoder.
            failures[model_key] = f"{type(exc).__name__}: {exc}"
            LOGGER.exception("Failed to produce embeddings for %s.", model_key)

    missing = [key for key in MODEL_SPECS if key not in outputs]
    if failures or missing:
        detail = "; ".join(f"{key}={value}" for key, value in failures.items())
        raise RuntimeError(
            "Fusion training aborted because every model output is required. "
            f"Missing outputs: {missing}. Failures: {detail}"
        )

    row_counts = {tensor.shape[0] for tensor in outputs.values()}
    if row_counts != {len(dataset)}:
        raise RuntimeError(f"Fusion artifact row counts do not match: {row_counts}.")
    return outputs


def compute_metrics(labels: np.ndarray, probabilities: np.ndarray) -> dict[str, Any]:
    predictions = probabilities.argmax(axis=1)
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, predictions, average="binary", zero_division=0
    )
    metrics: dict[str, Any] = {
        "accuracy": float(accuracy_score(labels, predictions)),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "confusion_matrix": confusion_matrix(labels, predictions, labels=[0, 1]).tolist(),
    }
    try:
        metrics["roc_auc"] = float(roc_auc_score(labels, probabilities[:, 1]))
    except ValueError:
        metrics["roc_auc"] = None
    return metrics


def evaluate_model(
    model: nn.Module,
    features: torch.Tensor,
    labels: torch.Tensor,
    indices: np.ndarray,
    device: torch.device,
    batch_size: int,
    temperature: float = 1.0,
) -> tuple[float, dict[str, Any]]:
    loader = DataLoader(
        TensorDataset(features[indices], labels[indices]),
        batch_size=batch_size,
        shuffle=False,
    )
    criterion = nn.CrossEntropyLoss()
    losses: list[float] = []
    all_probabilities: list[np.ndarray] = []
    all_labels: list[np.ndarray] = []
    model.eval()
    with torch.inference_mode():
        for batch_features, batch_labels in loader:
            batch_features = batch_features.to(device)
            batch_labels = batch_labels.to(device)
            logits = model(batch_features) / temperature
            losses.append(float(criterion(logits, batch_labels).item()))
            all_probabilities.append(torch.softmax(logits, dim=1).cpu().numpy())
            all_labels.append(batch_labels.cpu().numpy())
    probabilities = np.concatenate(all_probabilities)
    targets = np.concatenate(all_labels)
    return float(np.mean(losses)), compute_metrics(targets, probabilities)


def fit_temperature(
    model: nn.Module,
    features: torch.Tensor,
    labels: torch.Tensor,
    indices: np.ndarray,
    device: torch.device,
    batch_size: int,
) -> float:
    """Fit one positive temperature on the held-out validation logits."""

    loader = DataLoader(
        TensorDataset(features[indices], labels[indices]),
        batch_size=batch_size,
        shuffle=False,
    )
    logits: list[torch.Tensor] = []
    targets: list[torch.Tensor] = []
    model.eval()
    with torch.inference_mode():
        for batch_features, batch_labels in loader:
            logits.append(model(batch_features.to(device)).detach())
            targets.append(batch_labels.to(device))

    validation_logits = torch.cat(logits)
    validation_targets = torch.cat(targets)
    log_temperature = nn.Parameter(torch.zeros((), device=device))
    optimizer = torch.optim.LBFGS(
        [log_temperature], lr=0.1, max_iter=50, line_search_fn="strong_wolfe"
    )
    criterion = nn.CrossEntropyLoss()

    def closure() -> torch.Tensor:
        optimizer.zero_grad(set_to_none=True)
        temperature = log_temperature.exp().clamp(0.05, 20.0)
        loss = criterion(validation_logits / temperature, validation_targets)
        loss.backward()
        return loss

    optimizer.step(closure)
    temperature = float(log_temperature.exp().clamp(0.05, 20.0).detach().cpu())
    LOGGER.info("Fitted validation temperature: %.6f", temperature)
    return temperature


def train_fusion_classifier(
    features: torch.Tensor,
    labels: torch.Tensor,
    splits: dict[str, np.ndarray],
    device: torch.device,
    args: argparse.Namespace,
) -> tuple[FusionClassifier, dict[str, Any], torch.Tensor, torch.Tensor, int, float]:
    train_indices = splits["train"]
    mean = features[train_indices].mean(dim=0)
    std = features[train_indices].std(dim=0).clamp_min(1e-6)
    normalized = (features - mean) / std

    model = FusionClassifier(
        input_dim=normalized.shape[1],
        hidden_dim=args.fusion_hidden_dim,
        dropout=args.fusion_dropout,
    ).to(device)
    train_labels = labels[train_indices]
    class_counts = torch.bincount(train_labels, minlength=2).float()
    class_weights = class_counts.sum() / (2.0 * class_counts.clamp_min(1.0))
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=args.learning_rate, weight_decay=args.weight_decay
    )
    train_loader = DataLoader(
        TensorDataset(normalized[train_indices], train_labels),
        batch_size=args.fusion_batch_size,
        shuffle=True,
    )

    best_state: dict[str, torch.Tensor] | None = None
    best_f1 = -1.0
    best_epoch = 0
    stale_epochs = 0
    history: list[dict[str, Any]] = []

    for epoch in range(1, args.fusion_epochs + 1):
        model.train()
        train_losses: list[float] = []
        for batch_features, batch_labels in train_loader:
            batch_features = batch_features.to(device)
            batch_labels = batch_labels.to(device)
            optimizer.zero_grad(set_to_none=True)
            logits = model(batch_features)
            loss = criterion(logits, batch_labels)
            loss.backward()
            optimizer.step()
            train_losses.append(float(loss.item()))

        validation_loss, validation_metrics = evaluate_model(
            model,
            normalized,
            labels,
            splits["validation"],
            device,
            args.fusion_batch_size,
        )
        epoch_result = {
            "epoch": epoch,
            "train_loss": float(np.mean(train_losses)),
            "validation_loss": validation_loss,
            **{f"validation_{key}": value for key, value in validation_metrics.items()},
        }
        history.append(epoch_result)
        LOGGER.info(
            "Fusion epoch %d/%d: train_loss=%.4f val_loss=%.4f val_f1=%.4f",
            epoch,
            args.fusion_epochs,
            epoch_result["train_loss"],
            validation_loss,
            validation_metrics["f1"],
        )

        if validation_metrics["f1"] > best_f1:
            best_f1 = validation_metrics["f1"]
            best_epoch = epoch
            best_state = {
                name: value.detach().cpu().clone() for name, value in model.state_dict().items()
            }
            stale_epochs = 0
        else:
            stale_epochs += 1
            if stale_epochs >= args.early_stopping_patience:
                LOGGER.info("Early stopping at epoch %d.", epoch)
                break

    if best_state is None:
        raise RuntimeError("Fusion classifier did not produce a valid checkpoint.")
    model.load_state_dict(best_state)
    model.to(device)

    temperature = fit_temperature(
        model,
        normalized,
        labels,
        splits["validation"],
        device,
        args.fusion_batch_size,
    )

    _, validation_metrics = evaluate_model(
        model,
        normalized,
        labels,
        splits["validation"],
        device,
        args.fusion_batch_size,
        temperature,
    )
    _, test_metrics = evaluate_model(
        model,
        normalized,
        labels,
        splits["test"],
        device,
        args.fusion_batch_size,
        temperature,
    )
    result = {
        "best_epoch": best_epoch,
        "calibration": {
            "method": "temperature_scaling",
            "temperature": temperature,
            "fit_split": "validation",
        },
        "validation": validation_metrics,
        "test": test_metrics,
        "history": history,
    }
    return model, result, mean, std, best_epoch, temperature


def save_reports(report: dict[str, Any], artifacts_dir: Path) -> None:
    json_path = artifacts_dir / "fusion_report.json"
    text_path = artifacts_dir / "fusion_report.txt"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    test = report["performance"]["test"]
    lines = [
        "Arabic Multi-Model Fusion Training Report",
        "=========================================",
        f"Device: {report['device']}",
        f"Samples: {report['samples']}",
        f"Best epoch: {report['performance']['best_epoch']}",
        f"Models: {', '.join(report['models'].values())}",
        "",
        "Test metrics",
        f"Accuracy:  {test['accuracy']:.6f}",
        f"Precision: {test['precision']:.6f}",
        f"Recall:    {test['recall']:.6f}",
        f"F1:        {test['f1']:.6f}",
        f"ROC AUC:   {test['roc_auc'] if test['roc_auc'] is not None else 'unavailable'}",
        f"Confusion matrix: {test['confusion_matrix']}",
        "",
        f"Checkpoint: {report['artifacts']['fusion_checkpoint']}",
    ]
    text_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    LOGGER.info("Saved evaluation reports to %s and %s.", json_path, text_path)


def main() -> None:
    configure_logging()
    args = parse_args()

    # Dataset validation deliberately precedes CUDA setup and model downloads.
    dataset_paths = validate_dataset_inputs(
        args.dataset_dir, args.dataset_file, args.expected_file
    )
    device = configure_device(args.cpu_threads)
    seed_everything(args.seed)

    artifacts_dir = args.artifacts_dir.expanduser().resolve()
    cache_dir = args.hf_cache_dir.expanduser().resolve()
    dataset_cache_dir = args.dataset_cache_dir.expanduser().resolve()
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)

    dataset = load_and_normalize_dataset(
        dataset_paths,
        args.minimum_samples,
        args.minimum_text_chars,
        dataset_cache_dir,
    )
    labels = torch.tensor(dataset["label"], dtype=torch.long)
    groups = np.asarray(dataset["group"], dtype=object)
    splits = create_split_indices(labels.numpy(), groups, args.seed)
    LOGGER.info(
        "Split sizes: train=%d validation=%d test=%d.",
        len(splits["train"]),
        len(splits["validation"]),
        len(splits["test"]),
    )

    model_outputs = build_fusion_artifacts(
        dataset=dataset,
        device=device,
        artifacts_dir=artifacts_dir,
        cache_dir=cache_dir,
        max_length=args.max_length,
        batch_size=args.embedding_batch_size,
        offline=args.offline,
        reuse_artifacts=args.reuse_artifacts,
    )
    features = torch.cat([model_outputs[key] for key in MODEL_SPECS], dim=1)
    fusion_features_path = artifacts_dir / "fusion_features.pt"
    atomic_torch_save(
        {
            "schema_version": 1,
            "model_order": list(MODEL_SPECS),
            "features": features.to(torch.float16),
            "labels": labels,
            "splits": {key: torch.from_numpy(value) for key, value in splits.items()},
        },
        fusion_features_path,
    )

    model, performance, mean, std, best_epoch, temperature = train_fusion_classifier(
        features, labels, splits, device, args
    )
    checkpoint_path = artifacts_dir / "fusion_classifier.pt"
    atomic_torch_save(
        {
            "schema_version": 1,
            "model_state_dict": {
                key: value.detach().cpu() for key, value in model.state_dict().items()
            },
            "input_dim": features.shape[1],
            "hidden_dim": args.fusion_hidden_dim,
            "dropout": args.fusion_dropout,
            "feature_mean": mean,
            "feature_std": std,
            "model_order": list(MODEL_SPECS),
            "model_ids": MODEL_SPECS,
            "best_epoch": best_epoch,
            "temperature": temperature,
            "class_names": ["human", "ai"],
        },
        checkpoint_path,
    )

    report = {
        "schema_version": 1,
        "device": str(device),
        "samples": len(dataset),
        "class_counts": {
            "human": int((labels == 0).sum()),
            "ai": int((labels == 1).sum()),
        },
        "split_sizes": {key: len(value) for key, value in splits.items()},
        "models": MODEL_SPECS,
        "performance": performance,
        "artifacts": {
            "fusion_features": str(fusion_features_path),
            "fusion_checkpoint": str(checkpoint_path),
            "encoder_embeddings": {
                key: str(artifacts_dir / f"{key}_embeddings.pt") for key in MODEL_SPECS
            },
        },
    }
    save_reports(report, artifacts_dir)
    LOGGER.info("Training completed successfully.")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        LOGGER.error("%s", exc)
        sys.exit(1)
