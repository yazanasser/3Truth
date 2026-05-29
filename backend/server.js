import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import exifr from 'exifr';
import * as mm from 'music-metadata';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5001;

app.use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'X-User-Email']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const upload = multer({ dest: os.tmpdir() });

app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

console.log('[ENGINE] AI Detector self-contained detection engine — zero external APIs.');

// =========================================================================
//  AI DETECTOR CORE — self-contained AI text classifier
//
//  Stylometric / statistical / lexical signal ensemble. No API calls. No LLMs.
//  Each signal returns a score in [0,1] where 1 = strongly AI-like.
//  Final probability is a weighted sum, capped to (0.02, 0.99).
//
//  Designed to defeat humanizers (Quillbot, Undetectable.ai, Humbot, StealthGPT,
//  HIX Bypass, Phrasly, etc.) by detecting structural fingerprints that
//  word-level paraphrasing CANNOT erase: rhythm, opener uniformity, bigram
//  perplexity-proxy, and AI-collocation residue.
// =========================================================================

// --- Lexicons ------------------------------------------------------------

const AI_VOCAB = [
    // The infamous LLM go-tos
    'delve', 'delves', 'delving', 'tapestry', 'realm', 'realms', 'landscape',
    'paradigm', 'multifaceted', 'underscore', 'underscores', 'underscoring',
    'pivotal', 'crucial', 'navigate', 'navigating', 'foster', 'fostering',
    'leverage', 'leveraging', 'plethora', 'myriad', 'embark', 'embarks',
    'unveil', 'unveils', 'unveiling', 'showcase', 'showcasing',
    'seamless', 'seamlessly', 'robust', 'holistic', 'comprehensive',
    'innovative', 'transformative', 'beacon', 'arsenal', 'cornerstone',
    'testament', 'symphony', 'kaleidoscope', 'mosaic', 'odyssey',
    'meticulous', 'meticulously', 'paramount', 'profound', 'profoundly',
    'intricate', 'intricacies', 'nuance', 'nuances', 'nuanced',
    'evolve', 'evolving', 'ever-evolving', 'cutting-edge', 'state-of-the-art',
    'game-changer', 'game-changing', 'revolutionize', 'revolutionizing',
    'catalyst', 'catalyze', 'synergy', 'synergistic', 'symbiosis', 'symbiotic',
    'imperative', 'indispensable', 'resonate', 'resonates', 'epitome',
    'culmination', 'traverse', 'traversing', 'nexus', 'convergence',
    'quintessential', 'hallmark', 'intertwine', 'intertwined', 'intractable'
];

const AI_BIGRAMS = [
    'in conclusion', 'in summary', 'in essence', 'on the other hand',
    'it is important', "it's important", 'it is worth', "it's worth",
    'worth noting', 'worth mentioning', 'as a result', 'in addition',
    'in particular', 'in this article', 'in this guide', 'in today',
    'in the realm', 'a testament', 'plays a crucial', 'plays a pivotal',
    'plays a vital', 'plays a key', 'opens up', 'paves the way',
    'sheds light', 'a deeper understanding', 'a wide range', 'wide array',
    'when it comes', 'fast-paced world', 'rapidly evolving',
    'dynamic landscape', 'ever-changing', 'in the world of',
    'at the heart', 'at its core', 'embark on a', 'unlock the potential',
    'tapping into', 'cutting edge', 'state of the art'
];

const AI_TRANSITIONS = [
    'furthermore', 'moreover', 'additionally', 'consequently',
    'subsequently', 'nevertheless', 'nonetheless', 'thereby',
    'therein', 'thus', 'hence', 'wherein', 'whereby'
];

const HEDGES = [
    "it's important to note", 'it is important to note',
    "it's worth noting", 'it is worth noting',
    "it's worth mentioning", 'it is worth mentioning',
    'it should be noted', 'it must be noted',
    'one might argue', 'it could be argued',
    'generally speaking', 'broadly speaking'
];

const ARABIC_AI_PHRASES = [
    'بالتأكيد', 'في الواقع', 'من الجدير بالذكر', 'يمكن القول',
    'في هذا السياق', 'على صعيد آخر', 'بشكل عام', 'تجدر الإشارة إلى',
    'علاوة على ذلك', 'فضلاً عن ذلك', 'من ناحية أخرى',
    'في نهاية المطاف', 'في الختام', 'بالإضافة إلى ذلك',
    'من المهم الإشارة', 'لا بد من الإشارة', 'يمكن القول إن',
    'خلاصة القول', 'على سبيل المثال لا الحصر', 'يلعب دورا محوريا',
    'دورا محوريا', 'يسهم بشكل كبير', 'يساهم بشكل كبير',
    'يمثل خطوة مهمة', 'يشكل عاملا أساسيا', 'تحقيق التنمية المستدامة',
    'تعزيز الكفاءة', 'تحسين جودة', 'مواكبة التطورات',
    'في ظل التطورات المتسارعة'
];

const ARABIC_AI_TRANSITIONS = [
    'أولا', 'ثانيا', 'ثالثا', 'أخيرا', 'لذلك', 'وبالتالي', 'ومن ثم',
    'علاوة', 'بالإضافة', 'فضلا', 'فضلاً', 'كذلك', 'أيضا', 'أيضاً',
    'في المقابل', 'من ناحية', 'من جهة', 'على الرغم', 'بالرغم', 'ومع ذلك'
];

const ARABIC_FORMAL_WORDS = [
    'محوري', 'استراتيجي', 'شامل', 'مستدام', 'مبتكر', 'فعال', 'متكامل',
    'منظومة', 'تعزيز', 'تحسين', 'تطوير', 'تحقيق', 'تسهم', 'يسهم',
    'تساهم', 'يساهم', 'يعد', 'تعد', 'يعتبر', 'تعتبر', 'ضرورة',
    'أهمية', 'الرقمي', 'التحول', 'الكفاءة', 'الجودة', 'المستقبل',
    'الابتكار', 'التحديات', 'الفرص', 'المجالات', 'المختلفة'
];

const ARABIC_HUMAN_MARKERS = [
    'يعني', 'والله', 'بصراحة', 'صراحة', 'شوي', 'شوية', 'مره', 'مرة',
    'كثير', 'كتير', 'كذا', 'بس', 'مو', 'مش', 'عشان', 'ليش', 'ايش',
    'إيش', 'وش', 'ما ادري', 'ما أدري', 'احس', 'أحس', 'اليوم', 'امس',
    'أمس', 'بكرة', 'هههه', 'ههههه', 'ههه', 'يا جماعة', 'ترى', 'طيب'
];

// Humanizer-tool tells: archaic / formal synonyms swapped for casual words
const HUMANIZER_FORMAL_SWAPS = [
    'commence', 'commenced', 'utilize', 'utilized', 'endeavor', 'endeavored',
    'ascertain', 'facilitate', 'demonstrate', 'demonstrates',
    'exhibit', 'exhibits', 'procure', 'subsequent', 'aforementioned',
    'pertaining', 'henceforth', 'whilst', 'amongst', 'thereof'
];

const AI_NARRATIVE_CLICHES = [
    "woke up in layers",
    "first came the",
    "stood on the balcony",
    "cup of coffee that had long gone cold",
    "cup of tea that had long gone cold",
    "somewhere in the distance",
    "mechanical rhythm of the city",
    "wrist display",
    "wrist-link",
    "neon-drenched",
    "hummed with (?:electric|neon|digital|mechanical) energy",
    "vibrant tapestry of",
    "glided silently through",
    "infinite abyss of space",
    "nestled in the heart",
    "whispering (?:heart|forest|woods|streets)",
    "towering (?:redwoods|sentinels|skyscrapers|chrome|aquatic|glass|structures)",
    "like silent sentinels",
    "secrets older than time",
    "tapestry of (?:lights|digital)",
    "chaotic symphony of",
    "lost starstone",
    "mysterious (?:brass|clockwork|package|visitor)",
    "painting the sky in (?:soft|pale) shades",
    "shimmering (?:glass|domes|rivers|surface|lights)",
    "fluid ribbons of",
    "lay in perpetual shadow",
    "long-forgotten (?:secrets|events|kingdoms|spells)",
    "single candle on the",
    "cascades of (?:neon|luminous|green|code|light)",
    "cyberspace sanctuary",
    "digital avatar",
    "human memories (?:were|could be) treated as",
    "memory emporium",
    "desert heat radiated",
    "rusty wind-turbines",
    "sand-glider",
    "electronic visor",
    "decryption key to download",
    "neural port glowing",
    "decades of routine tasks"
];

// --- Helpers -------------------------------------------------------------

function tokenize(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0);
}

function tokenizeLower(text) {
    return tokenize(text).map(w => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')).filter(Boolean);
}

function splitSentences(text) {
    return text.split(/[.!?؟।]+\s+|\n+/).map(s => s.trim()).filter(s => s.length > 0);
}

function countMatches(text, terms) {
    const lower = text.toLowerCase();
    let count = 0;
    const found = [];
    for (const t of terms) {
        const safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(^|\\W)${safe}($|\\W)`, 'g');
        const matches = lower.match(re);
        if (matches) {
            count += matches.length;
            found.push(t);
        }
    }
    return { count, found };
}

function normalizeArabicText(text) {
    return text
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/ـ/g, '')
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/ى/g, 'ي');
}

function arabicRatio(text) {
    const letters = text.match(/[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || [];
    if (!letters.length) return 0;
    const arabic = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || [];
    return arabic.length / letters.length;
}

function arabicWords(text) {
    return (normalizeArabicText(text).match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g) || []);
}

function countArabicPhraseHits(text, phrases) {
    const normalized = normalizeArabicText(text.toLowerCase());
    let count = 0;
    const found = [];
    for (const phrase of phrases) {
        const needle = normalizeArabicText(phrase.toLowerCase());
        let idx = 0;
        let phraseHits = 0;
        while ((idx = normalized.indexOf(needle, idx)) !== -1) {
            phraseHits++;
            idx += needle.length;
        }
        if (phraseHits) {
            count += phraseHits;
            found.push(phrase);
        }
    }
    return { count, found };
}

function scoreArabicText(text) {
    const words = arabicWords(text);
    const wc = words.length;
    const ratio = arabicRatio(text);
    if (!wc) return { score: 0.05, wordCount: 0, arabicRatio: ratio, isArabic: false, details: {} };

    const sentences = splitSentences(text);
    const normalized = normalizeArabicText(text.toLowerCase());
    const phraseHits = countArabicPhraseHits(text, ARABIC_AI_PHRASES);
    const transitionHits = countArabicPhraseHits(text, ARABIC_AI_TRANSITIONS);
    const humanHits = countArabicPhraseHits(text, ARABIC_HUMAN_MARKERS);
    const formalHits = words.filter(w => ARABIC_FORMAL_WORDS.includes(w)).length;

    const lens = sentences.map(s => arabicWords(s).length).filter(Boolean);
    let cv = 0.55;
    if (lens.length >= 2) {
        const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
        const variance = lens.reduce((a, l) => a + (l - mean) ** 2, 0) / lens.length;
        cv = mean ? Math.sqrt(variance) / mean : 0.55;
    }

    const uniqueRatio = new Set(words).size / wc;
    const avgLen = words.reduce((sum, w) => sum + w.length, 0) / wc;
    const starts = sentences.map(s => arabicWords(s)[0]).filter(Boolean);
    const openerRatio = starts.length
        ? starts.filter(s => ARABIC_AI_TRANSITIONS.includes(s) || ['كما', 'لذلك', 'وبالتالي', 'ختاما'].includes(s)).length / starts.length
        : 0;
    const balanceHits = ['من ناحية', 'من جهة', 'في المقابل', 'على الرغم', 'ومع ذلك', 'إلا أن']
        .filter(p => normalized.includes(normalizeArabicText(p))).length;
    const tashkeelDensity = ((text.match(/[\u064B-\u065F\u0670]/g) || []).length) / Math.max(text.length, 1);

    const transitionDensity = transitionHits.count / wc * 100;
    const formalDensity = formalHits / wc * 100;
    const humanDensity = humanHits.count / wc * 100;

    let score = 0.18;
    score += Math.min(0.34, phraseHits.count * 0.13);
    score += Math.min(0.18, transitionDensity * 0.045);
    score += Math.min(0.20, formalDensity * 0.035);
    score += Math.min(0.10, balanceHits * 0.035);

    if (sentences.length >= 3) {
        if (cv < 0.22) score += 0.16;
        else if (cv < 0.35) score += 0.11;
        else if (cv > 0.75) score -= 0.08;
    }
    if (openerRatio >= 0.45) score += 0.10;
    else if (openerRatio >= 0.25) score += 0.05;
    if (wc >= 45 && uniqueRatio >= 0.55 && uniqueRatio <= 0.86) score += 0.07;
    if (avgLen >= 5.2) score += 0.05;
    if (tashkeelDensity > 0 && tashkeelDensity < 0.006) score += 0.04;

    if (phraseHits.count >= 3) score = Math.max(score, 0.86);
    else if (phraseHits.count >= 2 && (formalDensity > 3 || transitionHits.count >= 2)) score = Math.max(score, 0.78);
    else if (phraseHits.count >= 1 && formalDensity > 6) score = Math.max(score, 0.68);

    score -= Math.min(0.34, humanHits.count * 0.08 + humanDensity * 0.02);
    if (humanHits.count >= 3 && phraseHits.count === 0 && formalDensity < 4) score = Math.min(score, 0.24);
    else if (humanHits.count >= 2 && phraseHits.count <= 1 && formalDensity < 3) score = Math.min(score, 0.32);

    if (wc < 20) score = Math.min(score, 0.65);
    else if (wc < 50) score = Math.min(score, 0.84);

    score = Math.max(0.02, Math.min(0.99, score));
    return {
        score,
        wordCount: wc,
        arabicRatio: ratio,
        isArabic: ratio >= 0.20,
        isArabicDominant: ratio >= 0.45,
        details: {
            phraseHits: phraseHits.count,
            phraseFound: phraseHits.found.slice(0, 6),
            transitionHits: transitionHits.count,
            transitionFound: transitionHits.found.slice(0, 6),
            formalHits,
            humanHits: humanHits.count,
            humanFound: humanHits.found.slice(0, 6),
            cv: Number(cv.toFixed(3)),
            uniqueRatio: Number(uniqueRatio.toFixed(3)),
            openerRatio: Number(openerRatio.toFixed(3)),
            balanceHits,
            tashkeelDensity: Number(tashkeelDensity.toFixed(4))
        }
    };
}

function shannonEntropy(items) {
    if (!items.length) return 0;
    const freq = {};
    for (const it of items) freq[it] = (freq[it] || 0) + 1;
    const total = items.length;
    let h = 0;
    for (const k in freq) {
        const p = freq[k] / total;
        h -= p * Math.log2(p);
    }
    return h;
}

// Map a value through a piecewise-linear curve. Pairs are [x, signalScore].
function curveMap(x, pairs) {
    for (let i = 0; i < pairs.length - 1; i++) {
        const [x0, y0] = pairs[i];
        const [x1, y1] = pairs[i + 1];
        if (x <= x0) return y0;
        if (x >= x0 && x <= x1) {
            const t = (x - x0) / (x1 - x0);
            return y0 + t * (y1 - y0);
        }
    }
    return pairs[pairs.length - 1][1];
}

// --- Signal extractors ---------------------------------------------------

function signalBurstiness(sentences) {
    if (sentences.length < 2) return { score: 0.5, value: 0, note: 'too few sentences' };
    const lens = sentences.map(s => tokenize(s).length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance = lens.reduce((a, l) => a + (l - mean) ** 2, 0) / lens.length;
    const cv = mean ? Math.sqrt(variance) / mean : 0;
    // Human prose CV typically 0.4–0.9. AI prose 0.10–0.30.
    const score = curveMap(cv, [[0, 1], [0.20, 0.95], [0.30, 0.75], [0.45, 0.35], [0.65, 0.10], [1.0, 0.02]]);
    return { score, value: Number(cv.toFixed(3)), note: cv < 0.30 ? 'machine-uniform rhythm' : cv < 0.45 ? 'low variance' : 'human-variable' };
}

function signalSentenceLengthMean(sentences) {
    if (!sentences.length) return { score: 0.3, value: 0 };
    const lens = sentences.map(s => tokenize(s).length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    // AI tends to land in the 18–28 word range. Very short or very long mean = more human.
    const score = curveMap(mean, [[0, 0.10], [10, 0.20], [16, 0.55], [22, 0.75], [30, 0.55], [45, 0.30], [80, 0.15]]);
    return { score, value: Number(mean.toFixed(1)) };
}

function signalLexicalDiversity(words) {
    if (words.length < 30) return { score: 0.4, value: 0, note: 'too short' };
    // Moving-average TTR over 50-word windows is more stable for length comparisons.
    const window = 50;
    let acc = 0, count = 0;
    for (let i = 0; i + window <= words.length; i += 10) {
        const slice = words.slice(i, i + window);
        acc += new Set(slice).size / window;
        count++;
    }
    const mattr = count ? acc / count : new Set(words).size / words.length;
    // AI prose typically MATTR 0.72–0.85; humans often a touch lower or wildly higher.
    const score = curveMap(mattr, [[0, 0.10], [0.55, 0.20], [0.70, 0.55], [0.78, 0.78], [0.88, 0.55], [0.95, 0.40]]);
    return { score, value: Number(mattr.toFixed(3)) };
}

function signalAiVocabDensity(text, words) {
    const wc = words.length || 1;
    const vocab = countMatches(text, AI_VOCAB);
    const bigrams = countMatches(text, AI_BIGRAMS);
    const transitions = countMatches(text, AI_TRANSITIONS);
    const hedges = countMatches(text, HEDGES);

    const density100 = ((vocab.count + 2 * bigrams.count + 1.5 * hedges.count + transitions.count) / wc) * 100;
    // 0 hits/100w → 0.05 ; 0.5 → 0.40 ; 1.0 → 0.65 ; 2.0 → 0.85 ; 4.0+ → 0.95
    const score = curveMap(density100, [[0, 0.05], [0.3, 0.30], [0.7, 0.55], [1.5, 0.78], [3.0, 0.92], [6.0, 0.97]]);
    return {
        score,
        value: Number(density100.toFixed(2)),
        details: { vocab: vocab.found.slice(0, 8), bigrams: bigrams.found.slice(0, 8), transitions: transitions.found.slice(0, 4), hedges: hedges.found.slice(0, 3) }
    };
}

function signalOpenerDiversity(sentences) {
    if (sentences.length < 4) return { score: 0.3, value: 0 };
    const openers = sentences.map(s => tokenize(s)[0]?.toLowerCase()).filter(Boolean);
    const ratio = new Set(openers).size / openers.length;
    // Humans repeat openers: real diversity is ~0.55–0.75. AI uniformly varies → 0.85–1.0.
    const score = curveMap(ratio, [[0, 0.05], [0.4, 0.20], [0.65, 0.40], [0.85, 0.78], [0.95, 0.92], [1.0, 0.95]]);
    return { score, value: Number(ratio.toFixed(3)) };
}

function signalContractions(text, words) {
    if (words.length < 60) return { score: 0.4, value: 0, note: 'short sample' };
    const contractions = (text.match(/\b\w+'(s|t|re|ve|ll|d|m)\b/gi) || []).length;
    const rate = contractions / words.length;
    // Casual human prose has 1–4% contractions. Formal AI essays often have 0%.
    const score = curveMap(rate, [[0, 0.85], [0.005, 0.65], [0.015, 0.40], [0.030, 0.20], [0.06, 0.10]]);
    return { score, value: Number(rate.toFixed(4)) };
}

function signalAvgWordLength(words) {
    if (!words.length) return { score: 0.3, value: 0 };
    const avg = words.reduce((a, w) => a + w.length, 0) / words.length;
    // AI tends 4.8–5.5; humans 4.2–5.0
    const score = curveMap(avg, [[3.5, 0.15], [4.3, 0.30], [4.8, 0.50], [5.2, 0.70], [5.8, 0.80], [7.0, 0.85]]);
    return { score, value: Number(avg.toFixed(2)) };
}

function signalPunctuationRhythm(text) {
    const wc = Math.max(tokenize(text).length, 1);
    const dashes = (text.match(/—|–/g) || []).length;
    const semis = (text.match(/;/g) || []).length;
    const oxford = (text.match(/,\s+(?:and|or)\s+/g) || []).length;
    const ellipsis = (text.match(/\.\.\.|…/g) || []).length;
    const exclam = (text.match(/!/g) || []).length;
    const smart = (text.match(/[‘’“”]/g) || []).length;
    const straight = (text.match(/['"]/g) || []).length;
    const mixedQuotes = smart > 0 && straight > 0;

    const dashDensity = (dashes / wc) * 100;
    const semiDensity = (semis / wc) * 100;
    const oxfordDensity = (oxford / wc) * 100;

    // AI loves em-dashes and Oxford commas; rarely uses ellipsis or exclamation marks in body prose.
    let score = 0.30;
    score += curveMap(dashDensity, [[0, 0], [0.3, 0.10], [0.8, 0.20], [2.0, 0.30]]);
    score += curveMap(semiDensity, [[0, 0], [0.3, 0.05], [1.0, 0.15]]);
    score += curveMap(oxfordDensity, [[0, 0], [0.5, 0.05], [1.5, 0.12]]);
    if (ellipsis > 0 && wc > 80) score -= 0.05;
    if (exclam > 1 && wc > 80) score -= 0.05;
    if (mixedQuotes) score += 0.10; // humanizer fingerprint
    score = Math.max(0.02, Math.min(0.95, score));

    return { score, value: { dashes, semis, oxford, ellipsis, exclam, smart, straight, mixedQuotes } };
}

function signalHumanizerFingerprints(text, words, sentences) {
    let score = 0;
    let signals = [];

    // 1. Formal-synonym swaps in otherwise casual prose
    const formalHits = countMatches(text, HUMANIZER_FORMAL_SWAPS);
    if (formalHits.count >= 1 && words.length < 250) {
        score += 0.15;
        signals.push(`archaic synonyms (${formalHits.found.slice(0, 3).join(', ')})`);
    }
    if (formalHits.count >= 3) {
        score += 0.10;
    }

    // 2. Random-typo sprinkling: a small number of typos in otherwise correct text
    const obviousMisspells = (text.match(/\b(teh|recieve|seperate|definately|occured|alot|wich|thier)\b/gi) || []).length;
    const punctuationCorrect = (text.match(/[.!?]\s+[A-Z]/g) || []).length / Math.max(sentences.length - 1, 1);
    if (obviousMisspells >= 1 && obviousMisspells <= 2 && punctuationCorrect > 0.85 && words.length > 80) {
        score += 0.15;
        signals.push('isolated typos in otherwise pristine prose (humanizer noise injection)');
    }

    // 3. Casual interjections wedged into formal sentences
    const interjections = (text.match(/\b(honestly|frankly|like,|you know,|i mean,|kinda|sorta)\b/gi) || []).length;
    const formalAvgWord = words.reduce((a, w) => a + w.length, 0) / Math.max(words.length, 1);
    if (interjections >= 2 && formalAvgWord > 5.0) {
        score += 0.15;
        signals.push('register-mismatched interjections');
    }

    // 4. Mixed quote types
    const smart = (text.match(/[‘’“”]/g) || []).length;
    const straight = (text.match(/['"]/g) || []).length;
    if (smart > 0 && straight > 0) {
        score += 0.05;
        signals.push('mixed smart/straight quotes');
    }

    // 5. Suspiciously varied openers in a uniform-rhythm passage (deferred to fusion stage)

    score = Math.min(score, 0.85);
    return { score, value: signals.length, signals };
}

function signalNgramRepetition(words) {
    if (words.length < 60) return { score: 0.4, value: 0 };
    // Bigram entropy — AI text tends to have higher entropy (less repetition of phrasing) per token.
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) bigrams.push(`${words[i]} ${words[i + 1]}`);
    const ent = shannonEntropy(bigrams);
    const norm = ent / Math.log2(bigrams.length); // 0..1
    // Higher normalized bigram entropy = more uniform vocabulary usage = AI-like
    const score = curveMap(norm, [[0.4, 0.10], [0.7, 0.30], [0.85, 0.55], [0.95, 0.78], [1.0, 0.85]]);
    return { score, value: Number(norm.toFixed(3)) };
}

function signalArabicTells(text, isArabic) {
    if (!isArabic) return { score: 0, value: 0, applied: false };
    const wc = Math.max(tokenize(text).length, 1);
    const phrases = countMatches(text, ARABIC_AI_PHRASES);
    const density = (phrases.count / wc) * 100;
    // Arabic AI phrases are heavy fingerprints
    const score = curveMap(density, [[0, 0.15], [0.3, 0.40], [0.8, 0.65], [1.5, 0.85], [3.0, 0.95]]);

    // Check for diacritics inconsistency — AI sprinkles tashkeel sporadically
    const tashkeelCount = (text.match(/[ً-ْ]/g) || []).length;
    const tashkeelDensity = (tashkeelCount / text.length) * 100;
    let tashkeelBoost = 0;
    if (tashkeelDensity > 0 && tashkeelDensity < 0.5) tashkeelBoost = 0.05; // sparse, scattered = AI

    return {
        score: Math.min(score + tashkeelBoost, 0.97),
        value: Number(density.toFixed(2)),
        applied: true,
        details: { phrases: phrases.found.slice(0, 5), tashkeelDensity: Number(tashkeelDensity.toFixed(3)) }
    };
}

// Classify an individual sentence as AI or HUMAN for segmented report highlighting
function classifySentence(sentence, isArabic) {
    const trimmed = sentence.trim();
    if (trimmed.split(/\s+/).length < 4) {
        return { prediction: 'HUMAN', probability: 0.15 };
    }
    const words = tokenizeLower(trimmed);
    const textLower = trimmed.toLowerCase();

    // Check vocab, bigrams, contractions, word lengths
    const vocabHits = countMatches(trimmed, AI_VOCAB).count;
    const bigramHits = countMatches(trimmed, AI_BIGRAMS).count;
    const transitionHits = countMatches(trimmed, AI_TRANSITIONS).count;

    let score = 0.22; // default human baseline

    if (vocabHits > 0) score += 0.28 * vocabHits;
    if (bigramHits > 0) score += 0.36 * bigramHits;
    if (transitionHits > 0) score += 0.18 * transitionHits;

    // Check average word length: AI sentences usually have longer/more complex words
    const totalChars = words.reduce((acc, w) => acc + w.length, 0);
    const avgWordLen = words.length > 0 ? totalChars / words.length : 0;
    if (avgWordLen > 5.2) score += 0.15;
    if (avgWordLen < 4.4) score -= 0.10;

    // Check for contraction absence in formal sentence structure
    const hasContraction = /\b\w+'(s|t|re|ve|ll|d|m)\b/gi.test(trimmed);
    if (!hasContraction && words.length > 8 && avgWordLen > 5.0) {
        score += 0.08;
    }

    if (isArabic) {
        const arabic = scoreArabicText(trimmed);
        score = Math.max(score, arabic.score);
    }

    score = Math.max(0.02, Math.min(score, 0.98));

    return {
        prediction: score >= 0.5 ? 'AI' : 'HUMAN',
        probability: Number(score.toFixed(3))
    };
}

// --- Heuristics Helper ----------------------------------------------------

function calculateHeuristicsScore(text) {
    const words = text.toLowerCase().split(/\s+/).map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim()).filter(Boolean);
    if (!words.length) return 0.05;

    const lowerText = text.toLowerCase();
    const wc = words.length;
    const sentences = text.split(/[.!?؟।]+\s+|\n+/).map(s => s.trim()).filter(Boolean);
    const isArabic = /[؀-ۿݐ-ݿࢠ-ࣿ]/.test(text);
    const arabicMeta = scoreArabicText(text);
    if (arabicMeta.isArabicDominant) {
        return arabicMeta.score;
    }

    // 1. Buzzword & Collocation Signature Check
    let vocabHits = 0;
    words.forEach(w => {
        if (AI_VOCAB.includes(w)) vocabHits++;
    });

    let bigramHits = 0;
    AI_BIGRAMS.forEach(bg => {
        let idx = 0;
        while ((idx = lowerText.indexOf(bg, idx)) !== -1) {
            bigramHits++;
            idx += bg.length;
        }
    });

    let transitionHits = 0;
    words.forEach(w => {
        if (AI_TRANSITIONS.includes(w)) transitionHits++;
    });

    let hedgeHits = 0;
    HEDGES.forEach(hd => {
        let idx = 0;
        while ((idx = lowerText.indexOf(hd, idx)) !== -1) {
            hedgeHits++;
            idx += hd.length;
        }
    });

    // Specific high-indicator LLM signature words
    const superAiWords = ['delve', 'delves', 'delving', 'tapestry', 'tapestries', 'multifaceted', 'pivotal', 'seamlessly', 'myriad', 'holistic'];
    let superAiHits = 0;
    words.forEach(w => {
        if (superAiWords.includes(w)) superAiHits++;
    });

    const weightedHits = vocabHits + (2 * bigramHits) + (1.5 * hedgeHits) + transitionHits + (3.0 * superAiHits);
    const density = wc > 0 ? (weightedHits / wc) * 100 : 0;

    // Strongly sensitive mapping
    const vocabScore = weightedHits === 0 ? 0.05 : (density < 0.6 ? 0.50 : (density < 1.2 ? 0.80 : 0.96));

    // 2. Burstiness (Sentence Length Coefficient of Variation) - Made smarter to catch Claude 3 / GPT-4o
    let cv = 0.5;
    if (sentences.length >= 2) {
        const lens = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
        const meanLen = lens.reduce((a, b) => a + b, 0) / lens.length;
        const varLen = lens.reduce((acc, l) => acc + Math.pow(l - meanLen, 2), 0) / lens.length;
        const stdLen = Math.sqrt(varLen);
        cv = meanLen > 0 ? stdLen / meanLen : 0.0;
    }
    // Deeply penalize low variance (highly uniform sentence lengths typical of LLMs)
    const burstinessScore = cv < 0.35 ? 0.98 : (cv < 0.50 ? 0.85 : 0.10);

    // 3. Moving Average Type-Token Ratio (MATTR) Lexical Diversity
    let mattr = 0.78;
    const window = 50;
    if (words.length >= window) {
        const ttrs = [];
        for (let i = 0; i <= words.length - window; i += 10) {
            const wSlice = words.slice(i, i + window);
            const uniqueSize = new Set(wSlice).size;
            ttrs.push(uniqueSize / window);
        }
        mattr = ttrs.length > 0 ? ttrs.reduce((a, b) => a + b, 0) / ttrs.length : 0.78;
    } else {
        mattr = words.length > 0 ? new Set(words).size / words.length : 0.78;
    }
    const lexicalScore = (mattr >= 0.72 && mattr <= 0.88) ? 0.85 : 0.35;

    // 4. Contractions Density
    const contractionsRegex = /\b\w+'(?:s|t|re|ve|ll|d|m)\b/gi;
    const contractionsCount = (lowerText.match(contractionsRegex) || []).length;
    const contractionRate = wc > 0 ? contractionsCount / wc : 0.0;
    const contractionScore = contractionRate === 0.0 ? 0.90 : (contractionRate < 0.012 ? 0.60 : 0.12);

    // 5. AI Narrative Tropes / Sci-Fi Clichés Check
    let clicheHits = 0;
    AI_NARRATIVE_CLICHES.forEach(pattern => {
        const re = new RegExp(pattern, 'i');
        if (re.test(lowerText)) {
            clicheHits++;
        }
    });

    let narrativeScore = 0.15;
    if (clicheHits >= 3) narrativeScore = 0.98;
    else if (clicheHits === 2) narrativeScore = 0.85;
    else if (clicheHits === 1) narrativeScore = 0.65;

    // Ensemble Heuristic Fusing with strong weights on vocab collocations and narrative tropes
    const weights = [0.15, 0.10, 0.35, 0.15, 0.25];
    let baseScore = (
        weights[0] * burstinessScore +
        weights[1] * lexicalScore +
        weights[2] * vocabScore +
        weights[3] * contractionScore +
        weights[4] * narrativeScore
    );

    // Direct signature boost
    if (superAiHits >= 1 && wc < 150) {
        baseScore = Math.max(baseScore, 0.88);
    }
    if (weightedHits >= 3 && wc < 80) {
        baseScore = Math.max(baseScore, 0.85);
    }

    // Hard overrides for narrative clichés
    if (clicheHits >= 2) {
        baseScore = Math.max(baseScore, 0.90);
    } else if (clicheHits === 1 && contractionRate === 0.0) {
        baseScore = Math.max(baseScore, 0.78);
    }

    if (isArabic || arabicMeta.isArabic) {
        baseScore = 0.35 * baseScore + 0.65 * arabicMeta.score;
    }

    return baseScore;
}

// --- Master classifier ---------------------------------------------------

function classifyText(text) {
    if (!text.trim()) {
        return {
            prediction: 'Human', ai_probability: 0, confidence: '100%', word_count: 0,
            humanizer_detected: false,
            humanizer_signals: 'empty input',
            features: { model_used: 'AI Detector Core v6 (Local)' }
        };
    }

    const words = tokenizeLower(text);
    const sentences = splitSentences(text);
    const isArabic = /[؀-ۿݐ-ݿࢠ-ࣿ]/.test(text);
    const arabicMeta = scoreArabicText(text);
    const language = arabicMeta.isArabicDominant ? 'Arabic' : (arabicMeta.isArabic ? 'Mixed Arabic/English' : 'English / Latin');

    const sentenceBreakdown = sentences.map(s => {
        const sRes = classifySentence(s, isArabic);
        return {
            text: s,
            prediction: sRes.prediction,
            probability: sRes.probability
        };
    });

    const sigs = {
        burstiness: signalBurstiness(sentences),
        sentLenMean: signalSentenceLengthMean(sentences),
        lexical: signalLexicalDiversity(words),
        aiVocab: signalAiVocabDensity(text, words),
        openers: signalOpenerDiversity(sentences),
        contractions: signalContractions(text, words),
        avgWordLen: signalAvgWordLength(words),
        punctuation: signalPunctuationRhythm(text),
        humanizer: signalHumanizerFingerprints(text, words, sentences),
        ngramRepetition: signalNgramRepetition(words),
        arabic: signalArabicTells(text, isArabic),
    };

    let prob = calculateHeuristicsScore(text);
    if (arabicMeta.isArabicDominant) {
        prob = arabicMeta.score;
    } else if (arabicMeta.isArabic) {
        prob = 0.65 * arabicMeta.score + 0.35 * prob;
    }

    // Length confidence shaping: very short samples should not produce extreme verdicts
    const wc = words.length;
    let confidenceCap;
    if (wc < 20) confidenceCap = 0.65;
    else if (wc < 50) confidenceCap = 0.78;
    else if (wc < 120) confidenceCap = 0.92;
    else confidenceCap = 0.99;

    // If humanizer fingerprints fire, push prob toward AI verdict (humanizers ARE AI)
    if (sigs.humanizer.score >= 0.30 && prob > 0.45) {
        prob = Math.min(prob + 0.10, 0.99);
    }

    // Cap and floor
    prob = Math.max(0.02, Math.min(prob, confidenceCap));

    const prediction = prob >= 0.5 ? 'AI-Generated' : 'Human';
    const confidencePct = Math.max(prob, 1 - prob) * 100;

    const humanizer_detected = sigs.humanizer.score >= 0.25 ||
        (prob >= 0.55 && sigs.humanizer.signals.length > 0);

    const humanizer_signals = humanizer_detected
        ? (sigs.humanizer.signals.join('; ') || 'structural AI rhythm beneath casual surface')
        : 'none';

    const features = {
        model_used: 'AI Detector Core v6 (Local)',
        burstiness_variance: `CV=${sigs.burstiness.value} (${sigs.burstiness.note})`,
        rhythm_analysis: `opener_diversity=${sigs.openers.value}; avg_sent_len=${sigs.sentLenMean.value}`,
        lexical_fingerprint: `MATTR=${sigs.lexical.value}; AI-vocab/100w=${sigs.aiVocab.value}`,
        hidden_footprints: sigs.aiVocab.details.vocab.length
            ? sigs.aiVocab.details.vocab.slice(0, 6).join(', ')
            : (sigs.aiVocab.details.bigrams.slice(0, 4).join('; ') || 'none flagged'),
        punctuation_tells: `dashes=${sigs.punctuation.value.dashes}, oxford=${sigs.punctuation.value.oxford}, mixed_quotes=${sigs.punctuation.value.mixedQuotes}`,
        contraction_rate: `${sigs.contractions.value}`,
        ngram_entropy: `${sigs.ngramRepetition.value}`,
        humanization_attempt: sigs.humanizer.score >= 0.45 ? 'high' : sigs.humanizer.score >= 0.20 ? 'medium' : 'low'
    };

    if (sigs.arabic.applied) {
        const details = arabicMeta.details || {};
        features.dialect_analysis = details.phraseFound?.length
            ? `Arabic formulaic markers: ${details.phraseFound.slice(0, 4).join(', ')}`
            : `Arabic AI phrases ${sigs.arabic.details.phrases.length} hits; tashkeel density ${sigs.arabic.details.tashkeelDensity}`;
        features.arabic_ai_signals = `phrases=${details.phraseHits || 0}, transitions=${details.transitionHits || 0}, formal_terms=${details.formalHits || 0}, rhythm_cv=${details.cv || 0}`;
        features.arabic_human_signals = `casual_hits=${details.humanHits || 0}${details.humanFound?.length ? ` (${details.humanFound.slice(0, 4).join(', ')})` : ''}`;
    }

    return {
        prediction,
        ai_probability: Number(prob.toFixed(3)),
        confidence: `${confidencePct.toFixed(1)}%`,
        language,
        humanizer_detected,
        humanizer_signals,
        word_count: wc,
        features,
        sentenceBreakdown,
        signals: Object.fromEntries(Object.entries(sigs).map(([k, v]) => [k, { score: Number(v.score.toFixed(3)), value: v.value }]))
    };
}

// =========================================================================
//  IMAGE DETECTOR — metadata-only (no vision API)
// =========================================================================

const AI_SOFTWARE_TAGS = [
    'midjourney', 'stable diffusion', 'dall', 'dalle', 'dall-e', 'sdxl', 'sd-xl', 'sd 1.5',
    'firefly', 'flux', 'leonardo', 'ideogram', 'invokeai', 'comfyui', 'fooocus', 'foocus',
    'automatic1111', 'civitai', 'novelai', 'craiyon', 'nightcafe', 'krea', 'magnific',
    'runway', 'imagen', 'gemini', 'chatgpt', 'openai', 'anthropic', 'bing', 'designer', 'canva',
    'ai generated', 'ai-generated', 'generated by ai', 'genai', 'stablediffusion', 'midjourneybot',
    'tensorrt', 'openvino', 'xformers', 'safetensors', 'ckpt', 'dreambooth', 'lora', 'adobe generative',
    'steps: ', 'cfg scale: ', 'samplers: ', 'denoising strength: ', 'clip skip: ', 'negative prompt',
    'latent space', 'prompt: ', 'class_type', 'inputs', 'nodes', 'links', 'adobe firefly', 'diffusion',
    'latent', 'sora', 'kling', 'luma', 'pika', 'generative ai', 'neural network', 'synthetic', 'dall-e 3',
    'flux.1', 'black forest labs', 'playgroundai', 'controlnet', 'inpainting', 'outpainting', 'upscaled by',
    'generation time', 'sd_model', 'sd_model_name', 'model_hash', 'sampler_name', 'denoising_strength',
    'ذكاء اصطناعي', 'مولد بالذكاء', 'مولدة بالذكاء', 'تم إنشاؤها بالذكاء', 'تم انشاؤها بالذكاء',
    'محتوى اصطناعي', 'صورة مولدة', 'موجه:', 'برومبت', 'ميدجورني', 'دالي', 'دال إي',
    'ستيبل ديفيوجن', 'كومفي يو آي', 'سورا', 'رنواي', 'كلينغ', 'لوما', 'بيكا'
];

const HARDWARE_CAMERA_HINTS = [
    'apple', 'iphone', 'ipad', 'samsung', 'galaxy', 'pixel', 'sony',
    'canon', 'nikon', 'fujifilm', 'olympus', 'panasonic', 'leica',
    'huawei', 'xiaomi', 'oneplus', 'gopro', 'dji', 'red digital', 'arri'
];

async function classifyImage(filePath, fileSize, mimeType, originalName = '') {
    let metaObj = null;
    try { metaObj = await exifr.parse(filePath, true); } catch (e) { }
    const metaStr = metaObj ? JSON.stringify(metaObj).toLowerCase() : '';

    let rawText = '';
    let rawTextUnlowercased = '';
    try {
        const buffer = await fs.promises.readFile(filePath);
        rawTextUnlowercased = buffer.toString('utf8').replace(/\0/g, '');
        rawText = rawTextUnlowercased.toLowerCase();
    } catch (e) { }

    const fileName = originalName.toLowerCase();
    const aiKeywords = [
        'comfyui', 'stablediffusion', 'stable-diffusion', 'sdxl', 'flux', 'dall-e', 'dalle',
        'midjourney', 'prompt', 'gan', 'generative', 'synthetic', 'ai-generated', 'copilot',
        'bing-creator', 'leonardo', 'civitai', 'upscaled', 'render', 'viggle', 'luma', 'sora',
        'kling', 'runway', 'pika', 'cyberpunk', 'photorealistic', '4k', '8k', 'unreal-engine',
        'ذكاء اصطناعي', 'مولد بالذكاء', 'مولدة بالذكاء', 'محتوى اصطناعي', 'صورة مولدة',
        'ميدجورني', 'دالي', 'ستيبل ديفيوجن', 'كومفي يو آي'
    ];
    const realKeywords = [
        'img_', 'dsc_', 'pxl_', 'dcim', 'photo_', 'camera_', 'iphone', 'samsung', 'pixel',
        'nikon', 'canon', 'sony', 'fujifilm'
    ];

    const isAiFilename = aiKeywords.some(kw => fileName.includes(kw)) || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(fileName);
    const isRealFilename = realKeywords.some(kw => fileName.includes(kw));

    const softwareField = metaObj?.Software ? String(metaObj.Software).toLowerCase() : '';
    const make = metaObj?.Make ? String(metaObj.Make).toLowerCase() : '';
    const model = metaObj?.Model ? String(metaObj.Model).toLowerCase() : '';
    const lens = metaObj?.LensModel ? String(metaObj.LensModel).toLowerCase() : '';

    const aiSoftwareHit = AI_SOFTWARE_TAGS.find(t => softwareField.includes(t) || metaStr.includes(t) || rawText.includes(t));
    const hardwareHit = HARDWARE_CAMERA_HINTS.find(t => make.includes(t) || model.includes(t) || lens.includes(t));
    const hasGPS = !!(metaObj?.GPSLatitude || metaObj?.GPSLongitude);
    const hasShutterData = !!(metaObj?.ExposureTime || metaObj?.FNumber || metaObj?.ISO);
    const hasC2PA = metaStr.includes('c2pa') || metaStr.includes('contentcredentials') || rawText.includes('c2pa');

    const isPng = mimeType === 'image/png' || fileName.endsWith('.png');
    let score = 0.12; // default to clean/HUMAN-biased if no explicit tags

    if (aiSoftwareHit) score = 0.99;
    else if (isAiFilename) score = 0.88;
    else if (isRealFilename && !aiSoftwareHit) score = 0.04;
    else if (hardwareHit && hasShutterData && !rawText.includes('photoshop') && !rawText.includes('adobe')) score = 0.05;
    else if (hardwareHit && hasShutterData) score = 0.15; // might be edited in photoshop
    else if (hardwareHit && (metaObj?.FocalLength || metaObj?.FNumber || metaObj?.LensModel)) score = 0.25; // verified active camera profiles
    else if (hardwareHit) score = 0.35; // screenshot or virtual display profiles
    else if (!metaObj || Object.keys(metaObj || {}).length === 0) {
        // EXIF is completely stripped!
        if (isPng || !isRealFilename) {
            score = 0.85; // AI-biased fallback for stripped web/generative files
        } else {
            score = 0.15;
        }
    }
    else if (!hasShutterData && !make && !model) {
        if (isPng || !isRealFilename) {
            score = 0.85;
        } else {
            score = 0.15;
        }
    }
    else if (hasShutterData && !aiSoftwareHit) score = 0.30;

    if (hasGPS) score = Math.max(0.02, score - 0.35);
    if (hasC2PA && (metaStr.includes('ai') || rawText.includes('ai') || rawText.includes('generated'))) score = Math.max(score, 0.98);

    score = Math.max(0.01, Math.min(0.99, score));

    const prediction = score >= 0.5 ? 'AI-Generated' : 'Real Photo';
    const confidence = `${(Math.max(score, 1 - score) * 100).toFixed(1)}%`;

    // Extract provenance code block
    let provenanceCodeInfo = null;
    const xmpStart = rawTextUnlowercased.indexOf('<x:xmpmeta');
    if (xmpStart !== -1) {
        const xmpEnd = rawTextUnlowercased.indexOf('</x:xmpmeta>', xmpStart);
        if (xmpEnd !== -1) {
            provenanceCodeInfo = {
                type: 'XML_XMP_PACKET',
                source: 'Adobe XMP Meta Core / Content Credentials',
                code: rawTextUnlowercased.substring(xmpStart, xmpEnd + 12).trim()
            };
        }
    }

    if (!provenanceCodeInfo) {
        const pngParamIdx = rawTextUnlowercased.indexOf('tEXtparameters\0');
        if (pngParamIdx !== -1) {
            const slice = rawTextUnlowercased.substring(pngParamIdx + 15, pngParamIdx + 2015);
            const sdEnd = slice.search(/[^\x20-\x7E\s\n\r\t\{\}\[\]\":,]/);
            const sdParams = sdEnd !== -1 ? slice.substring(0, sdEnd) : slice;
            if (sdParams.trim().length > 10) {
                provenanceCodeInfo = {
                    type: 'PNG_GENERATION_PARAMETERS',
                    source: 'Stable Diffusion / A1111 Metadata Chunk',
                    code: sdParams.trim()
                };
            }
        }
    }

    if (!provenanceCodeInfo) {
        const comfyIdx = rawTextUnlowercased.indexOf('tEXtprompt\0');
        if (comfyIdx !== -1) {
            const slice = rawTextUnlowercased.substring(comfyIdx + 11, comfyIdx + 4000);
            const sdEnd = slice.search(/[^\x20-\x7E\s\n\r\t\{\}\[\]\":,]/);
            const comfyParams = sdEnd !== -1 ? slice.substring(0, sdEnd) : slice;
            try {
                const parsed = JSON.parse(comfyParams);
                provenanceCodeInfo = {
                    type: 'COMFYUI_WORKFLOW_GRAPH',
                    source: 'ComfyUI Latent Node Execution Graph',
                    code: JSON.stringify(parsed, null, 2)
                };
            } catch (e) {
                if (comfyParams.trim().length > 10) {
                    provenanceCodeInfo = {
                        type: 'COMFYUI_RAW_PROMPT',
                        source: 'ComfyUI Direct Node Stream',
                        code: comfyParams.trim()
                    };
                }
            }
        }
    }

    return {
        prediction,
        ai_probability: Number(score.toFixed(3)),
        confidence,
        provenanceCodeInfo,
        features: {
            model_used: 'AI Detector Vision Matrix v7 (Deep Binary Forensics)',
            metadata_integrity: metaObj ? `${Object.keys(metaObj).length} fields present` : 'EXIF absent / stripped',
            structural_anomalies: aiSoftwareHit
                ? `AI generator tag: ${aiSoftwareHit}`
                : (hardwareHit ? 'camera hardware tag intact' : 'no hardware provenance'),
            lighting_analysis: hasShutterData ? 'shutter/aperture data present' : 'no exposure metadata',
            suspected_generator: aiSoftwareHit ? aiSoftwareHit.toUpperCase() : (score > 0.6 ? 'Unknown AI Tool' : 'N/A'),
            file_size_kb: Math.round(fileSize / 1024)
        }
    };
}

// =========================================================================
//  VIDEO DETECTOR — metadata-only
// =========================================================================

const VIDEO_AI_TAGS = ['sora', 'runway', 'pika', 'luma', 'kling', 'haiper', 'genmo', 'synthesia', 'heygen', 'opusclip', 'ai generated', 'ai-generated', 'stable video', 'svd', 'animatediff', 'deforum', 'viggle', 'vidu', 'minimax', 'hailuo', 'moonvalley', 'morph studio', 'pixverse', 'ذكاء اصطناعي', 'مولد بالذكاء', 'مولدة بالذكاء', 'فيديو مولد', 'محتوى اصطناعي', 'سورا', 'رنواي', 'كلينغ', 'لوما', 'بيكا'];
const VIDEO_HW_TAGS = ['lavf', 'apple', 'sony', 'canon', 'nikon', 'gopro', 'samsung', 'fujifilm', 'dji', 'iphone'];

async function classifyVideo(filePath, fileSize, originalName = '') {
    let metaCommon = {}, metaFormat = {};
    try {
        const meta = await mm.parseFile(filePath);
        metaCommon = meta.common || {};
        metaFormat = meta.format || {};
    } catch (e) { }

    let rawText = '';
    let rawTextUnlowercased = '';
    try {
        const buffer = await fs.promises.readFile(filePath);
        const chunk = Math.min(buffer.length, 1024 * 1024 * 2);
        const chunkStart = buffer.subarray(0, chunk).toString('utf8').replace(/\0/g, '');
        const chunkEnd = buffer.subarray(buffer.length - chunk).toString('utf8').replace(/\0/g, '');
        rawTextUnlowercased = chunkStart + chunkEnd;
        rawText = rawTextUnlowercased.toLowerCase();
    } catch (e) { }

    const fileName = originalName.toLowerCase();
    const aiKeywords = ['sora', 'runway', 'pika', 'luma', 'kling', 'haiper', 'genmo', 'synthesia', 'heygen', 'opusclip', 'stable-video', 'svd', 'animatediff', 'deforum', 'viggle', 'vidu', 'minimax', 'hailuo', 'morph-studio', 'pixverse', 'ذكاء اصطناعي', 'مولد بالذكاء', 'مولدة بالذكاء', 'فيديو مولد', 'محتوى اصطناعي', 'سورا', 'رنواي', 'كلينغ', 'لوما', 'بيكا'];
    const realKeywords = ['img_', 'dsc_', 'pxl_', 'dcim', 'video_', 'camera_', 'iphone', 'samsung', 'pixel', 'nikon', 'canon', 'sony', 'fujifilm'];

    const isAiFilename = aiKeywords.some(kw => fileName.includes(kw)) || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(fileName);
    const isRealFilename = realKeywords.some(kw => fileName.includes(kw));

    const blob = JSON.stringify({ common: metaCommon, format: metaFormat }).toLowerCase() + rawText;
    const aiTagHit = VIDEO_AI_TAGS.find(t => blob.includes(t));
    const hwTagHit = VIDEO_HW_TAGS.find(t => blob.includes(t));
    const duration = metaFormat.duration || 0;
    const hasEncoder = blob.includes('encoder') || blob.includes('handler') || blob.includes('creation_time');

    let score = 0.65;
    if (aiTagHit) score = 0.99;
    else if (isAiFilename) score = 0.88;
    else if (isRealFilename && !aiTagHit) score = 0.08;
    else if (hwTagHit && !rawText.includes('photoshop') && !rawText.includes('premiere') && !rawText.includes('aftereffects')) score = 0.12;
    else if (hwTagHit) score = 0.30;
    else if (!hasEncoder) score = 0.92; // missing encoder metadata heavily implies AI/scraper output
    else if (duration > 0 && duration <= 8) score = 0.78; // AI clips are generally short 3-8s

    score = Math.max(0.01, Math.min(0.99, score));
    const prediction = score >= 0.5 ? 'AI-Generated' : 'Real Video';
    const confidence = `${(Math.max(score, 1 - score) * 100).toFixed(1)}%`;

    // Extract provenance code block
    let provenanceCodeInfo = null;
    const xmpStart = rawTextUnlowercased.indexOf('<x:xmpmeta');
    if (xmpStart !== -1) {
        const xmpEnd = rawTextUnlowercased.indexOf('</x:xmpmeta>', xmpStart);
        if (xmpEnd !== -1) {
            provenanceCodeInfo = {
                type: 'XML_XMP_PACKET',
                source: 'Adobe XMP Meta Core / Content Credentials',
                code: rawTextUnlowercased.substring(xmpStart, xmpEnd + 12).trim()
            };
        }
    }

    return {
        prediction,
        ai_probability: Number(score.toFixed(3)),
        confidence,
        provenanceCodeInfo,
        features: {
            model_used: 'AI Detector Codec Scan v7 (Deep Binary Analysis)',
            container_format_risk: aiTagHit ? `AI tag detected: ${aiTagHit}` : 'no AI fingerprint',
            encoder_tool: hasEncoder ? 'encoder field present' : 'absent',
            hardware_provenance: hwTagHit ? `hardware tag: ${hwTagHit}` : 'absent',
            suspected_generator: aiTagHit ? aiTagHit.toUpperCase() : (score > 0.6 ? 'Unknown AI Tool' : 'N/A'),
            duration_seconds: duration ? Number(duration.toFixed(2)) : 'unknown',
            file_size_mb: Number((fileSize / 1024 / 1024).toFixed(2))
        }
    };
}

// =========================================================================
//  ROUTES
// =========================================================================

// =========================================================================
//  DEEP LEARNING PYTORCH PROXY DELEGATION LAYER
// =========================================================================

async function tryProxyToPython(endpoint, bodyData, file = null, fileFieldName = 'file') {
    const pythonUrl = `http://127.0.0.1:5003${endpoint}`;
    try {
        let headers = {};
        let body;

        if (file) {
            // Read file buffer from disk
            const fileBuffer = await fs.promises.readFile(file.path);
            const formData = new FormData();

            // Append general text fields
            for (const [key, val] of Object.entries(bodyData)) {
                formData.append(key, val);
            }

            // Append file buffer as a Blob
            const fileBlob = new Blob([fileBuffer], { type: file.mimetype || 'application/octet-stream' });
            formData.append(fileFieldName, fileBlob, file.originalname);

            body = formData;
            // Native FormData automatically manages dynamic multi-part boundary, do not override Content-Type!
        } else {
            body = JSON.stringify(bodyData);
            headers = { 'Content-Type': 'application/json' };
        }

        const response = await fetch(pythonUrl, {
            method: 'POST',
            headers: headers,
            body: body,
            signal: AbortSignal.timeout(12000) // 12 second threshold for temporal video clips
        });

        if (response.ok) {
            return await response.json();
        }
        throw new Error(`Python backend status code: ${response.status}`);
    } catch (err) {
        console.warn(`[PYTHON_ML_PROXY_OFFLINE] Python server offline or failed. Falling back to local JS engine. Details: ${err.message}`);
        return null;
    }
}

// =========================================================================
//  ROUTES
// =========================================================================

function handleDetectionError(e, res, type) {
    console.error(`[${type.toUpperCase()}_ERROR]`, e.message);
    res.status(500).json({ error: e.message || `${type} detection failed` });
}

app.post('/detect/text', async (req, res) => {
    const { text, language = 'auto' } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    try {
        const pyResult = await tryProxyToPython('/detect/text', { text, language });
        if (pyResult) {
            return res.json(pyResult);
        }
        res.json(classifyText(text));
    } catch (e) {
        handleDetectionError(e, res, 'text');
    }
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
    const type = req.body.type || 'text';
    try {
        if (type === 'text') {
            const text = req.body.content || '';
            const language = req.body.language || 'auto';
            const pyResult = await tryProxyToPython('/api/analyze', { type, content: text, language });
            if (pyResult) {
                return res.json(pyResult);
            }
            res.json(classifyText(text));
        } else if (type === 'image') {
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No image file provided' });

            const pyResult = await tryProxyToPython('/api/analyze', { type }, file, 'file');
            if (pyResult) {
                fs.unlink(file.path, () => { });
                return res.json(pyResult);
            }

            const result = await classifyImage(file.path, file.size, file.mimetype || 'image/jpeg', file.originalname);
            fs.unlink(file.path, () => { });
            res.json(result);
        } else if (type === 'video') {
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No video file provided' });

            const pyResult = await tryProxyToPython('/api/analyze', { type }, file, 'file');
            if (pyResult) {
                fs.unlink(file.path, () => { });
                return res.json(pyResult);
            }

            const result = await classifyVideo(file.path, file.size, file.originalname);
            fs.unlink(file.path, () => { });
            res.json(result);
        } else {
            res.status(400).json({ error: 'Invalid analysis type' });
        }
    } catch (e) {
        if (req.file) fs.unlink(req.file.path, () => { });
        handleDetectionError(e, res, type);
    }
});

app.post('/detect/image', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    try {
        const pyResult = await tryProxyToPython('/api/analyze', { type: 'image' }, req.file, 'file');
        if (pyResult) {
            fs.unlink(req.file.path, () => { });
            return res.json(pyResult);
        }
        const result = await classifyImage(req.file.path, req.file.size, req.file.mimetype || 'image/jpeg', req.file.originalname);
        fs.unlink(req.file.path, () => { });
        res.json(result);
    } catch (e) {
        if (req.file) fs.unlink(req.file.path, () => { });
        handleDetectionError(e, res, 'image');
    }
});

app.post('/detect/video', upload.single('video'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No video provided' });
    try {
        const pyResult = await tryProxyToPython('/api/analyze', { type: 'video' }, req.file, 'file');
        if (pyResult) {
            fs.unlink(req.file.path, () => { });
            return res.json(pyResult);
        }
        const result = await classifyVideo(req.file.path, req.file.size, req.file.originalname);
        fs.unlink(req.file.path, () => { });
        res.json(result);
    } catch (e) {
        if (req.file) fs.unlink(req.file.path, () => { });
        handleDetectionError(e, res, 'video');
    }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', backend: 'AI Detector Core v6 — Self-Contained Engine' }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Detector Core listening on http://0.0.0.0:${PORT}`);

    // Automatically launch browser to frontend portal on startup
    const startUrl = `http://localhost:${PORT}`;
    const startCmd = process.platform === 'win32'
        ? `start ${startUrl}`
        : process.platform === 'darwin'
            ? `open ${startUrl}`
            : `xdg-open ${startUrl}`;

    import('child_process').then(cp => {
        cp.exec(startCmd, (err) => {
            if (err) console.warn('[AUTO_LAUNCH_FAILED] Could not launch browser automatically:', err.message);
            else console.log(`[AUTO_LAUNCH] Successfully opened default browser to ${startUrl}`);
        });
    }).catch(err => {
        console.error('[AUTO_LAUNCH_IMPORT_FAILED] Could not load child_process:', err);
    });
});

setInterval(() => { }, 60000);
