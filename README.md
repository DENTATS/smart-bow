# SmartBow AI — Digital Jaw Relation and Prosthodontic Measurement System
### Four-Day Engineering Presentation Prototype

**Lead Prosthodontist & Researcher:** Dr. Deepanshu, MDS Prosthodontics  
**Institution:** Maitri College of Dentistry and Research Centre  
**Platform:** React 19 + TypeScript + Vite (Tailwind CSS, Three.js)  
**Target Environments:** Mobile browsers (Motorola Edge 70 Fusion / Android Chrome), Tablet, Desktop Chrome/Safari.

---

## 1. Project Objective

**SmartBow AI** is an engineering prototype designed to demonstrate a digital, contactless, computer-vision prosthodontic jaw relation recording workflow. It is engineered to replace cumbersome analog instruments:
1. **Mechanical Facebow & Bite Fork:** Replaced by contactless optical tracking of cranial landmarks and miniature 18×18 mm fiducial carrier boards.
2. **Fox Occlusal Plane Guide:** Replaced by real-time quantitative calculation of mediolateral tilt (vs. Bipupillary line) and anteroposterior tilt (vs. Camper's line / ala-tragus).
3. **Willis Facial Caliper:** Replaced by continuous optical vertical dimension tracking (VDO / VDR / Freeway Space).
4. **Intraoral Needle-Point Gothic Arch Tracer:** Replaced by dynamic border movement tracking with automatic centric apex identification and condylar guidance angle estimation (SCI and bilateral Bennett angles).

> **Safety & Truthful Labeling Notice:** This is a demonstration and engineering validation prototype. It does not claim completed clinical trials or medical device certification. Every output is explicitly tagged with strict data provenance (`LIVE MEASURED`, `LIVE UNCALIBRATED`, `CALIBRATED ENGINEERING MEASUREMENT`, `SIMULATED DEMONSTRATION`, or `UNAVAILABLE`). Missing measurements are never populated with fabricated numbers.

---

## 2. Zero-Cloud / Zero-AI Dependency Constraint

- **No Gemini API Key Required:** The core application runs 100% client-side in the browser.
- **Zero Mandatory External Services:** All computer vision, ArUco decoding, 3D coordinate transformations, matrix inversions, and vector PDF generations execute locally.
- **Offline / Local Execution:** Another coding agent or clinician can clone and run the entire system locally without external API accounts.

---

## 3. Quick Start & Execution

### Prerequisites
- Node.js 18+ or Bun
- Standard modern browser with WebRTC webcam support (Chrome, Edge, Firefox, Safari)

### Installation & Run Commands
```bash
# 1. Install dependencies
npm install

# 2. Run local development server (Port 3000)
npm run dev

# 3. Execute unit and safety verification test suite (100 automated tests)
npm test

# 4. Production build
npm run build
```

---

## 4. The 8 Core Modules

### Module 1: Dashboard (`HomeDashboard.tsx`)
- Active patient case overview and switch patient database.
- Recent cases registry with timestamps and provenance badges (`SIMULATED` vs `MEASURED`).
- 7-Stage Digital Jaw Relation Workflow milestone tracker.
- Persistent Demo / Live session mode toggle.
- 1-Click "Launch 4-Day Presentation Tour" modal.

### Module 2: Patient Assessment & Facial Photometry (`FacialAnalysisView.tsx`)
- Patient identification demographics.
- Dual-mode photographic acquisition (Frontal and Lateral Profile) via webcam snapshot or image upload.
- Anonymized clinical reference graphics for instant offline evaluation.
- Interactive anatomical reference plane overlays:
  - **Frontal:** Interpupillary line (cant in degrees), Facial Midline, Horizontal facial thirds (Trichion, Glabella, Subnasale, Menton).
  - **Profile:** Camper's line (Ala-Tragus), Frankfort horizontal plane, Ricketts E-line (nose tip to pogonion), Nasolabial angle.
- Clearly stamped: `ESTIMATED FROM 2D PHOTOMETRY — UNCALIBRATED`.
- Central incisor width (CIW) estimation via Berry's ratio (`Bizygomatic Width / 16`).

### Module 3: Camera & Tracking (`LiveScanner.tsx`)
- Browser-native camera permission handling with descriptive diagnostics (`NotAllowedError`, `NotFoundError`, `NotReadableError`).
- Camera device enumeration and selection dropdown (Front User, Rear Environment, External USB HD).
- Real-time frame illumination (IRE level) and FPS counter.
- Truthful tracking: uses genuine optical chromaticity and feature centroids (Glabella F01, Zygomas F02/F03). Never claims fabricated 468 MediaPipe landmarks.

### Module 4: ArUco Marker Detection & Sub-mm CAD (`arucoDetector.ts` + `LiveScanner.tsx`)
- Fast in-browser optical scanning (`detectArucoMarkersFromCanvas`) evaluating square candidate perimeters against OpenCV `DICT_4X4_50`.
- Tracks Maxillary board (IDs 3–6), Mandibular board (IDs 7–10), and Calibration card (IDs 20–28).
- Live Marker Telemetry HUD displaying detected IDs, $(u, v)$ pixel coordinates, centers, and pose vectors.
- Clearly documented physical dimensions: 18.0 × 18.0 × 3.0 mm carrier plate, 6.5 mm individual markers, 7.5 mm pitch, 2.0 mm quiet margin.
- 1:1 scale DIN A4 printable PDF marker sheet with dual-axis 100 mm horizontal and 50 mm vertical Vernier caliper scale bars.

### Module 5: Jaw Relation Workflow (`RecordsView.tsx` + `MaxillaMandibleWorkflow.tsx`)
- Dedicated stages for:
  1. Maxillary Reference Plane Acquisition (M-L tilt and A-P tilt relative to horizon and Camper's plane).
  2. Mandibular Spatial Relation Acquisition.
  3. Vertical Dimension Assessment (VDR, VDO, Freeway Space, 6 literature checkpoints).
  4. Centric Relation 3-Trial Repeatability Matrix (pairwise distance, $\le 0.5\text{ mm}$ acceptance gate).
  5. Gothic Arch Border Movement Tracing (Centric Apex detection, protrusion, lateral excursions).
  6. Condylar Guidance Calculation (Sagittal Condylar Inclination SCI and bilateral Bennett angles).

### Module 6: Measurement Dashboard (`MeasurementDashboard.tsx`)
- Consolidated clinical matrix of all 12 key prosthodontic parameters.
- Displays Units, Capture Timestamps, Calibration Status, Provenance Badge, Repeatability Spread, and Prosthodontic Literature Doctrine.
- Strict anti-fabrication disclosure: No percentage accuracy claims without physical benchmark data.

### Module 7: Articulator Workflow (`VirtualArticulator3D.tsx`)
- Interactive Three.js 3D mechanical articulator visualization (Hanau Wide-Vue, Artex CR, Whip Mix).
- Shows Maxillary member, Mandibular member, Condylar fossa elements, and Incisal pin/table.
- Dynamic opening and protrusive excursion animation driven by measured angles.
- Direct export of Exocad Virtual Articulator XML, 3Shape XML, and 3D-printable mounting jig STL.
- Clearly labeled: `CONCEPTUAL KINEMATIC SIMULATION — NOT PHYSICALLY MEASURED IN-VIVO CONDYLAR KINEMATICS`.

### Module 8: Export & Reporting (`ClinicalReportModal.tsx`)
- Single-click **HD Vector PDF** download with native vector paths for crisp printing at any resolution.
- Comprehensive **CSV Data Export** for statistical software (Excel, SPSS, R).
- Machine-readable **JSON Dossier** (Schema v1.2).
- Protected Export Safeguard: Blocks clinical certification when optical tracking is simulated or uncalibrated.
- Prominent watermark: `"# WARNING: SIMULATION — NOT FOR CLINICAL USE"` across all synthetic outputs.

---

## 5. How to Run the Repeatable Presentation Demonstration

1. Open the application in the browser (`http://localhost:3000`).
2. Click the **"4-Day Presentation Tour"** button in the hero card or the **"Tour"** button in the top navigation bar.
3. The interactive modal walks through all 8 engineering modules in sequence:
   - Evaluator highlights, clinical grounding, and the exact implementation truth (Implemented vs. Simulated vs. Unavailable).
   - Click **"View This Module"** to automatically jump to that section of the application.
4. Test the **Live vs. Demo Mode** toggle in the top bar to verify that data provenance labels and export watermarks update immediately.
5. In the **Scanner**, open the **"Marker Telemetry"** drawer to verify real-time $(u, v)$ coordinates and CAD geometry specifications.

---

## 6. Verification Test Suite

Run the automated test suite with:
```bash
npm test
```
**Current Test Suite Status:**
- **Total Tests:** 100
- **Passed:** 100
- **Failed:** 0
- **Test Groups:**
  1. Missing Measurement Inputs Guard
  2. Simulator-to-Measured Separation Barrier
  3. CR Dispersion & Repeatability Gating
  4. Validation Benchmark Authenticity Gate
  5. Clinical Exports Watermarking & Protection
  6. Tracking Loss Capture Gating
  7. VDO Feedback Loop Stability
  8. Truthful Labeling Verification
  9. Rigid Matrix Inversion Roundtrip Math
  10. Marker SVG Physical Dimensions & Grid Structure
  11. Digital ArUco DICT_4X4_50 Decoder
  12. CAD Geometry & Sourced Rim Datums
  13. 10-State Optical Diagnostics
  14. Independent OpenCV Ground-Truth Marker Validation
  15. Optical Diagnostic Gating Hardening
  16. 3D-Printable Carrier Plate STL Mesh Integrity
  17. Single-Page DIN A4 Print Sheet Layout
  18. High-Definition Vector PDF & Scale Verification
  19. Measurement Source Status & Provenance Badges
  20. Anti-Fabrication & Protective Export Safeguards
