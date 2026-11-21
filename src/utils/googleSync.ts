/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from './firebaseAuth';

const CURRENT_CACHE_VERSION = 3;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam kedaluwarsa otomatis

// Key sensitif / PII / kredensial yang dilarang disimpan di localStorage
const BLOCKED_CACHE_KEYS = new Set([
  'users',
  'roles',
  'audit_logs',
  'user_profile',
  'tokens',
  'credentials',
  'password',
]);

interface VersionedCachePayload<T> {
  version: number;
  uid: string;
  updatedAt: string;
  expiresAt: number;
  data: T;
}

export function getActiveUserEmail(): string {
  return auth.currentUser?.email || 'anonymous';
}

export function getActiveUserUid(): string | null {
  return auth.currentUser?.uid || null;
}

export function getScopedKey(key: string): string {
  const uid = auth.currentUser?.uid;
  const safeScope = uid
    ? `uid_${uid.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    : 'unauth_none';
  return `dem_cache_v3_${safeScope}_${key}`;
}

/**
 * Membaca data dari cache offline localStorage dengan isolasi UID dan pemeriksaan TTL.
 * Mengembalikan fallbackValue bila tidak ada sesi aktif, versi berbeda, atau cache kedaluwarsa.
 */
export function getOfflineCache<T>(key: string, fallbackValue: T): T {
  try {
    if (BLOCKED_CACHE_KEYS.has(key)) return fallbackValue;
    const activeUid = getActiveUserUid();
    if (!activeUid) return fallbackValue;

    const scopedKey = getScopedKey(key);
    const cached = localStorage.getItem(scopedKey);
    if (!cached) return fallbackValue;

    const parsed = JSON.parse(cached) as Partial<VersionedCachePayload<T>>;
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.version === CURRENT_CACHE_VERSION &&
      parsed.uid === activeUid &&
      typeof parsed.expiresAt === 'number' &&
      Date.now() <= parsed.expiresAt
    ) {
      return parsed.data as T;
    }

    localStorage.removeItem(scopedKey);
  } catch (err) {
    console.warn(`Gagal membaca offline cache untuk key: ${key}`, err);
  }
  return fallbackValue;
}

/**
 * Menyimpan cache ter-scope UID dengan masa kedaluwarsa TTL.
 */
export function setOfflineCache<T>(key: string, value: T, ttlMs = CACHE_TTL_MS): void {
  try {
    if (BLOCKED_CACHE_KEYS.has(key)) return;
    const activeUid = getActiveUserUid();
    if (!activeUid) return;

    const scopedKey = getScopedKey(key);
    const now = Date.now();
    const payload: VersionedCachePayload<T> = {
      version: CURRENT_CACHE_VERSION,
      uid: activeUid,
      updatedAt: new Date(now).toISOString(),
      expiresAt: now + ttlMs,
      data: value,
    };
    localStorage.setItem(scopedKey, JSON.stringify(payload));
  } catch (err) {
    console.warn(`Gagal menulis offline cache untuk key: ${key}`, err);
  }
}

export function clearOfflineCache(key: string): void {
  try {
    const scopedKey = getScopedKey(key);
    localStorage.removeItem(scopedKey);
  } catch (err) {
    console.warn(`Gagal menghapus offline cache untuk key: ${key}`, err);
  }
}

/**
 * Menghapus seluruh cache aplikasi dan token sesi (dipanggil saat logout atau perpindahan akun).
 */
export function clearAllUserCaches(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('dem_cache_') ||
          k.includes('coal_monitor') ||
          k.includes('coal_pro'))
      ) {
        localStorage.removeItem(k);
      }
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const sk = sessionStorage.key(i);
      if (sk && (sk.startsWith('gat_') || sk.startsWith('dem_'))) {
        sessionStorage.removeItem(sk);
      }
    }
  } catch (err) {
    console.warn('Gagal membersihkan cache lokal pengguna:', err);
  }
}

export async function syncLocalDataToFirestore(): Promise<void> {
  // Sinkronisasi dijalankan langsung melalui listener Firestore.
}

export function saveSyncConfig(config: any): void {
  setOfflineCache('sync_config', config);
}

export function getSyncConfig(): any {
  return getOfflineCache('sync_config', { enabled: true });
}
