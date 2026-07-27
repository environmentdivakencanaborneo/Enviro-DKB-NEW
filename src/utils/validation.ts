/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const UserProfileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  email: z.string().trim().email("Format email tidak valid"),
  company: z.string().trim().min(2, "Nama perusahaan minimal 2 karakter").max(100, "Nama perusahaan maksimal 100 karakter"),
  role: z.string().trim().min(2, "Jabatan minimal 2 karakter").max(100, "Jabatan maksimal 100 karakter"),
});

export const WastewaterSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  location: z.string().trim().min(3, "Lokasi minimal 3 karakter").max(100, "Lokasi maksimal 100 karakter"),
  officer: z.string().trim().min(2, "Nama petugas minimal 2 karakter").max(100, "Nama petugas maksimal 100 karakter"),
  ph: z.number().min(0, "pH minimal 0.0").max(14, "pH maksimal 14.0"),
  tss: z.number().min(0, "TSS tidak boleh negatif"),
  debit: z.number().min(0, "Debit tidak boleh negatif"),
  fe: z.number().min(0, "Fe tidak boleh negatif"),
  mn: z.number().min(0, "Mn tidak boleh negatif"),
  status: z.enum(["Safe", "Warning", "Exceeded"]),
  monitoringType: z.enum(["Harian", "Bulanan"]).optional(),
});

export const SurfaceWaterSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  location: z.string().trim().min(3, "Lokasi minimal 3 karakter").max(100, "Lokasi maksimal 100 karakter"),
  officer: z.string().trim().min(2, "Nama petugas minimal 2 karakter").max(100, "Nama petugas maksimal 100 karakter"),
  ph: z.number().min(0, "pH minimal 0.0").max(14, "pH maksimal 14.0"),
  tss: z.number().min(0, "TSS tidak boleh negatif"),
  doVal: z.number().min(0, "DO tidak boleh negatif"),
  bod: z.number().min(0, "BOD tidak boleh negatif"),
  cod: z.number().min(0, "COD tidak boleh negatif"),
  fe: z.number().min(0, "Fe tidak boleh negatif"),
  mn: z.number().min(0, "Mn tidak boleh negatif"),
  status: z.enum(["Safe", "Warning", "Exceeded"]),
  monitoringType: z.enum(["Harian", "Bulanan"]).optional(),
});

export const RainfallSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  date: z.string().regex(dateRegex, "Format tanggal harus YYYY-MM-DD"),
  startTime: z.string().min(1, "Waktu mulai wajib diisi"),
  endTime: z.string().min(1, "Waktu selesai wajib diisi"),
  duration: z.number().min(0, "Durasi tidak boleh negatif"),
  station: z.string().trim().min(3, "Stasiun minimal 3 karakter").max(100, "Stasiun maksimal 100 karakter"),
  gaugeType: z.enum(["Manual", "Automatic"]),
  rainfall: z.number().min(0, "Curah hujan tidak boleh negatif"),
  intensity: z.number().min(0, "Intensitas harus berupa angka tidak boleh negatif"),
  weather: z.enum(["Clear", "Cloudy", "Light Rain", "Heavy Rain", "Storm"]),
  notes: z.string().optional().nullable(),
});

export const NurserySchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  plantType: z.string().trim().min(2, "Jenis bibit tanaman wajib diisi"),
  quantity: z.number().int("Jumlah harus berupa bilangan bulat").min(0, "Jumlah tidak boleh negatif"),
  source: z.string().trim().min(2, "Sumber bibit wajib diisi"),
  ageWeeks: z.number().min(0, "Usia tidak boleh negatif"),
  heightCm: z.number().min(0, "Tinggi tidak boleh negatif"),
  status: z.enum(["Healthy", "Need Care", "Critical"]),
  location: z.string().trim().min(2, "Lokasi wajib diisi"),
  dateIn: z.string().regex(dateRegex, "Format tanggal masuk harus YYYY-MM-DD"),
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
  guaranteeType: z.enum(["Bank Guarantee", "Time Deposit", "Environmental Bond"]),
  value: z.number().min(0, "Nilai jaminan tidak boleh negatif"),
  issuingInstitution: z.string().trim().min(2, "Lembaga penerbit wajib diisi"),
  issuedDate: z.string().regex(dateRegex, "Format tanggal terbit harus YYYY-MM-DD"),
  dueDate: z.string().regex(dateRegex, "Format tanggal jatuh tempo harus YYYY-MM-DD"),
  status: z.enum(["Active", "Renewal Needed", "Claimed", "Released"]),
  docUrl: z.string().trim().optional().nullable(),
});

export const WasteInSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  dateIn: z.string().regex(dateRegex, "Format tanggal masuk harus YYYY-MM-DD"),
  wasteType: z.string().trim().min(2, "Jenis limbah wajib diisi"),
  source: z.string().trim().min(2, "Sumber asal wajib diisi"),
  weightKg: z.number().min(0, "Berat tidak boleh negatif"),
  characteristic: z.enum(["Flammable", "Toxic", "Corrosive", "Reactive", "Infectious"]),
  code: z.string().trim().min(1, "Kode limbah wajib diisi"),
  tpsLocation: z.string().trim().min(2, "Lokasi TPS wajib diisi"),
  officer: z.string().trim().min(2, "Nama petugas wajib diisi"),
  documentationUrl: z.string().trim().optional().nullable(),
});

export const WasteOutSchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  dateOut: z.string().regex(dateRegex, "Format tanggal keluar harus YYYY-MM-DD"),
  wasteType: z.string().trim().min(2, "Jenis limbah wajib diisi"),
  weightKg: z.number().min(0, "Berat tidak boleh negatif"),
  destination: z.string().trim().min(2, "Tujuan pembuangan wajib diisi"),
  transporter: z.string().trim().min(2, "Pihak transporter wajib diisi"),
  manifestNo: z.string().trim().min(1, "Nomor manifest wajib diisi"),
  vehicleNo: z.string().trim().min(1, "Nomor armada kendaraan wajib diisi"),
  driverName: z.string().trim().min(2, "Nama pengemudi wajib diisi"),
  recipient: z.string().trim().min(2, "Nama penerima wajib diisi"),
  documentationUrl: z.string().trim().optional().nullable(),
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
  fileSize: z.string().optional().nullable(),
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
  evidenceUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional()
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
  documentationUrl: z.string().optional(),
  reporter: z.string(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional()
});

export const RegulatoryWatchSchema = z.object({
  id: z.string(),
  source: z.string(),
  regulationNo: z.string(),
  about: z.string(),
  issueDate: z.string(),
  implication: z.string(),
  status: z.enum(['Draft', 'Berlaku', 'Dicabut']),
  link: z.string().optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional()
});
