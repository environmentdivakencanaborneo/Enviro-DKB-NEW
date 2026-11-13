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

export interface RegulationParam {
  name: string;
  unit: string;
  limit: string;
  numericLimit: number;
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
    id: "PP-22-2021",
    title: "PP No. 22 Tahun 2021 (Lampiran VI, VII, IX)",
    category: "Air Permukaan, Udara Ambien & Limbah B3",
    description: "Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup. Lampiran VI mengatur Baku Mutu Air Nasional (Kelas I–IV); Lampiran VII mengatur Baku Mutu Udara Ambien; Lampiran IX mengatur Daftar Limbah B3. Parameter Besi Terlarut (0,3 mg/L) & Mangan Terlarut (0,1 mg/L) pada Kelas II bersifat informatif / perlu verifikasi teknis izin badan air penerima sebelum dipakai sebagai pelanggaran.",
    parameters: [
      { name: "pH", unit: "", limit: "6.0 - 9.0", numericLimit: 9.0, comparison: "range", minLimit: 6.0 },
      { name: "TSS", unit: "mg/L", limit: "Maks 50", numericLimit: 50, comparison: "max" },
      { name: "DO", unit: "mg/L", limit: "Min 4", numericLimit: 4, comparison: "min" },
      { name: "BOD", unit: "mg/L", limit: "Maks 3", numericLimit: 3, comparison: "max" },
      { name: "COD", unit: "mg/L", limit: "Maks 25", numericLimit: 25, comparison: "max" },
      { name: "Besi Terlarut (Perlu verifikasi)", unit: "mg/L", limit: "0.3 (Perlu verifikasi)", numericLimit: 0.3, comparison: "max" },
      { name: "Mangan Terlarut (Perlu verifikasi)", unit: "mg/L", limit: "0.1 (Perlu verifikasi)", numericLimit: 0.1, comparison: "max" }
    ]
  },
  {
    id: "KepmenLH-113-2003",
    title: "Baku Mutu Air Limbah Tambang Batubara (SK Pertek PT DKB)",
    category: "Air Limbah Tambang Batubara",
    description: "pH, Fe, dan Mn mengacu Kepmen LH No. 113 Tahun 2003 tentang Baku Mutu Air Limbah bagi Usaha dan/atau Kegiatan Pertambangan Batubara. TSS mengacu SK Pertek Air Limbah PT DKB No. 503/IPAL-LH/DPM-PTSP/2021, yang menetapkan ambang TSS sesuai Perda Provinsi Kalimantan Timur No. 2 Tahun 2011.",
    parameters: [
      { name: "pH", unit: "", limit: "6.0 - 9.0", numericLimit: 9.0, comparison: "range", minLimit: 6.0 },
      { name: "TSS", unit: "mg/L", limit: "Maks 300", numericLimit: 300, comparison: "max" },
      { name: "Besi (Fe)", unit: "mg/L", limit: "Maks 7.0", numericLimit: 7.0, comparison: "max" },
      { name: "Mangan (Mn)", unit: "mg/L", limit: "Maks 4.0", numericLimit: 4.0, comparison: "max" },
      { name: "Debit", unit: "m³/s", limit: "Pantau (Monitoring)", numericLimit: 999999, comparison: "max" }
    ]
  },
  {
    id: "PermenLHK-6-2021",
    title: "Permen LHK No. 6 Tahun 2021 & Lampiran IX PP 22/2021",
    category: "Limbah B3",
    description: "Tata Cara dan Persyaratan Pengelolaan Limbah Bahan Berbahaya dan Beracun, termasuk standarisasi penyimpanan TPS dan kode limbah berdasarkan Lampiran IX PP No. 22 Tahun 2021 jo. Permen LHK No. 6 Tahun 2021.",
    parameters: [
      { name: "Masa Simpan Maksimal", unit: "Hari", limit: "Maks 90/180/365 Hari", numericLimit: 90, comparison: "max" }
    ]
  },
  {
    id: "UU-18-2008",
    title: "UU No. 18 Tahun 2008; PP No. 81 Tahun 2012; Permen LHK No. 19 Tahun 2021",
    category: "Pengelolaan Sampah & Limbah Non-B3",
    description: "Dasar pengelolaan sampah domestik/sejenis sampah rumah tangga dan pengelolaan limbah non-B3 terdaftar/khusus. Target pemilahan/pengolahan dalam aplikasi merupakan KPI internal perusahaan (mengacu arah Jakstranas; perlu penetapan manajemen).",
    parameters: []
  },
  {
    id: "PermenLH-7-2025",
    title: "Permen LH/BPLH No. 7 Tahun 2025",
    category: "PROPER",
    description: "Program Penilaian Peringkat Kinerja Perusahaan dalam Pengelolaan Lingkungan Hidup (mencabut Permen LHK No. 1 Tahun 2021). Mencakup peringkat ketaatan Emas, Hijau, Biru, Merah, dan Hitam.",
    parameters: []
  },
  {
    id: "PermenESDM-17-2025",
    title: "Permen ESDM No. 17 Tahun 2025 jo. Permen ESDM No. 6 Tahun 2026",
    category: "RKAB Pertambangan",
    description: "Tata Cara Penyusunan, Penyampaian, dan Persetujuan Rencana Kerja dan Anggaran Biaya (RKAB) Pertambangan Minerba secara tahunan melalui sistem Minerba One (menggantikan rezim RKAB multi-tahun Permen ESDM No. 10/2023).",
    parameters: []
  },
  {
    id: "KepmenESDM-344-2025",
    title: "Kepmen ESDM No. 344.K/MB.01/MEM.B/2025",
    category: "Reklamasi & Pascatambang",
    description: "Pedoman Teknis Pelaksanaan Reklamasi dan Pascatambang pada Kegiatan Usaha Pertambangan Mineral dan Batubara (berlaku 23 Oktober 2025), termasuk ketentuan penempatan Jaminan Reklamasi dan Jaminan Pascatambang dalam bentuk Deposito Berjangka pada Bank Pemerintah.",
    parameters: [
      { name: "Bentuk Jaminan Baru", unit: "Instrumen", limit: "Deposito Berjangka (Bank Pemerintah)", numericLimit: 100, comparison: "max" }
    ]
  },
  {
    id: "KepmenESDM-1827-2018",
    title: "Kepmen ESDM No. 1827 K/30/MEM/2018 & Permen ESDM No. 26 Tahun 2018",
    category: "Kaidah Pertambangan Baik (Good Mining Practice)",
    description: "Pelaksanaan Kaidah Pertambangan yang Baik dan Pengawasan Pertambangan Mineral dan Batubara. Catatan sinkronisasi: Periksa irisan ketentuan reklamasi & pascatambang dengan Kepmen ESDM No. 344.K/MB.01/MEM.B/2025.",
    parameters: []
  },
  {
    id: "PP-28-2025",
    title: "PP No. 28 Tahun 2025 & Permen LH/BPLH No. 22 Tahun 2025",
    category: "Perizinan Berusaha & Persetujuan Lingkungan",
    description: "Penyelenggaraan Perizinan Berusaha Berbasis Risiko (berlaku 5 Juni 2025, menggantikan PP No. 5 Tahun 2021) dan sinkronisasi Persetujuan Lingkungan/Pertek di bawah KLH/BPLH.",
    parameters: []
  },
  {
    id: "UU-2-2025",
    title: "UU No. 4 Tahun 2009 jo. UU No. 2 Tahun 2025 (Perubahan Keempat)",
    category: "Pertambangan Minerba",
    description: "Kerangka hukum terkini pertambangan mineral dan batubara Indonesia sebagaimana diubah terakhir dengan UU No. 2 Tahun 2025 tentang Perubahan Keempat atas UU No. 4 Tahun 2009.",
    parameters: []
  },
  {
    id: "UU-3-2020",
    title: "UU No. 3 Tahun 2020 (Rujukan Historis)",
    category: "Pertambangan Minerba (Historis)",
    description: "Perubahan atas UU No. 4 Tahun 2009 (rujukan historis sebelum UU No. 2 Tahun 2025). Kewajiban reklamasi & perlindungan lingkungan pertambangan tetap relevan sepanjang tidak diubah ketentuan terbaru.",
    parameters: []
  }
];

export const WASTEWATER_STANDARDS = [
  { key: 'ph',    label: 'pH',          unit: '-',    min: 6,    max: 9,    display: '6,0 – 9,0',       decimals: { min: 1, max: 2 } },
  { key: 'tss',   label: 'TSS',         unit: 'mg/L', min: null, max: 300,  display: '300',            decimals: { min: 0, max: 1 } },
  { key: 'debit', label: 'Debit',       unit: 'm³/s', min: null, max: null, display: 'Bebas / Pantau', decimals: { min: 1, max: 3 } },
  { key: 'fe',    label: 'Besi (Fe)',   unit: 'mg/L', min: null, max: 7,    display: '7,0',            decimals: { min: 1, max: 3 } },
  { key: 'mn',    label: 'Mangan (Mn)', unit: 'mg/L', min: null, max: 4,    display: '4,0',            decimals: { min: 1, max: 3 } },
] as const;

export const WASTEWATER_BASIS_LABEL = 'Kepmen LH No. 113 Tahun 2003 dan SK Pertek Air Limbah PT DKB No. 503/IPAL-LH/DPM-PTSP/2021';
export const SURFACE_WATER_BASIS_LABEL = 'PP No. 22 Tahun 2021 Lampiran VI (Air Permukaan Kelas II)';
export const WARNING_RATIO = 0.85;

export const DEFAULT_INTERNAL_THRESHOLDS: InternalThresholdsConfig = {
  id: 'env_thresholds',
  warningRatio: 0.85,
  phMargin: 0.3,
  solidWasteTargetPct: 30,
};

export const DEFAULT_PROPER_CRITERIA: ProperCriteriaMaster = {
  id: 'proper_criteria',
  regulationBasis: 'Permen LH/BPLH No. 7 Tahun 2025 tentang Program Penilaian Peringkat Kinerja Pengelolaan Lingkungan Hidup',
  criteria: [],
};

export const INITIAL_STANDARDS_SEED: Omit<EnvironmentalStandard, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>[] = [
  {
    id: 'STD-WW-PH',
    media: 'air_limbah',
    parameterKey: 'ph',
    parameterLabel: 'pH',
    unit: '-',
    minLimit: 6.0,
    maxLimit: 9.0,
    basisRegulasi: 'Kepmen LH No. 113 Tahun 2003',
    effectiveFrom: '2021-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
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
    effectiveFrom: '2021-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
    notes: 'Batas maksimum TSS sesuai SK Pertek PT DKB.',
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
    effectiveFrom: '2021-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
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
    effectiveFrom: '2021-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
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
    effectiveFrom: '2021-01-01',
    isActive: true,
    verificationStatus: 'Terverifikasi',
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
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    isActive: true,
    verificationStatus: 'Terverifikasi',
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
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    isActive: true,
    verificationStatus: 'Terverifikasi',
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
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    isActive: true,
    verificationStatus: 'Terverifikasi',
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
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    isActive: true,
    verificationStatus: 'Terverifikasi',
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
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    isActive: true,
    verificationStatus: 'Terverifikasi',
  },
  {
    id: 'STD-SW-FE',
    media: 'air_permukaan',
    parameterKey: 'fe',
    parameterLabel: 'Besi Terlarut (Fe)',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: 0.3,
    basisRegulasi: 'PP No. 22 Tahun 2021 Lampiran VI (Perlu verifikasi penerapan Kelas II)',
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    isActive: true,
    verificationStatus: 'Perlu verifikasi',
    notes: 'Tanda informatif sebelum diverifikasi Superintendent terhadap dokumen Persetujuan Lingkungan/Lampiran VI PP 22/2021.',
  },
  {
    id: 'STD-SW-MN',
    media: 'air_permukaan',
    parameterKey: 'mn',
    parameterLabel: 'Mangan Terlarut (Mn)',
    unit: 'mg/L',
    minLimit: null,
    maxLimit: 0.1,
    basisRegulasi: 'PP No. 22 Tahun 2021 Lampiran VI (Perlu verifikasi penerapan Kelas II)',
    kelasAir: 'II',
    effectiveFrom: '2021-02-02',
    isActive: true,
    verificationStatus: 'Perlu verifikasi',
    notes: 'Tanda informatif sebelum diverifikasi Superintendent terhadap dokumen Persetujuan Lingkungan/Lampiran VI PP 22/2021.',
  },
];

export const REGULATORY_WATCH_SEED_15: Array<Omit<RegulatoryWatchData, 'id' | 'createdAt' | 'createdBy'>> = [
  {
    source: 'Kementerian ESDM',
    regulationNo: 'Kepmen ESDM No. 344.K/MB.01/MEM.B/2025',
    about: 'Pedoman Teknis Pelaksanaan Reklamasi dan Pascatambang pada Kegiatan Usaha Pertambangan Mineral dan Batubara',
    issueDate: '2025-10-23',
    implication: 'Mempengaruhi modul Reklamasi & Jaminan: jaminan reklamasi dan jaminan pascatambang ditempatkan dalam bentuk Deposito Berjangka pada Bank Pemerintah.',
    status: 'Perlu Kajian',
  },
  {
    source: 'KLH/BPLH',
    regulationNo: 'Permen LH/BPLH No. 7 Tahun 2025',
    about: 'Program Penilaian Peringkat Kinerja Pengelolaan Lingkungan Hidup (PROPER) — mencabut Permen LHK No. 1/2021',
    issueDate: '2025-07-01',
    implication: 'Mempengaruhi modul PROPER & RKAB (peringkat Emas, Hijau, Biru, Merah, Hitam serta penyesuaian kriteria penilaian oleh Superintendent).',
    status: 'Perlu Kajian',
  },
  {
    source: 'Kementerian ESDM',
    regulationNo: 'Permen ESDM No. 17 Tahun 2025',
    about: 'Tata Cara Penyusunan, Penyampaian, dan Persetujuan RKAB Kegiatan Usaha Pertambangan Minerba melalui Minerba One',
    issueDate: '2025-09-01',
    implication: 'Mempengaruhi modul PROPER & RKAB serta Rencana Reklamasi/Pemantauan tahunan: periode RKAB kembali tahunan (1 tahun).',
    status: 'Perlu Kajian',
  },
  {
    source: 'Kementerian ESDM',
    regulationNo: 'Permen ESDM No. 6 Tahun 2026',
    about: 'Perubahan atas Permen ESDM No. 17 Tahun 2025 tentang Penyusunan, Penyampaian, dan Persetujuan RKAB Minerba',
    issueDate: '2026-03-01',
    implication: 'Mempengaruhi modul PROPER & RKAB: penyesuaian ketentuan evaluasi dan pelaporan RKAB tahunan.',
    status: 'Perlu Kajian',
  },
  {
    source: 'Pemerintah Pusat',
    regulationNo: 'UU No. 2 Tahun 2025',
    about: 'Perubahan Keempat atas UU No. 4 Tahun 2009 tentang Pertambangan Mineral dan Batubara',
    issueDate: '2025-02-01',
    implication: 'Mempengaruhi modul Izin & Dokumen, Reklamasi, dan Matriks Kepatuhan sebagai payung hukum utama sektor minerba.',
    status: 'Perlu Kajian',
  },
  {
    source: 'Pemerintah Pusat',
    regulationNo: 'PP No. 28 Tahun 2025',
    about: 'Penyelenggaraan Perizinan Berusaha Berbasis Risiko (menggantikan PP No. 5 Tahun 2021)',
    issueDate: '2025-06-05',
    implication: 'Mempengaruhi modul Dokumen & Izin Lingkungan (Persetujuan Lingkungan, Pertek Air Limbah/Emisi, Izin TPS B3).',
    status: 'Perlu Kajian',
  },
  {
    source: 'KLH/BPLH',
    regulationNo: 'Permen LH/BPLH No. 22 Tahun 2025',
    about: 'Pedoman Teknis Persetujuan Lingkungan dan Penapisan Usaha/Kegiatan di bawah KLH/BPLH',
    issueDate: '2025-08-01',
    implication: 'Mempengaruhi modul Dokumen & Izin Lingkungan serta IADL Risiko Lingkungan terkait persyaratan AMDAL/UKL-UPL & Pertek.',
    status: 'Perlu Kajian',
  },
  {
    source: 'Pemerintah Pusat',
    regulationNo: 'UU No. 32 Tahun 2024',
    about: 'Perubahan atas UU No. 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya',
    issueDate: '2024-08-07',
    implication: 'Mempengaruhi modul Keanekaragaman Hayati & Pembibitan terkait perlindungan flora/fauna dan koridor satwa di area IUP.',
    status: 'Perlu Kajian',
  },
  {
    source: 'KLH/BPLH',
    regulationNo: 'Permen LHK No. P.106/MENLHK/SETJEN/KUM.1/12/2018',
    about: 'Perubahan Kedua atas Permen LHK No. P.20/2018 tentang Jenis Tumbuhan dan Satwa yang Dilindungi',
    issueDate: '2018-12-28',
    implication: 'Mempengaruhi modul Keanekaragaman Hayati untuk klasifikasi spesies dilindungi (memperbaiki rujukan yang keliru ke PP 106/2018).',
    status: 'Perlu Kajian',
  },
  {
    source: 'Pemerintah Pusat',
    regulationNo: 'PP No. 22 Tahun 2021',
    about: 'Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup (Lampiran VI, VII, IX)',
    issueDate: '2021-02-02',
    implication: 'Mempengaruhi modul Pemantauan Kualitas Air (Air Permukaan), Udara & Emisi, serta Pengelolaan Limbah B3 (daftar kode limbah).',
    status: 'Perlu Kajian',
  },
  {
    source: 'KLH/BPLH',
    regulationNo: 'Permen LHK No. 6 Tahun 2021',
    about: 'Tata Cara dan Persyaratan Pengelolaan Limbah Bahan Berbahaya dan Beracun',
    issueDate: '2021-04-01',
    implication: 'Mempengaruhi modul Limbah B3 (TPS, masa simpan 90/180/365 hari, dan pelaporan manifest elektronik).',
    status: 'Perlu Kajian',
  },
  {
    source: 'KLH/BPLH',
    regulationNo: 'Permen LHK No. 19 Tahun 2021',
    about: 'Tata Cara Pengelolaan Limbah Nonbahan Berbahaya dan Beracun (Limbah Non-B3)',
    issueDate: '2021-10-22',
    implication: 'Mempengaruhi modul Sampah Non-B3 & Limbah Non-B3 bersama UU No. 18/2008 dan PP No. 81/2012.',
    status: 'Perlu Kajian',
  },
  {
    source: 'KLH/BPLH',
    regulationNo: 'Kepmen LH No. 113 Tahun 2003',
    about: 'Baku Mutu Air Limbah bagi Usaha dan/atau Kegiatan Pertambangan Batubara',
    issueDate: '2003-07-10',
    implication: 'Mempengaruhi modul Kualitas Air Limbah KPL dan Evidence Harian/Bulanan (parameter pH, Fe, Mn, serta TSS Pertek).',
    status: 'Perlu Kajian',
  },
  {
    source: 'Kementerian ESDM',
    regulationNo: 'Kepmen ESDM No. 1827 K/30/MEM/2018',
    about: 'Pedoman Pelaksanaan Kaidah Teknik Pertambangan yang Baik',
    issueDate: '2018-05-07',
    implication: 'Mempengaruhi modul Topsoil & Erosi, Air Asam Tambang, dan Reklamasi (periksa irisan teknis reklamasi terhadap Kepmen ESDM 344.K/2025).',
    status: 'Perlu Kajian',
  },
  {
    source: 'Pemprov Kaltim',
    regulationNo: 'Perda Provinsi Kalimantan Timur No. 2 Tahun 2011',
    about: 'Pengelolaan Kualitas Air dan Pengendalian Pencemaran Air di Provinsi Kalimantan Timur',
    issueDate: '2011-04-01',
    implication: 'Mempengaruhi modul Kualitas Air Limbah (dasar lokal ambang TSS pada SK Pertek Air Limbah PT DKB).',
    status: 'Perlu Kajian',
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

export interface StandardEvaluationOptions {
  standards?: EnvironmentalStandard[];
  thresholds?: InternalThresholdsConfig;
  locationCode?: string;
  sampleDate?: string;
  kelasAir?: 'I' | 'II' | 'III' | 'IV';
}

export function resolveActiveStandards(
  standards: EnvironmentalStandard[] | undefined,
  media: StandardMedia,
  opts?: { locationCode?: string; sampleDate?: string; kelasAir?: 'I' | 'II' | 'III' | 'IV' }
): Record<string, EnvironmentalStandard> {
  const result: Record<string, EnvironmentalStandard> = {};
  const list = (standards && standards.length > 0)
    ? standards
    : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);

  const relevant = list.filter((s) => s.media === media && s.isActive);

  for (const std of relevant) {
    if (std.effectiveFrom && opts?.sampleDate && std.effectiveFrom > opts.sampleDate) {
      continue;
    }
    const existing = result[std.parameterKey];
    const locMatches = Boolean(std.locationCode && opts?.locationCode && std.locationCode.toUpperCase() === opts.locationCode.toUpperCase());
    const classMatches = Boolean(std.kelasAir && opts?.kelasAir && std.kelasAir === opts.kelasAir);
    if (std.locationCode && (!opts?.locationCode || !locMatches)) {
      continue;
    }
    if (!existing) {
      result[std.parameterKey] = std;
    } else {
      const existingLocScore = existing.locationCode ? 2 : 0;
      const existingClassScore = existing.kelasAir && opts?.kelasAir && existing.kelasAir === opts.kelasAir ? 1 : 0;
      const candidateScore = (locMatches ? 2 : 0) + (classMatches ? 1 : 0);
      if (candidateScore >= existingLocScore + existingClassScore) {
        result[std.parameterKey] = std;
      }
    }
  }
  return result;
}

function evaluateLimitPair(
  value: number,
  minLimit: number | null | undefined,
  maxLimit: number | null | undefined,
  thresholds: InternalThresholdsConfig
): 'memenuhi' | 'mendekati' | 'tidak_memenuhi' | 'dipantau' {
  const hasMin = typeof minLimit === 'number' && !isNaN(minLimit);
  const hasMax = typeof maxLimit === 'number' && !isNaN(maxLimit);

  if (!hasMin && !hasMax) {
    return 'dipantau';
  }

  const warningRatio = thresholds.warningRatio ?? 0.85;
  const phMargin = thresholds.phMargin ?? 0.3;

  if (hasMin && hasMax) {
    if (value < (minLimit as number) || value > (maxLimit as number)) {
      return 'tidak_memenuhi';
    }
    if (value < (minLimit as number) + phMargin || value > (maxLimit as number) - phMargin) {
      return 'mendekati';
    }
    return 'memenuhi';
  }

  if (hasMax) {
    if (value > (maxLimit as number)) {
      return 'tidak_memenuhi';
    }
    if (value > (maxLimit as number) * warningRatio) {
      return 'mendekati';
    }
    return 'memenuhi';
  }

  if (hasMin) {
    if (value < (minLimit as number)) {
      return 'tidak_memenuhi';
    }
    if (value < (minLimit as number) + ((minLimit as number) * (1 - warningRatio))) {
      return 'mendekati';
    }
    return 'memenuhi';
  }

  return 'dipantau';
}

/**
 * Evaluasi parameter air limbah terhadap baku mutu dinamis (koleksi standards/{id}, fallback WASTEWATER_STANDARDS).
 * Batas bersifat INKLUSIF (nilai tepat sama dengan batas = memenuhi).
 * Parameter dengan min=null dan max=null (Debit) berstatus 'dipantau'.
 */
export function evaluateParam(
  key: string,
  value: number,
  options?: StandardEvaluationOptions
): 'memenuhi' | 'mendekati' | 'tidak_memenuhi' | 'dipantau' {
  const thresholds = options?.thresholds ?? DEFAULT_INTERNAL_THRESHOLDS;
  const activeMap = resolveActiveStandards(options?.standards, 'air_limbah', {
    locationCode: options?.locationCode,
    sampleDate: options?.sampleDate,
  });
  const dynStd = activeMap[key];
  if (dynStd) {
    if (dynStd.verificationStatus === 'Perlu verifikasi') {
      return 'dipantau';
    }
    return evaluateLimitPair(value, dynStd.minLimit, dynStd.maxLimit, thresholds);
  }

  const std = WASTEWATER_STANDARDS.find(s => s.key === key);
  if (!std || (std.min === null && std.max === null)) {
    return 'dipantau';
  }
  return evaluateLimitPair(value, std.min, std.max, thresholds);
}

export function evaluateWastewaterStatus(
  ph: number,
  tss: number,
  debit: number,
  fe: number,
  mn: number,
  options?: StandardEvaluationOptions
): 'Safe' | 'Warning' | 'Exceeded' {
  const params: Array<{ key: string; val: number }> = [
    { key: 'ph', val: ph },
    { key: 'tss', val: tss },
    { key: 'debit', val: debit },
    { key: 'fe', val: fe },
    { key: 'mn', val: mn },
  ];

  const results = params.map(p => evaluateParam(p.key, p.val, options));

  if (results.some(r => r === 'tidak_memenuhi')) {
    return 'Exceeded';
  }
  if (results.some(r => r === 'mendekati')) {
    return 'Warning';
  }
  return 'Safe';
}

export function evaluateSurfaceWaterParam(
  key: 'ph' | 'tss' | 'doVal' | 'bod' | 'cod' | 'fe' | 'mn',
  value: number,
  options?: StandardEvaluationOptions
): {
  result: 'memenuhi' | 'mendekati' | 'tidak_memenuhi' | 'dipantau';
  verificationStatus: 'Terverifikasi' | 'Perlu verifikasi';
  standard?: EnvironmentalStandard;
} {
  const thresholds = options?.thresholds ?? DEFAULT_INTERNAL_THRESHOLDS;
  const activeMap = resolveActiveStandards(options?.standards, 'air_permukaan', {
    locationCode: options?.locationCode,
    sampleDate: options?.sampleDate,
    kelasAir: options?.kelasAir ?? 'II',
  });
  const std = activeMap[key];
  if (std) {
    if (std.verificationStatus === 'Perlu verifikasi') {
      return { result: 'dipantau', verificationStatus: 'Perlu verifikasi', standard: std };
    }
    return {
      result: evaluateLimitPair(value, std.minLimit, std.maxLimit, thresholds),
      verificationStatus: 'Terverifikasi',
      standard: std,
    };
  }

  // Fallback jika standard tidak ditemukan
  const fallbackMap: Record<string, { min: number | null; max: number | null; verified: boolean }> = {
    ph: { min: 6.0, max: 9.0, verified: true },
    tss: { min: null, max: 50, verified: true },
    doVal: { min: 4.0, max: null, verified: true },
    bod: { min: null, max: 3.0, verified: true },
    cod: { min: null, max: 25.0, verified: true },
    fe: { min: null, max: 0.3, verified: false },
    mn: { min: null, max: 0.1, verified: false },
  };
  const fb = fallbackMap[key];
  if (!fb || !fb.verified) {
    return { result: 'dipantau', verificationStatus: 'Perlu verifikasi' };
  }
  return {
    result: evaluateLimitPair(value, fb.min, fb.max, thresholds),
    verificationStatus: 'Terverifikasi',
  };
}

export function evaluateSurfaceWaterStatus(
  ph: number,
  tss: number,
  doVal: number,
  bod: number,
  cod: number,
  fe: number,
  mn: number,
  options?: StandardEvaluationOptions
): 'Safe' | 'Warning' | 'Exceeded' {
  const params: Array<{ key: 'ph' | 'tss' | 'doVal' | 'bod' | 'cod' | 'fe' | 'mn'; val: number }> = [
    { key: 'ph', val: ph },
    { key: 'tss', val: tss },
    { key: 'doVal', val: doVal },
    { key: 'bod', val: bod },
    { key: 'cod', val: cod },
    { key: 'fe', val: fe },
    { key: 'mn', val: mn },
  ];

  const evaluated = params.map(p => evaluateSurfaceWaterParam(p.key, p.val, options));
  if (evaluated.some(e => e.result === 'tidak_memenuhi')) return 'Exceeded';
  if (evaluated.some(e => e.result === 'mendekati')) return 'Warning';
  return 'Safe';
}

