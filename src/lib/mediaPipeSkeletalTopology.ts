/**
 * MediaPipe 468 Face Mesh Canonical Skeletal Geometry & Landmark Topology
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 *
 * Provides anatomical wireframe connections, biomechanical struts, and visual
 * skeletal marker nodes conforming to the official MediaPipe Face Mesh topology.
 */

// 1. Craniofacial Silhouette / Facial Oval & Mandibular Border (36 landmarks)
export const SKELETON_FACIAL_OVAL: number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
];

// 2. Right Eye Skeletal Orbit (16 landmarks)
export const SKELETON_RIGHT_EYE_ORBIT: number[] = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33
];

// 3. Left Eye Skeletal Orbit (16 landmarks)
export const SKELETON_LEFT_EYE_ORBIT: number[] = [
  263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263
];

// 4. Supraorbital Eyebrow Ridges
export const SKELETON_RIGHT_EYEBROW: number[] = [70, 63, 105, 66, 107];
export const SKELETON_LEFT_EYEBROW: number[] = [300, 293, 334, 296, 336];

// 5. Nasal Skeleton & Alar Cartilage
export const SKELETON_NASAL_BRIDGE: number[] = [168, 6, 197, 195, 5, 4, 1];
export const SKELETON_NASAL_BASE: number[] = [98, 97, 2, 326, 327];

// 6. Oral Framework & Vermillion Borders
export const SKELETON_LIPS_OUTER: number[] = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61
];
export const SKELETON_LIPS_INNER: number[] = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78
];

// 7. Sagittal Facial Midline Spine
export const SKELETON_MIDLINE_SPINE: number[] = [10, 168, 6, 197, 1, 0, 13, 14, 17, 152];

// 8. Biomechanical Skeletal Struts (Pairs of [from, to])
export const SKELETON_STRUTS: Array<[number, number]> = [
  // Bipupillary horizontal strut
  [33, 133],
  [133, 168],
  [168, 362],
  [362, 263],
  // Zygomatic arches connecting lateral cheeks to nasal base
  [234, 93],
  [93, 1],
  [1, 323],
  [323, 454],
  // Camper's line / Ala-Tragus biomechanical struts
  [234, 168],
  [454, 168],
  // Mandibular angles (Gonion) to Chin (Menton)
  [234, 199],
  [199, 152],
  [454, 429],
  [429, 152],
  // Temporal struts
  [10, 67],
  [10, 297],
  [103, 70],
  [332, 300]
];

// Key anatomical landmark nodes for clinical verification tags
export interface SkeletalNodeInfo {
  id: number;
  label: string;
  category: 'CRANIUM' | 'ORBIT' | 'NASAL' | 'MAXILLA' | 'MANDIBLE';
  color: string;
}

export const VERIFIED_SKELETAL_NODES: SkeletalNodeInfo[] = [
  { id: 10, label: 'GLABELLA #10', category: 'CRANIUM', color: '#06b6d4' },
  { id: 168, label: 'NASION #168', category: 'CRANIUM', color: '#06b6d4' },
  { id: 1, label: 'SUBNASALE #1', category: 'MAXILLA', color: '#38bdf8' },
  { id: 152, label: 'MENTON #152 (JAW)', category: 'MANDIBLE', color: '#10b981' },
  { id: 33, label: 'PUPIL-R #33', category: 'ORBIT', color: '#a855f7' },
  { id: 263, label: 'PUPIL-L #263', category: 'ORBIT', color: '#a855f7' },
  { id: 234, label: 'ZYGOMA-R #234', category: 'CRANIUM', color: '#38bdf8' },
  { id: 454, label: 'ZYGOMA-L #454', category: 'CRANIUM', color: '#38bdf8' },
  { id: 0, label: 'STOMION (SUP)', category: 'MAXILLA', color: '#f59e0b' },
  { id: 17, label: 'STOMION (INF)', category: 'MANDIBLE', color: '#f59e0b' },
  { id: 61, label: 'COMMISSURE-R', category: 'MAXILLA', color: '#38bdf8' },
  { id: 291, label: 'COMMISSURE-L', category: 'MAXILLA', color: '#38bdf8' },
  { id: 199, label: 'GONION-R #199', category: 'MANDIBLE', color: '#34d399' },
  { id: 429, label: 'GONION-L #429', category: 'MANDIBLE', color: '#34d399' },
  { id: 4, label: 'PRONASALE #4', category: 'NASAL', color: '#22d3ee' }
];

/**
 * Renders complete MediaPipe Face Mesh visual skeletal markers and wireframe geometry
 */
export function drawMediaPipeSkeletalOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; z?: number }>,
  w: number,
  h: number,
  options: {
    showNodes?: boolean;
    showLabels?: boolean;
    showStruts?: boolean;
    vdoMm?: number;
    rollDeg?: number;
  } = {}
): void {
  if (!landmarks || landmarks.length < 468) return;

  const showNodes = options.showNodes !== false;
  const showLabels = options.showLabels !== false;
  const showStruts = options.showStruts !== false;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Helper to draw connected polyline paths
  const drawPolyline = (
    indices: number[],
    color: string,
    lineWidth: number,
    isClosed: boolean = false,
    dash: number[] = []
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    ctx.beginPath();
    let started = false;

    for (let i = 0; i < indices.length; i++) {
      const lm = landmarks[indices[i]];
      if (!lm) continue;
      const px = lm.x * w;
      const py = lm.y * h;
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }

    if (isClosed && started) {
      const firstLm = landmarks[indices[0]];
      if (firstLm) ctx.lineTo(firstLm.x * w, firstLm.y * h);
    }

    ctx.stroke();
    ctx.setLineDash([]);
  };

  // 1. Biomechanical Structural Struts (Semi-transparent cyan framework)
  if (showStruts) {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.40)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (const [startId, endId] of SKELETON_STRUTS) {
      const p1 = landmarks[startId];
      const p2 = landmarks[endId];
      if (p1 && p2) {
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 2. Craniofacial Silhouette & Mandibular Jawline Skeleton (Emerald green)
  drawPolyline(SKELETON_FACIAL_OVAL, '#10b981', 1.8, true);

  // 3. Eye Orbit Skeletal Cavities (Purple)
  drawPolyline(SKELETON_RIGHT_EYE_ORBIT, '#c084fc', 1.5, true);
  drawPolyline(SKELETON_LEFT_EYE_ORBIT, '#c084fc', 1.5, true);

  // 4. Supraorbital Eyebrow Ridges (Sky blue)
  drawPolyline(SKELETON_RIGHT_EYEBROW, '#38bdf8', 1.5, false);
  drawPolyline(SKELETON_LEFT_EYEBROW, '#38bdf8', 1.5, false);

  // 5. Nasal Skeleton & Alar Base (Cyan)
  drawPolyline(SKELETON_NASAL_BRIDGE, '#22d3ee', 1.6, false);
  drawPolyline(SKELETON_NASAL_BASE, '#06b6d4', 1.4, false);

  // 6. Oral Framework & Incisal Lip Aperture (Amber/Coral)
  drawPolyline(SKELETON_LIPS_OUTER, '#fb923c', 1.8, true);
  drawPolyline(SKELETON_LIPS_INNER, '#f59e0b', 1.2, true);

  // 7. Central Sagittal Midline Spine (Vibrant Amber/Gold)
  drawPolyline(SKELETON_MIDLINE_SPINE, '#f59e0b', 2.0, false, [5, 4]);

  // 8. High-density subtle skeletal joint nodes
  if (showNodes) {
    ctx.fillStyle = 'rgba(6, 182, 212, 0.65)';
    ctx.beginPath();
    // Render small joint dots on all skeletal indices
    const allSkeletalIndices = [
      ...SKELETON_FACIAL_OVAL,
      ...SKELETON_RIGHT_EYE_ORBIT,
      ...SKELETON_LEFT_EYE_ORBIT,
      ...SKELETON_RIGHT_EYEBROW,
      ...SKELETON_LEFT_EYEBROW,
      ...SKELETON_NASAL_BRIDGE,
      ...SKELETON_NASAL_BASE,
      ...SKELETON_LIPS_OUTER,
      ...SKELETON_LIPS_INNER
    ];

    for (const idx of allSkeletalIndices) {
      const lm = landmarks[idx];
      if (!lm) continue;
      const px = lm.x * w;
      const py = lm.y * h;
      ctx.moveTo(px + 1.8, py);
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    }
    ctx.fill();

    // 9. Verified Anatomical Landmark Markers (Prominent Target Nodes & Verification Tags)
    for (const node of VERIFIED_SKELETAL_NODES) {
      const lm = landmarks[node.id];
      if (!lm) continue;
      const px = lm.x * w;
      const py = lm.y * h;

      // Halo glow
      ctx.fillStyle = node.color;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(px, py, 6.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Inner solid target node
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // White center pin
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Clinical Landmark Label Tag
      if (showLabels) {
        ctx.font = 'bold 8.5px JetBrains Mono, monospace';
        const textW = ctx.measureText(node.label).width;
        const offsetY = (node.id === 152 || node.id === 199 || node.id === 429 || node.id === 17) ? 14 : -9;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(px - textW / 2 - 3, py + offsetY - 8, textW + 6, 11);

        ctx.fillStyle = node.color;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, px, py + offsetY);
      }
    }
  }

  // 10. Floating MediaPipe Skeletal Verification Watermark Badge
  const badgeW = 270;
  const badgeH = 22;
  const badgeX = w - badgeW - 12;
  const badgeY = h - badgeH - 12;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
  ctx.fill();
  ctx.stroke();

  // Green active dot
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(badgeX + 12, badgeY + badgeH / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 9.5px JetBrains Mono, monospace';
  ctx.fillStyle = '#22d3ee';
  ctx.textAlign = 'left';
  ctx.fillText('✓ MEDIAPIPE FACE MESH · SKELETAL RIG ACTIVE', badgeX + 22, badgeY + 15);

  ctx.restore();
}
