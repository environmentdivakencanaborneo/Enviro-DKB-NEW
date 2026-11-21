/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CollectionInventoryItem {
  key: string;
  label: string;
  category: 'Operasional' | 'Master & Regulasi' | 'Kepatuhan & Evidence';
}

/**
 * Inventaris tunggal seluruh koleksi operasional & master aplikasi DEM
 * yang dicakup pada pencadangan (backup) dan pemulihan (restore).
 */
export const BACKUP_INVENTORY: CollectionInventoryItem[] = [
  { key: 'wastewater', label: 'Pemantauan Air Limbah', category: 'Operasional' },
  { key: 'wastewater_photos', label: 'Foto Bukti Air Limbah', category: 'Operasional' },
  { key: 'wq_locations', label: 'Master Titik Penaatan Air', category: 'Master & Regulasi' },
  { key: 'surfacewater', label: 'Pemantauan Air Permukaan', category: 'Operasional' },
  { key: 'domestic_wastewater', label: 'Air Limbah Domestik (IPAL)', category: 'Operasional' },
  { key: 'amd_treatment', label: 'Pengolahan Air Asam Tambang', category: 'Operasional' },
  { key: 'rainfall', label: 'Curah Hujan & Hidrologi', category: 'Operasional' },
  { key: 'air_emission', label: 'Udara Ambien, Emisi & Kebisingan', category: 'Operasional' },
  { key: 'ghg_factors', label: 'Master Faktor Emisi GRK', category: 'Master & Regulasi' },
  { key: 'ghg_activities', label: 'Inventarisasi Aktivitas GRK', category: 'Operasional' },
  { key: 'nursery', label: 'Inventaris Pembibitan', category: 'Operasional' },
  { key: 'nursery_stock_out', label: 'Penyaluran Bibit Nursery', category: 'Operasional' },
  { key: 'reclamation', label: 'Rencana Reklamasi & Jaminan', category: 'Operasional' },
  { key: 'topsoil_erosion', label: 'Topsoil & Pengendalian Erosi', category: 'Operasional' },
  { key: 'biodiversity', label: 'Keanekaragaman Hayati', category: 'Operasional' },
  { key: 'waste_b3', label: 'Logbook & Manifest Limbah B3', category: 'Operasional' },
  { key: 'solid_waste', label: 'Sampah & Limbah Non-B3', category: 'Operasional' },
  { key: 'documents', label: 'Dokumen Izin & Agenda Kepatuhan', category: 'Kepatuhan & Evidence' },
  { key: 'pertek_slo', label: 'Register Pertek & SLO', category: 'Kepatuhan & Evidence' },
  { key: 'compliance_matrix', label: 'Matriks Kewajiban RKL-RPL', category: 'Kepatuhan & Evidence' },
  { key: 'reporting_calendar', label: 'Kalender Pelaporan Wajib', category: 'Kepatuhan & Evidence' },
  { key: 'regulatory', label: 'Regulatory Watch', category: 'Master & Regulasi' },
  { key: 'iadl_risk', label: 'Register IADL & Risiko', category: 'Kepatuhan & Evidence' },
  { key: 'external_supervisions', label: 'Pengawasan Eksternal & Sanksi', category: 'Kepatuhan & Evidence' },
  { key: 'proper_rkab', label: 'PROPER & RKAB Lingkungan', category: 'Kepatuhan & Evidence' },
  { key: 'capa', label: 'Temuan & CAPA Lingkungan', category: 'Kepatuhan & Evidence' },
  { key: 'incidents', label: 'Insiden & Darurat Lingkungan', category: 'Operasional' },
  { key: 'costs', label: 'Anggaran & Biaya Lingkungan', category: 'Kepatuhan & Evidence' },
  { key: 'standards', label: 'Master Baku Mutu Dinamis', category: 'Master & Regulasi' },
  { key: 'app_meta', label: 'Konfigurasi Ambang & Kriteria PROPER', category: 'Master & Regulasi' },
  { key: 'evidence_reports', label: 'Dokumen Evidence Harian & Bulanan', category: 'Kepatuhan & Evidence' },
];

export const BACKUP_COLLECTION_KEYS: string[] = BACKUP_INVENTORY.map((c) => c.key);

/**
 * Koleksi identitas, keamanan, dan dokumen bukti bertanda tangan yang DIKECUALIKAN
 * dari pemulihan otomatis agar restore tidak dapat memanipulasi role Admin,
 * mengubah log audit immutable, memalsukan nomor counter sekuensial,
 * menimpa tanda tangan pengguna, atau menimpa bukti kepatuhan bertanda tangan.
 */
export const RESTORE_EXCLUDED_COLLECTIONS = [
  'users',
  'roles',
  'audit_logs',
  'counters',
  'signatures',
  'notifications',
  'alerts',
  'evidence_reports',
  'evidence_verify',
] as const;
