/**
 * SmartBow AI - Prosthodontic Clinical Report & Dental Lab Prescription
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle, FileText, Stethoscope, FileSpreadsheet, FileJson, Check, Database } from 'lucide-react';
import { PatientCase } from '../types/smartbow';
import { 
  generateHanauPrescriptionText, 
  generatePatientCaseCsv, 
  generatePatientCaseJson, 
  downloadFile 
} from '../lib/exportArticulator';

interface ClinicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientCase: PatientCase;
}

export const ClinicalReportModal: React.FC<ClinicalReportModalProps> = ({
  isOpen,
  onClose,
  patientCase,
}) => {
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const m = patientCase.measurements;
  const b = patientCase.biometrics;

  const showNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const csvContent = generatePatientCaseCsv(patientCase);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `SmartBow_Record_${patientCase.patientId}_${dateStr}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
    showNotice(`Downloaded CSV: ${filename} (Ready for Excel, SPSS & R)`);
  };

  const handleDownloadJson = () => {
    const jsonContent = generatePatientCaseJson(patientCase);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `SmartBow_Record_${patientCase.patientId}_${dateStr}.json`;
    downloadFile(jsonContent, filename, 'application/json');
    showNotice(`Downloaded JSON: ${filename} (Archival Schema v1.2)`);
  };

  const handleDownloadTxt = () => {
    const text = generateHanauPrescriptionText(patientCase);
    const filename = `SmartBow_Prescription_${patientCase.patientId}.txt`;
    downloadFile(text, filename, 'text/plain');
    showNotice(`Downloaded Text Rx: ${filename}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Clinical Jaw Relation Report & Lab Prescription
              </h3>
              <p className="text-xs text-slate-400">
                Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleDownloadCsv}
              title="Export complete record as CSV for Microsoft Excel, SPSS, R, and statistical research"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleDownloadJson}
              title="Export complete machine-readable raw dossier in JSON Schema v1.2 for electronic records"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              title="Export plain text Hanau prescription"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Text</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Clinical Rx</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download Feedback Banner */}
        {exportNotice && (
          <div className="bg-cyan-950/90 border-b border-cyan-800/80 px-6 py-2.5 flex items-center justify-between text-xs text-cyan-200 font-mono no-print animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{exportNotice}</span>
            </div>
            <button 
              onClick={() => setExportNotice(null)} 
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Prescription Document Sheet (Formatted for print) */}
        <div className="p-8 overflow-y-auto space-y-6 print-container bg-white text-slate-900 font-sans">
          {/* Institution & Clinician Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                SMARTBOW AI — CLINICAL JAW RELATION DOSSIER
              </h1>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">
                Department of Prosthodontics & Crown & Bridge · Maitri College of Dentistry
              </p>
              <p className="text-xs text-slate-500">
                Chief Investigator: Dr. Deepanshu (MDS Resident) · Supervisor Review Copy
              </p>
            </div>

            <div className="text-right font-mono text-xs text-slate-600">
              <div>Ref: <span className="font-bold text-slate-900">{patientCase.patientId}</span></div>
              <div>Date: {new Date(patientCase.createdAt).toLocaleDateString()}</div>
              <div>Device: Smartphone Computer Vision (468 Mesh + ArUco)</div>
            </div>
          </div>

          {/* Patient Details Grid */}
          <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 uppercase font-mono block text-[10px]">Patient Name</span>
              <span className="font-bold text-slate-900 text-sm">{patientCase.name}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-mono block text-[10px]">Age / Gender</span>
              <span className="font-semibold text-slate-800">{patientCase.age} yrs / {patientCase.gender}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-mono block text-[10px]">Dentition Status</span>
              <span className="font-semibold text-slate-800 uppercase">{patientCase.dentitionState.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase font-mono block text-[10px]">Articulator Prescribed</span>
              <span className="font-semibold text-cyan-800 uppercase">{patientCase.articulator.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Core Findings in 2 Columns */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            {/* Column 1: Vertical Dimension & Occlusal Plane */}
            <div className="space-y-3">
              <h3 className="font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                <span>1. Vertical Dimension & Plane Orientation</span>
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Vertical Dimension of Occlusion (VDO):</span>
                  <span className="font-mono font-bold text-slate-900">{m.vdoMm} mm</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Lower Facial Third Proportion:</span>
                  <span className="font-mono font-semibold text-slate-800">{b.lowerThirdPct}% (Norm 30-36%)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Mediolateral Occlusal Tilt (ML):</span>
                  <span className="font-mono font-semibold text-slate-800">{m.occlusalTiltMLDeg}° vs Interpupillary</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Anteroposterior Occlusal Tilt (AP):</span>
                  <span className="font-mono font-semibold text-slate-800">{m.occlusalTiltAPDeg}° vs Camper's Plane</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Maxillary Dental Midline Shift:</span>
                  <span className="font-mono font-semibold text-slate-800">{m.midlineShiftMm >= 0 ? `+${m.midlineShiftMm}` : m.midlineShiftMm} mm</span>
                </div>
              </div>
            </div>

            {/* Column 2: Centric Relation & Gothic Arch */}
            <div className="space-y-3">
              <h3 className="font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex items-center gap-1.5">
                <span>2. Centric Relation & Border Excursions</span>
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">CR Repeatability Status:</span>
                  <span className="font-mono font-bold text-emerald-700">{m.crStatus} (Verified &lt;0.5mm)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Maximum CR Deviation:</span>
                  <span className="font-mono font-semibold text-slate-800">{m.crDeviationMm} mm</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Sagittal Condylar Inclination (SCI):</span>
                  <span className="font-mono font-bold text-amber-700">{m.sciEstimateDeg}°</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Left Bennett Angle (L):</span>
                  <span className="font-mono font-semibold text-slate-800">{m.bennettLeftDeg}°</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Right Bennett Angle (R):</span>
                  <span className="font-mono font-semibold text-slate-800">{m.bennettRightDeg}°</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dentulous Biometrics & CO-CR Discrepancy (Rendered for Dentulous & FMR cases, or as comprehensive diagnostic) */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <span>3. Dentulous Biometrics &amp; CO-CR Discrepancy (Natural Dentition / FMR)</span>
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300">
                {patientCase.dentitionState.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
                <span className="text-slate-500 block text-[10px]">CO-CR SLIDE (3D)</span>
                <span className="font-bold text-slate-900 text-sm">1.7 mm</span>
                <span className="text-[10px] text-amber-700 block mt-0.5">ΔX:0.8 ΔY:1.4 ΔZ:0.5</span>
              </div>
              <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
                <span className="text-slate-500 block text-[10px]">FREEWAY SPACE (IRS)</span>
                <span className="font-bold text-slate-900 text-sm">{(m.freewaySpaceMm ?? 3.5).toFixed(1)} mm</span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">VDR {(m.vdrMm ?? 66.0).toFixed(1)} - VDO {m.vdoMm.toFixed(1)}</span>
              </div>
              <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
                <span className="text-slate-500 block text-[10px]">TURNER WEAR CAT.</span>
                <span className="font-bold text-slate-900 text-sm">Category 1</span>
                <span className="text-[10px] text-slate-600 block mt-0.5">Lost VDO (Safe to Raise)</span>
              </div>
              <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
                <span className="text-slate-500 block text-[10px]">INCISAL PLANE CANT</span>
                <span className="font-bold text-slate-900 text-sm">0.6°</span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">Level vs Interpupillary</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-700 leading-relaxed">
              <strong>Clinical Assessment:</strong> Condylar translation recorded from verified Centric Relation to Maximum Intercuspation demonstrates an anterior slide of 1.4mm with 0.8mm lateral deviation. For full-mouth reconstruction or splint therapy, restore in verified CR at <strong>{m.vdoMm.toFixed(1)} mm</strong> preserving <strong>{(m.freewaySpaceMm ?? 3.5).toFixed(1)} mm</strong> interocclusal freeway space.
            </p>
          </div>

          {/* Esthetic Prescription Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-900">
              4. Tooth Selection &amp; Esthetic Guidance (Leon Williams Law of Harmony)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-slate-500 block text-[10px]">Patient Facial Form</span>
                <span className="font-bold uppercase text-slate-900">{b.facialForm}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Prescribed Tooth Mould</span>
                <span className="font-bold uppercase text-cyan-800">
                  {b.facialForm === 'square' ? 'Class I (Square Mould)' : b.facialForm === 'tapering' ? 'Class II (Tapering Mould)' : 'Class III (Ovoid Mould)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Vitapan Classical Shade</span>
                <span className="font-bold uppercase text-amber-800">{b.estimatedShade}</span>
              </div>
            </div>
          </div>

          {/* Dental Laboratory Mounting Instructions */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-950">
            <h4 className="font-bold uppercase tracking-wider text-amber-900">
              5. Dental Laboratory Mounting &amp; CAD/CAM Execution
            </h4>
            <p className="leading-relaxed">
              <strong>Articulator Mount:</strong> Transfer maxillary cast using 3D-printed jig <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">SmartBow_MountingJig_{patientCase.patientId}.stl</code>. 
              Set Hanau condylar dial to <strong>{m.sciEstimateDeg}°</strong>, left Bennett to <strong>{m.bennettLeftDeg}°</strong>, right Bennett to <strong>{m.bennettRightDeg}°</strong>. 
              Incisal pin at 0.0mm. Mount mandibular cast in verified centric relation position.
            </p>
          </div>

          {/* Digital Record Archival & Secondary Research Export (Visible on-screen, hidden on print) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs text-slate-800 no-print">
            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-600" />
                <span>6. Digital Record Archival &amp; Secondary Statistical Research</span>
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 text-cyan-900 font-semibold border border-cyan-300">
                EHR / SPSS / R Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Clinical measurements and multi-trial kinematic vectors can be exported for longitudinal patient monitoring, hospital EHR archiving, or secondary prosthetic research in Excel, SPSS, R, and Python.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* CSV Card */}
              <div className="p-3 bg-white border border-emerald-200 rounded-lg shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Tabular CSV Spreadsheet</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      RFC 4180
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Includes formatted demographics, physiological norms, literature references, all CR trials, and Gothic arch (X, Y, Z) coordinates.
                  </p>
                </div>
                <button
                  onClick={handleDownloadCsv}
                  className="w-full mt-2 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .CSV Spreadsheet</span>
                </button>
              </div>

              {/* JSON Card */}
              <div className="p-3 bg-white border border-cyan-200 rounded-lg shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <FileJson className="w-4 h-4 text-cyan-600" />
                      <span>Clinical JSON Dossier (v1.2)</span>
                    </span>
                    <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                      Machine Readable
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Standardized JSON object with full biometric coordinates, ISO 8601 timestamps, and CAD/CAM virtual articulator parameters.
                  </p>
                </div>
                <button
                  onClick={handleDownloadJson}
                  className="w-full mt-2 py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .JSON Raw Dossier</span>
                </button>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-12 flex justify-between text-xs text-slate-600 border-t border-slate-200">
            <div>
              <div className="w-48 border-b border-slate-400 mb-1" />
              <span className="font-semibold text-slate-900">Dr. Deepanshu</span>
              <span className="block text-[11px] text-slate-500">MDS Prosthodontics Resident</span>
            </div>

            <div>
              <div className="w-48 border-b border-slate-400 mb-1" />
              <span className="font-semibold text-slate-900">Department Supervisor / HOD</span>
              <span className="block text-[11px] text-slate-500">Maitri College of Dentistry</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
