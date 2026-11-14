/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import StatusBadge from './StatusBadge';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';
import { ForestryPpkhData } from '../types';
import { forestryPpkhService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import { triggerToast } from '../utils/errorHandler';
import {
  TreePine,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  ExternalLink,
  X,
} from 'lucide-react';

interface ForestryPpkhViewProps {
  data: ForestryPpkhData[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function ForestryPpkhView({
  data,
  isLoading,
  canEdit,
  canDelete,
  onUnauthorizedAction,
}: ForestryPpkhViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ForestryPpkhData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [docType, setDocType] = useState<ForestryPpkhData['docType']>('PPKH');
  const [decreeNumber, setDecreeNumber] = useState('');
  const [title, setTitle] = useState('');
  const [areaLocation, setAreaLocation] = useState('');
  const [approvedAreaHa, setApprovedAreaHa] = useState<number>(0);
  const [realizedAreaHa, setRealizedAreaHa] = useState<number>(0);
  const [legalBasis, setLegalBasis] = useState('');
  const [issuedDate, setIssuedDate] = useState(todayLocalISO());
  const [expiryDate, setExpiryDate] = useState('N/A');
  const [obligationSummary, setObligationSummary] = useState('');
  const [status, setStatus] = useState<ForestryPpkhData['status']>('Aktif');
  const [pic, setPic] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setDocType('PPKH');
    setDecreeNumber('');
    setTitle('');
    setAreaLocation('');
    setApprovedAreaHa(0);
    setRealizedAreaHa(0);
    setLegalBasis('');
    setIssuedDate(todayLocalISO());
    setExpiryDate('N/A');
    setObligationSummary('');
    setStatus('Aktif');
    setPic('');
    setDocumentUrl('');
    setNotes('');
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Kewajiban Kehutanan (PPKH / DAS)');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: ForestryPpkhData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Kewajiban Kehutanan');
    setEditingId(item.id);
    setDocType(item.docType);
    setDecreeNumber(item.decreeNumber);
    setTitle(item.title);
    setAreaLocation(item.areaLocation);
    setApprovedAreaHa(item.approvedAreaHa);
    setRealizedAreaHa(item.realizedAreaHa);
    setLegalBasis(item.legalBasis);
    setIssuedDate(item.issuedDate);
    setExpiryDate(item.expiryDate);
    setObligationSummary(item.obligationSummary);
    setStatus(item.status);
    setPic(item.pic);
    setDocumentUrl(item.documentUrl || '');
    setNotes(item.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Kewajiban Kehutanan');
    try {
      setIsSaving(true);
      const appHa = Number(approvedAreaHa) || 0;
      const realHa = Number(realizedAreaHa) || 0;
      const progressPct = appHa > 0 ? Math.min(100, Number(((realHa / appHa) * 100).toFixed(1))) : 0;

      const payload: Omit<ForestryPpkhData, 'id'> = {
        docType,
        decreeNumber: decreeNumber.trim(),
        title: title.trim(),
        areaLocation: areaLocation.trim(),
        approvedAreaHa: appHa,
        realizedAreaHa: realHa,
        progressPct,
        legalBasis: legalBasis.trim(),
        authorityLabel: 'Kementerian Kehutanan',
        issuedDate,
        expiryDate: expiryDate.trim() || 'N/A',
        obligationSummary: obligationSummary.trim(),
        status,
        pic: pic.trim(),
        documentUrl: documentUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await forestryPpkhService.update(editingId, payload);
        triggerToast('Kewajiban kehutanan berhasil diperbarui.', 'success');
      } else {
        await forestryPpkhService.add(payload);
        triggerToast('Kewajiban kehutanan baru berhasil ditambahkan.', 'success');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menyimpan kewajiban kehutanan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) return onUnauthorizedAction('Hapus Kewajiban Kehutanan');
    try {
      setIsSaving(true);
      await forestryPpkhService.delete(deleteTarget.id);
      triggerToast('Kewajiban kehutanan berhasil dihapus.', 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menghapus kewajiban kehutanan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return data.filter((item) => {
      const matchQ =
        item.decreeNumber.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.areaLocation.toLowerCase().includes(q) ||
        item.legalBasis.toLowerCase().includes(q);
      const matchType = typeFilter === 'ALL' || item.docType === typeFilter;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchQ && matchType && matchStatus;
    });
  }, [data, searchQuery, typeFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = data.length;
    const totalApprovedHa = data.reduce((s, d) => s + (d.approvedAreaHa || 0), 0);
    const totalRealizedHa = data.reduce((s, d) => s + (d.realizedAreaHa || 0), 0);
    const avgProgress = totalApprovedHa > 0 ? Math.round((totalRealizedHa / totalApprovedHa) * 100) : 0;
    return { total, totalApprovedHa, totalRealizedHa, avgProgress };
  }, [data]);

  const handleExport = () => {
    exportToExcel(
      filteredData.map((d) => ({
        ID: d.id,
        Jenis: d.docType,
        Otoritas: d.authorityLabel,
        'Nomor SK': d.decreeNumber,
        Perihal: d.title,
        'Lokasi / DAS': d.areaLocation,
        'Luas Persetujuan (Ha)': d.approvedAreaHa,
        'Realisasi (Ha)': d.realizedAreaHa,
        'Progres (%)': d.progressPct,
        'Dasar Hukum': d.legalBasis,
        'Tanggal Terbit': d.issuedDate,
        'Masa Berlaku': d.expiryDate,
        Status: d.status,
        PIC: d.pic,
      })),
      'Kewajiban_Kehutanan_PPKH_DAS'
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-hi">
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
            <TreePine className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-text-hi">
              Kewajiban Kehutanan — PPKH &amp; Rehabilitasi DAS (Kementerian Kehutanan)
            </h3>
            <p className="text-xs text-text-mid mt-0.5">
              Pelacakan SK Persetujuan Penggunaan Kawasan Hutan (PPKH) dan Rehabilitasi DAS. Dasar hukum diisikan sesuai SK yang berlaku.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="px-3.5 py-2 bg-bg-1 border border-border-neon hover:border-neon-cyan/40 hover:bg-bg-2 text-text-hi text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-neon-green" />
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 neon-btn-primary text-xs rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tambah SK Kehutanan
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neon-card p-4">
          <span className="text-[11px] font-bold text-text-mid uppercase tracking-wider">Total SK / Register</span>
          <p className="text-2xl font-bold text-text-hi mt-1 font-mono tabular-nums">{kpis.total}</p>
        </div>
        <div className="neon-card p-4">
          <span className="text-[11px] font-bold text-text-mid uppercase tracking-wider">Target Luas (Ha)</span>
          <p className="text-2xl font-bold text-neon-green mt-1 font-mono tabular-nums">{kpis.totalApprovedHa.toLocaleString('id-ID')}</p>
        </div>
        <div className="neon-card p-4">
          <span className="text-[11px] font-bold text-text-mid uppercase tracking-wider">Realisasi Luas (Ha)</span>
          <p className="text-2xl font-bold text-neon-cyan mt-1 font-mono tabular-nums">{kpis.totalRealizedHa.toLocaleString('id-ID')}</p>
        </div>
        <div className="neon-card p-4">
          <span className="text-[11px] font-bold text-text-mid uppercase tracking-wider">Progres Keseluruhan</span>
          <p className="text-2xl font-bold text-text-hi mt-1 font-mono tabular-nums">{kpis.avgProgress}%</p>
        </div>
      </div>

      {/* Filter & Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border-neon bg-bg-2/60 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nomor SK, lokasi/DAS, dasar hukum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-xs">
              <option value="ALL">Semua Jenis</option>
              <option value="PPKH">PPKH</option>
              <option value="Rehabilitasi DAS">Rehabilitasi DAS</option>
              <option value="Kompensasi Lahan / Lainnya">Kompensasi Lahan / Lainnya</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-xs">
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Dalam Pelaksanaan">Dalam Pelaksanaan</option>
              <option value="Selesai">Selesai</option>
              <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="neon-table text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-wider">
                <th className="p-3.5 pl-5">Jenis &amp; Nomor SK</th>
                <th className="p-3.5">Perihal &amp; Dasar Hukum</th>
                <th className="p-3.5">Lokasi / DAS</th>
                <th className="p-3.5 text-center">Progres Luas (Ha)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-4">
                    <TableSkeleton columns={6} rows={5} />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4">
                    <EmptyState
                      icon={TreePine}
                      title="Belum ada data PPKH / Rehabilitasi DAS tercatat"
                      description="Tambahkan SK Persetujuan Penggunaan Kawasan Hutan atau Rehabilitasi DAS."
                    />
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3.5 pl-5">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-neon-green/10 text-neon-green border border-neon-green/30 mb-1">
                        {item.docType}
                      </span>
                      <div className="font-mono font-bold text-text-hi">{item.decreeNumber}</div>
                      <div className="text-[10px] text-text-low">{item.authorityLabel}</div>
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-text-hi">{item.title}</div>
                      <div className="text-[10px] text-text-mid mt-0.5">Dasar: {item.legalBasis}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-text-hi">{item.areaLocation}</div>
                      <div className="text-[10px] text-text-low">PIC: {item.pic}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="font-mono font-bold text-text-hi tabular-nums">
                        {item.realizedAreaHa} / {item.approvedAreaHa} Ha ({item.progressPct}%)
                      </div>
                      <div className="w-28 mx-auto h-1.5 bg-bg-2 border border-border-subtle rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-green rounded-full" style={{ width: `${Math.min(100, item.progressPct)}%` }} />
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-3.5 text-center pr-5">
                      <div className="flex items-center justify-center gap-1">
                        {item.documentUrl && (
                          <a href={item.documentUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-text-mid hover:text-neon-green hover:bg-neon-green/10 rounded-lg transition-colors" title="Buka SK">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {canEdit && (
                          <button type="button" onClick={() => openEdit(item)} className="p-1.5 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg cursor-pointer transition-colors" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" onClick={() => setDeleteTarget(item)} className="p-1.5 text-neon-red hover:bg-neon-red/10 rounded-lg cursor-pointer transition-colors" title="Hapus">
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

      {/* Add/Edit Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-0/75 backdrop-blur-md">
            <div className="glass-panel rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
              <div className="px-6 py-4 border-b border-border-neon flex items-center justify-between bg-bg-2/70">
                <h3 className="text-sm font-bold font-heading text-text-hi">{editingId ? 'Edit Kewajiban Kehutanan' : 'Tambah SK Kehutanan (Kementerian Kehutanan)'}</h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-1.5 text-text-low hover:text-text-hi cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Jenis Kewajiban *</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="PPKH">PPKH (Persetujuan Penggunaan Kawasan Hutan)</option>
                      <option value="Rehabilitasi DAS">Rehabilitasi DAS</option>
                      <option value="Kompensasi Lahan / Lainnya">Kompensasi Lahan / Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Nomor SK Kementerian Kehutanan *</label>
                    <input type="text" required value={decreeNumber} onChange={(e) => setDecreeNumber(e.target.value)} placeholder="SK.XXX/MENHUT/..." className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Judul / Perihal SK *</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Lokasi / Wilayah DAS *</label>
                    <input type="text" required value={areaLocation} onChange={(e) => setAreaLocation(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Dasar Hukum (Diisi Sesuai SK) *</label>
                    <input type="text" required value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} placeholder="Sesuai diktum / peraturan pada SK" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Luas Target / Izin (Ha) *</label>
                    <input type="number" step="0.01" min={0} required value={approvedAreaHa} onChange={(e) => setApprovedAreaHa(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Luas Realisasi (Ha) *</label>
                    <input type="number" step="0.01" min={0} required value={realizedAreaHa} onChange={(e) => setRealizedAreaHa(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Tanggal Terbit *</label>
                    <input type="date" required value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Masa Berlaku (YYYY-MM-DD / N/A) *</label>
                    <input type="text" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Ringkasan Kewajiban *</label>
                    <textarea rows={2} required value={obligationSummary} onChange={(e) => setObligationSummary(e.target.value)} className="w-full px-3 py-2 text-xs resize-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Status *</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Aktif">Aktif</option>
                      <option value="Dalam Pelaksanaan">Dalam Pelaksanaan</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">PIC *</label>
                    <input type="text" required value={pic} onChange={(e) => setPic(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Tautan Dokumen SK (Opsional)</label>
                    <input type="url" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-text-mid hover:text-text-hi cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 neon-btn-primary text-xs rounded-xl cursor-pointer">
                    {isSaving ? 'Menyimpan...' : 'Simpan Kewajiban'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-0/75 backdrop-blur-md">
            <div className="glass-panel rounded-2xl p-6 max-w-md w-full space-y-4">
              <h4 className="text-sm font-bold font-heading text-text-hi">Hapus Data Kewajiban Kehutanan?</h4>
              <p className="text-xs text-text-mid">SK <strong className="text-text-hi font-mono">{deleteTarget.decreeNumber}</strong> ({deleteTarget.title}) akan dihapus dari register.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-xs text-text-mid hover:text-text-hi cursor-pointer">Batal</button>
                <button type="button" disabled={isSaving} onClick={handleDelete} className="px-4 py-2 neon-btn-danger text-xs rounded-xl cursor-pointer">
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
