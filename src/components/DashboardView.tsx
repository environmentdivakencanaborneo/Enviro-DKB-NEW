/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
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
  Bar,
} from 'recharts';
import {
  WastewaterData,
  RainfallData,
  NurseryData,
  NurseryStockOut,
  ReclamationGuarantee,
  WasteStock,
  ComplianceCalendarEvent,
  EnvironmentalCost,
  SurfaceWaterData,
  SolidWasteData,
  EnvironmentalDocument,
  AlertNotification,
} from '../types';
import { calculateGuaranteeMetrics } from '../utils/guaranteeMetrics';
import {
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  CalendarDays,
  Coins,
  ArrowUpRight,
  Layers,
  CheckSquare,
  User,
  FileSpreadsheet,
} from 'lucide-react';
import MiningEnvIcon from './MiningEnvIcon';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import { INDONESIAN_REGULATIONS } from '../data/regulations';
import { computeDocumentStatus } from '../utils/documentStatus';
import { todayLocalISO } from '../utils/dateUtils';
import { useAuth } from '../services/authService';
import { NEON_CHART, NEON_TOOLTIP_CONTENT_STYLE } from '../utils/chartTheme';

// Custom Glass Tooltip for pH & TSS line charts
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel rounded-xl px-3.5 py-3 text-xs space-y-1.5 shadow-glow-cyan">
        <p className="font-bold text-neon-cyan font-mono border-b border-border-subtle pb-1 mb-1">
          Tanggal: {label}
        </p>
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
            isExceeded = val > 300;
            limitText = '(Baku Mutu: max 300 mg/L)';
          }

          return (
            <div key={index} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.color }} />
                <span className="text-text-mid font-medium">
                  {pld.name}:{' '}
                  <strong className={`font-mono tabular-nums ${isExceeded ? 'text-neon-red font-bold' : 'text-neon-green font-bold'}`}>
                    {val}
                  </strong>
                </span>
              </div>
              {limitText && (
                <span className="text-[10px] text-text-low ml-4 font-mono">{limitText}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// Custom Glass Tooltip for Rainfall line chart
const CustomRainfallTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-panel rounded-xl px-3.5 py-3 text-xs space-y-1.5 shadow-glow-cyan">
        <p className="font-bold text-neon-cyan font-mono border-b border-border-subtle pb-1 mb-1">
          Tanggal: {label}
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neon-cyan" />
          <span className="text-text-mid">
            Curah Hujan: <strong className="text-neon-cyan font-mono tabular-nums">{data.CurahHujan} mm</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neon-amber" />
          <span className="text-text-mid">
            Intensitas: <strong className="text-neon-amber font-mono tabular-nums">{data.Intensitas} mm/jam</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neon-violet" />
          <span className="text-text-mid">
            Cuaca: <strong className="text-text-hi">{data.weather}</strong>
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomMonthlyRainfallTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-panel rounded-xl px-3.5 py-3 text-xs space-y-2 shadow-glow-cyan">
        <p className="font-bold text-neon-cyan font-mono border-b border-border-subtle pb-1 mb-1">
          {data.fullName}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-text-mid">
              <span className="w-2 h-2 rounded-full bg-neon-cyan" />
              Curah Hujan:
            </span>
            <strong className="text-neon-cyan font-mono tabular-nums">{data.Rainfall} mm</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-text-mid">
              <span className="w-2 h-2 rounded-full bg-neon-violet" />
              Hari Hujan:
            </span>
            <strong className="text-neon-violet font-mono tabular-nums">{data.RainDays} Hari</strong>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border-subtle">
            <span className="flex items-center gap-1.5 text-text-mid">
              <span className="w-2 h-2 rounded-full bg-neon-amber" />
              Indeks Erosi:
            </span>
            <strong className="text-neon-amber font-mono tabular-nums">{data.ErosionIndex}%</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] text-text-low">Risiko Erosi:</span>
            <StatusBadge status={data.ErosionIndex > 75 ? 'Kritis' : data.ErosionIndex > 50 ? 'Mendekati' : data.ErosionIndex > 30 ? 'Dipantau' : 'Memenuhi'} label={data.RiskLevel} />
          </div>
        </div>
      </div>
    );
  }
  return null;
};

function MiniSparkline({
  data,
  color,
  gradId,
}: {
  data: { v: number }[];
  color: string;
  gradId: string;
}) {
  if (!data || data.length < 2) return null;
  return (
    <div className="h-9 w-24 shrink-0" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.38} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DashboardViewProps {
  wastewater: WastewaterData[];
  surfaceWater?: SurfaceWaterData[];
  solidWaste?: SolidWasteData[];
  documents?: EnvironmentalDocument[];
  alerts?: AlertNotification[];
  rainfall: RainfallData[];
  nursery: NurseryData[];
  nurseryStockOut: NurseryStockOut[];
  guarantees: ReclamationGuarantee[];
  wasteStocks: WasteStock[];
  calendar: ComplianceCalendarEvent[];
  environmentalCosts?: EnvironmentalCost[];
  solidWasteTargetPct?: number;
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
  nurseryStockOut,
  guarantees,
  wasteStocks,
  calendar,
  environmentalCosts = [],
  solidWasteTargetPct = 30,
  setCurrentTab,
}: DashboardViewProps) {
  const { user } = useAuth();
  const [chartMetric, setChartMetric] = useState<'ph' | 'tss' | 'combined' | 'rainfall'>('combined');

  // Calculations
  const totalSeedsIn = nursery.reduce((sum, x) => sum + x.quantity, 0);
  const totalSeedsOut = nurseryStockOut.reduce((sum, x) => sum + x.jumlahKeluar, 0);
  const totalSeeds = totalSeedsIn - totalSeedsOut;
  const guaranteeMetrics = calculateGuaranteeMetrics(guarantees);
  const totalGuaranteesValue = guaranteeMetrics.totalActiveValue;
  const activeGuaranteesCount = guaranteeMetrics.activeCount;

  const totalWaterTests = wastewater.length;
  const passedWaterTests = wastewater.filter(x => x.status === 'Safe').length;
  const warningWaterTests = wastewater.filter(x => x.status === 'Warning').length;
  const failedWaterTests = wastewater.filter(x => x.status === 'Exceeded').length;

  const waterComplianceRate =
    totalWaterTests > 0 ? Math.round(((passedWaterTests + warningWaterTests) / totalWaterTests) * 100) : 100;

  // Surface water stats
  const totalSurfaceWaterTests = surfaceWater.length;
  const failedSurfaceWaterTests = surfaceWater.filter(x => x.status === 'Exceeded').length;
  const surfaceWaterComplianceRate =
    totalSurfaceWaterTests > 0
      ? Math.round(((totalSurfaceWaterTests - failedSurfaceWaterTests) / totalSurfaceWaterTests) * 100)
      : 100;

  // Solid waste stats
  const totalSolidWasteRecycled = solidWaste.reduce((sum, x) => sum + x.recycledKg + x.compostedKg, 0);
  const totalSolidWasteGenerated = solidWaste.reduce(
    (sum, x) => sum + x.organicKg + x.inorganicKg + x.residueKg,
    0
  );
  const recyclingRate =
    totalSolidWasteGenerated > 0 ? Math.round((totalSolidWasteRecycled / totalSolidWasteGenerated) * 100) : 0;

  // Document stats
  const expiringDocuments = documents.filter(doc => {
    const status = computeDocumentStatus(doc.expiryDate);
    return status === 'Renewal Needed' || status === 'Expired';
  }).length;

  // Alerts stats
  const unreadAlerts = alerts.filter(a => {
    if (a.createdBy === 'system') {
      const email = user?.email || '';
      return !(a.readBy || []).includes(email) && !(a.clearedBy || []).includes(email);
    }
    return !a.read;
  }).length;

  // Real-time environmental costs metrics
  const totalOpexPlanned = environmentalCosts.reduce((sum, x) => sum + x.plannedOpex, 0);
  const totalOpexRealized = environmentalCosts.reduce((sum, x) => sum + x.realizedOpex, 0);
  const totalCapexPlanned = environmentalCosts.reduce((sum, x) => sum + x.plannedCapex, 0);
  const totalCapexRealized = environmentalCosts.reduce((sum, x) => sum + x.realizedCapex, 0);

  const totalCostPlan = totalOpexPlanned + totalCapexPlanned;
  const totalCostRealized = totalOpexRealized + totalCapexRealized;
  const costPercentage = totalCostPlan > 0 ? (totalCostRealized / totalCostPlan) * 100 : 0;

  // Find oldest B3 waste item
  const maxDaysB3 = wasteStocks.length > 0 ? Math.max(...wasteStocks.map(x => x.daysInTps)) : 0;
  const totalB3StockKg = wasteStocks.reduce((sum, x) => sum + Math.max(0, x.currentStock), 0);

  // Sparklines from real ordered datasets
  const waterSpark = useMemo(() => {
    return [...wastewater]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)
      .map(x => ({ v: Number(x.tss) || 0 }));
  }, [wastewater]);

  const surfaceSpark = useMemo(() => {
    return [...surfaceWater]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)
      .map(x => ({ v: Number(x.tss) || 0 }));
  }, [surfaceWater]);

  const solidWasteSpark = useMemo(() => {
    return [...solidWaste]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)
      .map(x => ({ v: Number(x.recycledKg + x.compostedKg) || 0 }));
  }, [solidWaste]);

  const rainfallSpark = useMemo(() => {
    return [...rainfall]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7)
      .map(x => ({ v: Number(x.rainfall) || 0 }));
  }, [rainfall]);

  // 30 days trend computation
  const get30DaysWastewaterData = () => {
    const refDate = new Date(todayLocalISO());
    const limitDate = new Date(refDate);
    limitDate.setDate(refDate.getDate() - 30);

    const filtered = wastewater.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= limitDate && itemDate <= refDate;
    });

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const get30DaysRainfallData = () => {
    const refDate = new Date(todayLocalISO());
    const limitDate = new Date(refDate);
    limitDate.setDate(refDate.getDate() - 30);

    const filtered = rainfall.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= limitDate && itemDate <= refDate;
    });

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const chartData30Days = get30DaysWastewaterData().map(x => ({
    date: x.date,
    label: new Date(x.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    pH: x.ph,
    TSS: x.tss,
    location: x.location,
    status: x.status,
  }));

  const rainfallData30Days = get30DaysRainfallData().map(x => ({
    date: x.date,
    label: new Date(x.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    CurahHujan: x.rainfall,
    Intensitas: x.intensity,
    weather: x.weather,
  }));

  const getLast12MonthsData = () => {
    const now = new Date(todayLocalISO());
    const monthsList: { month: string; name: string; year: number; mIndex: number }[] = [];
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      monthsList.push({
        month: `${monthShorts[mIdx]} ${String(yr).slice(-2)}`,
        name: monthNames[mIdx],
        year: yr,
        mIndex: mIdx,
      });
    }

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
      realGrouped[key].totalRainfall += item.rainfall || 0;
      realGrouped[key].count += 1;
    });

    return monthsList.map(item => {
      const key = `${item.mIndex}-${item.year}`;
      let totalRainfall = 0;
      let daysWithRain = 0;
      let isRealData = false;

      if (realGrouped[key]) {
        totalRainfall = Number(realGrouped[key].totalRainfall.toFixed(1));
        daysWithRain = realGrouped[key].count;
        isRealData = true;
      }

      const erosionRiskIndex = Math.min(100, Math.round((totalRainfall / 300) * 100));
      let riskLevel = 'Rendah';
      if (erosionRiskIndex > 75) riskLevel = 'Sangat Tinggi';
      else if (erosionRiskIndex > 50) riskLevel = 'Tinggi';
      else if (erosionRiskIndex > 30) riskLevel = 'Sedang';

      return {
        month: item.month,
        fullName: `${item.name} ${item.year}`,
        Rainfall: totalRainfall,
        RainDays: daysWithRain,
        ErosionIndex: erosionRiskIndex,
        RiskLevel: riskLevel,
        isReal: isRealData,
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
          Selesai: 0,
          'Pending/Overdue': 0,
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
          label: formattedMonth,
        };
      })
      .slice(-6);
  };

  const calendarChartData = processCalendarChartData();

  return (
    <div id="dashboard-view-wrapper" className="space-y-6">
      {/* Hero Banner - Neon Mining Ops */}
      <div className="neon-card p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 text-left">
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-neon-green/10 rounded-2xl border border-neon-green/30 shrink-0 shadow-glow-green">
            <MiningEnvIcon type="emblem" size={44} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono tracking-widest text-neon-cyan font-bold uppercase bg-neon-cyan/10 px-2.5 py-0.5 rounded-full border border-neon-cyan/30">
                Site Coal Mining Operation
              </span>
              <span className="text-[11px] text-text-mid font-mono tabular-nums">
                {todayLocalISO()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-hi font-heading">
              PT Diva Kencana Borneo
            </h1>
            <p className="text-xs text-text-mid max-w-xl leading-relaxed">
              Sistem Pemantauan Lingkungan Tambang Terpadu — Kualitas Air KPL, Neraca TPS B3, Curah Hujan &amp; Reklamasi Progresif.
            </p>
          </div>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentTab('monitoring')}
            className="px-3.5 py-2 bg-bg-2/80 hover:bg-neon-cyan/10 border border-border-neon hover:border-neon-cyan/50 rounded-xl text-xs font-semibold text-text-hi transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <MiningEnvIcon type="water-kpl" size={16} />
            Input Air KPL
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('monitoring')}
            className="px-3.5 py-2 bg-bg-2/80 hover:bg-neon-cyan/10 border border-border-neon hover:border-neon-cyan/50 rounded-xl text-xs font-semibold text-text-hi transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <MiningEnvIcon type="rainfall" size={16} />
            Catat Hujan
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('waste')}
            className="px-3.5 py-2 bg-bg-2/80 hover:bg-neon-cyan/10 border border-border-neon hover:border-neon-cyan/50 rounded-xl text-xs font-semibold text-text-hi transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <MiningEnvIcon type="tps-b3" size={16} />
            Cek Stok TPS B3
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('reports')}
            className="neon-btn-primary px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Cetak Laporan
          </button>
        </div>

        <div className="absolute -right-10 -bottom-10 w-52 h-52 rounded-full bg-neon-cyan/10 blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Compliance Air Limbah */}
        <motion.div
          id="kpi-water-compliance"
          onClick={() => setCurrentTab('monitoring')}
          className="neon-card p-5 flex flex-col justify-between cursor-pointer text-left group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          title="Klik untuk buka Pemantauan Air Limbah"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <MiningEnvIcon type="water-kpl" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-text-mid uppercase tracking-wider block truncate">
                Compliance Air KPL
              </span>
              <div className="flex items-end justify-between gap-2 mt-1">
                <span className="text-3xl font-bold font-mono tabular-nums text-text-hi tracking-tight leading-none">
                  <AnimatedCounter value={waterComplianceRate} format={v => Math.round(v) + '%'} />
                </span>
                <MiniSparkline data={waterSpark} color={NEON_CHART.cyan} gradId="spark-water" />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <StatusBadge
              status={failedWaterTests > 0 ? 'Mendekati' : 'Memenuhi'}
              label={`${passedWaterTests} Aman`}
            />
            {failedWaterTests > 0 ? (
              <span className="text-[11px] font-bold text-neon-red font-mono tabular-nums">
                {failedWaterTests} Melebihi
              </span>
            ) : (
              <span className="text-[10px] text-text-low font-mono">Baku Mutu Terpenuhi</span>
            )}
          </div>
        </motion.div>

        {/* Card 2: Nursery Stocks */}
        <motion.div
          id="kpi-nursery"
          onClick={() => setCurrentTab('reclamation')}
          className="neon-card p-5 flex flex-col justify-between cursor-pointer text-left group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          title="Klik untuk buka Modul Reklamasi & Nursery"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-green/10 border border-neon-green/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <MiningEnvIcon type="reclamation" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-text-mid uppercase tracking-wider block truncate">
                Stok Bibit Reklamasi
              </span>
              <span className="text-3xl font-bold font-mono tabular-nums text-text-hi mt-1 tracking-tight leading-none block truncate">
                {totalSeeds.toLocaleString('id-ID')}{' '}
                <span className="text-sm font-semibold text-text-mid">Btg</span>
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <StatusBadge
              status="Memenuhi"
              label={`${nursery.filter(x => x.status === 'Healthy').length} Spesies Sehat`}
            />
            <span className="text-[10px] text-text-low font-mono">Siap Tanam</span>
          </div>
        </motion.div>

        {/* Card 3: Sisa Stok TPS B3 */}
        <motion.div
          id="kpi-b3-safety"
          onClick={() => setCurrentTab('waste')}
          className="neon-card p-5 flex flex-col justify-between cursor-pointer text-left group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          title="Klik untuk buka Modul Limbah B3 TPS"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-amber/10 border border-neon-amber/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <MiningEnvIcon type="tps-b3" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-text-mid uppercase tracking-wider block truncate">
                Sisa Stok TPS B3
              </span>
              <span className="text-3xl font-bold font-mono tabular-nums text-text-hi mt-1 tracking-tight leading-none block truncate">
                {totalB3StockKg.toLocaleString('id-ID')}{' '}
                <span className="text-sm font-semibold text-text-mid">Kg</span>
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <StatusBadge
              status={maxDaysB3 >= 80 ? 'Tidak Memenuhi' : maxDaysB3 >= 60 ? 'Mendekati' : 'Dipantau'}
              label={`${maxDaysB3} Hari di TPS`}
            />
            <span className="text-[10px] text-text-mid font-mono tabular-nums">
              Sisa {Math.max(0, 90 - maxDaysB3)} Hari
            </span>
          </div>
        </motion.div>

        {/* Card 4: Reclamation Escrow */}
        <motion.div
          id="kpi-guarantee"
          onClick={() => setCurrentTab('reclamation')}
          className="neon-card p-5 flex flex-col justify-between cursor-pointer text-left group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          title="Klik untuk buka Jaminan Reklamasi"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-violet/10 border border-neon-violet/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <MiningEnvIcon type="compliance" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-text-mid uppercase tracking-wider block truncate">
                Jaminan Reklamasi
              </span>
              <span className="text-3xl font-bold font-mono tabular-nums text-text-hi mt-1 tracking-tight leading-none block truncate">
                Rp {(totalGuaranteesValue / 1000000000).toFixed(1)}M
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <StatusBadge
              status={activeGuaranteesCount > 0 ? 'Memenuhi' : 'Perlu Verifikasi'}
              label={`${activeGuaranteesCount} Dokumen`}
            />
            <span className="text-[10px] text-text-low font-mono truncate">Kepmen ESDM 344.K/2025</span>
          </div>
        </motion.div>

        {/* Card 5: Surface Water Compliance */}
        <motion.div
          id="kpi-surface-water"
          onClick={() => setCurrentTab('reports')}
          className="neon-card p-5 flex flex-col justify-between cursor-pointer text-left group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          title="Klik untuk buka Laporan Kualitas Air Permukaan"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <MiningEnvIcon type="surface-water" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-text-mid uppercase tracking-wider block truncate">
                Air Permukaan (Sungai)
              </span>
              <div className="flex items-end justify-between gap-2 mt-1">
                <span className="text-3xl font-bold font-mono tabular-nums text-text-hi tracking-tight leading-none">
                  <AnimatedCounter value={surfaceWaterComplianceRate} format={v => Math.round(v) + '%'} />
                </span>
                <MiniSparkline data={surfaceSpark} color={NEON_CHART.green} gradId="spark-surface" />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <StatusBadge
              status={failedSurfaceWaterTests > 0 ? 'Mendekati' : 'Memenuhi'}
              label={`${totalSurfaceWaterTests - failedSurfaceWaterTests} Titik Aman`}
            />
            <span className="text-[10px] text-text-low font-mono">PP 22/2021 Kelas II</span>
          </div>
        </motion.div>

        {/* Card 6: Solid Waste Recycling */}
        <motion.div
          id="kpi-solid-waste"
          onClick={() => setCurrentTab('solid_waste')}
          className="neon-card p-5 flex flex-col justify-between cursor-pointer text-left group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          title="Klik untuk buka Pengolahan Sampah Non-B3"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-green/10 border border-neon-green/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <MiningEnvIcon type="solid-waste" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-text-mid uppercase tracking-wider block truncate">
                Daur Ulang Sampah
              </span>
              <div className="flex items-end justify-between gap-2 mt-1">
                <span className="text-3xl font-bold font-mono tabular-nums text-text-hi tracking-tight leading-none">
                  {recyclingRate}%
                </span>
                <MiniSparkline data={solidWasteSpark} color={NEON_CHART.violet} gradId="spark-solid" />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <StatusBadge
              status={recyclingRate >= solidWasteTargetPct ? 'Memenuhi' : 'Dipantau'}
              label={`${totalSolidWasteRecycled.toLocaleString('id-ID')} Kg`}
            />
            <span
              className="text-[10px] text-text-low font-mono truncate"
              title="Target internal perusahaan (mengacu arah Jakstranas; perlu penetapan manajemen)"
            >
              Target {solidWasteTargetPct}% • UU 18/2008
            </span>
          </div>
        </motion.div>

        {/* Card 7: Expiring Documents */}
        <motion.div
          id="kpi-documents"
          onClick={() => setCurrentTab('documents')}
          className="neon-card p-5 flex flex-col justify-between cursor-pointer text-left group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          title="Klik untuk buka Modul Dokumen & Izin Lingkungan"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-amber/10 border border-neon-amber/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <MiningEnvIcon type="compliance" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-text-mid uppercase tracking-wider block truncate">
                Izin Lingkungan &amp; AMDAL
              </span>
              <span className="text-3xl font-bold font-mono tabular-nums text-text-hi mt-1 tracking-tight leading-none block">
                {documents.length} <span className="text-sm font-semibold text-text-mid">Dok</span>
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <StatusBadge
              status={expiringDocuments > 0 ? 'Mendekati' : 'Memenuhi'}
              label={expiringDocuments > 0 ? `${expiringDocuments} Perpanjang` : 'Izin Aktif'}
            />
            <span className="text-[10px] text-text-low font-mono">PP 28/2025</span>
          </div>
        </motion.div>

        {/* Card 8: Unread Alerts */}
        <motion.div
          id="kpi-alerts"
          onClick={() => setCurrentTab('notifications')}
          className="neon-card p-5 flex flex-col justify-between cursor-pointer text-left group"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
          title="Klik untuk buka Notifikasi Kepatuhan"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/25 group-hover:scale-105 transition-transform duration-200 shrink-0">
              <MiningEnvIcon type="rainfall" size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-text-mid uppercase tracking-wider block truncate">
                Peringatan Dini
              </span>
              <div className="flex items-end justify-between gap-2 mt-1">
                <span className="text-3xl font-bold font-mono tabular-nums text-text-hi tracking-tight leading-none">
                  {unreadAlerts} <span className="text-sm font-semibold text-text-mid">Baru</span>
                </span>
                <MiniSparkline data={rainfallSpark} color={NEON_CHART.amber} gradId="spark-rain" />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 text-xs">
            <StatusBadge
              status={unreadAlerts > 0 ? 'Tidak Memenuhi' : 'Memenuhi'}
              label={unreadAlerts > 0 ? 'Tindakan Perlu' : 'Sistem Normal'}
            />
            <span className="text-[10px] text-text-low font-mono">Sensor Site</span>
          </div>
        </motion.div>
      </div>

      {/* Team Compliance Tasks Summary */}
      <div
        id="bento-compliance-tasks"
        className="glass-panel p-6 sm:p-8 rounded-[20px] text-left relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5 mb-6">
          <div>
            <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-hi flex items-center gap-2.5 font-heading">
              <CheckSquare className="h-5 w-5 text-neon-cyan stroke-[1.75]" />
              Tugas Agenda Kepatuhan Tim
            </h4>
            <p className="text-xs text-text-mid mt-0.5">
              Pemantauan progres penugasan agenda kepatuhan kepada anggota tim
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {calendar.filter(c => c.assignedTo && c.status !== 'Completed').length > 0 ? (
            calendar
              .filter(c => c.assignedTo && c.status !== 'Completed')
              .map(task => (
                <div
                  key={task.id}
                  className="p-5 rounded-2xl border border-border-subtle bg-bg-2/60 flex flex-col justify-between hover:border-neon-cyan/40 transition-colors duration-200"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-[10px] font-bold text-text-mid uppercase font-mono">
                        {task.type}
                      </span>
                      <StatusBadge
                        status={task.status === 'Pending' ? 'Mendekati' : 'Tidak Memenuhi'}
                        label={task.status}
                      />
                    </div>
                    <h5 className="text-sm font-bold text-text-hi mb-2 line-clamp-2 leading-snug">
                      {task.title}
                    </h5>
                    <div className="flex items-center gap-1.5 text-xs text-text-mid mt-3">
                      <User className="h-4 w-4 text-neon-cyan stroke-[1.75]" />
                      <span className="font-semibold text-text-hi">{task.assignedTo}</span>
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex justify-between items-center text-[11px] font-bold mb-1.5">
                      <span className="text-text-mid">Progres Penyelesaian</span>
                      <span className="text-neon-cyan font-mono tabular-nums">{task.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-bg-0 rounded-full overflow-hidden border border-border-subtle">
                      <div
                        className={`h-full transition-all duration-300 ${
                          (task.progress || 0) < 30
                            ? 'bg-neon-amber'
                            : (task.progress || 0) < 70
                            ? 'bg-neon-cyan'
                            : 'bg-neon-green'
                        }`}
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                icon={CheckSquare}
                title="Tidak ada tugas kepatuhan aktif"
                description="Semua agenda kepatuhan tim telah selesai atau belum ada penugasan baru."
              />
            </div>
          )}
        </div>

        {/* Compliance trend chart */}
        <div className="mt-8 pt-6 border-t border-border-subtle">
          <h5 className="text-xs font-bold text-text-hi uppercase tracking-wider mb-4 flex items-center gap-2 font-heading">
            <Layers className="h-4 w-4 text-neon-cyan stroke-[1.75]" />
            Tren Kepatuhan Lingkungan Bulanan
          </h5>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calendarChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: NEON_CHART.tickFill, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fill: NEON_CHART.tickFill, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(0, 240, 255, 0.05)' }}
                  contentStyle={NEON_TOOLTIP_CONTENT_STYLE}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '15px', color: NEON_CHART.tickFill }} />
                <Bar dataKey="Selesai" stackId="a" fill={NEON_CHART.green} radius={[0, 0, 4, 4]} />
                <Bar dataKey="Pending/Overdue" stackId="a" fill={NEON_CHART.violet} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Synchronized Environmental Costs Bento Summary */}
      <div
        id="bento-environmental-costs"
        className="glass-panel p-6 sm:p-8 rounded-[20px] text-left relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5 mb-6">
          <div>
            <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-hi flex items-center gap-2.5 font-heading">
              <Coins className="h-5 w-5 text-neon-cyan stroke-[1.75]" />
              Realisasi Anggaran &amp; Biaya Pengelolaan Lingkungan Hidup
            </h4>
            <p className="text-xs text-text-mid mt-0.5">
              Sinkronisasi data real-time dengan pencatatan pengeluaran opex &amp; capex
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('costs')}
            className="flex items-center gap-1.5 text-xs text-neon-cyan font-bold hover:bg-neon-cyan/10 transition-all bg-bg-2/80 px-4 py-2 rounded-xl border border-border-neon cursor-pointer"
          >
            Detil Anggaran &amp; Input
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Total Completion Progress */}
          <div className="bg-bg-2/60 p-5 rounded-2xl border border-border-subtle flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-text-mid tracking-wider font-bold uppercase font-mono">
                Persentase Pemakaian
              </span>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold font-mono tabular-nums text-neon-cyan">
                  {costPercentage.toFixed(1)}%
                </h3>
                <span className="text-xs text-text-mid font-medium">dari Pagu</span>
              </div>
            </div>

            <div className="space-y-2.5 mt-5">
              <div className="w-full h-2 bg-bg-0 rounded-full overflow-hidden border border-border-subtle">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    costPercentage > 100 ? 'bg-neon-red' : 'bg-neon-cyan'
                  }`}
                  style={{ width: `${Math.min(100, costPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono tabular-nums text-text-mid">
                <span>Pagu Total Rencana:</span>
                <span className="font-bold text-text-hi">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(totalCostPlan)}
                </span>
              </div>
            </div>
          </div>

          {/* Opex summary */}
          <div className="bg-bg-2/60 p-5 rounded-2xl border border-border-subtle flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-text-mid tracking-wider font-bold uppercase font-mono">
                Penyaluran OPEX (Key Kegiatan)
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <h3 className="text-xl font-bold font-mono tabular-nums text-text-hi">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(totalOpexRealized)}
                </h3>
                <StatusBadge
                  status="Memenuhi"
                  label={`${totalOpexPlanned > 0 ? ((totalOpexRealized / totalOpexPlanned) * 100).toFixed(0) : 0}%`}
                />
              </div>
            </div>

            <div className="text-[11px] text-text-mid space-y-1.5 mt-5 border-t border-border-subtle pt-3 font-mono tabular-nums">
              <div className="flex justify-between">
                <span>Rencana OPEX:</span>
                <span className="font-bold text-text-hi">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(totalOpexPlanned)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sisa Anggaran:</span>
                <span className="font-bold text-text-hi">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(Math.max(0, totalOpexPlanned - totalOpexRealized))}
                </span>
              </div>
            </div>
          </div>

          {/* Capex summary */}
          <div className="bg-bg-2/60 p-5 rounded-2xl border border-border-subtle flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-text-mid tracking-wider font-bold uppercase font-mono">
                Investasi CAPEX (Aset LH)
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <h3 className="text-xl font-bold font-mono tabular-nums text-text-hi">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(totalCapexRealized)}
                </h3>
                <StatusBadge
                  status="Dipantau"
                  label={`${totalCapexPlanned > 0 ? ((totalCapexRealized / totalCapexPlanned) * 100).toFixed(0) : 0}%`}
                />
              </div>
            </div>

            <div className="text-[11px] text-text-mid space-y-1.5 mt-5 border-t border-border-subtle pt-3 font-mono tabular-nums">
              <div className="flex justify-between">
                <span>Rencana CAPEX:</span>
                <span className="font-bold text-text-hi">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(totalCapexPlanned)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sisa Anggaran:</span>
                <span className="font-bold text-text-hi">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(Math.max(0, totalCapexPlanned - totalCapexRealized))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Regulatory compliance widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Interactive Recharts Line Chart */}
        <div
          id="dashboard-trend-panel"
          className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-[20px] text-left flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
            <div>
              <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-hi font-heading">
                Tren Parameter 30 Hari Terakhir
              </h4>
              <p className="text-xs text-text-mid mt-0.5">
                Analisis tren parameter air limbah guna deteksi dini penyimpangan baku mutu
              </p>
            </div>
            {/* Metric Switchers */}
            <div className="flex flex-wrap items-center gap-1.5 bg-bg-0 p-1 rounded-xl border border-border-neon">
              {[
                { id: 'combined', label: 'pH & TSS (Gabungan)' },
                { id: 'ph', label: 'pH Air' },
                { id: 'tss', label: 'TSS (mg/L)' },
                { id: 'rainfall', label: 'Curah Hujan' },
              ].map(btn => (
                <button
                  key={btn.id}
                  id={`chart-metric-${btn.id}`}
                  type="button"
                  onClick={() => setChartMetric(btn.id as any)}
                  className={`px-3 py-1.5 text-[11px] rounded-lg font-semibold transition-all cursor-pointer ${
                    chartMetric === btn.id
                      ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 font-bold'
                      : 'text-text-mid hover:text-text-hi border border-transparent'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Render Recharts Line Graph for 30 days trend */}
          <div className="py-6 h-64 relative flex items-center justify-center">
            {(chartMetric === 'rainfall' ? rainfallData30Days.length : chartData30Days.length) === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Belum ada data 30 hari terakhir"
                description="Catat pengamatan harian untuk melihat grafik tren dan garis batas regulasi."
              />
            ) : (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === 'combined' ? (
                    <LineChart data={chartData30Days} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                      <XAxis dataKey="label" stroke={NEON_CHART.tickFill} fontSize={10} tickLine={false} />
                      <YAxis yAxisId="left" domain={[4, 10]} stroke={NEON_CHART.cyan} fontSize={10} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke={NEON_CHART.violet} fontSize={10} tickLine={false} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10, color: NEON_CHART.tickFill }} />

                      <ReferenceLine
                        yAxisId="left"
                        y={6}
                        stroke={NEON_CHART.red}
                        strokeDasharray="4 4"
                        label={{ value: 'pH Min (6.0)', position: 'insideBottomLeft', fill: NEON_CHART.red, fontSize: 9 }}
                      />
                      <ReferenceLine
                        yAxisId="left"
                        y={9}
                        stroke={NEON_CHART.red}
                        strokeDasharray="4 4"
                        label={{ value: 'pH Max (9.0)', position: 'insideTopLeft', fill: NEON_CHART.red, fontSize: 9 }}
                      />
                      <ReferenceLine
                        yAxisId="right"
                        y={300}
                        stroke={NEON_CHART.red}
                        strokeDasharray="4 4"
                        label={{ value: 'Batas TSS (300 mg/L)', position: 'insideTopRight', fill: NEON_CHART.red, fontSize: 9 }}
                      />

                      <Line yAxisId="left" type="monotone" dataKey="pH" name="pH" stroke={NEON_CHART.cyan} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="TSS" name="TSS" stroke={NEON_CHART.violet} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                    </LineChart>
                  ) : chartMetric === 'ph' ? (
                    <LineChart data={chartData30Days} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                      <XAxis dataKey="label" stroke={NEON_CHART.tickFill} fontSize={10} tickLine={false} />
                      <YAxis domain={[4, 10]} stroke={NEON_CHART.cyan} fontSize={10} tickLine={false} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10, color: NEON_CHART.tickFill }} />

                      <ReferenceLine
                        y={6}
                        stroke={NEON_CHART.red}
                        strokeDasharray="4 4"
                        label={{ value: 'pH Min (6.0)', position: 'insideBottomLeft', fill: NEON_CHART.red, fontSize: 9 }}
                      />
                      <ReferenceLine
                        y={9}
                        stroke={NEON_CHART.red}
                        strokeDasharray="4 4"
                        label={{ value: 'pH Max (9.0)', position: 'insideTopLeft', fill: NEON_CHART.red, fontSize: 9 }}
                      />

                      <Line type="monotone" dataKey="pH" name="pH" stroke={NEON_CHART.cyan} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                    </LineChart>
                  ) : chartMetric === 'tss' ? (
                    <LineChart data={chartData30Days} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                      <XAxis dataKey="label" stroke={NEON_CHART.tickFill} fontSize={10} tickLine={false} />
                      <YAxis stroke={NEON_CHART.violet} fontSize={10} tickLine={false} />
                      <RechartsTooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10, color: NEON_CHART.tickFill }} />

                      <ReferenceLine
                        y={300}
                        stroke={NEON_CHART.red}
                        strokeDasharray="4 4"
                        label={{ value: 'Batas TSS (300 mg/L)', position: 'insideTopRight', fill: NEON_CHART.red, fontSize: 9 }}
                      />

                      <Line type="monotone" dataKey="TSS" name="TSS" stroke={NEON_CHART.violet} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <LineChart data={rainfallData30Days} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                      <XAxis dataKey="label" stroke={NEON_CHART.tickFill} fontSize={10} tickLine={false} />
                      <YAxis stroke={NEON_CHART.green} fontSize={10} tickLine={false} />
                      <RechartsTooltip content={<CustomRainfallTooltip />} />
                      <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10, color: NEON_CHART.tickFill }} />

                      <Line
                        type="monotone"
                        dataKey="CurahHujan"
                        name="Curah Hujan (mm)"
                        stroke={NEON_CHART.green}
                        strokeWidth={2.5}
                        activeDot={{ r: 6 }}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-bg-2/70 px-4 py-3 rounded-xl border border-border-subtle flex items-center justify-between text-xs text-text-mid">
            <span className="flex items-center gap-1.5 font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-neon-cyan" />
              Menampilkan data tren {chartMetric === 'rainfall' ? rainfallData30Days.length : chartData30Days.length} hari pengamatan terakhir.
            </span>
            <span className="text-[10px] font-mono text-text-low uppercase tracking-wider font-semibold">
              Telemetry Stream
            </span>
          </div>
        </div>

        {/* Dynamic Indonesian Environmental Legislation Matcher */}
        <div
          id="compliance-regulatory-widget"
          className="glass-panel p-6 sm:p-8 rounded-[20px] text-left flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-hi flex items-center gap-2 font-heading">
                <ShieldAlert className="h-5 w-5 text-neon-cyan stroke-[1.75]" />
                Status Regulasi (ESD)
              </h4>
              <p className="text-xs text-text-mid mt-0.5">Parameter baku mutu terintegrasi UU &amp; Permen RI</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentTab('compliance_matrix')}
              className="text-[11px] font-bold text-neon-cyan hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              Matriks
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3.5 my-5 overflow-y-auto max-h-72 pr-1">
            {INDONESIAN_REGULATIONS.map(reg => (
              <div
                key={reg.id}
                className="p-4 bg-bg-2/60 rounded-2xl border border-border-subtle hover:border-neon-cyan/40 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <h5 className="text-xs font-bold text-text-hi leading-tight">{reg.title}</h5>
                  <span className="text-[9px] bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 px-2 py-0.5 rounded-full font-mono font-semibold whitespace-nowrap">
                    {reg.category}
                  </span>
                </div>
                <p className="text-[11px] text-text-mid mt-1.5 leading-relaxed">{reg.description}</p>
                {reg.parameters && reg.parameters.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {reg.parameters.map((param, pi) => (
                      <span
                        key={pi}
                        className="text-[9.5px] bg-bg-0 text-text-hi font-mono font-semibold border border-border-neon px-2 py-0.5 rounded-md tabular-nums"
                      >
                        {param.name}: {param.limit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 12-Month Rainfall & Erosion Trend Analysis */}
      <div id="erosion-rainfall-trend-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rainfall Line Chart */}
        <div
          id="rainfall-trend-panel"
          className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-[20px] text-left flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
            <div>
              <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-hi flex items-center gap-2 font-heading">
                <TrendingUp className="h-5 w-5 text-neon-cyan stroke-[1.75]" />
                Tren Curah Hujan Bulanan (1 Tahun Terakhir)
              </h4>
              <p className="text-xs text-text-mid mt-0.5">
                Analisis fluktuasi presipitasi bulanan terintegrasi guna mendukung estimasi laju erosi tanah
              </p>
            </div>
            <div className="flex items-center gap-3 bg-bg-2/80 px-3.5 py-1.5 rounded-xl border border-border-subtle text-[11px] text-text-mid font-mono font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 bg-neon-cyan rounded-full" />
                Curah Hujan (mm)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 bg-neon-amber rounded-full" />
                Indeks Erosi (%)
              </span>
            </div>
          </div>

          <div className="py-6 h-64 relative flex items-center justify-center">
            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last12MonthsRainfall} margin={{ top: 15, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                  <XAxis dataKey="month" stroke={NEON_CHART.tickFill} fontSize={10} tickLine={false} />
                  <YAxis yAxisId="left" stroke={NEON_CHART.cyan} fontSize={10} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke={NEON_CHART.amber} fontSize={10} tickLine={false} />
                  <RechartsTooltip content={<CustomMonthlyRainfallTooltip />} />
                  <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 10, color: NEON_CHART.tickFill }} />

                  <ReferenceLine
                    yAxisId="left"
                    y={250}
                    stroke={NEON_CHART.red}
                    strokeDasharray="4 4"
                    label={{ value: 'Sangat Basah (>250mm)', position: 'insideBottomLeft', fill: NEON_CHART.red, fontSize: 9 }}
                  />

                  <Line yAxisId="left" type="monotone" dataKey="Rainfall" name="Curah Hujan (mm)" stroke={NEON_CHART.cyan} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="ErosionIndex" name="Indeks Erosi (%)" stroke={NEON_CHART.amber} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-bg-2/70 px-4 py-3.5 rounded-xl border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-mid">
            <span className="flex items-center gap-2 font-medium">
              <span className="h-2 w-2 rounded-full bg-neon-cyan shrink-0" />
              <span>Tren akumulasi curah hujan menunjukkan risiko erosi tertinggi pada bulan-bulan puncak musim basah.</span>
            </span>
            <span className="text-[10px] font-mono text-text-low uppercase tracking-wider font-semibold">
              Sistem Monitoring Hidrologi DKB
            </span>
          </div>
        </div>

        {/* Erosion hazard mitigation panel */}
        <div
          id="erosion-mitigation-panel"
          className="glass-panel p-6 sm:p-8 rounded-[20px] text-left flex flex-col justify-between"
        >
          <div>
            <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-hi flex items-center gap-2 font-heading">
              <AlertTriangle className="h-5 w-5 text-neon-amber stroke-[1.75]" />
              Rekomendasi Kontrol Erosi
            </h4>
            <p className="text-xs text-text-mid mt-0.5">Tindakan preventif berdasarkan tren hidrologi tahunan</p>
          </div>

          <div className="my-5 space-y-4 flex-1 overflow-y-auto max-h-72 pr-1">
            <div className="p-4 bg-neon-red/10 rounded-2xl border border-neon-red/30">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neon-red font-mono">
                  Kerawanan Tertinggi
                </span>
                <StatusBadge
                  status="Tidak Memenuhi"
                  label={highestRainfallMonth?.fullName || 'April 2026'}
                />
              </div>
              <p className="text-xs text-text-hi mt-2 font-bold font-mono tabular-nums">
                Puncak Curah Hujan: {highestRainfallMonth?.Rainfall} mm
              </p>
              <p className="text-[11px] text-text-mid mt-1 leading-relaxed">
                Potensi limpasan air permukaan ekstrem. Diperlukan penguatan tanggul settling pond dan pembersihan sedimen trap sebelum bulan ini.
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-text-mid">
              <div className="flex items-start gap-2.5">
                <div className="mt-1.5 w-1.5 h-1.5 bg-neon-green rounded-full shrink-0" />
                <div>
                  <strong className="text-text-hi block font-bold">Penanaman Cover Crop (LCC)</strong>
                  <span className="text-text-mid text-[11px] leading-relaxed block mt-0.5">
                    Segera lakukan hydroseeding pada lereng bekas tambang di area disposal sebelum masuk ke musim basah untuk menstabilkan struktur tanah.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-1.5 w-1.5 h-1.5 bg-neon-cyan rounded-full shrink-0" />
                <div>
                  <strong className="text-text-hi block font-bold">Pemeliharaan Saluran Drainase</strong>
                  <span className="text-text-mid text-[11px] leading-relaxed block mt-0.5">
                    Pembersihan rutin sedimen di drop structure dan silt trap untuk mencegah erosi alur (rill erosion) sepanjang jalan angkut tambang.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-1.5 w-1.5 h-1.5 bg-neon-violet rounded-full shrink-0" />
                <div>
                  <strong className="text-text-hi block font-bold">Silt Fence &amp; Silt Curtain</strong>
                  <span className="text-text-mid text-[11px] leading-relaxed block mt-0.5">
                    Pasang silt fence di sepanjang kaki lereng timbunan disposal tanah pucuk (topsoil) untuk menahan erosi lembar (sheet erosion).
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            id="go-to-reclamation-btn"
            type="button"
            onClick={() => setCurrentTab('reclamation')}
            className="w-full py-3 rounded-xl bg-bg-2/80 hover:bg-neon-cyan/10 text-neon-cyan text-center text-xs font-bold transition-all border border-border-neon cursor-pointer flex items-center justify-center gap-1.5 mt-2"
          >
            Buka Modul Reklamasi Tambang &amp; Nursery
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Compliance Event Calendar Section */}
      <div className="glass-panel p-6 sm:p-8 rounded-[20px] text-left flex flex-col justify-between">
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-5 w-5 text-neon-cyan stroke-[1.75]" />
            <h4 className="text-[15px] font-bold uppercase tracking-wider text-text-hi font-heading">
              Jadwal Pelaporan &amp; Audit Kepatuhan Lingkungan
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('documents')}
            className="text-xs text-neon-cyan hover:underline font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            Kelola Dokumen &amp; Jadwal
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {calendar.slice(0, 4).map(event => (
            <div
              key={event.id}
              className="p-5 rounded-2xl border border-border-subtle bg-bg-2/60 flex flex-col justify-between min-h-[150px] hover:border-neon-cyan/40 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] text-text-mid font-mono font-bold uppercase tracking-wider tabular-nums">
                    {new Date(event.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <StatusBadge
                    status={
                      event.status === 'Completed'
                        ? 'Memenuhi'
                        : event.status === 'Overdue'
                        ? 'Tidak Memenuhi'
                        : 'Mendekati'
                    }
                    label={event.status === 'Completed' ? 'Selesai' : event.status === 'Overdue' ? 'Terlewat' : 'Pending'}
                  />
                </div>
                <h5 className="text-xs font-bold text-text-hi truncate">{event.title}</h5>
                <p className="text-[11px] text-text-mid mt-1.5 line-clamp-2 leading-relaxed">{event.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
                <span className="text-[10px] text-text-low font-mono font-semibold">Tipe: {event.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
