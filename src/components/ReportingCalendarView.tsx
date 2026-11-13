/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import { ReportingCalendarData, ReportingCategory } from '../types';
import { reportingCalendarService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { daysUntilLocal, todayLocalISO } from '../utils/dateUtils';
import { triggerToast } from '../utils/errorHandler';
import {
  CalendarClock,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';

interface ReportingCalendarViewProps {
  data: ReportingCalendarData[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onUnauthorizedAction: (action: string) => void;
}

const REPORT_TYPES: ReportingCategory[] = [
  'RKL-RPL Semester',
  'Laporan Pertek',
  'Neraca & Logbook LB3',
  'Laporan GRK Tahunan (Maret)',
  'RKAB Lingkungan',
  'Laporan Reklamasi & Pascatambang',
];

export default function ReportingCalendarView({
  data,
  isLoading,
  canEdit,
  canDelete,
  onUnauthorizedAction,
}: ReportingCalendarViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportingCalendarData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [reportType, setReportType] = useState<ReportingCategory>('RKL-RPL Semester');
  const [periodLabel, setPeriodLabel] = useState('Semester I 2026');
  const [dueDate, setDueDate] = useState(todayLocalISO());
  const [targetAgency, setTargetAgency] = useState('DLH Kab/Prov & KLH/BPLH');
  const [pic, setPic] = useState('');
  const [status, setStatus] = useState<ReportingCalendarData['status']>('Terjadwal');
  const [submittedDate, setSubmittedDate] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setReportType('RKL-RPL Semester');
    setPeriodLabel('Semester I 2026');
    setDueDate(todayLocalISO());
    setTargetAgency('DLH Kab/Prov & KLH/BPLH');
    setPic('');
    setStatus('Terjadwal');
    setSubmittedDate('');
    setReceiptNumber('');
    setReceiptUrl('');
    setNotes('');
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Jadwal Pelaporan Wajib');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: ReportingCalendarData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Jadwal Pelaporan Wajib');
    setEditingId(item.id);
    setReportType(item.reportType);
    setPeriodLabel(item.periodLabel);
    setDueDate(item.dueDate);
    setTargetAgency(item.targetAgency);
    setPic(item.pic);
    setStatus(item.status);
    setSubmittedDate(item.submittedDate || '');
    setReceiptNumber(item.receiptNumber || '');
    setReceiptUrl(item.receiptUrl || '');
    setNotes(item.notes || '');
    setShowModal(true);
  };

  const handleMarkSubmitted = async (item: ReportingCalendarData) => {
    if (!canEdit) return onUnauthorizedAction('Tandai Pelaporan Terkirim');
    try {
      setIsSaving(true);
      await reportingCalendarService.update(item.id, {
        status: 'Terkirim',
        submittedDate: item.submittedDate || todayLocalISO(),
      });
      triggerToast(`Pelaporan ${item.reportType} (${item.periodLabel}) ditandai Terkirim.`, 'success');
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal memperbarui status pelaporan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Jadwal Pelaporan Wajib');
    try {
      setIsSaving(true);
      const payload: Omit<ReportingCalendarData, 'id'> = {
        reportType,
        periodLabel: periodLabel.trim(),
        dueDate,
        targetAgency: targetAgency.trim(),
        pic: pic.trim(),
        status,
        submittedDate: submittedDate || undefined,
        receiptNumber: receiptNumber.trim() || undefined,
        receiptUrl: receiptUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await reportingCalendarService.update(editingId, payload);
        triggerToast('Jadwal pelaporan berhasil diperbarui.', 'success');
      } else {
        await reportingCalendarService.add(payload);
        triggerToast('Jadwal pelaporan baru berhasil ditambahkan.', 'success');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menyimpan jadwal pelaporan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) return onUnauthorizedAction('Hapus Jadwal Pelaporan Wajib');
    try {
      setIsSaving(true);
      await reportingCalendarService.delete(deleteTarget.id);
      triggerToast('Jadwal pelaporan dihapus.', 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menghapus jadwal pelaporan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return data.filter((d) => {
      const matchQuery =
        d.reportType.toLowerCase().includes(q) ||
        d.periodLabel.toLowerCase().includes(q) ||
        d.targetAgency.toLowerCase().includes(q) ||
        d.pic.toLowerCase().includes(q) ||
        (d.receiptNumber || '').toLowerCase().includes(q);
      const matchType = typeFilter === 'ALL' || d.reportType === typeFilter;
      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchQuery && matchType && matchStatus;
    });
  }, [data, searchQuery, typeFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = data.length;
    const submitted = data.filter((d) => d.status === 'Terkirim').length;
    let h7 = 0;
    let h14 = 0;
    let h30 = 0;
    let overdue = 0;
    for (const item of data) {
      if (item.status === 'Terkirim') continue;
      const rem = daysUntilLocal(item.dueDate);
      if (rem < 0 || item.status === 'Terlambat') overdue += 1;
      else if (rem <= 7) h7 += 1;
      else if (rem <= 14) h14 += 1;
      else if (rem <= 30) h30 += 1;
    }
    return { total, submitted, h7, h14, h30, overdue };
  }, [data]);

  const getCountdownBadge = (item: ReportingCalendarData) => {
    if (item.status === 'Terkirim') {
      return { label: 'Selesai Dikirim', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    const rem = daysUntilLocal(item.dueDate);
    if (rem < 0) return { label: `Terlewat ${Math.abs(rem)} hari`, cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (rem <= 7) return { label: `Pengingat H-7 (H-${rem})`, cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (rem <= 14) return { label: `Pengingat H-14 (H-${rem})`, cls: 'bg-amber-50 text-amber-800 border-amber-200' };
    if (rem <= 30) return { label: `Pengingat H-30 (H-${rem})`, cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    return { label: `H-${rem}`, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const handleExport = () => {
    exportToExcel(
      filteredData.map((d) => ({
        ID: d.id,
        'Jenis Pelaporan': d.reportType,
        Periode: d.periodLabel,
        Tenggat: d.dueDate,
        'Instansi Tujuan': d.targetAgency,
        PIC: d.pic,
        Status: d.status,
        'Tanggal Kirim': d.submittedDate || '',
        'Nomor Tanda Terima': d.receiptNumber || '',
        'Bukti URL': d.receiptUrl || '',
      })),
      'Kalender_Pelaporan_Wajib'
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Kalender Pelaporan Wajib Lingkungan</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              RKL-RPL per semester, laporan Pertek, neraca &amp; logbook LB3, laporan GRK tahunan (Maret), RKAB, dan reklamasi dengan pengingat H-30 / H-14 / H-7.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            Tambah Jadwal Lapor
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Jadwal</span>
          <p className="text-2xl font-bold text-slate-800 mt-1 font-mono tabular-nums">{kpis.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pengingat H-30</span>
          <p className="text-2xl font-bold text-sky-700 mt-1 font-mono tabular-nums">{kpis.h30}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pengingat H-14</span>
          <p className="text-2xl font-bold text-amber-600 mt-1 font-mono tabular-nums">{kpis.h14}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kritis H-7 / Terlewat</span>
          <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${kpis.h7 + kpis.overdue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {kpis.h7 + kpis.overdue}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Terkirim &amp; Sah</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">{kpis.submitted}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari laporan, periode, nomor tanda terima, PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none">
              <option value="ALL">Semua Jenis Pelaporan</option>
              {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none">
              <option value="ALL">Semua Status</option>
              <option value="Terjadwal">Terjadwal</option>
              <option value="Proses">Proses</option>
              <option value="Terkirim">Terkirim</option>
              <option value="Terlambat">Terlambat</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-5">Jenis Laporan &amp; Periode</th>
                <th className="p-3.5">Instansi &amp; PIC</th>
                <th className="p-3.5 text-center">Tenggat &amp; Pengingat</th>
                <th className="p-3.5">Tanda Terima</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Memuat kalender pelaporan...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500">Belum ada jadwal pelaporan wajib yang dicatat.</td></tr>
              ) : (
                filteredData.map((item) => {
                  const cd = getCountdownBadge(item);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-slate-800">{item.reportType}</div>
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">{item.periodLabel}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-700">{item.targetAgency}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">PIC: {item.pic}</div>
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        <div className="font-bold text-slate-800">{item.dueDate}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] font-sans font-bold ${cd.cls}`}>
                          {cd.label}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {item.receiptNumber ? (
                          <div className="font-mono text-slate-700 font-semibold">{item.receiptNumber}</div>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada tanda terima</span>
                        )}
                        {item.submittedDate && (
                          <div className="text-[10px] text-slate-500">Kirim: {item.submittedDate}</div>
                        )}
                        {item.receiptUrl && (
                          <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline mt-0.5">
                            Lihat Bukti <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          item.status === 'Terkirim'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'Terlambat'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.status === 'Proses'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {item.status === 'Terkirim' ? <CheckCircle2 className="w-3 h-3" /> : item.status === 'Terlambat' ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && item.status !== 'Terkirim' && (
                            <button
                              type="button"
                              onClick={() => handleMarkSubmitted(item)}
                              className="px-2 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg cursor-pointer"
                              title="Tandai Terkirim"
                            >
                              Terkirim
                            </button>
                          )}
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
                  );
                })
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
                  {editingId ? 'Edit Jadwal Pelaporan Wajib' : 'Tambah Jadwal Pelaporan Wajib'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jenis Laporan *</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportingCategory)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                      {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Periode Pelaporan *</label>
                    <input type="text" required value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="Semester I 2026 / Tahun 2026 (Maret)" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tenggat Wajib (Due Date) *</label>
                    <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Instansi Tujuan *</label>
                    <input type="text" required value={targetAgency} onChange={(e) => setTargetAgency(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">PIC Penanggung Jawab *</label>
                    <input type="text" required value={pic} onChange={(e) => setPic(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Pelaporan *</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as ReportingCalendarData['status'])} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                      <option value="Terjadwal">Terjadwal</option>
                      <option value="Proses">Proses</option>
                      <option value="Terkirim">Terkirim</option>
                      <option value="Terlambat">Terlambat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal Dikirim (Opsional)</label>
                    <input type="date" value={submittedDate} onChange={(e) => setSubmittedDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor Tanda Terima (Opsional)</label>
                    <input type="text" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="TTE / SIMPEL / MinerbaOne" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">URL Bukti Tanda Terima (Opsional)</label>
                    <input type="url" value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Catatan (Opsional)</label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-slate-600 cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#4D7C5A] hover:bg-[#3e6449] text-white font-bold text-xs rounded-xl cursor-pointer">
                    {isSaving ? 'Menyimpan...' : 'Simpan Jadwal'}
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
              <h4 className="text-sm font-bold text-slate-800">Hapus Jadwal Pelaporan?</h4>
              <p className="text-xs text-slate-600">
                Jadwal <strong>{deleteTarget.reportType} ({deleteTarget.periodLabel})</strong> akan dihapus permanen.
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
