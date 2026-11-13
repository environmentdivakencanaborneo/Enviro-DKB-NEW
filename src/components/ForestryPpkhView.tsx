/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
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
  CheckCircle2,
  Clock,
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
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <TreePine className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Kewajiban Kehutanan — PPKH &amp; Rehabilitasi DAS (Kementerian Kehutanan)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pelacakan SK Persetujuan Penggunaan Kawasan Hutan (PPKH) dan Rehabilitasi DAS. Dasar hukum diisikan sesuai SK yang berlaku.
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
            Tambah SK Kehutanan
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total SK / Register</span>
          <p className="text-2xl font-bold text-slate-800 mt-1 font-mono tabular-nums">{kpis.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Luas (Ha)</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">{kpis.totalApprovedHa.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Realisasi Luas (Ha)</span>
          <p className="text-2xl font-bold text-teal-700 mt-1 font-mono tabular-nums">{kpis.totalRealizedHa.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Progres Keseluruhan</span>
          <p className="text-2xl font-bold text-slate-800 mt-1 font-mono tabular-nums">{kpis.avgProgress}%</p>
        </div>
      </div>

      {/* Filter & Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor SK, lokasi/DAS, dasar hukum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs">
              <option value="ALL">Semua Jenis</option>
              <option value="PPKH">PPKH</option>
              <option value="Rehabilitasi DAS">Rehabilitasi DAS</option>
              <option value="Kompensasi Lahan / Lainnya">Kompensasi Lahan / Lainnya</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs">
              <option value="ALL">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Dalam Pelaksanaan">Dalam Pelaksanaan</option>
              <option value="Selesai">Selesai</option>
              <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-5">Jenis &amp; Nomor SK</th>
                <th className="p-3.5">Perihal &amp; Dasar Hukum</th>
                <th className="p-3.5">Lokasi / DAS</th>
                <th className="p-3.5 text-center">Progres Luas (Ha)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Memuat data kewajiban kehutanan...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-slate-500">Belum ada data PPKH / Rehabilitasi DAS tercatat.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 pl-5">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
                        {item.docType}
                      </span>
                      <div className="font-mono font-bold text-slate-800">{item.decreeNumber}</div>
                      <div className="text-[10px] text-slate-400">{item.authorityLabel}</div>
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-slate-800">{item.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Dasar: {item.legalBasis}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-700">{item.areaLocation}</div>
                      <div className="text-[10px] text-slate-400">PIC: {item.pic}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="font-mono font-bold text-slate-800">
                        {item.realizedAreaHa} / {item.approvedAreaHa} Ha ({item.progressPct}%)
                      </div>
                      <div className="w-28 mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-[#4D7C5A] rounded-full" style={{ width: `${Math.min(100, item.progressPct)}%` }} />
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        item.status === 'Selesai' || item.status === 'Aktif'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'Perlu Tindak Lanjut'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {item.status === 'Selesai' || item.status === 'Aktif' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center pr-5">
                      <div className="flex items-center justify-center gap-1">
                        {item.documentUrl && (
                          <a href={item.documentUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg" title="Buka SK">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Kewajiban Kehutanan' : 'Tambah SK Kehutanan (Kementerian Kehutanan)'}</h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jenis Kewajiban *</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                      <option value="PPKH">PPKH (Persetujuan Penggunaan Kawasan Hutan)</option>
                      <option value="Rehabilitasi DAS">Rehabilitasi DAS</option>
                      <option value="Kompensasi Lahan / Lainnya">Kompensasi Lahan / Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor SK Kementerian Kehutanan *</label>
                    <input type="text" required value={decreeNumber} onChange={(e) => setDecreeNumber(e.target.value)} placeholder="SK.XXX/MENHUT/..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Judul / Perihal SK *</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Lokasi / Wilayah DAS *</label>
                    <input type="text" required value={areaLocation} onChange={(e) => setAreaLocation(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Dasar Hukum (Diisi Sesuai SK) *</label>
                    <input type="text" required value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} placeholder="Sesuai diktum / peraturan pada SK" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Luas Target / Izin (Ha) *</label>
                    <input type="number" step="0.01" min={0} required value={approvedAreaHa} onChange={(e) => setApprovedAreaHa(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Luas Realisasi (Ha) *</label>
                    <input type="number" step="0.01" min={0} required value={realizedAreaHa} onChange={(e) => setRealizedAreaHa(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal Terbit *</label>
                    <input type="date" required value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Masa Berlaku (YYYY-MM-DD / N/A) *</label>
                    <input type="text" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ringkasan Kewajiban *</label>
                    <textarea rows={2} required value={obligationSummary} onChange={(e) => setObligationSummary(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status *</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                      <option value="Aktif">Aktif</option>
                      <option value="Dalam Pelaksanaan">Dalam Pelaksanaan</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">PIC *</label>
                    <input type="text" required value={pic} onChange={(e) => setPic(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tautan Dokumen SK (Opsional)</label>
                    <input type="url" value={documentUrl} onChange={(e) => setDocumentUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-slate-600 cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#4D7C5A] hover:bg-[#3e6449] text-white font-bold text-xs rounded-xl cursor-pointer">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
              <h4 className="text-sm font-bold text-slate-800">Hapus Data Kewajiban Kehutanan?</h4>
              <p className="text-xs text-slate-600">SK <strong>{deleteTarget.decreeNumber}</strong> ({deleteTarget.title}) akan dihapus dari register.</p>
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
