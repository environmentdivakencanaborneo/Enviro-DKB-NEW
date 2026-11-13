/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReclamationGuarantee } from '../types';
import { daysUntilLocal } from './dateUtils';

export interface GuaranteeMetrics {
  totalActiveValue: number;
  activeCount: number;
  renewalCount: number;
  expiringCount: number;
  totalActiveAndRenewalCount: number;
}

/**
 * Menghitung metrik agregat Jaminan Reklamasi (Escrow) secara konsisten di seluruh modul:
 * - totalActiveValue: Jumlah nilai jaminan dengan status 'Active' + 'Renewal Needed'
 * - activeCount: Jumlah dokumen berstatus 'Active'
 * - renewalCount: Jumlah dokumen berstatus 'Renewal Needed'
 * - expiringCount: Jumlah dokumen berstatus 'Active' dengan sisa masa berlaku <= 90 hari (WITA)
 */
export function calculateGuaranteeMetrics(guarantees: ReclamationGuarantee[] = []): GuaranteeMetrics {
  let totalActiveValue = 0;
  let activeCount = 0;
  let renewalCount = 0;
  let expiringCount = 0;

  for (const g of guarantees) {
    const isUnderActive = g.status === 'Active' || g.status === 'Renewal Needed';
    if (isUnderActive) {
      totalActiveValue += (Number(g.value) || 0);
    }

    if (g.status === 'Active') {
      activeCount += 1;
      if (g.dueDate) {
        const diffDays = daysUntilLocal(g.dueDate);
        if (diffDays <= 90) {
          expiringCount += 1;
        }
      }
    } else if (g.status === 'Renewal Needed') {
      renewalCount += 1;
    }
  }

  return {
    totalActiveValue,
    activeCount,
    renewalCount,
    expiringCount,
    totalActiveAndRenewalCount: activeCount + renewalCount
  };
}
