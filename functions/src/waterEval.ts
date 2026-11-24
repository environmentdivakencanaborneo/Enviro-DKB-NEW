/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import {
  buildStandardSnapshotAndIds,
  DEFAULT_INTERNAL_THRESHOLDS_VALUE,
  evaluateSampleCompliance,
  normalizeStoredConclusion,
  type SampleEvaluationResult,
} from '../../shared/waterQualityEval';
import { canonicalStringify } from '../../shared/hash';
import type {
  EnvironmentalStandard,
  EvaluationHistoryEntry,
  InternalThresholdsConfig,
} from '../../shared/waterTypes';
import { verifyCallerContext, type AuthzDbReader, type CallableAuthInfo } from './authz';
import { buildCallableOptions, buildDocumentTriggerOptions } from './config';
import { readFeatureFlags, type FeatureFlags } from './featureFlags';
import { adminDb, FieldValue } from './firebaseAdmin';
import { randomUUID } from 'crypto';

export type WaterCollectionName = 'wastewater' | 'surfacewater' | 'domestic_wastewater';
export type WaterMediaName = 'air_limbah' | 'air_permukaan' | 'air_limbah_domestik';

export function collectionToMedia(col: WaterCollectionName): WaterMediaName {
  if (col === 'wastewater') return 'air_limbah';
  if (col === 'surfacewater') return 'air_permukaan';
  return 'air_limbah_domestik';
}

export interface EvaluatedServerPatch {
  evaluationStatus: SampleEvaluationResult['overall'];
  evaluationReason: string;
  standardBasis: string;
  standardId: string | null;
  standardSnapshot: Record<string, any> | null;
  status?: SampleEvaluationResult['legacyStatus'];
  complianceStatus?: SampleEvaluationResult['domesticStatus'];
}

export function computeServerEvaluationPatch(
  media: WaterMediaName,
  record: Record<string, any>,
  standards: EnvironmentalStandard[],
  thresholds?: InternalThresholdsConfig
): {
  patch: EvaluatedServerPatch;
  evaluation: SampleEvaluationResult;
  shouldWrite: boolean;
} {
  const locationCode =
    typeof record.locationCode === 'string' && record.locationCode.trim()
      ? record.locationCode
      : typeof record.facilityName === 'string' && record.facilityName.trim()
      ? record.facilityName
      : typeof record.location === 'string' && record.location.trim()
      ? record.location
      : undefined;
  const sampleDate = typeof record.date === 'string' ? record.date : undefined;
  const kelasAir =
    typeof record.kelasAir === 'string'
      ? (record.kelasAir as 'I' | 'II' | 'III' | 'IV')
      : undefined;

  const evaluation = evaluateSampleCompliance(media, record, {
    standards,
    thresholds: thresholds ?? DEFAULT_INTERNAL_THRESHOLDS_VALUE,
    locationCode,
    sampleDate,
    kelasAir,
    standardId: typeof record.standardId === 'string' ? record.standardId : undefined,
    unitMap: record.unitMap,
  });

  const { standardId, standardSnapshot } = buildStandardSnapshotAndIds(standards, media, {
    locationCode,
    sampleDate,
    kelasAir,
    standardId: typeof record.standardId === 'string' ? record.standardId : undefined,
  });

  const patch: EvaluatedServerPatch = {
    evaluationStatus: evaluation.overall,
    evaluationReason: evaluation.evaluationReason,
    standardBasis: evaluation.standardsBasis,
    standardId: standardId ?? null,
    standardSnapshot: standardSnapshot ?? null,
  };

  if (media === 'air_limbah_domestik') {
    patch.complianceStatus = evaluation.domesticStatus;
  } else {
    patch.status = evaluation.legacyStatus;
  }

  // Pencegahan loop tak berujung: bila hasil evaluasi dan snapshot sudah identik
  // dengan nilai tersimpan DAN serverEvaluatedAt sudah terisi, lewati penulisan.
  const hasServerEvaluatedAt = record.serverEvaluatedAt != null;
  const keysToCompare = Object.keys(patch) as (keyof EvaluatedServerPatch)[];
  const allFieldsMatch = keysToCompare.every(
    (k) => canonicalStringify(record[k] ?? null) === canonicalStringify(patch[k] ?? null)
  );

  return {
    patch,
    evaluation,
    shouldWrite: !(hasServerEvaluatedAt && allFieldsMatch),
  };
}

export interface WaterEvalTriggerDeps {
  readFlags: () => Promise<FeatureFlags>;
  loadStandards: (media: WaterMediaName) => Promise<EnvironmentalStandard[]>;
  loadThresholds: () => Promise<InternalThresholdsConfig>;
  serverTimestamp: () => unknown;
}

const defaultTriggerDeps: WaterEvalTriggerDeps = {
  readFlags: () => readFeatureFlags(adminDb),
  loadStandards: async (media) => {
    const snap = await adminDb.collection('standards').where('media', '==', media).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) } as EnvironmentalStandard));
  },
  loadThresholds: async () => {
    const snap = await adminDb.doc('app_meta/env_thresholds').get();
    if (!snap.exists) return DEFAULT_INTERNAL_THRESHOLDS_VALUE;
    const d = snap.data() || {};
    return {
      ...DEFAULT_INTERNAL_THRESHOLDS_VALUE,
      ...d,
    } as InternalThresholdsConfig;
  },
  serverTimestamp: () => FieldValue.serverTimestamp(),
};

export async function processWaterDocumentWrite(
  collectionName: WaterCollectionName,
  afterData: Record<string, any> | undefined,
  updateDoc: (fields: Record<string, unknown>) => Promise<unknown>,
  deps: WaterEvalTriggerDeps = defaultTriggerDeps
): Promise<{ status: 'updated' | 'skipped'; reason?: string; patch?: EvaluatedServerPatch }> {
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

  const { patch, shouldWrite } = computeServerEvaluationPatch(
    media,
    afterData,
    standards,
    thresholds
  );

  if (!shouldWrite) {
    return { status: 'skipped', reason: 'unchanged' };
  }

  await updateDoc({
    ...patch,
    serverEvaluatedAt: deps.serverTimestamp(),
  });

  return { status: 'updated', patch };
}

export interface ReevaluateRangePayload {
  collectionName: WaterCollectionName;
  fromDate?: string;
  toDate?: string;
  locationFilter?: string;
  correctionReason: string;
  onlyChanged?: boolean;
}

export interface ReevaluateRangeDeps extends WaterEvalTriggerDeps {
  dbReader: AuthzDbReader;
  loadRecords: (collectionName: WaterCollectionName) => Promise<Array<Record<string, any> & { id: string }>>;
  applyBatchUpdates: (
    updates: Array<{ id: string; fields: Record<string, unknown> }>,
    auditEntry: { id: string; data: Record<string, unknown> }
  ) => Promise<void>;
  nowIso: () => string;
  newLogId: () => string;
}

const defaultReevalDeps: ReevaluateRangeDeps = {
  ...defaultTriggerDeps,
  dbReader: adminDb,
  loadRecords: async (collectionName) => {
    const snap = await adminDb.collection(collectionName).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
  },
  applyBatchUpdates: async (updates, auditEntry) => {
    const chunkSize = 400;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const batch = adminDb.batch();
      for (const item of chunk) {
        batch.update(
          adminDb.collection(auditEntry.data.collection as string).doc(item.id),
          item.fields as Record<string, any>
        );
      }
      if (i + chunkSize >= updates.length) {
        batch.set(adminDb.collection('audit_logs').doc(auditEntry.id), auditEntry.data);
      }
      await batch.commit();
    }
    if (updates.length === 0) {
      await adminDb.collection('audit_logs').doc(auditEntry.id).set(auditEntry.data);
    }
  },
  nowIso: () => new Date().toISOString(),
  newLogId: () => `LOG-SRV-${randomUUID()}`,
};

export async function processReevaluateRange(
  auth: CallableAuthInfo | undefined | null,
  rawPayload: unknown,
  deps: ReevaluateRangeDeps = defaultReevalDeps
) {
  const caller = await verifyCallerContext(auth, deps.dbReader, 'Environment Superintendent');
  const payload = (rawPayload || {}) as Partial<ReevaluateRangePayload>;

  const collectionName = payload.collectionName;
  if (
    collectionName !== 'wastewater' &&
    collectionName !== 'surfacewater' &&
    collectionName !== 'domestic_wastewater'
  ) {
    throw new HttpsError('invalid-argument', 'Koleksi air tidak valid untuk evaluasi ulang.');
  }

  const correctionReason = typeof payload.correctionReason === 'string' ? payload.correctionReason.trim() : '';
  if (correctionReason.length < 20 || correctionReason.length > 400) {
    throw new HttpsError(
      'invalid-argument',
      'Alasan evaluasi ulang wajib diisi minimal 20 karakter dan maksimal 400 karakter.'
    );
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
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    if (locFilter) {
      const hay = `${rec.locationCode || ''} ${rec.location || ''} ${rec.facilityName || ''}`.toLowerCase();
      if (!hay.includes(locFilter)) return false;
    }
    return true;
  });

  const nowIso = deps.nowIso();
  const updates: Array<{ id: string; fields: Record<string, unknown> }> = [];

  for (const rec of filtered) {
    const { patch, evaluation, shouldWrite } = computeServerEvaluationPatch(
      media,
      rec,
      standards,
      thresholds
    );
    const prevConclusion =
      normalizeStoredConclusion(rec) ||
      String(rec.status || rec.complianceStatus || 'BELUM DIEVALUASI');
    const changed =
      prevConclusion !== evaluation.overall ||
      (media === 'air_limbah_domestik'
        ? rec.complianceStatus !== patch.complianceStatus
        : rec.status !== patch.status);

    if (onlyChanged && !changed && !shouldWrite) {
      continue;
    }

    const prevHistory: EvaluationHistoryEntry[] = Array.isArray(rec.evaluationHistory)
      ? rec.evaluationHistory.slice(-19)
      : [];
    const newEntry: EvaluationHistoryEntry = {
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

export const evaluateWastewaterOnWrite = onDocumentWritten(
  buildDocumentTriggerOptions('wastewater/{docId}'),
  async (event) => {
    const snap = event.data?.after;
    if (!snap?.exists) return;
    await processWaterDocumentWrite(
      'wastewater',
      snap.data() as Record<string, any>,
      (fields) => snap.ref.update(fields as Record<string, any>)
    );
  }
);

export const evaluateSurfaceWaterOnWrite = onDocumentWritten(
  buildDocumentTriggerOptions('surfacewater/{docId}'),
  async (event) => {
    const snap = event.data?.after;
    if (!snap?.exists) return;
    await processWaterDocumentWrite(
      'surfacewater',
      snap.data() as Record<string, any>,
      (fields) => snap.ref.update(fields as Record<string, any>)
    );
  }
);

export const evaluateDomesticWastewaterOnWrite = onDocumentWritten(
  buildDocumentTriggerOptions('domestic_wastewater/{docId}'),
  async (event) => {
    const snap = event.data?.after;
    if (!snap?.exists) return;
    await processWaterDocumentWrite(
      'domestic_wastewater',
      snap.data() as Record<string, any>,
      (fields) => snap.ref.update(fields as Record<string, any>)
    );
  }
);

export const reevaluateRange = onCall(buildCallableOptions(), async (request) => {
  return processReevaluateRange(request.auth, request.data);
});
