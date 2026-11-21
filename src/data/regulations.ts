/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  EnvironmentalStandard,
  InternalThresholdsConfig,
  ProperCriteriaMaster,
  RegulatoryWatchData,
  StandardMedia,
} from '../types';
import {
  DEFAULT_INTERNAL_THRESHOLDS_VALUE,
  evaluateSampleCompliance,
  resolveEffectiveStandardsMap,
  type EvaluateSampleOptions,
} from '../utils/waterQualityEval';

export interface RegulationParam {
  name: string;
  unit: string;
  limit: string;
  numericLimit?: number | null;
  comparison: 'max' | 'min' | 'range';
  minLimit?: number;
}

export interface EnvironmentalRegulation {
  id: string;
  title: string;
  category: string;
  description: string;
  parameters?: RegulationParam[];
  referenceLink?: string;
}

export const INDONESIAN_REGULATIONS: EnvironmentalRegulation[] = [
  {
    id: 'PP-22-2021',
    title: 'PP No. 22 Tahun 2021 (Lampiran VI, VII, IX)',
    category: 'Air Permukaan, Udara Ambien & Limbah B3',
    description:
      'Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup. Lampiran VI mengatur Baku Mutu Air Nasional (Kelas I–IV); Lampiran VII mengatur Baku Mutu Udara Ambien; Lampiran IX mengatur Daftar Limbah B3. Parameter Besi Terlarut & Mangan Terlarut pada Kelas II bersifat informatif / perlu verifikasi teknis izin badan air penerima sebelum dipakai sebagai pelanggaran.',
    parameters: [
      { name: 'pH', unit: '', limit: '6.0 - 9.0', numericLimit: 9.0, comparison: 'range', minLimit: 6.0 },
      { name: 'TSS', unit: 'mg/L', limit: 'Maks 50', numericLimit: 50, comparison: 'max' },
      { name: 'DO', unit: 'mg/L', limit: 'Min 4', numericLimit: 4, comparison: 'min' },
      { name: 'BOD', unit: 'mg/L', limit: 'Maks 3', numericLimit: 3, comparison: 'max' },
      { name: 'COD', unit: 'mg/L', limit: 'Maks 25', numericLimit: 25, comparison: 'max' },
      { name: 'Besi Terlarut (Perlu verifikasi)', unit: 'mg/L', limit: 'Perlu verifikasi', comparison: 'max' },
      { name: 'Mangan Terlarut (Perlu verifikasi)', unit: 'mg/L', limit: 'Perlu verifikasi', comparison: 'max' },
    ],
  },
  {
    id: 'KepmenLH-113-2003',
    title: 'Baku Mutu Air Limbah Tambang Batubara (Kepmen LH 113/2003 & SK Pertek PT DKB)',
    category: 'Air Limbah Tambang Batubara',
    description:
      'pH, Fe, dan Mn mengacu Kepmen LH No. 113 Tahun 2003. Untuk periode sebelum 26 Maret 2025, TSS mengacu SK Pertek PT DKB No. 503/IPAL-LH/DPM-PTSP/2021 (Perda Kaltim No. 2/2011). Mulai 26 Maret 2025 diterbitkan SK Pertek BMAL PT DKB No. 600.4/865/B.III.2/DLH/2025 — nilai ambang TSS pada SK Pertek 2025 ditandai PERLU VERIFIKASI hingga lampiran resmi SK diunggah & diverifikasi.',
    parameters: [
      { name: 'pH', unit: '-', limit: '6.0 - 9.0', numericLimit: 9.0, comparison: 'range', minLimit: 6.0 },
      { name: 'TSS (< 26 Mar 2025)', unit: 'mg/L', limit: 'Maks 300 (Historis 2021)', numericLimit: 300, comparison: 'max' },
      { name: 'TSS (>= 26 Mar 2025)', unit: 'mg/L', limit: 'Perlu Verifikasi (SK 600.4/865/B.III.2/DLH/2025)', comparison: 'max' },
      { name: 'Besi (Fe)', unit: 'mg/L', limit: 'Maks 7.0', numericLimit: 7.0, comparison: 'max' },
      { name: 'Mangan (Mn)', unit: 'mg/L', limit: 'Maks 4.0', numericLimit: 4.0, comparison: 'max' },
      { name: 'Debit', unit: 'm³/s', limit: 'Pantau (Monitoring)', comparison: 'max' },
    ],
  },
  {
    id: 'PermenLHK-6-2021',
    title: 'Permen LHK No. 6 Tahun 2021 & Lampiran IX PP 22/2021',
    category: 'Limbah B3',
    description:
      'Tata Cara dan Persyaratan Pengelolaan Limbah Bahan Berbahaya dan Beracun, termasuk standarisasi penyimpanan TPS (90/180/365 hari sesuai kategori/karakteristik & rincian teknis penyimpanan) serta kode limbah berdasarkan Lampiran IX PP No. 22 Tahun 2021.',
    parameters: [
      { name: 'Masa Simpan Maksimal', unit: 'Hari', limit: '90 / 180 / 365 Hari (sesuai jenis & Persetujuan Lingkungan)', numericLimit: 90, comparison: 'max' },
    ],
  },
  {
    id: 'UU-18-2008',
    title: 'UU No. 18 Tahun 2008; PP No. 81 Tahun 2012; Permen LHK No. 19 Tahun 2021',
    category: 'Pengelolaan Sampah & Limbah Non-B3',
    description:
      'Dasar pengelolaan sampah domestik/sejenis sampah rumah tangga dan pengelolaan limbah non-B3 terdaftar/khusus. Target pemilahan/pengolahan dalam aplikasi merupakan KPI internal perusahaan (mengacu arah Jakstranas; perlu penetapan manajemen).',
    parameters: [],
  },
  {
    id: 'PermenLH-7-2025',
    title: 'Permen LH/BPLH No. 7 Tahun 2025 (Menunggu Verifikasi Naskah Resmi)',
    category: 'PROPER',
    description:
      'Pengaturan Program Penilaian Peringkat Kinerja Perusahaan dalam Pengelolaan Lingkungan Hidup (mencabut Permen LHK No. 1 Tahun 2021). Metadata tanggal pengundangan dan lampiran kriteria wajib diverifikasi pada JDIH KLH/BPLH sebelum dijadikan acuan skoring otomatis.',
    parameters: [],
  },
  {
    id: 'PermenESDM-17-2025',
    title: 'Permen ESDM No. 17 Tahun 2025 jo. Permen ESDM No. 6 Tahun 2026',
    category: 'RKAB Pertambangan',
    description:
      'Ketentuan penyusunan, penyampaian, dan persetujuan RKAB Pertambangan Minerba tahunan melalui Minerba One (menggantikan rezim RKAB multi-tahun Permen ESDM No. 10/2023). Detail tanggal penetapan/pengundangan menunggu verifikasi JDIH ESDM.',
    parameters: [],
  },
  {
    id: 'KepmenESDM-344-2025',
    title: 'Kepmen ESDM No. 344.K/MB.01/MEM.B/2025',
    category: 'Reklamasi & Pascatambang',
    description:
      'Pedoman Teknis Pelaksanaan Reklamasi dan Pascatambang pada Kegiatan Usaha Pertambangan Mineral dan Batubara (ditetapkan 23 Oktober 2025), termasuk ketentuan penempatan Jaminan Reklamasi dan Jaminan Pascatambang dalam bentuk Deposito Berjangka pada Bank Pemerintah.',
    parameters: [
      { name: 'Bentuk Jaminan Baru', unit: 'Instrumen', limit: 'Deposito Berjangka (Bank Pemerintah)', numericLimit: 100, comparison: 'max' },
    ],
  },
  {
    id: 'KepmenESDM-1827-2018',
    title: 'Kepmen ESDM No. 1827 K/30/MEM/2018 & Permen ESDM No. 26 Tahun 2018',
    category: 'Kaidah Pertambangan Baik (Good Mining Practice)',
    description:
      'Pelaksanaan Kaidah Pertambangan yang Baik dan Pengawasan Pertambangan Mineral dan Batubara. Catatan sinkronisasi: Periksa irisan ketentuan reklamasi & pascatambang dengan Kepmen ESDM No. 344.K/MB.01/MEM.B/2025.',
    parameters: [],
  },
  {
    id: 'PP-28-2025',
    title: 'PP No. 28 Tahun 2025 & Permen LH/BPLH No. 22 Tahun 2025',
    category: 'Perizinan Berusaha & Persetujuan Lingkungan',
    description:
      'Penyelenggaraan Perizinan Berusaha Berbasis Risiko (PP 28/2025, menggantikan PP 5/2021) dan ketentuan terkait Persetujuan Lingkungan/Pertek di bawah KLH/BPLH (entri Permen LH/BPLH 22/2025 bertanda Menunggu Verifikasi JDIH).',
    parameters: [],
  },
  {
    id: 'UU-2-2025',
    title: 'UU No. 4 Tahun 2009 jo. UU No. 2 Tahun 2025 (Perubahan Keempat)',
    category: 'Pertambangan Minerba',
    description:
      'Kerangka hukum pertambangan mineral dan batubara Indonesia sebagaimana diubah terakhir dengan UU No. 2 Tahun 2025 tentang Perubahan Keempat atas UU No. 4 Tahun 2009.',
    parameters: [],
  },
  {
    id: 'UU-3-2020',
    title: 'UU No. 3 Tahun 2020 (Rujukan Historis)',
    category: 'Pertambangan Minerba (Historis)',
    description:
      'Perubahan atas UU No. 4 Tahun 2009 (rujukan historis sebelum UU No. 2 Tahun 2025). Kewajiban reklamasi & perlindungan lingkungan pertambangan tetap relevan sepanjang tidak diubah ketentuan terbaru.',
    parameters: [],
  },
];

/**
 * Daftar key/metadata parameter default tanpa angka batas statis sebagai referensi tampilan awal.
 * Seluruh evaluasi kepatuhan WAJIB menggunakan koleksi Master Baku Mutu (`standards`) melalui `waterQualityEval.ts`.
 */
export const WASTEWATER_STANDARDS = [
  { key: 'ph', label: 'pH', unit: '-', min: 6, max: 9, display: 'Sesuai Master', decimals: { min: 1, max: 2 } },
  { key: 'tss', label: 'TSS', unit: 'mg/L', min: null, max: null, display: 'Sesuai Master', decimals: { min: 0, max: 1 } },
  { key: 'debit', label: 'Debit', unit: 'm³/s', min: null, max: null, display: 'Bebas / Pantau', decimals: { min: 1, max: 3 } },
  { key: 'fe', label: 'Besi (Fe)', unit: 'mg/L', min: null, max: 7, display: 'Sesuai Master', decimals: { min: 1, max: 3 } },
  { key: 'mn', label: 'Mangan (Mn)', unit: 'mg/L', min: null, max: 4, display: 'Sesuai Master', decimals: { min: 1, max: 3 } },
] as const;

export const WASTEWATER_BASIS_LABEL =
  'Kepmen LH No. 113 Tahun 2003 & SK Pertek BMAL PT DKB (mengikuti periode berlaku pada Master Baku Mutu)';
export const SURFACE_WATER_BASIS_LABEL = 'PP No. 22 Tahun 2021 Lampiran VI (Air Permukaan Kelas II)';
export const WARNING_RATIO = 0.85;

export const DEFAULT_INTERNAL_THRESHOLDS: InternalThresholdsConfig = DEFAULT_INTERNAL_THRESHOLDS_VALUE;

export const DEFAULT_PROPER_CRITERIA: ProperCriteriaMaster = {
  id: 'proper_criteria',
  regulationBasis:
    'Permen LH/BPLH No. 7 Tahun 2025 tentang Program Penilaian Peringkat Kinerja Pengelolaan Lingkungan Hidup',
  criteria: [],
};

export const INITIAL_STANDARDS_SEED: Omit<
  EnvironmentalStandard,
  'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'
>[] = [
  {
    id: 'STD-WW-PH',
    media: 'air_limbah',
    parameterKey: 'ph',
    parameterLabel: 'pH',
    unit: '-',
    minLimit: 6.0,
    maxLimit: 9.0,
    basisRegulasi: 'Kepmen LH No. 113 Tahun 2003',
    approvalDocNo: 'Kepmen LH No. 113 Tahun 2003',
    decreeDate: '2003-07-10',
    effectiveFrom: '2021-01-01',
    effectiveTo: null,
    sourceDocument: 'Kepmen LH No. 113 Tahun 2003 Lampiran',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
    notes: 'Rentang pH air limbah pertambangan batubara.',
  },
  {
    id: 'STD-WW-TSS',
    media: 'air_limbah',
    parameterKey: 'tss',
    parameterLabel: 'TSS',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: 300,
    basisRegulasi: 'SK Pertek Air Limbah PT DKB No. 503/IPAL-LH/DPM-PTSP/2021 & Perda Kaltim No. 2/2011',
    approvalDocNo: 'No. 503/IPAL-LH/DPM-PTSP/2021',
    decreeDate: '2021-01-01',
    effectiveFrom: '2021-01-01',
    effectiveTo: '2025-03-25',
    sourceDocument: 'SK Pertek Air Limbah PT DKB 2021',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
    notes: 'Standar historis sebelum penerbitan SK Pertek BMAL No. 600.4/865/B.III.2/DLH/2025 tanggal 26 Maret 2025.',
  },
  {
    id: 'STD-WW-PERTEK-2025-TSS',
    media: 'air_limbah',
    parameterKey: 'tss',
    parameterLabel: 'TSS',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: null,
    basisRegulasi: 'SK Pertek BMAL PT DKB No. 600.4/865/B.III.2/DLH/2025',
    approvalDocNo: 'No. 600.4/865/B.III.2/DLH/2025',
    decreeDate: '2025-03-26',
    effectiveFrom: '2025-03-26',
    effectiveTo: null,
    sourceDocument: 'SK Pertek BMAL No. 600.4/865/B.III.2/DLH/2025 (Lampiran resmi belum diunggah)',
    isActive: true,
    applicable: true,
    verificationStatus: 'Perlu verifikasi',
    effectiveStatus: 'MENUNGGU VERIFIKASI',
    notes:
      'PERLU VERIFIKASI MANUAL: Lampiran resmi SK Pertek BMAL PT DKB No. 600.4/865/B.III.2/DLH/2025 tanggal 26 Maret 2025 belum tersedia di sistem. Masukkan nilai batas TSS, titik penaatan, dan ubah status menjadi Terverifikasi setelah verifikasi dokumen DLH resmi.',
  },
  {
    id: 'STD-WW-DEBIT',
    media: 'air_limbah',
    parameterKey: 'debit',
    parameterLabel: 'Debit',
    unit: 'm³/s',
    minLimit: null,
    maxLimit: null,
    basisRegulasi: 'Kepmen LH No. 113 Tahun 2003 (Pantau/Monitoring)',
    approvalDocNo: 'Kepmen LH No. 113 Tahun 2003',
    decreeDate: '2003-07-10',
    effectiveFrom: '2021-01-01',
    effectiveTo: null,
    sourceDocument: 'Kepmen LH No. 113 Tahun 2003',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
    notes: 'Parameter dipantau (tanpa batas ambang numerik baku mutu kecuali diatur khusus dalam Pertek).',
  },
  {
    id: 'STD-WW-FE',
    media: 'air_limbah',
    parameterKey: 'fe',
    parameterLabel: 'Besi (Fe)',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: 7.0,
    basisRegulasi: 'Kepmen LH No. 113 Tahun 2003',
    approvalDocNo: 'Kepmen LH No. 113 Tahun 2003',
    decreeDate: '2003-07-10',
    effectiveFrom: '2021-01-01',
    effectiveTo: null,
    sourceDocument: 'Kepmen LH No. 113 Tahun 2003 Lampiran',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-WW-MN',
    media: 'air_limbah',
    parameterKey: 'mn',
    parameterLabel: 'Mangan (Mn)',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: 4.0,
    basisRegulasi: 'Kepmen LH No. 113 Tahun 2003',
    approvalDocNo: 'Kepmen LH No. 113 Tahun 2003',
    decreeDate: '2003-07-10',
    effectiveFrom: '2021-01-01',
    effectiveTo: null,
    sourceDocument: 'Kepmen LH No. 113 Tahun 2003 Lampiran',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-SW-PH',
    media: 'air_permukaan',
    parameterKey: 'ph',
    parameterLabel: 'pH',
    unit: '-',
    minLimit: 6.0,
    maxLimit: 9.0,
    basisRegulasi: 'PP No. 22 Tahun 2021 Lampiran VI Kelas II',
    approvalDocNo: 'PP No. 22 Tahun 2021',
    decreeDate: '2021-02-02',
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    effectiveTo: null,
    sourceDocument: 'PP No. 22 Tahun 2021 Lampiran VI',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-SW-TSS',
    media: 'air_permukaan',
    parameterKey: 'tss',
    parameterLabel: 'TSS',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: 50,
    basisRegulasi: 'PP No. 22 Tahun 2021 Lampiran VI Kelas II',
    approvalDocNo: 'PP No. 22 Tahun 2021',
    decreeDate: '2021-02-02',
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    effectiveTo: null,
    sourceDocument: 'PP No. 22 Tahun 2021 Lampiran VI',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-SW-DO',
    media: 'air_permukaan',
    parameterKey: 'doVal',
    parameterLabel: 'DO (Oksigen Terlarut)',
    unit: 'mg/L',
    minLimit: 4.0,
    maxLimit: null,
    basisRegulasi: 'PP No. 22 Tahun 2021 Lampiran VI Kelas II',
    approvalDocNo: 'PP No. 22 Tahun 2021',
    decreeDate: '2021-02-02',
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    effectiveTo: null,
    sourceDocument: 'PP No. 22 Tahun 2021 Lampiran VI',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-SW-BOD',
    media: 'air_permukaan',
    parameterKey: 'bod',
    parameterLabel: 'BOD',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: 3.0,
    basisRegulasi: 'PP No. 22 Tahun 2021 Lampiran VI Kelas II',
    approvalDocNo: 'PP No. 22 Tahun 2021',
    decreeDate: '2021-02-02',
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    effectiveTo: null,
    sourceDocument: 'PP No. 22 Tahun 2021 Lampiran VI',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-SW-COD',
    media: 'air_permukaan',
    parameterKey: 'cod',
    parameterLabel: 'COD',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: 25.0,
    basisRegulasi: 'PP No. 22 Tahun 2021 Lampiran VI Kelas II',
    approvalDocNo: 'PP No. 22 Tahun 2021',
    decreeDate: '2021-02-02',
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    effectiveTo: null,
    sourceDocument: 'PP No. 22 Tahun 2021 Lampiran VI',
    isActive: true,
    applicable: true,
    verificationStatus: 'Terverifikasi',
    effectiveStatus: 'BERLAKU',
  },
  {
    id: 'STD-SW-FE',
    media: 'air_permukaan',
    parameterKey: 'fe',
    parameterLabel: 'Besi Terlarut (Fe)',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: null,
    basisRegulasi: 'PP No. 22 Tahun 2021 Lampiran VI (Perlu verifikasi penerapan Kelas II)',
    approvalDocNo: 'PP No. 22 Tahun 2021 (Perlu Verifikasi Kelas Badan Air)',
    decreeDate: '2021-02-02',
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    effectiveTo: null,
    sourceDocument: 'PP No. 22 Tahun 2021 Lampiran VI (catatan Kelas I/II perlu verifikasi dokumen lingkungan)',
    isActive: true,
    applicable: true,
    verificationStatus: 'Perlu verifikasi',
    effectiveStatus: 'MENUNGGU VERIFIKASI',
    notes:
      'Dalam Lampiran VI PP 22/2021 angka 0,3 mg/L lazim berlaku pada Kelas I. Verifikasi Superintendent terhadap Persetujuan Lingkungan/SK Pertek sebelum mengisi batas dan memverifikasi parameter ini.',
  },
  {
    id: 'STD-SW-MN',
    media: 'air_permukaan',
    parameterKey: 'mn',
    parameterLabel: 'Mangan Terlarut (Mn)',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: null,
    basisRegulasi: 'PP No. 22 Tahun 2021 Lampiran VI (Perlu verifikasi penerapan Kelas II)',
    approvalDocNo: 'PP No. 22 Tahun 2021 (Perlu Verifikasi Kelas Badan Air)',
    decreeDate: '2021-02-02',
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    effectiveTo: null,
    sourceDocument: 'PP No. 22 Tahun 2021 Lampiran VI (catatan Kelas I/II perlu verifikasi dokumen lingkungan)',
    isActive: true,
    applicable: true,
    verificationStatus: 'Perlu verifikasi',
    effectiveStatus: 'MENUNGGU VERIFIKASI',
    notes:
      'Dalam Lampiran VI PP 22/2021 angka 0,1 mg/L lazim berlaku pada Kelas I. Verifikasi Superintendent terhadap Persetujuan Lingkungan/SK Pertek sebelum mengisi batas dan memverifikasi parameter ini.',
  },
];

export const REGULATORY_WATCH_SEED_15: Array<Omit<RegulatoryWatchData, 'id' | 'createdAt' | 'createdBy'>> = [
  {
    source: 'Kementerian ESDM',
    issuer: 'Kementerian Energi dan Sumber Daya Mineral',
    regulationNo: 'Kepmen ESDM No. 344.K/MB.01/MEM.B/2025',
    about: 'Pedoman Teknis Pelaksanaan Reklamasi dan Pascatambang pada Kegiatan Usaha Pertambangan Mineral dan Batubara',
    issueDate: '2025-10-23',
    enactedDate: '2025-10-23',
    promulgatedDate: '',
    effectiveDate: '2025-10-23',
    implication:
      'Mempengaruhi modul Reklamasi & Jaminan: jaminan reklamasi dan jaminan pascatambang ditempatkan dalam bentuk Deposito Berjangka pada Bank Pemerintah.',
    requiredActions: 'Evaluasi kesesuaian portofolio jaminan eksisting terhadap ketentuan Deposito Bank Pemerintah & telaah irisan dengan Kepmen ESDM 1827/2018.',
    affectedModules: ['reclamation', 'guarantees', 'compliance_matrix'],
    relationNotes: 'Periksa keterkaitan dengan Lampiran VI Kepmen ESDM 1827 K/30/MEM/2018.',
    status: 'MENUNGGU VERIFIKASI',
    verificationStatus: 'Perlu verifikasi',
    officialSourceUrl: 'https://jdih.esdm.go.id/',
  },
  {
    source: 'KLH/BPLH',
    issuer: 'Kementerian Lingkungan Hidup / Badan Pengendalian Lingkungan Hidup',
    regulationNo: 'Permen LH/BPLH No. 7 Tahun 2025',
    about: 'Program Penilaian Peringkat Kinerja Perusahaan dalam Pengelolaan Lingkungan Hidup (PROPER)',
    issueDate: '',
    enactedDate: '',
    promulgatedDate: '',
    effectiveDate: '',
    implication:
      'Mempengaruhi modul PROPER & RKAB serta pemetaan peringkat Emas, Hijau, Biru, Merah, dan Hitam.',
    requiredActions: 'Verifikasi tanggal penetapan/pengundangan, naskah resmi pada JDIH KLH/BPLH, dan perbarui master kriteria PROPER oleh Superintendent.',
    affectedModules: ['proper_rkab', 'compliance_matrix'],
    revokedBy: 'Mencabut Permen LHK No. 1 Tahun 2021 (perlu verifikasi pasal pencabutan di JDIH)',
    relationNotes: 'Mencabut Permen LHK No. 1/2021. Tanggal pengundangan/berlaku tidak diasumsikan sebelum verifikasi JDIH.',
    status: 'MENUNGGU VERIFIKASI',
    verificationStatus: 'Perlu verifikasi',
    officialSourceUrl: 'https://jdih.menlhk.go.id/',
  },
  {
    source: 'Kementerian ESDM',
    issuer: 'Kementerian Energi dan Sumber Daya Mineral',
    regulationNo: 'Permen ESDM No. 17 Tahun 2025',
    about: 'Tata Cara Penyusunan, Penyampaian, dan Persetujuan RKAB Kegiatan Usaha Pertambangan Minerba',
    issueDate: '',
    enactedDate: '',
    promulgatedDate: '',
    effectiveDate: '',
    implication: 'Mempengaruhi modul PROPER & RKAB serta sinkronisasi periode RKAB tahunan melalui Minerba One.',
    requiredActions: 'Konfirmasi tanggal penetapan & pengundangan pada JDIH ESDM serta penyesuaian oleh Permen ESDM No. 6 Tahun 2026.',
    affectedModules: ['proper_rkab', 'reporting_calendar'],
    amendedBy: 'Permen ESDM No. 6 Tahun 2026',
    relationNotes: 'Menggantikan pengaturan RKAB pada Permen ESDM No. 10/2023 dan diubah dengan Permen ESDM No. 6 Tahun 2026.',
    status: 'MENUNGGU VERIFIKASI',
    verificationStatus: 'Perlu verifikasi',
    officialSourceUrl: 'https://jdih.esdm.go.id/',
  },
  {
    source: 'Kementerian ESDM',
    issuer: 'Kementerian Energi dan Sumber Daya Mineral',
    regulationNo: 'Permen ESDM No. 6 Tahun 2026',
    about: 'Perubahan atas Permen ESDM tentang Tata Cara Penyusunan, Penyampaian, dan Persetujuan RKAB Minerba',
    issueDate: '',
    enactedDate: '',
    promulgatedDate: '',
    effectiveDate: '',
    implication: 'Mempengaruhi modul PROPER & RKAB serta jadwal pelaporan lingkungan RKAB tahunan.',
    requiredActions: 'Unggah naskah resmi dan verifikasi tanggal pengundangan, judul lengkap, serta pasal perubahan dari JDIH ESDM.',
    affectedModules: ['proper_rkab', 'reporting_calendar'],
    relationNotes: 'Mengubah ketentuan pada Permen ESDM No. 17 Tahun 2025. Tanggal belum diisi untuk menghindari asumsi.',
    status: 'MENUNGGU VERIFIKASI',
    verificationStatus: 'Perlu verifikasi',
    officialSourceUrl: 'https://jdih.esdm.go.id/',
  },
  {
    source: 'Pemerintah Pusat',
    issuer: 'Presiden & DPR RI',
    regulationNo: 'UU No. 2 Tahun 2025',
    about: 'Perubahan Keempat atas UU No. 4 Tahun 2009 tentang Pertambangan Mineral dan Batubara',
    issueDate: '',
    enactedDate: '',
    promulgatedDate: '',
    effectiveDate: '',
    implication: 'Payung hukum sektor minerba terbaru yang memengaruhi perizinan, reklamasi, dan kepatuhan lingkungan.',
    requiredActions: 'Verifikasi tanggal pengundangan Lembaran Negara pada JDIH Setneg/ESDM.',
    affectedModules: ['documents', 'reclamation', 'compliance_matrix'],
    relationNotes: 'Perubahan Keempat atas UU No. 4 Tahun 2009.',
    status: 'MENUNGGU VERIFIKASI',
    verificationStatus: 'Perlu verifikasi',
    officialSourceUrl: 'https://jdih.setneg.go.id/',
  },
  {
    source: 'Pemerintah Pusat',
    issuer: 'Pemerintah Republik Indonesia',
    regulationNo: 'PP No. 28 Tahun 2025',
    about: 'Penyelenggaraan Perizinan Berusaha Berbasis Risiko (menggantikan PP No. 5 Tahun 2021)',
    issueDate: '2025-06-05',
    enactedDate: '2025-06-05',
    promulgatedDate: '2025-06-05',
    effectiveDate: '2025-06-05',
    implication: 'Mempengaruhi modul Persetujuan Lingkungan & Perizinan OSS serta registrasi Pertek/SLO.',
    requiredActions: 'Audit kesesuaian KBLI, NIB, Persetujuan Lingkungan, dan Pertek pada sistem OSS-RBA terbaru.',
    affectedModules: ['documents', 'pertek_slo'],
    relationNotes: 'Menggantikan PP No. 5 Tahun 2021.',
    status: 'MENUNGGU VERIFIKASI',
    verificationStatus: 'Perlu verifikasi',
    officialSourceUrl: 'https://jdih.setneg.go.id/',
  },
  {
    source: 'KLH/BPLH',
    issuer: 'Kementerian Lingkungan Hidup / Badan Pengendalian Lingkungan Hidup',
    regulationNo: 'Permen LH/BPLH No. 22 Tahun 2025',
    about: 'Pengaturan teknis Persetujuan Lingkungan / standar lingkungan hidup di bawah KLH/BPLH (judul & nomor wajib verifikasi)',
    issueDate: '',
    enactedDate: '',
    promulgatedDate: '',
    effectiveDate: '',
    implication: 'Berpotensi mempengaruhi modul Dokumen & Izin Lingkungan serta Pertek/SLO.',
    requiredActions: 'Wajib verifikasi nomor, judul lengkap resmi, tanggal pengundangan, dan substansi melalui JDIH KLH/BPLH sebelum ditetapkan BERLAKU.',
    affectedModules: ['documents', 'pertek_slo', 'iadl_risk'],
    relationNotes: 'Entri bertanda MENUNGGU VERIFIKASI karena judul resmi dan tanggal pengundangan perlu dikonfirmasi pada JDIH KLH/BPLH.',
    status: 'MENUNGGU VERIFIKASI',
    verificationStatus: 'Perlu verifikasi',
    officialSourceUrl: 'https://jdih.menlhk.go.id/',
  },
  {
    source: 'Pemerintah Pusat',
    issuer: 'Presiden & DPR RI',
    regulationNo: 'UU No. 32 Tahun 2024',
    about: 'Perubahan atas UU No. 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya',
    issueDate: '2024-08-07',
    enactedDate: '2024-08-07',
    promulgatedDate: '2024-08-07',
    effectiveDate: '2024-08-07',
    implication: 'Mempengaruhi modul Keanekaragaman Hayati & Pembibitan terkait perlindungan flora/fauna dan koridor satwa di area IUP.',
    requiredActions: 'Perbarui daftar pemantauan spesies prioritas sesuai ketentuan konservasi terbaru.',
    affectedModules: ['biodiversity', 'nursery'],
    status: 'BERLAKU',
    verificationStatus: 'Terverifikasi',
    officialSourceUrl: 'https://jdih.setneg.go.id/',
  },
  {
    source: 'KLH/BPLH',
    issuer: 'Kementerian Lingkungan Hidup dan Kehutanan',
    regulationNo: 'Permen LHK No. P.106/MENLHK/SETJEN/KUM.1/12/2018',
    about: 'Perubahan Kedua atas Permen LHK No. P.20/2018 tentang Jenis Tumbuhan dan Satwa yang Dilindungi',
    issueDate: '2018-12-28',
    enactedDate: '2018-12-28',
    promulgatedDate: '2018-12-28',
    effectiveDate: '2018-12-28',
    implication: 'Mempengaruhi modul Keanekaragaman Hayati untuk klasifikasi spesies dilindungi.',
    requiredActions: 'Gunakan daftar lampiran P.106/2018 sebagai dasar klasifikasi status perlindungan spesies.',
    affectedModules: ['biodiversity'],
    status: 'BERLAKU',
    verificationStatus: 'Terverifikasi',
    officialSourceUrl: 'https://jdih.menlhk.go.id/',
  },
  {
    source: 'Pemerintah Pusat',
    issuer: 'Pemerintah Republik Indonesia',
    regulationNo: 'PP No. 22 Tahun 2021',
    about: 'Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup (Lampiran VI, VII, IX)',
    issueDate: '2021-02-02',
    enactedDate: '2021-02-02',
    promulgatedDate: '2021-02-02',
    effectiveDate: '2021-02-02',
    implication: 'Mempengaruhi modul Pemantauan Kualitas Air (Air Permukaan), Udara & Emisi, serta Pengelolaan Limbah B3 (daftar kode limbah).',
    requiredActions: 'Pastikan parameter uji air permukaan, udara ambien, dan kode limbah B3 sinkron dengan Lampiran VI, VII, IX.',
    affectedModules: ['monitoring', 'air_emission', 'waste'],
    status: 'BERLAKU',
    verificationStatus: 'Terverifikasi',
    officialSourceUrl: 'https://jdih.setneg.go.id/',
  },
  {
    source: 'KLH/BPLH',
    issuer: 'Kementerian Lingkungan Hidup dan Kehutanan',
    regulationNo: 'Permen LHK No. 6 Tahun 2021',
    about: 'Tata Cara dan Persyaratan Pengelolaan Limbah Bahan Berbahaya dan Beracun',
    issueDate: '2021-04-01',
    enactedDate: '2021-04-01',
    promulgatedDate: '2021-04-01',
    effectiveDate: '2021-04-01',
    implication: 'Mempengaruhi modul Limbah B3 (TPS, masa simpan 90/180/365 hari, dan pelaporan manifest elektronik).',
    requiredActions: 'Verifikasi masa simpan setiap jenis limbah terhadap rincian teknis TPS LB3 PT DKB.',
    affectedModules: ['waste', 'pertek_slo'],
    status: 'BERLAKU',
    verificationStatus: 'Terverifikasi',
    officialSourceUrl: 'https://jdih.menlhk.go.id/',
  },
  {
    source: 'KLH/BPLH',
    issuer: 'Kementerian Lingkungan Hidup dan Kehutanan',
    regulationNo: 'Permen LHK No. 19 Tahun 2021',
    about: 'Tata Cara Pengelolaan Limbah Nonbahan Berbahaya dan Beracun (Limbah Non-B3)',
    issueDate: '2021-10-22',
    enactedDate: '2021-10-22',
    promulgatedDate: '2021-10-22',
    effectiveDate: '2021-10-22',
    implication: 'Mempengaruhi modul Sampah Non-B3 & Limbah Non-B3 bersama UU No. 18/2008 dan PP No. 81/2012.',
    requiredActions: 'Lakukan pencatatan timbulan, pemilahan, dan pengangkutan limbah non-B3 secara berkala.',
    affectedModules: ['solid_waste'],
    status: 'BERLAKU',
    verificationStatus: 'Terverifikasi',
    officialSourceUrl: 'https://jdih.menlhk.go.id/',
  },
  {
    source: 'KLH/BPLH',
    issuer: 'Kementerian Lingkungan Hidup',
    regulationNo: 'Kepmen LH No. 113 Tahun 2003',
    about: 'Baku Mutu Air Limbah bagi Usaha dan/atau Kegiatan Pertambangan Batubara',
    issueDate: '2003-07-10',
    enactedDate: '2003-07-10',
    promulgatedDate: '2003-07-10',
    effectiveDate: '2003-07-10',
    implication: 'Mempengaruhi modul Kualitas Air Limbah KPL dan Evidence Harian/Bulanan (parameter pH, Fe, Mn, serta sinkronisasi TSS Pertek PT DKB).',
    requiredActions: 'Sandingkan batas nasional dengan SK Pertek BMAL PT DKB terbaru No. 600.4/865/B.III.2/DLH/2025.',
    affectedModules: ['monitoring', 'evidence_hub', 'standards'],
    status: 'BERLAKU',
    verificationStatus: 'Terverifikasi',
    officialSourceUrl: 'https://jdih.menlhk.go.id/',
  },
  {
    source: 'Kementerian ESDM',
    issuer: 'Kementerian Energi dan Sumber Daya Mineral',
    regulationNo: 'Kepmen ESDM No. 1827 K/30/MEM/2018',
    about: 'Pedoman Pelaksanaan Kaidah Teknik Pertambangan yang Baik',
    issueDate: '2018-05-07',
    enactedDate: '2018-05-07',
    promulgatedDate: '2018-05-07',
    effectiveDate: '2018-05-07',
    implication: 'Mempengaruhi modul Topsoil & Erosi, Air Asam Tambang, dan Reklamasi (periksa irisan teknis reklamasi terhadap Kepmen ESDM 344.K/2025).',
    requiredActions: 'Lakukan kajian irisan teknis antara Lampiran VI 1827/2018 dan Kepmen ESDM 344.K/2025.',
    affectedModules: ['topsoil', 'amd_treatment', 'reclamation'],
    status: 'BERLAKU',
    verificationStatus: 'Terverifikasi',
    officialSourceUrl: 'https://jdih.esdm.go.id/',
  },
  {
    source: 'Pemprov Kaltim',
    issuer: 'Pemerintah Provinsi Kalimantan Timur',
    regulationNo: 'Perda Provinsi Kalimantan Timur No. 2 Tahun 2011',
    about: 'Pengelolaan Kualitas Air dan Pengendalian Pencemaran Air di Provinsi Kalimantan Timur',
    issueDate: '2011-04-01',
    enactedDate: '2011-04-01',
    promulgatedDate: '2011-04-01',
    effectiveDate: '2011-04-01',
    implication: 'Dasar lokal pengendalian pencemaran air Kalimantan Timur untuk pembanding ambang TSS SK Pertek PT DKB.',
    requiredActions: 'Konfirmasi pemberlakuan TSS pada SK Pertek BMAL PT DKB No. 600.4/865/B.III.2/DLH/2025 terhadap ketentuan daerah terkini.',
    affectedModules: ['monitoring', 'standards'],
    status: 'BERLAKU',
    verificationStatus: 'Terverifikasi',
  },
];

export function formatConservationStatus(status?: string | null): string {
  if (!status) return '-';
  if (status === 'Dilindungi (PP 106/2018)') {
    return 'Dilindungi (Permen LHK P.106/2018)';
  }
  return status;
}

export function isProtectedConservationStatus(status?: string | null): boolean {
  return (
    status === 'Dilindungi (Permen LHK P.106/2018)' ||
    status === 'Dilindungi (PP 106/2018)' ||
    status === 'IUCN Threatened'
  );
}

export type StandardEvaluationOptions = Partial<EvaluateSampleOptions>;

export function resolveActiveStandards(
  standards: EnvironmentalStandard[] | undefined,
  media: StandardMedia,
  opts?: { locationCode?: string; sampleDate?: string; kelasAir?: 'I' | 'II' | 'III' | 'IV'; standardId?: string | null }
): Record<string, EnvironmentalStandard> {
  const effectiveList = standards !== undefined ? standards : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);
  return resolveEffectiveStandardsMap(effectiveList, media, opts);
}

/**
 * Evaluasi satu parameter air limbah melalui engine tunggal `evaluateSampleCompliance`.
 */
export function evaluateParam(
  key: string,
  value: unknown,
  options?: StandardEvaluationOptions
) {
  const standards = options?.standards !== undefined
    ? options.standards
    : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);
  const res = evaluateSampleCompliance(
    'air_limbah',
    { [key]: value },
    {
      standards,
      thresholds: options?.thresholds,
      locationCode: options?.locationCode,
      sampleDate: options?.sampleDate,
      standardId: options?.standardId,
      unitMap: options?.unitMap,
    }
  );
  return res.params[key]?.status ?? 'belum_dievaluasi';
}

export function evaluateWastewaterStatus(
  ph: unknown,
  tss: unknown,
  debit: unknown,
  fe: unknown,
  mn: unknown,
  options?: StandardEvaluationOptions
) {
  const standards = options?.standards !== undefined
    ? options.standards
    : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);
  const res = evaluateSampleCompliance(
    'air_limbah',
    { ph, tss, debit, fe, mn },
    {
      standards,
      thresholds: options?.thresholds,
      locationCode: options?.locationCode,
      sampleDate: options?.sampleDate,
      standardId: options?.standardId,
      unitMap: options?.unitMap,
    }
  );
  return res.legacyStatus;
}

export function evaluateSurfaceWaterParam(
  key: 'ph' | 'tss' | 'doVal' | 'bod' | 'cod' | 'fe' | 'mn',
  value: unknown,
  options?: StandardEvaluationOptions
) {
  const standards = options?.standards !== undefined
    ? options.standards
    : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);
  const res = evaluateSampleCompliance(
    'air_permukaan',
    { [key]: value },
    {
      standards,
      thresholds: options?.thresholds,
      locationCode: options?.locationCode,
      sampleDate: options?.sampleDate,
      kelasAir: options?.kelasAir ?? 'II',
      standardId: options?.standardId,
      unitMap: options?.unitMap,
    }
  );
  const detail = res.params[key];
  return {
    result: detail?.status ?? 'belum_dievaluasi',
    verificationStatus: detail?.standard?.verificationStatus ?? 'Perlu verifikasi',
    standard: detail?.standard,
  };
}

export function evaluateSurfaceWaterStatus(
  ph: unknown,
  tss: unknown,
  doVal: unknown,
  bod: unknown,
  cod: unknown,
  fe: unknown,
  mn: unknown,
  options?: StandardEvaluationOptions
) {
  const standards = options?.standards !== undefined
    ? options.standards
    : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);
  const res = evaluateSampleCompliance(
    'air_permukaan',
    { ph, tss, doVal, bod, cod, fe, mn },
    {
      standards,
      thresholds: options?.thresholds,
      locationCode: options?.locationCode,
      sampleDate: options?.sampleDate,
      kelasAir: options?.kelasAir ?? 'II',
      standardId: options?.standardId,
      unitMap: options?.unitMap,
    }
  );
  return res.legacyStatus;
}
