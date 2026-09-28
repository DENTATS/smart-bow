/**
 * SmartBow AI - Patient Database Modal
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React from 'react';
import { X, Database, User, Calendar, Trash2, Check, ArrowRight } from 'lucide-react';
import { PatientCase } from '../types/smartbow';

interface PatientDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: PatientCase[];
  activeCaseId: string;
  onSelectCase: (patientId: string) => void;
  onDeleteCase: (patientId: string) => void;
  onOpenNewCase: () => void;
}

export const PatientDatabaseModal: React.FC<PatientDatabaseModalProps> = ({
  isOpen,
  onClose,
  cases,
  activeCaseId,
  onSelectCase,
  onDeleteCase,
  onOpenNewCase,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">Patient Record Registry</h3>
              <p className="text-xs text-slate-400">Local clinical database · MDS Department Archive</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenNewCase();
              }}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              + New Case
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of Patient Cases */}
        <div className="p-6 overflow-y-auto divide-y divide-slate-800">
          {cases.map((c) => {
            const isActive = c.patientId === activeCaseId;
            return (
              <div
                key={c.patientId}
                className={`py-4 flex items-center justify-between gap-4 transition-colors ${isActive ? 'bg-cyan-500/5 -mx-6 px-6' : ''}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{c.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                      {c.patientId}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>{c.age}y / {c.gender}</span>
                    <span>·</span>
                    <span>VDO: {c.measurements.vdoMm}mm</span>
                    <span>·</span>
                    <span>SCI: {c.measurements.sciEstimateDeg}°</span>
                    <span>·</span>
                    <span>CR: {c.measurements.crStatus}</span>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Created: {new Date(c.createdAt).toLocaleDateString()} · {c.articulator}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={() => {
                        onSelectCase(c.patientId);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Load</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {cases.length > 1 && (
                    <button
                      onClick={() => onDeleteCase(c.patientId)}
                      title="Delete Record"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
