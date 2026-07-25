/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from './firebaseAuth';

const CURRENT_CACHE_VERSION = 2;

interface VersionedCachePayload<T> {
  version: number;
  updatedAt: string;
  data: T;
}

/**
 * Mendapatkan email dari user aktif sebagai pengenal scope
 */
export function getActiveUserEmail(): string {
  return auth.currentUser?.email || 'guest_user';
}

/**
 * Menghasilkan key localStorage yang ter-scope berdasarkan email user aktif
 * Memenuhi Kebutuhan Prioritas: "Gunakan active user email sebagai prefix localStorage key"
 */
export function getScopedKey(key: string): string {
  const email = getActiveUserEmail().replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  return `coal_monitor_${email}_${key}`;
}

/**
 * Membaca data dari cache offline localStorage
 */
export function getOfflineCache<T>(key: string, fallbackValue: T): T {
  try {
    const scopedKey = getScopedKey(key);
    const cached = localStorage.getItem(scopedKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Validasi versioning
      if (parsed && typeof parsed === 'object' && 'version' in parsed) {
        const payload = parsed as VersionedCachePayload<T>;
        if (payload.version === CURRENT_CACHE_VERSION) {
          return payload.data;
        }
      }
      // Versi tidak cocok atau tidak ter-versioning, bersihkan cache lama
      clearOfflineCache(key);
    }
  } catch (err) {
    console.warn(`Gagal membaca offline cache untuk key: ${key}`, err);
  }
  return fallbackValue;
}

/**
 * Menyimpan data ke cache offline localStorage
 */
export function setOfflineCache<T>(key: string, value: T): void {
  try {
    const scopedKey = getScopedKey(key);
    const payload: VersionedCachePayload<T> = {
      version: CURRENT_CACHE_VERSION,
      updatedAt: new Date().toISOString(),
      data: value
    };
    localStorage.setItem(scopedKey, JSON.stringify(payload));
  } catch (err) {
    console.warn(`Gagal menulis offline cache untuk key: ${key}`, err);
  }
}

/**
 * Menghapus cache offline
 */
export function clearOfflineCache(key: string): void {
  try {
    const scopedKey = getScopedKey(key);
    localStorage.removeItem(scopedKey);
  } catch (err) {
    console.warn(`Gagal menghapus offline cache untuk key: ${key}`, err);
  }
}

// Menjaga kompatibilitas jika ada module yang memanggil fungsi-fungsi ini dari versi sebelumnya
export async function syncLocalDataToFirestore(): Promise<void> {
  console.log("Sinkronisasi otomatis diaktifkan dengan Firestore sebagai Source of Truth.");
}

export function saveSyncConfig(config: any): void {
  const key = getScopedKey('sync_config');
  // sync_config juga disimpan menggunakan setOfflineCache untuk mendukung versioning
  setOfflineCache('sync_config', config);
}

export function getSyncConfig(): any {
  return getOfflineCache('sync_config', { enabled: true });
}

export function saveUserProfile(user: any): void {
  setOfflineCache('user_profile', user);
}

export function getUserProfile(): any {
  return getOfflineCache('user_profile', null);
}
