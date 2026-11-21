/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc, serverTimestamp, WriteBatch } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseAuth';
import { logger } from '../utils/logger';
import { triggerToast } from '../utils/errorHandler';
import type { AuditActionType, AuditWriteResult } from '../types';

export interface AuditLogParam {
  collection: string;
  recordId: string;
  action: AuditActionType;
  details: string;
  module?: string;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  correctionReason?: string | null;
  actorRole?: string;
  actorName?: string;
}

function sanitizeSnapshot(data?: Record<string, any> | null): Record<string, any> | null {
  if (!data || typeof data !== 'object') return null;
  try {
    const clean: Record<string, any> = {};
    const entries = Object.entries(data).slice(0, 35);
    for (const [k, v] of entries) {
      if (v === undefined) continue;
      if (typeof v === 'string') {
        clean[k] = v.length > 200 ? `${v.slice(0, 197)}...` : v;
      } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
        clean[k] = v;
      } else if (typeof v === 'object' && typeof (v as any).toDate === 'function') {
        clean[k] = (v as any).toDate().toISOString();
      } else if (Array.isArray(v)) {
        clean[k] = v.slice(0, 10);
      } else {
        clean[k] = String(v).slice(0, 120);
      }
    }
    return clean;
  } catch {
    return null;
  }
}

export function buildAuditLogPayload(params: AuditLogParam): { logId: string; logData: Record<string, any> } | null {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const userEmail = currentUser.email || 'unauthenticated_user';
  const uid = currentUser.uid;
  const logId = `LOG-${crypto.randomUUID()}`;

  const logData: Record<string, any> = {
    id: logId,
    uid,
    timestamp: serverTimestamp(),
    user: userEmail,
    actorName: (params.actorName || currentUser.displayName || userEmail).slice(0, 120),
    actorRole: (params.actorRole || 'Member').slice(0, 60),
    module: (params.module || params.collection).slice(0, 64),
    collection: params.collection.slice(0, 64),
    recordId: params.recordId.slice(0, 128),
    action: params.action,
    details: params.details.slice(0, 995),
    beforeData: sanitizeSnapshot(params.beforeData),
    afterData: sanitizeSnapshot(params.afterData),
    correctionReason: params.correctionReason ? params.correctionReason.slice(0, 400) : null,
    status: 'SUCCESS',
  };

  return { logId, logData };
}

export const auditService = {
  /**
   * Menambahkan penulisan log audit ke WriteBatch yang sama dengan transaksi domain
   * sehingga data & audit trail commit secara atomik.
   */
  addToBatch: (batch: WriteBatch, params: AuditLogParam): string | null => {
    const built = buildAuditLogPayload(params);
    if (!built) {
      logger.warn('Penulisan log audit batch dibatalkan: Tidak ada sesi pengguna aktif.');
      return null;
    }
    batch.set(doc(db, 'audit_logs', built.logId), built.logData);
    return built.logId;
  },

  /**
   * Menulis log audit ke koleksi /audit_logs dengan serverTimestamp().
   * Mengembalikan hasil eksplisit (success/error) agar pemanggil dapat membedakan
   * kegagalan transaksi data dari kegagalan pencatatan jejak audit.
   */
  createLog: async (params: AuditLogParam): Promise<AuditWriteResult> => {
    try {
      const built = buildAuditLogPayload(params);
      if (!built) {
        const msg = 'Penulisan log audit dibatalkan: Tidak ada sesi pengguna aktif.';
        logger.warn(msg);
        return { success: false, error: msg };
      }

      await setDoc(doc(db, 'audit_logs', built.logId), built.logData);
      return { success: true, logId: built.logId };
    } catch (error: any) {
      const errMsg = error?.message || 'Gagal menulis log audit ke Firestore.';
      logger.error('Gagal menulis log audit:', error);
      triggerToast(`Transaksi data tersimpan, namun PENCATATAN AUDIT GAGAL: ${errMsg}`, 'warning');
      return { success: false, error: errMsg };
    }
  },
};
