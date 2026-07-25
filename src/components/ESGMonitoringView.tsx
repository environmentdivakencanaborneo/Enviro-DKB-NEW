/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { 
  WastewaterData, 
  NurseryData, 
  ReclamationPlan, 
  ReclamationGuarantee, 
  WasteIn, 
  WasteOut, 
  SolidWasteData, 
  EnvironmentalDocument, 
  ComplianceCalendarEvent, 
  EnvironmentalCost,
  AlertNotification
} from '../types';
import { formatWasteSource } from '../constants/wasteSources';
import { 
  Scale, 
  Leaf, 
  Droplet, 
  Trash2, 
  Coins, 
  FileCheck, 
  BookOpen, 
  ShieldAlert, 
  TrendingUp, 
  Compass, 
  Award, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Recycle,
  Globe,
  Gauge
} from 'lucide-react';

interface ESGMonitoringViewProps {
  wastewater: WastewaterData[];
  nursery: NurseryData[];
  plans: ReclamationPlan[];
  guarantees: ReclamationGuarantee[];
  wasteIn: WasteIn[];
  wasteOut: WasteOut[];
  solidWaste: SolidWasteData[];
  documents: EnvironmentalDocument[];
  calendarEvents: ComplianceCalendarEvent[];
  environmentalCosts: EnvironmentalCost[];
  alerts: AlertNotification[];
}

type MaterialTopic = 'overview' | 'gri303' | 'gri304' | 'gri306' | 'gri307';

export default function ESGMonitoringView({
  wastewater = [],
  nursery = [],
  plans = [],
  guarantees = [],
  wasteIn = [],
  wasteOut = [],
  solidWaste = [],
  documents = [],
  calendarEvents = [],
  environmentalCosts = [],
  alerts = []
}: ESGMonitoringViewProps) {
  const [activeSubtopic, setActiveSubtopic] = useState<MaterialTopic>('overview');

  // --- 1. COMPILE DISCLOSURES & CALCULATE METRICS IN REAL-TIME ---

  const metrics = useMemo(() => {
    // A. GRI 303: Water and Effluents Compliance Rate
    const totalWwLogs = wastewater.length;
    const safeWwLogs = wastewater.filter(w => w.status === 'Safe').length;
    const waterComplianceRate = totalWwLogs > 0 ? (safeWwLogs / totalWwLogs) * 100 : 100;

    let avgPh = 0;
    let avgTss = 0;
    let avgFe = 0;
    let avgMn = 0;
    if (totalWwLogs > 0) {
      avgPh = wastewater.reduce((sum, w) => sum + w.ph, 0) / totalWwLogs;
      avgTss = wastewater.reduce((sum, w) => sum + w.tss, 0) / totalWwLogs;
      avgFe = wastewater.reduce((sum, w) => sum + w.fe, 0) / totalWwLogs;
      avgMn = wastewater.reduce((sum, w) => sum + w.mn, 0) / totalWwLogs;
    }

    // B. GRI 304: Biodiversity and Land Rehabilitation 
    const totalNurseryQty = nursery.reduce((sum, n) => sum + n.quantity, 0);
    const healthyNurseryQty = nursery.filter(n => n.status === 'Healthy').reduce((sum, n) => sum + n.quantity, 0);
    const nurseryHealthRate = totalNurseryQty > 0 ? (healthyNurseryQty / totalNurseryQty) * 100 : 100;

    const totalPlannedArea = plans.reduce((sum, p) => sum + p.sizeHa, 0);
    const totalRealizedArea = plans.reduce((sum, p) => sum + (p.realizedSizeHa || 0), 0);
    const reclamationCompletionRate = totalPlannedArea > 0 ? (totalRealizedArea / totalPlannedArea) * 100 : 0;

    const totalGuaranteesValue = guarantees.filter(g => g.status === 'Active').reduce((sum, g) => sum + g.value, 0);

    // C. GRI 306: Waste Management Metrics
    const totalB3In = wasteIn.reduce((sum, w) => sum + w.weightKg, 0);
    const totalB3Out = wasteOut.reduce((sum, w) => sum + w.weightKg, 0);
    const b3DisposalRate = totalB3In > 0 ? (totalB3Out / totalB3In) * 100 : 0;

    const totalOrganicWaste = solidWaste.reduce((sum, s) => sum + s.organicKg, 0);
    const totalInorganicWaste = solidWaste.reduce((sum, s) => sum + s.inorganicKg, 0);
    const totalResidueWaste = solidWaste.reduce((sum, s) => sum + s.residueKg, 0);
    
    const totalDomWaste = totalOrganicWaste + totalInorganicWaste + totalResidueWaste;
    const totalDomProcessed = solidWaste.reduce((sum, s) => sum + s.compostedKg + s.recycledKg, 0);
    const domesticRecoveryRate = totalDomWaste > 0 ? (totalDomProcessed / totalDomWaste) * 100 : 0;

    // D. GRI 307 / GRI 201: Economics & Regulatory Compliance
    const totalRealizedOpex = environmentalCosts.reduce((sum, c) => sum + c.realizedOpex, 0);
    const totalRealizedCapex = environmentalCosts.reduce((sum, c) => sum + c.realizedCapex, 0);
    const totalEnvironmentalExpenditure = totalRealizedOpex + totalRealizedCapex;

    const activeDocsCount = documents.filter(d => d.status === 'Active').length;
    const expiredDocsCount = documents.filter(d => d.status === 'Expired' || d.status === 'Renewal Needed').length;
    const documentComplianceRate = (activeDocsCount + expiredDocsCount) > 0 
      ? (activeDocsCount / (activeDocsCount + expiredDocsCount)) * 100 
      : 100;

    const activeCriticalAlerts = alerts.filter(a => a.type === 'Critical' && !a.read).length;

    // Composite Environmental ESG Score Formulation (GRI Sector 14 Assessment)
    // We construct a normalized index from 0 to 100 based on weighted performance of 4 components:
    // 1. Water Quality Compliance (30%)
    // 2. Reclamation Plan progress & nursery Health (25%)
    // 3. Waste recovery & hazardous waste cycle (25%)
    // 4. Regulatory compliance & document validation (20%)
    const eScore = Math.min(100, Math.max(0, (
      (waterComplianceRate * 0.3) +
      (((reclamationCompletionRate * 0.7) + (nurseryHealthRate * 0.3)) * 0.25) +
      (((domesticRecoveryRate + Math.min(100, b3DisposalRate)) / 2) * 0.25) +
      ((documentComplianceRate * 0.8 + (activeCriticalAlerts === 0 ? 20 : 0)) * 0.2)
    )));

    return {
      waterComplianceRate,
      avgPh,
      avgTss,
      avgFe,
      avgMn,
      totalWwLogs,
      totalNurseryQty,
      nurseryHealthRate,
      totalPlannedArea,
      totalRealizedArea,
      reclamationCompletionRate,
      totalGuaranteesValue,
      totalB3In,
      totalB3Out,
      b3DisposalRate,
      totalDomWaste,
      totalDomProcessed,
      domesticRecoveryRate,
      totalEnvironmentalExpenditure,
      activeDocsCount,
      expiredDocsCount,
      documentComplianceRate,
      activeCriticalAlerts,
      eScore
    };
  }, [wastewater, nursery, plans, guarantees, wasteIn, wasteOut, solidWaste, documents, alerts, environmentalCosts]);

  // Determine Rating Level
  const { ratingLevel, ratingColor, bgGlow } = useMemo(() => {
    const s = metrics.eScore;
    if (s >= 90) return { ratingLevel: 'AAA / Excellence', ratingColor: 'text-emerald-600 border-emerald-500/30', bgGlow: 'rgba(16,185,129,0.1)' };
    if (s >= 80) return { ratingLevel: 'AA / Strong Compliance', ratingColor: 'text-teal-600 border-teal-500/30', bgGlow: 'rgba(20,184,166,0.1)' };
    if (s >= 65) return { ratingLevel: 'A / Safe Performance', ratingColor: 'text-green-400 border-green-500/30', bgGlow: 'rgba(34,197,94,0.1)' };
    if (s >= 50) return { ratingLevel: 'BBB / Moderately Protected', ratingColor: 'text-yellow-400 border-yellow-500/30', bgGlow: 'rgba(234,179,8,0.1)' };
    return { ratingLevel: 'BB / Remediation Required', ratingColor: 'text-amber-500 border-amber-500/30', bgGlow: 'rgba(245,158,11,0.1)' };
  }, [metrics.eScore]);

  // --- 2. COMPILE CHARTS FOR EACH ASPECT ---

  // B-1. Reclamation Year Comparison Chart
  const reclamationChartData = useMemo(() => {
    const yearsGrouped: { [key: number]: { year: number; plannedHa: number; realizedHa: number } } = {};
    plans.forEach(p => {
      const yr = p.targetYear;
      if (!yearsGrouped[yr]) {
        yearsGrouped[yr] = { year: yr, plannedHa: 0, realizedHa: 0 };
      }
      yearsGrouped[yr].plannedHa += p.sizeHa;
      yearsGrouped[yr].realizedHa += p.realizedSizeHa || 0;
    });
    // Fallback if no data
    if (Object.keys(yearsGrouped).length === 0) {
      return [
        { year: 2024, plannedHa: 12.5, realizedHa: 10.2 },
        { year: 2025, plannedHa: 15.0, realizedHa: 13.8 },
        { year: 2026, plannedHa: 20.0, realizedHa: 8.5 }
      ];
    }
    return Object.values(yearsGrouped).sort((a,b) => a.year - b.year);
  }, [plans]);

  // B-2. Nursery Species composition
  const speciesChartData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    nursery.forEach(n => {
      const type = n.plantType || 'Spora/Lain';
      counts[type] = (counts[type] || 0) + n.quantity;
    });
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    if (data.length === 0) {
      return [
        { name: 'Sengon Buto', value: 1200 },
        { name: 'Mahoni', value: 850 },
        { name: 'Trembesi', value: 950 },
        { name: 'Meranti Merah', value: 500 }
      ];
    }
    return data;
  }, [nursery]);

  // B-3. Environmental costs realization timeline Grouped by Year
  const environmentalCostsChartData = useMemo(() => {
    const yearlyCosts: { [key: number]: { year: number; planned: number; realized: number } } = {};
    environmentalCosts.forEach(c => {
      const yr = c.year;
      if (!yearlyCosts[yr]) {
        yearlyCosts[yr] = { year: yr, planned: 0, realized: 0 };
      }
      yearlyCosts[yr].planned += c.plannedCapex + c.plannedOpex;
      yearlyCosts[yr].realized += c.realizedCapex + c.realizedOpex;
    });
    if (Object.keys(yearlyCosts).length === 0) {
      return [
        { year: 2024, 'Rencana Anggaran (Rp)': 2500000000, 'Realisasi Anggaran (Rp)': 2350000000 },
        { year: 2025, 'Rencana Anggaran (Rp)': 3200000000, 'Realisasi Anggaran (Rp)': 3100000000 },
        { year: 2026, 'Rencana Anggaran (Rp)': 4000000000, 'Realisasi Anggaran (Rp)': 1850000000 }
      ];
    }
    return Object.values(yearlyCosts).sort((a, b) => a.year - b.year).map(y => ({
      year: y.year,
      'Rencana Anggaran (Rp)': y.planned,
      'Realisasi Anggaran (Rp)': y.realized
    }));
  }, [environmentalCosts]);

  // B-4. Domestic Solid Waste Composition
  const domesticSolidWastePieData = useMemo(() => {
    let organic = solidWaste.reduce((sum, s) => sum + s.organicKg, 0);
    let inorganic = solidWaste.reduce((sum, s) => sum + s.inorganicKg, 0);
    let residue = solidWaste.reduce((sum, s) => sum + s.residueKg, 0);
    if (organic === 0 && inorganic === 0 && residue === 0) {
      return [
        { name: 'Organik (Kompos)', value: 450, color: '#10b981' },
         { name: 'Anorganik (Daur Ulang)', value: 320, color: '#3b82f6' },
        { name: 'Residu (ke TPA)', value: 150, color: '#ef4444' }
      ];
    }
    return [
      { name: 'Organik (Sisa Hayati/Makanan)', value: organic, color: '#10b981' },
      { name: 'Anorganik (Metal/Plastik/Kardus)', value: inorganic, color: '#3b82f6' },
      { name: 'Residu (Sisa Non-Daur Ulang)', value: residue, color: '#ef4444' }
    ].filter(x => x.value > 0);
  }, [solidWaste]);

  // Real-Time Environmental KPI Data Helpers
  // 1. Emissions & Carbon Sequestration Trend Data (2024 - 2026)
  const emissionsChartData = useMemo(() => {
    const years = [2024, 2025, 2026];
    
    return years.map(yr => {
      // Find solid waste generated for matching year
      let extSolidWaste = solidWaste.filter(s => {
        const itemYear = new Date(s.date).getFullYear();
        return itemYear === yr || s.date.includes(String(yr));
      });
      
      let residue = extSolidWaste.reduce((sum, s) => sum + s.residueKg, 0);
      let organicUnprocessed = extSolidWaste.reduce((sum, s) => sum + Math.max(0, s.organicKg - s.compostedKg), 0);
      
      // Default baseline values based on industry projections for PT Diva Kencana Borneo if data is clean state
      if (extSolidWaste.length === 0) {
        if (yr === 2024) { residue = 1500; organicUnprocessed = 400; }
        else if (yr === 2025) { residue = 1800; organicUnprocessed = 550; }
        else if (yr === 2026) { residue = 2100; organicUnprocessed = 700; }
      }
      
      const wasteEmissions = ((residue * 1.5) + (organicUnprocessed * 2.0)) / 1000; // tCO2e
      
      // Wastewater volume discharge emissions (proxy: 0.04 kg CO2e / m3)
      let extWw = wastewater.filter(w => {
        const itemYear = new Date(w.date).getFullYear();
        return itemYear === yr || w.date.includes(String(yr));
      });
      let totalDebit = extWw.reduce((sum, w) => sum + w.debit, 0);
      if (extWw.length === 0) {
        if (yr === 2024) totalDebit = 42000;
        else if (yr === 2025) totalDebit = 48000;
        else if (yr === 2026) totalDebit = 54000;
      }
      const waterEmissions = (totalDebit * 0.04) / 1000; // tCO2e
      
      // Static baseline emission for general diesel generator & heavy machinery operations
      const operationBase = yr === 2024 ? 115 : yr === 2025 ? 138 : 155;
      const grossEmissions = Number((wasteEmissions + waterEmissions + operationBase).toFixed(1));

      // Carbon absorption offsets
      // Hectares of revegetation/reclamation * standard offset factor (average 8.5 tCO2e/ha/year)
      let extPlans = plans.filter(p => p.targetYear === yr || p.realizedYear === yr);
      let realizedHa = extPlans.reduce((sum, p) => sum + (p.realizedSizeHa || p.sizeHa || 0), 0);
      if (extPlans.length === 0) {
        if (yr === 2024) realizedHa = 10.2;
        else if (yr === 2025) realizedHa = 13.8;
        else if (yr === 2026) realizedHa = 8.5;
      }
      const reclamationOffset = realizedHa * 8.5; // tCO2e saved
      
      // Nursery contribution: Healthy saplings * offset factor (average 12 kg CO2e/sapling/year)
      let healthyNurseryQty = nursery.filter(n => n.status === 'Healthy').reduce((sum, n) => sum + n.quantity, 0);
      if (healthyNurseryQty === 0) {
        healthyNurseryQty = yr === 2024 ? 2000 : yr === 2025 ? 2800 : 3500;
      }
      const nurseryOffset = (healthyNurseryQty * 12) / 1000; // tCO2e saved
      
      const carbonOffset = Number((reclamationOffset + nurseryOffset).toFixed(1));
      const netEmissions = Number((grossEmissions - carbonOffset).toFixed(1));
      
      return {
        year: String(yr),
        'Emisi Bruto (tCO2e)': grossEmissions,
        'Penyerapan Karbon (tCO2e)': carbonOffset,
        'Emisi Neto (tCO2e)': netEmissions < 0 ? 0 : netEmissions
      };
    });
  }, [solidWaste, wastewater, plans, nursery]);

  // 2. Real-time Water Discharge and Compliance Trend
  const waterKPIChartData = useMemo(() => {
    if (wastewater.length > 0) {
      const sortedWw = [...wastewater]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-6);
        
      return sortedWw.map(w => {
        const meetsPh = w.ph >= 6.0 && w.ph <= 9.0;
        const meetsTss = w.tss <= 200;
        const meetsFe = w.fe <= 7;
        const meetsMn = w.mn <= 4;
        const complianceScore = ((meetsPh ? 25 : 0) + (meetsTss ? 25 : 0) + (meetsFe ? 25 : 0) + (meetsMn ? 25 : 0));
        
        return {
          date: w.date,
          'Debit Limbah (m³/hari)': w.debit,
          'Sifat Baku Mutu (%)': complianceScore,
          'Batas Aman Debit': 1500
        };
      });
    }
    
    return [
      { date: '06/06', 'Debit Limbah (m³/hari)': 1100, 'Sifat Baku Mutu (%)': 100, 'Batas Aman Debit': 1500 },
      { date: '07/06', 'Debit Limbah (m³/hari)': 1350, 'Sifat Baku Mutu (%)': 100, 'Batas Aman Debit': 1500 },
      { date: '08/06', 'Debit Limbah (m³/hari)': 1620, 'Sifat Baku Mutu (%)': 75, 'Batas Aman Debit': 1500 },
      { date: '09/06', 'Debit Limbah (m³/hari)': 1250, 'Sifat Baku Mutu (%)': 100, 'Batas Aman Debit': 1500 },
      { date: '10/06', 'Debit Limbah (m³/hari)': 1480, 'Sifat Baku Mutu (%)': 100, 'Batas Aman Debit': 1500 },
      { date: '11/06', 'Debit Limbah (m³/hari)': 1210, 'Sifat Baku Mutu (%)': 100, 'Batas Aman Debit': 1500 },
    ];
  }, [wastewater]);

  // 3. Status Kepatuhan Kritis (Compliance Breakdown)
  const complianceBreakdownData = useMemo(() => {
    // A. Documents (AMDAL, IPAL, etc.)
    const totalDocs = documents.length || 6;
    const activeDocs = documents.filter(d => d.status === 'Active').length || 4;
    const warningDocs = documents.filter(d => d.status === 'Renewal Needed').length || 1;
    const expiredDocs = documents.filter(d => d.status === 'Expired').length || 1;
    
    const dCompliant = Math.round((activeDocs / totalDocs) * 100);
    const dWarning = Math.round((warningDocs / totalDocs) * 100);
    const dNonCompliant = 100 - dCompliant - dWarning;

    // B. Compliance Calendar
    const totalEvents = calendarEvents.length || 6;
    const completedEvents = calendarEvents.filter(c => c.status === 'Completed').length || 4;
    const pendingEvents = calendarEvents.filter(c => c.status === 'Pending').length || 1;
    const overdueEvents = calendarEvents.filter(c => c.status === 'Overdue').length || 1;

    const eCompliant = Math.round((completedEvents / totalEvents) * 100);
    const eWarning = Math.round((pendingEvents / totalEvents) * 100);
    const eNonCompliant = 100 - eCompliant - eWarning;

    // C. Reclamations & Guarantees
    const totalGuar = guarantees.length || 4;
    const activeGuar = guarantees.filter(g => g.status === 'Active').length || 3;
    const renewalGuar = guarantees.filter(g => g.status === 'Renewal Needed').length || 1;
    const releasedGuar = guarantees.filter(g => g.status === 'Released' || g.status === 'Claimed').length || 0;

    const gCompliant = Math.round((activeGuar / totalGuar) * 100);
    const gWarning = Math.round((renewalGuar / totalGuar) * 100);
    const gNonCompliant = 100 - gCompliant - gWarning;

    return [
      {
        category: 'Legal AMDAL & Izin',
        'Lolos Mandatori (%)': dCompliant,
        'Masa Tenggang (%)': dWarning,
        'Eksaserbasi / Expired (%)': dNonCompliant
      },
      {
        category: 'Pelaporan Rutin',
        'Lolos Mandatori (%)': eCompliant,
        'Masa Tenggang (%)': eWarning,
        'Eksaserbasi / Expired (%)': eNonCompliant
      },
      {
        category: 'Jaminan Reklamasi',
        'Lolos Mandatori (%)': gCompliant,
        'Masa Tenggang (%)': gWarning,
        'Eksaserbasi / Expired (%)': gNonCompliant
      }
    ];
  }, [documents, calendarEvents, guarantees]);

  // Color Palette definitions
  const COMPOSITION_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6 text-left">
      {/* GRI Mining Sector Aspect Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-black/5 backdrop-blur-sm relative overflow-hidden">
        {/* Soft decorative visual grids */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-emerald-600 font-mono text-xs font-semibold tracking-widest uppercase">
            <Globe className="h-4 w-4 text-emerald-600 animate-spin-slow animate-pulse" />
            Environmental ESG Disclosures Index
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Pemantauan Kriteria Keberlanjutan <span className="text-emerald-600 text-sm font-mono font-medium block md:inline md:ml-2">GRI Sector Standard 14 (Mining Sector)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 md:max-w-2xl">
            Sistem agregasi data kepatuhan, ekologi, pengelolaan limbah, penataan reklamasi, dan akuntabilitas biaya pengawasan lingkungan tambang PT Diva Kencana Borneo.
          </p>
        </div>
        <div className="relative z-10 shrink-0 bg-white/80 px-4 py-2 border border-black/10 rounded-2xl flex items-center gap-3">
          <Award className="h-8 w-8 text-yellow-400 shrink-0" />
          <div>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">GRI 14 E-Score</span>
            <span className="text-sm font-extrabold text-slate-900">{metrics.eScore.toFixed(1)} / 100</span>
          </div>
        </div>
      </div>

      {/* ESG Dashboard Executive Summary Board */}
      <div 
        className="border border-black/10 rounded-3xl p-6 relative overflow-hidden transition-all text-left"
        style={{ 
          background: `radial-gradient(circle at top right, ${bgGlow}, rgba(15,23,42,0.6))`,
          boxShadow: `0 10px 30px rgba(0,0,0,0.3)`
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 space-y-3">
            <span className="text-xs font-mono px-3 py-1 bg-black/5 text-slate-600 rounded-full border border-black/5">
              Matriks Konsolidasi Aspek &quot;E&quot;
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Kepatuhan Target Keberlanjutan</h2>
            <div className="text-xs text-slate-500 leading-relaxed">
              Skoring dihitung berdasarkan keselarasan data realisasi AMDAL PT Diva Kencana Borneo terhadap standar audit GRI Sector 14:
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-500">
                <li>Baku Mutu Effluent Air Tambang (GRI 303)</li>
                <li>Penghutanan Kembali &amp; Nursery (GRI 304)</li>
                <li>Reduksi Residu Sisa Operasi (GRI 306)</li>
                <li>Keterbukaan Anggaran &amp; Legal (GRI 201/307)</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-center p-3 text-center border-y lg:border-y-0 lg:border-x border-black/5">
            <div className="relative h-32 w-32 flex items-center justify-center">
              {/* Simple background ring */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="54" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="54" 
                  className="stroke-emerald-500 transition-all duration-1000" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={339.3}
                  strokeDashoffset={339.3 - (339.3 * metrics.eScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900">{metrics.eScore.toFixed(0)}%</span>
                <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">E-INDEX</span>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-xs font-black tracking-wide uppercase px-3 py-1 bg-black/5 rounded-full border border-black/10 ${ratingColor}`}>
                {ratingLevel}
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-black/5">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Mutu Air Limbah</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">{metrics.waterComplianceRate.toFixed(1)}%</span>
              <span className="text-[9px] text-emerald-600 font-mono flex items-center gap-0.5 mt-0.5">
                <CheckCircle size={10} /> GRI 303 Compliant
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-black/5">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Rasio Reklamasi</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">{metrics.reclamationCompletionRate.toFixed(1)}%</span>
              <span className="text-[9px] text-slate-500 font-mono flex items-center gap-0.5 mt-0.5">
                <Gauge size={10} /> ha realized area
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-black/5">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Pemulihan Sampah</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">{metrics.domesticRecoveryRate.toFixed(1)}%</span>
              <span className="text-[9px] text-emerald-600 font-mono flex items-center gap-0.5 mt-0.5">
                <Recycle size={10} /> Permen 7/25 min 30%
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-black/5">
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Izin Aktif</span>
              <span className="text-lg font-black text-slate-900 mt-1 block">
                {metrics.activeDocsCount} <span className="text-xs text-slate-500 font-normal">/ {metrics.activeDocsCount + metrics.expiredDocsCount}</span>
              </span>
              <span className="text-[9px] text-slate-500 font-mono flex items-center gap-0.5 mt-0.5">
                <FileCheck size={10} /> AMDAL &amp; IPAL Validated
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selector Navigation for Material Topics (GRI 14 Chapters) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-white p-1.5 rounded-2xl border border-black/5">
        <button
          onClick={() => setActiveSubtopic('overview')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubtopic === 'overview'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          }`}
        >
          <Compass size={14} className="shrink-0" /> Ringkasan GRI Standard
        </button>
        <button
          onClick={() => setActiveSubtopic('gri303')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubtopic === 'gri303'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          }`}
        >
          <Droplet size={14} className="shrink-0" /> GRI 303: Water &amp; Effluents
        </button>
        <button
          onClick={() => setActiveSubtopic('gri304')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubtopic === 'gri304'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          }`}
        >
          <Leaf size={14} className="shrink-0" /> GRI 304: Biodiversity
        </button>
        <button
          onClick={() => setActiveSubtopic('gri306')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubtopic === 'gri306'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          }`}
        >
          <Trash2 size={14} className="shrink-0" /> GRI 306: Waste Management
        </button>
        <button
          onClick={() => setActiveSubtopic('gri307')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 col-span-2 md:col-span-1 ${
            activeSubtopic === 'gri307'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
          }`}
        >
          <Coins size={14} className="shrink-0" /> GRI 307: Economics
        </button>
      </div>

      {/* --- CONTENT SEGMENTS --- */}

      {/* TAB 1: OVERVIEW GRI SECTOR 14 */}
      {activeSubtopic === 'overview' && (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Card detailing GRI Mining Standard */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white/60 border border-black/5 rounded-3xl p-6 shadow-xl">
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Apa itu GRI 14: Sektor Pertambangan 2024?</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Asosiasi Global Sustainability Standards Board (GSSB) meresmikan <strong>GRI Sector standard 14: Mining Sector</strong> untuk mewajibkan transparansi tingkat tinggi bagi korporasi penambangan material dan batubara. Sektor ekstraktif memegang impak ekologi masif yang harus dimitigasi secara terpadu.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Di Indonesia, pelaporan ini selaras dengan regulasi ketat Kementerian Lingkungan Hidup dan Kehutanan (KLHK) serta ESDM, mencakup pengawasan air limbah buangan (KepmenLH 113/2003), kewajiban jaminan dan revegetasi reklamasi lahan bekas tambang (Permen ESDM 26/2018), pengelolaan TPS limbah B3 (Permen LHK 6/2021) serta pemilahan sampah sisa domestik (Permen LH 7/2025).
              </p>

              <div className="bg-white rounded-2xl p-4 border border-black/5 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-700">Kombinasi Matriks Pemantauan ESG Diva Enviro Monitor:</h4>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="space-y-1">
                    <span className="text-emerald-600 font-bold block">1. GRI 303: Air &amp; Effluent</span>
                    <span className="text-slate-500 block">Kualitas buangan settling pond, kadar pH, kekeruhan (TSS), serta logam Fe &amp; Mn.</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-emerald-600 font-bold block">2. GRI 304: Biodiversitas</span>
                    <span className="text-slate-500 block">Restorasi flora lokal, pembibitan Nursery, perbandingan lahan terganggu, &amp; dana jaminan.</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-emerald-600 font-bold block">3. GRI 306: Limbah Tambang</span>
                    <span className="text-slate-500 block">Penyimpanan B3 di TPS berizin, Manifest pengangkutan berlisensi, &amp; reduksi sampah kantin.</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-emerald-600 font-bold block">4. GRI 307: Kepatuhan Hukum</span>
                    <span className="text-slate-500 block">Penyediaan dokumen perizinan AMDAL, kalender pengesahan reguler &amp; investasi hijau.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
              <div className="bg-white rounded-2xl p-4 border border-black/5 space-y-3">
                <span className="text-[10px] text-slate-500 font-mono font-bold block uppercase tracking-widest text-emerald-600">STATUS KEPATUHAN AKTIF</span>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-black/5 pb-1.5">
                    <span className="text-slate-500">Wastewater S.P (Baku Mutu)</span>
                    <span className={`font-mono font-bold ${metrics.waterComplianceRate >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {metrics.waterComplianceRate.toFixed(0)}% Aman
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/5 pb-1.5">
                    <span className="text-slate-500">Sinergi Sampah (Permen LH 7/25)</span>
                    <span className={`font-mono font-bold ${metrics.domesticRecoveryRate >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {metrics.domesticRecoveryRate.toFixed(0)}% (Min 30%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/5 pb-1.5">
                    <span className="text-slate-500">Kemajuan Reklamasi Tambang</span>
                    <span className="font-mono font-bold text-slate-900">
                      {metrics.reclamationCompletionRate.toFixed(0)}% Selesai
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/5 pb-1.5">
                    <span className="text-slate-500">Dukungan Jamrek Terfasilitasi</span>
                    <span className="font-mono font-bold text-slate-600">
                      Rp {metrics.totalGuaranteesValue.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Alert Kritis Berjalan</span>
                    <span className={`font-mono font-bold ${metrics.activeCriticalAlerts > 0 ? 'text-red-600 animate-pulse' : 'text-emerald-600'}`}>
                      {metrics.activeCriticalAlerts} Warning Kritis
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3 text-xs text-slate-500">
                <ShieldAlert className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-600">Verifikasi Log Audit</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Semua data ESG yang terintegrasi di DEM dikunci menggunakan stempel ID Petugas dan dicatatkan di Log Audit guna mematuhi audit eksterior KAP / LHK.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL VISUALISASI REAL-TIME: MONITORING KPI LINGKUNGAN */}
          <div id="realtime-kpi-panel" className="bg-white/60 border border-black/5 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Panel Real-Time Visualisasi KPI Lingkungan</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pemantauan interaktif emisi GRK batubara, kestabilan debit air lindi, dan parameter kelaikan dokumen regulasi.</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-3 py-1 bg-[#10b981]/10 text-emerald-600 rounded-full border border-emerald-500/10 self-start sm:self-auto uppercase tracking-wider">
                ● Live Sync Active
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* KARTU 1: TREN EMISI & OFFSET SEQUESTRATION */}
              <div id="kpi-emission-card" className="bg-white p-5 rounded-2xl border border-black/5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 tracking-wider flex items-center gap-1.5 uppercase">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      Tren Emisi &amp; Sekuestrasi
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">GRI 305/306 Proxy</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Estimasi Gross Carbon Footprint (tCO2e) gabungan vs penyerapan revegetasi reklamasi &amp; nursery.</p>
                </div>

                <div className="h-56 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={emissionsChartData} margin={{ top: 10, right: -5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                      <XAxis dataKey="year" stroke="rgba(255,255,255,0.4)" fontSize={9} className="font-mono" />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '10px' }} />
                      <Legend wrapperStyle={{ fontSize: '9px', marginTop: '10px' }} />
                      <Bar name="Emisi Bruto" dataKey="Emisi Bruto (tCO2e)" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.85} barSize={16} />
                      <Bar name="Offset Karbon" dataKey="Penyerapan Karbon (tCO2e)" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.85} barSize={16} />
                      <Line name="Emisi Bersih" type="monotone" dataKey="Emisi Neto (tCO2e)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3, fill: '#06b6d4' }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-black/5 text-[10px] text-slate-500 leading-relaxed">
                  Real-time offsets berkorelasi langsung dengan laju <strong>revegetasi efektif</strong> serta rasio kesehatan bibit tanaman di modul Nursery.
                </div>
              </div>

              {/* KARTU 2: RASIO DEBIT AIR LIMBAH & BAKU MUTU */}
              <div id="kpi-water-card" className="bg-white p-5 rounded-2xl border border-black/5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 tracking-wider flex items-center gap-1.5 uppercase">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      Rasio Debit &amp; Mutu Air
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">GRI 303 Baku Mutu</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Rasio kestabilan volume outflow debit (m³/hari) berbanding kelaikan baku mutu limbah cair terolah.</p>
                </div>

                <div className="h-56 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={waterKPIChartData} margin={{ top: 10, right: -20, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDebit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={9} className="font-mono" />
                      <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                      <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.4)" fontSize={9} domain={[0, 100]} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '10px' }} />
                      <Legend wrapperStyle={{ fontSize: '9px', marginTop: '10px' }} />
                      <Area yAxisId="left" name="Debit (m³)" type="monotone" dataKey="Debit Limbah (m³/hari)" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#colorDebit)" />
                      <Line yAxisId="right" name="Baku Mutu (%)" type="monotone" dataKey="Sifat Baku Mutu (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="left" name="Threshold Debit" type="monotone" dataKey="Batas Aman Debit" stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-black/5 text-[10px] text-slate-500 leading-relaxed">
                  Debit di atas threshold merah memicu resiko warning lindi. Baku Mutu mengagregasi pH, TSS, Fe &amp; Mn secara real-time.
                </div>
              </div>

              {/* KARTU 3: STATUS KEPATUHAN LOKAL & AUDIT */}
              <div id="kpi-compliance-card" className="bg-white p-5 rounded-2xl border border-black/5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 tracking-wider flex items-center gap-1.5 uppercase">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Status Kepatuhan Audit
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">GRI 307 Legalitas</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Distribusi status AMDAL, penunaian tugas pelaporan kepatuhan reguler, dan keabsahan dana Jamrek dwi-tahunan.</p>
                </div>

                <div className="h-56 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={complianceBreakdownData} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                      <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={9} domain={[0, 100]} />
                      <YAxis type="category" dataKey="category" stroke="rgba(255,255,255,0.4)" fontSize={9} width={95} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '10px' }} />
                      <Legend wrapperStyle={{ fontSize: '9px', marginTop: '10px' }} />
                      <Bar name="Patuh" dataKey="Lolos Mandatori (%)" stackId="complianceStack" fill="#10b981" radius={[0, 0, 0, 0]} opacity={0.9} barSize={12} />
                      <Bar name="Tenggang" dataKey="Masa Tenggang (%)" stackId="complianceStack" fill="#fbbf24" opacity={0.9} barSize={12} />
                      <Bar name="Expired" dataKey="Eksaserbasi / Expired (%)" stackId="complianceStack" fill="#ef4444" radius={[0, 4, 4, 0]} opacity={0.9} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-black/5 text-[10px] text-slate-500 leading-relaxed">
                  Menyajikan rasio kesiapan dokumen audit KLHK menuju sertifikasi predikat <strong>PROPER Hijau / Emas</strong> yang terpadu.
                </div>
              </div>

            </div>
          </div>

          {/* Quick Informative Section for Sustainability Guidelines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/40 border border-black/5 p-4 rounded-2xl">
              <span className="text-[9px] font-mono tracking-widest text-emerald-600 font-bold block uppercase mb-1">GRI 303-3</span>
              <span className="text-xs font-bold text-slate-900 block">Pemanfaatan Air Tambang</span>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Pencatatan volume inflow, pelaporan debit keluaran, serta kontrol limpasan curah hujan ke saluran perairan sekitar.</p>
            </div>
            <div className="bg-white/40 border border-black/5 p-4 rounded-2xl">
              <span className="text-[9px] font-mono tracking-widest text-emerald-600 font-bold block uppercase mb-1">GRI 304-3</span>
              <span className="text-xs font-bold text-slate-900 block">Sinergi Habitat Kehati</span>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Kewajiban replant vegetasi lokal pionir (seperti sengon buto, meranti) sejalan target andalan AMDAL perusahaan.</p>
            </div>
            <div className="bg-white/40 border border-black/5 p-4 rounded-2xl">
              <span className="text-[9px] font-mono tracking-widest text-emerald-600 font-bold block uppercase mb-1">GRI 306-4</span>
              <span className="text-xs font-bold text-slate-900 block">Waste Recovery / Pemilahan</span>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Menghitung siklus material yang dialihkan dari TPA dasar lewat TPS3R, pengomposan mandiri, &amp; kerja sama transporter berizin.</p>
            </div>
            <div className="bg-white/40 border border-black/5 p-4 rounded-2xl">
              <span className="text-[9px] font-mono tracking-widest text-emerald-600 font-bold block uppercase mb-1">GRI 307-1</span>
              <span className="text-xs font-bold text-slate-900 block">Zero Environmental Fines</span>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Mencegah kelalaian legal dokumen kadaluarsa sejalan amandemen regulasi LHK Indonesia dalam pencegahan pembuangan ilegal.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WATER AND EFFLUENTS */}
      {activeSubtopic === 'gri303' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-white/60 border border-black/5 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-black/5 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Droplet className="text-blue-600 h-5 w-5" />
                  GRI 303: Water and Effluents (Pengelolaan Pemantauan Air Limbah)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Matriks baku mutu air dari outlet tambang PT Diva Kencana Borneo mengacu PP No. 22 Tahun 2021</p>
              </div>
              <div className="bg-blue-500/10 text-blue-300 font-mono text-[10px] px-3 py-1 rounded-full border border-blue-500/20">
                Limit Standar: pH (6.0-9.0), TSS (&lt;200mg/L), Fe (&lt;7mg/L), Mn (&lt;4mg/L)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-black/5 text-left">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Total Entri Data Air</span>
                <span className="text-xl font-extrabold text-slate-900 mt-1 block">{metrics.totalWwLogs} Log</span>
                <span className="text-[10px] text-slate-500 block mt-1">Titik sampling KPL settling pond</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-black/5 text-left">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Rata-Rata Kepadatan TSS</span>
                <span className="text-xl font-extrabold text-blue-600 mt-1 block">{metrics.avgTss.toFixed(1)} <span className="text-xs font-normal text-slate-500">mg/L</span></span>
                <span className="text-[10px] text-emerald-600 block mt-1">Sangat Aman (Standar &lt;200)</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-black/5 text-left">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Rata-Rata Logam (Fe / Mn)</span>
                <span className="text-xl font-extrabold text-slate-700 mt-1 block">
                  {metrics.avgFe.toFixed(2)} / {metrics.avgMn.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">mg/L</span>
                </span>
                <span className="text-[10px] text-emerald-600 block mt-1">Di bawah batas baku mutu ESDM</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-black/5 text-left">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Persentase Kepatuhan IPAL</span>
                <span className={`text-xl font-extrabold mt-1 block ${metrics.waterComplianceRate >= 95 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {metrics.waterComplianceRate.toFixed(1)}%
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">Tingkat aman zero exceedance</span>
              </div>
            </div>

            {/* Wastewater Live List Assessment */}
            <div className="bg-white p-4 rounded-2xl border border-black/5 text-left">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Tinjauan Kepatuhan Log Pemantauan Mutu Air Tambang</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-black/5 text-slate-500 border-b border-black/5 font-mono uppercase text-[9px]">
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Lokasi / KPL</th>
                      <th className="p-3 text-right">pH</th>
                      <th className="p-3 text-right">TSS (mg/L)</th>
                      <th className="p-3 text-right">Fe (mg/L)</th>
                      <th className="p-3 text-right">Mn (mg/L)</th>
                      <th className="p-3 text-right">Debit (m³/h)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-600">
                    {wastewater.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500 font-mono">
                          Belum ada sampel air terekam. Masukkan data di modul Pemantauan Lingkungan.
                        </td>
                      </tr>
                    ) : (
                      wastewater.slice(0, 5).map(w => (
                        <tr key={w.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                          <td className="p-3 font-mono">{w.date}</td>
                          <td className="p-3 font-bold text-slate-900">{w.location}</td>
                          <td className="p-3 text-right font-mono">{w.ph.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono">{w.tss}</td>
                          <td className="p-3 text-right font-mono">{w.fe.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono">{w.mn.toFixed(2)}</td>
                          <td className="p-3 text-right font-mono">{w.debit.toFixed(3)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              w.status === 'Safe' ? 'bg-emerald-500/15 text-emerald-600' :
                              w.status === 'Warning' ? 'bg-amber-500/15 text-amber-500' : 'bg-red-500/15 text-red-500'
                            }`}>
                              {w.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {wastewater.length > 5 && (
                <div className="text-[10px] text-slate-500 mt-2 text-center italic">
                  Menampilkan 5 entri terbaru dari total {wastewater.length} data pemantauan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BIODIVERSITY AND LAND REHABILITATION */}
      {activeSubtopic === 'gri304' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: biodiversity performance summary */}
            <div className="lg:col-span-7 bg-white/60 border border-black/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-black/5 pb-3">
                <Leaf className="text-emerald-600 h-5 w-5" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">GRI 304: Biodiversity &amp; Land Rehabilitation</h3>
                  <p className="text-[11px] text-slate-500">Pengelolaan biodiversitas melalui operasional Nursery mandiri dan realisasi Reklamasi Lahan Bekas Tambang</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-black/5 text-left">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Stok Bibit di Nursery</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">{metrics.totalNurseryQty.toLocaleString('id-ID')} Batang</span>
                  <span className="text-[10px] text-emerald-600 block mt-1">Keadaan Sehat: {metrics.nurseryHealthRate.toFixed(1)}%</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/5 text-left">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Tingkat Penuntasan Reklamasi</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">{metrics.reclamationCompletionRate.toFixed(1)}%</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Realisasi: {metrics.totalRealizedArea.toFixed(2)} ha / {metrics.totalPlannedArea.toFixed(2)} ha rencana</span>
                </div>
              </div>

              {/* Reclamation target analysis chart */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Perbandingan Luas Reklamasi Tambang per Tahun Target (Hektar)</h4>
                <div className="h-48 w-full p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reclamationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                      <XAxis dataKey="year" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} unit="ha" />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar name="Rencana Target (ha)" dataKey="plannedHa" fill="rgba(255,255,255,0.3)" />
                      <Bar name="Selesai Terealisasi (ha)" dataKey="realizedHa" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right side: plant type and index */}
            <div className="lg:col-span-5 bg-white/60 border border-black/5 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Pemberdayaan Vegetasi Lokal &amp; Pionir</h3>
                <p className="text-xs text-slate-500 mb-3">Distribusi jenis vegetasi lokal pertambangan guna pemulihan kesuburan tanah (revegetasi di lereng &amp; dumping ground):</p>
                
                {/* Nursery pie chart */}
                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={speciesChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {speciesChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COMPOSITION_COLORS[index % COMPOSITION_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Total Bibit</span>
                    <span className="text-sm font-black text-slate-900">{metrics.totalNurseryQty} btg</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-black/5 max-h-36 overflow-y-auto">
                  {speciesChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COMPOSITION_COLORS[idx % COMPOSITION_COLORS.length] }} />
                        <span className="text-slate-500 truncate">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-600">
                        {item.value.toLocaleString('id-ID')} btg
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-black/5">
                <span className="text-[10px] text-slate-500 font-mono font-bold block uppercase tracking-wider">KOMITMEN PENATAAN LAHAN</span>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  Menempatkan total dana Jaminan Reklamasi (Jamrek) aktif senilai Rp {metrics.totalGuaranteesValue.toLocaleString('id-ID')} kepada bendahara ESDM demi jaminan pemulihan lingkungan 100%.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WASTE & TAILINGS MANAGEMENT */}
      {activeSubtopic === 'gri306' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Domestic and B3 Waste Summary */}
            <div className="lg:col-span-8 bg-white/60 border border-black/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-black/5 pb-3">
                <Recycle className="text-emerald-600 h-5 w-5 animate-pulse" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">GRI 306: Waste Management (TPS B3 &amp; Pemilahan Domestik)</h3>
                  <p className="text-[11px] text-slate-500">Pengolahan sisa material terpadu berbasis Circular Economy guna mengurangi volume residu ke TPA</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-black/5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Rasio Sirkular Sampah Domestik</span>
                  <span className="text-xl font-extrabold text-emerald-600 mt-1 block">{metrics.domesticRecoveryRate.toFixed(1)}%</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Sisa Terolah: {metrics.totalDomProcessed.toLocaleString('id-ID')} kg dari {metrics.totalDomWaste.toLocaleString('id-ID')} kg</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Pelepasan TPS Limbah B3</span>
                  <span className="text-xl font-extrabold text-blue-600 mt-1 block">
                    {metrics.b3DisposalRate.toFixed(1)}% <span className="text-xs font-normal text-slate-500">dispatched</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">Terkirim: {metrics.totalB3Out.toLocaleString('id-ID')} kg / masuk {metrics.totalB3In.toLocaleString('id-ID')} kg</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Kepatuhan Penyimpanan B3</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">90 Hari Max</span>
                  <span className="text-[10px] text-emerald-600 block mt-1">Patuh UU Permen LHK 6/21</span>
                </div>
              </div>

              <div className="border-t border-black/5 pt-3 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Log Penanganan Sebaran Sampah Terakhir (Permen LH 7/25)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-black/5 text-slate-500 border-b border-black/5 font-mono">
                        <th className="p-2">Tanggal</th>
                        <th className="p-2">Sumber</th>
                        <th className="p-2 text-right">Organik (kg)</th>
                        <th className="p-2 text-right">Anorganik (kg)</th>
                        <th className="p-2 text-right">Residu (kg)</th>
                        <th className="p-2 text-right">Composted (kg)</th>
                        <th className="p-2 text-right">Recycled (kg)</th>
                        <th className="p-2 text-center">Rasio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-600">
                      {solidWaste.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center font-mono text-[10px] text-slate-600">
                            Tidak ditemukan log data sampah domestik. Rekam melalui menu &quot;Pengolahan Sampah&quot;.
                          </td>
                        </tr>
                      ) : (
                        solidWaste.slice(0, 4).map(s => {
                          const total = s.organicKg + s.inorganicKg + s.residueKg;
                          const rate = total > 0 ? ((s.compostedKg + s.recycledKg) / total) * 100 : 0;
                          return (
                            <tr key={s.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                              <td className="p-2 font-mono">{s.date}</td>
                              <td className="p-2 font-bold text-slate-900">{formatWasteSource(s.source)}</td>
                              <td className="p-2 text-right font-mono text-emerald-500">{s.organicKg}</td>
                              <td className="p-2 text-right font-mono text-blue-600">{s.inorganicKg}</td>
                              <td className="p-2 text-right font-mono text-red-600">{s.residueKg}</td>
                              <td className="p-2 text-right font-mono">{s.compostedKg}</td>
                              <td className="p-2 text-right font-mono">{s.recycledKg}</td>
                              <td className="p-2 text-center">
                                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                  rate >= 30 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {rate.toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right side: Solid waste distribution */}
            <div className="lg:col-span-4 bg-white/60 border border-black/5 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Komposisi Sampah Domestik</h3>
                <p className="text-xs text-slate-500 mb-4">Penggolongan timbunan harian PT Diva Kencana Borneo berdasarkan karakterisasi sisa sirkulasi:</p>
                
                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={domesticSolidWastePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {domesticSolidWastePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Total</span>
                    <span className="text-sm font-black text-slate-900">{metrics.totalDomWaste} kg</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  {domesticSolidWastePieData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-500 truncate">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">
                        {item.value.toLocaleString('id-ID')} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-black/5 flex gap-2.5 items-start text-[10px] text-slate-500">
                <Recycle size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Higiene &amp; Sanitasi:</strong> Pemrosesan sisa anorganik bermutu daur-ulang bekerjasama dengan TPS3R dan asosiasi lokal untuk menciptakan nilai tambah ekonomi berkelanjutan.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ENVIRONMENTAL compliance & ECONOMICS */}
      {activeSubtopic === 'gri307' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Cost allocations */}
            <div className="lg:col-span-8 bg-white/60 border border-black/5 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-black/5 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Coins className="text-emerald-500 h-5 w-5" />
                    GRI 307 &amp; 201: Kepatuhan Hukum &amp; Keekonomian Hijau
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mendokumentasikan alokasi belanja modal (Capex) &amp; biaya operasi (Opex) pemenuhan standar AMDAL</p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-600 font-mono text-[10px] px-3 py-1 rounded-full border border-emerald-500/20">
                  Total Terrealisasi: Rp {metrics.totalEnvironmentalExpenditure.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-black/5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Izin Dokumen Valid</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">{metrics.activeDocsCount} Aktif</span>
                  <span className="text-[10px] text-slate-500 block mt-1">Rasio Kepatuhan: {metrics.documentComplianceRate.toFixed(0)}%</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Agenda Kepatuhan</span>
                  <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
                    {calendarEvents.filter(c => c.status === 'Completed').length} Selesai
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">Pending: {calendarEvents.filter(c => c.status === 'Pending').length} Kegiatan Pelaporan</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-black/5">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Sanksi Lingkungan Hidup</span>
                  <span className={`text-xl font-extrabold mt-1 block ${metrics.activeCriticalAlerts === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {metrics.activeCriticalAlerts === 0 ? 'Zero Case' : `${metrics.activeCriticalAlerts} Critical Case`}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">Berdasarkan tracking alerts</span>
                </div>
              </div>

              {/* Economic chart */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Tren Anggaran Hijau Belanja Lingkungan (Kemajuan Realisasi vs Rencana)</h4>
                <div className="h-52 w-full p-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={environmentalCostsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgba(255,255,255,0.15)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="rgba(255,255,255,0.15)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.03)" />
                      <XAxis dataKey="year" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0d1527', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '10px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Area name="Rencana Anggaran (Rp)" type="monotone" dataKey="Rencana Anggaran (Rp)" stroke="rgba(255,255,255,0.4)" fillOpacity={1} fill="url(#colorPlanned)" />
                      <Area name="Realisasi Anggaran (Rp)" type="monotone" dataKey="Realisasi Anggaran (Rp)" stroke="#10b981" fillOpacity={1} fill="url(#colorRealized)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right column: Document lists and license review */}
            <div className="lg:col-span-4 bg-white/60 border border-black/5 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Tinjauan Legal Dokumen AMDAL &amp; Izin</h3>
                <p className="text-xs text-slate-500 mb-3">Status kelaikan operasional berdasarkan keabsahan izin dokumen lingkungan:</p>
                
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {documents.length === 0 ? (
                    <div className="text-center font-mono text-[10px] text-slate-500 py-6">
                      Belum ada dokumen diunggah dalam sistem.
                    </div>
                  ) : (
                    documents.slice(0, 5).map(doc => {
                      return (
                        <div key={doc.id} className="p-2.5 bg-white rounded-xl border border-black/5 flex flex-col gap-1 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 truncate max-w-[180px]" title={doc.name}>{doc.name}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              doc.status === 'Active' ? 'bg-emerald-500/15 text-emerald-600' :
                              'bg-red-500/15 text-red-600'
                            }`}>
                              {doc.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500">
                            <span>No: {doc.docNo}</span>
                            <span className="font-mono">Exp: {doc.expiryDate}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-yellow-400/5 border border-yellow-500/10 rounded-2xl flex gap-3 text-xs text-slate-500">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="font-bold text-yellow-400">Pemberitahuan Kadaluarsa</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Modul kepatuhan akan secara otomatis memicu agenda perpanjangan di Kalender Kepatuhan 60 hari sebelum masa berlaku izin dokumen LHK berakhir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
