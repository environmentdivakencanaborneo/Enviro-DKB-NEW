/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';
import {
  GhgActivityCategory,
  GhgActivityData,
  GhgEmissionFactorData,
} from '../types';
import { ghgActivityService, ghgFactorService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import { triggerToast } from '../utils/errorHandler';
import {
  filterCompatibleGhgFactors,
  calculateGhgActivityEmission,
  summarizeGhgByScope,
} from '../utils/ghgCalc';
import StatusBadge from './StatusBadge';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';
import { NEON_CHART, NEON_TOOLTIP_CONTENT_STYLE } from '../utils/chartTheme';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  CloudCog,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  Sliders,
  X,
  Calendar,
} from 'lucide-react';

interface GhgInventoryViewProps {
  factors: GhgEmissionFactorData[];
  activities: GhgActivityData[];
  isLoading: boolean;
  canEdit: boolean;
  canManageFactors?: boolean;
  canDelete: boolean;
  onUnauthorizedAction: (action: string) => void;
}

const CATEGORIES: GhgActivityCategory[] = [
  'Solar Alat Berat & Hauling',
  'Solar Genset & Pembangkit',
  'Listrik PLN / Non-Tambang',
  'Bahan Peledak (ANFO/Emulsi)',
  'Perubahan Lahan Terbuka',
  'Lainnya',
];

const SCOPES: GhgEmissionFactorData['gasScope'][] = [
  'Scope 1 (Emisi Langsung)',
  'Scope 2 (Energi Tidak Langsung)',
  'Scope 3 / Lahan',
];

const CATEGORY_DEFAULT_UNITS: Record<GhgActivityCategory, string> = {
  'Solar Alat Berat & Hauling': 'Liter',
  'Solar Genset & Pembangkit': 'Liter',
  'Listrik PLN / Non-Tambang': 'kWh',
  'Bahan Peledak (ANFO/Emulsi)': 'kg',
  'Perubahan Lahan Terbuka': 'Ha',
  'Lainnya': 'Unit',
};

export default function GhgInventoryView({
  factors,
  activities,
  isLoading,
  canEdit,
  canManageFactors,
  canDelete,
  onUnauthorizedAction,
}: GhgInventoryViewProps) {
  const allowManageFactors = canManageFactors ?? false;
  const currentYear = new Date().getFullYear();
  const [subTab, setSubTab] = useState<'activities' | 'factors'>('activities');
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  const [isSaving, setIsSaving] = useState(false);

  const [showActModal, setShowActModal] = useState(false);
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [deleteActTarget, setDeleteActTarget] = useState<GhgActivityData | null>(null);

  const [actDate, setActDate] = useState(todayLocalISO());
  const [actCategory, setActCategory] = useState<GhgActivityCategory>('Solar Alat Berat & Hauling');
  const [sourceLocation, setSourceLocation] = useState('Pit Hauling & Workshop Utama');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('Liter');
  const [factorId, setFactorId] = useState('');
  const [officer, setOfficer] = useState('');
  const [actNotes, setActNotes] = useState('');
  const [actCorrectionReason, setActCorrectionReason] = useState('');

  const [showFactorModal, setShowFactorModal] = useState(false);
  const [editingFactorId, setEditingFactorId] = useState<string | null>(null);
  const [deleteFactorTarget, setDeleteFactorTarget] = useState<GhgEmissionFactorData | null>(null);

  const [fCategory, setFCategory] = useState<GhgActivityCategory>('Solar Alat Berat & Hauling');
  const [fName, setFName] = useState('');
  const [fUnit, setFUnit] = useState('Liter');
  const [fValue, setFValue] = useState<number>(0);
  const [fScope, setFScope] = useState<GhgEmissionFactorData['gasScope']>('Scope 1 (Emisi Langsung)');
  const [fReference, setFReference] = useState('');
  const [fEffectiveYear, setFEffectiveYear] = useState<number>(currentYear);
  const [fGwpRef, setFGwpRef] = useState('AR5/AR6 IPCC');
  const [fVerificationStatus, setFVerificationStatus] = useState<'Terverifikasi' | 'PERLU VERIFIKASI'>('PERLU VERIFIKASI');
  const [fNotes, setFNotes] = useState('');

  const actReportingYear = useMemo(
    () => Number(actDate.slice(0, 4)) || currentYear,
    [actDate, currentYear]
  );

  const factorCompatibility = useMemo(
    () => filterCompatibleGhgFactors(factors, actCategory, unit, actReportingYear),
    [factors, actCategory, unit, actReportingYear]
  );

  const selectedFactor = useMemo(
    () => factors.find((f) => f.id === factorId) || null,
    [factors, factorId]
  );

  const previewCalc = useMemo(
    () =>
      calculateGhgActivityEmission({
        quantity,
        unit,
        activityCategory: actCategory,
        reportingYear: actReportingYear,
        factor: selectedFactor,
      }),
    [quantity, unit, actCategory, actReportingYear, selectedFactor]
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    activities.forEach((a) => years.add(a.reportingYear));
    return Array.from(years).sort((a, b) => b - a);
  }, [activities, currentYear]);

  const filteredActivities = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return activities.filter((a) => {
      const matchYear = a.reportingYear === yearFilter;
      const matchQ =
        a.activityCategory.toLowerCase().includes(q) ||
        a.sourceLocation.toLowerCase().includes(q) ||
        (a.factorNameSnapshot || '').toLowerCase().includes(q) ||
        a.officer.toLowerCase().includes(q);
      return matchYear && matchQ;
    });
  }, [activities, yearFilter, searchQuery]);

  const filteredFactors = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return factors.filter(
      (f) =>
        f.factorName.toLowerCase().includes(q) ||
        f.activityCategory.toLowerCase().includes(q) ||
        f.referenceSource.toLowerCase().includes(q)
    );
  }, [factors, searchQuery]);

  const annualRecap = useMemo(() => {
    const yearActs = activities.filter((a) => a.reportingYear === yearFilter);
    const scopeSummary = summarizeGhgByScope(yearActs, factors);

    const byCategoryMap = new Map<string, { category: string; emissionsTco2e: number; count: number }>();
    const byMonthMap = new Map<string, number>();

    yearActs.forEach((a) => {
      const hasVal =
        a.calculationStatus !== 'BELUM TERHITUNG' &&
        typeof a.emissionsTco2e === 'number' &&
        Number.isFinite(a.emissionsTco2e);
      const val = hasVal ? (a.emissionsTco2e as number) : 0;

      const catEntry = byCategoryMap.get(a.activityCategory) || {
        category: a.activityCategory,
        emissionsTco2e: 0,
        count: 0,
      };
      catEntry.emissionsTco2e += val;
      catEntry.count += 1;
      byCategoryMap.set(a.activityCategory, catEntry);

      if (hasVal) {
        byMonthMap.set(a.monthPeriod, (byMonthMap.get(a.monthPeriod) || 0) + val);
      }
    });

    const monthlySeries = Array.from(byMonthMap.entries())
      .sort(([mA], [mB]) => mA.localeCompare(mB))
      .map(([month, total]) => ({
        month,
        'Emisi (tCO2e)': Number(total.toFixed(3)),
      }));

    return {
      totalTco2e: scopeSummary.totalTco2e,
      scopeSummary,
      totalEntries: yearActs.length,
      byCategory: Array.from(byCategoryMap.values()),
      monthlySeries,
    };
  }, [activities, factors, yearFilter]);

  const resetActForm = () => {
    setEditingActId(null);
    const defaultCat: GhgActivityCategory = 'Solar Alat Berat & Hauling';
    const defaultUnit = CATEGORY_DEFAULT_UNITS[defaultCat];
    const compat = filterCompatibleGhgFactors(factors, defaultCat, defaultUnit, currentYear).compatible;
    setActDate(todayLocalISO());
    setActCategory(defaultCat);
    setSourceLocation('Pit Hauling & Workshop Utama');
    setQuantity(0);
    setUnit(compat[0]?.unit || defaultUnit);
    setFactorId(compat[0]?.id || '');
    setOfficer('');
    setActNotes('');
    setActCorrectionReason('');
  };

  const openCreateAct = () => {
    if (!canEdit) return onUnauthorizedAction('Catat Aktivitas Emisi GRK');
    resetActForm();
    setShowActModal(true);
  };

  const openEditAct = (item: GhgActivityData) => {
    if (!canEdit) return onUnauthorizedAction('Edit Aktivitas Emisi GRK');
    setEditingActId(item.id);
    setActDate(item.date);
    setActCategory(item.activityCategory);
    setSourceLocation(item.sourceLocation);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setFactorId(item.factorId || '');
    setOfficer(item.officer);
    setActNotes(item.notes || '');
    setActCorrectionReason('');
    setShowActModal(true);
  };

  const handleActSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return onUnauthorizedAction('Simpan Aktivitas Emisi GRK');
    if (editingActId && actCorrectionReason.trim().length > 0 && actCorrectionReason.trim().length < 5) {
      triggerToast('Alasan koreksi historis minimal 5 karakter.', 'warning');
      return;
    }
    try {
      setIsSaving(true);
      const reportingYear = Number(actDate.slice(0, 4)) || currentYear;
      const monthPeriod = actDate.slice(0, 7);
      const matchedFactor = factors.find((f) => f.id === factorId) || null;
      const calc = calculateGhgActivityEmission({
        quantity: Number(quantity),
        unit: matchedFactor ? matchedFactor.unit : unit.trim(),
        activityCategory: actCategory,
        reportingYear,
        factor: matchedFactor,
      });

      const payload: Omit<GhgActivityData, 'id'> = {
        date: actDate,
        reportingYear,
        monthPeriod,
        activityCategory: actCategory,
        sourceLocation: sourceLocation.trim(),
        quantity: Number(quantity),
        unit: matchedFactor ? matchedFactor.unit : unit.trim(),
        factorId: calc.factorId,
        factorNameSnapshot: calc.factorNameSnapshot,
        factorValueSnapshot: calc.factorValueSnapshot,
        referenceSourceSnapshot: calc.referenceSourceSnapshot,
        gasScopeSnapshot: calc.gasScopeSnapshot,
        categorySnapshot: calc.categorySnapshot,
        unitSnapshot: calc.unitSnapshot,
        effectiveYearSnapshot: calc.effectiveYearSnapshot ?? null,
        gwpSnapshot: calc.gwpSnapshot,
        verificationStatusSnapshot: calc.verificationStatusSnapshot,
        calculationStatus: calc.calculationStatus,
        calculationNote: calc.calculationNote,
        emissionsTco2e: calc.emissionsTco2e,
        correctionReason: actCorrectionReason.trim() || undefined,
        officer: officer.trim(),
        notes: actNotes.trim() || undefined,
      };

      if (editingActId) {
        await ghgActivityService.update(editingActId, payload);
        triggerToast('Log aktivitas GRK berhasil diperbarui.', 'success');
      } else {
        await ghgActivityService.add(payload);
        triggerToast(
          calc.emissionsTco2e !== null
            ? 'Log aktivitas GRK berhasil dicatat.'
            : 'Log aktivitas dicatat dengan status BELUM TERHITUNG / PERLU VERIFIKASI.',
          calc.emissionsTco2e !== null ? 'success' : 'warning'
        );
      }
      setShowActModal(false);
      resetActForm();
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menyimpan aktivitas GRK.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAct = async () => {
    if (!deleteActTarget) return;
    if (!canDelete) return onUnauthorizedAction('Hapus Aktivitas GRK');
    try {
      setIsSaving(true);
      await ghgActivityService.delete(deleteActTarget.id);
      triggerToast('Log aktivitas GRK berhasil dihapus.', 'success');
      setDeleteActTarget(null);
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menghapus aktivitas GRK.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetFactorForm = () => {
    setEditingFactorId(null);
    setFCategory('Solar Alat Berat & Hauling');
    setFName('');
    setFUnit('Liter');
    setFValue(0);
    setFScope('Scope 1 (Emisi Langsung)');
    setFReference('');
    setFEffectiveYear(currentYear);
    setFGwpRef('AR5/AR6 IPCC');
    setFVerificationStatus('PERLU VERIFIKASI');
    setFNotes('');
  };

  const openCreateFactor = () => {
    if (!allowManageFactors) return onUnauthorizedAction('Tambah Master Faktor Emisi GRK (Khusus Environment Superintendent ke atas)');
    resetFactorForm();
    setShowFactorModal(true);
  };

  const openEditFactor = (f: GhgEmissionFactorData) => {
    if (!allowManageFactors) return onUnauthorizedAction('Edit Master Faktor Emisi GRK (Khusus Environment Superintendent ke atas)');
    setEditingFactorId(f.id);
    setFCategory(f.activityCategory);
    setFName(f.factorName);
    setFUnit(f.unit);
    setFValue(f.factorKgCo2ePerUnit);
    setFScope(f.gasScope);
    setFReference(f.referenceSource);
    setFEffectiveYear(f.effectiveYear);
    setFGwpRef(f.gwpReference || 'AR5/AR6 IPCC');
    setFVerificationStatus(f.verificationStatus || 'PERLU VERIFIKASI');
    setFNotes(f.notes || '');
    setShowFactorModal(true);
  };

  const handleFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowManageFactors) return onUnauthorizedAction('Simpan Master Faktor Emisi GRK (Khusus Environment Superintendent ke atas)');
    try {
      setIsSaving(true);
      const payload: Omit<GhgEmissionFactorData, 'id'> = {
        activityCategory: fCategory,
        factorName: fName.trim(),
        unit: fUnit.trim(),
        factorKgCo2ePerUnit: Number(fValue),
        gasScope: fScope,
        referenceSource: fReference.trim(),
        effectiveYear: Number(fEffectiveYear),
        gwpReference: fGwpRef.trim() || undefined,
        verificationStatus: fVerificationStatus,
        notes: fNotes.trim() || undefined,
      };
      if (editingFactorId) {
        await ghgFactorService.update(editingFactorId, payload);
        triggerToast('Master faktor emisi berhasil diperbarui (snapshot aktivitas historis tetap dipertahankan).', 'success');
      } else {
        await ghgFactorService.add(payload);
        triggerToast('Master faktor emisi baru berhasil ditambahkan.', 'success');
      }
      setShowFactorModal(false);
      resetFactorForm();
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menyimpan faktor emisi.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFactor = async () => {
    if (!deleteFactorTarget) return;
    if (!canDelete) return onUnauthorizedAction('Hapus Master Faktor Emisi');
    try {
      setIsSaving(true);
      await ghgFactorService.delete(deleteFactorTarget.id);
      triggerToast('Master faktor emisi berhasil dihapus.', 'success');
      setDeleteFactorTarget(null);
    } catch (err: any) {
      triggerToast(err?.message || 'Gagal menghapus faktor emisi.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    exportToExcel(
      filteredActivities.map((a) => ({
        ID: a.id,
        Tanggal: a.date,
        Tahun_Pelaporan: a.reportingYear,
        Periode_Bulan: a.monthPeriod,
        Kategori_Aktivitas: a.activityCategory,
        Lokasi_Sumber: a.sourceLocation,
        Kuantitas: a.quantity,
        Satuan: a.unit,
        Cakupan_Scope: a.gasScopeSnapshot || '-',
        Faktor_Emisi_kgCO2e_per_Unit: a.factorValueSnapshot ?? 'Belum Dipilih',
        Tahun_Faktor: a.effectiveYearSnapshot ?? '-',
        GWP_Ref: a.gwpSnapshot || '-',
        Sumber_Referensi_Faktor: a.referenceSourceSnapshot || '-',
        Status_Perhitungan: a.calculationStatus || (a.emissionsTco2e != null ? 'TERHITUNG' : 'BELUM TERHITUNG'),
        Total_Emisi_tCO2e: a.emissionsTco2e !== null && a.emissionsTco2e !== undefined ? a.emissionsTco2e : 'BELUM TERHITUNG',
        Petugas: a.officer,
        Catatan: a.notes || '',
      })),
      `Inventarisasi_GRK_${yearFilter}`
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-hi text-left">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green shrink-0">
            <CloudCog className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-hi font-heading">
              Inventarisasi Emisi Gas Rumah Kaca (GRK) — Pelaporan Tahunan Maret
            </h3>
            <p className="text-xs text-text-mid mt-0.5">
              Mengacu Perpres No. 110 Tahun 2025 &amp; Permen LH/BPLH No. 7 Tahun 2026. Faktor emisi dikelola sepenuhnya dari Master Faktor Emisi pengguna (tanpa angka bawaan).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredActivities.length === 0}
            className="px-3.5 py-2 bg-bg-2/80 border border-border-neon hover:border-neon-cyan/50 text-text-hi text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-neon-green" />
            Ekspor Rekap {yearFilter}
          </button>
          {subTab === 'activities' ? (
            <button
              type="button"
              onClick={openCreateAct}
              className="neon-btn-primary px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Catat Aktivitas GRK
            </button>
          ) : allowManageFactors ? (
            <button
              type="button"
              onClick={openCreateFactor}
              className="neon-btn-primary px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Tambah Faktor Emisi
            </button>
          ) : null}
        </div>
      </div>

      {/* Warning if master factors empty */}
      {factors.length === 0 && (
        <div className="p-4 rounded-2xl bg-neon-amber/10 border border-neon-amber/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-text-hi">
            <AlertTriangle className="w-4 h-4 text-neon-amber shrink-0 mt-0.5" />
            <span>
              <strong className="text-neon-amber">Master Faktor Emisi masih kosong.</strong> Untuk menghitung total ton CO₂e secara resmi, silakan tambahkan terlebih dahulu faktor emisi beserta sumber referensinya (mis. IPCC, KLH/BPLH, atau Kementerian ESDM) pada tab Master Faktor Emisi.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSubTab('factors')}
            className="px-3 py-1.5 bg-neon-amber/20 hover:bg-neon-amber/30 border border-neon-amber/50 text-neon-amber text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            Isi Faktor Emisi
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-border-subtle flex-wrap gap-2">
        <div className="flex">
          <button
            type="button"
            onClick={() => setSubTab('activities')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              subTab === 'activities'
                ? 'border-neon-cyan text-neon-cyan'
                : 'border-transparent text-text-mid hover:text-text-hi'
            }`}
          >
            Log Aktivitas &amp; Rekap Tahunan ({filteredActivities.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('factors')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              subTab === 'factors'
                ? 'border-neon-cyan text-neon-cyan'
                : 'border-transparent text-text-mid hover:text-text-hi'
            }`}
          >
            Master Faktor Emisi ({factors.length})
          </button>
        </div>

        <div className="flex items-center gap-2 pb-1.5">
          <Calendar className="w-3.5 h-3.5 text-text-mid" />
          <span className="text-xs font-semibold text-text-mid">Tahun Pelaporan:</span>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="px-2.5 py-1 text-xs font-mono font-bold"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {subTab === 'activities' && (
        <>
          {/* KPI Strip & Scope 1/2/3 Breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="neon-card p-4 lg:col-span-2">
              <span className="text-[11px] font-bold text-text-mid uppercase tracking-wider">Total Terhitung {yearFilter}</span>
              <p className="text-2xl font-bold text-neon-green mt-1 font-mono tabular-nums">
                {annualRecap.totalTco2e.toLocaleString('id-ID', { maximumFractionDigits: 3 })}{' '}
                <span className="text-xs font-normal text-text-mid">tCO₂e</span>
              </p>
              <span className="text-[10px] text-text-low">Berdasarkan snapshot historis faktor</span>
            </div>
            <div className="neon-card p-4">
              <span className="text-[10px] font-bold text-text-mid uppercase tracking-wider">Scope 1 (Langsung)</span>
              <p className="text-lg font-bold text-neon-cyan mt-1 font-mono tabular-nums">
                {annualRecap.scopeSummary.scope1.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
              </p>
              <span className="text-[10px] text-text-low">tCO₂e</span>
            </div>
            <div className="neon-card p-4">
              <span className="text-[10px] font-bold text-text-mid uppercase tracking-wider">Scope 2 (Energi)</span>
              <p className="text-lg font-bold text-text-hi mt-1 font-mono tabular-nums">
                {annualRecap.scopeSummary.scope2.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
              </p>
              <span className="text-[10px] text-text-low">tCO₂e</span>
            </div>
            <div className="neon-card p-4">
              <span className="text-[10px] font-bold text-text-mid uppercase tracking-wider">Scope 3 / Lahan</span>
              <p className="text-lg font-bold text-text-hi mt-1 font-mono tabular-nums">
                {annualRecap.scopeSummary.scope3.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
              </p>
              <span className="text-[10px] text-text-low">tCO₂e</span>
            </div>
            <div className="neon-card p-4">
              <span className="text-[10px] font-bold text-text-mid uppercase tracking-wider">Belum Terhitung / Verif.</span>
              <p
                className={`text-lg font-bold mt-1 font-mono tabular-nums ${
                  annualRecap.scopeSummary.uncalculatedCount + annualRecap.scopeSummary.needsVerificationCount > 0
                    ? 'text-neon-amber'
                    : 'text-text-hi'
                }`}
              >
                {annualRecap.scopeSummary.uncalculatedCount} / {annualRecap.scopeSummary.needsVerificationCount}
              </p>
              <span className="text-[10px] text-text-low">Belum hitung / Perlu verif</span>
            </div>
          </div>

          {/* Monthly Chart */}
          {annualRecap.monthlySeries.length > 0 && (
            <div className="glass-panel rounded-2xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-hi mb-3 font-heading">
                Tren Bulanan Emisi GRK Tahun {yearFilter} (tCO₂e)
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annualRecap.monthlySeries} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                    <XAxis dataKey="month" stroke={NEON_CHART.tickFill} fontSize={10} />
                    <YAxis stroke={NEON_CHART.tickFill} fontSize={10} />
                    <RechartsTooltip contentStyle={NEON_TOOLTIP_CONTENT_STYLE} />
                    <Bar dataKey="Emisi (tCO2e)" fill={NEON_CHART.green} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Activities Table */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-3 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kategori aktivitas, lokasi sumber, petugas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs"
                />
              </div>
              <span className="text-[11px] text-text-mid self-center font-mono">
                Batas Pelaporan GRK Tahunan: <strong className="text-neon-cyan">Maret {yearFilter + 1}</strong>
              </span>
            </div>

            <div className="overflow-x-auto max-h-[540px]">
              {isLoading ? (
                <div className="p-5">
                  <TableSkeleton rows={5} columns={6} />
                </div>
              ) : filteredActivities.length === 0 ? (
                <EmptyState
                  icon={CloudCog}
                  title={`Belum ada log aktivitas GRK untuk tahun ${yearFilter}`}
                  description="Catat pemakaian solar, listrik, atau bahan peledak untuk menyusun inventarisasi GRK tahunan."
                  actionLabel={canEdit ? 'Catat Aktivitas GRK' : undefined}
                  onAction={canEdit ? openCreateAct : undefined}
                />
              ) : (
                <table className="neon-table text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-mono uppercase tracking-wider">
                      <th className="p-3.5 pl-5">Tanggal &amp; Periode</th>
                      <th className="p-3.5">Kategori &amp; Sumber</th>
                      <th className="p-3.5 text-right">Data Aktivitas</th>
                      <th className="p-3.5">Faktor Emisi Dipakai</th>
                      <th className="p-3.5 text-right">Emisi (tCO₂e)</th>
                      <th className="p-3.5 text-center pr-5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3.5 pl-5 font-mono tabular-nums">
                          <div className="font-bold text-text-hi">{item.date}</div>
                          <div className="text-[10px] text-text-low">{item.monthPeriod}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-text-hi">{item.activityCategory}</div>
                          <div className="text-[10px] text-text-mid">
                            {item.sourceLocation} · PIC: {item.officer}
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-text-hi tabular-nums">
                          {item.quantity.toLocaleString('id-ID')} {item.unit}
                        </td>
                        <td className="p-3.5">
                          {item.factorNameSnapshot ? (
                            <div>
                              <div className="font-semibold text-text-hi">{item.factorNameSnapshot}</div>
                              <div className="text-[10px] font-mono text-text-mid tabular-nums">
                                {item.factorValueSnapshot != null ? `${item.factorValueSnapshot} kgCO₂e/${item.unitSnapshot || item.unit}` : 'Nilai faktor belum terverifikasi'} · {item.gasScopeSnapshot || 'Scope N/A'} ({item.referenceSourceSnapshot || '-'})
                              </div>
                            </div>
                          ) : (
                            <StatusBadge status="Belum Dievaluasi" label="BELUM TERHITUNG" />
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold tabular-nums">
                          {item.emissionsTco2e !== null && item.emissionsTco2e !== undefined ? (
                            <div>
                              <span className={item.calculationStatus === 'PERLU VERIFIKASI' ? 'text-neon-amber' : 'text-neon-green'}>
                                {item.emissionsTco2e.toLocaleString('id-ID', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 4,
                                })}
                              </span>
                              {item.calculationStatus === 'PERLU VERIFIKASI' && (
                                <div className="text-[9px] text-neon-amber uppercase">Perlu Verifikasi</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-neon-amber">BELUM TERHITUNG</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openEditAct(item)}
                                className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 rounded-lg cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeleteActTarget(item)}
                                className="p-1.5 text-neon-red bg-neon-red/10 hover:bg-neon-red/20 border border-neon-red/30 rounded-lg cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {subTab === 'factors' && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row gap-3 justify-between items-center">
            <p className="text-xs text-text-mid">
              Setiap faktor emisi wajib mencantumkan sumber referensi resmi (IPCC / KLH/BPLH / Kementerian ESDM) yang berlaku pada tahun pelaporan.
            </p>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-text-low absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari faktor / referensi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[540px]">
            {filteredFactors.length === 0 ? (
              <EmptyState
                icon={Sliders}
                title="Belum ada Master Faktor Emisi tersimpan"
                description="Tambahkan faktor emisi resmi beserta sumber referensinya untuk mengaktifkan perhitungan otomatis GRK."
                actionLabel={allowManageFactors ? 'Tambah Faktor Emisi' : undefined}
                onAction={allowManageFactors ? openCreateFactor : undefined}
              />
            ) : (
              <table className="neon-table text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase">
                    <th className="p-3.5 pl-5">Nama Faktor &amp; Kategori</th>
                    <th className="p-3.5">Cakupan Gas</th>
                    <th className="p-3.5 text-right">Nilai Faktor</th>
                    <th className="p-3.5">Sumber Referensi</th>
                    <th className="p-3.5 text-center">Tahun Berlaku</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFactors.map((f) => (
                    <tr key={f.id}>
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-text-hi">{f.factorName}</div>
                        <div className="text-[10px] text-text-mid">{f.activityCategory}</div>
                      </td>
                      <td className="p-3.5 text-text-mid">
                        <div>{f.gasScope}</div>
                        <div className="text-[10px] text-text-low">{f.gwpReference || 'GWP tidak dicatat'}</div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-neon-green tabular-nums">
                        {f.factorKgCo2ePerUnit} kgCO₂e / {f.unit}
                      </td>
                      <td className="p-3.5 text-text-mid max-w-xs">
                        <div>{f.referenceSource}</div>
                        <span className={`inline-block mt-0.5 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                          f.verificationStatus === 'Terverifikasi'
                            ? 'bg-neon-green/10 text-neon-green border-neon-green/35'
                            : 'bg-neon-amber/10 text-neon-amber border-neon-amber/35'
                        }`}>
                          {f.verificationStatus || 'PERLU VERIFIKASI'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono text-text-hi tabular-nums">{f.effectiveYear}</td>
                      <td className="p-3.5 text-center pr-5">
                        <div className="flex items-center justify-center gap-1">
                          {allowManageFactors && (
                            <button
                              type="button"
                              onClick={() => openEditFactor(f)}
                              className="p-1.5 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 rounded-lg cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteFactorTarget(f)}
                              className="p-1.5 text-neon-red bg-neon-red/10 hover:bg-neon-red/20 border border-neon-red/30 rounded-lg cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal Activity */}
      {showActModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="glass-panel rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-left">
              <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-2/70">
                <h3 className="text-sm font-bold text-neon-cyan font-heading">
                  {editingActId ? 'Edit Aktivitas Emisi GRK' : 'Catat Aktivitas Emisi GRK'}
                </h3>
                <button type="button" onClick={() => setShowActModal(false)} className="p-1.5 text-text-mid hover:text-text-hi cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleActSubmit} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Tanggal *</label>
                    <input type="date" required value={actDate} onChange={(e) => setActDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kategori Aktivitas *</label>
                    <select
                      value={actCategory}
                      onChange={(e) => {
                        const nextCat = e.target.value as GhgActivityCategory;
                        const defaultUnit = CATEGORY_DEFAULT_UNITS[nextCat] || unit;
                        setActCategory(nextCat);
                        setUnit(defaultUnit);
                        setFactorId('');
                      }}
                      className="w-full px-3 py-2 text-xs"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Lokasi / Sumber Emisi *</label>
                    <input type="text" required value={sourceLocation} onChange={(e) => setSourceLocation(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kuantitas Aktivitas *</label>
                    <input type="number" step="0.01" min={0} required value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Satuan *</label>
                    <input
                      type="text"
                      required
                      value={selectedFactor ? selectedFactor.unit : unit}
                      disabled={!!selectedFactor}
                      onChange={(e) => {
                        setUnit(e.target.value);
                        setFactorId('');
                      }}
                      className="w-full px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">
                      Faktor Emisi Kompatibel (Kategori &amp; Tahun &le; {actReportingYear})
                    </label>
                    <select
                      value={factorId}
                      onChange={(e) => {
                        setFactorId(e.target.value);
                        const found = factors.find((f) => f.id === e.target.value);
                        if (found) setUnit(found.unit);
                      }}
                      className="w-full px-3 py-2 text-xs"
                    >
                      <option value="">-- Belum Pilih Faktor (= BELUM TERHITUNG, bukan 0) --</option>
                      {factorCompatibility.compatible.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.factorName} ({f.factorKgCo2ePerUnit} kgCO₂e/{f.unit} · Thn {f.effectiveYear} · {f.verificationStatus || 'PERLU VERIFIKASI'})
                        </option>
                      ))}
                    </select>
                    {(factorCompatibility.excludedWrongCategory > 0 ||
                      factorCompatibility.excludedWrongUnit > 0 ||
                      factorCompatibility.excludedFutureYear > 0) && (
                      <p className="text-[10px] text-text-low mt-1 font-mono">
                        Faktor disaring otomatis: {factorCompatibility.excludedWrongCategory} beda kategori, {factorCompatibility.excludedWrongUnit} beda satuan, {factorCompatibility.excludedFutureYear} tahun berlaku &gt; {actReportingYear}.
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Petugas Pencatat *</label>
                    <input type="text" required value={officer} onChange={(e) => setOfficer(e.target.value)} className="w-full px-3 py-2 text-xs" />
                  </div>
                </div>
                <div className={`p-3 rounded-xl border text-xs flex flex-col gap-1 ${
                  previewCalc.calculationStatus === 'TERHITUNG'
                    ? 'bg-neon-green/10 border-neon-green/35'
                    : 'bg-neon-amber/10 border-neon-amber/35'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-text-hi font-semibold">Hasil Perhitungan Snapshot:</span>
                    <span className={`font-mono font-bold tabular-nums ${
                      previewCalc.emissionsTco2e !== null ? 'text-neon-green' : 'text-neon-amber'
                    }`}>
                      {previewCalc.emissionsTco2e !== null
                        ? `${previewCalc.emissionsTco2e} tCO₂e (${previewCalc.calculationStatus})`
                        : previewCalc.calculationStatus}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-mid">{previewCalc.calculationNote}</p>
                </div>
                {editingActId && (
                  <div>
                    <label className="block text-[11px] font-bold text-neon-amber uppercase mb-1">Alasan Koreksi Data Historis (Opsional)</label>
                    <input type="text" value={actCorrectionReason} onChange={(e) => setActCorrectionReason(e.target.value)} placeholder="Contoh: Koreksi volume bahan bakar sesuai logsheet" className="w-full px-3 py-2 text-xs" />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Catatan (Opsional)</label>
                  <textarea rows={2} value={actNotes} onChange={(e) => setActNotes(e.target.value)} className="w-full px-3 py-2 text-xs resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setShowActModal(false)} className="px-4 py-2 text-xs text-text-mid hover:text-text-hi cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSaving} className="neon-btn-primary px-5 py-2 text-xs rounded-xl cursor-pointer">
                    {isSaving ? 'Menyimpan...' : 'Simpan Log GRK'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Factor Master */}
      {showFactorModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="glass-panel rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-left">
              <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-2/70">
                <h3 className="text-sm font-bold text-neon-cyan font-heading">
                  {editingFactorId ? 'Edit Faktor Emisi GRK' : 'Tambah Master Faktor Emisi GRK'}
                </h3>
                <button type="button" onClick={() => setShowFactorModal(false)} className="p-1.5 text-text-mid hover:text-text-hi cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleFactorSubmit} className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Kategori Aktivitas *</label>
                    <select value={fCategory} onChange={(e) => setFCategory(e.target.value as GhgActivityCategory)} className="w-full px-3 py-2 text-xs">
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Cakupan (Scope) *</label>
                    <select value={fScope} onChange={(e) => setFScope(e.target.value as GhgEmissionFactorData['gasScope'])} className="w-full px-3 py-2 text-xs">
                      {SCOPES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Nama Faktor Emisi *</label>
                    <input type="text" required value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Contoh: Solar Industri / Gas Oil (IPCC 2006 / ESDM)" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Satuan Aktivitas *</label>
                    <input type="text" required value={fUnit} onChange={(e) => setFUnit(e.target.value)} placeholder="Liter / kWh / kg / Ha" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Nilai Faktor (kgCO₂e / Unit) *</label>
                    <input type="number" step="0.0001" min={0} required value={fValue} onChange={(e) => setFValue(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Tahun Berlaku *</label>
                    <input type="number" min={2000} max={2100} required value={fEffectiveYear} onChange={(e) => setFEffectiveYear(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Referensi GWP (Bila digunakan)</label>
                    <input type="text" value={fGwpRef} onChange={(e) => setFGwpRef(e.target.value)} placeholder="Contoh: AR5 / AR6 IPCC" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Status Verifikasi Faktor *</label>
                    <select value={fVerificationStatus} onChange={(e) => setFVerificationStatus(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                      <option value="PERLU VERIFIKASI">PERLU VERIFIKASI</option>
                      <option value="Terverifikasi">Terverifikasi</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Sumber Referensi Resmi (Wajib Diisi) *</label>
                    <input type="text" required value={fReference} onChange={(e) => setFReference(e.target.value)} placeholder="Contoh: Pedoman Inventarisasi GRK KLH/BPLH / IPCC 2006" className="w-full px-3 py-2 text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-text-mid uppercase mb-1">Catatan (Opsional)</label>
                    <textarea rows={2} value={fNotes} onChange={(e) => setFNotes(e.target.value)} className="w-full px-3 py-2 text-xs resize-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => setShowFactorModal(false)} className="px-4 py-2 text-xs text-text-mid hover:text-text-hi cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSaving} className="neon-btn-primary px-5 py-2 text-xs rounded-xl cursor-pointer">
                    {isSaving ? 'Menyimpan...' : 'Simpan Faktor Emisi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirm Modals */}
      {deleteActTarget && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="glass-panel rounded-2xl p-6 max-w-md w-full space-y-4">
              <h4 className="text-sm font-bold text-text-hi font-heading">Hapus Log Aktivitas GRK?</h4>
              <p className="text-xs text-text-mid">
                Catatan aktivitas <strong>{deleteActTarget.activityCategory}</strong> ({deleteActTarget.date}) akan dihapus permanen.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteActTarget(null)} className="px-4 py-2 text-xs text-text-mid hover:text-text-hi cursor-pointer">
                  Batal
                </button>
                <button type="button" disabled={isSaving} onClick={handleDeleteAct} className="neon-btn-danger px-4 py-2 text-xs rounded-xl cursor-pointer">
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteFactorTarget && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="glass-panel rounded-2xl p-6 max-w-md w-full space-y-4">
              <h4 className="text-sm font-bold text-text-hi font-heading">Hapus Faktor Emisi?</h4>
              <p className="text-xs text-text-mid">
                Faktor <strong>{deleteFactorTarget.factorName}</strong> akan dihapus dari master.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteFactorTarget(null)} className="px-4 py-2 text-xs text-text-mid hover:text-text-hi cursor-pointer">
                  Batal
                </button>
                <button type="button" disabled={isSaving} onClick={handleDeleteFactor} className="neon-btn-danger px-4 py-2 text-xs rounded-xl cursor-pointer">
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
