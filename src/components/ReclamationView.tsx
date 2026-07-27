/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import ModalPortal from './ModalPortal';
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
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Activity,
  Check,
  Pencil
} from 'lucide-react';

interface ReclamationViewProps {
  nursery: NurseryData[];
  plans: ReclamationPlan[];
  guarantees: ReclamationGuarantee[];
  onAddNursery: (item: any) => void;
  onUpdateNursery?: (id: string, item: any) => void;
  onDeleteNursery: (id: string) => void;
  onAddPlan: (item: any) => void;
  onUpdatePlan: (id: string, item: any) => void;
  onDeletePlan: (id: string) => void;
  onAddGuarantee: (item: any) => void;
  onUpdateGuarantee?: (id: string, item: any) => void;
  onDeleteGuarantee: (id: string) => void;
}

export default function ReclamationView({
  nursery,
  plans,
  guarantees,
  onAddNursery,
  onUpdateNursery,
  onDeleteNursery,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
  onAddGuarantee,
  onUpdateGuarantee,
  onDeleteGuarantee
}: ReclamationViewProps) {
  const [activeTab, setActiveTab] = useState<'nursery' | 'plans' | 'guarantees'>('nursery');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: 'nursery' | 'plan' | 'reset-plan' | 'guarantee';
    message: string;
  } | null>(null);

  // EDIT STATE
  const [editingNurseryId, setEditingNurseryId] = useState<string | null>(null);
  const [editingGuaranteeId, setEditingGuaranteeId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // NURSERY STATE
  const [showNurseryForm, setShowNurseryForm] = useState(false);
  const [nurserySearch, setNurserySearch] = useState('');
  // Forms
  const [nPlantType, setNPlantType] = useState('Sengon Laut (Falcataria moluccana)');
  const [nCustomPlantType, setNCustomPlantType] = useState('');
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
  // Forms tab switcher
  const [planFormTab, setPlanFormTab] = useState<'rencana' | 'realisasi'>('rencana');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Forms Rencana
  const [pArea, setPArea] = useState('');
  const [pSize, setPSize] = useState(10.0);
  const [pYear, setPYear] = useState(2026);
  const [pPlants, setPPlants] = useState('Sengon & Acacia mangium');
  const [pMethod, setPMethod] = useState('Hydroseeding & Pot Campuran');
  const [pCost, setPCost] = useState(250000000);
  const [pStatus, setPStatus] = useState<'Draft' | 'Approved' | 'In Progress' | 'Completed'>('Draft');
  const [pPic, setPPic] = useState('Bambang Trimurti');

  // Forms Realisasi
  const [rSize, setRSize] = useState<string>('');
  const [rYear, setRYear] = useState<string>('');
  const [rPlants, setRPlants] = useState('');
  const [rMethod, setRMethod] = useState('');
  const [rCost, setRCost] = useState<string>('');

  // Calculations for comparing plans vs actual realizations
  const totalPlannedSize = plans.reduce((sum, p) => sum + (p.sizeHa || 0), 0);
  const totalRealizedSize = plans.reduce((sum, p) => sum + (p.realizedSizeHa || 0), 0);
  const totalPlannedCost = plans.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
  const totalRealizedCost = plans.reduce((sum, p) => sum + (p.realizedCost || 0), 0);
  const sizeProgressPercent = totalPlannedSize > 0 ? (totalRealizedSize / totalPlannedSize) * 100 : 0;

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

  const startEditNursery = (item: NurseryData) => {
    setEditingNurseryId(item.id);
    setNPlantType(item.plantType);
    setNQuantity(item.quantity);
    setNSource(item.source);
    setNAge(item.ageWeeks);
    setNHeight(item.heightCm);
    setNStatus(item.status);
    setNLoc(item.location);
    setNDate(item.dateIn);
    setShowNurseryForm(true);
  };

  const startEditGuarantee = (item: ReclamationGuarantee) => {
    setEditingGuaranteeId(item.id);
    setGNo(item.guaranteeNo);
    setGType(item.guaranteeType);
    setGValue(item.value);
    setGInst(item.issuingInstitution);
    setGIssue(item.issuedDate);
    setGDue(item.dueDate);
    setGStatus(item.status);
    setShowGuaranteeForm(true);
  };

  const startEditPlan = (item: ReclamationPlan) => {
    setEditingPlanId(item.id);
    setPArea(item.areaName);
    setPSize(item.sizeHa);
    setPYear(item.targetYear);
    setPPlants(item.plantType);
    setPMethod(item.method);
    setPCost(item.estimatedCost);
    setPStatus(item.status);
    setPPic(item.pic);
    
    setPlanFormTab('rencana');
    setShowPlanForm(true);
  };

  // Submit Nursery
  const handleNurserySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPlantType = nPlantType === 'Lainnya' ? (nCustomPlantType.trim() || 'Lainnya') : nPlantType;
    const payload = {
      plantType: finalPlantType,
      quantity: Number(nQuantity),
      source: nSource,
      ageWeeks: Number(nAge),
      heightCm: Number(nHeight),
      status: nStatus,
      location: nLoc,
      dateIn: nDate
    };

    if (editingNurseryId) {
      if (onUpdateNursery) {
        onUpdateNursery(editingNurseryId, payload);
      }
      setEditingNurseryId(null);
    } else {
      onAddNursery(payload);
    }

    setShowNurseryForm(false);
    setNCustomPlantType('');
  };

  // Handle plan selection to sync form fields for Realisasi
  const handleSelectPlan = (id: string) => {
    setSelectedPlanId(id);
    const selected = plans.find(p => p.id === id);
    if (selected) {
      setRSize(selected.realizedSizeHa !== undefined ? selected.realizedSizeHa.toString() : selected.sizeHa.toString());
      setRYear(selected.realizedYear !== undefined ? selected.realizedYear.toString() : selected.targetYear.toString());
      setRPlants(selected.realizedPlantType || selected.plantType);
      setRMethod(selected.realizedMethod || selected.method);
      setRCost(selected.realizedCost !== undefined ? selected.realizedCost.toString() : selected.estimatedCost.toString());
    } else {
      setRSize('');
      setRYear('');
      setRPlants('');
      setRMethod('');
      setRCost('');
    }
  };

  // Submit Plan (Rencana / Realisasi)
  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (planFormTab === 'rencana') {
      if (!pArea || pArea.trim().length < 2) {
        alert("Nama area wajib diisi (minimal 2 karakter).");
        return;
      }
      if (!pPlants || pPlants.trim().length < 2) {
        alert("Jenis tanaman wajib diisi (minimal 2 karakter).");
        return;
      }
      if (!pMethod || pMethod.trim().length < 2) {
        alert("Metode rencana kerja wajib diisi (minimal 2 karakter).");
        return;
      }
      if (!pPic || pPic.trim().length < 2) {
        alert("Nama PIC penanggung jawab wajib diisi (minimal 2 karakter).");
        return;
      }
      if (Number(pSize) < 0) {
        alert("Luas target rencana tidak boleh negatif.");
        return;
      }
      if (Number(pYear) < 2000 || Number(pYear) > 2100) {
        alert("Tahun target harus antara 2000 dan 2100.");
        return;
      }
      if (Number(pCost) < 0) {
        alert("Estimasi biaya tidak boleh negatif.");
        return;
      }

      const payload = {
        areaName: pArea.trim(),
        sizeHa: Number(pSize) || 0,
        targetYear: Number(pYear) || 2026,
        plantType: pPlants.trim(),
        method: pMethod.trim(),
        estimatedCost: Number(pCost) || 0,
        status: pStatus,
        pic: pPic.trim()
      };

      if (editingPlanId) {
        onUpdatePlan(editingPlanId, payload);
        setEditingPlanId(null);
      } else {
        onAddPlan(payload);
      }
      setPArea('');
      setShowPlanForm(false);
    } else {
      if (!selectedPlanId) {
        alert("Silakan pilih rencana reklamasi yang akan direalisasikan.");
        return;
      }
      onUpdatePlan(selectedPlanId, {
        realizedSizeHa: rSize !== '' ? Number(rSize) : undefined,
        realizedYear: rYear !== '' ? Number(rYear) : undefined,
        realizedPlantType: rPlants || undefined,
        realizedMethod: rMethod || undefined,
        realizedCost: rCost !== '' ? Number(rCost) : undefined,
        status: 'Completed' // Auto-complete the program upon recording full realization
      });
      setSelectedPlanId('');
      setRSize('');
      setRYear('');
      setRPlants('');
      setRMethod('');
      setRCost('');
      setShowPlanForm(false);
    }
  };

  // Submit Guarantee
  const handleGuaranteeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gNo) {
      alert("Masukkan nomor surat jaminan.");
      return;
    }
    const payload = {
      guaranteeNo: gNo,
      guaranteeType: gType,
      value: Number(gValue),
      issuingInstitution: gInst,
      issuedDate: gIssue,
      dueDate: gDue,
      status: gStatus
    };

    if (editingGuaranteeId) {
      if (onUpdateGuarantee) {
        onUpdateGuarantee(editingGuaranteeId, payload);
      }
      setEditingGuaranteeId(null);
    } else {
      onAddGuarantee(payload);
    }

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
    <div id="reclamation-view-wrapper" className="space-y-6 text-slate-700">
      {/* Upper tabs selectors */}
      <div className="flex border-b border-slate-200">
        <button
          id="reclamation-tab-nursery"
          onClick={() => setActiveTab('nursery')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'nursery' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trees className="h-4 w-4" />
          Management Nursery (Persemaian)
        </button>
        <button
          id="reclamation-tab-plans"
          onClick={() => setActiveTab('plans')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'plans' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sprout className="h-4 w-4" />
          Rencana & Progres Reklamasi
        </button>
        <button
          id="reclamation-tab-guarantees"
          onClick={() => setActiveTab('guarantees')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'guarantees' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
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
            <div className="bg-white/60 p-4 border border-slate-200 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <Trees className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Stok Bibit</span>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {nursery.reduce((sum, x) => sum + x.quantity, 0).toLocaleString('id-ID')} Batang
                </p>
              </div>
            </div>

            <div className="bg-white/60 p-4 border border-slate-200 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-teal-500/10 text-teal-600 rounded-xl">
                <Sprout className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Species</span>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {Array.from(new Set(nursery.map(x => x.plantType))).length} Jenis Vegetasi
                </p>
              </div>
            </div>

            <div className="bg-white/60 p-4 border border-slate-200 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Butuh Perawatan</span>
                <p className="text-xl font-bold text-slate-800 mt-1">
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
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:border-teal-500 outline-none w-full"
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
              className="bg-white/80 p-5 rounded-2xl border border-slate-200 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 mb-4 pb-2 border-b border-slate-200">
                {editingNurseryId ? 'Edit Data Penerimaan & Inventarisasi Bibit Nursery' : 'Data Penerimaan & Inventarisasi Bibit Nursery'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Spesies / Jenis Tanaman</label>
                  <select
                    id="nursery-field-type"
                    value={nPlantType}
                    onChange={(e) => setNPlantType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 animate-none"
                  >
                    <option value="Sengon Laut (Falcataria moluccana)">Sengon Laut (Falcataria moluccana)</option>
                    <option value="Acacia mangium">Acacia mangium</option>
                    <option value="Trembesi (Samanea saman)">Trembesi (Samanea saman)</option>
                    <option value="Mahoni (Swietenia mahagoni)">Mahoni (Swietenia mahagoni)</option>
                    <option value="Johar (Senna siamea)">Johar (Senna siamea)</option>
                    <option value="Lainnya">Lainnya (Input Manual)</option>
                  </select>
                  {nPlantType === 'Lainnya' && (
                    <input
                      id="nursery-field-type-custom"
                      type="text"
                      placeholder="Masukkan nama spesies tanaman..."
                      required
                      value={nCustomPlantType}
                      onChange={(e) => setNCustomPlantType(e.target.value)}
                      className="mt-2 w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 animate-fade-in"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Jumlah Bibit (Batang)</label>
                  <input
                    id="nursery-field-qty"
                    type="number"
                    required
                    value={nQuantity}
                    onChange={(e) => setNQuantity(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Sumber / Penyedia Bibit</label>
                  <input
                    id="nursery-field-source"
                    type="text"
                    required
                    value={nSource}
                    onChange={(e) => setNSource(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Umur Semat (Minggu)</label>
                  <input
                    id="nursery-field-age"
                    type="number"
                    required
                    value={nAge}
                    onChange={(e) => setNAge(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Rata-Rata Tinggi (cm)</label>
                  <input
                    id="nursery-field-height"
                    type="number"
                    required
                    value={nHeight}
                    onChange={(e) => setNHeight(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Kondisi Fisik Semai</label>
                  <select
                    id="nursery-field-status"
                    value={nStatus}
                    onChange={(e) => setNStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  >
                    <option value="Healthy">Healthy (Sehat & Hijau)</option>
                    <option value="Need Care">Need Care (Kekurangan Unsur Hara/Hama)</option>
                    <option value="Critical">Critical (Kering / Layu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Plot / Lokasi Bedeng</label>
                  <input
                    id="nursery-field-loc"
                    type="text"
                    required
                    value={nLoc}
                    onChange={(e) => setNLoc(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-200">
                <button
                  id="nursery-form-cancel"
                  type="button"
                  onClick={() => {
                    setShowNurseryForm(false);
                    setEditingNurseryId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="nursery-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  {editingNurseryId ? 'Update Records' : 'Simpan Records'}
                </button>
              </div>
            </form>
          )}

          {/* Nursery table list */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Database Inventaris Benih Persemaian (Nursery Stock List)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-mono tracking-wider uppercase">
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
                      <tr key={item.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                        <td className="p-3.5 pl-5 font-mono">
                          <span className="text-slate-500 text-[9px] block">{item.id}</span>
                          <span className="font-semibold text-slate-600">{item.dateIn}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-700 block">{item.plantType}</span>
                        </td>
                        <td className="p-3.5 text-slate-500">{item.source}</td>
                        <td className="p-3.5 text-center font-semibold text-slate-500">
                          <span className="block">{item.heightCm} cm</span>
                          <span className="text-[10px] text-slate-500 font-mono">{item.ageWeeks} minggu</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border bg-white border-slate-200 font-semibold">
                            <MapPin className="h-3 w-3 text-emerald-600" />
                            {item.location}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-teal-600 font-mono text-sm">
                          {item.quantity.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                            item.status === 'Healthy' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                            item.status === 'Need Care' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-rose-50 border-rose-200 text-rose-600'
                          }`}>
                            {item.status === 'Healthy' ? 'Sehat' : item.status === 'Need Care' ? 'Rentan' : 'Kritis'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center pr-5 flex items-center justify-center gap-1.5">
                          <button
                            id={`nursery-edit-btn-${item.id}`}
                            onClick={() => startEditNursery(item)}
                            className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Edit bibit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            id={`nursery-delete-btn-${item.id}`}
                            onClick={() => {
                              setDeleteConfirm({
                                id: item.id,
                                type: 'nursery',
                                message: `Hapus data bibit ${item.id}?`
                              });
                            }}
                            className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
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
          {/* Executive Comparison Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2 animate-fade-in">
            <div className="bg-white/80 p-4.5 rounded-2xl border border-slate-200 text-left shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Total Luas Rencana</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-700">{totalPlannedSize.toFixed(1)}</span>
                <span className="text-xs text-slate-500 font-semibold uppercase">Hektar</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Sektor target RKL-RPL aktif</p>
            </div>
            
            <div className="bg-white/80 p-4.5 rounded-2xl border border-slate-200 text-left shadow-sm">
              <span className="text-[10px] text-teal-600 font-bold uppercase block mb-1">Total Luas Realisasi</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-teal-600">{totalRealizedSize.toFixed(1)}</span>
                <span className="text-xs text-slate-500 font-semibold uppercase">Hektar</span>
              </div>
              <div className="w-full bg-white h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, sizeProgressPercent)}%` }}></div>
              </div>
              <p className="text-[9px] text-slate-500 mt-1.5">Progress Fisik: <span className="text-teal-600 font-bold">{sizeProgressPercent.toFixed(1)}%</span></p>
            </div>

            <div className="bg-white/80 p-4.5 rounded-2xl border border-slate-200 text-left shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Total Anggaran Rencana</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-slate-200 font-mono text-amber-500">{formatIDR(totalPlannedCost)}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">Alokasi pagu disetujui ESDM</p>
            </div>

            <div className="bg-white/80 p-4.5 rounded-2xl border border-slate-200 text-left shadow-sm">
              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Realisasi Biaya Aktual</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-emerald-600 font-mono">{formatIDR(totalRealizedCost)}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                {totalPlannedCost - totalRealizedCost >= 0 ? (
                  <span className="text-emerald-500 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-semibold">Efisiensi: {formatIDR(totalPlannedCost - totalRealizedCost)}</span>
                ) : (
                  <span className="text-red-600 text-[10px] bg-red-500/10 px-2 py-0.5 rounded font-mono font-semibold">Over Budget: {formatIDR(Math.abs(totalPlannedCost - totalRealizedCost))}</span>
                )}
              </p>
            </div>
          </div>

          {/* Action header and Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative min-w-[320px] w-full md:w-auto">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                id="plans-search-input"
                type="text"
                placeholder="Cari nama area / PIC penanggung jawab..."
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:border-teal-500 outline-none w-full font-sans"
              />
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto w-full md:w-auto">
              <button
                id="plans-add-btn-rencana"
                onClick={() => {
                  setPlanFormTab('rencana');
                  setEditingPlanId(null);
                  setPArea('');
                  setPSize(10.0);
                  setPYear(new Date().getFullYear());
                  setPPlants('Sengon & Acacia mangium');
                  setPMethod('Hydroseeding & Pot Campuran');
                  setPCost(250000000);
                  setPStatus('Draft');
                  setPPic('Bambang Trimurti');
                  setShowPlanForm(true);
                }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 font-bold rounded-xl text-xs cursor-pointer shadow transition-all`}
              >
                <Plus className="h-4 w-4 text-teal-600" />
                Buat Rencana Baru
              </button>
              
              <button
                id="plans-add-btn-realisasi"
                onClick={() => {
                  setPlanFormTab('realisasi');
                  setEditingPlanId(null);
                  setSelectedPlanId('');
                  setRSize('');
                  setRYear('');
                  setRPlants('');
                  setRMethod('');
                  setRCost('');
                  setShowPlanForm(true);
                }}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 hover:bg-teal-400 font-bold rounded-xl text-xs cursor-pointer shadow transition-all`}
              >
                <Activity className="h-4 w-4" />
                Catat Realisasi Kerja
              </button>
            </div>
          </div>

          {/* Form write plan */}
          {showPlanForm && (
            <form 
              id="plan-form-element"
              onSubmit={handlePlanSubmit}
              className="bg-white/80 p-5 rounded-2xl border border-slate-200 text-left animate-slide-up shadow-xl"
            >
              {/* Form Tab Switches */}
              <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 flex items-center gap-2">
                  <span>{planFormTab === 'rencana' ? (editingPlanId ? 'Edit Program Rencana Kerja Reklamasi' : 'Pendaftaran Program Rencana Kerja Reklamasi Baru') : 'Pencatatan Realisasi Program Kerja Reklamasi'}</span>
                </h3>
                <div className="flex gap-1.5 p-1 bg-white rounded-lg border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setPlanFormTab('rencana');
                    }}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      planFormTab === 'rencana' ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    1. Input Target Rencana
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanFormTab('realisasi');
                    }}
                    className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      planFormTab === 'realisasi' ? 'bg-teal-500 text-slate-950 font-black' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    2. Input Realisasi Lapangan
                  </button>
                </div>
              </div>

              {planFormTab === 'rencana' ? (
                /* SECTION INPUT TARGET RENCANA */
                <div className="space-y-4 animate-fade-in font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Nama Blok Kerja / Area Penambangan</label>
                      <input
                        id="plan-field-area"
                        type="text"
                        required
                        placeholder="Contoh: Disposal Area Utara Sektor G (LWG-01)"
                        value={pArea}
						onChange={(e) => setPArea(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Luas Target Rencana (Ha)</label>
                      <input
                        id="plan-field-size"
                        type="number"
                        step="0.01"
                        required
                        value={pSize}
                        onChange={(e) => setPSize(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Target Fisik (Tahun)</label>
                      <input
                        id="plan-field-year"
                        type="number"
                        required
                        value={pYear}
                        onChange={(e) => setPYear(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Komposisi Vegetasi Rencana</label>
                      <input
                        id="plan-field-plants"
                        type="text"
                        required
                        placeholder="Contoh: Trembesi & Sengon"
                        value={pPlants}
                        onChange={(e) => setPPlants(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Metode Rencana Kerja Kerja</label>
                      <input
                        id="plan-field-method"
                        type="text"
                        required
                        placeholder="Contoh: Pot Tanam Langsung"
                        value={pMethod}
                        onChange={(e) => setPMethod(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Estimasi Anggaran Target (IDR)</label>
                      <input
                        id="plan-field-cost"
                        type="number"
                        required
                        value={pCost}
                        onChange={(e) => setPCost(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 text-teal-600 font-semibold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">PIC Penanggung Jawab</label>
                      <input
                        id="plan-field-pic"
                        type="text"
                        required
                        value={pPic}
                        onChange={(e) => setPPic(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Status Kelayakan Awal</label>
                    <div className="flex gap-2">
                      {['Draft', 'Approved', 'In Progress', 'Completed'].map(state => (
                        <button
                          id={`plan-status-btn-${state}`}
                          key={state}
                          type="button"
                          onClick={() => setPStatus(state as any)}
                          className={`px-4 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                            pStatus === state 
                              ? 'bg-teal-500/10 border-teal-500 text-teal-600' 
                              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {state === 'Draft' ? 'Konsep / Draft' :
                           state === 'Approved' ? 'Disetujui ESDM' :
                           state === 'In Progress' ? 'Pekerjaan Aktif' : 'Selesai'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* SECTION INPUT REALISASI */
                <div className="space-y-4 animate-fade-in font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Pilih Target Area Reklamasi</label>
                      <select
                        value={selectedPlanId}
                        onChange={(e) => handleSelectPlan(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                      >
                        <option value="">-- Pilih target rencana area dlu --</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.id} - {p.areaName} ({p.sizeHa} Ha)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Luas Realisasi Lapangan (Ha)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        disabled={!selectedPlanId}
                        placeholder={!selectedPlanId ? "Pilih rencana area dahulu..." : "Masukkan luas terealisasi"}
                        value={rSize}
                        onChange={(e) => setRSize(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 font-mono disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Tahun Realisasi Aktual</label>
                      <input
                        type="number"
                        required
                        disabled={!selectedPlanId}
                        placeholder={!selectedPlanId ? "Pilih rencana area dahulu..." : "Contoh: 2026"}
                        value={rYear}
                        onChange={(e) => setRYear(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 font-mono disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {selectedPlanId && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Vegetasi Lapangan Terpasang (Aktual)</label>
                        <input
                          type="text"
                          required
                          placeholder="Spesies tanaman yang riil ditanam..."
                          value={rPlants}
                          onChange={(e) => setRPlants(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Metode Lapangan Terapan (Aktual)</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Hydroseeding sipil"
                          value={rMethod}
                          onChange={(e) => setRMethod(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase">Biaya Realisasi Aktual (IDR)</label>
                        <input
                          type="number"
                          required
                          placeholder="Nominal rupiah yang dikeluarkan..."
                          value={rCost}
                          onChange={(e) => setRCost(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 font-mono text-teal-600 font-semibold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3.5 pt-3.5 border-t border-slate-200 mt-5">
                <button
                  id="plans-form-cancel"
                  type="button"
                  onClick={() => {
                    setShowPlanForm(false);
                    setSelectedPlanId('');
                    setRSize('');
                    setRYear('');
                    setRPlants('');
                    setRMethod('');
                    setRCost('');
                    setEditingPlanId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="plans-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer transition-colors hover:bg-teal-600"
                >
                  {planFormTab === 'rencana' ? (editingPlanId ? 'Update Target Rencana' : 'Daftarkan Target Rencana') : 'Simpan Realisasi Aktual'}
                </button>
              </div>
            </form>
          )}

          {/* Comparative Table display */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow animate-fade-in">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">Tabel Komparasi Rencana vs Realisasi Kerja Reklamasi</h4>
                <p className="text-[10px] text-slate-500 mt-1">Daftar blok reklamasi beserta targets (RKL) dan progres aktual di lapangan (RPL)</p>
              </div>
              <span className="text-[10px] bg-white text-slate-500 px-3 py-1 rounded-lg border border-slate-200 font-mono self-start md:self-auto">Status: Komparasi Terpisah Aktif</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">Blok / Wilayah</th>
                    <th className="p-3.5">Sasaran Rencana (Rencana)</th>
                    <th className="p-3.5">Realisasi Lapangan (Realisasi)</th>
                    <th className="p-3.5 text-center">Tahun Fisik</th>
                    <th className="p-3.5 text-center">Progres Ha (Fisik)</th>
                    <th className="p-3.5 text-right">Perbandingan Anggaran</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-600 italic">Tidak ada agenda rencana/realisasi reklamasi yang diajukan.</td>
                    </tr>
                  ) : (
                    filteredPlans.map(item => {
                      const pctLuas = item.realizedSizeHa !== undefined && item.sizeHa > 0
                        ? (item.realizedSizeHa / item.sizeHa) * 100
                        : 0;

                      const selisihBiaya = item.realizedCost !== undefined
                        ? item.estimatedCost - item.realizedCost
                        : null;

                      return (
                        <tr key={item.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                          <td className="p-3.5 pl-5 font-sans">
                            <span className="text-[10px] font-mono text-slate-500 block mb-0.5">{item.id}</span>
                            <span className="font-bold text-slate-800 block text-xs leading-tight">{item.areaName}</span>
                            <span className="text-[10px] text-slate-500 block mt-1">PIC: {item.pic}</span>
                          </td>
                          <td className="p-3.5 py-4 align-top">
                            <div className="flex flex-col space-y-1">
                              <span className="text-slate-600 font-semibold flex items-center gap-1">
                                <span className="text-emerald-500 text-[10px]">● TARGET</span>
                              </span>
                              <span className="text-slate-200 font-medium">{item.plantType}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{item.method}</span>
                              <div className="text-[11px] font-bold text-slate-500 pt-1">Pagu Luas: {item.sizeHa} Ha</div>
                            </div>
                          </td>
                          <td className="p-3.5 py-4 align-top">
                            {item.realizedSizeHa !== undefined ? (
                              <div className="flex flex-col space-y-1">
                                <span className="text-teal-600 font-semibold flex items-center gap-1">
                                  <span className="text-teal-600 text-[10px]">● AKTUAL</span>
                                </span>
                                <span className="text-teal-300 font-bold">{item.realizedPlantType || item.plantType}</span>
                                <span className="text-[10px] text-teal-600 font-mono">{item.realizedMethod || item.method}</span>
                                <div className="text-[11px] font-bold text-teal-600 pt-1">Hasil Riil: {item.realizedSizeHa} Ha</div>
                              </div>
                            ) : (
                              <div className="py-2.5">
                                <span className="text-slate-600 text-xs italic block mb-2">Belum terealisasi</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPlanFormTab('realisasi');
                                    handleSelectPlan(item.id);
                                    setShowPlanForm(true);
                                  }}
                                  className="text-[11px] text-teal-600 font-bold hover:text-teal-300 transition-all underline shrink-0 cursor-pointer text-left block"
                                >
                                  + Catat Realisasi Lapangan
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-600 font-mono align-top py-4">
                            <div className="flex flex-col items-center justify-start space-y-1.5 h-full">
                              <span className="text-slate-500 text-[10px] uppercase font-bold bg-white/60 px-1.5 py-0.5 rounded border border-slate-200">Target: {item.targetYear}</span>
                              {item.realizedYear ? (
                                <span className="text-teal-600 text-[11px] bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20 font-bold mt-1 shadow-sm">Real: {item.realizedYear}</span>
                              ) : (
                                <span className="text-slate-600 text-[10px] mt-1 italic">Blm Ada</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-center align-top min-w-[130px] py-4">
                            <div className="flex flex-col items-center justify-start">
                              <div className="flex items-baseline gap-1 font-bold text-slate-600 font-mono text-xs">
                                <span className={item.realizedSizeHa !== undefined ? "text-teal-600" : "text-slate-500"}>
                                  {item.realizedSizeHa !== undefined ? item.realizedSizeHa : 0}
                                </span>
                                <span className="text-slate-600 text-[10px]">/</span>
                                <span className="text-slate-500">{item.sizeHa} Ha</span>
                              </div>
                              
                              <div className="w-full max-w-[85px] bg-white border border-slate-200/80 h-2 rounded-full mt-2.5 overflow-hidden shadow-inner">
                                <div className="bg-teal-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, pctLuas)}%` }}></div>
                              </div>
                              
                              {item.realizedSizeHa !== undefined && (
                                <span className="text-[10px] text-slate-500 mt-2 font-mono font-bold bg-white/80 px-1.5 py-0.5 rounded">
                                  {pctLuas.toFixed(0)}% Selesai
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-bold font-mono align-top py-4 min-w-[140px]">
                            <div className="flex flex-col items-end space-y-1.5">
                              <div className="text-[11px] text-slate-500"><span className="text-[9px] uppercase font-mono text-slate-500">Rcn:</span> {formatIDR(item.estimatedCost)}</div>
                              {item.realizedCost !== undefined ? (
                                <>
                                  <div className="text-[11px] text-emerald-600"><span className="text-[9px] uppercase font-mono text-slate-500">Real:</span> {formatIDR(item.realizedCost)}</div>
                                  {selisihBiaya !== null && (
                                    <div className="pt-1">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                        selisihBiaya >= 0 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
                                      }`}>
                                        {selisihBiaya >= 0 ? `Hemat: ${formatIDR(selisihBiaya)}` : `Over: ${formatIDR(Math.abs(selisihBiaya))}`}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-600 text-[10px] italic">-</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-center align-top py-4">
                            <span className={`text-[9px] px-2.5 py-1 rounded border font-bold uppercase block text-center ${
                              item.status === 'Completed' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-600' :
                              item.status === 'In Progress' ? 'bg-blue-500/15 border-blue-500/20 text-blue-600' :
                              item.status === 'Approved' ? 'bg-teal-500/15 border-teal-500/20 text-teal-600' :
                              'bg-white border-slate-700 text-slate-500'
                            }`}>
                              {item.status === 'Draft' ? 'Draft' :
                               item.status === 'Approved' ? 'Disetujui' :
                               item.status === 'In Progress' ? 'Pekerjaan' : 'Selesai'}
                            </span>
                            
                            {item.realizedSizeHa !== undefined && item.status !== 'Completed' && (
                              <span className="text-[9px] text-teal-600 font-semibold block mt-1.5 font-mono">✓ Lapangan</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center pr-5 align-top py-4">
                            <div className="flex flex-col md:flex-row items-center justify-center gap-1.5">
                              {item.realizedSizeHa !== undefined && (
                                <button
                                  id={`plans-reset-btn-${item.id}`}
                                  title="Reset data Realisasi lapangan"
                                  onClick={() => {
                                    setDeleteConfirm({
                                      id: item.id,
                                      type: 'reset-plan',
                                      message: `Reset atau hapus data realisasi lapangan untuk area ${item.id}?`
                                    });
                                  }}
                                  className="text-[9px] text-amber-500 hover:text-amber-600 hover:underline cursor-pointer border border-amber-500/10 px-1.5 py-0.5 rounded font-bold transition-all"
                                >
                                  Reset Realisasi
                                </button>
                              )}
                              <button
                                id={`plans-edit-btn-${item.id}`}
                                title="Edit rencana program kerja"
                                onClick={() => startEditPlan(item)}
                                className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                id={`plans-delete-btn-${item.id}`}
                                onClick={() => {
                                  setDeleteConfirm({
                                    id: item.id,
                                    type: 'plan',
                                    message: `Hapus program kerja reklamasi ${item.id} beserta seluruh data rencana & realisasinya?`
                                  });
                                }}
                                className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
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
        </div>
      )}

      {activeTab === 'guarantees' && (
        <div id="reclamation-guarantees-panel" className="space-y-6">
          {/* Danger alert for soon expired items */}
          <div className="bg-[#b91c1c]/10 border border-red-500/30 p-4.5 rounded-2xl flex items-start gap-4 mb-3 text-left">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-600">Perhatian Regulasi ESDM</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
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
              className="bg-white/80 p-5 rounded-2xl border border-slate-200 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 mb-4 pb-2 border-b border-slate-200">
                {editingGuaranteeId ? 'Edit Data Penempatan Jaminan Finansial Reklamasi' : 'Data Penempatan Jaminan Finansial Reklamasi Tambang'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Nomor Surat Jaminan / Deposit</label>
                  <input
                    id="guarantees-field-no"
                    type="text"
                    required
                    placeholder="JAMREK-2026-PTKBB-XXX"
                    value={gNo}
                    onChange={(e) => setGNo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Tipe Jaminan Finansial</label>
                  <select
                    id="guarantees-field-type"
                    value={gType}
                    onChange={(e) => setGType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  >
                    <option value="Bank Guarantee">Bank Guarantee / Jaminan Bank</option>
                    <option value="Time Deposit">Time Deposit / Deposito Berjangka</option>
                    <option value="Environmental Bond">Environmental Bond / Asuransi Lingkungan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Nilai Jaminan Finansial (IDR)</label>
                  <input
                    id="guarantees-field-value"
                    type="number"
                    required
                    value={gValue}
                    onChange={(e) => setGValue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 text-emerald-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Lembaga Keuangan Penerbit</label>
                  <input
                    id="guarantees-field-institution"
                    type="text"
                    required
                    placeholder="Contoh: PT Bank Mandiri Tbk"
                    value={gInst}
                    onChange={(e) => setGInst(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Tanggal Penerbitan</label>
                  <input
                    id="guarantees-field-issued"
                    type="date"
                    required
                    value={gIssue}
                    onChange={(e) => setGIssue(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Tanggal Jatuh Tempo</label>
                  <input
                    id="guarantees-field-due"
                    type="date"
                    required
                    value={gDue}
                    onChange={(e) => setGDue(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Status Kepatuhan Dokumen</label>
                  <select
                    id="guarantees-field-status"
                    value={gStatus}
                    onChange={(e) => setGStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  >
                    <option value="Active">🔴 Active & Valid</option>
                    <option value="Renewal Needed">⚠️ Renewal Needed / Segera Habis</option>
                    <option value="Claimed">Claimed / Diambil Alih ESDM</option>
                    <option value="Released">Released (Selesai Pascatambang)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-200">
                <button
                  id="guarantees-form-cancel"
                  type="button"
                  onClick={() => {
                    setShowGuaranteeForm(false);
                    setEditingGuaranteeId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="guarantees-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  {editingGuaranteeId ? 'Update Jamrek' : 'Daftarkan Jamrek'}
                </button>
              </div>
            </form>
          )}

          {/* Guarantee list table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Dokumen Penempatan Jaminan Pascatambang & Reklamasi</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-mono tracking-wider uppercase">
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
                        <tr key={item.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                          <td className="p-3.5 pl-5 font-mono font-bold text-slate-700">
                            <span className="text-slate-500 text-[9px] block mb-0.5">{item.id}</span>
                            {item.guaranteeNo}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] border bg-white border-slate-200 font-semibold text-slate-500">
                              {item.guaranteeType}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-600 font-mono text-sm">
                            {formatIDR(item.value)}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-600">{item.issuingInstitution}</td>
                          <td className="p-3.5 text-center text-slate-500">{item.issuedDate}</td>
                          <td className="p-3.5 text-center font-mono">
                            <span className={`font-bold ${isWarn ? 'text-red-600' : 'text-slate-600'}`}>
                              {item.dueDate}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`text-[10px] px-2.5 py-1 rounded border font-bold uppercase ${
                              item.status === 'Active' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                              item.status === 'Renewal Needed' ? 'bg-red-500/10 border-red-500/20 text-red-600 font-extrabold animate-pulse' :
                              'bg-white border-slate-300 text-slate-500'
                            }`}>
                              {item.status === 'Active' ? 'Valid' :
                               item.status === 'Renewal Needed' ? 'Renewal segera' : item.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-center pr-5 flex items-center justify-center gap-1.5">
                            <button
                              id={`guarantees-edit-btn-${item.id}`}
                              onClick={() => startEditGuarantee(item)}
                              className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                              title="Edit jaminan"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              id={`guarantees-delete-btn-${item.id}`}
                              onClick={() => {
                                setDeleteConfirm({
                                  id: item.id,
                                  type: 'guarantee',
                                  message: `Hapus records penjaminan ${item.guaranteeNo}?`
                                });
                              }}
                              className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
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

      {deleteConfirm && (
        <ModalPortal>
          <div id="delete-confirm-modal-rec" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-700 text-left">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1 rounded-lg bg-red-500/10 text-red-500">
                  <Trash2 size={16} />
                </span>
                Konfirmasi Tindakan
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
                    const { id, type } = deleteConfirm;
                    setDeleteConfirm(null);
                    try {
                      if (type === 'nursery') {
                        await onDeleteNursery(id);
                      } else if (type === 'plan') {
                        await onDeletePlan(id);
                      } else if (type === 'reset-plan') {
                        await onUpdatePlan(id, {
                          realizedSizeHa: undefined,
                          realizedYear: undefined,
                          realizedPlantType: undefined,
                          realizedMethod: undefined,
                          realizedCost: undefined,
                          status: 'In Progress'
                        });
                      } else if (type === 'guarantee') {
                        await onDeleteGuarantee(id);
                      }
                    } catch (err: any) {
                      alert('Gagal mengeksekusi tindakan: ' + err.message);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-500 text-slate-900 font-bold transition-colors cursor-pointer"
                >
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
