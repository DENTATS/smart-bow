/**
 * SmartBow AI — Automatic & Manual Optical Camera & Distance Calibration Modal
 *
 * Implements:
 * 1. "Auto calibrate" workflow running Steps (a), (b), (c) in order with real PASS/WARN/FAIL results:
 *    (a) Active video track inspection (videoWidth/Height, getSettings(), device label) -> camera profile & HFOV
 *        (marks "HFOV estimated" if unknown).
 *    (b) Planar (Zhang) lens intrinsics solver using the 3x3 ArUco calibration card (IDs 20–28, 60×60 mm,
 *        pitch 18 mm, marker 12 mm). Auto-accepts only frames with >= 6 decoded card markers across 10–15
 *        frames and solves fx, fy, cx, cy, k1, k2 with reprojection RMS (PASS < 1.0 px, WARN 1–2 px, FAIL > 2 px)
 *        and image area coverage (%).
 *    (c) Live camera distance & uncertainty (± cm) computed from any visible rim marker (IDs 3–10, 6.5 mm)
 *        or calibration card marker (IDs 20–28, 12.0 mm) using calibrated focal length.
 * 2. Honest IPD & Scale Source:
 *    - Displays "IPD: assumed 63 mm (not measured)" in amber until the user types a measured IPD value.
 *    - Automatically uses marker-based scale whenever a marker is visible and shows active scale source:
 *      "scale: rim marker" / "scale: calibration marker" / "scale: IPD, lower confidence".
 * 3. Per-camera label + resolution localStorage persistence, automatic invalidation on camera/resolution change,
 *    "Reset to profile" button, and "Advanced / Manual override" section for manual sliders.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  Check,
  RefreshCw,
  X,
  Crosshair,
  Eye,
  Gauge,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import { CameraCalibrationSettings, CameraSensorProfile, MarkerPose } from '../types/smartbow';
import {
  CAMERA_PROFILES,
  CalibrationCardFrameObservation,
  CalibrationStepVerdict,
  MIN_FRAMES_FOR_INTRINSIC_SOLVE,
  MAX_FRAMES_FOR_INTRINSIC_SOLVE,
  MIN_MARKERS_PER_CALIBRATION_FRAME,
  TrackProfileDetectionResult,
  ZhangPlanarCalibrationResult,
  calibrateAtKnownDistance,
  computeLiveMarkerDistance,
  detectCameraProfileFromTrack,
  evaluateCalibrationCardFrame,
  formatIpdStatusText,
  resetCameraCalibrationToProfile,
  saveCameraCalibration,
  solveZhangPlanarCalibration,
} from '../lib/cameraCalibration';

export interface ActiveTrackMetadata {
  deviceLabel: string;
  facingMode: string;
  width: number;
  height: number;
  frameRate?: number;
}

interface CameraCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: CameraCalibrationSettings;
  currentMeasuredDistanceCm: number;
  onSaveSettings: (settings: CameraCalibrationSettings) => void;
  liveMarkers?: MarkerPose[];
  activeTrackInfo?: ActiveTrackMetadata | null;
}

export const CameraCalibrationModal: React.FC<CameraCalibrationModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  currentMeasuredDistanceCm,
  onSaveSettings,
  liveMarkers = [],
  activeTrackInfo = null,
}) => {
  const [settings, setSettings] = useState<CameraCalibrationSettings>(currentSettings);
  const [targetRefCm, setTargetRefCm] = useState<number>(50);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showManualOverride, setShowManualOverride] = useState<boolean>(false);
  const [measuredIpdInput, setMeasuredIpdInput] = useState<string>(
    currentSettings.ipdIsMeasured ? String(currentSettings.patientIpdMm) : ''
  );

  // Auto-Calibration Pipeline State
  const [autoCalibrating, setAutoCalibrating] = useState<boolean>(false);
  const [stepAResult, setStepAResult] = useState<TrackProfileDetectionResult | null>(null);
  const [capturedCardFrames, setCapturedCardFrames] = useState<CalibrationCardFrameObservation[]>([]);
  const [stepBResult, setStepBResult] = useState<ZhangPlanarCalibrationResult | null>(null);

  useEffect(() => {
    setSettings(currentSettings);
    setMeasuredIpdInput(currentSettings.ipdIsMeasured ? String(currentSettings.patientIpdMm) : '');
  }, [currentSettings]);

  const showToast = useCallback((msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  }, []);

  const persistAndApply = useCallback(
    (updated: CameraCalibrationSettings) => {
      setSettings(updated);
      onSaveSettings(updated);
      saveCameraCalibration(updated);
    },
    [onSaveSettings]
  );

  // Live evaluation of currently visible markers (Step c + live card markers)
  const trackW = activeTrackInfo?.width || settings.calibratedResolution?.width || 1280;
  const trackH = activeTrackInfo?.height || settings.calibratedResolution?.height || 720;
  const trackLabel = activeTrackInfo?.deviceLabel || settings.cameraDeviceLabel || '';

  const liveDistanceInfo = computeLiveMarkerDistance(liveMarkers, settings, trackW, trackH);
  const currentCardObservation = evaluateCalibrationCardFrame(
    liveMarkers,
    capturedCardFrames.length
  );

  // Auto-collect distinct 3x3 calibration card frames when Auto Calibrate is active
  useEffect(() => {
    if (!isOpen || !autoCalibrating) return;
    if (capturedCardFrames.length >= MAX_FRAMES_FOR_INTRINSIC_SOLVE) return;

    const obs = evaluateCalibrationCardFrame(liveMarkers, capturedCardFrames.length + 1);
    if (!obs.accepted) return;

    // Require at least 10px centroid movement from previous accepted frame for pose diversity
    const last = capturedCardFrames[capturedCardFrames.length - 1];
    if (last) {
      const distPx = Math.hypot(
        obs.centroidPx.x - last.centroidPx.x,
        obs.centroidPx.y - last.centroidPx.y
      );
      if (distPx < 10) {
        return;
      }
    }

    const next = [...capturedCardFrames, obs];
    setCapturedCardFrames(next);

    if (next.length >= MIN_FRAMES_FOR_INTRINSIC_SOLVE) {
      const solved = solveZhangPlanarCalibration(next, trackW, trackH);
      setStepBResult(solved);
      if (solved.verdict === 'PASS' || solved.verdict === 'WARN') {
        const updated: CameraCalibrationSettings = {
          ...settings,
          fx: solved.fx,
          fy: solved.fy,
          cx: solved.cx,
          cy: solved.cy,
          k1: solved.k1,
          k2: solved.k2,
          hfovDeg: solved.hfovDeg,
          hfovEstimated: false,
          reprojectionRmsPx: solved.reprojectionRmsPx,
          coveragePct: solved.coveragePct,
          isCalibrated: true,
          calibrationDate: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          cameraDeviceLabel: trackLabel,
          calibratedResolution: { width: trackW, height: trackH },
        };
        persistAndApply(updated);
      }
    }
  }, [
    isOpen,
    autoCalibrating,
    liveMarkers,
    capturedCardFrames,
    trackW,
    trackH,
    trackLabel,
    settings,
    persistAndApply,
  ]);

  if (!isOpen) return null;

  // Trigger Step (a) -> Step (b) -> Step (c) automatic pipeline
  const handleStartAutoCalibrate = () => {
    // Step (a): Read active video track metadata and match camera profile
    const stepA = detectCameraProfileFromTrack({
      deviceLabel: activeTrackInfo?.deviceLabel || '',
      facingMode: activeTrackInfo?.facingMode || '',
      width: activeTrackInfo?.width || 0,
      height: activeTrackInfo?.height || 0,
    });
    setStepAResult(stepA);

    if (stepA.verdict !== 'FAIL') {
      const nextSettings: CameraCalibrationSettings = {
        ...settings,
        profile: stepA.profile,
        hfovDeg: stepA.hfovDeg,
        hfovEstimated: stepA.hfovEstimated,
        fx: stepA.fxInitial,
        fy: stepA.fyInitial,
        cx: stepA.width * 0.5,
        cy: stepA.height * 0.5,
        cameraDeviceLabel: stepA.deviceLabel,
        calibratedResolution: { width: stepA.width, height: stepA.height },
      };
      persistAndApply(nextSettings);
    }

    // Step (b): Start / evaluate 3x3 calibration card frame capture
    setCapturedCardFrames([]);
    setAutoCalibrating(true);

    if (currentCardObservation.accepted) {
      setCapturedCardFrames([{ ...currentCardObservation, frameIndex: 1 }]);
    } else {
      setStepBResult(null);
    }

    showToast(
      stepA.verdict === 'FAIL'
        ? 'Step (a) FAIL: Camera stream is not active.'
        : `Step (a) ${stepA.verdict}: Applied ${stepA.hfovDeg}° HFOV. Hold 3×3 calibration card (IDs 20–28) in view for Step (b).`
    );
  };

  const handleSolveCurrentFramesNow = () => {
    if (capturedCardFrames.length < 3) return;
    const solved = solveZhangPlanarCalibration(capturedCardFrames, trackW, trackH);
    setStepBResult(solved);
    if (solved.verdict !== 'FAIL') {
      const updated: CameraCalibrationSettings = {
        ...settings,
        fx: solved.fx,
        fy: solved.fy,
        cx: solved.cx,
        cy: solved.cy,
        k1: solved.k1,
        k2: solved.k2,
        hfovDeg: solved.hfovDeg,
        hfovEstimated: false,
        reprojectionRmsPx: solved.reprojectionRmsPx,
        coveragePct: solved.coveragePct,
        isCalibrated: true,
        calibrationDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        cameraDeviceLabel: trackLabel,
        calibratedResolution: { width: trackW, height: trackH },
      };
      persistAndApply(updated);
      showToast(`Solved Zhang Planar Intrinsics: RMS ${solved.reprojectionRmsPx} px (${solved.verdict})`);
    }
  };

  const handleTypedIpdChange = (rawVal: string) => {
    setMeasuredIpdInput(rawVal);
    const trimmed = rawVal.trim();
    if (!trimmed) {
      persistAndApply({
        ...settings,
        patientIpdMm: 63.0,
        ipdIsMeasured: false,
      });
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed >= 45 && parsed <= 85) {
      persistAndApply({
        ...settings,
        patientIpdMm: Number(parsed.toFixed(1)),
        ipdIsMeasured: true,
      });
    }
  };

  const handleProfileChange = (profile: CameraSensorProfile) => {
    const profileInfo = CAMERA_PROFILES[profile];
    const fx = Math.round(trackW / (2 * Math.tan((profileInfo.hfovDeg * Math.PI) / 360)));
    const updated: CameraCalibrationSettings = {
      ...settings,
      profile,
      hfovDeg: profileInfo.hfovDeg,
      hfovEstimated: profile === 'CUSTOM',
      fx,
      fy: fx,
    };
    persistAndApply(updated);
    showToast(`Applied ${profileInfo.name} Profile (${profileInfo.hfovDeg}° HFOV)`);
  };

  const handle1ClickCalibration = (distCm: number) => {
    const baseDist = liveDistanceInfo.distanceCm ?? currentMeasuredDistanceCm;
    const calibrated = calibrateAtKnownDistance(baseDist, distCm, settings);
    setSettings(calibrated);
    onSaveSettings(calibrated);
    showToast(`Camera Calibrated: Anchor set to ${distCm} cm`);
  };

  const handleScaleFactorChange = (newScale: number) => {
    persistAndApply({
      ...settings,
      scaleFactor: Number(newScale.toFixed(3)),
      isCalibrated: true,
    });
  };

  const handleFaceBreadthChange = (fbMm: number) => {
    persistAndApply({
      ...settings,
      faceBreadthMm: Number(fbMm.toFixed(1)),
    });
  };

  const handleHfovChange = (hfov: number) => {
    const fx = Math.round(trackW / (2 * Math.tan((hfov * Math.PI) / 360)));
    persistAndApply({
      ...settings,
      hfovDeg: hfov,
      hfovEstimated: false,
      fx,
      fy: fx,
      profile: 'CUSTOM',
    });
  };

  const handleResetToProfile = () => {
    const reset = resetCameraCalibrationToProfile(
      settings.profile,
      trackLabel,
      trackW,
      trackH
    );
    setSettings(reset);
    onSaveSettings(reset);
    setMeasuredIpdInput('');
    setCapturedCardFrames([]);
    setStepBResult(null);
    setAutoCalibrating(false);
    showToast(`Reset to ${CAMERA_PROFILES[reset.profile].name} profile (${reset.hfovDeg}° HFOV)`);
  };

  const ipdStatus = formatIpdStatusText(settings);
  const displayedDistanceCm = liveDistanceInfo.distanceCm ?? currentMeasuredDistanceCm;
  const isOptimal = displayedDistanceCm >= 45 && displayedDistanceCm <= 55;
  const isTooClose = displayedDistanceCm < 36;
  const isTooFar = displayedDistanceCm > 65;

  const stepCVerdict: CalibrationStepVerdict = liveDistanceInfo.markerDistanceAvailable
    ? (liveDistanceInfo.uncertaintyCm ?? 9) <= 1.5
      ? 'PASS'
      : 'WARN'
    : 'WARN';

  const renderVerdictBadge = (verdict: CalibrationStepVerdict) => (
    <span
      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border inline-flex items-center gap-1 ${
        verdict === 'PASS'
          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
          : verdict === 'WARN'
          ? 'bg-amber-950 text-amber-300 border-amber-500/50'
          : 'bg-rose-950 text-rose-300 border-rose-500/50'
      }`}
    >
      {verdict === 'PASS' ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
      ) : verdict === 'WARN' ? (
        <AlertTriangle className="w-3 h-3 text-amber-400" />
      ) : (
        <XCircle className="w-3 h-3 text-rose-400" />
      )}
      <span>{verdict}</span>
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Camera &amp; Distance Calibration</span>
                {settings.isCalibrated ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                    CALIBRATED
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    {settings.hfovEstimated ? 'HFOV ESTIMATED' : 'PROFILE DEFAULT'}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Active key: {trackLabel || 'Default Camera'} · {trackW}×{trackH} ·{' '}
                <span className="text-cyan-300 font-bold">{liveDistanceInfo.scaleSourceLabel}</span>
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
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* 1. Primary Automatic Calibration Pipeline ("Auto calibrate") */}
          <div className="bg-slate-950 p-4 rounded-xl border border-teal-500/40 space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>Automatic 3-Step Optical Calibration</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reads live camera track, solves Zhang planar lens intrinsics from 3×3 card (IDs 20–28), and measures live marker distance.
                </p>
              </div>
              <button
                onClick={handleStartAutoCalibrate}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto calibrate</span>
              </button>
            </div>

            {/* Step (a): Active Video Track & HFOV Profile */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white">
                  Step a. Active Video Track &amp; Sensor HFOV Profile
                </span>
                {stepAResult
                  ? renderVerdictBadge(stepAResult.verdict)
                  : renderVerdictBadge(
                      activeTrackInfo && activeTrackInfo.width > 0
                        ? settings.hfovEstimated
                          ? 'WARN'
                          : 'PASS'
                        : 'FAIL'
                    )}
              </div>
              <div className="text-slate-300 text-[11px]">
                {stepAResult ? (
                  stepAResult.summary
                ) : activeTrackInfo && activeTrackInfo.width > 0 ? (
                  <>
                    Track: &quot;{activeTrackInfo.deviceLabel || 'Unlabelled Camera'}&quot; ·{' '}
                    {activeTrackInfo.width}×{activeTrackInfo.height} · {settings.hfovDeg}° HFOV{' '}
                    {settings.hfovEstimated ? (
                      <span className="text-amber-300 font-bold">(HFOV estimated)</span>
                    ) : (
                      <span className="text-emerald-300">
                        ({CAMERA_PROFILES[settings.profile].name})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-rose-300">
                    No active camera track detected. Turn on the live camera to read hardware settings.
                  </span>
                )}
              </div>
            </div>

            {/* Step (b): Zhang Planar Intrinsics (3x3 ArUco Card IDs 20-28, 60x60 mm, pitch 18 mm) */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-white">
                  Step b. Lens Intrinsics (3×3 ArUco Card IDs 20–28 · 60×60 mm · Pitch 18 mm)
                </span>
                {stepBResult
                  ? renderVerdictBadge(stepBResult.verdict)
                  : settings.reprojectionRmsPx !== null && settings.reprojectionRmsPx !== undefined
                  ? renderVerdictBadge(
                      settings.reprojectionRmsPx < 1.0
                        ? 'PASS'
                        : settings.reprojectionRmsPx <= 2.0
                        ? 'WARN'
                        : 'FAIL'
                    )
                  : renderVerdictBadge('WARN')}
              </div>

              <div className="text-[11px] text-slate-300 space-y-1">
                <div>
                  Live 3×3 card markers in view:{' '}
                  <span className="text-cyan-300 font-bold">
                    {currentCardObservation.decodedMarkerIds.length}/9 [
                    {currentCardObservation.decodedMarkerIds.join(', ')}]
                  </span>{' '}
                  · Frame gate:{' '}
                  <span
                    className={
                      currentCardObservation.accepted ? 'text-emerald-400 font-bold' : 'text-amber-300'
                    }
                  >
                    {currentCardObservation.accepted
                      ? `ACCEPTED (≥ ${MIN_MARKERS_PER_CALIBRATION_FRAME} markers)`
                      : `Need ≥ ${MIN_MARKERS_PER_CALIBRATION_FRAME} card markers (IDs 20–28)`}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    Accepted frames:{' '}
                    <span className="text-cyan-300 font-bold">
                      {capturedCardFrames.length}/{MIN_FRAMES_FOR_INTRINSIC_SOLVE}–{MAX_FRAMES_FOR_INTRINSIC_SOLVE}
                    </span>
                  </span>
                  {capturedCardFrames.length >= 3 && (
                    <button
                      onClick={handleSolveCurrentFramesNow}
                      className="px-2.5 py-0.5 rounded bg-cyan-800 hover:bg-cyan-700 text-white font-bold text-[10px] cursor-pointer"
                    >
                      Solve Intrinsics Now ({capturedCardFrames.length} frames)
                    </button>
                  )}
                </div>

                {stepBResult ? (
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 text-cyan-200">
                    {stepBResult.summary}
                  </div>
                ) : settings.reprojectionRmsPx !== null && settings.reprojectionRmsPx !== undefined ? (
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 text-cyan-200">
                    Solved: fx={settings.fx.toFixed(1)} px, fy={settings.fy.toFixed(1)} px, cx=
                    {(settings.cx ?? trackW * 0.5).toFixed(1)}, cy=
                    {(settings.cy ?? trackH * 0.5).toFixed(1)}, k1={(settings.k1 ?? 0).toFixed(4)}, k2=
                    {(settings.k2 ?? 0).toFixed(4)} · Reprojection RMS:{' '}
                    <span className="font-bold">{settings.reprojectionRmsPx} px</span> · Coverage:{' '}
                    <span className="font-bold">{settings.coveragePct ?? 0}%</span>
                  </div>
                ) : (
                  <div className="text-amber-300">
                    Hold the printed Section 3 calibration card (IDs 20–28) at 10–15 angles/distances to solve fx, fy, cx, cy, k1, k2.
                  </div>
                )}
              </div>
            </div>

            {/* Step (c): Live Marker-Based Distance & Uncertainty */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white">
                  Step c. Live Marker Distance &amp; Uncertainty
                </span>
                {renderVerdictBadge(stepCVerdict)}
              </div>
              {liveDistanceInfo.markerDistanceAvailable ? (
                <div className="text-emerald-300 text-[11px]">
                  Live marker distance:{' '}
                  <span className="font-bold text-sm">
                    {liveDistanceInfo.distanceCm} ± {liveDistanceInfo.uncertaintyCm} cm
                  </span>{' '}
                  · Markers: [{liveDistanceInfo.markersUsedIds.map((id) => `#${id}`).join(', ')}] (mean side{' '}
                  {liveDistanceInfo.meanMarkerSidePx} px) ·{' '}
                  <span className="text-cyan-300 font-bold">{liveDistanceInfo.scaleSourceLabel}</span>
                </div>
              ) : (
                <div className="text-amber-300 text-[11px]">
                  No rim marker (IDs 3–10, 6.5 mm) or scale card marker (IDs 20–28, 12 mm) currently in view ·{' '}
                  <span className="font-bold">{liveDistanceInfo.scaleSourceLabel}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. IPD & Active Scale Source Panel (Never silently assumes 63 mm) */}
          <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Eye className="w-4 h-4 text-purple-400" />
                <span>Interpupillary Distance (IPD) &amp; Active Scale Priority</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold border ${
                  liveDistanceInfo.markerDistanceAvailable
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                }`}
              >
                {liveDistanceInfo.scaleSourceLabel}
              </span>
            </div>

            {/* Truthful IPD Banner: Amber when assumed, Emerald when user-measured */}
            <div
              className={`p-2.5 rounded-lg border font-mono text-xs flex items-center justify-between gap-3 flex-wrap ${
                ipdStatus.isAssumed
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              }`}
            >
              <span className="font-bold">{ipdStatus.text}</span>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-300">Measured IPD (mm):</label>
                <input
                  type="number"
                  min="48"
                  max="80"
                  step="0.5"
                  placeholder="63.0"
                  value={measuredIpdInput}
                  onChange={(e) => handleTypedIpdChange(e.target.value)}
                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-xs font-mono text-white"
                />
                {settings.ipdIsMeasured && (
                  <button
                    onClick={() => handleTypedIpdChange('')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Whenever a physical 6.5 mm dental-rim ArUco marker (IDs 3–10) is visible, SmartBow uses{' '}
              <span className="text-cyan-300 font-mono">scale: rim marker</span> instead of IPD.
            </p>
          </div>

          {/* 3. Live Visual Distance Gauge */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>Live Optical Distance Corridor</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span
                  className={`text-base font-bold ${
                    isOptimal
                      ? 'text-emerald-400'
                      : isTooClose || isTooFar
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                >
                  {displayedDistanceCm}
                  {liveDistanceInfo.uncertaintyCm !== null
                    ? ` ± ${liveDistanceInfo.uncertaintyCm}`
                    : ''}{' '}
                  cm
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                    isOptimal
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : isTooClose || isTooFar
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {isOptimal
                    ? 'OPTIMAL (45–55 cm)'
                    : isTooClose
                    ? 'TOO CLOSE (<36 cm)'
                    : isTooFar
                    ? 'TOO FAR (>65 cm)'
                    : 'ACCEPTABLE'}
                </span>
              </div>
            </div>

            <div className="relative pt-3 pb-1">
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div className="w-[20%] bg-amber-500/40 border-r border-slate-900" />
                <div className="w-[15%] bg-cyan-500/30 border-r border-slate-900" />
                <div className="w-[25%] bg-emerald-500/70 border-r border-slate-900" />
                <div className="w-[15%] bg-cyan-500/30 border-r border-slate-900" />
                <div className="w-[25%] bg-amber-500/40" />
              </div>
              <div
                className="absolute top-1 w-3.5 h-6 -ml-1.5 flex flex-col items-center pointer-events-none transition-all duration-150"
                style={{
                  left: `${Math.max(5, Math.min(95, ((displayedDistanceCm - 20) / 70) * 100))}%`,
                }}
              >
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-white" />
                <div className="w-1 h-3.5 bg-white rounded-full shadow-lg" />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5 px-1">
                <span>20 cm</span>
                <span className="text-emerald-400 font-semibold">45–55 cm (Optimal)</span>
                <span>90 cm</span>
              </div>
            </div>
          </div>

          {/* 4. Advanced / Manual Override Collapsible Section */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
            <button
              onClick={() => setShowManualOverride((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Advanced / Manual override</span>
              </div>
              {showManualOverride ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showManualOverride && (
              <div className="p-4 border-t border-slate-800 space-y-5">
                {/* Sensor Profile Selection */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span>Camera Sensor &amp; Lens Preset</span>
                    </div>
                    <span className="text-xs font-mono text-cyan-400">
                      {settings.hfovDeg}° HFOV (fx={settings.fx.toFixed(0)} px)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(CAMERA_PROFILES) as CameraSensorProfile[]).map((profileKey) => {
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
                            <span className="text-[10px] font-mono text-cyan-400">
                              {info.hfovDeg}°
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            {info.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual HFOV Slider */}
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Manual Horizontal Field of View (HFOV):</span>
                      <span className="text-cyan-400 font-bold">{settings.hfovDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="45"
                      max="90"
                      step="1"
                      value={settings.hfovDeg}
                      onChange={(e) => handleHfovChange(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>
                </div>

                {/* 1-Click Manual Reference Distance Anchor */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-semibold text-white">
                    Manual Distance Anchor Override
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[40, 45, 50, 55].map((distOption) => (
                      <button
                        key={distOption}
                        onClick={() => handle1ClickCalibration(distOption)}
                        className="py-1.5 px-2 rounded-lg border bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs font-mono cursor-pointer"
                      >
                        {distOption} cm
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="text-slate-400 font-mono">Custom Anchor:</span>
                    <input
                      type="number"
                      min="25"
                      max="85"
                      value={targetRefCm}
                      onChange={(e) => setTargetRefCm(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center text-xs font-mono text-cyan-300"
                    />
                    <span className="text-slate-400">cm</span>
                    <button
                      onClick={() => handle1ClickCalibration(targetRefCm)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/50 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Set Anchor
                    </button>
                  </div>
                </div>

                {/* Face Breadth & Fine Multiplier Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300">Face Breadth (Bizygomatic):</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {settings.faceBreadthMm} mm
                      </span>
                    </div>
                    <input
                      type="range"
                      min="120"
                      max="160"
                      step="1"
                      value={settings.faceBreadthMm}
                      onChange={(e) => handleFaceBreadthChange(Number(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                  </div>

                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Fine Calibration Multiplier:</span>
                      <span className="text-emerald-400 font-bold">
                        {settings.scaleFactor.toFixed(3)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.01"
                      value={settings.scaleFactor}
                      onChange={(e) => handleScaleFactorChange(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={handleResetToProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to profile</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
          >
            Done &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
};
