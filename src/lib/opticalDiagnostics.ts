/**
 * SmartBow AI - Optical Diagnostic State Machine
 *
 * Explicit, actionable engineering diagnostics gating capture when camera,
 * contactless natural face tracking, dental-rim ArUco fiducials, calibration,
 * or print scaling prerequisites are unverified.
 *
 * Architectural Note:
 * - Natural facial anatomy (MediaPipe landmarks #10 Glabella, #234 R-Zygoma, #454 L-Zygoma)
 *   provides the contactless cranial reference frame (NO physical skin-adhesive facial ArUco markers).
 * - Physical ArUco fiducials (DICT_4X4_50) are restricted on the patient to:
 *   Maxillary rim (IDs 3, 4, 5, 6) and Mandibular rim (IDs 7, 8, 9, 10).
 *
 * Research Prototype Notice:
 * READY_FOR_ENGINEERING_TEST indicates optical detection and calibration prerequisites
 * are satisfied for technical testing. It does NOT establish clinical accuracy or diagnostic validity.
 */

import { OpticalDiagnosticState, OpticalDiagnosticInfo } from '../types/smartbow';
import type { ArucoFrameDiagnostics, ArucoCandidateSummary, MarkerQuality } from './arucoDetector';

export interface OpticalDiagnosticInput {
  cameraActive: boolean;
  cameraError: string | null;
  mode: 'SIMULATION' | 'WEBCAM';
  faceDetected: boolean;            // Natural contactless MediaPipe facial tracking
  arucoDetected: boolean;           // Any physical ArUco markers seen
  maxillaryComplete: boolean;       // Maxillary rim array: IDs 3, 4, 5, 6
  mandibularComplete: boolean;      // Mandibular rim array: IDs 7, 8, 9, 10
  cameraCalibrated: boolean;        // Verified focal length & principal point
  markerSizeVerified: boolean;      // Physical 100mm caliper print scale confirmed
  trackingStable?: boolean;         // Low jitter/movement
  telemetryAgeMs?: number;          // Age in milliseconds of latest tracking frame
}

export const OPTICAL_DIAGNOSTIC_DEFINITIONS: Record<OpticalDiagnosticState, {
  title: string;
  severity: 'ERROR' | 'WARNING' | 'INFO' | 'READY';
  actionableGuidance: string;
  missingPrerequisites: string[];
  engineeringTestAllowed: boolean;
}> = {
  CAMERA_NOT_AVAILABLE: {
    title: 'Camera Device Unavailable',
    severity: 'ERROR',
    actionableGuidance: 'Connect camera or grant browser camera permissions. Ensure no other application has locked the webcam device.',
    missingPrerequisites: ['Active video stream from calibrated optical sensor'],
    engineeringTestAllowed: false,
  },
  FACE_NOT_DETECTED: {
    title: 'Natural Facial Reference Not Detected',
    severity: 'WARNING',
    actionableGuidance: 'Position patient face directly in frame 35–50 cm away under uniform operatory lighting for contactless anatomical landmark tracking.',
    missingPrerequisites: ['Contactless natural facial landmark reference (#10 Glabella, #234/#454 Zygoma)'],
    engineeringTestAllowed: false,
  },
  NO_ARUCO_MARKERS_DETECTED: {
    title: 'No Dental Rim ArUco Fiducials Detected',
    severity: 'WARNING',
    actionableGuidance: 'Ensure physical ArUco marker plates (18×18 mm, DICT_4X4_50 IDs 3–10) are mounted on the maxillary and mandibular occlusal rims and visible to camera.',
    missingPrerequisites: ['Maxillary (3–6) and mandibular (7–10) occlusal rim fiducial boards in camera FOV'],
    engineeringTestAllowed: false,
  },
  MAXILLARY_MARKERS_INCOMPLETE: {
    title: 'Maxillary Marker Plate Obscured',
    severity: 'WARNING',
    actionableGuidance: 'Maxillary right premolar board partially hidden. Retract right buccal cheek or rotate camera 30°–45° anterolaterally.',
    missingPrerequisites: ['Maxillary ArUco array (all 4 fiducials 3, 4, 5, 6 visible)'],
    engineeringTestAllowed: false,
  },
  MANDIBULAR_MARKERS_INCOMPLETE: {
    title: 'Mandibular Marker Plate Obscured',
    severity: 'WARNING',
    actionableGuidance: 'Mandibular right premolar board partially hidden. Verify rim stability, retract lower lip, and avoid inter-occlusal shadowing.',
    missingPrerequisites: ['Mandibular ArUco array (all 4 fiducials 7, 8, 9, 10 visible)'],
    engineeringTestAllowed: false,
  },
  CAMERA_NOT_CALIBRATED: {
    title: 'Optical Intrinsics Uncalibrated',
    severity: 'WARNING',
    actionableGuidance: 'Sensor focal length and principal point unverified. Run optical calibration with the 3×3 calibration card (IDs 20–28).',
    missingPrerequisites: ['Pinhole camera intrinsic matrix [fx, fy, cx, cy] with radial distortion coefficients [k1, k2]'],
    engineeringTestAllowed: false,
  },
  MARKER_SIZE_NOT_VERIFIED: {
    title: 'Physical Print Scale Unverified',
    severity: 'WARNING',
    actionableGuidance: 'Marker printout must be verified with digital calipers against the 100 mm scale bar. Do not fit to page during printing.',
    missingPrerequisites: ['Physical 100.0 ± 0.2 mm caliper confirmation of printed sheet geometry'],
    engineeringTestAllowed: false,
  },
  MEASUREMENT_NOT_AVAILABLE: {
    title: 'Tracking Lost / Motion Blur / Stale Frame',
    severity: 'ERROR',
    actionableGuidance: 'Excessive motion velocity, transient optical occlusion, or stale telemetry (>500ms) detected. Hold camera steady and reacquire continuous tracking.',
    missingPrerequisites: ['Continuous fresh frame-to-frame tracking stability across consecutive frames'],
    engineeringTestAllowed: false,
  },
  READY_FOR_ENGINEERING_TEST: {
    title: 'Optical Prerequisites Met (Engineering Test Ready)',
    severity: 'READY',
    actionableGuidance: 'Natural facial reference and maxillary/mandibular rim fiducials locked. Recording enabled for engineering validation (experimental prototype).',
    missingPrerequisites: [],
    engineeringTestAllowed: true,
  },
};

/**
 * Evaluates the full tracking environment and produces an authoritative optical diagnostic.
 * Strictest safety rule: Any missing prerequisite or stale telemetry immediately blocks capture.
 */
export function evaluateOpticalDiagnostic(input: OpticalDiagnosticInput): OpticalDiagnosticInfo {
  let state: OpticalDiagnosticState;
  let customGuidance: string | undefined;

  const isStale = input.telemetryAgeMs !== undefined && input.telemetryAgeMs > 500;

  if (!input.cameraActive && input.mode === 'WEBCAM') {
    state = 'CAMERA_NOT_AVAILABLE';
    if (input.cameraError) {
      customGuidance = input.cameraError;
    }
  } else if (!input.faceDetected) {
    state = 'FACE_NOT_DETECTED';
  } else if (!input.arucoDetected) {
    state = 'NO_ARUCO_MARKERS_DETECTED';
  } else if (!input.maxillaryComplete) {
    state = 'MAXILLARY_MARKERS_INCOMPLETE';
  } else if (!input.mandibularComplete) {
    state = 'MANDIBULAR_MARKERS_INCOMPLETE';
  } else if (!input.cameraCalibrated) {
    state = 'CAMERA_NOT_CALIBRATED';
  } else if (!input.markerSizeVerified) {
    state = 'MARKER_SIZE_NOT_VERIFIED';
  } else if (input.trackingStable === false || isStale) {
    state = 'MEASUREMENT_NOT_AVAILABLE';
    if (isStale) {
      customGuidance = `Stale optical telemetry detected (${input.telemetryAgeMs}ms elapsed > 500ms max allowed). Capture blocked to prevent logging invalid latency data.`;
    }
  } else {
    state = 'READY_FOR_ENGINEERING_TEST';
  }

  const def = OPTICAL_DIAGNOSTIC_DEFINITIONS[state];

  return {
    state,
    title: def.title,
    severity: def.severity,
    actionableGuidance: customGuidance || def.actionableGuidance,
    missingPrerequisites: def.missingPrerequisites,
    engineeringTestAllowed: def.engineeringTestAllowed,
    clinicalValidity: 'EXPERIMENTAL_ONLY',
  };
}

/**
 * Gate check performed at the exact moment of shutter click.
 * Protects against transient occlusion or loss of tracking during shutter exposure.
 */
export function checkCaptureReadiness(input: OpticalDiagnosticInput): {
  canCapture: boolean;
  diagnostic: OpticalDiagnosticInfo;
  reason?: string;
} {
  const diagnostic = evaluateOpticalDiagnostic(input);
  if (!diagnostic.engineeringTestAllowed) {
    return {
      canCapture: false,
      diagnostic,
      reason: `Capture Blocked [${diagnostic.state}]: ${diagnostic.actionableGuidance}`,
    };
  }

  return {
    canCapture: true,
    diagnostic,
  };
}

export type LiveArucoPipelineCondition =
  | 'CAMERA_NOT_AVAILABLE'
  | 'CAMERA_PERMISSION_DENIED'
  | 'DETECTOR_INIT_FAILED'
  | 'FRAME_PROCESSING_FAILED'
  | 'WRONG_DICTIONARY_OR_ID'
  | 'MARKER_TOO_SMALL'
  | 'POOR_LIGHTING_OR_GLARE'
  | 'PARTIALLY_OBSCURED'
  | 'CAMERA_ACTIVE_NO_MARKERS'
  | 'MARKERS_DETECTED';

export interface LiveArucoDiagnosticStatus {
  condition: LiveArucoPipelineCondition;
  severity: 'ERROR' | 'WARNING' | 'READY';
  title: string;
  guidance: string;
  cameraLabel: string;
  arucoStatusLabel: string;
  faceTrackingStatus: 'DETECTED' | 'NOT_DETECTED';
  dictionary: 'DICT_4X4_50';
  detectedCount: number;
  detectedIds: number[];
  missingClinicalIds: number[];
  qualityWarnings: string[];
  candidateSummary: ArucoCandidateSummary;
  markerQualities: MarkerQuality[];
  maxillaGroupStatus: { detectedIds: number[]; missingIds: number[]; status: 'COMPLETE' | 'PARTIAL' | 'MISSING' };
  mandibleGroupStatus: { detectedIds: number[]; missingIds: number[]; status: 'COMPLETE' | 'PARTIAL' | 'MISSING' };
}

export interface LiveArucoDiagnosticInput {
  cameraActive: boolean;
  cameraPoweredOn: boolean;
  cameraError: string | null;
  frameDiag: ArucoFrameDiagnostics | null;
  detectedIds: number[];
  expectedIds?: number[];
  faceDetected?: boolean;
}

export const CLINICAL_MAXILLA_IDS = [3, 4, 5, 6];
export const CLINICAL_MANDIBLE_IDS = [7, 8, 9, 10];
export const CLINICAL_RIM_EXPECTED_IDS = [...CLINICAL_MAXILLA_IDS, ...CLINICAL_MANDIBLE_IDS];

function evalGroup(groupIds: number[], detectedIds: number[]) {
  const uniqueDetected = Array.from(new Set(detectedIds));
  const det = groupIds.filter(id => uniqueDetected.includes(id));
  const miss = groupIds.filter(id => !uniqueDetected.includes(id));
  const status: 'COMPLETE' | 'PARTIAL' | 'MISSING' =
    det.length === groupIds.length ? 'COMPLETE' : det.length > 0 ? 'PARTIAL' : 'MISSING';
  return { detectedIds: det, missingIds: miss, status };
}

/**
 * Granular CV Pipeline Diagnostic Evaluator for live webcam & Marker Test Mode.
 * - Strictly decouples natural facial tracking from dental-rim ArUco detection (IDs 3–10).
 * - Never reports missing facial ArUco markers (IDs 0–2 are not required).
 * - Always preserves MARKERS_DETECTED when valid markers are decoded, even if quality warnings exist.
 * - Never describes low pixel resolution as physical occlusion; reports factual candidate counts when 0 markers are found.
 */
export function evaluateArucoPipelineDiagnostic(
  input: LiveArucoDiagnosticInput
): LiveArucoDiagnosticStatus {
  const { cameraActive, cameraPoweredOn, cameraError, frameDiag } = input;
  const rawDetectedIds = input.detectedIds ?? frameDiag?.detectedIds ?? [];
  const detectedIds = Array.from(new Set(rawDetectedIds)).sort((a, b) => a - b);
  const expected = input.expectedIds ?? CLINICAL_RIM_EXPECTED_IDS;
  const missingClinicalIds = expected.filter(id => !detectedIds.includes(id));

  const maxillaGroupStatus = evalGroup(CLINICAL_MAXILLA_IDS, detectedIds);
  const mandibleGroupStatus = evalGroup(CLINICAL_MANDIBLE_IDS, detectedIds);
  const faceTrackingStatus: 'DETECTED' | 'NOT_DETECTED' = input.faceDetected ? 'DETECTED' : 'NOT_DETECTED';
  const qualityWarnings = frameDiag?.qualityWarnings ?? [];
  const markerQualities: MarkerQuality[] = frameDiag?.markerQualities ?? [];
  const candidateSummary: ArucoCandidateSummary = frameDiag?.candidateSummary ?? {
    quads: frameDiag?.rawQuadsFound ?? 0,
    rejectedTooSmall: frameDiag?.rejectedTooSmallCount ?? 0,
    rejectedBorder: frameDiag?.rejectedBorderCorruptedCount ?? 0,
    rejectedDictionary: frameDiag?.rejectedWrongDictOrInvalidIdCount ?? 0,
    rejectedFlat: frameDiag?.rejectedLowContrastCount ?? 0,
  };

  const candidateStatsText = `NO MARKER FOUND — ${candidateSummary.quads} candidate squares: ${candidateSummary.rejectedTooSmall} too small / ${candidateSummary.rejectedBorder} border / ${candidateSummary.rejectedDictionary} pattern / ${candidateSummary.rejectedFlat} flat.`;

  const errLower = (cameraError || '').toLowerCase();
  const isPermissionDenied =
    errLower.includes('permission') ||
    errLower.includes('denied') ||
    errLower.includes('notallowed');

  let condition: LiveArucoPipelineCondition;
  let severity: 'ERROR' | 'WARNING' | 'READY' = 'WARNING';
  let title = '';
  let guidance = '';
  let cameraLabel = cameraActive && cameraPoweredOn ? 'ACTIVE' : 'UNAVAILABLE';
  let arucoStatusLabel = detectedIds.length > 0 ? 'DETECTED' : 'SEARCHING';

  if (isPermissionDenied) {
    condition = 'CAMERA_PERMISSION_DENIED';
    severity = 'ERROR';
    title = 'Camera Permission Denied';
    guidance = 'Allow browser camera access in site permissions, then click Retry Camera Permission.';
    cameraLabel = 'PERMISSION DENIED';
    arucoStatusLabel = 'BLOCKED';
  } else if (!cameraPoweredOn) {
    condition = 'CAMERA_NOT_AVAILABLE';
    severity = 'WARNING';
    title = 'Camera Stream Paused';
    guidance = 'Start the camera feed to begin live ArUco fiducial detection.';
    cameraLabel = 'PAUSED';
    arucoStatusLabel = 'IDLE';
  } else if (!cameraActive || cameraError) {
    condition = 'CAMERA_NOT_AVAILABLE';
    severity = 'ERROR';
    title = 'Camera Not Available';
    guidance = cameraError || 'Connect a USB/integrated camera or close other apps locking the webcam.';
    cameraLabel = 'NOT AVAILABLE';
    arucoStatusLabel = 'BLOCKED';
  } else if (frameDiag && !frameDiag.detectorInitialized) {
    condition = 'DETECTOR_INIT_FAILED';
    severity = 'ERROR';
    title = 'Detector Initialization Failure';
    guidance = frameDiag.initError || 'Failed to initialize browser Canvas 2D / ArUco detector runtime.';
    arucoStatusLabel = 'INIT FAILED';
  } else if (frameDiag && !frameDiag.frameProcessed) {
    condition = 'FRAME_PROCESSING_FAILED';
    severity = 'ERROR';
    title = 'Frame Processing Failure';
    guidance = frameDiag.frameError || 'Video frame could not be read for ArUco decoding. Try switching camera resolution or restarting feed.';
    arucoStatusLabel = 'FRAME ERROR';
  } else if (detectedIds.length > 0) {
    condition = 'MARKERS_DETECTED';
    severity = qualityWarnings.length > 0 ? 'WARNING' : 'READY';
    title = `${detectedIds.length} ArUco Marker${detectedIds.length === 1 ? '' : 's'} Detected (DICT_4X4_50)`;
    guidance = qualityWarnings.length > 0
      ? `Detected [${detectedIds.map(id => `#${id}`).join(', ')}] with quality notice: ${qualityWarnings.join('; ')}.`
      : 'Live perspective-invariant DICT_4X4_50 decoding active on dental rim fiducials.';
    arucoStatusLabel = 'DETECTED';
  } else if (frameDiag?.failureCategory === 'WRONG_DICTIONARY_OR_ID') {
    condition = 'WRONG_DICTIONARY_OR_ID';
    severity = 'WARNING';
    title = 'Wrong Dictionary or Unregistered Marker Pattern';
    guidance = `Black-bordered square detected, but its inner pattern does not match OpenCV DICT_4X4_50. Print the SmartBow DICT_4X4_50 sheet (not DICT_6X6_250). ${candidateStatsText}`;
    arucoStatusLabel = 'DICT MISMATCH';
  } else if (frameDiag?.failureCategory === 'PARTIALLY_OBSCURED' && candidateSummary.rejectedBorder > 0) {
    condition = 'PARTIALLY_OBSCURED';
    severity = 'WARNING';
    title = 'Candidate Border Exceeded Error Threshold';
    guidance = `Candidate quad rejected due to ${candidateSummary.rejectedBorder} border failure(s) (> ${7} white perimeter cells). Ensure full black border and white quiet zone are visible. ${candidateStatsText}`;
    arucoStatusLabel = 'BORDER REJECTED';
  } else if (frameDiag?.failureCategory === 'MARKER_TOO_SMALL') {
    condition = 'MARKER_TOO_SMALL';
    severity = 'WARNING';
    title = 'Marker Resolution Too Small in Frame';
    guidance = `Square candidate is below minimum pixel size (< 7px side / < 8px bounding box; ${candidateSummary.rejectedTooSmall} small contour(s)). Move camera closer to the 6.5 mm rim markers or use 1920×1080 resolution. ${candidateStatsText}`;
    arucoStatusLabel = 'TOO SMALL';
  } else if (
    frameDiag?.failureCategory === 'POOR_LIGHTING_OR_GLARE' &&
    (frameDiag.meanLuminance < 42 || (frameDiag.glareRatio > 0.35 && candidateSummary.rejectedFlat > 0))
  ) {
    condition = 'POOR_LIGHTING_OR_GLARE';
    severity = 'WARNING';
    const isGlare = frameDiag.glareRatio > 0.35 && candidateSummary.rejectedFlat > 0;
    title = isGlare ? 'Specular Glare Washing Out Quads' : 'Low Scene Illumination';
    guidance = isGlare
      ? `Specular glare ratio (${(frameDiag.glareRatio * 100).toFixed(1)}%) with ${candidateSummary.rejectedFlat} flat quad(s). Tilt marker slightly to eliminate reflection. ${candidateStatsText}`
      : `Scene mean luminance is ${frameDiag.meanLuminance.toFixed(1)} (< 42 threshold). Increase ambient illumination on the dental rim markers. ${candidateStatsText}`;
    arucoStatusLabel = isGlare ? 'GLARE' : 'LOW LIGHT';
  } else {
    condition = 'CAMERA_ACTIVE_NO_MARKERS';
    severity = 'WARNING';
    title = 'Camera Active — No Dental Rim Markers Detected';
    guidance = `Present maxillary (IDs 3–6) or mandibular (IDs 7–10) DICT_4X4_50 marker boards with white quiet zone in front of the camera. ${candidateStatsText}`;
    arucoStatusLabel = 'NO MARKERS';
  }

  return {
    condition,
    severity,
    title,
    guidance,
    cameraLabel,
    arucoStatusLabel,
    faceTrackingStatus,
    dictionary: 'DICT_4X4_50',
    detectedCount: detectedIds.length,
    detectedIds,
    missingClinicalIds,
    qualityWarnings,
    candidateSummary,
    markerQualities,
    maxillaGroupStatus,
    mandibleGroupStatus,
  };
}


