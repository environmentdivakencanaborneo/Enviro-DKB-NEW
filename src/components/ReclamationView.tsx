/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import ModalPortal from './ModalPortal';
import NurseryStockOutForm from './NurseryStockOutForm';
import { NurseryData, NurseryStockOut, ReclamationPlan, ReclamationGuarantee } from '../types';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import { triggerToast } from '../utils/errorHandler';
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
  Pencil,
  ArrowUpDown
} from 'lucide-react';

export const GUARANTEE_WARNING_DAYS = 90;

export function getGuaranteeYear(g: ReclamationGuarantee): number | null {
  if (typeof g.periodYear === 'number' && !isNaN(g.periodYear) && g.periodYear >= 2000 && g.periodYear <= 2100) {
    return g.periodYear;
  }
  if (g.issuedDate && typeof g.issuedDate === 'string') {
    const y = Number(g.issuedDate.slice(0, 4));
    if (!isNaN(y) && y >= 2000 && y <= 2100) {
      return y;
    }
  }
  return null;
}

interface ReclamationViewProps {
  canEdit?: boolean;
  canDelete?: boolean;
  onUnauthorizedAction?: (msg: string) => void;
  nursery: NurseryData[];
  nurseryStockOut: NurseryStockOut[];
  onAddNurseryStockOut: (item: any) => void;
  onUpdateNurseryStockOut?: (id: string, item: any) => void;
  onDeleteNurseryStockOut: (id: string) => void;
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
  canEdit = false,
  canDelete = false,
  onUnauthorizedAction = () => {},

  nursery,
  nurseryStockOut,
  onAddNurseryStockOut,
  onUpdateNurseryStockOut,
  onDeleteNurseryStockOut,
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
    type: 'nursery' | 'nurseryStockOut' | 'plan' | 'reset-plan' | 'guarantee';
    message: string;
  } | null>(null);

  // EDIT STATE
  const [editingNurseryId, setEditingNurseryId] = useState<string | null>(null);
  const [editingGuaranteeId, setEditingGuaranteeId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // NURSERY STATE
  const [showNurseryForm, setShowNurseryForm] = useState(false);
  const [showNurseryOutForm, setShowNurseryOutForm] = useState(false);
  const [editingNurseryOutId, setEditingNurseryOutId] = useState<string | null>(null);
  const [initialNurseryOutData, setInitialNurseryOutData] = useState<NurseryStockOut | null>(null);
  const [nurseryHistoryId, setNurseryHistoryId] = useState<string | null>(null);
  const [nurseryOutFilter, setNurseryOutFilter] = useState<'all' | 'in' | 'out'>('all');

  const [nurserySearch, setNurserySearch] = useState('');
  // Forms
  const [nPlantType, setNPlantType] = useState('Sengon Laut (Falcataria moluccana)');
  const [nCustomPlantType, setNCustomPlantType] = useState('');
  const [nQuantity, setNQuantity] = useState(5000);
  const [nSource, setNSource] = useState('Pembibitan Lokal Mandiri');
  const [nAge, setNAge] = useState(12);
  const [nHeight, setNHeight] = useState(40);
  const [nStatus, setNStatus] = useState<any>('Healthy');
  const [nLoc, setNLoc] = useState('Nursery Blok A Barat');
  const [nDate, setNDate] = useState(todayLocalISO());

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

  // DELETE CONFIRMATION STATE
  const [isProcessing, setIsProcessing] = useState(false);

  // GUARANTEES STATE
  const [showGuaranteeForm, setShowGuaranteeForm] = useState(false);
  const [isSubmittingGuarantee, setIsSubmittingGuarantee] = useState(false);
  // Forms
  const [gNo, setGNo] = useState('');
  const [gPeriodYear, setGPeriodYear] = useState<number | ''>(new Date().getFullYear());
  const [gType, setGType] = useState<'Bank Guarantee' | 'Time Deposit' | 'Environmental Bond'>('Bank Guarantee');
  const [gValue, setGValue] = useState(500000000);
  const [gInst, setGInst] = useState('PT Bank Mandiri (Persero) Tbk');
  const [gIssue, setGIssue] = useState(todayLocalISO());
  const [gDue, setGDue] = useState(todayLocalISO(Date.now() + 365 * 24 * 60 * 60 * 1000));
  const [gStatus, setGStatus] = useState<'Active' | 'Renewal Needed' | 'Claimed' | 'Released'>('Active');

  // Guarantees Filter & Sort State
  const [guaranteeSearch, setGuaranteeSearch] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<'all' | number>('all');
  const [guaranteeSort, setGuaranteeSort] = useState<'year-desc' | 'year-asc' | 'due-asc' | 'value-desc'>('year-desc');

  const resetGuaranteeForm = () => {
    setEditingGuaranteeId(null);
    setGNo('');
    setGPeriodYear(new Date().getFullYear());
    setGType('Bank Guarantee');
    setGValue(500000000);
    setGInst('PT Bank Mandiri (Persero) Tbk');
    setGIssue(todayLocalISO());
    setGDue(todayLocalISO(Date.now() + 365 * 24 * 60 * 60 * 1000));
    setGStatus('Active');
  };

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
    setGPeriodYear(item.periodYear ?? (Number(item.issuedDate?.slice(0, 4)) || new Date().getFullYear()));
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('coal_monitor_toast', { detail: { message: 'Data berhasil disimpan.', type: 'success' } }));
    }
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
  const handleGuaranteeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNo = gNo.trim();
    if (!trimmedNo) {
      triggerToast('Nomor jaminan wajib diisi.', 'error');
      return;
    }

    const isDuplicateNo = guarantees.some(g =>
      g.id !== editingGuaranteeId &&
      g.guaranteeNo.trim().toLowerCase() === trimmedNo.toLowerCase()
    );
    if (isDuplicateNo) {
      triggerToast('Nomor jaminan sudah terdaftar. Harap gunakan nomor yang berbeda.', 'error');
      return;
    }

    if (typeof gValue !== 'number' || isNaN(gValue) || gValue <= 0) {
      triggerToast('Nilai jaminan finansial harus lebih besar dari 0.', 'error');
      return;
    }

    const trimmedInst = gInst.trim();
    if (trimmedInst.length < 2) {
      triggerToast('Lembaga keuangan penerbit minimal 2 karakter.', 'error');
      return;
    }

    if (gDue <= gIssue) {
      triggerToast('Tanggal jatuh tempo harus setelah tanggal penerbitan.', 'error');
      return;
    }

    const yearNum = Number(gPeriodYear);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      triggerToast('Tahun jaminan harus berada di antara tahun 2000 dan 2100.', 'error');
      return;
    }

    try {
      setIsSubmittingGuarantee(true);
      const payload: Omit<ReclamationGuarantee, 'id'> = {
        guaranteeNo: trimmedNo,
        periodYear: yearNum,
        guaranteeType: gType,
        value: Number(gValue),
        issuingInstitution: trimmedInst,
        issuedDate: gIssue,
        dueDate: gDue,
        status: gStatus
      };

      if (editingGuaranteeId) {
        if (onUpdateGuarantee) {
          await onUpdateGuarantee(editingGuaranteeId, payload);
        }
      } else {
        await onAddGuarantee(payload);
      }

      window.dispatchEvent(new CustomEvent('coal_monitor_toast', {
        detail: {
          message: editingGuaranteeId ? 'Data jaminan berhasil diperbarui.' : 'Data jaminan berhasil didaftarkan.',
          type: 'success'
        }
      }));

      resetGuaranteeForm();
      setShowGuaranteeForm(false);
    } catch {
      // Form tetap terbuka dengan isian utuh bila gagal; toast error sudah ditampilkan handleGlobalError
    } finally {
      setIsSubmittingGuarantee(false);
    }
  };

  const uniqueGuaranteeYears = useMemo(() => {
    const yearSet = new Set<number>();
    guarantees.forEach(g => {
      const y = getGuaranteeYear(g);
      if (y !== null) yearSet.add(y);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [guarantees]);

  const sortedAndFilteredGuarantees = useMemo(() => {
    let list = [...guarantees];

    // Filter Pencarian
    if (guaranteeSearch.trim()) {
      const q = guaranteeSearch.trim().toLowerCase();
      list = list.filter(g =>
        (g.guaranteeNo && g.guaranteeNo.toLowerCase().includes(q)) ||
        (g.issuingInstitution && g.issuingInstitution.toLowerCase().includes(q))
      );
    }

    // Filter Tahun
    if (selectedYearFilter !== 'all') {
      list = list.filter(g => getGuaranteeYear(g) === Number(selectedYearFilter));
    }

    // Urutkan
    list.sort((a, b) => {
      const yA = getGuaranteeYear(a);
      const yB = getGuaranteeYear(b);

      if (guaranteeSort === 'year-desc' || guaranteeSort === 'year-asc') {
        if (yA === null && yB === null) return 0;
        if (yA === null) return 1;
        if (yB === null) return -1;

        if (yA !== yB) {
          return guaranteeSort === 'year-desc' ? yB - yA : yA - yB;
        }
        // Urutan sekunder: issuedDate menurun, lalu guaranteeNo A–Z
        const dateA = a.issuedDate || '';
        const dateB = b.issuedDate || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return (a.guaranteeNo || '').localeCompare(b.guaranteeNo || '');
      }

      if (guaranteeSort === 'due-asc') {
        const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (dueA !== dueB) return dueA - dueB;
        return (a.guaranteeNo || '').localeCompare(b.guaranteeNo || '');
      }

      if (guaranteeSort === 'value-desc') {
        const vA = a.value || 0;
        const vB = b.value || 0;
        if (vA !== vB) return vB - vA;
        return (a.guaranteeNo || '').localeCompare(b.guaranteeNo || '');
      }

      return 0;
    });

    return list;
  }, [guarantees, guaranteeSearch, selectedYearFilter, guaranteeSort]);

  const yearGroupStats = useMemo(() => {
    const map = new Map<number | null, { count: number; totalValue: number }>();
    sortedAndFilteredGuarantees.forEach(g => {
      const y = getGuaranteeYear(g);
      const stat = map.get(y) || { count: 0, totalValue: 0 };
      stat.count += 1;
      stat.totalValue += (g.value || 0);
      map.set(y, stat);
    });
    return map;
  }, [sortedAndFilteredGuarantees]);

  const filteredTotalValue = useMemo(() => {
    return sortedAndFilteredGuarantees.reduce((sum, g) => sum + (g.value || 0), 0);
  }, [sortedAndFilteredGuarantees]);

  // Format IDR helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  // Filters
  const filteredNursery = nursery.filter(item => {
    const matchesSearch = item.plantType.toLowerCase().includes(nurserySearch.toLowerCase()) || 
                          item.location.toLowerCase().includes(nurserySearch.toLowerCase());
    
    if (!matchesSearch) return false;
    
    const qtyOut = nurseryStockOut?.filter(out => out.jenisBibitId === item.id).reduce((sum, out) => sum + out.jumlahKeluar, 0) || 0;
    
    if (nurseryOutFilter === 'out') {
      return qtyOut > 0;
    } else if (nurseryOutFilter === 'in') {
      return qtyOut === 0;
    }
    return true;
  });

  const filteredPlans = plans.filter(item => {
    return item.areaName.toLowerCase().includes(planSearch.toLowerCase()) || 
           item.pic.toLowerCase().includes(planSearch.toLowerCase());
  });

    const handleExportNursery = () => {
    // Generate unified ledger
    let rows: any[] = [];
    nursery.forEach(item => {
      rows.push({
        'Tanggal': item.dateIn,
        'Jenis Bibit': item.plantType,
        'Species': item.plantType,
        'Masuk': item.quantity,
        'Keluar': 0,
        'Sisa Stok': 0,
        'Jenis Transaksi': 'Penerimaan',
        'Lokasi Penanaman': item.location || '-',
        'PIC': item.source
      });
    });
    nurseryStockOut?.forEach(out => {
      const parent = nursery.find(n => n.id === out.jenisBibitId);
      rows.push({
        'Tanggal': out.tanggal,
        'Jenis Bibit': out.namaBibit,
        'Species': out.species || parent?.plantType || out.namaBibit,
        'Masuk': 0,
        'Keluar': out.jumlahKeluar,
        'Sisa Stok': 0, 
        'Jenis Transaksi': out.jenisTransaksi || 'Keluar',
        'Lokasi Penanaman': out.lokasiPenanaman || '-',
        'PIC': out.penanggungJawab || '-'
      });
    });
    
    // Sort by date
    rows.sort((a, b) => new Date(a.Tanggal).getTime() - new Date(b.Tanggal).getTime());
    
    // Calculate running stock per species
    const stockMap: Record<string, number> = {};
    rows.forEach(r => {
      if (!stockMap[r.Species]) stockMap[r.Species] = 0;
      stockMap[r.Species] += r.Masuk - r.Keluar;
      r['Sisa Stok'] = stockMap[r.Species];
    });

    exportToExcel(rows, 'Nursery_Stock_Ledger');
  };

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Bibit Masuk</span>
              <p className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
                {nursery.reduce((sum, x) => sum + x.quantity, 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Bibit Keluar</span>
              <p className="text-2xl font-bold text-rose-600 mt-2 font-mono">
                {(nurseryStockOut?.reduce((sum, x) => sum + x.jumlahKeluar, 0) || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
              <div className="absolute -right-2 -top-2 opacity-5">
                <Trees className="w-20 h-20" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Stok Tersedia</span>
              <p className="text-3xl font-bold text-slate-800 mt-2 font-mono relative z-10">
                {(nursery.reduce((sum, x) => sum + x.quantity, 0) - (nurseryStockOut?.reduce((sum, x) => sum + x.jumlahKeluar, 0) || 0)).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Availability</span>
              <p className="text-2xl font-bold text-blue-600 mt-2 font-mono">
                {nursery.reduce((sum, x) => sum + x.quantity, 0) > 0 ? Math.round(((nursery.reduce((sum, x) => sum + x.quantity, 0) - (nurseryStockOut?.reduce((sum, x) => sum + x.jumlahKeluar, 0) || 0)) / nursery.reduce((sum, x) => sum + x.quantity, 0)) * 100) : 0}%
              </p>
            </div>
            <div className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ditanam Bulan Ini</span>
              <p className="text-xl font-bold text-emerald-600 mt-2 font-mono">
                {(() => {
                  const currentMonth = todayLocalISO().slice(0, 7);
                  return nurseryStockOut?.filter(x => x.tanggal.startsWith(currentMonth) && x.jenisTransaksi === 'Penanaman').reduce((sum, x) => sum + x.jumlahKeluar, 0) || 0;
                })().toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Bibit Rusak</span>
              <p className="text-xl font-bold text-rose-600 mt-2 font-mono">
                {(() => {
                  return nurseryStockOut?.filter(x => x.jenisTransaksi === 'Rusak').reduce((sum, x) => sum + x.jumlahKeluar, 0) || 0;
                })().toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Species</span>
              <p className="text-xl font-bold text-slate-800 mt-2 font-mono">
                {Array.from(new Set(nursery.map(x => x.plantType))).length}
              </p>
            </div>
            <div className="bg-white p-4 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Butuh Perawatan</span>
              <p className="text-xl font-bold text-amber-500 mt-2 font-mono">
                {nursery.filter(x => ['Need Care', 'Perlu Perawatan'].includes(x.status)).length}
              </p>
            </div>
          </div>
          
          {/* Table Toolbar controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-2">
              <button onClick={() => setNurseryOutFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${nurseryOutFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Semua</button>
              <button onClick={() => setNurseryOutFilter('in')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${nurseryOutFilter === 'in' ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Belum Keluar</button>
              <button onClick={() => setNurseryOutFilter('out')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${nurseryOutFilter === 'out' ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Pernah Keluar</button>
            </div>
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
              onClick={() => { setShowNurseryForm(true); setShowNurseryOutForm(false); }}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow cursor-pointer self-start"
            >
              <Plus className="h-4 w-4" />
              Registrasi Jenis Bibit Baru
            </button>
            <button
              type="button"
              onClick={() => { setShowNurseryOutForm(true); setShowNurseryForm(false); }}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-green-600 text-slate-50 font-bold rounded-xl text-xs shadow cursor-pointer self-start ml-2 hover:bg-green-700"
            >
              <ArrowRight className="h-4 w-4" />
              Bibit Keluar
            </button>
            <button
              type="button"
              onClick={handleExportNursery}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs shadow cursor-pointer self-start ml-2 hover:bg-slate-700"
            >
              <FileCheck2 className="h-4 w-4" />
              Export Excel
            </button>
          </div>

          
          {showNurseryOutForm && (
            <ModalPortal>
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowNurseryOutForm(false); setEditingNurseryOutId(null); setInitialNurseryOutData(null); }}></div>
                <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-4xl w-full shadow-2xl text-slate-700 text-left max-h-[95vh] overflow-y-auto z-10 relative">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <ArrowRight size={18} className="text-green-600" />
                      {editingNurseryOutId ? 'Edit Transaksi Bibit Keluar' : 'Transaksi Bibit Keluar'}
                    </h3>
                    <button onClick={() => { setShowNurseryOutForm(false); setEditingNurseryOutId(null); setInitialNurseryOutData(null); }} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full">
                      <Plus size={20} className="rotate-45" />
                    </button>
                  </div>
                  <NurseryStockOutForm 
                    nursery={nursery} 
                    nurseryStockOut={nurseryStockOut}
                    plans={plans}
                    initialData={initialNurseryOutData}
                    onClose={() => { setShowNurseryOutForm(false); setEditingNurseryOutId(null); setInitialNurseryOutData(null); }} 
                    onSubmit={(payload) => {
                      if (editingNurseryOutId) {
                        if (onUpdateNurseryStockOut) onUpdateNurseryStockOut(editingNurseryOutId, payload);
                      } else {
                        onAddNurseryStockOut(payload);
                      }
                      setShowNurseryOutForm(false);
                      setEditingNurseryOutId(null);
                      setInitialNurseryOutData(null);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('coal_monitor_toast', { detail: { message: 'Data berhasil disimpan.', type: 'success' } }));
                      }
                    }}
                  />
                </div>
              </div>
            </ModalPortal>
          )}
          {showNurseryForm && (
            <ModalPortal>
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-4xl w-full shadow-2xl text-slate-700 text-left max-h-[95vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Plus size={18} className="text-teal-600" />
                      {editingNurseryId ? 'Edit Data Penerimaan & Inventarisasi Bibit Nursery' : 'Registrasi Bibit Masuk'}
                    </h3>
                    <button onClick={() => { setShowNurseryForm(false); setEditingNurseryId(null); }} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full">
                      <Plus size={20} className="rotate-45" />
                    </button>
                  </div>
            <form 
              id="nursery-form-element"
              onSubmit={handleNurserySubmit}
              className="text-left"
            >

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
                </div>
              </div>
            </ModalPortal>
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
                    <th className="p-3.5 text-center">Bibit Masuk</th>
                    <th className="p-3.5 text-center">Bibit Keluar</th>
                    <th className="p-3.5 text-center">Stok Tersedia</th>
                    <th className="p-3.5 text-center">Availability</th>
                    <th className="p-3.5 text-center">Kondisi</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredNursery.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center text-slate-500">Tidak ada bibit Nursery yang terdaftar.</td>
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
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            (item.ageWeeks / 4) <= 3 ? 'bg-emerald-50 text-emerald-600' :
                            (item.ageWeeks / 4) <= 6 ? 'bg-amber-50 text-amber-600' :
                            'bg-rose-50 text-rose-600'
                          }`}>{item.ageWeeks} minggu ({(item.ageWeeks / 4).toFixed(1)} bln)</span>
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
                        <td className="p-3.5 text-center font-bold text-rose-600 font-mono text-sm">
                          {(() => {
                            const qtyOut = nurseryStockOut?.filter(out => out.jenisBibitId === item.id).reduce((sum, out) => sum + out.jumlahKeluar, 0) || 0;
                            return qtyOut > 0 ? qtyOut.toLocaleString('id-ID') : '-';
                          })()}
                        </td>
                        <td className="p-3.5 text-center font-bold text-emerald-700 font-mono text-sm">
                          {(() => {
                            const qtyOut = nurseryStockOut?.filter(out => out.jenisBibitId === item.id).reduce((sum, out) => sum + out.jumlahKeluar, 0) || 0;
                            return (item.quantity - qtyOut).toLocaleString('id-ID');
                          })()}
                        </td>
                        <td className="p-3.5 text-center w-32">
                          {(() => {
                            const qtyOut = nurseryStockOut?.filter(out => out.jenisBibitId === item.id).reduce((sum, out) => sum + out.jumlahKeluar, 0) || 0;
                            const stokTersedia = item.quantity - qtyOut;
                            const avail = item.quantity > 0 ? (stokTersedia / item.quantity) * 100 : 0;
                            
                            let color = 'bg-emerald-500';
                            if (avail < 30) color = 'bg-rose-500';
                            else if (avail <= 70) color = 'bg-amber-500';
                            
                            return (
                              <div className="flex flex-col gap-1 items-center">
                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, avail))}%` }}></div>
                                </div>
                                <span className={`text-[10px] font-mono font-bold ${avail < 20 ? 'text-rose-600' : 'text-slate-500'}`}>
                                  {avail.toFixed(0)}%
                                </span>
                                {avail < 20 && <span className="bg-rose-100 text-rose-700 text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap">STOK KRITIS</span>}
                                {item.minimumStock !== undefined && stokTersedia < item.minimumStock && <span className="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap"><AlertCircle className="h-2 w-2 inline mr-0.5" />BELOW MIN</span>}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                            ['Healthy', 'Sehat'].includes(item.status) ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                            ['Need Care', 'Perlu Perawatan'].includes(item.status) ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-rose-50 border-rose-200 text-rose-600'
                          }`}>
                            {['Healthy', 'Sehat'].includes(item.status) ? 'Sehat' : ['Need Care', 'Perlu Perawatan'].includes(item.status) ? 'Perlu Perawatan' : 'Rusak'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center pr-5 flex items-center justify-center gap-1.5">
                          <button
                            id={`nursery-edit-btn-${item.id}`}
                            onClick={() => {
                              if (!canEdit) return onUnauthorizedAction("Ubah Data Nursery/Bibit");
                              startEditNursery(item);
                            }}
                            className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Edit bibit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            id={`nursery-delete-btn-${item.id}`}
                            onClick={() => {
                              if (!canDelete) return onUnauthorizedAction("Hapus Data Nursery");
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

          {/* Riwayat Transaksi */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow mt-6">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Riwayat Transaksi (Stock Ledger)</h4>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-mono tracking-wider uppercase sticky top-0 shadow-sm">
                    <th className="p-3.5 pl-5">Tanggal</th>
                    <th className="p-3.5">No. Transaksi</th>
                    <th className="p-3.5">Jenis Transaksi</th>
                    <th className="p-3.5">Bibit / Spesies</th>
                    <th className="p-3.5 text-center">Masuk</th>
                    <th className="p-3.5 text-center">Keluar</th>
                    <th className="p-3.5 text-center">Sisa Stok</th>
                    <th className="p-3.5">Keterangan / Kapling</th>
                    <th className="p-3.5">PIC</th>
                    <th className="p-3.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {(() => {
                    let rows: any[] = [];
                    nursery.forEach(item => {
                      rows.push({
                        id: item.id,
                        tanggal: item.dateIn,
                        jenisTransaksi: 'Penerimaan',
                        bibit: item.plantType,
                        species: item.plantType,
                        masuk: item.quantity,
                        keluar: 0,
                        keterangan: item.source,
                        pic: item.source
                      });
                    });
                    nurseryStockOut?.forEach(out => {
                      const parent = nursery.find(n => n.id === out.jenisBibitId);
                      rows.push({
                        id: out.id,
                        tanggal: out.tanggal,
                        jenisTransaksi: out.jenisTransaksi || 'Keluar',
                        bibit: out.namaBibit,
                        species: out.species || parent?.plantType || out.namaBibit,
                        masuk: 0,
                        keluar: out.jumlahKeluar,
                        keterangan: out.tujuan ? `${out.tujuan} - Kapling: ${plans.find(p => p.id === out.kapling)?.areaName || out.kapling || '-'}` : '-',
                        pic: out.penanggungJawab || '-'
                      });
                    });
                    
                    rows.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
                    
                    const stockMap: Record<string, number> = {};
                    rows.forEach(r => {
                      if (!stockMap[r.species]) stockMap[r.species] = 0;
                      stockMap[r.species] += r.masuk - r.keluar;
                      r.stok = stockMap[r.species];
                    });
                    
                    rows.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
                    
                    if (rows.length === 0) {
                      return <tr><td colSpan={9} className="p-10 text-center text-slate-500">Tidak ada riwayat transaksi.</td></tr>;
                    }
                    
                    return rows.map((r, idx) => (
                      <tr key={idx} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 pl-5 font-mono">{r.tanggal}</td>
                        <td className="p-3.5 font-mono text-[10px] text-slate-500">{r.id.substring(0,8)}</td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.jenisTransaksi === 'Penerimaan' ? 'bg-emerald-100 text-emerald-700' : 
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {r.jenisTransaksi}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-700 block">{r.bibit}</span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-emerald-600 font-mono text-sm">{r.masuk > 0 ? r.masuk.toLocaleString('id-ID') : '-'}</td>
                        <td className="p-3.5 text-center font-bold text-rose-600 font-mono text-sm">{r.keluar > 0 ? r.keluar.toLocaleString('id-ID') : '-'}</td>
                        <td className="p-3.5 text-center font-bold text-blue-700 font-mono text-sm">{r.stok.toLocaleString('id-ID')}</td>
                        <td className="p-3.5 text-[10px] text-slate-500">{r.keterangan}</td>
                        <td className="p-3.5 text-slate-600 font-semibold">{r.pic}</td>
                        <td className="p-3.5 flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (r.jenisTransaksi === 'Penerimaan') {
                                const originalItem = nursery.find(n => n.id === r.id);
                                if (originalItem) {
                                  startEditNursery(originalItem);
                                }
                              } else {
                                const originalOut = nurseryStockOut?.find(o => o.id === r.id);
                                if (originalOut) {
                                  setInitialNurseryOutData(originalOut);
                                  setEditingNurseryOutId(originalOut.id);
                                  setShowNurseryOutForm(true);
                                }
                              }
                            }}
                            className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Edit Data"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (!canDelete) return onUnauthorizedAction("Hapus Data Nursery/Bibit");
                              if (r.jenisTransaksi === 'Penerimaan') {
                                setDeleteConfirm({
                                  id: r.id,
                                  type: 'nursery',
                                  message: `Apakah Anda yakin ingin menghapus data ini? Perubahan ini akan mempengaruhi perhitungan stok nursery.`
                                });
                              } else {
                                setDeleteConfirm({
                                  id: r.id,
                                  type: 'nurseryStockOut',
                                  message: `Apakah Anda yakin ingin menghapus data ini? Perubahan ini akan mempengaruhi perhitungan stok nursery.`
                                });
                              }
                            }}
                            className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Data"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
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
                <span className="text-lg font-black font-mono text-amber-600">{formatIDR(totalPlannedCost)}</span>
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
                    <th className="p-3.5 text-center">Progres Ha (Fisik)</th>\n                    <th className="p-3.5 text-center">Bibit Ditanam</th>
                    <th className="p-3.5 text-right">Perbandingan Anggaran</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-600 italic">Tidak ada agenda rencana/realisasi reklamasi yang diajukan.</td>
                    </tr>
                  ) : (
                    filteredPlans.map(item => {
                      const pctLuas = item.realizedSizeHa !== undefined && item.sizeHa > 0
                        ? (item.realizedSizeHa / item.sizeHa) * 100
                        : 0;

                      const selisihBiaya = item.realizedCost !== undefined
                        ? item.estimatedCost - item.realizedCost
                        : null;
                      const bibitDitanam = nurseryStockOut?.filter(out => out.kapling === item.id && out.jenisTransaksi === 'Penanaman').reduce((sum, out) => sum + out.jumlahKeluar, 0) || 0;

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
                              <span className="text-slate-800 font-medium">{item.plantType}</span>
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
                          <td className="p-3.5 text-center font-bold font-mono align-top py-4">
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shadow-sm text-[11px]">
                               {bibitDitanam.toLocaleString('id-ID')}
                            </span>
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
                                    if (!canEdit) return onUnauthorizedAction("Reset Realisasi Reklamasi");
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
                                onClick={() => {
                                  if (!canEdit) return onUnauthorizedAction("Ubah Rencana Reklamasi");
                                  startEditPlan(item);
                                }}
                                className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                id={`plans-delete-btn-${item.id}`}
                                onClick={() => {
                                  if (!canDelete) return onUnauthorizedAction("Hapus Rencana Reklamasi");
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
              onClick={() => {
                if (!showGuaranteeForm) {
                  resetGuaranteeForm();
                  setShowGuaranteeForm(true);
                } else {
                  setShowGuaranteeForm(false);
                  resetGuaranteeForm();
                }
              }}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow cursor-pointer hover:bg-teal-400 transition-colors"
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
                    Tahun Jaminan (Pelaksanaan) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guarantees-field-period-year"
                    type="number"
                    min={2000}
                    max={2100}
                    required
                    value={gPeriodYear}
                    onChange={(e) => setGPeriodYear(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Contoh: 2026"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 font-mono"
                  />
                </div>
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
                    <option value="Active">✅ Active & Valid</option>
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
                  disabled={isSubmittingGuarantee}
                  onClick={() => {
                    setShowGuaranteeForm(false);
                    resetGuaranteeForm();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  id="guarantees-form-submit"
                  type="submit"
                  disabled={isSubmittingGuarantee}
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-400 transition-colors"
                >
                  {isSubmittingGuarantee ? 'Menyimpan...' : (editingGuaranteeId ? 'Update Jamrek' : 'Daftarkan Jamrek')}
                </button>
              </div>
            </form>
          )}

          {/* Guarantee list table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Dokumen Penempatan Jaminan Pascatambang & Reklamasi</h4>
            </div>

            {/* Toolbar filter & sort */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-slate-50 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                {/* Dropdown Filter Tahun */}
                <div className="flex items-center gap-2">
                  <label htmlFor="guarantees-year-filter" className="text-xs font-semibold text-slate-600">
                    Filter Tahun:
                  </label>
                  <select
                    id="guarantees-year-filter"
                    value={selectedYearFilter}
                    onChange={(e) => setSelectedYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="all">Semua Tahun</option>
                    {uniqueGuaranteeYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Dropdown Urutkan */}
                <div className="flex items-center gap-2">
                  <label htmlFor="guarantees-sort-select" className="text-xs font-semibold text-slate-600">
                    Urutkan:
                  </label>
                  <select
                    id="guarantees-sort-select"
                    value={guaranteeSort}
                    onChange={(e) => setGuaranteeSort(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="year-desc">Tahun Terbaru → Terlama</option>
                    <option value="year-asc">Tahun Terlama → Terbaru</option>
                    <option value="due-asc">Jatuh Tempo Terdekat</option>
                    <option value="value-desc">Nilai Terbesar</option>
                  </select>
                </div>
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="guarantees-search-input"
                  type="text"
                  placeholder="Cari No Jaminan / Bank..."
                  value={guaranteeSearch}
                  onChange={(e) => setGuaranteeSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">No Rekening / Jaminan</th>
                    <th 
                      className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                      onClick={() => {
                        setGuaranteeSort(prev => prev === 'year-desc' ? 'year-asc' : 'year-desc');
                      }}
                      title="Klik untuk mengurutkan Tahun (Naik / Turun)"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Tahun</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-teal-600 transition-colors" />
                      </div>
                    </th>
                    <th className="p-3.5">Instrumen Jaminan</th>
                    <th className="p-3.5 text-right">Nilai Jaminan Finansial</th>
                    <th className="p-3.5">Lembaga Keuangan Penerbit</th>
                    <th className="p-3.5 text-center">Tgl Terbit</th>
                    <th className="p-3.5 text-center">Expired Date</th>
                    <th className="p-3.5 text-center">Status Keaktifan</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {guarantees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">
                        Belum ada jaminan finansial yang dicatatkan.
                      </td>
                    </tr>
                  ) : sortedAndFilteredGuarantees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">
                        Tidak ada data jaminan untuk filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const showSubtotalDividers = selectedYearFilter === 'all' && (guaranteeSort === 'year-desc' || guaranteeSort === 'year-asc');
                      let lastYear: number | null | undefined = undefined;

                      return sortedAndFilteredGuarantees.map((item) => {
                        const itemYear = getGuaranteeYear(item);
                        const shouldShowDivider = showSubtotalDividers && itemYear !== lastYear;
                        if (showSubtotalDividers) {
                          lastYear = itemYear;
                        }

                        const todayTime = new Date().setHours(0, 0, 0, 0);
                        const dueTime = new Date(item.dueDate).setHours(0, 0, 0, 0);
                        const diffDays = Math.ceil((dueTime - todayTime) / (1000 * 60 * 60 * 24));
                        const isWarning = (item.status === 'Renewal Needed') || (item.status === 'Active' && diffDays <= GUARANTEE_WARNING_DAYS);
                        const isExpiredActive = item.status === 'Active' && diffDays < 0;

                        const stat = yearGroupStats.get(itemYear);

                        return (
                          <React.Fragment key={item.id}>
                            {shouldShowDivider && stat && (
                              <tr className="bg-slate-100/90 border-y border-slate-200">
                                <td colSpan={9} className="py-2.5 px-5 font-bold text-xs text-slate-700">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="flex items-center gap-2">
                                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                      Tahun Pelaksanaan {itemYear !== null ? itemYear : 'Tidak Ditentukan'}
                                      <span className="text-[10px] font-normal text-slate-500">
                                        ({stat.count} dokumen)
                                      </span>
                                    </span>
                                    <span className="font-mono text-xs text-emerald-700 font-bold">
                                      Subtotal Nilai: {formatIDR(stat.totalValue)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            )}
                            <tr className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                              <td className="p-3.5 pl-5 font-mono font-bold text-slate-700">
                                <span className="text-slate-500 text-[9px] block mb-0.5">{item.id}</span>
                                {item.guaranteeNo}
                              </td>
                              <td className="p-3.5 font-bold text-slate-700 font-mono">
                                {itemYear !== null ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                    {itemYear}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">-</span>
                                )}
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
                                <span className={`font-bold ${isWarning ? 'text-red-600' : 'text-slate-600'}`}>
                                  {item.dueDate}
                                </span>
                                {isExpiredActive && (
                                  <span className="block text-[9px] text-red-600 font-bold mt-0.5">
                                    Kedaluwarsa
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-center">
                                <span className={`text-[10px] px-2.5 py-1 rounded border font-bold uppercase ${
                                  item.status === 'Released' || item.status === 'Claimed'
                                    ? 'bg-slate-100 border-slate-300 text-slate-600'
                                    : isWarning
                                    ? 'bg-red-500/10 border-red-500/20 text-red-600 font-extrabold animate-pulse'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                }`}>
                                  {item.status === 'Active' ? 'Valid' :
                                   item.status === 'Renewal Needed' ? 'Renewal segera' : item.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-center pr-5">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    id={`guarantees-edit-btn-${item.id}`}
                                    title="Edit jaminan"
                                    aria-label="Edit jaminan"
                                    onClick={() => {
                                      if (!canEdit) return onUnauthorizedAction("Ubah Jaminan Reklamasi");
                                      startEditGuarantee(item);
                                    }}
                                    className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    id={`guarantees-delete-btn-${item.id}`}
                                    title="Hapus jaminan"
                                    aria-label="Hapus jaminan"
                                    onClick={() => {
                                      if (!canDelete) return onUnauthorizedAction("Hapus Jaminan Reklamasi");
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
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom summary bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
              <div>
                Menampilkan <strong className="text-slate-800">{sortedAndFilteredGuarantees.length}</strong> dari <strong className="text-slate-800">{guarantees.length}</strong> dokumen · Total nilai: <strong className="text-emerald-700 font-mono">{formatIDR(filteredTotalValue)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {nurseryHistoryId && (
        <ModalPortal>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-5xl w-full shadow-2xl text-slate-700 text-left max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Activity size={18} className="text-blue-500" />
                  Riwayat Transaksi: {nursery.find(n => n.id === nurseryHistoryId)?.plantType}
                </h3>
                <button onClick={() => setNurseryHistoryId(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
                      <th className="p-3 font-bold">No. Transaksi</th>
                      <th className="p-3 font-bold">Tanggal</th>
                      <th className="p-3 font-bold">Jenis Transaksi</th>
                      <th className="p-3 text-center font-bold">Masuk</th>
                      <th className="p-3 text-center font-bold">Keluar</th>
                      <th className="p-3 font-bold">Batch</th>
                      <th className="p-3 font-bold">Lokasi / Kapling</th>
                      <th className="p-3 font-bold">PIC</th>
                      <th className="p-3 font-bold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {(() => {
                      const itemIn = nursery.find(n => n.id === nurseryHistoryId);
                      const outs = nurseryStockOut.filter(o => o.jenisBibitId === nurseryHistoryId);
                      const history = [];
                      if (itemIn) {
                        history.push({
                          no: '-',
                          date: itemIn.dateIn,
                          type: 'Penerimaan Awal',
                          masuk: itemIn.quantity,
                          keluar: 0,
                          batch: itemIn.batchCode || '-',
                          lokasi: itemIn.location,
                          pic: itemIn.source,
                          notes: 'Penerimaan bibit dari ' + itemIn.source
                        });
                      }
                      outs.forEach(o => {
                        history.push({
                          no: o.nomorTransaksi || '-',
                          date: o.tanggal,
                          type: o.jenisTransaksi || 'Penanaman',
                          masuk: 0,
                          keluar: o.jumlahKeluar,
                          batch: o.batchCode || (itemIn?.batchCode || '-'),
                          lokasi: (o.kapling && o.kapling !== 'lainnya' ? `${plans.find(p => p.id === o.kapling)?.areaName || o.kapling} / ` : '') + `${o.blok} / ${o.pit}`,
                          pic: o.penanggungJawab,
                          notes: o.keterangan || o.tujuan || '-'
                        });
                      });
                      history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      if (history.length === 0) {
                        return (
                          <tr>
                            <td colSpan={9} className="p-6 text-center text-slate-500 bg-slate-50/50">Belum ada histori transaksi.</td>
                          </tr>
                        );
                      }

                      return history.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-[10px] text-slate-500">{h.no}</td>
                          <td className="p-3 font-mono text-slate-600">{h.date}</td>
                          <td className="p-3 font-bold text-slate-700">{h.type}</td>
                          <td className="p-3 text-center font-bold text-emerald-600 font-mono">
                            {h.masuk > 0 ? `+${h.masuk.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="p-3 text-center font-bold text-rose-600 font-mono">
                            {h.keluar > 0 ? `-${h.keluar.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="p-3 font-mono text-[10px]">{h.batch}</td>
                          <td className="p-3 text-[11px]">{h.lokasi}</td>
                          <td className="p-3">{h.pic}</td>
                          <td className="p-3 text-[11px] text-slate-500 max-w-[150px] truncate" title={h.notes}>{h.notes}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ModalPortal>
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
                  disabled={isProcessing}
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-white hover:bg-slate-100 text-slate-600 font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  disabled={isProcessing}
                  onClick={async () => {
                    const { id, type } = deleteConfirm;
                    const targetG = guarantees.find(g => g.id === id);
                    const targetP = plans.find(p => p.id === id);

                    try {
                      setIsProcessing(true);
                      if (type === 'nursery') {
                        await onDeleteNursery(id);
                      } else if (type === 'nurseryStockOut') {
                        await onDeleteNurseryStockOut(id);
                      } else if (type === 'plan') {
                        await onDeletePlan(id);
                        window.dispatchEvent(new CustomEvent('coal_monitor_toast', {
                          detail: {
                            message: `Rencana reklamasi ${targetP?.areaName ? targetP.areaName + ' ' : ''}berhasil dihapus.`.trim(),
                            type: 'success'
                          }
                        }));
                      } else if (type === 'reset-plan') {
                        await onUpdatePlan(id, {
                          realizedSizeHa: null as any,
                          realizedYear: null as any,
                          realizedPlantType: null as any,
                          realizedMethod: null as any,
                          realizedCost: null as any,
                          status: 'In Progress'
                        });
                      } else if (type === 'guarantee') {
                        await onDeleteGuarantee(id);
                        window.dispatchEvent(new CustomEvent('coal_monitor_toast', {
                          detail: {
                            message: `Data jaminan ${targetG?.guaranteeNo || ''} berhasil dihapus.`.trim(),
                            type: 'success'
                          }
                        }));
                      }
                      setDeleteConfirm(null);
                    } catch {
                      // Saat gagal: tutup modal, JANGAN memakai alert() (toast error sudah ditampilkan handleGlobalError)
                      setDeleteConfirm(null);
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-500 text-white font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Memproses...' : 'Konfirmasi'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
