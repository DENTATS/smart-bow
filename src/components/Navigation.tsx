/**
 * SmartBow AI — Unified Navigation Bar
 *
 * Per Phase 1D Simplification:
 * - Single navigation component (`TopNav.tsx` duplicate removed).
 * - Default primary screen: Live Scanner.
 * - All other clinical modules (Dashboard, Facial Assessment, Jaw Relation / VDO / CR / Gothic Arch / 3D Articulator,
 *   Settings & Validation, Printable Markers, Patient Database, Clinical Rx) live under the "More" menu
 *   so no clinical feature or patient record workflow is lost.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Camera,
  FolderKanban,
  Settings,
  FileText,
  Smile,
  ChevronDown,
  Printer,
  Database,
  BookOpen,
  MoreHorizontal,
} from 'lucide-react';

export type MainNavTab = 'home' | 'assessment' | 'scanner' | 'records' | 'settings';

interface NavigationProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  patientId: string;
  patientName: string;
  onOpenReport: () => void;
  onOpenMarkers?: () => void;
  onOpenDatabase?: () => void;
  onOpenManual?: () => void;
  onEditPatient?: () => void;
  isSimulated?: boolean;
  onLaunchTour?: () => void;
  onToggleDemoMode?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  patientId,
  patientName,
  onOpenReport,
  onOpenMarkers,
  onOpenDatabase,
  onOpenManual,
  onEditPatient,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const moreTabs: { id: MainNavTab; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Patient Dashboard', desc: 'Cases, status & overview', icon: Home },
    { id: 'assessment', label: 'Facial Assessment', desc: 'Proportions & tooth shade', icon: Smile },
    { id: 'records', label: 'Jaw Relation & Articulator', desc: 'VDO, CR, Gothic Arch & 3D Articulator', icon: FolderKanban },
    { id: 'settings', label: 'Settings & Roadmap', desc: 'Calibration, validation & system config', icon: Settings },
  ];

  const activeMoreItem = moreTabs.find((t) => t.id === activeTab);

  return (
    <header className="flex items-center justify-between gap-3 px-4 md:px-6 py-2.5 bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 no-print">
      {/* Zone 1: Wordmark -> Returns to Live Scanner */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => onSelectTab('scanner')}
          className="flex items-center gap-2 text-left group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-sm">
            SB
          </div>
          <div>
            <span className="text-sm md:text-base font-bold text-white group-hover:text-teal-400 transition-colors">
              SmartBow AI
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:block -mt-0.5">
              Optical Jaw Relation Scanner
            </span>
          </div>
        </button>
      </div>

      {/* Zone 2: Primary "Live Scanner" Tab + "More" Menu */}
      <nav className="flex items-center gap-1.5">
        <button
          onClick={() => onSelectTab('scanner')}
          className={`min-h-[38px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'scanner'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Live Scanner</span>
        </button>

        {/* "More" Dropdown containing all secondary tabs and clinical utilities */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border ${
              activeTab !== 'scanner'
                ? 'bg-slate-800 text-cyan-300 border-cyan-500/50 font-bold'
                : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span>{activeMoreItem ? `More: ${activeMoreItem.label}` : 'More'}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-75" />
          </button>

          {moreOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Clinical Modules
              </div>
              {moreTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      setMoreOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-slate-800 transition-colors cursor-pointer ${
                      isActive ? 'bg-slate-800/90 text-teal-300 font-bold' : 'text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 text-teal-400 shrink-0" />
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>
                  </button>
                );
              })}

              <div className="my-1.5 border-t border-slate-800" />
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Tools &amp; Exports
              </div>

              {onOpenMarkers && (
                <button
                  onClick={() => {
                    onOpenMarkers();
                    setMoreOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Print ArUco Marker Sheet (A4 PDF)</span>
                </button>
              )}

              {onOpenDatabase && (
                <button
                  onClick={() => {
                    onOpenDatabase();
                    setMoreOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <Database className="w-4 h-4 text-teal-400" />
                  <span>Patient Cases Database</span>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenReport();
                  setMoreOpen(false);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Clinical Prescription Report (Rx)</span>
              </button>

              {onOpenManual && (
                <button
                  onClick={() => {
                    onOpenManual();
                    setMoreOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Help &amp; Clinical User Manual</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Zone 3: Active Patient Pill */}
      <div className="flex items-center gap-2 shrink-0">
        {onEditPatient ? (
          <button
            onClick={onEditPatient}
            title="Edit Active Patient Details"
            className="text-right text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
          >
            <span className="text-slate-100 font-semibold block truncate max-w-[120px] sm:max-w-[160px]">
              {patientName} ✎
            </span>
            <span className="text-slate-400 font-mono text-[10px] block">{patientId}</span>
          </button>
        ) : (
          <div className="text-right text-xs px-2 py-1">
            <span className="text-slate-100 font-semibold block">{patientName}</span>
            <span className="text-slate-400 font-mono text-[10px]">{patientId}</span>
          </div>
        )}
      </div>
    </header>
  );
};
