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
  BatchWarning
} from '../types';
import { getTimeMs, daysBetweenLocal } from './dateUtils';
import { 
  findCatalogCode, 
  DEFAULT_MAX_STORAGE_DAYS 
} from '../constants/wasteCatalog';

/**
 * Helper pembulatan ke 3 desimal untuk menghindari galat floating point (mis. 0.1 + 0.2)
 */
export function round3(val: number): number {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 1000) / 1000;
}

/**
 * Membangun ledger inventaris limbah B3 FIFO murni (pure function tanpa side effect).
 * Mengurangi batch masuk tertua yang dateIn <= dateOut (FIFO).
 */
export function buildWasteLedger(
  wasteIn: WasteIn[],
  wasteOut: WasteOut[]
): WasteLedgerResult {
  const inById: Record<string, WasteInLedgerInfo> = {};
  const outById: Record<string, WasteOutLedgerInfo> = {};
  let hasInconsistency = false;

  // Kumpulkan semua jenis limbah unik
  const wasteTypeSet = new Set<string>();
  wasteIn.forEach(item => {
    if (item.wasteType) wasteTypeSet.add(item.wasteType);
  });
  wasteOut.forEach(item => {
    if (item.wasteType) wasteTypeSet.add(item.wasteType);
  });
  const wasteTypes = Array.from(wasteTypeSet);

  const stocks: WasteStock[] = [];

  for (const type of wasteTypes) {
    // 1. Ambil catatan masuk untuk jenis ini & urutkan:
    // dateIn ASC, lalu createdAt ASC, lalu id ASC
    const inputs = wasteIn
      .filter(w => w.wasteType === type)
      .map(w => ({ ...w, weightKg: round3(w.weightKg) }))
      .sort((a, b) => {
        if (a.dateIn !== b.dateIn) {
          return a.dateIn.localeCompare(b.dateIn);
        }
        const timeA = getTimeMs(a.createdAt);
        const timeB = getTimeMs(b.createdAt);
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return (a.id || '').localeCompare(b.id || '');
      });

    // 2. Ambil catatan keluar untuk jenis ini & urutkan kronologis:
    // dateOut ASC, lalu createdAt ASC, lalu id ASC
    const outputs = wasteOut
      .filter(w => w.wasteType === type)
      .map(w => ({ ...w, weightKg: round3(w.weightKg) }))
      .sort((a, b) => {
        if (a.dateOut !== b.dateOut) {
          return a.dateOut.localeCompare(b.dateOut);
        }
        const timeA = getTimeMs(a.createdAt);
        const timeB = getTimeMs(b.createdAt);
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return (a.id || '').localeCompare(b.id || '');
      });

    // Inisialisasi pool sisa dan pemakaian per batch masuk
    const remainingMap: Record<string, number> = {};
    const usedMap: Record<string, number> = {};
    inputs.forEach(inp => {
      remainingMap[inp.id] = inp.weightKg;
      usedMap[inp.id] = 0;
    });

    // 3. Proses setiap pengeluaran secara FIFO
    for (const out of outputs) {
      let needed = out.weightKg;
      const allocations: WasteBatchAllocation[] = [];

      // Cari batch masuk tertua yang dateIn <= dateOut dan masih ada sisa
      for (const batch of inputs) {
        if (needed <= 0) break;
        if (batch.dateIn > out.dateOut) {
          // Batch ini masuk SETELAH tanggal pengeluaran, tidak boleh dialokasikan
          continue;
        }

        const avail = remainingMap[batch.id] || 0;
        if (avail > 0) {
          const take = round3(Math.min(needed, avail));
          if (take > 0) {
            allocations.push({
              inId: batch.id,
              dateIn: batch.dateIn,
              kg: take
            });
            remainingMap[batch.id] = round3(avail - take);
            usedMap[batch.id] = round3((usedMap[batch.id] || 0) + take);
            needed = round3(needed - take);
          }
        }
      }

      // Jika kebutuhan melebihi sisa yang tersedia pada tanggal itu, catat shortfall
      const shortfallKg = needed > 0 ? needed : 0;
      if (shortfallKg > 0) {
        hasInconsistency = true;
      }

      outById[out.id] = {
        allocations,
        shortfallKg
      };
    }

    // 4. Hitung info ledger untuk setiap batch masuk
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

      // Umur (daysInTps) dihitung hanya untuk batch yang sisanya > 0
      let daysInTps = 0;
      let daysRemaining = DEFAULT_MAX_STORAGE_DAYS;
      if (weightRemaining > 0) {
        daysInTps = daysBetweenLocal(batch.dateIn);
        daysRemaining = DEFAULT_MAX_STORAGE_DAYS - daysInTps;
      }

      inById[batch.id] = {
        weightUsed,
        weightRemaining,
        status,
        daysInTps,
        daysRemaining
      };
    }

    // 5. Hitung total stok aktual (TANPA Math.max(0))
    const totalIn = round3(inputs.reduce((sum, item) => sum + item.weightKg, 0));
    const totalOut = round3(outputs.reduce((sum, item) => sum + item.weightKg, 0));
    const currentStock = round3(totalIn - totalOut);

    if (currentStock < 0) {
      hasInconsistency = true;
    }

    // Kode katalog jika tidak ada input
    const code = inputs[0]?.code || findCatalogCode(type);

    // Cari batch tertua yang masih memiliki sisa stok
    const activeBatches = inputs.filter(b => (remainingMap[b.id] || 0) > 0);
    let earliestDateIn: string | null = null;
    let maxDaysInTps = 0;
    const batchWarnings: BatchWarning[] = [];

    if (activeBatches.length > 0) {
      // activeBatches sudah urut ASC berdasarkan dateIn
      const oldestActive = activeBatches[0];
      earliestDateIn = oldestActive.dateIn;
      maxDaysInTps = inById[oldestActive.id]?.daysInTps || 0;

      activeBatches.forEach(b => {
        const info = inById[b.id];
        batchWarnings.push({
          batchId: b.id,
          weightRemaining: info?.weightRemaining || 0,
          daysRemaining: info?.daysRemaining || 0,
          entryDate: b.dateIn
        });
      });
    }

    const typeHasShortfall = outputs.some(o => (outById[o.id]?.shortfallKg || 0) > 0) || currentStock < 0;
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
      batchWarnings,
      hasShortfall: typeHasShortfall,
      shortfallKg: totalShortfallKg
    });
  }

  return {
    stocks,
    inById,
    outById,
    hasInconsistency
  };
}

/**
 * Menghitung stok tersedia untuk jenis limbah tertentu pada tanggal pengeluaran tertentu.
 * Hanya batch dengan dateIn <= dateOut yang belum terpakai oleh manifest lain yang dihitung.
 */
export function getAvailableStockAtDate(
  wasteIn: WasteIn[],
  wasteOut: WasteOut[],
  wasteType: string,
  targetDateOut: string,
  excludeOutId?: string | null
): number {
  if (!targetDateOut || !wasteType) return 0;
  
  // Saring output lain selain yang sedang diedit
  const filteredOut = excludeOutId 
    ? wasteOut.filter(o => o.id !== excludeOutId)
    : wasteOut;

  // Jalankan ledger dasar untuk mengetahui sisa batch aktual setelah pengeluaran lain
  const ledger = buildWasteLedger(wasteIn, filteredOut);

  // Jumlahkan sisa stok pada batch yang tanggal masuknya <= targetDateOut
  const eligibleInputs = wasteIn.filter(
    inp => inp.wasteType === wasteType && inp.dateIn <= targetDateOut
  );

  const available = eligibleInputs.reduce((sum, inp) => {
    const info = ledger.inById[inp.id];
    return sum + (info ? info.weightRemaining : inp.weightKg);
  }, 0);

  return round3(Math.max(0, available));
}

/**
 * Simulasi kandidat penambahan/perubahan/penghapusan manifest keluar pada seluruh ledger.
 * Menjamin tidak ada shortfall pada manifest manapun (baik kandidat maupun manifest lain).
 */
export function simulateOutflowValidation(
  wasteIn: WasteIn[],
  wasteOut: WasteOut[],
  candidate: WasteOut,
  isEdit = false
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
    weightKg: round3(candidate.weightKg)
  };

  const candidateList = isEdit
    ? wasteOut.map(o => (o.id === cleanCandidate.id ? cleanCandidate : o))
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
    return {
      isValid: false,
      errorMessage: `Stok tidak mencukupi untuk jenis limbah "${cleanCandidate.wasteType}" pada tanggal ${cleanCandidate.dateOut}. Stok tersedia: ${availableKg.toLocaleString('id-ID')} Kg (diminta: ${cleanCandidate.weightKg.toLocaleString('id-ID')} Kg).`,
      shortfallKg: candShortfall,
      availableKg
    };
  }

  // Periksa apakah manifest lain kekurangan stok akibat pengeluaran ini
  const otherShortfall = candidateList.find(
    o => o.id !== candidateId && (ledger.outById[o.id]?.shortfallKg || 0) > 0
  );

  if (otherShortfall) {
    const starvedShortfall = ledger.outById[otherShortfall.id]?.shortfallKg || 0;
    return {
      isValid: false,
      errorMessage: `Pengeluaran ini menyebabkan manifest ${otherShortfall.manifestNo || otherShortfall.id} pada tanggal ${otherShortfall.dateOut} kekurangan stok sebesar ${starvedShortfall.toLocaleString('id-ID')} Kg.`,
      shortfallKg: starvedShortfall,
      availableKg
    };
  }

  return {
    isValid: true,
    shortfallKg: 0,
    availableKg
  };
}
