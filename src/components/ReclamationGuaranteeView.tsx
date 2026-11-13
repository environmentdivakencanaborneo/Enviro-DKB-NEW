/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import { ReclamationGuarantee } from '../types';
import { exportToExcel } from '../services/exportService';
import { calculateGuaranteeMetrics } from '../utils/guaranteeMetrics';
import { daysUntilLocal, todayLocalISO } from '../utils/dateUtils';
import { triggerToast } from '../utils/errorHandler';
import {
  Landmark,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  ShieldAlert,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';

interface ReclamationGuaranteeViewProps {
  guarantees: ReclamationGuarantee[];
  isLoading?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAddGuarantee: (item: any) => Promise<void> | void;
  onUpdateGuarantee?: (id: string, item: any) => Promise<void> | void;
  onDeleteGuarantee: (id: string) => Promise<void> | void;
  onUnauthorizedAction: (msg: string) => void;
}

const GUARANTEE_WARNING_DAYS = 90;

function getGuaranteeYear(g: ReclamationGuarantee): number | null {
  if (typeof g.periodYear === 'number' && !isNaN(g.periodYear) && g.periodYear >= 2000 && g.periodYear <= 2100) {
    return g.periodYear;
  }
  if (g.issuedDate && typeof g.issuedDate === 'string') {
    const y = Number(g.issuedDate.slice(0, 4));
    if (!isNaN(y) && y >= 2000 && y <= 2100) return y;
  }
  return null;
}

export default function ReclamationGuaranteeView({
  guarantees,
  isLoading = false,
  canEdit,
  canDelete,
  onAddGuarantee,
  onUpdateGuarantee,
  onDeleteGuarantee,
  onUnauthorizedAction,
}: ReclamationGuaranteeViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReclamationGuarantee | null>(null);

  const [gNo, setGNo] = useState('');
  const [gPeriodYear, setGPeriodYear] = useState<number | ''>(new Date().getFullYear());
  const [gType, setGType] = useState<'Bank Guarantee' | 'Time Deposit' | 'Environmental Bond'>('Time Deposit');
  const [gBankType, setGBankType] = useState<'Bank Pemerintah' | 'Lainnya'>('Bank Pemerintah');
  const [gCategory, setGCategory] = useState<'Jaminan Reklamasi' | 'Jaminan Pascatambang'>('Jaminan Reklamasi');
  const [gValue, setGValue] = useState<number>(500000000);
  const [gInst, setGInst] = useState('PT Bank Mandiri (Persero) Tbk');
  const [gIssue, setGIssue] = useState(todayLocalISO());
  const [gDue, setGDue] = useState(todayLocalISO(Date.now() + 365 * 24 * 60 * 60 * 1000));
  const [gStatus, setGStatus] = useState<'Active' | 'Renewal Needed' | 'Claimed' | 'Released'>('Active');

  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<'all' | number>('all');
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc' | 'due-asc' | 'value-desc'>('year-desc');

  const metrics = useMemo(() => calculateGuaranteeMetrics(guarantees), [guarantees]);

  const formatIDR = (num: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const resetForm = () => {
    setEditingId(null);
    setGNo('');
    setGPeriodYear(new Date().getFullYear());
    setGType('Time Deposit');
    setGBankType('Bank Pemerintah');
    setGCategory('Jaminan Reklamasi');
    setGValue(500000000);
    setGInst('PT Bank Mandiri (Persero) Tbk');
    setGIssue(todayLocalISO());
    setGDue(todayLocalISO(Date.now() + 365 * 24 * 60 * 60 * 1000));
    setGStatus('Active');
  };

  const startEdit = (item: ReclamationGuarantee) => {
    if (!canEdit) return onUnauthorizedAction('Ubah Jaminan Reklamasi');
    setEditingId(item.id);
    setGNo(item.guaranteeNo);
    setGPeriodYear(item.periodYear ?? (Number(item.issuedDate?.slice(0, 4)) || new Date().getFullYear()));
    setGType(item.guaranteeType);
    setGBankType(item.bankType || 'Bank Pemerintah');
    setGCategory(item.guaranteeCategory || 'Jaminan Reklamasi');
    setGValue(item.value);
    setGInst(item.issuingInstitution);
    setGIssue(item.issuedDate);
    setGDue(item.dueDate);
    setGStatus(item.status);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Jaminan Reklamasi');

    const trimmedNo = gNo.trim();
    if (!trimmedNo) {
      triggerToast('Nomor jaminan wajib diisi.', 'error');
      return;
    }
    const isDup = guarantees.some(
      (g) => g.id !== editingId && g.guaranteeNo.trim().toLowerCase() === trimmedNo.toLowerCase()
    );
    if (isDup) {
      triggerToast('Nomor jaminan sudah terdaftar.', 'error');
      return;
    }
    if (gDue <= gIssue) {
      triggerToast('Tanggal jatuh tempo harus setelah tanggal penerbitan.', 'error');
      return;
    }
    const yearNum = Number(gPeriodYear);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      triggerToast('Tahun jaminan harus antara 2000 hingga 2100.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Omit<ReclamationGuarantee, 'id'> = {
        guaranteeNo: trimmedNo,
        periodYear: yearNum,
        guaranteeType: editingId ? gType : 'Time Deposit',
        bankType: gBankType,
        guaranteeCategory: gCategory,
        value: Number(gValue),
        issuingInstitution: gInst.trim(),
        issuedDate: gIssue,
        dueDate: gDue,
        status: gStatus,
      };
      if (editingId && onUpdateGuarantee) {
        await onUpdateGuarantee(editingId, payload);
        triggerToast('Data jaminan berhasil diperbarui.', 'success');
      } else {
        await onAddGuarantee(payload);
        triggerToast('Data jaminan berhasil didaftarkan.', 'success');
      }
      resetForm();
      setShowForm(false);
    } catch {
      // toast handled by App wrapper
    } finally {
      setIsSaving(false);
    }
  };

  const uniqueYears = useMemo(() => {
    const s = new Set<number>();
    guarantees.forEach((g) => {
      const y = getGuaranteeYear(g);
      if (y !== null) s.add(y);
    });
    return Array.from(s).sort((a, b) => b - a);
  }, [guarantees]);

  const sortedAndFiltered = useMemo(() => {
    let list = [...guarantees];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (g) =>
          (g.guaranteeNo && g.guaranteeNo.toLowerCase().includes(q)) ||
          (g.issuingInstitution && g.issuingInstitution.toLowerCase().includes(q))
      );
    }
    if (yearFilter !== 'all') {
      list = list.filter((g) => getGuaranteeYear(g) === Number(yearFilter));
    }
    list.sort((a, b) => {
      const yA = getGuaranteeYear(a);
      const yB = getGuaranteeYear(b);
      if (sortBy === 'year-desc' || sortBy === 'year-asc') {
        if (yA === null && yB === null) return 0;
        if (yA === null) return 1;
        if (yB === null) return -1;
        if (yA !== yB) return sortBy === 'year-desc' ? yB - yA : yA - yB;
        return (b.issuedDate || '').localeCompare(a.issuedDate || '');
      }
      if (sortBy === 'due-asc') {
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      }
      return (b.value || 0) - (a.value || 0);
    });
    return list;
  }, [guarantees, searchQuery, yearFilter, sortBy]);

  const yearStats = useMemo(() => {
    const map = new Map<number | null, { count: number; totalValue: number }>();
    sortedAndFiltered.forEach((g) => {
      const y = getGuaranteeYear(g);
      const st = map.get(y) || { count: 0, totalValue: 0 };
      st.count += 1;
      st.totalValue += g.value || 0;
      map.set(y, st);
    });
    return map;
  }, [sortedAndFiltered]);

  const filteredTotalValue = useMemo(
    () => sortedAndFiltered.reduce((sum, g) => sum + (g.value || 0), 0),
    [sortedAndFiltered]
  );

  const handleExport = () => {
    exportToExcel(
      sortedAndFiltered.map((g) => ({
        ID: g.id,
        'Nomor Jaminan': g.guaranteeNo,
        Tahun: getGuaranteeYear(g) ?? '-',
        Kategori: g.guaranteeCategory || 'Jaminan Reklamasi',
        'Instrumen Jaminan': g.guaranteeType,
        'Nilai (IDR)': g.value,
        'Bank Penerbit': g.issuingInstitution,
        'Jenis Bank': g.bankType || '-',
        'Tanggal Terbit': g.issuedDate,
        'Jatuh Tempo': g.dueDate,
        Status: g.status,
      })),
      'Jaminan_Reklamasi_Pascatambang'
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Jaminan Reklamasi (Jamrek) &amp; Jaminan Pascatambang (JamPT)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menggunakan koleksi <code className="font-mono font-bold">reclamation</code> (<code className="font-mono">RG-</code>) secara tunggal sesuai Kepmen ESDM No. 344.K/MB.01/MEM.B/2025.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            disabled={sortedAndFiltered.length === 0}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canEdit) return onUnauthorizedAction('Registrasi Jaminan Reklamasi');
              resetForm();
              setShowForm(!showForm);
            }}
            className="px-4 py-2 bg-[#4D7C5A] hover:bg-[#3e6449] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Tutup Form' : 'Registrasi Jaminan'}
          </button>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-start gap-3 text-left">
        <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-700">
            Ketentuan Kepmen ESDM No. 344.K/MB.01/MEM.B/2025 (Berlaku 23 Oktober 2025)
          </h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Penempatan Jaminan Reklamasi &amp; Pascatambang baru wajib berbentuk <strong>Deposito Berjangka (Time Deposit) pada Bank Pemerintah</strong>. Dokumen bentuk lama tetap dipantau dan perlu disesuaikan saat perpanjangan.
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nilai Jaminan Aktif</span>
          <p className="text-lg font-bold text-emerald-700 mt-1 font-mono tabular-nums">
            {formatIDR(metrics.totalActiveValue)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dokumen Active</span>
          <p className="text-2xl font-bold text-slate-800 mt-1 font-mono tabular-nums">{metrics.activeCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Perlu Renewal</span>
          <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${metrics.renewalCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
            {metrics.renewalCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jatuh Tempo ≤ 90 Hari</span>
          <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${metrics.expiringCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {metrics.expiringCount}
          </p>
        </div>
      </div>

      {/* Form Panel */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-left space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-slate-200 pb-2">
            {editingId ? 'Edit Penempatan Jaminan Reklamasi / Pascatambang' : 'Registrasi Penempatan Jaminan Baru'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Nomor Surat Jaminan / Bilyet *</label>
              <input type="text" required value={gNo} onChange={(e) => setGNo(e.target.value)} placeholder="JAMREK-2026-PTDKB-XXX" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Kategori Jaminan *</label>
              <select value={gCategory} onChange={(e) => setGCategory(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                <option value="Jaminan Reklamasi">Jaminan Reklamasi (Jamrek)</option>
                <option value="Jaminan Pascatambang">Jaminan Pascatambang (JamPT)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Instrumen Finansial *</label>
              <select value={gType} onChange={(e) => setGType(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                <option value="Time Deposit">Time Deposit / Deposito Berjangka (Kepmen 344.K/2025)</option>
                {editingId && gType === 'Bank Guarantee' && <option value="Bank Guarantee">Bank Guarantee (Bentuk Lama)</option>}
                {editingId && gType === 'Environmental Bond' && <option value="Environmental Bond">Environmental Bond (Bentuk Lama)</option>}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Jenis Bank *</label>
              <select value={gBankType} onChange={(e) => setGBankType(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                <option value="Bank Pemerintah">Bank Pemerintah (Mandiri / BRI / BNI / BTN)</option>
                <option value="Lainnya">Lainnya (Perlu verifikasi Kepmen 344.K/2025)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Lembaga Penerbit *</label>
              <input type="text" required value={gInst} onChange={(e) => setGInst(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Nilai Jaminan (IDR) *</label>
              <input type="number" min={1} required value={gValue} onChange={(e) => setGValue(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Tahun Pelaksanaan *</label>
              <input type="number" min={2000} max={2100} required value={gPeriodYear} onChange={(e) => setGPeriodYear(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Tanggal Terbit *</label>
              <input type="date" required value={gIssue} onChange={(e) => setGIssue(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Tanggal Jatuh Tempo *</label>
              <input type="date" required value={gDue} onChange={(e) => setGDue(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">Status Dokumen *</label>
              <select value={gStatus} onChange={(e) => setGStatus(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                <option value="Active">Active &amp; Valid</option>
                <option value="Renewal Needed">Renewal Needed</option>
                <option value="Claimed">Claimed</option>
                <option value="Released">Released</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-xs text-slate-600 cursor-pointer">Batal</button>
            <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#4D7C5A] hover:bg-[#3e6449] text-white font-bold text-xs rounded-xl cursor-pointer">
              {isSaving ? 'Menyimpan...' : editingId ? 'Update Jaminan' : 'Daftarkan Jaminan'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none"
            >
              <option value="all">Semua Tahun</option>
              {uniqueYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none"
            >
              <option value="year-desc">Tahun Terbaru → Terlama</option>
              <option value="year-asc">Tahun Terlama → Terbaru</option>
              <option value="due-asc">Jatuh Tempo Terdekat</option>
              <option value="value-desc">Nilai Terbesar</option>
            </select>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor jaminan / bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                <th className="p-3.5 pl-5">Nomor Jaminan</th>
                <th
                  className="p-3.5 cursor-pointer hover:bg-slate-100"
                  onClick={() => setSortBy((prev) => (prev === 'year-desc' ? 'year-asc' : 'year-desc'))}
                >
                  <div className="flex items-center gap-1">Tahun <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="p-3.5">Instrumen &amp; Kategori</th>
                <th className="p-3.5 text-right">Nilai (IDR)</th>
                <th className="p-3.5">Bank Penerbit</th>
                <th className="p-3.5 text-center">Terbit / Jatuh Tempo</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Memuat data jaminan reklamasi...</td></tr>
              ) : sortedAndFiltered.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-500">Belum ada data jaminan reklamasi atau pascatambang.</td></tr>
              ) : (
                (() => {
                  const showDividers = yearFilter === 'all' && (sortBy === 'year-desc' || sortBy === 'year-asc');
                  let lastYear: number | null | undefined = undefined;
                  return sortedAndFiltered.map((item) => {
                    const itemYear = getGuaranteeYear(item);
                    const shouldShowDivider = showDividers && itemYear !== lastYear;
                    if (showDividers) lastYear = itemYear;
                    const diffDays = daysUntilLocal(item.dueDate);
                    const isWarning = item.status === 'Renewal Needed' || (item.status === 'Active' && diffDays <= GUARANTEE_WARNING_DAYS);
                    const stat = yearStats.get(itemYear);
                    return (
                      <React.Fragment key={item.id}>
                        {shouldShowDivider && stat && (
                          <tr className="bg-slate-100/90 border-y border-slate-200">
                            <td colSpan={8} className="py-2 px-5 font-bold text-xs text-slate-700">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                  Tahun Pelaksanaan {itemYear ?? 'Tidak Ditentukan'} ({stat.count} dokumen)
                                </span>
                                <span className="font-mono text-emerald-700 font-bold">Subtotal: {formatIDR(stat.totalValue)}</span>
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50/70">
                          <td className="p-3.5 pl-5 font-mono font-bold text-slate-800">{item.guaranteeNo}</td>
                          <td className="p-3.5 font-mono font-bold">{itemYear ?? '-'}</td>
                          <td className="p-3.5">
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                                {item.guaranteeCategory || 'Jaminan Reklamasi'}
                              </span>
                              <span className="text-[11px] font-medium text-slate-700">
                                {item.guaranteeType === 'Time Deposit' ? 'Deposito Berjangka (Time Deposit)' : item.guaranteeType}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-700">{formatIDR(item.value)}</td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-700">{item.issuingInstitution}</div>
                            {item.bankType && <div className="text-[10px] text-slate-400">{item.bankType}</div>}
                          </td>
                          <td className="p-3.5 text-center font-mono">
                            <div className={`font-bold ${isWarning ? 'text-rose-600' : 'text-slate-700'}`}>{item.dueDate}</div>
                            <div className="text-[10px] text-slate-400">Terbit: {item.issuedDate}</div>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                              item.status === 'Active' && !isWarning
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isWarning
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-center pr-5">
                            <div className="flex items-center justify-center gap-1">
                              {canEdit && (
                                <button type="button" onClick={() => startEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer" title="Edit">
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
                      </React.Fragment>
                    );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex justify-between">
          <span>Menampilkan <strong>{sortedAndFiltered.length}</strong> dari <strong>{guarantees.length}</strong> dokumen</span>
          <span>Total Nilai Filter: <strong className="font-mono text-emerald-700">{formatIDR(filteredTotalValue)}</strong></span>
        </div>
      </div>

      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
              <h4 className="text-sm font-bold text-slate-800">Hapus Jaminan {deleteTarget.guaranteeNo}?</h4>
              <p className="text-xs text-slate-600">Dokumen jaminan senilai <strong>{formatIDR(deleteTarget.value)}</strong> akan dihapus.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-xs text-slate-600 cursor-pointer">Batal</button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={async () => {
                    try {
                      setIsSaving(true);
                      await onDeleteGuarantee(deleteTarget.id);
                      setDeleteTarget(null);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
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
