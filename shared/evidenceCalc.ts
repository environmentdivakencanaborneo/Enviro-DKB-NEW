/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ComplianceConclusion,
  DailyEvidenceSnapshot,
  EnvironmentalStandard,
  EvidenceParamEvalStatus,
  EvidenceParamResult,
  InternalThresholdsConfig,
  MonthlyDayItem,
  MonthlyEvidenceSnapshot,
  WastewaterData,
} from './waterTypes';
import {
  DEFAULT_INTERNAL_THRESHOLDS_VALUE,
  evaluateSampleCompliance,
  formatLocaleNumberStrict,
  parseStrictNumber,
} from './waterQualityEval';

export const DEBIT_STATUS_LABEL = 'DIPANTAU';

const WASTEWATER_LABELS: Record<'ph' | 'tss' | 'debit' | 'fe' | 'mn', string> = {
  ph: 'pH',
  tss: 'TSS',
  debit: 'Debit',
  fe: 'Besi (Fe)',
  mn: 'Mangan (Mn)',
};

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

export function getTimeMsShared(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  }
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val.seconds === 'number') {
    return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
  }
  if (val instanceof Date) return val.getTime();
  return 0;
}

export function formatDateLocalIndonesianShared(dateStr: string): string {
  if (!dateStr) return '—';
  const clean = dateStr.trim().slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${INDO_MONTH_NAMES[m - 1] || `Bulan ${m}`} ${y}`;
}

export function getIndoMonthLabel(year: number, month: number): string {
  const monthName = INDO_MONTH_NAMES[month - 1] || `Bulan ${month}`;
  return `${monthName} ${year}`;
}

export interface DailyEvidenceCalcContext {
  locationCode?: string;
  locationName?: string;
  date?: string;
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
  const standards = ctx?.standards ?? [];
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

export function buildDailyEvidence(
  record: Partial<WastewaterData> & Record<string, any>,
  ctx?: DailyEvidenceCalcContext
): DailyEvidenceResult {
  const code = record.locationCode || ctx?.locationCode || 'KPL-01';
  const targetDate = record.date || ctx?.date || '';
  const tanggalPanjang = targetDate ? formatDateLocalIndonesianShared(targetDate) : '-';
  const standards = ctx?.standards ?? [];

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
      (!r.locationCode && r.location && r.location.includes(locationCode));
    return matchesCode;
  });

  if (matching.length === 0) {
    return { selected: null, count: 0, duplicateWarning: null };
  }

  if (matching.length === 1) {
    return { selected: matching[0], count: 1, duplicateWarning: null };
  }

  const sorted = [...matching].sort((a, b) => {
    const tA = getTimeMsShared(a.createdAt);
    const tB = getTimeMsShared(b.createdAt);
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
  dailyEvidence?: DailyEvidenceResult;
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

function conclusionToMonthlyDayStatus(overall: ComplianceConclusion): MonthlyDayItem['status'] {
  if (overall === 'MEMENUHI') return 'memenuhi';
  if (overall === 'TIDAK MEMENUHI') return 'tidak_memenuhi';
  if (overall === 'DATA TIDAK LENGKAP') return 'data_tidak_lengkap';
  if (overall === 'TIDAK BERLAKU') return 'tidak_berlaku';
  return 'belum_dievaluasi';
}

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
  const standards = ctx?.standards ?? [];
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
    const label = WASTEWATER_LABELS[key];
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
      failedParamLabels.push(label);
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

export function composeDailyEvidenceSnapshot(input: {
  record: WastewaterData;
  locationCode: string;
  locationName?: string;
  standards: EnvironmentalStandard[];
  thresholds?: InternalThresholdsConfig;
  followUpAction?: string;
  photoMeta?: {
    hasPhoto?: boolean;
    takenAt?: string;
    width?: number;
    height?: number;
    mimeType?: string;
  } | null;
}): DailyEvidenceSnapshot {
  const { record, locationCode, standards, thresholds, followUpAction, photoMeta } = input;
  const locName = input.locationName || record.location || locationCode;
  const evalResult = buildDailyEvidence(record, {
    locationCode,
    locationName: locName,
    date: record.date,
    standards,
    thresholds,
  });

  const hasPhoto = Boolean(photoMeta?.hasPhoto ?? record.hasPhoto);
  const photoDimensions =
    photoMeta?.width && photoMeta?.height ? `${photoMeta.width}x${photoMeta.height}` : undefined;

  const snapshot: DailyEvidenceSnapshot = {
    recordId: record.id,
    date: record.date,
    locationCode,
    locationName: locName,
    locationFullName: record.location || locName,
    officer: record.officer || '-',
    monitoringType: record.monitoringType || 'Harian',
    params: evalResult.params,
    overall: evalResult.overall,
    failedParams: evalResult.failedParams,
    incompleteParams: evalResult.incompleteParams,
    unverifiedParams: evalResult.unverifiedParams,
    conclusionText: evalResult.conclusionText,
    hasPhoto,
    standardsBasis: evalResult.standardsBasis,
  };

  if (record.sampleTime) snapshot.sampleTime = record.sampleTime;
  if (record.weather) snapshot.weather = record.weather;
  if (record.wastewaterSource) snapshot.wastewaterSource = record.wastewaterSource;
  if (followUpAction) snapshot.followUpAction = followUpAction;
  if (photoMeta?.takenAt) snapshot.photoTakenAt = photoMeta.takenAt;
  if (photoDimensions) snapshot.photoDimensions = photoDimensions;
  if (photoMeta?.mimeType) snapshot.photoMimeType = photoMeta.mimeType;

  return snapshot;
}

export function composeMonthlyEvidenceSnapshot(input: {
  documentNo: string;
  period: string;
  locationCode: string;
  locationName?: string;
  docSuffix?: string | null;
  records: WastewaterData[];
  standards: EnvironmentalStandard[];
  thresholds?: InternalThresholdsConfig;
  dailyDocNoByDate?: Record<string, string | null>;
}): MonthlyEvidenceSnapshot {
  const [yrStr, moStr] = input.period.split('-');
  const year = Number(yrStr);
  const month = Number(moStr);
  const recap = buildMonthlyRecap(input.records, input.locationCode, year, month, {
    standards: input.standards,
    thresholds: input.thresholds,
  });

  const dayItems: MonthlyDayItem[] = recap.days.map((d) => ({
    date: d.date,
    dayNumber: d.dayNumber,
    sampleTime: d.record?.sampleTime ?? null,
    officer: d.record?.officer ?? null,
    weather: d.record?.weather ?? null,
    ph: parseStrictNumber(d.record?.ph),
    tss: parseStrictNumber(d.record?.tss),
    debit: parseStrictNumber(d.record?.debit),
    fe: parseStrictNumber(d.record?.fe),
    mn: parseStrictNumber(d.record?.mn),
    status: d.status,
    duplicateCount: d.duplicateCount,
    dailyDocumentNo: input.dailyDocNoByDate?.[d.date] ?? null,
  }));

  return {
    documentNo: input.documentNo,
    period: input.period,
    periodLabel: getIndoMonthLabel(year, month),
    locationCode: input.locationCode,
    locationName: input.locationName || input.locationCode,
    docSuffix: input.docSuffix ?? null,
    daysInMonth: recap.daysInMonth,
    samplingDays: recap.samplingDays,
    passDays: recap.passDays,
    failDays: recap.failDays,
    incompleteDays: recap.incompleteDays,
    unevaluatedDays: recap.unevaluatedDays,
    compliancePct: recap.compliancePct,
    completenessPct: recap.completenessPct,
    overall: recap.overall,
    stats: recap.stats,
    days: dayItems,
    missingDays: recap.missingDays,
    failedParamKeys: recap.failedParamKeys,
    conclusionText: recap.conclusionText,
    standardsBasis: recap.standardsBasis,
  };
}
