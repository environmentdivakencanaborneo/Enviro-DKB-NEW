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
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Layers,
  Pencil
} from 'lucide-react';
import EmptyState from './EmptyState';

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
  const [cBudgetCode, setCBudgetCode] = useState<string>('');
  const [cYear, setCYear] = useState<number>(2026);
  const [cPeriod, setCPeriod] = useState<string>('Januari');
  const [cCategory, setCCategory] = useState<string>('Pemantauan Kualitas Lingkungan');
  const [costType, setCostType] = useState<'OPEX' | 'CAPEX'>('OPEX');
  const [cNominal, setCNominal] = useState<string>('');
  const [cNotes, setCNotes] = useState<string>('');
  const [cOfficer, setCOfficer] = useState<string>('');

  const buildBudgetCode = (year: number, type: 'OPEX' | 'CAPEX', category: string) => {
    const progMap: Record<string, string> = {
      'Pemantauan Kualitas Lingkungan': 'MON',
      'Reklamasi & Revegetasi': 'REC',
      'Pengelolaan Limbah Terpadu': 'WST',
      'Water Treatment (KPL)': 'KPL',
      'Izin LH & Administrasi': 'PER',
    };
    const prog = progMap[category] || 'ENV';
    const seq = String(costs.length + 1).padStart(3, '0');
    return `DKB-ENV-${year}-${type}-${prog}-${seq}`;
  };

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
    setCBudgetCode(item.budgetCode || '');
    setCYear(item.year);
    setCPeriod(item.period);
    setCCategory(item.category);
    
    // Pilih tab yang paling relevan tanpa menghilangkan sisi lainnya saat submit
    const hasPlanned = item.plannedOpex > 0 || item.plannedCapex > 0;
    if (hasPlanned) {
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
    const existingTarget = editingCostId
      ? costs.find(x => x.id === editingCostId)
      : costs.find(x => x.year === Number(cYear) && x.period === cPeriod && x.category === cCategory);

    const resolvedBudgetCode = cBudgetCode.trim() || existingTarget?.budgetCode || buildBudgetCode(Number(cYear), costType, cCategory);

    const payload: Omit<EnvironmentalCost, 'id'> = formTab === 'rencana' ? {
      budgetCode: resolvedBudgetCode,
      year: Number(cYear),
      period: cPeriod,
      category: cCategory,
      plannedOpex: costType === 'OPEX' ? valueNum : (existingTarget?.plannedOpex || 0),
      plannedCapex: costType === 'CAPEX' ? valueNum : (existingTarget?.plannedCapex || 0),
      realizedOpex: existingTarget?.realizedOpex || 0,
      realizedCapex: existingTarget?.realizedCapex || 0,
      notes: cNotes.trim() || existingTarget?.notes || undefined,
      officer: cOfficer.trim()
    } : {
      budgetCode: resolvedBudgetCode,
      year: Number(cYear),
      period: cPeriod,
      category: cCategory,
      plannedOpex: existingTarget?.plannedOpex || 0,
      plannedCapex: existingTarget?.plannedCapex || 0,
      realizedOpex: costType === 'OPEX' ? valueNum : (existingTarget?.realizedOpex || 0),
      realizedCapex: costType === 'CAPEX' ? valueNum : (existingTarget?.realizedCapex || 0),
      notes: cNotes.trim() || existingTarget?.notes || undefined,
      officer: cOfficer.trim()
    };

    if (editingCostId) {
      if (onUpdateCost) {
        onUpdateCost(editingCostId, payload);
      }
      setEditingCostId(null);
    } else if (existingTarget && onUpdateCost) {
      // Gabungkan ke record anggaran yang sama (tahun + periode + kategori) agar rencana & realisasi selaras
      onUpdateCost(existingTarget.id, payload);
    } else {
      onAddCost(payload);
    }

    // Reset Form fields
    setCBudgetCode('');
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
    <div id="environmental-costs-dashboard" className="space-y-6 text-text-hi">
      {/* Header and Add Button */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 text-left">
          <div className="p-3 bg-neon-green/15 text-neon-green border border-neon-green/35 rounded-xl shadow-glow-green shrink-0">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-hi font-heading">
              Biaya Pengelolaan Lingkungan Hidup
            </h2>
            <p className="text-xs text-text-mid mt-1">
              Manajemen alokasi budget Rencana vs Realisasi OPEX &amp; CAPEX pengelolaan tambang batubara (PT Diva Kencana Borneo)
            </p>
          </div>
        </div>

        <button 
          id="btn-add-environmental-cost"
          onClick={() => setShowCostForm(!showCostForm)}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl neon-btn-primary text-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          {showCostForm ? "Tutup Form" : "Entri Anggaran & Realisasi"}
        </button>
      </div>

      {/* Slide down Input Form */}
      {showCostForm && (
        <div className="glass-panel p-6 rounded-2xl text-left space-y-5 animate-slide-down">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-neon">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-neon-green" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid font-mono">
                {editingCostId ? 'Edit Anggaran & Realisasi Lingkungan' : 'Entri Anggaran Pengelolaan Lingkungan'}
              </h4>
            </div>
            
            {/* Split Form Switcher Tabs */}
            <div className="flex p-1 bg-bg-0 rounded-xl border border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setFormTab('rencana');
                  if (editingCostId) {
                    const target = costs.find(x => x.id === editingCostId);
                    if (target) setCNominal(String(costType === 'OPEX' ? target.plannedOpex : target.plannedCapex));
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formTab === 'rencana'
                    ? 'bg-neon-green text-[#04121A] shadow-glow-green'
                    : 'text-text-mid hover:text-text-hi'
                }`}
              >
                Form Rencana (Budget)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormTab('realisasi');
                  if (editingCostId) {
                    const target = costs.find(x => x.id === editingCostId);
                    if (target) setCNominal(String(costType === 'OPEX' ? target.realizedOpex : target.realizedCapex));
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  formTab === 'realisasi'
                    ? 'bg-neon-amber text-[#04121A] shadow-glow-amber'
                    : 'text-text-mid hover:text-text-hi'
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
                <label className="text-[11px] font-bold text-text-mid uppercase tracking-wider block font-mono">Tahun Anggaran</label>
                <select 
                  value={cYear}
                  onChange={(e) => setCYear(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-mono"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              {/* Monthly Period field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-mid uppercase tracking-wider block font-mono">Bulan Pelaporan</label>
                <select 
                  value={cPeriod}
                  onChange={(e) => setCPeriod(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs"
                >
                  {periods.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Category field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-mid uppercase tracking-wider block font-mono">Kategori Anggaran</label>
                <select 
                  value={cCategory}
                  onChange={(e) => setCCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Jenis Klasifikasi Biaya (Dropdown) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-mid uppercase tracking-wider block font-mono">Jenis Biaya</label>
                <select 
                  value={costType}
                  onChange={(e) => setCostType(e.target.value as 'OPEX' | 'CAPEX')}
                  className="w-full px-3.5 py-2 text-xs"
                >
                  <option value="OPEX">OPEX (Biaya Operasional Kegiatan)</option>
                  <option value="CAPEX">CAPEX (Investasi Aset / Infrastruktur)</option>
                </select>
              </div>

              {/* Nominal Biaya */}
              <div className="space-y-1.5">
                <label className={`text-[11px] font-bold uppercase tracking-wider block font-mono ${
                  formTab === 'rencana' ? 'text-neon-green' : 'text-neon-amber'
                }`}>
                  Nominal {formTab === 'rencana' ? 'Rencana' : 'Realisasi'} (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-text-low text-xs font-mono font-semibold">Rp</span>
                  <input 
                    type="number"
                    value={cNominal}
                    onChange={(e) => setCNominal(e.target.value)}
                    placeholder={formTab === 'rencana' ? "Masukkan nominal rencana..." : "Masukkan nominal realisasi..."}
                    required
                    className="w-full pl-8 pr-3.5 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Officer */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-mid uppercase tracking-wider block font-mono">Petugas PIC Anggaran</label>
                <input 
                  type="text"
                  value={cOfficer}
                  onChange={(e) => setCOfficer(e.target.value)}
                  placeholder="cth. Aditya Perkasa"
                  required
                  className="w-full px-3.5 py-2 text-xs"
                />
              </div>

              {/* Kode Anggaran field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-text-mid uppercase tracking-wider block font-mono">Kode Mata Anggaran</label>
                  <button
                    type="button"
                    onClick={() => setCBudgetCode(buildBudgetCode(Number(cYear), costType, cCategory))}
                    className="text-[10px] font-bold text-neon-cyan hover:underline cursor-pointer"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  value={cBudgetCode}
                  onChange={(e) => setCBudgetCode(e.target.value)}
                  placeholder={`cth. ${buildBudgetCode(Number(cYear), costType, cCategory)}`}
                  className="w-full px-3.5 py-2 text-xs font-mono"
                />
              </div>

              {/* Notes field */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <label className="text-[11px] font-bold text-text-mid uppercase tracking-wider block font-mono">Keterangan Anggaran</label>
                <input 
                  type="text"
                  value={cNotes}
                  onChange={(e) => setCNotes(e.target.value)}
                  placeholder="Tambahkan penjelasan rinci mengenai kegiatan atau tujuan pembiayaan..."
                  className="w-full px-3.5 py-2 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border-neon flex justify-end gap-3">
              <button
                type="button" 
                onClick={() => setShowCostForm(false)}
                className="px-4 py-2 border border-border-subtle bg-bg-1 hover:bg-bg-2 rounded-xl text-xs text-text-mid hover:text-text-hi font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit" 
                className={`px-5 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                  formTab === 'rencana' 
                    ? 'neon-btn-primary' 
                    : 'bg-neon-amber hover:brightness-110 text-[#04121A] shadow-glow-amber'
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
        <div className="neon-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-neon-violet/15 text-neon-violet border border-neon-violet/30 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-xs text-text-mid font-bold uppercase tracking-wider font-mono">Biaya Kegiatan (OPEX)</span>
            </div>
            <span className="text-[11px] font-semibold text-neon-violet bg-neon-violet/15 border border-neon-violet/30 px-2.5 py-0.5 rounded-full font-mono tabular-nums">
              {opexPercentage.toFixed(1)}% Realized
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <p className="text-[10px] text-text-low font-medium tracking-wide font-mono">REALISASI PENYALURAN</p>
            <h3 className="text-xl font-bold font-mono tabular-nums text-text-hi">
              {formatCurrency(totalOpexRealized)}
            </h3>
            <p className="text-[11px] text-text-mid">
              Rencana Anggaran: <span className="font-semibold font-mono tabular-nums text-text-hi">{formatCurrency(totalOpexPlanned)}</span>
            </p>
          </div>

          {/* Simple percentage bar */}
          <div className="w-full h-1.5 bg-bg-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-neon-violet rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, opexPercentage)}%` }}
            />
          </div>
        </div>

        {/* CAPEX CARD */}
        <div className="neon-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-neon-amber/15 text-neon-amber border border-neon-amber/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="text-xs text-text-mid font-bold uppercase tracking-wider font-mono">Investasi Aset (CAPEX)</span>
            </div>
            <span className="text-[11px] font-semibold text-neon-amber bg-neon-amber/15 border border-neon-amber/30 px-2.5 py-0.5 rounded-full font-mono tabular-nums">
              {capexPercentage.toFixed(1)}% Realized
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <p className="text-[10px] text-text-low font-medium tracking-wide font-mono">REALISASI PENYALURAN</p>
            <h3 className="text-xl font-bold font-mono tabular-nums text-text-hi">
              {formatCurrency(totalCapexRealized)}
            </h3>
            <p className="text-[11px] text-text-mid">
              Rencana Anggaran: <span className="font-semibold font-mono tabular-nums text-text-hi">{formatCurrency(totalCapexPlanned)}</span>
            </p>
          </div>

          {/* Simple percentage bar */}
          <div className="w-full h-1.5 bg-bg-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-neon-amber rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, capexPercentage)}%` }}
            />
          </div>
        </div>

        {/* TOTAL BUDGET CARD */}
        <div className="neon-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-neon-green/15 text-neon-green border border-neon-green/30 flex items-center justify-center">
                <Coins className="h-4 w-4" />
              </div>
              <span className="text-xs text-text-mid font-bold uppercase tracking-wider font-mono">Total Biaya Lingkungan</span>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono tabular-nums ${
              overallPercentage > 100 ? 'badge-exceeded' : 'badge-safe'
            }`}>
              {overallPercentage > 100 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {overallPercentage.toFixed(1)}% Alokasi
            </span>
          </div>

          <div className="my-3 text-left">
            <p className="text-[10px] text-text-low font-medium tracking-wide font-mono">TOTAL REALISASI TAMBANG</p>
            <h3 className="text-2xl font-black font-mono tabular-nums text-neon-green">
              {formatCurrency(overallBudgetRealized)}
            </h3>
            <p className="text-[11px] text-text-mid mt-1">
              Rencana Pagu: <span className="font-bold font-mono tabular-nums text-text-hi">{formatCurrency(overallBudgetPlanned)}</span>
            </p>
          </div>

          {/* Combined progress */}
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-bg-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  overallPercentage > 100 ? 'bg-neon-red' : 'bg-neon-green'
                }`}
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[9px] text-text-mid font-mono tabular-nums mt-1">
              <span>SISA ALOKASI TERPAKAI</span>
              <span className={overallBudgetPlanned < overallBudgetRealized ? 'text-neon-red font-semibold' : 'text-neon-green font-semibold'}>
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
        <div className="glass-panel p-6 rounded-2xl text-left space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid font-mono">Breakdown Berdasarkan Kategori</h4>
            <p className="text-[10px] text-text-low mt-0.5">Kumulatif Budget: Planned vs Realized tiap segmen</p>
          </div>

          <div className="space-y-4 pt-2">
            {categorySummary.length === 0 ? (
              <div className="text-center py-10 text-xs text-text-mid">Belum ada pengeluaran terdaftar.</div>
            ) : (
              categorySummary.map((cat, idx) => {
                const maxBudgetVal = Math.max(...categorySummary.map(x => Math.max(x.plan, x.realized)), 1);
                const percentOfMaxPlan = (cat.plan / maxBudgetVal) * 100;
                const percentOfMaxRealized = (cat.realized / maxBudgetVal) * 100;
                
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="font-semibold text-text-hi truncate pr-2" title={cat.name}>{cat.name}</span>
                      <span className="text-[10px] text-neon-green font-bold font-mono tabular-nums shrink-0">{((cat.realized / (cat.plan || 1)) * 100).toFixed(0)}% Realized</span>
                    </div>

                    <div className="space-y-1">
                      {/* Budget row */}
                      <div className="relative w-full h-2 bg-bg-2 rounded-full flex overflow-hidden">
                        <div 
                          className="h-full bg-text-mid/50 rounded-l transition-all"
                          style={{ width: `${percentOfMaxPlan}%` }}
                          title={`Plan: ${formatCurrency(cat.plan)}`}
                        />
                      </div>
                      {/* Realized row */}
                      <div className="relative w-full h-2 bg-bg-2 rounded-full flex overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-neon-cyan to-neon-green rounded-l transition-all"
                          style={{ width: `${percentOfMaxRealized}%` }}
                          title={`Realized: ${formatCurrency(cat.realized)}`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono tabular-nums text-text-mid">
                      <span>Rencana: <b className="text-text-hi font-medium">{formatCurrency(cat.plan)}</b></span>
                      <span>Realisasi: <b className="text-neon-green font-semibold">{formatCurrency(cat.realized)}</b></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Core items list Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl text-left flex flex-col justify-between">
          <div className="space-y-4">
            {/* Search and Category Filter triggers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-neon">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid font-mono">Daftar Audit Pengeluaran Rencana &amp; Realisasi</h4>
                <p className="text-[10px] text-text-low mt-0.5">Pemantauan kepatuhan operasional mine superintendent</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Year Selection dropdown */}
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-[11px] font-mono"
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
                  className="px-2.5 py-1.5 text-[11px] max-w-[150px] sm:max-w-none"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {/* Search query box */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-text-low" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Cari biaya..."
                    className="pl-8 pr-3 py-1.5 text-[11px] w-full xs:w-36"
                  />
                </div>
              </div>
            </div>

            {/* List items representation table */}
            <div className="overflow-x-auto min-h-64">
              <p className="text-[10px] text-text-low mb-1 md:hidden">
                Geser tabel ke kanan untuk melihat kolom Aksi.
              </p>
              <table className="neon-table w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest font-mono">
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-right">Rencana (Opex/Capex)</th>
                    <th className="py-2.5 px-3 text-right">Realisasi (Opex/Capex)</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 text-right sticky right-0 bg-bg-2 z-20">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] text-text-mid">
                  {filteredCosts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4">
                        <EmptyState
                          title="Belum ada pengeluaran terdaftar"
                          description="Entri rencana anggaran atau realisasi biaya pengelolaan lingkungan untuk mulai memantau alokasi."
                          icon={Coins}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredCosts.map((c) => (
                      <tr key={c.id} className="transition-colors group">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums">
                          <span className="font-bold text-text-hi">{c.period}</span>
                          <span className="text-text-mid ml-1">({c.year})</span>
                          {c.budgetCode && (
                            <span className="block text-[9.5px] text-neon-cyan font-semibold mt-0.5">{c.budgetCode}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-text-hi">{c.category}</p>
                          <p className="text-[9.5px] text-text-low">PIC: {c.officer}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono tabular-nums">
                          <p className="text-neon-violet">O: {formatCurrency(c.plannedOpex)}</p>
                          <p className="text-neon-amber">C: {formatCurrency(c.plannedCapex)}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold font-mono tabular-nums">
                          <p className="text-neon-green">O: {formatCurrency(c.realizedOpex)}</p>
                          <p className="text-neon-cyan">C: {formatCurrency(c.realizedCapex)}</p>
                        </td>
                        <td className="py-2.5 px-3 text-text-mid italic max-w-xs truncate" title={c.notes}>
                          {c.notes || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right sticky right-0 bg-bg-1 z-10 border-l border-border-subtle">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                if (!allowed) return onUnauthorizedAction("Edit Biaya Lingkungan");
                                startEditCost(c);
                              }}
                              className="p-1.5 hover:bg-neon-cyan/15 text-text-mid hover:text-neon-cyan rounded-lg transition-colors cursor-pointer"
                              title="Edit baris biaya ini"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (!allowedDelete) return onUnauthorizedAction("Hapus Biaya Lingkungan");
                                onDeleteCost(c.id);
                              }}
                              className="p-1.5 hover:bg-neon-red/15 text-text-mid hover:text-neon-red rounded-lg transition-colors cursor-pointer"
                              title="Hapus baris biaya ini"
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

          <div className="bg-bg-2/70 px-4 py-3 rounded-xl border border-border-subtle flex items-center justify-between text-xs text-text-mid mt-4">
            <span className="flex items-center gap-1.5 font-mono tabular-nums">
              <CheckCircle className="h-3.5 w-3.5 text-neon-green" />
              Menampilkan {filteredCosts.length} item anggaran terverifikasi.
            </span>
            <span className="text-[10px] font-mono text-text-low uppercase">PT Diva Kencana Borneo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
