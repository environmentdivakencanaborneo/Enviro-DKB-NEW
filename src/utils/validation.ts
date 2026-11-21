/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCalendarDate(dateStr: string): boolean {
  if (!dateRegex.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

const calendarDateSchema = (label = 'tanggal') =>
  z.string().regex(dateRegex, `Format ${label} harus YYYY-MM-DD`).refine(isValidCalendarDate, {
    message: `Nilai ${label} bukan tanggal kalender yang valid`,
  });

const optionalCalendarDateSchema = (label = 'tanggal') =>
  z
    .string()
    .refine((v) => v === '' || isValidCalendarDate(v), {
      message: `Format ${label} harus YYYY-MM-DD yang valid`,
    })
    .optional()
    .nullable();

const complianceConclusionSchema = z
  .enum(['MEMENUHI', 'TIDAK MEMENUHI', 'DATA TIDAK LENGKAP', 'BELUM DIEVALUASI', 'TIDAK BERLAKU'])
  .optional();

const legacyWaterStatusSchema = z.enum([
  'Safe',
  'Warning',
  'Exceeded',
  'Incomplete',
  'Unevaluated',
  'NotApplicable',
]);

export const UserProfileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().trim().email("Format email tidak valid"),
  company: z.string().trim().min(2, "Nama perusahaan minimal 2 karakter").max(100, "Nama perusahaan maksimal 100 karakter"),
  role: z.string().trim().min(2, "Jabatan minimal 2 karakter").max(100, "Jabatan maksimal 100 karakter"),
});

const sampleTimeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MissingParamReasonSchema = z.object({
  reason: z.enum(['Tidak dijadwalkan', 'Menunggu hasil laboratorium', 'Alat rusak', 'Lainnya']),
  note: z.string().trim().max(300).optional(),
});

export const EvaluationHistoryEntrySchema = z.object({
  evaluatedAt: z.string(),
  evaluatedBy: z.string(),
  previousStatus: z.string(),
  newStatus: z.string(),
  reason: z.string(),
  standardBasis: z.string().optional(),
});

function refineMissingParamReasons(
  val: Record<string, any>,
  ctx: z.RefinementCtx,
  paramKeys: { key: string; label: string }[]
) {
  const reasons = (val.missingReasons || {}) as Record<string, { reason?: string; note?: string }>;
  for (const { key, label } of paramKeys) {
    if (val[key] === null) {
      const entry = reasons[key];
      if (!entry || !entry.reason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['missingReasons', key],
          message: `Alasan tidak diukur wajib dipilih karena parameter ${label} bernilai kosong (null)`,
        });
      } else if (entry.reason === 'Lainnya' && (!entry.note || entry.note.trim().length < 3)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['missingReasons', key, 'note'],
          message: `Keterangan wajib diisi minimal 3 karakter untuk alasan "Lainnya" pada ${label}`,
        });
      }
    }
  }
}

export const WastewaterSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: calendarDateSchema('tanggal'),
  location: z.string().trim().min(3, "Lokasi minimal 3 karakter").max(100, "Lokasi maksimal 100 karakter"),
  officer: z.string().trim().min(2, "Nama petugas minimal 2 karakter").max(100, "Nama petugas maksimal 100 karakter"),
  ph: z.number().finite("pH harus berupa angka valid").min(0, "pH minimal 0.0").max(14, "pH maksimal 14.0").nullable(),
  tss: z.number().finite("TSS harus berupa angka valid").min(0, "TSS tidak boleh negatif").nullable(),
  debit: z.number().finite("Debit harus berupa angka valid").min(0, "Debit tidak boleh negatif").nullable(),
  fe: z.number().finite("Fe harus berupa angka valid").min(0, "Fe tidak boleh negatif").nullable(),
  mn: z.number().finite("Mn harus berupa angka valid").min(0, "Mn tidak boleh negatif").nullable(),
  missingReasons: z.record(z.string(), MissingParamReasonSchema).optional().nullable(),
  evaluationHistory: z.array(EvaluationHistoryEntrySchema).optional(),
  status: legacyWaterStatusSchema,
  evaluationStatus: complianceConclusionSchema,
  evaluationReason: z.string().trim().max(500).optional().nullable(),
  unitMap: z.record(z.string(), z.string()).optional().nullable(),
  monitoringType: z.enum(["Harian", "Bulanan"]).optional(),
  sampleTime: z.string().regex(sampleTimeRegex, "Format jam sampling harus HH:mm (24 jam)").optional(),
  weather: z.enum(['Cerah', 'Berawan', 'Hujan Ringan', 'Hujan Lebat']).optional(),
  wastewaterSource: z.string().trim().max(100).optional(),
  locationCode: z.string().trim().max(50).optional(),
  hasPhoto: z.boolean().optional(),
  standardId: z.string().trim().max(120).optional().nullable(),
  standardBasis: z.string().trim().max(300).optional().nullable(),
  standardSnapshot: z.record(z.string(), z.any()).optional().nullable(),
  correctionReason: z.string().trim().max(500).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
}).superRefine((val, ctx) => {
  refineMissingParamReasons(val, ctx, [
    { key: 'ph', label: 'pH' },
    { key: 'tss', label: 'TSS' },
    { key: 'debit', label: 'Debit' },
    { key: 'fe', label: 'Fe' },
    { key: 'mn', label: 'Mn' },
  ]);
});

export const WqLocationSchema = z.object({
  id: z.string().min(1, "ID lokasi wajib diisi"),
  code: z.string().trim().min(2, "Kode lokasi minimal 2 karakter").max(20, "Kode lokasi maksimal 20 karakter"),
  name: z.string().trim().min(3, "Nama titik sampling minimal 3 karakter").max(100, "Nama titik sampling maksimal 100 karakter"),
  defaultSource: z.string().trim().min(2, "Sumber air limbah minimal 2 karakter").max(100, "Sumber air limbah maksimal 100 karakter"),
  docSuffix: z.string().trim().max(50).optional(),
  kelasAir: z.enum(['I', 'II', 'III', 'IV']).optional(),
  isActive: z.boolean(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const WastewaterPhotoSchema = z.object({
  id: z.string().min(1, "ID foto wajib diisi"),
  wastewaterId: z.string().min(1, "ID catatan air limbah wajib diisi"),
  dataUrl: z.string().min(1, "Data URL foto wajib diisi"),
  mimeType: z.literal('image/jpeg'),
  width: z.number().positive(),
  height: z.number().positive(),
  sizeBytes: z.number().nonnegative(),
  takenAt: z.string().min(1, "Waktu pengambilan foto wajib diisi"),
  createdBy: z.string().min(1, "Petugas pengunggah wajib diisi"),
  createdAt: z.any().optional(),
});

export const SurfaceWaterSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: calendarDateSchema('tanggal'),
  location: z.string().trim().min(3, "Lokasi minimal 3 karakter").max(100, "Lokasi maksimal 100 karakter"),
  officer: z.string().trim().min(2, "Nama petugas minimal 2 karakter").max(100, "Nama petugas maksimal 100 karakter"),
  ph: z.number().finite("pH harus angka valid").min(0, "pH minimal 0.0").max(14, "pH maksimal 14.0").nullable(),
  tss: z.number().finite("TSS harus angka valid").min(0, "TSS tidak boleh negatif").nullable(),
  doVal: z.number().finite("DO harus angka valid").min(0, "DO tidak boleh negatif").nullable(),
  bod: z.number().finite("BOD harus angka valid").min(0, "BOD tidak boleh negatif").nullable(),
  cod: z.number().finite("COD harus angka valid").min(0, "COD tidak boleh negatif").nullable(),
  fe: z.number().finite("Fe harus angka valid").min(0, "Fe tidak boleh negatif").nullable(),
  mn: z.number().finite("Mn harus angka valid").min(0, "Mn tidak boleh negatif").nullable(),
  missingReasons: z.record(z.string(), MissingParamReasonSchema).optional().nullable(),
  evaluationHistory: z.array(EvaluationHistoryEntrySchema).optional(),
  status: legacyWaterStatusSchema,
  evaluationStatus: complianceConclusionSchema,
  evaluationReason: z.string().trim().max(500).optional().nullable(),
  unitMap: z.record(z.string(), z.string()).optional().nullable(),
  monitoringType: z.enum(["Harian", "Bulanan"]).optional(),
  kelasAir: z.enum(['I', 'II', 'III', 'IV']).optional(),
  standardId: z.string().trim().max(120).optional().nullable(),
  standardBasis: z.string().trim().max(300).optional().nullable(),
  standardSnapshot: z.record(z.string(), z.any()).optional().nullable(),
  correctionReason: z.string().trim().max(500).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
}).superRefine((val, ctx) => {
  refineMissingParamReasons(val, ctx, [
    { key: 'ph', label: 'pH' },
    { key: 'tss', label: 'TSS' },
    { key: 'doVal', label: 'DO' },
    { key: 'bod', label: 'BOD' },
    { key: 'cod', label: 'COD' },
    { key: 'fe', label: 'Fe' },
    { key: 'mn', label: 'Mn' },
  ]);
});

export const RainfallSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: calendarDateSchema('tanggal'),
  startTime: z.string().min(1, "Waktu mulai wajib diisi"),
  endTime: z.string().min(1, "Waktu selesai wajib diisi"),
  duration: z.number().finite().min(0, "Durasi tidak boleh negatif"),
  station: z.string().trim().min(3, "Stasiun minimal 3 karakter").max(100, "Stasiun maksimal 100 karakter"),
  gaugeType: z.enum(["Manual", "Automatic"]),
  rainfall: z.number().finite().min(0, "Curah hujan tidak boleh negatif"),
  intensity: z.number().finite().min(0, "Intensitas harus berupa angka tidak boleh negatif"),
  weather: z.enum(["Clear", "Cloudy", "Light Rain", "Heavy Rain", "Storm"]),
  notes: z.string().optional().nullable(),
});

export const NurserySchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  batchCode: z.string().optional().nullable(),
  plantType: z.string().trim().min(2, "Jenis bibit tanaman wajib diisi"),
  quantity: z.number().int("Jumlah harus berupa bilangan bulat").min(0, "Jumlah tidak boleh negatif"),
  source: z.string().trim().min(2, "Sumber bibit wajib diisi"),
  ageWeeks: z.number().min(0, "Usia tidak boleh negatif"),
  heightCm: z.number().min(0, "Tinggi tidak boleh negatif"),
  status: z.enum(["Healthy", "Need Care", "Critical", "Sehat", "Perlu Perawatan", "Rusak"]),
  location: z.string().trim().min(2, "Lokasi wajib diisi"),
  dateIn: z.string().regex(dateRegex, "Format tanggal masuk harus YYYY-MM-DD"),
  seedDate: z.string().regex(dateRegex, "Format tanggal pembibitan harus YYYY-MM-DD").optional().nullable(),
  minimumStock: z.number().min(0).optional().nullable(),
});

export const NurseryStockOutSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  nomorTransaksi: z.string().optional().nullable(),
  tanggal: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  jenisBibitId: z.string().min(1, "Jenis bibit wajib dipilih"),
  namaBibit: z.string().min(1, "Nama bibit wajib diisi"),
  species: z.string(),
  batchCode: z.string().optional().nullable(),
  jumlahKeluar: z.number().int("Jumlah harus bilangan bulat").min(1, "Minimal jumlah keluar adalah 1"),
  satuan: z.string().min(1, "Satuan wajib diisi"),
  jenisTransaksi: z.enum(["Penanaman", "Penggantian Tanaman Mati", "Distribusi", "Mutasi", "Rusak", "Lainnya"]).optional().nullable(),
  tujuan: z.string().min(1, "Tujuan penanaman wajib diisi"),
  lokasiPenanaman: z.string().trim().min(1, "Lokasi penanaman wajib diisi"),
  kapling: z.string().optional().nullable(),
  blok: z.string().optional().nullable(),
  pit: z.string().optional().nullable(),
  luasReklamasi: z.number().min(0, "Luas area tidak boleh negatif"),
  penanggungJawab: z.string().min(1, "Penanggung jawab wajib diisi"),
  keterangan: z.string().optional(),
  createdBy: z.string().min(1, "CreatedBy wajib diisi"),
  createdAt: z.any().optional(),
  updatedBy: z.string().optional(),
  updatedAt: z.any().optional(),
});

export const ReclamationPlanSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  areaName: z.string().trim().min(2, "Nama area wajib diisi"),
  sizeHa: z.number().min(0, "Luas wilayah tidak boleh negatif"),
  realizedSizeHa: z.number().optional().nullable(),
  targetYear: z.number().int().min(2000, "Tahun target minimal 2000").max(2100, "Tahun target maksimal 2100"),
  realizedYear: z.number().optional().nullable(),
  plantType: z.string().trim().min(2, "Jenis tanaman wajib diisi"),
  realizedPlantType: z.string().optional().nullable(),
  method: z.string().trim().min(2, "Metode wajib diisi"),
  realizedMethod: z.string().optional().nullable(),
  estimatedCost: z.number().min(0, "Estimasi biaya tidak boleh negatif"),
  realizedCost: z.number().optional().nullable(),
  status: z.enum(["Draft", "Approved", "In Progress", "Completed"]),
  pic: z.string().trim().min(2, "Nama PIC wajib diisi"),
});

export const ReclamationGuaranteeSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  guaranteeNo: z.string().trim().min(1, "Nomor jaminan wajib diisi"),
  periodYear: z.number().int().min(2000).max(2100).optional().nullable(),
  guaranteeType: z.enum(["Bank Guarantee", "Time Deposit", "Environmental Bond"]),
  bankType: z.enum(["Bank Pemerintah", "Lainnya"]).optional().nullable(),
  guaranteeCategory: z.enum(["Jaminan Reklamasi", "Jaminan Pascatambang"]).optional().nullable(),
  value: z.number().min(0, "Nilai jaminan tidak boleh negatif"),
  issuingInstitution: z.string().trim().min(2, "Lembaga penerbit wajib diisi"),
  issuedDate: z.string().regex(dateRegex, "Format tanggal terbit harus YYYY-MM-DD"),
  dueDate: z.string().regex(dateRegex, "Format tanggal jatuh tempo harus YYYY-MM-DD"),
  status: z.enum(["Active", "Renewal Needed", "Claimed", "Released"]),
  docUrl: z.string().trim().optional().nullable(),
});

export const WasteInSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  dateIn: calendarDateSchema('tanggal masuk'),
  wasteType: z.string().trim().min(2, "Jenis limbah wajib diisi"),
  source: z.string().trim().min(2, "Sumber asal wajib diisi"),
  weightKg: z.number().finite("Berat harus angka valid").positive("Berat harus lebih dari 0"),
  characteristic: z.enum(["Flammable", "Toxic", "Corrosive", "Reactive", "Infectious"]),
  code: z.string().trim().min(1, "Kode limbah wajib diisi"),
  tpsLocation: z.string().trim().min(2, "Lokasi TPS wajib diisi"),
  officer: z.string().trim().min(2, "Nama petugas wajib diisi"),
  documentationUrl: z.string().trim().optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const WasteOutSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  dateOut: calendarDateSchema('tanggal keluar'),
  wasteType: z.string().trim().min(2, "Jenis limbah wajib diisi"),
  weightKg: z.number().finite("Berat harus angka valid").positive("Berat harus lebih dari 0"),
  destination: z.string().trim().min(2, "Tujuan pembuangan wajib diisi"),
  transporter: z.string().trim().min(2, "Pihak transporter wajib diisi"),
  manifestNo: z.string().trim().min(1, "Nomor manifest wajib diisi"),
  vehicleNo: z.string().trim().min(1, "Nomor armada kendaraan wajib diisi"),
  driverName: z.string().trim().min(2, "Nama pengemudi wajib diisi"),
  recipient: z.string().trim().min(2, "Nama penerima wajib diisi"),
  documentationUrl: z.string().trim().optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const EnvironmentalDocumentSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  name: z.string().trim().min(3, "Nama dokumen wajib diisi"),
  type: z.enum([
    "AMDAL",
    "UKL-UPL",
    "Persetujuan Lingkungan",
    "Pertek Air Limbah",
    "Pertek Emisi",
    "Izin TPS B3",
    "Izin Pemanfaatan",
    "Persetujuan Rencana Reklamasi",
    "Lainnya"
  ]),
  docNo: z.string().trim().min(1, "Nomor izin dokumen wajib diisi"),
  issuedDate: z.string().regex(dateRegex, "Format tanggal penerbitan harus YYYY-MM-DD"),
  expiryDate: z.string().min(1, "Tanggal kadaluarsa wajib diisi"),
  status: z.enum(["Active", "Expired", "Renewal Needed"]),
  pic: z.string().trim().min(2, "Penanggung jawab (PIC) wajib diisi"),
  issuer: z.string().trim().max(200).optional().nullable(),
  obligations: z.string().trim().max(4000).optional().nullable(),
  documentUrl: z.string().trim().max(2000).optional().nullable(),
  fileSize: z.string().max(50).optional().nullable(),
});

export const ComplianceCalendarEventSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  title: z.string().trim().min(3, "Judul agenda wajib diisi"),
  type: z.enum(["Reporting", "Inspection", "Exceedance", "Permit Expiry"]),
  description: z.string().trim().min(3, "Deskripsi agenda wajib diisi"),
  status: z.enum(["Pending", "Completed", "Overdue"]),
  assignedTo: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
});

export const EnvironmentalCostSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  budgetCode: z.string().trim().max(60, "Kode anggaran maksimal 60 karakter").optional().nullable(),
  year: z.number().int().min(2000).max(2100),
  period: z.string().trim().min(1, "Periode pelaporan wajib diisi"),
  category: z.string().trim().min(2, "Kategori program biaya wajib diisi"),
  plannedOpex: z.number().min(0, "Rencana OPEX tidak boleh negatif"),
  plannedCapex: z.number().min(0, "Rencana CAPEX tidak boleh negatif"),
  realizedOpex: z.number().min(0, "Realisasi OPEX tidak boleh negatif"),
  realizedCapex: z.number().min(0, "Realisasi CAPEX tidak boleh negatif"),
  notes: z.string().optional().nullable(),
  officer: z.string().trim().min(2, "Nama petugas perekam wajib diisi"),
});

export const SolidWasteSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  source: z.string().trim().min(2, "Sumber sampah minimal 2 karakter").max(100, "Sumber maksimal 100 karakter"),
  organicKg: z.number().min(0, "Jumlah tidak boleh negatif"),
  inorganicKg: z.number().min(0, "Jumlah tidak boleh negatif"),
  residueKg: z.number().min(0, "Jumlah tidak boleh negatif"),
  compostedKg: z.number().min(0, "Jumlah tidak boleh negatif"),
  recycledKg: z.number().min(0, "Jumlah tidak boleh negatif"),
  officer: z.string().trim().min(2, "Nama petugas minimal 2 karakter").max(100, "Petugas maksimal 100 karakter"),
  transporterVehicle: z.string().optional().nullable(),
  finalDestination: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const ComplianceMatrixSchema = z.object({
  id: z.string(),
  period: z.string().min(1, "Periode harus diisi"),
  aspect: z.enum(['Kualitas Air', 'Kualitas Udara/Emisi', 'Pengelolaan Limbah B3', 'Sosial/Masyarakat', 'Flora/Fauna', 'Lainnya']),
  impactDetails: z.string().min(1, "Rincian dampak harus diisi"),
  target: z.string().min(1, "Target pemenuhan harus diisi"),
  status: z.enum(['Taat', 'Belum Taat', 'Tidak Taat', 'Tidak Relevan']),
  evidenceUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const IncidentSchema = z.object({
  id: z.string(),
  date: z.string(),
  time: z.string(),
  category: z.enum(['Tumpahan Hidrokarbon', 'Tanggul Jebol', 'Air Asam Tambang', 'Kebakaran Hutan/Lahan', 'Emisi Asap Tebal', 'Lainnya']),
  location: z.string(),
  chronology: z.string(),
  firstAction: z.string(),
  status: z.enum(['Dilaporkan', 'Investigasi', 'Tindakan Korektif', 'Ditutup']),
  environmentalLoss: z.string(),
  documentationUrl: z.string().optional().nullable(),
  reporter: z.string(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const RegulatoryWatchSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  source: z.string().trim().min(2, "Sumber instansi wajib diisi"),
  issuer: z.string().trim().max(200).optional().nullable(),
  regulationNo: z.string().trim().min(2, "Nomor regulasi wajib diisi"),
  about: z.string().trim().min(3, "Perihal wajib diisi"),
  issueDate: z.string().refine((v) => v === '' || isValidCalendarDate(v), {
    message: "Format tanggal harus YYYY-MM-DD atau kosong bila menunggu verifikasi",
  }),
  enactedDate: optionalCalendarDateSchema('tanggal penetapan'),
  promulgatedDate: optionalCalendarDateSchema('tanggal pengundangan'),
  effectiveDate: optionalCalendarDateSchema('tanggal berlaku'),
  implication: z.string().trim().min(3, "Implikasi wajib diisi"),
  requiredActions: z.string().trim().max(1500).optional().nullable(),
  affectedModules: z.array(z.string()).optional(),
  amendedBy: z.string().trim().max(250).optional().nullable(),
  revokedBy: z.string().trim().max(250).optional().nullable(),
  relationNotes: z.string().trim().max(1000).optional().nullable(),
  status: z.enum([
    'DRAFT',
    'MENUNGGU VERIFIKASI',
    'BERLAKU',
    'DIUBAH',
    'DICABUT',
    'Draft',
    'Berlaku',
    'Dicabut',
    'Perlu Kajian',
  ]),
  verificationStatus: z.enum(['Terverifikasi', 'Perlu verifikasi']).optional(),
  link: z.string().optional().nullable(),
  officialSourceUrl: z.string().trim().max(1500).optional().nullable(),
  metadataHistory: z.array(z.any()).optional(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const AmdTreatmentSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  location: z.string().trim().min(2, "Lokasi wajib diisi").max(120),
  treatmentZone: z.string().trim().min(2, "Zona treatment wajib diisi").max(120),
  treatmentMethod: z.enum(['Pengapuran Aktif', 'Lahan Basah Buatan', 'Hibrida']).optional().nullable(),
  inflowPh: z.number().finite().min(0, "pH minimal 0").max(14, "pH maksimal 14"),
  outflowPh: z.number().finite().min(0, "pH minimal 0").max(14, "pH maksimal 14"),
  inflowDebitM3s: z.number().finite().min(0, "Debit inflow tidak boleh negatif"),
  outflowDebitM3s: z.number().finite().min(0, "Debit outflow tidak boleh negatif"),
  limeKg: z.number().finite().min(0, "Dosis kapur tidak boleh negatif"),
  alumKg: z.number().finite().min(0, "Dosis tawas/flokulan tidak boleh negatif"),
  activeLimeStockKg: z.number().finite().min(0).optional().nullable(),
  complianceStatus: z.enum(['Memenuhi', 'Warning', 'Tidak Memenuhi']),
  officer: z.string().trim().min(2, "Nama petugas minimal 2 karakter").max(100),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const AirEmissionSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  monitoringCategory: z.enum(['Udara Ambien', 'Emisi Genset', 'Emisi Alat Berat', 'Kebisingan']),
  location: z.string().trim().min(2, "Lokasi pantau wajib diisi").max(120),
  pm10: z.number().finite().min(0, "PM10 tidak boleh negatif"),
  pm25: z.number().finite().min(0, "PM2.5 tidak boleh negatif"),
  tsp: z.number().finite().min(0, "TSP tidak boleh negatif"),
  so2: z.number().finite().min(0, "SO2 tidak boleh negatif"),
  no2: z.number().finite().min(0, "NO2 tidak boleh negatif"),
  co: z.number().finite().min(0, "CO tidak boleh negatif"),
  noiseDb: z.number().finite().min(0, "Kebisingan tidak boleh negatif"),
  status: z.enum(['Safe', 'Warning', 'Exceeded']),
  officer: z.string().trim().min(2, "Nama petugas minimal 2 karakter").max(100),
  labRef: z.string().max(120).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const TopsoilErosionSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  blockLocation: z.string().trim().min(2, "Lokasi blok/pit wajib diisi").max(120),
  topsoilVolumeM3: z.number().finite().min(0, "Volume topsoil masuk tidak boleh negatif"),
  stockpileUsedM3: z.number().finite().min(0, "Volume penebaran tidak boleh negatif"),
  cumulativeBalanceM3: z.number().finite().min(0, "Saldo topsoil tidak boleh negatif"),
  thicknessCm: z.number().finite().min(0, "Ketebalan tidak boleh negatif"),
  coverCropAreaHa: z.number().finite().min(0, "Luas cover crop tidak boleh negatif"),
  erosionSeverity: z.enum(['Rendah', 'Sedang', 'Tinggi', 'Kritis']),
  mitigationAction: z.string().trim().min(2, "Tindakan mitigasi wajib diisi").max(300),
  officer: z.string().trim().min(2, "Nama petugas minimal 2 karakter").max(100),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const BiodiversitySchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  zone: z.string().trim().min(2, "Zona pengamatan wajib diisi").max(120),
  category: z.enum(['Flora', 'Fauna', 'Koridor Satwa']),
  speciesName: z.string().trim().min(2, "Nama spesies lokal wajib diisi").max(120),
  scientificName: z.string().trim().max(120),
  conservationStatus: z.enum(['Dilindungi (Permen LHK P.106/2018)', 'Dilindungi (PP 106/2018)', 'Endemik', 'IUCN Threatened', 'Umum']),
  count: z.number().int("Jumlah individu harus bilangan bulat").min(0, "Jumlah tidak boleh negatif"),
  observationMethod: z.string().trim().min(2, "Metode pengamatan wajib diisi").max(120),
  condition: z.enum(['Sehat', 'Terancam', 'Bermigrasi']),
  officer: z.string().trim().min(2, "Nama pengamat minimal 2 karakter").max(100),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const IadlRiskSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  code: z.string().trim().min(2, "Kode IADL wajib diisi").max(40),
  activity: z.string().trim().min(2, "Aktivitas wajib diisi").max(200),
  aspect: z.string().trim().min(2, "Aspek lingkungan wajib diisi").max(200),
  impact: z.string().trim().min(2, "Dampak lingkungan wajib diisi").max(300),
  environmentalCondition: z.enum(['Normal', 'Abnormal', 'Darurat']),
  severityScore: z.number().int().min(1).max(5),
  likelihoodScore: z.number().int().min(1).max(5),
  riskScore: z.number().int().min(1).max(25),
  riskLevel: z.enum(['Rendah', 'Sedang', 'Tinggi', 'Signifikan/Kritis']),
  controlMeasure: z.string().trim().min(2, "Pengendalian risiko wajib diisi").max(500),
  legalRef: z.string().trim().min(2, "Referensi regulasi wajib diisi").max(200),
  pic: z.string().trim().min(2, "PIC wajib diisi").max(100),
  status: z.enum(['Aktif Terkendali', 'Perlu Mitigasi', 'Selesai']),
  targetDate: z.string().optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const ProperRkabSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  year: z.number().int().min(2000).max(2100),
  period: z.string().trim().min(1, "Periode wajib diisi").max(40),
  recordType: z.enum(['PROPER', 'RKAB']),
  category: z.string().trim().min(2, "Kategori indikator wajib diisi").max(120),
  indicatorName: z.string().trim().min(2, "Nama indikator wajib diisi").max(250),
  targetValue: z.string().trim().min(1, "Target wajib diisi").max(200),
  realizedValue: z.string().trim().min(1, "Realisasi wajib diisi").max(200),
  scoreWeight: z.number().finite().min(0).max(100),
  selfScore: z.number().finite().min(0).max(100),
  targetProperRating: z.enum(['Emas', 'Hijau', 'Biru', 'Merah']),
  actualProperRating: z.enum(['Emas', 'Hijau', 'Biru', 'Merah', 'Hitam']).optional().nullable(),
  status: z.enum(['Terpenuhi', 'Proses Pemenuhan', 'Gap Terdeteksi']),
  evidenceUrl: z.string().max(1000).optional().nullable(),
  pic: z.string().trim().min(2, "PIC wajib diisi").max(100),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const EnvironmentalStandardSchema = z.object({
  id: z.string().min(1, "ID baku mutu wajib diisi").max(120),
  media: z.enum(['air_limbah', 'air_limbah_domestik', 'air_permukaan', 'udara', 'kebisingan', 'lainnya']),
  parameterKey: z.string().trim().min(1, "Kunci parameter wajib diisi").max(60),
  parameterLabel: z.string().trim().min(1, "Nama parameter wajib diisi").max(100),
  unit: z.string().trim().max(30),
  minLimit: z.number().finite("Batas minimum harus angka valid").optional().nullable(),
  maxLimit: z.number().finite("Batas maksimum harus angka valid").optional().nullable(),
  basisRegulasi: z.string().trim().min(3, "Dasar regulasi wajib diisi").max(300),
  approvalDocNo: z.string().trim().max(200).optional().nullable(),
  decreeDate: optionalCalendarDateSchema('tanggal penetapan'),
  effectiveFrom: optionalCalendarDateSchema('tanggal mulai berlaku'),
  effectiveTo: optionalCalendarDateSchema('tanggal berakhir'),
  sourceDocument: z.string().trim().max(300).optional().nullable(),
  sourceUrl: z.string().trim().max(1500).optional().nullable(),
  locationCode: z.string().trim().max(50).optional().nullable(),
  kelasAir: z.enum(['I', 'II', 'III', 'IV']).optional().nullable(),
  isActive: z.boolean(),
  applicable: z.boolean().optional(),
  verificationStatus: z.enum(['Terverifikasi', 'Perlu verifikasi']),
  effectiveStatus: z.enum(['DRAFT', 'MENUNGGU VERIFIKASI', 'BERLAKU', 'DIUBAH', 'DICABUT']).optional(),
  notes: z.string().max(1000).optional().nullable(),
  revisionHistory: z.array(z.any()).optional(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const InternalThresholdsSchema = z.object({
  id: z.string().optional(),
  warningRatio: z.number().finite().min(0.1, "Rasio warning minimal 0.1").max(0.99, "Rasio warning maksimal 0.99"),
  phMargin: z.number().finite().min(0, "Margin pH minimal 0").max(2, "Margin pH maksimal 2"),
  solidWasteTargetPct: z.number().finite().min(1, "Target minimal 1%").max(100, "Target maksimal 100%"),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const ProperCriteriaMasterSchema = z.object({
  id: z.string().optional(),
  regulationBasis: z.string().trim().min(3).max(300),
  criteria: z.array(z.object({
    id: z.string().min(1),
    aspek: z.string().trim().min(1, "Aspek wajib diisi").max(150),
    indikator: z.string().trim().min(1, "Indikator wajib diisi").max(300),
    bobot: z.number().finite().min(0).max(100),
    catatan: z.string().max(500).optional(),
  })),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

// ============================================================================
// ZOD SCHEMAS MODUL BARU FASE 3
// ============================================================================

export const PertekSloSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  docKind: z.enum(['Pertek', 'SLO']),
  category: z.enum(['Pembuangan Air Limbah', 'Pemanfaatan Air Limbah', 'Emisi Udara', 'Penyimpanan LB3', 'Lainnya']),
  permitNumber: z.string().trim().min(2, "Nomor Pertek/SLO wajib diisi").max(120),
  title: z.string().trim().min(3, "Judul izin/persetujuan wajib diisi").max(250),
  issuingAuthority: z.string().trim().min(2, "Instansi penerbit wajib diisi").max(150),
  issuedDate: z.string().regex(dateRegex, "Format tanggal terbit harus YYYY-MM-DD"),
  expiryDate: z.string().trim().min(1, "Masa berlaku wajib diisi").max(30),
  compliancePoint: z.string().trim().min(2, "Titik penaatan wajib diisi").max(150),
  reportingObligation: z.string().trim().min(2, "Kewajiban pelaporan wajib diisi").max(300),
  status: z.enum(['Aktif', 'Segera Berakhir', 'Kedaluwarsa', 'Proses Perpanjangan']),
  documentUrl: z.string().trim().max(1500).optional().nullable(),
  pic: z.string().trim().min(2, "PIC wajib diisi").max(100),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const ReportingCalendarSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  reportType: z.enum([
    'RKL-RPL Semester',
    'Laporan Pertek',
    'Neraca & Logbook LB3',
    'Laporan GRK Tahunan (Maret)',
    'RKAB Lingkungan',
    'Laporan Reklamasi & Pascatambang',
  ]),
  periodLabel: z.string().trim().min(2, "Periode wajib diisi").max(100),
  dueDate: z.string().regex(dateRegex, "Format tenggat harus YYYY-MM-DD"),
  targetAgency: z.string().trim().min(2, "Instansi tujuan wajib diisi").max(150),
  pic: z.string().trim().min(2, "PIC wajib diisi").max(100),
  status: z.enum(['Terjadwal', 'Proses', 'Terkirim', 'Terlambat']),
  submittedDate: z.string().regex(dateRegex, "Format tanggal kirim harus YYYY-MM-DD").optional().or(z.literal('')).nullable(),
  receiptNumber: z.string().trim().max(120).optional().nullable(),
  receiptUrl: z.string().trim().max(1500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const ExternalSupervisionSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  inspectionDate: z.string().regex(dateRegex, "Format tanggal kunjungan harus YYYY-MM-DD"),
  agency: z.enum(['DLH Provinsi/Kab', 'KLH/BPLH', 'Inspektur Tambang ESDM', 'Kementerian Kehutanan']),
  officialDocNo: z.string().trim().min(2, "Nomor Berita Acara / Surat wajib diisi").max(120),
  inspectionScope: z.string().trim().min(2, "Ruang lingkup pengawasan wajib diisi").max(250),
  findingsSummary: z.string().trim().min(3, "Ringkasan temuan wajib diisi").max(2000),
  sanctionCategory: z.enum(['Tidak Ada', 'Teguran Tertulis', 'Paksaan Pemerintah', 'Pembekuan Izin', 'Pencabutan Izin']),
  followUpDeadline: z.string().regex(dateRegex, "Format tenggat tindak lanjut harus YYYY-MM-DD"),
  resolutionStatus: z.enum(['Terbuka', 'Dalam Tindak Lanjut', 'Selesai Diverifikasi']),
  linkedCapaId: z.string().trim().max(120).optional().nullable(),
  pic: z.string().trim().min(2, "PIC wajib diisi").max(100),
  evidenceUrl: z.string().trim().max(1500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const DomesticWastewaterSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: calendarDateSchema('tanggal'),
  facilityName: z.string().trim().min(2, "Nama IPAL / Fasilitas wajib diisi").max(150),
  locationCode: z.string().trim().max(50).optional().nullable(),
  ph: z.number().finite().min(0, "pH minimal 0").max(14, "pH maksimal 14").nullable(),
  bod: z.number().finite().min(0, "BOD tidak boleh negatif").nullable(),
  cod: z.number().finite().min(0, "COD tidak boleh negatif").nullable(),
  tss: z.number().finite().min(0, "TSS tidak boleh negatif").nullable(),
  oilGrease: z.number().finite().min(0, "Minyak & lemak tidak boleh negatif").nullable(),
  ammonia: z.number().finite().min(0, "Amonia tidak boleh negatif").nullable(),
  totalColiform: z.number().finite().min(0, "Total Coliform tidak boleh negatif").nullable(),
  debitM3Day: z.number().finite().min(0, "Debit tidak boleh negatif").nullable(),
  missingReasons: z.record(z.string(), MissingParamReasonSchema).optional().nullable(),
  evaluationHistory: z.array(EvaluationHistoryEntrySchema).optional(),
  complianceStatus: z.enum([
    'Memenuhi',
    'Warning',
    'Tidak Memenuhi',
    'Belum Ada Baku Mutu',
    'Data Tidak Lengkap',
    'Belum Dievaluasi',
    'Tidak Berlaku',
  ]),
  evaluationStatus: complianceConclusionSchema,
  evaluationReason: z.string().trim().max(500).optional().nullable(),
  unitMap: z.record(z.string(), z.string()).optional().nullable(),
  standardId: z.string().trim().max(120).optional().nullable(),
  standardBasis: z.string().trim().max(300).optional().nullable(),
  standardSnapshot: z.record(z.string(), z.any()).optional().nullable(),
  correctionReason: z.string().trim().max(500).optional().nullable(),
  officer: z.string().trim().min(2, "Nama petugas minimal 2 karakter").max(100),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
}).superRefine((val, ctx) => {
  refineMissingParamReasons(val, ctx, [
    { key: 'ph', label: 'pH' },
    { key: 'bod', label: 'BOD' },
    { key: 'cod', label: 'COD' },
    { key: 'tss', label: 'TSS' },
    { key: 'oilGrease', label: 'Minyak & Lemak' },
    { key: 'ammonia', label: 'Amonia' },
    { key: 'totalColiform', label: 'Total Coliform' },
    { key: 'debitM3Day', label: 'Debit' },
  ]);
});

export const GhgEmissionFactorSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  activityCategory: z.enum([
    'Solar Alat Berat & Hauling',
    'Solar Genset & Pembangkit',
    'Listrik PLN / Non-Tambang',
    'Bahan Peledak (ANFO/Emulsi)',
    'Perubahan Lahan Terbuka',
    'Lainnya',
  ]),
  factorName: z.string().trim().min(2, "Nama faktor emisi wajib diisi").max(150),
  unit: z.string().trim().min(1, "Satuan aktivitas wajib diisi").max(30),
  factorKgCo2ePerUnit: z.number().finite().min(0, "Nilai faktor emisi tidak boleh negatif"),
  gasScope: z.enum(['Scope 1 (Emisi Langsung)', 'Scope 2 (Energi Tidak Langsung)', 'Scope 3 / Lahan']),
  referenceSource: z.string().trim().min(3, "Sumber referensi faktor emisi wajib diisi").max(250),
  effectiveYear: z.number().int().min(2000).max(2100),
  gwpReference: z.string().trim().max(120).optional().nullable(),
  verificationStatus: z.enum(['Terverifikasi', 'PERLU VERIFIKASI']).optional(),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const GhgActivitySchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: calendarDateSchema('tanggal'),
  reportingYear: z.number().int().min(2000).max(2100),
  monthPeriod: z.string().regex(/^\d{4}-\d{2}$/, "Format bulan pelaporan harus YYYY-MM"),
  activityCategory: z.enum([
    'Solar Alat Berat & Hauling',
    'Solar Genset & Pembangkit',
    'Listrik PLN / Non-Tambang',
    'Bahan Peledak (ANFO/Emulsi)',
    'Perubahan Lahan Terbuka',
    'Lainnya',
  ]),
  sourceLocation: z.string().trim().min(2, "Lokasi / sumber emisi wajib diisi").max(150),
  quantity: z.number().finite().min(0, "Jumlah aktivitas tidak boleh negatif"),
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(30),
  factorId: z.string().trim().max(120).optional().nullable(),
  factorNameSnapshot: z.string().trim().max(150).optional().nullable(),
  factorValueSnapshot: z.number().finite().optional().nullable(),
  referenceSourceSnapshot: z.string().trim().max(250).optional().nullable(),
  gasScopeSnapshot: z.string().trim().max(120).optional().nullable(),
  categorySnapshot: z.string().trim().max(120).optional().nullable(),
  unitSnapshot: z.string().trim().max(30).optional().nullable(),
  effectiveYearSnapshot: z.number().int().optional().nullable(),
  gwpSnapshot: z.string().trim().max(120).optional().nullable(),
  verificationStatusSnapshot: z.enum(['Terverifikasi', 'PERLU VERIFIKASI']).optional().nullable(),
  calculationStatus: z.enum(['TERHITUNG', 'BELUM TERHITUNG', 'PERLU VERIFIKASI']).optional(),
  calculationNote: z.string().trim().max(500).optional().nullable(),
  emissionsTco2e: z.number().finite().min(0, "Emisi tCO2e tidak boleh negatif").nullable(),
  correctionReason: z.string().trim().max(500).optional().nullable(),
  officer: z.string().trim().min(2, "Nama petugas wajib diisi").max(100),
  notes: z.string().max(1000).optional().nullable(),
  createdAt: z.any().optional(),
  createdBy: z.string().optional(),
  updatedAt: z.any().optional(),
  updatedBy: z.string().optional(),
});

export const CapaSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  source: z.string().min(1, "Sumber wajib diisi").max(100),
  title: z.string().min(1, "Judul CAPA wajib diisi").max(300),
  status: z.string().min(1, "Status CAPA wajib diisi").max(50),
  description: z.string().max(4000).optional().nullable(),
  rootCause: z.string().max(4000).optional().nullable(),
  correctiveAction: z.string().max(4000).optional().nullable(),
  preventiveAction: z.string().max(4000).optional().nullable(),
  verificationNotes: z.string().max(4000).optional().nullable(),
  pic: z.string().max(100).optional().nullable(),
});

export function validateBackupDocument(
  collectionKey: string,
  docId: string,
  rawDoc: Record<string, any>
): { valid: boolean; error?: string } {
  if (!docId || typeof docId !== 'string' || docId.length > 128) {
    return { valid: false, error: 'ID dokumen kosong atau melebihi 128 karakter.' };
  }
  if (!rawDoc || typeof rawDoc !== 'object' || Array.isArray(rawDoc)) {
    return { valid: false, error: 'Payload dokumen bukan objek valid.' };
  }

  const candidate = { ...rawDoc, id: rawDoc.id || docId };
  let schema: z.ZodTypeAny | null = null;

  switch (collectionKey) {
    case 'wastewater':
      schema = WastewaterSchema;
      break;
    case 'wastewater_photos':
      schema = WastewaterPhotoSchema;
      break;
    case 'wq_locations':
      schema = WqLocationSchema;
      break;
    case 'surfacewater':
      schema = SurfaceWaterSchema;
      break;
    case 'domestic_wastewater':
      schema = DomesticWastewaterSchema;
      break;
    case 'amd_treatment':
      schema = AmdTreatmentSchema;
      break;
    case 'rainfall':
      schema = RainfallSchema;
      break;
    case 'air_emission':
      schema = AirEmissionSchema;
      break;
    case 'ghg_factors':
      schema = GhgEmissionFactorSchema;
      break;
    case 'ghg_activities':
      schema = GhgActivitySchema;
      break;
    case 'nursery':
      schema = NurserySchema;
      break;
    case 'nursery_stock_out':
      schema = NurseryStockOutSchema;
      break;
    case 'reclamation':
      if (docId.startsWith('RG-')) {
        schema = ReclamationGuaranteeSchema;
      } else if (docId.startsWith('RP-')) {
        schema = ReclamationPlanSchema;
      } else {
        return { valid: false, error: `Prefiks ID dokumen reclamation (${docId}) harus RP- atau RG-.` };
      }
      break;
    case 'topsoil_erosion':
      schema = TopsoilErosionSchema;
      break;
    case 'biodiversity':
      schema = BiodiversitySchema;
      break;
    case 'waste_b3':
      if (docId.startsWith('WO-')) {
        schema = WasteOutSchema;
      } else if (docId.startsWith('WI-')) {
        schema = WasteInSchema;
      } else {
        return { valid: false, error: `Prefiks ID dokumen waste_b3 (${docId}) harus WI- atau WO-.` };
      }
      break;
    case 'solid_waste':
      schema = SolidWasteSchema;
      break;
    case 'documents':
      if (docId.startsWith('EV-')) {
        schema = ComplianceCalendarEventSchema;
      } else if (docId.startsWith('DOC-')) {
        schema = EnvironmentalDocumentSchema;
      } else {
        return { valid: false, error: `Prefiks ID dokumen documents (${docId}) harus DOC- atau EV-.` };
      }
      break;
    case 'pertek_slo':
      schema = PertekSloSchema;
      break;
    case 'compliance_matrix':
      schema = ComplianceMatrixSchema;
      break;
    case 'reporting_calendar':
      schema = ReportingCalendarSchema;
      break;
    case 'regulatory':
      schema = RegulatoryWatchSchema;
      break;
    case 'iadl_risk':
      schema = IadlRiskSchema;
      break;
    case 'external_supervisions':
      schema = ExternalSupervisionSchema;
      break;
    case 'proper_rkab':
      schema = ProperRkabSchema;
      break;
    case 'capa':
      schema = CapaSchema;
      break;
    case 'incidents':
      schema = IncidentSchema;
      break;
    case 'costs':
      schema = EnvironmentalCostSchema;
      break;
    case 'standards':
      schema = EnvironmentalStandardSchema;
      break;
    case 'app_meta':
      if (docId === 'env_thresholds') {
        schema = InternalThresholdsSchema;
      } else if (docId === 'proper_criteria') {
        schema = ProperCriteriaMasterSchema;
      } else {
        schema = z.object({}).passthrough();
      }
      break;
    default:
      return { valid: false, error: `Koleksi '${collectionKey}' tidak termasuk dalam skema pemulihan yang diizinkan.` };
  }

  const parsed = schema.safeParse(candidate);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const fieldPath = firstIssue?.path?.join('.') || 'dokumen';
    return {
      valid: false,
      error: `${fieldPath}: ${firstIssue?.message || 'Skema tidak valid'}`,
    };
  }
  return { valid: true };
}

