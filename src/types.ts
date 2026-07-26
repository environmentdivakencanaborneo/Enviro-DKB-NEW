/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WastewaterData {
  id: string;
  date: string;
  location: string;
  officer: string;
  ph: number;       // standard: 6.0 - 9.0 (PP No. 22 Tahun 2021)
  tss: number;      // standard: max 200 mg/L (or based on regional)
  debit: number;    // discharge flow rate, allow 3 decimal places
  fe: number;       // Iron - standard: max 7 mg/L
  mn: number;       // Mangan - standard: max 4 mg/L
  status: 'Safe' | 'Warning' | 'Exceeded'; 
  monitoringType?: 'Harian' | 'Bulanan';
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
  plantType: string;
  quantity: number;
  source: string;
  ageWeeks: number;
  heightCm: number;
  status: 'Healthy' | 'Need Care' | 'Critical';
  location: string;
  dateIn: string;
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
  category: 'Wastewater' | 'B3 Waste' | 'Permit' | 'Guarantee' | 'SurfaceWater';
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
