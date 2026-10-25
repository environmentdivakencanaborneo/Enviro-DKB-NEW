/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
    title: "PP No. 22 Tahun 2021 Lampiran VI",
    category: "Air Permukaan (Kelas II)",
    description: "Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup. Lampiran VI menetapkan Baku Mutu Air Nasional Kelas II.",
    parameters: [
      { name: "pH", unit: "", limit: "6.0 - 9.0", numericLimit: 9.0, comparison: "range", minLimit: 6.0 },
      { name: "TSS", unit: "mg/L", limit: "Maks 50", numericLimit: 50, comparison: "max" },
      { name: "DO", unit: "mg/L", limit: "Min 4", numericLimit: 4, comparison: "min" },
      { name: "BOD", unit: "mg/L", limit: "Maks 3", numericLimit: 3, comparison: "max" },
      { name: "COD", unit: "mg/L", limit: "Maks 25", numericLimit: 25, comparison: "max" },
      { name: "Besi Terlarut", unit: "mg/L", limit: "Maks 0.3", numericLimit: 0.3, comparison: "max" },
      { name: "Mangan Terlarut", unit: "mg/L", limit: "Maks 0.1", numericLimit: 0.1, comparison: "max" }
    ]
  },
  {
    id: "KepmenLH-113-2003",
    title: "Baku Mutu Air Limbah Tambang Batubara (SK Pertek PT DKB)",
    category: "Air Limbah Tambang Batubara",
    description: "pH, Fe, dan Mn mengacu Kepmen LH No. 113 Tahun 2003 tentang Baku Mutu Air Limbah bagi Usaha dan/atau Kegiatan Pertambangan Batubara. TSS mengacu SK Pertek Air Limbah PT DKB No. 503/IPAL-LH/DPM-PTSP/2021, yang menetapkan ambang TSS sesuai Perda Provinsi Kalimantan Timur No. 2 Tahun 2011 tentang Pengelolaan Kualitas Air dan Pengendalian Pencemaran Air.",
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
    title: "Permen LHK No. 6 Tahun 2021",
    category: "Limbah B3",
    description: "Tata Cara dan Persyaratan Pengelolaan Limbah Bahan Berbahaya dan Beracun, termasuk standarisasi penyimpanan TPS maksimal 90 hari.",
    parameters: [
      { name: "Masa Simpan Maksimal", unit: "Hari", limit: "Maks 90/180/365 Hari", numericLimit: 90, comparison: "max" }
    ]
  },
  {
    id: "Kepmen-344-2025",
    title: "Kepmen 344 Tahun 2025",
    category: "Reklamasi & Pascatambang",
    description: "Petunjuk Teknis Pelaksanaan Reklamasi dan Pascatambang serta Penempatan Jaminan Reklamasi.",
    parameters: [
      { name: "Jaminan Reklamasi", unit: "Kepatuhan", limit: "Wajib ditempatkan berkala", numericLimit: 100, comparison: "max" }
    ]
  },
  {
    id: "UU-3-2020",
    title: "UU No. 3 Tahun 2020",
    category: "Pertambangan Minerba",
    description: "Perubahan atas UU No. 4 Tahun 2009 tentang Pertambangan Mineral dan Batubara. Kewajiban reklamasi & perlindungan lingkungan pertambangan.",
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
export const WARNING_RATIO = 0.85;

/**
 * Evaluasi parameter air limbah terhadap baku mutu WASTEWATER_STANDARDS.
 * Batas bersifat INKLUSIF (nilai tepat sama dengan batas = memenuhi).
 * Parameter dengan min=null dan max=null (Debit) berstatus 'dipantau'.
 */
export function evaluateParam(
  key: string,
  value: number
): 'memenuhi' | 'mendekati' | 'tidak_memenuhi' | 'dipantau' {
  const std = WASTEWATER_STANDARDS.find(s => s.key === key);
  if (!std || (std.min === null && std.max === null)) {
    return 'dipantau';
  }

  // Batas rentang (misal pH: 6.0 - 9.0)
  if (std.min !== null && std.max !== null) {
    if (value < std.min || value > std.max) {
      return 'tidak_memenuhi';
    }
    // Ambang warning: mendekati batas bawah atau batas atas dalam margin 0.3
    if (value < std.min + 0.3 || value > std.max - 0.3) {
      return 'mendekati';
    }
    return 'memenuhi';
  }

  // Batas maksimum (misal TSS 300, Fe 7.0, Mn 4.0)
  // TODO: verifikasi nilai terhadap SK Pertek PT DKB dan lampiran Kepmen LH 113/2003 sebelum dipakai untuk pelaporan resmi
  if (std.max !== null) {
    if (value > std.max) {
      return 'tidak_memenuhi';
    }
    if (value > std.max * WARNING_RATIO) {
      return 'mendekati';
    }
    return 'memenuhi';
  }

  // Batas minimum
  if (std.min !== null) {
    if (value < std.min) {
      return 'tidak_memenuhi';
    }
    if (value < std.min + (std.min * (1 - WARNING_RATIO))) {
      return 'mendekati';
    }
    return 'memenuhi';
  }

  return 'dipantau';
}

export function evaluateWastewaterStatus(
  ph: number,
  tss: number,
  debit: number,
  fe: number,
  mn: number
): 'Safe' | 'Warning' | 'Exceeded' {
  const params: Array<{ key: string; val: number }> = [
    { key: 'ph', val: ph },
    { key: 'tss', val: tss },
    { key: 'debit', val: debit },
    { key: 'fe', val: fe },
    { key: 'mn', val: mn },
  ];

  const results = params.map(p => evaluateParam(p.key, p.val));

  if (results.some(r => r === 'tidak_memenuhi')) {
    return 'Exceeded';
  }
  if (results.some(r => r === 'mendekati')) {
    return 'Warning';
  }
  return 'Safe';
}

export function evaluateSurfaceWaterStatus(
  ph: number,
  tss: number,
  doVal: number,
  bod: number,
  cod: number,
  fe: number,
  mn: number
): 'Safe' | 'Warning' | 'Exceeded' {
  const thresholds = {
    phMin: 6.0, phMax: 9.0,
    tssMax: 50,      // PP No. 22 Tahun 2021 Kelas II is 50 mg/L
    doMin: 4.0,      // Dissolved Oxygen min 4.0 mg/L
    bodMax: 3.0,     // BOD max 3.0 mg/L
    codMax: 25.0,    // COD max 25.0 mg/L
    feMax: 0.3,      // Besi terlarut max 0.3 mg/L
    mnMax: 0.1       // Mangan terlarut max 0.1 mg/L
  };

  // Check Exceeded
  if (ph < thresholds.phMin || ph > thresholds.phMax) return 'Exceeded';
  if (tss > thresholds.tssMax) return 'Exceeded';
  if (doVal < thresholds.doMin) return 'Exceeded';
  if (bod > thresholds.bodMax) return 'Exceeded';
  if (cod > thresholds.codMax) return 'Exceeded';
  if (fe > thresholds.feMax) return 'Exceeded';
  if (mn > thresholds.mnMax) return 'Exceeded';

  // Check Warning (within 15% of approaching limit)
  const isPhWarning = (ph < thresholds.phMin + 0.3) || (ph > thresholds.phMax - 0.3);
  const isTssWarning = tss > thresholds.tssMax * 0.85;
  const isDoWarning = doVal < thresholds.doMin + 0.6; 
  const isBodWarning = bod > thresholds.bodMax * 0.85;
  const isCodWarning = cod > thresholds.codMax * 0.85;
  const isFeWarning = fe > thresholds.feMax * 0.85;
  const isMnWarning = mn > thresholds.mnMax * 0.85;

  if (isPhWarning || isTssWarning || isDoWarning || isBodWarning || isCodWarning || isFeWarning || isMnWarning) {
    return 'Warning';
  }

  return 'Safe';
}
