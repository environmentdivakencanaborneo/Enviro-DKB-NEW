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
  SurfaceWaterData
} from '../types';
import { formatWasteSource } from '../constants/wasteSources';
import { todayLocalISO } from '../utils/dateUtils';

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
    'Bentuk Jaminan': d.guaranteeType,
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
}

export function exportAllDataToXLSX(payload: ExportPayload, companyName?: string): void {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PT Diva Kencana Borneo';
  wb.lastModifiedBy = 'DEM System';
  wb.created = new Date();
  const exportDate = new Date().toLocaleString('id-ID');

  // Definisi semua sheet
  const sheets: Array<{ name: string; rows: Record<string, any>[] }> = [
    { name: 'Kualitas Air Limbah',      rows: mapWastewater(payload.wastewater) },
    { name: 'Kualitas Air Permukaan',   rows: mapSurfaceWater(payload.surfaceWater || []) },
    { name: 'Curah Hujan',              rows: mapRainfall(payload.rainfall) },
    { name: 'Nursery & Bibit',          rows: mapNursery(payload.nursery) },
    { name: 'Rencana Reklamasi',        rows: mapReclamationPlans(payload.reclamationPlans) },
    { name: 'Jaminan Reklamasi',        rows: mapReclamationGuarantees(payload.reclamationGuarantees) },
    { name: 'Limbah B3 Masuk',          rows: mapWasteIn(payload.wasteIn) },
    { name: 'Limbah B3 Keluar',         rows: mapWasteOut(payload.wasteOut) },
    { name: 'Dokumen Lingkungan',       rows: mapDocuments(payload.documents) },
    { name: 'Agenda Kepatuhan',         rows: mapCalendarEvents(payload.calendarEvents) },
    { name: 'Biaya Lingkungan',         rows: mapEnvironmentalCosts(payload.environmentalCosts) },
    { name: 'Pengolahan Sampah',        rows: mapSolidWaste(payload.solidWaste || []) },
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
