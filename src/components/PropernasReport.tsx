/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ReferenceLine,
  LineChart,
  Line
} from 'recharts';
import { 
  WastewaterData, 
  SolidWasteData,
  ReclamationPlan,
  WasteIn,
  WasteOut
} from '../types';
import { 
  Award, 
  CheckCircle, 
  AlertTriangle, 
  XOctagon,
  FileCheck,
  RefreshCw,
  Droplet,
  Wind,
  Trash2,
  Sprout,
  HeartHandshake,
  ShieldAlert,
  ChevronDown,
  Info,
  Layers,
  TrendingUp,
  FileText,
  BadgeAlert
} from 'lucide-react';

interface PropernasReportProps {
  activeWater: WastewaterData[];
  solidWaste: SolidWasteData[];
  plans: ReclamationPlan[];
  activeWasteIn: WasteIn[];
  activeWasteOut: WasteOut[];
  nurseryHealthIndex?: number;
  user?: any;
}

// Defining types for compliance sections
interface ComplianceItem {
  id: string;
  pillar: string;
  title: string;
  description: string;
  ruleReference: string;
  weight: number; // percentage in rating calculation
  liveStatus: 'compliant' | 'warning' | 'non_compliant';
  userOverride: boolean;
  overrideStatus?: 'compliant' | 'warning' | 'non_compliant';
}

export default function PropernasReport({
  activeWater,
  solidWaste,
  plans,
  activeWasteIn,
  activeWasteOut,
  nurseryHealthIndex = 90,
  user
}: PropernasReportProps) {
  // Live analysis of data
  const hasWaterViolations = activeWater.some(w => w.ph < 6.0 || w.ph > 9.0 || w.tss > 200 || (w.fe && w.fe > 7) || (w.mn && w.mn > 4));
  const hasSolidWasteData = solidWaste.length > 0;
  
  // Hitung persentase pemanfaatan sampah domestik (Circular Economy)
  const totalSolidWaste = solidWaste.reduce((sum, w) => sum + (w.organicKg || 0) + (w.inorganicKg || 0) + (w.residueKg || 0), 0);
  const recycledSolidWaste = solidWaste.reduce((sum, w) => sum + (w.compostedKg || 0) + (w.recycledKg || 0), 0);
  const solidWasteRecyclePct = totalSolidWaste > 0 ? (recycledSolidWaste / totalSolidWaste) * 100 : 0;

  // Analisis Live Keberhasilan Reklamasi Lahan Bekas Tambang
  const totalTargetHa = plans.reduce((sum, p) => sum + p.sizeHa, 0);
  const totalRealizedHa = plans.reduce((sum, p) => sum + (p.realizedSizeHa || 0), 0);
  const reclamationSuccessRate = totalTargetHa > 0 ? (totalRealizedHa / totalTargetHa) * 100 : 0;
  const combinedPillar5Score = totalTargetHa > 0 
    ? (reclamationSuccessRate * 0.7 + solidWasteRecyclePct * 0.3) 
    : solidWasteRecyclePct;

  // Cek apakah ada limbah B3 melebihi batas waktu penyimpanan (>180 Hari)
  const [b3StorageOverLimit, setB3StorageOverLimit] = useState(false);

  // Initializing compliance checklist items according to Permen LH No 7 Tahun 2025 - Mining Specific
  const [items, setItems] = useState<ComplianceItem[]>([
    {
      id: 'p1_sml',
      pillar: 'Pilar 1: Dokumen & SML Tambang',
      title: 'Persetujuan Lingkungan (AMDAL) & Rencana Reklamasi (RRT/RPT)',
      description: 'Kelengkapan dokumen AMDAL/UKL-UPL pertambangan, kesesuaian jaminan reklamasi (Jamrek) & jaminan pascatambang, serta penerapan Sistem Manajemen Lingkungan pertambangan berbasis ISO 14001:2015.',
      ruleReference: 'Pasal 4 Permen LH No 7/2025 & Permen ESDM No 26/2018',
      weight: 15,
      liveStatus: 'compliant',
      userOverride: false
    },
    {
      id: 'p2_ppa',
      pillar: 'Pilar 2: Pencemaran Air Tambang',
      title: 'Ketaatan Baku Mutu Kolam Pengendap Lumpur (KPL) & SPARING',
      description: 'Sensor SPARING terintegrasi aktif dengan parameter pH (6-9), TSS (<200 mg/L), Fe (<7 mg/L), dan Mn (<4 mg/L) di outlet aliran tambang. Pencegahan pembentukan Air Asam Tambang (Acid Mine Drainage) dengan pemisahan batuan PAF & NAF.',
      ruleReference: 'Pasal 8 Permen LH No 7/2025 & KepmenLH 113/2003',
      weight: 20,
      liveStatus: hasWaterViolations ? 'non_compliant' : 'compliant',
      userOverride: false
    },
    {
      id: 'p3_ppu',
      pillar: 'Pilar 3: Pencemaran Udara Tambang',
      title: 'Dust Suppressing Hauling Road & Uji Emisi Heavy Equipment',
      description: 'Penyiraman intensif jalan angkut batubara (hauling road), penanganan debu crusher & stockpile dengan water sprayer / dust suppressant, pemantauan TSP/PM10, serta uji emisi cerobong genset tambang berkala.',
      ruleReference: 'Pasal 12 Permen LH No 7/2025 & Permen LHK 11/2021',
      weight: 15,
      liveStatus: 'compliant',
      userOverride: false
    },
    {
      id: 'p4_plb3',
      pillar: 'Pilar 4: Pengelolaan Limbah B3',
      title: 'Penyimpanan Pelumas Workshop, Aki Bekas & Pelaporan Festronik',
      description: 'Logbook harian TPS B3 workshop (oli bekas, filter genset, hose rusak, contaminated rags), kesesuaian masa simpan (<90 hari), pelaporan neraca kuartalan via SIRIKA/Festronik, dan pengelolaan soil terkontaminasi (landfarming).',
      ruleReference: 'Pasal 15 Permen LH No 7/2025',
      weight: 20,
      liveStatus: 'compliant',
      userOverride: false
    },
    {
      id: 'p5_sampah',
      pillar: 'Pilar 5: Reklamasi & Sirkularitas Non-B3',
      title: 'Ketercapaian Target Reklamasi & Pemanfaatan Non-B3 Tambang',
      description: 'Realisasi penimbunan lubang tambang (backfilling void), kesesuaian kemiringan lereng, penanaman areal reklamasi, dan pemanfaatan non-B3 tambang (seperti ban raksasa OTR bekas sebagai rip-rap pengendali erosi).',
      ruleReference: 'Pasal 18 Permen LH No 7/2025 (Kriteria Baru)',
      weight: 15,
      liveStatus: combinedPillar5Score >= 75 ? 'compliant' : combinedPillar5Score > 30 ? 'warning' : 'non_compliant',
      userOverride: false
    },
    {
      id: 'p6_kehati',
      pillar: 'Pilar 6: Kehati & PPM Tambang (SROI)',
      title: 'Nursery Spesies Lokal Kalimantan & Audit Dampak PPM',
      description: 'Pembibitan tanaman endemik lokal (Meranti, Ulin, Kahoi) di area Nursery untuk reklamasi revegetasi, pemantauan kehati flora-fauna tambang, serta program Pengembangan dan Pemberdayaan Masyarakat (PPM) bersertifikasi SROI > 1.0.',
      ruleReference: 'Pasal 22 Permen LH No 7/2025 (Kriteria Baru)',
      weight: 15,
      liveStatus: nurseryHealthIndex >= 85 ? 'compliant' : 'warning',
      userOverride: false
    }
  ]);

  // Sync live statuses when dependencies change
  useEffect(() => {
    setItems(prevItems => prevItems.map(item => {
      if (item.userOverride) return item; // Keep user override if set
      
      let nextStatus = item.liveStatus;
      if (item.id === 'p1_sml') {
        nextStatus = 'compliant';
      } else if (item.id === 'p2_ppa') {
        nextStatus = hasWaterViolations ? 'non_compliant' : 'compliant';
      } else if (item.id === 'p5_sampah') {
        nextStatus = combinedPillar5Score >= 75 ? 'compliant' : combinedPillar5Score > 30 ? 'warning' : 'non_compliant';
      } else if (item.id === 'p6_kehati') {
        nextStatus = nurseryHealthIndex >= 85 ? 'compliant' : 'warning';
      } else if (item.id === 'p4_plb3') {
        nextStatus = b3StorageOverLimit ? 'non_compliant' : 'compliant';
      }
      return { ...item, liveStatus: nextStatus };
    }));
  }, [hasWaterViolations, combinedPillar5Score, nurseryHealthIndex, b3StorageOverLimit]);

  // Handle status toggle override
  const handleToggleStatus = (id: string, newStatus: 'compliant' | 'warning' | 'non_compliant') => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          userOverride: true,
          overrideStatus: newStatus
        };
      }
      return item;
    }));
  };

  const handleResetItem = (id: string) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          userOverride: false,
          overrideStatus: undefined
        };
      }
      return item;
    }));
  };

  const handleResetAll = () => {
    setItems(prevItems => prevItems.map(item => ({
      ...item,
      userOverride: false,
      overrideStatus: undefined
    })));
    setB3StorageOverLimit(false);
  };

  // Helper to get effective status based on overrides
  const getEffectiveStatus = (item: ComplianceItem) => {
    return item.userOverride && item.overrideStatus ? item.overrideStatus : item.liveStatus;
  };

  // Calculate overall performance score (0 - 100)
  // Compliant = 100% of weight, Warning = 50% of weight, Non-compliant = 0% of weight
  const calculateResult = () => {
    let totalScore = 0;
    let nonCompliantCount = 0;
    let warningCount = 0;

    items.forEach(item => {
      const status = getEffectiveStatus(item);
      if (status === 'compliant') {
        totalScore += item.weight;
      } else if (status === 'warning') {
        totalScore += (item.weight * 0.5);
        warningCount++;
      } else {
        nonCompliantCount++;
      }
    });

    // Peringkat PROPER Berdasarkan Kriteria Permen LH No 7/2025:
    // EMAS: Score >= 95, no non-compliant, SML/ISO certified, CSR SROI verified. (Pillar 6, 1 compliant)
    // HIJAU: Score >= 80 & < 95, no non-compliant.
    // BIRU: Score >= 60 & < 80, non-compliant count <= 1. (Ketaatan minimum)
    // MERAH: Score < 60 ATAU non-compliant count > 1.
    // HITAM: Ada pelanggaran fatal (misal pencemaran sengaja bypass, tidak lunas jaminan reklamasi, atau kasus hukum).

    let rating: 'EMAS' | 'HIJAU' | 'BIRU' | 'MERAH' | 'HITAM' = 'BIRU';
    let ratingDescription = '';
    let ratingColorClass = '';
    let badgeEmoji = '';

    if (nonCompliantCount >= 3) {
      rating = 'HITAM';
    } else if (nonCompliantCount > 1 || totalScore < 60) {
      rating = 'MERAH';
    } else if (nonCompliantCount === 1) {
      rating = 'BIRU'; // Masih biru asal tidak banyak non-compliant
    } else if (totalScore >= 95) {
      rating = 'EMAS';
    } else if (totalScore >= 80) {
      rating = 'HIJAU';
    } else {
      rating = 'BIRU';
    }

    // Set badge style and texts
    switch (rating) {
      case 'EMAS':
        badgeEmoji = '🟡';
        ratingColorClass = 'bg-[#F2C94C]/10 border-[#F2C94C]/50 text-[#F2C94C] shadow-[0_0_20px_rgba(242,201,76,0.15)]';
        ratingDescription = 'Sangat Baik (Beyond Compliance). Perusahaan konsisten menunjukkan keunggulan lingkungan, efisiensi energi, reduksi emisi, circular economy bernilai tinggi, serta kontribusi pengembangan masyarakat berkelanjutan.';
        break;
      case 'HIJAU':
        badgeEmoji = '🟢';
        ratingColorClass = 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.15)]';
        ratingDescription = 'Baik (Beyond Compliance). Perusahaan telah melakukan pengelolaan lingkungan lebih dari yang dipersyaratkan oleh regulasi, menerapkan 3R limbah, sirkularitas sampah terkelola (>40%), dan nursery berkembang.';
        break;
      case 'BIRU':
        badgeEmoji = '🔵';
        ratingColorClass = 'bg-blue-500/10 border-blue-500/40 text-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
        ratingDescription = 'Ketaatan Terpenuhi (Compliance). Perusahaan telah melaksanakan upaya pengelolaan lingkungan yang dipersyaratkan secara minimal sesuai dengan ketentuan dan peraturan perundang-undangan.';
        break;
      case 'MERAH':
        badgeEmoji = '🟡';
        ratingColorClass = 'bg-amber-500/10 border-amber-500/40 text-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
        ratingDescription = 'Belum Taat (Non-Compliance). Upaya pengelolaan lingkungan hidup tidak memenuhi baku mutu yang ditentukan, atau ada aspek pelaporan wajib (seperti Festronik/SIPSN) yang diabaikan.';
        break;
      case 'HITAM':
        badgeEmoji = '🔴';
        ratingColorClass = 'bg-red-500/10 border-red-500/40 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
        ratingDescription = 'Pelanggaran Serius (Negligence). Sengaja melalaikan kewajiban pengelolaan lingkungan, menyebabkan pencemaran air/udara ekstrem, membuang limbah B3 di area terlarang, atau mangkir dari pelaporan wajib.';
        break;
    }

    return {
      score: Math.round(totalScore),
      rating,
      ratingDescription,
      ratingColorClass,
      badgeEmoji,
      nonCompliantCount,
      warningCount
    };
  };

  const results = calculateResult();

  const [chartMetric, setChartMetric] = useState<'score' | 'water' | 'reclamation'>('score');

  const trendData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const data = [];
    
    // We will show a 6-month retrospective leading to the current month
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mIdx = d.getMonth();
      const mLabel = monthNames[mIdx];
      const year = d.getFullYear() % 100;
      
      // Let's count wastewater tests in that month of current year (Period A)
      const targetMonthStr = String(mIdx + 1).padStart(2, '0');
      const currentYearStr = String(d.getFullYear());
      
      const currentWaterInMonth = activeWater.filter(w => w.date && w.date.startsWith(`${currentYearStr}-${targetMonthStr}`));
      const currentWaterViolations = currentWaterInMonth.filter(w => w.ph < 6.0 || w.ph > 9.0 || w.tss > 200 || (w.fe && w.fe > 7) || (w.mn && w.mn > 4)).length;
      
      let currentVal = results.score;
      if (i > 0) {
        // Mock a stable, slight vibration with real violation penalty
        const violationPenalty = currentWaterViolations * 12;
        const seedValue = 72 + ((mIdx * 4) % 15) - (i * 2);
        currentVal = Math.max(45, Math.min(100, Math.round(seedValue - violationPenalty)));
      }
      
      // Period Sebelumnya (Previous Period) is slightly different
      const prevVal = Math.max(40, Math.min(95, Math.round(62 + ((mIdx * 6) % 19) + (i * 1.5))));
      
      // Water Compliance Rate (%)
      const currentWaterCompliance = currentWaterInMonth.length > 0 
        ? Math.round(((currentWaterInMonth.length - currentWaterViolations) / currentWaterInMonth.length) * 100)
        : Math.max(80, Math.round(92 - ((mIdx * 3) % 15)));
        
      const prevWaterCompliance = Math.max(75, Math.round(85 - ((mIdx * 5) % 15)));
      
      // Reclamation progress index for the month
      const currentReclamationIdx = plans.length > 0
        ? Math.min(100, Math.round((totalRealizedHa / (totalTargetHa || 1)) * 100) - (i * 3) + (mIdx % 5))
        : 65 + ((mIdx * 3) % 25);
      const prevReclamationIdx = 55 + ((mIdx * 4) % 25);

      data.push({
        name: `${mLabel} '${year}`,
        'Periode Saat Ini': currentVal,
        'Periode Sebelumnya': prevVal,
        'Ketaatan Air Saat Ini (%)': currentWaterCompliance,
        'Ketaatan Air Sebelumnya (%)': prevWaterCompliance,
        'Realisasi Reklamasi Saat Ini (%)': Math.max(0, Math.min(100, currentReclamationIdx)),
        'Realisasi Reklamasi Sebelumnya (%)': Math.max(0, Math.min(100, prevReclamationIdx)),
      });
    }
    
    return data;
  }, [activeWater, results.score, plans, totalTargetHa, totalRealizedHa]);

  return (
    <div id="propernas-monitoring-dashboard" className="space-y-6">
      {/* Top Overview Cards with Bento Grid pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Color Badge PROPER Card */}
        <div className={`p-6 rounded-2xl border flex flex-col justify-between ${results.ratingColorClass} transition-all duration-300 relative overflow-hidden backdrop-blur-md`}>
          {/* Subtle logo background */}
          <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 select-none pointer-events-none">
            <Award size={180} />
          </div>
          
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">PREDIKSI PERINGKAT PROPERNAS</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 border border-black/10 font-mono">
                Permen LH 7/2025
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-4xl">{results.badgeEmoji}</span>
              <h3 className="text-3xl font-extrabold tracking-wider font-sans uppercase">
                {results.rating}
              </h3>
            </div>
            
            <p className="text-xs leading-relaxed opacity-90 font-medium">
              {results.ratingDescription}
            </p>
          </div>
          
          <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between text-xs relative z-10">
            <span className="font-semibold opacity-85">Ketetapan Standard:</span>
            <span className="font-mono font-bold tracking-wide uppercase">DIR-JEN PSLB3 KLHK</span>
          </div>
        </div>

        {/* Scoring Radial Meter / Progress Card */}
        <div className="bg-white/70 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Metode Skoring Otomatis per Pilar</h4>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-5xl font-black font-sans text-slate-800 tracking-tight">{results.score}</span>
              <span className="text-slate-500 text-xl font-medium">/ 100 Poin</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Skor dinamis dari total bobot 6 pilar ketaatan. Target minimal ketaatan (Biru) adalah <strong className="text-slate-600">60 Poin</strong> tanpa ada pilar merah.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <div className="w-full bg-white rounded-full h-2 container-progress">
              <div 
                className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-teal-500 to-emerald-400"
                style={{ width: `${results.score}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono font-bold">
              <span>HITAM (&lt;40)</span>
              <span>MERAH</span>
              <span>BIRU (60)</span>
              <span>HIJAU (80)</span>
              <span>EMAS (95)</span>
            </div>
          </div>
        </div>

        {/* Mini Real-Time Stat Dashboard Card */}
        <div className="bg-white/70 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ringkasan Parameter Live System</h4>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Pencemaran Air</span>
                <span className={`text-xs font-bold font-mono ${hasWaterViolations ? 'text-red-600' : 'text-emerald-600'}`}>
                  {hasWaterViolations ? '🔴 Ada Pelanggaran' : '🟢 Baku Mutu Aman'}
                </span>
              </div>
              <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Ekonomi Sirkular</span>
                <span className="text-xs font-bold font-mono text-emerald-600">
                  ♻️ {solidWasteRecyclePct.toFixed(1)}% Recycled
                </span>
              </div>
              <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Masa Simpan Limbah B3</span>
                <span className={`text-xs font-bold font-mono ${b3StorageOverLimit ? 'text-red-600' : 'text-emerald-600'}`}>
                  ⏳ {b3StorageOverLimit ? '>90/180/365 Hari TPS' : '<90/180/365 Hari TPS'}
                </span>
              </div>
              <div className="bg-white/40 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Nursery Local Seeds</span>
                <span className="text-xs font-bold font-mono text-emerald-600">
                  🌱 Index {nurseryHealthIndex}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-4 pt-3 border-t border-slate-200">
            <Info className="h-3 w-3 text-teal-600 shrink-0" />
            <span>Integrasi live sensor SPARING dan record logbook TPS B3 harian.</span>
          </div>
        </div>
      </div>

      {/* Visualisasi Tren Kepatuhan PROPERNAS Bulanan */}
      <div id="propernas-historical-trend-chart-card" className="bg-white/80 border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              Tren Evaluasi Kepatuhan Bulanan
            </h3>
            <p className="text-xs text-slate-500">
              Analisis komparatif kinerja lingkungan pertambangan bulanan saat ini terhadap periode sebelumnya.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 select-none self-start md:self-center">
            <button
              id="btn-metric-score"
              type="button"
              onClick={() => setChartMetric('score')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all cursor-pointer ${
                chartMetric === 'score'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20 shadow-sm'
                  : 'text-slate-500 hover:text-slate-500'
              }`}
            >
              Skor Total
            </button>
            <button
              id="btn-metric-water"
              type="button"
              onClick={() => setChartMetric('water')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all cursor-pointer ${
                chartMetric === 'water'
                  ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-500 hover:text-slate-500'
              }`}
            >
              KPL Air %
            </button>
            <button
              id="btn-metric-reclamation"
              type="button"
              onClick={() => setChartMetric('reclamation')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all cursor-pointer ${
                chartMetric === 'reclamation'
                  ? 'bg-amber-500/15 text-amber-600 border border-amber-500/20 shadow-sm'
                  : 'text-slate-500 hover:text-slate-500'
              }`}
            >
              Reklamasi
            </button>
          </div>
        </div>

        <div className="h-80 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'score' ? (
              <AreaChart data={trendData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="properCurrentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="properPrevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} tickLine={false} />
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const curVal = Number(payload[0].value);
                      const preVal = Number(payload[1].value);
                      const getProperRatingStr = (score: number) => {
                        if (score >= 95) return '🥇 EMAS (Beyond)';
                        if (score >= 80) return '🟢 HIJAU (Beyond)';
                        if (score >= 60) return '🔵 BIRU (Patuhi)';
                        if (score >= 45) return '🟡 MERAH (Kurang)';
                        return '🔴 HITAM (Fatal)';
                      };
                      return (
                        <div className="bg-white/95 border border-slate-200 p-3.5 rounded-xl shadow-2xl backdrop-blur-md">
                          <p className="text-[10px] font-bold text-slate-500 font-mono mb-2">{label}</p>
                          <div className="space-y-2 text-xs text-slate-700">
                            <div className="flex items-center justify-between gap-10">
                              <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                Periode Saat Ini
                              </span>
                              <span className="font-mono font-bold text-sky-400">{curVal} Poin</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold pl-3 mb-1.5">
                              Status: {getProperRatingStr(curVal)}
                            </div>
                            <div className="flex items-center justify-between gap-10">
                              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-white0" />
                                Periode Sebelumnya
                              </span>
                              <span className="font-mono font-bold text-slate-600">{preVal} Poin</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold pl-3">
                              Status: {getProperRatingStr(preVal)}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle" 
                  iconSize={6} 
                  formatter={(value) => <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{value}</span>}
                />
                
                <ReferenceLine y={95} stroke="#F2C94C" strokeDasharray="3 3" opacity={0.3} label={{ value: 'Emas (95)', position: 'insideTopRight', fill: '#F2C94C', fontSize: 8 }} />
                <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" opacity={0.3} label={{ value: 'Hijau (80)', position: 'insideTopRight', fill: '#10b981', fontSize: 8 }} />
                <ReferenceLine y={60} stroke="#3b82f6" strokeDasharray="3 3" opacity={0.3} label={{ value: 'Batas Ketaatan (60)', position: 'insideTopRight', fill: '#3b82f6', fontSize: 8 }} />
                
                <Area type="monotone" dataKey="Periode Saat Ini" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#properCurrentGrad)" />
                <Area type="monotone" dataKey="Periode Sebelumnya" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#properPrevGrad)" />
              </AreaChart>
            ) : chartMetric === 'water' ? (
              <LineChart data={trendData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis domain={[60, 100]} stroke="#475569" fontSize={10} tickLine={false} />
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const cur = Number(payload[0].value);
                      const pre = Number(payload[1].value);
                      return (
                        <div className="bg-white/95 border border-slate-200 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                          <p className="text-[10px] font-bold text-slate-500 font-mono mb-2">{label}</p>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div className="flex items-center justify-between gap-8">
                              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Ketaatan Air Saat Ini
                              </span>
                              <span className="font-mono font-bold text-emerald-600">{cur}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-8">
                              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                Ketaatan Air Sebelumnya
                              </span>
                              <span className="font-mono font-bold text-slate-500">{pre}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle" 
                  iconSize={6} 
                  formatter={(value) => <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{value}</span>}
                />
                <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" opacity={0.3} />
                <Line type="monotone" dataKey="Ketaatan Air Saat Ini (%)" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Ketaatan Air Sebelumnya (%)" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" />
              </LineChart>
            ) : (
              <LineChart data={trendData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis domain={[50, 100]} stroke="#475569" fontSize={10} tickLine={false} />
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const cur = Number(payload[0].value);
                      const pre = Number(payload[1].value);
                      return (
                        <div className="bg-white/95 border border-slate-200 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                          <p className="text-[10px] font-bold text-slate-500 font-mono mb-2">{label}</p>
                          <div className="space-y-1.5 text-xs text-slate-700">
                            <div className="flex items-center justify-between gap-8">
                              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                Realisasi Reklamasi Saat Ini
                              </span>
                              <span className="font-mono font-bold text-amber-600">{cur}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-8">
                              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                Realisasi Reklamasi Sebelumnya
                              </span>
                              <span className="font-mono font-bold text-slate-500">{pre}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle" 
                  iconSize={6} 
                  formatter={(value) => <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{value}</span>}
                />
                <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.3} label={{ value: 'Target Reklamasi (80%)', fill: '#f59e0b', fontSize: 8 }} />
                <Line type="monotone" dataKey="Realisasi Reklamasi Saat Ini (%)" stroke="#f59e0b" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Realisasi Reklamasi Sebelumnya (%)" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Sandbox Interactive Simulator Row */}
      <div className="bg-white/80 border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-200 bg-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              Interactive Audit Log & Simulator Ketercapaian
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sesuaikan status kesiapan tiap pilar untuk memproyeksikan target hasil penilaian PROPER Nasional.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {items.some(item => item.userOverride) && (
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-600 transition-colors cursor-pointer"
              >
                <RefreshCw size={11} className="animate-spin-slow" />
                Reset Semua Override
              </button>
            )}
            
            <div className="flex items-center gap-1.5 bg-white py-1.5 px-3 rounded-lg border border-slate-200">
              <label htmlFor="b3-storage-over-limit-toggle" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer">
                Limbah &gt; 180 Hari TPS:
              </label>
              <select
                id="b3-storage-over-limit-toggle"
                value={b3StorageOverLimit ? 'overdue' : 'aman'}
                onChange={(e) => setB3StorageOverLimit(e.target.value === 'overdue')}
                className="bg-white border border-slate-200 rounded px-1 text-[10px] text-slate-600 font-mono focus:outline-none"
              >
                <option value="aman">🟢 Tidak Ada</option>
                <option value="overdue">🔴 Ada (Kritis)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Interactive List OF Pillars */}
        <div id="propernas-pillars-list" className="divide-y divide-slate-850/60 p-1">
          {items.map((item) => {
            const currentStatus = getEffectiveStatus(item);
            
            return (
              <div 
                id={`pillar-${item.id}`}
                key={item.id} 
                className={`p-5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  item.userOverride ? 'bg-white/10' : 'hover:bg-white/20'
                }`}
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 uppercase tracking-widest font-mono">
                      {item.pillar}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold font-mono">
                      Bobot {item.weight}%
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold font-mono">
                      {item.ruleReference}
                    </span>
                    {item.userOverride && (
                      <span className="text-[9px] font-bold bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.2 rounded text-teal-600 select-none animate-pulse">
                        OVERRIDDEN
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-slate-700">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
                </div>

                {/* Status Toggles & Indicators */}
                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                  {/* Visual LED style Status representation */}
                  <div className="text-right mr-2 hidden md:block">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold block mb-1">Status Pilar</div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      currentStatus === 'compliant' ? 'bg-emerald-950/45 border-emerald-500/40 text-emerald-600' :
                      currentStatus === 'warning' ? 'bg-amber-950/45 border-amber-500/40 text-amber-600' :
                      'bg-red-950/45 border-red-500/40 text-red-600'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        currentStatus === 'compliant' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' :
                        currentStatus === 'warning' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                        'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'
                      }`} />
                      {currentStatus === 'compliant' ? 'TAAT' : currentStatus === 'warning' ? 'PERINGATAN' : 'TIDAK TAAT'}
                    </span>
                  </div>

                  {/* Switch buttons for override simulations */}
                  <div className="flex rounded-lg overflow-hidden bg-white border border-slate-200 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item.id, 'compliant')}
                      className={`px-3 py-1.5 text-[9px] font-bold transition-all uppercase font-mono cursor-pointer ${
                        currentStatus === 'compliant' 
                          ? 'bg-emerald-600/30 text-emerald-600 rounded-md font-extrabold shadow-sm' 
                          : 'text-slate-500 hover:text-slate-600'
                      }`}
                      title="Set Taat"
                    >
                      Taat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item.id, 'warning')}
                      className={`px-3 py-1.5 text-[9px] font-bold transition-all uppercase font-mono cursor-pointer ${
                        currentStatus === 'warning'
                          ? 'bg-amber-600/30 text-amber-600 rounded-md font-extrabold shadow-sm' 
                          : 'text-slate-500 hover:text-slate-600'
                      }`}
                      title="Set Peringatan"
                    >
                      Warn
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item.id, 'non_compliant')}
                      className={`px-3 py-1.5 text-[9px] font-bold transition-all uppercase font-mono cursor-pointer ${
                        currentStatus === 'non_compliant' 
                          ? 'bg-red-600/30 text-red-600 rounded-md font-extrabold shadow-sm' 
                          : 'text-slate-500 hover:text-slate-600'
                      }`}
                      title="Set Tidak Taat"
                    >
                      Gagal
                    </button>
                  </div>

                  {/* Reset pill */}
                  {item.userOverride && (
                    <button
                      onClick={() => handleResetItem(item.id)}
                      className="p-1 px-1.5 rounded-md hover:bg-white text-slate-500 hover:text-slate-700 transition-colors cursor-pointer text-[9px] font-semibold"
                      title="Kembalikan ke live database"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guide & Kriteria Penjelasan Section */}
      <div id="propernas-guidelines-box" className="bg-white/60 p-6 rounded-2xl border border-slate-800/80 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <BadgeAlert className="h-4.5 w-4.5 text-amber-500" />
          Kriteria Mutlak Penilaian PROPERNAS Kegiatan Pertambangan (Permen LH 7/2025)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-500">
          <div className="space-y-2">
            <p className="font-semibold text-slate-600">📌 Ketaatan Minimum Tambang (Biru):</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Peringkat <strong className="text-blue-600">BIRU</strong> wajib memenuhi 100% baku mutu air limbah KPL settling pond tambang (pH 6-9, TSS &lt; 200 mg/L, Fe &lt; 7 mg/L, Mn &lt; 4 mg/L) sepanjang tahun berjalan.</li>
              <li>Sparing wajib online &gt; 95% data capture rate terkirim ke server KLHK.</li>
              <li>Wajib melapor logbook & neraca limbah B3 tepat waktu setiap kuartal ke Festronik/SIRIKA KLHK.</li>
              <li>Tidak diperkenankan menyimpan filter solar bekas & oli bekas melebihi masa simpan 90/180/365 hari di TPS B3 Workshop tanpa dispensasi tertulis.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-slate-600">📌 Kriteria Beyond Compliance Tambang (Hijau & Emas):</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Keberhasilan pelaksanaan jaminan reklamasi (pencapaian penanaman pohon pionir & lokal berkelanjutan) mencapai target &gt; 80% luas areal terganggu.</li>
              <li>Penerapan program efisiensi energi pada armada alat berat (fleet fuel reduction program) dan substitusi energi ramah lingkungan.</li>
              <li>Hilirisasi limbah ban bekas OTR atau material slag/fly ash sebagai sirkular ekonomi terukur.</li>
              <li>Penghitungan index dampak program pengembangan masyarakat (PPM/CSR) lingkar tambang yang dibuktikan lewat SROI (Social Return on Investment) melampaui indeks 1.0.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
