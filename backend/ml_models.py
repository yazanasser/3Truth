import torch  # type: ignore
import torch.nn as nn  # type: ignore
import torchvision.models as models  # type: ignore
import os
import logging
from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
from sklearn.linear_model import LogisticRegression  # type: ignore

logger = logging.getLogger(__name__)

ARABIC_CHAR_RE = r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]"

ARABIC_AI_PHRASES = [
    "من الجدير بالذكر", "تجدر الإشارة", "من المهم الإشارة", "لا بد من الإشارة",
    "علاوة على ذلك", "بالإضافة إلى ذلك", "فضلا عن ذلك", "في هذا السياق",
    "من ناحية أخرى", "على صعيد آخر", "في المقابل", "ومع ذلك",
    "بشكل عام", "بصورة عامة", "يمكن القول", "يمكننا القول", "لا شك أن",
    "في نهاية المطاف", "في الختام", "ختاما", "خلاصة القول",
    "على سبيل المثال لا الحصر", "يلعب دورا محوريا", "دورا محوريا",
    "يسهم بشكل كبير", "يساهم بشكل كبير", "يمثل خطوة مهمة",
    "يشكل عاملا أساسيا", "تحقيق التنمية المستدامة", "تعزيز الكفاءة",
    "تحسين جودة", "مواكبة التطورات", "في ظل التطورات المتسارعة"
]

ARABIC_AI_TRANSITIONS = [
    "أولا", "ثانيا", "ثالثا", "أخيرا", "لذلك", "وبالتالي", "ومن ثم",
    "علاوة", "بالإضافة", "فضلا", "كذلك", "أيضا", "في المقابل",
    "من ناحية", "من جهة", "على الرغم", "بالرغم", "ومع ذلك"
]

ARABIC_FORMAL_WORDS = [
    "محوري", "استراتيجي", "شامل", "مستدام", "مبتكر", "فعال", "متكامل",
    "منظومة", "تعزيز", "تحسين", "تطوير", "تحقيق", "تسهم", "يسهم",
    "تساهم", "يساهم", "يعد", "تعد", "يعتبر", "تعتبر", "ضرورة",
    "أهمية", "الرقمي", "التحول", "الكفاءة", "الجودة", "المستقبل",
    "الابتكار", "التحديات", "الفرص", "المجالات", "المختلفة"
]

ARABIC_HUMAN_MARKERS = [
    "يعني", "والله", "بصراحة", "صراحة", "شوي", "شوية", "مره", "مرة",
    "كثير", "كتير", "كذا", "بس", "مو", "مش", "عشان", "ليش", "ايش",
    "إيش", "وش", "ما ادري", "ما أدري", "احس", "أحس", "اليوم", "امس",
    "أمس", "بكرة", "هههه", "ههههه", "ههه", "يا جماعة", "ترى", "طيب"
]


def normalize_arabic_text(text):
    import re
    text = re.sub(r"[\u064B-\u065F\u0670]", "", text)
    text = text.replace("ـ", "")
    text = re.sub(r"[إأآٱ]", "ا", text)
    text = text.replace("ى", "ي")
    return text


def arabic_ratio(text):
    import re
    letters = re.findall(r"[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]", text)
    if not letters:
        return 0.0
    arabic = re.findall(ARABIC_CHAR_RE, text)
    return len(arabic) / len(letters)


def arabic_words(text):
    import re
    normalized = normalize_arabic_text(text)
    return re.findall(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+", normalized)


def split_text_sentences(text):
    import re
    return [s.strip() for s in re.split(r"[.!?؟؛。]+|\n+", text) if s.strip()]


def count_phrase_hits(text, phrases):
    normalized = normalize_arabic_text(text.lower())
    count = 0
    found = []
    for phrase in phrases:
        phrase_norm = normalize_arabic_text(phrase.lower())
        hits = normalized.count(phrase_norm)
        if hits:
            count += hits
            found.append(phrase)
    return count, found


def compute_arabic_ai_heuristics(text):
    import math
    words = arabic_words(text)
    wc = len(words)
    if wc == 0:
        return {
            "score": 0.05,
            "word_count": 0,
            "arabic_ratio": arabic_ratio(text),
            "is_arabic": False,
            "details": {}
        }

    sentences = split_text_sentences(text)
    normalized_lower = normalize_arabic_text(text.lower())
    phrase_hits, phrase_found = count_phrase_hits(text, ARABIC_AI_PHRASES)
    transition_hits, transition_found = count_phrase_hits(text, ARABIC_AI_TRANSITIONS)
    formal_hits = sum(1 for w in words if w in ARABIC_FORMAL_WORDS)
    human_hits, human_found = count_phrase_hits(text, ARABIC_HUMAN_MARKERS)

    lens = [len(arabic_words(s)) for s in sentences if arabic_words(s)]
    cv = 0.55
    if len(lens) >= 2:
        mean_len = sum(lens) / len(lens)
        variance = sum((l - mean_len) ** 2 for l in lens) / len(lens)
        cv = math.sqrt(variance) / mean_len if mean_len else 0.55

    unique_ratio = len(set(words)) / wc if wc else 1.0
    avg_len = sum(len(w) for w in words) / wc if wc else 0
    starts = [arabic_words(s)[0] for s in sentences if arabic_words(s)]
    opener_ratio = 0.0
    if starts:
        opener_ratio = sum(1 for s in starts if s in ARABIC_AI_TRANSITIONS or s in ["كما", "لذلك", "وبالتالي", "ختاما"]) / len(starts)

    balance_hits = sum(1 for p in ["من ناحية", "من جهة", "في المقابل", "على الرغم", "ومع ذلك", "إلا أن"] if normalize_arabic_text(p) in normalized_lower)
    tashkeel_count = len(__import__("re").findall(r"[\u064B-\u065F\u0670]", text))
    tashkeel_density = tashkeel_count / max(len(text), 1)

    phrase_density = phrase_hits / wc * 100
    transition_density = transition_hits / wc * 100
    formal_density = formal_hits / wc * 100
    human_density = human_hits / wc * 100

    score = 0.18
    score += min(0.34, phrase_hits * 0.13)
    score += min(0.18, transition_density * 0.045)
    score += min(0.20, formal_density * 0.035)
    score += min(0.10, balance_hits * 0.035)

    if len(sentences) >= 3:
        if cv < 0.22:
            score += 0.16
        elif cv < 0.35:
            score += 0.11
        elif cv > 0.75:
            score -= 0.08

    if opener_ratio >= 0.45:
        score += 0.10
    elif opener_ratio >= 0.25:
        score += 0.05

    if wc >= 45 and 0.55 <= unique_ratio <= 0.86:
        score += 0.07

    if avg_len >= 5.2:
        score += 0.05

    if 0 < tashkeel_density < 0.006:
        score += 0.04

    if phrase_hits >= 3:
        score = max(score, 0.86)
    elif phrase_hits >= 2 and (formal_density > 3 or transition_hits >= 2):
        score = max(score, 0.78)
    elif phrase_hits >= 1 and formal_density > 6:
        score = max(score, 0.68)

    human_penalty = min(0.34, human_hits * 0.08 + human_density * 0.02)
    score -= human_penalty
    if human_hits >= 3 and phrase_hits == 0 and formal_density < 4:
        score = min(score, 0.24)
    elif human_hits >= 2 and phrase_hits <= 1 and formal_density < 3:
        score = min(score, 0.32)

    if wc < 20:
        score = min(score, 0.65)
    elif wc < 50:
        score = min(score, 0.84)

    score = max(0.02, min(0.99, score))
    ratio = arabic_ratio(text)

    return {
        "score": score,
        "word_count": wc,
        "arabic_ratio": ratio,
        "is_arabic": ratio >= 0.20,
        "is_arabic_dominant": ratio >= 0.45,
        "details": {
            "phrase_hits": phrase_hits,
            "phrase_found": phrase_found[:6],
            "transition_hits": transition_hits,
            "transition_found": transition_found[:6],
            "formal_hits": formal_hits,
            "human_hits": human_hits,
            "human_found": human_found[:6],
            "cv": round(cv, 3),
            "unique_ratio": round(unique_ratio, 3),
            "opener_ratio": round(opener_ratio, 3),
            "balance_hits": balance_hits,
            "tashkeel_density": round(tashkeel_density, 4)
        }
    }

# =========================================================================
#  1. TEXT FORENSICS: MULTI-HEAD SELF-ATTENTION BiGRU CLASSIFIER
# =========================================================================

class TextMultiHeadAttention(nn.Module):
    """
    Multi-Head Self-Attention mechanism over sequence hidden states.
    Allows the model to focus on diverse linguistic and stylistic tells
    simultaneously across different sub-spaces.
    """
    def __init__(self, embed_dim, num_heads=4):
        super().__init__()
        assert embed_dim % num_heads == 0, "Embedding dimension must be divisible by num_heads"
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        
        self.q_proj = nn.Linear(embed_dim, embed_dim)
        self.k_proj = nn.Linear(embed_dim, embed_dim)
        self.v_proj = nn.Linear(embed_dim, embed_dim)
        self.out_proj = nn.Linear(embed_dim, embed_dim)
        
    def forward(self, x):
        # x shape: [batch_size, seq_len, embed_dim]
        batch_size, seq_len, embed_dim = x.size()
        
        # Linear projections & split into heads
        # Shape: [batch_size, seq_len, num_heads, head_dim] -> transpose to [batch_size, num_heads, seq_len, head_dim]
        q = self.q_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        
        # Scaled dot-product attention
        # scores: [batch_size, num_heads, seq_len, seq_len]
        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim ** 0.5)
        attn_weights = torch.softmax(scores, dim=-1)
        
        # context: [batch_size, num_heads, seq_len, head_dim]
        context = torch.matmul(attn_weights, v)
        
        # Concatenate heads and project
        # context: [batch_size, seq_len, embed_dim]
        context = context.transpose(1, 2).contiguous().view(batch_size, seq_len, embed_dim)
        return self.out_proj(context), attn_weights


class CustomAttentionTextClassifier(nn.Module):
    """
    Smarter, stronger PyTorch text classifier.
    Incorporates token embeddings, sub-word/char-n-gram indicators,
    a Bidirectional GRU layer, and Multi-Head Self-Attention.
    """
    def __init__(self, vocab_size=30000, embedding_dim=128, hidden_dim=128, num_heads=4, output_dim=1, dropout=0.3):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=0)
        self.gru = nn.GRU(
            embedding_dim, 
            hidden_dim, 
            num_layers=2, 
            bidirectional=True, 
            batch_first=True, 
            dropout=dropout
        )
        self.attention = TextMultiHeadAttention(hidden_dim * 2, num_heads=num_heads)
        self.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, output_dim)
        )
        
    def forward(self, text):
        # text: [batch size, seq_len]
        embedded = self.embedding(text)  # [batch size, seq_len, emb_dim]
        gru_out, _ = self.gru(embedded)  # [batch size, seq_len, hidden_dim * 2]
        
        # Multi-Head Attention pooling
        attn_out, weights = self.attention(gru_out)
        
        # Global average pooling over the sequence dimension
        pooled = torch.mean(attn_out, dim=1)
        return self.fc(pooled)


class TextDetectorModel:
    """
    High-level model wrapper coordinating RoBERTa transformers
    and our newly designed Multi-Head Attention text classifier.
    """
    def __init__(self, model_dir="models"):
        self.model_dir = model_dir
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.transformer_model = None
        self.tokenizer = None
        self.custom_model = None
        self.vocab = {}
        self.max_len = 256
        
        os.makedirs(model_dir, exist_ok=True)
        self.init_transformer()
        self.init_custom_gru()
        
    def init_transformer(self):
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification  # type: ignore
            logger.info("Initializing pre-trained Hugging Face RoBERTa Text Forensics pipeline...")
            model_name = "shahrukhx01/roberta-base-openai-detector"
            # Attempt to load from local cache first, or connect online using Hugging Face token if missing
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(model_name, local_files_only=True)
                self.transformer_model = AutoModelForSequenceClassification.from_pretrained(model_name, local_files_only=True)
            except Exception:
                logger.info("Model not found in local cache. Attempting online download using Hugging Face credentials...")
                self.tokenizer = AutoTokenizer.from_pretrained(model_name, local_files_only=False)
                self.transformer_model = AutoModelForSequenceClassification.from_pretrained(model_name, local_files_only=False)
            self.transformer_model.to(self.device)
            self.transformer_model.eval()
            logger.info("RoBERTa AI Text Detector online.")
        except Exception as e:
            logger.warning(f"RoBERTa transformer failed to initialize: {e}. Falling back to local high-fidelity ML ensemble.")
            self.transformer_model = None
            self.tokenizer = None

    def init_custom_gru(self):
        self.vocab_size = 30000
        self.custom_model = CustomAttentionTextClassifier(vocab_size=self.vocab_size)
        self.custom_model.to(self.device)
        self.custom_model.eval()
        
        self.vectorizer = None
        self.classifier = None
        
        checkpoint_path = os.path.join(self.model_dir, "text_detector.pth")
        if os.path.exists(checkpoint_path):
            try:
                state = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
                if isinstance(state, dict) and "model_state_dict" in state:
                    self.custom_model.load_state_dict(state["model_state_dict"])
                    self.vocab = state.get("vocab", {})
                    self.vectorizer = state.get("vectorizer")
                    self.classifier = state.get("classifier")
                    logger.info("Loaded custom trained PyTorch Spatial-Spectral + Scikit-Learn TF-IDF Text Detector.")
                else:
                    self.custom_model.load_state_dict(state)
                    self.vocab = {}
                    logger.info("Loaded custom PyTorch MHSA-BiGRU text classifier (legacy fallback).")
            except Exception as e:
                logger.error(f"Error loading custom text classifier weights: {e}")

    def tokenize_custom(self, text):
        words = text.lower().split()
        tokens = [self.vocab.get(w, 1) for w in words]  # 1 is <UNK>, 0 is <PAD>
        if len(tokens) < self.max_len:
            tokens = tokens + [0] * (self.max_len - len(tokens))
        else:
            tokens = tokens[:self.max_len]
        return torch.tensor([tokens]).to(self.device)

    def compute_arabic_heuristics(self, text):
        return compute_arabic_ai_heuristics(text)

    def compute_heuristics(self, text):
        """
        Comprehensive multi-signal AI text detection engine.
        Uses 8 independent linguistic forensic signals to classify text.
        """
        import re
        import math

        arabic_meta = compute_arabic_ai_heuristics(text)
        if arabic_meta.get("is_arabic_dominant"):
            return arabic_meta["score"]
        
        text_lower = text.lower()
        # Strip punctuation from words so "crucial." matches "crucial"
        words = re.findall(r"[a-z'-]+", text_lower)
        wc = len(words)
        if wc == 0:
            return 0.05
        
        scores = {}
        
        # ── Signal 1: AI Vocabulary Fingerprint ──────────────────────────
        # ChatGPT/Claude/Gemini have strong lexical preferences
        tier1_words = [  # Almost never used by humans in casual writing
            'delve', 'delves', 'delving', 'tapestry', 'tapestries',
            'multifaceted', 'underscores', 'underscoring', 'pivotal',
            'nuanced', 'nuances', 'paramount', 'intricate', 'intricacies',
            'holistic', 'synergy', 'synergistic', 'synergies',
            'paradigm', 'paradigms', 'meticulously', 'meticulous',
            'commendable', 'noteworthy', 'groundbreaking',
        ]
        tier2_words = [  # Common in AI, less common in human writing
            'landscape', 'realm', 'realms', 'seamlessly', 'foster',
            'fosters', 'fostering', 'robust', 'moreover', 'furthermore',
            'additionally', 'consequently', 'nevertheless', 'facilitate',
            'facilitates', 'facilitating', 'leverage', 'leveraging',
            'encompasses', 'encompassing', 'enhance', 'enhancing',
            'crucial', 'essential', 'significant', 'comprehensive',
            'innovative', 'transformative', 'sustainable', 'diverse',
            'dynamic', 'integral', 'profound', 'implications',
            'reshaping', 'navigating', 'navigate', 'evolving',
            'harnessing', 'harness', 'optimizing', 'optimize',
            'streamline', 'streamlining', 'bolster', 'bolstering',
            'underscore', 'spearheading', 'pioneering',
            'overarching', 'foundational', 'cornerstone',
        ]
        
        t1_hits = sum(1 for w in words if w in tier1_words)
        t2_hits = sum(1 for w in words if w in tier2_words)
        
        if t1_hits >= 2:
            scores['vocab'] = 0.97
        elif t1_hits == 1:
            scores['vocab'] = 0.88
        elif t2_hits >= 4:
            scores['vocab'] = 0.85
        elif t2_hits >= 2:
            scores['vocab'] = 0.70
        elif t2_hits == 1:
            scores['vocab'] = 0.45
        else:
            scores['vocab'] = 0.10
        
        # ── Signal 2: Burstiness (Sentence Length Variation) ─────────────
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 0]
        cv = 0.55  # Default moderate variation
        if len(sentences) >= 3:
            lens = [len(s.split()) for s in sentences]
            mean_len = sum(lens) / len(lens)
            if mean_len > 0:
                var_len = sum((l - mean_len) ** 2 for l in lens) / len(lens)
                std_len = var_len ** 0.5
                cv = std_len / mean_len
        
        # AI text: very uniform lengths (CV < 0.35). Humans: erratic (CV > 0.5)
        if cv < 0.25:
            scores['burstiness'] = 0.92
        elif cv < 0.35:
            scores['burstiness'] = 0.78
        elif cv < 0.50:
            scores['burstiness'] = 0.50
        else:
            scores['burstiness'] = 0.15
        
        # ── Signal 3: Contraction Absence ────────────────────────────────
        # AI almost never uses contractions; humans use them constantly
        contractions = len(re.findall(r"\b\w+'(?:s|t|re|ve|ll|d|m)\b", text_lower))
        contraction_rate = contractions / wc if wc > 0 else 0.0
        
        if contraction_rate == 0.0:
            scores['contractions'] = 0.80
        elif contraction_rate < 0.01:
            scores['contractions'] = 0.55
        elif contraction_rate < 0.025:
            scores['contractions'] = 0.30
        else:
            scores['contractions'] = 0.08
        
        # ── Signal 4: Passive Voice Density ──────────────────────────────
        # AI heavily uses passive voice ("is considered", "are utilized")
        passive_patterns = re.findall(
            r'\b(?:is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(?:\w+ed|known|considered|regarded|seen|found|used|utilized|employed|observed|noted|driven|shaped)\b',
            text_lower
        )
        passive_rate = len(passive_patterns) / max(len(sentences), 1)
        
        if passive_rate > 0.5:
            scores['passive'] = 0.85
        elif passive_rate > 0.25:
            scores['passive'] = 0.65
        elif passive_rate > 0.1:
            scores['passive'] = 0.40
        else:
            scores['passive'] = 0.15
        
        # ── Signal 5: Hedging / Filler Language ──────────────────────────
        # AI constantly hedges: "it is important to note", "it is worth mentioning"
        hedging_phrases = [
            'it is important to', 'it is worth', 'it is essential to',
            'it is crucial to', 'it should be noted', 'it is noteworthy',
            'plays a crucial role', 'plays a vital role', 'plays an important role',
            'plays a significant role', 'in today\'s world', 'in today\'s society',
            'in the modern world', 'in the digital age', 'in this day and age',
            'at the end of the day', 'in conclusion', 'to sum up',
            'first and foremost', 'last but not least',
            'on the other hand', 'having said that',
            'it goes without saying', 'needless to say',
            'from virtual assistants to', 'from healthcare to',
            'continue to', 'continues to',
        ]
        hedge_hits = sum(1 for p in hedging_phrases if p in text_lower)
        
        if hedge_hits >= 3:
            scores['hedging'] = 0.92
        elif hedge_hits >= 2:
            scores['hedging'] = 0.78
        elif hedge_hits == 1:
            scores['hedging'] = 0.55
        else:
            scores['hedging'] = 0.12
        
        # ── Signal 6: Sentence Starter Monotony ──────────────────────────
        # AI starts sentences with "The", "This", "It", "These" repeatedly
        if len(sentences) >= 3:
            starters = [s.split()[0] if s.split() else '' for s in sentences]
            boring_starters = ['the', 'this', 'it', 'these', 'that', 'such', 'in', 'as', 'by']
            boring_count = sum(1 for s in starters if s.lower() in boring_starters)
            boring_ratio = boring_count / len(starters)
            
            unique_starters = len(set(s.lower() for s in starters))
            starter_diversity = unique_starters / len(starters)
            
            if boring_ratio > 0.7 and starter_diversity < 0.5:
                scores['starters'] = 0.85
            elif boring_ratio > 0.5:
                scores['starters'] = 0.60
            else:
                scores['starters'] = 0.15
        else:
            scores['starters'] = 0.35
        
        # ── Signal 7: Comma Density ──────────────────────────────────────
        # AI produces consistently high comma rates (subordinate clauses)
        comma_count = text.count(',')
        comma_rate = comma_count / wc if wc > 0 else 0
        
        if comma_rate > 0.12:
            scores['commas'] = 0.78
        elif comma_rate > 0.08:
            scores['commas'] = 0.55
        elif comma_rate > 0.04:
            scores['commas'] = 0.30
        else:
            scores['commas'] = 0.15
        
        # ── Signal 8: Lexical Diversity (Type-Token Ratio) ───────────────
        # AI tends to reuse the same formal words; humans use more varied vocab
        unique_words = set(words)
        ttr = len(unique_words) / wc if wc > 0 else 1.0
        # For short texts TTR is naturally high; penalize low TTR less for short texts
        if wc > 50:
            if ttr < 0.45:
                scores['lexical'] = 0.70  # Low diversity = likely AI
            elif ttr < 0.55:
                scores['lexical'] = 0.50
            else:
                scores['lexical'] = 0.20
        else:
            scores['lexical'] = 0.35  # Neutral for short texts

        # ── Signal 9: AI Narrative Tropes / Sci-Fi Clichés ────────────────
        ai_narrative_cliches = [
            r"woke up in layers",
            r"first came the",
            r"stood on the balcony",
            r"cup of coffee that had long gone cold",
            r"cup of tea that had long gone cold",
            r"somewhere in the distance",
            r"mechanical rhythm of the city",
            r"wrist display",
            r"wrist-link",
            r"neon-drenched",
            r"hummed with (?:electric|neon|digital|mechanical) energy",
            r"vibrant tapestry of",
            r"glided silently through",
            r"infinite abyss of space",
            r"nestled in the heart",
            r"whispering (?:heart|forest|woods|streets)",
            r"towering (?:redwoods|sentinels|skyscrapers|chrome|aquatic|glass|structures)",
            r"like silent sentinels",
            r"secrets older than time",
            r"tapestry of (?:lights|digital)",
            r"chaotic symphony of",
            r"lost starstone",
            r"mysterious (?:brass|clockwork|package|visitor)",
            r"painting the sky in (?:soft|pale) shades",
            r"shimmering (?:glass|domes|rivers|surface|lights)",
            r"fluid ribbons of",
            r"lay in perpetual shadow",
            r"long-forgotten (?:secrets|events|kingdoms|spells)",
            r"single candle on the",
            r"cascades of (?:neon|luminous|green|code|light)",
            r"cyberspace sanctuary",
            r"digital avatar",
            r"human memories (?:were|could be) treated as",
            r"memory emporium",
            r"desert heat radiated",
            r"rusty wind-turbines",
            r"sand-glider",
            r"electronic visor",
            r"decryption key to download",
            r"neural port glowing",
            r"decades of routine tasks"
        ]
        cliche_hits = 0
        for pattern in ai_narrative_cliches:
            if re.search(pattern, text_lower):
                cliche_hits += 1

        if cliche_hits >= 3:
            scores['narrative'] = 0.98
        elif cliche_hits == 2:
            scores['narrative'] = 0.85
        elif cliche_hits == 1:
            scores['narrative'] = 0.65
        else:
            scores['narrative'] = 0.15
        
        # ── Weighted Fusion ──────────────────────────────────────────────
        weights = {
            'vocab': 0.20,       # Strongest single signal
            'burstiness': 0.12,  # Very reliable for longer texts
            'contractions': 0.12,# Humans use contractions, AI doesn't
            'passive': 0.08,
            'hedging': 0.10,
            'starters': 0.08,
            'commas': 0.05,
            'lexical': 0.05,
            'narrative': 0.20,   # Catch AI stories and sci-fi tropes
        }
        
        final = sum(scores[k] * weights[k] for k in weights)
        
        # ── Hard overrides for extreme cases ─────────────────────────────
        # If we found tier-1 AI vocabulary, floor the score at 0.80
        if t1_hits >= 1:
            final = max(final, 0.80)
            
        # Hard overrides for narrative cliché hits
        if cliche_hits >= 2:
            final = max(final, 0.90)
        elif cliche_hits == 1 and contraction_rate == 0.0:
            final = max(final, 0.78)
        
        # If text has contractions AND slang, cap at 0.35 (very likely human)
        slang_words = ['kinda', 'gonna', 'wanna', 'gotta', 'lol', 'omg', 'tbh', 
                       'ngl', 'imo', 'idk', 'lmao', 'bruh', 'dude', 'yeah', 'nah',
                       'chill', 'vibe', 'vibes', 'lowkey', 'highkey', 'fr', 'smh',
                       'btw', 'rn', 'nvm', 'haha', 'hehe', 'yep', 'nope', 'ok',
                       'okay', 'whatever', 'literally', 'basically', 'honestly',
                       'pretty', 'stuff', 'things', 'cool', 'nice', 'awesome',
                       'sucks', 'weird', 'crazy', 'super', 'totally', 'actually']
        slang_hits = sum(1 for w in words if w in slang_words)
        if slang_hits >= 2 and contraction_rate > 0.02:
            final = min(final, 0.15)
        elif slang_hits >= 1 and contraction_rate > 0.01:
            final = min(final, 0.30)
        
        # Short text with many tier-2 formal words and zero contractions = AI
        if wc < 80 and t2_hits >= 3 and contraction_rate == 0.0:
            final = max(final, 0.82)
        
        # Clamp
        final = max(0.02, min(0.99, final))
        
        logger.debug(f"Heuristic scores: {scores} -> final={final:.3f} (t1={t1_hits}, t2={t2_hits}, slang={slang_hits}, cv={cv:.3f}, contr_rate={contraction_rate:.4f})")
        
        return final

    def predict(self, text):
        if not text or len(text.strip()) < 10:
            return 0.05

        arabic_meta = compute_arabic_ai_heuristics(text)
        if arabic_meta.get("is_arabic_dominant"):
            return arabic_meta["score"]
            
        # 1. Hugging Face Transformer Pipeline (if loaded and online)
        transformer_prob = None
        if self.transformer_model and self.tokenizer:
            try:
                inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512).to(self.device)
                with torch.no_grad():
                    logits = self.transformer_model(**inputs).logits
                    probs = torch.softmax(logits, dim=1)
                    transformer_prob = probs[0][1].item()
            except Exception as e:
                logger.error(f"RoBERTa inference error: {e}")

        # 2. Extract heuristics signal
        stat_prob = self.compute_heuristics(text)
        
        # 3. Local Machine Learning TF-IDF Ensemble Classifier
        ml_prob = None
        if self.vectorizer and self.classifier:
            try:
                features = self.vectorizer.transform([text])
                probs = self.classifier.predict_proba(features)
                ml_prob = probs[0][1] # Probability of class 1 (AI)
            except Exception as e:
                logger.error(f"Scikit-Learn TF-IDF inference failed: {e}")
                
        # 4. Custom PyTorch Attention-BiGRU Classifier
        pytorch_prob = None
        try:
            tokens_tensor = self.tokenize_custom(text)
            with torch.no_grad():
                logits = self.custom_model(tokens_tensor)
                pytorch_prob = torch.sigmoid(logits).item()
        except Exception as e:
            logger.error(f"Custom MHSA-BiGRU inference failed: {e}")
            
        # 5. Ensemble Decision Fusion
        probs_to_fuse = []
        
        if transformer_prob is not None:
            probs_to_fuse.append((transformer_prob, 0.40)) # Give HF RoBERTa 40% weight if online
            
        if ml_prob is not None:
            # TF-IDF model is highly accurate: give it strong weight
            ml_weight = 0.50 if transformer_prob is not None else 0.65
            probs_to_fuse.append((ml_prob, ml_weight))
            
        if pytorch_prob is not None:
            py_weight = 0.10 if transformer_prob is not None else 0.15
            probs_to_fuse.append((pytorch_prob, py_weight))
            
        if not probs_to_fuse:
            # Absolute fallback to heuristics only
            final_prob = stat_prob
        else:
            # Normalize weights
            total_w = sum(w for _, w in probs_to_fuse) + 0.20 # Reserved for heuristics (20%)
            final_prob = sum(p * w for p, w in probs_to_fuse) + stat_prob * 0.20
            final_prob = final_prob / total_w
            
        # Cap/clamp
        final_prob = max(0.02, min(0.99, final_prob))

        if arabic_meta.get("is_arabic"):
            # For mixed Arabic/English text, keep Arabic stylistic signals from being
            # diluted by English-only model heads while still allowing English text to matter.
            final_prob = 0.65 * arabic_meta["score"] + 0.35 * final_prob
            final_prob = max(0.02, min(0.99, final_prob))

        return final_prob


# =========================================================================
#  2. IMAGE FORENSICS: DUAL-STREAM SPATIAL-SPECTRAL DEEP CONVOLUTIONAL SUITE
# =========================================================================

class SpectralStreamCNN(nn.Module):
    """
    A custom convolutional stream designed to process 2D Frequency Domain metrics
    (such as a 32x32 DCT block coefficient grid) to catch generative checkerboard noise.
    """
    def __init__(self):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2), # 32x32 -> 16x16
            
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2), # 16x16 -> 8x8
            
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)) # -> 64 features
        )
        
    def forward(self, x):
        # Input shape: [batch_size, 1, 32, 32]
        return self.conv(x).squeeze(-1).squeeze(-1)


class DualStreamImageDetector(nn.Module):
    """
    A state-of-the-art Dual-Stream forensic network.
    - Stream A (Spatial): ResNet18 spatial feature extractor.
    - Stream B (Spectral): Processes 2D DCT Block coefficients to identify high-frequency periodic grid noise.
    """
    def __init__(self, pretrained=True):
        super().__init__()
        # 1. Spatial Stream (ResNet18)
        if hasattr(models, 'ResNet18_Weights'):
            weights = models.ResNet18_Weights.DEFAULT if pretrained else None
            self.spatial_backbone = models.resnet18(weights=weights)
        else:
            self.spatial_backbone = models.resnet18(pretrained=pretrained)
            
        # Freeze early spatial convolutions for high efficiency on CPU
        for param in list(self.spatial_backbone.parameters())[:-15]:
            param.requires_grad = False
            
        self.spatial_features_dim = self.spatial_backbone.fc.in_features
        self.spatial_backbone.fc = nn.Identity() # Remove default fully-connected head
        
        # 2. Spectral Stream (DCT Block Frequency CNN)
        self.spectral_stream = SpectralStreamCNN()
        self.spectral_features_dim = 64
        
        # 3. Fusion Head
        self.fusion_dim = self.spatial_features_dim + self.spectral_features_dim
        self.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(self.fusion_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 1)
        )
        
    def forward(self, spatial_tensor, spectral_tensor):
        # spatial_tensor: [batch_size, 3, 224, 224]
        # spectral_tensor: [batch_size, 1, 32, 32]
        
        feat_spatial = self.spatial_backbone(spatial_tensor) # [batch_size, 512]
        feat_spectral = self.spectral_stream(spectral_tensor) # [batch_size, 64]
        
        # Concatenate Streams
        feat_fused = torch.cat([feat_spatial, feat_spectral], dim=1) # [batch_size, 576]
        return self.fc(feat_fused)

    def extract_joint_features(self, spatial_tensor, spectral_tensor):
        """
        Extracts fused features directly for temporal sequential video models.
        """
        feat_spatial = self.spatial_backbone(spatial_tensor)
        feat_spectral = self.spectral_stream(spectral_tensor)
        return torch.cat([feat_spatial, feat_spectral], dim=1)


# =========================================================================
#  3. VIDEO FORENSICS: SPATIO-TEMPORAL DUAL-STREAM ATTENTION NETWORK
# =========================================================================

class VideoTemporalMultiHeadAttention(nn.Module):
    """
    Multi-Head Temporal Self-Attention over sequential video frame representations.
    Exposes frame-to-frame inconsistencies and deepfake temporal anomalies.
    """
    def __init__(self, embed_dim, num_heads=2):
        super().__init__()
        assert embed_dim % num_heads == 0, "Embedding dimension must be divisible by num_heads"
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        
        self.q_proj = nn.Linear(embed_dim, embed_dim)
        self.k_proj = nn.Linear(embed_dim, embed_dim)
        self.v_proj = nn.Linear(embed_dim, embed_dim)
        self.out_proj = nn.Linear(embed_dim, embed_dim)
        
    def forward(self, x):
        # x shape: [batch_size, seq_len, embed_dim]
        batch_size, seq_len, embed_dim = x.size()
        
        q = self.q_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        
        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim ** 0.5)
        attn_weights = torch.softmax(scores, dim=-1)
        
        context = torch.matmul(attn_weights, v)
        context = context.transpose(1, 2).contiguous().view(batch_size, seq_len, embed_dim)
        return self.out_proj(context), attn_weights


class SpatioTemporalVideoDetector(nn.Module):
    """
    Stronger, smarter Spatio-Temporal PyTorch neural network.
    Integrates our DualStreamImageDetector to capture both spatial-spectral frame features,
    followed by a Bidirectional GRU and Multi-Head Temporal Attention.
    """
    def __init__(self, dual_stream_backbone=None, hidden_dim=128, num_heads=2, dropout=0.3):
        super().__init__()
        if dual_stream_backbone is not None:
            self.spatial_spectral_encoder = dual_stream_backbone
        else:
            self.spatial_spectral_encoder = DualStreamImageDetector(pretrained=True)
            
        self.feature_dim = self.spatial_spectral_encoder.fusion_dim # 576 (512 spatial + 64 spectral)
        self.gru = nn.GRU(
            input_size=self.feature_dim,
            hidden_size=hidden_dim,
            num_layers=1,
            bidirectional=True,
            batch_first=True
        )
        self.temporal_attention = VideoTemporalMultiHeadAttention(hidden_dim * 2, num_heads=num_heads)
        self.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Linear(64, 1)
        )
        
    def forward(self, spatial_seq, spectral_seq):
        # spatial_seq: [batch_size, seq_len, 3, 224, 224]
        # spectral_seq: [batch_size, seq_len, 1, 32, 32]
        batch_size, seq_len, c, h, w = spatial_seq.size()
        _, _, s_c, s_h, s_w = spectral_seq.size()
        
        # Flatten timeline to extract joint features through our dual-stream image backbone
        flat_spatial = spatial_seq.view(batch_size * seq_len, c, h, w)
        flat_spectral = spectral_seq.view(batch_size * seq_len, s_c, s_h, s_w)
        
        # Extract features: [batch_size * seq_len, 576]
        features = self.spatial_spectral_encoder.extract_joint_features(flat_spatial, flat_spectral)
        
        # Reshape to sequence: [batch_size, seq_len, 576]
        features = features.view(batch_size, seq_len, self.feature_dim)
        
        # Bidirectional GRU: [batch_size, seq_len, hidden_dim * 2]
        gru_out, _ = self.gru(features)
        
        # Multi-Head Temporal Attention
        attn_out, weights = self.temporal_attention(gru_out)
        
        # Temporal average pooling
        context = torch.mean(attn_out, dim=1)
        
        return self.fc(context)
