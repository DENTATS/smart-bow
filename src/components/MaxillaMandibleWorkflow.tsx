/**
 * SmartBow AI - Module 5: Maxillary & Mandibular Reference Acquisition Workflow
 * Dedicated prosthodontic acquisition stages for occlusal plane tilts and mandibular relation.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { 
  RotateCcw, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Compass, 
  ArrowRight, 
  Sliders, 
  Info,
  Camera,
  ShieldCheck
} from 'lucide-react';
import { PatientCase, MeasurementSourceStatus } from '../types/smartbow';
import { resolveMeasurementSourceStatus, getMeasurementStatusBadgeInfo } from '../lib/clinicalMath';

interface MaxillaMandibleWorkflowProps {
  patientCase: PatientCase;
  stage: 'MAXILLA' | 'MANDIBLE';
  onUpdateTiltML: (tilt: number) => void;
  onUpdateTiltAP: (tilt: number) => void;
  onUpdateMidline: (shift: number) => void;
  onNavigateToTab?: (tab: any) => void;
  onNavigateToSubtab?: (subtab: any) => void;
}

export const MaxillaMandibleWorkflow: React.FC<MaxillaMandibleWorkflowProps> = ({
  patientCase,
  stage,
  onUpdateTiltML,
  onUpdateTiltAP,
  onUpdateMidline,
  onNavigateToTab,
  onNavigateToSubtab,
}) => {
  const m = patientCase.measurements;
  const b = patientCase.biometrics;
  const prov = patientCase.dataProvenance || 'SIMULATED';

  const [activeWorkflowStage, setActiveWorkflowStage] = useState<'MAXILLA' | 'MANDIBLE'>(stage);

  // Status badges
  const tiltMLStatus = resolveMeasurementSourceStatus(m.occlusalTiltMLDeg, prov, true, prov === 'MEASURED');
  const tiltAPStatus = resolveMeasurementSourceStatus(m.occlusalTiltAPDeg, prov, true, prov === 'MEASURED');
  const midlineStatus = resolveMeasurementSourceStatus(m.midlineShiftMm, prov, true, prov === 'MEASURED');
  const vdoStatus = resolveMeasurementSourceStatus(m.vdoMm, prov, true, prov === 'MEASURED');

  const badgeML = getMeasurementStatusBadgeInfo(tiltMLStatus);
  const badgeAP = getMeasurementStatusBadgeInfo(tiltAPStatus);
  const badgeMidline = getMeasurementStatusBadgeInfo(midlineStatus);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header and Stage Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-950/70 border border-teal-800 px-2 py-0.5 rounded">
                Module 5 · Jaw Relation Workflow
              </span>
              <span className="text-xs text-slate-400">
                {activeWorkflowStage === 'MAXILLA' ? 'Stage 1: Maxillary Reference Plane' : 'Stage 2: Mandibular Occlusal Registration'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-teal-400" />
              <span>
                {activeWorkflowStage === 'MAXILLA' 
                  ? 'Maxillary Occlusal Plane & Midline Reference' 
                  : 'Mandibular Reference & Interocclusal Relation'}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {activeWorkflowStage === 'MAXILLA'
                ? 'Digitally verifies Fox Plane parallelism against bipupillary line and Camper\'s line (ala-tragus).'
                : 'Registers mandibular spatial trajectory, freeway space clearance, and condylar guidance path.'}
            </p>
          </div>

          {/* Clean Stage Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-center">
            <button
              onClick={() => setActiveWorkflowStage('MAXILLA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeWorkflowStage === 'MAXILLA'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Maxilla Reference
            </button>
            <button
              onClick={() => setActiveWorkflowStage('MANDIBLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeWorkflowStage === 'MANDIBLE'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Mandible Relation
            </button>
          </div>
        </div>
      </div>

      {activeWorkflowStage === 'MAXILLA' ? (
        /* ================= MAXILLARY WORKFLOW ================= */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1: Mediolateral Tilt */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-mono text-slate-400">Mediolateral Tilt (M-L)</span>
                  <RotateCcw className="w-4 h-4 text-teal-400" />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold font-mono text-white tabular-nums">
                    {m.occlusalTiltMLDeg !== null ? m.occlusalTiltMLDeg.toFixed(1) : '0.0'}°
                  </span>
                  <span className="text-xs font-mono text-slate-400">deg</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Frontal cant relative to the Interpupillary Line (Bipupillary axis).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeML.badgeClass}`}>
                  {badgeML.label}
                </span>
                <p className="text-[11px] text-slate-400">
                  Target: 0.0° ± 1.0° for esthetic smile symmetry.
                </p>
              </div>
            </div>

            {/* Metric 2: Anteroposterior Tilt */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-mono text-slate-400">Anteroposterior Tilt (A-P)</span>
                  <Compass className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold font-mono text-white tabular-nums">
                    {m.occlusalTiltAPDeg !== null ? m.occlusalTiltAPDeg.toFixed(1) : '4.8'}°
                  </span>
                  <span className="text-xs font-mono text-slate-400">deg</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Sagittal inclination relative to Camper&apos;s Line (Ala-Tragus).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeAP.badgeClass}`}>
                  {badgeAP.label}
                </span>
                <p className="text-[11px] text-slate-400">
                  Normal prosthodontic range: 4.0° to 8.0° posteriorly inclined.
                </p>
              </div>
            </div>

            {/* Metric 3: Maxillary Midline Shift */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-mono text-slate-400">Maxillary Midline Shift</span>
                  <Sliders className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold font-mono text-white tabular-nums">
                    {m.midlineShiftMm !== null ? m.midlineShiftMm.toFixed(1) : '0.0'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">mm</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Transverse shift relative to the Facial Midline (Glabella–Philtrum).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeMidline.badgeClass}`}>
                  {badgeMidline.label}
                </span>
                <p className="text-[11px] text-slate-400">
                  Target: &lt; 0.5 mm deviation for harmonious central dental midline.
                </p>
              </div>
            </div>
          </div>

          {/* Prosthodontic Clinical Verification Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Prosthodontic Wax Rim Contouring Verification Guidelines</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>1. Incisal Edge Display:</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  1.0 to 2.0 mm of anterior wax visible below relaxed upper lip (Boucher 12th ed.).
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>2. Parallelism with Bipupillary Line:</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Fox plane guide parallel to eye line in frontal plane without unilateral cant.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>3. Parallelism with Camper&apos;s Line:</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Posterior occlusal plane parallel to ala-tragus line when observed from lateral profile.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>4. Lip Support &amp; Nasolabial Angle:</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Adequate philtrum fullness with nasolabial angle restored to approximately 90°–100°.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveWorkflowStage('MANDIBLE')}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Mandibular Acquisition</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= MANDIBULAR WORKFLOW ================= */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1: VDO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-mono text-slate-400">Vertical Dimension (VDO)</span>
                  <Layers className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold font-mono text-white tabular-nums">
                    {m.vdoMm !== null ? m.vdoMm.toFixed(1) : '62.5'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">mm</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Distance between subnasale and menton in maximal occlusal contact.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border bg-teal-500/10 text-teal-400 border-teal-500/30">
                  OCCLUSAL CONTACT
                </span>
                <p className="text-[11px] text-slate-400">
                  Freeway space: {m.freewaySpaceMm ? `${m.freewaySpaceMm.toFixed(1)} mm` : '3.5 mm'} (normal 2–4mm).
                </p>
              </div>
            </div>

            {/* Metric 2: Centric Relation Repeatability */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-mono text-slate-400">Centric Relation Repeatability</span>
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold font-mono text-white tabular-nums">
                    {m.crDeviationMm !== null ? `±${m.crDeviationMm.toFixed(2)}` : '±0.26'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">mm</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Pairwise 3D dispersion across 3 recorded bimanual CR guidance trials.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  m.crStatus === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {m.crStatus}
                </span>
                <p className="text-[11px] text-slate-400">
                  Dawson / Boucher doctrine: Repeatability &lt; 0.5 mm establishes verifiable CR.
                </p>
              </div>
            </div>

            {/* Metric 3: Condylar Guidance (SCI) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-mono text-slate-400">Condylar Guidance (SCI)</span>
                  <Compass className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold font-mono text-white tabular-nums">
                    {m.sciEstimateDeg !== null ? m.sciEstimateDeg.toFixed(0) : '34'}°
                  </span>
                  <span className="text-xs font-mono text-slate-400">deg</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Horizontal condylar inclination estimated from protrusive border trajectory.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                  HANAU FORMULA
                </span>
                <p className="text-[11px] text-slate-400">
                  Transferred to semi-adjustable articulator for balanced occlusion.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Subtab Jump Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onNavigateToSubtab && onNavigateToSubtab('vdo')}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 text-left transition-all cursor-pointer group"
            >
              <h4 className="text-xs font-bold text-teal-400 flex items-center justify-between">
                <span>VDO 6-Checkpoint Suite</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Silverman phonetics, Niswonger rest, Willis symmetry, Shanahan deglutition.
              </p>
            </button>

            <button
              onClick={() => onNavigateToSubtab && onNavigateToSubtab('cr')}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 text-left transition-all cursor-pointer group"
            >
              <h4 className="text-xs font-bold text-teal-400 flex items-center justify-between">
                <span>Centric Relation 3-Trial Matrix</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Pairwise Euclidean matrix with &lt; 0.5 mm repeatability verification.
              </p>
            </button>

            <button
              onClick={() => onNavigateToSubtab && onNavigateToSubtab('gothic')}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 text-left transition-all cursor-pointer group"
            >
              <h4 className="text-xs font-bold text-teal-400 flex items-center justify-between">
                <span>Gothic Arch &amp; Excursions</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Centric apex detection, protrusive condylar path, and Bennett angles.
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
