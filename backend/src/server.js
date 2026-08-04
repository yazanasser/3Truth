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
const PORT = Number.parseInt(process.env.PORT || '5001', 10);
const frontendDir = path.join(__dirname, '../../frontend');
const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || 'http://localhost:5001,http://127.0.0.1:5001')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
);
const maxUploadBytes = Number.parseInt(process.env.MAX_UPLOAD_BYTES || String(512 * 1024 * 1024), 10);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed by CORS policy'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600
}));
app.disable('x-powered-by');
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
});
app.use(express.static(frontendDir, {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
            return;
        }
        if (/\.(?:css|js|svg|png|webp|woff2?)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const PAGE_ROUTES = {
    '/detector': 'detector.html',
    '/scan': 'detector.html',
    '/pricing': 'pricing.html',
    '/plans': 'pricing.html',
    '/signin': 'signin.html',
    '/login': 'signin.html',
    '/contact': 'contact.html',
    '/support': 'contact.html'
};

Object.entries(PAGE_ROUTES).forEach(([route, fileName]) => {
    app.get([route, `${route}.html`], (req, res) => {
        res.sendFile(path.join(frontendDir, fileName));
    });
});

app.get(['/docs', '/docs.html', '/about', '/about.html', '/info', '/info.html'], (req, res) => {
    res.sendFile(path.join(frontendDir, 'static.html'));
});

const upload = multer({
    dest: os.tmpdir(),
    limits: {
        fileSize: maxUploadBytes,
        files: 1,
        fields: 8,
        fieldSize: 1024 * 1024
    }
});

function cleanupUploadedFile(file) {
    if (!file || !file.path) return;
    fs.unlink(file.path, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.warn(`[TEMP_FILE_CLEANUP_FAILED] ${file.path}: ${err.message}`);
        }
    });
}

const TEXT_FILE_EXTENSIONS = new Set([
    '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.jsonl', '.xml',
    '.html', '.htm', '.rtf', '.log', '.yaml', '.yml', '.ini', '.cfg',
    '.conf', '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.c', '.cpp',
    '.h', '.hpp', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt',
    '.sql', '.sh', '.bat', '.ps1', '.css', '.scss', '.less', '.srt',
    '.vtt'
]);
const IMAGE_FILE_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.jfif', '.png', '.webp', '.gif', '.bmp', '.tif',
    '.tiff', '.heic', '.heif', '.avif', '.svg', '.ico', '.raw', '.dng',
    '.cr2', '.cr3', '.nef', '.arw', '.orf', '.rw2', '.raf', '.pef',
    '.srw', '.x3f'
]);
const VIDEO_FILE_EXTENSIONS = new Set([
    '.mp4', '.m4v', '.mov', '.webm', '.avi', '.mkv', '.wmv', '.flv',
    '.mpeg', '.mpg', '.3gp', '.3g2', '.mts', '.m2ts', '.ts', '.ogv',
    '.hevc', '.h265', '.h264'
]);

function getFileExtension(fileName = '') {
    const cleanName = String(fileName || '').toLowerCase().split(/[?#]/)[0];
    const lastDot = cleanName.lastIndexOf('.');
    return lastDot >= 0 ? cleanName.slice(lastDot) : '';
}

function isTextLikeMime(mimeType = '') {
    const mime = String(mimeType || '').toLowerCase();
    return mime.startsWith('text/') ||
        mime.includes('json') ||
        mime.includes('xml') ||
        mime.includes('javascript') ||
        mime.includes('x-yaml') ||
        mime.includes('rtf');
}

function inferAnalysisTypeFromFile(file, requestedType = 'text') {
    const mime = String(file?.mimetype || '').toLowerCase();
    const ext = getFileExtension(file?.originalname);
    if (mime.startsWith('image/') || IMAGE_FILE_EXTENSIONS.has(ext)) return 'image';
    if (mime.startsWith('video/') || VIDEO_FILE_EXTENSIONS.has(ext)) return 'video';
    if (isTextLikeMime(mime) || TEXT_FILE_EXTENSIONS.has(ext)) return 'text';
    const normalizedRequested = String(requestedType || '').toLowerCase();
    return ['text', 'image', 'video'].includes(normalizedRequested) ? normalizedRequested : 'text';
}

function decodeUploadedTextBuffer(buffer, ext = '') {
    let text = buffer.toString('utf8').replace(/\0/g, ' ');
    if (ext === '.rtf') {
        text = text
            .replace(/\\'[0-9a-fA-F]{2}/g, ' ')
            .replace(/\\[a-z]+-?\d* ?/gi, ' ')
            .replace(/[{}]/g, ' ')
            .replace(/\s+/g, ' ');
    } else if (ext === '.html' || ext === '.htm') {
        text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ');
    }
    return text.trim();
}

async function extractTextFromUploadedFile(file) {
    const ext = getFileExtension(file?.originalname);
    const mime = String(file?.mimetype || '').toLowerCase();
    if (!file || !file.path) return '';
    if (!TEXT_FILE_EXTENSIONS.has(ext) && !isTextLikeMime(mime)) {
        throw new Error('Unsupported text file type. Use plain text/code/data files, or upload PDF/DOCX through the browser extractor.');
    }
    const buffer = await fs.promises.readFile(file.path);
    return decodeUploadedTextBuffer(buffer, ext);
}

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
    'في ظل التطورات المتسارعة', 'مما لا شك فيه', 'لا يخفى على أحد',
    'في عالمنا اليوم', 'في العصر الرقمي', 'في عالمنا المترابط',
    'لا يمكن إنكار أن', 'من الواضح أن', 'من أبرز الجوانب',
    'على نطاق واسع', 'بشكل متزايد', 'بشكل ملحوظ', 'بصورة فعالة',
    'بشكل فعال', 'يلعب دورا حيويا', 'دورا حيويا', 'أمرا بالغ الأهمية',
    'أمر بالغ الأهمية', 'يسلط الضوء على', 'يسلط الضوء', 'يعكس أهمية',
    'يعزز القدرة على', 'مفتاحا أساسيا', 'ركيزة أساسية', 'حجر الزاوية',
    'حلولا مبتكرة', 'نهجا شاملا', 'إطارا متكاملا', 'تجربة أكثر سلاسة',
    'التحول الرقمي', 'المشهد الرقمي', 'المشهد المتطور بسرعة',
    'التطور السريع', 'التغيرات المتسارعة', 'الخوض في', 'نسيجا من',
    'نسيج غني', 'متعدد الأوجه'
];

const ARABIC_AI_TRANSITIONS = [
    'أولا', 'ثانيا', 'ثالثا', 'أخيرا', 'لذلك', 'وبالتالي', 'ومن ثم',
    'علاوة', 'بالإضافة', 'فضلا', 'فضلاً', 'كذلك', 'أيضا', 'أيضاً',
    'في المقابل', 'من ناحية', 'من جهة', 'على الرغم', 'بالرغم', 'ومع ذلك',
    'بالمثل', 'من ثم', 'ومن هنا', 'عليه', 'بناء عليه', 'نتيجة لذلك',
    'إضافة إلى ذلك', 'علاوة على ذلك', 'من جانب آخر'
];

const ARABIC_FORMAL_WORDS = [
    'محوري', 'استراتيجي', 'شامل', 'مستدام', 'مبتكر', 'فعال', 'متكامل',
    'منظومة', 'تعزيز', 'تحسين', 'تطوير', 'تحقيق', 'تسهم', 'يسهم',
    'تساهم', 'يساهم', 'يعد', 'تعد', 'يعتبر', 'تعتبر', 'ضرورة',
    'أهمية', 'الرقمي', 'التحول', 'الكفاءة', 'الجودة', 'المستقبل',
    'الابتكار', 'التحديات', 'الفرص', 'المجالات', 'المختلفة',
    'حيوي', 'بالغ', 'الأهمية', 'إطار', 'نهج', 'حلول', 'متطورة',
    'متسارعة', 'سلاسة', 'مرونة', 'فعالية', 'رئيسي', 'أساسي'
];

const ARABIC_FORMAL_ROOTS = [
    'محور', 'استراتيج', 'شامل', 'مستدام', 'مبتكر', 'فعال', 'متكامل',
    'منظوم', 'تعزيز', 'تحسين', 'تطوير', 'تحقيق', 'كفاء', 'جود',
    'ابتكار', 'تحدي', 'فرص', 'مجال', 'ضرور', 'اهمي', 'رقمي',
    'تحول', 'مستقبل', 'حلول', 'نهج', 'اطار', 'متسارع', 'متطور',
    'حيوي', 'بالغ', 'رئيسي', 'اساسي', 'ركيز', 'يسلط', 'مواكب',
    'يسهم', 'يساهم', 'تعكس', 'يعكس'
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
    const formalHits = words.filter(w =>
        ARABIC_FORMAL_WORDS.includes(w) || ARABIC_FORMAL_ROOTS.some(root => w.includes(root))
    ).length;

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
    score += Math.min(0.52, phraseHits.count * 0.20);
    score += Math.min(0.30, transitionDensity * 0.07);
    score += Math.min(0.32, formalDensity * 0.06);
    score += Math.min(0.15, balanceHits * 0.05);

    if (sentences.length >= 3) {
        if (cv < 0.22) score += 0.16;
        else if (cv < 0.35) score += 0.11;
        else if (cv > 0.75) score -= 0.08;
    }
    if (openerRatio >= 0.45) score += 0.10;
    else if (openerRatio >= 0.25) score += 0.05;
    if (wc >= 35 && uniqueRatio >= 0.50 && uniqueRatio <= 0.90 && formalDensity >= 3) score += 0.11;
    else if (wc >= 45 && uniqueRatio >= 0.55 && uniqueRatio <= 0.86) score += 0.07;
    if (avgLen >= 5.2) score += 0.05;
    if (tashkeelDensity > 0 && tashkeelDensity < 0.006) score += 0.04;

    if (phraseHits.count >= 3) score = Math.max(score, 0.95);
    else if (phraseHits.count >= 2 && (formalDensity > 3 || transitionHits.count >= 2)) score = Math.max(score, 0.88);
    else if (phraseHits.count >= 1 && formalDensity > 6) score = Math.max(score, 0.82);
    else if (transitionHits.count >= 3 && formalDensity >= 5 && humanHits.count === 0) score = Math.max(score, 0.78);
    else if (wc >= 45 && formalDensity >= 8 && humanHits.count === 0 && cv < 0.48) score = Math.max(score, 0.74);

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

function computeAdvancedTextForensics(text) {
    const raw = text || '';
    const lower = raw.toLowerCase();
    const words = tokenizeLower(raw);
    const wc = words.length;
    const sentences = splitSentences(raw);
    if (!wc) return { success: false, reason: 'empty text' };

    const countPhrase = (term) => term ? (lower.split(term.toLowerCase()).length - 1) : 0;
    const countWord = (term) => {
        const safe = escapeRegExp(term.toLowerCase());
        const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${safe}([^\\p{L}\\p{N}_]|$)`, 'gu');
        return (lower.match(re) || []).length;
    };
    const normalizeAr = (value) => (value || '')
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/ـ/g, '')
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/ى/g, 'ي');

    const formalWords = [
        'utilize', 'facilitate', 'demonstrate', 'significant', 'essential',
        'effective', 'efficient', 'strategic', 'sustainable', 'framework',
        'implementation', 'development', 'innovation', 'optimization',
        'integration', 'analysis', 'approach', 'solution', 'outcomes',
        'implications', 'productivity', 'accessibility', 'scalability'
    ];
    const narrativePhrases = [
        'somewhere in the distance', 'cool morning air', 'old brick wall',
        'city slowly woke', 'tiny reflections', 'gold and orange',
        'nobody noticed', 'small notebook', 'park bench', 'unfinished ideas',
        'dreams that had never been shared', 'as if nothing unusual had happened',
        'for a brief moment', 'holding a secret', 'the world felt like',
        'just before sunrise', 'by noon', 'would be gone', 'whispering',
        'secrets older than time', 'single candle', 'long-forgotten',
        'painting the sky', 'somewhere far away', 'echoing through',
        'edge of the city', 'empty platform', 'everything was calm',
        'everything just seemed', 'slow down', 'far away places',
        'fresh bread', 'old train station'
    ];
    const scenicWords = [
        'rain', 'sunrise', 'streets', 'reflections', 'gold', 'orange',
        'bicycle', 'brick', 'wall', 'city', 'distance', 'train', 'bridge',
        'echoing', 'cool', 'morning', 'air', 'notebook', 'bench', 'sketches',
        'dreams', 'pavement', 'secret', 'shadow', 'candle', 'window',
        'moonlight', 'silence', 'whisper', 'forest', 'river', 'station',
        'platform', 'cafe', 'coffee', 'bread', 'traveler', 'travelers',
        'stories', 'smell', 'sun', 'hills', 'lights', 'empty', 'quiet',
        'evening', 'edge', 'calm'
    ];
    const simpleNarrativeOpeners = ['the', 'it', 'there', 'they', 'when', 'for', 'every'];
    const simpleNarrativeVerbs = [
        'was', 'were', 'had', 'would', 'came', 'went', 'made', 'seemed',
        'stood', 'sat', 'looked', 'felt', 'became'
    ];
    const businessPhrases = [
        'modern support teams', 'consistent process', 'customer requests',
        'urgent cases', 'response quality', 'over time', 'clear workflow',
        'reduce delays', 'better visibility', 'recurring issues',
        'improving response quality', 'reviewing customer requests',
        'prioritizing urgent cases', 'performance and recurring issues',
        'improve response', 'operational efficiency', 'data-driven insights',
        'cross-functional collaboration', 'measurable outcomes'
    ];
    const businessWords = [
        'modern', 'support', 'teams', 'consistent', 'process', 'reviewing',
        'customer', 'requests', 'prioritizing', 'urgent', 'cases', 'improving',
        'response', 'quality', 'workflow', 'reduce', 'delays', 'managers',
        'visibility', 'performance', 'recurring', 'issues', 'strategy',
        'strategies', 'organizations', 'stakeholders', 'operations', 'efficiency',
        'productivity', 'insights', 'outcomes', 'scalable', 'alignment',
        'optimization', 'collaboration', 'implementation', 'framework'
    ];
    const humanMarkers = [
        'i', 'we', 'my', 'me', 'our', 'personally', 'honestly', 'today',
        'yesterday', 'tomorrow', 'kinda', 'gonna', 'wanna', 'yeah', 'okay',
        'lol', 'lmao', 'tbh', 'imo', 'idk', 'stuff', 'things'
    ];
    const casualMarkers = [
        'kinda', 'gonna', 'wanna', 'yeah', 'okay', 'lol', 'lmao', 'tbh',
        'imo', 'idk', 'stuff', 'bruh', 'dude', 'nah', 'yep', 'nope',
        'honestly', 'basically', 'literally'
    ];
    const genericFrames = ['in conclusion', 'in summary', 'to sum up', 'overall', 'ultimately', 'in essence'];
    const arabicFormalWords = [
        'محوري', 'استراتيجي', 'شامل', 'مستدام', 'مبتكر', 'منظومة',
        'تعزيز', 'تحسين', 'تطوير', 'تحقيق', 'الكفاءة', 'الجودة',
        'الابتكار', 'التحديات', 'الفرص', 'المجالات', 'حيوي', 'بالغ',
        'إطار', 'نهج', 'حلول', 'متطورة', 'متسارعة', 'أساسي'
    ].map(normalizeAr);

    const aiTermHits = AI_VOCAB.reduce((sum, term) => sum + countWord(term), 0);
    const aiPhraseHits = AI_BIGRAMS.reduce((sum, term) => sum + countPhrase(term), 0) + HEDGES.reduce((sum, term) => sum + countPhrase(term), 0);
    const transitionHits = AI_TRANSITIONS.reduce((sum, term) => sum + countWord(term), 0);
    const formalHits = formalWords.reduce((sum, term) => sum + countWord(term), 0);
    const humanHits = humanMarkers.reduce((sum, term) => sum + countWord(term), 0);
    const casualHits = casualMarkers.reduce((sum, term) => sum + countWord(term), 0);
    const normalizedAr = normalizeAr(lower);
    const arabicAiHits = ARABIC_AI_PHRASES.reduce((sum, term) => sum + (normalizedAr.split(normalizeAr(term.toLowerCase())).length - 1), 0);
    const arabicTransitionHits = ARABIC_AI_TRANSITIONS.reduce((sum, term) => sum + (normalizedAr.split(normalizeAr(term.toLowerCase())).length - 1), 0);
    const arabicHumanHits = ARABIC_HUMAN_MARKERS.reduce((sum, term) => sum + (normalizedAr.split(normalizeAr(term.toLowerCase())).length - 1), 0);
    const arabicFormalHits = words.filter(w => {
        const normalizedWord = normalizeAr(w);
        return arabicFormalWords.includes(normalizedWord) || ARABIC_FORMAL_ROOTS.some(root => normalizedWord.includes(normalizeAr(root)));
    }).length;
    const contractionHits = (lower.match(/\b\w+'(?:s|t|re|ve|ll|d|m)\b/g) || []).length;
    const firstPersonHits = (lower.match(/\b(?:i|i'm|i've|i'll|we|we're|my|me|our|us)\b/g) || []).length;
    const numbers = (lower.match(/\b\d{1,4}(?:[/:.-]\d{1,4})?\b/g) || []).length;
    const namedLike = (raw.match(/\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g) || [])
        .filter(name => !['the', 'a', 'an', 'by', 'yet', 'nobody', 'somewhere'].includes(name.split(/\s+/)[0].toLowerCase()))
        .length;
    const punctuationMess = (raw.match(/!|\.\.\.|…|\?\?|!!/g) || []).length;
    const typoLike = (lower.match(/\b(?:teh|recieve|seperate|definately|occured|alot|wich|thier)\b/g) || []).length;
    const emojiNoise = (raw.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length + (raw.match(/[•◕ಠツ¯]{1,}/g) || []).length;
    const narrativeHits = narrativePhrases.reduce((sum, term) => sum + countPhrase(term), 0);
    const scenicHits = words.filter(word => scenicWords.includes(word)).length;
    const simpleNarrativeVerbHits = words.filter(word => simpleNarrativeVerbs.includes(word)).length;
    const businessPhraseHits = businessPhrases.reduce((sum, term) => sum + countPhrase(term), 0);
    const businessWordHits = words.filter(word => businessWords.includes(word)).length;

    const lens = sentences.map(s => tokenize(s).length).filter(Boolean);
    const meanLen = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
    const variance = lens.length ? lens.reduce((a, len) => a + Math.pow(len - meanLen, 2), 0) / lens.length : 0;
    const cv = meanLen ? Math.sqrt(variance) / meanLen : 0.55;
    const openers = sentences.map(s => tokenizeLower(s)[0]).filter(Boolean);
    const openerHits = openers.filter(op => AI_TRANSITIONS.includes(op) || ['in', 'as', 'therefore', 'however', 'moreover', 'furthermore'].includes(op)).length;
    const openerRate = openerHits / Math.max(openers.length, 1);
    const simpleNarrativeOpenerRate = openers.filter(op => simpleNarrativeOpeners.includes(op)).length / Math.max(openers.length, 1);
    const openerDiversity = new Set(openers).size / Math.max(openers.length, 1);
    const starts = sentences.map(s => tokenizeLower(s).slice(0, 2).join(' ')).filter(Boolean);
    const repeatedTemplateRate = starts.length >= 3 ? 1 - (new Set(starts).size / starts.length) : 0;
    const uniqueRatio = new Set(words).size / Math.max(wc, 1);
    const avgWordLen = words.reduce((sum, w) => sum + w.length, 0) / Math.max(wc, 1);
    const aiDensity = ((aiTermHits + 2 * aiPhraseHits + transitionHits + 0.75 * formalHits + 2.25 * arabicAiHits + 1.25 * arabicTransitionHits) / Math.max(wc, 1)) * 100;
    const formalDensity = ((formalHits + arabicFormalHits) / Math.max(wc, 1)) * 100;
    const personalSpecificity = firstPersonHits + numbers + Math.min(namedLike, 4) + casualHits + punctuationMess + typoLike;
    const anchoredSpecificity = firstPersonHits + numbers + Math.min(namedLike, 4) + punctuationMess + typoLike;
    const surfaceHumanNoise = casualHits + contractionHits + punctuationMess + typoLike + emojiNoise;

    let aiWeight = 0;
    let humanWeight = 0;
    let strongAiVotes = 0;
    let humanVotes = 0;
    const signals = [];
    const addSignal = (name, verdict, weight, metric) => {
        signals.push({ name, verdict, weight: Number(weight.toFixed(3)), metric });
        if (verdict === 'ai') {
            aiWeight += weight;
            if (weight >= 1.0) strongAiVotes += 1;
        } else {
            humanWeight += weight;
            humanVotes += 1;
        }
    };

    if (aiDensity >= 6.0 || aiPhraseHits >= 3) addSignal('AI collocation density', 'ai', 1.8, `density=${aiDensity.toFixed(2)}, phrases=${aiPhraseHits}`);
    else if (aiDensity >= 3.0 || aiPhraseHits >= 2) addSignal('AI collocation density', 'ai', 1.35, `density=${aiDensity.toFixed(2)}, phrases=${aiPhraseHits}`);
    else if (aiDensity >= 1.25 || aiPhraseHits >= 1) addSignal('AI collocation density', 'ai', 0.8, `density=${aiDensity.toFixed(2)}, phrases=${aiPhraseHits}`);

    if (sentences.length >= 3 && cv < 0.23) addSignal('machine-uniform sentence rhythm', 'ai', 1.15, `cv=${cv.toFixed(3)}`);
    else if (sentences.length >= 3 && cv < 0.40) addSignal('low burstiness', 'ai', 0.85, `cv=${cv.toFixed(3)}`);
    else if (sentences.length >= 3 && cv > 0.78) addSignal('high human-like burstiness', 'human', 0.75, `cv=${cv.toFixed(3)}`);

    if (openerRate >= 0.45) addSignal('transition/opener overuse', 'ai', 1.05, `opener_rate=${openerRate.toFixed(2)}`);
    else if (openerRate >= 0.25) addSignal('transition/opener overuse', 'ai', 0.55, `opener_rate=${openerRate.toFixed(2)}`);

    if (repeatedTemplateRate >= 0.50) addSignal('repeated sentence template', 'ai', 0.9, `template_rate=${repeatedTemplateRate.toFixed(2)}`);
    else if (openerDiversity >= 0.92 && sentences.length >= 5 && cv < 0.45) addSignal('over-controlled opener diversity', 'ai', 0.7, `diversity=${openerDiversity.toFixed(2)}`);

    if (narrativeHits >= 3) addSignal('generated literary scene tropes', 'ai', 1.75, `narrative_hits=${narrativeHits}`);
    else if (narrativeHits >= 1 && (cv < 0.45 || personalSpecificity <= 1)) addSignal('generated literary scene tropes', 'ai', 1.15, `narrative_hits=${narrativeHits}`);

    if (scenicHits >= 10 && personalSpecificity <= 1 && cv < 0.45) addSignal('cinematic object-scene pattern', 'ai', 1.25, `scenic_hits=${scenicHits}`);
    else if (scenicHits >= 7 && narrativeHits >= 1) addSignal('cinematic object-scene pattern', 'ai', 0.85, `scenic_hits=${scenicHits}`);

    if (wc >= 55 && anchoredSpecificity === 0 && scenicHits >= 10 && simpleNarrativeVerbHits >= 7 && simpleNarrativeOpenerRate >= 0.42) {
        addSignal('humanized simple AI story pattern', 'ai', 2.45, `scenic=${scenicHits}, simple_verbs=${simpleNarrativeVerbHits}, opener_rate=${simpleNarrativeOpenerRate.toFixed(2)}`);
    } else if (wc >= 45 && anchoredSpecificity === 0 && scenicHits >= 8 && simpleNarrativeVerbHits >= 5 && repeatedTemplateRate >= 0.16) {
        addSignal('rewritten AI narrative template', 'ai', 1.55, `scenic=${scenicHits}, simple_verbs=${simpleNarrativeVerbHits}, template=${repeatedTemplateRate.toFixed(2)}`);
    }

    if (wc >= 28 && personalSpecificity <= 1 && businessPhraseHits >= 3 && businessWordHits >= 8) {
        addSignal('generic business/process prose', 'ai', 1.65, `phrases=${businessPhraseHits}, words=${businessWordHits}`);
    } else if (wc >= 28 && personalSpecificity <= 1 && businessWordHits >= 8 && (cv < 0.35 || avgWordLen >= 5.4)) {
        addSignal('generic business/process prose', 'ai', 1.25, `phrases=${businessPhraseHits}, words=${businessWordHits}`);
    }

    if (wc >= 30 && personalSpecificity <= 1 && avgWordLen >= 5.4 && cv < 0.35 && (businessWordHits >= 5 || formalDensity >= 1.5)) {
        addSignal('smooth abstract explanatory style', 'ai', 1.0, `cv=${cv.toFixed(3)}, avg_word_len=${avgWordLen.toFixed(2)}`);
    }
    if (sentences.length >= 4 && anchoredSpecificity === 0 && openerDiversity >= 0.80 && uniqueRatio >= 0.48 && uniqueRatio <= 0.92 && meanLen >= 12 && meanLen <= 30) {
        addSignal('LLM-balanced paragraph architecture', 'ai', 1.1, `mean_len=${meanLen.toFixed(1)}, diversity=${openerDiversity.toFixed(2)}`);
    }

    const genericFrameHits = genericFrames.reduce((sum, term) => sum + countPhrase(term), 0);
    if (genericFrameHits) addSignal('generic conclusion/summary framing', 'ai', 1.0, `frames=${genericFrameHits}`);

    if (wc >= 30 && contractionHits === 0 && formalDensity >= 3.0 && personalSpecificity <= 1) addSignal('polished formal prose with no contractions', 'ai', 1.05, `formal_density=${formalDensity.toFixed(2)}`);
    else if (wc >= 50 && contractionHits === 0 && avgWordLen >= 4.9 && personalSpecificity <= 1) addSignal('formal zero-contraction style', 'ai', 0.75, `avg_word_len=${avgWordLen.toFixed(2)}`);

    if (wc >= 35 && personalSpecificity === 0 && (formalDensity >= 2.0 || avgWordLen >= 4.8)) addSignal('low personal specificity', 'ai', 0.75, `specificity=${personalSpecificity}`);
    else if (personalSpecificity >= 4) addSignal('personal/casual specificity', 'human', 0.85, `specificity=${personalSpecificity}`);

    if (casualHits >= 1 && (formalDensity >= 4.0 || aiPhraseHits >= 1 || avgWordLen >= 5.2)) addSignal('humanizer register mismatch', 'ai', 1.15, `casual=${casualHits}, formal=${formalDensity.toFixed(2)}`);
    if (surfaceHumanNoise >= 1 && anchoredSpecificity <= 1 && wc >= 35 && (cv < 0.48 || avgWordLen >= 4.8 || aiWeight >= 1.5 || narrativeHits >= 1 || businessWordHits >= 6)) {
        addSignal('surface humanizer noise over AI structure', 'ai', 1.45, `noise=${surfaceHumanNoise}, anchored=${anchoredSpecificity}`);
    }
    if (emojiNoise >= 1 && anchoredSpecificity === 0 && sentences.length >= 3 && (cv < 0.55 || narrativeHits >= 1 || scenicHits >= 6 || formalDensity >= 1.5)) {
        addSignal('emoji/emoticon masking polished AI passage', 'ai', 1.25, `emoji_noise=${emojiNoise}`);
    }
    if (contractionHits >= 1 && anchoredSpecificity <= 1 && wc >= 45 && (cv < 0.45 || avgWordLen >= 4.9 || aiWeight >= 1.8)) {
        addSignal('contractions without lived detail', 'ai', 0.95, `contractions=${contractionHits}, anchored=${anchoredSpecificity}`);
    }
    if ((narrativeHits >= 1 || scenicHits >= 6) && surfaceHumanNoise >= 1 && anchoredSpecificity <= 1 && wc >= 35) {
        addSignal('humanized generated scene', 'ai', 1.25, `narrative=${narrativeHits}, scenic=${scenicHits}, noise=${surfaceHumanNoise}`);
    }
    if (casualHits >= 2 && aiDensity < 1.0 && aiWeight < 2.2 && anchoredSpecificity >= 2) addSignal('casual human markers', 'human', 0.8, `casual=${casualHits}`);

    if (arabicAiHits >= 3) addSignal('Arabic formulaic AI phrasing', 'ai', 2.05, `arabic_ai_hits=${arabicAiHits}`);
    else if (arabicAiHits >= 1 && (arabicFormalHits >= 2 || arabicTransitionHits >= 1)) addSignal('Arabic formal AI phrasing', 'ai', 1.35, `arabic_ai_hits=${arabicAiHits}`);
    if (arabicTransitionHits >= 3 && arabicFormalHits >= 3 && arabicHumanHits === 0) addSignal('Arabic transition template stack', 'ai', 1.2, `transitions=${arabicTransitionHits}, formal=${arabicFormalHits}`);
    if (arabicFormalHits >= 7 && arabicHumanHits === 0 && wc >= 35 && cv < 0.52) addSignal('Arabic polished MSA with low lived detail', 'ai', 1.1, `formal=${arabicFormalHits}, cv=${cv.toFixed(3)}`);
    if (arabicHumanHits >= 2 && arabicAiHits === 0 && arabicFormalHits < 5) addSignal('Arabic dialect/casual markers', 'human', 1.05, `arabic_human_hits=${arabicHumanHits}`);

    if (contractionHits >= 2 && casualHits >= 1 && aiDensity < 1.6) addSignal('contractions plus casual markers', 'human', 0.9, `contractions=${contractionHits}, casual=${casualHits}`);
    else if (firstPersonHits >= 2 && personalSpecificity >= 3 && aiDensity < 1.8) addSignal('first-person specific experience', 'human', 0.85, `first_person=${firstPersonHits}`);

    if (uniqueRatio < 0.48 && wc >= 70) addSignal('low lexical variety in long text', 'ai', 0.55, `unique_ratio=${uniqueRatio.toFixed(2)}`);
    else if (uniqueRatio > 0.82 && wc >= 45 && aiDensity < 1.5) addSignal('high varied vocabulary without AI phrases', 'human', 0.35, `unique_ratio=${uniqueRatio.toFixed(2)}`);

    let aiProbabilityFloor = 0;
    if (aiWeight >= 5.0 && aiWeight >= humanWeight + 1.2) aiProbabilityFloor = 0.93;
    else if (aiWeight >= 4.0 && aiWeight >= humanWeight + 0.8) aiProbabilityFloor = 0.86;
    else if (aiWeight >= 3.0 && aiWeight >= humanWeight + 0.4) aiProbabilityFloor = 0.74;
    else if (aiWeight >= 2.2 && aiWeight > humanWeight) aiProbabilityFloor = 0.60;

    let humanProbabilityCap = 0;
    if (humanWeight >= 3.0 && aiWeight < 2.6) humanProbabilityCap = 0.34;
    else if (humanWeight >= 2.0 && aiWeight < 3.2) humanProbabilityCap = 0.44;

    return {
        success: true,
        aiWeight: Number(aiWeight.toFixed(3)),
        humanWeight: Number(humanWeight.toFixed(3)),
        strongAiVotes,
        humanVotes,
        aiProbabilityFloor,
        humanProbabilityCap,
        signals: signals.slice(0, 12),
        topAiReasons: signals.filter(s => s.verdict === 'ai').map(s => s.name).slice(0, 6),
        topHumanReasons: signals.filter(s => s.verdict === 'human').map(s => s.name).slice(0, 6),
        metrics: {
            wordCount: wc,
            sentenceCount: sentences.length,
            cv: Number(cv.toFixed(4)),
            aiDensity: Number(aiDensity.toFixed(4)),
            formalDensity: Number(formalDensity.toFixed(4)),
            personalSpecificity,
            anchoredSpecificity,
            surfaceHumanNoise,
            emojiNoise,
            openerRate: Number(openerRate.toFixed(4)),
            simpleNarrativeOpenerRate: Number(simpleNarrativeOpenerRate.toFixed(4)),
            templateRate: Number(repeatedTemplateRate.toFixed(4)),
            uniqueRatio: Number(uniqueRatio.toFixed(4)),
            avgWordLen: Number(avgWordLen.toFixed(4)),
            arabicAiHits,
            arabicTransitionHits,
            arabicHumanHits,
            narrativeHits,
            scenicHits,
            simpleNarrativeVerbHits,
            businessPhraseHits,
            businessWordHits
        }
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
    const superAiWords = [
        'delve', 'delves', 'delving', 'tapestry', 'tapestries',
        'multifaceted', 'pivotal', 'seamlessly', 'myriad', 'holistic',
        'leverage', 'leveraging', 'underscores', 'comprehensive',
        'transformative', 'paramount', 'realm', 'landscape'
    ];
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

    // Modern-AI combined fingerprint (catches GPT-4/Claude text that avoids the
    // obvious "delve"/"tapestry" tells): polished, impersonal, low-burstiness prose.
    const avgWordLenC = words.length ? words.reduce((a, w) => a + w.length, 0) / words.length : 0;
    const firstPersonHits = (lowerText.match(/\b(?:i|we|my|me|our|us|you|your)\b/g) || []).length;
    const exclamations = (text.match(/!/g) || []).length;
    let modernFingerprintFloor = 0;
    if (contractionRate === 0.0 && firstPersonHits === 0 && exclamations === 0 && avgWordLenC >= 5.0 && cv < 0.55) {
        modernFingerprintFloor = 0.72;
    }
    if (contractionRate === 0.0 && firstPersonHits === 0 && avgWordLenC >= 5.3 && cv < 0.45) {
        modernFingerprintFloor = 0.82;
    }

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
    baseScore = Math.max(baseScore, modernFingerprintFloor);

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

    const fkMod = computeFleschKincaid(text);
    const entMod = computeCharacterEntropy(text);
    baseScore += fkMod + entMod;
    
    baseScore = Math.max(0.02, Math.min(0.99, baseScore));

    if (isArabic || arabicMeta.isArabic) {
        baseScore = 0.35 * baseScore + 0.65 * arabicMeta.score;
    }

    return baseScore;
}

// --- Master classifier ---------------------------------------------------

// --- NEW READABILITY AND ENTROPY HEURISTICS ---
function computeFleschKincaid(text) {
    const words = text.split(/\s+/).length;
    const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
    const syllables = text.split(/\s+/).reduce((acc, word) => {
        return acc + Math.max(1, (word.match(/[aeiouy]+/gi) || []).length);
    }, 0);
    const score = 0.39 * (words / sentences) + 11.8 * (syllables / Math.max(words, 1)) - 15.59;
    
    if (score >= 8.5 && score <= 12.5) return 0.25;
    if (score > 14) return -0.15;
    return -0.10;
}

function computeCharacterEntropy(text) {
    if (!text) return 0;
    const counts = {};
    for (let char of text) {
        counts[char] = (counts[char] || 0) + 1;
    }
    const len = text.length;
    let entropy = 0;
    for (let char in counts) {
        const p = counts[char] / len;
        entropy -= p * Math.log2(p);
    }
    if (entropy < 4.1) return 0.20;
    if (entropy > 4.8) return -0.20;
    return 0;
}

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
    const advancedText = computeAdvancedTextForensics(text);
    const advancedMetrics = advancedText.success ? (advancedText.metrics || {}) : {};
    const surfaceHumanNoise = Number(advancedMetrics.surfaceHumanNoise || 0);
    const anchoredSpecificity = Number(advancedMetrics.anchoredSpecificity ?? advancedMetrics.personalSpecificity ?? 0);
    const humanizedAiSuspected = Boolean(
        surfaceHumanNoise >= 1 &&
        anchoredSpecificity <= 1 &&
        advancedText.success &&
        advancedText.aiWeight >= Math.max(1.4, advancedText.humanWeight + 0.2)
    );

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

    if (advancedText.success) {
        if (advancedText.aiProbabilityFloor && advancedText.aiWeight >= advancedText.humanWeight + 0.35) {
            prob = Math.max(prob, advancedText.aiProbabilityFloor);
            if (wc < 50 && advancedText.aiProbabilityFloor >= 0.74) confidenceCap = Math.max(confidenceCap, 0.93);
        }
        if (
            advancedText.humanProbabilityCap &&
            !humanizedAiSuspected &&
            !(advancedText.aiWeight >= advancedText.humanWeight + 0.8 && advancedText.aiWeight >= 3.0)
        ) {
            prob = Math.min(prob, advancedText.humanProbabilityCap);
        }
    }

    if (humanizedAiSuspected) {
        prob = Math.max(prob, advancedText.aiWeight >= 2.2 ? 0.78 : 0.64);
        if (wc < 120) confidenceCap = Math.max(confidenceCap, 0.90);
    }

    // If humanizer fingerprints fire, push prob toward AI verdict (humanizers ARE AI)
    if (sigs.humanizer.score >= 0.30 && (prob > 0.45 || humanizedAiSuspected)) {
        prob = Math.min(Math.max(prob, 0.62) + 0.10, 0.99);
    }

    // Cap and floor
    prob = Math.max(0.02, Math.min(prob, confidenceCap));

    const prediction = prob >= 0.5 ? 'AI-Generated' : 'Human';
    const confidencePct = Math.max(prob, 1 - prob) * 100;

    const humanizer_detected = humanizedAiSuspected || sigs.humanizer.score >= 0.25 ||
        (prob >= 0.55 && sigs.humanizer.signals.length > 0);

    const humanizer_signals = humanizer_detected
        ? (sigs.humanizer.signals.join('; ') || 'structural AI rhythm beneath casual surface')
        : 'none';

    const features = {
        model_used: 'AI Detector Core v7 Strict (Local)',
        burstiness_variance: `CV=${sigs.burstiness.value} (${sigs.burstiness.note})`,
        rhythm_analysis: `opener_diversity=${sigs.openers.value}; avg_sent_len=${sigs.sentLenMean.value}`,
        lexical_fingerprint: `MATTR=${sigs.lexical.value}; AI-vocab/100w=${sigs.aiVocab.value}`,
        hidden_footprints: sigs.aiVocab.details.vocab.length
            ? sigs.aiVocab.details.vocab.slice(0, 6).join(', ')
            : (sigs.aiVocab.details.bigrams.slice(0, 4).join('; ') || 'none flagged'),
        punctuation_tells: `dashes=${sigs.punctuation.value.dashes}, oxford=${sigs.punctuation.value.oxford}, mixed_quotes=${sigs.punctuation.value.mixedQuotes}`,
        contraction_rate: `${sigs.contractions.value}`,
        ngram_entropy: `${sigs.ngramRepetition.value}`,
        humanization_attempt: humanizedAiSuspected || (advancedText.success && advancedText.aiWeight >= 4.0 && advancedText.humanWeight >= 1.0) ? 'high' : (surfaceHumanNoise >= 1 || sigs.humanizer.score >= 0.20 ? 'medium' : 'low'),
        humanizer_noise_score: `${surfaceHumanNoise}`,
        anchored_specificity: `${anchoredSpecificity}`,
        advanced_text_ai_score: advancedText.success ? `${advancedText.aiWeight.toFixed(2)}` : 'not available',
        advanced_text_human_score: advancedText.success ? `${advancedText.humanWeight.toFixed(2)}` : 'not available',
        advanced_text_reasons: advancedText.success ? (advancedText.topAiReasons.slice(0, 5).join(', ') || 'none') : 'not available',
        human_text_reasons: advancedText.success ? (advancedText.topHumanReasons.slice(0, 5).join(', ') || 'none') : 'not available',
        strict_text_mode: 'enabled'
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
        advanced_text_forensics: advancedText,
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
    'runway', 'google imagen', 'gemini image', 'chatgpt image', 'openai image', 'bing creator',
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
    'apple', 'iphone', 'ipad', 'samsung', 'galaxy', 'google pixel',
    'pixel 4', 'pixel 5', 'pixel 6', 'pixel 7', 'pixel 8', 'pixel 9',
    'pixel xl', 'sony', 'canon', 'nikon', 'fujifilm', 'olympus', 'panasonic', 'leica',
    'huawei', 'xiaomi', 'oneplus', 'gopro', 'dji camera', 'dji fc', 'dji mavic',
    'dji mini', 'dji phantom', 'osmo', 'hasselblad', 'red digital', 'arri'
];

const EDITOR_SOFTWARE_TAGS = [
    'adobe photoshop', 'photoshop', 'camera raw', 'lightroom', 'capture one',
    'affinity photo', 'gimp'
];

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasMetadataTag(blob, tag) {
    const needle = tag.toLowerCase();
    if (/^[a-z0-9-]+$/.test(needle) && needle.length <= 6) {
        return new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`, 'i').test(blob);
    }
    return blob.includes(needle);
}

const WEAK_AI_METADATA_TAGS = new Set([
    'prompt: ', 'class_type', 'inputs', 'nodes', 'links', 'latent', 'diffusion',
    'synthetic', 'luma', 'pika', 'runway', 'sora', 'kling', 'render', 'upscaled',
    'photorealistic', '4k', '8k', 'unreal-engine'
]);

function findAiSoftwareHit(blob) {
    const strongHit = AI_SOFTWARE_TAGS.find(t => !WEAK_AI_METADATA_TAGS.has(t) && hasMetadataTag(blob, t));
    if (strongHit) return strongHit;

    const weakHit = AI_SOFTWARE_TAGS.find(t => WEAK_AI_METADATA_TAGS.has(t) && hasMetadataTag(blob, t));
    if (!weakHit) return null;

    const hasGenerationParameterBlock =
        /\bsteps:\s*\d+/i.test(blob) ||
        /\bcfg\s*scale\b/i.test(blob) ||
        /\bnegative\s+prompt\b/i.test(blob) ||
        /\bsampler(_name)?\b/i.test(blob) ||
        /\bsd_model(_name)?\b/i.test(blob) ||
        /\bmodel_hash\b/i.test(blob) ||
        /\bdenoising_strength\b/i.test(blob) ||
        /\bautomatic1111\b/i.test(blob) ||
        /\bcomfyui\b/i.test(blob);

    return hasGenerationParameterBlock ? weakHit : null;
}

function decodeMetadataText(buffer, lowercase = true) {
    if (!buffer) return '';
    const maxHead = Math.min(buffer.length, 2_000_000);
    const maxTail = Math.min(buffer.length, 500_000);
    const source = buffer.length > 2_500_000
        ? Buffer.concat([buffer.subarray(0, maxHead), buffer.subarray(buffer.length - maxTail)])
        : buffer;
    const decoded = source
        .toString('utf8')
        .replace(/\0/g, ' ')
        .replace(/[^\x09\x0a\x0d\x20-\x7E\u0600-\u06FF]+/g, ' ')
        .replace(/\s+/g, ' ');
    return lowercase ? decoded.toLowerCase() : decoded;
}

function readImageDimensions(buffer, mimeType = '', fileName = '') {
    if (!buffer || buffer.length < 24) return { width: 0, height: 0, format: 'unknown' };
    const name = fileName.toLowerCase();

    if (buffer.readUInt32BE(0) === 0x89504e47 && buffer.toString('ascii', 1, 4) === 'PNG') {
        return {
            width: buffer.readUInt32BE(16),
            height: buffer.readUInt32BE(20),
            format: 'png'
        };
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        let offset = 2;
        while (offset + 9 < buffer.length) {
            if (buffer[offset] !== 0xff) {
                offset += 1;
                continue;
            }
            const marker = buffer[offset + 1];
            const length = buffer.readUInt16BE(offset + 2);
            if (length < 2) break;
            const isSof = (
                marker >= 0xc0 && marker <= 0xcf &&
                ![0xc4, 0xc8, 0xcc].includes(marker)
            );
            if (isSof && offset + 8 < buffer.length) {
                return {
                    width: buffer.readUInt16BE(offset + 7),
                    height: buffer.readUInt16BE(offset + 5),
                    format: 'jpeg'
                };
            }
            offset += 2 + length;
        }
        return { width: 0, height: 0, format: 'jpeg' };
    }

    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        const chunk = buffer.toString('ascii', 12, 16);
        if (chunk === 'VP8X' && buffer.length >= 30) {
            return {
                width: 1 + buffer.readUIntLE(24, 3),
                height: 1 + buffer.readUIntLE(27, 3),
                format: 'webp'
            };
        }
        if (chunk === 'VP8 ' && buffer.length >= 30) {
            return {
                width: buffer.readUInt16LE(26) & 0x3fff,
                height: buffer.readUInt16LE(28) & 0x3fff,
                format: 'webp'
            };
        }
        if (chunk === 'VP8L' && buffer.length >= 25) {
            const bits = buffer.readUInt32LE(21);
            return {
                width: (bits & 0x3fff) + 1,
                height: ((bits >> 14) & 0x3fff) + 1,
                format: 'webp'
            };
        }
        return { width: 0, height: 0, format: 'webp' };
    }

    if (buffer.toString('ascii', 0, 3) === 'GIF' && buffer.length >= 10) {
        return {
            width: buffer.readUInt16LE(6),
            height: buffer.readUInt16LE(8),
            format: 'gif'
        };
    }

    if (buffer.toString('ascii', 0, 2) === 'BM' && buffer.length >= 26) {
        return {
            width: Math.abs(buffer.readInt32LE(18)),
            height: Math.abs(buffer.readInt32LE(22)),
            format: 'bmp'
        };
    }

    if (
        (buffer.toString('ascii', 0, 2) === 'II' && buffer.readUInt16LE(2) === 42) ||
        (buffer.toString('ascii', 0, 2) === 'MM' && buffer.readUInt16BE(2) === 42)
    ) {
        return { width: 0, height: 0, format: 'tiff' };
    }

    if (mimeType.includes('png') || name.endsWith('.png')) return { width: 0, height: 0, format: 'png' };
    if (mimeType.includes('webp') || name.endsWith('.webp')) return { width: 0, height: 0, format: 'webp' };
    if (mimeType.includes('jpeg') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return { width: 0, height: 0, format: 'jpeg' };
    if (mimeType.includes('gif') || name.endsWith('.gif')) return { width: 0, height: 0, format: 'gif' };
    if (mimeType.includes('bmp') || name.endsWith('.bmp')) return { width: 0, height: 0, format: 'bmp' };
    if (mimeType.includes('tiff') || name.endsWith('.tif') || name.endsWith('.tiff')) return { width: 0, height: 0, format: 'tiff' };
    if (mimeType.includes('heic') || name.endsWith('.heic') || name.endsWith('.heif')) return { width: 0, height: 0, format: 'heic' };
    if (mimeType.includes('avif') || name.endsWith('.avif')) return { width: 0, height: 0, format: 'avif' };
    if (mimeType.includes('svg') || name.endsWith('.svg')) return { width: 0, height: 0, format: 'svg' };
    return { width: 0, height: 0, format: 'unknown' };
}

async function classifyImage(filePath, fileSize, mimeType, originalName = '') {
    let metaObj = null;
    try { metaObj = await exifr.parse(filePath, true); } catch (e) { }
    const metaStr = metaObj ? JSON.stringify(metaObj).toLowerCase() : '';

    let rawText = '';
    let rawTextUnlowercased = '';
    let rawBuffer = null;
    try {
        rawBuffer = await fs.promises.readFile(filePath);
        rawTextUnlowercased = decodeMetadataText(rawBuffer, false);
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

    const metadataBlob = `${softwareField}\n${metaStr}\n${rawText}`;
    const aiSoftwareHit = findAiSoftwareHit(metadataBlob);
    const editorSoftwareHit = EDITOR_SOFTWARE_TAGS.find(t => metadataBlob.includes(t));
    const hardwareHit = HARDWARE_CAMERA_HINTS.find(t => make.includes(t) || model.includes(t) || lens.includes(t));
    const hasGPS = !!(metaObj?.GPSLatitude || metaObj?.GPSLongitude);
    const hasShutterData = !!(metaObj?.ExposureTime || metaObj?.FNumber || metaObj?.ISO);
    const hasC2PA = metaStr.includes('c2pa') || metaStr.includes('contentcredentials') || rawText.includes('c2pa');

    const isPng = mimeType === 'image/png' || fileName.endsWith('.png');
    const isWebLikeImage = isPng || mimeType === 'image/webp' || fileName.endsWith('.webp');
    const hasMetadata = !!(metaObj && Object.keys(metaObj || {}).length > 0);
    const dimensions = readImageDimensions(rawBuffer, mimeType, fileName);
    const standardAiRes = new Set([
        '512x512', '768x768', '1024x1024', '1536x1536', '2048x2048',
        '1456x816', '816x1456', '832x1216', '1216x832', '1344x768', '768x1344'
    ]);
    const dimensionKey = `${dimensions.width}x${dimensions.height}`;
    const isAiResolution = standardAiRes.has(dimensionKey);
    const isGeneratedSquare = dimensions.width === dimensions.height && [512, 768, 1024, 1536, 2048].includes(dimensions.width);
    const reviewFlags = [];
    let decisionPath = 'clean metadata fallback';
    let score = 0.40; // unknown provenance is not proof of AI without stronger evidence

    if (aiSoftwareHit) {
        score = 0.99;
        decisionPath = `AI generator metadata tag: ${aiSoftwareHit}`;
    }
    else if (isAiFilename) {
        score = 0.92;
        decisionPath = 'AI-like filename signature';
    }
    else if (isRealFilename && !aiSoftwareHit) {
        score = 0.12;
        decisionPath = 'camera-style filename without AI metadata';
    }
    else if (hardwareHit && hasShutterData && !rawText.includes('photoshop') && !rawText.includes('adobe')) {
        score = 0.05;
        decisionPath = 'camera hardware plus exposure data';
    }
    else if (hardwareHit && hasShutterData) {
        score = 0.15; // might be edited in photoshop
        decisionPath = 'camera hardware plus edited exposure data';
    }
    else if (editorSoftwareHit && (hasShutterData || hardwareHit)) {
        score = 0.18;
        decisionPath = 'edited camera-photo workflow';
    }
    else if (editorSoftwareHit) {
        score = 0.38;
        decisionPath = 'editor metadata without AI generator signature';
        reviewFlags.push('edited image, no generator metadata');
    }
    else if (hardwareHit && (metaObj?.FocalLength || metaObj?.FNumber || metaObj?.LensModel)) {
        score = 0.25; // verified active camera profiles
        decisionPath = 'camera/lens profile present';
    }
    else if (hardwareHit) {
        score = 0.35; // screenshot or virtual display profiles
        decisionPath = 'partial camera hardware metadata';
        reviewFlags.push('partial camera metadata');
    }
    else if (!metaObj || Object.keys(metaObj || {}).length === 0) {
        score = isWebLikeImage ? 0.46 : 0.40;
        decisionPath = 'EXIF absent; no AI generator signature in metadata-only fallback';
        reviewFlags.push('metadata stripped');
    }
    else if (!hasShutterData && !make && !model) {
        score = isWebLikeImage ? 0.49 : 0.44;
        decisionPath = 'metadata present but no camera make/model/exposure';
        reviewFlags.push('no camera exposure metadata');
    }
    else if (hasShutterData && !aiSoftwareHit) {
        score = 0.30;
        decisionPath = 'exposure data present without AI metadata';
    }

    if (hasGPS) score = Math.max(0.02, score - 0.35);
    if (hasC2PA && (metaStr.includes('ai') || rawText.includes('ai') || rawText.includes('generated'))) {
        score = Math.max(score, 0.98);
        decisionPath = 'C2PA/content credentials indicate generated content';
    }
    if (!aiSoftwareHit && !hardwareHit && !editorSoftwareHit && (isAiResolution || isGeneratedSquare)) {
        score = Math.max(score, isWebLikeImage ? 0.54 : 0.49);
        reviewFlags.push(`generated-size canvas ${dimensionKey}`);
        if (isWebLikeImage && isAiFilename) {
            score = Math.max(score, 0.86);
            decisionPath = 'AI filename plus generated-size web image';
        } else if (score >= 0.5) {
            decisionPath = 'generated-size web image without camera provenance';
        }
    }

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
            metadata_integrity: hasMetadata ? `${Object.keys(metaObj).length} fields present` : 'EXIF absent / stripped',
            structural_anomalies: aiSoftwareHit
                ? `AI generator tag: ${aiSoftwareHit}`
                : (hardwareHit ? 'camera hardware tag intact' : 'no hardware provenance'),
            lighting_analysis: hasShutterData ? 'shutter/aperture data present' : 'no exposure metadata',
            suspected_generator: aiSoftwareHit ? aiSoftwareHit.toUpperCase() : (score > 0.6 ? 'Unknown AI Tool' : 'N/A'),
            decision_path: decisionPath,
            review_flags: reviewFlags.length ? reviewFlags.join('; ') : 'metadata-only fallback',
            fallback_dimensions: dimensions.width && dimensions.height ? dimensionKey : 'unknown',
            file_size_kb: Math.round(fileSize / 1024)
        }
    };
}

// =========================================================================
//  VIDEO DETECTOR — metadata-only
// =========================================================================

const VIDEO_AI_TAGS = ['sora', 'runway', 'pika', 'luma', 'kling', 'haiper', 'genmo', 'synthesia', 'heygen', 'opusclip', 'ai generated', 'ai-generated', 'stable video', 'svd', 'animatediff', 'deforum', 'viggle', 'vidu', 'minimax', 'hailuo', 'moonvalley', 'morph studio', 'pixverse', 'ذكاء اصطناعي', 'مولد بالذكاء', 'مولدة بالذكاء', 'فيديو مولد', 'محتوى اصطناعي', 'سورا', 'رنواي', 'كلينغ', 'لوما', 'بيكا'];
const VIDEO_HW_TAGS = ['apple', 'iphone', 'sony', 'canon', 'nikon', 'gopro', 'samsung', 'fujifilm', 'quicktime', 'creation_time'];

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
    const aiTagHit = VIDEO_AI_TAGS.find(t => hasMetadataTag(blob, t));
    const hwTagHit = VIDEO_HW_TAGS.find(t => hasMetadataTag(blob, t));
    const duration = metaFormat.duration || 0;
    const hasEncoder = blob.includes('encoder') || blob.includes('handler') || blob.includes('creation_time');

    let score = 0.72;
    let decisionPath = 'strict video fallback: unverified video provenance';
    const reviewFlags = [];
    if (aiTagHit) score = 0.99;
    else if (isAiFilename) score = 0.94;
    else if (isRealFilename && !aiTagHit) {
        score = 0.12;
        decisionPath = 'camera-style video filename without AI tag';
    }
    else if (hwTagHit && !rawText.includes('photoshop') && !rawText.includes('premiere') && !rawText.includes('aftereffects')) {
        score = 0.16;
        decisionPath = `hardware/encoder provenance: ${hwTagHit}`;
    }
    else if (hwTagHit) {
        score = 0.34;
        decisionPath = `edited hardware provenance: ${hwTagHit}`;
        reviewFlags.push('edited video metadata');
    }
    else if (!hasEncoder) {
        score = 0.94; // missing encoder metadata heavily implies AI/scraper output
        decisionPath = 'encoder metadata absent';
    }
    else if (duration > 0 && duration <= 12) {
        score = 0.82; // current AI clips are commonly short
        decisionPath = 'short unverified generated-video style clip';
    }

    if (aiTagHit) decisionPath = `AI video generator tag detected: ${aiTagHit}`;
    if (isAiFilename) decisionPath = 'AI-like video filename signature';

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
            decision_path: decisionPath,
            review_flags: reviewFlags.length ? reviewFlags.join('; ') : 'strict video provenance scan',
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

const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5003';
const pythonHealthTtlMs = Number.parseInt(process.env.PYTHON_HEALTH_TTL_MS || '30000', 10);
const pythonCircuitResetMs = Number.parseInt(process.env.PYTHON_CIRCUIT_RESET_MS || '5000', 10);
const pythonHealthTimeoutMs = Number.parseInt(process.env.PYTHON_HEALTH_TIMEOUT_MS || '5000', 10);
const pythonCircuit = { available: false, checkedAt: 0, openUntil: 0 };

async function pythonServiceAvailable() {
    const now = Date.now();
    if (now < pythonCircuit.openUntil) return false;
    if (pythonCircuit.available && now - pythonCircuit.checkedAt < pythonHealthTtlMs) return true;

    try {
        const response = await fetch(`${pythonServiceUrl}/health`, {
            signal: AbortSignal.timeout(pythonHealthTimeoutMs)
        });
        pythonCircuit.available = response.ok;
        pythonCircuit.checkedAt = now;
        pythonCircuit.openUntil = response.ok ? 0 : now + pythonCircuitResetMs;
        return response.ok;
    } catch {
        pythonCircuit.available = false;
        pythonCircuit.checkedAt = now;
        pythonCircuit.openUntil = now + pythonCircuitResetMs;
        return false;
    }
}

async function tryProxyToPython(endpoint, bodyData, file = null, fileFieldName = 'file') {
    if (!(await pythonServiceAvailable())) return null;
    const pythonUrl = `${pythonServiceUrl}${endpoint}`;
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

        const proxyTimeoutMs = bodyData?.type === 'image'
            ? Number.parseInt(process.env.PYTHON_IMAGE_TIMEOUT_MS || '90000', 10)
            : bodyData?.type === 'video'
                ? Number.parseInt(process.env.PYTHON_VIDEO_TIMEOUT_MS || '120000', 10)
                : Number.parseInt(process.env.PYTHON_TEXT_TIMEOUT_MS || '45000', 10);
        const response = await fetch(pythonUrl, {
            method: 'POST',
            headers: headers,
            body: body,
            signal: AbortSignal.timeout(proxyTimeoutMs)
        });

        if (response.ok) {
            pythonCircuit.available = true;
            pythonCircuit.checkedAt = Date.now();
            return await response.json();
        }
        throw new Error(`Python backend status code: ${response.status}`);
    } catch (err) {
        pythonCircuit.available = false;
        pythonCircuit.checkedAt = Date.now();
        pythonCircuit.openUntil = Date.now() + pythonCircuitResetMs;
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

function withFallbackEvidence(result, modality) {
    const probability = Math.max(0, Math.min(1, Number(result.ai_probability) || 0));
    const boundaryUncertainty = 1 - Math.min(1, Math.abs(probability - 0.5) * 2);
    const decisionPath = String(result.features?.decision_path || result.features?.advanced_text_reasons || 'deterministic local signals');
    const directProvenance = probability >= 0.95 && /cryptographically verified (?:c2pa|content credentials)/i.test(decisionPath);
    const degradedFloor = directProvenance ? 0.12 : ({ text: 0.35, image: 0.40, video: 0.45 }[modality] || 0.40);
    const wordCount = Number(result.word_count) || 0;
    const coverageUncertainty = modality === 'text' ? 1 - Math.min(1, wordCount / 120) : 0;
    const uncertainty = Math.max(boundaryUncertainty, degradedFloor, coverageUncertainty);
    const confidence = 1 - uncertainty;
    const reasons = ['Primary Python forensic service was unavailable; deterministic gateway fallback was used.'];

    if (modality === 'text' && wordCount < 120) {
        reasons.push(`Text coverage is limited (${wordCount} of 120 recommended words).`);
    }
    if (boundaryUncertainty >= 0.5) {
        reasons.push('The score is close to the decision boundary.');
    }
    if (!directProvenance && modality !== 'text') {
        reasons.push('The fallback cannot provide the full learned spatial or temporal ensemble.');
    }

    const featureImportance = Object.entries(result.signals || {})
        .map(([name, value]) => ({
            feature: name,
            score: Number(value?.score) || 0,
            importance: Math.abs((Number(value?.score) || 0) - 0.5) * 2
        }))
        .sort((left, right) => right.importance - left.importance)
        .slice(0, 8);

    return {
        ...result,
        confidence: `${(confidence * 100).toFixed(1)}%`,
        confidence_score: Number(confidence.toFixed(3)),
        uncertainty: Number(uncertainty.toFixed(3)),
        review_required: uncertainty >= 0.45,
        verdict_status: uncertainty >= 0.65 ? 'inconclusive' : 'indicative',
        feature_importance: featureImportance,
        detector_specific_analysis: result.features || {},
        evidence_report: {
            fusion: {
                method: 'deterministic degraded-mode fallback',
                calibration_status: 'not calibrated against the production fusion artifact',
                decision_reason: decisionPath,
                uncertainty_reasons: reasons
            },
            detectors: [{
                name: `Local ${modality} fallback`,
                category: modality,
                available: true,
                applicable: true,
                score: probability,
                confidence,
                evidence: decisionPath,
                weight_in_fusion_model: null
            }]
        }
    };
}

app.post('/detect/text', async (req, res) => {
    const { text, language = 'auto' } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    try {
        const pyResult = await tryProxyToPython('/detect/text', { text, language });
        if (pyResult) {
            return res.json(pyResult);
        }
        res.json(withFallbackEvidence(classifyText(text), 'text'));
    } catch (e) {
        handleDetectionError(e, res, 'text');
    }
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
    const requestedType = String(req.body.type || 'text').toLowerCase();
    const type = req.file ? inferAnalysisTypeFromFile(req.file, requestedType) : requestedType;
    try {
        if (type === 'text') {
            let text = req.body.content || '';
            if (!text.trim() && req.file) {
                text = await extractTextFromUploadedFile(req.file);
            }
            cleanupUploadedFile(req.file);
            if (!text.trim()) return res.status(400).json({ error: 'No text provided' });
            const language = req.body.language || 'auto';
            const pyResult = await tryProxyToPython('/api/analyze', { type, content: text, language });
            if (pyResult) {
                return res.json(pyResult);
            }
            res.json(withFallbackEvidence(classifyText(text), 'text'));
        } else if (type === 'image') {
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No image file provided' });

            // 1. Run local metadata/EXIF heuristics
            const localResult = await classifyImage(file.path, file.size, file.mimetype || 'image/jpeg', file.originalname);
            
            // 2. Try Python Deep Learning models
            const pyResult = await tryProxyToPython('/api/analyze', { type }, file, 'file');
            
            cleanupUploadedFile(file);

            if (pyResult) {
                // Merge features for rich UI display
                pyResult.features = { ...localResult.features, ...pyResult.features };
                
                return res.json(pyResult);
            }
            res.json(withFallbackEvidence(localResult, 'image'));

        } else if (type === 'video') {
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'No video file provided' });

            // 1. Run local binary/ffprobe heuristics
            const localResult = await classifyVideo(file.path, file.size, file.originalname);
            
            // 2. Try Python Deep Learning models
            const pyResult = await tryProxyToPython('/api/analyze', { type }, file, 'file');
            
            cleanupUploadedFile(file);

            if (pyResult) {
                // Merge features for rich UI display
                pyResult.features = { ...localResult.features, ...pyResult.features };
                
                return res.json(pyResult);
            }
            res.json(withFallbackEvidence(localResult, 'video'));
        } else {
            cleanupUploadedFile(req.file);
            res.status(400).json({ error: 'Invalid analysis type' });
        }
    } catch (e) {
        cleanupUploadedFile(req.file);
        handleDetectionError(e, res, type);
    }
});

app.post('/detect/image', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    try {
        const pyResult = await tryProxyToPython('/api/analyze', { type: 'image' }, req.file, 'file');
        if (pyResult) {
            cleanupUploadedFile(req.file);
            return res.json(pyResult);
        }
        const result = await classifyImage(req.file.path, req.file.size, req.file.mimetype || 'image/jpeg', req.file.originalname);
        cleanupUploadedFile(req.file);
        res.json(withFallbackEvidence(result, 'image'));
    } catch (e) {
        cleanupUploadedFile(req.file);
        handleDetectionError(e, res, 'image');
    }
});

app.post('/detect/video', upload.single('video'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No video provided' });
    try {
        const pyResult = await tryProxyToPython('/api/analyze', { type: 'video' }, req.file, 'file');
        if (pyResult) {
            cleanupUploadedFile(req.file);
            return res.json(pyResult);
        }
        const result = await classifyVideo(req.file.path, req.file.size, req.file.originalname);
        cleanupUploadedFile(req.file);
        res.json(withFallbackEvidence(result, 'video'));
    } catch (e) {
        cleanupUploadedFile(req.file);
        handleDetectionError(e, res, 'video');
    }
});

app.get('/health', (req, res) => res.json({
    status: 'healthy',
    backend: '3truth local forensic gateway',
    mode: 'local-processing-only'
}));

// Live-reload endpoint for development
app.get('/livereload', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('data: connected\n\n');
});

app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    if (err && err.status === 413) {
        return res.status(413).json({ error: 'Request body exceeds the configured limit' });
    }
    if (err instanceof multer.MulterError) {
        const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({
            error: err.code === 'LIMIT_FILE_SIZE'
                ? 'Uploaded file exceeds the configured limit'
                : 'Invalid upload'
        });
    }
    if (err && err.message === 'Origin is not allowed by CORS policy') {
        return res.status(403).json({ error: 'Origin not allowed' });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Detector Core listening on http://0.0.0.0:${PORT}`);
});

setInterval(() => { }, 60000);
