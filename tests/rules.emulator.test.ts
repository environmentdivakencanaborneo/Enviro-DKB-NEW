import { describe, it, before, after, beforeEach } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  documentId,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB);
const skipReason = hasEmulator
  ? false
  : 'Firestore Emulator tidak berjalan (set FIRESTORE_EMULATOR_HOST atau jalankan npm run test:rules dengan Java terpasang)';

const PROJECT_ID = 'dkb-emms-test';

let testEnv: RulesTestEnvironment;

async function seedUsersAndRoles() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const seedUser = async (
      uid: string,
      email: string,
      role: string,
      opts?: { approved?: boolean; status?: string; skipRoleDoc?: boolean }
    ) => {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        fullName: uid,
        role,
        isApproved: opts?.approved ?? true,
        status: opts?.status ?? 'Active',
        isActive: (opts?.status ?? 'Active') === 'Active',
        deleted: false,
      });
      if (!opts?.skipRoleDoc) {
        await setDoc(doc(db, 'roles', email), {
          email,
          level: role,
        });
      }
    };

    await seedUser('uid-viewer', 'viewer@dkb.co.id', 'Viewer');
    await seedUser('uid-auditor', 'auditor@dkb.co.id', 'Auditor');
    await seedUser('uid-operator', 'operator@dkb.co.id', 'Operator');
    await seedUser('uid-foreman', 'foreman@dkb.co.id', 'Foreman');
    await seedUser('uid-supt', 'supt@dkb.co.id', 'Environment Superintendent');
    await seedUser('uid-manager', 'manager@dkb.co.id', 'Environment Manager');
    await seedUser('uid-admin', 'sysadmin@dkb.co.id', 'Admin');
    await seedUser('uid-pending', 'pending@dkb.co.id', 'Operator', { approved: false, status: 'Pending' });
    // Uji K-03: users.role = Admin tapi /roles tidak ada -> rules harus anggap Viewer
    await seedUser('uid-spoof', 'spoof@dkb.co.id', 'Admin', { skipRoleDoc: true });
  });
}

describe('Emulator Firestore Security Rules Revisi 08 (@firebase/rules-unit-testing)', { skip: skipReason }, () => {
  before(async () => {
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules },
    });
  });

  after(async () => {
    await testEnv?.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedUsersAndRoles();
  });

  it('K-03: /roles adalah sumber peran tunggal, Manager tidak bisa self-escalate atau tulis Admin/Manager', async () => {
    const spoofCtx = testEnv.authenticatedContext('uid-spoof', { email: 'spoof@dkb.co.id', email_verified: true });
    await assertFails(setDoc(doc(spoofCtx.firestore(), 'roles', 'viewer@dkb.co.id'), { level: 'Admin', email: 'viewer@dkb.co.id' }));

    const managerCtx = testEnv.authenticatedContext('uid-manager', { email: 'manager@dkb.co.id', email_verified: true });
    // Manager dilarang promosi diri sendiri
    await assertFails(updateDoc(doc(managerCtx.firestore(), 'roles', 'manager@dkb.co.id'), { level: 'Admin' }));
    // Manager dilarang menetapkan Admin atau Environment Manager ke user lain
    await assertFails(setDoc(doc(managerCtx.firestore(), 'roles', 'viewer@dkb.co.id'), { level: 'Admin', email: 'viewer@dkb.co.id' }));
    await assertFails(setDoc(doc(managerCtx.firestore(), 'roles', 'viewer@dkb.co.id'), { level: 'Environment Manager', email: 'viewer@dkb.co.id' }));
    // Manager boleh menetapkan hingga Environment Superintendent
    await assertSucceeds(setDoc(doc(managerCtx.firestore(), 'roles', 'viewer@dkb.co.id'), { level: 'Environment Superintendent', email: 'viewer@dkb.co.id' }));
    // Manager dilarang mengubah /users/{uid}.role
    await assertFails(updateDoc(doc(managerCtx.firestore(), 'users', 'uid-viewer'), { role: 'Operator' }));

    const adminCtx = testEnv.authenticatedContext('uid-admin', { email: 'sysadmin@dkb.co.id', email_verified: true });
    // Strict Admin boleh mengubah role user lain, tapi tidak untuk dirinya sendiri
    await assertFails(updateDoc(doc(adminCtx.firestore(), 'roles', 'sysadmin@dkb.co.id'), { level: 'Viewer' }));
    await assertSucceeds(updateDoc(doc(adminCtx.firestore(), 'roles', 'viewer@dkb.co.id'), { level: 'Environment Manager' }));
  });

  it('K-02 & S-08: State machine evidence_reports, pemisahan penanda tangan, dan pengikatan counter/verify', async () => {
    const opCtx = testEnv.authenticatedContext('uid-operator', { email: 'operator@dkb.co.id', email_verified: true });
    const fmCtx = testEnv.authenticatedContext('uid-foreman', { email: 'foreman@dkb.co.id', email_verified: true });
    const mgrCtx = testEnv.authenticatedContext('uid-manager', { email: 'manager@dkb.co.id', email_verified: true });

    const opDb = opCtx.firestore();
    const reportId = 'WQD-KPL01-20260401';
    const token = 'tok-abc12345';

    const batch = writeBatch(opDb);
    batch.set(doc(opDb, 'evidence_reports', reportId), {
      id: reportId,
      type: 'daily',
      documentNo: 'FR-EMS-WQ-2026-00001',
      revision: 0,
      period: '2026-04',
      locationCode: 'KPL-01',
      status: 'Disiapkan',
      snapshot: { overall: 'MEMENUHI' },
      snapshotHash: 'hash-001',
      verifyToken: token,
      signatures: {
        prepared: {
          uid: 'uid-operator',
          email: 'operator@dkb.co.id',
          name: 'Operator',
          position: 'Operator',
          signedAt: '2026-04-01',
          signatureDataUrl: 'data:image/png;base64,AA==',
        },
      },
      createdBy: 'operator@dkb.co.id',
    });
    batch.set(doc(opDb, 'counters', 'evidence-daily-2026'), {
      value: 1,
      updatedAt: serverTimestamp(),
      lastReportId: reportId,
    });
    batch.set(doc(opDb, 'evidence_verify', token), {
      reportId,
      documentNo: 'FR-EMS-WQ-2026-00001',
      type: 'daily',
      period: '2026-04',
      locationCode: 'KPL-01',
      issuedAt: '2026-04-01',
      status: 'Disiapkan',
      overall: 'MEMENUHI',
      hashPrefix: 'hash-001',
    });
    await assertSucceeds(batch.commit());

    // Penanda tangan yang sama tidak boleh me-review laporan miliknya
    await assertFails(
      updateDoc(doc(opDb, 'evidence_reports', reportId), {
        status: 'Diperiksa',
      })
    );

    // Foreman review sah (harus pakai batch bila ubah evidence_verify bersama report)
    const fmDb = fmCtx.firestore();
    const fmBatch = writeBatch(fmDb);
    fmBatch.update(doc(fmDb, 'evidence_reports', reportId), {
      status: 'Diperiksa',
      'signatures.reviewed': {
        uid: 'uid-foreman',
        email: 'foreman@dkb.co.id',
        name: 'Foreman',
        position: 'Foreman',
        signedAt: '2026-04-01',
        signatureDataUrl: 'data:image/png;base64,BB==',
      },
      updatedBy: 'foreman@dkb.co.id',
    });
    fmBatch.update(doc(fmDb, 'evidence_verify', token), {
      reportId,
      status: 'Diperiksa',
      overall: 'MEMENUHI',
      hashPrefix: 'hash-001',
    });
    await assertSucceeds(fmBatch.commit());

    // Lompat ke Disetujui dengan memalsukan snapshotHash harus ditolak
    const mgrDb = mgrCtx.firestore();
    await assertFails(
      updateDoc(doc(mgrDb, 'evidence_reports', reportId), {
        status: 'Disetujui',
        snapshotHash: 'tampered',
        'signatures.approved': {
          uid: 'uid-manager',
          email: 'manager@dkb.co.id',
          name: 'Manager',
          position: 'Environment Manager',
          signedAt: '2026-04-01',
          signatureDataUrl: 'data:image/png;base64,CC==',
        },
        updatedBy: 'manager@dkb.co.id',
      })
    );
  });

  it('T-02 & T-03: Data finansial/PROPER terisolasi dan proteksi write master data untuk Operator', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'reclamation', 'RP-001'), {
        id: 'RP-001',
        areaName: 'Pit Utara',
        sizeHa: 10,
        targetYear: 2026,
        plantType: 'Sengon',
        method: 'Revegetasi',
        estimatedCost: 1000,
        status: 'In Progress',
        pic: 'Tim',
      });
      await setDoc(doc(db, 'reclamation', 'RG-001'), {
        id: 'RG-001',
        guaranteeNo: 'JAMREK-1',
        guaranteeType: 'Time Deposit',
        value: 5000000,
        issuingInstitution: 'Bank Mandiri',
        issuedDate: '2026-01-01',
        dueDate: '2027-01-01',
        status: 'Active',
      });
      await setDoc(doc(db, 'costs', 'COST-001'), {
        id: 'COST-001',
        year: 2026,
        period: 'Januari',
        category: 'Pemantauan Kualitas Lingkungan',
        plannedOpex: 1000,
        plannedCapex: 0,
        realizedOpex: 500,
        realizedCapex: 0,
        officer: 'Supt',
      });
    });

    const opDb = testEnv.authenticatedContext('uid-operator', { email: 'operator@dkb.co.id', email_verified: true }).firestore();
    const audDb = testEnv.authenticatedContext('uid-auditor', { email: 'auditor@dkb.co.id', email_verified: true }).firestore();

    // Operator bisa query RP-* tetapi ditolak membaca RG-* dan costs
    await assertSucceeds(getDocs(query(collection(opDb, 'reclamation'), where(documentId(), '>=', 'RP-'), where(documentId(), '<', 'RP.'))));
    await assertFails(getDoc(doc(opDb, 'reclamation', 'RG-001')));
    await assertFails(getDoc(doc(opDb, 'costs', 'COST-001')));
    // Auditor diizinkan read RG-* & costs, namun ditolak write
    await assertSucceeds(getDoc(doc(audDb, 'reclamation', 'RG-001')));
    await assertSucceeds(getDoc(doc(audDb, 'costs', 'COST-001')));

    // Operator ditolak membuat faktor emisi GRK dan master kalender
    await assertFails(
      setDoc(doc(opDb, 'ghg_factors', 'GF-001'), {
        id: 'GF-001',
        activityCategory: 'Solar Alat Berat & Hauling',
        factorName: 'Solar B35',
        unit: 'Liter',
        factorKgCo2ePerUnit: 2.68,
        gasScope: 'Scope 1 (Emisi Langsung)',
        referenceSource: 'IPCC 2006',
        effectiveYear: 2026,
      })
    );
  });

  it('S-07 & S-08: Tolak mismatch docId (d.id != docId) dan blokir pengosongan readBy notifikasi sistem', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'notifications', 'notif-sys-1'), {
        id: 'notif-sys-1',
        timestamp: '2026-04-01T00:00:00Z',
        type: 'Info',
        category: 'Wastewater',
        title: 'Alert',
        message: 'Pesan',
        read: false,
        createdBy: 'system',
        readBy: ['viewer@dkb.co.id'],
        clearedBy: [],
      });
    });

    const opDb = testEnv.authenticatedContext('uid-operator', { email: 'operator@dkb.co.id', email_verified: true }).firestore();
    // d.id != docId ditolak
    await assertFails(
      setDoc(doc(opDb, 'wastewater', 'WW-999'), {
        id: 'WW-OTHER',
        date: '2026-04-01',
        location: 'KPL-01',
        ph: 7,
        tss: 10,
        fe: 0.2,
        mn: 0.1,
        debit: 10,
        status: 'Safe',
        officer: 'Operator',
      })
    );

    // Operator tidak boleh menghapus entry user lain dari readBy, hanya boleh menambah email miliknya
    await assertFails(
      updateDoc(doc(opDb, 'notifications', 'notif-sys-1'), {
        readBy: ['operator@dkb.co.id'],
      })
    );
    await assertSucceeds(
      updateDoc(doc(opDb, 'notifications', 'notif-sys-1'), {
        readBy: ['viewer@dkb.co.id', 'operator@dkb.co.id'],
      })
    );
  });

  it('D-01: Operator dilarang mengubah evaluationHistory; Superintendent dapat melakukan Evaluasi Ulang Batch dengan correctionReason >= 20 karakter', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'wastewater', 'WW-REVAL-1'), {
        id: 'WW-REVAL-1',
        date: '2026-04-01',
        location: 'KPL-01',
        ph: 7.0,
        tss: 45,
        fe: 0.2,
        mn: 0.1,
        debit: 1.5,
        status: 'Safe',
        evaluationStatus: 'MEMENUHI',
        officer: 'Operator',
      });
    });

    const opDb = testEnv.authenticatedContext('uid-operator', { email: 'operator@dkb.co.id', email_verified: true }).firestore();
    const suptDb = testEnv.authenticatedContext('uid-supt', { email: 'supt@dkb.co.id', email_verified: true }).firestore();

    // Operator dilarang menyuntikkan evaluationHistory
    await assertFails(
      updateDoc(doc(opDb, 'wastewater', 'WW-REVAL-1'), {
        evaluationHistory: [{
          evaluatedAt: '2026-04-02T00:00:00Z',
          evaluatedBy: 'operator@dkb.co.id',
          previousStatus: 'MEMENUHI',
          newStatus: 'TIDAK MEMENUHI',
          reason: 'Alasan uji yang cukup panjang untuk bypass',
        }],
      })
    );

    // Superintendent ditolak jika correctionReason < 20 karakter
    await assertFails(
      updateDoc(doc(suptDb, 'wastewater', 'WW-REVAL-1'), {
        status: 'Exceeded',
        evaluationStatus: 'TIDAK MEMENUHI',
        correctionReason: 'Terlalu singkat',
        evaluationHistory: [{
          evaluatedAt: '2026-04-02T00:00:00Z',
          evaluatedBy: 'supt@dkb.co.id',
          previousStatus: 'MEMENUHI',
          newStatus: 'TIDAK MEMENUHI',
          reason: 'Terlalu singkat',
        }],
      })
    );

    // Superintendent ditolak jika mencoba mengubah angka lab (ph) di cabang evaluasi ulang
    await assertFails(
      updateDoc(doc(suptDb, 'wastewater', 'WW-REVAL-1'), {
        ph: 8.5,
        status: 'Exceeded',
        evaluationStatus: 'TIDAK MEMENUHI',
        correctionReason: 'Pembaruan baku mutu TSS sesuai SK Pertek terbaru 2026',
        evaluationHistory: [{
          evaluatedAt: '2026-04-02T00:00:00Z',
          evaluatedBy: 'supt@dkb.co.id',
          previousStatus: 'MEMENUHI',
          newStatus: 'TIDAK MEMENUHI',
          reason: 'Pembaruan baku mutu TSS sesuai SK Pertek terbaru 2026',
        }],
      })
    );

    // Superintendent berhasil melakukan writeBatch evaluasi ulang + audit_log dengan correctionReason >= 20
    const batch = writeBatch(suptDb);
    batch.update(doc(suptDb, 'wastewater', 'WW-REVAL-1'), {
      status: 'Exceeded',
      evaluationStatus: 'TIDAK MEMENUHI',
      evaluationReason: 'TSS melebihi baku mutu baru',
      standardId: 'STD-WW-TSS',
      standardBasis: 'SK Pertek Air Limbah 2026',
      correctionReason: 'Pembaruan baku mutu TSS sesuai SK Pertek terbaru 2026',
      evaluationHistory: [{
        evaluatedAt: '2026-04-02T00:00:00Z',
        evaluatedBy: 'supt@dkb.co.id',
        previousStatus: 'MEMENUHI',
        newStatus: 'TIDAK MEMENUHI',
        reason: 'Pembaruan baku mutu TSS sesuai SK Pertek terbaru 2026',
        standardBasis: 'SK Pertek Air Limbah 2026',
      }],
      updatedAt: serverTimestamp(),
      updatedBy: 'supt@dkb.co.id',
    });
    batch.set(doc(suptDb, 'audit_logs', 'LOG-REVAL-1'), {
      id: 'LOG-REVAL-1',
      uid: 'uid-supt',
      user: 'supt@dkb.co.id',
      actorName: 'Superintendent',
      actorRole: 'Environment Superintendent',
      module: 'water_reevaluation',
      collection: 'wastewater',
      recordId: 'WW-REVAL-1',
      action: 'update',
      details: 'Evaluasi ulang batch 1 sampel wastewater',
      source: 'client',
      timestamp: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it('K-01: Strict Admin dapat meregenerasi evidence_verify yang merujuk ke evidence_reports sah; non-admin ditolak', async () => {
    const reportId = 'WQD-KPL01-20260405';
    const token = 'tok-regen-001';
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'evidence_reports', reportId), {
        id: reportId,
        type: 'daily',
        documentNo: 'FR-EMS-WQ-2026-00009',
        revision: 0,
        period: '2026-04',
        locationCode: 'KPL-01',
        status: 'Disiapkan',
        snapshot: { overall: 'MEMENUHI' },
        snapshotHash: 'hash-regen-001',
        verifyToken: token,
        signatures: {
          prepared: {
            uid: 'uid-operator',
            email: 'operator@dkb.co.id',
            name: 'Operator',
            position: 'Operator',
            signedAt: '2026-04-05',
            signatureDataUrl: 'data:image/png;base64,AA==',
          },
        },
        createdBy: 'operator@dkb.co.id',
      });
    });

    const mgrDb = testEnv.authenticatedContext('uid-manager', { email: 'manager@dkb.co.id', email_verified: true }).firestore();
    const adminDb = testEnv.authenticatedContext('uid-admin', { email: 'sysadmin@dkb.co.id', email_verified: true }).firestore();

    // Manager tidak bisa write langsung evidence_verify secara standalone
    await assertFails(
      setDoc(doc(mgrDb, 'evidence_verify', token), {
        reportId,
        documentNo: 'FR-EMS-WQ-2026-00009',
        type: 'daily',
        period: '2026-04',
        locationCode: 'KPL-01',
        issuedAt: '2026-04-05',
        status: 'Disiapkan',
        overall: 'MEMENUHI',
        hashPrefix: 'hash-regen-00',
      })
    );

    // Strict Admin berhasil meregenerasi token yang merujuk ke evidence_reports sah
    await assertSucceeds(
      setDoc(doc(adminDb, 'evidence_verify', token), {
        reportId,
        documentNo: 'FR-EMS-WQ-2026-00009',
        type: 'daily',
        period: '2026-04',
        locationCode: 'KPL-01',
        issuedAt: '2026-04-05',
        status: 'Disiapkan',
        overall: 'MEMENUHI',
        hashPrefix: 'hash-regen-00',
      })
    );

    // Strict Admin ditolak jika memalsukan token yang tidak cocok dengan evidence_reports.verifyToken
    await assertFails(
      setDoc(doc(adminDb, 'evidence_verify', 'tok-palsu-999'), {
        reportId,
        documentNo: 'FR-EMS-WQ-2026-00009',
        type: 'daily',
        period: '2026-04',
        locationCode: 'KPL-01',
        issuedAt: '2026-04-05',
        status: 'Disiapkan',
        overall: 'MEMENUHI',
        hashPrefix: 'hash-regen-00',
      })
    );
  });

  it('Tahap 3 [K-03 roleClaims]: Custom claim aktif bila flag roleClaims == true, diabaikan saat false, dan claimsUpdatedAt dikunci dari self-update', async () => {
    const viewerSpoofedClaimDb = testEnv
      .authenticatedContext('uid-viewer', {
        email: 'viewer@dkb.co.id',
        email_verified: true,
        role: 'Admin',
      })
      .firestore();

    // Flag roleClaims belum aktif -> claim token.role diabaikan, /roles (Viewer) tetap otoritatif
    await assertFails(
      setDoc(doc(viewerSpoofedClaimDb, 'standards', 'STD-SPOOF'), {
        id: 'STD-SPOOF',
        media: 'air_limbah',
        parameter: 'pH',
        name: 'Tes',
        minVal: 6,
        maxVal: 9,
        unit: '-',
      })
    );
    // User tidak boleh memanipulasi claimsUpdatedAt miliknya sendiri
    await assertFails(
      updateDoc(doc(viewerSpoofedClaimDb, 'users', 'uid-viewer'), {
        claimsUpdatedAt: serverTimestamp(),
      })
    );

    // Aktifkan flag roleClaims -> claim token.role dipakai rules
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'app_meta', 'feature_flags'), {
        roleClaims: true,
        serverEvaluation: false,
        serverEvidence: false,
      });
    });

    const suptViaClaimDb = testEnv
      .authenticatedContext('uid-viewer', {
        email: 'viewer@dkb.co.id',
        email_verified: true,
        role: 'Environment Superintendent',
      })
      .firestore();

    await assertSucceeds(
      setDoc(doc(suptViaClaimDb, 'ghg_factors', 'GF-CLAIM-1'), {
        id: 'GF-CLAIM-1',
        activityCategory: 'Solar Alat Berat & Hauling',
        factorName: 'Solar B35',
        unit: 'Liter',
        factorKgCo2ePerUnit: 2.68,
        gasScope: 'Scope 1 (Emisi Langsung)',
        referenceSource: 'IPCC 2006',
        effectiveYear: 2026,
      })
    );
  });

  it('Tahap 3 [K-04 serverEvaluation]: Klien boleh menulis angka lab tanpa status dan dilarang menulis status/evaluationStatus/serverEvaluatedAt', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'app_meta', 'feature_flags'), {
        roleClaims: false,
        serverEvaluation: true,
        serverEvidence: false,
      });
    });

    const opDb = testEnv.authenticatedContext('uid-operator', { email: 'operator@dkb.co.id', email_verified: true }).firestore();

    // Sah: kirim payload sampel air limbah tanpa field status/evaluasi server
    await assertSucceeds(
      setDoc(doc(opDb, 'wastewater', 'WW-SRV-001'), {
        id: 'WW-SRV-001',
        date: '2026-05-01',
        location: 'KPL-01',
        locationCode: 'KPL-01',
        officer: 'Operator',
        ph: 7.1,
        tss: 25,
        debit: 10,
        fe: 0.2,
        mn: 0.1,
        createdBy: 'operator@dkb.co.id',
      })
    );

    // Ditolak: klien mencoba menyuntikkan status/evaluationStatus/serverEvaluatedAt saat serverEvaluation aktif
    await assertFails(
      setDoc(doc(opDb, 'wastewater', 'WW-SRV-002'), {
        id: 'WW-SRV-002',
        date: '2026-05-01',
        location: 'KPL-01',
        officer: 'Operator',
        ph: 7.1,
        tss: 25,
        debit: 10,
        fe: 0.2,
        mn: 0.1,
        status: 'Safe',
        evaluationStatus: 'MEMENUHI',
      })
    );

    await assertFails(
      updateDoc(doc(opDb, 'wastewater', 'WW-SRV-001'), {
        serverEvaluatedAt: serverTimestamp(),
      })
    );
  });

  it('Tahap 3 [K-02 serverEvidence & Audit Source]: Penulisan klien ke evidence/counters/verify dikunci saat flag aktif, dan audit_logs memblokir source=server', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'app_meta', 'feature_flags'), {
        roleClaims: false,
        serverEvaluation: false,
        serverEvidence: true,
      });
    });

    const opDb = testEnv.authenticatedContext('uid-operator', { email: 'operator@dkb.co.id', email_verified: true }).firestore();
    const adminDb = testEnv.authenticatedContext('uid-admin', { email: 'sysadmin@dkb.co.id', email_verified: true }).firestore();

    // Klien ditolak menulis langsung evidence_reports / counters / evidence_verify
    await assertFails(
      setDoc(doc(opDb, 'evidence_reports', 'WQD-KPL01-20260501'), {
        id: 'WQD-KPL01-20260501',
        type: 'daily',
        documentNo: 'FR-EMS-WQ-2026-00010',
        revision: 0,
        period: '2026-05',
        locationCode: 'KPL-01',
        status: 'Disiapkan',
        snapshot: { overall: 'MEMENUHI' },
        snapshotHash: 'hash-10',
        verifyToken: 'tok-10',
        signatures: {
          prepared: {
            uid: 'uid-operator',
            email: 'operator@dkb.co.id',
            name: 'Operator',
            position: 'Operator',
            signedAt: '2026-05-01',
            signatureDataUrl: 'data:image/png;base64,AA==',
          },
        },
        createdBy: 'operator@dkb.co.id',
      })
    );

    await assertFails(
      setDoc(doc(adminDb, 'counters', 'evidence-daily-2026'), {
        value: 99,
        updatedAt: serverTimestamp(),
        lastReportId: 'WQD-KPL01-20260501',
      })
    );

    // Klien dilarang memalsukan audit_logs dengan source: 'server'
    await assertFails(
      setDoc(doc(opDb, 'audit_logs', 'LOG-SPOOF-SRV'), {
        id: 'LOG-SPOOF-SRV',
        uid: 'uid-operator',
        user: 'operator@dkb.co.id',
        collection: 'wastewater',
        recordId: 'WW-1',
        action: 'insert',
        details: 'Palsu',
        source: 'server',
        timestamp: serverTimestamp(),
      })
    );

    // Klien boleh menulis audit_logs dengan source: 'client'
    await assertSucceeds(
      setDoc(doc(opDb, 'audit_logs', 'LOG-VALID-CLI'), {
        id: 'LOG-VALID-CLI',
        uid: 'uid-operator',
        user: 'operator@dkb.co.id',
        collection: 'wastewater',
        recordId: 'WW-1',
        action: 'insert',
        details: 'Input sampel harian',
        source: 'client',
        timestamp: serverTimestamp(),
      })
    );
  });
});
