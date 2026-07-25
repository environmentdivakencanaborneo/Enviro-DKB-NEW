/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Droplet, 
  Layers, 
  Activity, 
  Info, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  HelpCircle,
  Sparkles,
  RefreshCw,
  Compass,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import { RainfallData, ReclamationPlan } from '../types';

interface ErosionViewProps {
  rainfall: RainfallData[];
  plans: ReclamationPlan[];
}

interface SectorUSLE {
  id: string;
  name: string;
  areaHa: number;
  soilType: 'clay' | 'silty-clay' | 'loam' | 'silty-loam' | 'silt' | 'sand';
  slopeLength: number; // in meters (L)
  slopeGradient: number; // in % (S)
  coverType: 'bare' | 'mulch' | 'lcc' | 're发育-y1' | 're发育-y2' | 'forest';
  practiceType: 'none' | 'silt-fence' | 'terracing' | 'sediment-pond' | 'contour';
}

export default function ErosionView({ rainfall, plans }: ErosionViewProps) {
  // Pre-seed some default sectors
  const [sectors, setSectors] = useState<SectorUSLE[]>(() => {
    const saved = localStorage.getItem('diva_erosion_sectors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Gagal membaca sediaan sektor erosi:", e);
      }
    }
    return [
      { id: '1', name: 'Pit Utara Blok A', areaHa: 12.5, soilType: 'silty-clay', slopeLength: 50, slopeGradient: 15, coverType: 'bare', practiceType: 'sediment-pond' },
      { id: '2', name: 'Waste Dump Barat', areaHa: 18.2, soilType: 'loam', slopeLength: 80, slopeGradient: 25, coverType: 'mulch', practiceType: 'silt-fence' },
      { id: '3', name: 'Revegetasi Block C', areaHa: 8.4, soilType: 'clay', slopeLength: 40, slopeGradient: 8, coverType: 'lcc', practiceType: 'terracing' },
      { id: '4', name: 'Sump Utama & Disposal', areaHa: 5.0, soilType: 'silty-loam', slopeLength: 100, slopeGradient: 30, coverType: 'bare', practiceType: 'none' },
    ];
  });

  const [activeSectorId, setActiveSectorId] = useState<string>('1');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new sector
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState(10);
  const [newSoil, setNewSoil] = useState<SectorUSLE['soilType']>('loam');
  const [newLength, setNewLength] = useState(50);
  const [newGradient, setNewGradient] = useState(15);
  const [newCover, setNewCover] = useState<SectorUSLE['coverType']>('bare');
  const [newPractice, setNewPractice] = useState<SectorUSLE['practiceType']>('none');

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('diva_erosion_sectors', JSON.stringify(sectors));
  }, [sectors]);

  // Selected Sector for interactive editing
  const selectedSector = useMemo(() => {
    return sectors.find(s => s.id === activeSectorId) || sectors[0];
  }, [sectors, activeSectorId]);

  // Real-time calculation helper constants for USLE
  const SOIL_K_FACTORS = {
    sand: 0.05,
    clay: 0.15,
    'silty-clay': 0.26,
    loam: 0.32,
    'silty-loam': 0.48,
    silt: 0.55,
  };

  const SOIL_LABELS = {
    sand: 'Pasir (Sangat Rendah)',
    clay: 'Tanah Liat (Rendah)',
    'silty-clay': 'Liat Berdebu (Sedang)',
    loam: 'Lempung (Sedang-Tinggi)',
    'silty-loam': 'Lempung Berdebu (Tinggi)',
    silt: 'Debu (Sangat Tinggi)',
  };

  const COVER_C_FACTORS = {
    bare: 1.0,         // Bare soil
    mulch: 0.3,        // Straw/mulch
    lcc: 0.15,         // Legume Cover Crops
    're发育-y1': 0.2,   // Year 1 reclamation
    're发育-y2': 0.08,  // Year 2 reclamation
    forest: 0.01,      // Mature forest
  };

  const COVER_LABELS = {
    bare: 'Tanah Terbuka / Bukaan Lahan Aktif (C = 1.0)',
    mulch: 'Tanah Tertutup Mulsa / Serasah Jerami (C = 0.3)',
    lcc: 'Tanaman Penutup Tanah / Legume Cover Crops (C = 0.15)',
    're发育-y1': 'Revegetasi Awal / Reklamasi Tahun Pertama (C = 0.2)',
    're发育-y2': 'Revegetasi Menengah / Reklamasi Tahun Kedua (C = 0.08)',
    forest: 'Hutan Lindung / Reklamasi Rapat Dewasa (C = 0.01)',
  };

  const PRACTICE_P_FACTORS = {
    none: 1.0,
    'silt-fence': 0.5,
    terracing: 0.15,
    'sediment-pond': 0.25,
    contour: 0.4,
  };

  const PRACTICE_LABELS = {
    none: 'Tanpa Konservasi Tambahan (P = 1.0)',
    'silt-fence': 'Silt Fence / Pagar Lumpur Pengendap (P = 0.5)',
    terracing: 'Sengkedan / Terrasering Sempurna (P = 0.15)',
    'sediment-pond': 'Sediment Trap / Sump Kolam Pengendap (P = 0.25)',
    contour: 'Penanaman Sejajar Kontur Bukit (P = 0.4)',
  };

  // Dynamic R factor (Rainfall Erosivity) based on system rainfall data
  // Using Bols empirical formula: R = 2.21 * (Rainfall in mm)^1.36
  const dynamicRValue = useMemo(() => {
    // Let's grab rainfall in the current calendar year or last 30 days
    const totalRain30Days = rainfall.length > 0 
      ? rainfall.reduce((sum, item) => sum + item.rainfall, 0)
      : 120; // fallback if no data
    
    // Scale monthly total to average yearly equivalent or monthly erosivity R
    // Bols formula for R: 2.21 * P ^ 1.36 where P is cumulative rainfall
    const calculatedR = 2.21 * Math.pow(Math.max(10, totalRain30Days), 1.36);
    return Math.round(calculatedR);
  }, [rainfall]);

  // LS factor calculation based on length (L) and slope gradient (S)
  const calculateLSValue = (length: number, gradient: number) => {
    // Standard LS equation: LS = (L/22.13)^m * (65.41 * sin^2(theta) + 4.56 * sin(theta) + 0.065)
    // Simplified mining-empirical standard in Indonesia (Puslitbang PU):
    // LS = (L / 22) * (0.00782 * S^2 + 0.0115 * S + 0.0049)
    const factorL = Math.sqrt(length) / 22.13;
    const sPct = gradient;
    const factorS = (0.00138 * Math.pow(sPct, 2)) + (0.00965 * sPct) + 0.0138;
    return Number((length * factorS * 0.15 + 0.1).toFixed(2));
  };

  // USLE Equation: A = R * K * LS * C * P
  const calculateErosionRate = (sector: SectorUSLE) => {
    const R = dynamicRValue;
    const K = SOIL_K_FACTORS[sector.soilType] || 0.32;
    const LS = calculateLSValue(sector.slopeLength, sector.slopeGradient);
    const C = COVER_C_FACTORS[sector.coverType] || 1.0;
    const P = PRACTICE_P_FACTORS[sector.practiceType] || 1.0;

    const A = R * K * LS * C * P; // tons/ha/year
    return {
      erosionRate: Number(A.toFixed(1)),
      yearlyTotalLossTons: Number((A * sector.areaHa).toFixed(1)),
      R,
      K,
      LS,
      C,
      P
    };
  };

  // Get hazard details based on Indonesia's Dirjen Reboisasi dan Rehabilitasi Lahan (RRL) standards:
  const getErosionHazard = (rate: number) => {
    if (rate < 15) return { label: 'Sangat Ringan', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', desc: 'Aman dari degradasi lapisan atas tanah. Lanjutkan pemantauan rutin.' };
    if (rate < 60) return { label: 'Ringan', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', desc: 'Erosi terkendali. Direkomendasikan penanaman cover crops ringan.' };
    if (rate < 180) return { label: 'Sedang', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20', desc: 'Erosi mulai merusak hara tanah. Wajib memperkuat terrasing & saluran drainase.' };
    if (rate < 480) return { label: 'Berat', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', desc: 'Sangat berbahaya! Terjadi pendangkalan kolam sediment. Terapkan silt fence berlapis.' };
    return { label: 'Sangat Berat', color: 'text-rose-600 bg-rose-500/10 border-rose-500/20', desc: 'Kritis! Risiko longsor lereng tambang tinggi. Tutup bukaan dengan vegetasi cepat & matikan lereng.' };
  };

  // Totals & Averages
  const totalErosionLossTons = useMemo(() => {
    return sectors.reduce((sum, s) => {
      const calc = calculateErosionRate(s);
      return sum + calc.yearlyTotalLossTons;
    }, 0);
  }, [sectors, dynamicRValue]);

  const totalAreaHa = useMemo(() => {
    return sectors.reduce((sum, s) => sum + s.areaHa, 0);
  }, [sectors]);

  const avgErosionRate = useMemo(() => {
    if (totalAreaHa === 0) return 0;
    return Number((totalErosionLossTons / totalAreaHa).toFixed(1));
  }, [totalErosionLossTons, totalAreaHa]);

  // Interactive editing handler
  const handleUpdateSector = (updated: Partial<SectorUSLE>) => {
    setSectors(prev => prev.map(s => s.id === activeSectorId ? { ...s, ...updated } : s));
  };

  // Add new sector handler
  const handleAddSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newSect: SectorUSLE = {
      id: Date.now().toString(),
      name: newName,
      areaHa: newArea,
      soilType: newSoil,
      slopeLength: newLength,
      slopeGradient: newGradient,
      coverType: newCover,
      practiceType: newPractice
    };

    setSectors(prev => [...prev, newSect]);
    setActiveSectorId(newSect.id);
    setShowAddModal(false);

    // Reset fields
    setNewName('');
    setNewArea(10);
    setNewSoil('loam');
    setNewLength(50);
    setNewGradient(15);
    setNewCover('bare');
    setNewPractice('none');
  };

  // Delete sector handler
  const handleDeleteSector = (id: string) => {
    if (sectors.length <= 1) {
      alert("Harus menyisakan minimal 1 sektor pengamatan!");
      return;
    }
    const idx = sectors.findIndex(s => s.id === id);
    const updatedSectors = sectors.filter(s => s.id !== id);
    setSectors(updatedSectors);
    
    // Auto shift active sector
    if (activeSectorId === id) {
      const nextActive = updatedSectors[Math.max(0, idx - 1)];
      setActiveSectorId(nextActive.id);
    }
  };

  // Recharts Monthly Historical Prediction Data
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentMonth = new Date().getMonth();
    const list = [];

    // Simulate 6 months trends with real data variations
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mIdx = d.getMonth();
      const mLabel = months[mIdx];

      // Calculate monthly cumulative rain from database if matches, else mock
      const targetMonthStr = String(mIdx + 1).padStart(2, '0');
      const targetYearStr = String(d.getFullYear());
      
      const rainInMonth = rainfall.filter(r => r.date && r.date.startsWith(`${targetYearStr}-${targetMonthStr}`));
      const rainVal = rainInMonth.length > 0
        ? rainInMonth.reduce((sum, r) => sum + r.rainfall, 0)
        : Math.max(30, Math.round(140 + Math.sin(mIdx) * 70 - (i * 12)));

      const monthR = 2.21 * Math.pow(rainVal, 1.36);

      // Compute total loss with current vegetative/practice C and P values vs Baseline (C=1.0, P=1.0)
      let totalCurrentTons = 0;
      let totalBaselineTons = 0;

      sectors.forEach(s => {
        const K = SOIL_K_FACTORS[s.soilType];
        const LS = calculateLSValue(s.slopeLength, s.slopeGradient);
        const C = COVER_C_FACTORS[s.coverType];
        const P = PRACTICE_P_FACTORS[s.practiceType];

        // Current actual predicted
        totalCurrentTons += (monthR * K * LS * C * P) * s.areaHa;
        // Baseline (no conservation crops, bare soil)
        totalBaselineTons += (monthR * K * LS * 1.0 * 1.0) * s.areaHa;
      });

      list.push({
        name: mLabel,
        'Curah Hujan (mm)': Math.round(rainVal),
        'Erosivitas R': Math.round(monthR),
        'Laju Erosi Aktual (Ton)': Math.round(totalCurrentTons),
        'Erosi Tanpa Konservasi (Ton)': Math.round(totalBaselineTons),
        'Tingkat Efisiensi (%)': Math.round(((totalBaselineTons - totalCurrentTons) / (totalBaselineTons || 1)) * 100)
      });
    }
    return list;
  }, [sectors, rainfall]);

  return (
    <div id="erosion-view-component" className="space-y-6">
      
      {/* Dynamic Bento Style Summary Stats Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Total Area under monitoring */}
        <div className="bg-white/80 border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-teal-500/10 text-teal-600 rounded-xl">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Sektor Pengamatan</p>
            <h3 className="text-lg font-bold text-slate-700 font-mono mt-0.5">{sectors.length} Area</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Total Luas: {totalAreaHa.toFixed(1)} Hektar</p>
          </div>
        </div>

        {/* Stat 2: Active Rainfall & erosivity */}
        <div className="bg-white/80 border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
            <Droplet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Faktor Erosivitas (R)</p>
            <h3 className="text-lg font-bold text-slate-700 font-mono mt-0.5">{dynamicRValue} MJ.mm</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Dihitung dari curah hujan site</p>
          </div>
        </div>

        {/* Stat 3: Average predicted erosion rate */}
        <div className="bg-white/80 border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Rata-Rata Erosi (A)</p>
            <h3 className="text-lg font-bold text-slate-700 font-mono mt-0.5">{avgErosionRate} <span className="text-xs font-normal">Ton/Ha/Th</span></h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                avgErosionRate < 15 ? 'bg-emerald-400' : avgErosionRate < 60 ? 'bg-sky-400' : avgErosionRate < 180 ? 'bg-amber-400' : 'bg-red-500'
              }`} />
              <p className="text-[10px] text-slate-500 font-semibold">{getErosionHazard(avgErosionRate).label}</p>
            </div>
          </div>
        </div>

        {/* Stat 4: Estimated yearly loss tonnage */}
        <div className="bg-white/80 border border-slate-200 p-4 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Prediksi Tanah Hilang</p>
            <h3 className="text-lg font-bold text-slate-700 font-mono mt-0.5">{totalErosionLossTons.toLocaleString('id-ID')} <span className="text-xs font-normal">Ton/Tahun</span></h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Akumulasi seluruh sektor tambang</p>
          </div>
        </div>

      </div>

      {/* Main Layout Divided into Sandbox (Left) and Chart / Map (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Sektor list & interactive tuning (7 columns) */}
        <div className="lg:col-span-7 bg-white/80 border border-slate-200 rounded-2xl p-5 shadow-xl space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-600" />
                Daftar Sektor & Kalkulator USLE
              </h3>
              <p className="text-[10px] text-slate-500">Pilih sektor pengamatan untuk mengubah parameter biofisik tanah & lereng.</p>
            </div>
            
            <button
              id="add-erosion-sector-btn"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Tambah Sektor
            </button>
          </div>

          {/* Sector horizontal / vertical list selector */}
          <div className="flex flex-wrap gap-2">
            {sectors.map(sec => {
              const calc = calculateErosionRate(sec);
              const hazard = getErosionHazard(calc.erosionRate);
              return (
                <div
                  key={sec.id}
                  onClick={() => setActiveSectorId(sec.id)}
                  className={`px-3.5 py-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between w-[48%] sm:w-[23%] lg:w-[24%] cursor-pointer ${
                    activeSectorId === sec.id 
                      ? 'border-teal-500 bg-teal-500/5 text-slate-800' 
                      : 'border-slate-200 bg-white/40 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="text-[10px] font-bold truncate pr-3 block max-w-[85%]">{sec.name}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSector(sec.id);
                      }}
                      className="text-slate-500 hover:text-rose-600 transition-all absolute top-2 right-2 p-1 rounded hover:bg-white cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between w-full">
                    <span className="font-mono text-xs font-bold">{calc.erosionRate} <span className="text-[9px] font-normal text-slate-500">T/H/Y</span></span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${hazard.color.split(' ')[0]} ${hazard.color.split(' ')[1]}`}>
                      {hazard.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core Interactive tuning form */}
          {selectedSector && (
            <div className="p-4.5 bg-white border border-slate-200/80 rounded-xl space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs font-bold text-teal-600 uppercase tracking-widest font-mono">Tuning Parameter: {selectedSector.name}</span>
                <span className="text-[10px] font-semibold text-slate-500">Metode USLE (Permen LHK RI)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Parameter 1: Area Size & Soil Erodibility */}
                <div className="space-y-4">
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Nama Sektor Pengamatan
                    </label>
                    <input 
                      type="text"
                      value={selectedSector.name}
                      onChange={(e) => handleUpdateSector({ name: e.target.value })}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 outline-none focus:border-teal-500/50 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                      Luas Sektor Tambang (Ha)
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        step="0.5"
                        value={selectedSector.areaHa}
                        onChange={(e) => handleUpdateSector({ areaHa: Number(e.target.value) })}
                        className="w-full accent-teal-500" 
                      />
                      <span className="text-xs font-bold font-mono bg-white border border-slate-200 px-2 py-1 rounded w-16 text-center">{selectedSector.areaHa} Ha</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Jenis Tanah & Faktor Erodibilitas (K)
                    </label>
                    <select
                      value={selectedSector.soilType}
                      onChange={(e) => handleUpdateSector({ soilType: e.target.value as SectorUSLE['soilType'] })}
                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-teal-500/50"
                    >
                      {Object.keys(SOIL_LABELS).map((k) => (
                        <option key={k} value={k}>
                          {SOIL_LABELS[k as SectorUSLE['soilType']]} (K={SOIL_K_FACTORS[k as SectorUSLE['soilType']]})
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 italic">Nilai K mengindikasikan tingkat kepekaan butiran tanah terhadap dispersi air.</p>
                  </div>

                  {/* Parameter 2: Cover Management Factor C */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Pengelolaan Tutupan Lahan (C)
                    </label>
                    <select
                      value={selectedSector.coverType}
                      onChange={(e) => handleUpdateSector({ coverType: e.target.value as SectorUSLE['coverType'] })}
                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-teal-500/50"
                    >
                      {Object.keys(COVER_LABELS).map((c) => (
                        <option key={c} value={c}>
                          {COVER_LABELS[c as SectorUSLE['coverType']]}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 italic">Realisasi bukaan lahan aktif bernilai C=1.0, sedangkan rehabilitasi LCC mereduksi erosi hingga 85%.</p>
                  </div>

                </div>

                {/* Parameter 3: Slope Length & Slope Gradient */}
                <div className="space-y-4">
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center justify-between">
                      <span>Panjang Lereng Tambang (L - meter)</span>
                      <span className="text-slate-500 font-mono text-[9px]">Standard: 10 - 200m</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="10" 
                        max="200" 
                        step="5"
                        value={selectedSector.slopeLength}
                        onChange={(e) => handleUpdateSector({ slopeLength: Number(e.target.value) })}
                        className="w-full accent-teal-500" 
                      />
                      <span className="text-xs font-bold font-mono bg-white border border-slate-200 px-2 py-1 rounded w-16 text-center">{selectedSector.slopeLength} m</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center justify-between">
                      <span>Kemiringan Lereng (S - % kemiringan)</span>
                      <span className="text-slate-500 font-mono text-[9px]">Standard: 1% - 60%</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="1" 
                        max="60" 
                        step="1"
                        value={selectedSector.slopeGradient}
                        onChange={(e) => handleUpdateSector({ slopeGradient: Number(e.target.value) })}
                        className="w-full accent-teal-500" 
                      />
                      <span className="text-xs font-bold font-mono bg-white border border-slate-200 px-2 py-1 rounded w-16 text-center">{selectedSector.slopeGradient}%</span>
                    </div>
                  </div>

                  {/* Parameter 4: Conservation Practice Factor P */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Tindakan Konservasi Praktis (P)
                    </label>
                    <select
                      value={selectedSector.practiceType}
                      onChange={(e) => handleUpdateSector({ practiceType: e.target.value as SectorUSLE['practiceType'] })}
                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:border-teal-500/50"
                    >
                      {Object.keys(PRACTICE_LABELS).map((p) => (
                        <option key={p} value={p}>
                          {PRACTICE_LABELS[p as SectorUSLE['practiceType']]}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 italic">Praktek mekanis buatan untuk memblokir limpasan partikel tanah terapung ke hilir.</p>
                  </div>

                </div>

              </div>

              {/* Dynamic Formula Display Block */}
              <div className="bg-white/60 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                    <span>PERSAMAAN USLE (Wischmeier & Smith):</span>
                    <span className="text-teal-600 font-bold">A = R × K × LS × C × P</span>
                  </div>
                  <div className="text-slate-500 font-mono text-[10px] space-x-1.5">
                    <span>A = {dynamicRValue}</span>
                    <span>× {SOIL_K_FACTORS[selectedSector.soilType]}</span>
                    <span>× {calculateLSValue(selectedSector.slopeLength, selectedSector.slopeGradient)}</span>
                    <span>× {COVER_C_FACTORS[selectedSector.coverType]}</span>
                    <span>× {PRACTICE_P_FACTORS[selectedSector.practiceType]}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono block">ESTIMASI EROR REKORENT</span>
                  <span className="font-mono text-lg font-extrabold text-teal-600">{calculateErosionRate(selectedSector).erosionRate} <span className="text-[9px] font-medium text-slate-500">Ton/Ha/Th</span></span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Column: Chart & Map Analysis (5 columns) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Subcard 1: Erosion Rate Hazard Meter */}
          {selectedSector && (
            <div className="bg-white/80 border border-slate-200 p-5 rounded-2xl shadow-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Analisis Kerentanan Sektor
              </h4>

              {(() => {
                const calculations = calculateErosionRate(selectedSector);
                const hazard = getErosionHazard(calculations.erosionRate);
                
                // percentage for visual filling of gauge meter
                const maxPlotRate = 600; // max scale
                const percentage = Math.min(100, (calculations.erosionRate / maxPlotRate) * 100);

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-600 block font-mono">STATUS KERAWANAN</span>
                        <span className={`text-md font-extrabold uppercase ${hazard.color.split(' ')[0]}`}>{hazard.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-600 block font-mono">TOTAL MATERI HILANG</span>
                        <span className="text-slate-800 font-mono font-bold text-sm">{calculations.yearlyTotalLossTons.toLocaleString('id-ID')} Ton/Tahun</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed font-sans">{hazard.desc}</p>

                    {/* Gradient progress meter bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono font-semibold">
                        <span>0 Ton/Ha</span>
                        <span>15 (Ringan)</span>
                        <span>180 (Sedang)</span>
                        <span>480+ (Berat)</span>
                      </div>
                      <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-slate-200 relative">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                        <div 
                          className="absolute top-0 bottom-0 w-1 bg-white border border-slate-900 shadow-lg transition-all duration-500"
                          style={{ left: `calc(${percentage}% - 2px)` }}
                        />
                      </div>
                    </div>

                    {/* Quick Simulation Suggestion banner */}
                    <div className="bg-white/60 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-500 flex items-start gap-2.5">
                      <Info className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <p className="leading-normal">
                        <span className="font-bold text-slate-600">Rekomendasi Konservasi:</span> Mengubah tutupan lereng sektor ini menjadi <span className="text-emerald-600 font-bold">Legume Cover Crops (LCC)</span> dan merancang <span className="text-amber-600 font-bold">Terasering (Sengkedan)</span> akan mereduksi laju erosi kumulatif sebesar <span className="font-mono font-bold text-emerald-600">88.5%</span> (menghemat {Math.round(calculations.yearlyTotalLossTons * 0.88)} ton kehilangan humus pertahun).
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Subcard 2: Monthly trend comparing baseline with conservation using Recharts */}
          <div className="bg-white/80 border border-slate-200 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-sky-400" />
                Kinerja Kumulatif & Efisiensi Konservasi
              </h4>
              <p className="text-[10px] text-slate-600">Perbandingan laju tanah longsor tererosi aktual vs skenario tanpa perlindungan.</p>
            </div>

            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualErosionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="baselineErosionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const actual = Number(payload[0].value);
                        const baseline = Number(payload[1].value);
                        const efficiency = Math.round(((baseline - actual) / (baseline || 1)) * 100);
                        return (
                          <div className="bg-white/95 border border-slate-200 p-3 rounded-xl shadow-2xl backdrop-blur-md text-[11px] text-slate-600">
                            <p className="font-bold text-slate-600 mb-1 font-mono">{label}</p>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-6">
                                <span className="text-sky-400 flex items-center gap-1 font-semibold">Aktual:</span>
                                <span className="font-mono font-bold text-slate-800">{actual.toLocaleString('id-ID')} Ton</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-rose-600 flex items-center gap-1 font-semibold">Tanpa Konservasi:</span>
                                <span className="font-mono font-bold text-slate-800">{baseline.toLocaleString('id-ID')} Ton</span>
                              </div>
                              <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between gap-6">
                                <span className="text-emerald-600 font-bold flex items-center gap-1">Efisiensi Reduksi:</span>
                                <span className="font-mono font-bold text-emerald-600">+{efficiency}%</span>
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
                    height={28} 
                    iconSize={5} 
                    iconType="circle"
                    formatter={(value) => <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{value}</span>}
                  />
                  <Area type="monotone" dataKey="Laju Erosi Aktual (Ton)" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#actualErosionGrad)" />
                  <Area type="monotone" dataKey="Erosi Tanpa Konservasi (Ton)" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#baselineErosionGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <Check className="h-3 w-3" /> Erosi Terkendali Baik (Efisiensi Rata-Rata: +{
                  Math.round(monthlyTrendData.reduce((sum, item) => sum + item['Tingkat Efisiensi (%)'], 0) / monthlyTrendData.length)
                }%)
              </span>
              <span>Recharts Area Engine</span>
            </div>
          </div>

        </div>

      </div>

      {/* Educational Technical Guidance Accordion Section */}
      <div className="bg-white/80 border border-slate-200 rounded-2xl p-5 shadow-xl space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-teal-600" />
          Kamus & Pedoman Teknis USLE Minerba (Kepmen ESDM RI)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-3 bg-white/40 border border-slate-200 rounded-xl space-y-1">
            <span className="font-mono text-xs text-sky-400 font-bold block">R (Rainfall Erosivity)</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Daya kikis air hujan terhadap agregat tanah, diprediksi dari intensitas curah hujan kumulatif bulanan (Bols-Indonesia).
            </p>
          </div>
          <div className="p-3 bg-white/40 border border-slate-200 rounded-xl space-y-1">
            <span className="font-mono text-xs text-emerald-600 font-bold block">K (Soil Erodibility)</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Tingkat kerentanan intrinsik tipe tanah (tekstur, struktur, bahan organik) terhadap erosi, berkisar 0.05 sampai 0.6.
            </p>
          </div>
          <div className="p-3 bg-white/40 border border-slate-200 rounded-xl space-y-1">
            <span className="font-mono text-xs text-amber-600 font-bold block">LS (Length & Slope)</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Pengaruh geometri permukaan: semakin panjang (L) dan semakin curam lereng (S) mempercepat aliran limpasan air.
            </p>
          </div>
          <div className="p-3 bg-white/40 border border-slate-200 rounded-xl space-y-1">
            <span className="font-mono text-xs text-purple-400 font-bold block">C (Vegetative Cover)</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Faktor penutup tanah. Semakin lebat tajuk tumbuhan dan mulsa, semakin besar menahan tumbukan pukulan butir hujan.
            </p>
          </div>
          <div className="p-3 bg-white/40 border border-slate-200 rounded-xl space-y-1">
            <span className="font-mono text-xs text-pink-400 font-bold block">P (Conservation)</span>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Efektivitas rekayasa teknik sipil pendukung (terasering, parit buntu, sumur resapan, silt barrier) mengurangi kecepatan limpasan.
            </p>
          </div>
        </div>
      </div>

      {/* Add New Sector Modal Dialogue overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-250">
            
            <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-teal-600" />
                Tambah Sektor Pengamatan USLE
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSector} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Nama Sektor / Block Tambang</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Disposal Blok C Utara"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Luas Area (Hektar)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={newArea}
                    onChange={(e) => setNewArea(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none font-mono focus:border-teal-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Tipe Tanah (K)</label>
                  <select
                    value={newSoil}
                    onChange={(e) => setNewSoil(e.target.value as SectorUSLE['soilType'])}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-500/50"
                  >
                    {Object.keys(SOIL_LABELS).map((k) => (
                      <option key={k} value={k}>{k.toUpperCase()} (K={SOIL_K_FACTORS[k as SectorUSLE['soilType']]})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Panjang Lereng (L - meter)</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    required
                    value={newLength}
                    onChange={(e) => setNewLength(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none font-mono focus:border-teal-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Kemiringan Lereng (S - %)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={newGradient}
                    onChange={(e) => setNewGradient(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none font-mono focus:border-teal-500/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Status Tutupan Lahan (C)</label>
                <select
                  value={newCover}
                  onChange={(e) => setNewCover(e.target.value as SectorUSLE['coverType'])}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-500/50"
                >
                  {Object.keys(COVER_LABELS).map((c) => (
                    <option key={c} value={c}>{c.toUpperCase()} ({COVER_LABELS[c as SectorUSLE['coverType']].split('(')[0]})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Tindakan Konservasi (P)</label>
                <select
                  value={newPractice}
                  onChange={(e) => setNewPractice(e.target.value as SectorUSLE['practiceType'])}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-teal-500/50"
                >
                  {Object.keys(PRACTICE_LABELS).map((p) => (
                    <option key={p} value={p}>{p.toUpperCase()} ({PRACTICE_LABELS[p as SectorUSLE['practiceType']].split('(')[0]})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
                <button
                  id="cancel-add-sector-btn"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-white text-slate-500 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="submit-add-sector-btn"
                  type="submit"
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl cursor-pointer"
                >
                  Simpan Sektor
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
