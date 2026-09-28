/**
 * SmartBow AI - Clinician & Student User Manual Modal
 * Complete Clinical Operator Guide & Prosthodontic Reference
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 * 
 * Includes:
 * - Specific marker pasting & mounting protocol on occlusal rims (buccal pocket, retention wire, saliva sealing, clearance)
 * - Jaw Kinematic Control doctrines & literature groundings (Posselt, Dawson, Christensen, Bennett, Gysi, Silverman)
 * - VDO Clinical Checkpoints (Niswonger, Silverman, da Vinci, Shanahan, Willis, Lytle)
 * - Complete chairside SOP without costing distractions
 */

import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Camera, 
  Layers, 
  Target, 
  Compass, 
  Smile, 
  Box, 
  ShieldCheck, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Smartphone,
  Sparkles,
  Download,
  Info,
  Sliders,
  Check,
  Award,
  RotateCcw
} from 'lucide-react';
import { 
  MARKER_PASTING_GUIDELINES, 
  JAW_KINEMATIC_DOCTRINES, 
  VDO_CHECKPOINTS 
} from '../lib/prosthodonticLiterature';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: any) => void;
}

type SectionKey = 
  | 'overview' 
  | 'marker_placement' 
  | 'dentulous'
  | 'jaw_kinematics'
  | 'vdo_checkpoints'
  | 'stepbystep' 
  | 'gothic' 
  | 'cr' 
  | 'articulator' 
  | 'troubleshooting';

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('marker_placement');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  SmartBow AI · Clinical User Manual & Prosthodontic Compendium
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  GPT-10 & MDS Standard
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
              <span>Print SOP</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Pills */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 overflow-x-auto text-xs font-medium no-print">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'overview'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            1. Overview
          </button>
          <button
            onClick={() => setActiveSection('marker_placement')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'marker_placement'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            2. Marker Placement
          </button>
          <button
            onClick={() => setActiveSection('dentulous')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'dentulous'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            3. Dentulous &amp; FMR Protocols
          </button>
          <button
            onClick={() => setActiveSection('jaw_kinematics')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'jaw_kinematics'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            4. Jaw Kinematic Control &amp; Literature
          </button>
          <button
            onClick={() => setActiveSection('vdo_checkpoints')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'vdo_checkpoints'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            4. VDO Clinical Checkpoints
          </button>
          <button
            onClick={() => setActiveSection('stepbystep')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'stepbystep'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            5. Chairside Step-by-Step
          </button>
          <button
            onClick={() => setActiveSection('gothic')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'gothic'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            6. Gothic Arch
          </button>
          <button
            onClick={() => setActiveSection('cr')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'cr'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            7. CR Repeatability
          </button>
          <button
            onClick={() => setActiveSection('articulator')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'articulator'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            8. 3D Articulator & STL
          </button>
          <button
            onClick={() => setActiveSection('troubleshooting')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'troubleshooting'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            9. Troubleshooting
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          
          {/* SECTION 1: SYSTEM OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-xl p-5">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Introduction to SmartBow AI</span>
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  SmartBow AI is a smartphone computer vision system designed to replace cumbersome, multi-instrument conventional jaw relation procedures (mechanical facebow, Fox plane, Willis gauge, gothic arch needle-point stylus, and protrusive PVS bites). 
                  By tracking two miniature 18×18mm ArUco marker boards clipped to standard wax rims against a 468-point contactless facial mesh, the app computes vertical dimension (VDO), mediolateral/anteroposterior occlusal plane tilts, centric relation repeatability, and dynamic condylar inclinations in real time.
                </p>
              </div>

              {/* Core Principles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-cyan-400 font-bold uppercase">Principle 1</div>
                  <h4 className="font-bold text-white text-sm">No Invasive Facebow Earpieces</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses contactless 468 MediaPipe facial landmarks (interpupillary line, zygomatic arches, glabella) to establish the patient coordinate frame (T_patient). No skin stickers or painful external meatus earplugs.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-teal-400 font-bold uppercase">Principle 2</div>
                  <h4 className="font-bold text-white text-sm">Real-Time Visual Telemetry</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    As you add or trim wax on the occlusal rim, the VDO millimeter gauge and tilt angles update at 30 fps on your screen, turning green when within 0.5 mm of physiological target.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-mono text-amber-400 font-bold uppercase">Principle 3</div>
                  <h4 className="font-bold text-white text-sm">Direct CAD/CAM Articulator Export</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Replaces handwritten paper prescription slips with auto-generated exocad/3Shape virtual articulator XML and custom 3D-printable Hanau Wide-Vue cast mounting jig STL.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: DEDICATED MARKER PLACEMENT & FIXATION SOP */}
          {/* ========================================================================= */}
          {activeSection === 'marker_placement' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-cyan-950/50 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 text-cyan-400">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Dedicated Marker Placement &amp; Fixation SOP
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                      Right Premolar Buccal
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-semibold">
                      Cyanoacrylate Bond
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      Clear Nail Varnish Seal
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                  SmartBow AI achieves sub-millimeter computer vision tracking by registering rigid 18×18 mm ArUco marker boards (DICT_4X4_50) against the 468-point facial mesh. 
                  Adherence to this precise clinical attachment protocol guarantees zero optical parallax distortion, instantaneous adhesion, and continuous saliva immunity.
                </p>
              </div>

              {/* Anatomic Location Rationale: Why Right Premolar? */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Anatomic Location: Buccal Surface at the Right Premolar Position</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-semibold text-white">1. Direct Optical Corridor</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Positioning on the right premolar (maxillary teeth 14-15 / mandibular 44-45) allows direct, unoccluded line-of-sight for both frontal and 30°–45° anterolateral camera angles.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-semibold text-white">2. Freedom from Lip Drape</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Anterior midline markers are easily shielded by the upper lip curtain during smiling or phonetic enunciation. The premolar buccal corridor remains visible throughout speech.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-semibold text-white">3. Avoids Molar Cheek Shadows</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Placing markers too far posteriorly (molars) causes camera occlusion by the buccinator muscle folds and severe saliva pooling. The premolar site provides optimal lighting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Cyanoacrylate & Varnish Protocol */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span>Step-by-Step Clinical Attachment Protocol</span>
                </h4>

                <div className="grid grid-cols-1 gap-3.5">
                  {/* Step 1 */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs">
                          1
                        </span>
                        <h5 className="font-bold text-white text-sm">
                          Wax Rim Relief &amp; Flat Planar Pocket Preparation
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        Site Prep
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-8">
                      With a warm Lecron carver or #7 wax spatula, carve a flat, planar 19 × 19 mm recessed shelf (depth 1.0 to 1.5 mm) on the buccal surface of both maxillary and mandibular wax rims in the right premolar area. 
                      Ensure the shelf is strictly vertical, flat, and parallel to the occlusal table. Wipe the wax with a dry cotton roll to remove loose wax shavings.
                    </p>
                    <div className="pl-8 text-[11px] text-amber-300/90 bg-amber-950/20 p-2 rounded border border-amber-900/40">
                      <strong>Clinical Rule:</strong> Never place markers on a rounded or undulating wax surface; angular tilt introduces geometric distortion into the pose estimation solver.
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs">
                          2
                        </span>
                        <h5 className="font-bold text-white text-sm">
                          Rigid Acrylic Carrier Backing Substrate
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        Rigid Carrier
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-8">
                      The calibrated 18 × 18 mm ArUco marker board must be mounted onto a 1.0 mm thick autopolymerizing acrylic resin plate (or 3D-printed biocompatible carrier tag). 
                      <strong>Never attach bare printer paper or thin flexible adhesive tape directly to the wax rim</strong>, as intraoral flexion during jaw movements alters the inter-marker distance by up to 1.5 mm.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center justify-center text-xs">
                          3
                        </span>
                        <h5 className="font-bold text-white text-sm">
                          Cyanoacrylate Adhesive Bonding Protocol
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 font-bold">
                        Instant Bond
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-8">
                      Dispense <strong>2 to 3 micro-droplets of high-viscosity medical-grade cyanoacrylate adhesive (dental superglue / ethyl-2-cyanoacrylate)</strong> onto the reverse side of the rigid acrylic marker carrier. 
                      Immediately position the board squarely into the prepared buccal wax pocket at the right premolar area. 
                      Apply firm, uniform digital pressure with clean dry fingers for <strong>15 to 20 seconds</strong> until the adhesive cures completely into a creep-resistant bond.
                    </p>
                    <div className="pl-8 text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                      <strong className="text-amber-400 block">Prosthodontic Retention Wire Tag (Optional Heavy-Duty Method):</strong>
                      <span>
                        For extended clinical trials, embed a heated 0.8 mm stainless steel orthodontic retention wire tag into the baseplate wax beneath the carrier, then fuse the acrylic carrier to the wire with cyanoacrylate.
                      </span>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold flex items-center justify-center text-xs">
                          4
                        </span>
                        <h5 className="font-bold text-white text-sm">
                          Moisture &amp; Saliva Protection: Clear Nail Varnish Sealing SOP
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                        Critical Step
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-8">
                      Once the cyanoacrylate bond has cured (30–60 seconds in air), use the fine applicator brush to apply a <strong>smooth, uniform thin coat of medical-safe clear nail varnish (or clear dental surface glaze)</strong> over the entire face, corners, and perimeter seams of the ArUco marker board.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pl-8 text-xs pt-1">
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-emerald-400 font-bold text-[11px] block">1. Hermetic Water Barrier</span>
                        <span className="text-slate-400 text-[11px]">
                          100% waterproof seal prevents capillary saliva absorption, paper warping, and black bit-cell ink bleed.
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-cyan-400 font-bold text-[11px] block">2. Anti-Glare Optical Surface</span>
                        <span className="text-slate-400 text-[11px]">
                          Semi-matte clear varnish diffuses harsh specular reflections under 1200 Lux operatory LED spotlights.
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                        <span className="text-purple-400 font-bold text-[11px] block">3. Perioral Comfort</span>
                        <span className="text-slate-400 text-[11px]">
                          Smooths sharp acrylic edges, preventing inner cheek and right buccal mucosa chafing during speech.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold flex items-center justify-center text-xs">
                          5
                        </span>
                        <h5 className="font-bold text-white text-sm">
                          Vertical Clearance &amp; Zero Occlusal Collision Check
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        VDO Accuracy
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-8">
                      Have the patient close fully into maximum contact. Confirm visually that the maxillary marker board and mandibular marker board maintain a <strong>minimum vertical clearance of 2.0 mm at full occlusion</strong>. 
                      Marker boards must never touch or bump together during closure, lateral glide, or protrusion.
                    </p>
                  </div>
                </div>
              </div>

              {/* Marker Allocation Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-xl space-y-2">
                  <div className="text-cyan-400 font-bold flex items-center justify-between">
                    <span>MAXILLARY TARGET (T_max)</span>
                    <span>18 × 18 mm</span>
                  </div>
                  <div className="text-slate-300 font-sans text-xs">
                    ArUco IDs: <strong className="text-white font-mono">3, 4, 5, 6</strong> (DICT_4X4_50).
                  </div>
                  <div className="text-slate-400 font-sans text-[11px] leading-relaxed">
                    Mounted on the right premolar buccal wax rim, 4–5 mm above the occlusal rim edge. Oriented strictly perpendicular to Camper&apos;s plane and parallel to the occlusal table.
                  </div>
                </div>

                <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2">
                  <div className="text-emerald-400 font-bold flex items-center justify-between">
                    <span>MANDIBULAR TARGET (T_mand)</span>
                    <span>18 × 18 mm</span>
                  </div>
                  <div className="text-slate-300 font-sans text-xs">
                    ArUco IDs: <strong className="text-white font-mono">7, 8, 9, 10</strong> (DICT_4X4_50).
                  </div>
                  <div className="text-slate-400 font-sans text-[11px] leading-relaxed">
                    Mounted on the right premolar buccal mandibular rim, 2–3 mm below the lower occlusal edge. Maintained directly inferior to the maxillary target.
                  </div>
                </div>
              </div>

              {/* Care, Disinfection & Maintenance Guidelines */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-white font-bold">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span>Chairside Maintenance &amp; Disinfection Care Instructions</span>
                </div>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    <strong>Pre-Scan Blotting:</strong> Before activating optical telemetry, gently blot the varnished marker face with a dry 2×2 gauze to remove superficial saliva film.
                  </li>
                  <li>
                    <strong>Safe Disinfection:</strong> Disinfect between patient trials using 0.2% chlorhexidine wipes or mild non-alcoholic hospital disinfectant wipes.
                  </li>
                  <li>
                    <strong>Strict Solvent Warning:</strong> <span className="text-rose-300 font-semibold">NEVER use pure acetone, high-concentration alcohol (&gt;70%), or chloroform</span> to clean markers, as organic solvents will dissolve the nail varnish seal and soften the cyanoacrylate bond.
                  </li>
                  <li>
                    <strong>Varnish Refresh:</strong> If the protective varnish develops a cloudy appearance or edge micro-fracture after repeated clinical washings, dry with a triple air syringe and reapply a single fresh layer of clear nail varnish chairside.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION: DENTULOUS PATIENTS & FULL MOUTH REHABILITATION (FMR) */}
          {/* ========================================================================= */}
          {activeSection === 'dentulous' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Smile className="w-5 h-5" />
                    <h3 className="text-base font-bold text-white">
                      Dentulous Patients &amp; Full Mouth Rehabilitation (FMR) Protocol
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold w-fit">
                    Natural Teeth &amp; Wear Assessment
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SmartBow AI extends beyond edentulous wax rims. In natural dentition, it provides sub-millimeter tracking of the 
                  CO-CR discrepancy, freeway space for lost VDO evaluation in tooth wear (Turner &amp; Missirlian classification), 
                  and transfers cranial reference planes to Exocad &amp; 3Shape to eliminate canted anterior smile designs.
                </p>
              </div>

              {/* 3 Core Dentulous Applications */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">Protocol 1</div>
                  <h4 className="text-sm font-bold text-white">CO-CR Slide Diagnostics</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Over 90% of dentulous patients exhibit a 1–2mm anterior-superior slide from Centric Relation (CR) to Maximum Intercuspation (MIP). SmartBow quantifies this in 3D: ΔX (lateral shift), ΔY (protrusive slide), and ΔZ (vertical drop). Lateral shifts &gt;1.0mm flag severe TMD/occlusal risk.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">Protocol 2</div>
                  <h4 className="text-sm font-bold text-white">Loss of VDO &amp; Tooth Wear (FMR)</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    In severe attrition/bruxism, SmartBow measures live Freeway Space (IRS = VDR - VDO). Category 1 wear (freeway space &gt;5mm) confirms lost VDO that can be safely restored. Category 2 (normal freeway space 2-4mm) indicates dentoalveolar extrusion where raising VDO requires trial splints (Dahl principle).
                  </p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Protocol 3</div>
                  <h4 className="text-sm font-bold text-white">IOS &amp; Virtual Articulator (Exocad)</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Intraoral scanners (Medit, TRIOS, iTero) capture teeth in isolation with zero cranial reference. SmartBow pairs with intraoral STL scans by computing the exact 4×4 transformation matrix between the dental arch, Camper&apos;s line, and interpupillary plane for zero-grinding crown seating.
                  </p>
                </div>
              </div>

              {/* Physical Attachment Options on Natural Teeth */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Validated Attachment Methods for Natural Teeth (Zero Wax Rims)</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-900 border border-cyan-800/40 rounded-lg space-y-1">
                    <div className="font-bold text-cyan-300 flex items-center justify-between">
                      <span>Method A: Disposable Dual-Arch Bite Fork Clutch (Static Transfer)</span>
                      <span className="text-[10px] font-mono text-slate-400">15-Second Chairside</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Express a 2mm layer of rigid bite registration silicone (Blu-Mousse or Regisil PB) on upper &amp; lower surfaces of a plastic bite fork. The patient bites lightly into MIP or CR. The external rigid stem holds the maxillary ArUco target 20mm lateral to the right oral commissure.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 border border-emerald-800/40 rounded-lg space-y-1">
                    <div className="font-bold text-emerald-300 flex items-center justify-between">
                      <span>Method B: Buccal Spot-Etch Resin Button (Dynamic Kinematics &amp; Chewing)</span>
                      <span className="text-[10px] font-mono text-slate-400">100% Occlusal Freedom</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Place a 1.5mm spot of light-cured temporary resin (Fermit, Temp-Bond, or spot-etched composite without full acid etch) on the buccal surface of maxillary #14/#15 and mandibular #44/#45. Seat miniature 12×12mm marker tabs and cure for 5s. Leaves occlusal surfaces untouched for free speech, swallowing, and border excursions. Pops off in 2 seconds with a scaler.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 border border-purple-800/40 rounded-lg space-y-1">
                    <div className="font-bold text-purple-300 flex items-center justify-between">
                      <span>Method C: Clear Vacuum-Formed Splint (Essix Stent)</span>
                      <span className="text-[10px] font-mono text-slate-400">TMD &amp; Mockup Try-in</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      0.75mm vacuum-formed clear template with pre-molded buccal marker wings. Ideal for patients undergoing TMD stabilization splint therapy or diagnostic mock-up evaluations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: JAW KINEMATIC CONTROL & LITERATURE GROUNDINGS */}
          {/* ========================================================================= */}
          {activeSection === 'jaw_kinematics' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-950/30 via-slate-900 to-slate-900 border border-purple-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1 text-purple-400">
                  <Sliders className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white">
                    Jaw Kinematic Doctrines & Prosthodontic Literature References
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SmartBow\'s kinematic algorithms are not heuristic guesses — they are mathematically grounded in foundational prosthodontic treatises (GPT-10, Boucher, Posselt, Dawson, Hanau, and Gysi).
                </p>
              </div>

              <div className="space-y-4">
                {JAW_KINEMATIC_DOCTRINES.map((doctrine, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-cyan-400 shrink-0" />
                        <h4 className="font-bold text-white text-sm">
                          {doctrine.concept}
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-cyan-300">
                        {doctrine.inventor}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-400 italic">
                      Literature: {doctrine.literatureReference}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong>Classical Biomechanics:</strong> {doctrine.clinicalRelevance}
                    </p>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs text-teal-300">
                      <strong>SmartBow Computer Vision Translation:</strong> {doctrine.smartBowImplementation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: VDO CLINICAL CHECKPOINTS */}
          {/* ========================================================================= */}
          {activeSection === 'vdo_checkpoints' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1 text-cyan-400">
                  <Layers className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white">
                    The 6 Clinical VDO Checkpoints (Multi-Method Consensus)
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  As established by Boucher and the Glossary of Prosthodontic Terms, no single mechanical measurement can be relied upon exclusively to determine vertical dimension. 
                  SmartBow incorporates the 6 validated clinical checkpoints to ensure the final VDO satisfies physiologic, phonetic, and esthetic requirements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VDO_CHECKPOINTS.map((cp) => (
                  <div key={cp.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 font-bold">
                        {cp.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {cp.authorReference.split('/')[0]}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-xs">
                      {cp.name}
                    </h4>

                    <div className="text-[11px] font-mono text-slate-400">
                      Ref: {cp.literatureCitation}
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <strong>Protocol:</strong> {cp.clinicalProtocol}
                    </p>

                    <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] space-y-1">
                      <div className="text-slate-200">
                        <strong>Target:</strong> {cp.recommendedValueRange}
                      </div>
                      <div className="text-teal-300">
                        <strong>Pass:</strong> {cp.validationCriterion}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: STEP-BY-STEP CLINICAL SOP */}
          {activeSection === 'stepbystep' && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                Prosthodontic Clinical Procedure (10–15 Minutes Total)
              </div>

              <div className="space-y-3 text-xs">
                {/* Step 1 */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 1: Patient Positioning & Facial Frame</span>
                    <span className="font-mono text-cyan-400 text-[11px]">1–2 Minutes</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Seat the patient comfortably upright in the dental chair with head unsupported by headrest in natural head position (look straight ahead into the horizon). Open the SmartBow scanner screen. Hold the smartphone 30–35 cm away. Confirm green HUD indicators for Glabella (L10), Right Zygoma (L234), and Left Zygoma (L454).
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 2: Occlusal Rim Placement</span>
                    <span className="font-mono text-cyan-400 text-[11px]">1 Minute</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Insert the maxillary and mandibular wax rims with the clipped 18×18mm ArUco marker boards. Confirm that the camera detects both the maxillary target (M01–M04) and mandibular target (L01–L04) on screen.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 3: VDO Adjustment & Live Gauge Feedback</span>
                    <span className="font-mono text-cyan-400 text-[11px]">3–4 Minutes</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Ask the patient to relax the jaw (swallow and rest). Note the Rest Dimension (VDR). Navigate to the VDO Gauge tab. Establish target VDO by subtracting 2–4 mm of freeway space (e.g., VDR 66.0 mm - 3.5 mm = VDO 62.5 mm). Trim or add wax on the rims until the live screen readout turns bright green.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 4: Occlusal Plane Orientation Check</span>
                    <span className="font-mono text-cyan-400 text-[11px]">2 Minutes</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Check the Mediolateral (ML) tilt readout. A reading within ±1.0° indicates that the occlusal plane is parallel to the interpupillary line, replacing visual Fox plane estimation.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 5: Centric Relation Repeatability Verification</span>
                    <span className="font-mono text-cyan-400 text-[11px]">3–5 Minutes</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Guide the patient's mandible into centric relation using Dawson's bimanual manipulation or swallow-and-close technique. Tap <strong>Capture Trial</strong> 3 times. If spatial deviation is &lt;0.5mm, the app displays <strong>ACCEPTED ✓</strong>. If &gt;1.0mm, deprogramme with a leaf gauge and repeat.
                  </p>
                </div>

                {/* Step 6 */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Step 6: CAD/CAM Export & Mounting Jig STL</span>
                    <span className="font-mono text-cyan-400 text-[11px]">30 Seconds</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Click <strong>Clinical Rx</strong> in the top navigation. Export the clinical prescription PDF, exocad XML file, and 3D-printable mounting jig STL. Send directly to your dental lab.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: DIGITAL GOTHIC ARCH */}
          {activeSection === 'gothic' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Digital Gothic Arch (Needle-Point) Tracing Operation</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SmartBow tracks the horizontal X-Y trajectory of the mandibular target (T_mand) relative to the maxillary target (T_max) without needing intraoral smoked plates or metallic tracing styluses.
                </p>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Important Clinical Camera Requirement:</strong> To track real patient jaw border excursions, the camera sensor must be active (or running in Phantom Simulator mode). The app prevents recording blank or uncalibrated traces when the camera is offline.
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="font-semibold text-white">How to perform the tracing:</div>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
                    <li>Navigate to the <strong>Gothic Arch</strong> tab.</li>
                    <li>If testing on a phantom or bench model, click <strong>"Run Border Movement"</strong> to execute an automated standardized excursion cycle.</li>
                    <li>If recording a patient live, click <strong>"Live Camera Tracking"</strong>. Ask the patient to protrude 6mm, return to center, move right lateral 6mm, return to center, then move left lateral 6mm.</li>
                    <li>The system identifies the <strong>Centric Apex (CR)</strong> at the intersection of lateral pathways and computes the <strong>Sagittal Condylar Inclination (SCI)</strong> and <strong>Bennett Angles (L & R)</strong> automatically.</li>
                    <li>Click <strong>"Apply to Articulator"</strong> to store these values into the patient's clinical file.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: CR REPEATABILITY PROTOCOL */}
          {activeSection === 'cr' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span>Understanding the 3-Trial CR Repeatability Scoring</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Conventional technique relies solely on the clinician's tactile feeling. SmartBow calculates the maximum 3D Euclidean distance between three separate mandibular closure recordings:
                </p>
                <div className="p-3 bg-slate-900 rounded font-mono text-xs text-center text-cyan-300">
                  d_max = max( || P_i - P_j || )  for i, j in {'{1, 2, 3}'}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                    <span className="font-bold text-emerald-400 text-xs">ACCEPTED (&lt; 0.50 mm)</span>
                    <p className="text-[11px] text-slate-300">
                      Indicates true, repeatable condylar seating without muscle splinting. Proceed with bite registration or cast mounting.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1">
                    <span className="font-bold text-amber-400 text-xs">RETRY (0.50 – 1.00 mm)</span>
                    <p className="text-[11px] text-slate-300">
                      Mild muscle guarding or patient hesitation. Instruct patient to swallow, relax tongue, and perform bimanual guidance again.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 space-y-1">
                    <span className="font-bold text-rose-400 text-xs">REJECT (&gt; 1.00 mm)</span>
                    <p className="text-[11px] text-slate-300">
                      Significant discrepancy. Deprogramme the masticatory musculature using an anterior leaf gauge or Lucia jig for 5–10 minutes before re-recording.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: VIRTUAL ARTICULATOR & LAB STL */}
          {activeSection === 'articulator' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Box className="w-4 h-4 text-cyan-400" />
                  <span>3D Articulator Mounting & Lab Hand-off</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SmartBow bridges the physical operatory and dental lab through two primary mechanisms:
                </p>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <h5 className="font-bold text-white text-xs mb-1">Option A: Physical Hanau Articulator Transfer Jig (STL)</h5>
                    <p className="text-slate-300 text-[11px]">
                      Navigate to the <strong>3D Articulator</strong> tab and click <strong>Download Mounting Jig (.STL)</strong>. 3D-print this custom jig in dental resin. The jig fits onto the lower member of a Hanau Wide-Vue or Hanau-Mate articulator and positions the maxillary cast at the exact 3D spatial coordinate recorded from the patient, completely eliminating the physical facebow assembly.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <h5 className="font-bold text-white text-xs mb-1">Option B: Virtual CAD Articulator Auto-Programming</h5>
                    <p className="text-slate-300 text-[11px]">
                      Click <strong>Export exocad / 3Shape</strong> to download the exact kinematic file. The lab technician imports this file into exocad or 3Shape Dental System, which automatically dials in the Sagittal Condylar Inclination (SCI) and Bennett angles.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 9: TROUBLESHOOTING */}
          {activeSection === 'troubleshooting' && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Camera permission denied or black screen</span>
                </h4>
                <p className="text-slate-300 text-[11px]">
                  Ensure camera access permissions are enabled in your mobile browser settings. If operating on an insecure HTTP connection, use HTTPS or switch to the built-in clinical simulator mode.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>ArUco markers flickering or not recognized</span>
                </h4>
                <p className="text-slate-300 text-[11px]">
                  Verify that operatory light is not reflecting directly off the marker surface creating glare. Hold the camera steady at 300–350 mm distance. Make sure markers are clean and sealed with matte or non-reflective coating.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Patient moves head during recording</span>
                </h4>
                <p className="text-slate-300 text-[11px]">
                  The patient coordinate frame (T_patient) continuously updates in 3D relative to the face landmarks, absorbing modest head movements up to ±15°. However, large rapid movements should be avoided during the 1-second capture trigger.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>MDS Prosthodontics Protocol Approved · Dr. Deepanshu</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (onNavigateToTab) onNavigateToTab('vdo');
              }}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              Open VDO Checkpoints
            </button>
            <button
              onClick={() => {
                onClose();
                if (onNavigateToTab) onNavigateToTab('scanner');
              }}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Start Clinical Session
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
