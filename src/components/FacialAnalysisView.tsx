/**
 * SmartBow AI - Facial Biometrics & Treatment Planning
 * Implements Layer 5 (Facial Analysis) and Layer 6 (Treatment Suggestions)
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React from 'react';
import { Smile, Sparkles, UserCheck, Shield, CheckCircle2 } from 'lucide-react';
import { FacialBiometrics } from '../types/smartbow';
import { generateClinicalSuggestions } from '../lib/clinicalMath';

interface FacialAnalysisViewProps {
  biometrics: FacialBiometrics;
  vdoMm: number;
  crDeviationMm: number | null;
  onSelectShade: (shade: string) => void;
}

export const FacialAnalysisView: React.FC<FacialAnalysisViewProps> = ({
  biometrics,
  vdoMm,
  crDeviationMm,
  onSelectShade,
}) => {
  const suggestions = generateClinicalSuggestions(biometrics, vdoMm, crDeviationMm);

  // Biometric central incisor width estimation (Berry's ratio: Central Incisor Width = Bizygomatic Width / 16)
  const estimatedCiwMm = (biometrics.bizygomaticWidthMm / 16).toFixed(1);
  const estimatedArchWidthMm = (biometrics.bizygomaticWidthMm * 0.38).toFixed(1);

  const shades = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'C1', 'D2'];

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Smile className="w-5 h-5 text-cyan-400" />
          <span>Biometric Facial Analysis & Complete Denture Treatment Planning</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Automated cephalometric & esthetic extraction from 468 MediaPipe facial landmarks without physical calipers or face stickers
        </p>
      </div>

      {/* Primary Biometrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Facial Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
              Facial Form Classification
            </span>
            <div className="mt-3">
              <span className="text-3xl font-bold uppercase text-white tracking-tight">
                {biometrics.facialForm}
              </span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-xs font-mono text-cyan-400">
            Ratio: {biometrics.bizFaceRatio}
          </div>
        </div>

        {/* Metric 2: Bizygomatic Width */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
              Bizygomatic Width (Arch)
            </span>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono text-white tabular-nums">
                {biometrics.bizygomaticWidthMm}
              </span>
              <span className="text-xs font-mono text-slate-400">mm</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
            Arch: ~{estimatedArchWidthMm}mm
          </div>
        </div>

        {/* Metric 3: Interpupillary Line Tilt */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
              Interpupillary Line Tilt
            </span>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono text-amber-300 tabular-nums">
                {biometrics.interpupillaryTiltDeg}°
              </span>
              <span className="text-xs font-mono text-slate-400">deg</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
            Parallel to Fox Plane
          </div>
        </div>

        {/* Metric 4: Lip Competence Gap */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
              Resting Lip Gap (Vermilion)
            </span>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono text-emerald-400 tabular-nums">
                {biometrics.lipGapMm}
              </span>
              <span className="text-xs font-mono text-slate-400">mm</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
            Lip Support: Adequate
          </div>
        </div>
      </div>

      {/* Prosthodontic Selection Prescription */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tooth Mould Selection (Leon Williams Principle) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Tooth Mould Selection (Law of Harmony)</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            According to Leon Williams, the upside-down contours of the maxillary central incisor match the patient's facial contour.
          </p>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Prescribed Mould:</span>
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
                {suggestions.mouldSuggestion}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {suggestions.mouldDescription}
            </p>

            <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-mono">
              <span className="text-slate-400">Estimated Incisor Width (CIW):</span>
              <span className="text-white font-semibold">{estimatedCiwMm} mm</span>
            </div>
          </div>

          {/* Anatomic Mould Visual Diagram */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
            <div className={`p-3 rounded-lg border transition-all ${biometrics.facialForm === 'square' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/40 text-slate-500'}`}>
              <div className="h-12 w-8 mx-auto border-2 border-current rounded-none mb-2" />
              <span>Square (Class I)</span>
            </div>
            <div className={`p-3 rounded-lg border transition-all ${biometrics.facialForm === 'tapering' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/40 text-slate-500'}`}>
              <div className="h-12 w-8 mx-auto border-2 border-current rounded-t-sm mb-2" style={{ clipPath: 'polygon(15% 0%, 85% 0%, 65% 100%, 35% 100%)' }} />
              <span>Tapering (Class II)</span>
            </div>
            <div className={`p-3 rounded-lg border transition-all ${biometrics.facialForm === 'ovoid' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/40 text-slate-500'}`}>
              <div className="h-12 w-8 mx-auto border-2 border-current rounded-full mb-2" />
              <span>Ovoid (Class III)</span>
            </div>
          </div>
        </div>

        {/* Shade Guidance & Clinical Prescriptions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">Tooth Shade Selection (Vitapan Classical)</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Camera RGB calibration and skin undertone analysis suggest {biometrics.estimatedShade} as the baseline shade range.
          </p>

          <div className="grid grid-cols-4 gap-2">
            {shades.map((shade) => (
              <button
                key={shade}
                onClick={() => onSelectShade(shade)}
                className={`py-2 px-3 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  biometrics.estimatedShade === shade
                    ? 'border-amber-400 bg-amber-400/20 text-amber-200 ring-2 ring-amber-400/20'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                }`}
              >
                {shade}
              </button>
            ))}
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Prosthetic Treatment Advice</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {suggestions.vdoAssessment}. {suggestions.vdoAction}.
            </p>
            <p className="text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
              {suggestions.crQuality}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
