/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  onSnapshot,
  updateDoc,
  where,
  documentId,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions, handleFirestoreError, OperationType } from '../utils/firebaseAuth';
import { getCachedFeatureFlags } from './featureFlagService';
import { 
  WastewaterData,
  WastewaterPhoto,
  NurseryStockOut, 
  SurfaceWaterData,
  RainfallData, 
  NurseryData, 
  ReclamationPlan, 
  ReclamationGuarantee, 
  WasteIn, 
  WasteOut, 
  EnvironmentalDocument, 
  ComplianceCalendarEvent, 
  EnvironmentalCost,
  AlertNotification,
  SolidWasteData, CapaData, CapaHistory,
  ComplianceMatrixData,
  IncidentData,
  RegulatoryWatchData,
  AmdTreatmentData,
  AirEmissionData,
  TopsoilErosionData,
  BiodiversityData,
  IadlRiskData,
  ProperRkabData,
  EnvironmentalStandard,
  InternalThresholdsConfig,
  ProperCriteriaMaster,
  StandardMedia,
  PertekSloData,
  ReportingCalendarData,
  ExternalSupervisionData,
  DomesticWastewaterData,
  GhgEmissionFactorData,
  GhgActivityData,
  EvaluationHistoryEntry
} from '../types';
import { 
  WastewaterSchema,
  NurseryStockOutSchema, 
  SurfaceWaterSchema,
  RainfallSchema, 
  NurserySchema, 
  ReclamationPlanSchema, 
  ReclamationGuaranteeSchema, 
  WasteInSchema, 
  WasteOutSchema, 
  EnvironmentalDocumentSchema, 
  ComplianceCalendarEventSchema, 
  EnvironmentalCostSchema,
  SolidWasteSchema,
  ComplianceMatrixSchema,
  IncidentSchema,
  RegulatoryWatchSchema,
  AmdTreatmentSchema,
  AirEmissionSchema,
  TopsoilErosionSchema,
  BiodiversitySchema,
  IadlRiskSchema,
  ProperRkabSchema,
  EnvironmentalStandardSchema,
  InternalThresholdsSchema,
  ProperCriteriaMasterSchema,
  PertekSloSchema,
  ReportingCalendarSchema,
  ExternalSupervisionSchema,
  DomesticWastewaterSchema,
  GhgEmissionFactorSchema,
  GhgActivitySchema
} from '../utils/validation';
import { auditService } from './auditService';
import {
  resolveActiveStandards,
  DEFAULT_INTERNAL_THRESHOLDS,
  DEFAULT_PROPER_CRITERIA,
  INITIAL_STANDARDS_SEED,
  REGULATORY_WATCH_SEED_15,
  isProtectedConservationStatus,
} from '../data/regulations';
import { evaluateSampleCompliance, ReEvaluationPreviewItem } from '../utils/waterQualityEval';
import { getOfflineCache, setOfflineCache } from '../utils/googleSync';
import { getTimeMs, compareLatestFirst } from '../utils/dateUtils';
import { buildWasteLedger, simulateOutflowValidation } from '../utils/wasteLedger';

let _cachedStandards: EnvironmentalStandard[] = getOfflineCache<EnvironmentalStandard[]>('standards', []);
let _standardsLoadedFromServer = false;
let _cachedThresholds: InternalThresholdsConfig = getOfflineCache<InternalThresholdsConfig>('env_thresholds', {
  ...DEFAULT_INTERNAL_THRESHOLDS,
});

async function getEvaluationContext(
  media: StandardMedia,
  opts?: { locationCode?: string; sampleDate?: string; kelasAir?: 'I' | 'II' | 'III' | 'IV' }
) {
  let standards = _cachedStandards;
  if (!_standardsLoadedFromServer || !standards || standards.length === 0) {
    try {
      const snap = await getDocs(collection(db, 'standards'));
      _standardsLoadedFromServer = true;
      standards = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as EnvironmentalStandard);
      _cachedStandards = standards;
      setOfflineCache('standards', standards);
    } catch {
      // Tetap gunakan cache lokal jika offline; jangan fallback diam-diam ke angka hardcoded
      standards = _cachedStandards || [];
    }
  }

  let thresholds = _cachedThresholds;
  try {
    if (!thresholds || typeof thresholds.warningRatio !== 'number') {
      const thSnap = await getDoc(doc(db, 'app_meta', 'env_thresholds'));
      if (thSnap.exists()) {
        thresholds = { ...DEFAULT_INTERNAL_THRESHOLDS, ...(thSnap.data() as InternalThresholdsConfig) };
        _cachedThresholds = thresholds;
        setOfflineCache('env_thresholds', thresholds);
      }
    }
  } catch {
    // Gunakan DEFAULT_INTERNAL_THRESHOLDS (warningRatio 0.85, phMargin 0.3)
  }

  const activeMap = resolveActiveStandards(standards, media, opts);
  const snapshot: Record<string, any> = {};
  const idList: string[] = [];
  for (const [k, std] of Object.entries(activeMap)) {
    if (std.id) idList.push(std.id);
    snapshot[k] = {
      id: std.id,
      minLimit: std.minLimit ?? null,
      maxLimit: std.maxLimit ?? null,
      unit: std.unit,
      basisRegulasi: std.basisRegulasi,
      approvalDocNo: std.approvalDocNo ?? null,
      verificationStatus: std.verificationStatus,
      effectiveStatus: std.effectiveStatus ?? null,
      applicable: std.applicable ?? true,
    };
  }
  const standardId = idList.join(',').slice(0, 120) || undefined;
  return { standards, thresholds, standardId, standardSnapshot: Object.keys(snapshot).length > 0 ? snapshot : undefined };
}

// Helper to sanitize error messaging
function handleValidationError(error: any): never {
  const fieldErrors = error.flatten().fieldErrors;
  const errorMsg = Object.entries(fieldErrors)
    .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
    .join('; ');
  throw new Error(`Validasi gagal - ${errorMsg}`);
}

const trailCreate = () => ({
  createdBy: auth.currentUser?.email ?? '',
  createdAt: serverTimestamp(),
  updatedBy: auth.currentUser?.email ?? '',
  updatedAt: serverTimestamp(),
});

const trailUpdate = () => ({
  updatedBy: auth.currentUser?.email ?? '',
  updatedAt: serverTimestamp(),
});

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

const SERVER_EVAL_OWNED_FIELDS = [
  'status',
  'complianceStatus',
  'evaluationStatus',
  'evaluationReason',
  'standardBasis',
  'standardId',
  'standardSnapshot',
  'serverEvaluatedAt',
  'evaluationHistory',
] as const;

function stripServerEvalFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = { ...obj };
  for (const key of SERVER_EVAL_OWNED_FIELDS) {
    delete result[key];
  }
  return result;
}

// 1. Wastewater (Water Quality) Operations
export const waterQualityService = {
  subscribe: (callback: (data: WastewaterData[]) => void) => {
    const cached = getOfflineCache<WastewaterData[]>('wastewater', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'wastewater'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as WastewaterData);
      setOfflineCache('wastewater', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'wastewater');
    });
  },

  getPhoto: async (wastewaterId: string): Promise<WastewaterPhoto | null> => {
    try {
      const snap = await getDoc(doc(db, 'wastewater_photos', wastewaterId));
      if (snap.exists()) {
        return snap.data() as WastewaterPhoto;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'wastewater_photos');
      return null;
    }
  },

  add: async (
    item: Omit<WastewaterData, 'id' | 'status'>,
    photo?: Omit<WastewaterPhoto, 'id' | 'wastewaterId' | 'createdAt'> | null
  ): Promise<WastewaterData> => {
    // Prevent duplicate entries for 'Harian' monitoringType with same date and locationCode
    if ((item.monitoringType || 'Harian') === 'Harian' && item.locationCode) {
      const dupQuery = query(
        collection(db, 'wastewater'),
        where('date', '==', item.date),
        where('locationCode', '==', item.locationCode),
        where('monitoringType', '==', 'Harian')
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        throw new Error(
          `Data harian titik ${item.locationCode} tanggal ${item.date} sudah ada. Edit data yang ada.`
        );
      }
    }

    const evalCtx = await getEvaluationContext('air_limbah', {
      locationCode: item.locationCode,
      sampleDate: item.date,
    });
    const evalRes = evaluateSampleCompliance('air_limbah', item as Record<string, unknown>, {
      standards: evalCtx.standards,
      thresholds: evalCtx.thresholds,
      locationCode: item.locationCode,
      sampleDate: item.date,
      unitMap: item.unitMap,
    });
    const status = evalRes.legacyStatus;
    const id = `WW-${crypto.randomUUID()}`;
    const hasPhoto = Boolean(photo && photo.dataUrl);
    
    const serverEvalActive = getCachedFeatureFlags().serverEvaluation;
    const newItem: WastewaterData = serverEvalActive
      ? {
          ...item,
          id,
          hasPhoto,
        }
      : {
          ...item,
          id,
          status,
          evaluationStatus: evalRes.overall,
          evaluationReason: evalRes.evaluationReason,
          standardBasis: evalRes.standardsBasis,
          hasPhoto,
          standardId: evalCtx.standardId,
          standardSnapshot: evalCtx.standardSnapshot,
        };

    const parseResult = WastewaterSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const writePayload = serverEvalActive
      ? stripUndefined(stripServerEvalFields({ ...newItem, ...trailCreate() }))
      : stripUndefined({ ...newItem, ...trailCreate() });

    const batch = writeBatch(db);
    batch.set(doc(db, 'wastewater', id), writePayload);

    // Store sampling photo separately in 'wastewater_photos'
    if (photo && photo.dataUrl) {
      const photoDoc: WastewaterPhoto = {
        id,
        wastewaterId: id,
        dataUrl: photo.dataUrl,
        mimeType: 'image/jpeg',
        width: photo.width,
        height: photo.height,
        sizeBytes: photo.sizeBytes,
        takenAt: photo.takenAt || `${item.date} ${item.sampleTime || '08:00'}`,
        createdBy: auth.currentUser?.email || item.officer,
        createdAt: serverTimestamp(),
      };
      batch.set(doc(db, 'wastewater_photos', id), photoDoc);
    }

    auditService.addToBatch(batch, {
      collection: 'wastewater',
      module: 'monitoring',
      recordId: id,
      action: 'insert',
      details: serverEvalActive
        ? `Menambah data kualitas air limbah di lokasi ${item.location} (${item.locationCode || 'N/A'}) — Menunggu evaluasi server${hasPhoto ? ' + Foto Evidence' : ''}`
        : `Menambah data kualitas air limbah di lokasi ${item.location} (${item.locationCode || 'N/A'}) dengan kesimpulan ${evalRes.overall}${hasPhoto ? ' + Foto Evidence' : ''}`,
      afterData: newItem as Record<string, any>,
    });

    await batch.commit();

    // Check if limits exceeded to trigger a system-wide alert (best-effort)
    try {
      if (status === 'Exceeded') {
        await notificationService.add({
          type: 'Critical',
          category: 'Wastewater',
          title: 'Baku Mutu Terlampaui!',
          message: `Pengujian di ${item.location} melampaui batas regulasi (${evalRes.failedParams.join(', ')}): pH: ${item.ph ?? '-'}, TSS: ${item.tss ?? '-'} mg/L. Segera lakukan tindakan pengendalian.`
        });
      } else if (status === 'Warning') {
        await notificationService.add({
          type: 'Warning',
          category: 'Wastewater',
          title: 'Mendekati Baku Mutu',
          message: `Pengujian di ${item.location} mendekati parameter kritis (${evalRes.warningParams.join(', ')}): pH: ${item.ph ?? '-'}, TSS: ${item.tss ?? '-'} mg/L.`
        });
      }
    } catch {
      // non-fatal alert
    }

    return newItem;
  },

  delete: async (id: string, reason?: string): Promise<void> => {
    const docRef = doc(db, 'wastewater', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as WastewaterData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'wastewater',
      module: 'monitoring',
      recordId: id,
      action: 'delete',
      details: `Menghapus kualitas air limbah di lokasi ${oldData.location || '-'}, tgl: ${oldData.date || '-'}, pH: ${oldData.ph ?? '-'}, TSS: ${oldData.tss ?? '-'}`,
      beforeData: oldData as Record<string, any>,
      correctionReason: reason || null,
    });
    await batch.commit();

    // Delete photo from separate collection if exists (best-effort)
    try {
      await deleteDoc(doc(db, 'wastewater_photos', id));
    } catch {
      // ignore if photo document does not exist
    }

    // Update offline cache
    const docs = getOfflineCache<WastewaterData[]>('wastewater', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('wastewater', updated);
  },

  update: async (
    id: string, 
    item: Partial<WastewaterData>,
    photo?: Omit<WastewaterPhoto, 'id' | 'wastewaterId' | 'createdAt'> | null
  ): Promise<void> => {
    const docRef = doc(db, 'wastewater', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data tidak ditemukan");
    const oldData = snap.data() as WastewaterData;

    // Check duplicate if date, locationCode, or monitoringType is updated
    const targetDate = item.date ?? oldData.date;
    const targetLocCode = item.locationCode ?? oldData.locationCode;
    const targetType = item.monitoringType ?? oldData.monitoringType ?? 'Harian';

    if (targetType === 'Harian' && targetLocCode) {
      const dupQuery = query(
        collection(db, 'wastewater'),
        where('date', '==', targetDate),
        where('locationCode', '==', targetLocCode),
        where('monitoringType', '==', 'Harian')
      );
      const dupSnap = await getDocs(dupQuery);
      const otherDups = dupSnap.docs.filter(d => d.id !== id);
      if (otherDups.length > 0) {
        throw new Error(
          `Data harian titik ${targetLocCode} tanggal ${targetDate} sudah ada. Edit data yang ada.`
        );
      }
    }

    const batch = writeBatch(db);
    let hasPhoto = oldData.hasPhoto ?? false;
    let shouldDeletePhoto = false;
    if (photo !== undefined) {
      if (photo === null) {
        shouldDeletePhoto = true;
        hasPhoto = false;
      } else if (photo.dataUrl) {
        const photoDoc: WastewaterPhoto = {
          id,
          wastewaterId: id,
          dataUrl: photo.dataUrl,
          mimeType: 'image/jpeg',
          width: photo.width,
          height: photo.height,
          sizeBytes: photo.sizeBytes,
          takenAt: photo.takenAt || `${targetDate} ${item.sampleTime || oldData.sampleTime || '08:00'}`,
          createdBy: auth.currentUser?.email || item.officer || oldData.officer,
          createdAt: serverTimestamp(),
        };
        batch.set(doc(db, 'wastewater_photos', id), photoDoc);
        hasPhoto = true;
      }
    }

    const merged = { ...oldData, ...item, id, hasPhoto };
    const evalCtx = await getEvaluationContext('air_limbah', {
      locationCode: merged.locationCode,
      sampleDate: merged.date,
    });
    const evalRes = evaluateSampleCompliance('air_limbah', merged as Record<string, unknown>, {
      standards: evalCtx.standards,
      thresholds: evalCtx.thresholds,
      locationCode: merged.locationCode,
      sampleDate: merged.date,
      unitMap: merged.unitMap,
    });
    const serverEvalActive = getCachedFeatureFlags().serverEvaluation;
    const updatedItem: WastewaterData = serverEvalActive
      ? {
          ...merged,
        }
      : {
          ...merged,
          status: evalRes.legacyStatus,
          evaluationStatus: evalRes.overall,
          evaluationReason: evalRes.evaluationReason,
          standardBasis: evalRes.standardsBasis,
          standardId: evalCtx.standardId,
          standardSnapshot: evalCtx.standardSnapshot,
        };

    const parseResult = WastewaterSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const updatePayload = serverEvalActive
      ? stripUndefined(stripServerEvalFields({ ...updatedItem, ...trailUpdate() }))
      : stripUndefined({ ...updatedItem, ...trailUpdate() });

    batch.update(docRef, updatePayload as any);
    auditService.addToBatch(batch, {
      collection: 'wastewater',
      module: 'monitoring',
      recordId: id,
      action: 'update',
      details: serverEvalActive
        ? `Mengubah data kualitas air limbah di lokasi ${updatedItem.location} (Evaluasi ulang server)`
        : `Mengubah data kualitas air limbah di lokasi ${updatedItem.location} (${evalRes.overall})`,
      beforeData: oldData as Record<string, any>,
      afterData: (serverEvalActive ? stripServerEvalFields(updatedItem) : updatedItem) as Record<string, any>,
      correctionReason: item.correctionReason || null,
    });
    await batch.commit();

    if (shouldDeletePhoto) {
      try {
        await deleteDoc(doc(db, 'wastewater_photos', id));
      } catch {
        // ignore if photo deletion requires higher privilege or doc missing
      }
    }

    // Update offline cache
    const docs = getOfflineCache<WastewaterData[]>('wastewater', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('wastewater', updatedDocs);
  }
};

// 1.1 Surface Water (Air Permukaan) Operations
export const surfaceWaterService = {
  subscribe: (callback: (data: SurfaceWaterData[]) => void) => {
    const cached = getOfflineCache<SurfaceWaterData[]>('surfacewater', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'surfacewater'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as SurfaceWaterData);
      setOfflineCache('surfacewater', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'surfacewater');
    });
  },

  add: async (item: Omit<SurfaceWaterData, 'id' | 'status'>): Promise<SurfaceWaterData> => {
    const kelasAir = item.kelasAir ?? 'II';
    const evalCtx = await getEvaluationContext('air_permukaan', {
      sampleDate: item.date,
      kelasAir,
    });
    const evalRes = evaluateSampleCompliance('air_permukaan', { ...item, kelasAir }, {
      standards: evalCtx.standards,
      thresholds: evalCtx.thresholds,
      sampleDate: item.date,
      kelasAir,
      unitMap: item.unitMap,
    });
    const status = evalRes.legacyStatus;
    const id = `SW-${crypto.randomUUID()}`;
    
    const serverEvalActive = getCachedFeatureFlags().serverEvaluation;
    const newItem: SurfaceWaterData = serverEvalActive
      ? {
          ...item,
          id,
          kelasAir,
        }
      : {
          ...item,
          id,
          kelasAir,
          status,
          evaluationStatus: evalRes.overall,
          evaluationReason: evalRes.evaluationReason,
          standardBasis: evalRes.standardsBasis,
          standardId: evalCtx.standardId,
          standardSnapshot: evalCtx.standardSnapshot,
        };

    const parseResult = SurfaceWaterSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const writePayload = serverEvalActive
      ? stripUndefined(stripServerEvalFields({ ...newItem, ...trailCreate() }))
      : stripUndefined({ ...newItem, ...trailCreate() });

    const batch = writeBatch(db);
    batch.set(doc(db, 'surfacewater', id), writePayload);
    auditService.addToBatch(batch, {
      collection: 'surfacewater',
      module: 'monitoring',
      recordId: id,
      action: 'insert',
      details: serverEvalActive
        ? `Menambah data kualitas air permukaan di lokasi ${item.location} (Kelas ${kelasAir}) — Menunggu evaluasi server`
        : `Menambah data kualitas air permukaan di lokasi ${item.location} (Kelas ${kelasAir}) dengan kesimpulan ${evalRes.overall}`,
      afterData: newItem as Record<string, any>,
    });
    await batch.commit();

    try {
      if (status === 'Exceeded') {
        await notificationService.add({
          type: 'Critical',
          category: 'SurfaceWater',
          title: 'Baku Mutu Air Permukaan Terlampaui!',
          message: `Pengujian di ${item.location} melampaui batas regulasi PP No. 22 Tahun 2021 Lampiran VI Kelas ${kelasAir} (${evalRes.failedParams.join(', ')}).`
        });
      } else if (status === 'Warning') {
        await notificationService.add({
          type: 'Warning',
          category: 'SurfaceWater',
          title: 'Air Permukaan Mendekati Baku Mutu',
          message: `Pengujian di ${item.location} mendekati parameter kritis Kelas ${kelasAir} (${evalRes.warningParams.join(', ')}).`
        });
      }
    } catch {
      // non-fatal alert
    }

    return newItem;
  },

  delete: async (id: string, reason?: string): Promise<void> => {
    const docRef = doc(db, 'surfacewater', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as SurfaceWaterData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'surfacewater',
      module: 'monitoring',
      recordId: id,
      action: 'delete',
      details: `Menghapus kualitas air permukaan di lokasi ${oldData.location || '-'}, tgl: ${oldData.date || '-'}, status: ${oldData.status || '-'}`,
      beforeData: oldData as Record<string, any>,
      correctionReason: reason || null,
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<SurfaceWaterData[]>('surfacewater', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('surfacewater', updated);
  },

  update: async (id: string, item: Partial<SurfaceWaterData>): Promise<void> => {
    const docRef = doc(db, 'surfacewater', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data tidak ditemukan");
    const oldData = snap.data() as SurfaceWaterData;
    const merged = { ...oldData, ...item, id };
    const kelasAir = merged.kelasAir ?? 'II';
    const evalCtx = await getEvaluationContext('air_permukaan', {
      sampleDate: merged.date,
      kelasAir,
    });
    const evalRes = evaluateSampleCompliance('air_permukaan', { ...merged, kelasAir }, {
      standards: evalCtx.standards,
      thresholds: evalCtx.thresholds,
      sampleDate: merged.date,
      kelasAir,
      unitMap: merged.unitMap,
    });
    const serverEvalActive = getCachedFeatureFlags().serverEvaluation;
    const updatedItem: SurfaceWaterData = serverEvalActive
      ? {
          ...merged,
          kelasAir,
        }
      : {
          ...merged,
          kelasAir,
          status: evalRes.legacyStatus,
          evaluationStatus: evalRes.overall,
          evaluationReason: evalRes.evaluationReason,
          standardBasis: evalRes.standardsBasis,
          standardId: evalCtx.standardId,
          standardSnapshot: evalCtx.standardSnapshot,
        };

    const parseResult = SurfaceWaterSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const updatePayload = serverEvalActive
      ? stripUndefined(stripServerEvalFields({ ...updatedItem, ...trailUpdate() }))
      : stripUndefined({ ...updatedItem, ...trailUpdate() });

    const batch = writeBatch(db);
    batch.update(docRef, updatePayload as any);
    auditService.addToBatch(batch, {
      collection: 'surfacewater',
      module: 'monitoring',
      recordId: id,
      action: 'update',
      details: serverEvalActive
        ? `Mengubah data kualitas air permukaan di lokasi ${updatedItem.location} (Evaluasi ulang server)`
        : `Mengubah data kualitas air permukaan di lokasi ${updatedItem.location} (${evalRes.overall})`,
      beforeData: oldData as Record<string, any>,
      afterData: (serverEvalActive ? stripServerEvalFields(updatedItem) : updatedItem) as Record<string, any>,
      correctionReason: item.correctionReason || null,
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<SurfaceWaterData[]>('surfacewater', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('surfacewater', updatedDocs);
  }
};

// 2. Rainfall Operations
export const rainfallService = {
  subscribe: (callback: (data: RainfallData[]) => void) => {
    const cached = getOfflineCache<RainfallData[]>('rainfall', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'rainfall'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as RainfallData);
      setOfflineCache('rainfall', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'rainfall');
    });
  },

  add: async (item: Omit<RainfallData, 'id'>): Promise<RainfallData> => {
    const id = `RF-${crypto.randomUUID()}`;
    const newItem: RainfallData = {
      ...item,
      id
    };

    const parseResult = RainfallSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'rainfall', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'rainfall',
      recordId: id,
      action: 'insert',
      details: `Menambah catatan curah hujan di stasiun ${item.station} sebesar ${item.rainfall} mm`
    });
    await batch.commit();

    // Handle high intensity rain triggers (best-effort)
    if (item.rainfall >= 50) {
      try {
        await notificationService.add({
          type: 'Warning',
          category: 'Wastewater',
          title: 'Curah Hujan Tinggi!',
          message: `Curah hujan tinggi terdeteksi di stasiun ${item.station} sebesar ${item.rainfall} mm. Naikkan pengawasan tanggul & pompa sump.`
        });
      } catch {
        // non-fatal alert
      }
    }

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'rainfall', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as RainfallData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'rainfall',
      recordId: id,
      action: 'delete',
      details: `Menghapus curah hujan stasiun ${oldData.station || '-'}, tgl: ${oldData.date || '-'}, curah: ${oldData.rainfall ?? 0} mm`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<RainfallData[]>('rainfall', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('rainfall', updated);
  },

  update: async (id: string, item: Partial<RainfallData>): Promise<void> => {
    const docRef = doc(db, 'rainfall', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data tidak ditemukan");
    const oldData = snap.data() as RainfallData;
    const updatedItem = { ...oldData, ...item, id };

    const parseResult = RainfallSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'rainfall',
      recordId: id,
      action: 'update',
      details: `Mengubah data curah hujan di stasiun ${updatedItem.station}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<RainfallData[]>('rainfall', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('rainfall', updatedDocs);
  }
};

// 3. Nursery Operations
export const nurseryService = {
  subscribe: (callback: (data: NurseryData[]) => void) => {
    const cached = getOfflineCache<NurseryData[]>('nursery', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'nursery'), orderBy('dateIn', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as NurseryData);
      setOfflineCache('nursery', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'nursery');
    });
  },

  add: async (item: Omit<NurseryData, 'id'>): Promise<NurseryData> => {
    const id = `NS-${crypto.randomUUID()}`;
    const newItem: NurseryData = {
      ...item,
      id
    };

    const parseResult = NurserySchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'nursery', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'nursery',
      recordId: id,
      action: 'insert',
      details: `Menambah stok nursery ${item.plantType} sebanyak ${item.quantity} bibit`
    });
    await batch.commit();

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'nursery', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as NurseryData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'nursery',
      recordId: id,
      action: 'delete',
      details: `Menghapus bibit nursery: ${oldData.plantType || '-'}, batch: ${oldData.batchCode || '-'}, jumlah: ${oldData.quantity ?? 0}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<NurseryData[]>('nursery', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('nursery', updated);
  },

  update: async (id: string, item: Partial<NurseryData>): Promise<void> => {
    const docRef = doc(db, 'nursery', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data tidak ditemukan");
    const oldData = snap.data() as NurseryData;
    const updatedItem = { ...oldData, ...item, id };

    const parseResult = NurserySchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'nursery',
      recordId: id,
      action: 'update',
      details: `Mengubah data nursery ${updatedItem.plantType}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<NurseryData[]>('nursery', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('nursery', updatedDocs);
  }
};

// 4. Reclamation Plans & Guarantees Operations
export const reclamationService = {
  subscribeAll: (
    onPlans: (data: ReclamationPlan[]) => void,
    onGuarantees: (data: ReclamationGuarantee[]) => void,
    options?: { includeGuarantees?: boolean }
  ) => {
    const includeGuarantees = options?.includeGuarantees ?? false;
    // Seed cache untuk masing-masing
    const cachedPlans = getOfflineCache<ReclamationPlan[]>('reclamation_plans', []);
    if (cachedPlans.length > 0) onPlans(cachedPlans);

    const plansQuery = query(
      collection(db, 'reclamation'),
      where(documentId(), '>=', 'RP-'),
      where(documentId(), '<', 'RP.')
    );
    const unsubPlans = onSnapshot(plansQuery, (snapshot) => {
      const plans = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as ReclamationPlan);
      setOfflineCache('reclamation_plans', plans);
      onPlans(plans);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reclamation');
    });

    let unsubGuarantees: (() => void) | null = null;
    if (includeGuarantees) {
      const cachedGuarantees = getOfflineCache<ReclamationGuarantee[]>('reclamation_guarantees', []);
      if (cachedGuarantees.length > 0) onGuarantees(cachedGuarantees);
      const guaranteesQuery = query(
        collection(db, 'reclamation'),
        where(documentId(), '>=', 'RG-'),
        where(documentId(), '<', 'RG.')
      );
      unsubGuarantees = onSnapshot(guaranteesQuery, (snapshot) => {
        const guarantees = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as ReclamationGuarantee);
        setOfflineCache('reclamation_guarantees', guarantees);
        onGuarantees(guarantees);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'reclamation');
      });
    } else {
      onGuarantees([]);
    }

    return () => {
      unsubPlans();
      if (unsubGuarantees) unsubGuarantees();
    };
  },

  addPlan: async (item: Omit<ReclamationPlan, 'id'>): Promise<ReclamationPlan> => {
    const id = `RP-${crypto.randomUUID()}`;
    const newItem: ReclamationPlan = {
      ...item,
      id
    };

    const parseResult = ReclamationPlanSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'reclamation', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'reclamation',
      recordId: id,
      action: 'insert',
      details: `Membuat rencana reklamasi baru di area ${item.areaName} tahun target ${item.targetYear}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<ReclamationPlan[]>('reclamation_plans', []);
    const updated = [newItem, ...docs.filter(x => x.id !== id)];
    setOfflineCache('reclamation_plans', updated);

    return newItem;
  },

  updatePlan: async (id: string, item: Partial<ReclamationPlan>): Promise<void> => {
    const docRef = doc(db, 'reclamation', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Rencana reklamasi tidak ditemukan.");
    }
    const current = snap.data() as ReclamationPlan;
    const merged = { ...current, ...item, id };

    const parseResult = ReclamationPlanSchema.safeParse(merged);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...merged, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'reclamation',
      recordId: id,
      action: 'update',
      details: `Memperbarui rencana reklamasi area ${current.areaName} (Status: ${merged.status})`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<ReclamationPlan[]>('reclamation_plans', []);
    const updatedDocs = docs.map(x => x.id === id ? merged : x);
    setOfflineCache('reclamation_plans', updatedDocs);

    // Notify upon completion of block targets (non-fatal)
    if (merged.status === 'Completed' && current.status !== 'Completed') {
      try {
        await notificationService.add({
          type: 'Info',
          category: 'Guarantee',
          title: 'Blok Reklamasi Selesai',
          message: `Program revegetasi di blok ${merged.areaName} seluas ${merged.realizedSizeHa || merged.sizeHa} Ha telah dipastikan selesai.`
        });
      } catch {
        // Non-fatal
      }
    }
  },

  deletePlan: async (id: string): Promise<void> => {
    const docRef = doc(db, 'reclamation', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const current = snap.data() as ReclamationPlan;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'reclamation',
      recordId: id,
      action: 'delete',
      details: `Menghapus rencana reklamasi area: ${current.areaName || '-'}, tahun target: ${current.targetYear ?? '-'}, luas: ${current.sizeHa ?? 0} Ha`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<ReclamationPlan[]>('reclamation_plans', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('reclamation_plans', updated);
  },

  addGuarantee: async (item: Omit<ReclamationGuarantee, 'id'>): Promise<ReclamationGuarantee> => {
    const id = `RG-${crypto.randomUUID()}`;
    const newItem: ReclamationGuarantee = {
      ...item,
      id
    };

    const parseResult = ReclamationGuaranteeSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'reclamation', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'reclamation',
      recordId: id,
      action: 'insert',
      details: `Mendaftarkan jaminan rekening reklamasi baru No: ${item.guaranteeNo}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<ReclamationGuarantee[]>('reclamation_guarantees', []);
    const updated = [newItem, ...docs.filter(x => x.id !== id)];
    setOfflineCache('reclamation_guarantees', updated);

    return newItem;
  },

  deleteGuarantee: async (id: string): Promise<void> => {
    const docRef = doc(db, 'reclamation', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const current = snap.data() as ReclamationGuarantee;
    const valFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(current.value || 0);

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'reclamation',
      recordId: id,
      action: 'delete',
      details: `Menghapus jaminan reklamasi No: ${current.guaranteeNo || '-'}, Tipe: ${current.guaranteeType || '-'}, Nilai: ${valFormatted}, Penerbit: ${current.issuingInstitution || '-'}, Jatuh Tempo: ${current.dueDate || '-'}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<ReclamationGuarantee[]>('reclamation_guarantees', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('reclamation_guarantees', updated);
  },

  updateGuarantee: async (id: string, item: Partial<ReclamationGuarantee>): Promise<void> => {
    const docRef = doc(db, 'reclamation', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Jaminan tidak ditemukan");
    const oldData = snap.data() as ReclamationGuarantee;
    const updatedItem = { ...oldData, ...item, id };

    const parseResult = ReclamationGuaranteeSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'reclamation',
      recordId: id,
      action: 'update',
      details: `Mengubah jaminan reklamasi No: ${updatedItem.guaranteeNo}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<ReclamationGuarantee[]>('reclamation_guarantees', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('reclamation_guarantees', updatedDocs);
  }
};

// 5. Hazardous Waste (Limbah B3) Operations
export const wasteB3Service = {
  subscribeAll: (
    onWasteIn: (data: WasteIn[]) => void,
    onWasteOut: (data: WasteOut[]) => void
  ) => {
    const cachedIn = getOfflineCache<WasteIn[]>('waste_in', []);
    const cachedOut = getOfflineCache<WasteOut[]>('waste_out', []);
    if (cachedIn.length > 0) onWasteIn([...cachedIn].sort(compareLatestFirst));
    if (cachedOut.length > 0) onWasteOut([...cachedOut].sort(compareLatestFirst));

    const q = collection(db, 'waste_b3');
    return onSnapshot(q, (snapshot) => {
      const listIn = snapshot.docs
        .filter(doc => doc.id.startsWith('WI-'))
        .map(doc => ({ ...doc.data({ serverTimestamps: 'estimate' }), id: doc.id }) as WasteIn)
        .sort(compareLatestFirst);
      const listOut = snapshot.docs
        .filter(doc => doc.id.startsWith('WO-'))
        .map(doc => ({ ...doc.data({ serverTimestamps: 'estimate' }), id: doc.id }) as WasteOut)
        .sort(compareLatestFirst);
      setOfflineCache('waste_in', listIn);
      setOfflineCache('waste_out', listOut);
      onWasteIn(listIn);
      onWasteOut(listOut);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'waste_b3');
    });
  },

  addIn: async (item: Omit<WasteIn, 'id'>): Promise<WasteIn> => {
    const id = `WI-${crypto.randomUUID()}`;
    const newItem: WasteIn = {
      ...item,
      id
    };

    const parseResult = WasteInSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'waste_b3', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'waste_b3',
      module: 'waste_b3',
      recordId: id,
      action: 'insert',
      details: `Mencatat masuk limbah B3 ${item.wasteType} sebesar ${item.weightKg.toLocaleString('id-ID')} kg`,
      afterData: newItem as Record<string, any>,
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<WasteIn[]>('waste_in', []);
    const updated = [newItem, ...docs.filter(x => x.id !== id)].sort(compareLatestFirst);
    setOfflineCache('waste_in', updated);

    return newItem;
  },

  deleteIn: async (id: string, reason?: string): Promise<void> => {
    const docRef = doc(db, 'waste_b3', id);
    const targetSnap = await getDoc(docRef);
    if (!targetSnap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const targetIn = ({ ...targetSnap.data({ serverTimestamps: 'estimate' }), id: targetSnap.id }) as WasteIn;

    // Ambil data terkini dari Firestore untuk pengecekan konsistensi ledger
    const snap = await getDocs(collection(db, 'waste_b3'));
    const currentIn = snap.docs
      .filter(d => d.id.startsWith('WI-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteIn);
    const currentOut = snap.docs
      .filter(d => d.id.startsWith('WO-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteOut);

    const candidateIn = currentIn.filter(x => x.id !== id);
    const simLedger = buildWasteLedger(candidateIn, currentOut);

    // Tolak bila menyebabkan shortfall pada manifest manapun
    const hasShortfall = currentOut.some(o => (simLedger.outById[o.id]?.shortfallKg || 0) > 0);
    if (hasShortfall) {
      const currentLedger = buildWasteLedger(currentIn, currentOut);
      const affected = currentOut.filter(o => 
        currentLedger.outById[o.id]?.allocations.some(a => a.inId === id)
      );
      const manifestList = affected.map(m => m.manifestNo || m.id).join(', ');
      throw new Error(`Tidak dapat menghapus: limbah pada batch ${id} sudah dikeluarkan lewat manifest ${manifestList || 'pengeluaran B3'}.`);
    }

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'waste_b3',
      module: 'waste_b3',
      recordId: id,
      action: 'delete',
      details: `Menghapus catatan masuk limbah B3 ${id} (Jenis: ${targetIn.wasteType || '-'}, TPS: ${targetIn.tpsLocation || '-'}, Berat: ${targetIn.weightKg ?? 0} kg, Tgl: ${targetIn.dateIn || '-'})`,
      beforeData: targetIn as Record<string, any>,
      correctionReason: reason || null,
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<WasteIn[]>('waste_in', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('waste_in', updated);
  },

  updateIn: async (id: string, item: Partial<WasteIn>, reason?: string): Promise<void> => {
    const snapAll = await getDocs(collection(db, 'waste_b3'));
    const currentIn = snapAll.docs
      .filter(d => d.id.startsWith('WI-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteIn);
    const currentOut = snapAll.docs
      .filter(d => d.id.startsWith('WO-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteOut);

    const oldData = currentIn.find(x => x.id === id);
    if (!oldData) throw new Error("Manifest masuk tidak ditemukan");
    const updatedItem = { ...oldData, ...item, id };

    const parseResult = WasteInSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    // Simulasi seluruh ledger bila berat diperkecil / tanggal atau jenis diubah
    const candidateIn = currentIn.map(x => x.id === id ? updatedItem : x);
    const simLedger = buildWasteLedger(candidateIn, currentOut);
    const starved = currentOut.find(o => (simLedger.outById[o.id]?.shortfallKg || 0) > 0);
    if (starved) {
      const shortfallKg = simLedger.outById[starved.id]?.shortfallKg || 0;
      throw new Error(`Tidak dapat memperbarui batch masuk ${id}: perubahan menyebabkan kekurangan stok pada manifest ${starved.manifestNo || starved.id} sebesar ${shortfallKg.toLocaleString('id-ID')} Kg.`);
    }

    const docRef = doc(db, 'waste_b3', id);
    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'waste_b3',
      module: 'waste_b3',
      recordId: id,
      action: 'update',
      details: `Mengubah manifest masuk limbah B3 ${updatedItem.wasteType} (${updatedItem.weightKg.toLocaleString('id-ID')} kg)`,
      beforeData: oldData as Record<string, any>,
      afterData: updatedItem as Record<string, any>,
      correctionReason: reason || null,
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<WasteIn[]>('waste_in', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x).sort(compareLatestFirst);
    setOfflineCache('waste_in', updatedDocs);
  },

  addOut: async (
    item: Omit<WasteOut, 'id'>,
    options?: { correctionOverride?: { authorized: boolean; reason?: string } }
  ): Promise<WasteOut> => {
    const id = `WO-${crypto.randomUUID()}`;
    const newItem: WasteOut = {
      ...item,
      id
    };

    const parseResult = WasteOutSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const snapAll = await getDocs(collection(db, 'waste_b3'));
    const currentIn = snapAll.docs
      .filter(d => d.id.startsWith('WI-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteIn);
    const currentOut = snapAll.docs
      .filter(d => d.id.startsWith('WO-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteOut);

    const sim = simulateOutflowValidation(
      currentIn,
      currentOut,
      newItem,
      false,
      options?.correctionOverride
    );
    if (!sim.isValid) {
      throw new Error(sim.errorMessage || 'Validasi stok limbah B3 gagal.');
    }

    const candidateOut = [...currentOut, newItem];
    const ledger = buildWasteLedger(currentIn, candidateOut);
    const outInfo = ledger.outById[id];
    const remainingStock = ledger.stocks.find(s => s.wasteType === item.wasteType)?.currentStock ?? 0;
    const allocationsSummary = (outInfo?.allocations || [])
      .map(a => `${a.inId} (${a.kg.toLocaleString('id-ID')} Kg)`)
      .join(', ') || 'Tanpa alokasi';

    const batch = writeBatch(db);
    batch.set(doc(db, 'waste_b3', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'waste_b3',
      module: 'waste_b3',
      recordId: id,
      action: 'insert',
      details: `Mencatat keluar transpor limbah B3 No Manifest: ${item.manifestNo} (${item.weightKg.toLocaleString('id-ID')} Kg, Jenis: ${item.wasteType}). Alokasi batch: ${allocationsSummary}. Sisa stok: ${remainingStock.toLocaleString('id-ID')} Kg.`,
      afterData: newItem as Record<string, any>,
      correctionReason: options?.correctionOverride?.authorized ? options.correctionOverride.reason || null : null,
    });
    await batch.commit();

    const docs = getOfflineCache<WasteOut[]>('waste_out', []);
    const updated = [newItem, ...docs.filter(x => x.id !== id)].sort(compareLatestFirst);
    setOfflineCache('waste_out', updated);

    return newItem;
  },

  deleteOut: async (id: string, reason?: string): Promise<void> => {
    const docRef = doc(db, 'waste_b3', id);
    const targetSnap = await getDoc(docRef);
    if (!targetSnap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = ({ ...targetSnap.data({ serverTimestamps: 'estimate' }), id: targetSnap.id }) as WasteOut;

    const snapAll = await getDocs(collection(db, 'waste_b3'));
    const currentIn = snapAll.docs
      .filter(d => d.id.startsWith('WI-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteIn);
    const currentOut = snapAll.docs
      .filter(d => d.id.startsWith('WO-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteOut);

    const candidateOut = currentOut.filter(x => x.id !== id);
    const simLedger = buildWasteLedger(currentIn, candidateOut);
    const remainingStock = oldData
      ? (simLedger.stocks.find(s => s.wasteType === oldData.wasteType)?.currentStock ?? 0)
      : 0;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'waste_b3',
      module: 'waste_b3',
      recordId: id,
      action: 'delete',
      details: `Menghapus manifest keluar limbah B3 ${id} (No Manifest: ${oldData.manifestNo || '-'}, Jenis: ${oldData.wasteType || '-'}, Berat: ${oldData.weightKg ?? 0} kg, Transporter: ${oldData.transporter || '-'}). Sisa stok sesudahnya: ${remainingStock.toLocaleString('id-ID')} Kg.`,
      beforeData: oldData as Record<string, any>,
      correctionReason: reason || null,
    });
    await batch.commit();

    const docs = getOfflineCache<WasteOut[]>('waste_out', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('waste_out', updated);
  },

  updateOut: async (
    id: string,
    item: Partial<WasteOut>,
    options?: { correctionOverride?: { authorized: boolean; reason?: string } }
  ): Promise<void> => {
    const snapAll = await getDocs(collection(db, 'waste_b3'));
    const currentIn = snapAll.docs
      .filter(d => d.id.startsWith('WI-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteIn);
    const currentOut = snapAll.docs
      .filter(d => d.id.startsWith('WO-'))
      .map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as WasteOut);

    const oldData = currentOut.find(x => x.id === id);
    if (!oldData) throw new Error("Manifest keluar tidak ditemukan");
    const updatedItem = { ...oldData, ...item, id };

    const parseResult = WasteOutSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const sim = simulateOutflowValidation(
      currentIn,
      currentOut,
      updatedItem,
      true,
      options?.correctionOverride
    );
    if (!sim.isValid) {
      throw new Error(sim.errorMessage || 'Validasi perubahan manifest keluar gagal.');
    }

    const candidateOut = currentOut.map(x => x.id === id ? updatedItem : x);
    const ledger = buildWasteLedger(currentIn, candidateOut);
    const outInfo = ledger.outById[id];
    const remainingStock = ledger.stocks.find(s => s.wasteType === updatedItem.wasteType)?.currentStock ?? 0;
    const allocationsSummary = (outInfo?.allocations || [])
      .map(a => `${a.inId} (${a.kg.toLocaleString('id-ID')} Kg)`)
      .join(', ') || 'Tanpa alokasi';

    const docRef = doc(db, 'waste_b3', id);
    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'waste_b3',
      module: 'waste_b3',
      recordId: id,
      action: 'update',
      details: `Mengubah manifest keluar limbah B3 No Manifest: ${updatedItem.manifestNo} (${updatedItem.weightKg.toLocaleString('id-ID')} Kg). Alokasi batch: ${allocationsSummary}. Sisa stok: ${remainingStock.toLocaleString('id-ID')} Kg.`,
      beforeData: oldData as Record<string, any>,
      afterData: updatedItem as Record<string, any>,
      correctionReason: options?.correctionOverride?.reason || null,
    });
    await batch.commit();

    const docs = getOfflineCache<WasteOut[]>('waste_out', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x).sort(compareLatestFirst);
    setOfflineCache('waste_out', updatedDocs);
  }
};

// 6. Environmental Documents & Compliance Event Operations
export const documentService = {
  subscribeAll: (
    onDocs: (data: EnvironmentalDocument[]) => void,
    onEvents: (data: ComplianceCalendarEvent[]) => void
  ) => {
    const cachedDocs = getOfflineCache<EnvironmentalDocument[]>('documents', []);
    const cachedEvents = getOfflineCache<ComplianceCalendarEvent[]>('compliance_events', []);
    if (cachedDocs.length > 0) onDocs(cachedDocs);
    if (cachedEvents.length > 0) onEvents(cachedEvents);

    const q = collection(db, 'documents');
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .filter(doc => doc.id.startsWith('DOC-'))
        .map(doc => ({ ...doc.data(), id: doc.id }) as EnvironmentalDocument);
      const events = snapshot.docs
        .filter(doc => doc.id.startsWith('EV-'))
        .map(doc => ({ ...doc.data(), id: doc.id }) as ComplianceCalendarEvent);
      setOfflineCache('documents', docs);
      setOfflineCache('compliance_events', events);
      onDocs(docs);
      onEvents(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'documents');
    });
  },

  addDoc: async (item: Omit<EnvironmentalDocument, 'id'>): Promise<EnvironmentalDocument> => {
    const id = `DOC-${crypto.randomUUID()}`;
    const newItem: EnvironmentalDocument = {
      ...item,
      id
    };

    const parseResult = EnvironmentalDocumentSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'documents', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'documents',
      recordId: id,
      action: 'insert',
      details: `Menambahkan dokumen lingkungan baru: ${item.name}`
    });
    await batch.commit();

    return newItem;
  },

  deleteDoc: async (id: string): Promise<void> => {
    const docRef = doc(db, 'documents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as EnvironmentalDocument;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'documents',
      recordId: id,
      action: 'delete',
      details: `Menghapus dokumen lingkungan: ${oldData.name || '-'} (No: ${oldData.docNo || '-'}, Tipe: ${oldData.type || '-'})`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<EnvironmentalDocument[]>('documents', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('documents', updated);
  },

  updateDoc: async (id: string, item: Partial<EnvironmentalDocument>): Promise<void> => {
    const docRef = doc(db, 'documents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Dokumen tidak ditemukan");
    const oldData = snap.data() as EnvironmentalDocument;
    const updatedItem = { ...oldData, ...item, id };

    const parseResult = EnvironmentalDocumentSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'documents',
      recordId: id,
      action: 'update',
      details: `Mengubah dokumen lingkungan: ${updatedItem.name}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<EnvironmentalDocument[]>('documents', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('documents', updatedDocs);
  },

  addEvent: async (item: Omit<ComplianceCalendarEvent, 'id'>): Promise<ComplianceCalendarEvent> => {
    const id = `EV-${crypto.randomUUID()}`;
    const newItem: ComplianceCalendarEvent = {
      ...item,
      id
    };

    const parseResult = ComplianceCalendarEventSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'documents', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'documents',
      recordId: id,
      action: 'insert',
      details: `Menambahkan agenda kepatuhan baru: ${item.title}`
    });
    await batch.commit();

    return newItem;
  },

  updateEvent: async (id: string, updates: Partial<ComplianceCalendarEvent>): Promise<void> => {
    const docRef = doc(db, 'documents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Agenda kegiatan tidak ditemukan.");
    }
    const current = snap.data() as ComplianceCalendarEvent;
    const merged = { ...current, ...updates, id };

    const parseResult = ComplianceCalendarEventSchema.safeParse(merged);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...merged, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'documents',
      recordId: id,
      action: 'update',
      details: `Mengubah detail agenda "${current.title}"`
    });
    await batch.commit();
  },

  deleteEvent: async (id: string): Promise<void> => {
    const docRef = doc(db, 'documents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as ComplianceCalendarEvent;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'documents',
      recordId: id,
      action: 'delete',
      details: `Menghapus kegiatan agenda: ${oldData.title || '-'} (Tanggal: ${oldData.date || '-'}, Status: ${oldData.status || '-'})`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<ComplianceCalendarEvent[]>('compliance_events', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('compliance_events', updated);
  }
};

// 7. Cost (Biaya Lingkungan) Operations
export const environmentalCostService = {
  subscribe: (callback: (data: EnvironmentalCost[]) => void) => {
    const cached = getOfflineCache<EnvironmentalCost[]>('costs', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'costs'), orderBy('year', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as EnvironmentalCost);
      setOfflineCache('costs', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'costs');
    });
  },

  add: async (item: Omit<EnvironmentalCost, 'id'>): Promise<EnvironmentalCost> => {
    const id = `CT-${crypto.randomUUID()}`;
    const newItem: EnvironmentalCost = {
      ...item,
      id
    };

    const parseResult = EnvironmentalCostSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'costs', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'costs',
      recordId: id,
      action: 'insert',
      details: `Mencatat rancangan biaya program ${item.category} periode ${item.period} ${item.year}`
    });
    await batch.commit();

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'costs', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as EnvironmentalCost;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'costs',
      recordId: id,
      action: 'delete',
      details: `Menghapus alokasi biaya lingkungan ${id} (Kategori: ${oldData.category || '-'}, Periode: ${oldData.period || '-'} ${oldData.year ?? ''}, OPEX: Rp${(oldData.plannedOpex ?? 0).toLocaleString('id-ID')})`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<EnvironmentalCost[]>('costs', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('costs', updated);
  },

  update: async (id: string, item: Partial<EnvironmentalCost>): Promise<void> => {
    const docRef = doc(db, 'costs', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data biaya tidak ditemukan");
    const oldData = snap.data() as EnvironmentalCost;
    const updatedItem = { ...oldData, ...item, id };

    const parseResult = EnvironmentalCostSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'costs',
      recordId: id,
      action: 'update',
      details: `Mengubah alokasi biaya program ${updatedItem.category} periode ${updatedItem.period} ${updatedItem.year}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<EnvironmentalCost[]>('costs', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('costs', updatedDocs);
  }
};

// 8. Notifications / Alert Operations (Simple read & update logs only)
export const notificationService = {
  subscribe: (callback: (data: AlertNotification[]) => void) => {
    const userEmail = auth.currentUser?.email;

    // Guard: jika tidak ada email user yang valid, kembalikan unsubscribe kosong
    if (!userEmail) {
      callback([]);
      return () => {};
    }

    const cached = getOfflineCache<AlertNotification[]>('notifications', [])
      .filter(n => n.createdBy === userEmail || n.createdBy === 'system');
    if (cached.length > 0) {
      callback(cached);
    }

    // Tidak menggunakan orderBy di Firestore agar tidak membutuhkan composite index.
    // Sorting dilakukan di sisi klien setelah data diterima.
    const q = query(
      collection(db, 'notifications'),
      where('createdBy', 'in', [userEmail, 'system'])
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }) as AlertNotification)
        .sort((a, b) => getTimeMs(b.timestamp) - getTimeMs(a.timestamp));
      setOfflineCache('notifications', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });
  },

  add: async (alert: Omit<AlertNotification, 'id' | 'timestamp' | 'read' | 'createdBy'> & { createdBy?: string }): Promise<AlertNotification> => {
    const id = `AL-${crypto.randomUUID()}`;
    const newAlert: AlertNotification = {
      ...alert,
      id,
      timestamp: new Date().toISOString(),
      read: false,
      createdBy: alert.createdBy || 'system'
    };

    await setDoc(doc(db, 'notifications', id), newAlert);
    return newAlert;
  },

  markAsRead: async (id: string, userEmail?: string): Promise<void> => {
    if (!userEmail) return;
    const docRef = doc(db, 'notifications', id);
    // Kita harus fetch doc dulu untuk tahu apakah ini system atau bukan
    // Tapi karena kita panggil ini dari UI yang punya obyek AlertNotification, lebih efisien
    // kalo kita terima obyeknya. Untuk amannya, kita getDoc.
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const alert = snap.data() as AlertNotification;
      if (alert.createdBy === 'system') {
        const currentReadBy = alert.readBy || [];
        if (!currentReadBy.includes(userEmail) && currentReadBy.length < 100) {
          await updateDoc(docRef, { readBy: Array.from(new Set([...currentReadBy, userEmail])) });
        }
      } else {
        await updateDoc(docRef, { read: true });
      }
    }
  },

  markAllAsRead: async (alerts: AlertNotification[], userEmail?: string): Promise<void> => {
    if (!userEmail) return;
    const unread = alerts.filter(a => {
      if (a.createdBy === 'system') {
        const currentReadBy = a.readBy || [];
        return !currentReadBy.includes(userEmail) && currentReadBy.length < 100;
      }
      return !a.read;
    });

    await Promise.all(
      unread.map(alert => {
        const docRef = doc(db, 'notifications', alert.id);
        if (alert.createdBy === 'system') {
          const nextReadBy = Array.from(new Set([...(alert.readBy || []), userEmail]));
          return updateDoc(docRef, { readBy: nextReadBy });
        }
        return updateDoc(docRef, { read: true });
      })
    );
  },

  clearAll: async (alerts: AlertNotification[], userEmail?: string): Promise<void> => {
    if (!userEmail) return;
    await Promise.all(
      alerts.map(alert => {
        const docRef = doc(db, 'notifications', alert.id);
        if (alert.createdBy === 'system') {
          const currentCleared = alert.clearedBy || [];
          const currentRead = alert.readBy || [];
          const updates: Record<string, any> = {};
          if (!currentCleared.includes(userEmail) && currentCleared.length < 100) {
            updates.clearedBy = Array.from(new Set([...currentCleared, userEmail]));
          }
          if (!currentRead.includes(userEmail) && currentRead.length < 100) {
            updates.readBy = Array.from(new Set([...currentRead, userEmail]));
          }
          if (Object.keys(updates).length === 0) return Promise.resolve();
          return updateDoc(docRef, updates);
        }
        // Hanya hapus jika notifikasi spesifik milik user
        if (alert.createdBy === userEmail) {
          return deleteDoc(docRef);
        }
        return Promise.resolve();
      })
    );
  }
};

// 9. Solid Waste (Pengolahan Sampah Non-B3) Operations (UU No. 18/2008; PP 81/2012; Permen LHK 19/2021)
export const solidWasteService = {
  subscribe: (callback: (data: SolidWasteData[]) => void) => {
    const cached = getOfflineCache<SolidWasteData[]>('solid_waste', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'solid_waste'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as SolidWasteData);
      setOfflineCache('solid_waste', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'solid_waste');
    });
  },

  add: async (item: Omit<SolidWasteData, 'id'>): Promise<SolidWasteData> => {
    const id = `SLW-${crypto.randomUUID()}`;
    const newItem: SolidWasteData = {
      ...item,
      id
    };

    const parseResult = SolidWasteSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'solid_waste', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'solid_waste',
      recordId: id,
      action: 'insert',
      details: `Menambah data pengolahan sampah tanggal ${item.date} dari sumber ${item.source}`
    });
    await batch.commit();

    // Hitung persentase pemilahan/pengolahan terhadap target internal perusahaan (dapat dikonfigurasi di Pengaturan Ambang)
    const targetPct = _cachedThresholds?.solidWasteTargetPct ?? DEFAULT_INTERNAL_THRESHOLDS.solidWasteTargetPct;
    const totalGen = item.organicKg + item.inorganicKg + item.residueKg;
    const totalProcessed = item.compostedKg + item.recycledKg;
    const recoveryPct = totalGen > 0 ? (totalProcessed / totalGen) * 100 : 0;

    if (recoveryPct < targetPct && totalGen > 10) {
      try {
        await notificationService.add({
          type: 'Warning',
          category: 'Solid Waste',
          title: 'Rasio Pemrosesan Sampah Di Bawah Target Internal',
          message: `Rasio pemrosesan sampah untuk sumber ${item.source} sebesar ${recoveryPct.toFixed(1)}% di bawah target internal perusahaan (${targetPct}% — mengacu arah Jakstranas; perlu penetapan manajemen). Optimalkan komposter & pemilahan anorganik!`
        });
      } catch {
        // Non-fatal
      }
    }

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'solid_waste', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as SolidWasteData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'solid_waste',
      recordId: id,
      action: 'delete',
      details: `Menghapus data pengolahan sampah tanggal ${oldData.date || '-'} dari sumber ${oldData.source || '-'} (Total timbulan: ${(oldData.organicKg || 0) + (oldData.inorganicKg || 0) + (oldData.residueKg || 0)} kg)`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<SolidWasteData[]>('solid_waste', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('solid_waste', updated);
  },

  update: async (id: string, item: Partial<SolidWasteData>): Promise<void> => {
    const docRef = doc(db, 'solid_waste', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data sampah tidak ditemukan");
    const oldData = snap.data() as SolidWasteData;
    const updatedItem = { ...oldData, ...item, id };

    const parseResult = SolidWasteSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'solid_waste',
      recordId: id,
      action: 'update',
      details: `Mengubah data pengolahan sampah tanggal ${updatedItem.date} dari sumber ${updatedItem.source}`
    });
    await batch.commit();

    // Update offline cache
    const docs = getOfflineCache<SolidWasteData[]>('solid_waste', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('solid_waste', updatedDocs);
  }
};

// 10. CAPA (Temuan & Tindakan Perbaikan)
export const capaService = {
  subscribe: (callback: (data: CapaData[]) => void) => {
    try {
      const q = query(collection(db, 'capa'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as CapaData);
        setOfflineCache('capa', data);
        callback(data);
      }, (error) => {
        console.warn('CAPA subscription failed, using offline cache', error);
        callback(getOfflineCache<CapaData[]>('capa', []));
      });
    } catch (err) {
      callback(getOfflineCache<CapaData[]>('capa', []));
      return () => {};
    }
  },

  add: async (item: Omit<CapaData, 'id' | 'createdAt'>): Promise<string> => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newItem: CapaData = {
      ...item,
      id,
      createdAt: new Date().toISOString()
    };
    const batch = writeBatch(db);
    batch.set(doc(db, 'capa', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'capa',
      action: 'insert',
      recordId: id,
      details: `Created new CAPA record: ${newItem.title}`
    });
    await batch.commit();

    const docs = getOfflineCache<CapaData[]>('capa', []);
    setOfflineCache('capa', [newItem, ...docs]);
    return id;
  },

  update: async (id: string, item: Partial<CapaData>, historyEntry?: CapaHistory): Promise<void> => {
    const docRef = doc(db, 'capa', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data tidak ditemukan");
    
    const oldData = snap.data() as CapaData;
    let updatedHistory = oldData.history || [];
    
    if (historyEntry) {
      updatedHistory = [...updatedHistory, historyEntry];
    }

    const merged: CapaData = { 
      ...oldData, 
      ...item,
      id,
      history: updatedHistory
    };

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...merged, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'capa',
      action: 'update',
      recordId: id,
      details: `Updated CAPA record status/details.`
    });
    await batch.commit();

    const docs = getOfflineCache<CapaData[]>('capa', []);
    const updatedDocs = docs.map(x => x.id === id ? merged : x);
    setOfflineCache('capa', updatedDocs);
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'capa', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as CapaData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'capa',
      action: 'delete',
      recordId: id,
      details: `Menghapus temuan CAPA: ${oldData.title || '-'} (Severity: ${oldData.severity || '-'}, Status: ${oldData.status || '-'})`
    });
    await batch.commit();

    const docs = getOfflineCache<CapaData[]>('capa', []);
    setOfflineCache('capa', docs.filter(x => x.id !== id));
  }
};


export const complianceMatrixService = {
  subscribe: (callback: (data: ComplianceMatrixData[]) => void) => {
    const cached = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'compliance_matrix'), orderBy('period', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as ComplianceMatrixData);
      setOfflineCache('compliance_matrix', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'compliance_matrix');
    });
  },

  add: async (item: Omit<ComplianceMatrixData, 'id'>): Promise<ComplianceMatrixData> => {
    const id = `RKL-${crypto.randomUUID()}`;
    const newItem: ComplianceMatrixData = {
      ...item,
      id
    };

    const parseResult = ComplianceMatrixSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const docRef = doc(db, 'compliance_matrix', id);
    const batch = writeBatch(db);
    batch.set(docRef, stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'compliance_matrix',
      action: 'insert',
      recordId: id,
      details: `Created new Compliance Matrix record for ${newItem.period} (${newItem.aspect})`
    });
    await batch.commit();

    const docs = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    setOfflineCache('compliance_matrix', [newItem, ...docs]);

    return newItem;
  },

  update: async (id: string, item: Partial<ComplianceMatrixData>): Promise<void> => {
    const docRef = doc(db, 'compliance_matrix', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data matriks tidak ditemukan");

    const oldData = snap.data() as ComplianceMatrixData;
    const updatedItem = { ...oldData, ...item, id };
    
    const parseResult = ComplianceMatrixSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'compliance_matrix',
      action: 'update',
      recordId: id,
      details: `Updated Compliance Matrix record for ${updatedItem.period} (${updatedItem.aspect})`
    });
    await batch.commit();

    const docs = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('compliance_matrix', updatedDocs);
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'compliance_matrix', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as ComplianceMatrixData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'compliance_matrix',
      action: 'delete',
      recordId: id,
      details: `Menghapus matriks kepatuhan RKL/RPL: ${oldData.aspect || '-'} (Periode: ${oldData.period || '-'}, Target: ${oldData.target || '-'})`
    });
    await batch.commit();

    const docs = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    setOfflineCache('compliance_matrix', docs.filter(x => x.id !== id));
  }
};


export const incidentService = {
  subscribe: (callback: (data: IncidentData[]) => void) => {
    const cached = getOfflineCache<IncidentData[]>('incidents', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'incidents'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as IncidentData);
      setOfflineCache('incidents', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'incidents');
    });
  },

  add: async (item: Omit<IncidentData, 'id'>): Promise<IncidentData> => {
    const id = `INC-${crypto.randomUUID()}`;
    const newItem: IncidentData = {
      ...item,
      id
    };

    const parseResult = IncidentSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const docRef = doc(db, 'incidents', id);
    const batch = writeBatch(db);
    batch.set(docRef, stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'incidents',
      action: 'insert',
      recordId: id,
      details: `Created new Incident record (${newItem.category} at ${newItem.location})`
    });
    await batch.commit();

    const docs = getOfflineCache<IncidentData[]>('incidents', []);
    setOfflineCache('incidents', [newItem, ...docs]);

    return newItem;
  },

  update: async (id: string, item: Partial<IncidentData>): Promise<void> => {
    const docRef = doc(db, 'incidents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data insiden tidak ditemukan");

    const oldData = snap.data() as IncidentData;
    const updatedItem = { ...oldData, ...item, id };
    
    const parseResult = IncidentSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'incidents',
      action: 'update',
      recordId: id,
      details: `Updated Incident record status to ${updatedItem.status}`
    });
    await batch.commit();

    const docs = getOfflineCache<IncidentData[]>('incidents', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('incidents', updatedDocs);
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'incidents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as IncidentData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'incidents',
      action: 'delete',
      recordId: id,
      details: `Menghapus catatan insiden: ${oldData.category || '-'} di lokasi ${oldData.location || '-'} (Tgl: ${oldData.date || '-'})`
    });
    await batch.commit();

    const docs = getOfflineCache<IncidentData[]>('incidents', []);
    setOfflineCache('incidents', docs.filter(x => x.id !== id));
  }
};


export const regulatoryService = {
  subscribe: (callback: (data: RegulatoryWatchData[]) => void) => {
    const cached = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'regulatory'), orderBy('issueDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as RegulatoryWatchData);
      setOfflineCache('regulatory', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'regulatory');
    });
  },

  add: async (item: Omit<RegulatoryWatchData, 'id'>): Promise<RegulatoryWatchData> => {
    const id = `REG-${crypto.randomUUID()}`;
    const newItem: RegulatoryWatchData = {
      ...item,
      id
    };

    const parseResult = RegulatoryWatchSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const docRef = doc(db, 'regulatory', id);
    const batch = writeBatch(db);
    batch.set(docRef, stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'regulatory',
      module: 'regulatory_watch',
      action: 'insert',
      recordId: id,
      details: `Menambahkan Regulatory Watch (${newItem.regulationNo}, status: ${newItem.status})`,
      afterData: newItem as Record<string, any>,
    });
    await batch.commit();

    const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    setOfflineCache('regulatory', [newItem, ...docs]);

    return newItem;
  },

  update: async (id: string, item: Partial<RegulatoryWatchData>, reason?: string): Promise<void> => {
    const docRef = doc(db, 'regulatory', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data regulasi tidak ditemukan");

    const oldData = snap.data() as RegulatoryWatchData;
    const metadataHistory = [...(oldData.metadataHistory || [])];
    if (
      item.status !== undefined && item.status !== oldData.status ||
      item.verificationStatus !== undefined && item.verificationStatus !== oldData.verificationStatus ||
      item.effectiveDate !== undefined && item.effectiveDate !== oldData.effectiveDate ||
      item.revokedBy !== undefined && item.revokedBy !== oldData.revokedBy ||
      item.amendedBy !== undefined && item.amendedBy !== oldData.amendedBy
    ) {
      metadataHistory.push({
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'system',
        reason: reason || `Pembaruan status/metadata regulasi (${oldData.status} → ${item.status || oldData.status})`,
        previousStatus: oldData.status,
      });
    }

    const updatedItem: RegulatoryWatchData = {
      ...oldData,
      ...item,
      id,
      metadataHistory: metadataHistory.length > 0 ? metadataHistory : oldData.metadataHistory,
    };
    
    const parseResult = RegulatoryWatchSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'regulatory',
      module: 'regulatory_watch',
      action: 'update',
      recordId: id,
      details: `Memperbarui Regulatory Watch ${updatedItem.regulationNo} (${updatedItem.status})`,
      beforeData: oldData as Record<string, any>,
      afterData: updatedItem as Record<string, any>,
      correctionReason: reason || null,
    });
    await batch.commit();

    const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('regulatory', updatedDocs);
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'regulatory', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as RegulatoryWatchData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'regulatory',
      module: 'regulatory_watch',
      action: 'delete',
      recordId: id,
      details: `Menghapus regulasi: ${oldData.regulationNo || '-'} (${oldData.about || '-'})`,
      beforeData: oldData as Record<string, any>,
    });
    await batch.commit();

    const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    setOfflineCache('regulatory', docs.filter(x => x.id !== id));
  },

  seedLatestRegulations: async (): Promise<{ inserted: number; skipped: number }> => {
    const snap = await getDocs(collection(db, 'regulatory'));
    const existingNorms = new Set(
      snap.docs.map((d) =>
        String((d.data() as RegulatoryWatchData).regulationNo || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ')
      )
    );

    let inserted = 0;
    let skipped = 0;
    const newlyInserted: RegulatoryWatchData[] = [];
    const batch = writeBatch(db);

    for (const seed of REGULATORY_WATCH_SEED_15) {
      const normNo = seed.regulationNo.trim().toLowerCase().replace(/\s+/g, ' ');
      if (existingNorms.has(normNo)) {
        skipped += 1;
        continue;
      }
      const id = `REG-${crypto.randomUUID()}`;
      const newItem: RegulatoryWatchData = { ...seed, id };
      const parseResult = RegulatoryWatchSchema.safeParse(newItem);
      if (!parseResult.success) {
        handleValidationError(parseResult.error);
      }
      batch.set(doc(db, 'regulatory', id), stripUndefined({ ...newItem, ...trailCreate() }));
      existingNorms.add(normNo);
      newlyInserted.push(newItem);
      inserted += 1;
    }

    if (inserted > 0) {
      auditService.addToBatch(batch, {
        collection: 'regulatory',
        module: 'regulatory_watch',
        recordId: 'seed-2024-2026',
        action: 'insert',
        details: `Memuat ${inserted} regulasi referensi 2024-2026 (${skipped} dilewati karena sudah ada; item 2025-2026 bertanda MENUNGGU VERIFIKASI)`
      });
      await batch.commit();
      const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
      setOfflineCache('regulatory', [...newlyInserted, ...docs]);
    }

    return { inserted, skipped };
  }
};


export const nurseryStockOutService = {
  subscribe: (callback: (data: NurseryStockOut[]) => void) => {
    const cached = getOfflineCache<NurseryStockOut[]>('nursery_stock_out', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'nursery_stock_out'), orderBy('tanggal', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as NurseryStockOut);
      setOfflineCache('nursery_stock_out', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'nursery_stock_out');
    });
  },

  add: async (item: Omit<NurseryStockOut, 'id' | 'createdAt' | 'createdBy'>): Promise<NurseryStockOut> => {
    const id = `NSO-${crypto.randomUUID()}`;
    const user = auth.currentUser;
    const nowIso = new Date().toISOString();
    const newItem: NurseryStockOut = {
      ...item,
      id,
      createdBy: user?.email || 'system',
      createdAt: nowIso
    };

    const parseResult = NurseryStockOutSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    // Validasi ketersediaan stok bibit di koleksi nursery
    const nurserySnap = await getDoc(doc(db, 'nursery', item.jenisBibitId));
    if (!nurserySnap.exists()) {
      throw new Error('Data batch bibit di inventaris nursery tidak ditemukan.');
    }
    const totalSeedStock = Number(nurserySnap.data().quantity) || 0;
    const outSnap = await getDocs(query(collection(db, 'nursery_stock_out'), where('jenisBibitId', '==', item.jenisBibitId)));
    const usedStock = outSnap.docs.reduce((sum, d) => sum + (Number(d.data().jumlahKeluar) || 0), 0);
    const availableStock = Math.max(0, totalSeedStock - usedStock);
    if (item.jumlahKeluar > availableStock) {
      throw new Error(`Stok bibit tidak mencukupi. Tersedia: ${availableStock} bibit, diminta: ${item.jumlahKeluar} bibit.`);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'nursery_stock_out', id), stripUndefined({ ...newItem, ...trailCreate(), createdAt: nowIso }));
    auditService.addToBatch(batch, {
      collection: 'nursery_stock_out',
      recordId: id,
      action: 'insert',
      details: `Mengeluarkan stok nursery ${item.namaBibit} sebanyak ${item.jumlahKeluar} bibit`
    });
    await batch.commit();

    return newItem;
  },

  update: async (id: string, updates: Partial<Omit<NurseryStockOut, 'id' | 'createdBy' | 'createdAt'>>): Promise<void> => {
    const docRef = doc(db, 'nursery_stock_out', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data pengeluaran bibit tidak ditemukan.');
    }
    const current = snap.data() as NurseryStockOut;
    const user = auth.currentUser;
    const merged = {
      ...current,
      ...updates,
      id,
      updatedBy: user?.email || 'system',
      updatedAt: new Date().toISOString()
    };

    const parseResult = NurseryStockOutSchema.safeParse(merged);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    // Validasi ketersediaan stok bibit (kecualikan record yang sedang diedit)
    const nurserySnap = await getDoc(doc(db, 'nursery', merged.jenisBibitId));
    if (!nurserySnap.exists()) {
      throw new Error('Data batch bibit di inventaris nursery tidak ditemukan.');
    }
    const totalSeedStock = Number(nurserySnap.data().quantity) || 0;
    const outSnap = await getDocs(query(collection(db, 'nursery_stock_out'), where('jenisBibitId', '==', merged.jenisBibitId)));
    const usedByOthers = outSnap.docs
      .filter(d => d.id !== id)
      .reduce((sum, d) => sum + (Number(d.data().jumlahKeluar) || 0), 0);
    const availableStock = Math.max(0, totalSeedStock - usedByOthers);
    if (merged.jumlahKeluar > availableStock) {
      throw new Error(`Stok bibit tidak mencukupi. Tersedia: ${availableStock} bibit, diminta: ${merged.jumlahKeluar} bibit.`);
    }

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...merged, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'nursery_stock_out',
      recordId: id,
      action: 'update',
      details: `Mengubah data nursery stock out ${merged.namaBibit}`
    });
    await batch.commit();
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'nursery_stock_out', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    }
    const oldData = snap.data() as NurseryStockOut;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'nursery_stock_out',
      recordId: id,
      action: 'delete',
      details: `Menghapus penyaluran bibit: ${oldData.namaBibit || '-'} (Jumlah: ${oldData.jumlahKeluar ?? 0}, Lokasi: ${oldData.lokasiPenanaman || '-'}, Tgl: ${oldData.tanggal || '-'})`
    });
    await batch.commit();
  }
};

// ============================================================================
// 15. PENGELOLAAN AIR ASAM TAMBANG (AMD / AAT TREATMENT)
// ============================================================================
export const amdTreatmentService = {
  subscribe: (callback: (data: AmdTreatmentData[]) => void) => {
    const cached = getOfflineCache<AmdTreatmentData[]>('amd_treatment', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'amd_treatment'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as AmdTreatmentData);
      setOfflineCache('amd_treatment', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'amd_treatment');
    });
  },

  add: async (item: Omit<AmdTreatmentData, 'id'>): Promise<AmdTreatmentData> => {
    const id = `AMD-${crypto.randomUUID()}`;
    const newItem: AmdTreatmentData = { ...item, id };
    const parseResult = AmdTreatmentSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'amd_treatment', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'amd_treatment',
      recordId: id,
      action: 'insert',
      details: `Mencatat treatment AAT tanggal ${item.date} di ${item.location} (pH In: ${item.inflowPh}, pH Out: ${item.outflowPh}, Kapur: ${item.limeKg} kg)`
    });
    await batch.commit();

    const docs = getOfflineCache<AmdTreatmentData[]>('amd_treatment', []);
    setOfflineCache('amd_treatment', [newItem, ...docs]);

    if (item.complianceStatus === 'Tidak Memenuhi') {
      try {
        await notificationService.add({
          type: 'Warning',
          category: 'AMD Treatment',
          title: 'Outlet AAT Di Luar Baku Mutu',
          message: `pH outflow AAT di ${item.location} (${item.treatmentZone}) tercatat ${item.outflowPh} (di luar rentang 6.0-9.0). Segera evaluasi dosis pengapuran.`
        });
      } catch {
        // Non-fatal
      }
    }

    return newItem;
  },

  update: async (id: string, item: Partial<AmdTreatmentData>): Promise<void> => {
    const docRef = doc(db, 'amd_treatment', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data treatment AAT tidak ditemukan.');
    const updatedItem: AmdTreatmentData = { ...(snap.data() as AmdTreatmentData), ...item, id };
    const parseResult = AmdTreatmentSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'amd_treatment',
      recordId: id,
      action: 'update',
      details: `Memperbarui data treatment AAT tanggal ${updatedItem.date} di ${updatedItem.location}`
    });
    await batch.commit();

    const docs = getOfflineCache<AmdTreatmentData[]>('amd_treatment', []);
    setOfflineCache('amd_treatment', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'amd_treatment', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as AmdTreatmentData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'amd_treatment',
      recordId: id,
      action: 'delete',
      details: `Menghapus data treatment AAT tanggal ${oldData.date || '-'} di ${oldData.location || '-'}`
    });
    await batch.commit();

    const docs = getOfflineCache<AmdTreatmentData[]>('amd_treatment', []);
    setOfflineCache('amd_treatment', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 16. KUALITAS UDARA AMBIEN, EMISI & KEBISINGAN
// ============================================================================
export const airEmissionService = {
  subscribe: (callback: (data: AirEmissionData[]) => void) => {
    const cached = getOfflineCache<AirEmissionData[]>('air_emission', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'air_emission'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as AirEmissionData);
      setOfflineCache('air_emission', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'air_emission');
    });
  },

  add: async (item: Omit<AirEmissionData, 'id'>): Promise<AirEmissionData> => {
    const id = `AIR-${crypto.randomUUID()}`;
    const newItem: AirEmissionData = { ...item, id };
    const parseResult = AirEmissionSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'air_emission', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'air_emission',
      recordId: id,
      action: 'insert',
      details: `Mencatat pemantauan ${item.monitoringCategory} di ${item.location} tanggal ${item.date} (Status: ${item.status})`
    });
    await batch.commit();

    const docs = getOfflineCache<AirEmissionData[]>('air_emission', []);
    setOfflineCache('air_emission', [newItem, ...docs]);

    if (item.status === 'Exceeded') {
      try {
        await notificationService.add({
          type: 'Critical',
          category: 'Air & Emission',
          title: 'Pelampauan Baku Mutu Udara / Kebisingan',
          message: `Hasil pemantauan ${item.monitoringCategory} di ${item.location} pada ${item.date} melebihi baku mutu (PM10: ${item.pm10 ?? '-'}, Kebisingan: ${item.noiseDb ?? '-'} dBA).`
        });
      } catch {
        // Non-fatal
      }
    }

    return newItem;
  },

  update: async (id: string, item: Partial<AirEmissionData>): Promise<void> => {
    const docRef = doc(db, 'air_emission', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data udara & emisi tidak ditemukan.');
    const updatedItem: AirEmissionData = { ...(snap.data() as AirEmissionData), ...item, id };
    const parseResult = AirEmissionSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'air_emission',
      recordId: id,
      action: 'update',
      details: `Memperbarui data ${updatedItem.monitoringCategory} di ${updatedItem.location} (${updatedItem.date})`
    });
    await batch.commit();

    const docs = getOfflineCache<AirEmissionData[]>('air_emission', []);
    setOfflineCache('air_emission', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'air_emission', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as AirEmissionData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'air_emission',
      recordId: id,
      action: 'delete',
      details: `Menghapus data udara/emisi ${oldData.monitoringCategory || '-'} di ${oldData.location || '-'} (${oldData.date || '-'})`
    });
    await batch.commit();

    const docs = getOfflineCache<AirEmissionData[]>('air_emission', []);
    setOfflineCache('air_emission', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 17. MANAJEMEN TANAH PUCUK (TOPSOIL) & PENGENDALIAN EROSI
// ============================================================================
export const topsoilErosionService = {
  subscribe: (callback: (data: TopsoilErosionData[]) => void) => {
    const cached = getOfflineCache<TopsoilErosionData[]>('topsoil_erosion', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'topsoil_erosion'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as TopsoilErosionData);
      setOfflineCache('topsoil_erosion', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'topsoil_erosion');
    });
  },

  add: async (item: Omit<TopsoilErosionData, 'id'>): Promise<TopsoilErosionData> => {
    const id = `TOP-${crypto.randomUUID()}`;
    const newItem: TopsoilErosionData = { ...item, id };
    const parseResult = TopsoilErosionSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'topsoil_erosion', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'topsoil_erosion',
      recordId: id,
      action: 'insert',
      details: `Mencatat neraca topsoil & erosi blok ${item.blockLocation} tanggal ${item.date} (Saldo: ${item.cumulativeBalanceM3} m³, Erosi: ${item.erosionSeverity})`
    });
    await batch.commit();

    const docs = getOfflineCache<TopsoilErosionData[]>('topsoil_erosion', []);
    setOfflineCache('topsoil_erosion', [newItem, ...docs]);

    return newItem;
  },

  update: async (id: string, item: Partial<TopsoilErosionData>): Promise<void> => {
    const docRef = doc(db, 'topsoil_erosion', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data topsoil & erosi tidak ditemukan.');
    const updatedItem: TopsoilErosionData = { ...(snap.data() as TopsoilErosionData), ...item, id };
    const parseResult = TopsoilErosionSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'topsoil_erosion',
      recordId: id,
      action: 'update',
      details: `Memperbarui data topsoil & erosi blok ${updatedItem.blockLocation} (${updatedItem.date})`
    });
    await batch.commit();

    const docs = getOfflineCache<TopsoilErosionData[]>('topsoil_erosion', []);
    setOfflineCache('topsoil_erosion', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'topsoil_erosion', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as TopsoilErosionData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'topsoil_erosion',
      recordId: id,
      action: 'delete',
      details: `Menghapus catatan topsoil & erosi blok ${oldData.blockLocation || '-'} (${oldData.date || '-'})`
    });
    await batch.commit();

    const docs = getOfflineCache<TopsoilErosionData[]>('topsoil_erosion', []);
    setOfflineCache('topsoil_erosion', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 18. KEANEKARAGAMAN HAYATI (BIODIVERSITY / KEHATI)
// ============================================================================
export const biodiversityService = {
  subscribe: (callback: (data: BiodiversityData[]) => void) => {
    const cached = getOfflineCache<BiodiversityData[]>('biodiversity', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'biodiversity'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as BiodiversityData);
      setOfflineCache('biodiversity', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'biodiversity');
    });
  },

  add: async (item: Omit<BiodiversityData, 'id'>): Promise<BiodiversityData> => {
    const id = `BIO-${crypto.randomUUID()}`;
    const newItem: BiodiversityData = { ...item, id };
    const parseResult = BiodiversitySchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'biodiversity', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'biodiversity',
      recordId: id,
      action: 'insert',
      details: `Mencatat observasi ${item.category}: ${item.speciesName} (${item.count} individu) di ${item.zone}`
    });
    await batch.commit();

    const docs = getOfflineCache<BiodiversityData[]>('biodiversity', []);
    setOfflineCache('biodiversity', [newItem, ...docs]);

    if (item.condition === 'Terancam' || (isProtectedConservationStatus(item.conservationStatus) && item.condition !== 'Sehat')) {
      try {
        await notificationService.add({
          type: 'Warning',
          category: 'Biodiversity',
          title: 'Perhatian Satwa / Spesies Dilindungi',
          message: `Terdeteksi ${item.speciesName} (${item.conservationStatus}) dengan kondisi "${item.condition}" di ${item.zone}. Perlu perlindungan koridor/habitat.`
        });
      } catch {
        // Non-fatal
      }
    }

    return newItem;
  },

  update: async (id: string, item: Partial<BiodiversityData>): Promise<void> => {
    const docRef = doc(db, 'biodiversity', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data keanekaragaman hayati tidak ditemukan.');
    const updatedItem: BiodiversityData = { ...(snap.data() as BiodiversityData), ...item, id };
    const parseResult = BiodiversitySchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'biodiversity',
      recordId: id,
      action: 'update',
      details: `Memperbarui observasi kehati ${updatedItem.speciesName} di ${updatedItem.zone}`
    });
    await batch.commit();

    const docs = getOfflineCache<BiodiversityData[]>('biodiversity', []);
    setOfflineCache('biodiversity', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'biodiversity', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as BiodiversityData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'biodiversity',
      recordId: id,
      action: 'delete',
      details: `Menghapus catatan kehati ${oldData.speciesName || '-'} (${oldData.zone || '-'})`
    });
    await batch.commit();

    const docs = getOfflineCache<BiodiversityData[]>('biodiversity', []);
    setOfflineCache('biodiversity', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 19. REGISTER ASPEK & DAMPAK LINGKUNGAN (IADL ISO 14001)
// ============================================================================
export const iadlRiskService = {
  subscribe: (callback: (data: IadlRiskData[]) => void) => {
    const cached = getOfflineCache<IadlRiskData[]>('iadl_risk', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'iadl_risk'), orderBy('riskScore', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as IadlRiskData);
      setOfflineCache('iadl_risk', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'iadl_risk');
    });
  },

  add: async (item: Omit<IadlRiskData, 'id'>): Promise<IadlRiskData> => {
    const id = `IADL-${crypto.randomUUID()}`;
    const newItem: IadlRiskData = { ...item, id };
    const parseResult = IadlRiskSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'iadl_risk', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'iadl_risk',
      recordId: id,
      action: 'insert',
      details: `Menambah register IADL ${item.code}: ${item.activity} (Skor Risiko: ${item.riskScore} - ${item.riskLevel})`
    });
    await batch.commit();

    const docs = getOfflineCache<IadlRiskData[]>('iadl_risk', []);
    setOfflineCache('iadl_risk', [newItem, ...docs]);

    return newItem;
  },

  update: async (id: string, item: Partial<IadlRiskData>): Promise<void> => {
    const docRef = doc(db, 'iadl_risk', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data IADL tidak ditemukan.');
    const updatedItem: IadlRiskData = { ...(snap.data() as IadlRiskData), ...item, id };
    const parseResult = IadlRiskSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'iadl_risk',
      recordId: id,
      action: 'update',
      details: `Memperbarui register IADL ${updatedItem.code} (${updatedItem.riskLevel})`
    });
    await batch.commit();

    const docs = getOfflineCache<IadlRiskData[]>('iadl_risk', []);
    setOfflineCache('iadl_risk', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'iadl_risk', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as IadlRiskData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'iadl_risk',
      recordId: id,
      action: 'delete',
      details: `Menghapus register IADL ${oldData.code || '-'}: ${oldData.activity || '-'}`
    });
    await batch.commit();

    const docs = getOfflineCache<IadlRiskData[]>('iadl_risk', []);
    setOfflineCache('iadl_risk', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 20. EVALUASI KINERJA PROPER & PELAPORAN RKAB
// ============================================================================
export const properRkabService = {
  subscribe: (callback: (data: ProperRkabData[]) => void) => {
    const cached = getOfflineCache<ProperRkabData[]>('proper_rkab', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'proper_rkab'), orderBy('year', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as ProperRkabData);
      setOfflineCache('proper_rkab', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'proper_rkab');
    });
  },

  add: async (item: Omit<ProperRkabData, 'id'>): Promise<ProperRkabData> => {
    const id = `PRK-${crypto.randomUUID()}`;
    const newItem: ProperRkabData = { ...item, id };
    const parseResult = ProperRkabSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'proper_rkab', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'proper_rkab',
      recordId: id,
      action: 'insert',
      details: `Menambah indikator ${item.recordType} ${item.year} (${item.period}): ${item.indicatorName}`
    });
    await batch.commit();

    const docs = getOfflineCache<ProperRkabData[]>('proper_rkab', []);
    setOfflineCache('proper_rkab', [newItem, ...docs]);

    return newItem;
  },

  update: async (id: string, item: Partial<ProperRkabData>): Promise<void> => {
    const docRef = doc(db, 'proper_rkab', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data PROPER/RKAB tidak ditemukan.');
    const updatedItem: ProperRkabData = { ...(snap.data() as ProperRkabData), ...item, id };
    const parseResult = ProperRkabSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'proper_rkab',
      recordId: id,
      action: 'update',
      details: `Memperbarui indikator ${updatedItem.recordType}: ${updatedItem.indicatorName}`
    });
    await batch.commit();

    const docs = getOfflineCache<ProperRkabData[]>('proper_rkab', []);
    setOfflineCache('proper_rkab', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'proper_rkab', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as ProperRkabData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'proper_rkab',
      recordId: id,
      action: 'delete',
      details: `Menghapus indikator ${oldData.recordType || '-'}: ${oldData.indicatorName || '-'}`
    });
    await batch.commit();

    const docs = getOfflineCache<ProperRkabData[]>('proper_rkab', []);
    setOfflineCache('proper_rkab', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 21. MASTER DATA BAKU MUTU (standards/{id}) & AMBANG INTERNAL (app_meta)
// ============================================================================
export const standardsService = {
  subscribe: (callback: (data: EnvironmentalStandard[]) => void) => {
    const cached = getOfflineCache<EnvironmentalStandard[]>('standards', []);
    if (cached.length > 0) {
      _cachedStandards = cached;
      callback(cached);
    }
    const q = query(collection(db, 'standards'), orderBy('media', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as EnvironmentalStandard);
      _standardsLoadedFromServer = true;
      _cachedStandards = docs;
      setOfflineCache('standards', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'standards');
    });
  },

  seedDefaults: async (): Promise<{ inserted: number; skipped: number }> => {
    const snap = await getDocs(collection(db, 'standards'));
    const existingIds = new Set(snap.docs.map(d => d.id));
    let inserted = 0;
    let skipped = 0;
    const batch = writeBatch(db);

    for (const item of INITIAL_STANDARDS_SEED) {
      if (existingIds.has(item.id)) {
        skipped += 1;
        continue;
      }
      const parseResult = EnvironmentalStandardSchema.safeParse(item);
      if (!parseResult.success) {
        handleValidationError(parseResult.error);
      }
      batch.set(doc(db, 'standards', item.id), stripUndefined({ ...item, ...trailCreate() }));
      inserted += 1;
    }

    if (inserted > 0) {
      auditService.addToBatch(batch, {
        collection: 'standards',
        module: 'standards_master',
        recordId: 'seed-defaults',
        action: 'insert',
        details: `Inisialisasi ${inserted} baku mutu standar (${skipped} sudah ada)`
      });
      await batch.commit();
    }
    return { inserted, skipped };
  },

  add: async (item: Omit<EnvironmentalStandard, 'id'> & { id?: string }): Promise<EnvironmentalStandard> => {
    const id = item.id?.trim() || `STD-${item.media.toUpperCase().slice(0, 3)}-${crypto.randomUUID().slice(0, 8)}`;
    const newItem: EnvironmentalStandard = { ...item, id };
    const parseResult = EnvironmentalStandardSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'standards', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'standards',
      module: 'standards_master',
      recordId: id,
      action: 'insert',
      details: `Menambah baku mutu ${newItem.media} (${newItem.parameterLabel}) — ${newItem.basisRegulasi}`,
      afterData: newItem as Record<string, any>,
    });
    await batch.commit();
    return newItem;
  },

  update: async (id: string, item: Partial<EnvironmentalStandard>, revisionReason?: string): Promise<void> => {
    const docRef = doc(db, 'standards', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data baku mutu tidak ditemukan di server.');
    const oldData = snap.data() as EnvironmentalStandard;
    const prevHistory = Array.isArray(oldData.revisionHistory) ? oldData.revisionHistory : [];
    const nextRevisionEntry = {
      revision: prevHistory.length + 1,
      revisedAt: new Date().toISOString(),
      revisedBy: auth.currentUser?.email || 'system',
      reason: revisionReason?.trim() || item.notes?.trim() || 'Pembaruan master baku mutu',
      previousSnapshot: {
        minLimit: oldData.minLimit ?? null,
        maxLimit: oldData.maxLimit ?? null,
        unit: oldData.unit,
        basisRegulasi: oldData.basisRegulasi,
        effectiveFrom: oldData.effectiveFrom ?? null,
        effectiveTo: oldData.effectiveTo ?? null,
        verificationStatus: oldData.verificationStatus,
        effectiveStatus: oldData.effectiveStatus ?? null,
        isActive: oldData.isActive,
      },
    };
    const updatedItem: EnvironmentalStandard = {
      ...oldData,
      ...item,
      id,
      revisionHistory: [...prevHistory, nextRevisionEntry],
    };
    const parseResult = EnvironmentalStandardSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'standards',
      module: 'standards_master',
      recordId: id,
      action: 'update',
      details: `Memperbarui baku mutu ${updatedItem.parameterLabel} (${updatedItem.media}, status: ${updatedItem.verificationStatus})`,
      beforeData: oldData as Record<string, any>,
      afterData: updatedItem as Record<string, any>,
      correctionReason: revisionReason || null,
    });
    await batch.commit();
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'standards', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data baku mutu tidak ditemukan di server.');
    const oldData = snap.data() as EnvironmentalStandard;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'standards',
      module: 'standards_master',
      recordId: id,
      action: 'delete',
      details: `Menghapus baku mutu ${oldData.parameterLabel || id} (${oldData.media || '-'})`,
      beforeData: oldData as Record<string, any>,
    });
    await batch.commit();
  }
};

export const internalThresholdsService = {
  subscribe: (callback: (config: InternalThresholdsConfig) => void) => {
    const cached = getOfflineCache<InternalThresholdsConfig>('env_thresholds', { ...DEFAULT_INTERNAL_THRESHOLDS });
    _cachedThresholds = cached;
    callback(cached);

    return onSnapshot(doc(db, 'app_meta', 'env_thresholds'), (snap) => {
      const merged: InternalThresholdsConfig = snap.exists()
        ? { ...DEFAULT_INTERNAL_THRESHOLDS, ...(snap.data() as InternalThresholdsConfig), id: 'env_thresholds' }
        : { ...DEFAULT_INTERNAL_THRESHOLDS };
      _cachedThresholds = merged;
      setOfflineCache('env_thresholds', merged);
      callback(merged);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'app_meta');
    });
  },

  save: async (config: Omit<InternalThresholdsConfig, 'id'>): Promise<InternalThresholdsConfig> => {
    const payload: InternalThresholdsConfig = {
      ...DEFAULT_INTERNAL_THRESHOLDS,
      ...config,
      id: 'env_thresholds',
    };
    const parseResult = InternalThresholdsSchema.safeParse(payload);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'app_meta', 'env_thresholds'), stripUndefined({ ...payload, ...trailUpdate() }), { merge: true });
    auditService.addToBatch(batch, {
      collection: 'app_meta',
      recordId: 'env_thresholds',
      action: 'update',
      details: `Memperbarui ambang internal (warningRatio=${payload.warningRatio}, phMargin=${payload.phMargin}, targetSampah=${payload.solidWasteTargetPct}%)`
    });
    await batch.commit();

    _cachedThresholds = payload;
    setOfflineCache('env_thresholds', payload);
    return payload;
  }
};

export const properCriteriaService = {
  subscribe: (callback: (master: ProperCriteriaMaster) => void) => {
    const cached = getOfflineCache<ProperCriteriaMaster>('proper_criteria', { ...DEFAULT_PROPER_CRITERIA });
    callback(cached);

    return onSnapshot(doc(db, 'app_meta', 'proper_criteria'), (snap) => {
      const merged: ProperCriteriaMaster = snap.exists()
        ? { ...DEFAULT_PROPER_CRITERIA, ...(snap.data() as ProperCriteriaMaster), id: 'proper_criteria' }
        : { ...DEFAULT_PROPER_CRITERIA };
      setOfflineCache('proper_criteria', merged);
      callback(merged);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'app_meta');
    });
  },

  save: async (master: Omit<ProperCriteriaMaster, 'id'>): Promise<ProperCriteriaMaster> => {
    const payload: ProperCriteriaMaster = {
      ...DEFAULT_PROPER_CRITERIA,
      ...master,
      id: 'proper_criteria',
    };
    const parseResult = ProperCriteriaMasterSchema.safeParse(payload);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'app_meta', 'proper_criteria'), stripUndefined({ ...payload, ...trailUpdate() }), { merge: true });
    auditService.addToBatch(batch, {
      collection: 'app_meta',
      recordId: 'proper_criteria',
      action: 'update',
      details: `Memperbarui master kriteria PROPER (${payload.criteria.length} kriteria)`
    });
    await batch.commit();

    setOfflineCache('proper_criteria', payload);
    return payload;
  }
};

// ============================================================================
// 22. REGISTER PERTEK & SLO (Permen LHK No. 5 Tahun 2021)
// ============================================================================
export const pertekSloService = {
  subscribe: (callback: (data: PertekSloData[]) => void) => {
    const cached = getOfflineCache<PertekSloData[]>('pertek_slo', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'pertek_slo'), orderBy('issuedDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as PertekSloData);
      setOfflineCache('pertek_slo', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'pertek_slo');
    });
  },

  add: async (item: Omit<PertekSloData, 'id'>): Promise<PertekSloData> => {
    const id = `PTK-${crypto.randomUUID()}`;
    const newItem: PertekSloData = { ...item, id };
    const parseResult = PertekSloSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'pertek_slo', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'pertek_slo',
      recordId: id,
      action: 'insert',
      details: `Menambah register ${item.docKind} (${item.category}): ${item.permitNumber} — ${item.title}`
    });
    await batch.commit();

    const docs = getOfflineCache<PertekSloData[]>('pertek_slo', []);
    setOfflineCache('pertek_slo', [newItem, ...docs]);
    return newItem;
  },

  update: async (id: string, item: Partial<PertekSloData>): Promise<void> => {
    const docRef = doc(db, 'pertek_slo', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data register Pertek/SLO tidak ditemukan.');
    const updatedItem: PertekSloData = { ...(snap.data() as PertekSloData), ...item, id };
    const parseResult = PertekSloSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'pertek_slo',
      recordId: id,
      action: 'update',
      details: `Memperbarui ${updatedItem.docKind} ${updatedItem.permitNumber} (Status: ${updatedItem.status})`
    });
    await batch.commit();

    const docs = getOfflineCache<PertekSloData[]>('pertek_slo', []);
    setOfflineCache('pertek_slo', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'pertek_slo', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as PertekSloData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'pertek_slo',
      recordId: id,
      action: 'delete',
      details: `Menghapus register ${oldData.docKind || '-'} ${oldData.permitNumber || '-'} (${oldData.title || '-'})`
    });
    await batch.commit();

    const docs = getOfflineCache<PertekSloData[]>('pertek_slo', []);
    setOfflineCache('pertek_slo', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 23. KALENDER PELAPORAN WAJIB LINGKUNGAN
// ============================================================================
export const reportingCalendarService = {
  subscribe: (callback: (data: ReportingCalendarData[]) => void) => {
    const cached = getOfflineCache<ReportingCalendarData[]>('reporting_calendar', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'reporting_calendar'), orderBy('dueDate', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as ReportingCalendarData);
      setOfflineCache('reporting_calendar', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reporting_calendar');
    });
  },

  add: async (item: Omit<ReportingCalendarData, 'id'>): Promise<ReportingCalendarData> => {
    const id = `RPT-${crypto.randomUUID()}`;
    const newItem: ReportingCalendarData = { ...item, id };
    const parseResult = ReportingCalendarSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'reporting_calendar', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'reporting_calendar',
      recordId: id,
      action: 'insert',
      details: `Menambah jadwal pelaporan ${item.reportType} (${item.periodLabel}), tenggat ${item.dueDate}`
    });
    await batch.commit();

    const docs = getOfflineCache<ReportingCalendarData[]>('reporting_calendar', []);
    setOfflineCache('reporting_calendar', [newItem, ...docs]);
    return newItem;
  },

  update: async (id: string, item: Partial<ReportingCalendarData>): Promise<void> => {
    const docRef = doc(db, 'reporting_calendar', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data jadwal pelaporan tidak ditemukan.');
    const updatedItem: ReportingCalendarData = { ...(snap.data() as ReportingCalendarData), ...item, id };
    const parseResult = ReportingCalendarSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'reporting_calendar',
      recordId: id,
      action: 'update',
      details: `Memperbarui pelaporan ${updatedItem.reportType} (${updatedItem.periodLabel}, status: ${updatedItem.status})`
    });
    await batch.commit();

    const docs = getOfflineCache<ReportingCalendarData[]>('reporting_calendar', []);
    setOfflineCache('reporting_calendar', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'reporting_calendar', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as ReportingCalendarData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'reporting_calendar',
      recordId: id,
      action: 'delete',
      details: `Menghapus jadwal pelaporan ${oldData.reportType || '-'} (${oldData.periodLabel || '-'})`
    });
    await batch.commit();

    const docs = getOfflineCache<ReportingCalendarData[]>('reporting_calendar', []);
    setOfflineCache('reporting_calendar', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 24. PENGAWASAN EKSTERNAL & SANKSI ADMINISTRATIF (Permen LH/BPLH No. 6/2026)
// ============================================================================
export const externalSupervisionService = {
  subscribe: (callback: (data: ExternalSupervisionData[]) => void) => {
    const cached = getOfflineCache<ExternalSupervisionData[]>('external_supervisions', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'external_supervisions'), orderBy('inspectionDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as ExternalSupervisionData);
      setOfflineCache('external_supervisions', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'external_supervisions');
    });
  },

  add: async (item: Omit<ExternalSupervisionData, 'id'>): Promise<ExternalSupervisionData> => {
    const id = `SUP-${crypto.randomUUID()}`;
    const newItem: ExternalSupervisionData = { ...item, id };
    const parseResult = ExternalSupervisionSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'external_supervisions', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'external_supervisions',
      recordId: id,
      action: 'insert',
      details: `Mencatat pengawasan eksternal ${item.agency} (${item.officialDocNo}), sanksi: ${item.sanctionCategory}`
    });
    await batch.commit();

    const docs = getOfflineCache<ExternalSupervisionData[]>('external_supervisions', []);
    setOfflineCache('external_supervisions', [newItem, ...docs]);

    if (item.sanctionCategory !== 'Tidak Ada') {
      try {
        await notificationService.add({
          type: 'Critical',
          category: 'Permit',
          title: `Pengawasan Eksternal: ${item.sanctionCategory}`,
          message: `${item.agency} menerbitkan ${item.officialDocNo} dengan kategori sanksi "${item.sanctionCategory}". Tenggat tindak lanjut: ${item.followUpDeadline}.`
        });
      } catch {
        // Non-fatal
      }
    }

    return newItem;
  },

  update: async (id: string, item: Partial<ExternalSupervisionData>): Promise<void> => {
    const docRef = doc(db, 'external_supervisions', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data pengawasan eksternal tidak ditemukan.');
    const updatedItem: ExternalSupervisionData = { ...(snap.data() as ExternalSupervisionData), ...item, id };
    const parseResult = ExternalSupervisionSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'external_supervisions',
      recordId: id,
      action: 'update',
      details: `Memperbarui tindak lanjut pengawasan ${updatedItem.officialDocNo} (Status: ${updatedItem.resolutionStatus})`
    });
    await batch.commit();

    const docs = getOfflineCache<ExternalSupervisionData[]>('external_supervisions', []);
    setOfflineCache('external_supervisions', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'external_supervisions', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as ExternalSupervisionData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'external_supervisions',
      recordId: id,
      action: 'delete',
      details: `Menghapus catatan pengawasan ${oldData.agency || '-'} (${oldData.officialDocNo || '-'})`
    });
    await batch.commit();

    const docs = getOfflineCache<ExternalSupervisionData[]>('external_supervisions', []);
    setOfflineCache('external_supervisions', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 25. AIR LIMBAH DOMESTIK / IPAL CAMP & KANTOR (Permen LH/BPLH No. 11/2025)
// ============================================================================
export const domesticWastewaterService = {
  subscribe: (callback: (data: DomesticWastewaterData[]) => void) => {
    const cached = getOfflineCache<DomesticWastewaterData[]>('domestic_wastewater', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'domestic_wastewater'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as DomesticWastewaterData);
      setOfflineCache('domestic_wastewater', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'domestic_wastewater');
    });
  },

  add: async (item: Omit<DomesticWastewaterData, 'id'>): Promise<DomesticWastewaterData> => {
    const id = `DWW-${crypto.randomUUID()}`;
    const evalCtx = await getEvaluationContext('air_limbah_domestik', {
      locationCode: item.facilityName,
      sampleDate: item.date,
    });
    const evalRes = evaluateSampleCompliance('air_limbah_domestik', item as Record<string, unknown>, {
      standards: evalCtx.standards,
      thresholds: evalCtx.thresholds,
      locationCode: item.facilityName,
      sampleDate: item.date,
      unitMap: item.unitMap,
    });
    const serverEvalActive = getCachedFeatureFlags().serverEvaluation;
    const newItem: DomesticWastewaterData = serverEvalActive
      ? {
          ...stripServerEvalFields(item),
          id,
        } as DomesticWastewaterData
      : {
          ...item,
          id,
          complianceStatus: evalRes.domesticStatus,
          evaluationStatus: evalRes.overall,
          evaluationReason: evalRes.evaluationReason,
          standardBasis: evalRes.standardsBasis,
          standardId: evalCtx.standardId,
          standardSnapshot: evalCtx.standardSnapshot,
        };
    const parseResult = DomesticWastewaterSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const writePayload = serverEvalActive
      ? stripUndefined(stripServerEvalFields({ ...newItem, ...trailCreate() }))
      : stripUndefined({ ...newItem, ...trailCreate() });

    const batch = writeBatch(db);
    batch.set(doc(db, 'domestic_wastewater', id), writePayload);
    auditService.addToBatch(batch, {
      collection: 'domestic_wastewater',
      module: 'domestic_wastewater',
      recordId: id,
      action: 'insert',
      details: serverEvalActive
        ? `Mencatat air limbah domestik ${item.facilityName} tgl ${item.date} — Menunggu evaluasi server`
        : `Mencatat air limbah domestik ${item.facilityName} tgl ${item.date} (Kesimpulan: ${evalRes.overall})`,
      afterData: newItem as Record<string, any>,
    });
    await batch.commit();

    const docs = getOfflineCache<DomesticWastewaterData[]>('domestic_wastewater', []);
    setOfflineCache('domestic_wastewater', [newItem, ...docs]);

    if (evalRes.domesticStatus === 'Tidak Memenuhi') {
      try {
        await notificationService.add({
          type: 'Critical',
          category: 'Wastewater',
          title: 'Pelampauan Baku Mutu IPAL Domestik',
          message: `Hasil IPAL Domestik ${item.facilityName} tanggal ${item.date} tidak memenuhi baku mutu master (${evalRes.failedParams.join(', ')}).`
        });
      } catch {
        // Non-fatal
      }
    }

    return newItem;
  },

  update: async (id: string, item: Partial<DomesticWastewaterData>): Promise<void> => {
    const docRef = doc(db, 'domestic_wastewater', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data air limbah domestik tidak ditemukan.');
    const oldData = snap.data() as DomesticWastewaterData;
    const merged = { ...oldData, ...item, id };
    const evalCtx = await getEvaluationContext('air_limbah_domestik', {
      locationCode: merged.facilityName,
      sampleDate: merged.date,
    });
    const evalRes = evaluateSampleCompliance('air_limbah_domestik', merged as Record<string, unknown>, {
      standards: evalCtx.standards,
      thresholds: evalCtx.thresholds,
      locationCode: merged.facilityName,
      sampleDate: merged.date,
      unitMap: merged.unitMap,
    });
    const serverEvalActive = getCachedFeatureFlags().serverEvaluation;
    const updatedItem: DomesticWastewaterData = serverEvalActive
      ? ({ ...stripServerEvalFields(merged), id } as DomesticWastewaterData)
      : {
          ...merged,
          complianceStatus: evalRes.domesticStatus,
          evaluationStatus: evalRes.overall,
          evaluationReason: evalRes.evaluationReason,
          standardBasis: evalRes.standardsBasis,
          standardId: evalCtx.standardId,
          standardSnapshot: evalCtx.standardSnapshot,
        };
    const parseResult = DomesticWastewaterSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const updatePayload = serverEvalActive
      ? stripUndefined(stripServerEvalFields({ ...updatedItem, ...trailUpdate() }))
      : stripUndefined({ ...updatedItem, ...trailUpdate() });

    const batch = writeBatch(db);
    batch.update(docRef, updatePayload as any);
    auditService.addToBatch(batch, {
      collection: 'domestic_wastewater',
      module: 'domestic_wastewater',
      recordId: id,
      action: 'update',
      details: serverEvalActive
        ? `Memperbarui data IPAL domestik ${updatedItem.facilityName} (${updatedItem.date}) — Evaluasi ulang server`
        : `Memperbarui data IPAL domestik ${updatedItem.facilityName} (${updatedItem.date}) — ${evalRes.overall}`,
      beforeData: oldData as Record<string, any>,
      afterData: updatedItem as Record<string, any>,
      correctionReason: item.correctionReason || null,
    });
    await batch.commit();

    const docs = getOfflineCache<DomesticWastewaterData[]>('domestic_wastewater', []);
    setOfflineCache('domestic_wastewater', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'domestic_wastewater', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as DomesticWastewaterData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'domestic_wastewater',
      module: 'domestic_wastewater',
      recordId: id,
      action: 'delete',
      details: `Menghapus catatan IPAL domestik ${oldData.facilityName || '-'} (${oldData.date || '-'})`,
      beforeData: oldData as Record<string, any>,
    });
    await batch.commit();

    const docs = getOfflineCache<DomesticWastewaterData[]>('domestic_wastewater', []);
    setOfflineCache('domestic_wastewater', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 26. INVENTARISASI EMISI GRK (Perpres 110/2025 · Permen LH/BPLH 7/2026)
// ============================================================================
export const ghgFactorService = {
  subscribe: (callback: (data: GhgEmissionFactorData[]) => void) => {
    const cached = getOfflineCache<GhgEmissionFactorData[]>('ghg_factors', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'ghg_factors'), orderBy('effectiveYear', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as GhgEmissionFactorData);
      setOfflineCache('ghg_factors', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'ghg_factors');
    });
  },

  add: async (item: Omit<GhgEmissionFactorData, 'id'>): Promise<GhgEmissionFactorData> => {
    const id = `GHGF-${crypto.randomUUID()}`;
    const newItem: GhgEmissionFactorData = { ...item, id };
    const parseResult = GhgEmissionFactorSchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.set(doc(db, 'ghg_factors', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'ghg_factors',
      module: 'ghg_inventory',
      recordId: id,
      action: 'insert',
      details: `Menambah faktor emisi GRK ${item.factorName} (${item.factorKgCo2ePerUnit} kgCO2e/${item.unit}, Ref: ${item.referenceSource})`,
      afterData: newItem as Record<string, any>,
    });
    await batch.commit();

    const docs = getOfflineCache<GhgEmissionFactorData[]>('ghg_factors', []);
    setOfflineCache('ghg_factors', [newItem, ...docs]);
    return newItem;
  },

  update: async (id: string, item: Partial<GhgEmissionFactorData>): Promise<void> => {
    const docRef = doc(db, 'ghg_factors', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data faktor emisi GRK tidak ditemukan.');
    const oldData = snap.data() as GhgEmissionFactorData;
    const updatedItem: GhgEmissionFactorData = { ...oldData, ...item, id };
    const parseResult = GhgEmissionFactorSchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'ghg_factors',
      module: 'ghg_inventory',
      recordId: id,
      action: 'update',
      details: `Memperbarui faktor emisi GRK ${updatedItem.factorName}`,
      beforeData: oldData as Record<string, any>,
      afterData: updatedItem as Record<string, any>,
    });
    await batch.commit();

    const docs = getOfflineCache<GhgEmissionFactorData[]>('ghg_factors', []);
    setOfflineCache('ghg_factors', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'ghg_factors', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as GhgEmissionFactorData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'ghg_factors',
      module: 'ghg_inventory',
      recordId: id,
      action: 'delete',
      details: `Menghapus faktor emisi GRK ${oldData.factorName || '-'}`,
      beforeData: oldData as Record<string, any>,
    });
    await batch.commit();

    const docs = getOfflineCache<GhgEmissionFactorData[]>('ghg_factors', []);
    setOfflineCache('ghg_factors', docs.filter(x => x.id !== id));
  }
};

export const ghgActivityService = {
  subscribe: (callback: (data: GhgActivityData[]) => void) => {
    const cached = getOfflineCache<GhgActivityData[]>('ghg_activities', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, 'ghg_activities'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }) as GhgActivityData);
      setOfflineCache('ghg_activities', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'ghg_activities');
    });
  },

  add: async (item: Omit<GhgActivityData, 'id'>): Promise<GhgActivityData> => {
    const id = `GHGA-${crypto.randomUUID()}`;
    const newItem: GhgActivityData = { ...item, id };
    const parseResult = GhgActivitySchema.safeParse(newItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const emissionTxt = item.emissionsTco2e !== null && item.emissionsTco2e !== undefined
      ? `${item.emissionsTco2e} tCO2e`
      : 'BELUM TERHITUNG';
    const batch = writeBatch(db);
    batch.set(doc(db, 'ghg_activities', id), stripUndefined({ ...newItem, ...trailCreate() }));
    auditService.addToBatch(batch, {
      collection: 'ghg_activities',
      module: 'ghg_inventory',
      recordId: id,
      action: 'insert',
      details: `Mencatat aktivitas GRK ${item.activityCategory} (${item.quantity} ${item.unit}, ${emissionTxt})`,
      afterData: newItem as Record<string, any>,
    });
    await batch.commit();

    const docs = getOfflineCache<GhgActivityData[]>('ghg_activities', []);
    setOfflineCache('ghg_activities', [newItem, ...docs]);
    return newItem;
  },

  update: async (id: string, item: Partial<GhgActivityData>): Promise<void> => {
    const docRef = doc(db, 'ghg_activities', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data aktivitas GRK tidak ditemukan.');
    const oldData = snap.data() as GhgActivityData;
    const updatedItem: GhgActivityData = { ...oldData, ...item, id };
    const parseResult = GhgActivitySchema.safeParse(updatedItem);
    if (!parseResult.success) handleValidationError(parseResult.error);

    const batch = writeBatch(db);
    batch.update(docRef, stripUndefined({ ...updatedItem, ...trailUpdate() }) as any);
    auditService.addToBatch(batch, {
      collection: 'ghg_activities',
      module: 'ghg_inventory',
      recordId: id,
      action: 'update',
      details: `Memperbarui aktivitas GRK ${updatedItem.activityCategory} (${updatedItem.monthPeriod})`,
      beforeData: oldData as Record<string, any>,
      afterData: updatedItem as Record<string, any>,
      correctionReason: item.correctionReason || null,
    });
    await batch.commit();

    const docs = getOfflineCache<GhgActivityData[]>('ghg_activities', []);
    setOfflineCache('ghg_activities', docs.map(x => x.id === id ? updatedItem : x));
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'ghg_activities', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Data tidak ditemukan di server. Muat ulang halaman lalu coba lagi.');
    const oldData = snap.data() as GhgActivityData;

    const batch = writeBatch(db);
    batch.delete(docRef);
    auditService.addToBatch(batch, {
      collection: 'ghg_activities',
      module: 'ghg_inventory',
      recordId: id,
      action: 'delete',
      details: `Menghapus aktivitas GRK ${oldData.activityCategory || '-'} (${oldData.date || '-'})`,
      beforeData: oldData as Record<string, any>,
    });
    await batch.commit();

    const docs = getOfflineCache<GhgActivityData[]>('ghg_activities', []);
    setOfflineCache('ghg_activities', docs.filter(x => x.id !== id));
  }
};

// ============================================================================
// 27. EVALUASI ULANG BATCH KUALITAS AIR TERKONTROL (D-01, khusus Superintendent+)
// ============================================================================
const WATER_MEDIA_COLLECTION_MAP: Record<'air_limbah' | 'air_permukaan' | 'air_limbah_domestik', string> = {
  air_limbah: 'wastewater',
  air_permukaan: 'surfacewater',
  air_limbah_domestik: 'domestic_wastewater',
};

export const waterReEvaluationService = {
  applyBatch: async (params: {
    media: 'air_limbah' | 'air_permukaan' | 'air_limbah_domestik';
    items: ReEvaluationPreviewItem[];
    reason: string;
    fromDate?: string;
    toDate?: string;
    locationFilter?: string;
    onlyChanged?: boolean;
  }): Promise<{ updatedCount: number; batchCount: number }> => {
    const trimmedReason = params.reason.trim().slice(0, 500);
    if (trimmedReason.length < 20) {
      throw new Error('Alasan evaluasi ulang wajib minimal 20 karakter untuk audit trail.');
    }

    const colName = WATER_MEDIA_COLLECTION_MAP[params.media];

    if (getCachedFeatureFlags().serverEvaluation) {
      const callable = httpsCallable<
        {
          collectionName: string;
          fromDate?: string;
          toDate?: string;
          locationFilter?: string;
          correctionReason: string;
          onlyChanged?: boolean;
        },
        { collectionName: string; totalScanned: number; updatedCount: number }
      >(functions, 'reevaluateRange');

      const res = await callable({
        collectionName: colName,
        fromDate: params.fromDate || undefined,
        toDate: params.toDate || undefined,
        locationFilter: params.locationFilter || undefined,
        correctionReason: trimmedReason.slice(0, 400),
        onlyChanged: params.onlyChanged ?? true,
      });
      return {
        updatedCount: res.data?.updatedCount ?? 0,
        batchCount: 1,
      };
    }

    const targetItems = params.items;
    if (targetItems.length === 0) {
      return { updatedCount: 0, batchCount: 0 };
    }

    const actorEmail = auth.currentUser?.email || 'system';
    const nowIso = new Date().toISOString();
    const CHUNK_SIZE = 350;
    let updatedCount = 0;
    let batchCount = 0;
    const updatedMap = new Map<string, Record<string, any>>();

    for (let i = 0; i < targetItems.length; i += CHUNK_SIZE) {
      const chunk = targetItems.slice(i, i + CHUNK_SIZE);
      const snaps = await Promise.all(chunk.map(item => getDoc(doc(db, colName, item.id))));
      const batch = writeBatch(db);
      let opsInChunk = 0;

      for (let idx = 0; idx < chunk.length; idx += 1) {
        const item = chunk[idx];
        const snap = snaps[idx];
        if (!snap.exists()) continue;

        const oldData = snap.data() as Record<string, any>;
        const prevHistory: EvaluationHistoryEntry[] = Array.isArray(oldData.evaluationHistory)
          ? oldData.evaluationHistory
          : [];
        const historyEntry: EvaluationHistoryEntry = {
          evaluatedAt: nowIso,
          evaluatedBy: actorEmail,
          previousStatus: item.oldStatus,
          newStatus: item.newStatus,
          reason: trimmedReason,
          standardBasis: item.standardsBasis.slice(0, 350),
        };
        const nextHistory = [...prevHistory, historyEntry];

        const updatePayload = stripUndefined({
          ...(params.media === 'air_limbah_domestik'
            ? { complianceStatus: item.newDomesticStatus }
            : { status: item.newLegacyStatus }),
          evaluationStatus: item.newStatus,
          evaluationReason: item.evaluationReason.slice(0, 1000),
          standardId: item.standardId ? item.standardId.slice(0, 128) : undefined,
          standardBasis: item.standardsBasis.slice(0, 350),
          standardSnapshot: item.standardSnapshot,
          correctionReason: trimmedReason,
          evaluationHistory: nextHistory,
          ...trailUpdate(),
        });

        batch.update(doc(db, colName, item.id), updatePayload as any);
        updatedMap.set(item.id, { ...oldData, ...updatePayload });
        opsInChunk += 1;
      }

      if (opsInChunk > 0) {
        auditService.addToBatch(batch, {
          collection: colName,
          module: 'water_re_evaluation',
          recordId: `reeval-${params.media}-${nowIso.slice(0, 10)}-b${batchCount + 1}`,
          action: 'update',
          details: `Evaluasi ulang batch ${opsInChunk} sampel ${colName} (Batch ${batchCount + 1})`,
          correctionReason: trimmedReason,
        });
        await batch.commit();
        updatedCount += opsInChunk;
        batchCount += 1;
      }
    }

    if (updatedCount > 0) {
      const cached = getOfflineCache<Record<string, any>[]>(colName, []);
      if (cached.length > 0) {
        setOfflineCache(
          colName,
          cached.map(rec => (updatedMap.has(rec.id) ? { ...rec, ...updatedMap.get(rec.id) } : rec))
        );
      }
    }

    return { updatedCount, batchCount };
  }
};
