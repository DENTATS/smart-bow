/**
 * SmartBow AI - Software Self-Correction & Mathematical Invariance Explainer
 * Explains how the 3-group marker triangulation cancels out handheld phone angle, distance, and trembling.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React from 'react';
import { X, ShieldCheck, CheckCircle2, Smartphone, Compass, ArrowRight, BookOpen, Layers } from 'lucide-react';

interface SoftwareSelfCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneRollDeg?: number;
  phoneYawDeg?: number;
  distanceCm?: number;
  vdoMm?: number;
}

export const SoftwareSelfCorrectionModal: React.FC<SoftwareSelfCorrectionModalProps> = ({
  isOpen,
  onClose,
  phoneRollDeg = 0,
  phoneYawDeg = 0,
  distanceCm = 48,
  vdoMm = 62.5
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Software Self-Correction Engine</h3>
              <p className="text-xs text-slate-400">Rigid Body Invariance &amp; Handheld Pose Cancellation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-300">
          {/* Core Principle Banner */}
          <div className="p-4 bg-emerald-950/40 border border-emerald-700/50 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Core Geometric Principle: Phone Position is Mathematically Irrelevant</span>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              The three face marker groups establish a complete, self-contained 3D coordinate system anchored directly to the patient's skull. It does not matter where the phone is held, what tilt angle it has, or if the operator's hands tremble — as long as all 3 marker groups are visible, the software computes all jaw kinematics relative to the patient's anatomical face frame (<code className="text-emerald-300 font-mono">T_patient</code>), not the phone camera.
            </p>
          </div>

          {/* Mathematical Proof Card */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mathematical Invariance Proof (Matrix Cancellation)</span>
            </div>
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2 text-slate-200">
              <div className="text-[11px] text-slate-400">1. Camera detects patient anatomical frame:</div>
              <div className="text-cyan-300 pl-3">T_cam_to_patient = [ R_patient | t_patient ]</div>

              <div className="text-[11px] text-slate-400 pt-1">2. Camera detects mandibular target board:</div>
              <div className="text-emerald-300 pl-3">T_cam_to_mand = [ R_mand | t_mand ]</div>

              <div className="text-[11px] text-slate-400 pt-1">3. Solve mandibular pose relative to patient skull:</div>
              <div className="text-amber-300 font-bold pl-3 text-xs">
                T_mand_rel_patient = (T_cam_to_patient)⁻¹ · T_cam_to_mand
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              The camera coordinate frame <code className="text-cyan-300">T_cam</code> is eliminated on both sides of the matrix equation. The resulting jaw position and VDO are 100% invariant to phone roll, pitch, yaw, and distance!
            </p>
          </div>

          {/* Live Telemetry Status */}
          <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Live Invariant Telemetry</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                ACTIVE SELF-CORRECTION
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase">Phone Roll</div>
                <div className="text-base font-bold text-slate-200">{phoneRollDeg > 0 ? `+${phoneRollDeg}°` : `${phoneRollDeg}°`}</div>
                <div className="text-[9px] text-emerald-400 mt-0.5">Cancelled</div>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase">Phone Yaw</div>
                <div className="text-base font-bold text-slate-200">{phoneYawDeg > 0 ? `+${phoneYawDeg}°` : `${phoneYawDeg}°`}</div>
                <div className="text-[9px] text-emerald-400 mt-0.5">Cancelled</div>
              </div>

              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase">Camera Dist</div>
                <div className="text-base font-bold text-slate-200">{distanceCm} cm</div>
                <div className="text-[9px] text-emerald-400 mt-0.5">Invariant</div>
              </div>

              <div className="p-2.5 bg-emerald-950/40 border border-emerald-700/60 rounded-lg">
                <div className="text-[10px] text-emerald-400 uppercase">True Patient VDO</div>
                <div className="text-base font-bold text-emerald-300">{vdoMm.toFixed(1)} mm</div>
                <div className="text-[9px] text-emerald-300 mt-0.5">Stabilized</div>
              </div>
            </div>
          </div>

          {/* Why the Positioning Guide Exists */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Why We Still Provide the On-Screen Positioning Guide</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              If phone orientation is mathematically irrelevant, why have an on-screen guide?
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-white">Field of View Guarantee:</strong> The phone must be held at an angle and distance where all three marker groups remain comfortably in-frame and in sharp optical focus.
              </li>
              <li>
                <strong className="text-white">Marker Coverage Validation:</strong> If the clinician holds the phone too far laterally or too close, one of the three target groups might be clipped by the edge of the sensor.
              </li>
              <li>
                <strong className="text-white">Optimal Reprojection Geometry:</strong> Angles between 30°–45° right anterolateral provide the crispest perspective disparity for ArUco planar homography.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex justify-end bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Understood · Back to Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
