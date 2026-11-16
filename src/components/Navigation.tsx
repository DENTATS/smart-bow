/**
 * SmartBow AI - Responsive Navigation (Desktop Top Bar + Mobile Bottom Bar)
 * Conforms to Top Bar Contract and Mobile Touch-First Thumb Zone Ergonomics.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React from 'react';
import { 
  Home, 
  Camera, 
  FolderKanban, 
  Settings, 
  FileText, 
  Smile, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';

export type MainNavTab = 'home' | 'assessment' | 'scanner' | 'records' | 'settings';

interface NavigationProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  patientId: string;
  patientName: string;
  onOpenReport: () => void;
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
  onEditPatient,
  isSimulated = true,
  onLaunchTour,
  onToggleDemoMode,
}) => {
  const navItems: { id: MainNavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'assessment', label: 'Assessment', icon: Smile },
    { id: 'scanner', label: 'Scanner', icon: Camera },
    { id: 'records', label: 'Jaw Relation', icon: FolderKanban },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Top Bar Contract: [Wordmark] — [5 single-line links] — [Mode Pill + Tour + Patient + Primary CTA] */}
      <header className="hidden md:flex items-center justify-between gap-6 px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              SB
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                SmartBow AI
              </span>
              <span className="text-[11px] text-slate-500 block -mt-0.5">
                Clinical Prosthodontics
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Single-line Nav Links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`min-h-[42px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-100 text-teal-800 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Provenance Pill + Tour CTA + Patient + Primary CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Persistent Live vs. Demo Mode Indicator */}
          <button
            onClick={onToggleDemoMode}
            title="Click to toggle Demo vs. Live Session Mode"
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isSimulated
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSimulated ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span>{isSimulated ? 'DEMO' : 'LIVE'}</span>
          </button>

          {/* 4-Day Presentation Tour Button */}
          {onLaunchTour && (
            <button
              onClick={onLaunchTour}
              className="min-h-[40px] px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Launch 4-Day Presentation Tour"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Tour</span>
            </button>
          )}

          {/* Patient Details Pill */}
          {onEditPatient ? (
            <button
              onClick={onEditPatient}
              title="Click to Edit Patient Details"
              className="text-right text-xs p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer group"
            >
              <span className="text-slate-900 font-semibold block group-hover:text-teal-700 transition-colors">
                {patientName} ✎
              </span>
              <span className="text-slate-500 font-mono text-[11px] block">{patientId}</span>
            </button>
          ) : (
            <div className="text-right text-xs">
              <span className="text-slate-900 font-semibold block">{patientName}</span>
              <span className="text-slate-500 font-mono text-[11px]">{patientId}</span>
            </div>
          )}

          {/* Clinical Lab Rx CTA */}
          <button
            onClick={onOpenReport}
            className="min-h-[40px] px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Clinical Rx</span>
          </button>
        </div>
      </header>

      {/* Mobile Top Header (Minimal Touch Bar) */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        <button
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
            SB
          </div>
          <span className="text-sm font-bold text-slate-900">SmartBow</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Demo/Live pill on mobile */}
          <button
            onClick={onToggleDemoMode}
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
              isSimulated
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            {isSimulated ? 'DEMO' : 'LIVE'}
          </button>

          {onLaunchTour && (
            <button
              onClick={onLaunchTour}
              className="p-1.5 bg-teal-50 text-teal-800 rounded-lg border border-teal-200 cursor-pointer"
              title="Presentation Tour"
            >
              <Sparkles className="w-4 h-4 text-teal-600" />
            </button>
          )}

          {onEditPatient ? (
            <button
              onClick={onEditPatient}
              className="text-right text-xs p-1 rounded hover:bg-slate-100 cursor-pointer"
              title="Edit Patient"
            >
              <span className="text-slate-900 font-semibold block text-[11px] truncate max-w-[90px]">
                {patientName} ✎
              </span>
            </button>
          ) : (
            <div className="text-right text-xs">
              <span className="text-slate-900 font-semibold block text-[11px] truncate max-w-[90px]">
                {patientName}
              </span>
            </div>
          )}

          <button
            onClick={onOpenReport}
            className="p-2 bg-teal-700 text-white rounded-lg cursor-pointer"
            title="Clinical Rx"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Thumb Zone) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-2 py-1 flex items-center justify-around z-40 no-print shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[48px] flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
