/**
 * SmartBow AI - Module 2: Patient Assessment & Facial Photometry
 * Dual frontal and lateral profile analysis with anatomical reference planes.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState, useRef } from 'react';
import { 
  Smile, 
  Camera, 
  Upload, 
  Eye, 
  EyeOff, 
  User, 
  Pencil, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  RotateCcw, 
  Info,
  Maximize2
} from 'lucide-react';
import { FacialBiometrics, PatientCase } from '../types/smartbow';
import { generateClinicalSuggestions } from '../lib/clinicalMath';

interface FacialAnalysisViewProps {
  patientCase?: PatientCase;
  biometrics: FacialBiometrics;
  vdoMm: number | null;
  crDeviationMm: number | null;
  onSelectShade: (shade: string) => void;
  onEditPatient?: () => void;
  onUpdateCase?: (updated: Partial<PatientCase>) => void;
}

export const FacialAnalysisView: React.FC<FacialAnalysisViewProps> = ({
  patientCase,
  biometrics,
  vdoMm,
  crDeviationMm,
  onSelectShade,
  onEditPatient,
  onUpdateCase,
}) => {
  const [activePhotoView, setActivePhotoView] = useState<'FRONTAL' | 'PROFILE'>('FRONTAL');
  const [isCameraCapturing, setIsCameraCapturing] = useState<boolean>(false);
  const [capturedFrontalUrl, setCapturedFrontalUrl] = useState<string | null>(
    patientCase?.frontalPhotoUrl || null
  );
  const [capturedProfileUrl, setCapturedProfileUrl] = useState<string | null>(
    patientCase?.profilePhotoUrl || null
  );

  // Reference plane visibility toggles
  const [showInterpupillary, setShowInterpupillary] = useState<boolean>(true);
  const [showMidline, setShowMidline] = useState<boolean>(true);
  const [showFacialThirds, setShowFacialThirds] = useState<boolean>(true);
  const [showCampersLine, setShowCampersLine] = useState<boolean>(true);
  const [showFrankfort, setShowFrankfort] = useState<boolean>(true);
  const [showELine, setShowELine] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoStreamRef = useRef<HTMLVideoElement | null>(null);

  const suggestions = generateClinicalSuggestions(biometrics, vdoMm, crDeviationMm);
  const estimatedCiwMm = (biometrics.bizygomaticWidthMm / 16).toFixed(1);
  const estimatedArchWidthMm = (biometrics.bizygomaticWidthMm * 0.38).toFixed(1);
  const shades = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'D2'];

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (activePhotoView === 'FRONTAL') {
          setCapturedFrontalUrl(dataUrl);
          if (onUpdateCase) onUpdateCase({ frontalPhotoUrl: dataUrl });
        } else {
          setCapturedProfileUrl(dataUrl);
          if (onUpdateCase) onUpdateCase({ profilePhotoUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Live webcam snapshot
  const startCameraCapture = async () => {
    try {
      setIsCameraCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (videoStreamRef.current) {
        videoStreamRef.current.srcObject = stream;
        await videoStreamRef.current.play();
      }
    } catch (err) {
      console.warn('Camera capture error in Assessment:', err);
      setIsCameraCapturing(false);
    }
  };

  const takeSnapshot = () => {
    if (videoStreamRef.current) {
      const video = videoStreamRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        if (activePhotoView === 'FRONTAL') {
          setCapturedFrontalUrl(dataUrl);
          if (onUpdateCase) onUpdateCase({ frontalPhotoUrl: dataUrl });
        } else {
          setCapturedProfileUrl(dataUrl);
          if (onUpdateCase) onUpdateCase({ profilePhotoUrl: dataUrl });
        }
      }
      // Stop video tracks
      const stream = video.srcObject as MediaStream;
      if (stream) stream.getTracks().forEach(t => t.stop());
      setIsCameraCapturing(false);
    }
  };

  const cancelCamera = () => {
    if (videoStreamRef.current?.srcObject) {
      const stream = videoStreamRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
    }
    setIsCameraCapturing(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header & Truthful Framing */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-950/70 border border-teal-800 px-2 py-0.5 rounded">
                Module 2 · Patient Assessment
              </span>
              <span className="text-xs text-slate-400">
                Frontal &amp; Lateral Profile Photometry
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Smile className="w-5 h-5 text-teal-400" />
              <span>Craniofacial Reference Lines &amp; Biometric Estimation</span>
            </h1>
            <p className="text-xs text-slate-400">
              Evaluates bipupillary cant, facial midline, facial third proportions, and Camper&apos;s plane orientation.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>ESTIMATED FROM 2D PHOTOMETRY — UNCALIBRATED</span>
            </span>
          </div>
        </div>
      </div>

      {/* Patient Identification Card */}
      {patientCase && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">{patientCase.name}</span>
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{patientCase.patientId}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {patientCase.age} y/o · {patientCase.gender} · {patientCase.dentitionState.replace('_', ' ')} · Articulator: {patientCase.articulator.replace('_', ' ')}
              </p>
            </div>
          </div>

          {onEditPatient && (
            <button
              onClick={onEditPatient}
              className="px-3 py-1.5 text-xs font-semibold text-teal-300 bg-teal-950/60 hover:bg-teal-900 border border-teal-800/70 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          )}
        </div>
      )}

      {/* Main Photographic Assessment Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Viewport (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          {/* Viewport Top Bar */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
            {/* Frontal vs Profile Toggle */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  cancelCamera();
                  setActivePhotoView('FRONTAL');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activePhotoView === 'FRONTAL'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Frontal Assessment
              </button>
              <button
                onClick={() => {
                  cancelCamera();
                  setActivePhotoView('PROFILE');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activePhotoView === 'PROFILE'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Lateral Profile Assessment
              </button>
            </div>

            {/* Photo Acquisition Controls */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Upload Photo"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>

              {!isCameraCapturing ? (
                <button
                  onClick={startCameraCapture}
                  className="px-2.5 py-1.5 text-xs font-semibold text-teal-300 bg-teal-950 hover:bg-teal-900 border border-teal-800/80 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Capture Snapshot from Camera"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Capture</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={takeSnapshot}
                    className="px-3 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg cursor-pointer"
                  >
                    Snap
                  </button>
                  <button
                    onClick={cancelCamera}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Photo Canvas Overlay Area */}
          <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] bg-slate-950 flex items-center justify-center overflow-hidden">
            {isCameraCapturing ? (
              <video
                ref={videoStreamRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                {/* Background Photo or Vector Head Silhouette */}
                {activePhotoView === 'FRONTAL' ? (
                  capturedFrontalUrl ? (
                    <img
                      src={capturedFrontalUrl}
                      alt="Frontal Facial Photo"
                      className="max-h-[440px] w-auto object-contain rounded-xl shadow-lg"
                    />
                  ) : (
                    /* High-fidelity Vector Frontal Head Anatomy Graphic */
                    <svg viewBox="0 0 360 460" className="w-auto h-[380px] max-w-full drop-shadow-md">
                      {/* Cranial & Face Silhouette */}
                      <ellipse cx="180" cy="220" rx="100" ry="145" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                      {/* Hairline contour */}
                      <path d="M 90 140 Q 180 80 270 140 Q 180 110 90 140 Z" fill="#0f172a" />
                      {/* Eyes / Pupils */}
                      <ellipse cx="135" cy="185" rx="14" ry="7" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="135" cy="185" r="4" fill="#06b6d4" />
                      <ellipse cx="225" cy="185" rx="14" ry="7" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="225" cy="185" r="4" fill="#06b6d4" />
                      {/* Eyebrows */}
                      <path d="M 115 170 Q 135 162 155 170" stroke="#64748b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      <path d="M 205 170 Q 225 162 245 170" stroke="#64748b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      {/* Nose Bridge & Alar Base */}
                      <path d="M 180 185 L 176 240 Q 180 248 184 240 Z" fill="#334155" stroke="#475569" strokeWidth="1.5" />
                      <path d="M 166 242 Q 180 248 194 242" stroke="#64748b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      {/* Vermilion Lips & Stoma */}
                      <path d="M 152 285 Q 180 278 208 285 Q 180 298 152 285 Z" fill="#475569" stroke="#64748b" strokeWidth="1.5" />
                      <line x1="152" y1="285" x2="208" y2="285" stroke="#0f172a" strokeWidth="1.5" />
                      {/* Menton / Chin */}
                      <path d="M 165 340 Q 180 348 195 340" stroke="#475569" strokeWidth="2" fill="none" strokeLinecap="round" />
                    </svg>
                  )
                ) : (
                  capturedProfileUrl ? (
                    <img
                      src={capturedProfileUrl}
                      alt="Lateral Profile Photo"
                      className="max-h-[440px] w-auto object-contain rounded-xl shadow-lg"
                    />
                  ) : (
                    /* Vector Lateral Profile Anatomy Graphic */
                    <svg viewBox="0 0 360 460" className="w-auto h-[380px] max-w-full drop-shadow-md">
                      {/* Profile Silhouette contour */}
                      <path 
                        d="M 160 80 Q 230 80 250 140 Q 270 210 240 280 L 235 370 L 160 370 Q 100 330 110 280 Q 115 250 135 242 Q 150 240 152 225 Q 120 220 125 180 Q 130 140 160 80 Z" 
                        fill="#1e293b" 
                        stroke="#334155" 
                        strokeWidth="2" 
                      />
                      {/* Profile Face Details */}
                      {/* Forehead to Glabella to Nasal bridge */}
                      <path 
                        d="M 230 120 Q 240 150 242 165 Q 238 175 256 220 L 250 226 Q 242 228 238 245 Q 246 255 244 265 Q 236 270 234 285 Q 242 310 238 330 Q 230 350 215 355 L 180 355" 
                        fill="none" 
                        stroke="#64748b" 
                        strokeWidth="2.5" 
                      />
                      {/* Tragus / Ear */}
                      <path d="M 150 200 Q 165 210 160 235 Q 150 250 145 240" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      {/* Eye profile */}
                      <path d="M 225 185 L 210 180 L 215 192 Z" fill="#06b6d4" />
                    </svg>
                  )
                )}

                {/* SVG Reference Plane Overlays */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 360 460" preserveAspectRatio="xMidYMid meet">
                  {activePhotoView === 'FRONTAL' && (
                    <>
                      {/* 1. Interpupillary Line */}
                      {showInterpupillary && (
                        <g>
                          <line x1="40" y1="184" x2="320" y2="186" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4,3" />
                          <circle cx="135" cy="185" r="5" fill="none" stroke="#06b6d4" strokeWidth="2" />
                          <circle cx="225" cy="185" r="5" fill="none" stroke="#06b6d4" strokeWidth="2" />
                          <rect x="238" y="170" width="108" height="20" rx="4" fill="#0f172a" fillOpacity="0.85" />
                          <text x="242" y="184" fill="#06b6d4" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            IPD TILT: {biometrics.interpupillaryTiltDeg.toFixed(1)}°
                          </text>
                        </g>
                      )}

                      {/* 2. Facial Midline */}
                      {showMidline && (
                        <g>
                          <line x1="180" y1="60" x2="180" y2="400" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" />
                          <circle cx="180" cy="165" r="4" fill="#f59e0b" />
                          <circle cx="180" cy="345" r="4" fill="#f59e0b" />
                          <rect x="186" y="70" width="85" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" />
                          <text x="190" y="83" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            FACIAL MIDLINE
                          </text>
                        </g>
                      )}

                      {/* 3. Horizontal Facial Thirds */}
                      {showFacialThirds && (
                        <g>
                          {/* Upper third divider (Trichion / Hairline) */}
                          <line x1="70" y1="110" x2="290" y2="110" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2,2" />
                          <text x="75" y="105" fill="#10b981" fontSize="9" fontFamily="monospace">
                            Trichion (Upper 33%)
                          </text>

                          {/* Middle third divider (Glabella) */}
                          <line x1="70" y1="165" x2="290" y2="165" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2,2" />
                          <text x="75" y="160" fill="#10b981" fontSize="9" fontFamily="monospace">
                            Glabella (Middle 33%)
                          </text>

                          {/* Subnasale divider */}
                          <line x1="70" y1="245" x2="290" y2="245" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2,2" />
                          <text x="75" y="240" fill="#10b981" fontSize="9" fontFamily="monospace">
                            Subnasale (Lower: {biometrics.lowerThirdPct.toFixed(1)}%)
                          </text>

                          {/* Menton divider */}
                          <line x1="70" y1="345" x2="290" y2="345" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2,2" />
                          <text x="75" y="340" fill="#10b981" fontSize="9" fontFamily="monospace">
                            Menton
                          </text>
                        </g>
                      )}
                    </>
                  )}

                  {activePhotoView === 'PROFILE' && (
                    <>
                      {/* 1. Camper's Line (Ala-Tragus) */}
                      {showCampersLine && (
                        <g>
                          {/* Tragus at (152, 220) to Ala at (242, 245) */}
                          <line x1="120" y1="210" x2="270" y2="255" stroke="#10b981" strokeWidth="2" strokeDasharray="4,3" />
                          <circle cx="152" cy="220" r="4" fill="#10b981" />
                          <circle cx="242" cy="245" r="4" fill="#10b981" />
                          <rect x="150" y="196" width="105" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" />
                          <text x="154" y="209" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            CAMPER&apos;S (ALA-TRAGUS)
                          </text>
                        </g>
                      )}

                      {/* 2. Frankfort Horizontal Plane (Porion-Orbitale) */}
                      {showFrankfort && (
                        <g>
                          {/* Porion at (152, 205) to Orbitale at (225, 195) */}
                          <line x1="120" y1="210" x2="270" y2="190" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4,3" />
                          <circle cx="152" cy="205" r="4" fill="#06b6d4" />
                          <circle cx="225" cy="195" r="4" fill="#06b6d4" />
                          <rect x="150" y="174" width="112" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" />
                          <text x="154" y="187" fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            FRANKFORT HORIZONTAL
                          </text>
                        </g>
                      )}

                      {/* 3. Ricketts E-Line (Tip of Nose to Pogonion) */}
                      {showELine && (
                        <g>
                          {/* Pronasale (256, 220) to Pogonion (238, 330) */}
                          <line x1="262" y1="180" x2="232" y2="360" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" />
                          <circle cx="256" cy="220" r="4" fill="#f59e0b" />
                          <circle cx="238" cy="330" r="4" fill="#f59e0b" />
                          <rect x="250" y="260" width="95" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" />
                          <text x="254" y="273" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            RICKETTS E-LINE
                          </text>
                        </g>
                      )}
                    </>
                  )}
                </svg>
              </div>
            )}
          </div>

          {/* Reference Line Visibility Controls Bar */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              Anatomical Overlays:
            </span>

            {activePhotoView === 'FRONTAL' ? (
              <>
                <button
                  onClick={() => setShowInterpupillary(!showInterpupillary)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showInterpupillary
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {showInterpupillary ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Interpupillary Line</span>
                </button>

                <button
                  onClick={() => setShowMidline(!showMidline)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showMidline
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {showMidline ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Facial Midline</span>
                </button>

                <button
                  onClick={() => setShowFacialThirds(!showFacialThirds)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showFacialThirds
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {showFacialThirds ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Facial Thirds</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowCampersLine(!showCampersLine)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showCampersLine
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {showCampersLine ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Camper&apos;s Line</span>
                </button>

                <button
                  onClick={() => setShowFrankfort(!showFrankfort)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showFrankfort
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {showFrankfort ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Frankfort Plane</span>
                </button>

                <button
                  onClick={() => setShowELine(!showELine)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showELine
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {showELine ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>Ricketts E-Line</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Estimated Clinical Biometrics & Suggestions (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Facial Form & Incisor Width (Berry's Biometric Ratio) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider block">
              Biometric Tooth Selection
            </span>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Facial Form Mould:</span>
                <span className="text-sm font-bold uppercase text-white">{biometrics.facialForm}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Bizygomatic Ratio: {biometrics.bizFaceRatio} · Leon Williams Class I
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Central Incisor Width:</span>
                <span className="text-base font-bold font-mono text-teal-300 tabular-nums">
                  ~{estimatedCiwMm} mm
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Berry&apos;s Biometric Rule: Central Incisor = Bizygomatic Width / 16 ({biometrics.bizygomaticWidthMm} / 16)
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Est. Maxillary Arch Width:</span>
                <span className="text-base font-bold font-mono text-slate-200 tabular-nums">
                  ~{estimatedArchWidthMm} mm
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Distance between canine cusps estimated from bizygomatic breadth.
              </p>
            </div>
          </div>

          {/* Card 2: Proportions & Symmetry */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider block">
              Symmetry &amp; Proportions
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg">
                <span className="text-slate-400">Lower Facial Third:</span>
                <span className="font-bold font-mono text-white tabular-nums">
                  {biometrics.lowerThirdPct.toFixed(1)}% (Target: 33–36%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg">
                <span className="text-slate-400">Interpupillary Cant:</span>
                <span className="font-bold font-mono text-amber-300 tabular-nums">
                  {biometrics.interpupillaryTiltDeg.toFixed(1)}°
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg">
                <span className="text-slate-400">Resting Lip Gap:</span>
                <span className="font-bold font-mono text-emerald-400 tabular-nums">
                  {biometrics.lipGapMm.toFixed(1)} mm
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg">
                <span className="text-slate-400">Subnasale–Menton:</span>
                <span className="font-bold font-mono text-slate-200 tabular-nums">
                  {biometrics.subnasaleToMentonMm ? `${biometrics.subnasaleToMentonMm.toFixed(1)} mm` : '62.5 mm'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Tooth Shade Guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider block">
              Vitapan Classical Shade
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {shades.map((s) => (
                <button
                  key={s}
                  onClick={() => onSelectShade(s)}
                  className={`py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    biometrics.estimatedShade === s
                      ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Selected: <strong className="text-slate-300">{biometrics.estimatedShade}</strong>. Verify against natural lighting (5500K).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
