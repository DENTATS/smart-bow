/**
 * SmartBow AI - 1:1 Scaled ArUco Marker Sheets & Board Cut Guides
 * DICT_4X4_50 marker generator with physical millimeter calibration ruler.
 * Validated OpenCV ArUco bit polarity & CAD array specifications.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { X, Printer, Download, Check, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { 
  ARUCO_MARKERS_REGISTRY, 
  getFullMarkerGrid, 
  renderBoardSvg, 
  renderFullA4PrintSheetSvg, 
  CAD_BOARD_SPECIFICATION 
} from '../lib/arucoDict';
import { generateMarkerCarrierPlateStl } from '../lib/stlGenerator';
import { SOURCED_RIM_DATUMS } from '../lib/prosthodonticLiterature';

interface PrintableMarkersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrintableMarkersModal: React.FC<PrintableMarkersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [caliperMeasurementMm, setCaliperMeasurementMm] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smartbow_measured_scale_mm') || '100.0';
    }
    return '100.0';
  });
  const [activeTab, setActiveTab] = useState<'sheet' | 'cad_spec' | 'scale_check'>('sheet');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadA4Svg = () => {
    const svgStr = renderFullA4PrintSheetSvg();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SmartBow_A4_Print_Sheet_100pct_Scale.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBoardSvg = (type: 'MAXILLA' | 'MANDIBLE') => {
    const ids: [number, number, number, number] = type === 'MAXILLA' ? [3, 4, 5, 6] : [7, 8, 9, 10];
    const svgStr = renderBoardSvg(ids, type);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartBow_${type}_18x18mm_Array.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPlateStl = (label: string) => {
    const res = generateMarkerCarrierPlateStl(label);
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartBow_Marker_Carrier_Plate_${label}_18x18x3mm.stl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group markers
  const allMarkers = Object.values(ARUCO_MARKERS_REGISTRY);
  const maxillaMarkers = allMarkers.filter(m => m.group === 'MAXILLA');
  const mandMarkers = allMarkers.filter(m => m.group === 'MANDIBLE');
  const faceMarkers = allMarkers.filter(m => m.group === 'FACE');
  const hanauMarkers = allMarkers.filter(m => m.group === 'HANAU');

  // Corrected OpenCV ArUco bit polarity:
  // Outer perimeter (r=0,5 or c=0,5) is 0 -> Black (#000000)
  // Inner data cells: 1 -> White (#ffffff), 0 -> Black (#000000)
  // Background quiet zone: White (#ffffff)
  const renderArucoSvg = (id: number, sizeMm: number = 7) => {
    const grid = getFullMarkerGrid(id);

    return (
      <div className="bg-white p-0.5 inline-block rounded-xs shadow-xs">
        <svg
          width={`${sizeMm}mm`}
          height={`${sizeMm}mm`}
          viewBox="0 0 6 6"
          className="block"
          style={{ width: `${sizeMm}mm`, height: `${sizeMm}mm` }}
        >
          {grid.map((row, r) =>
            row.map((val, c) => (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill={val === 1 ? '#ffffff' : '#000000'}
              />
            ))
          )}
        </svg>
      </div>
    );
  };

  // Physical Caliper Metrology: Strict ±0.20 mm tolerance
  const parsedCaliper = parseFloat(caliperMeasurementMm);
  const caliperDelta = !isNaN(parsedCaliper) ? Number((parsedCaliper - 100.0).toFixed(2)) : 0;
  const isScalePassed = !isNaN(parsedCaliper) && Math.abs(caliperDelta) <= 0.20;
  const scaleCorrectionFactor = !isNaN(parsedCaliper) && parsedCaliper > 0 ? (100.0 / parsedCaliper).toFixed(4) : '1.0000';

  const handleSaveCaliperVerification = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartbow_marker_caliper_verified', isScalePassed ? 'true' : 'false');
      localStorage.setItem('smartbow_measured_scale_mm', caliperMeasurementMm);
      localStorage.setItem('smartbow_scale_factor', scaleCorrectionFactor);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0mm;
        }
        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            zoom: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 210mm; margin: 0; padding: 0; background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>1:1 Scaled ArUco Marker Print Sheet (DICT_4X4_50)</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                OpenCV Polarity Validated
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact 18.0 × 18.0 mm acrylic target arrays for maxillary &amp; mandibular occlusal rims
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadA4Svg}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download A4 SVG</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet (100% Scale)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2 bg-slate-900 border-b border-slate-800 flex gap-4 text-xs font-mono no-print">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`pb-1.5 border-b-2 font-semibold transition-colors cursor-pointer ${activeTab === 'sheet' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Fiducial Print Sheet (100%)
          </button>
          <button
            onClick={() => setActiveTab('scale_check')}
            className={`pb-1.5 border-b-2 font-semibold transition-colors cursor-pointer ${activeTab === 'scale_check' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            100mm Scale Verification Tool
          </button>
          <button
            onClick={() => setActiveTab('cad_spec')}
            className={`pb-1.5 border-b-2 font-semibold transition-colors cursor-pointer ${activeTab === 'cad_spec' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            CAD Plate &amp; Rim Datums
          </button>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-950 text-white print-area">
          {/* Printing Warning Notice */}
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1.5 no-print">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>MANDATORY PRINT INSTRUCTION: PRINT AT ACTUAL SIZE (100%) — DO NOT FIT TO PAGE</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              In your printer dialog, ensure <strong>Scale</strong> is explicitly set to <strong>100%</strong> (Actual Size) and page margins are set to <strong>None / Minimum</strong>. Check the printed 100 mm reference bar with a Vernier caliper before cutting.
            </p>
          </div>

          {activeTab === 'scale_check' && (
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Physical Caliper Verification Tool</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Place the jaws of a calibrated Vernier caliper across the 0 mm and 100 mm tick marks of the printed scale bar. Enter your reading below to verify that printer driver scaling has not corrupted the optical geometry.
              </p>

              <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Caliper Reading (mm):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={caliperMeasurementMm}
                    onChange={(e) => setCaliperMeasurementMm(e.target.value)}
                    className="w-32 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="border-l border-slate-800 pl-4 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Verification Decision:</span>
                  {isScalePassed ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                        <span>PASS (100.0 ± 0.2 mm) · Δ = {caliperDelta > 0 ? `+${caliperDelta}` : caliperDelta} mm · Scale Confirmed 1:1</span>
                      </span>
                      <button
                        onClick={handleSaveCaliperVerification}
                        className="block mt-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
                      >
                        Confirm &amp; Save Caliper Verification
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>FAIL: Discrepancy |Δ| = {Math.abs(caliperDelta)} mm &gt; 0.20 mm · Adjust printer driver scaling</span>
                      </span>
                      <p className="text-[10px] text-amber-300 font-mono">
                        Correction factor: {scaleCorrectionFactor}x. Check that browser print scale is set to &quot;100% / Actual Size&quot; and margins are None.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cad_spec' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-cyan-400 font-mono uppercase">
                    18.0 × 18.0 mm Target Array CAD Specifications
                  </h4>
                  <div className="flex items-center gap-2 no-print">
                    <button
                      onClick={() => handleDownloadPlateStl('Maxilla')}
                      className="px-2.5 py-1 text-[11px] font-mono text-cyan-300 bg-slate-800 hover:bg-slate-700 rounded border border-cyan-800/80 transition-colors cursor-pointer"
                    >
                      Download Maxilla STL (18×18×3mm)
                    </button>
                    <button
                      onClick={() => handleDownloadPlateStl('Mandible')}
                      className="px-2.5 py-1 text-[11px] font-mono text-emerald-300 bg-slate-800 hover:bg-slate-700 rounded border border-emerald-800/80 transition-colors cursor-pointer"
                    >
                      Download Mandible STL (18×18×3mm)
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">PLATE DIMENSION</span>
                    <span className="text-white font-bold">{CAD_BOARD_SPECIFICATION.plateWidthMm} × {CAD_BOARD_SPECIFICATION.plateHeightMm} mm</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">PLATE THICKNESS</span>
                    <span className="text-white font-bold">{CAD_BOARD_SPECIFICATION.plateThicknessMm} mm (PMMA)</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">MARKER SPAN</span>
                    <span className="text-white font-bold">{CAD_BOARD_SPECIFICATION.arrayOuterSpanMm} × {CAD_BOARD_SPECIFICATION.arrayOuterSpanMm} mm</span>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">CENTER PITCH</span>
                    <span className="text-white font-bold">{CAD_BOARD_SPECIFICATION.markerCenterPitchMm} mm</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-sm font-bold text-amber-400 font-mono uppercase">
                  Prosthodontic Wax Rim Starting Fabrication Guidelines (Boucher / Winkler)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Notice:</strong> The values below represent initial laboratory construction reference dimensions from standard prosthodontic doctrine, NOT universal patient absolutes. Every complete denture wax rim must be contoured chairside to patient-specific facial support, phonetics, and esthetics.
                </p>
                <div className="space-y-2 text-xs">
                  {Object.values(SOURCED_RIM_DATUMS).map(datum => (
                    <div key={datum.id} className="p-2.5 bg-slate-950 rounded border border-slate-800/80 space-y-1">
                      <div className="flex justify-between items-baseline font-mono">
                        <span className="font-bold text-white">{datum.parameter}</span>
                        <span className="text-cyan-400 font-bold">{datum.constructionReferenceMm}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{datum.anatomicalReference}</p>
                      <p className="text-[10px] text-slate-500 font-serif italic">Source: {datum.sourceCitation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sheet' && (
            <>
              {/* Physical 100mm Scale Verification Ruler */}
              <div className="border border-dashed border-slate-700 p-4 rounded-xl bg-black/40 flex flex-col items-center">
                <div className="text-[11px] font-mono text-slate-300 font-semibold mb-2 flex items-center gap-2">
                  <span>PHYSICAL 100.0 mm SCALE BAR — VERIFY WITH VERNIER CALIPER BEFORE CUTTING</span>
                  <span className="text-[10px] text-cyan-400 font-normal">(Target: Exactly 100.0 ± 0.2 mm)</span>
                </div>
                <div 
                  className="w-[100mm] max-w-full h-8 bg-white text-black flex flex-col justify-between px-1 py-0.5 font-mono text-[9px] relative border border-slate-900"
                  style={{ width: '100mm' }}
                >
                  <div className="flex justify-between w-full">
                    <span>0mm</span>
                    <span>25mm</span>
                    <span>50mm</span>
                    <span>75mm</span>
                    <span>100mm</span>
                  </div>
                  <div className="flex justify-between w-full border-t border-black pt-0.5">
                    {Array.from({ length: 21 }, (_, i) => (
                      <div key={i} className={`w-px bg-black ${i % 5 === 0 ? 'h-3.5' : 'h-1.5'}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 1: Occlusal Rim Acrylic Target Arrays */}
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-cyan-400 uppercase font-mono">
                      1. Occlusal Rim Buccal Target Arrays (18.0 × 18.0 × 3.0 mm)
                    </h4>
                    <p className="text-xs text-slate-400">Positioned on right buccal flange with ≥5 mm clearance from occlusal table</p>
                  </div>
                  <div className="flex gap-2 no-print">
                    <button
                      onClick={() => handleDownloadBoardSvg('MAXILLA')}
                      className="px-2.5 py-1 text-[11px] font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors cursor-pointer"
                    >
                      SVG Maxilla
                    </button>
                    <button
                      onClick={() => handleDownloadBoardSvg('MANDIBLE')}
                      className="px-2.5 py-1 text-[11px] font-mono text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors cursor-pointer"
                    >
                      SVG Mandible
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Maxillary Board */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-5">
                    <div 
                      className="w-[18mm] h-[18mm] bg-white border border-dashed border-cyan-400 rounded-xs flex items-center justify-center shrink-0 p-0.5"
                      style={{ width: '18mm', height: '18mm' }}
                      dangerouslySetInnerHTML={{ __html: renderBoardSvg([3, 4, 5, 6], 'MAXILLA') }}
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white font-mono block">Maxillary Occlusal Rim Array</span>
                      <span className="text-[11px] text-cyan-400 font-mono block">IDs: 3, 4, 5, 6 (DICT_4X4_50)</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Attach to buccal premolar zone with 0.8 mm stainless steel wire tag. Minimum 5 mm clearance from incisal table.
                      </p>
                    </div>
                  </div>

                  {/* Mandibular Board */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-5">
                    <div 
                      className="w-[18mm] h-[18mm] bg-white border border-dashed border-emerald-400 rounded-xs flex items-center justify-center shrink-0 p-0.5"
                      style={{ width: '18mm', height: '18mm' }}
                      dangerouslySetInnerHTML={{ __html: renderBoardSvg([7, 8, 9, 10], 'MANDIBLE') }}
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white font-mono block">Mandibular Occlusal Rim Array</span>
                      <span className="text-[11px] text-emerald-400 font-mono block">IDs: 7, 8, 9, 10 (DICT_4X4_50)</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Mount parallel to maxillary board. Maintain ≥2.0 mm vertical separation between plates at full closure.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Facial Reference Markers */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-purple-400 uppercase font-mono">
                    2. Facial Reference Markers (14.0 × 14.0 mm) &amp; Articulator References
                  </h4>
                  <p className="text-xs text-slate-400">Establish patient cranial frame (F01–F03) and mechanical articulator registration (H01–H02)</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center gap-2 text-center">
                    {renderArucoSvg(0, 14)}
                    <span className="text-[11px] font-bold text-white font-mono">F01 (ID 0)</span>
                    <span className="text-[9px] text-slate-400">Glabella / Forehead</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center gap-2 text-center">
                    {renderArucoSvg(1, 14)}
                    <span className="text-[11px] font-bold text-white font-mono">F02 (ID 1)</span>
                    <span className="text-[9px] text-slate-400">Right Zygoma</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center gap-2 text-center">
                    {renderArucoSvg(2, 14)}
                    <span className="text-[11px] font-bold text-white font-mono">F03 (ID 2)</span>
                    <span className="text-[9px] text-slate-400">Left Zygoma</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center gap-2 text-center">
                    {renderArucoSvg(11, 14)}
                    <span className="text-[11px] font-bold text-purple-400 font-mono">H01 (ID 11)</span>
                    <span className="text-[9px] text-slate-400">Hanau Upper Axis</span>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center gap-2 text-center">
                    {renderArucoSvg(12, 14)}
                    <span className="text-[11px] font-bold text-purple-400 font-mono">H02 (ID 12)</span>
                    <span className="text-[9px] text-slate-400">Hanau Lower Base</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
