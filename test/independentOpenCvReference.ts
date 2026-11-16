/**
 * SMARTBOW AI — INDEPENDENT OPENCV ARUCO GROUND TRUTH TEST VECTORS
 *
 * Byte pairs below are taken directly from OpenCV 4.x's canonical
 * `opencv/modules/objdetect/src/aruco/predefined_dictionaries.hpp`
 * (`DICT_4X4_1000_BYTES[0..49]`, which defines `cv::aruco::DICT_4X4_50`).
 *
 * Rules:
 * - 6x6 matrix (4x4 inner data bits surrounded by 1-bit solid black enclosing border)
 * - 0 = black (#000000)
 * - 1 = white (#ffffff)
 * - Completely decoupled from the application's internal generator code.
 */

export interface IndependentOpenCvMarker {
  id: number;
  label: string;
  openCvBytes: [number, number];
  grid6x6: number[][];
}

function bytesToOpenCv6x6Grid(b0: number, b1: number): number[][] {
  const bits: number[] = [];
  for (let i = 7; i >= 0; i--) bits.push((b0 >> i) & 1);
  for (let i = 7; i >= 0; i--) bits.push((b1 >> i) & 1);

  const grid: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      grid[r + 1][c + 1] = bits[r * 4 + c];
    }
  }
  return grid;
}

const CANONICAL_OPENCV_SPECS: Array<{ id: number; label: string; bytes: [number, number] }> = [
  { id: 0, label: 'F01 Glabella', bytes: [181, 50] },
  { id: 1, label: 'F02 Right Zygoma', bytes: [15, 154] },
  { id: 2, label: 'F03 Left Zygoma', bytes: [51, 45] },
  { id: 3, label: 'Maxillary Right Premolar M1', bytes: [153, 70] },
  { id: 4, label: 'Maxillary Right Premolar M2', bytes: [84, 158] },
  { id: 5, label: 'Maxillary Right Premolar M3', bytes: [121, 205] },
  { id: 6, label: 'Maxillary Right Premolar M4', bytes: [158, 46] },
  { id: 7, label: 'Mandibular Right Premolar M1', bytes: [196, 242] },
  { id: 8, label: 'Mandibular Right Premolar M2', bytes: [254, 218] },
  { id: 9, label: 'Mandibular Right Premolar M3', bytes: [207, 86] },
  { id: 10, label: 'Mandibular Right Premolar M4', bytes: [249, 145] },
  { id: 11, label: 'Hanau Upper Member H01', bytes: [17, 167] },
  { id: 12, label: 'Hanau Lower Member H02', bytes: [14, 183] },
  { id: 20, label: 'Calibration Card (0,0)', bytes: [134, 139] },
  { id: 21, label: 'Calibration Card (0,1)', bytes: [176, 43] },
  { id: 22, label: 'Calibration Card (0,2)', bytes: [204, 213] },
  { id: 23, label: 'Calibration Card (1,0)', bytes: [221, 130] },
  { id: 24, label: 'Calibration Card (1,1)', bytes: [254, 71] },
  { id: 25, label: 'Calibration Card (1,2)', bytes: [148, 113] },
  { id: 26, label: 'Calibration Card (2,0)', bytes: [172, 228] },
  { id: 27, label: 'Calibration Card (2,1)', bytes: [165, 84] },
  { id: 28, label: 'Calibration Card (2,2)', bytes: [33, 35] },
];

export const INDEPENDENT_OPENCV_GROUND_TRUTH_MARKERS: IndependentOpenCvMarker[] =
  CANONICAL_OPENCV_SPECS.map((spec) => ({
    id: spec.id,
    label: spec.label,
    openCvBytes: spec.bytes,
    grid6x6: bytesToOpenCv6x6Grid(spec.bytes[0], spec.bytes[1]),
  }));
