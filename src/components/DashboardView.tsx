/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import AnimatedCounter from './AnimatedCounter';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ReferenceLine,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  WastewaterData, 
  RainfallData, 
  NurseryData, 
  ReclamationGuarantee, 
  WasteStock, 
  ComplianceCalendarEvent,
  EnvironmentalCost,
  SurfaceWaterData,
  SolidWasteData,
  EnvironmentalDocument,
  AlertNotification
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
  ExternalLink,
  Coins,
  ArrowUpRight,
  Layers,
  CheckSquare,
  User
} from 'lucide-react';
import { INDONESIAN_REGULATIONS } from '../data/regulations';
import { computeDocumentStatus } from '../utils/documentStatus';

// Custom Tooltip for pH & TSS line charts
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-xs shadow-2xl space-y-1.5 ">
        <p className="font-bold text-slate-600 font-mono border-b border-slate-200 pb-1 mb-1">Tanggal: {label}</p>
        {payload.map((pld: any, index: number) => {
          const isPH = pld.name === 'pH';
          const isTSS = pld.name === 'TSS';
          const val = Number(pld.value);
          let limitText = '';
          let isExceeded = false;
          
          if (isPH) {
            isExceeded = val < 6.0 || val > 9.0;
            limitText = '(Baku Mutu: 6.0 - 9.0)';
          } else if (isTSS) {
            isExceeded = val > 200;
            limitText = '(Baku Mutu: max 200 mg/L)';
          }

          return (
            <div key={index} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }} />
                <span className="text-slate-500 font-medium">
                  {pld.name}: <strong className={isExceeded ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{val}</strong>
                </span>
              </div>
              {limitText && (
                <span className="text-[10px] text-slate-500 ml-4">{limitText}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Rainfall line chart
const CustomRainfallTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-xs shadow-2xl space-y-1 ">
        <p className="font-bold text-slate-600 font-mono border-b border-slate-200 pb-1 mb-1">Tanggal: {label}</p>
        <div className="flex items-center gap-2">
          <span className="w-2   h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-500">Curah Hujan: <strong className="text-emerald-600">{data.CurahHujan} mm</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-slate-500">Intensitas: <strong className="text-amber-600">{data.Intensitas} mm/jam</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span className="text-slate-500 font-sans">Cuaca: <strong className="text-indigo-600">{data.weather}</strong></span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomMonthlyRainfallTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-xs shadow-2xl space-y-2 ">
        <p className="font-bold text-slate-600 font-mono border-b border-slate-200 pb-1 mb-1">{data.fullName}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Curah Hujan:
            </span>
            <strong className="text-blue-600 font-mono">{data.Rainfall} mm</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Hari Hujan:
            </span>
            <strong className="text-indigo-600 font-mono">{data.RainDays} Hari</strong>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-200">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Indeks Erosi:
            </span>
            <strong className="text-rose-600 font-mono">{data.ErosionIndex}%</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] text-slate-500">Risiko Erosi:</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${data.RiskColor}15`, color: data.RiskColor }}>
              {data.RiskLevel}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface DashboardViewProps {
  wastewater: WastewaterData[];
  surfaceWater?: SurfaceWaterData[];
  solidWaste?: SolidWasteData[];
  documents?: EnvironmentalDocument[];
  alerts?: AlertNotification[];
  rainfall: RainfallData[];
  nursery: NurseryData[];
  guarantees: ReclamationGuarantee[];
  wasteStocks: WasteStock[];
  calendar: ComplianceCalendarEvent[];
  environmentalCosts?: EnvironmentalCost[];
  setCurrentTab: (tab: string) => void;
}

export default function DashboardView({
  wastewater,
  surfaceWater = [],
  solidWaste = [],
  documents = [],
  alerts = [],
  rainfall,
  nursery,
  guarantees,
  wasteStocks,
  calendar,
  environmentalCosts = [],
  setCurrentTab
}: DashboardViewProps) {
  const [chartMetric, setChartMetric] = useState<'ph' | 'tss' | 'combined' | 'rainfall'>('combined');

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
    
  // Surface water stats
  const totalSurfaceWaterTests = surfaceWater.length;
  const failedSurfaceWaterTests = surfaceWater.filter(x => x.status === 'Exceeded').length;
  const surfaceWaterComplianceRate = totalSurfaceWaterTests > 0 
    ? Math.round(((totalSurfaceWaterTests - failedSurfaceWaterTests) / totalSurfaceWaterTests) * 100) 
    : 100;
    
  // Solid waste stats
  const totalSolidWasteRecycled = solidWaste.reduce((sum, x) => sum + x.recycledKg + x.compostedKg, 0);
  const totalSolidWasteGenerated = solidWaste.reduce((sum, x) => sum + x.organicKg + x.inorganicKg + x.residueKg, 0);
  const recyclingRate = totalSolidWasteGenerated > 0 
    ? Math.round((totalSolidWasteRecycled / totalSolidWasteGenerated) * 100) 
    : 0;
    
  // Document stats
  const expiringDocuments = documents.filter(doc => {
    const status = computeDocumentStatus(doc.expiryDate);
    return status === 'Renewal Needed' || status === 'Expired';
  }).length;
  
  // Alerts stats
  const unreadAlerts = alerts.filter(a => !a.read).length;

  // Real-time environmental costs metrics
  const totalOpexPlanned = environmentalCosts.reduce((sum, x) => sum + x.plannedOpex, 0);
  const totalOpexRealized = environmentalCosts.reduce((sum, x) => sum + x.realizedOpex, 0);
  const totalCapexPlanned = environmentalCosts.reduce((sum, x) => sum + x.plannedCapex, 0);
  const totalCapexRealized = environmentalCosts.reduce((sum, x) => sum + x.realizedCapex, 0);
  
  const totalCostPlan = totalOpexPlanned + totalCapexPlanned;
  const totalCostRealized = totalOpexRealized + totalCapexRealized;
  const costPercentage = totalCostPlan > 0 ? (totalCostRealized / totalCostPlan) * 100 : 0;

  // Find oldest B3 waste item
  const maxDaysB3 = wasteStocks.length > 0
    ? Math.max(...wasteStocks.map(x => x.daysInTps))
    : 0;

  // 30 days trend computation (reference date '2026-05-30')
  const get30DaysWastewaterData = () => {
    const refDate = new Date('2026-05-30');
    const limitDate = new Date(refDate);
    limitDate.setDate(refDate.getDate() - 30);

    let filtered = wastewater.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= limitDate && itemDate <= refDate;
    });

    if (filtered.length < 2) {
      filtered = [...wastewater];
    }

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const get30DaysRainfallData = () => {
    const refDate = new Date('2026-05-30');
    const limitDate = new Date(refDate);
    limitDate.setDate(refDate.getDate() - 30);

    let filtered = rainfall.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= limitDate && itemDate <= refDate;
    });

    if (filtered.length < 2) {
      filtered = [...rainfall];
    }

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const chartData30Days = get30DaysWastewaterData().map(x => ({
    date: x.date,
    label: new Date(x.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    pH: x.ph,
    TSS: x.tss,
    location: x.location,
    status: x.status
  }));

  const rainfallData30Days = get30DaysRainfallData().map(x => ({
    date: x.date,
    label: new Date(x.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    CurahHujan: x.rainfall,
    Intensitas: x.intensity,
    weather: x.weather
  }));

  const getLast12MonthsData = () => {
    // 12 months from July 2025 to June 2026
    const monthlyBase = [
      { month: 'Jul 25', name: 'Juli', year: 2025, baseRainfall: 145, baseDays: 11 },
      { month: 'Agu 25', name: 'Agustus', year: 2025, baseRainfall: 120, baseDays: 9 },
      { month: 'Sep 25', name: 'September', year: 2025, baseRainfall: 155, baseDays: 12 },
      { month: 'Okt 25', name: 'Oktober', year: 2025, baseRainfall: 185, baseDays: 14 },
      { month: 'Nov 25', name: 'November', year: 2025, baseRainfall: 240, baseDays: 18 },
      { month: 'Des 25', name: 'Desember', year: 2025, baseRainfall: 285, baseDays: 20 },
      { month: 'Jan 26', name: 'Januari', year: 2026, baseRainfall: 220, baseDays: 16 },
      { month: 'Feb 26', name: 'Februari', year: 2026, baseRainfall: 195, baseDays: 13 },
      { month: 'Mar 26', name: 'Maret', year: 2026, baseRainfall: 250, baseDays: 17 },
      { month: 'Apr 26', name: 'April', year: 2026, baseRainfall: 290, baseDays: 19 },
      { month: 'Mei 26', name: 'Mei', year: 2026, baseRainfall: 275, baseDays: 18 },
      { month: 'Jun 26', name: 'Juni', year: 2026, baseRainfall: 180, baseDays: 12 },
    ];

    const realGrouped: { [key: string]: { totalRainfall: number; count: number } } = {};
    
    rainfall.forEach(item => {
      if (!item.date) return;
      const dateObj = new Date(item.date);
      const m = dateObj.getMonth();
      const y = dateObj.getFullYear();
      const key = `${m}-${y}`;
      
      if (!realGrouped[key]) {
        realGrouped[key] = { totalRainfall: 0, count: 0 };
      }
      realGrouped[key].totalRainfall += item.rainfall;
      realGrouped[key].count += 1;
    });

    return monthlyBase.map(item => {
      const monthIndexMap: { [key: string]: number } = {
        'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3, 'Mei': 4, 'Juni': 5,
        'Juli': 6, 'Agustus': 7, 'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
      };
      
      const mIndex = monthIndexMap[item.name];
      const key = `${mIndex}-${item.year}`;
      
      let totalRainfall = item.baseRainfall;
      let daysWithRain = item.baseDays;
      let isRealData = false;

      if (realGrouped[key]) {
        totalRainfall = Number(realGrouped[key].totalRainfall.toFixed(1));
        daysWithRain = realGrouped[key].count;
        isRealData = true;
      }

      // Erosion Risk Index calculation
      const erosionRiskIndex = Math.min(100, Math.round((totalRainfall / 300) * 100));
      let riskLevel = 'Rendah';
      let riskColor = '#10b981';
      if (erosionRiskIndex > 75) {
        riskLevel = 'Sangat Tinggi';
        riskColor = '#f43f5e';
      } else if (erosionRiskIndex > 50) {
        riskLevel = 'Tinggi';
        riskColor = '#f59e0b';
      } else if (erosionRiskIndex > 30) {
        riskLevel = 'Sedang';
        riskColor = '#3b82f6';
      }

      return {
        month: item.month,
        fullName: `${item.name} ${item.year}`,
        Rainfall: totalRainfall,
        RainDays: daysWithRain,
        ErosionIndex: erosionRiskIndex,
        RiskLevel: riskLevel,
        RiskColor: riskColor,
        isReal: isRealData
      };
    });
  };

  const last12MonthsRainfall = getLast12MonthsData();
  const highestRainfallMonth = [...last12MonthsRainfall].sort((a, b) => b.Rainfall - a.Rainfall)[0];

  // Monthly compliance tasks chart data
  const processCalendarChartData = () => {
    const grouped = calendar.reduce((acc, event) => {
      const monthKey = event.date.substring(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          'Total Tugas': 0,
          'Selesai': 0,
          'Pending/Overdue': 0
        };
      }
      
      acc[monthKey]['Total Tugas'] += 1;
      if (event.status === 'Completed') {
        acc[monthKey]['Selesai'] += 1;
      } else {
        acc[monthKey]['Pending/Overdue'] += 1;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(grouped)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => {
        const [year, monthStr] = item.month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const formattedMonth = `${monthNames[parseInt(monthStr, 10) - 1]} ${year.substring(2)}`;
        return {
          ...item,
          label: formattedMonth
        };
      })
      .slice(-6);
  };

  const calendarChartData = processCalendarChartData();

  return (
    <div id="dashboard-view-wrapper" className="space-y-6">
      {/* KPI Cards Grid - Premium Redesign */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Compliance Air Limbah */}
        <motion.div 
          id="kpi-water-compliance" 
          className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group cursor-default"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-forest-50 text-[#4D7C5A] rounded-2xl border border-border-custom group-hover:scale-105 transition-all duration-200">
              <Waves className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Compliance Air Limbah</span>
              <span className="text-[48px] font-bold font-manrope text-text-primary mt-1 tracking-tight leading-none block">
                <AnimatedCounter value={waterComplianceRate} format={v => Math.round(v) + "%"} />
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border-custom flex items-center gap-2 text-[12px]">
            <span className="text-[#3FA66B] font-bold">✓ {passedWaterTests} Compliant</span>
            <span className="text-text-secondary font-light">•</span>
            <span className="text-[#D95C5C] font-bold">⚠ {failedWaterTests} Need Review</span>
          </div>
        </motion.div>

        {/* Card 2: Nursery Stocks */}
        <motion.div 
          id="kpi-nursery" 
          className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group cursor-default"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-forest-50 text-[#4D7C5A] rounded-2xl border border-border-custom group-hover:scale-105 transition-all duration-200">
              <Trees className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Persediaan Bibit Nursery</span>
              <span className="text-[48px] font-bold font-manrope text-text-primary mt-1 tracking-tight leading-none block">
                {totalSeeds.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border-custom flex items-center gap-2 text-[12px]">
            <span className="text-[#3FA66B] font-bold bg-[#3FA66B]/8 px-2 py-0.5 rounded-full text-[11px]">
              {nursery.filter(x => x.status === 'Healthy').length} Spesies Sehat
            </span>
          </div>
        </motion.div>

        {/* Card 3: B3 Storage Limit */}
        <motion.div 
          id="kpi-b3-safety" 
          className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group cursor-default"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border transition-all duration-200 group-hover:scale-105 ${
              maxDaysB3 > 80 
                ? 'bg-[#D95C5C]/8 text-[#9C3333] border-[#D95C5C]/15 animate-pulse' 
                : 'bg-[#E2A43B]/8 text-[#8F5E13] border-[#E2A43B]/15'
            }`}>
              <Clock className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Penyimpanan Terlama TPS</span>
              <span className={`text-[48px] font-bold font-manrope mt-1 tracking-tight leading-none block ${
                maxDaysB3 > 80 ? 'text-[#9C3333]' : 'text-text-primary'
              }`}>
                {maxDaysB3} Hari
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border-custom flex items-center gap-2 text-[12px]">
            <span className={`font-bold ${maxDaysB3 >= 80 ? 'text-[#9C3333]' : 'text-text-secondary'}`}>
              {maxDaysB3 >= 90 ? 'Melampaui Batas!' : `Sisa ${90 - maxDaysB3} Hari Maksimal`}
            </span>
          </div>
        </motion.div>

        {/* Card 4: Reclamation Escrow */}
        <motion.div 
          id="kpi-guarantee" 
          className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group cursor-default"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-forest-50 text-[#4D7C5A] rounded-2xl border border-border-custom group-hover:scale-105 transition-all duration-200">
              <FileCheck2 className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Total Jaminan Reklamasi</span>
              <span className="text-[32px] font-bold font-manrope text-text-primary mt-1 tracking-tight leading-none block truncate">
                Rp {(totalGuaranteesValue / 1000000000).toFixed(1)}M
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border-custom flex items-center gap-2 text-[12px]">
            <span className="text-[#3FA66B] font-bold">✓ {activeGuaranteesCount} Aktif</span>
            <span className="text-text-secondary font-light">•</span>
            <span className="text-[#E2A43B] font-bold">
              ⚠ {guarantees.filter(x => x.status === 'Renewal Needed').length} Renewal
            </span>
          </div>
        </motion.div>

        {/* Card 5: Surface Water Compliance */}
        <motion.div 
          id="kpi-surface-water" 
          className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group cursor-default"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-forest-50 text-[#4D7C5A] rounded-2xl border border-border-custom group-hover:scale-105 transition-all duration-200">
              <Waves className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Kepatuhan Air Permukaan</span>
              <span className="text-[48px] font-bold font-manrope text-text-primary mt-1 tracking-tight leading-none block">
                <AnimatedCounter value={surfaceWaterComplianceRate} format={v => Math.round(v) + "%"} />
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border-custom flex items-center gap-2 text-[12px]">
            <span className="text-[#3FA66B] font-bold">✓ {totalSurfaceWaterTests - failedSurfaceWaterTests} Aman</span>
            <span className="text-text-secondary font-light">•</span>
            <span className="text-[#D95C5C] font-bold">⚠ {failedSurfaceWaterTests} Melebihi</span>
          </div>
        </motion.div>

        {/* Card 6: Solid Waste Recycling */}
        <motion.div 
          id="kpi-solid-waste" 
          className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group cursor-default"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-forest-50 text-[#4D7C5A] rounded-2xl border border-border-custom group-hover:scale-105 transition-all duration-200">
              <Trees className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Daur Ulang Sampah</span>
              <span className="text-[48px] font-bold font-manrope text-text-primary mt-1 tracking-tight leading-none block">
                {recyclingRate}%
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border-custom flex items-center gap-2 text-[12px] text-text-secondary font-medium">
            <span className="text-[#3FA66B] font-bold">{totalSolidWasteRecycled} kg</span> diproses dari <span className="font-bold">{totalSolidWasteGenerated} kg</span>
          </div>
        </motion.div>

        {/* Card 7: Expiring Documents */}
        <motion.div 
          id="kpi-documents" 
          className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group cursor-default"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border transition-all duration-200 group-hover:scale-105 ${
              expiringDocuments > 0 
                ? 'bg-[#E2A43B]/8 text-[#8F5E13] border-[#E2A43B]/15' 
                : 'bg-forest-50 text-[#4D7C5A] border-border-custom'
            }`}>
              <FileCheck2 className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Dokumen & Izin Berisiko</span>
              <span className="text-[48px] font-bold font-manrope text-text-primary mt-1 tracking-tight leading-none block">
                {expiringDocuments} Izin
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border-custom flex items-center gap-2 text-[12px]">
            <span className={`font-bold ${expiringDocuments > 0 ? 'text-[#8F5E13]' : 'text-[#3FA66B]'}`}>
              {expiringDocuments > 0 ? 'Perlu Segera Diperpanjang' : 'Seluruh Dokumen Valid'}
            </span>
          </div>
        </motion.div>

        {/* Card 8: Unread Alerts */}
        <motion.div 
          id="kpi-alerts" 
          className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group cursor-default"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border transition-all duration-200 group-hover:scale-105 ${
              unreadAlerts > 0 
                ? 'bg-[#D95C5C]/8 text-[#9C3333] border-[#D95C5C]/15 animate-pulse' 
                : 'bg-forest-50 text-[#6D7B73] border-border-custom'
            }`}>
              <AlertTriangle className="h-6 w-6 stroke-[1.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Peringatan Kepatuhan</span>
              <span className="text-[48px] font-bold font-manrope text-text-primary mt-1 tracking-tight leading-none block">
                {unreadAlerts} Baru
              </span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border-custom flex items-center gap-2 text-[12px]">
            <span className={`font-bold ${unreadAlerts > 0 ? 'text-[#9C3333]' : 'text-[#3FA66B]'}`}>
              {unreadAlerts > 0 ? 'Tindakan Segera Diperlukan' : 'Sistem Terpantau Aman'}
            </span>
          </div>
        </motion.div>
      </div>
      {/* Team Compliance Tasks Summary */}
      <div id="bento-compliance-tasks" className="bg-white p-8 rounded-[20px] border border-border-custom shadow-custom text-left relative overflow-hidden mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6ECE6] pb-5 mb-6">
          <div>
            <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-primary flex items-center gap-2.5">
              <CheckSquare className="h-5 w-5 text-[#4D7C5A] stroke-[1.75]" />
              Tugas Agenda Kepatuhan Tim
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">Pemantauan progres penugasan agenda kepatuhan kepada anggota tim</p>
          </div>
          <button
            onClick={() => setCurrentTab('documents')}
            className="flex items-center gap-1.5 text-xs text-[#2F5A46] font-bold hover:bg-[#DCE5DA] transition-all bg-forest-50 px-4 py-2 rounded-xl border border-border-custom cursor-pointer"
          >
            Lihat Semua Agenda
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {calendar.filter(c => c.assignedTo && c.status !== 'Completed').length > 0 ? (
            calendar.filter(c => c.assignedTo && c.status !== 'Completed').map(task => (
              <div key={task.id} className="p-5 rounded-[15px] border border-border-custom bg-forest-50/50 flex flex-col justify-between hover:bg-forest-50 transition-colors duration-200">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-text-secondary uppercase font-manrope">{task.type}</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      task.status === 'Pending' 
                        ? 'bg-[#E2A43B]/10 text-[#8F5E13] border border-[#E2A43B]/15' 
                        : 'bg-[#D95C5C]/10 text-[#9C3333] border border-[#D95C5C]/15'
                    }`}>{task.status}</span>
                  </div>
                  <h5 className="text-sm font-bold text-text-primary mb-2 line-clamp-2 leading-snug">{task.title}</h5>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-3">
                    <User className="h-4 w-4 text-[#4D7C5A] stroke-[1.75]" />
                    <span className="font-semibold text-text-primary">{task.assignedTo}</span>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex justify-between items-center text-[10.5px] font-bold mb-1.5">
                    <span className="text-text-secondary">Progres Penyelesaian</span>
                    <span className="text-[#4D7C5A]">{task.progress || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-forest-100/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        (task.progress || 0) < 30 ? 'bg-[#E2A43B]' : (task.progress || 0) < 70 ? 'bg-[#A8B9A5]' : 'bg-[#4D7C5A]'
                      }`}
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-text-secondary text-sm">
              <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-30 text-[#4D7C5A] stroke-[1.25]" />
              Tidak ada tugas kepatuhan aktif yang sedang ditugaskan ke tim.
            </div>
          )}
        </div>

        {/* Compliance trend chart */}
        <div className="mt-8 pt-6 border-t border-[#E6ECE6]">
          <h5 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#4D7C5A] stroke-[1.75]" />
            Tren Kepatuhan Lingkungan Bulanan
          </h5>
          <div className="h-56 w-full font-sans">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calendarChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE6" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: '#6D7B73', fontSize: 10, fontWeight: 'medium' }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tick={{ fill: '#6D7B73', fontSize: 10, fontWeight: 'medium' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(77, 124, 90, 0.04)' }}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E6ECE6', fontSize: '11px', boxShadow: '0 8px 30px rgba(32, 52, 43, 0.08)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }} />
                <Bar dataKey="Selesai" stackId="a" fill="#4D7C5A" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Pending/Overdue" stackId="a" fill="#A8B9A5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Synchronized Environmental Costs Bento Summary */}
      <div id="bento-environmental-costs" className="bg-white p-8 rounded-[20px] border border-border-custom shadow-custom text-left relative overflow-hidden mt-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#DCE5DA]/15 rounded-full blur-3xl -z-10"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6ECE6] pb-5 mb-6">
          <div>
            <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-primary flex items-center gap-2.5">
              <Coins className="h-5 w-5 text-[#4D7C5A] stroke-[1.75]" />
              Realisasi Anggaran & Biaya Pengelolaan Lingkungan Hidup
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">Sinkronisasi data real-time dengan pencatatan pengeluaran opex & capex</p>
          </div>
          <button
            onClick={() => setCurrentTab('costs')}
            className="flex items-center gap-1.5 text-xs text-[#2F5A46] font-bold hover:bg-[#DCE5DA] transition-all bg-forest-50 px-4 py-2 rounded-xl border border-border-custom cursor-pointer"
          >
            Detil Anggaran & Input
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Total Completion Progress */}
          <div className="bg-forest-50/50 p-5 rounded-[15px] border border-border-custom flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-text-secondary tracking-wider font-bold uppercase font-manrope">Persentase Pemakaian</span>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold font-manrope text-[#4D7C5A]">{costPercentage.toFixed(1)}%</h3>
                <span className="text-xs text-text-secondary font-medium">dari Pagu</span>
              </div>
            </div>

            <div className="space-y-2.5 mt-5">
              <div className="w-full h-2 bg-[#E6ECE6] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    costPercentage > 100 ? 'bg-[#D95C5C]' : 'bg-[#4D7C5A]'
                  }`}
                  style={{ width: `${Math.min(100, costPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-manrope text-text-secondary">
                <span>Pagu Total Rencana:</span>
                <span className="font-bold text-text-primary">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalCostPlan)}</span>
              </div>
            </div>
          </div>

          {/* Opex summary */}
          <div className="bg-forest-50/50 p-5 rounded-[15px] border border-border-custom flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-text-secondary tracking-wider font-bold uppercase font-manrope">Penyaluran OPEX (Key Kegiatan)</span>
              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-xl font-bold font-manrope text-text-primary">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalOpexRealized)}
                </h3>
                <span className="text-xs font-bold text-[#4D7C5A] bg-[#4D7C5A]/8 px-2 py-0.5 rounded-full">{totalOpexPlanned > 0 ? ((totalOpexRealized / totalOpexPlanned) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>

            <div className="text-[11px] text-text-secondary space-y-1.5 mt-5 border-t border-[#E6ECE6] pt-3">
              <div className="flex justify-between">
                <span>Rencana OPEX:</span>
                <span className="font-bold text-text-primary">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalOpexPlanned)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sisa Anggaran:</span>
                <span className="font-bold text-text-primary">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.max(0, totalOpexPlanned - totalOpexRealized))}</span>
              </div>
            </div>
          </div>

          {/* Capex summary */}
          <div className="bg-forest-50/50 p-5 rounded-[15px] border border-border-custom flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-text-secondary tracking-wider font-bold uppercase font-manrope">Investasi CAPEX (Aset LH)</span>
              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-xl font-bold font-manrope text-text-primary">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalCapexRealized)}
                </h3>
                <span className="text-xs font-bold text-[#E2A43B] bg-[#E2A43B]/8 px-2 py-0.5 rounded-full">{totalCapexPlanned > 0 ? ((totalCapexRealized / totalCapexPlanned) * 100).toFixed(0) : 0}%</span>
              </div>
            </div>

            <div className="text-[11px] text-text-secondary space-y-1.5 mt-5 border-t border-[#E6ECE6] pt-3">
              <div className="flex justify-between">
                <span>Rencana CAPEX:</span>
                <span className="font-bold text-text-primary">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalCapexPlanned)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sisa Anggaran:</span>
                <span className="font-bold text-text-primary">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.max(0, totalCapexPlanned - totalCapexRealized))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Regulatory compliance widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Dynamic Interactive Recharts Line Chart */}
        <div id="dashboard-trend-panel" className="lg:col-span-2 bg-white p-8 rounded-[20px] border border-border-custom shadow-custom text-left flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E6ECE6]">
            <div>
              <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-primary">Tren Parameter 30 Hari Terakhir</h4>
              <p className="text-xs text-text-secondary mt-0.5">Analisis tren parameter air limbah guna deteksi dini penyimpangan baku mutu</p>
            </div>
            {/* Metric Switchers */}
            <div className="flex flex-wrap items-center gap-1.5 bg-forest-50 p-1 rounded-xl border border-border-custom">
              <button
                id="chart-metric-combined"
                onClick={() => setChartMetric('combined')}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-semibold transition-all cursor-pointer ${
                  chartMetric === 'combined' ? 'bg-[#4D7C5A] text-white font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                pH & TSS (Gabungan)
              </button>
              <button
                id="chart-metric-ph"
                onClick={() => setChartMetric('ph')}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-semibold transition-all cursor-pointer ${
                  chartMetric === 'ph' ? 'bg-[#4D7C5A] text-white font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                pH Air
              </button>
              <button
                id="chart-metric-tss"
                onClick={() => setChartMetric('tss')}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-semibold transition-all cursor-pointer ${
                  chartMetric === 'tss' ? 'bg-[#4D7C5A] text-white font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                TSS (mg/L)
              </button>
              <button
                id="chart-metric-rainfall"
                onClick={() => setChartMetric('rainfall')}
                className={`px-3 py-1.5 text-[11px] rounded-lg font-semibold transition-all cursor-pointer ${
                  chartMetric === 'rainfall' ? 'bg-[#4D7C5A] text-white font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Curah Hujan
              </button>
            </div>
          </div>

          {/* Render Recharts Line Graph for 30 days trend */}
          <div className="py-6 h-64 relative flex items-center justify-center font-sans">
            {chartData30Days.length === 0 ? (
              <div className="w-full text-center text-xs text-text-secondary py-12">Belum ada data pengamatan dalam 30 hari terakhir.</div>
            ) : (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === 'combined' ? (
                    <LineChart data={chartData30Days} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE6" />
                      <XAxis dataKey="label" stroke="#6D7B73" fontSize={10} tickLine={false} />
                      <YAxis yAxisId="left" domain={[4, 10]} stroke="#4D7C5A" fontSize={10} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#A8B9A5" fontSize={10} tickLine={false} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10, color: '#2F5A46' }} />
                      
                      {/* Regulatory guidelines reference lines (6.0 - 9.0) */}
                      <ReferenceLine yAxisId="left" y={6} stroke="#D95C5C" strokeDasharray="3 3" label={{ value: 'pH Min (6.0)', position: 'insideBottomLeft', fill: '#D95C5C', fontSize: 8 }} />
                      <ReferenceLine yAxisId="left" y={9} stroke="#D95C5C" strokeDasharray="3 3" label={{ value: 'pH Max (9.0)', position: 'insideTopLeft', fill: '#D95C5C', fontSize: 8 }} />
                      {/* Regulatory guideline for TSS (max 200) */}
                      <ReferenceLine yAxisId="right" y={200} stroke="#D95C5C" strokeDasharray="3 3" label={{ value: 'Batas TSS (200 mg/L)', position: 'insideTopRight', fill: '#D95C5C', fontSize: 8 }} />
                      
                      <Line yAxisId="left" type="monotone" dataKey="pH" name="pH" stroke="#4D7C5A" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="TSS" name="TSS" stroke="#A8B9A5" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                    </LineChart>
                  ) : chartMetric === 'ph' ? (
                    <LineChart data={chartData30Days} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE6" />
                      <XAxis dataKey="label" stroke="#6D7B73" fontSize={10} tickLine={false} />
                      <YAxis domain={[4, 10]} stroke="#4D7C5A" fontSize={10} tickLine={false} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10, color: '#2F5A46' }} />
                      
                      <ReferenceLine y={6} stroke="#D95C5C" strokeDasharray="3 3" label={{ value: 'pH Min (6.0)', position: 'insideBottomLeft', fill: '#D95C5C', fontSize: 8 }} />
                      <ReferenceLine y={9} stroke="#D95C5C" strokeDasharray="3 3" label={{ value: 'pH Max (9.0)', position: 'insideTopLeft', fill: '#D95C5C', fontSize: 8 }} />
                      
                      <Line type="monotone" dataKey="pH" name="pH" stroke="#4D7C5A" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                    </LineChart>
                  ) : chartMetric === 'tss' ? (
                    <LineChart data={chartData30Days} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE6" />
                      <XAxis dataKey="label" stroke="#6D7B73" fontSize={10} tickLine={false} />
                      <YAxis stroke="#A8B9A5" fontSize={10} tickLine={false} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10, color: '#2F5A46' }} />
                      
                      <ReferenceLine y={200} stroke="#D95C5C" strokeDasharray="3 3" label={{ value: 'Batas TSS (200 mg/L)', position: 'insideTopRight', fill: '#D95C5C', fontSize: 8 }} />
                      
                      <Line type="monotone" dataKey="TSS" name="TSS" stroke="#A8B9A5" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <LineChart data={rainfallData30Days} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE6" />
                      <XAxis dataKey="label" stroke="#6D7B73" fontSize={10} tickLine={false} />
                      <YAxis stroke="#4D7C5A" fontSize={10} tickLine={false} />
                      <RechartsTooltip content={<CustomRainfallTooltip />} />
                      <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                      
                      <Line type="monotone" dataKey="CurahHujan" name="Curah Hujan (mm)" stroke="#4D7C5A" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-forest-50 px-4 py-3 rounded-xl border border-border-custom flex items-center justify-between text-xs text-[#2F5A46]">
            <span className="flex items-center gap-1.5 font-sans font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-[#4D7C5A]" />
              Menampilkan data tren {chartMetric === 'rainfall' ? rainfallData30Days.length : chartData30Days.length} hari pengamatan terakhir.
            </span>
            <span className="text-[10px] font-manrope text-text-secondary uppercase tracking-wider font-semibold">Recharts Line Visualizer</span>
          </div>
        </div>

        {/* Dynamic Indonesian Environmental Legislation Matcher */}
        <div id="compliance-regulatory-widget" className="bg-white p-8 rounded-[20px] border border-border-custom shadow-custom text-left flex flex-col justify-between">
          <div>
            <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#4D7C5A] stroke-[1.75]" />
              Status Regulasi (ESD)
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">Parameter baku mutu terintegrasi UU & Permen RI</p>
          </div>

          <div className="space-y-3.5 my-5 overflow-y-auto max-h-72 pr-1">
            {INDONESIAN_REGULATIONS.map(reg => (
              <div key={reg.id} className="p-4 bg-forest-50/50 rounded-[15px] border border-border-custom hover:border-forest-200 transition-all duration-200">
                <div className="flex items-start justify-between gap-3">
                  <h5 className="text-xs font-bold text-text-primary leading-tight">{reg.title}</h5>
                  <span className="text-[9px] bg-forest-50 text-[#4D7C5A] border border-border-custom px-2 py-0.5 rounded-full font-manrope font-semibold whitespace-nowrap">
                    {reg.category}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
                  {reg.description}
                </p>
                {reg.parameters && reg.parameters.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {reg.parameters.map((param, pi) => (
                      <span key={pi} className="text-[9.5px] bg-[#FFFFFF] text-[#2F5A46] font-semibold border border-border-custom px-2 py-0.5 rounded-full">
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
            className="w-full py-3 rounded-xl bg-forest-50 hover:bg-[#DCE5DA] text-center text-xs font-bold text-[#2F5A46] transition-colors border border-border-custom cursor-pointer mt-2"
          >
            Sertifikasi & Kalender Compliance →
          </button>
        </div>
      </div>

      {/* Section 12-Month Rainfall & Erosion Trend Analysis */}
      <div id="erosion-rainfall-trend-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Rainfall Line Chart */}
        <div id="rainfall-trend-panel" className="lg:col-span-2 bg-white p-8 rounded-[20px] border border-border-custom shadow-custom text-left flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E6ECE6]">
            <div>
              <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#4D7C5A] stroke-[1.75]" />
                Tren Curah Hujan Bulanan (1 Tahun Terakhir)
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">Analisis fluktuasi presipitasi bulanan terintegrasi guna mendukung estimasi laju erosi tanah</p>
            </div>
            <div className="flex items-center gap-2 bg-forest-50 px-3.5 py-1.5 rounded-xl border border-border-custom text-[11px] text-text-secondary font-manrope font-semibold">
              <span className="w-2 h-2 bg-[#4D7C5A] rounded-full" />
              <span>Curah Hujan (mm)</span>
              <span className="w-2 h-2 bg-[#A8B9A5] rounded-full ml-3" />
              <span>Indeks Erosi (%)</span>
            </div>
          </div>

          <div className="py-6 h-64 relative flex items-center justify-center font-sans">
            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last12MonthsRainfall} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6ECE6" />
                  <XAxis dataKey="month" stroke="#6D7B73" fontSize={10} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#4D7C5A" fontSize={10} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#A8B9A5" fontSize={10} tickLine={false} />
                  <RechartsTooltip content={<CustomMonthlyRainfallTooltip />} />
                  <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10, color: '#2F5A46' }} />
                  
                  {/* Reference line for extreme rainfall (> 250mm) indicating very high erosion hazard */}
                  <ReferenceLine yAxisId="left" y={250} stroke="#D95C5C" strokeDasharray="3 3" label={{ value: 'Sangat Basah (>250mm)', position: 'insideBottomLeft', fill: '#D95C5C', fontSize: 8 }} />
                  
                  <Line yAxisId="left" type="monotone" dataKey="Rainfall" name="Curah Hujan (mm)" stroke="#4D7C5A" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="ErosionIndex" name="Indeks Erosi (%)" stroke="#A8B9A5" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-forest-50 px-4 py-3.5 rounded-xl border border-border-custom flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#2F5A46]">
            <span className="flex items-center gap-2 font-sans font-medium">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4D7C5A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4D7C5A]"></span>
              </span>
              <span>Tren akumulasi curah hujan menunjukkan risiko erosi tertinggi pada bulan-bulan puncak musim basah.</span>
            </span>
            <span className="text-[10px] font-manrope text-text-secondary uppercase tracking-wider font-semibold">Sistem Monitoring Hidrologi Diva Kencana</span>
          </div>
        </div>

        {/* Erosion hazard mitigation panel */}
        <div id="erosion-mitigation-panel" className="bg-white p-8 rounded-[20px] border border-border-custom shadow-custom text-left flex flex-col justify-between">
          <div>
            <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#E2A43B] stroke-[1.75]" />
              Rekomendasi Kontrol Erosi
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">Tindakan preventif berdasarkan tren hidrologi tahunan</p>
          </div>

          <div className="my-5 space-y-4 flex-1 overflow-y-auto max-h-72 pr-1">
            <div className="p-4 bg-[#D95C5C]/5 rounded-[15px] border border-[#D95C5C]/15">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C3333] font-manrope">Kerawanan Tertinggi</span>
                <span className="text-[10px] bg-[#D95C5C]/10 text-[#9C3333] px-2.5 py-0.5 rounded-full font-bold font-manrope">
                  {highestRainfallMonth?.fullName || 'April 2026'}
                </span>
              </div>
              <p className="text-xs text-text-primary mt-2 font-bold">
                Puncak Curah Hujan: {highestRainfallMonth?.Rainfall} mm
              </p>
              <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                Potensi limpasan air permukaan ekstrem. Diperlukan penguatan tanggul settling pond dan pembersihan sedimen trap sebelum bulan ini.
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-text-secondary">
              <div className="flex items-start gap-2.5">
                <div className="mt-1 w-1.5 h-1.5 bg-[#4D7C5A] rounded-full shrink-0" />
                <div>
                  <strong className="text-text-primary block font-bold">Penanaman Cover Crop (LCC)</strong>
                  <span className="text-text-secondary text-[11px] leading-relaxed block mt-0.5">
                    Segera lakukan hydroseeding pada lereng bekas tambang di area disposal sebelum masuk ke musim basah untuk menstabilkan struktur tanah.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-1 w-1.5 h-1.5 bg-[#A8B9A5] rounded-full shrink-0" />
                <div>
                  <strong className="text-text-primary block font-bold">Pemeliharaan Saluran Drainase</strong>
                  <span className="text-text-secondary text-[11px] leading-relaxed block mt-0.5">
                    Pembersihan rutin sedimen di drop structure dan silt trap untuk mencegah erosi alur (rill erosion) sepanjang jalan angkut tambang.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-1 w-1.5 h-1.5 bg-[#2F5A46] rounded-full shrink-0" />
                <div>
                  <strong className="text-text-primary block font-bold">Silt Fence & Silt Curtain</strong>
                  <span className="text-text-secondary text-[11px] leading-relaxed block mt-0.5">
                    Pasang silt fence di sepanjang kaki lereng timbunan disposal tanah pucuk (topsoil) untuk menahan erosi lembar (sheet erosion).
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            id="go-to-reclamation-btn"
            onClick={() => setCurrentTab('reclamation')}
            className="w-full py-3 rounded-xl bg-forest-50 hover:bg-[#DCE5DA] text-[#2F5A46] text-center text-xs font-bold transition-all border border-border-custom cursor-pointer flex items-center justify-center gap-1.5 mt-2"
          >
            Buka Modul Reklamasi Tambang & Nursery
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Compliance Event Calendar Section */}
      <div className="bg-white p-8 rounded-[20px] border border-border-custom shadow-custom text-left flex flex-col justify-between mt-8">
        <div className="flex items-center justify-between pb-4 border-b border-[#E6ECE6] mb-6">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-5 w-5 text-[#4D7C5A] stroke-[1.75]" />
            <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-primary">Jadwal Pelaporan & Audit Kepatuhan Lingkungan</h4>
          </div>
          <span className="text-xs text-text-secondary font-manrope font-bold uppercase tracking-wider">Semester 1</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {calendar.slice(0, 4).map(event => (
            <div key={event.id} className="p-5 rounded-[15px] border border-border-custom bg-forest-50/50 flex flex-col justify-between min-h-[150px] hover:bg-forest-50 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-text-secondary font-manrope font-bold uppercase tracking-wider">
                    {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase font-manrope tracking-wider ${
                    event.status === 'Completed' ? 'bg-[#3FA66B]/10 text-[#2F5A46] border border-[#3FA66B]/15' :
                    event.status === 'Overdue' ? 'bg-[#D95C5C]/10 text-[#9C3333] border border-[#D95C5C]/15 font-extrabold' : 'bg-[#E2A43B]/10 text-[#8F5E13] border border-[#E2A43B]/15'
                  }`}>
                    {event.status === 'Completed' ? 'Selesai' : event.status === 'Overdue' ? 'Terlewat' : 'Pending'}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-text-primary truncate">{event.title}</h5>
                <p className="text-[11px] text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">{event.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E6ECE6] flex items-center justify-between">
                <span className="text-[9.5px] text-text-secondary font-semibold font-manrope">Tipe: {event.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
