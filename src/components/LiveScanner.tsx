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
  ArrowRight
} from 'lucide-react';
import { RealtimeFaceTracker, FaceTrackingResult } from '../lib/faceTrackingEngine';
import { DentitionState, CameraCalibrationSettings } from '../types/smartbow';
import { loadCameraCalibration } from '../lib/cameraCalibration';
import { evaluateOpticalDiagnostic, checkCaptureReadiness, OPTICAL_DIAGNOSTIC_DEFINITIONS } from '../lib/opticalDiagnostics';
import { OpticalDiagnosticState, OpticalDiagnosticInfo } from '../types/smartbow';
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
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(30);

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

  // Optical Diagnostics evaluation
  const telemetryAgeMs = Date.now() - lastTelemetryTimestampRef.current;
  const opticalDiagnostic: OpticalDiagnosticInfo = evaluateOpticalDiagnostic({
    mode,
    cameraActive,
    cameraError: cameraPermissionError,
    faceDetected: trackingData?.detected ?? false,
    faceMarkersComplete: trackingData?.detected ?? false,
    arucoDetected: mode === 'SIMULATION' ? true : (trackingData?.detected ?? false),
    maxillaryComplete: mode === 'SIMULATION' ? true : (trackingData?.detected ?? false),
    mandibularComplete: mode === 'SIMULATION' ? true : (trackingData?.detected ?? false),
    cameraCalibrated: calibrationSettings.isCalibrated,
    markerSizeVerified: true,
    trackingStable: (trackingData?.frameQualityScore ?? 100) >= 50,
    telemetryAgeMs
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

  // Webcam stream lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    if (mode === 'WEBCAM') {
      const startCamera = async () => {
        try {
          setCameraPermissionError(null);
          const constraints: MediaStreamConstraints = {
            video: {
              facingMode: cameraFacing,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (isCancelled) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setCameraActive(true);
            updateCanvasDimensions();
          }
        } catch (err: any) {
          if (!isCancelled) {
            console.warn('Webcam stream unavailable:', err);
            setCameraPermissionError(err.message || 'Camera permission denied or camera device unavailable');
            setCameraActive(false);
          }
        }
      };
      startCamera();
    } else {
      setCameraActive(false);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      isCancelled = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [mode, cameraFacing, updateCanvasDimensions]);

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
      const isWebcamReady = mode === 'WEBCAM' && videoRef.current && videoRef.current.readyState >= 2;
      if (isWebcamReady && videoRef.current) {
        const v = videoRef.current;
        const vW = v.videoWidth || 640;
        const vH = v.videoHeight || 480;

        // Cover fit without distortion
        const scale = Math.max(w / vW, h / vH);
        const drawW = vW * scale;
        const drawH = vH * scale;
        const drawX = (w - drawW) / 2;
        const drawY = (h - drawH) / 2;

        ctx.drawImage(v, drawX, drawY, drawW, drawH);
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

      // Throttled UI state publication
      if (time - lastUiUpdate > 80) {
        lastUiUpdate = time;
        lastTelemetryTimestampRef.current = Date.now();
        setTrackingData(tracking);
      }

      // 3. Clean Visual Overlays (Uncluttered)
      if (tracking.detected) {
        const fbX = tracking.faceBox.x * w;
        const fbY = tracking.faceBox.y * h;
        const fbW = tracking.faceBox.width * w;
        const fbH = tracking.faceBox.height * h;
        const cornerLen = Math.max(14, Math.min(32, fbW * 0.18));

        // Minimal, high-contrast corner brackets (no clutter)
        ctx.strokeStyle = '#0d9488'; // Clean Teal
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

        // Subtle midline orientation axis
        if (tracking.landmarks[10] && tracking.landmarks[152]) {
          const gX = tracking.landmarks[10].x * w;
          const gY = tracking.landmarks[10].y * h;
          const mX = tracking.landmarks[152].x * w;
          const mY = tracking.landmarks[152].y * h;

          ctx.strokeStyle = 'rgba(13, 148, 136, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(gX, gY);
          ctx.lineTo(mX, mY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw MediaPipe Skeletal mesh ONLY in Developer Mode
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
      } else {
        // Clean Centered Framing Guide when searching
        const cx = w / 2;
        const cy = h / 2 - 10;
        const ow = Math.min(w * 0.45, 120);
        const oh = ow * 1.35;

        ctx.strokeStyle = 'rgba(203, 213, 225, 0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, ow, oh, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mode, simVdo, simTiltML, simTiltAP, simMidline, simDistance, simIlluminationIRE, calibrationSettings, developerMode]);

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

        {/* Top Minimal Viewfinder Header (Controls & Developer Trigger) */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-20">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('SIMULATION')}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'SIMULATION' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulate
            </button>
            <button
              onClick={() => setMode('WEBCAM')}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'WEBCAM' ? 'bg-teal-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Camera
            </button>
          </div>

          {/* Quick Actions (Flip Camera & Settings/Developer) */}
          <div className="flex items-center gap-1.5">
            {mode === 'WEBCAM' && (
              <button
                onClick={() => setCameraFacing(prev => prev === 'user' ? 'environment' : 'user')}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                title="Switch Front / Rear Camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {developerMode && (
              <button
                onClick={() => setIsDevDrawerOpen(true)}
                className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-teal-400 hover:text-teal-300 transition-colors flex items-center justify-center cursor-pointer"
                title="Open Developer Diagnostics"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Focused Clinical Lower HUD (Status -> Instruction -> Shutter) */}
        <div className="absolute bottom-4 inset-x-0 flex flex-col items-center gap-3 pointer-events-auto z-20 px-4">
          {/* 1. Exactly ONE Tracking Status Indicator */}
          <div className={`px-3 py-1 rounded-full border backdrop-blur-md text-xs font-semibold flex items-center gap-2 shadow-lg ${status.color}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
            <span>{status.label}</span>
          </div>

          {/* 2. Exactly ONE Clear Instruction */}
          <p className="text-xs sm:text-sm text-slate-200 font-medium text-center max-w-sm drop-shadow-md">
            {instruction}
          </p>

          {/* 3. Exactly ONE Primary Shutter Action Button */}
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

          {/* 4. Small Secondary Action: View Clinical Records */}
          <button
            onClick={() => onNavigateToTab('records')}
            className="text-xs text-slate-400 hover:text-teal-400 font-semibold flex items-center gap-1 transition-colors mt-1 py-1 px-3 cursor-pointer"
          >
            <span>View Recorded Trials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
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
    </div>
  );
};
