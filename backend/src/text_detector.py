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
        arabic_chars = len(re.findall(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]", text))
        is_arabic = (arabic_chars / max(len(text), 1)) > 0.20
        return {"text": text, "words": words, "punctuation": punctuation, "is_arabic": is_arabic}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        words = preprocessed_data["words"]
        punct = preprocessed_data["punctuation"]
        is_ar = preprocessed_data.get("is_arabic", False)
        num_words = max(len(words), 1)
        
        unique_words = set(words)
        guiraud_r = len(unique_words) / math.sqrt(num_words)

        def _is_func_word(w):
            if w in self.function_words:
                return True
            stripped = re.sub(r"^(?:[وفبل]|ال)", "", w)
            return stripped in self.function_words

        func_word_count = sum(1 for w in words if _is_func_word(w))
        func_word_ratio = func_word_count / num_words
        
        punct_density = len(punct) / num_words
        
        return {
            "guiraud_r": guiraud_r,
            "func_word_ratio": func_word_ratio,
            "punct_density": punct_density,
            "word_count": num_words,
            "is_arabic": is_ar
        }

    def predict_raw(self, features: dict, context: dict) -> float:
        r = features["guiraud_r"]
        func = features["func_word_ratio"]
        is_ar = features.get("is_arabic", False)
        score = 0.5
        if is_ar:
            if 4.2 <= r <= 7.8 and func > 0.20:
                score += 0.25
            elif r > 8.8:
                score -= 0.25
        else:
            if 3.8 <= r <= 6.4 and func > 0.36:
                score += 0.25
            elif r > 7.0 or func < 0.25:
                score -= 0.25
        return max(0.05, min(0.95, score))

    def calibrate(self, raw_score: float, context: dict) -> float:
        return max(0.0, min(1.0, raw_score))

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        return min(1.0, features["word_count"] / 40.0)
        



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

class ZipfianRankDecayAnalyzer(BaseDetector):
    """
    Measures empirical token frequency rank distribution against Zipf's Law (f(r) ~ 1/r^alpha).
    LLMs truncated with top-p/temperature nucleus sampling exhibit sharp tail decay (alpha > 1.25)
    and severe low-rank frequency truncation compared to human natural language.
    """
    def __init__(self):
        super().__init__("Zipfian Rank Decay & Perplexity Curvature", "2.0", "text")

    def preprocess(self, input_data: str, context: dict) -> dict:
        text = str(input_data).strip()
        tokens = re.findall(r"[A-Za-z0-9_\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'-]+", text.lower())
        arabic_chars = len(re.findall(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]", text))
        is_arabic = (arabic_chars / max(len(text), 1)) > 0.20
        return {"text": text, "tokens": tokens, "is_arabic": is_arabic}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        tokens = preprocessed_data["tokens"]
        is_ar = preprocessed_data.get("is_arabic", False)
        if len(tokens) < 15:
            return {"failed": True, "reason": "Text too short for Zipfian rank decay analysis"}

        counts: Dict[str, int] = {}
        for t in tokens:
            counts[t] = counts.get(t, 0) + 1

        freqs = sorted(counts.values(), reverse=True)
        ranks = np.arange(1, len(freqs) + 1)

        log_ranks = np.log(ranks)
        log_freqs = np.log(freqs)

        # Fit linear regression: log(freq) = -alpha * log(rank) + c
        if len(ranks) >= 4 and np.std(log_ranks) > 1e-6:
            slope, intercept = np.polyfit(log_ranks, log_freqs, 1)
            alpha = -float(slope)
            pred_log_freqs = slope * log_ranks + intercept
            ss_tot = float(np.sum((log_freqs - np.mean(log_freqs)) ** 2))
            ss_res = float(np.sum((log_freqs - pred_log_freqs) ** 2))
            r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        else:
            alpha = 1.0
            r_squared = 0.5

        # Hapax legomena ratio (words occurring exactly once)
        hapax_count = sum(1 for c in counts.values() if c == 1)
        hapax_ratio = hapax_count / max(len(counts), 1)

        return {
            "alpha": round(float(alpha), 4),
            "r_squared": round(float(r_squared), 4),
            "hapax_ratio": round(float(hapax_ratio), 4),
            "unique_vocab_size": len(counts),
            "total_tokens": len(tokens),
            "is_arabic": is_ar,
            "failed": False
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        return min(1.0, features.get("total_tokens", 0) / 45.0)

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5

        alpha = features["alpha"]
        r2 = features["r_squared"]
        hapax = features["hapax_ratio"]
        is_ar = features.get("is_arabic", False)

        score = 0.5
        # AI text typically has hyper-standardized rank decay (alpha in 1.05 - 1.70)
        if 1.05 <= alpha <= 1.70 and r2 > 0.82:
            score += 0.30
        elif alpha < 0.75 or alpha > 1.95:
            score -= 0.25

        if not is_ar:
            if hapax < 0.45 and features["total_tokens"] > 35:
                score += 0.15
            elif hapax > 0.70:
                score -= 0.15

        return max(0.05, min(0.95, score))

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class SyntacticTreeEntropyAnalyzer(BaseDetector):
    """
    Government/Forensic syntactic analysis: Evaluates Part-of-Speech (POS) Markov transition entropy,
    clausal balance, and sentence structural symmetry.
    """
    def __init__(self):
        super().__init__("Syntactic Markov Transition & Clause Invariance", "2.0", "text")
        # Approximate POS regex lexicon for zero-dependency multilingual parsing
        self.determiners = {"the", "a", "an", "this", "that", "these", "those", "every", "all", "some", "any", "each", "ال"}
        self.pronouns = {"i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "their", "our", "أنا", "نحن", "أنت", "هو", "هي", "هم"}
        self.prepositions = {"in", "on", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "في", "على", "من", "إلى", "عن", "مع", "بين", "تحت", "فوق"}
        self.conjunctions = {"and", "but", "or", "so", "yet", "for", "nor", "because", "although", "since", "unless", "while", "where", "whereas", "و", "أو", "ثم", "لكن", "بل", "حيث", "بينما", "لأن"}

    def _approximate_pos(self, word: str) -> str:
        w = word.lower()
        if w in self.determiners:
            return "DET"
        if w in self.pronouns:
            return "PRON"
        if w in self.prepositions:
            return "PREP"
        if w in self.conjunctions:
            return "CONJ"
        if w.endswith("ly") or w.endswith("ally"):
            return "ADV"
        if w.endswith("ing") or w.endswith("ed") or w.endswith("ize") or w.endswith("ate"):
            return "VERB"
        if w.endswith("tion") or w.endswith("ment") or w.endswith("ness") or w.endswith("ity") or w.endswith("ism"):
            return "NOUN"
        if w.endswith("able") or w.endswith("ible") or w.endswith("ous") or w.endswith("ive") or w.endswith("ful"):
            return "ADJ"
        return "OTHER"

    def preprocess(self, input_data: str, context: dict) -> dict:
        text = str(input_data).strip()
        sentences = [s.strip() for s in re.split(r"[.!?؟؛]+|\n+", text) if len(s.strip()) > 3]
        return {"text": text, "sentences": sentences}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        sentences = preprocessed_data["sentences"]
        if not sentences:
            return {"failed": True, "reason": "No valid sentences"}

        pos_tags_all: List[str] = []
        clause_lengths: List[int] = []

        for s in sentences:
            words = re.findall(r"[A-Za-z0-9_\u0600-\u06FF'-]+", s)
            if not words:
                continue
            tags = [self._approximate_pos(w) for w in words]
            pos_tags_all.extend(tags)
            clause_lengths.append(len(words))

        # Build 1st-order POS transition matrix
        pos_categories = ["DET", "PRON", "PREP", "CONJ", "ADV", "VERB", "NOUN", "ADJ", "OTHER"]
        cat_to_idx = {c: i for i, c in enumerate(pos_categories)}
        matrix = np.zeros((len(pos_categories), len(pos_categories)), dtype=np.float32)

        for i in range(len(pos_tags_all) - 1):
            src = cat_to_idx.get(pos_tags_all[i], cat_to_idx["OTHER"])
            dst = cat_to_idx.get(pos_tags_all[i + 1], cat_to_idx["OTHER"])
            matrix[src, dst] += 1.0

        # Compute POS Transition Entropy
        total_transitions = float(np.sum(matrix))
        if total_transitions > 0:
            probs = matrix / total_transitions
            probs_flat = probs[probs > 0]
            pos_entropy = -float(np.sum(probs_flat * np.log2(probs_flat)))
        else:
            pos_entropy = 0.0

        # Clausal length symmetry
        mean_clause = float(np.mean(clause_lengths)) if clause_lengths else 0.0
        clause_variance = float(np.var(clause_lengths)) if len(clause_lengths) > 1 else 0.0
        clause_cv = math.sqrt(clause_variance) / mean_clause if mean_clause > 0 else 0.0

        return {
            "pos_entropy": round(pos_entropy, 4),
            "clause_cv": round(clause_cv, 4),
            "clause_count": len(clause_lengths),
            "mean_clause_len": round(mean_clause, 2),
            "failed": False
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        return min(1.0, features.get("clause_count", 0) / 2.0)

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5

        pos_entropy = features["pos_entropy"]
        clause_cv = features["clause_cv"]

        score = 0.5
        # LLMs generate rigid, uniform POS distributions (pos_entropy typically tightly bounded in 2.2 - 2.85)
        # with highly uniform clause rhythm (clause_cv < 0.35)
        if 2.10 <= pos_entropy <= 2.90 and clause_cv < 0.36:
            score += 0.28
        elif clause_cv > 0.65 or pos_entropy > 3.30:
            score -= 0.25

        return max(0.05, min(0.95, score))

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class SteganographyAndEvasionAnalyzer(BaseDetector):
    """
    Cyber-Defense / Intelligence Forensic Analyzer:
    Scans for zero-width unicode watermarks, homoglyph character spoofing,
    and adversarial 'Humanizer' evasion noise (e.g. QuillBot / Undetectable AI bypass patterns).
    """
    def __init__(self):
        super().__init__("Steganography & Adversarial Evasion Forensics", "2.0", "text")
        # Zero-width & invisible unicode codepoints used in LLM watermarks or steganographic exfiltration
        self.invisible_chars = {
            "\u200B": "Zero-Width Space",
            "\u200C": "Zero-Width Non-Joiner",
            "\u200D": "Zero-Width Joiner",
            "\uFEFF": "Byte Order Mark / Zero-Width No-Break Space",
            "\u00AD": "Soft Hyphen",
            "\u2060": "Word Joiner",
            "\u200E": "Left-to-Right Mark",
            "\u200F": "Right-to-Left Mark",
            "\u202A": "LRE",
            "\u202B": "RLE",
            "\u202C": "PDF",
            "\u202D": "LRO",
            "\u202E": "RLO",
            "\u2066": "LRI",
            "\u2067": "RLI",
            "\u2068": "FSI",
            "\u2069": "PDI"
        }
        # Cyrillic / Greek homoglyphs commonly injected into Latin text to evade detectors
        self.latin_homoglyph_map = {
            "\u0430": "a", "\u0435": "e", "\u043E": "o", "\u0440": "p", "\u0441": "c",
            "\u0443": "y", "\u0445": "x", "\u0456": "i", "\u0458": "j", "\u0405": "S",
            "\u03BF": "o", "\u03BD": "v", "\u03B1": "a"
        }

    def preprocess(self, input_data: str, context: dict) -> dict:
        raw_text = str(input_data)
        return {"raw_text": raw_text}

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        raw_text = preprocessed_data["raw_text"]
        if not raw_text:
            return {"failed": True, "reason": "Empty string"}

        # 1. Zero-width character count
        invisible_hits: Dict[str, int] = {}
        for char, name in self.invisible_chars.items():
            cnt = raw_text.count(char)
            if cnt > 0:
                invisible_hits[name] = cnt

        total_invisible = sum(invisible_hits.values())

        # 2. Homoglyph substitution scan
        homoglyph_hits = 0
        words = raw_text.split()
        for w in words:
            has_latin = bool(re.search(r"[A-Za-z]", w))
            has_homoglyph = any(hg in w for hg in self.latin_homoglyph_map)
            if has_latin and has_homoglyph:
                homoglyph_hits += 1

        # 3. Humanizer / Adversarial Anti-Detector Pattern Scan
        # Detects synthetic grammar perturbation, forced typos placed near high-burstiness words
        forced_typo_patterns = [
            r"\bteh\b", r"\brecieve\b", r"\bseperate\b", r"\bdefinately\b", r"\boccured\b",
            r"\balot\b", r"\bwich\b", r"\bthier\b", r"\bundoubtly\b", r"\bregardles\b"
        ]
        typo_hits = sum(len(re.findall(pat, raw_text.lower())) for pat in forced_typo_patterns)

        # AI Formal Template & Jargon Density
        ai_formal_patterns = [
            r"\bdelve\b", r"\btapestry\b", r"\bparamount\b", r"\bnuanced\b", r"\bpivotal\b",
            r"\bmultifaceted\b", r"\bfoster\b", r"\bholistic\b", r"\btransformative\b",
            r"\bcontemporary\b", r"\bstreamline[ds]?\b", r"\bparadigm\b", r"\bproliferation\b",
            r"\bfurthermore\b", r"\bmoreover\b", r"\bindispensable\b", r"\bvital\b",
            r"\btestament\b", r"\bspearhead\b", r"\binterplay\b", r"\bharness\b",
            r"\bcatalyst\b", r"\btestament\b", r"\bexponential\b", r"\bleverag(?:e|ing|ed)\b"
        ]
        formal_jargon = sum(len(re.findall(pat, raw_text.lower())) for pat in ai_formal_patterns)
        casual_slang = len(re.findall(r"\b(?:kinda|gonna|wanna|literally|stuff|tbh|imo|idk|bruh)\b", raw_text.lower()))
        register_discordance = (formal_jargon >= 2 and casual_slang >= 1)

        return {
            "invisible_watermark_count": total_invisible,
            "invisible_details": invisible_hits,
            "homoglyph_substitutions": homoglyph_hits,
            "forced_typo_evasion_hits": typo_hits,
            "formal_jargon_hits": formal_jargon,
            "register_discordance": register_discordance,
            "failed": False
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.0
        if features["invisible_watermark_count"] > 0 or features["homoglyph_substitutions"] > 0:
            return 1.0
        return 0.85

    def predict_raw(self, features: dict, context: dict) -> float:
        if features.get("failed"):
            return 0.5

        # Watermark detected -> 99% AI provenance
        if features["invisible_watermark_count"] >= 3:
            return 0.99
        elif features["invisible_watermark_count"] >= 1:
            return 0.92

        # Homoglyphs in Latin words -> 95% deliberate evasion of AI detectors
        if features["homoglyph_substitutions"] >= 2:
            return 0.95
        elif features["homoglyph_substitutions"] >= 1:
            return 0.85

        # Evasion via humanizer tool
        if features["forced_typo_evasion_hits"] >= 1 and (features["register_discordance"] or features["formal_jargon_hits"] >= 1):
            return 0.92
        elif features["register_discordance"]:
            return 0.85

        # AI Formal Template & Jargon Density
        jargon = features["formal_jargon_hits"]
        if jargon >= 3:
            return 0.92
        elif jargon >= 2:
            return 0.82
        elif jargon == 1:
            return 0.65

        return 0.50

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class AdvancedArabicForensicAnalyzer(BaseDetector):
    """
    Multilingual Intelligence Forensic Analyzer for Arabic & Dialectal Variations.
    Differentiates formulaic MSA (Modern Standard Arabic) generated by LLMs from authentic
    regional dialects (Egyptian, Gulf, Levantine, Maghrebi, Iraqi) and Arabizi code-switching.
    """
    def __init__(self):
        super().__init__("Arabic Dialectal & Multilingual Forensic Analyzer", "2.0", "text")
        self.msa_ai_phrases = [
            "مما لا شك فيه", "من الجدير بالذكر", "علاوة على ذلك", "في هذا السياق",
            "يلعب دورا محوريا", "يلعب دوراً محورياً", "تلعب دورا هاما", "تلعب دوراً هاماً",
            "تجدر الإشارة إلى", "تجدر الاشارة الى", "يمكن القول بأن", "بناء على ما سبق",
            "بناءً على ما تقدم", "في الختام", "خلاصة القول", "من الأهمية بمكان",
            "وفقا لذلك", "وفقاً لما تم ذكره", "بصفتي نموذج لغوي", "كذكاء اصطناعي"
        ]
        self.dialect_markers = {
            "Egyptian": ["عشان", "شلون", "ازيك", "ايه ده", "كده", "برضه", "دلوقتي", "عايز", "مش عايز", "أوي"],
            "Levantine": ["هيك", "شو", "هلق", "كتير", "بدي", "ما بدي", "هادا", "عم يحكي", "شلونك", "منيح"],
            "Gulf": ["وش", "شلونك", "عساك", "واجد", "مره", "زين", "ياخي", "ترا", "ودي", "طال عمرك"],
            "Maghrebi": ["ديال", "بزاف", "واخا", "دابا", "كاين", "مكاينش", "برشا", "شكون", "توة"],
            "Iraqi": ["شكو ماكو", "هواي", "اريد", "صدك", "فدوى", "عيني", "هسة", "دا احجي"]
        }

    def preprocess(self, input_data: str, context: dict) -> dict:
        text = str(input_data).strip()
        arabic_chars = len(re.findall(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]", text))
        total_chars = max(len(text), 1)
        arabic_ratio = arabic_chars / total_chars
        return {"text": text, "arabic_ratio": arabic_ratio}

    def _normalize_arabic(self, text: str) -> str:
        t = re.sub(r"[\u0640]", "", text)  # Tatweel
        t = re.sub(r"[\u064B-\u065F\u0670]", "", t)  # Tashkeel
        t = re.sub(r"[أإآٱ]", "ا", t)
        t = re.sub(r"ة", "ه", t)
        t = re.sub(r"ى", "ي", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t

    def extract_features(self, preprocessed_data: dict, context: dict) -> dict:
        text = preprocessed_data["text"]
        ratio = preprocessed_data["arabic_ratio"]

        if ratio < 0.08:
            return {"is_arabic": False, "failed": False}

        norm_text = self._normalize_arabic(text)

        # Regex patterns for flexible MSA template detection (handles missing spaces, tatweel, typos)
        ai_patterns = [
            r"مما\s*لا\s*شك\s*فيه", r"من\s*الجدير\s*بالذكر", r"علاوه\s*علي\s*ذلك", r"في\s*هذا\s*السياق",
            r"يلعب\s*دورا\s*(محوريا|كبيرا|هاما)", r"تلعب\s*دورا\s*(محوريا|كبيرا|هاما)",
            r"تجدر\s*الاشاره\s*الي", r"يمكن\s*القول\s*بان", r"بناء\s*ع(?:لي|)\s*ذلك", r"بناء\s*ع(?:لي|)\s*ما\s*تقدم",
            r"في\s*الختام", r"خلاصه\s*القول", r"من\s*الاهميه\s*بمكان", r"وفقا\s*لذلك", r"ذكاء\s*اصطناعي"
        ]
        ai_phrase_hits = sum(1 for pat in ai_patterns if re.search(pat, norm_text))
        
        dialect_hits: Dict[str, int] = {}
        for dialect, markers in self.dialect_markers.items():
            cnt = sum(1 for m in markers if self._normalize_arabic(m) in norm_text)
            if cnt > 0:
                dialect_hits[dialect] = cnt

        total_dialect_markers = sum(dialect_hits.values())

        # Arabizi / Franco-Arabic token detection
        latin_words = re.findall(r"\b[A-Za-z0-9']+\b", text)
        arabizi_tokens = [w for w in latin_words if re.search(r"[2356789]", w) and re.search(r"[a-zA-Z]", w)]

        # Check for Humanized Arabic (AI formulaic phrase + colloquial/typo insertions)
        is_humanized_arabic = (ai_phrase_hits >= 2) or (ai_phrase_hits >= 1 and total_dialect_markers <= 1)

        return {
            "is_arabic": True,
            "arabic_ratio": round(ratio, 3),
            "ai_msa_phrase_hits": ai_phrase_hits,
            "dialect_marker_count": total_dialect_markers,
            "dialect_breakdown": dialect_hits,
            "arabizi_count": len(arabizi_tokens),
            "is_humanized_arabic": is_humanized_arabic,
            "failed": False
        }

    def evaluate_signal_quality(self, features: dict, context: dict) -> float:
        if not features.get("is_arabic", False):
            return 0.0
        return 1.0

    def predict_raw(self, features: dict, context: dict) -> float:
        if not features.get("is_arabic", False):
            return 0.5

        ai_hits = features["ai_msa_phrase_hits"]
        dialect_hits = features["dialect_marker_count"]
        arabizi_hits = features["arabizi_count"]

        score = 0.5
        if ai_hits >= 2:
            score = 0.95
        elif ai_hits == 1:
            score = 0.85 if dialect_hits <= 1 else 0.65

        if dialect_hits >= 2 and ai_hits == 0:
            score = 0.10  # Strong authentic human dialect
        elif dialect_hits >= 1 and ai_hits == 0:
            score = 0.20

        if arabizi_hits >= 2:
            score = min(score, 0.15)  # Arabizi is predominantly human informal communication

        return max(0.02, min(0.98, score))

    def calibrate(self, raw_score: float, context: dict) -> float:
        return raw_score


class AdvancedTextOrchestrator:
    """
    Orchestrates execution of the government/cybersecurity-grade text forensic ensemble.
    """
    def __init__(self):
        self.detectors = [
            StylometryAnalyzer(),
            BurstinessAnalyzer(),
            EntropyAnalyzer(),
            ZipfianRankDecayAnalyzer(),
            SyntacticTreeEntropyAnalyzer(),
            SteganographyAndEvasionAnalyzer(),
            AdvancedArabicForensicAnalyzer()
        ]

    def analyze(self, text: str, context: Optional[Dict[str, Any]] = None) -> List[DetectionSignal]:
        ctx = context or {}
        signals = []
        for det in self.detectors:
            try:
                signal = det.execute(text, ctx)
                if signal.signal_quality > 0.05:
                    signals.append(signal)
            except Exception as e:
                logger.error(f"Text orchestrator failure on {det.name}: {e}")
        return signals

def register_text_detectors(registry):
    """
    Registers the advanced text analysis ensemble into the global registry.
    """
    orchestrator = AdvancedTextOrchestrator()
    registry.register_detector("AdvancedText", "text", orchestrator.analyze)
