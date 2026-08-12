import math
import re
import zlib
import numpy as np
from typing import Any, Dict, List, Optional
import logging

from base_detector import BaseDetector
from detector_registry import DetectionSignal

logger = logging.getLogger(__name__)

class StylometryAnalyzer(BaseDetector):
    """
    Analyzes lexical diversity, vocabulary richness, and function-word patterns.
    """
    def __init__(self):
        super().__init__("Stylometry Analyzer", "2.0", "text")
        # Approximate function words for cross-lingual stylistic analysis (English/Arabic)
        self.function_words = {
            "the", "is", "at", "which", "on", "and", "a", "an", "of", "to", "in",
            "for", "with", "that", "it", "as", "be", "this", "by", "or", "from",
            "but", "not", "are", "was", "were", "they", "we", "he", "she", "you",
            "في", "من", "على", "إلى", "عن", "مع", "هذا", "هذه", "أن", "إن", "كان",
            "الذي", "التي", "هو", "هي", "تم", "قد", "لقد", "أو", "و", "ف", "ب", "ل"
        }

    def preprocess(self, input_data: str, context: dict) -> dict:
        text = str(input_data).strip()
        words = re.findall(r"\w+", text.lower())
        punctuation = re.findall(r"[.,!?;:\"'-]", text)
        return {"text": text, "words": words, "punctuation": punctuation}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        words = preprocessed_data["words"]
        punct = preprocessed_data["punctuation"]
        num_words = max(len(words), 1)
        
        unique_words = set(words)
        ttr = len(unique_words) / num_words # Type-Token Ratio
        
        func_word_count = sum(1 for w in words if w in self.function_words)
        func_word_ratio = func_word_count / num_words
        
        punct_density = len(punct) / num_words
        
        return {
            "ttr": ttr,
            "func_word_ratio": func_word_ratio,
            "punct_density": punct_density,
            "word_count": num_words
        }

    def predict_raw(self, features: dict, context: dict) -> float:
        # TTR is typically higher in human writing.
        # This returns an uncalibrated signal strictly based on statistical divergence.
        # E.g. AI often has TTR ~ 0.45, Humans ~ 0.60
        ttr = features["ttr"]
        if ttr < 0.4:
            return 0.8  # Strong AI signal
        elif ttr < 0.5:
            return 0.6  # Moderate AI signal
        elif ttr > 0.65:
            return 0.2  # Strong Human signal
        return 0.4

    def calibrate(self, raw_score: float, context: dict) -> float:
        # Standardize score strictly between 0 and 1 without arbitrary clamps
        return max(0.0, min(1.0, raw_score))

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        # Signal is poor if text is extremely short (e.g., < 20 words)
        return min(1.0, features["word_count"] / 100.0)
        



class BurstinessAnalyzer(BaseDetector):
    """
    Analyzes sentence-length distributions, word-length variance, and local burstiness.
    """
    def __init__(self):
        super().__init__("Burstiness Analyzer", "2.0", "text")

    def preprocess(self, input_data: str, context: dict) -> dict:
        text = str(input_data).strip()
        sentences = [s for s in re.split(r"[.!?]+", text) if len(s.strip()) > 3]
        words = re.findall(r"\w+", text)
        return {"sentences": sentences, "words": words}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        sentences = preprocessed_data["sentences"]
        words = preprocessed_data["words"]
        
        sent_lengths = [len(re.findall(r"\w+", s)) for s in sentences]
        word_lengths = [len(w) for w in words]
        
        sent_variance = float(np.var(sent_lengths)) if len(sent_lengths) > 1 else 0.0
        word_variance = float(np.var(word_lengths)) if len(word_lengths) > 1 else 0.0
        
        return {
            "sentence_lengths": sent_lengths,
            "sentence_variance": sent_variance,
            "word_variance": word_variance,
            "sentence_count": len(sentences)
        }

    def predict_raw(self, features: dict, context: dict) -> float:
        # AI models typically produce highly uniform sentence lengths (low variance).
        # Humans produce bursty text (high variance).
        var = features["sentence_variance"]
        if var < 15.0:
            return 0.75 # AI tends to be uniform
        elif var > 45.0:
            return 0.2  # Human tends to be bursty
        return 0.45

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return min(1.0, features["sentence_count"] / 5.0)


class EntropyAnalyzer(BaseDetector):
    """
    Computes Shannon entropy and predictability/compressibility.
    Serves as a robust proxy for perplexity without requiring heavy transformer weights.
    """
    def __init__(self):
        super().__init__("Entropy & Predictability Analyzer", "2.0", "text")

    def preprocess(self, input_data: str, context: dict) -> str:
        return str(input_data).strip()

    def extract_features(self, preprocessed_data: str, context: dict) -> dict:
        text = preprocessed_data
        if not text:
            return {"entropy": 0.0, "compression_ratio": 1.0, "length": 0}
            
        # Character Shannon Entropy
        counts = {}
        for char in text:
            counts[char] = counts.get(char, 0) + 1
        
        ent = 0.0
        for count in counts.values():
            p = count / len(text)
            ent -= p * math.log2(p)
            
        # ZLib Compression Ratio (Proxy for local predictability / structural repetition)
        encoded = text.encode('utf-8')
        compressed = zlib.compress(encoded)
        comp_ratio = len(compressed) / max(len(encoded), 1)
        
        return {
            "entropy": ent,
            "compression_ratio": comp_ratio,
            "length": len(encoded)
        }

    def predict_raw(self, features: dict, context: dict) -> float:
        comp = features["compression_ratio"]
        # Highly compressible text (ratio < 0.45) indicates heavy repetition or predictable AI boilerplate.
        # Hard-to-compress text (ratio > 0.65) indicates high entropy/randomness typical of diverse human thought.
        if comp < 0.45:
            return 0.8
        elif comp > 0.65:
            return 0.25
        return 0.5

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return min(1.0, features["length"] / 500.0)



class ParaphraseAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Translation/Paraphrase Analyzer", "1.0", "text")

    def preprocess(self, input_data: str, context: dict) -> dict:
        text_str = input_data.strip()
        sentences = [s.strip() for s in re.split(r'[.!?]+', text_str) if len(s.strip()) > 5]
        words = re.findall(r'\b\w+\b', text_str.lower())
        return {"sentences": sentences, "words": words}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        sentences = preprocessed_data["sentences"]
        words = preprocessed_data["words"]
        
        if len(sentences) < 3 or not words:
            return {"failed": True, "reason": "Text too short"}

        lengths = [len(re.findall(r'\b\w+\b', s)) for s in sentences]
        avg_len = sum(lengths) / len(lengths)
        
        # Machine translation and AI rewriting tools often normalize sentence lengths
        # and use specific transition structures.
        len_variance = sum((l - avg_len) ** 2 for l in lengths) / len(lengths)
        cv = (len_variance ** 0.5) / avg_len if avg_len > 0 else 0
        
        # Check for rewriting artifacts (e.g. over-reliance on synonyms replacing common words)
        # We approximate this by looking for abnormal uniformity.
        is_suspiciously_uniform = cv < 0.25

        return {
            "sentence_cv": cv,
            "is_suspiciously_uniform": is_suspiciously_uniform,
            "failed": False
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5
        
        cv = features["sentence_cv"]
        if features["is_suspiciously_uniform"]:
            # High AI probability for translated/rewritten uniformity
            return 0.85
        elif cv > 0.6:
            # High variance -> likely human drafting
            return 0.20
        return 0.5

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score

class AdvancedTextOrchestrator:
    """
    Orchestrates execution of text detectors using the Phase 3 BaseDetector interface.
    """
    def __init__(self):
        self.detectors = [
            StylometryAnalyzer(),
            BurstinessAnalyzer(),
            EntropyAnalyzer()
        ]

    def analyze(self, text: str, context: Optional[Dict[str, Any]] = None) -> List[DetectionSignal]:
        ctx = context or {}
        signals = []
        for det in self.detectors:
            try:
                # Add context hooks so the base detector can embed features into evidence automatically
                # We will intercept the features in a wrapping manner or just rely on the detector's state
                # Wait, base detector execute handles all this.
                # To get evidence, we should inject evidence extraction into the base detector or let it override it.
                # The BaseDetector allows overriding get_evidence(context), but it doesn't currently store features on context inside execute.
                # Let's fix that design by relying on the return value of extract_features.
                
                # Execute cleanly captures exceptions
                signal = det.execute(text, ctx)
                
                # Attach evidence manually if not already attached by the detector
                # The easiest way is to let the detector attach its own evidence. 
                # Since we want features in evidence, we'll patch the execute method locally or let it be.
                signals.append(signal)
            except Exception as e:
                logger.error(f"Orchestrator failure on {det.name}: {e}")
        return signals

def register_text_detectors(registry):
    """
    Registers the advanced text analysis ensemble into the global registry.
    """
    orchestrator = AdvancedTextOrchestrator()
    # Provide the analyze method directly to the registry
    registry.register_detector("AdvancedText", "text", orchestrator.analyze)
