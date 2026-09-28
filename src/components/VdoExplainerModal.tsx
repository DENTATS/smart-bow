/**
 * SmartBow AI - How VDO is Recorded: Clinical Prosthodontic Guide & SOP
 * Grounded in GPT-10, Boucher, Niswonger, Silverman, and Willis doctrines.
 * MDS Prosthodontics · Dr. Deepanshu
 */

import React from 'react';
import { 
  X, 
  Layers, 
  Camera, 
  Ruler, 
  CheckCircle2, 
  BookOpen, 
  ArrowRight, 
  Activity, 
  Smile, 
  Volume2, 
  ShieldCheck,
  Zap
} from 'lucide-react';

interface VdoExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartWorkflow?: () => void;
}

export const VdoExplainerModal: React.FC<VdoExplainerModalProps> = ({
  isOpen,
  onClose,
  onStartWorkflow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                  CLINICAL PROSTHODONTIC PROTOCOL
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  GPT-10 · Boucher 12th Ed · Niswonger (1934)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
                How SmartBow AI Measures & Records VDO
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-slate-300">
          {/* Quick Overview Summary Banner */}
          <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Summary: The Core Prosthodontic Rule</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              In complete denture and full-mouth prosthodontics, <strong>Vertical Dimension of Occlusion (VDO)</strong> is never guessed. 
              It is calculated by recording the patient&apos;s <strong>Vertical Dimension at Rest (VDR)</strong> and subtracting the physiological 
              <strong>Free-way Space (FWS)</strong>:
            </p>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-center text-sm font-bold text-emerald-400">
              VDO = VDR − Free-Way Space (2.0 to 4.0 mm)
            </div>
          </div>

          {/* 4-Step Visual Workflow */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Step-by-Step Recording Workflow in SmartBow AI</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1 */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-3xl font-black font-mono text-slate-800 select-none">
                  01
                </div>
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Camera className="w-4 h-4" />
                  <span>Step 1: Optical Landmark Tracking</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  The smartphone/webcam camera detects two reference points on the patient:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li><strong>Subnasale (sn):</strong> Junction of columella and upper lip (T_max maxillary marker).</li>
                  <li><strong>Gnathion / Menton (gn):</strong> Most inferior/anterior point of chin (T_mand mandibular marker).</li>
                  <li><strong>20 mm Calibration Target:</strong> Automatically scales pixel distance to true physical millimeters (error &lt; 0.3 mm).</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-3xl font-black font-mono text-slate-800 select-none">
                  02
                </div>
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Ruler className="w-4 h-4" />
                  <span>Step 2: Record Rest Dimension (VDR)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Patient is seated upright with head unsupported. Masticatory muscles are relaxed:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li>Ask patient to moisten lips, swallow, or repeat the bilabial sound <em>&ldquo;Emma&rdquo;</em>.</li>
                  <li>When mandible assumes postural rest, click <strong>&ldquo;Capture VDR&rdquo;</strong> in the app.</li>
                  <li>Example recorded value: <strong>VDR = 66.0 mm</strong>.</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-3xl font-black font-mono text-slate-800 select-none">
                  03
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Layers className="w-4 h-4" />
                  <span>Step 3: Establish Free-way Space & VDO</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  The app applies the Niswonger (1934) and Boucher doctrines:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li>Standard physiological Free-way Space is <strong>2.0 to 4.0 mm</strong> (ideal 3.0 mm).</li>
                  <li>Target VDO is automatically computed: <strong>66.0 &minus; 3.0 = 63.0 mm</strong>.</li>
                  <li>Place occlusal rims in mouth; adjust wax height until rims meet evenly at exactly 63.0 mm.</li>
                  <li>Click <strong>&ldquo;Capture &amp; Lock VDO&rdquo;</strong> to record into the patient chart!</li>
                </ul>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-3xl font-black font-mono text-slate-800 select-none">
                  04
                </div>
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Step 4: Multi-Method Checkpoint Consensus</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Never rely on a single measurement! Verify rims against the 5 Gold-Standard Checkpoints:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                  <li><strong>Silverman Speaking Space:</strong> Count 60–66; verify 1–2mm clearance without clicking.</li>
                  <li><strong>Facial Thirds:</strong> Lower third equals 30–36% of total facial height (Williams/da Vinci).</li>
                  <li><strong>Willis Gauge:</strong> Pupil-to-commissure equals subnasale-to-menton within 1.5mm.</li>
                  <li><strong>Deglutition / Swallowing:</strong> Smooth swallow without facial straining.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Anatomic Landmark Guide & Warning */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Clinical Pitfalls to Avoid (Boucher &amp; GPT-10)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/40 space-y-1">
                <span className="font-bold text-rose-300">Consequences of Over-Opening VDO:</span>
                <p className="text-slate-300">
                  Teeth clattering during speech, inability to swallow easily, masticatory muscle fatigue, 
                  accelerated residual alveolar ridge resorption, stretched facial expression.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 space-y-1">
                <span className="font-bold text-amber-300">Consequences of Collapsed VDO:</span>
                <p className="text-slate-300">
                  Pseudoprognathic profile (chin protrudes forward), thin vermilion borders, deep nasolabial folds, 
                  angular cheilitis from saliva pooling, reduced masticatory force.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 font-mono">
            SmartBow AI · Fully Synchronized with Virtual 3D Articulator
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
            >
              Close Guide
            </button>
            {onStartWorkflow && (
              <button
                onClick={() => {
                  onClose();
                  onStartWorkflow();
                }}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <span>Open VDO Recorder Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
