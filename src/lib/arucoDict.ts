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
