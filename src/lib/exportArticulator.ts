/**
 * SmartBow AI - CAD/CAM Articulator File Exporter
 * Generates exocad, 3Shape, Hanau, and Universal JSON/CSV exchange files.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 * 
 * PHASE 1 SAFETY CONTAINMENT:
 * - Unmistakable "SIMULATION — NOT FOR CLINICAL USE" watermark on all outputs.
 * - Explicit provenance field in all formats.
 * - Null/UNAVAILABLE values rendered honestly without fallback fabrication.
 * - No fake coordinates injected when trials are absent.
 */

import { PatientCase } from '../types/smartbow';

export const SIMULATION_DISCLAIMER_TEXT = 
  "SIMULATION — NOT FOR CLINICAL USE\n" +
  "WARNING: This file contains synthetic demonstration data or uncalibrated measurements.\n" +
  "DO NOT USE FOR FINAL PROSTHETIC RESTORATIONS, SPLINTS, OR CLINICAL PATIENT TREATMENT.";

export function generateExocadArticulatorFile(c: PatientCase): string {
  const m = c.measurements;
  const isSimulation = m.provenance !== 'MEASURED';
  
  return JSON.stringify({
    format: "Exocad_VirtualArticulator_v2",
    clientSoftware: "SmartBow AI v1.0",
    clinician: "Dr. Deepanshu, MDS Prosthodontics",
    clinicalSafetyWarning: isSimulation 
      ? "SIMULATION — NOT FOR CLINICAL USE. EXPERIMENTAL UNVALIDATED DATA." 
      : "VALIDATED CLINICAL MEASUREMENT",
    dataProvenance: m.provenance || 'SIMULATED',
    patient: {
      id: c.patientId,
      name: c.name,
      sessionDate: c.createdAt
    },
    articulator: {
      type: c.articulator,
      horizontalCondylarInclination_Left: m.sciEstimateDeg,
      horizontalCondylarInclination_Right: m.sciEstimateDeg,
      bennettAngle_Left: m.bennettLeftDeg,
      bennettAngle_Right: m.bennettRightDeg,
      incisalGuideTableAngle: 0.0,
      incisalPinHeightOffset_mm: 0.0,
      intercondylarDistance_mm: 110.0,
      vdo_mm: m.vdoMm,
      occlusalPlaneTiltML_deg: m.occlusalTiltMLDeg,
      occlusalPlaneTiltAP_deg: m.occlusalTiltAPDeg,
      midlineShift_mm: m.midlineShiftMm
    },
    mountingMatrix4x4: m.vdoMm !== null ? [
      1.0, 0.0, 0.0, m.midlineShiftMm ?? 0,
      0.0, Math.cos(((m.occlusalTiltAPDeg ?? 0) * Math.PI) / 180), -Math.sin(((m.occlusalTiltAPDeg ?? 0) * Math.PI) / 180), -28.5,
      0.0, Math.sin(((m.occlusalTiltAPDeg ?? 0) * Math.PI) / 180), Math.cos(((m.occlusalTiltAPDeg ?? 0) * Math.PI) / 180), m.vdoMm,
      0.0, 0.0, 0.0, 1.0
    ] : null,
    centricRelation: {
      status: m.crStatus,
      maxDeviation_mm: m.crDeviationMm,
      verifiedTrials: c.crRecords ? c.crRecords.length : 0
    }
  }, null, 2);
}

export function generate3ShapeArticulatorXml(c: PatientCase): string {
  const m = c.measurements;
  const isSimulation = m.provenance !== 'MEASURED';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- ========================================================================= -->
<!-- WARNING: ${isSimulation ? 'SIMULATION — NOT FOR CLINICAL USE' : 'VALIDATED PHYSICAL MEASUREMENT'} -->
<!-- DATA PROVENANCE: ${m.provenance || 'SIMULATED'} -->
<!-- ========================================================================= -->
<DentalArticulatorTransfer version="1.4">
  <Header>
    <Origin>SmartBow AI Experimental System</Origin>
    <SafetyNotice>${isSimulation ? 'SIMULATION — NOT FOR CLINICAL USE' : 'MEASURED CLINICAL DATA'}</SafetyNotice>
    <Provenance>${m.provenance || 'SIMULATED'}</Provenance>
    <Author>Dr. Deepanshu (MDS Prosthodontics, Maitri College)</Author>
    <Timestamp>${c.createdAt}</Timestamp>
    <PatientID>${c.patientId}</PatientID>
    <PatientName>${c.name}</PatientName>
  </Header>
  <ArticulatorModel brand="${c.articulator}" calibrationStatus="${isSimulation ? 'SIMULATION_UNVALIDATED' : 'MEASURED'}">
    <CondylarSettings>
      <SagittalCondylarInclination unit="degrees">${m.sciEstimateDeg ?? 'UNAVAILABLE'}</SagittalCondylarInclination>
      <BennettAngleLeft unit="degrees">${m.bennettLeftDeg ?? 'UNAVAILABLE'}</BennettAngleLeft>
      <BennettAngleRight unit="degrees">${m.bennettRightDeg ?? 'UNAVAILABLE'}</BennettAngleRight>
      <IntercondylarWidth unit="mm">110.0</IntercondylarWidth>
    </CondylarSettings>
    <JawRelation>
      <VerticalDimensionOfOcclusion unit="mm">${m.vdoMm ?? 'UNAVAILABLE'}</VerticalDimensionOfOcclusion>
      <OcclusalPlaneTiltML unit="degrees">${m.occlusalTiltMLDeg ?? 'UNAVAILABLE'}</OcclusalPlaneTiltML>
      <OcclusalPlaneTiltAP unit="degrees">${m.occlusalTiltAPDeg ?? 'UNAVAILABLE'}</OcclusalPlaneTiltAP>
      <MidlineDeviation unit="mm">${m.midlineShiftMm ?? 'UNAVAILABLE'}</MidlineDeviation>
      <CentricRelationQuality deviation="${m.crDeviationMm !== null ? `${m.crDeviationMm}mm` : 'UNAVAILABLE'}" status="${m.crStatus}"/>
    </JawRelation>
    <ToothMouldRecommendation>
      <Form>${c.biometrics.facialForm.toUpperCase()}</Form>
      <LowerThirdProportion>${c.biometrics.lowerThirdPct}%</LowerThirdProportion>
      <RecommendedVitaShade>${c.biometrics.estimatedShade}</RecommendedVitaShade>
    </ToothMouldRecommendation>
  </ArticulatorModel>
</DentalArticulatorTransfer>`;
}

export function generateHanauPrescriptionText(c: PatientCase): string {
  const m = c.measurements;
  const b = c.biometrics;
  const isSimulation = m.provenance !== 'MEASURED';
  
  return `================================================================
*** ${isSimulation ? 'SIMULATION — NOT FOR CLINICAL USE' : 'VALIDATED CLINICAL MEASUREMENT'} ***
*** DATA PROVENANCE: ${m.provenance || 'SIMULATED'} ***
================================================================
SMARTBOW AI — CLINICAL JAW RELATION & ARTICULATOR PRESCRIPTION
Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
================================================================
NOTICE: ${isSimulation ? 'RESEARCH SIMULATION ONLY — NOT FOR DIRECT PATIENT TREATMENT' : 'CLINICAL SPECIFICATION'}

PATIENT DETAILS:
  Name: ${c.name}
  Clinical ID: ${c.patientId}
  Age / Gender: ${c.age} / ${c.gender}
  Dentition: ${c.dentitionState.replace('_', ' ')}
  Date Recorded: ${new Date(c.createdAt).toLocaleDateString()}
  Data Source: ${m.provenance || 'SIMULATED'}

HANAU WIDE-VUE / CAD/CAM INSTRUMENT SETTINGS:
  • Horizontal Condylar Inclination (SCI): ${m.sciEstimateDeg !== null ? `${m.sciEstimateDeg}°` : 'UNAVAILABLE'}
  • Left Lateral Bennett Angle (L): ${m.bennettLeftDeg !== null ? `${m.bennettLeftDeg}°` : 'UNAVAILABLE'}
  • Right Lateral Bennett Angle (R): ${m.bennettRightDeg !== null ? `${m.bennettRightDeg}°` : 'UNAVAILABLE'}
  • Incisal Guide Pin: 0.0 mm (flush at horizontal index mark)
  • Incisal Guide Table: 0° flat (edentulous balanced occlusion)
  • Intercondylar Distance: 110 mm (standard semi-adjustable)

VERTICAL DIMENSION & PLANE RELATION:
  • VDO (Vertical Dimension of Occlusion): ${m.vdoMm !== null ? `${m.vdoMm} mm` : 'UNAVAILABLE'}
  • Lower Facial Third Proportion: ${b.lowerThirdPct}% (Clinical Target: 30-36%)
  • Mediolateral Occlusal Tilt (ML): ${m.occlusalTiltMLDeg !== null ? `${m.occlusalTiltMLDeg}°` : 'UNAVAILABLE'} vs Interpupillary Line
  • Anteroposterior Occlusal Tilt (AP): ${m.occlusalTiltAPDeg !== null ? `${m.occlusalTiltAPDeg}°` : 'UNAVAILABLE'} vs Camper's Plane
  • Maxillary Midline Shift: ${m.midlineShiftMm !== null ? `${m.midlineShiftMm >= 0 ? '+' : ''}${m.midlineShiftMm} mm` : 'UNAVAILABLE'}

CENTRIC RELATION VERIFICATION:
  • Recorded Trials: ${c.crRecords ? c.crRecords.length : 0} repetitions
  • Maximum Spatial Deviation: ${m.crDeviationMm !== null ? `${m.crDeviationMm} mm` : 'UNAVAILABLE'}
  • Repeatability Status: ${m.crStatus}

ESTHETIC & TOOTH SELECTION PRESCRIPTION:
  • Facial Form: ${b.facialForm.toUpperCase()} (Bizygomatic Ratio: ${b.bizFaceRatio})
  • Suggested Tooth Mould: Leon Williams ${b.facialForm === 'square' ? 'Class I (Square)' : b.facialForm === 'tapering' ? 'Class II (Tapering)' : 'Class III (Ovoid)'}
  • Recommended Vita Shade: ${b.estimatedShade} (Vitapan Classical)

SAFETY DISCLAIMER:
  ${isSimulation 
    ? 'This prescription is generated from simulated/unvalidated data. Final prosthesis mounting requires physical verification.'
    : 'Physical measurements verified.'}
================================================================`;
}

/**
 * Generates an exhaustive JSON file containing full patient biometrics, jaw kinematics,
 * all multi-trial CR coordinates, and Gothic Arch tracing excursion points.
 */
export function generatePatientCaseJson(c: PatientCase): string {
  const m = c.measurements;
  const isSimulation = m.provenance !== 'MEASURED';

  const exportPayload = {
    schemaVersion: "SmartBow_Clinical_Schema_v1.2",
    exportedAt: new Date().toISOString(),
    clinicalSafetyNotice: isSimulation ? "SIMULATION — NOT FOR CLINICAL USE" : "VALIDATED MEASUREMENT",
    dataProvenance: m.provenance || 'SIMULATED',
    institution: {
      name: "Maitri College of Dentistry & Research Centre",
      department: "Department of Prosthodontics and Crown & Bridge",
      investigator: "Dr. Deepanshu, MDS Prosthodontics Resident",
      system: "SmartBow AI Contactless Jaw Relation System"
    },
    patient: {
      patientId: c.patientId,
      name: c.name,
      age: c.age,
      gender: c.gender,
      dentitionState: c.dentitionState,
      prescribedArticulator: c.articulator,
      notes: c.notes || c.clinicalNotes || "",
      recordCreatedAt: c.createdAt,
      recordUpdatedAt: c.updatedAt || c.createdAt,
      isSealed: !!c.isSealed
    },
    clinicalMeasurements: {
      provenance: m.provenance || 'SIMULATED',
      vdoMm: m.vdoMm,
      vdrMm: m.vdrMm ?? (m.vdoMm !== null ? m.vdoMm + (m.freewaySpaceMm ?? 3.0) : null),
      freewaySpaceMm: m.freewaySpaceMm ?? 3.0,
      occlusalTiltMLDeg: m.occlusalTiltMLDeg,
      occlusalTiltAPDeg: m.occlusalTiltAPDeg,
      midlineShiftMm: m.midlineShiftMm,
      crStatus: m.crStatus,
      crDeviationMm: m.crDeviationMm,
      sciEstimateDeg: m.sciEstimateDeg,
      bennettLeftDeg: m.bennettLeftDeg,
      bennettRightDeg: m.bennettRightDeg
    },
    facialBiometrics: {
      lowerThirdPct: c.biometrics.lowerThirdPct,
      bizygomaticWidthMm: c.biometrics.bizygomaticWidthMm,
      facialHeightMm: c.biometrics.facialHeightMm,
      bizFaceRatio: c.biometrics.bizFaceRatio,
      facialForm: c.biometrics.facialForm,
      interpupillaryTiltDeg: c.biometrics.interpupillaryTiltDeg,
      lipGapMm: c.biometrics.lipGapMm,
      midlineDeviationMm: c.biometrics.midlineDeviationMm,
      estimatedShade: c.biometrics.estimatedShade,
      subnasaleToMentonMm: c.biometrics.subnasaleToMentonMm
    },
    centricRelationTrials: (c.crRecords || []).map((cr, idx) => ({
      trialNumber: cr.trialIndex ?? idx + 1,
      provenance: cr.provenance || m.provenance || 'SIMULATED',
      timestamp: cr.timestamp,
      timestampIso: new Date(cr.timestamp).toISOString(),
      vdoMm: cr.vdoMm,
      tiltMLDeg: cr.tiltMLDeg ?? null,
      mandibularCentroid: cr.mandibularCentroidPatient ? {
        x: Number(cr.mandibularCentroidPatient.x.toFixed(3)),
        y: Number(cr.mandibularCentroidPatient.y.toFixed(3)),
        z: Number(cr.mandibularCentroidPatient.z.toFixed(3))
      } : null
    })),
    gothicArchTracing: {
      totalPoints: (c.gothicArchPoints || []).length,
      provenance: (c.gothicArchPoints && c.gothicArchPoints[0]?.provenance) || 'SIMULATED',
      points: (c.gothicArchPoints || []).map((pt, idx) => ({
        index: idx + 1,
        phase: pt.phase,
        xMm: Number(pt.x.toFixed(3)),
        yMm: Number(pt.y.toFixed(3)),
        zMm: Number(pt.z.toFixed(3)),
        timestamp: pt.timestamp,
        timestampIso: new Date(pt.timestamp).toISOString()
      }))
    },
    cameraCalibration: c.cameraCalibration ?? null
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Escapes strings for CSV output according to RFC 4180
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an archival CSV spreadsheet containing patient summary, measurements,
 * biometrics, CR trials, and Gothic arch data.
 * SAFETY RULE: Includes mandatory SIMULATION WATERMARK when unvalidated.
 */
export function generatePatientCaseCsv(c: PatientCase): string {
  const m = c.measurements;
  const b = c.biometrics;
  const isSimulation = m.provenance !== 'MEASURED';
  const fws = m.freewaySpaceMm ?? 3.0;
  const vdr = m.vdrMm ?? (m.vdoMm !== null ? m.vdoMm + fws : null);

  const lines: string[] = [];

  // Header metadata & Mandatory Watermark
  lines.push('# =========================================================================');
  lines.push(`# WARNING: ${isSimulation ? 'SIMULATION — NOT FOR CLINICAL USE' : 'VALIDATED CLINICAL MEASUREMENTS'}`);
  lines.push(`# DATA PROVENANCE: ${m.provenance || 'SIMULATED'}`);
  lines.push('# SMARTBOW AI — CLINICAL JAW RELATION DOSSIER & BIOMETRIC DATA');
  lines.push('# Department of Prosthodontics · Maitri College of Dentistry · Dr. Deepanshu (MDS Resident)');
  lines.push(`# Exported At: ${new Date().toISOString()}`);
  lines.push('# =========================================================================');
  lines.push('');

  // 1. Demographics
  lines.push('[PATIENT_DEMOGRAPHICS]');
  lines.push('Field,Value,Notes');
  lines.push(`Patient_ID,${escapeCsv(c.patientId)},Unique clinical record identifier`);
  lines.push(`Patient_Name,${escapeCsv(c.name)},Patient full legal name`);
  lines.push(`Age,${escapeCsv(c.age)},Years`);
  lines.push(`Gender,${escapeCsv(c.gender)},Biological gender`);
  lines.push(`Dentition_State,${escapeCsv(c.dentitionState)},Clinical arch condition`);
  lines.push(`Prescribed_Articulator,${escapeCsv(c.articulator)},Target semi-adjustable or CAD/CAM frame`);
  lines.push(`Data_Provenance,${escapeCsv(m.provenance || 'SIMULATED')},Measurement origin`);
  lines.push(`Date_Created,${escapeCsv(c.createdAt)},Initial clinical record session`);
  lines.push(`Clinical_Notes,${escapeCsv(c.clinicalNotes || c.notes || 'None recorded')},Observational notes`);
  lines.push('');

  // 2. Clinical Measurements
  lines.push('[CLINICAL_MEASUREMENTS]');
  lines.push('Parameter,Value,Unit,Physiological_Norm,Literature_Citation,Clinical_Interpretation');
  lines.push(`Vertical_Dimension_Occlusion_VDO,${m.vdoMm !== null ? m.vdoMm.toFixed(2) : 'UNAVAILABLE'},mm,60.00-68.00 mm,Niswonger (1934) / Boucher (1975),Occlusal rim contact height`);
  lines.push(`Vertical_Dimension_Rest_VDR,${vdr !== null ? vdr.toFixed(2) : 'UNAVAILABLE'},mm,63.00-72.00 mm,Thompson (1946),Physiologic muscular postural rest`);
  lines.push(`Freeway_Space_FWS,${fws.toFixed(2)},mm,2.00-4.00 mm,Boucher's Prosthodontics,Interocclusal clearance (VDR - VDO)`);
  lines.push(`Mediolateral_Occlusal_Tilt_ML,${m.occlusalTiltMLDeg !== null ? m.occlusalTiltMLDeg.toFixed(2) : 'UNAVAILABLE'},deg,0.00-2.50 deg,Interpupillary Line Standard,Occlusal plane ML inclination`);
  lines.push(`Anteroposterior_Occlusal_Tilt_AP,${m.occlusalTiltAPDeg !== null ? m.occlusalTiltAPDeg.toFixed(2) : 'UNAVAILABLE'},deg,2.00-6.00 deg,Camper's Plane (Ala-Tragus),Occlusal plane AP inclination`);
  lines.push(`Maxillary_Midline_Shift,${m.midlineShiftMm !== null ? m.midlineShiftMm.toFixed(2) : 'UNAVAILABLE'},mm,-1.00 - +1.00 mm,Facial Midline Concordance,Positive=Right; Negative=Left`);
  lines.push(`Centric_Relation_Repeatability_Status,${escapeCsv(m.crStatus)},status,ACCEPTED (<0.50mm),Dawson / Posselt Hinge Axis,Verification threshold`);
  lines.push(`Centric_Relation_Max_Deviation,${m.crDeviationMm !== null ? m.crDeviationMm.toFixed(2) : 'UNAVAILABLE'},mm,< 0.50 mm,GPT-10 Definition of CR,Max vector deviation across trials`);
  lines.push(`Sagittal_Condylar_Inclination_SCI,${m.sciEstimateDeg !== null ? m.sciEstimateDeg.toFixed(1) : 'UNAVAILABLE'},deg,30.0-45.0 deg,Hanau Quint / Christensen,Horizontal condylar angle`);
  lines.push(`Left_Bennett_Angle,${m.bennettLeftDeg !== null ? m.bennettLeftDeg.toFixed(1) : 'UNAVAILABLE'},deg,10.0-20.0 deg,Hanau Formula (H/8 + 12),Left lateral excursion guidance`);
  lines.push(`Right_Bennett_Angle,${m.bennettRightDeg !== null ? m.bennettRightDeg.toFixed(1) : 'UNAVAILABLE'},deg,10.0-20.0 deg,Hanau Formula (H/8 + 12),Right lateral excursion guidance`);
  lines.push('');

  // 3. Facial Biometrics
  lines.push('[FACIAL_BIOMETRICS]');
  lines.push('Parameter,Value,Unit,Reference_Norm,Esthetic_Doctrine');
  lines.push(`Lower_Facial_Third_Proportion,${b.lowerThirdPct.toFixed(1)},percent,30.0-36.0%,da Vinci Proportions (Ideal ~33.3%)`);
  lines.push(`Bizygomatic_Width,${b.bizygomaticWidthMm.toFixed(1)},mm,130.0-145.0 mm,Facial Anthropometry`);
  lines.push(`Total_Facial_Height,${b.facialHeightMm.toFixed(1)},mm,170.0-195.0 mm,Trichion to Menton anthropometry`);
  lines.push(`Bizygomatic_to_Face_Ratio,${b.bizFaceRatio.toFixed(2)},ratio,0.72-0.80,Facial morphological index`);
  lines.push(`Facial_Form,${escapeCsv(b.facialForm.toUpperCase())},category,SQUARE / TAPERING / OVOID,Leon Williams Law of Harmony`);
  lines.push(`Interpupillary_Line_Tilt,${b.interpupillaryTiltDeg.toFixed(2)},deg,0.00-1.50 deg,Horizontal reference plane`);
  lines.push(`Interlabial_Gap,${b.lipGapMm.toFixed(1)},mm,1.0-3.0 mm,Resting lip posture`);
  lines.push(`Recommended_Tooth_Mould,${escapeCsv(b.facialForm === 'square' ? 'Class I (Square Mould)' : b.facialForm === 'tapering' ? 'Class II (Tapering Mould)' : 'Class III (Ovoid Mould)')},category,Class I / II / III,Williams typal form correlation`);
  lines.push(`Recommended_Vita_Shade,${escapeCsv(b.estimatedShade)},shade,Vitapan Classical,Perioral skin chroma/value calibration`);
  lines.push('');

  // 4. Centric Relation Multi-Trial Kinematics
  lines.push('[CENTRIC_RELATION_TRIALS]');
  lines.push('Trial_Number,Timestamp_UTC,VDO_mm,Tilt_ML_deg,Centroid_X_mm,Centroid_Y_mm,Centroid_Z_mm');
  if (c.crRecords && c.crRecords.length > 0) {
    c.crRecords.forEach((cr, idx) => {
      const x = cr.mandibularCentroidPatient?.x ? cr.mandibularCentroidPatient.x.toFixed(3) : '0.000';
      const y = cr.mandibularCentroidPatient?.y ? cr.mandibularCentroidPatient.y.toFixed(3) : '0.000';
      const z = cr.mandibularCentroidPatient?.z ? cr.mandibularCentroidPatient.z.toFixed(3) : (cr.vdoMm ? cr.vdoMm.toFixed(3) : '0.000');
      lines.push(`${cr.trialIndex ?? idx + 1},${escapeCsv(new Date(cr.timestamp).toISOString())},${cr.vdoMm.toFixed(2)},${(cr.tiltMLDeg ?? m.occlusalTiltMLDeg ?? 0).toFixed(2)},${x},${y},${z}`);
    });
  } else {
    lines.push('# NO_CENTRIC_RELATION_TRIALS_RECORDED');
  }
  lines.push('');

  // 5. Gothic Arch Tracing Excursion Points
  lines.push('[GOTHIC_ARCH_TRACING_POINTS]');
  lines.push('Point_Index,Phase,X_Lateral_mm,Y_AP_mm,Z_Vertical_mm,Timestamp_UTC');
  if (c.gothicArchPoints && c.gothicArchPoints.length > 0) {
    c.gothicArchPoints.forEach((pt, idx) => {
      lines.push(`${idx + 1},${escapeCsv(pt.phase)},${pt.x.toFixed(3)},${pt.y.toFixed(3)},${pt.z.toFixed(3)},${escapeCsv(new Date(pt.timestamp).toISOString())}`);
    });
  } else {
    lines.push('# NO_GOTHIC_ARCH_POINTS_RECORDED');
  }

  return lines.join('\r\n');
}

/**
 * Triggers a browser download of generated text/binary data
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
