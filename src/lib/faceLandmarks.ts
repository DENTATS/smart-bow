/**
 * SmartBow AI — MediaPipe Automatic Face Landmarker & Manual Landmark Placement Engine
 *
 * Implements:
 * 1. Real MediaPipe FaceLandmarker (@mediapipe/tasks-vision) in VIDEO mode:
 *    - numFaces: 1, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: true
 *    - Pinned WASM runtime & official face_landmarker.task model
 *    - GPU delegate with automatic CPU fallback and truthful error reporting
 * 2. Canonical MediaPipe Face Mesh indices:
 *    - Right iris centre: 468, Left iris centre: 473
 *    - Nose tip: 1, Subnasale area: 2, Nasion area: 168, Glabella area: 9
 *    - Chin (Menton): 152, Mouth corners: 61 (R) and 291 (L)
 *    - Face edges (tragus/zygoma): 234 (right) and 454 (left)
 *    - Nasal alae: 98 (right ala) and 327 (left ala)
 * 3. Manual Landmark Placement (9 ordered anatomical points in 0–1 image-normalised coordinates):
 *    - Right pupil, Left pupil, Glabella, Subnasale, Menton (chin),
 *      Right tragus, Left tragus, Right ala of nose, Left ala of nose
 *    - Derived interpupillary line and ala–tragus (Camper's) lines labelled "derived from manual points".
 */

import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { ViewportCoverTransform, mapVideoPointToCanvas } from './arucoDetector';

// Pinned MediaPipe CDN & model paths
export const MEDIAPIPE_TASKS_VISION_VERSION = '1.2.3';
export const MEDIAPIPE_WASM_CDN_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`;
export const MEDIAPIPE_WASM_LOCAL_URL = '/mediapipe/wasm';
export const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Canonical MediaPipe 478-point Face Mesh indices
export const CANONICAL_FACE_LANDMARK_INDICES = {
  rightIrisCentre: 468,
  leftIrisCentre: 473,
  noseTip: 1,
  subnasale: 2,
  nasion: 168,
  glabella: 9,
  cranialGlabella: 10,
  chin: 152,
  mouthRight: 61,
  mouthLeft: 291,
  faceEdgeRight: 234,
  faceEdgeLeft: 454,
  rightEyeOuter: 33,
  rightEyeInner: 133,
  leftEyeOuter: 263,
  leftEyeInner: 362,
  rightAla: 98,
  leftAla: 327,
} as const;

export type ManualLandmarkKey =
  | 'rightPupil'
  | 'leftPupil'
  | 'glabella'
  | 'subnasale'
  | 'menton'
  | 'rightTragus'
  | 'leftTragus'
  | 'rightAla'
  | 'leftAla';

export interface ManualLandmarkDefinition {
  key: ManualLandmarkKey;
  order: number;
  label: string;
  shortLabel: string;
  instruction: string;
  autoMeshIndex: number;
  color: string;
}

export const MANUAL_LANDMARK_DEFINITIONS: readonly ManualLandmarkDefinition[] = [
  {
    key: 'rightPupil',
    order: 1,
    label: 'Right pupil',
    shortLabel: 'R-Pupil',
    instruction: "Tap the centre of the patient's right pupil (image-left eye).",
    autoMeshIndex: CANONICAL_FACE_LANDMARK_INDICES.rightIrisCentre,
    color: '#22d3ee',
  },
  {
    key: 'leftPupil',
    order: 2,
    label: 'Left pupil',
    shortLabel: 'L-Pupil',
    instruction: "Tap the centre of the patient's left pupil (image-right eye).",
    autoMeshIndex: CANONICAL_FACE_LANDMARK_INDICES.leftIrisCentre,
    color: '#22d3ee',
  },
  {
    key: 'glabella',
    order: 3,
    label: 'Glabella',
    shortLabel: 'Glabella',
    instruction: 'Tap the Glabella (midpoint between the eyebrows).',
    autoMeshIndex: CANONICAL_FACE_LANDMARK_INDICES.glabella,
    color: '#38bdf8',
  },
  {
    key: 'subnasale',
    order: 4,
    label: 'Subnasale',
    shortLabel: 'Subnasale',
    instruction: 'Tap the Subnasale (junction of nasal septum and upper lip).',
    autoMeshIndex: CANONICAL_FACE_LANDMARK_INDICES.subnasale,
    color: '#f59e0b',
  },
  {
    key: 'menton',
    order: 5,
    label: 'Menton (chin)',
    shortLabel: 'Menton',
    instruction: 'Tap the Menton (lowest midline point of the chin).',
    autoMeshIndex: CANONICAL_FACE_LANDMARK_INDICES.chin,
    color: '#f59e0b',
  },
  {
    key: 'rightTragus',
    order: 6,
    label: 'Right tragus',
    shortLabel: 'R-Tragus',
    instruction: "Tap the patient's right tragus / pre-auricular reference.",
    autoMeshIndex: CANONICAL_FACE_LANDMARK_INDICES.faceEdgeRight,
    color: '#a855f7',
  },
  {
    key: 'leftTragus',
    order: 7,
    label: 'Left tragus',
    shortLabel: 'L-Tragus',
    instruction: "Tap the patient's left tragus / pre-auricular reference.",
    autoMeshIndex: CANONICAL_FACE_LANDMARK_INDICES.faceEdgeLeft,
    color: '#a855f7',
  },
  {
    key: 'rightAla',
    order: 8,
    label: 'Right ala of nose',
    shortLabel: 'R-Ala',
    instruction: "Tap the outer lower border of the patient's right nasal ala.",
    autoMeshIndex: CANONICAL_FACE_LANDMARK_INDICES.rightAla,
    color: '#10b981',
  },
  {
    key: 'leftAla',
    order: 9,
    label: 'Left ala of nose',
    shortLabel: 'L-Ala',
    instruction: "Tap the outer lower border of the patient's left nasal ala.",
    autoMeshIndex: CANONICAL_FACE_LANDMARK_INDICES.leftAla,
    color: '#10b981',
  },
] as const;

export interface NormalizedPoint2D {
  x: number; // 0..1 in displayed viewport / frozen frame coordinates
  y: number; // 0..1 in displayed viewport / frozen frame coordinates
}

export type ManualLandmarkSet = Partial<Record<ManualLandmarkKey, NormalizedPoint2D>>;

export interface ManualDerivedGeometry {
  provenanceLabel: 'derived from manual points';
  interpupillaryRollDeg: number | null;
  rightAlaTragusDeg: number | null;
  leftAlaTragusDeg: number | null;
  lowerFacialThirdRatioPct: number | null;
  interpupillaryDistanceNorm: number | null;
  subnasaleToMentonNorm: number | null;
}

export type FaceModelLoadStatus = 'IDLE' | 'LOADING' | 'READY' | 'FAILED';

export interface MediaPipeFaceLandmarkerState {
  status: FaceModelLoadStatus;
  delegate: 'GPU' | 'CPU' | null;
  wasmSource: string | null;
  modelLoadTimeMs: number | null;
  timeToFirstLandmarksMs: number | null;
  errorMessage: string | null;
}

export interface AutoFaceDetectionOutput {
  detected: boolean;
  landmarks: Array<{ x: number; y: number; z: number }>;
  facialTransformationMatrix: number[] | null;
  inferenceTimeMs: number;
  rollDeg: number;
  faceBox: { x: number; y: number; width: number; height: number } | null;
}

/**
 * Resolves a canonical MediaPipe landmark index from a 468/478 landmark array.
 * If iris landmarks (468, 473) are requested on a 468-point mesh, falls back to the
 * exact midpoint of the inner and outer eye corners (33/133 or 263/362).
 */
export function getCanonicalLandmark(
  landmarks: Array<{ x: number; y: number; z?: number }>,
  index: number
): { x: number; y: number; z: number } | null {
  if (!landmarks || landmarks.length === 0) return null;
  if (index < landmarks.length && landmarks[index]) {
    const pt = landmarks[index];
    return { x: pt.x, y: pt.y, z: pt.z ?? 0 };
  }
  if (index === CANONICAL_FACE_LANDMARK_INDICES.rightIrisCentre && landmarks[33] && landmarks[133]) {
    return {
      x: (landmarks[33].x + landmarks[133].x) * 0.5,
      y: (landmarks[33].y + landmarks[133].y) * 0.5,
      z: ((landmarks[33].z ?? 0) + (landmarks[133].z ?? 0)) * 0.5,
    };
  }
  if (index === CANONICAL_FACE_LANDMARK_INDICES.leftIrisCentre && landmarks[263] && landmarks[362]) {
    return {
      x: (landmarks[263].x + landmarks[362].x) * 0.5,
      y: (landmarks[263].y + landmarks[362].y) * 0.5,
      z: ((landmarks[263].z ?? 0) + (landmarks[362].z ?? 0)) * 0.5,
    };
  }
  return null;
}

/**
 * Copies detected MediaPipe landmarks into a normalized ManualLandmarkSet (0..1 canvas space)
 * so the user can start from the automatic points and refine them manually.
 */
export function copyAutoLandmarksToManual(
  landmarks: Array<{ x: number; y: number; z?: number }>,
  videoWidth: number,
  videoHeight: number,
  coverTransform: ViewportCoverTransform | null,
  canvasWidth: number,
  canvasHeight: number
): ManualLandmarkSet {
  const result: ManualLandmarkSet = {};
  if (!landmarks || landmarks.length < 468) return result;

  for (const def of MANUAL_LANDMARK_DEFINITIONS) {
    const pt = getCanonicalLandmark(landmarks, def.autoMeshIndex);
    if (!pt) continue;

    if (coverTransform && videoWidth > 0 && videoHeight > 0 && canvasWidth > 0 && canvasHeight > 0) {
      const mapped = mapVideoPointToCanvas(
        { x: pt.x * videoWidth, y: pt.y * videoHeight },
        coverTransform
      );
      result[def.key] = {
        x: Math.max(0.01, Math.min(0.99, mapped.x / canvasWidth)),
        y: Math.max(0.01, Math.min(0.99, mapped.y / canvasHeight)),
      };
    } else {
      result[def.key] = {
        x: Math.max(0.01, Math.min(0.99, pt.x)),
        y: Math.max(0.01, Math.min(0.99, pt.y)),
      };
    }
  }

  return result;
}

/**
 * Computes derived prosthodontic reference lines and angles from manually placed points.
 * Every derived metric is explicitly tagged as "derived from manual points".
 */
export function computeManualDerivedGeometry(
  points: ManualLandmarkSet,
  aspectRatio: number = 16 / 9
): ManualDerivedGeometry {
  let interpupillaryRollDeg: number | null = null;
  let interpupillaryDistanceNorm: number | null = null;
  let rightAlaTragusDeg: number | null = null;
  let leftAlaTragusDeg: number | null = null;
  let lowerFacialThirdRatioPct: number | null = null;
  let subnasaleToMentonNorm: number | null = null;

  const rPupil = points.rightPupil;
  const lPupil = points.leftPupil;
  if (rPupil && lPupil) {
    const dx = (lPupil.x - rPupil.x) * aspectRatio;
    const dy = lPupil.y - rPupil.y;
    interpupillaryDistanceNorm = Number(Math.hypot(dx, dy).toFixed(4));
    if (Math.abs(dx) > 1e-4) {
      interpupillaryRollDeg = Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1));
    }
  }

  if (points.rightAla && points.rightTragus) {
    const dx = (points.rightAla.x - points.rightTragus.x) * aspectRatio;
    const dy = points.rightAla.y - points.rightTragus.y;
    if (Math.hypot(dx, dy) > 1e-4) {
      rightAlaTragusDeg = Number(((Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI).toFixed(1));
    }
  }

  if (points.leftAla && points.leftTragus) {
    const dx = (points.leftAla.x - points.leftTragus.x) * aspectRatio;
    const dy = points.leftAla.y - points.leftTragus.y;
    if (Math.hypot(dx, dy) > 1e-4) {
      leftAlaTragusDeg = Number(((Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI).toFixed(1));
    }
  }

  if (points.subnasale && points.menton) {
    const dx = (points.menton.x - points.subnasale.x) * aspectRatio;
    const dy = points.menton.y - points.subnasale.y;
    subnasaleToMentonNorm = Number(Math.hypot(dx, dy).toFixed(4));

    if (points.glabella) {
      const totalDx = (points.menton.x - points.glabella.x) * aspectRatio;
      const totalDy = points.menton.y - points.glabella.y;
      const totalDist = Math.hypot(totalDx, totalDy);
      if (totalDist > 1e-4) {
        lowerFacialThirdRatioPct = Number(((subnasaleToMentonNorm / totalDist) * 100).toFixed(1));
      }
    }
  }

  return {
    provenanceLabel: 'derived from manual points',
    interpupillaryRollDeg,
    rightAlaTragusDeg,
    leftAlaTragusDeg,
    lowerFacialThirdRatioPct,
    interpupillaryDistanceNorm,
    subnasaleToMentonNorm,
  };
}

/**
 * MediaPipe FaceLandmarker wrapper in VIDEO mode with GPU -> CPU fallback.
 */
export class MediaPipeFaceLandmarkController {
  private landmarker: FaceLandmarker | null = null;
  private state: MediaPipeFaceLandmarkerState = {
    status: 'IDLE',
    delegate: null,
    wasmSource: null,
    modelLoadTimeMs: null,
    timeToFirstLandmarksMs: null,
    errorMessage: null,
  };
  private initPromise: Promise<MediaPipeFaceLandmarkerState> | null = null;
  private initStartTimestamp: number = 0;
  private lastVideoTimestampMs: number = -1;
  private listeners: Set<(state: MediaPipeFaceLandmarkerState) => void> = new Set();

  public getState(): MediaPipeFaceLandmarkerState {
    return { ...this.state };
  }

  public subscribe(listener: (state: MediaPipeFaceLandmarkerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const l of this.listeners) {
      l(snapshot);
    }
  }

  public async initialize(): Promise<MediaPipeFaceLandmarkerState> {
    if (this.state.status === 'READY' && this.landmarker) {
      return this.getState();
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initStartTimestamp = performance.now();
    this.state = {
      status: 'LOADING',
      delegate: null,
      wasmSource: null,
      modelLoadTimeMs: null,
      timeToFirstLandmarksMs: null,
      errorMessage: null,
    };
    this.notify();

    this.initPromise = (async () => {
      try {
        let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null;
        let usedWasmSource = MEDIAPIPE_WASM_LOCAL_URL;

        // Try local bundled WASM first for instant load, then fallback to pinned jsDelivr CDN
        const wasmCandidates = [MEDIAPIPE_WASM_LOCAL_URL, MEDIAPIPE_WASM_CDN_URL];
        let wasmErr: any = null;
        for (const candidateUrl of wasmCandidates) {
          try {
            vision = await FilesetResolver.forVisionTasks(candidateUrl);
            usedWasmSource = candidateUrl;
            break;
          } catch (err) {
            wasmErr = err;
          }
        }

        if (!vision) {
          throw wasmErr || new Error('Failed to load MediaPipe vision WASM fileset');
        }

        // Try GPU delegate first, then fall back to CPU delegate
        let activeDelegate: 'GPU' | 'CPU' = 'GPU';
        try {
          this.landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: FACE_LANDMARKER_MODEL_URL,
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true,
          });
          activeDelegate = 'GPU';
        } catch (gpuError) {
          console.warn('MediaPipe GPU delegate failed, falling back to CPU:', gpuError);
          this.landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: FACE_LANDMARKER_MODEL_URL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true,
          });
          activeDelegate = 'CPU';
        }

        const loadTime = Number((performance.now() - this.initStartTimestamp).toFixed(1));
        this.state = {
          status: 'READY',
          delegate: activeDelegate,
          wasmSource: usedWasmSource,
          modelLoadTimeMs: loadTime,
          timeToFirstLandmarksMs: this.state.timeToFirstLandmarksMs,
          errorMessage: null,
        };
        this.notify();
        return this.getState();
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err || 'Unknown MediaPipe initialization error');
        this.state = {
          status: 'FAILED',
          delegate: null,
          wasmSource: null,
          modelLoadTimeMs: null,
          timeToFirstLandmarksMs: null,
          errorMessage: msg,
        };
        this.initPromise = null;
        this.notify();
        return this.getState();
      }
    })();

    return this.initPromise;
  }

  /**
   * Runs MediaPipe FaceLandmarker.detectForVideo on the current HTMLVideoElement frame.
   * Never returns invented or fallback coordinates.
   */
  public detectVideoFrame(video: HTMLVideoElement | null, nowMs: number = performance.now()): AutoFaceDetectionOutput {
    const t0 = performance.now();
    if (
      !this.landmarker ||
      this.state.status !== 'READY' ||
      !video ||
      video.readyState < 2 ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      return {
        detected: false,
        landmarks: [],
        facialTransformationMatrix: null,
        inferenceTimeMs: 0,
        rollDeg: 0,
        faceBox: null,
      };
    }

    // MediaPipe VIDEO mode requires strictly monotonically increasing timestamps
    const timestampMs = Math.max(nowMs, this.lastVideoTimestampMs + 1);
    this.lastVideoTimestampMs = timestampMs;

    try {
      const res = this.landmarker.detectForVideo(video, timestampMs);
      const inferenceTimeMs = Number((performance.now() - t0).toFixed(2));
      const rawFace = res?.faceLandmarks?.[0];

      if (!rawFace || rawFace.length < 468) {
        return {
          detected: false,
          landmarks: [],
          facialTransformationMatrix: null,
          inferenceTimeMs,
          rollDeg: 0,
          faceBox: null,
        };
      }

      if (this.state.timeToFirstLandmarksMs === null) {
        this.state = {
          ...this.state,
          timeToFirstLandmarksMs: Number((performance.now() - this.initStartTimestamp).toFixed(1)),
        };
        this.notify();
      }

      const landmarks = rawFace.map((pt) => ({
        x: pt.x,
        y: pt.y,
        z: pt.z ?? 0,
      }));

      // Compute bounding box from real landmarks
      let minX = 1;
      let minY = 1;
      let maxX = 0;
      let maxY = 0;
      for (const pt of landmarks) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }

      // Compute interpupillary roll from canonical iris centres (468, 473)
      const rIris = getCanonicalLandmark(landmarks, CANONICAL_FACE_LANDMARK_INDICES.rightIrisCentre);
      const lIris = getCanonicalLandmark(landmarks, CANONICAL_FACE_LANDMARK_INDICES.leftIrisCentre);
      let rollDeg = 0;
      if (rIris && lIris) {
        const dx = (lIris.x - rIris.x) * video.videoWidth;
        const dy = (lIris.y - rIris.y) * video.videoHeight;
        rollDeg = Number(((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1));
      }

      const matrixData = res.facialTransformationMatrixes?.[0]?.data
        ? Array.from(res.facialTransformationMatrixes[0].data)
        : null;

      return {
        detected: true,
        landmarks,
        facialTransformationMatrix: matrixData,
        inferenceTimeMs,
        rollDeg,
        faceBox: {
          x: Math.max(0, minX),
          y: Math.max(0, minY),
          width: Math.min(1, maxX - minX),
          height: Math.min(1, maxY - minY),
        },
      };
    } catch (err) {
      return {
        detected: false,
        landmarks: [],
        facialTransformationMatrix: null,
        inferenceTimeMs: Number((performance.now() - t0).toFixed(2)),
        rollDeg: 0,
        faceBox: null,
      };
    }
  }
}

/**
 * Draws the canonical MediaPipe landmarks onto the viewport canvas,
 * mirrored consistently with the video stream via `coverTransform`.
 */
export function drawAutoFaceLandmarksOnCanvas(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z?: number }>,
  videoWidth: number,
  videoHeight: number,
  coverTransform: ViewportCoverTransform
): void {
  if (!landmarks || landmarks.length < 468) return;

  const toCanvas = (idx: number): { x: number; y: number } | null => {
    const pt = getCanonicalLandmark(landmarks, idx);
    if (!pt) return null;
    return mapVideoPointToCanvas({ x: pt.x * videoWidth, y: pt.y * videoHeight }, coverTransform);
  };

  const rIris = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.rightIrisCentre);
  const lIris = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.leftIrisCentre);
  const glabella = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.glabella);
  const nasion = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.nasion);
  const noseTip = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.noseTip);
  const subnasale = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.subnasale);
  const chin = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.chin);
  const mouthR = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.mouthRight);
  const mouthL = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.mouthLeft);
  const edgeR = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.faceEdgeRight);
  const edgeL = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.faceEdgeLeft);
  const alaR = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.rightAla);
  const alaL = toCanvas(CANONICAL_FACE_LANDMARK_INDICES.leftAla);

  ctx.save();

  // 1. Interpupillary reference line (468 <-> 473)
  if (rIris && lIris) {
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rIris.x, rIris.y);
    ctx.lineTo(lIris.x, lIris.y);
    ctx.stroke();
  }

  // 2. Sagittal midline (Glabella #9 -> Nasion #168 -> Subnasale #2 -> Chin #152)
  if (glabella && chin) {
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(glabella.x, glabella.y);
    if (nasion) ctx.lineTo(nasion.x, nasion.y);
    if (subnasale) ctx.lineTo(subnasale.x, subnasale.y);
    ctx.lineTo(chin.x, chin.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 3. Ala-Tragus (Camper's) reference lines (98 <-> 234 and 327 <-> 454)
  if (alaR && edgeR) {
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(alaR.x, alaR.y);
    ctx.lineTo(edgeR.x, edgeR.y);
    ctx.stroke();
  }
  if (alaL && edgeL) {
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(alaL.x, alaL.y);
    ctx.lineTo(edgeL.x, edgeL.y);
    ctx.stroke();
  }

  // 4. Key Canonical Points with indices
  const keyPoints: Array<{ pt: { x: number; y: number } | null; label: string; color: string }> = [
    { pt: rIris, label: 'R-Iris #468', color: '#22d3ee' },
    { pt: lIris, label: 'L-Iris #473', color: '#22d3ee' },
    { pt: glabella, label: 'Glabella #9', color: '#38bdf8' },
    { pt: nasion, label: 'Nasion #168', color: '#38bdf8' },
    { pt: noseTip, label: 'Nose #1', color: '#10b981' },
    { pt: subnasale, label: 'Sn #2', color: '#f59e0b' },
    { pt: chin, label: 'Chin #152', color: '#f59e0b' },
    { pt: mouthR, label: 'Mouth-R #61', color: '#f472b6' },
    { pt: mouthL, label: 'Mouth-L #291', color: '#f472b6' },
    { pt: edgeR, label: 'R-Edge #234', color: '#a855f7' },
    { pt: edgeL, label: 'L-Edge #454', color: '#a855f7' },
  ];

  ctx.font = 'bold 10px monospace';
  for (const item of keyPoints) {
    if (!item.pt) continue;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(item.pt.x, item.pt.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(item.label, item.pt.x + 6, item.pt.y + 3);
  }

  ctx.restore();
}

/**
 * Draws manually placed landmarks, derived interpupillary & ala-tragus lines,
 * and an interactive zoom loupe near the active pointer/cursor.
 */
export function drawManualFaceLandmarksOnCanvas(
  ctx: CanvasRenderingContext2D,
  sourceCanvasOrImage: HTMLCanvasElement | HTMLVideoElement | null,
  points: ManualLandmarkSet,
  activeDragKey: ManualLandmarkKey | null,
  hoverNormPt: NormalizedPoint2D | null,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.save();

  const toPx = (pt: NormalizedPoint2D) => ({
    x: pt.x * canvasWidth,
    y: pt.y * canvasHeight,
  });

  const derived = computeManualDerivedGeometry(points, canvasWidth / Math.max(1, canvasHeight));

  // 1. Derived Interpupillary Line
  if (points.rightPupil && points.leftPupil) {
    const pR = toPx(points.rightPupil);
    const pL = toPx(points.leftPupil);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pR.x, pR.y);
    ctx.lineTo(pL.x, pL.y);
    ctx.stroke();

    const midX = (pR.x + pL.x) * 0.5;
    const midY = (pR.y + pL.y) * 0.5;
    const label = `Interpupillary: ${derived.interpupillaryRollDeg ?? 0}° (derived from manual points)`;
    ctx.font = 'bold 11px monospace';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(8, 51, 68, 0.9)';
    ctx.fillRect(midX - tw * 0.5 - 6, midY - 24, tw + 12, 18);
    ctx.fillStyle = '#cffafe';
    ctx.fillText(label, midX - tw * 0.5, midY - 11);
  }

  // 2. Derived Right Ala-Tragus Line
  if (points.rightAla && points.rightTragus) {
    const pAla = toPx(points.rightAla);
    const pTrag = toPx(points.rightTragus);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(pAla.x, pAla.y);
    ctx.lineTo(pTrag.x, pTrag.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const midX = (pAla.x + pTrag.x) * 0.5;
    const midY = (pAla.y + pTrag.y) * 0.5;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#e9d5ff';
    ctx.fillText(`R Ala–Tragus (${derived.rightAlaTragusDeg ?? 0}° · derived from manual points)`, midX - 60, midY - 6);
  }

  // 3. Derived Left Ala-Tragus Line
  if (points.leftAla && points.leftTragus) {
    const pAla = toPx(points.leftAla);
    const pTrag = toPx(points.leftTragus);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(pAla.x, pAla.y);
    ctx.lineTo(pTrag.x, pTrag.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const midX = (pAla.x + pTrag.x) * 0.5;
    const midY = (pAla.y + pTrag.y) * 0.5;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#e9d5ff';
    ctx.fillText(`L Ala–Tragus (${derived.leftAlaTragusDeg ?? 0}° · derived from manual points)`, midX - 60, midY - 6);
  }

  // 4. Derived Midline & Subnasale-Menton Bracket
  if (points.glabella && points.menton) {
    const pG = toPx(points.glabella);
    const pM = toPx(points.menton);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pG.x, pG.y);
    if (points.subnasale) {
      const pSn = toPx(points.subnasale);
      ctx.lineTo(pSn.x, pSn.y);
    }
    ctx.lineTo(pM.x, pM.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 5. Draw each placed manual landmark handle
  for (const def of MANUAL_LANDMARK_DEFINITIONS) {
    const ptNorm = points[def.key];
    if (!ptNorm) continue;
    const pt = toPx(ptNorm);
    const isActive = activeDragKey === def.key;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, isActive ? 9 : 6.5, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Crosshair center
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
    ctx.fill();

    const tag = `${def.order}. ${def.shortLabel}`;
    ctx.font = 'bold 11px monospace';
    const tw = ctx.measureText(tag).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(pt.x + 9, pt.y - 10, tw + 10, 18);
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(pt.x + 9, pt.y - 10, tw + 10, 18);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(tag, pt.x + 14, pt.y + 3);
  }

  // 6. Magnifier Loupe near cursor when hovering/dragging
  if (hoverNormPt && sourceCanvasOrImage) {
    const cx = hoverNormPt.x * canvasWidth;
    const cy = hoverNormPt.y * canvasHeight;
    const loupeRadius = 46;
    const zoom = 2.5;
    const loupeX = cx + 65 + loupeRadius < canvasWidth ? cx + 65 : cx - 65;
    const loupeY = cy - 65 - loupeRadius > 10 ? cy - 65 : cy + 65;

    ctx.save();
    ctx.beginPath();
    ctx.arc(loupeX, loupeY, loupeRadius, 0, Math.PI * 2);
    ctx.clip();

    const srcCropW = (loupeRadius * 2) / zoom;
    const srcCropH = (loupeRadius * 2) / zoom;
    try {
      ctx.drawImage(
        sourceCanvasOrImage,
        Math.max(0, cx - srcCropW * 0.5),
        Math.max(0, cy - srcCropH * 0.5),
        srcCropW,
        srcCropH,
        loupeX - loupeRadius,
        loupeY - loupeRadius,
        loupeRadius * 2,
        loupeRadius * 2
      );
    } catch {
      // Fallback if source image not ready
    }

    // Loupe crosshair
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(loupeX - 14, loupeY);
    ctx.lineTo(loupeX + 14, loupeY);
    ctx.moveTo(loupeX, loupeY - 14);
    ctx.lineTo(loupeX, loupeY + 14);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(loupeX, loupeY, loupeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.restore();
}
