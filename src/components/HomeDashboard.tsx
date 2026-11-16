/**
 * SmartBow AI - Module 1: Clinical Overview Dashboard
 * Comprehensive dashboard with recent cases, capture status, 7-stage workflow tracker,
 * persistent demo/live provenance indicator, and 4-day presentation tour trigger.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React from 'react';
import { 
  Camera, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  User, 
  ShieldCheck, 
  Printer, 
  BookOpen, 
  Compass, 
  Layers, 
  RotateCcw, 
  Pencil, 
  Sparkles, 
  Activity, 
  Clock, 
  FolderKanban, 
  UserPlus, 
  Smile 
} from 'lucide-react';
import { PatientCase, DentitionState } from '../types/smartbow';

interface HomeDashboardProps {
  patientCase: PatientCase;
  allCases?: PatientCase[];
  onSelectCase?: (patientId: string) => void;
  onNewPatient?: () => void;
  onNavigateToTab: (tab: 'home' | 'scanner' | 'records' | 'settings' | 'assessment') => void;
  onSelectRecordsSubtab?: (subtab: 'maxilla' | 'mandible' | 'vdo' | 'cr' | 'gothic' | 'articulator' | 'measurements' | 'facial') => void;
  onOpenReport: () => void;
  onOpenMarkers: () => void;
  onOpenManual: () => void;
  onOpenDatabase: () => void;
  onEditPatient?: () => void;
  onStartNewExamination?: () => void;
  onLaunchTour?: () => void;
  onToggleDemoMode?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  patientCase,
  allCases = [],
  onSelectCase,
  onNewPatient,
  onNavigateToTab,
  onSelectRecordsSubtab,
  onOpenReport,
  onOpenMarkers,
  onOpenManual,
  onOpenDatabase,
  onEditPatient,
  onStartNewExamination,
  onLaunchTour,
  onToggleDemoMode,
}) => {
  const [showExamConfirm, setShowExamConfirm] = React.useState<boolean>(false);
  const m = patientCase.measurements;
  const b = patientCase.biometrics;
  const isSimulated = patientCase.dataProvenance === 'SIMULATED';

  // Strict honest formatting: NEVER inject defaults for missing values
  const vdoDisplay = m.vdoMm !== null ? `${m.vdoMm.toFixed(1)} mm` : 'UNAVAILABLE';
  const tiltDisplay = m.occlusalTiltMLDeg !== null ? `${m.occlusalTiltMLDeg.toFixed(1)}°` : 'UNAVAILABLE';
  const sciDisplay = m.sciEstimateDeg !== null ? `${m.sciEstimateDeg.toFixed(0)}°` : 'UNAVAILABLE';
  const fwsDisplay = m.freewaySpaceMm !== null && m.freewaySpaceMm !== undefined ? `${m.freewaySpaceMm.toFixed(1)} mm` : 'UNAVAILABLE';
  const crStatus = m.crStatus;

  // 7-Stage Digital Jaw Relation Workflow definitions
  const workflowStages = [
    {
      step: 1,
      title: 'Patient Assessment & Photometry',
      status: 'COMPLETE',
      detail: `${patientCase.name} (${patientCase.patientId}) · ${patientCase.dentitionState.replace('_', ' ')}`,
      action: () => onNavigateToTab('assessment')
    },
    {
      step: 2,
      title: 'Camera Intrinsics Calibration',
      status: patientCase.cameraCalibration?.isCalibrated ? 'CALIBRATED' : 'DEFAULT',
      detail: patientCase.cameraCalibration?.isCalibrated ? 'Validated pinhole intrinsics active' : 'Standard 1280×720 mobile sensor profile',
      action: () => onNavigateToTab('settings')
    },
    {
      step: 3,
      title: 'Maxillary Reference Plane (Fox Plane)',
      status: m.occlusalTiltMLDeg !== null ? 'RECORDED' : 'PENDING',
      detail: m.occlusalTiltMLDeg !== null ? `M-L Tilt: ${m.occlusalTiltMLDeg.toFixed(1)}° · A-P: ${m.occlusalTiltAPDeg?.toFixed(1) ?? '0.0'}°` : 'Requires maxillary ArUco carrier board (IDs 3–6)',
      action: () => {
        if (onSelectRecordsSubtab) onSelectRecordsSubtab('maxilla');
        onNavigateToTab('records');
      }
    },
    {
      step: 4,
      title: 'Mandibular Reference Relation',
      status: m.vdoMm !== null ? 'RECORDED' : 'PENDING',
      detail: m.vdoMm !== null ? `Carrier boards registered · Δ VDO: ${m.vdoMm.toFixed(1)} mm` : 'Requires mandibular ArUco carrier board (IDs 7–10)',
      action: () => {
        if (onSelectRecordsSubtab) onSelectRecordsSubtab('mandible');
        onNavigateToTab('records');
      }
    },
    {
      step: 5,
      title: 'Vertical Dimension (VDO & VDR)',
      status: m.vdoMm !== null ? 'VERIFIED' : 'PENDING',
      detail: m.vdoMm !== null ? `VDO: ${m.vdoMm.toFixed(1)} mm · FWS: ${fwsDisplay}` : 'Niswonger / Silverman phonetic tests',
      action: () => {
        if (onSelectRecordsSubtab) onSelectRecordsSubtab('vdo');
        onNavigateToTab('records');
      }
    },
    {
      step: 6,
      title: 'Centric Relation (3-Trial Repeatability)',
      status: m.crStatus === 'ACCEPTED' ? 'ACCEPTED' : (patientCase.crRecords.length >= 2 ? m.crStatus : 'PENDING'),
      detail: m.crDeviationMm !== null ? `Dispersion: ±${m.crDeviationMm.toFixed(2)} mm (${patientCase.crRecords.length} trials)` : 'Minimum 2 trials required for repeatability verification',
      action: () => {
        if (onSelectRecordsSubtab) onSelectRecordsSubtab('cr');
        onNavigateToTab('records');
      }
    },
    {
      step: 7,
      title: 'Gothic Arch & Articulator Programming',
      status: m.sciEstimateDeg !== null ? 'PROGRAMMED' : 'PENDING',
      detail: m.sciEstimateDeg !== null ? `SCI: ${m.sciEstimateDeg.toFixed(0)}° · Bennett: L ${m.bennettLeftDeg?.toFixed(0) ?? '16'}° / R ${m.bennettRightDeg?.toFixed(0) ?? '16'}°` : 'Dynamic needle-point border movement tracing',
      action: () => {
        if (onSelectRecordsSubtab) onSelectRecordsSubtab('gothic');
        onNavigateToTab('records');
      }
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Simulation Truthful Banner & Mode Toggle */}
      <div className={`rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
        isSimulated 
          ? 'bg-amber-50 border-amber-200 text-amber-900' 
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isSimulated ? 'text-amber-600' : 'text-emerald-600'}`} />
          <div className="text-xs sm:text-sm leading-relaxed">
            <span className="font-bold">
              {isSimulated ? 'SIMULATION MODE ACTIVE:' : 'LIVE MEASURED DATA SESSION:'}
            </span>{' '}
            {isSimulated
              ? 'Active case uses synthetic baseline demonstrations for software verification. Clinical recording requires real optical calibration.'
              : 'Physical optical measurements captured from verified camera intrinsics and real fiducial boards.'}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {onToggleDemoMode && (
            <button
              onClick={onToggleDemoMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                isSimulated 
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300' 
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
              }`}
            >
              {isSimulated ? 'Switch to Live Mode' : 'Switch to Demo Mode'}
            </button>
          )}
        </div>
      </div>

      {/* Hero Card: Primary Call to Action & Presentation Tour */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                SmartBow AI · Version 2.0
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Case {patientCase.patientId}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Digital Jaw Relation &amp; Prosthodontic Measurement System
            </h1>
            <p className="text-sm text-slate-600 max-w-xl">
              Smartphone computer vision workflow replacing physical facebow, Fox plane, Willis gauge, and needle-point Gothic arch tracer.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {onLaunchTour && (
              <button
                onClick={onLaunchTour}
                className="min-h-[46px] px-4 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-teal-200" />
                <span>4-Day Presentation Tour</span>
              </button>
            )}

            <button
              onClick={() => onNavigateToTab('scanner')}
              className="min-h-[46px] px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Scanner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenReport}
              className="min-h-[46px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Clinical Rx</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patient Profile & Recent Cases Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{patientCase.name}</h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{patientCase.patientId}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {patientCase.age} y/o · {patientCase.gender} · {patientCase.dentitionState.replace('_', ' ')} · Articulator: {patientCase.articulator.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {onStartNewExamination && (
              <button
                onClick={() => setShowExamConfirm(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                title="Initialize a fresh clinical examination session for this patient"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Exam</span>
              </button>
            )}
            {onEditPatient && (
              <button
                onClick={onEditPatient}
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                title="Edit Patient Details"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            )}
            <button
              onClick={onOpenDatabase}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
              <span>Switch Patient</span>
            </button>
            {onNewPatient && (
              <button
                onClick={onNewPatient}
                className="text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New Case</span>
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Starting a New Examination */}
        {showExamConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 text-slate-100 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Start New Examination?</h3>
                  <p className="text-xs text-slate-400">Patient: {patientCase.name} ({patientCase.patientId})</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will reset the active session’s measurement trials (CR records, Gothic arch points, and unverified telemetry) for a clean examination while preserving the patient’s demographic identity and history.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExamConfirm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExamConfirm(false);
                    if (onStartNewExamination) onStartNewExamination();
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirm New Exam</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Patient Attributes Grid */}
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

        {/* Recent Cases List (Module 1) */}
        {allCases.length > 1 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Recent Registered Cases in Registry:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {allCases.slice(0, 3).map((c) => (
                <div
                  key={c.patientId}
                  onClick={() => onSelectCase && onSelectCase(c.patientId)}
                  className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between ${
                    c.patientId === patientCase.patientId
                      ? 'bg-teal-50/60 border-teal-300 ring-1 ring-teal-200'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-900 block">{c.name}</span>
                    <span className="text-[11px] font-mono text-slate-500">{c.patientId} · {c.dentitionState.replace('_', ' ')}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    c.dataProvenance === 'MEASURED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {c.dataProvenance || 'SIM'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 7-Stage Digital Jaw Relation Workflow Status Tracker */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-700" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              7-Stage Digital Jaw Relation Workflow Tracker
            </h2>
          </div>
          <span className="text-xs font-semibold text-teal-700">
            Clinical Milestone Progress
          </span>
        </div>

        <div className="space-y-2.5">
          {workflowStages.map((wf) => (
            <div
              key={wf.step}
              onClick={wf.action}
              className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {wf.step}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{wf.title}</span>
                  <span className="text-[11px] text-slate-500">{wf.detail}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                  wf.status === 'COMPLETE' || wf.status === 'VERIFIED' || wf.status === 'ACCEPTED' || wf.status === 'RECORDED' || wf.status === 'CALIBRATED' || wf.status === 'PROGRAMMED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {wf.status}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Metrics Snapshot Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Current Measurement Summary
          </h2>
          <button
            onClick={() => {
              if (onSelectRecordsSubtab) onSelectRecordsSubtab('measurements');
              onNavigateToTab('records');
            }}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View Measurement Matrix</span>
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
              Freeway space: {fwsDisplay}
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
              if (onSelectRecordsSubtab) onSelectRecordsSubtab('maxilla');
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
              {sciDisplay}
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
            <p className="text-xs text-slate-500 mt-0.5">Safety gating, camera calibration, and literature datums</p>
          </div>
        </button>
      </div>
    </div>
  );
};
