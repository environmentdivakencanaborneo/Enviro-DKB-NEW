/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  WastewaterData, 
  RainfallData, 
  NurseryData, 
  ReclamationGuarantee, 
  WasteStock, 
  ComplianceCalendarEvent 
} from '../types';
import { 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  TrendingUp, 
  Waves, 
  Trees, 
  ShieldAlert, 
  FileCheck2, 
  Clock, 
  CalendarDays,
  ExternalLink
} from 'lucide-react';
import { INDONESIAN_REGULATIONS } from '../data/regulations';

interface DashboardViewProps {
  wastewater: WastewaterData[];
  rainfall: RainfallData[];
  nursery: NurseryData[];
  guarantees: ReclamationGuarantee[];
  wasteStocks: WasteStock[];
  calendar: ComplianceCalendarEvent[];
  setCurrentTab: (tab: string) => void;
}

export default function DashboardView({
  wastewater,
  rainfall,
  nursery,
  guarantees,
  wasteStocks,
  calendar,
  setCurrentTab
}: DashboardViewProps) {
  const [chartMetric, setChartMetric] = useState<'ph' | 'tss' | 'rainfall'>('ph');

  // Calculations
  const totalSeeds = nursery.reduce((sum, x) => sum + x.quantity, 0);
  const totalGuaranteesValue = guarantees.reduce((sum, x) => sum + x.value, 0);
  const activeGuaranteesCount = guarantees.filter(x => x.status === 'Active').length;

  const totalWaterTests = wastewater.length;
  const passedWaterTests = wastewater.filter(x => x.status === 'Safe').length;
  const warningWaterTests = wastewater.filter(x => x.status === 'Warning').length;
  const failedWaterTests = wastewater.filter(x => x.status === 'Exceeded').length;

  const waterComplianceRate = totalWaterTests > 0 
    ? Math.round(((passedWaterTests + warningWaterTests) / totalWaterTests) * 100) 
    : 100;

  // Find oldest B3 waste item
  const maxDaysB3 = wasteStocks.length > 0
    ? Math.max(...wasteStocks.map(x => x.daysInTps))
    : 0;

  // Custom Chart Render Logic
  const getChartData = () => {
    if (chartMetric === 'ph') {
      return wastewater.slice().reverse().map((x, i) => ({
        label: x.date.slice(5),
        value: x.ph,
        displayVal: `${x.ph}`,
        alert: x.status === 'Exceeded'
      }));
    } else if (chartMetric === 'tss') {
      return wastewater.slice().reverse().map((x, i) => ({
        label: x.date.slice(5),
        value: x.tss,
        displayVal: `${x.tss} mg/L`,
        alert: x.status === 'Exceeded'
      }));
    } else {
      return rainfall.slice().reverse().map((x, i) => ({
        label: x.date.slice(5),
        value: x.rainfall,
        displayVal: `${x.rainfall} mm`,
        alert: x.weather === 'Storm'
      }));
    }
  };

  const currentChartData = getChartData();
  const maxVal = currentChartData.length > 0 
    ? Math.max(...currentChartData.map(d => d.value), 10) 
    : 10;

  const chartScale = maxVal > 0 ? (120 / maxVal) : 1;

  return (
    <div id="dashboard-view-wrapper" className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Compliance Rate Card */}
        <div id="kpi-water-compliance" className="glass-panel glass-panel-interactive transition-all duration-300 shadow-xl p-5 rounded-2xl flex items-start gap-4 group">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform duration-200 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Waves className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <span className="text-xs text-slate-400 font-medium">Compliance Air Limbah</span>
            <h3 className="text-2xl font-bold font-sans text-slate-100 mt-1">{waterComplianceRate}%</h3>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="text-emerald-400 font-semibold">{passedWaterTests} Aman</span>
              <span className="text-slate-500">•</span>
              <span className="text-red-400 font-semibold">{failedWaterTests} Melebihi</span>
            </div>
          </div>
        </div>

        {/* Nursery Stocks Card */}
        <div id="kpi-nursery" className="glass-panel glass-panel-interactive transition-all duration-300 shadow-xl p-5 rounded-2xl flex items-start gap-4 group">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform duration-200 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Trees className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <span className="text-xs text-slate-400 font-medium">Persediaan Bibit Nursery</span>
            <h3 className="text-2xl font-bold font-sans text-slate-100 mt-1">
              {totalSeeds.toLocaleString('id-ID')}
            </h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
              <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold font-sans">
                {nursery.filter(x => x.status === 'Healthy').length} Jenis Sehat
              </span>
            </div>
          </div>
        </div>

        {/* B3 Storage Limit Card */}
        <div id="kpi-b3-safety" className="glass-panel glass-panel-interactive transition-all duration-300 shadow-xl p-5 rounded-2xl flex items-start gap-4 group">
          <div className={`p-3 rounded-xl group-hover:scale-105 transition-transform duration-200 ${
            maxDaysB3 > 80 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-amber-500/10 text-amber-500'
          }`}>
            <Clock className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <span className="text-xs text-slate-400 font-medium">Penyimpanan Terlama TPS</span>
            <h3 className="text-2xl font-bold font-sans text-slate-100 mt-1">{maxDaysB3} Hari</h3>
            <div className="flex items-center gap-1 mt-1 text-[11px]">
              <span className={maxDaysB3 >= 80 ? 'text-red-400 font-bold' : 'text-slate-400 font-medium'}>
                {maxDaysB3 >= 90 ? 'Melanggar Batas!' : `Sisa ${90 - maxDaysB3} Hari (Permen LHK No. 6/2021)`}
              </span>
            </div>
          </div>
        </div>

        {/* Reclamation Escrow Card */}
        <div id="kpi-guarantee" className="glass-panel glass-panel-interactive transition-all duration-300 shadow-xl p-5 rounded-2xl flex items-start gap-4 group">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform duration-200 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <span className="text-xs text-slate-400 font-medium">Total Jaminan Reklamasi</span>
            <h3 className="text-lg font-bold font-sans text-slate-100 mt-1 truncate">
              IDR {(totalGuaranteesValue / 1000000000).toFixed(2)} M
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="text-emerald-400 font-semibold">{activeGuaranteesCount} Aktif</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-semibold">
                {guarantees.filter(x => x.status === 'Renewal Needed').length} Perlu Renewal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Regulatory compliance widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Interactive SVG Chart */}
        <div id="dashboard-trend-panel" className="lg:col-span-2 glass-panel shadow-xl p-6 rounded-2xl text-left flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Tren Parameter Terkini</h4>
              <p className="text-xs text-slate-500 mt-0.5">Analisa perbandingan data pengujian terbaru di lapangan</p>
            </div>
            {/* Metric Switchers */}
            <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-lg border border-white/5">
              <button
                id="chart-metric-ph"
                onClick={() => setChartMetric('ph')}
                className={`px-3 py-1 text-[11px] rounded font-medium transition-all cursor-pointer ${
                  chartMetric === 'ph' ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/15' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                pH Air
              </button>
              <button
                id="chart-metric-tss"
                onClick={() => setChartMetric('tss')}
                className={`px-3 py-1 text-[11px] rounded font-medium transition-all cursor-pointer ${
                  chartMetric === 'tss' ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/15' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                TSS (mg/L)
              </button>
              <button
                id="chart-metric-rainfall"
                onClick={() => setChartMetric('rainfall')}
                className={`px-3 py-1 text-[11px] rounded font-medium transition-all cursor-pointer ${
                  chartMetric === 'rainfall' ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/15' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Curah Hujan
              </button>
            </div>
          </div>

          {/* Render Vector Graph */}
          <div className="py-6 h-64 relative flex items-end">
            {currentChartData.length === 0 ? (
              <div className="w-full text-center text-xs text-slate-500 py-12">Belum ada data untuk dirender.</div>
            ) : (
              <div className="w-full h-full flex items-end justify-between px-4 gap-2.5">
                {currentChartData.map((d, i) => {
                  const nodeHeight = d.value * chartScale;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      {/* Bar Pillar */}
                      <div className="w-full flex justify-center items-end relative h-full">
                        <div 
                          className={`w-4 sm:w-8 rounded-t-lg transition-all duration-300 relative ${
                            d.alert 
                              ? 'bg-gradient-to-t from-red-500/40 to-red-500 shadow-[0_0_12px_rgba(239,68,68,0.2)]' 
                              : 'bg-gradient-to-t from-emerald-500/20 to-emerald-400 group-hover:to-emerald-300'
                          }`}
                          style={{ height: `${Math.min(100, (nodeHeight / 120) * 100)}%` }}
                        >
                          {/* Inner glowing effect for safe parameters */}
                          <div className={`absolute top-0 inset-l-0 h-1.5 w-full rounded-t-lg ${d.alert ? 'bg-red-300' : 'bg-emerald-300'}`} />
                        </div>
                      </div>

                      {/* Tooltip on hover */}
                      <div className="absolute bottom-[105%] bg-slate-950/95 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-xl min-w-[70px] text-center">
                        <p className="font-bold text-slate-200">{d.displayVal}</p>
                        <p className="text-slate-500">{d.label}</p>
                      </div>

                      {/* Short scale Label */}
                      <span className="text-[10px] text-slate-500 mt-2 font-mono">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white/5 px-4 py-3 rounded-xl border border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              Menampilkan {currentChartData.length} records pengamatan ter-update.
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Interactive Chart Visualizer</span>
          </div>
        </div>

        {/* Dynamic Indonesian Environmental Legislation Matcher */}
        <div id="compliance-regulatory-widget" className="glass-panel shadow-xl p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-emerald-400" />
              Status Sinkronisasi Regulasi (ESD)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">Parameter baku mutu terintegrasi UU & Permen RI</p>
          </div>

          <div className="space-y-3 my-4 overflow-y-auto max-h-72 pr-1">
            {INDONESIAN_REGULATIONS.map(reg => (
              <div key={reg.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <h5 className="text-xs font-bold text-slate-200">{reg.title}</h5>
                  <span className="text-[9px] bg-white/10 text-emerald-400 border border-white/10 px-1.5 py-0.5 rounded font-mono font-medium">
                    {reg.category}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-400 mt-1 lines-clamp-2 leading-relaxed">
                  {reg.description}
                </p>
                {reg.parameters && reg.parameters.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {reg.parameters.map((param, pi) => (
                      <span key={pi} className="text-[9px] bg-white/5 text-slate-300 border border-white/5 px-1.5 py-0.5 rounded">
                        {param.name}: {param.limit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            id="regulatory-all-link"
            onClick={() => setCurrentTab('documents')}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-center text-xs font-semibold text-emerald-400 transition-colors border border-white/5 cursor-pointer"
          >
            Sertifikasi & Kalender Compliance →
          </button>
        </div>
      </div>

      {/* Compliance Event Calendar Section */}
      <div className="glass-panel shadow-xl p-6 rounded-2xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-400" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Jadwal Pelaporan & Audit Kepatuhan Lingkungan</h4>
          </div>
          <span className="text-xs text-slate-500">Semester 1</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {calendar.slice(0, 4).map(event => (
            <div key={event.id} className="glass-panel-light p-4 rounded-xl flex flex-col justify-between min-h-[140px] hover:border-white/10 transition-all">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 font-mono font-bold tracking-wide">
                    {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase font-mono ${
                    event.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    event.status === 'Overdue' ? 'bg-red-500/20 text-red-500 font-extrabold' : 'bg-amber-500/20 text-amber-500'
                  }`}>
                    {event.status === 'Completed' ? 'Selesai' : event.status === 'Overdue' ? 'Terlewat' : 'Pending'}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-200 truncate">{event.title}</h5>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{event.description}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9.5px] text-slate-500 font-semibold font-mono">Tipe: {event.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
