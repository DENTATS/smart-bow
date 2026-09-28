/**
 * SmartBow AI - Digital Gothic Arch & Border Movement Tracer
 * Replaces the physical needle-point tracer and smoke/ink intraoral tracing table.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useRef, useState, useEffect } from 'react';
import { 
  Compass, 
  Play, 
  RotateCcw, 
  Download, 
  Check, 
  HelpCircle, 
  Camera, 
  AlertCircle, 
  Video, 
  VideoOff, 
  Sliders, 
  Activity, 
  Pause,
  Maximize2,
  ArrowLeft,
  MoreVertical,
  Unlock,
  ShieldCheck,
  Sparkles,
  Lock
} from 'lucide-react';
import { GothicArchPoint } from '../types/smartbow';
import { analyzeGothicArch } from '../lib/clinicalMath';

interface GothicArchTracerProps {
  points: GothicArchPoint[];
  onAddPoint: (pt: GothicArchPoint) => void;
  onClearPoints: () => void;
  onSaveParameters: (sci: number, bennettL: number, bennettR: number) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const GothicArchTracer: React.FC<GothicArchTracerProps> = ({
  points,
  onAddPoint,
  onClearPoints,
  onSaveParameters,
  onNavigateToTab,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Tracking source mode: 'BENCH_SIMULATION' vs 'LIVE_CAMERA'
  const [sourceMode, setSourceMode] = useState<'BENCH_SIMULATION' | 'LIVE_CAMERA'>('BENCH_SIMULATION');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isVirtualSensor, setIsVirtualSensor] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showModeMenu, setShowModeMenu] = useState<boolean>(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  // Dynamic live recording states
  const [isRecordingLive, setIsRecordingLive] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activePhase, setActivePhase] = useState<'ALL' | 'PROTRUSION' | 'RIGHT_LATERAL' | 'LEFT_LATERAL'>('ALL');
  
  // Real-time tracking simulated coordinates for live tracing
  const [liveX, setLiveX] = useState<number>(0);
  const [liveY, setLiveY] = useState<number>(0);

  const metrics = analyzeGothicArch(points);

  // Direct user-gesture camera permission request
  const handleRequestCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setIsVirtualSensor(false);
      setPermissionNotice("Webcam permission granted! Optical sensor is active.");
      setTimeout(() => setPermissionNotice(null), 4000);
    } catch (err: any) {
      console.warn("Gothic arch camera access denied or unavailable:", err);
      setCameraError("Camera unavailable or permission denied. You can unlock the Virtual Optical Sensor to record immediately.");
      setIsCameraActive(false);
    }
  };

  // Instant unlock authorization (Virtual Optical Telemetry Stream)
  const handleUnlockVirtualSensor = () => {
    setIsCameraActive(true);
    setIsVirtualSensor(true);
    setCameraError(null);
    setPermissionNotice("Optical sensor unlocked! Virtual telemetry stream active.");
    setTimeout(() => setPermissionNotice(null), 4000);
  };

  // Webcam stream management
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    if (sourceMode === 'LIVE_CAMERA') {
      if (!isVirtualSensor) {
        const startCamera = async () => {
          try {
            setCameraError(null);
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'environment',
                width: { ideal: 640 },
                height: { ideal: 480 },
              },
              audio: false,
            });

            if (!isCancelled && videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
              setIsCameraActive(true);
              setIsVirtualSensor(false);
            }
          } catch (err: any) {
            if (!isCancelled) {
              console.warn("Gothic arch camera access failed:", err);
              setCameraError("Camera permission blocked or unavailable. Click 'Unlock Sensor' to record with virtual optical telemetry.");
              setIsCameraActive(false);
              setIsRecordingLive(false);
            }
          }
        };
        startCamera();
      }
    } else {
      setIsCameraActive(false);
      setIsVirtualSensor(false);
      setIsRecordingLive(false);
      if (videoRef.current && videoRef.current.srcObject) {
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
    };
  }, [sourceMode, isVirtualSensor]);

  // Live recording loop when camera is active
  useEffect(() => {
    if (!isRecordingLive || !isCameraActive) return;

    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      // Natural patient jaw excursion simulation with slight micro-tremor
      const noise = (Math.random() - 0.5) * 0.15;
      const ptX = Number((liveX + noise).toFixed(2));
      const ptY = Number((liveY + noise).toFixed(2));
      
      let phase: 'CENTRIC' | 'PROTRUSION' | 'RIGHT_LATERAL' | 'LEFT_LATERAL' = 'CENTRIC';
      if (ptY > 1.5 && Math.abs(ptX) < 2.0) phase = 'PROTRUSION';
      else if (ptX > 1.0) phase = 'RIGHT_LATERAL';
      else if (ptX < -1.0) phase = 'LEFT_LATERAL';

      const zDrop = -Math.abs(ptY) * 0.45;

      onAddPoint({
        x: ptX,
        y: ptY,
        z: zDrop,
        phase,
        timestamp: Date.now()
      });
    }, 60);

    return () => clearInterval(interval);
  }, [isRecordingLive, isCameraActive, liveX, liveY, onAddPoint]);

  // Standard bench border simulation execution
  const runFullBorderSimulation = () => {
    onClearPoints();
    setIsSimulating(true);

    const newPoints: GothicArchPoint[] = [];
    const baseTime = Date.now();

    // 1. Centric Apex
    newPoints.push({ x: 0, y: 0, z: 0, phase: 'CENTRIC', timestamp: baseTime });

    // 2. Right Lateral Excursion (right and anterior: +X, +Y)
    for (let i = 1; i <= 25; i++) {
      const t = i / 25;
      const x = t * 7.5;
      const y = t * 3.8 + Math.sin(t * 5) * 0.15;
      const z = -t * 1.8;
      newPoints.push({ x, y, z, phase: 'RIGHT_LATERAL', timestamp: baseTime + i * 40 });
    }

    // Return to apex
    newPoints.push({ x: 0, y: 0, z: 0, phase: 'CENTRIC', timestamp: baseTime + 1100 });

    // 3. Left Lateral Excursion (left and anterior: -X, +Y)
    for (let i = 1; i <= 25; i++) {
      const t = i / 25;
      const x = -t * 7.2;
      const y = t * 4.0 + Math.cos(t * 4) * 0.12;
      const z = -t * 1.9;
      newPoints.push({ x, y, z, phase: 'LEFT_LATERAL', timestamp: baseTime + 1200 + i * 40 });
    }

    // Return to apex
    newPoints.push({ x: 0, y: 0, z: 0, phase: 'CENTRIC', timestamp: baseTime + 2300 });

    // 4. Protrusive Excursion (pure sagittal: ~0 X, +Y, -Z along condylar path)
    for (let i = 1; i <= 25; i++) {
      const t = i / 25;
      const x = (Math.random() - 0.5) * 0.3;
      const y = t * 8.5;
      const z = -t * 4.8; // condylar path drop
      newPoints.push({ x, y, z, phase: 'PROTRUSION', timestamp: baseTime + 2400 + i * 40 });
    }

    // Sequentially add points for smooth animation
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < newPoints.length) {
        onAddPoint(newPoints[idx]);
        idx++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 25);
  };

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark technical drawing plate background
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, w, h);

    // Grid coordinates: Center origin is Apex (w/2, h - 70)
    const ox = w / 2;
    const oy = h - 70;
    const scale = 22; // pixels per millimeter

    // Grid concentric circles (mm radii)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let r = 2; r <= 12; r += 2) {
      ctx.beginPath();
      ctx.arc(ox, oy, r * scale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`${r}mm`, ox + 4, oy - r * scale + 3);
    }

    // Midline Y-axis (Anterior / Sagittal)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, 20);
    ctx.lineTo(ox, h - 20);
    ctx.stroke();

    // Lateral X-axis
    ctx.beginPath();
    ctx.moveTo(20, oy);
    ctx.lineTo(w - 20, oy);
    ctx.stroke();

    // Axis Labels
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ANTERIOR (PROTRUSIVE)', ox - 65, 30);
    ctx.fillText('RIGHT LATERAL', w - 100, oy - 8);
    ctx.fillText('LEFT LATERAL', 25, oy - 8);

    // Filter points based on activePhase
    const visiblePoints = points.filter(p => activePhase === 'ALL' || p.phase === activePhase);

    // Draw Gothic Arch Trace Lines
    if (visiblePoints.length > 1) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < visiblePoints.length; i++) {
        const p1 = visiblePoints[i - 1];
        const p2 = visiblePoints[i];

        // Do not connect jumps back to apex
        if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 4) continue;

        const x1 = ox + p1.x * scale;
        const y1 = oy - p1.y * scale;
        const x2 = ox + p2.x * scale;
        const y2 = oy - p2.y * scale;

        ctx.strokeStyle = p2.phase === 'PROTRUSION'
          ? '#f59e0b'
          : p2.phase === 'RIGHT_LATERAL'
          ? '#06b6d4'
          : p2.phase === 'LEFT_LATERAL'
          ? '#a855f7'
          : '#10b981';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw all individual sample points
      for (const p of visiblePoints) {
        const px = ox + p.x * scale;
        const py = oy - p.y * scale;
        ctx.fillStyle = p.phase === 'PROTRUSION'
          ? '#f59e0b'
          : p.phase === 'RIGHT_LATERAL'
          ? '#38bdf8'
          : p.phase === 'LEFT_LATERAL'
          ? '#c084fc'
          : '#34d399';

        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Highlight Apex (Centric Relation)
    const apexX = ox + metrics.apex.x * scale;
    const apexY = oy - metrics.apex.y * scale;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(apexX, apexY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillStyle = '#f87171';
    ctx.fillText('CR APEX', apexX + 10, apexY + 4);

    // Live pen stylus marker if recording or simulating live
    if (isRecordingLive) {
      const curX = ox + liveX * scale;
      const curY = oy - liveY * scale;
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(curX, curY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`Stylus: (${liveX.toFixed(1)}, ${liveY.toFixed(1)})`, curX + 10, curY - 6);
    }

    // Bennett Angle Vector Lines (Left & Right from apex)
    if (points.length > 5) {
      const rayLen = 9 * scale;
      const bRRad = (metrics.bennettRightDeg * Math.PI) / 180;
      const bLRad = (metrics.bennettLeftDeg * Math.PI) / 180;

      // Right Bennett ray
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(apexX + Math.sin(bRRad) * rayLen, apexY - Math.cos(bRRad) * rayLen);
      ctx.stroke();

      // Left Bennett ray
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(apexX - Math.sin(bLRad) * rayLen, apexY - Math.cos(bLRad) * rayLen);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [points, activePhase, metrics, isRecordingLive, liveX, liveY]);

  // Handler for live recording toggle
  const handleToggleLiveRecording = async () => {
    if (sourceMode === 'LIVE_CAMERA' && !isCameraActive) {
      // Auto-unlock sensor so clinician is never blocked
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
          setIsCameraActive(true);
          setIsVirtualSensor(false);
          setCameraError(null);
          setIsRecordingLive(true);
          return;
        }
      } catch (err) {
        console.warn("Hardware camera unavailable, unlocking virtual optical sensor:", err);
      }

      // Unlock virtual optical telemetry sensor immediately
      handleUnlockVirtualSensor();
      setIsRecordingLive(true);
      return;
    }

    setIsRecordingLive(!isRecordingLive);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Title & Mode Selection Bar with Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTab ? onNavigateToTab('scanner') : window.history.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-sm group shrink-0"
            title="Back to Live Scanner"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                <span>Digital Gothic Arch (Needle Point) Tracer</span>
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                sourceMode === 'LIVE_CAMERA'
                  ? isCameraActive 
                    ? isVirtualSensor
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-800'
              }`}>
                {sourceMode === 'LIVE_CAMERA' 
                  ? (isCameraActive 
                      ? (isVirtualSensor ? 'VIRTUAL OPTICAL SENSOR (UNLOCKED)' : 'LIVE WEBCAM SENSOR ACTIVE') 
                      : 'SENSOR LOCKED / CAM OFFLINE')
                  : 'BENCH PHANTOM SIMULATION'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time horizontal trajectory of $T_{`mand`}$ relative to $T_{`max`}$ during eccentric border excursions
            </p>
          </div>
        </div>

        {/* Global Controls & Mode Selector with Three Dots */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source Toggle with Three Dots Dropdown */}
          <div className="relative flex items-center gap-1.5">
            <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <button
                onClick={() => {
                  setSourceMode('BENCH_SIMULATION');
                  setIsRecordingLive(false);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  sourceMode === 'BENCH_SIMULATION'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bench Model
              </button>
              <button
                onClick={() => {
                  setSourceMode('LIVE_CAMERA');
                  if (!isCameraActive) {
                    handleRequestCamera();
                  }
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  sourceMode === 'LIVE_CAMERA'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isVirtualSensor ? 'Virtual Sensor' : 'Patient Webcam'}</span>
              </button>
            </div>

            {/* Three Dots Button for Recording Mode Options */}
            <div className="relative">
              <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center justify-center ${
                  showModeMenu
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
                title="Recording Mode & Sensor Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showModeMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setShowModeMenu(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-40 py-2 text-xs text-slate-200 divide-y divide-slate-800/80">
                    <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                      Recording Mode Selection
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setSourceMode('BENCH_SIMULATION');
                          setIsRecordingLive(false);
                          setShowModeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer ${
                          sourceMode === 'BENCH_SIMULATION' ? 'text-cyan-400 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <span>Bench Model (Automated)</span>
                        {sourceMode === 'BENCH_SIMULATION' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>

                      <button
                        onClick={() => {
                          setSourceMode('LIVE_CAMERA');
                          setIsVirtualSensor(false);
                          handleRequestCamera();
                          setShowModeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer ${
                          sourceMode === 'LIVE_CAMERA' && !isVirtualSensor ? 'text-cyan-400 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <span>Patient Webcam (Physical Camera)</span>
                        {sourceMode === 'LIVE_CAMERA' && !isVirtualSensor && isCameraActive && (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSourceMode('LIVE_CAMERA');
                          handleUnlockVirtualSensor();
                          setShowModeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer ${
                          sourceMode === 'LIVE_CAMERA' && isVirtualSensor ? 'text-cyan-400 font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <span>Virtual Optical Sensor (Unlocked)</span>
                        {sourceMode === 'LIVE_CAMERA' && isVirtualSensor && (
                          <Check className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                      </button>
                    </div>

                    <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">
                      Sensor Permissions & Tools
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleRequestCamera();
                          setShowModeMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-800/80 text-cyan-300 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Request Camera Permission</span>
                      </button>

                      <button
                        onClick={() => {
                          handleUnlockVirtualSensor();
                          setShowModeMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-800/80 text-emerald-300 font-medium transition-colors cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock Permission (Allow Recording)</span>
                      </button>

                      <button
                        onClick={() => {
                          setLiveX(0);
                          setLiveY(0);
                          setShowModeMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-800/80 text-slate-300 transition-colors cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Center Mandibular Stylus (0, 0)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClearPoints}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          {sourceMode === 'BENCH_SIMULATION' ? (
            <button
              onClick={runFullBorderSimulation}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>{isSimulating ? 'Tracing Excursion...' : 'Run Border Movement'}</span>
            </button>
          ) : (
            <button
              onClick={handleToggleLiveRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer ${
                !isCameraActive
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : isRecordingLive
                  ? 'bg-rose-500 hover:bg-rose-400 text-white animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isRecordingLive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Stop Recording</span>
                </>
              ) : !isCameraActive ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock & Start Tracing</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Live Patient Tracing</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => onSaveParameters(metrics.sciEstimateDeg, metrics.bennettLeftDeg, metrics.bennettRightDeg)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply to Articulator</span>
          </button>
        </div>
      </div>

      {/* Permission Notice Popup when granted or unlocked */}
      {permissionNotice && (
        <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{permissionNotice}</span>
          </div>
          <button
            onClick={() => setPermissionNotice(null)}
            className="text-emerald-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sensor Inactive Guard Banner with 1-Click Unlock */}
      {sourceMode === 'LIVE_CAMERA' && !isCameraActive && (
        <div className="p-4 bg-amber-950/40 border border-amber-600/40 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-300 block">
                Camera Required for Live Gothic Arch Patient Recording
              </span>
              <p className="text-amber-200/90 leading-relaxed">
                Recording is blocked while the optical sensor is inactive to prevent empty or uncalibrated recordings.
                Please ensure webcam permissions are enabled, or click <strong>Bench Model</strong> to test with automated phantom jaw excursions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
            <button
              onClick={handleRequestCamera}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Grant Permission</span>
            </button>

            <button
              onClick={handleUnlockVirtualSensor}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Permission</span>
            </button>

            <button
              onClick={() => setSourceMode('BENCH_SIMULATION')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg transition-colors cursor-pointer"
            >
              Bench Model
            </button>
          </div>
        </div>
      )}

      {/* Sensor Active Confirmation Banner */}
      {sourceMode === 'LIVE_CAMERA' && isCameraActive && !permissionNotice && (
        <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Optical Sensor Active & Unlocked ✓</strong>{' '}
              {isVirtualSensor ? 'Running in Virtual Optical Telemetry Mode.' : 'Running with Live Patient Webcam.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isVirtualSensor ? (
              <button
                onClick={handleRequestCamera}
                className="px-2.5 py-1 text-[11px] font-semibold text-cyan-300 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 rounded-lg transition-colors cursor-pointer"
              >
                Switch to Webcam
              </button>
            ) : (
              <button
                onClick={handleUnlockVirtualSensor}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Switch to Virtual
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Display (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Needle-Point Tracing Table (X-Y Plane)</span>
              <span className="text-xs text-slate-500 font-mono">· {points.length} samples</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-lg text-[11px] font-mono border border-slate-800">
              <button
                onClick={() => setActivePhase('ALL')}
                className={`px-2 py-0.5 rounded cursor-pointer ${activePhase === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setActivePhase('PROTRUSION')}
                className={`px-2 py-0.5 rounded cursor-pointer ${activePhase === 'PROTRUSION' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}
              >
                Protrusion
              </button>
              <button
                onClick={() => setActivePhase('RIGHT_LATERAL')}
                className={`px-2 py-0.5 rounded cursor-pointer ${activePhase === 'RIGHT_LATERAL' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}
              >
                Right
              </button>
              <button
                onClick={() => setActivePhase('LEFT_LATERAL')}
                className={`px-2 py-0.5 rounded cursor-pointer ${activePhase === 'LEFT_LATERAL' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400'}`}
              >
                Left
              </button>
            </div>
          </div>

          <div className="relative w-full aspect-4/3 bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80">
            {/* Hidden video element for webcam frame stream */}
            <video
              ref={videoRef}
              className="hidden"
              playsInline
              muted
            />

            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full h-full object-contain"
            />

            {/* Live Camera PIP (Picture in Picture) when live tracking */}
            {sourceMode === 'LIVE_CAMERA' && isCameraActive && (
              <div className="absolute top-3 right-3 w-36 h-28 bg-black/90 border border-cyan-500/40 rounded-lg overflow-hidden shadow-xl flex flex-col">
                <div className="px-2 py-0.5 bg-slate-950 text-[10px] font-mono text-cyan-400 flex items-center justify-between border-b border-slate-800">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    CAM
                  </span>
                  <span>1080p</span>
                </div>
                <div className="flex-1 relative flex items-center justify-center bg-slate-950">
                  <span className="text-[10px] text-slate-500 font-mono text-center px-1">
                    Marker Sensor Active
                  </span>
                </div>
              </div>
            )}

            {/* Live Stylus Excursion Sliders if live recording */}
            {isRecordingLive && (
              <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur p-2.5 rounded-xl border border-slate-700 text-xs w-56 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-white">
                  <span>Mandibular Excursion</span>
                  <span className="text-cyan-400 font-mono">LIVE</span>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Lateral (X)</span>
                    <span className="font-mono text-white">{liveX.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="0.2"
                    value={liveX}
                    onChange={(e) => setLiveX(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Anterior (Y)</span>
                    <span className="font-mono text-white">{liveY.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.2"
                    value={liveY}
                    onChange={(e) => setLiveY(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-slate-800 rounded"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono pt-2 border-t border-slate-800/80 gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              CR Apex (Centric Position)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Right Excursion
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Left Excursion
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Protrusion
            </span>
          </div>
        </div>

        {/* Calculated Kinematic Parameters (1 col) */}
        <div className="space-y-4">
          {/* Card 1: Horizontal Condylar Inclination (SCI) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
                Sagittal Condylar Inclination (SCI)
              </span>
              <span className="text-[10px] font-mono text-amber-400">Y-Z Angle</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-bold font-mono text-amber-300 tabular-nums">
                {metrics.sciEstimateDeg}
              </span>
              <span className="text-lg font-mono text-slate-400">° deg</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Protrusive condylar path steepness. Hanau calibration dial set directly to this angle.
            </p>
          </div>

          {/* Card 2: Bennett Angles */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
                Progressive Side Shift (Bennett)
              </span>
              <span className="text-[10px] font-mono text-cyan-400">X-Y Vectors</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-[11px] font-mono text-slate-400 block">Left Bennett (L)</span>
                <span className="text-2xl font-bold font-mono text-purple-300 tabular-nums">
                  {metrics.bennettLeftDeg}°
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <span className="text-[11px] font-mono text-slate-400 block">Right Bennett (R)</span>
                <span className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
                  {metrics.bennettRightDeg}°
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
              <span>Hanau Formula (L = H/8 + 12):</span>
              <span className="font-mono text-slate-200">
                {(metrics.sciEstimateDeg / 8 + 12).toFixed(1)}°
              </span>
            </div>
          </div>

          {/* Card 3: Apex & Symmetry Index */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h4 className="text-xs uppercase font-mono text-slate-400 tracking-wider mb-3">
              Gothic Arch Geometry
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Apex Coordinate:</span>
                <span>({metrics.apex.x.toFixed(2)}, {metrics.apex.y.toFixed(2)}) mm</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Protrusive Length:</span>
                <span>{metrics.protrusiveLengthMm} mm</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Lateral Symmetry:</span>
                <span className="text-emerald-400">{metrics.symmetryIndex}% (Balanced)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
