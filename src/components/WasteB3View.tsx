/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import ModalPortal from './ModalPortal';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { WasteIn, WasteOut, WasteStock, WasteLedgerResult } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  ShieldAlert, 
  Calendar, 
  ClipboardList, 
  Truck, 
  Gauge, 
  Clock, 
  AlertCircle,
  Pencil,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { 
  wasteB3Catalog, 
  findCatalogCode, 
  DEFAULT_MAX_STORAGE_DAYS, 
  WARNING_STORAGE_DAYS, 
  TPS_CAPACITY_KG 
} from '../constants/wasteCatalog';
import { 
  buildWasteLedger, 
  getAvailableStockAtDate, 
  simulateOutflowValidation, 
  round3 
} from '../utils/wasteLedger';
import { 
  todayLocalISO, 
  compareLatestFirst, 
  compareCreatedAtFirst 
} from '../utils/dateUtils';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import {
  NEON_CHART,
  NEON_TOOLTIP_CONTENT_STYLE,
  NEON_TOOLTIP_LABEL_STYLE,
  NEON_TOOLTIP_ITEM_STYLE,
} from '../utils/chartTheme';

interface WasteB3ViewProps {
  wasteIn: WasteIn[];
  wasteOut: WasteOut[];
  wasteStocks: WasteStock[];
  ledger?: WasteLedgerResult;
  onAddIn: (item: any) => Promise<any> | void;
  onUpdateIn?: (id: string, item: any) => Promise<any> | void;
  onDeleteIn: (id: string) => Promise<any> | void;
  onAddOut: (item: any) => Promise<any> | void;
  onUpdateOut?: (id: string, item: any) => Promise<any> | void;
  onDeleteOut: (id: string) => Promise<any> | void;
  canEdit?: boolean;
  canDelete?: boolean;
  onUnauthorizedAction?: (action: string) => void;
}

export default function WasteB3View({
  wasteIn,
  wasteOut,
  wasteStocks,
  ledger,
  onAddIn,
  onUpdateIn,
  onDeleteIn,
  onAddOut,
  onUpdateOut,
  onDeleteOut,
  canEdit = true,
  canDelete = false,
  onUnauthorizedAction
}: WasteB3ViewProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'intake' | 'outflow'>('status');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'in' | 'out'; message: string } | null>(null);

  // Sorting & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [inSortMode, setInSortMode] = useState<'latest' | 'created'>('latest');
  const [outSortMode, setOutSortMode] = useState<'latest' | 'created'>('latest');
  const [onlyRemaining, setOnlyRemaining] = useState(false);

  // EDIT STATE
  const [editingInId, setEditingInId] = useState<string | null>(null);
  const [editingOutId, setEditingOutId] = useState<string | null>(null);

  // FORM INTAKE STATE
  const [showInForm, setShowInForm] = useState(false);
  const [inDate, setInDate] = useState(todayLocalISO());
  const [inType, setInType] = useState('Aki / Baterai Bekas');
  const [inSource, setInSource] = useState('');
  const [inWeight, setInWeight] = useState<number | ''>('');
  const [inChar, setInChar] = useState<'Flammable' | 'Toxic' | 'Corrosive' | 'Reactive' | 'Infectious'>('Toxic');
  const [inCode, setInCode] = useState('A102d');
  const [inLoc, setInLoc] = useState('TPS B3 Utama');
  const [inOfficer, setInOfficer] = useState('');

  // FORM OUTFLOW STATE
  const [showOutForm, setShowOutForm] = useState(false);
  const [outDate, setOutDate] = useState(todayLocalISO());
  const [outType, setOutType] = useState('Aki / Baterai Bekas');
  const [outWeight, setOutWeight] = useState<number | ''>('');
  const [outDest, setOutDest] = useState('');
  const [outTrans, setOutTrans] = useState('');
  const [outManifest, setOutManifest] = useState('');
  const [outVehicle, setOutVehicle] = useState('');
  const [outDriver, setOutDriver] = useState('');
  const [outRecipient, setOutRecipient] = useState('');

  // Hitung ledger aktual (FIFO per batch)
  const currentLedger = useMemo(() => {
    return ledger || buildWasteLedger(wasteIn, wasteOut);
  }, [ledger, wasteIn, wasteOut]);

  const inById = currentLedger.inById;
  const outById = currentLedger.outById;

  // Saran autocomplete dari riwayat data transaksi pengeluaran sebelumnya
  const destinationSuggestions = useMemo(() => {
    return Array.from(new Set(wasteOut.map(o => o.destination).filter(Boolean)));
  }, [wasteOut]);

  const transporterSuggestions = useMemo(() => {
    return Array.from(new Set(wasteOut.map(o => o.transporter).filter(Boolean)));
  }, [wasteOut]);

  const vehicleSuggestions = useMemo(() => {
    return Array.from(new Set(wasteOut.map(o => o.vehicleNo).filter(Boolean)));
  }, [wasteOut]);

  const driverSuggestions = useMemo(() => {
    return Array.from(new Set(wasteOut.map(o => o.driverName).filter(Boolean)));
  }, [wasteOut]);

  const recipientSuggestions = useMemo(() => {
    return Array.from(new Set(wasteOut.map(o => o.recipient).filter(Boolean)));
  }, [wasteOut]);

  // Hitung stok tersedia secara realtime pada form pengeluaran
  const availableStockForSelectedOut = useMemo(() => {
    return getAvailableStockAtDate(wasteIn, wasteOut, outType, outDate, editingOutId);
  }, [wasteIn, wasteOut, outType, outDate, editingOutId]);

  const simulatedRemainingStock = useMemo(() => {
    const w = typeof outWeight === 'number' ? outWeight : 0;
    return round3(availableStockForSelectedOut - w);
  }, [availableStockForSelectedOut, outWeight]);

  // Auto-sync kode limbah saat jenis limbah masuk berubah
  useEffect(() => {
    setInCode(findCatalogCode(inType));
  }, [inType]);

  // Reset form Masuk
  const resetInForm = () => {
    setEditingInId(null);
    setInDate(todayLocalISO());
    setInType('Aki / Baterai Bekas');
    setInSource('');
    setInWeight('');
    setInChar('Toxic');
    setInCode('A102d');
    setInLoc('TPS B3 Utama');
    setInOfficer('');
    setShowInForm(false);
  };

  // Reset form Keluar
  const resetOutForm = () => {
    setEditingOutId(null);
    setOutDate(todayLocalISO());
    setOutType('Aki / Baterai Bekas');
    setOutWeight('');
    setOutDest('');
    setOutTrans('');
    setOutManifest('');
    setOutVehicle('');
    setOutDriver('');
    setOutRecipient('');
    setShowOutForm(false);
  };

  const startEditIn = (item: WasteIn) => {
    if (!canEdit) {
      if (onUnauthorizedAction) onUnauthorizedAction("Ubah Log Masuk Limbah B3");
      return;
    }
    setEditingInId(item.id);
    setInDate(item.dateIn);
    setInType(item.wasteType);
    setInSource(item.source);
    setInWeight(item.weightKg);
    setInChar(item.characteristic);
    setInCode(item.code);
    setInLoc(item.tpsLocation);
    setInOfficer(item.officer);
    setShowInForm(true);
  };

  const startEditOut = (item: WasteOut) => {
    if (!canEdit) {
      if (onUnauthorizedAction) onUnauthorizedAction("Ubah Log Keluar Limbah B3");
      return;
    }
    setEditingOutId(item.id);
    setOutDate(item.dateOut);
    setOutType(item.wasteType);
    setOutWeight(item.weightKg);
    setOutDest(item.destination);
    setOutTrans(item.transporter);
    setOutManifest(item.manifestNo);
    setOutVehicle(item.vehicleNo);
    setOutDriver(item.driverName);
    setOutRecipient(item.recipient);
    setShowOutForm(true);
  };

  // Submission handler untuk form Masuk
  const handleInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      if (onUnauthorizedAction) onUnauthorizedAction("Registrasi Stok Masuk Limbah B3");
      return;
    }
    if (!inOfficer.trim() || !inCode.trim()) {
      alert("Lengkapi kolom penanggung jawab & kode limbah Permen LHK No. 6 Tahun 2021.");
      return;
    }
    const weightNum = Number(inWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert("Berat volume masuk harus lebih dari 0 Kg.");
      return;
    }

    const payload = {
      dateIn: inDate,
      wasteType: inType,
      source: inSource.trim(),
      weightKg: round3(weightNum),
      characteristic: inChar,
      code: inCode.trim(),
      tpsLocation: inLoc.trim(),
      officer: inOfficer.trim()
    };

    try {
      if (editingInId) {
        if (onUpdateIn) {
          await onUpdateIn(editingInId, payload);
        }
      } else {
        await onAddIn(payload);
      }
      resetInForm();
    } catch (err: any) {
      // Error sudah ditangani dan dimunculkan oleh errorHandler/toast
    }
  };

  // Submission handler untuk form Keluar dengan simulasi seluruh ledger
  const handleOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      if (onUnauthorizedAction) onUnauthorizedAction("Catat Pengiriman Keluar Limbah B3");
      return;
    }

    if (!outDriver.trim() || !outRecipient.trim() || !outManifest.trim()) {
      alert("Lengkapi Nomor Manifest, Nama Driver, dan Petugas TPS.");
      return;
    }

    const weightNum = Number(outWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert("Berat volume pengeluaran harus lebih dari 0 Kg.");
      return;
    }

    const candidatePayload: WasteOut = {
      id: editingOutId || `WO-TEMP-${Date.now()}`,
      dateOut: outDate,
      wasteType: outType,
      weightKg: round3(weightNum),
      destination: outDest.trim(),
      transporter: outTrans.trim(),
      manifestNo: outManifest.trim(),
      vehicleNo: outVehicle.trim(),
      driverName: outDriver.trim(),
      recipient: outRecipient.trim()
    };

    // Validasi dengan SIMULASI seluruh ledger
    const validation = simulateOutflowValidation(
      wasteIn, 
      wasteOut, 
      candidatePayload, 
      Boolean(editingOutId)
    );

    if (!validation.isValid) {
      alert(validation.errorMessage);
      return;
    }

    try {
      if (editingOutId) {
        if (onUpdateOut) {
          await onUpdateOut(editingOutId, candidatePayload);
        }
      } else {
        await onAddOut(candidatePayload);
      }
      resetOutForm();
    } catch (err: any) {
      // Error sudah ditangani dan dimunculkan oleh errorHandler/toast
    }
  };

  // Data Terurut & Terfilter untuk Log Masuk
  const sortedWasteIn = useMemo(() => {
    let list = [...wasteIn];

    // Filter "Hanya yang masih ada sisa"
    if (onlyRemaining) {
      list = list.filter(item => {
        const remaining = inById[item.id]?.weightRemaining ?? item.weightKg;
        return remaining > 0;
      });
    }

    // Filter pencarian
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        (item.id || '').toLowerCase().includes(q) ||
        (item.wasteType || '').toLowerCase().includes(q) ||
        (item.code || '').toLowerCase().includes(q) ||
        (item.source || '').toLowerCase().includes(q) ||
        (item.tpsLocation || '').toLowerCase().includes(q) ||
        (item.officer || '').toLowerCase().includes(q)
      );
    }

    // Pengurutan
    if (inSortMode === 'created') {
      return list.sort(compareCreatedAtFirst);
    }
    return list.sort(compareLatestFirst);
  }, [wasteIn, inById, onlyRemaining, searchQuery, inSortMode]);

  // Data Terurut & Terfilter untuk Log Keluar
  const sortedWasteOut = useMemo(() => {
    let list = [...wasteOut];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        (item.manifestNo || '').toLowerCase().includes(q) ||
        (item.wasteType || '').toLowerCase().includes(q) ||
        (item.destination || '').toLowerCase().includes(q) ||
        (item.transporter || '').toLowerCase().includes(q) ||
        (item.vehicleNo || '').toLowerCase().includes(q) ||
        (item.driverName || '').toLowerCase().includes(q) ||
        (item.recipient || '').toLowerCase().includes(q)
      );
    }

    if (outSortMode === 'created') {
      return list.sort(compareCreatedAtFirst);
    }
    return list.sort(compareLatestFirst);
  }, [wasteOut, searchQuery, outSortMode]);

  // Daftar jenis limbah dengan stok negatif untuk banner peringatan
  const negativeStockTypes = useMemo(() => {
    return currentLedger.stocks.filter(s => s.currentStock < 0);
  }, [currentLedger]);

  const totalInAllTps = useMemo(() => {
    return round3(currentLedger.stocks.reduce((sum, s) => sum + s.totalIn, 0));
  }, [currentLedger]);

  const totalOutAllTps = useMemo(() => {
    return round3(currentLedger.stocks.reduce((sum, s) => sum + s.totalOut, 0));
  }, [currentLedger]);

  const totalRemainingStockKg = useMemo(() => {
    return round3(currentLedger.stocks.reduce((sum, s) => sum + Math.max(0, s.currentStock), 0));
  }, [currentLedger]);

  const remainingCapacityKg = useMemo(() => {
    return round3(Math.max(0, TPS_CAPACITY_KG - totalRemainingStockKg));
  }, [totalRemainingStockKg]);

  const totalStockAllTps = totalRemainingStockKg;

  const tpsCapacityPercentage = useMemo(() => {
    return Math.min(100, round3((totalRemainingStockKg / TPS_CAPACITY_KG) * 100));
  }, [totalRemainingStockKg]);

  return (
    <div id="waste-b3-view-wrapper" className="space-y-6 text-text-hi">
      {/* Banner Peringatan Inkonsistensi / Stok Negatif */}
      {currentLedger.hasInconsistency && (
        <div id="waste-inconsistency-banner" className="bg-neon-red/10 border border-neon-red/40 shadow-glow-red rounded-2xl p-4 flex items-start gap-3.5 text-left">
          <ShieldAlert className="h-5 w-5 text-neon-red flex-shrink-0 mt-0.5" />
          <div className="text-xs text-text-hi space-y-1">
            <h4 className="font-bold text-neon-red">Peringatan Konsistensi Neraca Limbah B3</h4>
            {negativeStockTypes.length > 0 ? (
              <p>
                Data tidak konsisten: stok negatif pada{' '}
                <span className="font-bold font-mono tabular-nums text-neon-red">
                  {negativeStockTypes.map(s => `${s.wasteType} (${s.currentStock.toLocaleString('id-ID')} Kg)`).join(', ')}
                </span>.
              </p>
            ) : (
              <p>
                Terdapat pengeluaran manifest yang melebihi stok tersedia per tanggal pengangkutan atau terjadi sebelum tanggal penerimaan limbah.
              </p>
            )}
            <p className="text-[11px] text-text-mid">
              Sistem FIFO melacak setiap pengeluaran terhadap batch penerimaan secara kronologis. Mohon periksa kembali tanggal atau volume pada log masuk dan manifest keluar terkait.
            </p>
          </div>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex flex-wrap border-b border-border-neon">
        <button
          id="waste-tab-status"
          onClick={() => setActiveTab('status')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'status' ? 'border-neon-cyan text-neon-cyan font-bold' : 'border-transparent text-text-mid hover:text-text-hi'
          }`}
        >
          <Gauge className="h-4 w-4" />
          Status Stok & Kapasitas TPS
        </button>
        <button
          id="waste-tab-intake"
          onClick={() => setActiveTab('intake')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'intake' ? 'border-neon-cyan text-neon-cyan font-bold' : 'border-transparent text-text-mid hover:text-text-hi'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Log Limbah Masuk (Inflow Log)
        </button>
        <button
          id="waste-tab-outflow"
          onClick={() => setActiveTab('outflow')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'outflow' ? 'border-neon-cyan text-neon-cyan font-bold' : 'border-transparent text-text-mid hover:text-text-hi'
          }`}
        >
          <Truck className="h-4 w-4" />
          Log Manifest Pengeluaran (Outflow Log)
        </button>
      </div>

      {/* TAB 1: STATUS NERACA & KAPASITAS */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* Bento Header: Kapasitas Total TPS & Kepatuhan Penyimpanan */}
          <div className="glass-panel rounded-2xl p-5 text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
              <div>
                <span className="text-[10px] font-bold text-neon-cyan uppercase tracking-wider font-mono">
                  Kapasitas TPS (konfigurasi)
                </span>
                <h3 className="text-base font-bold text-text-hi mt-0.5 font-heading">
                  Neraca Akumulasi Persediaan TPS B3 PT Diva Kencana Borneo
                </h3>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                <div className="text-right">
                  <span className="text-text-mid block text-[10px] uppercase font-sans">Sisa Stok TPS</span>
                  <span className="text-base font-black text-neon-cyan">
                    {totalRemainingStockKg.toLocaleString('id-ID')}
                  </span>
                  <span className="text-text-low font-sans ml-1 text-xs">/ {TPS_CAPACITY_KG.toLocaleString('id-ID')} Kg</span>
                </div>
                <div className="text-right border-l border-border-subtle pl-4">
                  <span className="text-text-mid block text-[10px] uppercase font-sans">Okupansi Gudang</span>
                  <span className={`text-base font-black ${tpsCapacityPercentage > 85 ? 'text-neon-red' : 'text-text-hi'}`}>
                    {tpsCapacityPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Distinct Metric Cards: Total In, Total Out, Sisa Stok, Sisa Kapasitas (Kg) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
              <div className="bg-bg-2/70 border border-border-subtle rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono uppercase text-text-mid block font-semibold">Total Limbah Masuk</span>
                <span className="text-lg font-bold font-mono tabular-nums text-text-hi mt-0.5 block">
                  {totalInAllTps.toLocaleString('id-ID')} Kg
                </span>
                <span className="text-[10px] text-text-low">Kumulatif log masuk</span>
              </div>
              <div className="bg-bg-2/70 border border-border-subtle rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono uppercase text-text-mid block font-semibold">Total Limbah Keluar (Diangkut)</span>
                <span className="text-lg font-bold font-mono tabular-nums text-text-hi mt-0.5 block">
                  {totalOutAllTps.toLocaleString('id-ID')} Kg
                </span>
                <span className="text-[10px] text-text-low">Transporter berizin KLH/BPLH</span>
              </div>
              <div className="bg-neon-cyan/10 border border-neon-cyan/35 rounded-xl p-3 text-left shadow-glow-cyan">
                <span className="text-[10px] font-mono uppercase text-neon-cyan block font-bold">Sisa Stok di TPS Saat Ini</span>
                <span className="text-2xl font-black font-mono tabular-nums text-neon-cyan mt-0.5 block">
                  {totalRemainingStockKg.toLocaleString('id-ID')} Kg
                </span>
                <span className="text-[10px] text-neon-green font-medium">Aktif tersimpan di gudang</span>
              </div>
              <div className="bg-bg-2/70 border border-border-subtle rounded-xl p-3 text-left">
                <span className="text-[10px] font-mono uppercase text-text-mid block font-semibold">Sisa Kapasitas Ruang TPS</span>
                <span className="text-lg font-bold font-mono tabular-nums text-text-hi mt-0.5 block">
                  {remainingCapacityKg.toLocaleString('id-ID')} Kg
                </span>
                <span className="text-[10px] text-text-low">Dari batas {TPS_CAPACITY_KG.toLocaleString('id-ID')} Kg</span>
              </div>
            </div>

            {/* Total TPS Capacity Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="h-2.5 w-full bg-bg-0 rounded-full overflow-hidden border border-border-subtle p-[1px]">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    tpsCapacityPercentage > 85 
                      ? 'bg-gradient-to-r from-neon-red to-neon-amber' 
                      : tpsCapacityPercentage > 65
                      ? 'bg-gradient-to-r from-neon-amber to-neon-cyan'
                      : 'bg-gradient-to-r from-neon-cyan to-neon-green'
                  }`}
                  style={{ width: `${tpsCapacityPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-text-mid leading-relaxed pt-1">
                Batas waktu penyimpanan limbah B3 di TPS mengikuti izin lingkungan TPS dan kategori limbah yang bersangkutan. 
                Nilai default batas penyimpanan pada aplikasi ini adalah <strong className="text-text-hi">{DEFAULT_MAX_STORAGE_DAYS} hari</strong> sesuai Permen LHK No. 6 Tahun 2021. 
                Peringatan dini diaktifkan bila umur penyimpanan mencapai <strong className="text-neon-amber">{WARNING_STORAGE_DAYS} hari</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Donut Chart Distribusi Jenis Limbah */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between text-left">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid font-mono">
                  Distribusi Spesi Limbah B3
                </h4>
                <p className="text-[11px] text-text-mid mt-1">Komposisi stok limbah B3 aktif di dalam TPS</p>
              </div>

              <div className="h-60 w-full relative flex items-center justify-center my-3">
                {(() => {
                  const pieData = currentLedger.stocks
                    .filter(s => s.currentStock > 0)
                    .map(s => ({
                      name: s.wasteType.split(' (')[0],
                      fullName: s.wasteType,
                      value: s.currentStock
                    }));
                  const PIE_COLORS = [
                    NEON_CHART.cyan,
                    NEON_CHART.amber,
                    NEON_CHART.violet,
                    NEON_CHART.green,
                    NEON_CHART.red,
                    '#38bdf8',
                    '#f472b6',
                  ];

                  if (totalStockAllTps === 0 || pieData.length === 0) {
                    return (
                      <p className="text-xs text-text-low font-medium">Tidak ada limbah B3 yang tersimpan di TPS saat ini.</p>
                    );
                  }

                  return (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((_, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={PIE_COLORS[index % PIE_COLORS.length]} 
                                stroke="var(--theme-bg-1)" 
                                strokeWidth={2} 
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: any, _: any, props: any) => [
                              `${Number(value).toLocaleString('id-ID')} Kg`, 
                              props.payload.fullName
                            ]}
                            contentStyle={NEON_TOOLTIP_CONTENT_STYLE}
                            labelStyle={NEON_TOOLTIP_LABEL_STYLE}
                            itemStyle={NEON_TOOLTIP_ITEM_STYLE}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Center Overlay Text */}
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-1">
                        <span className="text-[9px] text-text-mid uppercase tracking-widest font-mono font-bold">Total TPS</span>
                        <span className="text-base font-black text-text-hi font-mono tabular-nums mt-0.5">{totalStockAllTps.toLocaleString('id-ID')}</span>
                        <span className="text-[10px] text-neon-cyan font-bold block">Kg</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Dynamic Legend */}
              <div className="space-y-2 pt-3 border-t border-border-subtle max-h-40 overflow-y-auto">
                {(() => {
                  const activeStocks = currentLedger.stocks.filter(stock => stock.currentStock > 0);
                  const PIE_COLORS = [
                    NEON_CHART.cyan,
                    NEON_CHART.amber,
                    NEON_CHART.violet,
                    NEON_CHART.green,
                    NEON_CHART.red,
                    '#38bdf8',
                    '#f472b6',
                  ];

                  if (activeStocks.length === 0) {
                    return (
                      <p className="text-[11px] text-center text-text-low">Neraca Kosong</p>
                    );
                  }

                  return activeStocks.map((stock, index) => {
                    const percentage = totalStockAllTps > 0 
                      ? ((stock.currentStock / totalStockAllTps) * 100).toFixed(1)
                      : '0';
                    return (
                      <div key={index} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} 
                          />
                          <span className="text-text-mid truncate" title={stock.wasteType}>
                            {stock.wasteType}
                          </span>
                        </div>
                        <span className="font-mono tabular-nums text-text-hi font-bold ml-2.5 whitespace-nowrap">
                          {stock.currentStock.toLocaleString('id-ID')} Kg <span className="text-text-low font-normal">({percentage}%)</span>
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Column: Grid Card Inventaris per Spesi Limbah */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid font-mono">
                  Status Neraca Inventaris per Spesi
                </h4>
                <span className="text-[10px] text-text-mid font-mono tabular-nums">
                  {currentLedger.stocks.length} Jenis Limbah Terdata
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentLedger.stocks.length === 0 ? (
                  <div className="col-span-2 glass-panel rounded-2xl">
                    <EmptyState
                      title="Belum ada data transaksi penerimaan limbah B3"
                      description="Catat penerimaan limbah B3 masuk ke TPS melalui tab Log Limbah Masuk."
                    />
                  </div>
                ) : (
                  currentLedger.stocks.map((stock, i) => {
                    const nearExpired = stock.daysInTps >= WARNING_STORAGE_DAYS && stock.currentStock > 0;
                    const isNegative = stock.currentStock < 0;

                    return (
                      <div 
                        key={i} 
                        className={`neon-card p-5 text-left flex flex-col justify-between min-h-[190px] ${
                          isNegative
                            ? 'border-neon-red/60 bg-neon-red/10 shadow-glow-red'
                            : nearExpired 
                            ? 'border-neon-red/45 bg-neon-red/5' 
                            : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] bg-neon-amber/10 border border-neon-amber/35 text-neon-amber px-2 py-0.5 rounded font-bold font-mono uppercase">
                              KODE: {stock.code}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1.5 font-bold font-mono tabular-nums ${
                              stock.currentStock <= 0
                                ? 'bg-bg-2/70 text-text-low border-border-subtle'
                                : nearExpired 
                                ? 'bg-neon-red/15 text-neon-red border-neon-red/40 animate-critical-pulse' 
                                : 'bg-bg-2/70 text-text-mid border-border-subtle'
                            }`}>
                              <Clock className="h-3.5 w-3.5" />
                              {stock.daysInTps} Hari di TPS
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-text-hi mt-2.5 leading-snug font-heading">
                            {stock.wasteType}
                          </h4>
                          <p className="text-[11px] text-text-mid mt-0.5 font-mono">
                            Batch Pertama Aktif: {stock.earliestDateIn || '-'}
                          </p>
                        </div>

                        {/* Stock Balance Gauges */}
                        <div className="mt-4 pt-3 border-t border-border-subtle">
                          <div className="flex items-baseline justify-between mb-2">
                            <span className="text-xs font-semibold text-text-mid">Sisa Stok di TPS:</span>
                            <span className={`text-xl font-black font-mono tabular-nums ${
                              isNegative ? 'text-neon-red' : 'text-neon-cyan'
                            }`}>
                              {stock.currentStock.toLocaleString('id-ID')} Kg
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-text-mid font-mono tabular-nums pt-1.5 border-t border-border-subtle uppercase">
                            <span>Masuk: <strong className="text-text-hi">{stock.totalIn.toLocaleString('id-ID')} Kg</strong></span>
                            <span>Keluar: <strong className="text-text-hi">{stock.totalOut.toLocaleString('id-ID')} Kg</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOG LIMBAH MASUK (INFLOW) */}
      {activeTab === 'intake' && (
        <div className="space-y-4">
          {/* Summary Metric Banner (Total Masuk, Total Keluar, Sisa Stok dalam Kg) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 glass-panel p-3.5 rounded-2xl text-left font-mono tabular-nums">
            <div className="bg-bg-2/70 rounded-xl p-2.5 border border-border-subtle">
              <span className="text-[10px] uppercase text-text-mid block font-sans font-semibold">Total Limbah Masuk</span>
              <span className="text-base font-bold text-text-hi">{totalInAllTps.toLocaleString('id-ID')} Kg</span>
            </div>
            <div className="bg-bg-2/70 rounded-xl p-2.5 border border-border-subtle">
              <span className="text-[10px] uppercase text-text-mid block font-sans font-semibold">Total Limbah Keluar (Diangkut)</span>
              <span className="text-base font-bold text-text-hi">{totalOutAllTps.toLocaleString('id-ID')} Kg</span>
            </div>
            <div className="bg-neon-cyan/10 rounded-xl p-2.5 border border-neon-cyan/35">
              <span className="text-[10px] uppercase text-neon-cyan block font-sans font-bold">Sisa Stok di TPS Saat Ini</span>
              <span className="text-base font-black text-neon-cyan">{totalRemainingStockKg.toLocaleString('id-ID')} Kg</span>
            </div>
          </div>

          {/* Header Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-text-low" />
                <input
                  type="text"
                  placeholder="Cari jenis, kode, sumber, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs"
                />
              </div>

              {/* Sorting Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 text-text-low" />
                <select
                  value={inSortMode}
                  onChange={(e) => setInSortMode(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs font-medium"
                >
                  <option value="latest">Urutkan: Tanggal transaksi terbaru (default)</option>
                  <option value="created">Urutkan: Waktu input terakhir</option>
                </select>
              </div>

              {/* Checkbox Hanya yang masih ada sisa */}
              <label className="flex items-center gap-2 text-xs font-semibold text-text-hi cursor-pointer select-none bg-bg-2/70 px-3 py-1.5 rounded-xl border border-border-subtle">
                <input
                  type="checkbox"
                  checked={onlyRemaining}
                  onChange={(e) => setOnlyRemaining(e.target.checked)}
                  className="rounded accent-neon-cyan cursor-pointer"
                />
                Hanya yang masih ada sisa
              </label>
            </div>

            <button
              id="waste-in-add-btn"
              onClick={() => {
                if (!canEdit) {
                  if (onUnauthorizedAction) onUnauthorizedAction("Log Masuk Limbah B3");
                  return;
                }
                resetInForm();
                setShowInForm(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 neon-btn-primary rounded-xl text-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Catat Penerimaan Limbah Masuk
            </button>
          </div>

          {/* Form Modal / Dropdown Entry */}
          {showInForm && (
            <form 
              id="waste-in-form"
              onSubmit={handleInSubmit} 
              className="glass-panel p-5 rounded-2xl border-neon-cyan/40 shadow-glow-cyan text-left animate-fade-in"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neon-cyan font-heading">
                  {editingInId ? `Edit Catatan Masuk Limbah B3 (${editingInId})` : 'Pencatatan Masuk TPS Limbah B3 Baru'}
                </h3>
                <span className="text-[11px] text-text-low font-mono">Permen LHK No. 6/2021</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Tanggal Masuk TPS</label>
                  <input
                    id="waste-in-date"
                    type="date"
                    required
                    value={inDate}
                    onChange={(e) => setInDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Jenis Limbah B3</label>
                  <select
                    id="waste-in-type"
                    value={inType}
                    onChange={(e) => setInType(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  >
                    {wasteB3Catalog.map((x, ci) => (
                      <option key={ci} value={x.name}>{x.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Asal Penghasil (Sumber)</label>
                  <input
                    id="waste-in-source"
                    type="text"
                    required
                    placeholder="Contoh: Workshop Alat Berat Pit West"
                    value={inSource}
                    onChange={(e) => setInSource(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Berat Volume Masuk (Kg)</label>
                  <input
                    id="waste-in-weight"
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    placeholder="Contoh: 150.5"
                    value={inWeight}
                    onChange={(e) => setInWeight(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Karakteristik Bahaya</label>
                  <select
                    id="waste-in-char"
                    value={inChar}
                    onChange={(e) => setInChar(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs"
                  >
                    <option value="Toxic">Toxic (Beracun)</option>
                    <option value="Flammable">Flammable (Mudah Menyala)</option>
                    <option value="Corrosive">Corrosive (Korosif)</option>
                    <option value="Reactive">Reactive (Reaktif)</option>
                    <option value="Infectious">Infectious (Infeksius)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Kode Limbah (Permen LHK 6/2021)</label>
                  <input
                    id="waste-in-code"
                    type="text"
                    readOnly
                    value={inCode}
                    className="w-full bg-neon-amber/10 border-neon-amber/35 px-3 py-2 text-xs text-neon-amber font-mono font-bold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Lokasi Gudang / Rak TPS</label>
                  <input
                    id="waste-in-loc"
                    type="text"
                    required
                    placeholder="Contoh: TPS B3 Utama Blok A"
                    value={inLoc}
                    onChange={(e) => setInLoc(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Petugas Penerima TPS</label>
                  <input
                    id="waste-in-officer"
                    type="text"
                    required
                    placeholder="Nama petugas lingkungan penerima"
                    value={inOfficer}
                    onChange={(e) => setInOfficer(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  id="waste-in-cancel"
                  type="button"
                  onClick={resetInForm}
                  className="px-4 py-2 text-xs font-semibold text-text-mid hover:text-text-hi rounded-xl border border-border-subtle cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="waste-in-submit"
                  type="submit"
                  className="px-5 py-2.5 neon-btn-primary text-xs rounded-xl cursor-pointer"
                >
                  {editingInId ? 'Simpan Perubahan' : 'Registrasi Masuk TPS'}
                </button>
              </div>
            </form>
          )}

          {/* Table Log Penerimaan Limbah B3 Masuk TPS */}
          <div className="glass-panel rounded-2xl overflow-hidden text-left">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-hi font-heading">
                  Log Penerimaan Limbah B3 Masuk TPS (Inbound Audit Trails)
                </h4>
                <p className="text-[11px] text-text-low mt-0.5">
                  Menampilkan pelacakan FIFO batch masuk dengan sisa stok dan umur penyimpanan di TPS
                </p>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-text-mid">
                Total Baris: {sortedWasteIn.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="neon-table text-left">
                <thead>
                  <tr className="text-[10px] font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">No Transaksi</th>
                    <th className="p-3.5">Tanggal Masuk</th>
                    <th className="p-3.5">Jenis / Spesi Limbah B3</th>
                    <th className="p-3.5">Asal Penghasil (Sumber)</th>
                    <th className="p-3.5 text-center">Fisik Karakter</th>
                    <th className="p-3.5 text-right">Volume (Kg)</th>
                    <th className="p-3.5 text-right">Keluar (Kg)</th>
                    <th className="p-3.5 text-right min-w-[130px]">Sisa Stok (Kg)</th>
                    <th className="p-3.5 text-center">Umur di TPS</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Lokasi Gudang / Rak</th>
                    <th className="p-3.5">Petugas Penerima</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {sortedWasteIn.length === 0 ? (
                    <tr>
                      <td colSpan={13}>
                        <EmptyState
                          title="Tidak ada log pemasukan limbah B3"
                          description="Data penerimaan limbah B3 ke TPS yang cocok dengan filter belum tersedia."
                        />
                      </td>
                    </tr>
                  ) : (
                    sortedWasteIn.map(item => {
                      const info = inById[item.id] || {
                        weightUsed: 0,
                        weightRemaining: item.weightKg,
                        status: 'Tersedia',
                        daysInTps: 0,
                        daysRemaining: DEFAULT_MAX_STORAGE_DAYS
                      };

                      const isHabis = info.status === 'Habis';
                      const isNearLimit = info.daysInTps >= WARNING_STORAGE_DAYS && info.weightRemaining > 0;
                      const remainPercent = item.weightKg > 0 
                        ? Math.max(0, Math.min(100, (info.weightRemaining / item.weightKg) * 100))
                        : 0;

                      return (
                        <tr 
                          key={item.id} 
                          className={isHabis ? 'opacity-65 text-text-low' : ''}
                        >
                          <td className="p-3.5 pl-5 font-mono text-text-mid font-bold whitespace-nowrap">
                            {item.id}
                          </td>
                          <td className="p-3.5 font-mono font-semibold text-text-hi whitespace-nowrap">
                            {item.dateIn}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-text-hi block">{item.wasteType}</span>
                            <span className="text-[10px] text-neon-amber font-mono font-bold uppercase">
                              KODE: {item.code}
                            </span>
                          </td>
                          <td className="p-3.5 text-text-mid">{item.source}</td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-bg-2/70 border border-border-subtle font-semibold text-text-mid">
                              {item.characteristic}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono tabular-nums font-bold text-text-hi whitespace-nowrap">
                            {item.weightKg.toLocaleString('id-ID')} Kg
                          </td>
                          <td className="p-3.5 text-right font-mono tabular-nums font-bold text-text-mid whitespace-nowrap">
                            {info.weightUsed.toLocaleString('id-ID')} Kg
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span className="font-mono tabular-nums font-bold text-neon-cyan block text-xs">
                              {info.weightRemaining.toLocaleString('id-ID')} Kg
                            </span>
                            <span className="text-[10px] text-text-low font-mono tabular-nums block">
                              dari {item.weightKg.toLocaleString('id-ID')} Kg
                            </span>
                            {/* Thin progress bar sisa stok */}
                            <div className="h-1.5 w-full bg-bg-0 border border-border-subtle rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full rounded-full ${
                                  info.weightRemaining === 0
                                    ? 'bg-text-low'
                                    : remainPercent < 30
                                    ? 'bg-neon-amber'
                                    : 'bg-neon-cyan'
                                }`}
                                style={{ width: `${remainPercent}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap font-mono tabular-nums">
                            {info.weightRemaining > 0 ? (
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                                isNearLimit 
                                  ? 'bg-neon-red/15 text-neon-red border-neon-red/40 font-extrabold animate-critical-pulse'
                                  : 'bg-bg-2/70 text-text-mid border-border-subtle'
                              }`}>
                                {info.daysInTps} hari
                              </span>
                            ) : (
                              <span className="text-text-low">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {info.status === 'Tersedia' && (
                              <StatusBadge status="Memenuhi" label="Tersedia" />
                            )}
                            {info.status === 'Sebagian Keluar' && (
                              <StatusBadge status="Mendekati" label="Sebagian Keluar" />
                            )}
                            {info.status === 'Habis' && (
                              <StatusBadge status="Perlu Verifikasi" label="Habis" />
                            )}
                          </td>
                          <td className="p-3.5 text-text-mid text-[11px]">{item.tpsLocation}</td>
                          <td className="p-3.5 text-text-hi font-medium">{item.officer}</td>
                          <td className="p-3.5 text-center pr-5 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                id={`waste-in-edit-${item.id}`}
                                onClick={() => startEditIn(item)}
                                className="p-1.5 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 border border-neon-cyan/25 rounded-lg cursor-pointer transition-colors"
                                title="Edit catatan masuk"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                id={`waste-in-delete-${item.id}`}
                                onClick={() => {
                                  if (!canDelete) {
                                    if (onUnauthorizedAction) onUnauthorizedAction("Hapus Log Masuk Limbah B3");
                                    return;
                                  }
                                  setDeleteConfirm({
                                    id: item.id,
                                    type: 'in',
                                    message: `Hapus catatan masuk batch ${item.id} (${item.wasteType}, ${item.weightKg} Kg)?`
                                  });
                                }}
                                className="p-1.5 bg-neon-red/10 text-neon-red hover:bg-neon-red/20 border border-neon-red/25 rounded-lg cursor-pointer transition-colors"
                                title="Hapus catatan masuk"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

      {/* TAB 3: LOG MANIFEST PENGELUARAN (OUTFLOW) */}
      {activeTab === 'outflow' && (
        <div className="space-y-4">
          {/* Summary Metric Banner (Total Masuk, Total Keluar, Sisa Stok dalam Kg) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 glass-panel p-3.5 rounded-2xl text-left font-mono tabular-nums">
            <div className="bg-bg-2/70 rounded-xl p-2.5 border border-border-subtle">
              <span className="text-[10px] uppercase text-text-mid block font-sans font-semibold">Total Limbah Masuk</span>
              <span className="text-base font-bold text-text-hi">{totalInAllTps.toLocaleString('id-ID')} Kg</span>
            </div>
            <div className="bg-bg-2/70 rounded-xl p-2.5 border border-border-subtle">
              <span className="text-[10px] uppercase text-text-mid block font-sans font-semibold">Total Limbah Keluar (Diangkut)</span>
              <span className="text-base font-bold text-text-hi">{totalOutAllTps.toLocaleString('id-ID')} Kg</span>
            </div>
            <div className="bg-neon-cyan/10 rounded-xl p-2.5 border border-neon-cyan/35">
              <span className="text-[10px] uppercase text-neon-cyan block font-sans font-bold">Sisa Stok di TPS Saat Ini</span>
              <span className="text-base font-black text-neon-cyan">{totalRemainingStockKg.toLocaleString('id-ID')} Kg</span>
            </div>
          </div>

          {/* Header Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-text-low" />
                <input
                  type="text"
                  placeholder="Cari manifest, transporter, driver, jenis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs"
                />
              </div>

              {/* Sorting Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 text-text-low" />
                <select
                  value={outSortMode}
                  onChange={(e) => setOutSortMode(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs font-medium"
                >
                  <option value="latest">Urutkan: Tanggal transaksi terbaru (default)</option>
                  <option value="created">Urutkan: Waktu input terakhir</option>
                </select>
              </div>
            </div>

            <button
              id="waste-out-add-btn"
              onClick={() => {
                if (!canEdit) {
                  if (onUnauthorizedAction) onUnauthorizedAction("Log Keluar Limbah B3");
                  return;
                }
                resetOutForm();
                setShowOutForm(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 neon-btn-primary rounded-xl text-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Catat Pengiriman Keluar (Manifest)
            </button>
          </div>

          {/* Form Modal / Entry Form */}
          {showOutForm && (
            <form 
              id="waste-out-form"
              onSubmit={handleOutSubmit}
              className="glass-panel p-5 rounded-2xl border-neon-cyan/40 shadow-glow-cyan text-left animate-fade-in"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neon-cyan font-heading">
                  {editingOutId ? `Edit Manifest Pengiriman Keluar (${editingOutId})` : 'Pencatatan Manifest Pengiriman Keluar TPS B3'}
                </h3>
                <span className="text-[11px] text-text-low font-mono">Transporter Berizin KLH/BPLH</span>
              </div>

              {/* Datalist rekomendasi histori */}
              <datalist id="dest-suggestions">
                {destinationSuggestions.map((item, idx) => (
                  <option key={idx} value={item} />
                ))}
              </datalist>
              <datalist id="trans-suggestions">
                {transporterSuggestions.map((item, idx) => (
                  <option key={idx} value={item} />
                ))}
              </datalist>
              <datalist id="vehicle-suggestions">
                {vehicleSuggestions.map((item, idx) => (
                  <option key={idx} value={item} />
                ))}
              </datalist>
              <datalist id="driver-suggestions">
                {driverSuggestions.map((item, idx) => (
                  <option key={idx} value={item} />
                ))}
              </datalist>
              <datalist id="recipient-suggestions">
                {recipientSuggestions.map((item, idx) => (
                  <option key={idx} value={item} />
                ))}
              </datalist>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Tanggal Pengangkutan</label>
                  <input
                    id="waste-out-date"
                    type="date"
                    required
                    value={outDate}
                    onChange={(e) => setOutDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Jenis Limbah B3</label>
                  <select
                    id="waste-out-type"
                    value={outType}
                    onChange={(e) => setOutType(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  >
                    {wasteB3Catalog.map((x, ci) => (
                      <option key={ci} value={x.name}>{x.name}</option>
                    ))}
                  </select>

                  {/* Indikator Stok Tersedia Realtime */}
                  <div className="mt-1 text-[11px] font-mono tabular-nums flex items-center justify-between text-text-mid">
                    <span>
                      Stok tersedia per {outDate}:{' '}
                      <strong className="text-neon-cyan">{availableStockForSelectedOut.toLocaleString('id-ID')} Kg</strong>
                    </span>
                    {typeof outWeight === 'number' && outWeight > 0 && (
                      <span className={simulatedRemainingStock < 0 ? 'text-neon-red font-bold' : 'text-neon-cyan font-bold'}>
                        Sisa: {simulatedRemainingStock.toLocaleString('id-ID')} Kg
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Volume Pengangkutan (Kg)</label>
                  <input
                    id="waste-out-weight"
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    placeholder="Contoh: 120"
                    value={outWeight}
                    onChange={(e) => setOutWeight(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums"
                  />
                  {simulatedRemainingStock < 0 && (
                    <span className="text-[10px] text-neon-red font-semibold block mt-1">
                      Peringatan: Berat melebihi stok tersedia per tanggal ini!
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Tujuan Pengolah Akhir (Buyer)</label>
                  <input
                    id="waste-out-dest"
                    type="text"
                    required
                    list="dest-suggestions"
                    placeholder="Contoh: PT Pemanfaat Limbah Raya"
                    value={outDest}
                    onChange={(e) => setOutDest(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Vendor Transporter B3</label>
                  <input
                    id="waste-out-transporter"
                    type="text"
                    required
                    list="trans-suggestions"
                    placeholder="Contoh: PT Trans Mandiri B3"
                    value={outTrans}
                    onChange={(e) => setOutTrans(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Nomor Manifest Resmi KLH/BPLH</label>
                  <input
                    id="waste-out-manifest"
                    type="text"
                    required
                    placeholder="Contoh: MAN-B3-2026-0001"
                    value={outManifest}
                    onChange={(e) => setOutManifest(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-neon-cyan font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Nomor Polisi Armada</label>
                  <input
                    id="waste-out-vehicle"
                    type="text"
                    required
                    list="vehicle-suggestions"
                    placeholder="Contoh: KT 8412 DB"
                    value={outVehicle}
                    onChange={(e) => setOutVehicle(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Nama Driver Armada</label>
                  <input
                    id="waste-out-driver"
                    type="text"
                    required
                    list="driver-suggestions"
                    placeholder="Nama pengemudi truk transporter"
                    value={outDriver}
                    onChange={(e) => setOutDriver(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Petugas Penanggung Pengirim (TPS)</label>
                  <input
                    id="waste-out-recipient"
                    type="text"
                    required
                    list="recipient-suggestions"
                    placeholder="Nama petugas / supervisor TPS"
                    value={outRecipient}
                    onChange={(e) => setOutRecipient(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
                <button
                  id="waste-out-cancel"
                  type="button"
                  onClick={resetOutForm}
                  className="px-4 py-2 text-xs font-semibold text-text-mid hover:text-text-hi rounded-xl border border-border-subtle cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="waste-out-submit"
                  type="submit"
                  className="px-5 py-2.5 neon-btn-primary text-xs rounded-xl cursor-pointer"
                >
                  {editingOutId ? 'Update Manifest Keluar' : 'Simpan Manifest Keluar'}
                </button>
              </div>
            </form>
          )}

          {/* Table Log Manifest Pengeluaran */}
          <div className="glass-panel rounded-2xl overflow-hidden text-left">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-hi font-heading">
                  Log Manifest Pengeluaran Limbah B3 Keluar TPS (Outbound Manifest Logs)
                </h4>
                <p className="text-[11px] text-text-low mt-0.5">
                  Rincian manifest pengangkutan resmi dengan alokasi batch penerimaan (FIFO)
                </p>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-text-mid">
                Total Baris: {sortedWasteOut.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="neon-table text-left">
                <thead>
                  <tr className="text-[10px] font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">Nomor Manifest</th>
                    <th className="p-3.5">Tanggal Keluar</th>
                    <th className="p-3.5">Jenis / Spesi Limbah B3</th>
                    <th className="p-3.5 text-right">Volume (Kg)</th>
                    <th className="p-3.5 min-w-[200px]">Diambil dari Batch (FIFO)</th>
                    <th className="p-3.5">Tujuan Pengolah Akhir</th>
                    <th className="p-3.5">Vendor Transporter B3</th>
                    <th className="p-3.5">Driver / No Polisi</th>
                    <th className="p-3.5">Petugas TPS / Penerima</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {sortedWasteOut.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <EmptyState
                          title="Tidak ada log pengeluaran manifest limbah B3"
                          description="Belum ada manifest pengangkutan limbah B3 yang tercatat atau sesuai pencarian."
                        />
                      </td>
                    </tr>
                  ) : (
                    sortedWasteOut.map(item => {
                      const outInfo = outById[item.id] || { allocations: [], shortfallKg: 0 };
                      const hasShortfall = outInfo.shortfallKg > 0;

                      return (
                        <tr 
                          key={item.id} 
                          className={hasShortfall ? 'bg-neon-red/10' : ''}
                        >
                          <td className="p-3.5 pl-5 font-mono text-neon-cyan font-extrabold whitespace-nowrap">
                            {item.manifestNo}
                          </td>
                          <td className="p-3.5 font-mono font-semibold text-text-hi whitespace-nowrap">
                            {item.dateOut}
                          </td>
                          <td className="p-3.5 font-bold text-text-hi whitespace-nowrap">
                            {item.wasteType}
                          </td>
                          <td className="p-3.5 text-right font-bold text-text-hi font-mono tabular-nums text-sm whitespace-nowrap">
                            {item.weightKg.toLocaleString('id-ID')} Kg
                          </td>
                          <td className="p-3.5">
                            {outInfo.allocations && outInfo.allocations.length > 0 ? (
                              <div className="space-y-1">
                                {outInfo.allocations.map((alloc, aidx) => (
                                  <div 
                                    key={aidx} 
                                    className="text-[11px] font-mono tabular-nums text-text-mid bg-bg-2/70 border border-border-subtle px-2 py-0.5 rounded flex items-center justify-between gap-2"
                                  >
                                    <span className="font-bold text-neon-cyan">{alloc.inId}</span>
                                    <span className="text-text-low text-[10px]">({alloc.dateIn})</span>
                                    <span className="font-bold text-text-hi">{alloc.kg.toLocaleString('id-ID')} Kg</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-text-low text-[11px]">-</span>
                            )}

                            {hasShortfall && (
                              <div className="mt-1.5">
                                <span className="inline-flex items-center gap-1 text-[10px] bg-neon-red/15 text-neon-red border border-neon-red/40 px-2 py-0.5 rounded font-bold font-mono tabular-nums">
                                  <AlertCircle className="h-3 w-3" />
                                  Melebihi stok (+{outInfo.shortfallKg.toLocaleString('id-ID')} Kg)
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-text-mid text-[11px]">{item.destination}</td>
                          <td className="p-3.5 font-semibold text-text-hi whitespace-nowrap">{item.transporter}</td>
                          <td className="p-3.5">
                            <span className="text-text-hi block font-medium">{item.driverName}</span>
                            <span className="text-[10px] text-text-mid font-mono font-bold uppercase">{item.vehicleNo}</span>
                          </td>
                          <td className="p-3.5 text-text-mid font-semibold">{item.recipient}</td>
                          <td className="p-3.5 text-center pr-5 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                id={`waste-out-edit-${item.id}`}
                                onClick={() => startEditOut(item)}
                                className="p-1.5 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 border border-neon-cyan/25 rounded-lg cursor-pointer transition-colors"
                                title="Edit catatan manifest"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                id={`waste-out-delete-${item.id}`}
                                onClick={() => {
                                  if (!canDelete) {
                                    if (onUnauthorizedAction) onUnauthorizedAction("Hapus Log Keluar Limbah B3");
                                    return;
                                  }
                                  setDeleteConfirm({
                                    id: item.id,
                                    type: 'out',
                                    message: `Hapus record manifest pengeluaran ${item.manifestNo} (${item.wasteType}, ${item.weightKg} Kg)?`
                                  });
                                }}
                                className="p-1.5 bg-neon-red/10 text-neon-red hover:bg-neon-red/20 border border-neon-red/25 rounded-lg cursor-pointer transition-colors"
                                title="Hapus catatan manifest"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

      {/* Modal Dialog Konfirmasi Hapus */}
      {deleteConfirm && (
        <ModalPortal>
          <div id="delete-confirm-modal-b3" className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="glass-panel border-neon-red/40 shadow-glow-red rounded-3xl p-6 max-w-sm w-full text-text-hi text-left">
              <h3 className="text-sm font-bold text-text-hi flex items-center gap-2 font-heading">
                <span className="p-1.5 rounded-lg bg-neon-red/15 text-neon-red border border-neon-red/30">
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
                  className="px-3.5 py-2 rounded-xl text-xs bg-bg-2 hover:bg-bg-0 border border-border-subtle text-text-mid hover:text-text-hi font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    const { id, type } = deleteConfirm;
                    setDeleteConfirm(null);
                    try {
                      if (type === 'in') {
                        await onDeleteIn(id);
                      } else {
                        await onDeleteOut(id);
                      }
                    } catch (err: any) {
                      // Ditangani oleh toast
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs neon-btn-danger font-bold transition-colors cursor-pointer"
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

