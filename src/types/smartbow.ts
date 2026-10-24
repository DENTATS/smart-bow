/**
 * SmartBow AI - Complete Clinical Type Definitions
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface MarkerPose {
  id: number;
  corners: [Point3D, Point3D, Point3D, Point3D]; // in image coordinates (px)
  center: Point3D;
  rvec: [number, number, number];
  tvec: [number, number, number]; // in camera coordinate frame (m)
}

export interface TransformationMatrix4x4 {
  elements: number[]; // 16 elements (column-major or row-major)
}

export type MarkerGroup = 'FACE' | 'MAXILLA' | 'MANDIBLE' | 'HANAU' | 'CALIBRATION';

export interface MarkerSpec {
  id: number;
  label: string;
  location: string;
  group: MarkerGroup;
  description: string;
}

export interface CameraCalibration {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  k1: number;
  k2: number;
  p1: number;
  p2: number;
  k3: number;
  rmsError: number;
  isCalibrated: boolean;
  resolution: { width: number; height: number };
}

export type CameraSensorProfile = 'SMARTPHONE_FRONT' | 'SMARTPHONE_REAR' | 'LAPTOP_WEBCAM' | 'EXTERNAL_HD' | 'CUSTOM';

export interface CameraCalibrationSettings {
  profile: CameraSensorProfile;
  hfovDeg: number;
  fx: number;
  fy: number;
  isCalibrated: boolean;
  calibrationDate?: string;
  calibratedDistanceRefCm: number;
  scaleFactor: number; // Fine-tuning distance scale factor (0.5 to 2.0)
  patientIpdMm: number; // Interpupillary distance in mm (default 63.0)
  faceBreadthMm: number; // Bizygomatic face breadth in mm (default 140.0)
  markerBoardSizeMm: number; // ArUco marker board width in mm (default 35.0 or 22.0)
}

export interface FacialBiometrics {
  lowerThirdPct: number; // target: 30 - 36%
  bizygomaticWidthMm: number;
  facialHeightMm: number;
  bizFaceRatio: number;
  facialForm: 'square' | 'tapering' | 'ovoid';
  interpupillaryTiltDeg: number;
  lipGapMm: number;
  midlineDeviationMm: number;
  estimatedShade: string; // e.g., 'A2'
  subnasaleToMentonMm?: number;
  glabellaPt?: Point3D;
  subnasalePt?: Point3D;
  mentonPt?: Point3D;
  rightZygomaPt?: Point3D;
  leftZygomaPt?: Point3D;
  rightCanthusPt?: Point3D;
  leftCanthusPt?: Point3D;
}

export type DataProvenance = 'SIMULATED' | 'MEASURED' | 'UNAVAILABLE';

export interface ProvenanceValue<T = number> {
  value: T | null;
  provenance: DataProvenance;
  unit: string;
  isValid: boolean;
  notes?: string;
}

export interface ClinicalMeasurements {
  provenance: DataProvenance;
  vdoMm: number | null; // Vertical Dimension of Occlusion (mm) or null if UNAVAILABLE
  freewaySpaceMm?: number | null; // VDR - VDO
  vdrMm?: number | null; // Vertical Dimension at Rest
  occlusalTiltMLDeg: number | null; // Mediolateral tilt
  occlusalTiltAPDeg: number | null; // Anteroposterior tilt
  midlineShiftMm: number | null; // Maxillary midline shift
  crDeviationMm: number | null; // CR repeatability max deviation (mm)
  crStatus: 'ACCEPTED' | 'RETRY' | 'REJECT' | 'UNAVAILABLE';
  sciEstimateDeg: number | null; // Sagittal Condylar Inclination
  bennettAngleDeg?: number | null;
  bennettLeftDeg: number | null;
  bennettRightDeg: number | null;
}

export interface CrRecord {
  trialIndex: number;
  timestamp: number;
  mandibularCentroidPatient: Point3D;
  vdoMm: number;
  tiltMLDeg?: number;
  provenance?: DataProvenance;
}

export interface GothicArchPoint {
  x: number; // Lateral movement (mm)
  y: number; // Anteroposterior movement (mm)
  z: number; // Vertical height (mm)
  phase: 'CENTRIC' | 'PROTRUSION' | 'RIGHT_LATERAL' | 'LEFT_LATERAL';
  timestamp: number;
  provenance?: DataProvenance;
}

export type DentitionState = 
  | 'EDENTULOUS' 
  | 'DENTULOUS' 
  | 'PARTIALLY_EDENTULOUS' 
  | 'FULL_MOUTH_REHAB';

export type DentulousAttachmentMethod = 
  | 'BITE_FORK_CLUTCH' 
  | 'BUCCAL_COMPOSITE_TACK' 
  | 'CLEAR_ESSIX_STENT' 
  | 'WAX_RIM_BOND';

export interface DentulousBiometrics {
  attachmentMethod: DentulousAttachmentMethod;
  coCrSlide: {
    deltaX: number; // Lateral shift (mm)
    deltaY: number; // Anterior slide (mm)
    deltaZ: number; // Vertical drop (mm)
    totalVectorMm: number;
    clinicalSignificance: 'HARMONIOUS' | 'MODERATE_SLIDE' | 'SIGNIFICANT_DISCREPANCY';
  };
  freewaySpaceMm: number; // VDR - VDO (2-4mm normal)
  vdrMm: number; // Vertical Dimension at Rest
  vdoLossMm: number; // Estimated lost vertical dimension
  turnerWearCategory: 'CAT_1_LOST_VDO' | 'CAT_2_COMPENSATED_SPACE_AVAILABLE' | 'CAT_3_LIMITED_SPACE';
  incisalCantRollDeg: number; // Frontal cant vs Interpupillary Line
  incisalCantPitchDeg: number; // Sagittal cant vs Camper's Line
  canineGuidanceStatus: 'MUTUALLY_PROTECTED' | 'CANINE_GUIDED' | 'GROUP_FUNCTION' | 'BALANCED';
}

export type ArticulatorType = 
  | 'HANAU_WIDE_VUE'
  | 'HANAU_MATE'
  | 'ARTEX_CR'
  | 'WHIP_MIX_2200'
  | 'SAM_3'
  | 'KAVO_PROTAR'
  | 'EXOCAD_VIRTUAL'
  | '3SHAPE_VIRTUAL';

export interface ArticulatorSettings {
  type: ArticulatorType;
  sciDeg: number; // Horizontal condylar inclination (30°-45°)
  bennettLeftDeg: number; // Bennett angle L (0°-20°)
  bennettRightDeg: number; // Bennett angle R (0°-20°)
  incisalGuideTableDeg: number; // Incisal table angle (0°-10°)
  incisalPinMm: number; // Incisal pin setting (+/- mm)
  intercondylarDistanceMm: number; // default 110mm
}

export interface PatientCase {
  id?: string;
  patientId: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  notes?: string;
  clinicalNotes?: string;
  dentitionState: DentitionState;
  articulator: ArticulatorType;
  createdAt: string;
  updatedAt?: string;
  isSealed?: boolean;
  dataProvenance?: DataProvenance;
  measurements: ClinicalMeasurements;
  biometrics: FacialBiometrics;
  dentulousBiometrics?: DentulousBiometrics;
  crRecords: CrRecord[];
  gothicArchPoints: GothicArchPoint[];
  cameraCalibration?: CameraCalibration;
}

export interface ValidationBenchTest {
  id: string;
  type: 
    | 'B1_MARKER_DETECT'
    | 'B2_VDO_CALLIPER' 
    | 'B3_ANGLE_GAUGE' 
    | 'B4_CR_REPEATABILITY' 
    | 'B5_FRAME_STABILITY'
    | 'P1_ZEBRIS_JMA'
    | 'P2_ARTICULATOR_TRANSFER'
    | 'P3_GOTHIC_ARCH';
  nominalValue: number;
  measuredValue: number;
  error: number;
  passed: boolean;
  repNumber: number;
  notes: string;
  timestamp: string;
  provenance?: DataProvenance;
}

export type OpticalDiagnosticState =
  | 'CAMERA_NOT_AVAILABLE'
  | 'FACE_NOT_DETECTED'
  | 'NO_ARUCO_MARKERS_DETECTED'
  | 'FACE_MARKERS_INCOMPLETE'
  | 'MAXILLARY_MARKERS_INCOMPLETE'
  | 'MANDIBULAR_MARKERS_INCOMPLETE'
  | 'CAMERA_NOT_CALIBRATED'
  | 'MARKER_SIZE_NOT_VERIFIED'
  | 'READY_FOR_ENGINEERING_TEST'
  | 'MEASUREMENT_NOT_AVAILABLE';

export interface OpticalDiagnosticInfo {
  state: OpticalDiagnosticState;
  title: string;
  severity: 'ERROR' | 'WARNING' | 'INFO' | 'READY';
  actionableGuidance: string;
  missingPrerequisites: string[];
  engineeringTestAllowed: boolean;
  clinicalValidity: 'NOT_CLINICALLY_VALIDATED' | 'EXPERIMENTAL_ONLY';
}

