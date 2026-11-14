/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import StatusBadge from './StatusBadge';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';
import { TopsoilErosionData } from '../types';
import { topsoilErosionService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import {
  NEON_CHART,
  NEON_TOOLTIP_CONTENT_STYLE,
  NEON_TOOLTIP_LABEL_STYLE,
  NEON_TOOLTIP_ITEM_STYLE,
} from '../utils/chartTheme';
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
  Layers,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Sprout,
  AlertTriangle,
  X
} from 'lucide-react';

interface TopsoilErosionViewProps {
  data: TopsoilErosionData[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function TopsoilErosionView({
  data,
  isLoading,
  canEdit,
  canDelete,
  onUnauthorizedAction
}: TopsoilErosionViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TopsoilErosionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [date, setDate] = useState(todayLocalISO());
  const [blockLocation, setBlockLocation] = useState('Topsoil Bank Pit Barat');
  const [topsoilVolumeM3, setTopsoilVolumeM3] = useState<number>(0);
  const [stockpileUsedM3, setStockpileUsedM3] = useState<number>(0);
  const [cumulativeBalanceM3, setCumulativeBalanceM3] = useState<number>(0);
  const [thicknessCm, setThicknessCm] = useState<number>(50);
  const [coverCropAreaHa, setCoverCropAreaHa] = useState<number>(0);
  const [erosionSeverity, setErosionSeverity] = useState<TopsoilErosionData['erosionSeverity']>('Rendah');
  const [mitigationAction, setMitigationAction] = useState('Pemasangan silt fence & hydroseeding LCC');
  const [officer, setOfficer] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setDate(todayLocalISO());
    setBlockLocation('Topsoil Bank Pit Barat');
    setTopsoilVolumeM3(0);
    setStockpileUsedM3(0);
    setCumulativeBalanceM3(0);
    setThicknessCm(50);
    setCoverCropAreaHa(0);
    setErosionSeverity('Rendah');
    setMitigationAction('Pemasangan silt fence & hydroseeding LCC');
    setOfficer('');
    setNotes('');
    setErrorMsg(null);
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Data Topsoil & Erosi');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: TopsoilErosionData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Data Topsoil & Erosi');
    setEditingId(item.id);
    setDate(item.date);
    setBlockLocation(item.blockLocation);
    setTopsoilVolumeM3(item.topsoilVolumeM3);
    setStockpileUsedM3(item.stockpileUsedM3);
    setCumulativeBalanceM3(item.cumulativeBalanceM3);
    setThicknessCm(item.thicknessCm);
    setCoverCropAreaHa(item.coverCropAreaHa);
    setErosionSeverity(item.erosionSeverity);
    setMitigationAction(item.mitigationAction);
    setOfficer(item.officer);
    setNotes(item.notes || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Data Topsoil & Erosi');
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload: Omit<TopsoilErosionData, 'id'> = {
        date,
        blockLocation: blockLocation.trim(),
        topsoilVolumeM3: Number(topsoilVolumeM3),
        stockpileUsedM3: Number(stockpileUsedM3),
        cumulativeBalanceM3: Number(cumulativeBalanceM3),
        thicknessCm: Number(thicknessCm),
        coverCropAreaHa: Number(coverCropAreaHa),
        erosionSeverity,
        mitigationAction: mitigationAction.trim(),
        officer: officer.trim(),
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await topsoilErosionService.update(editingId, payload);
      } else {
        await topsoilErosionService.add(payload);
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan data topsoil & erosi.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const matchSearch =
        d.blockLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.mitigationAction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.officer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSev = severityFilter === 'ALL' || d.erosionSeverity === severityFilter;
      return matchSearch && matchSev;
    });
  }, [data, searchQuery, severityFilter]);

  const kpis = useMemo(() => {
    const totalStripped = data.reduce((s, d) => s + d.topsoilVolumeM3, 0);
    const totalSpread = data.reduce((s, d) => s + d.stockpileUsedM3, 0);
    const totalCoverCrop = data.reduce((s, d) => s + d.coverCropAreaHa, 0);
    const highErosion = data.filter((d) => d.erosionSeverity === 'Tinggi' || d.erosionSeverity === 'Kritis').length;
    return { totalStripped, totalSpread, totalCoverCrop, highErosion };
  }, [data]);

  const chartData = useMemo(() => {
    return [...filteredData]
      .slice(0, 10)
      .reverse()
      .map((d) => ({
        date: d.date,
        'Topsoil Masuk (m³)': d.topsoilVolumeM3,
        'Topsoil Ditebar (m³)': d.stockpileUsedM3,
      }));
  }, [filteredData]);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-neon-cyan">
            Kepmen ESDM No. 1827 K/30/MEM/2018 (Good Mining Practice) • Periksa irisan ketentuan reklamasi dengan Kepmen ESDM 344.K/2025
          </span>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-text-hi mt-1 flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-neon-green" />
            Manajemen Tanah Pucuk (Topsoil) &amp; Pengendalian Erosi
          </h2>
          <p className="text-xs text-text-mid mt-1">
            Pelacakan neraca volume tanah pucuk (kupasan vs penebaran), ketebalan reklamasi, luasan cover crop (LCC), serta mitigasi erosi lereng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() =>
              exportToExcel(
                filteredData.map((d) => ({
                  ID: d.id,
                  Tanggal: d.date,
                  'Blok / Lokasi': d.blockLocation,
                  'Topsoil Masuk (m³)': d.topsoilVolumeM3,
                  'Topsoil Ditebar (m³)': d.stockpileUsedM3,
                  'Saldo Bank (m³)': d.cumulativeBalanceM3,
                  'Ketebalan (cm)': d.thicknessCm,
                  'Cover Crop (Ha)': d.coverCropAreaHa,
                  'Tingkat Erosi': d.erosionSeverity,
                  Mitigasi: d.mitigationAction,
                  Petugas: d.officer,
                })),
                'DEM_Topsoil_Erosi'
              )
            }
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-bg-1 border border-border-neon hover:border-neon-cyan/40 hover:bg-bg-2 text-text-hi text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-neon-green" />
            Ekspor Excel
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl neon-btn-primary text-xs cursor-pointer">
            <Plus className="h-4 w-4" />
            Catat Neraca Topsoil
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neon-card p-5">
          <span className="text-xs text-text-mid font-bold uppercase">Total Topsoil Dikupas</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-neon-green mt-2">{kpis.totalStripped.toLocaleString('id-ID')} m³</p>
          <p className="text-[11px] text-text-low mt-1">Akumulasi volume masuk topsoil bank</p>
        </div>
        <div className="neon-card p-5">
          <span className="text-xs text-text-mid font-bold uppercase">Topsoil Ditebar Reklamasi</span>
          <p className="text-2xl font-bold font-mono tabular-nums text-neon-cyan mt-2">{kpis.totalSpread.toLocaleString('id-ID')} m³</p>
          <p className="text-[11px] text-text-low mt-1">Penebaran pada area void/disposal</p>
        </div>
        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-xs text-text-mid font-bold uppercase">
            <span>Cover Crop (LCC)</span>
            <Sprout className="h-4 w-4 text-neon-green" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-neon-green mt-2">{kpis.totalCoverCrop.toFixed(2)} Ha</p>
          <p className="text-[11px] text-text-low mt-1">Luas lereng tertanam penutup tanah</p>
        </div>
        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-xs text-text-mid font-bold uppercase">
            <span>Erosi Tinggi / Kritis</span>
            <AlertTriangle className="h-4 w-4 text-neon-red" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-neon-red mt-2">{kpis.highErosion}</p>
          <p className="text-[11px] text-text-low mt-1">Titik butuh penguatan lereng/silt trap</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-bold font-heading text-text-hi uppercase tracking-wider mb-3">
            Neraca Volume Topsoil Masuk vs Penebaran (m³)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                <XAxis dataKey="date" stroke={NEON_CHART.tickFill} tick={{ fill: NEON_CHART.tickFill, fontSize: 10 }} tickLine={false} />
                <YAxis stroke={NEON_CHART.tickFill} tick={{ fill: NEON_CHART.tickFill, fontSize: 10 }} tickLine={false} />
                <RechartsTooltip
                  contentStyle={NEON_TOOLTIP_CONTENT_STYLE}
                  labelStyle={NEON_TOOLTIP_LABEL_STYLE}
                  itemStyle={NEON_TOOLTIP_ITEM_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: NEON_CHART.tickFill }} />
                <Bar dataKey="Topsoil Masuk (m³)" fill={NEON_CHART.cyan} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Topsoil Ditebar (m³)" fill={NEON_CHART.green} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-low pointer-events-none" />
            <input
              type="text"
              placeholder="Cari blok, pit, atau tindakan mitigasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 text-xs"
          >
            <option value="ALL">Semua Tingkat Erosi</option>
            <option value="Rendah">Rendah</option>
            <option value="Sedang">Sedang</option>
            <option value="Tinggi">Tinggi</option>
            <option value="Kritis">Kritis</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="neon-table text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider font-mono">
                <th className="p-3">Tanggal</th>
                <th className="p-3">Blok / Lokasi &amp; Mitigasi</th>
                <th className="p-3 text-right">Masuk (m³)</th>
                <th className="p-3 text-right">Ditebar (m³)</th>
                <th className="p-3 text-right">Saldo (m³)</th>
                <th className="p-3 text-center">Tebal / LCC</th>
                <th className="p-3 text-center">Erosi</th>
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
                      icon={Layers}
                      title="Belum ada data manajemen topsoil & erosi"
                      description="Catat volume tanah pucuk yang dikupas, ditebar, serta tingkat erosi lereng."
                    />
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const erosionTone =
                    item.erosionSeverity === 'Rendah'
                      ? 'Memenuhi'
                      : item.erosionSeverity === 'Sedang'
                      ? 'Mendekati'
                      : 'Tidak Memenuhi';
                  return (
                    <tr key={item.id}>
                      <td className="p-3 font-mono font-semibold text-text-hi tabular-nums">{item.date}</td>
                      <td className="p-3">
                        <p className="font-bold text-text-hi">{item.blockLocation}</p>
                        <p className="text-[10px] text-text-mid">{item.mitigationAction} • {item.officer}</p>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold tabular-nums" data-numeric="true">{item.topsoilVolumeM3.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right font-mono tabular-nums" data-numeric="true">{item.stockpileUsedM3.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-right font-mono font-bold text-neon-green tabular-nums" data-numeric="true">{item.cumulativeBalanceM3.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-center font-mono text-text-mid tabular-nums">{item.thicknessCm} cm / {item.coverCropAreaHa} Ha</td>
                      <td className="p-3 text-center">
                        <StatusBadge status={erosionTone} label={item.erosionSeverity} />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 rounded-lg cursor-pointer transition-colors" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button
                            onClick={() => {
                              if (!canDelete) return onUnauthorizedAction('Hapus Data Topsoil & Erosi');
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-neon">
                <h3 className="text-sm font-bold font-heading uppercase tracking-wider text-neon-cyan">
                  {editingId ? 'Edit Catatan Topsoil & Erosi' : 'Input Neraca Tanah Pucuk & Pengendalian Erosi'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-text-low hover:text-text-hi cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              {errorMsg && <div className="p-3 rounded-xl bg-neon-red/10 border border-neon-red/30 text-xs text-neon-red">{errorMsg}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Tanggal</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Lokasi Blok / Pit / Bank</label>
                    <input type="text" required value={blockLocation} onChange={(e) => setBlockLocation(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Topsoil Masuk (m³)</label>
                    <input type="number" step="0.1" required value={topsoilVolumeM3} onChange={(e) => setTopsoilVolumeM3(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Topsoil Ditebar (m³)</label>
                    <input type="number" step="0.1" required value={stockpileUsedM3} onChange={(e) => setStockpileUsedM3(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Saldo Bank (m³)</label>
                    <input type="number" step="0.1" required value={cumulativeBalanceM3} onChange={(e) => setCumulativeBalanceM3(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Ketebalan Tebaran (cm)</label>
                    <input type="number" step="1" required value={thicknessCm} onChange={(e) => setThicknessCm(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Luas Cover Crop (Ha)</label>
                    <input type="number" step="0.01" required value={coverCropAreaHa} onChange={(e) => setCoverCropAreaHa(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Tingkat Erosi</label>
                    <select value={erosionSeverity} onChange={(e) => setErosionSeverity(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Rendah">Rendah</option>
                      <option value="Sedang">Sedang</option>
                      <option value="Tinggi">Tinggi</option>
                      <option value="Kritis">Kritis</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Tindakan Mitigasi Erosi</label>
                    <input type="text" required value={mitigationAction} onChange={(e) => setMitigationAction(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Petugas Pengawas</label>
                    <input type="text" required value={officer} onChange={(e) => setOfficer(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Catatan</label>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-xs" />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-border-subtle text-text-mid hover:text-text-hi text-xs font-semibold cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl neon-btn-primary text-xs cursor-pointer disabled:opacity-50">
                    {isSaving ? 'Menyimpan...' : 'Simpan Data'}
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
            <div className="glass-panel rounded-3xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-sm font-bold font-heading text-text-hi">Hapus Data Topsoil &amp; Erosi?</h3>
              <p className="text-xs text-text-mid">Hapus rekaman blok <strong className="text-text-hi">{deleteTarget.blockLocation}</strong> tanggal <span className="font-mono">{deleteTarget.date}</span>?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-border-subtle text-text-mid hover:text-text-hi text-xs font-semibold cursor-pointer">Batal</button>
                <button onClick={async () => { await topsoilErosionService.delete(deleteTarget.id); setDeleteTarget(null); }} className="px-4 py-2 rounded-xl neon-btn-danger text-xs cursor-pointer">Hapus</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
