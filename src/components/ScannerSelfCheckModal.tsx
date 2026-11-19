/**
 * SmartBow AI — Scanner Self-Check Modal Component
 *
 * Displays real measured PASS / WARN / FAIL results from `runScannerSelfCheck`
 * and allows the user to inject deliberately broken inputs (No Camera, Wrong Dictionary
 * DICT_6X6_250, Blank Frame) to verify that the matching check genuinely fails.
 */

import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, RefreshCw, FlaskConical } from 'lucide-react';
import {
  ScannerSelfCheckInput,
  ScannerSelfCheckReport,
  SelfCheckInjectedFault,
  runScannerSelfCheck,
} from '../lib/scannerSelfCheck';

interface ScannerSelfCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkInput: Omit<ScannerSelfCheckInput, 'injectedFault'>;
}

export const ScannerSelfCheckModal: React.FC<ScannerSelfCheckModalProps> = ({
  isOpen,
  onClose,
  checkInput,
}) => {
  const [injectedFault, setInjectedFault] = useState<SelfCheckInjectedFault>('NONE');
  const [report, setReport] = useState<ScannerSelfCheckReport | null>(null);

  const executeCheck = (fault: SelfCheckInjectedFault = injectedFault) => {
    const result = runScannerSelfCheck({
      ...checkInput,
      injectedFault: fault,
    });
    setReport(result);
  };

  useEffect(() => {
    if (isOpen) {
      executeCheck(injectedFault);
    }
  }, [
    isOpen,
    injectedFault,
    checkInput.cameraActive,
    checkInput.videoWidth,
    checkInput.faceModelState.status,
    checkInput.currentAutoFaceDetected,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Live Scanner Self-Check</h3>
              <p className="text-[11px] text-slate-400">
                Real runtime execution — no hardcoded PASS results
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {report && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                  report.overallVerdict === 'PASS'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                    : report.overallVerdict === 'WARN'
                    ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                    : 'bg-rose-950 text-rose-300 border-rose-500/50'
                }`}
              >
                OVERALL: {report.overallVerdict}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Deliberate Fault Injection Bar (verifies negative cases fail) */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test Deliberately Broken Input (Verify FAIL Detection):</span>
              </div>
              <button
                onClick={() => executeCheck(injectedFault)}
                className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-run Checks Now</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-[11px]">
              {[
                { id: 'NONE', label: 'Normal Live Input' },
                { id: 'NO_CAMERA', label: 'No Camera (0×0)' },
                { id: 'WRONG_DICT_6X6', label: 'Wrong Dict (6×6_250)' },
                { id: 'BLANK_FRAME', label: 'Blank Frame' },
                { id: 'STALE_FACE_ON_CAM_STOP', label: 'Stale Face on Stop' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setInjectedFault(opt.id as SelfCheckInjectedFault)}
                  className={`px-2 py-1.5 rounded-lg border text-center transition-colors cursor-pointer ${
                    injectedFault === opt.id
                      ? opt.id === 'NONE'
                        ? 'bg-teal-950 border-teal-500 text-teal-200 font-bold'
                        : 'bg-rose-950 border-rose-500 text-rose-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Check Results List */}
          {report && (
            <div className="space-y-2.5">
              {report.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    item.verdict === 'PASS'
                      ? 'bg-emerald-950/25 border-emerald-800/60'
                      : item.verdict === 'WARN'
                      ? 'bg-amber-950/25 border-amber-800/60'
                      : 'bg-rose-950/30 border-rose-800/70'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {item.verdict === 'PASS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : item.verdict === 'WARN' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="font-bold text-white">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 pl-6">{item.detail}</p>
                    <div className="pl-6 font-mono text-[11px] text-cyan-300">
                      Measured: <span className="font-bold">{item.measuredValue}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold shrink-0 border ${
                      item.verdict === 'PASS'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
                        : item.verdict === 'WARN'
                        ? 'bg-amber-950 text-amber-300 border-amber-600/50'
                        : 'bg-rose-950 text-rose-300 border-rose-600/50'
                    }`}
                  >
                    {item.verdict}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Last run: {report ? new Date(report.timestamp).toLocaleTimeString() : '—'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
