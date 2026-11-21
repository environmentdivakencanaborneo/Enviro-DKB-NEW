import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidCalendarDate,
  WastewaterSchema,
  RegulatoryWatchSchema,
  GhgActivitySchema,
  EnvironmentalStandardSchema,
} from '../src/utils/validation';
import { isActiveApproved, effectiveRole } from '../src/services/permissionService';

describe('Validasi Data, Regulasi & Keanggotaan Ketat (Section 7 Support)', () => {
  it('1. isValidCalendarDate menolak tanggal kalender palsu (mis. 2025-02-29, 2026-04-31)', () => {
    assert.equal(isValidCalendarDate('2024-02-29'), true); // tahun kabisat
    assert.equal(isValidCalendarDate('2025-02-29'), false);
    assert.equal(isValidCalendarDate('2026-04-31'), false);
    assert.equal(isValidCalendarDate('2026-13-01'), false);
    assert.equal(isValidCalendarDate('2026-05-15'), true);
  });

  it('2. Schema Wastewater & GhgActivity menolak NaN dan Infinity', () => {
    const wwRes = WastewaterSchema.safeParse({
      id: 'WW-1',
      date: '2026-05-01',
      location: 'Outlet KPL-01',
      officer: 'Andi',
      ph: NaN,
      tss: 100,
      debit: 0.4,
      fe: 1.0,
      mn: 0.5,
      status: 'Incomplete',
    });
    assert.equal(wwRes.success, false);

    const ghgRes = GhgActivitySchema.safeParse({
      id: 'GA-1',
      date: '2026-05-01',
      reportingYear: 2026,
      monthPeriod: '2026-05',
      activityCategory: 'Solar Alat Berat & Hauling',
      sourceLocation: 'Pit A',
      quantity: Infinity,
      unit: 'Liter',
      emissionsTco2e: null,
      officer: 'Andi',
    });
    assert.equal(ghgRes.success, false);
  });

  it('3. RegulatoryWatchSchema mendukung 5 status resmi & status menunggu verifikasi tanpa mengarang tanggal', () => {
    const res = RegulatoryWatchSchema.safeParse({
      id: 'REG-2026-LAB',
      source: 'KLH/BPLH',
      regulationNo: 'Nomor Resmi Menunggu Verifikasi (2026)',
      about: 'Pengaturan Laboratorium Lingkungan Hidup',
      issueDate: '',
      implication: 'Memerlukan verifikasi resmi sebelum dijadikan acuan wajib.',
      status: 'MENUNGGU VERIFIKASI',
      verificationStatus: 'Perlu verifikasi',
    });
    assert.equal(res.success, true);

    const badDateRes = RegulatoryWatchSchema.safeParse({
      id: 'REG-BAD',
      source: 'ESDM',
      regulationNo: 'No. 1/2026',
      about: 'Uji validasi tanggal',
      issueDate: '2025-02-29',
      implication: 'Tidak boleh valid',
      status: 'DRAFT',
    });
    assert.equal(badDateRes.success, false);
  });

  it('4. EnvironmentalStandardSchema menerima status lifecycle lengkap & applicable boolean', () => {
    const std = EnvironmentalStandardSchema.safeParse({
      id: 'STD-TEST',
      media: 'air_limbah',
      parameterKey: 'tss',
      parameterLabel: 'TSS',
      unit: 'mg/L',
      minLimit: null,
      maxLimit: null,
      basisRegulasi: 'SK Pertek PT DKB',
      isActive: true,
      applicable: true,
      verificationStatus: 'Perlu verifikasi',
      effectiveStatus: 'MENUNGGU VERIFIKASI',
    });
    assert.equal(std.success, true);
  });

  it('5. isActiveApproved menerapkan logika AND ketat dan menolak Active tanpa isApproved === true', () => {
    assert.equal(isActiveApproved({ status: 'Pending', isApproved: false, role: 'Admin' }), false);
    assert.equal(isActiveApproved({ status: 'Active', isApproved: false, role: 'Admin' }), false);
    assert.equal(isActiveApproved({ status: 'Suspended', isApproved: true, role: 'Operator' }), false);
    assert.equal(isActiveApproved({ status: 'Active', isApproved: true, isActive: false, role: 'Operator' }), false);
    assert.equal(isActiveApproved({ status: 'Active', isApproved: true, deleted: true, role: 'Operator' }), false);
    assert.equal(effectiveRole({ status: 'Active', isApproved: false, role: 'Admin' }), 'Viewer');
    assert.equal(isActiveApproved({ status: 'Active', isApproved: true, role: 'Environment Superintendent' }), true);
    assert.equal(effectiveRole({ status: 'Active', isApproved: true, role: 'Manager' }), 'Environment Manager');
  });
});
