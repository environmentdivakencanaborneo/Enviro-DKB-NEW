/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GhgActivityCategory,
  GhgActivityData,
  GhgEmissionFactorData,
} from '../types';

export function normalizeGhgUnit(unit?: string | null): string {
  if (!unit) return '';
  const clean = unit.trim().toLowerCase();
  if (clean === 'l' || clean === 'ltr' || clean === 'liter') return 'liter';
  if (clean === 'kwh') return 'kwh';
  if (clean === 'mwh') return 'mwh';
  if (clean === 'kg' || clean === 'kilogram') return 'kg';
  if (clean === 'ton' || clean === 't' || clean === 'metrik ton') return 'ton';
  if (clean === 'ha' || clean === 'hektar' || clean === 'hektare') return 'ha';
  if (clean === 'm3' || clean === 'm³') return 'm3';
  return clean;
}

export interface CompatibleFactorsResult {
  compatible: GhgEmissionFactorData[];
  excludedWrongCategory: number;
  excludedWrongUnit: number;
  excludedFutureYear: number;
}

/**
 * Menyaring master faktor emisi yang sah untuk aktivitas tertentu:
 * - Kategori aktivitas harus sama.
 * - Satuan harus cocok (setelah normalisasi penulisan).
 * - Tahun berlaku faktor (effectiveYear) <= tahun pelaporan aktivitas.
 */
export function filterCompatibleGhgFactors(
  factors: GhgEmissionFactorData[],
  category: GhgActivityCategory,
  unit: string,
  reportingYear: number
): CompatibleFactorsResult {
  const normTargetUnit = normalizeGhgUnit(unit);
  let excludedWrongCategory = 0;
  let excludedWrongUnit = 0;
  let excludedFutureYear = 0;

  const compatible = factors
    .filter((f) => {
      if (f.activityCategory !== category) {
        excludedWrongCategory++;
        return false;
      }
      if (normTargetUnit && normalizeGhgUnit(f.unit) !== normTargetUnit) {
        excludedWrongUnit++;
        return false;
      }
      if (typeof f.effectiveYear === 'number' && f.effectiveYear > reportingYear) {
        excludedFutureYear++;
        return false;
      }
      return true;
    })
    .sort((a, b) => (b.effectiveYear || 0) - (a.effectiveYear || 0));

  return {
    compatible,
    excludedWrongCategory,
    excludedWrongUnit,
    excludedFutureYear,
  };
}

export interface GhgCalculationOutput {
  emissionsTco2e: number | null;
  calculationStatus: 'TERHITUNG' | 'BELUM TERHITUNG' | 'PERLU VERIFIKASI';
  calculationNote: string;
  factorId?: string;
  factorNameSnapshot?: string;
  factorValueSnapshot: number | null;
  referenceSourceSnapshot?: string;
  gasScopeSnapshot?: string;
  categorySnapshot?: string;
  unitSnapshot?: string;
  effectiveYearSnapshot?: number | null;
  gwpSnapshot?: string;
  verificationStatusSnapshot?: 'Terverifikasi' | 'PERLU VERIFIKASI';
}

export function calculateGhgActivityEmission(params: {
  quantity: unknown;
  unit: string;
  activityCategory: GhgActivityCategory;
  reportingYear: number;
  factor?: GhgEmissionFactorData | null;
}): GhgCalculationOutput {
  const { quantity, unit, activityCategory, reportingYear, factor } = params;

  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
    return {
      emissionsTco2e: null,
      calculationStatus: 'BELUM TERHITUNG',
      calculationNote: 'Jumlah aktivitas kosong atau tidak valid.',
      factorValueSnapshot: null,
    };
  }

  if (!factor) {
    return {
      emissionsTco2e: null,
      calculationStatus: 'BELUM TERHITUNG',
      calculationNote: 'Faktor emisi belum dipilih; emisi bertanda BELUM TERHITUNG (bukan nol).',
      factorValueSnapshot: null,
    };
  }

  if (factor.activityCategory !== activityCategory) {
    return {
      emissionsTco2e: null,
      calculationStatus: 'BELUM TERHITUNG',
      calculationNote: `Kategori faktor (${factor.activityCategory}) tidak cocok dengan kategori aktivitas (${activityCategory}).`,
      factorValueSnapshot: null,
    };
  }

  if (normalizeGhgUnit(factor.unit) !== normalizeGhgUnit(unit)) {
    return {
      emissionsTco2e: null,
      calculationStatus: 'PERLU VERIFIKASI',
      calculationNote: `Satuan aktivitas (${unit}) tidak sesuai dengan satuan faktor emisi (${factor.unit}).`,
      factorId: factor.id,
      factorNameSnapshot: factor.factorName,
      factorValueSnapshot: null,
      referenceSourceSnapshot: factor.referenceSource,
      gasScopeSnapshot: factor.gasScope,
      categorySnapshot: factor.activityCategory,
      unitSnapshot: factor.unit,
      effectiveYearSnapshot: factor.effectiveYear,
      gwpSnapshot: factor.gwpReference || undefined,
      verificationStatusSnapshot: 'PERLU VERIFIKASI',
    };
  }

  if (typeof factor.effectiveYear === 'number' && factor.effectiveYear > reportingYear) {
    return {
      emissionsTco2e: null,
      calculationStatus: 'PERLU VERIFIKASI',
      calculationNote: `Faktor berlaku mulai tahun ${factor.effectiveYear}, melebihi tahun aktivitas ${reportingYear}.`,
      factorId: factor.id,
      factorNameSnapshot: factor.factorName,
      factorValueSnapshot: null,
      referenceSourceSnapshot: factor.referenceSource,
      gasScopeSnapshot: factor.gasScope,
      categorySnapshot: factor.activityCategory,
      unitSnapshot: factor.unit,
      effectiveYearSnapshot: factor.effectiveYear,
      gwpSnapshot: factor.gwpReference || undefined,
      verificationStatusSnapshot: 'PERLU VERIFIKASI',
    };
  }

  if (typeof factor.factorKgCo2ePerUnit !== 'number' || !Number.isFinite(factor.factorKgCo2ePerUnit) || factor.factorKgCo2ePerUnit < 0) {
    return {
      emissionsTco2e: null,
      calculationStatus: 'BELUM TERHITUNG',
      calculationNote: 'Nilai numerik faktor emisi tidak valid.',
      factorValueSnapshot: null,
    };
  }

  const rawTco2e = (quantity * factor.factorKgCo2ePerUnit) / 1000;
  const rounded = Math.round((rawTco2e + Number.EPSILON) * 1_000_000) / 1_000_000;

  const missingRef = !factor.referenceSource || factor.referenceSource.trim().length < 3;
  const needsVerification =
    factor.verificationStatus === 'PERLU VERIFIKASI' || missingRef;

  return {
    emissionsTco2e: rounded,
    calculationStatus: needsVerification ? 'PERLU VERIFIKASI' : 'TERHITUNG',
    calculationNote: needsVerification
      ? 'Sumber/status verifikasi faktor emisi perlu dikonfirmasi sebelum pelaporan resmi.'
      : `Dihitung menggunakan faktor ${factor.factorName} (${factor.effectiveYear}) — ${factor.referenceSource}`,
    factorId: factor.id,
    factorNameSnapshot: factor.factorName,
    factorValueSnapshot: factor.factorKgCo2ePerUnit,
    referenceSourceSnapshot: factor.referenceSource,
    gasScopeSnapshot: factor.gasScope,
    categorySnapshot: factor.activityCategory,
    unitSnapshot: factor.unit,
    effectiveYearSnapshot: factor.effectiveYear,
    gwpSnapshot: factor.gwpReference || undefined,
    verificationStatusSnapshot: needsVerification ? 'PERLU VERIFIKASI' : 'Terverifikasi',
  };
}

export interface GhgScopeRecap {
  totalTco2e: number;
  scope1: number;
  scope2: number;
  scope3: number;
  unclassifiedScope: number;
  uncalculatedCount: number;
  needsVerificationCount: number;
  legacySnapshotFallbackCount: number;
}

/**
 * Rekap emisi GRK per Scope berbasis SNAPSHOT historis pada masing-masing aktivitas.
 * Pembaruan master `ghg_factors` TIDAK mengubah total historis yang sudah tercatat.
 */
export function summarizeGhgByScope(
  activities: GhgActivityData[],
  legacyFallbackFactors?: GhgEmissionFactorData[]
): GhgScopeRecap {
  let totalTco2e = 0;
  let scope1 = 0;
  let scope2 = 0;
  let scope3 = 0;
  let unclassifiedScope = 0;
  let uncalculatedCount = 0;
  let needsVerificationCount = 0;
  let legacySnapshotFallbackCount = 0;

  for (const act of activities) {
    const val = act.emissionsTco2e;
    if (act.calculationStatus === 'BELUM TERHITUNG' || val === null || val === undefined || !Number.isFinite(val)) {
      uncalculatedCount++;
      continue;
    }
    if (act.calculationStatus === 'PERLU VERIFIKASI') {
      needsVerificationCount++;
    }

    totalTco2e += val;

    let scope = act.gasScopeSnapshot;
    if (!scope && act.factorId && legacyFallbackFactors) {
      const fb = legacyFallbackFactors.find((f) => f.id === act.factorId);
      if (fb) {
        scope = fb.gasScope;
        legacySnapshotFallbackCount++;
      }
    }

    if (scope && scope.startsWith('Scope 1')) {
      scope1 += val;
    } else if (scope && scope.startsWith('Scope 2')) {
      scope2 += val;
    } else if (scope && scope.startsWith('Scope 3')) {
      scope3 += val;
    } else {
      unclassifiedScope += val;
    }
  }

  const r = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;
  return {
    totalTco2e: r(totalTco2e),
    scope1: r(scope1),
    scope2: r(scope2),
    scope3: r(scope3),
    unclassifiedScope: r(unclassifiedScope),
    uncalculatedCount,
    needsVerificationCount,
    legacySnapshotFallbackCount,
  };
}
