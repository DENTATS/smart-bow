/**
 * TopNav Component - Follows Top Bar Contract (3 Zones)
 * Zone 1: Single element wordmark
 * Zone 2: Navigation items
 * Zone 3: Primary clinical actions
 */

import React from 'react';
import { Camera, Layers, CheckCircle, Compass, Smile, Box, ShieldCheck, Printer, FileText, UserPlus, Database, BookOpen } from 'lucide-react';

export type ActiveTab = 
  | 'scanner'
  | 'vdo'
  | 'cr'
  | 'gothic'
  | 'facial'
  | 'articulator'
  | 'validation';

interface TopNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  patientName: string;
  patientId: string;
  onOpenReport: () => void;
  onOpenMarkers: () => void;
  onOpenNewPatient: () => void;
  onOpenDatabase: () => void;
  onOpenManual: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  patientName,
  patientId,
  onOpenReport,
  onOpenMarkers,
  onOpenNewPatient,
  onOpenDatabase,
  onOpenManual,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'scanner', label: 'Live Scanner', icon: Camera },
    { id: 'vdo', label: 'VDO Checkpoints', icon: Layers },
    { id: 'cr', label: 'Centric Relation', icon: CheckCircle },
    { id: 'gothic', label: 'Gothic Arch', icon: Compass },
    { id: 'facial', label: 'Facial Form', icon: Smile },
    { id: 'articulator', label: '3D Articulator', icon: Box },
    { id: 'validation', label: 'Academic Defense & Validation', icon: ShieldCheck },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-6 py-2.5 flex items-center justify-between no-print">
      {/* Zone 1: Single text wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onSelectTab('scanner')}
          className="text-left group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-cyan-400/20 animate-pulse" />
            <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              SmartBow AI
            </span>
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              · Prosthodontics CAD
            </span>
          </div>
        </button>
      </div>

      {/* Zone 2: Clean text navigation links */}
      <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary Clinical Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenManual}
          title="Clinical User Manual & SOP"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 rounded-md transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">User Manual</span>
        </button>

        <button
          onClick={onOpenMarkers}
          title="Print 18x18mm ArUco Marker Sheets"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span>Print Markers</span>
        </button>

        <button
          onClick={onOpenDatabase}
          title="Patient Database"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors cursor-pointer"
        >
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline font-mono">{patientId}</span>
        </button>

        <button
          onClick={onOpenNewPatient}
          title="New Patient Registration"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">New Case</span>
        </button>

        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md shadow-sm transition-colors cursor-pointer whitespace-nowrap"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Clinical Rx</span>
        </button>
      </div>
    </header>
  );
};
