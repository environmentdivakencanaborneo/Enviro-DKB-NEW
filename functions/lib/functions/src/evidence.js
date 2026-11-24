"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelEvidence = exports.reviseEvidence = exports.approveEvidence = exports.reviewEvidence = exports.issueMonthlyEvidence = exports.issueDailyEvidence = void 0;
exports.computeServerSnapshotHash = computeServerSnapshotHash;
exports.generateServerVerifyToken = generateServerVerifyToken;
exports.processIssueDailyEvidence = processIssueDailyEvidence;
exports.processIssueMonthlyEvidence = processIssueMonthlyEvidence;
exports.processReviewEvidence = processReviewEvidence;
exports.processApproveEvidence = processApproveEvidence;
exports.processReviseEvidence = processReviseEvidence;
exports.processCancelEvidence = processCancelEvidence;
const https_1 = require("firebase-functions/v2/https");
const crypto_1 = require("crypto");
const hash_1 = require("../../shared/hash");
const evidenceCalc_1 = require("../../shared/evidenceCalc");
const waterQualityEval_1 = require("../../shared/waterQualityEval");
const authz_1 = require("./authz");
const config_1 = require("./config");
const featureFlags_1 = require("./featureFlags");
const firebaseAdmin_1 = require("./firebaseAdmin");
function computeServerSnapshotHash(data) {
    const canonicalJson = (0, hash_1.canonicalStringify)(data);
    return (0, crypto_1.createHash)('sha256').update(canonicalJson, 'utf8').digest('hex');
}
function generateServerVerifyToken(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = (0, crypto_1.randomBytes)(length);
    let out = '';
    for (let i = 0; i < length; i++) {
        out += chars[bytes[i] % chars.length];
    }
    return out;
}
const defaultEvidenceDeps = {
    dbReader: firebaseAdmin_1.adminDb,
    readFlags: () => (0, featureFlags_1.readFeatureFlags)(firebaseAdmin_1.adminDb),
    getSignature: async (uid) => {
        const snap = await firebaseAdmin_1.adminDb.doc(`signatures/${uid}`).get();
        if (!snap.exists)
            return null;
        const data = snap.data() || {};
        if (typeof data.dataUrl !== 'string' || !data.dataUrl.trim())
            return null;
        return { dataUrl: data.dataUrl };
    },
    getWastewaterById: async (id) => {
        const snap = await firebaseAdmin_1.adminDb.doc(`wastewater/${id}`).get();
        if (!snap.exists)
            return null;
        return { id: snap.id, ...snap.data() };
    },
    getWastewaterPhotoMeta: async (wastewaterId) => {
        const snap = await firebaseAdmin_1.adminDb
            .collection('wastewater_photos')
            .where('wastewaterId', '==', wastewaterId)
            .limit(1)
            .get();
        if (snap.empty)
            return null;
        const d = snap.docs[0].data() || {};
        return {
            takenAt: typeof d.takenAt === 'string' ? d.takenAt : undefined,
            width: typeof d.width === 'number' ? d.width : undefined,
            height: typeof d.height === 'number' ? d.height : undefined,
            mimeType: typeof d.mimeType === 'string' ? d.mimeType : undefined,
        };
    },
    getWastewaterByPeriod: async (period, locationCode) => {
        const startDate = `${period}-01`;
        const endDate = `${period}-31`;
        const snap = await firebaseAdmin_1.adminDb
            .collection('wastewater')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();
        return snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((r) => {
            if ((r.monitoringType ?? 'Harian') !== 'Harian')
                return false;
            return ((r.locationCode && r.locationCode === locationCode) ||
                (!r.locationCode && typeof r.location === 'string' && r.location.includes(locationCode)));
        });
    },
    getDailyReportsByPeriod: async (period, locationCode) => {
        const snap = await firebaseAdmin_1.adminDb
            .collection('evidence_reports')
            .where('period', '==', period)
            .where('locationCode', '==', locationCode)
            .get();
        const map = {};
        for (const docSnap of snap.docs) {
            const d = docSnap.data();
            if (d.type === 'daily' && d.date && d.status !== 'Dibatalkan') {
                map[d.date] = d.documentNo ?? null;
            }
        }
        return map;
    },
    getLocationByCode: async (code) => {
        const snap = await firebaseAdmin_1.adminDb.collection('wq_locations').where('code', '==', code).limit(1).get();
        if (snap.empty)
            return null;
        const docSnap = snap.docs[0];
        return { id: docSnap.id, ...docSnap.data() };
    },
    getWastewaterStandards: async () => {
        const snap = await firebaseAdmin_1.adminDb.collection('standards').where('media', '==', 'air_limbah').get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    getThresholds: async () => {
        const snap = await firebaseAdmin_1.adminDb.doc('app_meta/env_thresholds').get();
        if (!snap.exists)
            return waterQualityEval_1.DEFAULT_INTERNAL_THRESHOLDS_VALUE;
        return {
            ...waterQualityEval_1.DEFAULT_INTERNAL_THRESHOLDS_VALUE,
            ...(snap.data() || {}),
        };
    },
    runTransaction: (fn) => firebaseAdmin_1.adminDb.runTransaction(async (tx) => {
        const adapter = {
            getDoc: (path) => tx.get(firebaseAdmin_1.adminDb.doc(path)),
            setDoc: (path, data) => {
                tx.set(firebaseAdmin_1.adminDb.doc(path), data);
            },
            updateDoc: (path, data) => {
                tx.update(firebaseAdmin_1.adminDb.doc(path), data);
            },
        };
        return fn(adapter);
    }),
    nowIso: () => new Date().toISOString(),
    serverTimestamp: () => firebaseAdmin_1.FieldValue.serverTimestamp(),
    newToken: () => generateServerVerifyToken(16),
    newLogId: () => `LOG-SRV-${(0, crypto_1.randomUUID)()}`,
};
async function requireServerEvidenceFlag(deps) {
    const flags = await deps.readFlags();
    if (!flags.serverEvidence) {
        throw new https_1.HttpsError('failed-precondition', 'Server Evidence belum diaktifkan pada app_meta/feature_flags.');
    }
}
async function buildAuthoritativeSignature(caller, deps) {
    const sig = await deps.getSignature(caller.uid);
    if (!sig || !sig.dataUrl.startsWith('data:image/')) {
        throw new https_1.HttpsError('failed-precondition', 'Spesimen tanda tangan Anda belum tersimpan di server (signatures/{uid}). Simpan tanda tangan terlebih dahulu.');
    }
    return {
        uid: caller.uid,
        email: caller.email,
        name: caller.name,
        position: caller.position,
        signedAt: deps.nowIso(),
        signatureDataUrl: sig.dataUrl,
    };
}
function buildServerAuditDoc(caller, recordId, action, details, deps, extras) {
    const logId = deps.newLogId();
    return {
        logId,
        data: {
            id: logId,
            uid: caller.uid,
            timestamp: deps.serverTimestamp(),
            user: caller.email,
            actorName: caller.name,
            actorRole: caller.role,
            module: 'evidence',
            collection: 'evidence_reports',
            recordId,
            action,
            details: details.slice(0, 995),
            beforeData: extras?.beforeData ?? null,
            afterData: extras?.afterData ?? null,
            correctionReason: extras?.correctionReason ? extras.correctionReason.slice(0, 400) : null,
            status: 'SUCCESS',
            source: 'server',
        },
    };
}
async function processIssueDailyEvidence(auth, rawPayload, deps = defaultEvidenceDeps) {
    await requireServerEvidenceFlag(deps);
    const caller = await (0, authz_1.verifyCallerContext)(auth, deps.dbReader, 'Operator');
    const payload = (rawPayload || {});
    const wastewaterId = typeof payload.wastewaterId === 'string' ? payload.wastewaterId.trim() : '';
    if (!wastewaterId) {
        throw new https_1.HttpsError('invalid-argument', 'wastewaterId wajib diisi.');
    }
    const record = await deps.getWastewaterById(wastewaterId);
    if (!record) {
        throw new https_1.HttpsError('not-found', 'Data pemantauan air limbah sumber tidak ditemukan.');
    }
    if ((record.monitoringType ?? 'Harian') !== 'Harian') {
        throw new https_1.HttpsError('invalid-argument', 'Evidence harian hanya untuk data pemantauan Harian.');
    }
    const date = typeof record.date === 'string' ? record.date.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new https_1.HttpsError('invalid-argument', 'Tanggal data air limbah tidak valid.');
    }
    const period = date.slice(0, 7);
    const year = date.slice(0, 4);
    const locationCode = (typeof record.locationCode === 'string' && record.locationCode.trim()) ||
        (typeof payload.locationCode === 'string' && payload.locationCode.trim()) ||
        'KPL-01';
    const reportId = `WQD-${locationCode}-${date.replace(/-/g, '')}`;
    const [preparedSignature, locationObj, standards, thresholds, photoMeta] = await Promise.all([
        buildAuthoritativeSignature(caller, deps),
        deps.getLocationByCode(locationCode),
        deps.getWastewaterStandards(),
        deps.getThresholds(),
        record.hasPhoto ? deps.getWastewaterPhotoMeta(wastewaterId) : Promise.resolve(null),
    ]);
    const followUpAction = typeof payload.followUpAction === 'string' && payload.followUpAction.trim()
        ? payload.followUpAction.trim().slice(0, 500)
        : undefined;
    const snapshot = (0, evidenceCalc_1.composeDailyEvidenceSnapshot)({
        record,
        locationCode,
        locationName: locationObj?.name || record.location || locationCode,
        standards,
        thresholds,
        followUpAction,
        photoMeta: photoMeta ? { hasPhoto: true, ...photoMeta } : { hasPhoto: Boolean(record.hasPhoto) },
    });
    const snapshotHash = computeServerSnapshotHash(snapshot);
    const verifyToken = deps.newToken();
    const issuedAt = deps.nowIso();
    const counterPath = `counters/evidence-daily-${year}`;
    const reportPath = `evidence_reports/${reportId}`;
    const verifyPath = `evidence_verify/${verifyToken}`;
    return deps.runTransaction(async (tx) => {
        const existingSnap = await tx.getDoc(reportPath);
        if (existingSnap.exists) {
            throw new https_1.HttpsError('already-exists', `Dokumen Evidence harian ${reportId} sudah diterbitkan. Gunakan Revisi Dokumen untuk memperbarui.`);
        }
        const counterSnap = await tx.getDoc(counterPath);
        const prevSeq = counterSnap.exists ? Number(counterSnap.data()?.value || 0) : 0;
        const seq = prevSeq + 1;
        const documentNo = `FR-EMS-WQ-${year}-${String(seq).padStart(5, '0')}`;
        const newReport = {
            id: reportId,
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
            signatures: { prepared: preparedSignature },
            issuedAt,
            verifyToken,
            revisionHistory: [],
            ...(followUpAction ? { followUpAction } : {}),
            createdAt: deps.serverTimestamp(),
            createdBy: caller.email,
            updatedAt: deps.serverTimestamp(),
            updatedBy: caller.email,
        };
        const verification = {
            reportId,
            documentNo,
            type: 'daily',
            period,
            locationCode,
            issuedAt,
            status: 'Disiapkan',
            overall: snapshot.overall,
            hashPrefix: snapshotHash.slice(0, 12),
        };
        const auditDoc = buildServerAuditDoc(caller, reportId, 'insert', `Server menerbitkan Evidence Harian ${documentNo} (${locationCode}, ${date})`, deps, { afterData: { documentNo, status: 'Disiapkan', overall: snapshot.overall, locationCode, date } });
        tx.setDoc(counterPath, {
            value: seq,
            updatedAt: deps.serverTimestamp(),
            lastReportId: reportId,
        });
        tx.setDoc(reportPath, newReport);
        tx.setDoc(verifyPath, verification);
        tx.setDoc(`audit_logs/${auditDoc.logId}`, auditDoc.data);
        return newReport;
    });
}
async function processIssueMonthlyEvidence(auth, rawPayload, deps = defaultEvidenceDeps) {
    await requireServerEvidenceFlag(deps);
    const caller = await (0, authz_1.verifyCallerContext)(auth, deps.dbReader, 'Operator');
    const payload = (rawPayload || {});
    const period = typeof payload.period === 'string' ? payload.period.trim() : '';
    const locationCode = typeof payload.locationCode === 'string' ? payload.locationCode.trim() : '';
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
        throw new https_1.HttpsError('invalid-argument', 'Format periode wajib YYYY-MM.');
    }
    if (!locationCode) {
        throw new https_1.HttpsError('invalid-argument', 'locationCode wajib diisi.');
    }
    const [year, month] = period.split('-');
    const reportId = `WQM-${locationCode}-${year}${month}`;
    const [preparedSignature, locationObj, records, standards, thresholds, dailyDocNoByDate] = await Promise.all([
        buildAuthoritativeSignature(caller, deps),
        deps.getLocationByCode(locationCode),
        deps.getWastewaterByPeriod(period, locationCode),
        deps.getWastewaterStandards(),
        deps.getThresholds(),
        deps.getDailyReportsByPeriod(period, locationCode),
    ]);
    const docSuffix = locationObj?.docSuffix ??
        (typeof payload.docSuffix === 'string' && payload.docSuffix.trim()
            ? payload.docSuffix.trim()
            : null);
    const suffixPart = docSuffix ? `-${docSuffix}` : '';
    const documentNo = `FR-EMS-WQ-${year}-M${month}${suffixPart}`;
    const snapshot = (0, evidenceCalc_1.composeMonthlyEvidenceSnapshot)({
        documentNo,
        period,
        locationCode,
        locationName: locationObj?.name || locationCode,
        docSuffix,
        records,
        standards,
        thresholds,
        dailyDocNoByDate,
    });
    const snapshotHash = computeServerSnapshotHash(snapshot);
    const verifyToken = deps.newToken();
    const issuedAt = deps.nowIso();
    const reportPath = `evidence_reports/${reportId}`;
    const verifyPath = `evidence_verify/${verifyToken}`;
    return deps.runTransaction(async (tx) => {
        const existingSnap = await tx.getDoc(reportPath);
        if (existingSnap.exists) {
            throw new https_1.HttpsError('already-exists', `Dokumen Evidence bulanan ${reportId} sudah diterbitkan. Gunakan Revisi Dokumen untuk memperbarui.`);
        }
        const newReport = {
            id: reportId,
            type: 'monthly',
            documentNo,
            revision: 0,
            period,
            locationCode,
            status: 'Disiapkan',
            snapshot,
            snapshotHash,
            signatures: { prepared: preparedSignature },
            issuedAt,
            verifyToken,
            revisionHistory: [],
            createdAt: deps.serverTimestamp(),
            createdBy: caller.email,
            updatedAt: deps.serverTimestamp(),
            updatedBy: caller.email,
        };
        const verification = {
            reportId,
            documentNo,
            type: 'monthly',
            period,
            locationCode,
            issuedAt,
            status: 'Disiapkan',
            overall: snapshot.overall,
            hashPrefix: snapshotHash.slice(0, 12),
        };
        const auditDoc = buildServerAuditDoc(caller, reportId, 'insert', `Server menerbitkan Evidence Bulanan ${documentNo} (${locationCode}, Periode ${period})`, deps, { afterData: { documentNo, status: 'Disiapkan', overall: snapshot.overall, period, locationCode } });
        tx.setDoc(reportPath, newReport);
        tx.setDoc(verifyPath, verification);
        tx.setDoc(`audit_logs/${auditDoc.logId}`, auditDoc.data);
        return newReport;
    });
}
async function processReviewEvidence(auth, rawPayload, deps = defaultEvidenceDeps) {
    await requireServerEvidenceFlag(deps);
    const caller = await (0, authz_1.verifyCallerContext)(auth, deps.dbReader, 'Foreman');
    const payload = (rawPayload || {});
    const reportId = typeof payload.reportId === 'string' ? payload.reportId.trim() : '';
    if (!reportId) {
        throw new https_1.HttpsError('invalid-argument', 'reportId wajib diisi.');
    }
    const reviewedSignature = await buildAuthoritativeSignature(caller, deps);
    const reportPath = `evidence_reports/${reportId}`;
    return deps.runTransaction(async (tx) => {
        const snap = await tx.getDoc(reportPath);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Dokumen evidence tidak ditemukan.');
        }
        const report = snap.data();
        if (report.status !== 'Disiapkan') {
            throw new https_1.HttpsError('failed-precondition', `Hanya dokumen berstatus Disiapkan yang dapat diperiksa (status saat ini: ${report.status}).`);
        }
        const prep = report.signatures?.prepared;
        if (prep &&
            (prep.uid === caller.uid || prep.email.toLowerCase() === caller.email.toLowerCase())) {
            throw new https_1.HttpsError('permission-denied', 'Pemeriksa tidak boleh orang yang sama dengan penyiap dokumen.');
        }
        tx.updateDoc(reportPath, {
            'signatures.reviewed': reviewedSignature,
            status: 'Diperiksa',
            updatedAt: deps.serverTimestamp(),
            updatedBy: caller.email,
        });
        if (report.verifyToken) {
            tx.updateDoc(`evidence_verify/${report.verifyToken}`, {
                reportId: report.id || reportId,
                status: 'Diperiksa',
            });
        }
        const auditDoc = buildServerAuditDoc(caller, reportId, 'update', `Dokumen ${report.documentNo} diperiksa oleh ${caller.name} (${caller.position})`, deps, { beforeData: { status: report.status }, afterData: { status: 'Diperiksa' } });
        tx.setDoc(`audit_logs/${auditDoc.logId}`, auditDoc.data);
        return { reportId, status: 'Diperiksa' };
    });
}
async function processApproveEvidence(auth, rawPayload, deps = defaultEvidenceDeps) {
    await requireServerEvidenceFlag(deps);
    const caller = await (0, authz_1.verifyCallerContext)(auth, deps.dbReader, 'Environment Manager');
    const payload = (rawPayload || {});
    const reportId = typeof payload.reportId === 'string' ? payload.reportId.trim() : '';
    if (!reportId) {
        throw new https_1.HttpsError('invalid-argument', 'reportId wajib diisi.');
    }
    const approvedSignature = await buildAuthoritativeSignature(caller, deps);
    const reportPath = `evidence_reports/${reportId}`;
    return deps.runTransaction(async (tx) => {
        const snap = await tx.getDoc(reportPath);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Dokumen evidence tidak ditemukan.');
        }
        const report = snap.data();
        if (report.status !== 'Diperiksa') {
            throw new https_1.HttpsError('failed-precondition', `Dokumen harus berstatus Diperiksa sebelum Disetujui (status saat ini: ${report.status}).`);
        }
        const prep = report.signatures?.prepared;
        const rev = report.signatures?.reviewed;
        if (prep &&
            (prep.uid === caller.uid || prep.email.toLowerCase() === caller.email.toLowerCase())) {
            throw new https_1.HttpsError('permission-denied', 'Penyetuju tidak boleh orang yang sama dengan penyiap dokumen.');
        }
        if (rev &&
            (rev.uid === caller.uid || rev.email.toLowerCase() === caller.email.toLowerCase())) {
            throw new https_1.HttpsError('permission-denied', 'Penyetuju tidak boleh orang yang sama dengan pemeriksa dokumen.');
        }
        tx.updateDoc(reportPath, {
            'signatures.approved': approvedSignature,
            status: 'Disetujui',
            updatedAt: deps.serverTimestamp(),
            updatedBy: caller.email,
        });
        if (report.verifyToken) {
            tx.updateDoc(`evidence_verify/${report.verifyToken}`, {
                reportId: report.id || reportId,
                status: 'Disetujui',
            });
        }
        const auditDoc = buildServerAuditDoc(caller, reportId, 'update', `Dokumen ${report.documentNo} disetujui oleh ${caller.name} (${caller.position})`, deps, { beforeData: { status: report.status }, afterData: { status: 'Disetujui' } });
        tx.setDoc(`audit_logs/${auditDoc.logId}`, auditDoc.data);
        return { reportId, status: 'Disetujui' };
    });
}
async function processReviseEvidence(auth, rawPayload, deps = defaultEvidenceDeps) {
    await requireServerEvidenceFlag(deps);
    const caller = await (0, authz_1.verifyCallerContext)(auth, deps.dbReader, 'Operator');
    const payload = (rawPayload || {});
    const reportId = typeof payload.reportId === 'string' ? payload.reportId.trim() : '';
    if (!reportId) {
        throw new https_1.HttpsError('invalid-argument', 'reportId wajib diisi.');
    }
    const reason = typeof payload.reason === 'string' && payload.reason.trim()
        ? payload.reason.trim().slice(0, 400)
        : 'Penyesuaian data sumber pengujian lapangan';
    const preparedSignature = await buildAuthoritativeSignature(caller, deps);
    const reportPath = `evidence_reports/${reportId}`;
    // Baca awal untuk mengetahui jenis laporan & sumber data yang harus dihitung ulang
    const preSnap = await deps.dbReader.doc(reportPath).get();
    if (!preSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Dokumen evidence tidak ditemukan.');
    }
    const preReport = preSnap.data();
    if (preReport.status === 'Dibatalkan') {
        throw new https_1.HttpsError('failed-precondition', 'Dokumen yang sudah dibatalkan tidak dapat direvisi.');
    }
    const [locationObj, standards, thresholds] = await Promise.all([
        deps.getLocationByCode(preReport.locationCode),
        deps.getWastewaterStandards(),
        deps.getThresholds(),
    ]);
    let freshSnapshot;
    if (preReport.type === 'daily') {
        if (!preReport.wastewaterId) {
            throw new https_1.HttpsError('failed-precondition', 'Referensi wastewaterId tidak ditemukan.');
        }
        const record = await deps.getWastewaterById(preReport.wastewaterId);
        if (!record) {
            throw new https_1.HttpsError('not-found', 'Data air limbah sumber sudah tidak ditemukan.');
        }
        const photoMeta = record.hasPhoto
            ? await deps.getWastewaterPhotoMeta(preReport.wastewaterId)
            : null;
        freshSnapshot = (0, evidenceCalc_1.composeDailyEvidenceSnapshot)({
            record,
            locationCode: preReport.locationCode,
            locationName: locationObj?.name || record.location || preReport.locationCode,
            standards,
            thresholds,
            followUpAction: preReport.followUpAction,
            photoMeta: photoMeta ? { hasPhoto: true, ...photoMeta } : { hasPhoto: Boolean(record.hasPhoto) },
        });
    }
    else {
        const [records, dailyDocNoByDate] = await Promise.all([
            deps.getWastewaterByPeriod(preReport.period, preReport.locationCode),
            deps.getDailyReportsByPeriod(preReport.period, preReport.locationCode),
        ]);
        freshSnapshot = (0, evidenceCalc_1.composeMonthlyEvidenceSnapshot)({
            documentNo: preReport.documentNo || reportId,
            period: preReport.period,
            locationCode: preReport.locationCode,
            locationName: locationObj?.name || preReport.locationCode,
            docSuffix: locationObj?.docSuffix ?? null,
            records,
            standards,
            thresholds,
            dailyDocNoByDate,
        });
    }
    const newHash = computeServerSnapshotHash(freshSnapshot);
    const nowIso = deps.nowIso();
    return deps.runTransaction(async (tx) => {
        const snap = await tx.getDoc(reportPath);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Dokumen evidence tidak ditemukan.');
        }
        const oldReport = snap.data();
        if (oldReport.status === 'Dibatalkan') {
            throw new https_1.HttpsError('failed-precondition', 'Dokumen yang sudah dibatalkan tidak dapat direvisi.');
        }
        const nextRevision = (oldReport.revision || 0) + 1;
        const revisionItem = {
            revision: oldReport.revision || 0,
            revisedAt: nowIso,
            revisedBy: caller.email,
            reason,
            previousHash: oldReport.snapshotHash,
        };
        const newHistory = [...(oldReport.revisionHistory || []), revisionItem];
        tx.updateDoc(reportPath, {
            revision: nextRevision,
            snapshot: freshSnapshot,
            snapshotHash: newHash,
            status: 'Disiapkan',
            signatures: { prepared: preparedSignature },
            revisionHistory: newHistory,
            updatedAt: deps.serverTimestamp(),
            updatedBy: caller.email,
        });
        if (oldReport.verifyToken) {
            tx.updateDoc(`evidence_verify/${oldReport.verifyToken}`, {
                reportId: oldReport.id || reportId,
                status: 'Disiapkan',
                overall: freshSnapshot.overall,
                hashPrefix: newHash.slice(0, 12),
            });
        }
        const auditDoc = buildServerAuditDoc(caller, reportId, 'update', `Menerbitkan Revisi ${String(nextRevision).padStart(2, '0')} untuk dokumen ${oldReport.documentNo}`, deps, {
            beforeData: { revision: oldReport.revision || 0, status: oldReport.status },
            afterData: { revision: nextRevision, status: 'Disiapkan', overall: freshSnapshot.overall },
            correctionReason: reason,
        });
        tx.setDoc(`audit_logs/${auditDoc.logId}`, auditDoc.data);
        return { reportId, revision: nextRevision };
    });
}
async function processCancelEvidence(auth, rawPayload, deps = defaultEvidenceDeps) {
    await requireServerEvidenceFlag(deps);
    const caller = await (0, authz_1.verifyCallerContext)(auth, deps.dbReader, 'Admin');
    const payload = (rawPayload || {});
    const reportId = typeof payload.reportId === 'string' ? payload.reportId.trim() : '';
    const trimmedReason = typeof payload.cancellationReason === 'string' ? payload.cancellationReason.trim() : '';
    if (!reportId) {
        throw new https_1.HttpsError('invalid-argument', 'reportId wajib diisi.');
    }
    if (trimmedReason.length < 10 || trimmedReason.length > 500) {
        throw new https_1.HttpsError('invalid-argument', 'Alasan pembatalan dokumen wajib diisi minimal 10 karakter dan maksimal 500 karakter.');
    }
    const reportPath = `evidence_reports/${reportId}`;
    return deps.runTransaction(async (tx) => {
        const snap = await tx.getDoc(reportPath);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Dokumen evidence tidak ditemukan.');
        }
        const report = snap.data();
        if (report.status === 'Dibatalkan') {
            throw new https_1.HttpsError('failed-precondition', 'Dokumen ini sudah berstatus Dibatalkan.');
        }
        tx.updateDoc(reportPath, {
            status: 'Dibatalkan',
            cancellationReason: trimmedReason,
            updatedAt: deps.serverTimestamp(),
            updatedBy: caller.email,
        });
        if (report.verifyToken) {
            tx.updateDoc(`evidence_verify/${report.verifyToken}`, {
                reportId: report.id || reportId,
                status: 'Dibatalkan',
            });
        }
        const auditDoc = buildServerAuditDoc(caller, reportId, 'update', `Membatalkan dokumen ${report.documentNo}. Alasan: ${trimmedReason}`, deps, {
            beforeData: { status: report.status },
            afterData: { status: 'Dibatalkan' },
            correctionReason: trimmedReason,
        });
        tx.setDoc(`audit_logs/${auditDoc.logId}`, auditDoc.data);
        return { reportId, status: 'Dibatalkan' };
    });
}
exports.issueDailyEvidence = (0, https_1.onCall)((0, config_1.buildCallableOptions)(), async (request) => {
    return processIssueDailyEvidence(request.auth, request.data);
});
exports.issueMonthlyEvidence = (0, https_1.onCall)((0, config_1.buildCallableOptions)(), async (request) => {
    return processIssueMonthlyEvidence(request.auth, request.data);
});
exports.reviewEvidence = (0, https_1.onCall)((0, config_1.buildCallableOptions)(), async (request) => {
    return processReviewEvidence(request.auth, request.data);
});
exports.approveEvidence = (0, https_1.onCall)((0, config_1.buildCallableOptions)(), async (request) => {
    return processApproveEvidence(request.auth, request.data);
});
exports.reviseEvidence = (0, https_1.onCall)((0, config_1.buildCallableOptions)(), async (request) => {
    return processReviseEvidence(request.auth, request.data);
});
exports.cancelEvidence = (0, https_1.onCall)((0, config_1.buildCallableOptions)(), async (request) => {
    return processCancelEvidence(request.auth, request.data);
});
//# sourceMappingURL=evidence.js.map