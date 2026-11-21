/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Katalog Limbah B3 PT Diva Kencana Borneo
 * Acuan regulasi umum: Lampiran IX PP No. 22 Tahun 2021 jo. Permen LHK No. 6 Tahun 2021.
 * Status verifikasi mengindikasikan apakah batas masa simpan telah diverifikasi terhadap Rincian Teknis TPS LB3 PT DKB.
 */

export interface WasteCatalogItem {
  name: string;
  code: string;
  subCategory: 'Kategori 1' | 'Kategori 2';
  maxStorageDays: number;
  storageBasis: string;
  effectiveDate: string;
  verificationStatus: 'Terverifikasi' | 'PERLU VERIFIKASI';
  aliases?: string[];
}

export const DEFAULT_MAX_STORAGE_DAYS = 90;
export const WARNING_STORAGE_LEAD_DAYS = 15; // Peringatan internal H-15 sebelum batas masing-masing jenis limbah
export const WARNING_STORAGE_DAYS = 75;
export const TPS_CAPACITY_KG = 30000; // Kapasitas TPS (konfigurasi dalam Kg)

export const wasteB3Catalog: WasteCatalogItem[] = [
  {
    name: 'Aki / Baterai Bekas',
    code: 'A102d',
    subCategory: 'Kategori 1',
    maxStorageDays: 90,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 1 — konfirmasi timbulan/Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
    aliases: ['Baterai Bekas'],
  },
  {
    name: 'Minyak Pelumas Bekas',
    code: 'B105d',
    subCategory: 'Kategori 2',
    maxStorageDays: 180,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 2 sumber spesifik/umum — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Limbah Medis',
    code: 'A337-1',
    subCategory: 'Kategori 1',
    maxStorageDays: 90,
    storageBasis: 'PP No. 22/2021 & Permen LHK 6/2021 (Kategori 1 — perhatikan syarat penyimpanan dingin/Rintek)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Filter Oli Bekas',
    code: 'B109d',
    subCategory: 'Kategori 2',
    maxStorageDays: 180,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 2 — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Kemasan Bekas B3',
    code: 'B104d',
    subCategory: 'Kategori 2',
    maxStorageDays: 180,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 2 — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Kain Majun',
    code: 'B110d',
    subCategory: 'Kategori 2',
    maxStorageDays: 180,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 2 — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Limbah Elektronik',
    code: 'B107d',
    subCategory: 'Kategori 2',
    maxStorageDays: 365,
    storageBasis: 'PP No. 22/2021 Pasal 296 (Kategori 2 sumber spesifik khusus — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Limbah Terkontaminasi B3',
    code: 'A108d',
    subCategory: 'Kategori 1',
    maxStorageDays: 90,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 1 — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Sludge Oil treatment',
    code: 'A331-2',
    subCategory: 'Kategori 1',
    maxStorageDays: 90,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 1 — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Limbah Cat',
    code: 'A355-1',
    subCategory: 'Kategori 1',
    maxStorageDays: 90,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 1 — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Refrigeran Bekas',
    code: 'A111d',
    subCategory: 'Kategori 1',
    maxStorageDays: 90,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 1 — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
    aliases: ['Refrigent Bekas'],
  },
  {
    name: 'Toner Bekas',
    code: 'B353-1',
    subCategory: 'Kategori 2',
    maxStorageDays: 365,
    storageBasis: 'PP No. 22/2021 Pasal 296 (Kategori 2 sumber spesifik khusus — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Produk farmasi kadaluarsa',
    code: 'A337-2',
    subCategory: 'Kategori 1',
    maxStorageDays: 90,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 1 — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    name: 'Filter bekas pengendalian pencemaran udara',
    code: 'B109d',
    subCategory: 'Kategori 2',
    maxStorageDays: 180,
    storageBasis: 'PP No. 22/2021 Pasal 296 & Lampiran IX (Kategori 2 — verifikasi Rintek TPS PT DKB)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
];

export function resolveCatalogItem(
  wasteType: string,
  code?: string,
  catalog: WasteCatalogItem[] = wasteB3Catalog
): WasteCatalogItem | null {
  const normType = (wasteType || '').trim().toLowerCase();
  const normCode = (code || '').trim().toLowerCase();

  if (normType) {
    const byName = catalog.find(
      (item) =>
        item.name.toLowerCase() === normType ||
        (item.aliases && item.aliases.some((a) => a.toLowerCase() === normType))
    );
    if (byName) return byName;
  }

  if (normCode) {
    const byCode = catalog.find((item) => item.code.toLowerCase() === normCode);
    if (byCode) return byCode;
  }

  return null;
}

export function getMaxStorageDaysForWaste(
  wasteType: string,
  code?: string,
  catalog: WasteCatalogItem[] = wasteB3Catalog
): {
  maxStorageDays: number;
  storageBasis: string;
  verificationStatus: 'Terverifikasi' | 'PERLU VERIFIKASI';
} {
  const item = resolveCatalogItem(wasteType, code, catalog);
  if (item) {
    return {
      maxStorageDays: item.maxStorageDays,
      storageBasis: item.storageBasis,
      verificationStatus: item.verificationStatus,
    };
  }
  return {
    maxStorageDays: DEFAULT_MAX_STORAGE_DAYS,
    storageBasis: 'Jenis limbah tidak terdaftar pada katalog — memakai batas konservatif 90 hari hingga diverifikasi',
    verificationStatus: 'PERLU VERIFIKASI',
  };
}

/**
 * Cari kode limbah berdasarkan nama jenis limbah (mendukung alias nama lama)
 */
export function findCatalogCode(wasteType: string): string {
  const match = resolveCatalogItem(wasteType);
  return match ? match.code : 'N/A';
}

/**
 * Normalisasi nama limbah ke nama standar katalog
 */
export function normalizeWasteTypeName(wasteType: string): string {
  const match = resolveCatalogItem(wasteType);
  return match ? match.name : wasteType;
}
