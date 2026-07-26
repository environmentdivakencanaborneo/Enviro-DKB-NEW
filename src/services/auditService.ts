/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseAuth';
import { logger } from '../utils/logger';
import { triggerToast } from '../utils/errorHandler';

export interface AuditLogParam {
  collection: string;
  recordId: string;
  action: 'insert' | 'update' | 'delete' | 'sync' | 'backup' | 'login' | 'logout' | 'approve' | 'role_change';
  details: string;
}

export const auditService = {
  createLog: async ({ collection, recordId, action, details }: AuditLogParam): Promise<void> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        logger.warn('Penulisan log audit dibatalkan: Tidak ada sesi pengguna aktif.');
        return;
      }

      const userEmail = currentUser.email || 'unauthenticated_user';
      const uid = currentUser.uid;
      const logId = `LOG-${crypto.randomUUID()}`;
      
      const logData = {
        id: logId,
        uid,
        timestamp: serverTimestamp(),
        user: userEmail,
        collection: collection.slice(0, 64),
        recordId: recordId.slice(0, 128),
        action,
        details: details.slice(0, 995)
      };

      await setDoc(doc(db, 'audit_logs', logId), logData);
    } catch (error) {
      logger.error("Gagal menulis log audit:", error);
      triggerToast("Gagal mencatat jejak audit.", 'warning');
    }
  }
};

