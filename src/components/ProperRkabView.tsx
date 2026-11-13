/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import { ProperCriteriaItem, ProperCriteriaMaster, ProperRkabData } from '../types';
import { properCriteriaService, properRkabService } from '../services/dbService';
import { DEFAULT_PROPER_CRITERIA } from '../data/regulations';
import { exportToExcel } from '../services/exportService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import {
  Award,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sliders,
  X
} from 'lucide-react';

interface ProperRkabViewProps {
  data: ProperRkabData[];
  properCriteria?: ProperCriteriaMaster;
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageCriteria?: boolean;
  onUnauthorizedAction: (action: string) => void;
}

const isAnnualRkabPeriod = (period?: string): boolean => {
  const p = (period || '').trim().toLowerCase();
  return p === 'tahunan' || p === '1 tahun' || p.includes('tahunan (1 tahun');
};

export default function ProperRkabView({
  data,
  properCriteria = DEFAULT_PROPER_CRITERIA,
  isLoading,
  canEdit,
  canDelete,
  canManageCriteria = false,
  onUnauthorizedAction
}: ProperRkabViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PROPER' | 'RKAB'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProperRkabData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Master Kriteria PROPER Drawer/Modal (Superintendent+)
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [draftCriteria, setDraftCriteria] = useState<ProperCriteriaItem[]>([]);
  const [newAspek, setNewAspek] = useState('');
  const [newIndikator, setNewIndikator] = useState('');
  const [newBobot, setNewBobot] = useState<number>(0);
  const [newCatatan, setNewCatatan] = useState('');
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [criteriaMsg, setCriteriaMsg] = useState<string | null>(null);

  const [year, setYear] = useState<number>(2026);
  const [period, setPeriod] = useState('Semester I');
  const [recordType, setRecordType] = useState<'PROPER' | 'RKAB'>('PROPER');
  const [category, setCategory] = useState('Pengendalian Pencemaran Air');
  const [indicatorName, setIndicatorName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [realizedValue, setRealizedValue] = useState('');
  const [scoreWeight, setScoreWeight] = useState<number>(20);
  const [selfScore, setSelfScore] = useState<number>(0);
  const [targetProperRating, setTargetProperRating] = useState<ProperRkabData['targetProperRating']>('Biru');
  const [actualProperRating, setActualProperRating] = useState<NonNullable<ProperRkabData['actualProperRating']> | ''>('');
  const [status, setStatus] = useState<ProperRkabData['status']>('Proses Pemenuhan');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [pic, setPic] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setYear(2026);
    setPeriod('Semester I');
    setRecordType('PROPER');
    setCategory('Pengendalian Pencemaran Air');
    setIndicatorName('');
    setTargetValue('');
    setRealizedValue('');
    setScoreWeight(20);
    setSelfScore(0);
    setTargetProperRating('Biru');
    setActualProperRating('');
    setStatus('Proses Pemenuhan');
    setEvidenceUrl('');
    setPic('');
    setNotes('');
    setErrorMsg(null);
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Indikator PROPER / RKAB');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: ProperRkabData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Indikator PROPER / RKAB');
    setEditingId(item.id);
    setYear(item.year);
    setPeriod(item.period);
    setRecordType(item.recordType);
    setCategory(item.category);
    setIndicatorName(item.indicatorName);
    setTargetValue(item.targetValue);
    setRealizedValue(item.realizedValue);
    setScoreWeight(item.scoreWeight);
    setSelfScore(item.selfScore);
    setTargetProperRating(item.targetProperRating);
    setActualProperRating(item.actualProperRating || '');
    setStatus(item.status);
    setEvidenceUrl(item.evidenceUrl || '');
    setPic(item.pic);
    setNotes(item.notes || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleRecordTypeChange = (nextType: 'PROPER' | 'RKAB') => {
    setRecordType(nextType);
    if (nextType === 'RKAB' && !editingId) {
      setPeriod('Tahunan (1 Tahun - Minerba One)');
    } else if (nextType === 'PROPER' && !editingId && isAnnualRkabPeriod(period)) {
      setPeriod('Semester I');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Indikator PROPER / RKAB');
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload: Omit<ProperRkabData, 'id'> = {
        year: Number(year),
        period: period.trim(),
        recordType,
        category: category.trim(),
        indicatorName: indicatorName.trim(),
        targetValue: targetValue.trim(),
        realizedValue: realizedValue.trim(),
        scoreWeight: Number(scoreWeight),
        selfScore: Number(selfScore),
        targetProperRating,
        actualProperRating: recordType === 'PROPER' && actualProperRating ? actualProperRating : undefined,
        status,
        evidenceUrl: evidenceUrl.trim() || undefined,
        pic: pic.trim(),
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await properRkabService.update(editingId, payload);
      } else {
        await properRkabService.add(payload);
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan data PROPER & RKAB.');
    } finally {
      setIsSaving(false);
    }
  };

  const openCriteriaDrawer = () => {
    setDraftCriteria([...(properCriteria?.criteria || [])]);
    setNewAspek('');
    setNewIndikator('');
    setNewBobot(0);
    setNewCatatan('');
    setCriteriaMsg(null);
    setShowCriteriaModal(true);
  };

  const handleAddCriteriaItem = () => {
    if (!newAspek.trim() || !newIndikator.trim()) return;
    setDraftCriteria((prev) => [
      ...prev,
      {
        id: `PRC-${Date.now()}-${prev.length + 1}`,
        aspek: newAspek.trim(),
        indikator: newIndikator.trim(),
        bobot: Number(newBobot) || 0,
        catatan: newCatatan.trim() || undefined,
      },
    ]);
    setNewAspek('');
    setNewIndikator('');
    setNewBobot(0);
    setNewCatatan('');
  };

  const handleSaveCriteria = async () => {
    if (!canManageCriteria) return onUnauthorizedAction('Kelola Master Kriteria PROPER');
    setIsSavingCriteria(true);
    setCriteriaMsg(null);
    try {
      await properCriteriaService.save({
        regulationBasis: 'Permen LH/BPLH No. 7 Tahun 2025 tentang Program Penilaian Peringkat Kinerja Pengelolaan Lingkungan Hidup',
        criteria: draftCriteria,
      });
      setCriteriaMsg('Master kriteria PROPER berhasil disimpan.');
    } catch (err: any) {
      setCriteriaMsg(err?.message || 'Gagal menyimpan master kriteria PROPER.');
    } finally {
      setIsSavingCriteria(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const matchQuery =
        d.indicatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.pic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === 'ALL' || d.recordType === typeFilter;
      return matchQuery && matchType;
    });
  }, [data, searchQuery, typeFilter]);

  const kpis = useMemo(() => {
    const total = data.length;
    const met = data.filter((d) => d.status === 'Terpenuhi').length;
    const gaps = data.filter((d) => d.status === 'Gap Terdeteksi').length;
    const totalWeight = data.reduce((s, d) => s + d.scoreWeight, 0);
    const totalSelf = data.reduce((s, d) => s + d.selfScore, 0);
    const scorePct = totalWeight > 0 ? Math.round((totalSelf / totalWeight) * 100) : 0;
    const latestActual = data.find((d) => d.recordType === 'PROPER' && d.actualProperRating)?.actualProperRating || 'Belum ditetapkan';
    return { total, met, gaps, scorePct, latestActual };
  }, [data]);

  const chartData = useMemo(() => {
    const catMap: Record<string, { category: string; Bobot: number; Skor: number }> = {};
    filteredData.forEach((d) => {
      if (!catMap[d.category]) {
        catMap[d.category] = { category: d.category.slice(0, 18), Bobot: 0, Skor: 0 };
      }
      catMap[d.category].Bobot += d.scoreWeight;
      catMap[d.category].Skor += d.selfScore;
    });
    return Object.values(catMap);
  }, [filteredData]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E4EDE6] shadow-sm">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#4D7C5A]">
            Permen LH/BPLH No. 7 Tahun 2025 (PROPER) &amp; Permen ESDM No. 17 Tahun 2025 jo. 6/2026 (RKAB)
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <Award className="h-6 w-6 text-[#2E4B3D]" />
            Evaluasi Kinerja PROPER &amp; Pelaporan RKAB Lingkungan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pemantauan target &amp; peringkat PROPER KLH/BPLH (Emas/Hijau/Biru/Merah/Hitam) serta pelacakan capaian lingkungan RKAB tahunan ESDM (Minerba One).
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {canManageCriteria && (
            <button
              onClick={openCriteriaDrawer}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold cursor-pointer"
            >
              <Sliders className="h-4 w-4" />
              Master Kriteria PROPER ({properCriteria?.criteria?.length || 0})
            </button>
          )}
          <button
            onClick={() =>
              exportToExcel(
                filteredData.map((d) => ({
                  Tahun: d.year,
                  Periode: d.period,
                  Jenis: d.recordType,
                  Kategori: d.category,
                  Indikator: d.indicatorName,
                  Target: d.targetValue,
                  Realisasi: d.realizedValue,
                  Bobot: d.scoreWeight,
                  'Skor Mandiri': d.selfScore,
                  'Target PROPER': d.targetProperRating,
                  'Peringkat Aktual PROPER': d.actualProperRating || '-',
                  Status: d.status,
                  PIC: d.pic,
                })),
                'DEM_PROPER_RKAB'
              )
            }
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Ekspor Excel
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#2E4B3D] hover:bg-[#233A2F] text-white text-xs font-bold shadow-md cursor-pointer">
            <Plus className="h-4 w-4" />
            Tambah Indikator
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase">Peringkat Aktual / Skor Mandiri</span>
          <p className="text-xl font-black text-[#2E4B3D] mt-2">{kpis.latestActual}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Capaian bobot: {kpis.scorePct}% (evaluasi sesuai Master Kriteria PROPER)
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Indikator Terpenuhi</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{kpis.met} / {kpis.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">Target PROPER &amp; RKAB tercapai</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Gap Terdeteksi</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{kpis.gaps}</p>
          <p className="text-[11px] text-slate-500 mt-1">Kriteria butuh tindakan korektif segera</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase">Total Kriteria Dipantau</span>
          <p className="text-2xl font-black text-slate-800 mt-2">{kpis.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">Gabungan PROPER KLH/BPLH &amp; RKAB ESDM</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Perbandingan Bobot Maksimal vs Skor Mandiri per Aspek
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="category" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Bobot" name="Bobot Target" fill="#CBD5E1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Skor" name="Skor Mandiri" fill="#2E4B3D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari indikator, aspek, atau PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
          >
            <option value="ALL">Semua Jenis (PROPER &amp; RKAB)</option>
            <option value="PROPER">PROPER KLH/BPLH</option>
            <option value="RKAB">RKAB ESDM</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                <th className="p-3">Periode &amp; Jenis</th>
                <th className="p-3">Kategori &amp; Indikator</th>
                <th className="p-3">Target vs Realisasi</th>
                <th className="p-3 text-center">Skor / Bobot</th>
                <th className="p-3 text-center">Rating (Target / Aktual)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Memuat data PROPER &amp; RKAB...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400">Belum ada data indikator PROPER &amp; RKAB.</td></tr>
              ) : (
                filteredData.map((item) => {
                  const isLegacyRkab = item.recordType === 'RKAB' && !isAnnualRkabPeriod(item.period);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-800 block">{item.year} • {item.period}</span>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">{item.recordType}</span>
                          {isLegacyRkab && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-sans font-semibold">
                              Periode lama (Permen ESDM 10/2023)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-[10px] font-bold uppercase text-[#4D7C5A]">{item.category}</p>
                        <p className="font-bold text-slate-800">{item.indicatorName}</p>
                        <p className="text-[10px] text-slate-500">PIC: {item.pic}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-slate-500">Target: <span className="font-semibold text-slate-700">{item.targetValue}</span></p>
                        <p className="text-emerald-700">Realisasi: <span className="font-bold">{item.realizedValue}</span></p>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">{item.selfScore} / {item.scoreWeight}</td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.targetProperRating === 'Emas' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                            item.targetProperRating === 'Hijau' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            item.targetProperRating === 'Biru' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            Target: {item.targetProperRating}
                          </span>
                          {item.actualProperRating && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.actualProperRating === 'Hitam' ? 'bg-slate-900 text-white border-slate-900' :
                              item.actualProperRating === 'Emas' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              item.actualProperRating === 'Hijau' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              item.actualProperRating === 'Biru' ? 'bg-sky-100 text-sky-800 border-sky-300' :
                              'bg-rose-100 text-rose-800 border-rose-300'
                            }`}>
                              Aktual: {item.actualProperRating}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'Terpenuhi' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          item.status === 'Proses Pemenuhan' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.evidenceUrl && (
                            <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg" title="Buka Evidence">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                          <button
                            onClick={() => {
                              if (!canDelete) return onUnauthorizedAction('Hapus Indikator PROPER / RKAB');
                              setDeleteTarget(item);
                            }}
                            className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Modal Add/Edit Indikator */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#2E4B3D]">
                  {editingId ? 'Edit Indikator PROPER & RKAB' : 'Tambah Indikator Kinerja PROPER / RKAB'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              {errorMsg && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{errorMsg}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tahun</label>
                    <input type="number" required value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jenis</label>
                    <select value={recordType} onChange={(e) => handleRecordTypeChange(e.target.value as any)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                      <option value="PROPER">PROPER</option>
                      <option value="RKAB">RKAB</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Periode</label>
                    {recordType === 'RKAB' ? (
                      <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                        <option value="Tahunan (1 Tahun - Minerba One)">Tahunan (1 Tahun - Minerba One)</option>
                        <option value="Tahunan">Tahunan</option>
                        {editingId && !isAnnualRkabPeriod(period) && (
                          <option value={period}>{period} (Periode lama)</option>
                        )}
                      </select>
                    ) : (
                      <input type="text" required value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Target Rating</label>
                    <select value={targetProperRating} onChange={(e) => setTargetProperRating(e.target.value as any)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                      <option value="Biru">Biru</option>
                      <option value="Hijau">Hijau</option>
                      <option value="Emas">Emas</option>
                      <option value="Merah">Merah</option>
                    </select>
                  </div>
                </div>
                {recordType === 'PROPER' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Peringkat Aktual PROPER (Opsional — Permen LH/BPLH 7/2025)</label>
                    <select value={actualProperRating} onChange={(e) => setActualProperRating(e.target.value as any)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                      <option value="">— Belum ada peringkat resmi —</option>
                      <option value="Emas">Emas</option>
                      <option value="Hijau">Hijau</option>
                      <option value="Biru">Biru</option>
                      <option value="Merah">Merah</option>
                      <option value="Hitam">Hitam</option>
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kategori Kriteria</label>
                    {properCriteria?.criteria && properCriteria.criteria.length > 0 ? (
                      <input
                        list="proper-criteria-aspek-list"
                        type="text"
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
                      />
                    ) : (
                      <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                    )}
                    <datalist id="proper-criteria-aspek-list">
                      {Array.from(new Set((properCriteria?.criteria || []).map(c => c.aspek))).map(a => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Indikator</label>
                    <input type="text" required value={indicatorName} onChange={(e) => setIndicatorName(e.target.value)} placeholder="cth. Ketaatan 100% SIMPEL Air Limbah" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Target Kuantitatif / Kualitatif</label>
                    <input type="text" required value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Realisasi Saat Ini</label>
                    <input type="text" required value={realizedValue} onChange={(e) => setRealizedValue(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bobot Maks (0-100)</label>
                    <input type="number" min="0" max="100" required value={scoreWeight} onChange={(e) => setScoreWeight(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Skor Mandiri (0-100)</label>
                    <input type="number" min="0" max="100" required value={selfScore} onChange={(e) => setSelfScore(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                      <option value="Terpenuhi">Terpenuhi</option>
                      <option value="Proses Pemenuhan">Proses Pemenuhan</option>
                      <option value="Gap Terdeteksi">Gap Terdeteksi</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">PIC</label>
                    <input type="text" required value={pic} onChange={(e) => setPic(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">URL Bukti / Dokumen (Opsional)</label>
                    <input type="text" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Catatan</label>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl bg-[#2E4B3D] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                    {isSaving ? 'Menyimpan...' : 'Simpan Indikator'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Master Kriteria PROPER (Superintendent+) */}
      {showCriteriaModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#2E4B3D]">
                    Master Kriteria &amp; Bobot PROPER (Diisi Superintendent)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mengacu Permen LH/BPLH No. 7 Tahun 2025. Bobot dan kriteria diisi resmi oleh Environment Superintendent sesuai pedoman penilaian berlaku.
                  </p>
                </div>
                <button onClick={() => setShowCriteriaModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>

              {criteriaMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">{criteriaMsg}</div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-slate-700 uppercase">Tambah Kriteria Master</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" placeholder="Aspek (cth: Pengendalian Air)" value={newAspek} onChange={e => setNewAspek(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                  <input type="text" placeholder="Indikator Penilaian" value={newIndikator} onChange={e => setNewIndikator(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                  <input type="number" min="0" max="100" placeholder="Bobot (%)" value={newBobot} onChange={e => setNewBobot(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono bg-white" />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Catatan/rujukan pasal (opsional)" value={newCatatan} onChange={e => setNewCatatan(e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white" />
                  <button type="button" onClick={handleAddCriteriaItem} className="px-3 py-1.5 rounded-lg bg-[#2E4B3D] text-white text-xs font-bold cursor-pointer">
                    + Tambah
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {draftCriteria.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">Belum ada master kriteria tersimpan. Tambahkan kriteria sesuai pedoman Permen LH/BPLH 7/2025.</p>
                ) : (
                  draftCriteria.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{c.aspek} — {c.indikator}</p>
                        {c.catatan && <p className="text-[11px] text-slate-500">{c.catatan}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{c.bobot}%</span>
                        <button type="button" onClick={() => setDraftCriteria(prev => prev.filter(x => x.id !== c.id))} className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowCriteriaModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">Tutup</button>
                <button type="button" disabled={isSavingCriteria} onClick={handleSaveCriteria} className="px-5 py-2 rounded-xl bg-[#2E4B3D] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                  {isSavingCriteria ? 'Menyimpan...' : 'Simpan Master Kriteria'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Hapus Indikator PROPER / RKAB?</h3>
              <p className="text-xs text-slate-500">Hapus indikator {deleteTarget.indicatorName}?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">Batal</button>
                <button onClick={async () => { await properRkabService.delete(deleteTarget.id); setDeleteTarget(null); }} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer">Hapus</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
