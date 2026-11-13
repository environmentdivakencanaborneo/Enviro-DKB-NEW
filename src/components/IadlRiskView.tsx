/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
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
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E4EDE6] shadow-sm">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#4D7C5A]">
            ISO 14001:2015 Klausul 6.1.2 (Environmental Aspects &amp; Impacts)
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-[#2E4B3D]" />
            Register Aspek &amp; Dampak Lingkungan (IADL)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Ekspor Excel
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#2E4B3D] hover:bg-[#233A2F] text-white text-xs font-bold shadow-md cursor-pointer">
            <Plus className="h-4 w-4" />
            Tambah Aspek IADL
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase">Total Register Aspek</span>
          <p className="text-2xl font-black text-slate-800 mt-2">{kpis.total}</p>
          <p className="text-[11px] text-slate-500 mt-1">Aktivitas &amp; aspek lingkungan teridentifikasi</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase">Aspek Signifikan / Kritis</span>
          <p className="text-2xl font-black text-rose-600 mt-2">{kpis.critical}</p>
          <p className="text-[11px] text-slate-500 mt-1">Skor Risiko ≥ 15 (Prioritas Mitigasi)</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <span className="text-xs text-slate-500 font-bold uppercase">Risiko Tinggi</span>
          <p className="text-2xl font-black text-amber-600 mt-2">{kpis.high}</p>
          <p className="text-[11px] text-slate-500 mt-1">Skor Risiko 10 – 14</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Terkendali / Selesai</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-[#2E4B3D] mt-2">{kpis.controlled}</p>
          <p className="text-[11px] text-slate-500 mt-1">Pengendalian operasional aktif</p>
        </div>
      </div>

      {/* Chart */}
      {filteredData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Distribusi Tingkat Risiko IADL
          </h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="level" fontSize={11} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={10} tickLine={false} />
                <RechartsTooltip />
                <Bar dataKey="Jumlah" fill="#2E4B3D" radius={[6, 6, 0, 0]} />
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
              placeholder="Cari kode, aktivitas, aspek, atau dampak..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
          >
            <option value="ALL">Semua Tingkat Risiko</option>
            <option value="Signifikan/Kritis">Signifikan/Kritis</option>
            <option value="Tinggi">Tinggi</option>
            <option value="Sedang">Sedang</option>
            <option value="Rendah">Rendah</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
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
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Memuat register IADL...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400">Belum ada register IADL (ISO 14001).</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-[#2E4B3D]">{item.code}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{item.activity}</p>
                      <p className="text-[10px] text-slate-500">Aspek: {item.aspect}</p>
                    </td>
                    <td className="p-3">
                      <p className="text-slate-700">{item.impact}</p>
                      <p className="text-[10px] text-emerald-700 mt-0.5">Kontrol: {item.controlMeasure}</p>
                    </td>
                    <td className="p-3 text-center font-semibold">{item.environmentalCondition}</td>
                    <td className="p-3 text-center font-mono font-bold">{item.severityScore}×{item.likelihoodScore} = {item.riskScore}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.riskLevel === 'Signifikan/Kritis' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        item.riskLevel === 'Tinggi' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        item.riskLevel === 'Sedang' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {item.riskLevel}
                      </span>
                    </td>
                    <td className="p-3 text-center text-[11px] font-semibold text-slate-600">{item.status}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                        <button
                          onClick={() => {
                            if (!canDelete) return onUnauthorizedAction('Hapus Register IADL');
                            setDeleteTarget(item);
                          }}
                          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#2E4B3D]">
                  {editingId ? 'Edit Register IADL' : 'Tambah Register Aspek & Dampak Lingkungan'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              {errorMsg && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{errorMsg}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kode IADL</label>
                    <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kondisi Operasi</label>
                    <select value={environmentalCondition} onChange={(e) => setEnvironmentalCondition(e.target.value as any)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                      <option value="Normal">Normal</option>
                      <option value="Abnormal">Abnormal</option>
                      <option value="Darurat">Darurat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status Pengendalian</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                      <option value="Aktif Terkendali">Aktif Terkendali</option>
                      <option value="Perlu Mitigasi">Perlu Mitigasi</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Aktivitas / Proses Tambang</label>
                    <input type="text" required value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="cth. Pengoperasian Workshop & Oil Trap" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Aspek Lingkungan</label>
                    <input type="text" required value={aspect} onChange={(e) => setAspect(e.target.value)} placeholder="cth. Ceceran oli & limbah B3" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Dampak Lingkungan</label>
                  <input type="text" required value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="cth. Pencemaran tanah & air permukaan" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Keparahan (S: 1-5)</label>
                    <input type="number" min="1" max="5" required value={severityScore} onChange={(e) => setSeverityScore(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kemungkinan (L: 1-5)</label>
                    <input type="number" min="1" max="5" required value={likelihoodScore} onChange={(e) => setLikelihoodScore(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Hasil Skor &amp; Level</span>
                    <span className="text-sm font-black text-[#2E4B3D] mt-1">
                      {severityScore * likelihoodScore} ({computeRiskLevel(severityScore * likelihoodScore)})
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pengendalian &amp; Mitigasi</label>
                  <textarea rows={2} required value={controlMeasure} onChange={(e) => setControlMeasure(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Referensi Regulasi</label>
                    <input type="text" required value={legalRef} onChange={(e) => setLegalRef(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">PIC</label>
                    <input type="text" required value={pic} onChange={(e) => setPic(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Target Selesai (Opsional)</label>
                    <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl bg-[#2E4B3D] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Hapus Register IADL?</h3>
              <p className="text-xs text-slate-500">Hapus aspek {deleteTarget.code} ({deleteTarget.activity})?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">Batal</button>
                <button onClick={async () => { await iadlRiskService.delete(deleteTarget.id); setDeleteTarget(null); }} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer">Hapus</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
