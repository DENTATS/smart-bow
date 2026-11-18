#!/usr/bin/env python3
"""
SmartBow Zero — Phase 1C OpenCV Ground-Truth Golden Generator (tools/gen_golden.py)

Generates a deterministic, verifiable golden test suite using real OpenCV (`cv2.aruco`)
for `DICT_4X4_50` and `DICT_6X6_250`, covering all 13 synthetic image categories:
  1. Dictionary parity across all 50 IDs (0–49) of DICT_4X4_50
  2. Single maxillary marker (ID 3)
  3. Single mandibular marker (ID 7)
  4. Complete maxillary group (IDs 3, 4, 5, 6)
  5. Complete mandibular group (IDs 7, 8, 9, 10)
  6. Both groups together (IDs 3–10)
  7. Marker side lengths: 8, 10, 12, 14, 16, 20, 26, 36, 60 px
  8. Rotations: 0° and 25°
  9. Blur: 0 and 0.8 px
  10. Noise: sigma 0 and sigma 2
  11. Blank and uniform images
  12. Incorrect DICT_6X6_250 markers
  13. 300 seeded random block images (false-positive rejection verification)

Usage:
  python tools/gen_golden.py --out test/golden
"""

import argparse
import json
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np


def make_opencv_detector(dict_id: int) -> Tuple[Any, Any]:
    dictionary = cv2.aruco.getPredefinedDictionary(dict_id)
    params = cv2.aruco.DetectorParameters()
    params.minMarkerPerimeterRate = 0.015
    params.adaptiveThreshWinSizeMin = 3
    params.adaptiveThreshWinSizeMax = 23
    params.adaptiveThreshWinSizeStep = 4
    params.adaptiveThreshConstant = 7.0
    params.minCornerDistanceRate = 0.02
    params.minDistanceToBorder = 1
    detector = cv2.aruco.ArucoDetector(dictionary, params)
    return dictionary, detector


def render_marker_on_canvas(
    dictionary: Any,
    marker_id: int,
    side_px: int,
    canvas_w: int,
    canvas_h: int,
    center_x: float,
    center_y: float,
    angle_deg: float = 0.0,
    bg_gray: int = 235,
    fg_black: int = 12,
    fg_white: int = 242,
) -> Tuple[np.ndarray, List[List[float]]]:
    """
    Renders a single ArUco marker onto a grayscale canvas using high-precision
    inverse affine warp (supersampled for clean edges) and returns the image
    plus the 4 ground-truth corner coordinates [TL, TR, BR, BL].
    """
    canvas = np.full((canvas_h, canvas_w), bg_gray, dtype=np.uint8)
    place_marker_in_place(
        canvas,
        dictionary,
        marker_id,
        side_px,
        center_x,
        center_y,
        angle_deg,
        bg_gray,
        fg_black,
        fg_white,
    )
    corners = compute_ground_truth_corners(center_x, center_y, side_px, angle_deg)
    return canvas, corners


def compute_ground_truth_corners(
    center_x: float, center_y: float, side_px: float, angle_deg: float
) -> List[List[float]]:
    half = side_px / 2.0
    rad = math.radians(angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    local_pts = [(-half, -half), (half, -half), (half, half), (-half, half)]
    corners: List[List[float]] = []
    for lx, ly in local_pts:
        rx = center_x + lx * cos_a - ly * sin_a
        ry = center_y + lx * sin_a + ly * cos_a
        corners.append([round(rx, 3), round(ry, 3)])
    return corners


def place_marker_in_place(
    canvas: np.ndarray,
    dictionary: Any,
    marker_id: int,
    side_px: int,
    center_x: float,
    center_y: float,
    angle_deg: float = 0.0,
    bg_gray: int = 235,
    fg_black: int = 12,
    fg_white: int = 242,
) -> None:
    # Generate canonical binary marker grid from OpenCV (6x6 for 4x4_50, 8x8 for 6x6_250)
    grid_cells = dictionary.markerSize + 2
    raw_grid = cv2.aruco.generateImageMarker(dictionary, marker_id, grid_cells)

    h, w = canvas.shape
    half = side_px / 2.0
    quiet_half = half * (1.0 + 2.0 / grid_cells)
    rad = math.radians(angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)

    bound = int(math.ceil(quiet_half * 1.45)) + 2
    x0 = max(0, int(math.floor(center_x - bound)))
    x1 = min(w - 1, int(math.ceil(center_x + bound)))
    y0 = max(0, int(math.floor(center_y - bound)))
    y1 = min(h - 1, int(math.ceil(center_y + bound)))

    # 3x3 subpixel area anti-aliasing for rotated markers; exact pixel sampling for 0 deg
    sub_pts = [-0.25, 0.0, 0.25] if abs(angle_deg) > 1e-3 else [0.0]
    n_samples = len(sub_pts) * len(sub_pts)

    for py in range(y0, y1 + 1):
        for px in range(x0, x1 + 1):
            accum = 0.0
            touched = False
            for sy in sub_pts:
                for sx in sub_pts:
                    dx = (px + 0.5 + sx) - center_x
                    dy = (py + 0.5 + sy) - center_y
                    lx = dx * cos_a + dy * sin_a
                    ly = -dx * sin_a + dy * cos_a
                    if abs(lx) <= quiet_half and abs(ly) <= quiet_half:
                        touched = True
                        if abs(lx) <= half and abs(ly) <= half:
                            u = ((lx + half) / side_px) * grid_cells
                            v = ((ly + half) / side_px) * grid_cells
                            col = min(grid_cells - 1, max(0, int(math.floor(u))))
                            row = min(grid_cells - 1, max(0, int(math.floor(v))))
                            accum += fg_white if raw_grid[row, col] > 127 else fg_black
                        else:
                            accum += bg_gray
                    else:
                        accum += float(canvas[py, px])
            if touched:
                canvas[py, px] = int(round(accum / n_samples))


def run_opencv_detect(detector: Any, gray: np.ndarray) -> Tuple[List[int], List[List[List[float]]]]:
    corners, ids, _ = detector.detectMarkers(gray)
    if ids is None or len(ids) == 0:
        return [], []
    det_pairs = []
    for i, m_id in enumerate(ids.flatten()):
        pts = corners[i][0].tolist()
        det_pairs.append((int(m_id), [[round(float(p[0]), 3), round(float(p[1]), 3)] for p in pts]))
    det_pairs.sort(key=lambda item: item[0])
    return [p[0] for p in det_pairs], [p[1] for p in det_pairs]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate OpenCV ArUco golden test vectors.")
    parser.add_argument("--out", type=str, default="test/golden", help="Output directory for golden dataset")
    args = parser.parse_args()

    out_dir = Path(args.out)
    frames_dir = out_dir / "frames"
    png_dir = out_dir / "png"
    frames_dir.mkdir(parents=True, exist_ok=True)
    png_dir.mkdir(parents=True, exist_ok=True)

    dict_4x4, det_4x4 = make_opencv_detector(cv2.aruco.DICT_4X4_50)
    dict_6x6, _ = make_opencv_detector(cv2.aruco.DICT_6X6_250)

    # 1. Extract all 50 canonical 6x6 bit grids (0..49) from OpenCV DICT_4X4_50
    dictionary_grids: Dict[str, List[List[int]]] = {}
    for marker_id in range(50):
        img6 = cv2.aruco.generateImageMarker(dict_4x4, marker_id, 6)
        grid = [[1 if int(img6[r, c]) > 127 else 0 for c in range(6)] for r in range(6)]
        dictionary_grids[str(marker_id)] = grid

    cases: List[Dict[str, Any]] = []
    frame_blob_parts: List[bytes] = []
    current_offset = 0

    def register_case(
        case_id: str,
        category: str,
        gray: np.ndarray,
        expected_ids: List[int],
        planted_corners: Dict[str, List[List[float]]],
        meta: Dict[str, Any],
        save_png: bool = False,
    ) -> None:
        nonlocal current_offset
        cv_ids, cv_corners = run_opencv_detect(det_4x4, gray)
        raw_bytes = gray.tobytes()
        h, w = gray.shape
        entry = {
            "id": case_id,
            "category": category,
            "width": int(w),
            "height": int(h),
            "byteOffset": current_offset,
            "byteLength": len(raw_bytes),
            "expectedIds": expected_ids,
            "plantedCorners": planted_corners,
            "opencvDetectedIds": cv_ids,
            "opencvCorners": cv_corners,
            "meta": meta,
        }
        cases.append(entry)
        frame_blob_parts.append(raw_bytes)
        current_offset += len(raw_bytes)
        if save_png:
            cv2.imwrite(str(png_dir / f"{case_id}.png"), gray)

    # Category 1: All 50 DICT_4X4_50 IDs (0..49) rendered at 48px
    for marker_id in range(50):
        canvas, gt_corners = render_marker_on_canvas(dict_4x4, marker_id, 48, 128, 128, 64.0, 64.0, 0.0)
        register_case(
            f"dict_id_{marker_id:02d}",
            "DICT_PARITY_50",
            canvas,
            [marker_id],
            {str(marker_id): gt_corners},
            {"markerId": marker_id, "sidePx": 48},
            save_png=(marker_id in (0, 3, 7, 11, 20, 49)),
        )

    # Category 2: Single maxillary marker (ID 3)
    c_max1, gt_max1 = render_marker_on_canvas(dict_4x4, 3, 36, 160, 160, 80.0, 80.0, 0.0)
    register_case("single_maxilla_id3", "SINGLE_MAXILLA", c_max1, [3], {"3": gt_max1}, {"sidePx": 36}, save_png=True)

    # Category 3: Single mandibular marker (ID 7)
    c_mand1, gt_mand1 = render_marker_on_canvas(dict_4x4, 7, 36, 160, 160, 80.0, 80.0, 0.0)
    register_case("single_mandible_id7", "SINGLE_MANDIBLE", c_mand1, [7], {"7": gt_mand1}, {"sidePx": 36}, save_png=True)

    # Category 4: Complete maxillary group (IDs 3, 4, 5, 6)
    c_max_grp = np.full((240, 240), 235, dtype=np.uint8)
    max_gt: Dict[str, List[List[float]]] = {}
    for m_id, (cx, cy) in zip([3, 4, 5, 6], [(75.0, 75.0), (165.0, 75.0), (75.0, 165.0), (165.0, 165.0)]):
        place_marker_in_place(c_max_grp, dict_4x4, m_id, 42, cx, cy, 0.0)
        max_gt[str(m_id)] = compute_ground_truth_corners(cx, cy, 42, 0.0)
    register_case("group_maxilla_3_6", "GROUP_MAXILLA", c_max_grp, [3, 4, 5, 6], max_gt, {"sidePx": 42}, save_png=True)

    # Category 5: Complete mandibular group (IDs 7, 8, 9, 10)
    c_mand_grp = np.full((240, 240), 235, dtype=np.uint8)
    mand_gt: Dict[str, List[List[float]]] = {}
    for m_id, (cx, cy) in zip([7, 8, 9, 10], [(75.0, 75.0), (165.0, 75.0), (75.0, 165.0), (165.0, 165.0)]):
        place_marker_in_place(c_mand_grp, dict_4x4, m_id, 42, cx, cy, 0.0)
        mand_gt[str(m_id)] = compute_ground_truth_corners(cx, cy, 42, 0.0)
    register_case("group_mandible_7_10", "GROUP_MANDIBLE", c_mand_grp, [7, 8, 9, 10], mand_gt, {"sidePx": 42}, save_png=True)

    # Category 6: Both groups together (IDs 3–10)
    c_both = np.full((260, 440), 235, dtype=np.uint8)
    both_gt: Dict[str, List[List[float]]] = {}
    positions_both = [
        (3, 75.0, 80.0), (4, 155.0, 80.0), (5, 75.0, 170.0), (6, 155.0, 170.0),
        (7, 285.0, 80.0), (8, 365.0, 80.0), (9, 285.0, 170.0), (10, 365.0, 170.0),
    ]
    for m_id, cx, cy in positions_both:
        place_marker_in_place(c_both, dict_4x4, m_id, 40, cx, cy, 0.0)
        both_gt[str(m_id)] = compute_ground_truth_corners(cx, cy, 40, 0.0)
    register_case("group_both_3_10", "GROUP_BOTH", c_both, [3, 4, 5, 6, 7, 8, 9, 10], both_gt, {"sidePx": 40}, save_png=True)

    # Categories 7, 8, 9, 10: Scale (8..60px) x Rotation (0°, 25°) x Blur (0, 0.8px) x Noise (0, sigma 2)
    side_lengths = [8, 10, 12, 14, 16, 20, 26, 36, 60]
    rotations = [0.0, 25.0]
    blurs = [0.0, 0.8]
    noises = [0.0, 2.0]
    clinical_rim_ids = [3, 4, 5, 6, 7, 8, 9, 10]

    rng_sweep = np.random.default_rng(424242)
    for side_px in side_lengths:
        canvas_dim = max(96, side_px * 3 + 32)
        center_xy = canvas_dim / 2.0
        for rot in rotations:
            for blur_sigma in blurs:
                for noise_sigma in noises:
                    # Test both a maxillary (ID 3 or 5) and mandibular (ID 7 or 9) marker for every condition
                    test_ids = [3, 7] if side_px in (8, 10, 12, 14, 16, 20) else [clinical_rim_ids[side_px % 8]]
                    for m_id in test_ids:
                        img, gt_c = render_marker_on_canvas(
                            dict_4x4, m_id, side_px, canvas_dim, canvas_dim, center_xy, center_xy, rot
                        )
                        if blur_sigma > 0:
                            img = cv2.GaussianBlur(img, (3, 3), blur_sigma)
                        if noise_sigma > 0:
                            noise = rng_sweep.normal(0.0, noise_sigma, img.shape)
                            img = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)
                        cid = f"sweep_s{side_px}_r{int(rot)}_b{str(blur_sigma).replace('.', 'p')}_n{int(noise_sigma)}_id{m_id}"
                        register_case(
                            cid,
                            "SWEEP_SCALE_ROT_BLUR_NOISE",
                            img,
                            [m_id],
                            {str(m_id): gt_c},
                            {
                                "markerId": m_id,
                                "sidePx": side_px,
                                "rotationDeg": rot,
                                "blurSigma": blur_sigma,
                                "noiseSigma": noise_sigma,
                            },
                            save_png=(side_px in (10, 14, 36) and rot == 25.0 and blur_sigma == 0.8 and noise_sigma == 2.0 and m_id == 3),
                        )

    # Category 11: Blank and uniform images
    for gray_val, label in [(0, "black_0"), (18, "dark_18"), (128, "mid_128"), (235, "light_235"), (255, "white_255")]:
        blank = np.full((120, 160), gray_val, dtype=np.uint8)
        register_case(f"blank_{label}", "BLANK_UNIFORM", blank, [], {}, {"grayLevel": gray_val})

    # Category 12: Incorrect DICT_6X6_250 markers
    for m_id in range(6):
        c_wrong, _ = render_marker_on_canvas(dict_6x6, m_id, 56, 140, 140, 70.0, 70.0, 0.0)
        register_case(
            f"wrong_dict_6x6_id{m_id}",
            "WRONG_DICT_6X6_250",
            c_wrong,
            [],
            {},
            {"wrongDict": "DICT_6X6_250", "foreignId": m_id, "sidePx": 56},
            save_png=(m_id == 0),
        )

    # Build set of all valid DICT_4X4_50 inner 4x4 bit tuples (across all 4 rotations) and 1-bit neighbors
    valid_inner_patterns = set()
    for g6 in dictionary_grids.values():
        inner4 = np.array([[g6[r + 1][c + 1] for c in range(4)] for r in range(4)], dtype=np.uint8)
        for rot_k in range(4):
            rot_m = np.rot90(inner4, rot_k)
            bits16 = tuple(int(x) for x in rot_m.flatten())
            valid_inner_patterns.add(bits16)
            # Also exclude 1-bit Hamming neighbors so random grids are guaranteed non-dictionary patterns
            for flip_idx in range(16):
                lst = list(bits16)
                lst[flip_idx] = 1 - lst[flip_idx]
                valid_inner_patterns.add(tuple(lst))

    # Category 13: 300 seeded random block images (guaranteed non-DICT_4X4_50 patterns + random noise blocks)
    for seed_idx in range(300):
        rng = np.random.default_rng(10000 + seed_idx)
        canvas = np.full((128, 128), 232, dtype=np.uint8)
        mode_type = seed_idx % 3
        if mode_type == 0:
            # Random 6x6 block with black border whose inner 4x4 is at least Hamming distance 2 from all DICT_4X4_50 IDs
            while True:
                inner = rng.integers(0, 2, size=(4, 4), dtype=np.uint8)
                if tuple(int(x) for x in inner.flatten()) not in valid_inner_patterns:
                    break
            side = int(rng.choice([24, 36, 48]))
            x0 = (128 - side) // 2
            y0 = (128 - side) // 2
            cell = side / 6.0
            for r in range(6):
                for c in range(6):
                    bit = 0 if (r in (0, 5) or c in (0, 5)) else int(inner[r - 1, c - 1])
                    val = 240 if bit == 1 else 15
                    cy0 = int(round(y0 + r * cell))
                    cy1 = int(round(y0 + (r + 1) * cell))
                    cx0 = int(round(x0 + c * cell))
                    cx1 = int(round(x0 + (c + 1) * cell))
                    canvas[cy0:cy1, cx0:cx1] = val
        elif mode_type == 1:
            # Random 6x6 block with corrupted white border (9 white non-corner border cells > MAX_BORDER_ERRORS=7)
            while True:
                inner = rng.integers(0, 2, size=(4, 4), dtype=np.uint8)
                if tuple(int(x) for x in inner.flatten()) not in valid_inner_patterns:
                    break
            grid6 = np.zeros((6, 6), dtype=np.uint8)
            grid6[1:5, 1:5] = inner
            non_corner_border = [
                (0, 1), (0, 2), (0, 3), (0, 4),
                (5, 1), (5, 2), (5, 3), (5, 4),
                (1, 0),
            ]
            for r, c in non_corner_border:
                grid6[r, c] = 1
            side = 42
            x0 = (128 - side) // 2
            y0 = (128 - side) // 2
            cell = side / 6.0
            for r in range(6):
                for c in range(6):
                    val = 240 if int(grid6[r, c]) == 1 else 15
                    cy0 = int(round(y0 + r * cell))
                    cy1 = int(round(y0 + (r + 1) * cell))
                    cx0 = int(round(x0 + c * cell))
                    cx1 = int(round(x0 + (c + 1) * cell))
                    canvas[cy0:cy1, cx0:cx1] = val
        else:
            # Random coarse checkerboard / salt-and-pepper blocks across image
            blocks = rng.integers(20, 235, size=(16, 16), dtype=np.uint8)
            canvas = cv2.resize(blocks, (128, 128), interpolation=cv2.INTER_NEAREST)

        register_case(
            f"random_block_{seed_idx:03d}",
            "RANDOM_BLOCKS_300",
            canvas,
            [],
            {},
            {"seed": 10000 + seed_idx, "mode": mode_type},
        )

    blob_path = frames_dir / "golden_frames.bin"
    with open(blob_path, "wb") as bf:
        for part in frame_blob_parts:
            bf.write(part)

    manifest = {
        "generator": "tools/gen_golden.py",
        "opencvVersion": cv2.__version__,
        "dictionary": "DICT_4X4_50",
        "totalCases": len(cases),
        "blobFile": "frames/golden_frames.bin",
        "dictionaryGrids": dictionary_grids,
        "cases": cases,
    }

    manifest_path = out_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest, mf, indent=2)

    print(f"[gen_golden.py] OpenCV {cv2.__version__}: Generated {len(cases)} golden test cases in {out_dir}")


if __name__ == "__main__":
    main()
