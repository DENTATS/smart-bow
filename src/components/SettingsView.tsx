/**
 * SmartBow AI - Settings & Tools Suite
 * Clean access to calibration, marker sheets, validation, user manual, and developer mode.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React from 'react';
import { 
  Camera, 
  Printer, 
  ShieldCheck, 
  BookOpen, 
  Database, 
  Code, 
  RotateCcw, 
  Sliders, 
  Check, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { CameraCalibrationSettings } from '../types/smartbow';

interface SettingsViewProps {
  onOpenCalibration: () => void;
  onOpenMarkers: () => void;
  onOpenValidation: () => void;
  onOpenManual: () => void;
  onOpenDatabase: () => void;
  developerMode: boolean;
  onToggleDeveloperMode: (val: boolean) => void;
  onResetCaseData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onOpenCalibration,
  onOpenMarkers,
  onOpenValidation,
  onOpenManual,
  onOpenDatabase,
  developerMode,
  onToggleDeveloperMode,
  onResetCaseData,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          System Settings &amp; Clinical Tools
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Optical calibration, physical printout sheets, academic defense suite, and developer telemetry.
        </p>
      </div>

      {/* Optical & Physical Tools */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Optical Hardware &amp; Fabrication
        </h2>

        <div className="divide-y divide-slate-100">
          {/* Printable Markers */}
          <button
            onClick={onOpenMarkers}
            className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  DIN A4 Marker Sheet &amp; 3D STL Carrier Plates
                </h3>
                <p className="text-xs text-slate-500">
                  1:1 scale DIN A4 print sheet with 100mm Vernier caliper bar &amp; 18x18mm ArUco plates
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </button>

          {/* Camera Calibration */}
          <button
            onClick={onOpenCalibration}
            className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Camera Intrinsics &amp; Distance Calibration
                </h3>
                <p className="text-xs text-slate-500">
                  Pinhole model (fx, fy, cx, cy), focal length tuning &amp; IPD reference scaling
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </button>

          {/* Patient Database */}
          <button
            onClick={onOpenDatabase}
            className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Patient Records &amp; Case Management
                </h3>
                <p className="text-xs text-slate-500">
                  Manage patient cases, export backups, and switch active clinical profiles
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>
      </div>

      {/* Academic Defense & Literature */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Evidence, Literature &amp; Verification
        </h2>

        <div className="divide-y divide-slate-100">
          {/* Validation Suite */}
          <button
            onClick={onOpenValidation}
            className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Academic Defense &amp; Validation Suite
                </h3>
                <p className="text-xs text-slate-500">
                  Run 86 unit verification tests, audit synthetic data containment &amp; safety gates
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </button>

          {/* User Manual */}
          <button
            onClick={onOpenManual}
            className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Clinical User Manual &amp; SOP
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive standard operating procedure and citations (Boucher, Winkler, Dawson)
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>
      </div>

      {/* Developer Mode & Advanced Diagnostics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Developer Mode &amp; Diagnostics
        </h2>

        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Code className="w-4 h-4 text-slate-600" />
              <span>Enable Developer Diagnostics Mode</span>
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              Shows engineering HUD, real-time FPS, raw XYZ coordinate telemetry, facial mesh wireframe, and IRE photometrics on the camera viewfinder.
            </p>
          </div>
          <button
            onClick={() => onToggleDeveloperMode(!developerMode)}
            className={`min-h-[44px] min-w-[56px] px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              developerMode
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {developerMode ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Reset Demonstration Data</h3>
            <p className="text-xs text-slate-500">Reverts all active case parameters to baseline clinical norms</p>
          </div>
          <button
            onClick={onResetCaseData}
            className="min-h-[44px] px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
