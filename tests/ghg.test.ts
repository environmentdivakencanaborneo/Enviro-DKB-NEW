import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterCompatibleGhgFactors,
  calculateGhgActivityEmission,
  summarizeGhgByScope,
} from '../src/utils/ghgCalc';
import type { GhgEmissionFactorData, GhgActivityData } from '../src/types';

const SAMPLE_FACTORS: GhgEmissionFactorData[] = [
  {
    id: 'GF-SOLAR-2025',
    activityCategory: 'Solar Alat Berat & Hauling',
    factorName: 'Solar B35 (2025)',
    unit: 'Liter',
    factorKgCo2ePerUnit: 2.68,
    gasScope: 'Scope 1 (Emisi Langsung)',
    referenceSource: 'IPCC 2006 / KLHK',
    effectiveYear: 2025,
    gwpReference: 'IPCC AR5',
    verificationStatus: 'Terverifikasi',
  },
  {
    id: 'GF-SOLAR-2027',
    activityCategory: 'Solar Alat Berat & Hauling',
    factorName: 'Solar B40 (2027)',
    unit: 'Liter',
    factorKgCo2ePerUnit: 2.55,
    gasScope: 'Scope 1 (Emisi Langsung)',
    referenceSource: 'KLHK Proyeksi',
    effectiveYear: 2027,
    gwpReference: 'IPCC AR6',
    verificationStatus: 'Terverifikasi',
  },
  {
    id: 'GF-PLN-2025',
    activityCategory: 'Listrik PLN / Non-Tambang',
    factorName: 'Grid Kalimantan',
    unit: 'kWh',
    factorKgCo2ePerUnit: 0.92,
    gasScope: 'Scope 2 (Energi Tidak Langsung)',
    referenceSource: 'KESDM 2024',
    effectiveYear: 2025,
    gwpReference: 'IPCC AR5',
    verificationStatus: 'Terverifikasi',
  },
];

describe('Inventarisasi GRK — Kompatibilitas Faktor, Snapshot Historis & Scope (Section 7.D)', () => {
  it('1 & 2. Faktor emisi disaring sesuai kategori, satuan, dan tahun berlaku <= tahun pelaporan', () => {
    const filtered2026 = filterCompatibleGhgFactors(
      SAMPLE_FACTORS,
      'Solar Alat Berat & Hauling',
      'Liter',
      2026
    );
    assert.equal(filtered2026.compatible.length, 1);
    assert.equal(filtered2026.compatible[0].id, 'GF-SOLAR-2025');
    assert.equal(filtered2026.excludedWrongCategory, 1); // GF-PLN-2025
    assert.equal(filtered2026.excludedFutureYear, 1); // GF-SOLAR-2027

    const filtered2027 = filterCompatibleGhgFactors(
      SAMPLE_FACTORS,
      'Solar Alat Berat & Hauling',
      'Liter',
      2027
    );
    assert.equal(filtered2027.compatible.length, 2);
  });

  it('3. Faktor emisi kosong -> emissionsTco2e === null & BELUM TERHITUNG (bukan nol)', () => {
    const out = calculateGhgActivityEmission({
      quantity: 5000,
      unit: 'Liter',
      activityCategory: 'Solar Alat Berat & Hauling',
      reportingYear: 2026,
      factor: null,
    });
    assert.equal(out.emissionsTco2e, null);
    assert.equal(out.calculationStatus, 'BELUM TERHITUNG');
    assert.equal(out.factorValueSnapshot, null);
  });

  it('4. Satuan aktivitas tidak sesuai faktor -> PERLU VERIFIKASI & tidak menghasilkan angka keliru', () => {
    const out = calculateGhgActivityEmission({
      quantity: 10,
      unit: 'Ton',
      activityCategory: 'Solar Alat Berat & Hauling',
      reportingYear: 2026,
      factor: SAMPLE_FACTORS[0], // satuan Liter
    });
    assert.equal(out.emissionsTco2e, null);
    assert.equal(out.calculationStatus, 'PERLU VERIFIKASI');
  });

  it('5 & 6. Pembaruan master faktor tidak mengubah riwayat perhitungan historis yang tersimpan dalam snapshot', () => {
    const calc = calculateGhgActivityEmission({
      quantity: 1000,
      unit: 'Liter',
      activityCategory: 'Solar Alat Berat & Hauling',
      reportingYear: 2026,
      factor: SAMPLE_FACTORS[0],
    });
    assert.equal(calc.emissionsTco2e, 2.68);
    assert.equal(calc.calculationStatus, 'TERHITUNG');

    const historicalActivity: GhgActivityData = {
      id: 'GA-HIST-1',
      date: '2026-02-10',
      reportingYear: 2026,
      monthPeriod: '2026-02',
      activityCategory: 'Solar Alat Berat & Hauling',
      sourceLocation: 'Pit Utara',
      quantity: 1000,
      unit: 'Liter',
      emissionsTco2e: calc.emissionsTco2e,
      calculationStatus: calc.calculationStatus,
      factorId: calc.factorId,
      factorNameSnapshot: calc.factorNameSnapshot,
      factorValueSnapshot: calc.factorValueSnapshot,
      referenceSourceSnapshot: calc.referenceSourceSnapshot,
      gasScopeSnapshot: calc.gasScopeSnapshot,
      officer: 'Andi',
    };

    // Master faktor diubah nilainya (misal koreksi faktor baru 9.99)
    const mutatedMasterFactors: GhgEmissionFactorData[] = [
      { ...SAMPLE_FACTORS[0], factorKgCo2ePerUnit: 9.99, gasScope: 'Scope 3 / Lahan' },
    ];

    const recap = summarizeGhgByScope([historicalActivity], mutatedMasterFactors);
    assert.equal(recap.totalTco2e, 2.68);
    assert.equal(recap.scope1, 2.68);
    assert.equal(recap.scope3, 0);
  });

  it('7. Rekap per Scope menghitung Scope 1, Scope 2, Scope 3 dan menghitung aktivitas BELUM TERHITUNG terpisah', () => {
    const activities: GhgActivityData[] = [
      {
        id: 'GA-1',
        date: '2026-03-01',
        reportingYear: 2026,
        monthPeriod: '2026-03',
        activityCategory: 'Solar Alat Berat & Hauling',
        sourceLocation: 'Hauling Road',
        quantity: 2000,
        unit: 'Liter',
        emissionsTco2e: 5.36,
        calculationStatus: 'TERHITUNG',
        gasScopeSnapshot: 'Scope 1 (Emisi Langsung)',
        officer: 'Andi',
      },
      {
        id: 'GA-2',
        date: '2026-03-02',
        reportingYear: 2026,
        monthPeriod: '2026-03',
        activityCategory: 'Listrik PLN / Non-Tambang',
        sourceLocation: 'Kantor Utama',
        quantity: 1000,
        unit: 'kWh',
        emissionsTco2e: 0.92,
        calculationStatus: 'TERHITUNG',
        gasScopeSnapshot: 'Scope 2 (Energi Tidak Langsung)',
        officer: 'Andi',
      },
      {
        id: 'GA-3',
        date: '2026-03-03',
        reportingYear: 2026,
        monthPeriod: '2026-03',
        activityCategory: 'Perubahan Lahan Terbuka',
        sourceLocation: 'Pit Timur',
        quantity: 1,
        unit: 'Ha',
        emissionsTco2e: 12.5,
        calculationStatus: 'PERLU VERIFIKASI',
        gasScopeSnapshot: 'Scope 3 / Lahan',
        officer: 'Andi',
      },
      {
        id: 'GA-4',
        date: '2026-03-04',
        reportingYear: 2026,
        monthPeriod: '2026-03',
        activityCategory: 'Bahan Peledak (ANFO/Emulsi)',
        sourceLocation: 'Pit Barat',
        quantity: 500,
        unit: 'Kg',
        emissionsTco2e: null,
        calculationStatus: 'BELUM TERHITUNG',
        officer: 'Andi',
      },
    ];

    const recap = summarizeGhgByScope(activities);
    assert.equal(recap.scope1, 5.36);
    assert.equal(recap.scope2, 0.92);
    assert.equal(recap.scope3, 12.5);
    assert.equal(recap.totalTco2e, 18.78);
    assert.equal(recap.uncalculatedCount, 1);
    assert.equal(recap.needsVerificationCount, 1);
  });
});
