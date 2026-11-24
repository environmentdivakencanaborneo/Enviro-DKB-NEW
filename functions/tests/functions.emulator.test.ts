/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { processWaterDocumentWrite, processReevaluateRange } from '../src/waterEval';
import { processRoleClaimsSync } from '../src/claims';
import { processServerAuditWrite } from '../src/audit';

const hasEmulator = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB
);
const skipReason = hasEmulator
  ? false
  : 'Firebase Emulator Suite tidak berjalan (set FIRESTORE_EMULATOR_HOST & FIREBASE_AUTH_EMULATOR_HOST dengan Java terpasang)';

const PROJECT_ID = 'dkb-emms-fn-test';

describe('Functions Integration against Firebase Emulator', { skip: skipReason }, () => {
  let app: ReturnType<typeof initializeApp>;

  before(() => {
    app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID });
  });

  after(async () => {
    if (app) {
      await deleteApp(app);
    }
  });

  beforeEach(async () => {
    const db = getFirestore(app);
    const snap = await db.collection('wastewater').get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  });

  it('menghitung kepatuhan sampel pada Firestore Emulator dan mencegah write berulang saat trigger dijalankan ulang', async () => {
    const db = getFirestore(app);
    await db.doc('app_meta/feature_flags').set({
      serverEvaluation: true,
      serverEvidence: false,
      roleClaims: false,
    });
    await db.doc('standards/STD-WW-PH').set({
      id: 'STD-WW-PH',
      media: 'air_limbah',
      parameter: 'pH',
      name: 'pH Air Limbah',
      minVal: 6,
      maxVal: 9,
      unit: '-',
      status: 'Aktif',
    });

    const sampleRef = db.doc('wastewater/WW-EMU-1');
    await sampleRef.set({
      id: 'WW-EMU-1',
      date: '2026-05-05',
      location: 'KPL-01',
      locationCode: 'KPL-01',
      officer: 'Operator Emulator',
      ph: 7.4,
      tss: 40,
      fe: 0.4,
      mn: 0.2,
      debit: 8,
    });

    const snap1 = await sampleRef.get();
    const res1 = await processWaterDocumentWrite(
      'wastewater',
      snap1.data(),
      (fields) => sampleRef.update(fields as Record<string, any>)
    );
    assert.equal(res1.status, 'updated');

    const snap2 = await sampleRef.get();
    assert.equal(snap2.data()?.evaluationStatus, 'MEMENUHI');
    assert.ok(snap2.data()?.serverEvaluatedAt);

    // Panggilan ulang harus di-skip oleh loop guard
    const res2 = await processWaterDocumentWrite(
      'wastewater',
      snap2.data(),
      (fields) => sampleRef.update(fields as Record<string, any>)
    );
    assert.equal(res2.status, 'skipped');
    assert.equal(res2.reason, 'unchanged');

    // Audit server trigger menulis source = 'server'
    const auditRes = await processServerAuditWrite(
      'wastewater',
      'WW-EMU-1',
      undefined,
      snap2.data()
    );
    assert.equal(auditRes.status, 'logged');
    if (auditRes.logId) {
      const logSnap = await db.doc(`audit_logs/${auditRes.logId}`).get();
      assert.equal(logSnap.data()?.source, 'server');
    }

    // Uji reevaluateRange callable logic via Admin SDK
    await db.doc('users/uid-emu-supt').set({
      uid: 'uid-emu-supt',
      email: 'supt-emu@dkb.co.id',
      fullName: 'Supt Emulator',
      status: 'Active',
      isApproved: true,
    });
    await db.doc('roles/supt-emu@dkb.co.id').set({ level: 'Environment Superintendent' });

    const reeval = await processReevaluateRange(
      { uid: 'uid-emu-supt', token: { email: 'supt-emu@dkb.co.id', email_verified: true } },
      {
        collectionName: 'wastewater',
        correctionReason: 'Validasi ulang seluruh data emulator pasca deploy',
        onlyChanged: false,
      }
    );
    assert.equal(reeval.updatedCount >= 1, true);
  });

  it('menyinkronkan Custom Claims Auth Emulator saat roleClaims aktif (jika Auth Emulator tersedia)', async (t) => {
    if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      t.skip('FIREBASE_AUTH_EMULATOR_HOST tidak aktif');
      return;
    }
    const db = getFirestore(app);
    const adminAuth = getAuth(app);
    await db.doc('app_meta/feature_flags').set({
      roleClaims: true,
      serverEvaluation: false,
      serverEvidence: false,
    });
    const created = await adminAuth.createUser({
      email: 'claims-emu@dkb.co.id',
      emailVerified: true,
      password: 'Password123!',
    });
    await db.doc(`users/${created.uid}`).set({
      uid: created.uid,
      email: 'claims-emu@dkb.co.id',
      status: 'Active',
      isApproved: true,
    });

    const syncRes = await processRoleClaimsSync(
      'claims-emu@dkb.co.id',
      undefined,
      { level: 'Foreman' }
    );
    assert.equal(syncRes.status, 'synced');
    const refreshed = await adminAuth.getUser(created.uid);
    assert.equal(refreshed.customClaims?.role, 'Foreman');
    assert.equal(refreshed.customClaims?.rank, 2.5);
  });
});
