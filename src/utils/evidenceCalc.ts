/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EnvironmentalStandard, WastewaterData } from '../types';
import { INITIAL_STANDARDS_SEED } from '../data/regulations';
import {
  DEBIT_STATUS_LABEL,
  formatLocaleNumber,
  evaluateEvidenceParam as sharedEvaluateEvidenceParam,
  buildDailyEvidence as sharedBuildDailyEvidence,
  selectDailyRecord,
  buildMonthlyRecap as sharedBuildMonthlyRecap,
  composeDailyEvidenceSnapshot,
  composeMonthlyEvidenceSnapshot,
  type DailyEvidenceCalcContext,
  type DailyEvidenceResult,
  type MonthlyDayEvidence,
  type MonthlyRecapResult,
} from '../../shared/evidenceCalc';

export {
  DEBIT_STATUS_LABEL,
  formatLocaleNumber,
  selectDailyRecord,
  composeDailyEvidenceSnapshot,
  composeMonthlyEvidenceSnapshot,
};
export type {
  DailyEvidenceCalcContext,
  DailyEvidenceResult,
  MonthlyDayEvidence,
  MonthlyRecapResult,
};

export function evaluateEvidenceParam(
  key: string,
  value: unknown,
  ctx?: Parameters<typeof sharedEvaluateEvidenceParam>[2]
) {
  return sharedEvaluateEvidenceParam(key, value, {
    ...ctx,
    standards:
      ctx?.standards !== undefined
        ? ctx.standards
        : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]),
  });
}

export function buildDailyEvidence(
  record: Partial<WastewaterData> & Record<string, any>,
  ctx?: DailyEvidenceCalcContext
): DailyEvidenceResult {
  return sharedBuildDailyEvidence(record, {
    ...ctx,
    standards:
      ctx?.standards !== undefined
        ? ctx.standards
        : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]),
  });
}

export function buildMonthlyRecap(
  records: WastewaterData[],
  locationCode: string,
  year: number,
  month: number,
  ctx?: {
    standards?: EnvironmentalStandard[];
    thresholds?: DailyEvidenceCalcContext['thresholds'];
  }
): MonthlyRecapResult {
  return sharedBuildMonthlyRecap(records, locationCode, year, month, {
    ...ctx,
    standards:
      ctx?.standards !== undefined
        ? ctx.standards
        : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]),
  });
}
