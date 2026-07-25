/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import {
  WastewaterData,
  RainfallData,
  NurseryData,
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
    'Luas Target (Ha)': d.sizeHa,
    'Luas Realisasi (Ha)': d.realizedSizeHa ?? '',
    'Tahun Target': d.targetYear,
    'Tahun Realisasi': d.realizedYear ?? '',
    'Jenis Tanaman Target': d.plantType,
    'Jenis Tanaman Realisasi': d.realizedPlantType ?? '',
    'Metode Target': d.method,
    'Metode Realisasi': d.realizedMethod ?? '',
    'Estimasi Biaya (IDR)': formatIDR(d.estimatedCost),
    'Biaya Realisasi (IDR)': d.realizedCost ? formatIDR(d.realizedCost) : '',
    'Status': d.status,
    'PIC': d.pic,
  }));
}

function mapReclamationGuarantees(data: ReclamationGuarantee[]) {
  return data.map(d => ({
    'ID': d.id,
    'No. Jaminan': d.guaranteeNo,
    'Tipe Jaminan': d.guaranteeType,
    'Nilai (IDR)': formatIDR(d.value),
    'Lembaga Penerbit': d.issuingInstitution,
    'Tanggal Terbit': d.issuedDate,
    'Tanggal Jatuh Tempo': d.dueDate,
    'Status': d.status,
    'URL Dokumen': d.docUrl ?? '',
  }));
}

function mapWasteIn(data: WasteIn[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal Masuk': d.dateIn,
    'Jenis Limbah': d.wasteType,
    'Sumber': d.source,
    'Berat (kg)': d.weightKg,
    'Karakteristik': d.characteristic,
    'Kode Limbah': d.code,
    'Lokasi TPS': d.tpsLocation,
    'Petugas': d.officer,
    'URL Dokumentasi': d.documentationUrl ?? '',
  }));
}

function mapWasteOut(data: WasteOut[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal Keluar': d.dateOut,
    'Jenis Limbah': d.wasteType,
    'Berat (kg)': d.weightKg,
    'Tujuan': d.destination,
    'Transporter': d.transporter,
    'No. Manifest': d.manifestNo,
    'No. Kendaraan': d.vehicleNo,
    'Nama Pengemudi': d.driverName,
    'Penerima': d.recipient,
    'URL Dokumentasi': d.documentationUrl ?? '',
  }));
}

function mapDocuments(data: EnvironmentalDocument[]) {
  return data.map(d => ({
    'ID': d.id,
    'Nama Dokumen': d.name,
    'Tipe': d.type,
    'No. Dokumen': d.docNo,
    'Tanggal Terbit': d.issuedDate,
    'Tanggal Kadaluarsa': d.expiryDate,
    'Status': d.status,
    'PIC': d.pic,
    'Ukuran File': d.fileSize ?? '',
  }));
}

function mapCalendarEvents(data: ComplianceCalendarEvent[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tanggal': d.date,
    'Judul Kegiatan': d.title,
    'Tipe': d.type,
    'Deskripsi': d.description,
    'Status': d.status,
  }));
}

function mapEnvironmentalCosts(data: EnvironmentalCost[]) {
  return data.map(d => ({
    'ID': d.id,
    'Tahun': d.year,
    'Periode': d.period,
    'Kategori': d.category,
    'Rencana OPEX (IDR)': formatIDR(d.plannedOpex),
    'Rencana CAPEX (IDR)': formatIDR(d.plannedCapex),
    'Realisasi OPEX (IDR)': formatIDR(d.realizedOpex),
    'Realisasi CAPEX (IDR)': formatIDR(d.realizedCapex),
    'Catatan': d.notes ?? '',
    'Petugas': d.officer,
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

// ─── Style header kolom (bold + background kuning) ──────────────────────────

function styleHeaderRow(ws: XLSX.WorkSheet, headers: string[]) {
  headers.forEach((_, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
    if (!ws[cellAddress]) return;
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E4D2B' } },
      alignment: { horizontal: 'center' },
    };
  });
}

// ─── Fungsi utama export ─────────────────────────────────────────────────────

export interface ExportPayload {
  wastewater: WastewaterData[];
  surfaceWater?: SurfaceWaterData[];
  rainfall: RainfallData[];
  nursery: NurseryData[];
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
  const wb = XLSX.utils.book_new();
  const exportDate = new Date().toLocaleString('id-ID');

  // Definisi semua sheet
  const sheets: Array<{ name: string; rows: object[] }> = [
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
  const summaryData = [
    ['DEM System — Ekspor Data Mentah'],
    [`Perusahaan: ${companyName || '-'}`],
    [`Tanggal Ekspor: ${exportDate}`],
    [],
    ['Sheet', 'Jumlah Record'],
    ...sheets.map(s => [s.name, s.rows.length]),
    [],
    ['Total record', sheets.reduce((acc, s) => acc + s.rows.length, 0)],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan');

  // Tambahkan semua sheet data
  sheets.forEach(({ name, rows }) => {
    if (rows.length === 0) {
      // Sheet kosong tetap dibuat dengan header
      const ws = XLSX.utils.aoa_to_sheet([['Tidak ada data untuk sheet ini.']]);
      XLSX.utils.book_append_sheet(wb, ws, name);
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-width kolom berdasarkan panjang konten
    const headers = Object.keys(rows[0]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));

    styleHeaderRow(ws, headers);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  // Generate nama file
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeCompany = (companyName || 'DEM_System').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${safeCompany}_DataMentah_${dateStr}.xlsx`;

  // Trigger download
  XLSX.writeFile(wb, fileName);
}

export function exportToExcel(data: any[], fileName: string): void {
  if (data.length === 0) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  const headers = Object.keys(data[0]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 15) }));
  styleHeaderRow(ws, headers);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
