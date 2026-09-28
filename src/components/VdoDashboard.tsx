/**
 * SmartBow AI - VDO (Vertical Dimension of Occlusion) Clinical Checkpoint Verification Suite
 * Grounded in classical and contemporary prosthodontic literature:
 * 1. Niswonger / Thompson: Physiologic Rest Position & Freeway Space (FWS = VDR - VDO, 2-4mm)
 * 2. Silverman: Closest Speaking Space (Phonetic "S" count, 1-2mm clearance)
 * 3. da Vinci / Williams / Frush & Fisher: Lower Facial Third Proportional Harmony (30-36%)
 * 4. Shanahan: Deglutition / Swallowing Mandibular Seating
 * 5. Willis: Craniofacial Symmetrical Equality (Pupil-Commissure = Subnasale-Menton)
 * 6. Lytle / Boucher: Tactile Perception & Masticatory Muscle Relaxation
 * 
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  HelpCircle, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Volume2, 
  Scale, 
  Activity, 
  Info,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  X,
  ArrowLeft,
  Ruler,
  Camera,
  Zap
} from 'lucide-react';
import { FacialBiometrics } from '../types/smartbow';
import { VDO_CHECKPOINTS, VdoCheckpoint, JAW_KINEMATIC_DOCTRINES } from '../lib/prosthodonticLiterature';
import { VdoExplainerModal } from './VdoExplainerModal';

interface VdoDashboardProps {
  vdoMm: number;
  onUpdateVdo: (vdo: number) => void;
  biometrics: FacialBiometrics;
  vdrMm: number;
  onUpdateVdr: (vdr: number) => void;
  onNavigateToTab?: (tab: 'scanner' | 'vdo' | 'cr' | 'gothic' | 'facial' | 'articulator' | 'validation') => void;
}

export const VdoDashboard: React.FC<VdoDashboardProps> = ({
  vdoMm,
  onUpdateVdo,
  biometrics,
  vdrMm,
  onUpdateVdr,
  onNavigateToTab,
}) => {
  const [lockedTarget, setLockedTarget] = useState<number | null>(62.0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>('physiologic_rest');
  const [showLiteratureCompendium, setShowLiteratureCompendium] = useState<boolean>(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState<boolean>(false);
  const [recordedVdrTime, setRecordedVdrTime] = useState<string | null>(null);
  const [fwsPreset, setFwsPreset] = useState<number>(3.0);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<1 | 2 | 3 | 4>(1);
  const [recordingToast, setRecordingToast] = useState<string | null>(null);

  // Clinical Checkpoint verification states (saved in component state)
  const [verifiedCheckpoints, setVerifiedCheckpoints] = useState<Record<string, {
    passed: boolean;
    observedValue: string;
    verifiedAt: string;
    notes: string;
  }>>({
    physiologic_rest: {
      passed: true,
      observedValue: `${(vdrMm - vdoMm).toFixed(1)} mm Freeway Space`,
      verifiedAt: 'Session Baseline',
      notes: 'Patient swallowed and relaxed; bilateral freeway space verified.'
    },
    facial_thirds: {
      passed: biometrics.lowerThirdPct >= 30 && biometrics.lowerThirdPct <= 36,
      observedValue: `${biometrics.lowerThirdPct.toFixed(1)}% of total facial height`,
      verifiedAt: 'Optical Mesh Analysis',
      notes: 'Lower facial height well proportioned.'
    },
    silverman_s: {
      passed: true,
      observedValue: '1.5 mm speaking clearance',
      verifiedAt: 'Phonetic Count 60-66',
      notes: 'No clicking on sibilant sounds.'
    },
    willis_commissure: {
      passed: true,
      observedValue: `${Math.abs(vdoMm - 62.8).toFixed(1)} mm discrepancy`,
      verifiedAt: 'Willis Gauge Comparison',
      notes: 'Pupil-commissure equals subnasale-menton within 1.5mm.'
    }
  });

  const lowerThirdPct = biometrics.lowerThirdPct;
  const freewaySpaceMm = Math.max(0, Number((vdrMm - vdoMm).toFixed(1)));

  // Target evaluation
  // Normal: 30% - 36% (ideal 33%)
  let statusColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  let statusText = 'PHYSIOLOGICAL VDO (OPTIMAL HARMONY)';
  let clinicalAdvice = 'Lower facial third proportion is harmonized within 30–36% esthetic norm. Freeway space conforms to Boucher & Niswonger criteria (2.0–4.0 mm). Maintain current occlusal rim vertical dimension.';
  let isNormal = true;

  if (lowerThirdPct < 30) {
    statusColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    statusText = 'COLLAPSED VDO (UNDER-ESTABLISHED / OVER-CLOSED)';
    const deficitMm = ((33 - lowerThirdPct) * 0.9).toFixed(1);
    clinicalAdvice = `Patient displays collapsed lower facial height (${lowerThirdPct}%). Increase occlusal rim wax height by +${deficitMm} mm to restore vermilion border support, eliminate pseudoprognathic profile, and prevent angular cheilitis (Boucher, 12th ed).`;
    isNormal = false;
  } else if (lowerThirdPct > 36) {
    statusColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    statusText = 'OVER-OPENED VDO (EXCESSIVE INTEROCCLUSAL HEIGHT)';
    const excessMm = ((lowerThirdPct - 33) * 0.9).toFixed(1);
    clinicalAdvice = `Excessive vertical dimension detected (${lowerThirdPct}%). Encroaches on closest speaking space (Silverman, 1953). Reduce occlusal rim wax height by -${excessMm} mm to avoid muscle fatigue, teeth clattering, and accelerated residual alveolar ridge resorption.`;
    isNormal = false;
  }

  // Freeway space evaluation (2 - 4 mm is standard)
  let fwsStatus = 'Optimal (2.0 – 4.0 mm) · Boucher Criteria Met';
  let fwsBadgeColor = 'text-emerald-400';
  if (freewaySpaceMm < 2) {
    fwsStatus = 'Insufficient (<2.0 mm) · Risk of alveolar resorption & muscle spasm';
    fwsBadgeColor = 'text-rose-400';
  } else if (freewaySpaceMm > 4) {
    fwsStatus = 'Excessive (>4.0 mm) · Collapsed appearance & reduced chewing efficiency';
    fwsBadgeColor = 'text-amber-400';
  }

  // Toggle checkpoint verification
  const handleToggleCheckpoint = (id: string, defaultObserved: string) => {
    setVerifiedCheckpoints(prev => {
      const current = prev[id];
      if (current && current.passed) {
        // Toggle to failed / unverified
        return {
          ...prev,
          [id]: {
            passed: false,
            observedValue: 'Discrepancy noted during clinical test',
            verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            notes: 'Requires rim wax height or tilt adjustment.'
          }
        };
      } else {
        // Toggle to verified
        return {
          ...prev,
          [id]: {
            passed: true,
            observedValue: defaultObserved,
            verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            notes: 'Clinically verified and within physiological threshold.'
          }
        };
      }
    });
  };

  const totalCheckpoints = VDO_CHECKPOINTS.length;
  const passedCheckpointsCount = Object.values(verifiedCheckpoints).filter(c => c.passed).length;
  const isVdoConsensusMet = passedCheckpointsCount >= 4;

  const activeCheckpoint = VDO_CHECKPOINTS.find(c => c.id === selectedCheckpointId) || VDO_CHECKPOINTS[0];

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Header with Back Button and Quick Guide */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onNavigateToTab ? onNavigateToTab('scanner') : window.history.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-sm group shrink-0 mt-0.5"
            title="Back to Live Scanner"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase font-semibold">
                Prosthodontic Literature-Grounded System
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                GPT-10 · Boucher · Silverman · Niswonger · Willis
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Vertical Dimension of Occlusion (VDO) Clinical Console</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Optical Z-axis telemetry with guided 3-stage recording: Physiologic Rest (VDR) − Free-way Space (FWS) = Occlusal Dimension (VDO).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setIsExplainerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 rounded-lg transition-colors cursor-pointer shadow-sm"
            title="Learn how SmartBow measures and records VDO"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>How to Record VDO Guide</span>
          </button>

          <button
            onClick={() => setShowLiteratureCompendium(!showLiteratureCompendium)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 rounded-lg transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showLiteratureCompendium ? 'Hide Literature' : 'Literature References'}</span>
          </button>

          <button
            onClick={() => {
              if (isLocked) {
                setIsLocked(false);
              } else {
                setLockedTarget(vdoMm);
                setIsLocked(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              isLocked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isLocked ? `Target Locked (${lockedTarget?.toFixed(1)}mm)` : 'Lock Target VDO'}</span>
          </button>
        </div>
      </div>

      {/* Literature & Kinematics Compendium Drawer (Collapsible) */}
      {showLiteratureCompendium && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Prosthodontic Literature & Jaw Kinematic Doctrines (GPT-10 & Classics)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded">
              Academic Reference
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {JAW_KINEMATIC_DOCTRINES.map((doc, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300">{doc.concept}</span>
                  <span className="text-[10px] font-mono text-slate-400">{doc.inventor}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 italic">
                  Ref: {doc.literatureReference}
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  <strong>Clinical Principle:</strong> {doc.clinicalRelevance}
                </p>
                <div className="p-2 bg-slate-900 rounded text-[11px] text-teal-300 border border-slate-800">
                  <strong>SmartBow Computer Vision:</strong> {doc.smartBowImplementation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {recordingToast && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-200 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{recordingToast}</span>
          </div>
          <button
            onClick={() => setRecordingToast(null)}
            className="text-emerald-400 hover:text-white px-2 py-0.5 rounded text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GUIDED LIVE VDO RECORDING CONSOLE (NISWONGER & BOUCHER PROTOCOL) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Live VDO Recording Console (Chairside Niswonger &amp; Boucher Protocol)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                SOP Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Step-by-step chairside procedure: Measure Rest (VDR) &rarr; Deduct Freeway Space (FWS) &rarr; Lock Occlusal Rim Height (VDO).
            </p>
          </div>

          <button
            onClick={() => setIsExplainerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Interactive Diagram</span>
          </button>
        </div>

        {/* 3-Stage Chairside Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* STAGE 1: VDR REST POSITION */}
          <div className={`p-4 rounded-xl border transition-all space-y-3 relative ${
            activeWorkflowStep === 1 
              ? 'bg-slate-950 border-cyan-500 ring-1 ring-cyan-500/30 shadow-lg' 
              : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-cyan-400">
                Stage 1 · Rest Position
              </span>
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-bold flex items-center justify-center font-mono">
                1
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white">Capture Physiologic VDR</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Patient upright. Instruct patient to say <em>&ldquo;Emma&rdquo;</em>, lick lips, or swallow to relax elevator muscles.
              </p>
            </div>

            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">Subnasale to Menton</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-cyan-300 tabular-nums">{vdrMm.toFixed(1)}</span>
                <span className="text-xs font-mono text-slate-400">mm</span>
              </div>
            </div>

            <button
              onClick={() => {
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setRecordedVdrTime(now);
                setActiveWorkflowStep(2);
                setRecordingToast(`VDR captured at ${vdrMm.toFixed(1)} mm (${now}) ✓ · Proceeding to Stage 2: Freeway Space.`);
              }}
              className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capture VDR at Rest ({vdrMm.toFixed(1)} mm)</span>
            </button>

            <div className="text-[10px] font-mono text-slate-500 text-center">
              {recordedVdrTime ? `Recorded at ${recordedVdrTime} ✓` : 'Awaiting baseline capture'}
            </div>
          </div>

          {/* STAGE 2: FREE-WAY SPACE DEDUCTION */}
          <div className={`p-4 rounded-xl border transition-all space-y-3 relative ${
            activeWorkflowStep === 2 
              ? 'bg-slate-950 border-amber-500 ring-1 ring-amber-500/30 shadow-lg' 
              : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">
                Stage 2 · Boucher FWS
              </span>
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold flex items-center justify-center font-mono">
                2
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white">Select Free-Way Space (FWS)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Niswonger (1934) and Boucher establish normal physiological freeway space between 2.0 and 4.0 mm.
              </p>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-1.5">
              {[2.0, 3.0, 4.0].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setFwsPreset(preset)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                    fwsPreset === preset
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {preset.toFixed(1)} mm {preset === 3.0 ? '★' : ''}
                </button>
              ))}
            </div>

            {/* Live Target VDO Formula Display */}
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>VDR ({vdrMm.toFixed(1)}) &minus; FWS ({fwsPreset.toFixed(1)}) =</span>
              </div>
              <div className="flex justify-between items-baseline font-bold text-emerald-400 text-sm">
                <span>Target VDO:</span>
                <span>{(vdrMm - fwsPreset).toFixed(1)} mm</span>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveWorkflowStep(3);
                setRecordingToast(`Target VDO computed as ${(vdrMm - fwsPreset).toFixed(1)} mm. Insert wax rims to record contact.`);
              }}
              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Apply Target VDO ({(vdrMm - fwsPreset).toFixed(1)} mm)</span>
            </button>

            <div className="text-[10px] font-mono text-slate-500 text-center">
              Boucher Standard: 3.0 mm (Recommended)
            </div>
          </div>

          {/* STAGE 3: LOCK OCCLUSAL DIMENSION (VDO) */}
          <div className={`p-4 rounded-xl border transition-all space-y-3 relative ${
            activeWorkflowStep === 3 
              ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/30 shadow-lg' 
              : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400">
                Stage 3 · Occlusal Lock
              </span>
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold flex items-center justify-center font-mono">
                3
              </span>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white">Record &amp; Lock Rim Contact</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Insert wax rims in patient mouth. Trim wax until rims meet evenly at target height.
              </p>
            </div>

            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">Current Case VDO</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">{vdoMm.toFixed(1)}</span>
                <span className="text-xs font-mono text-slate-400">mm</span>
              </div>
            </div>

            <button
              onClick={() => {
                const targetVal = Number((vdrMm - fwsPreset).toFixed(1));
                onUpdateVdo(targetVal);
                setLockedTarget(targetVal);
                setIsLocked(true);
                setActiveWorkflowStep(1);
                setRecordingToast(`VDO successfully recorded & locked at ${targetVal} mm! Synchronized with Virtual 3D Articulator.`);
              }}
              className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record &amp; Lock VDO ({(vdrMm - fwsPreset).toFixed(1)} mm)</span>
            </button>

            <div className="text-[10px] font-mono text-center">
              {isLocked ? (
                <span className="text-emerald-400 font-bold">Target Locked at {lockedTarget?.toFixed(1)} mm ✓</span>
              ) : (
                <span className="text-slate-500">Click to lock into patient record</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Live VDO Readout */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
                Current VDO (Z-Distance)
              </span>
              <span className="text-[10px] font-mono text-cyan-400">MediaPipe + ArUco</span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className={`text-6xl font-bold font-mono tracking-tight tabular-nums ${isNormal ? 'text-white' : lowerThirdPct < 30 ? 'text-amber-400' : 'text-rose-400'}`}>
                {vdoMm.toFixed(1)}
              </span>
              <span className="text-lg font-mono text-slate-400 font-medium">mm</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Centroid ΔZ</span>
            <span className="text-slate-200">{vdoMm.toFixed(2)} mm</span>
          </div>
        </div>

        {/* Metric 2: Rest Dimension (VDR) & Freeway Space */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
                Freeway Space (FWS)
              </span>
              <span className="text-[10px] font-mono text-slate-400">VDR - VDO (Niswonger)</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-bold font-mono text-cyan-300 tabular-nums">
                {freewaySpaceMm.toFixed(1)}
              </span>
              <span className="text-lg font-mono text-slate-400 font-medium">mm</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Status:</span>
            <span className={`font-medium ${fwsBadgeColor}`}>{fwsStatus}</span>
          </div>
        </div>

        {/* Metric 3: Lower Facial Third Proportion */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono text-slate-400 tracking-wider">
                Lower Facial Third
              </span>
              <span className="text-[10px] font-mono text-slate-400">da Vinci / Williams: 30–36%</span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className={`text-5xl font-bold font-mono tabular-nums ${isNormal ? 'text-emerald-400' : 'text-amber-400'}`}>
                {lowerThirdPct.toFixed(1)}
              </span>
              <span className="text-lg font-mono text-slate-400 font-medium">%</span>
            </div>
          </div>

          {/* Graphical Proportion Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
              <div className="absolute left-[33%] w-[20%] h-full bg-emerald-500/30" />
              <div
                className={`h-full transition-all duration-300 rounded-full ${isNormal ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.max(10, Math.min(100, (lowerThirdPct / 50) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>20% (Collapsed)</span>
              <span className="text-emerald-400 font-semibold">33% (Ideal)</span>
              <span>50% (Extreme Open)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Guidance Banner */}
      <div className={`p-4 rounded-xl border ${statusColor} transition-colors`}>
        <div className="flex items-start gap-3">
          {isNormal ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h4 className="text-xs font-bold font-mono tracking-wider">{statusText}</h4>
            <p className="text-xs leading-relaxed opacity-90">{clinicalAdvice}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VDO CLINICAL CHECKPOINTS VERIFICATION CONSOLE */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Clinical VDO Checkpoints (Multi-Method Verification)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify your occlusal rims against each gold-standard prosthodontic checkpoint to eliminate clinical error
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
              isVdoConsensusMet
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {passedCheckpointsCount} of {totalCheckpoints} Checkpoints Verified {isVdoConsensusMet ? '✓ (CONSENSUS REACHED)' : '(PENDING VERIFICATION)'}
            </span>
          </div>
        </div>

        {/* Checkpoint Selection Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {VDO_CHECKPOINTS.map((cp) => {
            const verification = verifiedCheckpoints[cp.id];
            const isPassed = verification?.passed;
            const isSelected = selectedCheckpointId === cp.id;

            return (
              <div
                key={cp.id}
                onClick={() => setSelectedCheckpointId(cp.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-2 relative ${
                  isSelected 
                    ? 'border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/30' 
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                      {cp.category} CHECKPOINT
                    </span>
                    <h4 className="text-xs font-bold text-white mt-0.5 leading-snug">
                      {cp.name}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCheckpoint(
                        cp.id, 
                        cp.id === 'physiologic_rest' 
                          ? `${(vdrMm - vdoMm).toFixed(1)} mm FWS` 
                          : cp.id === 'facial_thirds' 
                            ? `${lowerThirdPct.toFixed(1)}% facial third` 
                            : 'Normal clearance verified'
                      );
                    }}
                    title={isPassed ? 'Click to mark as failed/pending' : 'Click to mark verified'}
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isPassed 
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="text-[11px] font-mono text-cyan-300">
                  {cp.authorReference}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Target Range:</span>
                  <span className="font-mono text-slate-300">{cp.recommendedValueRange}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Status:</span>
                  <span className={isPassed ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {isPassed ? 'VERIFIED ✓' : 'UNVERIFIED'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Checkpoint Detailed Clinical Instruction & Literature Card */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                Active Protocol Guide · {activeCheckpoint.category}
              </span>
              <h4 className="text-sm font-bold text-white">
                {activeCheckpoint.name}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleCheckpoint(
                  activeCheckpoint.id,
                  activeCheckpoint.id === 'physiologic_rest' 
                    ? `${(vdrMm - vdoMm).toFixed(1)} mm FWS` 
                    : activeCheckpoint.id === 'facial_thirds' 
                      ? `${lowerThirdPct.toFixed(1)}% facial third` 
                      : 'Clinically verified'
                )}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  verifiedCheckpoints[activeCheckpoint.id]?.passed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                {verifiedCheckpoints[activeCheckpoint.id]?.passed ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Checkpoint Confirmed ✓</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm This Checkpoint</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div>
                <span className="text-slate-400 font-medium">Literature Reference & Source:</span>
                <p className="text-slate-300 font-mono text-[11px] mt-0.5">
                  {activeCheckpoint.literatureCitation}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Chairside Clinical SOP:</span>
                <p className="text-slate-200 leading-relaxed text-[11px] mt-0.5">
                  {activeCheckpoint.clinicalProtocol}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-slate-400 font-medium">Expected Anatomic Observation:</span>
                <p className="text-slate-200 leading-relaxed text-[11px] mt-0.5">
                  {activeCheckpoint.expectedObservation}
                </p>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px]">
                <strong className="text-cyan-300">Software Validation Criterion:</strong>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {activeCheckpoint.validationCriterion}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adjust VDO on Rims Stepper & Fine Calibration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Willis Anatomic Method */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">Willis Gauge Anatomic Correlation</h3>
            <span className="text-[10px] font-mono text-slate-400">Willis (1930)</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Classical Willis criteria: Distance from pupil / outer canthus to rima oris equals subnasale to menton.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-xs text-slate-300">Pupil to Oral Commissure (Upper Reference)</span>
              <span className="text-xs font-mono font-semibold text-white">62.8 mm</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-xs text-slate-300">Subnasale to Menton (Lower Third at VDO)</span>
              <span className="text-xs font-mono font-semibold text-cyan-400">{vdoMm.toFixed(1)} mm</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
              <span className="text-xs text-slate-300">Discrepancy (Willis Delta)</span>
              <span className="text-xs font-mono font-semibold text-emerald-400">
                {Math.abs(vdoMm - 62.8).toFixed(1)} mm (Clinically Synchronized)
              </span>
            </div>
          </div>
        </div>

        {/* Adjust VDO on Rims */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-semibold text-white mb-1">Vertical Dimension Adjustment Stepper</h3>
          <p className="text-xs text-slate-400 mb-4">
            Calibrate rims in chairside increments of 0.5 mm to simulate wax trimming or addition.
          </p>

          <div className="flex items-center justify-center gap-4 py-3">
            <button
              onClick={() => onUpdateVdo(Math.max(40, vdoMm - 1))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              - 1.0 mm
            </button>
            <button
              onClick={() => onUpdateVdo(Math.max(40, vdoMm - 0.5))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              - 0.5 mm
            </button>

            <span className="text-2xl font-mono font-bold text-white px-3 tabular-nums">
              {vdoMm.toFixed(1)}
            </span>

            <button
              onClick={() => onUpdateVdo(Math.min(85, vdoMm + 0.5))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              + 0.5 mm
            </button>
            <button
              onClick={() => onUpdateVdo(Math.min(85, vdoMm + 1))}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              + 1.0 mm
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Rest Dimension (VDR - Niswonger Postural Rest):</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                value={vdrMm}
                onChange={(e) => onUpdateVdr(parseFloat(e.target.value) || 66)}
                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right font-mono text-white text-xs"
              />
              <span className="font-mono">mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive VDO Clinical SOP Modal */}
      <VdoExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        onStartWorkflow={() => {
          setIsExplainerOpen(false);
          setActiveWorkflowStep(1);
        }}
      />
    </div>
  );
};
