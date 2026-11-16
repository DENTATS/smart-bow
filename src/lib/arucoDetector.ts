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

export type ArucoFailureCategory =
  | 'NONE'
  | 'DETECTOR_INIT_FAILED'
  | 'FRAME_PROCESSING_FAILED'
  | 'NO_CANDIDATES'
  | 'MARKER_TOO_SMALL'
  | 'POOR_LIGHTING_OR_GLARE'
  | 'PARTIALLY_OBSCURED'
  | 'WRONG_DICTIONARY_OR_ID';

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
  failureCategory: ArucoFailureCategory;
  markers: MarkerPose[];
  detectedIds: number[];
  lowContrastMarkerIds?: number[];
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
      failureCategory: 'FRAME_PROCESSING_FAILED',
      markers: [],
      detectedIds: [],
    };
  }

  try {
    const maxDim = options?.maxProcDim ?? 960;
    const procScale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const procW = Math.max(16, Math.round(srcW * procScale));
    const procH = Math.max(16, Math.round(srcH * procScale));
    const calib = normalizeCalibration(calibInput, srcW, srcH);

    // 1. Build grayscale luminance buffer + global lighting statistics
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

    const radius = Math.max(8, Math.round(Math.min(procW, procH) * 0.042));
    const bin = new Uint8Array(procW * procH);
    const adaptiveC = 5;

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

    // 3. Extract outer contours & approximate quadrilateral candidates
    const visited = new Uint8Array(procW * procH);
    const quads: [Pt2, Pt2, Pt2, Pt2][] = [];
    let rejectedTooSmallCount = 0;

    for (let y = 1; y < procH - 1; y++) {
      const rowOffset = y * procW;
      for (let x = 1; x < procW - 1; x++) {
        const p = rowOffset + x;
        if (bin[p] === 1 && bin[p - 1] === 0 && visited[p] === 0) {
          const contour = traceOuterContour(bin, visited, procW, procH, x, y);
          if (contour.length < 16) continue;

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

          const bw = maxX - minX;
          const bh = maxY - minY;
          if (bw < 6 || bh < 6) continue;

          // Ignore outer frame-border contour
          if (bw > procW * 0.94 && bh > procH * 0.94) continue;

          // Too small for reliable 6x6 cell decoding (must be >= ~12px per side)
          if (bw < 12 || bh < 12) {
            if (Math.max(bw, bh) / Math.max(1, Math.min(bw, bh)) < 2.2) {
              rejectedTooSmallCount++;
            }
            continue;
          }

          let poly = approxClosedPolygon(contour, Math.max(1.5, perim * 0.032));
          if (poly.length > 4 && poly.length <= 6) {
            poly = approxClosedPolygon(contour, Math.max(2.0, perim * 0.052));
          }
          if (poly.length !== 4) continue;
          if (!isConvexQuad(poly)) continue;

          const area = Math.abs(polygonSignedArea(poly));
          if (area < 120) {
            rejectedTooSmallCount++;
            continue;
          }

          const ordered = orderQuadClockwise(poly);
          const sides = [
            Math.hypot(ordered[1].x - ordered[0].x, ordered[1].y - ordered[0].y),
            Math.hypot(ordered[2].x - ordered[1].x, ordered[2].y - ordered[1].y),
            Math.hypot(ordered[3].x - ordered[2].x, ordered[3].y - ordered[2].y),
            Math.hypot(ordered[0].x - ordered[3].x, ordered[0].y - ordered[3].y),
          ];
          const minSide = Math.min(...sides);
          const maxSide = Math.max(...sides);
          if (minSide < 11) {
            rejectedTooSmallCount++;
            continue;
          }
          if (maxSide / minSide > 4.0) continue;

          quads.push(ordered);
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
      contrast: number;
      area: number;
      tvec: [number, number, number];
      rvec: [number, number, number];
    }

    const candidates: ScoredCandidate[] = [];

    for (const quad of quads) {
      const H = computeMarkerHomography(quad);
      if (!H) continue;

      const cellLum: number[][] = Array.from({ length: 6 }, () => new Array(6).fill(0));
      const all36Cells: number[] = [];

      // Sample 3x3 sub-points inside [0.28..0.72] of every 6x6 cell
      const subOffsets = [0.28, 0.5, 0.72];
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
      // Only discard mathematically flat noise (< 6 gray levels); never reject valid low-contrast markers
      if (cellContrast < 6) {
        rejectedLowContrastCount++;
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

      // Solid black square without internal white cells -> not a valid marker
      if (innerWhiteCount === 0) continue;

      // Strict 1-bit black border validation: reject corrupted/partially obscured borders
      if (borderOnes > 0) {
        if (borderOnes <= 12 && cellContrast >= 12) {
          rejectedBorderCorruptedCount++;
        }
        continue;
      }

      // Check 6x6 vs 8x8 (DICT_6X6) border thickness guard:
      // At u/v = 0.88 cells from outer edge, a true 6x6 marker is still strictly inside the 1.0-cell black border,
      // whereas an 8x8 (DICT_6X6) marker's border ends at 6/8 = 0.75 cells and exposes white inner cells along row/col 1!
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

      // Allow 1-bit Hamming correction only when border thickness confirms 6x6 geometry
      const allowError = (options?.allowOneBitError ?? true) && outerTransitionLeakCount <= 1 ? 1 : 0;
      const decoded = decodeMarkerGridWithConfidence(grid, allowError);

      if (!decoded || !(decoded.id in ARUCO_DICT_4X4_50_BITS)) {
        if (cellContrast >= 12) {
          rejectedWrongDictOrInvalidIdCount++;
        }
        continue;
      }

      // Reject probable 6x6/other-grid false alias if >2 border-boundary probes hit white inside 0.9 cells
      // (a genuine 6x6 DICT_4X4_50 marker has a full 1.0-cell black border)
      if (outerTransitionLeakCount >= 4 && decoded.hammingDistance > 0) {
        rejectedWrongDictOrInvalidIdCount++;
        continue;
      }

      // Rotate quad vertices so corners[0] is the marker's canonical Top-Left
      const shift = (4 - decoded.rotCwStepsNeeded) % 4;
      const invScale = 1 / procScale;
      const alignedCorners: [Point3D, Point3D, Point3D, Point3D] = [
        { x: quad[shift].x * invScale, y: quad[shift].y * invScale, z: 0 },
        { x: quad[(shift + 1) % 4].x * invScale, y: quad[(shift + 1) % 4].y * invScale, z: 0 },
        { x: quad[(shift + 2) % 4].x * invScale, y: quad[(shift + 2) % 4].y * invScale, z: 0 },
        { x: quad[(shift + 3) % 4].x * invScale, y: quad[(shift + 3) % 4].y * invScale, z: 0 },
      ];

      const center: Point3D = {
        x: (alignedCorners[0].x + alignedCorners[1].x + alignedCorners[2].x + alignedCorners[3].x) / 4,
        y: (alignedCorners[0].y + alignedCorners[1].y + alignedCorners[2].y + alignedCorners[3].y) / 4,
        z: 0,
      };

      const markerSizeM = decoded.id >= 3 && decoded.id <= 10 ? 0.0065 : MARKER_SIZE_METERS;
      const pose = estimateMarkerPose(alignedCorners, calib, markerSizeM);
      const quadArea = Math.abs(polygonSignedArea(quad));

      candidates.push({
        id: decoded.id,
        corners: alignedCorners,
        center,
        hammingDistance: decoded.hammingDistance,
        contrast: cellContrast,
        area: quadArea,
        tvec: pose.tvec,
        rvec: pose.rvec,
      });
    }

    // 5. Deduplicate overlapping detections & sort by ID
    candidates.sort((a, b) => {
      if (a.hammingDistance !== b.hammingDistance) return a.hammingDistance - b.hammingDistance;
      if (b.contrast !== a.contrast) return b.contrast - a.contrast;
      return b.area - a.area;
    });

    const markers: MarkerPose[] = [];
    const seenIds = new Set<number>();
    const acceptedCenters: { x: number; y: number; radius: number }[] = [];
    const lowContrastMarkerIds: number[] = [];

    for (const cand of candidates) {
      if (seenIds.has(cand.id)) continue;

      // Reject spatial duplicates at virtually the same center
      const candRadius = Math.sqrt(cand.area) * (1 / procScale) * 0.45;
      const overlaps = acceptedCenters.some(
        (ac) => Math.hypot(ac.x - cand.center.x, ac.y - cand.center.y) < Math.max(ac.radius, candRadius)
      );
      if (overlaps) continue;

      seenIds.add(cand.id);
      acceptedCenters.push({ x: cand.center.x, y: cand.center.y, radius: candRadius });
      if (cand.contrast < 28) {
        lowContrastMarkerIds.push(cand.id);
      }
      markers.push({
        id: cand.id,
        corners: cand.corners,
        center: cand.center,
        tvec: cand.tvec,
        rvec: cand.rvec,
      });
    }

    markers.sort((a, b) => a.id - b.id);
    lowContrastMarkerIds.sort((a, b) => a - b);

    // 6. Classify dominant failure reason when 0 markers detected; attach non-blocking quality warnings when detected
    const qualityWarnings: string[] = [];
    if (lowContrastMarkerIds.length > 0) {
      qualityWarnings.push(`Low contrast on marker IDs [${lowContrastMarkerIds.join(', ')}] — detected without suppression`);
    }
    if (meanLuminance < 55) {
      qualityWarnings.push('Low scene illumination (< 55 IRE)');
    } else if (glareRatio > 0.25) {
      qualityWarnings.push('Specular glare detected on scene (> 25%)');
    }

    let failureCategory: ArucoFailureCategory = 'NONE';
    if (markers.length === 0) {
      if (rejectedWrongDictOrInvalidIdCount > 0) {
        failureCategory = 'WRONG_DICTIONARY_OR_ID';
      } else if (rejectedBorderCorruptedCount > 0) {
        failureCategory = 'PARTIALLY_OBSCURED';
      } else if (rejectedTooSmallCount > 0 && quads.length === 0) {
        failureCategory = 'MARKER_TOO_SMALL';
      } else if (
        meanLuminance < 42 ||
        darkRatio > 0.72 ||
        glareRatio > 0.35 ||
        rejectedLowContrastCount > 0
      ) {
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
      failureCategory,
      markers,
      detectedIds: markers.map((m) => m.id),
      lowContrastMarkerIds,
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
      failureCategory: 'FRAME_PROCESSING_FAILED',
      markers: [],
      detectedIds: [],
    };
  }
}

// Cached offscreen canvas for video/canvas frame extraction
let cachedDetectorCanvas: HTMLCanvasElement | null = null;
let cachedDetectorCtx: CanvasRenderingContext2D | null = null;

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
      failureCategory: 'DETECTOR_INIT_FAILED',
      markers: [],
      detectedIds: [],
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
      failureCategory: 'FRAME_PROCESSING_FAILED',
      markers: [],
      detectedIds: [],
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
      failureCategory: 'DETECTOR_INIT_FAILED',
      markers: [],
      detectedIds: [],
    };
  }

  const maxDim = 960;
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
      failureCategory: 'DETECTOR_INIT_FAILED',
      markers: [],
      detectedIds: [],
    };
  }

  try {
    cachedDetectorCtx.drawImage(source, 0, 0, procW, procH);
    const imgData = cachedDetectorCtx.getImageData(0, 0, procW, procH);
    const result = detectArucoMarkersFromImageData(imgData, normalizeCalibration(calibInput, srcW, srcH), {
      maxProcDim: maxDim,
      allowOneBitError: true,
    });

    // Scale coordinates back from procW x procH to native source srcW x srcH
    if (scale !== 1 && result.markers.length > 0) {
      const invScale = 1 / scale;
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

    result.sourceWidth = srcW;
    result.sourceHeight = srcH;
    result.processingTimeMs = Number((nowMs() - tStart).toFixed(2));
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
      failureCategory: 'FRAME_PROCESSING_FAILED',
      markers: [],
      detectedIds: [],
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
