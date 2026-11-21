/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WasteIn,
  WasteOut,
  WasteStock,
  WasteLedgerResult,
  WasteBatchAllocation,
  WasteInLedgerInfo,
  WasteOutLedgerInfo,
  BatchWarning,
} from '../types';
import { getTimeMs, daysBetweenLocal } from './dateUtils';
import {
  findCatalogCode,
  getMaxStorageDaysForWaste,
  WasteCatalogItem,
  wasteB3Catalog,
} from '../constants/wasteCatalog';

export function round3(val: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 1000) / 1000;
}

export interface BuildWasteLedgerOptions {
  /** Tanggal potong historis (YYYY-MM-DD); transaksi setelah tanggal ini diabaikan untuk saldo historis */
  asOfDate?: string;
  catalog?: WasteCatalogItem[];
}

function diffDaysBetweenDates(fromDateStr: string, toDateStr?: string): number {
  if (!toDateStr) {
    return daysBetweenLocal(fromDateStr);
  }
  const [fy, fm, fd] = fromDateStr.split('-').map(Number);
  const [ty, tm, td] = toDateStr.split('-').map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;
  const start = new Date(fy, fm - 1, fd).setHours(0, 0, 0, 0);
  const end = new Date(ty, tm - 1, td).setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

/**
 * Membangun ledger inventaris limbah B3 FIFO murni (pure function tanpa side effect).
 * - Menggunakan masa simpan spesifik per jenis limbah (90 / 180 / 365 hari) dari katalog.
 * - Mendukung filter tanggal potong `asOfDate` sehingga transaksi masuk/keluar setelah `asOfDate`
 *   tidak mengotori saldo dan umur simpan historis.
 */
export function buildWasteLedger(
  wasteIn: WasteIn[],
  wasteOut: WasteOut[],
  options?: BuildWasteLedgerOptions
): WasteLedgerResult {
  const asOfDate = options?.asOfDate;
  const catalog = options?.catalog ?? wasteB3Catalog;
  const inById: Record<string, WasteInLedgerInfo> = {};
  const outById: Record<string, WasteOutLedgerInfo> = {};
  let hasInconsistency = false;

  const scopedIn = asOfDate
    ? wasteIn.filter((w) => !w.dateIn || w.dateIn <= asOfDate)
    : wasteIn;
  const scopedOut = asOfDate
    ? wasteOut.filter((w) => !w.dateOut || w.dateOut <= asOfDate)
    : wasteOut;

  const wasteTypeSet = new Set<string>();
  scopedIn.forEach((item) => {
    if (item.wasteType) wasteTypeSet.add(item.wasteType);
  });
  scopedOut.forEach((item) => {
    if (item.wasteType) wasteTypeSet.add(item.wasteType);
  });
  const wasteTypes = Array.from(wasteTypeSet);

  const stocks: WasteStock[] = [];

  for (const type of wasteTypes) {
    const inputs = scopedIn
      .filter((w) => w.wasteType === type)
      .map((w) => ({ ...w, weightKg: round3(w.weightKg) }))
      .sort((a, b) => {
        if (a.dateIn !== b.dateIn) return a.dateIn.localeCompare(b.dateIn);
        const timeA = getTimeMs(a.createdAt);
        const timeB = getTimeMs(b.createdAt);
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || '').localeCompare(b.id || '');
      });

    const outputs = scopedOut
      .filter((w) => w.wasteType === type)
      .map((w) => ({ ...w, weightKg: round3(w.weightKg) }))
      .sort((a, b) => {
        if (a.dateOut !== b.dateOut) return a.dateOut.localeCompare(b.dateOut);
        const timeA = getTimeMs(a.createdAt);
        const timeB = getTimeMs(b.createdAt);
        if (timeA !== timeB) return timeA - timeB;
        return (a.id || '').localeCompare(b.id || '');
      });

    const code = inputs[0]?.code || findCatalogCode(type);
    const storageRule = getMaxStorageDaysForWaste(type, code, catalog);

    const remainingMap: Record<string, number> = {};
    const usedMap: Record<string, number> = {};
    inputs.forEach((inp) => {
      remainingMap[inp.id] = inp.weightKg;
      usedMap[inp.id] = 0;
    });

    for (const out of outputs) {
      let needed = out.weightKg;
      const allocations: WasteBatchAllocation[] = [];

      for (const batch of inputs) {
        if (needed <= 0) break;
        if (batch.dateIn > out.dateOut) {
          continue;
        }
        const avail = remainingMap[batch.id] || 0;
        if (avail > 0) {
          const take = round3(Math.min(needed, avail));
          if (take > 0) {
            allocations.push({
              inId: batch.id,
              dateIn: batch.dateIn,
              kg: take,
            });
            remainingMap[batch.id] = round3(avail - take);
            usedMap[batch.id] = round3((usedMap[batch.id] || 0) + take);
            needed = round3(needed - take);
          }
        }
      }

      const shortfallKg = needed > 0 ? needed : 0;
      if (shortfallKg > 0) {
        hasInconsistency = true;
      }

      outById[out.id] = {
        allocations,
        shortfallKg,
      };
    }

    for (const batch of inputs) {
      const weightUsed = round3(usedMap[batch.id] || 0);
      const weightRemaining = round3(remainingMap[batch.id] ?? batch.weightKg);

      let status: 'Tersedia' | 'Sebagian Keluar' | 'Habis';
      if (weightRemaining <= 0) {
        status = 'Habis';
      } else if (weightUsed > 0) {
        status = 'Sebagian Keluar';
      } else {
        status = 'Tersedia';
      }

      let daysInTps = 0;
      let daysRemaining = storageRule.maxStorageDays;
      if (weightRemaining > 0) {
        daysInTps = diffDaysBetweenDates(batch.dateIn, asOfDate);
        daysRemaining = storageRule.maxStorageDays - daysInTps;
      }

      inById[batch.id] = {
        weightUsed,
        weightRemaining,
        status,
        daysInTps,
        daysRemaining,
        maxStorageDays: storageRule.maxStorageDays,
        verificationStatus: storageRule.verificationStatus,
      };
    }

    const totalIn = round3(inputs.reduce((sum, item) => sum + item.weightKg, 0));
    const totalOut = round3(outputs.reduce((sum, item) => sum + item.weightKg, 0));
    const currentStock = round3(totalIn - totalOut);

    if (currentStock < 0) {
      hasInconsistency = true;
    }

    const activeBatches = inputs.filter((b) => (remainingMap[b.id] || 0) > 0);
    let earliestDateIn: string | null = null;
    let maxDaysInTps = 0;
    const batchWarnings: BatchWarning[] = [];

    if (activeBatches.length > 0) {
      const oldestActive = activeBatches[0];
      earliestDateIn = oldestActive.dateIn;
      maxDaysInTps = inById[oldestActive.id]?.daysInTps || 0;

      activeBatches.forEach((b) => {
        const info = inById[b.id];
        batchWarnings.push({
          batchId: b.id,
          weightRemaining: info?.weightRemaining || 0,
          daysRemaining: info?.daysRemaining ?? storageRule.maxStorageDays,
          maxStorageDays: storageRule.maxStorageDays,
          entryDate: b.dateIn,
          verificationStatus: storageRule.verificationStatus,
        });
      });
    }

    const typeHasShortfall =
      outputs.some((o) => (outById[o.id]?.shortfallKg || 0) > 0) || currentStock < 0;
    const totalShortfallKg = round3(
      outputs.reduce((sum, o) => sum + (outById[o.id]?.shortfallKg || 0), 0)
    );

    stocks.push({
      wasteType: type,
      code,
      totalIn,
      totalOut,
      currentStock,
      earliestDateIn,
      daysInTps: currentStock > 0 ? maxDaysInTps : 0,
      maxStorageDays: storageRule.maxStorageDays,
      storageBasis: storageRule.storageBasis,
      verificationStatus: storageRule.verificationStatus,
      batchWarnings,
      hasShortfall: typeHasShortfall,
      shortfallKg: totalShortfallKg,
    });
  }

  return {
    stocks,
    inById,
    outById,
    hasInconsistency,
  };
}

/**
 * Menghitung stok historis tersedia tepat pada tanggal `targetDateOut`.
 * HANYA memperhitungkan transaksi masuk (dateIn <= targetDateOut) dan transaksi keluar (dateOut <= targetDateOut).
 */
export function getAvailableStockAtDate(
  wasteIn: WasteIn[],
  wasteOut: WasteOut[],
  wasteType: string,
  targetDateOut: string,
  excludeOutId?: string | null
): number {
  if (!targetDateOut || !wasteType) return 0;

  const filteredOut = excludeOutId
    ? wasteOut.filter((o) => o.id !== excludeOutId)
    : wasteOut;

  const ledger = buildWasteLedger(wasteIn, filteredOut, { asOfDate: targetDateOut });
  const stock = ledger.stocks.find((s) => s.wasteType === wasteType);
  if (!stock) return 0;

  return round3(Math.max(0, stock.currentStock));
}

/**
 * Simulasi kandidat penambahan/perubahan/penghapusan manifest keluar pada seluruh ledger historis & berjalan.
 * Menolak stok negatif tanpa otorisasi koreksi eksplisit (Superintendent/Admin + alasan koreksi).
 */
export function simulateOutflowValidation(
  wasteIn: WasteIn[],
  wasteOut: WasteOut[],
  candidate: WasteOut,
  isEdit = false,
  correctionOverride?: { authorized: boolean; reason?: string }
): {
  isValid: boolean;
  errorMessage?: string;
  shortfallKg: number;
  availableKg: number;
} {
  const candidateId = candidate.id || 'WO-CANDIDATE';
  const cleanCandidate: WasteOut = {
    ...candidate,
    id: candidateId,
    weightKg: round3(candidate.weightKg),
  };

  const candidateList = isEdit
    ? wasteOut.map((o) => (o.id === cleanCandidate.id ? cleanCandidate : o))
    : [...wasteOut, cleanCandidate];

  const ledger = buildWasteLedger(wasteIn, candidateList);
  const candInfo = ledger.outById[candidateId];
  const candShortfall = candInfo ? candInfo.shortfallKg : 0;

  const availableKg = getAvailableStockAtDate(
    wasteIn,
    wasteOut,
    cleanCandidate.wasteType,
    cleanCandidate.dateOut,
    isEdit ? cleanCandidate.id : null
  );

  if (candShortfall > 0) {
    if (
      correctionOverride?.authorized &&
      correctionOverride.reason &&
      correctionOverride.reason.trim().length >= 5
    ) {
      return {
        isValid: true,
        shortfallKg: candShortfall,
        availableKg,
      };
    }
    return {
      isValid: false,
      errorMessage: `Stok tidak mencukupi untuk jenis limbah "${cleanCandidate.wasteType}" pada tanggal ${cleanCandidate.dateOut}. Stok tersedia: ${availableKg.toLocaleString('id-ID')} Kg (diminta: ${cleanCandidate.weightKg.toLocaleString('id-ID')} Kg). Diperlukan otorisasi koreksi & alasan resmi untuk selisih stok.`,
      shortfallKg: candShortfall,
      availableKg,
    };
  }

  const otherShortfall = candidateList.find(
    (o) => o.id !== candidateId && (ledger.outById[o.id]?.shortfallKg || 0) > 0
  );

  if (otherShortfall) {
    const starvedShortfall = ledger.outById[otherShortfall.id]?.shortfallKg || 0;
    return {
      isValid: false,
      errorMessage: `Pengeluaran ini menyebabkan manifest ${otherShortfall.manifestNo || otherShortfall.id} pada tanggal ${otherShortfall.dateOut} kekurangan stok sebesar ${starvedShortfall.toLocaleString('id-ID')} Kg.`,
      shortfallKg: starvedShortfall,
      availableKg,
    };
  }

  return {
    isValid: true,
    shortfallKg: 0,
    availableKg,
  };
}
