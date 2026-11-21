import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_COLLECTION_KEYS, RESTORE_EXCLUDED_COLLECTIONS } from '../src/constants/collections';
import {
  BackupStoreAdapter,
  collectInventorySnapshot,
  encryptBackupPayload,
  decryptAndVerifyBackup,
  backupService,
} from '../src/services/backupService';

type StoreMap = Record<string, Array<Record<string, any> & { id: string }>>;

function createMockStore(initial: StoreMap, options?: { failWriteOn?: string }) {
  const store: StoreMap = {};
  for (const [k, docs] of Object.entries(initial)) {
    store[k] = docs.map((d) => ({ ...d }));
  }

  const adapter: BackupStoreAdapter = {
    readCollection: async (colName: string) => {
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

describe('Backup & Restore — Enkripsi AES-256-GCM & Integritas Koleksi (Section 7.E)', () => {
  it('1. Seluruh koleksi inventaris (BACKUP_COLLECTION_KEYS) tercakup saat snapshot dikumpulkan', async () => {
    const seed: StoreMap = {};
    for (const key of BACKUP_COLLECTION_KEYS) {
      seed[key] = [{ id: `${key}-DOC-1`, sampleField: 'ok' }];
    }
    const { adapter } = createMockStore(seed);
    const snapshot = await collectInventorySnapshot(adapter, 'admin@divaborneo.co.id');

    assert.equal(snapshot.collectionCount, BACKUP_COLLECTION_KEYS.length);
    assert.equal(snapshot.totalDocs, BACKUP_COLLECTION_KEYS.length);
    for (const key of BACKUP_COLLECTION_KEYS) {
      assert.equal(snapshot.collections[key]?.length, 1, `Koleksi ${key} harus tercakup`);
    }
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
      wastewater: [{ id: 'WW-1', location: 'KPL-01', ph: 7 }],
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
      wastewater: [{ id: 'WW-1', location: 'KPL-01', ph: 7.2 }],
      waste_b3: [{ id: 'WI-1', wasteType: 'Oli Bekas', weightKg: 150 }],
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

  it('5. Pemulihan data lengkap berhasil untuk seluruh dokumen cadangan', async () => {
    const sourceStore = createMockStore({
      wastewater: [{ id: 'WW-1', ph: 7.1 }, { id: 'WW-2', ph: 7.4 }],
      surfacewater: [{ id: 'SW-1', ph: 6.9 }],
    });
    const snapshot = await collectInventorySnapshot(sourceStore.adapter, 'admin@divaborneo.co.id');

    const targetStore = createMockStore({});
    const report = await backupService.restoreBackupToFirestore(snapshot, {
      mode: 'merge',
      adapter: targetStore.adapter,
      skipAudit: true,
    });

    assert.equal(report.failedCount, 0);
    assert.equal(report.successCount, 3);
    assert.equal(report.unprocessedCollections.length, 0);
    assert.equal(targetStore.store.wastewater.length, 2);
    assert.equal(targetStore.store.surfacewater.length, 1);
  });

  it('6. Pemulihan gagal di tengah proses dilaporkan jujur (failedCount > 0, unprocessedCollections, isAtomic=false)', async () => {
    const sourceStore = createMockStore({
      wastewater: [{ id: 'WW-1', ph: 7.1 }],
      waste_b3: [{ id: 'WI-1', weightKg: 100 }, { id: 'WI-2', weightKg: 50 }],
      solid_waste: [{ id: 'SW-1', weightKg: 25 }],
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

  it('7, 8 & 9. Mode merge mempertahankan data ekstra; mode replace menghapus data di luar cadangan sambil melindungi koleksi sistem; hitungan sebelum/sesudah akurat', async () => {
    const backupSource = createMockStore({
      wastewater: [{ id: 'WW-BAK-1', ph: 7.0 }],
    });
    const snapshot = await collectInventorySnapshot(backupSource.adapter, 'admin@divaborneo.co.id');

    // Mode MERGE
    const mergeTarget = createMockStore({
      wastewater: [{ id: 'WW-EXISTING', ph: 7.5 }],
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
      wastewater: [{ id: 'WW-OLD-1', ph: 6.8 }, { id: 'WW-OLD-2', ph: 6.9 }],
      users: [{ id: 'U-ADMIN', role: 'Admin' }],
      audit_logs: [{ id: 'LOG-1', action: 'login' }],
      counters: [{ id: 'FR-2026', value: 12 }],
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
    assert.equal(replaceTarget.store.users.length, 1);
    assert.equal(replaceTarget.store.audit_logs.length, 1);
    assert.equal(replaceTarget.store.counters.length, 1);
  });
});
