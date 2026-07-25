/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseAuth';

export interface AuditLogParam {
  collection: string;
  recordId: string;
  action: 'insert' | 'update' | 'delete' | 'sync' | 'backup';
  details: string;
}

export const auditService = {
  createLog: async ({ collection, recordId, action, details }: AuditLogParam): Promise<void> => {
    try {
      const userEmail = auth.currentUser?.email || 'unauthenticated_user';
      const logId = `LOG-${crypto.randomUUID()}`;
      
      const logData = {
        id: logId,
        timestamp: new Date().toISOString(),
        user: userEmail,
        collection,
        recordId,
        action,
        details: details.slice(0, 995) // Ensuring it fits under rules' length limit of 1000
      };

      await setDoc(doc(db, 'audit_logs', logId), logData);
    } catch (error) {
      console.error("Failed to write audit log:", error);
    }
  }
};
