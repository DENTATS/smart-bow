# SmartBow AI — Chairside Quick-Start Guide (4-Page Pictorial Protocol)
**Document Version:** 1.2-FORENSIC-REV  
**Classification:** Experimental Prosthodontic Engineering Prototype  
**Audience:** Clinical Prosthodontists, Post-Graduate Residents, and Dental Laboratory Technicians  

---

> ### ⚠️ RESEARCH PROTOTYPE NOTICE
> SmartBow is an experimental computer-vision jaw relation recording system. It is designed for bench evaluation and controlled engineering testing. It is **NOT** a clinically validated medical device. Numerical readings must be verified chairside against conventional clinical checkpoints (Silverman closest speaking space, Niswonger physiological rest, and tactile lip posture).

---

## PAGE 1 — Print & Measure Calibration (Zero-Scale Verification)

```
+-------------------------------------------------------------------------------+
|  A4 PRINT VERIFICATION SHEET (210 mm x 297 mm)                                |
|                                                                               |
|  [!] CRITICAL: Print at 100% / "Actual Size". DO NOT select "Fit to Page"    |
|                                                                               |
|  0 mm       20 mm       40 mm       60 mm       80 mm      100 mm             |
|  |-----------|-----------|-----------|-----------|-----------|                |
|  [================== 100.0 mm DIGITAL CALIPER CHECK BAR ==================]  |
|                                                                               |
|  Pass Criterion: Caliper reading MUST be 100.0 ± 0.2 mm.                      |
|  If reading < 99.8 mm or > 100.2 mm -> ABORT. Printer scaling is active.       |
+-------------------------------------------------------------------------------+
```

### Action Steps:
1. **Open Marker Print Modal:** Navigate to **Physical Markers** in SmartBow.
2. **Printer Driver Settings:**
   - Paper Size: `A4` (or `Letter` with borderless/actual size selected).
   - Scaling: Select **`Actual Size`** or **`Custom Scale: 100%`**.
   - Output Quality: `High` or `Fine` (minimum 600 DPI, non-interpolated).
   - Media: Bright white 120–160 gsm heavyweight matte paper or synthetic polyester film (to avoid moisture absorption in the operatory).
3. **Physical Caliper Measurement:**
   - Take a calibrated digital vernier caliper (0.01 mm resolution).
   - Measure the 100 mm reference scale bar across the outer edge ticks.
   - If measurement is between $99.8\text{ mm}$ and $100.2\text{ mm}$, check the "100mm Scale Verified" box in the software.
   - If not, check printer page setup and disable browser auto-scaling.

---

## PAGE 2 — Acrylic Plate & Marker Assembly

```
  +-------------------------------------------------------------------+
  | 18.0 mm x 18.0 mm x 3.0 mm CLEAR CAST ACRYLIC BASEBOARD          |
  |                                                                   |
  |      |<------- 7.5 mm pitch ------->|                             |
  |      +-----------+                  +-----------+                 |
  |      |  ArUco 3  |                  |  ArUco 4  |                 |
  |      | 6.5 x 6.5 |                  | 6.5 x 6.5 |                 |
  |      +-----------+                  +-----------+                 |
  |                                                                   |
  |      +-----------+                  +-----------+                 |
  |      |  ArUco 5  |                  |  ArUco 6  |                 |
  |      | 6.5 x 6.5 |                  | 6.5 x 6.5 |                 |
  |      +-----------+                  +-----------+                 |
  |                                                                   |
  | Array Outer Span: 14.0 mm x 14.0 mm | Border Margins: 2.0 mm      |
  +-------------------------------------------------------------------+
```

### Assembly Steps:
1. **Substrate Preparation:**
   - Cut a $18.0 \times 18.0 \times 3.0\text{ mm}$ square plate from clear cast PMMA (acrylic) or precision 3D-print in dental biocompatible resin.
   - Chamfer edges $0.5\text{ mm}$ at $45^\circ$ to prevent buccal mucosa irritation.
2. **Marker Affixation:**
   - Cut the printed $2 \times 2$ ArUco array along the outer cutting outline.
   - Affix using thin medical-grade cyanoacrylate or double-sided adhesive film.
   - **Crucial Polarity Check:** Verify the black border is solid and undisturbed (DICT_4X4_50 standard with 1-bit solid black quiet border). Never crop into the black border!
3. **Moisture Sealing:**
   - Seal the paper face with an ultra-thin clear UV laminate or medical moisture-barrier tape to resist operatory saliva and intraoral humidity.

---

## PAGE 3 — Wax Rim Baseline & Physical Mounting

```
+-------------------------------------------------------------------------------+
| MAXILLARY OCCLUSAL RIM                                                        |
| Anterior Height: 20-22 mm (from labial sulcus adjacent to labial frenum)      |
| Posterior Height: 8-10 mm (adjacent to maxillary tuberosity)                  |
| Anterior Width: 4-5 mm | Posterior Width: 8-10 mm                             |
|                                                                               |
| MANDIBULAR OCCLUSAL RIM                                                       |
| Anterior Height: 16-18 mm (from lingual/labial sulcal depth)                  |
| Posterior Height: Level with junction of middle & upper 1/3 of retromolar pad |
+-------------------------------------------------------------------------------+
```

> **Prosthodontic Note:** The above values are **starting laboratory construction references** (Boucher 12th ed., Winkler 2nd ed.), **not universal patient absolutes**. Clinical adjustment to phonetics and aesthetics is always mandatory.

### Mounting the Board to the Rim:
1. **Location:** Mount on the **right buccal premolar region** of both maxillary and mandibular rims (buccal corridor clearance).
2. **Clearance:** Ensure $3.0\text{ mm}$ clearance from the occlusal table to allow uninterrupted rim contact during centric closure.
3. **Retention:** Anchor using two $0.8\text{ mm}$ stainless steel orthodontic wire tacks heated and embedded into the buccal wax contour.
4. **Orientation:** Align plates parallel to the Camper's plane (ala-tragus) and verify that rims close into CR without board-to-board contact.

---

## PAGE 4 — Camera Positioning & Live Optical Diagnostics

```
        PATIENT
          (o)  <-- Frontal / 30°-45° Right Anterolateral View
         / | \
        /  |  \
           |
       35-50 cm
           |
           v
       [ SMARTPHONE ]
       (Camera at patient occlusal plane height)
```

### Live Tracking 10-State Verification:
Check the top diagnostic banner on the Live Scanner screen:

| Diagnostic State | Clinical Action Required |
|:---|:---|
| `READY_FOR_ENGINEERING_TEST` | **All systems green.** Proceed to bench test trial recording. |
| `FACE_NOT_DETECTED` | Position patient directly in frame, $35\text{--}50\text{ cm}$ away, uniform lighting. |
| `NO_ARUCO_MARKERS_DETECTED` | Check marker boards on rims; retract right corner of mouth. |
| `FACE_MARKERS_INCOMPLETE` | Clear hair from forehead (glabella) and cheekbones (zygomatic arches). |
| `MAXILLARY_MARKERS_INCOMPLETE` | Retract right cheek; adjust camera angle $30^\circ\text{--}45^\circ$ anterolateral. |
| `MANDIBULAR_MARKERS_INCOMPLETE` | Retract lower lip; verify rim stability and avoid occlusal shadows. |
| `CAMERA_NOT_CALIBRATED` | Tap **Calibrate Camera** and confirm focal length. |
| `MARKER_SIZE_NOT_VERIFIED` | Measure printed 100 mm bar with calipers and tap **Verify Scale**. |
| `MEASUREMENT_NOT_AVAILABLE` | Camera movement detected. Hold phone steady or use desk tripod. |
| `CAMERA_NOT_AVAILABLE` | Allow browser camera permissions in browser settings. |

**Capture Rule:** The Shutter Record button is enabled **only** when `READY_FOR_ENGINEERING_TEST` is active.
