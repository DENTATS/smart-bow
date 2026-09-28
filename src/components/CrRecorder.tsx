/**
 * SmartBow AI - Centric Relation (CR) Repeatability Recording
 * Implements 3-Trial CR Capture, Pairwise Distance Matrix & Repeatability Verification
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, RotateCcw, Plus, Activity, Target } from 'lucide-react';
import { CrRecord, Point3D } from '../types/smartbow';
import { computeCrDeviation } from '../lib/clinicalMath';

interface CrRecorderProps {
  records: CrRecord[];
  onAddRecord: () => void;
  onClearRecords: () => void;
  currentMandibularPos: Point3D;
  vdoMm: number;
}

export const CrRecorder: React.FC<CrRecorderProps> = ({
  records,
  onAddRecord,
  onClearRecords,
  currentMandibularPos,
  vdoMm,
}) => {
  const points = records.map(r => r.mandibularCentroidPatient);
  const evaluation = computeCrDeviation(points);

  const statusConfig = {
    ACCEPTED: {
      label: 'ACCEPTED ✓',
      sublabel: 'Repeatability < 0.5 mm (Optimal Neuromuscular Verification)',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle
    },
    RETRY: {
      label: 'RETRY ⚠',
      sublabel: 'Deviation 0.5 – 1.0 mm (Muscle Guarding / Splinting Detected)',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: AlertTriangle
    },
    REJECT: {
      label: 'REJECT ✗',
      sublabel: 'Deviation > 1.0 mm (Excessive Error; Deprogramme with Leaf Gauge)',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: XCircle
    }
  };

  const currentStatus = records.length >= 2 ? statusConfig[evaluation.status] : null;

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Screen Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            <span>Centric Relation (CR) Repeatability Verification</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Capture 3 independent recordings of the mandibular position during bimanual manipulation or Gothic arch apex guidance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <button
              onClick={onClearRecords}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Trials</span>
            </button>
          )}

          <button
            onClick={onAddRecord}
            disabled={records.length >= 3}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer ${
              records.length >= 3
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold hover:shadow-cyan-500/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{records.length >= 3 ? '3 Trials Completed' : `Capture Trial (${records.length + 1}/3)`}</span>
          </button>
        </div>
      </div>

      {/* Main Scorecard & Repeatability Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Deviation Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
              Max Spatial Deviation
            </span>
            <span className="text-[10px] font-mono text-cyan-400">Target &lt; 0.50mm</span>
          </div>

          <div className="my-4 flex items-baseline gap-2">
            <span className={`text-6xl font-bold font-mono tracking-tight tabular-nums ${records.length < 2 ? 'text-slate-500' : evaluation.status === 'ACCEPTED' ? 'text-emerald-400' : evaluation.status === 'RETRY' ? 'text-amber-400' : 'text-rose-400'}`}>
              {records.length >= 2 ? evaluation.maxDeviationMm.toFixed(2) : '--'}
            </span>
            <span className="text-lg font-mono text-slate-400 font-medium">mm</span>
          </div>

          <div className="text-xs text-slate-400 pt-3 border-t border-slate-800 flex justify-between">
            <span>Verified Trials:</span>
            <span className="font-mono text-white font-semibold">{records.length} / 3</span>
          </div>
        </div>

        {/* Metric 2: Repeatability Decision */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
              Clinical Quality Assessment
            </span>
            <span className="text-xs text-slate-500 font-mono">Dr. Deepanshu Protocol</span>
          </div>

          <div className="my-3">
            {currentStatus ? (
              <div className={`p-4 rounded-xl border ${currentStatus.badgeClass} flex items-start gap-3`}>
                <currentStatus.icon className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold font-mono tracking-wide">{currentStatus.label}</h4>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">{currentStatus.sublabel}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 text-xs flex items-center gap-3">
                <Activity className="w-5 h-5 text-slate-500 shrink-0" />
                <span>
                  Tap <strong>"Capture Trial"</strong> three times while holding the patient in centric relation (Dawson bimanual manipulation or chin-point guidance) to compute repeatability.
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <span>&lt; 0.50mm: Accepted</span>
            <span>0.50 – 1.00mm: Deprogramme</span>
            <span>&gt; 1.00mm: Unstable rim / Reject</span>
          </div>
        </div>
      </div>

      {/* Trial Table & 2D Dispersion Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Table of Trials */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-3">Captured Centric Relation Trials</h3>

          {records.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No CR positions recorded yet. Click "Capture Trial (1/3)" to begin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase font-mono text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Trial</th>
                    <th className="py-2 px-3 font-mono">X (mm)</th>
                    <th className="py-2 px-3 font-mono">Y (mm)</th>
                    <th className="py-2 px-3 font-mono">Z (mm)</th>
                    <th className="py-2 px-3 font-mono">VDO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-semibold text-cyan-400">Trial #{r.trialIndex}</td>
                      <td className="py-2.5 px-3 text-slate-300">{r.mandibularCentroidPatient.x.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-slate-300">{r.mandibularCentroidPatient.y.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-slate-300">{r.mandibularCentroidPatient.z.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-slate-200">{r.vdoMm.toFixed(1)} mm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {evaluation.pairwiseDistances.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono text-slate-400 space-y-1">
              <span className="text-[11px] uppercase text-slate-500 block mb-1">Pairwise Euclidean Displacements:</span>
              {evaluation.pairwiseDistances.map((d, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>Pairwise Δ{idx + 1}:</span>
                  <span className={d < 0.5 ? 'text-emerald-400' : 'text-amber-400'}>{d.toFixed(3)} mm</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2D Dispersion Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Centroid Repeatability Scatter (X-Y)</h3>
              <span className="text-[11px] font-mono text-slate-400">Scale: 1 grid = 0.25mm</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Points within the dashed green circle indicate &lt;0.5mm repeatability threshold.
            </p>
          </div>

          <div className="relative w-full h-56 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden">
            <svg viewBox="-3 -3 6 6" className="w-full h-full">
              {/* Grid Lines */}
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#334155" strokeWidth="0.04" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#334155" strokeWidth="0.04" />

              {/* 0.5mm Target Radius Circle */}
              <circle cx="0" cy="0" r="0.5" fill="rgba(16, 185, 129, 0.08)" stroke="#10b981" strokeWidth="0.04" strokeDasharray="0.1,0.1" />

              {/* 1.0mm Warning Circle */}
              <circle cx="0" cy="0" r="1.0" fill="none" stroke="#f59e0b" strokeWidth="0.03" strokeDasharray="0.1,0.1" />

              {/* Plotted recorded centroids */}
              {records.map((r, i) => {
                const cx = (r.mandibularCentroidPatient.x % 2);
                const cy = (r.mandibularCentroidPatient.y % 2);
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="0.1" fill="#06b6d4" stroke="#ffffff" strokeWidth="0.03" />
                    <text x={cx + 0.15} y={cy - 0.1} fontSize="0.25" fill="#38bdf8" fontFamily="monospace">
                      #{r.trialIndex}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              &lt; 0.5mm Target Zone
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Recorded Trials
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
