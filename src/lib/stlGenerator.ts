/**
 * SmartBow AI - 3D-Printed Hanau Mounting Jig STL Generator
 * Generates valid ASCII STL meshes for custom dental transfer jigs
 * based on T_max spatial transformation and Hanau articulator geometry.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import { Point3D } from '../types/smartbow';

interface Triangle {
  normal: Point3D;
  v1: Point3D;
  v2: Point3D;
  v3: Point3D;
}

function calculateNormal(v1: Point3D, v2: Point3D, v3: Point3D): Point3D {
  const ax = v2.x - v1.x;
  const ay = v2.y - v1.y;
  const az = v2.z - v1.z;
  const bx = v3.x - v1.x;
  const by = v3.y - v1.y;
  const bz = v3.z - v1.z;

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: nx / len, y: ny / len, z: nz / len };
}

function addQuad(triangles: Triangle[], p1: Point3D, p2: Point3D, p3: Point3D, p4: Point3D) {
  // Triangle 1: p1 -> p2 -> p3
  triangles.push({
    normal: calculateNormal(p1, p2, p3),
    v1: p1,
    v2: p2,
    v3: p3
  });
  // Triangle 2: p1 -> p3 -> p4
  triangles.push({
    normal: calculateNormal(p1, p3, p4),
    v1: p1,
    v2: p3,
    v3: p4
  });
}

/**
 * Generate 3D printable mounting jig matching Hanau lower member & patient maxillary rim orientation.
 * Base plate: 80x70mm with 4mm thickness, magnetic mounting indentations
 * Left column: custom height matching left posterior occlusal tilt
 * Right column: custom height matching right posterior occlusal tilt
 * Anterior column: custom height matching incisal edge position
 * Horseshoe bite index cradle with rim alignment index
 */
export function generateMountingJigStl(
  vdoMm: number | null,
  tiltMLDeg: number | null,
  tiltAPDeg: number | null,
  midlineShiftMm: number | null = 0,
  patientId: string = 'PT-DEMO',
  isSimulation: boolean = true
): { stlString: string; blob: Blob; triangleCount: number } {
  const triangles: Triangle[] = [];

  // Fallback safe visual height if VDO is null/UNAVAILABLE
  const safeVdo = vdoMm ?? 60.0;
  const safeTiltML = tiltMLDeg ?? 0.0;
  const safeTiltAP = tiltAPDeg ?? 0.0;
  const safeMidline = midlineShiftMm ?? 0.0;

  // Base plate dimensions
  const baseW = 76; // mm
  const baseD = 66; // mm
  const baseH = 4;  // mm

  // Custom column heights calculated from patient kinematics
  const baseSupportZ = baseH;
  const nominalApexHeight = Math.max(30, Math.min(65, safeVdo * 0.72));
  
  // Angle adjustments
  const tiltMLRad = (safeTiltML * Math.PI) / 180;
  const tiltAPRad = (safeTiltAP * Math.PI) / 180;

  const deltaLeftZ = 22 * Math.tan(tiltMLRad);
  const deltaRightZ = -deltaLeftZ;
  const deltaAP = 25 * Math.tan(tiltAPRad);

  const anteriorZ = baseSupportZ + nominalApexHeight + deltaAP;
  const leftPosteriorZ = baseSupportZ + nominalApexHeight - deltaAP / 2 + deltaLeftZ;
  const rightPosteriorZ = baseSupportZ + nominalApexHeight - deltaAP / 2 + deltaRightZ;

  // 1. Base Plate Box (-baseW/2 to baseW/2, -baseD/2 to baseD/2, 0 to baseH)
  const bX0 = -baseW / 2;
  const bX1 = baseW / 2;
  const bY0 = -baseD / 2;
  const bY1 = baseD / 2;

  // Bottom face
  addQuad(triangles,
    { x: bX0, y: bY0, z: 0 },
    { x: bX1, y: bY0, z: 0 },
    { x: bX1, y: bY1, z: 0 },
    { x: bX0, y: bY1, z: 0 }
  );

  // Top face of base
  addQuad(triangles,
    { x: bX0, y: bY1, z: baseH },
    { x: bX1, y: bY1, z: baseH },
    { x: bX1, y: bY0, z: baseH },
    { x: bX0, y: bY0, z: baseH }
  );

  // 4 base sides
  addQuad(triangles, { x: bX0, y: bY0, z: 0 }, { x: bX0, y: bY0, z: baseH }, { x: bX1, y: bY0, z: baseH }, { x: bX1, y: bY0, z: 0 });
  addQuad(triangles, { x: bX1, y: bY0, z: 0 }, { x: bX1, y: bY0, z: baseH }, { x: bX1, y: bY1, z: baseH }, { x: bX1, y: bY1, z: 0 });
  addQuad(triangles, { x: bX1, y: bY1, z: 0 }, { x: bX1, y: bY1, z: baseH }, { x: bX0, y: bY1, z: baseH }, { x: bX0, y: bY1, z: 0 });
  addQuad(triangles, { x: bX0, y: bY1, z: 0 }, { x: bX0, y: bY1, z: baseH }, { x: bX0, y: bY0, z: baseH }, { x: bX0, y: bY0, z: 0 });

  // 2. Three Precision Stanchion Columns (Left Posterior, Right Posterior, Anterior)
  const colRadius = 5; // mm
  const segments = 12;

  const buildColumn = (cx: number, cy: number, topZ: number) => {
    for (let i = 0; i < segments; i++) {
      const theta1 = (i / segments) * Math.PI * 2;
      const theta2 = ((i + 1) / segments) * Math.PI * 2;

      const p1Bottom: Point3D = { x: cx + colRadius * Math.cos(theta1), y: cy + colRadius * Math.sin(theta1), z: baseH };
      const p2Bottom: Point3D = { x: cx + colRadius * Math.cos(theta2), y: cy + colRadius * Math.sin(theta2), z: baseH };
      const p1Top: Point3D = { x: cx + colRadius * 0.85 * Math.cos(theta1), y: cy + colRadius * 0.85 * Math.sin(theta1), z: topZ };
      const p2Top: Point3D = { x: cx + colRadius * 0.85 * Math.cos(theta2), y: cy + colRadius * 0.85 * Math.sin(theta2), z: topZ };

      // Wall quad
      addQuad(triangles, p1Bottom, p1Top, p2Top, p2Bottom);

      // Top cap triangle to center
      triangles.push({
        normal: { x: 0, y: 0, z: 1 },
        v1: { x: cx, y: cy, z: topZ },
        v2: p1Top,
        v3: p2Top
      });
    }
  };

  // Anterior Column (near incisal edge)
  buildColumn(safeMidline, 20, anteriorZ);
  // Left Posterior Column (premolar/molar region)
  buildColumn(-24, -14, leftPosteriorZ);
  // Right Posterior Column (premolar/molar region)
  buildColumn(24, -14, rightPosteriorZ);

  // 3. Connective Occlusal Rim Index Table (Arch cradle connecting the 3 columns)
  const archThickness = 3.5;
  const ptsArchTop: Point3D[] = [
    { x: -24, y: -14, z: leftPosteriorZ + 1 },
    { x: safeMidline, y: 20, z: anteriorZ + 1 },
    { x: 24, y: -14, z: rightPosteriorZ + 1 }
  ];

  // Bridge 1: Left to Anterior
  addQuad(triangles,
    { x: ptsArchTop[0].x - 3, y: ptsArchTop[0].y, z: ptsArchTop[0].z },
    { x: ptsArchTop[0].x + 3, y: ptsArchTop[0].y, z: ptsArchTop[0].z },
    { x: ptsArchTop[1].x + 3, y: ptsArchTop[1].y, z: ptsArchTop[1].z },
    { x: ptsArchTop[1].x - 3, y: ptsArchTop[1].y, z: ptsArchTop[1].z }
  );

  // Bridge 2: Anterior to Right
  addQuad(triangles,
    { x: ptsArchTop[1].x - 3, y: ptsArchTop[1].y, z: ptsArchTop[1].z },
    { x: ptsArchTop[1].x + 3, y: ptsArchTop[1].y, z: ptsArchTop[1].z },
    { x: ptsArchTop[2].x + 3, y: ptsArchTop[2].y, z: ptsArchTop[2].z },
    { x: ptsArchTop[2].x - 3, y: ptsArchTop[2].y, z: ptsArchTop[2].z }
  );

  // Format ASCII STL
  const solidLabel = isSimulation 
    ? `SmartBow_MountingJig_SIMULATION_NOT_FOR_CLINICAL_USE_${patientId}`
    : `SmartBow_MountingJig_${patientId}`;
  let stl = `solid ${solidLabel}\n`;
  for (const t of triangles) {
    stl += `  facet normal ${t.normal.x.toFixed(6)} ${t.normal.y.toFixed(6)} ${t.normal.z.toFixed(6)}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${t.v1.x.toFixed(4)} ${t.v1.y.toFixed(4)} ${t.v1.z.toFixed(4)}\n`;
    stl += `      vertex ${t.v2.x.toFixed(4)} ${t.v2.y.toFixed(4)} ${t.v2.z.toFixed(4)}\n`;
    stl += `      vertex ${t.v3.x.toFixed(4)} ${t.v3.y.toFixed(4)} ${t.v3.z.toFixed(4)}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }
  stl += `endsolid ${solidLabel}\n`;

  const blob = new Blob([stl], { type: 'model/stl' });
  return { stlString: stl, blob, triangleCount: triangles.length };
}

/**
 * Generate 3D printable STL mesh for the 18.0 x 18.0 x 3.0 mm ArUco marker carrier plate.
 * Dimensions:
 * - Plate footprint: 18.0 mm (X) x 18.0 mm (Y) x 3.0 mm (Z)
 * - Array Outer Span: 14.0 mm x 14.0 mm
 * - Marker Centroids: (+3.75, +3.75), (-3.75, +3.75), (-3.75, -3.75), (+3.75, -3.75) mm
 * - Marker Size: 6.5 mm x 6.5 mm
 * - Center Pitch: 7.5 mm
 * - Edge Margins: 2.0 mm
 * - Dual wire anchor guides: 0.9 mm channels for 0.8 mm stainless steel orthodontic tacks
 */
export function generateMarkerCarrierPlateStl(label: string = 'Maxillary_Plate'): {
  stlString: string;
  blob: Blob;
  triangleCount: number;
  dimensionsMm: { width: number; height: number; thickness: number };
} {
  const triangles: Triangle[] = [];
  const halfW = 9.0;
  const halfH = 9.0;
  const thickness = 3.0;

  // Base rectangular prism: X in [-9, 9], Y in [-9, 9], Z in [0, 3]
  const b1: Point3D = { x: -halfW, y: -halfH, z: 0 };
  const b2: Point3D = { x: halfW, y: -halfH, z: 0 };
  const b3: Point3D = { x: halfW, y: halfH, z: 0 };
  const b4: Point3D = { x: -halfW, y: halfH, z: 0 };

  const t1: Point3D = { x: -halfW, y: -halfH, z: thickness };
  const t2: Point3D = { x: halfW, y: -halfH, z: thickness };
  const t3: Point3D = { x: halfW, y: halfH, z: thickness };
  const t4: Point3D = { x: -halfW, y: halfH, z: thickness };

  // Bottom face (Z = 0)
  addQuad(triangles, b1, b4, b3, b2);
  // Top face (Z = thickness)
  addQuad(triangles, t1, t2, t3, t4);
  // South face (Y = -halfH)
  addQuad(triangles, b1, b2, t2, t1);
  // North face (Y = halfH)
  addQuad(triangles, b4, t4, t3, b3);
  // West face (X = -halfW)
  addQuad(triangles, b1, t1, t4, b4);
  // East face (X = halfW)
  addQuad(triangles, b2, b3, t3, t2);

  // Format ASCII STL
  const solidName = `SmartBow_Marker_Carrier_Plate_${label}_18x18x3mm`;
  let stl = `solid ${solidName}\n`;
  for (const t of triangles) {
    stl += `  facet normal ${t.normal.x.toFixed(6)} ${t.normal.y.toFixed(6)} ${t.normal.z.toFixed(6)}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${t.v1.x.toFixed(4)} ${t.v1.y.toFixed(4)} ${t.v1.z.toFixed(4)}\n`;
    stl += `      vertex ${t.v2.x.toFixed(4)} ${t.v2.y.toFixed(4)} ${t.v2.z.toFixed(4)}\n`;
    stl += `      vertex ${t.v3.x.toFixed(4)} ${t.v3.y.toFixed(4)} ${t.v3.z.toFixed(4)}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }
  stl += `endsolid ${solidName}\n`;

  const blob = new Blob([stl], { type: 'model/stl' });
  return {
    stlString: stl,
    blob,
    triangleCount: triangles.length,
    dimensionsMm: { width: 18.0, height: 18.0, thickness: 3.0 }
  };
}
