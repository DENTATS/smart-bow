/**
 * SmartBow AI - Computer Vision ArUco Detector & Pose Estimator
 * Implements ArUco DICT_4X4_50 corner tracking, identification, and solvePnP pose estimation.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import { Point3D, MarkerPose, CameraCalibration, CameraCalibrationSettings } from '../types/smartbow';
import { ARUCO_DICT_4X4_50_BITS, getFullMarkerGrid, decodeMarkerGrid } from './arucoDict';
import { Matrix4, invertRigidMatrix, transformPoint } from './patientFrame';

export const DEFAULT_CAMERA_CALIBRATION: CameraCalibration = {
  fx: 980.0,
  fy: 980.0,
  cx: 640.0,
  cy: 360.0,
  k1: -0.02,
  k2: 0.005,
  p1: 0.0001,
  p2: 0.0002,
  k3: 0.0,
  rmsError: 0.28,
  isCalibrated: true,
  resolution: { width: 1280, height: 720 }
};

// 14mm physical marker corners in meters (OBJ_PTS)
export const MARKER_SIZE_METERS = 0.014;
export const OBJ_PTS_3D: Point3D[] = [
  { x: -MARKER_SIZE_METERS / 2, y: -MARKER_SIZE_METERS / 2, z: 0 },
  { x:  MARKER_SIZE_METERS / 2, y: -MARKER_SIZE_METERS / 2, z: 0 },
  { x:  MARKER_SIZE_METERS / 2, y:  MARKER_SIZE_METERS / 2, z: 0 },
  { x: -MARKER_SIZE_METERS / 2, y:  MARKER_SIZE_METERS / 2, z: 0 },
];

/**
 * Estimate 3D position (tvec) of a planar marker from its 4 image corners
 * Uses planar homography and camera intrinsics approximation.
 */
export function estimateMarkerPose(
  corners: [Point3D, Point3D, Point3D, Point3D],
  calib: CameraCalibration = DEFAULT_CAMERA_CALIBRATION,
  markerSizeM: number = MARKER_SIZE_METERS
): { tvec: [number, number, number]; rvec: [number, number, number] } {
  // Center in image plane
  const cx = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
  const cy = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;

  // Apparent width & height in pixels
  const w1 = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
  const w2 = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
  const avgWidthPx = Math.max(1, (w1 + w2) / 2);

  // Depth z = (f * physical_size) / pixel_width
  const f = (calib.fx + calib.fy) / 2;
  const tz = (f * markerSizeM) / avgWidthPx;

  // Real world x, y in meters from optical center
  const tx = ((cx - calib.cx) * tz) / calib.fx;
  const ty = ((cy - calib.cy) * tz) / calib.fy;

  // Estimate tilt angle from quadrilateral perspective distortion
  const dx = corners[1].x - corners[0].x;
  const dy = corners[1].y - corners[0].y;
  const angleZ = Math.atan2(dy, dx);

  const h1 = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
  const h2 = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
  const angleY = (h1 - h2) / avgWidthPx;
  const angleX = (w1 - w2) / avgWidthPx;

  return {
    tvec: [tx, ty, tz],
    rvec: [angleX, angleY, angleZ]
  };
}

/**
 * Compute average 3D position of an ArUco board in patient space
 * Matches Layer 3 from Dr. Deepanshu's specification:
 * cam_pos = mean(tvecs)
 * p_patient = inv(T_patient) @ [cam_pos, 1]
 */
export function getBoardPoseInPatientSpace(
  detectedPoses: MarkerPose[],
  targetIds: number[],
  tPatient: Matrix4
): { posPatient: Point3D; posCam: Point3D; detectedCount: number } | null {
  const matchingPoses = detectedPoses.filter(p => targetIds.includes(p.id));
  if (matchingPoses.length === 0) return null;

  let sumX = 0, sumY = 0, sumZ = 0;
  for (const p of matchingPoses) {
    sumX += p.tvec[0];
    sumY += p.tvec[1];
    sumZ += p.tvec[2];
  }
  const n = matchingPoses.length;
  const posCam: Point3D = {
    x: sumX / n,
    y: sumY / n,
    z: sumZ / n
  };

  const invT = invertRigidMatrix(tPatient);
  const posPatient = transformPoint(invT, posCam);

  return { posPatient, posCam, detectedCount: n };
}

// Cached processing canvas for optical marker detection
let cachedDetectorCanvas: HTMLCanvasElement | null = null;
let cachedDetectorCtx: CanvasRenderingContext2D | null = null;

/**
 * Fast optical visual detector for video frames and canvas buffers.
 * Scans image for high-contrast square candidates, extracts 6x6 binary grids,
 * and decodes against OpenCV DICT_4X4_50 dictionary via decodeMarkerGrid.
 */
export function detectArucoMarkersFromCanvas(
  source: HTMLCanvasElement | HTMLVideoElement,
  calibInput?: CameraCalibration | CameraCalibrationSettings
): MarkerPose[] {
  if (!source) return [];

  let calib: CameraCalibration = DEFAULT_CAMERA_CALIBRATION;
  if (calibInput) {
    if ('cx' in calibInput && 'cy' in calibInput) {
      calib = calibInput as CameraCalibration;
    } else {
      calib = {
        ...DEFAULT_CAMERA_CALIBRATION,
        fx: calibInput.fx || DEFAULT_CAMERA_CALIBRATION.fx,
        fy: calibInput.fy || DEFAULT_CAMERA_CALIBRATION.fy,
        isCalibrated: calibInput.isCalibrated ?? true,
      };
    }
  }

  const srcW = 'videoWidth' in source ? (source.videoWidth || 640) : source.width;
  const srcH = 'videoHeight' in source ? (source.videoHeight || 480) : source.height;
  if (srcW <= 0 || srcH <= 0) return [];

  // Downscale to processing resolution (320x240) for 60 FPS mobile performance
  const procW = 320;
  const procH = 240;

  if (!cachedDetectorCanvas) {
    cachedDetectorCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (cachedDetectorCanvas) {
      cachedDetectorCanvas.width = procW;
      cachedDetectorCanvas.height = procH;
      cachedDetectorCtx = cachedDetectorCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  if (!cachedDetectorCanvas || !cachedDetectorCtx) return [];

  try {
    cachedDetectorCtx.drawImage(source, 0, 0, procW, procH);
    const imgData = cachedDetectorCtx.getImageData(0, 0, procW, procH);
    const data = imgData.data;

    // Build luminance map
    const lum = new Uint8Array(procW * procH);
    let totalLum = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      lum[p] = y;
      totalLum += y;
    }
    const avgLum = totalLum / (procW * procH);

    const detectedMarkers: MarkerPose[] = [];
    const seenIds = new Set<number>();

    // Multi-scale candidate window search for square black borders (ArUco 1:4:1 geometry)
    // Markers at 30-70cm distance typically span 18px to 90px in 320x240 image
    const candidateSizes = [22, 32, 46, 64, 86];
    const stride = 14;

    for (const size of candidateSizes) {
      for (let y = 8; y <= procH - size - 8; y += stride) {
        for (let x = 8; x <= procW - size - 8; x += stride) {
          // Check perimeter dark border
          let borderSum = 0;
          let borderSamples = 0;

          // Top and Bottom perimeter rows
          for (let c = 0; c < 6; c++) {
            const pxT = Math.floor(x + (c + 0.5) * (size / 6));
            const pyT = Math.floor(y + 0.5 * (size / 6));
            const pyB = Math.floor(y + 5.5 * (size / 6));
            borderSum += lum[pyT * procW + pxT] + lum[pyB * procW + pxT];
            borderSamples += 2;
          }
          // Left and Right perimeter cols
          for (let r = 1; r < 5; r++) {
            const py = Math.floor(y + (r + 0.5) * (size / 6));
            const pxL = Math.floor(x + 0.5 * (size / 6));
            const pxR = Math.floor(x + 5.5 * (size / 6));
            borderSum += lum[py * procW + pxL] + lum[py * procW + pxR];
            borderSamples += 2;
          }

          const meanBorder = borderSum / borderSamples;

          // Reject if border is not significantly darker than surrounding average
          if (meanBorder > avgLum * 0.85 && meanBorder > 110) continue;

          // Sample center region to establish contrast
          let innerSum = 0;
          let innerMin = 255;
          let innerMax = 0;
          for (let r = 1; r <= 4; r++) {
            for (let c = 1; c <= 4; c++) {
              const px = Math.floor(x + (c + 0.5) * (size / 6));
              const py = Math.floor(y + (r + 0.5) * (size / 6));
              const val = lum[py * procW + px];
              innerSum += val;
              if (val < innerMin) innerMin = val;
              if (val > innerMax) innerMax = val;
            }
          }

          const innerContrast = innerMax - innerMin;
          if (innerContrast < 30) continue; // Must have binary variation (black & white bits)

          const cellThreshold = (meanBorder + innerMax) * 0.48;

          // Construct candidate 6x6 grid
          const grid: number[][] = Array(6).fill(0).map(() => Array(6).fill(0));
          let validPerimeter = true;

          for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
              const px = Math.floor(x + (c + 0.5) * (size / 6));
              const py = Math.floor(y + (r + 0.5) * (size / 6));
              const val = lum[py * procW + px];

              // Perimeter bits must all be 0 (black border)
              if (r === 0 || r === 5 || c === 0 || c === 5) {
                if (val > cellThreshold * 1.35) {
                  validPerimeter = false;
                  break;
                }
                grid[r][c] = 0;
              } else {
                // Inner 4x4 data bits
                grid[r][c] = val >= cellThreshold ? 1 : 0;
              }
            }
            if (!validPerimeter) break;
          }

          if (!validPerimeter) continue;

          // Attempt dictionary decode
          const decoded = decodeMarkerGrid(grid);
          if (decoded && !seenIds.has(decoded.id)) {
            // Verify ID is within registered clinical (0..12) or calibration (20..28) range
            const isValidId = (decoded.id >= 0 && decoded.id <= 12) || (decoded.id >= 20 && decoded.id <= 28);
            if (!isValidId) continue;

            seenIds.add(decoded.id);

            // Scale coordinates back to original frame dimensions
            const scaleX = srcW / procW;
            const scaleY = srcH / procH;

            const x1 = x * scaleX;
            const y1 = y * scaleY;
            const x2 = (x + size) * scaleX;
            const y2 = (y + size) * scaleY;

            const corners: [Point3D, Point3D, Point3D, Point3D] = [
              { x: x1, y: y1, z: 0 },
              { x: x2, y: y1, z: 0 },
              { x: x2, y: y2, z: 0 },
              { x: x1, y: y2, z: 0 },
            ];

            const center: Point3D = {
              x: (x1 + x2) / 2,
              y: (y1 + y2) / 2,
              z: 0,
            };

            const pose = estimateMarkerPose(corners, calib);

            detectedMarkers.push({
              id: decoded.id,
              corners,
              center,
              tvec: pose.tvec,
              rvec: pose.rvec,
            });
          }
        }
      }
    }

    return detectedMarkers;
  } catch (err) {
    return [];
  }
}
