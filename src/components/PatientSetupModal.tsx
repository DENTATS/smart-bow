/**
 * SmartBow AI - Patient Registration & Case Setup
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { X, UserPlus, Check } from 'lucide-react';
import { PatientCase, DentitionState, ArticulatorType } from '../types/smartbow';

interface PatientSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePatient: (newCase: PatientCase) => void;
}

export const PatientSetupModal: React.FC<PatientSetupModalProps> = ({
  isOpen,
  onClose,
  onSavePatient,
}) => {
  const [name, setName] = useState<string>('Ramesh Sharma');
  const [age, setAge] = useState<number>(64);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dentitionState, setDentitionState] = useState<DentitionState>('EDENTULOUS');
  const [articulator, setArticulator] = useState<ArticulatorType>('HANAU_WIDE_VUE');
  const [clinicalNotes, setClinicalNotes] = useState<string>('Bilateral edentulous ridges, Class I ridge relationship, requested balanced occlusion complete denture.');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCase: PatientCase = {
      patientId: `SB-${Math.floor(1000 + Math.random() * 9000)}`,
      name,
      age,
      gender,
      dentitionState,
      articulator,
      createdAt: new Date().toISOString(),
      biometrics: {
        lowerThirdPct: 33.2,
        bizFaceRatio: 0.71,
        facialForm: 'square',
        interpupillaryTiltDeg: 0.8,
        bizygomaticWidthMm: 138,
        facialHeightMm: 194,
        lipGapMm: 2.1,
        midlineDeviationMm: 0.2,
        estimatedShade: 'A2',
        subnasaleToMentonMm: 62.5
      },
      measurements: {
        vdoMm: 62.5,
        freewaySpaceMm: 3.5,
        vdrMm: 66.0,
        occlusalTiltMLDeg: 1.2,
        occlusalTiltAPDeg: 4.5,
        midlineShiftMm: 0.2,
        crDeviationMm: 0.28,
        crStatus: 'ACCEPTED',
        sciEstimateDeg: 33.0,
        bennettAngleDeg: 16.0,
        bennettLeftDeg: 16.0,
        bennettRightDeg: 16.0
      },
      crRecords: [],
      gothicArchPoints: [],
      clinicalNotes
    };

    onSavePatient(newCase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">New Patient Registration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-medium block mb-1">Patient Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Age</label>
              <input
                type="number"
                required
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value) || 60)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Dentition State</label>
              <select
                value={dentitionState}
                onChange={(e) => setDentitionState(e.target.value as DentitionState)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="EDENTULOUS">Completely Edentulous (Wax Rims)</option>
                <option value="DENTULOUS">Dentulous (Natural Teeth / Esthetics / TMD)</option>
                <option value="PARTIALLY_EDENTULOUS">Partially Edentulous (Kennedy Class)</option>
                <option value="FULL_MOUTH_REHAB">Full Mouth Rehabilitation (Tooth Wear / Lost VDO)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Articulator Type</label>
              <select
                value={articulator}
                onChange={(e) => setArticulator(e.target.value as ArticulatorType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="HANAU_WIDE_VUE">Hanau Wide-Vue (Semi-adjustable)</option>
                <option value="HANAU_MATE">Hanau Mate</option>
                <option value="ARTEX_CR">Artex CR (Girrbach)</option>
                <option value="WHIP_MIX_2200">Whip Mix 2200 / 3000</option>
                <option value="SAM_3">SAM 3</option>
                <option value="EXOCAD_VIRTUAL">exocad Virtual Articulator</option>
                <option value="3SHAPE_VIRTUAL">3Shape Virtual Articulator</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Clinical Diagnostic Notes</label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Initialize Clinical Case</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
