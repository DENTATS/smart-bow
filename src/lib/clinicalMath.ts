/**
 * SmartBow AI - Clinical Prosthodontic Mathematics & Treatment Rules
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import { Point3D, FacialBiometrics, GothicArchPoint } from '../types/smartbow';
import { Matrix4, vecDistance, vecDot } from './patientFrame';

/**
 * Compute Vertical Dimension of Occlusion (VDO) in millimeters.
 * VDO = abs(pos_mand.z - pos_max.z) * 1000 (if poses are in meters)
 * or abs(pos_mand.z - pos_max.z) if in mm.
 */
export function computeVdo(posMax: Point3D | null, posMand: Point3D | null, scaleToMm: number = 1): number {
  if (!posMax || !posMand) return 62.0; // Default clinical average (mm)
  const dz = Math.abs(posMand.z - posMax.z);
  return Number((dz * scaleToMm).toFixed(1));
}

/**
 * Compute Occlusal Plane Mediolateral (ML) Tilt in degrees.
 * Angle between Maxillary Rim X-axis and Patient Frame X-axis.
 */
export function computeOcclusalTiltML(tMaxCam: Matrix4, tPatient: Matrix4): number {
  // Maxillary X-axis in camera space
  const maxX: Point3D = {
    x: tMaxCam.elements[0],
    y: tMaxCam.elements[4],
    z: tMaxCam.elements[8]
  };

  // Patient X-axis
  const patientX: Point3D = {
    x: tPatient.elements[0],
    y: tPatient.elements[4],
    z: tPatient.elements[8]
  };

  const dot = Math.max(-1, Math.min(1, vecDot(maxX, patientX)));
  const angleRad = Math.acos(dot);
  return Number(((angleRad * 180) / Math.PI).toFixed(1));
}

/**
 * Compute CR Repeatability Deviation score.
 * Formula from Dr. Deepanshu's specification:
 * Pairwise Euclidean distances across recorded CR mandibular centroids.
 * Repeatability criteria:
 *   < 0.5 mm: ACCEPTED ✓ (proceed to teeth arrangement)
 *   0.5 - 1.0 mm: RETRY ⚠ (muscle splinting / deprogramme)
 *   > 1.0 mm: REJECT ✗ (deprogramme with Lucia jig/leaf gauge and re-record)
 */
export function computeCrDeviation(records: Point3D[]): {
  maxDeviationMm: number;
  status: 'ACCEPTED' | 'RETRY' | 'REJECT';
  pairwiseDistances: number[];
} {
  if (records.length < 2) {
    return { maxDeviationMm: 0.0, status: 'ACCEPTED', pairwiseDistances: [] };
  }

  const distances: number[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const dist = vecDistance(records[i], records[j]);
      distances.push(Number(dist.toFixed(3)));
    }
  }

  const maxDist = Math.max(...distances);
  let status: 'ACCEPTED' | 'RETRY' | 'REJECT' = 'ACCEPTED';
  if (maxDist < 0.5) {
    status = 'ACCEPTED';
  } else if (maxDist <= 1.0) {
    status = 'RETRY';
  } else {
    status = 'REJECT';
  }

  return {
    maxDeviationMm: Number(maxDist.toFixed(2)),
    status,
    pairwiseDistances: distances
  };
}

/**
 * Compute Digital Gothic Arch metrics:
 * - Apex position (Centric Relation)
 * - Bennett angles (Left & Right)
 * - Sagittal Condylar Inclination (SCI)
 */
export function analyzeGothicArch(points: GothicArchPoint[]): {
  apex: { x: number; y: number };
  bennettLeftDeg: number;
  bennettRightDeg: number;
  sciEstimateDeg: number;
  protrusiveLengthMm: number;
  symmetryIndex: number;
} {
  if (points.length === 0) {
    return {
      apex: { x: 0, y: 0 },
      bennettLeftDeg: 12.0,
      bennettRightDeg: 12.0,
      sciEstimateDeg: 33.0,
      protrusiveLengthMm: 6.5,
      symmetryIndex: 94.0
    };
  }

  // Find apex: most posterior point (minimum Y coordinate in centric space)
  let apex = { x: 0, y: 0 };
  let minY = Infinity;
  for (const pt of points) {
    if (pt.y < minY) {
      minY = pt.y;
      apex = { x: pt.x, y: pt.y };
    }
  }

  // Separate right and left lateral excursions
  const rightPoints = points.filter(p => p.phase === 'RIGHT_LATERAL' || (p.x > apex.x + 1 && p.y > apex.y));
  const leftPoints = points.filter(p => p.phase === 'LEFT_LATERAL' || (p.x < apex.x - 1 && p.y > apex.y));
  const protrusivePoints = points.filter(p => p.phase === 'PROTRUSION');

  // Compute angles relative to sagittal midline (Y-axis)
  let bennettRight = 12.0;
  if (rightPoints.length > 0) {
    const farRight = rightPoints.reduce((max, p) => (p.x > max.x ? p : max), rightPoints[0]);
    const dx = farRight.x - apex.x;
    const dy = farRight.y - apex.y;
    if (dy > 0) {
      bennettRight = (Math.atan2(dx, dy) * 180) / Math.PI;
    }
  }

  let bennettLeft = 12.0;
  if (leftPoints.length > 0) {
    const farLeft = leftPoints.reduce((min, p) => (p.x < min.x ? p : min), leftPoints[0]);
    const dx = Math.abs(farLeft.x - apex.x);
    const dy = farLeft.y - apex.y;
    if (dy > 0) {
      bennettLeft = (Math.atan2(dx, dy) * 180) / Math.PI;
    }
  }

  // SCI estimate from protrusive path angle in Y-Z plane
  let sciEstimate = 33.0; // Hanau default is ~30° - 35°
  let protrusiveLength = 6.0;
  if (protrusivePoints.length > 1) {
    const firstP = protrusivePoints[0];
    const lastP = protrusivePoints[protrusivePoints.length - 1];
    const dy = Math.abs(lastP.y - firstP.y);
    const dz = Math.abs(lastP.z - firstP.z);
    protrusiveLength = dy;
    if (dy > 1) {
      sciEstimate = (Math.atan2(dz, dy) * 180) / Math.PI;
      // Normal clinical range is 25° - 55°
      sciEstimate = Math.max(20, Math.min(55, sciEstimate + 25));
    }
  }

  const symmetry = Math.max(70, Math.min(100, 100 - Math.abs(bennettLeft - bennettRight) * 3));

  return {
    apex,
    bennettLeftDeg: Number(Math.max(5, Math.min(25, bennettLeft)).toFixed(1)),
    bennettRightDeg: Number(Math.max(5, Math.min(25, bennettRight)).toFixed(1)),
    sciEstimateDeg: Number(sciEstimate.toFixed(1)),
    protrusiveLengthMm: Number(protrusiveLength.toFixed(1)),
    symmetryIndex: Number(symmetry.toFixed(0))
  };
}

/**
 * Generate comprehensive clinical prosthodontic recommendations
 */
export function generateClinicalSuggestions(
  biometrics: FacialBiometrics,
  vdoMm: number,
  crDevMm: number | null
): {
  vdoAssessment: string;
  vdoAction: string;
  mouldSuggestion: string;
  mouldDescription: string;
  crQuality: string;
  crStatus: 'ACCEPTED' | 'RETRY' | 'REJECT';
  shadeGuidance: string;
  mountingGuidance: string;
} {
  const lt = biometrics.lowerThirdPct;
  let vdoAssessment = 'VDO proportion acceptable (within 30–36% norm)';
  let vdoAction = 'Maintain current rim vertical dimension';

  if (lt < 30) {
    vdoAssessment = `Collapsed VDO — lower facial third is ${lt.toFixed(1)}% (target: 33%)`;
    const deficitMm = ((33 - lt) * 0.8).toFixed(1);
    vdoAction = `Increase VDO on mandibular occlusal rim by approx +${deficitMm} mm`;
  } else if (lt > 36) {
    vdoAssessment = `Over-opened VDO — lower facial third is ${lt.toFixed(1)}% (target: 33%)`;
    const excessMm = ((lt - 33) * 0.8).toFixed(1);
    vdoAction = `Reduce VDO on rims by approx -${excessMm} mm (risk of clicking teeth & muscle fatigue)`;
  }

  const form = biometrics.facialForm;
  const mouldMapping = {
    square: {
      name: 'Square / Angular Mould Form (Leon Williams Class I)',
      desc: 'Parallel proximal contours, dominant central incisors, prominent line angles for square facial form'
    },
    tapering: {
      name: 'Tapering Mould Form (Leon Williams Class II)',
      desc: 'Converging proximal surfaces towards gingival third, delicate cervical taper matching inverted triangular face'
    },
    ovoid: {
      name: 'Ovoid Mould Form (Leon Williams Class III)',
      desc: 'Soft curvature on labial surface, rounded incisal angles, gentle convexities harmonizing with rounded facial contours'
    }
  };

  const mould = mouldMapping[form];

  let crQuality = 'No CR recordings captured';
  let crStatus: 'ACCEPTED' | 'RETRY' | 'REJECT' = 'ACCEPTED';
  if (crDevMm !== null) {
    if (crDevMm < 0.5) {
      crQuality = `CR deviation ${crDevMm.toFixed(2)} mm — ACCEPTED ✓ (Optimal neuromuscular repeatability)`;
      crStatus = 'ACCEPTED';
    } else if (crDevMm <= 1.0) {
      crQuality = `CR deviation ${crDevMm.toFixed(2)} mm — RETRY ⚠ (Borderline muscle guarding; deprogramme 5 mins)`;
      crStatus = 'RETRY';
    } else {
      crQuality = `CR deviation ${crDevMm.toFixed(2)} mm — REJECT ✗ (Excessive deviation; verify rim stability & deprogramme)`;
      crStatus = 'REJECT';
    }
  }

  return {
    vdoAssessment,
    vdoAction,
    mouldSuggestion: mould.name,
    mouldDescription: mould.desc,
    crQuality,
    crStatus,
    shadeGuidance: `${biometrics.estimatedShade} baseline (Vitapan Classical scale) · Confirm with porcelain tab under 5500K color-corrected lighting`,
    mountingGuidance: `Hanau Wide-Vue semi-adjustable mounting with custom 3D printed transfer jig eliminates anatomic facebow fork discomfort`
  };
}
