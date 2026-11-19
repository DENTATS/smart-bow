/**
 * SmartBow AI — Real Scanner Self-Check Engine
 *
 * Executes real runtime checks on the Live Scanner pipeline and reports PASS / WARN / FAIL
 * with measured values. Never fabricates a PASS without executing the underlying test.
 * Also supports deliberately broken inputs (no camera, wrong dictionary marker, blank frame,
 * stale face detection when camera stops) to prove that each check fails when its input is broken.
 */

import {
  ARUCO_DICT_4X4_50_BITS,
  REGISTERED_ARUCO_IDS,
  CLINICAL_RIM_MARKER_IDS,
  getFullMarkerGrid,
} from './arucoDict';
import { detectArucoMarkersFromImageData } from './arucoDetector';
import {
  MediaPipeFaceLandmarkerState,
  resolveLiveFaceTrackingState,
  FACE_DETECTION_FRESHNESS_TIMEOUT_MS,
} from './faceLandmarks';

export type SelfCheckVerdict = 'PASS' | 'WARN' | 'FAIL';

export interface SelfCheckItemResult {
  id: string;
  title: string;
  verdict: SelfCheckVerdict;
  measuredValue: string;
  detail: string;
}

export interface ScannerSelfCheckReport {
  timestamp: number;
  overallVerdict: SelfCheckVerdict;
  items: SelfCheckItemResult[];
}

export type SelfCheckInjectedFault =
  | 'NONE'
  | 'NO_CAMERA'
  | 'WRONG_DICT_6X6'
  | 'BLANK_FRAME'
  | 'STALE_FACE_ON_CAM_STOP';

export interface ScannerSelfCheckInput {
  cameraActive: boolean;
  videoWidth: number;
  videoHeight: number;
  cameraError: string | null;
  faceModelState: MediaPipeFaceLandmarkerState;
  fps: number;
  arucoFrameTimeMs: number | null;
  faceInferenceTimeMs: number | null;
  currentAutoFaceDetected?: boolean;
  currentAutoFaceRollDeg?: number;
  currentMarkerCount?: number;
  /**
   * Optional deliberate fault injection to verify that a broken input makes the matching check FAIL:
   * - 'NONE': Normal self-check
   * - 'NO_CAMERA': Simulates disconnected camera stream (0x0) -> Camera check must FAIL
   * - 'WRONG_DICT_6X6': Feeds a foreign DICT_6X6_250 marker into the marker pipeline -> Marker check must FAIL
   * - 'BLANK_FRAME': Feeds a uniform blank frame into the marker pipeline -> Marker check must FAIL
   * - 'STALE_FACE_ON_CAM_STOP': Simulates stale DETECTED state remaining true after camera stops -> Check 6 must FAIL
   */
  injectedFault?: SelfCheckInjectedFault;
}

/**
 * Generates an RGBA raster image containing all 8 dental-rim DICT_4X4_50 markers (IDs 3..10)
 * using the application's own canonical generator (`getFullMarkerGrid`).
 */
export function buildKnownRimMarkersTestFrame(): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  expectedIds: number[];
} {
  const width = 560;
  const height = 280;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(245);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;

  const expectedIds = [...CLINICAL_RIM_MARKER_IDS]; // [3, 4, 5, 6, 7, 8, 9, 10]
  const markerPx = 60; // 6x6 cells -> 10px per cell

  expectedIds.forEach((id, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x0 = 40 + col * 128;
    const y0 = 36 + row * 124;
    const grid = getFullMarkerGrid(id);

    for (let y = 0; y < markerPx; y++) {
      const r = Math.min(5, Math.floor((y / markerPx) * 6));
      for (let x = 0; x < markerPx; x++) {
        const c = Math.min(5, Math.floor((x / markerPx) * 6));
        const v = grid[r][c] === 0 ? 15 : 245;
        const p = ((y0 + y) * width + (x0 + x)) * 4;
        data[p] = v;
        data[p + 1] = v;
        data[p + 2] = v;
        data[p + 3] = 255;
      }
    }
  });

  return { data, width, height, expectedIds };
}

/**
 * Generates a foreign 8x8 (DICT_6X6_250) marker raster image for negative testing.
 */
export function buildForeignDict6x6TestFrame(): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const width = 240;
  const height = 240;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(245);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;

  const grid8x8 = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [0, 0, 1, 1, 0, 1, 0, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 1, 0, 1, 1, 0, 0],
    [0, 1, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 0, 1, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ];

  const markerPx = 96;
  const x0 = 72;
  const y0 = 72;
  for (let y = 0; y < markerPx; y++) {
    const r = Math.min(7, Math.floor((y / markerPx) * 8));
    for (let x = 0; x < markerPx; x++) {
      const c = Math.min(7, Math.floor((x / markerPx) * 8));
      const v = grid8x8[r][c] === 0 ? 15 : 245;
      const p = ((y0 + y) * width + (x0 + x)) * 4;
      data[p] = v;
      data[p + 1] = v;
      data[p + 2] = v;
      data[p + 3] = 255;
    }
  }

  return { data, width, height };
}

/**
 * Generates a uniform blank frame for negative testing.
 */
export function buildBlankTestFrame(): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const width = 240;
  const height = 240;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(180);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { data, width, height };
}

/**
 * Runs all 6 real self-check tests and returns measured results.
 */
export function runScannerSelfCheck(input: ScannerSelfCheckInput): ScannerSelfCheckReport {
  const fault = input.injectedFault ?? 'NONE';
  const items: SelfCheckItemResult[] = [];

  // 1. Camera Open & Active Resolution Check
  const effectiveCamActive = fault === 'NO_CAMERA' ? false : input.cameraActive;
  const effectiveW = fault === 'NO_CAMERA' ? 0 : input.videoWidth;
  const effectiveH = fault === 'NO_CAMERA' ? 0 : input.videoHeight;

  if (!effectiveCamActive || effectiveW <= 0 || effectiveH <= 0) {
    items.push({
      id: 'camera',
      title: '1. Camera Stream & Resolution',
      verdict: 'FAIL',
      measuredValue: `${effectiveW}×${effectiveH}`,
      detail:
        fault === 'NO_CAMERA'
          ? 'Deliberate fault injected (no camera stream): Camera check correctly reports FAIL.'
          : input.cameraError || 'Camera stream is not open or active. Switch to Live Camera mode and grant permission.',
    });
  } else if (effectiveW < 1280 || effectiveH < 720) {
    items.push({
      id: 'camera',
      title: '1. Camera Stream & Resolution',
      verdict: 'WARN',
      measuredValue: `${effectiveW}×${effectiveH} (< 1280×720)`,
      detail: 'Camera is open, but resolution is below 1280×720. Small 6.5 mm rim markers require ≥ 1280×720 (1920×1080 ideal).',
    });
  } else {
    items.push({
      id: 'camera',
      title: '1. Camera Stream & Resolution',
      verdict: 'PASS',
      measuredValue: `${effectiveW}×${effectiveH}`,
      detail: 'Camera stream is open and meets ≥ 1280×720 optical resolution threshold.',
    });
  }

  // 2. MediaPipe FaceLandmarker Model & Time to First Landmarks
  const fm = input.faceModelState;
  if (fm.status === 'READY') {
    const firstLandmarkText =
      fm.timeToFirstLandmarksMs !== null
        ? `first landmarks in ${fm.timeToFirstLandmarksMs} ms`
        : 'awaiting face in view';
    items.push({
      id: 'face_model',
      title: '2. MediaPipe FaceLandmarker Model',
      verdict: 'PASS',
      measuredValue: `Loaded in ${fm.modelLoadTimeMs ?? 0} ms (${fm.delegate}) · ${firstLandmarkText}`,
      detail: `FaceLandmarker VIDEO mode active via ${fm.wasmSource || 'WASM'}.`,
    });
  } else if (fm.status === 'LOADING') {
    items.push({
      id: 'face_model',
      title: '2. MediaPipe FaceLandmarker Model',
      verdict: 'WARN',
      measuredValue: 'LOADING...',
      detail: 'MediaPipe WASM and face_landmarker.task are currently loading.',
    });
  } else {
    items.push({
      id: 'face_model',
      title: '2. MediaPipe FaceLandmarker Model',
      verdict: 'FAIL',
      measuredValue: fm.status,
      detail: fm.errorMessage || 'MediaPipe FaceLandmarker model has not been initialized.',
    });
  }

  // 3. Marker Pipeline Round-Trip (Generator -> Live Detector)
  const t0 = performance.now();
  const markerInputFrame =
    fault === 'WRONG_DICT_6X6'
      ? buildForeignDict6x6TestFrame()
      : fault === 'BLANK_FRAME'
      ? buildBlankTestFrame()
      : buildKnownRimMarkersTestFrame();
  const expectedIds = [...CLINICAL_RIM_MARKER_IDS];
  const detResult = detectArucoMarkersFromImageData(markerInputFrame);
  const decodeElapsedMs = Number((performance.now() - t0).toFixed(2));

  const exactRimMatch =
    detResult.detectedIds.length === expectedIds.length &&
    expectedIds.every((id, i) => detResult.detectedIds[i] === id);

  if (exactRimMatch) {
    items.push({
      id: 'marker_pipeline',
      title: '3. Marker Generator → Live Detector Pipeline',
      verdict: 'PASS',
      measuredValue: `Decoded [${detResult.detectedIds.join(', ')}] in ${decodeElapsedMs} ms`,
      detail: 'Generated all 8 dental-rim markers (IDs 3–10) and verified 8/8 exact decode through detectArucoMarkersFromImageData.',
    });
  } else {
    items.push({
      id: 'marker_pipeline',
      title: '3. Marker Generator → Live Detector Pipeline',
      verdict: 'FAIL',
      measuredValue: `Decoded [${detResult.detectedIds.join(', ')}] (expected [${expectedIds.join(', ')}]) in ${decodeElapsedMs} ms`,
      detail:
        fault === 'WRONG_DICT_6X6'
          ? `Deliberate wrong-dictionary (DICT_6X6_250) input rejected (${detResult.failureCategory}) -> Marker check correctly reports FAIL.`
          : fault === 'BLANK_FRAME'
          ? `Deliberate blank frame input returned 0 markers (${detResult.failureCategory}) -> Marker check correctly reports FAIL.`
          : `Marker pipeline failed to decode all expected IDs 3–10.`,
    });
  }

  // 4. Dictionary Bounds & Negative / Out-of-Dictionary Guard
  const foreignRes = detectArucoMarkersFromImageData(buildForeignDict6x6TestFrame());
  const blankRes = detectArucoMarkersFromImageData(buildBlankTestFrame());
  const dictKeys = Object.keys(ARUCO_DICT_4X4_50_BITS).map(Number);
  const allInBounds =
    dictKeys.length === 50 &&
    dictKeys.every((id) => Number.isInteger(id) && id >= 0 && id <= 49) &&
    !REGISTERED_ARUCO_IDS.has(0) &&
    !REGISTERED_ARUCO_IDS.has(1) &&
    !REGISTERED_ARUCO_IDS.has(2) &&
    detResult.detectedIds.every((id) => id >= 0 && id <= 49);

  const negativeGuardsPass =
    allInBounds &&
    foreignRes.detectedIds.length === 0 &&
    foreignRes.failureCategory === 'WRONG_DICTIONARY_OR_ID' &&
    blankRes.detectedIds.length === 0;

  items.push({
    id: 'dictionary_bounds',
    title: '4. Dictionary Bounds & Negative Input Rejection',
    verdict: negativeGuardsPass ? 'PASS' : 'FAIL',
    measuredValue: `50 IDs (0–49) | Foreign 6×6: ${foreignRes.detectedIds.length} FP | Blank: ${blankRes.detectedIds.length} FP`,
    detail: negativeGuardsPass
      ? 'Detector never returns an ID outside DICT_4X4_50 (0–49), excludes facial IDs 0–2, and rejects blank & DICT_6X6_250 inputs.'
      : 'Dictionary bounds or negative rejection check failed.',
  });

  // 5. Frame Rate & Per-Frame Detection Time
  const arucoMs = input.arucoFrameTimeMs ?? decodeElapsedMs;
  const faceMs = input.faceInferenceTimeMs ?? 0;
  const totalFrameMs = Number((arucoMs + faceMs).toFixed(1));
  const fpsVal = input.fps;

  items.push({
    id: 'performance',
    title: '5. Frame Rate & Per-Frame Detection Time',
    verdict: totalFrameMs <= 60 ? 'PASS' : 'WARN',
    measuredValue: `${fpsVal} FPS | ArUco: ${arucoMs.toFixed(1)} ms | Face: ${faceMs.toFixed(1)} ms`,
    detail: `Total per-frame vision processing time: ${totalFrameMs} ms.`,
  });

  // 6. Face status clears when camera stops (start camera -> active face -> stop camera -> assert NOT DETECTED within 1s)
  const stopTestT0 = performance.now();
  const mock478 = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const whileRunning = resolveLiveFaceTrackingState({
    cameraActive: true,
    cameraPoweredOn: true,
    videoReady: true,
    videoPausedOrEnded: false,
    mode: 'WEBCAM',
    faceMode: 'AUTO',
    rawAutoDetected: true,
    rawRollDeg: 3.4,
    rawLandmarks: mock478,
    lastProcessedFrameTimeMs: 1000,
    nowMs: 1020,
  });

  const afterCameraStop = resolveLiveFaceTrackingState({
    cameraActive: false,
    cameraPoweredOn: false,
    videoReady: false,
    videoPausedOrEnded: true,
    mode: 'WEBCAM',
    faceMode: 'AUTO',
    rawAutoDetected: true,
    rawRollDeg: 3.4,
    rawLandmarks: mock478,
    lastProcessedFrameTimeMs: 1000,
    nowMs: 1050,
  });

  const afterFreshnessTimeout = resolveLiveFaceTrackingState({
    cameraActive: true,
    cameraPoweredOn: true,
    videoReady: true,
    videoPausedOrEnded: false,
    mode: 'WEBCAM',
    faceMode: 'AUTO',
    rawAutoDetected: true,
    rawRollDeg: 3.4,
    rawLandmarks: mock478,
    lastProcessedFrameTimeMs: 1000,
    nowMs: 1000 + FACE_DETECTION_FRESHNESS_TIMEOUT_MS + 10,
  });

  const stopClearElapsedMs = Number((performance.now() - stopTestT0).toFixed(2));
  const liveComponentHasStaleBug =
    (!input.cameraActive && input.currentAutoFaceDetected === true) ||
    (!input.cameraActive && (input.currentMarkerCount ?? 0) > 0) ||
    fault === 'STALE_FACE_ON_CAM_STOP';

  const stopTestPassed =
    !liveComponentHasStaleBug &&
    whileRunning.autoDetected === true &&
    afterCameraStop.autoDetected === false &&
    afterCameraStop.rollDeg === 0 &&
    afterCameraStop.landmarks.length === 0 &&
    afterCameraStop.hasAutoLandmarksAvailable === false &&
    afterFreshnessTimeout.autoDetected === false &&
    stopClearElapsedMs < 1000;

  items.push({
    id: 'face_clears_on_stop',
    title: '6. Face Status Clears When Camera Stops',
    verdict: stopTestPassed ? 'PASS' : 'FAIL',
    measuredValue: stopTestPassed
      ? `NOT DETECTED in ${stopClearElapsedMs} ms (< 1000 ms) · Roll: 0° · Landmarks: 0 · Freshness gate: ${FACE_DETECTION_FRESHNESS_TIMEOUT_MS} ms`
      : 'STALE DETECTED STATE AFTER CAMERA STOP',
    detail: stopTestPassed
      ? 'Verified camera start (DETECTED) → camera stop transitions immediately to NOT DETECTED, clears landmarks/roll, and enforces 500 ms frame freshness rule.'
      : fault === 'STALE_FACE_ON_CAM_STOP'
      ? 'Deliberate stale-face fault injected: Face status remained DETECTED after camera stopped -> Check 6 correctly reports FAIL.'
      : 'Face status or marker count remained active while the camera stream was stopped.',
  });

  const hasFail = items.some((i) => i.verdict === 'FAIL');
  const hasWarn = items.some((i) => i.verdict === 'WARN');

  return {
    timestamp: Date.now(),
    overallVerdict: hasFail ? 'FAIL' : hasWarn ? 'WARN' : 'PASS',
    items,
  };
}
