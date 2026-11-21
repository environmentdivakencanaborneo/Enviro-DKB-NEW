/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseAuth';
import { BACKUP_COLLECTION_KEYS, BACKUP_INVENTORY, RESTORE_EXCLUDED_COLLECTIONS } from '../constants/collections';
import { auditService } from './auditService';
import { notificationService } from './dbService';
import { getScopedKey } from '../utils/googleSync';

export const BACKUP_SCHEMA_VERSION = '3.1.0';
export const SUPPORTED_LEGACY_VERSIONS = new Set(['3.0.0', '3.1.0']);
const PBKDF2_ITERATIONS = 210_000;
const FIRESTORE_BATCH_LIMIT = 400;

export interface BackupStatus {
  status: 'synced' | 'syncing' | 'error' | 'idle';
  lastSynced: string | null;
  message?: string;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
}

export interface BackupPlaintextPayload {
  schemaVersion: string;
  backupDate: string;
  createdBy: string;
  hostSystem: string;
  collectionCount: number;
  totalDocs: number;
  collections: Record<string, Array<Record<string, any> & { id: string }>>;
}

export interface EncryptedBackupEnvelope {
  format: 'DEM_ENCRYPTED_BACKUP_V1';
  schemaVersion: string;
  encrypted: true;
  cipher: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  saltB64: string;
  ivB64: string;
  checksumSha256: string;
  ciphertextB64: string;
  meta: {
    backupDate: string;
    createdBy: string;
    collectionCount: number;
    totalDocs: number;
    excludedCollections: readonly string[];
  };
}

export interface BackupPreviewSummary {
  schemaVersion: string;
  backupDate: string;
  createdBy: string;
  encrypted: boolean;
  checksumValid: boolean;
  fileSizeBytes: number;
  collectionCount: number;
  totalDocs: number;
  collections: Array<{ key: string; label: string; count: number }>;
  payload: BackupPlaintextPayload;
}

export interface RestoreExecutionReport {
  mode: 'merge' | 'replace';
  isAtomic: false;
  atomicityNote: string;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  deletedCount: number;
  unprocessedCollections: string[];
  errors: string[];
  perCollectionSummary: Array<{
    collection: string;
    beforeCount: number;
    written: number;
    deleted: number;
    failed: number;
    skipped: number;
  }>;
  auditWriteSuccess?: boolean;
  auditWriteError?: string;
}

export interface BackupStoreAdapter {
  readCollection: (colName: string) => Promise<Array<Record<string, any> & { id: string }>>;
  applyCollectionBatch: (
    colName: string,
    sets: Array<{ id: string; data: Record<string, any> }>,
    deletes: string[]
  ) => Promise<void>;
}

const defaultFirestoreAdapter: BackupStoreAdapter = {
  readCollection: async (colName: string) => {
    const snap = await getDocs(collection(db, colName));
    return snap.docs.map((d) => ({ ...(d.data() as Record<string, any>), id: d.id }));
  },
  applyCollectionBatch: async (colName, sets, deletes) => {
    const ops: Array<{ kind: 'set' | 'delete'; id: string; data?: Record<string, any> }> = [
      ...sets.map((s) => ({ kind: 'set' as const, id: s.id, data: s.data })),
      ...deletes.map((id) => ({ kind: 'delete' as const, id })),
    ];

    for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_LIMIT) {
      const slice = ops.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const op of slice) {
        const ref = doc(db, colName, op.id);
        if (op.kind === 'set' && op.data) {
          batch.set(ref, op.data);
        } else {
          batch.delete(ref);
        }
      }
      await batch.commit();
    }
  },
};

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(u8.byteLength);
  new Uint8Array(buf).set(u8);
  return buf;
}

export async function computeSha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function deriveAesGcmKey(
  passphrase: string,
  salt: Uint8Array,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(enc.encode(passphrase)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  );
}

/**
 * Mengenkripsi payload cadangan menggunakan Web Crypto API AES-256-GCM + PBKDF2-SHA256.
 * Kata sandi maupun kunci enkripsi TIDAK pernah disimpan di dalam berkas cadangan.
 */
export async function encryptBackupPayload(
  payload: BackupPlaintextPayload,
  passphrase: string
): Promise<EncryptedBackupEnvelope> {
  if (!passphrase || passphrase.trim().length < 8) {
    throw new Error('Kata sandi enkripsi backup minimal 8 karakter.');
  }
  if (!crypto?.subtle) {
    throw new Error('Web Crypto API (subtle) tidak tersedia pada peramban/lingkungan ini.');
  }

  const plaintextJson = JSON.stringify(payload);
  const checksumSha256 = await computeSha256Hex(plaintextJson);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesGcmKey(passphrase, salt, ['encrypt']);

  const plaintextBytes = new TextEncoder().encode(plaintextJson);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    aesKey,
    toArrayBuffer(plaintextBytes)
  );

  const cipherBytes = new Uint8Array(cipherBuffer);
  if (cipherBytes.byteLength === 0) {
    throw new Error('Enkripsi AES-256-GCM menghasilkan data kosong.');
  }

  return {
    format: 'DEM_ENCRYPTED_BACKUP_V1',
    schemaVersion: payload.schemaVersion,
    encrypted: true,
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    saltB64: toBase64(salt),
    ivB64: toBase64(iv),
    checksumSha256,
    ciphertextB64: toBase64(cipherBytes),
    meta: {
      backupDate: payload.backupDate,
      createdBy: payload.createdBy,
      collectionCount: payload.collectionCount,
      totalDocs: payload.totalDocs,
      excludedCollections: RESTORE_EXCLUDED_COLLECTIONS,
    },
  };
}

/**
 * Mendekripsi dan memverifikasi integritas SHA-256 berkas cadangan terenkripsi AES-256-GCM.
 */
export async function decryptAndVerifyBackup(
  rawEnvelope: unknown,
  passphrase?: string
): Promise<BackupPreviewSummary> {
  if (!rawEnvelope || typeof rawEnvelope !== 'object') {
    throw new Error('Berkas cadangan tidak valid (bukan objek JSON).');
  }

  const rawText = JSON.stringify(rawEnvelope);
  const fileSizeBytes = new TextEncoder().encode(rawText).byteLength;
  const obj = rawEnvelope as Record<string, any>;

  let payload: BackupPlaintextPayload;
  let checksumValid = false;
  let encrypted = false;

  if (obj.format === 'DEM_ENCRYPTED_BACKUP_V1') {
    if (!passphrase || passphrase.length === 0) {
      throw new Error('Berkas terenkripsi AES-256-GCM. Masukkan kata sandi dekripsi.');
    }
    if (
      !obj.saltB64 ||
      !obj.ivB64 ||
      !obj.ciphertextB64 ||
      !obj.checksumSha256 ||
      obj.cipher !== 'AES-256-GCM'
    ) {
      throw new Error('Header berkas backup terenkripsi rusak atau tidak lengkap.');
    }

    const salt = fromBase64(obj.saltB64);
    const iv = fromBase64(obj.ivB64);
    const cipherBytes = fromBase64(obj.ciphertextB64);

    let plaintextJson = '';
    try {
      const aesKey = await deriveAesGcmKey(passphrase, salt, ['decrypt']);
      const plainBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(iv) },
        aesKey,
        toArrayBuffer(cipherBytes)
      );
      plaintextJson = new TextDecoder().decode(plainBuf);
    } catch {
      throw new Error('Kata sandi salah atau berkas cadangan telah dimodifikasi/rusak (dekripsi AES-256-GCM gagal).');
    }

    const actualChecksum = await computeSha256Hex(plaintextJson);
    if (actualChecksum !== obj.checksumSha256) {
      throw new Error('Pemeriksaan integritas SHA-256 gagal. Berkas cadangan mungkin korup.');
    }
    checksumValid = true;
    encrypted = true;
    payload = JSON.parse(plaintextJson) as BackupPlaintextPayload;
  } else if (obj.data && typeof obj.data === 'object') {
    // Dukungan pembacaan berkas cadangan lama v3.0.0 dengan normalisasi ke inventaris terpusat
    payload = normalizeLegacyBackupToPayload(obj);
    checksumValid = true;
    encrypted = false;
  } else {
    throw new Error('Format berkas cadangan tidak dikenali atau tidak kompatibel dengan DEM.');
  }

  if (!payload || !payload.collections || typeof payload.collections !== 'object') {
    throw new Error('Struktur koleksi di dalam berkas cadangan tidak ditemukan.');
  }

  if (!SUPPORTED_LEGACY_VERSIONS.has(payload.schemaVersion)) {
    throw new Error(`Versi skema cadangan (${payload.schemaVersion}) tidak kompatibel dengan versi aplikasi saat ini.`);
  }

  const colSummaries = BACKUP_INVENTORY.map((inv) => {
    const arr = payload.collections[inv.key];
    return {
      key: inv.key,
      label: inv.label,
      count: Array.isArray(arr) ? arr.length : 0,
    };
  });

  const totalDocs = colSummaries.reduce((sum, c) => sum + c.count, 0);

  return {
    schemaVersion: payload.schemaVersion,
    backupDate: payload.backupDate,
    createdBy: payload.createdBy || 'Tidak diketahui',
    encrypted,
    checksumValid,
    fileSizeBytes,
    collectionCount: BACKUP_INVENTORY.length,
    totalDocs,
    collections: colSummaries,
    payload,
  };
}

function normalizeLegacyBackupToPayload(legacy: Record<string, any>): BackupPlaintextPayload {
  const data = legacy.data || {};
  const collections: Record<string, Array<Record<string, any> & { id: string }>> = {};
  for (const key of BACKUP_COLLECTION_KEYS) {
    collections[key] = [];
  }

  const directCopy = (target: string, arr: unknown) => {
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && typeof item === 'object' && typeof (item as any).id === 'string') {
          collections[target].push(item as any);
        }
      }
    }
  };

  for (const key of BACKUP_COLLECTION_KEYS) {
    directCopy(key, data[key]);
  }
  // Pemetaan nama camelCase pada format lama v3.0.0
  directCopy('reclamation', data.reclamationPlans);
  directCopy('reclamation', data.reclamationGuarantees);
  directCopy('waste_b3', data.wasteIn);
  directCopy('waste_b3', data.wasteOut);
  directCopy('documents', data.documents);
  directCopy('documents', data.calendarEvents);
  directCopy('costs', data.environmentalCosts);
  directCopy('solid_waste', data.solidWaste);

  const totalDocs = Object.values(collections).reduce((s, a) => s + a.length, 0);
  return {
    schemaVersion: '3.0.0',
    backupDate: String(legacy.backupDate || new Date().toISOString()),
    createdBy: String(legacy.createdBy || 'Legacy Backup'),
    hostSystem: String(legacy.hostSystem || 'DEM'),
    collectionCount: BACKUP_COLLECTION_KEYS.length,
    totalDocs,
    collections,
  };
}

export async function collectInventorySnapshot(
  adapter: BackupStoreAdapter = defaultFirestoreAdapter,
  createdBy?: string
): Promise<BackupPlaintextPayload> {
  const collections: Record<string, Array<Record<string, any> & { id: string }>> = {};
  let totalDocs = 0;

  for (const colKey of BACKUP_COLLECTION_KEYS) {
    const docs = await adapter.readCollection(colKey);
    collections[colKey] = docs;
    totalDocs += docs.length;
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    backupDate: new Date().toISOString(),
    createdBy: createdBy || auth.currentUser?.email || 'unknown_admin',
    hostSystem: 'DEM (Diva Enviro Monitor) - PT DKB',
    collectionCount: BACKUP_COLLECTION_KEYS.length,
    totalDocs,
    collections,
  };
}

export const backupService = {
  getOrCreateBackupFolder: async (accessToken: string): Promise<string | null> => {
    const folderIdKey = getScopedKey('env_coal_pro_backup_folder_id');
    let folderId = localStorage.getItem(folderIdKey);
    if (folderId) return folderId;

    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='DEM system Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          folderId = searchData.files[0].id;
        } else {
          const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'DEM system Backups',
              mimeType: 'application/vnd.google-apps.folder',
            }),
          });
          if (createRes.ok) {
            const folder = await createRes.json();
            folderId = folder.id;
          }
        }
      }
      if (folderId) {
        localStorage.setItem(folderIdKey, folderId);
      }
      return folderId;
    } catch (e) {
      console.error('Gagal mendapatkan/membuat folder backup Google Drive:', e);
      return null;
    }
  },

  /**
   * Membuat cadangan terenkripsi AES-256-GCM untuk diunduh secara lokal sebelum restore atau arsip offline.
   */
  exportEncryptedToLocalFile: async (
    passphrase: string,
    customFileName?: string,
    adapter: BackupStoreAdapter = defaultFirestoreAdapter
  ): Promise<{ envelope: EncryptedBackupEnvelope; fileName: string; sizeBytes: number }> => {
    const payload = await collectInventorySnapshot(adapter);
    const envelope = await encryptBackupPayload(payload, passphrase);
    const serialized = JSON.stringify(envelope, null, 2);
    const safeName = (customFileName || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '');
    const fileName = safeName
      ? `${safeName}.dembackup.json`
      : `DEM-Encrypted-${payload.backupDate.replace(/[:.]/g, '-')}.dembackup.json`;

    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([serialized], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    await auditService.createLog({
      module: 'backup_restore',
      collection: 'backups',
      recordId: fileName,
      action: 'backup',
      details: `Membuat cadangan terenkripsi lokal AES-256-GCM (${payload.collectionCount} koleksi, ${payload.totalDocs} dokumen)`,
    });

    return {
      envelope,
      fileName,
      sizeBytes: new TextEncoder().encode(serialized).byteLength,
    };
  },

  /**
   * Ekspor terenkripsi AES-256-GCM ke Google Drive.
   */
  exportToGoogleDrive: async (
    accessToken: string,
    passphrase: string,
    customFileName?: string,
    onStatusChange?: (status: BackupStatus) => void
  ): Promise<boolean> => {
    if (!accessToken) {
      onStatusChange?.({ status: 'error', lastSynced: null, message: 'Akses Token Google tidak tersedia.' });
      return false;
    }

    onStatusChange?.({ status: 'syncing', lastSynced: null, message: 'Mengambil inventaris data Firestore...' });

    try {
      const payload = await collectInventorySnapshot(defaultFirestoreAdapter);
      onStatusChange?.({ status: 'syncing', lastSynced: null, message: 'Mengenkripsi data dengan AES-256-GCM...' });
      const envelope = await encryptBackupPayload(payload, passphrase);
      const fileContent = JSON.stringify(envelope, null, 2);

      onStatusChange?.({ status: 'syncing', lastSynced: null, message: 'Mengunggah berkas terenkripsi ke Google Drive...' });
      const folderId = await backupService.getOrCreateBackupFolder(accessToken);

      const sanitisedName = (customFileName || '').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '');
      const fileName = sanitisedName
        ? `${sanitisedName.endsWith('.json') ? sanitisedName : sanitisedName + '.dembackup.json'}`
        : `DEM-Encrypted-${payload.backupDate.replace(/:/g, '-')}.dembackup.json`;

      const boundary = 'env_coal_pro_backup_boundary';
      const metadataBody = {
        name: fileName,
        mimeType: 'application/json',
        parents: folderId ? [folderId] : [],
      };

      const multipartBody = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadataBody),
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        fileContent,
        `--${boundary}--`,
      ].join('\r\n');

      const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!driveRes.ok) {
        const text = await driveRes.text();
        throw new Error(`Ekspor Google Drive gagal: ${text}`);
      }

      const lastSyncedTime = new Date().toLocaleTimeString('id-ID');
      onStatusChange?.({
        status: 'synced',
        lastSynced: lastSyncedTime,
        message: `Cadangan terenkripsi berhasil (${payload.collectionCount} koleksi, ${payload.totalDocs} dokumen).`,
      });

      await auditService.createLog({
        module: 'backup_restore',
        collection: 'backups',
        recordId: fileName,
        action: 'backup',
        details: `Ekspor cadangan terenkripsi AES-256-GCM ke Google Drive: ${fileName} (${payload.collectionCount} koleksi, ${payload.totalDocs} dokumen)`,
      });

      await notificationService.add({
        type: 'Info',
        category: 'Permit',
        title: 'Cadangan Drive Terenkripsi Selesai',
        message: `File cadangan "${fileName}" (${payload.totalDocs} dokumen pada ${payload.collectionCount} koleksi) tersimpan dengan AES-256-GCM.`,
      });

      return true;
    } catch (error: any) {
      console.error('Gagal melakukan ekspor data terenkripsi ke Drive:', error);
      onStatusChange?.({
        status: 'error',
        lastSynced: null,
        message: error.message || 'Gagal mengunggah berkas terenkripsi ke Drive.',
      });
      return false;
    }
  },

  getBackupsFromGoogleDrive: async (accessToken: string): Promise<DriveBackupFile[]> => {
    if (!accessToken) return [];
    try {
      const folderId = await backupService.getOrCreateBackupFolder(accessToken);
      let q = "mimeType = 'application/json' and trashed = false";
      if (folderId) {
        q += ` and '${folderId}' in parents`;
      }
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&fields=files(id, name, createdTime)&pageSize=30`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) return [];
      const result = await res.json();
      return result.files || [];
    } catch {
      return [];
    }
  },

  importFromGoogleDrive: async (accessToken: string, fileId: string): Promise<any | null> => {
    if (!accessToken || !fileId) return null;
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      throw new Error(`File gagal diunduh: ${res.statusText}`);
    }
    return await res.json();
  },

  /**
   * Memulihkan dataset tervalidasi ke Firestore dengan laporan rinci per-koleksi.
   * Mendukung mode 'merge' dan 'replace' (dengan rekonsiliasi penghapusan dokumen yang tidak ada di cadangan).
   * CATATAN: Multi-batch write bukan transaksi atomik tunggal.
   */
  restoreBackupToFirestore: async (
    payload: BackupPlaintextPayload,
    options: {
      mode: 'merge' | 'replace';
      adminConfirmedReplace?: boolean;
      adapter?: BackupStoreAdapter;
      skipAudit?: boolean;
    }
  ): Promise<RestoreExecutionReport> => {
    if (!payload || !payload.collections) {
      throw new Error('Payload cadangan tidak valid.');
    }
    if (options.mode === 'replace' && options.adminConfirmedReplace !== true) {
      throw new Error('Mode penggantian penuh (Replace) memerlukan konfirmasi eksplisit Administrator.');
    }

    const adapter = options.adapter ?? defaultFirestoreAdapter;
    const excludedSet = new Set<string>(RESTORE_EXCLUDED_COLLECTIONS);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let deletedCount = 0;
    const unprocessedCollections: string[] = [];
    const errors: string[] = [];
    const perCollectionSummary: RestoreExecutionReport['perCollectionSummary'] = [];

    for (const colKey of BACKUP_COLLECTION_KEYS) {
      if (excludedSet.has(colKey)) continue;

      const rawDocs = payload.collections[colKey] || [];
      const sets: Array<{ id: string; data: Record<string, any> }> = [];
      let colSkipped = 0;

      for (const item of rawDocs) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) {
          colSkipped++;
          skippedCount++;
          continue;
        }
        sets.push({ id: item.id, data: item });
      }

      let beforeCount = 0;
      let deletes: string[] = [];

      try {
        const currentDocs = await adapter.readCollection(colKey);
        beforeCount = currentDocs.length;

        if (options.mode === 'replace') {
          const targetIdSet = new Set(sets.map((s) => s.id));
          deletes = currentDocs.filter((d) => !targetIdSet.has(d.id)).map((d) => d.id);
        }

        if (sets.length > 0 || deletes.length > 0) {
          await adapter.applyCollectionBatch(colKey, sets, deletes);
        }

        successCount += sets.length;
        deletedCount += deletes.length;
        perCollectionSummary.push({
          collection: colKey,
          beforeCount,
          written: sets.length,
          deleted: deletes.length,
          failed: 0,
          skipped: colSkipped,
        });
      } catch (err: any) {
        const msg = err?.message || `Gagal menulis batch koleksi ${colKey}`;
        failedCount += sets.length + deletes.length;
        unprocessedCollections.push(colKey);
        errors.push(`${colKey}: ${msg}`);
        perCollectionSummary.push({
          collection: colKey,
          beforeCount,
          written: 0,
          deleted: 0,
          failed: sets.length + deletes.length,
          skipped: colSkipped,
        });
      }
    }

    const report: RestoreExecutionReport = {
      mode: options.mode,
      isAtomic: false,
      atomicityNote:
        'Pemulihan dieksekusi bertahap per-koleksi/batch (maks. 400 operasi/batch) dan BUKAN transaksi atomik lintas-koleksi. Verifikasi rincian di bawah.',
      successCount,
      failedCount,
      skippedCount,
      deletedCount,
      unprocessedCollections,
      errors,
      perCollectionSummary,
    };

    if (!options.skipAudit) {
      const auditRes = await auditService.createLog({
        module: 'backup_restore',
        collection: 'backups',
        recordId: `restore-${options.mode}`,
        action: 'restore',
        details: `Restore mode=${options.mode}: sukses=${successCount}, hapus=${deletedCount}, gagal=${failedCount}, lewati=${skippedCount}, koleksiGagal=${unprocessedCollections.join(',') || 'none'}`,
      });
      report.auditWriteSuccess = auditRes.success;
      report.auditWriteError = auditRes.error;
    }

    return report;
  },
};
