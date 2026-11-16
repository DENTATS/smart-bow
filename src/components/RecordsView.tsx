/**
 * SmartBow AI - Module 5 & 6: Unified Clinical Records & Jaw Relation Workspace
 * Clean segmented access to Maxilla, Mandible, VDO, CR, Gothic Arch, 3D Articulator,
 * Consolidated Measurement Telemetry Dashboard, and Facial Analysis.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { 
  Layers, 
  CheckCircle2, 
  Compass, 
  Box, 
  Smile, 
  ArrowLeft, 
  Camera, 
  FileText, 
  RotateCcw, 
  Activity 
} from 'lucide-react';
import { VdoDashboard } from './VdoDashboard';
import { CrRecorder } from './CrRecorder';
import { GothicArchTracer } from './GothicArchTracer';
import { VirtualArticulator3D } from './VirtualArticulator3D';
import { FacialAnalysisView } from './FacialAnalysisView';
import { MeasurementDashboard } from './MeasurementDashboard';
import { MaxillaMandibleWorkflow } from './MaxillaMandibleWorkflow';
import { PatientCase, GothicArchPoint } from '../types/smartbow';

export type RecordsSubtab = 
  | 'maxilla' 
  | 'mandible' 
  | 'vdo' 
  | 'cr' 
  | 'gothic' 
  | 'articulator' 
  | 'measurements' 
  | 'facial';

interface RecordsViewProps {
  initialSubtab?: RecordsSubtab;
  patientCase: PatientCase;
  vdrMm: number;
  onUpdateVdr: (vdr: number) => void;
  onUpdateVdo: (vdo: number) => void;
  onUpdateTiltML?: (tilt: number) => void;
  onUpdateTiltAP?: (tilt: number) => void;
  onUpdateMidline?: (shift: number) => void;
  onRecordCrTrial: () => void;
  onClearCrRecords: () => void;
  onAddGothicPoint: (pt: GothicArchPoint) => void;
  onClearGothicPoints: () => void;
  onSaveGothicParameters: (sci: number | null, bennettL: number | null, bennettR: number | null) => void;
  onSelectShade: (shade: string) => void;
  onUpdateArticulatorType: (type: any) => void;
  onNavigateToTab: (tab: 'home' | 'scanner' | 'records' | 'settings' | 'assessment') => void;
  onOpenReport: () => void;
  onEditPatient?: () => void;
}

export const RecordsView: React.FC<RecordsViewProps> = ({
  initialSubtab = 'vdo',
  patientCase,
  vdrMm,
  onUpdateVdr,
  onUpdateVdo,
  onUpdateTiltML = () => {},
  onUpdateTiltAP = () => {},
  onUpdateMidline = () => {},
  onRecordCrTrial,
  onClearCrRecords,
  onAddGothicPoint,
  onClearGothicPoints,
  onSaveGothicParameters,
  onSelectShade,
  onUpdateArticulatorType,
  onNavigateToTab,
  onOpenReport,
  onEditPatient,
}) => {
  const [activeSubtab, setActiveSubtab] = useState<RecordsSubtab>(initialSubtab);

  const subtabs: { id: RecordsSubtab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'maxilla', label: 'Maxilla Plane', icon: RotateCcw },
    { id: 'mandible', label: 'Mandible Relation', icon: Layers },
    { id: 'vdo', label: 'VDO Checkpoints', icon: Layers },
    { id: 'cr', label: 'Centric Relation', icon: CheckCircle2 },
    { id: 'gothic', label: 'Gothic Arch', icon: Compass },
    { id: 'measurements', label: 'Telemetry Matrix', icon: Activity },
    { id: 'articulator', label: '3D Articulator', icon: Box },
    { id: 'facial', label: 'Facial Form', icon: Smile },
  ];

  return (
    <div className="min-h-full flex flex-col bg-slate-900 text-slate-100">
      {/* Subnavigation Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateToTab('home')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Return to Home Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-300 hidden sm:inline">Jaw Relation:</span>
        </div>

        {/* Clean Segmented Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto shrink-0">
          {subtabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubtab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubtab(tab.id)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateToTab('scanner')}
            className="min-h-[38px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open Live Scanner"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">Scanner</span>
          </button>
          <button
            onClick={onOpenReport}
            className="min-h-[38px] px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rx</span>
          </button>
        </div>
      </div>

      {/* Main Records Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeSubtab === 'maxilla' && (
          <MaxillaMandibleWorkflow
            patientCase={patientCase}
            stage="MAXILLA"
            onUpdateTiltML={onUpdateTiltML}
            onUpdateTiltAP={onUpdateTiltAP}
            onUpdateMidline={onUpdateMidline}
            onNavigateToTab={onNavigateToTab}
            onNavigateToSubtab={(sub) => setActiveSubtab(sub as RecordsSubtab)}
          />
        )}

        {activeSubtab === 'mandible' && (
          <MaxillaMandibleWorkflow
            patientCase={patientCase}
            stage="MANDIBLE"
            onUpdateTiltML={onUpdateTiltML}
            onUpdateTiltAP={onUpdateTiltAP}
            onUpdateMidline={onUpdateMidline}
            onNavigateToTab={onNavigateToTab}
            onNavigateToSubtab={(sub) => setActiveSubtab(sub as RecordsSubtab)}
          />
        )}

        {activeSubtab === 'vdo' && (
          <VdoDashboard
            vdoMm={patientCase.measurements.vdoMm}
            onUpdateVdo={onUpdateVdo}
            biometrics={patientCase.biometrics}
            vdrMm={vdrMm}
            onUpdateVdr={onUpdateVdr}
            onNavigateToTab={(t) => {
              if (t === 'scanner') onNavigateToTab('scanner');
              else if (['vdo', 'cr', 'gothic', 'facial', 'articulator'].includes(t)) {
                setActiveSubtab(t as RecordsSubtab);
              }
            }}
          />
        )}

        {activeSubtab === 'cr' && (
          <CrRecorder
            records={patientCase.crRecords}
            onAddRecord={onRecordCrTrial}
            onClearRecords={onClearCrRecords}
            currentMandibularPos={{
              x: patientCase.measurements.midlineShiftMm ?? 0,
              y: 0,
              z: -(patientCase.measurements.vdoMm ?? 62.5)
            }}
            vdoMm={patientCase.measurements.vdoMm}
          />
        )}

        {activeSubtab === 'gothic' && (
          <GothicArchTracer
            points={patientCase.gothicArchPoints}
            onAddPoint={onAddGothicPoint}
            onClearPoints={onClearGothicPoints}
            onSaveParameters={onSaveGothicParameters}
            onNavigateToTab={(t) => {
              if (t === 'scanner') onNavigateToTab('scanner');
              else if (['vdo', 'cr', 'gothic', 'facial', 'articulator'].includes(t)) {
                setActiveSubtab(t as RecordsSubtab);
              }
            }}
          />
        )}

        {activeSubtab === 'measurements' && (
          <MeasurementDashboard
            patientCase={patientCase}
            isCalibrated={patientCase.calibrationStatus === 'CALIBRATED'}
            onOpenReport={onOpenReport}
            onNavigateToSubtab={(sub) => setActiveSubtab(sub as RecordsSubtab)}
          />
        )}

        {activeSubtab === 'articulator' && (
          <VirtualArticulator3D
            patientCase={patientCase}
            onUpdateArticulatorType={onUpdateArticulatorType}
          />
        )}

        {activeSubtab === 'facial' && (
          <FacialAnalysisView
            patientCase={patientCase}
            biometrics={patientCase.biometrics}
            vdoMm={patientCase.measurements.vdoMm}
            crDeviationMm={patientCase.measurements.crDeviationMm}
            onSelectShade={onSelectShade}
            onEditPatient={onEditPatient}
          />
        )}
      </div>
    </div>
  );
};
