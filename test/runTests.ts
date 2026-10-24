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

import { computeVdo, computeCrDeviation, analyzeGothicArch, generateClinicalSuggestions } from '../src/lib/clinicalMath';
import { generateSimulatedDemoValidationDataset, computeStatistics, exportValidationCsv } from '../src/lib/validationEngine';
import { generateHanauPrescriptionText, generatePatientCaseJson, generateExocadArticulatorFile } from '../src/lib/exportArticulator';
import { generateMountingJigStl, generateMarkerCarrierPlateStl } from '../src/lib/stlGenerator';
import { RealtimeFaceTracker } from '../src/lib/faceTrackingEngine';
import { Matrix4, createIdentityMatrix, invertRigidMatrix, multiplyRigidMatrices, transformPoint } from '../src/lib/patientFrame';
import { renderMarkerSvg, renderBoardSvg, getFullMarkerGrid, decodeMarkerGrid, CAD_BOARD_SPECIFICATION, ARUCO_DICT_4X4_50_BITS } from '../src/lib/arucoDict';
import { SOURCED_RIM_DATUMS } from '../src/lib/prosthodonticLiterature';
import { evaluateOpticalDiagnostic, checkCaptureReadiness, OPTICAL_DIAGNOSTIC_DEFINITIONS } from '../src/lib/opticalDiagnostics';
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
// TEST 13: Phase 1B — 10-State Optical Diagnostics & Capture Safety Gating
// -----------------------------------------------------------------------------
console.log('\nTest Group 13: 10-State Optical Diagnostics & Capture Safety Gating');
{
  // 13a: Missing camera in WEBCAM mode -> CAMERA_NOT_AVAILABLE
  const diagCameraOff = evaluateOpticalDiagnostic({
    cameraActive: false,
    cameraError: null,
    mode: 'WEBCAM',
    faceDetected: false,
    faceMarkersComplete: false,
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

  // 13b: Face not detected -> FACE_NOT_DETECTED
  const diagFaceOff = evaluateOpticalDiagnostic({
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION',
    faceDetected: false,
    faceMarkersComplete: false,
    arucoDetected: true,
    maxillaryComplete: true,
    mandibularComplete: true,
    cameraCalibrated: true,
    markerSizeVerified: true,
  });

  assert(
    diagFaceOff.state === 'FACE_NOT_DETECTED' && diagFaceOff.engineeringTestAllowed === false,
    '13b: Face absent yields FACE_NOT_DETECTED and gates capture',
    `Received state: ${diagFaceOff.state}`
  );

  // 13c: ArUco fiducials missing -> NO_ARUCO_MARKERS_DETECTED
  const diagNoAruco = evaluateOpticalDiagnostic({
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION',
    faceDetected: true,
    faceMarkersComplete: true,
    arucoDetected: false,
    maxillaryComplete: false,
    mandibularComplete: false,
    cameraCalibrated: true,
    markerSizeVerified: true,
  });

  assert(
    diagNoAruco.state === 'NO_ARUCO_MARKERS_DETECTED' && diagNoAruco.engineeringTestAllowed === false,
    '13c: ArUco absent yields NO_ARUCO_MARKERS_DETECTED and gates capture',
    `Received state: ${diagNoAruco.state}`
  );

  // 13d: Maxillary board incomplete -> MAXILLARY_MARKERS_INCOMPLETE
  const diagMaxillaInc = evaluateOpticalDiagnostic({
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION',
    faceDetected: true,
    faceMarkersComplete: true,
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
    faceMarkersComplete: true,
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

  // 13f: All prerequisites satisfied -> READY_FOR_ENGINEERING_TEST
  const diagReady = evaluateOpticalDiagnostic({
    cameraActive: true,
    cameraError: null,
    mode: 'SIMULATION',
    faceDetected: true,
    faceMarkersComplete: true,
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
    faceMarkersComplete: true,
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

  // 15b: Incomplete facial markers (e.g. glabella/zygoma obscured)
  const missingFaceMarkersInput = {
    ...staleInput,
    telemetryAgeMs: 16,
    faceMarkersComplete: false,
  };
  const readinessMissingFace = checkCaptureReadiness(missingFaceMarkersInput);

  assert(
    readinessMissingFace.canCapture === false && 
    readinessMissingFace.diagnostic.state === 'FACE_MARKERS_INCOMPLETE',
    '15b: Incomplete facial landmark plane yields FACE_MARKERS_INCOMPLETE and blocks capture',
    `State=${readinessMissingFace.diagnostic.state}`
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
