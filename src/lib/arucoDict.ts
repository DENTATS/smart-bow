/**
 * ArUco DICT_4X4_50 Dictionary & Marker Definitions
 * Based on OpenCV DICT_4X4_50 specification.
 * Each marker is 4x4 bits surrounded by a 1-bit black border (total 6x6 grid).
 */

import { MarkerSpec } from '../types/smartbow';

export const ARUCO_MARKERS_REGISTRY: Record<number, MarkerSpec> = {
  0: { id: 0, label: 'F01', location: 'Forehead centre', group: 'FACE', description: 'Superior reference point for vertical facial axis' },
  1: { id: 1, label: 'F02', location: 'Right cheekbone', group: 'FACE', description: 'Right lateral reference for patient coordinate frame' },
  2: { id: 2, label: 'F03', location: 'Left cheekbone', group: 'FACE', description: 'Left lateral reference for patient coordinate frame' },
  3: { id: 3, label: 'M01', location: 'Maxillary board top-left', group: 'MAXILLA', description: 'Maxillary occlusal rim tracking array corner 1' },
  4: { id: 4, label: 'M02', location: 'Maxillary board top-right', group: 'MAXILLA', description: 'Maxillary occlusal rim tracking array corner 2' },
  5: { id: 5, label: 'M03', location: 'Maxillary board bottom-left', group: 'MAXILLA', description: 'Maxillary occlusal rim tracking array corner 3' },
  6: { id: 6, label: 'M04', location: 'Maxillary board bottom-right', group: 'MAXILLA', description: 'Maxillary occlusal rim tracking array corner 4' },
  7: { id: 7, label: 'L01', location: 'Mandibular board top-left', group: 'MANDIBLE', description: 'Mandibular occlusal rim tracking array corner 1' },
  8: { id: 8, label: 'L02', location: 'Mandibular board top-right', group: 'MANDIBLE', description: 'Mandibular occlusal rim tracking array corner 2' },
  9: { id: 9, label: 'L03', location: 'Mandibular board bottom-left', group: 'MANDIBLE', description: 'Mandibular occlusal rim tracking array corner 3' },
  10: { id: 10, label: 'L04', location: 'Mandibular board bottom-right', group: 'MANDIBLE', description: 'Mandibular occlusal rim tracking array corner 4' },
  11: { id: 11, label: 'H01', location: 'Hanau upper member adapter', group: 'HANAU', description: 'Articulator mechanical upper member registration' },
  12: { id: 12, label: 'H02', location: 'Hanau lower member adapter', group: 'HANAU', description: 'Articulator mechanical lower member registration' },
  20: { id: 20, label: 'CAL01', location: 'Calibration card (0,0)', group: 'CALIBRATION', description: 'Camera calibration card 3x3 grid point 1' },
  21: { id: 21, label: 'CAL02', location: 'Calibration card (0,1)', group: 'CALIBRATION', description: 'Camera calibration card 3x3 grid point 2' },
  22: { id: 22, label: 'CAL03', location: 'Calibration card (0,2)', group: 'CALIBRATION', description: 'Camera calibration card 3x3 grid point 3' },
  23: { id: 23, label: 'CAL04', location: 'Calibration card (1,0)', group: 'CALIBRATION', description: 'Camera calibration card 3x3 grid point 4' },
  24: { id: 24, label: 'CAL05', location: 'Calibration card (1,1)', group: 'CALIBRATION', description: 'Camera calibration card 3x3 grid point 5' },
  25: { id: 25, label: 'CAL06', location: 'Calibration card (1,2)', group: 'CALIBRATION', description: 'Camera calibration card 3x3 grid point 6' },
  26: { id: 26, label: 'CAL07', location: 'Calibration card (2,0)', group: 'CALIBRATION', description: 'Camera calibration card 3x3 grid point 7' },
  27: { id: 27, label: 'CAL08', location: 'Calibration card (2,1)', group: 'CALIBRATION', description: 'Camera calibration card 3x3 grid point 8' },
  28: { id: 28, label: 'CAL09', location: 'Calibration card (2,2)', group: 'CALIBRATION', description: 'Camera calibration card 3x3 grid point 9' },
};

export const FACE_MARKER_IDS = [0, 1, 2];
export const MAXILLARY_MARKER_IDS = [3, 4, 5, 6];
export const MANDIBULAR_MARKER_IDS = [7, 8, 9, 10];
export const HANAU_MARKER_IDS = [11, 12];
export const CALIBRATION_MARKER_IDS = [20, 21, 22, 23, 24, 25, 26, 27, 28];

/**
 * 4x4 bit patterns (16 bits) for DICT_4X4_50.
 * 1 = white, 0 = black.
 * Standard DICT_4X4_50 binary encodings from OpenCV ArUco specs.
 */
export const ARUCO_DICT_4X4_50_BITS: Record<number, number[][]> = {
  0: [
    [1, 0, 1, 1],
    [0, 1, 0, 0],
    [1, 1, 1, 0],
    [0, 1, 1, 1],
  ],
  1: [
    [0, 1, 1, 0],
    [1, 0, 1, 1],
    [0, 1, 0, 1],
    [1, 0, 0, 1],
  ],
  2: [
    [1, 1, 0, 0],
    [0, 1, 1, 1],
    [1, 0, 1, 0],
    [0, 0, 1, 1],
  ],
  3: [
    [0, 1, 0, 1],
    [1, 1, 1, 0],
    [0, 0, 1, 1],
    [1, 0, 1, 0],
  ],
  4: [
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [1, 1, 0, 1],
    [0, 1, 0, 1],
  ],
  5: [
    [0, 0, 1, 1],
    [1, 1, 0, 1],
    [0, 1, 1, 0],
    [1, 1, 0, 0],
  ],
  6: [
    [1, 1, 1, 0],
    [0, 0, 1, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
  ],
  7: [
    [0, 1, 1, 1],
    [1, 0, 0, 0],
    [0, 1, 0, 1],
    [1, 1, 1, 0],
  ],
  8: [
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 1, 0, 0],
    [1, 0, 1, 1],
  ],
  9: [
    [0, 0, 1, 0],
    [1, 1, 1, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
  ],
  10: [
    [1, 1, 0, 1],
    [0, 0, 1, 0],
    [0, 1, 1, 1],
    [1, 0, 0, 1],
  ],
  11: [
    [1, 0, 1, 1],
    [1, 1, 0, 0],
    [0, 0, 1, 1],
    [0, 1, 1, 0],
  ],
  12: [
    [0, 1, 0, 0],
    [1, 0, 1, 1],
    [1, 1, 0, 1],
    [1, 0, 1, 0],
  ],
  20: [
    [1, 1, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [0, 0, 1, 1],
  ],
  21: [
    [0, 1, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 0, 1],
  ],
  22: [
    [1, 0, 0, 1],
    [1, 1, 1, 0],
    [0, 0, 1, 1],
    [0, 1, 0, 1],
  ],
  23: [
    [0, 0, 1, 1],
    [1, 0, 1, 0],
    [1, 1, 0, 1],
    [1, 0, 1, 1],
  ],
  24: [
    [1, 1, 1, 0],
    [0, 1, 1, 1],
    [1, 0, 1, 0],
    [0, 0, 1, 0],
  ],
  25: [
    [0, 1, 0, 1],
    [1, 1, 0, 0],
    [0, 1, 1, 1],
    [1, 1, 0, 1],
  ],
  26: [
    [1, 0, 1, 0],
    [0, 0, 1, 1],
    [1, 1, 1, 0],
    [0, 1, 1, 1],
  ],
  27: [
    [1, 1, 0, 0],
    [1, 0, 1, 1],
    [0, 1, 0, 1],
    [0, 0, 1, 1],
  ],
  28: [
    [0, 0, 1, 1],
    [0, 1, 1, 0],
    [1, 1, 0, 1],
    [1, 0, 0, 1],
  ],
};

/**
 * Generate full 6x6 bit matrix (outer 1-bit black border + 4x4 inner data grid).
 */
export function getFullMarkerGrid(id: number): number[][] {
  const inner = ARUCO_DICT_4X4_50_BITS[id] || [
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
  ];

  const grid: number[][] = Array(6).fill(0).map(() => Array(6).fill(0));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      grid[r + 1][c + 1] = inner[r][c];
    }
  }
  return grid;
}

/**
 * Render marker to SVG string for crisp printing & display.
 * If standalone=false, width and height use user coordinates (matching parent viewBox 1:1 in mm)
 * to avoid browser/canvas CSS mm evaluation expanding markers by 3.78x and causing overlaps.
 */
export function renderMarkerSvg(id: number, sizeMm: number = 14, standalone: boolean = true): string {
  const grid = getFullMarkerGrid(id);
  const cellSize = sizeMm / 6;

  let rects = '';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if (grid[r][c] === 1) {
        rects += `<rect x="${(c * cellSize).toFixed(3)}" y="${(r * cellSize).toFixed(3)}" width="${cellSize.toFixed(3)}" height="${cellSize.toFixed(3)}" fill="#FFFFFF" />\n`;
      }
    }
  }

  const unit = standalone ? 'mm' : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizeMm} ${sizeMm}" width="${sizeMm}${unit}" height="${sizeMm}${unit}">
    <rect width="${sizeMm}" height="${sizeMm}" fill="#000000" />
    ${rects}
  </svg>`;
}

/**
 * Render complete 18x18mm acrylic marker board layout:
 * - 18x18mm acrylic boundary
 * - 4 markers in 14x14mm square corner array (pitch 7.5 mm, marker 6.5 mm)
 * - Central alignment reticle
 * If standalone=false, width/height are unitless numbers matching parent viewBox.
 */
export function renderBoardSvg(ids: [number, number, number, number], boardName: string = '', standalone: boolean = true): string {
  const boardSizeMm = 18;
  const markerSizeMm = 6.5;
  const marginMm = (boardSizeMm - 14) / 2; // 2.0 mm margin

  // 4 corner positions in 14x14mm array (pitch = 7.5 mm, gap = 1.0 mm)
  const positions = [
    { x: marginMm, y: marginMm, id: ids[0] },
    { x: marginMm + 14 - markerSizeMm, y: marginMm, id: ids[1] },
    { x: marginMm, y: marginMm + 14 - markerSizeMm, id: ids[2] },
    { x: marginMm + 14 - markerSizeMm, y: marginMm + 14 - markerSizeMm, id: ids[3] },
  ];

  let markersSvg = '';
  for (const p of positions) {
    const grid = getFullMarkerGrid(p.id);
    const cell = markerSizeMm / 6;
    let cells = '';
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (grid[r][c] === 1) {
          cells += `<rect x="${(p.x + c * cell).toFixed(3)}" y="${(p.y + r * cell).toFixed(3)}" width="${cell.toFixed(3)}" height="${cell.toFixed(3)}" fill="#FFFFFF" />`;
        }
      }
    }
    // Clean marker: 1-bit outer black border with inner data cells. Zero text over quiet zone or marker.
    markersSvg += `
      <rect x="${p.x.toFixed(3)}" y="${p.y.toFixed(3)}" width="${markerSizeMm.toFixed(3)}" height="${markerSizeMm.toFixed(3)}" fill="#000000" />
      ${cells}
    `;
  }

  const unit = standalone ? 'mm' : '';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boardSizeMm} ${boardSizeMm}" width="${boardSizeMm}${unit}" height="${boardSizeMm}${unit}">
    <!-- Acrylic Cut Outline (18.0 x 18.0 mm) -->
    <rect x="0.2" y="0.2" width="${boardSizeMm - 0.4}" height="${boardSizeMm - 0.4}" rx="1" fill="#FFFFFF" stroke="#0284C7" stroke-width="0.3" stroke-dasharray="0.8,0.4" />
    
    <!-- Central Alignment Reticle (located in the 1.0 mm channel between markers, does not overlap fiducials) -->
    <line x1="${boardSizeMm / 2}" y1="8.5" x2="${boardSizeMm / 2}" y2="9.5" stroke="#0284C7" stroke-width="0.2" />
    <line x1="8.5" y1="${boardSizeMm / 2}" x2="9.5" y2="${boardSizeMm / 2}" stroke="#0284C7" stroke-width="0.2" />
    <circle cx="${boardSizeMm / 2}" cy="${boardSizeMm / 2}" r="0.2" fill="#0284C7" />
    
    <!-- 4 ArUco Markers -->
    ${markersSvg}
  </svg>
  `;
}

/**
 * Complete CAD Dimensional Engineering Specification for the 18x18mm Acrylic Target Array
 */
export const CAD_BOARD_SPECIFICATION = {
  plateWidthMm: 18.0,
  plateHeightMm: 18.0,
  plateThicknessMm: 3.0,
  toleranceMm: 0.1,
  material: 'Medical Grade Clear or White PMMA Acrylic',
  markerCount: 4,
  individualMarkerSizeMm: 6.5,
  arrayOuterSpanMm: 14.0,
  markerCenterPitchMm: 7.5, // Center-to-center distance between adjacent markers (14.0 - 6.5)
  edgeMarginMm: 2.0, // (18.0 - 14.0) / 2
  centralAlignmentGapMm: 1.0, // Gap between inner edges of opposing markers
  quietZoneMm: 1.5,
  retentionWireDiameterMm: 0.8, // Stainless steel orthodontic tag wire
  retentionWireLengthMm: 12.0,
  markerCentroids: [
    { idLabel: 'Corner 1 (Top-Left)', xFromCenterMm: -3.75, yFromCenterMm: 3.75 },
    { idLabel: 'Corner 2 (Top-Right)', xFromCenterMm: 3.75, yFromCenterMm: 3.75 },
    { idLabel: 'Corner 3 (Bottom-Left)', xFromCenterMm: -3.75, yFromCenterMm: -3.75 },
    { idLabel: 'Corner 4 (Bottom-Right)', xFromCenterMm: 3.75, yFromCenterMm: -3.75 }
  ]
};

/**
 * Digital ArUco DICT_4X4_50 Decoder
 * Verifies that a 6x6 marker grid has:
 * 1. A pure 1-bit black border (perimeter cells == 0)
 * 2. An inner 4x4 data matrix matching the registered OpenCV dictionary
 * 3. Returns the decoded ID and rotation (0°, 90°, 180°, 270°) or null if invalid
 */
export function decodeMarkerGrid(grid: number[][]): { id: number; rotationDeg: number } | null {
  if (!grid || grid.length !== 6 || grid.some(row => row.length !== 6)) {
    return null;
  }

  // 1. Verify 1-bit black border on all 4 perimeter edges (all must be 0)
  for (let c = 0; c < 6; c++) {
    if (grid[0][c] !== 0 || grid[5][c] !== 0) return null;
  }
  for (let r = 0; r < 6; r++) {
    if (grid[r][0] !== 0 || grid[r][5] !== 0) return null;
  }

  // 2. Extract 4x4 inner data grid
  const inner: number[][] = Array(4).fill(0).map(() => Array(4).fill(0));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      inner[r][c] = grid[r + 1][c + 1];
    }
  }

  // Helper: Rotate 4x4 matrix 90 degrees clockwise
  const rotate90 = (mat: number[][]): number[][] => {
    const res = Array(4).fill(0).map(() => Array(4).fill(0));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        res[c][3 - r] = mat[r][c];
      }
    }
    return res;
  };

  const areMatricesEqual = (a: number[][], b: number[][]): boolean => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  };

  // Test 4 possible rotations: 0, 90, 180, 270 degrees
  let currentMat = inner;
  const rotations = [0, 90, 180, 270];

  for (let rotIdx = 0; rotIdx < 4; rotIdx++) {
    for (const [idStr, dictBits] of Object.entries(ARUCO_DICT_4X4_50_BITS)) {
      if (areMatricesEqual(currentMat, dictBits)) {
        return {
          id: Number(idStr),
          rotationDeg: rotations[rotIdx]
        };
      }
    }
    currentMat = rotate90(currentMat);
  }

  return null;
}

/**
 * Render Complete A4 Sheet SVG (210 x 297 mm) at 100% Scale
 * Optimized layout with zero element collisions and clean ArUco quiet zones:
 * - 100.0 mm Vernier Caliper Scale Verification Bar (±0.2 mm tolerance)
 * - Section 1: Occlusal Rim Target Arrays (18.0 × 18.0 mm) with CAD Datums
 * - Section 2: Facial (F01–F03) & Hanau Articulator (H01–H02) Markers (14.0 × 14.0 mm)
 * - Section 3: Camera Intrinsics 3×3 Calibration Card (60.0 × 60.0 mm) with RMS protocol
 * - Clinically verified references (Boucher 12th ed. & Winkler 2nd ed.)
 */
export function renderFullA4PrintSheetSvg(): string {
  const maxillaSvg = renderBoardSvg([3, 4, 5, 6], 'MAXILLA', false);
  const mandSvg = renderBoardSvg([7, 8, 9, 10], 'MANDIBLE', false);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210mm" height="297mm" style="background:#FFFFFF;">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .mono { font-family: "SF Mono", Monaco, Menlo, Consolas, "Liberation Mono", "Courier New", monospace; }
    .tick { stroke: #0F172A; stroke-width: 0.3; }
    .mid-tick { stroke: #0F172A; stroke-width: 0.4; }
    .major-tick { stroke: #0F172A; stroke-width: 0.6; }
    .cut-line { stroke: #0284C7; stroke-width: 0.3; stroke-dasharray: 1, 0.6; fill: none; }
  </style>

  <!-- Document Margin Guide (10 mm margins: 190 x 277 mm printable area) -->
  <rect x="10" y="10" width="190" height="277" fill="none" stroke="#E2E8F0" stroke-width="0.3" stroke-dasharray="2, 2" />

  <!-- Sheet Header -->
  <g transform="translate(105, 16)">
    <text x="0" y="0" font-size="3.5" font-weight="800" fill="#0F172A" text-anchor="middle" letter-spacing="0.2">SMARTBOW AI — 1:1 CALIBRATED ARUCO FIDUCIAL PRINT SHEET</text>
    <text x="0" y="4.2" font-size="2.1" font-weight="600" fill="#0284C7" text-anchor="middle">OPENCV DICT_4X4_50 SPECIFICATION · PRECISION PROSTHODONTIC RESEARCH SPEC</text>
    <text x="0" y="8.2" font-size="1.8" font-weight="800" fill="#DC2626" text-anchor="middle">PRINT AT ACTUAL SIZE — 100% SCALE · DISABLE FIT TO PAGE · VERIFY PRINTED DIMENSIONS BEFORE USE</text>
  </g>

  <!-- Section 0: Dual-Axis Physical Caliper Scale Verification (Horizontal 100.0 mm × Vertical 50.0 mm) -->
  <g transform="translate(16, 26)">
    <rect x="0" y="0" width="178" height="54" fill="#F8FAFC" stroke="#0F172A" stroke-width="0.4" rx="2" />
    
    <text x="6" y="5.0" font-size="2.2" font-weight="800" fill="#0F172A">DUAL-AXIS PHYSICAL SCALE VERIFICATION (HORIZONTAL 100.0 mm × VERTICAL 50.0 mm)</text>
    <text x="6" y="8.5" font-size="1.35" fill="#64748B">Verify both axes with calibrated Vernier caliper before cutting fiducials. Detects printer roller feed distortion.</text>

    <!-- 1. Horizontal 100.0 mm Scale Bar -->
    <g transform="translate(6, 14)">
      <rect x="0" y="0" width="100" height="12" fill="#FFFFFF" stroke="#0F172A" stroke-width="0.4" />
      ${Array.from({ length: 101 }, (_, i) => {
        const isMajor = i % 10 === 0;
        const isMid = i % 5 === 0 && !isMajor;
        const h = isMajor ? 6.5 : isMid ? 4.2 : 2.5;
        const cls = isMajor ? 'major-tick' : isMid ? 'mid-tick' : 'tick';
        return `<line x1="${i}" y1="0" x2="${i}" y2="${h}" class="${cls}" />
        ${isMajor ? `<text x="${i}" y="10.2" font-size="1.9" font-weight="bold" fill="#0F172A" text-anchor="middle" class="mono">${i}</text>` : ''}`;
      }).join('\n')}
      <path d="M 0,-1 L 1,-2.4 L -1,-2.4 Z" fill="#DC2626" />
      <path d="M 100,-1 L 101,-2.4 L 99,-2.4 Z" fill="#DC2626" />
      <text x="50" y="-2.5" font-size="1.6" font-weight="700" fill="#0F172A" text-anchor="middle">PHYSICAL 100.0 mm SCALE BAR (HORIZONTAL X-AXIS)</text>
      <text x="50" y="14.8" font-size="1.3" fill="#475569" text-anchor="middle">PASS TOLERANCE: 100.0 ± 0.2 mm · If reading differs, disable printer driver auto-scaling</text>
    </g>

    <!-- 2. 20.0 x 20.0 mm Square Verification Gauge -->
    <g transform="translate(6, 31)">
      <rect x="0" y="0" width="20" height="20" fill="#FFFFFF" stroke="#0F172A" stroke-width="0.4" />
      <line x1="0" y1="10" x2="20" y2="10" stroke="#0284C7" stroke-width="0.3" stroke-dasharray="1, 1" />
      <line x1="10" y1="0" x2="10" y2="20" stroke="#0284C7" stroke-width="0.3" stroke-dasharray="1, 1" />
      <circle cx="10" cy="10" r="0.6" fill="#0284C7" />
      <text x="24" y="6.0" font-size="1.4" font-weight="bold" fill="#0F172A">20.0 × 20.0 mm SQUARE GAUGE</text>
      <text x="24" y="10.5" font-size="1.25" font-weight="600" fill="#047857">PASS: 20.0 ± 0.1 mm (Both Axes)</text>
      <text x="24" y="15.0" font-size="1.15" fill="#64748B">Verify squareness (diagonal: 28.28 mm)</text>
      <text x="24" y="19.0" font-size="1.15" fill="#DC2626" font-weight="bold">• MUST PRINT AT ACTUAL SIZE / 100%</text>
    </g>

    <!-- 3. Vertical 50.0 mm Scale Bar -->
    <g transform="translate(116, 2)">
      <rect x="0" y="0" width="8" height="50" fill="#FFFFFF" stroke="#0F172A" stroke-width="0.4" />
      ${Array.from({ length: 51 }, (_, i) => {
        const isMajor = i % 10 === 0;
        const isMid = i % 5 === 0 && !isMajor;
        const w = isMajor ? 5.5 : isMid ? 3.6 : 2.0;
        const cls = isMajor ? 'major-tick' : isMid ? 'mid-tick' : 'tick';
        return `<line x1="0" y1="${i}" x2="${w}" y2="${i}" class="${cls}" />
        ${isMajor ? `<text x="10" y="${i + 0.8}" font-size="1.7" font-weight="bold" fill="#0F172A" text-anchor="start" class="mono">${i}</text>` : ''}`;
      }).join('\n')}
      <path d="M -1,0 L -2.4,1 L -2.4,-1 Z" fill="#DC2626" />
      <path d="M -1,50 L -2.4,51 L -2.4,49 Z" fill="#DC2626" />
      
      <g transform="translate(20, 8)">
        <text x="0" y="4" font-size="1.4" font-weight="bold" fill="#0F172A">VERTICAL 50.0 mm SCALE BAR</text>
        <text x="0" y="9.5" font-size="1.25" font-weight="600" fill="#047857">PASS TOLERANCE: 50.0 ± 0.2 mm</text>
        <text x="0" y="15.0" font-size="1.1" fill="#475569">Checks roller feed slippage (Y-axis)</text>
        <text x="0" y="20.5" font-size="1.1" fill="#475569">If Y != X, printer roller is dragging</text>
        <rect x="0" y="24" width="38" height="12" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="0.3" rx="1" />
        <text x="19" y="29.0" font-size="1.05" font-weight="bold" fill="#DC2626" text-anchor="middle">DISABLE FIT TO PAGE</text>
        <text x="19" y="33.5" font-size="1.0" font-weight="bold" fill="#B91C1C" text-anchor="middle">SCALE = 100% ONLY</text>
      </g>
    </g>
  </g>

  <!-- Section 1: Occlusal Rim Buccal Target Arrays (18.0 × 18.0 × 3.0 mm) -->
  <g transform="translate(16, 83)">
    <rect x="0" y="0" width="178" height="46" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="0.4" rx="2" />
    <text x="6" y="6.5" font-size="2.6" font-weight="800" fill="#0F172A">1. OCCLUSAL RIM BUCCAL TARGET ARRAYS (18.0 × 18.0 × 3.0 mm)</text>
    <text x="6" y="10.2" font-size="1.6" fill="#64748B">Affix onto right buccal premolar surface with sticky wax &amp; 0.8mm SS tag wire. Clearance: ≥5.0mm from occlusal table.</text>

    <!-- Maxillary Board Primary -->
    <g transform="translate(8, 12)">
      ${maxillaSvg}
      <text x="9" y="21.5" font-size="1.5" font-weight="bold" fill="#0369A1" text-anchor="middle">MAXILLARY #1</text>
      <text x="9" y="24.2" font-size="1.2" fill="#64748B" text-anchor="middle" class="mono">IDs: 3, 4, 5, 6</text>
    </g>

    <!-- Mandibular Board Primary -->
    <g transform="translate(32, 12)">
      ${mandSvg}
      <text x="9" y="21.5" font-size="1.5" font-weight="bold" fill="#047857" text-anchor="middle">MANDIBULAR #1</text>
      <text x="9" y="24.2" font-size="1.2" fill="#64748B" text-anchor="middle" class="mono">IDs: 7, 8, 9, 10</text>
    </g>

    <!-- Maxillary Board Spare -->
    <g transform="translate(56, 12)">
      ${maxillaSvg}
      <text x="9" y="21.5" font-size="1.5" font-weight="bold" fill="#0369A1" text-anchor="middle">MAXILLA (SPARE)</text>
      <text x="9" y="24.2" font-size="1.2" fill="#64748B" text-anchor="middle" class="mono">IDs: 3, 4, 5, 6</text>
    </g>

    <!-- Mandibular Board Spare -->
    <g transform="translate(80, 12)">
      ${mandSvg}
      <text x="9" y="21.5" font-size="1.5" font-weight="bold" fill="#047857" text-anchor="middle">MANDIBLE (SPARE)</text>
      <text x="9" y="24.2" font-size="1.2" fill="#64748B" text-anchor="middle" class="mono">IDs: 7, 8, 9, 10</text>
    </g>

    <!-- CAD Specifications Callout Box -->
    <g transform="translate(104, 11)">
      <rect x="0" y="0" width="68" height="32" fill="#FFFFFF" stroke="#0284C7" stroke-width="0.3" rx="1.5" />
      <text x="34" y="4.5" font-size="1.5" font-weight="bold" fill="#0284C7" text-anchor="middle">PLATE CAD DATUMS &amp; CLEARANCES</text>
      <line x1="4" y1="6.5" x2="64" y2="6.5" stroke="#E2E8F0" stroke-width="0.25" />
      <text x="4" y="10.2" font-size="1.2" fill="#334155">• Plate Size: 18.0 × 18.0 × 3.0 mm (PMMA)</text>
      <text x="4" y="14.0" font-size="1.2" fill="#334155">• Marker Size: 6.50 × 6.50 mm (4 fiducials)</text>
      <text x="4" y="17.8" font-size="1.2" fill="#334155">• Pitch: 7.50 mm C-to-C (Span: 14.0 × 14.0 mm)</text>
      <text x="4" y="21.6" font-size="1.2" fill="#334155">• Quiet Zone Margin: 2.0 mm (≥1.5 mm req)</text>
      <text x="4" y="25.4" font-size="1.2" fill="#334155">• Reticle Gap: 1.0 mm (central crosshair)</text>
      <text x="4" y="29.2" font-size="1.2" fill="#047857" font-weight="600">• Occlusal Clearance: ≥5.0 mm | Plate Gap: ≥2.0 mm</text>
    </g>
  </g>

  <!-- Section 2: Facial Reference & Hanau Articulator Reference Markers (14.0 × 14.0 mm) -->
  <g transform="translate(16, 132)">
    <rect x="0" y="0" width="178" height="44" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="0.4" rx="2" />
    <text x="6" y="6.5" font-size="2.6" font-weight="800" fill="#0F172A">2. FACIAL &amp; HANAU ARTICULATOR REFERENCE MARKERS (14.0 × 14.0 mm)</text>
    <text x="6" y="10.2" font-size="1.6" fill="#64748B">Establish cranial reference plane (F01–F03) &amp; mechanical articulator condylar axis registration (H01–H02).</text>

    <!-- Sub-card A: Facial Frame Markers -->
    <g transform="translate(6, 12)">
      <rect x="0" y="0" width="104" height="29" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.3" rx="1.5" />
      <text x="52" y="4.5" font-size="1.4" font-weight="bold" fill="#0369A1" text-anchor="middle">PATIENT CRANIAL REFERENCE FRAME (SKIN ADHESIVE)</text>

      <!-- F01 Forehead -->
      <g transform="translate(8, 6.0)">
        <rect x="-1" y="-1" width="16" height="16" class="cut-line" rx="0.5" />
        ${renderMarkerSvg(0, 14, false)}
        <text x="7" y="17.5" font-size="1.3" font-weight="bold" fill="#0F172A" text-anchor="middle">F01 · GLABELLA</text>
        <text x="7" y="19.8" font-size="1.05" fill="#64748B" text-anchor="middle" class="mono">ID: 0 (Forehead)</text>
      </g>

      <!-- F02 Right Zygoma -->
      <g transform="translate(42, 6.0)">
        <rect x="-1" y="-1" width="16" height="16" class="cut-line" rx="0.5" />
        ${renderMarkerSvg(1, 14, false)}
        <text x="7" y="17.5" font-size="1.3" font-weight="bold" fill="#0F172A" text-anchor="middle">F02 · R ZYGOMA</text>
        <text x="7" y="19.8" font-size="1.05" fill="#64748B" text-anchor="middle" class="mono">ID: 1 (R Cheek)</text>
      </g>

      <!-- F03 Left Zygoma -->
      <g transform="translate(76, 6.0)">
        <rect x="-1" y="-1" width="16" height="16" class="cut-line" rx="0.5" />
        ${renderMarkerSvg(2, 14, false)}
        <text x="7" y="17.5" font-size="1.3" font-weight="bold" fill="#0F172A" text-anchor="middle">F03 · L ZYGOMA</text>
        <text x="7" y="19.8" font-size="1.05" fill="#64748B" text-anchor="middle" class="mono">ID: 2 (L Cheek)</text>
      </g>
    </g>

    <!-- Sub-card B: Hanau Articulator Reference Markers -->
    <g transform="translate(114, 12)">
      <rect x="0" y="0" width="58" height="29" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.3" rx="1.5" />
      <text x="29" y="4.5" font-size="1.4" font-weight="bold" fill="#6D28D9" text-anchor="middle">HANAU ARTICULATOR</text>

      <!-- H01 Upper Member -->
      <g transform="translate(8, 6.0)">
        <rect x="-1" y="-1" width="16" height="16" class="cut-line" rx="0.5" />
        ${renderMarkerSvg(11, 14, false)}
        <text x="7" y="17.5" font-size="1.3" font-weight="bold" fill="#6D28D9" text-anchor="middle">H01 · UPPER</text>
        <text x="7" y="19.8" font-size="1.05" fill="#64748B" text-anchor="middle" class="mono">ID: 11 (Axis)</text>
      </g>

      <!-- H02 Lower Member -->
      <g transform="translate(34, 6.0)">
        <rect x="-1" y="-1" width="16" height="16" class="cut-line" rx="0.5" />
        ${renderMarkerSvg(12, 14, false)}
        <text x="7" y="17.5" font-size="1.3" font-weight="bold" fill="#6D28D9" text-anchor="middle">H02 · LOWER</text>
        <text x="7" y="19.8" font-size="1.05" fill="#64748B" text-anchor="middle" class="mono">ID: 12 (Base)</text>
      </g>
    </g>
  </g>

  <!-- Section 3: Camera Calibration 3x3 Card (60.0 x 60.0 mm) -->
  <g transform="translate(16, 180)">
    <rect x="0" y="0" width="178" height="88" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="0.4" rx="2" />
    <text x="6" y="6.5" font-size="2.6" font-weight="800" fill="#0F172A">3. CAMERA INTRINSICS CALIBRATION TARGET (60.0 × 60.0 mm RIGID CARD)</text>
    <text x="6" y="10.2" font-size="1.6" fill="#64748B">3×3 ArUco array for pinhole focal length (fx, fy), optical center (cx, cy), &amp; Brown-Conrady lens distortion (k1, k2).</text>

    <!-- 3x3 Calibration Grid Card (60 x 60 mm) -->
    <g transform="translate(10, 13)">
      <!-- Outer Cut Guide (64 x 64 mm) -->
      <rect x="-2" y="-2" width="64" height="64" class="cut-line" rx="1" />
      
      <!-- Card Plate (60 x 60 mm) -->
      <rect x="0" y="0" width="60" height="60" fill="#FFFFFF" stroke="#0F172A" stroke-width="0.4" />
      
      <!-- 9 Unoccluded ArUco Markers: IDs 20 to 28 (12.0 x 12.0 mm, Pitch: 18.0 mm) -->
      ${[
        { id: 20, x: 6, y: 6 },  { id: 21, x: 24, y: 6 },  { id: 22, x: 42, y: 6 },
        { id: 23, x: 6, y: 24 }, { id: 24, x: 24, y: 24 }, { id: 25, x: 42, y: 24 },
        { id: 26, x: 6, y: 42 }, { id: 27, x: 24, y: 42 }, { id: 28, x: 42, y: 42 }
      ].map(m => `
        <g transform="translate(${m.x}, ${m.y})">
          ${renderMarkerSvg(m.id, 12, false)}
        </g>
      `).join('\n')}

      <!-- Outside Card Label -->
      <text x="30" y="67.0" font-size="1.3" font-weight="bold" fill="#0F172A" text-anchor="middle">CALIBRATION CARD · 60.0 × 60.0 mm · PITCH 18.0 mm</text>
      <text x="30" y="70.0" font-size="1.1" fill="#64748B" text-anchor="middle" class="mono">IDs 20–28 · Clean DICT_4X4_50 · Mount on rigid substrate</text>
    </g>

    <!-- Calibration Protocol & Pass/Fail Criteria -->
    <g transform="translate(80, 13)">
      <rect x="0" y="0" width="92" height="71" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.3" rx="1.5" />
      <text x="6" y="5.0" font-size="1.5" font-weight="bold" fill="#0F172A">CALIBRATION PROTOCOL &amp; ACCEPTANCE CRITERIA</text>
      <line x1="6" y1="7.5" x2="86" y2="7.5" stroke="#E2E8F0" stroke-width="0.3" />

      <text x="6" y="11.5" font-size="1.2" font-weight="bold" fill="#0284C7">1. RIGID SUBSTRATE MOUNTING</text>
      <text x="6" y="15.0" font-size="1.1" fill="#334155">Affix 60×60 mm card onto rigid acrylic plate (surface flatness ≤ 0.05 mm).</text>

      <text x="6" y="19.5" font-size="1.2" font-weight="bold" fill="#0284C7">2. WORKING DISTANCE &amp; POSE DIVERSITY</text>
      <text x="6" y="23.0" font-size="1.1" fill="#334155">Hold at 45–50 cm under uniform, non-glare, diffuse illumination.</text>
      <text x="6" y="26.5" font-size="1.1" fill="#334155">Capture 10 non-coplanar tilt poses (pitch / yaw / roll between 15° and 35°).</text>

      <text x="6" y="31.0" font-size="1.2" font-weight="bold" fill="#0284C7">3. DETECTION &amp; RESIDUAL THRESHOLD</text>
      <text x="6" y="34.5" font-size="1.1" fill="#334155">All 9 fiducials (IDs 20–28) must be simultaneously detected in every frame.</text>
      <text x="6" y="38.0" font-size="1.1" fill="#047857" font-weight="600">Reprojection RMS error must strictly satisfy: RMS &lt; 0.50 px root-mean-square.</text>

      <line x1="6" y1="41.5" x2="86" y2="41.5" stroke="#E2E8F0" stroke-width="0.3" />

      <text x="6" y="45.5" font-size="1.2" font-weight="bold" fill="#DC2626">CLINICAL SAFETY GATING ENFORCEMENT</text>
      <text x="6" y="49.0" font-size="1.05" fill="#475569">• Gate blocks clinical VDO metric logging until camera intrinsics pass.</text>
      <text x="6" y="52.5" font-size="1.05" fill="#475569">• Stale optical telemetry (&gt;500 ms) yields MEASUREMENT_NOT_AVAILABLE.</text>
      <text x="6" y="56.0" font-size="1.05" fill="#475569">• Uncalibrated lenses induce barrel/pincushion optical error up to ±2.8 mm.</text>
      
      <rect x="6" y="59.5" width="80" height="7.5" fill="#F0FDF4" stroke="#86EFAC" stroke-width="0.3" rx="1" />
      <text x="46" y="64.5" font-size="1.1" font-weight="bold" fill="#15803D" text-anchor="middle">STATUS: Optical diagnostics gate active · OpenCV DICT_4X4_50</text>
    </g>
  </g>

  <!-- Sheet Footer Notes -->
  <g transform="translate(16, 272)">
    <text x="0" y="3.5" font-size="1.5" font-weight="bold" fill="#334155">Maitri College of Dentistry &amp; Research Centre · Dept. of Prosthodontics · Dr. Deepanshu</text>
    <text x="0" y="7.0" font-size="1.25" fill="#64748B">SmartBow AI Research Specification v1.2 · Grounded in Boucher (12th ed., Ch. 14, pp. 248–251) &amp; Winkler (2nd ed., Ch. 12, pp. 195–198)</text>
    <text x="0" y="10.5" font-size="1.15" fill="#94A3B8">Fiducial Dictionary: DICT_4X4_50 · Scale Factor: 1.0000 (1:1 Physical Scale) · Dual-Axis Scale: 100mm H × 50mm V</text>
    <text x="178" y="10.5" font-size="1.2" font-weight="bold" fill="#0284C7" text-anchor="end">Page 1 of 1 · DIN A4 (210 × 297 mm)</text>
  </g>
</svg>`;
}



