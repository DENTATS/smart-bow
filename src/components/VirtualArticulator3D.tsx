/**
 * SmartBow AI - 3D Virtual Articulator & Hanau Mounting Jig Viewer
 * Real-time Three.js spatial kinematics, condylar path simulation, and STL export.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Box, Download, Play, Pause, RotateCw, FileCode, Check, Layers } from 'lucide-react';
import { PatientCase } from '../types/smartbow';
import { generateMountingJigStl } from '../lib/stlGenerator';
import { generateExocadArticulatorFile, generate3ShapeArticulatorXml } from '../lib/exportArticulator';

interface VirtualArticulator3DProps {
  patientCase: PatientCase;
  onUpdateArticulatorType: (type: any) => void;
}

export const VirtualArticulator3D: React.FC<VirtualArticulator3DProps> = ({
  patientCase,
  onUpdateArticulatorType,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showJig, setShowJig] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Articulator kinematic sliders
  const [openingAngleDeg, setOpeningAngleDeg] = useState<number>(0);
  const [protrusionMm, setProtrusionMm] = useState<number>(0);

  const m = patientCase.measurements;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(130, 90, 160);
    camera.lookAt(0, 30, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.replaceChildren(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 1.2);
    dirLight1.position.set(80, 120, 80);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-80, 80, -80);
    scene.add(dirLight2);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(160, 16, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // --- BUILD HANAU WIDE-VUE ARTICULATOR 3D ASSEMBLY ---
    const articulatorGroup = new THREE.Group();

    // 1. Lower Member (Base)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 });
    const castMatUpper = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 }); // Yellow dental stone
    const castMatLower = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.6 }); // Blue dental stone
    const waxMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 }); // Pink baseplate wax
    const jigMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.3, transparent: true, opacity: 0.85 });

    // Lower base plate
    const baseGeo = new THREE.BoxGeometry(80, 6, 90);
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, 3, 10);
    articulatorGroup.add(baseMesh);

    // Lower mounting ring
    const ringGeo = new THREE.CylinderGeometry(20, 20, 3, 32);
    const lowerRing = new THREE.Mesh(ringGeo, chromeMat);
    lowerRing.position.set(0, 7.5, 20);
    articulatorGroup.add(lowerRing);

    // Left & Right Condylar Upright Posts
    const postGeo = new THREE.CylinderGeometry(5, 6, 75, 24);
    const leftPost = new THREE.Mesh(postGeo, baseMat);
    leftPost.position.set(-55, 40, -25);
    articulatorGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, baseMat);
    rightPost.position.set(55, 40, -25);
    articulatorGroup.add(rightPost);

    // Condylar Track Guidance Housings (Hanau dials)
    const dialGeo = new THREE.CylinderGeometry(10, 10, 8, 24);
    dialGeo.rotateZ(Math.PI / 2);
    const leftDial = new THREE.Mesh(dialGeo, brassMat);
    leftDial.position.set(-55, 78, -25);
    articulatorGroup.add(leftDial);

    const rightDial = new THREE.Mesh(dialGeo, brassMat);
    rightDial.position.set(55, 78, -25);
    articulatorGroup.add(rightDial);

    // Incisal Guide Table (Lower front)
    const tableGeo = new THREE.BoxGeometry(28, 5, 24);
    const incisalTable = new THREE.Mesh(tableGeo, chromeMat);
    incisalTable.position.set(0, 10, 56);
    articulatorGroup.add(incisalTable);

    // Lower Mandibular Cast & Rim
    const lowerCastGroup = new THREE.Group();
    lowerCastGroup.position.set(0, 18, 20);

    const mandCastBase = new THREE.Mesh(new THREE.CylinderGeometry(26, 28, 10, 32), castMatLower);
    lowerCastGroup.add(mandCastBase);

    // Mandibular Rim Horseshoe
    const mandRimGeo = new THREE.TorusGeometry(18, 4, 16, 32, Math.PI);
    mandRimGeo.rotateX(-Math.PI / 2);
    const mandRim = new THREE.Mesh(mandRimGeo, waxMat);
    mandRim.position.set(0, 7, 0);
    lowerCastGroup.add(mandRim);
    articulatorGroup.add(lowerCastGroup);

    // Optional 3D Mounting Jig
    const jigGroup = new THREE.Group();
    jigGroup.position.set(0, 9, 20);

    const jigBase = new THREE.Mesh(new THREE.BoxGeometry(70, 4, 60), jigMat);
    jigGroup.add(jigBase);

    const jigPillar1 = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 25, 16), jigMat);
    jigPillar1.position.set(0, 14, 18);
    jigGroup.add(jigPillar1);

    const jigPillar2 = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 22, 16), jigMat);
    jigPillar2.position.set(-20, 13, -10);
    jigGroup.add(jigPillar2);

    const jigPillar3 = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 22, 16), jigMat);
    jigPillar3.position.set(20, 13, -10);
    jigGroup.add(jigPillar3);
    jigGroup.visible = showJig;
    articulatorGroup.add(jigGroup);

    // 2. Upper Member (Pivoting on Hinge Axis at Y=78, Z=-25)
    const upperHingePivot = new THREE.Group();
    upperHingePivot.position.set(0, 78, -25);

    // Upper Cross Bar
    const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 114, 24), chromeMat);
    crossBar.rotateZ(Math.PI / 2);
    upperHingePivot.add(crossBar);

    // Upper Bow Member
    const upperBowGeo = new THREE.BoxGeometry(60, 6, 85);
    const upperBow = new THREE.Mesh(upperBowGeo, baseMat);
    upperBow.position.set(0, 0, 42);
    upperHingePivot.add(upperBow);

    // Incisal Pin extending down to the guide table
    const pinGeo = new THREE.CylinderGeometry(2, 2, 70, 16);
    const incisalPin = new THREE.Mesh(pinGeo, chromeMat);
    incisalPin.position.set(0, -32, 80);
    upperHingePivot.add(incisalPin);

    // Upper Maxillary Cast & Rim
    const upperCastGroup = new THREE.Group();
    // Positioned according to patient's VDO and occlusal plane tilts
    const maxZOffset = 20;
    const maxYOffset = -38;
    upperCastGroup.position.set(m.midlineShiftMm * 0.5, maxYOffset, 42);
    // Apply ML and AP tilts
    upperCastGroup.rotation.z = -(m.occlusalTiltMLDeg * Math.PI) / 180;
    upperCastGroup.rotation.x = (m.occlusalTiltAPDeg * Math.PI) / 180;

    const maxCastBase = new THREE.Mesh(new THREE.CylinderGeometry(28, 26, 12, 32), castMatUpper);
    upperCastGroup.add(maxCastBase);

    const maxRimGeo = new THREE.TorusGeometry(18, 4, 16, 32, Math.PI);
    maxRimGeo.rotateX(Math.PI / 2);
    const maxRim = new THREE.Mesh(maxRimGeo, waxMat);
    maxRim.position.set(0, -7, 0);
    upperCastGroup.add(maxRim);

    upperHingePivot.add(upperCastGroup);
    articulatorGroup.add(upperHingePivot);

    scene.add(articulatorGroup);

    // Mouse drag rotation controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      articulatorGroup.rotation.y += deltaX * 0.01;
      articulatorGroup.rotation.x = Math.max(-0.5, Math.min(0.8, articulatorGroup.rotation.x + deltaY * 0.01));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let reqId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Auto articulation if playing
      if (isPlaying) {
        const elapsedTime = clock.getElapsedTime();
        const cycle = Math.sin(elapsedTime * 1.5);
        // Hinge opening / closing motion
        upperHingePivot.rotation.x = Math.max(0, cycle * 0.12);
        // Subtle protrusive translation along condylar path
        upperHingePivot.position.z = -25 + (Math.max(0, -cycle) * 3);
        upperHingePivot.position.y = 78 - (Math.max(0, -cycle) * 1.5);
      } else {
        upperHingePivot.rotation.x = (openingAngleDeg * Math.PI) / 180;
        upperHingePivot.position.z = -25 + protrusionMm;
        upperHingePivot.position.y = 78 - (protrusionMm * Math.tan((m.sciEstimateDeg * Math.PI) / 180) * 0.5);
      }

      jigGroup.visible = showJig;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
    };
  }, [isPlaying, showJig, openingAngleDeg, protrusionMm, m]);

  // Export handlers
  const handleDownloadStl = () => {
    const { blob } = generateMountingJigStl(
      m.vdoMm,
      m.occlusalTiltMLDeg,
      m.occlusalTiltAPDeg,
      m.midlineShiftMm,
      patientCase.patientId
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartBow_MountingJig_${patientCase.patientId}.stl`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('3D Mounting Jig STL Downloaded successfully!');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleDownloadExocad = () => {
    const jsonStr = generateExocadArticulatorFile(patientCase);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartBow_Exocad_${patientCase.patientId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Exocad Articulator file downloaded!');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleDownload3Shape = () => {
    const xmlStr = generate3ShapeArticulatorXml(patientCase);
    const blob = new Blob([xmlStr], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartBow_3Shape_${patientCase.patientId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('3Shape XML file downloaded!');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Box className="w-5 h-5 text-cyan-400" />
            <span>Virtual Articulator & 3D-Printed Transfer Jig</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic CAD/CAM mounting verification on Hanau Wide-Vue semi-adjustable articulator
          </p>
        </div>

        {/* Quick Export CTAs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadStl}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Jig STL</span>
          </button>

          <button
            onClick={handleDownloadExocad}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>exocad</span>
          </button>

          <button
            onClick={handleDownload3Shape}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>3Shape</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Main 3D Viewport & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Three.js Canvas Stage (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>HANAU WIDE-VUE SEMI-ADJUSTABLE</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJig(!showJig)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  showJig
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Mounting Jig Overlay</span>
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? 'Pause Dynamic' : 'Auto Articulate'}</span>
              </button>
            </div>
          </div>

          {/* 3D Container */}
          <div ref={mountRef} className="w-full h-[440px] cursor-grab active:cursor-grabbing bg-slate-950" />

          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Left-drag to rotate · Dynamic opening & condylar glide</span>
            <span className="text-cyan-400">VDO: {m.vdoMm} mm</span>
          </div>
        </div>

        {/* Physical Hanau Dial Settings Column (1 col) */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-semibold text-white">Hanau Mechanical Dial Settings</h3>
            <p className="text-xs text-slate-400">
              Set these dials on the physical Hanau articulator before mounting the dental casts.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Condylar Inclination (SCI):</span>
                <span className="text-base font-bold text-amber-400">{m.sciEstimateDeg}°</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Left Bennett Angle (L):</span>
                <span className="text-base font-bold text-purple-400">{m.bennettLeftDeg}°</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Right Bennett Angle (R):</span>
                <span className="text-base font-bold text-cyan-400">{m.bennettRightDeg}°</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Incisal Guide Pin:</span>
                <span className="text-base font-bold text-white">0.0 mm (Flush)</span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Incisal Guide Table:</span>
                <span className="text-base font-bold text-emerald-400">0° (Flat)</span>
              </div>
            </div>
          </div>

          {/* 3D Printed Mounting Jig Protocol */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>How the 3D Mounting Jig Works</span>
            </h4>
            <ol className="text-xs text-slate-400 list-decimal pl-4 space-y-1.5 leading-relaxed">
              <li>SmartBow computes spatial transformation $T_{`max`}$ of the maxillary rim in patient space.</li>
              <li>Generates custom height pedestals on the 3D-printed jig base.</li>
              <li>Clip the jig onto the lower Hanau member.</li>
              <li>Seat the maxillary rim into the jig and plaster the upper cast directly without an anatomic facebow!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
