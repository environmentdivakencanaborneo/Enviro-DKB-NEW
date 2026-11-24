/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type {
  ComplianceConclusion,
  LegacyWaterStatus,
  MissingParamReasonCode,
  MissingParamReason,
  EvaluationHistoryEntry,
  WastewaterData,
  SurfaceWaterData,
  DomesticComplianceStatus,
  DomesticWastewaterData,
  WqLocation,
  StandardMedia,
  StandardVerificationStatus,
  StandardEffectiveStatus,
  StandardRevisionEntry,
  EnvironmentalStandard,
  InternalThresholdsConfig,
  EvidenceStatus,
  EvidenceSignature,
  EvidenceParamEvalStatus,
  EvidenceParamResult,
  DailyEvidenceSnapshot,
  MonthlyParamStat,
  MonthlyDayItem,
  MonthlyEvidenceSnapshot,
  RevisionHistoryItem,
  EvidenceReport,
  EvidenceVerification,
} from '../shared/waterTypes';

export interface WastewaterPhoto {
  id: string;
  wastewaterId: string;
  dataUrl: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  sizeBytes: number;
  takenAt: string;
  createdBy: string;
  createdAt?: any;
}

export interface RainfallData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  station: string;
  gaugeType: 'Manual' | 'Automatic';
  rainfall: number; // in mm
  intensity: number; // in mm/hour
  weather: 'Clear' | 'Cloudy' | 'Light Rain' | 'Heavy Rain' | 'Storm';
  notes?: string;
}

export interface NurseryData {
  id: string;
  batchCode?: string;
  plantType: string;
  quantity: number;
  source: string;
  ageWeeks: number;
  heightCm: number;
  status: 'Sehat' | 'Perlu Perawatan' | 'Rusak' | 'Healthy' | 'Need Care' | 'Critical';
  location: string;
  dateIn: string;
  seedDate?: string;
  minimumStock?: number;
}

export interface NurseryStockOut {
  id: string;
  nomorTransaksi?: string;
  tanggal: string;
  jenisBibitId: string;
  namaBibit: string;
  species: string;
  batchCode?: string;
  jumlahKeluar: number;
  satuan: string;
  jenisTransaksi?: 'Penanaman' | 'Penggantian Tanaman Mati' | 'Distribusi' | 'Mutasi' | 'Rusak' | 'Lainnya';
  tujuan: string;
  lokasiPenanaman?: string;
  kapling?: string;
  blok?: string;
  pit?: string;
  luasReklamasi: number;
  penanggungJawab: string;
  keterangan: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}


export interface ReclamationPlan {
  id: string;
  areaName: string;
  sizeHa: number; // target / planned size
  realizedSizeHa?: number; // realized / actual size
  targetYear: number; // target / planned year
  realizedYear?: number; // realized / actual year
  plantType: string; // target / planned plant type
  realizedPlantType?: string; // realized / actual plant type
  method: string; // target / planned method
  realizedMethod?: string; // realized / actual method
  estimatedCost: number; // target / planned cost
  realizedCost?: number; // realized / actual cost
  status: 'Draft' | 'Approved' | 'In Progress' | 'Completed';
  pic: string;
}

export interface ReclamationGuarantee {
  id: string;
  guaranteeNo: string;
  periodYear?: number;
  guaranteeType: 'Bank Guarantee' | 'Time Deposit' | 'Environmental Bond';
  bankType?: 'Bank Pemerintah' | 'Lainnya';
  guaranteeCategory?: 'Jaminan Reklamasi' | 'Jaminan Pascatambang';
  value: number;
  issuingInstitution: string;
  issuedDate: string;
  dueDate: string;
  status: 'Active' | 'Renewal Needed' | 'Claimed' | 'Released';
  docUrl?: string;
}

export interface WasteIn {
  id: string;
  dateIn: string;
  wasteType: string;
  source: string;
  weightKg: number;
  characteristic: 'Flammable' | 'Toxic' | 'Corrosive' | 'Reactive' | 'Infectious';
  code: string; // Lampiran IX PP No. 22 Tahun 2021 jo. Permen LHK No. 6 Tahun 2021
  tpsLocation: string;
  officer: string;
  documentationUrl?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface WasteOut {
  id: string;
  dateOut: string;
  wasteType: string;
  weightKg: number;
  destination: string;
  transporter: string;
  manifestNo: string;
  vehicleNo: string;
  driverName: string;
  recipient: string;
  documentationUrl?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface BatchWarning {
  batchId: string;
  weightRemaining: number;
  daysRemaining: number;
  maxStorageDays: number;
  entryDate: string;
  verificationStatus?: 'Terverifikasi' | 'PERLU VERIFIKASI';
}

export interface WasteStock {
  wasteType: string;
  code: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  earliestDateIn: string | null;
  daysInTps: number;
  maxStorageDays: number;
  storageBasis?: string;
  verificationStatus?: 'Terverifikasi' | 'PERLU VERIFIKASI';
  batchWarnings?: BatchWarning[];
  hasShortfall?: boolean;
  shortfallKg?: number;
}

export interface WasteBatchAllocation {
  inId: string;
  dateIn: string;
  kg: number;
}

export interface WasteInLedgerInfo {
  weightUsed: number;
  weightRemaining: number;
  status: 'Tersedia' | 'Sebagian Keluar' | 'Habis';
  daysInTps: number;
  daysRemaining: number;
  maxStorageDays: number;
  verificationStatus?: 'Terverifikasi' | 'PERLU VERIFIKASI';
}

export interface WasteOutLedgerInfo {
  allocations: WasteBatchAllocation[];
  shortfallKg: number;
}

export interface WasteLedgerResult {
  stocks: WasteStock[];
  inById: Record<string, WasteInLedgerInfo>;
  outById: Record<string, WasteOutLedgerInfo>;
  hasInconsistency: boolean;
}

export interface EnvironmentalDocument {
  id: string;
  name: string;
  type: 'AMDAL' | 'UKL-UPL' | 'Persetujuan Lingkungan' | 'Pertek Air Limbah' | 'Pertek Emisi' | 'Izin TPS B3' | 'Izin Pemanfaatan' | 'Persetujuan Rencana Reklamasi' | 'Lainnya';
  docNo: string;
  issuedDate: string;
  expiryDate: string | 'N/A';
  status: 'Active' | 'Expired' | 'Renewal Needed';
  pic: string;
  issuer?: string;
  obligations?: string;
  documentUrl?: string;
  fileSize?: string;
}

export interface ComplianceCalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'Reporting' | 'Inspection' | 'Exceedance' | 'Permit Expiry';
  description: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  assignedTo?: string;
  progress?: number;
}

export interface AlertNotification {
  id: string;
  timestamp: string;
  type: 'Critical' | 'Warning' | 'Info';
  category:
    | 'Wastewater'
    | 'B3 Waste'
    | 'Permit'
    | 'Guarantee'
    | 'SurfaceWater'
    | 'Solid Waste'
    | 'Air & Emission'
    | 'AMD Treatment'
    | 'Biodiversity'
    | 'Incident';
  title: string;
  message: string;
  read: boolean;
  createdBy: string; // ← TAMBAHKAN INI: email user yang memicu notifikasi
  readBy?: string[];
  clearedBy?: string[]; // track users who have read system notifications
}

export interface UserProfile {
  uid?: string;
  name: string;
  fullName?: string;
  email: string;
  company?: string;
  phone?: string;
  department?: string;
  position?: string;
  site?: string;
  nik?: string;
  photoURL?: string;
  status?: 'Pending' | 'Active' | 'Rejected' | 'Suspended' | 'Disabled' | 'Deleted';
  role: string;
  isApproved?: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string | null;
  loginCount?: number;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
  isActive?: boolean;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  claimsUpdatedAt?: any;
}

export interface PermissionMatrixItem {
  module: string;
  label: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  approve: boolean;
}

export interface RolePermissions {
  role: string;
  permissions: Record<string, PermissionMatrixItem>;
}

export interface SolidWasteData {
  id: string;
  date: string;
  source: string;              // "Kantor", "Messe Karyawan", "Kantin", "Bengkel", "Washing Bay" etc
  organicKg: number;           // organic generated
  inorganicKg: number;         // inorganic generated
  residueKg: number;           // residue generated
  compostedKg: number;         // organic processed/composted
  recycledKg: number;          // inorganic processed/recycled
  officer: string;
  transporterVehicle?: string; // Kendaraan pengangkut
  finalDestination?: string;   // Tujuan akhir
  notes?: string;
}

export interface GoogleSyncConfig {
  clientId: string;
  spreadsheetId: string;
  folderId: string;
  isAuthenticated: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline';
  lastSynced: string | null;
}

export interface SyncQueueItem {
  id: string;
  timestamp: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
}

export interface EnvironmentalCost {
  id: string;
  budgetCode?: string; // e.g. DKB-ENV-2026-OPEX-MON-001
  year: number;
  period: string; // e.g. "Q1", "Q2", "Q3", "Q4", "Semester I", "Semester II", "Tahunan"
  category: string; // e.g. "Pemantauan Kualitas Lingkungan", "Reklamasi & Revegetasi", "Pengelolaan Limbah Terpadu", "Water Treatment (KPL)", "Izin LH & Administrasi"
  plannedOpex: number;
  plannedCapex: number;
  realizedOpex: number;
  realizedCapex: number;
  notes?: string;
  officer: string;
}


export type FindingSeverity = 'NC Mayor' | 'NC Minor' | 'Observasi' | 'OFI';
export type FindingStatus = 'Terbuka' | 'Dalam Proses' | 'Verifikasi' | 'Selesai';
export type FindingSource =
  | 'Audit Internal'
  | 'Audit Eksternal'
  | 'Inspeksi DLH'
  | 'Inspeksi Internal'
  | 'Pengawasan Eksternal'
  | 'PROPER'
  | 'Lainnya';

export interface CapaHistory {
  status: FindingStatus;
  notes: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CapaData {
  id: string;
  source: FindingSource;
  title: string;
  description: string;
  severity: FindingSeverity;
  discoveryDate: string;
  targetDate: string;
  pic: string;
  why1?: string;
  why2?: string;
  why3?: string;
  why4?: string;
  why5?: string;
  rootCause?: string;
  correctiveAction: string;
  preventiveAction: string;
  status: FindingStatus;
  history: CapaHistory[];
  verificationNotes?: string;
  closedDate?: string;
  createdAt: string;
  createdBy: string;
}

export type ComplianceAspect = 'Kualitas Air' | 'Kualitas Udara/Emisi' | 'Pengelolaan Limbah B3' | 'Sosial/Masyarakat' | 'Flora/Fauna' | 'Lainnya';
export type ComplianceStatus = 'Taat' | 'Belum Taat' | 'Tidak Taat' | 'Tidak Relevan';

export interface ComplianceMatrixData {
  id: string;
  period: string; // e.g., "H1-2023"
  aspect: ComplianceAspect;
  impactDetails: string;
  target: string;
  status: ComplianceStatus;
  evidenceUrl?: string;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export type IncidentCategory = 'Tumpahan Hidrokarbon' | 'Tanggul Jebol' | 'Air Asam Tambang' | 'Kebakaran Hutan/Lahan' | 'Emisi Asap Tebal' | 'Lainnya';
export type IncidentStatus = 'Dilaporkan' | 'Investigasi' | 'Tindakan Korektif' | 'Ditutup';

export interface IncidentData {
  id: string;
  date: string;
  time: string;
  category: IncidentCategory;
  location: string;
  chronology: string;
  firstAction: string;
  status: IncidentStatus;
  environmentalLoss: string; // Deskripsi dampak/kerugian
  documentationUrl?: string;
  reporter: string;
  createdAt?: string;
  createdBy?: string;
}

export type RegulatoryWatchStatus =
  | 'DRAFT'
  | 'MENUNGGU VERIFIKASI'
  | 'BERLAKU'
  | 'DIUBAH'
  | 'DICABUT'
  | 'Draft'
  | 'Berlaku'
  | 'Dicabut'
  | 'Perlu Kajian';

export interface RegulatoryMetadataHistoryItem {
  updatedAt: string;
  updatedBy: string;
  reason?: string;
  previousStatus?: string;
}

export interface RegulatoryWatchData {
  id: string;
  source: string;
  issuer?: string;
  regulationNo: string;
  about: string;
  issueDate: string;          // Dipertahankan untuk kompatibilitas mundur (merujuk enactedDate)
  enactedDate?: string;       // Tanggal penetapan
  promulgatedDate?: string;   // Tanggal pengundangan
  effectiveDate?: string;     // Tanggal mulai berlaku
  implication: string;
  requiredActions?: string;
  affectedModules?: string[];
  amendedBy?: string;
  revokedBy?: string;
  relationNotes?: string;
  status: RegulatoryWatchStatus;
  verificationStatus?: 'Terverifikasi' | 'Perlu verifikasi';
  link?: string;
  officialSourceUrl?: string;
  metadataHistory?: RegulatoryMetadataHistoryItem[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// Evidence types re-exported from ../shared/waterTypes above

export interface UserSignature {
  uid: string;
  dataUrl: string;
  updatedAt?: any;
}

// ============================================================================
// 6 MODUL OPERASIONAL BARU DEM (PT DIVA KENCANA BORNEO)
// ============================================================================

export interface AmdTreatmentData {
  id: string;
  date: string;
  location: string;
  treatmentZone: string;
  treatmentMethod?: 'Pengapuran Aktif' | 'Lahan Basah Buatan' | 'Hibrida';
  inflowPh: number;
  outflowPh: number;
  inflowDebitM3s: number;
  outflowDebitM3s: number;
  limeKg: number;
  alumKg: number;
  activeLimeStockKg?: number;
  complianceStatus: 'Memenuhi' | 'Warning' | 'Tidak Memenuhi';
  officer: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface AirEmissionData {
  id: string;
  date: string;
  monitoringCategory: 'Udara Ambien' | 'Emisi Genset' | 'Emisi Alat Berat' | 'Kebisingan';
  location: string;
  pm10: number;
  pm25: number;
  tsp: number;
  so2: number;
  no2: number;
  co: number;
  noiseDb: number;
  status: 'Safe' | 'Warning' | 'Exceeded';
  officer: string;
  labRef?: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface TopsoilErosionData {
  id: string;
  date: string;
  blockLocation: string;
  topsoilVolumeM3: number;
  stockpileUsedM3: number;
  cumulativeBalanceM3: number;
  thicknessCm: number;
  coverCropAreaHa: number;
  erosionSeverity: 'Rendah' | 'Sedang' | 'Tinggi' | 'Kritis';
  mitigationAction: string;
  officer: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface BiodiversityData {
  id: string;
  date: string;
  zone: string;
  category: 'Flora' | 'Fauna' | 'Koridor Satwa';
  speciesName: string;
  scientificName: string;
  conservationStatus: 'Dilindungi (Permen LHK P.106/2018)' | 'Dilindungi (PP 106/2018)' | 'Endemik' | 'IUCN Threatened' | 'Umum';
  count: number;
  observationMethod: string;
  condition: 'Sehat' | 'Terancam' | 'Bermigrasi';
  officer: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface IadlRiskData {
  id: string;
  code: string;
  activity: string;
  aspect: string;
  impact: string;
  environmentalCondition: 'Normal' | 'Abnormal' | 'Darurat';
  severityScore: number;
  likelihoodScore: number;
  riskScore: number;
  riskLevel: 'Rendah' | 'Sedang' | 'Tinggi' | 'Signifikan/Kritis';
  controlMeasure: string;
  legalRef: string;
  pic: string;
  status: 'Aktif Terkendali' | 'Perlu Mitigasi' | 'Selesai';
  targetDate?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface ProperRkabData {
  id: string;
  year: number;
  period: string;
  recordType: 'PROPER' | 'RKAB';
  category: string;
  indicatorName: string;
  targetValue: string;
  realizedValue: string;
  scoreWeight: number;
  selfScore: number;
  targetProperRating: 'Emas' | 'Hijau' | 'Biru' | 'Merah';
  actualProperRating?: 'Emas' | 'Hijau' | 'Biru' | 'Merah' | 'Hitam';
  status: 'Terpenuhi' | 'Proses Pemenuhan' | 'Gap Terdeteksi';
  evidenceUrl?: string;
  pic: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

// Master Baku Mutu & InternalThresholdsConfig re-exported from ../shared/waterTypes above

export interface ProperCriteriaItem {
  id: string;
  aspek: string;
  indikator: string;
  bobot: number;
  catatan?: string;
}

export interface ProperCriteriaMaster {
  id?: string;
  regulationBasis: string;
  criteria: ProperCriteriaItem[];
  updatedAt?: any;
  updatedBy?: string;
}

// ============================================================================
// MODUL BARU FASE 3 (DEM — PT DIVA KENCANA BORNEO)
// ============================================================================

export type PertekSloCategory =
  | 'Pembuangan Air Limbah'
  | 'Pemanfaatan Air Limbah'
  | 'Emisi Udara'
  | 'Penyimpanan LB3'
  | 'Lainnya';

export interface PertekSloData {
  id: string;
  docKind: 'Pertek' | 'SLO';
  category: PertekSloCategory;
  permitNumber: string;
  title: string;
  issuingAuthority: string;
  issuedDate: string;
  expiryDate: string; // YYYY-MM-DD or 'N/A'
  compliancePoint: string; // Titik penaatan (contoh: KPL-01, Cerobong Genset #1)
  reportingObligation: string;
  status: 'Aktif' | 'Segera Berakhir' | 'Kedaluwarsa' | 'Proses Perpanjangan';
  documentUrl?: string;
  pic: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export type ReportingCategory =
  | 'RKL-RPL Semester'
  | 'Laporan Pertek'
  | 'Neraca & Logbook LB3'
  | 'Laporan GRK Tahunan (Maret)'
  | 'RKAB Lingkungan'
  | 'Laporan Reklamasi & Pascatambang';

export interface ReportingCalendarData {
  id: string;
  reportType: ReportingCategory;
  periodLabel: string; // cth: "Semester I 2026", "Triwulan II 2026", "Tahunan 2026 (Maret)"
  dueDate: string; // YYYY-MM-DD
  targetAgency: string;
  pic: string;
  status: 'Terjadwal' | 'Proses' | 'Terkirim' | 'Terlambat';
  submittedDate?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export type SupervisionAgency =
  | 'DLH Provinsi/Kab'
  | 'KLH/BPLH'
  | 'Inspektur Tambang ESDM'
  | 'Kementerian Kehutanan';

export type AdministrativeSanctionType =
  | 'Tidak Ada'
  | 'Teguran Tertulis'
  | 'Paksaan Pemerintah'
  | 'Pembekuan Izin'
  | 'Pencabutan Izin';

export interface ExternalSupervisionData {
  id: string;
  inspectionDate: string;
  agency: SupervisionAgency;
  officialDocNo: string;
  inspectionScope: string;
  findingsSummary: string;
  sanctionCategory: AdministrativeSanctionType;
  followUpDeadline: string;
  resolutionStatus: 'Terbuka' | 'Dalam Tindak Lanjut' | 'Selesai Diverifikasi';
  linkedCapaId?: string;
  pic: string;
  evidenceUrl?: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

// DomesticWastewaterData re-exported from ../shared/waterTypes above

export type GhgActivityCategory =
  | 'Solar Alat Berat & Hauling'
  | 'Solar Genset & Pembangkit'
  | 'Listrik PLN / Non-Tambang'
  | 'Bahan Peledak (ANFO/Emulsi)'
  | 'Perubahan Lahan Terbuka'
  | 'Lainnya';

export interface GhgEmissionFactorData {
  id: string;
  activityCategory: GhgActivityCategory;
  factorName: string;
  unit: string; // cth: "Liter", "kWh", "kg", "Ha"
  factorKgCo2ePerUnit: number;
  gasScope: 'Scope 1 (Emisi Langsung)' | 'Scope 2 (Energi Tidak Langsung)' | 'Scope 3 / Lahan';
  referenceSource: string; // Wajib diisi pengguna (IPCC / KLH/BPLH / ESDM)
  effectiveYear: number;
  gwpReference?: string;
  verificationStatus?: 'Terverifikasi' | 'PERLU VERIFIKASI';
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface GhgActivityData {
  id: string;
  date: string;
  reportingYear: number;
  monthPeriod: string; // YYYY-MM
  activityCategory: GhgActivityCategory;
  sourceLocation: string;
  quantity: number;
  unit: string;
  factorId?: string;
  factorNameSnapshot?: string;
  factorValueSnapshot?: number | null;
  referenceSourceSnapshot?: string;
  gasScopeSnapshot?: string;
  categorySnapshot?: string;
  unitSnapshot?: string;
  effectiveYearSnapshot?: number | null;
  gwpSnapshot?: string;
  verificationStatusSnapshot?: 'Terverifikasi' | 'PERLU VERIFIKASI';
  calculationStatus?: 'TERHITUNG' | 'BELUM TERHITUNG' | 'PERLU VERIFIKASI';
  calculationNote?: string;
  emissionsTco2e: number | null; // Null jika faktor belum dipilih/terverifikasi (bukan nol)
  correctionReason?: string;
  officer: string;
  notes?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export type AuditActionType =
  | 'insert'
  | 'update'
  | 'delete'
  | 'sync'
  | 'backup'
  | 'restore'
  | 'export'
  | 'login'
  | 'logout'
  | 'approve'
  | 'reject'
  | 'role_change'
  | 'correct';

export interface AuditLogEntry {
  id: string;
  uid: string;
  timestamp: any;
  user: string;
  actorName?: string;
  actorRole?: string;
  module: string;
  collection: string;
  recordId: string;
  action: AuditActionType;
  details: string;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  correctionReason?: string | null;
  status: 'SUCCESS' | 'FAILED';
  source?: 'client' | 'server';
}

export interface AuditWriteResult {
  success: boolean;
  logId?: string;
  error?: string;
}

