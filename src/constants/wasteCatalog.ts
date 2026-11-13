/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Katalog Limbah B3 PT Diva Kencana Borneo
 * PERHATIAN: VERIFIKASI semua kode terhadap Lampiran IX PP No. 22 Tahun 2021 jo. Permen LHK No. 6 Tahun 2021 sebelum dipakai untuk pelaporan
 */

export interface WasteCatalogItem {
  name: string;
  code: string;
  subCategory?: 'Kategori 1' | 'Kategori 2';
  maxStorageDays?: number;
  aliases?: string[];
}

export const DEFAULT_MAX_STORAGE_DAYS = 90;
export const WARNING_STORAGE_DAYS = 75;
export const TPS_CAPACITY_KG = 30000; // Kapasitas TPS (konfigurasi dalam Kg)

// Daftar katalog limbah B3 standar (setiap item unik, dilengkapi kategori & masa simpan maks PP 22/2021)
export const wasteB3Catalog: WasteCatalogItem[] = [
  { name: "Aki / Baterai Bekas", code: "A102d", subCategory: "Kategori 1", maxStorageDays: 90, aliases: ["Baterai Bekas"] },
  { name: "Minyak Pelumas Bekas", code: "B105d", subCategory: "Kategori 2", maxStorageDays: 180 },
  { name: "Limbah Medis", code: "A337-1", subCategory: "Kategori 1", maxStorageDays: 90 },
  { name: "Filter Oli Bekas", code: "B109d", subCategory: "Kategori 2", maxStorageDays: 180 },
  { name: "Kemasan Bekas B3", code: "B104d", subCategory: "Kategori 2", maxStorageDays: 180 },
  { name: "Kain Majun", code: "B110d", subCategory: "Kategori 2", maxStorageDays: 180 },
  { name: "Limbah Elektronik", code: "B107d", subCategory: "Kategori 2", maxStorageDays: 365 },
  { name: "Limbah Terkontaminasi B3", code: "A108d", subCategory: "Kategori 1", maxStorageDays: 90 },
  { name: "Sludge Oil treatment", code: "A331-2", subCategory: "Kategori 1", maxStorageDays: 90 },
  { name: "Limbah Cat", code: "A355-1", subCategory: "Kategori 1", maxStorageDays: 90 },
  { name: "Refrigeran Bekas", code: "A111d", subCategory: "Kategori 1", maxStorageDays: 90, aliases: ["Refrigent Bekas"] },
  { name: "Toner Bekas", code: "B353-1", subCategory: "Kategori 2", maxStorageDays: 365 },
  { name: "Produk farmasi kadaluarsa", code: "A337-2", subCategory: "Kategori 1", maxStorageDays: 90 },
  { name: "Filter bekas pengendalian pencemaran udara", code: "B109d", subCategory: "Kategori 2", maxStorageDays: 180 }
];

/**
 * Cari kode limbah berdasarkan nama jenis limbah (mendukung alias nama lama)
 */
export function findCatalogCode(wasteType: string): string {
  if (!wasteType) return 'N/A';
  const normalized = wasteType.trim().toLowerCase();
  const match = wasteB3Catalog.find(item =>
    item.name.toLowerCase() === normalized ||
    (item.aliases && item.aliases.some(a => a.toLowerCase() === normalized))
  );
  return match ? match.code : 'N/A';
}

/**
 * Normalisasi nama limbah ke nama standar katalog
 */
export function normalizeWasteTypeName(wasteType: string): string {
  if (!wasteType) return '';
  const normalized = wasteType.trim().toLowerCase();
  const match = wasteB3Catalog.find(item =>
    item.name.toLowerCase() === normalized ||
    (item.aliases && item.aliases.some(a => a.toLowerCase() === normalized))
  );
  return match ? match.name : wasteType;
}
