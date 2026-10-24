# SMARTBOW AI — V1 FORENSIC AUDIT AND V2 REBUILD STRATEGY

**Author:** Senior Software Architect, Computer-Vision Engineer & Technical Auditor  
**Target Repository:** `https://github.com/DENTATS/smart-bow`  
**Inspected Workspace:** AI Studio Applet Runtime (`f289ed10-421f-4230-8b93-c2007a1629b9`)  
**Primary Hardware Benchmark Target:** Motorola Edge 70 Fusion, Android Mobile Browser (Chrome/Blink Engine)  
**Date of Audit:** October 2026  
**Document Status:** Complete Forensic Audit & Actionable Plan (Awaiting Human Approval)

---

## EXECUTIVE SUMMARY

A forensic line-by-line audit of the SmartBow AI codebase was executed across all TypeScript and React sources in the current workspace. This audit confirms the core technical reservations raised by Claude, Kimi, and Nemotron:

**The current V1 application does not perform genuine optical camera-based pose estimation or real-time metric tracking of ArUco fiducials.** 

Instead, the codebase operates an elaborate **hybrid optical-heuristic and synthetic simulation engine**. While the front-facing UI presents real-time 60 FPS HUDs, 468 MediaPipe facial mesh points, ArUco detection badges, and clinical validation certificates, **the underlying mandibular poses, ArUco marker coordinates, Gothic arch excursion points, Centric Relation (CR) trials, and validation statistics are largely synthesized, hardcoded, or perturbed by random noise (`Math.random()`, trigonometric sine waves, and synthetic presets).**

The marker detection function in `src/lib/arucoDetector.ts:114` (`detectArucoMarkersFromCanvas`) is a stub returning `[]`. The pose estimator in `src/lib/faceTrackingEngine.ts:773` and `1600–1729` (`generateDummyArucoData`) produces mathematical dummy poses anchored to simulated VDO sliders and skin-color face boxes. When real webcam mode is active, the system extracts a crude skin-color bounding box and eye-valley heuristics from a 160×120 downsampled canvas, calculates a synthetic mouth-opening fraction, and stretches a mathematical template of 468 landmarks (`synthesizeDynamicFaceMesh`).

This report provides the full forensic evidence, exact file lines, a KEEP / REPAIR / REBUILD / DEFER matrix, an architectural analysis of the three rebuild paths, and the complete design for a **minimal, scientifically testable V2 measurement engine**.

---

## PART 1 — CURRENT ARCHITECTURE & FORENSIC CODE AUDIT

### 1.1 Project Structure & Dependencies
- **Runtime Environment:** React 19.0.1 SPA bundled via Vite 8.3.0 and TypeScript 7.0.2 (`package.json`).
- **Core Dependencies:**
  - `@google/genai` (^2.4.0) — Present in dependencies but not integrated into the core tracking pipeline.
  - `three` (^0.186.0) — Used for rendering the 3D Hanau virtual articulator (`VirtualArticulator3D.tsx`).
  - `lucide-react` (^0.546.0), `motion` (^12.23.24), `tailwindcss` (^4.3.3) — UI icons, animations, styling.
- **Critical Architectural Absence:**
  - **There is NO computer-vision library installed.** Neither OpenCV.js (`@techstark/opencv-js`), js-aruco, AprilTag, nor `@mediapipe/face_mesh` / `@mediapipe/tasks-vision` are present in `package.json` or `node_modules`.
  - There is no real WebAssembly (Wasm) or WebGL shader computer vision pipeline in the bundle.

### 1.2 Camera Acquisition & Browser Permissions
- **File & Function:** `src/components/LiveScanner.tsx:340–445` (Webcam initialization effect) and `src/components/GothicArchTracer.tsx:114–141`.
- **Implementation:** Calls standard browser `navigator.mediaDevices.getUserMedia`:
  ```typescript
  video: {
    facingMode: 'user', // or 'environment'
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 }
  }
  ```
- **Findings:**
  - Browser permissions and stream acquisition work reliably on desktop and Android Chrome.
  - Video tracks are attached to an offscreen/hidden `<video>` element, and a `requestAnimationFrame` loop drives rendering to an HTML5 `<canvas>`.
  - **Device Pitfall (Motorola Edge 70 Fusion):** Android Chrome defaults to front-camera aspect ratio constraints that can crop frames unless `aspectRatio` or specific constraints are negotiated. Rear camera autofocus and automatic exposure (AE) hunting cause uncalibrated focal length variation.

### 1.3 Execution Paths: Webcam vs. Calibrated Phantom Simulator
- **File & Function:** `src/lib/faceTrackingEngine.ts:282–326` (`trackFrame`).
- **Webcam Path:**
  - Checks `if (!isWebcamMode || !video || video.readyState < 2)`: If false, routes to `generateCalibratedPhantomTracking(...)`.
  - When in webcam mode (`isWebcamMode === true`), it draws video frames to an internal 160×120 canvas (`this.offscreenCanvas`), runs an optical pixel classifier, and generates tracking telemetry.
  - **Crucial Finding:** Both webcam mode and simulator mode call `generateDummyArucoData(...)` (`line 773` and `line 1402`). **Real ArUco markers in the physical camera field are never detected or processed in either mode.**

### 1.4 Facial Landmark Generation & Inference
- **File & Function:** `src/lib/faceTrackingEngine.ts:365–628` and `src/lib/faceTrackingEngine.ts:980–1145` (`synthesizeDynamicFaceMesh`).
- **Claimed in UI:** *"468-point MediaPipe FaceMesh neural network running at 60 FPS"*.
- **Actual Reality:**
  - **Zero neural network inference exists.** There is no TensorFlow.js, ONNX Runtime, or MediaPipe TFLite model.
  - **Color Classification Heuristic:** It samples pixels on a downsampled 160×120 grid, checks YCbCr skin thresholds (`Cb: 65–145, Cr: 115–192`), groups skin pixels into 16×12 blocks, and slides a bounding window across the image (`lines 380–480`).
  - **Valley Search:** In the upper half of this bounding box, it searches for dark pixels to guess eye socket positions (`lines 540–570`). In the lower half, it samples luminance to guess mouth aperture (`lines 580–598`).
  - **Geometric Template Synthesis:** In `synthesizeDynamicFaceMesh`, it takes a static dictionary of hardcoded offset coordinates (`keyLandmarks[10]`, `keyLandmarks[234]`, `keyLandmarks[454]`, `keyLandmarks[152]`, etc.) and scales them relative to the estimated bounding box center `(smoothCx, smoothCy)` and size `(smoothW, smoothH)` (`lines 980–1145`).
  - **Remaining Points:** For indices without explicit offsets, it generates points using a polar circle equation:
    ```typescript
    const angle = (i * 6.2831853) / 468;
    const lx = Math.cos(angle) * radiusX;
    const ly = Math.sin(angle) * radiusY;
    ```
  - **Verdict:** The 468 landmarks are completely synthetic mathematical projections pinned to a skin-color blob detector.

### 1.5 ArUco Dictionary & Marker Generation
- **File & Function:** `src/lib/arucoDict.ts:1–279` and `src/components/PrintableMarkersModal.tsx`.
- **Implementation:**
  - Contains accurate binary encodings for OpenCV `DICT_4X4_50` IDs 0 through 12, and 20 through 28 (`ARUCO_DICT_4X4_50_BITS`).
  - Renders valid SVGs with 1-bit black borders (total 6×6 grid) and accurate physical millimetric dimensions (14×14mm marker, 18×18mm acrylic board).
- **Verdict:** **Genuinely accurate and reusable.** The marker generation, SVG vector templates, and dictionary bit definitions are valid and conform to OpenCV specifications.

### 1.6 ArUco Marker Detection & solvePnP Implementation
- **File & Function:** `src/lib/arucoDetector.ts:39–75` (`estimateMarkerPose`), `src/lib/arucoDetector.ts:114–126` (`detectArucoMarkersFromCanvas`), and `src/lib/faceTrackingEngine.ts:1600–1729` (`generateDummyArucoData`).
- **Findings:**
  1. `detectArucoMarkersFromCanvas` is an empty stub:
     ```typescript
     export function detectArucoMarkersFromCanvas(canvas: HTMLCanvasElement, ...): MarkerPose[] {
       const ctx = canvas.getContext('2d');
       if (!ctx) return [];
       return []; // <--- Stub! Never detects any physical marker
     }
     ```
  2. `estimateMarkerPose` in `src/lib/arucoDetector.ts:39–75`:
     - This is a heuristic projection formula, not Levenberg-Marquardt or iterative solvePnP:
       ```typescript
       tz = (f * markerSizeM) / avgWidthPx;
       tx = ((cx - calib.cx) * tz) / calib.fx;
       ty = ((cy - calib.cy) * tz) / calib.fy;
       angleZ = Math.atan2(dy, dx);
       angleY = (h1 - h2) / avgWidthPx;
       angleX = (w1 - w2) / avgWidthPx;
       ```
     - It estimates out-of-plane rotation by difference of trapezoid heights (`h1 - h2`) divided by width, which is geometrically invalid for arbitrary 3D marker attitudes.
  3. Real execution bypasses `estimateMarkerPose` entirely:
     - `faceTrackingEngine.ts:773` calls `generateDummyArucoData(...)` (`lines 1600–1729`).
     - This function hardcodes 3D camera translations:
       - Maxilla Board: `tvec: [0.077, -0.013, 0.48]`
       - Mandible Board: `tvec: [0.077 + midlineShiftMm * 0.001, -0.013 + vdoMm * 0.001, 0.48]`
       - Corners: Hardcoded pixel offsets around an anchor point (`anchorX - 12`, `anchorY + vdoPx`).
- **Verdict:** **Entirely simulated.** There is zero genuine marker corner localization, thresholding, contour extraction, quad verification, or bit decoding.

### 1.7 Camera Calibration & Distortion Correction
- **File & Function:** `src/lib/cameraCalibration.ts:1–209` and `src/lib/arucoDetector.ts:11–24`.
- **Findings:**
  - `DEFAULT_CAMERA_CALIBRATION` lists distortion coefficients (`k1: -0.02, k2: 0.005, p1: 0.0001, p2: 0.0002, k3: 0.0, rmsError: 0.28`).
  - **These coefficients are never used.** No code undistorts image coordinates or applies Brown-Conrady radial/tangential distortion models.
  - Optical distance estimation in `calculateOpticalDistanceCm` (`cameraCalibration.ts:106–181`) relies on population averages:
    ```typescript
    faceBreadthCm = settings.faceBreadthMm / 10; // 14.0 cm population assumption
    ipdCm = settings.patientIpdMm / 10;          // 6.3 cm population assumption
    distanceEstimateFace = (fx * faceBreadthCm) / faceWidthPx;
    distanceEstimateIpd = (fx * ipdCm) / eyeDistancePx;
    ```
  - **Verdict:** Distortion correction is non-existent. Distance calculation uses assumed population biometric constants rather than metric camera calibration.

### 1.8 Matrix Conventions & Coordinate Transformations
- **File & Function:** `src/lib/patientFrame.ts:8–153`.
- **Implementation:**
  - Defines `Matrix4` as 16 elements in an array (`elements: number[]`).
  - Comments in `src/types/smartbow.ts:21` state *"16 elements (column-major or row-major)"*, creating immediate convention ambiguity.
  - In `patientFrame.ts:143–150`, `T_patient` is built:
    ```typescript
    elements: [
      x.x, y.x, z.x, origin.x,
      x.y, y.y, z.y, origin.y,
      x.z, y.z, z.z, origin.z,
      0,   0,   0,   1
    ]
    ```
    This layout stores columns in rows (or rows in columns depending on multiplication order).
  - In `transformPoint` (`lines 97–104`):
    ```typescript
    x: e[0] * p.x + e[1] * p.y + e[2] * p.z + e[3]
    ```
    This assumes `e[0..3]` is Row 0, meaning `T_patient` in line 143 placed `x.x` at `(0,0)`, `y.x` at `(0,1)`, `z.x` at `(0,2)`, and `origin.x` at `(0,3)`. This conflates row-major storage with standard column-vector multiplication.
  - Units are inconsistent: `landmarks.z` is multiplied by pixel width (`lm.z * width`), mixing pixel units with normalized units and metric meters (`0.48m`).

### 1.9 VDO, Midline, and Jaw Relation Calculations
- **File & Function:** `src/lib/clinicalMath.ts:14–19` (`computeVdo`), `src/components/LiveScanner.tsx:522–526`, and `src/lib/faceTrackingEngine.ts:715`.
- **Findings:**
  - `dynamicTrackedVdo = simulatedVdoMm + (this.smoothMouthOpen * 14.0)`.
  - In `LiveScanner.tsx:524`:
    ```typescript
    if (mode === 'WEBCAM' && tracking.detected && tracking.mouthOpenFraction > 0.05) {
      const dynamicVdo = Number(tracking.softwareSelfCorrection.invariantVdoMm.toFixed(1));
      setSimVdo(dynamicVdo);
    }
    ```
  - When the user opens their mouth in front of the webcam, the optical valley search increases `mouthOpenFraction`, which multiplies by 14.0 mm and adds to `simVdo` (default 62.5 mm).
  - **Verdict:** VDO is not measured between rigid maxillary and mandibular fiducial plates. It is a linear scalar scaling of the dark pixel count in the lower half of the detected face bounding box.

### 1.10 Centric Relation (CR) Recording & Random Number Usage
- **File & Function:** `src/App.tsx:180–227` (`handleAddCrRecord`).
- **Source Evidence:**
  ```typescript
  const handleAddCrRecord = () => {
    updateActiveCase(c => {
      const idx = c.crRecords.length + 1;
      // Slight jitter around centroid
      const jitterX = (Math.random() - 0.5) * 0.35;
      const jitterY = (Math.random() - 0.5) * 0.35;
      const newRecord: CrRecord = {
        trialIndex: idx,
        timestamp: Date.now(),
        mandibularCentroidPatient: {
          x: Number((c.measurements.midlineShiftMm + jitterX).toFixed(2)),
          y: Number(jitterY.toFixed(2)),
          z: Number((-c.measurements.vdoMm).toFixed(2))
        },
        vdoMm: c.measurements.vdoMm,
        tiltMLDeg: c.measurements.occlusalTiltMLDeg
      };
      ...
  ```
- **Findings:**
  - When the clinician clicks the capture shutter or records a CR trial, the app does not freeze real camera poses.
  - It generates synthetic 3D coordinates using `(Math.random() - 0.5) * 0.35 mm`.
  - Because the random offset is strictly constrained to $\pm 0.175\text{ mm}$, the pairwise distance is mathematically guaranteed to stay under $0.5\text{ mm}$ almost 100% of the time, perpetually awarding the user an `"ACCEPTED ✓ (Optimal Neuromuscular Verification)"` clinical badge.
- **Verdict:** **Fatal clinical defect.** The repeatability verification is entirely fabricated by pseudorandom numbers.

### 1.11 Validation Data Generation
- **File & Function:** `src/lib/validationEngine.ts:103–220` (`generateInitialValidationDataset`).
- **Source Evidence:**
  ```typescript
  // B1 Marker Detection Rate
  const detectedPct = Number((96.0 + Math.sin(rep * 2.3) * 3.5).toFixed(1));

  // B2 VDO vs Vernier Calliper
  const noise = (Math.sin(testIndex * 7.1) * 0.14 + Math.cos(rep * 3.3) * 0.12);
  const measured = Number((nominal + noise).toFixed(2));

  // B3 Angle vs Digital Angle Gauge
  const noise = (Math.sin(testIndex * 5.7) * 0.35 + Math.cos(rep * 2.1) * 0.25);
  ```
- **Findings:**
  - The validation test dataset claimed to be *"Stage 1 Bench & Stage 2 Phantom protocol vs Mitutoyo Vernier Calliper & Neoteck Digital Protractor"* is generated algorithmically via mathematical trigonometric noise (`Math.sin`, `Math.cos`).
- **Verdict:** Synthetic validation data. No genuine physical bench trials are recorded.

### 1.12 Exported Reports, CSV/JSON, and STL Generation
- **Files & Functions:**
  - `src/lib/exportArticulator.ts:9–46` (Exocad JSON)
  - `src/lib/exportArticulator.ts:48–110` (3Shape XML)
  - `src/lib/exportArticulator.ts:227–320` (CSV)
  - `src/lib/stlGenerator.ts:59–190` (`generateMountingJigStl`)
- **Findings:**
  - The file exporters and STL generators produce syntactically valid outputs.
  - The STL generator produces a manifold ASCII STL containing an articulator baseplate and 3 columns.
  - **However:** The numeric dimensions fed into these exporters originate from the unvalidated slider values and random-generated CR records. Exporting uncalibrated parameters to CAD/CAM software or 3D printers poses serious clinical risk.

### 1.13 UI State Management & Flow
- **Files:** `src/App.tsx`, `src/components/LiveScanner.tsx`, `src/components/TopNav.tsx`.
- **Findings:**
  - State is managed via local React state (`useState`) and synchronized to browser `localStorage`.
  - The UI is responsive, highly aesthetic, and feature-dense.
  - **Defect:** Measurement capture is never gated by genuine physical checks. A bypass button (`bypassMarkerLock`) explicitly allows forcing captures even when no tracking exists.

---

## PART 2 — COMPONENT CLASSIFICATION MATRIX

Every major module in the repository is evaluated below under strict criteria:

| Component / File | Category | Technical Rationale & Exact Source Evidence |
| :--- | :---: | :--- |
| **ArUco Dictionary (`arucoDict.ts`)** | **A. KEEP** | Exact OpenCV `DICT_4X4_50` bit patterns (0–12, 20–28). Generates valid SVG vector representations for physical printing. Works independently. |
| **Printable Markers UI (`PrintableMarkersModal.tsx`)** | **A. KEEP** | High-utility modal for printing 1:1 scale fiducials (14mm, 18mm board). Millimetric printing CSS is functional. |
| **Camera Feed Acquisition (`LiveScanner.tsx:340–445`)** | **B. REPAIR** | Acquires `getUserMedia` video streams and mounts to canvas. Needs repair: explicit resolution negotiation (720p/1080p), fixed frame-rate locking (30/60 fps), auto-focus/exposure control handling for Android Chrome. |
| **Rigid Math & Coordinate Transforms (`patientFrame.ts`)** | **B. REPAIR** | Contains matrix inversion, vector normalization, and dot/cross operations. Needs repair: resolve row-major vs column-major storage ambiguity, standardize units to millimeters or meters, remove mixing of pixel and 3D units. |
| **Camera Calibration Model (`cameraCalibration.ts`)** | **B. REPAIR** | Structure exists for pinhole parameters ($f_x, f_y, c_x, c_y$). Needs repair: remove population-average facial dimensions (140mm face, 63mm IPD) as distance proxies; implement standard chessboard/ArUco-board calibration with real radial distortion ($k_1, k_2$). |
| **ArUco Marker Detector (`arucoDetector.ts`)** | **C. REBUILD** | `detectArucoMarkersFromCanvas` is an empty stub returning `[]`. `estimateMarkerPose` uses naive quadrilateral height ratios rather than an established solvePnP algorithm (EPnP / IPPE / Levenberg-Marquardt). Must be replaced with genuine detector. |
| **Face Tracking Engine (`faceTrackingEngine.ts`)** | **C. REBUILD** | Claims 468 MediaPipe FaceMesh; actually uses 160×120 skin-color thresholding and synthetic template projection. `generateDummyArucoData` hardcodes 3D translations and pins fake markers to simulated sliders. |
| **CR Recording Engine (`App.tsx:180–227`, `CrRecorder.tsx`)** | **C. REBUILD** | Generates CR records by injecting `Math.random() * 0.35` jitter around previous coordinates. Repeatability is mathematically fabricated. Must be rebuilt to record genuine temporal marker poses with covariance. |
| **Measurement Engine (`clinicalMath.ts:10–43`)** | **C. REBUILD** | VDO and occlusal tilt calculations either return fallback constants (`62.0 mm`) or read simulated dummy poses. Must calculate 6-DOF transformation between physical maxillary and mandibular boards. |
| **Validation Engine (`validationEngine.ts`)** | **C. REBUILD** | Generates synthetic bench/phantom data using sine waves (`Math.sin(testIndex * 7.1)`). Must be replaced with a real test runner logging actual physical vernier/gauge experiments. |
| **Virtual Articulator 3D (`VirtualArticulator3D.tsx`)** | **D. DEFER** | Three.js viewer is visually impressive but premature. Cannot verify virtual mounting without a validated physical measurement engine. |
| **Hanau Mounting Jig STL Generator (`stlGenerator.ts`)** | **D. DEFER** | Generates physical 3D print meshes. Exporting unvalidated metrics to clinical jigs creates clinical safety hazards. |
| **CAD/CAM Exporters (`exportArticulator.ts`)** | **D. DEFER** | Exocad JSON and 3Shape XML exports should be deferred until core measurement precision is verified. |
| **Digital Gothic Arch Tracer (`GothicArchTracer.tsx`)** | **D. DEFER** | Gothic arch excursion tracing generates simulated points via trigonometric noise. Defer until primary static VDO/CR engine is solved. |
| **Biometric Facial Treatment Planning (`FacialAnalysisView.tsx`)** | **D. DEFER** | Berry's ratio incisor selection, House classification, and tooth shade selection rely on synthetic facial mesh points. |
| **Dentulous FMR Compendium (`DentulousProtocolModal.tsx`)** | **D. DEFER** | Complex clinical theory and protocols; unrelated to verifying the core optical tracking engine. |

---

## PART 3 — EVALUATION OF REBUILD STRATEGIES

Three strategic paths were evaluated to transition SmartBow AI from an illustrative prototype to a valid 3D measurement instrument:

### OPTION 1: Incrementally Patch V1 In-Place
- **Approach:** Attempt to fix `faceTrackingEngine.ts`, replace the stub in `arucoDetector.ts`, and rewire existing UI components in-place.
- **Analysis:** High risk. `LiveScanner.tsx` is 2,372 lines of tightly coupled code that mixes UI rendering, simulated sliders, synthetic filter modes, HUD overlays, and mathematical fallbacks. Patching in-place risks leaving subtle simulation paths active and compounding technical debt.

### OPTION 2: Completely Discard V1 and Start from Scratch
- **Approach:** Wipe the repository and build an isolated CLI or barebones canvas script.
- **Analysis:** Inefficient. Discarding everything throws away valuable work: exact ArUco dictionary tables (`arucoDict.ts`), 1:1 printable marker SVGs, clean Tailwind UI styling, camera stream hooks, and clinical domain concepts.

### OPTION 3: Dual-Core Architecture (Preserve V1 Baseline, Build Clean V2 Engine) — **RECOMMENDED**
- **Approach:**
  1. **Preserve V1** as an explicit, clearly labeled prototype/simulator baseline (`SmartBow V1 Simulator`).
  2. **Retain Reusable Assets:** Marker dictionaries (`arucoDict.ts`), SVG generators, and core styling.
  3. **Implement V2 Core as an Isolated, Zero-Simulation Pipeline** (`src/v2/core/`): Camera acquisition $\rightarrow$ Calibration $\rightarrow$ Real ArUco detection $\rightarrow$ solvePnP $\rightarrow$ Rigid coordinate transformation $\rightarrow$ Error covariance $\rightarrow$ PASS/FAIL gating.
  4. **Provide a Clean Minimal V2 Mode Switcher** in the UI to allow running real physical verification tests without interference from V1 mock systems.
- **Justification:**
  - **Safety:** Completely isolates real measurements from synthetic mocks. Zero risk of `Math.random()` or simulated sliders bleeding into V2 data.
  - **Testability:** The V2 pipeline can be unit-tested against known ground-truth synthetic images and physical calliper targets.
  - **Maintainability:** Provides Dr. Deepanshu and clinical reviewers with transparent before-and-after verification.

---

## PART 4 — MINIMAL V2 MEASUREMENT ENGINE SPECIFICATION

The primary scientific objective of the first V2 milestone is:
> **"Can a smartphone camera measure controlled physical displacement and angular changes reproducibly, with independently measured error?"**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SMARTBOW V2 MEASUREMENT PIPELINE                       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
                           1. RAW CAMERA ACQUISITION
                      (Uncompressed 1080p/720p Canvas Frame)
                                         │
                                         ▼
                           2. CAMERA INTRINSICS MATRIX
                       [ fx   0   cx ] + Radial Distortion
                       [  0  fy   cy ]   [ k1, k2, p1, p2 ]
                                         │
                                         ▼
                          3. REAL ARUCO CORNER DETECTOR
                   (Adaptive Thresholding -> Contour Extraction
                     -> Quad Poly -> Subpixel Corner Refinement)
                                         │
                                         ▼
                            4. DICTIONARY BIT DECODING
                      (6x6 Perspective Rectification -> Hamming
                        Distance Check against DICT_4X4_50)
                                         │
                     ┌───────────────────┴───────────────────┐
            [Markers Found < Min]                  [Required Markers Found]
                     │                                       │
                     ▼                                       ▼
            STATUS: UNAVAILABLE                     5. POSE ESTIMATION (solvePnP)
             (Capture Disabled)                     (Planar Homography / IPPE /
                                                     Levenberg-Marquardt Optimization)
                                                             │
                                                             ▼
                                                    6. RIGID 3D TRANSFORMS
                                                   T_cam_max  &  T_cam_mand
                                                   T_rel = inv(T_cam_max) * T_cam_mand
                                                             │
                                                             ▼
                                                    7. PHYSICAL METRICS
                                                   - Delta Z (VDO Displacement in mm)
                                                   - Delta X/Y (Midline/AP Shift in mm)
                                                   - Rotation Matrix -> Euler Angles
                                                             │
                                                             ▼
                                                    8. UNCERTAINTY ESTIMATION
                                                   - Reprojection Error (RMS px)
                                                   - Corner Jitter Variance
                                                             │
                                         ┌───────────────────┴───────────────────┐
                                  [RMS > 1.2 px]                          [RMS <= 1.2 px]
                                         │                                       │
                                         ▼                                       ▼
                                  STATUS: REJECT                          STATUS: VALIDATED PASS
                                (Capture Disabled)                          (Capture Enabled)
```

### Pipeline Rules & Constraints:
1. **Real Image Observations Only:** Marker poses must derive solely from detected pixel corners in the live frame buffer.
2. **Standardized Coordinate Conventions:**
   - Single standard: Right-Handed Cartesian System ($X$ right, $Y$ down, $Z$ forward along optical axis in camera frame; $X$ lateral right-to-left, $Y$ anterior-to-posterior, $Z$ superior in patient frame).
   - Single physical unit: **Millimeters ($mm$)** for clinical reporting, **Meters ($m$)** inside internal matrix transforms. No mixed pixel-to-meter ad-hoc scalers.
3. **No MediaPipe Relative Depth:** MediaPipe's synthetic landmarks must NOT be used for metric distance or jaw relation calculations.
4. **No Assumed Population Constants:** Calibration must not assume a 63mm IPD or 140mm face width. If uncalibrated, focal length is derived from EXIF metadata and flagged as *"Uncalibrated Intrinsics ($f_0$ approximate)"*.
5. **Absolute Prohibition of Synthetic Outputs:** If any marker is occluded or reprojection error exceeds threshold, outputs must be `null` / `UNAVAILABLE`. Never output simulated fallback coordinates.

---

## PART 5 — MINIMAL V2 USER INTERFACE

The V2 acquisition interface must remove all simulated gamification, Snapchat filter bars, and deceptive status tags.

### Primary Acquisition Screen (Clean Mode):
1. **Clean Camera Preview (16:9 / 4:3 Viewport):**
   - Displays real video stream without artificial skin-color bounding boxes or synthesized 468-point meshes.
   - Shows detected physical marker outlines with green quad borders and decoded IDs (`#3`, `#4`, etc.) drawn at the real subpixel corner locations.
2. **Single High-Contrast Tracking Status Beacon:**
   - `ACQUIRING`: Searching for markers.
   - `LOCKED`: All required fiducials tracked with RMS $< 1.2\text{ px}$.
   - `OCCLUDED`: Maxillary or mandibular board missing.
   - `EXCESSIVE_MOTION`: Frame variance $> 0.5\text{ mm}$.
3. **One Plain-Language Clinical Positioning Instruction:**
   - Dynamic single-line advice based on real geometry: *"Bring camera 10 cm closer"* or *"Reduce angle to marker board"*.
4. **Capture Control:**
   - A single prominent shutter button.
   - **Active and clickable ONLY when all quality and geometric criteria pass.** Disabled and grayed out with a lock icon when data is incomplete or unstable.
5. **Clear Error / Retry Flow:**
   - Immediate visual feedback on why a frame was rejected (e.g., *"Marker #7 corner jitter too high"*).

### Developer & Diagnostic Panel (Collapsed by Default):
- Toggled via a dedicated diagnostic key/button.
- Displays:
  - Reprojection error per marker (in pixels).
  - Condition number of homography matrix.
  - Raw translation vectors ($t_x, t_y, t_z$) in camera frame.
  - Instantaneous frame rate and camera timestamp delta ($\Delta t$).

---

## PART 6 — FEATURES EXPLICITLY DEFERRED FROM MILESTONE 1

To preserve scientific rigor, the following clinical and secondary features are strictly deferred until the fundamental optical measurement engine passes bench validation:

1. **AI Treatment Recommendations:** Automated prescriptions based on biometric proportions.
2. **Tooth Mould & Shade Guidance:** Automated Vitapan Classical shade selection and Leon Williams tooth shape classifications.
3. **Federated Learning & Cloud Sync:** Distributed training architectures and multi-tenant patient databases.
4. **Automated Clinical Prescriptions:** Diagnostic summaries and lab scripts.
5. **Virtual Articulator Exporters:** Exocad JSON and 3Shape XML file generation.
6. **Hanau Mounting Jig STL Slicing:** 3D print mesh synthesis.
7. **Clinical CR Repeatability Scoring:** Physiological neuromuscular verification claims.
8. **Digital Gothic Arch Tracing:** Bennett angle and Sagittal Condylar Inclination (SCI) calculations.
9. **Patient Cephalometric Reports:** Archival PDF/CSV dossier generation.

---

## PART 7 — BENCH VALIDATION & EXPERIMENTAL PROTOCOL

To prove that the smartphone measurement engine functions as a genuine scientific instrument, the V2 core must be evaluated against independent physical ground truth:

### Experiment 1: 1D Linear Translation Stage (Vernier Caliper)
- **Apparatus:** Two ArUco marker boards mounted on a mechanical Mitutoyo digital caliper or micro-metric screw gauge.
- **Protocol:**
  - Set caliper to nominal gaps: $0.0\text{ mm}, 5.0\text{ mm}, 10.0\text{ mm}, 20.0\text{ mm}, 30.0\text{ mm}, 50.0\text{ mm}$.
  - Mount smartphone (Motorola Edge 70 Fusion) on a tripod at $35\text{ cm}, 45\text{ cm}, 55\text{ cm}$.
  - Record 20 raw optical captures per position.
- **Metric:** Mean Absolute Error (MAE), Root Mean Square Error (RMSE), and 95% Confidence Interval.
- **Target Acceptance Criterion:** $\text{RMSE} < 0.5\text{ mm}$ at $45\text{ cm}$ working distance.

### Experiment 2: Angular Protractor Bench
- **Apparatus:** Precision rotary indexing table or digital angle protractor ($0.05^\circ$ resolution).
- **Protocol:**
  - Rotate mandibular board through tilts of $0^\circ, 2^\circ, 5^\circ, 10^\circ, 15^\circ, 20^\circ$ relative to maxillary board.
  - Record 20 optical trials per angle.
- **Target Acceptance Criterion:** Angular error $< 0.8^\circ$.

### Experiment 3: Handheld Stability & Distance Invariance
- **Protocol:**
  - Fix marker boards at a constant $15.00\text{ mm}$ physical separation.
  - Operator holds smartphone handheld with natural physiologic tremor, varying distance from $40\text{ cm}$ to $55\text{ cm}$ and roll angle from $-10^\circ$ to $+10^\circ$.
  - Record 50 frames.
- **Target Acceptance Criterion:** Measured displacement must remain within $15.00 \pm 0.65\text{ mm}$ across the entire operating volume.

---

## PART 8 — DEVICE COMPATIBILITY STRATEGY (MOTOROLA EDGE 70 FUSION)

The primary test device is the **Motorola Edge 70 Fusion** running Android Chrome. Mobile browser environments impose distinct challenges that must be explicitly managed:

1. **Rear Camera Selection & Lens Switching:**
   - Motorola Edge 70 Fusion possesses a dual-rear camera array (50 MP main with OIS + 13 MP ultrawide/macro).
   - `facingMode: 'environment'` can inadvertently select the ultrawide lens, which introduces high radial distortion and changes focal length.
   - **Strategy:** Enumerate devices using `navigator.mediaDevices.enumerateDevices()`, filter by `videoinput`, and select the primary wide camera explicitly.
2. **Fixed Exposure & Focus Locking:**
   - Auto-focus hunting alters the lens focal length ($f_x, f_y$), invalidating pre-computed camera calibration matrices.
   - **Strategy:** Apply `MediaTrackConstraints` with `focusMode: 'continuous'` or lock focus via `track.applyConstraints({ advanced: [{ focusMode: 'manual' }] })` when supported by Android Camera2 API.
3. **Thermal Throttling & Frame-Rate Consistency:**
   - Sustained heavy computer-vision loops on mobile CPU can cause thermal throttling on Qualcomm Snapdragon chips after 2–3 minutes.
   - **Strategy:** Optimize image processing using typed arrays (`Uint8ClampedArray`), avoid memory allocation inside the frame loop, and process downsampled luminance buffers (maximum 960×540 or 1280×720) rather than full 50 MP sensor frames.
4. **Sensors & Orientation API:**
   - Chrome on Android handles `deviceorientation` with coordinate axes that differ from iOS Safari.
   - **Strategy:** Isolate optical tracking from phone accelerometer data. Rely on the invariant transform between maxillary and mandibular boards ($\mathbf{T}_{rel} = \mathbf{T}_{max}^{-1} \mathbf{T}_{mand}$), which is mathematically independent of phone orientation.

---

## PART 9 — SECURITY, PRIVACY & CLINICAL RISKS

1. **Biometric Privacy (GDPR / HIPAA):**
   - High-resolution video streams of patients' faces and intraoral regions are sensitive biometric data.
   - **Mitigation:** All V2 computer vision processing must occur **100% client-side in browser memory**. No raw video frames or patient facial imagery may be transmitted to external servers or cloud endpoints.
2. **Clinical Safety & Misdiagnosis Risk:**
   - Presenting unverified or simulated measurements as clinical diagnostics can result in incorrect dental prostheses, patient pain, temporomandibular joint (TMJ) dysfunction, and occlusal trauma.
   - **Mitigation:**
     - Remove all deceptive "ACCEPTED" badges that originate from random or simulated data.
     - Affix a mandatory clinical disclaimer: *"Experimental Investigational Tool — Not for Direct Patient Treatment or Final Prosthesis Fabrication."*
     - Maintain an immutable audit log linking every recorded measurement directly to its raw camera frame timestamps and reprojection error metrics.

---

## PART 10 — PRIORITISED V2 IMPLEMENTATION SEQUENCE

```
PHASE 1: FOUNDATION (Weeks 1–2)
├── 1.1 Integrate genuine lightweight ArUco detector (Wasm / optimized pure TS)
├── 1.2 Implement valid iterative planar pose estimator (solvePnP / IPPE)
├── 1.3 Calibrate Motorola Edge 70 Fusion camera intrinsics (fx, fy, cx, cy, k1, k2)
└── 1.4 Establish unified mathematical coordinate system and unit tests

PHASE 2: RELATIVE 3D KINEMATICS (Weeks 3–4)
├── 2.1 Implement rigid inter-board transformation: T_rel = inv(T_max) * T_mand
├── 2.2 Calculate metric displacement (Delta Z / VDO) and Euler angles
├── 2.3 Implement covariance matrix & reprojection error gating (RMS < 1.2 px)
└── 2.4 Verify mathematical invariance against phone tilt and distance variations

PHASE 3: MINIMAL V2 ACQUISITION UI (Weeks 5–6)
├── 3.1 Build clean acquisition screen (Preview + 1 Beacon + 1 Guide + Gated Shutter)
├── 3.2 Implement Developer Diagnostic HUD (hidden by default)
├── 3.3 Enforce strict capture lock (shutter disabled when tracking fails)
└── 3.4 Integrate raw measurement CSV logger (raw corners, tvec, rvec, RMS)

PHASE 4: BENCH VALIDATION & AUDIT ACCEPTANCE (Weeks 7–8)
├── 4.1 Execute Vernier Caliper 1D Translation Benchmark (0–50 mm)
├── 4.2 Execute Digital Angle Protractor Benchmark (0–20°)
├── 4.3 Log empirical test results into reproducible validation report
└── 4.4 Present validated findings for clinical peer review
```

---

## PART 11 — ASSUMPTIONS THAT MUST NOT BE TREATED AS FACTS

The following common assumptions were identified during the forensic audit and must be explicitly rejected until backed by empirical proof:

1. **ASSUMPTION:** *“A smartphone camera can automatically achieve sub-millimeter (< 0.5 mm) accuracy without individual camera calibration.”*  
   **FACT:** Lens manufacturing variations, optical image stabilization (OIS) shift, and uncalibrated focal lengths cause metric errors of 3–8 mm at typical operating distances.
2. **ASSUMPTION:** *“Skin-color tracking and mouth dark-space heuristics are an acceptable proxy for jaw relation tracking.”*  
   **FACT:** Soft tissue movement (lips, cheeks, chin) does not correlate rigidly with underlying skeletal mandibular kinematics. Only rigid dental attachments (clutches/rims) provide clinically meaningful records.
3. **ASSUMPTION:** *“MediaPipe FaceMesh relative Z-depth can be scaled to physical millimeters using population IPD (63 mm).”*  
   **FACT:** MediaPipe FaceMesh depth is a normalized, uncalibrated estimation trained on synthetic and 2D facial data. It lacks metric consistency across varying facial topologies and head angles.
4. **ASSUMPTION:** *“Simulating clinical noise with `Math.random()` or trigonometric formulas provides valid evidence of repeatability.”*  
   **FACT:** Synthetic noise proves only that the statistical calculation function works; it provides zero evidence of the instrument's measurement validity or physical repeatability.
5. **ASSUMPTION:** *“Real-time 60 FPS display guarantees that tracking is accurate.”*  
   **FACT:** High rendering frame rates often mask static templates and smoothed synthetic coordinates. Frame rate is an indicator of UI performance, not measurement precision.

---

## CONCLUSION & STOP NOTICE

The forensic audit of the SmartBow AI current codebase is complete. The architectural defects, synthetic execution paths, and component classifications have been established using exact source file lines.

In strict accordance with instructions:
- **No production code files have been modified or overwritten during this audit.**
- **No unverified clinical accuracy claims have been made.**
- **Execution has stopped.**

This audit report is submitted for senior engineering and clinical review. Please review the findings and approve the proposed V2 starting strategy to proceed.
