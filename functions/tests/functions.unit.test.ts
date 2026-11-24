/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { canonicalStringify } from '../../shared/hash';
import { DEFAULT_INTERNAL_THRESHOLDS_VALUE } from '../../shared/waterQualityEval';
import type { EnvironmentalStandard, WastewaterData } from '../../shared/waterTypes';
import { verifyCallerContext, type AuthzDbReader } from '../src/authz';
import {
  computeServerEvaluationPatch,
  processReevaluateRange,
  processWaterDocumentWrite,
} from '../src/waterEval';
import {
  computeServerSnapshotHash,
  processApproveEvidence,
  processCancelEvidence,
  processIssueDailyEvidence,
  processIssueMonthlyEvidence,
  processReviewEvidence,
  processReviseEvidence,
  type EvidenceDeps,
  type EvidenceTxAdapter,
} from '../src/evidence';
import { processRoleClaimsSync } from '../src/claims';
import {
  isClaimsTimestampOnlyUserUpdate,
  processServerAuditWrite,
  sanitizeAuditSnapshot,
} from '../src/audit';

function createMockDbReader(docs: Record<string, Record<string, any>>): AuthzDbReader {
  return {
    doc(docPath: string) {
      return {
        async get() {
          const hit = docs[docPath];
          return {
            exists: Boolean(hit),
            data: () => hit,
          };
        },
      };
    },
  };
}

const SAMPLE_WW_STANDARDS: EnvironmentalStandard[] = [
  {
    id: 'STD-WW-PH',
    media: 'air_limbah',
    parameterKey: 'ph',
    parameterLabel: 'pH',
    minLimit: 6,
    maxLimit: 9,
    unit: '-',
    basisRegulasi: 'KepMenLH 113/2003',
    effectiveFrom: '2020-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-WW-TSS',
    media: 'air_limbah',
    parameterKey: 'tss',
    parameterLabel: 'TSS',
    maxLimit: 200,
    unit: 'mg/L',
    basisRegulasi: 'KepMenLH 113/2003',
    effectiveFrom: '2020-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-WW-FE',
    media: 'air_limbah',
    parameterKey: 'fe',
    parameterLabel: 'Besi (Fe)',
    maxLimit: 7,
    unit: 'mg/L',
    basisRegulasi: 'KepMenLH 113/2003',
    effectiveFrom: '2020-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-WW-MN',
    media: 'air_limbah',
    parameterKey: 'mn',
    parameterLabel: 'Mangan (Mn)',
    maxLimit: 4,
    unit: 'mg/L',
    basisRegulasi: 'KepMenLH 113/2003',
    effectiveFrom: '2020-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-WW-DEBIT',
    media: 'air_limbah',
    parameterKey: 'debit',
    parameterLabel: 'Debit',
    minLimit: null,
    maxLimit: null,
    unit: 'm³/s',
    basisRegulasi: 'KepMenLH 113/2003',
    effectiveFrom: '2020-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
];

describe('Functions Authz (K-03)', () => {
  it('menolak unauthenticated, email belum terverifikasi, akun Pending/Suspended, dan membaca peran otoritatif dari /roles/{email}', async () => {
    const reader = createMockDbReader({
      'users/u-active': {
        uid: 'u-active',
        email: 'op@dkb.co.id',
        fullName: 'Budi Operator',
        position: 'Env Operator',
        role: 'Admin', // sengaja berbeda untuk pastikan tidak dipakai
        status: 'Active',
        isApproved: true,
        isActive: true,
        deleted: false,
      },
      'roles/op@dkb.co.id': { email: 'op@dkb.co.id', level: 'Operator' },
      'users/u-pending': {
        uid: 'u-pending',
        email: 'pending@dkb.co.id',
        status: 'Pending',
        isApproved: false,
      },
      'roles/pending@dkb.co.id': { email: 'pending@dkb.co.id', level: 'Admin' },
      'users/u-no-role': {
        uid: 'u-no-role',
        email: 'norole@dkb.co.id',
        status: 'Active',
        isApproved: true,
      },
    });

    await assert.rejects(
      () => verifyCallerContext(undefined, reader, 'Viewer'),
      /Autentikasi pengguna wajib tersedia/
    );

    await assert.rejects(
      () =>
        verifyCallerContext(
          { uid: 'u-active', token: { email: 'op@dkb.co.id', email_verified: false } },
          reader,
          'Viewer'
        ),
      /Email akun belum terverifikasi/
    );

    await assert.rejects(
      () =>
        verifyCallerContext(
          { uid: 'u-pending', token: { email: 'pending@dkb.co.id', email_verified: true } },
          reader,
          'Viewer'
        ),
      /belum aktif atau belum disetujui/
    );

    // Peran diambil dari /roles (Operator), bukan /users.role (Admin)
    await assert.rejects(
      () =>
        verifyCallerContext(
          { uid: 'u-active', token: { email: 'op@dkb.co.id', email_verified: true } },
          reader,
          'Environment Superintendent'
        ),
      /membutuhkan peran minimal Environment Superintendent/
    );

    const ctx = await verifyCallerContext(
      { uid: 'u-active', token: { email: 'op@dkb.co.id', email_verified: true } },
      reader,
      'Operator'
    );
    assert.equal(ctx.role, 'Operator');
    assert.equal(ctx.name, 'Budi Operator');

    // User tanpa /roles jatuh ke Viewer (tidak pernah ke users.role)
    const viewerCtx = await verifyCallerContext(
      { uid: 'u-no-role', token: { email: 'norole@dkb.co.id', email_verified: true } },
      reader,
      'Viewer'
    );
    assert.equal(viewerCtx.role, 'Viewer');
  });
});

describe('Functions Water Evaluation & ReevaluateRange (K-04)', () => {
  it('melewati penulisan bila flag serverEvaluation nonaktif atau hasil sudah identik (loop guard)', async () => {
    let written = 0;
    const disabledRes = await processWaterDocumentWrite(
      'wastewater',
      { id: 'WW-1', ph: 7, tss: 20, fe: 0.2, mn: 0.1, debit: 5 },
      async () => {
        written += 1;
      },
      {
        readFlags: async () => ({ serverEvaluation: false, serverEvidence: false, roleClaims: false }),
        loadStandards: async () => SAMPLE_WW_STANDARDS,
        loadThresholds: async () => DEFAULT_INTERNAL_THRESHOLDS_VALUE,
        serverTimestamp: () => 'SERVER_TS',
      }
    );
    assert.equal(disabledRes.status, 'skipped');
    assert.equal(disabledRes.reason, 'flag_disabled');
    assert.equal(written, 0);

    // Hitung patch pertama kali saat serverEvaluation aktif
    let capturedPatch: Record<string, unknown> | null = null;
    const firstWrite = await processWaterDocumentWrite(
      'wastewater',
      {
        id: 'WW-1',
        date: '2026-05-01',
        location: 'KPL-01',
        locationCode: 'KPL-01',
        ph: 7.2,
        tss: 45,
        fe: 0.5,
        mn: 0.2,
        debit: 12,
      },
      async (fields) => {
        capturedPatch = fields;
      },
      {
        readFlags: async () => ({ serverEvaluation: true, serverEvidence: false, roleClaims: false }),
        loadStandards: async () => SAMPLE_WW_STANDARDS,
        loadThresholds: async () => DEFAULT_INTERNAL_THRESHOLDS_VALUE,
        serverTimestamp: () => 'SERVER_TS',
      }
    );
    assert.equal(firstWrite.status, 'updated');
    assert.equal(capturedPatch?.evaluationStatus, 'MEMENUHI');
    assert.equal(capturedPatch?.status, 'Safe');
    assert.equal(capturedPatch?.serverEvaluatedAt, 'SERVER_TS');

    // Panggilan trigger kedua dengan snapshot sudah identik + serverEvaluatedAt ada -> harus skip (anti-loop)
    let secondWrites = 0;
    const secondRun = await processWaterDocumentWrite(
      'wastewater',
      {
        id: 'WW-1',
        date: '2026-05-01',
        location: 'KPL-01',
        locationCode: 'KPL-01',
        ph: 7.2,
        tss: 45,
        fe: 0.5,
        mn: 0.2,
        debit: 12,
        ...capturedPatch,
      },
      async () => {
        secondWrites += 1;
      },
      {
        readFlags: async () => ({ serverEvaluation: true, serverEvidence: false, roleClaims: false }),
        loadStandards: async () => SAMPLE_WW_STANDARDS,
        loadThresholds: async () => DEFAULT_INTERNAL_THRESHOLDS_VALUE,
        serverTimestamp: () => 'SERVER_TS',
      }
    );
    assert.equal(secondRun.status, 'skipped');
    assert.equal(secondRun.reason, 'unchanged');
    assert.equal(secondWrites, 0);
  });

  it('tidak mengubah null menjadi 0 dan menandai DATA TIDAK LENGKAP serta reevaluateRange memeriksa peran & alasan >= 20 karakter', async () => {
    const nullSample = computeServerEvaluationPatch(
      'air_limbah',
      {
        id: 'WW-NULL',
        date: '2026-05-02',
        location: 'KPL-01',
        ph: 7.0,
        tss: null,
        fe: 0.3,
        mn: 0.1,
        debit: 4,
      },
      SAMPLE_WW_STANDARDS,
      DEFAULT_INTERNAL_THRESHOLDS_VALUE
    );
    assert.equal(nullSample.patch.evaluationStatus, 'DATA TIDAK LENGKAP');
    assert.equal(nullSample.patch.status, 'Incomplete');

    const dbReader = createMockDbReader({
      'users/u-op': { uid: 'u-op', email: 'op@dkb.co.id', status: 'Active', isApproved: true },
      'roles/op@dkb.co.id': { level: 'Operator' },
      'users/u-supt': {
        uid: 'u-supt',
        email: 'supt@dkb.co.id',
        fullName: 'Sari Supt',
        status: 'Active',
        isApproved: true,
      },
      'roles/supt@dkb.co.id': { level: 'Environment Superintendent' },
    });

    const batchCaptured: { updates: Array<{ id: string; fields: Record<string, unknown> }>; audit: any } = {
      updates: [],
      audit: null,
    };

    const commonDeps = {
      dbReader,
      readFlags: async () => ({ serverEvaluation: true, serverEvidence: false, roleClaims: false }),
      loadStandards: async () => SAMPLE_WW_STANDARDS,
      loadThresholds: async () => DEFAULT_INTERNAL_THRESHOLDS_VALUE,
      loadRecords: async () => [
        {
          id: 'WW-A',
          date: '2026-05-01',
          location: 'KPL-01',
          locationCode: 'KPL-01',
          ph: 7.0,
          tss: 250, // melebihi max 200
          fe: 0.2,
          mn: 0.1,
          debit: 10,
          status: 'Safe',
          evaluationStatus: 'MEMENUHI',
        },
      ],
      applyBatchUpdates: async (updates: any, auditEntry: any) => {
        batchCaptured.updates = updates;
        batchCaptured.audit = auditEntry;
      },
      serverTimestamp: () => 'SERVER_TS',
      nowIso: () => '2026-05-10T00:00:00.000Z',
      newLogId: () => 'LOG-SRV-TEST-1',
    };

    // Operator ditolak
    await assert.rejects(
      () =>
        processReevaluateRange(
          { uid: 'u-op', token: { email: 'op@dkb.co.id', email_verified: true } },
          {
            collectionName: 'wastewater',
            correctionReason: 'Koreksi baku mutu air limbah tahun 2026',
          },
          commonDeps
        ),
      /Environment Superintendent/
    );

    // Alasan < 20 karakter ditolak
    await assert.rejects(
      () =>
        processReevaluateRange(
          { uid: 'u-supt', token: { email: 'supt@dkb.co.id', email_verified: true } },
          { collectionName: 'wastewater', correctionReason: 'Pendek' },
          commonDeps
        ),
      /minimal 20 karakter/
    );

    const res = await processReevaluateRange(
      { uid: 'u-supt', token: { email: 'supt@dkb.co.id', email_verified: true } },
      {
        collectionName: 'wastewater',
        fromDate: '2026-05-01',
        toDate: '2026-05-31',
        locationFilter: 'KPL-01',
        correctionReason: 'Pembaruan master baku mutu TSS sesuai SK Pertek 2026',
      },
      commonDeps
    );

    assert.equal(res.totalScanned, 1);
    assert.equal(res.updatedCount, 1);
    assert.equal(batchCaptured.updates[0].fields.evaluationStatus, 'TIDAK MEMENUHI');
    assert.equal(batchCaptured.updates[0].fields.status, 'Exceeded');
    assert.equal(batchCaptured.audit.data.source, 'server');
    assert.equal((batchCaptured.updates[0].fields.evaluationHistory as any[]).length, 1);
  });
});

describe('Functions Evidence Callables (K-02)', () => {
  function createInMemoryEvidenceHarness(initialDocs: Record<string, Record<string, any>>) {
    const store: Record<string, Record<string, any>> = { ...initialDocs };

    const dbReader: AuthzDbReader = {
      doc(docPath: string) {
        return {
          async get() {
            const hit = store[docPath];
            return { exists: Boolean(hit), data: () => (hit ? structuredClone(hit) : undefined) };
          },
        };
      },
    };

    const deps: EvidenceDeps = {
      dbReader,
      readFlags: async () => ({ serverEvaluation: false, serverEvidence: true, roleClaims: false }),
      getSignature: async (uid) => {
        const hit = store[`signatures/${uid}`];
        return hit?.dataUrl ? { dataUrl: hit.dataUrl } : null;
      },
      getWastewaterById: async (id) => {
        const hit = store[`wastewater/${id}`];
        return hit ? ({ id, ...hit } as WastewaterData) : null;
      },
      getWastewaterPhotoMeta: async () => null,
      getWastewaterByPeriod: async () =>
        Object.entries(store)
          .filter(([k]) => k.startsWith('wastewater/'))
          .map(([k, v]) => ({ id: k.replace('wastewater/', ''), ...v } as WastewaterData)),
      getDailyReportsByPeriod: async () => ({ '2026-05-01': 'FR-EMS-WQ-2026-00001' }),
      getLocationByCode: async (code) => ({
        id: 'LOC-1',
        code,
        name: 'Kolam Pengendap Lumpur 01',
        defaultSource: 'Settling Pond Outlet',
        isActive: true,
        docSuffix: 'KPL01',
      }),
      getWastewaterStandards: async () => SAMPLE_WW_STANDARDS,
      getThresholds: async () => DEFAULT_INTERNAL_THRESHOLDS_VALUE,
      runTransaction: async (fn) => {
        const stagedSets: Array<[string, Record<string, any>]> = [];
        const stagedUpdates: Array<[string, Record<string, any>]> = [];
        const tx: EvidenceTxAdapter = {
          getDoc: async (docPath) => {
            const hit = store[docPath];
            return { exists: Boolean(hit), data: () => (hit ? structuredClone(hit) : undefined) };
          },
          setDoc: (docPath, data) => {
            stagedSets.push([docPath, structuredClone(data)]);
          },
          updateDoc: (docPath, patch) => {
            stagedUpdates.push([docPath, structuredClone(patch)]);
          },
        };
        const result = await fn(tx);
        for (const [p, d] of stagedSets) {
          store[p] = d;
        }
        for (const [p, patch] of stagedUpdates) {
          const cur = store[p] || {};
          for (const [k, v] of Object.entries(patch)) {
            if (k.includes('.')) {
              const [top, child] = k.split('.');
              cur[top] = { ...(cur[top] || {}), [child]: v };
            } else {
              cur[k] = v;
            }
          }
          store[p] = cur;
        }
        return result;
      },
      nowIso: () => '2026-05-01T08:00:00.000Z',
      serverTimestamp: () => 'SERVER_TS',
      newToken: () => 'tokServerVerify16',
      newLogId: () => `LOG-SRV-${Object.keys(store).filter((k) => k.startsWith('audit_logs/')).length + 1}`,
    };

    return { store, deps };
  }

  it('menjalankan siklus penuh issueDaily -> issueMonthly -> review -> approve -> revise -> cancel dengan TTD dari signatures/{uid}, hash SHA-256 server, & pemisahan tugas', async () => {
    const { store, deps } = createInMemoryEvidenceHarness({
      'users/u-op': {
        uid: 'u-op',
        email: 'op@dkb.co.id',
        fullName: 'Operator Satu',
        position: 'Env Operator',
        status: 'Active',
        isApproved: true,
      },
      'roles/op@dkb.co.id': { level: 'Operator' },
      'signatures/u-op': { dataUrl: 'data:image/png;base64,OP_SIG_SERVER' },

      'users/u-fm': {
        uid: 'u-fm',
        email: 'fm@dkb.co.id',
        fullName: 'Foreman Dua',
        position: 'Env Foreman',
        status: 'Active',
        isApproved: true,
      },
      'roles/fm@dkb.co.id': { level: 'Foreman' },
      'signatures/u-fm': { dataUrl: 'data:image/png;base64,FM_SIG_SERVER' },

      'users/u-mgr': {
        uid: 'u-mgr',
        email: 'mgr@dkb.co.id',
        fullName: 'Manager Tiga',
        position: 'Environment Manager',
        status: 'Active',
        isApproved: true,
      },
      'roles/mgr@dkb.co.id': { level: 'Environment Manager' },
      'signatures/u-mgr': { dataUrl: 'data:image/png;base64,MGR_SIG_SERVER' },

      'users/u-admin': {
        uid: 'u-admin',
        email: 'admin@dkb.co.id',
        fullName: 'Admin Sistem',
        position: 'Admin',
        status: 'Active',
        isApproved: true,
      },
      'roles/admin@dkb.co.id': { level: 'Admin' },

      'users/u-nosig': {
        uid: 'u-nosig',
        email: 'nosig@dkb.co.id',
        fullName: 'No Signature',
        status: 'Active',
        isApproved: true,
      },
      'roles/nosig@dkb.co.id': { level: 'Operator' },

      'wastewater/WW-101': {
        id: 'WW-101',
        date: '2026-05-01',
        location: 'KPL-01',
        locationCode: 'KPL-01',
        monitoringType: 'Harian',
        ph: 7.0,
        tss: 40,
        fe: 0.4,
        mn: 0.2,
        debit: 15,
        officer: 'Operator Satu',
      },
    });

    // User tanpa signatures/{uid} wajib ditolak
    await assert.rejects(
      () =>
        processIssueDailyEvidence(
          { uid: 'u-nosig', token: { email: 'nosig@dkb.co.id', email_verified: true } },
          { wastewaterId: 'WW-101' },
          deps
        ),
      /Spesimen tanda tangan Anda belum tersimpan di server/
    );

    // Issue Daily Evidence oleh Operator
    const dailyReport = await processIssueDailyEvidence(
      { uid: 'u-op', token: { email: 'op@dkb.co.id', email_verified: true } },
      { wastewaterId: 'WW-101', followUpAction: 'Normal' },
      deps
    );
    assert.equal(dailyReport.documentNo, 'FR-EMS-WQ-2026-00001');
    assert.equal(dailyReport.status, 'Disiapkan');
    assert.equal(
      dailyReport.signatures.prepared?.signatureDataUrl,
      'data:image/png;base64,OP_SIG_SERVER'
    );
    const expectedHash = createHash('sha256')
      .update(canonicalStringify(dailyReport.snapshot), 'utf8')
      .digest('hex');
    assert.equal(dailyReport.snapshotHash, expectedHash);
    assert.equal(computeServerSnapshotHash(dailyReport.snapshot), expectedHash);
    assert.equal(store['counters/evidence-daily-2026']?.value, 1);
    assert.equal(store[`evidence_verify/${dailyReport.verifyToken}`]?.status, 'Disiapkan');

    // Pemisahan tugas: penyiap yang sama tidak boleh me-review
    await assert.rejects(
      () =>
        processReviewEvidence(
          { uid: 'u-op', token: { email: 'op@dkb.co.id', email_verified: true } },
          { reportId: dailyReport.id },
          deps
        ),
      /Minimal|Pemeriksa tidak boleh|membutuhkan peran minimal Foreman/
    );

    // Foreman review sah
    const revRes = await processReviewEvidence(
      { uid: 'u-fm', token: { email: 'fm@dkb.co.id', email_verified: true } },
      { reportId: dailyReport.id },
      deps
    );
    assert.equal(revRes.status, 'Diperiksa');
    assert.equal(store[`evidence_verify/${dailyReport.verifyToken}`]?.status, 'Diperiksa');

    // Tidak boleh review ulang setelah Diperiksa
    await assert.rejects(
      () =>
        processReviewEvidence(
          { uid: 'u-fm', token: { email: 'fm@dkb.co.id', email_verified: true } },
          { reportId: dailyReport.id },
          deps
        ),
      /Hanya dokumen berstatus Disiapkan/
    );

    // Environment Manager approve sah
    const appRes = await processApproveEvidence(
      { uid: 'u-mgr', token: { email: 'mgr@dkb.co.id', email_verified: true } },
      { reportId: dailyReport.id },
      deps
    );
    assert.equal(appRes.status, 'Disetujui');
    assert.equal(store[`evidence_verify/${dailyReport.verifyToken}`]?.status, 'Disetujui');

    // Issue Monthly Evidence
    const monthlyReport = await processIssueMonthlyEvidence(
      { uid: 'u-op', token: { email: 'op@dkb.co.id', email_verified: true } },
      { period: '2026-05', locationCode: 'KPL-01' },
      deps
    );
    assert.equal(monthlyReport.id, 'WQM-KPL-01-202605');
    assert.equal(monthlyReport.documentNo, 'FR-EMS-WQ-2026-M05-KPL01');

    // Revise Evidence
    const reviseRes = await processReviseEvidence(
      { uid: 'u-op', token: { email: 'op@dkb.co.id', email_verified: true } },
      { reportId: dailyReport.id, reason: 'Koreksi jam sampling lapangan' },
      deps
    );
    assert.equal(reviseRes.revision, 1);
    assert.equal(store[`evidence_reports/${dailyReport.id}`]?.status, 'Disiapkan');

    // Cancel Evidence hanya untuk Admin & alasan >= 10 karakter
    await assert.rejects(
      () =>
        processCancelEvidence(
          { uid: 'u-mgr', token: { email: 'mgr@dkb.co.id', email_verified: true } },
          { reportId: dailyReport.id, cancellationReason: 'Pembatalan duplikat dokumen resmi' },
          deps
        ),
      /membutuhkan peran minimal Admin/
    );

    const cancelRes = await processCancelEvidence(
      { uid: 'u-admin', token: { email: 'admin@dkb.co.id', email_verified: true } },
      { reportId: dailyReport.id, cancellationReason: 'Duplikasi nomor pengujian harian' },
      deps
    );
    assert.equal(cancelRes.status, 'Dibatalkan');
    assert.equal(store[`evidence_verify/${dailyReport.verifyToken}`]?.status, 'Dibatalkan');

    // Tidak bisa merevisi dokumen yang sudah Dibatalkan
    await assert.rejects(
      () =>
        processReviseEvidence(
          { uid: 'u-op', token: { email: 'op@dkb.co.id', email_verified: true } },
          { reportId: dailyReport.id, reason: 'Coba revisi' },
          deps
        ),
      /sudah dibatalkan/
    );
  });
});

describe('Functions Custom Claims Sync & Server Audit (K-03 & Audit)', () => {
  it('menyinkronkan customUserClaims (role, rank) & claimsUpdatedAt saat flag roleClaims aktif dan reset ke Viewer saat dokumen roles dihapus', async () => {
    const claimsSetCalls: Array<{ uid: string; claims: Record<string, any> }> = [];
    const stampedUids: string[] = [];

    const skippedOff = await processRoleClaimsSync(
      'op@dkb.co.id',
      undefined,
      { level: 'Operator' },
      {
        readFlags: async () => ({ roleClaims: false, serverEvaluation: false, serverEvidence: false }),
        getUserByEmail: async () => ({ uid: 'u-op', email: 'op@dkb.co.id' }),
        setCustomUserClaims: async () => {},
        stampUserClaimsUpdatedAt: async () => {},
      }
    );
    assert.equal(skippedOff.status, 'skipped');
    assert.equal(skippedOff.reason, 'flag_disabled');

    const syncedUp = await processRoleClaimsSync(
      'op@dkb.co.id',
      { level: 'Viewer' },
      { level: 'Environment Manager' },
      {
        readFlags: async () => ({ roleClaims: true, serverEvaluation: false, serverEvidence: false }),
        getUserByEmail: async () => ({ uid: 'u-op', email: 'op@dkb.co.id', customClaims: { role: 'Viewer', rank: 0 } }),
        setCustomUserClaims: async (uid, claims) => {
          claimsSetCalls.push({ uid, claims });
        },
        stampUserClaimsUpdatedAt: async (uid) => {
          stampedUids.push(uid);
        },
      }
    );
    assert.equal(syncedUp.status, 'synced');
    assert.equal(syncedUp.role, 'Environment Manager');
    assert.equal(syncedUp.rank, 4);
    assert.deepEqual(claimsSetCalls[0], {
      uid: 'u-op',
      claims: { role: 'Environment Manager', rank: 4 },
    });
    assert.deepEqual(stampedUids, ['u-op']);

    // Saat dokumen /roles dihapus -> reset kembali ke Viewer (rank 0)
    const deletedRes = await processRoleClaimsSync(
      'op@dkb.co.id',
      { level: 'Environment Manager' },
      undefined,
      {
        readFlags: async () => ({ roleClaims: true, serverEvaluation: false, serverEvidence: false }),
        getUserByEmail: async () => ({ uid: 'u-op', email: 'op@dkb.co.id', customClaims: { role: 'Environment Manager', rank: 4 } }),
        setCustomUserClaims: async (uid, claims) => {
          claimsSetCalls.push({ uid, claims });
        },
        stampUserClaimsUpdatedAt: async (uid) => {
          stampedUids.push(uid);
        },
      }
    );
    assert.equal(deletedRes.status, 'synced');
    assert.equal(deletedRes.role, 'Viewer');
    assert.equal(deletedRes.rank, 0);
  });

  it('menyensor data sensitif/besar di audit server, mengabaikan pembaruan claimsUpdatedAt saja, dan menulis source=server', async () => {
    const sanitized = sanitizeAuditSnapshot({
      id: 'RPT-1',
      status: 'Disiapkan',
      signatureDataUrl: 'data:image/png;base64,VERYLONG',
      dataUrl: 'data:image/jpeg;base64,ABC',
      snapshot: { overall: 'MEMENUHI', locationCode: 'KPL-01', period: '2026-05', days: [1, 2, 3] },
      customUrl: 'data:image/png;base64,SECRET',
    });
    assert.ok(sanitized);
    assert.equal('signatureDataUrl' in sanitized, false);
    assert.equal('dataUrl' in sanitized, false);
    assert.equal('snapshot' in sanitized, false);
    assert.equal(sanitized.snapshotSummary.overall, 'MEMENUHI');
    assert.equal(sanitized.customUrl, '[REDACTED_DATA_URL]');

    assert.equal(
      isClaimsTimestampOnlyUserUpdate(
        'users',
        { uid: 'u1', fullName: 'A', claimsUpdatedAt: 1 },
        { uid: 'u1', fullName: 'A', claimsUpdatedAt: 2 }
      ),
      true
    );

    const skippedAudit = await processServerAuditWrite(
      'users',
      'u1',
      { uid: 'u1', claimsUpdatedAt: 1 },
      { uid: 'u1', claimsUpdatedAt: 2 },
      {
        writeAuditLog: async () => {
          throw new Error('Tidak boleh menulis log untuk claimsUpdatedAt saja');
        },
        serverTimestamp: () => 'SERVER_TS',
        newLogId: () => 'LOG-1',
      }
    );
    assert.equal(skippedAudit.status, 'skipped');

    let loggedPayload: Record<string, unknown> | null = null;
    const written = await processServerAuditWrite(
      'wastewater',
      'WW-1',
      undefined,
      { id: 'WW-1', officer: 'Operator', createdBy: 'op@dkb.co.id', ph: 7 },
      {
        writeAuditLog: async (_id, data) => {
          loggedPayload = data;
        },
        serverTimestamp: () => 'SERVER_TS',
        newLogId: () => 'LOG-SRV-99',
      }
    );
    assert.equal(written.status, 'logged');
    assert.equal(loggedPayload?.source, 'server');
    assert.equal(loggedPayload?.action, 'insert');
    assert.equal(loggedPayload?.collection, 'wastewater');
  });
});
