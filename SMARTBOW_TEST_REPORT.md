# SmartBow AI — Phase 1B Automated Test Execution & Metrology Report
**Document ID:** SB-TR-PHASE1B-002  
**Execution Timestamp:** 2026-10-23T22:39:55Z  
**Branch:** `phase-1b-forensic-redesign` (Baseline Commit: `9b1bbb0`, Latest: `e511989`)  
**Runtime Environment:** Linux (x86_64), Node.js v22.14.0, TypeScript v7.0.2, TSX v4.21.0  
**Test Command:** `npm run test` (`tsx test/runTests.ts`)  
**Build Verification:** `npm run build` (`vite build`) — PASSED  
**Type Verification:** `npm run lint` (`tsc --noEmit`) — PASSED  

---

## Executive Summary

| Metric | Result |
|:---|:---|
| **Total Automated Tests Executed** | **80** |
| **Tests Passed** | **80 (100.0%)** |
| **Tests Failed** | **0 (0.0%)** |
| **Fatal Containment Violations** | **0** |
| **Independent OpenCV Decode Metrology** | **VALIDATED against independent OpenCV DICT_4X4_50 ground truth** |
| **CAD STL Geometry** | **VALIDATED (18.0 mm x 18.0 mm x 3.0 mm closed solid mesh)** |
| **Optical Gating Safety** | **HARDENED (Stale >500ms, Occlusion, Uncalibrated, Tracking Loss blocked)** |
| **Clinical Efficacy Status** | **NOT VALIDATED (Experimental Research Prototype Only)** |

---

## Summary of All 16 Test Groups

1. **Test Group 1: Missing Measurement Inputs Guard (6 tests)** — PASSED
2. **Test Group 2: Data Provenance & Separation (3 tests)** — PASSED
3. **Test Group 3: CR Repeatability & Jitter Rejection (3 tests)** — PASSED
4. **Test Group 4: Synthetic Validation Containment (3 tests)** — PASSED
5. **Test Group 5: Clinical Exports Watermarking & Protection (3 tests)** — PASSED
6. **Test Group 6: Tracking Loss Gates Capture (3 tests)** — PASSED
7. **Test Group 7: VDO Feedback Loop Stability (30 frame iterations)** — PASSED
8. **Test Group 8: Truthful Labeling Verification (2 tests)** — PASSED
9. **Test Group 9: Matrix Inversion & Composition Mathematical Roundtrip (2 tests)** — PASSED
10. **Test Group 10: Marker SVG Physical Dimensions & Grid Structure (4 tests)** — PASSED
11. **Test Group 11: Phase 1B Digital ArUco Decoder Verification (3 tests)** — PASSED
12. **Test Group 12: CAD Geometry & Sourced Rim Datums Reconciliation (3 tests)** — PASSED
13. **Test Group 13: 10-State Optical Diagnostics & Capture Safety Gating (6 tests)** — PASSED
14. **Test Group 14: Independent OpenCV Ground-Truth Marker Decode Validation (1 test / 13 markers)** — PASSED
    - Verified `decodeMarkerGrid()` against independent 6x6 OpenCV DICT_4X4_50 reference matrices completely decoupled from application generator code.
15. **Test Group 15: Optical Diagnostic Gating Hardening & Edge Conditions (6 tests)** — PASSED
    - Stale telemetry (> 500 ms) yields `MEASUREMENT_NOT_AVAILABLE` and blocks capture.
    - Missing facial reference plane yields `FACE_MARKERS_INCOMPLETE` and blocks capture.
    - Missing maxillary markers yields `MAXILLARY_MARKERS_INCOMPLETE` and blocks capture.
    - Missing mandibular markers yields `MANDIBULAR_MARKERS_INCOMPLETE` and blocks capture.
    - Uncalibrated camera intrinsics yields `CAMERA_NOT_CALIBRATED` and blocks capture.
    - Loss of tracking stability during shutter trigger aborts capture.
16. **Test Group 16: 3D-Printable Carrier Plate STL Validation (2 tests)** — PASSED
    - Generates 12-facet closed solid ASCII STL mesh.
    - Bounding dimensions strictly match 18.0 mm (width) x 18.0 mm (height) x 3.0 mm (thickness).

---

## Raw Execution Console Output

```bash
> react-example@0.0.0 test
> tsx test/runTests.ts

===============================================================
SMARTBOW AI — PHASE 1 V1 SAFETY CONTAINMENT TEST EXECUTION
===============================================================

Test Group 1: Missing Measurement Inputs Guard
  ✓ 1a: computeVdo(null, null) returns null, never 6.0 default
  ✓ 1b: computeVdo(pos, null) returns null on partial input
  ✓ 1c: computeCrDeviation([]) produces UNAVAILABLE status, null deviation, and UNAVAILABLE provenance
  ✓ 1d: computeCrDeviation([1 pt]) produces UNAVAILABLE (cannot compute pairwise distance)
  ✓ 1e: analyzeGothicArch([]) produces UNAVAILABLE, null angles, null apex, never 33° or 12° defaults
  ✓ 1f: generateClinicalSuggestions(biometrics, null, null) notes UNAVAILABLE vdo and crStatus

Test Group 2: Data Provenance & Separation
  ✓ 2a: synthesizeSimulatedFrame returns provenance="SIMULATED", isSimulation=true, metricMeasurementAvailable=false
  ✓ 2b: Webcam mode frame returns provenance="UNAVAILABLE" and metricMeasurementAvailable=false (never MEASURED)
  ✓ 2c: Webcam mode marker coverage has allThreeGroupsVisible=false (blocking metric acquisition)

Test Group 3: CR Repeatability & Jitter Rejection
  ✓ 3a: CR trials with excessive dispersion (> 1.0mm) are strictly marked REJECT
  ✓ 3b: CR trials with borderline dispersion (0.5–1.0mm) are marked RETRY, not ACCEPTED
  ✓ 3c: Evaluated deviation carries explicit SIMULATED provenance

Test Group 4: Synthetic Validation Containment
  ✓ 4a: generateSimulatedDemoValidationDataset marks 100% of rows as provenance="SIMULATED" and passed=false
  ✓ 4b: computeStatistics detects synthetic data: hasPhysicalData=false and passed=false
  ✓ 4c: Empty benchmark dataset results in sampleCount=0 and passed=false (NO PHYSICAL DATA)

Test Group 5: Clinical Exports Watermarking & Protection
  ✓ 5a: exportValidationCsv includes "# WARNING: SIMULATION — NOT FOR CLINICAL USE" header watermark
  ✓ 5b: Articulator prescription, JSON, and exocad exports embed simulation warning and provenance
  ✓ 5c: 3D printed STL file header contains "SIMULATION_NOT_FOR_CLINICAL_USE"

Test Group 6: Tracking Loss Gates Capture
  ✓ 6a: Small face width (< 0.20) flags faceFrameLocked=false and allThreeGroupsVisible=false
  ✓ 6b: Low optical quality (< 45) flags faceFrameLocked=false and allThreeGroupsVisible=false
  ✓ 6c: Status message conveys tracking loss or metric unavailability truthfully

Test Group 7: VDO Feedback Loop Stability
  ✓ 7a: Frame 0 invariant VDO remains stable at exactly baseVdo (60mm)
  ... (Frames 1-28 verified)
  ✓ 7a: Frame 29 invariant VDO remains stable at exactly baseVdo (60mm)

Test Group 8: Truthful Labeling Verification
  ✓ 8a: Simulator frame label does not claim VERIFIED or MEASURED
  ✓ 8b: Simulator frame label explicitly contains SIMULATED / NOT CLINICAL DATA

Test Group 9: Matrix Inversion & Composition Mathematical Roundtrip
  ✓ 9a: Rigid matrix inversion roundtrip (T * inv(T) and inv(T) * T) equals I (max error: 1.42e-14)
  ✓ 9b: 3D Point transformation roundtrip inv(T) * (T * p) == p within 1e-5 mm (error: 2.27e-14 mm)

Test Group 10: Marker SVG Physical Dimensions & Grid Structure
  ✓ 10a: renderMarkerSvg(0, 14) outputs exact width="14mm", height="14mm", viewBox="0 0 14 14"
  ✓ 10b: renderBoardSvg outputs exact width="18mm", height="18mm", viewBox="0 0 18 18"
  ✓ 10c: ArUco 6x6 marker grid has 1-bit pure black border on all 4 perimeter edges
  ✓ 10d: Inner 4x4 data bits exactly match registered DICT_4X4_50 bit array

Test Group 11: Phase 1B Digital ArUco Decoder Verification
  ✓ 11a: decodeMarkerGrid correctly decodes all registered clinical (0..12) & calibration (20..28) markers at 0° rotation
  ✓ 11b: decodeMarkerGrid successfully recovers marker ID and orientation across 90°, 180°, and 270° rotations
  ✓ 11c: Corrupted border (non-zero border pixel) is rejected with null decoding

Test Group 12: CAD Geometry & Sourced Rim Datums Reconciliation
  ✓ 12a: CAD board geometry is mathematically sound: outerSpan(14mm) + 2*margin(2mm) == 18mm, pitch(7.5mm) + marker(6.5mm) == 14mm
  ✓ 12b: All SOURCED_RIM_DATUMS explicitly marked as starting construction references (isUniversalConstant === false)
  ✓ 12c: Mandibular posterior rim height datum grounded in retromolar pad junction (Boucher 12th ed.)

Test Group 13: 10-State Optical Diagnostics & Capture Safety Gating
  ✓ 13a: Camera inactive in WEBCAM mode yields CAMERA_NOT_AVAILABLE and gates capture (engineeringTestAllowed === false)
  ✓ 13b: Face absent yields FACE_NOT_DETECTED and gates capture
  ✓ 13c: ArUco absent yields NO_ARUCO_MARKERS_DETECTED and gates capture
  ✓ 13d: Maxillary occlusion yields MAXILLARY_MARKERS_INCOMPLETE and gates capture
  ✓ 13e: Unverified print scale yields MARKER_SIZE_NOT_VERIFIED and gates capture
  ✓ 13f: All prerequisites met yields READY_FOR_ENGINEERING_TEST (engineeringTestAllowed === true, marked EXPERIMENTAL_ONLY)

Test Group 14: Independent OpenCV Ground-Truth Marker Decode Validation
  ✓ 14a: decodeMarkerGrid correctly decodes 100% of independently generated OpenCV DICT_4X4_50 ground-truth bitmatrices

Test Group 15: Optical Diagnostic Gating Hardening & Edge Conditions
  ✓ 15a: Stale optical telemetry (> 500ms) yields MEASUREMENT_NOT_AVAILABLE and strictly blocks capture
  ✓ 15b: Incomplete facial landmark plane yields FACE_MARKERS_INCOMPLETE and blocks capture
  ✓ 15c: Incomplete maxillary ArUco array yields MAXILLARY_MARKERS_INCOMPLETE and blocks capture
  ✓ 15d: Incomplete mandibular ArUco array yields MANDIBULAR_MARKERS_INCOMPLETE and blocks capture
  ✓ 15e: Uncalibrated camera intrinsics yields CAMERA_NOT_CALIBRATED and blocks capture
  ✓ 15f: Loss of tracking stability during exposure yields MEASUREMENT_NOT_AVAILABLE and aborts capture

Test Group 16: 3D-Printable Carrier Plate STL Validation
  ✓ 16a: generateMarkerCarrierPlateStl generates valid closed solid STL mesh with 12 facets
  ✓ 16b: Carrier plate STL dimensions strictly conform to CAD specification: 18.0 x 18.0 x 3.0 mm

===============================================================
TOTAL TESTS: 80 | PASSED: 80 | FAILED: 0
===============================================================

ALL PHASE 1 SAFETY CONTAINMENT TESTS PASSED SUCCESSFULLY.
```
