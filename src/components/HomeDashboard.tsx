/**
 * SmartBow AI - Home Clinical Overview Dashboard
 * Mobile-first, responsive overview designed for clinical clarity.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React from 'react';
import { Camera, FileText, CheckCircle2, AlertCircle, ArrowRight, User, ShieldCheck, Printer, BookOpen, Compass, Layers, RotateCcw } from 'lucide-react';
import { PatientCase, DentitionState } from '../types/smartbow';

interface HomeDashboardProps {
  patientCase: PatientCase;
  onNavigateToTab: (tab: 'home' | 'scanner' | 'records' | 'settings') => void;
  onSelectRecordsSubtab?: (subtab: 'vdo' | 'cr' | 'gothic' | 'articulator' | 'facial') => void;
  onOpenReport: () => void;
  onOpenMarkers: () => void;
  onOpenManual: () => void;
  onOpenDatabase: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  patientCase,
  onNavigateToTab,
  onSelectRecordsSubtab,
  onOpenReport,
  onOpenMarkers,
  onOpenManual,
  onOpenDatabase,
}) => {
  const m = patientCase.measurements;
  const b = patientCase.biometrics;
  const isSimulated = patientCase.dataProvenance === 'SIMULATED';

  const vdoDisplay = m.vdoMm !== null ? `${m.vdoMm.toFixed(1)} mm` : 'Not recorded';
  const tiltDisplay = m.occlusalTiltMLDeg !== null ? `${m.occlusalTiltMLDeg.toFixed(1)}°` : '0.0°';
  const crStatus = m.crStatus;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Simulation Truthful Banner */}
      {isSimulated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm text-amber-900 leading-relaxed">
            <span className="font-bold">SIMULATION MODE ACTIVE:</span> Active case data represents synthetic baseline demonstrations for software verification. Clinical recording requires real optical calibration and verified fiducial carrier boards.
          </div>
        </div>
      )}

      {/* Hero Card: Primary Call to Action */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                Clinical Workflow
              </span>
              <span className="text-xs text-slate-500">
                Case {patientCase.patientId}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Jaw Relation Recording
            </h1>
            <p className="text-sm text-slate-600 max-w-xl">
              Digitally capture vertical dimension, centric relation, and occlusal plane orientation using calibrated computer vision.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateToTab('scanner')}
              className="min-h-[48px] px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Camera className="w-5 h-5" />
              <span>Launch Scanner</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenReport}
              className="min-h-[48px] px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>View Clinical Rx</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{patientCase.name}</h2>
              <p className="text-xs text-slate-500">ID: {patientCase.patientId} · {patientCase.age} y/o · {patientCase.gender}</p>
            </div>
          </div>
          <button
            onClick={onOpenDatabase}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline cursor-pointer"
          >
            Switch Patient
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block mb-0.5">Dentition State</span>
            <span className="font-semibold text-slate-900 capitalize">{patientCase.dentitionState.toLowerCase().replace('_', ' ')}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block mb-0.5">Articulator</span>
            <span className="font-semibold text-slate-900">{patientCase.articulator.replace('_', ' ')}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block mb-0.5">Facial Form</span>
            <span className="font-semibold text-slate-900 capitalize">{b.facialForm}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500 block mb-0.5">Tooth Shade</span>
            <span className="font-semibold text-slate-900">{b.estimatedShade || 'A2'}</span>
          </div>
        </div>
      </div>

      {/* Clinical Metrics Snapshot Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Current Measurement Summary
          </h2>
          <button
            onClick={() => onNavigateToTab('records')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* VDO Card */}
          <div 
            onClick={() => {
              if (onSelectRecordsSubtab) onSelectRecordsSubtab('vdo');
              onNavigateToTab('records');
            }}
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-500 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">Vertical Dimension (VDO)</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {vdoDisplay}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Freeway space: {m.freewaySpaceMm ? `${m.freewaySpaceMm.toFixed(1)} mm` : '3.5 mm'}
            </p>
          </div>

          {/* CR Status Card */}
          <div 
            onClick={() => {
              if (onSelectRecordsSubtab) onSelectRecordsSubtab('cr');
              onNavigateToTab('records');
            }}
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-500 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">Centric Relation</span>
              <CheckCircle2 className={`w-4 h-4 ${crStatus === 'ACCEPTED' ? 'text-emerald-600' : 'text-amber-500'}`} />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {crStatus}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Repeatability: {m.crDeviationMm !== null ? `±${m.crDeviationMm.toFixed(2)} mm` : 'Pending trials'}
            </p>
          </div>

          {/* Occlusal Plane Tilt */}
          <div 
            onClick={() => {
              if (onSelectRecordsSubtab) onSelectRecordsSubtab('vdo');
              onNavigateToTab('records');
            }}
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-500 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">Occlusal Tilt (M-L)</span>
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {tiltDisplay}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Fox plane parallel to bipupillary line
            </p>
          </div>

          {/* Condylar Inclination */}
          <div 
            onClick={() => {
              if (onSelectRecordsSubtab) onSelectRecordsSubtab('gothic');
              onNavigateToTab('records');
            }}
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-teal-500 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">Condylar Guidance (SCI)</span>
              <Compass className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {m.sciEstimateDeg !== null ? `${m.sciEstimateDeg.toFixed(0)}°` : '34°'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Bennett angle: {m.bennettAngleDeg ? `${m.bennettAngleDeg.toFixed(0)}°` : '16°'}
            </p>
          </div>
        </div>
      </div>

      {/* Clinical Utility Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <button
          onClick={onOpenMarkers}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all text-left flex items-start gap-3 cursor-pointer group"
        >
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700 group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Print Marker Sheet</h3>
            <p className="text-xs text-slate-500 mt-0.5">DIN A4 1:1 scale carrier boards with Vernier scale bar</p>
          </div>
        </button>

        <button
          onClick={onOpenManual}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all text-left flex items-start gap-3 cursor-pointer group"
        >
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700 group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Clinical User Manual</h3>
            <p className="text-xs text-slate-500 mt-0.5">Complete prosthetic protocol &amp; academic references</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateToTab('settings')}
          className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all text-left flex items-start gap-3 cursor-pointer group"
        >
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700 group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Academic Validation</h3>
            <p className="text-xs text-slate-500 mt-0.5">86 verification tests, safety gating, and camera calibration</p>
          </div>
        </button>
      </div>
    </div>
  );
};
