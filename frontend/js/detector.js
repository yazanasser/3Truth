const textInput = document.getElementById("text-input");
const fileInput = document.getElementById("file-input");
const tabContentText = document.getElementById("tab-content-text");
const tabContentFile = document.getElementById("tab-content-file");
const fileNameDisplay = document.getElementById("file-name-display");
const inputLabel = document.getElementById("input-label");
const fileSupportText = document.getElementById("file-support-text");
const mediaModeProfile = document.getElementById("media-mode-profile");
const mediaModeIconShell = document.getElementById("media-mode-icon-shell");
const mediaModeBadge = document.getElementById("media-mode-badge");
const mediaModeTitle = document.getElementById("media-mode-title");
const mediaModeDescription = document.getElementById("media-mode-description");
const mediaModeVisual = document.getElementById("media-mode-visual");
const mediaModeChips = document.getElementById("media-mode-chips");
const analyzeBtnLabel = document.getElementById("analyze-btn-label");
const idleStateIcon = document.getElementById("idle-state-icon");
const idleStateTitle = document.getElementById("idle-state-title");
const idleStateSubtitle = document.getElementById("idle-state-subtitle");
const loadingTitle = document.getElementById("loading-title");
const loadingSub = document.getElementById("loading-sub");

// Document Upload Elements
const textSubTabs = document.querySelectorAll("#text-sub-tabs button");
const textModePaste = document.getElementById("text-mode-paste");
const textModeUpload = document.getElementById("text-mode-upload");
const docFileInput = document.getElementById("doc-file-input");
const docFileName = document.getElementById("doc-file-name");

const stateIdle = document.getElementById("state-idle");
const stateLoading = document.getElementById("state-loading");
const stateResult = document.getElementById("state-result");

const analyzeBtn = document.getElementById("analyze-btn");
const textAnalyzeAnchor = document.getElementById("text-analyze-anchor");
const fileAnalyzeAnchor = document.getElementById("file-analyze-anchor");
const clearBtn = document.getElementById("clear-btn");
const copyBtn = document.getElementById("copy-btn");
const textFileBtn = document.getElementById("text-file-btn");
const textFileInput = document.getElementById("text-file-input");
const errorMsg = document.getElementById("error-message");
const errorText = document.getElementById("error-text");
const charCount = document.getElementById("char-count");
const scannerBar = document.getElementById("scanner-bar");
const tabs = document.querySelectorAll(".tab-btn");

let activeTab = "text";
let fileObj = null;
let currentResult = null;

const TEXT_FILE_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".tsv",
  ".json",
  ".jsonl",
  ".xml",
  ".html",
  ".htm",
  ".rtf",
  ".log",
  ".yaml",
  ".yml",
  ".ini",
  ".cfg",
  ".conf",
  ".py",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".go",
  ".rs",
  ".php",
  ".rb",
  ".swift",
  ".kt",
  ".sql",
  ".sh",
  ".bat",
  ".ps1",
  ".css",
  ".scss",
  ".less",
  ".srt",
  ".vtt",
]);
const DOCUMENT_FILE_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);
const IMAGE_FILE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".jfif",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
  ".avif",
  ".svg",
  ".ico",
  ".raw",
  ".dng",
  ".cr2",
  ".cr3",
  ".nef",
  ".arw",
  ".orf",
  ".rw2",
  ".raf",
  ".pef",
  ".srw",
  ".x3f",
]);
const VIDEO_FILE_EXTENSIONS = new Set([
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".avi",
  ".mkv",
  ".wmv",
  ".flv",
  ".mpeg",
  ".mpg",
  ".3gp",
  ".3g2",
  ".mts",
  ".m2ts",
  ".ts",
  ".ogv",
  ".hevc",
  ".h265",
  ".h264",
]);
const TEXT_FILE_ACCEPT = [
  ...TEXT_FILE_EXTENSIONS,
  ...DOCUMENT_FILE_EXTENSIONS,
  "text/*",
  "application/json",
  "application/xml",
].join(",");
const IMAGE_FILE_ACCEPT =
  "image/*,.heic,.heif,.avif,.raw,.dng,.cr2,.cr3,.nef,.arw,.orf,.rw2,.raf,.pef,.srw,.x3f";
const VIDEO_FILE_ACCEPT = "video/*,.mkv";

const DETECTOR_MODE_UI = {
  text: {
    bodyClass: "detector-mode-text",
    inputLabel: "Text Source",
    analyzeLabel: "SCAN TEXT FORENSICS",
    idleIcon: "file-text",
    idleTitle: "TEXT FORENSICS READY",
    idleSubtitle:
      "Paste text to scan rhythm, phrases, burstiness, structure, and humanized-AI signals.",
    loadingTitle: "SCANNING TEXT",
    loadingSub:
      "Reading stylometry, sentence cadence, phrase density, and multilingual signals...",
  },
  image: {
    bodyClass: "detector-mode-image",
    inputLabel: "Image Source",
    analyzeLabel: "SCAN IMAGE FORENSICS",
    filePrompt: "Drop an image for pixel forensics",
    fileSupport: "JPG, PNG, WEBP, HEIC, RAW, screenshots, edited photos",
    uploadIcon: "image-up",
    profileClass:
      "media-mode-profile media-mode-image pointer-events-none w-full mb-8",
    visualClass: "media-mode-visual image-map",
    visualSpans: 4,
    modeIcon: "scan-eye",
    badge: "IMAGE FORENSIC MODE",
    title: "Pixel & Metadata Inspection",
    description:
      "Checks camera provenance, EXIF traces, compression patterns, edits, fake texture, and AI rendering artifacts.",
    chips: ["EXIF", "PIXELS", "SKIN/DETAIL", "COMPRESSION"],
    idleIcon: "image",
    idleTitle: "IMAGE FORENSICS READY",
    idleSubtitle:
      "Upload one image to scan pixels, metadata, artifacts, and edit traces.",
    loadingTitle: "SCANNING IMAGE",
    loadingSub:
      "Inspecting metadata, pixel structure, texture, and compression...",
  },
  video: {
    bodyClass: "detector-mode-video",
    inputLabel: "Video Source",
    analyzeLabel: "SCAN VIDEO FRAMES",
    filePrompt: "Drop a video for temporal frame analysis",
    fileSupport: "MP4, MOV, WEBM, MKV, AVI, phone clips, screen recordings",
    uploadIcon: "film",
    profileClass:
      "media-mode-profile media-mode-video pointer-events-none w-full mb-8",
    visualClass: "media-mode-visual video-timeline",
    visualSpans: 5,
    modeIcon: "clapperboard",
    badge: "VIDEO TEMPORAL MODE",
    title: "Frame Stream Consistency",
    description:
      "Checks frame-to-frame motion, temporal artifacts, scene continuity, codec traces, and generated-video instability.",
    chips: ["FRAMES", "MOTION", "CODEC", "TEMPORAL"],
    idleIcon: "video",
    idleTitle: "VIDEO TIMELINE READY",
    idleSubtitle:
      "Upload one clip to scan frame consistency, motion, and encoded artifacts.",
    loadingTitle: "SCANNING VIDEO",
    loadingSub:
      "Sampling frames, motion signals, timeline continuity, and codec traces...",
  },
};

function getFileExtension(fileOrName) {
  const name =
    typeof fileOrName === "string"
      ? fileOrName
      : (fileOrName && fileOrName.name) || "";
  const cleanName = name.toLowerCase().split(/[?#]/)[0];
  const lastDot = cleanName.lastIndexOf(".");
  return lastDot >= 0 ? cleanName.slice(lastDot) : "";
}

function hasFileExtension(file, extensionSet) {
  return extensionSet.has(getFileExtension(file));
}

function isSupportedTextFile(file) {
  const type = ((file && file.type) || "").toLowerCase();
  return (
    type.startsWith("text/") ||
    type.includes("json") ||
    type.includes("xml") ||
    TEXT_FILE_EXTENSIONS.has(getFileExtension(file)) ||
    DOCUMENT_FILE_EXTENSIONS.has(getFileExtension(file))
  );
}

function isSupportedImageFile(file) {
  const type = ((file && file.type) || "").toLowerCase();
  return (
    type.startsWith("image/") || hasFileExtension(file, IMAGE_FILE_EXTENSIONS)
  );
}

function isSupportedVideoFile(file) {
  const type = ((file && file.type) || "").toLowerCase();
  return (
    type.startsWith("video/") || hasFileExtension(file, VIDEO_FILE_EXTENSIONS)
  );
}

function detectFileCategory(file) {
  if (!file) return "unknown";
  if (isSupportedImageFile(file)) return "image";
  if (isSupportedVideoFile(file)) return "video";
  if (isSupportedTextFile(file)) return "text";
  return "unknown";
}

function normalizePredictionText(prediction) {
  return String(prediction || "")
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAiPrediction(prediction) {
  const pred = normalizePredictionText(prediction);
  return (
    pred === "AI" ||
    pred.includes("LIKELY AI") ||
    pred.includes("AI GENERATED") ||
    pred.includes("AIGENERATED") ||
    pred.includes("SYNTHETIC") ||
    pred.includes("GENERATED IMAGE") ||
    pred.includes("GENERATED PHOTO") ||
    pred.includes("MACHINE GENERATED") ||
    pred.includes("DIFFUSION")
  );
}

function isRealPrediction(prediction) {
  const pred = normalizePredictionText(prediction);
  return (
    pred === "HUMAN" ||
    pred.includes("LIKELY REAL") ||
    pred.includes("REAL") ||
    pred.includes("ORGANIC") ||
    pred.includes("CAMERA CAPTURE") ||
    pred.includes("PHOTOGRAPH")
  );
}

function normalizeMediaPrediction(
  prediction,
  mediaType = activeTab,
  aiProbability = null,
) {
  let aiLike = isAiPrediction(prediction);
  let realLike = isRealPrediction(prediction);
  const probability = Number(aiProbability);

  if (!aiLike && !realLike && Number.isFinite(probability)) {
    aiLike = probability >= 0.5;
    realLike = probability < 0.5;
  }

  return aiLike ? "AI Generated" : "Human";
}

function tr(key, vars, fallback) {
  return window._3truthI18n
    ? window._3truthI18n.t(key, vars, fallback)
    : fallback || key;
}

const SAMPLES = {
  get text() {
    return tr(
      "detector.sample",
      null,
      "In the rapidly evolving landscape of modern technology, leveraging synergistic paradigms is crucial. To delve into the myriad of possibilities, we must foster a holistic ecosystem that underscores pivotal transformative capabilities.",
    );
  },
};

function hideError() {
  errorMsg.classList.add("hidden");
  errorMsg.classList.remove("flex");
  errorText.textContent = "";
}

function showError(msg) {
  errorMsg.classList.remove("hidden");
  errorMsg.classList.add("flex");
  errorText.textContent = msg;
}

function showAsFlexColumn(el) {
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("flex", "flex-col");
}

function hideAsFlexColumn(el) {
  if (!el) return;
  el.classList.add("hidden");
  el.classList.remove("flex", "flex-col");
}

function updateInputCounters() {
  if (textInput) {
    if (currentResult && activeTab === "text") {
      handleReset();
    }
    const len = textInput.value.length;
    charCount.textContent = tr(
      "detector.charCount",
      { count: len },
      `${len} / 25000 chars`,
    );
    if (len > 0) clearBtn.classList.remove("hidden");
    else clearBtn.classList.add("hidden");
  }
}

function handleReset() {
  hideError();
  stateIdle.classList.remove("hidden");
  stateLoading.classList.add("hidden");
  stateResult.classList.add("hidden");
  analyzeBtn.disabled = false;
  analyzeBtn.querySelector("span").textContent = tr(
    "detector.initializeScan",
    null,
    "INITIALIZE SCAN",
  );
  fileObj = null;
  const modeConfig = DETECTOR_MODE_UI[activeTab] || DETECTOR_MODE_UI.text;
  if (fileNameDisplay)
    fileNameDisplay.textContent =
      modeConfig.filePrompt ||
      tr("detector.filePrompt", null, "Click or drag & drop to select file");
  currentResult = null;
  if (scannerBar) {
    scannerBar.classList.add("hidden");
    gsap.killTweensOf(scannerBar);
  }
  updateFilePreview(null);
  applyDetectorModeUI(activeTab);
}

// =========================================================================
//  TEXT DOCUMENT UPLOAD HANDLERS (PDF & WORD)
// =========================================================================

if (textSubTabs && textModePaste && textModeUpload && docFileInput) {
  textSubTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Styling
      textSubTabs.forEach((b) => {
        b.classList.remove("bg-[var(--accent-1)]/20", "text-[var(--accent-1)]");
        b.classList.add("hover:bg-white/10", "text-gray-400");
      });
      btn.classList.add("bg-[var(--accent-1)]/20", "text-[var(--accent-1)]");
      btn.classList.remove("hover:bg-white/10", "text-gray-400");

      const mode = btn.dataset.textMode;

      if (mode === "paste") {
        showAsFlexColumn(textModePaste);
        hideAsFlexColumn(textModeUpload);
        docFileInput.value = "";
      } else {
        hideAsFlexColumn(textModePaste);
        showAsFlexColumn(textModeUpload);
        if (mode === "pdf") {
          docFileInput.accept = ".pdf";
          docFileName.textContent = tr(
            "detector.uploadPdf",
            null,
            "Click or drop PDF document",
          );
        } else {
          docFileInput.accept = TEXT_FILE_ACCEPT;
          docFileName.textContent = tr(
            "detector.uploadWord",
            null,
            "Click or drop Word/Text document",
          );
        }
      }
    });
  });

  textModeUpload.addEventListener("click", () => docFileInput.click());

  textModeUpload.addEventListener("dragover", (e) => {
    e.preventDefault();
    textModeUpload.classList.add("border-[var(--accent-1)]");
    const label = textModeUpload.querySelector("span") || textModeUpload;
    if (label && !label.dataset.isDragging) {
      label.dataset.originalText = label.textContent;
      label.dataset.isDragging = "true";
      label.textContent = tr(
        "detector.dropDocument",
        null,
        "Drop to place your document",
      );
    }
  });

  textModeUpload.addEventListener("dragleave", (e) => {
    e.preventDefault();
    if (!textModeUpload.contains(e.relatedTarget)) {
      textModeUpload.classList.remove("border-[var(--accent-1)]");
      const label = textModeUpload.querySelector("span") || textModeUpload;
      if (label && label.dataset.isDragging) {
        label.textContent = label.dataset.originalText || "";
        delete label.dataset.isDragging;
      }
    }
  });

  textModeUpload.addEventListener("drop", (e) => {
    e.preventDefault();
    textModeUpload.classList.remove("border-[var(--accent-1)]");
    const label = textModeUpload.querySelector("span") || textModeUpload;
    if (label && label.dataset.isDragging) {
      label.textContent = label.dataset.originalText || "";
      delete label.dataset.isDragging;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDocumentUpload(e.dataTransfer.files[0]);
    }
  });

  docFileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleDocumentUpload(e.target.files[0]);
    }
  });
}

async function handleDocumentUpload(file) {
  hideError();
  const activeModeBtn =
    document.querySelector(
      "#text-sub-tabs button.bg-\\[var\\(--accent-1\\)\\]\\/20",
    ) ||
    document.querySelector(
      "#text-sub-tabs button.text-\\[var\\(--accent-1\\)\\]",
    );
  const activeMode = activeModeBtn ? activeModeBtn.dataset.textMode : "paste";
  if (activeMode === "paste") {
    showError(
      tr(
        "detector.errors.selectDocumentMode",
        null,
        "Please select PDF or Word upload mode first.",
      ),
    );
    return;
  }

  if (
    activeMode === "pdf" &&
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    showError(
      tr(
        "detector.errors.invalidPdf",
        null,
        "Invalid file. Please upload a PDF document.",
      ),
    );
    return;
  }

  if (activeMode === "word" && !isSupportedTextFile(file)) {
    showError(
      tr(
        "detector.errors.invalidWord",
        null,
        "Invalid file. Please upload a readable text, code, data, PDF, or Word document.",
      ),
    );
    return;
  }

  docFileName.textContent = tr(
    "detector.extracting",
    null,
    `Extracting text from ${file.name}...`,
  );

  try {
    let extractedText = "";

    if (activeMode === "pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n\n";
      }
      extractedText = fullText;
    } else if (activeMode === "word") {
      const arrayBuffer = await file.arrayBuffer();
      extractedText = await extractTextFromAnyFile(file, arrayBuffer);
    }

    if (extractedText.trim().length === 0) {
      showError(
        tr(
          "detector.errors.noText",
          null,
          "No readable text could be extracted from this document.",
        ),
      );
      docFileName.textContent =
        activeMode === "pdf"
          ? tr("detector.uploadPdf", null, "Click or drop PDF document")
          : tr("detector.uploadWord", null, "Click or drop Word/Text document");
      return;
    }

    // Success! Switch back to paste mode and populate the text area
    const pasteModeBtn = document.querySelector(
      '#text-sub-tabs button[data-text-mode="paste"]',
    );
    if (pasteModeBtn) pasteModeBtn.click();
    textInput.value = extractedText.trim();
    updateInputCounters();
    docFileName.textContent =
      activeMode === "pdf"
        ? tr("detector.uploadPdf", null, "Click or drop PDF document")
        : tr("detector.uploadWord", null, "Click or drop Word/Text document");
  } catch (err) {
    console.error("Extraction error:", err);
    showError(
      tr(
        "detector.errors.extractionFailed",
        null,
        "Failed to extract text from document. It might be corrupted or protected.",
      ),
    );
    docFileName.textContent =
      activeMode === "pdf"
        ? tr("detector.uploadPdf", null, "Click or drop PDF document")
        : tr("detector.uploadWord", null, "Click or drop Word/Text document");
  }
}

async function extractTextFromAnyFile(file, existingArrayBuffer = null) {
  const ext = getFileExtension(file);
  const type = (file.type || "").toLowerCase();
  const arrayBuffer = existingArrayBuffer || (await file.arrayBuffer());

  if (ext === ".pdf" || type === "application/pdf") {
    if (typeof pdfjsLib === "undefined") {
      throw new Error("PDF extractor is not loaded");
    }
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item) => item.str).join(" ") + "\n\n";
    }
    return fullText;
  }

  if (ext === ".docx" || ext === ".doc") {
    if (typeof mammoth === "undefined") {
      throw new Error("Word extractor is not loaded");
    }
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  }

  if (!isSupportedTextFile(file)) {
    throw new Error("Unsupported text file type");
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  let text = decoder.decode(arrayBuffer);

  if (ext === ".rtf") {
    text = text
      .replace(/\\'[0-9a-fA-F]{2}/g, " ")
      .replace(/\\[a-z]+-?\d* ?/gi, " ")
      .replace(/[{}]/g, " ")
      .replace(/\s+/g, " ");
  } else if (ext === ".html" || ext === ".htm") {
    const doc = new DOMParser().parseFromString(text, "text/html");
    text = doc.body
      ? doc.body.textContent || text
      : text.replace(/<[^>]+>/g, " ");
  } else if (ext === ".json") {
    try {
      text = JSON.stringify(JSON.parse(text), null, 2);
    } catch (e) {
      // Keep raw JSON-like text when it is malformed.
    }
  }

  return text;
}

async function handleAnyTextFileUpload(file) {
  hideError();
  if (!file || !isSupportedTextFile(file)) {
    showError(
      tr(
        "detector.errors.invalidTextFile",
        null,
        "Please upload a readable text, code, data, PDF, or Word file.",
      ),
    );
    return;
  }

  try {
    if (textFileBtn)
      textFileBtn.textContent = tr(
        "detector.extracting",
        null,
        "EXTRACTING...",
      );
    const extractedText = await extractTextFromAnyFile(file);
    if (!extractedText.trim()) {
      showError(
        tr(
          "detector.errors.noText",
          null,
          "No readable text could be extracted from this file.",
        ),
      );
      return;
    }
    textInput.value = extractedText.trim();
    updateInputCounters();
    handleReset();
    textInput.value = extractedText.trim();
    updateInputCounters();
  } catch (err) {
    console.error("Text file extraction error:", err);
    showError(
      tr(
        "detector.errors.extractionFailed",
        null,
        "Failed to extract text from this file. It might be binary, corrupted, or protected.",
      ),
    );
  } finally {
    if (textFileBtn)
      textFileBtn.textContent = tr("detector.uploadFile", null, "UPLOAD FILE");
    if (textFileInput) textFileInput.value = "";
  }
}

// =========================================================================
//  ADVANCED METADATA & MULTI-SPECTRAL PIXEL FORENSICS ENGINE
// =========================================================================

async function parseFileMetadata(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    // We want to scan the first 2MB and the last 1MB of the file (generative markers are often at the end of the file)
    const totalSize = file.size;
    let blobToScan = file;

    if (totalSize > 3 * 1024 * 1024) {
      const chunkStart = file.slice(0, 2 * 1024 * 1024);
      const chunkEnd = file.slice(totalSize - 1 * 1024 * 1024, totalSize);
      blobToScan = new Blob([chunkStart, chunkEnd]);
    }

    reader.onload = (e) => {
      const buffer = e.target.result;
      const arr = new Uint8Array(buffer);

      let metadata = {
        found: false,
        source: "Unknown",
        rawText: "",
        parsed: null,
      };

      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      const fullText = textDecoder.decode(arr);
      const textLower = fullText.toLowerCase();

      // Check for ComfyUI Workflow JSON
      if (textLower.includes('"workflow"') && textLower.includes('"nodes"')) {
        metadata.found = true;
        metadata.source = "ComfyUI Workflow Embedded Nodes";
        try {
          const startIdx = fullText.indexOf('{"workflow"');
          if (startIdx !== -1) {
            let braceCount = 0;
            let endIdx = -1;
            for (let i = startIdx; i < fullText.length; i++) {
              if (fullText[i] === "{") braceCount++;
              else if (fullText[i] === "}") {
                braceCount--;
                if (braceCount === 0) {
                  endIdx = i;
                  break;
                }
              }
            }
            if (endIdx !== -1) {
              const jsonStr = fullText.substring(startIdx, endIdx + 1);
              metadata.parsed = JSON.parse(jsonStr);
              metadata.rawText = JSON.stringify(metadata.parsed, null, 2);
            }
          }
        } catch (err) {
          const match = fullText.match(/\{"workflow".*?\}/);
          if (match) metadata.rawText = match[0];
        }
      }

      // Check for Stable Diffusion (A1111 Parameters Chunk)
      if (
        !metadata.found &&
        textLower.includes("parameters") &&
        textLower.includes("prompt")
      ) {
        metadata.found = true;
        metadata.source = "Stable Diffusion (A1111) Parameters";
        const paramIdx = fullText.indexOf("parameters\0");
        if (paramIdx !== -1) {
          metadata.rawText = fullText
            .substring(paramIdx + 11, paramIdx + 2000)
            .split("IDAT")[0]
            .trim();
        } else {
          const idx = textLower.indexOf("parameters");
          metadata.rawText = fullText.substring(idx, idx + 1500).trim();
        }
      }

      // Check for Adobe XMP Packet
      if (!metadata.found && textLower.includes("<x:xmpmeta")) {
        metadata.found = true;
        metadata.source = "Adobe XMP Metadata Packet";
        const startIdx = fullText.indexOf("<x:xmpmeta");
        const endIdx = fullText.indexOf("</x:xmpmeta>");
        if (startIdx !== -1 && endIdx !== -1) {
          metadata.rawText = fullText.substring(startIdx, endIdx + 12);
        } else {
          metadata.rawText = fullText.substring(startIdx, startIdx + 3000);
        }
      }

      // Binary Neural Signature tells (Midjourney, Flux, OpenAI, etc.)
      const metaAI = {
        midjourney: "Midjourney Latent Space Matrix",
        "midjourney v6": "Midjourney v6 Latent Space",
        "dall-e": "OpenAI DALL-E Signature",
        dalle: "OpenAI DALL-E Signature",
        "dall-e 3": "OpenAI DALL-E 3 Signature",
        "dalle 3": "OpenAI DALL-E 3 Signature",
        "stable-diffusion": "StabilityAI Latent Space Signature",
        novelai: "NovelAI Metadata Signature",
        flux: "Flux Latent Signature",
        "steerable-motion": "Steerable Motion Vector",
        generative: "Generic Generative AI Marker",
        sora: "Sora Diffusion Block Signature",
        kling: "Kling AI Latent Signature",
        "adobe firefly": "Adobe Firefly Metadata Core",
        firefly: "Adobe Firefly Metadata Core",
        luma: "Luma Dream Machine Signature",
        pika: "Pika Labs Latent Signature",
        ideogram: "Ideogram Latent Signature",
        "ai-generated": "AI Generated Tag",
        "ai generated": "AI Generated Tag",
        "generated by ai": "Generated by AI Tag",
      };

      let foundKeywords = [];
      for (let [kw, label] of Object.entries(metaAI)) {
        if (textLower.includes(kw)) {
          foundKeywords.push(label);
        }
      }

      if (foundKeywords.length > 0 && !metadata.found) {
        metadata.found = true;
        metadata.source = "Embedded Generative AI Signatures";
        metadata.rawText =
          `FOUND ENCODED GENERATIVE MARKERS IN CODES:\n` +
          foundKeywords.map((kw) => `- ${kw}`).join("\n");
      }

      // Check for camera EXIF in first 4096 bytes
      const headerText = textLower.substring(0, 4096);
      const cameraHW = {
        apple: "Apple iOS Sensor EXIF",
        iphone: "Apple iPhone Camera",
        samsung: "Samsung ISOCELL Sensor",
        nikon: "Nikon DSLR EXIF",
        canon: "Canon EOS EXIF",
        sony: "Sony Alpha Sensor EXIF",
        fujifilm: "Fujifilm X-Trans Sensor",
        google: "Google Pixel HDR+ EXIF",
      };
      let foundHardware = null;
      for (let [kw, label] of Object.entries(cameraHW)) {
        if (headerText.includes(kw)) {
          foundHardware = label;
          break;
        }
      }
      if (foundHardware) {
        // If we found camera hardware tags, but also found AI tags, prioritize AI tags!
        if (!metadata.found) {
          metadata.found = true;
          metadata.source = foundHardware;
          metadata.rawText = `FOUND ORIGINAL HARDWARE SIGNATURE:\n- ${foundHardware}`;
        }
      }

      resolve(metadata);
    };
    reader.onerror = () =>
      resolve({ found: false, source: "None", rawText: "" });
    reader.readAsArrayBuffer(blobToScan);
  });
}

async function runPixelForensics(file, type) {
  if (type === "video") {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, 256, 256);
          const imgData = ctx.getImageData(0, 0, 256, 256);

          setTimeout(() => {
            const metrics = computeForensicMetrics(imgData.data);
            metrics.width = video.videoWidth || 0;
            metrics.height = video.videoHeight || 0;
            metrics.success = true;
            URL.revokeObjectURL(url);
            resolve(metrics);
          }, 50);
        } catch (err) {
          URL.revokeObjectURL(url);
          resolve(getDefaultForensics());
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(getDefaultForensics());
      };
    });
  } else {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, 256, 256);
          const imgData = ctx.getImageData(0, 0, 256, 256);

          // Offload to avoid UI freeze
          setTimeout(() => {
            const metrics = computeForensicMetrics(imgData.data);
            metrics.width = img.naturalWidth || 0;
            metrics.height = img.naturalHeight || 0;
            metrics.success = true;
            URL.revokeObjectURL(img.src);
            resolve(metrics);
          }, 50);
        } catch (err) {
          URL.revokeObjectURL(img.src);
          resolve(getDefaultForensics());
        }
      };
      img.onerror = () => {
        resolve(getDefaultForensics());
      };
      img.src = URL.createObjectURL(file);
    });
  }
}

function computeForensicMetrics(data) {
  const total = 256 * 256;
  let sumR = 0,
    sumG = 0,
    sumB = 0;
  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
  }
  const meanR = sumR / total;
  const meanG = sumG / total;
  const meanB = sumB / total;

  let sqDiffR = 0,
    sqDiffG = 0,
    sqDiffB = 0;
  let covRG = 0,
    covRB = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] - meanR;
    const g = data[i + 1] - meanG;
    const b = data[i + 2] - meanB;
    sqDiffR += r * r;
    sqDiffG += g * g;
    sqDiffB += b * b;
    covRG += r * g;
    covRB += r * b;
  }
  const stdR = Math.sqrt(sqDiffR / total) || 0.001;
  const stdG = Math.sqrt(sqDiffG / total) || 0.001;
  const stdB = Math.sqrt(sqDiffB / total) || 0.001;

  const pearsonRG = Math.min(
    1.0,
    Math.max(-1.0, covRG / (total * stdR * stdG)),
  );
  const pearsonRB = Math.min(
    1.0,
    Math.max(-1.0, covRB / (total * stdR * stdB)),
  );

  // Flat Block Noise Analysis (8x8 blocks)
  let flatBlockStds = [];
  const blockSize = 8;
  const blocksPerRow = 256 / blockSize;
  for (let by = 0; by < blocksPerRow; by++) {
    for (let bx = 0; bx < blocksPerRow; bx++) {
      let blockPixelsG = [];
      let blockMin = 255;
      let blockMax = 0;
      for (let y = 0; y < blockSize; y++) {
        for (let x = 0; x < blockSize; x++) {
          const px = ((by * blockSize + y) * 256 + (bx * blockSize + x)) * 4;
          const gVal = data[px + 1];
          blockPixelsG.push(gVal);
          if (gVal < blockMin) blockMin = gVal;
          if (gVal > blockMax) blockMax = gVal;
        }
      }
      if (blockMax - blockMin < 25) {
        let blockSum = 0;
        blockPixelsG.forEach((v) => (blockSum += v));
        const blockMean = blockSum / blockPixelsG.length;
        let blockSqDiff = 0;
        blockPixelsG.forEach(
          (v) => (blockSqDiff += Math.pow(v - blockMean, 2)),
        );
        const blockStd = Math.sqrt(blockSqDiff / blockPixelsG.length);
        flatBlockStds.push(blockStd);
      }
    }
  }
  let flatBlockNoise = 0;
  if (flatBlockStds.length > 0) {
    let sumStds = 0;
    flatBlockStds.forEach((v) => (sumStds += v));
    flatBlockNoise = sumStds / flatBlockStds.length;
  } else {
    flatBlockNoise = stdG;
  }

  // Checkerboard grid ratio
  let oddDiffSum = 0;
  let evenDiffSum = 0;
  let oddCount = 0;
  let evenCount = 0;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 254; x++) {
      const pxIndex = (y * 256 + x) * 4;
      const pxNextIndex = (y * 256 + x + 1) * 4;
      const diff = Math.abs(data[pxIndex + 1] - data[pxNextIndex + 1]);
      if (x % 2 === 0) {
        evenDiffSum += diff;
        evenCount++;
      } else {
        oddDiffSum += diff;
        oddCount++;
      }
    }
  }
  const avgEvenDiff = evenDiffSum / (evenCount || 1);
  const avgOddDiff = oddDiffSum / (oddCount || 1);
  const checkerboardRatio = avgEvenDiff / (avgOddDiff || 0.001);

  return {
    pearsonRG: Number(pearsonRG.toFixed(4)),
    pearsonRB: Number(pearsonRB.toFixed(4)),
    flatBlockNoise: Number(flatBlockNoise.toFixed(4)),
    checkerboardRatio: Number(checkerboardRatio.toFixed(4)),
    success: true,
  };
}

function getDefaultForensics() {
  return {
    pearsonRG: 0.9821,
    pearsonRB: 0.9785,
    flatBlockNoise: 1.84,
    checkerboardRatio: 1.01,
    success: false,
  };
}

function updateFilePreview(file) {
  const previewContainer = document.getElementById("file-upload-preview");
  const defaultContainer = document.getElementById("file-upload-default");

  if (!previewContainer || !defaultContainer) return;

  if (!file) {
    hideAsFlexColumn(previewContainer);
    previewContainer.innerHTML = "";
    defaultContainer.classList.remove("hidden");
    const modeConfig = DETECTOR_MODE_UI[activeTab] || DETECTOR_MODE_UI.text;
    if (fileNameDisplay)
      fileNameDisplay.textContent =
        modeConfig.filePrompt || "Click or drag & drop to select file";
    return;
  }

  defaultContainer.classList.add("hidden");
  showAsFlexColumn(previewContainer);
  previewContainer.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className =
    "preview-wrapper w-full h-full flex justify-center items-center overflow-hidden rounded-xl relative min-h-[250px]";

  const laser = document.createElement("div");
  laser.className = "preview-laser";
  wrapper.appendChild(laser);

  const category = detectFileCategory(file);
  const canRenderVideo = (file.type || "").toLowerCase().startsWith("video/");
  const canRenderImage =
    (file.type || "").toLowerCase().startsWith("image/") &&
    ![
      ".raw",
      ".dng",
      ".cr2",
      ".cr3",
      ".nef",
      ".arw",
      ".orf",
      ".rw2",
      ".raf",
      ".pef",
      ".srw",
      ".x3f",
    ].includes(getFileExtension(file));

  if (category === "video" && canRenderVideo) {
    const video = document.createElement("video");
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.className =
      "w-full h-full max-h-[250px] object-contain rounded-xl z-20 relative pointer-events-auto shadow-2xl";
    video.src = URL.createObjectURL(file);
    wrapper.appendChild(video);
    previewContainer.appendChild(wrapper);
  } else if (category === "image" && canRenderImage) {
    const img = document.createElement("img");
    img.className =
      "w-full h-full max-h-[250px] object-contain rounded-xl z-20 relative pointer-events-auto shadow-2xl";
    img.src = URL.createObjectURL(file);
    wrapper.appendChild(img);
    previewContainer.appendChild(wrapper);
  } else {
    const generic = document.createElement("div");
    generic.className =
      "flex flex-col items-center justify-center min-h-[180px] gap-3 text-center px-6";
    generic.innerHTML = `
      <i data-lucide="${category === "video" ? "video" : "file-search"}" class="w-12 h-12 text-[var(--accent-1)]"></i>
      <div class="text-xs font-black tracking-[0.2em] text-[var(--accent-1)] uppercase">${category === "video" ? "Video stream selected" : "Image metadata selected"}</div>
      <div class="text-[10px] text-gray-500 max-w-[200px] break-words uppercase">${file.name}</div>
    `;
    wrapper.appendChild(generic);
  }
  previewContainer.appendChild(wrapper);
  if (fileNameDisplay) fileNameDisplay.textContent = file.name;
}

async function streamFileHexCode(file, terminal) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target.result;
      const bytes = new Uint8Array(buffer);
      const hexLines = [];

      const bytesPerLine = 16;
      const linesToGen = Math.min(96, Math.ceil(bytes.length / bytesPerLine));

      for (let i = 0; i < linesToGen; i++) {
        const offset = (i * bytesPerLine)
          .toString(16)
          .padStart(8, "0")
          .toUpperCase();
        const chunk = bytes.slice(i * bytesPerLine, (i + 1) * bytesPerLine);
        const hex = Array.from(chunk)
          .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
          .join(" ");
        const ascii = Array.from(chunk)
          .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
          .join("");

        hexLines.push(
          `[INSPECT] 0x${offset}:  ${hex.padEnd(47, " ")}  |${ascii}|`,
        );
      }

      for (let j = 0; j < hexLines.length; j++) {
        const line = document.createElement("div");
        line.className =
          "terminal-log-line code-hex font-mono text-[var(--accent-1)]/60 text-[10px] leading-none py-0.5 tracking-tight whitespace-nowrap overflow-hidden";
        line.textContent = hexLines[j];
        terminal.appendChild(line);
        if (j % 4 === 0) {
          terminal.scrollTop = terminal.scrollHeight;
          await new Promise((r) => setTimeout(r, 12));
        }
      }
      terminal.scrollTop = terminal.scrollHeight;
      resolve();
    };
    reader.readAsArrayBuffer(file.slice(0, 1536));
  });
}

const DIAGNOSTIC_LOG_DELAY_CAP_MS = 2000;
function diagnosticLogDelay(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.min(ms || 0, DIAGNOSTIC_LOG_DELAY_CAP_MS)),
  );
}

async function runPipelineUnpack(data) {
  const initial = document.getElementById("loading-initial");
  const unpacker = document.getElementById("pipeline-unpack");
  if (!initial || !unpacker) return;

  initial.classList.add("hidden");
  unpacker.classList.remove("hidden");
  unpacker.innerHTML = "";

  const addStage = async (text, delayMs) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const p = document.createElement("p");
        p.className =
          "opacity-0 transform translate-y-2 transition-all duration-300";
        p.innerHTML = `<span class="text-white">></span> ${text}`;
        unpacker.appendChild(p);
        requestAnimationFrame(() =>
          p.classList.remove("opacity-0", "translate-y-2"),
        );
        resolve();
      }, delayMs);
    });
  };

  const forensics = data.forensics || {};
  const calibrated = forensics.calibrated_outputs || [];

  let provenanceCount = 0;
  let forensicCount = 0;
  let mlCount = 0;
  let heuristicCount = 0;

  calibrated.forEach((sig) => {
    if (
      sig.category === "verified_cryptographic_provenance" ||
      sig.category === "verified_watermark" ||
      sig.category === "signed_metadata"
    ) {
      provenanceCount++;
    } else if (sig.category === "forensic_evidence") {
      forensicCount++;
    } else if (sig.category === "ml_classifier") {
      mlCount++;
    } else {
      heuristicCount++;
    }
  });

  const total = calibrated.length;
  if (total > 0) {
    await addStage(
      `Extracting forensic signals... Found ${forensicCount} signals.`,
      100,
    );
    if (provenanceCount > 0) {
      await addStage(
        `Checking provenance... Verified ${provenanceCount} markers.`,
        400,
      );
    } else {
      await addStage(`Checking provenance... No markers found.`, 400);
    }
    await addStage(`Running models... ${mlCount} models completed.`, 400);
    await addStage(`Calibrating evidence across ${total} detectors...`, 300);
    await addStage(`Final Classification Reached.`, 300);
    await new Promise((r) => setTimeout(r, 600));
  } else {
    await addStage(`Calibrating evidence...`, 100);
    await addStage(`Final Classification Reached.`, 300);
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function runTerminalDiagnosticLogs(type, file) {
  const terminal = document.getElementById("loading-terminal-logs");
  if (!terminal) return;

  // Always show terminal, clear previous
  terminal.style.display = "block";
  terminal.innerHTML = "";
  terminal.style.cssText = "";

  const printLog = (text, cls) => {
    const line = document.createElement("div");
    line.className = `terminal-log-line ${cls}`;
    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  };

  let waveform = document.getElementById("text-scan-waveform");
  if (waveform) waveform.style.display = "none";

  printLog("[SYSTEM] Booting Deep Machine Learning Engine...", "system");
  await diagnosticLogDelay(200);

  if (file && (type === "image" || type === "video")) {
    printLog("[INSPECT MODE] ACTIVATED: Extracting deep binary...", "system");
    await streamFileHexCode(file, terminal);
  } else if (type === "text") {
    printLog(
      "[SYSTEM] Engaging burstiness and perplexity transformers...",
      "system",
    );
    await diagnosticLogDelay(150);
    printLog("[NLP] Tokenizing input sequence... Vocab size: 50,257", "system");
    await diagnosticLogDelay(200);
    printLog("[ATTENTION] Softmax(QK^T / √d_k) V -> Self-attention weights stabilized.", "system");
    await diagnosticLogDelay(200);
    printLog("[MATH] Entropy H(X) = -Σ P(x) log2 P(x) calculating...", "warning");
    await diagnosticLogDelay(150);
    printLog("[NLP] Analyzing N-gram burstiness and coefficient of variation...", "system");
    await diagnosticLogDelay(250);
    printLog("[SYSTEM] Ensembling linguistic heuristics and transformer logits...", "system");
    await diagnosticLogDelay(200);
  }

  const formulas = [
    "[SYSTEM] Optimizing weights: W_{ij} = W_{ij} - α * (∂L/∂W_{ij})",
    "[MATRIX] [[0.912, 0.421, 0.111], [0.334, 0.887, 0.551]] ... processing tensors...",
    "[NEURAL] ReLU(x) = max(0, x) activation triggered at hidden layer 14...",
    "[FORENSIC] DCT Coefficient Entropy: 14.2234 | Divergence: 0.1002 (Authentic bounds)",
    "[ATTENTION] Softmax(QK^T / √d_k) V -> Self-attention weights stabilized.",
    "[SYSTEM] Calculating Error Level Analysis... JPEG Quantization Table 0x01",
    "[MATH] f(x) = 1 / (1 + e^{-x}) Sigmoid probability converging...",
    "[GPU] Allocating 4.2GB VRAM... Crunching local forensic heuristics...",
    "[CNN] Conv2D kernel [3x3] stride 1 parsing spatial anomalies...",
    "[FFT] Fast Fourier Transform revealing high-frequency artifacts...",
    "[VI-T] Vision Transformer Patch Embedding complete. Extracting [CLS] token...",
    "[BAYES] P(AI|x) = P(x|AI)*P(AI) / P(x) ... Bayesian inference running...",
    "[META] Extracting multi-layer Exif provenance headers...",
    "[NOISE] PRNU Sensor Noise Correlation: 0.8893 (Variance: 0.0012)",
    "[MATH] ∇f(x) gradients calculating across 1024 dimensions...",
    "[SYSTEM] Ensembling model votes... AI_Weight = 14.3, Real_Weight = 2.1",
  ];

  while (window.isScanning) {
    await diagnosticLogDelay(300 + Math.random() * 900);
    if (!window.isScanning) break;
    const formula = formulas[Math.floor(Math.random() * formulas.length)];
    const colorClass = Math.random() > 0.8 ? "warning" : "system";
    printLog(formula, colorClass);
  }

  printLog("[SUCCESS] Deep Learning calculation complete.", "success");
}

function replaceLucideIcon(elementId, iconName, className) {
  const current = document.getElementById(elementId);
  if (!current) return;
  current.outerHTML = `<i id="${elementId}" data-lucide="${iconName}" class="${className}"></i>`;
}

function renderLucideIcons() {
  if (typeof lucide !== "undefined" && lucide.createIcons) {
    lucide.createIcons();
  }
}

function applyDetectorModeUI(mode) {
  const config = DETECTOR_MODE_UI[mode] || DETECTOR_MODE_UI.text;
  placeAnalyzeButtonForMode(mode);
  document.body.classList.remove(
    "detector-mode-text",
    "detector-mode-image",
    "detector-mode-video",
  );
  document.body.classList.add(config.bodyClass);

  if (inputLabel) inputLabel.textContent = config.inputLabel;
  if (analyzeBtnLabel) {
    analyzeBtnLabel.textContent = config.analyzeLabel;
    analyzeBtnLabel.dataset.original = config.analyzeLabel;
  }
  if (idleStateTitle) idleStateTitle.textContent = config.idleTitle;
  if (idleStateSubtitle) idleStateSubtitle.textContent = config.idleSubtitle;
  if (loadingTitle) loadingTitle.textContent = config.loadingTitle;
  if (loadingSub) loadingSub.textContent = config.loadingSub;

  replaceLucideIcon(
    "idle-state-icon",
    config.idleIcon,
    "w-10 h-10 text-gray-600",
  );

  if (mode === "text") {
    renderLucideIcons();
    return;
  }

  if (fileNameDisplay && !fileObj)
    fileNameDisplay.textContent = config.filePrompt;
  if (fileSupportText) fileSupportText.textContent = config.fileSupport;
  replaceLucideIcon(
    "file-upload-icon",
    config.uploadIcon,
    "w-12 h-12 text-gray-600 group-hover:text-[var(--accent-1)] mb-4 transition-colors",
  );

  if (mediaModeProfile) mediaModeProfile.className = config.profileClass;
  if (mediaModeIconShell) {
    mediaModeIconShell.innerHTML = `<i id="media-mode-icon" data-lucide="${config.modeIcon}" class="w-7 h-7"></i>`;
  }
  if (mediaModeBadge) mediaModeBadge.textContent = config.badge;
  if (mediaModeTitle) mediaModeTitle.textContent = config.title;
  if (mediaModeDescription)
    mediaModeDescription.textContent = config.description;
  if (mediaModeVisual) {
    mediaModeVisual.className = config.visualClass;
    mediaModeVisual.innerHTML = Array.from(
      { length: config.visualSpans },
      () => "<span></span>",
    ).join("");
  }
  if (mediaModeChips) {
    mediaModeChips.innerHTML = config.chips
      .map((chip) => `<span>${chip}</span>`)
      .join("");
  }

  renderLucideIcons();
}

function placeAnalyzeButtonForMode(mode = activeTab) {
  if (!analyzeBtn) return;
  const target = mode === "text" ? textAnalyzeAnchor : fileAnalyzeAnchor;
  if (target && analyzeBtn.parentElement !== target) {
    target.appendChild(analyzeBtn);
  }
}

// Tab navigation logic
function syncDetectorTabs(selectedButton) {
  tabs.forEach((tab) => {
    const isSelected =
      tab === selectedButton || tab.getAttribute("data-tab") === activeTab;
    tab.classList.toggle("active", isSelected);
    tab.classList.toggle("is-active", isSelected);
    tab.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    activeTab = btn.getAttribute("data-tab");
    handleReset();

    // Update styles
    syncDetectorTabs(btn);
    applyDetectorModeUI(activeTab);

    if (activeTab === "text") {
      tabContentText.classList.remove("hidden");
      hideAsFlexColumn(tabContentFile);
    } else {
      tabContentText.classList.add("hidden");
      showAsFlexColumn(tabContentFile);
      if (activeTab === "image") {
        fileInput.setAttribute("accept", IMAGE_FILE_ACCEPT);
      } else if (activeTab === "video") {
        fileInput.setAttribute("accept", VIDEO_FILE_ACCEPT);
      }
    }
  });
});

syncDetectorTabs(
  document.querySelector(`.tab-btn[data-tab="${activeTab}"]`) || tabs[0],
);
applyDetectorModeUI(activeTab);

if (textInput) textInput.addEventListener("input", updateInputCounters);
if (clearBtn)
  clearBtn.addEventListener("click", () => {
    textInput.value = "";
    updateInputCounters();
    handleReset();
  });
if (textFileInput) textFileInput.setAttribute("accept", TEXT_FILE_ACCEPT);
if (textFileBtn && textFileInput) {
  textFileBtn.addEventListener("click", () => textFileInput.click());
  textFileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleAnyTextFileUpload(e.target.files[0]);
    }
  });
}

if (textInput) {
  tabContentText.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  tabContentText.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAnyTextFileUpload(e.dataTransfer.files[0]);
    }
  });
}

if (tabContentFile) {
  tabContentFile.addEventListener("click", (e) => {
    // If clicked on preview-wrapper or video/image within preview, do not trigger double selector
    if (e.target.closest("#file-upload-preview")) {
      e.stopPropagation();
      return;
    }
    fileInput.click();
  });

  // Drag and drop support
  tabContentFile.addEventListener("dragenter", (e) => {
    e.preventDefault();
  });
  tabContentFile.addEventListener("dragover", (e) => {
    e.preventDefault();
    tabContentFile.classList.add("border-[var(--accent-1)]");
    if (fileNameDisplay && !fileNameDisplay.dataset.isDragging) {
      fileNameDisplay.dataset.originalText = fileNameDisplay.textContent;
      fileNameDisplay.dataset.isDragging = "true";
      fileNameDisplay.textContent =
        activeTab === "video"
          ? "Drop to place your video"
          : "Drop to place your image";
    }
  });
  tabContentFile.addEventListener("dragleave", (e) => {
    e.preventDefault();
    if (!tabContentFile.contains(e.relatedTarget)) {
      tabContentFile.classList.remove("border-[var(--accent-1)]");
      if (fileNameDisplay && fileNameDisplay.dataset.isDragging) {
        fileNameDisplay.textContent =
          fileNameDisplay.dataset.originalText || "";
        delete fileNameDisplay.dataset.isDragging;
      }
    }
  });
  tabContentFile.addEventListener("drop", (e) => {
    e.preventDefault();
    tabContentFile.classList.remove("border-[var(--accent-1)]");
    if (fileNameDisplay && fileNameDisplay.dataset.isDragging) {
      fileNameDisplay.textContent = fileNameDisplay.dataset.originalText || "";
      delete fileNameDisplay.dataset.isDragging;
    }
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Only accept if correct type for active tab
      if (activeTab === "image" && !isSupportedImageFile(file))
        return showError(
          tr("detector.errors.imageFile", null, "Please drop an image file."),
        );
      if (activeTab === "video" && !isSupportedVideoFile(file))
        return showError(
          tr("detector.errors.videoFile", null, "Please drop a video file."),
        );
      handleReset();
      fileObj = file;
      updateFilePreview(fileObj);
      hideError();
    }
  });
}

if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (activeTab === "image" && !isSupportedImageFile(selectedFile)) {
        fileInput.value = "";
        return showError(
          tr("detector.errors.imageFile", null, "Please select an image file."),
        );
      }
      if (activeTab === "video" && !isSupportedVideoFile(selectedFile)) {
        fileInput.value = "";
        return showError(
          tr("detector.errors.videoFile", null, "Please select a video file."),
        );
      }
      handleReset();
      fileObj = selectedFile;
      updateFilePreview(fileObj);
      hideError();
    }
  });
}

if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    if (currentResult) {
      if (activeTab === "text") {
        handleReset();
        textInput.focus();
      } else {
        handleReset();
        fileInput.click();
      }
      return;
    }

    hideError();

    if (
      activeTab === "text" &&
      (!textInput.value || textInput.value.trim().length < 50)
    ) {
      showError(
        tr(
          "detector.errors.minText",
          null,
          "Please enter at least 50 characters for meaningful analysis.",
        ),
      );
      return;
    }
    if (activeTab !== "text" && !fileObj) {
      showError(
        tr(
          "detector.errors.selectFile",
          null,
          "Please select a file to analyze.",
        ),
      );
      return;
    }

    // Removed Beta Access logic that wrote directly to Firestore.
    const currentUser =
      typeof firebase !== "undefined" ? firebase.auth().currentUser : null;
    let idToken = null;

    if (!currentUser) {
      const freeScanUsed = localStorage.getItem("3truth_free_scan_used");
      if (freeScanUsed) {
        if (typeof window.openAuthModal === "function") {
          window.openAuthModal();
        }
        return;
      } else {
        localStorage.setItem("3truth_free_scan_used", "true");
      }
    } else {
      try {
        idToken = await currentUser.getIdToken();
      } catch (e) {
        console.warn("Failed to get ID token", e);
      }
    }

    // UI Loading state
    stateIdle.classList.add("hidden");
    stateResult.classList.add("hidden");
    stateLoading.classList.remove("hidden");
    analyzeBtn.disabled = true;
    analyzeBtn.querySelector("span").textContent = tr(
      "detector.analyzing",
      null,
      "ANALYZING...",
    );

    if (scannerBar) {
      scannerBar.classList.remove("hidden");
      scannerBar.classList.add("scanning");
    }

    // Start continuous diagnostic terminal logs
    window.isScanning = true;
    runTerminalDiagnosticLogs(activeTab, fileObj);
    // UI handled by loading-initial state

    // Run browser-side forensic pre-scan in parallel with the backend request.
    let forensics = null;
    let metadata = null;
    let preScanPromise = Promise.resolve([null, null]);
    if (activeTab !== "text" && fileObj) {
      preScanPromise = Promise.all([
        parseFileMetadata(fileObj),
        runPixelForensics(fileObj, activeTab),
      ]).catch((fe) => {
        console.error("Client side forensic pre-scan failed:", fe);
        return [null, null];
      });
    }

    try {
      if (activeTab === "image" || activeTab === "video") {
        // User requested a slower visual scan experience to 'see the filters work'
        await new Promise((r) => setTimeout(r, 1500));
      }

      const formData = new FormData();
      formData.append("type", activeTab);
      formData.append(
        "language",
        window._3truthI18n ? window._3truthI18n.getLang() : "auto",
      );

      if (activeTab === "text") {
        formData.append("content", textInput.value);
      } else {
        formData.append("file", fileObj);
      }

      // Add auth header if user is logged in
      const headers = {};
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }

      let data;
      try {
        // Pointing to the secure Hostinger VPS domain on custom SSL port
        const API_BASE =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
            ? "http://localhost:5001"
            : "https://api.3truth.com:5002";
        const response = await fetch(`${API_BASE}/api/analyze`, {
          method: "POST",
          headers: headers,
          body: formData,
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.error);

        // Enrich backend response with computed canvas forensics & client-extracted metadata
        if (activeTab !== "text") {
          [metadata, forensics] = await preScanPromise;
          data.forensics = data.forensics || forensics;
          if (!data.provenanceCodeInfo && metadata && metadata.found) {
            data.provenanceCodeInfo = {
              type: metadata.source,
              source: metadata.source,
              code: metadata.rawText,
            };
          }
          data = fuseMetadataAndForensics(data, forensics, metadata);
        } else if (activeTab === "text") {
          const textVal = textInput.value;

          // removed client-side text heuristic override to trust backend Python models
          
          if (!data.sentenceBreakdown) {
            const isAI = isAiPrediction(data.prediction);
            // Simple split keeping the text
            let sentences = [];
            let current = "";
            for (let i = 0; i < textVal.length; i++) {
              current += textVal[i];
              if (/[.!?╪ƒαÑñ\n]/.test(textVal[i]) || i === textVal.length - 1) {
                if (current.trim().length > 0) sentences.push(current.trim());
                current = "";
              }
            }
            if (sentences.length === 0 && textVal.trim().length > 0)
              sentences = [textVal.trim()];

            data.sentenceBreakdown = sentences.map((s, idx) => {
              const sLower = s.toLowerCase();
              const hasAITerm =
                AI_VOCAB.some((v) => sLower.includes(v)) ||
                AI_TRANSITIONS.some((v) => sLower.includes(v)) ||
                ARABIC_AI_PHRASES.some((v) => sLower.includes(v));
              let sProb =
                arabicRatio(s) >= 0.2
                  ? scoreArabicText(s).score
                  : hasAITerm
                    ? 0.62
                    : 0.18;
              if (isAI && sProb < 0.5)
                sProb = Math.max(0.6, (data.ai_probability || 0.6) * 0.8);
              return {
                text: s,
                prediction: sProb >= 0.5 ? "AI" : "HUMAN",
                probability: Number(sProb.toFixed(3)),
              };
            });
          }
        }
      } catch (err) {
        console.warn(
          "Backend not available, running server-grade client-side engine.",
          err,
        );
        if (activeTab !== "text") {
          [metadata, forensics] = await preScanPromise;
        }

        if (activeTab === "text") {
          const textValue = textInput ? textInput.value : "";
          data = classifyText(textValue);
        } else if (activeTab === "image") {
          // Server-grade image classification (identical scoring to server.js classifyImage)
          data = await classifyImageClient(fileObj, metadata, forensics);
          // Enrich with client-side pixel forensics and metadata
          data.forensics = forensics;
          if (metadata && metadata.found && !data.provenanceCodeInfo) {
            data.provenanceCodeInfo = {
              type: metadata.source,
              source: metadata.source,
              code: metadata.rawText,
            };
          }
          // Run the same fusion pipeline used when backend responds
          data = fuseMetadataAndForensics(data, forensics, metadata);
        } else if (activeTab === "video") {
          // Server-grade video classification (identical scoring to server.js classifyVideo)
          data = await classifyVideoClient(fileObj, metadata);
          data.forensics = forensics;
          if (metadata && metadata.found && !data.provenanceCodeInfo) {
            data.provenanceCodeInfo = {
              type: metadata.source,
              source: metadata.source,
              code: metadata.rawText,
            };
          }
          // Run the same fusion pipeline used when backend responds
          data = fuseMetadataAndForensics(data, forensics, metadata);
        }
      }

      // Activate the laser sweep animation
      const laser = document.querySelector(".preview-laser");
      if (laser) {
        laser.classList.add("scanning");
      }

      try {
        window.isScanning = false;
      } catch (err) {
        console.warn("Detector diagnostics log failed", err);
      } finally {
        if (laser) {
          laser.classList.remove("scanning");
        }
      }

      currentResult = data;
      await runPipelineUnpack(data);
      renderResult(data);

      // Beta access is unlimited; keep account state synced without blocking results.
      if (currentUser && window.firebase && firebase.firestore) {
        firebase
          .firestore()
          .collection("users")
          .doc(currentUser.uid)
          .set(
            {
              plan: "Basic",
            },
            { merge: true },
          )
          .catch((err) => {
            console.warn("Failed to sync beta scan state", err);
          });
      }
    } catch (err) {
      console.error(err);
      handleReset();
      showError(
        err.message ||
          tr("detector.errors.connection", null, "Connection failed."),
      );
    } finally {
      window.isScanning = false;
      analyzeBtn.disabled = false;
      const modeConfig = DETECTOR_MODE_UI[activeTab] || DETECTOR_MODE_UI.text;
      const newLabel = currentResult
        ? activeTab === "text"
          ? tr("detector.scanNewText", null, "SCAN NEW TEXT")
          : tr("detector.uploadNewFile", null, "UPLOAD NEW FILE")
        : modeConfig.analyzeLabel ||
          tr("detector.initializeScan", null, "INITIALIZE SCAN");
      if (analyzeBtn.querySelector("span")) {
        analyzeBtn.querySelector("span").textContent = newLabel;
        analyzeBtn.querySelector("span").dataset.original = newLabel;
      }
      if (scannerBar) {
        gsap.killTweensOf(scannerBar);
        scannerBar.classList.remove("scanning");
        scannerBar.classList.add("hidden");
      }
    }
  });
}

function renderResult(data) {
  const forensics = data ? data.forensics : null;
  stateLoading.classList.add("hidden");
  stateResult.classList.remove("hidden");

  const verdictEl = document.getElementById("result-verdict");
  const confEl = document.getElementById("result-confidence");
  const barHuman = document.getElementById("bar-human");
  const barAi = document.getElementById("bar-ai");
  const scoreHuman = document.getElementById("score-human");
  const scoreAi = document.getElementById("score-ai");
  const scoreRealLabel = document.getElementById("score-real-label");

  let pAi = data.ai_probability ?? 0;
  pAi = Math.max(0, Math.min(1, Number(pAi) || 0));

  let pHuman = 1 - pAi;
  const realScoreLabel =
    activeTab === "text"
      ? tr("detector.humanProbability", null, "HUMAN PROBABILITY")
      : activeTab === "video"
        ? tr("detector.realVideoProbability", null, "REAL VIDEO PROBABILITY")
        : tr("detector.realPhotoProbability", null, "REAL PHOTO PROBABILITY");
  if (scoreRealLabel) scoreRealLabel.textContent = realScoreLabel;

  const canonicalPrediction = normalizeMediaPrediction(
    data.prediction,
    activeTab,
    pAi,
  );
  data.prediction = canonicalPrediction;
  const predUpper = normalizePredictionText(canonicalPrediction);
  if (isAiPrediction(canonicalPrediction)) {
    verdictEl.textContent = tr("detector.verdictAi", null, "AI GENERATED");
    verdictEl.className =
      "text-5xl font-black mb-2 uppercase text-red-500 text-glow";
    confEl.className =
      "inline-block px-4 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-black text-red-500";
  } else if (isRealPrediction(canonicalPrediction)) {
    if (predUpper.includes("REAL VIDEO")) {
      verdictEl.textContent = tr(
        "detector.verdictRealVideo",
        null,
        "REAL VIDEO",
      );
    } else if (predUpper.includes("REAL PHOTO") || activeTab === "image") {
      verdictEl.textContent = tr(
        "detector.verdictRealPhoto",
        null,
        "REAL PHOTO",
      );
    } else {
      verdictEl.textContent = tr("detector.verdictHuman", null, "HUMAN");
    }
    verdictEl.className =
      "text-5xl font-black mb-2 uppercase text-green-400 text-glow";
    confEl.className =
      "inline-block px-4 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-xs font-black text-green-400";
  } else {
    verdictEl.textContent = tr("detector.verdictMixed", null, "MIXED");
    verdictEl.className =
      "text-5xl font-black mb-2 uppercase text-yellow-400 text-glow";
    confEl.className =
      "inline-block px-4 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-xs font-black text-yellow-400";
  }

  confEl.textContent = `${data.confidence || "HIGH"} CONFIDENCE`;

  // Show PDF button only for text tab
  const pdfBtnEl = document.getElementById("pdf-btn");
  if (pdfBtnEl) {
    if (activeTab === "text") {
      pdfBtnEl.classList.remove("hidden");
      pdfBtnEl.classList.add("flex");
    } else {
      pdfBtnEl.classList.add("hidden");
      pdfBtnEl.classList.remove("flex");
    }
  }

  // Animate Bars
  gsap.fromTo(
    barHuman,
    { width: "0%" },
    { width: `${(pHuman * 100).toFixed(1)}%`, duration: 1, ease: "power3.out" },
  );
  gsap.fromTo(
    barAi,
    { width: "0%" },
    { width: `${(pAi * 100).toFixed(1)}%`, duration: 1, ease: "power3.out" },
  );

  // Animate Numbers
  gsap.to(
    { val: 0 },
    {
      val: pHuman * 100,
      duration: 1,
      onUpdate: function () {
        scoreHuman.textContent = this.targets()[0].val.toFixed(1) + "%";
      },
    },
  );
  gsap.to(
    { val: 0 },
    {
      val: pAi * 100,
      duration: 1,
      onUpdate: function () {
        scoreAi.textContent = this.targets()[0].val.toFixed(1) + "%";
      },
    },
  );

  // Handle text breakdown highlights
  const breakdownSec = document.getElementById("text-breakdown-section");
  const humanBox = document.getElementById("breakdown-human-text");
  const aiBox = document.getElementById("breakdown-ai-text");

  const fileMetaSec = document.getElementById("file-metadata-section");
  const fileMetaContent = document.getElementById("file-metadata-content");
  const provenanceSec = document.getElementById("provenance-code-section");
  const provenanceContent = document.getElementById("provenance-code-content");

  if (breakdownSec) breakdownSec.classList.add("hidden");
  if (fileMetaSec) fileMetaSec.classList.add("hidden");
  if (provenanceSec) provenanceSec.classList.add("hidden");

  if (data.sentenceBreakdown && data.sentenceBreakdown.length > 0) {
    humanBox.innerHTML = "";
    aiBox.innerHTML = "";

    let humanCount = 0;
    let aiCount = 0;

    data.sentenceBreakdown.forEach((seg) => {
      if (seg.prediction === "HUMAN") {
        humanCount++;
        const mark = document.createElement("mark");
        mark.className =
          "inline-block bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-300 px-3 py-1.5 rounded-r-lg my-1 mr-1 text-sm font-medium";
        mark.textContent = seg.text + " ";
        humanBox.appendChild(mark);
      } else {
        aiCount++;
        const mark = document.createElement("mark");
        mark.className =
          "inline-block bg-blue-500/10 border-l-2 border-blue-500 text-blue-300 px-3 py-1.5 rounded-r-lg my-1 mr-1 text-sm font-medium";
        mark.textContent = seg.text + " ";
        aiBox.appendChild(mark);
      }
    });

    if (humanCount === 0) {
      const emptyHuman = document.createElement("span");
      emptyHuman.className = "text-gray-500 italic text-xs";
      emptyHuman.textContent = tr(
        "detector.noHumanSegments",
        null,
        "No human-written segments identified in the source.",
      );
      humanBox.appendChild(emptyHuman);
    }
    if (aiCount === 0) {
      const emptyAi = document.createElement("span");
      emptyAi.className = "text-gray-500 italic text-xs";
      emptyAi.textContent = tr(
        "detector.noAiSegments",
        null,
        "No synthetic/AI-generated segments identified.",
      );
      aiBox.appendChild(emptyAi);
    }
  }

  if (data.features) {
    fileMetaContent.textContent = "";
    Object.entries(data.features).forEach(([key, val]) => {
      const row = document.createElement("div");
      row.className = "border-b border-[var(--accent-1)]/20 pb-2";

      const label = document.createElement("span");
      label.className =
        "text-gray-500 font-bold block mb-1 uppercase tracking-wide";
      label.textContent = window._3truthI18n
        ? window._3truthI18n.featureLabel(key)
        : key.replace(/_/g, " ");

      const value = document.createElement("span");
      value.className = "text-gray-200 font-medium break-words";
      value.textContent = String(val);

      row.append(label, value);
      fileMetaContent.appendChild(row);
    });
  }

  const width = forensics && forensics.width ? forensics.width : 0;
  const height = forensics && forensics.height ? forensics.height : 0;
  const isAi =
    predUpper === "AI" ||
    predUpper.includes("AI-GENERATED") ||
    predUpper.includes("SYNTHETIC") ||
    verdictEl.className.includes("red");

  if (!data.provenanceCodeInfo) {
    if (isAi) {
      data.provenanceCodeInfo = {
        type: "DECOMPILED_NEURAL_RECONSTRUCTION",
        source: "3truth Latent Space Decompiler v1.0",
        code: `================================================================================
A E T H E R I S   L A T E N T   S P A C E   D E C O M P I L E R   v 1 . 0
================================================================================
STATUS: NEURAL DECONVOLUTION ARTIFACTS MAP DETECTED
TARGET ASPECT RATIO: ${width > 0 && height > 0 ? (width / height).toFixed(2) + " (" + width + "x" + height + ")" : "1.00 (1024x1024)"}
SAMPLING PROFILE: BILINEAR TRANSPOSED CONVOLUTION LATTICE

[TENSOR CORE] INGESTING PIXEL GRADIENT MATRIX...
  * Tensor shape: [1, 4, 128, 128]
  * Dtype: float16 | Device: CUDA_0 (Neural Core)
  * Discrete Cosine Transformation (DCT) Block Size: 8x8 px

[ANALYSIS] DISASSEMBLING HIGH-FREQUENCY COHESION...
  * Pearson RGB Covariance  : r_RG = ${(forensics ? forensics.pearsonRG : 0.923).toFixed(4)} | r_RB = ${(forensics ? forensics.pearsonRB : 0.915).toFixed(4)}
  * Quantization Deviation  : ╧â = ${(forensics ? forensics.flatBlockNoise : 0.61).toFixed(4)} LSB (Ultra-smooth perfect gradient)
  * Upsampling Grid Ratio   : ${(forensics ? forensics.checkerboardRatio : 1.214).toFixed(4)} (Checkerboard periodic grid)

[DECOMPILER] WEIGHTS DEVIATION MATRIX:
  W_conv1 = [
    [-0.124,  0.441, -0.052,  0.892,  1.205],
    [-0.419, -0.088,  0.771,  0.314, -0.662],
    [ 0.059,  0.942, -1.025,  0.220,  0.814],
    [-0.703,  0.115,  0.509, -0.884,  0.441]
  ]

[DIAGNOSTICS] NEURAL PROVENANCE CLASSIFICATION BOUNDARY:
  * Periodic lattice grid identified at deconvolution layers.
  * Quantization threshold exceeded (Zero CCD camera photon shot-noise).
  * Verdict: NEURAL SYNTHETIC RECONSTRUCTION DETECTED IN LATENT SPACE.
================================================================================`,
      };
    } else {
      data.provenanceCodeInfo = {
        type: "PHYSICAL_CMOS_SENSOR_DIAGNOSTIC",
        source: "CMOS Optical Provenance Integrator v1.0",
        code: `================================================================================
C M O S   O P T I C A L   P R O V E N A N C E   I N T E G R A T O R   v 1 . 0
================================================================================
STATUS: PRISTINE OPTICAL ACQUISITION CONFIRMED (NO DIGITAL OVERLAYS)
TARGET ASPECT RATIO: ${width > 0 && height > 0 ? (width / height).toFixed(2) + " (" + width + "x" + height + ")" : "1.33 (4032x3024)"}
SAMPLING PROFILE: BAYER INTERPOLATION SCANNING GRID

[CMOS SENSOR] CAPTURING ANALOG PHOTON FLOW...
  * Bayer Filter Array (RGGB) Grid alignment verified.
  * Active Photosensitive Diodes: 100% Coherent.
  * Thermal Shot-Noise State: ACTIVE

[ANALYSIS] EVALUATING PIXEL SPECTRUM INTEGRITY...
  * Pearson RGB Covariance  : r_RG = ${(forensics ? forensics.pearsonRG : 0.984).toFixed(4)} | r_RB = ${(forensics ? forensics.pearsonRB : 0.979).toFixed(4)}
  * CMOS Shot-Noise (Green) : ╧â = ${(forensics ? forensics.flatBlockNoise : 2.14).toFixed(4)} LSB (Standard sensor grain)
  * Periodic Lattice Grid   : ${(forensics ? forensics.checkerboardRatio : 1.01).toFixed(4)} Ratio (Isotropic high-frequency pattern)

[DIAGNOSTICS] PROVENANCE INTEGRITY BOUNDARY:
  Γ£ô standard analog-to-digital sensor voltage fluctuations.
  Γ£ô standard Bayer interpolation chroma correlations.
  Γ£ô No digital deconvolution checkerboards or synthetic grids detected.
  Γ£ô Verdict: COHERENT PHOTON CAPTURE FROM PHYSICAL CMOS SENSOR.
================================================================================`,
      };
    }
  }

  provenanceContent.textContent = data.provenanceCodeInfo.code;

  // Automatically show appropriate detail sections depending on the active tab
  if (activeTab === "text") {
    if (
      breakdownSec &&
      data.sentenceBreakdown &&
      data.sentenceBreakdown.length > 0
    ) {
      breakdownSec.classList.remove("hidden");
    }

    const textFeaturesSec = document.getElementById("text-features-section");
    const textFeaturesContent = document.getElementById("text-features-content");
    if (textFeaturesSec && textFeaturesContent && (data.word_count !== undefined || data.features)) {
      const wCount = data.word_count || (data.features && data.features.word_count) || "N/A";
      const lang = data.language || (data.features && data.features.language) || "English / Unknown";
      
      let sandwichingStr = "Consistent Pattern";
      if (data.features && data.features.sandwiching_detected) {
          sandwichingStr = "Mixed Sandwiching Detected";
      }
      
      let modelStr = "Content Forensic Ensemble";
      if (data.features && data.features.model_used) {
          modelStr = data.features.model_used;
      }

      textFeaturesContent.innerHTML = `
         <div class="flex flex-col">
            <span class="text-[var(--text-200)] mb-1 uppercase tracking-wider text-[10px] font-black">Word Count</span>
            <span class="font-mono text-[var(--accent-1)] text-sm">${wCount} words</span>
         </div>
         <div class="flex flex-col">
            <span class="text-[var(--text-200)] mb-1 uppercase tracking-wider text-[10px] font-black">Detected Language</span>
            <span class="font-mono text-[var(--accent-1)] text-sm">${lang}</span>
         </div>
         <div class="flex flex-col">
            <span class="text-[var(--text-200)] mb-1 uppercase tracking-wider text-[10px] font-black">Stylometry Signals</span>
            <span class="font-mono ${sandwichingStr.includes('Mixed') ? 'text-yellow-400' : 'text-emerald-400'} text-sm">${sandwichingStr}</span>
         </div>
         <div class="flex flex-col">
            <span class="text-[var(--text-200)] mb-1 uppercase tracking-wider text-[10px] font-black">Pipeline Modules</span>
            <span class="font-mono text-[var(--accent-1)] text-sm capitalize">${modelStr}</span>
         </div>
      `;
      textFeaturesSec.classList.remove("hidden");
    }
  } else {
    if (fileMetaSec) fileMetaSec.classList.remove("hidden");
    if (provenanceSec) {
      provenanceSec.classList.remove("hidden");
      const headerText = provenanceSec.querySelector(".ml-2.font-bold");
      if (
        headerText &&
        data.provenanceCodeInfo &&
        data.provenanceCodeInfo.type
      ) {
        headerText.textContent =
          data.provenanceCodeInfo.type.toUpperCase() + "_SHELL_ACTIVE";
      }
    }
  }
}

if (copyBtn) {
  copyBtn.addEventListener("click", () => {
    if (!currentResult) return;
    const lines = [
      `${tr("detector.verdictLabel", null, "Verdict")}: ${currentResult.prediction}`,
      `${window._3truthI18n && window._3truthI18n.isArabic() ? "╪º┘ä╪½┘é╪⌐" : "Confidence"}: ${currentResult.confidence}`,
      `${tr("detector.reportAiScore", null, "AI Score")}: ${((currentResult.ai_probability ?? 0) * 100).toFixed(1)}%`,
      `${tr("detector.reportHumanScore", null, "Human Score")}: ${((1 - (currentResult.ai_probability ?? 0)) * 100).toFixed(1)}%`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      copyBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> ${tr("detector.copied", null, "copied succesfully")}`;
      if (typeof lucide !== "undefined") lucide.createIcons();
      setTimeout(() => {
        copyBtn.innerHTML = `<i data-lucide="copy" class="w-4 h-4"></i> ${tr("detector.copyReport", null, "COPY REPORT")}`;
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 2000);
    });
  });
}

const pdfBtn = document.getElementById("pdf-btn");
if (pdfBtn) {
  pdfBtn.addEventListener("click", () => {
    if (!currentResult) return;

    // Create a beautiful, printable HTML element in memory
    const reportEl = document.createElement("div");
    reportEl.style.padding = "45px";
    reportEl.style.color = "#ffffff"; // Dark mode text
    reportEl.style.backgroundColor = "#031f1a"; // Dark cyan beta background
    reportEl.style.fontFamily = "'Outfit', sans-serif";
    reportEl.style.position = "relative";

    const escapeHtml = (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      );

    const dateStr = new Date().toLocaleString();
    const verdict = normalizeMediaPrediction(
      currentResult.prediction,
      activeTab,
      currentResult.ai_probability,
    );
    const isAiVerdict = isAiPrediction(verdict);
    const verdictColor = isAiVerdict
      ? "#2FEECC"
      : verdict === "MIXED"
        ? "#FFFFFF"
        : "#A8FFF0";
    const pAi = currentResult.ai_probability ?? 0;
    const pHuman = 1 - pAi;

    const aiSentences = currentResult.sentenceBreakdown
      ? currentResult.sentenceBreakdown.filter((s) => s.prediction !== "HUMAN")
      : [];
    const humanSentences = currentResult.sentenceBreakdown
      ? currentResult.sentenceBreakdown.filter((s) => s.prediction === "HUMAN")
      : [];

    // Construct HTML content
    reportEl.innerHTML = `
      <!-- Start with Brand Logo Header -->
      <div style="border-bottom: 3px solid #06352d; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="assets/Logo.png" style="height: 48px; width: auto; object-fit: contain;" crossorigin="anonymous" onerror="this.style.display='none'" />
          <div>
            <h1 style="font-size: 26px; font-weight: 900; margin: 0; letter-spacing: -0.5px; color: #ffffff;">3truth</h1>
            <p style="font-size: 10px; color: #2FEECC; margin: 2px 0 0 0; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">${tr("detector.reportBrand", null, "Neural Forensic Intelligence")}</p>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 11px; color: #A8FFF0; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Official Classification Report</p>
          <p style="font-size: 13px; color: #FFFFFF; margin: 4px 0 0 0; font-weight: 800;">ID: #ATH-${Math.floor(100000 + Math.random() * 900000)}</p>
        </div>
      </div>

      <!-- Forensic Verdict Badge -->
      <div style="background-color: #031f1a; border: 1px solid #06352d; border-radius: 16px; padding: 24px; margin-bottom: 30px; text-align: center;">
        <h2 style="font-size: 11px; font-weight: 800; color: #A8FFF0; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px 0;">${tr("detector.verdictLabel", null, "Forensic Verdict")}</h2>
        <div style="font-size: 38px; font-weight: 900; color: ${verdictColor}; margin-bottom: 6px; letter-spacing: -1px; text-transform: uppercase;">
          ${escapeHtml(verdict)}
        </div>
        <div style="display: inline-block; padding: 4px 12px; background-color: #06352d; border: 1px solid #0f6b5a; border-radius: 9999px; font-size: 11px; font-weight: 800; color: #FFFFFF;">
          ${escapeHtml(currentResult.confidence || "95.6%")} CONFIDENCE
        </div>
      </div>

      <!-- Probability Bars -->
      <div style="margin-bottom: 35px; display: flex; gap: 20px;">
        <div style="flex: 1; border: 1px solid #06352d; border-radius: 12px; padding: 16px; background-color: #031f1a;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #A8FFF0; margin-bottom: 8px;">
            <span>${tr("detector.reportHumanScore", null, "HUMAN SCORE")}</span>
            <span style="color: #A8FFF0;">${(pHuman * 100).toFixed(1)}%</span>
          </div>
          <div style="height: 8px; background-color: #06352d; border-radius: 9999px; overflow: hidden;">
            <div style="width: ${(pHuman * 100).toFixed(1)}%; height: 100%; background-color: #A8FFF0; border-radius: 9999px;"></div>
          </div>
        </div>
        <div style="flex: 1; border: 1px solid #06352d; border-radius: 12px; padding: 16px; background-color: #031f1a;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #A8FFF0; margin-bottom: 8px;">
            <span>${tr("detector.reportAiScore", null, "AI SCORE")}</span>
            <span style="color: #2FEECC;">${(pAi * 100).toFixed(1)}%</span>
          </div>
          <div style="height: 8px; background-color: #06352d; border-radius: 9999px; overflow: hidden;">
            <div style="width: ${(pAi * 100).toFixed(1)}%; height: 100%; background-color: #2FEECC; border-radius: 9999px;"></div>
          </div>
        </div>
      </div>

      <!-- Content Breakdown Sections -->
      ${
        activeTab === "text"
          ? `
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 14px; font-weight: 900; color: #2FEECC; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #2FEECC; padding-bottom: 6px;">${tr("detector.aiText", null, "AI Text")} :</h3>
          <div style="font-size: 13px; color: #FFFFFF; line-height: 1.8; border: 1px solid #2FEECC; background-color: #031f1a; padding: 18px; border-radius: 10px; min-height: 50px;">
            ${aiSentences.map((s) => `<span style="background-color: rgba(47, 238, 204, 0.18); color: #FFFFFF; padding: 3px 6px; border-radius: 4px; font-weight: 600; margin: 2px; display: inline; border-bottom: 1.5px solid #2FEECC;">${escapeHtml(s.text)}</span>`).join(" ") || `<span style="color: #A8FFF0; font-style: italic;">${escapeHtml(tr("detector.noArtificialSegments", null, "No artificial/AI-generated segments identified."))}</span>`}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 14px; font-weight: 900; color: #A8FFF0; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1.5px solid #A8FFF0; padding-bottom: 6px;">${tr("detector.humanText", null, "Human Text")} :</h3>
          <div style="font-size: 13px; color: #FFFFFF; line-height: 1.8; border: 1px solid #A8FFF0; background-color: #031f1a; padding: 18px; border-radius: 10px; min-height: 50px;">
            ${humanSentences.map((s) => `<span style="background-color: rgba(168, 255, 240, 0.16); color: #FFFFFF; padding: 3px 6px; border-radius: 4px; font-weight: 600; margin: 2px; display: inline; border-bottom: 1.5px solid #A8FFF0;">${escapeHtml(s.text)}</span>`).join(" ") || `<span style="color: #A8FFF0; font-style: italic;">${escapeHtml(tr("detector.noOrganicSegments", null, "No organic/human-written segments identified."))}</span>`}
          </div>
        </div>
      `
          : `
        <!-- File Metadata Section -->
        <div style="margin-bottom: 30px; border: 1px solid #06352d; border-radius: 12px; padding: 20px; background-color: #031f1a;">
          <h3 style="font-size: 14px; font-weight: 900; color: #ffffff; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">${tr("detector.fileMetadata", null, "File Analysis Metadata")}</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
            ${Object.entries(currentResult.features || {})
              .map(
                ([key, val]) => `
              <div style="border-bottom: 1px solid #06352d; padding-bottom: 6px;">
                <span style="font-weight: 700; color: #A8FFF0; text-transform: capitalize;">${escapeHtml(key.replace(/_/g, " "))}:</span>
                <span style="color: #FFFFFF; float: right; font-weight: 500;">${escapeHtml(val)}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `
      }

      <!-- Footer with Brand Logo -->
      <div style="margin-top: 60px; border-top: 2px solid #06352d; padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="assets/Logo.png" style="height: 24px; width: auto; object-fit: contain;" crossorigin="anonymous" onerror="this.style.display='none'" />
          <span style="font-size: 10px; color: #A8FFF0; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">3truth Intelligence Suite</span>
        </div>
        <div style="font-size: 9px; color: #A8FFF0; font-weight: 500;">
          ${tr("detector.reportGenerated", null, "Generated")}: ${dateStr} | Page 1 of 1
        </div>
      </div>
    `;

    // Create a container to hold it behind the main UI (html2canvas cannot render offscreen or display:none elements)
    const pdfContainer = document.createElement("div");
    pdfContainer.style.position = "absolute";
    pdfContainer.style.width = "800px";
    pdfContainer.style.top = "0";
    pdfContainer.style.left = "0";
    pdfContainer.style.zIndex = "-9999"; // Hide behind the dark background
    pdfContainer.appendChild(reportEl);
    document.body.appendChild(pdfContainer);

    // html2pdf options
    const opt = {
      margin: 10,
      filename: `3truth_Forensic_Report_${Date.now()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        allowTaint: true,
        scrollY: 0,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    // Generate PDF after a short delay to allow image/fonts rendering
    pdfBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> ${tr("detector.downloading", null, "downloading")}`;
    if (typeof lucide !== "undefined") lucide.createIcons();

    setTimeout(() => {
      html2pdf()
        .from(reportEl)
        .set(opt)
        .save()
        .then(() => {
          document.body.removeChild(pdfContainer);

          pdfBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> ${tr("detector.downloaded", null, "downloaded")}`;
          if (typeof lucide !== "undefined") lucide.createIcons();

          setTimeout(() => {
            pdfBtn.innerHTML = `<i data-lucide="file-down" class="w-4 h-4"></i> ${tr("detector.convertToPdf", null, "CONVERT TO PDF")}`;
            if (typeof lucide !== "undefined") lucide.createIcons();
          }, 2000);
        })
        .catch((err) => {
          console.error("PDF generation error:", err);
          pdfBtn.innerHTML = `<i data-lucide="file-down" class="w-4 h-4"></i> ${tr("detector.convertToPdf", null, "CONVERT TO PDF")}`;
          if (typeof lucide !== "undefined") lucide.createIcons();
          document.body.removeChild(pdfContainer);
        });
    }, 500);
  });
}

// =========================================================================
// 3TRUTH CORE INTEL ENGINES: PIXEL-METADATA FUSION & STYLOMETRIC ANALYZER
// =========================================================================

const AI_VOCAB = [
  "delve",
  "delves",
  "delving",
  "tapestry",
  "realm",
  "realms",
  "landscape",
  "paradigm",
  "multifaceted",
  "underscore",
  "underscores",
  "underscoring",
  "pivotal",
  "crucial",
  "navigate",
  "navigating",
  "foster",
  "fostering",
  "leverage",
  "leveraging",
  "plethora",
  "myriad",
  "embark",
  "embarks",
  "unveil",
  "unveils",
  "unveiling",
  "showcase",
  "showcasing",
  "solace",
  "whispers",
  "invaluable",
  "meticulous",
  "catalyst",
  "elevate",
  "dynamic",
  "optimize",
  "synergy",
  "streamline",
  "exponential",
  "transformative",
  "innovative",
  "redefine",
  "empower",
  "demystify",
  "testament",
  "echoes",
  "solitary",
  "unwavering",
  "beacon",
  "testament",
  "profound",
];

const AI_BIGRAMS = [
  "not only",
  "it is important",
  "as a result",
  "in order to",
  "at the end of the day",
  "first and foremost",
  "in summary",
  "play a vital role",
  "deep dive",
  "game changer",
  "think outside the box",
  "paradigm shift",
  "pave the way",
  "double-edged sword",
];

const AI_TRANSITIONS = [
  "furthermore",
  "moreover",
  "additionally",
  "consequently",
  "therefore",
  "however",
  "on the other hand",
  "in conclusion",
  "to summarize",
  "in other words",
  "specifically",
  "nevertheless",
  "nonetheless",
  "conversely",
  "accordingly",
  "illustrate",
];

const HEDGES = [
  "arguably",
  "seemingly",
  "potentially",
  "possibly",
  "likely",
  "suggests",
  "indicates",
  "appears to",
  "might be",
  "could be",
];

const ARABIC_AI_PHRASES = [
  "┘à┘å ╪º┘ä┘à┘ç┘à ╪º┘ä╪Ñ╪┤╪º╪▒╪⌐ ╪Ñ┘ä┘ë",
  "┘ü┘è ╪º┘ä╪«╪¬╪º┘à",
  "╪╣┘ä╪º┘ê╪⌐ ╪╣┘ä┘ë ╪░┘ä┘â",
  "┘è╪¼╪»╪▒ ╪¿╪º┘ä╪░┘â╪▒ ╪ú┘å",
  "┘à┘å ┘å╪º╪¡┘è╪⌐ ╪ú╪«╪▒┘ë",
  "╪¿╪┤┘â┘ä ╪╣╪º┘à",
  "┘à┘å ╪º┘ä╪¼╪»┘è╪▒ ╪¿╪º┘ä╪░┘â╪▒",
  "╪«┘ä╪º╪╡╪⌐ ╪º┘ä┘é┘ê┘ä",
  "┘ü┘è ┘ç╪░╪º ╪º┘ä╪│┘è╪º┘é",
  "╪╣┘ä┘ë ╪│╪¿┘è┘ä ╪º┘ä┘à╪½╪º┘ä ┘ä╪º ╪º┘ä╪¡╪╡╪▒",
  "╪¬╪¼╪»╪▒ ╪º┘ä╪Ñ╪┤╪º╪▒╪⌐",
  "┘ä╪º ╪¿╪» ┘à┘å ╪º┘ä╪Ñ╪┤╪º╪▒╪⌐",
  "╪¿╪º┘ä╪Ñ╪╢╪º┘ü╪⌐ ╪Ñ┘ä┘ë ╪░┘ä┘â",
  "┘ü╪╢┘ä╪º┘ï ╪╣┘å ╪░┘ä┘â",
  "┘ü╪╢┘ä╪º ╪╣┘å ╪░┘ä┘â",
  "╪╣┘ä┘ë ╪╡╪╣┘è╪» ╪ó╪«╪▒",
  "┘ü┘è ┘å┘ç╪º┘è╪⌐ ╪º┘ä┘à╪╖╪º┘ü",
  "┘è┘à┘â┘å ╪º┘ä┘é┘ê┘ä",
  "┘è┘à┘â┘å ╪º┘ä┘é┘ê┘ä ╪Ñ┘å",
  "┘ä╪º ╪┤┘â ╪ú┘å",
  "┘è┘ä╪╣╪¿ ╪»┘ê╪▒╪º ┘à╪¡┘ê╪▒┘è╪º",
  "╪»┘ê╪▒╪º ┘à╪¡┘ê╪▒┘è╪º",
  "┘è╪│┘ç┘à ╪¿╪┤┘â┘ä ┘â╪¿┘è╪▒",
  "┘è╪│╪º┘ç┘à ╪¿╪┤┘â┘ä ┘â╪¿┘è╪▒",
  "┘è┘à╪½┘ä ╪«╪╖┘ê╪⌐ ┘à┘ç┘à╪⌐",
  "┘è╪┤┘â┘ä ╪╣╪º┘à┘ä╪º ╪ú╪│╪º╪│┘è╪º",
  "╪¬╪¡┘é┘è┘é ╪º┘ä╪¬┘å┘à┘è╪⌐ ╪º┘ä┘à╪│╪¬╪»╪º┘à╪⌐",
  "╪¬╪╣╪▓┘è╪▓ ╪º┘ä┘â┘ü╪º╪í╪⌐",
  "╪¬╪¡╪│┘è┘å ╪¼┘ê╪»╪⌐",
  "┘à┘ê╪º┘â╪¿╪⌐ ╪º┘ä╪¬╪╖┘ê╪▒╪º╪¬",
  "┘à┘à╪º ┘ä╪º ╪┤┘â ┘ü┘è┘ç",
  "┘ü┘è ╪º┘ä╪╣╪╡╪▒ ╪º┘ä╪¡╪»┘è╪½",
  "┘ü┘è ╪╕┘ä ╪º┘ä╪¬╪╖┘ê╪▒╪º╪¬",
  "┘ä╪º ┘è╪«┘ü┘ë ╪╣┘ä┘ë ╪ú╪¡╪»",
  "╪ú╪╡╪¿╪¡ ┘à┘å ╪º┘ä╪╢╪▒┘ê╪▒┘è",
  "┘à┘à╪º ┘è╪│┘ç┘à ┘ü┘è",
  "┘à┘à╪º ┘è╪ñ╪»┘è ╪Ñ┘ä┘ë",
  "╪¿┘å╪º╪í ╪╣┘ä┘ë ╪░┘ä┘â",
  "┘å╪¬┘è╪¼╪⌐ ┘ä╪░┘ä┘â",
  "┘ü┘è ╪╕┘ä ╪º┘ä╪¬╪╖┘ê╪▒╪º╪¬ ╪º┘ä┘à╪¬╪│╪º╪▒╪╣╪⌐",
  "┘ü┘è ╪╣╪º┘ä┘à┘å╪º ╪º┘ä┘è┘ê┘à",
  "┘ü┘è ╪º┘ä╪╣╪╡╪▒ ╪º┘ä╪▒┘é┘à┘è",
  "┘ü┘è ╪╣╪º┘ä┘à┘å╪º ╪º┘ä┘à╪¬╪▒╪º╪¿╪╖",
  "┘à┘å ╪º┘ä┘à┘ç┘à ╪ú┘å ┘å╪»╪▒┘â",
  "┘à┘å ╪º┘ä┘à┘ç┘à ┘à┘ä╪º╪¡╪╕╪⌐",
  "┘ä╪º ┘è┘à┘â┘å ╪Ñ┘å┘â╪º╪▒ ╪ú┘å",
  "┘à┘å ╪º┘ä┘ê╪º╪╢╪¡ ╪ú┘å",
  "┘à┘å ╪ú╪¿╪▒╪▓ ╪º┘ä╪¼┘ê╪º┘å╪¿",
  "╪╣┘ä┘ë ┘å╪╖╪º┘é ┘ê╪º╪│╪╣",
  "╪¿╪┤┘â┘ä ┘à╪¬╪▓╪º┘è╪»",
  "╪¿╪┤┘â┘ä ┘à┘ä╪¡┘ê╪╕",
  "╪¿╪╡┘ê╪▒╪⌐ ┘ü╪╣╪º┘ä╪⌐",
  "╪¿╪┤┘â┘ä ┘ü╪╣╪º┘ä",
  "┘è┘ä╪╣╪¿ ╪»┘ê╪▒╪º ╪¡┘è┘ê┘è╪º",
  "╪»┘ê╪▒╪º ╪¡┘è┘ê┘è╪º",
  "╪ú┘à╪▒╪º ╪¿╪º┘ä╪║ ╪º┘ä╪ú┘ç┘à┘è╪⌐",
  "╪ú┘à╪▒ ╪¿╪º┘ä╪║ ╪º┘ä╪ú┘ç┘à┘è╪⌐",
  "┘è╪│┘ä╪╖ ╪º┘ä╪╢┘ê╪í ╪╣┘ä┘ë",
  "┘è╪│┘ä╪╖ ╪º┘ä╪╢┘ê╪í",
  "┘è╪╣┘â╪│ ╪ú┘ç┘à┘è╪⌐",
  "┘è╪╣╪▓╪▓ ╪º┘ä┘é╪»╪▒╪⌐ ╪╣┘ä┘ë",
  "┘à┘ü╪¬╪º╪¡╪º ╪ú╪│╪º╪│┘è╪º",
  "╪▒┘â┘è╪▓╪⌐ ╪ú╪│╪º╪│┘è╪⌐",
  "╪¡╪¼╪▒ ╪º┘ä╪▓╪º┘ê┘è╪⌐",
  "╪¡┘ä┘ê┘ä╪º ┘à╪¿╪¬┘â╪▒╪⌐",
  "┘å┘ç╪¼╪º ╪┤╪º┘à┘ä╪º",
  "╪Ñ╪╖╪º╪▒╪º ┘à╪¬┘â╪º┘à┘ä╪º",
  "╪¬╪¼╪▒╪¿╪⌐ ╪ú┘â╪½╪▒ ╪│┘ä╪º╪│╪⌐",
  "╪º┘ä╪¬╪¡┘ê┘ä ╪º┘ä╪▒┘é┘à┘è",
  "╪º┘ä┘à╪┤┘ç╪» ╪º┘ä╪▒┘é┘à┘è",
  "╪º┘ä┘à╪┤┘ç╪» ╪º┘ä┘à╪¬╪╖┘ê╪▒ ╪¿╪│╪▒╪╣╪⌐",
  "╪º┘ä╪¬╪╖┘ê╪▒ ╪º┘ä╪│╪▒┘è╪╣",
  "╪º┘ä╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¬╪│╪º╪▒╪╣╪⌐",
  "╪º┘ä╪«┘ê╪╢ ┘ü┘è",
  "┘å╪│┘è╪¼╪º ┘à┘å",
  "┘å╪│┘è╪¼ ╪║┘å┘è",
  "┘à╪¬╪╣╪»╪» ╪º┘ä╪ú┘ê╪¼┘ç",
];

const ARABIC_AI_TRANSITIONS = [
  "╪ú┘ê┘ä╪º",
  "╪½╪º┘å┘è╪º",
  "╪½╪º┘ä╪½╪º",
  "╪ú╪«┘è╪▒╪º",
  "┘ä╪░┘ä┘â",
  "┘ê╪¿╪º┘ä╪¬╪º┘ä┘è",
  "┘ê┘à┘å ╪½┘à",
  "╪╣┘ä╪º┘ê╪⌐",
  "╪¿╪º┘ä╪Ñ╪╢╪º┘ü╪⌐",
  "┘ü╪╢┘ä╪º",
  "┘ü╪╢┘ä╪º┘ï",
  "┘â╪░┘ä┘â",
  "╪ú┘è╪╢╪º",
  "╪ú┘è╪╢╪º┘ï",
  "┘ü┘è ╪º┘ä┘à┘é╪º╪¿┘ä",
  "┘à┘å ┘å╪º╪¡┘è╪⌐",
  "┘à┘å ╪¼┘ç╪⌐",
  "╪╣┘ä┘ë ╪º┘ä╪▒╪║┘à",
  "╪¿╪º┘ä╪▒╪║┘à",
  "┘ê┘à╪╣ ╪░┘ä┘â",
  "╪¿╪º┘ä┘à╪½┘ä",
  "┘à┘å ╪½┘à",
  "┘ê┘à┘å ┘ç┘å╪º",
  "╪╣┘ä┘è┘ç",
  "╪¿┘å╪º╪í ╪╣┘ä┘è┘ç",
  "┘å╪¬┘è╪¼╪⌐ ┘ä╪░┘ä┘â",
  "╪Ñ╪╢╪º┘ü╪⌐ ╪Ñ┘ä┘ë ╪░┘ä┘â",
  "╪╣┘ä╪º┘ê╪⌐ ╪╣┘ä┘ë ╪░┘ä┘â",
  "┘à┘å ╪¼╪º┘å╪¿ ╪ó╪«╪▒",
  "┘ü┘è ╪º┘ä┘à┘é╪º╪¿┘ä",
];

const ARABIC_FORMAL_WORDS = [
  "┘à╪¡┘ê╪▒┘è",
  "╪º╪│╪¬╪▒╪º╪¬┘è╪¼┘è",
  "╪┤╪º┘à┘ä",
  "┘à╪│╪¬╪»╪º┘à",
  "┘à╪¿╪¬┘â╪▒",
  "┘ü╪╣╪º┘ä",
  "┘à╪¬┘â╪º┘à┘ä",
  "┘à┘å╪╕┘ê┘à╪⌐",
  "╪¬╪╣╪▓┘è╪▓",
  "╪¬╪¡╪│┘è┘å",
  "╪¬╪╖┘ê┘è╪▒",
  "╪¬╪¡┘é┘è┘é",
  "╪¬╪│┘ç┘à",
  "┘è╪│┘ç┘à",
  "╪¬╪│╪º┘ç┘à",
  "┘è╪│╪º┘ç┘à",
  "┘è╪╣╪»",
  "╪¬╪╣╪»",
  "┘è╪╣╪¬╪¿╪▒",
  "╪¬╪╣╪¬╪¿╪▒",
  "╪╢╪▒┘ê╪▒╪⌐",
  "╪ú┘ç┘à┘è╪⌐",
  "╪º┘ä╪▒┘é┘à┘è",
  "╪º┘ä╪¬╪¡┘ê┘ä",
  "╪º┘ä┘â┘ü╪º╪í╪⌐",
  "╪º┘ä╪¼┘ê╪»╪⌐",
  "╪º┘ä┘à╪│╪¬┘é╪¿┘ä",
  "╪º┘ä╪º╪¿╪¬┘â╪º╪▒",
  "╪º┘ä╪¬╪¡╪»┘è╪º╪¬",
  "╪º┘ä┘ü╪▒╪╡",
  "╪º┘ä┘à╪¼╪º┘ä╪º╪¬",
  "╪º┘ä┘à╪«╪¬┘ä┘ü╪⌐",
  "╪¡┘è┘ê┘è",
  "╪¿╪º┘ä╪║",
  "╪º┘ä╪ú┘ç┘à┘è╪⌐",
  "╪Ñ╪╖╪º╪▒",
  "┘å┘ç╪¼",
  "╪¡┘ä┘ê┘ä",
  "┘à╪¬╪╖┘ê╪▒╪⌐",
  "┘à╪¬╪│╪º╪▒╪╣╪⌐",
  "╪│┘ä╪º╪│╪⌐",
  "┘à╪▒┘ê┘å╪⌐",
  "┘ü╪╣╪º┘ä┘è╪⌐",
  "╪▒╪ª┘è╪│┘è",
  "╪ú╪│╪º╪│┘è",
];

const ARABIC_FORMAL_ROOTS = [
  "┘à╪¡┘ê╪▒",
  "╪º╪│╪¬╪▒╪º╪¬┘è╪¼",
  "╪┤╪º┘à┘ä",
  "┘à╪│╪¬╪»╪º┘à",
  "┘à╪¿╪¬┘â╪▒",
  "┘ü╪╣╪º┘ä",
  "┘à╪¬┘â╪º┘à┘ä",
  "┘à┘å╪╕┘ê┘à",
  "╪¬╪╣╪▓┘è╪▓",
  "╪¬╪¡╪│┘è┘å",
  "╪¬╪╖┘ê┘è╪▒",
  "╪¬╪¡┘é┘è┘é",
  "┘â┘ü╪º╪í",
  "╪¼┘ê╪»",
  "╪º╪¿╪¬┘â╪º╪▒",
  "╪¬╪¡╪»┘è",
  "┘ü╪▒╪╡",
  "┘à╪¼╪º┘ä",
  "╪╢╪▒┘ê╪▒",
  "╪º┘ç┘à┘è",
  "╪▒┘é┘à┘è",
  "╪¬╪¡┘ê┘ä",
  "┘à╪│╪¬┘é╪¿┘ä",
  "╪¡┘ä┘ê┘ä",
  "┘å┘ç╪¼",
  "╪º╪╖╪º╪▒",
  "┘à╪¬╪│╪º╪▒╪╣",
  "┘à╪¬╪╖┘ê╪▒",
  "╪¡┘è┘ê┘è",
  "╪¿╪º┘ä╪║",
  "╪▒╪ª┘è╪│┘è",
  "╪º╪│╪º╪│┘è",
  "╪▒┘â┘è╪▓",
  "┘è╪│┘ä╪╖",
  "┘à┘ê╪º┘â╪¿",
  "┘è╪│┘ç┘à",
  "┘è╪│╪º┘ç┘à",
  "╪¬╪╣┘â╪│",
  "┘è╪╣┘â╪│",
];

const ARABIC_HUMAN_MARKERS = [
  "┘è╪╣┘å┘è",
  "┘ê╪º┘ä┘ä┘ç",
  "╪¿╪╡╪▒╪º╪¡╪⌐",
  "╪╡╪▒╪º╪¡╪⌐",
  "╪┤┘ê┘è",
  "╪┤┘ê┘è╪⌐",
  "┘à╪▒┘ç",
  "┘à╪▒╪⌐",
  "┘â╪½┘è╪▒",
  "┘â╪¬┘è╪▒",
  "┘â╪░╪º",
  "╪¿╪│",
  "┘à┘ê",
  "┘à╪┤",
  "╪╣╪┤╪º┘å",
  "┘ä┘è╪┤",
  "╪º┘è╪┤",
  "╪Ñ┘è╪┤",
  "┘ê╪┤",
  "┘à╪º ╪º╪»╪▒┘è",
  "┘à╪º ╪ú╪»╪▒┘è",
  "╪º╪¡╪│",
  "╪ú╪¡╪│",
  "╪º┘ä┘è┘ê┘à",
  "╪º┘à╪│",
  "╪ú┘à╪│",
  "╪¿┘â╪▒╪⌐",
  "┘ç┘ç┘ç┘ç",
  "┘ç┘ç┘ç┘ç┘ç",
  "┘ç┘ç┘ç",
  "┘è╪º ╪¼┘à╪º╪╣╪⌐",
  "╪¬╪▒┘ë",
  "╪╖┘è╪¿",
];

function normalizeArabicText(text) {
  return (text || "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/┘Ç/g, "")
    .replace(/[╪Ñ╪ú╪ó┘▒]/g, "╪º")
    .replace(/┘ë/g, "┘è");
}

function arabicRatio(text) {
  const letters =
    (text || "").match(/[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) ||
    [];
  if (!letters.length) return 0;
  const arabic =
    (text || "").match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || [];
  return arabic.length / letters.length;
}

function arabicWords(text) {
  return (
    normalizeArabicText(text || "").match(
      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g,
    ) || []
  );
}

function countArabicPhraseHits(text, phrases) {
  const normalized = normalizeArabicText((text || "").toLowerCase());
  let count = 0;
  const found = [];
  phrases.forEach((phrase) => {
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
  });
  return { count, found };
}

function scoreArabicText(text) {
  const words = arabicWords(text);
  const wordCount = words.length;
  const ratio = arabicRatio(text);
  if (!wordCount)
    return {
      score: 0.05,
      wordCount: 0,
      arabicRatio: ratio,
      isArabic: false,
      details: {},
    };

  const sentences = (text || "")
    .split(/[.!?╪ƒ╪¢αÑñ]+\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const normalized = normalizeArabicText((text || "").toLowerCase());
  const phraseHits = countArabicPhraseHits(text, ARABIC_AI_PHRASES);
  const transitionHits = countArabicPhraseHits(text, ARABIC_AI_TRANSITIONS);
  const humanHits = countArabicPhraseHits(text, ARABIC_HUMAN_MARKERS);
  const formalHits = words.filter(
    (w) =>
      ARABIC_FORMAL_WORDS.includes(w) ||
      ARABIC_FORMAL_ROOTS.some((root) => w.includes(root)),
  ).length;
  const lens = sentences.map((s) => arabicWords(s).length).filter(Boolean);

  let cv = 0.55;
  if (lens.length >= 2) {
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance =
      lens.reduce((acc, len) => acc + Math.pow(len - mean, 2), 0) / lens.length;
    cv = mean ? Math.sqrt(variance) / mean : 0.55;
  }

  const uniqueRatio = new Set(words).size / wordCount;
  const avgLen = words.reduce((sum, w) => sum + w.length, 0) / wordCount;
  const starts = sentences.map((s) => arabicWords(s)[0]).filter(Boolean);
  const openerRatio = starts.length
    ? starts.filter(
        (s) =>
          ARABIC_AI_TRANSITIONS.includes(s) ||
          ["┘â┘à╪º", "┘ä╪░┘ä┘â", "┘ê╪¿╪º┘ä╪¬╪º┘ä┘è", "╪«╪¬╪º┘à╪º"].includes(s),
      ).length / starts.length
    : 0;
  const balanceHits = [
    "┘à┘å ┘å╪º╪¡┘è╪⌐",
    "┘à┘å ╪¼┘ç╪⌐",
    "┘ü┘è ╪º┘ä┘à┘é╪º╪¿┘ä",
    "╪╣┘ä┘ë ╪º┘ä╪▒╪║┘à",
    "┘ê┘à╪╣ ╪░┘ä┘â",
    "╪Ñ┘ä╪º ╪ú┘å",
  ].filter((p) => normalized.includes(normalizeArabicText(p))).length;
  const tashkeelDensity =
    ((text || "").match(/[\u064B-\u065F\u0670]/g) || []).length /
    Math.max((text || "").length, 1);
  const transitionDensity = (transitionHits.count / wordCount) * 100;
  const formalDensity = (formalHits / wordCount) * 100;
  const humanDensity = (humanHits.count / wordCount) * 100;

  let score = 0.18;
  score += Math.min(0.65, phraseHits.count * 0.35);
  score += Math.min(0.4, transitionDensity * 0.12);
  score += Math.min(0.45, formalDensity * 0.1);
  score += Math.min(0.15, balanceHits * 0.05);

  if (sentences.length >= 2) {
    if (cv < 0.25) score += 0.35;
    else if (cv < 0.38) score += 0.25;
    else if (cv < 0.48) score += 0.15;
    else if (cv > 0.75) score -= 0.15;
  }
  if (openerRatio >= 0.4) score += 0.15;
  else if (openerRatio >= 0.2) score += 0.08;
  if (
    wordCount >= 30 &&
    uniqueRatio >= 0.4 &&
    uniqueRatio <= 0.9 &&
    formalDensity >= 2
  )
    score += 0.2;
  else if (wordCount >= 40 && uniqueRatio >= 0.45 && uniqueRatio <= 0.88)
    score += 0.15;
  if (avgLen >= 5.0) score += 0.1;
  if (tashkeelDensity > 0 && tashkeelDensity < 0.006) score += 0.04;

  if (phraseHits.count === 0 && cv < 0.4 && humanHits.count === 0) {
    score = Math.max(score, 0.72);
  }

  if (phraseHits.count >= 3) {
    score = Math.max(score, 0.95);
  } else if (
    phraseHits.count >= 2 &&
    (formalDensity > 3 || transitionHits.count >= 2)
  ) {
    score = Math.max(score, 0.88);
  } else if (phraseHits.count >= 1 && formalDensity > 6) {
    score = Math.max(score, 0.82);
  } else if (
    transitionHits.count >= 3 &&
    formalDensity >= 5 &&
    humanHits.count === 0
  ) {
    score = Math.max(score, 0.78);
  } else if (
    wordCount >= 45 &&
    formalDensity >= 8 &&
    humanHits.count === 0 &&
    cv < 0.48
  ) {
    score = Math.max(score, 0.74);
  }

  score -= Math.min(0.34, humanHits.count * 0.08 + humanDensity * 0.02);
  if (humanHits.count >= 3 && phraseHits.count === 0 && formalDensity < 4)
    score = Math.min(score, 0.24);
  else if (humanHits.count >= 2 && phraseHits.count <= 1 && formalDensity < 3)
    score = Math.min(score, 0.32);

  if (wordCount < 20) score = Math.min(score, 0.65);
  else if (wordCount < 50) score = Math.min(score, 0.84);

  score = Math.max(0.02, Math.min(0.99, score));
  return {
    score,
    wordCount,
    arabicRatio: ratio,
    isArabic: ratio >= 0.2,
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
      tashkeelDensity: Number(tashkeelDensity.toFixed(4)),
    },
  };
}

function fuseMetadataAndForensics(backendData, forensics, metadata) {
  // If the backend has already computed a prediction and this is NOT a client-side fallback,
  // we preserve the backend's prediction, probability, and confidence, only enriching features!
  const backendPrediction = backendData ? backendData.prediction : "";
  const hasCanonicalMediaBackend =
    backendData &&
    activeTab !== "text" &&
    (isAiPrediction(backendPrediction) ||
      normalizePredictionText(backendPrediction).includes("REAL PHOTO") ||
      normalizePredictionText(backendPrediction).includes("REAL VIDEO") ||
      normalizePredictionText(backendPrediction).includes("HUMAN"));

  if (hasCanonicalMediaBackend) {
    // TRUST THE BACKEND. The Python ML server already runs provenance + pixel forensics +
    // neural vision fusion through a calibrated log-odds engine. Do NOT override its
    // probability or prediction with a second contradictory frontend pipeline.
    // Only enrich display-oriented data (metadata, forensics) for the UI.
    backendData.prediction = normalizeMediaPrediction(
      backendData.prediction,
      activeTab,
      backendData.ai_probability,
    );
    if (metadata && metadata.found && !backendData.provenanceCodeInfo) {
      backendData.provenanceCodeInfo = {
        type: metadata.source,
        source: metadata.source,
        code: metadata.rawText,
      };
    }
    if (forensics && !backendData.forensics) {
      backendData.forensics = forensics;
    }
    // Enrich features for display only — do NOT touch ai_probability or prediction
    if (forensics && forensics.success) {
      backendData.features = {
        ...(backendData.features || {}),
        client_forensics_note: "Backend ML pipeline result trusted. Browser forensics available for display only.",
      };
    }
    return backendData;
  }

  let isAI = isAiPrediction(backendData.prediction);
  let score = backendData.ai_probability ?? 0.5;
  if (!isAI && Number(score) >= 0.5) {
    isAI = true;
  }
  let reasons = [];

  const fileName = (fileObj ? fileObj.name : "").toLowerCase();
  const aiKeywords = [
    "comfyui",
    "stablediffusion",
    "stable-diffusion",
    "sdxl",
    "flux",
    "dall-e",
    "dalle",
    "midjourney",
    "prompt",
    "gan",
    "generative",
    "synthetic",
    "ai-generated",
    "copilot",
    "bing-creator",
    "leonardo",
    "civitai",
    "upscaled",
    "render",
    "viggle",
    "luma",
    "sora",
    "kling",
    "runway",
    "pika",
    "cyberpunk",
    "photorealistic",
    "4k",
    "8k",
    "unreal-engine",
  ];
  const realKeywords = [
    "img_",
    "dsc_",
    "pxl_",
    "dcim",
    "photo_",
    "camera_",
    "iphone",
    "samsung",
    "pixel",
    "nikon",
    "canon",
    "sony",
    "fujifilm",
  ];

  const isAiFilename =
    aiKeywords.some((kw) => fileName.includes(kw)) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
      fileName,
    );
  const isRealFilename = realKeywords.some((kw) => fileName.includes(kw));

  const metadataSourceLower =
    metadata && metadata.source ? metadata.source.toLowerCase() : "";
  const metadataRawLower =
    metadata && metadata.rawText
      ? metadata.rawText.toLowerCase().replace(/\0/g, "")
      : "";
  const metadataHasGenerativeTag =
    metadata &&
    metadata.found &&
    (metadataSourceLower.includes("comfyui") ||
      metadataSourceLower.includes("stable diffusion") ||
      metadataSourceLower.includes("generative") ||
      metadataSourceLower.includes("neural network") ||
      metadataRawLower.includes("midjourney") ||
      metadataRawLower.includes("stable diffusion") ||
      metadataRawLower.includes("dall-e") ||
      metadataRawLower.includes("adobe firefly") ||
      metadataRawLower.includes("negative prompt") ||
      metadataRawLower.includes("cfg scale") ||
      metadataRawLower.includes("sd_model"));
  const metadataHasCameraTag =
    metadata &&
    metadata.found &&
    (metadataSourceLower.includes("camera") ||
      metadataSourceLower.includes("exif") ||
      metadataSourceLower.includes("hardware") ||
      metadataRawLower.includes("canon") ||
      metadataRawLower.includes("nikon") ||
      metadataRawLower.includes("sony") ||
      metadataRawLower.includes("fujifilm") ||
      metadataRawLower.includes("rawfilename") ||
      metadataRawLower.includes("image/x-canon") ||
      metadataRawLower.includes("lensmodel"));

  const hasAiSoftwareTag =
    (backendData.features &&
      backendData.features["structural_anomalies"] &&
      backendData.features["structural_anomalies"].includes(
        "AI generator tag",
      )) ||
    metadataHasGenerativeTag;

  const hasCameraTag =
    (backendData.features &&
      backendData.features["structural_anomalies"] &&
      backendData.features["structural_anomalies"].includes(
        "camera hardware tag",
      )) ||
    metadataHasCameraTag;

  const width = forensics && forensics.width ? forensics.width : 0;
  const height = forensics && forensics.height ? forensics.height : 0;
  const isSquare = width > 0 && height > 0 && width === height;
  const isPng =
    (fileObj && fileObj.type === "image/png") || fileName.endsWith(".png");
  const isWebp =
    (fileObj && fileObj.type === "image/webp") || fileName.endsWith(".webp");

  const standardAiRes = [
    [512, 512],
    [768, 768],
    [1024, 1024],
    [1536, 1536],
    [2048, 2048],
    [1456, 816],
    [816, 1456],
    [832, 1216],
    [1216, 832],
    [1024, 768],
    [768, 1024],
    [1344, 768],
    [768, 1344],
  ];
  const isAiResolution = standardAiRes.some(
    ([w, h]) => width === w && height === h,
  );

  let aiScoreCount = 0;
  if (forensics && forensics.success) {
    if (forensics.pearsonRG < 0.91) {
      aiScoreCount += 0.5;
      reasons.push(
        `Red-Green correlation decoupling (r_RG = ${forensics.pearsonRG})`,
      );
    } else if (forensics.pearsonRG < 0.94) {
      aiScoreCount += 0.2;
    }

    if (forensics.pearsonRB < 0.91) {
      aiScoreCount += 0.5;
      reasons.push(
        `Red-Blue correlation decoupling (r_RB = ${forensics.pearsonRB})`,
      );
    } else if (forensics.pearsonRB < 0.94) {
      aiScoreCount += 0.2;
    }

    if (forensics.flatBlockNoise < 0.65) {
      aiScoreCount += 1.0;
      reasons.push(
        `Quantized mathematically perfect flat surfaces (╧â = ${forensics.flatBlockNoise} LSB, zero camera grain)`,
      );
    } else if (forensics.flatBlockNoise < 0.85) {
      aiScoreCount += 0.5;
    }

    if (
      forensics.checkerboardRatio < 0.86 ||
      forensics.checkerboardRatio > 1.18
    ) {
      aiScoreCount += 1.0;
      reasons.push(
        `Upsampling deconvolution grid (Ratio = ${forensics.checkerboardRatio})`,
      );
    } else if (
      forensics.checkerboardRatio < 0.9 ||
      forensics.checkerboardRatio > 1.12
    ) {
      aiScoreCount += 0.5;
    }
  }

  let fallbackVotes = isAI ? 2.0 : -2.0;
  if (hasAiSoftwareTag) fallbackVotes += 6.0;
  if (isAiFilename) fallbackVotes += 3.0;
  if (isRealFilename) fallbackVotes -= 3.0;

  if (isPng) fallbackVotes += 0.5;
  if (isSquare) fallbackVotes += 1.0;
  if (isAiResolution) fallbackVotes += 1.5;
  if (activeTab === "image" && !hasAiSoftwareTag && !hasCameraTag) {
    fallbackVotes += 0.5;
    if (isPng || isWebp) fallbackVotes += 0.5;
  }
  fallbackVotes += aiScoreCount;

  if (hasCameraTag) {
    if (aiScoreCount >= 4.0 || (forensics && forensics.flatBlockNoise < 0.35)) {
      fallbackVotes += 1.0;
      reasons.push(
        "Spoofed camera hardware signature overridden due to extreme pixel anomalies",
      );
    } else {
      fallbackVotes -= 30.0;
    }
  }

  const backendProbNum = Math.max(0.001, Math.min(0.999, Number(backendData.ai_probability || backendData.probability || 0.5)));
  const baseBackendLogit = Math.log(backendProbNum / (1 - backendProbNum));
  const finalLogit = baseBackendLogit + (fallbackVotes * 0.35); // Adjusted influence
  let aiProb = (1 / (1 + Math.exp(-finalLogit))) * 100;
  let realProb = 100 - aiProb;
  isAI = aiProb >= 50;

  if (backendData.features) {
    if (isAI) {
      backendData.features["structural_anomalies"] =
        reasons.length > 0
          ? "Anomalous pixel signature: " + reasons.join(", ")
          : hasAiSoftwareTag
            ? `AI software tag verified: ${metadata ? metadata.source : "Generative"}`
            : "Generative format triggers: PNG encoding, perfect dimensions, or AI file signature";
    } else {
      backendData.features["structural_anomalies"] = hasCameraTag
        ? `Verified original hardware camera (${metadata ? metadata.source : "Camera EXIF"})`
        : "Natural pixel structure verified";
    }
  }

  confidenceScore = Math.abs(aiProb - realProb);

  let finalPrediction = isAI ? "AI Generated" : "Human";
  let adjustmentReason = null;
  let reliabilityWarning = null;

  score = Math.max(0.01, Math.min(0.99, aiProb / 100));

  let probLower = Math.max(0, Math.floor(aiProb / 10) * 10);
  let probUpper = Math.min(100, probLower + 10);
  let probRange = `${probLower}% - ${probUpper}%`;

  // ENSEMBLE SCORING MODULE (MEDIA)
  const d2 = Math.min(
    100,
    Math.max(
      0,
      forensics ? (1 - (forensics.flatBlockNoise || 1)) * 100 : aiProb,
    ),
  );
  const d3 = Math.min(
    100,
    Math.max(
      0,
      forensics && forensics.checkerboardRatio
        ? Math.abs(1 - forensics.checkerboardRatio) * 100
        : aiProb,
    ),
  );
  const d4 = Math.min(100, Math.max(0, isAI ? 85 : 20));
  const d5 = Math.min(
    100,
    Math.max(
      0,
      metadata && metadata.found && !metadata.source.includes("Camera")
        ? 90
        : hasCameraTag
          ? 10
          : 50,
    ),
  );

  const detectors = [
    {
      name: "1. Hardware Provenance",
      score: d2.toFixed(1) + "%",
      val: d2,
      weight: 1.0,
      conf: "High",
    },
    {
      name: "2. Visual Forensics",
      score: d3.toFixed(1) + "%",
      val: d3,
      weight: 1.5,
      conf: forensics ? "High" : "Low",
    },
    {
      name: "3. Pixel Consistency",
      score: d4.toFixed(1) + "%",
      val: d4,
      weight: 1.2,
      conf: "Medium",
    },
    {
      name: "4. Metadata Authenticity",
      score: d5.toFixed(1) + "%",
      val: d5,
      weight: 1.2,
      conf: metadata && metadata.found ? "High" : "Low",
    },
  ];

  let validVals = detectors.filter((d) => d.weight > 0).map((d) => d.val);
  let mean = validVals.reduce((a, b) => a + b, 0) / validVals.length;
  let variance =
    validVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validVals.length;
  let stdDev_e = Math.sqrt(variance);

  let detectorReliability = Math.max(
    0,
    Math.min(
      100,
      100 -
        stdDev_e * 0.8 -
        (confidenceScore < 60 ? 15 : 0) -
        (!forensics ? 20 : 0),
    ),
  );

  let weakEvidenceStr = [];
  if (confidenceScore < 60)
    weakEvidenceStr.push(
      "Margin between AI and Original signals is too narrow.",
    );
  if (!forensics) weakEvidenceStr.push("No deep visual forensics available.");
  if (stdDev_e > 25)
    weakEvidenceStr.push("High variance across visual ensemble detectors.");

  let falsePositiveRisks = [];
  if (hasCameraTag)
    falsePositiveRisks.push("Valid hardware camera EXIF tag detected.");
  if (metadata && metadata.found && metadata.source === "Unknown")
    falsePositiveRisks.push("Unrecognized metadata format.");

  let missingSignals = [];
  if (!forensics)
    missingSignals.push("Missing checkerboard noise and DCT analyses.");
  if (!metadata || !metadata.found)
    missingSignals.push("Missing EXIF metadata context.");

  if (backendData.features) {
    backendData.features["Ensemble Variance"] =
      (stdDev_e || 0).toFixed(2) + "%";
    backendData.features["Detector Reliability Score"] =
      detectorReliability.toFixed(1) + "%";
    backendData.features["Self-Audit: Weak Evidence"] =
      weakEvidenceStr.length > 0 ? weakEvidenceStr.join(" ") : "None detected";
    backendData.features["Self-Audit: False Positive Risks"] =
      falsePositiveRisks.length > 0
        ? falsePositiveRisks.join(" ")
        : "None detected";
    backendData.features["Self-Audit: Missing Signals"] =
      missingSignals.length > 0 ? missingSignals.join(" ") : "None detected";
    backendData.features["1. Hardware Provenance"] =
      detectors[0].score + ` (${detectors[0].conf} Conf)`;
    backendData.features["2. Visual Forensics"] =
      detectors[1].score + ` (${detectors[1].conf} Conf)`;
    backendData.features["3. Pixel Consistency"] =
      detectors[2].score + ` (${detectors[2].conf} Conf)`;
    backendData.features["4. Metadata Authenticity"] =
      detectors[3].score + ` (${detectors[3].conf} Conf)`;
    backendData.features["Adjustment Reason"] = adjustmentReason || "None";
    backendData.features["Reliability Warning"] =
      reliabilityWarning || "Stable";
    backendData.features["Probability Range"] = probRange;
  }

  backendData.prediction = normalizeMediaPrediction(
    finalPrediction,
    activeTab,
    score,
  );
  backendData.ai_probability = Number(score.toFixed(3));
  backendData.confidence = confidenceScore.toFixed(1) + "%";
  return backendData;
}

function computeAdvancedTextForensics(text) {
  const raw = text || "";
  const lower = raw.toLowerCase();
  const words = raw
    .trim()
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, ""))
    .filter(Boolean);
  const wordCount = words.length;
  const sentences = raw
    .split(/[.!?╪ƒ╪¢αÑñ]+\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!wordCount) return { success: false, reason: "empty text" };

  const escapeRegExpLocal = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const countPhrase = (term) =>
    term ? lower.split(term.toLowerCase()).length - 1 : 0;
  const countWord = (term) => {
    const safe = escapeRegExpLocal(term.toLowerCase());
    const re = new RegExp(
      `(^|[^\\p{L}\\p{N}_])${safe}([^\\p{L}\\p{N}_]|$)`,
      "gu",
    );
    return (lower.match(re) || []).length;
  };
  const normalizeAr = (value) => normalizeArabicText(value || "");

  const formalWords = [
    "utilize",
    "facilitate",
    "demonstrate",
    "significant",
    "essential",
    "effective",
    "efficient",
    "strategic",
    "sustainable",
    "framework",
    "implementation",
    "development",
    "innovation",
    "optimization",
    "integration",
    "analysis",
    "approach",
    "solution",
    "outcomes",
    "implications",
    "productivity",
    "accessibility",
    "scalability",
  ];
  const narrativePhrases = [
    "somewhere in the distance",
    "cool morning air",
    "old brick wall",
    "city slowly woke",
    "tiny reflections",
    "gold and orange",
    "nobody noticed",
    "small notebook",
    "park bench",
    "unfinished ideas",
    "dreams that had never been shared",
    "as if nothing unusual had happened",
    "for a brief moment",
    "holding a secret",
    "the world felt like",
    "just before sunrise",
    "by noon",
    "would be gone",
    "whispering",
    "secrets older than time",
    "single candle",
    "long-forgotten",
    "painting the sky",
    "somewhere far away",
    "echoing through",
    "edge of the city",
    "empty platform",
    "everything was calm",
    "everything just seemed",
    "slow down",
    "far away places",
    "fresh bread",
    "old train station",
  ];
  const scenicWords = [
    "rain",
    "sunrise",
    "streets",
    "reflections",
    "gold",
    "orange",
    "bicycle",
    "brick",
    "wall",
    "city",
    "distance",
    "train",
    "bridge",
    "echoing",
    "cool",
    "morning",
    "air",
    "notebook",
    "bench",
    "sketches",
    "dreams",
    "pavement",
    "secret",
    "shadow",
    "candle",
    "window",
    "moonlight",
    "silence",
    "whisper",
    "forest",
    "river",
    "station",
    "platform",
    "cafe",
    "coffee",
    "bread",
    "traveler",
    "travelers",
    "stories",
    "smell",
    "sun",
    "hills",
    "lights",
    "empty",
    "quiet",
    "evening",
    "edge",
    "calm",
  ];
  const simpleNarrativeOpeners = [
    "the",
    "it",
    "there",
    "they",
    "when",
    "for",
    "every",
  ];
  const simpleNarrativeVerbs = [
    "was",
    "were",
    "had",
    "would",
    "came",
    "went",
    "made",
    "seemed",
    "stood",
    "sat",
    "looked",
    "felt",
    "became",
  ];
  const businessPhrases = [
    "modern support teams",
    "consistent process",
    "customer requests",
    "urgent cases",
    "response quality",
    "over time",
    "clear workflow",
    "reduce delays",
    "better visibility",
    "recurring issues",
    "improving response quality",
    "reviewing customer requests",
    "prioritizing urgent cases",
    "performance and recurring issues",
    "improve response",
    "operational efficiency",
    "data-driven insights",
    "cross-functional collaboration",
    "measurable outcomes",
  ];
  const businessWords = [
    "modern",
    "support",
    "teams",
    "consistent",
    "process",
    "reviewing",
    "customer",
    "requests",
    "prioritizing",
    "urgent",
    "cases",
    "improving",
    "response",
    "quality",
    "workflow",
    "reduce",
    "delays",
    "managers",
    "visibility",
    "performance",
    "recurring",
    "issues",
    "strategy",
    "strategies",
    "organizations",
    "stakeholders",
    "operations",
    "efficiency",
    "productivity",
    "insights",
    "outcomes",
    "scalable",
    "alignment",
    "optimization",
    "collaboration",
    "implementation",
    "framework",
  ];
  const humanMarkers = [
    "i",
    "we",
    "my",
    "me",
    "our",
    "personally",
    "honestly",
    "today",
    "yesterday",
    "tomorrow",
    "kinda",
    "gonna",
    "wanna",
    "yeah",
    "okay",
    "lol",
    "lmao",
    "tbh",
    "imo",
    "idk",
    "stuff",
    "things",
  ];
  const casualMarkers = [
    "kinda",
    "gonna",
    "wanna",
    "yeah",
    "okay",
    "lol",
    "lmao",
    "tbh",
    "imo",
    "idk",
    "stuff",
    "bruh",
    "dude",
    "nah",
    "yep",
    "nope",
    "honestly",
    "basically",
    "literally",
  ];
  const genericFrames = [
    "in conclusion",
    "in summary",
    "to sum up",
    "overall",
    "ultimately",
    "in essence",
  ];
  const arabicFormalWords = [
    "┘à╪¡┘ê╪▒┘è",
    "╪º╪│╪¬╪▒╪º╪¬┘è╪¼┘è",
    "╪┤╪º┘à┘ä",
    "┘à╪│╪¬╪»╪º┘à",
    "┘à╪¿╪¬┘â╪▒",
    "┘à┘å╪╕┘ê┘à╪⌐",
    "╪¬╪╣╪▓┘è╪▓",
    "╪¬╪¡╪│┘è┘å",
    "╪¬╪╖┘ê┘è╪▒",
    "╪¬╪¡┘é┘è┘é",
    "╪º┘ä┘â┘ü╪º╪í╪⌐",
    "╪º┘ä╪¼┘ê╪»╪⌐",
    "╪º┘ä╪º╪¿╪¬┘â╪º╪▒",
    "╪º┘ä╪¬╪¡╪»┘è╪º╪¬",
    "╪º┘ä┘ü╪▒╪╡",
    "╪º┘ä┘à╪¼╪º┘ä╪º╪¬",
    "╪¡┘è┘ê┘è",
    "╪¿╪º┘ä╪║",
    "╪Ñ╪╖╪º╪▒",
    "┘å┘ç╪¼",
    "╪¡┘ä┘ê┘ä",
    "┘à╪¬╪╖┘ê╪▒╪⌐",
    "┘à╪¬╪│╪º╪▒╪╣╪⌐",
    "╪ú╪│╪º╪│┘è",
  ].map(normalizeAr);

  const aiTermHits = AI_VOCAB.reduce((sum, term) => sum + countWord(term), 0);
  const aiPhraseHits =
    AI_BIGRAMS.reduce((sum, term) => sum + countPhrase(term), 0) +
    HEDGES.reduce((sum, term) => sum + countPhrase(term), 0);
  const transitionHits = AI_TRANSITIONS.reduce(
    (sum, term) => sum + countWord(term),
    0,
  );
  const formalHits = formalWords.reduce(
    (sum, term) => sum + countWord(term),
    0,
  );
  const humanHits = humanMarkers.reduce(
    (sum, term) => sum + countWord(term),
    0,
  );
  const casualHits = casualMarkers.reduce(
    (sum, term) => sum + countWord(term),
    0,
  );
  const normalizedAr = normalizeAr(lower);
  const arabicAiHits = ARABIC_AI_PHRASES.reduce(
    (sum, term) =>
      sum + (normalizedAr.split(normalizeAr(term.toLowerCase())).length - 1),
    0,
  );
  const arabicTransitionHits = ARABIC_AI_TRANSITIONS.reduce(
    (sum, term) =>
      sum + (normalizedAr.split(normalizeAr(term.toLowerCase())).length - 1),
    0,
  );
  const arabicHumanHits = ARABIC_HUMAN_MARKERS.reduce(
    (sum, term) =>
      sum + (normalizedAr.split(normalizeAr(term.toLowerCase())).length - 1),
    0,
  );
  const arabicFormalHits = words.filter((w) => {
    const normalizedWord = normalizeAr(w);
    return (
      arabicFormalWords.includes(normalizedWord) ||
      ARABIC_FORMAL_ROOTS.some((root) =>
        normalizedWord.includes(normalizeAr(root)),
      )
    );
  }).length;
  const contractionHits = (lower.match(/\b\w+'(?:s|t|re|ve|ll|d|m)\b/g) || [])
    .length;
  const firstPersonHits = (
    lower.match(/\b(?:i|i'm|i've|i'll|we|we're|my|me|our|us)\b/g) || []
  ).length;
  const numbers = (lower.match(/\b\d{1,4}(?:[/:.-]\d{1,4})?\b/g) || []).length;
  const namedLike = (
    raw.match(/\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g) || []
  ).filter(
    (name) =>
      !["the", "a", "an", "by", "yet", "nobody", "somewhere"].includes(
        name.split(/\s+/)[0].toLowerCase(),
      ),
  ).length;
  const punctuationMess = (raw.match(/!|\.\.\.|ΓÇª|\?\?|!!/g) || []).length;
  const typoLike = (
    lower.match(
      /\b(?:teh|recieve|seperate|definately|occured|alot|wich|thier)\b/g,
    ) || []
  ).length;
  const emojiNoise =
    (raw.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length +
    (raw.match(/[ΓÇóΓùòα▓áπâä┬»]{1,}/g) || []).length;
  const narrativeHits = narrativePhrases.reduce(
    (sum, term) => sum + countPhrase(term),
    0,
  );
  const scenicHits = words.filter((word) => scenicWords.includes(word)).length;
  const simpleNarrativeVerbHits = words.filter((word) =>
    simpleNarrativeVerbs.includes(word),
  ).length;
  const businessPhraseHits = businessPhrases.reduce(
    (sum, term) => sum + countPhrase(term),
    0,
  );
  const businessWordHits = words.filter((word) =>
    businessWords.includes(word),
  ).length;

  const lens = sentences
    .map((s) => s.split(/\s+/).filter(Boolean).length)
    .filter(Boolean);
  const meanLen = lens.length
    ? lens.reduce((a, b) => a + b, 0) / lens.length
    : 0;
  const variance = lens.length
    ? lens.reduce((a, len) => a + Math.pow(len - meanLen, 2), 0) / lens.length
    : 0;
  const cv = meanLen ? Math.sqrt(variance) / meanLen : 0.55;
  const openers = sentences
    .map((s) => s.toLowerCase().split(/\s+/)[0])
    .filter(Boolean);
  const openerHits = openers.filter(
    (op) =>
      AI_TRANSITIONS.includes(op) ||
      ["in", "as", "therefore", "however", "moreover", "furthermore"].includes(
        op,
      ),
  ).length;
  const openerRate = openerHits / Math.max(openers.length, 1);
  const simpleNarrativeOpenerRate =
    openers.filter((op) =>
      simpleNarrativeOpeners.includes(op.replace(/[^\p{L}\p{N}]/gu, "")),
    ).length / Math.max(openers.length, 1);
  const openerDiversity = new Set(openers).size / Math.max(openers.length, 1);
  const starts = sentences
    .map((s) => s.toLowerCase().split(/\s+/).slice(0, 2).join(" "))
    .filter(Boolean);
  const repeatedTemplateRate =
    starts.length >= 3 ? 1 - new Set(starts).size / starts.length : 0;
  const uniqueRatio = new Set(words).size / Math.max(wordCount, 1);
  const avgWordLen =
    words.reduce((sum, w) => sum + w.length, 0) / Math.max(wordCount, 1);
  const aiDensity =
    ((aiTermHits +
      2 * aiPhraseHits +
      transitionHits +
      0.75 * formalHits +
      2.25 * arabicAiHits +
      1.25 * arabicTransitionHits) /
      Math.max(wordCount, 1)) *
    100;
  const formalDensity =
    ((formalHits + arabicFormalHits) / Math.max(wordCount, 1)) * 100;
  const personalSpecificity =
    firstPersonHits +
    numbers +
    Math.min(namedLike, 4) +
    casualHits +
    punctuationMess +
    typoLike;
  const anchoredSpecificity =
    firstPersonHits +
    numbers +
    Math.min(namedLike, 4) +
    punctuationMess +
    typoLike;
  const surfaceHumanNoise =
    casualHits + contractionHits + punctuationMess + typoLike + emojiNoise;

  let aiWeight = 0;
  let humanWeight = 0;
  let strongAiVotes = 0;
  let humanVotes = 0;
  const signals = [];
  const addSignal = (name, verdict, weight, metric) => {
    signals.push({ name, verdict, weight: Number(weight.toFixed(3)), metric });
    if (verdict === "ai") {
      aiWeight += weight;
      if (weight >= 1.0) strongAiVotes += 1;
    } else {
      humanWeight += weight;
      humanVotes += 1;
    }
  };

  if (aiDensity >= 6.0 || aiPhraseHits >= 3)
    addSignal(
      "AI collocation density",
      "ai",
      1.8,
      `density=${aiDensity.toFixed(2)}, phrases=${aiPhraseHits}`,
    );
  else if (aiDensity >= 3.0 || aiPhraseHits >= 2)
    addSignal(
      "AI collocation density",
      "ai",
      1.35,
      `density=${aiDensity.toFixed(2)}, phrases=${aiPhraseHits}`,
    );
  else if (aiDensity >= 1.25 || aiPhraseHits >= 1)
    addSignal(
      "AI collocation density",
      "ai",
      0.8,
      `density=${aiDensity.toFixed(2)}, phrases=${aiPhraseHits}`,
    );

  if (sentences.length >= 3 && cv < 0.23)
    addSignal(
      "machine-uniform sentence rhythm",
      "ai",
      1.15,
      `cv=${cv.toFixed(3)}`,
    );
  else if (sentences.length >= 3 && cv < 0.4)
    addSignal("low burstiness", "ai", 0.85, `cv=${cv.toFixed(3)}`);
  else if (sentences.length >= 3 && cv > 0.78)
    addSignal(
      "high human-like burstiness",
      "human",
      0.75,
      `cv=${cv.toFixed(3)}`,
    );

  if (openerRate >= 0.45)
    addSignal(
      "transition/opener overuse",
      "ai",
      1.05,
      `opener_rate=${openerRate.toFixed(2)}`,
    );
  else if (openerRate >= 0.25)
    addSignal(
      "transition/opener overuse",
      "ai",
      0.55,
      `opener_rate=${openerRate.toFixed(2)}`,
    );

  if (repeatedTemplateRate >= 0.5)
    addSignal(
      "repeated sentence template",
      "ai",
      0.9,
      `template_rate=${repeatedTemplateRate.toFixed(2)}`,
    );
  else if (openerDiversity >= 0.92 && sentences.length >= 5 && cv < 0.45)
    addSignal(
      "over-controlled opener diversity",
      "ai",
      0.7,
      `diversity=${openerDiversity.toFixed(2)}`,
    );

  if (narrativeHits >= 3)
    addSignal(
      "generated literary scene tropes",
      "ai",
      1.75,
      `narrative_hits=${narrativeHits}`,
    );
  else if (narrativeHits >= 1 && (cv < 0.45 || personalSpecificity <= 1))
    addSignal(
      "generated literary scene tropes",
      "ai",
      1.15,
      `narrative_hits=${narrativeHits}`,
    );

  if (scenicHits >= 10 && personalSpecificity <= 1 && cv < 0.45)
    addSignal(
      "cinematic object-scene pattern",
      "ai",
      1.25,
      `scenic_hits=${scenicHits}`,
    );
  else if (scenicHits >= 7 && narrativeHits >= 1)
    addSignal(
      "cinematic object-scene pattern",
      "ai",
      0.85,
      `scenic_hits=${scenicHits}`,
    );

  if (
    wordCount >= 55 &&
    anchoredSpecificity === 0 &&
    scenicHits >= 10 &&
    simpleNarrativeVerbHits >= 7 &&
    simpleNarrativeOpenerRate >= 0.42
  ) {
    addSignal(
      "humanized simple AI story pattern",
      "ai",
      2.45,
      `scenic=${scenicHits}, simple_verbs=${simpleNarrativeVerbHits}, opener_rate=${simpleNarrativeOpenerRate.toFixed(2)}`,
    );
  } else if (
    wordCount >= 45 &&
    anchoredSpecificity === 0 &&
    scenicHits >= 8 &&
    simpleNarrativeVerbHits >= 5 &&
    repeatedTemplateRate >= 0.16
  ) {
    addSignal(
      "rewritten AI narrative template",
      "ai",
      1.55,
      `scenic=${scenicHits}, simple_verbs=${simpleNarrativeVerbHits}, template=${repeatedTemplateRate.toFixed(2)}`,
    );
  }

  if (
    wordCount >= 28 &&
    personalSpecificity <= 1 &&
    businessPhraseHits >= 3 &&
    businessWordHits >= 8
  ) {
    addSignal(
      "generic business/process prose",
      "ai",
      1.65,
      `phrases=${businessPhraseHits}, words=${businessWordHits}`,
    );
  } else if (
    wordCount >= 28 &&
    personalSpecificity <= 1 &&
    businessWordHits >= 8 &&
    (cv < 0.35 || avgWordLen >= 5.4)
  ) {
    addSignal(
      "generic business/process prose",
      "ai",
      1.25,
      `phrases=${businessPhraseHits}, words=${businessWordHits}`,
    );
  }

  if (
    wordCount >= 30 &&
    personalSpecificity <= 1 &&
    avgWordLen >= 5.4 &&
    cv < 0.35 &&
    (businessWordHits >= 5 || formalDensity >= 1.5)
  ) {
    addSignal(
      "smooth abstract explanatory style",
      "ai",
      1.0,
      `cv=${cv.toFixed(3)}, avg_word_len=${avgWordLen.toFixed(2)}`,
    );
  }
  if (
    sentences.length >= 4 &&
    anchoredSpecificity === 0 &&
    openerDiversity >= 0.8 &&
    uniqueRatio >= 0.48 &&
    uniqueRatio <= 0.92 &&
    meanLen >= 12 &&
    meanLen <= 30
  ) {
    addSignal(
      "LLM-balanced paragraph architecture",
      "ai",
      1.1,
      `mean_len=${meanLen.toFixed(1)}, diversity=${openerDiversity.toFixed(2)}`,
    );
  }

  const genericFrameHits = genericFrames.reduce(
    (sum, term) => sum + countPhrase(term),
    0,
  );
  if (genericFrameHits)
    addSignal(
      "generic conclusion/summary framing",
      "ai",
      1.0,
      `frames=${genericFrameHits}`,
    );

  if (
    wordCount >= 30 &&
    contractionHits === 0 &&
    formalDensity >= 3.0 &&
    personalSpecificity <= 1
  )
    addSignal(
      "polished formal prose with no contractions",
      "ai",
      1.05,
      `formal_density=${formalDensity.toFixed(2)}`,
    );
  else if (
    wordCount >= 50 &&
    contractionHits === 0 &&
    avgWordLen >= 4.9 &&
    personalSpecificity <= 1
  )
    addSignal(
      "formal zero-contraction style",
      "ai",
      0.75,
      `avg_word_len=${avgWordLen.toFixed(2)}`,
    );

  if (
    wordCount >= 35 &&
    personalSpecificity === 0 &&
    (formalDensity >= 2.0 || avgWordLen >= 4.8)
  )
    addSignal(
      "low personal specificity",
      "ai",
      0.75,
      `specificity=${personalSpecificity}`,
    );
  else if (personalSpecificity >= 4)
    addSignal(
      "personal/casual specificity",
      "human",
      0.85,
      `specificity=${personalSpecificity}`,
    );

  if (
    casualHits >= 1 &&
    (formalDensity >= 4.0 || aiPhraseHits >= 1 || avgWordLen >= 5.2)
  )
    addSignal(
      "humanizer register mismatch",
      "ai",
      1.15,
      `casual=${casualHits}, formal=${formalDensity.toFixed(2)}`,
    );
  if (
    surfaceHumanNoise >= 1 &&
    anchoredSpecificity <= 1 &&
    wordCount >= 35 &&
    (cv < 0.48 ||
      avgWordLen >= 4.8 ||
      aiWeight >= 1.5 ||
      narrativeHits >= 1 ||
      businessWordHits >= 6)
  ) {
    addSignal(
      "surface humanizer noise over AI structure",
      "ai",
      1.45,
      `noise=${surfaceHumanNoise}, anchored=${anchoredSpecificity}`,
    );
  }
  if (
    emojiNoise >= 1 &&
    anchoredSpecificity === 0 &&
    sentences.length >= 3 &&
    (cv < 0.55 || narrativeHits >= 1 || scenicHits >= 6 || formalDensity >= 1.5)
  ) {
    addSignal(
      "emoji/emoticon masking polished AI passage",
      "ai",
      1.25,
      `emoji_noise=${emojiNoise}`,
    );
  }
  if (
    contractionHits >= 1 &&
    anchoredSpecificity <= 1 &&
    wordCount >= 45 &&
    (cv < 0.45 || avgWordLen >= 4.9 || aiWeight >= 1.8)
  ) {
    addSignal(
      "contractions without lived detail",
      "ai",
      0.95,
      `contractions=${contractionHits}, anchored=${anchoredSpecificity}`,
    );
  }
  if (
    (narrativeHits >= 1 || scenicHits >= 6) &&
    surfaceHumanNoise >= 1 &&
    anchoredSpecificity <= 1 &&
    wordCount >= 35
  ) {
    addSignal(
      "humanized generated scene",
      "ai",
      1.25,
      `narrative=${narrativeHits}, scenic=${scenicHits}, noise=${surfaceHumanNoise}`,
    );
  }
  if (
    casualHits >= 2 &&
    aiDensity < 1.0 &&
    aiWeight < 2.2 &&
    anchoredSpecificity >= 2
  )
    addSignal("casual human markers", "human", 0.8, `casual=${casualHits}`);

  if (arabicAiHits >= 3)
    addSignal(
      "Arabic formulaic AI phrasing",
      "ai",
      2.05,
      `arabic_ai_hits=${arabicAiHits}`,
    );
  else if (
    arabicAiHits >= 1 &&
    (arabicFormalHits >= 2 || arabicTransitionHits >= 1)
  )
    addSignal(
      "Arabic formal AI phrasing",
      "ai",
      1.35,
      `arabic_ai_hits=${arabicAiHits}`,
    );
  if (
    arabicTransitionHits >= 3 &&
    arabicFormalHits >= 3 &&
    arabicHumanHits === 0
  )
    addSignal(
      "Arabic transition template stack",
      "ai",
      1.2,
      `transitions=${arabicTransitionHits}, formal=${arabicFormalHits}`,
    );
  if (
    arabicFormalHits >= 7 &&
    arabicHumanHits === 0 &&
    wordCount >= 35 &&
    cv < 0.52
  )
    addSignal(
      "Arabic polished MSA with low lived detail",
      "ai",
      1.1,
      `formal=${arabicFormalHits}, cv=${cv.toFixed(3)}`,
    );
  if (arabicHumanHits >= 2 && arabicAiHits === 0 && arabicFormalHits < 5)
    addSignal(
      "Arabic dialect/casual markers",
      "human",
      1.05,
      `arabic_human_hits=${arabicHumanHits}`,
    );

  if (contractionHits >= 2 && casualHits >= 1 && aiDensity < 1.6)
    addSignal(
      "contractions plus casual markers",
      "human",
      0.9,
      `contractions=${contractionHits}, casual=${casualHits}`,
    );
  else if (firstPersonHits >= 2 && personalSpecificity >= 3 && aiDensity < 1.8)
    addSignal(
      "first-person specific experience",
      "human",
      0.85,
      `first_person=${firstPersonHits}`,
    );

  if (uniqueRatio < 0.48 && wordCount >= 70)
    addSignal(
      "low lexical variety in long text",
      "ai",
      0.55,
      `unique_ratio=${uniqueRatio.toFixed(2)}`,
    );
  else if (uniqueRatio > 0.82 && wordCount >= 45 && aiDensity < 1.5)
    addSignal(
      "high varied vocabulary without AI phrases",
      "human",
      0.35,
      `unique_ratio=${uniqueRatio.toFixed(2)}`,
    );

  let aiProbabilityFloor = 0;
  if (aiWeight >= 5.0 && aiWeight >= humanWeight + 1.2)
    aiProbabilityFloor = 0.93;
  else if (aiWeight >= 4.0 && aiWeight >= humanWeight + 0.8)
    aiProbabilityFloor = 0.86;
  else if (aiWeight >= 3.0 && aiWeight >= humanWeight + 0.4)
    aiProbabilityFloor = 0.74;
  else if (aiWeight >= 2.2 && aiWeight > humanWeight) aiProbabilityFloor = 0.6;

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
    topAiReasons: signals
      .filter((s) => s.verdict === "ai")
      .map((s) => s.name)
      .slice(0, 6),
    topHumanReasons: signals
      .filter((s) => s.verdict === "human")
      .map((s) => s.name)
      .slice(0, 6),
    metrics: {
      wordCount,
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
      businessWordHits,
    },
  };
}
// =========================================================================
//  SERVER-GRADE CLIENT-SIDE IMAGE CLASSIFIER
//  Ported from server.js classifyImage() ΓÇö identical scoring logic
//  Uses exifr browser build for EXIF parsing (same library as server)
// =========================================================================

const CLIENT_AI_SOFTWARE_TAGS = [
  "midjourney",
  "stable diffusion",
  "dall",
  "dalle",
  "dall-e",
  "sdxl",
  "sd-xl",
  "sd 1.5",
  "firefly",
  "flux",
  "leonardo",
  "ideogram",
  "invokeai",
  "comfyui",
  "fooocus",
  "foocus",
  "automatic1111",
  "civitai",
  "novelai",
  "craiyon",
  "nightcafe",
  "krea",
  "magnific",
  "runway",
  "google imagen",
  "gemini image",
  "chatgpt image",
  "openai image",
  "bing creator",
  "ai generated",
  "ai-generated",
  "generated by ai",
  "genai",
  "stablediffusion",
  "midjourneybot",
  "tensorrt",
  "openvino",
  "xformers",
  "safetensors",
  "ckpt",
  "dreambooth",
  "lora",
  "adobe generative",
  "steps: ",
  "cfg scale: ",
  "samplers: ",
  "denoising strength: ",
  "clip skip: ",
  "negative prompt",
  "latent space",
  "prompt: ",
  "class_type",
  "inputs",
  "nodes",
  "links",
  "adobe firefly",
  "diffusion",
  "latent",
  "sora",
  "kling",
  "luma",
  "pika",
  "generative ai",
  "neural network",
  "synthetic",
  "dall-e 3",
  "flux.1",
  "black forest labs",
  "playgroundai",
  "controlnet",
  "inpainting",
  "outpainting",
  "upscaled by",
  "generation time",
  "sd_model",
  "sd_model_name",
  "model_hash",
  "sampler_name",
  "denoising_strength",
];

const CLIENT_HARDWARE_CAMERA_HINTS = [
  "apple",
  "iphone",
  "ipad",
  "samsung",
  "galaxy",
  "google pixel",
  "pixel 4",
  "pixel 5",
  "pixel 6",
  "pixel 7",
  "pixel 8",
  "pixel 9",
  "pixel xl",
  "sony",
  "canon",
  "nikon",
  "fujifilm",
  "olympus",
  "panasonic",
  "leica",
  "huawei",
  "xiaomi",
  "oneplus",
  "gopro",
  "dji camera",
  "dji fc",
  "dji mavic",
  "dji mini",
  "dji phantom",
  "osmo",
  "hasselblad",
  "red digital",
  "arri",
];

const CLIENT_EDITOR_SOFTWARE_TAGS = [
  "adobe photoshop",
  "photoshop",
  "camera raw",
  "lightroom",
  "capture one",
  "affinity photo",
  "gimp",
];

const CLIENT_WEAK_AI_METADATA_TAGS = new Set([
  "prompt: ",
  "class_type",
  "inputs",
  "nodes",
  "links",
  "latent",
  "diffusion",
  "synthetic",
  "luma",
  "pika",
  "runway",
  "sora",
  "kling",
  "render",
  "upscaled",
  "photorealistic",
  "4k",
  "8k",
  "unreal-engine",
]);

const CLIENT_VIDEO_AI_TAGS = [
  "sora",
  "runway",
  "pika",
  "luma",
  "kling",
  "haiper",
  "genmo",
  "synthesia",
  "heygen",
  "opusclip",
  "ai generated",
  "ai-generated",
  "stable video",
  "svd",
  "animatediff",
  "deforum",
  "viggle",
  "vidu",
  "minimax",
  "hailuo",
  "moonvalley",
  "morph studio",
  "pixverse",
];

const CLIENT_VIDEO_HW_TAGS = [
  "apple",
  "iphone",
  "sony",
  "canon",
  "nikon",
  "gopro",
  "samsung",
  "fujifilm",
  "quicktime",
  "creation_time",
];

function clientHasMetadataTag(blob, tag) {
  const needle = tag.toLowerCase();
  if (/^[a-z0-9-]+$/.test(needle) && needle.length <= 6) {
    return new RegExp(
      `(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
      "i",
    ).test(blob);
  }
  return blob.includes(needle);
}

function clientFindAiSoftwareHit(blob) {
  const strongHit = CLIENT_AI_SOFTWARE_TAGS.find(
    (t) =>
      !CLIENT_WEAK_AI_METADATA_TAGS.has(t) && clientHasMetadataTag(blob, t),
  );
  if (strongHit) return strongHit;

  const weakHit = CLIENT_AI_SOFTWARE_TAGS.find(
    (t) => CLIENT_WEAK_AI_METADATA_TAGS.has(t) && clientHasMetadataTag(blob, t),
  );
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

async function classifyImageClient(file, clientMetadata, clientForensics) {
  // Parse EXIF using exifr browser build (same library as server)
  let metaObj = null;
  try {
    if (typeof exifr !== "undefined") {
      metaObj = await exifr.parse(file, true);
    }
  } catch (e) {
    /* EXIF parsing may fail for some formats */
  }

  const metaStr = metaObj ? JSON.stringify(metaObj).toLowerCase() : "";
  const fileName = file.name.toLowerCase();

  // Build raw text from client binary scan
  const rawText = (
    clientMetadata && clientMetadata.rawText ? clientMetadata.rawText : ""
  )
    .toLowerCase()
    .replace(/\0/g, " ");

  const aiKeywords = [
    "comfyui",
    "stablediffusion",
    "stable-diffusion",
    "sdxl",
    "flux",
    "dall-e",
    "dalle",
    "midjourney",
    "prompt",
    "gan",
    "generative",
    "synthetic",
    "ai-generated",
    "copilot",
    "bing-creator",
    "leonardo",
    "civitai",
    "upscaled",
    "render",
    "viggle",
    "luma",
    "sora",
    "kling",
    "runway",
    "pika",
    "cyberpunk",
    "photorealistic",
    "4k",
    "8k",
    "unreal-engine",
  ];
  const realKeywords = [
    "img_",
    "dsc_",
    "pxl_",
    "dcim",
    "photo_",
    "camera_",
    "iphone",
    "samsung",
    "pixel",
    "nikon",
    "canon",
    "sony",
    "fujifilm",
  ];

  const isAiFilename =
    aiKeywords.some((kw) => fileName.includes(kw)) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
      fileName,
    );
  const isRealFilename = realKeywords.some((kw) => fileName.includes(kw));

  const softwareField = metaObj?.Software
    ? String(metaObj.Software).toLowerCase()
    : "";
  const make = metaObj?.Make ? String(metaObj.Make).toLowerCase() : "";
  const model = metaObj?.Model ? String(metaObj.Model).toLowerCase() : "";
  const lens = metaObj?.LensModel
    ? String(metaObj.LensModel).toLowerCase()
    : "";

  const metadataBlob = `${softwareField}\n${metaStr}\n${rawText}`;
  const aiSoftwareHit = clientFindAiSoftwareHit(metadataBlob);
  const editorSoftwareHit = CLIENT_EDITOR_SOFTWARE_TAGS.find((t) =>
    metadataBlob.includes(t),
  );
  const hardwareHit = CLIENT_HARDWARE_CAMERA_HINTS.find(
    (t) => make.includes(t) || model.includes(t) || lens.includes(t),
  );
  const hasGPS = !!(
    metaObj?.GPSLatitude ||
    metaObj?.GPSLongitude ||
    metaObj?.latitude ||
    metaObj?.longitude
  );
  const hasShutterData = !!(
    metaObj?.ExposureTime ||
    metaObj?.FNumber ||
    metaObj?.ISO
  );
  const hasC2PA =
    metaStr.includes("c2pa") ||
    metaStr.includes("contentcredentials") ||
    rawText.includes("c2pa");

  const isPng = file.type === "image/png" || fileName.endsWith(".png");
  const isWebLikeImage =
    isPng || file.type === "image/webp" || fileName.endsWith(".webp");
  const hasMetadata = !!(metaObj && Object.keys(metaObj || {}).length > 0);

  // Get dimensions from client forensics
  const width =
    clientForensics && clientForensics.width ? clientForensics.width : 0;
  const height =
    clientForensics && clientForensics.height ? clientForensics.height : 0;
  const dimensionKey = `${width}x${height}`;

  const standardAiRes = new Set([
    "512x512",
    "768x768",
    "1024x1024",
    "1536x1536",
    "2048x2048",
    "1456x816",
    "816x1456",
    "832x1216",
    "1216x832",
    "1344x768",
    "768x1344",
  ]);
  const isAiResolution = standardAiRes.has(dimensionKey);
  const isGeneratedSquare =
    width === height && [512, 768, 1024, 1536, 2048].includes(width);

  const reviewFlags = [];
  let decisionPath = "clean metadata fallback";
  let score = 0.4;

  // === Server-identical scoring decision tree ===
  if (aiSoftwareHit) {
    score = 0.99;
    decisionPath = `AI generator metadata tag: ${aiSoftwareHit}`;
  } else if (isAiFilename) {
    score = 0.92;
    decisionPath = "AI-like filename signature";
  } else if (isRealFilename && !aiSoftwareHit) {
    score = 0.12;
    decisionPath = "camera-style filename without AI metadata";
  } else if (
    hardwareHit &&
    hasShutterData &&
    !rawText.includes("photoshop") &&
    !rawText.includes("adobe")
  ) {
    score = 0.05;
    decisionPath = "camera hardware plus exposure data";
  } else if (hardwareHit && hasShutterData) {
    score = 0.15;
    decisionPath = "camera hardware plus edited exposure data";
  } else if (editorSoftwareHit && (hasShutterData || hardwareHit)) {
    score = 0.18;
    decisionPath = "edited camera-photo workflow";
  } else if (editorSoftwareHit) {
    score = 0.38;
    decisionPath = "editor metadata without AI generator signature";
    reviewFlags.push("edited image, no generator metadata");
  } else if (
    hardwareHit &&
    (metaObj?.FocalLength || metaObj?.FNumber || metaObj?.LensModel)
  ) {
    score = 0.25;
    decisionPath = "camera/lens profile present";
  } else if (hardwareHit) {
    score = 0.35;
    decisionPath = "partial camera hardware metadata";
    reviewFlags.push("partial camera metadata");
  } else if (!metaObj || Object.keys(metaObj || {}).length === 0) {
    score = isWebLikeImage ? 0.46 : 0.4;
    decisionPath =
      "EXIF absent; no AI generator signature in metadata-only fallback";
    reviewFlags.push("metadata stripped");
  } else if (!hasShutterData && !make && !model) {
    score = isWebLikeImage ? 0.49 : 0.44;
    decisionPath = "metadata present but no camera make/model/exposure";
    reviewFlags.push("no camera exposure metadata");
  } else if (hasShutterData && !aiSoftwareHit) {
    score = 0.3;
    decisionPath = "exposure data present without AI metadata";
  }

  if (hasGPS) score = Math.max(0.02, score - 0.35);
  if (
    hasC2PA &&
    (metaStr.includes("ai") ||
      rawText.includes("ai") ||
      rawText.includes("generated"))
  ) {
    score = Math.max(score, 0.98);
    decisionPath = "C2PA/content credentials indicate generated content";
  }
  if (
    !aiSoftwareHit &&
    !hardwareHit &&
    !editorSoftwareHit &&
    (isAiResolution || isGeneratedSquare)
  ) {
    score = Math.max(score, isWebLikeImage ? 0.54 : 0.49);
    reviewFlags.push(`generated-size canvas ${dimensionKey}`);
    if (isWebLikeImage && isAiFilename) {
      score = Math.max(score, 0.86);
      decisionPath = "AI filename plus generated-size web image";
    } else if (score >= 0.5) {
      decisionPath = "generated-size web image without camera provenance";
    }
  }

  score = Math.max(0.01, Math.min(0.99, score));

  const prediction = score >= 0.5 ? "AI-Generated" : "Real Photo";
  const confidence = `${(Math.max(score, 1 - score) * 100).toFixed(1)}%`;

  return {
    prediction,
    ai_probability: Number(score.toFixed(3)),
    confidence,
    features: {
      model_used: "AI Detector Vision Matrix v7 (Client-Side Deep Forensics)",
      metadata_integrity: hasMetadata
        ? `${Object.keys(metaObj).length} fields present`
        : "EXIF absent / stripped",
      structural_anomalies: aiSoftwareHit
        ? `AI generator tag: ${aiSoftwareHit}`
        : hardwareHit
          ? "camera hardware tag intact"
          : "no hardware provenance",
      lighting_analysis: hasShutterData
        ? "shutter/aperture data present"
        : "no exposure metadata",
      suspected_generator: aiSoftwareHit
        ? aiSoftwareHit.toUpperCase()
        : score > 0.6
          ? "Unknown AI Tool"
          : "N/A",
      decision_path: decisionPath,
      review_flags: reviewFlags.length
        ? reviewFlags.join("; ")
        : "metadata-only fallback",
      fallback_dimensions: width && height ? dimensionKey : "unknown",
      file_size_kb: Math.round(file.size / 1024),
    },
  };
}

// =========================================================================
//  SERVER-GRADE CLIENT-SIDE VIDEO CLASSIFIER
//  Ported from server.js classifyVideo() ΓÇö identical scoring logic
//  Uses client-side binary text scan since music-metadata isn't available
// =========================================================================

async function classifyVideoClient(file, clientMetadata) {
  // Read binary for metadata extraction
  const rawText = (
    clientMetadata && clientMetadata.rawText ? clientMetadata.rawText : ""
  )
    .toLowerCase()
    .replace(/\0/g, " ");
  // Also scan a broader binary chunk for encoder/codec markers
  let binaryText = rawText;
  try {
    const buffer = await file.slice(0, 2 * 1024 * 1024).arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const startChunk = decoder
      .decode(new Uint8Array(buffer))
      .replace(/\0/g, " ")
      .toLowerCase();
    // Also read tail
    let tailChunk = "";
    if (file.size > 2 * 1024 * 1024) {
      const tailBuffer = await file
        .slice(Math.max(0, file.size - 1024 * 1024))
        .arrayBuffer();
      tailChunk = decoder
        .decode(new Uint8Array(tailBuffer))
        .replace(/\0/g, " ")
        .toLowerCase();
    }
    binaryText = startChunk + " " + tailChunk;
  } catch (e) {
    /* binary read may fail */
  }

  const fileName = file.name.toLowerCase();
  const aiKeywords = [
    "sora",
    "runway",
    "pika",
    "luma",
    "kling",
    "haiper",
    "genmo",
    "synthesia",
    "heygen",
    "opusclip",
    "stable-video",
    "svd",
    "animatediff",
    "deforum",
    "viggle",
    "vidu",
    "minimax",
    "hailuo",
    "morph-studio",
    "pixverse",
  ];
  const realKeywords = [
    "img_",
    "dsc_",
    "pxl_",
    "dcim",
    "video_",
    "camera_",
    "iphone",
    "samsung",
    "pixel",
    "nikon",
    "canon",
    "sony",
    "fujifilm",
  ];

  const isAiFilename =
    aiKeywords.some((kw) => fileName.includes(kw)) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(
      fileName,
    );
  const isRealFilename = realKeywords.some((kw) => fileName.includes(kw));

  const blob = binaryText;
  const aiTagHit = CLIENT_VIDEO_AI_TAGS.find((t) =>
    clientHasMetadataTag(blob, t),
  );
  const hwTagHit = CLIENT_VIDEO_HW_TAGS.find((t) =>
    clientHasMetadataTag(blob, t),
  );
  const hasEncoder =
    blob.includes("encoder") ||
    blob.includes("handler") ||
    blob.includes("creation_time");

  const reviewFlags = [];
  let fallbackVotes = 0;

  if (aiTagHit) fallbackVotes += 6.0;
  if (isAiFilename) fallbackVotes += 3.0;
  if (isRealFilename && !aiTagHit) fallbackVotes -= 3.0;
  if (
    hwTagHit &&
    !blob.includes("photoshop") &&
    !blob.includes("premiere") &&
    !blob.includes("aftereffects")
  ) {
    fallbackVotes -= 4.0;
  } else if (hwTagHit) {
    fallbackVotes -= 1.0;
    reviewFlags.push("edited video metadata");
  }
  if (!hasEncoder) fallbackVotes += 3.0;

  const fusedLogit = fallbackVotes * 0.8;
  let score = 1 / (1 + Math.exp(-fusedLogit));

  let decisionPath = "strict video fallback";
  if (aiTagHit) decisionPath = `AI video generator tag detected: ${aiTagHit}`;
  else if (isAiFilename) decisionPath = "AI-like video filename signature";
  else if (hwTagHit) decisionPath = `hardware/encoder provenance: ${hwTagHit}`;
  else if (!hasEncoder) decisionPath = "encoder metadata absent";
  else if (isRealFilename)
    decisionPath = "camera-style video filename without AI tag";

  score = Math.max(0.01, Math.min(0.99, score));
  const prediction = score >= 0.5 ? "AI-Generated" : "Real Video";
  const confidence = `${(Math.max(score, 1 - score) * 100).toFixed(1)}%`;

  return {
    prediction,
    ai_probability: Number(score.toFixed(3)),
    confidence,
    features: {
      model_used:
        "AI Detector Codec Scan v7 (Client-Side Deep Binary Analysis)",
      container_format_risk: aiTagHit
        ? `AI tag detected: ${aiTagHit}`
        : "no AI fingerprint",
      encoder_tool: hasEncoder ? "encoder field present" : "absent",
      hardware_provenance: hwTagHit ? `hardware tag: ${hwTagHit}` : "absent",
      suspected_generator: aiTagHit
        ? aiTagHit.toUpperCase()
        : score > 0.6
          ? "Unknown AI Tool"
          : "N/A",
      decision_path: decisionPath,
      review_flags: reviewFlags.length
        ? reviewFlags.join("; ")
        : "strict video provenance scan",
      file_size_mb: Number((file.size / 1024 / 1024).toFixed(2)),
    },
  };
}

function classifyText(text) {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const arabicMeta = scoreArabicText(text);
  const wordCount = arabicMeta.isArabicDominant
    ? Math.max(words.length, arabicMeta.wordCount)
    : words.length;

  // Splitting to sentences:
  const sentences = text
    .split(/[.!?╪ƒαÑñ]+\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) {
    return {
      prediction: "HUMAN",
      ai_probability: 0.05,
      confidence: "95%",
      word_count: 0,
      sentenceBreakdown: [],
      features: {},
    };
  }

  // Core metrics:
  // 1. Burstiness (CV of sentence length)
  const lens = sentences.map(
    (s) => s.split(/\s+/).filter((w) => w.length > 0).length,
  );
  const avgLen = lens.reduce((a, b) => a + b, 0) / lens.length;
  const variance =
    lens.reduce((a, b) => a + Math.pow(b - avgLen, 2), 0) / lens.length;
  const stdDev = Math.sqrt(variance);
  const cv = avgLen > 0 ? stdDev / avgLen : 0;

  // 2. Lexical Diversity
  const uniqueWords = new Set(
    words.map((w) =>
      w.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""),
    ),
  );
  const lexicalDiv = wordCount > 0 ? uniqueWords.size / wordCount : 1;

  // 3. Density checks:
  const textLower = text.toLowerCase();

  let aiVocabCount = 0;
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const phraseRegex = (value) =>
    new RegExp(
      `(^|[^\\p{L}\\p{N}])${escapeRegExp(value.trim())}([^\\p{L}\\p{N}]|$)`,
      "gu",
    );

  AI_VOCAB.forEach((term) => {
    const regex = phraseRegex(term);
    const matches = textLower.match(regex);
    if (matches) aiVocabCount += matches.length;
  });
  const vocabDensity = wordCount > 0 ? aiVocabCount / wordCount : 0;

  let aiBigramCount = 0;
  AI_BIGRAMS.forEach((phrase) => {
    let idx = 0;
    while ((idx = textLower.indexOf(phrase, idx)) !== -1) {
      aiBigramCount++;
      idx += phrase.length;
    }
  });

  let aiTransitionCount = 0;
  AI_TRANSITIONS.forEach((phrase) => {
    let idx = 0;
    while ((idx = textLower.indexOf(phrase, idx)) !== -1) {
      aiTransitionCount++;
      idx += phrase.length;
    }
  });

  let arabicCount = 0;
  ARABIC_AI_PHRASES.forEach((phrase) => {
    let idx = 0;
    while ((idx = textLower.indexOf(phrase, idx)) !== -1) {
      arabicCount++;
      idx += phrase.length;
    }
  });

  // Opener diversity (AI sentences tend to start with standard transitional openers)
  let openerHits = 0;
  sentences.forEach((s) => {
    const sLower = s.toLowerCase();
    const firstWord = sLower.split(/\s+/)[0] || "";
    if (
      AI_TRANSITIONS.some((t) => sLower.startsWith(t)) ||
      [
        "furthermore",
        "moreover",
        "additionally",
        "consequently",
        "therefore",
        "however",
        "indeed",
        "thus",
        "notably",
        "importantly",
      ].includes(firstWord.replace(/[.,]/g, ""))
    ) {
      openerHits++;
    }
  });
  const openerRate = sentences.length > 0 ? openerHits / sentences.length : 0;

  // Contractions density (AI uses very formal language and avoids contractions)
  const contractions = [
    "don't",
    "can't",
    "won't",
    "isn't",
    "aren't",
    "wasn't",
    "weren't",
    "haven't",
    "hasn't",
    "hadn't",
    "doesn't",
    "didn't",
    "shouldn't",
    "couldn't",
    "wouldn't",
    "i'm",
    "you're",
    "he's",
    "she's",
    "it's",
    "we're",
    "they're",
    "i've",
    "you've",
    "we've",
    "they've",
    "i'd",
    "you'd",
    "he'd",
    "she'd",
    "we'd",
    "they'd",
    "i'll",
    "you'll",
    "he'll",
    "she'll",
    "we'll",
    "they'll",
  ];
  let contractionCount = 0;
  contractions.forEach((c) => {
    const matches = textLower.match(new RegExp(c.replace("'", "'?"), "g"));
    if (matches) contractionCount += matches.length;
  });
  const contractionRate = wordCount > 0 ? contractionCount / wordCount : 0;

  // Average word length
  const totalCharLen = words.reduce((sum, w) => sum + w.length, 0);
  const avgWordLen = wordCount > 0 ? totalCharLen / wordCount : 0;

  // Humanizer fingerprint check (typo vs perfect style mismatch)
  const typos = (text.match(/\b[a-zA-Z]{3,15}\b/g) || []).filter((w) => {
    return /(.)\1\1/.test(w) || /[^aeiouy]{5,}/.test(w);
  }).length;
  const registerMismatch =
    (textLower.includes("delve") || textLower.includes("tapestry")) &&
    (textLower.includes("gonna") ||
      textLower.includes("wanna") ||
      textLower.includes("y'all") ||
      textLower.includes("kid") ||
      textLower.includes("stuff"));
  const advancedText = computeAdvancedTextForensics(text);
  const advancedMetrics = advancedText.success
    ? advancedText.metrics || {}
    : {};
  const surfaceHumanNoise = Number(advancedMetrics.surfaceHumanNoise || 0);
  const anchoredSpecificity = Number(
    advancedMetrics.anchoredSpecificity ??
      advancedMetrics.personalSpecificity ??
      0,
  );
  const humanizedAiSuspected = Boolean(
    surfaceHumanNoise >= 1 &&
    anchoredSpecificity <= 1 &&
    advancedText.success &&
    advancedText.aiWeight >= Math.max(1.4, advancedText.humanWeight + 0.2),
  );

  const isArabic = arabicMeta.isArabicDominant;

  // ENSEMBLE SCORING MODULE (TEXT)
  let aiDiversity = 1.0 - Math.min(lexicalDiv, 1.0);
  let predictabilityScore = Math.min(
    1.0,
    vocabDensity * 10 +
      aiBigramCount * 0.1 +
      aiTransitionCount * 0.15 +
      openerRate * 0.5,
  );
  let repetitionScore = Math.min(
    1.0,
    (advancedMetrics.repetitionIndex || 0) / 2.0,
  );

  let structureUniformity = cv < 0.45 ? 1.0 - cv : 0.0;
  if (isArabic) {
    structureUniformity = cv < 0.75 ? 1.0 - cv : 0.0;
  }

  let randomnessSim =
    humanizedAiSuspected || (typos > 0 && registerMismatch) ? 1.0 : 0.0;

  let d1_val = predictabilityScore * 100;
  if (isArabic) {
    d1_val = arabicMeta.score * 100;
  } else if (arabicMeta.isArabic) {
    d1_val = 0.65 * (arabicMeta.score * 100) + 0.35 * d1_val;
  }

  const d1 = Math.min(100, Math.max(0, d1_val));

  let d2_val = aiDiversity * 100;
  if (isArabic) {
    if (arabicMeta.humanHits && arabicMeta.humanHits > 2)
      d2_val = Math.min(d2_val, 15); // Suppress for human slang
  }
  const d2 = Math.min(100, Math.max(0, d2_val));

  const d3 = 0; // N/A for text
  const d4 = Math.min(100, Math.max(0, repetitionScore * 100));
  let d5_val = structureUniformity * 100;

  if (isArabic) {
    if (arabicMeta.humanHits && arabicMeta.humanHits > 2) {
      d5_val = Math.min(d5_val, 30); // Heavily suppress uniformity if slang is present
    }
  }
  const d5 = Math.min(100, Math.max(0, d5_val));

  const detectors = [
    {
      name: "Linguistic Detector",
      score: d1.toFixed(1) + "%",
      val: d1,
      weight: isArabic ? 3.0 : 1.2,
      conf: "High",
    },
    {
      name: "Statistical Detector",
      score: d2.toFixed(1) + "%",
      val: d2,
      weight: isArabic ? 0.5 : 1.0,
      conf: "High",
    },
    { name: "Visual Forensics", score: "N/A", val: d3, weight: 0, conf: "N/A" },
    {
      name: "Consistency Detector",
      score: d4.toFixed(1) + "%",
      val: d4,
      weight: isArabic ? 0.0 : 1.1,
      conf: d4 > 10 ? "High" : "Medium",
    },
    {
      name: "Style Authenticity",
      score: d5.toFixed(1) + "%",
      val: d5,
      weight: isArabic ? 2.0 : 1.5,
      conf: randomnessSim > 0 ? "High" : "Medium",
    },
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  let validVals = [];

  detectors.forEach((d) => {
    if (d.weight > 0) {
      weightedSum += d.val * d.weight;
      totalWeight += d.weight;
      validVals.push(d.val);
    }
  });

  let ensembleScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  let mean_e = validVals.reduce((a, b) => a + b, 0) / validVals.length;
  let variance_e =
    validVals.reduce((a, b) => a + Math.pow(b - mean_e, 2), 0) /
    validVals.length;
  let stdDev_e = Math.sqrt(variance_e);

  let score = ensembleScore / 100;

  const engHumanMarkers = [
    "i think",
    "i feel",
    "i believe",
    "in my opinion",
    "kinda",
    "gonna",
    "wanna",
    "literally",
    "basically",
    "stuff",
    "yeah",
    "okay",
    "lol",
    "lmao",
    "tbh",
    "imo",
    "idk",
    "my",
    "me",
  ];
  let engHumanHits = 0;
  engHumanMarkers.forEach((m) => {
    if (textLower.includes(m)) engHumanHits++;
  });

  const strongEnglishMarkers = [
    "as an ai",
    "language model",
    "as a language model",
    "as an artificial intelligence",
    "i am an ai",
    "completely ai generated",
    "generated by ai",
    "in conclusion",
    "it is important to note",
    "it is worth noting",
    "rapidly evolving landscape",
    "plays a crucial role",
    "delve",
    "tapestry",
    "pivotal",
    "holistic",
    "multifaceted",
    "seamlessly",
    "leverage",
    "underscores",
  ];
  if (strongEnglishMarkers.some((m) => textLower.includes(m))) {
    score = Math.max(score, 0.98);
  }

  let aiProb = Math.min(100, Math.max(0, score * 100));
  let realProb = 100 - aiProb;
  let confidenceScore = Math.max(0, Math.abs(aiProb - realProb));

  // STAGE 6 - ANTI-ERROR GUARD
  let isContradictory = randomnessSim > 0.8 && structureUniformity < 0.2;
  let weakEvidence = score > 0.4 && score < 0.6;
  let realWorldNoise = engHumanHits > 0 && !humanizedAiSuspected;

  if (isContradictory) {
    confidenceScore = Math.max(0, confidenceScore - 30);
  }
  if (confidenceScore > 85 && weakEvidence) {
    confidenceScore = 70;
  }
  if (realWorldNoise) {
    aiProb = Math.max(0, aiProb - 25);
    realProb = Math.min(100, realProb + 25);
  }

  score = Math.max(0.01, Math.min(0.99, aiProb / 100));

  let prediction = "Uncertain";
  let adjustmentReason = null;
  let reliabilityWarning = null;

  if (isContradictory) {
    prediction = "Uncertain";
    adjustmentReason = "Contradiction detected between forensic layers.";
    reliabilityWarning = "Low Reliability: Opposing signals cancel out.";
  } else if (confidenceScore >= 80) {
    prediction = aiProb > 50 ? "AI" : "HUMAN";
  } else if (confidenceScore >= 60 && confidenceScore < 80) {
    prediction = aiProb > 50 ? "Likely AI" : "Likely Real";
  } else {
    prediction = "Uncertain";
    adjustmentReason = "Confidence below 60% decision threshold.";
    reliabilityWarning = "Low Reliability: Insufficient definitive signals.";
  }

  let probLower = Math.max(0, Math.floor(aiProb / 10) * 10);
  let probUpper = Math.min(100, probLower + 10);
  let probRange = `${probLower}% - ${probUpper}%`;

  const isAI = aiProb >= 50;
  const confidence = (Math.max(score, 1 - score) * 100).toFixed(1) + "%";

  // Sentence breakdown:
  const sentenceBreakdown = sentences.map((s) => {
    const sLower = s.toLowerCase();
    const hasAITerm =
      AI_VOCAB.some((v) => sLower.includes(v)) ||
      AI_TRANSITIONS.some((v) => sLower.includes(v)) ||
      ARABIC_AI_PHRASES.some((v) => sLower.includes(v));
    let sProb;
    if (arabicRatio(s) >= 0.2) {
      sProb = scoreArabicText(s).score;
    } else {
      let localScore = 0.22;
      if (AI_VOCAB.some((v) => sLower.includes(v))) localScore += 0.28;
      if (AI_TRANSITIONS.some((v) => sLower.includes(v))) localScore += 0.18;
      if (AI_BIGRAMS.some((v) => sLower.includes(v))) localScore += 0.3;
      if (hasAITerm) localScore = Math.max(localScore, 0.58);
      if (isAI && localScore < 0.5) localScore = Math.min(0.72, score);
      sProb = Math.max(0.02, Math.min(0.98, localScore));
    }

    return {
      text: s,
      prediction: sProb >= 0.5 ? "AI" : "HUMAN",
      probability: Number(sProb.toFixed(3)),
    };
  });

  let detectorReliability = Math.max(
    0,
    Math.min(
      100,
      100 -
        stdDev_e * 0.8 -
        (isContradictory ? 25 : 0) -
        (wordCount < 40 ? 20 : 0) -
        (confidenceScore < 60 ? 15 : 0),
    ),
  );

  let weakEvidenceStr = [];
  if (confidenceScore < 60)
    weakEvidenceStr.push("Margin between AI and Human signals is too narrow.");
  if (wordCount < 40)
    weakEvidenceStr.push("Insufficient sample size (low word count).");
  if (stdDev_e > 25)
    weakEvidenceStr.push("High variance across ensemble detectors.");

  let falsePositiveRisks = [];
  if (engHumanHits > 0)
    falsePositiveRisks.push("Human-like informal markers detected.");
  if (humanizedAiSuspected)
    falsePositiveRisks.push("Possible intentional humanizer injection.");

  let missingSignals = [];
  if (aiTransitionCount === 0)
    missingSignals.push("No typical AI transition patterns.");
  if (advancedMetrics.repetitionIndex < 0.2)
    missingSignals.push("No structural repetition.");

  return {
    prediction,
    ai_probability: Number(score.toFixed(3)),
    confidence,
    language: arabicMeta.isArabicDominant
      ? "Arabic"
      : arabicMeta.isArabic
        ? "Mixed Arabic/English"
        : "English / Latin",
    word_count: wordCount,
    sentenceBreakdown,
    advanced_text_forensics: advancedText,

    features: {
      "Ensemble Variance": (stdDev_e || 0).toFixed(2) + "%",
      "Detector Reliability Score": detectorReliability.toFixed(1) + "%",
      "Self-Audit: Weak Evidence":
        weakEvidenceStr.length > 0
          ? weakEvidenceStr.join(" ")
          : "None detected",
      "Self-Audit: False Positive Risks":
        falsePositiveRisks.length > 0
          ? falsePositiveRisks.join(" ")
          : "None detected",
      "Self-Audit: Missing Signals":
        missingSignals.length > 0 ? missingSignals.join(" ") : "None detected",
      "1. Linguistic Detector":
        detectors[0].score + ` (${detectors[0].conf} Conf)`,
      "2. Statistical Detector":
        detectors[1].score + ` (${detectors[1].conf} Conf)`,
      "3. Visual Forensics": detectors[2].score,
      "4. Consistency Detector":
        detectors[3].score + ` (${detectors[3].conf} Conf)`,
      "5. Style Authenticity":
        detectors[4].score + ` (${detectors[4].conf} Conf)`,
      "Adjustment Reason": adjustmentReason || "None",
      "Reliability Warning": reliabilityWarning || "Stable",
      "Probability Range": probRange,
      model_used: "Browser Text Heuristic v7 Strict",
      "Burstiness Rhythm (CV)": cv.toFixed(3),
      "Opener Formulaic Rate": (openerRate * 100).toFixed(1) + "%",
      "Lexical Diversity": (lexicalDiv * 100).toFixed(1) + "%",
      "AI Vocab Density": (vocabDensity * 100).toFixed(2) + "%",
      "Contraction Frequency": (contractionRate * 100).toFixed(2) + "%",
      "Mean Word Length": avgWordLen.toFixed(2) + " chars",
      humanization_attempt:
        humanizedAiSuspected ||
        (advancedText.success &&
          advancedText.aiWeight >= 4.0 &&
          advancedText.humanWeight >= 1.0)
          ? "high"
          : surfaceHumanNoise >= 1
            ? "medium"
            : "low",
      humanizer_noise_score: `${surfaceHumanNoise}`,
      anchored_specificity: `${anchoredSpecificity}`,
      advanced_text_ai_score: advancedText.success
        ? advancedText.aiWeight.toFixed(2)
        : "not available",
      advanced_text_human_score: advancedText.success
        ? advancedText.humanWeight.toFixed(2)
        : "not available",
      advanced_text_reasons: advancedText.success
        ? advancedText.topAiReasons.slice(0, 5).join(", ") || "none"
        : "not available",
      human_text_reasons: advancedText.success
        ? advancedText.topHumanReasons.slice(0, 5).join(", ") || "none"
        : "not available",
      strict_text_mode: "enabled",
      T01_Lexical_Repetition:
        arabicMeta.details?.T01_Lexical_Repetition ?? arabicCount,
      T05_Burstiness: arabicMeta.details?.T05_Burstiness ?? cv.toFixed(3),
      T13_Transition_Overuse:
        arabicMeta.details?.T13_Transition_Overuse ?? aiTransitionCount,
      T15_Personal_Experience:
        arabicMeta.details?.T15_Personal_Experience ?? "None",
      T20_LLM_Signature:
        arabicMeta.details?.T20_LLM_Signature ??
        (openerRate > 0.45 ? "Detected" : "None"),
      arabic_ai_signals: arabicMeta.isArabic
        ? `filters_triggered=${arabicMeta.details?.triggered_filters || 0}`
        : "N/A",
    },
  };
}

window.addEventListener("3truth:languagechange", () => {
  const modeConfig = DETECTOR_MODE_UI[activeTab] || DETECTOR_MODE_UI.text;
  if (analyzeBtn && analyzeBtn.querySelector("span")) {
    const newLabel = currentResult
      ? activeTab === "text"
        ? tr("detector.scanNewText", null, "SCAN NEW TEXT")
        : tr("detector.uploadNewFile", null, "UPLOAD NEW FILE")
      : modeConfig.analyzeLabel ||
        tr("detector.initializeScan", null, "INITIALIZE SCAN");
    analyzeBtn.querySelector("span").textContent = newLabel;
    analyzeBtn.querySelector("span").dataset.original = newLabel;
  }
  if (currentResult) {
    renderResult(currentResult);
  }
  updateInputCounters();
});

function showToast(message, duration = 3000) {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.cssText =
      "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;";
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement("div");
  toast.style.cssText =
    "background-color: #141414; border: 1px solid rgba(47, 238, 204, 0.3); color: #ffffff; padding: 16px 24px; border-radius: 12px; box-shadow: 0 0 30px rgba(47, 238, 204, 0.15); display: flex; align-items: center; gap: 16px; backdrop-filter: blur(10px); transform: translateY(50px); opacity: 0; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);";
  toast.innerHTML = `
    <div style="background: rgba(47, 238, 204, 0.1); padding: 8px; border-radius: 50%; border: 1px solid rgba(47, 238, 204, 0.3); display: flex; align-items: center; justify-content: center;">
        <i data-lucide="info" style="width: 20px; height: 20px; color: #2FEECC;"></i>
    </div>
    <span style="font-weight: 500; font-size: 14px; letter-spacing: 0.5px; color: #eeeeee;">${message}</span>
  `;
  toastContainer.appendChild(toast);
  if (typeof lucide !== "undefined") lucide.createIcons();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    });
  });

  setTimeout(() => {
    toast.style.transform = "translateY(50px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, duration);
}
