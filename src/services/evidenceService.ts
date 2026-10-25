/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  onSnapshot, 
  query, 
  where, 
  runTransaction, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../utils/firebaseAuth';
import { 
  EvidenceReport, 
  DailyEvidenceSnapshot, 
  MonthlyEvidenceSnapshot,
  EvidenceSignature, 
  EvidenceVerification 
} from '../types';
import { computeSnapshotHash, generateRandomToken } from '../utils/hash';
import { auditService } from './auditService';
import { triggerToast } from '../utils/errorHandler';
import { getOfflineCache, setOfflineCache } from '../utils/googleSync';

export const evidenceService = {
  subscribe: (
    period: string, // YYYY-MM
    locationCode: string,
    callback: (reports: EvidenceReport[]) => void
  ) => {
    const cacheKey = `evidence_${period}_${locationCode}`;
    const cached = getOfflineCache<EvidenceReport[]>(cacheKey, []);
    if (cached.length > 0) {
      callback(cached);
    }

    const q = query(
      collection(db, 'evidence_reports'),
      where('period', '==', period),
      where('locationCode', '==', locationCode)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => d.data() as EvidenceReport);
        setOfflineCache(cacheKey, docs);
        callback(docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'evidence_reports');
      }
    );
  },

  getReport: async (id: string): Promise<EvidenceReport | null> => {
    try {
      const snap = await getDoc(doc(db, 'evidence_reports', id));
      if (snap.exists()) {
        return snap.data() as EvidenceReport;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `evidence_reports/${id}`);
      return null;
    }
  },

  /**
   * Terbitkan Evidence Harian dalam satu runTransaction:
   * - Menghitung nomor urut dokumen berurutan unik per tahun: FR-EMS-WQ-YYYY-xxxxx
   * - Menghitung hash SHA-256 snapshot
   * - Menghasilkan verifyToken acak 16 karakter
   * - Menulis dokumen ke evidence_reports dan evidence_verify (publik minimal)
   */
  publishDailyEvidence: async ({
    id,
    period,
    locationCode,
    wastewaterId,
    date,
    snapshot,
    preparedSignature,
    followUpAction,
  }: {
    id: string; // WQD-${kodeTitik}-${YYYYMMDD}
    period: string; // YYYY-MM
    locationCode: string;
    wastewaterId: string;
    date: string; // YYYY-MM-DD
    snapshot: DailyEvidenceSnapshot;
    preparedSignature: EvidenceSignature;
    followUpAction?: string;
  }): Promise<EvidenceReport> => {
    const year = date.split('-')[0] || new Date().getFullYear().toString();
    const counterDocId = `evidence-daily-${year}`;
    const counterRef = doc(db, 'counters', counterDocId);
    const reportRef = doc(db, 'evidence_reports', id);
    const verifyToken = generateRandomToken(16);
    const verifyRef = doc(db, 'evidence_verify', verifyToken);

    // Compute cryptographic SHA-256 hash
    const snapshotHash = await computeSnapshotHash(snapshot);
    const userEmail = auth.currentUser?.email || preparedSignature.email;

    return await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      let seq = 1;
      if (counterSnap.exists()) {
        seq = Number(counterSnap.data()?.value || 0) + 1;
      }

      const documentNo = `FR-EMS-WQ-${year}-${String(seq).padStart(5, '0')}`;
      const issuedAt = new Date().toISOString();

      const newReport: EvidenceReport = {
        id,
        type: 'daily',
        documentNo,
        revision: 0,
        period,
        locationCode,
        wastewaterId,
        date,
        status: 'Disiapkan',
        snapshot,
        snapshotHash,
        signatures: {
          prepared: preparedSignature,
        },
        issuedAt,
        verifyToken,
        revisionHistory: [],
        followUpAction: followUpAction || snapshot.followUpAction,
        createdAt: serverTimestamp(),
        createdBy: userEmail,
        updatedAt: serverTimestamp(),
        updatedBy: userEmail,
      };

      const publicVerification: EvidenceVerification = {
        documentNo,
        type: 'daily',
        period,
        locationCode,
        issuedAt,
        status: 'Disiapkan',
        overall: snapshot.overall,
        hashPrefix: snapshotHash.slice(0, 12),
      };

      // 1. Increment counter atomically
      transaction.set(counterRef, {
        value: seq,
        updatedAt: serverTimestamp(),
      });

      // 2. Write full evidence report
      transaction.set(reportRef, newReport);

      // 3. Write public minimal verify document
      transaction.set(verifyRef, publicVerification);

      return newReport;
    }).then(async (published) => {
      await auditService.createLog({
        collection: 'evidence_reports',
        recordId: id,
        action: 'insert',
        details: `Menerbitkan Evidence Harian ${published.documentNo} (${locationCode}, ${date})`,
      });

      triggerToast(`Dokumen ${published.documentNo} berhasil diterbitkan`, 'success');
      return published;
    }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `evidence_reports/${id}`);
      throw err;
    });
  },

  /**
   * Menandatangani kolom "Diperiksa oleh":
   * Role harus Foreman / Superintendent / Manager / Admin, dan email harus berbeda dari penyiap.
   */
  signReviewed: async (
    reportId: string,
    reviewedSignature: EvidenceSignature
  ): Promise<void> => {
    const reportRef = doc(db, 'evidence_reports', reportId);
    const snap = await getDoc(reportRef);
    if (!snap.exists()) {
      throw new Error('Dokumen evidence tidak ditemukan');
    }

    const report = snap.data() as EvidenceReport;
    if (report.signatures.prepared?.email === reviewedSignature.email) {
      throw new Error('Pemeriksa tidak boleh orang yang sama dengan penyiap dokumen.');
    }

    const userEmail = auth.currentUser?.email || reviewedSignature.email;

    try {
      await updateDoc(reportRef, {
        'signatures.reviewed': reviewedSignature,
        status: 'Diperiksa',
        updatedAt: serverTimestamp(),
        updatedBy: userEmail,
      });

      if (report.verifyToken) {
        await updateDoc(doc(db, 'evidence_verify', report.verifyToken), {
          status: 'Diperiksa',
        });
      }

      await auditService.createLog({
        collection: 'evidence_reports',
        recordId: reportId,
        action: 'update',
        details: `Dokumen ${report.documentNo} diverifikasi oleh ${reviewedSignature.name} (${reviewedSignature.position})`,
      });

      triggerToast('Pemeriksaan dokumen berhasil ditandatangani', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `evidence_reports/${reportId}`);
      throw err;
    }
  },

  /**
   * Terbitkan Evidence Bulanan (Rekap) secara deterministik:
   * ID: WQM-${locationCode}-${YYYYMM}
   * Nomor: FR-EMS-WQ-${YYYY}-M${MM}${docSuffix ? `-${docSuffix}` : ''}
   */
  publishMonthlyEvidence: async ({
    id,
    period,
    locationCode,
    docSuffix,
    snapshot,
    preparedSignature,
  }: {
    id: string; // WQM-${kodeTitik}-${YYYYMM}
    period: string; // YYYY-MM
    locationCode: string;
    docSuffix?: string;
    snapshot: MonthlyEvidenceSnapshot;
    preparedSignature: EvidenceSignature;
  }): Promise<EvidenceReport> => {
    const [year, month] = period.split('-');
    const suffixPart = docSuffix ? `-${docSuffix}` : '';
    const documentNo = `FR-EMS-WQ-${year}-M${month}${suffixPart}`;
    const issuedAt = new Date().toISOString();
    const verifyToken = generateRandomToken(16);
    const snapshotWithDocNo = {
      ...snapshot,
      documentNo,
    };
    const snapshotHash = await computeSnapshotHash(snapshotWithDocNo);
    const userEmail = auth.currentUser?.email || preparedSignature.email;

    const reportRef = doc(db, 'evidence_reports', id);
    const verifyRef = doc(db, 'evidence_verify', verifyToken);

    const newReport: EvidenceReport = {
      id,
      type: 'monthly',
      documentNo,
      revision: 0,
      period,
      locationCode,
      status: 'Disiapkan',
      snapshot: snapshotWithDocNo,
      snapshotHash,
      signatures: {
        prepared: preparedSignature,
      },
      issuedAt,
      verifyToken,
      revisionHistory: [],
      createdAt: serverTimestamp(),
      createdBy: userEmail,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail,
    };

    const publicVerification: EvidenceVerification = {
      documentNo,
      type: 'monthly',
      period,
      locationCode,
      issuedAt,
      status: 'Disiapkan',
      overall: snapshot.overall,
      hashPrefix: snapshotHash.slice(0, 12),
    };

    try {
      await setDoc(reportRef, newReport);
      await setDoc(verifyRef, publicVerification);

      await auditService.createLog({
        collection: 'evidence_reports',
        recordId: id,
        action: 'insert',
        details: `Menerbitkan Evidence Bulanan ${documentNo} (${locationCode}, Periode ${period})`,
      });

      triggerToast(`Dokumen bulanan ${documentNo} berhasil diterbitkan`, 'success');
      return newReport;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `evidence_reports/${id}`);
      throw err;
    }
  },

  /**
   * Menandatangani kolom "Disetujui oleh" untuk Rekap Bulanan:
   * Role harus Environment Manager atau Admin.
   * Email harus berbeda dari penyiap dan pemeriksa!
   */
  signApproved: async (
    reportId: string,
    approvedSignature: EvidenceSignature
  ): Promise<void> => {
    const reportRef = doc(db, 'evidence_reports', reportId);
    const snap = await getDoc(reportRef);
    if (!snap.exists()) {
      throw new Error('Dokumen evidence tidak ditemukan');
    }

    const report = snap.data() as EvidenceReport;
    if (report.signatures.prepared?.email === approvedSignature.email) {
      throw new Error('Penyetuju tidak boleh orang yang sama dengan penyiap dokumen.');
    }
    if (report.signatures.reviewed?.email === approvedSignature.email) {
      throw new Error('Penyetuju tidak boleh orang yang sama dengan pemeriksa dokumen.');
    }

    const userEmail = auth.currentUser?.email || approvedSignature.email;

    try {
      await updateDoc(reportRef, {
        'signatures.approved': approvedSignature,
        status: 'Disetujui',
        updatedAt: serverTimestamp(),
        updatedBy: userEmail,
      });

      if (report.verifyToken) {
        await updateDoc(doc(db, 'evidence_verify', report.verifyToken), {
          status: 'Disetujui',
        });
      }

      await auditService.createLog({
        collection: 'evidence_reports',
        recordId: reportId,
        action: 'update',
        details: `Dokumen ${report.documentNo} disetujui oleh ${approvedSignature.name} (${approvedSignature.position})`,
      });

      triggerToast('Persetujuan dokumen bulanan berhasil ditandatangani', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `evidence_reports/${reportId}`);
      throw err;
    }
  },

  /**
   * Menerbitkan Revisi Dokumen jika data sumber berubah setelah terbit:
   * - Nomor dokumen TETAP sama
   * - revision bertambah (+1)
   * - Tanda tangan direset (diisi tanda tangan penyiap baru)
   * - Riwayat revisi dicatat
   */
  publishRevision: async (
    reportId: string,
    newSnapshot: DailyEvidenceSnapshot | MonthlyEvidenceSnapshot,
    preparedSignature: EvidenceSignature,
    revisionReason?: string
  ): Promise<void> => {
    const reportRef = doc(db, 'evidence_reports', reportId);
    const snap = await getDoc(reportRef);
    if (!snap.exists()) {
      throw new Error('Dokumen evidence tidak ditemukan');
    }

    const oldReport = snap.data() as EvidenceReport;
    const newHash = await computeSnapshotHash(newSnapshot);
    const userEmail = auth.currentUser?.email || preparedSignature.email;
    const nextRevision = (oldReport.revision || 0) + 1;

    const revisionItem = {
      revision: oldReport.revision || 0,
      revisedAt: new Date().toISOString(),
      revisedBy: userEmail,
      reason: revisionReason || 'Penyesuaian data sumber pengujian lapangan',
      previousHash: oldReport.snapshotHash,
    };

    const newHistory = [...(oldReport.revisionHistory || []), revisionItem];

    try {
      await updateDoc(reportRef, {
        revision: nextRevision,
        snapshot: newSnapshot,
        snapshotHash: newHash,
        status: 'Disiapkan',
        signatures: {
          prepared: preparedSignature,
        },
        revisionHistory: newHistory,
        updatedAt: serverTimestamp(),
        updatedBy: userEmail,
      });

      if (oldReport.verifyToken) {
        await updateDoc(doc(db, 'evidence_verify', oldReport.verifyToken), {
          status: 'Disiapkan',
          overall: newSnapshot.overall,
          hashPrefix: newHash.slice(0, 12),
        });
      }

      await auditService.createLog({
        collection: 'evidence_reports',
        recordId: reportId,
        action: 'update',
        details: `Menerbitkan Revisi ${String(nextRevision).padStart(2, '0')} untuk dokumen ${oldReport.documentNo}`,
      });

      triggerToast(`Revisi ${String(nextRevision).padStart(2, '0')} berhasil diterbitkan`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `evidence_reports/${reportId}`);
      throw err;
    }
  },

  /**
   * Membatalkan dokumen (Hanya Admin). Dokumen tidak pernah dihapus.
   */
  cancelReport: async (
    reportId: string,
    cancellationReason: string
  ): Promise<void> => {
    if (!cancellationReason.trim()) {
      throw new Error('Alasan pembatalan dokumen wajib diisi.');
    }

    const reportRef = doc(db, 'evidence_reports', reportId);
    const snap = await getDoc(reportRef);
    if (!snap.exists()) {
      throw new Error('Dokumen evidence tidak ditemukan');
    }

    const report = snap.data() as EvidenceReport;
    const userEmail = auth.currentUser?.email || 'admin';

    try {
      await updateDoc(reportRef, {
        status: 'Dibatalkan',
        cancellationReason: cancellationReason.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: userEmail,
      });

      if (report.verifyToken) {
        await updateDoc(doc(db, 'evidence_verify', report.verifyToken), {
          status: 'Dibatalkan',
        });
      }

      await auditService.createLog({
        collection: 'evidence_reports',
        recordId: reportId,
        action: 'update',
        details: `Membatalkan dokumen ${report.documentNo}. Alasan: ${cancellationReason}`,
      });

      triggerToast(`Dokumen ${report.documentNo} telah dibatalkan`, 'warning');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `evidence_reports/${reportId}`);
      throw err;
    }
  },

  /**
   * Mengambil data verifikasi publik berdasarkan token QR.
   */
  verifyToken: async (token: string): Promise<EvidenceVerification | null> => {
    try {
      const snap = await getDoc(doc(db, 'evidence_verify', token));
      if (snap.exists()) {
        return snap.data() as EvidenceVerification;
      }
      return null;
    } catch (err) {
      console.warn('Public verify lookup error:', err);
      return null;
    }
  },
};
