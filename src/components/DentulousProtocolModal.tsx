/**
 * SmartBow AI - Dentulous Patients & Full Mouth Rehabilitation (FMR) Compendium
 * Chairside SOP, Physical Attachment Protocols, and Clinical Kinematics for Natural Dentition.
 * 
 * Covers:
 * 1. Attachment Protocols for Natural Teeth (Bite Fork Clutch, Buccal Spot-Etch Resin Tack, Clear Essix Stent)
 * 2. CO-CR Slide & Occlusal Discrepancy Diagnostics (Dawson Bimanual, Lucia Jig, Leaf Gauge)
 * 3. Full Mouth Rehabilitation (FMR) & Loss of VDO Evaluation (Turner & Missirlian Classification)
 * 4. Esthetic Smile Design & Incisal Cant Correction (Interpupillary & Camper Alignment)
 * 5. Digital CAD/CAM Virtual Articulator Export (Exocad & 3Shape integration with Intraoral Scans)
 *
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { 
  X, 
  Smile, 
  Layers, 
  Crosshair, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  Printer, 
  Sparkles, 
  ArrowRight,
  HelpCircle,
  FileText,
  Activity,
  Box,
  Compass
} from 'lucide-react';
import { DentulousAttachmentMethod } from '../types/smartbow';

interface DentulousProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAttachmentMethod?: (method: DentulousAttachmentMethod) => void;
}

type TabKey = 'attachment' | 'cocr' | 'fmr' | 'cadcam' | 'calculator';

export const DentulousProtocolModal: React.FC<DentulousProtocolModalProps> = ({
  isOpen,
  onClose,
  onSelectAttachmentMethod
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('attachment');

  // Interactive Calculator State
  const [calcVdr, setCalcVdr] = useState<number>(68.0);
  const [calcVdo, setCalcVdo] = useState<number>(61.0);
  const [calcSlideX, setCalcSlideX] = useState<number>(0.8);
  const [calcSlideY, setCalcSlideY] = useState<number>(1.6);
  const [calcSlideZ, setCalcSlideZ] = useState<number>(0.5);

  if (!isOpen) return null;

  // Computed calculations
  const freewaySpace = Number((calcVdr - calcVdo).toFixed(1));
  const totalSlideVector = Number(Math.hypot(calcSlideX, calcSlideY, calcSlideZ).toFixed(2));
  
  let turnerClassification = "Category 1: Excessive wear with loss of VDO";
  let turnerRecommendation = "Safe to increase VDO by 2.0 - 3.5 mm for full mouth rehabilitation. Space available without crown lengthening.";
  let turnerColor = "text-emerald-400";

  if (freewaySpace <= 2.5) {
    turnerClassification = "Category 2: Excessive wear without loss of VDO (Dentoalveolar Extrusion)";
    turnerRecommendation = "Alveolar compensation occurred. Increasing VDO requires careful trial splint therapy or orthodontic intrusion / crown lengthening.";
    turnerColor = "text-amber-400";
  } else if (freewaySpace > 2.5 && freewaySpace <= 4.0) {
    turnerClassification = "Normal Physiological Interocclusal Rest Space";
    turnerRecommendation = "Normal physiologic freeway space. Minor restorative alterations permissible.";
    turnerColor = "text-cyan-400";
  }

  let slideSeverity = "Harmonious / Minor Slide (< 1.0 mm)";
  let slideColor = "text-emerald-400";
  if (totalSlideVector > 2.0 || Math.abs(calcSlideX) > 1.0) {
    slideSeverity = "Clinically Significant Slide (> 2.0 mm or Lateral Shift)";
    slideColor = "text-rose-400";
  } else if (totalSlideVector >= 1.0) {
    slideSeverity = "Moderate Slide (1.0 - 2.0 mm)";
    slideColor = "text-amber-400";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  SmartBow AI in Dentulous Patients & Full Mouth Rehabilitation (FMR)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                  Natural Dentition Protocol
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Department of Prosthodontics · Maitri College of Dentistry & Research Centre
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Guide</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-slate-950 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('attachment')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'attachment'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Marker Attachment (No Wax Rims)</span>
          </button>

          <button
            onClick={() => setActiveTab('cocr')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'cocr'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>2. CO - CR Slide Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('fmr')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'fmr'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>3. FMR & Loss of VDO (Turner Class)</span>
          </button>

          <button
            onClick={() => setActiveTab('cadcam')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'cadcam'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>4. Intraoral Scan (IOS) & CAD/CAM</span>
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'calculator'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>5. Interactive Chairside Assessor</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300 leading-relaxed">
          
          {/* TAB 1: Physical Attachment Protocols in Dentulous Patients */}
          {activeTab === 'attachment' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>How to Attach ArUco Markers Without Wax Rims</span>
                </h3>
                <p>
                  In edentulous patients, marker boards are bonded to the buccal wax flange. In dentulous patients, 
                  we eliminate wax rims completely by employing one of four validated, non-destructive attachment methods:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Method 1: Dual-Arch Bite Fork Clutch */}
                <div className="p-4 bg-slate-950/60 border border-cyan-800/60 rounded-xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-cyan-900/80 text-cyan-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-bl">
                    METHOD 1 · MOST POPULAR
                  </div>
                  <h4 className="text-sm font-bold text-white">Disposable Dual-Arch Bite Fork Clutch</h4>
                  <p className="text-[11px] text-slate-400">
                    A slim, rigid autoclavable or disposable plastic bite fork indexed with bite registration material.
                  </p>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-300">
                    <li><strong className="text-cyan-300">Impression Material:</strong> Express a 2mm bead of rigid bite registration silicone (e.g. Blu-Mousse, Regisil PB, or Aluwax) on upper & lower surfaces.</li>
                    <li><strong className="text-cyan-300">Seating:</strong> Patient bites lightly into CR or MIP until set (30s). Teeth index into the silicone without piercing through to plastic.</li>
                    <li><strong className="text-cyan-300">Buccal Flag:</strong> The rigid extraoral stem extends 20mm beyond the right corner of the mouth, presenting the Maxilla (IDs 3-6) target array.</li>
                    <li><strong className="text-cyan-300">Indication:</strong> Static facebow transfer, esthetic plane determination, and mounting to Hanau / Exocad.</li>
                  </ul>
                  {onSelectAttachmentMethod && (
                    <button
                      onClick={() => {
                        onSelectAttachmentMethod('BITE_FORK_CLUTCH');
                        onClose();
                      }}
                      className="w-full mt-2 py-1.5 px-3 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 rounded-lg font-semibold transition-colors cursor-pointer text-center"
                    >
                      Use Bite Fork Clutch Protocol →
                    </button>
                  )}
                </div>

                {/* Method 2: Premolar Spot-Etch Resin Button */}
                <div className="p-4 bg-slate-950/60 border border-emerald-800/60 rounded-xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-emerald-900/80 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-bl">
                    METHOD 2 · DYNAMIC KINEMATICS
                  </div>
                  <h4 className="text-sm font-bold text-white">Buccal Spot-Etch Temporary Resin Tack</h4>
                  <p className="text-[11px] text-slate-400">
                    Direct tooth-bonded miniature target tabs leaving 100% of occlusal surfaces completely free!
                  </p>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-300">
                    <li><strong className="text-emerald-300">Location:</strong> Buccal surface of maxillary #14/#15 and mandibular #44/#45 (right premolar region).</li>
                    <li><strong className="text-emerald-300">Adhesion:</strong> Place a 1.5mm dot of light-cure temporary resin (e.g., Fermit, Temp-Bond Clear, or spot-etched flowable composite without full etch). Seat marker tab and cure for 5s.</li>
                    <li><strong className="text-emerald-300">Occlusal Freedom:</strong> Zero interocclusal interference. Patient can tap, swallow, speak, perform lateral excursion, and chew freely!</li>
                    <li><strong className="text-emerald-300">Removal:</strong> Pops off cleanly in 2 seconds chairside using a universal scaler. Leaves zero enamel residue.</li>
                  </ul>
                  {onSelectAttachmentMethod && (
                    <button
                      onClick={() => {
                        onSelectAttachmentMethod('BUCCAL_COMPOSITE_TACK');
                        onClose();
                      }}
                      className="w-full mt-2 py-1.5 px-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded-lg font-semibold transition-colors cursor-pointer text-center"
                    >
                      Use Spot-Etch Resin Tack Protocol →
                    </button>
                  )}
                </div>

                {/* Method 3: Clear Vacuum-Formed Splint (Essix) */}
                <div className="p-4 bg-slate-950/60 border border-purple-800/60 rounded-xl space-y-3">
                  <div className="text-[10px] font-mono font-bold text-purple-400 uppercase">METHOD 3 · DIAGNOSTIC SPLINTS</div>
                  <h4 className="text-sm font-bold text-white">Clear Thermoformed Stent (Essix Splint)</h4>
                  <p className="text-[11px] text-slate-400">
                    0.75mm vacuum-formed transparent template carrying external target wings.
                  </p>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-300">
                    <li>Fabricated over preliminary stone model or 3D printed model.</li>
                    <li>Ideal for TMD patients undergoing splint therapy, diagnostic wax-up mock-ups, or patients with full veneer preps.</li>
                    <li>Easily placed and removed without bonding agents.</li>
                  </ul>
                </div>

                {/* Method 4: Anterior Deprogrammer / Lucia Jig */}
                <div className="p-4 bg-slate-950/60 border border-amber-800/60 rounded-xl space-y-3">
                  <div className="text-[10px] font-mono font-bold text-amber-400 uppercase">METHOD 4 · CENTRIC RELATION</div>
                  <h4 className="text-sm font-bold text-white">Lucia Jig / Leaf Gauge with Marker Flag</h4>
                  <p className="text-[11px] text-slate-400">
                    Anterior point stop deprogramming masticatory muscle hyperactivity before recording CR.
                  </p>
                  <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-300">
                    <li>Anterior acrylic jig discludes all posterior teeth by 0.5 - 1.0mm.</li>
                    <li>Patient bites for 5-10 minutes to release lateral pterygoid muscle memory.</li>
                    <li>SmartBow tracks true condylar seating into Centric Relation with zero tooth interference.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Centric Relation vs Maximum Intercuspation Slide */}
          {activeTab === 'cocr' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  <span>The CO - CR Discrepancy & Slide in Natural Dentition</span>
                </h3>
                <p>
                  In dentulous patients, natural teeth intercuspate in <strong className="text-cyan-300">Maximum Intercuspation (MIP / CO)</strong>. 
                  However, the condyles in the glenoid fossae may seat in <strong className="text-emerald-300">Centric Relation (CR)</strong> at a distinctly different position.
                  Over 90% of healthy dentulous patients have a 1–2mm slide from CR initial tooth contact to MIP.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Vector Component 1</div>
                  <h4 className="text-sm font-bold text-cyan-300">Anterior Slide (ΔY)</h4>
                  <p className="text-[11px] text-slate-400">
                    Mandible slides forward from condylar seating to tooth intercuspation. Normal: 0.5 - 1.5mm. Excessive slide (&gt; 2mm) risks anterior tooth wear and joint loading.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Vector Component 2</div>
                  <h4 className="text-sm font-bold text-amber-300">Lateral Shift (ΔX)</h4>
                  <p className="text-[11px] text-slate-400">
                    Mandible shifts laterally (left/right) during closure. <strong className="text-rose-400">Critical clinical red flag!</strong> Unilateral interference often causes TMD pain, masseter spasm, and clicking.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Vector Component 3</div>
                  <h4 className="text-sm font-bold text-emerald-300">Vertical Drop (ΔZ)</h4>
                  <p className="text-[11px] text-slate-400">
                    Change in vertical dimension between initial point of contact (CR) and full intercuspation (MIP). Determines initial occlusal prematurity thickness.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-cyan-950/30 border border-cyan-800/60 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">How SmartBow AI Measures CO-CR Slide in Real Time:</h4>
                <ol className="space-y-1.5 text-[11px] list-decimal list-inside text-slate-300">
                  <li>Bond spot-etch markers or seat the dual-arch bite fork in the patient's mouth.</li>
                  <li>Have the patient close firmly into habitual intercuspation (<strong className="text-white">MIP</strong>). SmartBow captures coordinate matrix <code className="font-mono text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">T_MIP</code>.</li>
                  <li>Deprogram the patient using bimanual manipulation (Dawson) or anterior jig into <strong className="text-white">CR</strong>. SmartBow captures <code className="font-mono text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">T_CR</code>.</li>
                  <li>The app calculates the transformation vector <code className="font-mono text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">ΔT = T_MIP - T_CR</code>, displaying exact millimeters in 3D (ΔX, ΔY, ΔZ).</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: Full Mouth Rehabilitation (FMR) & Loss of VDO */}
          {activeTab === 'fmr' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Full Mouth Rehabilitation: Evaluating Loss of VDO</span>
                </h3>
                <p>
                  In patients with severe tooth wear (bruxism, acid erosion, attrition), the clinician must determine whether 
                  vertical dimension has collapsed, or if dentoalveolar extrusion has preserved vertical face height (Turner & Missirlian Doctrine).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Turner Category 1 */}
                <div className="p-4 bg-slate-950/70 border border-emerald-800/60 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Category 1</div>
                  <h4 className="text-sm font-bold text-white">Excessive Wear WITH Loss of VDO</h4>
                  <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                    <li><strong>Freeway space:</strong> &gt; 5.0mm (often 6–9mm).</li>
                    <li><strong>Facial height:</strong> Collapsed lower 1/3, angular cheilitis, thin vermilion border.</li>
                    <li><strong>Treatment:</strong> Safe to increase VDO by 2–4mm. Ample restorative space exists without crown lengthening.</li>
                  </ul>
                </div>

                {/* Turner Category 2 */}
                <div className="p-4 bg-slate-950/70 border border-amber-800/60 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">Category 2</div>
                  <h4 className="text-sm font-bold text-white">Excessive Wear WITHOUT Loss of VDO</h4>
                  <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                    <li><strong>Freeway space:</strong> Normal (2.0 – 4.0mm).</li>
                    <li><strong>Physiology:</strong> Dentoalveolar extrusion compensated for wear rate.</li>
                    <li><strong>Treatment:</strong> Cannot arbitrarily raise VDO! Requires diagnostic splint trial (Dahl principle), orthodontic intrusion, or surgical crown lengthening.</li>
                  </ul>
                </div>

                {/* Turner Category 3 */}
                <div className="p-4 bg-slate-950/70 border border-purple-800/60 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-purple-400 font-bold">Category 3</div>
                  <h4 className="text-sm font-bold text-white">Limited Restorative Space</h4>
                  <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                    <li><strong>Freeway space:</strong> Reduced (&lt; 2.0mm).</li>
                    <li><strong>Challenge:</strong> Posterior teeth maintain contact; anterior teeth severely worn down.</li>
                    <li><strong>Treatment:</strong> Planned vertical increase of 1.5–2.0mm at premolars to create 3mm anterior clearance.</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Chairside Measurement Protocol:</h4>
                <p className="text-[11px] text-slate-300">
                  SmartBow AI records the patient's face at <strong className="text-cyan-300">Physiological Rest Position (VDR)</strong> during relaxed lip contact (swallow & relax or "Emma" pronunciation).
                  It then records the patient biting in <strong className="text-amber-300">Occlusion (VDO)</strong>.
                  The difference is the exact live <strong className="text-emerald-300">Freeway Space (IRS = VDR - VDO)</strong>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Intraoral Scan (IOS) & CAD/CAM Virtual Articulator Integration */}
          {activeTab === 'cadcam' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Box className="w-4 h-4 text-cyan-400" />
                  <span>The Intraoral Scanner (IOS) Blind Spot Solved</span>
                </h3>
                <p>
                  Intraoral scanners (Medit, 3Shape TRIOS, iTero, Primescan) capture tooth geometry with micron accuracy, 
                  but they are <strong className="text-rose-400">completely blind to the patient's cranial reference planes</strong>. 
                  They mount teeth in CAD software at arbitrary default horizontal angles, leading to canted anterior smiles and cuspal interferences!
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-cyan-800/50 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">The SmartBow AI ➔ Exocad / 3Shape Bridge:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="font-bold text-white mb-1">Step 1: Scan Arches</div>
                    <p className="text-slate-400">Scan maxillary and mandibular arches with your intraoral scanner as standard `.stl` or `.ply` files.</p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="font-bold text-white mb-1">Step 2: SmartBow Face-Bow</div>
                    <p className="text-slate-400">Snap a 3-second SmartBow video scan with the bite fork clutch or spot-etch premolar tack. SmartBow computes <code className="font-mono text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">T_max_rel_cranial</code>.</p>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="font-bold text-white mb-1">Step 3: Direct CAD Import</div>
                    <p className="text-slate-400">Export the `.xml` / `.dcm` transfer file from SmartBow directly into Exocad Virtual Articulator or 3Shape Dental System.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Clinical Benefits in CAD/CAM:</h4>
                <ul className="space-y-1.5 text-[11px] list-disc list-inside text-slate-300">
                  <li><strong className="text-white">Esthetic Cant Elimination:</strong> Anterior teeth are aligned perfectly parallel to the patient's actual Interpupillary line, not an arbitrary flat screen.</li>
                  <li><strong className="text-white">Zero Grinding at Delivery:</strong> Dynamic virtual condylar movements match the patient's actual Sagittal Condylar Inclination (SCI) and Bennett angle, eliminating occlusal high spots.</li>
                  <li><strong className="text-white">Predictable Smile Design:</strong> Exocad Smile Creator projects 3D mockups onto the actual face mesh.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 5: Interactive Chairside Assessor */}
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Interactive Dentulous Clinical Assessor</span>
                </h3>
                <p>
                  Simulate chairside measurements for a dentulous or full-mouth rehab patient to determine freeway space, 
                  Turner wear classification, and CO-CR slide severity.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* VDO / VDR Inputs */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Vertical Dimension & Freeway Space</h4>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Rest Position (VDR):</span>
                      <span className="font-mono text-cyan-400 font-bold">{calcVdr.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="55"
                      max="80"
                      step="0.5"
                      value={calcVdr}
                      onChange={(e) => setCalcVdr(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Occlusal Position (VDO in MIP):</span>
                      <span className="font-mono text-amber-400 font-bold">{calcVdo.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="75"
                      step="0.5"
                      value={calcVdo}
                      onChange={(e) => setCalcVdo(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400 text-xs">Freeway Space (VDR - VDO):</span>
                      <span className="text-base font-bold font-mono text-emerald-400">{freewaySpace} mm</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Normal physiological range: 2.0 to 4.0 mm</div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <div className={`font-bold text-xs ${turnerColor}`}>{turnerClassification}</div>
                    <p className="text-[11px] text-slate-300">{turnerRecommendation}</p>
                  </div>
                </div>

                {/* CO - CR Slide Inputs */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">CO - CR 3D Slide Discrepancy</h4>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Lateral Shift (ΔX):</span>
                      <span className="font-mono text-cyan-400 font-bold">{calcSlideX.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="-3.0"
                      max="3.0"
                      step="0.1"
                      value={calcSlideX}
                      onChange={(e) => setCalcSlideX(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Anterior Slide (ΔY):</span>
                      <span className="font-mono text-amber-400 font-bold">{calcSlideY.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="4.0"
                      step="0.1"
                      value={calcSlideY}
                      onChange={(e) => setCalcSlideY(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Vertical Drop (ΔZ):</span>
                      <span className="font-mono text-purple-400 font-bold">{calcSlideZ.toFixed(1)} mm</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="3.0"
                      step="0.1"
                      value={calcSlideZ}
                      onChange={(e) => setCalcSlideZ(parseFloat(e.target.value))}
                      className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400 text-xs">Total 3D Slide Vector:</span>
                      <span className="text-base font-bold font-mono text-cyan-300">{totalSlideVector} mm</span>
                    </div>
                    <div className={`font-bold text-xs ${slideColor}`}>{slideSeverity}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] font-mono text-slate-400">
            Validated for: Fixed Prosthodontics · FMR · Aligners · Occlusal Splints · Exocad & 3Shape
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            Close Compendium
          </button>
        </div>

      </div>
    </div>
  );
};
