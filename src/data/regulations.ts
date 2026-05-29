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
    title: "PP No. 22 Tahun 2021",
    category: "Air Limbah & Baku Mutu",
    description: "Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup. Lampiran VII menetapkan Baku Mutu Air Sungai dan sejenisnya.",
    parameters: [
      { name: "pH", unit: "", limit: "6.0 - 9.0", numericLimit: 9.0, comparison: "range", minLimit: 6.0 },
      { name: "TSS", unit: "mg/L", limit: "Maks 200", numericLimit: 200, comparison: "max" }
    ]
  },
  {
    id: "PermenLHK-113-2003",
    title: "Permen LHK No. 113 Tahun 2003",
    category: "Air Limbah Tambang Batubara",
    description: "Baku Mutu Air Limbah bagi Usaha dan/atau Kegiatan Pertambangan Batubara (KepmenLH No. 113/2003).",
    parameters: [
      { name: "pH", unit: "", limit: "6.0 - 9.0", numericLimit: 9.0, comparison: "range", minLimit: 6.0 },
      { name: "TSS", unit: "mg/L", limit: "Maks 400", numericLimit: 400, comparison: "max" },
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
      { name: "Masa Simpan Maksimal", unit: "Hari", limit: "Maks 90 Hari (Kat 1)", numericLimit: 90, comparison: "max" }
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

export function evaluateWastewaterStatus(ph: number, tss: number, debit: number, fe: number, mn: number): 'Safe' | 'Warning' | 'Exceeded' {
  // Safe: all fully under limits
  // Warning: any value is within 15% of the threshold margin
  // Exceeded: any value exceeds threshold limit
  
  const thresholds = {
    phMin: 6.0, phMax: 9.0,
    tssMax: 400, // Updated to 400 per KepmenLH 113 / 2003
    feMax: 7.0,
    mnMax: 4.0
  };

  // Check Exceeded
  if (ph < thresholds.phMin || ph > thresholds.phMax) return 'Exceeded';
  if (tss > thresholds.tssMax) return 'Exceeded';
  if (fe > thresholds.feMax) return 'Exceeded';
  if (mn > thresholds.mnMax) return 'Exceeded';

  // Check Warning (within 15% of approaching limit)
  const isPhWarning = (ph < thresholds.phMin + 0.3) || (ph > thresholds.phMax - 0.3);
  const isTssWarning = tss > thresholds.tssMax * 0.85;
  const isFeWarning = fe > thresholds.feMax * 0.85;
  const isMnWarning = mn > thresholds.mnMax * 0.85;

  if (isPhWarning || isTssWarning || isFeWarning || isMnWarning) {
    return 'Warning';
  }

  return 'Safe';
}
