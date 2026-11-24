import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { BACKUP_COLLECTION_KEYS, RESTORE_EXCLUDED_COLLECTIONS } from '../src/constants/collections';
import {
  BackupStoreAdapter,
  BACKUP_SCHEMA_VERSION,
  collectInventorySnapshot,
  encryptBackupPayload,
  decryptAndVerifyBackup,
  serializeFirestoreValue,
  deserializeFirestoreValue,
  backupService,
} from '../src/services/backupService';

type StoreMap = Record<string, Array<Record<string, any> & { id: string }>>;

const validWastewater = (id: string, ph = 7.2) => ({
  id,
  date: '2026-04-01',
  location: 'KPL-01 Utama',
  officer: 'Budi Santoso',
  ph,
  tss: 15,
  debit: 1.2,
  fe: 0.3,
  mn: 0.1,
  status: 'Safe',
});

const validSurfaceWater = (id: string, ph = 6.9) => ({
  id,
  date: '2026-04-01',
  location: 'Sungai Kedang Pahu',
  officer: 'Budi Santoso',
  ph,
  tss: 12,
  doVal: 6.2,
  bod: 2.0,
  cod: 10,
  fe: 0.2,
  mn: 0.1,
  status: 'Safe',
});

const validWasteIn = (id: string, weightKg = 150) => ({
  id,
  dateIn: '2026-04-01',
  wasteType: 'Oli Bekas',
  source: 'Workshop Utama',
  weightKg,
  characteristic: 'Flammable',
  code: 'B105d',
  tpsLocation: 'TPS B3 Pit A',
  officer: 'Budi Santoso',
});

const validSolidWaste = (id: string) => ({
  id,
  date: '2026-04-01',
  source: 'Kantor & Mess',
  organicKg: 10,
  inorganicKg: 10,
  residueKg: 5,
  compostedKg: 5,
  recycledKg: 5,
  officer: 'Budi Santoso',
});

function createMockStore(
  initial: StoreMap,
  options?: { failWriteOn?: string; failReadOn?: string }
) {
  const store: StoreMap = {};
  for (const [k, docs] of Object.entries(initial)) {
    store[k] = docs.map((d) => ({ ...d }));
  }

  const adapter: BackupStoreAdapter = {
    readCollection: async (colName: string) => {
      if (options?.failReadOn === colName) {
        throw new Error(`Simulated permission-denied reading collection ${colName}`);
      }
      return (store[colName] || []).map((d) => ({ ...d }));
    },
    applyCollectionBatch: async (colName, sets, deletes) => {
      if (options?.failWriteOn === colName) {
        throw new Error(`Simulated failure writing collection ${colName}`);
      }
      const map = new Map<string, Record<string, any> & { id: string }>();
      for (const existing of store[colName] || []) {
        map.set(existing.id, { ...existing });
      }
      for (const delId of deletes) {
        map.delete(delId);
      }
      for (const s of sets) {
        map.set(s.id, { ...s.data, id: s.id });
      }
      store[colName] = Array.from(map.values());
    },
  };

  return { store, adapter };
}

describe('Backup & Restore — Enkripsi AES-256-GCM, K-01 Resilience & T-06 Safe Restore', () => {
  it('1a. Default collectInventorySnapshot mengecualikan wastewater_photos & evidence_verify tidak masuk BACKUP_COLLECTION_KEYS', async () => {
    assert.ok(!BACKUP_COLLECTION_KEYS.includes('evidence_verify'), 'evidence_verify harus keluar dari BACKUP_INVENTORY (K-01)');

    const seed: StoreMap = {};
    for (const key of BACKUP_COLLECTION_KEYS) {
      seed[key] = [{ id: `${key}-DOC-1`, sampleField: 'ok' }];
    }
    const { adapter } = createMockStore(seed);
    const snapshot = await collectInventorySnapshot(adapter, 'admin@divaborneo.co.id');

    assert.equal(snapshot.schemaVersion, BACKUP_SCHEMA_VERSION);
    assert.equal(snapshot.includePhotos, false);
    assert.equal(snapshot.collections.wastewater_photos?.length, 0);
    assert.equal(snapshot.collectionCount, BACKUP_COLLECTION_KEYS.length);
    assert.equal(snapshot.totalDocs, BACKUP_COLLECTION_KEYS.length - 1);
  });

  it('1b. collectInventorySnapshot dengan includePhotos: true mencakup seluruh BACKUP_COLLECTION_KEYS termasuk wastewater_photos', async () => {
    const seed: StoreMap = {};
    for (const key of BACKUP_COLLECTION_KEYS) {
      seed[key] = [{ id: `${key}-DOC-1`, sampleField: 'ok' }];
    }
    const { adapter } = createMockStore(seed);
    const snapshot = await collectInventorySnapshot(adapter, {
      createdBy: 'admin@divaborneo.co.id',
      includePhotos: true,
    });

    assert.equal(snapshot.includePhotos, true);
    assert.equal(snapshot.collectionCount, BACKUP_COLLECTION_KEYS.length);
    assert.equal(snapshot.totalDocs, BACKUP_COLLECTION_KEYS.length);
    for (const key of BACKUP_COLLECTION_KEYS) {
      assert.equal(snapshot.collections[key]?.length, 1, `Koleksi ${key} harus tercakup`);
    }
  });

  it('1c [K-01]. Adapter melempar error pada satu koleksi: backup tetap terbentuk (BACKUP PARSIAL) & failedCollections terisi', async () => {
    const { adapter } = createMockStore(
      {
        wastewater: [validWastewater('WW-1')],
        surfacewater: [validSurfaceWater('SW-1')],
        evidence_reports: [{ id: 'EVR-1', status: 'Disiapkan' }],
      },
      { failReadOn: 'evidence_reports' }
    );

    const snapshot = await collectInventorySnapshot(adapter, 'admin@divaborneo.co.id');
    assert.equal(snapshot.totalDocs, 2);
    assert.equal(snapshot.collections.wastewater.length, 1);
    assert.equal(snapshot.collections.surfacewater.length, 1);
    assert.equal(snapshot.collections.evidence_reports.length, 0);
    assert.equal(snapshot.failedCollections?.length, 1);
    assert.equal(snapshot.failedCollections?.[0].collection, 'evidence_reports');
    assert.match(snapshot.failedCollections?.[0].error || '', /Simulated permission-denied/);
  });

  it('1d [K-01]. Round-trip serialisasi & deserialisasi Timestamp Firestore (objek bersarang & array)', () => {
    const tsTop = new Timestamp(1770000123, 456000000);
    const tsNested = { seconds: 1770000999, nanoseconds: 120000, toDate: () => new Date(1770000999 * 1000) };
    const input = {
      id: 'DOC-TS-1',
      createdAt: tsTop,
      meta: {
        updatedAt: tsNested,
        tags: ['a', tsNested],
      },
      plainText: 'tetap-string',
    };

    const serialized = serializeFirestoreValue(input);
    assert.deepEqual(serialized.createdAt, { __type: 'timestamp', seconds: 1770000123, nanoseconds: 456000000 });
    assert.deepEqual(serialized.meta.updatedAt, { __type: 'timestamp', seconds: 1770000999, nanoseconds: 120000 });
    assert.deepEqual(serialized.meta.tags[1], { __type: 'timestamp', seconds: 1770000999, nanoseconds: 120000 });

    const roundTripped = deserializeFirestoreValue(JSON.parse(JSON.stringify(serialized)));
    assert.ok(roundTripped.createdAt instanceof Timestamp);
    assert.equal(roundTripped.createdAt.seconds, 1770000123);
    assert.equal(roundTripped.createdAt.nanoseconds, 456000000);
    assert.ok(roundTripped.meta.updatedAt instanceof Timestamp);
    assert.equal(roundTripped.meta.updatedAt.seconds, 1770000999);
    assert.ok(roundTripped.meta.tags[1] instanceof Timestamp);
    assert.equal(roundTripped.plainText, 'tetap-string');
  });

  it('2. File tidak valid / checksum dimodifikasi ditolak dengan error eksplisit', async () => {
    await assert.rejects(
      () => decryptAndVerifyBackup({ invalid: true }, 'Passphrase123!'),
      /Format berkas cadangan tidak dikenali|tidak valid/
    );
    await assert.rejects(
      () => decryptAndVerifyBackup(null as any, 'Passphrase123!'),
      /tidak valid/
    );
  });

  it('3. Kata sandi enkripsi pendek (<8 char) & kata sandi dekripsi salah ditolak', async () => {
    const { adapter } = createMockStore({
      wastewater: [validWastewater('WW-1', 7)],
    });
    const snapshot = await collectInventorySnapshot(adapter, 'admin@divaborneo.co.id');

    await assert.rejects(() => encryptBackupPayload(snapshot, '123'), /minimal 8 karakter/);

    const envelope = await encryptBackupPayload(snapshot, 'SecretPassphrase!2026');
    await assert.rejects(
      () => decryptAndVerifyBackup(envelope, 'WrongPassphrase!999'),
      /Kata sandi salah|dekripsi AES-256-GCM gagal/
    );
  });

  it('4. Backup terenkripsi AES-256-GCM berhasil didekripsi & diverifikasi SHA-256', async () => {
    const { adapter } = createMockStore({
      wastewater: [validWastewater('WW-1', 7.2)],
      waste_b3: [validWasteIn('WI-1', 150)],
    });
    const snapshot = await collectInventorySnapshot(adapter, 'admin@divaborneo.co.id');
    const envelope = await encryptBackupPayload(snapshot, 'Divaborneo#2026!');

    assert.equal(envelope.format, 'DEM_ENCRYPTED_BACKUP_V1');
    assert.equal(envelope.cipher, 'AES-256-GCM');
    assert.equal((envelope as any).passphrase, undefined);

    const preview = await decryptAndVerifyBackup(envelope, 'Divaborneo#2026!');
    assert.equal(preview.encrypted, true);
    assert.equal(preview.checksumValid, true);
    assert.equal(preview.totalDocs, 2);
    assert.equal(preview.payload.collections.wastewater[0].id, 'WW-1');
  });

  it('5. Pemulihan data lengkap berhasil untuk seluruh dokumen cadangan yang lolos validasi Zod', async () => {
    const sourceStore = createMockStore({
      wastewater: [validWastewater('WW-1', 7.1), validWastewater('WW-2', 7.4)],
      surfacewater: [validSurfaceWater('SW-1', 6.9)],
    });
    const snapshot = await collectInventorySnapshot(sourceStore.adapter, 'admin@divaborneo.co.id');

    const targetStore = createMockStore({});
    const report = await backupService.restoreBackupToFirestore(snapshot, {
      mode: 'merge',
      adapter: targetStore.adapter,
      skipAudit: true,
    });

    assert.equal(report.failedCount, 0);
    assert.equal(report.validationFailedCount, 0);
    assert.equal(report.successCount, 3);
    assert.equal(report.unprocessedCollections.length, 0);
    assert.equal(targetStore.store.wastewater.length, 2);
    assert.equal(targetStore.store.surfacewater.length, 1);
  });

  it('6. Pemulihan gagal di tengah proses dilaporkan jujur (failedCount > 0, unprocessedCollections, isAtomic=false)', async () => {
    const sourceStore = createMockStore({
      wastewater: [validWastewater('WW-1', 7.1)],
      waste_b3: [validWasteIn('WI-1', 100), validWasteIn('WI-2', 50)],
      solid_waste: [validSolidWaste('SWD-1')],
    });
    const snapshot = await collectInventorySnapshot(sourceStore.adapter, 'admin@divaborneo.co.id');

    const failingTarget = createMockStore({}, { failWriteOn: 'waste_b3' });
    const report = await backupService.restoreBackupToFirestore(snapshot, {
      mode: 'merge',
      adapter: failingTarget.adapter,
      skipAudit: true,
    });

    assert.equal(report.isAtomic, false);
    assert.equal(report.failedCount, 2);
    assert.deepEqual(report.unprocessedCollections, ['waste_b3']);
    assert.equal(report.errors.length, 1);
    assert.ok(report.errors[0].includes('waste_b3'));
  });

  it('7, 8 & 9. Mode merge & replace serta proteksi RESTORE_EXCLUDED_COLLECTIONS (termasuk evidence_reports & evidence_verify)', async () => {
    const backupSource = createMockStore({
      wastewater: [validWastewater('WW-BAK-1', 7.0)],
      evidence_reports: [{ id: 'EVR-BAK', status: 'Disiapkan' }],
    });
    const snapshot = await collectInventorySnapshot(backupSource.adapter, 'admin@divaborneo.co.id');

    // Mode MERGE
    const mergeTarget = createMockStore({
      wastewater: [validWastewater('WW-EXISTING', 7.5)],
      users: [{ id: 'U-1', role: 'Admin' }],
    });
    const mergeReport = await backupService.restoreBackupToFirestore(snapshot, {
      mode: 'merge',
      adapter: mergeTarget.adapter,
      skipAudit: true,
    });
    assert.equal(mergeReport.deletedCount, 0);
    assert.equal(mergeTarget.store.wastewater.length, 2);
    const wwSummaryMerge = mergeReport.perCollectionSummary.find((c) => c.collection === 'wastewater');
    assert.equal(wwSummaryMerge?.beforeCount, 1);
    assert.equal(wwSummaryMerge?.written, 1);
    assert.equal(wwSummaryMerge?.deleted, 0);

    // Mode REPLACE harus ditolak tanpa adminConfirmedReplace: true
    await assert.rejects(
      () =>
        backupService.restoreBackupToFirestore(snapshot, {
          mode: 'replace',
          adminConfirmedReplace: false,
          adapter: mergeTarget.adapter,
          skipAudit: true,
        }),
      /konfirmasi eksplisit/
    );

    // Mode REPLACE dengan adminConfirmedReplace: true
    const replaceTarget = createMockStore({
      wastewater: [validWastewater('WW-OLD-1', 6.8), validWastewater('WW-OLD-2', 6.9)],
      users: [{ id: 'U-ADMIN', role: 'Admin' }],
      audit_logs: [{ id: 'LOG-1', action: 'login' }],
      counters: [{ id: 'FR-2026', value: 12 }],
      evidence_reports: [{ id: 'EVR-LIVE', status: 'Disetujui' }],
      evidence_verify: [{ id: 'TOK-LIVE', status: 'Disetujui' }],
    });
    const replaceReport = await backupService.restoreBackupToFirestore(snapshot, {
      mode: 'replace',
      adminConfirmedReplace: true,
      adapter: replaceTarget.adapter,
      skipAudit: true,
    });

    assert.equal(replaceTarget.store.wastewater.length, 1);
    assert.equal(replaceTarget.store.wastewater[0].id, 'WW-BAK-1');
    const wwSummaryReplace = replaceReport.perCollectionSummary.find((c) => c.collection === 'wastewater');
    assert.equal(wwSummaryReplace?.beforeCount, 2);
    assert.equal(wwSummaryReplace?.written, 1);
    assert.equal(wwSummaryReplace?.deleted, 2);

    // Koleksi RESTORE_EXCLUDED_COLLECTIONS tidak boleh terhapus/tertimpa
    assert.ok(RESTORE_EXCLUDED_COLLECTIONS.includes('users'));
    assert.ok(RESTORE_EXCLUDED_COLLECTIONS.includes('audit_logs'));
    assert.ok(RESTORE_EXCLUDED_COLLECTIONS.includes('counters'));
    assert.ok(RESTORE_EXCLUDED_COLLECTIONS.includes('evidence_reports'));
    assert.ok(RESTORE_EXCLUDED_COLLECTIONS.includes('evidence_verify'));
    assert.equal(replaceTarget.store.users.length, 1);
    assert.equal(replaceTarget.store.audit_logs.length, 1);
    assert.equal(replaceTarget.store.counters.length, 1);
    assert.equal(replaceTarget.store.evidence_reports[0].id, 'EVR-LIVE');
    assert.equal(replaceTarget.store.evidence_verify[0].id, 'TOK-LIVE');
  });

  it('10 [T-06]. Simulasi (dryRunRestore) menghitung dampak, menolak dokumen gagal validasi Zod, & membatasi app_meta/permission_matrix ke isStrictAdmin', async () => {
    const sourceStore = createMockStore({
      wastewater: [
        validWastewater('WW-EXISTING', 7.1), // overwrite
        validWastewater('WW-NEW', 7.3), // new
        { id: 'WW-INVALID', date: '2026-04-01', location: 'KPL', officer: 'X', ph: 99, tss: 10, debit: 1, fe: 0.1, mn: 0.1, status: 'Safe' }, // invalid pH > 14
      ],
      app_meta: [
        { id: 'permission_matrix', rules: { Admin: ['all'] } },
      ],
    });
    const snapshot = await collectInventorySnapshot(sourceStore.adapter, 'admin@divaborneo.co.id');

    const targetStore = createMockStore({
      wastewater: [validWastewater('WW-EXISTING', 6.8), validWastewater('WW-TO-DELETE', 6.9)],
      app_meta: [{ id: 'permission_matrix', rules: { Viewer: ['read'] } }],
    });

    // 1. Dry-run sebagai Non-Strict-Admin (Manager)
    const dryNonAdmin = await backupService.dryRunRestore(snapshot, {
      mode: 'replace',
      adapter: targetStore.adapter,
      isStrictAdmin: false,
    });
    // Tidak boleh mengubah targetStore
    assert.equal(targetStore.store.wastewater.length, 2);
    const wwDry = dryNonAdmin.collections.find((c) => c.collection === 'wastewater');
    assert.equal(wwDry?.newDocs, 1);
    assert.equal(wwDry?.overwrittenDocs, 1);
    assert.equal(wwDry?.deletedDocs, 1);
    assert.equal(wwDry?.validationFailedDocs, 1);
    assert.equal(dryNonAdmin.totalValidationFailed, 1);
    assert.ok(dryNonAdmin.errors.some((e) => e.includes('WW-INVALID')));
    assert.ok(dryNonAdmin.errors.some((e) => e.includes('permission_matrix')));

    // 2. Restore sebagai non-strict-admin tetap membiarkan permission_matrix eksisting & skip WW-INVALID
    const restoreNonAdmin = await backupService.restoreBackupToFirestore(snapshot, {
      mode: 'replace',
      adminConfirmedReplace: true,
      adapter: targetStore.adapter,
      skipAudit: true,
      isStrictAdmin: false,
    });
    assert.equal(restoreNonAdmin.validationFailedCount, 1);
    assert.equal(targetStore.store.wastewater.length, 2);
    assert.ok(!targetStore.store.wastewater.some((d) => d.id === 'WW-INVALID'));
    assert.deepEqual(targetStore.store.app_meta[0].rules, { Viewer: ['read'] });

    // 3. Restore sebagai isStrictAdmin: true memulihkan app_meta/permission_matrix
    await backupService.restoreBackupToFirestore(snapshot, {
      mode: 'merge',
      adapter: targetStore.adapter,
      skipAudit: true,
      isStrictAdmin: true,
    });
    assert.deepEqual(targetStore.store.app_meta[0].rules, { Admin: ['all'] });
  });
});
