# SmartBow AI — Engineering Reference & Clinical User Manual
**Document Version:** Phase 1B Forensic Revision  
**Subject:** Digital Jaw Relations, ArUco Metrology, Optical State Diagnostics, and Prosthodontic Rim Construction  

---

## 1. System Scope & Regulatory Status

SmartBow is an **experimental research prototype** designed to explore smartphone optical computer vision for recording jaw relations in complete denture prosthodontics and full-mouth rehabilitation.

### ⚠️ Explicit Research Disclaimer
- **Not a Clinically Validated Medical Device:** The system has not received clearance or approval from medical device regulatory bodies.
- **Engineering Readiness vs Clinical Validity:** The status `READY_FOR_ENGINEERING_TEST` indicates strictly that optical detection, camera calibration, and fiducial geometric prerequisites are satisfied. It **does not prove** clinical accuracy, centric relation repeatability, or facebow transfer fidelity.
- **Mandatory Clinical Triangulation:** All digital readings (VDO, Camper's tilt, midline) must be triangulated against established clinical techniques:
  1. Phonetic closest speaking space (Silverman).
  2. Physiological rest position minus freeway space (Niswonger).
  3. Tactile lip posture, facial aesthetics, and da Vinci facial thirds.

---

## 2. Occlusal Rim Construction Reference Datums

### Anatomical Datum Grounding (Boucher & Winkler)
Stated rim dimensions in dental literature are **starting laboratory construction guidelines**, not immutable anatomical constants. The table below outlines standard datums and the clinical rationale for each:

| Anatomical Parameter | Starting Construction Guideline | Sourced Literature Reference | Clinical Calibration & In-Vivo Verification |
|:---|:---|:---|:---|
| **Maxillary Anterior Rim Height** | $20\text{--}22\text{ mm}$ (from labial sulcus adjacent to labial frenum) | Boucher's Prosthodontic Treatment for Edentulous Patients (12th ed., p. 248); Winkler (2nd ed., p. 138) | Must show $1\text{--}2\text{ mm}$ below resting upper lip line in young patients; flush with lip line in elderly patients. |
| **Maxillary Posterior Rim Height** | $8\text{--}10\text{ mm}$ (adjacent to maxillary tuberosity) | Boucher 12th ed., p. 249; Sharry Prosthodontics (3rd ed.) | Must parallel Camper's line (ala-tragus) anteroposteriorly and the interpupillary line mediolaterally. |
| **Maxillary Anterior Width** | $4\text{--}5\text{ mm}$ | Boucher 12th ed., p. 250 | Provides physiological lip support without effacing the philtrum or nasolabial sulcus. |
| **Maxillary Posterior Width** | $8\text{--}10\text{ mm}$ | Boucher 12th ed., p. 250 | Accommodates molar buccolingual dimensions within the neutral zone. |
| **Mandibular Anterior Rim Height** | $16\text{--}18\text{ mm}$ (from depth of labial sulcus) | Boucher 12th ed., p. 252; Winkler 2nd ed., p. 142 | Flush with the lower lip at resting posture; phonetic "S" produces $1\text{--}2\text{ mm}$ speaking clearance. |
| **Mandibular Posterior Height** | Level with the **junction of middle & upper thirds of the retromolar pad** | Boucher 12th ed., p. 253; Winkler 2nd ed., p. 143 | Anatomically stable landmark that corresponds to the natural mandibular occlusal table. |
| **Mandibular Anterior Width** | $4\text{--}5\text{ mm}$ | Boucher 12th ed., p. 254 | Sits directly over the residual crest in the neutral zone. |
| **Mandibular Posterior Width** | $8\text{--}10\text{ mm}$ | Boucher 12th ed., p. 254 | Sits between the tongue and buccinator muscle without impingement. |

---

## 3. Optical Fiducial Board CAD Specification

To prevent tracking ambiguity, the miniature fiducial marker boards clipped to the occlusal rims are manufactured to strict mechanical tolerances:

```
+-------------------------------------------------------------------------+
| SMARTBOW 18x18mm ACRYLIC MARKER BOARD SPECIFICATION                    |
|                                                                         |
| Substrate: Clear cast PMMA acrylic, 18.00 x 18.00 x 3.00 mm (±0.05 mm)  |
| Array: 2 x 2 OpenCV ArUco DICT_4X4_50 fiducials                         |
| Marker Size: 6.50 x 6.50 mm (1-bit solid black enclosing border)        |
| Marker Centers: (±3.75 mm, ±3.75 mm) relative to board center           |
| Center-to-Center Pitch: 7.50 mm                                         |
| Array Outer Span: 14.00 x 14.00 mm                                      |
| Perimeter Acrylic Margins: 2.00 mm                                      |
| Corner Chamfers: 0.50 mm x 45° (mucosal safety relief)                  |
| Mounting Wire: Dual 0.8 mm stainless steel orthodontic anchor pins      |
+-------------------------------------------------------------------------+
```

### Marker ID Allocation:
- **Maxillary Board (Right Premolar):** IDs `3`, `4`, `5`, `6`
- **Mandibular Board (Right Premolar):** IDs `7`, `8`, `9`, `10`
- **Facial Landmark Frame (Contactless):** Facial nodes `10` (Glabella / F01), `234` (Right Zygoma / F02), `454` (Left Zygoma / F03)
- **Bench Calibration Matrix:** IDs `20` through `28` ($3 \times 3$ planar array)

---

## 4. Optical Diagnostic State Machine (10 States)

SmartBow eliminates ambiguous states (such as "Mode: none") through an authoritative 10-state diagnostic system. Each state provides specific, actionable guidance for the operator:

1. **`CAMERA_NOT_AVAILABLE`**
   - *Cause:* No active video stream or browser permission denied.
   - *Action:* Connect camera or grant browser permissions.
2. **`FACE_NOT_DETECTED`**
   - *Cause:* Patient face outside optical field of view.
   - *Action:* Position patient $35\text{--}50\text{ cm}$ away under uniform ambient operatory lighting.
3. **`NO_ARUCO_MARKERS_DETECTED`**
   - *Cause:* No physical fiducials detected in scene.
   - *Action:* Ensure $18 \times 18\text{ mm}$ boards are mounted and unobstructed by lips or fingers.
4. **`FACE_MARKERS_INCOMPLETE`**
   - *Cause:* Glabella or lateral zygomatic arch obscured.
   - *Action:* Clear hair or glasses frames occluding lateral facial nodes.
5. **`MAXILLARY_MARKERS_INCOMPLETE`**
   - *Cause:* Less than 4 maxillary markers (IDs 3..6) visible.
   - *Action:* Retract right cheek corner or orient phone $30^\circ\text{--}45^\circ$ anterolaterally.
6. **`MANDIBULAR_MARKERS_INCOMPLETE`**
   - *Cause:* Less than 4 mandibular markers (IDs 7..10) visible.
   - *Action:* Retract lower lip; eliminate interocclusal shadowing.
7. **`CAMERA_NOT_CALIBRATED`**
   - *Cause:* Pinhole camera matrix unknown.
   - *Action:* Open Camera Calibration modal and record reference standard.
8. **`MARKER_SIZE_NOT_VERIFIED`**
   - *Cause:* Caliper measurement of 100 mm check bar unconfirmed.
   - *Action:* Measure printout with digital caliper ($100.0 \pm 0.2\text{ mm}$) and toggle verified.
9. **`MEASUREMENT_NOT_AVAILABLE`**
   - *Cause:* Excessive motion blur or frame-to-frame jitter.
   - *Action:* Hold camera steady or mount on mobile clinical tripod.
10. **`READY_FOR_ENGINEERING_TEST`**
    - *Cause:* All optical, facial, calibration, and print geometry requirements satisfied.
    - *Status:* Shutter capture enabled for engineering trial recording.

---

## 5. Software Self-Correction & Invariance Principle

SmartBow computes jaw relations in the patient's intrinsic coordinate frame $T_{\text{patient}}$ established by facial skeletal landmarks (glabella and bilateral zygomatic arches):

$$T_{\text{mand}}^{\text{patient}} = \left( T_{\text{patient}}^{\text{camera}} \right)^{-1} \cdot T_{\text{mand}}^{\text{camera}}$$

Because both the patient frame and mandibular board are observed simultaneously by the camera, any rigid movement of the smartphone (roll, pitch, yaw, or distance drift) cancels out identically in the coordinate transformation. Handheld phone shake does **not** corrupt the patient-to-mandible relative distance or angular alignment.

---

## 6. Chairside Operating Procedure (Step-by-Step SOP)

1. **Step 1 — Fabricate Baseplates & Rims:** Construct wax rims to Boucher/Winkler starting dimensions ($22\text{ mm}$ maxillary anterior, $18\text{ mm}$ mandibular anterior, posterior rim level with upper third of retromolar pad).
2. **Step 2 — Print & Measure Markers:** Print A4 sheet at 100% scale without page fitting. Confirm 100 mm check bar with digital caliper. Assemble $18 \times 18\text{ mm}$ acrylic plates.
3. **Step 3 — Mount Marker Boards:** Attach maxillary board (IDs 3..6) and mandibular board (IDs 7..10) to the right buccal premolar region with $3\text{ mm}$ occlusal clearance.
4. **Step 4 — Position Camera:** Place smartphone $35\text{--}50\text{ cm}$ from patient at occlusal plane level, angled $30^\circ\text{--}45^\circ$ anterolaterally to view both facial mesh and buccal marker plates.
5. **Step 5 — Check Optical Diagnostics:** Observe the top diagnostic banner until `READY_FOR_ENGINEERING_TEST` turns green.
6. **Step 6 — Record Centric Trials:** Guide patient into centric relation via bimanual manipulation (Dawson technique) and trigger shutter to record 3 repeatable trials.
7. **Step 7 — Validate & Export:** Review VDO and occlusal plane tilt against clinical checkpoints, then export the digital record and 3D virtual articulator mount.
