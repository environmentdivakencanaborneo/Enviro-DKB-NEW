/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, getDocs, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseAuth';
import { BACKUP_COLLECTION_KEYS, BACKUP_INVENTORY, RESTORE_EXCLUDED_COLLECTIONS } from '../constants/collections';
import { auditService } from './auditService';
import { notificationService } from './dbService';
import { getScopedKey } from '../utils/googleSync';
import { validateBackupDocument } from '../utils/validation';
import type { EvidenceReport, EvidenceVerification, ComplianceConclusion } from '../types';

export const BACKUP_SCHEMA_VERSION = '3.2.0';
export const SUPPORTED_LEGACY_VERSIONS = new Set(['3.0.0', '3.1.0', '3.2.0']);
const PBKDF2_ITERATIONS = 210_000;
const FIRESTORE_BATCH_LIMIT = 400;

export interface FailedCollectionRead {
  collection: string;
  error: string;
}

export interface BackupStatus {
  status: 'synced' | 'syncing' | 'error' | 'idle';
  lastSynced: string | null;
  message?: string;
  isPartial?: boolean;
  failedCollections?: FailedCollectionRead[];
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
  includePhotos?: boolean;
  failedCollections?: FailedCollectionRead[];
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
    includePhotos?: boolean;
    failedCollectionsCount?: number;
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
  includePhotos: boolean;
  failedCollections: FailedCollectionRead[];
  collections: Array<{ key: string; label: string; count: number }>;
  payload: BackupPlaintextPayload;
}

export interface RestoreDryRunCollectionResult {
  collection: string;
  beforeCount: number;
  newDocs: number;
  overwrittenDocs: number;
  deletedDocs: number;
  skippedDocs: number;
  validationFailedDocs: number;
  validationErrors: string[];
}

export interface RestoreDryRunReport {
  mode: 'merge' | 'replace';
  totalBefore: number;
  totalNew: number;
  totalOverwritten: number;
  totalDeleted: number;
  totalSkipped: number;
  totalValidationFailed: number;
  collections: RestoreDryRunCollectionResult[];
  errors: string[];
}

export interface RestoreExecutionReport {
  mode: 'merge' | 'replace';
  isAtomic: false;
  atomicityNote: string;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  validationFailedCount?: number;
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

function isFirestoreTimestampLike(val: unknown): val is { seconds: number; nanoseconds: number; toDate?: () => Date } {
  if (!val || typeof val !== 'object') return false;
  if (val instanceof Timestamp) return true;
  const obj = val as Record<string, any>;
  return (
    typeof obj.seconds === 'number' &&
    typeof obj.nanoseconds === 'number' &&
    typeof obj.toDate === 'function'
  );
}

/**
 * Serialisasi rekursif Timestamp Firestore menjadi penanda eksplisit
 * `{ __type: 'timestamp', seconds, nanoseconds }` agar aman di JSON.
 */
export function serializeFirestoreValue(val: unknown): any {
  if (val === undefined || val === null) return val;
  if (isFirestoreTimestampLike(val)) {
    return {
      __type: 'timestamp',
      seconds: val.seconds,
      nanoseconds: val.nanoseconds,
    };
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (Array.isArray(val)) {
    return val.map((item) => (item === undefined ? null : serializeFirestoreValue(item)));
  }
  if (typeof val === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val as Record<string, any>)) {
      if (v !== undefined) {
        out[k] = serializeFirestoreValue(v);
      }
    }
    return out;
  }
  return val;
}

/**
 * Deserialisasi rekursif `{ __type: 'timestamp', seconds, nanoseconds }`
 * kembali menjadi instance Firestore `Timestamp`.
 */
export function deserializeFirestoreValue(val: unknown): any {
  if (val === undefined || val === null) return val;
  if (Array.isArray(val)) {
    return val.map((item) => deserializeFirestoreValue(item));
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, any>;
    if (
      obj.__type === 'timestamp' &&
      typeof obj.seconds === 'number' &&
      Number.isFinite(obj.seconds) &&
      typeof obj.nanoseconds === 'number' &&
      Number.isFinite(obj.nanoseconds)
    ) {
      return new Timestamp(obj.seconds, obj.nanoseconds);
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        out[k] = deserializeFirestoreValue(v);
      }
    }
    return out;
  }
  return val;
}

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
      includePhotos: Boolean(payload.includePhotos),
      failedCollectionsCount: payload.failedCollections?.length || 0,
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
    includePhotos: Boolean(payload.includePhotos),
    failedCollections: Array.isArray(payload.failedCollections) ? payload.failedCollections : [],
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
    includePhotos: (collections.wastewater_photos?.length || 0) > 0,
    failedCollections: [],
    collections,
  };
}

export interface CollectSnapshotOptions {
  createdBy?: string;
  includePhotos?: boolean;
}

export async function collectInventorySnapshot(
  adapter: BackupStoreAdapter = defaultFirestoreAdapter,
  optionsOrCreatedBy?: string | CollectSnapshotOptions
): Promise<BackupPlaintextPayload> {
  const opts: CollectSnapshotOptions =
    typeof optionsOrCreatedBy === 'string'
      ? { createdBy: optionsOrCreatedBy }
      : optionsOrCreatedBy || {};

  const includePhotos = Boolean(opts.includePhotos);
  const collections: Record<string, Array<Record<string, any> & { id: string }>> = {};
  const failedCollections: FailedCollectionRead[] = [];
  let totalDocs = 0;

  for (const colKey of BACKUP_COLLECTION_KEYS) {
    if (colKey === 'wastewater_photos' && !includePhotos) {
      collections[colKey] = [];
      continue;
    }

    try {
      const rawDocs = await adapter.readCollection(colKey);
      const serializedDocs = rawDocs.map((d) => serializeFirestoreValue(d) as Record<string, any> & { id: string });
      collections[colKey] = serializedDocs;
      totalDocs += serializedDocs.length;
    } catch (err: any) {
      const msg = err?.message || `Gagal membaca koleksi ${colKey}`;
      failedCollections.push({ collection: colKey, error: msg });
      collections[colKey] = [];
    }
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    backupDate: new Date().toISOString(),
    createdBy: opts.createdBy || auth.currentUser?.email || 'unknown_admin',
    hostSystem: 'DEM (Diva Enviro Monitor) - PT DKB',
    collectionCount: BACKUP_COLLECTION_KEYS.length,
    totalDocs,
    includePhotos,
    failedCollections,
    collections,
  };
}

function normalizeOverallForVerify(val: unknown): ComplianceConclusion | 'BELUM ADA DATA' {
  const s = String(val || '').trim().toUpperCase();
  if (
    s === 'MEMENUHI' ||
    s === 'TIDAK MEMENUHI' ||
    s === 'DATA TIDAK LENGKAP' ||
    s === 'BELUM DIEVALUASI' ||
    s === 'TIDAK BERLAKU' ||
    s === 'BELUM ADA DATA'
  ) {
    return s as ComplianceConclusion | 'BELUM ADA DATA';
  }
  if (s === 'EXCEEDED') return 'TIDAK MEMENUHI';
  if (s === 'WARNING') return 'MEMENUHI';
  return 'BELUM DIEVALUASI';
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
   * Membangkitkan ulang dokumen publik `evidence_verify/{verifyToken}` dari koleksi `evidence_reports`.
   * Khusus Admin strict (diizinkan oleh rules K-01).
   */
  regenerateVerifyDocs: async (): Promise<{ processed: number; updated: number; skipped: number }> => {
    const reportsSnap = await getDocs(collection(db, 'evidence_reports'));
    const ops: Array<{ token: string; data: EvidenceVerification }> = [];
    let skipped = 0;

    for (const d of reportsSnap.docs) {
      const report = d.data() as EvidenceReport;
      const reportId = report.id || d.id;
      const token = (report.verifyToken || '').trim();
      if (!token || !report.documentNo || !report.period || !report.locationCode) {
        skipped++;
        continue;
      }
      const overall = normalizeOverallForVerify((report.snapshot as any)?.overall);
      const verification: EvidenceVerification = {
        reportId,
        documentNo: report.documentNo,
        type: report.type === 'monthly' ? 'monthly' : 'daily',
        period: report.period,
        locationCode: report.locationCode,
        issuedAt: report.issuedAt || new Date().toISOString(),
        status: report.status || 'Disiapkan',
        overall,
        hashPrefix: (report.snapshotHash || '000000000000').slice(0, 12),
      };
      ops.push({ token, data: verification });
    }

    for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_LIMIT) {
      const slice = ops.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const op of slice) {
        batch.set(doc(db, 'evidence_verify', op.token), op.data);
      }
      await batch.commit();
    }

    await auditService.createLog({
      module: 'backup_restore',
      collection: 'evidence_verify',
      recordId: 'regenerate-verify-docs',
      action: 'restore',
      details: `Regenerasi dokumen verifikasi QR publik: ${ops.length} token diperbarui, ${skipped} dilewati dari ${reportsSnap.size} laporan evidence.`,
    });

    return {
      processed: reportsSnap.size,
      updated: ops.length,
      skipped,
    };
  },

  /**
   * Membuat cadangan terenkripsi AES-256-GCM untuk diunduh secara lokal sebelum restore atau arsip offline.
   */
  exportEncryptedToLocalFile: async (
    passphrase: string,
    customFileName?: string,
    adapterOrOptions?: BackupStoreAdapter | { adapter?: BackupStoreAdapter; includePhotos?: boolean },
    extraOptions?: { includePhotos?: boolean }
  ): Promise<{
    envelope: EncryptedBackupEnvelope;
    fileName: string;
    sizeBytes: number;
    failedCollections: FailedCollectionRead[];
    totalDocs: number;
    collectionCount: number;
    isPartial: boolean;
  }> => {
    const adapter =
      adapterOrOptions && typeof (adapterOrOptions as BackupStoreAdapter).readCollection === 'function'
        ? (adapterOrOptions as BackupStoreAdapter)
        : (adapterOrOptions as { adapter?: BackupStoreAdapter })?.adapter ?? defaultFirestoreAdapter;
    const includePhotos =
      extraOptions?.includePhotos ??
      (adapterOrOptions && typeof (adapterOrOptions as BackupStoreAdapter).readCollection !== 'function'
        ? Boolean((adapterOrOptions as { includePhotos?: boolean }).includePhotos)
        : false);

    const payload = await collectInventorySnapshot(adapter, { includePhotos });
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

    const failedList = payload.failedCollections || [];
    const isPartial = failedList.length > 0;

    await auditService.createLog({
      module: 'backup_restore',
      collection: 'backups',
      recordId: fileName,
      action: 'backup',
      details: `${isPartial ? 'BACKUP PARSIAL ' : ''}Membuat cadangan terenkripsi lokal AES-256-GCM (${payload.collectionCount} koleksi, ${payload.totalDocs} dokumen${isPartial ? `, gagal: ${failedList.map((f) => f.collection).join(', ')}` : ''})`,
    });

    return {
      envelope,
      fileName,
      sizeBytes: new TextEncoder().encode(serialized).byteLength,
      failedCollections: failedList,
      totalDocs: payload.totalDocs,
      collectionCount: payload.collectionCount,
      isPartial,
    };
  },

  /**
   * Ekspor terenkripsi AES-256-GCM ke Google Drive.
   */
  exportToGoogleDrive: async (
    accessToken: string,
    passphrase: string,
    customFileName?: string,
    onStatusChange?: (status: BackupStatus) => void,
    options?: { includePhotos?: boolean }
  ): Promise<boolean> => {
    if (!accessToken) {
      onStatusChange?.({ status: 'error', lastSynced: null, message: 'Akses Token Google tidak tersedia.' });
      return false;
    }

    onStatusChange?.({ status: 'syncing', lastSynced: null, message: 'Mengambil inventaris data Firestore...' });

    try {
      const payload = await collectInventorySnapshot(defaultFirestoreAdapter, {
        includePhotos: Boolean(options?.includePhotos),
      });
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

      const failedList = payload.failedCollections || [];
      const isPartial = failedList.length > 0;
      const lastSyncedTime = new Date().toLocaleTimeString('id-ID');
      onStatusChange?.({
        status: 'synced',
        lastSynced: lastSyncedTime,
        isPartial,
        failedCollections: failedList,
        message: isPartial
          ? `BACKUP PARSIAL berhasil diunggah (${payload.totalDocs} dokumen; ${failedList.length} koleksi gagal dibaca: ${failedList.map((f) => f.collection).join(', ')}).`
          : `Cadangan terenkripsi berhasil (${payload.collectionCount} koleksi, ${payload.totalDocs} dokumen).`,
      });

      await auditService.createLog({
        module: 'backup_restore',
        collection: 'backups',
        recordId: fileName,
        action: 'backup',
        details: `${isPartial ? 'BACKUP PARSIAL ' : ''}Ekspor cadangan terenkripsi AES-256-GCM ke Google Drive: ${fileName} (${payload.collectionCount} koleksi, ${payload.totalDocs} dokumen)`,
      });

      try {
        await notificationService.add({
          type: isPartial ? 'Warning' : 'Info',
          category: 'Permit',
          title: isPartial ? 'BACKUP PARSIAL Drive Selesai' : 'Cadangan Drive Terenkripsi Selesai',
          message: `File cadangan "${fileName}" (${payload.totalDocs} dokumen) tersimpan dengan AES-256-GCM.${isPartial ? ` Gagal membaca: ${failedList.map((f) => f.collection).join(', ')}.` : ''}`,
        });
      } catch {
        // best-effort notification
      }

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
   * Simulasi (Dry-Run) pemulihan tanpa menulis satu dokumen pun ke Firestore.
   * Mengukur dampak baru/timpa/hapus serta memvalidasi setiap dokumen terhadap skema Zod.
   */
  dryRunRestore: async (
    payload: BackupPlaintextPayload,
    options: {
      mode: 'merge' | 'replace';
      adapter?: BackupStoreAdapter;
      isStrictAdmin?: boolean;
    }
  ): Promise<RestoreDryRunReport> => {
    if (!payload || !payload.collections) {
      throw new Error('Payload cadangan tidak valid.');
    }

    const adapter = options.adapter ?? defaultFirestoreAdapter;
    const excludedSet = new Set<string>(RESTORE_EXCLUDED_COLLECTIONS);
    const allowPermissionMatrix = options.isStrictAdmin === true;

    const collections: RestoreDryRunCollectionResult[] = [];
    const errors: string[] = [];
    let totalBefore = 0;
    let totalNew = 0;
    let totalOverwritten = 0;
    let totalDeleted = 0;
    let totalSkipped = 0;
    let totalValidationFailed = 0;

    for (const colKey of BACKUP_COLLECTION_KEYS) {
      if (excludedSet.has(colKey)) continue;

      const rawDocs = Array.isArray(payload.collections[colKey]) ? payload.collections[colKey] : [];
      let currentDocs: Array<Record<string, any> & { id: string }> = [];
      let beforeCount = 0;

      try {
        currentDocs = await adapter.readCollection(colKey);
        beforeCount = currentDocs.length;
      } catch (err: any) {
        const msg = err?.message || `Gagal membaca koleksi eksisting ${colKey}`;
        errors.push(`${colKey}: ${msg}`);
      }

      const existingIdSet = new Set(currentDocs.map((d) => d.id));
      const targetIdSet = new Set<string>();
      let newDocs = 0;
      let overwrittenDocs = 0;
      let skippedDocs = 0;
      let validationFailedDocs = 0;
      const validationErrors: string[] = [];

      for (const item of rawDocs) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) {
          skippedDocs++;
          continue;
        }
        if (colKey === 'app_meta' && item.id === 'permission_matrix' && !allowPermissionMatrix) {
          skippedDocs++;
          const msg = `${colKey}/permission_matrix dilewati: pemulihan permission_matrix hanya diizinkan untuk Admin strict.`;
          validationErrors.push(msg);
          errors.push(msg);
          continue;
        }

        const deserialized = deserializeFirestoreValue(item);
        const check = validateBackupDocument(colKey, item.id, deserialized);
        if (!check.valid) {
          skippedDocs++;
          validationFailedDocs++;
          const errText = `${colKey}/${item.id}: ${check.error || 'Skema tidak valid'}`;
          validationErrors.push(errText);
          errors.push(errText);
          continue;
        }

        targetIdSet.add(item.id);
        if (existingIdSet.has(item.id)) {
          overwrittenDocs++;
        } else {
          newDocs++;
        }
      }

      let deletedDocs = 0;
      if (options.mode === 'replace') {
        deletedDocs = currentDocs.filter((d) => {
          if (colKey === 'app_meta' && d.id === 'permission_matrix' && !allowPermissionMatrix) {
            return false;
          }
          return !targetIdSet.has(d.id);
        }).length;
      }

      totalBefore += beforeCount;
      totalNew += newDocs;
      totalOverwritten += overwrittenDocs;
      totalDeleted += deletedDocs;
      totalSkipped += skippedDocs;
      totalValidationFailed += validationFailedDocs;

      collections.push({
        collection: colKey,
        beforeCount,
        newDocs,
        overwrittenDocs,
        deletedDocs,
        skippedDocs,
        validationFailedDocs,
        validationErrors,
      });
    }

    return {
      mode: options.mode,
      totalBefore,
      totalNew,
      totalOverwritten,
      totalDeleted,
      totalSkipped,
      totalValidationFailed,
      collections,
      errors,
    };
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
      isStrictAdmin?: boolean;
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
    const allowPermissionMatrix = options.isStrictAdmin === true;

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let validationFailedCount = 0;
    let deletedCount = 0;
    const unprocessedCollections: string[] = [];
    const errors: string[] = [];
    const perCollectionSummary: RestoreExecutionReport['perCollectionSummary'] = [];

    for (const colKey of BACKUP_COLLECTION_KEYS) {
      if (excludedSet.has(colKey)) continue;

      const rawDocs = Array.isArray(payload.collections[colKey]) ? payload.collections[colKey] : [];
      const sets: Array<{ id: string; data: Record<string, any> }> = [];
      let colSkipped = 0;

      for (const item of rawDocs) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) {
          colSkipped++;
          skippedCount++;
          continue;
        }
        if (colKey === 'app_meta' && item.id === 'permission_matrix' && !allowPermissionMatrix) {
          colSkipped++;
          skippedCount++;
          errors.push(`${colKey}/permission_matrix dilewati: hanya Admin strict yang dapat memulihkan dokumen matriks izin.`);
          continue;
        }

        const deserialized = deserializeFirestoreValue(item) as Record<string, any>;
        const validation = validateBackupDocument(colKey, item.id, deserialized);
        if (!validation.valid) {
          colSkipped++;
          skippedCount++;
          validationFailedCount++;
          errors.push(`${colKey}/${item.id} dilewati (validasi gagal): ${validation.error}`);
          continue;
        }

        sets.push({ id: item.id, data: deserialized });
      }

      let beforeCount = 0;
      let deletes: string[] = [];

      try {
        const currentDocs = await adapter.readCollection(colKey);
        beforeCount = currentDocs.length;

        if (options.mode === 'replace') {
          const targetIdSet = new Set(sets.map((s) => s.id));
          deletes = currentDocs
            .filter((d) => {
              if (colKey === 'app_meta' && d.id === 'permission_matrix' && !allowPermissionMatrix) {
                return false;
              }
              return !targetIdSet.has(d.id);
            })
            .map((d) => d.id);
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
      validationFailedCount,
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
        details: `Restore mode=${options.mode}: sukses=${successCount}, hapus=${deletedCount}, gagal=${failedCount}, lewati=${skippedCount} (validasiGagal=${validationFailedCount}), koleksiGagal=${unprocessedCollections.join(',') || 'none'}`,
      });
      report.auditWriteSuccess = auditRes.success;
      report.auditWriteError = auditRes.error;
    }

    return report;
  },
};
