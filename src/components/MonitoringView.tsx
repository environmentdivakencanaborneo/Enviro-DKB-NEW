/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WastewaterData, RainfallData } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  CloudRain, 
  Droplet, 
  Filter,
  Eye,
  ArrowUpDown
} from 'lucide-react';
import { evaluateWastewaterStatus } from '../data/regulations';

interface MonitoringViewProps {
  wastewater: WastewaterData[];
  rainfall: RainfallData[];
  onAddWastewater: (item: any) => void;
  onDeleteWastewater: (id: string) => void;
  onAddRainfall: (item: any) => void;
  onDeleteRainfall: (id: string) => void;
}

export default function MonitoringView({
  wastewater,
  rainfall,
  onAddWastewater,
  onDeleteWastewater,
  onAddRainfall,
  onDeleteRainfall
}: MonitoringViewProps) {
  const [activeTab, setActiveTab] = useState<'water' | 'rainfall'>('water');

  // WATER STATE
  const [showWaterForm, setShowWaterForm] = useState(false);
  const [waterFilterLoc, setWaterFilterLoc] = useState('');
  const [waterFilterStatus, setWaterFilterStatus] = useState('');

  // Water Form Fields
  const [wDate, setWDate] = useState(new Date().toISOString().slice(0, 10));
  const [wLoc, setWLoc] = useState('KPL Tambang Blok Utara (KPL-01)');
  const [wOfficer, setWOfficer] = useState('');
  const [wPh, setWPh] = useState(7.0);
  const [wTss, setWTss] = useState(30);
  const [wDebit, setWDebit] = useState(0.500);
  const [wFe, setWFe] = useState(0.5);
  const [wMn, setWMn] = useState(0.3);

  // RAINFALL STATE
  const [showRainForm, setShowRainForm] = useState(false);
  const [rainFilterStation, setRainFilterStation] = useState('');
  
  // Rain Form Fields
  const [rDate, setRDate] = useState(new Date().toISOString().slice(0, 10));
  const [rStart, setRStart] = useState('14:00');
  const [rEnd, setREnd] = useState('15:30');
  const [rStation, setRStation] = useState('Stasiun Pit West / WS-01');
  const [rType, setRType] = useState<'Manual' | 'Automatic'>('Automatic');
  const [rRainfall, setRRainfall] = useState(25.0);
  const [rWeather, setRWeather] = useState<'Clear' | 'Cloudy' | 'Light Rain' | 'Heavy Rain' | 'Storm'>('Heavy Rain');
  const [rNotes, setRNotes] = useState('');

  // BMKG Weather Classification Helper
  const getBMKGWeatherClass = (vol: number): 'Clear' | 'Cloudy' | 'Light Rain' | 'Heavy Rain' | 'Storm' => {
    if (vol <= 0) return 'Clear';
    if (vol < 5) return 'Cloudy'; // Kurang dari 5 mm harian dianggap Berawan / Mendung (Sangat Ringan)
    if (vol <= 20) return 'Light Rain'; // 5 - 20 mm adalah Hujan Ringan (Light Rain)
    if (vol <= 50) return 'Heavy Rain'; // 20 - 50 mm adalah Hujan Sedang / Lebat (Heavy Rain)
    return 'Storm'; // > 50 mm dianggap Hujan Sangat Lebat / Badai (Storm)
  };

  // Calculations for Water compliance rate in view
  const phLimitRange = "6.0 - 9.0";
  const tssLimit = "100 mg/L";
  const debitLimit = "Bebas / Pantau";
  const feLimit = "7.0 mg/L";
  const mnLimit = "4.0 mg/L";

  // Water dynamic rating calculator
  const dynamicWaterStatus = evaluateWastewaterStatus(wPh, wTss, wDebit, wFe, wMn);

  // Submit water
  const handleWaterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wOfficer) {
      alert("Masukkan nama petugas sampling.");
      return;
    }
    
    onAddWastewater({
      date: wDate,
      location: wLoc,
      officer: wOfficer,
      ph: Number(wPh),
      tss: Number(wTss),
      debit: Number(wDebit),
      fe: Number(wFe),
      mn: Number(wMn)
    });

    // Reset fields
    setWPh(7.0);
    setWTss(30);
    setWDebit(0.500);
    setWFe(0.5);
    setWMn(0.3);
    setShowWaterForm(false);
  };

  // Submit water formula
  const handleRainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate duration in minutes
    const [sH, sM] = rStart.split(':').map(Number);
    const [eH, eM] = rEnd.split(':').map(Number);
    let duration = (eH * 60 + eM) - (sH * 60 + sM);
    if (duration <= 0) duration = 60; // fallback

    // Calculate intensity: rainfall (mm) / (duration in hours)
    const intensity = Number((rRainfall / (duration / 60)).toFixed(2));

    onAddRainfall({
      date: rDate,
      startTime: rStart,
      endTime: rEnd,
      duration,
      station: rStation,
      gaugeType: rType,
      rainfall: Number(rRainfall),
      intensity,
      weather: rWeather,
      notes: rNotes
    });

    setRNotes('');
    setRRainfall(25.0);
    setRWeather('Heavy Rain');
    setShowRainForm(false);
  };

  // Filter lists
  const filteredWater = wastewater.filter(item => {
    const locMatch = waterFilterLoc ? item.location.includes(waterFilterLoc) : true;
    const statMatch = waterFilterStatus ? item.status === waterFilterStatus : true;
    return locMatch && statMatch;
  });

  const filteredRain = rainfall.filter(item => {
    return rainFilterStation ? item.station.includes(rainFilterStation) : true;
  });

  return (
    <div id="monitoring-view-container" className="space-y-6 text-slate-200">
      {/* Upper sub navigation header tabs */}
      <div className="flex border-b border-slate-800">
        <button
          id="monitoring-tab-water"
          onClick={() => setActiveTab('water')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'water' 
              ? 'border-teal-500 text-teal-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Droplet className="h-4 w-4" />
          Pemantauan Air Limbah Tambang
        </button>
        <button
          id="monitoring-tab-rainfall"
          onClick={() => setActiveTab('rainfall')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'rainfall' 
              ? 'border-teal-500 text-teal-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CloudRain className="h-4 w-4" />
          Pemantauan Curah Hujan (Rain Gauge)
        </button>
      </div>

      {activeTab === 'water' && (
        <div id="water-monitoring-panel" className="space-y-6">
          {/* Water parameters indicators banner */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
            <div className="text-center md:border-r border-slate-800/80 py-1.5 last:border-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Baku pH</span>
              <p className="text-sm font-bold text-slate-100 mt-1">{phLimitRange}</p>
            </div>
            <div className="text-center md:border-r border-slate-800/80 py-1.5 last:border-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Baku TSS</span>
              <p className="text-sm font-bold text-slate-100 mt-1">{tssLimit}</p>
            </div>
            <div className="text-center md:border-r border-slate-800/80 py-1.5 last:border-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Debit Air (m³/s)</span>
              <p className="text-sm font-bold text-slate-100 mt-1">{debitLimit}</p>
            </div>
            <div className="text-center md:border-r border-slate-800/80 py-1.5 last:border-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Baku Besi (Fe)</span>
              <p className="text-sm font-bold text-slate-100 mt-1">{feLimit}</p>
            </div>
            <div className="text-center py-1.5 last:border-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Baku Mangan (Mn)</span>
              <p className="text-sm font-bold text-slate-100 mt-1">{mnLimit}</p>
            </div>
          </div>

          {/* Action buttons + Filters row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search/Filter elements */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="water-filter-loc"
                  type="text"
                  placeholder="Cari Lokasi Sampling..."
                  value={waterFilterLoc}
                  onChange={(e) => setWaterFilterLoc(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-teal-500 outline-none w-full"
                />
              </div>

              <select
                id="water-filter-status"
                value={waterFilterStatus}
                onChange={(e) => setWaterFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-teal-500 outline-none"
              >
                <option value="">Semua Status Baku Mutu</option>
                <option value="Safe">✅ Memenuhi Baku Mutu</option>
                <option value="Warning">⚠️ Mendekati Batas</option>
                <option value="Exceeded">❌ Melebihi Baku Mutu</option>
              </select>
            </div>

            {/* Float form trigger */}
            <button
              id="water-add-data-btn"
              onClick={() => setShowWaterForm(!showWaterForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-teal-500/10 cursor-pointer self-start"
            >
              <Plus className="h-4 w-4" />
              Input Hasil Sampling Air
            </button>
          </div>

          {/* Collapsible water form */}
          {showWaterForm && (
            <form 
              id="water-data-form"
              onSubmit={handleWaterSubmit}
              className="bg-[#111726]/80 p-5 rounded-2xl border border-slate-800 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-4 pb-2 border-b border-slate-800">
                Formulir Hasil Pengujian Titik KPL / Settling Pond
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Tanggal Sampling</label>
                  <input
                    id="water-field-date"
                    type="date"
                    required
                    value={wDate}
                    onChange={(e) => setWDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Titik Lokasi Pengamatan</label>
                  <input
                    id="water-field-loc"
                    type="text"
                    required
                    placeholder="Contoh: KPL Tambang Blok Utara (KPL-01)"
                    value={wLoc}
                    onChange={(e) => setWLoc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Nama Petugas Sampling</label>
                  <input
                    id="water-field-officer"
                    type="text"
                    required
                    placeholder="Contoh: Aditya Perkasa"
                    value={wOfficer}
                    onChange={(e) => setWOfficer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
                <div>
                  <label className="block text-[10px] text-slate-450 font-bold mb-1.5 uppercase">Suhu / pH</label>
                  <input
                    id="water-field-ph"
                    type="number"
                    step="0.1"
                    required
                    value={wPh}
                    onChange={(e) => setWPh(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 font-bold mb-1.5 uppercase">TSS (mg/L)</label>
                  <input
                    id="water-field-tss"
                    type="number"
                    required
                    value={wTss}
                    onChange={(e) => setWTss(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 font-bold mb-1.5 uppercase">Debit (m³/s)</label>
                  <input
                    id="water-field-debit"
                    type="number"
                    step="0.001"
                    required
                    placeholder="Contoh: 0.125"
                    value={wDebit}
                    onChange={(e) => setWDebit(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 font-bold mb-1.5 uppercase">Besi (Fe)</label>
                  <input
                    id="water-field-fe"
                    type="number"
                    step="0.01"
                    required
                    value={wFe}
                    onChange={(e) => setWFe(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-450 font-bold mb-1.5 uppercase">Mangan (Mn)</label>
                  <input
                    id="water-field-mn"
                    type="number"
                    step="0.01"
                    required
                    value={wMn}
                    onChange={(e) => setWMn(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              {/* Real-time Validation Feedback badge */}
              <div className="p-3 rounded-xl border flex items-center justify-between mb-4 bg-slate-900/60 border-slate-800">
                <p className="text-xs text-slate-400">Verifikasi baku mutu otomatis (PP 22/2021 & Permen LHK No. 113/2003) :</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10.5px] font-bold px-3 py-1 rounded-lg border uppercase tracking-wider ${
                    dynamicWaterStatus === 'Safe' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : dynamicWaterStatus === 'Warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    {dynamicWaterStatus === 'Safe' ? '✅ MEMENUHI BAKU MUTU' :
                     dynamicWaterStatus === 'Warning' ? '⚠️ MENDEKATI BATAS PARAMETER' : '❌ MELEBIHI BAKU MUTU (MELANGGAR)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
                <button
                  id="water-form-cancel"
                  type="button"
                  onClick={() => setShowWaterForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="water-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Records
                </button>
              </div>
            </form>
          )}

          {/* Water log table */}
          <div className="bg-[#111726]/80 rounded-2xl border border-slate-800 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Log Pengujian Air Limbah Tambang</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">No / Tgl</th>
                    <th className="p-3.5">Lokasi Sampling</th>
                    <th className="p-3.5 text-center">pH</th>
                    <th className="p-3.5 text-center">TSS</th>
                    <th className="p-3.5 text-center">Debit (m³/s)</th>
                    <th className="p-3.5 text-center">Besi / Fe</th>
                    <th className="p-3.5 text-center">Mangan / Mn</th>
                    <th className="p-3.5 text-center">Compliance</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredWater.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">Tidak ada data hasil sampling yang cocok.</td>
                    </tr>
                  ) : (
                    filteredWater.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-3.5 pl-5 font-mono">
                          <span className="text-slate-500 block text-[9px]">{item.id}</span>
                          <span className="font-semibold text-slate-300">{item.date}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-200 block">{item.location}</span>
                          <span className="text-[10px] text-slate-500">Petugas: {item.officer}</span>
                        </td>
                        <td className={`p-3.5 text-center font-bold font-mono ${item.ph < 6 || item.ph > 9 ? 'text-red-400' : 'text-slate-350'}`}>{item.ph}</td>
                        <td className={`p-3.5 text-center font-bold font-mono ${item.tss > 100 ? 'text-red-400' : 'text-slate-350'}`}>{item.tss}</td>
                        <td className="p-3.5 text-center font-bold font-mono text-teal-400">{(item.debit ?? 0).toFixed(3)}</td>
                        <td className={`p-3.5 text-center font-bold font-mono ${item.fe > 7 ? 'text-red-400' : 'text-slate-350'}`}>{item.fe}</td>
                        <td className={`p-3.5 text-center font-bold font-mono ${item.mn > 4 ? 'text-red-400' : 'text-slate-350'}`}>{item.mn}</td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                            item.status === 'Safe' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            item.status === 'Warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            'bg-red-500/10 border-red-500/20 text-red-500'
                          }`}>
                            {item.status === 'Safe' ? 'Lolos' : item.status === 'Warning' ? 'Warning' : 'Over Limit'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <button
                            id={`water-delete-btn-${item.id}`}
                            onClick={() => {
                              if (confirm(`Hapus data pengamatan ${item.id}?`)) {
                                onDeleteWastewater(item.id);
                              }
                            }}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Hapus record"
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

      {activeTab === 'rainfall' && (
        <div id="rainfall-monitoring-panel" className="space-y-6">
          {/* Rainfall parameters summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
                <CloudRain className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Total Akumulasi</span>
                <p className="text-xl font-bold text-slate-100 mt-1">
                  {rainfall.reduce((acc, x) => acc + x.rainfall, 0).toFixed(1)} mm
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Stasiun Pengamatan</span>
                <p className="text-xl font-bold text-slate-100 mt-1">
                  {Array.from(new Set(rainfall.map(x => x.station))).length} Pos Area
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <ArrowUpDown className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Batas Badai Kritis</span>
                <p className="text-xl font-bold text-slate-100 mt-1">&gt; 50 mm / Hari</p>
              </div>
            </div>
          </div>

          {/* Action buttons + Filters rain */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="rain-filter-station"
                  type="text"
                  placeholder="Cari Pos Meter..."
                  value={rainFilterStation}
                  onChange={(e) => setRainFilterStation(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-teal-500 outline-none w-full"
                />
              </div>
            </div>

            <button
              id="rain-add-data-btn"
              onClick={() => setShowRainForm(!showRainForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-teal-500/10 cursor-pointer self-start"
            >
              <Plus className="h-4 w-4" />
              Input Pengamatan Curah Hujan
            </button>
          </div>

          {/* Collapsible rain form */}
          {showRainForm && (
            <form 
              id="rain-data-form"
              onSubmit={handleRainSubmit}
              className="bg-[#111726]/80 p-5 rounded-2xl border border-slate-800 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-4 pb-2 border-b border-slate-800">
                Formulir Pencatatan Curah Hujan Harian
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Tanggal Hujan</label>
                  <input
                    id="rain-field-date"
                    type="date"
                    required
                    value={rDate}
                    onChange={(e) => setRDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Jam Mulai Hujan</label>
                  <input
                    id="rain-field-start"
                    type="time"
                    required
                    value={rStart}
                    onChange={(e) => setRStart(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Jam Selesai Hujan</label>
                  <input
                    id="rain-field-end"
                    type="time"
                    required
                    value={rEnd}
                    onChange={(e) => setREnd(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Stasiun Pos Pengamatan</label>
                  <input
                    id="rain-field-station"
                    type="text"
                    required
                    placeholder="Contoh: Stasiun Pit West (WS-01)"
                    value={rStation}
                    onChange={(e) => setRStation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Alat Pengukur</label>
                  <div className="flex gap-2 mt-1">
                    <button
                      id="rain-type-manual"
                      type="button"
                      onClick={() => setRType('Manual')}
                      className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-all ${
                        rType === 'Manual' ? 'bg-teal-500/10 border-teal-500 text-teal-400' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Gauge Manual
                    </button>
                    <button
                      id="rain-type-auto"
                      type="button"
                      onClick={() => setRType('Automatic')}
                      className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-all ${
                        rType === 'Automatic' ? 'bg-teal-500/10 border-teal-500 text-teal-400' : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Automatic
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Volume Curah Hujan (mm)</label>
                  <input
                    id="rain-field-volume"
                    type="number"
                    step="0.1"
                    required
                    value={rRainfall}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRRainfall(val);
                      setRWeather(getBMKGWeatherClass(val));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Klasifikasi Cuaca (Otomatis BMKG)</label>
                  <select
                    id="rain-field-weather"
                    value={rWeather}
                    disabled
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-400 cursor-not-allowed font-semibold"
                  >
                    <option value="Clear">Clear (Cerah / 0 mm)</option>
                    <option value="Cloudy">Cloudy (Mendung / &lt; 5 mm)</option>
                    <option value="Light Rain">Light Rain (Hujan Ringan: 5 - 20 mm)</option>
                    <option value="Heavy Rain">Heavy Rain (Hujan Sedang/Lebat: 20 - 50 mm)</option>
                    <option value="Storm">Storm (Badai/Sangat Lebat: &gt; 50 mm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Catatan Operasional Lapangan</label>
                  <input
                    id="rain-field-notes"
                    type="text"
                    placeholder="Status pompa / limpahan drainase"
                    value={rNotes}
                    onChange={(e) => setRNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
                <button
                  id="rain-form-cancel"
                  type="button"
                  onClick={() => setShowRainForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="rain-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Records
                </button>
              </div>
            </form>
          )}

          {/* Rain logs table */}
          <div className="bg-[#111726]/80 rounded-2xl border border-slate-800 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Log Pengkuran Curah Hujan (Rain Gauge Records)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">No / Tgl</th>
                    <th className="p-3.5">Nama Stasiun</th>
                    <th className="p-3.5 pr-2.5">Durasi Hujan</th>
                    <th className="p-3.5 text-center">Instrumen</th>
                    <th className="p-3.5 text-center">Curah Hujan (mm)</th>
                    <th className="p-3.5 text-center">Intensitas (mm/jam)</th>
                    <th className="p-3.5 text-center">Cuaca</th>
                    <th className="p-3.5 text-left pl-5">Catatan / Hambatan Tambang</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredRain.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">Tidak ada log pengamatan curah hujan.</td>
                    </tr>
                  ) : (
                    filteredRain.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-3.5 pl-5 font-mono">
                          <span className="text-slate-500 block text-[9px]">{item.id}</span>
                          <span className="font-semibold text-slate-300">{item.date}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-200">{item.station}</span>
                        </td>
                        <td className="p-3.5 pr-2.5">
                          <span className="font-mono text-slate-300 block">{item.startTime} - {item.endTime}</span>
                          <span className="text-[10px] text-slate-500">{item.duration} Menit</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono font-bold uppercase">
                            {item.gaugeType}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-100 font-mono">
                          {item.rainfall} mm
                        </td>
                        <td className="p-3.5 text-center font-bold font-mono text-teal-400">
                          {item.intensity}
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            item.weather === 'Storm' ? 'bg-red-500/20 text-red-400' :
                            item.weather === 'Heavy Rain' ? 'bg-blue-500/20 text-blue-400' :
                            item.weather === 'Light Rain' ? 'bg-teal-500/10 text-teal-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.weather}
                          </span>
                        </td>
                        <td className="p-3.5 text-left pl-5 text-slate-450 truncate max-w-[200px]" title={item.notes}>
                          {item.notes || '-'}
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <button
                            id={`rain-delete-btn-${item.id}`}
                            onClick={() => {
                              if (confirm(`Hapus data hujan ${item.id}?`)) {
                                onDeleteRainfall(item.id);
                              }
                            }}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Hapus record"
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
