/**
 * SmartBow AI - Smartphone-based Dental Jaw Relation & Treatment Planning System
 * Replacing physical facebow, Fox plane, Willis gauge, gothic arch tracer, and protrusive records
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry · Version 1.0
 */

import React, { useState, useEffect } from 'react';
import { TopNav, ActiveTab } from './components/TopNav';
import { LiveScanner } from './components/LiveScanner';
import { VdoDashboard } from './components/VdoDashboard';
import { CrRecorder } from './components/CrRecorder';
import { GothicArchTracer } from './components/GothicArchTracer';
import { FacialAnalysisView } from './components/FacialAnalysisView';
import { VirtualArticulator3D } from './components/VirtualArticulator3D';
import { ValidationSuite } from './components/ValidationSuite';
import { PrintableMarkersModal } from './components/PrintableMarkersModal';
import { ClinicalReportModal } from './components/ClinicalReportModal';
import { PatientDatabaseModal } from './components/PatientDatabaseModal';
import { PatientSetupModal } from './components/PatientSetupModal';
import { UserManualModal } from './components/UserManualModal';
import { PatientCase, CrRecord, GothicArchPoint, DentitionState } from './types/smartbow';

// Initial case baseline
const DEFAULT_PATIENT_CASE: PatientCase = {
  patientId: 'SB-8042',
  name: 'Sunita Verma',
  age: 62,
  gender: 'FEMALE',
  dentitionState: 'EDENTULOUS',
  articulator: 'HANAU_WIDE_VUE',
  createdAt: new Date().toISOString(),
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
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

  // Save cases to localStorage on modification
  useEffect(() => {
    localStorage.setItem('smartbow_cases', JSON.stringify(cases));
  }, [cases]);

  // Helper to update active case
  const updateActiveCase = (updater: (prev: PatientCase) => PatientCase) => {
    setCases(prevCases =>
      prevCases.map(c => (c.patientId === activeCase.patientId ? updater(c) : c))
    );
  };

  // Measurement updates
  const handleUpdateVdo = (newVdo: number) => {
    updateActiveCase(c => {
      // Proportional lower third update
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
      // Slight jitter around centroid
      const jitterX = (Math.random() - 0.5) * 0.35;
      const jitterY = (Math.random() - 0.5) * 0.35;
      const newRecord: CrRecord = {
        trialIndex: idx,
        timestamp: Date.now(),
        mandibularCentroidPatient: {
          x: Number((c.measurements.midlineShiftMm + jitterX).toFixed(2)),
          y: Number(jitterY.toFixed(2)),
          z: Number((-c.measurements.vdoMm).toFixed(2))
        },
        vdoMm: c.measurements.vdoMm,
        tiltMLDeg: c.measurements.occlusalTiltMLDeg
      };

      const newRecords = [...c.crRecords, newRecord];
      const points = newRecords.map(r => r.mandibularCentroidPatient);

      // Compute pairwise max distance
      let maxDist = 0;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dz = points[i].z - points[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist > maxDist) maxDist = dist;
        }
      }

      let crStatus: 'ACCEPTED' | 'RETRY' | 'REJECT' = 'ACCEPTED';
      if (maxDist > 1.0) crStatus = 'REJECT';
      else if (maxDist > 0.5) crStatus = 'RETRY';

      return {
        ...c,
        crRecords: newRecords,
        measurements: {
          ...c.measurements,
          crDeviationMm: Number(maxDist.toFixed(2)),
          crStatus
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
        crDeviationMm: 0,
        crStatus: 'ACCEPTED'
      }
    }));
  };

  // Gothic arch excursion point
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

  const handleSaveGothicParameters = (sci: number, bennettL: number, bennettR: number) => {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Clinical Navigation Bar */}
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        patientName={activeCase.name}
        patientId={activeCase.patientId}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenMarkers={() => setIsMarkersOpen(true)}
        onOpenNewPatient={() => setIsNewPatientOpen(true)}
        onOpenDatabase={() => setIsDatabaseOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
      />

      {/* Main Clinical Screen Viewport */}
      <main className="flex-1">
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
          />
        )}

        {activeTab === 'vdo' && (
          <VdoDashboard
            vdoMm={activeCase.measurements.vdoMm}
            onUpdateVdo={handleUpdateVdo}
            biometrics={activeCase.biometrics}
            vdrMm={vdrMm}
            onUpdateVdr={setVdrMm}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'cr' && (
          <CrRecorder
            records={activeCase.crRecords}
            onAddRecord={handleAddCrRecord}
            onClearRecords={handleClearCrRecords}
            currentMandibularPos={{
              x: activeCase.measurements.midlineShiftMm,
              y: 0,
              z: -activeCase.measurements.vdoMm
            }}
            vdoMm={activeCase.measurements.vdoMm}
          />
        )}

        {activeTab === 'gothic' && (
          <GothicArchTracer
            points={activeCase.gothicArchPoints}
            onAddPoint={handleAddGothicPoint}
            onClearPoints={handleClearGothicPoints}
            onSaveParameters={handleSaveGothicParameters}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'facial' && (
          <FacialAnalysisView
            biometrics={activeCase.biometrics}
            vdoMm={activeCase.measurements.vdoMm}
            crDeviationMm={activeCase.measurements.crDeviationMm}
            onSelectShade={handleSelectShade}
          />
        )}

        {activeTab === 'articulator' && (
          <VirtualArticulator3D
            patientCase={activeCase}
            onUpdateArticulatorType={(type) => {
              updateActiveCase(c => ({ ...c, articulator: type }));
            }}
          />
        )}

        {activeTab === 'validation' && (
          <ValidationSuite />
        )}
      </main>

      {/* Modals */}
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
          setActiveTab(tab);
          setIsManualOpen(false);
        }}
      />
    </div>
  );
}
