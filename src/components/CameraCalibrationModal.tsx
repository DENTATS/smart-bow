/**
 * SmartBow AI - Camera Intrinsics & Optical Distance Calibration Modal
 * 
 * Provides:
 * 1. Live visual distance gauge with clinical 45-55cm optimal corridor
 * 2. 1-Click calibration to known reference distance (e.g. 50cm arm's length)
 * 3. Sensor Profile selection (Laptop Webcam, Smartphone Front/Rear, External HD)
 * 4. Patient Biological Calibration (Interpupillary Distance IPD 55-74mm, Face Breadth)
 * 5. Fine scale factor tuning with LocalStorage persistence
 *
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { Camera, Check, Sliders, RefreshCw, X, Crosshair, HelpCircle, Eye, ShieldCheck, Gauge } from 'lucide-react';
import { CameraCalibrationSettings, CameraSensorProfile } from '../types/smartbow';
import { CAMERA_PROFILES, calibrateAtKnownDistance, resetCameraCalibration, saveCameraCalibration } from '../lib/cameraCalibration';

interface CameraCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: CameraCalibrationSettings;
  currentMeasuredDistanceCm: number;
  onSaveSettings: (settings: CameraCalibrationSettings) => void;
}

export const CameraCalibrationModal: React.FC<CameraCalibrationModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  currentMeasuredDistanceCm,
  onSaveSettings
}) => {
  const [settings, setSettings] = useState<CameraCalibrationSettings>(currentSettings);
  const [targetRefCm, setTargetRefCm] = useState<number>(50);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProfileChange = (profile: CameraSensorProfile) => {
    const profileInfo = CAMERA_PROFILES[profile];
    const updated: CameraCalibrationSettings = {
      ...settings,
      profile,
      hfovDeg: profileInfo.hfovDeg
    };
    setSettings(updated);
    onSaveSettings(updated);
    saveCameraCalibration(updated);
    showToast(`Applied ${profileInfo.name} Profile (${profileInfo.hfovDeg}° HFOV)`);
  };

  const handle1ClickCalibration = (distCm: number) => {
    const calibrated = calibrateAtKnownDistance(currentMeasuredDistanceCm, distCm, settings);
    setSettings(calibrated);
    onSaveSettings(calibrated);
    showToast(`Camera Calibrated: Anchor set to ${distCm} cm`);
  };

  const handleScaleFactorChange = (newScale: number) => {
    const updated: CameraCalibrationSettings = {
      ...settings,
      scaleFactor: Number(newScale.toFixed(3)),
      isCalibrated: true
    };
    setSettings(updated);
    onSaveSettings(updated);
    saveCameraCalibration(updated);
  };

  const handleIpdChange = (ipdMm: number) => {
    const updated: CameraCalibrationSettings = {
      ...settings,
      patientIpdMm: Number(ipdMm.toFixed(1))
    };
    setSettings(updated);
    onSaveSettings(updated);
    saveCameraCalibration(updated);
  };

  const handleFaceBreadthChange = (fbMm: number) => {
    const updated: CameraCalibrationSettings = {
      ...settings,
      faceBreadthMm: Number(fbMm.toFixed(1))
    };
    setSettings(updated);
    onSaveSettings(updated);
    saveCameraCalibration(updated);
  };

  const handleHfovChange = (hfov: number) => {
    const updated: CameraCalibrationSettings = {
      ...settings,
      hfovDeg: hfov,
      profile: 'CUSTOM'
    };
    setSettings(updated);
    onSaveSettings(updated);
    saveCameraCalibration(updated);
  };

  const handleReset = () => {
    const reset = resetCameraCalibration();
    setSettings(reset);
    onSaveSettings(reset);
    showToast('Reset to Factory Default Lens Profile');
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Determine current distance zone
  const dist = currentMeasuredDistanceCm;
  const isOptimal = dist >= 45 && dist <= 55;
  const isClose = dist < 45;
  const isTooClose = dist < 36;
  const isTooFar = dist > 65;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Optical Camera & Distance Calibration
                {settings.isCalibrated && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                    CALIBRATED
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Pinhole geometry, Interpupillary Distance (IPD), and Lens Intrinsics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="px-6 py-2 bg-emerald-950/80 border-b border-emerald-600/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Live Visual Distance Gauge */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>Live Optical Distance Gauge</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-xs text-slate-400">Real-Time:</span>
                <span className={`text-base font-bold ${
                  isOptimal ? 'text-emerald-400' : isTooClose || isTooFar ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {dist} cm
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                  isOptimal ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  isTooClose ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  isTooFar ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}>
                  {isOptimal ? 'OPTIMAL (45-55cm)' : isTooClose ? 'TOO CLOSE (<36cm)' : isTooFar ? 'TOO FAR (>65cm)' : 'ACCEPTABLE'}
                </span>
              </div>
            </div>

            {/* Visual Corridor Bar */}
            <div className="relative pt-4 pb-2">
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                {/* Zone 1: <36 cm (Amber) */}
                <div className="w-[20%] bg-amber-500/40 border-r border-slate-900" title="Too close (<36cm)" />
                {/* Zone 2: 36-45 cm (Cyan) */}
                <div className="w-[15%] bg-cyan-500/30 border-r border-slate-900" title="Close (36-45cm)" />
                {/* Zone 3: 45-55 cm OPTIMAL (Emerald) */}
                <div className="w-[25%] bg-emerald-500/70 border-r border-slate-900 relative" title="Optimal Clinical Range (45-55cm)">
                  <div className="absolute inset-0 bg-emerald-400/20 animate-pulse" />
                </div>
                {/* Zone 4: 55-65 cm (Cyan) */}
                <div className="w-[15%] bg-cyan-500/30 border-r border-slate-900" title="Far (55-65cm)" />
                {/* Zone 5: >65 cm (Amber) */}
                <div className="w-[25%] bg-amber-500/40" title="Too far (>65cm)" />
              </div>

              {/* Indicator needle */}
              <div
                className="absolute top-2 w-3.5 h-6 -ml-1.5 flex flex-col items-center pointer-events-none transition-all duration-150"
                style={{
                  left: `${Math.max(5, Math.min(95, ((dist - 20) / 70) * 100))}%`
                }}
              >
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white" />
                <div className="w-1 h-3.5 bg-white rounded-full shadow-lg" />
              </div>

              {/* Corridor labels */}
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 px-1">
                <span>20 cm (Close)</span>
                <span className="text-emerald-400 font-semibold">45-55 cm (Optimal)</span>
                <span>90 cm (Far)</span>
              </div>
            </div>
          </div>

          {/* 1-Click Fast Calibration Section */}
          <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 p-4 rounded-xl border border-cyan-800/50 space-y-3">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-white text-xs uppercase tracking-wider">
                1-Click Quick Calibration
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Hold the camera at arm's length (or measure with a tape) and tap a reference distance to lock optical scaling:
            </p>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {[40, 45, 50, 55].map(distOption => (
                <button
                  key={distOption}
                  onClick={() => handle1ClickCalibration(distOption)}
                  className={`py-2 px-3 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer flex flex-col items-center justify-center ${
                    distOption === 50
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-900/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <span className="text-xs">{distOption} cm</span>
                  <span className="text-[9px] opacity-80">{distOption === 50 ? '★ Standard' : 'Distance'}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2 text-xs">
              <span className="text-slate-400 font-mono">Custom Anchor:</span>
              <input
                type="number"
                min="25"
                max="85"
                value={targetRefCm}
                onChange={e => setTargetRefCm(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center text-xs font-mono text-cyan-300"
              />
              <span className="text-slate-400">cm</span>
              <button
                onClick={() => handle1ClickCalibration(targetRefCm)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/50 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Set Calibration Anchor
              </button>
            </div>
          </div>

          {/* Sensor Profile Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Camera Sensor & Lens Preset</span>
              </div>
              <span className="text-xs font-mono text-cyan-400">{settings.hfovDeg}° HFOV</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CAMERA_PROFILES) as CameraSensorProfile[]).map(profileKey => {
                const info = CAMERA_PROFILES[profileKey];
                const isSelected = settings.profile === profileKey;
                return (
                  <button
                    key={profileKey}
                    onClick={() => handleProfileChange(profileKey)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500 ring-1 ring-cyan-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{info.name}</span>
                      <span className="text-[10px] font-mono text-cyan-400">{info.hfovDeg}°</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      {info.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom HFOV Slider */}
            {settings.profile === 'CUSTOM' && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Horizontal Field of View (HFOV):</span>
                  <span className="text-cyan-400 font-bold">{settings.hfovDeg}°</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="90"
                  step="1"
                  value={settings.hfovDeg}
                  onChange={e => handleHfovChange(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Biological Landmark Biometrics */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Eye className="w-4 h-4 text-purple-400" />
              <span>Patient Anthropometric Calibration</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* IPD */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300">Interpupillary Distance (IPD):</span>
                  <span className="text-xs font-mono font-bold text-purple-300">{settings.patientIpdMm} mm</span>
                </div>
                <input
                  type="range"
                  min="54"
                  max="74"
                  step="0.5"
                  value={settings.patientIpdMm}
                  onChange={e => handleIpdChange(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>54mm (Narrow)</span>
                  <span className="text-purple-400">63mm (Avg)</span>
                  <span>74mm (Wide)</span>
                </div>
              </div>

              {/* Bizygomatic Face Breadth */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-300">Face Breadth (Bizygomatic):</span>
                  <span className="text-xs font-mono font-bold text-cyan-300">{settings.faceBreadthMm} mm</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="160"
                  step="1"
                  value={settings.faceBreadthMm}
                  onChange={e => handleFaceBreadthChange(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>120mm</span>
                  <span className="text-cyan-400">140mm (Avg)</span>
                  <span>160mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fine Tuning Multiplier Slider */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Fine Calibration Multiplier:</span>
              <span className="text-emerald-400 font-bold">{settings.scaleFactor.toFixed(3)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.01"
              value={settings.scaleFactor}
              onChange={e => handleScaleFactorChange(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.50x (Closer)</span>
              <span className="text-emerald-400">1.00x (Baseline)</span>
              <span>1.80x (Farther)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-cyan-950"
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
