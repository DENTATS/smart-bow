# SMARTBOW ZERO — PHASE 1C ENGINEERING CHANGELOG

## 1. Phase 1 Codebase Audit & Baseline Preservation

### 1.1 Git Baseline & Build Verification
- **Baseline Branch**: `phase-1b-baseline` (commit `993193f`) preserving the unmodified pre-Phase-1C repository state.
- **Working Branch**: `phase-1c-aruco-repair`.
- **Package Version**: `0.0.0` (`package.json`, Vite + React 19 + TypeScript 5.8).

### 1.2 Forensic Comparison Against `SMARTBOW_FORENSIC_AUDIT.md` (Stale Line Numbers & Actual Locations)
| Component / Finding | Audit Snapshot Reference | Actual Pre-Phase-1C Source Location | Status in Phase 1C |
| :--- | :--- | :--- | :--- |
| **F1: Small-Marker Geometric Size Gates** | `contour.length < 16`, `bw < 12`, `area < 120`, `minSide < 11` | `src/lib/arucoDetector.ts` lines `795`, `815`, `821`, `836`, `850` | Replaced with exported configuration block (`MIN_CONTOUR_POINTS = 12`, `MIN_BBOX_PX = 8`, `MIN_SIDE_PX = 7`, `MIN_AREA_PX2 = 40`). |
| **F2: Hardcoded 960 px Processing Cap** | `maxDim = 960` downscaling 1080p frames | `src/lib/arucoDetector.ts` lines `695` and `1242` | Raised to `MAX_PROC_DIM = 1920` with 10-frame rolling `45 ms` budget stepping down to `1280 px` (never below `960 px`). |
| **F3: Zero-Tolerance Border Rejection** | `if (borderOnes > 0) continue;` + strict `decodeMarkerGridWithConfidence` | `src/lib/arucoDetector.ts` lines `943–948` and `src/lib/arucoDict.ts` lines `260–266` | Updated to `MAX_BORDER_ERRORS = 7` (matching OpenCV `0.35 × 20 = 7` perimeter cells) with `borderWhiteCells` quality warning. |
| **Phase 4: `OBSCURED` & `LOW CONTRAST` Labels** | `PARTIALLY_OBSCURED` -> `OBSCURED`, `POOR_LIGHTING_OR_GLARE` -> `LOW CONTRAST` | `src/lib/arucoDetector.ts` lines `1070–1090` and `src/lib/opticalDiagnostics.ts` lines `311–330` | Separated detection from quality (`MarkerQuality`, `candidateSummary`); restricted `LOW LIGHT` (`meanLuminance < 42`) and `GLARE` (`glareRatio > 0.35 && rejectedFlat > 0`). |
| **Phase 5: Camera Init & UI Throttling** | `1280 × 720` hardcoded, `setLiveMarkers` gated by `80 ms` throttle, `#22c55e` single-color overlay | `src/components/LiveScanner.tsx` lines `244–252`, `426–432`, `467–518` | Added `1920×1080 -> 1280×720 -> default` fallback, continuous autofocus (`AF-C`), unthrottled `setLiveMarkers`, cyan (`#22d3ee`) Maxillary & amber (`#f59e0b`) Mandibular overlays. |
| **Phase 6: Legacy Unreferenced A4 SVG Asset** | `public/assets/aistudio/SmartBow_A4_Print_Sheet_100pct_Scale_b00d7131.svg` | Confirmed unreferenced across `src/`, `public/`, and `test/`; contained legacy `F01–F03` markers and broken SVG attributes | Deleted `public/assets/aistudio/SmartBow_A4_Print_Sheet_100pct_Scale_b00d7131.svg`; added full A4 sheet rasterization regression test (`27/27` markers). |

---

## 2. Phase 2 Architecture Preservation

- **Contactless Natural Facial Reference**: Preserved MediaPipe anatomical landmarks (`#10` Glabella, `#234` Right Zygoma, `#454` Left Zygoma, `#33/#263` Canthi) as the cranial coordinate reference. No physical ArUco markers are placed on the patient's face (`IDs 0–2` are excluded from `REGISTERED_ARUCO_IDS` and `CLINICAL_RIM_EXPECTED_IDS`).
- **Dictionary Parity**: All 50 canonical `DICT_4X4_50` bit matrices (`IDs 0–49`) are retained in `ARUCO_DICT_4X4_50_BITS` for 50/50 OpenCV dictionary parity.
- **Physical CAD Dimensions**: Unchanged (`6.5 × 6.5 mm` individual rim markers, `7.5 mm` center-to-center pitch, `14.0 × 14.0 mm` outer array span on an `18.0 × 18.0 × 3.0 mm` PMMA acrylic plate).

---

## 3. Detailed Code Changes by File

### 3.1 `src/lib/arucoDict.ts`
- Extended `MarkerDecodeResult` with `borderWhiteCells?: number`.
- Updated `decodeMarkerGridWithConfidence(grid, maxErrorBits = 0, maxBorderErrors = 0)` to count white perimeter cells across the 20 outer border cells and allow up to `maxBorderErrors` while keeping `maxBorderErrors = 0` as the default for strict digital grid checks (`decodeMarkerGrid`).

### 3.2 `src/lib/arucoDetector.ts`
- **F1 Named Constants**: Exported `MIN_CONTOUR_POINTS = 12`, `MIN_BBOX_PX = 8`, `MIN_SIDE_PX = 7`, `MIN_AREA_PX2 = 40`, `MAX_BORDER_ERRORS = 7`, `MAX_PROC_DIM = 1920`, `ADAPTIVE_FALLBACK_PROC_DIM = 1280`, `MIN_AUTO_PROC_DIM = 960`, and `PROC_FRAME_BUDGET_MS = 45`.
- **F2 Adaptive Processing Resolution**: Raised default processing dimension from `960 px` to `1920 px` (`MAX_PROC_DIM`), implemented `recordFrameProcessingDuration()`, `getAdaptiveResolutionState()`, and `resetAdaptiveResolutionController()` using a 10-frame rolling `45 ms` budget with hysteresis, and scaled all detected marker corners and `sidePx` metrics back to native `srcW × srcH` coordinates.
- **F3 Border Error Tolerance & Quiet-Zone Verification**: Allowed up to `MAX_BORDER_ERRORS = 7` white border cells on small/medium markers while requiring exact `0` Hamming distance on the inner `4×4` bits and verifying outer quiet-zone contrast whenever `borderOnes > 0`.
- **F4 Thresholding & Multi-Scale Contour Extraction**: Preserved RGBA-to-grayscale, 36-cell Otsu thresholding, and integral-image adaptive thresholding without pre-decode blur.
- **Phase 4 Quality & Candidate Diagnostics**: Added `MarkerQuality` (`id, sidePx, cellContrast, hamming, borderWhiteCells, sharpness, grade`) and mutually exclusive `candidateSummary` (`quads, rejectedTooSmall, rejectedBorder, rejectedDictionary, rejectedFlat`).

### 3.3 `src/lib/opticalDiagnostics.ts`
- Exposed `candidateSummary` and `markerQualities` on `LiveArucoDiagnosticStatus`.
- Deduplicated `detectedIds` across Maxillary (`3–6`) and Mandibular (`7–10`) group evaluations.
- Ensured any decoded marker produces `MARKERS_DETECTED` and `DETECTED` status label.
- Reported factual candidate counts (`Quads, TooSmall, Border, Dict, Flat`) when 0 markers are detected, restricted `LOW LIGHT` to `meanLuminance < 42`, and restricted `GLARE` to `glareRatio > 0.35 && rejectedFlat > 0`.

### 3.4 `src/components/LiveScanner.tsx`
- Implemented the 4-stage camera constraint fallback sequence (`1920×1080` ideal -> `1280×720` ideal -> device/facing defaults -> browser `video: true`), continuous autofocus request (`focusMode: 'continuous'`), actual `videoWidth × videoHeight` display, and `< 1280 × 720` warning badge.
- Moved `setLiveMarkers` and `setFrameDiag` outside the `80 ms` telemetry throttle so fresh detections render and update React state immediately while preserving 2-frame disappearance hysteresis.
- Added color-coded quadrilateral outlines (Maxillary cyan `#22d3ee`, Mandibular amber `#f59e0b`) and structured group status readouts (`Detected IDs`, `Count: n/4`, `Missing`).

### 3.5 `src/components/PrintableMarkersModal.tsx` & Print Assets
- Removed unreferenced legacy SVG `public/assets/aistudio/SmartBow_A4_Print_Sheet_100pct_Scale_b00d7131.svg`.
- Added explicit optical resolution and approximate working-distance guidance for the `6.5 mm` dental-rim markers.

### 3.6 `tools/gen_golden.py`, `test/arucoParity.ts`, and `test/runTests.ts`
- Added `tools/gen_golden.py` (Python OpenCV `cv2.aruco` ground-truth generator) and `test/arucoParity.ts` (17-category parity verification suite) plus Test `23k` (full A4 print sheet rasterization regression test in `test/runTests.ts`).
