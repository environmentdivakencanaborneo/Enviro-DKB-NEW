/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import { AmdTreatmentData } from '../types';
import { amdTreatmentService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  FlaskConical,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';

interface AmdTreatmentViewProps {
  data: AmdTreatmentData[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function AmdTreatmentView({
  data,
  isLoading,
  canEdit,
  canDelete,
  onUnauthorizedAction
}: AmdTreatmentViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Memenuhi' | 'Warning' | 'Tidak Memenuhi'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AmdTreatmentData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [date, setDate] = useState(todayLocalISO());
  const [location, setLocation] = useState('Settling Pond KPL-01');
  const [treatmentZone, setTreatmentZone] = useState('Zona Pengapuran Aktif');
  const [treatmentMethod, setTreatmentMethod] = useState<'Pengapuran Aktif' | 'Lahan Basah Buatan' | 'Hibrida'>('Pengapuran Aktif');
  const [inflowPh, setInflowPh] = useState<number>(4.2);
  const [outflowPh, setOutflowPh] = useState<number>(7.1);
  const [inflowDebitM3s, setInflowDebitM3s] = useState<number>(0.15);
  const [outflowDebitM3s, setOutflowDebitM3s] = useState<number>(0.14);
  const [limeKg, setLimeKg] = useState<number>(150);
  const [alumKg, setAlumKg] = useState<number>(25);
  const [activeLimeStockKg, setActiveLimeStockKg] = useState<number>(2500);
  const [officer, setOfficer] = useState('');
  const [notes, setNotes] = useState('');

  const evaluateAmdStatus = (phOut: number): 'Memenuhi' | 'Warning' | 'Tidak Memenuhi' => {
    if (phOut < 6.0 || phOut > 9.0) return 'Tidak Memenuhi';
    if (phOut < 6.3 || phOut > 8.7) return 'Warning';
    return 'Memenuhi';
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(todayLocalISO());
    setLocation('Settling Pond KPL-01');
    setTreatmentZone('Zona Pengapuran Aktif');
    setTreatmentMethod('Pengapuran Aktif');
    setInflowPh(4.2);
    setOutflowPh(7.1);
    setInflowDebitM3s(0.15);
    setOutflowDebitM3s(0.14);
    setLimeKg(0);
    setAlumKg(0);
    setActiveLimeStockKg(0);
    setOfficer('');
    setNotes('');
    setErrorMsg(null);
  };

  const openCreate = () => {
    if (!canEdit) return onUnauthorizedAction('Tambah Data Treatment AAT');
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: AmdTreatmentData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Data Treatment AAT');
    setEditingId(item.id);
    setDate(item.date);
    setLocation(item.location);
    setTreatmentZone(item.treatmentZone);
    setTreatmentMethod(item.treatmentMethod || 'Pengapuran Aktif');
    setInflowPh(item.inflowPh);
    setOutflowPh(item.outflowPh);
    setInflowDebitM3s(item.inflowDebitM3s);
    setOutflowDebitM3s(item.outflowDebitM3s);
    setLimeKg(item.limeKg);
    setAlumKg(item.alumKg);
    setActiveLimeStockKg(item.activeLimeStockKg ?? 0);
    setOfficer(item.officer);
    setNotes(item.notes || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Data Treatment AAT');
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const payload: Omit<AmdTreatmentData, 'id'> = {
        date,
        location: location.trim(),
        treatmentZone: treatmentZone.trim(),
        treatmentMethod,
        inflowPh: Number(inflowPh),
        outflowPh: Number(outflowPh),
        inflowDebitM3s: Number(inflowDebitM3s),
        outflowDebitM3s: Number(outflowDebitM3s),
        limeKg: Number(limeKg),
        alumKg: Number(alumKg),
        activeLimeStockKg: Number(activeLimeStockKg) || 0,
        complianceStatus: evaluateAmdStatus(Number(outflowPh)),
        officer: officer.trim(),
        notes: notes.trim() || undefined,
      };
      if (editingId) {
        await amdTreatmentService.update(editingId, payload);
      } else {
        await amdTreatmentService.add(payload);
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan data treatment AAT.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchQuery =
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.treatmentZone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.officer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || item.complianceStatus === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const kpis = useMemo(() => {
    const total = data.length;
    const compliant = data.filter((d) => d.complianceStatus === 'Memenuhi').length;
    const totalLime = data.reduce((s, d) => s + (d.limeKg || 0), 0);
    const totalAlum = data.reduce((s, d) => s + (d.alumKg || 0), 0);
    const avgInPh = total > 0 ? (data.reduce((s, d) => s + d.inflowPh, 0) / total).toFixed(2) : '0.00';
    const avgOutPh = total > 0 ? (data.reduce((s, d) => s + d.outflowPh, 0) / total).toFixed(2) : '0.00';
    const latestLimeStock = data[0]?.activeLimeStockKg ?? 0;
    return {
      total,
      compliancePct: total > 0 ? Math.round((compliant / total) * 100) : 0,
      totalLime,
      totalAlum,
      avgInPh,
      avgOutPh,
      latestLimeStock,
    };
  }, [data]);

  const chartData = useMemo(() => {
    return [...filteredData]
      .slice(0, 14)
      .reverse()
      .map((d) => ({
        date: d.date,
        'pH Inflow': d.inflowPh,
        'pH Outflow': d.outflowPh,
        'Kapur (kg)': d.limeKg,
      }));
  }, [filteredData]);

  const handleExport = () => {
    exportToExcel(
      filteredData.map((d) => ({
        ID: d.id,
        Tanggal: d.date,
        Lokasi: d.location,
        'Zona Treatment': d.treatmentZone,
        'Metode Pengolahan': d.treatmentMethod || 'Pengapuran Aktif',
        'pH Inflow': d.inflowPh,
        'pH Outflow': d.outflowPh,
        'Debit Inflow (m³/s)': d.inflowDebitM3s,
        'Debit Outflow (m³/s)': d.outflowDebitM3s,
        'Dosis Kapur (kg)': d.limeKg,
        'Dosis Tawas (kg)': d.alumKg,
        'Stok Kapur (kg)': d.activeLimeStockKg ?? 0,
        Status: d.complianceStatus,
        Petugas: d.officer,
        Catatan: d.notes || '-',
      })),
      'DEM_Treatment_AAT'
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E4EDE6] shadow-sm">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#4D7C5A]">
            Pengendalian Air Asam Tambang (Kepmen LH 113/2003 · Permen LHK 5/2022)
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2.5">
            <FlaskConical className="h-6 w-6 text-[#2E4B3D]" />
            Pengolahan Air Asam Tambang (AAT) &amp; Lahan Basah Buatan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pemantauan efektivitas netralisasi pH inflow vs outflow (Pengapuran Aktif, Lahan Basah Buatan, Hibrida) sesuai Permen LHK No. 5 Tahun 2022.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExport}
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
            Catat Treatment AAT
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Efektivitas Netralisasi</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-[#2E4B3D] mt-2">{kpis.compliancePct}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Outflow memenuhi pH 6.0 – 9.0 ({kpis.total} sesi)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Rata-rata pH In → Out</span>
            <Droplets className="h-4 w-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            <span className="text-rose-600">{kpis.avgInPh}</span> → <span className="text-emerald-600">{kpis.avgOutPh}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Perbandingan keasaman inlet &amp; outlet KPL</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Total Pemakaian Kapur</span>
            <FlaskConical className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{kpis.totalLime.toLocaleString('id-ID')} kg</p>
          <p className="text-[11px] text-slate-500 mt-1">Tawas / Flokulan: {kpis.totalAlum.toLocaleString('id-ID')} kg</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E4EDE6] shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase">
            <span>Stok Kapur Terkini</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{kpis.latestLimeStock.toLocaleString('id-ID')} kg</p>
          <p className="text-[11px] text-slate-500 mt-1">Inventaris gudang kapur zona aktif</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Grafik Netralisasi pH Inflow vs Outflow &amp; Dosis Kapur
              </h3>
              <p className="text-[11px] text-slate-500">14 catatan treatment AAT terbaru</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 14]} fontSize={10} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine yAxisId="left" y={6} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'pH Min 6.0', fontSize: 9, fill: '#EF4444' }} />
                <ReferenceLine yAxisId="left" y={9} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'pH Max 9.0', fontSize: 9, fill: '#EF4444' }} />
                <Line yAxisId="left" type="monotone" dataKey="pH Inflow" stroke="#E11D48" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="left" type="monotone" dataKey="pH Outflow" stroke="#2E4B3D" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="Kapur (kg)" stroke="#E2A43B" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter & Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari lokasi pond, zona, atau petugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4D7C5A]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700"
          >
            <option value="ALL">Semua Status</option>
            <option value="Memenuhi">Memenuhi Baku Mutu</option>
            <option value="Warning">Warning</option>
            <option value="Tidak Memenuhi">Tidak Memenuhi</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                <th className="p-3">Tanggal</th>
                <th className="p-3">Lokasi &amp; Zona Treatment</th>
                <th className="p-3 text-center">pH In → Out</th>
                <th className="p-3 text-center">Debit In / Out</th>
                <th className="p-3 text-right">Kapur (kg)</th>
                <th className="p-3 text-right">Tawas (kg)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Memuat data treatment AAT...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400">Belum ada data pengelolaan Air Asam Tambang.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-mono font-semibold text-slate-700">{item.date}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{item.location}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.treatmentZone} · <span className="font-semibold text-[#2E4B3D]">{item.treatmentMethod || 'Pengapuran Aktif'}</span> · Petugas: {item.officer}
                      </p>
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span className="text-rose-600">{item.inflowPh}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className={item.outflowPh < 6 || item.outflowPh > 9 ? 'text-rose-600' : 'text-emerald-700'}>{item.outflowPh}</span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {item.inflowDebitM3s} / {item.outflowDebitM3s} m³/s
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">{item.limeKg.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right font-mono">{item.alumKg.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.complianceStatus === 'Memenuhi' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.complianceStatus === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {item.complianceStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (!canDelete) return onUnauthorizedAction('Hapus Data Treatment AAT');
                            setDeleteTarget(item);
                          }}
                          className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
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

      {/* Form Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#2E4B3D]">
                  {editingId ? 'Edit Data Treatment AAT' : 'Input Data Pengelolaan AAT & Pengapuran'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {errorMsg && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{errorMsg}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tanggal</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Lokasi Pond / Pit</label>
                    <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Zona Treatment</label>
                    <input type="text" required value={treatmentZone} onChange={(e) => setTreatmentZone(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Metode (Permen LHK 5/2022)</label>
                    <select
                      value={treatmentMethod}
                      onChange={(e) => setTreatmentMethod(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white"
                    >
                      <option value="Pengapuran Aktif">Pengapuran Aktif</option>
                      <option value="Lahan Basah Buatan">Lahan Basah Buatan</option>
                      <option value="Hibrida">Hibrida</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">pH Inflow</label>
                    <input type="number" step="0.01" required value={inflowPh} onChange={(e) => setInflowPh(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">pH Outflow</label>
                    <input type="number" step="0.01" required value={outflowPh} onChange={(e) => setOutflowPh(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Debit In (m³/s)</label>
                    <input type="number" step="0.001" required value={inflowDebitM3s} onChange={(e) => setInflowDebitM3s(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Debit Out (m³/s)</label>
                    <input type="number" step="0.001" required value={outflowDebitM3s} onChange={(e) => setOutflowDebitM3s(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Dosis Kapur (kg)</label>
                    <input type="number" step="0.1" required value={limeKg} onChange={(e) => setLimeKg(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Dosis Tawas (kg)</label>
                    <input type="number" step="0.1" required value={alumKg} onChange={(e) => setAlumKg(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Stok Kapur (kg)</label>
                    <input type="number" step="0.1" value={activeLimeStockKg} onChange={(e) => setActiveLimeStockKg(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Petugas</label>
                    <input type="text" required value={officer} onChange={(e) => setOfficer(e.target.value)} placeholder="Nama Petugas" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Catatan Teknis</label>
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" placeholder="Catatan kondisi kolam, dosis, atau cuaca..." />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-600">
                    Status Otomatis: <span className="text-[#2E4B3D]">{evaluateAmdStatus(Number(outflowPh))}</span>
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">Batal</button>
                    <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl bg-[#2E4B3D] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
                      {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Hapus Data Treatment AAT?</h3>
              <p className="text-xs text-slate-500">Data treatment tanggal {deleteTarget.date} di {deleteTarget.location} akan dihapus permanen.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer">Batal</button>
                <button
                  onClick={async () => {
                    await amdTreatmentService.delete(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
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
