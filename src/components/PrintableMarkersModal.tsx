/**
 * SmartBow AI - 1:1 Scaled ArUco Marker Sheets & Board Cut Guides
 * DICT_4X4_50 marker generator with physical millimeter calibration ruler.
 * Validated OpenCV ArUco bit polarity & CAD array specifications.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useState } from 'react';
import { X, Printer, Download, Check, AlertCircle, ShieldAlert, CheckCircle2, FileText, Loader2, Eye } from 'lucide-react';
import { 
  ARUCO_MARKERS_REGISTRY, 
  getFullMarkerGrid, 
  renderBoardSvg, 
  renderFullA4PrintSheetSvg, 
  CAD_BOARD_SPECIFICATION 
} from '../lib/arucoDict';
import { downloadA4PrintSheetPdf } from '../lib/pdfExport';
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
  const [caliperVerticalMm, setCaliperVerticalMm] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smartbow_measured_vertical_mm') || '50.0';
    }
    return '50.0';
  });
  const [activeTab, setActiveTab] = useState<'sheet' | 'cad_spec' | 'scale_check'>('sheet');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [showFullSheetPreview, setShowFullSheetPreview] = useState<boolean>(false);

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

  const handleDownloadA4Pdf = async (mode: 'VECTOR' | 'RASTER_600DPI' = 'VECTOR') => {
    try {
      setIsGeneratingPdf(true);
      const filename = mode === 'VECTOR'
        ? 'SmartBow_A4_Print_Sheet_100pct_Scale.pdf'
        : 'SmartBow_A4_Print_Sheet_600DPI_Fallback.pdf';
      await downloadA4PrintSheetPdf(filename, { mode });
    } catch (err) {
      console.error('Failed to generate 1:1 PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
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

  // Physical Caliper Metrology: Strict ±0.20 mm tolerance on both axes
  const parsedCaliper = parseFloat(caliperMeasurementMm);
  const caliperDelta = !isNaN(parsedCaliper) ? Number((parsedCaliper - 100.0).toFixed(2)) : 0;
  const isHorizontalPassed = !isNaN(parsedCaliper) && Math.abs(caliperDelta) <= 0.20;

  const parsedVertical = parseFloat(caliperVerticalMm);
  const verticalDelta = !isNaN(parsedVertical) ? Number((parsedVertical - 50.0).toFixed(2)) : 0;
  const isVerticalPassed = !isNaN(parsedVertical) && Math.abs(verticalDelta) <= 0.20;

  const isScalePassed = isHorizontalPassed && isVerticalPassed;
  const scaleCorrectionFactor = !isNaN(parsedCaliper) && parsedCaliper > 0 ? (100.0 / parsedCaliper).toFixed(4) : '1.0000';

  const handleSaveCaliperVerification = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartbow_marker_caliper_verified', isScalePassed ? 'true' : 'false');
      localStorage.setItem('smartbow_measured_scale_mm', caliperMeasurementMm);
      localStorage.setItem('smartbow_measured_vertical_mm', caliperVerticalMm);
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
              onClick={() => handleDownloadA4Pdf('VECTOR')}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Download 1:1 Scale Print-Ready PDF (DIN A4)"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Print-Ready PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print (100% Scale)</span>
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
            Dual-Axis Caliper Tool (100mm H × 50mm V)
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
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-2 no-print">
            <div className="flex items-center gap-2 text-rose-300 font-bold tracking-wide">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>PRINT AT ACTUAL SIZE — 100% SCALE · DISABLE FIT TO PAGE · VERIFY PRINTED DIMENSIONS BEFORE USE</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              In your printer dialog, ensure <strong>Scale</strong> is explicitly set to <strong>100%</strong> (Actual Size) and page margins are set to <strong>None / Minimum</strong>. Do not select &quot;Fit to Printable Area&quot; or &quot;Shrink to Fit&quot;. A PDF file cannot override printer driver auto-scaling on its own; always confirm actual physical dimensions using the 100.0 mm horizontal and 50.0 mm vertical scale bars and the 20.0 × 20.0 mm verification square with a calibrated caliper before clinical mounting.
            </p>
          </div>

          {activeTab === 'scale_check' && (
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Dual-Axis Physical Caliper Metrology Tool (±0.20 mm Gate)</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Place the jaws of a calibrated digital Vernier caliper across the 0 mm and 100 mm tick marks of the horizontal bar, and across the 0 mm and 50 mm marks of the vertical bar. This detects anamorphic aspect-ratio distortion caused by printer roller feed slippage.
                </p>
              </div>

              {/* Dual Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Horizontal Scale Check */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-white">X-Axis: 100.0 mm Scale Bar</span>
                    <span className="text-[10px] font-mono text-cyan-400">Target: 100.0 ± 0.2 mm</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Caliper Reading (mm):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={caliperMeasurementMm}
                      onChange={(e) => setCaliperMeasurementMm(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <span className="text-slate-400 text-[11px]">Horizontal Delta:</span>
                    <span className={`font-bold ${isHorizontalPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {caliperDelta > 0 ? `+${caliperDelta.toFixed(2)}` : caliperDelta.toFixed(2)} mm
                    </span>
                  </div>
                  <div>
                    {isHorizontalPassed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        <span>X-Axis PASS (1:1 scale)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                        <AlertCircle className="w-3 h-3" />
                        <span>X-Axis FAIL (|Δ| &gt; 0.20 mm)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Vertical Scale Check */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-white">Y-Axis: 50.0 mm Scale Bar</span>
                    <span className="text-[10px] font-mono text-cyan-400">Target: 50.0 ± 0.2 mm</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Caliper Reading (mm):</label>
                    <input
                      type="number"
                      step="0.05"
                      value={caliperVerticalMm}
                      onChange={(e) => setCaliperVerticalMm(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <span className="text-slate-400 text-[11px]">Vertical Delta:</span>
                    <span className={`font-bold ${isVerticalPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {verticalDelta > 0 ? `+${verticalDelta.toFixed(2)}` : verticalDelta.toFixed(2)} mm
                    </span>
                  </div>
                  <div>
                    {isVerticalPassed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        <span>Y-Axis PASS (No roller stretch)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                        <AlertCircle className="w-3 h-3" />
                        <span>Y-Axis FAIL (|Δ| &gt; 0.20 mm)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Combined Gate Decision & Persistence */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Overall Verification Status:</span>
                  {isScalePassed ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" />
                        <span>PASS: Both X &amp; Y axes meet ±0.20 mm physical tolerance · 1:1 Scale Confirmed</span>
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Ready for acrylic carrier plate mounting and clinical tracking.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold font-mono text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>BLOCKED: Dimensional discrepancy exceeds ±0.20 mm tolerance</span>
                      </span>
                      <p className="text-[10px] text-amber-300 font-mono">
                        Verify print settings: Scale MUST be &quot;Actual Size / 100%&quot;, Margins &quot;None&quot;. Do NOT use &quot;Fit to Printable Area&quot;.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSaveCaliperVerification}
                  disabled={!isScalePassed}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Save Caliper Verification
                </button>
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
              {/* Dual Export Quick Actions Banner */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 no-print">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase font-mono flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Single-Page DIN A4 Calibrated Print File (210 × 297 mm)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    OpenCV DICT_4X4_50 fiducials with clean 1-bit outer borders, 100.0 mm Vernier caliper bar, and camera intrinsics card.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFullSheetPreview(!showFullSheetPreview)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showFullSheetPreview ? 'Hide Preview' : 'Preview Sheet'}</span>
                  </button>
                  <button
                    onClick={() => handleDownloadA4Pdf('VECTOR')}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
                    title="Download 1:1 Scale Print-Ready PDF (DIN A4)"
                  >
                    {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    <span>Download Print-Ready PDF</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Full A4 Sheet SVG Preview */}
              {showFullSheetPreview && (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 no-print">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300 pb-2 border-b border-slate-800">
                    <span>Full Single-Page DIN A4 Layout Preview (210 × 297 mm)</span>
                    <span className="text-[10px] text-emerald-400">Clean fiducials · No overlaps · Dual 100mm/50mm Scale Bars</span>
                  </div>
                  <div className="bg-white rounded-lg p-2 flex justify-center overflow-x-auto shadow-inner max-h-[500px]">
                    <div 
                      className="w-full max-w-[500px]"
                      dangerouslySetInnerHTML={{ __html: renderFullA4PrintSheetSvg() }} 
                    />
                  </div>
                </div>
              )}

              {/* Dual-Axis Physical Scale Verification Gauge Display */}
              <div className="border border-dashed border-slate-700 p-4 rounded-xl bg-black/40 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-slate-300 font-semibold gap-1">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>DUAL-AXIS SCALE BARS &amp; 20×20mm GAUGE (ACTUAL SIZE 1:1)</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-normal">Tolerance: ±0.20 mm · Verify with caliper</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {/* 100mm Horizontal */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block">X-AXIS (100.0 mm):</span>
                    <div 
                      className="w-full max-w-[100mm] h-7 bg-white text-black flex flex-col justify-between px-1 py-0.5 font-mono text-[8px] relative border border-slate-900"
                    >
                      <div className="flex justify-between w-full">
                        <span>0</span>
                        <span>25</span>
                        <span>50</span>
                        <span>75</span>
                        <span>100mm</span>
                      </div>
                      <div className="flex justify-between w-full border-t border-black pt-0.5">
                        {Array.from({ length: 21 }, (_, i) => (
                          <div key={i} className={`w-px bg-black ${i % 5 === 0 ? 'h-3' : 'h-1.5'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 50mm Vertical */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block">Y-AXIS (50.0 mm Feed Check):</span>
                    <div 
                      className="w-full max-w-[50mm] h-7 bg-white text-black flex flex-col justify-between px-1 py-0.5 font-mono text-[8px] relative border border-slate-900"
                    >
                      <div className="flex justify-between w-full">
                        <span>0</span>
                        <span>25</span>
                        <span>50mm</span>
                      </div>
                      <div className="flex justify-between w-full border-t border-black pt-0.5">
                        {Array.from({ length: 11 }, (_, i) => (
                          <div key={i} className={`w-px bg-black ${i % 5 === 0 ? 'h-3' : 'h-1.5'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 20x20mm Gauge */}
                  <div className="flex items-center gap-3">
                    <div className="w-[20mm] h-[20mm] bg-white border-2 border-black relative flex items-center justify-center shrink-0">
                      <div className="w-full h-px bg-rose-500 absolute" />
                      <div className="h-full w-px bg-rose-500 absolute" />
                      <div className="w-1.5 h-1.5 rounded-full border border-black z-10" />
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 leading-tight">
                      <span className="font-bold text-white block">20.0 × 20.0 mm GAUGE</span>
                      <span>Crosshair center check</span>
                    </div>
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

              {/* Section 3: Camera Calibration Card */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-cyan-400 uppercase font-mono">
                    3. Camera Intrinsics Calibration Target (60.0 × 60.0 mm Rigid Card)
                  </h4>
                  <p className="text-xs text-slate-400">3×3 ArUco array (IDs 20–28, Pitch 18.0 mm) with pure unoccluded borders</p>
                </div>

                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center gap-6">
                  <div className="bg-white p-2 rounded-lg border border-slate-300 shrink-0">
                    <div className="grid grid-cols-3 gap-1.5 w-[72px] h-[72px] items-center justify-center">
                      {[20, 21, 22, 23, 24, 25, 26, 27, 28].map(id => (
                        <div key={id} className="flex items-center justify-center">
                          {renderArucoSvg(id, 6)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-white block">Planar Intrinsics Array (OpenCV DICT_4X4_50)</span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      All 9 markers have clean 1-bit outer borders without text occlusion. Resolves camera focal length (fx, fy), optical principal point (cx, cy), and radial lens distortion parameters prior to clinical capture.
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 w-fit">
                      <Check className="w-3 h-3" />
                      <span>Reprojection Target: RMS &lt; 0.50 px</span>
                    </div>
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
