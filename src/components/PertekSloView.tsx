/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import { PertekSloCategory, PertekSloData } from '../types';
import { pertekSloService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { daysUntilLocal, todayLocalISO } from '../utils/dateUtils';
import { triggerToast } from '../utils/errorHandler';
import {
  FileBadge2,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  ExternalLink,
  X,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';

interface PertekSloViewProps {
  data: PertekSloData[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onUnauthorizedAction: (action: string) => void;
}

const CATEGORIES: PertekSloCategory[] = [
  'Pembuangan Air Limbah',
  'Pemanfaatan Air Limbah',
  'Emisi Udara',
  'Penyimpanan LB3',
  'Lainnya',
];

export default function PertekSloView({
  data,
  isLoading,
  canEdit,
  canDelete,
  onUnauthorizedAction,
}: PertekSloViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | 'Pertek' | 'SLO'>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PertekSloData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [docKind, setDocKind] = useState<'Pertek' | 'SLO'>('Pertek');
  const [category, setCategory] = useState<PertekSloCategory>('Pembuangan Air Limbah');
  const [permitNumber, setPermitNumber] = useState('');
  const [title, setTitle] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('KLH/BPLH / DPM-PTSP');
  const [issuedDate, setIssuedDate] = useState(todayLocalISO());
  const [expiryDate, setExpiryDate] = useState('N/A');
  const [compliancePoint, setCompliancePoint] = useState('');
  const [reportingObligation, setReportingObligation] = useState('Pelaporan periodik per 3 / 6 bulan');
  const [status, setStatus] = useState<PertekSloData['status']>('Aktif');
  const [documentUrl, setDocumentUrl] = useState('');
  const [pic, setPic] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setDocKind('Pertek');
    setCategory('Pembuangan Air Limbah');
    setPermitNumber('');
    setTitle('');
    setIssuingAuthority('KLH/BPLH / DPM-PTSP');
    setIssuedDate(todayLocalISO());
    setExpiryDate('N/A');
    setCompliancePoint('');
    setReportingObligation('Pelaporan periodik per 3 / 6 bulan');
    setStatus('Aktif');
    setDocumentUrl('');
    setPic('');
    setNotes('');
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Register Pertek & SLO');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: PertekSloData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Register Pertek & SLO');
    setEditingId(item.id);
    setDocKind(item.docKind);
    setCategory(item.category);
    setPermitNumber(item.permitNumber);
    setTitle(item.title);
    setIssuingAuthority(item.issuingAuthority);
    setIssuedDate(item.issuedDate);
    setExpiryDate(item.expiryDate);
    setCompliancePoint(item.compliancePoint);
    setReportingObligation(item.reportingObligation);
    setStatus(item.status);
    setDocumentUrl(item.documentUrl || '');
    setPic(item.pic);
    setNotes(item.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Register Pertek & SLO');
    try {
      setIsSaving(true);
      const payload: Omit<PertekSloData, 'id'> = {
        docKind,
        category,
        permitNumber: permitNumber.trim(),
        title: title.trim(),
        issuingAuthority: issuingAuthority.trim(),
        issuedDate,
        expiryDate: expiryDate.trim() || 'N/A',
        compliancePoint: compliancePoint.trim(),
        reportingObligation: reportingObligation.trim(),
        status,
        documentUrl: documentUrl.trim() || undefined,
        pic: pic.trim(),
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await pertekSloService.update(editingId, payload);
        triggerToast('Register Pertek/SLO berhasil diperbarui.', 'success');
      } else {
        await pertekSloService.add(payload);
        triggerToast('Register Pertek/SLO baru berhasil ditambahkan.', 'success');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menyimpan register Pertek/SLO.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) return onUnauthorizedAction('Hapus Register Pertek & SLO');
    try {
      setIsSaving(true);
      await pertekSloService.delete(deleteTarget.id);
      triggerToast('Register Pertek/SLO berhasil dihapus.', 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menghapus register Pertek/SLO.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return data.filter((item) => {
      const matchQuery =
        item.permitNumber.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.compliancePoint.toLowerCase().includes(q) ||
        item.pic.toLowerCase().includes(q);
      const matchKind = kindFilter === 'ALL' || item.docKind === kindFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchQuery && matchKind && matchStatus;
    });
  }, [data, searchQuery, kindFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = data.length;
    const pertekCount = data.filter((d) => d.docKind === 'Pertek').length;
    const sloCount = data.filter((d) => d.docKind === 'SLO').length;
    const attentionCount = data.filter((d) => {
      if (d.status === 'Segera Berakhir' || d.status === 'Kedaluwarsa') return true;
      if (d.expiryDate && d.expiryDate !== 'N/A' && /^\d{4}-\d{2}-\d{2}$/.test(d.expiryDate)) {
        return daysUntilLocal(d.expiryDate) <= 90;
      }
      return false;
    }).length;
    return { total, pertekCount, sloCount, attentionCount };
  }, [data]);

  const handleExport = () => {
    exportToExcel(
      filteredData.map((d) => ({
        ID: d.id,
        Jenis: d.docKind,
        Kategori: d.category,
        'Nomor Surat': d.permitNumber,
        Judul: d.title,
        Penerbit: d.issuingAuthority,
        'Tanggal Terbit': d.issuedDate,
        'Masa Berlaku': d.expiryDate,
        'Titik Penaatan': d.compliancePoint,
        'Kewajiban Pelaporan': d.reportingObligation,
        Status: d.status,
        PIC: d.pic,
        Tautan: d.documentUrl || '',
      })),
      'Register_Pertek_SLO'
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-hi text-left">
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/25 flex items-center justify-center text-neon-green shrink-0">
            <FileBadge2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-hi">
              Register Persetujuan Teknis (Pertek) &amp; Surat Kelayakan Operasional (SLO)
            </h3>
            <p className="text-xs text-text-mid mt-0.5">
              Inventarisasi pembuangan/pemanfaatan air limbah, emisi udara, dan penyimpanan LB3 sesuai Permen LHK No. 5 Tahun 2021.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="px-3.5 py-2 bg-bg-2 border border-border-subtle hover:border-border-neon text-text-mid hover:text-text-hi text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-neon-green" />
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 neon-btn-primary text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah Pertek / SLO
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neon-card rounded-2xl p-4">
          <span className="text-[11px] font-bold text-text-low uppercase tracking-wider">Total Dokumen</span>
          <p className="text-2xl font-bold text-text-hi mt-1 font-mono tabular-nums">{kpis.total}</p>
        </div>
        <div className="neon-card rounded-2xl p-4">
          <span className="text-[11px] font-bold text-text-low uppercase tracking-wider">Register Pertek</span>
          <p className="text-2xl font-bold text-neon-green mt-1 font-mono tabular-nums">{kpis.pertekCount}</p>
        </div>
        <div className="neon-card rounded-2xl p-4">
          <span className="text-[11px] font-bold text-text-low uppercase tracking-wider">SLO Terbit</span>
          <p className="text-2xl font-bold text-neon-cyan mt-1 font-mono tabular-nums">{kpis.sloCount}</p>
        </div>
        <div className="neon-card rounded-2xl p-4">
          <span className="text-[11px] font-bold text-text-low uppercase tracking-wider">Perlu Perpanjangan (≤ 90 Hari)</span>
          <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${kpis.attentionCount > 0 ? 'text-neon-amber' : 'text-text-mid'}`}>
            {kpis.attentionCount}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border-subtle bg-bg-2/70 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor Pertek/SLO, judul, titik penaatan, PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as any)}
              className="px-3 py-2 text-xs"
            >
              <option value="ALL">Semua Jenis (Pertek &amp; SLO)</option>
              <option value="Pertek">Pertek</option>
              <option value="SLO">SLO</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs"
            >
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Segera Berakhir">Segera Berakhir</option>
              <option value="Proses Perpanjangan">Proses Perpanjangan</option>
              <option value="Kedaluwarsa">Kedaluwarsa</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="neon-table text-xs">
            <thead>
              <tr>
                <th className="pl-5">Jenis &amp; Nomor</th>
                <th>Kategori &amp; Perihal</th>
                <th>Titik Penaatan</th>
                <th>Kewajiban Pelaporan</th>
                <th className="text-center">Masa Berlaku</th>
                <th className="text-center">Status</th>
                <th className="text-center pr-5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-2">
                    <TableSkeleton columns={7} rows={5} />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4">
                    <EmptyState
                      icon={FileBadge2}
                      title="Belum ada register Pertek & SLO"
                      description="Tambahkan dokumen Persetujuan Teknis atau Surat Kelayakan Operasional."
                    />
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const hasIsoExpiry = item.expiryDate && item.expiryDate !== 'N/A' && /^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate);
                  const remainDays = hasIsoExpiry ? daysUntilLocal(item.expiryDate) : null;
                  const statusForBadge =
                    item.status === 'Aktif' ? 'Aktif' :
                    item.status === 'Kedaluwarsa' ? 'Expired' :
                    item.status === 'Segera Berakhir' ? 'Segera Habis' : 'Proses';
                  return (
                    <tr key={item.id}>
                      <td className="pl-5">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mb-1 border ${
                          item.docKind === 'SLO'
                            ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/25'
                            : 'bg-neon-green/10 text-neon-green border-neon-green/25'
                        }`}>
                          {item.docKind}
                        </span>
                        <div className="font-mono font-bold text-text-hi">{item.permitNumber}</div>
                        <div className="text-[10px] text-text-low mt-0.5">{item.issuingAuthority}</div>
                      </td>
                      <td className="max-w-xs">
                        <div className="text-[10px] font-semibold text-neon-cyan uppercase">{item.category}</div>
                        <div className="font-semibold text-text-hi mt-0.5">{item.title}</div>
                        <div className="text-[10px] text-text-low mt-0.5">PIC: {item.pic}</div>
                      </td>
                      <td className="font-medium text-text-hi">{item.compliancePoint}</td>
                      <td className="text-text-mid max-w-xs">{item.reportingObligation}</td>
                      <td className="text-center font-mono tabular-nums">
                        <div className="text-text-hi font-semibold">{item.expiryDate}</div>
                        <div className="text-[10px] text-text-low">Terbit: {item.issuedDate}</div>
                        {remainDays !== null && (
                          <div className={`text-[10px] font-bold mt-0.5 ${remainDays <= 90 ? 'text-neon-amber' : 'text-text-mid'}`}>
                            {remainDays < 0 ? `Lewat ${Math.abs(remainDays)} hari` : `Sisa ${remainDays} hari`}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <StatusBadge status={statusForBadge} label={item.status} size="xs" />
                      </td>
                      <td className="text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          {item.documentUrl && (
                            <a
                              href={item.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/20 rounded-lg"
                              title="Buka Dokumen"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/20 rounded-lg cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 text-neon-red bg-neon-red/10 hover:bg-neon-red/20 border border-neon-red/20 rounded-lg cursor-pointer"
                              title="Hapus"
                            >
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

      {/* Add / Edit Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-0/75 backdrop-blur-md">
            <div className="glass-panel rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
              <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-1/80">
                <h3 className="text-sm font-bold text-text-hi">
                  {editingId ? 'Edit Register Pertek / SLO' : 'Tambah Register Pertek / SLO Baru'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-text-low hover:text-text-hi cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Jenis Dokumen *</label>
                    <select value={docKind} onChange={(e) => setDocKind(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Pertek">Pertek (Persetujuan Teknis)</option>
                      <option value="SLO">SLO (Surat Kelayakan Operasional)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Kategori Teknis *</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as PertekSloCategory)} className="w-full px-3 py-2 text-xs">
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Nomor Pertek / SLO *</label>
                    <input type="text" required value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)} placeholder="503/IPAL-LH/DPM-PTSP/2021" className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Instansi Penerbit *</label>
                    <input type="text" required value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Judul / Perihal Persetujuan *</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Pertek Pembuangan Air Limbah Pertambangan KPL-01" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Tanggal Terbit *</label>
                    <input type="date" required value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Masa Berlaku (YYYY-MM-DD atau N/A) *</label>
                    <input type="text" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} placeholder="YYYY-MM-DD atau N/A" className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Titik Penaatan *</label>
                    <input type="text" required value={compliancePoint} onChange={(e) => setCompliancePoint(e.target.value)} placeholder="KPL-01 / Cerobong Genset #1 / TPS LB3" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Status *</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as PertekSloData['status'])} className="w-full px-3 py-2 text-xs">
                      <option value="Aktif">Aktif</option>
                      <option value="Segera Berakhir">Segera Berakhir</option>
                      <option value="Proses Perpanjangan">Proses Perpanjangan</option>
                      <option value="Kedaluwarsa">Kedaluwarsa</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Kewajiban Pelaporan *</label>
                    <input type="text" required value={reportingObligation} onChange={(e) => setReportingObligation(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">PIC Penanggung Jawab *</label>
                    <input type="text" required value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama petugas / PIC" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Tautan Dokumen (Opsional)</label>
                    <input type="url" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Catatan (Opsional)</label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-xs resize-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-text-mid hover:text-text-hi cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 neon-btn-primary text-xs rounded-xl cursor-pointer">
                    {isSaving ? 'Menyimpan...' : 'Simpan Register'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-0/75 backdrop-blur-md">
            <div className="glass-panel rounded-2xl p-6 max-w-md w-full space-y-4 text-left">
              <h4 className="text-sm font-bold text-text-hi">Hapus Register {deleteTarget.docKind}?</h4>
              <p className="text-xs text-text-mid">
                Dokumen <strong className="text-text-hi">{deleteTarget.permitNumber}</strong> ({deleteTarget.title}) akan dihapus dari register Pertek &amp; SLO dan tercatat di Audit Trail.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-xs text-text-mid hover:text-text-hi cursor-pointer">Batal</button>
                <button type="button" disabled={isSaving} onClick={handleDelete} className="px-4 py-2 neon-btn-danger font-bold text-xs rounded-xl cursor-pointer">
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

