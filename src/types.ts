/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WastewaterData {
  id: string;
  date: string;
  location: string;
  officer: string;
  ph: number;       // standard: 6.0 - 9.0 (Kepmen LH No. 113 Tahun 2003 / SK Pertek)
  tss: number;      // standard: max 300 mg/L (SK Pertek PT DKB No. 503/IPAL-LH/DPM-PTSP/2021)
  debit: number;    // discharge flow rate, allow 3 decimal places
  fe: number;       // Iron - standard: max 7 mg/L
  mn: number;       // Mangan - standard: max 4 mg/L
  status: 'Safe' | 'Warning' | 'Exceeded'; 
  monitoringType?: 'Harian' | 'Bulanan';
  sampleTime?: string;                 // 'HH:mm' waktu lokal
  weather?: 'Cerah' | 'Berawan' | 'Hujan Ringan' | 'Hujan Lebat';
  wastewaterSource?: string;           // contoh 'Settling Pond Outlet'
  locationCode?: string;               // contoh 'KPL-01'
  hasPhoto?: boolean;
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
  isActive: boolean;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

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

export interface SurfaceWaterData {
  id: string;
  date: string;
  location: string;
  officer: string;
  ph: number;       // standard: 6.0 - 9.0
  tss: number;      // standard: max 50 mg/L (PP No. 22 Tahun 2021 Lampiran VI Kelas II)
  doVal: number;    // Dissolved Oxygen - standard: min 4 mg/L
  bod: number;      // standard: max 3 mg/L
  cod: number;      // standard: max 25 mg/L
  fe: number;       // Besi terlarut - standard: max 0.3 mg/L
  mn: number;       // Mangan terlarut - standard: max 0.1 mg/L
  status: 'Safe' | 'Warning' | 'Exceeded';
  monitoringType?: 'Harian' | 'Bulanan';
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
  guaranteeType: 'Bank Guarantee' | 'Time Deposit' | 'Environmental Bond';
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
  code: string; // Permen LHK No. 6 Tahun 2021
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
  entryDate: string;
}

export interface WasteStock {
  wasteType: string;
  code: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  earliestDateIn: string | null;
  daysInTps: number; // warning if near 90 days from earliest check
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
  category: 'Wastewater' | 'B3 Waste' | 'Permit' | 'Guarantee' | 'SurfaceWater' | 'Solid Waste';
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
  status?: 'Pending' | 'Active' | 'Rejected' | 'Disabled' | 'Deleted';
  role: string;
  isApproved?: boolean;
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
export type FindingSource = 'Audit Internal' | 'Audit Eksternal' | 'Inspeksi DLH' | 'Inspeksi Internal' | 'PROPER' | 'Lainnya';

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

export interface RegulatoryWatchData {
  id: string;
  source: string;
  regulationNo: string;
  about: string;
  issueDate: string;
  implication: string;
  status: 'Draft' | 'Berlaku' | 'Dicabut';
  link?: string;
  createdAt?: string;
  createdBy?: string;
}

// ============================================================================
// EVIDENCE HARIAN & BULANAN PEMANTAUAN AIR LIMBAH
// ============================================================================

export type EvidenceStatus = 'Draft' | 'Disiapkan' | 'Diperiksa' | 'Disetujui' | 'Dibatalkan';

export interface EvidenceSignature {
  uid: string;
  email: string;
  name: string;
  position: string;
  signedAt: string;
  signatureDataUrl: string;
}

export interface EvidenceParamResult {
  key: string;
  label: string;
  unit: string;
  value: number;
  display: string;
  limitDisplay: string;
  status: 'memenuhi' | 'mendekati' | 'tidak_memenuhi' | 'dipantau';
  note?: string;
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
  overall: 'MEMENUHI' | 'TIDAK MEMENUHI';
  failedParams: string[];
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
  status: 'memenuhi' | 'mendekati' | 'tidak_memenuhi' | 'dipantau';
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
  status: 'memenuhi' | 'tidak_memenuhi' | 'tanpa_data';
  duplicateCount: number;
  dailyDocumentNo?: string | null;
}

export interface MonthlyEvidenceSnapshot {
  documentNo: string;
  period: string; // YYYY-MM
  periodLabel: string; // e.g. "Juli 2026"
  locationCode: string;
  locationName: string;
  docSuffix?: string | null;
  daysInMonth: number;
  samplingDays: number;
  passDays: number;
  failDays: number;
  compliancePct: number | null;
  completenessPct: number;
  overall: 'MEMENUHI' | 'TIDAK MEMENUHI' | 'BELUM ADA DATA';
  stats: Record<'ph'|'tss'|'debit'|'fe'|'mn', MonthlyParamStat>;
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
  id: string; // WQD-${kodeTitik}-${YYYYMMDD} or WQM-${kodeTitik}-${YYYYMM}
  type: 'daily' | 'monthly';
  documentNo: string | null;
  revision: number;
  period: string; // YYYY-MM
  locationCode: string;
  wastewaterId?: string;
  date?: string; // YYYY-MM-DD
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
  documentNo: string;
  type: 'daily' | 'monthly';
  period: string;
  locationCode: string;
  issuedAt: string;
  status: EvidenceStatus;
  overall: 'MEMENUHI' | 'TIDAK MEMENUHI' | 'BELUM ADA DATA';
  hashPrefix: string;
}

export interface UserSignature {
  uid: string;
  dataUrl: string;
  updatedAt?: any;
}
