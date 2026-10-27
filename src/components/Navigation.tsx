/**
 * SmartBow AI - Responsive Navigation (Desktop Top Bar + Mobile Bottom Bar)
 * Conforms to Top Bar Contract and Mobile Touch-First Thumb Zone Ergonomics.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React from 'react';
import { Home, Camera, FolderKanban, Settings, FileText, BookOpen, Layers } from 'lucide-react';

export type MainNavTab = 'home' | 'scanner' | 'records' | 'settings';

interface NavigationProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  patientId: string;
  patientName: string;
  onOpenReport: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  patientId,
  patientName,
  onOpenReport,
}) => {
  const navItems: { id: MainNavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'scanner', label: 'Scanner', icon: Camera },
    { id: 'records', label: 'Records', icon: FolderKanban },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Top Bar Contract: [Wordmark] — [4 single-line links] — [1 primary CTA] */}
      <header className="hidden md:flex items-center justify-between gap-8 px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm tracking-tight">
              SB
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                SmartBow AI
              </span>
              <span className="text-xs text-slate-500 block -mt-0.5">
                Clinical Prosthodontics
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: 4 Single-line Nav Links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
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

        {/* Zone 3: 1 Primary CTA Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right text-xs">
            <span className="text-slate-900 font-semibold block">{patientName}</span>
            <span className="text-slate-500 font-mono text-[11px]">{patientId}</span>
          </div>

          <button
            onClick={onOpenReport}
            className="min-h-[44px] px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Clinical Rx</span>
          </button>
        </div>
      </header>

      {/* Mobile Top Header: Compact 48px Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        <button
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2 text-left"
        >
          <div className="w-7 h-7 rounded-md bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
            SB
          </div>
          <span className="text-sm font-bold text-slate-900">
            SmartBow AI
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {patientId}
          </span>
          <button
            onClick={onOpenReport}
            className="p-2 text-slate-600 hover:text-teal-700 rounded-lg hover:bg-slate-100 transition-colors"
            title="Clinical Report"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb Zone) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe no-print"
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center transition-colors cursor-pointer select-none active:scale-95 ${
                  isActive ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className={`p-1 rounded-md transition-colors ${isActive ? 'bg-teal-50' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-teal-800' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
