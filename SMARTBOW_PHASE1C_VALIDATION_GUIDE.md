# SMARTBOW ZERO — PHASE 1C PHYSICAL & LIVE WEBCAM VALIDATION GUIDE

## 1. Honest Verification Scope Notice

- **Completed in Automated Build/CI Environment**:
  - 50/50 OpenCV `DICT_4X4_50` bit-matrix and rasterized marker parity (`tools/gen_golden.py` + `test/arucoParity.ts` using real Python OpenCV `cv2.aruco`).
  - Scale (`8, 10, 12, 14, 16, 20, 26, 36, 60 px`), rotation (`0°`, `25°`), Gaussian blur (`0`, `0.8 px`), and Gaussian noise (`sigma 0`, `sigma 2`) sweeps.
  - Foreign dictionary (`DICT_6X6_250`) rejection and 300 seeded random block false-positive tests.
  - Full A4 print-sheet SVG rasterization regression test (`27/27` markers decoded: `16` dental-rim markers across primary + spare boards, `2` Hanau markers, `9` calibration card markers, `0` facial ArUco markers).
- **Requires Operator Physical Hardware**:
  - Physical laser/inkjet paper printing, Vernier caliper dimensional verification, and live optical camera testing on the target smartphone (Motorola Edge 70 Fusion) or desktop webcam **must be performed by the operator** using the protocol below.

---

## 2. Step 1 — Print & Verify 1:1 Physical Scale

1. Open **SmartBow AI** and open the **Printable Markers** modal (**Print 1:1 Fiducial Sheet**).
2. Click **Download Print-Ready PDF** (`SmartBow_A4_Fiducial_Sheet_100pct_Scale.pdf`).
3. Print on matte white DIN A4 paper (`210 × 297 mm`) with:
   - **Scale**: `100%` / `Actual Size`
   - **Fit to Page / Shrink to Printable Area**: **DISABLED**
4. Measure the printed verification bars with a digital Vernier caliper:
   - **Horizontal Scale Bar**: `100.0 ± 0.2 mm`
   - **Vertical Scale Bar**: `50.0 ± 0.2 mm`
   - **Square Verification Gauge**: `20.0 ± 0.1 mm` on both axes
   - **Occlusal Rim Target Plate**: `18.0 × 18.0 mm` outer boundary, `14.0 × 14.0 mm` 4-marker outer span, `6.5 × 6.5 mm` individual marker size, `7.5 mm` center-to-center pitch.

---

## 3. Step 2 — Camera Resolution, Autofocus & Working Distance Setup

1. Navigate to the **Scanner** screen and select **Live Camera** or **Marker Test**.
2. Inspect the top telemetry strip in the viewfinder:
   - Confirm the active stream resolution badge (`RES: 1920×1080` ideal, or `1280×720` fallback).
   - If `WARN <1280×720` appears, switch to the rear primary camera (`Switch Front / Rear Camera` or camera selector dropdown) so the `6.5 mm` markers receive sufficient pixels per cell.
   - On mobile cameras supporting continuous autofocus, confirm `AF-C` is active and allow `0.5–1.0 s` for the lens to focus when changing distance.
3. **Approximate Working Distance Guidance**:
   - Because each dental-rim fiducial is physically `6.5 × 6.5 mm` (`6 × 6` grid = `1.08 mm` per cell), the marker must subtend at least `10–14 px` per side on the camera sensor.
   - At `1920 × 1080` resolution on a typical smartphone or webcam horizontal FOV (`60°–75°`), hold the `6.5 mm` marker board approximately **18–35 cm** from the lens under diffuse, non-glare lighting.
   - *Note*: Working distance is **approximate** and depends on your camera's field of view (FOV), close-focus capability, and actual stream resolution.

---

## 4. Step 3 — Progressive 4-Stage Live Verification Protocol

1. **Stage A — Single Marker Verification (`Marker Test -> Step 1: Single Marker`)**:
   - Present the `60 × 60 mm` Calibration Card (`IDs 20–28`, `12.0 mm` markers) or a single Maxillary board (`IDs 3–6`, `6.5 mm` markers).
   - Verify immediate quadrilateral outline rendering and `VERIFIED LIVE` badge.
2. **Stage B — Maxillary Group (`IDs 3, 4, 5, 6`)**:
   - Present the Maxillary `#1` board (`IDs 3, 4, 5, 6`).
   - Verify **cyan (`#22d3ee`)** quadrilateral outlines around all 4 markers and top strip readout:
     `MAXILLARY Detected IDs: [3, 4, 5, 6] · Count: 4/4 · Missing: []`
3. **Stage C — Mandibular Group (`IDs 7, 8, 9, 10`)**:
   - Present the Mandibular `#1` board (`IDs 7, 8, 9, 10`).
   - Verify **amber (`#f59e0b`)** quadrilateral outlines around all 4 markers and top strip readout:
     `MANDIBULAR Detected IDs: [7, 8, 9, 10] · Count: 4/4 · Missing: []`
4. **Stage D — Simultaneous Dual-Rim + Contactless Natural Face Tracking**:
   - Position both Maxillary (`3–6`) and Mandibular (`7–10`) boards in view with the patient's face visible.
   - Verify:
     - `FACE TRACKING: DETECTED` (using contactless MediaPipe landmarks `#10`, `#234`, `#454` — no facial ArUco stickers `0–2` are required or expected).
     - `MAXILLARY Detected IDs: [3, 4, 5, 6] · Count: 4/4 · Missing: []`
     - `MANDIBULAR Detected IDs: [7, 8, 9, 10] · Count: 4/4 · Missing: []`

---

## 5. Structured 4-Outcome Diagnostic Classification

When recording validation results on physical hardware, classify the outcome into one of the four states below using the on-screen telemetry strip:

| Outcome Code | Observed Behaviour | Primary Telemetry Indicators | Recommended Action |
| :--- | :--- | :--- | :--- |
| **OUTCOME 1: `FULL_PASS`** | All 4 Maxillary (`3–6`, cyan) and 4 Mandibular (`7–10`, amber) markers lock stably with `FACE TRACKING: DETECTED`. | `Count: 4/4` on both rims, `STATUS: DETECTED`, `MarkerQuality.grade` = `GOOD` or `LOW`. | Ready for engineering jaw-relation capture trials. |
| **OUTCOME 2: `PARTIAL_RIM_DETECTED`** | 1–3 markers per board decode (`MARKERS_DETECTED` remains active and outlined), while remaining IDs list under `Missing`. | `Count: 1..3/4`, `WARN:` quality notice if low contrast or border noise is present. | Tilt board `5°–15°` away from overhead surgical light to eliminate specular reflection on missing corners, or move `3–5 cm` closer. |
| **OUTCOME 3: `CANDIDATES_REJECTED_ZERO_LOCK`** | Camera is active (`0/4` detected), but `Quads > 0` or `TooSmall > 0` appears in candidate counter. | `TooSmall > 0`: marker `< 7 px` side.<br>`Border > 0`: `> 7` white border cells.<br>`Dict > 0`: inner `4×4` bits blurred or wrong sheet. | If `TooSmall > 0`: move camera closer or verify `1920×1080` resolution.<br>If `Border > 0`: ensure `2.0 mm` white quiet zone around the black border was not trimmed off.<br>If `Dict > 0`: allow camera autofocus to settle (`AF-C`). |
| **OUTCOME 4: `STREAM_OR_ILLUMINATION_BLOCKED`** | `Quads: 0` and `TooSmall: 0`, or stream fails to start. | `STATUS: LOW LIGHT` (`meanLuminance < 42`), `STATUS: GLARE` (`glareRatio > 0.35` with `Flat > 0`), or `RES < 1280×720`. | Increase diffuse room lighting, avoid direct lamp reflection, or grant browser camera permissions. |
