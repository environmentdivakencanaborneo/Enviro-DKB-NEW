"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reevaluateRange = exports.evaluateDomesticWastewaterOnWrite = exports.evaluateSurfaceWaterOnWrite = exports.evaluateWastewaterOnWrite = void 0;
exports.collectionToMedia = collectionToMedia;
exports.computeServerEvaluationPatch = computeServerEvaluationPatch;
exports.processWaterDocumentWrite = processWaterDocumentWrite;
exports.processReevaluateRange = processReevaluateRange;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const waterQualityEval_1 = require("../../shared/waterQualityEval");
const hash_1 = require("../../shared/hash");
const authz_1 = require("./authz");
const config_1 = require("./config");
const featureFlags_1 = require("./featureFlags");
const firebaseAdmin_1 = require("./firebaseAdmin");
const crypto_1 = require("crypto");
function collectionToMedia(col) {
    if (col === 'wastewater')
        return 'air_limbah';
    if (col === 'surfacewater')
        return 'air_permukaan';
    return 'air_limbah_domestik';
}
function computeServerEvaluationPatch(media, record, standards, thresholds) {
    const locationCode = typeof record.locationCode === 'string' && record.locationCode.trim()
        ? record.locationCode
        : typeof record.facilityName === 'string' && record.facilityName.trim()
            ? record.facilityName
            : typeof record.location === 'string' && record.location.trim()
                ? record.location
                : undefined;
    const sampleDate = typeof record.date === 'string' ? record.date : undefined;
    const kelasAir = typeof record.kelasAir === 'string'
        ? record.kelasAir
        : undefined;
    const evaluation = (0, waterQualityEval_1.evaluateSampleCompliance)(media, record, {
        standards,
        thresholds: thresholds ?? waterQualityEval_1.DEFAULT_INTERNAL_THRESHOLDS_VALUE,
        locationCode,
        sampleDate,
        kelasAir,
        standardId: typeof record.standardId === 'string' ? record.standardId : undefined,
        unitMap: record.unitMap,
    });
    const { standardId, standardSnapshot } = (0, waterQualityEval_1.buildStandardSnapshotAndIds)(standards, media, {
        locationCode,
        sampleDate,
        kelasAir,
        standardId: typeof record.standardId === 'string' ? record.standardId : undefined,
    });
    const patch = {
        evaluationStatus: evaluation.overall,
        evaluationReason: evaluation.evaluationReason,
        standardBasis: evaluation.standardsBasis,
        standardId: standardId ?? null,
        standardSnapshot: standardSnapshot ?? null,
    };
    if (media === 'air_limbah_domestik') {
        patch.complianceStatus = evaluation.domesticStatus;
    }
    else {
        patch.status = evaluation.legacyStatus;
    }
    // Pencegahan loop tak berujung: bila hasil evaluasi dan snapshot sudah identik
    // dengan nilai tersimpan DAN serverEvaluatedAt sudah terisi, lewati penulisan.
    const hasServerEvaluatedAt = record.serverEvaluatedAt != null;
    const keysToCompare = Object.keys(patch);
    const allFieldsMatch = keysToCompare.every((k) => (0, hash_1.canonicalStringify)(record[k] ?? null) === (0, hash_1.canonicalStringify)(patch[k] ?? null));
    return {
        patch,
        evaluation,
        shouldWrite: !(hasServerEvaluatedAt && allFieldsMatch),
    };
}
const defaultTriggerDeps = {
    readFlags: () => (0, featureFlags_1.readFeatureFlags)(firebaseAdmin_1.adminDb),
    loadStandards: async (media) => {
        const snap = await firebaseAdmin_1.adminDb.collection('standards').where('media', '==', media).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    loadThresholds: async () => {
        const snap = await firebaseAdmin_1.adminDb.doc('app_meta/env_thresholds').get();
        if (!snap.exists)
            return waterQualityEval_1.DEFAULT_INTERNAL_THRESHOLDS_VALUE;
        const d = snap.data() || {};
        return {
            ...waterQualityEval_1.DEFAULT_INTERNAL_THRESHOLDS_VALUE,
            ...d,
        };
    },
    serverTimestamp: () => firebaseAdmin_1.FieldValue.serverTimestamp(),
};
async function processWaterDocumentWrite(collectionName, afterData, updateDoc, deps = defaultTriggerDeps) {
    if (!afterData) {
        return { status: 'skipped', reason: 'deleted' };
    }
    const flags = await deps.readFlags();
    if (!flags.serverEvaluation) {
        return { status: 'skipped', reason: 'flag_disabled' };
    }
    const media = collectionToMedia(collectionName);
    const [standards, thresholds] = await Promise.all([
        deps.loadStandards(media),
        deps.loadThresholds(),
    ]);
    const { patch, shouldWrite } = computeServerEvaluationPatch(media, afterData, standards, thresholds);
    if (!shouldWrite) {
        return { status: 'skipped', reason: 'unchanged' };
    }
    await updateDoc({
        ...patch,
        serverEvaluatedAt: deps.serverTimestamp(),
    });
    return { status: 'updated', patch };
}
const defaultReevalDeps = {
    ...defaultTriggerDeps,
    dbReader: firebaseAdmin_1.adminDb,
    loadRecords: async (collectionName) => {
        const snap = await firebaseAdmin_1.adminDb.collection(collectionName).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    applyBatchUpdates: async (updates, auditEntry) => {
        const chunkSize = 400;
        for (let i = 0; i < updates.length; i += chunkSize) {
            const chunk = updates.slice(i, i + chunkSize);
            const batch = firebaseAdmin_1.adminDb.batch();
            for (const item of chunk) {
                batch.update(firebaseAdmin_1.adminDb.collection(auditEntry.data.collection).doc(item.id), item.fields);
            }
            if (i + chunkSize >= updates.length) {
                batch.set(firebaseAdmin_1.adminDb.collection('audit_logs').doc(auditEntry.id), auditEntry.data);
            }
            await batch.commit();
        }
        if (updates.length === 0) {
            await firebaseAdmin_1.adminDb.collection('audit_logs').doc(auditEntry.id).set(auditEntry.data);
        }
    },
    nowIso: () => new Date().toISOString(),
    newLogId: () => `LOG-SRV-${(0, crypto_1.randomUUID)()}`,
};
async function processReevaluateRange(auth, rawPayload, deps = defaultReevalDeps) {
    const caller = await (0, authz_1.verifyCallerContext)(auth, deps.dbReader, 'Environment Superintendent');
    const payload = (rawPayload || {});
    const collectionName = payload.collectionName;
    if (collectionName !== 'wastewater' &&
        collectionName !== 'surfacewater' &&
        collectionName !== 'domestic_wastewater') {
        throw new https_1.HttpsError('invalid-argument', 'Koleksi air tidak valid untuk evaluasi ulang.');
    }
    const correctionReason = typeof payload.correctionReason === 'string' ? payload.correctionReason.trim() : '';
    if (correctionReason.length < 20 || correctionReason.length > 400) {
        throw new https_1.HttpsError('invalid-argument', 'Alasan evaluasi ulang wajib diisi minimal 20 karakter dan maksimal 400 karakter.');
    }
    const media = collectionToMedia(collectionName);
    const [standards, thresholds, allRecords] = await Promise.all([
        deps.loadStandards(media),
        deps.loadThresholds(),
        deps.loadRecords(collectionName),
    ]);
    const fromDate = typeof payload.fromDate === 'string' ? payload.fromDate.trim() : '';
    const toDate = typeof payload.toDate === 'string' ? payload.toDate.trim() : '';
    const locFilter = typeof payload.locationFilter === 'string' ? payload.locationFilter.trim().toLowerCase() : '';
    const onlyChanged = payload.onlyChanged !== false;
    const filtered = allRecords.filter((rec) => {
        const d = String(rec.date || '');
        if (fromDate && d < fromDate)
            return false;
        if (toDate && d > toDate)
            return false;
        if (locFilter) {
            const hay = `${rec.locationCode || ''} ${rec.location || ''} ${rec.facilityName || ''}`.toLowerCase();
            if (!hay.includes(locFilter))
                return false;
        }
        return true;
    });
    const nowIso = deps.nowIso();
    const updates = [];
    for (const rec of filtered) {
        const { patch, evaluation, shouldWrite } = computeServerEvaluationPatch(media, rec, standards, thresholds);
        const prevConclusion = (0, waterQualityEval_1.normalizeStoredConclusion)(rec) ||
            String(rec.status || rec.complianceStatus || 'BELUM DIEVALUASI');
        const changed = prevConclusion !== evaluation.overall ||
            (media === 'air_limbah_domestik'
                ? rec.complianceStatus !== patch.complianceStatus
                : rec.status !== patch.status);
        if (onlyChanged && !changed && !shouldWrite) {
            continue;
        }
        const prevHistory = Array.isArray(rec.evaluationHistory)
            ? rec.evaluationHistory.slice(-19)
            : [];
        const newEntry = {
            evaluatedAt: nowIso,
            evaluatedBy: caller.email,
            previousStatus: prevConclusion,
            newStatus: evaluation.overall,
            reason: correctionReason,
            standardBasis: evaluation.standardsBasis,
        };
        updates.push({
            id: rec.id,
            fields: {
                ...patch,
                correctionReason,
                evaluationHistory: [...prevHistory, newEntry],
                serverEvaluatedAt: deps.serverTimestamp(),
                updatedAt: deps.serverTimestamp(),
                updatedBy: caller.email,
            },
        });
    }
    const logId = deps.newLogId();
    await deps.applyBatchUpdates(updates, {
        id: logId,
        data: {
            id: logId,
            uid: caller.uid,
            timestamp: deps.serverTimestamp(),
            user: caller.email,
            actorName: caller.name,
            actorRole: caller.role,
            module: collectionName,
            collection: collectionName,
            recordId: 'BATCH_REEVAL',
            action: 'correct',
            details: `Evaluasi ulang server terhadap ${updates.length} dari ${filtered.length} data ${collectionName}.`,
            beforeData: { scanned: filtered.length, fromDate: fromDate || null, toDate: toDate || null },
            afterData: { updatedCount: updates.length },
            correctionReason,
            status: 'SUCCESS',
            source: 'server',
        },
    });
    return {
        collectionName,
        totalScanned: filtered.length,
        updatedCount: updates.length,
    };
}
exports.evaluateWastewaterOnWrite = (0, firestore_1.onDocumentWritten)((0, config_1.buildDocumentTriggerOptions)('wastewater/{docId}'), async (event) => {
    const snap = event.data?.after;
    if (!snap?.exists)
        return;
    await processWaterDocumentWrite('wastewater', snap.data(), (fields) => snap.ref.update(fields));
});
exports.evaluateSurfaceWaterOnWrite = (0, firestore_1.onDocumentWritten)((0, config_1.buildDocumentTriggerOptions)('surfacewater/{docId}'), async (event) => {
    const snap = event.data?.after;
    if (!snap?.exists)
        return;
    await processWaterDocumentWrite('surfacewater', snap.data(), (fields) => snap.ref.update(fields));
});
exports.evaluateDomesticWastewaterOnWrite = (0, firestore_1.onDocumentWritten)((0, config_1.buildDocumentTriggerOptions)('domestic_wastewater/{docId}'), async (event) => {
    const snap = event.data?.after;
    if (!snap?.exists)
        return;
    await processWaterDocumentWrite('domestic_wastewater', snap.data(), (fields) => snap.ref.update(fields));
});
exports.reevaluateRange = (0, https_1.onCall)((0, config_1.buildCallableOptions)(), async (request) => {
    return processReevaluateRange(request.auth, request.data);
});
//# sourceMappingURL=waterEval.js.map