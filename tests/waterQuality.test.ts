import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSampleCompliance, parseStrictNumber } from '../src/utils/waterQualityEval';
import { INITIAL_STANDARDS_SEED, DEFAULT_INTERNAL_THRESHOLDS } from '../src/data/regulations';
import type { EnvironmentalStandard } from '../src/types';

function makeVerifiedWastewaterStandards(): EnvironmentalStandard[] {
  return [
    {
      id: 'STD-TEST-PH',
      media: 'air_limbah',
      parameterKey: 'ph',
      parameterLabel: 'pH',
      unit: '-',
      minLimit: 6.0,
      maxLimit: 9.0,
      basisRegulasi: 'Kepmen LH No. 113 Tahun 2003',
      approvalDocNo: 'Kepmen LH 113/2003',
      isActive: true,
      applicable: true,
      verificationStatus: 'Terverifikasi',
      effectiveStatus: 'BERLAKU',
    },
    {
      id: 'STD-TEST-TSS',
      media: 'air_limbah',
      parameterKey: 'tss',
      parameterLabel: 'TSS',
      unit: 'mg/L',
      minLimit: null,
      maxLimit: 300,
      basisRegulasi: 'SK Pertek PT DKB',
      approvalDocNo: '503/IPAL-LH/DPM-PTSP/2021',
      isActive: true,
      applicable: true,
      verificationStatus: 'Terverifikasi',
      effectiveStatus: 'BERLAKU',
    },
    {
      id: 'STD-TEST-DEBIT',
      media: 'air_limbah',
      parameterKey: 'debit',
      parameterLabel: 'Debit',
      unit: 'm³/s',
      minLimit: null,
      maxLimit: null,
      basisRegulasi: 'Kepmen LH No. 113 Tahun 2003',
      approvalDocNo: 'Kepmen LH 113/2003',
      isActive: true,
      applicable: true,
      verificationStatus: 'Terverifikasi',
      effectiveStatus: 'BERLAKU',
    },
    {
      id: 'STD-TEST-FE',
      media: 'air_limbah',
      parameterKey: 'fe',
      parameterLabel: 'Besi (Fe)',
      unit: 'mg/L',
      minLimit: null,
      maxLimit: 7.0,
      basisRegulasi: 'Kepmen LH No. 113 Tahun 2003',
      approvalDocNo: 'Kepmen LH 113/2003',
      isActive: true,
      applicable: true,
      verificationStatus: 'Terverifikasi',
      effectiveStatus: 'BERLAKU',
    },
    {
      id: 'STD-TEST-MN',
      media: 'air_limbah',
      parameterKey: 'mn',
      parameterLabel: 'Mangan (Mn)',
      unit: 'mg/L',
      minLimit: null,
      maxLimit: 4.0,
      basisRegulasi: 'Kepmen LH No. 113 Tahun 2003',
      approvalDocNo: 'Kepmen LH 113/2003',
      isActive: true,
      applicable: true,
      verificationStatus: 'Terverifikasi',
      effectiveStatus: 'BERLAKU',
    },
  ];
}

describe('Pencemaran Air — Evaluasi Baku Mutu & Antitesis Coercion Nol (Section 7.A)', () => {
  it('1. Semua parameter memenuhi standar terverifikasi -> MEMENUHI', () => {
    const res = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-05-01', locationCode: 'KPL-01', ph: 7.2, tss: 120, debit: 0.45, fe: 1.5, mn: 0.8 },
      { standards: makeVerifiedWastewaterStandards(), thresholds: DEFAULT_INTERNAL_THRESHOLDS }
    );
    assert.equal(res.overall, 'MEMENUHI');
    assert.equal(res.legacyStatus, 'Safe');
    assert.deepEqual(res.failedParams, []);
    assert.deepEqual(res.incompleteParams, []);
  });

  it('2. Salah satu parameter melampaui baku mutu -> TIDAK MEMENUHI', () => {
    const res = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-05-01', locationCode: 'KPL-01', ph: 7.1, tss: 315, debit: 0.4, fe: 2.0, mn: 1.0 },
      { standards: makeVerifiedWastewaterStandards(), thresholds: DEFAULT_INTERNAL_THRESHOLDS }
    );
    assert.equal(res.overall, 'TIDAK MEMENUHI');
    assert.equal(res.legacyStatus, 'Exceeded');
    assert.ok(res.failedParams.includes('TSS'));
  });

  it('3. Nilai parameter kosong (null, undefined, "", NaN, Infinity) -> TIDAK dikonversi ke 0 & status DATA TIDAK LENGKAP', () => {
    assert.equal(parseStrictNumber(null), null);
    assert.equal(parseStrictNumber(undefined), null);
    assert.equal(parseStrictNumber(''), null);
    assert.equal(parseStrictNumber('   '), null);
    assert.equal(parseStrictNumber(NaN), null);
    assert.equal(parseStrictNumber(Infinity), null);
    assert.equal(parseStrictNumber(0), 0);

    const res = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-05-01', locationCode: 'KPL-01', ph: null, tss: '', debit: 0.4, fe: NaN, mn: Infinity },
      { standards: makeVerifiedWastewaterStandards(), thresholds: DEFAULT_INTERNAL_THRESHOLDS }
    );
    assert.equal(res.overall, 'DATA TIDAK LENGKAP');
    assert.equal(res.legacyStatus, 'Incomplete');
    assert.equal(res.params.ph.value, null);
    assert.equal(res.params.tss.value, null);
    assert.equal(res.params.fe.value, null);
    assert.equal(res.params.mn.value, null);
    assert.equal(res.failedParams.length, 0);
  });

  it('4. Satuan pengukuran tidak sesuai dengan master parameter -> DATA TIDAK LENGKAP', () => {
    const res = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-05-01', locationCode: 'KPL-01', ph: 7.2, tss: 0.2, debit: 0.4, fe: 1.0, mn: 0.5 },
      {
        standards: makeVerifiedWastewaterStandards(),
        thresholds: DEFAULT_INTERNAL_THRESHOLDS,
        unitMap: { tss: 'g/L' },
      }
    );
    assert.equal(res.overall, 'DATA TIDAK LENGKAP');
    assert.equal(res.params.tss.status, 'data_tidak_lengkap');
  });

  it('5. Standar belum diverifikasi (Perlu verifikasi / MENUNGGU VERIFIKASI) -> BELUM DIEVALUASI (tidak boleh MEMENUHI)', () => {
    const res = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-05-01', locationCode: 'KPL-01', ph: 7.2, tss: 100, debit: 0.4, fe: 1.0, mn: 0.5 },
      { standards: INITIAL_STANDARDS_SEED as EnvironmentalStandard[], thresholds: DEFAULT_INTERNAL_THRESHOLDS }
    );
    assert.equal(res.overall, 'BELUM DIEVALUASI');
    assert.equal(res.legacyStatus, 'Unevaluated');
    assert.ok(res.unverifiedParams.includes('TSS'));
  });

  it('6. Standar berbeda antar titik penaatan (lokasi spesifik menang atas standar umum)', () => {
    const standards = [
      ...makeVerifiedWastewaterStandards(),
      {
        id: 'STD-TEST-TSS-KPL02',
        media: 'air_limbah' as const,
        parameterKey: 'tss',
        parameterLabel: 'TSS',
        unit: 'mg/L',
        minLimit: null,
        maxLimit: 150,
        basisRegulasi: 'Pertek KPL-02 Ketat',
        approvalDocNo: 'PERTEK-KPL02/2026',
        locationCode: 'KPL-02',
        isActive: true,
        applicable: true,
        verificationStatus: 'Terverifikasi' as const,
        effectiveStatus: 'BERLAKU' as const,
      },
    ];

    const resKpl01 = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-05-01', locationCode: 'KPL-01', ph: 7.2, tss: 180, debit: 0.4, fe: 1.0, mn: 0.5 },
      { standards }
    );
    const resKpl02 = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-05-01', locationCode: 'KPL-02', ph: 7.2, tss: 180, debit: 0.4, fe: 1.0, mn: 0.5 },
      { standards }
    );
    assert.equal(resKpl01.overall, 'MEMENUHI');
    assert.equal(resKpl02.overall, 'TIDAK MEMENUHI');
    assert.ok(resKpl02.failedParams.includes('TSS'));
  });

  it('7. Standar berubah pada tahun berikutnya (transisi tanggal effectiveFrom / effectiveTo)', () => {
    const baseWithoutTss = makeVerifiedWastewaterStandards().filter((s) => s.parameterKey !== 'tss');
    const standards: EnvironmentalStandard[] = [
      ...baseWithoutTss,
      {
        id: 'STD-TSS-2025',
        media: 'air_limbah',
        parameterKey: 'tss',
        parameterLabel: 'TSS',
        unit: 'mg/L',
        minLimit: null,
        maxLimit: 300,
        basisRegulasi: 'SK Pertek 2025',
        effectiveFrom: '2025-01-01',
        effectiveTo: '2025-12-31',
        isActive: true,
        applicable: true,
        verificationStatus: 'Terverifikasi',
        effectiveStatus: 'BERLAKU',
      },
      {
        id: 'STD-TSS-2026',
        media: 'air_limbah',
        parameterKey: 'tss',
        parameterLabel: 'TSS',
        unit: 'mg/L',
        minLimit: null,
        maxLimit: 200,
        basisRegulasi: 'SK Pertek 2026',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        isActive: true,
        applicable: true,
        verificationStatus: 'Terverifikasi',
        effectiveStatus: 'BERLAKU',
      },
    ];

    const res2025 = evaluateSampleCompliance(
      'air_limbah',
      { date: '2025-12-31', locationCode: 'KPL-01', ph: 7.2, tss: 250, debit: 0.4, fe: 1.0, mn: 0.5 },
      { standards }
    );
    const res2026 = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-01-01', locationCode: 'KPL-01', ph: 7.2, tss: 250, debit: 0.4, fe: 1.0, mn: 0.5 },
      { standards }
    );
    assert.equal(res2025.overall, 'MEMENUHI');
    assert.equal(res2026.overall, 'TIDAK MEMENUHI');
  });

  it('8. Nilai tepat sama dengan batas (batas inklusif tidak dianggap melampaui)', () => {
    const res = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-05-01', locationCode: 'KPL-01', ph: 9.0, tss: 300, debit: 0.4, fe: 7.0, mn: 4.0 },
      { standards: makeVerifiedWastewaterStandards() }
    );
    assert.equal(res.overall, 'MEMENUHI');
    assert.deepEqual(res.failedParams, []);
  });

  it('9. Standar dengan applicable=false menandai TIDAK BERLAKU dan tidak membuat pelanggaran semu', () => {
    const nonApplicableStandards = makeVerifiedWastewaterStandards().map((s) => ({
      ...s,
      applicable: false,
    }));
    const res = evaluateSampleCompliance(
      'air_limbah',
      { date: '2026-05-01', locationCode: 'KPL-01', ph: 4.5, tss: 900, debit: 0, fe: 20, mn: 10 },
      { standards: nonApplicableStandards }
    );
    assert.equal(res.overall, 'TIDAK BERLAKU');
    assert.equal(res.legacyStatus, 'NotApplicable');
  });
});
