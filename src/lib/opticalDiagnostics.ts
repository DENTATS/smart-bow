/**
 * SmartBow AI - 10-State Optical Diagnostic State Machine
 * 
 * Replaces ambiguous "Mode: none" / unhandled tracking states with explicit, actionable
 * engineering diagnostics. Gating rules prevent measurements from being recorded when
 * calibration, optical visibility, or physical marker print scaling is unverified.
 * 
 * Research Prototype Notice:
 * READY_FOR_ENGINEERING_TEST indicates optical detection and calibration prerequisites
 * are satisfied for technical testing. It does NOT establish clinical accuracy or diagnostic validity.
 */

import { OpticalDiagnosticState, OpticalDiagnosticInfo } from '../types/smartbow';

export interface OpticalDiagnosticInput {
  cameraActive: boolean;
  cameraError: string | null;
  mode: 'SIMULATION' | 'WEBCAM';
  faceDetected: boolean;
  faceMarkersComplete: boolean;     // Group 1: Landmarks 10, 234, 454 or F01, F02, F03
  arucoDetected: boolean;          // Any ArUco markers seen
  maxillaryComplete: boolean;       // Group 2: IDs 3, 4, 5, 6
  mandibularComplete: boolean;      // Group 3: IDs 7, 8, 9, 10
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
    title: 'Patient Face Not In Frame',
    severity: 'WARNING',
    actionableGuidance: 'Position patient directly in frame 35–50 cm away under uniform operatory lighting. Clear hair from forehead and zygomatic arches.',
    missingPrerequisites: ['Primary facial landmark mesh acquisition'],
    engineeringTestAllowed: false,
  },
  NO_ARUCO_MARKERS_DETECTED: {
    title: 'No ArUco Fiducials Detected',
    severity: 'WARNING',
    actionableGuidance: 'Ensure physical ArUco marker plates (18×18 mm) are mounted on occlusal rims and not obscured by lips, fingers, or saliva.',
    missingPrerequisites: ['Maxillary and mandibular fiducial marker boards in camera optical FOV'],
    engineeringTestAllowed: false,
  },
  FACE_MARKERS_INCOMPLETE: {
    title: 'Facial Reference Plane Incomplete',
    severity: 'WARNING',
    actionableGuidance: 'Zygomatic arch or glabella points obscured. Ensure patient head is centered and hair/accessories do not occlude lateral orbital rims.',
    missingPrerequisites: ['Group 1 facial coordinate frame (F01 Glabella, F02 R-Zygoma, F03 L-Zygoma)'],
    engineeringTestAllowed: false,
  },
  MAXILLARY_MARKERS_INCOMPLETE: {
    title: 'Maxillary Marker Plate Obscured',
    severity: 'WARNING',
    actionableGuidance: 'Maxillary right premolar board partially hidden. Retract right buccal cheek or rotate patient 30°–45° anterolaterally.',
    missingPrerequisites: ['Group 2: Maxillary ArUco array (all 4 fiducials 3, 4, 5, 6 visible)'],
    engineeringTestAllowed: false,
  },
  MANDIBULAR_MARKERS_INCOMPLETE: {
    title: 'Mandibular Marker Plate Obscured',
    severity: 'WARNING',
    actionableGuidance: 'Mandibular right premolar board partially hidden. Verify rim stability, retract lower lip, and avoid inter-occlusal shadowing.',
    missingPrerequisites: ['Group 3: Mandibular ArUco array (all 4 fiducials 7, 8, 9, 10 visible)'],
    engineeringTestAllowed: false,
  },
  CAMERA_NOT_CALIBRATED: {
    title: 'Optical Intrinsics Uncalibrated',
    severity: 'WARNING',
    actionableGuidance: 'Sensor focal length and principal point unverified. Run optical calibration with standard checkerboard or known reference scale.',
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
    actionableGuidance: 'All optical, facial, and fiducial prerequisites locked. Recording enabled for engineering/bench validation. NOTE: Prototype is experimental and not clinically validated.',
    missingPrerequisites: [],
    engineeringTestAllowed: true,
  },
};

/**
 * Evaluates the full tracking environment and produces an authoritative 10-state diagnostic.
 * Strictest safety rule: Any missing prerequisite or stale telemetry immediately blocks capture.
 */
export function evaluateOpticalDiagnostic(input: OpticalDiagnosticInput): OpticalDiagnosticInfo {
  let state: OpticalDiagnosticState;
  let customGuidance: string | undefined;

  // Stale measurement guard: telemetry older than 500ms indicates dropped frames or frozen pipeline
  const isStale = input.telemetryAgeMs !== undefined && input.telemetryAgeMs > 500;

  if (!input.cameraActive && input.mode === 'WEBCAM') {
    state = 'CAMERA_NOT_AVAILABLE';
  } else if (!input.faceDetected) {
    state = 'FACE_NOT_DETECTED';
  } else if (!input.arucoDetected) {
    state = 'NO_ARUCO_MARKERS_DETECTED';
  } else if (!input.faceMarkersComplete) {
    state = 'FACE_MARKERS_INCOMPLETE';
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
