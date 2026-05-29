/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NurseryData, ReclamationPlan, ReclamationGuarantee } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Trees, 
  Sprout, 
  FileCheck2, 
  ShieldAlert, 
  Calendar, 
  TrendingUp, 
  MapPin, 
  AlertCircle
} from 'lucide-react';

interface ReclamationViewProps {
  nursery: NurseryData[];
  plans: ReclamationPlan[];
  guarantees: ReclamationGuarantee[];
  onAddNursery: (item: any) => void;
  onDeleteNursery: (id: string) => void;
  onAddPlan: (item: any) => void;
  onDeletePlan: (id: string) => void;
  onAddGuarantee: (item: any) => void;
  onDeleteGuarantee: (id: string) => void;
}

export default function ReclamationView({
  nursery,
  plans,
  guarantees,
  onAddNursery,
  onDeleteNursery,
  onAddPlan,
  onDeletePlan,
  onAddGuarantee,
  onDeleteGuarantee
}: ReclamationViewProps) {
  const [activeTab, setActiveTab] = useState<'nursery' | 'plans' | 'guarantees'>('nursery');

  // NURSERY STATE
  const [showNurseryForm, setShowNurseryForm] = useState(false);
  const [nurserySearch, setNurserySearch] = useState('');
  // Forms
  const [nPlantType, setNPlantType] = useState('Sengon Laut (Falcataria moluccana)');
  const [nQuantity, setNQuantity] = useState(5000);
  const [nSource, setNSource] = useState('Pembibitan Lokal Mandiri');
  const [nAge, setNAge] = useState(12);
  const [nHeight, setNHeight] = useState(40);
  const [nStatus, setNStatus] = useState<'Healthy' | 'Need Care' | 'Critical'>('Healthy');
  const [nLoc, setNLoc] = useState('Nursery Blok A Barat');
  const [nDate, setNDate] = useState(new Date().toISOString().slice(0, 10));

  // PLANS STATE
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planSearch, setPlanSearch] = useState('');
  // Forms
  const [pArea, setPArea] = useState('');
  const [pSize, setPSize] = useState(10.0);
  const [pYear, setPYear] = useState(2026);
  const [pPlants, setPPlants] = useState('Sengon & Acacia mangium');
  const [pMethod, setPMethod] = useState('Hydroseeding & Pot Campuran');
  const [pCost, setPCost] = useState(250000000);
  const [pStatus, setPStatus] = useState<'Draft' | 'Approved' | 'In Progress' | 'Completed'>('Draft');
  const [pPic, setPPic] = useState('Bambang Trimurti');

  // GUARANTEES STATE
  const [showGuaranteeForm, setShowGuaranteeForm] = useState(false);
  // Forms
  const [gNo, setGNo] = useState('');
  const [gType, setGType] = useState<'Bank Guarantee' | 'Time Deposit' | 'Environmental Bond'>('Bank Guarantee');
  const [gValue, setGValue] = useState(500000000);
  const [gInst, setGInst] = useState('PT Bank Mandiri (Persero) Tbk');
  const [gIssue, setGIssue] = useState(new Date().toISOString().slice(0, 10));
  const [gDue, setGDue] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [gStatus, setGStatus] = useState<'Active' | 'Renewal Needed' | 'Claimed' | 'Released'>('Active');

  // Submit Nursery
  const handleNurserySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddNursery({
      plantType: nPlantType,
      quantity: Number(nQuantity),
      source: nSource,
      ageWeeks: Number(nAge),
      heightCm: Number(nHeight),
      status: nStatus,
      location: nLoc,
      dateIn: nDate
    });
    setShowNurseryForm(false);
  };

  // Submit Plan
  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pArea) {
      alert("Masukkan nama areal reklamasi.");
      return;
    }
    onAddPlan({
      areaName: pArea,
      sizeHa: Number(pSize),
      targetYear: Number(pYear),
      plantType: pPlants,
      method: pMethod,
      estimatedCost: Number(pCost),
      status: pStatus,
      pic: pPic
    });
    setPArea('');
    setShowPlanForm(false);
  };

  // Submit Guarantee
  const handleGuaranteeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gNo) {
      alert("Masukkan nomor surat jaminan.");
      return;
    }
    onAddGuarantee({
      guaranteeNo: gNo,
      guaranteeType: gType,
      value: Number(gValue),
      issuingInstitution: gInst,
      issuedDate: gIssue,
      dueDate: gDue,
      status: gStatus
    });
    setGNo('');
    setShowGuaranteeForm(false);
  };

  // Format IDR helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // Filters
  const filteredNursery = nursery.filter(item => {
    return item.plantType.toLowerCase().includes(nurserySearch.toLowerCase()) || 
           item.location.toLowerCase().includes(nurserySearch.toLowerCase());
  });

  const filteredPlans = plans.filter(item => {
    return item.areaName.toLowerCase().includes(planSearch.toLowerCase()) || 
           item.pic.toLowerCase().includes(planSearch.toLowerCase());
  });

  return (
    <div id="reclamation-view-wrapper" className="space-y-6 text-slate-200">
      {/* Upper tabs selectors */}
      <div className="flex border-b border-slate-800">
        <button
          id="reclamation-tab-nursery"
          onClick={() => setActiveTab('nursery')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'nursery' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trees className="h-4 w-4" />
          Management Nursery (Persemaian)
        </button>
        <button
          id="reclamation-tab-plans"
          onClick={() => setActiveTab('plans')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'plans' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sprout className="h-4 w-4" />
          Rencana & Progres Reklamasi
        </button>
        <button
          id="reclamation-tab-guarantees"
          onClick={() => setActiveTab('guarantees')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'guarantees' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Jaminan Reklamasi (Escrow Mandate)
        </button>
      </div>

      {activeTab === 'nursery' && (
        <div id="reclamation-nursery-panel" className="space-y-6">
          {/* Nursery stats boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Trees className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Stok Bibit</span>
                <p className="text-xl font-bold text-slate-100 mt-1">
                  {nursery.reduce((sum, x) => sum + x.quantity, 0).toLocaleString('id-ID')} Batang
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
                <Sprout className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Species</span>
                <p className="text-xl font-bold text-slate-100 mt-1">
                  {Array.from(new Set(nursery.map(x => x.plantType))).length} Jenis Vegetasi
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Butuh Perawatan</span>
                <p className="text-xl font-bold text-slate-100 mt-1">
                  {nursery.filter(x => x.status !== 'Healthy').reduce((acc, x) => acc + x.quantity, 0).toLocaleString('id-ID')} Bibit
                </p>
              </div>
            </div>
          </div>

          {/* Table Toolbar controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative min-w-[300px] w-full md:w-auto">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="nursery-search-input"
                type="text"
                placeholder="Cari jenis bibit / nama kapling nursery..."
                value={nurserySearch}
                onChange={(e) => setNurserySearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-teal-500 outline-none w-full"
              />
            </div>

            <button
              id="nursery-add-btn"
              onClick={() => setShowNurseryForm(!showNurseryForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow cursor-pointer self-start"
            >
              <Plus className="h-4 w-4" />
              Registrasi Jenis Bibit Baru
            </button>
          </div>

          {/* Nursery entry form */}
          {showNurseryForm && (
            <form 
              id="nursery-form-element"
              onSubmit={handleNurserySubmit}
              className="bg-[#111726]/80 p-5 rounded-2xl border border-slate-800 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-4 pb-2 border-b border-slate-800">
                Data Penerimaan & Inventarisasi Bibit Nursery
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Spesies / Jenis Tanaman</label>
                  <select
                    id="nursery-field-type"
                    value={nPlantType}
                    onChange={(e) => setNPlantType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 animate-none"
                  >
                    <option value="Sengon Laut (Falcataria moluccana)">Sengon Laut (Falcataria moluccana)</option>
                    <option value="Acacia mangium">Acacia mangium</option>
                    <option value="Trembesi (Samanea saman)">Trembesi (Samanea saman)</option>
                    <option value="Mahoni (Swietenia mahagoni)">Mahoni (Swietenia mahagoni)</option>
                    <option value="Johar (Senna siamea)">Johar (Senna siamea)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Jumlah Bibit (Batang)</label>
                  <input
                    id="nursery-field-qty"
                    type="number"
                    required
                    value={nQuantity}
                    onChange={(e) => setNQuantity(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Sumber / Penyedia Bibit</label>
                  <input
                    id="nursery-field-source"
                    type="text"
                    required
                    value={nSource}
                    onChange={(e) => setNSource(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Umur Semat (Minggu)</label>
                  <input
                    id="nursery-field-age"
                    type="number"
                    required
                    value={nAge}
                    onChange={(e) => setNAge(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Rata-Rata Tinggi (cm)</label>
                  <input
                    id="nursery-field-height"
                    type="number"
                    required
                    value={nHeight}
                    onChange={(e) => setNHeight(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Kondisi Fisik Semai</label>
                  <select
                    id="nursery-field-status"
                    value={nStatus}
                    onChange={(e) => setNStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  >
                    <option value="Healthy">Healthy (Sehat & Hijau)</option>
                    <option value="Need Care">Need Care (Kekurangan Unsur Hara/Hama)</option>
                    <option value="Critical">Critical (Kering / Layu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Plot / Lokasi Bedeng</label>
                  <input
                    id="nursery-field-loc"
                    type="text"
                    required
                    value={nLoc}
                    onChange={(e) => setNLoc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
                <button
                  id="nursery-form-cancel"
                  type="button"
                  onClick={() => setShowNurseryForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="nursery-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Simpan Records
                </button>
              </div>
            </form>
          )}

          {/* Nursery table list */}
          <div className="bg-[#111726]/80 rounded-2xl border border-slate-800 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Database Inventaris Benih Persemaian (Nursery Stock List)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">ID / Tgl Input</th>
                    <th className="p-3.5">Spesies / Botani</th>
                    <th className="p-3.5">Asal Penyedia</th>
                    <th className="p-3.5 text-center">Tinggi / Umur</th>
                    <th className="p-3.5 text-center">Bedeng Plot</th>
                    <th className="p-3.5 text-center">Stok (Semat)</th>
                    <th className="p-3.5 text-center">Kondisi</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredNursery.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-500">Tidak ada bibit Nursery yang terdaftar.</td>
                    </tr>
                  ) : (
                    filteredNursery.map(item => (
                      <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-3.5 pl-5 font-mono">
                          <span className="text-slate-500 text-[9px] block">{item.id}</span>
                          <span className="font-semibold text-slate-300">{item.dateIn}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-200 block">{item.plantType}</span>
                        </td>
                        <td className="p-3.5 text-slate-400">{item.source}</td>
                        <td className="p-3.5 text-center font-semibold text-slate-350">
                          <span className="block">{item.heightCm} cm</span>
                          <span className="text-[10px] text-slate-500 font-mono">{item.ageWeeks} minggu</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border bg-slate-950 border-slate-800 font-semibold">
                            <MapPin className="h-3 w-3 text-emerald-400" />
                            {item.location}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-teal-400 font-mono text-sm">
                          {item.quantity.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                            item.status === 'Healthy' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            item.status === 'Need Care' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-red-500/10 border-red-500/20 text-red-500'
                          }`}>
                            {item.status === 'Healthy' ? 'Sehat' : item.status === 'Need Care' ? 'Rentan' : 'Kritis'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <button
                            id={`nursery-delete-btn-${item.id}`}
                            onClick={() => {
                              if (confirm(`Hapus data bibit ${item.id}?`)) {
                                onDeleteNursery(item.id);
                              }
                            }}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div id="reclamation-plans-panel" className="space-y-6">
          {/* Action header and Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative min-w-[300px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="plans-search-input"
                type="text"
                placeholder="Cari nama area / PIC penanggung jawab..."
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-teal-500 outline-none w-full"
              />
            </div>

            <button
              id="plans-add-btn"
              onClick={() => setShowPlanForm(!showPlanForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow cursor-pointer self-start"
            >
              <Plus className="h-4 w-4" />
              Buat Rencana Kerja Reklamasi
            </button>
          </div>

          {/* Form write plan */}
          {showPlanForm && (
            <form 
              id="plan-form-element"
              onSubmit={handlePlanSubmit}
              className="bg-[#111726]/80 p-5 rounded-2xl border border-slate-800 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-4 pb-2 border-b border-slate-800">
                Pendaftaran Program Rencana Kerja Reklamasi Baru
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Nama Blok / Area Penambangan</label>
                  <input
                    id="plan-field-area"
                    type="text"
                    required
                    placeholder="Contoh: Disposal Area Utara Luar (IPD-01)"
                    value={pArea}
                    onChange={(e) => setPArea(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Luas Area (Hektar / Ha)</label>
                  <input
                    id="plan-field-size"
                    type="number"
                    step="0.01"
                    required
                    value={pSize}
                    onChange={(e) => setPSize(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Target Fisik (Tahun)</label>
                  <input
                    id="plan-field-year"
                    type="number"
                    required
                    value={pYear}
                    onChange={(e) => setPYear(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5 font-sans">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Komposisi Tanaman</label>
                  <input
                    id="plan-field-plants"
                    type="text"
                    required
                    placeholder="Contoh: Trembesi & Sengon"
                    value={pPlants}
                    onChange={(e) => setPPlants(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Metode Penanaman</label>
                  <input
                    id="plan-field-method"
                    type="text"
                    required
                    placeholder="Contoh: Hydroseeding sipil"
                    value={pMethod}
                    onChange={(e) => setPMethod(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Estimasi Biaya Reklamasi (IDR)</label>
                  <input
                    id="plan-field-cost"
                    type="number"
                    required
                    value={pCost}
                    onChange={(e) => setPCost(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 text-teal-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">PIC Penanggung Jawab</label>
                  <input
                    id="plan-field-pic"
                    type="text"
                    required
                    value={pPic}
                    onChange={(e) => setPPic(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Status Kelayakan Program</label>
                <div className="flex gap-2">
                  {['Draft', 'Approved', 'In Progress', 'Completed'].map(state => (
                    <button
                      id={`plan-status-btn-${state}`}
                      key={state}
                      type="button"
                      onClick={() => setPStatus(state as any)}
                      className={`px-4 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        pStatus === state 
                          ? 'bg-teal-500/10 border-teal-500 text-teal-400' 
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {state === 'Draft' ? 'Konsep / Draft' :
                       state === 'Approved' ? 'Disetujui ESDM' :
                       state === 'In Progress' ? 'Aktif Lapangan' : 'Selesai'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
                <button
                  id="plans-form-cancel"
                  type="button"
                  onClick={() => setShowPlanForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="plans-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Daftarkan Program
                </button>
              </div>
            </form>
          )}

          {/* Table display */}
          <div className="bg-[#111726]/80 rounded-2xl border border-slate-800 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tabel Monitoring Program Kerja Kerja Reklamasi (RKL-RPL Progress)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">No ID</th>
                    <th className="p-3.5">Area Konsesi</th>
                    <th className="p-3.5 text-center">Luas Blok (Ha)</th>
                    <th className="p-3.5 text-center font-bold">Target</th>
                    <th className="p-3.5">Komposisi Vegetasi & Metode</th>
                    <th className="p-3.5 text-right">Estimasi Anggaran</th>
                    <th className="p-3.5 text-center">PIC Penanggung</th>
                    <th className="p-3.5 text-center">Status Kerja</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">Tidak ada agenda rencana reklamasi yang diajukan.</td>
                    </tr>
                  ) : (
                    filteredPlans.map(item => (
                      <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-3.5 pl-5 font-mono text-slate-400">{item.id}</td>
                        <td className="p-3.5 font-bold text-slate-200">{item.areaName}</td>
                        <td className="p-3.5 text-center font-semibold text-slate-350">{item.sizeHa} Ha</td>
                        <td className="p-3.5 text-center font-bold text-slate-300 font-mono">{item.targetYear}</td>
                        <td className="p-3.5">
                          <span className="text-slate-200 block font-medium">{item.plantType}</span>
                          <span className="text-[10px] text-slate-500">{item.method}</span>
                        </td>
                        <td className="p-3.5 text-right font-bold text-amber-500 font-mono">{formatIDR(item.estimatedCost)}</td>
                        <td className="p-3.5 text-center text-slate-400">{item.pic}</td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[10px] px-2.5 py-1 rounded border font-bold uppercase ${
                            item.status === 'Completed' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' :
                            item.status === 'In Progress' ? 'bg-blue-500/15 border-blue-500/20 text-blue-400' :
                            item.status === 'Approved' ? 'bg-teal-500/15 border-teal-500/20 text-teal-400' :
                            'bg-slate-800 border-slate-705 text-slate-400'
                          }`}>
                            {item.status === 'Draft' ? 'Draft' :
                             item.status === 'Approved' ? 'Disetujui' :
                             item.status === 'In Progress' ? 'Pekerjaan' : 'Selesai'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <button
                            id={`plans-delete-btn-${item.id}`}
                            onClick={() => {
                              if (confirm(`Hapus rencana reklamasi ${item.id}?`)) {
                                onDeletePlan(item.id);
                              }
                            }}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guarantees' && (
        <div id="reclamation-guarantees-panel" className="space-y-6">
          {/* Danger alert for soon expired items */}
          <div className="bg-[#b91c1c]/10 border border-red-500/30 p-4.5 rounded-2xl flex items-start gap-4 mb-3 text-left">
            <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">Perhatian Regulasi ESDM</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Setiap badan usaha pemegang IUP OP wajib menempatkan Jaminan Reklamasi (Jamrek) dan Jaminan Pascatambang (JamPT) secara tepat waktu sebelum memasuki tahun pelaksanaan rencana. Keterlambatan renewal dokumen Jamrek dapat berimbas pada penghentian sementara operasional izin produksi batubara.
              </p>
            </div>
          </div>

          {/* Action block */}
          <div className="flex justify-end mb-4">
            <button
              id="guarantees-add-btn"
              onClick={() => setShowGuaranteeForm(!showGuaranteeForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Registrasi Jaminan Reklamasi (Escrow)
            </button>
          </div>

          {/* Guarantee registration form */}
          {showGuaranteeForm && (
            <form 
              id="guarantees-form-element"
              onSubmit={handleGuaranteeSubmit}
              className="bg-[#111726]/80 p-5 rounded-2xl border border-slate-800 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-4 pb-2 border-b border-slate-800">
                Data Penempatan Jaminan Finansial Reklamasi Tambang
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Nomor Surat Jaminan / Deposit</label>
                  <input
                    id="guarantees-field-no"
                    type="text"
                    required
                    placeholder="JAMREK-2026-PTKBB-XXX"
                    value={gNo}
                    onChange={(e) => setGNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Tipe Jaminan Finansial</label>
                  <select
                    id="guarantees-field-type"
                    value={gType}
                    onChange={(e) => setGType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  >
                    <option value="Bank Guarantee">Bank Guarantee / Jaminan Bank</option>
                    <option value="Time Deposit">Time Deposit / Deposito Berjangka</option>
                    <option value="Environmental Bond">Environmental Bond / Asuransi Lingkungan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Nilai Jaminan Finansial (IDR)</label>
                  <input
                    id="guarantees-field-value"
                    type="number"
                    required
                    value={gValue}
                    onChange={(e) => setGValue(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 text-emerald-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Lembaga Keuangan Penerbit</label>
                  <input
                    id="guarantees-field-institution"
                    type="text"
                    required
                    placeholder="Contoh: PT Bank Mandiri Tbk"
                    value={gInst}
                    onChange={(e) => setGInst(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Tanggal Penerbitan</label>
                  <input
                    id="guarantees-field-issued"
                    type="date"
                    required
                    value={gIssue}
                    onChange={(e) => setGIssue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Tanggal Jatuh Tempo</label>
                  <input
                    id="guarantees-field-due"
                    type="date"
                    required
                    value={gDue}
                    onChange={(e) => setGDue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Status Kepatuhan Dokumen</label>
                  <select
                    id="guarantees-field-status"
                    value={gStatus}
                    onChange={(e) => setGStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  >
                    <option value="Active">🔴 Active & Valid</option>
                    <option value="Renewal Needed">⚠️ Renewal Needed / Segera Habis</option>
                    <option value="Claimed">Claimed / Diambil Alih ESDM</option>
                    <option value="Released">Released (Selesai Pascatambang)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
                <button
                  id="guarantees-form-cancel"
                  type="button"
                  onClick={() => setShowGuaranteeForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="guarantees-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Daftarkan Jamrek
                </button>
              </div>
            </form>
          )}

          {/* Guarantee list table */}
          <div className="bg-[#111726]/80 rounded-2xl border border-slate-800 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Daftar Dokumen Penempatan Jaminan Pascatambang & Reklamasi</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">No Rekening / Jaminan</th>
                    <th className="p-3.5">Instrumen Jaminan</th>
                    <th className="p-3.5 text-right">Nilai Jaminan Finansial</th>
                    <th className="p-3.5">Lembaga Keuangan Penerbit</th>
                    <th className="p-3.5 text-center">Tgl Terbit</th>
                    <th className="p-3.5 text-center">Expired Date</th>
                    <th className="p-3.5 text-center">Status Keaktifan</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {guarantees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-500">Belum ada jaminan finansial yang dicatatkan.</td>
                    </tr>
                  ) : (
                    guarantees.map(item => {
                      const isWarn = item.status === 'Renewal Needed' || 
                        (new Date(item.dueDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000);
                      return (
                        <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="p-3.5 pl-5 font-mono font-bold text-slate-200">
                            <span className="text-slate-500 text-[9px] block mb-0.5">{item.id}</span>
                            {item.guaranteeNo}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] border bg-slate-900 border-slate-800 font-semibold text-slate-350">
                              {item.guaranteeType}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-400 font-mono text-sm">
                            {formatIDR(item.value)}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-300">{item.issuingInstitution}</td>
                          <td className="p-3.5 text-center text-slate-450">{item.issuedDate}</td>
                          <td className="p-3.5 text-center font-mono">
                            <span className={`font-bold ${isWarn ? 'text-red-400' : 'text-slate-300'}`}>
                              {item.dueDate}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`text-[10px] px-2.5 py-1 rounded border font-bold uppercase ${
                              item.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              item.status === 'Renewal Needed' ? 'bg-red-500/10 border-red-500/20 text-red-550 font-extrabold animate-pulse' :
                              'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>
                              {item.status === 'Active' ? 'Valid' :
                               item.status === 'Renewal Needed' ? 'Renewal segera' : item.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-center pr-5">
                            <button
                              id={`guarantees-delete-btn-${item.id}`}
                              onClick={() => {
                                if (confirm(`Hapus records penjaminan ${item.guaranteeNo}?`)) {
                                  onDeleteGuarantee(item.id);
                                }
                              }}
                              className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
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
        </div>
      )}
    </div>
  );
}
