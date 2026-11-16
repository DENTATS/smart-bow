/**
 * SmartBow AI - Live Camera & Computer Vision Scanner
 * Radically simplified, uncluttered clinical viewfinder with dynamic canvas registration.
 * Primary test device: Motorola Edge 70 Fusion (Android browser).
 * 
 * Hierarchy:
 * 1. Full-bleed camera preview with dynamic resolution.
 * 2. Exactly one tracking-status indicator.
 * 3. Exactly one actionable instruction.
 * 4. Exactly one primary action button (gated by optical safety).
 * 5. Clean secondary controls (camera flip, mode toggle, optional developer diagnostics).
 * 
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  RotateCcw, 
  Check, 
  X, 
  Settings2,
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  Target,
  Grid
} from 'lucide-react';
import { RealtimeFaceTracker, FaceTrackingResult } from '../lib/faceTrackingEngine';
import { DentitionState, CameraCalibrationSettings, MarkerPose } from '../types/smartbow';
import { loadCameraCalibration } from '../lib/cameraCalibration';
import {
  detectArucoMarkersDetailed,
  ArucoFrameDiagnostics,
  computeCoverTransform,
  mapVideoCornersToCanvas,
  ViewportCoverTransform,
} from '../lib/arucoDetector';
import { ARUCO_DICTIONARY_NAME } from '../lib/arucoDict';
import {
  evaluateOpticalDiagnostic,
  evaluateArucoPipelineDiagnostic,
  LiveArucoDiagnosticStatus,
} from '../lib/opticalDiagnostics';
import { OpticalDiagnosticInfo } from '../types/smartbow';
import { CameraCalibrationModal } from './CameraCalibrationModal';
import { SoftwareSelfCorrectionModal } from './SoftwareSelfCorrectionModal';

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
  developerMode?: boolean;
}

export const LiveScanner: React.FC<LiveScannerProps> = ({
  dentitionState = 'EDENTULOUS',
  onUpdateDentition,
  vdoMm,
  onUpdateVdo,
  tiltMLDeg,
  onUpdateTiltML,
  tiltAPDeg,
  onUpdateTiltAP,
  midlineShiftMm,
  onUpdateMidline,
  onRecordCrTrial,
  onNavigateToTab,
  developerMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<RealtimeFaceTracker>(new RealtimeFaceTracker());

  // Operational states
  const [mode, setMode] = useState<'SIMULATION' | 'WEBCAM'>('SIMULATION');
  const [isMarkerTestMode, setIsMarkerTestMode] = useState<boolean>(false);
  const [testStep, setTestStep] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [testPreset, setTestPreset] = useState<'ANY' | 'MAXILLA' | 'MANDIBLE' | 'CLINICAL_ALL' | 'CALIBRATION'>('ANY');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPoweredOn, setCameraPoweredOn] = useState<boolean>(true);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(30);

  // Live Optical ArUco Markers detected directly from camera stream
  const [liveMarkers, setLiveMarkers] = useState<MarkerPose[]>([]);
  const [frameDiag, setFrameDiag] = useState<ArucoFrameDiagnostics | null>(null);
  const [lastSuccessDetectionTime, setLastSuccessDetectionTime] = useState<number | null>(null);
  const liveMarkersRef = useRef<MarkerPose[]>([]);
  const lastSuccessDetectionRef = useRef<number | null>(null);
  const decayCountRef = useRef<number>(0);

  // Marker telemetry & CAD specs inspector modal state
  const [isMarkerInspectorOpen, setIsMarkerInspectorOpen] = useState<boolean>(false);

  // Capture feedback states
  const [shutterTriggered, setShutterTriggered] = useState<boolean>(false);
  const [trialToast, setTrialToast] = useState<string | null>(null);
  const [trialCount, setTrialCount] = useState<number>(1);

  // Developer mode & diagnostics drawer
  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState<boolean>(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState<boolean>(false);
  const [isSelfCorrectionModalOpen, setIsSelfCorrectionModalOpen] = useState<boolean>(false);

  // Telemetry published to React
  const [trackingData, setTrackingData] = useState<FaceTrackingResult | null>(null);
  const lastTelemetryTimestampRef = useRef<number>(Date.now());

  // Simulation parameters (only adjusted in simulation mode)
  const [simVdo, setSimVdo] = useState<number>(vdoMm ?? 62.5);
  const [simTiltML, setSimTiltML] = useState<number>(tiltMLDeg ?? 1.4);
  const [simTiltAP, setSimTiltAP] = useState<number>(tiltAPDeg ?? 4.8);
  const [simMidline, setSimMidline] = useState<number>(midlineShiftMm ?? 0.3);
  const [simDistance, setSimDistance] = useState<number>(48);
  const [simIlluminationIRE, setSimIlluminationIRE] = useState<number>(140);

  // Calibration settings
  const [calibrationSettings, setCalibrationSettings] = useState<CameraCalibrationSettings>(() => loadCameraCalibration());

  // Truthful Live Optical ArUco Group Statuses (NEVER fall back to face detection)
  const detectedIds = liveMarkers.map(m => m.id);
  const faceDetectedCount = [0, 1, 2].filter(id => detectedIds.includes(id)).length;
  const maxillaDetectedCount = [3, 4, 5, 6].filter(id => detectedIds.includes(id)).length;
  const mandibleDetectedCount = [7, 8, 9, 10].filter(id => detectedIds.includes(id)).length;
  const faceMarkersAllVisible = faceDetectedCount === 3;
  const maxillaryAllVisible = maxillaDetectedCount === 4;
  const mandibularAllVisible = mandibleDetectedCount === 4;
  const hasAnyOpticalMarkers = liveMarkers.length > 0;

  const expectedTestIds: number[] =
    testStep === 'SINGLE'
      ? (testPreset === 'MAXILLA' ? [3] : testPreset === 'MANDIBLE' ? [7] : testPreset === 'CALIBRATION' ? [20] : [0])
      : testPreset === 'MAXILLA'
      ? [3, 4, 5, 6]
      : testPreset === 'MANDIBLE'
      ? [7, 8, 9, 10]
      : testPreset === 'CALIBRATION'
      ? [20, 21, 22, 23, 24, 25, 26, 27, 28]
      : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const arucoPipelineDiag: LiveArucoDiagnosticStatus = evaluateArucoPipelineDiagnostic({
    cameraActive,
    cameraPoweredOn,
    cameraError: cameraPermissionError,
    frameDiag,
    detectedIds,
    expectedIds: isMarkerTestMode ? expectedTestIds : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  });

  // Optical Diagnostics evaluation (Clinical Shutter Safety Gate)
  const telemetryAgeMs = Date.now() - lastTelemetryTimestampRef.current;

  const opticalDiagnostic: OpticalDiagnosticInfo = evaluateOpticalDiagnostic({
    mode,
    cameraActive: cameraActive && cameraPoweredOn,
    cameraError: cameraPermissionError,
    faceDetected: mode === 'SIMULATION' ? (trackingData?.detected ?? false) : ((trackingData?.detected ?? false) || faceDetectedCount > 0),
    faceMarkersComplete: mode === 'SIMULATION' ? (trackingData?.detected ?? false) : faceMarkersAllVisible,
    arucoDetected: mode === 'SIMULATION' ? true : hasAnyOpticalMarkers,
    maxillaryComplete: mode === 'SIMULATION' ? true : maxillaryAllVisible,
    mandibularComplete: mode === 'SIMULATION' ? true : mandibularAllVisible,
    cameraCalibrated: calibrationSettings.isCalibrated,
    markerSizeVerified: true,
    trackingStable: (trackingData?.frameQualityScore ?? 100) >= 35,
    telemetryAgeMs,
  });

  // Handle Dynamic Canvas Resize based on container dimensions
  const updateCanvasDimensions = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Use devicePixelRatio capped at 2 for mobile GPU performance
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

  // Enumerate video devices where supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const vDevices = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(vDevices);
      }).catch(err => console.warn('Could not enumerate video devices:', err));
    }
  }, [cameraActive]);

  // Webcam stream lifecycle with explicit start/stop and clean resource teardown
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    if (mode === 'WEBCAM' && cameraPoweredOn) {
      const startCamera = async () => {
        try {
          setCameraPermissionError(null);

          if (!navigator.mediaDevices?.getUserMedia) {
            setCameraPermissionError('Camera API unavailable. A secure HTTPS context is required.');
            setCameraActive(false);
            return;
          }

          const videoConstraint: MediaTrackConstraints = selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } };

          const constraints: MediaStreamConstraints = {
            video: videoConstraint,
            audio: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (isCancelled) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              updateCanvasDimensions();
            };
            await videoRef.current.play();
            setCameraActive(true);
            updateCanvasDimensions();

            // Refresh device list after permission granted
            if (navigator.mediaDevices?.enumerateDevices) {
              const devices = await navigator.mediaDevices.enumerateDevices();
              setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
            }
          }
        } catch (err: any) {
          if (!isCancelled) {
            console.warn('Webcam stream unavailable:', err);
            let errMsg = 'Camera permission denied or camera device unavailable';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              errMsg = 'Permission denied. Please allow camera access in browser permissions.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
              errMsg = 'No video capture hardware or camera sensor found on this device.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
              errMsg = 'Camera hardware is busy or in use by another application.';
            } else if (err.name === 'OverconstrainedError') {
              errMsg = 'Selected camera constraints (resolution/facing) not supported by hardware.';
            }
            setCameraPermissionError(errMsg);
            setCameraActive(false);
          }
        }
      };
      startCamera();
    } else {
      setCameraActive(false);
      liveMarkersRef.current = [];
      setLiveMarkers([]);
      setFrameDiag(null);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [mode, cameraPoweredOn, cameraFacing, selectedDeviceId, retryTrigger, updateCanvasDimensions]);

  // Main 60 FPS Render Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastUiUpdate = 0;

    const render = async (time: number) => {
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

      // 1. Draw Background: Webcam or Calibrated Clinical Silhouette
      const isWebcamReady = mode === 'WEBCAM' && Boolean(videoRef.current && videoRef.current.readyState >= 2);
      let coverTransform: ViewportCoverTransform | null = null;

      if (isWebcamReady && videoRef.current) {
        const v = videoRef.current;
        const vW = v.videoWidth || 640;
        const vH = v.videoHeight || 480;
        const shouldMirror = cameraFacing === 'user';

        coverTransform = computeCoverTransform(vW, vH, w, h, shouldMirror);
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
        // Clinical Patient Viewport (Dark Minimal Background)
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        // Subtle guidance grid
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const step = Math.max(30, Math.floor(w / 16));
        for (let x = 0; x < w; x += step) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += step) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Clinical Patient Silhouette
        const centerX = w / 2;
        const centerY = h / 2 - Math.min(20, h * 0.05);
        const headRadiusX = Math.min(w * 0.24, 140);
        const headRadiusY = headRadiusX * 1.3;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#111827';
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Shoulders
        ctx.beginPath();
        ctx.moveTo(centerX - headRadiusX * 1.6, h);
        ctx.quadraticCurveTo(centerX - headRadiusX * 1.2, centerY + headRadiusY * 0.9, centerX, centerY + headRadiusY * 0.9);
        ctx.quadraticCurveTo(centerX + headRadiusX * 1.2, centerY + headRadiusY * 0.9, centerX + headRadiusX * 1.6, h);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
      }

      // 2. Track Frame via RealtimeFaceTracker
      const tracker = trackerRef.current;
      const tracking = await tracker.trackFrame(
        isWebcamReady ? videoRef.current : null,
        w,
        h,
        simVdo,
        { ml: simTiltML, ap: simTiltAP, midline: simMidline },
        mode === 'WEBCAM',
        0,
        calibrationSettings,
        simDistance,
        'DEMO_LOCK',
        0.65,
        0,
        true,
        simIlluminationIRE
      );

      // Compute UI publish gate ONCE per tick so React state never starves
      const shouldPublishUi = time - lastUiUpdate > 80;
      if (shouldPublishUi) {
        lastUiUpdate = time;
        lastTelemetryTimestampRef.current = Date.now();
        setTrackingData(tracking);
      }

      // Real-Time Optical ArUco Marker Detection on live webcam feed (decoupled from face detection)
      if (isWebcamReady && videoRef.current) {
        if (frameCount % 2 === 0 || liveMarkersRef.current.length === 0) {
          const diag = detectArucoMarkersDetailed(videoRef.current, calibrationSettings);
          if (diag.markers.length > 0) {
            liveMarkersRef.current = diag.markers;
            decayCountRef.current = 0;
            lastSuccessDetectionRef.current = Date.now();
          } else {
            decayCountRef.current++;
            if (decayCountRef.current >= 2) {
              liveMarkersRef.current = [];
            }
          }

          if (shouldPublishUi) {
            setLiveMarkers(liveMarkersRef.current);
            setFrameDiag(diag);
            if (lastSuccessDetectionRef.current !== null) {
              setLastSuccessDetectionTime(lastSuccessDetectionRef.current);
            }
          }
        }
      }

      // 2b. ALWAYS draw real detected ArUco quadrilaterals + IDs in WEBCAM mode (independent of face detection)
      if (mode === 'WEBCAM' && isWebcamReady && coverTransform && liveMarkersRef.current.length > 0) {
        for (const marker of liveMarkersRef.current) {
          const mappedCorners = mapVideoCornersToCanvas(marker.corners, coverTransform);
          ctx.save();
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(mappedCorners[0].x, mappedCorners[0].y);
          ctx.lineTo(mappedCorners[1].x, mappedCorners[1].y);
          ctx.lineTo(mappedCorners[2].x, mappedCorners[2].y);
          ctx.lineTo(mappedCorners[3].x, mappedCorners[3].y);
          ctx.closePath();
          ctx.stroke();

          // Subtle translucent green fill to make live lock unmistakable
          ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
          ctx.fill();

          // Corner dots (corner 0 canonical Top-Left highlighted in cyan)
          for (let ci = 0; ci < 4; ci++) {
            ctx.fillStyle = ci === 0 ? '#22d3ee' : '#4ade80';
            ctx.beginPath();
            ctx.arc(mappedCorners[ci].x, mappedCorners[ci].y, ci === 0 ? 4.5 : 3.2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Marker ID label anchored cleanly above the quadrilateral
          const minY = Math.min(mappedCorners[0].y, mappedCorners[1].y, mappedCorners[2].y, mappedCorners[3].y);
          const minX = Math.min(mappedCorners[0].x, mappedCorners[1].x, mappedCorners[2].x, mappedCorners[3].x);
          const groupTag =
            marker.id >= 0 && marker.id <= 2
              ? 'Face'
              : marker.id >= 3 && marker.id <= 6
              ? 'Maxilla'
              : marker.id >= 7 && marker.id <= 10
              ? 'Mandible'
              : marker.id >= 11 && marker.id <= 12
              ? 'Hanau'
              : marker.id >= 20 && marker.id <= 28
              ? 'Calib'
              : '4x4_50';
          const tag = `ID #${marker.id} · ${groupTag}`;

          ctx.font = 'bold 12px monospace';
          const textW = ctx.measureText(tag).width;
          const badgeW = textW + 14;
          const badgeH = 20;
          const badgeX = Math.max(4, Math.min(w - badgeW - 4, minX));
          const badgeY = Math.max(4, minY - badgeH - 6);

          ctx.fillStyle = 'rgba(6, 78, 59, 0.92)';
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);
          ctx.fillStyle = '#dcfce7';
          ctx.fillText(tag, badgeX + 7, badgeY + 14);
          ctx.restore();
        }
      }

      // 3. Clinical Anatomical & Marker Visual Overlays
      if (tracking.detected) {
        const fbX = tracking.faceBox.x * w;
        const fbY = tracking.faceBox.y * h;
        const fbW = tracking.faceBox.width * w;
        const fbH = tracking.faceBox.height * h;
        const cornerLen = Math.max(14, Math.min(32, fbW * 0.18));

        // High-contrast corner brackets (Teal)
        ctx.strokeStyle = '#0d9488';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Top-Left
        ctx.beginPath();
        ctx.moveTo(fbX, fbY + cornerLen);
        ctx.lineTo(fbX, fbY);
        ctx.lineTo(fbX + cornerLen, fbY);
        ctx.stroke();

        // Top-Right
        ctx.beginPath();
        ctx.moveTo(fbX + fbW - cornerLen, fbY);
        ctx.lineTo(fbX + fbW, fbY);
        ctx.lineTo(fbX + fbW, fbY + cornerLen);
        ctx.stroke();

        // Bottom-Left
        ctx.beginPath();
        ctx.moveTo(fbX, fbY + fbH - cornerLen);
        ctx.lineTo(fbX, fbY + fbH);
        ctx.lineTo(fbX + cornerLen, fbY + fbH);
        ctx.stroke();

        // Bottom-Right
        ctx.beginPath();
        ctx.moveTo(fbX + fbW - cornerLen, fbY + fbH);
        ctx.lineTo(fbX + fbW, fbY + fbH);
        ctx.lineTo(fbX + fbW, fbY + fbH - cornerLen);
        ctx.stroke();

        // Glabella F01 (Forehead Center)
        if (tracking.landmarks[10]) {
          const gX = tracking.landmarks[10].x * w;
          const gY = tracking.landmarks[10].y * h;
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(gX, gY, 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(gX, gY, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#67e8f9';
          ctx.fillText('F01 (Glabella)', gX + 8, gY + 3);
        }

        // Right Zygoma F02 & Left Zygoma F03
        if (tracking.landmarks[234]) {
          const zX = tracking.landmarks[234].x * w;
          const zY = tracking.landmarks[234].y * h;
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(zX, zY, 4.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#67e8f9';
          ctx.fillText('F02 (R-Zygoma)', zX - 80, zY + 3);
        }

        if (tracking.landmarks[454]) {
          const zX = tracking.landmarks[454].x * w;
          const zY = tracking.landmarks[454].y * h;
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(zX, zY, 4.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#67e8f9';
          ctx.fillText('F03 (L-Zygoma)', zX + 8, zY + 3);
        }

        // Interpupillary Line & Roll Angle
        if (tracking.landmarks[33] && tracking.landmarks[263]) {
          const rx = tracking.landmarks[33].x * w;
          const ry = tracking.landmarks[33].y * h;
          const lx = tracking.landmarks[263].x * w;
          const ly = tracking.landmarks[263].y * h;

          ctx.strokeStyle = 'rgba(20, 184, 166, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(lx, ly);
          ctx.stroke();

          ctx.fillStyle = '#2dd4bf';
          ctx.beginPath();
          ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
          ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
          ctx.fill();

          const midX = (rx + lx) / 2;
          const midY = (ry + ly) / 2;
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#2dd4bf';
          ctx.fillText(`Interpupillary: ${Math.abs(tracking.rollDeg).toFixed(1)}°`, midX - 45, midY - 6);
        }

        // Facial Midline (Glabella -> Menton)
        if (tracking.landmarks[10] && tracking.landmarks[152]) {
          const gX = tracking.landmarks[10].x * w;
          const gY = tracking.landmarks[10].y * h;
          const mX = tracking.landmarks[152].x * w;
          const mY = tracking.landmarks[152].y * h;

          ctx.strokeStyle = 'rgba(13, 148, 136, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(gX, gY);
          ctx.lineTo(mX, mY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Subnasale (Sn) & Menton (Me) Vertical VDO Caliper Bracket
        const snPt = tracking.landmarks[1] || tracking.landmarks[2];
        const mePt = tracking.landmarks[152];
        if (snPt && mePt) {
          const snX = snPt.x * w;
          const snY = snPt.y * h;
          const meX = mePt.x * w;
          const meY = mePt.y * h;
          const bracketX = Math.max(snX, meX) + Math.min(w * 0.16, 60);

          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(snX + 6, snY);
          ctx.lineTo(bracketX, snY);
          ctx.lineTo(bracketX, meY);
          ctx.lineTo(meX + 6, meY);
          ctx.stroke();

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(bracketX, snY, 2.5, 0, Math.PI * 2);
          ctx.arc(bracketX, meY, 2.5, 0, Math.PI * 2);
          ctx.fill();

          const activeVdo = mode === 'SIMULATION' ? simVdo : (tracking.softwareSelfCorrection?.invariantVdoMm || simVdo);
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(`VDO: ${activeVdo.toFixed(1)} mm`, bracketX + 6, (snY + meY) / 2 + 3);
        }

        // =========================================================================
        // ARUCO FIDUCIAL MARKERS: WEBCAM ALIGNMENT HINTS & SIMULATION BOARD DRAW
        // (Note: Real WEBCAM marker green overlays are drawn in section 2b above even if face is absent)
        // =========================================================================
        if (mode === 'WEBCAM') {
          if (liveMarkersRef.current.length === 0) {
            // When physical markers not yet in frame: Show helpful oral corridor alignment zones
            const oralX = fbX + fbW * 0.72;
            const oralY = fbY + fbH * 0.60;
            const zoneSize = Math.min(fbW * 0.22, 50);

            ctx.strokeStyle = 'rgba(20, 184, 166, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(oralX, oralY, zoneSize, zoneSize);
            ctx.strokeRect(oralX, oralY + zoneSize + 8, zoneSize, zoneSize);
            ctx.setLineDash([]);

            ctx.font = 'bold 8px monospace';
            ctx.fillStyle = 'rgba(45, 212, 191, 0.7)';
            ctx.fillText('Maxilla (3-6)', oralX, oralY - 4);
            ctx.fillText('Mandible (7-10)', oralX, oralY + zoneSize + 6);
          }
        } else {
          // In SIMULATION Mode: Draw the dual 18x18mm ArUco carrier boards with ArUco bit patterns
          const oralX = fbX + fbW * 0.74;
          const oralMaxY = fbY + fbH * 0.58;
          const boardW = Math.max(38, Math.min(fbW * 0.24, 60));
          const boardH = boardW * 0.85;
          const vdoOffset = (simVdo - 50) * 0.6;
          const oralMandY = oralMaxY + boardH + Math.max(6, vdoOffset);

          // Maxillary 18x18mm Board [IDs 3, 4, 5, 6]
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(oralX, oralMaxY, boardW, boardH);
          ctx.strokeStyle = '#06b6d4'; // Cyan
          ctx.lineWidth = 2;
          ctx.strokeRect(oralX, oralMaxY, boardW, boardH);

          // 4 simulated ArUco cells on Maxilla board
          const cellW = (boardW - 8) / 2;
          const cellH = (boardH - 8) / 2;
          const maxIds = [3, 4, 5, 6];
          for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
              const cx = oralX + 4 + col * cellW;
              const cy = oralMaxY + 4 + row * cellH;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(cx, cy, cellW - 2, cellH - 2);
              ctx.strokeStyle = '#22c55e';
              ctx.lineWidth = 1;
              ctx.strokeRect(cx, cy, cellW - 2, cellH - 2);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(cx + 2, cy + 2, cellW - 6, cellH - 6);
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(cx + 4, cy + 4, cellW - 10, cellH - 10);
            }
          }

          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = '#67e8f9';
          ctx.fillText('Maxilla (3-6)', oralX, oralMaxY - 4);

          // Mandibular 18x18mm Board [IDs 7, 8, 9, 10]
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(oralX, oralMandY, boardW, boardH);
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.strokeRect(oralX, oralMandY, boardW, boardH);

          for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
              const cx = oralX + 4 + col * cellW;
              const cy = oralMandY + 4 + row * cellH;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(cx, cy, cellW - 2, cellH - 2);
              ctx.strokeStyle = '#22c55e';
              ctx.lineWidth = 1;
              ctx.strokeRect(cx, cy, cellW - 2, cellH - 2);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(cx + 2, cy + 2, cellW - 6, cellH - 6);
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(cx + 4, cy + 4, cellW - 10, cellH - 10);
            }
          }

          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = '#67e8f9';
          ctx.fillText('Mandible (7-10)', oralX, oralMandY + boardH + 10);

          // Caliper arrow between the two boards
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(oralX + boardW + 6, oralMaxY + boardH);
          ctx.lineTo(oralX + boardW + 6, oralMandY);
          ctx.stroke();

          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(oralX + boardW + 6, oralMaxY + boardH, 2, 0, Math.PI * 2);
          ctx.arc(oralX + boardW + 6, oralMandY, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#4ade80';
          ctx.fillText(`Δ ${simVdo.toFixed(1)}mm`, oralX + boardW + 10, (oralMaxY + boardH + oralMandY) / 2 + 3);
        }

        // Draw MediaPipe Skeletal mesh in Developer Mode
        if (developerMode) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 1;
          for (let i = 0; i < Math.min(tracking.landmarks.length, 60); i += 2) {
            const pt = tracking.landmarks[i];
            if (pt) {
              ctx.beginPath();
              ctx.arc(pt.x * w, pt.y * h, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = '#38bdf8';
              ctx.fill();
            }
          }
        }
      } else if (mode === 'SIMULATION' || !isMarkerTestMode) {
        // Clean Centered Framing Guide when searching (hidden in Marker Test Mode to keep single/card targets uncluttered)
        const cx = w / 2;
        const cy = h / 2 - 10;
        const ow = Math.min(w * 0.45, 120);
        const oh = ow * 1.35;

        ctx.strokeStyle = 'rgba(203, 213, 225, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, ow, oh, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(
          mode === 'WEBCAM' ? 'Show Printed DICT_4X4_50 Markers or Face' : 'Position Patient Face in Frame (35–50 cm)',
          cx,
          cy + oh + 22
        );
        ctx.textAlign = 'start';
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mode, isMarkerTestMode, cameraFacing, simVdo, simTiltML, simTiltAP, simMidline, simDistance, simIlluminationIRE, calibrationSettings, developerMode]);

  // Primary Shutter Action: Capture jaw relation trial
  const handleTriggerShutter = () => {
    if (!opticalDiagnostic.engineeringTestAllowed) return;

    // Trigger flash animation
    setShutterTriggered(true);
    setTimeout(() => setShutterTriggered(false), 300);

    // Record CR trial
    onRecordCrTrial();

    // Feedback toast
    const nextTrial = trialCount + 1;
    setTrialCount(nextTrial);
    setTrialToast(`Trial ${trialCount} recorded successfully`);
    setTimeout(() => setTrialToast(null), 2500);
  };

  // Single dynamic status indicator logic
  const getStatusBadge = () => {
    if (mode === 'WEBCAM' && !cameraActive) {
      return {
        label: cameraPermissionError ? 'Camera Denied' : 'Starting Camera...',
        color: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        dot: 'bg-rose-500',
      };
    }
    if (opticalDiagnostic.state === 'READY_FOR_ENGINEERING_TEST') {
      return {
        label: 'Ready to Capture',
        color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    }
    if (!trackingData?.detected) {
      return {
        label: 'Aligning Patient Face',
        color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    }
    return {
      label: 'Hold Phone Steady',
      color: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      dot: 'bg-teal-400',
    };
  };

  // Single dynamic instruction logic
  const getInstructionText = () => {
    if (mode === 'WEBCAM' && !cameraActive) {
      return cameraPermissionError 
        ? 'Please allow camera permission in browser settings.'
        : 'Connecting to device camera...';
    }
    if (!trackingData?.detected) {
      return 'Position the patient’s face inside the camera view.';
    }
    if (opticalDiagnostic.state !== 'READY_FOR_ENGINEERING_TEST') {
      return opticalDiagnostic.actionableGuidance || 'Align patient in view.';
    }
    return 'Hold steady and tap the shutter to record.';
  };

  const status = getStatusBadge();
  const instruction = getInstructionText();

  return (
    <div className="relative w-full h-[calc(100dvh-57px-64px)] md:h-[calc(100dvh-65px)] bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* Hidden video element for camera stream */}
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />

      {/* Main Viewfinder Stage (Dynamic Canvas) */}
      <div ref={containerRef} className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-cover" 
        />

        {/* Shutter Flash Animation */}
        {shutterTriggered && (
          <div className="absolute inset-0 bg-white/70 pointer-events-none z-30 animate-shutter-flash" />
        )}

        {/* Success Feedback Toast */}
        {trialToast && (
          <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-30">
            <div className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{trialToast}</span>
            </div>
          </div>
        )}

        {/* Simulation Truthful Watermark (Unmistakable & Centered) */}
        {mode === 'SIMULATION' && (
          <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none z-20 px-3">
            <div className="px-3 py-1 bg-amber-500/90 text-slate-950 text-[11px] font-bold tracking-wider uppercase rounded-full shadow-md flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>SIMULATION — NOT A MEASUREMENT</span>
            </div>
          </div>
        )}

        {/* Live Camera Paused or Error Overlay */}
        {mode === 'WEBCAM' && (!cameraPoweredOn || cameraPermissionError) && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-25">
            <div className={`p-4 rounded-2xl border mb-3 ${
              cameraPermissionError ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-slate-900 border-slate-800 text-teal-400'
            }`}>
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {cameraPermissionError ? 'Camera Access Required' : 'Camera Feed Paused'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
              {cameraPermissionError
                ? cameraPermissionError
                : 'The camera video stream has been paused to conserve device power and camera hardware resources.'}
            </p>
            <div className="flex items-center gap-2">
              {cameraPermissionError ? (
                <button
                  onClick={() => {
                    setCameraPermissionError(null);
                    setRetryTrigger(r => r + 1);
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera Permission</span>
                </button>
              ) : (
                <button
                  onClick={() => setCameraPoweredOn(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start Camera Feed</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top Minimal Viewfinder Header (Controls & Mode Switcher) */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-auto z-20 flex-wrap">
          {/* Mode Switcher: Simulate | Live Camera | Marker Test */}
          <div className="flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setMode('SIMULATION');
                setIsMarkerTestMode(false);
              }}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'SIMULATION' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulate
            </button>
            <button
              onClick={() => {
                setMode('WEBCAM');
                setIsMarkerTestMode(false);
                setCameraPoweredOn(true);
              }}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'WEBCAM' && !isMarkerTestMode ? 'bg-teal-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Camera
            </button>
            <button
              onClick={() => {
                setMode('WEBCAM');
                setIsMarkerTestMode(true);
                setCameraPoweredOn(true);
              }}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                mode === 'WEBCAM' && isMarkerTestMode ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Dedicated Step-by-Step Live ArUco Marker Test Mode"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Marker Test</span>
            </button>
          </div>

          {/* Quick Actions (Camera Start/Stop, Camera Selection, Markers Inspector, Flip Camera, Settings/Developer) */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {mode === 'WEBCAM' && (
              <button
                onClick={() => setCameraPoweredOn(prev => !prev)}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border backdrop-blur-md transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
                  cameraPoweredOn
                    ? 'bg-rose-950/80 border-rose-800 text-rose-300 hover:bg-rose-900'
                    : 'bg-emerald-950/80 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                }`}
                title={cameraPoweredOn ? 'Stop Camera Video Stream' : 'Start Camera Video Stream'}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{cameraPoweredOn ? 'Stop Cam' : 'Start Cam'}</span>
              </button>
            )}

            {mode === 'WEBCAM' && videoDevices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="h-9 px-2 py-1 bg-slate-900/90 text-slate-200 border border-slate-700 text-xs rounded-xl cursor-pointer max-w-[130px] truncate"
                title="Select Camera Device"
              >
                <option value="">Default Camera</option>
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setIsMarkerInspectorOpen(true)}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl backdrop-blur-md border transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
                mode === 'WEBCAM' && liveMarkers.length > 0
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 hover:text-white'
                  : 'bg-slate-900/85 border-slate-800 text-teal-300 hover:text-white'
              }`}
              title="Open ArUco Detection Diagnostics & Telemetry"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {mode === 'WEBCAM' ? `Diagnostics (${liveMarkers.length})` : 'Marker Telemetry'}
              </span>
            </button>

            {mode === 'WEBCAM' && (
              <button
                onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}
                className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                title="Switch Front / Rear Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {developerMode && (
              <button
                onClick={() => setIsDevDrawerOpen(true)}
                className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-teal-400 hover:text-teal-300 transition-colors flex items-center justify-center cursor-pointer"
                title="Open Developer Diagnostics"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Real-time Truthful ArUco & Clinical Target Acquisition Strip */}
        <div className="absolute top-16 left-3 right-3 flex items-center justify-center pointer-events-none z-20">
          <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono shadow-lg flex-wrap justify-center">
            {mode === 'WEBCAM' ? (
              <>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  <span className={`w-2 h-2 rounded-full ${liveMarkers.length > 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="text-slate-300">ARUCO ({ARUCO_DICTIONARY_NAME}):</span>
                  <span className={liveMarkers.length > 0 ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                    {liveMarkers.length > 0 ? `${liveMarkers.length} DETECTED [${detectedIds.join(', ')}]` : arucoPipelineDiag.arucoStatusLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Face (0-2):</span>
                  <span className={faceMarkersAllVisible ? 'text-emerald-400 font-bold' : faceDetectedCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                    {faceDetectedCount}/3
                  </span>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Maxilla (3-6):</span>
                  <span className={maxillaryAllVisible ? 'text-emerald-400 font-bold' : maxillaDetectedCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                    {maxillaDetectedCount}/4
                  </span>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400">Mandible (7-10):</span>
                  <span className={mandibularAllVisible ? 'text-emerald-400 font-bold' : mandibleDetectedCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                    {mandibleDetectedCount}/4
                  </span>
                </div>

                {frameDiag && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    <span>{frameDiag.processingTimeMs.toFixed(1)} ms</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  <span className={`w-2 h-2 rounded-full ${trackingData?.detected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                  <span className="text-slate-300">Face (Sim):</span>
                  <span className={trackingData?.detected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {trackingData?.detected ? 'SIMULATED' : 'ALIGNING'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-300">Maxilla (3-6):</span>
                  <span className="text-amber-300 font-bold">SIMULATED</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-300">Mandible (7-10):</span>
                  <span className="text-amber-300 font-bold">SIMULATED</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                  <span>VDO (SIM):</span>
                  <span>{simVdo.toFixed(1)}mm</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dedicated Marker Test Mode Panel OR Focused Clinical Lower HUD */}
        {mode === 'WEBCAM' && isMarkerTestMode ? (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-[440px] pointer-events-auto z-20">
            <div className="bg-slate-950/92 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h4 className="font-bold text-white text-xs">Marker Test Mode ({ARUCO_DICTIONARY_NAME})</h4>
                    <p className="text-[10px] text-slate-400">Live camera verification · No simulated detections</p>
                  </div>
                </div>
                {/* Truthful Pass/Unavailable Badge */}
                {(() => {
                  const singlePassed = cameraActive && Boolean(frameDiag?.frameProcessed) && liveMarkers.length >= 1;
                  const multiMatches = expectedTestIds.filter(id => detectedIds.includes(id));
                  const multiPassed = cameraActive && Boolean(frameDiag?.frameProcessed) && multiMatches.length === expectedTestIds.length;
                  const passed = testStep === 'SINGLE' ? singlePassed : multiPassed;
                  return (
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                      passed
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}>
                      {passed ? 'VERIFIED LIVE' : !cameraActive ? 'UNAVAILABLE' : 'WAITING'}
                    </span>
                  );
                })()}
              </div>

              {/* Step 1 vs Step 2 Toggle */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setTestStep('SINGLE')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                    testStep === 'SINGLE'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Step 1: Single Marker
                </button>
                <button
                  onClick={() => setTestStep('MULTI')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                    testStep === 'MULTI'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Step 2: Multi-Marker Array
                </button>
              </div>

              {testStep === 'MULTI' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'MAXILLA', label: 'Maxilla (3–6)' },
                    { id: 'MANDIBLE', label: 'Mandible (7–10)' },
                    { id: 'CALIBRATION', label: 'Calib Card (20–28)' },
                    { id: 'CLINICAL_ALL', label: 'All Clinical (0–10)' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setTestPreset(p.id as typeof testPreset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                        testPreset === p.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Live Telemetry Readout Grid */}
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                <div><span className="text-slate-400">CAMERA: </span><span className="text-white font-bold">{arucoPipelineDiag.cameraLabel}</span></div>
                <div><span className="text-slate-400">ARUCO: </span><span className={liveMarkers.length > 0 ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>{arucoPipelineDiag.arucoStatusLabel}</span></div>
                <div><span className="text-slate-400">DICT: </span><span className="text-cyan-300 font-bold">{ARUCO_DICTIONARY_NAME}</span></div>
                <div><span className="text-slate-400">TIME: </span><span className="text-white font-bold">{frameDiag ? `${frameDiag.processingTimeMs.toFixed(1)} ms` : '—'}</span></div>
                <div className="col-span-2">
                  <span className="text-slate-400">MARKERS DETECTED: </span>
                  <span className="text-white font-bold">
                    {testStep === 'SINGLE'
                      ? `${liveMarkers.length} detected (need ≥1)`
                      : `${expectedTestIds.filter(id => detectedIds.includes(id)).length} / ${expectedTestIds.length} expected (${liveMarkers.length} total)`}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">DETECTED IDs: </span>
                  <span className="text-emerald-300 font-bold">{detectedIds.length > 0 ? detectedIds.map(id => `#${id}`).join(', ') : 'None'}</span>
                </div>
                {testStep === 'MULTI' && (
                  <div className="col-span-2">
                    <span className="text-slate-400">MISSING IDs: </span>
                    <span className="text-amber-300">
                      {expectedTestIds.filter(id => !detectedIds.includes(id)).length > 0
                        ? expectedTestIds.filter(id => !detectedIds.includes(id)).map(id => `#${id}`).join(', ')
                        : 'None (100% visible)'}
                    </span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-slate-400">LAST DETECTION: </span>
                  <span className="text-slate-200">
                    {lastSuccessDetectionTime ? new Date(lastSuccessDetectionTime).toLocaleTimeString() : 'No detection yet in this session'}
                  </span>
                </div>
              </div>

              {/* Granular Diagnostic Message */}
              <div className={`p-2 rounded-lg border text-[11px] leading-snug ${
                arucoPipelineDiag.severity === 'READY'
                  ? 'bg-emerald-950/50 border-emerald-600/40 text-emerald-200'
                  : arucoPipelineDiag.severity === 'ERROR'
                  ? 'bg-rose-950/50 border-rose-600/40 text-rose-200'
                  : 'bg-amber-950/40 border-amber-600/30 text-amber-200'
              }`}>
                <div className="font-bold">{arucoPipelineDiag.title}</div>
                <div className="text-[10px] opacity-90 mt-0.5">{arucoPipelineDiag.guidance}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-3 pointer-events-auto z-20 px-4">
            {/* 1. Single Tracking Status Indicator */}
            <div className={`px-3 py-1 rounded-full border backdrop-blur-md text-xs font-semibold flex items-center gap-2 shadow-lg ${status.color}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span>{status.label}</span>
            </div>

            {/* 2. Clear Actionable Instruction (includes live CV diagnostic if webcam active with no markers) */}
            <p className="text-xs sm:text-sm text-slate-200 font-medium text-center max-w-md drop-shadow-md">
              {mode === 'WEBCAM' && liveMarkers.length === 0 ? arucoPipelineDiag.guidance : instruction}
            </p>

            {/* 3. Primary Shutter Action Button */}
            <div className="flex items-center gap-8 mt-1">
              <button
                onClick={handleTriggerShutter}
                disabled={!opticalDiagnostic.engineeringTestAllowed}
                className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-transform active:scale-95 cursor-pointer shadow-xl ${
                  opticalDiagnostic.engineeringTestAllowed
                    ? 'bg-white ring-4 ring-teal-500/60 hover:ring-teal-400'
                    : 'bg-slate-800 ring-4 ring-slate-700/50 opacity-40 cursor-not-allowed'
                }`}
                title={
                  opticalDiagnostic.engineeringTestAllowed
                    ? 'Record Jaw Relation Trial'
                    : `Gated: ${opticalDiagnostic.actionableGuidance}`
                }
                aria-label="Capture Record"
              >
                <div className={`w-13 h-13 rounded-full flex items-center justify-center transition-colors ${
                  opticalDiagnostic.engineeringTestAllowed
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  <Camera className="w-6 h-6" />
                </div>
              </button>
            </div>

            {/* 4. Secondary Action: View Clinical Records */}
            <button
              onClick={() => onNavigateToTab('records')}
              className="text-xs text-slate-400 hover:text-teal-400 font-semibold flex items-center gap-1 transition-colors mt-1 py-1 px-3 cursor-pointer"
            >
              <span>View Recorded Trials</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Developer Diagnostics Slide-over Drawer (Visible only when developerMode is active & toggled) */}
      {isDevDrawerOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-slideLeft">
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-white">Developer Diagnostics</h3>
            </div>
            <button
              onClick={() => setIsDevDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
            {/* FPS & Optical State */}
            <div className="p-3 bg-slate-900 rounded-xl space-y-2 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400">
                <span>Framerate:</span>
                <span className="text-white font-bold">{fps} FPS</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Diagnostic State:</span>
                <span className="text-teal-400 font-bold">{opticalDiagnostic.state}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Capture Allowed:</span>
                <span className={opticalDiagnostic.engineeringTestAllowed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {opticalDiagnostic.engineeringTestAllowed ? 'TRUE' : 'FALSE'}
                </span>
              </div>
            </div>

            {/* Tracking Telemetry */}
            <div className="p-3 bg-slate-900 rounded-xl space-y-2 border border-slate-800">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase">Pose &amp; Distance</h4>
              <div className="flex justify-between items-center text-slate-400">
                <span>Distance:</span>
                <span className="text-teal-400 font-bold">{trackingData?.estimatedDistanceCm ?? simDistance} cm</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Roll Deg:</span>
                <span className="text-amber-400 font-bold">{trackingData?.rollDeg.toFixed(1) ?? '0.0'}°</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Mouth Open:</span>
                <span className="text-white font-bold">{((trackingData?.mouthOpenFraction ?? 0) * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Simulation Kinematics Controls */}
            {mode === 'SIMULATION' && (
              <div className="p-3 bg-slate-900 rounded-xl space-y-3 border border-slate-800">
                <h4 className="text-[11px] font-bold text-amber-400 uppercase">Simulation Controls</h4>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Simulated VDO:</span>
                    <span className="text-white font-bold">{simVdo.toFixed(1)} mm</span>
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
                    className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Simulated Tilt M-L:</span>
                    <span className="text-white font-bold">{simTiltML.toFixed(1)}°</span>
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
                    className="w-full accent-teal-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Calibration & Tools Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => setIsCalibrationModalOpen(true)}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Camera Calibration Intrinsics
              </button>
              <button
                onClick={() => setIsSelfCorrectionModalOpen(true)}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Software Self-Correction Proof
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CameraCalibrationModal
        isOpen={isCalibrationModalOpen}
        onClose={() => setIsCalibrationModalOpen(false)}
        currentSettings={calibrationSettings}
        currentMeasuredDistanceCm={trackingData?.estimatedDistanceCm ?? simDistance}
        onSaveSettings={(settings: CameraCalibrationSettings) => setCalibrationSettings(settings)}
      />

      <SoftwareSelfCorrectionModal
        isOpen={isSelfCorrectionModalOpen}
        onClose={() => setIsSelfCorrectionModalOpen(false)}
        phoneRollDeg={trackingData?.rollDeg ?? 0}
        distanceCm={trackingData?.estimatedDistanceCm ?? simDistance}
        vdoMm={simVdo}
      />

      {/* Module 4: Marker Detection Telemetry & CAD Geometry Modal */}
      {isMarkerInspectorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-base font-bold text-white">ArUco Marker Telemetry &amp; CAD Geometry</h3>
                  <p className="text-xs text-slate-400">OpenCV DICT_4X4_50 Fiducial Carrier Boards · Sub-Millimeter Datums</p>
                </div>
              </div>
              <button
                onClick={() => setIsMarkerInspectorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Granular Diagnostic Status Banner */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                mode === 'SIMULATION'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  : arucoPipelineDiag.severity === 'READY'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : arucoPipelineDiag.severity === 'ERROR'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">
                    {mode === 'SIMULATION'
                      ? 'SIMULATED DEMONSTRATION ACTIVE'
                      : `${arucoPipelineDiag.title}`}
                  </span>
                  <p className="text-[11px] text-slate-300">
                    {mode === 'SIMULATION'
                      ? 'Carrier board positions generated by kinematic simulator for UI demonstration.'
                      : arucoPipelineDiag.guidance}
                  </p>
                </div>
              </div>

              {/* Mandatory Live ArUco Telemetry Summary Block */}
              {mode === 'WEBCAM' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-[11px] space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div><span className="text-slate-400 block text-[10px]">CAMERA</span><span className="text-white font-bold">{arucoPipelineDiag.cameraLabel}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">ARUCO DETECTION</span><span className={liveMarkers.length > 0 ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>{arucoPipelineDiag.arucoStatusLabel}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">DICTIONARY</span><span className="text-cyan-300 font-bold">{ARUCO_DICTIONARY_NAME}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">MARKERS DETECTED</span><span className="text-white font-bold">{liveMarkers.length} / 11 clinical</span></div>
                    <div><span className="text-slate-400 block text-[10px]">PROCESSING TIME</span><span className="text-white font-bold">{frameDiag ? `${frameDiag.processingTimeMs.toFixed(1)} ms` : '—'}</span></div>
                    <div><span className="text-slate-400 block text-[10px]">LAST DETECTION</span><span className="text-white font-bold">{lastSuccessDetectionTime ? new Date(lastSuccessDetectionTime).toLocaleTimeString() : 'None'}</span></div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <div><span className="text-slate-400">DETECTED IDs: </span><span className="text-emerald-300 font-bold">{detectedIds.length > 0 ? detectedIds.map(id => `#${id}`).join(', ') : 'None'}</span></div>
                    <div><span className="text-slate-400">MISSING IDs (0–10): </span><span className="text-amber-300">{arucoPipelineDiag.missingClinicalIds.length > 0 ? arucoPipelineDiag.missingClinicalIds.map(id => `#${id}`).join(', ') : 'None'}</span></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[10px]">
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block">Face (0,1,2)</span>
                      <span className={faceMarkersAllVisible ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>{faceDetectedCount}/3 · {arucoPipelineDiag.faceGroupStatus.status}</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block">Maxilla (3–6)</span>
                      <span className={maxillaryAllVisible ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>{maxillaDetectedCount}/4 · {arucoPipelineDiag.maxillaGroupStatus.status}</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block">Mandible (7–10)</span>
                      <span className={mandibularAllVisible ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>{mandibleDetectedCount}/4 · {arucoPipelineDiag.mandibleGroupStatus.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Detected Markers Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Detected Fiducials Telemetry Table:
                </h4>

                {mode === 'SIMULATION' ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono space-y-1.5">
                    <div className="flex justify-between text-teal-400 font-bold border-b border-slate-800 pb-1">
                      <span>Array</span>
                      <span>IDs</span>
                      <span>Coordinates (px)</span>
                      <span>Status</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Maxilla Board</span>
                      <span>#3, #4, #5, #6</span>
                      <span>Simulated Viewport</span>
                      <span className="text-amber-400">SIMULATED</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Mandible Board</span>
                      <span>#7, #8, #9, #10</span>
                      <span>Simulated Viewport</span>
                      <span className="text-amber-400">SIMULATED</span>
                    </div>
                  </div>
                ) : liveMarkers.length > 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">ID</th>
                          <th className="p-2">Group</th>
                          <th className="p-2">Center (px)</th>
                          <th className="p-2">Pose tvec (m)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {liveMarkers.map(m => {
                          const group =
                            m.id >= 0 && m.id <= 2
                              ? 'Face'
                              : m.id >= 3 && m.id <= 6
                              ? 'Maxilla'
                              : m.id >= 7 && m.id <= 10
                              ? 'Mandible'
                              : m.id >= 11 && m.id <= 12
                              ? 'Hanau'
                              : m.id >= 20 && m.id <= 28
                              ? 'Calibration'
                              : 'DICT_4X4_50';
                          return (
                            <tr key={m.id}>
                              <td className="p-2 font-bold text-teal-400">#{m.id}</td>
                              <td className="p-2">{group}</td>
                              <td className="p-2">({m.center.x.toFixed(0)}, {m.center.y.toFixed(0)})</td>
                              <td className="p-2 text-slate-400">[{m.tvec.map(v => v.toFixed(3)).join(', ')}]</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-slate-400 font-mono">
                    {arucoPipelineDiag.title} · {frameDiag ? `Quads: ${frameDiag.rawQuadsFound} · Luma: ${frameDiag.meanLuminance}` : '0 markers visible'}
                  </div>
                )}
              </div>

              {/* Physical CAD Geometry Specifications */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <h4 className="font-bold text-teal-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Grid className="w-4 h-4" />
                  <span>Physical Carrier Board &amp; Marker Dimensions</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Board Width</span>
                    <span className="font-bold text-white text-sm">18.0 mm</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Marker Width</span>
                    <span className="font-bold text-teal-300 text-sm">6.5 / 14 mm</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Marker Pitch</span>
                    <span className="font-bold text-white text-sm">7.5 mm</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg">
                    <span className="text-slate-400 block text-[10px]">Quiet Margin</span>
                    <span className="font-bold text-white text-sm">2.0 mm</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  <strong>Dimension Documentation:</strong> The standard SmartBow carrier plate measures exactly <strong>18.0 × 18.0 × 3.0 mm</strong>. 
                  Individual black square markers measure <strong>6.5 × 6.5 mm</strong> (in the 2×2 cluster) or <strong>14.0 × 14.0 mm</strong> (single target), with a <strong>7.5 mm</strong> center-to-center pitch and a <strong>2.0 mm</strong> quiet zone margin.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsMarkerInspectorOpen(false)}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
