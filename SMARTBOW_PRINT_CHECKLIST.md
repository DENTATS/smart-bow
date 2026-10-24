# SmartBow AI — Single-Page Print & Verification Checklist
**Document Reference:** SB-CHK-01-REV-B  
**Engineering Discipline:** Metrology, Print Production & Quality Assurance  

---

### Phase A: Print Environment Preparation
- [ ] **Paper Selection:** 120–160 gsm bright white non-glare matte paper or synthetic polyester sheet (tear-proof, saliva-resistant).
- [ ] **Printer Type:** Laser printer (preferred for dimensional stability across relative humidity changes) or high-resolution inkjet (>= 600 DPI).
- [ ] **Print Dialog Driver Settings:**
  - Page Sizing: **Actual Size** (or `Scale: 100%`).
  - Scaling Override: Verify that `Fit to Printable Area`, `Shrink oversized pages`, and browser zoom are strictly **DISABLED**.
  - Margins: Standard/Minimum (sheet layout is pre-centered within standard A4 printable margins).

---

### Phase B: Physical Caliper Metric Verification
- [ ] **Instrument:** Calibrated digital vernier caliper with 0.01 mm readout.
- [ ] **100.0 mm Check Scale Verification:**
  - Measure distance from outer tick $0\text{ mm}$ to outer tick $100\text{ mm}$.
  - Stated Tolerance: $100.0 \pm 0.2\text{ mm}$ ($99.8\text{ mm}$ to $100.2\text{ mm}$).
  - *Actual Measured Dimension:* __________._____ mm.
  - Decision: [ ] PASS (Proceed)  |  [ ] FAIL (Reprint with zero driver scaling).
- [ ] **Individual ArUco Outer Dimension Check:**
  - Measure single marker square (black border to black border).
  - Stated Dimension: $6.50 \pm 0.05\text{ mm}$.
  - *Actual Measured Dimension:* __________._____ mm.
- [ ] **Marker Array Center-to-Center Pitch Check:**
  - Measure distance between centers of ArUco 3 and ArUco 4.
  - Stated Dimension: $7.50 \pm 0.05\text{ mm}$ (outer span: $14.00 \pm 0.10\text{ mm}$).
  - *Actual Measured Dimension:* __________._____ mm.

---

### Phase C: Optical & Polarity Inspection
- [ ] **Solid Black Perimeter Border:** Confirm each ArUco marker has a 1-bit solid black enclosing border without dropout or clipping.
- [ ] **Binary Code Polarity:** Confirm internal cells match OpenCV DICT_4X4_50 layout (bit 0 = black `#000000`, bit 1 = white `#ffffff`).
- [ ] **No Text Overlap:** Confirm human-readable text labels (`M3`, `M4`, `M5`, `M6` / `M7`, `M8`, `M9`, `M10`) are outside the quiet zone.
- [ ] **No Lossy Compression Artifacts:** Verify absence of JPEG ringing or color fringing around high-contrast bit transitions.

---

### Phase D: Physical Plate Assembly & Clinical Sanitization
- [ ] **Plate Substrate:** $18.0 \times 18.0 \times 3.0\text{ mm}$ medical-grade clear cast PMMA acrylic plate.
- [ ] **Safety Chamfer:** $0.5\text{ mm}$ rounded chamfer on all mucosal contacting edges.
- [ ] **Adhesive Bond:** Thin uniform medical-grade cyanoacrylate or double-sided acrylic adhesive film.
- [ ] **Moisture Sealing:** Waterproof UV clear laminate film covering the paper face.
- [ ] **Disinfection:** Wipe surface with 70% isopropyl alcohol wipe (do not autoclave paper-faced assemblies).

---

### Phase E: Chairside Live Scanner Readiness
- [ ] **Marker Verification Checkbox:** Toggled to `100mm Scale: Verified ✓` in SmartBow Live Scanner HUD.
- [ ] **Diagnostic State Banner:** Confirm state reads `READY_FOR_ENGINEERING_TEST`.
- [ ] **Prototype Boundary Acknowledged:** Acknowledge that the system is an experimental engineering research prototype and does not replace conventional prosthodontic checkpoints.

**Signed by Operator:** ___________________________  
**Date & Time:** _________________________________
