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
 */
export function renderMarkerSvg(id: number, sizeMm: number = 14): string {
  const grid = getFullMarkerGrid(id);
  const cellSize = sizeMm / 6;

  let rects = '';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const isWhite = grid[r][c] === 1;
      const fill = isWhite ? '#FFFFFF' : '#000000';
      rects += `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${fill}" />\n`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizeMm} ${sizeMm}" width="${sizeMm}mm" height="${sizeMm}mm">
    <rect width="${sizeMm}" height="${sizeMm}" fill="#000000" />
    ${rects}
  </svg>`;
}

/**
 * Render complete 18x18mm acrylic marker board layout:
 * - 18x18mm acrylic boundary
 * - 4 markers in 14x14mm square corner array
 * - Crosshair alignment & label
 */
export function renderBoardSvg(ids: [number, number, number, number], boardName: string): string {
  const boardSizeMm = 18;
  const markerSizeMm = 6.5;
  const marginMm = (boardSizeMm - 14) / 2; // 2mm margin

  // 4 corner positions in 14x14mm array
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
          cells += `<rect x="${(p.x + c * cell).toFixed(2)}" y="${(p.y + r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#FFFFFF" />`;
        }
      }
    }
    markersSvg += `
      <rect x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" width="${markerSizeMm}" height="${markerSizeMm}" fill="#000000" />
      ${cells}
      <text x="${(p.x + markerSizeMm / 2).toFixed(2)}" y="${(p.y + markerSizeMm + 1.2).toFixed(2)}" font-size="1" fill="#000" text-anchor="middle" font-family="monospace">#${p.id}</text>
    `;
  }

  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boardSizeMm} ${boardSizeMm}" width="${boardSizeMm}mm" height="${boardSizeMm}mm">
    <!-- Acrylic Outline -->
    <rect x="0.2" y="0.2" width="${boardSizeMm - 0.4}" height="${boardSizeMm - 0.4}" rx="1" fill="#FFFFFF" stroke="#0284C7" stroke-width="0.3" stroke-dasharray="0.8,0.4" />
    
    <!-- Center Alignment Crosshair -->
    <line x1="${boardSizeMm / 2}" y1="1" x2="${boardSizeMm / 2}" y2="${boardSizeMm - 1}" stroke="#CBD5E1" stroke-width="0.2" />
    <line x1="1" y1="${boardSizeMm / 2}" x2="${boardSizeMm - 1}" y2="${boardSizeMm / 2}" stroke="#CBD5E1" stroke-width="0.2" />
    <circle cx="${boardSizeMm / 2}" cy="${boardSizeMm / 2}" r="1" fill="none" stroke="#CBD5E1" stroke-width="0.2" />
    
    <!-- Title Label -->
    <text x="${boardSizeMm / 2}" y="${boardSizeMm / 2 + 0.35}" font-size="1.2" font-weight="bold" fill="#0369A1" text-anchor="middle" font-family="sans-serif">${boardName}</text>
    <text x="${boardSizeMm / 2}" y="${boardSizeMm / 2 + 1.8}" font-size="0.8" fill="#64748B" text-anchor="middle" font-family="sans-serif">18×18mm</text>
    
    <!-- Markers -->
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
 * Includes:
 * - 100mm Certified Calibration Scale Bar
 * - Maxillary & Mandibular 18x18mm Arrays
 * - Facial Reference Markers (F01-F03)
 * - Articulator Reference Markers (H01-H02)
 * - 3x3 Calibration Grid Card (CAL01-CAL09)
 * - Printable cutting guides & quiet zones
 */
export function renderFullA4PrintSheetSvg(): string {
  const maxillaSvg = renderBoardSvg([3, 4, 5, 6], 'MAXILLA');
  const mandSvg = renderBoardSvg([7, 8, 9, 10], 'MANDIBLE');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210mm" height="297mm" style="background:#FFFFFF;">
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif; }
    .dim-line { stroke: #0284C7; stroke-width: 0.25; stroke-dasharray: 0.8, 0.4; }
    .tick { stroke: #000000; stroke-width: 0.35; }
    .major-tick { stroke: #000000; stroke-width: 0.5; }
  </style>

  <!-- Document Boundary / 10mm Margin Guide -->
  <rect x="10" y="10" width="190" height="277" fill="none" stroke="#E2E8F0" stroke-width="0.3" stroke-dasharray="2, 2" />

  <!-- Sheet Header -->
  <text x="105" y="20" font-size="3.8" font-weight="bold" fill="#0F172A" text-anchor="middle">SMARTBOW AI — 1:1 CALIBRATED ARUCO FIDUCIAL PRINT SHEET</text>
  <text x="105" y="25" font-size="2.4" font-weight="600" fill="#0369A1" text-anchor="middle">OPENCV DICT_4X4_50 SPECIFICATION · PRECISION RESEARCH PRINT SPEC</text>
  <text x="105" y="29.5" font-size="2.0" fill="#DC2626" font-weight="bold" text-anchor="middle">MANDATORY: PRINT AT 100% SCALE (ACTUAL SIZE) · DO NOT FIT TO PAGE</text>

  <!-- Physical 100mm Vernier Caliper Scale Verification Bar -->
  <g transform="translate(55, 36)">
    <rect x="0" y="0" width="100" height="14" fill="#F8FAFC" stroke="#0F172A" stroke-width="0.5" />
    <!-- 100mm Scale Rule Ticks -->
    ${Array.from({ length: 101 }, (_, i) => {
      const isMajor = i % 10 === 0;
      const isMid = i % 5 === 0 && !isMajor;
      const h = isMajor ? 8 : isMid ? 5 : 3;
      return `<line x1="${i}" y1="0" x2="${i}" y2="${h}" class="${isMajor ? 'major-tick' : 'tick'}" />
      ${isMajor ? `<text x="${i}" y="12" font-size="2.2" font-weight="bold" text-anchor="middle">${i}</text>` : ''}`;
    }).join('\n')}
    <text x="50" y="-2" font-size="2.0" font-weight="bold" fill="#0F172A" text-anchor="middle">PHYSICAL 100.0 mm SCALE BAR — VERIFY WITH VERNIER CALIPER BEFORE CUTTING</text>
    <text x="50" y="17.5" font-size="1.8" fill="#475569" text-anchor="middle">PASS: Reads 100.0 ± 0.5 mm | FAIL: Scale distorted by printer driver margins</text>
  </g>

  <!-- Section 1: Occlusal Rim Acrylic Target Arrays (18x18mm) -->
  <g transform="translate(18, 62)">
    <rect x="0" y="0" width="174" height="42" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="0.4" rx="2" />
    <text x="6" y="7" font-size="2.8" font-weight="bold" fill="#0F172A">1. OCCLUSAL RIM BUCCAL TARGET ARRAYS (18.0 × 18.0 × 3.0 mm)</text>
    <text x="6" y="11.5" font-size="1.8" fill="#64748B">Affix onto right buccal premolar surface with sticky wax &amp; 0.8mm wire tag. Clearance: ≥5mm from occlusal table.</text>

    <!-- Maxillary Board -->
    <g transform="translate(16, 16)">
      ${maxillaSvg}
      <text x="9" y="21.5" font-size="1.6" fill="#0369A1" font-weight="bold" text-anchor="middle">MAXILLARY RIM</text>
      <text x="9" y="23.5" font-size="1.3" fill="#64748B" text-anchor="middle">IDs: 3, 4, 5, 6</text>
    </g>

    <!-- Mandibular Board -->
    <g transform="translate(48, 16)">
      ${mandSvg}
      <text x="9" y="21.5" font-size="1.6" fill="#047857" font-weight="bold" text-anchor="middle">MANDIBULAR RIM</text>
      <text x="9" y="23.5" font-size="1.3" fill="#64748B" text-anchor="middle">IDs: 7, 8, 9, 10</text>
    </g>

    <!-- Spare Maxillary Board -->
    <g transform="translate(80, 16)">
      ${maxillaSvg}
      <text x="9" y="21.5" font-size="1.6" fill="#0369A1" text-anchor="middle">SPARE MAXILLA</text>
    </g>

    <!-- Spare Mandibular Board -->
    <g transform="translate(112, 16)">
      ${mandSvg}
      <text x="9" y="21.5" font-size="1.6" fill="#047857" text-anchor="middle">SPARE MANDIBLE</text>
    </g>

    <!-- CAD Specifications Callout -->
    <g transform="translate(136, 16)">
      <rect x="0" y="0" width="32" height="22" fill="#FFFFFF" stroke="#0284C7" stroke-width="0.3" rx="1" />
      <text x="16" y="3.5" font-size="1.6" font-weight="bold" fill="#0284C7" text-anchor="middle">PLATE CAD DATUMS</text>
      <text x="3" y="7.5" font-size="1.3" fill="#334155">• Plate: 18.0 × 18.0 mm</text>
      <text x="3" y="11.0" font-size="1.3" fill="#334155">• Marker: 6.5 × 6.5 mm</text>
      <text x="3" y="14.5" font-size="1.3" fill="#334155">• Pitch: 7.50 mm C-to-C</text>
      <text x="3" y="18.0" font-size="1.3" fill="#334155">• Span: 14.0 × 14.0 mm</text>
    </g>
  </g>

  <!-- Section 2: Facial Reference Markers (F01, F02, F03 — 14.0 x 14.0 mm) -->
  <g transform="translate(18, 110)">
    <rect x="0" y="0" width="174" height="42" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="0.4" rx="2" />
    <text x="6" y="7" font-size="2.8" font-weight="bold" fill="#0F172A">2. FACIAL REFERENCE MARKERS (14.0 × 14.0 mm ON ADHESIVE BACKING)</text>
    <text x="6" y="11.5" font-size="1.8" fill="#64748B">Establish patient cranial coordinate frame. Affix to skin with hypoallergenic adhesive dots.</text>

    <!-- F01 Forehead -->
    <g transform="translate(16, 16)">
      ${renderMarkerSvg(0, 14)}
      <text x="7" y="17.5" font-size="1.6" font-weight="bold" fill="#0F172A" text-anchor="middle">F01 · GLABELLA</text>
      <text x="7" y="19.8" font-size="1.3" fill="#64748B" text-anchor="middle">ID: 0 (Forehead Midline)</text>
    </g>

    <!-- F02 Right Zygoma -->
    <g transform="translate(46, 16)">
      ${renderMarkerSvg(1, 14)}
      <text x="7" y="17.5" font-size="1.6" font-weight="bold" fill="#0F172A" text-anchor="middle">F02 · RIGHT ZYGOMA</text>
      <text x="7" y="19.8" font-size="1.3" fill="#64748B" text-anchor="middle">ID: 1 (Cheekbone Prominence)</text>
    </g>

    <!-- F03 Left Zygoma -->
    <g transform="translate(76, 16)">
      ${renderMarkerSvg(2, 14)}
      <text x="7" y="17.5" font-size="1.6" font-weight="bold" fill="#0F172A" text-anchor="middle">F03 · LEFT ZYGOMA</text>
      <text x="7" y="19.8" font-size="1.3" fill="#64748B" text-anchor="middle">ID: 2 (Cheekbone Prominence)</text>
    </g>

    <!-- Section 3: Hanau Articulator Adapter Markers (H01, H02 — 14.0 x 14.0 mm) -->
    <!-- H01 Upper Member -->
    <g transform="translate(112, 16)">
      ${renderMarkerSvg(11, 14)}
      <text x="7" y="17.5" font-size="1.6" font-weight="bold" fill="#6D28D9" text-anchor="middle">H01 · HANAU UPPER</text>
      <text x="7" y="19.8" font-size="1.3" fill="#64748B" text-anchor="middle">ID: 11 (Upper Condylar Axis)</text>
    </g>

    <!-- H02 Lower Member -->
    <g transform="translate(142, 16)">
      ${renderMarkerSvg(12, 14)}
      <text x="7" y="17.5" font-size="1.6" font-weight="bold" fill="#6D28D9" text-anchor="middle">H02 · HANAU LOWER</text>
      <text x="7" y="19.8" font-size="1.3" fill="#64748B" text-anchor="middle">ID: 12 (Lower Base Member)</text>
    </g>
  </g>

  <!-- Section 3: Camera Calibration 3x3 Card (60.0 x 60.0 mm) -->
  <g transform="translate(18, 158)">
    <rect x="0" y="0" width="174" height="88" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="0.4" rx="2" />
    <text x="6" y="7" font-size="2.8" font-weight="bold" fill="#0F172A">3. CAMERA INTRINSICS CALIBRATION TARGET (60.0 × 60.0 mm RIGID CARD)</text>
    <text x="6" y="11.5" font-size="1.8" fill="#64748B">3×3 ArUco array for calculating pinhole focal length (fx, fy) and optical principal center (cx, cy). Mount flat on acrylic.</text>

    <!-- 3x3 Calibration Grid Card -->
    <g transform="translate(16, 16)">
      <rect x="0" y="0" width="60" height="60" fill="#FFFFFF" stroke="#0F172A" stroke-width="0.4" />
      <text x="30" y="58" font-size="1.5" font-weight="bold" fill="#64748B" text-anchor="middle">CALIBRATION CARD · 60×60mm · PITCH 18mm</text>
      
      <!-- 9 Markers: IDs 20 to 28 -->
      ${[
        { id: 20, x: 6, y: 6 },  { id: 21, x: 24, y: 6 },  { id: 22, x: 42, y: 6 },
        { id: 23, x: 6, y: 24 }, { id: 24, x: 24, y: 24 }, { id: 25, x: 42, y: 24 },
        { id: 26, x: 6, y: 42 }, { id: 27, x: 24, y: 42 }, { id: 28, x: 42, y: 42 }
      ].map(m => `
        <g transform="translate(${m.x}, ${m.y})">
          ${renderMarkerSvg(m.id, 12)}
          <text x="6" y="11.2" font-size="1.0" fill="#FFFFFF" font-family="monospace" text-anchor="middle">#${m.id}</text>
        </g>
      `).join('\n')}
    </g>

    <!-- Calibration Instructions & Pass/Fail Criteria -->
    <g transform="translate(84, 18)">
      <rect x="0" y="0" width="84" height="56" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.3" rx="1.5" />
      <text x="5" y="6" font-size="2.2" font-weight="bold" fill="#0F172A">CALIBRATION PROTOCOL &amp; TOLERANCES</text>
      <text x="5" y="12" font-size="1.6" fill="#334155">1. Paste 60×60mm card onto rigid flat cardboard or acrylic.</text>
      <text x="5" y="17" font-size="1.6" fill="#334155">2. Hold card at 45–50 cm distance under uniform diffuse lighting.</text>
      <text x="5" y="22" font-size="1.6" fill="#334155">3. Software requires all 9 markers detected across 10 poses.</text>
      <text x="5" y="27" font-size="1.6" fill="#334155">4. Reprojection error must satisfy &lt; 0.50 px root-mean-square.</text>
      
      <line x1="5" y1="31" x2="79" y2="31" stroke="#E2E8F0" stroke-width="0.3" />
      <text x="5" y="37" font-size="1.8" font-weight="bold" fill="#DC2626">CLINICAL SAFETY WARNING</text>
      <text x="5" y="42" font-size="1.4" fill="#64748B">System remains in UNCALIBRATED estimation mode until the 3×3 card</text>
      <text x="5" y="46" font-size="1.4" fill="#64748B">is successfully scanned. Pinhole intrinsics are mandatory for metric VDO.</text>
      <text x="5" y="51" font-size="1.4" font-weight="bold" fill="#047857">Status: Calibration records timestamp, focal length &amp; optical center.</text>
    </g>
  </g>

  <!-- Sheet Footer Notes -->
  <g transform="translate(18, 252)">
    <text x="0" y="5" font-size="1.7" fill="#64748B">Maitri College of Dentistry &amp; Research Centre · Dept. of Prosthodontics · Dr. Deepanshu</text>
    <text x="0" y="9.5" font-size="1.5" fill="#94A3B8">SmartBow AI Research Specification v1.2 · Grounded in Boucher (12th ed.) &amp; Winkler (2nd ed.)</text>
    <text x="174" y="9.5" font-size="1.5" fill="#94A3B8" text-anchor="end">Page 1 of 1 · DIN A4 (210 × 297 mm)</text>
  </g>
</svg>`;
}

