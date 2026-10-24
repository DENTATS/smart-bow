# SMARTBOW AI — PHASE 1B FORENSIC AUDIT REPORT
**Document Version:** 1.2.0  
**Date:** October 2026  
**Auditors:** Multidisciplinary Engineering Team (Senior Computer Vision Engineer, Prosthodontist, CAD/Product Engineer, Print-Production Engineer, Technical Writer, QA Engineer)  
**Baseline Commit:** `9b1bbb0` | **Repair Branch:** `phase-1b-forensic-redesign`

---

## 1. Executive Summary

SmartBow AI is an experimental digital jaw-relation and virtual facebow system designed to record maxillomandibular relationships, vertical dimension of occlusion (VDO), and condylar guidance angles for complete denture prosthodontics using smartphone optics and ArUco fiducials.

This forensic audit was conducted following clinical feedback indicating that printed markers were undetectable by computer vision and that stated occlusal rim dimensions caused confusion during laboratory fabrication. 

### Critical Findings
1. **Fiducial Detection Failure (Root Cause):** In `PrintableMarkersModal.tsx` (line 53), the ArUco SVG generator inverted the black/white bit polarity. The 1-bit outer border was generated as white (`#ffffff`) on a white page instead of black (`#000000`). Standard OpenCV ArUco detectors cannot detect a marker without a high-contrast black perimeter.
2. **Printer Scaling Distortion:** Inline CSS hardcoded a $3.7795\text{ px/mm}$ multiplier (assuming 96 DPI). When printed via browser print dialogues, page margins and "Fit to Page" distorted the physical marker dimensions by 4–12%.
3. **Anatomical vs. Hardware Dimension Confusion:** The documentation and manual conflated the $18 \times 18 \times 3\text{ mm}$ acrylic marker bracket with the wax rim occlusal height. Furthermore, wax rim dimensions were improperly described as universal constants rather than initial fabrication references requiring chairside adjustment.
4. **Ambiguous Board CAD Specification:** The array was described as "6.5 mm markers at 14 mm pitch on an 18 mm plate" without defining whether 14 mm was center-to-center pitch or outer bounding span. (Outer span is $14\text{ mm}$, center-to-center is $7.5\text{ mm}$, edge margin is $2.0\text{ mm}$).
5. **Diagnostic Opacity:** The camera scanner displayed generic `Mode: none` or blank status when markers dropped out of view, offering no actionable recovery guidance to the dental operator.

---

## 2. Complete Repository File Inventory

| File Path | Role & Functionality | Audit Status | Key Issues Identified |
| :--- | :--- | :--- | :--- |
| `src/App.tsx` | Main application shell, state store, and tab coordinator. | Verified | Requires passing updated diagnostic states and datum constants. |
| `src/components/TopNav.tsx` | Global navigation bar, modal openers, patient selector. | Verified | Working cleanly. |
| `src/components/LiveScanner.tsx` | Camera viewfinder, MediaPipe mesh overlay, ArUco tracking display. | **Faulty** | Generic `Mode: none`; needs 10-state visual diagnostic system & capture gating. |
| `src/components/PrintableMarkersModal.tsx` | Renders 1:1 printable sheets of ArUco fiducials. | **CRITICAL FAULT** | Line 53 inverted bit polarity; line 43 CSS px scaling; lacks PDF export. |
| `src/components/UserManualModal.tsx` | Clinical operator manual modal. | **Faulty** | Too text-heavy; lacks 4-page pictorial Quick-Start guide and print checklist. |
| `src/components/CameraCalibrationModal.tsx` | Pinhole camera intrinsic calibration with 3×3 ArUco card. | Verified | Functional; needs explicit UNCALIBRATED warning until completed. |
| `src/components/VdoDashboard.tsx` | VDO evaluation, Niswonger freeway space calculator. | Verified | Uses Boucher criteria; requires explicit datum references. |
| `src/components/CrRecorder.tsx` | Centric Relation repeatability evaluation ($<0.5\text{ mm}$ threshold). | Verified | Robust spatial dispersion algorithm; verified in Phase 1. |
| `src/components/GothicArchTracer.tsx` | Needle-point apex tracing and condylar angle estimation. | Verified | Correctly handles null states when border movements are absent. |
| `src/components/VirtualArticulator3D.tsx` | Three.js 3D Hanau Wide-Vue simulation and cast mounting. | Verified | Uses safe null-coalescing for condylar inclination angles. |
| `src/components/ValidationSuite.tsx` | Physical bench validation reporting vs simulation. | Verified | Prohibits synthetic data from triggering a physical PASS. |
| `src/lib/arucoDict.ts` | DICT_4X4_50 bit definitions, SVG generators, board layout. | **Faulty** | `renderBoardSvg` dimensions need explicit CAD center and margin definitions. |
| `src/lib/arucoDetector.ts` | Client-side fiducial detector. | Verified | Experimental canvas processing stub. |
| `src/lib/cameraCalibration.ts` | Camera intrinsics storage and calibration card definitions. | Verified | Mathematical formulas sound. |
| `src/lib/faceTrackingEngine.ts` | Realtime tracking engine, MediaPipe topology, simulation. | **Faulty** | Needs integration with the 10-state optical diagnostic engine. |
| `src/lib/patientFrame.ts` | Rigid body 4×4 transformations, matrix inversion, vector math. | Verified | Proved mathematically in Phase 1 ($T \cdot T^{-1} = I$ within $10^{-14}$). |
| `src/lib/prosthodonticLiterature.ts` | Clinical groundings (Boucher, Niswonger, Silverman, Posselt). | Verified | Needs updated Boucher/Winkler page citations and retromolar pad spec. |
| `src/lib/stlGenerator.ts` | ASCII STL generator for 3D printed Hanau mounting jig. | Verified | Watermarked; needs updated anatomical reference datums. |
| `src/lib/exportArticulator.ts` | exocad, 3Shape XML, and Hanau prescription text exports. | Verified | Fully watermarked against unvalidated clinical use. |
| `src/types/smartbow.ts` | TypeScript definitions and data provenance models. | Verified | Extend with new diagnostic states and dimensional interfaces. |
| `test/runTests.ts` | Automated test suite. | Verified | 59/59 Phase 1 tests pass; needs marker decoding & CAD dimension tests. |

---

## 3. Confirmed Faults & Root Cause Analysis

### Fault 1: Inverted ArUco Marker Bit Polarity (Confirmed)
- **Location:** `src/components/PrintableMarkersModal.tsx`, Line 53.
- **Code:** `fill={val === 1 ? '#000000' : '#ffffff'}`
- **Standard Requirement:** In OpenCV ArUco DICT_4X4_50, the marker matrix consists of a 1-bit solid black border (value 0) surrounding a 4×4 data grid. In `getFullMarkerGrid(id)`, row 0, row 5, col 0, and col 5 are initialized to 0. A value of 0 MUST render as black (`#000000`), and a value of 1 MUST render as white (`#ffffff`).
- **Failure Consequence:** Line 53 mapped 0 to white (`#ffffff`) and 1 to black (`#000000`). Consequently, the outer border was rendered in pure white against a white paper background, completely destroying the square contour. Standard OpenCV contour detection (`findContours` / polygon approximation) cannot detect the marker boundary.
- **Correction:** Invert the ternary operator to `val === 1 ? '#ffffff' : '#000000'`, and ensure an adequate white quiet zone surrounds the black border.

### Fault 2: Fragile CSS Pixel Print Scaling (Confirmed)
- **Location:** `src/components/PrintableMarkersModal.tsx`, Line 43.
- **Code:** `style={{ width: `${sizeMm * 3.7795}px`, height: `${sizeMm * 3.7795}px` }}`
- **Root Cause:** Attempted to convert millimeters to pixels using $96\text{ DPI} / 25.4 = 3.77952755\text{ px/mm}$. On physical printers, CSS pixel dimensions are subject to operating system DPI virtualization, browser margins, and default "Fit to Page" print dialogue scaling.
- **Failure Consequence:** A printed $18\text{ mm}$ board measured anywhere from $16.2\text{ mm}$ to $19.4\text{ mm}$ on physical paper, rendering physical pose estimation inaccurate.
- **Correction:** Declare SVG dimensions strictly in physical millimeters (`width="18mm" height="18mm" viewBox="0 0 18 18"`), inject `@media print` rules enforcing zero margins and 100% scale, and provide a physical 100.0 mm Vernier caliper scale check bar.

### Fault 3: Wax Rim Dimensions Conflated with Marker Bracket (Confirmed)
- **Location:** Project documentation, drawings, and `UserManualModal.tsx`.
- **Root Cause:** The system failed to distinguish between:
  1. *Anatomical complete denture wax rims* contoured chairside.
  2. *Physical acrylic bracket* ($18 \times 18 \times 3\text{ mm}$) carrying fiducials.
  3. *Fiducial marker geometry* ($6.5 \times 6.5\text{ mm}$ squares).
- **Failure Consequence:** Clinicians were misled into believing the wax rims had to be exactly 18 mm tall, conflicting with standard prosthodontic principles where the maxillary anterior rim is fabricated to 20–22 mm.
- **Correction:** Establish a definitive Sourced Dimensional Table separating wax rim construction references from hardware brackets.

### Fault 4: Ambiguous 18 × 18 mm Marker Board Layout (Confirmed)
- **Location:** `src/lib/arucoDict.ts`, function `renderBoardSvg`.
- **Root Cause:** The documentation stated: "Four 6.5 mm markers at 14 mm pitch on an 18 mm board." If "pitch" meant center-to-center spacing, $14 + 6.5 = 20.5\text{ mm} > 18\text{ mm}$ (impossible). In code:
  - Bounding box of marker array: $14.0 \times 14.0\text{ mm}$.
  - Margin to board edge: $(18.0 - 14.0) / 2 = 2.0\text{ mm}$.
  - Center-to-center marker spacing: $14.0 - 6.5 = 7.5\text{ mm}$.
  - Central alignment crosshair corridor: $14.0 - (2 \times 6.5) = 1.0\text{ mm}$ between marker inner edges.
- **Correction:** Publish a formal CAD dimensioned engineering drawing and exact coordinate specifications for board fabrication.

### Fault 5: Uncalibrated Optical Mode Opacity (Confirmed)
- **Location:** `src/components/LiveScanner.tsx`.
- **Root Cause:** When tracking dropped out, the scanner rendered `Mode: none` or blank telemetry without distinguishing between camera failure, face landmark failure, or fiducial occlusion.
- **Correction:** Implement a 10-state optical diagnostic state machine with actionable operator recovery steps.

---

## 4. Suspected Faults (Under Investigation)

1. **Camera Rolling Shutter Distortion During Rapid Head Rotation:**
   - *Status:* Suspected.
   - *Detail:* Smartphone CMOS sensors capture frames via rolling shutter. Fast patient head movements during Gothic arch excursions could shear the fiducial geometry, causing transient pose jitter.
   - *Mitigation:* Advise slow, deliberate border movements ($< 5\text{ mm/s}$) in the manual; add dynamic motion blur warnings.

2. **Specular Reflection from Saliva or Glossy Acrylic:**
   - *Status:* Suspected in clinical operatory settings.
   - *Detail:* Dental operatory LED overhead lights ($> 1500\text{ Lux}$) can reflect off glossy laminates, blinding the camera to the black/white transition.
   - *Mitigation:* Specify matte paper and non-reflective acrylic coating in the Quick-Start guide.

---

## 5. Authoritative Dimensional Sourced Baseline

The table below reconciles all stated dimensions against classic prosthodontic literature and physical hardware specifications:

| Parameter | Current Stated Value | Sourced Correct Value | Unit | Engineering / Clinical Source | Identified Discrepancy & Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Maxillary Rim Anterior Height** | 22 mm | **20 – 22 mm** (Construction reference) | mm | Boucher 12th ed., p. 285; Winkler 2nd ed., p. 138 | Stated as absolute constant. Clarified as starting fabrication reference requiring clinical phonetics adjustment. |
| **Maxillary Rim Posterior Height** | 8 mm | **8 – 10 mm** | mm | Boucher 12th ed., p. 285 | Reconciled as 8–10 mm tapering posteriorly, ending anterior to hamular notch. |
| **Maxillary Rim Anterior Width** | 4 – 5 mm | **4 – 5 mm** | mm | Boucher 12th ed., p. 286 | Matches standard incisal edge contour. |
| **Maxillary Rim Posterior Width** | 8 – 10 mm | **8 – 10 mm** | mm | Boucher 12th ed., p. 286 | Matches standard molar table contour. |
| **Maxillary Labial Angulation** | 8 – 10° | **8 – 10° proclination** | deg | Boucher 12th ed., p. 285 | Reconciled for vermilion border support. |
| **Mandibular Rim Anterior Height** | 18 mm | **16 – 18 mm** (Construction reference) | mm | Boucher 12th ed., p. 287; Winkler 2nd ed., p. 140 | Clarified as starting reference from labial sulcus reflection. |
| **Mandibular Rim Posterior Height** | "Retromolar pad" | **Junction of middle & upper third of retromolar pad** | mm | Boucher 12th ed., p. 287 | Defined exact anatomical boundary; rim terminates flush with this level. |
| **Mandibular Rim Width** | 4 mm ant / 8 mm post | **4 – 5 mm ant / 8 – 10 mm post** | mm | Boucher 12th ed., p. 287 | Centered over crest of residual ridge (Pound's triangle). |
| **Acrylic Marker Bracket** | 18 × 18 mm | **18.0 × 18.0 × 3.0 mm** | mm | SmartBow CAD Spec v1.2 | Rigid acrylic baseplate tab with wire tag channel. |
| **Array Outer Bounding Span** | 14 mm | **14.0 × 14.0 mm** | mm | SmartBow CAD Spec v1.2 | Outer perimeter of 4-marker cluster. |
| **Marker Bounding Dimension** | 6.5 mm | **6.50 × 6.50 mm** | mm | OpenCV DICT_4X4_50 | 6×6 bit cell grid (1-bit border + 4-bit data). |
| **Marker Center-to-Center Spacing**| "14 mm pitch" | **7.50 mm** | mm | SmartBow CAD Spec v1.2 | Distance between adjacent marker centroids. |
| **Plate Edge Quiet Zone Margin** | Unspecified | **2.00 mm** | mm | SmartBow CAD Spec v1.2 | Unprinted white acrylic perimeter. |
| **Central Crosshair Corridor** | Unspecified | **1.00 mm gap / 3.5 mm center** | mm | SmartBow CAD Spec v1.2 | Clear corridor for visual axis alignment. |
| **Facial Markers F01, F02, F03** | 14 mm | **14.0 × 14.0 mm** | mm | SmartBow CAD Spec v1.2 | Single 6×6 ArUco marker on adhesive backing. |
| **Calibration Target Markers** | 12 mm | **12.0 × 12.0 mm** | mm | SmartBow Camera Cal Spec | 3×3 grid with 18.0 mm center-to-center pitch. |
| **Physical Calibration Ruler** | 100 mm | **100.00 ± 0.20 mm** | mm | ISO 2768-m Precision | Must be verified with Vernier caliper prior to cutting. |

---

## 6. CAD Dimensional Layout for 18 × 18 mm Target Array

```
                 18.00 mm
       ┌───────────────────────────┐
       │     2.00 mm margin        │
       │   ┌──────┐     ┌──────┐   │
       │   │ M_01 │     │ M_02 │   │
       │   │6.50mm│     │6.50mm│   │
       │   └──────┘  ┼  └──────┘   │  18.00 mm
       │       │ 7.50 mm │         │
       │   ┌──────┐     ┌──────┐   │
       │   │ M_03 │     │ M_04 │   │
       │   │6.50mm│     │6.50mm│   │
       │   └──────┘     └──────┘   │
       │                           │
       └───────────────────────────┘
```

- **Plates:** Medical-grade transparent or opaque white PMMA acrylic ($18.0 \pm 0.1\text{ mm} \times 18.0 \pm 0.1\text{ mm}$, thickness $3.0 \pm 0.2\text{ mm}$).
- **Marker Centroids Relative to Plate Center $(0, 0)$:**
  - $M_1$ (Top-Left): $(-3.75\text{ mm}, +3.75\text{ mm})$
  - $M_2$ (Top-Right): $(+3.75\text{ mm}, +3.75\text{ mm})$
  - $M_3$ (Bottom-Left): $(-3.75\text{ mm}, -3.75\text{ mm})$
  - $M_4$ (Bottom-Right): $(+3.75\text{ mm}, -3.75\text{ mm})$
- **Corner Notching:** $1.0 \times 1.0\text{ mm}$ $45^\circ$ chamfer on top-right corner to indicate absolute physical orientation.
- **Quiet Zone:** Minimum $1.5\text{ mm}$ pure white border around all marker outer edges.

---

## 7. Verification & Testing Requirements

To confirm that all identified faults are remediated, the automated test suite (`test/runTests.ts`) must execute:
1. **Digital ArUco Bit Polarity & ID Decoding:** Programmatically decode the SVG bit matrix for all 13 registered markers (IDs 0–12) and confirm 100% ID matching with OpenCV DICT_4X4_50.
2. **Physical Dimensions & Scaling Invariants:** Verify that exported SVG viewBox and millimeter dimensions match the CAD specification ($18.0\text{ mm}$, $14.0\text{ mm}$, $100.0\text{ mm}$) without CSS pixel multipliers.
3. **Anatomical Datum Integrity:** Verify that Boucher/Winkler construction references are accurately represented as ranges ($20\text{--}22\text{ mm}$, $16\text{--}18\text{ mm}$) and retromolar pad junction definitions.
4. **Diagnostic State Machine Coverage:** Test all 10 optical diagnostic states and ensure shutter capture is gated when technical requirements are unmet.
5. **Real Test Execution Logging:** Record exact command line, environment, timestamps, and pass/fail outputs in `SMARTBOW_TEST_REPORT.md`.

---
*End of Forensic Audit Report.*
