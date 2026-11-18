/**
 * SmartBow AI — Live Camera & Computer Vision Scanner
 *
 * Core Scanner Responsibilities (Phase 1D Simplified):
 * 1. Camera View: 1920×1080 -> 1280×720 -> default fallback with continuous autofocus (AF-C)
 *    and truthful resolution display (warns if < 1280×720).
 * 2. Face Landmarks (AUTO + MANUAL):
 *    - AUTO: Real MediaPipe FaceLandmarker (@mediapipe/tasks-vision) in VIDEO mode (GPU -> CPU fallback),
 *      drawing canonical indices (#468, #473, #1, #2, #168, #9, #152, #61, #291, #234, #454).
 *      No skin-colour heuristic and no window.FaceDetector.
 *    - MANUAL: Freezes the current video frame, lets user tap/drag 9 ordered anatomical points
 *      in 0–1 normalized coordinates with a 2.5× zoom loupe, Undo, Reset, and
 *      "Use auto points as starting positions".
 * 3. Dental-Rim ArUco Markers (DICT_4X4_50):
 *    - Maxillary IDs 3, 4, 5, 6 (cyan #22d3ee) and Mandibular IDs 7, 8, 9, 10 (amber #f59e0b).
 *    - Independent of face tracking; draws every decoded marker immediately; shows Detected IDs,
 *      Count n/4, Missing per group, and factual failure summary when 0 markers are found.
 * 4. Self-Check: Runs real runtime tests (Camera, MediaPipe model, Generator->Detector round-trip,
 *    Dictionary bounds & negative checks, FPS/timing) with PASS/WARN/FAIL and measured values.
 * 5. Single Settings/Calibration entry + Help link + Advanced menu.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Check,
  Settings2,
  ShieldCheck,
  HelpCircle,
  Sliders,
  AlertCircle,
  Snowflake,
  Play,
  ArrowRight,
  Printer,
} from 'lucide-react';
import { DentitionState, CameraCalibrationSettings, MarkerPose } from '../types/smartbow';
import {
  detectArucoMarkersDetailed,
  ArucoFrameDiagnostics,
  computeCoverTransform,
  mapVideoCornersToCanvas,
  ViewportCoverTransform,
} from '../lib/arucoDetector';
import {
  evaluateOpticalDiagnostic,
  evaluateArucoPipelineDiagnostic,
  LiveArucoDiagnosticStatus,
  CLINICAL_RIM_EXPECTED_IDS,
} from '../lib/opticalDiagnostics';
import { OpticalDiagnosticInfo } from '../types/smartbow';
import {
  MediaPipeFaceLandmarkController,
  MediaPipeFaceLandmarkerState,
  MANUAL_LANDMARK_DEFINITIONS,
  ManualLandmarkKey,
  ManualLandmarkSet,
  NormalizedPoint2D,
  copyAutoLandmarksToManual,
  drawAutoFaceLandmarksOnCanvas,
  drawManualFaceLandmarksOnCanvas,
} from '../lib/faceLandmarks';
import { FaceLandmarkPanel } from './FaceLandmarkPanel';
import { ScannerSelfCheckModal } from './ScannerSelfCheckModal';

interface LiveScannerProps {
  dentitionState?: DentitionState;
  onUpdateDentition?: (state: DentitionState) => void;
  vdoMm: number | null;
  onUpdateVdo: (vdo: number) => void;
  tiltMLDeg: number | null;
  onUpdateTiltML: (tilt: number) => void;
  tiltAPDeg: number | null;
  onUpdateTiltAP: (tilt: number) => void;
  midlineShiftMm: number | null;
  onUpdateMidline: (shift: number) => void;
  onRecordCrTrial: () => void;
  onNavigateToTab: (tab: 'home' | 'scanner' | 'records' | 'settings') => void;
  calibrationSettings: CameraCalibrationSettings;
  onOpenCalibration: () => void;
  onOpenManual?: () => void;
  onOpenMarkers?: () => void;
  developerMode?: boolean;
}

export const LiveScanner: React.FC<LiveScannerProps> = ({
  vdoMm,
  onUpdateVdo,
  tiltMLDeg,
  onUpdateTiltML,
  onRecordCrTrial,
  onNavigateToTab,
  calibrationSettings,
  onOpenCalibration,
  onOpenManual,
  onOpenMarkers,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frozenFrameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mpControllerRef = useRef<MediaPipeFaceLandmarkController>(new MediaPipeFaceLandmarkController());

  // Mode: Defaults to live WEBCAM scanner; SIMULATION is available under Advanced menu
  const [mode, setMode] = useState<'WEBCAM' | 'SIMULATION'>('WEBCAM');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPoweredOn, setCameraPoweredOn] = useState<boolean>(true);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(30);

  // Face Tracking State (MediaPipe AUTO + 9-Point MANUAL)
  const [faceMode, setFaceMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [mpModelState, setMpModelState] = useState<MediaPipeFaceLandmarkerState>(() =>
    mpControllerRef.current.getState()
  );
  const [autoFaceDetected, setAutoFaceDetected] = useState<boolean>(false);
  const [autoFaceRollDeg, setAutoFaceRollDeg] = useState<number>(0);
  const [faceInferenceTimeMs, setFaceInferenceTimeMs] = useState<number>(0);
  const [autoFailedFor3Sec, setAutoFailedFor3Sec] = useState<boolean>(false);

  const autoLandmarksRef = useRef<Array<{ x: number; y: number; z: number }>>([]);
  const lastValidAutoLandmarksRef = useRef<Array<{ x: number; y: number; z: number }>>([]);
  const [hasAutoLandmarksAvailable, setHasAutoLandmarksAvailable] = useState<boolean>(false);
  const lastAutoSuccessTimeRef = useRef<number>(performance.now());
  const coverTransformRef = useRef<ViewportCoverTransform | null>(null);

  // Manual Landmark Placement State (Normalized 0..1 coordinates)
  const [manualPoints, setManualPoints] = useState<ManualLandmarkSet>(() => {
    try {
      const saved = localStorage.getItem('smartbow_manual_landmarks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [manualHistory, setManualHistory] = useState<ManualLandmarkKey[]>([]);
  const [activeDragKey, setActiveDragKey] = useState<ManualLandmarkKey | null>(null);
  const [hoverNormPt, setHoverNormPt] = useState<NormalizedPoint2D | null>(null);
  const [hasFrozenFrame, setHasFrozenFrame] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('smartbow_manual_landmarks', JSON.stringify(manualPoints));
    } catch {
      // Ignore storage quota errors
    }
  }, [manualPoints]);

  // Live Optical ArUco Markers detected directly from camera stream
  const [liveMarkers, setLiveMarkers] = useState<MarkerPose[]>([]);
  const [frameDiag, setFrameDiag] = useState<ArucoFrameDiagnostics | null>(null);
  const [actualResolution, setActualResolution] = useState<{ width: number; height: number } | null>(null);
  const [autofocusStatus, setAutofocusStatus] = useState<'CONTINUOUS' | 'DEFAULT' | 'UNSUPPORTED'>('DEFAULT');
  const liveMarkersRef = useRef<MarkerPose[]>([]);
  const decayCountRef = useRef<number>(0);

  // Self-Check & Advanced Menu states
  const [isSelfCheckOpen, setIsSelfCheckOpen] = useState<boolean>(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [simVdo, setSimVdo] = useState<number>(vdoMm ?? 62.5);
  const [simTiltML, setSimTiltML] = useState<number>(tiltMLDeg ?? 1.4);

  // Capture feedback states
  const [shutterTriggered, setShutterTriggered] = useState<boolean>(false);
  const [trialToast, setTrialToast] = useState<string | null>(null);
  const [trialCount, setTrialCount] = useState<number>(1);

  // Initialize MediaPipe FaceLandmarker on mount
  useEffect(() => {
    const controller = mpControllerRef.current;
    const unsubscribe = controller.subscribe((st) => setMpModelState(st));
    controller.initialize();
    return unsubscribe;
  }, []);

  // Freeze current video or canvas frame when entering MANUAL mode
  const captureFrozenFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;

    if (!frozenFrameCanvasRef.current) {
      frozenFrameCanvasRef.current = document.createElement('canvas');
    }
    const frozen = frozenFrameCanvasRef.current;
    frozen.width = canvas.width;
    frozen.height = canvas.height;
    const fCtx = frozen.getContext('2d');
    if (!fCtx) return;

    const v = videoRef.current;
    if (mode === 'WEBCAM' && v && v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
      const shouldMirror = cameraFacing === 'user';
      const tf = computeCoverTransform(v.videoWidth, v.videoHeight, frozen.width, frozen.height, shouldMirror);
      if (shouldMirror) {
        fCtx.save();
        fCtx.translate(frozen.width, 0);
        fCtx.scale(-1, 1);
        fCtx.drawImage(v, tf.drawX, tf.drawY, tf.drawW, tf.drawH);
        fCtx.restore();
      } else {
        fCtx.drawImage(v, tf.drawX, tf.drawY, tf.drawW, tf.drawH);
      }
      setHasFrozenFrame(true);
    } else {
      // Fallback: copy current canvas appearance so manual placement always works
      fCtx.fillStyle = '#0f172a';
      fCtx.fillRect(0, 0, frozen.width, frozen.height);
      const cx = frozen.width * 0.5;
      const cy = frozen.height * 0.46;
      const rx = Math.min(frozen.width * 0.22, 130);
      const ry = rx * 1.32;
      fCtx.strokeStyle = '#334155';
      fCtx.lineWidth = 2;
      fCtx.beginPath();
      fCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      fCtx.stroke();
      setHasFrozenFrame(true);
    }
  }, [mode, cameraFacing]);

  const handleSwitchFaceMode = useCallback(
    (nextMode: 'AUTO' | 'MANUAL') => {
      if (nextMode === 'MANUAL') {
        captureFrozenFrame();
      }
      setFaceMode(nextMode);
    },
    [captureFrozenFrame]
  );

  // Copy MediaPipe auto points into manual landmarks
  const handleCopyAutoPointsToManual = useCallback(() => {
    const sourceLandmarks =
      autoLandmarksRef.current.length >= 468
        ? autoLandmarksRef.current
        : lastValidAutoLandmarksRef.current;
    if (sourceLandmarks.length < 468) return;

    const vW = videoRef.current?.videoWidth || canvasRef.current?.width || 1280;
    const vH = videoRef.current?.videoHeight || canvasRef.current?.height || 720;
    const cW = canvasRef.current?.width || 1280;
    const cH = canvasRef.current?.height || 720;

    const copied = copyAutoLandmarksToManual(
      sourceLandmarks,
      vW,
      vH,
      coverTransformRef.current,
      cW,
      cH
    );
    setManualPoints(copied);
    setManualHistory(MANUAL_LANDMARK_DEFINITIONS.map((d) => d.key));
  }, []);

  const handleUndoManualPoint = useCallback(() => {
    setManualHistory((prev) => {
      if (prev.length === 0) return prev;
      const lastKey = prev[prev.length - 1];
      setManualPoints((pts) => {
        const next = { ...pts };
        delete next[lastKey];
        return next;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const handleResetManualPoints = useCallback(() => {
    setManualPoints({});
    setManualHistory([]);
  }, []);

  // Pointer interaction on canvas for Manual Landmark placement & dragging
  const getNormalizedCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): NormalizedPoint2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.max(0.005, Math.min(0.995, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0.005, Math.min(0.995, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (faceMode !== 'MANUAL') return;
    const pt = getNormalizedCanvasPoint(e);
    if (!pt || !canvasRef.current) return;

    const cW = canvasRef.current.clientWidth || 640;
    const cH = canvasRef.current.clientHeight || 480;

    // 1. Check if pointer is grabbing an already-placed landmark (within 22px radius)
    let closestKey: ManualLandmarkKey | null = null;
    let minDistPx = 22;
    for (const def of MANUAL_LANDMARK_DEFINITIONS) {
      const existing = manualPoints[def.key];
      if (!existing) continue;
      const dPx = Math.hypot((existing.x - pt.x) * cW, (existing.y - pt.y) * cH);
      if (dPx < minDistPx) {
        minDistPx = dPx;
        closestKey = def.key;
      }
    }

    if (closestKey) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setActiveDragKey(closestKey);
      setHoverNormPt(pt);
      setManualPoints((prev) => ({ ...prev, [closestKey!]: pt }));
      return;
    }

    // 2. Otherwise place the next unplaced point in the 9-point sequence
    const nextUnplaced = MANUAL_LANDMARK_DEFINITIONS.find((d) => !manualPoints[d.key]);
    if (nextUnplaced) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setActiveDragKey(nextUnplaced.key);
      setHoverNormPt(pt);
      setManualPoints((prev) => ({ ...prev, [nextUnplaced.key]: pt }));
      setManualHistory((prev) => [...prev.filter((k) => k !== nextUnplaced.key), nextUnplaced.key]);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (faceMode !== 'MANUAL') return;
    const pt = getNormalizedCanvasPoint(e);
    if (!pt) return;
    setHoverNormPt(pt);

    if (activeDragKey) {
      setManualPoints((prev) => ({ ...prev, [activeDragKey]: pt }));
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (faceMode !== 'MANUAL') return;
    if (activeDragKey) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }
      setActiveDragKey(null);
    }
  };

  // Deduplicated Marker Groups (Maxillary 3..6, Mandibular 7..10)
  const detectedIds = Array.from(new Set(liveMarkers.map((m) => m.id))).sort((a, b) => a - b);
  const maxillaDetectedIds = [3, 4, 5, 6].filter((id) => detectedIds.includes(id));
  const maxillaMissingIds = [3, 4, 5, 6].filter((id) => !detectedIds.includes(id));
  const mandibleDetectedIds = [7, 8, 9, 10].filter((id) => detectedIds.includes(id));
  const mandibleMissingIds = [7, 8, 9, 10].filter((id) => !detectedIds.includes(id));
  const maxillaDetectedCount = maxillaDetectedIds.length;
  const mandibleDetectedCount = mandibleDetectedIds.length;
  const maxillaryAllVisible = maxillaDetectedCount === 4;
  const mandibularAllVisible = mandibleDetectedCount === 4;
  const hasAnyOpticalMarkers = liveMarkers.length > 0;

  const manualPlacedCount = MANUAL_LANDMARK_DEFINITIONS.filter((d) => Boolean(manualPoints[d.key])).length;
  const effectiveFaceReady =
    faceMode === 'AUTO'
      ? mode === 'SIMULATION'
        ? true
        : autoFaceDetected
      : manualPlacedCount >= 5; // Pupils + Glabella + Subnasale + Menton minimum

  const isLowCameraResolution =
    actualResolution !== null && (actualResolution.width < 1280 || actualResolution.height < 720);

  const arucoPipelineDiag: LiveArucoDiagnosticStatus = evaluateArucoPipelineDiagnostic({
    cameraActive,
    cameraPoweredOn,
    cameraError: cameraPermissionError,
    frameDiag,
    detectedIds,
    expectedIds: CLINICAL_RIM_EXPECTED_IDS,
    faceDetected: effectiveFaceReady,
  });

  const opticalDiagnostic: OpticalDiagnosticInfo = evaluateOpticalDiagnostic({
    mode,
    cameraActive: cameraActive && cameraPoweredOn,
    cameraError: cameraPermissionError,
    faceDetected: effectiveFaceReady,
    arucoDetected: mode === 'SIMULATION' ? true : hasAnyOpticalMarkers,
    maxillaryComplete: mode === 'SIMULATION' ? true : maxillaryAllVisible,
    mandibularComplete: mode === 'SIMULATION' ? true : mandibularAllVisible,
    cameraCalibrated: calibrationSettings.isCalibrated,
    markerSizeVerified: true,
    trackingStable: true,
    telemetryAgeMs: 0,
  });

  // Dynamic Canvas Resize
  const updateCanvasDimensions = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.floor(rect.width * dpr);
    const targetH = Math.floor(rect.height * dpr);

    if (canvasRef.current.width !== targetW || canvasRef.current.height !== targetH) {
      canvasRef.current.width = targetW;
      canvasRef.current.height = targetH;
    }
  }, []);

  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    window.addEventListener('orientationchange', updateCanvasDimensions);
    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
      window.removeEventListener('orientationchange', updateCanvasDimensions);
    };
  }, [updateCanvasDimensions]);

  // Enumerate video devices
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        })
        .catch(() => {});
    }
  }, [cameraActive]);

  // Webcam stream lifecycle (1920x1080 -> 1280x720 -> defaults) & continuous autofocus
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    if (mode === 'WEBCAM' && cameraPoweredOn) {
      const startCamera = async () => {
        try {
          setCameraPermissionError(null);
          setActualResolution(null);

          if (!navigator.mediaDevices?.getUserMedia) {
            setCameraPermissionError('Camera API unavailable. A secure HTTPS context is required.');
            setCameraActive(false);
            return;
          }

          const baseSourceConstraint: MediaTrackConstraints = selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: cameraFacing };

          const constraintCandidates: MediaStreamConstraints[] = [
            {
              video: { ...baseSourceConstraint, width: { ideal: 1920 }, height: { ideal: 1080 } },
              audio: false,
            },
            {
              video: { ...baseSourceConstraint, width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            },
            {
              video: baseSourceConstraint,
              audio: false,
            },
            {
              video: true,
              audio: false,
            },
          ];

          let lastErr: any = null;
          for (const candidate of constraintCandidates) {
            try {
              stream = await navigator.mediaDevices.getUserMedia(candidate);
              if (stream) break;
            } catch (err: any) {
              lastErr = err;
              if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                throw err;
              }
            }
          }

          if (!stream) {
            throw lastErr || new Error('Unable to acquire camera stream');
          }

          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
            try {
              const capabilities = videoTrack.getCapabilities() as any;
              if (Array.isArray(capabilities?.focusMode) && capabilities.focusMode.includes('continuous')) {
                await videoTrack.applyConstraints({
                  advanced: [{ focusMode: 'continuous' } as any],
                });
                if (!isCancelled) setAutofocusStatus('CONTINUOUS');
              } else {
                if (!isCancelled) setAutofocusStatus('UNSUPPORTED');
              }
            } catch {
              if (!isCancelled) setAutofocusStatus('DEFAULT');
            }
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            const syncVideoMetadata = () => {
              if (!videoRef.current || isCancelled) return;
              const vw = videoRef.current.videoWidth || 0;
              const vh = videoRef.current.videoHeight || 0;
              if (vw > 0 && vh > 0) {
                setActualResolution({ width: vw, height: vh });
              }
              updateCanvasDimensions();
            };
            videoRef.current.onloadedmetadata = syncVideoMetadata;
            await videoRef.current.play();
            setCameraActive(true);
            lastAutoSuccessTimeRef.current = performance.now();
            syncVideoMetadata();

            if (navigator.mediaDevices?.enumerateDevices) {
              const devices = await navigator.mediaDevices.enumerateDevices();
              setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
            }
          }
        } catch (err: any) {
          if (!isCancelled) {
            let errMsg = 'Camera permission denied or camera device unavailable';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              errMsg = 'Permission denied. Please allow camera access in browser permissions.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
              errMsg = 'No video capture hardware or camera sensor found on this device.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
              errMsg = 'Camera hardware is busy or in use by another application.';
            }
            setCameraPermissionError(errMsg);
            setCameraActive(false);
          }
        }
      };
      startCamera();
    } else {
      setCameraActive(false);
      setActualResolution(null);
      liveMarkersRef.current = [];
      setLiveMarkers([]);
      setFrameDiag(null);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [mode, cameraPoweredOn, cameraFacing, selectedDeviceId, retryTrigger, updateCanvasDimensions]);

  // Main Render & CV Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const render = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastTime)));
        frameCount = 0;
        lastTime = time;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;
      const isWebcamReady = mode === 'WEBCAM' && Boolean(videoRef.current && videoRef.current.readyState >= 2);
      let coverTransform: ViewportCoverTransform | null = null;

      // 1. Draw Background: Frozen Manual Frame, Live Webcam Feed, or Simulation Backdrop
      if (faceMode === 'MANUAL' && hasFrozenFrame && frozenFrameCanvasRef.current) {
        ctx.drawImage(frozenFrameCanvasRef.current, 0, 0, w, h);
      } else if (isWebcamReady && videoRef.current) {
        const v = videoRef.current;
        const vW = v.videoWidth || 640;
        const vH = v.videoHeight || 480;
        const shouldMirror = cameraFacing === 'user';

        coverTransform = computeCoverTransform(vW, vH, w, h, shouldMirror);
        coverTransformRef.current = coverTransform;
        if (shouldMirror) {
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(v, coverTransform.drawX, coverTransform.drawY, coverTransform.drawW, coverTransform.drawH);
          ctx.restore();
        } else {
          ctx.drawImage(v, coverTransform.drawX, coverTransform.drawY, coverTransform.drawW, coverTransform.drawH);
        }
      } else {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Real-Time Optical ArUco Marker Detection (Always independent of face tracking)
      if (isWebcamReady && videoRef.current && faceMode === 'AUTO') {
        if (frameCount % 2 === 0 || liveMarkersRef.current.length === 0) {
          const diag = detectArucoMarkersDetailed(videoRef.current, calibrationSettings);
          if (diag.markers.length > 0) {
            liveMarkersRef.current = diag.markers;
            decayCountRef.current = 0;
          } else {
            decayCountRef.current++;
            if (decayCountRef.current >= 2) {
              liveMarkersRef.current = [];
            }
          }
          setLiveMarkers(liveMarkersRef.current);
          setFrameDiag(diag);
        }
      }

      // 3. Draw Real Decoded ArUco Quadrilaterals & IDs Immediately (Maxilla cyan #22d3ee, Mandible amber #f59e0b)
      if (mode === 'WEBCAM' && isWebcamReady && coverTransform && liveMarkersRef.current.length > 0) {
        for (const marker of liveMarkersRef.current) {
          const mappedCorners = mapVideoCornersToCanvas(marker.corners, coverTransform);
          const isMaxilla = marker.id >= 3 && marker.id <= 6;
          const isMandible = marker.id >= 7 && marker.id <= 10;
          const strokeColor = isMaxilla ? '#22d3ee' : isMandible ? '#f59e0b' : '#22c55e';
          const fillColor = isMaxilla
            ? 'rgba(34, 211, 238, 0.14)'
            : isMandible
            ? 'rgba(245, 158, 11, 0.14)'
            : 'rgba(34, 197, 94, 0.12)';
          const badgeBgColor = isMaxilla
            ? 'rgba(8, 51, 68, 0.92)'
            : isMandible
            ? 'rgba(69, 26, 3, 0.92)'
            : 'rgba(6, 78, 59, 0.92)';
          const badgeTextColor = isMaxilla ? '#cffafe' : isMandible ? '#fef3c7' : '#dcfce7';

          ctx.save();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(mappedCorners[0].x, mappedCorners[0].y);
          ctx.lineTo(mappedCorners[1].x, mappedCorners[1].y);
          ctx.lineTo(mappedCorners[2].x, mappedCorners[2].y);
          ctx.lineTo(mappedCorners[3].x, mappedCorners[3].y);
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = fillColor;
          ctx.fill();

          for (let ci = 0; ci < 4; ci++) {
            ctx.fillStyle = ci === 0 ? '#ffffff' : strokeColor;
            ctx.beginPath();
            ctx.arc(mappedCorners[ci].x, mappedCorners[ci].y, ci === 0 ? 4.5 : 3.2, 0, Math.PI * 2);
            ctx.fill();
          }

          const minY = Math.min(mappedCorners[0].y, mappedCorners[1].y, mappedCorners[2].y, mappedCorners[3].y);
          const minX = Math.min(mappedCorners[0].x, mappedCorners[1].x, mappedCorners[2].x, mappedCorners[3].x);
          const groupTag = isMaxilla ? 'Maxilla' : isMandible ? 'Mandible' : 'DICT_4X4_50';
          const tag = `ID #${marker.id} · ${groupTag}`;

          ctx.font = 'bold 12px monospace';
          const textW = ctx.measureText(tag).width;
          const badgeW = textW + 14;
          const badgeH = 20;
          const badgeX = Math.max(4, Math.min(w - badgeW - 4, minX));
          const badgeY = Math.max(4, minY - badgeH - 6);

          ctx.fillStyle = badgeBgColor;
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
          ctx.fillStyle = badgeTextColor;
          ctx.fillText(tag, badgeX + 7, badgeY + 14);
          ctx.restore();
        }
      }

      // 4. Face Landmarks: AUTO (MediaPipe FaceLandmarker) vs MANUAL (9-point interactive placement)
      if (faceMode === 'MANUAL') {
        drawManualFaceLandmarksOnCanvas(
          ctx,
          frozenFrameCanvasRef.current || videoRef.current,
          manualPoints,
          activeDragKey,
          hoverNormPt,
          w,
          h
        );
      } else if (mode === 'WEBCAM' && isWebcamReady && videoRef.current && coverTransform) {
        if (frameCount % 2 === 0) {
          const mpOut = mpControllerRef.current.detectVideoFrame(videoRef.current, time);
          setFaceInferenceTimeMs(mpOut.inferenceTimeMs);

          if (mpOut.detected) {
            autoLandmarksRef.current = mpOut.landmarks;
            lastValidAutoLandmarksRef.current = mpOut.landmarks;
            lastAutoSuccessTimeRef.current = time;
            setAutoFaceDetected(true);
            setAutoFaceRollDeg(mpOut.rollDeg);
            setAutoFailedFor3Sec(false);
            setHasAutoLandmarksAvailable(true);
          } else {
            autoLandmarksRef.current = [];
            setAutoFaceDetected(false);
            if (time - lastAutoSuccessTimeRef.current >= 3000) {
              setAutoFailedFor3Sec(true);
            }
          }
        }

        if (autoLandmarksRef.current.length >= 468) {
          drawAutoFaceLandmarksOnCanvas(
            ctx,
            autoLandmarksRef.current,
            videoRef.current.videoWidth || 640,
            videoRef.current.videoHeight || 480,
            coverTransform
          );
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    mode,
    faceMode,
    hasFrozenFrame,
    manualPoints,
    activeDragKey,
    hoverNormPt,
    cameraFacing,
    calibrationSettings,
  ]);

  // Primary Shutter Action
  const handleTriggerShutter = () => {
    if (!opticalDiagnostic.engineeringTestAllowed) return;
    setShutterTriggered(true);
    setTimeout(() => setShutterTriggered(false), 300);
    onRecordCrTrial();
    const nextTrial = trialCount + 1;
    setTrialCount(nextTrial);
    setTrialToast(`Trial ${trialCount} recorded`);
    setTimeout(() => setTrialToast(null), 2500);
  };

  const cand = frameDiag?.candidateSummary ?? {
    quads: 0,
    rejectedTooSmall: 0,
    rejectedBorder: 0,
    rejectedDictionary: 0,
    rejectedFlat: 0,
  };

  const canvasAspect =
    canvasRef.current && canvasRef.current.height > 0
      ? canvasRef.current.width / canvasRef.current.height
      : 16 / 9;

  return (
    <div className="relative w-full h-[calc(100dvh-56px)] bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* Hidden video element for live camera stream */}
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />

      {/* Main Viewfinder Stage */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={() => setHoverNormPt(null)}
          className={`w-full h-full object-cover ${
            faceMode === 'MANUAL' ? 'cursor-crosshair touch-none' : ''
          }`}
        />

        {/* Shutter Flash */}
        {shutterTriggered && (
          <div className="absolute inset-0 bg-white/70 pointer-events-none z-30 animate-shutter-flash" />
        )}

        {/* Toast */}
        {trialToast && (
          <div className="absolute top-16 inset-x-0 flex justify-center pointer-events-none z-30">
            <div className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{trialToast}</span>
            </div>
          </div>
        )}

        {/* Top Bar: Camera Controls + Self-Check + Settings/Calibration + Help + Advanced */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto z-20 flex-wrap">
          {/* Left: Camera Stream Controls & Active Resolution */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {mode === 'WEBCAM' && (
              <>
                <button
                  onClick={() => setCameraPoweredOn((prev) => !prev)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl border backdrop-blur-md transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold ${
                    cameraPoweredOn
                      ? 'bg-slate-900/90 border-slate-700 text-emerald-300 hover:bg-slate-800'
                      : 'bg-rose-950/90 border-rose-700 text-rose-200 hover:bg-rose-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{cameraPoweredOn ? 'Cam ON' : 'Cam OFF'}</span>
                </button>

                <button
                  onClick={() => setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'))}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  title="Switch Front / Rear Camera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{cameraFacing === 'user' ? 'Front' : 'Rear'}</span>
                </button>

                {videoDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="h-9 px-2 py-1 bg-slate-900/90 text-slate-200 border border-slate-700 text-xs rounded-xl cursor-pointer max-w-[140px] truncate"
                  >
                    <option value="">Default Camera</option>
                    {videoDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                {faceMode === 'MANUAL' && (
                  <button
                    onClick={captureFrozenFrame}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-cyan-950/90 border border-cyan-600/60 text-cyan-200 hover:bg-cyan-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Freeze a fresh video frame for manual landmarks"
                  >
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>Refreeze Frame</span>
                  </button>
                )}
              </>
            )}

            {actualResolution && mode === 'WEBCAM' && (
              <div
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-mono ${
                  isLowCameraResolution
                    ? 'bg-amber-950/90 border-amber-500/60 text-amber-300 font-bold'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300'
                }`}
              >
                {actualResolution.width}×{actualResolution.height}
                {autofocusStatus === 'CONTINUOUS' ? ' · AF-C' : ''}
                {isLowCameraResolution ? ' · WARN <1280×720' : ''}
              </div>
            )}

            {mode === 'SIMULATION' && (
              <div className="px-3 py-1 bg-amber-500/90 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>SIMULATION MODE</span>
                <button
                  onClick={() => setMode('WEBCAM')}
                  className="ml-1 px-2 py-0.5 bg-slate-950 text-white rounded text-[10px] cursor-pointer"
                >
                  Switch to Live Camera
                </button>
              </div>
            )}
          </div>

          {/* Right: Self-Check + Single Calibration/Settings Entry + Help Link + Advanced */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSelfCheckOpen(true)}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Self-Check</span>
            </button>

            <button
              onClick={onOpenCalibration}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Camera Calibration & Optical Intrinsics"
            >
              <Settings2 className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Calibration</span>
            </button>

            {onOpenManual && (
              <button
                onClick={onOpenManual}
                className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Help & Clinical Documentation"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Help</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setIsAdvancedOpen((v) => !v)}
                className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Advanced Options"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Advanced</span>
              </button>

              {isAdvancedOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-40 space-y-2.5 text-xs">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Advanced Options
                  </div>

                  <button
                    onClick={() => {
                      setMode((m) => (m === 'WEBCAM' ? 'SIMULATION' : 'WEBCAM'));
                      setIsAdvancedOpen(false);
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-left text-slate-200 font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>Mode: {mode === 'WEBCAM' ? 'Live Camera' : 'Simulation'}</span>
                    <Play className="w-3.5 h-3.5 text-teal-400" />
                  </button>

                  {onOpenMarkers && (
                    <button
                      onClick={() => {
                        onOpenMarkers();
                        setIsAdvancedOpen(false);
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-left text-slate-200 font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>Print A4 Marker Sheet</span>
                      <Printer className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  )}

                  {mode === 'SIMULATION' && (
                    <div className="space-y-2 pt-2 border-t border-slate-800 font-mono text-[11px]">
                      <div>
                        <div className="flex justify-between text-slate-400">
                          <span>Sim VDO:</span>
                          <span className="text-white">{simVdo.toFixed(1)} mm</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="75"
                          step="0.5"
                          value={simVdo}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSimVdo(val);
                            onUpdateVdo(val);
                          }}
                          className="w-full accent-teal-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-400">
                          <span>Sim Tilt M-L:</span>
                          <span className="text-white">{simTiltML.toFixed(1)}°</span>
                        </div>
                        <input
                          type="range"
                          min="-8"
                          max="8"
                          step="0.2"
                          value={simTiltML}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSimTiltML(val);
                            onUpdateTiltML(val);
                          }}
                          className="w-full accent-teal-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Camera Paused / Permission Denied Overlay (only when in AUTO mode without frozen frame) */}
        {mode === 'WEBCAM' && faceMode === 'AUTO' && (!cameraPoweredOn || cameraPermissionError) && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-15">
            <div className="p-4 rounded-2xl border mb-3 bg-slate-900 border-slate-800 text-teal-400">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {cameraPermissionError ? 'Camera Access Required' : 'Camera Feed Paused'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              {cameraPermissionError || 'Start the camera feed or switch to Manual landmark mode.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCameraPermissionError(null);
                  setCameraPoweredOn(true);
                  setRetryTrigger((r) => r + 1);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                {cameraPermissionError ? 'Retry Camera Permission' : 'Start Camera Feed'}
              </button>
              <button
                onClick={() => handleSwitchFaceMode('MANUAL')}
                className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Place landmarks manually
              </button>
            </div>
          </div>
        )}

        {/* Bottom HUD: 1. FaceLandmarkPanel (AUTO/MANUAL) + 2. Marker Panel (Maxillary/Mandibular) + 3. Capture */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 pointer-events-auto z-20 max-w-4xl mx-auto">
          {/* 1. Face Status + AUTO/MANUAL Switch Panel */}
          <FaceLandmarkPanel
            faceMode={faceMode}
            onChangeFaceMode={handleSwitchFaceMode}
            modelState={mpModelState}
            onRetryModelLoad={() => mpControllerRef.current.initialize()}
            autoDetected={autoFaceDetected}
            autoRollDeg={autoFaceRollDeg}
            autoFailedFor3Sec={autoFailedFor3Sec}
            hasAutoLandmarksAvailable={hasAutoLandmarksAvailable}
            manualPoints={manualPoints}
            onUndoManualPoint={handleUndoManualPoint}
            onResetManualPoints={handleResetManualPoints}
            onCopyAutoPointsToManual={handleCopyAutoPointsToManual}
            canvasAspectRatio={canvasAspect}
          />

          {/* 2. Dental-Rim ArUco Marker Panel (Maxillary 3-6 Cyan, Mandibular 7-10 Amber, Factual Status) */}
          <div className="bg-slate-950/92 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-xs font-mono shadow-lg space-y-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Maxillary Group (IDs 3, 4, 5, 6) */}
              <div className="px-2.5 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-100 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-cyan-400 block">MAXILLARY RIM (IDs 3–6)</span>
                  <span className="text-[11px]">
                    Detected IDs: [{maxillaDetectedIds.join(', ')}] · Missing: [{maxillaMissingIds.join(', ')}]
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200 font-bold text-xs shrink-0">
                  Count {maxillaDetectedCount}/4
                </span>
              </div>

              {/* Mandibular Group (IDs 7, 8, 9, 10) */}
              <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-100 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-amber-400 block">MANDIBULAR RIM (IDs 7–10)</span>
                  <span className="text-[11px]">
                    Detected IDs: [{mandibleDetectedIds.join(', ')}] · Missing: [{mandibleMissingIds.join(', ')}]
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 font-bold text-xs shrink-0">
                  Count {mandibleDetectedCount}/4
                </span>
              </div>
            </div>

            {/* Factual Status Line + Capture Action */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-800/80 text-[11px]">
              <div className="text-slate-300">
                {liveMarkers.length > 0 ? (
                  <span className="text-emerald-400 font-bold">
                    MARKERS DETECTED: [{detectedIds.map((id) => `#${id}`).join(', ')}]
                    {arucoPipelineDiag.qualityWarnings.length > 0 && (
                      <span className="text-amber-300 font-normal ml-2">
                        (Note: {arucoPipelineDiag.qualityWarnings[0]})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-amber-300">
                    NO MARKER FOUND — {cand.quads} candidate squares: {cand.rejectedTooSmall} too small /{' '}
                    {cand.rejectedBorder} border / {cand.rejectedDictionary} pattern / {cand.rejectedFlat} flat
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerShutter}
                  disabled={!opticalDiagnostic.engineeringTestAllowed}
                  className={`px-3 py-1 rounded-lg font-sans font-bold text-xs flex items-center gap-1.5 transition-colors ${
                    opticalDiagnostic.engineeringTestAllowed
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  title={opticalDiagnostic.actionableGuidance}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture Trial</span>
                </button>

                <button
                  onClick={() => onNavigateToTab('records')}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-sans font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Records</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Runtime Self-Check Modal */}
      <ScannerSelfCheckModal
        isOpen={isSelfCheckOpen}
        onClose={() => setIsSelfCheckOpen(false)}
        checkInput={{
          cameraActive: cameraActive && cameraPoweredOn,
          videoWidth: actualResolution?.width ?? 0,
          videoHeight: actualResolution?.height ?? 0,
          cameraError: cameraPermissionError,
          faceModelState: mpModelState,
          fps,
          arucoFrameTimeMs: frameDiag?.processingTimeMs ?? null,
          faceInferenceTimeMs,
        }}
      />
    </div>
  );
};
