/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ComplianceConclusion,
  EnvironmentalStandard,
  EvidenceParamEvalStatus,
  EvidenceParamResult,
  InternalThresholdsConfig,
  MonthlyDayItem,
  WastewaterData,
} from '../types';
import { INITIAL_STANDARDS_SEED, WASTEWATER_STANDARDS } from '../data/regulations';
import { formatDateLocalIndonesian, getTimeMs } from './dateUtils';
import {
  DEFAULT_INTERNAL_THRESHOLDS_VALUE,
  evaluateSampleCompliance,
  formatLocaleNumberStrict,
  parseStrictNumber,
} from './waterQualityEval';

export const DEBIT_STATUS_LABEL = 'DIPANTAU';

export interface DailyEvidenceCalcContext {
  locationCode?: string;
  locationName?: string;
  date?: string; // YYYY-MM-DD
  standards?: EnvironmentalStandard[];
  thresholds?: InternalThresholdsConfig;
}

export interface DailyEvidenceResult {
  params: EvidenceParamResult[];
  overall: ComplianceConclusion;
  failedParams: string[];
  incompleteParams: string[];
  unverifiedParams: string[];
  conclusionText: string;
  standardsBasis: string;
}

export function formatLocaleNumber(num: number | null | undefined, minDec = 1, maxDec = 3): string {
  return formatLocaleNumberStrict(num, minDec, maxDec);
}

/**
 * Evaluasi satu parameter air limbah melalui engine baku mutu dinamis.
 */
export function evaluateEvidenceParam(
  key: string,
  value: unknown,
  ctx?: {
    standards?: EnvironmentalStandard[];
    thresholds?: InternalThresholdsConfig;
    locationCode?: string;
    sampleDate?: string;
    unitMap?: Record<string, string>;
  }
): { status: EvidenceParamEvalStatus; note?: string; limitDisplay?: string; unit?: string } {
  const standards =
    ctx?.standards !== undefined
      ? ctx.standards
      : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);
  const res = evaluateSampleCompliance(
    'air_limbah',
    {
      [key]: value,
      date: ctx?.sampleDate,
      locationCode: ctx?.locationCode,
    },
    {
      standards,
      thresholds: ctx?.thresholds ?? DEFAULT_INTERNAL_THRESHOLDS_VALUE,
      locationCode: ctx?.locationCode,
      sampleDate: ctx?.sampleDate,
      unitMap: ctx?.unitMap,
    }
  );
  const p = res.params[key];
  return {
    status: p?.status ?? 'belum_dievaluasi',
    note: p?.note,
    limitDisplay: p?.limitDisplay,
    unit: p?.unit,
  };
}

/**
 * Fungsi murni pembuat struktur evidence harian air limbah berbasis Master Baku Mutu dinamis.
 */
export function buildDailyEvidence(
  record: Partial<WastewaterData> & Record<string, any>,
  ctx?: DailyEvidenceCalcContext
): DailyEvidenceResult {
  const code = record.locationCode || ctx?.locationCode || 'KPL-01';
  const targetDate = record.date || ctx?.date || '';
  const tanggalPanjang = targetDate ? formatDateLocalIndonesian(targetDate) : '-';
  const standards =
    ctx?.standards !== undefined
      ? ctx.standards
      : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);

  const evalRes = evaluateSampleCompliance('air_limbah', record, {
    standards,
    thresholds: ctx?.thresholds ?? DEFAULT_INTERNAL_THRESHOLDS_VALUE,
    locationCode: code,
    sampleDate: targetDate,
    standardId: record.standardId,
    unitMap: record.unitMap,
  });

  const params: EvidenceParamResult[] = evalRes.paramList.map((p) => ({
    key: p.key,
    label: p.label,
    unit: p.unit,
    value: p.value,
    display: p.display,
    limitDisplay: p.limitDisplay,
    status: p.status,
    note: p.note,
    basisRegulasi: p.standard?.basisRegulasi,
  }));

  let conclusionText = '';
  if (evalRes.overall === 'MEMENUHI') {
    conclusionText = `Hasil pemantauan air limbah pada titik ${code} tanggal ${tanggalPanjang} MEMENUHI BAKU MUTU sesuai ${evalRes.standardsBasis}.`;
  } else if (evalRes.overall === 'TIDAK MEMENUHI') {
    conclusionText = `Hasil pemantauan air limbah pada titik ${code} tanggal ${tanggalPanjang} TIDAK MEMENUHI BAKU MUTU pada parameter: ${evalRes.failedParams.join(', ')}.`;
  } else if (evalRes.overall === 'DATA TIDAK LENGKAP') {
    conclusionText = `Hasil pemantauan air limbah pada titik ${code} tanggal ${tanggalPanjang} DATA TIDAK LENGKAP (${evalRes.incompleteParams.join(', ')}).`;
  } else if (evalRes.overall === 'TIDAK BERLAKU') {
    conclusionText = `Baku mutu pada titik ${code} tanggal ${tanggalPanjang} bertanda TIDAK BERLAKU sesuai konfigurasi standar titik pemantauan.`;
  } else {
    conclusionText = `Hasil pemantauan air limbah pada titik ${code} tanggal ${tanggalPanjang} BELUM DIEVALUASI karena standar parameter belum diverifikasi/ditetapkan (${evalRes.unverifiedParams.join(', ') || 'standar aktif belum tersedia'}).`;
  }

  return {
    params,
    overall: evalRes.overall,
    failedParams: evalRes.failedParams,
    incompleteParams: evalRes.incompleteParams,
    unverifiedParams: evalRes.unverifiedParams,
    conclusionText,
    standardsBasis: evalRes.standardsBasis,
  };
}

/**
 * Memilih catatan sumber harian untuk kombinasi (titik, tanggal):
 * - Hanya monitoringType === 'Harian'
 * - Bila ada lebih dari satu (data lama ganda), pilih yang createdAt terakhir.
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
  status: MonthlyDayItem['status'];
}

export interface MonthlyRecapResult {
  daysInMonth: number;
  days: MonthlyDayEvidence[];
  stats: Record<
    'ph' | 'tss' | 'debit' | 'fe' | 'mn',
    {
      min: number | null;
      avg: number | null;
      max: number | null;
      status: EvidenceParamEvalStatus;
      exceedDays: number;
    }
  >;
  samplingDays: number;
  passDays: number;
  failDays: number;
  incompleteDays: number;
  unevaluatedDays: number;
  notApplicableDays: number;
  missingDays: string[];
  compliancePct: number | null;
  completenessPct: number;
  overall: ComplianceConclusion | 'BELUM ADA DATA';
  failedParamKeys: string[];
  failedParamLabels: string[];
  standardsBasis: string;
  conclusionText: string;
}

const INDO_MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function conclusionToMonthlyDayStatus(overall: ComplianceConclusion): MonthlyDayItem['status'] {
  if (overall === 'MEMENUHI') return 'memenuhi';
  if (overall === 'TIDAK MEMENUHI') return 'tidak_memenuhi';
  if (overall === 'DATA TIDAK LENGKAP') return 'data_tidak_lengkap';
  if (overall === 'TIDAK BERLAKU') return 'tidak_berlaku';
  return 'belum_dievaluasi';
}

/**
 * Fungsi murni pembuat struktur evidence bulanan (rekap) pemantauan air limbah
 * menggunakan Master Baku Mutu dinamis (termasuk perubahan batas antar periode/titik).
 */
export function buildMonthlyRecap(
  records: WastewaterData[],
  locationCode: string,
  year: number,
  month: number,
  ctx?: {
    standards?: EnvironmentalStandard[];
    thresholds?: InternalThresholdsConfig;
  }
): MonthlyRecapResult {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthPad = String(month).padStart(2, '0');
  const monthName = INDO_MONTH_NAMES[month - 1] || `Bulan ${month}`;
  const periodLabel = `${monthName} ${year}`;
  const standards =
    ctx?.standards !== undefined
      ? ctx.standards
      : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);
  const thresholds = ctx?.thresholds ?? DEFAULT_INTERNAL_THRESHOLDS_VALUE;

  const days: MonthlyDayEvidence[] = [];
  const missingDays: string[] = [];
  const basisUsed = new Set<string>();

  for (let d = 1; d <= daysInMonth; d++) {
    const dayPad = String(d).padStart(2, '0');
    const dateStr = `${year}-${monthPad}-${dayPad}`;

    const { selected, count } = selectDailyRecord(records, locationCode, dateStr);

    if (selected) {
      const dailyEvidence = buildDailyEvidence(selected, {
        locationCode,
        date: dateStr,
        standards,
        thresholds,
      });
      if (dailyEvidence.standardsBasis) {
        basisUsed.add(dailyEvidence.standardsBasis);
      }
      days.push({
        date: dateStr,
        dayNumber: d,
        record: selected,
        dailyEvidence,
        duplicateCount: count,
        status: conclusionToMonthlyDayStatus(dailyEvidence.overall),
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
  const incompleteDays = days.filter((d) => d.status === 'data_tidak_lengkap').length;
  const unevaluatedDays = days.filter((d) => d.status === 'belum_dievaluasi').length;
  const notApplicableDays = days.filter((d) => d.status === 'tidak_berlaku').length;

  const compliancePct =
    samplingDays === 0 ? null : Math.round((passDays / samplingDays) * 1000) / 10;

  const completenessPct = Math.round((samplingDays / daysInMonth) * 1000) / 10;

  const paramKeys: ('ph' | 'tss' | 'debit' | 'fe' | 'mn')[] = ['ph', 'tss', 'debit', 'fe', 'mn'];
  const failedParamKeys: string[] = [];
  const failedParamLabels: string[] = [];

  const stats = {} as MonthlyRecapResult['stats'];

  for (const key of paramKeys) {
    const stdMeta = WASTEWATER_STANDARDS.find((s) => s.key === key);
    const validVals: number[] = [];
    let exceedDays = 0;
    let hasMendekati = false;
    let hasIncomplete = false;
    let hasUnverified = false;
    let hasNotApplicable = false;
    let evaluatedPassCount = 0;

    for (const d of days) {
      if (!d.record || !d.dailyEvidence) continue;
      const pDetail = d.dailyEvidence.params.find((p) => p.key === key);
      const parsed = parseStrictNumber((d.record as any)[key]);
      if (parsed !== null) {
        validVals.push(parsed);
      }

      if (!pDetail) {
        hasUnverified = true;
        continue;
      }

      if (pDetail.status === 'tidak_memenuhi') {
        exceedDays++;
      } else if (pDetail.status === 'mendekati') {
        hasMendekati = true;
        evaluatedPassCount++;
      } else if (pDetail.status === 'memenuhi') {
        evaluatedPassCount++;
      } else if (pDetail.status === 'data_tidak_lengkap') {
        hasIncomplete = true;
      } else if (pDetail.status === 'belum_dievaluasi') {
        hasUnverified = true;
      } else if (pDetail.status === 'tidak_berlaku') {
        hasNotApplicable = true;
      }
    }

    const min = validVals.length > 0 ? Math.min(...validVals) : null;
    const max = validVals.length > 0 ? Math.max(...validVals) : null;
    const avg =
      validVals.length > 0
        ? validVals.reduce((acc, curr) => acc + curr, 0) / validVals.length
        : null;

    let paramStatus: EvidenceParamEvalStatus = 'belum_dievaluasi';
    if (samplingDays === 0) {
      paramStatus = key === 'debit' ? 'dipantau' : 'belum_dievaluasi';
    } else if (exceedDays > 0) {
      paramStatus = 'tidak_memenuhi';
      failedParamKeys.push(key);
      if (stdMeta) failedParamLabels.push(stdMeta.label);
    } else if (hasIncomplete) {
      paramStatus = 'data_tidak_lengkap';
    } else if (hasUnverified) {
      paramStatus = 'belum_dievaluasi';
    } else if (hasMendekati) {
      paramStatus = 'mendekati';
    } else if (evaluatedPassCount > 0) {
      paramStatus = 'memenuhi';
    } else if (hasNotApplicable) {
      paramStatus = 'tidak_berlaku';
    } else if (key === 'debit') {
      paramStatus = 'dipantau';
    }

    stats[key] = {
      min,
      avg,
      max,
      status: paramStatus,
      exceedDays,
    };
  }

  let overall: MonthlyRecapResult['overall'] = 'BELUM ADA DATA';
  if (samplingDays === 0) {
    overall = 'BELUM ADA DATA';
  } else if (failDays > 0) {
    overall = 'TIDAK MEMENUHI';
  } else if (incompleteDays > 0) {
    overall = 'DATA TIDAK LENGKAP';
  } else if (unevaluatedDays > 0) {
    overall = 'BELUM DIEVALUASI';
  } else if (passDays > 0) {
    overall = 'MEMENUHI';
  } else if (notApplicableDays > 0) {
    overall = 'TIDAK BERLAKU';
  }

  const standardsBasis =
    basisUsed.size > 0
      ? Array.from(basisUsed).join(' | ')
      : 'Belum ada standar baku mutu terverifikasi yang berlaku';

  let conclusionText = '';
  if (overall === 'BELUM ADA DATA') {
    conclusionText = `Belum terdapat data pemantauan air limbah pada titik ${locationCode} selama bulan ${periodLabel}.`;
  } else if (overall === 'MEMENUHI') {
    conclusionText = `Rekapitulasi hasil pemantauan air limbah pada titik ${locationCode} selama bulan ${periodLabel} MEMENUHI BAKU MUTU sesuai ${standardsBasis}.`;
  } else if (overall === 'TIDAK MEMENUHI') {
    const paramsListStr =
      failedParamLabels.length > 0 ? failedParamLabels.join(', ') : 'parameter uji';
    conclusionText = `Rekapitulasi hasil pemantauan air limbah pada titik ${locationCode} selama bulan ${periodLabel} TIDAK MEMENUHI BAKU MUTU pada ${failDays} dari ${samplingDays} hari sampling (parameter: ${paramsListStr}).`;
  } else if (overall === 'DATA TIDAK LENGKAP') {
    conclusionText = `Rekapitulasi hasil pemantauan air limbah pada titik ${locationCode} selama bulan ${periodLabel} berstatus DATA TIDAK LENGKAP pada ${incompleteDays} dari ${samplingDays} hari sampling.`;
  } else if (overall === 'TIDAK BERLAKU') {
    conclusionText = `Seluruh parameter pada titik ${locationCode} bulan ${periodLabel} bertanda TIDAK BERLAKU sesuai konfigurasi baku mutu.`;
  } else {
    conclusionText = `Rekapitulasi hasil pemantauan air limbah pada titik ${locationCode} selama bulan ${periodLabel} BELUM DIEVALUASI (${unevaluatedDays} dari ${samplingDays} hari menggunakan standar yang belum diverifikasi/ditetapkan).`;
  }

  if (missingDays.length > 0 && samplingDays > 0) {
    const missingDaysFormatted = missingDays
      .map((md) => {
        const dNum = parseInt(md.split('-')[2], 10);
        return `${dNum} ${monthName}`;
      })
      .join(', ');
    conclusionText += ` Tidak terdapat data pemantauan pada ${missingDays.length} hari: ${missingDaysFormatted}.`;
  }

  return {
    daysInMonth,
    days,
    stats,
    samplingDays,
    passDays,
    failDays,
    incompleteDays,
    unevaluatedDays,
    notApplicableDays,
    missingDays,
    compliancePct,
    completenessPct,
    overall,
    failedParamKeys,
    failedParamLabels,
    standardsBasis,
    conclusionText,
  };
}
