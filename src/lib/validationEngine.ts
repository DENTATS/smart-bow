/**
 * SmartBow AI - Academic & Clinical Validation Test Engine
 * Implements Stage 1 Bench & Stage 2 Phantom protocol
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 * 
 * PHASE 1 SAFETY CONTAINMENT:
 * - Empty by default: "NO PHYSICAL VALIDATION DATA RECORDED".
 * - Synthetic data is explicitly tagged with provenance: 'SIMULATED'.
 * - Fabricated physical PASS scores blocked until genuine physical data is logged.
 * - All exports carry "SIMULATION — NOT FOR CLINICAL USE".
 */

import { ValidationBenchTest, DataProvenance } from '../types/smartbow';

export interface ValidationStatistics {
  testType: string;
  sampleCount: number;
  nominalMean: number;
  measuredMean: number;
  meanError: number;
  meanAbsoluteError: number;
  standardDeviation: number;
  rmsError: number;
  maxError: number;
  ci95Lower: number;
  ci95Upper: number;
  targetThreshold: number;
  passed: boolean;
  unit: string;
  provenance: DataProvenance;
  statusMessage: string;
  hasPhysicalData: boolean;
}

export function computeStatistics(
  tests: ValidationBenchTest[],
  targetThreshold: number,
  unit: string = 'mm'
): ValidationStatistics {
  if (!tests || tests.length === 0) {
    return {
      testType: 'None',
      sampleCount: 0,
      nominalMean: 0,
      measuredMean: 0,
      meanError: 0,
      meanAbsoluteError: 0,
      standardDeviation: 0,
      rmsError: 0,
      maxError: 0,
      ci95Lower: 0,
      ci95Upper: 0,
      targetThreshold,
      passed: false,
      unit,
      provenance: 'UNAVAILABLE',
      statusMessage: 'NO PHYSICAL VALIDATION DATA RECORDED',
      hasPhysicalData: false
    };
  }

  const n = tests.length;
  const isAllSimulated = tests.every(t => t.provenance === 'SIMULATED');
  const hasPhysicalData = tests.some(t => t.provenance === 'MEASURED');
  const overallProvenance: DataProvenance = hasPhysicalData ? 'MEASURED' : isAllSimulated ? 'SIMULATED' : 'UNAVAILABLE';

  const errors = tests.map(t => t.measuredValue - t.nominalValue);
  const absErrors = tests.map(t => Math.abs(t.measuredValue - t.nominalValue));

  const nominalMean = tests.reduce((acc, t) => acc + t.nominalValue, 0) / n;
  const measuredMean = tests.reduce((acc, t) => acc + t.measuredValue, 0) / n;
  const meanError = errors.reduce((acc, e) => acc + e, 0) / n;
  const meanAbsoluteError = absErrors.reduce((acc, e) => acc + e, 0) / n;

  // Standard deviation of errors
  const variance = errors.reduce((acc, e) => acc + Math.pow(e - meanError, 2), 0) / (n > 1 ? n - 1 : 1);
  const standardDeviation = Math.sqrt(variance);

  // RMS Error
  const sumSquares = errors.reduce((acc, e) => acc + e * e, 0);
  const rmsError = Math.sqrt(sumSquares / n);

  const maxError = Math.max(...absErrors);

  // 95% Confidence Interval
  const stdErr = standardDeviation / Math.sqrt(n);
  const tValue = n > 30 ? 1.96 : 2.04;
  const ci95Lower = meanError - tValue * stdErr;
  const ci95Upper = meanError + tValue * stdErr;

  // SAFETY RULE: Synthetic/Simulated datasets can NEVER produce a clinical or physical PASS!
  const mathematicalPass = meanAbsoluteError < targetThreshold;
  const passed = hasPhysicalData && mathematicalPass;

  let statusMessage = '';
  if (!hasPhysicalData) {
    statusMessage = isAllSimulated 
      ? 'SIMULATION ONLY — NOT PHYSICAL BENCH DATA' 
      : 'NO PHYSICAL VALIDATION DATA RECORDED';
  } else if (passed) {
    statusMessage = 'PHYSICAL BENCH VALIDATION PASSED';
  } else {
    statusMessage = 'PHYSICAL BENCH TEST FAILED THRESHOLD';
  }

  return {
    testType: tests[0].type,
    sampleCount: n,
    nominalMean: Number(nominalMean.toFixed(3)),
    measuredMean: Number(measuredMean.toFixed(3)),
    meanError: Number(meanError.toFixed(3)),
    meanAbsoluteError: Number(meanAbsoluteError.toFixed(3)),
    standardDeviation: Number(standardDeviation.toFixed(3)),
    rmsError: Number(rmsError.toFixed(3)),
    maxError: Number(maxError.toFixed(3)),
    ci95Lower: Number(ci95Lower.toFixed(3)),
    ci95Upper: Number(ci95Upper.toFixed(3)),
    targetThreshold,
    passed,
    unit,
    provenance: overallProvenance,
    statusMessage,
    hasPhysicalData
  };
}

/**
 * Returns empty baseline dataset.
 * Physical bench validation starts with 0 records until empirical trials are logged.
 */
export function getInitialPhysicalValidationDataset(): ValidationBenchTest[] {
  return [];
}

/**
 * Generate synthetic demonstration dataset for UI testing.
 * Explicitly carries provenance: 'SIMULATED'.
 */
export function generateSimulatedDemoValidationDataset(): ValidationBenchTest[] {
  const tests: ValidationBenchTest[] = [];
  let testIndex = 1;

  // B1 Marker Detection Rate (Simulated demonstration)
  for (let rep = 1; rep <= 10; rep++) {
    const detectedPct = Number((96.0 + Math.sin(rep * 2.3) * 3.5).toFixed(1));
    const error = Number((100.0 - detectedPct).toFixed(1));
    tests.push({
      id: `SIM-B1-${testIndex++}`,
      type: 'B1_MARKER_DETECT',
      nominalValue: 100.0,
      measuredValue: detectedPct,
      error: error,
      passed: false, // Simulated cannot pass physical test
      repNumber: rep,
      notes: `[SIMULATED DEMO] ArUco 4x4 array detection simulation under synthetic lighting`,
      timestamp: new Date(Date.now() - (75 - rep) * 3600000).toISOString(),
      provenance: 'SIMULATED'
    });
  }

  // B2 VDO (Simulated demonstration)
  const vdoNominals = [50.0, 55.0, 60.0, 65.0, 70.0];
  vdoNominals.forEach(nominal => {
    for (let rep = 1; rep <= 6; rep++) {
      const noise = (Math.sin(testIndex * 7.1) * 0.14 + Math.cos(rep * 3.3) * 0.12);
      const measured = Number((nominal + noise).toFixed(2));
      const err = Number(Math.abs(measured - nominal).toFixed(2));
      tests.push({
        id: `SIM-B2-${testIndex++}`,
        type: 'B2_VDO_CALLIPER',
        nominalValue: nominal,
        measuredValue: measured,
        error: err,
        passed: false,
        repNumber: rep,
        notes: `[SIMULATED DEMO] Synthetic noise model around ${nominal}mm block height`,
        timestamp: new Date(Date.now() - (60 - testIndex) * 3600000).toISOString(),
        provenance: 'SIMULATED'
      });
    }
  });

  // B3 Angle (Simulated demonstration)
  const angleNominals = [0.0, 5.0, 10.0, 15.0];
  angleNominals.forEach(nominal => {
    for (let rep = 1; rep <= 6; rep++) {
      const noise = (Math.sin(testIndex * 5.7) * 0.35 + Math.cos(rep * 2.1) * 0.25);
      const measured = Number((nominal + noise).toFixed(2));
      const err = Number(Math.abs(measured - nominal).toFixed(2));
      tests.push({
        id: `SIM-B3-${testIndex++}`,
        type: 'B3_ANGLE_GAUGE',
        nominalValue: nominal,
        measuredValue: measured,
        error: err,
        passed: false,
        repNumber: rep,
        notes: `[SIMULATED DEMO] Synthetic angular tilt model at ${nominal}°`,
        timestamp: new Date(Date.now() - (40 - testIndex) * 3600000).toISOString(),
        provenance: 'SIMULATED'
      });
    }
  });

  // B4 CR Repeatability (Simulated demonstration)
  for (let rep = 1; rep <= 15; rep++) {
    const error = Number((Math.abs(Math.sin(rep * 1.9) * 0.18 + Math.cos(rep * 4.2) * 0.08)).toFixed(2));
    tests.push({
      id: `SIM-B4-${testIndex++}`,
      type: 'B4_CR_REPEATABILITY',
      nominalValue: 0.0,
      measuredValue: error,
      error: error,
      passed: false,
      repNumber: rep,
      notes: `[SIMULATED DEMO] Synthetic CR jitter distribution (rep ${rep})`,
      timestamp: new Date(Date.now() - (20 - rep) * 3600000).toISOString(),
      provenance: 'SIMULATED'
    });
  }

  return tests;
}

// Deprecated alias for backwards compatibility during migration
export const generateInitialValidationDataset = generateSimulatedDemoValidationDataset;

export function exportValidationCsv(tests: ValidationBenchTest[]): string {
  const isSimulation = tests.length === 0 || tests.some(t => t.provenance === 'SIMULATED' || !t.provenance);
  
  const watermarkLines = [
    '# =========================================================================',
    `# WARNING: ${isSimulation ? 'SIMULATION — NOT FOR CLINICAL USE' : 'EMPIRICAL PHYSICAL BENCH DATA'}`,
    `# PROVENANCE: ${isSimulation ? 'SYNTHETIC_SIMULATION' : 'PHYSICAL_CALIPER_MEASURED'}`,
    `# DATE: ${new Date().toISOString()}`,
    '# ========================================================================='
  ];

  const headers = ['Test ID', 'Type', 'Provenance', 'Nominal', 'Measured', 'Error', 'Status', 'Repetition', 'Notes', 'Timestamp'];
  const rows = tests.map(t => [
    t.id,
    t.type,
    t.provenance || 'SIMULATED',
    t.nominalValue,
    t.measuredValue,
    t.error,
    t.provenance === 'MEASURED' ? (t.passed ? 'PASS' : 'FAIL') : 'SIMULATED',
    t.repNumber,
    `"${t.notes.replace(/"/g, '""')}"`,
    t.timestamp
  ]);
  
  return [...watermarkLines, headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
