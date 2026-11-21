/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, getDocs, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseAuth';
import { INITIAL_STANDARDS_SEED } from '../data/regulations';
import { auditService } from '../services/auditService';
import type { EnvironmentalStandard, GhgActivityData, UserProfile } from '../types';

export interface MigrationReport {
  standardsSeeded: number;
  standardsUpdated: number;
  usersNormalized: number;
  ghgBackfilled: number;
  verifyBackfilled: number;
  notes: string[];
}

/**
 * Helper migrasi data aman (idempotent) tanpa menghapus data historis:
 * 1. Menambahkan seed standar yang belum ada (termasuk STD-WW-PERTEK-2025-TSS dengan maxLimit: null / Perlu verifikasi)
 *    serta melengkapi `effectiveTo: '2025-03-25'` dan `effectiveStatus: 'BERLAKU'` pada STD-WW-TSS lama jika belum terisi.
 * 2. Menyelaraskan dokumen user lama yang memiliki `status === 'Active'` tetapi belum memiliki `isApproved: true` atau `isActive`.
 * 3. Menandai dokumen aktivitas GRK lama yang belum memiliki `calculationStatus` atau bernilai null tanpa mengarang angka baru.
 */
export async function runSafeDataMigrations(): Promise<MigrationReport> {
  const report: MigrationReport = {
    standardsSeeded: 0,
    standardsUpdated: 0,
    usersNormalized: 0,
    ghgBackfilled: 0,
    verifyBackfilled: 0,
    notes: [],
  };
  const actor = auth.currentUser?.email || 'migration';

  // 1. Migrasi Master Baku Mutu (aditif)
  const stdSnap = await getDocs(collection(db, 'standards'));
  const existingStdMap = new Map<string, EnvironmentalStandard>();
  stdSnap.docs.forEach((d) => {
    existingStdMap.set(d.id, { ...(d.data() as EnvironmentalStandard), id: d.id });
  });

  for (const seed of INITIAL_STANDARDS_SEED) {
    const existing = existingStdMap.get(seed.id);
    if (!existing) {
      await setDoc(doc(db, 'standards', seed.id), {
        ...seed,
        createdBy: actor,
        createdAt: serverTimestamp(),
        updatedBy: actor,
        updatedAt: serverTimestamp(),
      });
      report.standardsSeeded++;
      continue;
    }

    // Jika STD-WW-TSS lama masih terbuka tanpa effectiveTo sebelum berlakunya SK Pertek 2025
    if (seed.id === 'STD-WW-TSS' && !existing.effectiveTo) {
      await updateDoc(doc(db, 'standards', seed.id), {
        effectiveTo: '2025-03-25',
        effectiveStatus: existing.effectiveStatus || 'BERLAKU',
        approvalDocNo: existing.approvalDocNo || seed.approvalDocNo,
        decreeDate: existing.decreeDate || seed.decreeDate,
        updatedBy: actor,
        updatedAt: serverTimestamp(),
      });
      report.standardsUpdated++;
    }
  }

  // 2. Normalisasi dokumen user lama agar kompatibel dengan aturan strict AND
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const uDoc of usersSnap.docs) {
      const u = uDoc.data() as Partial<UserProfile>;
      if (u.status === 'Active' && u.isApproved !== true && u.deleted !== true) {
        await updateDoc(doc(db, 'users', uDoc.id), {
          isApproved: true,
          isActive: u.isActive ?? true,
          deleted: false,
          updatedAt: serverTimestamp(),
        });
        report.usersNormalized++;
      }
    }
  } catch (err: any) {
    report.notes.push(`Lewati migrasi users (butuh hak akses Admin): ${err?.message || 'permission'}`);
  }

  // 3. Backfill calculationStatus pada aktivitas GRK lama
  try {
    const ghgSnap = await getDocs(collection(db, 'ghg_activities'));
    for (const gDoc of ghgSnap.docs) {
      const act = gDoc.data() as Partial<GhgActivityData>;
      if (!act.calculationStatus) {
        const hasVal = typeof act.emissionsTco2e === 'number' && Number.isFinite(act.emissionsTco2e);
        await updateDoc(doc(db, 'ghg_activities', gDoc.id), {
          calculationStatus: hasVal
            ? (act.referenceSourceSnapshot ? 'TERHITUNG' : 'PERLU VERIFIKASI')
            : 'BELUM TERHITUNG',
          calculationNote:
            act.calculationNote ||
            (hasVal
              ? 'Rekaman historis sebelum pemutakhiran snapshot faktor GRK; mohon verifikasi faktor.'
              : 'Belum terhitung.'),
          updatedBy: actor,
          updatedAt: serverTimestamp(),
        });
        report.ghgBackfilled++;
      }
    }
  } catch (err: any) {
    report.notes.push(`Lewati migrasi GRK: ${err?.message || 'error'}`);
  }

  // 4. Backfill reportId pada dokumen evidence_verify lama yang terikat ke evidence_reports
  try {
    const reportsSnap = await getDocs(collection(db, 'evidence_reports'));
    for (const rDoc of reportsSnap.docs) {
      const rData = rDoc.data() as { id?: string; documentNo?: string; verifyToken?: string };
      if (!rData.verifyToken) continue;
      const vRef = doc(db, 'evidence_verify', rData.verifyToken);
      const { getDoc: getFirestoreDoc } = await import('firebase/firestore');
      const vSnap = await getFirestoreDoc(vRef);
      if (vSnap.exists() && !vSnap.data()?.reportId) {
        await updateDoc(vRef, { reportId: rData.id || rDoc.id });
        report.verifyBackfilled++;
      }
    }
  } catch (err: any) {
    report.notes.push(`Lewati backfill reportId evidence_verify: ${err?.message || 'error'}`);
  }

  await auditService.createLog({
    collection: 'app_meta',
    recordId: 'safe-migration-v3.1',
    module: 'admin_migration',
    action: 'update',
    details: `Migrasi data aman selesai: +${report.standardsSeeded} standar, ~${report.standardsUpdated} standar diperbarui, ${report.usersNormalized} user diselaraskan, ${report.ghgBackfilled} GRK ditandai, ${report.verifyBackfilled} verifikasi QR ditautkan.`,
  }).catch(() => {});

  return report;
}
