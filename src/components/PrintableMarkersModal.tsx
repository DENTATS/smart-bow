/**
 * SmartBow AI - 1:1 Printable ArUco Marker Sheets & Board Cut Guides
 * DICT_4X4_50 marker generator with physical millimeter calibration ruler.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useRef } from 'react';
import { X, Printer, Download, Check, AlertCircle } from 'lucide-react';
import { ARUCO_MARKERS_REGISTRY, getFullMarkerGrid } from '../lib/arucoDict';

interface PrintableMarkersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrintableMarkersModal: React.FC<PrintableMarkersModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Group markers
  const allMarkers = Object.values(ARUCO_MARKERS_REGISTRY);
  const maxillaMarkers = allMarkers.filter(m => m.group === 'MAXILLA');
  const mandMarkers = allMarkers.filter(m => m.group === 'MANDIBLE');
  const faceMarkers = allMarkers.filter(m => m.group === 'FACE');
  const hanauMarkers = allMarkers.filter(m => m.group === 'HANAU');

  const renderArucoSvg = (id: number, sizeMm: number = 7) => {
    const grid = getFullMarkerGrid(id);
    const cellSize = sizeMm / 6;

    return (
      <svg
        width={`${sizeMm}mm`}
        height={`${sizeMm}mm`}
        viewBox="0 0 6 6"
        className="bg-white"
        style={{ width: `${sizeMm * 3.7795}px`, height: `${sizeMm * 3.7795}px` }}
      >
        {grid.map((row, r) =>
          row.map((val, c) => (
            <rect
              key={`${r}-${c}`}
              x={c}
              y={r}
              width={1}
              height={1}
              fill={val === 1 ? '#000000' : '#ffffff'}
            />
          ))
        )}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>1:1 Scaled ArUco Marker Print Sheet (DICT_4X4_50)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact 18×18mm rigid acrylic target arrays for maxillary & mandibular occlusal rims
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
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

        {/* Printable Document Body */}
        <div className="p-6 overflow-y-auto space-y-6 print-container bg-slate-950 text-white">
          {/* Instructions Notice */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2 no-print">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Clinician Fabrication & Calibration Guide (Dr. Deepanshu Specification)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-400 text-[11px] leading-relaxed">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-white font-semibold block mb-1">1. Paper & Acrylic Base</span>
                Print on 100% scaling (Do not fit to page). Cut laser-cut 18×18mm acrylic sheet (3mm thickness).
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-white font-semibold block mb-1">2. Adhesive & Sealing</span>
                Affix marker paper to acrylic with spray mount. Apply clear nail varnish over paper to prevent saliva smudging.
              </div>
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-white font-semibold block mb-1">3. Wax Rim Attachment</span>
                Fasten with 2 drops of cyanoacrylate to buccal premolar region. Mandibular board mounted directly parallel.
              </div>
            </div>
          </div>

          {/* Physical 100mm Scale Verification Ruler (Vital for calibration) */}
          <div className="border border-dashed border-slate-700 p-4 rounded-xl bg-black/40 flex flex-col items-center">
            <div className="text-[11px] font-mono text-slate-400 mb-2">
              PHYSICAL CALIBRATION SCALE — VERIFY WITH VERNIER CALLIPER BEFORE CUTTING (MUST MEASURE EXACTLY 100 mm)
            </div>
            <div className="w-[100mm] max-w-full h-8 bg-white text-black flex flex-col justify-between px-1 py-0.5 font-mono text-[9px] relative">
              <div className="flex justify-between w-full">
                <span>0mm</span>
                <span>25mm</span>
                <span>50mm</span>
                <span>75mm</span>
                <span>100mm</span>
              </div>
              <div className="flex justify-between w-full border-t border-black pt-0.5">
                {[...Array(21)].map((_, i) => (
                  <div key={i} className={`w-px bg-black ${i % 5 === 0 ? 'h-3' : 'h-1.5'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Marker Boards Section */}
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-cyan-400 uppercase font-mono">
                1. Maxillary Marker Board (18×18mm acrylic — IDs 3, 4, 5, 6)
              </h4>
              <p className="text-xs text-slate-400">Positioned on right buccal flange of maxillary occlusal rim</p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {/* 18x18mm Board Cutout Mockup */}
              <div className="w-[68px] h-[68px] border-2 border-dashed border-cyan-400 bg-white p-1.5 rounded-sm flex flex-col justify-between">
                <div className="flex justify-between">
                  {renderArucoSvg(3, 7)}
                  {renderArucoSvg(4, 7)}
                </div>
                <div className="text-[7px] text-center font-mono font-bold text-black uppercase">
                  MAXILLA 18mm
                </div>
                <div className="flex justify-between">
                  {renderArucoSvg(5, 7)}
                  {renderArucoSvg(6, 7)}
                </div>
              </div>

              {/* Individual 14mm corner markers */}
              <div className="flex items-center gap-4">
                {maxillaMarkers.map(m => (
                  <div key={m.id} className="p-2 border border-slate-800 rounded bg-slate-900 flex flex-col items-center gap-1">
                    {renderArucoSvg(m.id, 8)}
                    <span className="text-[10px] font-mono text-cyan-400">{m.label} (#{m.id})</span>
                    <span className="text-[9px] text-slate-500">{m.location.split(' ')[2]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-800 pb-2 pt-4">
              <h4 className="text-sm font-bold text-emerald-400 uppercase font-mono">
                2. Mandibular Marker Board (18×18mm acrylic — IDs 7, 8, 9, 10)
              </h4>
              <p className="text-xs text-slate-400">Positioned on right buccal flange of mandibular occlusal rim</p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {/* 18x18mm Board Cutout Mockup */}
              <div className="w-[68px] h-[68px] border-2 border-dashed border-emerald-400 bg-white p-1.5 rounded-sm flex flex-col justify-between">
                <div className="flex justify-between">
                  {renderArucoSvg(7, 7)}
                  {renderArucoSvg(8, 7)}
                </div>
                <div className="text-[7px] text-center font-mono font-bold text-black uppercase">
                  MANDIBLE 18mm
                </div>
                <div className="flex justify-between">
                  {renderArucoSvg(9, 7)}
                  {renderArucoSvg(10, 7)}
                </div>
              </div>

              {/* Individual markers */}
              <div className="flex items-center gap-4">
                {mandMarkers.map(m => (
                  <div key={m.id} className="p-2 border border-slate-800 rounded bg-slate-900 flex flex-col items-center gap-1">
                    {renderArucoSvg(m.id, 8)}
                    <span className="text-[10px] font-mono text-emerald-400">{m.label} (#{m.id})</span>
                    <span className="text-[9px] text-slate-500">{m.location.split(' ')[2]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-slate-800 pb-2 pt-4">
              <h4 className="text-sm font-bold text-purple-400 uppercase font-mono">
                3. Hanau Articulator Adapter Markers (IDs 11, 12) & Face Check (IDs 0, 1, 2)
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {hanauMarkers.concat(faceMarkers).map(m => (
                <div key={m.id} className="p-2 border border-slate-800 rounded bg-slate-900 flex flex-col items-center gap-1">
                  {renderArucoSvg(m.id, 8)}
                  <span className="text-[10px] font-mono text-purple-400">{m.label} (#{m.id})</span>
                  <span className="text-[9px] text-slate-400 max-w-[90px] truncate text-center">{m.location}</span>
                </div>
              ))}
            </div>

            {/* Dentulous & Natural Teeth Cutouts */}
            <div className="border-b border-slate-800 pb-2 pt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-amber-400 uppercase font-mono">
                  4. Dentulous Bite-Fork Flags &amp; Premolar Spot-Etch Tabs (Natural Dentition)
                </h4>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 font-semibold">
                  Zero Wax Rim Required
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cut along the solid black boundary. Attach to dual-arch bite fork stem with cyanoacrylate or bond directly to premolars with temporary resin tack.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dual Arch Bite Fork Flag Cutout */}
              <div className="p-3 bg-slate-950 border border-amber-900/60 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-white uppercase font-mono flex justify-between">
                  <span>Dual-Arch Bite Fork Stem Flag</span>
                  <span className="text-amber-400">22 × 22 mm</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[84px] h-[84px] border-2 border-dashed border-amber-400 bg-white p-2 rounded flex flex-col justify-between">
                    <div className="flex justify-between">
                      {renderArucoSvg(3, 6.5)}
                      {renderArucoSvg(4, 6.5)}
                    </div>
                    <div className="text-[6.5px] text-center font-mono font-bold text-black uppercase">
                      BITE-FORK STEM
                    </div>
                    <div className="flex justify-between">
                      {renderArucoSvg(5, 6.5)}
                      {renderArucoSvg(6, 6.5)}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <p className="font-semibold text-amber-300">Bite Registration Protocol:</p>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Laminate with thin clear tape, cut out, and glue to the lateral stem of a plastic dual-arch bite fork (Blu-Mousse bite).
                    </p>
                  </div>
                </div>
              </div>

              {/* Tooth-Direct Premolar Spot-Etch Tabs */}
              <div className="p-3 bg-slate-950 border border-emerald-900/60 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-white uppercase font-mono flex justify-between">
                  <span>Tooth-Direct Spot-Etch Micro Tabs</span>
                  <span className="text-emerald-400">12 × 12 mm</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-[48px] h-[48px] border-2 border-dashed border-emerald-400 bg-white p-1 rounded flex flex-col items-center justify-center">
                      {renderArucoSvg(3, 7)}
                      <span className="text-[6px] font-mono text-black font-bold mt-0.5">MAX TACK</span>
                    </div>
                    <div className="w-[48px] h-[48px] border-2 border-dashed border-emerald-400 bg-white p-1 rounded flex flex-col items-center justify-center">
                      {renderArucoSvg(7, 7)}
                      <span className="text-[6px] font-mono text-black font-bold mt-0.5">MAND TACK</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <p className="font-semibold text-emerald-300">Premolar Tack Protocol:</p>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Affix to buccal enamel with a dot of light-cure temporary resin (Fermit / spot composite). Occlusal surfaces remain 100% free!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
