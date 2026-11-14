/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import { AirEmissionData } from '../types';
import { airEmissionService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import StatusBadge from './StatusBadge';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';
import { NEON_CHART, NEON_TOOLTIP_CONTENT_STYLE } from '../utils/chartTheme';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Wind,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

interface AirEmissionViewProps {
  data: AirEmissionData[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function AirEmissionView({
  data,
  isLoading,
  canEdit,
  canDelete,
  onUnauthorizedAction,
}: AirEmissionViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AirEmissionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [date, setDate] = useState(todayLocalISO());
  const [monitoringCategory, setMonitoringCategory] = useState<AirEmissionData['monitoringCategory']>('Udara Ambien');
  const [location, setLocation] = useState('Hauling Road KM 12 / Pemukiman Terdekat');
  const [pm10, setPm10] = useState<number>(0);
  const [pm25, setPm25] = useState<number>(0);
  const [tsp, setTsp] = useState<number>(0);
  const [so2, setSo2] = useState<number>(0);
  const [no2, setNo2] = useState<number>(0);
  const [co, setCo] = useState<number>(0);
  const [noiseDb, setNoiseDb] = useState<number>(0);
  const [officer, setOfficer] = useState('');
  const [labRef, setLabRef] = useState('');
  const [notes, setNotes] = useState('');

  const evaluateAirStatus = (
    p10: number,
    p25: number,
    tspVal: number,
    so2Val: number,
    no2Val: number,
    coVal: number,
    noiseVal: number
  ): 'Safe' | 'Warning' | 'Exceeded' => {
    if (p10 > 75 || p25 > 55 || tspVal > 230 || so2Val > 150 || no2Val > 200 || coVal > 10000 || noiseVal > 70) {
      return 'Exceeded';
    }
    if (p10 > 60 || p25 > 45 || tspVal > 190 || so2Val > 120 || no2Val > 160 || noiseVal > 62) {
      return 'Warning';
    }
    return 'Safe';
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(todayLocalISO());
    setMonitoringCategory('Udara Ambien');
    setLocation('Hauling Road KM 12');
    setPm10(0);
    setPm25(0);
    setTsp(0);
    setSo2(0);
    setNo2(0);
    setCo(0);
    setNoiseDb(0);
    setOfficer('');
    setLabRef('');
    setNotes('');
    setErrorMsg(null);
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Data Udara & Emisi');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: AirEmissionData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Data Udara & Emisi');
    setEditingId(item.id);
    setDate(item.date);
    setMonitoringCategory(item.monitoringCategory);
    setLocation(item.location);
    setPm10(item.pm10);
    setPm25(item.pm25);
    setTsp(item.tsp);
    setSo2(item.so2);
    setNo2(item.no2);
    setCo(item.co);
    setNoiseDb(item.noiseDb);
    setOfficer(item.officer);
    setLabRef(item.labRef || '');
    setNotes(item.notes || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Data Udara & Emisi');
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const status = evaluateAirStatus(
        Number(pm10),
        Number(pm25),
        Number(tsp),
        Number(so2),
        Number(no2),
        Number(co),
        Number(noiseDb)
      );
      const payload: Omit<AirEmissionData, 'id'> = {
        date,
        monitoringCategory,
        location: location.trim(),
        pm10: Number(pm10),
        pm25: Number(pm25),
        tsp: Number(tsp),
        so2: Number(so2),
        no2: Number(no2),
        co: Number(co),
        noiseDb: Number(noiseDb),
        status,
        officer: officer.trim(),
        labRef: labRef.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await airEmissionService.update(editingId, payload);
      } else {
        await airEmissionService.add(payload);
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan data udara & emisi.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      const matchQuery =
        d.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.officer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.labRef || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || d.monitoringCategory === categoryFilter;
      return matchQuery && matchCat;
    });
  }, [data, searchQuery, categoryFilter]);

  const kpis = useMemo(() => {
    const total = data.length;
    const safe = data.filter((d) => d.status === 'Safe').length;
    const exceeded = data.filter((d) => d.status === 'Exceeded').length;
    const avgPm10 = total > 0 ? (data.reduce((s, d) => s + d.pm10, 0) / total).toFixed(1) : '0';
    const avgNoise = total > 0 ? (data.reduce((s, d) => s + d.noiseDb, 0) / total).toFixed(1) : '0';
    return {
      total,
      compliancePct: total > 0 ? Math.round((safe / total) * 100) : 0,
      exceeded,
      avgPm10,
      avgNoise,
    };
  }, [data]);

  const chartData = useMemo(() => {
    return [...filteredData]
      .slice(0, 10)
      .reverse()
      .map((d) => ({
        label: `${d.date} (${d.location.slice(0, 12)})`,
        PM10: d.pm10,
        'PM2.5': d.pm25,
        'Kebisingan (dBA)': d.noiseDb,
      }));
  }, [filteredData]);

  return (
    <div className="space-y-6 text-left">
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-neon-cyan">
            PP No. 22/2021 Lampiran VII &amp; Kepmen LH No. 48/1996
          </span>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-text-hi mt-1 flex items-center gap-2.5">
            <Wind className="h-6 w-6 text-neon-cyan" />
            Kualitas Udara Ambien, Emisi &amp; Kebisingan
          </h2>
          <p className="text-xs text-text-mid mt-1">
            Pemantauan partikulat debu (PM10, PM2.5, TSP), gas buang (SO2, NO2, CO), emisi genset/alat berat, serta tingkat kebisingan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              exportToExcel(
                filteredData.map((d) => ({
                  ID: d.id,
                  Tanggal: d.date,
                  Kategori: d.monitoringCategory,
                  Lokasi: d.location,
                  PM10: d.pm10,
                  'PM2.5': d.pm25,
                  TSP: d.tsp,
                  SO2: d.so2,
                  NO2: d.no2,
                  CO: d.co,
                  'Kebisingan (dBA)': d.noiseDb,
                  Status: d.status,
                  Petugas: d.officer,
                  'Ref Lab': d.labRef || '-',
                })),
                'DEM_Udara_Emisi_Kebisingan'
              )
            }
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-bg-2/80 border border-border-neon hover:border-neon-cyan/50 text-text-hi text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-neon-green" />
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="neon-btn-primary flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Input Pengujian Udara / Emisi
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-[11px] text-text-mid font-bold uppercase tracking-wider">
            <span>Kepatuhan Udara</span>
            <CheckCircle2 className="h-4 w-4 text-neon-green" />
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-neon-green mt-2">{kpis.compliancePct}%</p>
          <p className="text-[11px] text-text-low mt-1 font-mono">{kpis.total} titik pengukuran</p>
        </div>

        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-[11px] text-text-mid font-bold uppercase tracking-wider">
            <span>Rata-rata PM10</span>
            <Wind className="h-4 w-4 text-neon-cyan" />
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-text-hi mt-2">
            {kpis.avgPm10} <span className="text-xs text-text-mid">µg/Nm³</span>
          </p>
          <p className="text-[11px] text-text-low mt-1 font-mono">Baku Mutu PP 22/2021: ≤ 75 µg/Nm³</p>
        </div>

        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-[11px] text-text-mid font-bold uppercase tracking-wider">
            <span>Rata-rata Kebisingan</span>
            <Volume2 className="h-4 w-4 text-neon-amber" />
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-text-hi mt-2">
            {kpis.avgNoise} <span className="text-xs text-text-mid">dBA</span>
          </p>
          <p className="text-[11px] text-text-low mt-1 font-mono">Batas Area Industri: ≤ 70 dBA</p>
        </div>

        <div className="neon-card p-5">
          <div className="flex items-center justify-between text-[11px] text-text-mid font-bold uppercase tracking-wider">
            <span>Pelampauan Baku Mutu</span>
            <AlertTriangle className="h-4 w-4 text-neon-red" />
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums text-neon-red mt-2">{kpis.exceeded}</p>
          <p className="text-[11px] text-text-low mt-1">Kejadian Exceeded tercatat</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-text-hi uppercase tracking-wider mb-3 font-heading">
            Perbandingan Partikulat (PM10, PM2.5) &amp; Kebisingan
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                <XAxis dataKey="label" stroke={NEON_CHART.tickFill} fontSize={10} tickLine={false} />
                <YAxis stroke={NEON_CHART.tickFill} fontSize={10} tickLine={false} />
                <RechartsTooltip contentStyle={NEON_TOOLTIP_CONTENT_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: NEON_CHART.tickFill }} />
                <ReferenceLine
                  y={75}
                  stroke={NEON_CHART.red}
                  strokeDasharray="4 4"
                  label={{ value: 'Max PM10 (75)', position: 'insideTopRight', fill: NEON_CHART.red, fontSize: 9 }}
                />
                <Bar dataKey="PM10" fill={NEON_CHART.green} radius={[6, 6, 0, 0]} />
                <Bar dataKey="PM2.5" fill={NEON_CHART.cyan} radius={[6, 6, 0, 0]} />
                <Bar dataKey="Kebisingan (dBA)" fill={NEON_CHART.amber} radius={[6, 6, 0, 0]} />
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
              placeholder="Cari lokasi, petugas, atau nomor lab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 text-xs">
            <option value="ALL">Semua Kategori</option>
            <option value="Udara Ambien">Udara Ambien</option>
            <option value="Emisi Genset">Emisi Genset</option>
            <option value="Emisi Alat Berat">Emisi Alat Berat</option>
            <option value="Kebisingan">Kebisingan</option>
          </select>
        </div>

        <div className="overflow-x-auto max-h-[540px]">
          {isLoading ? (
            <TableSkeleton rows={5} columns={8} />
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={Wind}
              title="Belum ada data pemantauan udara, emisi, atau kebisingan"
              description="Catat pengukuran partikulat ambien, emisi genset/alat berat, dan tingkat kebisingan."
              actionLabel={canEdit ? 'Input Pengujian Udara / Emisi' : undefined}
              onAction={canEdit ? openCreate : undefined}
            />
          ) : (
            <table className="neon-table text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Kategori &amp; Lokasi</th>
                  <th className="p-3 text-right">PM10</th>
                  <th className="p-3 text-right">PM2.5</th>
                  <th className="p-3 text-right">TSP</th>
                  <th className="p-3 text-right">SO2 / NO2</th>
                  <th className="p-3 text-right">Bising (dBA)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-mono font-semibold text-text-hi tabular-nums">{item.date}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold text-neon-cyan uppercase font-mono">
                        {item.monitoringCategory}
                      </span>
                      <p className="font-bold text-text-hi">{item.location}</p>
                      <p className="text-[10px] text-text-mid">
                        Petugas: {item.officer} {item.labRef ? `• Lab: ${item.labRef}` : ''}
                      </p>
                    </td>
                    <td className={`p-3 text-right font-mono font-bold tabular-nums ${item.pm10 > 75 ? 'text-neon-red' : 'text-text-hi'}`}>
                      {item.pm10}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold tabular-nums ${item.pm25 > 55 ? 'text-neon-red' : 'text-text-hi'}`}>
                      {item.pm25}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold tabular-nums ${item.tsp > 230 ? 'text-neon-red' : 'text-text-hi'}`}>
                      {item.tsp}
                    </td>
                    <td className="p-3 text-right font-mono text-text-mid tabular-nums">
                      {item.so2} / {item.no2}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold tabular-nums ${item.noiseDb > 70 ? 'text-neon-red' : 'text-text-hi'}`}>
                      {item.noiseDb}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 rounded-lg cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!canDelete) return onUnauthorizedAction('Hapus Data Udara & Emisi');
                            setDeleteTarget(item);
                          }}
                          className="p-1.5 text-neon-red bg-neon-red/10 hover:bg-neon-red/20 border border-neon-red/30 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neon-cyan font-heading">
                  {editingId ? 'Edit Data Udara & Emisi' : 'Input Pemantauan Udara, Emisi & Kebisingan'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-1 text-text-mid hover:text-text-hi cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {errorMsg && (
                <div className="p-3 rounded-xl bg-neon-red/10 border border-neon-red/35 text-xs text-neon-red">
                  {errorMsg}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Tanggal</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kategori</label>
                    <select value={monitoringCategory} onChange={(e) => setMonitoringCategory(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="Udara Ambien">Udara Ambien</option>
                      <option value="Emisi Genset">Emisi Genset</option>
                      <option value="Emisi Alat Berat">Emisi Alat Berat</option>
                      <option value="Kebisingan">Kebisingan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Lokasi Pantau</label>
                    <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">PM10 (≤75)</label>
                    <input type="number" step="0.1" required value={pm10} onChange={(e) => setPm10(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">PM2.5 (≤55)</label>
                    <input type="number" step="0.1" required value={pm25} onChange={(e) => setPm25(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">TSP (≤230)</label>
                    <input type="number" step="0.1" required value={tsp} onChange={(e) => setTsp(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kebisingan (dBA)</label>
                    <input type="number" step="0.1" required value={noiseDb} onChange={(e) => setNoiseDb(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">SO2 (≤150)</label>
                    <input type="number" step="0.1" required value={so2} onChange={(e) => setSo2(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">NO2 (≤200)</label>
                    <input type="number" step="0.1" required value={no2} onChange={(e) => setNo2(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">CO (µg/Nm³)</label>
                    <input type="number" step="0.1" required value={co} onChange={(e) => setCo(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Ref Lab KAN</label>
                    <input type="text" value={labRef} onChange={(e) => setLabRef(e.target.value)} placeholder="Opsional" className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Petugas Pengambil Sampel</label>
                    <input type="text" required value={officer} onChange={(e) => setOfficer(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Catatan</label>
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-border-neon text-xs font-semibold text-text-mid hover:text-text-hi cursor-pointer"
                  >
                    Batal
                  </button>
                  <button type="submit" disabled={isSaving} className="neon-btn-primary px-5 py-2 rounded-xl text-xs cursor-pointer disabled:opacity-50">
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl max-w-sm w-full p-6 space-y-4">
              <h3 className="text-sm font-bold text-text-hi font-heading">Hapus Data Udara &amp; Emisi?</h3>
              <p className="text-xs text-text-mid">
                Hapus rekaman {deleteTarget.monitoringCategory} tanggal {deleteTarget.date} di {deleteTarget.location}?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-border-neon text-xs font-semibold text-text-mid hover:text-text-hi cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await airEmissionService.delete(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                  className="neon-btn-danger px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
