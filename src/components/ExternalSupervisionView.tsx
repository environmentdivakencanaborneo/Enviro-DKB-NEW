/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import {
  AdministrativeSanctionType,
  CapaData,
  ExternalSupervisionData,
  SupervisionAgency,
} from '../types';
import { capaService, externalSupervisionService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import { triggerToast } from '../utils/errorHandler';
import {
  ClipboardCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Link2,
  AlertOctagon,
  ExternalLink,
  X,
} from 'lucide-react';

interface ExternalSupervisionViewProps {
  data: ExternalSupervisionData[];
  capaFindings: CapaData[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  userEmail?: string;
  onOpenFindings?: () => void;
  onUnauthorizedAction: (action: string) => void;
}

const AGENCIES: SupervisionAgency[] = [
  'DLH Provinsi/Kab',
  'KLH/BPLH',
  'Inspektur Tambang ESDM',
  'Kementerian Kehutanan',
];

const SANCTIONS: AdministrativeSanctionType[] = [
  'Tidak Ada',
  'Teguran Tertulis',
  'Paksaan Pemerintah',
  'Pembekuan Izin',
  'Pencabutan Izin',
];

export default function ExternalSupervisionView({
  data,
  capaFindings,
  isLoading,
  canEdit,
  canDelete,
  userEmail,
  onOpenFindings,
  onUnauthorizedAction,
}: ExternalSupervisionViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExternalSupervisionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [inspectionDate, setInspectionDate] = useState(todayLocalISO());
  const [agency, setAgency] = useState<SupervisionAgency>('DLH Provinsi/Kab');
  const [officialDocNo, setOfficialDocNo] = useState('');
  const [inspectionScope, setInspectionScope] = useState('');
  const [findingsSummary, setFindingsSummary] = useState('');
  const [sanctionCategory, setSanctionCategory] = useState<AdministrativeSanctionType>('Tidak Ada');
  const [followUpDeadline, setFollowUpDeadline] = useState(todayLocalISO(Date.now() + 30 * 86400000));
  const [resolutionStatus, setResolutionStatus] = useState<ExternalSupervisionData['resolutionStatus']>('Terbuka');
  const [linkedCapaId, setLinkedCapaId] = useState('');
  const [pic, setPic] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');

  const capaById = useMemo(() => {
    const map = new Map<string, CapaData>();
    capaFindings.forEach((c) => map.set(c.id, c));
    return map;
  }, [capaFindings]);

  const resetForm = () => {
    setEditingId(null);
    setInspectionDate(todayLocalISO());
    setAgency('DLH Provinsi/Kab');
    setOfficialDocNo('');
    setInspectionScope('');
    setFindingsSummary('');
    setSanctionCategory('Tidak Ada');
    setFollowUpDeadline(todayLocalISO(Date.now() + 30 * 86400000));
    setResolutionStatus('Terbuka');
    setLinkedCapaId('');
    setPic('');
    setEvidenceUrl('');
    setNotes('');
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Pengawasan Eksternal');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: ExternalSupervisionData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Pengawasan Eksternal');
    setEditingId(item.id);
    setInspectionDate(item.inspectionDate);
    setAgency(item.agency);
    setOfficialDocNo(item.officialDocNo);
    setInspectionScope(item.inspectionScope);
    setFindingsSummary(item.findingsSummary);
    setSanctionCategory(item.sanctionCategory);
    setFollowUpDeadline(item.followUpDeadline);
    setResolutionStatus(item.resolutionStatus);
    setLinkedCapaId(item.linkedCapaId || '');
    setPic(item.pic);
    setEvidenceUrl(item.evidenceUrl || '');
    setNotes(item.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Catatan Pengawasan Eksternal');
    try {
      setIsSaving(true);
      const payload: Omit<ExternalSupervisionData, 'id'> = {
        inspectionDate,
        agency,
        officialDocNo: officialDocNo.trim(),
        inspectionScope: inspectionScope.trim(),
        findingsSummary: findingsSummary.trim(),
        sanctionCategory,
        followUpDeadline,
        resolutionStatus,
        linkedCapaId: linkedCapaId.trim() || undefined,
        pic: pic.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await externalSupervisionService.update(editingId, payload);
        triggerToast('Catatan pengawasan eksternal berhasil diperbarui.', 'success');
      } else {
        await externalSupervisionService.add(payload);
        triggerToast('Catatan pengawasan eksternal berhasil disimpan.', 'success');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menyimpan catatan pengawasan eksternal.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLinkedCapa = async (item: ExternalSupervisionData) => {
    if (!canEdit) return onUnauthorizedAction('Buat CAPA dari Pengawasan Eksternal');
    if (item.linkedCapaId) {
      onOpenFindings?.();
      return;
    }
    try {
      setIsSaving(true);
      const createdCapaId = await capaService.add({
        source: 'Pengawasan Eksternal',
        title: `[${item.agency}] ${item.officialDocNo} — ${item.inspectionScope}`.slice(0, 200),
        description: `${item.findingsSummary}\nKategori Sanksi: ${item.sanctionCategory}`,
        severity: item.sanctionCategory === 'Tidak Ada' ? 'Observasi' : 'NC Mayor',
        discoveryDate: item.inspectionDate,
        targetDate: item.followUpDeadline,
        pic: item.pic,
        correctiveAction: 'Tindak lanjut sesuai Berita Acara Pengawasan Eksternal',
        preventiveAction: 'Evaluasi kepatuhan berkala internal',
        status: 'Terbuka',
        history: [
          {
            status: 'Terbuka',
            notes: `Dibuat otomatis dari pengawasan ${item.agency} (${item.officialDocNo})`,
            updatedAt: new Date().toISOString(),
            updatedBy: userEmail || 'system',
          },
        ],
        createdBy: userEmail || 'system',
      });
      await externalSupervisionService.update(item.id, { linkedCapaId: createdCapaId });
      triggerToast(`CAPA ${createdCapaId} berhasil dibuat dan ditautkan.`, 'success');
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal membuat CAPA terkait.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDelete) return onUnauthorizedAction('Hapus Pengawasan Eksternal');
    try {
      setIsSaving(true);
      await externalSupervisionService.delete(deleteTarget.id);
      triggerToast('Catatan pengawasan eksternal dihapus.', 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menghapus catatan pengawasan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return data.filter((d) => {
      const matchQuery =
        d.officialDocNo.toLowerCase().includes(q) ||
        d.inspectionScope.toLowerCase().includes(q) ||
        d.findingsSummary.toLowerCase().includes(q) ||
        d.pic.toLowerCase().includes(q);
      const matchAgency = agencyFilter === 'ALL' || d.agency === agencyFilter;
      const matchStatus = statusFilter === 'ALL' || d.resolutionStatus === statusFilter;
      return matchQuery && matchAgency && matchStatus;
    });
  }, [data, searchQuery, agencyFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = data.length;
    const withSanction = data.filter((d) => d.sanctionCategory !== 'Tidak Ada').length;
    const openCount = data.filter((d) => d.resolutionStatus !== 'Selesai Diverifikasi').length;
    const linkedCapa = data.filter((d) => Boolean(d.linkedCapaId)).length;
    return { total, withSanction, openCount, linkedCapa };
  }, [data]);

  const handleExport = () => {
    exportToExcel(
      filteredData.map((d) => ({
        ID: d.id,
        'Tanggal Kunjungan': d.inspectionDate,
        Instansi: d.agency,
        'Nomor BA / Surat': d.officialDocNo,
        'Ruang Lingkup': d.inspectionScope,
        'Ringkasan Temuan': d.findingsSummary,
        'Kategori Sanksi': d.sanctionCategory,
        'Tenggat Tindak Lanjut': d.followUpDeadline,
        'Status Penyelesaian': d.resolutionStatus,
        'ID CAPA Terkait': d.linkedCapaId || '-',
        PIC: d.pic,
      })),
      'Pengawasan_Eksternal_Sanksi'
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Pengawasan Eksternal &amp; Sanksi Administratif (Permen LH/BPLH No. 6 Tahun 2026)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan inspeksi DLH Provinsi/Kab, KLH/BPLH, Inspektur Tambang ESDM &amp; Kementerian Kehutanan serta tautan langsung ke modul CAPA.
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
            Catat Pengawasan
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Pengawasan</span>
          <p className="text-2xl font-bold text-slate-800 mt-1 font-mono tabular-nums">{kpis.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dengan Sanksi Admin.</span>
          <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${kpis.withSanction > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {kpis.withSanction}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Belum Selesai</span>
          <p className={`text-2xl font-bold mt-1 font-mono tabular-nums ${kpis.openCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
            {kpis.openCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tertaut ke CAPA</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">{kpis.linkedCapa}</p>
        </div>
      </div>

      {/* Filter & Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor berita acara, ringkasan temuan, PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={agencyFilter} onChange={(e) => setAgencyFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none">
              <option value="ALL">Semua Instansi Pengawas</option>
              {AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 outline-none">
              <option value="ALL">Semua Status</option>
              <option value="Terbuka">Terbuka</option>
              <option value="Dalam Tindak Lanjut">Dalam Tindak Lanjut</option>
              <option value="Selesai Diverifikasi">Selesai Diverifikasi</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-5">Tgl &amp; Instansi</th>
                <th className="p-3.5">Berita Acara &amp; Ruang Lingkup</th>
                <th className="p-3.5">Temuan &amp; Sanksi</th>
                <th className="p-3.5 text-center">Tenggat</th>
                <th className="p-3.5">Tautan CAPA</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center pr-5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Memuat data pengawasan eksternal...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-500">Belum ada catatan pengawasan eksternal.</td></tr>
              ) : (
                filteredData.map((item) => {
                  const linkedCapa = item.linkedCapaId ? capaById.get(item.linkedCapaId) : undefined;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-mono font-bold text-slate-800">{item.inspectionDate}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {item.agency}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="font-mono font-bold text-slate-800">{item.officialDocNo}</div>
                        <div className="text-slate-600 mt-0.5">{item.inspectionScope}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">PIC: {item.pic}</div>
                      </td>
                      <td className="p-3.5 max-w-sm">
                        <div className="text-slate-700 line-clamp-2">{item.findingsSummary}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.sanctionCategory === 'Tidak Ada'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.sanctionCategory === 'Teguran Tertulis'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          Sanksi: {item.sanctionCategory}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-semibold text-slate-700">
                        {item.followUpDeadline}
                      </td>
                      <td className="p-3.5">
                        {item.linkedCapaId ? (
                          <button
                            type="button"
                            onClick={() => onOpenFindings?.()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold cursor-pointer"
                          >
                            <Link2 className="w-3 h-3" />
                            {linkedCapa ? `${linkedCapa.status} (${item.linkedCapaId.slice(0, 8)})` : item.linkedCapaId.slice(0, 12)}
                          </button>
                        ) : canEdit ? (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleCreateLinkedCapa(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold cursor-pointer"
                          >
                            <AlertOctagon className="w-3 h-3" />
                            Buat CAPA
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Belum ada CAPA</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          item.resolutionStatus === 'Selesai Diverifikasi'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.resolutionStatus === 'Dalam Tindak Lanjut'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {item.resolutionStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          {item.evidenceUrl && (
                            <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg" title="Buka Bukti">
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
                  {editingId ? 'Edit Catatan Pengawasan Eksternal' : 'Catat Pengawasan Eksternal & Sanksi'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tanggal Kunjungan *</label>
                    <input type="date" required value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Instansi Pengawas *</label>
                    <select value={agency} onChange={(e) => setAgency(e.target.value as SupervisionAgency)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                      {AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nomor Berita Acara / Surat *</label>
                    <input type="text" required value={officialDocNo} onChange={(e) => setOfficialDocNo(e.target.value)} placeholder="BA-660/DLH/2026" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ruang Lingkup Pengawasan *</label>
                    <input type="text" required value={inspectionScope} onChange={(e) => setInspectionScope(e.target.value)} placeholder="Kepatuhan KPL, TPS LB3 & Dokling" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Ringkasan Temuan *</label>
                    <textarea required rows={3} value={findingsSummary} onChange={(e) => setFindingsSummary(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Kategori Sanksi Administratif *</label>
                    <select value={sanctionCategory} onChange={(e) => setSanctionCategory(e.target.value as AdministrativeSanctionType)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                      {SANCTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tenggat Tindak Lanjut *</label>
                    <input type="date" required value={followUpDeadline} onChange={(e) => setFollowUpDeadline(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status Penyelesaian *</label>
                    <select value={resolutionStatus} onChange={(e) => setResolutionStatus(e.target.value as ExternalSupervisionData['resolutionStatus'])} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                      <option value="Terbuka">Terbuka</option>
                      <option value="Dalam Tindak Lanjut">Dalam Tindak Lanjut</option>
                      <option value="Selesai Diverifikasi">Selesai Diverifikasi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Tautkan CAPA Eksisting (Opsional)</label>
                    <select value={linkedCapaId} onChange={(e) => setLinkedCapaId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white">
                      <option value="">-- Belum ditautkan --</option>
                      {capaFindings.map((c) => (
                        <option key={c.id} value={c.id}>{c.title.slice(0, 50)} ({c.status})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">PIC Tindak Lanjut *</label>
                    <input type="text" required value={pic} onChange={(e) => setPic(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">URL Dokumen / Bukti (Opsional)</label>
                    <input type="url" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Catatan (Opsional)</label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-slate-600 cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#4D7C5A] hover:bg-[#3e6449] text-white font-bold text-xs rounded-xl cursor-pointer">
                    {isSaving ? 'Menyimpan...' : 'Simpan Catatan'}
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
              <h4 className="text-sm font-bold text-slate-800">Hapus Catatan Pengawasan?</h4>
              <p className="text-xs text-slate-600">
                Berita Acara <strong>{deleteTarget.officialDocNo}</strong> ({deleteTarget.agency}) akan dihapus dari sistem.
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
