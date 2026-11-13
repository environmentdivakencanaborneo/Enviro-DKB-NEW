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
  Wind,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  X
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
  onUnauthorizedAction
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

  // Evaluasi mengacu PP No. 22/2021 Lamp VII (PM10 <= 75, PM2.5 <= 55, TSP <= 230, SO2 <= 150, NO2 <= 200, CO <= 10000) & Kepmen LH 48/1996 (Kebisingan <= 70 dBA area tambang)
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
        Number(pm10), Number(pm25), Number(tsp), Number(so2), Number(no2), Number(co), Number(noiseDb)
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E4EDE6] shadow-sm">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#4D7C5A]">
            PP No. 22/2021 Lampiran VII &amp; Kepmen LH No. 48/1996
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <Wind className="h-6 w-6 text-[#2E4B3D]" />
            Kualitas Udara Ambien, Emisi &amp; Kebisingan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pemantauan partikulat debu (PM10, PM2.5, TSP), gas buang (SO2, NO2, CO), emisi genset/alat berat, serta tingkat kebisingan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Ekspor Excel
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#2E4B3D] hover:bg-[#233A2F] text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Input Pengujian Udara / Emisi
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Kepatuhan Udara</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-[#2E4B3D] mt-2">{kpis.compliancePct}%</p>
          <p className="text-[11px] text-slate-500 mt-1">{kpis.total} titik pengukuran</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Rata-rata PM10</span>
            <Wind className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{kpis.avgPm10} µg/Nm³</p>
          <p className="text-[11px] text-slate-500 mt-1">Baku Mutu PP 22/2021: ≤ 75 µg/Nm³</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Rata-rata Kebisingan</span>
            <Volume2 className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{kpis.avgNoise} dBA</p>
          <p className="text-[11px] text-slate-500 mt-1">Batas Area Industri: ≤ 70 dBA</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Pelampauan Baku Mutu</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{kpis.exceeded}</p>
          <p className="text-[11px] text-slate-500 mt-1">Kejadian Exceeded tercatat</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
            Perbandingan Partikulat (PM10, PM2.5) &amp; Kebisingan
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="PM10" fill="#2E4B3D" radius={[6, 6, 0, 0]} />
                <Bar dataKey="PM2.5" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Kebisingan (dBA)" fill="#E2A43B" radius={[6, 6, 0, 0]} />
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
              placeholder="Cari lokasi, petugas, atau nomor lab..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="Udara Ambien">Udara Ambien</option>
            <option value="Emisi Genset">Emisi Genset</option>
            <option value="Emisi Alat Berat">Emisi Alat Berat</option>
            <option value="Kebisingan">Kebisingan</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                <th className="p-3">Tanggal</th>
                <th className="p-3">Kategori &amp; Lokasi</th>
                <th className="p-3 text-center">PM10</th>
                <th className="p-3 text-center">PM2.5</th>
                <th className="p-3 text-center">TSP</th>
                <th className="p-3 text-center">SO2 / NO2</th>
                <th className="p-3 text-center">Bising (dBA)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400">Memuat data udara &amp; emisi...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-400">Belum ada data pemantauan udara, emisi, atau kebisingan.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono font-semibold text-slate-700">{item.date}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold text-[#2E4B3D] uppercase">{item.monitoringCategory}</span>
                      <p className="font-bold text-slate-800">{item.location}</p>
                      <p className="text-[10px] text-slate-500">Petugas: {item.officer} {item.labRef ? `• Lab: ${item.labRef}` : ''}</p>
                    </td>
                    <td className={`p-3 text-center font-mono font-bold ${item.pm10 > 75 ? 'text-rose-600' : 'text-slate-700'}`}>{item.pm10}</td>
                    <td className={`p-3 text-center font-mono font-bold ${item.pm25 > 55 ? 'text-rose-600' : 'text-slate-700'}`}>{item.pm25}</td>
                    <td className={`p-3 text-center font-mono font-bold ${item.tsp > 230 ? 'text-rose-600' : 'text-slate-700'}`}>{item.tsp}</td>
                    <td className="p-3 text-center font-mono text-slate-600">{item.so2} / {item.no2}</td>
                    <td className={`p-3 text-center font-mono font-bold ${item.noiseDb > 70 ? 'text-rose-600' : 'text-slate-700'}`}>{item.noiseDb}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'Safe' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.status === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {item.status === 'Safe' ? 'Aman' : item.status === 'Warning' ? 'Warning' : 'Over Limit'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                        <button
                          onClick={() => {
                            if (!canDelete) return onUnauthorizedAction('Hapus Data Udara & Emisi');
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
                  {editingId ? 'Edit Data Udara & Emisi' : 'Input Pemantauan Udara, Emisi & Kebisingan'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              {errorMsg && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{errorMsg}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tanggal</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kategori</label>
                    <select value={monitoringCategory} onChange={(e) => setMonitoringCategory(e.target.value as any)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                      <option value="Udara Ambien">Udara Ambien</option>
                      <option value="Emisi Genset">Emisi Genset</option>
                      <option value="Emisi Alat Berat">Emisi Alat Berat</option>
                      <option value="Kebisingan">Kebisingan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Lokasi Pantau</label>
                    <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">PM10 (≤75)</label>
                    <input type="number" step="0.1" required value={pm10} onChange={(e) => setPm10(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">PM2.5 (≤55)</label>
                    <input type="number" step="0.1" required value={pm25} onChange={(e) => setPm25(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">TSP (≤230)</label>
                    <input type="number" step="0.1" required value={tsp} onChange={(e) => setTsp(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kebisingan (dBA)</label>
                    <input type="number" step="0.1" required value={noiseDb} onChange={(e) => setNoiseDb(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">SO2 (≤150)</label>
                    <input type="number" step="0.1" required value={so2} onChange={(e) => setSo2(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">NO2 (≤200)</label>
                    <input type="number" step="0.1" required value={no2} onChange={(e) => setNo2(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">CO (µg/Nm³)</label>
                    <input type="number" step="0.1" required value={co} onChange={(e) => setCo(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ref Lab KAN</label>
                    <input type="text" value={labRef} onChange={(e) => setLabRef(e.target.value)} placeholder="Opsional" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Petugas Pengambil Sampel</label>
                    <input type="text" required value={officer} onChange={(e) => setOfficer(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Catatan</label>
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">Batal</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl bg-[#2E4B3D] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Hapus Data Udara &amp; Emisi?</h3>
              <p className="text-xs text-slate-500">Hapus rekaman {deleteTarget.monitoringCategory} tanggal {deleteTarget.date} di {deleteTarget.location}?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">Batal</button>
                <button onClick={async () => { await airEmissionService.delete(deleteTarget.id); setDeleteTarget(null); }} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer">Hapus</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
