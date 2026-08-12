import re
import numpy as np
from typing import Any, Dict, List, Optional
import logging

from base_detector import BaseDetector
from detector_registry import DetectionSignal

logger = logging.getLogger(__name__)

# Basic Regex for Arabic Letters
ARABIC_LETTERS = re.compile(r'[\u0621-\u064A\u0660-\u0669\u0671-\u06D3\u06F0-\u06FC]')
ARABIC_DIACRITICS = re.compile(r'[\u064B-\u065F]')
ARABIC_PUNCTUATION = re.compile(r'[\u060C\u061B\u061F]') # Comma, Semicolon, Question mark
TATWEEL = re.compile(r'\u0640')

class ArabicMorphologyAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Arabic Morphology Analyzer", "2.0", "text")
        
    def preprocess(self, input_data: str, context: dict) -> dict:
        text = input_data.strip()
        # Clean text
        text_no_tatweel = TATWEEL.sub('', text)
        
        # Character count
        total_chars = len(text)
        arabic_chars = len(ARABIC_LETTERS.findall(text))
        diacritic_chars = len(ARABIC_DIACRITICS.findall(text))
        
        # Unify letters for base word analysis
        normalized_text = text_no_tatweel
        normalized_text = ARABIC_DIACRITICS.sub('', normalized_text)
        # Normalize Alef forms to bare Alef
        normalized_text = re.sub(r'[\u0622\u0623\u0625]', '\u0627', normalized_text)
        # Normalize Yeh/Alef Maksura to Yeh
        normalized_text = re.sub(r'\u0649', '\u064A', normalized_text)
        # Normalize Teh Marbuta to Heh
        normalized_text = re.sub(r'\u0629', '\u0647', normalized_text)

        words = re.findall(r'\w+', normalized_text)
        
        return {
            "raw_text": text,
            "normalized_text": normalized_text,
            "words": words,
            "total_chars": total_chars,
            "arabic_chars": arabic_chars,
            "diacritic_chars": diacritic_chars
        }

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        words = preprocessed_data["words"]
        num_words = max(len(words), 1)
        
        # Basic Clitic stripping heuristics (prefixes: Al, wa, fa, ba, ka, li / suffixes: hm, km, h, na, ya)
        # This is a naive stripper to compute true word roots diversity
        stripped_words = []
        for w in words:
            if len(w) > 4:
                if w.startswith('ال'): w = w[2:]
                elif w.startswith('وال'): w = w[3:]
                elif w.startswith('فال'): w = w[3:]
                elif w.startswith('بال'): w = w[3:]
                elif w.startswith('كال'): w = w[3:]
                elif w.startswith('لل'): w = w[2:]
                
                if w.endswith('هم'): w = w[:-2]
                elif w.endswith('كم'): w = w[:-2]
                elif w.endswith('ها'): w = w[:-2]
                elif w.endswith('نا'): w = w[:-2]
            stripped_words.append(w)
            
        unique_roots = set(stripped_words)
        morphological_ttr = len(unique_roots) / num_words
        
        diacritic_density = preprocessed_data["diacritic_chars"] / max(preprocessed_data["total_chars"], 1)
        arabic_ratio = preprocessed_data["arabic_chars"] / max(preprocessed_data["total_chars"], 1)
        
        return {
            "morphological_ttr": morphological_ttr,
            "diacritic_density": diacritic_density,
            "arabic_ratio": arabic_ratio,
            "word_count": num_words
        }

    def predict_raw(self, features: dict, context: dict) -> float:
        # High morphological TTR usually means human. AI tends to reuse roots.
        ttr = features["morphological_ttr"]
        if ttr < 0.40:
            return 0.75 # Uniform/Repetitive AI Arabic
        elif ttr > 0.60:
            return 0.25 # Rich Human Arabic
        return 0.45

    def calibrate(self, raw_score: float, context: dict) -> float:
        return max(0.0, min(1.0, raw_score))

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features["arabic_ratio"] < 0.2:
            return 0.0 # Not enough Arabic to evaluate morphological properties
        return min(1.0, features["word_count"] / 50.0)


class ArabicLinguisticAnalyzer(BaseDetector):
    def __init__(self):
        super().__init__("Arabic Linguistic Analyzer", "2.0", "text")
        # Markers indicating human dialect/informality
        self.dialect_markers = {
            "عشان", "شكو", "بدي", "ايه", "ايش", "شلون", "كيفك", "وين", "ليش", "هيك", 
            "عنجد", "ياخي", "طيب", "خلاص", "عبالي", "وايد", "كتير", "برشا", "بزاف", 
            "دحين", "الحين", "هلق", "شنو", "واش", "إللي", "اللي"
        }
        
        # Overused MSA markers by AI (boilerplate transitions)
        self.ai_msa_transitions = {
            "علاوة على ذلك", "بالإضافة إلى ذلك", "من الجدير بالذكر", "تجدر الإشارة", 
            "لا بد من الإشارة", "في هذا السياق", "من ناحية أخرى", "في المقابل", 
            "خلاصة القول", "في الختام", "يلعب دورا", "تسلط الضوء"
        }

    def preprocess(self, input_data: str, context: dict) -> dict:
        text = input_data.strip()
        words = re.findall(r'\w+', text)
        return {"text": text, "words": words}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        text = preprocessed_data["text"]
        words = preprocessed_data["words"]
        num_words = max(len(words), 1)
        
        # Check dialect markers
        dialect_hits = sum(1 for w in words if w in self.dialect_markers)
        dialect_ratio = dialect_hits / num_words
        
        # Check AI MSA transitions (count occurrences)
        ai_transitions_hits = 0
        for phrase in self.ai_msa_transitions:
            ai_transitions_hits += len(re.findall(phrase, text))
            
        # Code switching / Transliteration (Arabizi)
        # Check Latin words in text
        latin_words = len(re.findall(r'[a-zA-Z]+', text))
        arabizi_ratio = latin_words / num_words
        
        # Numerals: Eastern vs Western
        eastern_numerals = len(re.findall(r'[\u0660-\u0669]', text)) # ١٢٣
        western_numerals = len(re.findall(r'[0-9]', text)) # 123
        total_numerals = max(eastern_numerals + western_numerals, 1)
        numeral_mixing = min(eastern_numerals, western_numerals) / total_numerals
        
        return {
            "dialect_ratio": dialect_ratio,
            "ai_transitions_hits": ai_transitions_hits,
            "arabizi_ratio": arabizi_ratio,
            "numeral_mixing": numeral_mixing,
            "word_count": num_words
        }

    def predict_raw(self, features: dict, context: dict) -> float:
        score = 0.5
        
        # Dialect is almost exclusively human (AI models strongly prefer MSA unless prompted specifically)
        if features["dialect_ratio"] > 0.02:
            score -= 0.3
            
        # Heavy use of sterile AI MSA transitions
        if features["ai_transitions_hits"] > 2:
            score += 0.2
            
        # Mixed numerals or arabizi are typical of informal human typing (code switching)
        if features["arabizi_ratio"] > 0.05 or features["numeral_mixing"] > 0.2:
            score -= 0.15
            
        return score

    def calibrate(self, raw_score: float, context: dict) -> float:
        return max(0.0, min(1.0, raw_score))

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return min(1.0, features["word_count"] / 30.0)

class AdvancedArabicOrchestrator:
    """
    Orchestrates execution of specialized Arabic text detectors.
    """
    def __init__(self):
        self.detectors = [
            ArabicMorphologyAnalyzer(),
            ArabicLinguisticAnalyzer()
        ]

    def analyze(self, text: str, context: Optional[Dict[str, Any]] = None) -> List[DetectionSignal]:
        ctx = context or {}
        signals = []
        for det in self.detectors:
            try:
                signal = det.execute(text, ctx)
                # Only add if signal quality > 0 (e.g. it is actually Arabic)
                if signal.signal_quality is not None and signal.signal_quality > 0.05:
                    signals.append(signal)
            except Exception as e:
                logger.error(f"Orchestrator failure on {det.name}: {e}")
        return signals

def register_arabic_detectors(registry):
    """
    Registers the advanced Arabic analysis ensemble into the global registry.
    """
    orchestrator = AdvancedArabicOrchestrator()
    registry.register_detector("AdvancedArabic", "text", orchestrator.analyze)

