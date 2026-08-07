import numpy as np
from typing import Dict, List, Any
from dataclasses import dataclass

try:
    from sklearn.metrics import roc_auc_score, average_precision_score  # type: ignore

    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


@dataclass
class EvaluationSample:
    id: str
    modality: str
    ground_truth: int  # 1 for AI, 0 for Human
    ai_probability: float
    predicted_class: int  # 1 for AI, 0 for Human

    # Metadata for breakdown
    language: str = "unknown"
    generator_family: str = "unknown"
    compression_level: str = "none"
    resolution: str = "unknown"
    transformation: str = "none"
    editing_level: str = "none"


class MetricsCalculator:
    @staticmethod
    def calculate_metrics(samples: List[EvaluationSample]) -> Dict[str, float]:
        if not samples:
            return {}

        y_true = np.array([s.ground_truth for s in samples])
        y_prob = np.array([s.ai_probability for s in samples])
        y_pred = np.array([s.predicted_class for s in samples])

        tp = np.sum((y_pred == 1) & (y_true == 1))
        tn = np.sum((y_pred == 0) & (y_true == 0))
        fp = np.sum((y_pred == 1) & (y_true == 0))
        fn = np.sum((y_pred == 0) & (y_true == 1))

        tpr = tp / (tp + fn) if (tp + fn) > 0 else 0.0  # Recall
        tnr = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tpr
        f1 = (
            2 * (precision * recall) / (precision + recall)
            if (precision + recall) > 0
            else 0.0
        )

        # Calibration Metrics
        brier_score = float(np.mean((y_prob - y_true) ** 2))

        # Expected Calibration Error (ECE) - 10 bins
        ece = 0.0
        bins = np.linspace(0, 1, 11)
        for i in range(10):
            mask = (y_prob >= bins[i]) & (y_prob <= bins[i + 1])
            if np.any(mask):
                bin_acc = np.mean(y_true[mask])
                bin_conf = np.mean(y_prob[mask])
                weight = np.sum(mask) / len(samples)
                ece += weight * np.abs(bin_acc - bin_conf)

        metrics = {
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "tpr": float(tpr),
            "tnr": float(tnr),
            "fpr": float(fpr),
            "fnr": float(fnr),
            "brier_score": float(brier_score),
            "ece": float(ece),
        }

        # AUC Metrics
        if HAS_SKLEARN and len(np.unique(y_true)) > 1:
            metrics["auroc"] = float(roc_auc_score(y_true, y_prob))
            metrics["auprc"] = float(average_precision_score(y_true, y_prob))
        else:
            metrics["auroc"] = 0.0
            metrics["auprc"] = 0.0

        return metrics


class BreakdownAnalyzer:
    def __init__(self, samples: List[EvaluationSample]):
        self.samples = samples
        self.calculator = MetricsCalculator()

    def analyze_by(self, metadata_key: str) -> Dict[str, Dict[str, float]]:
        """Slices the metrics by a specific metadata category (e.g. 'language')."""
        breakdown = {}
        grouped = {}

        for sample in self.samples:
            val = getattr(sample, metadata_key, "unknown")
            if val not in grouped:
                grouped[val] = []
            grouped[val].append(sample)

        for category, cat_samples in grouped.items():
            breakdown[category] = self.calculator.calculate_metrics(cat_samples)

        return breakdown

    def full_report(self) -> Dict[str, Any]:
        return {
            "global_metrics": self.calculator.calculate_metrics(self.samples),
            "breakdown_by_modality": self.analyze_by("modality"),
            "breakdown_by_language": self.analyze_by("language"),
            "breakdown_by_generator": self.analyze_by("generator_family"),
            "breakdown_by_transformation": self.analyze_by("transformation"),
        }
