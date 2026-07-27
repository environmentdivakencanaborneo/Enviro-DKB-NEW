/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EnvironmentalCost } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Coins, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle, 
  Calendar,
  Layers,
  FileSpreadsheet,
  Pencil
} from 'lucide-react';

interface EnvironmentalCostsViewProps {
  costs: EnvironmentalCost[];
  onAddCost: (item: Omit<EnvironmentalCost, 'id'>) => void;
  onUpdateCost?: (id: string, item: Omit<EnvironmentalCost, 'id'>) => void;
  onDeleteCost: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  onUnauthorizedAction: (actionName: string) => void;
}

export default function EnvironmentalCostsView({
  costs,
  onAddCost,
  onUpdateCost,
  onDeleteCost,
  canEdit,
  canDelete,
  onUnauthorizedAction
}: EnvironmentalCostsViewProps) {
  const allowed = canEdit ?? false;
  const allowedDelete = canDelete ?? false;
  const [showCostForm, setShowCostForm] = useState(false);
  const [formTab, setFormTab] = useState<'rencana' | 'realisasi'>('rencana');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('2026');

  // EDIT STATE
  const [editingCostId, setEditingCostId] = useState<string | null>(null);

  // Form Fields
  const [cYear, setCYear] = useState<number>(2026);
  const [cPeriod, setCPeriod] = useState<string>('Januari');
  const [cCategory, setCCategory] = useState<string>('Pemantauan Kualitas Lingkungan');
  const [costType, setCostType] = useState<'OPEX' | 'CAPEX'>('OPEX');
  const [cNominal, setCNominal] = useState<string>('');
  const [cNotes, setCNotes] = useState<string>('');
  const [cOfficer, setCOfficer] = useState<string>('');

  const categories = [
    "Pemantauan Kualitas Lingkungan",
    "Reklamasi & Revegetasi",
    "Pengelolaan Limbah Terpadu",
    "Water Treatment (KPL)",
    "Izin LH & Administrasi"
  ];

  const periods = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember"
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const startEditCost = (item: EnvironmentalCost) => {
    setEditingCostId(item.id);
    setCYear(item.year);
    setCPeriod(item.period);
    setCCategory(item.category);
    
    // Check if it's planned or realized
    const isPlanned = item.plannedOpex > 0 || item.plannedCapex > 0;
    if (isPlanned) {
      setFormTab('rencana');
      setCostType(item.plannedOpex > 0 ? 'OPEX' : 'CAPEX');
      setCNominal(String(item.plannedOpex > 0 ? item.plannedOpex : item.plannedCapex));
    } else {
      setFormTab('realisasi');
      setCostType(item.realizedOpex > 0 ? 'OPEX' : 'CAPEX');
      setCNominal(String(item.realizedOpex > 0 ? item.realizedOpex : item.realizedCapex));
    }
    setCNotes(item.notes || '');
    setCOfficer(item.officer);
    setShowCostForm(true);
  };

  const handleCostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowed) return onUnauthorizedAction("Simpan Biaya Lingkungan");
    if (!cOfficer.trim()) {
      alert("Masukkan nama petugas / PIC pengisi anggaran.");
      return;
    }

    const valueNum = Number(cNominal) || 0;

    const payload = formTab === 'rencana' ? {
      year: Number(cYear),
      period: cPeriod,
      category: cCategory,
      plannedOpex: costType === 'OPEX' ? valueNum : 0,
      plannedCapex: costType === 'CAPEX' ? valueNum : 0,
      realizedOpex: editingCostId ? (costs.find(x => x.id === editingCostId)?.realizedOpex || 0) : 0,
      realizedCapex: editingCostId ? (costs.find(x => x.id === editingCostId)?.realizedCapex || 0) : 0,
      notes: cNotes.trim() || undefined,
      officer: cOfficer.trim()
    } : {
      year: Number(cYear),
      period: cPeriod,
      category: cCategory,
      plannedOpex: editingCostId ? (costs.find(x => x.id === editingCostId)?.plannedOpex || 0) : 0,
      plannedCapex: editingCostId ? (costs.find(x => x.id === editingCostId)?.plannedCapex || 0) : 0,
      realizedOpex: costType === 'OPEX' ? valueNum : 0,
      realizedCapex: costType === 'CAPEX' ? valueNum : 0,
      notes: cNotes.trim() || undefined,
      officer: cOfficer.trim()
    };

    if (editingCostId) {
      if (onUpdateCost) {
        onUpdateCost(editingCostId, payload);
      }
      setEditingCostId(null);
    } else {
      onAddCost(payload);
    }

    // Reset Form fields
    setCNominal('');
    setCNotes('');
    setCOfficer('');
    setShowCostForm(false);
  };

  // Calculations for KPI Cards
  const filteredCosts = costs.filter(x => {
    const matchesSearch = x.category.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          (x.notes || '').toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = categoryFilter === '' || x.category === categoryFilter;
    const matchesYear = yearFilter === '' || String(x.year) === yearFilter;
    return matchesSearch && matchesCategory && matchesYear;
  });

  const totalOpexPlanned = filteredCosts.reduce((sum, x) => sum + x.plannedOpex, 0);
  const totalOpexRealized = filteredCosts.reduce((sum, x) => sum + x.realizedOpex, 0);
  const totalCapexPlanned = filteredCosts.reduce((sum, x) => sum + x.plannedCapex, 0);
  const totalCapexRealized = filteredCosts.reduce((sum, x) => sum + x.realizedCapex, 0);

  const overallBudgetPlanned = totalOpexPlanned + totalCapexPlanned;
  const overallBudgetRealized = totalOpexRealized + totalCapexRealized;

  const opexPercentage = totalOpexPlanned > 0 ? (totalOpexRealized / totalOpexPlanned) * 100 : 0;
  const capexPercentage = totalCapexPlanned > 0 ? (totalCapexRealized / totalCapexPlanned) * 100 : 0;
  const overallPercentage = overallBudgetPlanned > 0 ? (overallBudgetRealized / overallBudgetPlanned) * 100 : 0;

  // Prepare simple visual stats grouped by category
  const categorySummary = categories.map(cat => {
    const catItems = filteredCosts.filter(x => x.category === cat);
    const plan = catItems.reduce((sum, x) => sum + x.plannedOpex + x.plannedCapex, 0);
    const realized = catItems.reduce((sum, x) => sum + x.realizedOpex + x.realizedCapex, 0);
    return { name: cat, plan, realized };
  }).filter(c => c.plan > 0 || c.realized > 0);

  return (
    <div id="environmental-costs-dashboard" className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-600" />
            Biaya Pengelolaan Lingkungan Hidup
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen alokasi budget Rencana vs Realisasi OPEX & CAPEX pengelolaan tambang batubara (PT Diva Kencana Borneo)
          </p>
        </div>

        <button 
          id="btn-add-environmental-cost"
          onClick={() => setShowCostForm(!showCostForm)}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          {showCostForm ? "Tutup Form" : "Entri Anggaran & Realisasi"}
        </button>
      </div>

      {/* Slide down Input Form */}
      {showCostForm && (
        <div className="bg-white shadow-sm p-6 rounded-2xl text-left space-y-5 animate-slide-down border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {editingCostId ? 'Edit Anggaran & Realisasi Lingkungan' : 'Entri Anggaran Pengelolaan Lingkungan'}
              </h4>
            </div>
            
            {/* Split Form Switcher Tabs */}
            <div className="flex p-1 bg-white rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFormTab('rencana')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formTab === 'rencana'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Form Rencana (Budget)
              </button>
              <button
                type="button"
                onClick={() => setFormTab('realisasi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formTab === 'realisasi'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Form Realisasi (Spending)
              </button>
            </div>
          </div>

          <form onSubmit={handleCostSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Year field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tahun Anggaran</label>
                <select 
                  value={cYear}
                  onChange={(e) => setCYear(Number(e.target.value))}
                  className="w-full bg-white border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value={2026} className="bg-white">2026</option>
                  <option value={2027} className="bg-white">2027</option>
                  <option value={2028} className="bg-white">2028</option>
                </select>
              </div>

              {/* Monthly Period field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Bulan Pelaporan</label>
                <select 
                  value={cPeriod}
                  onChange={(e) => setCPeriod(e.target.value)}
                  className="w-full bg-white border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {periods.map(p => (
                    <option key={p} value={p} className="bg-white">{p}</option>
                  ))}
                </select>
              </div>

              {/* Category field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Kategori Anggaran</label>
                <select 
                  value={cCategory}
                  onChange={(e) => setCCategory(e.target.value)}
                  className="w-full bg-white border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  {categories.map(c => (
                    <option key={c} value={c} className="bg-white">{c}</option>
                  ))}
                </select>
              </div>

              {/* Jenis Klasifikasi Biaya (Dropdown) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Jenis Biaya</label>
                <select 
                  value={costType}
                  onChange={(e) => setCostType(e.target.value as 'OPEX' | 'CAPEX')}
                  className={`w-full bg-white border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none transition-colors ${
                    formTab === 'rencana' ? 'focus:border-emerald-500' : 'focus:border-amber-500'
                  }`}
                >
                  <option value="OPEX" className="bg-white">OPEX (Biaya Operasional Kegiatan)</option>
                  <option value="CAPEX" className="bg-white">CAPEX (Investasi Aset / Infrastruktur)</option>
                </select>
              </div>

              {/* Nominal Biaya */}
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                  formTab === 'rencana' ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'
                }`}>
                  Nominal {formTab === 'rencana' ? 'Rencana' : 'Realisasi'} (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-semibold">Rp</span>
                  <input 
                    type="number"
                    value={cNominal}
                    onChange={(e) => setCNominal(e.target.value)}
                    placeholder={formTab === 'rencana' ? "Masukkan nominal rencana..." : "Masukkan nominal realisasi..."}
                    required
                    className={`w-full bg-white border-slate-200 rounded-xl pl-8 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none transition-colors ${
                      formTab === 'rencana' ? 'focus:border-emerald-500' : 'focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>

              {/* Officer */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Petugas PIC Anggaran</label>
                <input 
                  type="text"
                  value={cOfficer}
                  onChange={(e) => setCOfficer(e.target.value)}
                  placeholder="cth. Aditya Perkasa"
                  required
                  className="w-full bg-white border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Notes field */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Keterangan Anggaran</label>
                <input 
                  type="text"
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  placeholder="Tambahkan penjelasan rinci mengenai kegiatan atau tujuan pembiayaan..."
                  className="w-full bg-white border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-black/5 flex justify-end gap-3">
              <button
                type="button" 
                onClick={() => setShowCostForm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-black/5 rounded-xl text-xs text-slate-600 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit" 
                className={`px-5 py-2 font-bold text-xs rounded-xl transition-all shadow-lg cursor-pointer text-slate-950 ${
                  formTab === 'rencana' 
                    ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/10' 
                    : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/10'
                }`}
              >
                {formTab === 'rencana' ? 'Simpan Rencana Anggaran' : 'Simpan Realisasi Pengeluaran'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* OPEX CARD */}
        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Biaya Kegiatan (OPEX)</span>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-500/15 px-2 py-0.5 rounded-full">
              {opexPercentage.toFixed(1)}% Realized
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">REALISASI PENYALURAN</p>
            <h3 className="text-xl font-bold font-sans text-slate-800">
              {formatCurrency(totalOpexRealized)}
            </h3>
            <p className="text-[11px] text-slate-500">
              Rencana Anggaran: <span className="font-semibold text-slate-600">{formatCurrency(totalOpexPlanned)}</span>
            </p>
          </div>

          {/* Simple percentage bar */}
          <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, opexPercentage)}%` }}
            />
          </div>
        </div>

        {/* CAPEX CARD */}
        <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Investasi Aset (CAPEX)</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full">
              {capexPercentage.toFixed(1)}% Realized
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">REALISASI PENYALURAN</p>
            <h3 className="text-xl font-bold font-sans text-slate-800">
              {formatCurrency(totalCapexRealized)}
            </h3>
            <p className="text-[11px] text-slate-500">
              Rencana Anggaran: <span className="font-semibold text-slate-600">{formatCurrency(totalCapexPlanned)}</span>
            </p>
          </div>

          {/* Simple percentage bar */}
          <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, capexPercentage)}%` }}
            />
          </div>
        </div>

        {/* TOTAL BUDGET CARD */}
        <div className="bg-white border-slate-200 shadow-sm p-5 rounded-2xl border border-emerald-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-[-25px] right-[-25px] h-20 w-20 bg-emerald-500/5 blur-xl rounded-full" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
                <Coins className="h-4 w-4" />
              </div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Total Biaya Lingkungan</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              overallPercentage > 100 ? 'bg-red-500/15 text-red-600' : 'bg-emerald-500/15 text-emerald-600'
            }`}>
              {overallPercentage > 100 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {overallPercentage.toFixed(1)}% Alokasi
            </span>
          </div>

          <div className="my-3 text-left">
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">TOTAL REALISASI TAMBANG</p>
            <h3 className="text-2xl font-black font-sans text-emerald-600">
              {formatCurrency(overallBudgetRealized)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Rencana Pagu: <span className="font-bold text-slate-700">{formatCurrency(overallBudgetPlanned)}</span>
            </p>
          </div>

          {/* Combined progress */}
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  overallPercentage > 100 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-1">
              <span>SISA ALOKASI TERPAKAI</span>
              <span className={overallBudgetPlanned < overallBudgetRealized ? 'text-red-600 font-semibold' : 'text-emerald-600'}>
                {overallBudgetPlanned >= overallBudgetRealized 
                  ? `${formatCurrency(overallBudgetPlanned - overallBudgetRealized)} tersisa`
                  : `Over Budget ${formatCurrency(overallBudgetRealized - overallBudgetPlanned)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown and Visual charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Budget Share graph bar */}
        <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl text-left space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Breakdown Berdasarkan Kategori</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Kumulatif Budget: Planned vs Realized tiap segmen</p>
          </div>

          <div className="space-y-4 pt-2">
            {categorySummary.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">Belum ada pengeluaran terdaftar.</div>
            ) : (
              categorySummary.map((cat, idx) => {
                const totalCatVal = cat.realized || 1;
                const maxBudgetVal = Math.max(...categorySummary.map(x => Math.max(x.plan, x.realized)), 1);
                const percentOfMaxPlan = (cat.plan / maxBudgetVal) * 100;
                const percentOfMaxRealized = (cat.realized / maxBudgetVal) * 100;
                
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="font-semibold text-slate-600 truncate pr-2" title={cat.name}>{cat.name}</span>
                      <span className="text-[10px] text-emerald-600 font-bold shrink-0">{((cat.realized / (cat.plan || 1)) * 100).toFixed(0)}% Realized</span>
                    </div>

                    <div className="space-y-1">
                      {/* Budget row */}
                      <div className="relative w-full h-2.5 bg-black/5 rounded-full flex overflow-hidden">
                        {/* Planned in slate/blue */}
                        <div 
                          className="h-full bg-slate-600/50 rounded-l transition-all border-r border-slate-200"
                          style={{ width: `${percentOfMaxPlan}%` }}
                          title={`Plan: ${formatCurrency(cat.plan)}`}
                        />
                      </div>
                      {/* Realized row */}
                      <div className="relative w-full h-2.5 bg-black/5 rounded-full flex overflow-hidden">
                        {/* Realized in emerald */}
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500/85 to-teal-500 rounded-l transition-all"
                          style={{ width: `${percentOfMaxRealized}%` }}
                          title={`Realized: ${formatCurrency(cat.realized)}`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span>Rencana: <b className="text-slate-500 font-medium">{formatCurrency(cat.plan)}</b></span>
                      <span>Realisasi: <b className="text-emerald-600 font-semibold">{formatCurrency(cat.realized)}</b></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Core items list Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm p-6 rounded-2xl text-left flex flex-col justify-between">
          <div className="space-y-4">
            {/* Search and Category Filter triggers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Daftar Audit Pengeluaran Rencana & Realisasi</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Pemantauan kepatuhan operasional mine superintendent</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Year Selection dropdown */}
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-white border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-600 focus:outline-none"
                >
                  <option value="">Semua Tahun</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>

                {/* Category Selection dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-600 focus:outline-none max-w-[150px] sm:max-w-none"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Search query box */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Cari biaya..."
                    className="bg-white border-slate-200 rounded-lg pl-8 pr-3 py-1 text-[11px] text-slate-600 focus:outline-none focus:border-emerald-500/50 w-full xs:w-36"
                  />
                </div>
              </div>
            </div>

            {/* List items representation table */}
            <div className="overflow-x-auto min-h-64">
              <p className="text-[10px] text-slate-400 mb-1 md:hidden">
                Geser tabel ke kanan untuk melihat kolom Aksi.
              </p>
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="border-b border-black/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    <th className="py-2 px-3">Periode</th>
                    <th className="py-2 px-3">Kategori</th>
                    <th className="py-2 px-3 text-right">Rencana (Opex/Capex)</th>
                    <th className="py-2 px-3 text-right">Realisasi (Opex/Capex)</th>
                    <th className="py-2 px-3">Keterangan</th>
                    <th className="py-2 px-3 text-right sticky right-0 bg-white z-10">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px] text-slate-600">
                  {filteredCosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">Tidak ada pengeluaran terdaftar.</td>
                    </tr>
                  ) : (
                    filteredCosts.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                          <span className="font-bold text-slate-700">{c.period}</span>
                          <span className="text-slate-500 ml-1">({c.year})</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-700">{c.category}</p>
                          <p className="text-[9.5px] text-slate-500">PIC: {c.officer}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <p className="text-indigo-600">O: {formatCurrency(c.plannedOpex)}</p>
                          <p className="text-amber-500">C: {formatCurrency(c.plannedCapex)}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold">
                          <p className="text-emerald-600">O: {formatCurrency(c.realizedOpex)}</p>
                          <p className="text-teal-600">C: {formatCurrency(c.realizedCapex)}</p>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate" title={c.notes}>
                          {c.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right flex items-center justify-end gap-1.5 sticky right-0 bg-white z-10 border-l border-slate-100">
                          <button
                            onClick={() => {
                              if (!allowed) return onUnauthorizedAction("Edit Biaya Lingkungan");
                              startEditCost(c);
                            }}
                            className="p-1 px-1.5 hover:bg-blue-500/10 text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit baris biaya ini"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (!allowedDelete) return onUnauthorizedAction("Hapus Biaya Lingkungan");
                              onDeleteCost(c.id);
                            }}
                            className="p-1 px-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Hapus baris biaya ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-black/5 px-4 py-3 rounded-xl border-slate-200 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              Menampilkan {filteredCosts.length} item anggaran terverifikasi.
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">PT Diva Kencana Borneo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
