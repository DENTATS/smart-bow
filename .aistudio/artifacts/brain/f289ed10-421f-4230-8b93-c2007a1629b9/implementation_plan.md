# Implementation Plan — 1:1 A4 ArUco Fiducial Printer File Optimization & Dual SVG/PDF Export

Resolve fiducial overlapping and clipping issues in the A4 printable sheet (`SmartBow_A4_Print_Sheet_100pct_Scale_b00d7131.svg`), preserve strict OpenCV `DICT_4X4_50` fiducial geometry, and provide high-fidelity 1:1 Vector SVG and printable PDF exports in the SmartBow AI application.

---

## 1. Problem Diagnosis & Root Causes

1. **Section 1 (18×18 mm Occlusal Rim Arrays)**:
   - In `renderBoardSvg`, marker ID labels (`#3`, `#4`, etc.) are positioned at `y = p.y + markerSizeMm + 1.2`. Because the top markers are at `y = 2.0` (height 6.5 mm), the text appears at `y = 9.7 mm`, which collides directly with the top black border of the bottom markers at `y = 9.5 mm`.
   - The central label `"MAXILLA"` / `"MANDIBLE"` (approx. 5 mm wide) is drawn in the 1.0 mm gap between left and right markers, occluding fiducial quiet zones.
2. **Section 2 (14×14 mm Facial & Articulator Markers)**:
   - Facial markers (F01–F03) and Hanau articulator adapters (H01–H02) are crowded into a single generic section without distinct visual grouping or sufficient card boundaries.
3. **Section 3 (60×60 mm 3×3 Intrinsics Calibration Grid)**:
   - White text labels (`#20`, `#21`, ..., `#28`) were rendered inside the 12×12 mm ArUco markers at `y = 11.2 mm`, directly piercing the outer black ArUco perimeter and corrupting corner detection.
4. **Export Requirements**:
   - The user selected **Fix overlapping elements and optimize the single-page A4 layout** and **Both clean vector SVG and 1:1 printable PDF**.

---

## 2. Proposed Changes

### Target Files:
1. `src/lib/arucoDict.ts`:
   - Redesign `renderBoardSvg()` to keep the 18×18 mm active fiducial square 100% free of overlapping text; place board identifiers and CAD specs cleanly outside the array perimeter.
   - Refactor `renderFullA4PrintSheetSvg()`:
     - **Scale Bar**: 100.0 mm Vernier caliper scale bar with crisp 1 mm, 5 mm, and 10 mm ticks, tolerance bounds (±0.5 mm), and caliper jaw indicator arrows.
     - **Section 1**: 4 distinct carrier cards (Maxilla, Mandible, Spare Maxilla, Spare Mandible) with outer 20×26 mm cut bounds, center alignment crosshairs, and clear external ID tags.
     - **Section 2**: Grouped into two visual subsections:
       - *Facial Cranial Landmarks*: F01 Glabella/Nasion (ID 0), F02 Right Zygoma (ID 1), F03 Left Zygoma (ID 2).
       - *Articulator Mechanical References*: H01 Hanau Upper Condylar (ID 11), H02 Hanau Lower Member (ID 12).
     - **Section 3**: Clean 60×60 mm 3×3 ArUco calibration target with zero internal text overlays (pure OpenCV fiducials with certified 1-bit black borders) + right-side clinical calibration protocol panel.
2. `public/assets/aistudio/SmartBow_A4_Print_Sheet_100pct_Scale_b00d7131.svg`:
   - Overwrite with the corrected, pristine, 100% scale vector SVG file.
3. `package.json` & PDF Export:
   - Install `jspdf` (`npm install jspdf`).
   - Implement client-side 1:1 DIN A4 vector PDF generation in `src/lib/pdfExport.ts` (or direct vector canvas-to-PDF rendering at 300 DPI 1:1 scale matching 210 × 297 mm exact physical size).
4. `src/components/PrintableMarkersModal.tsx`:
   - Add dual export action buttons: **Download Vector SVG** and **Download 1:1 Printable PDF**.
   - Include direct browser print stylesheet configuration (`@page { size: A4 portrait; margin: 0; }`) to guarantee 100% actual size printing without driver auto-shrink.
   - Embed interactive SVG live preview with zoom controls.
5. `test/opticalGating.test.ts` & marker tests:
   - Verify that test suite continues to pass with 0 failures.

---

## 3. Verification Plan

1. **Automated Test Suite**:
   - Run `npm run test` (80 tests across 16 test suites) to ensure marker decoding, rotation invariance, optical gating, and CAD specifications remain 100% passing.
2. **SVG Dimensional & Geometry Audit**:
   - Verify that all markers have intact 1-bit outer black perimeters with zero overlapping glyphs.
   - Verify that the 100 mm scale bar spans exactly 100 mm in document coordinates.
   - Verify total sheet bounds are exactly `210mm × 297mm` with `viewBox="0 0 210 297"`.
3. **Dual Export Verification**:
   - Verify SVG download produces valid, well-formed XML.
   - Verify PDF download generates an exact DIN A4 PDF document at 1:1 physical dimensions.
4. **Applet Compilation**:
   - Run `compile_applet` to confirm TypeScript and build clean without errors.
