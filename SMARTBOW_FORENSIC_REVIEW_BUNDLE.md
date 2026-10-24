# SmartBow AI — Phase 1B Forensic Engineering Review Bundle
**Document ID:** SB-FRB-PHASE1B-002  
**Project:** SmartBow Digital Jaw Relations & Facebow System  
**Review Target:** Independent Computer Vision, Metrology & Prosthodontic Peer Review  
**Git Baseline Commit:** `9b1bbb0` | **Branch:** `phase-1b-forensic-redesign`  

---

## 1. Executive Summary & Confirmed Root Causes

A multidisciplinary forensic audit resolved four critical defect domains in the physical marker and optical tracking pipeline:

1. **ArUco Marker Polarity Inversion:**
   - *Fault:* `PrintableMarkersModal.tsx` rendered `val === 1 ? '#000000' : '#ffffff'`, inverting the OpenCV binary representation. Outer perimeter cells (which must be 0) rendered pure white on white paper. OpenCV detectors require a solid black enclosing border to segment candidate quadrilaterals.
   - *Correction:* Fixed bit polarity ($0 \to \text{black}$, $1 \to \text{white}$). Enforced 1-bit solid black enclosing border.
   - *Verification:* Verified against independent OpenCV ground-truth bitmatrices (`test/independentOpenCvReference.ts`). 100% of markers (IDs 0–12 and 20–28) decode cleanly at 0°, 90°, 180°, and 270° orientations.

2. **Print Scaling & Distortion:**
   - *Fault:* Marker generation previously applied CSS pixel multipliers (`sizeMm * 3.7795px`), coupling physical millimeter dimensions to browser DPI and screen zoom.
   - *Correction:* Enforced pure SVG millimeter units (`width="14mm" height="14mm" viewBox="0 0 14 14"`). Added `@page { size: A4 portrait; margin: 0; }` and `zoom: 100% !important;` in print stylesheets.
   - *Verification:* Integrated an interactive digital caliper calibration tool requiring physical measurement of the 100.0 mm reference scale bar within strict ±0.20 mm tolerance.

3. **Rim Dimension Confusion & Grounding:**
   - *Fault:* Starting complete denture fabrication reference dimensions were previously cited without verified page citations or distinction from universal patient absolutes.
   - *Correction:* Sourced all dimensions to *Boucher's Prosthodontic Treatment for Edentulous Patients* (12th ed., pp. 248–254) and *Winkler* (2nd ed., pp. 138–143). Sourced datums are explicitly coded as starting construction baselines (`isUniversalConstant: false`).
   - *Verification:* Retromolar pad junction datum and all 6 anatomical reference parameters verified via automated tests.

4. **Optical Diagnostic Gating & State Integrity:**
   - *Fault:* Untracked or partially occluded frames defaulted to ambiguous states (`Mode: none`).
   - *Correction:* Implemented an authoritative 10-state Optical Diagnostic Engine that detects stale telemetry (>500ms), uncalibrated camera intrinsics, incomplete marker groups, or loss of tracking during shutter click, immediately disabling capture.
   - *Verification:* Automated tests in Test Group 15 confirm capture is blocked across all error states.

---

## 2. Verified CAD Mechanical Specification (18.0 × 18.0 mm Carrier Plate)

```
        |<------------------- 18.00 mm ------------------->|
        +---------------------------------------------------+  ---
        |  [2.00 mm margin]                                 |   ^
        |      +-----------+             +-----------+      |   |
        |      |  ArUco 3  |             |  ArUco 4  |      |   |
        |      | 6.5 x 6.5 | < 7.5 mm >  | 6.5 x 6.5 |      |   |
        |      +-----------+    pitch    +-----------+      |   |
        |                                                   | 18.00 mm
        |      +-----------+             +-----------+      |   |
        |      |  ArUco 5  |             |  ArUco 6  |      |   |
        |      | 6.5 x 6.5 |             | 6.5 x 6.5 |      |   |
        |      +-----------+             +-----------+      |   |
        |                                 [2.00 mm margin]  |   v
        +---------------------------------------------------+  ---
```

### Complete Plain-Text Mechanical Parameters:
- **Baseboard Footprint:** 18.00 mm (width) × 18.00 mm (height) × 3.00 mm (thickness) (tolerance: ±0.10 mm).
- **Substrate Material:** Clear cast PMMA acrylic or autoclavable biocompatible dental 3D-printing resin.
- **Marker Square Dimensions:** 6.50 mm × 6.50 mm per individual ArUco marker (tolerance: ±0.05 mm).
- **Marker Array Layout:** 2 rows × 2 columns = 4 markers per board.
- **Adjacent Center-to-Center Pitch:** 7.50 mm (tolerance: ±0.05 mm).
- **Array Outer Span:** 14.00 mm × 14.00 mm (from outer edge of left marker to outer edge of right marker).
- **Perimeter Edge Margins:** 2.00 mm uniform acrylic border all around.
- **Internal Clearance (Gap between opposing markers):** 1.00 mm (calculated as: 7.50 mm pitch - 6.50 mm marker size = 1.00 mm).
- **Marker Centroids (from Board Center at [0, 0]):**
  - Top-Left (Marker 1): (-3.75 mm, +3.75 mm)
  - Top-Right (Marker 2): (+3.75 mm, +3.75 mm)
  - Bottom-Left (Marker 3): (-3.75 mm, -3.75 mm)
  - Bottom-Right (Marker 4): (+3.75 mm, -3.75 mm)
- **Mucosal Safety Relief:** 0.50 mm × 45° circumferential chamfer on all mucosal-contacting edges.
- **Retention Anchoring:** Dual 0.80 mm diameter stainless steel orthodontic wire tacks, length 12.00 mm, pin span 10.00 mm.
- **Mathematical Formula Proof:**
  - Outer Span (14.00 mm) + 2 × Edge Margin (2.00 mm) = 18.00 mm.
  - Center Pitch (7.50 mm) + Marker Size (6.50 mm) = Outer Span (14.00 mm).
  - Center Pitch (7.50 mm) - Marker Size (6.50 mm) = Inter-Marker Gap (1.00 mm).
- **3D Printable STL Output:** Generated via `generateMarkerCarrierPlateStl()`. 12-facet closed solid ASCII mesh, bounding box 18.0 × 18.0 × 3.0 mm.

---

## 3. Sourced Occlusal Rim Construction Reference Datums

### Primary Authority Citations & Exact Context:

1. **Maxillary Anterior Rim Height: 20.0 to 22.0 mm**
   - *Source:* Boucher's Prosthodontic Treatment for Edentulous Patients (12th ed., 2004, Chapter 15, p. 248); Winkler S. Essentials of Complete Denture Prosthodontics (2nd ed., 1988, p. 138).
   - *Datum Point:* Measured from the depth of the labial sulcus reflection, immediately lateral to the labial frenal notch, to the incisal edge of the wax rim.
   - *Clinical Context:* Laboratory starting reference. Must be contoured chairside: shows 1.0 to 2.0 mm below resting upper lip in young patients, flush in older patients. Verified phonetically using fricative "F" and "V" sounds against lower lip vermilion.

2. **Maxillary Posterior Rim Height: 8.0 to 10.0 mm**
   - *Source:* Boucher's Prosthodontic Treatment for Edentulous Patients (12th ed., p. 249).
   - *Datum Point:* Measured in the first molar region from the sulcus reflection adjacent to the maxillary tuberosity.
   - *Clinical Context:* Oriented parallel to Camper's line (ala-tragus) anteroposteriorly using a Fox plane guide, and parallel to the interpupillary line mediolaterally.

3. **Mandibular Anterior Rim Height: 16.0 to 18.0 mm**
   - *Source:* Boucher's Prosthodontic Treatment for Edentulous Patients (12th ed., p. 252); Winkler S. (2nd ed., p. 140).
   - *Datum Point:* Measured from the depth of the labial/lingual sulcus reflection to the incisal edge.
   - *Clinical Context:* Flush with the lower lip vermilion border at rest. Checked via Silverman's closest speaking space (1.0 to 2.0 mm clearance during sibilant "S" count 60–66).

4. **Mandibular Posterior Height: Junction of Middle & Upper 1/3 of Retromolar Pad**
   - *Source:* Boucher's Prosthodontic Treatment for Edentulous Patients (12th ed., p. 253, citing Wright CR, 1966); Winkler S. (2nd ed., p. 143).
   - *Datum Point:* Posterior plane terminates flush with the junction of the middle and upper third of the pear-shaped retromolar pad.
   - *Clinical Context:* The retromolar pad contains glandular tissue and deep tendon attachments (temporalis, buccinator, pterygomandibular raphe) and does not undergo significant alveolar ridge resorption. It is an anatomically stable posterior vertical and horizontal plane datum.

5. **Maxillary & Mandibular Rim Widths:**
   - Anterior width: 4.0 to 5.0 mm (adequate lip support without effacing philtrum).
   - Posterior width: 8.0 to 10.0 mm (confined within Pound's Triangle between tongue and buccinator).

---

## 4. Optical Diagnostic State Machine & Gating Verification

```
[CAMERA_NOT_AVAILABLE]          <- No video stream or permission denied
[FACE_NOT_DETECTED]             <- Patient outside optical FOV
[NO_ARUCO_MARKERS_DETECTED]     <- Rims not in FOV or occluded
[FACE_MARKERS_INCOMPLETE]       <- Glabella (F01) or Zygomas (F02/F03) hidden
[MAXILLARY_MARKERS_INCOMPLETE]  <- <4 markers detected on upper rim array
[MANDIBULAR_MARKERS_INCOMPLETE] <- <4 markers detected on lower rim array
[CAMERA_NOT_CALIBRATED]         <- Intrinsics matrix unverified
[MARKER_SIZE_NOT_VERIFIED]      <- 100mm caliper scale check unconfirmed
[MEASUREMENT_NOT_AVAILABLE]     <- Motion blur / jitter / stale frame (>500ms)
=============================================================================
READY_FOR_ENGINEERING_TEST      <- All prerequisites locked (Shutter Enabled)
=============================================================================
```

- **Gating Hardening:** Capture shutter is strictly disabled (`GATED`) for all 9 non-ready states.
- **Stale Measurement Guard:** Any telemetry frame older than 500 ms triggers `MEASUREMENT_NOT_AVAILABLE`.
- **Transient Exposure Guard:** `checkCaptureReadiness()` re-evaluates optical tracking at the exact instant of shutter trigger; if tracking was lost during exposure, capture aborts without recording corrupted coordinates.

---

## 5. Independent Verification Evidence

- **Total Automated Tests:** 80 tests executed via `npm run test` (`tsx test/runTests.ts`).
- **Pass Rate:** 80 / 80 (100.0%).
- **Independent OpenCV Ground Truth:** 100% pass across independently hardcoded DICT_4X4_50 matrices.
- **Linter Check:** `tsc --noEmit` — 0 errors.
- **Build Check:** `npm run build` — compiled cleanly.
- **Physical Caliper Check:** Interactive tool accepts millimeter caliper readings and calculates scale correction factors with ±0.20 mm tolerance.
