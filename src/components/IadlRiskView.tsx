/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';
import {
  NEON_CHART,
  NEON_TOOLTIP_CONTENT_STYLE,
  NEON_TOOLTIP_LABEL_STYLE,
  NEON_TOOLTIP_ITEM_STYLE,
} from '../utils/chartTheme';
import { IadlRiskData } from '../types';
import { iadlRiskService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  ShieldAlert,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  X
} from 'lucide-react';

interface IadlRiskViewProps {
  data: IadlRiskData[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function IadlRiskView({
  data,
  isLoading,
  canEdit,
  canDelete,
  onUnauthorizedAction
}: IadlRiskViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IadlRiskData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [code, setCode] = useState('IADL-001');
  const [activity, setActivity] = useState('');
  const [aspect, setAspect] = useState('');
  const [impact, setImpact] = useState('');
  const [environmentalCondition, setEnvironmentalCondition] = useState<IadlRiskData['environmentalCondition']>('Normal');
  const [severityScore, setSeverityScore] = useState<number>(3);
  const [likelihoodScore, setLikelihoodScore] = useState<number>(3);
  const [controlMeasure, setControlMeasure] = useState('');
  const [legalRef, setLegalRef] = useState('PP No. 22 Tahun 2021');
  const [pic, setPic] = useState('');
  const [status, setStatus] = useState<IadlRiskData['status']>('Aktif Terkendali');
  const [targetDate, setTargetDate] = useState('');

  const computeRiskLevel = (score: number): IadlRiskData['riskLevel'] => {
    if (score >= 15) return 'Signifikan/Kritis';
    if (score >= 10) return 'Tinggi';
    if (score >= 5) return 'Sedang';
    return 'Rendah';
  };

  const resetForm = () => {
    setEditingId(null);
    setCode(`IADL-${String(data.length + 1).padStart(3, '0')}`);
    setActivity('');
    setAspect('');
    setImpact('');
    setEnvironmentalCondition('Normal');
    setSeverityScore(3);
    setLikelihoodScore(3);
    setControlMeasure('');
    setLegalRef('PP No. 22 Tahun 2021');
    setPic('');
    setStatus('Aktif Terkendali');
    setTargetDate('');
    setErrorMsg(null);
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Register IADL');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: IadlRiskData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Register IADL');
    setEditingId(item.id);
    setCode(item.code);
    setActivity(item.activity);
    setAspect(item.aspect);
    setImpact(item.impact);
    setEnvironmentalCondition(item.environmentalCondition);
    setSeverityScore(item.severityScore);
    setLikelihoodScore(item.likelihoodScore);
    setControlMeasure(item.controlMeasure);
    setLegalRef(item.legalRef);
    setPic(item.pic);
    setStatus(item.status);
    setTargetDate(item.targetDate || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Register IADL');
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const sev = Number(severityScore);
      const lik = Number(likelihoodScore);
      const score = sev * lik;
      const payload: Omit<IadlRiskData, 'id'> = {
        code: code.trim(),
        activity: activity.trim(),
        aspect: aspect.trim(),
        impact: impact.trim(),
        environmentalCondition,
        severityScore: sev,
        likelihoodScore: lik,
        riskScore: score,
        riskLevel: computeRiskLevel(score),
        controlMeasure: controlMeasure.trim(),
        legalRef: legalRef.trim(),
        pic: pic.trim(),
        status,
        targetDate: targetDate || undefined,
      };
      if (editingId) {
        await iadlRiskService.update(editingId, payload);
      } else {
        await iadlRiskService.add(payload);
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan register IADL.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const matchQuery =
        d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.aspect.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.impact.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLevel = levelFilter === 'ALL' || d.riskLevel === levelFilter;
      return matchQuery && matchLevel;
    });
  }, [data, searchQuery, levelFilter]);

  const kpis = useMemo(() => {
    const total = data.length;
    const critical = data.filter((d) => d.riskLevel === 'Signifikan/Kritis').length;
    const high = data.filter((d) => d.riskLevel === 'Tinggi').length;
    const controlled = data.filter((d) => d.status === 'Aktif Terkendali' || d.status === 'Selesai').length;
    return { total, critical, high, controlled };
  }, [data]);

  const chartData = useMemo(() => {
    const levels: Array<IadlRiskData['riskLevel']> = ['Rendah', 'Sedang', 'Tinggi', 'Signifikan/Kritis'];
    return levels.map((lvl) => ({
      level: lvl,
      Jumlah: filteredData.filter((d) => d.riskLevel === lvl).length,
    }));
  }, [filteredData]);

  return (
    <div className="space-y-6 text-left text-text-hi animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-neon-green">
            ISO 14001:2015 Klausul 6.1.2 (Environmental Aspects &amp; Impacts)
          </span>
          <h2 className="text-xl md:text-2xl font-black text-text-hi font-heading mt-1 flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-neon-cyan" />
            Register Aspek &amp; Dampak Lingkungan (IADL)
          </h2>
          <p className="text-xs text-text-mid mt-1">
            Matriks penilaian risiko lingkungan (Severity × Likelihood) untuk kondisi Normal, Abnormal, dan Darurat operasional tambang.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() =>
              exportToExcel(
                filteredData.map((d) => ({
                  Kode: d.code,
                  Aktivitas: d.activity,
                  Aspek: d.aspect,
                  Dampak: d.impact,
                  Kondisi: d.environmentalCondition,
                  'Severity (S)': d.severityScore,
                  'Likelihood (L)': d.likelihoodScore,
                  'Skor (S×L)': d.riskScore,
                  'Tingkat Risiko': d.riskLevel,
                  Pengendalian: d.controlMeasure,
                  Regulasi: d.legalRef,
                  PIC: d.pic,
                  Status: d.status,
                })),
                'DEM_Register_IADL_ISO14001'
              )
            }
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-neon bg-bg-2/70 hover:bg-bg-2 text-text-hi text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-neon-green" />
            Ekspor Excel
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl neon-btn-primary text-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            Tambah Aspek IADL
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neon-card p-5">
          <span className="text-xs text-text-mid font-bold uppercase">Total Register Aspek</span>
          <p className="text-2xl font-black text-text-hi mt-2 font-mono tabular-nums">{kpis.total}</p>
          <p className="text-[11px] text-text-low mt-1">Aktivitas &amp; aspek lingkungan teridentifikasi</p>
        </div>
        <div className="neon-card p-5">
          <span className="text-xs text-text-mid font-bold uppercase">Aspek Signifikan / Kritis</span>
          <p className="text-2xl font-black text-neon-red mt-2 font-mono tabular-nums">{kpis.critical}</p>
          <p className="text-[11px] text-text-low mt-1">Skor Risiko ≥ 15 (Prioritas Mitigasi)</p>
        </div>
        <div className="neon-card p-5">
          <span className="text-xs text-text-mid font-bold uppercase">Risiko Tinggi</span>
          <p className="text-2xl font-black text-neon-amber mt-2 font-mono tabular-nums">{kpis.high}</p>
          <p className="text-[11px] text-text-low mt-1">Skor Risiko 10 – 14</p>
        </div>
        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-xs text-text-mid font-bold uppercase">
            <span>Terkendali / Selesai</span>
            <CheckCircle2 className="h-4 w-4 text-neon-green" />
          </div>
          <p className="text-2xl font-black text-neon-green mt-2 font-mono tabular-nums">{kpis.controlled}</p>
          <p className="text-[11px] text-text-low mt-1">Pengendalian operasional aktif</p>
        </div>
      </div>

      {/* Chart */}
      {filteredData.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-text-hi font-heading uppercase tracking-wider mb-3">
            Distribusi Tingkat Risiko IADL
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                <XAxis dataKey="level" fontSize={11} tickLine={false} stroke={NEON_CHART.axisStroke} tick={{ fill: NEON_CHART.tickFill }} />
                <YAxis allowDecimals={false} fontSize={10} tickLine={false} stroke={NEON_CHART.axisStroke} tick={{ fill: NEON_CHART.tickFill }} />
                <RechartsTooltip
                  contentStyle={NEON_TOOLTIP_CONTENT_STYLE}
                  labelStyle={NEON_TOOLTIP_LABEL_STYLE}
                  itemStyle={NEON_TOOLTIP_ITEM_STYLE}
                />
                <Bar dataKey="Jumlah" fill={NEON_CHART.cyan} radius={[6, 6, 0, 0]} />
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
              placeholder="Cari kode, aktivitas, aspek, atau dampak..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 text-xs"
          >
            <option value="ALL">Semua Tingkat Risiko</option>
            <option value="Signifikan/Kritis">Signifikan/Kritis</option>
            <option value="Tinggi">Tinggi</option>
            <option value="Sedang">Sedang</option>
            <option value="Rendah">Rendah</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="neon-table text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-text-mid font-mono">
                <th className="p-3">Kode</th>
                <th className="p-3">Aktivitas &amp; Aspek</th>
                <th className="p-3">Dampak &amp; Pengendalian</th>
                <th className="p-3 text-center">Kondisi</th>
                <th className="p-3 text-center">Skor (S×L)</th>
                <th className="p-3 text-center">Risiko</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <TableSkeleton columns={8} rows={5} />
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <EmptyState
                      icon={ShieldAlert}
                      title="Belum ada register IADL (ISO 14001)"
                      description="Tambahkan identifikasi aspek dan dampak lingkungan untuk memantau skor risiko operasional."
                    />
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-mono font-bold text-neon-cyan whitespace-nowrap">{item.code}</td>
                    <td className="p-3">
                      <p className="font-bold text-text-hi">{item.activity}</p>
                      <p className="text-[10px] text-text-mid">Aspek: {item.aspect}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-text-hi">{item.impact}</p>
                      <p className="text-[10px] text-neon-green mt-0.5">Kontrol: {item.controlMeasure}</p>
                    </td>
                    <td className="p-3 text-center font-semibold text-text-hi">{item.environmentalCondition}</td>
                    <td className="p-3 text-center font-mono font-bold tabular-nums text-text-hi" data-numeric="true">
                      {item.severityScore}×{item.likelihoodScore} = {item.riskScore}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge
                        status={
                          item.riskLevel === 'Signifikan/Kritis'
                            ? 'Kritis'
                            : item.riskLevel === 'Tinggi'
                            ? 'Warning'
                            : item.riskLevel === 'Sedang'
                            ? 'Dipantau'
                            : 'Memenuhi'
                        }
                        label={item.riskLevel}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge
                        status={
                          item.status === 'Aktif Terkendali'
                            ? 'Aktif'
                            : item.status === 'Perlu Mitigasi'
                            ? 'Warning'
                            : 'Selesai'
                        }
                        label={item.status}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 rounded-lg cursor-pointer transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                        <button
                          onClick={() => {
                            if (!canDelete) return onUnauthorizedAction('Hapus Register IADL');
                            setDeleteTarget(item);
                          }}
                          className="p-1.5 text-neon-red bg-neon-red/10 hover:bg-neon-red/20 rounded-lg cursor-pointer transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-2xl w-full p-6 shadow-glow-cyan max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-neon">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neon-cyan font-heading">
                  {editingId ? 'Edit Register IADL' : 'Tambah Register Aspek & Dampak Lingkungan'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-text-mid hover:text-text-hi hover:bg-bg-2 rounded-lg cursor-pointer transition-colors"><X className="h-4 w-4" /></button>
              </div>
              {errorMsg && <div className="p-3 rounded-xl bg-neon-red/10 border border-neon-red/30 text-xs text-neon-red">{errorMsg}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kode IADL</label>
                    <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kondisi Operasi</label>
                    <select value={environmentalCondition} onChange={(e) => setEnvironmentalCondition(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Normal">Normal</option>
                      <option value="Abnormal">Abnormal</option>
                      <option value="Darurat">Darurat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Status Pengendalian</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Aktif Terkendali">Aktif Terkendali</option>
                      <option value="Perlu Mitigasi">Perlu Mitigasi</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Aktivitas / Proses Tambang</label>
                    <input type="text" required value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="cth. Pengoperasian Workshop & Oil Trap" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Aspek Lingkungan</label>
                    <input type="text" required value={aspect} onChange={(e) => setAspect(e.target.value)} placeholder="cth. Ceceran oli & limbah B3" className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Dampak Lingkungan</label>
                  <input type="text" required value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="cth. Pencemaran tanah & air permukaan" className="w-full px-3 py-2 text-xs" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-bg-2/60 p-3 rounded-2xl border border-border-neon">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Keparahan (S: 1-5)</label>
                    <input type="number" min="1" max="5" required value={severityScore} onChange={(e) => setSeverityScore(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kemungkinan (L: 1-5)</label>
                    <input type="number" min="1" max="5" required value={likelihoodScore} onChange={(e) => setLikelihoodScore(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-bold uppercase text-text-mid">Hasil Skor &amp; Level</span>
                    <span className="text-sm font-black text-neon-cyan mt-1 font-mono tabular-nums">
                      {severityScore * likelihoodScore} ({computeRiskLevel(severityScore * likelihoodScore)})
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Pengendalian &amp; Mitigasi</label>
                  <textarea rows={2} required value={controlMeasure} onChange={(e) => setControlMeasure(e.target.value)} className="w-full px-3 py-2 text-xs" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Referensi Regulasi</label>
                    <input type="text" required value={legalRef} onChange={(e) => setLegalRef(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">PIC</label>
                    <input type="text" required value={pic} onChange={(e) => setPic(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Target Selesai (Opsional)</label>
                    <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border-neon">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-text-mid hover:text-text-hi hover:bg-bg-2 cursor-pointer transition-colors">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl neon-btn-primary text-xs cursor-pointer disabled:opacity-50">
                    {isSaving ? 'Menyimpan...' : 'Simpan IADL'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-sm w-full p-6 shadow-glow-red space-y-4">
              <h3 className="text-sm font-bold text-text-hi font-heading">Hapus Register IADL?</h3>
              <p className="text-xs text-text-mid">Hapus aspek <strong className="text-text-hi">{deleteTarget.code}</strong> ({deleteTarget.activity})?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-text-mid hover:text-text-hi hover:bg-bg-2 cursor-pointer transition-colors">Batal</button>
                <button onClick={async () => { await iadlRiskService.delete(deleteTarget.id); setDeleteTarget(null); }} className="px-4 py-2 rounded-xl neon-btn-danger text-xs cursor-pointer">Hapus</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
