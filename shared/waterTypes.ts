/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ComplianceConclusion =
  | 'MEMENUHI'
  | 'TIDAK MEMENUHI'
  | 'DATA TIDAK LENGKAP'
  | 'BELUM DIEVALUASI'
  | 'TIDAK BERLAKU';

export type LegacyWaterStatus =
  | 'Safe'
  | 'Warning'
  | 'Exceeded'
  | 'Incomplete'
  | 'Unevaluated'
  | 'NotApplicable';

export type MissingParamReasonCode =
  | 'Tidak dijadwalkan'
  | 'Menunggu hasil laboratorium'
  | 'Alat rusak'
  | 'Lainnya';

export interface MissingParamReason {
  reason: MissingParamReasonCode;
  note?: string;
}

export interface EvaluationHistoryEntry {
  evaluatedAt: string;
  evaluatedBy: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  standardBasis?: string;
}

export interface WastewaterData {
  id: string;
  date: string;
  location: string;
  officer: string;
  ph: number | null;
  tss: number | null;
  debit: number | null;
  fe: number | null;
  mn: number | null;
  missingReasons?: Record<string, MissingParamReason>;
  evaluationHistory?: EvaluationHistoryEntry[];
  status?: LegacyWaterStatus;
  evaluationStatus?: ComplianceConclusion;
  evaluationReason?: string;
  unitMap?: Record<string, string>;
  monitoringType?: 'Harian' | 'Bulanan';
  sampleTime?: string;
  weather?: 'Cerah' | 'Berawan' | 'Hujan Ringan' | 'Hujan Lebat';
  wastewaterSource?: string;
  locationCode?: string;
  hasPhoto?: boolean;
  standardId?: string;
  standardBasis?: string;
  standardSnapshot?: Record<string, any>;
  serverEvaluatedAt?: any;
  correctionReason?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface SurfaceWaterData {
  id: string;
  date: string;
  location: string;
  officer: string;
  ph: number | null;
  tss: number | null;
  doVal: number | null;
  bod: number | null;
  cod: number | null;
  fe: number | null;
  mn: number | null;
  missingReasons?: Record<string, MissingParamReason>;
  evaluationHistory?: EvaluationHistoryEntry[];
  status?: LegacyWaterStatus;
  evaluationStatus?: ComplianceConclusion;
  evaluationReason?: string;
  unitMap?: Record<string, string>;
  monitoringType?: 'Harian' | 'Bulanan';
  kelasAir?: 'I' | 'II' | 'III' | 'IV';
  standardId?: string;
  standardBasis?: string;
  standardSnapshot?: Record<string, any>;
  serverEvaluatedAt?: any;
  correctionReason?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export type DomesticComplianceStatus =
  | 'Memenuhi'
  | 'Warning'
  | 'Tidak Memenuhi'
  | 'Belum Ada Baku Mutu'
  | 'Data Tidak Lengkap'
  | 'Belum Dievaluasi'
  | 'Tidak Berlaku';

export interface DomesticWastewaterData {
  id: string;
  date: string;
  facilityName: string;
  locationCode?: string;
  ph: number | null;
  bod: number | null;
  cod: number | null;
  tss: number | null;
  oilGrease: number | null;
  ammonia: number | null;
  totalColiform: number | null;
  debitM3Day: number | null;
  missingReasons?: Record<string, MissingParamReason>;
  evaluationHistory?: EvaluationHistoryEntry[];
  complianceStatus?: DomesticComplianceStatus;
  evaluationStatus?: ComplianceConclusion;
  evaluationReason?: string;
  unitMap?: Record<string, string>;
  standardId?: string;
  standardBasis?: string;
  standardSnapshot?: Record<string, any> | null;
  serverEvaluatedAt?: any;
  correctionReason?: string;
  officer: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface WqLocation {
  id: string;
  code: string;
  name: string;
  defaultSource: string;
  docSuffix?: string;
  kelasAir?: 'I' | 'II' | 'III' | 'IV';
  isActive: boolean;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export type StandardMedia =
  | 'air_limbah'
  | 'air_limbah_domestik'
  | 'air_permukaan'
  | 'udara'
  | 'kebisingan'
  | 'lainnya';

export type StandardVerificationStatus = 'Terverifikasi' | 'Perlu verifikasi';
export type StandardEffectiveStatus =
  | 'DRAFT'
  | 'MENUNGGU VERIFIKASI'
  | 'BERLAKU'
  | 'DIUBAH'
  | 'DICABUT';

export interface StandardRevisionEntry {
  revision: number;
  revisedAt: string;
  revisedBy: string;
  reason?: string;
  previousSnapshot: Partial<EnvironmentalStandard>;
}

export interface EnvironmentalStandard {
  id: string;
  media: StandardMedia;
  parameterKey: string;
  parameterLabel: string;
  unit: string;
  minLimit?: number | null;
  maxLimit?: number | null;
  basisRegulasi: string;
  approvalDocNo?: string;
  decreeDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  sourceDocument?: string;
  sourceUrl?: string;
  locationCode?: string;
  kelasAir?: 'I' | 'II' | 'III' | 'IV';
  isActive: boolean;
  applicable?: boolean;
  verificationStatus: StandardVerificationStatus;
  effectiveStatus?: StandardEffectiveStatus;
  notes?: string;
  revisionHistory?: StandardRevisionEntry[];
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface InternalThresholdsConfig {
  id?: string;
  warningRatio: number;
  phMargin: number;
  solidWasteTargetPct: number;
  updatedAt?: any;
  updatedBy?: string;
}

export type EvidenceStatus = 'Draft' | 'Disiapkan' | 'Diperiksa' | 'Disetujui' | 'Dibatalkan';

export interface EvidenceSignature {
  uid: string;
  email: string;
  name: string;
  position: string;
  signedAt: string;
  signatureDataUrl: string;
}

export type EvidenceParamEvalStatus =
  | 'memenuhi'
  | 'mendekati'
  | 'tidak_memenuhi'
  | 'dipantau'
  | 'data_tidak_lengkap'
  | 'belum_dievaluasi'
  | 'tidak_berlaku';

export interface EvidenceParamResult {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  display: string;
  limitDisplay: string;
  status: EvidenceParamEvalStatus;
  note?: string;
  basisRegulasi?: string;
}

export interface DailyEvidenceSnapshot {
  recordId: string;
  date: string;
  locationCode: string;
  locationName: string;
  locationFullName: string;
  officer: string;
  sampleTime?: string;
  weather?: string;
  wastewaterSource?: string;
  monitoringType: string;
  params: EvidenceParamResult[];
  overall: ComplianceConclusion;
  failedParams: string[];
  incompleteParams?: string[];
  unverifiedParams?: string[];
  conclusionText: string;
  followUpAction?: string;
  hasPhoto: boolean;
  photoTakenAt?: string;
  photoDimensions?: string;
  photoMimeType?: string;
  standardsBasis: string;
}

export interface MonthlyParamStat {
  min: number | null;
  avg: number | null;
  max: number | null;
  status: EvidenceParamEvalStatus;
  exceedDays: number;
}

export interface MonthlyDayItem {
  date: string;
  dayNumber: number;
  sampleTime?: string | null;
  officer?: string | null;
  weather?: string | null;
  ph: number | null;
  tss: number | null;
  debit: number | null;
  fe: number | null;
  mn: number | null;
  status:
    | 'memenuhi'
    | 'tidak_memenuhi'
    | 'data_tidak_lengkap'
    | 'belum_dievaluasi'
    | 'tidak_berlaku'
    | 'tanpa_data';
  duplicateCount: number;
  dailyDocumentNo?: string | null;
}

export interface MonthlyEvidenceSnapshot {
  documentNo: string;
  period: string;
  periodLabel: string;
  locationCode: string;
  locationName: string;
  docSuffix?: string | null;
  daysInMonth: number;
  samplingDays: number;
  passDays: number;
  failDays: number;
  incompleteDays?: number;
  unevaluatedDays?: number;
  compliancePct: number | null;
  completenessPct: number;
  overall: ComplianceConclusion | 'BELUM ADA DATA';
  stats: Record<'ph' | 'tss' | 'debit' | 'fe' | 'mn', MonthlyParamStat>;
  days: MonthlyDayItem[];
  missingDays: string[];
  failedParamKeys: string[];
  conclusionText: string;
  standardsBasis: string;
}

export interface RevisionHistoryItem {
  revision: number;
  revisedAt: string;
  revisedBy: string;
  reason?: string;
  previousHash: string;
}

export interface EvidenceReport {
  id: string;
  type: 'daily' | 'monthly';
  documentNo: string | null;
  revision: number;
  period: string;
  locationCode: string;
  wastewaterId?: string;
  date?: string;
  status: EvidenceStatus;
  snapshot: DailyEvidenceSnapshot | MonthlyEvidenceSnapshot;
  snapshotHash: string;
  signatures: {
    prepared?: EvidenceSignature;
    reviewed?: EvidenceSignature;
    approved?: EvidenceSignature;
  };
  issuedAt?: string | null;
  verifyToken?: string;
  revisionHistory?: RevisionHistoryItem[];
  followUpAction?: string;
  cancellationReason?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface EvidenceVerification {
  reportId?: string;
  documentNo: string;
  type: 'daily' | 'monthly';
  period: string;
  locationCode: string;
  issuedAt: string;
  status: EvidenceStatus;
  overall: ComplianceConclusion | 'BELUM ADA DATA';
  hashPrefix: string;
}
