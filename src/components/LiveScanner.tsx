/**
 * SmartBow AI — Live Camera & Computer Vision Scanner
 *
 * Implements:
 * 1. Camera-Off & 500 ms Freshness Safety:
 *    - Immediately resets autoFaceDetected=false, autoLandmarksRef=[], lastValidAutoLandmarksRef=[],
 *      autoFaceRollDeg=0, hasAutoLandmarksAvailable=false, and clears markers (0/4, 0/4) when
 *      camera stops/is powered off, video is paused/ended, mode !== 'WEBCAM', or faceMode === 'MANUAL'.
 *    - Enforces 500 ms freshness rule: if no frame was processed by detectVideoFrame in the last 500 ms,
 *      treats face as NOT DETECTED even if the camera is on.
 * 2. Non-Blocking Responsive Layout (Never Covers Video by Default):
 *    - Desktop / wide screens (>= 1024 px): Video on the left in full (Fit / object-fit: contain default),
 *      fixed 360 px (340-380 px) scrollable side panel on the right containing Face & Marker panels.
 *    - Phones / narrow screens (< 1024 px): Video on top, panels in a bottom sheet with drag handle.
 *      Collapsed state = ONE line ("FACE: DETECTED · MAX 2/4 · MAND 0/4"). Tap or drag to expand.
 *    - "Float panels" mode: Draggable Face & Marker panels with header handle (mouse & touch),
 *      viewport clamping, Minimise & Close buttons, opacity slider (30-100%), localStorage persistence,
 *      and "Reset layout".
 *    - "Hide panels" button + keyboard shortcut (H): Hides everything except a small status chip.
 *    - Manual landmark mode: Automatically collapses bottom sheet so no point is hidden, and shows
 *      "Next (n/9): <point name>" as a small chip near the top of the video.
 *    - "Fit video / Fill video" toggle (default: Fit) with exact overlay alignment across Fit, Fill,
 *      mirrored front camera, and window resize.
 *    - Unambiguous candidate square vs pre-quad small contour rejection counts.
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
  Maximize2,
  Minimize2,
  EyeOff,
  Eye,
  Move,
  RotateCcw,
  X,
  Minus,
  ChevronUp,
  ChevronDown,
  Crosshair,
} from 'lucide-react';
import { DentitionState, CameraCalibrationSettings, MarkerPose } from '../types/smartbow';
import {
  detectArucoMarkersDetailed,
  ArucoFrameDiagnostics,
  computeViewportTransform,
  mapVideoCornersToCanvas,
  ViewportCoverTransform,
  formatCandidateRejectionSummary,
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
  ScannerLayoutState,
  FACE_DETECTION_FRESHNESS_TIMEOUT_MS,
  clampFloatingPanelPosition,
  copyAutoLandmarksToManual,
  drawAutoFaceLandmarksOnCanvas,
  drawManualFaceLandmarksOnCanvas,
  formatCollapsedScannerSummary,
  loadScannerLayoutState,
  resetScannerLayoutState,
  resolveLiveFaceTrackingState,
  saveScannerLayoutState,
} from '../lib/faceLandmarks';
import {
  computeLiveMarkerDistance,
  formatIpdStatusText,
  loadCameraCalibrationForDevice,
  saveCameraCalibration,
} from '../lib/cameraCalibration';
import { ActiveTrackMetadata } from './CameraCalibrationModal';
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
  onUpdateCalibrationSettings?: (settings: CameraCalibrationSettings) => void;
  onLiveCalibrationContextChange?: (ctx: {
    liveMarkers: MarkerPose[];
    activeTrackInfo: ActiveTrackMetadata | null;
    liveDistanceCm: number | null;
  }) => void;
  onOpenCalibration: () => void;
  onOpenManual?: () => void;
  onOpenMarkers?: () => void;
  developerMode?: boolean;
}

const EMPTY_MARKERS: MarkerPose[] = [];

export const LiveScanner: React.FC<LiveScannerProps> = ({
  vdoMm,
  onUpdateVdo,
  tiltMLDeg,
  onUpdateTiltML,
  onRecordCrTrial,
  onNavigateToTab,
  calibrationSettings,
  onUpdateCalibrationSettings,
  onLiveCalibrationContextChange,
  onOpenCalibration,
  onOpenManual,
  onOpenMarkers,
}) => {
  const rootStageRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frozenFrameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mpControllerRef = useRef<MediaPipeFaceLandmarkController>(
    new MediaPipeFaceLandmarkController()
  );

  // Mode: Defaults to live WEBCAM scanner; SIMULATION is available under Advanced menu
  const [mode, setMode] = useState<'WEBCAM' | 'SIMULATION'>('WEBCAM');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPoweredOn, setCameraPoweredOn] = useState<boolean>(true);
  const [isWebcamReady, setIsWebcamReady] = useState<boolean>(false);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(30);
  const [activeTrackInfo, setActiveTrackInfo] = useState<ActiveTrackMetadata | null>(null);

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
  const lastProcessedFaceFrameTimeRef = useRef<number | null>(null);
  const coverTransformRef = useRef<ViewportCoverTransform | null>(null);

  // Layout State (Fit/Fill default FIT, Side Panel / Mobile Bottom Sheet / Floating Panels / Hide Panels)
  const [layoutState, setLayoutState] = useState<ScannerLayoutState>(() =>
    loadScannerLayoutState()
  );
  const layoutStateRef = useRef<ScannerLayoutState>(layoutState);
  layoutStateRef.current = layoutState;

  useEffect(() => {
    saveScannerLayoutState(layoutState);
  }, [layoutState]);

  // Floating panel drag state
  const [draggingPanel, setDraggingPanel] = useState<{
    panel: 'facePanel' | 'markerPanel';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Mobile bottom-sheet touch drag state
  const sheetDragStartYRef = useRef<number | null>(null);

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
  const [actualResolution, setActualResolution] = useState<{ width: number; height: number } | null>(
    null
  );
  const [autofocusStatus, setAutofocusStatus] = useState<'CONTINUOUS' | 'DEFAULT' | 'UNSUPPORTED'>(
    'DEFAULT'
  );
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

  // Helper to immediately clear automatic face tracking state (and optionally markers when camera stops)
  const clearAutoFaceTrackingState = useCallback((alsoClearMarkers: boolean) => {
    autoLandmarksRef.current = [];
    lastValidAutoLandmarksRef.current = [];
    lastProcessedFaceFrameTimeRef.current = null;
    setAutoFaceDetected((prev) => (prev ? false : prev));
    setAutoFaceRollDeg((prev) => (prev !== 0 ? 0 : prev));
    setHasAutoLandmarksAvailable((prev) => (prev ? false : prev));
    setAutoFailedFor3Sec((prev) => (prev ? false : prev));

    if (alsoClearMarkers) {
      liveMarkersRef.current = EMPTY_MARKERS;
      decayCountRef.current = 0;
      setLiveMarkers((prev) => (prev.length > 0 ? EMPTY_MARKERS : prev));
      setFrameDiag((prev) => (prev !== null ? null : prev));
    }
  }, []);

  // Requirement 1 (Bug Fix): Immediately clear face detection, landmarks, roll, and markers in an effect
  // whenever camera stops/is powered off, video is not ready, mode is not WEBCAM, or faceMode is MANUAL.
  useEffect(() => {
    const v = videoRef.current;
    const videoPausedOrEnded = !v || v.paused || v.ended || v.readyState < 2;
    const cameraInactive =
      !cameraActive || !cameraPoweredOn || !isWebcamReady || videoPausedOrEnded || mode !== 'WEBCAM';

    if (cameraInactive) {
      clearAutoFaceTrackingState(true);
    } else if (faceMode === 'MANUAL') {
      clearAutoFaceTrackingState(false);
    }
  }, [cameraActive, cameraPoweredOn, isWebcamReady, mode, faceMode, clearAutoFaceTrackingState]);

  // Requirement 2 (Bug Fix): 500 ms freshness watchdog timer — even if camera is ON, if detectVideoFrame
  // has not processed a frame in the last 500 ms, treat face as NOT DETECTED.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const v = videoRef.current;
      const videoPausedOrEnded = !v || v.paused || v.ended || v.readyState < 2;
      const resolved = resolveLiveFaceTrackingState({
        cameraActive,
        cameraPoweredOn,
        videoReady: isWebcamReady,
        videoPausedOrEnded,
        mode,
        faceMode,
        rawAutoDetected: autoLandmarksRef.current.length >= 468,
        rawRollDeg: autoFaceRollDeg,
        rawLandmarks: autoLandmarksRef.current,
        lastProcessedFrameTimeMs: lastProcessedFaceFrameTimeRef.current,
        nowMs: now,
      });

      if (!resolved.autoDetected) {
        if (autoLandmarksRef.current.length > 0) {
          autoLandmarksRef.current = [];
        }
        setAutoFaceDetected((prev) => (prev ? false : prev));
        setAutoFaceRollDeg((prev) => (prev !== 0 ? 0 : prev));
        if (resolved.reason === 'CAMERA_OFF_OR_INACTIVE' || resolved.reason === 'MANUAL_MODE_ACTIVE') {
          lastValidAutoLandmarksRef.current = [];
          setHasAutoLandmarksAvailable((prev) => (prev ? false : prev));
        }
      }
    }, 150);

    return () => window.clearInterval(intervalId);
  }, [cameraActive, cameraPoweredOn, isWebcamReady, mode, faceMode, autoFaceRollDeg]);

  // Keyboard shortcut (H) to toggle "Hide panels"
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setLayoutState((prev) => ({ ...prev, hidePanels: !prev.hidePanels }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Clamp floating panel positions when window resizes
  useEffect(() => {
    const clampAll = () => {
      const stage = rootStageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setLayoutState((prev) => ({
        ...prev,
        facePanel: {
          ...prev.facePanel,
          ...clampFloatingPanelPosition(
            { x: prev.facePanel.x, y: prev.facePanel.y },
            { width: prev.facePanel.width, height: prev.facePanel.minimised ? 44 : prev.facePanel.height },
            { width: rect.width, height: rect.height }
          ),
        },
        markerPanel: {
          ...prev.markerPanel,
          ...clampFloatingPanelPosition(
            { x: prev.markerPanel.x, y: prev.markerPanel.y },
            {
              width: prev.markerPanel.width,
              height: prev.markerPanel.minimised ? 44 : prev.markerPanel.height,
            },
            { width: rect.width, height: rect.height }
          ),
        },
      }));
    };
    window.addEventListener('resize', clampAll);
    return () => window.removeEventListener('resize', clampAll);
  }, []);

  // Floating panel pointer move / up listeners
  useEffect(() => {
    if (!draggingPanel) return;
    const handleMove = (e: PointerEvent) => {
      const stage = rootStageRef.current;
      const vw = stage?.clientWidth || window.innerWidth;
      const vh = stage?.clientHeight || window.innerHeight;
      const dx = e.clientX - draggingPanel.startX;
      const dy = e.clientY - draggingPanel.startY;

      setLayoutState((prev) => {
        const currentCfg = prev[draggingPanel.panel];
        const clamped = clampFloatingPanelPosition(
          { x: draggingPanel.origX + dx, y: draggingPanel.origY + dy },
          {
            width: currentCfg.width,
            height: currentCfg.minimised ? 44 : currentCfg.height,
          },
          { width: vw, height: vh }
        );
        return {
          ...prev,
          [draggingPanel.panel]: {
            ...currentCfg,
            x: clamped.x,
            y: clamped.y,
          },
        };
      });
    };
    const handleUp = () => setDraggingPanel(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [draggingPanel]);

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
      const tf = computeViewportTransform(
        v.videoWidth,
        v.videoHeight,
        frozen.width,
        frozen.height,
        shouldMirror,
        layoutStateRef.current.videoFitMode
      );
      fCtx.fillStyle = '#090d16';
      fCtx.fillRect(0, 0, frozen.width, frozen.height);
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
        // Automatically collapse mobile bottom sheet and clear active auto detection state
        // so no placed or placeable point is hidden on the video
        setLayoutState((prev) => ({ ...prev, mobileSheetExpanded: false }));
        clearAutoFaceTrackingState(false);
      }
      setFaceMode(nextMode);
    },
    [captureFrozenFrame, clearAutoFaceTrackingState]
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
  const getNormalizedCanvasPoint = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): NormalizedPoint2D | null => {
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
  const effectiveMarkers =
    cameraActive && cameraPoweredOn && mode === 'WEBCAM' ? liveMarkers : EMPTY_MARKERS;
  const detectedIds = Array.from(new Set(effectiveMarkers.map((m) => m.id))).sort((a, b) => a - b);
  const maxillaDetectedIds = [3, 4, 5, 6].filter((id) => detectedIds.includes(id));
  const maxillaMissingIds = [3, 4, 5, 6].filter((id) => !detectedIds.includes(id));
  const mandibleDetectedIds = [7, 8, 9, 10].filter((id) => detectedIds.includes(id));
  const mandibleMissingIds = [7, 8, 9, 10].filter((id) => !detectedIds.includes(id));
  const maxillaDetectedCount = maxillaDetectedIds.length;
  const mandibleDetectedCount = mandibleDetectedIds.length;
  const maxillaryAllVisible = maxillaDetectedCount === 4;
  const mandibularAllVisible = mandibleDetectedCount === 4;
  const hasAnyOpticalMarkers = effectiveMarkers.length > 0;

  // Effective auto face state gated by camera state & 500 ms freshness rule
  const effectiveAutoFaceState = resolveLiveFaceTrackingState({
    cameraActive,
    cameraPoweredOn,
    videoReady: isWebcamReady,
    videoPausedOrEnded: !videoRef.current || videoRef.current.paused || videoRef.current.ended,
    mode,
    faceMode,
    rawAutoDetected: autoFaceDetected,
    rawRollDeg: autoFaceRollDeg,
    rawLandmarks: autoLandmarksRef.current,
    lastProcessedFrameTimeMs: lastProcessedFaceFrameTimeRef.current,
    nowMs: performance.now(),
  });

  const effectiveAutoDetected = effectiveAutoFaceState.autoDetected;
  const effectiveAutoRollDeg = effectiveAutoFaceState.rollDeg;

  const manualPlacedCount = MANUAL_LANDMARK_DEFINITIONS.filter((d) =>
    Boolean(manualPoints[d.key])
  ).length;
  const nextManualDef = MANUAL_LANDMARK_DEFINITIONS.find((d) => !manualPoints[d.key]) || null;

  const effectiveFaceReady =
    faceMode === 'AUTO'
      ? mode === 'SIMULATION'
        ? true
        : effectiveAutoDetected
      : manualPlacedCount >= 5;

  const isLowCameraResolution =
    actualResolution !== null && (actualResolution.width < 1280 || actualResolution.height < 720);

  // Live marker distance & active scale source
  const liveDistanceInfo = computeLiveMarkerDistance(
    effectiveMarkers,
    calibrationSettings,
    actualResolution?.width ?? 1280,
    actualResolution?.height ?? 720
  );
  const ipdStatus = formatIpdStatusText(calibrationSettings);

  const lastSentCalibCtxRef = useRef<{
    liveMarkers: MarkerPose[];
    activeTrackInfo: ActiveTrackMetadata | null;
    liveDistanceCm: number | null;
  } | null>(null);

  useEffect(() => {
    const prev = lastSentCalibCtxRef.current;
    if (
      prev &&
      prev.liveMarkers === effectiveMarkers &&
      prev.activeTrackInfo === activeTrackInfo &&
      prev.liveDistanceCm === liveDistanceInfo.distanceCm
    ) {
      return;
    }
    const nextCtx = {
      liveMarkers: effectiveMarkers,
      activeTrackInfo,
      liveDistanceCm: liveDistanceInfo.distanceCm,
    };
    lastSentCalibCtxRef.current = nextCtx;
    onLiveCalibrationContextChange?.(nextCtx);
  }, [effectiveMarkers, activeTrackInfo, liveDistanceInfo.distanceCm, onLiveCalibrationContextChange]);

  const arucoPipelineDiag: LiveArucoDiagnosticStatus = evaluateArucoPipelineDiagnostic({
    cameraActive,
    cameraPoweredOn,
    cameraError: cameraPermissionError,
    frameDiag: cameraActive && cameraPoweredOn ? frameDiag : null,
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

  // Dynamic Canvas Resize (observes container size changes when side panel / sheet / window resizes)
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
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => updateCanvasDimensions());
      ro.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
      window.removeEventListener('orientationchange', updateCanvasDimensions);
      ro?.disconnect();
    };
  }, [
    updateCanvasDimensions,
    layoutState.floatPanels,
    layoutState.hidePanels,
    layoutState.mobileSheetExpanded,
    layoutState.videoFitMode,
  ]);

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
          setIsWebcamReady(false);

          if (!navigator.mediaDevices?.getUserMedia) {
            setCameraPermissionError(
              'Camera API unavailable. A secure HTTPS context is required.'
            );
            setCameraActive(false);
            clearAutoFaceTrackingState(true);
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
          const trackSettings =
            videoTrack && typeof videoTrack.getSettings === 'function'
              ? videoTrack.getSettings()
              : {};
          const trackLabel = videoTrack?.label || '';

          if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
            try {
              const capabilities = videoTrack.getCapabilities() as any;
              if (
                Array.isArray(capabilities?.focusMode) &&
                capabilities.focusMode.includes('continuous')
              ) {
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
              const vw = videoRef.current.videoWidth || trackSettings.width || 0;
              const vh = videoRef.current.videoHeight || trackSettings.height || 0;
              if (vw > 0 && vh > 0) {
                setActualResolution({ width: vw, height: vh });
                setIsWebcamReady(videoRef.current.readyState >= 2);
                const meta: ActiveTrackMetadata = {
                  deviceLabel: trackLabel,
                  facingMode: String(trackSettings.facingMode || cameraFacing),
                  width: vw,
                  height: vh,
                  frameRate: trackSettings.frameRate,
                };
                setActiveTrackInfo(meta);

                // Sync per-camera-label + resolution calibration (invalidates if camera or resolution changed)
                const loaded = loadCameraCalibrationForDevice(
                  trackLabel,
                  vw,
                  vh,
                  calibrationSettings
                );
                if (loaded.invalidated && onUpdateCalibrationSettings) {
                  onUpdateCalibrationSettings(loaded.settings);
                  saveCameraCalibration(loaded.settings);
                }
              }
              updateCanvasDimensions();
            };
            videoRef.current.onloadedmetadata = syncVideoMetadata;
            await videoRef.current.play();
            setCameraActive(true);
            setIsWebcamReady(videoRef.current.readyState >= 2);
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
            setIsWebcamReady(false);
            setActiveTrackInfo(null);
            clearAutoFaceTrackingState(true);
          }
        }
      };
      startCamera();
    } else {
      setCameraActive(false);
      setIsWebcamReady(false);
      setActualResolution(null);
      setActiveTrackInfo(null);
      clearAutoFaceTrackingState(true);
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
  }, [
    mode,
    cameraPoweredOn,
    cameraFacing,
    selectedDeviceId,
    retryTrigger,
    updateCanvasDimensions,
    clearAutoFaceTrackingState,
  ]);

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
      const v = videoRef.current;
      const readyNow =
        mode === 'WEBCAM' &&
        cameraPoweredOn &&
        cameraActive &&
        Boolean(v && !v.paused && !v.ended && v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0);

      let viewportTransform: ViewportCoverTransform | null = null;

      // Clear background canvas first (important for Fit / letterboxed mode)
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // 1. Draw Background: Frozen Manual Frame, Live Webcam Feed (Fit or Fill), or Dark Backdrop
      if (faceMode === 'MANUAL' && hasFrozenFrame && frozenFrameCanvasRef.current) {
        ctx.drawImage(frozenFrameCanvasRef.current, 0, 0, w, h);
      } else if (readyNow && v) {
        const vW = v.videoWidth || 1280;
        const vH = v.videoHeight || 720;
        const shouldMirror = cameraFacing === 'user';

        viewportTransform = computeViewportTransform(
          vW,
          vH,
          w,
          h,
          shouldMirror,
          layoutState.videoFitMode
        );
        coverTransformRef.current = viewportTransform;
        if (shouldMirror) {
          ctx.save();
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(
            v,
            viewportTransform.drawX,
            viewportTransform.drawY,
            viewportTransform.drawW,
            viewportTransform.drawH
          );
          ctx.restore();
        } else {
          ctx.drawImage(
            v,
            viewportTransform.drawX,
            viewportTransform.drawY,
            viewportTransform.drawW,
            viewportTransform.drawH
          );
        }
      }

      // 2. Real-Time Optical ArUco Marker Detection (Always independent of face tracking)
      if (readyNow && v && faceMode === 'AUTO') {
        if (frameCount % 2 === 0 || liveMarkersRef.current.length === 0) {
          const diag = detectArucoMarkersDetailed(v, calibrationSettings);
          if (diag.markers.length > 0) {
            liveMarkersRef.current = diag.markers;
            decayCountRef.current = 0;
          } else {
            decayCountRef.current++;
            if (decayCountRef.current >= 2) {
              liveMarkersRef.current = EMPTY_MARKERS;
            }
          }
          const nextMarkers = liveMarkersRef.current;
          setLiveMarkers((prev) => (prev === nextMarkers ? prev : nextMarkers));
          setFrameDiag(diag);
        }
      } else if (!readyNow) {
        if (liveMarkersRef.current.length > 0) {
          liveMarkersRef.current = EMPTY_MARKERS;
          setLiveMarkers((prev) => (prev.length > 0 ? EMPTY_MARKERS : prev));
          setFrameDiag((prev) => (prev !== null ? null : prev));
        }
      }

      // 3. Draw Real Decoded ArUco Quadrilaterals & IDs Immediately (aligned via viewportTransform in both Fit and Fill)
      if (mode === 'WEBCAM' && readyNow && viewportTransform && liveMarkersRef.current.length > 0) {
        for (const marker of liveMarkersRef.current) {
          const mappedCorners = mapVideoCornersToCanvas(marker.corners, viewportTransform);
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
            ctx.arc(
              mappedCorners[ci].x,
              mappedCorners[ci].y,
              ci === 0 ? 4.5 : 3.2,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }

          const minY = Math.min(
            mappedCorners[0].y,
            mappedCorners[1].y,
            mappedCorners[2].y,
            mappedCorners[3].y
          );
          const minX = Math.min(
            mappedCorners[0].x,
            mappedCorners[1].x,
            mappedCorners[2].x,
            mappedCorners[3].x
          );
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
      } else if (mode === 'WEBCAM' && readyNow && v && viewportTransform) {
        if (frameCount % 2 === 0) {
          const mpOut = mpControllerRef.current.detectVideoFrame(v, time);
          lastProcessedFaceFrameTimeRef.current = time;
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
            setAutoFaceRollDeg(0);
            if (time - lastAutoSuccessTimeRef.current >= 3000) {
              setAutoFailedFor3Sec(true);
            }
          }
        }

        // Enforce 500 ms freshness before drawing auto landmarks
        const isFreshFrame =
          lastProcessedFaceFrameTimeRef.current !== null &&
          time - lastProcessedFaceFrameTimeRef.current <= FACE_DETECTION_FRESHNESS_TIMEOUT_MS;

        if (isFreshFrame && autoLandmarksRef.current.length >= 468) {
          drawAutoFaceLandmarksOnCanvas(
            ctx,
            autoLandmarksRef.current,
            v.videoWidth || 1280,
            v.videoHeight || 720,
            viewportTransform
          );
        }
      } else {
        // Camera is stopped/off, video is paused/ended, or mode is not WEBCAM -> guarantee cleared state
        if (autoLandmarksRef.current.length > 0 || lastValidAutoLandmarksRef.current.length > 0) {
          autoLandmarksRef.current = [];
          lastValidAutoLandmarksRef.current = [];
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    mode,
    cameraPoweredOn,
    cameraActive,
    faceMode,
    hasFrozenFrame,
    manualPoints,
    activeDragKey,
    hoverNormPt,
    cameraFacing,
    calibrationSettings,
    layoutState.videoFitMode,
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

  const cand =
    cameraActive && cameraPoweredOn && frameDiag
      ? frameDiag.candidateSummary
      : {
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

  const oneLineCollapsedSummary = formatCollapsedScannerSummary({
    faceMode,
    autoDetected: effectiveAutoDetected,
    manualPlacedCount,
    maxillaCount: maxillaDetectedCount,
    mandibleCount: mandibleDetectedCount,
  });

  // Shared Face Panel JSX
  const renderFacePanelContent = () => (
    <FaceLandmarkPanel
      faceMode={faceMode}
      onChangeFaceMode={handleSwitchFaceMode}
      modelState={mpModelState}
      onRetryModelLoad={() => mpControllerRef.current.initialize()}
      autoDetected={effectiveAutoDetected}
      autoRollDeg={effectiveAutoRollDeg}
      autoFailedFor3Sec={autoFailedFor3Sec}
      hasAutoLandmarksAvailable={hasAutoLandmarksAvailable}
      manualPoints={manualPoints}
      onUndoManualPoint={handleUndoManualPoint}
      onResetManualPoints={handleResetManualPoints}
      onCopyAutoPointsToManual={handleCopyAutoPointsToManual}
      canvasAspectRatio={canvasAspect}
    />
  );

  // Shared Marker Panel JSX (keeps all current information & wording + consistent candidate count wording)
  const renderMarkerPanelContent = () => (
    <div className="bg-slate-950/92 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-xs font-mono shadow-lg space-y-2">
      <div className="grid grid-cols-1 gap-2">
        {/* Maxillary Group (IDs 3, 4, 5, 6) */}
        <div className="px-2.5 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-100 flex items-center justify-between gap-2">
          <div>
            <span className="font-bold text-cyan-400 block">MAXILLARY RIM (IDs 3–6)</span>
            <span className="text-[11px]">
              Detected IDs: [{maxillaDetectedIds.join(', ')}] · Missing: [
              {maxillaMissingIds.join(', ')}]
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
              Detected IDs: [{mandibleDetectedIds.join(', ')}] · Missing: [
              {mandibleMissingIds.join(', ')}]
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 font-bold text-xs shrink-0">
            Count {mandibleDetectedCount}/4
          </span>
        </div>
      </div>

      {/* Live Distance & Scale Source Status Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap px-2 py-1 rounded bg-slate-900/80 border border-slate-800 text-[10px]">
        <span className="text-slate-300">
          {liveDistanceInfo.markerDistanceAvailable ? (
            <>
              Distance:{' '}
              <span className="text-emerald-300 font-bold">
                {liveDistanceInfo.distanceCm} ± {liveDistanceInfo.uncertaintyCm} cm
              </span>
            </>
          ) : (
            <span className={ipdStatus.isAssumed ? 'text-amber-300' : 'text-emerald-300'}>
              {ipdStatus.text}
            </span>
          )}
        </span>
        <span className="text-cyan-300 font-bold">{liveDistanceInfo.scaleSourceLabel}</span>
      </div>

      {/* Factual Status Line + Capture Action */}
      <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
        <div className="text-slate-300">
          {effectiveMarkers.length > 0 ? (
            <span className="text-emerald-400 font-bold">
              MARKERS DETECTED: [{detectedIds.map((id) => `#${id}`).join(', ')}]
              {arucoPipelineDiag.qualityWarnings.length > 0 && (
                <span className="text-amber-300 font-normal ml-2">
                  (Note: {arucoPipelineDiag.qualityWarnings[0]})
                </span>
              )}
            </span>
          ) : (
            <span className="text-amber-300">{formatCandidateRejectionSummary(cand)}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleTriggerShutter}
            disabled={!opticalDiagnostic.engineeringTestAllowed}
            className={`flex-1 px-3 py-1.5 rounded-lg font-sans font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
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
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-sans font-semibold text-xs flex items-center gap-1 cursor-pointer"
          >
            <span>Records</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  // Draggable Floating Panel Wrapper (used when layoutState.floatPanels === true)
  const renderFloatingWindow = (
    panelKey: 'facePanel' | 'markerPanel',
    title: string,
    content: React.ReactNode
  ) => {
    const cfg = layoutState[panelKey];
    if (cfg.closed) return null;

    return (
      <div
        key={panelKey}
        style={{
          left: `${cfg.x}px`,
          top: `${cfg.y}px`,
          width: `${Math.min(cfg.width, 380)}px`,
          opacity: cfg.opacityPct / 100,
        }}
        className="absolute z-30 bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl overflow-hidden pointer-events-auto"
      >
        {/* Draggable Header Handle */}
        <div
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button,input')) return;
            setDraggingPanel({
              panel: panelKey,
              startX: e.clientX,
              startY: e.clientY,
              origX: cfg.x,
              origY: cfg.y,
            });
          }}
          className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 cursor-move touch-none select-none"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-200">
            <Move className="w-3.5 h-3.5 text-cyan-400" />
            <span>{title}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Opacity Slider (30-100%) */}
            <input
              type="range"
              min="30"
              max="100"
              step="5"
              value={cfg.opacityPct}
              title={`Panel opacity: ${cfg.opacityPct}%`}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLayoutState((prev) => ({
                  ...prev,
                  [panelKey]: { ...prev[panelKey], opacityPct: val },
                }));
              }}
              className="w-14 accent-cyan-500 cursor-pointer"
            />
            {/* Minimise Button */}
            <button
              onClick={() =>
                setLayoutState((prev) => ({
                  ...prev,
                  [panelKey]: { ...prev[panelKey], minimised: !prev[panelKey].minimised },
                }))
              }
              title={cfg.minimised ? 'Expand panel' : 'Minimise panel'}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            {/* Close Button */}
            <button
              onClick={() =>
                setLayoutState((prev) => ({
                  ...prev,
                  [panelKey]: { ...prev[panelKey], closed: true },
                }))
              }
              title="Close panel"
              className="p-1 rounded hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!cfg.minimised && <div className="p-1.5">{content}</div>}
      </div>
    );
  };

  return (
    <div
      ref={rootStageRef}
      className="relative w-full h-[calc(100dvh-56px)] bg-slate-950 flex flex-col lg:flex-row overflow-hidden select-none"
    >
      {/* Hidden video element for live camera stream — onPause and onEnded immediately clear face/marker state */}
      <video
        ref={videoRef}
        className="hidden"
        autoPlay
        playsInline
        muted
        onPause={() => {
          setIsWebcamReady(false);
          clearAutoFaceTrackingState(true);
        }}
        onEnded={() => {
          setIsWebcamReady(false);
          setCameraActive(false);
          clearAutoFaceTrackingState(true);
        }}
      />

      {/* Left / Top: Main Video Viewfinder Stage (never covered by default) */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-slate-950"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={() => setHoverNormPt(null)}
          className={`w-full h-full ${
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

        {/* Top Bar: Camera Controls + Fit/Fill + Float/Hide/Reset Layout + Self-Check + Calibration */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto z-20 flex-wrap">
          {/* Left: Camera Stream Controls, Fit/Fill Toggle & Active Resolution */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {mode === 'WEBCAM' && (
              <>
                <button
                  onClick={() => {
                    setCameraPoweredOn((prev) => {
                      const next = !prev;
                      if (!next) {
                        clearAutoFaceTrackingState(true);
                      }
                      return next;
                    });
                  }}
                  className={`min-h-[34px] px-2.5 py-1 rounded-xl border backdrop-blur-md transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold ${
                    cameraPoweredOn
                      ? 'bg-slate-900/90 border-slate-700 text-emerald-300 hover:bg-slate-800'
                      : 'bg-rose-950/90 border-rose-700 text-rose-200 hover:bg-rose-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{cameraPoweredOn ? 'Cam ON' : 'Cam OFF'}</span>
                </button>

                <button
                  onClick={() =>
                    setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'))
                  }
                  className="min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  title="Switch Front / Rear Camera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {cameraFacing === 'user' ? 'Front' : 'Rear'}
                  </span>
                </button>

                {/* Fit video / Fill video Toggle (Default: Fit so whole 1280x720 frame is visible) */}
                <button
                  onClick={() =>
                    setLayoutState((prev) => ({
                      ...prev,
                      videoFitMode: prev.videoFitMode === 'FIT' ? 'FILL' : 'FIT',
                    }))
                  }
                  className="min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-cyan-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                  title="Toggle Fit video (full frame, no cropping) vs Fill video"
                >
                  {layoutState.videoFitMode === 'FIT' ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                  <span>{layoutState.videoFitMode === 'FIT' ? 'Fit video' : 'Fill video'}</span>
                </button>

                {videoDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="h-8 px-2 py-1 bg-slate-900/90 text-slate-200 border border-slate-700 text-xs rounded-xl cursor-pointer max-w-[130px] truncate"
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
                    className="min-h-[34px] px-2.5 py-1 rounded-xl bg-cyan-950/90 border border-cyan-600/60 text-cyan-200 hover:bg-cyan-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Freeze a fresh video frame for manual landmarks"
                  >
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>Refreeze</span>
                  </button>
                )}
              </>
            )}

            {actualResolution && mode === 'WEBCAM' && cameraPoweredOn && (
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

          {/* Right: Layout Controls (Float panels / Hide panels (H) / Reset layout) + Self-Check + Calibration */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() =>
                setLayoutState((prev) => ({
                  ...prev,
                  floatPanels: !prev.floatPanels,
                  hidePanels: false,
                  facePanel: { ...prev.facePanel, closed: false },
                  markerPanel: { ...prev.markerPanel, closed: false },
                }))
              }
              className={`min-h-[34px] px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                layoutState.floatPanels
                  ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200 font-bold'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Toggle floating draggable panels"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Float panels</span>
            </button>

            <button
              onClick={() =>
                setLayoutState((prev) => ({ ...prev, hidePanels: !prev.hidePanels }))
              }
              className={`min-h-[34px] px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                layoutState.hidePanels
                  ? 'bg-amber-950/90 border-amber-500 text-amber-200 font-bold'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Hide panels (Keyboard shortcut: H)"
            >
              {layoutState.hidePanels ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              <span>{layoutState.hidePanels ? 'Show panels (H)' : 'Hide panels (H)'}</span>
            </button>

            {(layoutState.floatPanels ||
              layoutState.hidePanels ||
              layoutState.videoFitMode !== 'FIT') && (
              <button
                onClick={() => setLayoutState(resetScannerLayoutState())}
                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Reset panel positions and layout to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset layout</span>
              </button>
            )}

            <button
              onClick={() => setIsSelfCheckOpen(true)}
              className="min-h-[34px] px-2.5 py-1 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Self-Check</span>
            </button>

            <button
              onClick={onOpenCalibration}
              className="min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Camera Calibration & Optical Intrinsics"
            >
              <Settings2 className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Calibration</span>
            </button>

            {onOpenManual && (
              <button
                onClick={onOpenManual}
                className="min-h-[34px] px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Help & Clinical Documentation"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setIsAdvancedOpen((v) => !v)}
                className="min-h-[34px] px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Advanced Options"
              >
                <Sliders className="w-3.5 h-3.5" />
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

        {/* Requirement 4: In Manual landmark mode, keep "Next (n/9): <point name>" as a small chip near the TOP of the video */}
        {faceMode === 'MANUAL' && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-cyan-500/60 shadow-lg font-mono text-xs">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {nextManualDef ? (
              <span className="text-cyan-200 font-bold">
                Next ({nextManualDef.order}/9): {nextManualDef.label}
              </span>
            ) : (
              <span className="text-emerald-300 font-bold">All 9/9 landmarks placed</span>
            )}
            <button
              onClick={handleUndoManualPoint}
              disabled={manualPlacedCount === 0}
              className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold disabled:opacity-40 cursor-pointer"
            >
              Undo
            </button>
            <button
              onClick={() => handleSwitchFaceMode('AUTO')}
              className="px-2 py-0.5 rounded-full bg-teal-700 hover:bg-teal-600 text-white text-[10px] font-bold cursor-pointer"
            >
              AUTO
            </button>
          </div>
        )}

        {/* Requirement 3: When "Hide panels" (H) is active, show only a small status chip */}
        {layoutState.hidePanels && (
          <div className="absolute bottom-3 left-3 z-25 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-slate-700 shadow-lg font-mono text-xs text-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                effectiveFaceReady && hasAnyOpticalMarkers ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="font-bold">{oneLineCollapsedSummary}</span>
            <button
              onClick={() => setLayoutState((prev) => ({ ...prev, hidePanels: false }))}
              className="ml-1 px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold cursor-pointer"
            >
              Show (H)
            </button>
          </div>
        )}

        {/* Camera Paused / Permission Denied Overlay (only when in AUTO mode without frozen frame) */}
        {mode === 'WEBCAM' &&
          faceMode === 'AUTO' &&
          (!cameraPoweredOn || cameraPermissionError) && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-15">
              <div className="p-4 rounded-2xl border mb-3 bg-slate-900 border-slate-800 text-teal-400">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {cameraPermissionError ? 'Camera Access Required' : 'Camera Feed Paused'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                {cameraPermissionError ||
                  'Start the camera feed or switch to Manual landmark mode.'}
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
      </div>

      {/* Requirement 1a: Desktop / wide screens (>= 1024 px): fixed 360 px (340-380 px) right side panel, scrollable */}
      {!layoutState.hidePanels && !layoutState.floatPanels && (
        <aside className="hidden lg:flex lg:flex-col w-[360px] shrink-0 h-full bg-slate-950 border-l border-slate-800 p-3 overflow-y-auto gap-3 z-20">
          {renderFacePanelContent()}
          {renderMarkerPanelContent()}
        </aside>
      )}

      {/* Requirement 1b: Phones / narrow screens (< 1024 px): bottom sheet with drag handle & 1-line collapsed summary */}
      {!layoutState.hidePanels && !layoutState.floatPanels && (
        <div className="lg:hidden w-full bg-slate-950 border-t border-slate-800 z-20 shrink-0">
          {/* Drag Handle & One-Line Summary Bar (Tap or drag to expand/collapse) */}
          <div
            onClick={() =>
              setLayoutState((prev) => ({
                ...prev,
                mobileSheetExpanded: !prev.mobileSheetExpanded,
              }))
            }
            onPointerDown={(e) => {
              sheetDragStartYRef.current = e.clientY;
            }}
            onPointerUp={(e) => {
              if (sheetDragStartYRef.current !== null) {
                const dy = e.clientY - sheetDragStartYRef.current;
                if (dy < -20) {
                  setLayoutState((prev) => ({ ...prev, mobileSheetExpanded: true }));
                } else if (dy > 20) {
                  setLayoutState((prev) => ({ ...prev, mobileSheetExpanded: false }));
                }
                sheetDragStartYRef.current = null;
              }
            }}
            className="px-3 py-2 flex flex-col items-center justify-center cursor-pointer select-none touch-none hover:bg-slate-900/80"
          >
            <div className="w-10 h-1 rounded-full bg-slate-700 mb-1.5" />
            <div className="w-full flex items-center justify-between gap-2 font-mono text-xs">
              <span className="font-bold text-slate-200 truncate">{oneLineCollapsedSummary}</span>
              <span className="text-cyan-400 flex items-center gap-1 text-[11px] shrink-0">
                <span>{layoutState.mobileSheetExpanded ? 'Collapse' : 'Expand'}</span>
                {layoutState.mobileSheetExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </span>
            </div>
          </div>

          {layoutState.mobileSheetExpanded && (
            <div className="px-3 pb-3 pt-1 max-h-[52dvh] overflow-y-auto space-y-2.5 border-t border-slate-800/80">
              {renderFacePanelContent()}
              {renderMarkerPanelContent()}
            </div>
          )}
        </div>
      )}

      {/* Requirement 2: Floating Panels Mode (Draggable by header handle, clamped to viewport, Minimise/Close/Opacity) */}
      {!layoutState.hidePanels && layoutState.floatPanels && (
        <>
          {renderFloatingWindow('facePanel', 'Face Tracking & Landmarks', renderFacePanelContent())}
          {renderFloatingWindow(
            'markerPanel',
            'Dental-Rim ArUco Markers',
            renderMarkerPanelContent()
          )}
        </>
      )}

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
          currentAutoFaceDetected: effectiveAutoDetected,
          currentAutoFaceRollDeg: effectiveAutoRollDeg,
          currentMarkerCount: effectiveMarkers.length,
        }}
      />
    </div>
  );
};
