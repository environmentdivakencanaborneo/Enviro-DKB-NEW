"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditUsersOnWrite = exports.auditRolesOnWrite = exports.auditEvidenceReportsOnWrite = exports.auditStandardsOnWrite = exports.auditReclamationOnWrite = exports.auditWasteB3OnWrite = exports.auditDomesticWastewaterOnWrite = exports.auditSurfaceWaterOnWrite = exports.auditWastewaterOnWrite = exports.AUDITED_SERVER_COLLECTIONS = void 0;
exports.sanitizeAuditSnapshot = sanitizeAuditSnapshot;
exports.isClaimsTimestampOnlyUserUpdate = isClaimsTimestampOnlyUserUpdate;
exports.processServerAuditWrite = processServerAuditWrite;
const firestore_1 = require("firebase-functions/v2/firestore");
const crypto_1 = require("crypto");
const hash_1 = require("../../shared/hash");
const config_1 = require("./config");
const firebaseAdmin_1 = require("./firebaseAdmin");
exports.AUDITED_SERVER_COLLECTIONS = [
    'wastewater',
    'surfacewater',
    'domestic_wastewater',
    'waste_b3',
    'reclamation',
    'standards',
    'evidence_reports',
    'roles',
    'users',
];
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
function sanitizeAuditSnapshot(data) {
    if (!data || typeof data !== 'object')
        return null;
    const clean = {};
    const entries = Object.entries(data).slice(0, 35);
    for (const [k, v] of entries) {
        if (v === undefined)
            continue;
        if (SENSITIVE_OR_LARGE_KEYS.has(k)) {
            if (k === 'snapshot' && v && typeof v === 'object') {
                clean.snapshotSummary = {
                    overall: v.overall ?? null,
                    locationCode: v.locationCode ?? null,
                    period: v.period ?? null,
                };
            }
            continue;
        }
        if (typeof v === 'string') {
            if (v.startsWith('data:image/')) {
                clean[k] = '[REDACTED_DATA_URL]';
            }
            else {
                clean[k] = v.length > 200 ? `${v.slice(0, 197)}...` : v;
            }
        }
        else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
            clean[k] = v;
        }
        else if (typeof v === 'object' && typeof v.toDate === 'function') {
            clean[k] = v.toDate().toISOString();
        }
        else if (Array.isArray(v)) {
            clean[k] = v.slice(0, 10).map((item) => typeof item === 'object' && item !== null ? '[object]' : item);
        }
        else if (typeof v === 'object') {
            clean[k] = `[keys:${Object.keys(v).slice(0, 8).join(',')}]`;
        }
        else {
            clean[k] = String(v).slice(0, 120);
        }
    }
    return clean;
}
function isClaimsTimestampOnlyUserUpdate(collectionName, beforeData, afterData) {
    if (collectionName !== 'users' || !beforeData || !afterData)
        return false;
    const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
    const changedKeys = [];
    for (const key of allKeys) {
        if ((0, hash_1.canonicalStringify)(beforeData[key] ?? null) !== (0, hash_1.canonicalStringify)(afterData[key] ?? null)) {
            changedKeys.push(key);
        }
    }
    return changedKeys.length === 1 && changedKeys[0] === 'claimsUpdatedAt';
}
const defaultAuditDeps = {
    writeAuditLog: async (logId, data) => {
        await firebaseAdmin_1.adminDb.collection('audit_logs').doc(logId).set(data);
    },
    serverTimestamp: () => firebaseAdmin_1.FieldValue.serverTimestamp(),
    newLogId: () => `LOG-SRV-${(0, crypto_1.randomUUID)()}`,
};
async function processServerAuditWrite(collectionName, recordId, beforeData, afterData, deps = defaultAuditDeps) {
    if (!beforeData && !afterData) {
        return { status: 'skipped', reason: 'no_data' };
    }
    if (isClaimsTimestampOnlyUserUpdate(collectionName, beforeData, afterData)) {
        return { status: 'skipped', reason: 'claims_timestamp_only' };
    }
    const action = !beforeData
        ? 'insert'
        : !afterData
            ? 'delete'
            : 'update';
    const sourceDoc = afterData || beforeData || {};
    const actorEmail = (typeof sourceDoc.updatedBy === 'string' && sourceDoc.updatedBy.trim()) ||
        (typeof sourceDoc.createdBy === 'string' && sourceDoc.createdBy.trim()) ||
        (typeof sourceDoc.email === 'string' && sourceDoc.email.trim()) ||
        (collectionName === 'roles' ? recordId : 'system@dkb-emms');
    const actorUid = (typeof sourceDoc.uid === 'string' && sourceDoc.uid.trim()) ||
        (collectionName === 'users' ? recordId : 'server_trigger');
    const correctionReason = typeof afterData?.correctionReason === 'string' && afterData.correctionReason.trim()
        ? afterData.correctionReason.trim().slice(0, 400)
        : null;
    const logId = deps.newLogId();
    await deps.writeAuditLog(logId, {
        id: logId,
        uid: actorUid,
        timestamp: deps.serverTimestamp(),
        user: actorEmail.slice(0, 120),
        actorName: String(sourceDoc.officer || sourceDoc.fullName || sourceDoc.name || actorEmail).slice(0, 120),
        actorRole: 'Server Trigger',
        module: collectionName,
        collection: collectionName,
        recordId: recordId.slice(0, 128),
        action,
        details: `[Server Audit] ${action.toUpperCase()} pada ${collectionName}/${recordId}`.slice(0, 995),
        beforeData: sanitizeAuditSnapshot(beforeData),
        afterData: sanitizeAuditSnapshot(afterData),
        correctionReason,
        status: 'SUCCESS',
        source: 'server',
    });
    return { status: 'logged', logId };
}
function createServerAuditTrigger(collectionName, paramName) {
    return (0, firestore_1.onDocumentWritten)((0, config_1.buildDocumentTriggerOptions)(`${collectionName}/{${paramName}}`), async (event) => {
        const recordId = event.params[paramName] || '';
        const beforeData = event.data?.before?.exists
            ? event.data.before.data()
            : undefined;
        const afterData = event.data?.after?.exists
            ? event.data.after.data()
            : undefined;
        await processServerAuditWrite(collectionName, recordId, beforeData, afterData);
    });
}
exports.auditWastewaterOnWrite = createServerAuditTrigger('wastewater', 'docId');
exports.auditSurfaceWaterOnWrite = createServerAuditTrigger('surfacewater', 'docId');
exports.auditDomesticWastewaterOnWrite = createServerAuditTrigger('domestic_wastewater', 'docId');
exports.auditWasteB3OnWrite = createServerAuditTrigger('waste_b3', 'docId');
exports.auditReclamationOnWrite = createServerAuditTrigger('reclamation', 'docId');
exports.auditStandardsOnWrite = createServerAuditTrigger('standards', 'docId');
exports.auditEvidenceReportsOnWrite = createServerAuditTrigger('evidence_reports', 'docId');
exports.auditRolesOnWrite = createServerAuditTrigger('roles', 'email');
exports.auditUsersOnWrite = createServerAuditTrigger('users', 'uid');
//# sourceMappingURL=audit.js.map