/**
 * SmartBow AI - Smartphone-based Dental Jaw Relation & Treatment Planning System
 * Replacing physical facebow, Fox plane, Willis gauge, gothic arch tracer, and protrusive records
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry · Version 2.0
 */

import React, { useState, useEffect } from 'react';
import { Navigation, MainNavTab } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { LiveScanner } from './components/LiveScanner';
import { RecordsView, RecordsSubtab } from './components/RecordsView';
import { SettingsView } from './components/SettingsView';
import { ValidationSuite } from './components/ValidationSuite';
import { PrintableMarkersModal } from './components/PrintableMarkersModal';
import { ClinicalReportModal } from './components/ClinicalReportModal';
import { PatientDatabaseModal } from './components/PatientDatabaseModal';
import { PatientSetupModal } from './components/PatientSetupModal';
import { UserManualModal } from './components/UserManualModal';
import { CameraCalibrationModal } from './components/CameraCalibrationModal';
import { PatientCase, CrRecord, GothicArchPoint, DentitionState, CameraCalibrationSettings } from './types/smartbow';
import { computeCrDeviation } from './lib/clinicalMath';
import { loadCameraCalibration } from './lib/cameraCalibration';

// Initial case baseline - Explicitly classified as SIMULATED demonstration
const DEFAULT_PATIENT_CASE: PatientCase = {
  patientId: 'SB-8042',
  name: 'Sunita Verma',
  age: 62,
  gender: 'FEMALE',
  dentitionState: 'EDENTULOUS',
  articulator: 'HANAU_WIDE_VUE',
  createdAt: new Date().toISOString(),
  dataProvenance: 'SIMULATED',
  biometrics: {
    lowerThirdPct: 33.1,
    bizFaceRatio: 0.72,
    facialForm: 'square',
    interpupillaryTiltDeg: 1.2,
    bizygomaticWidthMm: 136,
    facialHeightMm: 190,
    lipGapMm: 2.0,
    midlineDeviationMm: 0.3,
    estimatedShade: 'A2',
    subnasaleToMentonMm: 62.5
  },
  measurements: {
    provenance: 'SIMULATED',
    vdoMm: 62.5,
    freewaySpaceMm: 3.5,
    vdrMm: 66.0,
    occlusalTiltMLDeg: 1.4,
    occlusalTiltAPDeg: 4.8,
    midlineShiftMm: 0.3,
    crDeviationMm: 0.26,
    crStatus: 'ACCEPTED',
    sciEstimateDeg: 34.0,
    bennettAngleDeg: 16.0,
    bennettLeftDeg: 16.2,
    bennettRightDeg: 16.5
  },
  crRecords: [
    {
      trialIndex: 1,
      timestamp: Date.now() - 120000,
      mandibularCentroidPatient: { x: 0.12, y: 0.08, z: -62.5 },
      vdoMm: 62.5,
      tiltMLDeg: 1.4
    },
    {
      trialIndex: 2,
      timestamp: Date.now() - 60000,
      mandibularCentroidPatient: { x: 0.28, y: -0.12, z: -62.4 },
      vdoMm: 62.4,
      tiltMLDeg: 1.4
    },
    {
      trialIndex: 3,
      timestamp: Date.now() - 10000,
      mandibularCentroidPatient: { x: -0.05, y: 0.14, z: -62.6 },
      vdoMm: 62.6,
      tiltMLDeg: 1.4
    }
  ],
  gothicArchPoints: [],
  clinicalNotes: 'Maxillary & mandibular edentulous ridges with resorption class II. Planned for complete denture with bilateral balanced articulation on Hanau articulator.'
};

export default function App() {
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [recordsSubtab, setRecordsSubtab] = useState<RecordsSubtab>('vdo');
  const [developerMode, setDeveloperMode] = useState<boolean>(() => {
    return localStorage.getItem('smartbow_dev_mode') === 'true';
  });

  const [cases, setCases] = useState<PatientCase[]>(() => {
    const saved = localStorage.getItem('smartbow_cases');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [DEFAULT_PATIENT_CASE];
  });

  const [activeCaseId, setActiveCaseId] = useState<string>(cases[0]?.patientId || DEFAULT_PATIENT_CASE.patientId);

  // Active case pointer
  const activeCase = cases.find(c => c.patientId === activeCaseId) || cases[0] || DEFAULT_PATIENT_CASE;

  // Local state for interactive VDR (Rest Dimension)
  const [vdrMm, setVdrMm] = useState<number>(66.0);

  // Modal open states
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isMarkersOpen, setIsMarkersOpen] = useState<boolean>(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState<boolean>(false);
  const [isNewPatientOpen, setIsNewPatientOpen] = useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isValidationOpen, setIsValidationOpen] = useState<boolean>(false);

  // Calibration settings
  const [calibrationSettings, setCalibrationSettings] = useState(loadCameraCalibration);

  // Save cases to localStorage on modification
  useEffect(() => {
    localStorage.setItem('smartbow_cases', JSON.stringify(cases));
  }, [cases]);

  // Save dev mode setting
  const handleToggleDeveloperMode = (enabled: boolean) => {
    setDeveloperMode(enabled);
    localStorage.setItem('smartbow_dev_mode', enabled ? 'true' : 'false');
  };

  // Helper to update active case
  const updateActiveCase = (updater: (prev: PatientCase) => PatientCase) => {
    setCases(prevCases =>
      prevCases.map(c => (c.patientId === activeCase.patientId ? updater(c) : c))
    );
  };

  // Measurement updates
  const handleUpdateVdo = (newVdo: number) => {
    updateActiveCase(c => {
      const totalFaceH = c.biometrics.facialHeightMm || 190;
      const lowerH = newVdo;
      const lowerThirdPct = Number(((lowerH / totalFaceH) * 100).toFixed(1));

      return {
        ...c,
        measurements: {
          ...c.measurements,
          vdoMm: Number(newVdo.toFixed(1))
        },
        biometrics: {
          ...c.biometrics,
          lowerThirdPct,
          subnasaleToMentonMm: Number(newVdo.toFixed(1))
        }
      };
    });
  };

  const handleUpdateTiltML = (tilt: number) => {
    updateActiveCase(c => ({
      ...c,
      measurements: {
        ...c.measurements,
        occlusalTiltMLDeg: Number(tilt.toFixed(1))
      }
    }));
  };

  const handleUpdateTiltAP = (tilt: number) => {
    updateActiveCase(c => ({
      ...c,
      measurements: {
        ...c.measurements,
        occlusalTiltAPDeg: Number(tilt.toFixed(1))
      }
    }));
  };

  const handleUpdateMidline = (shift: number) => {
    updateActiveCase(c => ({
      ...c,
      measurements: {
        ...c.measurements,
        midlineShiftMm: Number(shift.toFixed(1))
      }
    }));
  };

  // Centric relation trial recording
  const handleAddCrRecord = () => {
    updateActiveCase(c => {
      const idx = c.crRecords.length + 1;
      const currentVdo = c.measurements.vdoMm ?? 62.5;
      const midline = c.measurements.midlineShiftMm ?? 0;
      
      const newRecord: CrRecord = {
        trialIndex: idx,
        timestamp: Date.now(),
        mandibularCentroidPatient: {
          x: Number(midline.toFixed(2)),
          y: 0.0,
          z: Number((-currentVdo).toFixed(2))
        },
        vdoMm: currentVdo,
        tiltMLDeg: c.measurements.occlusalTiltMLDeg ?? 0,
        provenance: 'SIMULATED'
      };

      const newRecords = [...c.crRecords, newRecord];
      const points = newRecords.map(r => r.mandibularCentroidPatient);
      const evalResult = computeCrDeviation(points);

      return {
        ...c,
        crRecords: newRecords,
        measurements: {
          ...c.measurements,
          crDeviationMm: evalResult.maxDeviationMm,
          crStatus: evalResult.status
        }
      };
    });
  };

  const handleClearCrRecords = () => {
    updateActiveCase(c => ({
      ...c,
      crRecords: [],
      measurements: {
        ...c.measurements,
        crDeviationMm: null,
        crStatus: 'UNAVAILABLE'
      }
    }));
  };

  // Gothic arch excursion points
  const handleAddGothicPoint = (pt: GothicArchPoint) => {
    updateActiveCase(c => ({
      ...c,
      gothicArchPoints: [...c.gothicArchPoints, pt]
    }));
  };

  const handleClearGothicPoints = () => {
    updateActiveCase(c => ({
      ...c,
      gothicArchPoints: []
    }));
  };

  const handleSaveGothicParameters = (sci: number | null, bennettL: number | null, bennettR: number | null) => {
    updateActiveCase(c => ({
      ...c,
      measurements: {
        ...c.measurements,
        sciEstimateDeg: sci,
        bennettLeftDeg: bennettL,
        bennettRightDeg: bennettR
      }
    }));
  };

  const handleSelectShade = (shade: string) => {
    updateActiveCase(c => ({
      ...c,
      biometrics: {
        ...c.biometrics,
        estimatedShade: shade
      }
    }));
  };

  const handleUpdateDentition = (dentition: DentitionState) => {
    updateActiveCase(c => ({
      ...c,
      dentitionState: dentition
    }));
  };

  const handleSaveNewPatient = (newCase: PatientCase) => {
    setCases(prev => [newCase, ...prev]);
    setActiveCaseId(newCase.patientId);
  };

  const handleDeleteCase = (patientId: string) => {
    setCases(prev => prev.filter(c => c.patientId !== patientId));
    if (activeCaseId === patientId) {
      const remaining = cases.filter(c => c.patientId !== patientId);
      if (remaining.length > 0) setActiveCaseId(remaining[0].patientId);
    }
  };

  const handleResetCaseData = () => {
    setCases([DEFAULT_PATIENT_CASE]);
    setActiveCaseId(DEFAULT_PATIENT_CASE.patientId);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Responsive Navigation: Top Bar (Desktop) & Top Header + Bottom Bar (Mobile) */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        patientId={activeCase.patientId}
        patientName={activeCase.name}
        onOpenReport={() => setIsReportOpen(true)}
      />

      {/* Main Clinical Screen Viewport */}
      <main className="flex-1 pb-16 md:pb-0">
        {activeTab === 'home' && (
          <HomeDashboard
            patientCase={activeCase}
            onNavigateToTab={setActiveTab}
            onSelectRecordsSubtab={(sub) => setRecordsSubtab(sub)}
            onOpenReport={() => setIsReportOpen(true)}
            onOpenMarkers={() => setIsMarkersOpen(true)}
            onOpenManual={() => setIsManualOpen(true)}
            onOpenDatabase={() => setIsDatabaseOpen(true)}
          />
        )}

        {activeTab === 'scanner' && (
          <LiveScanner
            dentitionState={activeCase.dentitionState}
            onUpdateDentition={handleUpdateDentition}
            vdoMm={activeCase.measurements.vdoMm}
            onUpdateVdo={handleUpdateVdo}
            tiltMLDeg={activeCase.measurements.occlusalTiltMLDeg}
            onUpdateTiltML={handleUpdateTiltML}
            tiltAPDeg={activeCase.measurements.occlusalTiltAPDeg}
            onUpdateTiltAP={handleUpdateTiltAP}
            midlineShiftMm={activeCase.measurements.midlineShiftMm}
            onUpdateMidline={handleUpdateMidline}
            onRecordCrTrial={handleAddCrRecord}
            onNavigateToTab={setActiveTab}
            developerMode={developerMode}
          />
        )}

        {activeTab === 'records' && (
          <RecordsView
            initialSubtab={recordsSubtab}
            patientCase={activeCase}
            vdrMm={vdrMm}
            onUpdateVdr={setVdrMm}
            onUpdateVdo={handleUpdateVdo}
            onRecordCrTrial={handleAddCrRecord}
            onClearCrRecords={handleClearCrRecords}
            onAddGothicPoint={handleAddGothicPoint}
            onClearGothicPoints={handleClearGothicPoints}
            onSaveGothicParameters={handleSaveGothicParameters}
            onSelectShade={handleSelectShade}
            onUpdateArticulatorType={(type) => {
              updateActiveCase(c => ({ ...c, articulator: type }));
            }}
            onNavigateToTab={setActiveTab}
            onOpenReport={() => setIsReportOpen(true)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onOpenCalibration={() => setIsCalibrationOpen(true)}
            onOpenMarkers={() => setIsMarkersOpen(true)}
            onOpenValidation={() => setIsValidationOpen(true)}
            onOpenManual={() => setIsManualOpen(true)}
            onOpenDatabase={() => setIsDatabaseOpen(true)}
            developerMode={developerMode}
            onToggleDeveloperMode={handleToggleDeveloperMode}
            onResetCaseData={handleResetCaseData}
          />
        )}
      </main>

      {/* Clinical Modals */}
      <PrintableMarkersModal
        isOpen={isMarkersOpen}
        onClose={() => setIsMarkersOpen(false)}
      />

      <ClinicalReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        patientCase={activeCase}
      />

      <PatientDatabaseModal
        isOpen={isDatabaseOpen}
        onClose={() => setIsDatabaseOpen(false)}
        cases={cases}
        activeCaseId={activeCaseId}
        onSelectCase={setActiveCaseId}
        onDeleteCase={handleDeleteCase}
        onOpenNewCase={() => setIsNewPatientOpen(true)}
      />

      <PatientSetupModal
        isOpen={isNewPatientOpen}
        onClose={() => setIsNewPatientOpen(false)}
        onSavePatient={handleSaveNewPatient}
      />

      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onNavigateToTab={(tab) => {
          if (['vdo', 'cr', 'gothic', 'facial', 'articulator'].includes(tab)) {
            setRecordsSubtab(tab as RecordsSubtab);
            setActiveTab('records');
          } else if (tab === 'scanner') {
            setActiveTab('scanner');
          } else if (tab === 'validation') {
            setIsValidationOpen(true);
          }
          setIsManualOpen(false);
        }}
      />

      <CameraCalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        currentSettings={calibrationSettings}
        currentMeasuredDistanceCm={48}
        onSaveSettings={(settings: CameraCalibrationSettings) => setCalibrationSettings(settings)}
      />

      {isValidationOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Academic Defense &amp; Clinical Validation Suite</h3>
              <button
                onClick={() => setIsValidationOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ValidationSuite />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
