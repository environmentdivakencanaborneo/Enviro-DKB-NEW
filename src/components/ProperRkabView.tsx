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
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';
import {
  NEON_CHART,
  NEON_TOOLTIP_CONTENT_STYLE,
  NEON_TOOLTIP_LABEL_STYLE,
  NEON_TOOLTIP_ITEM_STYLE
} from '../utils/chartTheme';

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
      <div className="glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-neon-cyan">
            Permen LH/BPLH No. 7 Tahun 2025 (PROPER) &amp; Permen ESDM No. 17 Tahun 2025 jo. 6/2026 (RKAB)
          </span>
          <h2 className="text-xl md:text-2xl font-black text-text-hi mt-1 flex items-center gap-2.5">
            <Award className="h-6 w-6 text-neon-green" />
            Evaluasi Kinerja PROPER &amp; Pelaporan RKAB Lingkungan
          </h2>
          <p className="text-xs text-text-mid mt-1">
            Pemantauan target &amp; peringkat PROPER KLH/BPLH (Emas/Hijau/Biru/Merah/Hitam) serta pelacakan capaian lingkungan RKAB tahunan ESDM (Minerba One).
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {canManageCriteria && (
            <button
              onClick={openCriteriaDrawer}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neon-amber/30 bg-neon-amber/10 hover:bg-neon-amber/20 text-neon-amber text-xs font-bold cursor-pointer transition-colors"
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-bg-2 border border-border-subtle hover:border-border-neon text-text-mid hover:text-text-hi text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-neon-green" />
            Ekspor Excel
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4.5 py-2.5 neon-btn-primary text-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            Tambah Indikator
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neon-card p-5 rounded-2xl">
          <span className="text-xs text-text-low font-bold uppercase tracking-wider">Peringkat Aktual / Skor Mandiri</span>
          <p className="text-xl font-black text-neon-cyan mt-2">{kpis.latestActual}</p>
          <p className="text-[11px] text-text-mid mt-1">
            Capaian bobot: <span className="font-mono tabular-nums font-bold text-text-hi">{kpis.scorePct}%</span> (evaluasi sesuai Master Kriteria PROPER)
          </p>
        </div>
        <div className="neon-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-text-low font-bold uppercase tracking-wider">
            <span>Indikator Terpenuhi</span>
            <CheckCircle2 className="h-4 w-4 text-neon-green" />
          </div>
          <p className="text-2xl font-black font-mono tabular-nums text-neon-green mt-2">{kpis.met} / {kpis.total}</p>
          <p className="text-[11px] text-text-mid mt-1">Target PROPER &amp; RKAB tercapai</p>
        </div>
        <div className="neon-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-text-low font-bold uppercase tracking-wider">
            <span>Gap Terdeteksi</span>
            <AlertTriangle className="h-4 w-4 text-neon-red" />
          </div>
          <p className="text-2xl font-black font-mono tabular-nums text-neon-red mt-2">{kpis.gaps}</p>
          <p className="text-[11px] text-text-mid mt-1">Kriteria butuh tindakan korektif segera</p>
        </div>
        <div className="neon-card p-5 rounded-2xl">
          <span className="text-xs text-text-low font-bold uppercase tracking-wider">Total Kriteria Dipantau</span>
          <p className="text-2xl font-black font-mono tabular-nums text-text-hi mt-2">{kpis.total}</p>
          <p className="text-[11px] text-text-mid mt-1">Gabungan PROPER KLH/BPLH &amp; RKAB ESDM</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-text-hi uppercase tracking-wider mb-3">
            Perbandingan Bobot Maksimal vs Skor Mandiri per Aspek
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                <XAxis dataKey="category" tick={{ fill: NEON_CHART.tickFill, fontSize: 10 }} tickLine={false} axisLine={{ stroke: NEON_CHART.gridStroke }} />
                <YAxis tick={{ fill: NEON_CHART.tickFill, fontSize: 10 }} tickLine={false} axisLine={{ stroke: NEON_CHART.gridStroke }} />
                <RechartsTooltip
                  contentStyle={NEON_TOOLTIP_CONTENT_STYLE}
                  labelStyle={NEON_TOOLTIP_LABEL_STYLE}
                  itemStyle={NEON_TOOLTIP_ITEM_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: NEON_CHART.tickFill }} />
                <Bar dataKey="Bobot" name="Bobot Target" fill={NEON_CHART.axisStroke} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Skor" name="Skor Mandiri" fill={NEON_CHART.cyan} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-low" />
            <input
              type="text"
              placeholder="Cari indikator, aspek, atau PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 text-xs"
          >
            <option value="ALL">Semua Jenis (PROPER &amp; RKAB)</option>
            <option value="PROPER">PROPER KLH/BPLH</option>
            <option value="RKAB">RKAB ESDM</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="neon-table text-xs">
            <thead>
              <tr>
                <th>Periode &amp; Jenis</th>
                <th>Kategori &amp; Indikator</th>
                <th>Target vs Realisasi</th>
                <th className="text-center">Skor / Bobot</th>
                <th className="text-center">Rating (Target / Aktual)</th>
                <th className="text-center">Status</th>
                <th className="text-center">Aksi</th>
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
                      icon={Award}
                      title="Belum ada data PROPER & RKAB"
                      description="Tambahkan indikator kinerja PROPER atau pelaporan RKAB lingkungan."
                    />
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isLegacyRkab = item.recordType === 'RKAB' && !isAnnualRkabPeriod(item.period);
                  const statusForBadge =
                    item.status === 'Terpenuhi' ? 'Terpenuhi' :
                    item.status === 'Proses Pemenuhan' ? 'Proses' : 'Tidak Memenuhi';
                  return (
                    <tr key={item.id}>
                      <td className="font-mono tabular-nums">
                        <span className="font-bold text-text-hi block">{item.year} • {item.period}</span>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-2 border border-border-subtle text-text-mid font-bold">{item.recordType}</span>
                          {isLegacyRkab && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-neon-amber/10 text-neon-amber border border-neon-amber/25 font-sans font-semibold">
                              Periode lama (Permen ESDM 10/2023)
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <p className="text-[10px] font-bold uppercase text-neon-cyan">{item.category}</p>
                        <p className="font-bold text-text-hi">{item.indicatorName}</p>
                        <p className="text-[10px] text-text-low">PIC: {item.pic}</p>
                      </td>
                      <td>
                        <p className="text-text-mid">Target: <span className="font-semibold text-text-hi">{item.targetValue}</span></p>
                        <p className="text-neon-green">Realisasi: <span className="font-bold">{item.realizedValue}</span></p>
                      </td>
                      <td className="text-center font-mono tabular-nums font-bold text-text-hi" data-numeric="true">{item.selfScore} / {item.scoreWeight}</td>
                      <td className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <StatusBadge
                            status={item.targetProperRating}
                            label={`Target: ${item.targetProperRating}`}
                            size="xs"
                          />
                          {item.actualProperRating && (
                            <StatusBadge
                              status={item.actualProperRating}
                              label={`Aktual: ${item.actualProperRating}`}
                              size="xs"
                            />
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <StatusBadge status={statusForBadge} label={item.status} size="xs" />
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.evidenceUrl && (
                            <a href={item.evidenceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/20 rounded-lg" title="Buka Evidence">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button onClick={() => openEdit(item)} className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/20 rounded-lg cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                          <button
                            onClick={() => {
                              if (!canDelete) return onUnauthorizedAction('Hapus Indikator PROPER / RKAB');
                              setDeleteTarget(item);
                            }}
                            className="p-1.5 text-neon-red bg-neon-red/10 hover:bg-neon-red/20 border border-neon-red/20 rounded-lg cursor-pointer"
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
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neon-cyan">
                  {editingId ? 'Edit Indikator PROPER & RKAB' : 'Tambah Indikator Kinerja PROPER / RKAB'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-text-low hover:text-text-hi cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              {errorMsg && <div className="p-3 rounded-xl bg-neon-red/10 border border-neon-red/30 text-xs text-neon-red">{errorMsg}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Tahun</label>
                    <input type="number" required value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Jenis</label>
                    <select value={recordType} onChange={(e) => handleRecordTypeChange(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="PROPER">PROPER</option>
                      <option value="RKAB">RKAB</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Periode</label>
                    {recordType === 'RKAB' ? (
                      <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full px-3 py-2 text-xs">
                        <option value="Tahunan (1 Tahun - Minerba One)">Tahunan (1 Tahun - Minerba One)</option>
                        <option value="Tahunan">Tahunan</option>
                        {editingId && !isAnnualRkabPeriod(period) && (
                          <option value={period}>{period} (Periode lama)</option>
                        )}
                      </select>
                    ) : (
                      <input type="text" required value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full px-3 py-2 text-xs" />
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Target Rating</label>
                    <select value={targetProperRating} onChange={(e) => setTargetProperRating(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Biru">Biru</option>
                      <option value="Hijau">Hijau</option>
                      <option value="Emas">Emas</option>
                      <option value="Merah">Merah</option>
                    </select>
                  </div>
                </div>
                {recordType === 'PROPER' && (
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Peringkat Aktual PROPER (Opsional — Permen LH/BPLH 7/2025)</label>
                    <select value={actualProperRating} onChange={(e) => setActualProperRating(e.target.value as any)} className="w-full px-3 py-2 text-xs">
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
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Kategori Kriteria</label>
                    {properCriteria?.criteria && properCriteria.criteria.length > 0 ? (
                      <input
                        list="proper-criteria-aspek-list"
                        type="text"
                        required
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs"
                      />
                    ) : (
                      <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 text-xs" />
                    )}
                    <datalist id="proper-criteria-aspek-list">
                      {Array.from(new Set((properCriteria?.criteria || []).map(c => c.aspek))).map(a => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Nama Indikator</label>
                    <input type="text" required value={indicatorName} onChange={(e) => setIndicatorName(e.target.value)} placeholder="cth. Ketaatan 100% SIMPEL Air Limbah" className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Target Kuantitatif / Kualitatif</label>
                    <input type="text" required value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Realisasi Saat Ini</label>
                    <input type="text" required value={realizedValue} onChange={(e) => setRealizedValue(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Bobot Maks (0-100)</label>
                    <input type="number" min="0" max="100" required value={scoreWeight} onChange={(e) => setScoreWeight(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Skor Mandiri (0-100)</label>
                    <input type="number" min="0" max="100" required value={selfScore} onChange={(e) => setSelfScore(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono tabular-nums" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Terpenuhi">Terpenuhi</option>
                      <option value="Proses Pemenuhan">Proses Pemenuhan</option>
                      <option value="Gap Terdeteksi">Gap Terdeteksi</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">PIC</label>
                    <input type="text" required value={pic} onChange={(e) => setPic(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-low uppercase mb-1">URL Bukti / Dokumen (Opsional)</label>
                    <input type="text" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-low uppercase mb-1">Catatan</label>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-xs" />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-border-subtle text-text-mid hover:text-text-hi text-xs font-semibold cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 neon-btn-primary text-xs cursor-pointer disabled:opacity-50">
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
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neon-cyan">
                    Master Kriteria &amp; Bobot PROPER (Diisi Superintendent)
                  </h3>
                  <p className="text-[11px] text-text-mid mt-0.5">
                    Mengacu Permen LH/BPLH No. 7 Tahun 2025. Bobot dan kriteria diisi resmi oleh Environment Superintendent sesuai pedoman penilaian berlaku.
                  </p>
                </div>
                <button onClick={() => setShowCriteriaModal(false)} className="p-1 text-text-low hover:text-text-hi cursor-pointer"><X className="h-4 w-4" /></button>
              </div>

              {criteriaMsg && (
                <div className="p-3 rounded-xl bg-neon-green/10 border border-neon-green/30 text-xs text-neon-green">{criteriaMsg}</div>
              )}

              <div className="p-3 rounded-xl bg-bg-2 border border-border-subtle space-y-2">
                <p className="text-[11px] font-bold text-text-hi uppercase">Tambah Kriteria Master</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" placeholder="Aspek (cth: Pengendalian Air)" value={newAspek} onChange={e => setNewAspek(e.target.value)} className="px-2.5 py-1.5 text-xs" />
                  <input type="text" placeholder="Indikator Penilaian" value={newIndikator} onChange={e => setNewIndikator(e.target.value)} className="px-2.5 py-1.5 text-xs" />
                  <input type="number" min="0" max="100" placeholder="Bobot (%)" value={newBobot} onChange={e => setNewBobot(Number(e.target.value))} className="px-2.5 py-1.5 text-xs font-mono tabular-nums" />
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Catatan/rujukan pasal (opsional)" value={newCatatan} onChange={e => setNewCatatan(e.target.value)} className="flex-1 px-2.5 py-1.5 text-xs" />
                  <button type="button" onClick={handleAddCriteriaItem} className="px-3 py-1.5 neon-btn-primary text-xs cursor-pointer">
                    + Tambah
                  </button>
                </div>
              </div>

              <div className="border border-border-subtle rounded-xl divide-y divide-border-subtle max-h-60 overflow-y-auto bg-bg-1/50">
                {draftCriteria.length === 0 ? (
                  <p className="p-6 text-center text-xs text-text-low">Belum ada master kriteria tersimpan. Tambahkan kriteria sesuai pedoman Permen LH/BPLH 7/2025.</p>
                ) : (
                  draftCriteria.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-text-hi">{c.aspek} — {c.indikator}</p>
                        {c.catatan && <p className="text-[11px] text-text-low">{c.catatan}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono tabular-nums font-bold px-2 py-0.5 rounded bg-bg-2 border border-border-subtle text-neon-cyan">{c.bobot}%</span>
                        <button type="button" onClick={() => setDraftCriteria(prev => prev.filter(x => x.id !== c.id))} className="p-1 text-neon-red hover:bg-neon-red/10 rounded cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <button type="button" onClick={() => setShowCriteriaModal(false)} className="px-4 py-2 rounded-xl border border-border-subtle text-text-mid hover:text-text-hi text-xs font-semibold cursor-pointer">Tutup</button>
                <button type="button" disabled={isSavingCriteria} onClick={handleSaveCriteria} className="px-5 py-2 neon-btn-primary text-xs cursor-pointer disabled:opacity-50">
                  {isSavingCriteria ? 'Menyimpan...' : 'Simpan Master Kriteria'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-text-hi">Hapus Indikator PROPER / RKAB?</h3>
              <p className="text-xs text-text-mid">Hapus indikator {deleteTarget.indicatorName}?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-border-subtle text-text-mid hover:text-text-hi text-xs font-semibold cursor-pointer">Batal</button>
                <button onClick={async () => { await properRkabService.delete(deleteTarget.id); setDeleteTarget(null); }} className="px-4 py-2 rounded-xl neon-btn-danger text-xs font-bold cursor-pointer">Hapus</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

