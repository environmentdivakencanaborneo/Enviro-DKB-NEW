/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import ModalPortal from './ModalPortal';
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
import { todayLocalISO } from '../utils/dateUtils';
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
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import {
  NEON_CHART,
  NEON_TOOLTIP_CONTENT_STYLE,
  NEON_TOOLTIP_LABEL_STYLE,
  NEON_TOOLTIP_ITEM_STYLE,
} from '../utils/chartTheme';

interface SolidWasteViewProps {
  solidWasteList: SolidWasteData[];
  onAdd: (item: any) => Promise<any>;
  onUpdate?: (id: string, item: any) => Promise<any>;
  onDelete: (id: string) => Promise<void>;
  targetPct?: number;
}

export default function SolidWasteView({
  solidWasteList,
  onAdd,
  onUpdate,
  onDelete,
  targetPct = 30
}: SolidWasteViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'generation' | 'processing'>('generation');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState('All');

  // EDIT STATE
  const [editingId, setEditingId] = useState<string | null>(null);

  // FORM STATES
  const [itemDate, setItemDate] = useState(todayLocalISO());
  const [itemSource, setItemSource] = useState('Kantor Utama');
  const [itemOrganic, setItemOrganic] = useState<number>(0);
  const [itemInorganic, setItemInorganic] = useState<number>(0);
  const [itemResidue, setItemResidue] = useState<number>(0);
  const [itemComposted, setItemComposted] = useState<number>(0);
  const [itemRecycled, setItemRecycled] = useState<number>(0);
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
    organic: NEON_CHART.green,
    inorganic: NEON_CHART.cyan,
    residue: NEON_CHART.red,
    composted: NEON_CHART.violet,
    recycled: NEON_CHART.amber
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
      // Reset values back to 0 on successful submission
      setItemOrganic(0);
      setItemInorganic(0);
      setItemResidue(0);
      setItemComposted(0);
      setItemRecycled(0);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-neon-green font-mono text-xs font-semibold tracking-widest uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse" />
            Pengelolaan Sampah Domestik &amp; Sejenis
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-text-hi tracking-tight mt-1 font-display">
            Aspek Pengolahan Sampah <span className="text-neon-cyan text-sm font-mono font-medium block md:inline md:ml-2">(UU No. 18 Tahun 2008; PP No. 81 Tahun 2012; Permen LHK No. 19 Tahun 2021)</span>
          </h1>
          <p className="text-xs text-text-mid mt-1 md:max-w-xl">
            Sistem pengawasan dan pelaporan timbulan sampah, optimalisasi pemilahan dari sumber, pengomposan organik, dan penanganan residu menuju zero waste PT Diva Kencana Borneo.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 md:self-center">
          <button
            onClick={() => { setFormType('generation'); setShowForm(true); }}
            className="neon-btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs md:text-sm cursor-pointer"
          >
            <Scale size={16} /> Catat Timbulan Sampah
          </button>
          <button
            onClick={() => { setFormType('processing'); setShowForm(true); }}
            className="flex items-center justify-center gap-2 bg-neon-green/15 hover:bg-neon-green/25 border border-neon-green/35 text-neon-green font-bold px-4 py-2.5 rounded-2xl transition-all cursor-pointer text-xs md:text-sm"
          >
            <Recycle size={16} /> Catat Pengolahan Sampah
          </button>
        </div>
      </div>

      {/* KPI Cards Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Generation Card */}
        <div className="neon-card p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-text-low uppercase tracking-wider font-mono">Total Timbulan</p>
              <h3 className="text-2xl font-bold text-text-hi mt-1.5 font-mono tabular-nums">{stats.totalGenerated.toLocaleString('id-ID')} <span className="text-sm font-normal text-text-mid">kg</span></h3>
            </div>
            <div className="bg-neon-cyan/10 border border-neon-cyan/25 text-neon-cyan p-2 rounded-xl">
              <Scale size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-border-subtle pt-2 text-text-mid">
            <span>Rerata per Record:</span>
            <span className="font-semibold font-mono tabular-nums text-text-hi">
              {filteredList.length > 0 ? (stats.totalGenerated / filteredList.length).toFixed(1) : 0} kg
            </span>
          </div>
        </div>

        {/* Processed/Composted KPI Card */}
        <div className="neon-card p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-text-low uppercase tracking-wider font-mono">Organik Terolah</p>
              <h3 className="text-2xl font-bold text-neon-green mt-1.5 font-mono tabular-nums">{stats.totalComposted.toLocaleString('id-ID')} <span className="text-sm font-normal text-text-mid">kg</span></h3>
            </div>
            <div className="bg-neon-green/10 border border-neon-green/25 text-neon-green p-2 rounded-xl">
              <Leaf size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-border-subtle pt-2 text-text-mid">
            <span>Menjadi Kompos/Pakan:</span>
            <span className="font-semibold font-mono tabular-nums text-neon-green">
              {stats.totalOrganic > 0 ? ((stats.totalComposted / stats.totalOrganic) * 100).toFixed(0) : 0}% Organik
            </span>
          </div>
        </div>

        {/* Recycled Trash KPI Card */}
        <div className="neon-card p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-text-low uppercase tracking-wider font-mono">Anorganik Terdaurulang</p>
              <h3 className="text-2xl font-bold text-neon-cyan mt-1.5 font-mono tabular-nums">{stats.totalRecycled.toLocaleString('id-ID')} <span className="text-sm font-normal text-text-mid">kg</span></h3>
            </div>
            <div className="bg-neon-cyan/10 border border-neon-cyan/25 text-neon-cyan p-2 rounded-xl">
              <Recycle size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] border-t border-border-subtle pt-2 text-text-mid">
            <span>Dikirim ke Bank Sampah:</span>
            <span className="font-semibold font-mono tabular-nums text-neon-cyan">
              {stats.totalInorganic > 0 ? ((stats.totalRecycled / stats.totalInorganic) * 100).toFixed(0) : 0}% Anorganik
            </span>
          </div>
        </div>

        {/* Reduction Percentage KPI Card */}
        <div className="neon-card p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-semibold text-text-low uppercase tracking-wider font-mono">Rasio Pengurangan</p>
              <h3 className="text-2xl font-bold text-text-hi mt-1.5 font-mono tabular-nums">
                {stats.recoveryRate.toFixed(1)}%
              </h3>
            </div>
            <div className="bg-neon-violet/10 border border-neon-violet/25 text-neon-violet p-2 rounded-xl">
              <ArrowRightLeft size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-bg-0 border border-border-subtle h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.recoveryRate >= targetPct ? 'bg-neon-green' : 'bg-neon-amber'
                }`}
                style={{ width: `${Math.min(stats.recoveryRate, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-text-mid mt-1.5" title="Target internal perusahaan (mengacu arah Jakstranas; perlu penetapan manajemen)">
              <span className="font-mono">Target internal: min {targetPct}%</span>
              <span className={`font-bold ${stats.recoveryRate >= targetPct ? 'text-neon-green' : 'text-neon-amber'}`}>
                {stats.recoveryRate >= targetPct ? 'Tercapai' : 'Di bawah target internal'}
              </span>
            </div>
            <p className="text-[9px] text-text-low mt-0.5 leading-tight">
              Target internal perusahaan (mengacu arah Jakstranas; perlu penetapan manajemen).
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Timeline Chart (Timbulan vs Terolah) */}
        <div className="lg:col-span-8 glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-text-hi uppercase tracking-wider font-display">Tren Bulanan Penanganan Sampah</h3>
            <p className="text-[11px] text-text-mid">Memetakan volume timbulan sampah total melawan rasio pengolahan organik &amp; pemilahan</p>
          </div>
          <div className="h-64 sm:h-72 w-full">
            {chartTimelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-low text-xs font-mono">
                Belum ada data visualisasi timeline. Masukkan rekaman data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                  <XAxis dataKey="date" stroke={NEON_CHART.axisStroke} tick={{ fill: NEON_CHART.tickFill }} fontSize={10} tickLine={false} />
                  <YAxis stroke={NEON_CHART.axisStroke} tick={{ fill: NEON_CHART.tickFill }} fontSize={10} tickLine={false} unit="kg" />
                  <RechartsTooltip 
                    contentStyle={NEON_TOOLTIP_CONTENT_STYLE}
                    labelStyle={NEON_TOOLTIP_LABEL_STYLE}
                    itemStyle={NEON_TOOLTIP_ITEM_STYLE}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: 'var(--theme-text-mid)' }} />
                  <Line type="monotone" dataKey="Timbulan (kg)" stroke={NEON_CHART.cyan} strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Terolah (kg)" stroke={NEON_CHART.green} strokeWidth={2.5} dot={{ r: 3.5 }} />
                  <Line type="monotone" dataKey="Sisa Residu (kg)" stroke={NEON_CHART.red} strokeWidth={1.75} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart (Characterization split) */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-text-hi uppercase tracking-wider font-display">Komposisi Karakteristik</h3>
            <p className="text-[11px] text-text-mid">Rasio jenis sampah dominan terpilah</p>
          </div>
          <div className="h-56 flex items-center justify-center relative">
            {pieData.length === 0 ? (
              <div className="text-text-low text-xs font-mono">Belum ada komposisi data</div>
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
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--theme-bg-1)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={NEON_TOOLTIP_CONTENT_STYLE}
                    itemStyle={NEON_TOOLTIP_ITEM_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-text-low font-semibold uppercase tracking-widest font-mono">Rasio</span>
                <span className="text-lg font-bold text-text-hi font-display">Terpilah</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-text-mid truncate">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-text-hi tabular-nums">
                  {stats.totalGenerated > 0 ? ((item.value / stats.totalGenerated) * 100).toFixed(0) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart (By Location Source) */}
      <div className="glass-panel p-5 rounded-2xl">
        <div className="mb-4 text-left">
          <h3 className="text-sm font-bold text-text-hi uppercase tracking-wider font-display">Perbandingan Timbulan vs Pengolahan Berdasarkan Sumber</h3>
          <p className="text-[11px] text-text-mid">Evaluasi efisiensi pengolahan (kompos &amp; daur ulang) di setiap unit operasional</p>
        </div>
        <div className="h-64 sm:h-72 w-full">
          {chartSourceData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-text-low text-xs font-mono">
              Belum ada data sebaran unit operasional.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSourceData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                <XAxis dataKey="source" stroke={NEON_CHART.axisStroke} tick={{ fill: NEON_CHART.tickFill }} fontSize={9} tickLine={false} />
                <YAxis stroke={NEON_CHART.axisStroke} tick={{ fill: NEON_CHART.tickFill }} fontSize={10} tickLine={false} unit="kg" />
                <RechartsTooltip 
                  contentStyle={NEON_TOOLTIP_CONTENT_STYLE}
                  labelStyle={NEON_TOOLTIP_LABEL_STYLE}
                  itemStyle={NEON_TOOLTIP_ITEM_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: '10px', color: 'var(--theme-text-mid)' }} />
                <Bar name="Organik Masuk (kg)" dataKey="organic" fill={NEON_CHART.green} radius={[4, 4, 0, 0]} />
                <Bar name="Anorganik Masuk (kg)" dataKey="inorganic" fill={NEON_CHART.cyan} radius={[4, 4, 0, 0]} />
                <Bar name="Kompos Terolah (kg)" dataKey="composted" fill={NEON_CHART.violet} radius={[4, 4, 0, 0]} />
                <Bar name="Daur Ulang (kg)" dataKey="recycled" fill={NEON_CHART.amber} radius={[4, 4, 0, 0]} />
                <Bar name="Residu ke TPA (kg)" dataKey="residue" fill={NEON_CHART.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Search and Filters & Records Section */}
      <div className="glass-panel rounded-2xl overflow-hidden text-left">
        <div className="p-5 border-b border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-text-hi tracking-tight font-display">Data Log Pengolahan Sampah</h3>
            <p className="text-[11px] text-text-mid">Diva Enviro Monitor (DEM) - Pengelolaan Timbulan Sampah Domestik</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Source select category filter */}
            <div className="relative">
              <select
                value={selectedSourceFilter}
                onChange={(e) => setSelectedSourceFilter(e.target.value)}
                className="w-full sm:w-48 text-xs px-3.5 py-2.5 appearance-none cursor-pointer pr-10"
              >
                <option value="All">Semua Sumber</option>
                {sourcesList.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-3 h-3.5 w-3.5 text-text-low pointer-events-none" />
            </div>

            {/* Keyword Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari petugas atau catatan..."
                className="w-full sm:w-60 text-xs pl-9 pr-4 py-2.5"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-text-low pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="neon-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Sumber Sampah</th>
                <th className="text-right">Timbulan (O / A / R)</th>
                <th className="text-right">Terolah (Komp / Rec)</th>
                <th className="text-center">Rasio Reduksi</th>
                <th>Nama Petugas</th>
                <th>Kendaraan</th>
                <th>Tujuan Akhir</th>
                <th>Keterangan</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      icon={Scale}
                      title="Belum Ada Data Log Pengolahan Sampah"
                      description="Silakan gunakan tombol Catat Timbulan Sampah atau Pengolahan Sampah di atas untuk menambah rekaman."
                    />
                  </td>
                </tr>
              ) : (
                filteredList.map(item => {
                  const gen = item.organicKg + item.inorganicKg + item.residueKg;
                  const processed = item.compostedKg + item.recycledKg;
                  const pct = gen > 0 ? (processed / gen) * 100 : 0;
                  return (
                    <tr key={item.id}>
                      <td className="font-mono text-text-mid font-semibold whitespace-nowrap">{item.date}</td>
                      <td className="font-semibold text-text-hi">
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-neon-cyan shrink-0" />
                          <span>{formatWasteSource(item.source)}</span>
                        </div>
                      </td>
                      <td className="text-right font-mono tabular-nums whitespace-nowrap" data-numeric="true">
                        <span className="text-neon-green font-bold">{item.organicKg}</span> / <span className="text-neon-cyan font-bold">{item.inorganicKg}</span> / <span className="text-neon-red font-bold">{item.residueKg}</span> <span className="text-[10px] text-text-low">kg</span>
                      </td>
                      <td className="text-right font-mono tabular-nums whitespace-nowrap" data-numeric="true">
                        <span className="text-neon-green font-semibold">{item.compostedKg}</span> / <span className="text-neon-cyan font-semibold">{item.recycledKg}</span> <span className="text-[10px] text-text-low">kg</span>
                      </td>
                      <td className="text-center">
                        <StatusBadge
                          status={pct >= targetPct ? 'Memenuhi' : 'Mendekati'}
                          label={`${pct.toFixed(0)}%`}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-text-low shrink-0" />
                          <span className="font-semibold text-text-hi">{item.officer}</span>
                        </div>
                      </td>
                      <td>
                        {item.transporterVehicle ? (
                          <div className="flex items-center gap-1.5 text-text-mid">
                            <Truck size={12} className="text-text-low shrink-0" />
                            <span>{item.transporterVehicle}</span>
                          </div>
                        ) : (
                          <span className="text-text-low italic">-</span>
                        )}
                      </td>
                      <td>
                        {item.finalDestination ? (
                          <div className="flex items-center gap-1.5 text-text-mid">
                            <MapPin size={12} className="text-text-low shrink-0" />
                            <span>{item.finalDestination}</span>
                          </div>
                        ) : (
                          <span className="text-text-low italic">-</span>
                        )}
                      </td>
                      <td className="max-w-xs truncate text-text-mid" title={item.notes || ''}>
                        {item.notes || '-'}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1.5 px-2.5 bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/25 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1 font-semibold"
                            title="Edit Record"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id)}
                            className="p-1.5 px-2.5 bg-neon-red/10 hover:bg-neon-red/20 text-neon-red border border-neon-red/25 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1 font-semibold"
                            title="Hapus Record"
                          >
                            <Trash2 size={12} />
                            Hapus
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

      {/* Record Input Modal Form Overlay */}
      {showForm && (
        <ModalPortal>
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-5 text-left shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${formType === 'generation' ? 'bg-neon-green/15 border-neon-green/30 text-neon-green' : 'bg-neon-cyan/15 border-neon-cyan/30 text-neon-cyan'}`}>
                  {formType === 'generation' ? <Scale className="h-5 w-5" /> : <Recycle className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-hi uppercase tracking-wider font-display">
                    {formType === 'generation' ? (editingId ? 'Edit Timbulan Sampah' : 'Catat Timbulan Sampah') : (editingId ? 'Edit Pengolahan Sampah' : 'Catat Pengolahan Sampah')}
                  </h3>
                  <p className="text-[10px] text-text-low font-mono tracking-widest uppercase">PERMEN LH NO.7 TAHUN 2025</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="text-text-mid hover:text-text-hi px-2.5 py-1 hover:bg-bg-2 rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Toggle form types within modal */}
            <div className="grid grid-cols-2 gap-2 bg-bg-0 p-1.5 rounded-2xl border border-border-subtle">
              <button
                type="button"
                onClick={() => { setFormType('generation'); setErrorMsg(''); }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  formType === 'generation'
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                    : 'text-text-mid hover:text-text-hi hover:bg-bg-2'
                }`}
              >
                <Scale size={14} /> Timbulan Sampah
              </button>
              <button
                type="button"
                onClick={() => { setFormType('processing'); setErrorMsg(''); }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  formType === 'processing'
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'text-text-mid hover:text-text-hi hover:bg-bg-2'
                }`}
              >
                <Recycle size={14} /> Pengolahan Sampah
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-neon-red/15 text-neon-red rounded-xl border border-neon-red/30 text-xs flex items-center gap-2">
                <Info size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-mid uppercase tracking-wider block">Tanggal Monitoring</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={itemDate}
                      onChange={(e) => setItemDate(e.target.value)}
                      required
                      className="w-full py-2.5 px-3.5 pr-10 text-xs font-mono"
                    />
                    <Calendar className="absolute right-3.5 top-3 h-4 w-4 text-text-low pointer-events-none" />
                  </div>
                </div>

                {/* Source Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-text-mid uppercase tracking-wider block">Sumber Asal Sampah</label>
                  <div className="relative">
                    <select
                      value={itemSource}
                      onChange={(e) => setItemSource(e.target.value)}
                      className="w-full py-2.5 px-3.5 text-xs appearance-none cursor-pointer pr-10"
                    >
                      {sourcesList.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-text-low pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Conditional Form Body fields */}
              {formType === 'generation' ? (
                /* SECTION 1: TIMBULAR SAMPAH */
                <div className="border-t border-border-subtle pt-3 animate-fade-in">
                  <h4 className="text-xs font-bold text-neon-green uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Scale size={13} /> Pengukuran Timbulan Sampah Masuk (kg)
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-text-mid block">Organik (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemOrganic}
                        onChange={(e) => setItemOrganic(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full py-2.5 px-3.5 text-xs text-right font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-text-mid block">Anorganik (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemInorganic}
                        onChange={(e) => setItemInorganic(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full py-2.5 px-3.5 text-xs text-right font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-text-mid block">Residu TPA (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemResidue}
                        onChange={(e) => setItemResidue(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full py-2.5 px-3.5 text-xs text-right font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-text-low mt-2 italic">
                    *Timbulan organik mencakup limbah makanan. Anorganik sisa kemasan. Residu untuk disposal TPA.
                  </p>
                </div>
              ) : (
                /* SECTION 2: PENGOLAHAN / REDUKSI */
                <div className="border-t border-border-subtle pt-3 animate-fade-in">
                  <h4 className="text-xs font-bold text-neon-cyan uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Recycle size={13} /> Pengolahan &amp; Reduksi Sampah Berjalan (kg)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-text-mid block">Dikompos / Biokonversi (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemComposted}
                        onChange={(e) => setItemComposted(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full py-2.5 px-3.5 text-xs text-right font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-text-mid block">Didaur-Ulang / Pilah Bank Sampah (kg)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={itemRecycled}
                        onChange={(e) => setItemRecycled(Math.max(0, parseFloat(e.target.value) || 0))}
                        required
                        className="w-full py-2.5 px-3.5 text-xs text-right font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-text-low mt-2 italic">
                    *Mencatatkan reduksi nyata sampah dari unit operasional via program komposting mandiri maupun bank sampah.
                  </p>
                </div>
              )}

              {/* Logistik, Petugas & Tujuan */}
              <div className="border-t border-border-subtle pt-3 space-y-3">
                <h4 className="text-[10px] font-bold text-neon-green uppercase tracking-widest flex items-center gap-1.5">
                  <Truck size={12} /> Logistik &amp; Personel Pengangkutan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-mid uppercase tracking-wider block">Nama Petugas *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemOfficer}
                        onChange={(e) => setItemOfficer(e.target.value)}
                        required
                        placeholder="Nama lengkap petugas..."
                        className="w-full py-2.5 px-3 pr-8 text-xs"
                      />
                      <User className="absolute right-2.5 top-3 h-3.5 w-3.5 text-text-low pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-mid uppercase tracking-wider block">Kendaraan Pengangkut</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemTransporterVehicle}
                        onChange={(e) => setItemTransporterVehicle(e.target.value)}
                        placeholder="Contoh: DT-05, Pick-Up..."
                        className="w-full py-2.5 px-3 pr-8 text-xs"
                      />
                      <Truck className="absolute right-2.5 top-3 h-3.5 w-3.5 text-text-low pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-mid uppercase tracking-wider block">Tujuan Akhir</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemFinalDestination}
                        onChange={(e) => setItemFinalDestination(e.target.value)}
                        placeholder="Contoh: TPA Regional, TPS3R..."
                        className="w-full py-2.5 px-3 pr-8 text-xs"
                      />
                      <MapPin className="absolute right-2.5 top-3 h-3.5 w-3.5 text-text-low pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-mid uppercase tracking-wider block">Catatan / Keterangan</label>
                <div className="relative">
                  <input
                    type="text"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder={formType === 'generation' ? "Contoh: Sisa katering kantin..." : "Contoh: Pemrosesan TPS3R..."}
                    className="w-full py-2.5 px-3.5 pr-10 text-xs animate-none"
                  />
                  <FileCheck className="absolute right-3.5 top-3 h-4 w-4 text-text-low pointer-events-none" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2.5 bg-bg-2 hover:bg-bg-1 border border-border-subtle text-text-mid text-xs rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="neon-btn-primary px-5 py-2.5 disabled:opacity-50 text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : (editingId ? 'Update Log' : 'Simpan Log')}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {deleteConfirm && (
        <ModalPortal>
          <div id="delete-confirm-modal-sw" className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="glass-panel rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-fade-in text-text-mid">
              <h3 className="text-sm font-bold text-text-hi flex items-center gap-2 font-display">
                <span className="p-1.5 rounded-lg bg-neon-red/15 text-neon-red">
                  <Trash2 size={16} />
                </span>
                Konfirmasi Hapus
              </h3>
              <p className="text-xs text-text-mid mt-3 leading-relaxed">
                {deleteConfirm.message}
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-bg-2 hover:bg-bg-1 border border-border-subtle text-text-mid font-bold transition-colors cursor-pointer"
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
                  className="neon-btn-danger px-3.5 py-2 rounded-xl text-xs cursor-pointer"
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
