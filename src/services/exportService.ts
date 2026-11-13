/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from 'exceljs';
import {
  WastewaterData,
  RainfallData,
  NurseryData,
  NurseryStockOut,
  ReclamationPlan,
  ReclamationGuarantee,
  WasteIn,
  WasteOut,
  EnvironmentalDocument,
  ComplianceCalendarEvent,
  EnvironmentalCost,
  SolidWasteData,
  SurfaceWaterData,
  CapaData,
  ComplianceMatrixData,
  IncidentData,
  RegulatoryWatchData,
  AmdTreatmentData,
  AirEmissionData,
  TopsoilErosionData,
  BiodiversityData,
  IadlRiskData,
  ProperRkabData
} from '../types';
import { formatWasteSource } from '../constants/wasteSources';
import { todayLocalISO } from '../utils/dateUtils';
import { formatConservationStatus } from '../data/regulations';

// Helper format angka rupiah
function formatIDR(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

// ─── Mapper per koleksi ke format baris Excel ───────────────────────────────

function mapWastewater(data: WastewaterData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Lokasi': d.location,
    'Petugas': d.officer,
    'pH': d.ph,
    'TSS (mg/L)': d.tss,
    'Debit (m³/s)': d.debit,
    'Fe (mg/L)': d.fe,
    'Mn (mg/L)': d.mn,
    'Status': d.status,
  }));
}

function mapSurfaceWater(data: SurfaceWaterData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Lokasi': d.location,
    'Kelas Air': d.kelasAir || 'II',
    'Petugas': d.officer,
    'Tipe Pemantauan': d.monitoringType || 'Bulanan',
    'pH': d.ph,
    'TSS (mg/L)': d.tss,
    'DO (mg/L)': d.doVal,
    'BOD (mg/L)': d.bod,
    'COD (mg/L)': d.cod,
    'Fe (mg/L)': d.fe,
    'Mn (mg/L)': d.mn,
    'Status': d.status,
  }));
}

// Ensure proper field mappings based on RainfallData schema
function mapRainfall(data: RainfallData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Jam Mulai': d.startTime,
    'Jam Selesai': d.endTime,
    'Durasi (menit)': d.duration,
    'Stasiun': d.station,
    'Tipe Alat': d.gaugeType,
    'Curah Hujan (mm)': d.rainfall,
    'Intensitas (mm/jam)': d.intensity,
    'Cuaca': d.weather,
    'Catatan': d.notes || '',
  }));
}

function mapNursery(data: NurseryData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Jenis Tanaman': d.plantType,
    'Jumlah (bibit)': d.quantity,
    'Sumber': d.source,
    'Umur (minggu)': d.ageWeeks,
    'Tinggi (cm)': d.heightCm,
    'Status': d.status,
    'Lokasi': d.location,
    'Tanggal Masuk': d.dateIn,
  }));
}

function mapReclamationPlans(data: ReclamationPlan[]) {
  return data.map(d => ({
    'ID': d.id,
    'Nama Area': d.areaName,
    'Target Luas (Ha)': d.sizeHa,
    'Realisasi Luas (Ha)': d.realizedSizeHa ?? '-',
    'Tahun Target': d.targetYear,
    'Tahun Realisasi': d.realizedYear ?? '-',
    'Jenis Tanaman Target': d.plantType,
    'Jenis Tanaman Realisasi': d.realizedPlantType ?? '-',
    'Metode': d.method,
    'Metode Realisasi': d.realizedMethod ?? '-',
    'Estimasi Biaya': formatIDR(d.estimatedCost),
    'Realisasi Biaya': d.realizedCost != null ? formatIDR(d.realizedCost) : '-',
    'Status': d.status,
    'PIC': d.pic,
  }));
}

function mapReclamationGuarantees(data: ReclamationGuarantee[]) {
  return data.map(d => ({
    'ID': d.id,
    'Nomor Jaminan': d.guaranteeNo,
    'Kategori Jaminan': d.guaranteeCategory || 'Jaminan Reklamasi',
    'Bentuk Jaminan': d.guaranteeType,
    'Jenis Bank': d.bankType || '-',
    'Nilai Jaminan': formatIDR(d.value),
    'Lembaga Penerbit': d.issuingInstitution,
    'Tanggal Terbit': d.issuedDate,
    'Jatuh Tempo': d.dueDate,
    'Status': d.status,
    'Link Dokumen': d.docUrl || '-',
  }));
}

function mapWasteIn(data: WasteIn[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal Masuk': d.dateIn,
    'Jenis Limbah': d.wasteType,
    'Sumber Asal': d.source,
    'Berat (Kg)': d.weightKg,
    'Karakteristik': d.characteristic,
    'Kode Limbah': d.code,
    'Lokasi TPS': d.tpsLocation,
    'Petugas': d.officer,
  }));
}

function mapWasteOut(data: WasteOut[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal Keluar': d.dateOut,
    'Jenis Limbah': d.wasteType,
    'Berat (Kg)': d.weightKg,
    'Tujuan Akhir': d.destination,
    'Transporter': d.transporter,
    'Nomor Manifest': d.manifestNo,
    'Nomor Armada': d.vehicleNo,
    'Driver': d.driverName,
    'Penerima': d.recipient,
  }));
}

function mapDocuments(data: EnvironmentalDocument[]) {
  return data.map(d => ({
    'ID': d.id,
    'Nama Dokumen': d.name,
    'Jenis': d.type,
    'Nomor Izin': d.docNo,
    'Instansi Penerbit': d.issuer || '-',
    'Tanggal Terbit': d.issuedDate,
    'Tanggal Kadaluarsa': d.expiryDate,
    'Status': d.status,
    'Kewajiban Pokok': d.obligations || '-',
    'PIC': d.pic,
    'Link File': d.documentUrl || '-',
  }));
}

function mapCalendarEvents(data: ComplianceCalendarEvent[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal Agenda': d.date,
    'Judul Kegiatan': d.title,
    'Kategori': d.type,
    'Deskripsi': d.description,
    'Status': d.status,
    'Penanggung Jawab': d.assignedTo || '-',
    'Kemajuan (%)': d.progress != null ? `${d.progress}%` : '-',
  }));
}

function mapEnvironmentalCosts(data: EnvironmentalCost[]) {
  return data.map(d => ({
    'ID': d.id,
    'Kode Anggaran': d.budgetCode || '-',
    'Tahun': d.year,
    'Periode': d.period,
    'Kategori Program': d.category,
    'Rencana OPEX': formatIDR(d.plannedOpex),
    'Rencana CAPEX': formatIDR(d.plannedCapex),
    'Total Rencana': formatIDR(d.plannedOpex + d.plannedCapex),
    'Realisasi OPEX': formatIDR(d.realizedOpex),
    'Realisasi CAPEX': formatIDR(d.realizedCapex),
    'Total Realisasi': formatIDR(d.realizedOpex + d.realizedCapex),
    'Variansi': formatIDR((d.plannedOpex + d.plannedCapex) - (d.realizedOpex + d.realizedCapex)),
    'Petugas': d.officer,
    'Catatan': d.notes || '-',
  }));
}

function mapSolidWaste(data: SolidWasteData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Sumber': formatWasteSource(d.source),
    'Organik (kg)': d.organicKg,
    'Anorganik (kg)': d.inorganicKg,
    'Residu (kg)': d.residueKg,
    'Total Timbulan (kg)': d.organicKg + d.inorganicKg + d.residueKg,
    'Dikompos (kg)': d.compostedKg,
    'Didaur Ulang (kg)': d.recycledKg,
    'Total Pemrosesan (kg)': d.compostedKg + d.recycledKg,
    'Rasio Recovery (%)': (((d.compostedKg + d.recycledKg) / (d.organicKg + d.inorganicKg + d.residueKg || 1)) * 100).toFixed(1) + '%',
    'Petugas': d.officer,
    'Catatan': d.notes || '',
  }));
}

function mapNurseryStockOut(data: NurseryStockOut[]) {
  return data.map(d => ({
    'ID': d.id,
    'Nomor Transaksi': d.nomorTransaksi || '-',
    'Tanggal': d.tanggal,
    'Nama Bibit': d.namaBibit,
    'Spesies': d.species,
    'Jumlah Keluar': d.jumlahKeluar,
    'Satuan': d.satuan,
    'Jenis Transaksi': d.jenisTransaksi || '-',
    'Tujuan': d.tujuan,
    'Lokasi Penanaman': d.lokasiPenanaman || '-',
    'Kapling': d.kapling || '-',
    'Blok': d.blok || '-',
    'Pit': d.pit || '-',
    'Luas Reklamasi (Ha)': d.luasReklamasi,
    'Penanggung Jawab': d.penanggungJawab,
    'Keterangan': d.keterangan || '-',
    'Petugas Perekam': d.createdBy,
  }));
}

function mapCapa(data: CapaData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Sumber': d.source,
    'Judul Temuan': d.title,
    'Deskripsi': d.description,
    'Tingkat Keparahan': d.severity,
    'Tanggal Temuan': d.discoveryDate,
    'Target Selesai': d.targetDate,
    'PIC': d.pic,
    'Akar Masalah': d.rootCause || '-',
    'Tindakan Korektif': d.correctiveAction,
    'Tindakan Preventif': d.preventiveAction,
    'Status': d.status,
    'Catatan Verifikasi': d.verificationNotes || '-',
    'Tanggal Ditutup': d.closedDate || '-',
  }));
}

function mapComplianceMatrix(data: ComplianceMatrixData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Periode': d.period,
    'Aspek': d.aspect,
    'Rincian Dampak': d.impactDetails,
    'Target Kepatuhan': d.target,
    'Status': d.status,
    'Catatan': d.notes || '-',
  }));
}

function mapIncidents(data: IncidentData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Waktu': d.time,
    'Kategori': d.category,
    'Lokasi': d.location,
    'Kronologi': d.chronology,
    'Tindakan Pertama': d.firstAction,
    'Dampak Lingkungan': d.environmentalLoss,
    'Status': d.status,
    'Pelapor': d.reporter,
  }));
}

function mapRegulatory(data: RegulatoryWatchData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Sumber': d.source,
    'Nomor Regulasi': d.regulationNo,
    'Perihal': d.about,
    'Tanggal Terbit': d.issueDate,
    'Implikasi Operasional': d.implication,
    'Status': d.status,
  }));
}

function mapAmdTreatment(data: AmdTreatmentData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Lokasi': d.location,
    'Zona Treatment': d.treatmentZone,
    'pH Inflow': d.inflowPh,
    'pH Outflow': d.outflowPh,
    'Debit Inflow (m³/s)': d.inflowDebitM3s,
    'Debit Outflow (m³/s)': d.outflowDebitM3s,
    'Dosis Kapur (kg)': d.limeKg,
    'Dosis Tawas (kg)': d.alumKg,
    'Stok Kapur (kg)': d.activeLimeStockKg ?? '-',
    'Status Kepatuhan': d.complianceStatus,
    'Petugas': d.officer,
    'Catatan': d.notes || '-',
  }));
}

function mapAirEmission(data: AirEmissionData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Kategori': d.monitoringCategory,
    'Lokasi': d.location,
    'PM10 (µg/Nm³)': d.pm10,
    'PM2.5 (µg/Nm³)': d.pm25,
    'TSP (µg/Nm³)': d.tsp,
    'SO2 (µg/Nm³)': d.so2,
    'NO2 (µg/Nm³)': d.no2,
    'CO (µg/Nm³)': d.co,
    'Kebisingan (dBA)': d.noiseDb,
    'Status': d.status,
    'Ref Lab': d.labRef || '-',
    'Petugas': d.officer,
  }));
}

function mapTopsoilErosion(data: TopsoilErosionData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Blok / Pit': d.blockLocation,
    'Topsoil Masuk (m³)': d.topsoilVolumeM3,
    'Topsoil Ditebar (m³)': d.stockpileUsedM3,
    'Saldo Bank (m³)': d.cumulativeBalanceM3,
    'Ketebalan (cm)': d.thicknessCm,
    'Cover Crop (Ha)': d.coverCropAreaHa,
    'Tingkat Erosi': d.erosionSeverity,
    'Tindakan Mitigasi': d.mitigationAction,
    'Petugas': d.officer,
  }));
}

function mapBiodiversity(data: BiodiversityData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Zona': d.zone,
    'Kategori': d.category,
    'Nama Spesies': d.speciesName,
    'Nama Ilmiah': d.scientificName,
    'Status Konservasi': formatConservationStatus(d.conservationStatus),
    'Jumlah Individu': d.count,
    'Metode': d.observationMethod,
    'Kondisi': d.condition,
    'Pengamat': d.officer,
  }));
}

function mapIadlRisk(data: IadlRiskData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Kode IADL': d.code,
    'Aktivitas': d.activity,
    'Aspek Lingkungan': d.aspect,
    'Dampak Lingkungan': d.impact,
    'Kondisi': d.environmentalCondition,
    'Keparahan (S)': d.severityScore,
    'Kemungkinan (L)': d.likelihoodScore,
    'Skor Risiko (S×L)': d.riskScore,
    'Tingkat Risiko': d.riskLevel,
    'Pengendalian': d.controlMeasure,
    'Regulasi Terkait': d.legalRef,
    'PIC': d.pic,
    'Status': d.status,
  }));
}

function mapProperRkab(data: ProperRkabData[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tahun': d.year,
    'Periode': d.period,
    'Jenis': d.recordType,
    'Kategori': d.category,
    'Indikator': d.indicatorName,
    'Target': d.targetValue,
    'Realisasi': d.realizedValue,
    'Bobot (%)': d.scoreWeight,
    'Skor Mandiri': d.selfScore,
    'Target PROPER': d.targetProperRating,
    'Peringkat Aktual PROPER': d.actualProperRating || '-',
    'Status': d.status,
    'PIC': d.pic,
  }));
}

function triggerDownload(buffer: ArrayBuffer | Uint8Array, fileName: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  if (typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// ─── Fungsi utama export ─────────────────────────────────────────────────────

export interface ExportPayload {
  wastewater: WastewaterData[];
  surfaceWater?: SurfaceWaterData[];
  rainfall: RainfallData[];
  nursery: NurseryData[];
  nurseryStockOut?: NurseryStockOut[];
  reclamationPlans: ReclamationPlan[];
  reclamationGuarantees: ReclamationGuarantee[];
  wasteIn: WasteIn[];
  wasteOut: WasteOut[];
  documents: EnvironmentalDocument[];
  calendarEvents: ComplianceCalendarEvent[];
  environmentalCosts: EnvironmentalCost[];
  solidWaste?: SolidWasteData[];
  capa?: CapaData[];
  complianceMatrix?: ComplianceMatrixData[];
  incidents?: IncidentData[];
  regulatory?: RegulatoryWatchData[];
  amdTreatments?: AmdTreatmentData[];
  airEmissions?: AirEmissionData[];
  topsoilErosions?: TopsoilErosionData[];
  biodiversity?: BiodiversityData[];
  iadlRisks?: IadlRiskData[];
  properRkab?: ProperRkabData[];
}

export function exportAllDataToXLSX(payload: ExportPayload, companyName?: string): void {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PT Diva Kencana Borneo';
  wb.lastModifiedBy = 'DEM System';
  wb.created = new Date();
  const exportDate = new Date().toLocaleString('id-ID');

  // Definisi semua sheet (23 sheet data + Ringkasan)
  const sheets: Array<{ name: string; rows: Record<string, any>[] }> = [
    { name: 'Kualitas Air Limbah',      rows: mapWastewater(payload.wastewater) },
    { name: 'Kualitas Air Permukaan',   rows: mapSurfaceWater(payload.surfaceWater || []) },
    { name: 'Curah Hujan',              rows: mapRainfall(payload.rainfall) },
    { name: 'Treatment AAT (AMD)',      rows: mapAmdTreatment(payload.amdTreatments || []) },
    { name: 'Udara, Emisi & Bising',    rows: mapAirEmission(payload.airEmissions || []) },
    { name: 'Nursery & Bibit',          rows: mapNursery(payload.nursery) },
    { name: 'Pengeluaran Bibit',        rows: mapNurseryStockOut(payload.nurseryStockOut || []) },
    { name: 'Rencana Reklamasi',        rows: mapReclamationPlans(payload.reclamationPlans) },
    { name: 'Jaminan Reklamasi',        rows: mapReclamationGuarantees(payload.reclamationGuarantees) },
    { name: 'Topsoil & Erosi',          rows: mapTopsoilErosion(payload.topsoilErosions || []) },
    { name: 'Keanekaragaman Hayati',    rows: mapBiodiversity(payload.biodiversity || []) },
    { name: 'Limbah B3 Masuk',          rows: mapWasteIn(payload.wasteIn) },
    { name: 'Limbah B3 Keluar',         rows: mapWasteOut(payload.wasteOut) },
    { name: 'Pengolahan Sampah',        rows: mapSolidWaste(payload.solidWaste || []) },
    { name: 'Dokumen Lingkungan',       rows: mapDocuments(payload.documents) },
    { name: 'Agenda Kepatuhan',         rows: mapCalendarEvents(payload.calendarEvents) },
    { name: 'Matriks Kepatuhan',        rows: mapComplianceMatrix(payload.complianceMatrix || []) },
    { name: 'Register IADL ISO 14001',  rows: mapIadlRisk(payload.iadlRisks || []) },
    { name: 'CAPA & Temuan',            rows: mapCapa(payload.capa || []) },
    { name: 'Insiden Lingkungan',       rows: mapIncidents(payload.incidents || []) },
    { name: 'Regulatory Watch',         rows: mapRegulatory(payload.regulatory || []) },
    { name: 'Biaya Lingkungan',         rows: mapEnvironmentalCosts(payload.environmentalCosts) },
    { name: 'PROPER & RKAB',            rows: mapProperRkab(payload.properRkab || []) },
  ];

  // Sheet 1: Ringkasan / Cover
  const summaryWs = wb.addWorksheet('Ringkasan');
  summaryWs.columns = [
    { header: 'Parameter', key: 'col1', width: 35 },
    { header: 'Nilai', key: 'col2', width: 25 }
  ];
  summaryWs.addRow(['DEM System — Ekspor Data Mentah']);
  summaryWs.addRow([`Perusahaan: ${companyName || '-'}`]);
  summaryWs.addRow([`Tanggal Ekspor: ${exportDate}`]);
  summaryWs.addRow([]);
  summaryWs.addRow(['Nama Sheet', 'Jumlah Record']);
  sheets.forEach(s => {
    summaryWs.addRow([s.name, s.rows.length]);
  });
  summaryWs.addRow([]);
  summaryWs.addRow(['Total record', sheets.reduce((acc, s) => acc + s.rows.length, 0)]);

  // Tambahkan semua sheet data
  sheets.forEach(({ name, rows }) => {
    const ws = wb.addWorksheet(name);
    if (rows.length === 0) {
      ws.addRow(['Tidak ada data untuk sheet ini.']);
      return;
    }

    const headers = Object.keys(rows[0]);
    ws.columns = headers.map(h => ({
      header: h,
      key: h,
      width: Math.max(h.length + 3, 16)
    }));

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E4D2B' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;

    rows.forEach(r => ws.addRow(r));
  });

  // Generate nama file
  const dateStr = todayLocalISO();
  const safeCompany = (companyName || 'DEM_System').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${safeCompany}_DataMentah_${dateStr}.xlsx`;

  wb.xlsx.writeBuffer().then(buffer => {
    triggerDownload(buffer, fileName);
  });
}

export function exportToExcel(data: any[], fileName: string): void {
  if (!data || data.length === 0) return;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  const headers = Object.keys(data[0]);
  ws.columns = headers.map(h => ({
    header: h,
    key: h,
    width: Math.max(h.length + 3, 16)
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E4D2B' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;

  data.forEach(r => ws.addRow(r));

  const outFileName = `${fileName}_${todayLocalISO()}.xlsx`;
  wb.xlsx.writeBuffer().then(buffer => {
    triggerDownload(buffer, outFileName);
  });
}

/**
 * Export Rekap Harian Bulanan Pemantauan Air Limbah ke XLSX
 * Format kolom sesuai lampiran dokumen bukti bulanan dengan baris ringkasan di bawah.
 */
export function exportMonthlyWastewaterRecapToXLSX(
  locationCode: string,
  locationName: string,
  period: string, // YYYY-MM
  days: {
    date: string;
    dayNumber: number;
    sampleTime?: string;
    officer?: string;
    weather?: string;
    ph: number | null;
    tss: number | null;
    debit: number | null;
    fe: number | null;
    mn: number | null;
    status: string;
    duplicateCount?: number;
    dailyDocumentNo?: string | null;
  }[],
  stats: Record<'ph' | 'tss' | 'debit' | 'fe' | 'mn', { min: number | null; avg: number | null; max: number | null }>
): void {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Rekap Harian');

  ws.columns = [
    { header: 'Tanggal', key: 'date', width: 14 },
    { header: 'Jam Sampling', key: 'time', width: 14 },
    { header: 'Petugas', key: 'officer', width: 20 },
    { header: 'Cuaca', key: 'weather', width: 16 },
    { header: 'pH', key: 'ph', width: 10 },
    { header: 'TSS (mg/L)', key: 'tss', width: 14 },
    { header: 'Debit (m³/s)', key: 'debit', width: 14 },
    { header: 'Fe (mg/L)', key: 'fe', width: 12 },
    { header: 'Mn (mg/L)', key: 'mn', width: 12 },
    { header: 'Status Kepatuhan', key: 'status', width: 18 },
    { header: 'No. Dokumen Harian', key: 'docNo', width: 26 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF14532D' }, // Brand Dark Green #14532d
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  days.forEach((d) => {
    const isNoData = d.status === 'tanpa_data' || d.status === 'Tidak ada data';
    const statusLabel = isNoData
      ? 'Tidak ada data'
      : d.status === 'memenuhi'
      ? 'MEMENUHI'
      : 'TIDAK MEMENUHI';

    const row = ws.addRow({
      date: d.date,
      time: d.sampleTime ? `${d.sampleTime} WITA` : '-',
      officer: d.officer || '-',
      weather: d.weather || '-',
      ph: d.ph != null ? Number(d.ph) : null,
      tss: d.tss != null ? Number(d.tss) : null,
      debit: d.debit != null ? Number(d.debit) : null,
      fe: d.fe != null ? Number(d.fe) : null,
      mn: d.mn != null ? Number(d.mn) : null,
      status: statusLabel,
      docNo: d.dailyDocumentNo || '-',
    });

    if (isNoData) {
      row.font = { italic: true, color: { argb: 'FF9CA3AF' } };
    } else if (statusLabel === 'TIDAK MEMENUHI') {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' }, // Red-100
      };
    }
  });

  // Summary Rows
  const addSummaryRow = (label: string, field: 'min' | 'avg' | 'max') => {
    const row = ws.addRow({
      date: label,
      time: '',
      officer: '',
      weather: '',
      ph: stats.ph[field] != null ? Number(stats.ph[field]) : null,
      tss: stats.tss[field] != null ? Number(stats.tss[field]) : null,
      debit: stats.debit[field] != null ? Number(stats.debit[field]) : null,
      fe: stats.fe[field] != null ? Number(stats.fe[field]) : null,
      mn: stats.mn[field] != null ? Number(stats.mn[field]) : null,
      status: '',
      docNo: '',
    });
    row.font = { bold: true };
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }, // Slate-100
    };
  };

  addSummaryRow('Minimum Bulan Ini', 'min');
  addSummaryRow('Rata-rata Bulan Ini', 'avg');
  addSummaryRow('Maksimum Bulan Ini', 'max');

  const fileName = `Rekap_Evidence_AirLimbah_${locationCode}_${period}.xlsx`;
  wb.xlsx.writeBuffer().then((buffer) => {
    triggerDownload(buffer, fileName);
  });
}
