/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WastewaterData, EvidenceParamResult } from '../types';
import { 
  WASTEWATER_STANDARDS, 
  WASTEWATER_BASIS_LABEL, 
  WARNING_RATIO 
} from '../data/regulations';
import { formatDateLocalIndonesian, getTimeMs } from './dateUtils';

export const DEBIT_STATUS_LABEL = 'DIPANTAU';

export interface DailyEvidenceCalcContext {
  locationCode?: string;
  locationName?: string;
  date?: string; // YYYY-MM-DD
}

export interface DailyEvidenceResult {
  params: EvidenceParamResult[];
  overall: 'MEMENUHI' | 'TIDAK MEMENUHI';
  failedParams: string[];
  conclusionText: string;
  standardsBasis: string;
}

/**
 * Format angka ke format bahasa Indonesia (desimal koma) dengan menjaga presisi input
 * tanpa membulatkan lebih kasar dari standar.
 */
export function formatLocaleNumber(num: number, minDec = 1, maxDec = 3): string {
  if (typeof num !== 'number' || isNaN(num)) return '-';
  const str = String(num);
  const rawDecimals = str.includes('.') ? str.split('.')[1].length : 0;
  const targetDec = Math.max(minDec, Math.min(maxDec, rawDecimals));
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: minDec,
    maximumFractionDigits: targetDec,
  });
}

/**
 * Evaluasi satu parameter air limbah terhadap baku mutu dengan batasan inklusif.
 * - pH: 6.0 - 9.0 (inklusif). 9.0 = memenuhi, 9.01 = tidak_memenuhi.
 * - TSS: maks 300 mg/L. 300 = memenuhi, 301 = tidak_memenuhi. > 255 = mendekati.
 * - Fe: maks 7.0 mg/L. 7.0 = memenuhi, 7.01 = tidak_memenuhi. > 5.95 = mendekati.
 * - Mn: maks 4.0 mg/L. 4.0 = memenuhi, 4.01 = tidak_memenuhi. > 3.4 = mendekati.
 * - Debit: status 'dipantau', tidak diuji terhadap baku mutu.
 */
export function evaluateEvidenceParam(
  key: string,
  value: number
): { status: 'memenuhi' | 'mendekati' | 'tidak_memenuhi' | 'dipantau'; note?: string } {
  if (key === 'debit') {
    return { status: 'dipantau' };
  }

  if (key === 'ph') {
    if (value < 6.0 || value > 9.0) {
      return { status: 'tidak_memenuhi' };
    }
    if (value < 6.3 || value > 8.7) {
      return { status: 'mendekati', note: 'mendekati batas' };
    }
    return { status: 'memenuhi' };
  }

  if (key === 'tss') {
    if (value > 300) {
      return { status: 'tidak_memenuhi' };
    }
    if (value > 300 * WARNING_RATIO) {
      return { status: 'mendekati', note: 'mendekati batas' };
    }
    return { status: 'memenuhi' };
  }

  if (key === 'fe') {
    if (value > 7.0) {
      return { status: 'tidak_memenuhi' };
    }
    if (value > 7.0 * WARNING_RATIO) {
      return { status: 'mendekati', note: 'mendekati batas' };
    }
    return { status: 'memenuhi' };
  }

  if (key === 'mn') {
    if (value > 4.0) {
      return { status: 'tidak_memenuhi' };
    }
    if (value > 4.0 * WARNING_RATIO) {
      return { status: 'mendekati', note: 'mendekati batas' };
    }
    return { status: 'memenuhi' };
  }

  return { status: 'dipantau' };
}

/**
 * Fungsi murni pembuat struktur evidence harian air limbah.
 */
export function buildDailyEvidence(
  record: WastewaterData,
  ctx?: DailyEvidenceCalcContext
): DailyEvidenceResult {
  const code = record.locationCode || ctx?.locationCode || 'KPL-01';
  const targetDate = record.date || ctx?.date || '';
  const tanggalPanjang = formatDateLocalIndonesian(targetDate);

  const failedParams: string[] = [];

  const params: EvidenceParamResult[] = WASTEWATER_STANDARDS.map((std) => {
    const rawVal = Number((record as any)[std.key] ?? 0);
    const evalResult = evaluateEvidenceParam(std.key, rawVal);

    if (evalResult.status === 'tidak_memenuhi') {
      failedParams.push(std.label);
    }

    const minDec = std.decimals?.min ?? 0;
    const maxDec = std.decimals?.max ?? 3;
    const displayVal = formatLocaleNumber(rawVal, minDec, maxDec);

    return {
      key: std.key,
      label: std.label,
      unit: std.unit,
      value: rawVal,
      display: displayVal,
      limitDisplay: std.display,
      status: evalResult.status,
      note: evalResult.note,
    };
  });

  const overall: 'MEMENUHI' | 'TIDAK MEMENUHI' =
    failedParams.length > 0 ? 'TIDAK MEMENUHI' : 'MEMENUHI';

  const conclusionText =
    overall === 'MEMENUHI'
      ? `Hasil pemantauan air limbah pada titik ${code} tanggal ${tanggalPanjang} MEMENUHI BAKU MUTU sesuai ${WASTEWATER_BASIS_LABEL}.`
      : `Hasil pemantauan air limbah pada titik ${code} tanggal ${tanggalPanjang} TIDAK MEMENUHI BAKU MUTU pada parameter: ${failedParams.join(', ')}.`;

  return {
    params,
    overall,
    failedParams,
    conclusionText,
    standardsBasis: WASTEWATER_BASIS_LABEL,
  };
}

/**
 * Memilih catatan sumber harian untuk kombinasi (titik, tanggal):
 * - Hanya monitoringType === 'Harian'
 * - Bila ada lebih dari satu (data lama ganda), pilih yang createdAt terakhir.
 * - Mengembalikan catatan terpilih dan pesan peringatan bila ganda.
 */
export function selectDailyRecord(
  records: WastewaterData[],
  locationCode: string,
  dateStr: string
): {
  selected: WastewaterData | null;
  count: number;
  duplicateWarning: string | null;
} {
  const matching = records.filter((r) => {
    const isDaily = (r.monitoringType ?? 'Harian') === 'Harian';
    if (!isDaily) return false;
    if (r.date !== dateStr) return false;
    const matchesCode =
      (r.locationCode && r.locationCode === locationCode) ||
      (!r.locationCode && r.location.includes(locationCode));
    return matchesCode;
  });

  if (matching.length === 0) {
    return { selected: null, count: 0, duplicateWarning: null };
  }

  if (matching.length === 1) {
    return { selected: matching[0], count: 1, duplicateWarning: null };
  }

  // Multiple records exist: pick latest by createdAt or array index
  const sorted = [...matching].sort((a, b) => {
    const tA = getTimeMs(a.createdAt);
    const tB = getTimeMs(b.createdAt);
    if (tA !== tB) return tB - tA;
    return (b.id || '').localeCompare(a.id || '');
  });

  return {
    selected: sorted[0],
    count: matching.length,
    duplicateWarning: `${matching.length} data pada hari ini; dipakai yang terakhir diinput`,
  };
}

export interface MonthlyDayEvidence {
  date: string;
  dayNumber: number;
  record?: WastewaterData;
  dailyEvidence?: ReturnType<typeof buildDailyEvidence>;
  duplicateCount: number;
  status: 'memenuhi' | 'tidak_memenuhi' | 'tanpa_data';
}

export interface MonthlyRecapResult {
  daysInMonth: number;
  days: MonthlyDayEvidence[];
  stats: Record<'ph' | 'tss' | 'debit' | 'fe' | 'mn', {
    min: number | null;
    avg: number | null;
    max: number | null;
    status: 'memenuhi' | 'mendekati' | 'tidak_memenuhi' | 'dipantau';
    exceedDays: number;
  }>;
  samplingDays: number;
  passDays: number;
  failDays: number;
  missingDays: string[];
  compliancePct: number | null; // passDays / samplingDays * 100, 1 desimal; null bila samplingDays == 0
  completenessPct: number; // samplingDays / daysInMonth * 100
  overall: 'MEMENUHI' | 'TIDAK MEMENUHI' | 'BELUM ADA DATA';
  failedParamKeys: string[];
  failedParamLabels: string[];
  conclusionText: string;
}

const INDO_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Fungsi murni pembuat struktur evidence bulanan (rekap) pemantauan air limbah.
 */
export function buildMonthlyRecap(
  records: WastewaterData[],
  locationCode: string,
  year: number,
  month: number
): MonthlyRecapResult {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthPad = String(month).padStart(2, '0');
  const monthName = INDO_MONTH_NAMES[month - 1] || `Bulan ${month}`;
  const periodLabel = `${monthName} ${year}`;

  const days: MonthlyDayEvidence[] = [];
  const missingDays: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayPad = String(d).padStart(2, '0');
    const dateStr = `${year}-${monthPad}-${dayPad}`;

    const { selected, count } = selectDailyRecord(records, locationCode, dateStr);

    if (selected) {
      const dailyEvidence = buildDailyEvidence(selected, { locationCode, date: dateStr });
      days.push({
        date: dateStr,
        dayNumber: d,
        record: selected,
        dailyEvidence,
        duplicateCount: count,
        status: dailyEvidence.overall === 'MEMENUHI' ? 'memenuhi' : 'tidak_memenuhi',
      });
    } else {
      missingDays.push(dateStr);
      days.push({
        date: dateStr,
        dayNumber: d,
        duplicateCount: 0,
        status: 'tanpa_data',
      });
    }
  }

  const samplingDays = days.filter((d) => d.record != null).length;
  const passDays = days.filter((d) => d.status === 'memenuhi').length;
  const failDays = days.filter((d) => d.status === 'tidak_memenuhi').length;

  const compliancePct = samplingDays === 0
    ? null
    : Math.round((passDays / samplingDays) * 1000) / 10;

  const completenessPct = Math.round((samplingDays / daysInMonth) * 1000) / 10;

  // Stats per parameter: 'ph' | 'tss' | 'debit' | 'fe' | 'mn'
  const paramKeys: ('ph' | 'tss' | 'debit' | 'fe' | 'mn')[] = ['ph', 'tss', 'debit', 'fe', 'mn'];
  const failedParamKeys: string[] = [];
  const failedParamLabels: string[] = [];

  const stats = {} as MonthlyRecapResult['stats'];

  for (const key of paramKeys) {
    const std = WASTEWATER_STANDARDS.find((s) => s.key === key);
    const validVals: number[] = [];
    let exceedDays = 0;
    let hasMendekati = false;

    for (const d of days) {
      if (d.record && typeof (d.record as any)[key] === 'number') {
        const val = Number((d.record as any)[key]);
        validVals.push(val);

        if (key !== 'debit') {
          const evalRes = evaluateEvidenceParam(key, val);
          if (evalRes.status === 'tidak_memenuhi') {
            exceedDays++;
          } else if (evalRes.status === 'mendekati') {
            hasMendekati = true;
          }
        }
      }
    }

    if (validVals.length === 0) {
      stats[key] = {
        min: null,
        avg: null,
        max: null,
        status: key === 'debit' ? 'dipantau' : 'memenuhi',
        exceedDays: 0,
      };
    } else {
      const min = Math.min(...validVals);
      const max = Math.max(...validVals);
      const sum = validVals.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / validVals.length;

      let paramStatus: 'memenuhi' | 'mendekati' | 'tidak_memenuhi' | 'dipantau' = 'memenuhi';
      if (key === 'debit') {
        paramStatus = 'dipantau';
      } else if (exceedDays > 0) {
        paramStatus = 'tidak_memenuhi';
        failedParamKeys.push(key);
        if (std) failedParamLabels.push(std.label);
      } else if (hasMendekati) {
        paramStatus = 'mendekati';
      }

      stats[key] = {
        min,
        avg,
        max,
        status: paramStatus,
        exceedDays,
      };
    }
  }

  let overall: 'MEMENUHI' | 'TIDAK MEMENUHI' | 'BELUM ADA DATA' = 'BELUM ADA DATA';
  if (samplingDays === 0) {
    overall = 'BELUM ADA DATA';
  } else if (failDays > 0) {
    overall = 'TIDAK MEMENUHI';
  } else {
    overall = 'MEMENUHI';
  }

  // Generate conclusionText
  let conclusionText = '';
  if (overall === 'BELUM ADA DATA') {
    conclusionText = `Belum terdapat data pemantauan air limbah pada titik ${locationCode} selama bulan ${periodLabel}.`;
  } else if (overall === 'MEMENUHI') {
    conclusionText = `Rekapitulasi hasil pemantauan air limbah pada titik ${locationCode} selama bulan ${periodLabel} MEMENUHI BAKU MUTU sesuai ${WASTEWATER_BASIS_LABEL}.`;
  } else {
    const paramsListStr = failedParamLabels.length > 0 ? failedParamLabels.join(', ') : 'parameter uji';
    conclusionText = `Rekapitulasi hasil pemantauan air limbah pada titik ${locationCode} selama bulan ${periodLabel} TIDAK MEMENUHI BAKU MUTU pada ${failDays} dari ${samplingDays} hari sampling (parameter: ${paramsListStr}).`;
  }

  if (missingDays.length > 0 && samplingDays > 0) {
    const missingDaysFormatted = missingDays.map((md) => {
      const dNum = parseInt(md.split('-')[2], 10);
      return `${dNum} ${monthName}`;
    }).join(', ');
    conclusionText += ` Tidak terdapat data pemantauan pada ${missingDays.length} hari: ${missingDaysFormatted}.`;
  }

  return {
    daysInMonth,
    days,
    stats,
    samplingDays,
    passDays,
    failDays,
    missingDays,
    compliancePct,
    completenessPct,
    overall,
    failedParamKeys,
    failedParamLabels,
    conclusionText,
  };
}
