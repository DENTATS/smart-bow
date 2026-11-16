# SmartBow AI — Architecture Specification & Engineering Design
### Four-Day Presentation Prototype · Digital Jaw Relation System

**Lead Prosthodontist & Researcher:** Dr. Deepanshu, MDS Prosthodontics  
**Institution:** Maitri College of Dentistry and Research Centre  
**Architecture Version:** 2.0 (Client-Authoritative, Zero-AI Offline Engine)

---

## 1. System Philosophy & Architectural Boundary

SmartBow AI is structured according to a strict **client-side modular architecture** designed for high reliability, clinical transparency, and complete offline autonomy:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                            │
│  Navigation (Desktop Top Bar / Mobile Bottom Bar)                      │
│  Module 1: Dashboard (Case Registry, 7-Stage Workflow Tracker)         │
│  Module 2: Patient Assessment (Frontal & Profile Photometry Overlays)  │
│  Module 3 & 4: Live Scanner & Marker Detection HUD                     │
│  Module 5: Jaw Relation Workflow (Maxilla, Mandible, VDO, CR, Gothic)  │
│  Module 6: Measurement Dashboard (Telemetry & Provenance Matrix)       │
│  Module 7: 3D Virtual Articulator (Three.js Spatial Kinematics)        │
│  Module 8: Protected Vector PDF & CSV Laboratory Prescription          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                       CLINICAL LOGIC & MATH                            │
│  clinicalMath.ts: VDO, ML/AP Tilts, Pairwise CR Matrix, Berry's Rule   │
│  patientFrame.ts: 4x4 Rigid Matrix Composition, Inversion, Rotations   │
│  prosthodonticLiterature.ts: Classical Prosthodontic Grounded Datums   │
│  exportArticulator.ts: Exocad, 3Shape XML, Hanau Mounting Prescriptions│
│  pdfExport.ts: Native Vector PDF Generation & Dual Scale Bars          │
│  stlGenerator.ts: 3D-Printable Carrier Plate & Hanau Mounting Jig STL  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                 COMPUTER VISION & SENSOR PIPELINE                      │
│  faceTrackingEngine.ts: Multi-Spectrum Chromaticity & Anatomical Priors│
│  arucoDetector.ts: Fast Optical Candidate Search & solvePnP Pose Est.  │
│  arucoDict.ts: OpenCV DICT_4X4_50 Bit Parity & Orientation Decoder     │
│  cameraCalibration.ts: Pinhole Model (fx, fy, cx, cy, k1, k2, p1, p2) │
│  opticalDiagnostics.ts: 10-State Safety Gating & Telemetry Freshness   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Spatial Coordinate Frames & Kinematic Mathematics

The clinical jaw relation system operates across four discrete 3D Cartesian coordinate frames:

### 1. Camera Optical Coordinate Frame ($T_{\text{camera}}$)
- **Origin ($O_{\text{cam}}$):** Pinhole optical center of the camera lens.
- **Axes:** $+X$ pointing to the camera right, $+Y$ pointing downward, $+Z$ pointing along the principal optical axis into the scene.
- **Intrinsics Matrix ($K$):**
  $$K = \begin{bmatrix} f_x & 0 & c_x \\ 0 & f_y & c_y \\ 0 & 0 & 1 \end{bmatrix}$$
  where $(f_x, f_y)$ are focal lengths in pixels and $(c_x, c_y)$ is the principal point.

### 2. Patient Craniofacial Coordinate Frame ($T_{\text{patient}}$)
- **Anchors:** Established by three contactless facial landmarks:
  - Glabella ($F_{01}$): Midpoint between the superciliary arches.
  - Right Zygoma ($F_{02}$): Right malar prominence.
  - Left Zygoma ($F_{03}$): Left malar prominence.
- **Origin:** Center of the bizygomatic axis ($F_{02} - F_{03}$ midpoint) projected forward to Glabella plane.
- **Orientation:**
  - $X$-axis: Parallel to Interpupillary Line (Bipupillary axis).
  - $Y$-axis: Parallel to Facial Midline.
  - $Z$-axis: Normal to frontal plane pointing outward from patient.

### 3. Maxillary Carrier Board Frame ($T_{\text{maxilla}}$)
- **Anchors:** 18.0 × 18.0 mm rigid acrylic plate clipped to upper occlusal wax rim bearing ArUco markers IDs 3, 4, 5, 6.
- **Orientation:**
  - $X$-axis: Represents the transverse occlusal plane line.
  - $Y$-axis: Represents the anteroposterior midline line (parallel to Camper's plane).
  - $Z$-axis: Normal to maxillary occlusal plane.

### 4. Mandibular Carrier Board Frame ($T_{\text{mandible}}$)
- **Anchors:** 18.0 × 18.0 mm rigid plate clipped to lower occlusal rim bearing ArUco markers IDs 7, 8, 9, 10.

### Relative Jaw Transformation & VDO Derivation
The true interocclusal spatial transformation ($T_{\text{rel}}$) is computed by inverting the maxillary camera pose and composing it with the mandibular camera pose:
$$T_{\text{rel}} = T_{\text{maxilla}}^{-1} \times T_{\text{mandible}}$$

The **Vertical Dimension of Occlusion (VDO)** is derived from the vertical component of the relative translation vector:
$$\text{VDO}_{\text{mm}} = |T_{\text{rel}}(Z)| \times 1000$$

---

## 3. Optical ArUco Detection Pipeline

SmartBow AI detects physical fiducial carrier boards directly inside standard WebRTC browser streams without external WebAssembly blobs or external network calls:

1. **Grayscale Luminance Projection:**
   $$Y = 0.299R + 0.587G + 0.114B$$
2. **Multi-Scale Window Search:**
   Candidate bounding windows ($22\text{px}$ to $86\text{px}$) are evaluated for a high-contrast dark square perimeter (1:4:1 ArUco geometry).
3. **Inner Contrast & Cell Thresholding:**
   The inner 4×4 data cells are binarized using local adaptive thresholding:
   $$T_{\text{cell}} = (\text{Mean}_{\text{border}} + \text{Max}_{\text{inner}}) \times 0.48$$
4. **DICT_4X4_50 Dictionary Matching:**
   Candidate 6×6 grids are rotated across all 4 quadrants ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) and evaluated against the registered OpenCV `DICT_4X4_50` codebook via `decodeMarkerGrid`.
5. **Pose Estimation (Planar Homography / solvePnP):**
   Sub-pixel corner rays are mapped through camera intrinsics $K$ to solve the 3D position vector ($t_{\text{vec}}$) and Euler rotation vector ($r_{\text{vec}}$).

---

## 4. Data Provenance Engine & Safety Gating

To prevent synthetic or unverified measurements from being misrepresented as physical patient data, every metric is classified across a 5-tier provenance hierarchy:

| Status Code | Label | Color | Criteria |
| :--- | :--- | :--- | :--- |
| `CALIBRATED_ENGINEERING` | Calibrated Engineering Measurement | Teal | Captured with verified pinhole intrinsics and physical ArUco fiducials. |
| `LIVE_MEASURED` | Live Measured | Emerald | Captured during an active physical camera session. |
| `LIVE_UNCALIBRATED` | Live Uncalibrated | Amber | Optical session running with default uncalibrated sensor intrinsics. |
| `SIMULATED_DEMO` | Simulated Demonstration | Orange | Synthetic values generated by kinematic simulator for software demonstration. |
| `UNAVAILABLE` | Unavailable | Gray | Input fiducials missing, occluded, or prerequisites incomplete. |

### Protective Export Safeguards
1. **Clinical Export Blocking:** When physical tracking or camera calibration is incomplete, production of un-watermarked clinical documents is blocked.
2. **Mandatory Simulation Watermarking:** When `dataProvenance !== 'MEASURED'`, all exported formats (Vector PDF, CSV, JSON, Exocad XML, 3Shape XML, STL) are indelibly stamped:
   `"# WARNING: SIMULATION — NOT FOR CLINICAL USE"`

---

## 5. Sub-Millimeter Physical CAD Specifications

The SmartBow AI fiducial carrier plates are strictly dimensioned according to prosthodontic oral anatomy constraints:

- **Plate Dimensions:** $18.0 \times 18.0 \times 3.0\text{ mm}$ (acrylic or biocompatible 3D-printed resin).
- **Cluster Format:** 2×2 grid of four miniature ArUco markers.
- **Individual Marker Width:** $6.5 \times 6.5\text{ mm}$.
- **Marker Pitch (Center-to-Center):** $7.5\text{ mm}$.
- **Outer Array Span:** $14.0\text{ mm}$.
- **Quiet Zone Margin:** $2.0\text{ mm}$ perimeter white margin.
- **Single Target Alternative:** $14.0 \times 14.0\text{ mm}$ single marker.
- **Print Verification:** DIN A4 print sheets embed dual-axis $100.0\text{ mm}$ horizontal and $50.0\text{ mm}$ vertical scale bars with a $20.0 \times 20.0\text{ mm}$ verification square.

---

## 6. Offline / Zero-AI Execution Guarantee

- **No Remote AI APIs:** The application does not require Google Gemini API keys, OpenAI, or external cloud vision services.
- **Zero Telemetry / Zero Tracking:** Patient data is stored locally in browser `localStorage`.
- **Reproducibility:** The entire project can be compiled and executed on an air-gapped clinical laptop or Android smartphone without Internet connectivity.
