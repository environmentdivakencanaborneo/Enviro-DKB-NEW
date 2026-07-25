/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { WasteIn, WasteOut, WasteStock } from '../types';
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
  Pencil
} from 'lucide-react';

interface WasteB3ViewProps {
  wasteIn: WasteIn[];
  wasteOut: WasteOut[];
  wasteStocks: WasteStock[];
  onAddIn: (item: any) => void;
  onUpdateIn?: (id: string, item: any) => void;
  onDeleteIn: (id: string) => void;
  onAddOut: (item: any) => void;
  onUpdateOut?: (id: string, item: any) => void;
  onDeleteOut: (id: string) => void;
}

// Static list for dropdown waste selections
const wasteB3Catalog = [
  { name: "Aki / Baterai Bekas", code: "A102d" },
  { name: "Baterai Bekas", code: "A102d" },
  { name: "Minyak Pelumas Bekas", code: "B105d" },
  { name: "Limbah Medis", code: "A337-1" },
  { name: "Filter Oli Bekas", code: "A108d" },
  { name: "Kemasan Bekas B3", code: "B104d" },
  { name: "Kain Majun", code: "B110d" },
  { name: "Limbah Elektronik", code: "B107d" },
  { name: "Limbah Terkontaminasi B3", code: "A108d" },
  { name: "Sludge Oil treatment", code: "A331-2" },
  { name: "Limbah Cat", code: "B555-1" },
  { name: "Refrigent Bekas", code: "A111d" },
  { name: "Toner Bekas", code: "B353-1" },
  { name: "Produk farmasi kadaluarsa", code: "A337-2" },
  { name: "Filter bekas pengendalian pencemaran udara", code: "B109d" }
];

export default function WasteB3View({
  wasteIn,
  wasteOut,
  wasteStocks,
  onAddIn,
  onUpdateIn,
  onDeleteIn,
  onAddOut,
  onUpdateOut,
  onDeleteOut
}: WasteB3ViewProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'intake' | 'outflow'>('status');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'in' | 'out'; message: string } | null>(null);

  // EDIT STATE
  const [editingInId, setEditingInId] = useState<string | null>(null);
  const [editingOutId, setEditingOutId] = useState<string | null>(null);

  // FORM INTAKE STATE
  const [showInForm, setShowInForm] = useState(false);
  const [inDate, setInDate] = useState(new Date().toISOString().slice(0, 10));
  const [inType, setInType] = useState('Aki / Baterai Bekas');
  const [inSource, setInSource] = useState('Workshop Alat Berat (Pit West Area)');
  const [inWeight, setInWeight] = useState(400);
  const [inChar, setInChar] = useState<'Flammable' | 'Toxic' | 'Corrosive' | 'Reactive' | 'Infectious'>('Flammable');
  const [inCode, setInCode] = useState('A102d');
  const [inLoc, setInLoc] = useState('TPS B3 Area Workshop Utama');
  const [inOfficer, setInOfficer] = useState('');

  // FORM OUTFLOW STATE
  const [showOutForm, setShowOutForm] = useState(false);
  const [outDate, setOutDate] = useState(new Date().toISOString().slice(0, 10));
  const [outType, setOutType] = useState('Aki / Baterai Bekas');
  const [outWeight, setOutWeight] = useState(400);
  const [outDest, setOutDest] = useState('PT Pengolah Limbah Nusantara, Karawang');
  const [outTrans, setOutTrans] = useState('PT Trans Cita B3 Mandiri');
  const [outManifest, setOutManifest] = useState('');
  const [outVehicle, setOutVehicle] = useState('B 9042 UIT');
  const [outDriver, setOutDriver] = useState('');
  const [outRecipient, setOutRecipient] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-sync select code from wasteB3Catalog when inType changes
  React.useEffect(() => {
    const found = wasteB3Catalog.find(x => x.name === inType);
    if (found) {
      setInCode(found.code);
    }
  }, [inType]);

  const startEditIn = (item: WasteIn) => {
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

  // Submission handles
  const handleInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inOfficer || !inCode) {
      alert("Lengkapi kolom penanggung jawab & kode limbah Permen LHK No. 6 Tahun 2021.");
      return;
    }
    const payload = {
      dateIn: inDate,
      wasteType: inType,
      source: inSource,
      weightKg: Number(inWeight),
      characteristic: inChar,
      code: inCode,
      tpsLocation: inLoc,
      officer: inOfficer
    };

    if (editingInId) {
      if (onUpdateIn) {
        onUpdateIn(editingInId, payload);
      }
      setEditingInId(null);
    } else {
      onAddIn(payload);
    }

    setInOfficer('');
    setShowInForm(false);
  };

  const handleOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outDriver || !outRecipient || !outManifest) {
      alert("Lengkapi kolom Transporter, No Manifest, dan Driver.");
      return;
    }
    // Check stock availability (only when adding new or when weight has increased)
    const targetStock = wasteStocks.find(x => x.wasteType === outType);
    const existingWeight = editingOutId ? (wasteOut.find(x => x.id === editingOutId)?.weightKg || 0) : 0;
    const additionalWeightNeeded = outWeight - existingWeight;

    if (!targetStock || targetStock.currentStock < additionalWeightNeeded) {
      alert(`Stok tidak mencukupi! Stok saat ini untuk ${outType} adalah ${targetStock?.currentStock || 0} Kg.`);
      return;
    }

    const payload = {
      dateOut: outDate,
      wasteType: outType,
      weightKg: Number(outWeight),
      destination: outDest,
      transporter: outTrans,
      manifestNo: outManifest,
      vehicleNo: outVehicle,
      driverName: outDriver,
      recipient: outRecipient
    };

    if (editingOutId) {
      if (onUpdateOut) {
        onUpdateOut(editingOutId, payload);
      }
      setEditingOutId(null);
    } else {
      onAddOut(payload);
    }

    setOutDriver('');
    setOutRecipient('');
    setOutManifest('');
    setShowOutForm(false);
  };

  const handleTypeSelectChange = (type: string, direction: 'in' | 'out') => {
    const found = wasteB3Catalog.find(x => x.name === type);
    if (direction === 'in') {
      setInType(type);
      if (found) setInCode(found.code);
    } else {
      setOutType(type);
    }
  };

  return (
    <div id="waste-b3-view-wrapper" className="space-y-6 text-slate-700">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200">
        <button
          id="waste-tab-status"
          onClick={() => setActiveTab('status')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'status' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Gauge className="h-4 w-4" />
          Status Stok & Kapasitas TPS
        </button>
        <button
          id="waste-tab-intake"
          onClick={() => setActiveTab('intake')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'intake' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Log Limbah Masuk (Inflow Log)
        </button>
        <button
          id="waste-tab-outflow"
          onClick={() => setActiveTab('outflow')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'outflow' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck className="h-4 w-4" />
          Log Limbah Keluar (Manifest Outflow)
        </button>
      </div>

      {activeTab === 'status' && (
        <div id="waste-status-panel" className="space-y-6">
          {/* Regulatory Reminder box */}
          <div className="bg-white/60 p-4.5 rounded-2xl border border-slate-200/80 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              Ketentuan Penyimpanan Limbah B3 — Permen LHK No. 6 Tahun 2021 / PP No. 22 Tahun 2021
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Seluruh limbah bahan berbahaya dan beracun (B3) yang disimpan di TPS wajib dicatat tanggal penerimaannya. Batas waktu penyimpanan maksimal di TPS berizin konstruksi adalah <span className="text-red-600 font-bold font-mono">90/180/365 HARI</span> sejak masuk. Keterlambatan pengangkutan transporter berizin KLHK dapat memicu denda administratif berat.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Recharts Pie Chart representing current stocks */}
            <div className="lg:col-span-1 bg-white/80 border border-slate-200 p-6 rounded-2xl text-left flex flex-col justify-between shadow">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-teal-600 font-sans">Proporsi Limbah B3 di TPS</h4>
                <p className="text-xs text-slate-500 mt-1 pb-2 border-b border-black/5">Distribusi berat (Kg) limbah yang saat ini disimpan di TPS berizin</p>
              </div>

              {/* Dynamic Pie Chart Area */}
              <div className="h-56 my-5 flex items-center justify-center relative">
                {(() => {
                  const pieData = wasteStocks
                    .filter(stock => stock.currentStock > 0)
                    .map(stock => ({
                      name: stock.wasteType.split(' (')[0], // Use shorter name for pie chart list/labels
                      fullName: stock.wasteType,
                      code: stock.code,
                      value: stock.currentStock
                    }));
                  const totalStock = wasteStocks.reduce((sum, s) => sum + s.currentStock, 0);
                  const PIE_COLORS = ['#14b8a6', '#f59e0b', '#3b82f6', '#ec4899', '#a855f7'];

                  if (totalStock === 0) {
                    return (
                      <p className="text-xs text-slate-500 font-medium">Tidak ada limbah B3 yang tersimpan di TPS saat ini.</p>
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
                            {pieData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={PIE_COLORS[index % PIE_COLORS.length]} 
                                stroke="#111726" 
                                strokeWidth={2} 
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(value: any, name: any, props: any) => [
                              `${value.toLocaleString('id-ID')} Kg`, 
                              props.payload.fullName
                            ]}
                            contentStyle={{ 
                              backgroundColor: '#0b0f19', 
                              borderColor: 'rgba(0,0,0,0.08)', 
                              borderRadius: '12px', 
                              fontSize: '11px',
                              textAlign: 'left'
                            }}
                            itemStyle={{ color: '#cbd5e1' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Center Overlay Text */}
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-1">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Total TPS</span>
                        <span className="text-base font-black text-slate-800 font-mono mt-0.5">{totalStock.toLocaleString('id-ID')}</span>
                        <span className="text-[10px] text-teal-600 font-bold block">Kg</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Dynamic Legend with percentages */}
              <div className="space-y-2 pt-3 border-t border-slate-200/60">
                {(() => {
                  const activeStocks = wasteStocks.filter(stock => stock.currentStock > 0);
                  const totalStock = wasteStocks.reduce((sum, s) => sum + s.currentStock, 0);
                  const PIE_COLORS = ['#14b8a6', '#f59e0b', '#3b82f6', '#ec4899', '#a855f7'];

                  if (totalStock === 0) {
                    return (
                      <p className="text-[11px] text-center text-slate-500">Neraca Kosong</p>
                    );
                  }

                  return activeStocks.map((stock, index) => {
                    const percentage = ((stock.currentStock / totalStock) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} 
                          />
                          <span className="text-slate-500 truncate" title={stock.wasteType}>
                            {stock.wasteType.split(' (')[0]}
                          </span>
                        </div>
                        <span className="font-mono text-slate-500 font-bold ml-2.5 whitespace-nowrap">
                          {percentage}%
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Column: Dynamic grid bento card indicators */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Status Neraca Inventaris Aktual</h4>
                <span className="text-[10px] text-slate-500 font-mono">Kapasitas Maksimal Sektor: 5.000 Kg</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {wasteStocks.map((stock, i) => {
                  const capLimit = 5000; // simulated max tps sector limit in Kg
                  const fillPercentage = Math.min(100, (stock.currentStock / capLimit) * 100);
                  const nearExpired = stock.daysInTps > 75;

                  return (
                    <div 
                      key={i} 
                      className={`bg-white/80 border p-5 rounded-2xl text-left flex flex-col justify-between min-h-[190px] shadow ${
                        nearExpired 
                          ? 'border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.05)]' 
                          : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] bg-white border border-slate-200 text-amber-600 px-2 py-0.5 rounded font-bold font-mono uppercase">
                            KODE: {stock.code}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1.5 font-bold font-mono ${
                            nearExpired ? 'bg-red-500/20 text-red-600 border-red-500/30 animate-pulse' : 'bg-white text-slate-500 border-slate-200'
                          }`}>
                            <Clock className="h-3.5 w-3.5" />
                            {stock.daysInTps} Hari di TPS
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 mt-2.5 leading-snug">{stock.wasteType}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Pertama Masuk: {stock.earliestDateIn || 'N/A'}</p>
                      </div>

                      {/* Stock balance gauges */}
                      <div className="mt-4">
                        <div className="flex items-end justify-between text-xs font-semibold mb-2">
                          <span className="text-slate-500">Saldo Stok:</span>
                          <span className="text-teal-600 text-sm font-bold font-mono">{stock.currentStock.toLocaleString('id-ID')} Kg</span>
                        </div>
                        {/* Progress indicator */}
                        <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-950/60 p-[1px]">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              nearExpired ? 'bg-gradient-to-r from-red-600 to-red-400' :
                              fillPercentage > 70 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-teal-500 to-emerald-400'
                            }`}
                            style={{ width: `${fillPercentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1.5 uppercase">
                          <span>Total Masuk: {stock.totalIn} Kg</span>
                          <span>Total Keluar: {stock.totalOut} Kg</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'intake' && (
        <div id="waste-intake-panel" className="space-y-6 animate-fade-in">
          {/* Action Row */}
          <div className="flex justify-end">
            <button
              id="waste-in-add-btn"
              onClick={() => setShowInForm(!showInForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Catat Penerimaan Limbah (Masuk)
            </button>
          </div>

          {/* Intake entry form */}
          {showInForm && (
            <form 
              id="waste-in-form"
              onSubmit={handleInSubmit}
              className="bg-white/80 p-5 rounded-2xl border border-slate-200 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 mb-4 pb-2 border-b border-slate-200">
                {editingInId ? 'Edit Pencatatan Masuk Gudang TPS Limbah B3' : 'Pencatatan Masuk Gudang TPS Limbah B3'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Tanggal Penerimaan</label>
                  <input
                    id="waste-in-date"
                    type="date"
                    required
                    value={inDate}
                    onChange={(e) => setInDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Jenis / Nama Limbah</label>
                  <select
                    id="waste-in-type"
                    value={inType}
                    onChange={(e) => handleTypeSelectChange(e.target.value, 'in')}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  >
                    {wasteB3Catalog.map((x, ci) => (
                      <option key={ci} value={x.name}>{x.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Sumber Penghasil Limbah</label>
                  <input
                    id="waste-in-source"
                    type="text"
                    required
                    placeholder="Contoh: Workshop Alat Berat Pit-D"
                    value={inSource}
                    onChange={(e) => setInSource(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Berat Volume (Kg)</label>
                  <input
                    id="waste-in-weight"
                    type="number"
                    required
                    value={inWeight}
                    onChange={(e) => setInWeight(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Karakteristik Kimiawi</label>
                  <select
                    id="waste-in-char"
                    value={inChar}
                    onChange={(e) => setInChar(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 animate-none"
                  >
                    <option value="Flammable">Flammable (Mudah Menyala)</option>
                    <option value="Corrosive">Corrosive (Korosif / Asam)</option>
                    <option value="Toxic">Toxic (Beracun)</option>
                    <option value="Reactive">Reactive (Reaktif Beracun)</option>
                    <option value="Infectious">Infectious (Medis)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Kode Reg Permen LHK No. 6 Tahun 2021</label>
                  <input
                    id="waste-in-code"
                    type="text"
                    required
                    readOnly
                    value={inCode}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-amber-600 font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Lokasi Penimbunan TPS</label>
                  <input
                    id="waste-in-loc"
                    type="text"
                    required
                    value={inLoc}
                    onChange={(e) => setInLoc(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Officer Verifikator Penerima</label>
                <input
                  id="waste-in-officer"
                  type="text"
                  required
                  placeholder="Contoh: Maman Suherman"
                  value={inOfficer}
                  onChange={(e) => setInOfficer(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 max-w-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-200">
                <button
                  id="waste-in-cancel"
                  type="button"
                  onClick={() => {
                    setShowInForm(false);
                    setEditingInId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="waste-in-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  {editingInId ? 'Update Stok Masuk' : 'Registrasi Stok Masuk'}
                </button>
              </div>
            </form>
          )}

          {/* Intake logs list */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow animate-none">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Log Penerimaan Limbah B3 Masuk TPS (Inbound Audit Trails)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">No Transaksi</th>
                    <th className="p-3.5">Tanggal Masuk</th>
                    <th className="p-3.5">Jenis / Spesi Limbah B3</th>
                    <th className="p-3.5">Asal Penghasil (Sorce)</th>
                    <th className="p-3.5 text-center">Fisik Karakter</th>
                    <th className="p-3.5 text-center">Volume (Kg)</th>
                    <th className="p-3.5">Lokasi Gudang / Rak</th>
                    <th className="p-3.5">Petugas Penerima</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {wasteIn.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">Tidak ada log pemasukan limpah b3.</td>
                    </tr>
                  ) : (
                    wasteIn.map(item => (
                      <tr key={item.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                        <td className="p-3.5 pl-5 font-mono text-slate-500 font-bold">{item.id}</td>
                        <td className="p-3.5 font-semibold text-slate-600">{item.dateIn}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 block">{item.wasteType}</span>
                          <span className="text-[10px] text-amber-600 font-mono font-bold uppercase">KODE: {item.code}</span>
                        </td>
                        <td className="p-3.5 text-slate-500">{item.source}</td>
                        <td className="p-3.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold font-sans text-slate-600">
                            {item.characteristic}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-700 font-mono text-sm">{item.weightKg} Kg</td>
                        <td className="p-3.5 text-slate-500">{item.tpsLocation}</td>
                        <td className="p-3.5 text-slate-500 font-semibold">{item.officer}</td>
                        <td className="p-3.5 text-center pr-5 flex items-center justify-center gap-1.5">
                          <button
                            id={`waste-in-edit-${item.id}`}
                            onClick={() => startEditIn(item)}
                            className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Edit records"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            id={`waste-in-delete-${item.id}`}
                            onClick={() => {
                              setDeleteConfirm({
                                id: item.id,
                                type: 'in',
                                message: `Hapus records penerimaan ${item.id}?`
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

      {activeTab === 'outflow' && (
        <div id="waste-outflow-panel" className="space-y-6">
          {/* Action Row */}
          <div className="flex justify-end">
            <button
              id="waste-out-add-btn"
              onClick={() => setShowOutForm(!showOutForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Catat Pengiriman Keluar (Manifest)
            </button>
          </div>

          {/* Outflow entry form */}
          {showOutForm && (
            <form 
              id="waste-out-form"
              onSubmit={handleOutSubmit}
              className="bg-white/80 p-5 rounded-2xl border border-slate-200 text-left animate-slide-up animate-none"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 mb-4 pb-2 border-b border-slate-200">
                {editingOutId ? 'Edit Manifest Pengiriman Keluar TPS B3' : 'Pencatatan Manifest Pengiriman Keluar (PT Transporter berizin)'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Tanggal Pengangkutan</label>
                  <input
                    id="waste-out-date"
                    type="date"
                    required
                    value={outDate}
                    onChange={(e) => setOutDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Jenis Limbah B3</label>
                  <select
                    id="waste-out-type"
                    value={outType}
                    onChange={(e) => handleTypeSelectChange(e.target.value, 'out')}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  >
                    {wasteB3Catalog.map((x, ci) => (
                      <option key={ci} value={x.name}>{x.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Volume Pengangkutan (Kg)</label>
                  <input
                    id="waste-out-weight"
                    type="number"
                    required
                    value={outWeight}
                    onChange={(e) => setOutWeight(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Tujuan Pengolah Akhir (Buyer)</label>
                  <input
                    id="waste-out-dest"
                    type="text"
                    required
                    value={outDest}
                    onChange={(e) => setOutDest(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Vendor Transporter B3</label>
                  <input
                    id="waste-out-transporter"
                    type="text"
                    required
                    value={outTrans}
                    onChange={(e) => setOutTrans(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Nomor Manifest Resmi KLHK</label>
                  <input
                    id="waste-out-manifest"
                    type="text"
                    required
                    placeholder="Contoh: MAN-B3-2026-XXXXX"
                    value={outManifest}
                    onChange={(e) => setOutManifest(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-teal-600 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Nomor Polisi Armada</label>
                  <input
                    id="waste-out-vehicle"
                    type="text"
                    required
                    value={outVehicle}
                    onChange={(e) => setOutVehicle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Nama Driver Armada</label>
                  <input
                    id="waste-out-driver"
                    type="text"
                    required
                    placeholder="Nama pengemudi truk"
                    value={outDriver}
                    onChange={(e) => setOutDriver(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Petugas Penanggung Pengirim (TPS)</label>
                  <input
                    id="waste-out-recipient"
                    type="text"
                    required
                    placeholder="Nama supervisor TPS"
                    value={outRecipient}
                    onChange={(e) => setOutRecipient(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-200">
                <button
                  id="waste-out-cancel"
                  type="button"
                  onClick={() => {
                    setShowOutForm(false);
                    setEditingOutId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="waste-out-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  {editingOutId ? 'Update Manifest Keluar' : 'Simpan Manifest Keluar'}
                </button>
              </div>
            </form>
          )}

          {/* Outflow logs list */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Log Manifest Pengeluaran Limbah B3 Keluar TPS (Outbound Manifest Logs)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">Nomor Manifest</th>
                    <th className="p-3.5">Tanggal Keluar</th>
                    <th className="p-3.5">Jenis / Spesi Limbah B3</th>
                    <th className="p-3.5 text-center">Volume (Kg)</th>
                    <th className="p-3.5">Tujuan Pengolah Akhir (Buyer)</th>
                    <th className="p-3.5">Vendor Transporter B3</th>
                    <th className="p-3.5">Driver / No Polisi</th>
                    <th className="p-3.5">Penerima Pengolah</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-500">
                  {wasteOut.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">Tidak ada log pengeluaran manifest limbah B3.</td>
                    </tr>
                  ) : (
                    wasteOut.map(item => (
                      <tr key={item.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                        <td className="p-3.5 pl-5 font-mono text-teal-600 font-extrabold">{item.manifestNo}</td>
                        <td className="p-3.5 font-semibold text-slate-600">{item.dateOut}</td>
                        <td className="p-3.5 font-bold text-slate-700">{item.wasteType}</td>
                        <td className="p-3.5 text-center font-bold text-slate-800 font-mono text-sm">{item.weightKg} Kg</td>
                        <td className="p-3.5 text-slate-500">{item.destination}</td>
                        <td className="p-3.5 font-semibold text-slate-600">{item.transporter}</td>
                        <td className="p-3.5">
                          <span className="text-slate-700 block font-medium">{item.driverName}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">{item.vehicleNo}</span>
                        </td>
                        <td className="p-3.5 text-slate-500 font-semibold">{item.recipient}</td>
                        <td className="p-3.5 text-center pr-5 flex items-center justify-center gap-1.5">
                          <button
                            id={`waste-out-edit-${item.id}`}
                            onClick={() => startEditOut(item)}
                            className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Edit records"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            id={`waste-out-delete-${item.id}`}
                            onClick={() => {
                              setDeleteConfirm({
                                id: item.id,
                                type: 'out',
                                message: `Hapus record manifest pengeluaran ${item.manifestNo}?`
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

      {deleteConfirm && (
        <div id="delete-confirm-modal-b3" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-700 text-left">
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
                  const { id, type } = deleteConfirm;
                  setDeleteConfirm(null);
                  try {
                    if (type === 'in') {
                      await onDeleteIn(id);
                    } else {
                      await onDeleteOut(id);
                    }
                  } catch (err: any) {
                    alert('Gagal menghapus data: ' + err.message);
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-500 text-white font-bold transition-colors cursor-pointer"
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
