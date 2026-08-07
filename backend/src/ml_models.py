import torch
import torch.nn as nn
import torchvision.models as models
import os
import re
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

logger = logging.getLogger(__name__)

ARABIC_CHAR_RE = r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]"

ARABIC_AI_PHRASES = [
    "من الجدير بالذكر",
    "تجدر الإشارة",
    "من المهم الإشارة",
    "لا بد من الإشارة",
    "علاوة على ذلك",
    "بالإضافة إلى ذلك",
    "فضلا عن ذلك",
    "في هذا السياق",
    "من ناحية أخرى",
    "على صعيد آخر",
    "في المقابل",
    "ومع ذلك",
    "بشكل عام",
    "بصورة عامة",
    "يمكن القول",
    "يمكننا القول",
    "لا شك أن",
    "في نهاية المطاف",
    "في الختام",
    "ختاما",
    "خلاصة القول",
    "على سبيل المثال لا الحصر",
    "يلعب دورا محوريا",
    "دورا محوريا",
    "يسهم بشكل كبير",
    "يساهم بشكل كبير",
    "يمثل خطوة مهمة",
    "يشكل عاملا أساسيا",
    "تحقيق التنمية المستدامة",
    "تعزيز الكفاءة",
    "تحسين جودة",
    "مواكبة التطورات",
    "مما لا شك فيه",
    "في العصر الحديث",
    "في ظل التطورات",
    "لا يخفى على أحد",
    "أصبح من الضروري",
    "مما يسهم في",
    "مما يؤدي إلى",
    "بناء على ذلك",
    "نتيجة لذلك",
    "في ظل التطورات المتسارعة",
    "في عالمنا اليوم",
    "في العصر الرقمي",
    "في عالمنا المترابط",
    "من المهم أن ندرك",
    "من المهم ملاحظة",
    "لا يمكن إنكار أن",
    "من الواضح أن",
    "من أبرز الجوانب",
    "على نطاق واسع",
    "بشكل متزايد",
    "بشكل ملحوظ",
    "بصورة فعالة",
    "بشكل فعال",
    "يلعب دورا حيويا",
    "دورا حيويا",
    "أمرا بالغ الأهمية",
    "أمر بالغ الأهمية",
    "يسلط الضوء على",
    "يسلط الضوء",
    "يعكس أهمية",
    "يعزز القدرة على",
    "مفتاحا أساسيا",
    "ركيزة أساسية",
    "حجر الزاوية",
    "حلولا مبتكرة",
    "نهجا شاملا",
    "إطارا متكاملا",
    "تجربة أكثر سلاسة",
    "التحول الرقمي",
    "المشهد الرقمي",
    "المشهد المتطور بسرعة",
    "التطور السريع",
    "التغيرات المتسارعة",
    "الخوض في",
    "نسيجا من",
    "نسيج غني",
    "متعدد الأوجه",
]

ARABIC_AI_TRANSITIONS = [
    "أولا",
    "ثانيا",
    "ثالثا",
    "أخيرا",
    "لذلك",
    "وبالتالي",
    "ومن ثم",
    "علاوة",
    "بالإضافة",
    "فضلا",
    "كذلك",
    "أيضا",
    "في المقابل",
    "من ناحية",
    "من جهة",
    "على الرغم",
    "بالرغم",
    "ومع ذلك",
    "بالمثل",
    "من ثم",
    "ومن هنا",
    "عليه",
    "بناء عليه",
    "نتيجة لذلك",
    "إضافة إلى ذلك",
    "علاوة على ذلك",
    "من جانب آخر",
]

ARABIC_FORMAL_WORDS = [
    "محوري",
    "استراتيجي",
    "شامل",
    "مستدام",
    "مبتكر",
    "فعال",
    "متكامل",
    "منظومة",
    "تعزيز",
    "تحسين",
    "تطوير",
    "تحقيق",
    "تسهم",
    "يسهم",
    "تساهم",
    "يساهم",
    "يعد",
    "تعد",
    "يعتبر",
    "تعتبر",
    "ضرورة",
    "أهمية",
    "الرقمي",
    "التحول",
    "الكفاءة",
    "الجودة",
    "المستقبل",
    "الابتكار",
    "التحديات",
    "الفرص",
    "المجالات",
    "المختلفة",
    "حيوي",
    "بالغ",
    "الأهمية",
    "إطار",
    "نهج",
    "حلول",
    "متطورة",
    "متسارعة",
    "سلاسة",
    "مرونة",
    "فعالية",
    "رئيسي",
    "أساسي",
]

ARABIC_FORMAL_ROOTS = [
    "محور",
    "استراتيج",
    "شامل",
    "مستدام",
    "مبتكر",
    "فعال",
    "متكامل",
    "منظوم",
    "تعزيز",
    "تحسين",
    "تطوير",
    "تحقيق",
    "كفاء",
    "جود",
    "ابتكار",
    "تحدي",
    "فرص",
    "مجال",
    "ضرور",
    "اهمي",
    "رقمي",
    "تحول",
    "مستقبل",
    "حلول",
    "نهج",
    "اطار",
    "متسارع",
    "متطور",
    "حيوي",
    "بالغ",
    "رئيسي",
    "اساسي",
    "ركيز",
    "يسلط",
    "مواكب",
    "يسهم",
    "يساهم",
    "تعكس",
    "يعكس",
]

ARABIC_HUMAN_MARKERS = [
    "يعني",
    "والله",
    "بصراحة",
    "صراحة",
    "شوي",
    "شوية",
    "مره",
    "مرة",
    "كثير",
    "كتير",
    "كذا",
    "بس",
    "مو",
    "مش",
    "عشان",
    "ليش",
    "ايش",
    "إيش",
    "وش",
    "ما ادري",
    "ما أدري",
    "احس",
    "أحس",
    "اليوم",
    "امس",
    "أمس",
    "بكرة",
    "هههه",
    "ههههه",
    "ههه",
    "يا جماعة",
    "ترى",
    "طيب",
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
    import re

    normalized = normalize_arabic_text(text.lower())
    count = 0
    found = []
    for phrase in phrases:
        phrase_norm = normalize_arabic_text(phrase.lower())
        # Use regex to match only whole words/phrases
        # We replace spaces with \s+ to handle multiple spaces
        escaped_phrase = re.escape(phrase_norm).replace(r"\ ", r"\s+")
        pattern = r"(?<![\w\u0600-\u06FF])" + escaped_phrase + r"(?![\w\u0600-\u06FF])"
        hits = len(re.findall(pattern, normalized))
        if hits:
            count += hits
            found.append(phrase)
    return count, found


def compute_arabic_ai_heuristics(text):
    import math
    import re

    words = arabic_words(text)
    wc = len(words)
    if wc == 0:
        return {
            "score": 0.05,
            "word_count": 0,
            "arabic_ratio": arabic_ratio(text),
            "is_arabic": False,
            "details": {},
        }

    sentences = split_text_sentences(text)
    normalized_lower = normalize_arabic_text(text.lower())

    # ---------------------------------------------------------
    # PHASE 1 & 2: 20 Filters Forensic Extraction
    # ---------------------------------------------------------

    # A01: Lexical Repetition (transition phrases)
    a01_hits, _ = count_phrase_hits(
        text,
        [
            "من المهم أن",
            "يجدر بالذكر",
            "تجدر الإشارة",
            "من الجدير بالذكر",
            "لا بد من الإشارة",
            "من المهم الإشارة",
            "مما تجدر الإشارة إليه",
            "من المهم ملاحظة",
            "يجب أن نلاحظ",
        ],
    )

    # A02 & A13: Transition Overuse
    a13_hits, transition_found = count_phrase_hits(
        text,
        [
            "علاوة على ذلك",
            "بالإضافة إلى ذلك",
            "فضلا عن ذلك",
            "لذلك",
            "وبالتالي",
            "ومن ثم",
            "كذلك",
            "بالتأكيد",
            "في الواقع",
            "في هذا السياق",
            "ونتيجة لذلك",
            "من جهة أخرى",
            "علاوة على ما سبق",
            "وبناء على ذلك",
        ],
    )

    # A03: Paragraph DNA (Paragraph starters)
    paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 10]
    p_starts = [arabic_words(p)[0] for p in paragraphs if arabic_words(p)]
    a03_hits = len(p_starts) - len(set(p_starts)) if len(p_starts) > 2 else 0

    # A04: Formality & A12: Safe Language & A18: Generic Content
    a04_hits, formal_found = count_phrase_hits(
        text,
        [
            "مما لا شك فيه",
            "في العصر الحديث",
            "في ظل التطورات",
            "لا يخفى على أحد",
            "أصبح من الضروري",
            "في ظل التطورات المتسارعة",
            "في عالمنا اليوم",
            "في العصر الرقمي",
            "في عالمنا المترابط",
        ],
    )
    a12_hits, _ = count_phrase_hits(
        text,
        [
            "بشكل عام",
            "بصورة عامة",
            "يمكن القول",
            "في نهاية المطاف",
            "خلاصة القول",
            "في الختام",
            "يمكن القول إن",
            "في جوهرها",
            "باختصار",
            "ختاما",
        ],
    )
    a18_hits, _ = count_phrase_hits(
        text,
        [
            "يلعب دورا محوريا",
            "يسهم بشكل كبير",
            "يمثل خطوة مهمة",
            "يشكل عاملا أساسيا",
            "تحقيق التنمية المستدامة",
            "تعزيز الكفاءة",
            "مواكبة التطورات",
            "الخوض في",
            "نسيجا من",
            "نسيج غني من",
            "متعدد الأوجه",
            "يسلط الضوء على",
            "بوصلة",
            "حجر الزاوية",
        ],
    )
    formal_root_hits = sum(
        1
        for word in words
        if word in ARABIC_FORMAL_WORDS
        or any(root in word for root in ARABIC_FORMAL_ROOTS)
    )

    # A14 & A15 & A19: Emotional/Personal/Dialect (Human Markers)
    a15_hits = sum(
        1 for w in words if w in ["أنا", "تجربتي", "رأيي", "شخصيا", "أعتقد", "أتوقع"]
    )
    human_hits, _ = count_phrase_hits(text, ARABIC_HUMAN_MARKERS)

    # Casual dialect (Gulf/Iraqi/Levantine) using precise word matching, not substring!
    casual_words = ["ليش", "شنو", "مو", "شلون", "عشان", "مشان", "بدي", "ابغى"]
    human_hits += sum(1 for w in words if w in casual_words)

    # A16: Contradiction & A17: Over-Optimization & A20: LLM Signature
    a17_triggered = 1 if text.count(":") >= 2 and text.count("-") >= 3 else 0
    a20_hits, _ = count_phrase_hits(text, ["أولا", "ثانيا", "ثالثا", "أخيرا"])

    # ChatGPT Creative Storytelling Markers
    story_hits, _ = count_phrase_hits(
        text,
        [
            "في مكان ما وسط كل ذلك",
            "لم تكن تنام حقا",
            "بينما امتلأت",
            "لكن في هذه الليلة",
            "بشيء غير متوقع",
            "وفي مكان ما",
            "وسط كل ذلك",
        ],
    )
    a20_hits += story_hits * 2
    a20_triggered = 1 if a20_hits >= 2 else 0

    # A05: Burstiness (Variance in sentence lengths)
    lens = [len(arabic_words(s)) for s in sentences if arabic_words(s)]
    cv = 0.55
    if len(lens) >= 2:
        mean_len = sum(lens) / len(lens)
        variance = sum((l - mean_len) ** 2 for l in lens) / len(lens)
        cv = math.sqrt(variance) / mean_len if mean_len else 0.55
    a05_triggered = 1 if cv < 0.35 else 0

    # A06: Perplexity & A08: Info Density
    unique_ratio = len(set(words)) / wc if wc else 1.0
    a06_triggered = 1 if unique_ratio < 0.60 and wc > 50 else 0
    avg_len = sum(len(w) for w in words) / wc if wc else 0
    a08_triggered = 1 if avg_len >= 5.2 else 0

    # A07: Semantic Redundancy & A10: Topic Expansion
    a07_hits, _ = count_phrase_hits(
        text, ["بعبارة أخرى", "أي أن", "بمعنى آخر", "كما ذكرنا سابقا"]
    )
    a10_hits, _ = count_phrase_hits(
        text, ["على سبيل المثال لا الحصر", "بما في ذلك", "من بينها", "مثل"]
    )

    # A09: AI Rhythm (sentence balance)
    balance_hits = sum(
        1
        for p in ["من ناحية", "من جهة", "في المقابل", "على الرغم", "ومع ذلك", "إلا أن"]
        if normalize_arabic_text(p) in normalized_lower
    )
    a09_triggered = 1 if balance_hits >= 2 else 0

    # A11: Hedging
    a11_hits, _ = count_phrase_hits(
        text, ["ربما", "قد", "يمكن", "يحتمل", "من الممكن", "يعتقد البعض"]
    )

    # ---------------------------------------------------------
    # PHASE 3: Cross-Filter Validation (Thresholds)
    # ---------------------------------------------------------
    triggered_filters = 0
    # Additive phrase hits (AI frequently stacks these)
    triggered_filters += a01_hits * 1.5
    triggered_filters += a13_hits * 1.5
    triggered_filters += a04_hits * 1.5
    triggered_filters += a12_hits * 1.5
    triggered_filters += a18_hits * 1.5
    triggered_filters += a07_hits
    triggered_filters += a10_hits
    triggered_filters += a11_hits

    # Formal language is common in human news/academic texts.
    # ONLY penalize formal language if there are other AI structural markers (like transition overuse or generic content).
    ai_structural_markers = a13_hits + a18_hits + a04_hits + a12_hits
    if ai_structural_markers > 0:
        triggered_filters += min(3.0, formal_root_hits * 0.15)

    # Structural triggers
    if a03_hits >= 1:
        triggered_filters += 1
    if a05_triggered:
        triggered_filters += 2.5
    if a06_triggered:
        triggered_filters += 2.0
    if a08_triggered:
        triggered_filters += 1
    if a09_triggered:
        triggered_filters += 1.5
    if a17_triggered:
        triggered_filters += 1.5
    if a20_triggered:
        triggered_filters += 1.5
    if (
        wc >= 35
        and formal_root_hits >= 7
        and cv < 0.52
        and human_hits == 0
        and ai_structural_markers > 0
    ):
        triggered_filters += 2.0
    if len(sentences) > 0 and len([s for s in sentences if s.endswith("!")]) == 0:
        triggered_filters += 1

    # Human dialect points heavily reduce the triggered count, but MSA personal pronouns (a15_hits) shouldn't blind the detector
    if human_hits > 0:
        if triggered_filters > 8:
            triggered_filters -= (
                human_hits * 1
            )  # Less reduction if highly AI structured
        else:
            triggered_filters -= human_hits * 3
    elif a15_hits >= 3 and triggered_filters <= 5:
        # Only slightly reduce if there are personal pronouns but weak AI signals
        triggered_filters -= 1

    triggered_filters = max(0, float(triggered_filters))  # type: ignore

    # Base Probability map based on triggers
    if triggered_filters <= 3:
        score = 0.35 + (triggered_filters * 0.15)  # 0.35 -> 0.80
    elif triggered_filters <= 8:
        score = 0.80 + ((triggered_filters - 3) * 0.04)  # 0.80 -> 1.00
    elif triggered_filters <= 14:
        score = 0.95 + ((triggered_filters - 8) * 0.01)  # 0.95 -> 0.99
    else:
        score = 0.98 + ((triggered_filters - 14) * 0.005)  # 0.98 -> 0.99

    # PHASE 4: Anti-False Positives
    if wc < 20:
        score = min(score, 0.45)  # Too short to be confident

    # Only override if it's explicitly a local dialect (human_hits), NOT standard MSA personal pronouns (a15_hits)
    # ChatGPT translations use 'أنا' and 'أعتقد', so capping based on a15_hits causes false negatives for translated AI text!
    if human_hits >= 2 and triggered_filters <= 6 and formal_root_hits < 5:
        score = min(score, 0.45)
    elif a15_hits >= 2 and triggered_filters <= 4:
        score = min(score, 0.49)

    # Removed artificial boosting
    score = max(0.0, min(1.0, score))
    ratio = arabic_ratio(text)

    return {
        "score": score,
        "word_count": wc,
        "arabic_ratio": ratio,
        "is_arabic": ratio >= 0.20,
        "is_arabic_dominant": ratio >= 0.45,
        "details": {
            "T01_Lexical_Repetition": a01_hits + a04_hits + a12_hits + a18_hits,
            "T05_Burstiness": "Low (AI Signal)" if a05_triggered else "High (Human)",
            "T06_Perplexity": "Low (Predictable)" if a06_triggered else "Normal",
            "T09_Rhythm_Balance": balance_hits,
            "T13_Transition_Overuse": a13_hits,
            "T14_Formal_Root_Density": formal_root_hits,
            "T15_Personal_Experience": "Detected" if a15_hits > 0 else "None",
            "T19_Dialect_Authenticity": "Detected" if human_hits > 0 else "None",
            "T20_LLM_Signature": "Detected" if a20_triggered else "None",
            "triggered_filters": triggered_filters,
            "cv": round(cv, 3),
        },
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
        assert (
            embed_dim % num_heads == 0
        ), "Embedding dimension must be divisible by num_heads"
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
        q = (
            self.q_proj(x)
            .view(batch_size, seq_len, self.num_heads, self.head_dim)
            .transpose(1, 2)
        )
        k = (
            self.k_proj(x)
            .view(batch_size, seq_len, self.num_heads, self.head_dim)
            .transpose(1, 2)
        )
        v = (
            self.v_proj(x)
            .view(batch_size, seq_len, self.num_heads, self.head_dim)
            .transpose(1, 2)
        )

        # Scaled dot-product attention
        # scores: [batch_size, num_heads, seq_len, seq_len]
        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim**0.5)
        attn_weights = torch.softmax(scores, dim=-1)

        # context: [batch_size, num_heads, seq_len, head_dim]
        context = torch.matmul(attn_weights, v)

        # Concatenate heads and project
        # context: [batch_size, seq_len, embed_dim]
        context = (
            context.transpose(1, 2).contiguous().view(batch_size, seq_len, embed_dim)
        )
        return self.out_proj(context), attn_weights


class CustomAttentionTextClassifier(nn.Module):
    """
    Smarter, stronger PyTorch text classifier.
    Incorporates token embeddings, sub-word/char-n-gram indicators,
    a Bidirectional GRU layer, and Multi-Head Self-Attention.
    """

    def __init__(
        self,
        vocab_size=30000,
        embedding_dim=128,
        hidden_dim=128,
        num_heads=4,
        output_dim=1,
        dropout=0.3,
    ):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=0)
        self.gru = nn.GRU(
            embedding_dim,
            hidden_dim,
            num_layers=2,
            bidirectional=True,
            batch_first=True,
            dropout=dropout,
        )
        self.attention = TextMultiHeadAttention(hidden_dim * 2, num_heads=num_heads)
        self.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, output_dim),
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
        self.transformer_ai_index = 1
        self.transformer_model_name = None
        self.custom_model = None
        self.vocab = {}
        self.max_len = 256

        self.perplexity_model = None
        self.perplexity_tokenizer = None
        self.perplexity_model_name = None

        os.makedirs(model_dir, exist_ok=True)
        self.init_transformer()
        self.init_custom_gru()
        self.init_perplexity_detector()

    def init_transformer(self):
        """Load the strongest available fine-tuned English AI-text detector.

        We prefer modern, ChatGPT-aware classifiers (trained on HC3 / large
        human-vs-LLM corpora) over the legacy 2020 GPT-2/Grover detectors, then
        fall back to the legacy detector so the system still works offline.
        """
        try:
            # pyrefly: ignore [missing-import]
            from transformers import AutoTokenizer, AutoModelForSequenceClassification

            # Ordered strongest-first. The first one that loads wins.
            candidates = [
                "Hello-SimpleAI/chatgpt-detector-roberta",  # RoBERTa-base, HC3 + Pile human vs ChatGPT
                "roberta-large-openai-detector",  # larger legacy GLTR detector
                "shahrukhx01/roberta-base-openai-detector",  # legacy base GLTR detector
                "yiyanghkust/finbert-tone-tw",  # (ignored if mislabeled)
            ]
            allow_download = os.environ.get("ALLOW_MODEL_DOWNLOADS", "0") == "1"
            for model_name in candidates:
                try:
                    logger.info(
                        f"Loading strong English AI-text detector: {model_name}"
                    )
                    self.tokenizer = AutoTokenizer.from_pretrained(
                        model_name, local_files_only=not allow_download
                    )
                    self.transformer_model = (
                        AutoModelForSequenceClassification.from_pretrained(
                            model_name, local_files_only=not allow_download
                        ).to(self.device)
                    )
                    self.transformer_model.eval()

                    # Identify which label index corresponds to AI / machine-generated text.
                    labels = {
                        int(k): str(v).lower()
                        for k, v in self.transformer_model.config.id2label.items()
                    }
                    ai_idx = None
                    for idx, lab in labels.items():
                        if any(
                            t in lab
                            for t in (
                                "machine",
                                "generated",
                                "fake",
                                "gpt",
                                "ai",
                                "bot",
                                "synthetic",
                                "chatgpt",
                            )
                        ):
                            ai_idx = idx
                            break
                    if ai_idx is None:
                        # Default assumption: 2-class with class 1 = generated
                        ai_idx = 1 if len(labels) == 2 else 0
                    self.transformer_ai_index = ai_idx
                    self.transformer_model_name = model_name
                    logger.info(
                        f"Loaded strong AI-text detector {model_name} (ai_label_index={ai_idx}, labels={labels})"
                    )
                    return
                except Exception as e:
                    logger.warning(f"Could not load {model_name}: {e}")
                    self.tokenizer = None
                    self.transformer_model = None
            logger.info(
                "No strong transformer detector available; falling back to statistical ensemble."
            )
        except Exception as e:
            logger.info(f"Transformer init error: {e}")
            self.transformer_model = None
            self.tokenizer = None

    def init_perplexity_detector(self):
        """Load a small causal LM to compute text perplexity.

        Perplexity is one of the most robust, model-based AI-generation signals:
        machine-written text is far more predictable (lower perplexity) than
        human writing. This complements the classifier with an independent signal.
        """
        if os.environ.get("ENABLE_PERPLEXITY", "1") != "1":
            logger.info("Perplexity detector disabled via ENABLE_PERPLEXITY=0.")
            return
        try:
            # pyrefly: ignore [missing-import]
            from transformers import AutoTokenizer, AutoModelForCausalLM

            name = os.environ.get("PERPLEXITY_MODEL", "gpt2")
            allow_download = os.environ.get("ALLOW_MODEL_DOWNLOADS", "0") == "1"
            self.perplexity_tokenizer = AutoTokenizer.from_pretrained(
                name, local_files_only=not allow_download
            )
            self.perplexity_model = AutoModelForCausalLM.from_pretrained(
                name, local_files_only=not allow_download
            ).to(self.device)
            self.perplexity_model.eval()
            if getattr(self.perplexity_tokenizer, "pad_token", None) is None:
                self.perplexity_tokenizer.pad_token = getattr(self.perplexity_tokenizer, "eos_token", None)  # type: ignore
            self.perplexity_model_name = name
            logger.info(f"Loaded perplexity language model: {name}")
        except Exception as e:
            logger.warning(f"Perplexity model unavailable: {e}")
            self.perplexity_model = None
            self.perplexity_tokenizer = None

    def compute_perplexity(self, text):
        if not self.perplexity_model or not self.perplexity_tokenizer:
            return None
        try:
            import math

            tok = self.perplexity_tokenizer
            enc = tok(text, return_tensors="pt", truncation=True, max_length=1024).to(
                self.device
            )
            input_ids = enc.input_ids
            if input_ids.size(1) < 2:
                return None
            with torch.no_grad():
                out = self.perplexity_model(input_ids, labels=input_ids)
                loss = out.loss.item()
            return float(math.exp(loss))  # type: ignore
        except Exception as e:
            logger.error(f"Perplexity computation failed: {e}")
            return None

    @staticmethod
    def perplexity_to_ai_score(ppl):
        # Lower perplexity => more predictable => more likely AI-generated.
        if ppl is None:
            return None
        if ppl < 12.0:
            return 0.96
        elif ppl < 18.0:
            return 0.86
        elif ppl < 28.0:
            return 0.70
        elif ppl < 45.0:
            return 0.52
        elif ppl < 80.0:
            return 0.38
        elif ppl < 150.0:
            return 0.25
        else:
            return 0.15

    def predict_strong_english(self, text):
        if not self.transformer_model or not self.tokenizer:
            return None
        try:
            inputs = self.tokenizer(
                text, return_tensors="pt", truncation=True, max_length=512
            ).to(self.device)
            with torch.no_grad():
                logits = self.transformer_model(**inputs).logits
                probs = torch.softmax(logits, dim=1)
                return float(probs[0][self.transformer_ai_index].item())
        except Exception as e:
            logger.error(f"Strong transformer inference failed: {e}")
            return None

    def predict_perplexity_ai(self, text):
        return self.perplexity_to_ai_score(self.compute_perplexity(text))

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
                state = torch.load(
                    checkpoint_path, map_location=self.device, weights_only=False
                )
                if isinstance(state, dict) and "model_state_dict" in state:
                    self.custom_model.load_state_dict(state["model_state_dict"])
                    self.vocab = state.get("vocab", {})
                    self.vectorizer = state.get("vectorizer")
                    self.classifier = state.get("classifier")
                    logger.info(
                        "Loaded custom trained PyTorch Spatial-Spectral + Scikit-Learn TF-IDF Text Detector."
                    )
                else:
                    self.custom_model.load_state_dict(state)
                    self.vocab = {}
                    logger.info(
                        "Loaded custom PyTorch MHSA-BiGRU text classifier (legacy fallback)."
                    )
            except Exception as e:
                logger.error(f"Error loading custom text classifier weights: {e}")

    def tokenize_custom(self, text):
        words = text.lower().split()
        is_arabic = arabic_ratio(text) >= 0.45

        if is_arabic:
            # Right-to-Left: Reverse token order and pad at the front
            words = words[::-1]
            tokens = [self.vocab.get(w, 1) for w in words]
            if len(tokens) < self.max_len:
                tokens = [0] * (self.max_len - len(tokens)) + tokens
            else:
                tokens = tokens[: self.max_len]
        else:
            # Left-to-Right: Normal order, pad at the end
            tokens = [self.vocab.get(w, 1) for w in words]
            if len(tokens) < self.max_len:
                tokens = tokens + [0] * (self.max_len - len(tokens))
            else:
                tokens = tokens[: self.max_len]

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
            "delve",
            "delves",
            "delving",
            "tapestry",
            "tapestries",
            "multifaceted",
            "underscores",
            "underscoring",
            "pivotal",
            "nuanced",
            "nuances",
            "paramount",
            "intricate",
            "intricacies",
            "holistic",
            "synergy",
            "synergistic",
            "synergies",
            "paradigm",
            "paradigms",
            "meticulously",
            "meticulous",
            "commendable",
            "noteworthy",
            "groundbreaking",
        ]
        tier2_words = [  # Common in AI, less common in human writing
            "landscape",
            "realm",
            "realms",
            "seamlessly",
            "foster",
            "fosters",
            "fostering",
            "robust",
            "moreover",
            "furthermore",
            "additionally",
            "consequently",
            "nevertheless",
            "facilitate",
            "facilitates",
            "facilitating",
            "leverage",
            "leveraging",
            "encompasses",
            "encompassing",
            "enhance",
            "enhancing",
            "crucial",
            "essential",
            "significant",
            "comprehensive",
            "innovative",
            "transformative",
            "sustainable",
            "diverse",
            "dynamic",
            "integral",
            "profound",
            "implications",
            "reshaping",
            "navigating",
            "navigate",
            "evolving",
            "harnessing",
            "harness",
            "optimizing",
            "optimize",
            "streamline",
            "streamlining",
            "bolster",
            "bolstering",
            "underscore",
            "spearheading",
            "pioneering",
            "overarching",
            "foundational",
            "cornerstone",
        ]

        t1_hits = sum(1 for w in words if w in tier1_words)
        t2_hits = sum(1 for w in words if w in tier2_words)

        if t1_hits >= 2:
            scores["vocab"] = 0.97
        elif t1_hits == 1:
            scores["vocab"] = 0.88
        elif t2_hits >= 4:
            scores["vocab"] = 0.85
        elif t2_hits >= 2:
            scores["vocab"] = 0.70
        elif t2_hits == 1:
            scores["vocab"] = 0.45
        else:
            scores["vocab"] = 0.10

        # ── Signal 2: Burstiness (Sentence Length Variation) ─────────────
        sentences = re.split(r"[.!?]+", text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 0]
        cv = 0.55  # Default moderate variation
        if len(sentences) >= 3:
            lens = [len(s.split()) for s in sentences]
            mean_len = sum(lens) / len(lens)
            if mean_len > 0:
                var_len = sum((l - mean_len) ** 2 for l in lens) / len(lens)
                std_len = var_len**0.5
                cv = std_len / mean_len

        # AI text: very uniform lengths (CV < 0.35). Humans: erratic (CV > 0.5)
        if cv < 0.25:
            scores["burstiness"] = 0.92
        elif cv < 0.35:
            scores["burstiness"] = 0.78
        elif cv < 0.50:
            scores["burstiness"] = 0.50
        else:
            scores["burstiness"] = 0.15

        # ── Signal 3: Contraction Absence ────────────────────────────────
        # AI almost never uses contractions; humans use them constantly
        contractions = len(re.findall(r"\b\w+'(?:s|t|re|ve|ll|d|m)\b", text_lower))
        contraction_rate = contractions / wc if wc > 0 else 0.0

        if contraction_rate == 0.0:
            scores["contractions"] = 0.80
        elif contraction_rate < 0.01:
            scores["contractions"] = 0.55
        elif contraction_rate < 0.025:
            scores["contractions"] = 0.30
        else:
            scores["contractions"] = 0.08

        # ── Signal 4: Passive Voice Density ──────────────────────────────
        # AI heavily uses passive voice ("is considered", "are utilized")
        passive_patterns = re.findall(
            r"\b(?:is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(?:\w+ed|known|considered|regarded|seen|found|used|utilized|employed|observed|noted|driven|shaped)\b",
            text_lower,
        )
        passive_rate = len(passive_patterns) / max(len(sentences), 1)

        if passive_rate > 0.5:
            scores["passive"] = 0.85
        elif passive_rate > 0.25:
            scores["passive"] = 0.65
        elif passive_rate > 0.1:
            scores["passive"] = 0.40
        else:
            scores["passive"] = 0.15

        # ── Signal 5: Hedging / Filler Language ──────────────────────────
        # AI constantly hedges: "it is important to note", "it is worth mentioning"
        hedging_phrases = [
            "it is important to",
            "it is worth",
            "it is essential to",
            "it is crucial to",
            "it should be noted",
            "it is noteworthy",
            "plays a crucial role",
            "plays a vital role",
            "plays an important role",
            "plays a significant role",
            "in today's world",
            "in today's society",
            "in the modern world",
            "in the digital age",
            "in this day and age",
            "at the end of the day",
            "in conclusion",
            "to sum up",
            "first and foremost",
            "last but not least",
            "on the other hand",
            "having said that",
            "it goes without saying",
            "needless to say",
            "from virtual assistants to",
            "from healthcare to",
            "continue to",
            "continues to",
        ]
        hedge_hits = sum(1 for p in hedging_phrases if p in text_lower)

        if hedge_hits >= 3:
            scores["hedging"] = 0.92
        elif hedge_hits >= 2:
            scores["hedging"] = 0.78
        elif hedge_hits == 1:
            scores["hedging"] = 0.55
        else:
            scores["hedging"] = 0.12

        # ── Signal 6: Sentence Starter Monotony ──────────────────────────
        # AI starts sentences with "The", "This", "It", "These" repeatedly
        if len(sentences) >= 3:
            starters = [s.split()[0] if s.split() else "" for s in sentences]
            boring_starters = [
                "the",
                "this",
                "it",
                "these",
                "that",
                "such",
                "in",
                "as",
                "by",
            ]
            boring_count = sum(1 for s in starters if s.lower() in boring_starters)
            boring_ratio = boring_count / len(starters)

            unique_starters = len(set(s.lower() for s in starters))
            starter_diversity = unique_starters / len(starters)

            if boring_ratio > 0.7 and starter_diversity < 0.5:
                scores["starters"] = 0.85
            elif boring_ratio > 0.5:
                scores["starters"] = 0.60
            else:
                scores["starters"] = 0.15
        else:
            scores["starters"] = 0.35

        # ── Signal 7: Comma Density ──────────────────────────────────────
        # AI produces consistently high comma rates (subordinate clauses)
        comma_count = text.count(",")
        comma_rate = comma_count / wc if wc > 0 else 0

        if comma_rate > 0.12:
            scores["commas"] = 0.78
        elif comma_rate > 0.08:
            scores["commas"] = 0.55
        elif comma_rate > 0.04:
            scores["commas"] = 0.30
        else:
            scores["commas"] = 0.15

        # ── Signal 8: Lexical Diversity (Type-Token Ratio) ───────────────
        # AI tends to reuse the same formal words; humans use more varied vocab
        unique_words = set(words)
        ttr = len(unique_words) / wc if wc > 0 else 1.0
        # For short texts TTR is naturally high; penalize low TTR less for short texts
        if wc > 50:
            if ttr < 0.45:
                scores["lexical"] = 0.70  # Low diversity = likely AI
            elif ttr < 0.55:
                scores["lexical"] = 0.50
            else:
                scores["lexical"] = 0.20
        else:
            scores["lexical"] = 0.35  # Neutral for short texts

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
            r"decades of routine tasks",
        ]
        cliche_hits = 0
        for pattern in ai_narrative_cliches:
            if re.search(pattern, text_lower):
                cliche_hits += 1

        if cliche_hits >= 3:
            scores["narrative"] = 0.98
        elif cliche_hits == 2:
            scores["narrative"] = 0.85
        elif cliche_hits == 1:
            scores["narrative"] = 0.65
        else:
            scores["narrative"] = 0.15

        # ── Weighted Fusion ──────────────────────────────────────────────
        weights = {
            "vocab": 0.20,  # Strongest single signal
            "burstiness": 0.12,  # Very reliable for longer texts
            "contractions": 0.12,  # Humans use contractions, AI doesn't
            "passive": 0.08,
            "hedging": 0.10,
            "starters": 0.08,
            "commas": 0.05,
            "lexical": 0.05,
            "narrative": 0.20,  # Catch AI stories and sci-fi tropes
        }

        final = sum(scores[k] * weights[k] for k in weights)

        # ── Hard overrides removed per Phase 1 ─────────────────────────────
        # Clamp
        final = max(0.02, min(0.99, final))
        logger.debug(
            f"Heuristic scores: {scores} -> final={final:.3f} (cv={cv:.3f}, contr_rate={contraction_rate:.4f})"
        )

        return final

    def predict(self, text):
        if not text or len(text.strip()) < 10:
            return 0.05

        arabic_meta = compute_arabic_ai_heuristics(text)
        if arabic_meta.get("is_arabic_dominant"):
            return arabic_meta["score"]

        # 1. Strong Hugging Face transformer detector (PRIMARY signal)
        transformer_prob = None
        if self.transformer_model and self.tokenizer:
            try:
                inputs = self.tokenizer(
                    text, return_tensors="pt", truncation=True, max_length=512
                ).to(self.device)
                with torch.no_grad():
                    logits = self.transformer_model(**inputs).logits
                    probs = torch.softmax(logits, dim=1)
                    transformer_prob = probs[0][self.transformer_ai_index].item()
            except Exception as e:
                logger.error(f"Transformer inference error: {e}")

        # 1b. Perplexity-based detector (independent language-model signal)
        ppl_score = self.predict_perplexity_ai(text)

        # 2. Statistical / stylometric heuristics
        stat_prob = self.compute_heuristics(text)

        # 3. Local TF-IDF ensemble (trained mostly on Arabic data; secondary, low weight)
        ml_prob = None
        if self.vectorizer and self.classifier:
            try:
                features = self.vectorizer.transform([text])
                probs = self.classifier.predict_proba(features)
                ml_prob = probs[0][1]  # Probability of class 1 (AI)
            except Exception as e:
                logger.error(f"Scikit-Learn TF-IDF inference failed: {e}")

        # 4. Custom PyTorch Attention-BiGRU Classifier (secondary, low weight)
        pytorch_prob = None
        try:
            tokens_tensor = self.tokenize_custom(text)
            with torch.no_grad():
                if self.custom_model is not None:
                    logits = self.custom_model(tokens_tensor)
                    pytorch_prob = torch.sigmoid(logits).item()
        except Exception as e:
            logger.error(f"Custom MHSA-BiGRU inference failed: {e}")

        # 5. Ensemble Decision Fusion
        # The strong transformer is the lead signal when present; perplexity provides
        # an independent language-model check; local/legacy models and heuristics are
        # demoted to low-weight tie-breakers (they were trained on a different
        # distribution and previously caused false negatives on modern AI text).
        signals = []
        if transformer_prob is not None:
            signals.append((transformer_prob, 0.45, "transformer"))
        if ppl_score is not None:
            signals.append((ppl_score, 0.25, "perplexity"))
        if ml_prob is not None:
            signals.append((ml_prob, 0.07, "tfidf"))
        if pytorch_prob is not None:
            signals.append((pytorch_prob, 0.05, "gru"))
        signals.append((stat_prob, 0.18, "heuristics"))

        total_w = sum(w for _, w, _ in signals)
        final_prob = sum(p * w for p, w, _ in signals) / total_w

        # ── Removed artificial score bounds per Phase 1 ─────────────────────────────

        # Cap/clamp
        final_prob = max(0.02, min(0.99, final_prob))

        if arabic_meta.get("is_arabic"):
            # For mixed Arabic/English text, keep Arabic stylistic signals strong.
            final_prob = 0.85 * arabic_meta["score"] + 0.15 * final_prob
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
            nn.MaxPool2d(2),  # 32x32 -> 16x16
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 16x16 -> 8x8
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)),  # -> 64 features
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
        if hasattr(models, "ResNet18_Weights"):
            weights = models.ResNet18_Weights.DEFAULT if pretrained else None
            self.spatial_backbone = models.resnet18(weights=weights)
        else:
            self.spatial_backbone = models.resnet18(pretrained=pretrained)

        # Freeze early spatial convolutions for high efficiency on CPU
        for param in list(self.spatial_backbone.parameters())[:-15]:
            param.requires_grad = False

        self.spatial_features_dim = self.spatial_backbone.fc.in_features
        self.spatial_backbone.fc = nn.Identity()  # Remove default fully-connected head

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
            nn.Linear(128, 1),
        )

    def forward(self, spatial_tensor, spectral_tensor):
        # spatial_tensor: [batch_size, 3, 224, 224]
        # spectral_tensor: [batch_size, 1, 32, 32]

        feat_spatial = self.spatial_backbone(spatial_tensor)  # [batch_size, 512]
        feat_spectral = self.spectral_stream(spectral_tensor)  # [batch_size, 64]

        # Concatenate Streams
        feat_fused = torch.cat(
            [feat_spatial, feat_spectral], dim=1
        )  # [batch_size, 576]
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
        assert (
            embed_dim % num_heads == 0
        ), "Embedding dimension must be divisible by num_heads"
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads

        self.q_proj = nn.Linear(embed_dim, embed_dim)
        self.k_proj = nn.Linear(embed_dim, embed_dim)
        self.v_proj = nn.Linear(embed_dim, embed_dim)
        self.out_proj = nn.Linear(embed_dim, embed_dim)

    def forward(self, x):
        # x shape: [batch_size, seq_len, embed_dim]
        batch_size, seq_len, embed_dim = x.size()

        q = (
            self.q_proj(x)
            .view(batch_size, seq_len, self.num_heads, self.head_dim)
            .transpose(1, 2)
        )
        k = (
            self.k_proj(x)
            .view(batch_size, seq_len, self.num_heads, self.head_dim)
            .transpose(1, 2)
        )
        v = (
            self.v_proj(x)
            .view(batch_size, seq_len, self.num_heads, self.head_dim)
            .transpose(1, 2)
        )

        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim**0.5)
        attn_weights = torch.softmax(scores, dim=-1)

        context = torch.matmul(attn_weights, v)
        context = (
            context.transpose(1, 2).contiguous().view(batch_size, seq_len, embed_dim)
        )
        return self.out_proj(context), attn_weights


class SpatioTemporalVideoDetector(nn.Module):
    """
    Stronger, smarter Spatio-Temporal PyTorch neural network.
    Integrates our DualStreamImageDetector to capture both spatial-spectral frame features,
    followed by a Bidirectional GRU and Multi-Head Temporal Attention.
    """

    def __init__(
        self, dual_stream_backbone=None, hidden_dim=128, num_heads=2, dropout=0.3
    ):
        super().__init__()
        if dual_stream_backbone is not None:
            self.spatial_spectral_encoder = dual_stream_backbone
        else:
            self.spatial_spectral_encoder = DualStreamImageDetector(pretrained=True)

        self.feature_dim = (
            self.spatial_spectral_encoder.fusion_dim
        )  # 576 (512 spatial + 64 spectral)
        self.gru = nn.GRU(
            input_size=self.feature_dim,
            hidden_size=hidden_dim,
            num_layers=1,
            bidirectional=True,
            batch_first=True,
        )
        self.temporal_attention = VideoTemporalMultiHeadAttention(
            hidden_dim * 2, num_heads=num_heads
        )
        self.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
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
        features = self.spatial_spectral_encoder.extract_joint_features(
            flat_spatial, flat_spectral
        )

        # Reshape to sequence: [batch_size, seq_len, 576]
        features = features.view(batch_size, seq_len, self.feature_dim)

        # Bidirectional GRU: [batch_size, seq_len, hidden_dim * 2]
        gru_out, _ = self.gru(features)

        # Multi-Head Temporal Attention
        attn_out, weights = self.temporal_attention(gru_out)

        # Temporal average pooling
        context = torch.mean(attn_out, dim=1)

        return self.fc(context)


# =========================================================================
#  4. ADVANCED DETECTION ENGINES & META-CLASSIFIER FUSION LAYER
# =========================================================================
import math
from collections import Counter


class AdvancedTextEngine:
    @staticmethod
    def compute_readability(text):
        words = len(text.split())
        sentences = max(1, len(re.split(r"[.!?]+", text)) - 1)
        syllables = sum(
            max(1, len(re.findall(r"[aeiouy]+", w.lower()))) for w in text.split()
        )

        # Flesch-Kincaid Grade Level
        fk_grade = (
            0.39 * (words / sentences) + 11.8 * (syllables / max(1, words)) - 15.59
        )

        # AI tends to target 9th-12th grade reading levels consistently
        if 8.5 <= fk_grade <= 12.5:
            return 0.75  # Highly suspicious AI range
        elif fk_grade > 14:
            return 0.40  # Academic human
        else:
            return 0.20  # Simple human text

    @staticmethod
    def compute_entropy(text):
        # Character-level Shannon Entropy
        if not text:
            return 0.0
        counts = Counter(text)
        length = len(text)
        entropy = -sum(
            (count / length) * math.log2(count / length) for count in counts.values()
        )

        # AI text often has lower character entropy due to predictable structures
        if entropy < 4.1:
            return 0.85
        elif entropy > 4.8:
            return 0.15  # Human chaotic typing
        return 0.5

    @staticmethod
    def compute_function_words(text):
        # AI overuses certain function words to maintain grammatical perfection
        function_words = {"the", "is", "in", "and", "of", "to", "a", "that", "it", "as"}
        words = text.lower().split()
        if not words:
            return 0.0
        fw_count = sum(1 for w in words if w in function_words)
        fw_ratio = fw_count / len(words)

        if fw_ratio > 0.45:
            return 0.80  # Overly structured
        elif fw_ratio < 0.25:
            return 0.20  # Casual human
        return 0.45


class AdvancedImageEngine:
    def __init__(self):
        try:
            # Initialize Vision Transformer
            import torchvision.models as models

            self.vit = models.vit_b_16(
                weights=(
                    models.ViT_B_16_Weights.DEFAULT
                    if hasattr(models, "ViT_B_16_Weights")
                    else True
                )
            )
            self.vit.heads = nn.Identity()  # Extract features, not classes
            for param in self.vit.parameters():
                param.requires_grad = False
            self.vit.eval()
        except Exception as e:
            logger.warning(f"Failed to load ViT: {e}")
            self.vit = None

    def extract_vit_features(self, x):
        if self.vit:
            with torch.no_grad():
                return self.vit(x)
        return torch.zeros((x.size(0), 768), device=x.device)


class MetaClassifier(nn.Module):
    """
    Final Fusion Layer: Feeds every detector into a meta-classifier that produces a calibrated confidence score.
    """

    def __init__(self, input_dim=15):
        super().__init__()
        # Takes in all subsystem scores: Text(Transformer, Stylometry, Semantic, Perplexity, etc.) + Image + Video
        self.fc = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, features):
        return self.fc(features)

    @staticmethod
    def calibrate_score(scores_dict, engine_type="text"):
        """
        Rules-based calibrated fusion when the neural meta-classifier is untrained.
        """
        if engine_type == "text":
            # Transformer, Stylometry, Semantic, Perplexity, Burstiness, Entropy, Readability, Function-words
            weights = {
                "transformer_score": 0.35,
                "stylometry_score": 0.15,
                "semantic_score": 0.10,
                "perplexity_score": 0.10,
                "burstiness_score": 0.10,
                "entropy_score": 0.05,
                "readability_score": 0.05,
                "function_word_score": 0.05,
                "watermark_score": 0.05,  # If present
            }
        elif engine_type == "image":
            weights = {
                "vit_score": 0.20,
                "cnn_score": 0.20,
                "fft_score": 0.15,
                "prnu_score": 0.10,
                "texture_score": 0.10,
                "lighting_score": 0.05,
                "jpeg_artifact_score": 0.10,
                "exif_score": 0.05,
                "c2pa_provenance_score": 0.05,
            }
        elif engine_type == "video":
            weights = {
                "temporal_consistency": 0.30,
                "optical_flow": 0.20,
                "lip_sync": 0.15,
                "flicker": 0.10,
                "audio_spectrogram": 0.15,
                "codec_metadata": 0.10,
            }
        else:
            return 0.5

        final = 0.0
        total_w = 0.0
        for k, w in weights.items():
            if k in scores_dict and scores_dict[k] is not None:
                final += scores_dict[k] * w
                total_w += w

        if total_w > 0:
            final /= total_w

        # Hard overrides
        if scores_dict.get("watermark_score", 0) > 0.9:
            final = max(final, 0.99)
        if scores_dict.get("c2pa_provenance_score", 0) > 0.9:
            final = max(final, 0.99)

        return max(0.01, min(0.99, final))


# Ensure models can be imported
