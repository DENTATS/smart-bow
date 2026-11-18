/**
 * SmartBow AI — FaceLandmarkPanel Component
 *
 * Provides the unified Face Tracking & Manual Landmark Placement control panel on the Live Scanner:
 * - Mode switch: AUTO (MediaPipe FaceLandmarker) / MANUAL (9-point interactive placement)
 * - Always-available "Place landmarks manually" action
 * - 3-second auto-detection timeout prompt:
 *   "Face not found — try better light, or place landmarks manually."
 * - Manual workflow controls: next-point prompt, "Use auto points as starting positions",
 *   Undo, Reset, and derived interpupillary / ala–tragus readouts labelled "derived from manual points".
 */

import React from 'react';
import {
  Crosshair,
  RotateCcw,
  Undo2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Hand,
  Cpu,
} from 'lucide-react';
import {
  MANUAL_LANDMARK_DEFINITIONS,
  ManualLandmarkSet,
  MediaPipeFaceLandmarkerState,
  computeManualDerivedGeometry,
} from '../lib/faceLandmarks';

export interface FaceLandmarkPanelProps {
  faceMode: 'AUTO' | 'MANUAL';
  onChangeFaceMode: (mode: 'AUTO' | 'MANUAL') => void;
  modelState: MediaPipeFaceLandmarkerState;
  onRetryModelLoad: () => void;
  autoDetected: boolean;
  autoRollDeg: number;
  autoFailedFor3Sec: boolean;
  hasAutoLandmarksAvailable: boolean;
  manualPoints: ManualLandmarkSet;
  onUndoManualPoint: () => void;
  onResetManualPoints: () => void;
  onCopyAutoPointsToManual: () => void;
  canvasAspectRatio: number;
}

export const FaceLandmarkPanel: React.FC<FaceLandmarkPanelProps> = ({
  faceMode,
  onChangeFaceMode,
  modelState,
  onRetryModelLoad,
  autoDetected,
  autoRollDeg,
  autoFailedFor3Sec,
  hasAutoLandmarksAvailable,
  manualPoints,
  onUndoManualPoint,
  onResetManualPoints,
  onCopyAutoPointsToManual,
  canvasAspectRatio,
}) => {
  const placedCount = MANUAL_LANDMARK_DEFINITIONS.filter((d) => Boolean(manualPoints[d.key])).length;
  const nextDef = MANUAL_LANDMARK_DEFINITIONS.find((d) => !manualPoints[d.key]) || null;
  const derived = computeManualDerivedGeometry(manualPoints, canvasAspectRatio);

  return (
    <div className="bg-slate-950/92 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-xs font-mono shadow-lg space-y-2">
      {/* Row 1: Face Tracking Status + AUTO / MANUAL Switch + "Place landmarks manually" CTA */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              faceMode === 'AUTO'
                ? autoDetected
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
                : placedCount === 9
                ? 'bg-emerald-400'
                : 'bg-cyan-400'
            }`}
          />
          <span className="text-slate-400">FACE TRACKING:</span>
          {faceMode === 'AUTO' ? (
            <span className={autoDetected ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
              {autoDetected ? 'DETECTED' : 'NOT DETECTED'}
            </span>
          ) : (
            <span className="text-cyan-300 font-bold">
              MANUAL ({placedCount}/9 POINTS)
            </span>
          )}

          {/* MediaPipe Model Load Badge */}
          {faceMode === 'AUTO' && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] border flex items-center gap-1 ${
                modelState.status === 'READY'
                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                  : modelState.status === 'LOADING'
                  ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300'
                  : 'bg-rose-950/70 border-rose-700 text-rose-300'
              }`}
              title={modelState.errorMessage || 'MediaPipe FaceLandmarker Status'}
            >
              <Cpu className="w-3 h-3" />
              <span>
                {modelState.status === 'READY'
                  ? `MediaPipe (${modelState.delegate})`
                  : modelState.status === 'LOADING'
                  ? 'Loading MediaPipe...'
                  : 'MediaPipe Failed'}
              </span>
            </span>
          )}
        </div>

        {/* Mode Switch: AUTO / MANUAL + "Place landmarks manually" button */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onChangeFaceMode('AUTO')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                faceMode === 'AUTO'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              AUTO
            </button>
            <button
              onClick={() => onChangeFaceMode('MANUAL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                faceMode === 'MANUAL'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              MANUAL
            </button>
          </div>

          {faceMode === 'AUTO' && (
            <button
              onClick={() => onChangeFaceMode('MANUAL')}
              className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Hand className="w-3 h-3 text-cyan-400" />
              <span>Place landmarks manually</span>
            </button>
          )}
        </div>
      </div>

      {/* MediaPipe Failure Error Banner (if model failed to load) */}
      {faceMode === 'AUTO' && modelState.status === 'FAILED' && (
        <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-700/60 text-rose-200 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>MediaPipe error: {modelState.errorMessage || 'Model failed to load'}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onRetryModelLoad}
              className="px-2 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              Retry
            </button>
            <button
              onClick={() => onChangeFaceMode('MANUAL')}
              className="px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold cursor-pointer"
            >
              Manual Mode
            </button>
          </div>
        </div>
      )}

      {/* 3-Second Auto Timeout Guidance Banner */}
      {faceMode === 'AUTO' && !autoDetected && autoFailedFor3Sec && (
        <div className="p-2 rounded-lg bg-amber-950/70 border border-amber-500/50 text-amber-200 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold">
              Face not found — try better light, or place landmarks manually.
            </span>
          </div>
          <button
            onClick={() => onChangeFaceMode('MANUAL')}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 cursor-pointer"
          >
            Place landmarks manually
          </button>
        </div>
      )}

      {/* Auto Detected Summary */}
      {faceMode === 'AUTO' && autoDetected && (
        <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Canonical landmarks active (#468/#473 Iris, #9 Glabella, #168 Nasion, #1/#2 Nose/Sn, #152 Chin, #61/#291 Mouth, #234/#454 Edges)
            </span>
          </div>
          <span className="text-cyan-300 font-bold shrink-0">Roll: {autoRollDeg.toFixed(1)}°</span>
        </div>
      )}

      {/* Manual Mode Interactive Controls */}
      {faceMode === 'MANUAL' && (
        <div className="space-y-2 pt-1 border-t border-slate-800">
          {/* Next Point Prompt */}
          <div className="flex items-center justify-between gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-cyan-500/40">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
              {nextDef ? (
                <div>
                  <span className="text-cyan-300 font-bold">
                    Next ({nextDef.order}/9): {nextDef.label}
                  </span>
                  <span className="text-slate-400 block text-[10px]">
                    {nextDef.instruction} (Tap to place, drag any placed point to refine)
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-emerald-300 font-bold">
                    All 9/9 landmarks placed
                  </span>
                  <span className="text-slate-400 block text-[10px]">
                    Drag any point on the frozen frame to fine-tune with the zoom loupe.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onCopyAutoPointsToManual}
                disabled={!hasAutoLandmarksAvailable}
                title={
                  hasAutoLandmarksAvailable
                    ? 'Copy latest MediaPipe landmarks into manual points'
                    : 'Detect a face in AUTO mode first to seed from auto landmarks'
                }
                className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1 transition-colors ${
                  hasAutoLandmarksAvailable
                    ? 'bg-teal-950/80 hover:bg-teal-900 border-teal-500/50 text-teal-200 cursor-pointer'
                    : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Use auto points as starting positions</span>
              </button>

              <button
                onClick={onUndoManualPoint}
                disabled={placedCount === 0}
                className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1 ${
                  placedCount > 0
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 cursor-pointer'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo</span>
              </button>

              <button
                onClick={onResetManualPoints}
                disabled={placedCount === 0}
                className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1 ${
                  placedCount > 0
                    ? 'bg-rose-950/70 hover:bg-rose-900 border-rose-800 text-rose-200 cursor-pointer'
                    : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Derived Values Row (Explicitly labelled "derived from manual points") */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-2 py-1 rounded bg-slate-900/70 border border-slate-800 text-[10px]">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                <span className="text-slate-400">Interpupillary Tilt: </span>
                <span className="text-cyan-300 font-bold">
                  {derived.interpupillaryRollDeg !== null ? `${derived.interpupillaryRollDeg}°` : '—'}
                </span>
              </span>
              <span>
                <span className="text-slate-400">R Ala–Tragus: </span>
                <span className="text-purple-300 font-bold">
                  {derived.rightAlaTragusDeg !== null ? `${derived.rightAlaTragusDeg}°` : '—'}
                </span>
              </span>
              <span>
                <span className="text-slate-400">L Ala–Tragus: </span>
                <span className="text-purple-300 font-bold">
                  {derived.leftAlaTragusDeg !== null ? `${derived.leftAlaTragusDeg}°` : '—'}
                </span>
              </span>
              <span>
                <span className="text-slate-400">Lower 1/3 Ratio: </span>
                <span className="text-amber-300 font-bold">
                  {derived.lowerFacialThirdRatioPct !== null ? `${derived.lowerFacialThirdRatioPct}%` : '—'}
                </span>
              </span>
            </div>
            <span className="text-slate-400 italic">({derived.provenanceLabel})</span>
          </div>
        </div>
      )}
    </div>
  );
};
