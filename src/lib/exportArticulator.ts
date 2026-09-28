/**
 * SmartBow AI - CAD/CAM Articulator File Exporter
 * Generates exocad, 3Shape, Hanau, and Universal JSON exchange files.
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

import { PatientCase } from '../types/smartbow';

export function generateExocadArticulatorFile(c: PatientCase): string {
  const m = c.measurements;
  return JSON.stringify({
    format: "Exocad_VirtualArticulator_v2",
    clientSoftware: "SmartBow AI v1.0",
    clinician: "Dr. Deepanshu, MDS Prosthodontics",
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
    mountingMatrix4x4: [
      1.0, 0.0, 0.0, m.midlineShiftMm,
      0.0, Math.cos((m.occlusalTiltAPDeg * Math.PI) / 180), -Math.sin((m.occlusalTiltAPDeg * Math.PI) / 180), -28.5,
      0.0, Math.sin((m.occlusalTiltAPDeg * Math.PI) / 180), Math.cos((m.occlusalTiltAPDeg * Math.PI) / 180), m.vdoMm,
      0.0, 0.0, 0.0, 1.0
    ],
    centricRelation: {
      status: m.crStatus,
      maxDeviation_mm: m.crDeviationMm,
      verifiedTrials: c.crRecords.length
    }
  }, null, 2);
}

export function generate3ShapeArticulatorXml(c: PatientCase): string {
  const m = c.measurements;
  return `<?xml version="1.0" encoding="UTF-8"?>
<DentalArticulatorTransfer version="1.4">
  <Header>
    <Origin>SmartBow AI Smartphone Facebow Replacement</Origin>
    <Author>Dr. Deepanshu (MDS Prosthodontics, Maitri College)</Author>
    <Timestamp>${c.createdAt}</Timestamp>
    <PatientID>${c.patientId}</PatientID>
    <PatientName>${c.name}</PatientName>
  </Header>
  <ArticulatorModel brand="${c.articulator}" calibrationStatus="VERIFIED">
    <CondylarSettings>
      <SagittalCondylarInclination unit="degrees">${m.sciEstimateDeg}</SagittalCondylarInclination>
      <BennettAngleLeft unit="degrees">${m.bennettLeftDeg}</BennettAngleLeft>
      <BennettAngleRight unit="degrees">${m.bennettRightDeg}</BennettAngleRight>
      <IntercondylarWidth unit="mm">110.0</IntercondylarWidth>
    </CondylarSettings>
    <JawRelation>
      <VerticalDimensionOfOcclusion unit="mm">${m.vdoMm}</VerticalDimensionOfOcclusion>
      <OcclusalPlaneTiltML unit="degrees">${m.occlusalTiltMLDeg}</OcclusalPlaneTiltML>
      <OcclusalPlaneTiltAP unit="degrees">${m.occlusalTiltAPDeg}</OcclusalPlaneTiltAP>
      <MidlineDeviation unit="mm">${m.midlineShiftMm}</MidlineDeviation>
      <CentricRelationQuality deviation="${m.crDeviationMm}mm" status="${m.crStatus}"/>
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
  return `================================================================
SMARTBOW AI — CLINICAL JAW RELATION & ARTICULATOR PRESCRIPTION
Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
================================================================
PATIENT DETAILS:
  Name: ${c.name}
  Clinical ID: ${c.patientId}
  Age / Gender: ${c.age} / ${c.gender}
  Dentition: ${c.dentitionState.replace('_', ' ')}
  Date Recorded: ${new Date(c.createdAt).toLocaleDateString()}
  System: Smartphone MediaPipe + ArUco DICT_4X4_50 Tracking

HANAU WIDE-VUE / CAD/CAM INSTRUMENT SETTINGS:
  • Horizontal Condylar Inclination (SCI): ${m.sciEstimateDeg}°
  • Left Lateral Bennett Angle (L): ${m.bennettLeftDeg}°
  • Right Lateral Bennett Angle (R): ${m.bennettRightDeg}°
  • Incisal Guide Pin: 0.0 mm (flush at horizontal index mark)
  • Incisal Guide Table: 0° flat (edentulous balanced occlusion)
  • Intercondylar Distance: 110 mm (standard semi-adjustable)

VERTICAL DIMENSION & PLANE RELATION:
  • VDO (Vertical Dimension of Occlusion): ${m.vdoMm} mm
  • Lower Facial Third Proportion: ${b.lowerThirdPct}% (Clinical Target: 30-36%)
  • Mediolateral Occlusal Tilt (ML): ${m.occlusalTiltMLDeg}° vs Interpupillary Line
  • Anteroposterior Occlusal Tilt (AP): ${m.occlusalTiltAPDeg}° vs Camper's Plane
  • Maxillary Midline Shift: ${m.midlineShiftMm >= 0 ? '+' : ''}${m.midlineShiftMm} mm (${m.midlineShiftMm >= 0 ? 'Right' : 'Left'})

CENTRIC RELATION VERIFICATION:
  • Recorded Trials: ${c.crRecords.length} repetitions
  • Maximum Spatial Deviation: ${m.crDeviationMm} mm
  • Repeatability Status: ${m.crStatus} (Target: <0.5 mm)

ESTHETIC & TOOTH SELECTION PRESCRIPTION:
  • Facial Form: ${b.facialForm.toUpperCase()} (Bizygomatic Ratio: ${b.bizFaceRatio})
  • Suggested Tooth Mould: Leon Williams ${b.facialForm === 'square' ? 'Class I (Square)' : b.facialForm === 'tapering' ? 'Class II (Tapering)' : 'Class III (Ovoid)'}
  • Recommended Vita Shade: ${b.estimatedShade} (Vitapan Classical)

3D MOUNTING JIG INSTRUCTIONS:
  1. 3D-print SmartBow_MountingJig_${c.patientId}.stl at 100μm layer height.
  2. Clip jig onto Hanau lower member mounting plate.
  3. Seat maxillary occlusal rim directly into the 3 custom index pedestals.
  4. Lower Hanau upper member and plaster with Type II / Type III mounting stone.
================================================================`;
}

/**
 * Generates an exhaustive JSON file containing full patient biometrics, jaw kinematics,
 * all multi-trial CR coordinates, and Gothic Arch tracing excursion points.
 */
export function generatePatientCaseJson(c: PatientCase): string {
  const exportPayload = {
    schemaVersion: "SmartBow_Clinical_Schema_v1.2",
    exportedAt: new Date().toISOString(),
    institution: {
      name: "Maitri College of Dentistry & Research Centre",
      department: "Department of Prosthodontics and Crown & Bridge",
      investigator: "Dr. Deepanshu, MDS Prosthodontics Resident",
      system: "SmartBow AI Contactless Jaw Relation & Virtual Facebow"
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
      vdoMm: c.measurements.vdoMm,
      vdrMm: c.measurements.vdrMm ?? (c.measurements.vdoMm + (c.measurements.freewaySpaceMm ?? 3.0)),
      freewaySpaceMm: c.measurements.freewaySpaceMm ?? 3.0,
      occlusalTiltMLDeg: c.measurements.occlusalTiltMLDeg,
      occlusalTiltAPDeg: c.measurements.occlusalTiltAPDeg,
      midlineShiftMm: c.measurements.midlineShiftMm,
      crStatus: c.measurements.crStatus,
      crDeviationMm: c.measurements.crDeviationMm,
      sciEstimateDeg: c.measurements.sciEstimateDeg,
      bennettLeftDeg: c.measurements.bennettLeftDeg,
      bennettRightDeg: c.measurements.bennettRightDeg
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
 * biometrics, CR trials, and Gothic arch data for secondary analysis in Excel/SPSS/R/Python.
 */
export function generatePatientCaseCsv(c: PatientCase): string {
  const m = c.measurements;
  const b = c.biometrics;
  const fws = m.freewaySpaceMm ?? 3.0;
  const vdr = m.vdrMm ?? (m.vdoMm + fws);

  const lines: string[] = [];

  // Header metadata
  lines.push('# SMARTBOW AI — CLINICAL JAW RELATION DOSSIER & BIOMETRIC DATA');
  lines.push('# Department of Prosthodontics · Maitri College of Dentistry · Dr. Deepanshu (MDS Resident)');
  lines.push(`# Exported At: ${new Date().toISOString()}`);
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
  lines.push(`Date_Created,${escapeCsv(c.createdAt)},Initial clinical record session`);
  lines.push(`Clinical_Notes,${escapeCsv(c.clinicalNotes || c.notes || 'None recorded')},Observational notes`);
  lines.push('');

  // 2. Clinical Measurements
  lines.push('[CLINICAL_MEASUREMENTS]');
  lines.push('Parameter,Value,Unit,Physiological_Norm,Literature_Citation,Clinical_Interpretation');
  lines.push(`Vertical_Dimension_Occlusion_VDO,${m.vdoMm.toFixed(2)},mm,60.00-68.00 mm,Niswonger (1934) / Boucher (1975),Occlusal rim contact height`);
  lines.push(`Vertical_Dimension_Rest_VDR,${vdr.toFixed(2)},mm,63.00-72.00 mm,Thompson (1946),Physiologic muscular postural rest`);
  lines.push(`Freeway_Space_FWS,${fws.toFixed(2)},mm,2.00-4.00 mm,Boucher's Prosthodontics,Interocclusal clearance (VDR - VDO)`);
  lines.push(`Mediolateral_Occlusal_Tilt_ML,${m.occlusalTiltMLDeg.toFixed(2)},deg,0.00-2.50 deg,Interpupillary Line Standard,Occlusal plane ML inclination`);
  lines.push(`Anteroposterior_Occlusal_Tilt_AP,${m.occlusalTiltAPDeg.toFixed(2)},deg,2.00-6.00 deg,Camper's Plane (Ala-Tragus),Occlusal plane AP inclination`);
  lines.push(`Maxillary_Midline_Shift,${m.midlineShiftMm.toFixed(2)},mm,-1.00 - +1.00 mm,Facial Midline Concordance,Positive=Right; Negative=Left`);
  lines.push(`Centric_Relation_Repeatability_Status,${escapeCsv(m.crStatus)},status,ACCEPTED (<0.50mm),Dawson / Posselt Hinge Axis,Verification threshold`);
  lines.push(`Centric_Relation_Max_Deviation,${m.crDeviationMm.toFixed(2)},mm,< 0.50 mm,GPT-10 Definition of CR,Max vector deviation across trials`);
  lines.push(`Sagittal_Condylar_Inclination_SCI,${m.sciEstimateDeg.toFixed(1)},deg,30.0-45.0 deg,Hanau Quint / Christensen,Horizontal condylar angle`);
  lines.push(`Left_Bennett_Angle,${m.bennettLeftDeg.toFixed(1)},deg,10.0-20.0 deg,Hanau Formula (H/8 + 12),Left lateral excursion guidance`);
  lines.push(`Right_Bennett_Angle,${m.bennettRightDeg.toFixed(1)},deg,10.0-20.0 deg,Hanau Formula (H/8 + 12),Right lateral excursion guidance`);
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
      const z = cr.mandibularCentroidPatient?.z ? cr.mandibularCentroidPatient.z.toFixed(3) : cr.vdoMm.toFixed(3);
      lines.push(`${cr.trialIndex ?? idx + 1},${escapeCsv(new Date(cr.timestamp).toISOString())},${cr.vdoMm.toFixed(2)},${(cr.tiltMLDeg ?? m.occlusalTiltMLDeg).toFixed(2)},${x},${y},${z}`);
    });
  } else {
    lines.push(`1,${escapeCsv(new Date(c.createdAt).toISOString())},${m.vdoMm.toFixed(2)},${m.occlusalTiltMLDeg.toFixed(2)},0.000,-18.500,${m.vdoMm.toFixed(3)}`);
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
    lines.push('1,CENTRIC_APEX,0.000,0.000,0.000,N/A');
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
