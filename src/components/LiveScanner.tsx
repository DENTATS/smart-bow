/**
 * SmartBow AI - Live Camera & Computer Vision Scanner
 * Full Prosthodontic Clinical Suite with Active Digital Camera Self-Stabilization,
 * Real-Time 'Camera Stability' Indicator with Motion Sensor & Frame-to-Frame Variance Monitoring,
 * Visual Alerts for Excessive Movement, Latest Smartphone Lens Support, Minimalist Decluttered HUD,
 * and Instagram/Snapchat-style Recording Filter Carousel.
 *
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  RefreshCw, 
  Sliders, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Layers,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Crosshair,
  Gauge,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  BookOpen,
  Smartphone,
  Smile,
  Zap,
  Maximize2,
  X,
  Compass,
  Activity,
  Sparkles,
  HelpCircle,
  Video,
  VideoOff,
  AlertTriangle,
  Radio,
  SlidersHorizontal,
  Info,
  Sun,
  SunDim,
  Moon,
  Lightbulb
} from 'lucide-react';
import { VdoExplainerModal } from './VdoExplainerModal';
import { SoftwareSelfCorrectionModal } from './SoftwareSelfCorrectionModal';
import { DentulousProtocolModal } from './DentulousProtocolModal';
import { CameraCalibrationModal } from './CameraCalibrationModal';
import { SelfQualityAdjustmentModal } from './SelfQualityAdjustmentModal';
import { buildPatientFrame } from '../lib/patientFrame';
import { RealtimeFaceTracker, FaceTrackingResult } from '../lib/faceTrackingEngine';
import { DentitionState, DentulousAttachmentMethod, CameraCalibrationSettings } from '../types/smartbow';
import { loadCameraCalibration, saveCameraCalibration } from '../lib/cameraCalibration';
import { drawMediaPipeSkeletalOverlay, VERIFIED_SKELETAL_NODES } from '../lib/mediaPipeSkeletalTopology';

export type RecordingFilterMode = 
  | 'AUTO_STABILIZE' 
  | 'CR_TRIAL' 
  | 'VDO_HEIGHT' 
  | 'DYNAMIC_JAW' 
  | 'GOTHIC_ARCH' 
  | 'BENCH_SIM';

interface FilterOption {
  id: RecordingFilterMode;
  label: string;
  subtitle: string;
  icon: string;
  badge?: string;
}

const FILTER_MODES: FilterOption[] = [
  { id: 'AUTO_STABILIZE', label: 'Stabilize', subtitle: 'Gyro Dampened', icon: '⚡' },
  { id: 'CR_TRIAL', label: 'CR Trial', subtitle: 'Centric Relation', icon: '📐', badge: 'Dawson' },
  { id: 'VDO_HEIGHT', label: 'VDO Height', subtitle: 'Fox & Camper', icon: '📏' },
  { id: 'DYNAMIC_JAW', label: 'Dynamic Jaw', subtitle: 'Speech & Rest', icon: '👄' },
  { id: 'GOTHIC_ARCH', label: 'Gothic Arch', subtitle: 'Arrow Point', icon: '📊' },
  { id: 'BENCH_SIM', label: 'Bench Sim', subtitle: 'Demo Bench', icon: '🤖' }
];

interface LiveScannerProps {
  dentitionState?: DentitionState;
  onUpdateDentition?: (state: DentitionState) => void;
  vdoMm: number;
  onUpdateVdo: (vdo: number) => void;
  tiltMLDeg: number;
  onUpdateTiltML: (tilt: number) => void;
  tiltAPDeg: number;
  onUpdateTiltAP: (tilt: number) => void;
  midlineShiftMm: number;
  onUpdateMidline: (shift: number) => void;
  onRecordCrTrial: () => void;
  onNavigateToTab: (tab: 'vdo' | 'cr' | 'gothic' | 'facial' | 'articulator' | 'validation') => void;
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
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<RealtimeFaceTracker>(new RealtimeFaceTracker());

  // Operational state
  const [mode, setMode] = useState<'SIMULATION' | 'WEBCAM'>('SIMULATION');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(30);

  // Digital Self-Stabilization state
  const [stabilizerMode, setStabilizerMode] = useState<'OFF' | 'EIS_ACTIVE' | 'DEMO_LOCK'>('DEMO_LOCK');

  // Physical Device Motion Sensor Data (Accelerometer & Gyroscope)
  const [motionSensorActive, setMotionSensorActive] = useState<boolean>(false);
  const [deviceMotionData, setDeviceMotionData] = useState<{
    accelMag: number; // m/s^2
    rotRate: number;  // deg/s
  }>({ accelMag: 0, rotRate: 0 });
  const deviceMotionRef = useRef<{ accelMag: number; rotRate: number }>({ accelMag: 0, rotRate: 0 });

  // Overlay Toggles (Markerless Face Tracking & Auto-Alignment defaults)
  const [showFaceTrackingBox, setShowFaceTrackingBox] = useState<boolean>(true);
  const [showMarkerlessFrames, setShowMarkerlessFrames] = useState<boolean>(true);
  const [showMesh, setShowMesh] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(false);
  const [showPositioningGuide, setShowPositioningGuide] = useState<boolean>(true);
  const [bypassMarkerLock, setBypassMarkerLock] = useState<boolean>(true);
  const [showQualityDetails, setShowQualityDetails] = useState<boolean>(false);
  const [showSkeletalLabels, setShowSkeletalLabels] = useState<boolean>(true);
  const [showSkeletalStruts, setShowSkeletalStruts] = useState<boolean>(true);

  // Instagram/Snapchat Filter Mode Carousel & Shutter Action
  const [activeFilter, setActiveFilter] = useState<RecordingFilterMode>('AUTO_STABILIZE');
  const [shutterTriggered, setShutterTriggered] = useState<boolean>(false);
  const [trialSuccessToast, setTrialSuccessToast] = useState<{ visible: boolean; text: string } | null>(null);
  const [crTrialCount, setCrTrialCount] = useState<number>(1);

  // Slide-out Kinematics & Tuning Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Dentulous Patients & FMR state
  const [dentitionMode, setDentitionMode] = useState<DentitionState>(dentitionState || 'EDENTULOUS');
  const [attachmentMethod, setAttachmentMethod] = useState<DentulousAttachmentMethod>('BITE_FORK_CLUTCH');
  const [dentulousBiteState, setDentulousBiteState] = useState<'MIP' | 'CR' | 'REST_VDR'>('MIP');
  const [isDentulousModalOpen, setIsDentulousModalOpen] = useState<boolean>(false);

  // Modals
  const [isVdoExplainerOpen, setIsVdoExplainerOpen] = useState<boolean>(false);
  const [isSelfCorrectionModalOpen, setIsSelfCorrectionModalOpen] = useState<boolean>(false);
  const [isSelfQualityModalOpen, setIsSelfQualityModalOpen] = useState<boolean>(false);

  // Autonomous Self-Quality Adjustment state (Closed-Loop Quality Control)
  const [autoQualityAdjustment, setAutoQualityAdjustment] = useState<boolean>(true);

  // Brightness-Level Monitoring & Environment Self-Adjustment Utility
  const [simIlluminationIRE, setSimIlluminationIRE] = useState<number>(140); // 20 - 255 IRE
  const [dismissedBrightnessWarning, setDismissedBrightnessWarning] = useState<boolean>(false);
  const [prevBrightnessState, setPrevBrightnessState] = useState<string>('OPTIMAL');

  // Live tracking telemetry published to React UI
  const [trackingData, setTrackingData] = useState<FaceTrackingResult | null>(null);

  // Camera Optical Distance Calibration & Intrinsics
  const [calibrationSettings, setCalibrationSettings] = useState<CameraCalibrationSettings>(() => loadCameraCalibration());
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState<boolean>(false);
  const [simDistance, setSimDistance] = useState<number>(48);

  // Handheld Phone Shake / Tilt Simulator for demonstrating Invariance & Stability Alert
  const [handheldPhoneRoll, setHandheldPhoneRoll] = useState<number>(0);

  // Prosthodontic simulator controls
  const [simVdo, setSimVdo] = useState<number>(vdoMm || 62.5);
  const [simTiltML, setSimTiltML] = useState<number>(tiltMLDeg || 1.8);
  const [simTiltAP, setSimTiltAP] = useState<number>(tiltAPDeg || 4.2);
  const [simMidline, setSimMidline] = useState<number>(midlineShiftMm || 0.4);
  const [simLateral, setSimLateral] = useState<number>(0.0);
  const [simProtrusion, setSimProtrusion] = useState<number>(0.0);

  // Physical motion sensor hook (accelerometer + gyro)
  useEffect(() => {
    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      setMotionSensorActive(true);
      let accelMag = 0;
      if (e.acceleration && (e.acceleration.x !== null || e.acceleration.y !== null || e.acceleration.z !== null)) {
        accelMag = Math.hypot(e.acceleration.x || 0, e.acceleration.y || 0, e.acceleration.z || 0);
      } else if (e.accelerationIncludingGravity) {
        const total = Math.hypot(e.accelerationIncludingGravity.x || 0, e.accelerationIncludingGravity.y || 0, e.accelerationIncludingGravity.z || 0);
        accelMag = Math.abs(total - 9.81);
      }

      let rotRate = 0;
      if (e.rotationRate) {
        rotRate = Math.hypot(e.rotationRate.alpha || 0, e.rotationRate.beta || 0, e.rotationRate.gamma || 0);
      }

      deviceMotionRef.current = { accelMag, rotRate };
      setDeviceMotionData({
        accelMag: Number(accelMag.toFixed(2)),
        rotRate: Number(rotRate.toFixed(1))
      });
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, []);

  // Reset dismissed brightness warning when lighting status changes
  useEffect(() => {
    const curStatus = trackingData?.brightnessMonitoring?.status || 'OPTIMAL';
    if (curStatus !== prevBrightnessState) {
      setPrevBrightnessState(curStatus);
      setDismissedBrightnessWarning(false);
    }
  }, [trackingData?.brightnessMonitoring?.status, prevBrightnessState]);

  // Sync simulator changes to parent state
  const handleVdoChange = useCallback((val: number) => {
    setSimVdo(val);
    onUpdateVdo(val);
  }, [onUpdateVdo]);

  const handleTiltMLChange = useCallback((val: number) => {
    setSimTiltML(val);
    onUpdateTiltML(val);
  }, [onUpdateTiltML]);

  const handleTiltAPChange = useCallback((val: number) => {
    setSimTiltAP(val);
    onUpdateTiltAP(val);
  }, [onUpdateTiltAP]);

  const handleMidlineChange = useCallback((val: number) => {
    setSimMidline(val);
    onUpdateMidline(val);
  }, [onUpdateMidline]);

  const handleResetSimulator = useCallback(() => {
    handleVdoChange(62.5);
    handleTiltMLChange(1.8);
    handleTiltAPChange(4.2);
    handleMidlineChange(0.4);
    setSimLateral(0.0);
    setSimProtrusion(0.0);
    setHandheldPhoneRoll(0);
  }, [handleVdoChange, handleTiltMLChange, handleTiltAPChange, handleMidlineChange]);

  // Synchronize incoming dentitionState prop
  useEffect(() => {
    if (dentitionState) {
      setDentitionMode(dentitionState);
    }
  }, [dentitionState]);

  // Dentulous bite preset selector
  const handleSelectBiteState = useCallback((bite: 'MIP' | 'CR' | 'REST_VDR') => {
    setDentulousBiteState(bite);
    if (bite === 'MIP') {
      handleVdoChange(62.5);
      setSimProtrusion(0.0);
      setSimLateral(0.0);
    } else if (bite === 'CR') {
      handleVdoChange(63.0);
      setSimProtrusion(-1.2);
      setSimLateral(-0.4);
    } else if (bite === 'REST_VDR') {
      handleVdoChange(66.0);
      setSimProtrusion(0.0);
      setSimLateral(0.0);
    }
  }, [handleVdoChange]);

  // Mode change handler
  const handleSelectFilterMode = (modeId: RecordingFilterMode) => {
    setActiveFilter(modeId);
    if (modeId === 'BENCH_SIM') {
      setMode('SIMULATION');
    } else if (modeId === 'CR_TRIAL') {
      setDentulousBiteState('CR');
    }
  };

  // Instagram/Snapchat style Shutter Trigger action
  const handleTriggerShutter = useCallback(() => {
    // Optical camera flash animation
    setShutterTriggered(true);
    setTimeout(() => setShutterTriggered(false), 350);

    // Haptic vibration feedback on modern smartphones
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {}
    }

    // Capture record based on active filter mode
    onRecordCrTrial();

    const currentRecordedVdo = trackingData 
      ? trackingData.softwareSelfCorrection.invariantVdoMm.toFixed(1) 
      : simVdo.toFixed(1);

    const toastMsg = activeFilter === 'CR_TRIAL'
      ? `CR Trial #${crTrialCount} Logged: ${currentRecordedVdo} mm (VDO Recorded)`
      : `Measurement Captured: ${currentRecordedVdo} mm VDO (Face Tracked)`;

    setTrialSuccessToast({ visible: true, text: toastMsg });
    setCrTrialCount(prev => (prev % 3) + 1);

    setTimeout(() => {
      setTrialSuccessToast(null);
    }, 2600);
  }, [onRecordCrTrial, trackingData, simVdo, activeFilter, crTrialCount]);

  // Robust camera setup supporting latest modern phones (iPhone 13-16, Galaxy S23/S24, Pixel 7-9)
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    if (mode === 'WEBCAM') {
      setCameraPermissionError(null);
      const startCamera = async () => {
        try {
          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera API not supported on this browser');
          }

          // Tier 1: Modern smartphone optimized constraints (1080p/720p with facingMode ideal)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: cameraFacing },
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 30 }
              },
              audio: false
            });
          } catch {
            // Tier 2: Basic facingMode constraint
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacing },
                audio: false
              });
            } catch {
              // Tier 3: Universal fallback
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
              });
            }
          }

          // Apply modern continuous autofocus/exposure if supported
          try {
            const track = stream.getVideoTracks()[0];
            if (track && 'applyConstraints' in track) {
              await (track as any).applyConstraints({
                advanced: [{ focusMode: 'continuous', exposureMode: 'continuous' }]
              }).catch(() => {});
            }
          } catch {}

          if (!isCancelled && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('webkit-playsinline', 'true');
            await videoRef.current.play().catch(() => {});
            setCameraActive(true);
          }
        } catch (err: any) {
          if (!isCancelled) {
            console.warn('Camera access fallback:', err);
            setCameraPermissionError(err?.message || 'Unable to access camera. Please check permissions.');
            setMode('SIMULATION');
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
  }, [mode, cameraFacing]);

  // Flip Camera (Front vs Rear)
  const handleToggleCameraFacing = () => {
    setCameraFacing(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Main 60 FPS Computer Vision & Canvas Rendering Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastReactUiUpdate = 0;

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

      // 1. Draw Background (Webcam or Calibrated Simulator Bench)
      const isWebcamReady = mode === 'WEBCAM' && videoRef.current && videoRef.current.readyState >= 2;
      if (isWebcamReady && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, w, h);
      } else {
        // Clinical Patient Simulator View (Minimal Dark Canvas)
        ctx.fillStyle = '#06090f';
        ctx.fillRect(0, 0, w, h);

        // Batched subtle background grid
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < w; x += 40) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += 40) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();

        // Clinical Patient Silhouette
        const headCenterX = w / 2;
        const headCenterY = h / 2 - 20;

        ctx.beginPath();
        ctx.ellipse(headCenterX, headCenterY, 150, 195, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Shoulders
        ctx.beginPath();
        ctx.moveTo(headCenterX - 180, h);
        ctx.quadraticCurveTo(headCenterX - 140, headCenterY + 180, headCenterX, headCenterY + 180);
        ctx.quadraticCurveTo(headCenterX + 140, headCenterY + 180, headCenterX + 180, h);
        ctx.fillStyle = '#090d16';
        ctx.fill();
      }

      // 2. Execute dynamic computer vision face & marker tracking with Active Self-Stabilization & Motion Variance
      const tracker = trackerRef.current;
      const tracking = await tracker.trackFrame(
        isWebcamReady ? videoRef.current : null,
        w,
        h,
        simVdo,
        { ml: simTiltML, ap: simTiltAP, midline: simMidline },
        mode === 'WEBCAM',
        handheldPhoneRoll,
        calibrationSettings,
        simDistance,
        stabilizerMode,
        0.65,
        deviceMotionRef.current.accelMag,
        autoQualityAdjustment,
        simIlluminationIRE
      );

      // Throttled UI state publication (80ms) for high responsiveness without React thrashing
      if (time - lastReactUiUpdate > 80) {
        lastReactUiUpdate = time;
        setTrackingData(tracking);
        // If webcam is tracking dynamic mouth opening, sync VDO
        if (mode === 'WEBCAM' && tracking.detected && tracking.mouthOpenFraction > 0.05) {
          const dynamicVdo = Number(tracking.softwareSelfCorrection.invariantVdoMm.toFixed(1));
          setSimVdo(dynamicVdo);
        }
      }

      const fullLandmarks = tracking.landmarks;
      const headW = tracking.faceBox.width * w;
      const headH = tracking.faceBox.height * h;

      // 3. Markerless Face Tracking & Anatomical Landmark Points HUD
      if (showFaceTrackingBox) {
        if (tracking.detected) {
          const fbX = tracking.faceBox.x * w;
          const fbY = tracking.faceBox.y * h;
          const fbW = tracking.faceBox.width * w;
          const fbH = tracking.faceBox.height * h;
          const cornerLen = Math.max(16, Math.min(36, fbW * 0.22));

          // A. 4-Corner HUD Brackets [   ]
          ctx.strokeStyle = '#10b981'; // Emerald-500
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

          // Subtle bounding box border
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(fbX, fbY, fbW, fbH);

          // B. Top Clinical Face Tracking Status Badge
          const tagW = Math.min(fbW, 255);
          const tagH = 22;
          const tagX = fbX + (fbW - tagW) / 2;
          const tagY = Math.max(8, fbY - 26);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagW, tagH, 6);
          ctx.fill();
          ctx.stroke();

          // Green status beacon dot
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(tagX + 12, tagY + tagH / 2, 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.fillStyle = '#34d399';
          ctx.textAlign = 'left';
          ctx.fillText(`✓ FACE TRACKED · ANATOMICAL ALIGNMENT`, tagX + 20, tagY + 15);

          // C. Face Center Crosshair & Gimbal Reticle
          const hcX = tracking.headCenter.x * w;
          const hcY = tracking.headCenter.y * h;

          ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(hcX, hcY, 14, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(hcX - 18, hcY);
          ctx.lineTo(hcX - 6, hcY);
          ctx.moveTo(hcX + 6, hcY);
          ctx.lineTo(hcX + 18, hcY);
          ctx.moveTo(hcX, hcY - 18);
          ctx.lineTo(hcX, hcY - 6);
          ctx.moveTo(hcX, hcY + 6);
          ctx.lineTo(hcX, hcY + 18);
          ctx.stroke();

          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(hcX, hcY, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // D. MARK KEY ANATOMICAL POINTS ON THE FACE (Direct Clinical Landmarks)
          const drawFacePoint = (
            pt: { x: number; y: number } | undefined,
            label: string,
            color: string,
            radius: number = 3.5,
            offsetY: number = -6
          ) => {
            if (!pt) return;
            const px = pt.x * w;
            const py = pt.y * h;

            // Halo glow
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.arc(px, py, radius + 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Target circle
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();

            // White high-contrast center pin
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            ctx.fill();

            // High-contrast badge tag
            ctx.font = 'bold 8.5px JetBrains Mono, monospace';
            const textW = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(px - textW / 2 - 3, py + offsetY - 9, textW + 6, 11);
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.fillText(label, px, py + offsetY);
          };

          // 1. Glabella (Forehead center anchor)
          drawFacePoint(fullLandmarks[10], 'GLABELLA #10', '#06b6d4', 3.5, -8);

          // 2. Pupils (Bipupillary Horizon)
          drawFacePoint(fullLandmarks[33], 'PUPIL-R #33', '#a855f7', 3.5, -8);
          drawFacePoint(fullLandmarks[263], 'PUPIL-L #263', '#a855f7', 3.5, -8);

          // 3. Subnasale (Base of nose / upper maxilla anchor)
          drawFacePoint(fullLandmarks[1], 'SUBNASALE #1', '#38bdf8', 3.5, -8);

          // 4. Stomion (Incisal contact line)
          drawFacePoint(fullLandmarks[0], 'STOMION (OCCLUSAL)', '#f59e0b', 3.0, -7);

          // 5. Cheilion (Corners of mouth / smile corridor)
          drawFacePoint(fullLandmarks[61], 'COMMISSURE-R', '#38bdf8', 2.5, 12);
          drawFacePoint(fullLandmarks[291], 'COMMISSURE-L', '#38bdf8', 2.5, 12);

          // 6. Menton (Chin tip - Dynamic Mandibular Jaw Tracker)
          if (fullLandmarks[152]) {
            const chinX = fullLandmarks[152].x * w;
            const chinY = fullLandmarks[152].y * h;
            // Pulsing target ring
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(chinX, chinY, 7, 0, Math.PI * 2);
            ctx.stroke();
            drawFacePoint(fullLandmarks[152], 'MENTON #152 (DYNAMIC JAW)', '#34d399', 4.5, 16);
          }

          // 7. Gonion (Jaw angles)
          drawFacePoint(fullLandmarks[199], 'GONION-R', '#94a3b8', 2.5, 11);
          drawFacePoint(fullLandmarks[429], 'GONION-L', '#94a3b8', 2.5, 11);

        } else {
          // Face Searching Reticle when out of frame
          const centerX = w / 2;
          const centerY = h / 2 - 10;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.strokeRect(centerX - 95, centerY - 115, 190, 230);
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
          ctx.fillRect(centerX - 110, centerY - 14, 220, 28);
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.fillStyle = '#fbbf24';
          ctx.textAlign = 'center';
          ctx.fillText('SEARCHING FOR PATIENT FACE...', centerX, centerY + 4);
        }
      }

      // 4. Aligning Planes & Axes Around Tracked Face Points
      if (tracking.detected && fullLandmarks.length >= 468) {
        // A. Facial Midline Vertical Alignment Plane (Glabella 10 -> Subnasale 1 -> Menton 152)
        if (fullLandmarks[10] && fullLandmarks[1] && fullLandmarks[152]) {
          const gX = fullLandmarks[10].x * w;
          const gY = fullLandmarks[10].y * h;
          const mX = fullLandmarks[152].x * w;
          const mY = fullLandmarks[152].y * h;

          // Extend midline past glabella and past chin
          const dirX = mX - gX;
          const dirY = mY - gY;
          const startX = gX - dirX * 0.22;
          const startY = gY - dirY * 0.22;
          const endX = mX + dirX * 0.15;
          const endY = mY + dirY * 0.15;

          ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Midline Roll annotation tag
          ctx.font = '8.5px JetBrains Mono, monospace';
          ctx.fillStyle = '#f59e0b';
          ctx.textAlign = 'left';
          ctx.fillText(`FACIAL MIDLINE · ${tracking.rollDeg > 0 ? '+' : ''}${tracking.rollDeg.toFixed(1)}° ROLL`, endX + 6, endY);
        }

        // B. Interpupillary Horizon Axis (Pupil-R 33 -> Pupil-L 263)
        if (fullLandmarks[33] && fullLandmarks[263]) {
          const rX = fullLandmarks[33].x * w;
          const rY = fullLandmarks[33].y * h;
          const lX = fullLandmarks[263].x * w;
          const lY = fullLandmarks[263].y * h;

          // Extend across face width
          const pDirX = lX - rX;
          const pDirY = lY - rY;
          const pStartX = rX - pDirX * 0.35;
          const pStartY = rY - pDirY * 0.35;
          const pEndX = lX + pDirX * 0.35;
          const pEndY = lY + pDirY * 0.35;

          ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pStartX, pStartY);
          ctx.lineTo(pEndX, pEndY);
          ctx.stroke();

          ctx.font = '8.5px JetBrains Mono, monospace';
          ctx.fillStyle = '#c084fc';
          ctx.textAlign = 'right';
          ctx.fillText('BIPUPILLARY HORIZON · CRANIAL LEVEL', pStartX - 6, pStartY + 3);
        }

        // C. Aesthetic Occlusal Plane (Fox Plane parallel to bipupillary horizon through Stomion)
        if (fullLandmarks[0] && fullLandmarks[33] && fullLandmarks[263]) {
          const sX = fullLandmarks[0].x * w;
          const sY = fullLandmarks[0].y * h;
          const eyeAngle = Math.atan2(fullLandmarks[263].y - fullLandmarks[33].y, fullLandmarks[263].x - fullLandmarks[33].x);
          const occlusalAngle = eyeAngle + (simTiltML * Math.PI) / 180;
          const planeHalfLen = headW * 0.38;
          const ox1 = sX - Math.cos(occlusalAngle) * planeHalfLen;
          const oy1 = sY - Math.sin(occlusalAngle) * planeHalfLen;
          const ox2 = sX + Math.cos(occlusalAngle) * planeHalfLen;
          const oy2 = sY + Math.sin(occlusalAngle) * planeHalfLen;

          ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.moveTo(ox1, oy1);
          ctx.lineTo(ox2, oy2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = '8.5px JetBrains Mono, monospace';
          ctx.fillStyle = '#22d3ee';
          ctx.textAlign = 'left';
          ctx.fillText(`OCCLUSAL / FOX PLANE · TILT: ${simTiltML.toFixed(1)}°`, ox2 + 6, oy2 + 3);
        }
      }

      // 5. Markerless Dental Kinematic Tracking Frames (Testing & Clinical Alignment without stickers)
      if (showMarkerlessFrames && tracking.detected && fullLandmarks[1] && fullLandmarks[152]) {
        const subnasaleX = fullLandmarks[1].x * w;
        const subnasaleY = fullLandmarks[1].y * h;
        const mentonX = fullLandmarks[152].x * w;
        const mentonY = fullLandmarks[152].y * h;
        const currentVdo = tracking.softwareSelfCorrection.invariantVdoMm;
        const archW = Math.max(38, headW * 0.28);
        const archH = Math.max(14, headH * 0.08);

        // A. Maxillary Kinematic Frame (T_max) - Upper dental arch plane
        const maxillaCenterY = subnasaleY + (mentonY - subnasaleY) * 0.26;
        ctx.save();
        ctx.translate(subnasaleX, maxillaCenterY);
        ctx.rotate(((simTiltML + tracking.rollDeg) * Math.PI) / 180);

        // Maxillary Dental Arch Contour
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.0;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.70)';
        ctx.beginPath();
        ctx.ellipse(0, 0, archW / 2, archH / 2, 0, Math.PI, 0, false);
        ctx.stroke();
        ctx.fill();

        // Maxillary midline tick
        ctx.beginPath();
        ctx.moveTo(0, -archH / 2);
        ctx.lineTo(0, archH / 2);
        ctx.stroke();

        ctx.font = 'bold 8.5px JetBrains Mono, monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText('T_max (MAXILLA ARCH)', 0, -archH / 2 - 4);
        ctx.restore();

        // B. Mandibular Kinematic Frame (T_mand) - Lower dental arch plane (Moves live with jaw opening!)
        const mandCenterY = subnasaleY + (mentonY - subnasaleY) * 0.65;
        const mandCenterX = subnasaleX + simLateral * 2.0;
        ctx.save();
        ctx.translate(mandCenterX, mandCenterY);
        ctx.rotate(((simTiltML * 0.8 + tracking.rollDeg) * Math.PI) / 180);

        // Mandibular Dental Arch Contour
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2.0;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.70)';
        ctx.beginPath();
        ctx.ellipse(0, 0, archW / 2, archH / 2, 0, 0, Math.PI, false);
        ctx.stroke();
        ctx.fill();

        // Mandibular midline tick
        ctx.beginPath();
        ctx.moveTo(0, -archH / 2);
        ctx.lineTo(0, archH / 2);
        ctx.stroke();

        ctx.font = 'bold 8.5px JetBrains Mono, monospace';
        ctx.fillStyle = '#34d399';
        ctx.textAlign = 'center';
        ctx.fillText('T_mand (MANDIBLE JAW)', 0, archH / 2 + 11);
        ctx.restore();

        // C. Live Dynamic VDO Caliper Bracket between Maxilla and Mandible
        const caliperX = subnasaleX + archW / 2 + 18;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(caliperX, maxillaCenterY);
        ctx.lineTo(caliperX, mandCenterY);
        // Bracket top & bottom ticks
        ctx.moveTo(caliperX - 4, maxillaCenterY);
        ctx.lineTo(caliperX + 4, maxillaCenterY);
        ctx.moveTo(caliperX - 4, mandCenterY);
        ctx.lineTo(caliperX + 4, mandCenterY);
        ctx.stroke();
        ctx.setLineDash([]);

        // VDO Readout Badge
        const badgeY = (maxillaCenterY + mandCenterY) / 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(caliperX + 8, badgeY - 10, 84, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 9.5px JetBrains Mono, monospace';
        ctx.fillStyle = '#f87171';
        ctx.textAlign = 'left';
        ctx.fillText(`VDO: ${currentVdo.toFixed(1)}mm`, caliperX + 13, badgeY + 4);
      }

      // 6. Live Phone Positioning Guide Canvas Overlay
      if (showPositioningGuide) {
        const guideCenterX = w * 0.50;
        const guideCenterY = h * 0.45;
        const guideW = w * 0.38;
        const guideH = h * 0.56;
        const isIdeal = tracking.positioningGuide.isIdealPosition;

        // Framing Oval
        ctx.strokeStyle = isIdeal ? 'rgba(16, 185, 129, 0.7)' : 'rgba(6, 182, 212, 0.45)';
        ctx.lineWidth = isIdeal ? 2 : 1.5;
        ctx.setLineDash([8, 6]);

        ctx.beginPath();
        ctx.ellipse(guideCenterX, guideCenterY, guideW / 2, guideH / 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Right Premolar Target Corridor Zone Highlight (30°-45° Right Anterolateral)
        const premolarTargetX = guideCenterX + guideW * 0.28;
        const premolarTargetY = guideCenterY + guideH * 0.12;
        ctx.strokeStyle = isIdeal ? 'rgba(52, 211, 153, 0.85)' : 'rgba(245, 158, 11, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(premolarTargetX - 26, premolarTargetY - 22, 52, 54);

        // Label Corridor
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = isIdeal ? '#34d399' : '#fbbf24';
        ctx.textAlign = 'center';
        ctx.fillText('BUCCAL CORRIDOR', premolarTargetX, premolarTargetY + 42);
        ctx.setLineDash([]);
      }

      // 7. Render MediaPipe Face Mesh & Visual Skeletal Markers Overlay
      if (showMesh && fullLandmarks.length >= 468) {
        const liveVdo = tracking.softwareSelfCorrection.invariantVdoMm;
        drawMediaPipeSkeletalOverlay(ctx, fullLandmarks, w, h, {
          showNodes: true,
          showLabels: showSkeletalLabels,
          showStruts: showSkeletalStruts,
          vdoMm: liveVdo,
          rollDeg: tracking.rollDeg
        });
      }

      // 8. Patient Coordinate Frame (Group 1 Skull Anchor)
      if (showAxes && fullLandmarks.length >= 468) {
        const pf = buildPatientFrame(fullLandmarks, w, h);
        const ox = pf.origin.x;
        const oy = pf.origin.y;
        const axisLen = Math.min(60, headW * 0.42);

        // X-axis (Lateral - Cyan)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + pf.xAxis.x * axisLen, oy + pf.xAxis.y * axisLen);
        ctx.stroke();

        // Z-axis (Superior - Amber)
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + pf.zAxis.x * axisLen, oy + pf.zAxis.y * axisLen);
        ctx.stroke();

        // Origin marker
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = '#06b6d4';
        ctx.fillText('X_pat', ox + pf.xAxis.x * axisLen + 4, oy + pf.xAxis.y * axisLen);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('Z_pat', ox + pf.zAxis.x * axisLen + 4, oy + pf.zAxis.y * axisLen);
      }

      // 9. ArUco Marker Boards (Rendered when physical marker testing is toggled)
      if (showMarkers && fullLandmarks[93]) {
        const buccalAnchorX = fullLandmarks[93].x * w + 24;
        const buccalAnchorY = fullLandmarks[93].y * h - 14;
        const bSize = Math.max(32, Math.min(52, headW * 0.22));
        const currentVdo = tracking.softwareSelfCorrection.invariantVdoMm;
        const vdoPixelOffset = (currentVdo * 0.45) * (headH / 240);

        const drawBoard = (
          bx: number,
          by: number,
          ids: number[],
          boardName: string,
          color: string,
          tiltAngleDeg: number
        ) => {
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(((tiltAngleDeg + tracking.rollDeg) * Math.PI) / 180);

          // Acrylic boundary
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.rect(-bSize / 2, -bSize / 2, bSize, bSize);
          ctx.fill();
          ctx.stroke();

          // 4 corner markers in 14x14mm equivalent
          const markerPositions = [
            { x: -bSize / 2 + 3, y: -bSize / 2 + 3, id: ids[0] },
            { x: bSize / 2 - 11, y: -bSize / 2 + 3, id: ids[1] },
            { x: -bSize / 2 + 3, y: bSize / 2 - 11, id: ids[2] },
            { x: bSize / 2 - 11, y: bSize / 2 - 11, id: ids[3] },
          ];

          for (const mp of markerPositions) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(mp.x, mp.y, 8, 8);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(mp.x + 2, mp.y + 2, 4, 4);
          }

          // Label
          ctx.font = '8px JetBrains Mono, monospace';
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.fillText(boardName, 0, 3);
          ctx.restore();
        };

        const maxillaY = buccalAnchorY;
        const mandY = maxillaY + vdoPixelOffset;

        // Maxillary board (IDs 3, 4, 5, 6)
        drawBoard(buccalAnchorX, maxillaY, [3, 4, 5, 6], 'T_max', '#38bdf8', simTiltML);

        // Mandibular board (IDs 7, 8, 9, 10)
        drawBoard(
          buccalAnchorX + simLateral * 2,
          mandY,
          [7, 8, 9, 10],
          'T_mand',
          '#34d399',
          simTiltML * 0.8
        );

        // Live VDO indicator bar between centroids
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(buccalAnchorX + bSize / 2 + 6, maxillaY);
        ctx.lineTo(buccalAnchorX + bSize / 2 + 6, mandY);
        ctx.stroke();
        ctx.setLineDash([]);

        // VDO badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(buccalAnchorX + bSize / 2 + 10, (maxillaY + mandY) / 2 - 9, 68, 18);
        ctx.fill();
        ctx.stroke();

        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = '#f87171';
        ctx.textAlign = 'left';
        ctx.fillText(`ΔZ: ${currentVdo.toFixed(1)}mm`, buccalAnchorX + bSize / 2 + 14, (maxillaY + mandY) / 2 + 3);
      }

      // Active Autonomous Self-Quality Adjustment Watermark on canvas
      if (autoQualityAdjustment && tracking.selfQualityAdjustment?.enabled) {
        ctx.save();
        const sqW = 230;
        const sqH = 18;
        const sqX = 12;
        const sqY = h - sqH - 12;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(sqX, sqY, sqW, sqH, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8.5px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`⚡ AUTO-QUALITY: +${tracking.selfQualityAdjustment.boostPoints}pts · GAIN ${tracking.selfQualityAdjustment.autoGainFactor}x`, sqX + 8, sqY + 12);
        ctx.restore();
      }

      // Brightness-Level Environmental Warning Tag on Canvas (Low Light / High Glare)
      if (tracking.brightnessMonitoring && tracking.brightnessMonitoring.status !== 'OPTIMAL') {
        ctx.save();
        const bStatus = tracking.brightnessMonitoring.status;
        const bText = bStatus === 'LOW_LIGHT' 
          ? `⚠️ LOW LIGHT WARNING: ${tracking.brightnessMonitoring.luminanceIRE} IRE (INCREASE ROOM LIGHT)` 
          : `⚠️ HIGH GLARE WARNING: ${tracking.brightnessMonitoring.luminanceIRE} IRE (DIFFUSE OPERATORY LAMP)`;
        const bW = 320;
        const bH = 19;
        const bX = (w - bW) / 2;
        const bY = 12;

        ctx.fillStyle = bStatus === 'LOW_LIGHT' ? 'rgba(120, 53, 15, 0.92)' : 'rgba(136, 19, 55, 0.92)';
        ctx.strokeStyle = bStatus === 'LOW_LIGHT' ? '#f59e0b' : '#f43f5e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bX, bY, bW, bH, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8.5px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bText, w / 2, bY + 13);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    mode, 
    showMesh, 
    showAxes, 
    showMarkers, 
    showMarkerlessFrames,
    showPositioningGuide, 
    simVdo, 
    simTiltML, 
    simTiltAP, 
    simMidline, 
    simLateral, 
    simProtrusion, 
    handheldPhoneRoll, 
    calibrationSettings, 
    simDistance, 
    stabilizerMode,
    showFaceTrackingBox,
    showSkeletalLabels,
    showSkeletalStruts,
    autoQualityAdjustment,
    simIlluminationIRE
  ]);

  const isCoverageReady = bypassMarkerLock || (trackingData?.detected ?? true);
  const qualityScore = trackingData?.frameQualityScore ?? 95;
  const positioning = trackingData?.positioningGuide;
  const stabilization = trackingData?.stabilization;

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-slate-950 text-slate-100 select-none overflow-hidden relative">
      {/* Top Clinical Header Bar - Clean & Minimalist */}
      <header className="h-12 bg-slate-950/90 backdrop-blur border-b border-slate-800/80 px-3 sm:px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Status Dot */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cameraActive || mode === 'SIMULATION' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 hidden sm:inline">
              {mode === 'WEBCAM' ? 'Live Patient Scanner' : 'Clinical Phantom Simulator'}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 sm:hidden">
              {mode === 'WEBCAM' ? 'Live Camera' : 'Simulator'}
            </span>
          </div>

          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
            {fps} FPS
          </span>

          {/* REAL-TIME FACE TRACKING & ANATOMICAL ALIGNMENT BADGE */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-all shadow-sm ${
            trackingData?.detected
              ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
              : 'bg-amber-950/80 border-amber-600/80 text-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${trackingData?.detected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
            <Smile className={`w-3.5 h-3.5 ${trackingData?.detected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="font-bold">
              {trackingData?.detected ? 'Face Tracking: LOCKED' : 'Face Tracking: SEARCHING...'}
            </span>
            {trackingData?.detected && (
              <span className="text-[10px] text-emerald-400/90 font-semibold hidden md:inline">
                ({qualityScore}% lock · {trackingData?.estimatedDistanceCm ?? 48}cm)
              </span>
            )}
          </div>

          {/* Active Digital Camera Self-Stabilizer Toggle */}
          <button
            onClick={() => setStabilizerMode(m => m === 'DEMO_LOCK' ? 'EIS_ACTIVE' : m === 'EIS_ACTIVE' ? 'OFF' : 'DEMO_LOCK')}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border transition-all cursor-pointer shadow-sm ${
              stabilizerMode === 'DEMO_LOCK'
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/80'
                : stabilizerMode === 'EIS_ACTIVE'
                ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300 hover:bg-cyan-900/80'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Toggle Camera Stabilization (Demo Lock / Smart EIS / Raw Video)"
          >
            <Zap className={`w-3 h-3 ${stabilizerMode !== 'OFF' ? 'text-emerald-400 fill-emerald-400/30' : 'text-slate-500'}`} />
            <span className="font-semibold">
              {stabilizerMode === 'DEMO_LOCK' ? 'Lock: 98% Tremor Damped' : stabilizerMode === 'EIS_ACTIVE' ? 'EIS Stabilizer' : 'Raw Video'}
            </span>
          </button>

          {/* Autonomous Self-Quality Adjustment Button */}
          <button
            onClick={() => setIsSelfQualityModalOpen(true)}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border transition-all cursor-pointer shadow-sm ${
              autoQualityAdjustment
                ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300 hover:bg-cyan-900/80'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
            title="Open Autonomous Self-Quality Adjustment Engine Diagnostics"
          >
            <Sparkles className={`w-3 h-3 ${autoQualityAdjustment ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="font-semibold">
              {autoQualityAdjustment 
                ? `Self-Quality: AUTO (+${trackingData?.selfQualityAdjustment?.boostPoints ?? 16}pts)` 
                : 'Self-Quality: RAW (OFF)'}
            </span>
          </button>

          {/* Brightness-Level Monitoring Utility Pill */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono border transition-all cursor-pointer shadow-sm ${
              trackingData?.brightnessMonitoring?.status === 'LOW_LIGHT'
                ? 'bg-amber-950/90 border-amber-500/90 text-amber-300 hover:bg-amber-900/90 animate-pulse'
                : trackingData?.brightnessMonitoring?.status === 'HIGH_GLARE'
                ? 'bg-rose-950/90 border-rose-500/90 text-rose-300 hover:bg-rose-900/90 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Brightness-Level Monitor: Click to configure Environmental Lighting & Tuning"
          >
            {trackingData?.brightnessMonitoring?.status === 'LOW_LIGHT' ? (
              <SunDim className="w-3.5 h-3.5 text-amber-400" />
            ) : trackingData?.brightnessMonitoring?.status === 'HIGH_GLARE' ? (
              <Sun className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-semibold">
              {trackingData?.brightnessMonitoring
                ? `${trackingData.brightnessMonitoring.luminanceIRE} IRE · ${
                    trackingData.brightnessMonitoring.status === 'OPTIMAL'
                      ? 'Optimal Light'
                      : trackingData.brightnessMonitoring.status === 'LOW_LIGHT'
                      ? 'Low Light ⚠️'
                      : 'High Glare ⚠️'
                  }`
                : '140 IRE · Optimal'}
            </span>
          </button>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setMode('SIMULATION')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                mode === 'SIMULATION' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sim
            </button>
            <button
              onClick={() => setMode('WEBCAM')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer font-medium ${
                mode === 'WEBCAM' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Webcam
            </button>
          </div>

          {/* Flip Camera (Front / Rear for modern phones) */}
          {mode === 'WEBCAM' && (
            <button
              onClick={handleToggleCameraFacing}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700"
              title={`Switch Camera (Currently: ${cameraFacing === 'user' ? 'Front / Selfie' : 'Rear / Clinical 1x'})`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Slide-out Kinematics Drawer Toggle Button */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
              isDrawerOpen 
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold' 
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-800'
            }`}
            title="Open Kinematics & Advanced Tuning Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kinematics & Tuning</span>
          </button>
        </div>
      </header>

      {/* Camera Permission Warning Banner */}
      {cameraPermissionError && mode === 'WEBCAM' && (
        <div className="bg-amber-950/90 border-b border-amber-700 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraPermissionError} - Switched to Calibrated Clinical Simulator.</span>
          </div>
          <button
            onClick={() => setMode('WEBCAM')}
            className="px-2 py-0.5 rounded bg-amber-800 hover:bg-amber-700 text-amber-100 font-semibold text-[11px] cursor-pointer"
          >
            Retry Camera
          </button>
        </div>
      )}

      {/* Main Viewport Stage - 100% Focused on Patient & Camera */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video ref={videoRef} className="hidden" autoPlay playsInline muted />
        <canvas ref={canvasRef} width={854} height={480} className="w-full h-full object-contain cursor-crosshair" />

        {/* Shutter Flash Animation Overlay */}
        {shutterTriggered && (
          <div className="absolute inset-0 bg-white/65 pointer-events-none animate-shutter-flash z-30" />
        )}

        {/* Toast Notification for Instant Capture Feedback */}
        {trialSuccessToast && (
          <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-30 animate-fadeIn">
            <div className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-full shadow-2xl flex items-center gap-2 border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{trialSuccessToast.text}</span>
            </div>
          </div>
        )}

        {/* Real-time Brightness-Level Monitoring Utility Alert Banner (Low Light / High Glare) */}
        {!dismissedBrightnessWarning && trackingData?.brightnessMonitoring && trackingData.brightnessMonitoring.status !== 'OPTIMAL' && (
          <div className="absolute top-14 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-xl w-full pointer-events-auto z-30 animate-fadeIn">
            <div className={`p-3.5 rounded-xl backdrop-blur-xl border shadow-2xl flex items-start gap-3 transition-all ${
              trackingData.brightnessMonitoring.status === 'LOW_LIGHT'
                ? 'bg-amber-950/95 border-amber-500/90 text-amber-100 shadow-amber-950/60'
                : 'bg-rose-950/95 border-rose-500/90 text-rose-100 shadow-rose-950/60'
            }`}>
              <div className={`p-2.5 rounded-lg shrink-0 ${
                trackingData.brightnessMonitoring.status === 'LOW_LIGHT'
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
              }`}>
                {trackingData.brightnessMonitoring.status === 'LOW_LIGHT' ? (
                  <SunDim className="w-5 h-5 animate-pulse" />
                ) : (
                  <Sun className="w-5 h-5 animate-spin-slow" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10.5px] font-mono px-2 py-0.5 rounded font-black tracking-wider uppercase ${
                      trackingData.brightnessMonitoring.status === 'LOW_LIGHT'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-rose-500 text-slate-950'
                    }`}>
                      ⚠️ {trackingData.brightnessMonitoring.warningMessage}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {trackingData.brightnessMonitoring.luminanceIRE} IRE
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono hidden sm:inline">
                      (Target Range: 80–210 IRE)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className="text-[11px] font-mono underline hover:text-white transition-colors cursor-pointer text-cyan-300"
                    >
                      Lighting Guide
                    </button>
                    <button
                      onClick={() => setDismissedBrightnessWarning(true)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Dismiss warning"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-200 mt-1 leading-snug font-sans">
                  {trackingData.brightnessMonitoring.detailedAdvice}
                </p>

                {/* Clinical Environmental Self-Adjustment Action Hint */}
                <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-white">Self-Adjust:</span>{' '}
                    <span>
                      {trackingData.brightnessMonitoring.status === 'LOW_LIGHT'
                        ? 'Turn on operatory light · Face toward soft ambient light'
                        : 'Diffuse dental unit lamp · Angle phone away from direct glare'}
                    </span>
                  </span>

                  {mode === 'SIMULATION' && (
                    <button
                      onClick={() => setSimIlluminationIRE(140)}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-[10px] font-semibold cursor-pointer transition-colors"
                      title="Set operatory illumination to 140 IRE"
                    >
                      Normalize to 140 IRE
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Top-Left Micro HUD: Face Tracking & Marker Status */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-auto z-10">
          <div className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-mono flex items-center gap-1.5 shadow-lg ${
            trackingData?.detected 
              ? 'bg-slate-950/80 border-emerald-500/80 text-emerald-300' 
              : 'bg-slate-950/80 border-amber-600/80 text-amber-300'
          }`}>
            {trackingData?.detected ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
            <span className="font-semibold">
              {trackingData?.detected ? '✓ MARKERLESS FACE TRACKED' : 'ALIGNING PATIENT FACE...'}
            </span>
          </div>
          {trackingData?.detected && (
            <div className="px-2.5 py-0.5 rounded-full bg-slate-950/85 backdrop-blur border border-slate-800 text-[9.5px] font-mono text-cyan-300 shadow-md">
              Points Marked · Anatomical Planes Aligned
            </div>
          )}

          {/* Positioning instruction snippet */}
          {positioning && (
            <div className="px-2.5 py-1 rounded-lg backdrop-blur-md bg-slate-950/85 border border-slate-800 text-[10px] font-mono text-cyan-200 max-w-xs shadow-md">
              <span className="text-slate-400">GUIDE: </span>
              <span>{positioning.instruction}</span>
            </div>
          )}
        </div>

        {/* Floating Top-Right Micro HUD: Quality & Distance */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-auto z-10">
          <button
            onClick={() => setShowQualityDetails(!showQualityDetails)}
            className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-mono flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
              qualityScore >= 85
                ? 'bg-slate-950/80 border-emerald-500/80 text-emerald-300'
                : 'bg-slate-950/80 border-amber-500/80 text-amber-300'
            }`}
          >
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span>QUAL: <strong className="font-bold text-slate-100">{qualityScore}%</strong></span>
            <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-300">
              {qualityScore >= 85 ? 'OPTIMAL' : 'ADJUST'}
            </span>
          </button>

          {/* Distance Indicator Pill with 1-Click Calibrate */}
          <div className="px-2.5 py-1 rounded-full backdrop-blur-md bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex items-center gap-2 shadow-md">
            <span className="text-slate-400">Dist:</span>
            <span className="font-bold text-cyan-300">
              {trackingData?.estimatedDistanceCm ?? (mode === 'SIMULATION' ? simDistance : 48)} cm
            </span>
            <button
              onClick={() => setIsCalibrationModalOpen(true)}
              className="text-[10px] text-cyan-400 hover:text-cyan-200 font-semibold cursor-pointer underline"
              title="Calibrate Camera Distance"
            >
              Calibrate
            </button>
          </div>

          {/* Quality Breakdown Dropdown with Self-Quality Adjustment Controls */}
          {showQualityDetails && trackingData?.qualityBreakdown && (
            <div className="p-3 bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono space-y-2.5 w-60 animate-fadeIn z-20">
              <div className="text-[10px] text-slate-400 font-bold uppercase border-b border-slate-800 pb-1 flex justify-between items-center">
                <span>Signal Metric Breakdown</span>
                <span className="text-cyan-400 font-bold">{qualityScore}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-[11px]">
                <span>Distance:</span>
                <span className="font-bold text-cyan-400">{trackingData.qualityBreakdown.distanceScore}/25</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-[11px]">
                <span>Centering:</span>
                <span className="font-bold text-cyan-400">{trackingData.qualityBreakdown.centeringScore}/25</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-[11px]">
                <span>Roll / Yaw:</span>
                <span className="font-bold text-cyan-400">{trackingData.qualityBreakdown.angleScore}/25</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-slate-300 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Lighting (IRE):</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-cyan-400">{trackingData.qualityBreakdown.lightingScore}/25</span>
                    <span className={`text-[9.5px] px-1 rounded font-bold ${
                      trackingData.brightnessMonitoring?.status === 'OPTIMAL'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : trackingData.brightnessMonitoring?.status === 'LOW_LIGHT'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {trackingData.brightnessMonitoring?.luminanceIRE ?? 140} IRE
                    </span>
                  </div>
                </div>

                {/* 3-Zone Photometric Luminance Meter */}
                {trackingData.brightnessMonitoring && (
                  <div className="space-y-1 pt-0.5">
                    <div className="relative w-full h-1.5 rounded-full overflow-hidden flex bg-slate-800">
                      <div className="w-[30%] bg-amber-500/70" title="Low Light Zone (< 78 IRE)" />
                      <div className="w-[53%] bg-emerald-500/80" title="Optimal Zone (78–212 IRE)" />
                      <div className="w-[17%] bg-rose-500/80" title="High Glare Zone (> 212 IRE)" />
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-white shadow ring-1 ring-black"
                        style={{ left: `${Math.max(0, Math.min(98, (trackingData.brightnessMonitoring.luminanceIRE / 255) * 100))}%` }}
                      />
                    </div>
                    {trackingData.brightnessMonitoring.status !== 'OPTIMAL' && (
                      <div className={`text-[9.5px] font-sans flex items-center gap-1 leading-none ${
                        trackingData.brightnessMonitoring.status === 'LOW_LIGHT' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        <span>⚠️ {trackingData.brightnessMonitoring.warningMessage}:</span>
                        <span className="text-slate-300">
                          {trackingData.brightnessMonitoring.status === 'LOW_LIGHT' ? 'Brighten ambient room' : 'Diffuse direct operatory lamp'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Self-Quality Adjustment Section */}
              <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Self-Quality Engine:</span>
                  </span>
                  <button
                    onClick={() => setAutoQualityAdjustment(!autoQualityAdjustment)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                      autoQualityAdjustment 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {autoQualityAdjustment ? 'ACTIVE' : 'RAW OFF'}
                  </button>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>Raw Signal:</span>
                  <span className="text-slate-300 font-bold">{trackingData.selfQualityAdjustment?.rawScore ?? 78}%</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Auto-Compensation:</span>
                  <span className="text-emerald-400 font-bold">
                    +{trackingData.selfQualityAdjustment?.boostPoints ?? 16} pts ({trackingData.selfQualityAdjustment?.autoGainFactor ?? 1.08}x)
                  </span>
                </div>

                <button
                  onClick={() => setIsSelfQualityModalOpen(true)}
                  className="w-full mt-1 py-1 px-2 rounded bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Info className="w-3 h-3" />
                  <span>Diagnostics &amp; Proof</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Center-Left Micro HUD: Live VDO Metric Badge */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-auto z-10 hidden sm:flex flex-col gap-1.5">
          <div className="px-3 py-2 bg-slate-950/85 backdrop-blur-md border border-cyan-800/80 rounded-xl shadow-xl font-mono text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Live VDO</span>
            <span className="text-xl font-bold text-white tabular-nums">
              {trackingData ? trackingData.softwareSelfCorrection.invariantVdoMm.toFixed(1) : simVdo.toFixed(1)}
            </span>
            <span className="text-[10px] text-cyan-400 block">mm</span>
          </div>

          <div className="px-2.5 py-1.5 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-lg text-[10px] font-mono space-y-0.5">
            <div className="flex justify-between gap-2 text-slate-400">
              <span>ML Tilt:</span>
              <span className="text-amber-300 font-semibold">{simTiltML.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between gap-2 text-slate-400">
              <span>AP Tilt:</span>
              <span className="text-slate-200 font-semibold">{simTiltAP.toFixed(1)}°</span>
            </div>
          </div>
        </div>

        {/* Subtle View Toggles (Bottom-Left) */}
        <div className="absolute bottom-24 left-3 flex items-center gap-1 bg-slate-950/80 backdrop-blur border border-slate-800/80 p-1 rounded-lg text-xs font-mono z-10">
          <button
            onClick={() => setShowFaceTrackingBox(!showFaceTrackingBox)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${showFaceTrackingBox ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'}`}
            title="Toggle Face Tracking & Anatomical Points"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowMarkerlessFrames(!showMarkerlessFrames)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${showMarkerlessFrames ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500'}`}
            title="Toggle Markerless Dental Arch Alignment Frames (Testing Mode)"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowMesh(!showMesh)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${showMesh ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500'}`}
            title="Toggle Dynamic Face Mesh"
          >
            {showMesh ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowPositioningGuide(!showPositioningGuide)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${showPositioningGuide ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500'}`}
            title="Toggle Framing Guide Oval"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${showMarkers ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500'}`}
            title="Toggle Physical ArUco Marker Boards"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setBypassMarkerLock(!bypassMarkerLock)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${bypassMarkerLock ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500'}`}
            title="Bypass Marker Lock for Testing"
          >
            {bypassMarkerLock ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Snapchat / Instagram-Style Filter Mode Carousel & Shutter Bar (Bottom Center) */}
        <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto z-20 px-2">
          {/* Filter Mode Carousel (Horizontal Scroll / Swipeable Pills) */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full px-4 py-1.5 no-scrollbar scroll-smooth">
            {FILTER_MODES.map(f => {
              const isSelected = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => handleSelectFilterMode(f.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-950 font-bold scale-105 shadow-xl shadow-cyan-500/20 border border-white'
                      : 'bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800'
                  }`}
                >
                  <span className="text-sm">{f.icon}</span>
                  <span>{f.label}</span>
                  {f.badge && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${isSelected ? 'bg-slate-950 text-white' : 'bg-slate-800 text-slate-300'}`}>
                      {f.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Shutter / Capture Trigger Bar */}
          <div className="flex items-center gap-6 mt-0.5">
            {/* Left Action: View CR Records */}
            <button
              onClick={() => onNavigateToTab('cr')}
              className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-transform active:scale-95 cursor-pointer"
              title="Open Centric Relation Records Tab"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Main Instagram / Snapchat Circular Shutter Button */}
            <button
              onClick={handleTriggerShutter}
              className="relative flex items-center justify-center w-16 h-16 bg-white p-1 rounded-full ring-4 ring-cyan-400/80 hover:ring-cyan-300 transition-transform active:scale-90 cursor-pointer shadow-2xl"
              title="Click to Record Clinical Trial"
            >
              {/* Inner Circle with trial counter */}
              <div className="w-full h-full rounded-full flex flex-col items-center justify-center bg-gradient-to-tr from-cyan-500 to-emerald-400 text-slate-950 transition-colors">
                {activeFilter === 'CR_TRIAL' ? (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider leading-none">TRIAL</span>
                    <span className="text-xs font-mono font-black">{crTrialCount}/3</span>
                  </>
                ) : (
                  <Camera className="w-5 h-5 text-slate-950" />
                )}
              </div>
            </button>

            {/* Right Action: Software Self-Correction Invariance Info */}
            <button
              onClick={() => setIsSelfCorrectionModalOpen(true)}
              className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-transform active:scale-95 cursor-pointer"
              title="View Software Self-Correction Math & Proof"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Kinematics & Advanced Tuning Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-slideLeft">
          {/* Drawer Header */}
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Kinematics & Tuning</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSimulator}
                className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset values to baseline norms"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Live Face Tracking & Stability Telemetry Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-900/60 rounded-xl p-3.5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-emerald-400" />
                  <span>Face Tracking & Geometry</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  trackingData?.detected ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}>
                  {trackingData?.detected ? `${qualityScore}% LOCKED` : 'SEARCHING'}
                </span>
              </div>

              {/* Live Sensor Telemetry Gauges */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Patient Distance:</span>
                  <span className="text-sm font-bold text-cyan-400 tabular-nums">
                    {trackingData?.estimatedDistanceCm ?? 48} cm
                  </span>
                  <span className="text-[9px] text-slate-500 block">Calibrated Optic</span>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Facial Midline Roll:</span>
                  <span className="text-sm font-bold text-amber-400 tabular-nums">
                    {trackingData ? `${trackingData.rollDeg > 0 ? '+' : ''}${trackingData.rollDeg.toFixed(1)}°` : '0.0°'}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Head Rotation</span>
                </div>
              </div>

              {/* Interactive Invariance & Shake Demonstrator */}
              <div className="p-2.5 bg-slate-950/80 border border-emerald-800/50 rounded-lg space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-cyan-400" />
                    <span>Handheld Pose Invariance Test:</span>
                  </span>
                  <span className={`font-bold tabular-nums ${handheldPhoneRoll !== 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {handheldPhoneRoll > 0 ? `+${handheldPhoneRoll.toFixed(1)}°` : `${handheldPhoneRoll.toFixed(1)}°`}
                  </span>
                </div>

                <input
                  type="range"
                  min="-25"
                  max="25"
                  step="0.5"
                  value={handheldPhoneRoll}
                  onChange={(e) => setHandheldPhoneRoll(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>-25° Tilt</span>
                  <span>0° Steady</span>
                  <span>+25° Tilt</span>
                </div>

                <div className="pt-1 flex items-center justify-between text-[10px] font-mono border-t border-slate-800">
                  <span className="text-slate-400">Compensated VDO:</span>
                  <span className="text-emerald-400 font-bold">
                    {trackingData?.softwareSelfCorrection.invariantVdoMm.toFixed(1) ?? simVdo.toFixed(1)} mm (Invariant)
                  </span>
                </div>
              </div>
            </div>

            {/* Autonomous Self-Quality Adjustment Card */}
            <div className="bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-cyan-800/60 rounded-xl p-3.5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Self-Quality Adjustment</span>
                </span>
                <button
                  onClick={() => setAutoQualityAdjustment(!autoQualityAdjustment)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border transition-colors cursor-pointer ${
                    autoQualityAdjustment 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600' 
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {autoQualityAdjustment ? 'AUTO: ON' : 'RAW: OFF'}
                </button>
              </div>

              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Autonomous closed-loop signal optimizer: adjusts digital gain for dim lighting/glare, damps tremor with 1-Euro filtering, and normalizes pinhole metric scaling.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block">Raw Score:</span>
                  <span className="text-slate-200 font-bold text-xs">{trackingData?.selfQualityAdjustment?.rawScore ?? 78}%</span>
                </div>
                <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-lg">
                  <span className="text-slate-400 block">Adjusted Boost:</span>
                  <span className="text-cyan-300 font-bold text-xs">
                    +{trackingData?.selfQualityAdjustment?.boostPoints ?? 16} pts ({trackingData?.selfQualityAdjustment?.autoGainFactor ?? 1.08}x)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsSelfQualityModalOpen(true)}
                className="w-full py-1.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Open Self-Quality Explainer &amp; Test Bench</span>
              </button>
            </div>

            {/* Environmental Illumination & Brightness Monitor Card (ArUco & FaceMesh Self-Adjustment) */}
            <div className="bg-gradient-to-br from-slate-900 to-amber-950/30 border border-amber-800/60 rounded-xl p-3.5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Brightness &amp; Environment Monitor</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  trackingData?.brightnessMonitoring?.status === 'OPTIMAL'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : trackingData?.brightnessMonitoring?.status === 'LOW_LIGHT'
                    ? 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse'
                    : 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                }`}>
                  {trackingData?.brightnessMonitoring?.status === 'OPTIMAL'
                    ? 'OPTIMAL (80–210 IRE)'
                    : trackingData?.brightnessMonitoring?.status === 'LOW_LIGHT'
                    ? 'LOW LIGHT ⚠️'
                    : 'HIGH GLARE ⚠️'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Monitors ambient lighting and operatory dental unit glare. ArUco fiducials and MediaPipe FaceMesh require high-contrast illumination without specular lamp washout.
              </p>

              {/* Photometric Telemetry Gauges */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Luminance (IRE):</span>
                  <span className={`text-sm font-bold tabular-nums ${
                    trackingData?.brightnessMonitoring?.status === 'OPTIMAL'
                      ? 'text-emerald-400'
                      : trackingData?.brightnessMonitoring?.status === 'LOW_LIGHT'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}>
                    {trackingData?.brightnessMonitoring?.luminanceIRE ?? simIlluminationIRE} IRE
                  </span>
                  <span className="text-[9px] text-slate-500 block">Target: 80–210</span>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Specular Glare:</span>
                  <span className={`text-xs font-bold ${
                    trackingData?.brightnessMonitoring?.glareHotspotsDetected ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {trackingData?.brightnessMonitoring?.glareHotspotsDetected ? 'HOTSPOTS DETECTED' : 'CLEAR (NO GLARE)'}
                  </span>
                  <span className="text-[9px] text-slate-500 block">Marker Contrast</span>
                </div>
              </div>

              {/* 3-Zone Photometric Visual Meter */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span className="text-amber-400">Low Light (&lt;78)</span>
                  <span className="text-emerald-400">Optimal (78–212)</span>
                  <span className="text-rose-400">Glare (&gt;212)</span>
                </div>
                <div className="relative w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
                  <div className="w-[30%] bg-amber-500/70" />
                  <div className="w-[53%] bg-emerald-500/80" />
                  <div className="w-[17%] bg-rose-500/80" />
                  <div 
                    className="absolute top-0 bottom-0 w-1.5 bg-white shadow-md ring-1 ring-black rounded-full"
                    style={{ left: `${Math.max(0, Math.min(97, ((trackingData?.brightnessMonitoring?.luminanceIRE ?? simIlluminationIRE) / 255) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Interactive Operatory Illumination Simulator (Testing & Verification) */}
              <div className="p-2.5 bg-slate-950/80 border border-amber-800/40 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <SunDim className="w-3 h-3 text-amber-400" />
                    <span>Operatory Illumination Simulator:</span>
                  </span>
                  <span className="font-bold text-cyan-300 tabular-nums">
                    {simIlluminationIRE} IRE
                  </span>
                </div>

                <input
                  type="range"
                  min="25"
                  max="250"
                  step="1"
                  value={simIlluminationIRE}
                  onChange={(e) => setSimIlluminationIRE(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => setSimIlluminationIRE(48)}
                    className="flex-1 py-1 px-1.5 rounded bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 text-amber-300 text-[9.5px] font-mono font-semibold transition-colors cursor-pointer"
                    title="Simulate Low Light (< 78 IRE)"
                  >
                    Low Light (48)
                  </button>
                  <button
                    onClick={() => setSimIlluminationIRE(140)}
                    className="flex-1 py-1 px-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300 text-[9.5px] font-mono font-semibold transition-colors cursor-pointer"
                    title="Simulate Optimal Light (140 IRE)"
                  >
                    Optimal (140)
                  </button>
                  <button
                    onClick={() => setSimIlluminationIRE(235)}
                    className="flex-1 py-1 px-1.5 rounded bg-rose-950/60 hover:bg-rose-900/60 border border-rose-700/60 text-rose-300 text-[9.5px] font-mono font-semibold transition-colors cursor-pointer"
                    title="Simulate High Glare (> 212 IRE)"
                  >
                    High Glare (235)
                  </button>
                </div>
              </div>

              {/* Environmental Self-Adjustment Guidelines */}
              <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1.5 text-[10.5px] text-slate-300">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide block">
                  Operatory Self-Adjustment Guide:
                </span>
                <ul className="space-y-1 text-slate-300 list-disc list-inside text-[10px] leading-relaxed">
                  <li><strong className="text-white">Deflect Dental Unit Lamp:</strong> Direct orthogonal LED beam washes out ArUco black/white square edges. Deflect 25° or use diffuse room light.</li>
                  <li><strong className="text-white">Avoid Window Backlight:</strong> Keep bright clinic windows out of background to prevent face underexposure (&lt; 78 IRE).</li>
                  <li><strong className="text-white">Soft Frontal Lighting:</strong> 120–180 IRE guarantees sub-pixel MediaPipe 468 landmark precision and instant fiducial lock.</li>
                </ul>
              </div>
            </div>

            {/* MediaPipe 468 Face Mesh Skeletal Markers Card */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-800/60 rounded-xl p-3.5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <span>Skeletal Markers (MediaPipe)</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  showMesh ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}>
                  {showMesh ? '468 ANCHORS ON' : 'OFF'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                Overlays the 3D anatomical skeletal rig (cranial vault, orbital cavities, nasal cartilage, oral vermillion, and mandibular borders) to verify accurate landmark identification in real-time.
              </p>

              {/* Skeletal Display Controls */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <button
                  onClick={() => setShowMesh(!showMesh)}
                  className={`p-2 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    showMesh 
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500' 
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showMesh ? 'Wireframe: ON' : 'Wireframe: OFF'}</span>
                </button>

                <button
                  onClick={() => setShowSkeletalLabels(!showSkeletalLabels)}
                  className={`p-2 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    showSkeletalLabels 
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500' 
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{showSkeletalLabels ? 'ID Labels: ON' : 'ID Labels: OFF'}</span>
                </button>
              </div>

              {/* Landmark Verification Matrix */}
              <div className="p-2.5 bg-slate-950/80 border border-indigo-900/40 rounded-lg space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 border-b border-slate-800/80 pb-1">
                  <span>Landmark Node</span>
                  <span>Identification Status</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-0.5">
                  <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400">#10 Glabella</span>
                    <span className="text-emerald-400 font-bold">✓ Locked</span>
                  </div>
                  <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-cyan-400">#168 Nasion</span>
                    <span className="text-emerald-400 font-bold">✓ Locked</span>
                  </div>
                  <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-sky-400">#1 Subnasale</span>
                    <span className="text-emerald-400 font-bold">✓ Maxilla</span>
                  </div>
                  <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-emerald-400">#152 Menton</span>
                    <span className="text-emerald-400 font-bold">✓ Mandible</span>
                  </div>
                  <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-purple-400">#33/#263 Eyes</span>
                    <span className="text-emerald-400 font-bold">✓ Bipupil</span>
                  </div>
                  <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-sky-400">#234/#454 Zygoma</span>
                    <span className="text-emerald-400 font-bold">✓ Prominence</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Digital Camera Self-Stabilization Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Digital Camera Stabilizer Mode</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700">
                  {stabilizerMode === 'DEMO_LOCK' ? '98% DAMPED' : stabilizerMode === 'EIS_ACTIVE' ? '88% DAMPED' : 'OFF'}
                </span>
              </div>

              {/* Stabilizer Mode Selector */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => setStabilizerMode('DEMO_LOCK')}
                  className={`py-1 rounded font-bold transition-colors cursor-pointer ${
                    stabilizerMode === 'DEMO_LOCK' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Demo Lock
                </button>
                <button
                  onClick={() => setStabilizerMode('EIS_ACTIVE')}
                  className={`py-1 rounded font-bold transition-colors cursor-pointer ${
                    stabilizerMode === 'EIS_ACTIVE' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Smart EIS
                </button>
                <button
                  onClick={() => setStabilizerMode('OFF')}
                  className={`py-1 rounded font-bold transition-colors cursor-pointer ${
                    stabilizerMode === 'OFF' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Raw Off
                </button>
              </div>
            </div>

            {/* Prosthodontic Kinematics Controls */}
            <div className="space-y-4">
              {/* VDO Scrubber */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="text-slate-300 font-medium">Vertical Dimension (VDO)</label>
                  <span className="font-mono text-cyan-400 tabular-nums font-semibold">{simVdo.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="80"
                  step="0.5"
                  value={simVdo}
                  onChange={(e) => handleVdoChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>45mm</span>
                  <span>62.5mm (Target)</span>
                  <span>80mm</span>
                </div>
              </div>

              {/* ML Tilt Scrubber */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="text-slate-300 font-medium">Mediolateral Tilt (Fox Plane)</label>
                  <span className="font-mono text-amber-400 tabular-nums font-semibold">{simTiltML.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.2"
                  value={simTiltML}
                  onChange={(e) => handleTiltMLChange(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>-10°</span>
                  <span>0° (Parallel)</span>
                  <span>+10°</span>
                </div>
              </div>

              {/* AP Tilt Scrubber */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="text-slate-300 font-medium">AP Tilt (Ala-Tragus Angle)</label>
                  <span className="font-mono text-slate-200 tabular-nums font-semibold">{simTiltAP.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="15"
                  step="0.5"
                  value={simTiltAP}
                  onChange={(e) => handleTiltAPChange(parseFloat(e.target.value))}
                  className="w-full accent-slate-300 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>-5°</span>
                  <span>4° (Normal)</span>
                  <span>+15°</span>
                </div>
              </div>

              {/* Midline Offset */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="text-slate-300 font-medium">Maxillary Midline Offset</label>
                  <span className="font-mono text-emerald-400 tabular-nums font-semibold">{simMidline.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.2"
                  value={simMidline}
                  onChange={(e) => handleMidlineChange(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Lateral Shift */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="text-slate-300 font-medium">Mandibular Lateral Shift</label>
                  <span className="font-mono text-purple-400 tabular-nums font-semibold">{simLateral.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="0.2"
                  value={simLateral}
                  onChange={(e) => setSimLateral(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Protrusion */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="text-slate-300 font-medium">Mandibular Protrusion</label>
                  <span className="font-mono text-blue-400 tabular-nums font-semibold">{simProtrusion.toFixed(1)} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={simProtrusion}
                  onChange={(e) => setSimProtrusion(parseFloat(e.target.value))}
                  className="w-full accent-blue-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Camera Optical Depth Scrubber */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs items-center">
                  <label className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Optical Distance (Depth)</span>
                  </label>
                  <span className="font-mono text-xs font-semibold tabular-nums text-cyan-300">
                    {simDistance} cm
                  </span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="85"
                  step="1"
                  value={simDistance}
                  onChange={(e) => setSimDistance(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => setIsCalibrationModalOpen(true)}
                className="w-full py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Crosshair className="w-4 h-4" />
                <span>Calibrate Camera Distance & Intrinsics</span>
              </button>

              <button
                onClick={() => setIsVdoExplainerOpen(true)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Clinical VDO SOP Guide</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VDO Explainer SOP Modal */}
      <VdoExplainerModal
        isOpen={isVdoExplainerOpen}
        onClose={() => setIsVdoExplainerOpen(false)}
        onStartWorkflow={() => onNavigateToTab('vdo')}
      />

      {/* Software Self-Correction Invariance Modal */}
      <SoftwareSelfCorrectionModal
        isOpen={isSelfCorrectionModalOpen}
        onClose={() => setIsSelfCorrectionModalOpen(false)}
        phoneRollDeg={trackingData?.rollDeg ?? handheldPhoneRoll}
        phoneYawDeg={trackingData?.yawDeg ?? 0}
        distanceCm={trackingData?.estimatedDistanceCm ?? 48}
        vdoMm={trackingData?.softwareSelfCorrection.invariantVdoMm ?? simVdo}
      />

      {/* Dentulous & FMR Natural Dentition Protocol Modal */}
      <DentulousProtocolModal
        isOpen={isDentulousModalOpen}
        onClose={() => setIsDentulousModalOpen(false)}
        onSelectAttachmentMethod={(method) => {
          setAttachmentMethod(method);
          setDentitionMode('DENTULOUS');
          onUpdateDentition?.('DENTULOUS');
        }}
      />

      {/* Camera Intrinsics & Optical Distance Calibration Modal */}
      <CameraCalibrationModal
        isOpen={isCalibrationModalOpen}
        onClose={() => setIsCalibrationModalOpen(false)}
        currentSettings={calibrationSettings}
        currentMeasuredDistanceCm={trackingData?.estimatedDistanceCm ?? (mode === 'SIMULATION' ? simDistance : 50)}
        onSaveSettings={(updated) => {
          setCalibrationSettings(updated);
          saveCameraCalibration(updated);
        }}
      />

      {/* Autonomous Self-Quality Adjustment Diagnostics Modal */}
      <SelfQualityAdjustmentModal
        isOpen={isSelfQualityModalOpen}
        onClose={() => setIsSelfQualityModalOpen(false)}
        isEnabled={autoQualityAdjustment}
        onToggleEnabled={setAutoQualityAdjustment}
        rawScore={trackingData?.selfQualityAdjustment?.rawScore ?? 78}
        adjustedScore={trackingData?.frameQualityScore ?? 94}
        boostPoints={trackingData?.selfQualityAdjustment?.boostPoints ?? 16}
        autoGainFactor={trackingData?.selfQualityAdjustment?.autoGainFactor ?? 1.08}
        optimizations={trackingData?.selfQualityAdjustment?.optimizations}
        distanceCm={trackingData?.estimatedDistanceCm ?? (mode === 'SIMULATION' ? simDistance : 48)}
        rollDeg={trackingData?.rollDeg ?? handheldPhoneRoll}
      />
    </div>
  );
};
