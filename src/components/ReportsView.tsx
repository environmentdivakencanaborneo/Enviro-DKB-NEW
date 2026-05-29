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
  WasteOut 
} from '../types';
import { 
  FileText, 
  Printer, 
  ArrowLeft, 
  Compass, 
  CalendarDays, 
  TrendingUp, 
  Info,
  Award
} from 'lucide-react';

interface ReportsViewProps {
  wastewater: WastewaterData[];
  rainfall: RainfallData[];
  nursery: NurseryData[];
  plans: ReclamationPlan[];
  wasteIn: WasteIn[];
  wasteOut: WasteOut[];
  user: any;
}

export default function ReportsView({
  wastewater,
  rainfall,
  nursery,
  plans,
  wasteIn,
  wasteOut,
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
  const activeRain = rainfall.filter(x => new Date(x.date) >= filteredDateThreshold);
  const activeWasteIn = wasteIn.filter(x => new Date(x.dateIn) >= filteredDateThreshold);
  const activeWasteOut = wasteOut.filter(x => new Date(x.dateOut) >= filteredDateThreshold);

  // Calculated stats
  const avgPh = activeWater.length > 0 
    ? (activeWater.reduce((sum, x) => sum + x.ph, 0) / activeWater.length).toFixed(1)
    : '7.0';
  const maxPh = activeWater.length > 0 
    ? Math.max(...activeWater.map(x => x.ph)).toFixed(1)
    : '7.0';
  const minPh = activeWater.length > 0 
    ? Math.min(...activeWater.map(x => x.ph)).toFixed(1)
    : '7.0';

  const totalRainfallVolume = activeRain.reduce((sum, x) => sum + x.rainfall, 0).toFixed(1);
  const maxRainfallRecord = activeRain.length > 0 
    ? Math.max(...activeRain.map(x => x.rainfall)).toFixed(1)
    : '0.0';

  const totalNurseryQty = nursery.reduce((sum, x) => sum + x.quantity, 0);
  const inProgressReclamationsList = plans.filter(x => x.status === 'In Progress');

  const totalB3InWeight = activeWasteIn.reduce((sum, x) => sum + x.weightKg, 0);
  const totalB3OutWeight = activeWasteOut.reduce((sum, x) => sum + x.weightKg, 0);

  const totalExceededWaterSamples = activeWater.filter(x => x.status === 'Exceeded').length;
  const complianceScorePercent = activeWater.length > 0 
    ? Math.round(((activeWater.length - totalExceededWaterSamples) / activeWater.length) * 100)
    : 100;

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
    <div id="reports-view-wrapper" className="space-y-6 text-slate-200 text-left">
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
          
          .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-400, .text-white {
            color: #111827 !important;
          }

          .text-slate-500, .text-slate-450 {
            color: #4b5563 !important;
          }

          .bg-slate-900, .bg-[#111726], .bg-slate-900\\/40, .bg-slate-900\\/60 {
            background-color: #f3f4f6 !important;
            border-color: #e5e7eb !important;
          }

          .border-slate-800, .border-slate-850, .border-slate-700 {
            border-color: #d1d5db !important;
          }
        }
      `}</style>

      {!isPreview ? (
        <div id="reports-setup-tab" className="space-y-6 animate-fade-in">
          {/* Main selection card */}
          <div className="bg-[#111726]/80 p-6 border border-slate-800 rounded-2xl max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
              <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">Config Laporan Lingkungan Tambang</h3>
                <p className="text-xs text-slate-500 mt-0.5">Analisa otomatis parameter baku mutu sesuai PP 22/2021</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Pilih Jangka Waktu Laporan</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  id="report-select-weekly"
                  onClick={() => setReportType('weekly')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-28 cursor-pointer ${
                    reportType === 'weekly' 
                      ? 'border-teal-500 bg-teal-500/5 text-teal-400' 
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs uppercase font-bold tracking-widest font-mono">Laporan Mingguan</span>
                  <p className="text-[11px] text-slate-500 font-sans font-medium">Melakukan kompilasi ringkasan data dari 7 hari terakhir.</p>
                </button>

                <button
                  id="report-select-monthly"
                  onClick={() => setReportType('monthly')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-28 cursor-pointer ${
                    reportType === 'monthly' 
                      ? 'border-teal-500 bg-teal-500/5 text-teal-400' 
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs uppercase font-bold tracking-widest font-mono">Laporan Bulanan</span>
                  <p className="text-[11px] text-slate-500 font-sans font-medium">Melakukan kompilasi tren komparatif dari 30 hari terakhir.</p>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 p-4.5 rounded-xl border border-slate-850 flex items-start gap-3.5 text-xs text-slate-400">
              <Info className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-200">Kompilasi Otomatis (Automatic Evaluator)</p>
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
          <div id="reports-toolbar-buttons" className="flex items-center justify-between bg-slate-900/60 p-4 border border-slate-800 rounded-2xl">
            <button
              id="reports-back-btn"
              onClick={() => setIsPreview(false)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold hover:bg-slate-800 rounded-xl text-slate-300 transition-colors cursor-pointer"
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

          <div id="print-reminder-banner" className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-400">
            <Info className="h-4 w-4 text-amber-500" />
            <span>Format cetak dioptimalkan untuk ukuran kertas **A4 Portrait**. Gunakan opsi **Save as PDF** di browser Anda.</span>
          </div>

          {/* Real styled A4 Container */}
          <div 
            id="print-document-container"
            className="bg-[#0f1424] border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl max-w-4xl mx-auto font-sans text-left space-y-8"
          >
            {/* Header Laporan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 bg-slate-900 border border-slate-800 flex items-center justify-center text-lg font-bold text-amber-400 rounded-xl">
                  DKB
                </div>
                <div>
                  <h1 className="text-md font-bold text-slate-100 uppercase tracking-wide">{user?.company || 'PT DIVA KENCANA BORNEO'}</h1>
                  <p className="text-[10px] text-slate-500 font-mono">SITE INDONESIA COAL MINING OPERATIONS</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold text-teal-400 uppercase tracking-wider">
                  {reportType === 'weekly' ? 'LAPORAN MINGGUAN LINGKUNGAN' : 'LAPORAN BULANAN LINGKUNGAN'}
                </h2>
                <p className="text-[10px] text-slate-450 mt-1 font-mono font-semibold">{getPeriodLabel()}</p>
              </div>
            </div>

            {/* Section 1: Water Quality Compliance */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 pb-1.5 border-b border-slate-800/80"> I. Kepatuhan Kualitas Air Limbah (Sedimentation/KPL)</h3>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Kompilasi pengujian laboratorium internal menunjukkan tingkat kelulusan Parameter Mutu Air Limpasan Tambang sebesar <strong className="text-teal-400">{complianceScorePercent}%</strong> dari total <strong className="text-slate-200">{activeWater.length} sampling pengujian</strong> selama periode berjalan.
              </p>

              {/* Stats tables or boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-mono">Kemasan pH</span>
                  <p className="text-sm font-bold text-slate-200 font-mono mt-0.5">{minPh} - {maxPh}</p>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-mono">Rata pH</span>
                  <p className="text-sm font-bold text-slate-200 font-mono mt-0.5">{avgPh}</p>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-mono">Batas Melebihi</span>
                  <p className={`text-sm font-bold font-mono mt-0.5 ${totalExceededWaterSamples > 0 ? 'text-red-400' : 'text-slate-200'}`}>
                    {totalExceededWaterSamples} Record
                  </p>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-mono">Baku Mutu Acuan</span>
                  <p className="text-xs font-bold text-slate-200 font-sans mt-0.5">Permen LHK 113/2003</p>
                </div>
              </div>

              {activeWater.length > 0 && (
                <div className="bg-slate-950/40 border border-slate-850 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-850 text-[9px] text-slate-500 uppercase">
                        <th className="p-2.5 pl-4">Tanggal</th>
                        <th className="p-2.5">Lokasi Settling Pond</th>
                        <th className="p-2.5 text-center">pH</th>
                        <th className="p-2.5 text-center">TSS mg/L</th>
                        <th className="p-2.5 text-center">Debit m³/s</th>
                        <th className="p-2.5 text-center">Fe mg/L</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {activeWater.slice(0, 5).map(x => (
                        <tr key={x.id}>
                          <td className="p-2.5 pl-4 font-mono">{x.date}</td>
                          <td className="p-2.5 font-semibold text-slate-200">{x.location}</td>
                          <td className="p-2.5 text-center font-mono">{x.ph}</td>
                          <td className="p-2.5 text-center font-mono">{x.tss}</td>
                          <td className="p-2.5 text-center font-mono">{x.debit?.toFixed(3) || '0.000'}</td>
                          <td className="p-2.5 text-center font-mono">{x.fe}</td>
                          <td className="p-2.5 text-center font-bold">
                            <span className={x.status === 'Safe' ? 'text-emerald-400' : 'text-red-400'}>
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 pb-1.5 border-b border-slate-800/80"> II. Pemantauan Nilai Curah Hujan (Rain Gauge Audit)</h3>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Akumulasi curah hujan harian dicatatkan sebesar <strong className="text-slate-200">{totalRainfallVolume} mm</strong> dari pos pengukur cuaca tambang. Intensitas pengamatan tertinggi diukur mencapai <strong className="text-teal-400">{maxRainfallRecord} mm</strong> pada kurun evaluasi laporan ini.
              </p>
            </div>

            {/* Section 3: Hazmat B3 storage */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 pb-1.5 border-b border-slate-800/80"> III. Pengolahan Limbah Bahan Berbahaya & Beracun (B3)</h3>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Mutasi keluar-masuk (Inflow / Outflow) TPS batubara mencatat akumulasi volume limbah B3 sebagai berikut:
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase font-bold block">TOTAL OIL & ACCU MASUK</span>
                  <p className="text-xl font-bold text-slate-250 font-mono mt-1">{totalB3InWeight} Kg</p>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase font-bold block">TOTAL DIANGKUT TRANSPORTER</span>
                  <p className="text-xl font-bold text-slate-250 font-mono mt-1">{totalB3OutWeight} Kg</p>
                </div>
              </div>
            </div>

            {/* Section 4: Nursery plant inventory */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 pb-1.5 border-b border-slate-800/80"> IV. Pelaksanaan Nursery & Rencana Kerja Reklamasi</h3>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Persediaan bibit vegetasi lokal siap tanam di plot Nursery saat ini sebanyak <strong className="text-slate-100">{totalNurseryQty.toLocaleString('id-ID')} batang</strong>. Sejumlah <strong className="text-teal-400">{inProgressReclamationsList.length} area konsesi</strong> aktif melaksanakan terasering penataan top-soil lingkungan luar.
              </p>
            </div>

            {/* Footer Laporan - Signatures */}
            <div className="pt-12 mt-12 border-t border-slate-800/60 flex items-center justify-between font-sans">
              <div className="text-[11px] text-slate-500 flex flex-col justify-end h-32 text-left">
                <p>PT DIVA KENCANA BORNEO</p>
                <p className="font-mono">Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
              </div>

              <div className="text-[11px] text-slate-300 text-center flex flex-col justify-between h-32 mr-6 border-slate-800 border-b pb-1">
                <p className="uppercase tracking-widest font-mono text-[9px] text-slate-400 font-bold">Disetujui Penanggung Jawab,</p>
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
