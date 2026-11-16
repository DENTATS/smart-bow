/**
 * SmartBow AI - Patient Registration & Case Setup
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, UserCheck, Pencil } from 'lucide-react';
import { PatientCase, DentitionState, ArticulatorType } from '../types/smartbow';

interface PatientSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePatient: (newCase: PatientCase) => void;
  patientToEdit?: PatientCase | null;
  existingPatientIds?: string[];
}

export const PatientSetupModal: React.FC<PatientSetupModalProps> = ({
  isOpen,
  onClose,
  onSavePatient,
  patientToEdit,
  existingPatientIds = [],
}) => {
  const isEditing = !!patientToEdit;

  const [customId, setCustomId] = useState<string>('');
  const [name, setName] = useState<string>('Ramesh Sharma');
  const [age, setAge] = useState<number>(64);
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dentitionState, setDentitionState] = useState<DentitionState>('EDENTULOUS');
  const [articulator, setArticulator] = useState<ArticulatorType>('HANAU_WIDE_VUE');
  const [clinicalNotes, setClinicalNotes] = useState<string>('Bilateral edentulous ridges, Class I ridge relationship, requested balanced occlusion complete denture.');
  const [idError, setIdError] = useState<string | null>(null);

  // Helper to generate a collision-free ID
  const generateUniqueId = (): string => {
    let candidate = `SB-${Math.floor(1000 + Math.random() * 9000)}`;
    while (existingPatientIds.includes(candidate)) {
      candidate = `SB-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    return candidate;
  };

  // Sync state whenever modal opens or patientToEdit changes
  useEffect(() => {
    setIdError(null);
    if (patientToEdit) {
      setCustomId(patientToEdit.patientId);
      setName(patientToEdit.name);
      setAge(patientToEdit.age);
      setGender(patientToEdit.gender);
      setDentitionState(patientToEdit.dentitionState);
      setArticulator(patientToEdit.articulator);
      setClinicalNotes(patientToEdit.clinicalNotes || '');
    } else {
      setCustomId(generateUniqueId());
      setName('Ramesh Sharma');
      setAge(64);
      setGender('MALE');
      setDentitionState('EDENTULOUS');
      setArticulator('HANAU_WIDE_VUE');
      setClinicalNotes('Bilateral edentulous ridges, Class I ridge relationship, requested balanced occlusion complete denture.');
    }
  }, [patientToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (patientToEdit) {
      // Preserve existing patient ID, timestamps, biometrics, measurements, and clinical records
      // Guarantee that editing cannot collide with or overwrite another patient
      const updatedCase: PatientCase = {
        ...patientToEdit,
        name: name.trim() || 'Unnamed Patient',
        age: Number(age) || 60,
        gender,
        dentitionState,
        articulator,
        clinicalNotes: clinicalNotes.trim(),
        updatedAt: new Date().toISOString()
      };
      onSavePatient(updatedCase);
    } else {
      const finalId = customId.trim() || generateUniqueId();
      // Ensure the ID does not overwrite another patient
      if (existingPatientIds.includes(finalId)) {
        setIdError(`Case ID "${finalId}" is already assigned to another patient. Please choose a unique ID.`);
        return;
      }
      const newCase: PatientCase = {
        patientId: finalId,
        name: name.trim() || 'Unnamed Patient',
        age: Number(age) || 60,
        gender,
        dentitionState,
        articulator,
        createdAt: new Date().toISOString(),
        dataProvenance: 'UNAVAILABLE',
        biometrics: {
          lowerThirdPct: 33.3,
          bizFaceRatio: 0.70,
          facialForm: 'ovoid',
          interpupillaryTiltDeg: 0.0,
          bizygomaticWidthMm: 135,
          facialHeightMm: 190,
          lipGapMm: 0,
          midlineDeviationMm: 0,
          estimatedShade: 'A2',
          subnasaleToMentonMm: 0
        },
        measurements: {
          provenance: 'UNAVAILABLE',
          vdoMm: null,
          freewaySpaceMm: null,
          vdrMm: null,
          occlusalTiltMLDeg: null,
          occlusalTiltAPDeg: null,
          midlineShiftMm: null,
          crDeviationMm: null,
          crStatus: 'UNAVAILABLE',
          sciEstimateDeg: null,
          bennettAngleDeg: null,
          bennettLeftDeg: null,
          bennettRightDeg: null
        },
        crRecords: [],
        gothicArchPoints: [],
        clinicalNotes: clinicalNotes.trim()
      };
      onSavePatient(newCase);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <UserCheck className="w-5 h-5 text-teal-400" />
            ) : (
              <UserPlus className="w-5 h-5 text-cyan-400" />
            )}
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? 'Edit Patient Case Details' : 'New Patient Registration'}
              </h3>
              {isEditing && (
                <span className="text-[11px] font-mono text-cyan-400">
                  Case ID: {patientToEdit.patientId} · Preserving Measurements
                </span>
              )}
            </div>
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
          {idError && (
            <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold text-xs">
              {idError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-slate-300 font-medium block mb-1">
                Case ID {isEditing ? '(Locked)' : '(Auto/Custom)'}
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={customId}
                onChange={(e) => {
                  setCustomId(e.target.value.toUpperCase());
                  setIdError(null);
                }}
                className={`w-full font-mono rounded-lg p-2.5 text-white border ${
                  isEditing
                    ? 'bg-slate-900 border-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-950 border-slate-700 focus:border-cyan-500'
                }`}
                placeholder="SB-XXXX"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-medium block mb-1">Patient Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-cyan-500"
              />
            </div>
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
              <span>{isEditing ? 'Save Patient Changes' : 'Initialize Clinical Case'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
