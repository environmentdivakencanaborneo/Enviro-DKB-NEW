/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { randomUUID } from 'crypto';
import { canonicalStringify } from '../../shared/hash';
import { buildDocumentTriggerOptions } from './config';
import { adminDb, FieldValue } from './firebaseAdmin';

export const AUDITED_SERVER_COLLECTIONS = [
  'wastewater',
  'surfacewater',
  'domestic_wastewater',
  'waste_b3',
  'reclamation',
  'standards',
  'evidence_reports',
  'roles',
  'users',
] as const;

export type AuditedCollection = (typeof AUDITED_SERVER_COLLECTIONS)[number];

const SENSITIVE_OR_LARGE_KEYS = new Set([
  'signatureDataUrl',
  'dataUrl',
  'photoDataUrl',
  'snapshot',
  'signatures',
  'days',
  'params',
  'revisionHistory',
  'evaluationHistory',
]);

export function sanitizeAuditSnapshot(data?: Record<string, any> | null): Record<string, any> | null {
  if (!data || typeof data !== 'object') return null;
  const clean: Record<string, any> = {};
  const entries = Object.entries(data).slice(0, 35);
  for (const [k, v] of entries) {
    if (v === undefined) continue;
    if (SENSITIVE_OR_LARGE_KEYS.has(k)) {
      if (k === 'snapshot' && v && typeof v === 'object') {
        clean.snapshotSummary = {
          overall: (v as any).overall ?? null,
          locationCode: (v as any).locationCode ?? null,
          period: (v as any).period ?? null,
        };
      }
      continue;
    }
    if (typeof v === 'string') {
      if (v.startsWith('data:image/')) {
        clean[k] = '[REDACTED_DATA_URL]';
      } else {
        clean[k] = v.length > 200 ? `${v.slice(0, 197)}...` : v;
      }
    } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
      clean[k] = v;
    } else if (typeof v === 'object' && typeof (v as any).toDate === 'function') {
      clean[k] = (v as any).toDate().toISOString();
    } else if (Array.isArray(v)) {
      clean[k] = v.slice(0, 10).map((item) =>
        typeof item === 'object' && item !== null ? '[object]' : item
      );
    } else if (typeof v === 'object') {
      clean[k] = `[keys:${Object.keys(v).slice(0, 8).join(',')}]`;
    } else {
      clean[k] = String(v).slice(0, 120);
    }
  }
  return clean;
}

export function isClaimsTimestampOnlyUserUpdate(
  collectionName: AuditedCollection,
  beforeData?: Record<string, any>,
  afterData?: Record<string, any>
): boolean {
  if (collectionName !== 'users' || !beforeData || !afterData) return false;
  const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
  const changedKeys: string[] = [];
  for (const key of allKeys) {
    if (canonicalStringify(beforeData[key] ?? null) !== canonicalStringify(afterData[key] ?? null)) {
      changedKeys.push(key);
    }
  }
  return changedKeys.length === 1 && changedKeys[0] === 'claimsUpdatedAt';
}

export interface ServerAuditDeps {
  writeAuditLog: (logId: string, data: Record<string, unknown>) => Promise<void>;
  serverTimestamp: () => unknown;
  newLogId: () => string;
}

const defaultAuditDeps: ServerAuditDeps = {
  writeAuditLog: async (logId, data) => {
    await adminDb.collection('audit_logs').doc(logId).set(data);
  },
  serverTimestamp: () => FieldValue.serverTimestamp(),
  newLogId: () => `LOG-SRV-${randomUUID()}`,
};

export async function processServerAuditWrite(
  collectionName: AuditedCollection,
  recordId: string,
  beforeData: Record<string, any> | undefined,
  afterData: Record<string, any> | undefined,
  deps: ServerAuditDeps = defaultAuditDeps
): Promise<{ status: 'logged' | 'skipped'; reason?: string; logId?: string }> {
  if (!beforeData && !afterData) {
    return { status: 'skipped', reason: 'no_data' };
  }

  if (isClaimsTimestampOnlyUserUpdate(collectionName, beforeData, afterData)) {
    return { status: 'skipped', reason: 'claims_timestamp_only' };
  }

  const action: 'insert' | 'update' | 'delete' = !beforeData
    ? 'insert'
    : !afterData
    ? 'delete'
    : 'update';

  const sourceDoc = afterData || beforeData || {};
  const actorEmail =
    (typeof sourceDoc.updatedBy === 'string' && sourceDoc.updatedBy.trim()) ||
    (typeof sourceDoc.createdBy === 'string' && sourceDoc.createdBy.trim()) ||
    (typeof sourceDoc.email === 'string' && sourceDoc.email.trim()) ||
    (collectionName === 'roles' ? recordId : 'system@dkb-emms');

  const actorUid =
    (typeof sourceDoc.uid === 'string' && sourceDoc.uid.trim()) ||
    (collectionName === 'users' ? recordId : 'server_trigger');

  const correctionReason =
    typeof afterData?.correctionReason === 'string' && afterData.correctionReason.trim()
      ? afterData.correctionReason.trim().slice(0, 400)
      : null;

  const logId = deps.newLogId();
  await deps.writeAuditLog(logId, {
    id: logId,
    uid: actorUid,
    timestamp: deps.serverTimestamp(),
    user: actorEmail.slice(0, 120),
    actorName: String(sourceDoc.officer || sourceDoc.fullName || sourceDoc.name || actorEmail).slice(
      0,
      120
    ),
    actorRole: 'Server Trigger',
    module: collectionName,
    collection: collectionName,
    recordId: recordId.slice(0, 128),
    action,
    details: `[Server Audit] ${action.toUpperCase()} pada ${collectionName}/${recordId}`.slice(
      0,
      995
    ),
    beforeData: sanitizeAuditSnapshot(beforeData),
    afterData: sanitizeAuditSnapshot(afterData),
    correctionReason,
    status: 'SUCCESS',
    source: 'server',
  });

  return { status: 'logged', logId };
}

function createServerAuditTrigger(collectionName: AuditedCollection, paramName: string) {
  return onDocumentWritten(
    buildDocumentTriggerOptions(`${collectionName}/{${paramName}}`),
    async (event) => {
      const recordId = event.params[paramName] || '';
      const beforeData = event.data?.before?.exists
        ? (event.data.before.data() as Record<string, any>)
        : undefined;
      const afterData = event.data?.after?.exists
        ? (event.data.after.data() as Record<string, any>)
        : undefined;
      await processServerAuditWrite(collectionName, recordId, beforeData, afterData);
    }
  );
}

export const auditWastewaterOnWrite = createServerAuditTrigger('wastewater', 'docId');
export const auditSurfaceWaterOnWrite = createServerAuditTrigger('surfacewater', 'docId');
export const auditDomesticWastewaterOnWrite = createServerAuditTrigger(
  'domestic_wastewater',
  'docId'
);
export const auditWasteB3OnWrite = createServerAuditTrigger('waste_b3', 'docId');
export const auditReclamationOnWrite = createServerAuditTrigger('reclamation', 'docId');
export const auditStandardsOnWrite = createServerAuditTrigger('standards', 'docId');
export const auditEvidenceReportsOnWrite = createServerAuditTrigger('evidence_reports', 'docId');
export const auditRolesOnWrite = createServerAuditTrigger('roles', 'email');
export const auditUsersOnWrite = createServerAuditTrigger('users', 'uid');
