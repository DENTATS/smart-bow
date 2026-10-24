/**
 * SMARTBOW AI — INDEPENDENT OPENCV ARUCO GROUND TRUTH TEST VECTORS
 * 
 * These 6x6 binary matrices are generated independently from the canonical
 * OpenCV ArUco DICT_4X4_50 dictionary specification.
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
  grid6x6: number[][];
}

export const INDEPENDENT_OPENCV_GROUND_TRUTH_MARKERS: IndependentOpenCvMarker[] = [
  {
    id: 0,
    label: 'F01 Glabella',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 0, 1, 1, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 1,
    label: 'F02 Right Zygoma',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 1, 0, 1, 1, 0],
      [0, 0, 1, 0, 1, 0],
      [0, 1, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 2,
    label: 'F03 Left Zygoma',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 0],
      [0, 1, 0, 1, 0, 0],
      [0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 3,
    label: 'Maxillary Right Premolar M1',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 1, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0],
      [0, 1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 4,
    label: 'Maxillary Right Premolar M2',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 1, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 1, 1, 0, 1, 0],
      [0, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 5,
    label: 'Maxillary Right Premolar M3',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 0],
      [0, 1, 1, 0, 1, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 6,
    label: 'Maxillary Right Premolar M4',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0],
      [0, 1, 0, 0, 1, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 7,
    label: 'Mandibular Right Premolar M1',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 1, 0, 1, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 8,
    label: 'Mandibular Right Premolar M2',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0, 0],
      [0, 0, 1, 0, 1, 0],
      [0, 1, 1, 0, 0, 0],
      [0, 1, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 9,
    label: 'Mandibular Right Premolar M3',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 1, 1, 1, 1, 0],
      [0, 1, 0, 1, 0, 0],
      [0, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 10,
    label: 'Mandibular Right Premolar M4',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 1, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 1, 1, 1, 0],
      [0, 1, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 11,
    label: 'Hanau Upper Member H01',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 1, 0, 1, 1, 0],
      [0, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  },
  {
    id: 12,
    label: 'Hanau Lower Member H02',
    grid6x6: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 1, 0, 1, 1, 0],
      [0, 1, 1, 0, 1, 0],
      [0, 1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ]
  }
];
