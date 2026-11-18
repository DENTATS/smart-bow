/**
 * SmartBow AI - Computer Vision ArUco Detector & Pose Estimator
 * Real-time perspective-invariant OpenCV DICT_4X4_50 detector using:
 * 1. Adaptive resolution scaling (up to 960px max edge for buccal 6.5mm marker legibility)
 * 2. Integral-image adaptive thresholding (handles clinic shadows & uneven illumination)
 * 3. Moore-Neighbor outer contour extraction + Douglas-Peucker quadrilateral approximation
 * 4. Exact 8-DOF planar homography inverse warp + 3x3 sub-cell bilinear sampling
 * 5. Local Otsu cell binarization + strict 1-bit black border + OpenCV DICT_4X4_50 decoding
 * 6. Viewport cover/mirror coordinate mapping for exact canvas overlay alignment
 *
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import { Point3D, MarkerPose, CameraCalibration, CameraCalibrationSettings } from '../types/smartbow';
import {
  ARUCO_DICTIONARY_NAME,
  ARUCO_DICT_4X4_50_BITS,
  REGISTERED_ARUCO_IDS,
  decodeMarkerGridWithConfidence,
} from './arucoDict';
import { Matrix4, invertRigidMatrix, transformPoint } from './patientFrame';

export const DEFAULT_CAMERA_CALIBRATION: CameraCalibration = {
  fx: 980.0,
  fy: 980.0,
  cx: 640.0,
  cy: 360.0,
  k1: -0.02,
  k2: 0.005,
  p1: 0.0001,
  p2: 0.0002,
  k3: 0.0,
  rmsError: 0.28,
  isCalibrated: true,
  resolution: { width: 1280, height: 720 },
};

// 14mm physical marker corners in meters (OBJ_PTS)
export const MARKER_SIZE_METERS = 0.014;
export const OBJ_PTS_3D: Point3D[] = [
  { x: -MARKER_SIZE_METERS / 2, y: -MARKER_SIZE_METERS / 2, z: 0 },
  { x: MARKER_SIZE_METERS / 2, y: -MARKER_SIZE_METERS / 2, z: 0 },
  { x: MARKER_SIZE_METERS / 2, y: MARKER_SIZE_METERS / 2, z: 0 },
  { x: -MARKER_SIZE_METERS / 2, y: MARKER_SIZE_METERS / 2, z: 0 },
];

// ---------------------------------------------------------------------------
// Phase 1C Small-Marker & Resolution Gate Configuration Block (F1, F2, F3)
// ---------------------------------------------------------------------------
/** Minimum outer contour perimeter points for a 6x6 ArUco marker (allows ~7x7 px markers). */
export const MIN_CONTOUR_POINTS = 12;
/** Minimum axis-aligned bounding-box width/height in processing pixels. */
export const MIN_BBOX_PX = 8;
/** Minimum quadrilateral edge length in processing pixels. */
export const MIN_SIDE_PX = 7;
/** Minimum convex quadrilateral area in processing square pixels. */
export const MIN_AREA_PX2 = 40;
/** Maximum tolerated white cells among the 20 outer border cells (matches OpenCV 0.35 * 20 = 7). */
export const MAX_BORDER_ERRORS = 7;
/** Default maximum processing dimension (allows full 1920x1080 native resolution). */
export const MAX_PROC_DIM = 1920;
/** Adaptive fallback processing dimension when sustained 10-frame average exceeds budget. */
export const ADAPTIVE_FALLBACK_PROC_DIM = 1280;
/** Minimum processing dimension allowed via automatic performance adaptation. */
export const MIN_AUTO_PROC_DIM = 960;
/** Rolling 10-frame processing time budget in milliseconds before stepping down resolution. */
export const PROC_FRAME_BUDGET_MS = 45;

export type ArucoFailureCategory =
  | 'NONE'
  | 'DETECTOR_INIT_FAILED'
  | 'FRAME_PROCESSING_FAILED'
  | 'NO_CANDIDATES'
  | 'MARKER_TOO_SMALL'
  | 'POOR_LIGHTING_OR_GLARE'
  | 'PARTIALLY_OBSCURED'
  | 'WRONG_DICTIONARY_OR_ID';

/**
 * Per-marker post-decode optical quality metrics (Phase 4).
 * Calculated independently from marker detection so decoded markers are never suppressed by quality warnings:
 * - `sidePx`: Mean edge length of the 4 quadrilateral sides in native source image pixels.
 * - `cellContrast`: Dynamic range (`cellMax - cellMin`, 0..255) across the 36 homography-warped cells.
 * - `hamming`: Hamming distance (0 or 1) between the inner 4x4 bit matrix and canonical DICT_4X4_50.
 * - `borderWhiteCells`: Count of white (1) cells among the 20 outer perimeter border cells (0..MAX_BORDER_ERRORS).
 * - `sharpness`: Mean absolute luminance difference (0..255) across adjacent contrasting cells in the 6x6 grid.
 * - `grade`: Calibrated quality tier ('GOOD' | 'LOW' | 'POOR').
 */
export interface MarkerQuality {
  id: number;
  sidePx: number;
  cellContrast: number;
  hamming: number;
  borderWhiteCells: number;
  sharpness: number;
  grade: 'GOOD' | 'LOW' | 'POOR';
}

/**
 * Structured candidate rejection summary (Phase 4).
 * Semantics are mutually exclusive per candidate in pipeline evaluation order:
 * - `rejectedTooSmall`: Contours/polygons rejected at geometric size gates (MIN_CONTOUR_POINTS, MIN_BBOX_PX, MIN_AREA_PX2, MIN_SIDE_PX) before entering `quads`.
 * - `quads`: Total convex quadrilateral candidates passing geometric size gates and evaluated via homography.
 * - `rejectedFlat`: Quads rejected at stage 1 of homography evaluation because `cellContrast < 6` or `innerWhiteCount === 0`.
 * - `rejectedBorder`: Quads passing stage 1 but rejected at stage 2 because `borderWhiteCells > MAX_BORDER_ERRORS` (or severe border corruption on large markers).
 * - `rejectedDictionary`: Quads passing stages 1 & 2 but rejected at stage 3 because the inner 4x4 bits do not match DICT_4X4_50.
 */
export interface ArucoCandidateSummary {
  quads: number;
  rejectedTooSmall: number;
  rejectedBorder: number;
  rejectedDictionary: number;
  rejectedFlat: number;
}

export interface ArucoFrameDiagnostics {
  dictionary: typeof ARUCO_DICTIONARY_NAME;
  detectorInitialized: boolean;
  initError: string | null;
  frameProcessed: boolean;
  frameError: string | null;
  processingTimeMs: number;
  sourceWidth: number;
  sourceHeight: number;
  procWidth: number;
  procHeight: number;
  meanLuminance: number;
  luminanceStdDev: number;
  glareRatio: number;
  darkRatio: number;
  rawQuadsFound: number;
  rejectedTooSmallCount: number;
  rejectedLowContrastCount: number;
  rejectedBorderCorruptedCount: number;
  rejectedWrongDictOrInvalidIdCount: number;
  candidateSummary: ArucoCandidateSummary;
  failureCategory: ArucoFailureCategory;
  markers: MarkerPose[];
  detectedIds: number[];
  markerQualities: MarkerQuality[];
  lowContrastMarkerIds?: number[];
  borderWarningMarkerIds?: number[];
  qualityWarnings?: string[];
}

export interface ViewportCoverTransform {
  scale: number;
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
  mirrored: boolean;
  canvasW: number;
  canvasH: number;
  videoW: number;
  videoH: number;
}

/**
 * Computes exact CSS `object-fit: cover` transform between raw video frame
 * dimensions and DPR-scaled canvas pixel dimensions.
 */
export function computeCoverTransform(
  videoW: number,
  videoH: number,
  canvasW: number,
  canvasH: number,
  mirrored: boolean = false
): ViewportCoverTransform {
  const safeVW = Math.max(1, videoW);
  const safeVH = Math.max(1, videoH);
  const scale = Math.max(canvasW / safeVW, canvasH / safeVH);
  const drawW = safeVW * scale;
  const drawH = safeVH * scale;
  const drawX = (canvasW - drawW) / 2;
  const drawY = (canvasH - drawH) / 2;
  return {
    scale,
    drawX,
    drawY,
    drawW,
    drawH,
    mirrored,
    canvasW,
    canvasH,
    videoW: safeVW,
    videoH: safeVH,
  };
}

/**
 * Maps a 2D point from source video/image pixel space into canvas pixel space
 * accounting for cover crop, DPR scaling, and horizontal mirroring.
 */
export function mapVideoPointToCanvas(
  pt: { x: number; y: number },
  transform: ViewportCoverTransform
): { x: number; y: number } {
  const x = transform.mirrored
    ? transform.canvasW - (pt.x * transform.scale + transform.drawX)
    : pt.x * transform.scale + transform.drawX;
  const y = pt.y * transform.scale + transform.drawY;
  return { x, y };
}

export function mapVideoCornersToCanvas(
  corners: [Point3D, Point3D, Point3D, Point3D],
  transform: ViewportCoverTransform
): [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] {
  return [
    mapVideoPointToCanvas(corners[0], transform),
    mapVideoPointToCanvas(corners[1], transform),
    mapVideoPointToCanvas(corners[2], transform),
    mapVideoPointToCanvas(corners[3], transform),
  ];
}

/**
 * Estimate 3D position (tvec) of a planar marker from its 4 image corners
 * Uses planar homography scale and camera intrinsics approximation.
 */
export function estimateMarkerPose(
  corners: [Point3D, Point3D, Point3D, Point3D],
  calib: CameraCalibration = DEFAULT_CAMERA_CALIBRATION,
  markerSizeM: number = MARKER_SIZE_METERS
): { tvec: [number, number, number]; rvec: [number, number, number] } {
  const cx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
  const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

  const w1 = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
  const w2 = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
  const avgWidthPx = Math.max(1, (w1 + w2) / 2);

  const f = (calib.fx + calib.fy) / 2;
  const tz = (f * markerSizeM) / avgWidthPx;

  const tx = ((cx - calib.cx) * tz) / calib.fx;
  const ty = ((cy - calib.cy) * tz) / calib.fy;

  const dx = corners[1].x - corners[0].x;
  const dy = corners[1].y - corners[0].y;
  const angleZ = Math.atan2(dy, dx);

  const h1 = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
  const h2 = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
  const angleY = (h1 - h2) / avgWidthPx;
  const angleX = (w1 - w2) / avgWidthPx;

  return {
    tvec: [tx, ty, tz],
    rvec: [angleX, angleY, angleZ],
  };
}

/**
 * Compute average 3D position of an ArUco board in patient space.
 */
export function getBoardPoseInPatientSpace(
  detectedPoses: MarkerPose[],
  targetIds: number[],
  tPatient: Matrix4
): { posPatient: Point3D; posCam: Point3D; detectedCount: number } | null {
  const matchingPoses = detectedPoses.filter((p) => targetIds.includes(p.id));
  if (matchingPoses.length === 0) return null;

  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  for (const p of matchingPoses) {
    sumX += p.tvec[0];
    sumY += p.tvec[1];
    sumZ += p.tvec[2];
  }
  const n = matchingPoses.length;
  const posCam: Point3D = {
    x: sumX / n,
    y: sumY / n,
    z: sumZ / n,
  };

  const invT = invertRigidMatrix(tPatient);
  const posPatient = transformPoint(invT, posCam);

  return { posPatient, posCam, detectedCount: n };
}

// ---------------------------------------------------------------------------
// Internal Computer Vision Primitives
// ---------------------------------------------------------------------------

interface Pt2 {
  x: number;
  y: number;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function normalizeCalibration(
  calibInput?: CameraCalibration | CameraCalibrationSettings,
  srcW: number = 1280,
  srcH: number = 720
): CameraCalibration {
  if (!calibInput) {
    return {
      ...DEFAULT_CAMERA_CALIBRATION,
      cx: srcW / 2,
      cy: srcH / 2,
    };
  }
  if ('cx' in calibInput && 'cy' in calibInput) {
    return calibInput as CameraCalibration;
  }
  return {
    ...DEFAULT_CAMERA_CALIBRATION,
    fx: calibInput.fx || DEFAULT_CAMERA_CALIBRATION.fx,
    fy: calibInput.fy || DEFAULT_CAMERA_CALIBRATION.fy,
    cx: srcW / 2,
    cy: srcH / 2,
    isCalibrated: calibInput.isCalibrated ?? true,
  };
}

/**
 * Moore-Neighbor 8-connected outer contour tracing on a binary image whose
 * 1px outer image border is guaranteed 0.
 */
function traceOuterContour(
  bin: Uint8Array,
  visited: Uint8Array,
  w: number,
  h: number,
  startX: number,
  startY: number
): Pt2[] {
  // Clockwise 8-neighborhood starting from West (entry pixel was (startX-1, startY) which is 0)
  const dx = [-1, -1, 0, 1, 1, 1, 0, -1];
  const dy = [0, -1, -1, -1, 0, 1, 1, 1];

  const contour: Pt2[] = [{ x: startX, y: startY }];
  visited[startY * w + startX] = 1;

  let cx = startX;
  let cy = startY;
  // Backtrack pixel is (startX - 1, startY), direction index = 0 (West)
  let backDir = 0;
  const maxSteps = Math.min(w * h, (w + h) * 6);

  // First check isolated pixel
  let foundSecond = false;
  let firstNextX = -1;
  let firstNextY = -1;

  for (let step = 0; step < maxSteps; step++) {
    let found = false;
    let nextX = cx;
    let nextY = cy;
    let nextBackDir = backDir;

    for (let k = 1; k <= 8; k++) {
      const dir = (backDir + k) & 7;
      const nx = cx + dx[dir];
      const ny = cy + dy[dir];
      if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) continue;
      if (bin[ny * w + nx] === 1) {
        nextX = nx;
        nextY = ny;
        // New backtrack pixel is the last 0 pixel visited before (nx, ny)
        const prevEmptyDir = (dir + 7) & 7;
        const px = cx + dx[prevEmptyDir];
        const py = cy + dy[prevEmptyDir];
        // Direction from (nextX, nextY) to (px, py)
        const rdx = px - nextX;
        const rdy = py - nextY;
        for (let d = 0; d < 8; d++) {
          if (dx[d] === rdx && dy[d] === rdy) {
            nextBackDir = d;
            break;
          }
        }
        found = true;
        break;
      }
    }

    if (!found) break;

    if (!foundSecond) {
      foundSecond = true;
      firstNextX = nextX;
      firstNextY = nextY;
    } else if (cx === startX && cy === startY && nextX === firstNextX && nextY === firstNextY) {
      // Returned to start along identical initial edge -> closed loop
      break;
    }

    cx = nextX;
    cy = nextY;
    backDir = nextBackDir;
    visited[cy * w + cx] = 1;

    if (cx === startX && cy === startY && step > 2) {
      // Jacobian stop safety when returning to start
      break;
    }
    contour.push({ x: cx, y: cy });
  }

  return contour;
}

function pointToSegmentDistSq(p: Pt2, a: Pt2, b: Pt2): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lenSq = vx * vx + vy * vy;
  if (lenSq <= 1e-6) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return dx * dx + dy * dy;
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / lenSq));
  const px = a.x + t * vx;
  const py = a.y + t * vy;
  const dx = p.x - px;
  const dy = p.y - py;
  return dx * dx + dy * dy;
}

function rdpOpen(pts: Pt2[], start: number, end: number, epsSq: number, out: Pt2[]) {
  let maxDistSq = 0;
  let maxIdx = -1;
  const a = pts[start];
  const b = pts[end];
  for (let i = start + 1; i < end; i++) {
    const dSq = pointToSegmentDistSq(pts[i], a, b);
    if (dSq > maxDistSq) {
      maxDistSq = dSq;
      maxIdx = i;
    }
  }
  if (maxDistSq > epsSq && maxIdx !== -1) {
    rdpOpen(pts, start, maxIdx, epsSq, out);
    out.pop();
    rdpOpen(pts, maxIdx, end, epsSq, out);
  } else {
    out.push(a, b);
  }
}

/**
 * Closed-contour Douglas-Peucker polygon approximation.
 */
function approxClosedPolygon(pts: Pt2[], epsilon: number): Pt2[] {
  const n = pts.length;
  if (n < 4) return pts;

  // Find point farthest from pts[0], then point farthest from that point
  let idxA = 0;
  let maxD = -1;
  for (let i = 1; i < n; i++) {
    const d = (pts[i].x - pts[0].x) ** 2 + (pts[i].y - pts[0].y) ** 2;
    if (d > maxD) {
      maxD = d;
      idxA = i;
    }
  }
  let idxB = idxA;
  maxD = -1;
  for (let i = 0; i < n; i++) {
    const d = (pts[i].x - pts[idxA].x) ** 2 + (pts[i].y - pts[idxA].y) ** 2;
    if (d > maxD) {
      maxD = d;
      idxB = i;
    }
  }

  // Reorder contour to start at idxA and pass through idxB
  const reordered: Pt2[] = [];
  for (let i = 0; i < n; i++) {
    reordered.push(pts[(idxA + i) % n]);
  }
  const splitIdx = (idxB - idxA + n) % n;
  if (splitIdx <= 1 || splitIdx >= n - 1) return [];

  const epsSq = epsilon * epsilon;
  const half1: Pt2[] = [];
  rdpOpen(reordered, 0, splitIdx, epsSq, half1);

  const reordered2 = reordered.slice(splitIdx).concat([reordered[0]]);
  const half2: Pt2[] = [];
  rdpOpen(reordered2, 0, reordered2.length - 1, epsSq, half2);

  // Merge halves excluding duplicate endpoints
  const merged = half1.slice(0, -1).concat(half2.slice(0, -1));
  return merged;
}

function polygonSignedArea(poly: Pt2[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum * 0.5;
}

function isConvexQuad(q: Pt2[]): boolean {
  if (q.length !== 4) return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const p0 = q[i];
    const p1 = q[(i + 1) % 4];
    const p2 = q[(i + 2) % 4];
    const dx1 = p1.x - p0.x;
    const dy1 = p1.y - p0.y;
    const dx2 = p2.x - p1.x;
    const dy2 = p2.y - p1.y;
    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) < 1e-4) return false;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (sign !== s) return false;

    // Reject ultra-sharp needle angles
    const l1 = Math.hypot(dx1, dy1);
    const l2 = Math.hypot(dx2, dy2);
    if (l1 < 1e-3 || l2 < 1e-3) return false;
    const cosAngle = (dx1 * dx2 + dy1 * dy2) / (l1 * l2);
    if (Math.abs(cosAngle) > 0.94) return false;
  }
  return true;
}

/**
 * Orders 4 quad vertices clockwise in image coordinates (y-down)
 * starting with top-left-most vertex (minimum x + y).
 */
function orderQuadClockwise(q: Pt2[]): [Pt2, Pt2, Pt2, Pt2] {
  const cx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4;
  const cy = (q[0].y + q[1].y + q[2].y + q[3].y) / 4;

  // atan2(y - cy, x - cx) increases clockwise in y-down image coords
  const sorted = [...q].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
  );

  // Rotate so top-left (min x + y) is index 0
  let bestIdx = 0;
  let bestSum = Infinity;
  for (let i = 0; i < 4; i++) {
    const s = sorted[i].x + sorted[i].y;
    if (s < bestSum) {
      bestSum = s;
      bestIdx = i;
    }
  }

  return [
    sorted[bestIdx],
    sorted[(bestIdx + 1) % 4],
    sorted[(bestIdx + 2) % 4],
    sorted[(bestIdx + 3) % 4],
  ];
}

/**
 * Solves 8-DOF planar homography H mapping canonical 6x6 marker space:
 * (0,0)->c0, (6,0)->c1, (6,6)->c2, (0,6)->c3.
 * Returns 9-element row-major matrix [h0..h7, 1] or null if singular.
 */
function computeMarkerHomography(c: [Pt2, Pt2, Pt2, Pt2]): number[] | null {
  const src: Pt2[] = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 6 },
    { x: 0, y: 6 },
  ];

  // Build 8x9 augmented matrix
  const M: number[][] = Array.from({ length: 8 }, () => new Array(9).fill(0));
  for (let i = 0; i < 4; i++) {
    const u = src[i].x;
    const v = src[i].y;
    const x = c[i].x;
    const y = c[i].y;

    const r1 = i * 2;
    M[r1][0] = u;
    M[r1][1] = v;
    M[r1][2] = 1;
    M[r1][6] = -u * x;
    M[r1][7] = -v * x;
    M[r1][8] = x;

    const r2 = i * 2 + 1;
    M[r2][3] = u;
    M[r2][4] = v;
    M[r2][5] = 1;
    M[r2][6] = -u * y;
    M[r2][7] = -v * y;
    M[r2][8] = y;
  }

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < 8; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < 8; row++) {
      const val = Math.abs(M[row][col]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = row;
      }
    }
    if (maxVal < 1e-9) return null;

    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];
    for (let j = col; j <= 8; j++) M[col][j] /= pivot;

    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = col; j <= 8; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return [M[0][8], M[1][8], M[2][8], M[3][8], M[4][8], M[5][8], M[6][8], M[7][8], 1.0];
}

function sampleLumBilinear(lum: Uint8Array, w: number, h: number, x: number, y: number): number {
  const cx = Math.max(0, Math.min(w - 1.001, x));
  const cy = Math.max(0, Math.min(h - 1.001, y));
  const x0 = cx | 0;
  const y0 = cy | 0;
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = cx - x0;
  const fy = cy - y0;

  const v00 = lum[y0 * w + x0];
  const v10 = lum[y0 * w + x1];
  const v01 = lum[y1 * w + x0];
  const v11 = lum[y1 * w + x1];

  return (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
}

function computeOtsuThreshold36(values: number[]): number {
  let minV = 255;
  let maxV = 0;
  for (const v of values) {
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const midFallback = (minV + maxV) * 0.5;
  if (maxV - minV < 12) return midFallback;

  let bestThresh = midFallback;
  let bestVar = -1;
  const sorted = [...values].sort((a, b) => a - b);

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] < 1) continue;
    const t = (sorted[i] + sorted[i + 1]) * 0.5;
    let sum0 = 0;
    let cnt0 = 0;
    let sum1 = 0;
    let cnt1 = 0;
    for (const v of values) {
      if (v < t) {
        sum0 += v;
        cnt0++;
      } else {
        sum1 += v;
        cnt1++;
      }
    }
    if (cnt0 === 0 || cnt1 === 0) continue;
    const mu0 = sum0 / cnt0;
    const mu1 = sum1 / cnt1;
    const betweenVar = cnt0 * cnt1 * (mu0 - mu1) * (mu0 - mu1);
    if (betweenVar > bestVar) {
      bestVar = betweenVar;
      bestThresh = t;
    }
  }
  return bestThresh;
}

function quadCenter(q: [Pt2, Pt2, Pt2, Pt2]): Pt2 {
  return {
    x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4,
    y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4,
  };
}

// ---------------------------------------------------------------------------
// Core ImageData Detector (Pure TS — Zero DOM Dependency)
// ---------------------------------------------------------------------------

/**
 * Runs full real-time perspective-invariant ArUco DICT_4X4_50 detection on an
 * RGBA pixel buffer (`ImageData`-like object). Returns detected markers plus
 * complete diagnostic telemetry distinguishing lighting, sizing, obscuring,
 * wrong dictionary, and processing failures.
 */
export function detectArucoMarkersFromImageData(
  imageData: { data: Uint8ClampedArray | Uint8Array; width: number; height: number },
  calibInput?: CameraCalibration | CameraCalibrationSettings,
  options?: { maxProcDim?: number; allowOneBitError?: boolean }
): ArucoFrameDiagnostics {
  const tStart = nowMs();
  const srcW = imageData?.width || 0;
  const srcH = imageData?.height || 0;

  if (!imageData || !imageData.data || srcW <= 0 || srcH <= 0) {
    return {
      dictionary: ARUCO_DICTIONARY_NAME,
      detectorInitialized: true,
      initError: null,
      frameProcessed: false,
      frameError: 'Invalid or empty video frame buffer',
      processingTimeMs: Number((nowMs() - tStart).toFixed(2)),
      sourceWidth: srcW,
      sourceHeight: srcH,
      procWidth: 0,
      procHeight: 0,
      meanLuminance: 0,
      luminanceStdDev: 0,
      glareRatio: 0,
      darkRatio: 0,
      rawQuadsFound: 0,
      rejectedTooSmallCount: 0,
      rejectedLowContrastCount: 0,
      rejectedBorderCorruptedCount: 0,
      rejectedWrongDictOrInvalidIdCount: 0,
      candidateSummary: {
        quads: 0,
        rejectedTooSmall: 0,
        rejectedBorder: 0,
        rejectedDictionary: 0,
        rejectedFlat: 0,
      },
      failureCategory: 'FRAME_PROCESSING_FAILED',
      markers: [],
      detectedIds: [],
      markerQualities: [],
    };
  }

  try {
    const maxDim = options?.maxProcDim ?? MAX_PROC_DIM;
    const procScale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const procW = Math.max(16, Math.round(srcW * procScale));
    const procH = Math.max(16, Math.round(srcH * procScale));
    const calib = normalizeCalibration(calibInput, srcW, srcH);

    // 1. Build grayscale luminance buffer + global lighting statistics (no pre-decode blur per F4)
    const lum = new Uint8Array(procW * procH);
    const data = imageData.data;
    let lumSum = 0;
    let lumSqSum = 0;
    let glarePixels = 0;
    let darkPixels = 0;

    if (procW === srcW && procH === srcH) {
      for (let i = 0, p = 0; p < procW * procH; i += 4, p++) {
        const y = (77 * data[i] + 150 * data[i + 1] + 29 * data[i + 2]) >> 8;
        lum[p] = y;
        lumSum += y;
        lumSqSum += y * y;
        if (y > 242) glarePixels++;
        if (y < 35) darkPixels++;
      }
    } else {
      const invScaleX = srcW / procW;
      const invScaleY = srcH / procH;
      for (let py = 0; py < procH; py++) {
        const sy = Math.min(srcH - 1, Math.floor((py + 0.5) * invScaleY));
        for (let px = 0; px < procW; px++) {
          const sx = Math.min(srcW - 1, Math.floor((px + 0.5) * invScaleX));
          const i = (sy * srcW + sx) * 4;
          const y = (77 * data[i] + 150 * data[i + 1] + 29 * data[i + 2]) >> 8;
          const p = py * procW + px;
          lum[p] = y;
          lumSum += y;
          lumSqSum += y * y;
          if (y > 242) glarePixels++;
          if (y < 35) darkPixels++;
        }
      }
    }

    const totalPx = procW * procH;
    const meanLuminance = lumSum / totalPx;
    const luminanceStdDev = Math.sqrt(Math.max(0, lumSqSum / totalPx - meanLuminance * meanLuminance));
    const glareRatio = glarePixels / totalPx;
    const darkRatio = darkPixels / totalPx;

    // 2. Integral image for O(1) adaptive local thresholding
    const stride = procW + 1;
    const integral = new Int32Array(stride * (procH + 1));
    for (let y = 0; y < procH; y++) {
      let rowSum = 0;
      const lumRowOffset = y * procW;
      const intRowOffset = (y + 1) * stride;
      const prevRowOffset = y * stride;
      for (let x = 0; x < procW; x++) {
        rowSum += lum[lumRowOffset + x];
        integral[intRowOffset + x + 1] = integral[prevRowOffset + x + 1] + rowSum;
      }
    }

    // 3. Multi-scale adaptive thresholding & outer contour quadrilateral extraction
    // Pass A uses a broad window for large/low-contrast markers; Pass B uses a fine OpenCV-style
    // 11x11 window (radius=5) so 8-16px markers under 0.8px blur or 25° rotation do not bloat into the quiet zone.
    const broadRadius = Math.max(8, Math.round(Math.min(procW, procH) * 0.042));
    const thresholdPasses: Array<{ radius: number; adaptiveC: number; countSmallRejects: boolean }> =
      broadRadius > 6
        ? [
            { radius: broadRadius, adaptiveC: 5, countSmallRejects: true },
            { radius: 5, adaptiveC: 6, countSmallRejects: false },
          ]
        : [{ radius: broadRadius, adaptiveC: 5, countSmallRejects: true }];

    const quads: [Pt2, Pt2, Pt2, Pt2][] = [];
    const quadCenters: Array<{ x: number; y: number; side: number }> = [];
    let rejectedTooSmallCount = 0;

    const bin = new Uint8Array(procW * procH);
    const visited = new Uint8Array(procW * procH);

    for (const pass of thresholdPasses) {
      bin.fill(0);
      visited.fill(0);
      const { radius, adaptiveC, countSmallRejects } = pass;

      for (let y = 1; y < procH - 1; y++) {
        const y0 = Math.max(0, y - radius);
        const y1 = Math.min(procH - 1, y + radius);
        const intY0 = y0 * stride;
        const intY1 = (y1 + 1) * stride;
        const rowOffset = y * procW;
        for (let x = 1; x < procW - 1; x++) {
          const x0 = Math.max(0, x - radius);
          const x1 = Math.min(procW - 1, x + radius);
          const count = (y1 - y0 + 1) * (x1 - x0 + 1);
          const boxSum =
            integral[intY1 + x1 + 1] -
            integral[intY0 + x1 + 1] -
            integral[intY1 + x0] +
            integral[intY0 + x0];
          const localMean = boxSum / count;
          const val = lum[rowOffset + x];
          if (val < localMean - adaptiveC && val < 248) {
            bin[rowOffset + x] = 1;
          }
        }
      }

      for (let y = 1; y < procH - 1; y++) {
        const rowOffset = y * procW;
        for (let x = 1; x < procW - 1; x++) {
          const p = rowOffset + x;
          if (bin[p] === 1 && bin[p - 1] === 0 && visited[p] === 0) {
            const contour = traceOuterContour(bin, visited, procW, procH, x, y);
            if (contour.length < 8) continue;

            // Compute bounding box & perimeter
            let minX = procW;
            let minY = procH;
            let maxX = 0;
            let maxY = 0;
            let perim = 0;
            for (let i = 0; i < contour.length; i++) {
              const pt = contour[i];
              if (pt.x < minX) minX = pt.x;
              if (pt.y < minY) minY = pt.y;
              if (pt.x > maxX) maxX = pt.x;
              if (pt.y > maxY) maxY = pt.y;
              const next = contour[(i + 1) % contour.length];
              perim += Math.hypot(next.x - pt.x, next.y - pt.y);
            }

            // Pixel span of axis-aligned bounding box (inclusive of boundary pixels)
            const bw = maxX - minX + 1;
            const bh = maxY - minY + 1;
            if (bw < 4 || bh < 4) continue;

            // Ignore outer frame-border contour
            if (bw > procW * 0.94 && bh > procH * 0.94) continue;

            // F1 Gate 1 & 2: MIN_CONTOUR_POINTS (12) and MIN_BBOX_PX (8)
            if (contour.length < MIN_CONTOUR_POINTS || bw < MIN_BBOX_PX || bh < MIN_BBOX_PX) {
              if (countSmallRejects && Math.max(bw, bh) / Math.max(1, Math.min(bw, bh)) < 2.2) {
                rejectedTooSmallCount++;
              }
              continue;
            }

            const minEps = perim < 60 ? 0.85 : 1.5;
            let poly = approxClosedPolygon(contour, Math.max(minEps, perim * 0.032));
            if (poly.length !== 4) {
              const epsMultipliers = [0.045, 0.06, 0.08, 0.1];
              for (const mult of epsMultipliers) {
                const candidatePoly = approxClosedPolygon(contour, Math.max(minEps, perim * mult));
                if (candidatePoly.length === 4) {
                  poly = candidatePoly;
                  break;
                }
              }
            }
            if (poly.length !== 4) continue;
            if (!isConvexQuad(poly)) continue;

            const ordered = orderQuadClockwise(poly);
            const sides = [
              Math.hypot(ordered[1].x - ordered[0].x, ordered[1].y - ordered[0].y),
              Math.hypot(ordered[2].x - ordered[1].x, ordered[2].y - ordered[1].y),
              Math.hypot(ordered[3].x - ordered[2].x, ordered[3].y - ordered[2].y),
              Math.hypot(ordered[0].x - ordered[3].x, ordered[0].y - ordered[3].y),
            ];
            const minSide = Math.min(...sides);
            const maxSide = Math.max(...sides);

            // Effective area and side length accounting for 1px boundary pixel width on small contours
            const rawArea = Math.abs(polygonSignedArea(ordered));
            const effectiveArea = Math.max(rawArea, (minSide + 1) * (minSide + 1));
            const effectiveMinSide = minSide + 0.5;

            // F1 Gate 3 & 4: MIN_AREA_PX2 (40) and MIN_SIDE_PX (7)
            if (effectiveArea < MIN_AREA_PX2 || effectiveMinSide < MIN_SIDE_PX) {
              if (countSmallRejects) {
                rejectedTooSmallCount++;
              }
              continue;
            }
            if (maxSide / Math.max(1, minSide) > 3.0) continue;
            const oppRatio02 = Math.max(sides[0], sides[2]) / Math.max(1, Math.min(sides[0], sides[2]));
            const oppRatio13 = Math.max(sides[1], sides[3]) / Math.max(1, Math.min(sides[1], sides[3]));
            if (oppRatio02 > 1.55 || oppRatio13 > 1.55) continue;

            // Avoid duplicate quads from Pass B that are nearly identical to Pass A
            const qc = quadCenter(ordered);
            const isDupQuad = quadCenters.some(
              (existing) =>
                Math.hypot(existing.x - qc.x, existing.y - qc.y) < Math.max(2.5, existing.side * 0.25) &&
                Math.abs(existing.side - minSide) < Math.max(3.0, existing.side * 0.3)
            );
            if (isDupQuad) continue;

            quadCenters.push({ x: qc.x, y: qc.y, side: minSide });
            quads.push(ordered);
          }
        }
      }
    }

    // 4. Perspective homography warp & DICT_4X4_50 decoding for each candidate quad
    let rejectedLowContrastCount = 0;
    let rejectedBorderCorruptedCount = 0;
    let rejectedWrongDictOrInvalidIdCount = 0;

    interface ScoredCandidate {
      id: number;
      corners: [Point3D, Point3D, Point3D, Point3D];
      center: Point3D;
      hammingDistance: number;
      borderWhiteCells: number;
      contrast: number;
      sharpness: number;
      sidePx: number;
      area: number;
      tvec: [number, number, number];
      rvec: [number, number, number];
    }

    const candidates: ScoredCandidate[] = [];

    // Helper to radially adjust quad vertices relative to quad center for subpixel boundary alignment on small markers
    const adjustQuadRadially = (q: [Pt2, Pt2, Pt2, Pt2], deltaCornerPx: number): [Pt2, Pt2, Pt2, Pt2] => {
      if (deltaCornerPx === 0) return q;
      const c = quadCenter(q);
      return q.map((pt) => {
        const dx = pt.x - c.x;
        const dy = pt.y - c.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-3) return pt;
        return {
          x: pt.x + (dx / len) * deltaCornerPx,
          y: pt.y + (dy / len) * deltaCornerPx,
        };
      }) as [Pt2, Pt2, Pt2, Pt2];
    };

    for (const quad of quads) {
      const qSides = [
        Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y),
        Math.hypot(quad[2].x - quad[1].x, quad[2].y - quad[1].y),
        Math.hypot(quad[3].x - quad[2].x, quad[3].y - quad[2].y),
        Math.hypot(quad[0].x - quad[3].x, quad[0].y - quad[3].y),
      ];
      const qMinSide = Math.min(...qSides);
      const qAvgSide = (qSides[0] + qSides[1] + qSides[2] + qSides[3]) * 0.25;

      // For small markers (< 32px), integer contour pixels trace pixel centers [x0..x1] which are 0.5px inset
      // from the continuous outer boundary [x0-0.5..x1+0.5], or slightly bloated under blur.
      const radialOffsets = qMinSide < 32 ? [0, 0.65, -0.4, 0.35] : [0];
      const subOffsets = qMinSide < 15 ? [0.38, 0.5, 0.62] : [0.28, 0.5, 0.72];

      let bestSubDecode: {
        decoded: NonNullable<ReturnType<typeof decodeMarkerGridWithConfidence>>;
        activeQuad: [Pt2, Pt2, Pt2, Pt2];
        cellContrast: number;
        sharpness: number;
        borderOnes: number;
      } | null = null;

      let stageFailure: 'NONE' | 'FLAT' | 'BORDER' | 'DICT' = 'NONE';

      for (const offsetPx of radialOffsets) {
        const activeQuad = adjustQuadRadially(quad, offsetPx);
        const H = computeMarkerHomography(activeQuad);
        if (!H) continue;

        const cellLum: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));
        const all36Cells: number[] = [];

        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 6; c++) {
            const samples: number[] = [];
            for (const dy of subOffsets) {
              const v = r + dy;
              for (const dx of subOffsets) {
                const u = c + dx;
                const denom = H[6] * u + H[7] * v + H[8];
                if (Math.abs(denom) < 1e-6) continue;
                const sx = (H[0] * u + H[1] * v + H[2]) / denom;
                const sy = (H[3] * u + H[4] * v + H[5]) / denom;
                samples.push(sampleLumBilinear(lum, procW, procH, sx, sy));
              }
            }
            samples.sort((a, b) => a - b);
            const medianVal = samples.length > 0 ? samples[samples.length >> 1] : 0;
            cellLum[r][c] = medianVal;
            all36Cells.push(medianVal);
          }
        }

        let cellMin = 255;
        let cellMax = 0;
        for (const v of all36Cells) {
          if (v < cellMin) cellMin = v;
          if (v > cellMax) cellMax = v;
        }
        const cellContrast = cellMax - cellMin;
        if (cellContrast < 6) {
          if (stageFailure === 'NONE') stageFailure = 'FLAT';
          continue;
        }

        const thresh = computeOtsuThreshold36(all36Cells);
        const grid: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));
        let borderOnes = 0;
        let innerWhiteCount = 0;

        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 6; c++) {
            const bit = cellLum[r][c] >= thresh ? 1 : 0;
            grid[r][c] = bit;
            if (r === 0 || r === 5 || c === 0 || c === 5) {
              if (bit === 1) borderOnes++;
            } else if (bit === 1) {
              innerWhiteCount++;
            }
          }
        }

        // Solid black square without internal white cells -> flat/empty
        if (innerWhiteCount === 0) {
          if (stageFailure === 'NONE') stageFailure = 'FLAT';
          continue;
        }

        // F3: Allow up to MAX_BORDER_ERRORS = 7 white cells on small markers (< 20px where cells are < 3.3px),
        // up to 3 white cells on medium markers (20..47px), and up to 2 on large markers (>= 48px).
        const maxAllowedBorderErrors = qAvgSide >= 48 ? 2 : qAvgSide >= 20 ? 3 : MAX_BORDER_ERRORS;
        if (
          borderOnes > maxAllowedBorderErrors ||
          (innerWhiteCount <= 1 && borderOnes > 0) ||
          ((innerWhiteCount <= 2 || innerWhiteCount >= 14) && borderOnes >= 2)
        ) {
          if (cellContrast >= 12 && (stageFailure === 'NONE' || stageFailure === 'FLAT')) {
            stageFailure = 'BORDER';
          }
          continue;
        }

        // Verify the candidate is surrounded by an authentic bright quiet zone around its 4 outer edges
        // (prevents random checkerboard noise blobs from false-matching DICT_4X4_50)
        {
          let quietZoneWhiteProbes = 0;
          let quietZoneValidProbes = 0;
          const quietProbeCoords: Array<[number, number]> = [
            [1.5, -0.35], [2.5, -0.35], [3.5, -0.35], [4.5, -0.35],
            [1.5, 6.35],  [2.5, 6.35],  [3.5, 6.35],  [4.5, 6.35],
            [-0.35, 1.5], [-0.35, 2.5], [-0.35, 3.5], [-0.35, 4.5],
            [6.35, 1.5],  [6.35, 2.5],  [6.35, 3.5],  [6.35, 4.5],
          ];
          for (const [u, v] of quietProbeCoords) {
            const denom = H[6] * u + H[7] * v + H[8];
            if (Math.abs(denom) < 1e-6) continue;
            const sx = (H[0] * u + H[1] * v + H[2]) / denom;
            const sy = (H[3] * u + H[4] * v + H[5]) / denom;
            if (sx >= 0 && sx < procW && sy >= 0 && sy < procH) {
              quietZoneValidProbes++;
              if (sampleLumBilinear(lum, procW, procH, sx, sy) >= thresh) {
                quietZoneWhiteProbes++;
              }
            }
          }
          if (quietZoneValidProbes >= 8 && quietZoneWhiteProbes < Math.ceil(quietZoneValidProbes * 0.75)) {
            if (stageFailure === 'NONE' || stageFailure === 'FLAT') {
              stageFailure = 'BORDER';
            }
            continue;
          }
        }

        // Check 6x6 vs 8x8 (DICT_6X6) border thickness guard
        let outerTransitionLeakCount = 0;
        const borderProbeCoords: Array<[number, number]> = [
          [1.5, 0.9], [2.5, 0.9], [3.5, 0.9], [4.5, 0.9],
          [1.5, 5.1], [2.5, 5.1], [3.5, 5.1], [4.5, 5.1],
          [0.9, 1.5], [0.9, 2.5], [0.9, 3.5], [0.9, 4.5],
          [5.1, 1.5], [5.1, 2.5], [5.1, 3.5], [5.1, 4.5],
        ];
        for (const [u, v] of borderProbeCoords) {
          const denom = H[6] * u + H[7] * v + H[8];
          if (Math.abs(denom) < 1e-6) continue;
          const sx = (H[0] * u + H[1] * v + H[2]) / denom;
          const sy = (H[3] * u + H[4] * v + H[5]) / denom;
          if (sampleLumBilinear(lum, procW, procH, sx, sy) > thresh + 12) {
            outerTransitionLeakCount++;
          }
        }

        // Require exact 0-Hamming inner match whenever borderOnes > 0 to prevent false positives;
        // allow 1-bit Hamming correction when all 20 border cells are clean and inner pattern has >= 2 white bits
        const allowError =
          (options?.allowOneBitError ?? true) &&
          borderOnes === 0 &&
          innerWhiteCount >= 2 &&
          outerTransitionLeakCount <= 1
            ? 1
            : 0;

        const decoded = decodeMarkerGridWithConfidence(grid, allowError, maxAllowedBorderErrors);
        if (!decoded || !(decoded.id in ARUCO_DICT_4X4_50_BITS)) {
          if (cellContrast >= 12) {
            stageFailure = 'DICT';
          }
          continue;
        }

        // Guard against 8x8 (DICT_6X6) or random block aliasing when border has errors
        if (
          (outerTransitionLeakCount >= 4 && decoded.hammingDistance > 0) ||
          (borderOnes > 0 && outerTransitionLeakCount >= 4 && qMinSide >= 18)
        ) {
          stageFailure = 'DICT';
          continue;
        }

        // Compute sharpness across adjacent contrasting cells in the 6x6 grid
        let gradSum = 0;
        let gradCount = 0;
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 6; c++) {
            if (c + 1 < 6 && grid[r][c] !== grid[r][c + 1]) {
              gradSum += Math.abs(cellLum[r][c] - cellLum[r][c + 1]);
              gradCount++;
            }
            if (r + 1 < 6 && grid[r][c] !== grid[r + 1][c]) {
              gradSum += Math.abs(cellLum[r][c] - cellLum[r + 1][c]);
              gradCount++;
            }
          }
        }
        const sharpness = gradCount > 0 ? gradSum / gradCount : cellContrast;

        if (
          !bestSubDecode ||
          borderOnes * 2 + decoded.hammingDistance <
            bestSubDecode.borderOnes * 2 + bestSubDecode.decoded.hammingDistance
        ) {
          bestSubDecode = {
            decoded,
            activeQuad,
            cellContrast,
            sharpness,
            borderOnes,
          };
        }

        // If perfect 0-border-error, 0-Hamming match found, stop checking other radial offsets
        if (borderOnes === 0 && decoded.hammingDistance === 0) {
          break;
        }
      }

      if (!bestSubDecode) {
        if (stageFailure === 'DICT') {
          rejectedWrongDictOrInvalidIdCount++;
        } else if (stageFailure === 'BORDER') {
          rejectedBorderCorruptedCount++;
        } else {
          rejectedLowContrastCount++;
        }
        continue;
      }

      const { decoded, activeQuad, cellContrast, sharpness, borderOnes } = bestSubDecode;

      // Rotate quad vertices so corners[0] is the marker's canonical Top-Left
      const shift = (4 - decoded.rotCwStepsNeeded) % 4;
      const invScale = 1 / procScale;
      const alignedCorners: [Point3D, Point3D, Point3D, Point3D] = [
        { x: activeQuad[shift].x * invScale, y: activeQuad[shift].y * invScale, z: 0 },
        { x: activeQuad[(shift + 1) % 4].x * invScale, y: activeQuad[(shift + 1) % 4].y * invScale, z: 0 },
        { x: activeQuad[(shift + 2) % 4].x * invScale, y: activeQuad[(shift + 2) % 4].y * invScale, z: 0 },
        { x: activeQuad[(shift + 3) % 4].x * invScale, y: activeQuad[(shift + 3) % 4].y * invScale, z: 0 },
      ];

      const center: Point3D = {
        x: (alignedCorners[0].x + alignedCorners[1].x + alignedCorners[2].x + alignedCorners[3].x) / 4,
        y: (alignedCorners[0].y + alignedCorners[1].y + alignedCorners[2].y + alignedCorners[3].y) / 4,
        z: 0,
      };

      const s0 = Math.hypot(alignedCorners[1].x - alignedCorners[0].x, alignedCorners[1].y - alignedCorners[0].y);
      const s1 = Math.hypot(alignedCorners[2].x - alignedCorners[1].x, alignedCorners[2].y - alignedCorners[1].y);
      const s2 = Math.hypot(alignedCorners[3].x - alignedCorners[2].x, alignedCorners[3].y - alignedCorners[2].y);
      const s3 = Math.hypot(alignedCorners[0].x - alignedCorners[3].x, alignedCorners[0].y - alignedCorners[3].y);
      const sidePx = Number(((s0 + s1 + s2 + s3) / 4).toFixed(2));

      const markerSizeM = decoded.id >= 3 && decoded.id <= 10 ? 0.0065 : MARKER_SIZE_METERS;
      const pose = estimateMarkerPose(alignedCorners, calib, markerSizeM);
      const quadArea = Math.abs(polygonSignedArea(activeQuad));

      candidates.push({
        id: decoded.id,
        corners: alignedCorners,
        center,
        hammingDistance: decoded.hammingDistance,
        borderWhiteCells: borderOnes,
        contrast: cellContrast,
        sharpness: Number(sharpness.toFixed(1)),
        sidePx,
        area: quadArea,
        tvec: pose.tvec,
        rvec: pose.rvec,
      });
    }

    // 5. Deduplicate overlapping detections & sort by ID
    candidates.sort((a, b) => {
      if (a.hammingDistance !== b.hammingDistance) return a.hammingDistance - b.hammingDistance;
      if (a.borderWhiteCells !== b.borderWhiteCells) return a.borderWhiteCells - b.borderWhiteCells;
      if (b.contrast !== a.contrast) return b.contrast - a.contrast;
      return b.area - a.area;
    });

    const markers: MarkerPose[] = [];
    const markerQualities: MarkerQuality[] = [];
    const acceptedCenters: { x: number; y: number; radius: number }[] = [];
    const lowContrastSet = new Set<number>();
    const borderWarningSet = new Set<number>();

    for (const cand of candidates) {
      // Reject spatial duplicates at the same physical marker location (merges Pass A / Pass B or inner/outer contours)
      const candRadius = Math.max(cand.sidePx * 0.65, Math.sqrt(cand.area) * (1 / procScale) * 0.65);
      const overlaps = acceptedCenters.some(
        (ac) => Math.hypot(ac.x - cand.center.x, ac.y - cand.center.y) < Math.max(ac.radius, candRadius)
      );
      if (overlaps) continue;

      acceptedCenters.push({ x: cand.center.x, y: cand.center.y, radius: candRadius });
      if (cand.contrast < 28) {
        lowContrastSet.add(cand.id);
      }
      if (cand.borderWhiteCells > 0) {
        borderWarningSet.add(cand.id);
      }

      const grade: 'GOOD' | 'LOW' | 'POOR' =
        cand.sidePx >= 16 &&
        cand.contrast >= 50 &&
        cand.borderWhiteCells === 0 &&
        cand.hammingDistance === 0 &&
        cand.sharpness >= 25
          ? 'GOOD'
          : cand.sidePx < 10 || cand.contrast < 25 || cand.borderWhiteCells >= 4 || cand.sharpness < 12
          ? 'POOR'
          : 'LOW';

      markerQualities.push({
        id: cand.id,
        sidePx: cand.sidePx,
        cellContrast: Number(cand.contrast.toFixed(1)),
        hamming: cand.hammingDistance,
        borderWhiteCells: cand.borderWhiteCells,
        sharpness: cand.sharpness,
        grade,
      });

      markers.push({
        id: cand.id,
        corners: cand.corners,
        center: cand.center,
        tvec: cand.tvec,
        rvec: cand.rvec,
      });
    }

    markers.sort((a, b) => a.id - b.id || a.center.x - b.center.x);
    markerQualities.sort((a, b) => a.id - b.id);
    const lowContrastMarkerIds = Array.from(lowContrastSet).sort((a, b) => a - b);
    const borderWarningMarkerIds = Array.from(borderWarningSet).sort((a, b) => a - b);

    const candidateSummary: ArucoCandidateSummary = {
      quads: quads.length,
      rejectedTooSmall: rejectedTooSmallCount,
      rejectedBorder: rejectedBorderCorruptedCount,
      rejectedDictionary: rejectedWrongDictOrInvalidIdCount,
      rejectedFlat: rejectedLowContrastCount,
    };

    // 6. Attach non-blocking quality warnings when detected; classify dominant failure reason when 0 markers detected
    const qualityWarnings: string[] = [];
    if (lowContrastMarkerIds.length > 0) {
      qualityWarnings.push(`Low contrast on marker IDs [${lowContrastMarkerIds.join(', ')}] — detected without suppression`);
    }
    if (borderWarningMarkerIds.length > 0) {
      qualityWarnings.push(`Imperfect outer border on marker IDs [${borderWarningMarkerIds.join(', ')}] — detected without suppression`);
    }
    if (meanLuminance < 42) {
      qualityWarnings.push('Low scene illumination (mean luminance < 42)');
    } else if (glareRatio > 0.35 && rejectedLowContrastCount > 0) {
      qualityWarnings.push('Specular glare detected (> 35% with flat quad candidates)');
    }

    let failureCategory: ArucoFailureCategory = 'NONE';
    if (markers.length === 0) {
      if (rejectedWrongDictOrInvalidIdCount > 0) {
        failureCategory = 'WRONG_DICTIONARY_OR_ID';
      } else if (rejectedBorderCorruptedCount > 0) {
        failureCategory = 'PARTIALLY_OBSCURED';
      } else if (rejectedTooSmallCount > 0 && quads.length === 0) {
        failureCategory = 'MARKER_TOO_SMALL';
      } else if (meanLuminance < 42 || (glareRatio > 0.35 && rejectedLowContrastCount > 0)) {
        failureCategory = 'POOR_LIGHTING_OR_GLARE';
      } else if (rejectedTooSmallCount > 0) {
        failureCategory = 'MARKER_TOO_SMALL';
      } else {
        failureCategory = 'NO_CANDIDATES';
      }
    }

    return {
      dictionary: ARUCO_DICTIONARY_NAME,
      detectorInitialized: true,
      initError: null,
      frameProcessed: true,
      frameError: null,
      processingTimeMs: Number((nowMs() - tStart).toFixed(2)),
      sourceWidth: srcW,
      sourceHeight: srcH,
      procWidth: procW,
      procHeight: procH,
      meanLuminance: Number(meanLuminance.toFixed(1)),
      luminanceStdDev: Number(luminanceStdDev.toFixed(1)),
      glareRatio: Number(glareRatio.toFixed(3)),
      darkRatio: Number(darkRatio.toFixed(3)),
      rawQuadsFound: quads.length,
      rejectedTooSmallCount,
      rejectedLowContrastCount,
      rejectedBorderCorruptedCount,
      rejectedWrongDictOrInvalidIdCount,
      candidateSummary,
      failureCategory,
      markers,
      detectedIds: markers.map((m) => m.id),
      markerQualities,
      lowContrastMarkerIds,
      borderWarningMarkerIds,
      qualityWarnings,
    };
  } catch (err: any) {
    return {
      dictionary: ARUCO_DICTIONARY_NAME,
      detectorInitialized: true,
      initError: null,
      frameProcessed: false,
      frameError: err?.message || 'Frame processing threw an unexpected error',
      processingTimeMs: Number((nowMs() - tStart).toFixed(2)),
      sourceWidth: srcW,
      sourceHeight: srcH,
      procWidth: 0,
      procHeight: 0,
      meanLuminance: 0,
      luminanceStdDev: 0,
      glareRatio: 0,
      darkRatio: 0,
      rawQuadsFound: 0,
      rejectedTooSmallCount: 0,
      rejectedLowContrastCount: 0,
      rejectedBorderCorruptedCount: 0,
      rejectedWrongDictOrInvalidIdCount: 0,
      candidateSummary: {
        quads: 0,
        rejectedTooSmall: 0,
        rejectedBorder: 0,
        rejectedDictionary: 0,
        rejectedFlat: 0,
      },
      failureCategory: 'FRAME_PROCESSING_FAILED',
      markers: [],
      detectedIds: [],
      markerQualities: [],
    };
  }
}

// ---------------------------------------------------------------------------
// F2: Adaptive Processing Resolution Controller & Offscreen Frame Extractor
// ---------------------------------------------------------------------------
let cachedDetectorCanvas: HTMLCanvasElement | null = null;
let cachedDetectorCtx: CanvasRenderingContext2D | null = null;
let activeMaxProcDim: number = MAX_PROC_DIM;
let rollingProcTimesMs: number[] = [];
let lastSeenSourceDims: { w: number; h: number } = { w: 0, h: 0 };

/**
 * Resets the adaptive processing resolution controller back to MAX_PROC_DIM (1920px).
 */
export function resetAdaptiveResolutionController(): void {
  activeMaxProcDim = MAX_PROC_DIM;
  rollingProcTimesMs = [];
  lastSeenSourceDims = { w: 0, h: 0 };
}

/**
 * Returns current adaptive processing resolution state for telemetry & testing.
 */
export function getAdaptiveResolutionState(): {
  activeMaxProcDim: number;
  rollingAvgMs: number;
  sampleCount: number;
} {
  const sum = rollingProcTimesMs.reduce((acc, v) => acc + v, 0);
  const rollingAvgMs = rollingProcTimesMs.length > 0 ? Number((sum / rollingProcTimesMs.length).toFixed(2)) : 0;
  return {
    activeMaxProcDim,
    rollingAvgMs,
    sampleCount: rollingProcTimesMs.length,
  };
}

/**
 * Updates the adaptive processing resolution controller with the latest frame duration.
 * - Starts at native resolution up to 1920px (`MAX_PROC_DIM`).
 * - Uses a 10-frame rolling average budget of 45ms (`PROC_FRAME_BUDGET_MS`).
 * - Steps down to 1280px (`ADAPTIVE_FALLBACK_PROC_DIM`) when sustained 10-frame average exceeds 45ms.
 * - Never drops below 960px (`MIN_AUTO_PROC_DIM`) through automatic adaptation.
 * - Resets window on step-down to prevent canvas resize churn on every frame.
 */
export function recordFrameProcessingDuration(durationMs: number): number {
  rollingProcTimesMs.push(durationMs);
  if (rollingProcTimesMs.length > 10) {
    rollingProcTimesMs.shift();
  }
  if (rollingProcTimesMs.length === 10) {
    const avgMs = rollingProcTimesMs.reduce((acc, v) => acc + v, 0) / 10;
    if (avgMs > PROC_FRAME_BUDGET_MS) {
      if (activeMaxProcDim > ADAPTIVE_FALLBACK_PROC_DIM) {
        activeMaxProcDim = ADAPTIVE_FALLBACK_PROC_DIM;
        rollingProcTimesMs = [];
      } else if (activeMaxProcDim > MIN_AUTO_PROC_DIM) {
        activeMaxProcDim = MIN_AUTO_PROC_DIM;
        rollingProcTimesMs = [];
      }
    }
  }
  return activeMaxProcDim;
}

const EMPTY_CANDIDATE_SUMMARY: ArucoCandidateSummary = {
  quads: 0,
  rejectedTooSmall: 0,
  rejectedBorder: 0,
  rejectedDictionary: 0,
  rejectedFlat: 0,
};

/**
 * Runs detailed live ArUco DICT_4X4_50 detection on an HTMLVideoElement or HTMLCanvasElement.
 */
export function detectArucoMarkersDetailed(
  source: HTMLCanvasElement | HTMLVideoElement,
  calibInput?: CameraCalibration | CameraCalibrationSettings
): ArucoFrameDiagnostics {
  const tStart = nowMs();
  if (!source) {
    return {
      dictionary: ARUCO_DICTIONARY_NAME,
      detectorInitialized: false,
      initError: 'No video or canvas source element supplied',
      frameProcessed: false,
      frameError: 'Source is null',
      processingTimeMs: 0,
      sourceWidth: 0,
      sourceHeight: 0,
      procWidth: 0,
      procHeight: 0,
      meanLuminance: 0,
      luminanceStdDev: 0,
      glareRatio: 0,
      darkRatio: 0,
      rawQuadsFound: 0,
      rejectedTooSmallCount: 0,
      rejectedLowContrastCount: 0,
      rejectedBorderCorruptedCount: 0,
      rejectedWrongDictOrInvalidIdCount: 0,
      candidateSummary: { ...EMPTY_CANDIDATE_SUMMARY },
      failureCategory: 'DETECTOR_INIT_FAILED',
      markers: [],
      detectedIds: [],
      markerQualities: [],
    };
  }

  const srcW = 'videoWidth' in source ? source.videoWidth || 0 : source.width || 0;
  const srcH = 'videoHeight' in source ? source.videoHeight || 0 : source.height || 0;

  if (srcW <= 0 || srcH <= 0) {
    return {
      dictionary: ARUCO_DICTIONARY_NAME,
      detectorInitialized: true,
      initError: null,
      frameProcessed: false,
      frameError: 'Video frame dimensions are 0×0 (stream not ready)',
      processingTimeMs: Number((nowMs() - tStart).toFixed(2)),
      sourceWidth: srcW,
      sourceHeight: srcH,
      procWidth: 0,
      procHeight: 0,
      meanLuminance: 0,
      luminanceStdDev: 0,
      glareRatio: 0,
      darkRatio: 0,
      rawQuadsFound: 0,
      rejectedTooSmallCount: 0,
      rejectedLowContrastCount: 0,
      rejectedBorderCorruptedCount: 0,
      rejectedWrongDictOrInvalidIdCount: 0,
      candidateSummary: { ...EMPTY_CANDIDATE_SUMMARY },
      failureCategory: 'FRAME_PROCESSING_FAILED',
      markers: [],
      detectedIds: [],
      markerQualities: [],
    };
  }

  if (typeof document === 'undefined') {
    return {
      dictionary: ARUCO_DICTIONARY_NAME,
      detectorInitialized: false,
      initError: 'Browser Canvas 2D context unavailable in non-DOM environment',
      frameProcessed: false,
      frameError: 'DOM unavailable',
      processingTimeMs: Number((nowMs() - tStart).toFixed(2)),
      sourceWidth: srcW,
      sourceHeight: srcH,
      procWidth: 0,
      procHeight: 0,
      meanLuminance: 0,
      luminanceStdDev: 0,
      glareRatio: 0,
      darkRatio: 0,
      rawQuadsFound: 0,
      rejectedTooSmallCount: 0,
      rejectedLowContrastCount: 0,
      rejectedBorderCorruptedCount: 0,
      rejectedWrongDictOrInvalidIdCount: 0,
      candidateSummary: { ...EMPTY_CANDIDATE_SUMMARY },
      failureCategory: 'DETECTOR_INIT_FAILED',
      markers: [],
      detectedIds: [],
      markerQualities: [],
    };
  }

  // Reset to full native resolution (up to 1920px) when camera stream resolution changes
  if (lastSeenSourceDims.w !== srcW || lastSeenSourceDims.h !== srcH) {
    lastSeenSourceDims = { w: srcW, h: srcH };
    activeMaxProcDim = MAX_PROC_DIM;
    rollingProcTimesMs = [];
  }

  const maxDim = activeMaxProcDim;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const procW = Math.max(16, Math.round(srcW * scale));
  const procH = Math.max(16, Math.round(srcH * scale));

  if (!cachedDetectorCanvas) {
    cachedDetectorCanvas = document.createElement('canvas');
  }
  if (cachedDetectorCanvas.width !== procW || cachedDetectorCanvas.height !== procH) {
    cachedDetectorCanvas.width = procW;
    cachedDetectorCanvas.height = procH;
    cachedDetectorCtx = cachedDetectorCanvas.getContext('2d', { willReadFrequently: true });
  } else if (!cachedDetectorCtx) {
    cachedDetectorCtx = cachedDetectorCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (!cachedDetectorCtx) {
    return {
      dictionary: ARUCO_DICTIONARY_NAME,
      detectorInitialized: false,
      initError: 'Failed to initialize 2D offscreen frame extraction context',
      frameProcessed: false,
      frameError: 'Canvas 2D context null',
      processingTimeMs: Number((nowMs() - tStart).toFixed(2)),
      sourceWidth: srcW,
      sourceHeight: srcH,
      procWidth: procW,
      procHeight: procH,
      meanLuminance: 0,
      luminanceStdDev: 0,
      glareRatio: 0,
      darkRatio: 0,
      rawQuadsFound: 0,
      rejectedTooSmallCount: 0,
      rejectedLowContrastCount: 0,
      rejectedBorderCorruptedCount: 0,
      rejectedWrongDictOrInvalidIdCount: 0,
      candidateSummary: { ...EMPTY_CANDIDATE_SUMMARY },
      failureCategory: 'DETECTOR_INIT_FAILED',
      markers: [],
      detectedIds: [],
      markerQualities: [],
    };
  }

  try {
    cachedDetectorCtx.drawImage(source, 0, 0, procW, procH);
    const imgData = cachedDetectorCtx.getImageData(0, 0, procW, procH);
    const result = detectArucoMarkersFromImageData(imgData, normalizeCalibration(calibInput, procW, procH), {
      maxProcDim: maxDim,
      allowOneBitError: true,
    });

    // Scale coordinates and sidePx back from procW x procH to native source srcW x srcH
    if (scale !== 1) {
      const invScale = 1 / scale;
      if (result.markers.length > 0) {
        const calib = normalizeCalibration(calibInput, srcW, srcH);
        result.markers = result.markers.map((m) => {
          const scaledCorners: [Point3D, Point3D, Point3D, Point3D] = [
            { x: m.corners[0].x * invScale, y: m.corners[0].y * invScale, z: 0 },
            { x: m.corners[1].x * invScale, y: m.corners[1].y * invScale, z: 0 },
            { x: m.corners[2].x * invScale, y: m.corners[2].y * invScale, z: 0 },
            { x: m.corners[3].x * invScale, y: m.corners[3].y * invScale, z: 0 },
          ];
          const center: Point3D = {
            x: m.center.x * invScale,
            y: m.center.y * invScale,
            z: 0,
          };
          const markerSizeM = m.id >= 3 && m.id <= 10 ? 0.0065 : MARKER_SIZE_METERS;
          const pose = estimateMarkerPose(scaledCorners, calib, markerSizeM);
          return {
            ...m,
            corners: scaledCorners,
            center,
            tvec: pose.tvec,
            rvec: pose.rvec,
          };
        });
      }
      if (result.markerQualities && result.markerQualities.length > 0) {
        result.markerQualities = result.markerQualities.map((mq) => ({
          ...mq,
          sidePx: Number((mq.sidePx * invScale).toFixed(2)),
        }));
      }
    }

    const elapsedMs = Number((nowMs() - tStart).toFixed(2));
    recordFrameProcessingDuration(elapsedMs);

    result.sourceWidth = srcW;
    result.sourceHeight = srcH;
    result.processingTimeMs = elapsedMs;
    return result;
  } catch (err: any) {
    return {
      dictionary: ARUCO_DICTIONARY_NAME,
      detectorInitialized: true,
      initError: null,
      frameProcessed: false,
      frameError: err?.message || 'Canvas frame extraction failed (possible tainted video or GPU error)',
      processingTimeMs: Number((nowMs() - tStart).toFixed(2)),
      sourceWidth: srcW,
      sourceHeight: srcH,
      procWidth: procW,
      procHeight: procH,
      meanLuminance: 0,
      luminanceStdDev: 0,
      glareRatio: 0,
      darkRatio: 0,
      rawQuadsFound: 0,
      rejectedTooSmallCount: 0,
      rejectedLowContrastCount: 0,
      rejectedBorderCorruptedCount: 0,
      rejectedWrongDictOrInvalidIdCount: 0,
      candidateSummary: { ...EMPTY_CANDIDATE_SUMMARY },
      failureCategory: 'FRAME_PROCESSING_FAILED',
      markers: [],
      detectedIds: [],
      markerQualities: [],
    };
  }
}

/**
 * Backward-compatible wrapper returning detected MarkerPose array from video or canvas.
 */
export function detectArucoMarkersFromCanvas(
  source: HTMLCanvasElement | HTMLVideoElement,
  calibInput?: CameraCalibration | CameraCalibrationSettings
): MarkerPose[] {
  return detectArucoMarkersDetailed(source, calibInput).markers;
}

/**
 * Checks whether a detected marker ID belongs to SmartBow's registered clinical/calibration registry.
 */
export function isRegisteredSmartBowId(id: number): boolean {
  return REGISTERED_ARUCO_IDS.has(id);
}
