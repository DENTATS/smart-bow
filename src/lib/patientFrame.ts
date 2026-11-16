/**
 * Patient Coordinate Frame & MediaPipe 468 Landmark Mathematics
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import { Point3D, FacialBiometrics } from '../types/smartbow';

export interface Matrix4 {
  elements: number[]; // 16 elements in row-major order: [r0c0, r0c1, r0c2, r0c3, ...]
}

export function createIdentityMatrix(): Matrix4 {
  return {
    elements: [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]
  };
}

export function vecNormalize(v: Point3D): Point3D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function vecSubtract(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vecAdd(a: Point3D, b: Point3D): Point3D {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vecScale(v: Point3D, s: number): Point3D {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vecCross(a: Point3D, b: Point3D): Point3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

export function vecDot(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vecDistance(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Invert a 4x4 rigid body transformation matrix [R | t; 0 0 0 1]
 * Inv(T) = [R^T | -R^T * t; 0 0 0 1]
 */
export function invertRigidMatrix(m: Matrix4): Matrix4 {
  const e = m.elements;
  // Rotation submatrix
  const r00 = e[0], r01 = e[1], r02 = e[2];
  const r10 = e[4], r11 = e[5], r12 = e[6];
  const r20 = e[8], r21 = e[9], r22 = e[10];

  // Translation
  const tx = e[3], ty = e[7], tz = e[11];

  // Transpose of R
  const invR00 = r00, invR01 = r10, invR02 = r20;
  const invR10 = r01, invR11 = r11, invR12 = r21;
  const invR20 = r02, invR21 = r12, invR22 = r22;

  // -R^T * t
  const invTx = -(invR00 * tx + invR01 * ty + invR02 * tz);
  const invTy = -(invR10 * tx + invR11 * ty + invR12 * tz);
  const invTz = -(invR20 * tx + invR21 * ty + invR22 * tz);

  return {
    elements: [
      invR00, invR01, invR02, invTx,
      invR10, invR11, invR12, invTy,
      invR20, invR21, invR22, invTz,
      0,      0,      0,      1
    ]
  };
}

/**
 * Multiply two 4x4 transformation matrices: C = A * B
 * Row-major order.
 */
export function multiplyRigidMatrices(a: Matrix4, b: Matrix4): Matrix4 {
  const ae = a.elements;
  const be = b.elements;
  const out = new Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      out[r * 4 + c] = 
        ae[r * 4 + 0] * be[0 * 4 + c] +
        ae[r * 4 + 1] * be[1 * 4 + c] +
        ae[r * 4 + 2] * be[2 * 4 + c] +
        ae[r * 4 + 3] * be[3 * 4 + c];
    }
  }
  return { elements: out };
}

/**
 * Transform 3D point by 4x4 matrix
 */
export function transformPoint(m: Matrix4, p: Point3D): Point3D {
  const e = m.elements;
  return {
    x: e[0] * p.x + e[1] * p.y + e[2] * p.z + e[3],
    y: e[4] * p.x + e[5] * p.y + e[6] * p.z + e[7],
    z: e[8] * p.x + e[9] * p.y + e[10] * p.z + e[11]
  };
}

/**
 * Documented Contactless Cranial Patient Frame Convention
 * No skin-adhesive ArUco markers are placed on the patient's face.
 * Landmarks come from natural facial anatomy (MediaPipe Face Mesh topology):
 *  - #10  : Glabella (superior forehead midline)
 *  - #234 : Right Zygion / Zygomatic arch (patient's anatomical right)
 *  - #454 : Left Zygion / Zygomatic arch (patient's anatomical left)
 *  - #33  : Right lateral canthus
 *  - #263 : Left lateral canthus
 *  - #168 : Nasion / Sellion bridge
 *  - #1   : Subnasale / nasal tip base
 *  - #152 : Menton (used for 2D facial vertical thirds, NOT rigid cranial pose)
 *
 * Right-Handed Coordinate Convention:
 *  - Origin: Mid-zygomatic centroid = (P_234 + P_454) / 2
 *  - +X: Inter-zygomatic lateral axis (normalized(P_234 - P_454), pointing patient-right)
 *  - +Z: Superior cranial axis (Gram-Schmidt orthogonalized(P_10 - Origin), pointing up)
 *  - +Y: Anterior-posterior cranial normal (Z × X, right-handed)
 */
export const PATIENT_FRAME_CONVENTION = {
  method: 'CONTACTLESS_NATURAL_ANATOMY' as const,
  usesSkinArucoMarkers: false,
  cranialLandmarks: {
    glabella: 10,
    nasion: 168,
    rightZygoma: 234,
    leftZygoma: 454,
    rightOuterCanthus: 33,
    leftOuterCanthus: 263,
    subnasale: 1,
    menton: 152,
  },
  axes: {
    origin: 'Midpoint of Right (#234) and Left (#454) Zygomatic landmarks',
    xAxis: 'Lateral vector normalized(P_234 - P_454) (orthogonalized)',
    yAxis: 'Anterior-posterior normal vector (Z x X, right-handed)',
    zAxis: 'Superior vector normalized(P_10 - Origin)',
  },
} as const;

/**
 * Canonical rigid upper/mid-face 3D anthropometric model (meters) relative to mid-zygomatic origin.
 * Nominal adult baseline scaled cleanly when patient IPD / bizygomatic breadth are calibrated:
 *  - Default bizygomatic breadth = 0.140 m (X = ±0.070 m)
 *  - Default outer canthal span  = 0.094 m (X = ±0.047 m)
 */
export const CANONICAL_3D_FACE_MODEL_M: Record<number, Point3D> = {
  // X = patient right (+0.070) to left (-0.070), Y = anterior (+), Z = superior (+)
  234: { x: 0.070, y: 0.000, z: 0.000 },   // Right Zygoma
  454: { x: -0.070, y: 0.000, z: 0.000 },  // Left Zygoma
  10:  { x: 0.000, y: 0.022, z: 0.068 },   // Glabella
  168: { x: 0.000, y: 0.028, z: 0.040 },   // Nasion
  33:  { x: 0.047, y: 0.018, z: 0.036 },   // Right outer canthus
  263: { x: -0.047, y: 0.018, z: 0.036 },  // Left outer canthus
  1:   { x: 0.000, y: 0.044, z: -0.014 },  // Subnasale / nasal tip anchor
};

export interface CalibratedFacialPose3DResult {
  metricDepthAvailable: boolean;
  poseMethod: 'CALIBRATED_3D_MODEL_PNP' | 'UNAVAILABLE_2D_ONLY';
  T_patient: Matrix4 | null;
  tvec: [number, number, number] | null;
  rvec: [number, number, number] | null;
  depthMeters: number | null;
  reprojectionErrorPx: number | null;
  warning: string;
}

/**
 * Build Patient Coordinate Frame from normalized 2D/relative-Z facial landmarks.
 * NOTE: Unless paired with calibrated intrinsics and estimateFacialPose3D(),
 * pixel/relative-Z outputs are non-metric image-space basis vectors only.
 */
export function buildPatientFrame(landmarks: Array<{ x: number; y: number; z: number }>, width: number, height: number): {
  T_patient: Matrix4;
  origin: Point3D;
  xAxis: Point3D;
  yAxis: Point3D;
  zAxis: Point3D;
  isMetricDepth: false;
} {
  const pt = (id: number): Point3D => {
    const lm = landmarks[id] || { x: 0.5, y: 0.5, z: 0 };
    return {
      x: lm.x * width,
      y: lm.y * height,
      z: (lm.z || 0) * width
    };
  };

  const pGlabella = pt(10);  // #10 Glabella
  const pRZygoma = pt(234);  // #234 Right zygomatic arch
  const pLZygoma = pt(454);  // #454 Left zygomatic arch

  const origin = vecScale(vecAdd(pRZygoma, pLZygoma), 0.5);

  let x = vecNormalize(vecSubtract(pRZygoma, pLZygoma));
  let z = vecNormalize(vecSubtract(pGlabella, origin));
  const y = vecNormalize(vecCross(z, x));
  x = vecNormalize(vecCross(y, z)); // Re-orthogonalize

  const T_patient: Matrix4 = {
    elements: [
      x.x, y.x, z.x, origin.x,
      x.y, y.y, z.y, origin.y,
      x.z, y.z, z.z, origin.z,
      0,   0,   0,   1
    ]
  };

  return { T_patient, origin, xAxis: x, yAxis: y, zAxis: z, isMetricDepth: false };
}

function rodriguesMatrix(rx: number, ry: number, rz: number): number[] {
  const theta = Math.hypot(rx, ry, rz);
  if (theta < 1e-9) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  const kx = rx / theta, ky = ry / theta, kz = rz / theta;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const v = 1 - c;
  return [
    kx * kx * v + c,       kx * ky * v - kz * s, kx * kz * v + ky * s,
    ky * kx * v + kz * s,  ky * ky * v + c,      ky * kz * v - kx * s,
    kz * kx * v - ky * s,  kz * ky * v + kx * s, kz * kz * v + c,
  ];
}

function solveLinear6x6(A: number[][], b: number[]): number[] | null {
  const n = 6;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const diag = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= diag;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map(row => row[n]);
}

/**
 * Estimates 3D metric pose of the patient cranial frame using a calibrated pinhole camera
 * and a documented 3D facial anthropometric model (Gauss-Newton iterative PnP).
 *
 * Strictly returns metricDepthAvailable = false if camera intrinsics are uncalibrated
 * or landmarks are incomplete — never invents metric depth from uncalibrated 2D points.
 */
export function estimateFacialPose3D(
  landmarks: Array<{ x: number; y: number; z: number }>,
  imageWidth: number,
  imageHeight: number,
  calibration: { isCalibrated: boolean; fx: number; fy: number; cx?: number; cy?: number },
  faceBreadthMm: number = 140.0
): CalibratedFacialPose3DResult {
  if (!calibration || !calibration.isCalibrated || calibration.fx <= 0 || calibration.fy <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return {
      metricDepthAvailable: false,
      poseMethod: 'UNAVAILABLE_2D_ONLY',
      T_patient: null,
      tvec: null,
      rvec: null,
      depthMeters: null,
      reprojectionErrorPx: null,
      warning: 'Camera intrinsics uncalibrated: 2D facial landmarks alone do not provide metric 3D depth.',
    };
  }

  const requiredIds = [10, 168, 33, 263, 234, 454, 1];
  if (!landmarks || requiredIds.some(id => !landmarks[id])) {
    return {
      metricDepthAvailable: false,
      poseMethod: 'UNAVAILABLE_2D_ONLY',
      T_patient: null,
      tvec: null,
      rvec: null,
      depthMeters: null,
      reprojectionErrorPx: null,
      warning: 'Incomplete facial landmarks for 3D cranial model pose solve.',
    };
  }

  const fx = calibration.fx;
  const fy = calibration.fy;
  const cx = calibration.cx ?? imageWidth / 2;
  const cy = calibration.cy ?? imageHeight / 2;
  const modelScale = Math.max(0.7, Math.min(1.4, faceBreadthMm / 140.0));

  const corr = requiredIds.map(id => {
    const m = CANONICAL_3D_FACE_MODEL_M[id];
    const lm = landmarks[id];
    return {
      P: { x: m.x * modelScale, y: m.y * modelScale, z: m.z * modelScale },
      u: lm.x * imageWidth,
      v: lm.y * imageHeight,
    };
  });

  // Initial depth estimate from inter-zygomatic span + calibrated fx
  const spanPx = Math.max(
    10,
    Math.hypot(
      (landmarks[454].x - landmarks[234].x) * imageWidth,
      (landmarks[454].y - landmarks[234].y) * imageHeight
    )
  );
  const initZ = Math.max(0.18, Math.min(1.8, (fx * (0.140 * modelScale)) / spanPx));
  const midU = (landmarks[234].x + landmarks[454].x) * 0.5 * imageWidth;
  const midV = (landmarks[234].y + landmarks[454].y) * 0.5 * imageHeight;

  // Initial rotation aligns patient frame (+X left/right image, +Y forward/cam, +Z up) into OpenCV camera (+X right, +Y down, +Z forward):
  // R_0 maps model P=(x,y,z) -> Cam (-x, -z, -y) approx; rotation vector around X by -PI/2, etc.
  // Start near [-PI/2, 0, PI] -> let's derive clean rotation matrix: camX = -modelX, camY = -modelZ, camZ = -modelY
  // Determinant = (-1)*((-1)*0 - 0) ... check det([-1,0,0; 0,0,-1; 0,-1,0]): det = -1 * (0 - 1) = +1!
  // Axis-angle for R0 = [-1,0,0; 0,0,-1; 0,-1,0]: trace = -1, theta = pi, axis proportional to (R-R^T) -> zero skew except diag -> axis (0, 1/sqrt(2), -1/sqrt(2)) * pi!
  const invSqrt2 = Math.SQRT1_2;
  let params = [0, invSqrt2 * Math.PI, -invSqrt2 * Math.PI, ((midU - cx) * initZ) / fx, ((midV - cy) * initZ) / fy, initZ];

  const projectResiduals = (p: number[]): { errSq: number; res: number[] } => {
    const R = rodriguesMatrix(p[0], p[1], p[2]);
    const tx = p[3], ty = p[4], tz = p[5];
    const res: number[] = [];
    let errSq = 0;
    for (const c of corr) {
      const X = R[0] * c.P.x + R[1] * c.P.y + R[2] * c.P.z + tx;
      const Y = R[3] * c.P.x + R[4] * c.P.y + R[5] * c.P.z + ty;
      const Z = Math.max(0.05, R[6] * c.P.x + R[7] * c.P.y + R[8] * c.P.z + tz);
      const du = (fx * X) / Z + cx - c.u;
      const dv = (fy * Y) / Z + cy - c.v;
      res.push(du, dv);
      errSq += du * du + dv * dv;
    }
    return { errSq, res };
  };

  let cur = projectResiduals(params);
  let lambda = 1e-2;
  const eps = 1e-5;

  for (let iter = 0; iter < 15; iter++) {
    const JtJ = Array.from({ length: 6 }, () => new Array(6).fill(0));
    const Jtr = new Array(6).fill(0);

    // Explicit J matrix (14 x 6)
    const J: number[][] = Array.from({ length: cur.res.length }, () => new Array(6).fill(0));
    for (let k = 0; k < 6; k++) {
      const pPert = [...params];
      pPert[k] += eps;
      const pert = projectResiduals(pPert);
      for (let m = 0; m < cur.res.length; m++) {
        J[m][k] = (pert.res[m] - cur.res[m]) / eps;
      }
    }
    for (let i = 0; i < 6; i++) {
      let s = 0;
      for (let m = 0; m < cur.res.length; m++) s -= J[m][i] * cur.res[m];
      Jtr[i] = s;
      for (let j = 0; j < 6; j++) {
        let h = 0;
        for (let m = 0; m < cur.res.length; m++) h += J[m][i] * J[m][j];
        JtJ[i][j] = h + (i === j ? lambda : 0);
      }
    }

    const step = solveLinear6x6(JtJ, Jtr);
    if (!step) break;
    const nextParams = params.map((v, idx) => v + step[idx]);
    const next = projectResiduals(nextParams);
    if (next.errSq < cur.errSq) {
      params = nextParams;
      cur = next;
      lambda = Math.max(1e-5, lambda * 0.5);
      if (Math.hypot(...step) < 1e-6) break;
    } else {
      lambda *= 4;
    }
  }

  const R = rodriguesMatrix(params[0], params[1], params[2]);
  const tx = params[3], ty = params[4], tz = params[5];
  const rmsPx = Math.sqrt(cur.errSq / corr.length);

  const T_patient: Matrix4 = {
    elements: [
      R[0], R[1], R[2], tx,
      R[3], R[4], R[5], ty,
      R[6], R[7], R[8], tz,
      0,    0,    0,    1,
    ],
  };

  return {
    metricDepthAvailable: tz > 0.12 && tz < 2.0 && rmsPx < 25,
    poseMethod: 'CALIBRATED_3D_MODEL_PNP',
    T_patient,
    tvec: [tx, ty, tz],
    rvec: [params[0], params[1], params[2]],
    depthMeters: Number(tz.toFixed(4)),
    reprojectionErrorPx: Number(rmsPx.toFixed(2)),
    warning: `Solved against canonical ${faceBreadthMm.toFixed(0)}mm anthropometric 3D cranial model; metric accuracy depends on patient-specific scale & intrinsics calibration.`,
  };
}

/**
 * Analyze full facial biometrics from 468 landmarks
 */
export function analyzeFace(
  landmarks: Array<{ x: number; y: number; z: number }>,
  width: number,
  height: number,
  millimeterScale: number = 0.35 // typical mm per pixel at patient distance
): FacialBiometrics {
  const pt = (id: number): Point3D => {
    const lm = landmarks[id] || { x: 0.5, y: 0.5, z: 0 };
    return {
      x: lm.x * width,
      y: lm.y * height,
      z: (lm.z || 0) * width
    };
  };

  const glabella = pt(10);
  const subnasale = pt(1); // nose tip / subnasale
  const menton = pt(152);  // chin
  const rightZygoma = pt(234);
  const leftZygoma = pt(454);
  const rightCanthus = pt(33);
  const leftCanthus = pt(263);
  const upperLip = pt(0);
  const lowerLip = pt(17);

  // Distances
  const faceHeightPx = vecDistance(menton, glabella);
  const lowerThirdHeightPx = vecDistance(menton, subnasale);
  const bizygomaticWidthPx = vecDistance(rightZygoma, leftZygoma);

  const lowerThirdPct = faceHeightPx > 0 ? (lowerThirdHeightPx / faceHeightPx) * 100 : 33.3;
  const bizFaceRatio = faceHeightPx > 0 ? bizygomaticWidthPx / faceHeightPx : 0.70;

  // Facial Form Classification (House's classification)
  let facialForm: 'square' | 'tapering' | 'ovoid' = 'ovoid';
  if (bizFaceRatio > 0.75) {
    facialForm = 'square';
  } else if (bizFaceRatio < 0.65) {
    facialForm = 'tapering';
  } else {
    facialForm = 'ovoid';
  }

  // Interpupillary Tilt (degrees)
  const iplVec = vecSubtract(rightCanthus, leftCanthus);
  const interpupillaryTiltDeg = (Math.atan2(iplVec.y, iplVec.x) * 180) / Math.PI;

  // Lip Gap
  const lipGapPx = vecDistance(upperLip, lowerLip);
  const lipGapMm = lipGapPx * millimeterScale;

  // Midline Deviation: Nose tip X relative to mid-zygoma X
  const midZygomaX = (rightZygoma.x + leftZygoma.x) / 2;
  const midlineDeviationMm = (subnasale.x - midZygomaX) * millimeterScale;

  // Estimated Vita Shade recommendation
  const estimatedShade = 'A2'; // Default clinical baseline

  return {
    lowerThirdPct: Number(lowerThirdPct.toFixed(1)),
    bizygomaticWidthMm: Number((bizygomaticWidthPx * millimeterScale).toFixed(1)),
    facialHeightMm: Number((faceHeightPx * millimeterScale).toFixed(1)),
    bizFaceRatio: Number(bizFaceRatio.toFixed(3)),
    facialForm,
    interpupillaryTiltDeg: Number(interpupillaryTiltDeg.toFixed(2)),
    lipGapMm: Number(lipGapMm.toFixed(1)),
    midlineDeviationMm: Number(midlineDeviationMm.toFixed(1)),
    estimatedShade,
    glabellaPt: glabella,
    subnasalePt: subnasale,
    mentonPt: menton,
    rightZygomaPt: rightZygoma,
    leftZygomaPt: leftZygoma,
    rightCanthusPt: rightCanthus,
    leftCanthusPt: leftCanthus
  };
}
