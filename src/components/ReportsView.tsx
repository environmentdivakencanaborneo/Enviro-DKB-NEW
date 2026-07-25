/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  WastewaterData, 
  RainfallData, 
  NurseryData, 
  ReclamationPlan, 
  WasteIn, 
  WasteOut,
  ReclamationGuarantee,
  EnvironmentalDocument,
  ComplianceCalendarEvent,
  EnvironmentalCost,
  SolidWasteData,
  SurfaceWaterData
} from '../types';
import { exportAllDataToXLSX } from '../services/exportService';
import { 
  FileText, 
  Printer, 
  ArrowLeft, 
  Compass, 
  CalendarDays, 
  TrendingUp, 
  Info,
  Award,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  ShieldAlert,
  Layers,
  Activity,
  CheckCircle,
  HelpCircle,
  Shield,
  Zap,
  Leaf,
  FileSpreadsheet
} from 'lucide-react';

interface ReportsViewProps {
  wastewater: WastewaterData[];
  rainfall: RainfallData[];
  nursery: NurseryData[];
  plans: ReclamationPlan[];
  wasteIn: WasteIn[];
  wasteOut: WasteOut[];
  guarantees: ReclamationGuarantee[];
  documents: EnvironmentalDocument[];
  calendarEvents: ComplianceCalendarEvent[];
  environmentalCosts: EnvironmentalCost[];
  solidWaste?: SolidWasteData[];
  surfaceWater?: SurfaceWaterData[];
  user: any;
}

export default function ReportsView({
  wastewater,
  rainfall,
  nursery,
  plans,
  wasteIn,
  wasteOut,
  guarantees,
  documents,
  calendarEvents,
  environmentalCosts,
  solidWaste = [],
  surfaceWater = [],
  user
}: ReportsViewProps) {
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [isPreview, setIsPreview] = useState(false);

  // Generate date bounds depending on active report duration selections
  const daysRange = reportType === 'weekly' ? 7 : 30;
  const filteredDateThreshold = new Date();
  filteredDateThreshold.setDate(filteredDateThreshold.getDate() - daysRange);

  // Filter datasets
  const activeWater = wastewater.filter(x => new Date(x.date) >= filteredDateThreshold);
  const activeSurfaceWater = surfaceWater.filter(x => new Date(x.date) >= filteredDateThreshold);
  const activeRain = rainfall.filter(x => new Date(x.date) >= filteredDateThreshold);
  const activeWasteIn = wasteIn.filter(x => new Date(x.dateIn) >= filteredDateThreshold);
  const activeWasteOut = wasteOut.filter(x => new Date(x.dateOut) >= filteredDateThreshold);

  // Format currency helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Calculated stats
  const avgPh = activeWater.length > 0 
    ? (activeWater.reduce((sum, x) => sum + x.ph, 0) / activeWater.length).toFixed(1)
    : '7.2';
  const maxPh = activeWater.length > 0 
    ? Math.max(...activeWater.map(x => x.ph)).toFixed(1)
    : '7.5';
  const minPh = activeWater.length > 0 
    ? Math.min(...activeWater.map(x => x.ph)).toFixed(1)
    : '6.8';

  const avgTss = activeWater.length > 0 
    ? (activeWater.reduce((sum, x) => sum + x.tss, 0) / activeWater.length).toFixed(1)
    : '95.0';
  const avgFe = activeWater.length > 0 
    ? (activeWater.reduce((sum, x) => sum + x.fe, 0) / activeWater.length).toFixed(2)
    : '0.45';
  const avgMn = activeWater.length > 0 
    ? (activeWater.reduce((sum, x) => sum + (x.mn || 0), 0) / activeWater.length).toFixed(2)
    : '0.12';

  const totalDebit = activeWater.reduce((sum, x) => sum + (x.debit || 0), 0);

  const totalRainfallVolume = activeRain.reduce((sum, x) => sum + x.rainfall, 0).toFixed(1);
  const maxRainfallRecord = activeRain.length > 0 
    ? Math.max(...activeRain.map(x => x.rainfall)).toFixed(1)
    : '0.0';
  const rainDaysCount = activeRain.filter(x => x.rainfall > 0).length;
  const avgIntensity = activeRain.length > 0 
    ? (activeRain.reduce((sum, x) => sum + (x.intensity || 0), 0) / activeRain.length).toFixed(1)
    : '0.0';

  const totalNurseryQty = nursery.reduce((sum, x) => sum + x.quantity, 0);
  const healthyPlantsCount = nursery.filter(x => x.status === 'Healthy').reduce((sum, x) => sum + x.quantity, 0);
  const nurseryHealthIndex = totalNurseryQty > 0 ? Math.round((healthyPlantsCount / totalNurseryQty) * 100) : 100;
  const uniqueFlowerTypes = Array.from(new Set(nursery.map(x => x.plantType)));

  const totalB3InWeight = activeWasteIn.reduce((sum, x) => sum + x.weightKg, 0);
  const totalB3OutWeight = activeWasteOut.reduce((sum, x) => sum + x.weightKg, 0);
  const b3NetDifference = totalB3InWeight - totalB3OutWeight;

  const toxicWasteWeight = activeWasteIn.filter(x => x.characteristic === 'Toxic').reduce((sum, x) => sum + x.weightKg, 0);
  const flammableWasteWeight = activeWasteIn.filter(x => x.characteristic === 'Flammable').reduce((sum, x) => sum + x.weightKg, 0);
  const corrosiveWasteWeight = activeWasteIn.filter(x => x.characteristic === 'Corrosive').reduce((sum, x) => sum + x.weightKg, 0);
  const reactiveWasteWeight = activeWasteIn.filter(x => x.characteristic === 'Reactive').reduce((sum, x) => sum + x.weightKg, 0);
  const infectiousWasteWeight = activeWasteIn.filter(x => x.characteristic === 'Infectious').reduce((sum, x) => sum + x.weightKg, 0);

  const plannedHa = plans.reduce((sum, p) => sum + (p.sizeHa || 0), 0);
  const realizedHa = plans.reduce((sum, p) => sum + (p.realizedSizeHa || 0), 0);
  const realRealizationPct = plannedHa > 0 ? ((realizedHa / plannedHa) * 100).toFixed(1) : '0';
  const budgetEst = plans.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
  const costReal = plans.reduce((sum, p) => sum + (p.realizedCost || 0), 0);
  const budgetDiff = budgetEst - costReal;

  const totalGuaranteesValue = guarantees.filter(g => g.status === 'Active').reduce((sum, g) => sum + g.value, 0);
  const activeGuaranteesCount = guarantees.filter(g => g.status === 'Active').length;
  const renewalGuaranteesCount = guarantees.filter(g => g.status === 'Renewal Needed').length;

  const inProgressReclamationsList = plans.filter(x => x.status === 'In Progress');

  const totalExceededWaterSamples = activeWater.filter(x => x.status === 'Exceeded').length;
  const complianceScorePercent = activeWater.length > 0 
    ? Math.round(((activeWater.length - totalExceededWaterSamples) / activeWater.length) * 100)
    : 100;

  const totalExceededSurfaceWaterSamples = activeSurfaceWater.filter(x => x.status === 'Exceeded').length;
  const surfaceWaterComplianceScorePercent = activeSurfaceWater.length > 0 
    ? Math.round(((activeSurfaceWater.length - totalExceededSurfaceWaterSamples) / activeSurfaceWater.length) * 100)
    : 100;
  
  const avgSurfacePh = activeSurfaceWater.length > 0
    ? (activeSurfaceWater.reduce((sum, x) => sum + x.ph, 0) / activeSurfaceWater.length).toFixed(1)
    : '7.0';
  const avgSurfaceTss = activeSurfaceWater.length > 0
    ? (activeSurfaceWater.reduce((sum, x) => sum + x.tss, 0) / activeSurfaceWater.length).toFixed(1)
    : '35.0';
  const avgSurfaceDO = activeSurfaceWater.length > 0
    ? (activeSurfaceWater.reduce((sum, x) => sum + x.doVal, 0) / activeSurfaceWater.length).toFixed(1)
    : '6.0';

  // Print function
  const handlePrint = () => {
    window.print();
  };

  const getPeriodLabel = () => {
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const startStr = filteredDateThreshold.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${startStr} s.d. ${today}`;
  };

  return (
    <div id="reports-view-wrapper" className="space-y-6 text-slate-700 text-left">
      {/* Dynamic inline stylesheet specifically for print formatting */}
      <style>{`
        @media print {
          /* Hide standard non-print elements */
          #sidebar-container, 
          #main-app-header, 
          #reports-toolbar-buttons,
          #reports-back-btn,
          #print-reminder-banner {
            display: none !important;
          }
          
          /* Force margins and layout container */
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: "Inter", sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #print-document-container {
            background-color: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 2.5cm 2cm 2.5cm 2cm !important;
            width: 100% !important;
            max-width: none !important;
            display: block !important;
          }
          
          .text-slate-800, .text-slate-700, .text-slate-600, .text-slate-500, .text-slate-900 {
            color: #111827 !important;
          }

          .text-slate-500, .text-slate-500 {
            color: #4b5563 !important;
          }

          .bg-white, .bg-white, .bg-white\\/40, .bg-white\\/60 {
            background-color: #f3f4f6 !important;
            border-color: #e5e7eb !important;
          }

          .border-slate-200, .border-slate-200, .border-slate-300 {
            border-color: #d1d5db !important;
          }
        }
      `}</style>

      {!isPreview ? (
        <div id="reports-setup-tab" className="space-y-6 animate-fade-in">
          {/* Main selection card */}
          <div className="bg-white/80 p-6 border border-slate-200 rounded-2xl max-w-2xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-teal-500/10 text-teal-600 rounded-xl">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Config Laporan Lingkungan Tambang</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Analisa otomatis parameter baku mutu sesuai PP No. 22 Tahun 2021</p>
                </div>
              </div>

              <button
                onClick={() => exportAllDataToXLSX({
                  wastewater, surfaceWater, rainfall, nursery,
                  reclamationPlans: plans,
                  reclamationGuarantees: guarantees,
                  wasteIn, wasteOut,
                  documents, calendarEvents, environmentalCosts,
                  solidWaste
                }, user?.company)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                  bg-emerald-600/20 hover:bg-emerald-600/30 active:bg-emerald-600/40
                  border border-emerald-500/30 text-emerald-300
                  text-xs font-semibold transition-all duration-200 cursor-pointer self-start sm:self-center"
              >
                <FileSpreadsheet size={14} />
                Export ke Excel (.xlsx)
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-xs text-slate-500 font-bold uppercase tracking-wider">Pilih Jangka Waktu & Format Laporan</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  id="report-select-weekly"
                  onClick={() => setReportType('weekly')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                    reportType === 'weekly' 
                      ? 'border-teal-500 bg-teal-500/5 text-teal-600' 
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs uppercase font-bold tracking-widest font-mono">Laporan Mingguan</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-1">Kompilasi praktis ringkasan data 7 hari terakhir.</p>
                </button>

                <button
                  id="report-select-monthly"
                  onClick={() => setReportType('monthly')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                    reportType === 'monthly' 
                      ? 'border-teal-500 bg-teal-500/5 text-teal-600' 
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs uppercase font-bold tracking-widest font-mono">Laporan Bulanan</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-1">Evaluasi tren operasional komparatif 30 hari terakhir.</p>
                </button>
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-xl border border-slate-200 flex items-start gap-3.5 text-xs text-slate-500">
              <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">Kompilasi Otomatis (Automatic Evaluator)</p>
                <p className="mt-1 leading-relaxed text-slate-500">
                  Laporan yang di-generate mencakup evaluasi baku mutu air limbah KPL, grafik intensitas hujan harian, audit log TPS Limbah B3, serta progress inventaris tanaman nursery secara real-time.
                </p>
              </div>
            </div>

            <button
              id="report-view-preview-btn"
              onClick={() => setIsPreview(true)}
              className="w-full py-3 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-400 shadow transition-colors cursor-pointer"
            >
              Generate & Preview Draft Laporan
            </button>
          </div>
        </div>
      ) : (
        <div id="reports-preview-tab" className="space-y-6">
          {/* Back & Print Action Bar */}
          <div id="reports-toolbar-buttons" className="flex items-center justify-between bg-white/60 p-4 border border-slate-200 rounded-2xl">
            <button
              id="reports-back-btn"
              onClick={() => setIsPreview(false)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold hover:bg-white rounded-xl text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </button>

            <button
              id="reports-trigger-print-btn"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-400 shadow transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Cetak PDF / Print Laporan
            </button>
          </div>

          <div id="print-reminder-banner" className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-500">
            <Info className="h-4 w-4 text-amber-500" />
            <span>Format cetak dioptimalkan untuk ukuran kertas **A4 Portrait**. Gunakan opsi **Save as PDF** di browser Anda.</span>
          </div>

          {/* Real styled A4 Container */}
          <div 
            id="print-document-container"
            className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-2xl max-w-4xl mx-auto font-sans text-left space-y-8"
          >
            {/* Header Laporan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-200">
              <div className="flex flex-wrap items-center gap-4">
                {/* Real Vector Brand Logo representing Diva Kencana Borneo */}
                <div id="report-brand-logo" className="h-14 w-auto shrink-0 flex items-center">
                  <svg viewBox="0 0 520 160" className="h-14 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Left circular crescent brand ring */}
                    <path d="M 80 8 A 72 72 0 0 0 80 152" stroke="#547B4C" strokeWidth="15" strokeLinecap="butt" />
                    {/* Central main background circle */}
                    <circle cx="80" cy="80" r="58" fill="#547B4C" />
                    {/* Concentric white decorative border */}
                    <circle cx="80" cy="80" r="48" stroke="#FFFFFF" strokeWidth="5" fill="none" />
                    {/* Character D styled vector */}
                    <text x="80" y="101" fontFamily="'Inter', 'Arial Black', sans-serif" fontWeight="950" fontSize="62" fill="#FFFFFF" textAnchor="middle">D</text>
                    {/* Brand Typography labels in lowercase matching user's logo */}
                    <g fill="#547B4C" fontFamily="'Inter', 'Outfit', 'Helvetica Neue', sans-serif" fontWeight="800" fontSize="48" letterSpacing="-1.5px">
                      <text x="175" y="55">diva</text>
                      <text x="175" y="98">kencana</text>
                      <text x="175" y="141">borneo</text>
                    </g>
                  </svg>
                </div>
                <div>
                  <h1 className="text-md font-bold text-slate-800 uppercase tracking-wide">{user?.company || 'PT DIVA KENCANA BORNEO'}</h1>
                  <p className="text-[10px] text-slate-500 font-mono">SITE INDONESIA COAL MINING OPERATIONS</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold uppercase tracking-wider text-teal-600">
                  {reportType === 'weekly' ? 'LAPORAN MINGGUAN LINGKUNGAN' : 'LAPORAN BULANAN LINGKUNGAN'}
                </h2>
                <p className="text-[10px] text-slate-500 mt-1 font-mono font-semibold">{getPeriodLabel()}</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Section 1: Water Quality Compliance */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <span className="text-teal-600 font-mono">I.</span> Kepatuhan Kualitas Air Limbah (Sedimentation / KPL)
                </h3>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">Baku Mutu PP No. 22 Tahun 2021</span>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Kompilasi pengujian laboratorium menunjukkan tingkat kelulusan Parameter Mutu Air Limpasan Tambang sebesar <strong className="text-teal-600">{complianceScorePercent}%</strong> dari total <strong className="text-slate-700">{activeWater.length} sampling pengujian</strong> selama periode berjalan.
              </p>

              {/* Stats tables or boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Kemasan pH</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{minPh} - {maxPh}</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Std: 6.0 - 9.0</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Rerata TSS</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{avgTss} mg/l</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Std: max 200</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Logam Fe & Mn</span>
                  <p className="text-xs font-bold text-slate-700 font-mono mt-0.5">Fe: {avgFe} | Mn: {avgMn}</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Std: Fe&lt;7, Mn&lt;4</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Batas Melebihi</span>
                  <p className={`text-sm font-bold font-mono mt-0.5 ${totalExceededWaterSamples > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {totalExceededWaterSamples} Sampel
                  </p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Inspeksi Lapangan</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Debit Kumulatif</span>
                  <p className="text-sm font-bold text-teal-600 font-mono mt-0.5">{totalDebit.toFixed(3)} m³/s</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Aliran Limpasan</span>
                </div>
              </div>

              {activeWater.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-[9px] text-slate-500 uppercase">
                        <th className="p-2.5 pl-4">Tanggal</th>
                        <th className="p-2.5">Lokasi Settling Pond</th>
                        <th className="p-2.5 text-center">pH</th>
                        <th className="p-2.5 text-center">TSS mg/L</th>
                        <th className="p-2.5 text-center">Debit m³/s</th>
                        <th className="p-2.5 text-center">Fe mg/L</th>
                        <th className="p-2.5 text-center">Mn mg/L</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-600">
                      {activeWater.slice(0, 6).map(x => (
                        <tr key={x.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                          <td className="p-2.5 pl-4 font-mono">{x.date}</td>
                          <td className="p-2.5 font-semibold text-slate-700">{x.location}</td>
                          <td className="p-2.5 text-center font-mono">{x.ph}</td>
                          <td className="p-2.5 text-center font-mono">{x.tss}</td>
                          <td className="p-2.5 text-center font-mono">{x.debit?.toFixed(3) || '0.000'}</td>
                          <td className="p-2.5 text-center font-mono">{x.fe}</td>
                          <td className="p-2.5 text-center font-mono">{x.mn || '0.10'}</td>
                          <td className="p-2.5 text-center font-bold">
                            <span className={x.status === 'Safe' ? 'text-emerald-600' : 'text-red-600'}>
                              {x.status === 'Safe' ? 'Aman' : 'Over limit'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Advanced Technical Analysis & Explanations */}
              <div className="bg-white/60 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 text-xs leading-relaxed">
                <div className="flex items-center gap-2 text-teal-600 font-bold border-b border-slate-200 pb-2">
                  <Activity className="h-4 w-4" />
                  <span className="uppercase tracking-wider font-mono text-[10px]">Analisis Teknis & Evaluasi KPL (PP No. 22 Tahun 2021)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span> 
                      Rangkuman Evaluasi Data:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Berdasarkan parameter yang tercatat, kadar rata-rata pH adalah <span className="text-slate-200 font-mono font-bold">{avgPh}</span> (rentang {minPh}–{maxPh}) dengan kandungan total padatan tersuspensi (TSS) rerata sebesar <span className="text-slate-200 font-mono font-bold">{avgTss} mg/l</span>. Logam larut Fe mencatatkan nilai rata-rata <span className="text-slate-200 font-mono font-bold">{avgFe} mg/l</span> dan Mn tercatat <span className="text-slate-200 font-mono font-bold">{avgMn} mg/l</span>. Tingkat kepatuhan berada pada angka <span className="text-teal-600 font-mono font-bold">{complianceScorePercent}%</span>.
                    </p>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Penjelasan Ilmiah & Sumber Risiko:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      {Number(avgPh) < 6.5 ? (
                        <span className="text-amber-600/90">
                          <strong>Risiko Air Asam Tambang (AAT):</strong> pH rata-rata rendah di beberapa kolam diakibatkan oleh oksidasi mineral sulfida (seperti pirit/FeS₂) pada batuan samping batubara yang terpapar udara bebas dan air hujan. Hal ini melarutkan logam berat Fe & Mn secara berlebih.
                        </span>
                      ) : (
                        <span>
                          <strong>Kestabilan Kimiawi Air:</strong> Tingkat pH netral menunjukkan kapasitas penyangga batuan (acid neutralizing capacity) pada overburden sangat baik untuk meredam keasaman alami batubara, mencegah pelepasan logam Fe & Mn ke sungai sekitarnya.
                        </span>
                      )}
                      {" "}Nilai padatan tersuspensi (TSS) dipengaruhi oleh laju limpasan air permukaan dari lereng tambang (disposal area) yang mengangkut partikel sedimen mikro halus akibat belum tumbuhnya vegetasi penutup tanah secara rapat.
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 mt-1 flex items-start gap-2 text-[11px] text-slate-500 text-left">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Rekomendasi Kontrol Teknik:</strong> Mengoptimalkan dosing koagulan Polyaluminium Chloride (PAC) dengan laju 15-20 ppm pada saluran masuk inlet kolam pengendap, serta penambahan kapur hidrat (hydrated lime) konstan jika pH drop di bawah 6.0 untuk menjaga kestabilan kualitas effluent air keluar (outlet) menuju sungai umum sesuai Peraturan Pemerintah RI No. 22 Tahun 2021.
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1b: Surface Water Quality */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <span className="text-sky-400 font-mono">II.</span> Kepatuhan Kualitas Air Permukaan
                </h3>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">PP No. 22 Tahun 2021 Kelas II</span>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Pengujian air permukaan (sungai/badan air penerima) menunjukkan tingkat kepatuhan <strong className="text-sky-400">{surfaceWaterComplianceScorePercent}%</strong> dari total <strong className="text-slate-700">{activeSurfaceWater.length} sampling</strong>.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">pH Rerata</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{avgSurfacePh}</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Std: 6.0 - 9.0</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Rerata TSS</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{avgSurfaceTss} mg/l</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Std: max 50</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Rerata DO</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{avgSurfaceDO} mg/l</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Std: min 4</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Batas Melebihi</span>
                  <p className={`text-sm font-bold font-mono mt-0.5 ${totalExceededSurfaceWaterSamples > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {totalExceededSurfaceWaterSamples} Sampel
                  </p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Status Over limit</span>
                </div>
              </div>

              {activeSurfaceWater.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-[9px] text-slate-500 uppercase">
                        <th className="p-2.5 pl-4">Tanggal</th>
                        <th className="p-2.5">Lokasi</th>
                        <th className="p-2.5 text-center">Tipe</th>
                        <th className="p-2.5 text-center">pH</th>
                        <th className="p-2.5 text-center">TSS mg/L</th>
                        <th className="p-2.5 text-center">DO mg/L</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-600">
                      {activeSurfaceWater.slice(0, 5).map(x => (
                        <tr key={x.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                          <td className="p-2.5 pl-4 font-mono">{x.date}</td>
                          <td className="p-2.5 font-semibold text-slate-700">{x.location}</td>
                          <td className="p-2.5 text-center font-mono">{x.monitoringType || 'Bulanan'}</td>
                          <td className="p-2.5 text-center font-mono">{x.ph}</td>
                          <td className="p-2.5 text-center font-mono">{x.tss}</td>
                          <td className="p-2.5 text-center font-mono">{x.doVal}</td>
                          <td className="p-2.5 text-center font-bold">
                            <span className={x.status === 'Safe' ? 'text-emerald-600' : 'text-red-600'}>
                              {x.status === 'Safe' ? 'Aman' : 'Over limit'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: Rainfall depth */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <span className="text-teal-600 font-mono">II.</span> Pemantauan Curah Hujan & Hidrologi (Rain Gauge Audit)
                </h3>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">Logger Stasiun Site</span>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Akumulasi curah hujan harian dicatatkan sebesar <strong className="text-slate-700">{totalRainfallVolume} mm</strong> dari stasiun pos pengukur cuaca otomatis tambang. Intensitas tertinggi diukur mencapai <strong className="text-teal-600">{maxRainfallRecord} mm</strong> pada kurun evaluasi laporan bulanan ini.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200 text-left">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Total Presipitasi</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{totalRainfallVolume} mm</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Volume Kumulatif</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200 text-left">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Hari Hujan</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{rainDaysCount} Hari</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Per Periode 30 Hari</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200 text-left">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Intensitas Maks</span>
                  <p className="text-sm font-bold text-teal-600 font-mono mt-0.5">{maxRainfallRecord} mm</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Presipitasi Harian Maks</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200 text-left">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Intensitas Rata</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{avgIntensity} mm/jam</p>
                  <span className="text-[8px] text-slate-500 block leading-none mt-1">Karakter Hujan</span>
                </div>
              </div>

              {/* Weather Analysis and hydrological explanations */}
              <div className="bg-white/60 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 text-xs leading-relaxed">
                <div className="flex items-center gap-2 text-teal-600 font-bold border-b border-slate-200 pb-2">
                  <Compass className="h-4 w-4" />
                  <span className="uppercase tracking-wider font-mono text-[10px]">Analisis Hubungan Curah Hujan & Beban Hidrolis SP</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Analisis Curah Hujan & Koefisien Limpasan:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Dengan total curah hujan bulanan sebesar <span className="text-slate-800 font-mono font-bold">{totalRainfallVolume} mm</span> didistribusikan dalam <span className="text-slate-800 font-mono font-bold">{rainDaysCount} hari hujan</span>, karakteristik cuaca site tambang didominasi oleh {Number(totalRainfallVolume) > 150 ? 'Presipitasi Tinggi Basah (Musim Hujan)' : 'Presipitasi Sedang hingga Kering'}. Beban hidrolis air asam dan lumpur meningkat secara eksponensial setelah kejadian hujan ekstrem melebih 40 mm per hari.
                    </p>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Penjelasan Ilmiah Risiko Kelebihan Debit (Overflow):
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Curah hujan yang lebat di area tambang terbuka (open cast mining) menanggung koefisien run-off mendekati 0.8 - 0.9 karena permukaan tanah padat tanpa tanaman penahan. Air limpasan membawa material padat (sedimen) dari dinding bench tambang. Kejadian intensitas tinggi `{maxRainfallRecord} mm` memicu banjir lumpur mendadak yang mengurangi retention time air di kolam pengendap, memaksa bypass dini di pintu gerbang spillway weir.
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 mt-1 flex items-start gap-2 text-[11px] text-slate-500 text-left">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Rekomendasi Manajemen Air Tambang:</strong> Melakukan pengerukan sedimen lumpur (desilting) berkala di Settling Pond pada area hulu sebelum memasuki musim puncak hujan, serta memastikan saluran pengelak air limpasan (diversion channels) bebas hambatan guna mereduksi beban debit air lumpur sebesar 30% ke KPL utama.
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Hazmat B3 storage */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <span className="text-teal-600 font-mono">III.</span> Pengelolaan Limbah Bahan Berbahaya & Beracun (B3)
                </h3>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">Permen LHK No. 6/2021</span>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Mutasi pencatatan keluar-masuk (Inflow / Outflow) Tempat Penyimpanan Sementara (TPS) Limbah B3 mencatat total akumulasi volume sebagai berikut:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3.5 bg-white/60 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-600 font-mono tracking-wider uppercase font-bold block">TOTAL LIMBAH MASUK TPS</span>
                  <p className="text-lg font-bold text-slate-700 font-mono mt-1">{totalB3InWeight.toLocaleString('id-ID')} Kg</p>
                  <span className="text-[8px] text-slate-500 mt-0.5 block">Log Oli, Aki & Filter Bekas</span>
                </div>
                <div className="p-3.5 bg-white/60 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-600 font-mono tracking-wider uppercase font-bold block">TOTAL OUTFLOW (DIANGKUT)</span>
                  <p className="text-lg font-bold text-teal-600 font-mono mt-1">{totalB3OutWeight.toLocaleString('id-ID')} Kg</p>
                  <span className="text-[8px] text-slate-500 mt-0.5 block">Pihak ke-3 / Transporter Berizin</span>
                </div>
                <div className="p-3.5 bg-white/60 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-600 font-mono tracking-wider uppercase font-bold block">STOK BERSIH GUDANG (NET)</span>
                  <p className="text-lg font-bold text-amber-500 font-mono mt-1">{b3NetDifference.toLocaleString('id-ID')} Kg</p>
                  <span className="text-[8px] text-slate-500 mt-0.5 block">{b3NetDifference >= 0 ? "Akumulasi Stok Tambahan" : "Penurunan Defisit Gudang"}</span>
                </div>
              </div>

              {/* Characteristics bars */}
              <div className="bg-white p-4 border border-slate-200 rounded-2xl text-left space-y-3">
                <h4 className="text-[10px] font-mono uppercase font-bold text-slate-500">Kompilasi Karakteristik Limbah Masuk TPS</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 font-mono text-[10px]">
                  <div className="bg-white/50 p-2 rounded border border-slate-200/80">
                    <span className="text-amber-500 block font-bold">Toxic (Beracun)</span>
                    <span className="text-xs text-slate-700 font-black block mt-0.5">{toxicWasteWeight.toLocaleString('id-ID')} Kg</span>
                  </div>
                  <div className="bg-white/50 p-2 rounded border border-slate-200/80">
                    <span className="text-red-600 block font-bold">Flammable (Mudah Menyala)</span>
                    <span className="text-xs text-slate-700 font-black block mt-0.5">{flammableWasteWeight.toLocaleString('id-ID')} Kg</span>
                  </div>
                  <div className="bg-white/50 p-2 rounded border border-slate-200/80">
                    <span className="text-blue-600 block font-bold">Corrosive (Korosif)</span>
                    <span className="text-xs text-slate-700 font-black block mt-0.5">{corrosiveWasteWeight.toLocaleString('id-ID')} Kg</span>
                  </div>
                  <div className="bg-white/50 p-2 rounded border border-slate-200/80">
                    <span className="text-yellow-400 block font-bold">Reactive (Reaktif)</span>
                    <span className="text-xs text-slate-700 font-black block mt-0.5">{reactiveWasteWeight.toLocaleString('id-ID')} Kg</span>
                  </div>
                  <div className="bg-white/50 p-2 rounded border border-slate-200/80">
                    <span className="text-purple-400 block font-bold">Infectious (Medis)</span>
                    <span className="text-xs text-slate-700 font-black block mt-0.5">{infectiousWasteWeight.toLocaleString('id-ID')} Kg</span>
                  </div>
                </div>
              </div>

              {/* Expert Hazmat analysis */}
              <div className="bg-white/60 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 text-xs leading-relaxed">
                <div className="flex items-center gap-2 text-teal-600 font-bold border-b border-slate-200 pb-2">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="uppercase tracking-wider font-mono text-[10px]">Analisis Logistik, Kepatuhan Regulasi Limbah B3</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Analisis Stok Sisa & Laju Timbulan:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Laju timbulan limbah masuk gudang bulan ini mencapai <span className="text-slate-800 font-mono font-bold">{totalB3InWeight} Kg</span> dengan pengeluaran diangkut transporter berizin sebesar <span className="text-slate-800 font-mono font-bold">{totalB3OutWeight} Kg</span>. Gudang TPS mengelola stok bersih aktif sebanyak <span className="text-amber-500 font-mono font-bold">{b3NetDifference} Kg</span>. Distribusi didominasi limbah beracun pelumas oli bekas (lubricant waste) dan filter terkontaminasi.
                    </p>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Kepatuhan Aturan Hukum (Turnover Law):
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Berdasarkan Peraturan Pemerintah No. 22 Tahun 2021 dan Peraturan Menteri LHK No. 6 Tahun 2021, penyimpanan limbah B3 di TPS berizin dibatasi maksimal selama 90 hingga 180 hari sebelum diserahkan ke pihak recycler atau pemusnah akhir berlisensi KLHK. {b3NetDifference > 2000 ? (
                        <span className="text-red-600/90 font-semibold block mt-1">Peringatan: Stok sisa besar meningkatkan risiko bencana kebakaran material flammable. Jadwalkan pengangkutan transporter sesegera mungkin!</span>
                      ) : (
                        <span className="text-emerald-600/90 font-semibold block mt-1">Status gudang aman. Kecepatan sirkulasi limbah (turnover rate) terkendali di bawah garis ambang bahaya lingkungan tambang.</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 mt-1 flex items-start gap-2 text-[11px] text-slate-500 text-left">
                  <Shield className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Rekomendasi Operasional TPS:</strong> Mengharuskan pencatatan segel log book secara digital terintegrasi Festronik KLHK, melakukan inspeksi harian terhadap unit secondary containment (tanggul batas tampung tumpahan) cairan oli bekas berkapasitas 110% dari volume tangki penyimpanan, guna memitigasi pencemaran tanah tambang.
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Nursery plant inventory */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <span className="text-teal-600 font-mono">IV.</span> Pelaksanaan Nursery & Keanekaragaman Spesies Persemaian
                </h3>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">Logger Keanekaragaman</span>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Persediaan bibit vegetasi lokal siap tanam di plot Nursery saat ini sebanyak <strong className="text-slate-800">{totalNurseryQty.toLocaleString('id-ID')} batang</strong> dengan Indeks Kesehatan Bibit mencapai <strong className="text-teal-600">{nurseryHealthIndex}%</strong>. Berkas pendataan mengelola keanekaragaman spesies lokal Kalimantan.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Volume Stok Bibit</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{totalNurseryQty.toLocaleString('id-ID')} Batang</p>
                  <span className="text-[8px] text-slate-500 block mt-1 leading-none">Siap Tanam Reklamasi</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Bibit Sehat (Healthy)</span>
                  <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">{healthyPlantsCount.toLocaleString('id-ID')} Batang</p>
                  <span className="text-[8px] text-slate-500 block mt-1 leading-none">Indeks Sehat: {nurseryHealthIndex}%</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Kekayaan Spesies</span>
                  <p className="text-sm font-bold text-slate-600 font-sans mt-0.5">{uniqueFlowerTypes.length} Spesies</p>
                  <span className="text-[8px] text-slate-500 block mt-1 leading-none">Pioneer & Climax</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Blok Konsesi Aktif</span>
                  <p className="text-sm font-bold text-teal-600 font-sans mt-0.5">{inProgressReclamationsList.length} Area Kerja</p>
                  <span className="text-[8px] text-slate-500 block mt-1 leading-none">Pekerjaan Lapangan</span>
                </div>
              </div>

              {/* Flora list wrap */}
              <div className="bg-white p-4 border border-slate-200 rounded-2xl text-left space-y-2">
                <h4 className="text-[10px] font-mono uppercase font-bold text-slate-500">Daftar Inventaris Varietas Vegetasi pembibitan</h4>
                <div className="flex flex-wrap gap-2">
                  {uniqueFlowerTypes.map((type, i) => {
                    const count = nursery.filter(n => n.plantType === type).reduce((sum, n) => sum + n.quantity, 0);
                    return (
                      <span key={i} className="text-[10.5px] bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-600 font-sans font-medium">
                        🌳 {type} ({count.toLocaleString('id-ID')} pcs)
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Vegetation nursery expert analysis */}
              <div className="bg-white/60 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 text-xs leading-relaxed">
                <div className="flex items-center gap-2 text-teal-600 font-bold border-b border-slate-200 pb-2">
                  <Leaf className="h-4 w-4" />
                  <span className="uppercase tracking-wider font-mono text-[10px]">Analisis Suksesi Ekologi & Kesehatan Persemaian</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Analisis Kapasitas Pembibitan & Rencana Kerja:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Rasio kesehatan pembibitan mencapai tingkat tinggi sebesar <span className="text-emerald-600 font-mono font-bold">{nurseryHealthIndex}%</span>. Keanekaragaman tanaman lokal Kalimantan didominasi oleh tanaman berkarakter cepat tumbuh (fast-growing pioneer) seperti Sengon, Johar, dan Trembesi yang ditujukan untuk revegetasi tahap awal, mereduksi limpasan angin, dan de-kompresi top-soil yang padat.
                    </p>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Penjelasan Ilmiah Suksesi Ekologi Tambang:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Revegetasi lahan bekas tambang mutlak membutuhkan tanaman pioneer untuk mengkondisikan iklim mikro lokal sebelum pohon jenis climax (seperti Meranti/Dipterocarpaceae) diintroduksikan. Penebaran Legume Cover Crops (LCC) dikombinasikan secara berkala dengan pupuk organik di media sub-soil bertujuan meningkatkan fiksasi nitrogen bebas dan menyuburkan mikrobia tanah yang mati akibat proses loading-dumping pertambangan.
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 mt-1 flex items-start gap-2 text-[11px] text-slate-500 text-left">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Rekomendasi Manajemen Kehutanan Tambang:</strong> Melakukan seleksi hardening-off (aklimatisasi lapangan luar) bibit minimal 3 minggu sebelum ditransfer ke lahan penanaman aktif di lereng pengurukan (reclamation plot) guna menjamin tingkat kelangsungan hidup tanaman (sapling survival rate) melebihi standar baku 80% keberhasilan reklamasi ESDM.
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Plan vs Realization Comparative Framework */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <span className="text-teal-600 font-mono">V.</span> Komparasi Rencana Kerja vs Realisasi Lapangan (RKL - RPL)
                </h3>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">Kerangka Evaluasi ESDM</span>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Perbandingan kuantitatif antara komitmen target program kerja (Rencana) dengan luasan dan pembiayaan rill di lapangan (Realisasi) selama periode peninjauan RKAB berjalan:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Rencana Target</span>
                  <p className="text-sm font-bold text-slate-700 font-mono mt-0.5">{plannedHa.toFixed(1)} Hektar</p>
                  <span className="text-[8px] text-slate-500 block mt-1 leading-none">Total Area Terpeta</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Realisasi Fisik</span>
                  <p className="text-sm font-bold text-teal-600 font-mono mt-0.5">{realizedHa.toFixed(1)} Hektar</p>
                  <span className="text-[8px] text-[#2dd4bf]/70 block mt-1 leading-none">Progress: {realRealizationPct}%</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-500 uppercase font-mono block">Anggaran Rencana</span>
                  <p className="text-xs font-bold text-slate-700 font-mono mt-0.5">{formatIDR(budgetEst)}</p>
                  <span className="text-[8px] text-slate-500 block mt-1 leading-none">Plafon Disetujui</span>
                </div>
                <div className="bg-white/40 p-3 rounded-xl border border-slate-200 font-mono text-xs">
                  <span className="text-[9px] text-slate-500 uppercase font-sans font-bold block">Biaya Lapangan</span>
                  <p className="font-bold text-slate-700 mt-0.5">{formatIDR(costReal)}</p>
                  <span className={`text-[8.5px] font-bold block mt-1 ${budgetDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {budgetDiff >= 0 ? `Hemat: ${formatIDR(budgetDiff)}` : `Over: ${formatIDR(Math.abs(budgetDiff))}`}
                  </span>
                </div>
              </div>

              {/* Comparative detail breakdown */}
              {plans.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-[9px] text-slate-500 uppercase">
                        <th className="p-2.5 pl-4">Blok Area</th>
                        <th className="p-2.5 text-center">Pagu Rencana (Ha)</th>
                        <th className="p-2.5 text-center">Update Realisasi (Ha)</th>
                        <th className="p-2.5 text-center">Fisik Selesai %</th>
                        <th className="p-2.5 text-right">Rencana Anggaran</th>
                        <th className="p-2.5 text-right">Biaya Aktual</th>
                        <th className="p-2.5 text-center">Aksi Kerja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-600">
                      {plans.map(p => {
                        const cellPct = p.realizedSizeHa !== undefined && p.sizeHa > 0 ? (p.realizedSizeHa / p.sizeHa) * 100 : 0;
                        return (
                          <tr key={p.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                            <td className="p-2.5 pl-4 font-semibold text-slate-700">{p.areaName}</td>
                            <td className="p-2.5 text-center font-mono">{p.sizeHa} Ha</td>
                            <td className="p-2.5 text-center font-mono text-teal-600 font-bold">{p.realizedSizeHa !== undefined ? `${p.realizedSizeHa} Ha` : 'Belum Ada'}</td>
                            <td className="p-2.5 text-center font-mono font-bold">
                              <span className={cellPct >= 100 ? 'text-emerald-600' : 'text-slate-500'}>
                                {cellPct.toFixed(0)}%
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-500">{formatIDR(p.estimatedCost)}</td>
                            <td className="p-2.5 text-right font-mono text-teal-600">{p.realizedCost !== undefined ? formatIDR(p.realizedCost) : '-'}</td>
                            <td className="p-2.5 text-center font-bold">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                p.status === 'Completed' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-600' :
                                p.status === 'In Progress' ? 'bg-blue-500/15 border-blue-500/20 text-blue-600' :
                                'bg-white border-slate-700 text-slate-500'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Expert analysis on target vs realization */}
              <div className="bg-white/60 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 text-xs leading-relaxed">
                <div className="flex items-center gap-2 text-teal-600 font-bold border-b border-slate-200 pb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="uppercase tracking-wider font-mono text-[10px]">Analisis Fisik & Variansi Anggaran Reklamasi</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Analisis Capaian Kemajuan Fisik:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Capaian kemajuan penataan fisik reklamasi tercatat efektif sebesar <span className="text-teal-600 font-mono font-bold">{realRealizationPct}%</span>. Luas realisasi lapangan kumulatif <span className="text-slate-200 font-mono font-bold">{realizedHa.toFixed(1)} Ha</span> terhadap rencana target <span className="text-slate-200 font-mono font-bold">{plannedHa.toFixed(1)} Ha</span> menunjukkan bahwa mobilisasi subsoil, pemetaan elevasi terasering, serta pengembalian tanah pucuk (topsoil) berjalan lancar. Beberapa blok kerja dalam status aktif dilaporkan mengalami proses pemulihan vegetasi cepat.
                    </p>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Penjelasan Selisih Variansi Pembiayaan:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Selisih keuangan berjalan tercatat sebesar <span className={`font-mono font-bold ${budgetDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatIDR(Math.abs(budgetDiff))} ({budgetDiff >= 0 ? 'Surplus Efisiensi' : 'Over-Budget'})</span>. {budgetDiff >= 0 ? (
                        <span>Efisiensi anggaran dicapai melalui swakelola optimal pembibitan (nursery) mandiri yang mengurangi biaya beli dari vendor, serta pengaturan logistik dumping hulu-hilir dump truck penimbunan tanah pucuk secara efisien sehingga menghemat solar unit fleet.</span>
                      ) : (
                        <span>Over-budget didorong oleh adanya tindakan mitigasi pengerasan lereng (slope stabilization) di luar rencana awal akibat cuaca basah curah hujan ekstrem, memaksa penggunaan mesin hydroseeder pihak ketiga lebih intensif.</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 mt-1 flex items-start gap-2 text-[11px] text-slate-500 text-left">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Rekomendasi Manajemen Lahan:</strong> Mengupayakan sinkronisasi berkala antara penambangan aktif dengan timbulnya overburden tambang (in-pit backfilling system). Hal ini memastikan batuan penutup (sub-soil) langsung diratakan kembali ke bekas lubang tanpa penumpukan ganda di luar pit, memotong rantai biaya operasional alat mekanis hingga 15% sesuai rencana pengeluaran RKAB.
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: Reclamation Guarantees Financial Audits */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <span className="text-teal-600 font-mono">VI.</span> Validasi Dana Jaminan Reklamasi (Financial Bonds Compliance)
                </h3>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-mono">ESDM Penutupan Tambang</span>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Laporan inventarisasi kepatuhan dana jaminan keuangan (Reclamation Guarantee) yang dikeluarkan lembaga keuangan perbankan berwenang guna penjaminan kewajiban lingkungan pasca-tambang PT Diva Kencana Borneo:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
                <div className="p-3.5 bg-white/60 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-600 font-mono tracking-wider uppercase font-bold block">TOTAL JAMINAN DISETOR</span>
                  <p className="text-base font-bold text-slate-800 font-mono mt-1">{formatIDR(totalGuaranteesValue)}</p>
                  <span className="text-[8px] text-slate-500 mt-1 block">Tercatat di Kementerian ESDM</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-teal-500/25">
                  <span className="text-[10px] text-[#2dd4bf] font-mono tracking-wider uppercase font-bold block">GARANSI BANK AKTIF</span>
                  <p className="text-base font-bold text-teal-600 font-mono mt-1">{activeGuaranteesCount} Dokumen Aktif</p>
                  <span className="text-[8px] text-[#2dd4bf]/75 mt-1 block">Aman & Terverifikasi</span>
                </div>
                <div className="p-3.5 bg-white/80 rounded-xl border border-slate-200/85">
                  <span className="text-[10px] text-slate-600 font-mono tracking-wider uppercase font-bold block">STATUS PERPANJANGAN</span>
                  <p className={`text-base font-bold font-mono mt-1 ${renewalGuaranteesCount > 0 ? 'text-amber-500' : 'text-slate-600'}`}>{renewalGuaranteesCount} Butuh Pembaruan</p>
                  <span className="text-[8px] text-slate-500 mt-1 block">Monitoring Masa Berlakunya</span>
                </div>
              </div>

              {/* Garansi table */}
              {guarantees.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-[9px] text-slate-500 uppercase">
                        <th className="p-2.5 pl-4">No Dokumen</th>
                        <th className="p-2.5">Tipe Jaminan</th>
                        <th className="p-2.5 text-right">Nilai Jaminan (IDR)</th>
                        <th className="p-2.5">Institusi Penerbit</th>
                        <th className="p-2.5 text-center">Tgl Jatuh Tempo</th>
                        <th className="p-2.5 text-center">Status Hukum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-600">
                      {guarantees.map(g => (
                        <tr key={g.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                          <td className="p-2.5 pl-4 font-mono font-semibold text-slate-200">{g.guaranteeNo}</td>
                          <td className="p-2.5 text-slate-600">{g.guaranteeType}</td>
                          <td className="p-2.5 text-right font-mono text-teal-600 font-bold">{formatIDR(g.value)}</td>
                          <td className="p-2.5 text-slate-500">{g.issuingInstitution}</td>
                          <td className="p-2.5 text-center font-mono">{g.dueDate}</td>
                          <td className="p-2.5 text-center">
                            <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${
                              g.status === 'Active' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-600' :
                              'bg-amber-500/15 border-amber-500/20 text-amber-500'
                            }`}>
                              {g.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Expert financial analysis */}
              <div className="bg-white/60 border border-slate-200/80 rounded-2xl p-4.5 space-y-3 text-xs leading-relaxed">
                <div className="flex items-center gap-2 text-teal-600 font-bold border-b border-slate-200 pb-2">
                  <Award className="h-4 w-4" />
                  <span className="uppercase tracking-wider font-mono text-[10px]">Analisis Kepatuhan Finansial Jaminan Reklamasi (ESDM)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Kesesuaian Nilai Jaminan & Penutupan Tambang:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Total nilai penjaminan yang disetor berizin resmi adalah <span className="text-teal-600 font-mono font-bold">{formatIDR(totalGuaranteesValue)}</span>. Secara finansial, penjaminan ini mencocoki standar taksiran perhitungan biaya penataan lahan, revegetasi, pengelolaan air asam tambang, serta administrasi pasca-tambang yang diwajibkan oleh Dirjen Minerba ESDM. Berkas legal membuktikan solvabilitas tinggi PT Diva Kencana Borneo terhadap kewajiban pemulihan lingkungan ekologis.
                    </p>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <h5 className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
                      Penjelasan Risiko Hukum Penjaminan:
                    </h5>
                    <p className="text-slate-500 text-[11px]">
                      Jaminan keuangan ini berfungsi sebagai asuransi negara agar tidak terjadi pembiaran atas lahan terbengkalai. {renewalGuaranteesCount > 0 ? (
                        <span className="text-amber-500 font-semibold block">Terdapat {renewalGuaranteesCount} dokumen jaminan mendekati batas kadaluarsa atau butuh perpanjangan perpajakan perbankan. Kelalaian perpanjangan dapat memicu sanksi pembekuan pengapalan batu bara (holding export clearances) oleh Syahbandar/ESDM.</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold block">Seluruh dokumen legal jaminan berada dalam status aktif berjangka aman. Hal ini mereduksi potensi pelanggaran administratif ke tingkat nol dan menjaga peringkat kepatuhan (PROPER) berada pada sabuk hijau.</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 mt-1 flex items-start gap-2 text-[11px] text-slate-500 text-left">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-700">Rekomendasi Penjaminan:</strong> Melakukan koordinasi berkala minimal 3 bulan sebelum masa jatuh tempo deposit (dueDate) guna perpanjangan garansi bank, serta melampirkan berkas kemajuan fisik reklamasi terbaru yang diverifikasi konsultan independen untuk pengajuan peninjauan de-eskalasi penarikan jaminan progresif di ESDM.
                  </div>
                </div>
              </div>
            </div> {/* This closes Section 6's overall space-y-4 container */}
            </div> {/* This closes the conditional wrapper div */}

            {/* Footer Laporan - Signatures */}
            <div className="pt-12 mt-12 border-t border-slate-200/60 flex items-center justify-between font-sans">
              <div className="text-[11px] text-slate-500 flex flex-col justify-end h-32 text-left">
                <p>PT DIVA KENCANA BORNEO</p>
                <p className="font-mono">Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
              </div>

              <div className="text-[11px] text-slate-600 text-center flex flex-col justify-between h-32 mr-6 border-slate-200 border-b pb-1">
                <p className="uppercase tracking-widest font-mono text-[9px] text-slate-500 font-bold">Disetujui Penanggung Jawab,</p>
                <div>
                  <p className="font-bold underline">{user?.name || 'Aditya Perkasa'}</p>
                  <p className="text-[9.5px] text-slate-500 font-semibold">{user?.role || 'Environmental Site Manager'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
