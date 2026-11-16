/**
 * SmartBow AI - Four-Day Engineering Presentation Prototype Tour
 * Interactive step-by-step presentation walkthrough demonstrating the digital jaw relation workflow.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Camera, 
  Layers, 
  Compass, 
  Box, 
  FileText, 
  ShieldCheck, 
  Smile, 
  LayoutDashboard,
  ExternalLink,
  Info
} from 'lucide-react';

interface PresentationTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: any) => void;
  onSelectRecordsSubtab?: (subtab: any) => void;
  onOpenReport?: () => void;
  onOpenMarkers?: () => void;
  isSimulatedMode: boolean;
  onToggleSimulatedMode?: (simulated: boolean) => void;
}

interface TourStep {
  id: string;
  moduleNumber: number;
  title: string;
  subtitle: string;
  tabTarget: string;
  subtabTarget?: string;
  icon: React.ComponentType<{ className?: string }>;
  keyHighlights: string[];
  clinicalSignificance: string;
  implementationTruth: {
    implemented: string;
    simulated: string;
    unavailable: string;
  };
  evaluatorCheck: string;
}

export const PresentationTourModal: React.FC<PresentationTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  onSelectRecordsSubtab,
  onOpenReport,
  onOpenMarkers,
  isSimulatedMode,
  onToggleSimulatedMode,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  if (!isOpen) return null;

  const tourSteps: TourStep[] = [
    {
      id: 'dashboard',
      moduleNumber: 1,
      title: 'Clinical Dashboard & Case Provenance',
      subtitle: 'Central hub for patient triage, workflow tracking, and truthful data provenance.',
      tabTarget: 'home',
      icon: LayoutDashboard,
      keyHighlights: [
        'Real-time Case Registry with editable patient demographics and multiple cases.',
        '7-Stage Digital Jaw Relation Workflow progress tracker.',
        'Persistent LIVE vs. SIMULATED demonstration status indicator.',
        'Capture-readiness safety gates preventing uncalibrated clinical recording.'
      ],
      clinicalSignificance: 'Ensures clear data provenance so simulated demonstration baselines are never conflated with real patient records.',
      implementationTruth: {
        implemented: 'Multi-case database, demographic editing, workflow progress tracking, provenance badges.',
        simulated: 'Demonstration baseline patient record (SB-8042) populated for UI preview.',
        unavailable: 'Direct hospital EHR/EMR cloud sync (runs offline in-browser).'
      },
      evaluatorCheck: 'Click "Edit Details" on the patient card or switch between Live and Demo mode to verify provenance labeling.'
    },
    {
      id: 'assessment',
      moduleNumber: 2,
      title: 'Patient Assessment & Facial Photometry',
      subtitle: 'Frontal and lateral profile photographic analysis with anatomical reference planes.',
      tabTarget: 'assessment',
      icon: Smile,
      keyHighlights: [
        'Frontal and lateral profile photo acquisition (live camera snapshot or file upload).',
        'Frontal reference planes: Interpupillary line tilt (°), Facial midline, Horizontal facial thirds (Trichion–Glabella–Subnasale–Menton).',
        'Profile reference planes: Camper\'s line (Tragus-Ala), Frankfort horizontal, Ricketts E-line, Nasolabial angle.',
        'Clearly stamped: "ESTIMATED FROM 2D PHOTOMETRY — UNCALIBRATED".',
        'Biometric Central Incisor Width estimation via Berry\'s ratio (Bizygomatic / 16).'
      ],
      clinicalSignificance: 'Replaces physical facebow and Fox plane visual checks with objective optical facial symmetry reference planes.',
      implementationTruth: {
        implemented: 'Dual-view photo acquisition, interactive reference overlays, Berry\'s incisor calculation, tooth shade guidance.',
        simulated: 'Clinical demonstration photos available for instant offline evaluation without a live subject.',
        unavailable: '3D cephalometric volumetric CBCT reconstruction (2D photometry only).'
      },
      evaluatorCheck: 'Toggle reference plane guides or switch between Frontal and Profile tabs to inspect facial symmetry lines.'
    },
    {
      id: 'scanner',
      moduleNumber: 3,
      title: 'Live Camera, Tracking & Device Selection',
      subtitle: 'Browser-native camera streaming with genuine optical tracking and zero fabricated mesh claims.',
      tabTarget: 'scanner',
      icon: Camera,
      keyHighlights: [
        'Camera permission handling with explicit diagnostics for NotAllowedError / busy devices.',
        'Camera device selection (User Front, Environment Rear, External USB HD).',
        'Truthful tracking: uses genuine optical chromaticity and feature centroid bounding (Glabella F01, Zygomas F02/F03).',
        'Zero-fake-mesh policy: Never fabricates 468 MediaPipe landmarks when unverified.',
        'Real-time illumination (IRE) and FPS telemetry.'
      ],
      clinicalSignificance: 'Eliminates painful meatal facebow earplugs and skin adhesive stickers using contactless optical tracking.',
      implementationTruth: {
        implemented: 'Live WebRTC streaming, device enumeration, optical chromaticity face tracking, lighting diagnostics.',
        simulated: 'Simulated tracking viewport available when DEMO MODE is enabled.',
        unavailable: 'Hardware infrared structured-light depth sensing (uses standard RGB cameras).'
      },
      evaluatorCheck: 'Open the camera dropdown to see available video devices or toggle between Live Camera and Simulation mode.'
    },
    {
      id: 'markers',
      moduleNumber: 4,
      title: 'ArUco Marker Detection & Sub-mm CAD Geometry',
      subtitle: 'Real-time optical decoding of 6×6 ArUco DICT_4X4_50 marker boards.',
      tabTarget: 'scanner',
      icon: ShieldCheck,
      keyHighlights: [
        'Fast in-browser ArUco detector (detectArucoMarkersFromCanvas) scanning at 60 FPS.',
        'Registers Maxillary carrier board (IDs 3–6) and Mandibular carrier board (IDs 7–10).',
        'Live optical telemetry HUD displaying detected IDs, (u, v) image pixel coordinates, and centers.',
        'Configurable dimensions with explicit documentation: 18×18 mm board, 6.5 mm marker, 7.5 mm pitch.',
        'Single-click printable A4 marker sheet with dual-axis Vernier verification scale bars.'
      ],
      clinicalSignificance: 'Rigid fiducial carrier boards clipped to occlusal wax rims establish sub-millimeter jaw relation datums.',
      implementationTruth: {
        implemented: 'Real-time candidate thresholding, OpenCV DICT_4X4_50 dictionary decoding, coordinate HUD, 1:1 vector print generator.',
        simulated: 'Synthetic carrier board telemetry when running in Simulation mode.',
        unavailable: 'Multi-camera stereoscopic rig tracking (currently monocular PnP pose estimation).'
      },
      evaluatorCheck: 'Inspect the Live Telemetry drawer in the Scanner to view detected ArUco marker IDs and pixel coordinates.'
    },
    {
      id: 'jaw-relation',
      moduleNumber: 5,
      title: 'Prosthodontic Jaw Relation Workflow',
      subtitle: 'Step-by-step acquisition of Maxillary tilt, Mandibular position, VDO, and CR repeatability.',
      tabTarget: 'workflow',
      subtabTarget: 'vdo',
      icon: Layers,
      keyHighlights: [
        'Maxillary reference acquisition: Mediolateral and Anteroposterior occlusal plane tilts relative to bipupillary and Camper\'s planes.',
        'Vertical Dimension: Physiologic Rest Position (VDR), Occlusion (VDO), and calculated Freeway Space (VDR - VDO).',
        '6 Literature-grounded VDO checkpoints (Silverman\'s phonetics, Niswonger\'s rest, Willis proportionality, Shanahan deglutition).',
        '3-Trial Centric Relation repeatability matrix with automatic Euclidean dispersion calculation (acceptance threshold ≤ 0.5 mm).',
        'Every metric explicitly marked: LIVE MEASURED / LIVE UNCALIBRATED / CALIBRATED ENGINEERING / SIMULATED / UNAVAILABLE.'
      ],
      clinicalSignificance: 'Digitizes Willis gauge and tactile wax rim trimming into repeatable quantitative metric measurements.',
      implementationTruth: {
        implemented: 'VDO caliper calculation, freeway space evaluation, pairwise CR distance matrix, repeatability gate (≤0.5mm).',
        simulated: 'Simulated trial coordinates provided in Demo mode.',
        unavailable: 'Direct electromyographic (EMG) masseter/temporalis recording.'
      },
      evaluatorCheck: 'Check the VDO Checkpoints and Centric Relation tabs to see the pairwise distance matrix and dispersion status.'
    },
    {
      id: 'gothic-arch',
      moduleNumber: 6,
      title: 'Gothic Arch & Mandibular Kinematics',
      subtitle: 'Dynamic tracing of border movements, centric apex detection, and condylar guidance.',
      tabTarget: 'workflow',
      subtabTarget: 'gothic',
      icon: Compass,
      keyHighlights: [
        'Digital needle-point tracing replacing intraoral soot/wax registration plates.',
        'Automatic Centric Relation Apex detection from intersecting border tracings.',
        'Excursive movement paths: Protrusion, Right lateral, Left lateral excursions.',
        'Calculates Sagittal Condylar Inclination (SCI / HCI) in degrees and bilateral Bennett angles (L/R).',
        'Exports condylar values directly to Hanau, Artex, and Whip Mix articulator programming.'
      ],
      clinicalSignificance: 'Eliminates gag-inducing intraoral tracing plates, fragile plaster bite registrations, and patient discomfort.',
      implementationTruth: {
        implemented: 'Real-time trace visualization, apex calculation, excursion angle calculation, Hanau prescription export.',
        simulated: 'Kinematic trajectory generator for benchtop simulation.',
        unavailable: 'Direct ultrasonographic jaw tracking (uses optical fiducial tracking).'
      },
      evaluatorCheck: 'Run the kinematic tracing in the Gothic Arch tab to observe apex detection and calculated condylar angles.'
    },
    {
      id: 'articulator',
      moduleNumber: 7,
      title: '3D Virtual Articulator Kinematics',
      subtitle: 'Interactive 3D mechanical articulator programming and CAD/CAM export.',
      tabTarget: 'articulator',
      icon: Box,
      keyHighlights: [
        'Interactive Three.js 3D spatial model showing Upper Member, Lower Member, Condylar Elements, and Incisal Pin.',
        'Dynamic kinematic simulation driven by recorded SCI, Bennett angles, and VDO.',
        'Clear banner: "CONCEPTUAL KINEMATIC SIMULATION — Demonstrating mechanical articulator programming".',
        'Direct export of Exocad Virtual Articulator XML, 3Shape exchange format, and 3D-printable mounting jig STL.'
      ],
      clinicalSignificance: 'Bridges clinic and dental laboratory seamlessly: mounts virtual dental casts into CAD software without physical stone plaster expansion errors.',
      implementationTruth: {
        implemented: 'Three.js interactive viewer, condylar slider controls, Exocad/3Shape file exporter, mounting jig STL generator.',
        simulated: 'Mechanical movement visualization is simulated from programmed angles.',
        unavailable: 'In-vivo intra-capsular TMJ disc kinematics (demonstrates mechanical articulator geometry).'
      },
      evaluatorCheck: 'Adjust the Opening Angle or Protrusion sliders in the 3D Articulator tab to test mechanical movements.'
    },
    {
      id: 'export',
      moduleNumber: 8,
      title: 'Clinical Lab Rx & Protected Export',
      subtitle: 'High-definition vector PDF and CSV dossier with strict simulation safety watermarking.',
      tabTarget: 'home',
      icon: FileText,
      keyHighlights: [
        'Single-click download of HD Vector PDF Clinical Report with native vector shapes.',
        'Comprehensive CSV data export for Microsoft Excel, SPSS, and R statistical research.',
        'Protected Export Gate: Blocks clinical validation exports when optical tracking or calibration are incomplete.',
        'Prominent watermark: "# WARNING: SIMULATION — NOT FOR CLINICAL USE" on all synthetic outputs.',
        'Preserves exact patient demographics, case timestamps, and individual trial readings.'
      ],
      clinicalSignificance: 'Provides the prosthodontic dental laboratory with a complete, legally compliant lab work authorization and mounting prescription.',
      implementationTruth: {
        implemented: 'Client-side vector PDF generation, CSV table export, safety gating, watermark injection.',
        simulated: 'Watermark applied automatically to any case with dataProvenance="SIMULATED".',
        unavailable: 'Digital cryptographic signature of dental records.'
      },
      evaluatorCheck: 'Click "View Clinical Rx" or "Download HD PDF" to review the laboratory prescription and safety watermark.'
    }
  ];

  const currentStep = tourSteps[currentStepIndex];
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      onNavigateToTab(tourSteps[nextIndex].tabTarget);
      if (tourSteps[nextIndex].subtabTarget && onSelectRecordsSubtab) {
        onSelectRecordsSubtab(tourSteps[nextIndex].subtabTarget);
      }
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      onNavigateToTab(tourSteps[prevIndex].tabTarget);
      if (tourSteps[prevIndex].subtabTarget && onSelectRecordsSubtab) {
        onSelectRecordsSubtab(tourSteps[prevIndex].subtabTarget);
      }
    }
  };

  const handleJumpToStep = (index: number) => {
    setCurrentStepIndex(index);
    onNavigateToTab(tourSteps[index].tabTarget);
    if (tourSteps[index].subtabTarget && onSelectRecordsSubtab) {
      onSelectRecordsSubtab(tourSteps[index].subtabTarget);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-950/70 px-2 py-0.5 rounded border border-teal-800/60">
                  Step {currentStep.moduleNumber} of {tourSteps.length}
                </span>
                <span className="text-xs text-slate-400">
                  Four-Day Presentation Prototype
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                {currentStep.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close Tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tourSteps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => handleJumpToStep(idx)}
              className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                idx === currentStepIndex
                  ? 'bg-teal-700 text-white shadow-sm'
                  : idx < currentStepIndex
                  ? 'bg-slate-800 text-teal-300 hover:bg-slate-700'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span>{step.moduleNumber}. {step.id}</span>
              {idx < currentStepIndex && <CheckCircle2 className="w-3 h-3 text-teal-400" />}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Subtitle / Overview */}
          <p className="text-slate-300 text-sm leading-relaxed">
            {currentStep.subtitle}
          </p>

          {/* Key Features & Architecture Grid */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <StepIcon className="w-4 h-4 text-teal-400" />
              <span>Engineering Specifications & Workflow Capabilities</span>
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {currentStep.keyHighlights.map((hl, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-teal-400 shrink-0 font-bold">•</span>
                  <span>{hl}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Clinical Significance */}
          <div className="p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
              Prosthodontic Clinical Grounding:
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentStep.clinicalSignificance}
            </p>
          </div>

          {/* Engineering Truth Table */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
              <span className="text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                ✓ Actually Implemented
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {currentStep.implementationTruth.implemented}
              </p>
            </div>
            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl">
              <span className="text-amber-400 font-bold uppercase tracking-wider block mb-1">
                ◈ Simulated in Demo
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {currentStep.implementationTruth.simulated}
              </p>
            </div>
            <div className="p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl">
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                ✕ Unavailable
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {currentStep.implementationTruth.unavailable}
              </p>
            </div>
          </div>

          {/* How Evaluator Can Test */}
          <div className="p-3 bg-teal-950/40 border border-teal-800/50 rounded-xl flex items-start gap-2.5">
            <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-200 leading-relaxed">
              <strong className="text-white font-semibold">How to evaluate in prototype: </strong>
              {currentStep.evaluatorCheck}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNavigateToTab(currentStep.tabTarget);
                if (currentStep.subtabTarget && onSelectRecordsSubtab) {
                  onSelectRecordsSubtab(currentStep.subtabTarget);
                }
                onClose();
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>View This Module</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                currentStepIndex === 0
                  ? 'text-slate-600 bg-slate-900 border border-slate-800 cursor-not-allowed'
                  : 'text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentStepIndex < tourSteps.length - 1 ? (
              <button
                onClick={handleNext}
                className="min-h-[38px] px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 rounded-lg shadow transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="min-h-[38px] px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg shadow transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Complete Tour</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
