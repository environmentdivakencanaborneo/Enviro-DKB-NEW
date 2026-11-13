/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import {
  DomesticWastewaterData,
  EnvironmentalStandard,
  InternalThresholdsConfig,
} from '../types';
import { domesticWastewaterService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import { triggerToast } from '../utils/errorHandler';
import {
  ShowerHead,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  Sliders,
  X,
} from 'lucide-react';

interface DomesticWastewaterViewProps {
  data: DomesticWastewaterData[];
  standards: EnvironmentalStandard[];
  internalThresholds: InternalThresholdsConfig;
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canOpenStandardsMaster?: boolean;
  onOpenStandardsMaster?: () => void;
  onUnauthorizedAction: (action: string) => void;
}

export default function DomesticWastewaterView({
  data,
  standards,
  internalThresholds,
  isLoading,
  canEdit,
  canDelete,
  canOpenStandardsMaster = false,
  onOpenStandardsMaster,
  onUnauthorizedAction,
}: DomesticWastewaterViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DomesticWastewaterData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [date, setDate] = useState(todayLocalISO());
  const [facilityName, setFacilityName] = useState('IPAL Mess Karyawan');
  const [locationCode, setLocationCode] = useState('IPAL-DOM-01');
  const [ph, setPh] = useState<number>(7.0);
  const [bod, setBod] = useState<number>(0);
  const [cod, setCod] = useState<number>(0);
  const [tss, setTss] = useState<number>(0);
  const [oilGrease, setOilGrease] = useState<number>(0);
  const [ammonia, setAmmonia] = useState<number>(0);
  const [totalColiform, setTotalColiform] = useState<number>(0);
  const [debitM3Day, setDebitM3Day] = useState<number>(0);
  const [officer, setOfficer] = useState('');
  const [notes, setNotes] = useState('');

  // Ambil standar aktif khusus 'air_limbah_domestik' dari koleksi Firestore standards (ZERO hardcoded threshold!)
  const activeDomesticStandards = useMemo(() => {
    const map: Record<string, EnvironmentalStandard> = {};
    standards
      .filter((s) => s.media === 'air_limbah_domestik' && s.isActive && s.verificationStatus === 'Terverifikasi')
      .forEach((s) => {
        map[s.parameterKey.toLowerCase()] = s;
      });
    return map;
  }, [standards]);

  const unverifiedDomesticCount = useMemo(() => {
    return standards.filter(
      (s) => s.media === 'air_limbah_domestik' && s.isActive && s.verificationStatus !== 'Terverifikasi'
    ).length;
  }, [standards]);

  const evaluateDomesticCompliance = (values: {
    ph: number;
    bod: number;
    cod: number;
    tss: number;
    oilGrease: number;
    ammonia: number;
    totalColiform: number;
  }): { status: DomesticWastewaterData['complianceStatus']; basis?: string; standardId?: string } => {
    const entries = Object.entries(activeDomesticStandards);
    if (entries.length === 0) {
      return { status: 'Belum Ada Baku Mutu', basis: 'Master baku mutu air_limbah_domestik belum diisi/diverifikasi' };
    }

    const warningRatio = internalThresholds.warningRatio ?? 0.85;
    const phMargin = internalThresholds.phMargin ?? 0.3;

    const paramValues: Record<string, number> = {
      ph: values.ph,
      bod: values.bod,
      cod: values.cod,
      tss: values.tss,
      oilgrease: values.oilGrease,
      oil_grease: values.oilGrease,
      minyak_lemak: values.oilGrease,
      ammonia: values.ammonia,
      nh3: values.ammonia,
      totalcoliform: values.totalColiform,
      total_coliform: values.totalColiform,
      coliform: values.totalColiform,
    };

    let hasWarning = false;
    const basisList = new Set<string>();
    const idList: string[] = [];

    for (const [key, std] of entries) {
      idList.push(std.id);
      if (std.basisRegulasi) basisList.add(std.basisRegulasi);
      const val = paramValues[key];
      if (val === undefined) continue;

      if (std.minLimit !== null && std.minLimit !== undefined && val < std.minLimit) {
        return {
          status: 'Tidak Memenuhi',
          basis: Array.from(basisList).join('; ').slice(0, 280),
          standardId: idList.join(',').slice(0, 120),
        };
      }
      if (std.maxLimit !== null && std.maxLimit !== undefined && val > std.maxLimit) {
        return {
          status: 'Tidak Memenuhi',
          basis: Array.from(basisList).join('; ').slice(0, 280),
          standardId: idList.join(',').slice(0, 120),
        };
      }

      if (key === 'ph') {
        if (
          (std.minLimit !== null && std.minLimit !== undefined && val < std.minLimit + phMargin) ||
          (std.maxLimit !== null && std.maxLimit !== undefined && val > std.maxLimit - phMargin)
        ) {
          hasWarning = true;
        }
      } else if (std.maxLimit !== null && std.maxLimit !== undefined && std.maxLimit > 0) {
        if (val >= std.maxLimit * warningRatio) {
          hasWarning = true;
        }
      }
    }

    return {
      status: hasWarning ? 'Warning' : 'Memenuhi',
      basis: Array.from(basisList).join('; ').slice(0, 280),
      standardId: idList.join(',').slice(0, 120),
    };
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(todayLocalISO());
    setFacilityName('IPAL Mess Karyawan');
    setLocationCode('IPAL-DOM-01');
    setPh(7.0);
    setBod(0);
    setCod(0);
    setTss(0);
    setOilGrease(0);
    setAmmonia(0);
    setTotalColiform(0);
    setDebitM3Day(0);
    setOfficer('');
    setNotes('');
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Pemantauan Air Limbah Domestik');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: DomesticWastewaterData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Pemantauan Air Limbah Domestik');
    setEditingId(item.id);
    setDate(item.date);
    setFacilityName(item.facilityName);
    setLocationCode(item.locationCode || '');
    setPh(item.ph);
    setBod(item.bod);
    setCod(item.cod);
    setTss(item.tss);
    setOilGrease(item.oilGrease);
    setAmmonia(item.ammonia);
    setTotalColiform(item.totalColiform);
    setDebitM3Day(item.debitM3Day);
    setOfficer(item.officer);
    setNotes(item.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Pemantauan Air Limbah Domestik');
    try {
      setIsSaving(true);
      const evalRes = evaluateDomesticCompliance({
        ph: Number(ph),
        bod: Number(bod),
        cod: Number(cod),
        tss: Number(tss),
        oilGrease: Number(oilGrease),
        ammonia: Number(ammonia),
        totalColiform: Number(totalColiform),
      });

      const payload: Omit<DomesticWastewaterData, 'id'> = {
        date,
        facilityName: facilityName.trim(),
        locationCode: locationCode.trim() || undefined,
        ph: Number(ph),
        bod: Number(bod),
        cod: Number(cod),
        tss: Number(tss),
        oilGrease: Number(oilGrease),
        ammonia: Number(ammonia),
        totalColiform: Number(totalColiform),
        debitM3Day: Number(debitM3Day),
        complianceStatus: evalRes.status,
        standardId: evalRes.standardId,
        standardBasis: evalRes.basis,
        officer: officer.trim(),
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await domesticWastewaterService.update(editingId, payload);
        triggerToast('Data air limbah domestik berhasil diperbarui.', 'success');
      } else {
        await domesticWastewaterService.add(payload);
        triggerToast('Data air limbah domestik berhasil disimpan.', 'success');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menyimpan data air limbah domestik.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) return onUnauthorizedAction('Hapus Pemantauan Air Limbah Domestik');
    try {
      setIsSaving(true);
      await domesticWastewaterService.delete(deleteTarget.id);
      triggerToast('Data air limbah domestik dihapus.', 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menghapus data.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return data.filter((d) => {
      const matchQuery =
        d.facilityName.toLowerCase().includes(q) ||
        (d.locationCode || '').toLowerCase().includes(q) ||
        d.officer.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || d.complianceStatus === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const handleExport = () => {
    exportToExcel(
      filteredData.map((d) => ({
        ID: d.id,
        Tanggal: d.date,
        'Fasilitas IPAL': d.facilityName,
        'Kode Lokasi': d.locationCode || '-',
        pH: d.ph,
        'BOD (mg/L)': d.bod,
        'COD (mg/L)': d.cod,
        'TSS (mg/L)': d.tss,
        'Minyak & Lemak (mg/L)': d.oilGrease,
        'Amonia (mg/L)': d.ammonia,
        'Total Coliform (MPN/100mL)': d.totalColiform,
        'Debit (m3/hari)': d.debitM3Day,
        Status: d.complianceStatus,
        'Dasar Baku Mutu': d.standardBasis || '-',
        Petugas: d.officer,
      })),
      'Air_Limbah_Domestik_IPAL'
    );
  };

  const masterCount = Object.keys(activeDomesticStandards).length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
            <ShowerHead className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Air Limbah Domestik — IPAL Camp, Mess &amp; Kantor (Permen LH/BPLH No. 11 Tahun 2025)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Seluruh ambang baku mutu dievaluasi secara dinamis dari koleksi Master Baku Mutu (<code className="font-mono">standards</code> media <code className="font-mono">air_limbah_domestik</code>).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canOpenStandardsMaster && onOpenStandardsMaster && (
            <button
              type="button"
              onClick={onOpenStandardsMaster}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sliders className="w-4 h-4 text-teal-600" />
              Master Baku Mutu
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 bg-[#4D7C5A] hover:bg-[#3e6449] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Input Lab / Lapangan
          </button>
        </div>
      </div>

      {/* Master Standards Status Banner */}
      {masterCount === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Baku Mutu Air Limbah Domestik Belum Tersedia / Belum Terverifikasi di Master Data</p>
              <p className="text-amber-800 mt-0.5">
                Aplikasi tidak menanam angka baku mutu statis. Silakan input &amp; verifikasi parameter Permen LH/BPLH No. 11 Tahun 2025 pada menu <strong>Master Baku Mutu &amp; Konfigurasi</strong> ({unverifiedDomesticCount} entri menunggu verifikasi).
              </p>
            </div>
          </div>
          {canOpenStandardsMaster && onOpenStandardsMaster && (
            <button
              type="button"
              onClick={onOpenStandardsMaster}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer whitespace-nowrap"
            >
              Isi Baku Mutu Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Baku Mutu Aktif &amp; Terverifikasi ({masterCount} Parameter — Koleksi standards)
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.values(activeDomesticStandards).map((s) => (
              <div key={s.id} className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-800">{s.parameterLabel}:</span>{' '}
                <span className="font-mono text-emerald-700 font-semibold">
                  {s.minLimit !== null && s.minLimit !== undefined && s.maxLimit !== null && s.maxLimit !== undefined
                    ? `${s.minLimit}–${s.maxLimit}`
                    : s.maxLimit !== null && s.maxLimit !== undefined
                    ? `≤ ${s.maxLimit}`
                    : s.minLimit !== null && s.minLimit !== undefined
                    ? `≥ ${s.minLimit}`
                    : 'Pantau'}{' '}
                  {s.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama IPAL, kode lokasi, petugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none">
            <option value="ALL">Semua Status</option>
            <option value="Memenuhi">Memenuhi</option>
            <option value="Warning">Warning</option>
            <option value="Tidak Memenuhi">Tidak Memenuhi</option>
            <option value="Belum Ada Baku Mutu">Belum Ada Baku Mutu</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-5">Tanggal &amp; Lokasi IPAL</th>
                <th className="p-3.5 text-right">pH</th>
                <th className="p-3.5 text-right">BOD</th>
                <th className="p-3.5 text-right">COD</th>
                <th className="p-3.5 text-right">TSS</th>
                <th className="p-3.5 text-right">Minyak/Lemak</th>
                <th className="p-3.5 text-right">Amonia</th>
                <th className="p-3.5 text-right">Coliform</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {isLoading ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400 font-sans">Memuat data air limbah domestik...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={10} className="p-10 text-center text-slate-500 font-sans">Belum ada data pemantauan IPAL domestik.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 pl-5 font-sans">
                      <div className="font-mono font-bold text-slate-800">{item.date}</div>
                      <div className="font-semibold text-slate-700">{item.facilityName}</div>
                      <div className="text-[10px] text-slate-400">{item.locationCode || '-'} · {item.officer}</div>
                    </td>
                    <td className="p-3.5 text-right">{item.ph}</td>
                    <td className="p-3.5 text-right">{item.bod}</td>
                    <td className="p-3.5 text-right">{item.cod}</td>
                    <td className="p-3.5 text-right">{item.tss}</td>
                    <td className="p-3.5 text-right">{item.oilGrease}</td>
                    <td className="p-3.5 text-right">{item.ammonia}</td>
                    <td className="p-3.5 text-right">{item.totalColiform.toLocaleString('id-ID')}</td>
                    <td className="p-3.5 text-center font-sans">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        item.complianceStatus === 'Memenuhi'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.complianceStatus === 'Tidak Memenuhi'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : item.complianceStatus === 'Warning'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {item.complianceStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-center pr-5 font-sans">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <button type="button" onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" onClick={() => setDeleteTarget(item)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer" title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-800">
                  {editingId ? 'Edit Data IPAL Domestik' : 'Catat Pemantauan Air Limbah Domestik'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal Uji *</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fasilitas IPAL *</label>
                    <input type="text" required value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="IPAL Mess / Kantor" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kode Titik (Opsional)</label>
                    <input type="text" value={locationCode} onChange={(e) => setLocationCode(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">pH *</label>
                    <input type="number" step="0.01" required value={ph} onChange={(e) => setPh(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">BOD (mg/L) *</label>
                    <input type="number" step="0.01" min="0" required value={bod} onChange={(e) => setBod(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">COD (mg/L) *</label>
                    <input type="number" step="0.01" min="0" required value={cod} onChange={(e) => setCod(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">TSS (mg/L) *</label>
                    <input type="number" step="0.01" min="0" required value={tss} onChange={(e) => setTss(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Minyak &amp; Lemak (mg/L) *</label>
                    <input type="number" step="0.01" min="0" required value={oilGrease} onChange={(e) => setOilGrease(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Amonia (mg/L) *</label>
                    <input type="number" step="0.01" min="0" required value={ammonia} onChange={(e) => setAmmonia(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Total Coliform (MPN/100mL) *</label>
                    <input type="number" step="1" min="0" required value={totalColiform} onChange={(e) => setTotalColiform(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Debit (m³/hari) *</label>
                    <input type="number" step="0.01" min="0" required value={debitM3Day} onChange={(e) => setDebitM3Day(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Petugas / Lab Penguji *</label>
                    <input type="text" required value={officer} onChange={(e) => setOfficer(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Catatan (Opsional)</label>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-slate-600 cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#4D7C5A] hover:bg-[#3e6449] text-white font-bold text-xs rounded-xl cursor-pointer">
                    {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
              <h4 className="text-sm font-bold text-slate-800">Hapus Catatan IPAL Domestik?</h4>
              <p className="text-xs text-slate-600">
                Data pemantauan <strong>{deleteTarget.facilityName}</strong> tanggal {deleteTarget.date} akan dihapus.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-xs text-slate-600 cursor-pointer">Batal</button>
                <button type="button" disabled={isSaving} onClick={handleDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer">
                  {isSaving ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
