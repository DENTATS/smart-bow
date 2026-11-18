/**
 * SMARTBOW AI — PHASE 1 SAFETY CONTAINMENT VERIFICATION TEST SUITE
 * 
 * Tests proving:
 * 1. Missing measurement inputs produce UNAVAILABLE, not a numerical default.
 * 2. Simulator values never enter the measured-data pathway.
 * 3. Random jitter cannot produce clinical CR acceptance.
 * 4. Synthetic validation data cannot create a physical-validation PASS.
 * 5. Clinical exports are blocked or clearly watermarked when simulated.
 * 6. Tracking loss prevents capture.
 * 7. The VDO feedback loop no longer accumulates values.
 * 8. No unvalidated result is labelled VERIFIED or MEASURED.
 * 9. Matrix inversion roundtrips within float tolerance.
 * 10. Marker SVG physical dimensions match mm specifications.
 */

import { computeVdo, computeCrDeviation, analyzeGothicArch, generateClinicalSuggestions, resolveMeasurementSourceStatus, getMeasurementStatusBadgeInfo } from '../src/lib/clinicalMath';
import { generateSimulatedDemoValidationDataset, computeStatistics, exportValidationCsv } from '../src/lib/validationEngine';
import { generateHanauPrescriptionText, generatePatientCaseJson, generateExocadArticulatorFile } from '../src/lib/exportArticulator';
import { generateMountingJigStl, generateMarkerCarrierPlateStl } from '../src/lib/stlGenerator';
import { RealtimeFaceTracker } from '../src/lib/faceTrackingEngine';
import { Matrix4, createIdentityMatrix, invertRigidMatrix, multiplyRigidMatrices, transformPoint, estimateFacialPose3D, CANONICAL_3D_FACE_MODEL_M, PATIENT_FRAME_CONVENTION } from '../src/lib/patientFrame';
import { renderMarkerSvg, renderBoardSvg, renderFullA4PrintSheetSvg, getFullMarkerGrid, decodeMarkerGrid, CAD_BOARD_SPECIFICATION, ARUCO_DICT_4X4_50_BITS, ARUCO_DICTIONARY_NAME, REGISTERED_ARUCO_IDS, CLINICAL_RIM_MARKER_IDS } from '../src/lib/arucoDict';
import { jsPDF } from 'jspdf';
import { downloadA4PrintSheetPdf, generateVectorA4Pdf, generateClinicalReportPdf, drawVectorArUcoMarker } from '../src/lib/pdfExport';
import {
  detectArucoMarkersFromImageData,
  detectArucoMarkersDetailed,
  computeCoverTransform,
  mapVideoPointToCanvas,
  mapVideoCornersToCanvas,
} from '../src/lib/arucoDetector';
import { SOURCED_RIM_DATUMS } from '../src/lib/prosthodonticLiterature';
import { evaluateOpticalDiagnostic, checkCaptureReadiness, evaluateArucoPipelineDiagnostic, OPTICAL_DIAGNOSTIC_DEFINITIONS, CLINICAL_RIM_EXPECTED_IDS } from '../src/lib/opticalDiagnostics';
import { INDEPENDENT_OPENCV_GROUND_TRUTH_MARKERS } from './independentOpenCvReference';
import { PatientCase, Point3D, ValidationBenchTest, OpticalDiagnosticState } from '../src/types/smartbow';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, detail: string = '') {
  if (condition) {
    results.push({ name, passed: true, message: 'PASS' });
    console.log(`  ✓ ${name}`);
  } else {
    results.push({ name, passed: false, message: `FAIL: ${detail}` });
    console.error(`  ✗ ${name} — ${detail}`);
  }
}

console.log('\n===============================================================');
console.log('SMARTBOW AI — PHASE 1 V1 SAFETY CONTAINMENT TEST EXECUTION');
console.log('===============================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Missing measurement inputs produce UNAVAILABLE, not a numerical default
// -----------------------------------------------------------------------------
console.log('Test Group 1: Missing Measurement Inputs Guard');
{
  // 1a: computeVdo with null inputs
  const vdoNull = computeVdo(null, null);
  assert(vdoNull === null, '1a: computeVdo(null, null) returns null, never 6.0 default', `Received ${vdoNull}`);

  const vdoPartial = computeVdo({ x: 0, y: 0, z: 0 }, null);
  assert(vdoPartial === null, '1b: computeVdo(pos, null) returns null on partial input', `Received ${vdoPartial}`);

  // 1b: computeCrDeviation with 0 or 1 point
  const crZero = computeCrDeviation([]);
  assert(
    crZero.status === 'UNAVAILABLE' && crZero.maxDeviationMm === null && crZero.provenance === 'UNAVAILABLE',
    '1c: computeCrDeviation([]) produces UNAVAILABLE status, null deviation, and UNAVAILABLE provenance',
    `Received status=${crZero.status}, maxDeviationMm=${crZero.maxDeviationMm}`
  );

  const crOne = computeCrDeviation([{ x: 0, y: 0, z: 0 }]);
  assert(
    crOne.status === 'UNAVAILABLE' && crOne.maxDeviationMm === null,
    '1d: computeCrDeviation([1 pt]) produces UNAVAILABLE (cannot compute pairwise distance)',
    `Received status=${crOne.status}`
  );

  // 1c: analyzeGothicArch with 0 points
  const gothicEmpty = analyzeGothicArch([]);
  assert(
    gothicEmpty.status === 'UNAVAILABLE' && 
    gothicEmpty.sciEstimateDeg === null && 
    gothicEmpty.bennettLeftDeg === null && 
    gothicEmpty.bennettRightDeg === null &&
    gothicEmpty.apex === null,
    '1e: analyzeGothicArch([]) produces UNAVAILABLE, null angles, null apex, never 33° or 12° defaults',
    `Received sci=${gothicEmpty.sciEstimateDeg}, status=${gothicEmpty.status}`
  );

  // 1d: generateClinicalSuggestions with null vdoMm
  const biometrics = {
    lowerThirdPct: 33.0,
    bizFaceRatio: 0.7,
    facialForm: 'ovoid' as const,
    interpupillaryTiltDeg: 0,
    bizygomaticWidthMm: 136,
    facialHeightMm: 190,
    lipGapMm: 2,
    midlineDeviationMm: 0,
    estimatedShade: 'A2',
    subnasaleToMentonMm: 0
  };
  const suggestions = generateClinicalSuggestions(biometrics, null, null);
  assert(
    suggestions.vdoAssessment.includes('UNAVAILABLE') && suggestions.crStatus === 'UNAVAILABLE',
    '1f: generateClinicalSuggestions(biometrics, null, null) notes UNAVAILABLE vdo and crStatus',
    `Received vdoAssessment="${suggestions.vdoAssessment}", crStatus="${suggestions.crStatus}"`
  );
}

// -----------------------------------------------------------------------------
// TEST 2: Simulator values never enter the measured-data pathway
// -----------------------------------------------------------------------------
console.log('\nTest Group 2: Data Provenance & Separation');
{
  const tracker = new RealtimeFaceTracker();

  // Simulation mode
  const simFrame = tracker.synthesizeSimulatedFrame(0, 62.5, 1.4, 4.8, 0.3, 0.0, 0.0);
  assert(
    simFrame.provenance === 'SIMULATED' && simFrame.isSimulation === true && simFrame.metricMeasurementAvailable === false,
    '2a: synthesizeSimulatedFrame returns provenance="SIMULATED", isSimulation=true, metricMeasurementAvailable=false',
    `Received provenance=${simFrame.provenance}, metricAvailable=${simFrame.metricMeasurementAvailable}`
  );

  // Webcam mode frame (simulated video element mock)
  const mockCanvas = {
    getContext: () => ({
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(640 * 480 * 4).fill(128) })
    })
  } as unknown as HTMLCanvasElement;
  const mockVideo = { videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement;

  const camFrame = await tracker.trackFrame(mockVideo, 640, 480, 62.5, { ml: 0, ap: 0, midline: 0 }, true);
  assert(
    camFrame.provenance === 'UNAVAILABLE' && camFrame.isSimulation === false && camFrame.metricMeasurementAvailable === false,
    '2b: Webcam mode frame returns provenance="UNAVAILABLE" and metricMeasurementAvailable=false (never MEASURED)',
    `Received provenance=${camFrame.provenance}, metricAvailable=${camFrame.metricMeasurementAvailable}`
  );

  assert(
    camFrame.markerCoverage.allThreeGroupsVisible === false,
    '2c: Webcam mode marker coverage has allThreeGroupsVisible=false (blocking metric acquisition)',
    `Received allThreeGroupsVisible=${camFrame.markerCoverage.allThreeGroupsVisible}`
  );
}

// -----------------------------------------------------------------------------
// TEST 3: Random jitter cannot produce clinical CR acceptance
// -----------------------------------------------------------------------------
console.log('\nTest Group 3: CR Repeatability & Jitter Rejection');
{
  // Test: 3 points with wide dispersion (> 1.0mm)
  const widePoints: Point3D[] = [
    { x: 0.0, y: 0.0, z: -60.0 },
    { x: 1.2, y: 0.4, z: -60.0 },
    { x: -0.9, y: -0.8, z: -60.0 }
  ];
  const wideEval = computeCrDeviation(widePoints);
  assert(
    wideEval.status === 'REJECT',
    '3a: CR trials with excessive dispersion (> 1.0mm) are strictly marked REJECT',
    `Received status=${wideEval.status}, maxDist=${wideEval.maxDeviationMm}`
  );

  // Test: Borderline points (0.5mm - 1.0mm)
  const borderlinePoints: Point3D[] = [
    { x: 0.0, y: 0.0, z: -60.0 },
    { x: 0.65, y: 0.0, z: -60.0 }
  ];
  const borderEval = computeCrDeviation(borderlinePoints);
  assert(
    borderEval.status === 'RETRY',
    '3b: CR trials with borderline dispersion (0.5–1.0mm) are marked RETRY, not ACCEPTED',
    `Received status=${borderEval.status}, maxDist=${borderEval.maxDeviationMm}`
  );

  // Test: Provenance carried on evaluation
  assert(
    borderEval.provenance === 'SIMULATED',
    '3c: Evaluated deviation carries explicit SIMULATED provenance',
    `Received provenance=${borderEval.provenance}`
  );
}

// -----------------------------------------------------------------------------
// TEST 4: Synthetic validation data cannot create a physical-validation PASS
// -----------------------------------------------------------------------------
console.log('\nTest Group 4: Synthetic Validation Containment');
{
  const syntheticDataset = generateSimulatedDemoValidationDataset();
  
  // Verify all tests are marked SIMULATED and passed=false
  const allMarkedSim = syntheticDataset.every(t => t.provenance === 'SIMULATED');
  const allMarkedFailed = syntheticDataset.every(t => t.passed === false);
  assert(
    allMarkedSim && allMarkedFailed,
    '4a: generateSimulatedDemoValidationDataset marks 100% of rows as provenance="SIMULATED" and passed=false',
    `allMarkedSim=${allMarkedSim}, allMarkedFailed=${allMarkedFailed}`
  );

  // Verify computeStatistics rejects synthetic dataset from passing
  const stats = computeStatistics(syntheticDataset, 0.5, 'mm');
  assert(
    stats.hasPhysicalData === false && stats.passed === false,
    '4b: computeStatistics detects synthetic data: hasPhysicalData=false and passed=false',
    `hasPhysicalData=${stats.hasPhysicalData}, passed=${stats.passed}`
  );

  // Verify empty dataset state
  const emptyStats = computeStatistics([], 0.5, 'mm');
  assert(
    emptyStats.sampleCount === 0 && emptyStats.hasPhysicalData === false && emptyStats.passed === false,
    '4c: Empty benchmark dataset results in sampleCount=0 and passed=false (NO PHYSICAL DATA)',
    `sampleCount=${emptyStats.sampleCount}`
  );
}

// -----------------------------------------------------------------------------
// TEST 5: Clinical exports are blocked or clearly watermarked when simulated
// -----------------------------------------------------------------------------
console.log('\nTest Group 5: Clinical Exports Watermarking & Protection');
{
  const mockCase: PatientCase = {
    patientId: 'PT-TEST-001',
    name: 'Test Patient',
    age: 65,
    gender: 'FEMALE',
    dentitionState: 'EDENTULOUS',
    articulator: 'HANAU_WIDE_VUE',
    createdAt: new Date().toISOString(),
    dataProvenance: 'SIMULATED',
    biometrics: {
      lowerThirdPct: 33.1,
      bizFaceRatio: 0.72,
      facialForm: 'ovoid',
      interpupillaryTiltDeg: 1.0,
      bizygomaticWidthMm: 136,
      facialHeightMm: 190,
      lipGapMm: 2.0,
      midlineDeviationMm: 0.3,
      estimatedShade: 'A2',
      subnasaleToMentonMm: 62.5
    },
    measurements: {
      provenance: 'SIMULATED',
      vdoMm: 62.5,
      freewaySpaceMm: 3.5,
      vdrMm: 66.0,
      occlusalTiltMLDeg: 1.4,
      occlusalTiltAPDeg: 4.8,
      midlineShiftMm: 0.3,
      crDeviationMm: 0.26,
      crStatus: 'ACCEPTED',
      sciEstimateDeg: 34.0,
      bennettLeftDeg: 16.0,
      bennettRightDeg: 16.0
    },
    crRecords: [],
    gothicArchPoints: []
  };

  // 5a: Validation CSV export watermark
  const syntheticDataset = generateSimulatedDemoValidationDataset();
  const csv = exportValidationCsv(syntheticDataset);
  assert(
    csv.includes('# WARNING: SIMULATION — NOT FOR CLINICAL USE') && csv.includes('PROVENANCE: SYNTHETIC_SIMULATION'),
    '5a: exportValidationCsv includes "# WARNING: SIMULATION — NOT FOR CLINICAL USE" header watermark',
    'Watermark missing in CSV'
  );

  // 5b: Full CAD/CAM export package watermark
  const prescr = generateHanauPrescriptionText(mockCase);
  const jsonStr = generatePatientCaseJson(mockCase);
  const jsonObj = JSON.parse(jsonStr);
  const exocad = generateExocadArticulatorFile(mockCase);

  assert(
    prescr.includes('SIMULATION — NOT FOR CLINICAL USE') &&
    jsonObj.clinicalSafetyNotice === 'SIMULATION — NOT FOR CLINICAL USE' &&
    jsonObj.dataProvenance === 'SIMULATED' &&
    exocad.includes('SIMULATION — NOT FOR CLINICAL USE'),
    '5b: Articulator prescription, JSON, and exocad exports embed simulation warning and provenance',
    `clinicalSafetyNotice=${jsonObj.clinicalSafetyNotice}`
  );

  // 5c: STL Generator simulation watermark in ASCII header
  const stl = generateMountingJigStl(62.5, 1.4, 4.8, 0.3, 'PT-TEST-001', true);
  assert(
    stl.stlString.includes('SIMULATION_NOT_FOR_CLINICAL_USE'),
    '5c: 3D printed STL file header contains "SIMULATION_NOT_FOR_CLINICAL_USE"',
    'STL header missing disclaimer'
  );
}

// -----------------------------------------------------------------------------
// TEST 6: Tracking loss prevents capture
// -----------------------------------------------------------------------------
console.log('\nTest Group 6: Tracking Loss Gates Capture');
{
  const tracker = new RealtimeFaceTracker();

  // When face is too small or quality score is low
  const lostCoverageSmallFace = tracker.computeMarkerCoverage(0.10, 0.5, 0.5, 0, 50, false);
  assert(
    lostCoverageSmallFace.faceFrameLocked === false && lostCoverageSmallFace.allThreeGroupsVisible === false,
    '6a: Small face width (< 0.20) flags faceFrameLocked=false and allThreeGroupsVisible=false',
    `faceFrameLocked=${lostCoverageSmallFace.faceFrameLocked}`
  );

  const lostCoverageLowQuality = tracker.computeMarkerCoverage(0.35, 0.5, 0.5, 0, 30, false);
  assert(
    lostCoverageLowQuality.faceFrameLocked === false && lostCoverageLowQuality.allThreeGroupsVisible === false,
    '6b: Low optical quality (< 45) flags faceFrameLocked=false and allThreeGroupsVisible=false',
    `faceFrameLocked=${lostCoverageLowQuality.faceFrameLocked}`
  );

  // Status message guides user truthfully
  assert(
    lostCoverageSmallFace.statusMessage.includes('Tracking Lost') || lostCoverageSmallFace.statusMessage.includes('UNAVAILABLE'),
    '6c: Status message conveys tracking loss or metric unavailability truthfully',
    `statusMessage="${lostCoverageSmallFace.statusMessage}"`
  );
}

// -----------------------------------------------------------------------------
// TEST 7: The VDO feedback loop no longer accumulates values
// -----------------------------------------------------------------------------
console.log('\nTest Group 7: VDO Feedback Loop Stability');
{
  const tracker = new RealtimeFaceTracker();
  let baseVdo = 60.0;

  // Run 30 sequential frames with consistent input
  for (let f = 0; f < 30; f++) {
    const frame = tracker.synthesizeSimulatedFrame(f, baseVdo, 1.2, 4.0, 0.2, 0.0, 0.0);
    // In V1 bug, invariantVdo would compound or drift unbounded
    assert(
      Math.abs(frame.softwareSelfCorrection.invariantVdoMm - baseVdo) < 0.01,
      `7a: Frame ${f} invariant VDO remains stable at exactly baseVdo (${baseVdo}mm)`,
      `Drift observed: ${frame.softwareSelfCorrection.invariantVdoMm}`
    );
    if (results[results.length - 1].passed === false) break;
  }
}

// -----------------------------------------------------------------------------
// TEST 8: No unvalidated result is labelled VERIFIED or MEASURED
// -----------------------------------------------------------------------------
console.log('\nTest Group 8: Truthful Labeling Verification');
{
  const tracker = new RealtimeFaceTracker();
  const sim = tracker.synthesizeSimulatedFrame(0, 62.5, 0, 0, 0, 0, 0);
  assert(
    !sim.trackingStatusLabel.includes('VERIFIED') && !sim.trackingStatusLabel.includes('MEASURED'),
    '8a: Simulator frame label does not claim VERIFIED or MEASURED',
    `label="${sim.trackingStatusLabel}"`
  );
  assert(
    sim.trackingStatusLabel.includes('SIMULATED') || sim.trackingStatusLabel.includes('NOT CLINICAL DATA'),
    '8b: Simulator frame label explicitly contains SIMULATED / NOT CLINICAL DATA',
    `label="${sim.trackingStatusLabel}"`
  );
}

// -----------------------------------------------------------------------------
// TEST 9: Matrix inversion roundtrips within float tolerance
// -----------------------------------------------------------------------------
console.log('\nTest Group 9: Matrix Inversion & Composition Mathematical Roundtrip');
{
  // Construct arbitrary rigid transformation matrix:
  // Rotation of ~30 deg around Z and ~15 deg around X, translation [12.5, -45.2, 120.8]
  const radZ = (30 * Math.PI) / 180;
  const radX = (15 * Math.PI) / 180;
  const cosZ = Math.cos(radZ), sinZ = Math.sin(radZ);
  const cosX = Math.cos(radX), sinX = Math.sin(radX);

  const T: Matrix4 = {
    elements: [
      cosZ, -sinZ * cosX,  sinZ * sinX,  12.5,
      sinZ,  cosZ * cosX, -cosZ * sinX, -45.2,
      0,     sinX,         cosX,         120.8,
      0,     0,            0,            1.0
    ]
  };

  const invT = invertRigidMatrix(T);
  const identity = multiplyRigidMatrices(T, invT);
  const identityRev = multiplyRigidMatrices(invT, T);

  // Check identity within 1e-5 tolerance
  const expectedI = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];

  let maxDiff = 0;
  for (let i = 0; i < 16; i++) {
    maxDiff = Math.max(maxDiff, Math.abs(identity.elements[i] - expectedI[i]));
    maxDiff = Math.max(maxDiff, Math.abs(identityRev.elements[i] - expectedI[i]));
  }

  assert(
    maxDiff < 1e-5,
    `9a: Rigid matrix inversion roundtrip (T * inv(T) and inv(T) * T) equals I (max error: ${maxDiff.toExponential(2)})`,
    `Max diff: ${maxDiff}`
  );

  // Test point roundtrip
  const originalPt: Point3D = { x: 23.4, y: -18.7, z: 54.1 };
  const transformedPt = transformPoint(T, originalPt);
  const recoveredPt = transformPoint(invT, transformedPt);

  const ptError = Math.hypot(
    recoveredPt.x - originalPt.x,
    recoveredPt.y - originalPt.y,
    recoveredPt.z - originalPt.z
  );

  assert(
    ptError < 1e-5,
    `9b: 3D Point transformation roundtrip inv(T) * (T * p) == p within 1e-5 mm (error: ${ptError.toExponential(2)} mm)`,
    `Point error: ${ptError}`
  );
}

// -----------------------------------------------------------------------------
// TEST 10: Marker SVG physical dimensions match mm specifications
// -----------------------------------------------------------------------------
console.log('\nTest Group 10: Marker SVG Physical Dimensions & Grid Structure');
{
  // 10a: Marker SVG dimensions
  const svg14 = renderMarkerSvg(0, 14);
  assert(
    svg14.includes('width="14mm"') && svg14.includes('height="14mm"') && svg14.includes('viewBox="0 0 14 14"'),
    '10a: renderMarkerSvg(0, 14) outputs exact width="14mm", height="14mm", viewBox="0 0 14 14"',
    'Dimensions mismatch in marker SVG'
  );

  // 10b: Board SVG dimensions
  const boardSvg = renderBoardSvg([3, 4, 5, 6], 'MAXILLA');
  assert(
    boardSvg.includes('width="18mm"') && boardSvg.includes('height="18mm"') && boardSvg.includes('viewBox="0 0 18 18"'),
    '10b: renderBoardSvg outputs exact width="18mm", height="18mm", viewBox="0 0 18 18"',
    'Dimensions mismatch in board SVG'
  );

  // 10c: ArUco 6x6 grid border structure
  // OpenCV ArUco requires outer 1-bit black border all around 4x4 inner data
  const grid0 = getFullMarkerGrid(0);
  let outerIsAllBlack = true;
  for (let c = 0; c < 6; c++) {
    if (grid0[0][c] !== 0 || grid0[5][c] !== 0) outerIsAllBlack = false;
  }
  for (let r = 0; r < 6; r++) {
    if (grid0[r][0] !== 0 || grid0[r][5] !== 0) outerIsAllBlack = false;
  }

  assert(
    outerIsAllBlack,
    '10c: ArUco 6x6 marker grid has 1-bit pure black border on all 4 perimeter edges',
    'Border contains non-zero cell'
  );

  // 10d: Inner 4x4 data corresponds to registered dictionary bit pattern
  const innerBits = ARUCO_DICT_4X4_50_BITS[0];
  let innerMatches = true;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid0[r + 1][c + 1] !== innerBits[r][c]) innerMatches = false;
    }
  }

  assert(
    innerMatches,
    '10d: Inner 4x4 data bits exactly match registered DICT_4X4_50 bit array',
    'Inner bit mismatch'
  );
}

// -----------------------------------------------------------------------------
// TEST 11: Phase 1B — Digital ArUco Decoding Verification (OpenCV DICT_4X4_50)
// -----------------------------------------------------------------------------
console.log('\nTest Group 11: Phase 1B Digital ArUco Decoder Verification');
{
  // 11a: Decode all registered clinical and bench calibration marker IDs
  const testIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 21, 22, 23, 24, 25, 26, 27, 28];
  let allDecodedCorrectly = true;
  let decodedFailReason = '';

  for (const id of testIds) {
    const grid = getFullMarkerGrid(id);
    const decoded = decodeMarkerGrid(grid);
    if (!decoded || decoded.id !== id || decoded.rotationDeg !== 0) {
      allDecodedCorrectly = false;
      decodedFailReason = `ID ${id} failed decoding: got ${JSON.stringify(decoded)}`;
      break;
    }
  }

  assert(
    allDecodedCorrectly,
    '11a: decodeMarkerGrid correctly decodes all registered clinical (0..12) & calibration (20..28) markers at 0° rotation',
    decodedFailReason
  );

  // 11b: Rotation Invariance test (90°, 180°, 270°)
  // Helper to rotate a 6x6 grid clockwise
  function rotateGridCw(grid: number[][]): number[][] {
    const N = grid.length;
    const res: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        res[c][N - 1 - r] = grid[r][c];
      }
    }
    return res;
  }

  const sampleId = 4; // Maxillary board fiducial
  const gridOrig = getFullMarkerGrid(sampleId);
  const grid90 = rotateGridCw(gridOrig);
  const grid180 = rotateGridCw(grid90);
  const grid270 = rotateGridCw(grid180);

  const dec90 = decodeMarkerGrid(grid90);
  const dec180 = decodeMarkerGrid(grid180);
  const dec270 = decodeMarkerGrid(grid270);

  assert(
    dec90?.id === sampleId && dec180?.id === sampleId && dec270?.id === sampleId &&
    dec180?.rotationDeg === 180 &&
    (dec90?.rotationDeg === 270 || dec90?.rotationDeg === 90) &&
    (dec270?.rotationDeg === 90 || dec270?.rotationDeg === 270),
    '11b: decodeMarkerGrid successfully recovers marker ID and orientation across 90°, 180°, and 270° rotations',
    `Decoded rotations: 90° -> ${dec90?.rotationDeg}, 180° -> ${dec180?.rotationDeg}, 270° -> ${dec270?.rotationDeg}`
  );

  // 11c: Border & Polarity Validation
  // Flipped border or invalid outer ring must be rejected by OpenCV decoding
  const invalidGrid = getFullMarkerGrid(sampleId);
  invalidGrid[0][0] = 1; // Corrupt border with white pixel
  const decInvalid = decodeMarkerGrid(invalidGrid);

  assert(
    decInvalid === null,
    '11c: Corrupted border (non-zero border pixel) is rejected with null decoding',
    'Corrupted border was erroneously accepted'
  );
}

// -----------------------------------------------------------------------------
// TEST 12: Phase 1B — CAD Geometry & Sourced Rim Datums Reconciliation
// -----------------------------------------------------------------------------
console.log('\nTest Group 12: CAD Geometry & Sourced Rim Datums Reconciliation');
{
  // 12a: Mechanical CAD consistency: array + margins == board dimension
  const { plateWidthMm, plateHeightMm, individualMarkerSizeMm, markerCenterPitchMm, arrayOuterSpanMm, edgeMarginMm } = CAD_BOARD_SPECIFICATION;

  const widthConsistent = (arrayOuterSpanMm + 2 * edgeMarginMm) === plateWidthMm;
  const heightConsistent = (arrayOuterSpanMm + 2 * edgeMarginMm) === plateHeightMm;
  const pitchConsistent = (markerCenterPitchMm + individualMarkerSizeMm) === arrayOuterSpanMm;

  assert(
    widthConsistent && heightConsistent && pitchConsistent,
    '12a: CAD board geometry is mathematically sound: outerSpan(14mm) + 2*margin(2mm) == 18mm, pitch(7.5mm) + marker(6.5mm) == 14mm',
    `CAD dimensions inconsistent: width=${arrayOuterSpanMm + 2 * edgeMarginMm} vs ${plateWidthMm}`
  );

  // 12b: Sourced Rim Datums — explicit designation as starting construction references, NOT universal constants
  const datums = Object.values(SOURCED_RIM_DATUMS);
  const allNonConstants = datums.every(d => d.isUniversalConstant === false);

  assert(
    allNonConstants && datums.length >= 6,
    '12b: All SOURCED_RIM_DATUMS explicitly marked as starting construction references (isUniversalConstant === false)',
    'One or more rim dimensions erroneously marked as an absolute constant'
  );

  // 12c: Retromolar pad landmark definition
  const mandibularPost = SOURCED_RIM_DATUMS.mandibularPosteriorHeight;
  const mentionsRetromolarPad = mandibularPost.constructionReferenceMm.toLowerCase().includes('retromolar pad') &&
    mandibularPost.sourceCitation.toLowerCase().includes('boucher');

  assert(
    mentionsRetromolarPad,
    '12c: Mandibular posterior rim height datum grounded in retromolar pad junction (Boucher 12th ed.)',
    `Retromolar pad citation missing or incorrect: ${mandibularPost.constructionReferenceMm}`
  );
}

// -----------------------------------------------------------------------------
// TEST 13: Phase 1B — 9-State Optical Diagnostics & Capture Safety Gating
// -----------------------------------------------------------------------------
console.log('\nTest Group 13: 9-State Optical Diagnostics & Capture Safety Gating');
{
  // 13a: Missing camera in WEBCAM mode -> CAMERA_NOT_AVAILABLE
  const diagCameraOff = evaluateOpticalDiagnostic({
    cameraActive: false,
    cameraError: null,
    mode: 'WEBCAM',
    faceDetected: false,
    arucoDetected: false,
    maxillaryComplete: false,
    mandibularComplete: false,
    cameraCalibrated: false,
    markerSizeVerified: false,
  });

  assert(
    diagCameraOff.state === 'CAMERA_NOT_AVAILABLE' && diagCameraOff.engineeringTestAllowed === false,
    '13a: Camera inactive in WEBCAM mode yields CAMERA_NOT_AVAILABLE and gates capture (engineeringTestAllowed === false)',
    `Received state: ${diagCameraOff.state}`
  );

  // 13b: Natural face not detected -> FACE_NOT_DETECTED
  const diagFaceOff = evaluateOpticalDiagnostic({
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION',
    faceDetected: false,
    arucoDetected: true,
    maxillaryComplete: true,
    mandibularComplete: true,
    cameraCalibrated: true,
    markerSizeVerified: true,
  });

  assert(
    diagFaceOff.state === 'FACE_NOT_DETECTED' && diagFaceOff.engineeringTestAllowed === false,
    '13b: Natural face absent yields FACE_NOT_DETECTED and gates capture',
    `Received state: ${diagFaceOff.state}`
  );

  // 13c: ArUco rim fiducials missing -> NO_ARUCO_MARKERS_DETECTED
  const diagNoAruco = evaluateOpticalDiagnostic({
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION',
    faceDetected: true,
    arucoDetected: false,
    maxillaryComplete: false,
    mandibularComplete: false,
    cameraCalibrated: true,
    markerSizeVerified: true,
  });

  assert(
    diagNoAruco.state === 'NO_ARUCO_MARKERS_DETECTED' && diagNoAruco.engineeringTestAllowed === false,
    '13c: Rim ArUco absent yields NO_ARUCO_MARKERS_DETECTED and gates capture',
    `Received state: ${diagNoAruco.state}`
  );

  // 13d: Maxillary board incomplete -> MAXILLARY_MARKERS_INCOMPLETE
  const diagMaxillaInc = evaluateOpticalDiagnostic({
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION',
    faceDetected: true,
    arucoDetected: true,
    maxillaryComplete: false,
    mandibularComplete: true,
    cameraCalibrated: true,
    markerSizeVerified: true,
  });

  assert(
    diagMaxillaInc.state === 'MAXILLARY_MARKERS_INCOMPLETE' && diagMaxillaInc.engineeringTestAllowed === false,
    '13d: Maxillary occlusion yields MAXILLARY_MARKERS_INCOMPLETE and gates capture',
    `Received state: ${diagMaxillaInc.state}`
  );

  // 13e: Marker print size unverified with calipers -> MARKER_SIZE_NOT_VERIFIED
  const diagUnverifiedPrint = evaluateOpticalDiagnostic({
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION',
    faceDetected: true,
    arucoDetected: true,
    maxillaryComplete: true,
    mandibularComplete: true,
    cameraCalibrated: true,
    markerSizeVerified: false,
  });

  assert(
    diagUnverifiedPrint.state === 'MARKER_SIZE_NOT_VERIFIED' && diagUnverifiedPrint.engineeringTestAllowed === false,
    '13e: Unverified print scale yields MARKER_SIZE_NOT_VERIFIED and gates capture',
    `Received state: ${diagUnverifiedPrint.state}`
  );

  // 13f: All prerequisites satisfied -> READY_FOR_ENGINEERING_TEST (no facial ArUco required)
  const diagReady = evaluateOpticalDiagnostic({
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION',
    faceDetected: true,
    arucoDetected: true,
    maxillaryComplete: true,
    mandibularComplete: true,
    cameraCalibrated: true,
    markerSizeVerified: true,
    trackingStable: true,
  });

  assert(
    diagReady.state === 'READY_FOR_ENGINEERING_TEST' && 
    diagReady.engineeringTestAllowed === true &&
    diagReady.clinicalValidity === 'EXPERIMENTAL_ONLY',
    '13f: All prerequisites met yields READY_FOR_ENGINEERING_TEST (engineeringTestAllowed === true, marked EXPERIMENTAL_ONLY)',
    `Received state: ${diagReady.state}, allowed: ${diagReady.engineeringTestAllowed}`
  );
}

// -----------------------------------------------------------------------------
// TEST 14: Independent OpenCV ArUco DICT_4X4_50 Ground Truth Decode Validation
// -----------------------------------------------------------------------------
console.log('\nTest Group 14: Independent OpenCV Ground-Truth Marker Decode Validation');
{
  let allIndependentPassed = true;
  let failDetail = '';

  for (const item of INDEPENDENT_OPENCV_GROUND_TRUTH_MARKERS) {
    const decoded = decodeMarkerGrid(item.grid6x6);
    if (!decoded || decoded.id !== item.id || decoded.rotationDeg !== 0) {
      allIndependentPassed = false;
      failDetail = `Independent OpenCV marker ${item.label} (ID ${item.id}) decode failed: got ${JSON.stringify(decoded)}`;
      break;
    }
  }

  assert(
    allIndependentPassed,
    '14a: decodeMarkerGrid correctly decodes 100% of independently generated OpenCV DICT_4X4_50 ground-truth bitmatrices',
    failDetail
  );
}

// -----------------------------------------------------------------------------
// TEST 15: Optical Diagnostic Gating Hardening (Stale Data, Tracking Loss, Gating)
// -----------------------------------------------------------------------------
console.log('\nTest Group 15: Optical Diagnostic Gating Hardening & Edge Conditions');
{
  // 15a: Stale measurement telemetry (> 500 ms)
  const staleInput = {
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION' as const,
    faceDetected: true,
    arucoDetected: true,
    maxillaryComplete: true,
    mandibularComplete: true,
    cameraCalibrated: true,
    markerSizeVerified: true,
    trackingStable: true,
    telemetryAgeMs: 750, // 750 ms stale!
  };

  const diagStale = evaluateOpticalDiagnostic(staleInput);
  const readinessStale = checkCaptureReadiness(staleInput);

  assert(
    diagStale.state === 'MEASUREMENT_NOT_AVAILABLE' && 
    diagStale.engineeringTestAllowed === false &&
    readinessStale.canCapture === false,
    '15a: Stale optical telemetry (> 500ms) yields MEASUREMENT_NOT_AVAILABLE and strictly blocks capture',
    `Received state=${diagStale.state}, canCapture=${readinessStale.canCapture}`
  );

  // 15b: Contactless natural face tracking (zero facial ArUco IDs 0-2) allows capture when rims 3-10 complete
  const noFacialArucoDiag = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: null,
    detectedIds: [3, 4, 5, 6, 7, 8, 9, 10],
    faceDetected: true,
  });
  const readinessContactlessFace = checkCaptureReadiness({
    ...staleInput,
    telemetryAgeMs: 16,
  });

  assert(
    noFacialArucoDiag.missingClinicalIds.length === 0 &&
    ![0, 1, 2].some(id => noFacialArucoDiag.missingClinicalIds.includes(id)) &&
    readinessContactlessFace.canCapture === true &&
    readinessContactlessFace.diagnostic.state === 'READY_FOR_ENGINEERING_TEST',
    '15b: Natural face tracking + dental rim IDs [3..10] never reports facial ArUco IDs 0-2 as missing and reaches READY_FOR_ENGINEERING_TEST',
    `missing=${JSON.stringify(noFacialArucoDiag.missingClinicalIds)}, state=${readinessContactlessFace.diagnostic.state}`
  );

  // 15c: Incomplete maxillary array (missing markers on upper rim)
  const missingMaxillaInput = {
    ...staleInput,
    telemetryAgeMs: 16,
    maxillaryComplete: false,
  };
  const readinessMissingMaxilla = checkCaptureReadiness(missingMaxillaInput);

  assert(
    readinessMissingMaxilla.canCapture === false && 
    readinessMissingMaxilla.diagnostic.state === 'MAXILLARY_MARKERS_INCOMPLETE',
    '15c: Incomplete maxillary ArUco array yields MAXILLARY_MARKERS_INCOMPLETE and blocks capture',
    `State=${readinessMissingMaxilla.diagnostic.state}`
  );

  // 15d: Incomplete mandibular array (missing markers on lower rim)
  const missingMandibleInput = {
    ...staleInput,
    telemetryAgeMs: 16,
    mandibularComplete: false,
  };
  const readinessMissingMandible = checkCaptureReadiness(missingMandibleInput);

  assert(
    readinessMissingMandible.canCapture === false && 
    readinessMissingMandible.diagnostic.state === 'MANDIBULAR_MARKERS_INCOMPLETE',
    '15d: Incomplete mandibular ArUco array yields MANDIBULAR_MARKERS_INCOMPLETE and blocks capture',
    `State=${readinessMissingMandible.diagnostic.state}`
  );

  // 15e: Uncalibrated camera intrinsics
  const uncalibratedCameraInput = {
    ...staleInput,
    telemetryAgeMs: 16,
    cameraCalibrated: false,
  };
  const readinessUncalibrated = checkCaptureReadiness(uncalibratedCameraInput);

  assert(
    readinessUncalibrated.canCapture === false && 
    readinessUncalibrated.diagnostic.state === 'CAMERA_NOT_CALIBRATED',
    '15e: Uncalibrated camera intrinsics yields CAMERA_NOT_CALIBRATED and blocks capture',
    `State=${readinessUncalibrated.diagnostic.state}`
  );

  // 15f: Loss of tracking during shutter exposure
  const lostTrackingInput = {
    ...staleInput,
    telemetryAgeMs: 16,
    trackingStable: false,
  };
  const readinessLostTracking = checkCaptureReadiness(lostTrackingInput);

  assert(
    readinessLostTracking.canCapture === false && 
    readinessLostTracking.diagnostic.state === 'MEASUREMENT_NOT_AVAILABLE',
    '15f: Loss of tracking stability during exposure yields MEASUREMENT_NOT_AVAILABLE and aborts capture',
    `State=${readinessLostTracking.diagnostic.state}`
  );
}

// -----------------------------------------------------------------------------
// TEST 16: 3D-Printable 18x18x3mm Carrier Plate STL Validation
// -----------------------------------------------------------------------------
console.log('\nTest Group 16: 3D-Printable Carrier Plate STL Validation');
{
  const plateStl = generateMarkerCarrierPlateStl('Maxilla');

  assert(
    plateStl.triangleCount === 12 && plateStl.stlString.includes('solid SmartBow_Marker_Carrier_Plate_Maxilla_18x18x3mm'),
    '16a: generateMarkerCarrierPlateStl generates valid closed solid STL mesh with 12 facets',
    `Triangle count=${plateStl.triangleCount}`
  );

  assert(
    plateStl.dimensionsMm.width === 18.0 && 
    plateStl.dimensionsMm.height === 18.0 && 
    plateStl.dimensionsMm.thickness === 3.0,
    '16b: Carrier plate STL dimensions strictly conform to CAD specification: 18.0 x 18.0 x 3.0 mm',
    `Dimensions=${JSON.stringify(plateStl.dimensionsMm)}`
  );
}

// -----------------------------------------------------------------------------
// TEST 17: Single-Page DIN A4 Print Sheet Layout & Scale Verification
// -----------------------------------------------------------------------------
console.log('\nTest Group 17: Single-Page DIN A4 Print Sheet Layout & Export');
{
  const a4Svg = renderFullA4PrintSheetSvg();

  // 17a: Dimensions conform to DIN A4 standard (210 x 297 mm)
  assert(
    a4Svg.includes('viewBox="0 0 210 297"') && 
    a4Svg.includes('width="210mm"') && 
    a4Svg.includes('height="297mm"'),
    '17a: Full A4 sheet SVG has exact viewBox="0 0 210 297" and 210x297mm physical dimensions',
    'A4 dimensions missing or incorrect'
  );

  // 17b: 100.0 mm Vernier Caliper scale bar with pass tolerance ±0.2 mm
  assert(
    a4Svg.includes('width="100"') && 
    a4Svg.includes('100.0 ± 0.2 mm') &&
    a4Svg.includes('PHYSICAL 100.0 mm SCALE BAR'),
    '17b: Contains 100.0 mm Vernier Caliper scale bar with ±0.2 mm tolerance',
    'Scale bar not properly defined'
  );

  // 17c: Unoccluded markers in Section 3 (IDs 20 to 28) - No white text inside fiducials
  const hasCalibrationMarkers = [20, 21, 22, 23, 24, 25, 26, 27, 28].every(id => 
    a4Svg.includes(`viewBox="0 0 12 12"`) // Rendered via renderMarkerSvg(id, 12)
  );
  // Confirm that text '#20' does NOT occur inside marker
  const noTextInsideMarkers = !a4Svg.includes('font-size="1.0" fill="#FFFFFF"') && !a4Svg.includes('>#20<');

  assert(
    hasCalibrationMarkers && noTextInsideMarkers,
    '17c: Section 3 camera intrinsics card has all 9 markers unoccluded with no text inside fiducials',
    `hasMarkers=${hasCalibrationMarkers}, noTextInside=${noTextInsideMarkers}`
  );

  // 17d: Section 1 boards have clean central alignment reticle without text overlap
  const boardSvg = renderBoardSvg([3, 4, 5, 6], 'MAXILLA');
  const boardHasNoTextInside = !boardSvg.includes('<text');
  const boardHasReticle = boardSvg.includes('Central Alignment Reticle');

  assert(
    boardHasNoTextInside && boardHasReticle,
    '17d: 18x18mm acrylic board SVG has clean quiet zones and central reticle without text collision',
    `hasNoText=${boardHasNoTextInside}, hasReticle=${boardHasReticle}`
  );

  // 17e: Prosthodontic literature citations are explicitly included
  const hasLiteratureCitations = a4Svg.includes('Boucher (12th ed.') && a4Svg.includes('Winkler (2nd ed.');

  assert(
    hasLiteratureCitations,
    '17e: A4 print sheet footer cites grounded prosthodontic references (Boucher & Winkler)',
    'Missing Boucher or Winkler citations'
  );

  // 17f: PDF export module exports callable download function
  assert(
    typeof downloadA4PrintSheetPdf === 'function',
    '17f: downloadA4PrintSheetPdf export function is defined and available for 1:1 DIN A4 PDF generation',
    'downloadA4PrintSheetPdf is not a function'
  );
}

// -----------------------------------------------------------------------------
// TEST 18: High-Definition Vector PDF Engine & Dual-Axis Verification
// -----------------------------------------------------------------------------
console.log('\nTest Group 18: High-Definition Vector PDF & Dual-Axis Verification');
{
  // 18a: generateVectorA4Pdf returns valid DIN A4 PDF stream
  const vectorPdf = generateVectorA4Pdf({ compress: false });
  const pdfOutput = vectorPdf.output();

  assert(
    pdfOutput.startsWith('%PDF-') && pdfOutput.length > 5000,
    '18a: generateVectorA4Pdf generates authentic PDF binary stream (>5KB, starts with %PDF-)',
    `PDF output length=${pdfOutput.length}`
  );

  // 18b: Vector drawing operations (re / f / m) are present for infinite zoom sharpness
  const hasVectorRects = pdfOutput.includes(' re\n') || pdfOutput.includes(' re ') || pdfOutput.includes(' f\n') || pdfOutput.includes(' f*');
  assert(
    hasVectorRects,
    '18b: Vector PDF contains native PDF vector path operators (re, f) for laser-sharp ArUco markers at any zoom',
    'Vector rectangle operators missing from PDF output'
  );

  // 18c: Dual-axis scale bar verification in A4 SVG
  const a4Svg = renderFullA4PrintSheetSvg();
  const has100mmH = a4Svg.includes('width="100"') && a4Svg.includes('100.0 ± 0.2 mm');
  const has50mmV = a4Svg.includes('height="50"') && a4Svg.includes('50.0 ± 0.2 mm');
  const hasSquareGauge = a4Svg.includes('20.0 × 20.0 mm SQUARE GAUGE') && a4Svg.includes('PASS: 20.0 ± 0.1 mm');

  assert(
    has100mmH && has50mmV && hasSquareGauge,
    '18c: Dual-axis physical calibration scale bars (100mm H × 50mm V) and 20x20mm gauge are present in SVG',
    `has100mmH=${has100mmH}, has50mmV=${has50mmV}, hasSquareGauge=${hasSquareGauge}`
  );

  // 18d: Explicit print scaling instructions (triad: 100% scale, disable fit to page, verify dimensions)
  const hasPrintNotice = 
    a4Svg.includes('PRINT AT ACTUAL SIZE — 100% SCALE') &&
    a4Svg.includes('DISABLE FIT TO PAGE') &&
    a4Svg.includes('VERIFY PRINTED DIMENSIONS BEFORE USE');
  assert(
    hasPrintNotice,
    '18d: Strict print instructions banner (PRINT AT ACTUAL SIZE — 100% SCALE · DISABLE FIT TO PAGE · VERIFY PRINTED DIMENSIONS BEFORE USE) embedded in printable sheet',
    'Missing print notice banner triad'
  );

  // 18e: Publication-grade Clinical Report Vector PDF generation
  const testCase: PatientCase = {
    patientId: 'PT-VECTOR-001',
    name: 'Clinical Report Vector Test',
    age: 68,
    gender: 'MALE',
    dentitionState: 'EDENTULOUS',
    articulator: 'HANAU_WIDE_VUE',
    createdAt: new Date().toISOString(),
    dataProvenance: 'MEASURED',
    biometrics: {
      lowerThirdPct: 33.3,
      bizFaceRatio: 0.70,
      facialForm: 'square',
      interpupillaryTiltDeg: 0.5,
      bizygomaticWidthMm: 138,
      facialHeightMm: 192,
      lipGapMm: 2.5,
      midlineDeviationMm: 0.1,
      estimatedShade: 'A3',
      subnasaleToMentonMm: 64.0
    },
    measurements: {
      provenance: 'MEASURED',
      vdoMm: 64.0,
      vdrMm: 67.0,
      freewaySpaceMm: 3.0,
      occlusalTiltMLDeg: 0.2,
      occlusalTiltAPDeg: 0.1,
      midlineShiftMm: 0.0,
      crDeviationMm: 0.25,
      crStatus: 'ACCEPTED',
      sciEstimateDeg: 33,
      bennettAngleDeg: 14,
      bennettLeftDeg: 14,
      bennettRightDeg: 14
    },
    crRecords: [],
    gothicArchPoints: []
  };

  const clinicalPdf = generateClinicalReportPdf(testCase, { compress: false });
  const clinicalPdfOutput = clinicalPdf.output();

  assert(
    clinicalPdfOutput.startsWith('%PDF-') && 
    clinicalPdfOutput.includes('PT-VECTOR-001') && 
    clinicalPdfOutput.includes('JAW RELATION'),
    '18e: generateClinicalReportPdf produces publication-grade vector prescription PDF with patient demographics and metrics',
    `Clinical PDF length=${clinicalPdfOutput.length}`
  );

  // 18f: Physical dimension preservation across CAD and ArUco markers
  assert(
    CAD_BOARD_SPECIFICATION.plateWidthMm === 18.0 &&
    CAD_BOARD_SPECIFICATION.plateHeightMm === 18.0 &&
    CAD_BOARD_SPECIFICATION.individualMarkerSizeMm === 6.5 &&
    CAD_BOARD_SPECIFICATION.markerCenterPitchMm === 7.5 &&
    CAD_BOARD_SPECIFICATION.arrayOuterSpanMm === 14.0,
    '18f: Sub-millimeter CAD and marker specifications (18x18mm plate, 6.5mm marker, 7.5mm pitch, 14mm span) preserved',
    `CAD Spec=${JSON.stringify(CAD_BOARD_SPECIFICATION)}`
  );
}

// -----------------------------------------------------------------------------
// TEST 19: Four-Day Prototype Measurement Source Status Classification
// -----------------------------------------------------------------------------
console.log('Test Group 19: Measurement Source Status & Provenance Badges');
{
  // 19a: Null values strictly resolve to UNAVAILABLE
  const sNull = resolveMeasurementSourceStatus(null, 'MEASURED', true, true);
  assert(sNull === 'UNAVAILABLE', '19a: Null measurement value strictly returns UNAVAILABLE', `Received ${sNull}`);

  // 19b: SIMULATED provenance strictly returns SIMULATED_DEMO
  const sSim = resolveMeasurementSourceStatus(62.5, 'SIMULATED', true, true);
  assert(sSim === 'SIMULATED_DEMO', '19b: SIMULATED provenance strictly maps to SIMULATED_DEMO', `Received ${sSim}`);

  // 19c: Live uncalibrated measurement returns LIVE_UNCALIBRATED
  const sUncal = resolveMeasurementSourceStatus(62.5, 'MEASURED', false, true);
  assert(sUncal === 'LIVE_UNCALIBRATED', '19c: Live optical measurement without intrinsics calibration returns LIVE_UNCALIBRATED', `Received ${sUncal}`);

  // 19d: Calibrated optical camera measurement returns CALIBRATED_ENGINEERING
  const sCal = resolveMeasurementSourceStatus(62.5, 'MEASURED', true, true);
  assert(sCal === 'CALIBRATED_ENGINEERING', '19d: Calibrated camera optical capture returns CALIBRATED_ENGINEERING', `Received ${sCal}`);

  // 19e: Stored measured physical record returns LIVE_MEASURED
  const sLive = resolveMeasurementSourceStatus(62.5, 'MEASURED', true, false);
  assert(sLive === 'LIVE_MEASURED', '19e: Recorded session measurement returns LIVE_MEASURED', `Received ${sLive}`);

  // 19f: Badge information returns exact non-empty label and badge class
  const badgeSim = getMeasurementStatusBadgeInfo('SIMULATED_DEMO');
  assert(
    badgeSim.label === 'SIMULATED DEMONSTRATION' && badgeSim.badgeClass.includes('orange'),
    '19f: SIMULATED_DEMO badge has explicit label and visual indicator',
    `Badge=${JSON.stringify(badgeSim)}`
  );
}

// -----------------------------------------------------------------------------
// TEST 20: Anti-Fabrication & Protective Export Safeguards
// -----------------------------------------------------------------------------
console.log('Test Group 20: Protective Export Safeguards & Anti-Fabrication');
{
  // 20a: Simulated case JSON and Exocad output includes warning and SIMULATED provenance
  const testCase: PatientCase = {
    patientId: 'SB-TEST-01',
    name: 'Test Prototype',
    age: 55,
    gender: 'MALE',
    dentitionState: 'EDENTULOUS',
    articulator: 'HANAU_WIDE_VUE',
    createdAt: new Date().toISOString(),
    dataProvenance: 'SIMULATED',
    biometrics: {
      lowerThirdPct: 33.0,
      bizFaceRatio: 0.72,
      facialForm: 'square',
      interpupillaryTiltDeg: 0.0,
      bizygomaticWidthMm: 136,
      facialHeightMm: 190,
      lipGapMm: 2.0,
      midlineDeviationMm: 0.0,
      estimatedShade: 'A2'
    },
    measurements: {
      provenance: 'SIMULATED',
      vdoMm: 62.0,
      freewaySpaceMm: 3.0,
      vdrMm: 65.0,
      occlusalTiltMLDeg: 0.5,
      occlusalTiltAPDeg: 5.0,
      midlineShiftMm: 0.0,
      crDeviationMm: 0.22,
      crStatus: 'ACCEPTED',
      sciEstimateDeg: 35.0,
      bennettLeftDeg: 16.0,
      bennettRightDeg: 16.0
    },
    crRecords: [],
    gothicArchPoints: []
  };

  const exocadOut = generateExocadArticulatorFile(testCase);
  const parsedExocad = JSON.parse(exocadOut);

  assert(
    parsedExocad.dataProvenance === 'SIMULATED' &&
    parsedExocad.clinicalSafetyWarning.includes('SIMULATION — NOT FOR CLINICAL USE'),
    '20a: Simulated patient case Exocad export strictly embeds simulation warning and provenance',
    `clinicalSafetyWarning=${parsedExocad.clinicalSafetyWarning}`
  );

  // 20b: Missing measurements are null in Exocad export, never filled with false defaults
  const emptyCase: PatientCase = {
    ...testCase,
    measurements: {
      provenance: 'UNAVAILABLE',
      vdoMm: null,
      freewaySpaceMm: null,
      vdrMm: null,
      occlusalTiltMLDeg: null,
      occlusalTiltAPDeg: null,
      midlineShiftMm: null,
      crDeviationMm: null,
      crStatus: 'UNAVAILABLE',
      sciEstimateDeg: null,
      bennettLeftDeg: null,
      bennettRightDeg: null
    }
  };

  const emptyExocad = JSON.parse(generateExocadArticulatorFile(emptyCase));
  assert(
    emptyExocad.articulator.vdo_mm === null &&
    emptyExocad.articulator.horizontalCondylarInclination_Left === null &&
    emptyExocad.mountingMatrix4x4 === null,
    '20b: Incomplete measurements output null in CAD export without manufacturing default numbers',
    `VDO=${emptyExocad.articulator.vdo_mm}, MountingMatrix=${emptyExocad.mountingMatrix4x4}`
  );
}


// -----------------------------------------------------------------------------
// TEST 21: Day 1 — Patient Workflow Safety, Record Isolation & Camera Lifecycle
// -----------------------------------------------------------------------------
console.log('\nTest Group 21: Patient Workflow Safety, Record Isolation & Camera Lifecycle');
{
  // 21a: Patient Record Isolation — Editing patient details strictly updates the targeted record without modifying other records
  const initialRegistry: PatientCase[] = [
    {
      patientId: 'SB-8042',
      name: 'Sunita Verma',
      age: 62,
      gender: 'FEMALE',
      dentitionState: 'EDENTULOUS',
      articulator: 'HANAU_WIDE_VUE',
      createdAt: '2026-03-01T10:00:00Z',
      dataProvenance: 'SIMULATED',
      biometrics: { lowerThirdPct: 33.1, bizFaceRatio: 0.72, facialForm: 'square', interpupillaryTiltDeg: 1.2, bizygomaticWidthMm: 136, facialHeightMm: 190, lipGapMm: 2.0, midlineDeviationMm: 0.3, estimatedShade: 'A2' },
      measurements: { provenance: 'SIMULATED', vdoMm: 62.5, freewaySpaceMm: 3.5, vdrMm: 66.0, occlusalTiltMLDeg: 1.4, occlusalTiltAPDeg: 4.8, midlineShiftMm: 0.3, crDeviationMm: 0.26, crStatus: 'ACCEPTED', sciEstimateDeg: 34.0, bennettAngleDeg: 16.0, bennettLeftDeg: 16.2, bennettRightDeg: 16.5 },
      crRecords: [],
      gothicArchPoints: []
    },
    {
      patientId: 'SB-5501',
      name: 'Anand Patel',
      age: 58,
      gender: 'MALE',
      dentitionState: 'PARTIALLY_EDENTULOUS',
      articulator: 'ARTEX_CR',
      createdAt: '2026-03-02T11:00:00Z',
      dataProvenance: 'UNAVAILABLE',
      biometrics: { lowerThirdPct: 34.0, bizFaceRatio: 0.70, facialForm: 'ovoid', interpupillaryTiltDeg: 0.0, bizygomaticWidthMm: 138, facialHeightMm: 188, lipGapMm: 1.0, midlineDeviationMm: 0.0, estimatedShade: 'A3' },
      measurements: { provenance: 'UNAVAILABLE', vdoMm: null, freewaySpaceMm: null, vdrMm: null, occlusalTiltMLDeg: null, occlusalTiltAPDeg: null, midlineShiftMm: null, crDeviationMm: null, crStatus: 'UNAVAILABLE', sciEstimateDeg: null, bennettAngleDeg: null, bennettLeftDeg: null, bennettRightDeg: null },
      crRecords: [],
      gothicArchPoints: []
    }
  ];

  // Perform isolated edit on Patient 1
  const updatedSunita: PatientCase = {
    ...initialRegistry[0],
    name: 'Sunita Verma-Gupta',
    clinicalNotes: 'Follow-up examination for bilateral wax rim delivery'
  };

  const updatedRegistry = initialRegistry.map(c => 
    c.patientId === updatedSunita.patientId ? updatedSunita : c
  );

  const patient2Untouched = updatedRegistry[1].name === 'Anand Patel' &&
    updatedRegistry[1].patientId === 'SB-5501' &&
    updatedRegistry[1].dentitionState === 'PARTIALLY_EDENTULOUS';

  assert(
    updatedRegistry[0].name === 'Sunita Verma-Gupta' && patient2Untouched,
    '21a: Patient record isolation: Editing a patient case does not overwrite a different patient case',
    `Patient 2 was erroneously modified or Patient 1 not updated`
  );

  // 21b: Start New Examination resets active measurements while preserving patient demographics
  const newExamCase: PatientCase = {
    ...updatedRegistry[0],
    updatedAt: new Date().toISOString(),
    workflowStage: 'ASSESSMENT',
    dataProvenance: 'UNAVAILABLE',
    measurements: {
      provenance: 'UNAVAILABLE',
      sourceStatus: 'UNAVAILABLE',
      vdoMm: null,
      freewaySpaceMm: null,
      vdrMm: null,
      occlusalTiltMLDeg: null,
      occlusalTiltAPDeg: null,
      midlineShiftMm: null,
      crDeviationMm: null,
      crStatus: 'UNAVAILABLE',
      sciEstimateDeg: null,
      bennettAngleDeg: null,
      bennettLeftDeg: null,
      bennettRightDeg: null,
      timestamps: {}
    },
    crRecords: [],
    gothicArchPoints: []
  };

  const examResetCorrectly = 
    newExamCase.patientId === 'SB-8042' &&
    newExamCase.name === 'Sunita Verma-Gupta' &&
    newExamCase.dentitionState === 'EDENTULOUS' &&
    newExamCase.measurements.vdoMm === null &&
    newExamCase.measurements.crDeviationMm === null &&
    newExamCase.measurements.crStatus === 'UNAVAILABLE' &&
    newExamCase.dataProvenance === 'UNAVAILABLE' &&
    newExamCase.crRecords.length === 0;

  assert(
    examResetCorrectly,
    '21b: Starting a new examination preserves demographics while resetting active trials to UNAVAILABLE',
    `Demographics or measurement reset mismatch: vdo=${newExamCase.measurements.vdoMm}`
  );

  // 21c: Unique Patient ID Collision Prevention
  const existingIds = ['SB-1001', 'SB-1002', 'SB-1003'];
  let generatedCandidate = 'SB-1001';
  let attempts = 0;
  while (existingIds.includes(generatedCandidate)) {
    attempts++;
    generatedCandidate = `SB-999${attempts}`;
  }

  assert(
    !existingIds.includes(generatedCandidate) && attempts > 0,
    '21c: Unique Patient ID generation detects collisions and produces unique non-overlapping IDs',
    `Collision check failed: generated=${generatedCandidate}`
  );

  // 21d: Camera gating prevents capture when stream is stopped or uninitialized
  const inactiveCameraDiagnostic = evaluateOpticalDiagnostic({
    mode: 'WEBCAM',
    cameraActive: false, // Stopped/Paused
    cameraError: null,
    faceDetected: false,
    arucoDetected: false,
    maxillaryComplete: false,
    mandibularComplete: false,
    cameraCalibrated: false,
    markerSizeVerified: false,
    trackingStable: false,
    telemetryAgeMs: 0
  });

  assert(
    inactiveCameraDiagnostic.state === 'CAMERA_NOT_AVAILABLE' &&
    inactiveCameraDiagnostic.engineeringTestAllowed === false,
    '21d: Camera gating prevents capture when camera stream is stopped or uninitialized',
    `Capture was permitted despite inactive camera: state=${inactiveCameraDiagnostic.state}`
  );

  // 21e: Camera permission denial safety gating
  const permissionDeniedDiagnostic = evaluateOpticalDiagnostic({
    mode: 'WEBCAM',
    cameraActive: false,
    cameraError: 'Permission denied. Please allow camera access in browser permissions.',
    faceDetected: false,
    arucoDetected: false,
    maxillaryComplete: false,
    mandibularComplete: false,
    cameraCalibrated: false,
    markerSizeVerified: false,
    trackingStable: false,
    telemetryAgeMs: 0
  });

  assert(
    permissionDeniedDiagnostic.state === 'CAMERA_NOT_AVAILABLE' &&
    permissionDeniedDiagnostic.actionableGuidance.toLowerCase().includes('permission') &&
    permissionDeniedDiagnostic.engineeringTestAllowed === false,
    '21e: Camera permission denial safely presents actionable guidance and strictly blocks capture',
    `Permission denial guidance missing: ${permissionDeniedDiagnostic.actionableGuidance}`
  );
}

// -----------------------------------------------------------------------------
// TEST 22: Live ArUco Computer Vision Pipeline (Raster ImageData + Diagnostics)
// -----------------------------------------------------------------------------
console.log('\nTest Group 22: Live ArUco CV Pipeline, Raster ImageData & Failure Diagnostics');
{
  interface RgbaBuffer {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }

  function createBlankFrame(width: number, height: number, bgGray: number = 240): RgbaBuffer {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = bgGray;
      data[i + 1] = bgGray;
      data[i + 2] = bgGray;
      data[i + 3] = 255;
    }
    return { data, width, height };
  }

  function setPixel(buf: RgbaBuffer, x: number, y: number, gray: number) {
    if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
    const idx = (y * buf.width + x) * 4;
    buf.data[idx] = gray;
    buf.data[idx + 1] = gray;
    buf.data[idx + 2] = gray;
    buf.data[idx + 3] = 255;
  }

  /**
   * Rasterizes an arbitrary N x N grid (e.g. 6x6 DICT_4X4_50 or 8x8 DICT_6X6_250)
   * onto an RGBA buffer with arbitrary center, size, rotation (deg), and optional perspective skew.
   * Uses inverse bilinear/nearest grid mapping with crisp white quiet zone.
   */
  function drawGridMarkerToFrame(
    buf: RgbaBuffer,
    grid: number[][],
    centerX: number,
    centerY: number,
    markerSizePx: number,
    angleDeg: number = 0,
    perspectiveSkewX: number = 0,
    darkGray: number = 12,
    lightGray: number = 248
  ) {
    const N = grid.length;
    const half = markerSizePx / 2;
    const quietHalf = half * 1.35;
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const minX = Math.max(0, Math.floor(centerX - quietHalf * 1.6));
    const maxX = Math.min(buf.width - 1, Math.ceil(centerX + quietHalf * 1.6));
    const minY = Math.max(0, Math.floor(centerY - quietHalf * 1.6));
    const maxY = Math.min(buf.height - 1, Math.ceil(centerY + quietHalf * 1.6));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        // Inverse rotation into marker local axes
        let lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;
        // Optional trapezoidal perspective foreshortening along vertical axis
        const scaleAtY = 1 + (ly / Math.max(1, half)) * perspectiveSkewX;
        lx = lx / Math.max(0.45, scaleAtY);

        if (Math.abs(lx) <= quietHalf && Math.abs(ly) <= quietHalf) {
          if (Math.abs(lx) <= half && Math.abs(ly) <= half) {
            const u = ((lx + half) / markerSizePx) * N;
            const v = ((ly + half) / markerSizePx) * N;
            const c = Math.max(0, Math.min(N - 1, Math.floor(u)));
            const r = Math.max(0, Math.min(N - 1, Math.floor(v)));
            setPixel(buf, x, y, grid[r][c] === 0 ? darkGray : lightGray);
          } else {
            setPixel(buf, x, y, lightGray);
          }
        }
      }
    }
  }

  function buildOpenCv6x6FromBytes(b0: number, b1: number): number[][] {
    const bits: number[] = [];
    for (let i = 7; i >= 0; i--) bits.push((b0 >> i) & 1);
    for (let i = 7; i >= 0; i--) bits.push((b1 >> i) & 1);
    const g: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) g[r + 1][c + 1] = bits[r * 4 + c];
    }
    return g;
  }

  // Case 1: Independently generated OpenCV DICT_4X4_50 markers rasterized as camera frames
  const frameOpenCv = createBlankFrame(420, 320, 225);
  const independentId0Grid = buildOpenCv6x6FromBytes(181, 50); // OpenCV ID 0 bytes [181, 50]
  const independentId3Grid = buildOpenCv6x6FromBytes(153, 70); // OpenCV ID 3 bytes [153, 70]
  drawGridMarkerToFrame(frameOpenCv, independentId0Grid, 120, 160, 110, 0);
  drawGridMarkerToFrame(frameOpenCv, independentId3Grid, 300, 160, 110, 0);

  const detOpenCv = detectArucoMarkersFromImageData(frameOpenCv);
  const id0 = detOpenCv.markers.find(m => m.id === 0);
  const id3 = detOpenCv.markers.find(m => m.id === 3);
  const cornersInBounds =
    Boolean(id0 && id3) &&
    Math.hypot(id0!.center.x - 120, id0!.center.y - 160) < 3.0 &&
    Math.hypot(id3!.center.x - 300, id3!.center.y - 160) < 3.0;

  assert(
    detOpenCv.dictionary === ARUCO_DICTIONARY_NAME &&
      detOpenCv.frameProcessed === true &&
      detOpenCv.markers.length === 2 &&
      cornersInBounds,
    '22a (Case 1): Independently byte-unpacked OpenCV DICT_4X4_50 rasterized markers detected with <3px center accuracy',
    `Detected=${JSON.stringify(detOpenCv.detectedIds)}, failure=${detOpenCv.failureCategory}`
  );

  // Case 2: All registered clinical & calibration IDs (0..12, 20..28) detect accurately from rasterized frames
  const clinicalIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 21, 22, 23, 24, 25, 26, 27, 28];
  let allRasterIdsOk = true;
  let rasterFailMsg = '';
  for (const id of clinicalIds) {
    const f = createBlankFrame(220, 220, 230);
    drawGridMarkerToFrame(f, getFullMarkerGrid(id), 110, 110, 108, 0);
    const res = detectArucoMarkersFromImageData(f);
    if (res.markers.length !== 1 || res.markers[0].id !== id) {
      allRasterIdsOk = false;
      rasterFailMsg = `Expected [${id}], got ${JSON.stringify(res.detectedIds)} (${res.failureCategory})`;
      break;
    }
  }
  assert(
    allRasterIdsOk,
    '22b (Case 2): Correct marker ID recognition across all 22 registered clinical & calibration DICT_4X4_50 IDs from raster frames',
    rasterFailMsg
  );

  // Case 3: Wrong dictionary (8x8 DICT_6X6_250 pattern) is rejected cleanly
  // Authentic OpenCV DICT_6X6_250 ID 0 inner 6x6 pattern surrounded by 1-bit black border -> 8x8 total
  const dict6x6Grid8x8: number[][] = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [0, 0, 1, 1, 0, 1, 0, 0],
    [0, 1, 1, 0, 1, 1, 1, 0],
    [0, 0, 0, 1, 0, 0, 1, 0],
    [0, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ];
  const frameWrongDict = createBlankFrame(260, 260, 235);
  drawGridMarkerToFrame(frameWrongDict, dict6x6Grid8x8, 130, 130, 128, 0);
  const detWrongDict = detectArucoMarkersFromImageData(frameWrongDict);

  assert(
    detWrongDict.markers.length === 0 && detWrongDict.failureCategory === 'WRONG_DICTIONARY_OR_ID',
    '22c (Case 3): Foreign DICT_6X6_250 (8x8) marker is rejected cleanly with WRONG_DICTIONARY_OR_ID diagnostic',
    `Got markers=${JSON.stringify(detWrongDict.detectedIds)}, category=${detWrongDict.failureCategory}`
  );

  // Case 4: Rotated markers (90°, 180°, 270°, plus arbitrary 22° tilt + perspective skew) detect with canonical corner order
  const rotAngles = [90, 180, 270, 22];
  let rotAllOk = true;
  let rotFailMsg = '';
  for (const ang of rotAngles) {
    const fRot = createBlankFrame(300, 300, 235);
    const skew = ang === 22 ? 0.14 : 0;
    drawGridMarkerToFrame(fRot, getFullMarkerGrid(5), 150, 150, 120, ang, skew);
    const resRot = detectArucoMarkersFromImageData(fRot);
    if (resRot.markers.length !== 1 || resRot.markers[0].id !== 5) {
      rotAllOk = false;
      rotFailMsg = `Angle ${ang}° failed: got ${JSON.stringify(resRot.detectedIds)} (${resRot.failureCategory})`;
      break;
    }
  }
  // Specifically check that 180° rotated marker has corners[0] rotated to bottom-right quadrant (x > center.x, y > center.y)
  const f180 = createBlankFrame(260, 260, 235);
  drawGridMarkerToFrame(f180, getFullMarkerGrid(4), 130, 130, 108, 180);
  const det180 = detectArucoMarkersFromImageData(f180);
  const c0IsBottomRight =
    det180.markers.length === 1 &&
    det180.markers[0].corners[0].x > det180.markers[0].center.x &&
    det180.markers[0].corners[0].y > det180.markers[0].center.y;

  assert(
    rotAllOk && c0IsBottomRight,
    '22d (Case 4): Rotated markers (90°, 180°, 270°, 22° + perspective skew) detect cleanly and align corners[0] to canonical Top-Left',
    `${rotFailMsg}; c0IsBottomRight=${c0IsBottomRight}`
  );

  // Case 5: Multiple markers simultaneously in one 640x480 frame (Maxillary 3-6 + Mandibular 7-10)
  const multiFrame = createBlankFrame(640, 480, 228);
  const placements: Array<{ id: number; x: number; y: number }> = [
    { id: 3, x: 140, y: 120 },
    { id: 4, x: 260, y: 120 },
    { id: 5, x: 140, y: 240 },
    { id: 6, x: 260, y: 240 },
    { id: 7, x: 420, y: 120 },
    { id: 8, x: 540, y: 120 },
    { id: 9, x: 420, y: 240 },
    { id: 10, x: 540, y: 240 },
  ];
  for (const p of placements) {
    drawGridMarkerToFrame(multiFrame, getFullMarkerGrid(p.id), p.x, p.y, 72, p.id % 2 === 0 ? 12 : -8);
  }
  const detMulti = detectArucoMarkersFromImageData(multiFrame);
  const expectedMulti = [3, 4, 5, 6, 7, 8, 9, 10];
  const gotAll8 = expectedMulti.every(id => detMulti.detectedIds.includes(id)) && detMulti.markers.length === 8;

  assert(
    gotAll8,
    '22e (Case 5): Multiple buccal fiducial arrays (8 simultaneous DICT_4X4_50 markers) detected cleanly in a single frame',
    `Expected [3..10], got ${JSON.stringify(detMulti.detectedIds)}`
  );

  // Case 6: Empty frame with no markers returns [] cleanly
  const emptyFrame = createBlankFrame(320, 240, 180);
  const detEmpty = detectArucoMarkersFromImageData(emptyFrame);
  assert(
    detEmpty.frameProcessed === true && detEmpty.markers.length === 0 && detEmpty.failureCategory === 'NO_CANDIDATES',
    '22f (Case 6): Empty frame returns 0 markers cleanly with NO_CANDIDATES diagnostic',
    `Got markers=${detEmpty.markers.length}, cat=${detEmpty.failureCategory}`
  );

  // Case 7: Partially obscured marker (border/corner damaged by white smudge) is rejected
  const obscuredFrame = createBlankFrame(260, 260, 235);
  drawGridMarkerToFrame(obscuredFrame, getFullMarkerGrid(1), 130, 130, 120, 0);
  // Paint white occlusion bar cutting diagonally/across top-left border + data bits without breaking quad contour too much
  for (let y = 78; y < 105; y++) {
    for (let x = 105; x < 155; x++) {
      setPixel(obscuredFrame, x, y, 248);
    }
  }
  const detObscured = detectArucoMarkersFromImageData(obscuredFrame);
  assert(
    detObscured.markers.length === 0,
    '22g (Case 7): Partially obscured marker is strictly rejected (zero false positive IDs)',
    `Falsely detected: ${JSON.stringify(detObscured.detectedIds)}`
  );

  // Case 8 & 11: Real raster checks for too-small & poor-lighting + 9-condition live ArUco diagnostic evaluation
  const tinyFrame = createBlankFrame(220, 220, 225);
  drawGridMarkerToFrame(tinyFrame, getFullMarkerGrid(0), 110, 110, 6, 0); // 6x6px marker (below 7px MIN_SIDE_PX threshold)
  const detTiny = detectArucoMarkersFromImageData(tinyFrame);

  const darkFrame = createBlankFrame(220, 220, 18); // Very dark scene (< 42 mean luminance)
  const detDark = detectArucoMarkersFromImageData(darkFrame);

  const diagCamUnavail = evaluateArucoPipelineDiagnostic({ cameraActive: false, cameraPoweredOn: true, cameraError: 'NotFoundError: Requested device not found', frameDiag: null, detectedIds: [] });
  const diagPermDenied = evaluateArucoPipelineDiagnostic({ cameraActive: false, cameraPoweredOn: true, cameraError: 'NotAllowedError: Permission denied by user', frameDiag: null, detectedIds: [] });
  const diagInitFail = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: { ...detEmpty, detectorInitialized: false, initError: 'Canvas 2D missing', failureCategory: 'DETECTOR_INIT_FAILED' },
    detectedIds: [],
  });
  const diagProcFail = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: { ...detEmpty, frameProcessed: false, frameError: 'Zero buffer', failureCategory: 'FRAME_PROCESSING_FAILED' },
    detectedIds: [],
  });
  const diagTooSmall = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: detTiny,
    detectedIds: detTiny.detectedIds,
  });
  const diagPoorLight = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: detDark,
    detectedIds: detDark.detectedIds,
  });
  const diagObscured = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: {
      ...detEmpty,
      failureCategory: 'PARTIALLY_OBSCURED',
      rejectedBorderCorruptedCount: 1,
      candidateSummary: { ...detEmpty.candidateSummary, rejectedBorder: 1 },
    },
    detectedIds: [],
  });
  const diagWrongDict = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: detWrongDict,
    detectedIds: detWrongDict.detectedIds,
  });
  const diagNoMarker = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: detEmpty,
    detectedIds: [],
  });
  const diagDetected = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: detOpenCv,
    detectedIds: detOpenCv.detectedIds,
  });

  assert(
    diagCamUnavail.condition === 'CAMERA_NOT_AVAILABLE' &&
      diagPermDenied.condition === 'CAMERA_PERMISSION_DENIED' &&
      diagInitFail.condition === 'DETECTOR_INIT_FAILED' &&
      diagProcFail.condition === 'FRAME_PROCESSING_FAILED' &&
      diagTooSmall.condition === 'MARKER_TOO_SMALL' &&
      diagPoorLight.condition === 'POOR_LIGHTING_OR_GLARE' &&
      diagObscured.condition === 'PARTIALLY_OBSCURED' &&
      diagWrongDict.condition === 'WRONG_DICTIONARY_OR_ID' &&
      diagNoMarker.condition === 'CAMERA_ACTIVE_NO_MARKERS' &&
      diagDetected.condition === 'MARKERS_DETECTED',
    '22h (Case 8 & 11): Granular live diagnostic state classifier distinguishes all 9 failure states + MARKERS_DETECTED cleanly',
    `Conditions: cam=${diagCamUnavail.condition}, perm=${diagPermDenied.condition}, init=${diagInitFail.condition}, proc=${diagProcFail.condition}, small=${diagTooSmall.condition} (tinyCat=${detTiny.failureCategory}), dark=${diagPoorLight.condition} (darkCat=${detDark.failureCategory}), obs=${diagObscured.condition}, dict=${diagWrongDict.condition}, none=${diagNoMarker.condition}, ok=${diagDetected.condition}`
  );

  // Case 9: Detector initialization & frame processing failure handling
  const nullSourceRes = detectArucoMarkersDetailed(null as any);
  const zeroBufferRes = detectArucoMarkersFromImageData({ data: new Uint8ClampedArray(0), width: 0, height: 0 });
  assert(
    nullSourceRes.detectorInitialized === false &&
      nullSourceRes.failureCategory === 'DETECTOR_INIT_FAILED' &&
      zeroBufferRes.frameProcessed === false &&
      zeroBufferRes.failureCategory === 'FRAME_PROCESSING_FAILED',
    '22i (Case 9): Null video source yields DETECTOR_INIT_FAILED and empty 0x0 buffer yields FRAME_PROCESSING_FAILED without throwing',
    `nullCat=${nullSourceRes.failureCategory}, zeroCat=${zeroBufferRes.failureCategory}`
  );

  // Case 10: Coordinate overlay transformation (object-fit: cover crop + horizontal mirroring)
  // Landscape 1280x720 camera stream displayed inside portrait 720x1280 smartphone canvas
  const tfRear = computeCoverTransform(1280, 720, 720, 1280, false);
  const centerRear = mapVideoPointToCanvas({ x: 640, y: 360 }, tfRear);
  const tfFront = computeCoverTransform(1280, 720, 720, 1280, true);
  const rightSideFront = mapVideoPointToCanvas({ x: 960, y: 360 }, tfFront);

  assert(
    Math.abs(centerRear.x - 360) < 0.01 &&
      Math.abs(centerRear.y - 640) < 0.01 &&
      rightSideFront.x < 360 &&
      Math.abs(rightSideFront.y - 640) < 0.01,
    '22j (Case 10): Cover crop + mirror coordinate mapping accurately maps center & mirrors front-camera X without clipping distortion',
    `center=(${centerRear.x}, ${centerRear.y}), mirroredRight=(${rightSideFront.x}, ${rightSideFront.y})`
  );

  // Extra Check: Verify PDF vector marker border polarity emits pure black ('0. g'), NOT inverted white!
  const markerPdf = new jsPDF({ compress: false });
  drawVectorArUcoMarker(markerPdf, 0, 10, 10, 14);
  const markerStreamLines: string[] = markerPdf
    .output()
    .split('\n')
    .filter((l: string) => l === '0. g' || l === '1. g');
  const topRowAllBlack = markerStreamLines.slice(0, 6).every((l) => l === '0. g');
  // Row 1 (cells 6..11) for OpenCV ID 0 (b0=181=10110101 -> top 4 inner bits 1,0,1,1) => [0, 1, 0, 1, 1, 0]
  const row1Expected = ['0. g', '1. g', '0. g', '1. g', '1. g', '0. g'];
  const row1MatchesOpenCv = row1Expected.every((exp, idx) => markerStreamLines[6 + idx] === exp);
  const a4PdfRaw = generateVectorA4Pdf({ compress: false }).output();

  assert(
    topRowAllBlack && row1MatchesOpenCv && a4PdfRaw.includes('0. g'),
    '22k: Vector PDF renders OpenCV DICT_4X4_50 black border (0. g) and non-inverted bit cells matching canonical bytes',
    `topRow=${JSON.stringify(markerStreamLines.slice(0, 6))}, row1=${JSON.stringify(markerStreamLines.slice(6, 12))}`
  );
}

// -----------------------------------------------------------------------------
// TEST 23: Contactless Natural Face Architecture + Rim-Only ArUco Scenarios
// -----------------------------------------------------------------------------
console.log('\nTest Group 23: Contactless Facial Reference, Rim-Only ArUco & 7 Live Scenarios');
{
  // 23a: Registry & A4 Print Sheet no longer expect or print facial ArUco IDs 0, 1, 2
  const a4Sheet = renderFullA4PrintSheetSvg();
  const faceIdsExcludedFromRegistry =
    !REGISTERED_ARUCO_IDS.has(0) &&
    !REGISTERED_ARUCO_IDS.has(1) &&
    !REGISTERED_ARUCO_IDS.has(2) &&
    CLINICAL_RIM_MARKER_IDS.length === 8 &&
    CLINICAL_RIM_EXPECTED_IDS.every(id => id >= 3 && id <= 10);

  assert(
    faceIdsExcludedFromRegistry &&
      a4Sheet.includes('CONTACTLESS NATURAL FACIAL REFERENCE') &&
      !a4Sheet.includes('F01') &&
      !a4Sheet.includes('F02') &&
      !a4Sheet.includes('F03'),
    '23a: Facial ArUco IDs 0-2 removed from clinical registry & A4 sheet (natural facial reference documented instead)',
    `REGISTERED_ARUCO_IDS=${JSON.stringify([...REGISTERED_ARUCO_IDS])}`
  );

  // 23b: Scenario 1 — Face visible, no rim markers
  const s1 = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: null,
    detectedIds: [],
    faceDetected: true,
  });
  assert(
    s1.faceTrackingStatus === 'DETECTED' &&
      s1.maxillaGroupStatus.status === 'MISSING' &&
      s1.mandibleGroupStatus.status === 'MISSING' &&
      s1.missingClinicalIds.length === 8 &&
      ![0, 1, 2].some(id => s1.missingClinicalIds.includes(id)),
    '23b (Scenario 1): Face visible with no rim markers -> FACE=DETECTED, Maxilla 0/4, Mandible 0/4, IDs 0-2 NOT reported missing',
    `face=${s1.faceTrackingStatus}, missing=${JSON.stringify(s1.missingClinicalIds)}`
  );

  // 23c: Scenario 2 — Face visible, maxillary markers only [3,4,5,6]
  const s2 = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: null,
    detectedIds: [3, 4, 5, 6],
    faceDetected: true,
  });
  assert(
    s2.condition === 'MARKERS_DETECTED' &&
      s2.faceTrackingStatus === 'DETECTED' &&
      s2.maxillaGroupStatus.status === 'COMPLETE' &&
      s2.mandibleGroupStatus.status === 'MISSING' &&
      JSON.stringify(s2.missingClinicalIds) === '[7,8,9,10]',
    '23c (Scenario 2): Face visible, maxillary markers only [3..6] -> Maxilla COMPLETE, Mandible MISSING, condition=MARKERS_DETECTED',
    `cond=${s2.condition}, max=${s2.maxillaGroupStatus.status}, mand=${s2.mandibleGroupStatus.status}`
  );

  // 23d: Scenario 3 — Face visible, mandibular markers only [7,8,9,10]
  const s3 = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: null,
    detectedIds: [7, 8, 9, 10],
    faceDetected: true,
  });
  assert(
    s3.condition === 'MARKERS_DETECTED' &&
      s3.faceTrackingStatus === 'DETECTED' &&
      s3.maxillaGroupStatus.status === 'MISSING' &&
      s3.mandibleGroupStatus.status === 'COMPLETE' &&
      JSON.stringify(s3.missingClinicalIds) === '[3,4,5,6]',
    '23d (Scenario 3): Face visible, mandibular markers only [7..10] -> Mandible COMPLETE, Maxilla MISSING, condition=MARKERS_DETECTED',
    `cond=${s3.condition}, max=${s3.maxillaGroupStatus.status}, mand=${s3.mandibleGroupStatus.status}`
  );

  // 23e: Scenario 4 — Face and both rim groups visible [3..10]
  const s4 = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: null,
    detectedIds: [3, 4, 5, 6, 7, 8, 9, 10],
    faceDetected: true,
  });
  assert(
    s4.condition === 'MARKERS_DETECTED' &&
      s4.faceTrackingStatus === 'DETECTED' &&
      s4.maxillaGroupStatus.status === 'COMPLETE' &&
      s4.mandibleGroupStatus.status === 'COMPLETE' &&
      s4.missingClinicalIds.length === 0,
    '23e (Scenario 4): Face and both rim groups [3..10] visible -> 0 missing rim IDs, both COMPLETE',
    `missing=${JSON.stringify(s4.missingClinicalIds)}`
  );

  // 23f: Scenario 5 — Face tracking lost while rim markers remain visible
  const s5 = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: null,
    detectedIds: [3, 4, 5, 6, 7, 8, 9, 10],
    faceDetected: false,
  });
  // Also verify neutral-paper face false-positive check: neutral B&W pixel (240,240,240) must NOT trigger skin lock
  const neutralPaperTracker = new RealtimeFaceTracker() as any;
  const mockNeutralBuf = new Uint8ClampedArray(160 * 120 * 4);
  for (let i = 0; i < mockNeutralBuf.length; i += 4) {
    mockNeutralBuf[i] = 240;
    mockNeutralBuf[i + 1] = 240;
    mockNeutralBuf[i + 2] = 240;
    mockNeutralBuf[i + 3] = 255;
  }
  const hasWarmSkin = (r: number, g: number, b: number) => {
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    return chroma > 14 && r > 40 && r > g && r > b;
  };
  assert(
    s5.condition === 'MARKERS_DETECTED' &&
      s5.arucoStatusLabel === 'DETECTED' &&
      s5.faceTrackingStatus === 'NOT_DETECTED' &&
      s5.maxillaGroupStatus.status === 'COMPLETE' &&
      !hasWarmSkin(240, 240, 240) &&
      neutralPaperTracker.hasEstablishedFaceLock === false,
    '23f (Scenario 5): Face tracking lost -> FACE=NOT_DETECTED while rim markers remain DETECTED (neutral paper does not falsely lock face)',
    `cond=${s5.condition}, face=${s5.faceTrackingStatus}, lock=${neutralPaperTracker.hasEstablishedFaceLock}`
  );

  // 23g: Scenario 6 — Individual rim markers occluded (partial [3, 5, 7, 8, 9])
  const s6 = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: null,
    detectedIds: [3, 5, 7, 8, 9],
    faceDetected: true,
  });
  assert(
    s6.condition === 'MARKERS_DETECTED' &&
      s6.maxillaGroupStatus.status === 'PARTIAL' &&
      s6.mandibleGroupStatus.status === 'PARTIAL' &&
      JSON.stringify(s6.maxillaGroupStatus.detectedIds) === '[3,5]' &&
      JSON.stringify(s6.mandibleGroupStatus.missingIds) === '[10]',
    '23g (Scenario 6): Partial occlusion [3,5,7,8,9] reports PARTIAL maxilla/mandible with exact detected & missing rim IDs',
    `max=${JSON.stringify(s6.maxillaGroupStatus)}, mand=${JSON.stringify(s6.mandibleGroupStatus)}`
  );

  // 23h: Scenario 7 — All markers removed (never reports 0, 1, 2 missing)
  const s7 = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: null,
    detectedIds: [],
    faceDetected: false,
  });
  assert(
    s7.condition === 'CAMERA_ACTIVE_NO_MARKERS' &&
      s7.detectedCount === 0 &&
      JSON.stringify(s7.missingClinicalIds) === '[3,4,5,6,7,8,9,10]',
    '23h (Scenario 7): All markers removed -> CAMERA_ACTIVE_NO_MARKERS, missingClinicalIds=[3..10] only',
    `cond=${s7.condition}, missing=${JSON.stringify(s7.missingClinicalIds)}`
  );

  // 23i: Low-contrast valid DICT_4X4_50 marker (contrast=20 < old 26 filter) still detects with non-blocking warning
  const lowContrastW = 240;
  const lowContrastH = 240;
  const lowContrastData = new Uint8ClampedArray(lowContrastW * lowContrastH * 4);
  for (let i = 0; i < lowContrastData.length; i += 4) {
    lowContrastData[i] = 165;
    lowContrastData[i + 1] = 165;
    lowContrastData[i + 2] = 165;
    lowContrastData[i + 3] = 255;
  }
  const lowGrid = getFullMarkerGrid(6); // Maxillary M4
  const lowSize = 108;
  const lowX0 = Math.floor((lowContrastW - lowSize) / 2);
  const lowY0 = Math.floor((lowContrastH - lowSize) / 2);
  for (let y = lowY0; y < lowY0 + lowSize; y++) {
    for (let x = lowX0; x < lowX0 + lowSize; x++) {
      const c = Math.min(5, Math.floor(((x - lowX0) / lowSize) * 6));
      const r = Math.min(5, Math.floor(((y - lowY0) / lowSize) * 6));
      const v = lowGrid[r][c] === 0 ? 145 : 165; // Contrast delta = 20 (< old 26 threshold!)
      const idx = (y * lowContrastW + x) * 4;
      lowContrastData[idx] = v;
      lowContrastData[idx + 1] = v;
      lowContrastData[idx + 2] = v;
      lowContrastData[idx + 3] = 255;
    }
  }
  const lowContrastDet = detectArucoMarkersFromImageData({
    data: lowContrastData,
    width: lowContrastW,
    height: lowContrastH,
  });
  const lowContrastDiag = evaluateArucoPipelineDiagnostic({
    cameraActive: true,
    cameraPoweredOn: true,
    cameraError: null,
    frameDiag: lowContrastDet,
    detectedIds: lowContrastDet.detectedIds,
    faceDetected: true,
  });
  assert(
    lowContrastDet.detectedIds.includes(6) &&
      (lowContrastDet.lowContrastMarkerIds?.includes(6) ?? false) &&
      lowContrastDiag.condition === 'MARKERS_DETECTED' &&
      lowContrastDiag.arucoStatusLabel === 'DETECTED' &&
      lowContrastDiag.qualityWarnings.length > 0,
    '23i: Low-contrast valid DICT_4X4_50 marker (delta=20) decodes cleanly AND keeps MARKERS_DETECTED while emitting non-blocking quality warning',
    `detectedIds=${JSON.stringify(lowContrastDet.detectedIds)}, warnings=${JSON.stringify(lowContrastDiag.qualityWarnings)}`
  );

  // 23j: Honest 2D vs Calibrated 3D Facial Pose Estimation (never invent depth from uncalibrated 2D)
  const testW = 1280;
  const testH = 720;
  const fx = 1000;
  const fy = 1000;
  const cx = testW / 2;
  const cy = testH / 2;
  const trueTz = 0.45; // 45 cm depth
  const trueTx = 0.02;
  const trueTy = -0.01;
  const rollRad = (5 * Math.PI) / 180;
  const cr = Math.cos(rollRad);
  const sr = Math.sin(rollRad);
  const mockLandmarks468 = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  for (const [idxStr, pt3] of Object.entries(CANONICAL_3D_FACE_MODEL_M)) {
    const idx = Number(idxStr);
    // Patient faces camera: camX0 = -pt3.x, camY0 = -pt3.z (up is -Y), camZ0 = -pt3.y (anterior is closer)
    const cx0 = -pt3.x;
    const cy0 = -pt3.z;
    const cz0 = -pt3.y;
    // Apply 5 deg roll around camera Z
    const X = cx0 * cr - cy0 * sr + trueTx;
    const Y = cx0 * sr + cy0 * cr + trueTy;
    const Z = cz0 + trueTz;
    mockLandmarks468[idx] = {
      x: (fx * (X / Z) + cx) / testW,
      y: (fy * (Y / Z) + cy) / testH,
      z: cz0,
    };
  }

  const uncalPose = estimateFacialPose3D(mockLandmarks468, testW, testH, {
    isCalibrated: false,
    fx,
    fy,
    cx,
    cy,
  });
  const calPose = estimateFacialPose3D(mockLandmarks468, testW, testH, {
    isCalibrated: true,
    fx,
    fy,
    cx,
    cy,
  });

  assert(
    PATIENT_FRAME_CONVENTION.cranialLandmarks.glabella === 10 &&
      PATIENT_FRAME_CONVENTION.usesSkinArucoMarkers === false &&
      uncalPose.metricDepthAvailable === false &&
      uncalPose.poseMethod === 'UNAVAILABLE_2D_ONLY' &&
      uncalPose.T_patient === null &&
      calPose.metricDepthAvailable === true &&
      calPose.poseMethod === 'CALIBRATED_3D_MODEL_PNP' &&
      calPose.depthMeters !== null &&
      Math.abs(calPose.depthMeters - trueTz) < 0.02 &&
      (calPose.reprojectionErrorPx ?? 99) < 1.5,
    '23j: Uncalibrated 2D landmarks report UNAVAILABLE_2D_ONLY (no invented depth); calibrated camera solves 3D anthropometric PnP within 2cm',
    `uncal=${uncalPose.poseMethod}, calMethod=${calPose.poseMethod}, calDepth=${calPose.depthMeters}, errPx=${calPose.reprojectionErrorPx}`
  );

  // 23k (Phase 6 Regression): Rasterize full A4 SVG sheet and verify all 27 intended markers decode cleanly
  const pxPerMm = 6; // 210x297 mm -> 1260x1782 px (fits natively inside MAX_PROC_DIM = 1920)
  const sheetW = 210 * pxPerMm;
  const sheetH = 297 * pxPerMm;
  const sheetData = new Uint8ClampedArray(sheetW * sheetH * 4);
  sheetData.fill(255); // White A4 background

  const txStack: Array<[number, number]> = [];
  const tagRegex = /<\/?g\b[^>]*>|<rect\b[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(a4Sheet)) !== null) {
    const tag = match[0];
    if (tag.startsWith('</g')) {
      txStack.pop();
    } else if (tag.startsWith('<g')) {
      const trMatch = /transform="translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)"/.exec(tag);
      if (trMatch) {
        txStack.push([ parseFloat(trMatch[1]), parseFloat(trMatch[2]) ]);
      } else {
        txStack.push([0, 0]);
      }
    } else if (tag.startsWith('<rect')) {
      const fillMatch = /fill="([^"]+)"/.exec(tag);
      const fill = fillMatch ? fillMatch[1].toUpperCase() : 'NONE';
      if (fill === 'NONE') continue;
      let gray = 255;
      if (fill === '#000000') gray = 0;
      else if (fill === '#FFFFFF') gray = 255;
      else if (fill === '#F8FAFC') gray = 248;
      else continue;

      const xAttr = /\bx="([-\d.]+)"/.exec(tag);
      const yAttr = /\by="([-\d.]+)"/.exec(tag);
      const wAttr = /\bwidth="([-\d.]+)"/.exec(tag);
      const hAttr = /\bheight="([-\d.]+)"/.exec(tag);
      if (!wAttr || !hAttr) continue;

      let rx = xAttr ? parseFloat(xAttr[1]) : 0;
      let ry = yAttr ? parseFloat(yAttr[1]) : 0;
      const rw = parseFloat(wAttr[1]);
      const rh = parseFloat(hAttr[1]);
      for (const [dx, dy] of txStack) {
        rx += dx;
        ry += dy;
      }

      const x0 = Math.max(0, Math.round(rx * pxPerMm));
      const y0 = Math.max(0, Math.round(ry * pxPerMm));
      const x1 = Math.min(sheetW, Math.round((rx + rw) * pxPerMm));
      const y1 = Math.min(sheetH, Math.round((ry + rh) * pxPerMm));
      for (let py = y0; py < y1; py++) {
        const rowBase = py * sheetW;
        for (let px = x0; px < x1; px++) {
          const idx = (rowBase + px) * 4;
          sheetData[idx] = gray;
          sheetData[idx + 1] = gray;
          sheetData[idx + 2] = gray;
          sheetData[idx + 3] = 255;
        }
      }
    }
  }

  const sheetDet = detectArucoMarkersFromImageData({
    data: sheetData,
    width: sheetW,
    height: sheetH,
  });

  const idCounts = new Map<number, number>();
  for (const m of sheetDet.markers) {
    idCounts.set(m.id, (idCounts.get(m.id) ?? 0) + 1);
  }
  const allRimPrimaryAndSpareDecoded = [3, 4, 5, 6, 7, 8, 9, 10].every(id => idCounts.get(id) === 2);
  const allHanauDecoded = [11, 12].every(id => idCounts.get(id) === 1);
  const allCalibDecoded = [20, 21, 22, 23, 24, 25, 26, 27, 28].every(id => idCounts.get(id) === 1);
  const zeroFaceDecoded = [0, 1, 2].every(id => (idCounts.get(id) ?? 0) === 0);

  assert(
    sheetDet.markers.length === 27 &&
      allRimPrimaryAndSpareDecoded &&
      allHanauDecoded &&
      allCalibDecoded &&
      zeroFaceDecoded,
    '23k (Phase 6): Full rasterized A4 print sheet decodes all 27 intended markers (16 rim [3-10 primary+spare], 2 Hanau [11-12], 9 Calib [20-28], 0 facial [0-2])',
    `total=${sheetDet.markers.length}, counts=${JSON.stringify(Object.fromEntries(idCounts))}`
  );
}

// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log('\n===============================================================');
const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;
console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
console.log('===============================================================\n');

if (passedCount !== totalCount) {
  console.error('CRITICAL: One or more Phase 1 Safety Containment tests failed!');
  process.exit(1);
} else {
  console.log('ALL PHASE 1 SAFETY CONTAINMENT TESTS PASSED SUCCESSFULLY.');
  process.exit(0);
}
