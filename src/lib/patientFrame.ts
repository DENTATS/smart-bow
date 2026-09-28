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
 * Build Patient Coordinate Frame from MediaPipe Facial Landmarks
 * f01 = Landmark 10 (Glabella / Forehead)
 * f02 = Landmark 234 (Right cheekbone / Zygomatic arch)
 * f03 = Landmark 454 (Left cheekbone / Zygomatic arch)
 * origin = (f02 + f03) / 2
 * x-axis = right to left lateral vector
 * z-axis = superior vertical vector
 * y-axis = anterior-posterior vector (perpendicular to coronal plane)
 */
export function buildPatientFrame(landmarks: Array<{ x: number; y: number; z: number }>, width: number, height: number): {
  T_patient: Matrix4;
  origin: Point3D;
  xAxis: Point3D;
  yAxis: Point3D;
  zAxis: Point3D;
} {
  const pt = (id: number): Point3D => {
    const lm = landmarks[id] || { x: 0.5, y: 0.5, z: 0 };
    return {
      x: lm.x * width,
      y: lm.y * height,
      z: (lm.z || 0) * width // scale z appropriately by width
    };
  };

  const f01 = pt(10);  // Glabella
  const f02 = pt(234); // Right zygomatic arch
  const f03 = pt(454); // Left zygomatic arch

  const origin = vecScale(vecAdd(f02, f03), 0.5);

  let x = vecNormalize(vecSubtract(f02, f03));
  let z = vecNormalize(vecSubtract(f01, origin));
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

  return { T_patient, origin, xAxis: x, yAxis: y, zAxis: z };
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
