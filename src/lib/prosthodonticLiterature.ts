/**
 * SmartBow AI - Prosthodontic Literature & Jaw Kinematics Reference Compendium
 * Grounded in classical and contemporary prosthodontic literature (GPT-10, Boucher, Dawson, Posselt, Hanau, Silverman, Shanahan).
 * Dr. Deepanshu · MDS Prosthodontics · Maitri College of Dentistry
 */

export interface VdoCheckpoint {
  id: 'physiologic_rest' | 'silverman_s' | 'facial_thirds' | 'shanahan_swallow' | 'willis_commissure' | 'tactile_muscle';
  name: string;
  category: 'PHYSIOLOGIC' | 'PHONETIC' | 'ESTHETIC' | 'DEGLUTITION' | 'ANATOMIC';
  authorReference: string;
  literatureCitation: string;
  clinicalProtocol: string;
  expectedObservation: string;
  recommendedValueRange: string;
  validationCriterion: string;
}

export const VDO_CHECKPOINTS: VdoCheckpoint[] = [
  {
    id: 'physiologic_rest',
    name: 'Physiologic Rest Position & Freeway Space (FWS)',
    category: 'PHYSIOLOGIC',
    authorReference: 'Niswonger (1934) / Thompson (1946) / Boucher (1975)',
    literatureCitation: 'Boucher\'s Prosthodontic Treatment for Edentulous Patients (12th ed); GPT-10: "The distance between the posture position of the mandible and maximum intercuspation."',
    clinicalProtocol: 'Patient sits completely upright with head unsupported. Instruct patient to swallow saliva, lick lips, relax shoulders, and let mandible drop into physiologic postural rest position (VDR). Measure distance from subnasale to menton.',
    expectedObservation: 'Mandible settles into tonic equilibrium of masticatory elevator and depressor muscles. 2.0 to 4.0 mm of interocclusal clearance (freeway space) exists between maxillary and mandibular wax rims.',
    recommendedValueRange: 'Freeway Space = 2.0 – 4.0 mm (VDR - VDO)',
    validationCriterion: 'Verified if (VDR - VDO) is strictly between 2.0 and 4.0 mm. FWS < 2.0 mm triggers warning for ridge trauma and muscular spasm; FWS > 4.0 mm triggers warning for collapsed lower facial height and muscular inefficiency.'
  },
  {
    id: 'silverman_s',
    name: 'Silverman\'s Closest Speaking Space (Phonetic "S")',
    category: 'PHONETIC',
    authorReference: 'Silverman MM (1951, 1956) / Pound E (1970)',
    literatureCitation: 'Silverman MM. "The speaking method in measuring vertical dimension." J Prosthet Dent. 1953;3(2):193-199; Pound E. "Centric relation for edentulous patients." J Prosthet Dent. 1970.',
    clinicalProtocol: 'With both occlusal rims intraorally, instruct patient to pronounce sibilant sounds count rapidly: "60, 61, 62... 66" or repeatedly recite "Mississippi" or "Church". Observe the interocclusal rim clearance during speech.',
    expectedObservation: 'Wax rims should closely approximate each other without tooth-to-tooth or rim-to-rim contact. An interocclusal clearance of 1.0 to 2.0 mm must be maintained during active phonation.',
    recommendedValueRange: 'Speaking Clearance = 1.0 – 2.0 mm (no clicking)',
    validationCriterion: 'Verified if during sibilant enunciation, rims clear by ≥ 1.0 mm without clicking or premature contact. Clicking indicates over-opened VDO violating speaking space.'
  },
  {
    id: 'facial_thirds',
    name: 'Facial Thirds Proportional Esthetics (Golden Harmony)',
    category: 'ESTHETIC',
    authorReference: 'Leonardo da Vinci / Ivy RS / Leon Williams (1914) / Frush & Fisher (1956)',
    literatureCitation: 'Williams JL. "The temperamental selection of artificial teeth, a fallacy." Dent Digest. 1914; Frush JP, Fisher RD. "How dentogenic restorations interpret the sex factor." J Prosthet Dent. 1956.',
    clinicalProtocol: 'Optical face mesh analyzes the vertical facial thirds in profile and frontal views: Upper third (Trichion to Glabella), Middle third (Glabella to Subnasale), and Lower third (Subnasale to Menton/Gnathion).',
    expectedObservation: 'The lower facial third at occlusion (VDO) should comprise 30.0% to 36.0% (ideally 33.3%) of total cranial-facial height. Proper lip seal, normal philtrum depth, and supported vermilion borders of upper and lower lips.',
    recommendedValueRange: 'Lower Facial Third = 30.0% – 36.0% (Ideal ~33.3%)',
    validationCriterion: 'Verified if Lower Third Percentage is between 30% and 36%. Lower third < 30% indicates pseudo-Class III profile and collapsed facial support; > 36% indicates strained mentolabial sulcus.'
  },
  {
    id: 'shanahan_swallow',
    name: 'Shanahan\'s Deglutition / Swallowing Position',
    category: 'DEGLUTITION',
    authorReference: 'Shanahan TEJ (1955, 1956)',
    literatureCitation: 'Shanahan TEJ. "Physiologic vertical dimension and centric relation." J Prosthet Dent. 1956;6(6):741-747.',
    clinicalProtocol: 'Place soft functional registration wax or warmed rims in the mouth. Instruct patient to swallow saliva repeatedly. The act of swallowing forces contraction of the mylohyoid and elevator muscles, guiding the mandible into physiological terminal closing position.',
    expectedObservation: 'The mandible naturally seats at its physiological vertical dimension during the terminal stage of swallowing. The recorded vertical height corresponds closely to the predetermined VDO.',
    recommendedValueRange: 'Swallowing Closure Height within ± 0.5 mm of VDO',
    validationCriterion: 'Verified if the mandibular centroid vertical coordinate during three consecutive deglutition cycles matches the target VDO within ± 0.5 mm.'
  },
  {
    id: 'willis_commissure',
    name: 'Willis Gauge Craniofacial Equality',
    category: 'ANATOMIC',
    authorReference: 'Willis FM (1930, 1935)',
    literatureCitation: 'Willis FM. "Esthetics of full denture construction." J Am Dent Assoc. 1930;17:636-642.',
    clinicalProtocol: 'Using the computer vision landmark array, calculate the distance from the outer canthus of the eye (or pupil) to the rima oris (labial commissure) at rest, and compare to distance from subnasale to inferior border of menton at closure.',
    expectedObservation: 'In an anatomically balanced face, distance from Pupil/Canthus to Rima Oris is equal to Subnasale to Menton at established VDO.',
    recommendedValueRange: 'Willis Discrepancy (|Canthus-Rima - Subnasale-Menton|) ≤ 1.5 mm',
    validationCriterion: 'Verified if discrepancy between upper reference segment and lower vertical dimension is ≤ 1.5 mm.'
  },
  {
    id: 'tactile_muscle',
    name: 'Tactile Sense & Masticatory Muscle Relaxation',
    category: 'PHYSIOLOGIC',
    authorReference: 'Lytle RB (1964) / Boucher CO (1970)',
    literatureCitation: 'Lytle RB. "Vertical dimension of occlusion." J Prosthet Dent. 1964;14(1):12-21; Boucher CO. "Current clinical technology in complete dentures." J Prosthet Dent.',
    clinicalProtocol: 'Patient closes rims together until first light tactile contact. Clinician palpates the anterior bellies of the masseter and anterior temporalis muscles bilaterally. Check for muscular strain, quivering, or premature contact tactile perception.',
    expectedObservation: 'Patient perceives uniform, bilateral, simultaneous contact. Masseter muscles display coordinated contraction without painful spasm or uncoordinated firing.',
    recommendedValueRange: 'Symmetric Bilateral Palpation & Comfortable Contact',
    validationCriterion: 'Verified if patient reports comfortable, stable rim closure and bilateral digital palpation confirms synchronous muscle recruitment without unilateral deviation.'
  }
];

export interface JawKinematicDoctrine {
  concept: string;
  inventor: string;
  literatureReference: string;
  clinicalRelevance: string;
  smartBowImplementation: string;
}

export const JAW_KINEMATIC_DOCTRINES: JawKinematicDoctrine[] = [
  {
    concept: 'Posselt\'s Envelope of Motion',
    inventor: 'Ulf Posselt (1952, 1956)',
    literatureReference: 'Posselt U. "Studies in the mobility of the human mandible." Acta Odontol Scand. 1952;10(Suppl 10):1-160; Posselt U. "Physiology of Occlusion and Rehabilitation." Blackwell Scientific, 1962.',
    clinicalRelevance: 'Mandibular movement is constrained in 3D space by condylar anatomy and ligaments, forming a characteristic boundary envelope in sagittal, frontal, and horizontal planes. All functional mastication occurs within this envelope, while border movements define the exterior extremes.',
    smartBowImplementation: 'Tracks 3D mandibular trajectories ($T_{mand}$) relative to maxilla ($T_{max}$). Reconstructs the sagittal teardrop profile, horizontal rhomboid, and frontal shield of Posselt in real time at 30 fps.'
  },
  {
    concept: 'Centric Relation (CR) Definition & Dawson Bimanual Guidance',
    inventor: 'Peter E. Dawson (1974, 2007) / The Academy of Prosthodontics',
    literatureReference: 'Dawson PE. "Evaluation, Diagnosis, and Treatment of Occlusal Problems." C.V. Mosby, 1974; Dawson PE. "Functional Occlusion: From TMJ to Smile Design." Mosby, 2007; The Glossary of Prosthodontic Terms (GPT-10, 2023).',
    clinicalRelevance: 'CR is the maxillomandibular relationship in which the condyles articulate with the thinnest avascular portion of their respective disks with the complex in the anterior-superior position against the slopes of the articular eminences. It is clinically repeatable and independent of tooth contact.',
    smartBowImplementation: 'Supports Dawson bimanual manipulation with real-time 3D centroid recording. Computes maximum pairwise Euclidean deviation over 3 trials. Evaluates condylar stability: <0.5 mm = ACCEPTED, 0.5–1.0 mm = RETRY, >1.0 mm = REJECT.'
  },
  {
    concept: 'Christensen\'s Phenomenon & Sagittal Condylar Inclination (SCI)',
    inventor: 'Carl Christensen (1905) / Rudolph L. Hanau (1926)',
    literatureReference: 'Christensen C. "The problem of the bite." Dental Cosmos. 1905;47:1184-1195; Hanau RL. "Articulator technique for full denture prosthesis." Buffalo, NY, 1926.',
    clinicalRelevance: 'During mandibular protrusion, the condyle slides down the articular eminence, creating a posterior space (wedge-shaped separation) between the maxillary and mandibular occlusal surfaces. The angle of this path is the Sagittal Condylar Inclination (SCI).',
    smartBowImplementation: 'Monitors the posterior rim separation trajectory during 6 mm protrusion. Derives the SCI in degrees: $\\theta_{SCI} = \\arctan(\\Delta Z / \\Delta Y) \\times (180/\\pi)$. Automatically programs the condylar dials on Hanau Wide-Vue / Whip Mix articulators.'
  },
  {
    concept: 'Bennett Angle, Immediate Mandibular Lateral Translation & Fischer\'s Angle',
    inventor: 'Norman G. Bennett (1908) / Rudolf Fischer (1935)',
    literatureReference: 'Bennett NG. "A contribution to the study of the movements of the mandible." Proc R Soc Med. 1908;1:79-98; Fischer R. "Die Öffnungsbewegungen des Unterkiefers und ihre Wiedergabe am Artikulator." Schweiz Monatsschr Zahnheilkd. 1935;45:867-898.',
    clinicalRelevance: 'During lateral excursion, the non-working (orbiting) condyle moves downward, forward, and medially. The angle between its medial sagittal path and the true sagittal plane is the Bennett angle. Hanau formula: $L = H/8 + 12$. Fischer\'s angle represents the sagittal inclination differential between protrusive and lateral condylar paths.',
    smartBowImplementation: 'Computes bilateral Bennett angles from the lateral excursion wings of the digital Gothic arch needle-point tracing: $L_{left} = \\arctan(\\Delta X / \\Delta Y)$, and validates against Hanau\'s formula $L = H/8 + 12$. Directly exports to CAD/CAM virtual articulator XML.'
  },
  {
    concept: 'Needle-Point (Gothic Arch) Tracing & Centric Apex Principle',
    inventor: 'Alfred Gysi (1910) / Sears VH (1926) / Phillips R (1927)',
    literatureReference: 'Gysi A. "The problem of articulation." Dental Cosmos. 1910;52(1):1-19; Sears VH. "Jaw relations and a means of recording the most important articulator adjustment." Dent Cosmos. 1926.',
    clinicalRelevance: 'A central bearing device with a stylus on one rim and a plate on the opposing rim traces mandibular border excursions (protrusive, right lateral, left lateral). The apex of the resultant arrowhead (gothic arch) represents true Centric Relation.',
    smartBowImplementation: 'Optical needle-point tracing without intraoral metal hardware. Tracks the relative motion of mandibular ArUco markers relative to maxillary markers in the horizontal plane, pinpoints the apex of the gothic arch, and calculates lateral excursion angles.'
  },
  {
    concept: 'Camper\'s Plane & Ala-Tragus Parallelism',
    inventor: 'Petrus Camper (1794) / Clapp GW (1910)',
    literatureReference: 'Camper P. "Works on the connection between the science of anatomy and the arts of drawing, painting, statuary." 1794; Boucher CO. "Swenson\'s Complete Dentures." 6th ed.',
    clinicalRelevance: 'The occlusal plane of artificial teeth should be oriented parallel anteroposteriorly to Camper\'s line (running from the inferior border of the ala of the nose to the superior border of the tragus of the ear) and parallel mediolaterally to the interpupillary line.',
    smartBowImplementation: 'MediaPipe detects the ala of the nose and tragus landmarks plus both pupils, establishing Camper\'s plane and the interpupillary line. Measures real-time tilt of the maxillary occlusal rim ($T_{max}$) in both AP and ML axes with 0.1° resolution.'
  }
];

export interface MarkerPastingGuideline {
  stepNumber: number;
  title: string;
  technique: string;
  specifications: string;
  commonPitfalls: string;
}

export const MARKER_PASTING_GUIDELINES: MarkerPastingGuideline[] = [
  {
    stepNumber: 1,
    title: 'Wax Rim Relief & Flat Pocket Preparation',
    technique: 'Use a heated Lecron carver or wax spatula #7 to shave a flat 19 × 19 mm relief pocket on the right premolar labial/buccal surface of the maxillary and mandibular rims.',
    specifications: 'Depth: 1.0 – 1.5 mm. Must be perfectly flat and perpendicular to the occlusal table. Do not place at the incisal edge.',
    commonPitfalls: 'Placing markers on an angled or curved wax surface creates non-planar optical perspective distortion.'
  },
  {
    stepNumber: 2,
    title: 'Safe Distance from Lip Drape & Oral Commissure',
    technique: 'Position the marker board at least 5.0 mm away from the vermilion border and incisal edge so that active lip movements during speaking (phonetics) and swallowing do not obscure the ArUco corners.',
    specifications: 'Maxillary: 5 mm superior to incisal wax edge. Mandibular: 5 mm inferior to occlusal table.',
    commonPitfalls: 'Lip curtains draping over marker ID 3 or ID 7 during "S" sound enunciation, causing transient tracking loss.'
  },
  {
    stepNumber: 3,
    title: 'Wire Retention Tag Embedding & Sticky Wax Flashing',
    technique: 'Warm the 0.8 mm stainless steel orthodontic wire tag attached to the back of the acrylic marker board over a Bunsen/spirit burner. Seat into the prepared wax pocket until flush. Seal the perimeter with a bead of melted sticky wax or low-fusing modeling compound.',
    specifications: 'Must withstand 10 N lateral shear force without dislodgement or rotation on the rim.',
    commonPitfalls: 'Cold placement without wire heating causes marker to detach intraorally when moistened by saliva.'
  },
  {
    stepNumber: 4,
    title: 'Bilateral & Vertical Clearance at Occlusion (No Collision)',
    technique: 'Have the patient or articulator close fully into centric contact. Confirm visually that the maxillary marker board (IDs 3–6) and mandibular marker board (IDs 7–10) do NOT contact or collide with each other.',
    specifications: 'Maintain a minimum of 2.0 mm vertical separation between the two acrylic boards at full centric closure.',
    commonPitfalls: 'Marker boards bumping together during closure, preventing true occlusal rim seating and falsifying VDO.'
  },
  {
    stepNumber: 5,
    title: 'Surface Glare Prevention & Saliva Sealing',
    technique: 'Ensure the printed ArUco paper is sealed under matte medical varnish or high-clarity dental laminate. Before initiating scanning, gently wipe the marker face with a dry 2×2 gauze to remove saliva film.',
    specifications: 'Specular glare reflection must be < 5% under 1200 Lux operatory LED lighting.',
    commonPitfalls: 'Saliva bubbles reflecting direct spotlight into the camera lens, washing out high-contrast ArUco black/white bit cells.'
  }
];
