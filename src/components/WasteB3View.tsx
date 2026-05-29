/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';

interface WasteB3ViewProps {
  wasteIn: WasteIn[];
  wasteOut: WasteOut[];
  wasteStocks: WasteStock[];
  onAddIn: (item: any) => void;
  onDeleteIn: (id: string) => void;
  onAddOut: (item: any) => void;
  onDeleteOut: (id: string) => void;
}

export default function WasteB3View({
  wasteIn,
  wasteOut,
  wasteStocks,
  onAddIn,
  onDeleteIn,
  onAddOut,
  onDeleteOut
}: WasteB3ViewProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'intake' | 'outflow'>('status');

  // FORM INTAKE STATE
  const [showInForm, setShowInForm] = useState(false);
  const [inDate, setInDate] = useState(new Date().toISOString().slice(0, 10));
  const [inType, setInType] = useState('Oli Bekas (Used Lubricant)');
  const [inSource, setInSource] = useState('Workshop Alat Berat (Pit West Area)');
  const [inWeight, setInWeight] = useState(400);
  const [inChar, setInChar] = useState<'Flammable' | 'Toxic' | 'Corrosive' | 'Reactive' | 'Infectious'>('Flammable');
  const [inCode, setInCode] = useState('B105d');
  const [inLoc, setInLoc] = useState('TPS B3 Area Workshop Utama');
  const [inOfficer, setInOfficer] = useState('');

  // FORM OUTFLOW STATE
  const [showOutForm, setShowOutForm] = useState(false);
  const [outDate, setOutDate] = useState(new Date().toISOString().slice(0, 10));
  const [outType, setOutType] = useState('Oli Bekas (Used Lubricant)');
  const [outWeight, setOutWeight] = useState(400);
  const [outDest, setOutDest] = useState('PT Pengolah Limbah Nusantara, Karawang');
  const [outTrans, setOutTrans] = useState('PT Trans Cita B3 Mandiri');
  const [outManifest, setOutManifest] = useState('');
  const [outVehicle, setOutVehicle] = useState('B 9042 UIT');
  const [outDriver, setOutDriver] = useState('');
  const [outRecipient, setOutRecipient] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Submission handles
  const handleInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inOfficer || !inCode) {
      alert("Lengkapi kolom penanggung jawab & kode limbah Permen LHK No. 6 Tahun 2021.");
      return;
    }
    onAddIn({
      dateIn: inDate,
      wasteType: inType,
      source: inSource,
      weightKg: Number(inWeight),
      characteristic: inChar,
      code: inCode,
      tpsLocation: inLoc,
      officer: inOfficer
    });
    setInOfficer('');
    setShowInForm(false);
  };

  const handleOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outDriver || !outRecipient || !outManifest) {
      alert("Lengkapi kolom Transporter, No Manifest, dan Driver.");
      return;
    }
    // Check stock availability
    const targetStock = wasteStocks.find(x => x.wasteType === outType);
    if (!targetStock || targetStock.currentStock < outWeight) {
      alert(`Stok tidak mencukupi! Stok saat ini untuk ${outType} adalah ${targetStock?.currentStock || 0} Kg.`);
      return;
    }

    onAddOut({
      dateOut: outDate,
      wasteType: outType,
      weightKg: Number(outWeight),
      destination: outDest,
      transporter: outTrans,
      manifestNo: outManifest,
      vehicleNo: outVehicle,
      driverName: outDriver,
      recipient: outRecipient
    });

    setOutDriver('');
    setOutRecipient('');
    setOutManifest('');
    setShowOutForm(false);
  };

  // Static list for dropdown waste selections
  const wasteB3Catalog = [
    { name: "Oli Bekas (Used Lubricant)", code: "B105d" },
    { name: "Aki Bekas (Used Lead Acid Batteries)", code: "B102d" },
    { name: "Filter Oli & Solar Bekas (Used Filters)", code: "B108d" },
    { name: "Kemasan Bekas Bahan B3 (Contaminated Containers)", code: "B104d" },
    { name: "Sludge Oil Basin (Lumpur Minyak)", code: "A311-1" }
  ];

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
    <div id="waste-b3-view-wrapper" className="space-y-6 text-slate-200">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-800">
        <button
          id="waste-tab-status"
          onClick={() => setActiveTab('status')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'status' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gauge className="h-4 w-4" />
          Status Stok & Kapasitas TPS
        </button>
        <button
          id="waste-tab-intake"
          onClick={() => setActiveTab('intake')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'intake' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Log Limbah Masuk (Inflow Log)
        </button>
        <button
          id="waste-tab-outflow"
          onClick={() => setActiveTab('outflow')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'outflow' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="h-4 w-4" />
          Log Limbah Keluar (Manifest Outflow)
        </button>
      </div>

      {activeTab === 'status' && (
        <div id="waste-status-panel" className="space-y-6">
          {/* Regulatory Reminder box */}
          <div className="bg-slate-900/60 p-4.5 rounded-2xl border border-slate-800/80 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              Ketentuan Penyimpanan Limbah B3 — Permen LHK No. 6 Tahun 2021 / PP No. 22 Tahun 2021
            </h4>
            <p className="text-xs text-slate-350 mt-1.5 leading-relaxed">
              Seluruh limbah bahan berbahaya dan beracun (B3) yang disimpan di TPS wajib dicatat tanggal penerimaannya. Batas waktu penyimpanan maksimal di TPS berizin konstruksi adalah <span className="text-red-400 font-bold font-mono">90 HARI</span> sejak masuk. Keterlambatan pengangkutan transporter berizin KLHK dapat memicu denda administratif berat.
            </p>
          </div>

          {/* Dynamic grid bento card indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {wasteStocks.map((stock, i) => {
              const capLimit = 5000; // simulated max tps sector limit in Kg
              const fillPercentage = Math.min(100, (stock.currentStock / capLimit) * 100);
              const nearExpired = stock.daysInTps > 75;

              return (
                <div 
                  key={i} 
                  className={`bg-[#111726]/80 border p-5 rounded-2xl text-left flex flex-col justify-between min-h-[190px] shadow ${
                    nearExpired 
                      ? 'border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.05)]' 
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-amber-400 px-2 py-0.5 rounded font-bold font-mono uppercase">
                        KODE: {stock.code}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1.5 font-bold font-mono ${
                        nearExpired ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-slate-900 text-slate-400 border-slate-850'
                      }`}>
                        <Clock className="h-3.5 w-3.5" />
                        {stock.daysInTps} Hari di TPS
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-100 mt-2.5 leading-snug">{stock.wasteType}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pertama Masuk: {stock.earliestDateIn || 'N/A'}</p>
                  </div>

                  {/* Stock balance gauges */}
                  <div className="mt-4">
                    <div className="flex items-end justify-between text-xs font-semibold mb-2">
                      <span className="text-slate-400">Saldo Stok:</span>
                      <span className="text-teal-400 text-sm font-bold font-mono">{stock.currentStock.toLocaleString('id-ID')} Kg</span>
                    </div>
                    {/* Progress indicator */}
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-950/60 p-[1px]">
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
              className="bg-[#111726]/80 p-5 rounded-2xl border border-slate-800 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-4 pb-2 border-b border-slate-800">
                Pencatatan Masuk Gudang TPS Limbah B3
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Tanggal Penerimaan</label>
                  <input
                    id="waste-in-date"
                    type="date"
                    required
                    value={inDate}
                    onChange={(e) => setInDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Jenis / Nama Limbah</label>
                  <select
                    id="waste-in-type"
                    value={inType}
                    onChange={(e) => handleTypeSelectChange(e.target.value, 'in')}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  >
                    {wasteB3Catalog.map((x, ci) => (
                      <option key={ci} value={x.name}>{x.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Sumber Penghasil Limbah</label>
                  <input
                    id="waste-in-source"
                    type="text"
                    required
                    placeholder="Contoh: Workshop Alat Berat Pit-D"
                    value={inSource}
                    onChange={(e) => setInSource(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Berat Volume (Kg)</label>
                  <input
                    id="waste-in-weight"
                    type="number"
                    required
                    value={inWeight}
                    onChange={(e) => setInWeight(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Karakteristik Kimiawi</label>
                  <select
                    id="waste-in-char"
                    value={inChar}
                    onChange={(e) => setInChar(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 animate-none"
                  >
                    <option value="Flammable">Flammable (Mudah Menyala)</option>
                    <option value="Corrosive">Corrosive (Korosif / Asam)</option>
                    <option value="Toxic">Toxic (Beracun)</option>
                    <option value="Reactive">Reactive (Reaktif Beracun)</option>
                    <option value="Infectious">Infectious (Medis)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Kode Reg Permen LHK No. 6 Tahun 2021</label>
                  <input
                    id="waste-in-code"
                    type="text"
                    required
                    readOnly
                    value={inCode}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Lokasi Penimbunan TPS</label>
                  <input
                    id="waste-in-loc"
                    type="text"
                    required
                    value={inLoc}
                    onChange={(e) => setInLoc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Officer Verifikator Penerima</label>
                <input
                  id="waste-in-officer"
                  type="text"
                  required
                  placeholder="Contoh: Maman Suherman"
                  value={inOfficer}
                  onChange={(e) => setInOfficer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 max-w-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
                <button
                  id="waste-in-cancel"
                  type="button"
                  onClick={() => setShowInForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="waste-in-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Registrasi Stok Masuk
                </button>
              </div>
            </form>
          )}

          {/* Intake logs list */}
          <div className="bg-[#111726]/80 rounded-2xl border border-slate-800 overflow-hidden text-left shadow animate-none">
            <div className="px-5 py-4 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Log Penerimaan Limbah B3 Masuk TPS (Inbound Audit Trails)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
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
                      <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-3.5 pl-5 font-mono text-slate-400 font-bold">{item.id}</td>
                        <td className="p-3.5 font-semibold text-slate-300">{item.dateIn}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-100 block">{item.wasteType}</span>
                          <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">KODE: {item.code}</span>
                        </td>
                        <td className="p-3.5 text-slate-350">{item.source}</td>
                        <td className="p-3.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-semibold font-sans text-slate-300">
                            {item.characteristic}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-200 font-mono text-sm">{item.weightKg} Kg</td>
                        <td className="p-3.5 text-slate-350">{item.tpsLocation}</td>
                        <td className="p-3.5 text-slate-400 font-semibold">{item.officer}</td>
                        <td className="p-3.5 text-center pr-5">
                          <button
                            id={`waste-in-delete-${item.id}`}
                            onClick={() => {
                              if (confirm(`Hapus records penerimaan ${item.id}?`)) {
                                onDeleteIn(item.id);
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
              className="bg-[#111726]/80 p-5 rounded-2xl border border-slate-800 text-left animate-slide-up animate-none"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-4 pb-2 border-b border-slate-800">
                Pencatatan Manifest Pengiriman Keluar (PT Transporter berizin)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Tanggal Pengangkutan</label>
                  <input
                    id="waste-out-date"
                    type="date"
                    required
                    value={outDate}
                    onChange={(e) => setOutDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Jenis Limbah B3</label>
                  <select
                    id="waste-out-type"
                    value={outType}
                    onChange={(e) => handleTypeSelectChange(e.target.value, 'out')}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  >
                    {wasteB3Catalog.map((x, ci) => (
                      <option key={ci} value={x.name}>{x.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Volume Pengangkutan (Kg)</label>
                  <input
                    id="waste-out-weight"
                    type="number"
                    required
                    value={outWeight}
                    onChange={(e) => setOutWeight(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Tujuan Pengolah Akhir (Buyer)</label>
                  <input
                    id="waste-out-dest"
                    type="text"
                    required
                    value={outDest}
                    onChange={(e) => setOutDest(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Vendor Transporter B3</label>
                  <input
                    id="waste-out-transporter"
                    type="text"
                    required
                    value={outTrans}
                    onChange={(e) => setOutTrans(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Nomor Manifest Resmi KLHK</label>
                  <input
                    id="waste-out-manifest"
                    type="text"
                    required
                    placeholder="Contoh: MAN-B3-2026-XXXXX"
                    value={outManifest}
                    onChange={(e) => setOutManifest(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-teal-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Nomor Polisi Armada</label>
                  <input
                    id="waste-out-vehicle"
                    type="text"
                    required
                    value={outVehicle}
                    onChange={(e) => setOutVehicle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Nama Driver Armada</label>
                  <input
                    id="waste-out-driver"
                    type="text"
                    required
                    placeholder="Nama pengemudi truk"
                    value={outDriver}
                    onChange={(e) => setOutDriver(e.target.value)}
                    className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Petugas Penanggung Pengirim (TPS)</label>
                  <input
                    id="waste-out-recipient"
                    type="text"
                    required
                    placeholder="Nama supervisor TPS"
                    value={outRecipient}
                    onChange={(e) => setOutRecipient(e.target.value)}
                    className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
                <button
                  id="waste-out-cancel"
                  type="button"
                  onClick={() => setShowOutForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="waste-out-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Simpan Manifest Keluar
                </button>
              </div>
            </form>
          )}

          {/* Outflow logs list */}
          <div className="bg-[#111726]/80 rounded-2xl border border-slate-800 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Log Manifest Pengeluaran Limbah B3 Keluar TPS (Outbound Manifest Logs)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
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
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-350">
                  {wasteOut.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">Tidak ada log pengeluaran manifest limbah B3.</td>
                    </tr>
                  ) : (
                    wasteOut.map(item => (
                      <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-3.5 pl-5 font-mono text-teal-400 font-extrabold">{item.manifestNo}</td>
                        <td className="p-3.5 font-semibold text-slate-300">{item.dateOut}</td>
                        <td className="p-3.5 font-bold text-slate-200">{item.wasteType}</td>
                        <td className="p-3.5 text-center font-bold text-slate-100 font-mono text-sm">{item.weightKg} Kg</td>
                        <td className="p-3.5 text-slate-400">{item.destination}</td>
                        <td className="p-3.5 font-semibold text-slate-300">{item.transporter}</td>
                        <td className="p-3.5">
                          <span className="text-slate-200 block font-medium">{item.driverName}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">{item.vehicleNo}</span>
                        </td>
                        <td className="p-3.5 text-slate-400 font-semibold">{item.recipient}</td>
                        <td className="p-3.5 text-center pr-5">
                          <button
                            id={`waste-out-delete-${item.id}`}
                            onClick={() => {
                              if (confirm(`Hapus record manifest pengeluaran ${item.manifestNo}?`)) {
                                onDeleteOut(item.id);
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
    </div>
  );
}
