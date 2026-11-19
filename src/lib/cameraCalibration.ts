/**
 * SmartBow AI - Automatic & Manual Camera Optical Intrinsics & Clinical Distance Calibration
 *
 * Implements:
 * 1. Automatic Step (a): Active video track inspection (videoWidth/Height, getSettings(), device label),
 *    automatic sensor profile matching, and HFOV estimation flag ("HFOV estimated" if unknown).
 * 2. Automatic Step (b): Planar (Zhang) lens intrinsics & radial distortion (fx, fy, cx, cy, k1, k2)
 *    calibration using the 3x3 ArUco calibration card (IDs 20-28, 60x60 mm, pitch 18 mm, marker 12 mm).
 *    Auto-accepts only frames with >= 6 decoded card markers, solves homographies & intrinsics in TypeScript,
 *    and reports reprojection RMS in px (PASS < 1.0, WARN 1-2, FAIL > 2) and image area coverage (%).
 * 3. Automatic Step (c): Live marker-based camera distance & uncertainty from rim markers (IDs 3-10, 6.5 mm)
 *    or calibration card markers (IDs 20-28, 12.0 mm) using calibrated focal length.
 * 4. Honest IPD handling: "IPD: assumed 63 mm (not measured)" in amber until user enters a measured IPD,
 *    and explicit active scale source indicator ("scale: rim marker" vs "scale: IPD, lower confidence").
 * 5. Per-camera-label + resolution localStorage persistence with automatic invalidation on camera/resolution change.
 */

import { CameraCalibrationSettings, CameraSensorProfile, MarkerPose } from '../types/smartbow';

const CALIBRATION_STORAGE_KEY = 'smartbow_camera_calibration_v2';
const CALIBRATION_PER_DEVICE_PREFIX = 'smartbow_cam_calib_dev_v1::';

export const RIM_MARKER_IDS = [3, 4, 5, 6, 7, 8, 9, 10] as const;
export const RIM_MARKER_SIZE_MM = 6.5;

export const CALIBRATION_CARD_MARKER_IDS = [20, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const CALIBRATION_CARD_MARKER_SIZE_MM = 12.0;
export const CALIBRATION_CARD_PITCH_MM = 18.0;
export const CALIBRATION_CARD_BOARD_SIZE_MM = 60.0;
export const MIN_MARKERS_PER_CALIBRATION_FRAME = 6;
export const MIN_FRAMES_FOR_INTRINSIC_SOLVE = 10;
export const MAX_FRAMES_FOR_INTRINSIC_SOLVE = 15;

export const CAMERA_PROFILES: Record<
  CameraSensorProfile,
  { name: string; hfovDeg: number; description: string }
> = {
  SMARTPHONE_FRONT: {
    name: 'Smartphone Front Camera',
    hfovDeg: 68,
    description: 'Standard smartphone selfie camera (~68° horizontal FOV)',
  },
  SMARTPHONE_REAR: {
    name: 'Smartphone Rear (1x Main)',
    hfovDeg: 58,
    description: 'Main clinical camera lens (~26mm equivalent, ~58° FOV)',
  },
  LAPTOP_WEBCAM: {
    name: 'Laptop Integrated Webcam',
    hfovDeg: 60,
    description: 'Standard built-in 720p/1080p laptop camera (~60° FOV)',
  },
  EXTERNAL_HD: {
    name: 'External Dental USB Camera',
    hfovDeg: 75,
    description: 'Wide-angle clinical camera / Logitech (~75° FOV)',
  },
  CUSTOM: {
    name: 'Custom Lens Calibration',
    hfovDeg: 65,
    description: 'Clinician customized focal length and sensor angles',
  },
};

export function computeFocalLengthFromHfov(widthPx: number, hfovDeg: number): number {
  const safeW = Math.max(320, widthPx || 1280);
  const safeFov = Math.max(25, Math.min(120, hfovDeg || 60));
  return Number((safeW / (2 * Math.tan((safeFov * Math.PI) / 360))).toFixed(2));
}

export const DEFAULT_CAMERA_CALIBRATION: CameraCalibrationSettings = {
  profile: 'LAPTOP_WEBCAM',
  hfovDeg: 60,
  hfovEstimated: true,
  fx: computeFocalLengthFromHfov(1280, 60),
  fy: computeFocalLengthFromHfov(1280, 60),
  cx: 640,
  cy: 360,
  k1: 0,
  k2: 0,
  reprojectionRmsPx: null,
  coveragePct: null,
  isCalibrated: false,
  calibratedDistanceRefCm: 50,
  scaleFactor: 1.0,
  patientIpdMm: 63.0,
  ipdIsMeasured: false,
  faceBreadthMm: 140.0,
  markerBoardSizeMm: 18.0,
  cameraDeviceLabel: '',
  calibratedResolution: { width: 1280, height: 720 },
};

export type CalibrationStepVerdict = 'PASS' | 'WARN' | 'FAIL';

export interface TrackProfileDetectionResult {
  verdict: CalibrationStepVerdict;
  profile: CameraSensorProfile;
  hfovDeg: number;
  hfovEstimated: boolean;
  deviceLabel: string;
  width: number;
  height: number;
  fxInitial: number;
  fyInitial: number;
  summary: string;
}

/**
 * Step (a): Reads the active video track metadata (width, height, device label, facingMode)
 * and selects the matching camera profile. If the device label is unknown, marks "HFOV estimated".
 */
export function detectCameraProfileFromTrack(params: {
  deviceLabel?: string | null;
  facingMode?: string | null;
  width: number;
  height: number;
}): TrackProfileDetectionResult {
  const width = Math.round(params.width || 0);
  const height = Math.round(params.height || 0);
  const rawLabel = (params.deviceLabel || '').trim();
  const lower = rawLabel.toLowerCase();
  const facing = (params.facingMode || '').toLowerCase();

  if (width <= 0 || height <= 0) {
    return {
      verdict: 'FAIL',
      profile: 'LAPTOP_WEBCAM',
      hfovDeg: 60,
      hfovEstimated: true,
      deviceLabel: rawLabel || 'No active video track',
      width: 0,
      height: 0,
      fxInitial: computeFocalLengthFromHfov(1280, 60),
      fyInitial: computeFocalLengthFromHfov(1280, 60),
      summary: 'No active camera video track (0×0). Start the camera before running Auto Calibrate.',
    };
  }

  let profile: CameraSensorProfile = 'LAPTOP_WEBCAM';
  let hfovEstimated = false;

  if (
    lower.includes('logitech') ||
    lower.includes('usb') ||
    lower.includes('c920') ||
    lower.includes('c922') ||
    lower.includes('brio') ||
    lower.includes('external')
  ) {
    profile = 'EXTERNAL_HD';
  } else if (
    lower.includes('back') ||
    lower.includes('rear') ||
    lower.includes('environment') ||
    facing === 'environment'
  ) {
    profile = 'SMARTPHONE_REAR';
  } else if (
    lower.includes('front') ||
    lower.includes('selfie') ||
    lower.includes('faceTime') ||
    lower.includes('facetime') ||
    lower.includes('integrated') ||
    lower.includes('built-in') ||
    lower.includes('webcam')
  ) {
    profile = lower.includes('front') || lower.includes('selfie') ? 'SMARTPHONE_FRONT' : 'LAPTOP_WEBCAM';
  } else {
    profile = facing === 'user' ? 'LAPTOP_WEBCAM' : 'CUSTOM';
    hfovEstimated = true;
  }

  const hfovDeg = CAMERA_PROFILES[profile].hfovDeg;
  const fxInitial = computeFocalLengthFromHfov(width, hfovDeg);
  const fyInitial = fxInitial;
  const verdict: CalibrationStepVerdict =
    width < 1280 || height < 720 ? 'WARN' : hfovEstimated ? 'WARN' : 'PASS';

  const hfovTag = hfovEstimated ? `${hfovDeg}° (HFOV estimated)` : `${hfovDeg}° (${CAMERA_PROFILES[profile].name})`;
  const resTag = width < 1280 || height < 720 ? `${width}×${height} (<1280×720)` : `${width}×${height}`;

  return {
    verdict,
    profile,
    hfovDeg,
    hfovEstimated,
    deviceLabel: rawLabel || 'Unlabelled Camera',
    width,
    height,
    fxInitial,
    fyInitial,
    summary: `Track: "${rawLabel || 'Unlabelled Camera'}" · ${resTag} · ${hfovTag}`,
  };
}

/**
 * Returns the 4 planar world corners (in mm, Z = 0) of a marker on the 3x3 ArUco calibration card
 * (IDs 20-28, 60x60 mm board, 18.0 mm center-to-center pitch, 12.0 mm marker side).
 */
export function getCalibrationCardMarkerWorldCornersMm(
  markerId: number
): [
  { x: number; y: number; z: 0 },
  { x: number; y: number; z: 0 },
  { x: number; y: number; z: 0 },
  { x: number; y: number; z: 0 }
] | null {
  if (!Number.isInteger(markerId) || markerId < 20 || markerId > 28) {
    return null;
  }
  const idx = markerId - 20;
  const row = Math.floor(idx / 3); // 0, 1, 2
  const col = idx % 3; // 0, 1, 2
  const cx = (col - 1) * CALIBRATION_CARD_PITCH_MM; // -18, 0, +18 mm
  const cy = (row - 1) * CALIBRATION_CARD_PITCH_MM; // -18, 0, +18 mm
  const half = CALIBRATION_CARD_MARKER_SIZE_MM * 0.5; // 6.0 mm

  return [
    { x: cx - half, y: cy - half, z: 0 }, // TL
    { x: cx + half, y: cy - half, z: 0 }, // TR
    { x: cx + half, y: cy + half, z: 0 }, // BR
    { x: cx - half, y: cy + half, z: 0 }, // BL
  ];
}

export interface CalibrationPointCorrespondence {
  markerId: number;
  cornerIndex: number;
  worldX: number; // mm on calibration card plane (Z = 0)
  worldY: number; // mm on calibration card plane (Z = 0)
  imageX: number; // px
  imageY: number; // px
}

export interface CalibrationCardFrameObservation {
  frameIndex: number;
  decodedMarkerIds: number[];
  accepted: boolean;
  correspondences: CalibrationPointCorrespondence[];
  centroidPx: { x: number; y: number };
}

/**
 * Evaluates a single frame's detected markers for the 3x3 calibration card (IDs 20-28).
 * Auto-accepts only frames where >= 6 calibration markers are decoded.
 */
export function evaluateCalibrationCardFrame(
  markers: Array<{ id: number; corners: Array<{ x: number; y: number }> }>,
  frameIndex: number = 0
): CalibrationCardFrameObservation {
  const seen = new Set<number>();
  const correspondences: CalibrationPointCorrespondence[] = [];
  let sumX = 0;
  let sumY = 0;

  for (const m of markers) {
    if (m.id < 20 || m.id > 28 || seen.has(m.id) || !m.corners || m.corners.length < 4) {
      continue;
    }
    const worldCorners = getCalibrationCardMarkerWorldCornersMm(m.id);
    if (!worldCorners) continue;
    seen.add(m.id);

    for (let c = 0; c < 4; c++) {
      const imgPt = m.corners[c];
      const wPt = worldCorners[c];
      correspondences.push({
        markerId: m.id,
        cornerIndex: c,
        worldX: wPt.x,
        worldY: wPt.y,
        imageX: imgPt.x,
        imageY: imgPt.y,
      });
      sumX += imgPt.x;
      sumY += imgPt.y;
    }
  }

  const decodedMarkerIds = Array.from(seen).sort((a, b) => a - b);
  const accepted = decodedMarkerIds.length >= MIN_MARKERS_PER_CALIBRATION_FRAME;
  const count = Math.max(1, correspondences.length);

  return {
    frameIndex,
    decodedMarkerIds,
    accepted,
    correspondences,
    centroidPx: { x: sumX / count, y: sumY / count },
  };
}

// ---------------------------------------------------------------------------
// Dense Linear Algebra Utilities for Planar Homography & Zhang Calibration
// ---------------------------------------------------------------------------

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(M[row][col]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) return null;
    if (maxRow !== col) {
      const tmp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = tmp;
    }
    const pivot = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (Math.abs(factor) < 1e-15) continue;
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  return M.map((row) => row[n]);
}

/**
 * Estimates a 3x3 planar homography H mapping (worldX, worldY, 1) -> s * (imageX, imageY, 1)
 * using Hartley normalization and DLT + Gauss-Newton refinement.
 */
function estimatePlanarHomography(pts: CalibrationPointCorrespondence[]): number[][] | null {
  if (pts.length < 4) return null;

  let meanWX = 0;
  let meanWY = 0;
  let meanIX = 0;
  let meanIY = 0;
  for (const p of pts) {
    meanWX += p.worldX;
    meanWY += p.worldY;
    meanIX += p.imageX;
    meanIY += p.imageY;
  }
  meanWX /= pts.length;
  meanWY /= pts.length;
  meanIX /= pts.length;
  meanIY /= pts.length;

  let distW = 0;
  let distI = 0;
  for (const p of pts) {
    distW += Math.hypot(p.worldX - meanWX, p.worldY - meanWY);
    distI += Math.hypot(p.imageX - meanIX, p.imageY - meanIY);
  }
  const scaleW = Math.SQRT2 / Math.max(1e-6, distW / pts.length);
  const scaleI = Math.SQRT2 / Math.max(1e-6, distI / pts.length);

  // Build 8x8 normal equations for h11..h32 with h33 = 1 in normalized coordinates
  const AtA = Array.from({ length: 8 }, () => Array(8).fill(0));
  const Atb = Array(8).fill(0);

  for (const p of pts) {
    const X = (p.worldX - meanWX) * scaleW;
    const Y = (p.worldY - meanWY) * scaleW;
    const u = (p.imageX - meanIX) * scaleI;
    const v = (p.imageY - meanIY) * scaleI;

    const r1 = [X, Y, 1, 0, 0, 0, -u * X, -u * Y];
    const b1 = u;
    const r2 = [0, 0, 0, X, Y, 1, -v * X, -v * Y];
    const b2 = v;

    for (let i = 0; i < 8; i++) {
      Atb[i] += r1[i] * b1 + r2[i] * b2;
      for (let j = 0; j < 8; j++) {
        AtA[i][j] += r1[i] * r1[j] + r2[i] * r2[j];
      }
    }
  }

  const hNorm = solveLinearSystem(AtA, Atb);
  if (!hNorm) return null;

  const Hn = [
    [hNorm[0], hNorm[1], hNorm[2]],
    [hNorm[3], hNorm[4], hNorm[5]],
    [hNorm[6], hNorm[7], 1],
  ];

  // Denormalize: H = T_I^{-1} * Hn * T_W
  // T_W = [[scaleW, 0, -scaleW*meanWX], [0, scaleW, -scaleW*meanWY], [0, 0, 1]]
  // T_I^{-1} = [[1/scaleI, 0, meanIX], [0, 1/scaleI, meanIY], [0, 0, 1]]
  const TW = [
    [scaleW, 0, -scaleW * meanWX],
    [0, scaleW, -scaleW * meanWY],
    [0, 0, 1],
  ];
  const TIinv = [
    [1 / scaleI, 0, meanIX],
    [0, 1 / scaleI, meanIY],
    [0, 0, 1],
  ];

  const mult3 = (A: number[][], B: number[][]) => {
    const C = Array.from({ length: 3 }, () => Array(3).fill(0));
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
      }
    }
    return C;
  };

  const H = mult3(TIinv, mult3(Hn, TW));
  if (Math.abs(H[2][2]) < 1e-12) return null;
  const invH22 = 1 / H[2][2];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      H[i][j] *= invH22;
    }
  }
  return H;
}

function rodriguesToMatrix(rx: number, ry: number, rz: number): number[][] {
  const theta = Math.hypot(rx, ry, rz);
  if (theta < 1e-10) {
    return [
      [1, -rz, ry],
      [rz, 1, -rx],
      [-ry, rx, 1],
    ];
  }
  const kx = rx / theta;
  const ky = ry / theta;
  const kz = rz / theta;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const v = 1 - c;

  return [
    [kx * kx * v + c, kx * ky * v - kz * s, kx * kz * v + ky * s],
    [ky * kx * v + kz * s, ky * ky * v + c, ky * kz * v - kx * s],
    [kz * kx * v - ky * s, kz * ky * v + kx * s, kz * kz * v + c],
  ];
}

function matrixToRodrigues(R: number[][]): [number, number, number] {
  const trace = R[0][0] + R[1][1] + R[2][2];
  const cosTheta = Math.max(-1, Math.min(1, (trace - 1) * 0.5));
  const theta = Math.acos(cosTheta);
  if (theta < 1e-7) {
    return [
      0.5 * (R[2][1] - R[1][2]),
      0.5 * (R[0][2] - R[2][0]),
      0.5 * (R[1][0] - R[0][1]),
    ];
  }
  const factor = theta / (2 * Math.sin(theta));
  return [
    (R[2][1] - R[1][2]) * factor,
    (R[0][2] - R[2][0]) * factor,
    (R[1][0] - R[0][1]) * factor,
  ];
}

export interface ZhangPlanarCalibrationResult {
  verdict: CalibrationStepVerdict;
  acceptedFramesCount: number;
  totalPointsUsed: number;
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  k1: number;
  k2: number;
  hfovDeg: number;
  reprojectionRmsPx: number;
  coveragePct: number;
  summary: string;
}

/**
 * Step (b): Plain-TypeScript Planar (Zhang) Camera Calibration Solver.
 * Solves focal length (fx, fy), principal point (cx, cy), and radial distortion (k1, k2)
 * from 10-15 views of the 3x3 ArUco calibration card (IDs 20-28, >= 6 markers per frame).
 */
export function solveZhangPlanarCalibration(
  frames: CalibrationCardFrameObservation[],
  imageWidth: number,
  imageHeight: number
): ZhangPlanarCalibrationResult {
  const acceptedFrames = frames.filter(
    (f) => f.accepted && f.decodedMarkerIds.length >= MIN_MARKERS_PER_CALIBRATION_FRAME
  );
  const w = Math.max(320, imageWidth || 1280);
  const h = Math.max(240, imageHeight || 720);
  const defaultCx = w * 0.5;
  const defaultCy = h * 0.5;

  if (acceptedFrames.length < 3) {
    const fallbackFx = computeFocalLengthFromHfov(w, 60);
    return {
      verdict: 'FAIL',
      acceptedFramesCount: acceptedFrames.length,
      totalPointsUsed: 0,
      fx: fallbackFx,
      fy: fallbackFx,
      cx: defaultCx,
      cy: defaultCy,
      k1: 0,
      k2: 0,
      hfovDeg: 60,
      reprojectionRmsPx: 99.9,
      coveragePct: 0,
      summary: `Insufficient valid frames (${acceptedFrames.length} accepted; capture 10–15 frames with ≥ 6 card markers IDs 20–28).`,
    };
  }

  // 1. Estimate planar homography H_i for each accepted frame
  const validViews: Array<{
    obs: CalibrationCardFrameObservation;
    H: number[][];
  }> = [];

  for (const obs of acceptedFrames) {
    const H = estimatePlanarHomography(obs.correspondences);
    if (H) {
      validViews.push({ obs, H });
    }
  }

  if (validViews.length < 3) {
    const fallbackFx = computeFocalLengthFromHfov(w, 60);
    return {
      verdict: 'FAIL',
      acceptedFramesCount: validViews.length,
      totalPointsUsed: 0,
      fx: fallbackFx,
      fy: fallbackFx,
      cx: defaultCx,
      cy: defaultCy,
      k1: 0,
      k2: 0,
      hfovDeg: 60,
      reprojectionRmsPx: 99.9,
      coveragePct: 0,
      summary: 'Planar homography estimation failed on captured frames.',
    };
  }

  // 2. Helper: Closed-form Zhang focal length from planar homographies (orthogonality & equal-norm constraints)
  const estimateFocalFromHomographies = (
    homographies: number[][][],
    centerCx: number,
    centerCy: number
  ): number | null => {
    const f2Candidates: { f2: number; weight: number }[] = [];
    const minF2 = (w * 0.25) ** 2;
    const maxF2 = (w * 3.5) ** 2;

    for (const H of homographies) {
      const h1x = H[0][0] - centerCx * H[2][0];
      const h1y = H[1][0] - centerCy * H[2][0];
      const h1z = H[2][0];

      const h2x = H[0][1] - centerCx * H[2][1];
      const h2y = H[1][1] - centerCy * H[2][1];
      const h2z = H[2][1];

      const denom1 = h1z * h2z;
      if (Math.abs(denom1) > 1e-8) {
        const num1 = -(h1x * h2x + h1y * h2y);
        const f2 = num1 / denom1;
        if (f2 > minF2 && f2 < maxF2) {
          f2Candidates.push({ f2, weight: denom1 * denom1 });
        }
      }

      const denom2 = h1z * h1z - h2z * h2z;
      if (Math.abs(denom2) > 1e-8) {
        const num2 = -(h1x * h1x + h1y * h1y - h2x * h2x - h2y * h2y);
        const f2 = num2 / denom2;
        if (f2 > minF2 && f2 < maxF2) {
          f2Candidates.push({ f2, weight: denom2 * denom2 });
        }
      }
    }

    if (f2Candidates.length === 0) return null;

    f2Candidates.sort((a, b) => a.f2 - b.f2);
    const mid = Math.floor(f2Candidates.length / 2);
    const medianF2 =
      f2Candidates.length % 2 === 1
        ? f2Candidates[mid].f2
        : 0.5 * (f2Candidates[mid - 1].f2 + f2Candidates[mid].f2);
    const medianF = Math.sqrt(Math.max(100, medianF2));

    // Weighted least-squares average of inliers within 25% of medianF
    let weightedSumF2 = 0;
    let weightTotal = 0;
    for (const c of f2Candidates) {
      const fVal = Math.sqrt(Math.max(100, c.f2));
      if (Math.abs(fVal - medianF) <= 0.25 * medianF) {
        weightedSumF2 += c.f2 * c.weight;
        weightTotal += c.weight;
      }
    }

    if (weightTotal > 0) {
      return Math.sqrt(Math.max(100, weightedSumF2 / weightTotal));
    }
    return medianF;
  };

  const initialHomographies = validViews.map((v) => v.H);
  const fInit =
    estimateFocalFromHomographies(initialHomographies, defaultCx, defaultCy) ??
    computeFocalLengthFromHfov(w, 60);

  let fx = fInit;
  let fy = fInit;
  let cx = defaultCx;
  let cy = defaultCy;
  let k1 = 0;
  let k2 = 0;

  // 3. Recover initial extrinsic pose [rvec, tvec] for each view from H_i and K
  interface ViewExtrinsics {
    rx: number;
    ry: number;
    rz: number;
    tx: number;
    ty: number;
    tz: number;
  }

  const extrinsics: ViewExtrinsics[] = validViews.map(({ H }) => {
    const h1 = [(H[0][0] - cx * H[2][0]) / fx, (H[1][0] - cy * H[2][0]) / fy, H[2][0]];
    const h2 = [(H[0][1] - cx * H[2][1]) / fx, (H[1][1] - cy * H[2][1]) / fy, H[2][1]];
    const h3 = [(H[0][2] - cx * H[2][2]) / fx, (H[1][2] - cy * H[2][2]) / fy, H[2][2]];

    const norm1 = Math.hypot(h1[0], h1[1], h1[2]);
    const norm2 = Math.hypot(h2[0], h2[1], h2[2]);
    const scale = 2 / Math.max(1e-9, norm1 + norm2);

    // Ensure positive Z depth in front of camera
    const sign = h3[2] < 0 ? -1 : 1;
    const s = scale * sign;

    const r1 = [h1[0] * s, h1[1] * s, h1[2] * s];
    const r2Raw = [h2[0] * s, h2[1] * s, h2[2] * s];
    const t = [h3[0] * s, h3[1] * s, Math.max(20, h3[2] * s)];

    // Gram-Schmidt orthonormalization of [r1, r2, r3]
    const r1Len = Math.max(1e-9, Math.hypot(r1[0], r1[1], r1[2]));
    const u1 = [r1[0] / r1Len, r1[1] / r1Len, r1[2] / r1Len];
    const dot12 = u1[0] * r2Raw[0] + u1[1] * r2Raw[1] + u1[2] * r2Raw[2];
    const r2Orth = [r2Raw[0] - dot12 * u1[0], r2Raw[1] - dot12 * u1[1], r2Raw[2] - dot12 * u1[2]];
    const r2Len = Math.max(1e-9, Math.hypot(r2Orth[0], r2Orth[1], r2Orth[2]));
    const u2 = [r2Orth[0] / r2Len, r2Orth[1] / r2Len, r2Orth[2] / r2Len];
    const u3 = [
      u1[1] * u2[2] - u1[2] * u2[1],
      u1[2] * u2[0] - u1[0] * u2[2],
      u1[0] * u2[1] - u1[1] * u2[0],
    ];

    const R = [
      [u1[0], u2[0], u3[0]],
      [u1[1], u2[1], u3[1]],
      [u1[2], u2[2], u3[2]],
    ];
    const [rx, ry, rz] = matrixToRodrigues(R);
    return { rx, ry, rz, tx: t[0], ty: t[1], tz: t[2] };
  });

  // Helper to project a 3D planar point (X, Y, 0) using given intrinsics and view extrinsics
  const projectPoint = (
    X: number,
    Y: number,
    ext: ViewExtrinsics,
    pFx: number,
    pFy: number,
    pCx: number,
    pCy: number,
    pK1: number,
    pK2: number
  ): { u: number; v: number; xn: number; yn: number; r2: number } => {
    const R = rodriguesToMatrix(ext.rx, ext.ry, ext.rz);
    const xc = R[0][0] * X + R[0][1] * Y + ext.tx;
    const yc = R[1][0] * X + R[1][1] * Y + ext.ty;
    const zc = Math.max(1e-4, R[2][0] * X + R[2][1] * Y + ext.tz);
    const xn = xc / zc;
    const yn = yc / zc;
    const r2 = xn * xn + yn * yn;
    const radial = 1 + pK1 * r2 + pK2 * r2 * r2;
    return {
      u: pFx * xn * radial + pCx,
      v: pFy * yn * radial + pCy,
      xn,
      yn,
      r2,
    };
  };

  // 4. Alternating Levenberg-Marquardt refinement of per-view extrinsics and global intrinsics (f, cx, cy, k1, k2)
  const eps = 1e-5;
  for (let outerIter = 0; outerIter < 12; outerIter++) {
    // 4a. Refine each view's 6-DOF extrinsics (rx, ry, rz, tx, ty, tz) holding intrinsics fixed
    for (let vIdx = 0; vIdx < validViews.length; vIdx++) {
      const pts = validViews[vIdx].obs.correspondences;
      let ext = extrinsics[vIdx];

      for (let eIter = 0; eIter < 4; eIter++) {
        const JtJ = Array.from({ length: 6 }, () => Array(6).fill(0));
        const Jtr = Array(6).fill(0);

        for (const p of pts) {
          const base = projectPoint(p.worldX, p.worldY, ext, fx, fy, cx, cy, k1, k2);
          const errU = p.imageX - base.u;
          const errV = p.imageY - base.v;

          const params = [ext.rx, ext.ry, ext.rz, ext.tx, ext.ty, ext.tz];
          const dU = Array(6).fill(0);
          const dV = Array(6).fill(0);

          for (let k = 0; k < 6; k++) {
            const pPlus = [...params];
            pPlus[k] += eps;
            const projPlus = projectPoint(
              p.worldX,
              p.worldY,
              {
                rx: pPlus[0],
                ry: pPlus[1],
                rz: pPlus[2],
                tx: pPlus[3],
                ty: pPlus[4],
                tz: pPlus[5],
              },
              fx,
              fy,
              cx,
              cy,
              k1,
              k2
            );
            dU[k] = (projPlus.u - base.u) / eps;
            dV[k] = (projPlus.v - base.v) / eps;
          }

          for (let i = 0; i < 6; i++) {
            Jtr[i] += dU[i] * errU + dV[i] * errV;
            for (let j = 0; j < 6; j++) {
              JtJ[i][j] += dU[i] * dU[j] + dV[i] * dV[j];
            }
          }
        }

        for (let i = 0; i < 6; i++) JtJ[i][i] += 1e-2;
        const delta = solveLinearSystem(JtJ, Jtr);
        if (!delta) break;

        ext = {
          rx: ext.rx + delta[0],
          ry: ext.ry + delta[1],
          rz: ext.rz + delta[2],
          tx: ext.tx + delta[3],
          ty: ext.ty + delta[4],
          tz: Math.max(20, ext.tz + delta[5]),
        };
      }
      extrinsics[vIdx] = ext;
    }

    // 4b. Refine global intrinsics [fx, fy, cx, cy, k1, k2] across all views,
    // coupling each view's tz proportionally to (fx + fy)/2 so f is solved from perspective
    // foreshortening rather than locked against fixed tz.
    const JtJ = Array.from({ length: 6 }, () => Array(6).fill(0));
    const Jtr = Array(6).fill(0);
    const fMeanBase = 0.5 * (fx + fy);
    const fEps = 1e-3;

    for (let vIdx = 0; vIdx < validViews.length; vIdx++) {
      const pts = validViews[vIdx].obs.correspondences;
      const ext = extrinsics[vIdx];

      for (const p of pts) {
        const base = projectPoint(p.worldX, p.worldY, ext, fx, fy, cx, cy, k1, k2);
        const errU = p.imageX - base.u;
        const errV = p.imageY - base.v;

        // Coupled focal derivatives: scale tz proportionally with f so 0th-order scale f/tz is invariant
        const extFxPlus: ViewExtrinsics = {
          ...ext,
          tz: ext.tz * ((fx + fEps) / fx),
        };
        const projFxPlus = projectPoint(p.worldX, p.worldY, extFxPlus, fx + fEps, fy, cx, cy, k1, k2);

        const extFyPlus: ViewExtrinsics = {
          ...ext,
          tz: ext.tz * ((fy + fEps) / fy),
        };
        const projFyPlus = projectPoint(p.worldX, p.worldY, extFyPlus, fx, fy + fEps, cx, cy, k1, k2);

        const dU = [
          (projFxPlus.u - base.u) / fEps,
          (projFyPlus.u - base.u) / fEps,
          1,
          0,
          fx * base.xn * base.r2,
          fx * base.xn * base.r2 * base.r2,
        ];
        const dV = [
          (projFxPlus.v - base.v) / fEps,
          (projFyPlus.v - base.v) / fEps,
          0,
          1,
          fy * base.yn * base.r2,
          fy * base.yn * base.r2 * base.r2,
        ];

        for (let i = 0; i < 6; i++) {
          Jtr[i] += dU[i] * errU + dV[i] * errV;
          for (let j = 0; j < 6; j++) {
            JtJ[i][j] += dU[i] * dU[j] + dV[i] * dV[j];
          }
        }
      }
    }

    // Regularize square pixels (fx ≈ fy), principal point near center, and mild distortion prior
    const lambdaSquare = 50.0;
    JtJ[0][0] += lambdaSquare + 1e-2;
    JtJ[1][1] += lambdaSquare + 1e-2;
    JtJ[0][1] -= lambdaSquare;
    JtJ[1][0] -= lambdaSquare;
    Jtr[0] += lambdaSquare * (fy - fx) * 0.5;
    Jtr[1] += lambdaSquare * (fx - fy) * 0.5;

    // Principal point prior around image center
    JtJ[2][2] += 2.5;
    JtJ[3][3] += 2.5;
    Jtr[2] += 2.5 * (defaultCx - cx);
    Jtr[3] += 2.5 * (defaultCy - cy);

    // Distortion damping
    JtJ[4][4] += 1.0;
    JtJ[5][5] += 5.0;

    const deltaI = solveLinearSystem(JtJ, Jtr);
    if (deltaI) {
      const nextFx = Math.max(w * 0.3, Math.min(w * 3.0, fx + deltaI[0] * 0.7));
      const nextFy = Math.max(w * 0.3, Math.min(w * 3.0, fy + deltaI[1] * 0.7));
      const fScale = (0.5 * (nextFx + nextFy)) / Math.max(1e-6, fMeanBase);
      for (let vIdx = 0; vIdx < extrinsics.length; vIdx++) {
        extrinsics[vIdx].tz = Math.max(20, extrinsics[vIdx].tz * fScale);
      }
      fx = nextFx;
      fy = nextFy;
      cx = Math.max(w * 0.25, Math.min(w * 0.75, cx + deltaI[2] * 0.5));
      cy = Math.max(h * 0.25, Math.min(h * 0.75, cy + deltaI[3] * 0.5));
      k1 = Math.max(-0.6, Math.min(0.6, k1 + deltaI[4] * 0.8));
      k2 = Math.max(-0.8, Math.min(0.8, k2 + deltaI[5] * 0.8));
    }

    // 4c. Re-estimate undistorted planar homographies using current (k1, k2, cx, cy)
    // to eliminate radial-distortion bias from the Zhang homography focal length
    const undistortedHomographies: number[][][] = [];
    for (const { obs } of validViews) {
      const undistCorr: CalibrationPointCorrespondence[] = obs.correspondences.map((pt) => {
        const uPt = undistortPixelPoint(pt.imageX, pt.imageY, fx, fy, cx, cy, k1, k2);
        return {
          ...pt,
          imageX: uPt.x,
          imageY: uPt.y,
        };
      });
      const H_undist = estimatePlanarHomography(undistCorr);
      if (H_undist) {
        undistortedHomographies.push(H_undist);
      }
    }
    const fUndist = estimateFocalFromHomographies(undistortedHomographies, cx, cy);
    if (fUndist !== null && Number.isFinite(fUndist)) {
      const fCurr = 0.5 * (fx + fy);
      const fBlended = 0.65 * fUndist + 0.35 * fCurr;
      const scaleRatio = fBlended / Math.max(1e-6, fCurr);
      fx *= scaleRatio;
      fy *= scaleRatio;
      for (let vIdx = 0; vIdx < extrinsics.length; vIdx++) {
        extrinsics[vIdx].tz = Math.max(20, extrinsics[vIdx].tz * scaleRatio);
      }
    }
  }

  // Final extrinsic polish pass holding solved intrinsics fixed
  for (let vIdx = 0; vIdx < validViews.length; vIdx++) {
    const pts = validViews[vIdx].obs.correspondences;
    let ext = extrinsics[vIdx];
    for (let eIter = 0; eIter < 3; eIter++) {
      const JtJ = Array.from({ length: 6 }, () => Array(6).fill(0));
      const Jtr = Array(6).fill(0);
      for (const p of pts) {
        const base = projectPoint(p.worldX, p.worldY, ext, fx, fy, cx, cy, k1, k2);
        const errU = p.imageX - base.u;
        const errV = p.imageY - base.v;
        const params = [ext.rx, ext.ry, ext.rz, ext.tx, ext.ty, ext.tz];
        const dU = Array(6).fill(0);
        const dV = Array(6).fill(0);
        for (let k = 0; k < 6; k++) {
          const pPlus = [...params];
          pPlus[k] += eps;
          const projPlus = projectPoint(
            p.worldX,
            p.worldY,
            {
              rx: pPlus[0],
              ry: pPlus[1],
              rz: pPlus[2],
              tx: pPlus[3],
              ty: pPlus[4],
              tz: pPlus[5],
            },
            fx,
            fy,
            cx,
            cy,
            k1,
            k2
          );
          dU[k] = (projPlus.u - base.u) / eps;
          dV[k] = (projPlus.v - base.v) / eps;
        }
        for (let i = 0; i < 6; i++) {
          Jtr[i] += dU[i] * errU + dV[i] * errV;
          for (let j = 0; j < 6; j++) {
            JtJ[i][j] += dU[i] * dU[j] + dV[i] * dV[j];
          }
        }
      }
      for (let i = 0; i < 6; i++) JtJ[i][i] += 1e-2;
      const delta = solveLinearSystem(JtJ, Jtr);
      if (!delta) break;
      ext = {
        rx: ext.rx + delta[0],
        ry: ext.ry + delta[1],
        rz: ext.rz + delta[2],
        tx: ext.tx + delta[3],
        ty: ext.ty + delta[4],
        tz: Math.max(20, ext.tz + delta[5]),
      };
    }
    extrinsics[vIdx] = ext;
  }

  // 5. Compute final reprojection RMS in pixels and image coverage percentage
  let sqErrSum = 0;
  let totalPoints = 0;
  let minU = w;
  let maxU = 0;
  let minV = h;
  let maxV = 0;

  for (let vIdx = 0; vIdx < validViews.length; vIdx++) {
    const pts = validViews[vIdx].obs.correspondences;
    const ext = extrinsics[vIdx];
    for (const p of pts) {
      const proj = projectPoint(p.worldX, p.worldY, ext, fx, fy, cx, cy, k1, k2);
      const du = p.imageX - proj.u;
      const dv = p.imageY - proj.v;
      sqErrSum += du * du + dv * dv;
      totalPoints++;
      if (p.imageX < minU) minU = p.imageX;
      if (p.imageX > maxU) maxU = p.imageX;
      if (p.imageY < minV) minV = p.imageY;
      if (p.imageY > maxV) maxV = p.imageY;
    }
  }

  const reprojectionRmsPx =
    totalPoints > 0 ? Number(Math.sqrt(sqErrSum / totalPoints).toFixed(3)) : 99.9;
  const spanW = Math.max(0, Math.min(w, maxU) - Math.max(0, minU));
  const spanH = Math.max(0, Math.min(h, maxV) - Math.max(0, minV));
  const coveragePct = Number(Math.min(100, ((spanW * spanH) / (w * h)) * 100).toFixed(1));
  const hfovDeg = Number(((2 * Math.atan(w / (2 * fx)) * 180) / Math.PI).toFixed(1));

  const verdict: CalibrationStepVerdict =
    reprojectionRmsPx < 1.0 && acceptedFrames.length >= MIN_FRAMES_FOR_INTRINSIC_SOLVE
      ? 'PASS'
      : reprojectionRmsPx <= 2.0
      ? 'WARN'
      : 'FAIL';

  return {
    verdict,
    acceptedFramesCount: acceptedFrames.length,
    totalPointsUsed: totalPoints,
    fx: Number(fx.toFixed(2)),
    fy: Number(fy.toFixed(2)),
    cx: Number(cx.toFixed(2)),
    cy: Number(cy.toFixed(2)),
    k1: Number(k1.toFixed(5)),
    k2: Number(k2.toFixed(5)),
    hfovDeg,
    reprojectionRmsPx,
    coveragePct,
    summary: `fx=${fx.toFixed(1)} px, fy=${fy.toFixed(1)} px, cx=${cx.toFixed(1)}, cy=${cy.toFixed(1)}, k1=${k1.toFixed(4)}, k2=${k2.toFixed(4)} · RMS: ${reprojectionRmsPx} px · Coverage: ${coveragePct}% (${acceptedFrames.length} frames)`,
  };
}

/**
 * Generates synthetic calibration card frames with known ground-truth intrinsics
 * (fx, fy, cx, cy, k1, k2) across diverse 3D poses for automated verification tests.
 */
export function generateSyntheticCalibrationCardFrames(params: {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  k1: number;
  k2: number;
  frameCount?: number;
  noiseStdPx?: number;
}): CalibrationCardFrameObservation[] {
  const count = params.frameCount ?? 12;
  const noise = params.noiseStdPx ?? 0;
  const frames: CalibrationCardFrameObservation[] = [];

  for (let i = 0; i < count; i++) {
    // Deterministic diverse angles and translations covering the image frame
    const rx = ((i % 3) - 1) * 0.28 + (i % 2 === 0 ? 0.09 : -0.07);
    const ry = (Math.floor(i / 3) - 1.5) * 0.24 + (i % 2 === 1 ? 0.08 : -0.06);
    const rz = (i - count * 0.5) * 0.12;
    const tx = ((i % 4) - 1.5) * 32; // -48..+48 mm lateral shift
    const ty = (Math.floor(i / 4) - 1) * 24; // -24..+24 mm vertical shift
    const tz = 240 + (i % 5) * 35; // 240..380 mm depth

    const R = rodriguesToMatrix(rx, ry, rz);
    const markers: Array<{ id: number; corners: Array<{ x: number; y: number }> }> = [];

    for (const id of CALIBRATION_CARD_MARKER_IDS) {
      const worldCorners = getCalibrationCardMarkerWorldCornersMm(id);
      if (!worldCorners) continue;

      const corners = worldCorners.map((pt, cIdx) => {
        const xc = R[0][0] * pt.x + R[0][1] * pt.y + tx;
        const yc = R[1][0] * pt.x + R[1][1] * pt.y + ty;
        const zc = R[2][0] * pt.x + R[2][1] * pt.y + tz;
        const xn = xc / zc;
        const yn = yc / zc;
        const r2 = xn * xn + yn * yn;
        const radial = 1 + params.k1 * r2 + params.k2 * r2 * r2;
        // Deterministic pseudo-noise if requested
        const nU = noise > 0 ? Math.sin(i * 31 + id * 7 + cIdx * 3) * noise : 0;
        const nV = noise > 0 ? Math.cos(i * 29 + id * 11 + cIdx * 5) * noise : 0;
        return {
          x: params.fx * xn * radial + params.cx + nU,
          y: params.fy * yn * radial + params.cy + nV,
        };
      });

      markers.push({ id, corners });
    }

    frames.push(evaluateCalibrationCardFrame(markers, i));
  }

  return frames;
}

export type ActiveScaleSource = 'RIM_MARKER' | 'CALIBRATION_CARD_MARKER' | 'IPD_FALLBACK';

export interface LiveMarkerDistanceResult {
  markerDistanceAvailable: boolean;
  distanceCm: number | null;
  uncertaintyCm: number | null;
  scaleSource: ActiveScaleSource;
  scaleSourceLabel: 'scale: rim marker' | 'scale: calibration marker' | 'scale: IPD, lower confidence';
  markersUsedIds: number[];
  meanMarkerSidePx: number | null;
}

/**
 * Undistorts a single pixel point (u, v) using calibrated (fx, fy, cx, cy, k1, k2).
 */
function undistortPixelPoint(
  u: number,
  v: number,
  fx: number,
  fy: number,
  cx: number,
  cy: number,
  k1: number = 0,
  k2: number = 0
): { x: number; y: number } {
  if (Math.abs(k1) < 1e-7 && Math.abs(k2) < 1e-7) return { x: u, y: v };
  const xd = (u - cx) / fx;
  const yd = (v - cy) / fy;
  let x = xd;
  let y = yd;
  for (let i = 0; i < 5; i++) {
    const r2 = x * x + y * y;
    const radial = 1 + k1 * r2 + k2 * r2 * r2;
    x = xd / Math.max(0.2, radial);
    y = yd / Math.max(0.2, radial);
  }
  return { x: x * fx + cx, y: y * fy + cy };
}

/**
 * Step (c): Whenever a rim marker (IDs 3-10, 6.5 mm) or calibration card marker (IDs 20-28, 12.0 mm)
 * is visible, computes live camera distance from marker pixel size using the calibrated focal length,
 * along with its uncertainty (± cm) and active scale source label.
 */
export function computeLiveMarkerDistance(
  markers: Array<Pick<MarkerPose, 'id' | 'corners'>>,
  settings: CameraCalibrationSettings = DEFAULT_CAMERA_CALIBRATION,
  videoWidth: number = 1280,
  videoHeight: number = 720
): LiveMarkerDistanceResult {
  const fx =
    settings.fx && settings.fx > 100
      ? settings.fx
      : computeFocalLengthFromHfov(videoWidth || 1280, settings.hfovDeg || 60);
  const fy = settings.fy && settings.fy > 100 ? settings.fy : fx;
  const fMean = 0.5 * (fx + fy);
  const cx = settings.cx ?? (videoWidth || 1280) * 0.5;
  const cy = settings.cy ?? (videoHeight || 720) * 0.5;
  const k1 = settings.k1 ?? 0;
  const k2 = settings.k2 ?? 0;

  const rimMarkers = (markers || []).filter((m) => m.id >= 3 && m.id <= 10 && m.corners?.length === 4);
  const cardMarkers = (markers || []).filter((m) => m.id >= 20 && m.id <= 28 && m.corners?.length === 4);

  const activeGroup = rimMarkers.length > 0 ? rimMarkers : cardMarkers;
  const physicalSizeMm =
    rimMarkers.length > 0 ? RIM_MARKER_SIZE_MM : CALIBRATION_CARD_MARKER_SIZE_MM;
  const scaleSource: ActiveScaleSource =
    rimMarkers.length > 0
      ? 'RIM_MARKER'
      : cardMarkers.length > 0
      ? 'CALIBRATION_CARD_MARKER'
      : 'IPD_FALLBACK';
  const scaleSourceLabel =
    scaleSource === 'RIM_MARKER'
      ? 'scale: rim marker'
      : scaleSource === 'CALIBRATION_CARD_MARKER'
      ? 'scale: calibration marker'
      : 'scale: IPD, lower confidence';

  if (activeGroup.length === 0) {
    return {
      markerDistanceAvailable: false,
      distanceCm: null,
      uncertaintyCm: null,
      scaleSource: 'IPD_FALLBACK',
      scaleSourceLabel: 'scale: IPD, lower confidence',
      markersUsedIds: [],
      meanMarkerSidePx: null,
    };
  }

  const perMarkerDistancesCm: number[] = [];
  const perMarkerSidesPx: number[] = [];
  const markersUsedIds: number[] = [];

  for (const m of activeGroup) {
    const c = m.corners.map((pt) => undistortPixelPoint(pt.x, pt.y, fx, fy, cx, cy, k1, k2));
    const s0 = Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y);
    const s1 = Math.hypot(c[2].x - c[1].x, c[2].y - c[1].y);
    const s2 = Math.hypot(c[3].x - c[2].x, c[3].y - c[2].y);
    const s3 = Math.hypot(c[0].x - c[3].x, c[0].y - c[3].y);

    // Use mean of the two longer opposite edges to compensate for mild out-of-plane yaw/pitch foreshortening
    const horizMean = 0.5 * (s0 + s2);
    const vertMean = 0.5 * (s1 + s3);
    const effectiveSidePx = Math.max(horizMean, vertMean, 0.25 * (s0 + s1 + s2 + s3));

    if (effectiveSidePx > 3) {
      const distMm = (fMean * physicalSizeMm) / effectiveSidePx;
      const distCm = (distMm / 10) * (settings.scaleFactor || 1.0);
      perMarkerDistancesCm.push(distCm);
      perMarkerSidesPx.push(effectiveSidePx);
      markersUsedIds.push(m.id);
    }
  }

  if (perMarkerDistancesCm.length === 0) {
    return {
      markerDistanceAvailable: false,
      distanceCm: null,
      uncertaintyCm: null,
      scaleSource: 'IPD_FALLBACK',
      scaleSourceLabel: 'scale: IPD, lower confidence',
      markersUsedIds: [],
      meanMarkerSidePx: null,
    };
  }

  const meanDistCm =
    perMarkerDistancesCm.reduce((acc, v) => acc + v, 0) / perMarkerDistancesCm.length;
  const meanSidePx =
    perMarkerSidesPx.reduce((acc, v) => acc + v, 0) / perMarkerSidesPx.length;

  // Sub-pixel quantization uncertainty (~0.45 px corner localization) + inter-marker standard deviation
  const subPixelRelErr = 0.45 / Math.max(4, meanSidePx);
  let spreadVar = 0;
  if (perMarkerDistancesCm.length > 1) {
    for (const d of perMarkerDistancesCm) {
      spreadVar += (d - meanDistCm) * (d - meanDistCm);
    }
    spreadVar /= perMarkerDistancesCm.length;
  }
  const uncertaintyCm = Number(
    Math.max(0.2, Math.hypot(meanDistCm * subPixelRelErr, Math.sqrt(spreadVar))).toFixed(1)
  );

  return {
    markerDistanceAvailable: true,
    distanceCm: Number(meanDistCm.toFixed(1)),
    uncertaintyCm,
    scaleSource,
    scaleSourceLabel,
    markersUsedIds: Array.from(new Set(markersUsedIds)).sort((a, b) => a - b),
    meanMarkerSidePx: Number(meanSidePx.toFixed(1)),
  };
}

/**
 * Formats the truthful IPD status string required by Requirement 2:
 * Shows "IPD: assumed 63 mm (not measured)" until the user explicitly types a measured value.
 */
export function formatIpdStatusText(settings: CameraCalibrationSettings): {
  text: string;
  isAssumed: boolean;
} {
  const ipd = Number((settings.patientIpdMm || 63).toFixed(1));
  const isAssumed = !settings.ipdIsMeasured;
  if (isAssumed) {
    return {
      text: `IPD: assumed ${ipd % 1 === 0 ? ipd.toFixed(0) : ipd} mm (not measured)`,
      isAssumed: true,
    };
  }
  return {
    text: `IPD: measured ${ipd} mm`,
    isAssumed: false,
  };
}

/**
 * Builds the per-camera-label + resolution storage key.
 */
export function getCameraResolutionStorageKey(
  deviceLabel: string,
  width: number,
  height: number
): string {
  const cleanLabel = (deviceLabel || 'default_camera').trim().toLowerCase() || 'default_camera';
  return `${CALIBRATION_PER_DEVICE_PREFIX}${cleanLabel}::${Math.round(width || 0)}x${Math.round(height || 0)}`;
}

/**
 * Load persisted calibration settings or return defaults.
 */
export function loadCameraCalibration(): CameraCalibrationSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_CAMERA_CALIBRATION };
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CAMERA_CALIBRATION };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CAMERA_CALIBRATION,
      ...parsed,
      ipdIsMeasured: Boolean(parsed?.ipdIsMeasured),
    };
  } catch {
    return { ...DEFAULT_CAMERA_CALIBRATION };
  }
}

/**
 * Loads calibration for a specific camera label + resolution, or invalidates calibration
 * if the camera label or resolution changed and has not been calibrated yet.
 */
export function loadCameraCalibrationForDevice(
  deviceLabel: string,
  width: number,
  height: number,
  currentSettings: CameraCalibrationSettings = DEFAULT_CAMERA_CALIBRATION,
  storage?: Pick<Storage, 'getItem'>
): { settings: CameraCalibrationSettings; invalidated: boolean } {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  const key = getCameraResolutionStorageKey(deviceLabel, width, height);

  if (store) {
    try {
      const raw = store.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          settings: {
            ...DEFAULT_CAMERA_CALIBRATION,
            ...parsed,
            cameraDeviceLabel: deviceLabel,
            calibratedResolution: { width, height },
          },
          invalidated: false,
        };
      }
    } catch {
      // Fall through to invalidation check
    }
  }

  // Check if currentSettings was calibrated for a DIFFERENT camera or resolution
  const prevLabel = (currentSettings.cameraDeviceLabel || '').trim().toLowerCase();
  const nextLabel = (deviceLabel || '').trim().toLowerCase();
  const prevW = currentSettings.calibratedResolution?.width ?? 0;
  const prevH = currentSettings.calibratedResolution?.height ?? 0;

  const resolutionChanged = width > 0 && height > 0 && (prevW !== width || prevH !== height);
  const cameraChanged = Boolean(prevLabel && nextLabel && prevLabel !== nextLabel);

  if ((resolutionChanged || cameraChanged) && currentSettings.isCalibrated) {
    const trackProfile = detectCameraProfileFromTrack({
      deviceLabel,
      width: width || 1280,
      height: height || 720,
    });
    return {
      settings: {
        ...currentSettings,
        profile: trackProfile.profile,
        hfovDeg: trackProfile.hfovDeg,
        hfovEstimated: trackProfile.hfovEstimated,
        fx: trackProfile.fxInitial,
        fy: trackProfile.fyInitial,
        cx: (width || 1280) * 0.5,
        cy: (height || 720) * 0.5,
        k1: 0,
        k2: 0,
        reprojectionRmsPx: null,
        coveragePct: null,
        isCalibrated: false,
        cameraDeviceLabel: deviceLabel,
        calibratedResolution: { width, height },
      },
      invalidated: true,
    };
  }

  return {
    settings: {
      ...currentSettings,
      cameraDeviceLabel: deviceLabel || currentSettings.cameraDeviceLabel,
      calibratedResolution:
        width > 0 && height > 0 ? { width, height } : currentSettings.calibratedResolution,
    },
    invalidated: false,
  };
}

/**
 * Persist calibration settings both globally and under the specific camera label + resolution key.
 */
export function saveCameraCalibration(
  settings: CameraCalibrationSettings,
  storage?: Pick<Storage, 'setItem'>
): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;
  try {
    store.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(settings));
    const w = settings.calibratedResolution?.width ?? 0;
    const h = settings.calibratedResolution?.height ?? 0;
    if (w > 0 && h > 0) {
      const devKey = getCameraResolutionStorageKey(settings.cameraDeviceLabel || '', w, h);
      store.setItem(devKey, JSON.stringify(settings));
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Reset calibration to the selected or matched camera profile ("Reset to profile").
 */
export function resetCameraCalibrationToProfile(
  profile: CameraSensorProfile = 'LAPTOP_WEBCAM',
  deviceLabel: string = '',
  width: number = 1280,
  height: number = 720,
  storage?: Pick<Storage, 'removeItem' | 'setItem'>
): CameraCalibrationSettings {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  const info = CAMERA_PROFILES[profile] || CAMERA_PROFILES.LAPTOP_WEBCAM;
  const fx = computeFocalLengthFromHfov(width, info.hfovDeg);
  const reset: CameraCalibrationSettings = {
    ...DEFAULT_CAMERA_CALIBRATION,
    profile,
    hfovDeg: info.hfovDeg,
    hfovEstimated: profile === 'CUSTOM',
    fx,
    fy: fx,
    cx: width * 0.5,
    cy: height * 0.5,
    k1: 0,
    k2: 0,
    reprojectionRmsPx: null,
    coveragePct: null,
    isCalibrated: false,
    ipdIsMeasured: false,
    patientIpdMm: 63.0,
    cameraDeviceLabel: deviceLabel,
    calibratedResolution: { width, height },
  };

  if (store) {
    try {
      store.removeItem(CALIBRATION_STORAGE_KEY);
      if (width > 0 && height > 0) {
        store.removeItem(getCameraResolutionStorageKey(deviceLabel, width, height));
      }
    } catch {
      // Ignore storage errors
    }
  }
  return reset;
}

/**
 * Reset calibration to factory default
 */
export function resetCameraCalibration(): CameraCalibrationSettings {
  return resetCameraCalibrationToProfile('LAPTOP_WEBCAM', '', 1280, 720);
}

/**
 * Computes optical distance in centimeters when markers are not present,
 * falling back to IPD / face breadth with explicit active scale source metadata.
 */
export function calculateOpticalDistanceCm(
  faceWidthPx: number,
  _faceHeightPx: number,
  eyeDistancePx: number | null,
  videoWidth: number,
  _videoHeight: number,
  settings: CameraCalibrationSettings = DEFAULT_CAMERA_CALIBRATION
): {
  distanceCm: number;
  confidence: number;
  methodUsed: 'IPD_AND_FACE' | 'FACE_GEOMETRY' | 'FALLBACK';
  scaleSourceLabel: 'scale: IPD, lower confidence';
} {
  const vw = videoWidth || 1280;
  const fx =
    settings.fx && settings.fx > 100
      ? settings.fx
      : computeFocalLengthFromHfov(vw, settings.hfovDeg || 60);

  let distanceEstimateFace = 0;
  let distanceEstimateIpd = 0;
  let method: 'IPD_AND_FACE' | 'FACE_GEOMETRY' | 'FALLBACK' = 'FALLBACK';

  if (faceWidthPx > 10) {
    const faceBreadthCm = settings.faceBreadthMm / 10;
    distanceEstimateFace = (fx * faceBreadthCm) / faceWidthPx;
    method = 'FACE_GEOMETRY';
  }

  if (eyeDistancePx && eyeDistancePx > 8) {
    const ipdCm = settings.patientIpdMm / 10;
    distanceEstimateIpd = (fx * ipdCm) / eyeDistancePx;
  }

  let rawDistanceCm = 50;
  let confidence = 0.5;

  if (distanceEstimateIpd > 15 && distanceEstimateFace > 15) {
    rawDistanceCm = distanceEstimateIpd * 0.6 + distanceEstimateFace * 0.4;
    confidence = settings.ipdIsMeasured ? 0.9 : 0.72;
    method = 'IPD_AND_FACE';
  } else if (distanceEstimateFace > 15) {
    rawDistanceCm = distanceEstimateFace;
    confidence = 0.7;
    method = 'FACE_GEOMETRY';
  } else if (distanceEstimateIpd > 15) {
    rawDistanceCm = distanceEstimateIpd;
    confidence = settings.ipdIsMeasured ? 0.85 : 0.68;
    method = 'IPD_AND_FACE';
  } else {
    rawDistanceCm = 50;
    confidence = 0.3;
    method = 'FALLBACK';
  }

  const scaledDistanceCm = rawDistanceCm * (settings.scaleFactor || 1.0);
  const finalDistanceCm = Math.round(Math.max(20, Math.min(120, scaledDistanceCm)));

  return {
    distanceCm: finalDistanceCm,
    confidence,
    methodUsed: method,
    scaleSourceLabel: 'scale: IPD, lower confidence',
  };
}

/**
 * 1-Click Calibration at known reference distance (kept under Manual override).
 */
export function calibrateAtKnownDistance(
  currentRawDistanceCm: number,
  targetDistanceCm: number = 50,
  currentSettings: CameraCalibrationSettings = DEFAULT_CAMERA_CALIBRATION
): CameraCalibrationSettings {
  if (currentRawDistanceCm <= 0 || targetDistanceCm <= 0) return currentSettings;

  const rawBase = currentRawDistanceCm / (currentSettings.scaleFactor || 1.0);
  const newScale = targetDistanceCm / Math.max(10, rawBase);

  const updated: CameraCalibrationSettings = {
    ...currentSettings,
    scaleFactor: Number(newScale.toFixed(3)),
    isCalibrated: true,
    calibrationDate: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    calibratedDistanceRefCm: targetDistanceCm,
  };

  saveCameraCalibration(updated);
  return updated;
}
