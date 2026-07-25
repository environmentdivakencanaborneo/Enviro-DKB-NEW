/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { SolidWasteData } from '../types';
import { SOLID_WASTE_SOURCES, formatWasteSource } from '../constants/wasteSources';
import { 
  Plus, 
  Search, 
  Trash2, 
  Leaf, 
  ArrowRightLeft, 
  Recycle, 
  Scale, 
  Calendar, 
  Building, 
  User, 
  FileCheck, 
  Info,
  ChevronDown,
  Truck,
  MapPin,
  Pencil
} from 'lucide-react';

interface SolidWasteViewProps {
  solidWasteList: SolidWasteData[];
  onAdd: (item: any) => Promise<any>;
  onUpdate?: (id: string, item: any) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
}

export default function SolidWasteView({
  solidWasteList,
  onAdd,
  onUpdate,
  onDelete
}: SolidWasteViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'generation' | 'processing'>('generation');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('All');

  // EDIT STATE
  const [editingId, setEditingId] = useState<string | null>(null);

  // FORM STATES
  const [itemDate, setItemDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemSource, setItemSource] = useState('Kantor Utama');
  const [itemOrganic, setItemOrganic] = useState<number>(120);
  const [itemInorganic, setItemInorganic] = useState<number>(80);
  const [itemResidue, setItemResidue] = useState<number>(50);
  const [itemComposted, setItemComposted] = useState<number>(100);
  const [itemRecycled, setItemRecycled] = useState<number>(60);
  const [itemOfficer, setItemOfficer] = useState('');
  const [itemTransporterVehicle, setItemTransporterVehicle] = useState('');
  const [itemFinalDestination, setItemFinalDestination] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; message: string } | null>(null);

  const startEdit = (item: SolidWasteData) => {
    setEditingId(item.id);
    setItemDate(item.date);
    setItemSource(formatWasteSource(item.source));
    if (item.organicKg > 0 || item.inorganicKg > 0 || item.residueKg > 0) {
      setFormType('generation');
      setItemOrganic(item.organicKg);
      setItemInorganic(item.inorganicKg);
      setItemResidue(item.residueKg);
      setItemComposted(0);
      setItemRecycled(0);
    } else {
      setFormType('processing');
      setItemOrganic(0);
      setItemInorganic(0);
      setItemResidue(0);
      setItemComposted(item.compostedKg);
      setItemRecycled(item.recycledKg);
    }
    setItemOfficer(item.officer);
    setItemTransporterVehicle(item.transporterVehicle || '');
    setItemFinalDestination(item.finalDestination || '');
    setItemNotes(item.notes || '');
    setShowForm(true);
  };

  const sourcesList = SOLID_WASTE_SOURCES;

  // Map of colors for pie chart characterization
  const COLORS = {
    organic: '#10b981', // emerald
    inorganic: '#3b82f6', // blue
    residue: '#ef4444', // red
    composted: '#34d399', // soft emerald
    recycled: '#60a5fa' // soft blue
  };

  // Filter & Search Logic
  const filteredList = useMemo(() => {
    return solidWasteList.filter(item => {
      const formattedSrc = formatWasteSource(item.source);
      const matchSearch = 
        formattedSrc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.officer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchSource = selectedSourceFilter === 'All' || 
                          formattedSrc === selectedSourceFilter || 
                          item.source === selectedSourceFilter;
      return matchSearch && matchSource;
    });
  }, [solidWasteList, searchQuery, selectedSourceFilter]);

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    let totalOrganic = 0;
    let totalInorganic = 0;
    let totalResidue = 0;
    let totalComposted = 0;
    let totalRecycled = 0;

    filteredList.forEach(item => {
      totalOrganic += item.organicKg;
      totalInorganic += item.inorganicKg;
      totalResidue += item.residueKg;
      totalComposted += item.compostedKg;
      totalRecycled += item.recycledKg;
    });

    const totalGenerated = totalOrganic + totalInorganic + totalResidue;
    const totalProcessed = totalComposted + totalRecycled;
    const recoveryRate = totalGenerated > 0 ? (totalProcessed / totalGenerated) * 100 : 0;

    return {
      totalOrganic,
      totalInorganic,
      totalResidue,
      totalComposted,
      totalRecycled,
      totalGenerated,
      totalProcessed,
      recoveryRate
    };
  }, [filteredList]);

  // Charts data compilation
  const chartSourceData = useMemo(() => {
    // Group by source
    const grouped: { [key: string]: { source: string; organic: number; inorganic: number; residue: number; composted: number; recycled: number } } = {};
    
    filteredList.forEach(item => {
      const src = formatWasteSource(item.source);
      if (!grouped[src]) {
        grouped[src] = {
          source: src,
          organic: 0,
          inorganic: 0,
          residue: 0,
          composted: 0,
          recycled: 0
        };
      }
      grouped[src].organic += item.organicKg;
      grouped[src].inorganic += item.inorganicKg;
      grouped[src].residue += item.residueKg;
      grouped[src].composted += item.compostedKg;
      grouped[src].recycled += item.recycledKg;
    });

    return Object.values(grouped);
  }, [filteredList]);

  const chartTimelineData = useMemo(() => {
    // Sort chronological and take last 10 entries
    const sorted = [...filteredList].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.slice(-12).map(item => {
      const generated = item.organicKg + item.inorganicKg + item.residueKg;
      const processed = item.compostedKg + item.recycledKg;
      return {
        date: item.date,
        'Timbulan (kg)': generated,
        'Terolah (kg)': processed,
        'Organik (kg)': item.organicKg,
        'Anorganik (kg)': item.inorganicKg,
        'Sisa Residu (kg)': item.residueKg
      };
    });
  }, [filteredList]);

  const pieData = useMemo(() => {
    return [
      { name: 'Organik (Sisa Makanan/Daun)', value: stats.totalOrganic, color: COLORS.organic },
      { name: 'Anorganik (Daur Ulang/Plastik/Metal)', value: stats.totalInorganic, color: COLORS.inorganic },
      { name: 'Residu (Pembuangan TPA)', value: stats.totalResidue, color: COLORS.residue }
    ].filter(x => x.value > 0);
  }, [stats]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!itemOfficer.trim()) {
      setErrorMsg('Nama petugas pencatat wajib diisi.');
      return;
    }

    if (formType === 'generation') {
      if (itemOrganic <= 0 && itemInorganic <= 0 && itemResidue <= 0) {
        setErrorMsg('Harap masukkan setidaknya satu data timbulan sampah dengan jumlah positif.');
        return;
      }
    } else {
      if (itemComposted <= 0 && itemRecycled <= 0) {
        setErrorMsg('Harap masukkan setidaknya satu data pengolahan sampah dengan jumlah positif.');
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        date: itemDate,
        source: itemSource,
        organicKg: formType === 'generation' ? Number(itemOrganic) : 0,
        inorganicKg: formType === 'generation' ? Number(itemInorganic) : 0,
        residueKg: formType === 'generation' ? Number(itemResidue) : 0,
        compostedKg: formType === 'processing' ? Number(itemComposted) : 0,
        recycledKg: formType === 'processing' ? Number(itemRecycled) : 0,
        officer: itemOfficer.trim(),
        transporterVehicle: itemTransporterVehicle.trim() || '',
        finalDestination: itemFinalDestination.trim() || '',
        notes: itemNotes.trim() || ''
      };

      if (editingId) {
        if (onUpdate) {
          await onUpdate(editingId, payload);
        }
        setEditingId(null);
      } else {
        await onAdd(payload);
      }
      
      setItemOfficer('');
      setItemTransporterVehicle('');
      setItemFinalDestination('');
      setItemNotes('');
      // Reset values back to defaults on successful submission
      setItemOrganic(120);
      setItemInorganic(80);
      setItemResidue(50);
      setItemComposted(100);
      setItemRecycled(60);
      setShowForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({
      id,
      message: 'Apakah Anda yakin ingin menghapus data pengolahan sampah ini? Tindakan ini akan dicatat dalam Log Audit.'
    });
  };

  return (
    <div className="space-y-6 text-left">
      {/* Upper Title Section with Regulation context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-black/5 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-mono text-xs font-semibold tracking-widest uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Pengelolaan Sampah Domestik &amp; Sejenis
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Aspek Pengolahan Sampah <span className="text-emerald-500 text-sm font-mono font-medium block md:inline md:ml-2">(Permen LH No. 7 Tahun 2025)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 md:max-w-xl">
            Sistem pengawasan dan pelaporan timbulan sampah, optimalisasi pemilahan dari sumber, pengomposan organik, dan penanganan residu menuju zero waste PT Diva Kencana Borneo.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:self-center">
          <button
            onClick={() => { setFormType('generation'); setShowForm(true); }}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10 text-xs md:text-sm"
          >
            <Scale size={16} /> Catat Timbulan Sampah
          </button>
          <button
            onClick={() => { setFormType('processing'); setShowForm(true); }}
            className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-slate-900 font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-lg shadow-blue-500/10 text-xs md:text-sm"
          >
            <Recycle size={16} /> Catat Pengolahan Sampah
          </button>
        </div>
      </div>

      {/* KPI Cards Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Generation Card */}
        <div className="bg-white/60 border border-black/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Timbulan</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1.5">{stats.totalGenerated.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">kg</span></h3>
            </div>
            <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-xl">
              <Scale size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-black/5 pt-2 text-slate-500">
            <span>Rerata per Record:</span>
            <span className="font-semibold text-slate-600">
              {filteredList.length > 0 ? (stats.totalGenerated / filteredList.length).toFixed(1) : 0} kg
            </span>
          </div>
        </div>

        {/* Processed/Composted KPI Card */}
        <div className="bg-white/60 border border-black/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organik Terolah</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1.5">{stats.totalComposted.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">kg</span></h3>
            </div>
            <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-xl">
              <Leaf size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-black/5 pt-2 text-slate-500">
            <span>Menjadi Kompos/Pakan:</span>
            <span className="font-semibold text-emerald-600">
              {stats.totalOrganic > 0 ? ((stats.totalComposted / stats.totalOrganic) * 100).toFixed(0) : 0}% Organik
            </span>
          </div>
        </div>

        {/* Recycled Trash KPI Card */}
        <div className="bg-white/60 border border-black/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-blue-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Anorganik Terdaurulang</p>
              <h3 className="text-2xl font-black text-blue-600 mt-1.5">{stats.totalRecycled.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">kg</span></h3>
            </div>
            <div className="bg-blue-500/10 text-blue-600 p-2 rounded-xl">
              <Recycle size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-black/5 pt-2 text-slate-500">
            <span>Dikirim ke Bank Sampah:</span>
            <span className="font-semibold text-blue-600">
              {stats.totalInorganic > 0 ? ((stats.totalRecycled / stats.totalInorganic) * 100).toFixed(0) : 0}% Anorganik
            </span>
          </div>
        </div>

        {/* Reduction Percentage KPI Card */}
        <div className="bg-white/60 border border-black/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rasio Pengurangan</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1.5">
                {stats.recoveryRate.toFixed(1)}%
              </h3>
            </div>
            <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-xl">
              <ArrowRightLeft size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-black/5 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.recoveryRate >= 30 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(stats.recoveryRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 mt-1">
              <span>Target Permen LH: min 30%</span>
              <span className={`font-bold ${stats.recoveryRate >= 30 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {stats.recoveryRate >= 30 ? 'Tercapai' : 'Di bawah standar'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Timeline Chart (Timbulan vs Terolah) */}
        <div className="lg:col-span-8 bg-white/40 border border-black/5 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tren Bulanan Penanganan Sampah</h3>
            <p className="text-[11px] text-slate-500">Memetakan volume timbulan sampah total melawan rasio pengolahan organik &amp; pemilahan</p>
          </div>
          <div className="h-64 sm:h-72 w-full">
            {chartTimelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                Belum ada data visualisasi timeline. Masukkan rekaman data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} unit="kg" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="Timbulan (kg)" stroke="#ffffff" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Terolah (kg)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Sisa Residu (kg)" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart (Characterization split) */}
        <div className="lg:col-span-4 bg-white/40 border border-black/5 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Komposisi Karakteristik</h3>
            <p className="text-[11px] text-slate-500">Rasio jenis sampah dominan terpilah</p>
          </div>
          <div className="h-56 flex items-center justify-center relative">
            {pieData.length === 0 ? (
              <div className="text-slate-500 text-xs font-mono">Belum ada komposisi data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '11px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Rasio</span>
                <span className="text-lg font-black text-slate-900">Terpilah</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5 pt-2 border-t border-black/5">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-500 truncate">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-700">
                  {stats.totalGenerated > 0 ? ((item.value / stats.totalGenerated) * 100).toFixed(0) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart (By Location Source) */}
      <div className="bg-white/40 border border-black/5 p-5 rounded-2xl shadow-xl">
        <div className="mb-4 text-left">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Perbandingan Timbulan vs Pengolahan Berdasarkan Sumber</h3>
          <p className="text-[11px] text-slate-500">Evaluasi efisiensi pengolahan (kompos &amp; daur ulang) di setiap unit operasional</p>
        </div>
        <div className="h-64 sm:h-72 w-full">
          {chartSourceData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
              Belum ada data sebaran unit operasional.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSourceData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                <XAxis dataKey="source" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} unit="kg" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar name="Organik Masuk (kg)" dataKey="organic" fill="#10b981" />
                <Bar name="Anorganik Masuk (kg)" dataKey="inorganic" fill="#3b82f6" />
                <Bar name="Kompos Terolah (kg)" dataKey="composted" fill="#34d399" />
                <Bar name="Daur Ulang (kg)" dataKey="recycled" fill="#60a5fa" />
                <Bar name="Residu ke TPA (kg)" dataKey="residue" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Search and Filters & Records Section */}
      <div className="bg-white/40 border border-black/5 rounded-2xl shadow-xl overflow-hidden text-left">
        <div className="p-5 border-b border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Data Log Pengolahan Sampah</h3>
            <p className="text-[11px] text-slate-500">Diva Enviro Monitor (DEM) - Pengelolaan Timbulan Sampah Domestik</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Source select category filter */}
            <div className="relative">
              <select
                value={selectedSourceFilter}
                onChange={(e) => setSelectedSourceFilter(e.target.value)}
                className="w-full sm:w-48 bg-white/90 text-xs text-slate-600 px-3.5 py-2.5 rounded-xl border border-black/10 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer pr-10"
              >
                <option value="All">Semua Sumber</option>
                {sourcesList.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>

            {/* Keyword Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari petugas atau catatan..."
                className="w-full sm:w-60 bg-white/90 text-xs text-slate-600 pl-9 pr-4 py-2.5 rounded-xl border border-black/10 focus:outline-none focus:border-emerald-500"
              />
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-black/5 border-b border-black/5 text-slate-500 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-4 px-5">Tanggal</th>
                <th className="py-4 px-5">Sumber Sampah</th>
                <th className="py-4 px-4 text-right">Timbulan (O / A / R)</th>
                <th className="py-4 px-4 text-right">Terolah (Komp / Rec)</th>
                <th className="py-4 px-4 text-center">Rasio Reduksi</th>
                <th className="py-4 px-5">Nama Petugas</th>
                <th className="py-4 px-5">Kendaraan</th>
                <th className="py-4 px-5">Tujuan Akhir</th>
                <th className="py-4 px-5">Keterangan</th>
                <th className="py-4 px-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-600">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 font-mono text-xs">
                    Tidak ditemukan data log pengolahan sampah. Silakan gunakan tombol &quot;Mark Record Baru&quot; di atas.
                  </td>
                </tr>
              ) : (
                filteredList.map(item => {
                  const gen = item.organicKg + item.inorganicKg + item.residueKg;
                  const processed = item.compostedKg + item.recycledKg;
                  const pct = gen > 0 ? (processed / gen) * 100 : 0;
                  return (
                    <tr key={item.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                      <td className="py-3.5 px-5 font-mono text-slate-600 font-semibold">{item.date}</td>
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3 w-3 text-slate-500" />
                          {formatWasteSource(item.source)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        <span className="text-emerald-500 font-bold">{item.organicKg}</span> / <span className="text-blue-600 font-bold">{item.inorganicKg}</span> / <span className="text-red-600 font-bold">{item.residueKg}</span> <span className="text-[10px] text-slate-500">kg</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        <span className="text-emerald-600 font-semibold">{item.compostedKg}</span> / <span className="text-blue-300 font-semibold">{item.recycledKg}</span> <span className="text-[10px] text-slate-500">kg</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          pct >= 30 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-500'
                        }`}>
                          {pct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1">
                          <User size={11} className="text-slate-500" />
                          <span className="font-semibold text-slate-700">{item.officer}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {item.transporterVehicle ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Truck size={12} className="text-slate-500" />
                            <span>{item.transporterVehicle}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        {item.finalDestination ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin size={12} className="text-slate-500" />
                            <span>{item.finalDestination}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 max-w-xs truncate text-slate-500" title={item.notes || ''}>
                        {item.notes || '-'}
                      </td>
                      <td className="py-3.5 px-5 text-center flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1 px-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1"
                          title="Edit Record"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1"
                          title="Hapus Record"
                        >
                          <Trash2 size={12} />
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Input Modal Form Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-5 text-left border border-black/10 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-black/5 pb-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl text-slate-950 ${formType === 'generation' ? 'bg-emerald-500' : 'bg-blue-500 text-slate-900'}`}>
                  {formType === 'generation' ? <Scale className="h-5 w-5" /> : <Recycle className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                    {formType === 'generation' ? (editingId ? 'Edit Timbulan Sampah' : 'Catat Timbulan Sampah') : (editingId ? 'Edit Pengolahan Sampah' : 'Catat Pengolahan Sampah')}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">PERMEN LH NO.7 TAHUN 2025</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="text-slate-500 hover:text-slate-900 px-2 py-1 hover:bg-black/5 rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Toggle form types within modal */}
            <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-black/5">
              <button
                type="button"
                onClick={() => { setFormType('generation'); setErrorMsg(''); }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  formType === 'generation'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                }`}
              >
                <Scale size={14} /> Timbulan Sampah
              </button>
              <button
                type="button"
                onClick={() => { setFormType('processing'); setErrorMsg(''); }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  formType === 'processing'
                    ? 'bg-blue-500 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                }`}
              >
                <Recycle size={14} /> Pengolahan Sampah
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/15 text-red-600 rounded-xl border border-red-500/15 text-xs flex items-center gap-2">
                <Info size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tanggal Monitoring</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={itemDate}
                      onChange={(e) => setItemDate(e.target.value)}
                      required
                      className="w-full bg-white py-2.5 px-3.5 pr-10 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500"
                    />
                    <Calendar className="absolute right-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Source Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Sumber Asal Sampah</label>
                  <div className="relative">
                    <select
                      value={itemSource}
                      onChange={(e) => setItemSource(e.target.value)}
                      className="w-full bg-white py-2.5 px-3.5 text-xs text-slate-900 border border-black/10 rounded-xl appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer pr-10"
                    >
                      {sourcesList.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Conditional Form Body fields */}
              {formType === 'generation' ? (
                /* SECTION 1: TIMBULAR SAMPAH */
                <div className="border-t border-black/5 pt-3 animate-fade-in">
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Scale size={13} /> Pengukuran Timbulan Sampah Masuk (kg)
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 block">Organik (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemOrganic}
                        onChange={(e) => setItemOrganic(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full bg-white py-2.5 px-3.5 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500 text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 block">Anorganik (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemInorganic}
                        onChange={(e) => setItemInorganic(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full bg-white py-2.5 px-3.5 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500 text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 block">Residu TPA (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemResidue}
                        onChange={(e) => setItemResidue(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full bg-white py-2.5 px-3.5 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500 text-right"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2 italic">
                    *Timbulan organik mencakup limbah makanan. Anorganik sisa kemasan. Residu untuk disposal TPA.
                  </p>
                </div>
              ) : (
                /* SECTION 2: PENGOLAHAN / REDUKSI */
                <div className="border-t border-black/5 pt-3 animate-fade-in">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Recycle size={13} /> Pengolahan &amp; Reduksi Sampah Berjalan (kg)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 block">Dikompos / Biokonversi (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemComposted}
                        onChange={(e) => setItemComposted(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full bg-white py-2.5 px-3.5 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500 text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 block">Didaur-Ulang / Pilah Bank Sampah (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemRecycled}
                        onChange={(e) => setItemRecycled(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full bg-white py-2.5 px-3.5 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500 text-right"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-2 italic">
                    *Mencatatkan reduksi nyata sampah dari unit operasional via program komposting mandiri maupun bank sampah.
                  </p>
                </div>
              )}

              {/* Logistik, Petugas & Tujuan */}
              <div className="border-t border-black/5 pt-3 space-y-3">
                <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Truck size={12} /> Logistik &amp; Personel Pengangkutan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nama Petugas *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemOfficer}
                        onChange={(e) => setItemOfficer(e.target.value)}
                        required
                        placeholder="Nama lengkap petugas..."
                        className="w-full bg-white py-2.5 px-3 pr-8 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500"
                      />
                      <User className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kendaraan Pengangkut</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemTransporterVehicle}
                        onChange={(e) => setItemTransporterVehicle(e.target.value)}
                        placeholder="Contoh: DT-05, Pick-Up..."
                        className="w-full bg-white py-2.5 px-3 pr-8 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500"
                      />
                      <Truck className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tujuan Akhir</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemFinalDestination}
                        onChange={(e) => setItemFinalDestination(e.target.value)}
                        placeholder="Contoh: TPA Regional, TPS3R..."
                        className="w-full bg-white py-2.5 px-3 pr-8 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500"
                      />
                      <MapPin className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Catatan / Keterangan</label>
                <div className="relative">
                  <input
                    type="text"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder={formType === 'generation' ? "Contoh: Sisa katering kantin..." : "Contoh: Pemrosesan TPS3R..."}
                    className="w-full bg-white py-2.5 px-3.5 pr-10 text-xs text-slate-900 border border-black/10 rounded-xl focus:outline-none focus:border-emerald-500 animate-none"
                  />
                  <FileCheck className="absolute right-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end border-t border-black/5 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2.5 bg-black/5 hover:bg-black/10 text-slate-600 text-xs rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-5 py-2.5 disabled:opacity-50 text-slate-950 text-xs rounded-xl font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    formType === 'generation' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-500 hover:bg-blue-600 text-slate-900'
                  }`}
                >
                  {loading ? 'Menyimpan...' : (editingId ? 'Update Log' : 'Simpan Log')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div id="delete-confirm-modal-sw" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-fade-in text-slate-700">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1 rounded-lg bg-red-500/10 text-red-500">
                <Trash2 size={16} />
              </span>
              Konfirmasi Hapus
            </h3>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              {deleteConfirm.message}
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-2 rounded-xl text-xs bg-white hover:bg-slate-100 text-slate-600 font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const targetId = deleteConfirm.id;
                  setDeleteConfirm(null);
                  try {
                    await onDelete(targetId);
                  } catch (err: any) {
                    alert('Gagal menghapus data: ' + err.message);
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-500 text-slate-900 font-bold transition-colors cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
