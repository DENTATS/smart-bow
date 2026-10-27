# High-Definition Print-Ready PDF & Vector Calibration Repair

Fix the poor print quality of exported PDFs in SmartBow AI by replacing canvas rasterization with a dual-engine vector PDF architecture. This preserves exact physical dimensions, ensures infinite zoom sharpness for OpenCV ArUco markers, and adds dual-axis caliper verification.

## User Review & Critical Decisions

> [!IMPORTANT]
> The clarifying questions have been confirmed by the user:
> - **PDF Architecture**: Dual-engine vector PDF with embedded 600 DPI fallback raster.
> - **Document Scope**: Both Printable Marker Sheets and Clinical Report / Lab Prescription.
> - **Dimensional Verification**: Dual 100 mm horizontal and 50 mm vertical scale bars (±0.2 mm tolerance).

---

## 1. Overview & Core Concept

- **What It Does**: Replaces the blurry HTML5 `<canvas>` rasterization pipeline with direct native PDF vector drawing via `jsPDF`. Every ArUco cell, fiducial boundary, cut guide, text label, and Vernier scale bar is rendered as pure mathematical vectors mapped 1:1 to DIN A4 (210 × 297 mm).
- **Target Audience**: Prosthodontists, postgraduate dental residents, and dental lab technicians using mobile devices (Motorola Edge 70 Fusion, Android browsers, tablets, and desktop workstations).
- **Key Value**: Guarantees sub-millimeter computer-vision accuracy during patient face and jaw relation scanning, preventing optical tracking failure caused by blurry or rescaled printer outputs.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Marker Sheet Download Flow**:
   - User opens **Settings** or **Home** $\rightarrow$ taps **Print Marker Sheet**.
   - Modal displays the updated A4 preview showing **dual scale bars (100 mm horizontal + 50 mm vertical)**.
   - Prominent print warning is shown: `"MANDATORY: PRINT AT 100% (ACTUAL SIZE) · DISABLE FIT TO PAGE"`.
   - User taps **Download HD Vector PDF (A4)** $\rightarrow$ browser downloads an authentic vector PDF that remains razor-sharp at 10,000% zoom.
   - Caliper check input allows the user to record their physical ruler measurement before clinical tracking.

2. **Clinical Report PDF Export Flow**:
   - User navigates to **Clinical Rx** in the top navigation or Home screen.
   - User clicks **Download Clinical Report (HD PDF)**.
   - System compiles patient biometrics, jaw relation measurements (VDO, CR, Freeway Space, SCI, Bennett angles), and simulation watermarks into a publication-grade, crisp vector PDF.

### Visual Identity & Theme
- **Theme**: Minimal medical-software styling with clean white substrate (`#FFFFFF`), high-contrast dark text (`#0F172A`), restrained clinical teal accent (`#0D9488`), and clear warning banners (`#DC2626`).
- **Typography**: Clean vector sans-serif headers with monospaced tabular figures (`Courier` / `Helvetica`) for coordinates, angles, and scale ticks.
- **Dual Scale Bars**: 
  - Horizontal: 100.0 mm Vernier caliper bar with 1 mm minor, 5 mm mid, and 10 mm major ticks.
  - Vertical: 50.0 mm height check bar with caliper alignment arrows to detect vertical paper feed distortion.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Vector PDF Primitives vs. High-DPI Canvas Rasterization**
  - *Chosen Approach*: Direct PDF vector construction via `jsPDF` (`pdf.rect()`, `pdf.line()`, `pdf.text()`) backed by a 600 DPI fallback generator.
  - *Why*: Canvas rasterization is inherently bounded by pixel grid resolution and mobile GPU memory limits. In contrast, native PDF vector paths are infinitely scalable, render with zero compression artifacts, and produce tiny file sizes (~40 KB vs ~6 MB).
  - *Alternatives Considered*: 1200 DPI canvas rendering was rejected because mobile Android browsers (Motorola Edge 70 Fusion) crash or throw out-of-memory errors on massive $9920 \times 14032$ px canvas buffers.

- **Decision 2: Dual Scale Bars (Horizontal 100 mm & Vertical 50 mm)**
  - *Chosen Approach*: Include both horizontal (100 mm) and vertical (50 mm) Vernier caliper verification bars on the DIN A4 print sheet.
  - *Why*: Office laser and inkjet printers often suffer from non-isotropic roller slippage (anamorphic scaling), stretching the paper along the feed axis while maintaining the transverse axis. Dual-axis bars allow clinicians to immediately catch single-axis distortion.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   SmartBow AI Client                   │
├───────────────────────────┬────────────────────────────┤
│ PrintableMarkersModal.tsx │   ClinicalReportModal.tsx  │
└─────────────┬─────────────┴─────────────┬──────────────┘
              │                           │
              ▼                           ▼
┌────────────────────────────────────────────────────────┐
│                      src/lib/                          │
├───────────────────────────┬────────────────────────────┤
│       arucoDict.ts        │        pdfExport.ts        │
│ • renderFullA4SheetSvg    │ • downloadA4PrintSheetPdf  │
│ • DICT_4X4_50 bitmatrices │ • downloadClinicalReportPdf│
│ • Dual Scale Bars (H & V) │ • Native jsPDF Vector Eng. │
│ • CAD 18x18mm Datums      │ • 600 DPI Fallback Engine  │
└───────────────────────────┴────────────────────────────┘
              │                           │
              ▼                           ▼
┌────────────────────────────────────────────────────────┐
│              Output Verification & Safety              │
├────────────────────────────────────────────────────────┤
│ • DIN A4 210 × 297 mm exact physical boundary          │
│ • Binary 1-bit ArUco cells (14mm, 18mm, 12mm)          │
│ • 86+ automated tests in test/runTests.ts              │
└────────────────────────────────────────────────────────┘
```

### Component & File Modifications
1. `src/lib/arucoDict.ts`:
   - Add the vertical 50.0 mm scale verification bar adjacent to the 100.0 mm horizontal bar in Section 0 of `renderFullA4PrintSheetSvg()`.
   - Update layout bounds to ensure zero element overlap or margin clipping.
2. `src/lib/pdfExport.ts`:
   - Implement `generateVectorA4Pdf()`: Builds the entire DIN A4 marker sheet using direct `jsPDF` vector primitives (`pdf.rect()`, `pdf.line()`, `pdf.text()`) mapped in millimeter units (`unit: 'mm'`).
   - Implement `downloadClinicalReportPdf()`: Generates a high-definition multi-page vector clinical prescription dossier for lab communication.
   - Retain 600 DPI fallback engine for browser preview and image-based environments.
3. `src/components/PrintableMarkersModal.tsx`:
   - Add explicit print guidelines: `"PRINT AT ACTUAL SIZE / 100%"`, `"DISABLE FIT TO PAGE"`, `"VERIFY DUAL SCALE BARS (100mm H × 50mm V)"`.
   - Update download buttons for HD Vector PDF, SVG, and 3D STL plates.
4. `src/components/ClinicalReportModal.tsx`:
   - Connect the new `downloadClinicalReportPdf` vector export button alongside existing CSV and JSON options.
5. `test/runTests.ts`:
   - Add Test Group 18: PDF vector generation, exact page geometry (210 × 297 mm), dual-axis scale verification bars presence, and marker dimension preservation.
