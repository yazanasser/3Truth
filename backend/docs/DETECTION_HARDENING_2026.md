# 3Truth Detection Hardening — 2026

## What the repository currently does

The production backend already contains separate provenance, pixel-forensics, neural, text, audio, temporal, Arabic, and fusion components. Image analysis includes noise, compression/ELA, frequency, scene physics, multiview, PRNU-residual, FFT spectral, Bayer/CFA, and face/specular analysis. The production model registry includes a general image ViT, an SDXL specialist, and a StyleGAN-face specialist. The repository also contains modality-specific fusion training scripts and calibration artifacts when provisioned.

## Critical weaknesses found

1. **The old fusion engine treated detector count as evidence diversity.** It multiplied the averaged logit by `1.25` whenever more than one signal existed. This can overstate confidence when several detectors measure the same underlying artifact.
2. **Legacy raw scores were consumed as probabilities.** Many hand-written forensic detectors return scores such as `0.65` or `0.80` without a statistically validated probability calibration artifact. Treating those numbers as probabilities makes the final result look more precise than the evidence supports.
3. **The old hierarchy over-trusted names.** A detector containing `provenance`, `EXIF`, or `metadata` in its name could enter a high-trust category without cryptographic verification.
4. **Disagreement was handled after the fusion result had already been strengthened.** This is backwards for forensic decision-making: conflict should reduce or eliminate decisiveness.
5. **The image path had an early-exit strategy based on a fusion probability before the expensive neural model ran.** A conservative forensic system should not early-exit merely because correlated passive signals happen to align.
6. **Several image heuristics use broad thresholds that are not generator-agnostic.** PRNU variance, Bayer correlations, Benford divergence, spectral slope, ELA, and checkerboard measurements can all be affected by camera pipelines, resizing, compression, denoising, sharpening, or ordinary editing.
7. **The current repository has very limited automated detector tests.** There is a security test, but no comprehensive cross-generator/transformation/abstention test suite for the detection engine.

## Changes in this branch

### Conservative evidence fusion

`fusion_engine.py` now:

- groups correlated detectors into evidence families;
- applies diminishing returns within a family;
- treats uncalibrated detector scores as evidence scores and shrinks them toward 0.5;
- only recognizes cryptographic provenance when the evidence actually indicates verification;
- never treats missing metadata as human evidence;
- removes the arbitrary multi-signal confidence boost;
- detects cross-family conflicts;
- abstains instead of forcing a binary answer when evidence is insufficient or conflicting;
- reports evidence-family diversity and uncertainty reasons.

### Robustness analysis

`robustness_engine.py` measures whether common transformations or quality conditions may have degraded forensic evidence. It explicitly does **not** interpret resizing, recompression, screenshots, blur, clipping, or missing metadata as proof of AI generation.

### Region and transform consistency

`image_ensemble.py` provides reusable whole-image, center-crop, quadrant, and mild-transformation views. An existing vision predictor can be run across those views; instability is reported as uncertainty/local disagreement rather than automatically becoming an AI signal.

### Tests

`tests/test_fusion_hardening.py` verifies three critical properties:

- absent evidence produces an inconclusive result;
- correlated detector counts do not create artificial certainty;
- strong cross-family disagreement causes abstention.

## Required next phase for production accuracy

The architecture must be paired with a real evaluation corpus. No architecture can compensate for an unrepresentative or leaked training/evaluation set.

### Image evaluation matrix

Build group-disjoint train/validation/test sets covering:

- real camera images from multiple devices and camera pipelines;
- fully synthetic images from multiple generator families;
- unseen generators held out entirely from training;
- AI-edited real photographs;
- inpainting/outpainting/object replacement;
- face swaps and synthetic faces;
- screenshots;
- JPEG/WebP/AVIF recompression;
- resize/crop/downscale/upscale;
- blur/sharpen/color/contrast operations;
- social-media-style transformations;
- combinations of multiple transformations;
- low-resolution and difficult-content cases.

The test set must be generator-disjoint and transformation-disjoint where appropriate. Results should include AUROC, AUPRC, FPR at fixed TPR, TPR at fixed FPR, balanced accuracy, calibration error, Brier score, and abstention/coverage curves.

### Manipulation localization

Add pixel/region localization as a separate task. A single image-level AI probability is insufficient for mixed images where only a face, object, or background was generated or edited. NIST OpenMFC explicitly evaluates manipulation detection and localization, including image/video manipulation and deepfake tasks.

### Provenance

Implement full C2PA verification as a separate trust channel. C2PA is provenance verification, not a universal truth detector. A valid signed manifest can establish that a provenance statement is cryptographically bound to the asset; absence of credentials is not evidence that the asset is human-created.

### Model strategy

Use heterogeneous models with held-out generator families. A practical image ensemble should combine:

- a strong general image discriminator;
- one or more architecture-diverse vision encoders;
- frequency/residual branches;
- a patch/localization model;
- a manipulation detector;
- provenance verification;
- transformation-aware quality estimation.

Do not simply add more copies of the same classifier family.

### Unknown-generator strategy

Maintain a generator-family holdout benchmark and a novelty/anomaly score. New generators should be evaluated by distribution shift, not by assuming the detector's confidence remains calibrated. Update the detector using newly collected generator families and retain a permanent unseen-generator test split.

## Research basis

- NIST's GenAI discriminator evaluations treat detection as a measurement problem across realistic generated content.
- NIST OpenMFC evaluates manipulation detection, deepfake detection, and localization/forensic tasks.
- DARPA MediFor describes an end-to-end approach that integrates multiple image/video forensic signals and reasoning rather than a single detector.
- GenImage evaluates cross-generator and degraded-image performance, including low-resolution, blur, and compression conditions.
- Recent large-scale benchmarking of open image detectors reports substantial ranking instability across datasets and poor performance on some modern commercial generators. This is direct evidence against relying on one universal image classifier.
- C2PA provides cryptographically verifiable provenance and explicitly distinguishes provenance verification from judging whether the depicted event itself is true.

## Operational rule

3Truth should prefer **INCONCLUSIVE** over a confident wrong binary verdict whenever the evidence is insufficient, contradictory, transformed beyond reliable forensic quality, or outside validated calibration coverage.
