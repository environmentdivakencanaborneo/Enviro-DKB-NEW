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
  where
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../utils/firebaseAuth';
import { 
  WastewaterData, 
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
  RegulatoryWatchData
} from '../types';
import { 
  WastewaterSchema, 
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
  RegulatoryWatchSchema
} from '../utils/validation';
import { auditService } from './auditService';
import { evaluateWastewaterStatus, evaluateSurfaceWaterStatus } from '../data/regulations';
import { getOfflineCache, setOfflineCache } from '../utils/googleSync';

// Helper to sanitize error messaging
function handleValidationError(error: any): never {
  const fieldErrors = error.flatten().fieldErrors;
  const errorMsg = Object.entries(fieldErrors)
    .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
    .join('; ');
  throw new Error(`Validasi gagal - ${errorMsg}`);
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
      const docs = snapshot.docs.map(doc => doc.data() as WastewaterData);
      setOfflineCache('wastewater', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'wastewater');
    });
  },



  add: async (item: Omit<WastewaterData, 'id' | 'status'>): Promise<WastewaterData> => {
    const status = evaluateWastewaterStatus(item.ph, item.tss, item.debit, item.fe, item.mn);
    const id = `WW-${crypto.randomUUID()}`;
    
    const newItem: WastewaterData = {
      ...item,
      id,
      status
    };

    const parseResult = WastewaterSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await setDoc(doc(db, 'wastewater', id), newItem);

    // Audit Log
    await auditService.createLog({
      collection: 'wastewater',
      recordId: id,
      action: 'insert',
      details: `Menambah data kualitas air limbah di lokasi ${item.location} dengan status ${status}`
    });

    // Check if limits exceeded to trigger a system-wide alert
    if (status === 'Exceeded') {
      await notificationService.add({
        type: 'Critical',
        category: 'Wastewater',
        title: 'Baku Mutu Terlampaui!',
        message: `Pengujian di ${item.location} melampaui batas regulasi: pH: ${item.ph}, TSS: ${item.tss} mg/L. Segera lakukan penambahan kapur hidrat.`
      });
    } else if (status === 'Warning') {
      await notificationService.add({
        type: 'Warning',
        category: 'Wastewater',
        title: 'Mendekati Baku Mutu',
        message: `Pengujian di ${item.location} mendekati parameter kritis: pH: ${item.ph}, TSS: ${item.tss} mg/L.`
      });
    }

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'wastewater', id);
    const snap = await getDoc(docRef);
    const oldData = snap.exists() ? snap.data() : null;

    await deleteDoc(docRef);

    // Update offline cache
    const docs = getOfflineCache<WastewaterData[]>('wastewater', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('wastewater', updated);

    // Audit Log
    await auditService.createLog({
      collection: 'wastewater',
      recordId: id,
      action: 'delete',
      details: oldData ? `Menghapus kualitas air limbah di lokasi ${oldData.location}` : `Menghapus air limbah ID ${id}`
    });
  },

  update: async (id: string, item: Partial<WastewaterData>): Promise<void> => {
    const docRef = doc(db, 'wastewater', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data tidak ditemukan");
    const oldData = snap.data() as WastewaterData;
    const merged = { ...oldData, ...item };
    const status = evaluateWastewaterStatus(merged.ph, merged.tss, merged.debit, merged.fe, merged.mn);
    const updatedItem = { ...merged, status };

    const parseResult = WastewaterSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<WastewaterData[]>('wastewater', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('wastewater', updatedDocs);

    await auditService.createLog({
      collection: 'wastewater',
      recordId: id,
      action: 'update',
      details: `Mengubah data kualitas air limbah di lokasi ${updatedItem.location}`
    });
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
      const docs = snapshot.docs.map(doc => doc.data() as SurfaceWaterData);
      setOfflineCache('surfacewater', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'surfacewater');
    });
  },

  add: async (item: Omit<SurfaceWaterData, 'id' | 'status'>): Promise<SurfaceWaterData> => {
    const status = evaluateSurfaceWaterStatus(item.ph, item.tss, item.doVal, item.bod, item.cod, item.fe, item.mn);
    const id = `SW-${crypto.randomUUID()}`;
    
    const newItem: SurfaceWaterData = {
      ...item,
      id,
      status
    };

    const parseResult = SurfaceWaterSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await setDoc(doc(db, 'surfacewater', id), newItem);

    // Audit Log
    await auditService.createLog({
      collection: 'surfacewater',
      recordId: id,
      action: 'insert',
      details: `Menambah data kualitas air permukaan di lokasi ${item.location} dengan status ${status}`
    });

    // Check if limits exceeded to trigger a system-wide alert
    if (status === 'Exceeded') {
      await notificationService.add({
        type: 'Critical',
        category: 'SurfaceWater',
        title: 'Baku Mutu Air Permukaan Terlampaui!',
        message: `Pengujian di ${item.location} melampaui batas regulasi PP No. 22 Tahun 2021 Lampiran VI Kelas II.`
      });
    } else if (status === 'Warning') {
      await notificationService.add({
        type: 'Warning',
        category: 'SurfaceWater',
        title: 'Air Permukaan Mendekati Baku Mutu',
        message: `Pengujian di ${item.location} mendekati parameter kritis kelas II.`
      });
    }

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'surfacewater', id);
    const snap = await getDoc(docRef);
    const oldData = snap.exists() ? snap.data() : null;

    await deleteDoc(docRef);

    // Update offline cache
    const docs = getOfflineCache<SurfaceWaterData[]>('surfacewater', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('surfacewater', updated);

    // Audit Log
    await auditService.createLog({
      collection: 'surfacewater',
      recordId: id,
      action: 'delete',
      details: oldData ? `Menghapus kualitas air permukaan di lokasi ${oldData.location}` : `Menghapus air permukaan ID ${id}`
    });
  },

  update: async (id: string, item: Partial<SurfaceWaterData>): Promise<void> => {
    const docRef = doc(db, 'surfacewater', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data tidak ditemukan");
    const oldData = snap.data() as SurfaceWaterData;
    const merged = { ...oldData, ...item };
    const status = evaluateSurfaceWaterStatus(merged.ph, merged.tss, merged.doVal, merged.bod, merged.cod, merged.fe, merged.mn);
    const updatedItem = { ...merged, status };

    const parseResult = SurfaceWaterSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<SurfaceWaterData[]>('surfacewater', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('surfacewater', updatedDocs);

    await auditService.createLog({
      collection: 'surfacewater',
      recordId: id,
      action: 'update',
      details: `Mengubah data kualitas air permukaan di lokasi ${updatedItem.location}`
    });
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
      const docs = snapshot.docs.map(doc => doc.data() as RainfallData);
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

    await setDoc(doc(db, 'rainfall', id), newItem);

    // Audit Log
    await auditService.createLog({
      collection: 'rainfall',
      recordId: id,
      action: 'insert',
      details: `Menambah catatan curah hujan di stasiun ${item.station} sebesar ${item.rainfall} mm`
    });

    // Handle high intensity rain triggers
    if (item.rainfall >= 50) {
      await notificationService.add({
        type: 'Warning',
        category: 'Wastewater',
        title: 'Curah Hujan Tinggi!',
        message: `Curah hujan tinggi terdeteksi di stasiun ${item.station} sebesar ${item.rainfall} mm. Naikkan pengawasan tanggul & pompa sump.`
      });
    }

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'rainfall', id));

    // Update offline cache
    const docs = getOfflineCache<RainfallData[]>('rainfall', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('rainfall', updated);

    await auditService.createLog({
      collection: 'rainfall',
      recordId: id,
      action: 'delete',
      details: `Menghapus curah hujan ID ${id}`
    });
  },

  update: async (id: string, item: Partial<RainfallData>): Promise<void> => {
    const docRef = doc(db, 'rainfall', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data tidak ditemukan");
    const oldData = snap.data() as RainfallData;
    const updatedItem = { ...oldData, ...item };

    const parseResult = RainfallSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<RainfallData[]>('rainfall', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('rainfall', updatedDocs);

    await auditService.createLog({
      collection: 'rainfall',
      recordId: id,
      action: 'update',
      details: `Mengubah data curah hujan di stasiun ${updatedItem.station}`
    });
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
      const docs = snapshot.docs.map(doc => doc.data() as NurseryData);
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

    await setDoc(doc(db, 'nursery', id), newItem);

    // Audit Log
    await auditService.createLog({
      collection: 'nursery',
      recordId: id,
      action: 'insert',
      details: `Menambah stok nursery ${item.plantType} sebanyak ${item.quantity} bibit`
    });

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'nursery', id));

    // Update offline cache
    const docs = getOfflineCache<NurseryData[]>('nursery', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('nursery', updated);

    await auditService.createLog({
      collection: 'nursery',
      recordId: id,
      action: 'delete',
      details: `Menghapus nursery ID ${id}`
    });
  },

  update: async (id: string, item: Partial<NurseryData>): Promise<void> => {
    const docRef = doc(db, 'nursery', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data tidak ditemukan");
    const oldData = snap.data() as NurseryData;
    const updatedItem = { ...oldData, ...item };

    const parseResult = NurserySchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<NurseryData[]>('nursery', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('nursery', updatedDocs);

    await auditService.createLog({
      collection: 'nursery',
      recordId: id,
      action: 'update',
      details: `Mengubah data nursery ${updatedItem.plantType}`
    });
  }
};

// 4. Reclamation Plans & Guarantees Operations
export const reclamationService = {
  subscribeAll: (
    onPlans: (data: ReclamationPlan[]) => void,
    onGuarantees: (data: ReclamationGuarantee[]) => void
  ) => {
    // Seed cache untuk masing-masing
    const cachedPlans = getOfflineCache<ReclamationPlan[]>('reclamation_plans', []);
    const cachedGuarantees = getOfflineCache<ReclamationGuarantee[]>('reclamation_guarantees', []);
    if (cachedPlans.length > 0) onPlans(cachedPlans);
    if (cachedGuarantees.length > 0) onGuarantees(cachedGuarantees);

    const q = collection(db, 'reclamation');
    return onSnapshot(q, (snapshot) => {
      const plans = snapshot.docs
        .filter(doc => doc.id.startsWith('RP-'))
        .map(doc => doc.data() as ReclamationPlan);
      const guarantees = snapshot.docs
        .filter(doc => doc.id.startsWith('RG-'))
        .map(doc => doc.data() as ReclamationGuarantee);
      setOfflineCache('reclamation_plans', plans);
      setOfflineCache('reclamation_guarantees', guarantees);
      onPlans(plans);
      onGuarantees(guarantees);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reclamation');
    });
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

    await setDoc(doc(db, 'reclamation', id), newItem);

    await auditService.createLog({
      collection: 'reclamation',
      recordId: id,
      action: 'insert',
      details: `Membuat rencana reklamasi baru di area ${item.areaName} tahun target ${item.targetYear}`
    });

    return newItem;
  },

  updatePlan: async (id: string, item: Partial<ReclamationPlan>): Promise<void> => {
    const docRef = doc(db, 'reclamation', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Rencana reklamasi tidak ditemukan.");
    }
    const current = snap.data() as ReclamationPlan;
    const merged = { ...current, ...item };

    const parseResult = ReclamationPlanSchema.safeParse(merged);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, merged as any);

    await auditService.createLog({
      collection: 'reclamation',
      recordId: id,
      action: 'update',
      details: `Memperbarui rencana reklamasi area ${current.areaName} (Status: ${merged.status})`
    });

    // Notify upon completion of block targets
    if (merged.status === 'Completed' && current.status !== 'Completed') {
      await notificationService.add({
        type: 'Info',
        category: 'Guarantee',
        title: 'Blok Reklamasi Selesai',
        message: `Program revegetasi di blok ${merged.areaName} seluas ${merged.realizedSizeHa || merged.sizeHa} Ha telah dipastikan selesai.`
      });
    }
  },

  deletePlan: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'reclamation', id));

    // Update offline cache
    const docs = getOfflineCache<ReclamationPlan[]>('reclamation_plans', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('reclamation_plans', updated);

    await auditService.createLog({
      collection: 'reclamation',
      recordId: id,
      action: 'delete',
      details: `Menghapus rencana reklamasi ${id}`
    });
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

    await setDoc(doc(db, 'reclamation', id), newItem);

    await auditService.createLog({
      collection: 'reclamation',
      recordId: id,
      action: 'insert',
      details: `Mendaftarkan jaminan rekening reklamasi baru No: ${item.guaranteeNo}`
    });

    return newItem;
  },

  deleteGuarantee: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'reclamation', id));

    // Update offline cache
    const docs = getOfflineCache<ReclamationGuarantee[]>('reclamation_guarantees', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('reclamation_guarantees', updated);

    await auditService.createLog({
      collection: 'reclamation',
      recordId: id,
      action: 'delete',
      details: `Menghapus jaminan reklamasi ${id}`
    });
  },

  updateGuarantee: async (id: string, item: Partial<ReclamationGuarantee>): Promise<void> => {
    const docRef = doc(db, 'reclamation', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Jaminan tidak ditemukan");
    const oldData = snap.data() as ReclamationGuarantee;
    const updatedItem = { ...oldData, ...item };

    const parseResult = ReclamationGuaranteeSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<ReclamationGuarantee[]>('reclamation_guarantees', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('reclamation_guarantees', updatedDocs);

    await auditService.createLog({
      collection: 'reclamation',
      recordId: id,
      action: 'update',
      details: `Mengubah jaminan reklamasi No: ${updatedItem.guaranteeNo}`
    });
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
    if (cachedIn.length > 0) onWasteIn(cachedIn);
    if (cachedOut.length > 0) onWasteOut(cachedOut);

    const q = collection(db, 'waste_b3');
    return onSnapshot(q, (snapshot) => {
      const listIn = snapshot.docs
        .filter(doc => doc.id.startsWith('WI-'))
        .map(doc => doc.data() as WasteIn);
      const listOut = snapshot.docs
        .filter(doc => doc.id.startsWith('WO-'))
        .map(doc => doc.data() as WasteOut);
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

    await setDoc(doc(db, 'waste_b3', id), newItem);

    await auditService.createLog({
      collection: 'waste_b3',
      recordId: id,
      action: 'insert',
      details: `Mencatat masuk limbah B3 ${item.wasteType} sebesar ${item.weightKg} kg`
    });

    return newItem;
  },

  deleteIn: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'waste_b3', id));

    // Update offline cache
    const docs = getOfflineCache<WasteIn[]>('waste_in', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('waste_in', updated);

    await auditService.createLog({
      collection: 'waste_b3',
      recordId: id,
      action: 'delete',
      details: `Menghapus manifest masuk limbah B3 ${id}`
    });
  },

  updateIn: async (id: string, item: Partial<WasteIn>): Promise<void> => {
    const docRef = doc(db, 'waste_b3', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Manifest masuk tidak ditemukan");
    const oldData = snap.data() as WasteIn;
    const updatedItem = { ...oldData, ...item };

    const parseResult = WasteInSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<WasteIn[]>('waste_in', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('waste_in', updatedDocs);

    await auditService.createLog({
      collection: 'waste_b3',
      recordId: id,
      action: 'update',
      details: `Mengubah manifest masuk limbah B3 ${updatedItem.wasteType}`
    });
  },

  addOut: async (item: Omit<WasteOut, 'id'>): Promise<WasteOut> => {
    const id = `WO-${crypto.randomUUID()}`;
    const newItem: WasteOut = {
      ...item,
      id
    };

    const parseResult = WasteOutSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await setDoc(doc(db, 'waste_b3', id), newItem);

    await auditService.createLog({
      collection: 'waste_b3',
      recordId: id,
      action: 'insert',
      details: `Mencatat keluar transpor limbah B3 No Manifest: ${item.manifestNo}`
    });

    return newItem;
  },

  deleteOut: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'waste_b3', id));

    // Update offline cache
    const docs = getOfflineCache<WasteOut[]>('waste_out', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('waste_out', updated);

    await auditService.createLog({
      collection: 'waste_b3',
      recordId: id,
      action: 'delete',
      details: `Menghapus manifest keluar limbah B3 ${id}`
    });
  },

  updateOut: async (id: string, item: Partial<WasteOut>): Promise<void> => {
    const docRef = doc(db, 'waste_b3', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Manifest keluar tidak ditemukan");
    const oldData = snap.data() as WasteOut;
    const updatedItem = { ...oldData, ...item };

    const parseResult = WasteOutSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<WasteOut[]>('waste_out', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('waste_out', updatedDocs);

    await auditService.createLog({
      collection: 'waste_b3',
      recordId: id,
      action: 'update',
      details: `Mengubah manifest keluar limbah B3 No Manifest: ${updatedItem.manifestNo}`
    });
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
        .map(doc => doc.data() as EnvironmentalDocument);
      const events = snapshot.docs
        .filter(doc => doc.id.startsWith('EV-'))
        .map(doc => doc.data() as ComplianceCalendarEvent);
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

    await setDoc(doc(db, 'documents', id), newItem);

    await auditService.createLog({
      collection: 'documents',
      recordId: id,
      action: 'insert',
      details: `Menambahkan dokumen lingkungan baru: ${item.name}`
    });

    return newItem;
  },

  deleteDoc: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'documents', id));

    // Update offline cache
    const docs = getOfflineCache<EnvironmentalDocument[]>('documents', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('documents', updated);

    await auditService.createLog({
      collection: 'documents',
      recordId: id,
      action: 'delete',
      details: `Menghapus dokumen lingkungan ID ${id}`
    });
  },

  updateDoc: async (id: string, item: Partial<EnvironmentalDocument>): Promise<void> => {
    const docRef = doc(db, 'documents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Dokumen tidak ditemukan");
    const oldData = snap.data() as EnvironmentalDocument;
    const updatedItem = { ...oldData, ...item };

    const parseResult = EnvironmentalDocumentSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<EnvironmentalDocument[]>('documents', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('documents', updatedDocs);

    await auditService.createLog({
      collection: 'documents',
      recordId: id,
      action: 'update',
      details: `Mengubah dokumen lingkungan: ${updatedItem.name}`
    });
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

    await setDoc(doc(db, 'documents', id), newItem);

    await auditService.createLog({
      collection: 'documents',
      recordId: id,
      action: 'insert',
      details: `Menambahkan agenda kepatuhan baru: ${item.title}`
    });

    return newItem;
  },

  updateEvent: async (id: string, updates: Partial<ComplianceCalendarEvent>): Promise<void> => {
    const docRef = doc(db, 'documents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Agenda kegiatan tidak ditemukan.");
    }
    const current = snap.data() as ComplianceCalendarEvent;
    const merged = { ...current, ...updates };

    const parseResult = ComplianceCalendarEventSchema.safeParse(merged);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, merged as any);

    await auditService.createLog({
      collection: 'documents',
      recordId: id,
      action: 'update',
      details: `Mengubah detail agenda "${current.title}"`
    });
  },

  deleteEvent: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'documents', id));

    // Update offline cache
    const docs = getOfflineCache<ComplianceCalendarEvent[]>('compliance_events', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('compliance_events', updated);

    await auditService.createLog({
      collection: 'documents',
      recordId: id,
      action: 'delete',
      details: `Menghapus kegiatan agenda ${id}`
    });
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
      const docs = snapshot.docs.map(doc => doc.data() as EnvironmentalCost);
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

    await setDoc(doc(db, 'costs', id), newItem);

    await auditService.createLog({
      collection: 'costs',
      recordId: id,
      action: 'insert',
      details: `Mencatat rancangan biaya program ${item.category} periode ${item.period} ${item.year}`
    });

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'costs', id));

    // Update offline cache
    const docs = getOfflineCache<EnvironmentalCost[]>('costs', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('costs', updated);

    await auditService.createLog({
      collection: 'costs',
      recordId: id,
      action: 'delete',
      details: `Menghapus alokasi biaya lingkungan ${id}`
    });
  },

  update: async (id: string, item: Partial<EnvironmentalCost>): Promise<void> => {
    const docRef = doc(db, 'costs', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data biaya tidak ditemukan");
    const oldData = snap.data() as EnvironmentalCost;
    const updatedItem = { ...oldData, ...item };

    const parseResult = EnvironmentalCostSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<EnvironmentalCost[]>('costs', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('costs', updatedDocs);

    await auditService.createLog({
      collection: 'costs',
      recordId: id,
      action: 'update',
      details: `Mengubah alokasi biaya program ${updatedItem.category} periode ${updatedItem.period} ${updatedItem.year}`
    });
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
        .map(doc => doc.data() as AlertNotification)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
        const readBy = alert.readBy || [];
        if (!readBy.includes(userEmail)) {
          await updateDoc(docRef, { readBy: [...readBy, userEmail] });
        }
      } else {
        await updateDoc(docRef, { read: true });
      }
    }
  },

  markAllAsRead: async (alerts: AlertNotification[], userEmail?: string): Promise<void> => {
    if (!userEmail) return;
    const unread = alerts.filter(a => {
      if (a.createdBy === 'system') return !(a.readBy || []).includes(userEmail);
      return !a.read;
    });
    
    await Promise.all(
      unread.map(alert => {
        const docRef = doc(db, 'notifications', alert.id);
        if (alert.createdBy === 'system') {
          return updateDoc(docRef, { clearedBy: [...(alert.clearedBy || []), userEmail], readBy: [...(alert.readBy || []), userEmail] });
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
          return updateDoc(docRef, { clearedBy: [...(alert.clearedBy || []), userEmail], readBy: [...(alert.readBy || []), userEmail] });
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

// 9. Solid Waste (Pengolahan Sampah) Operations (Permen LH No 7 Tahun 2025)
export const solidWasteService = {
  subscribe: (callback: (data: SolidWasteData[]) => void) => {
    const cached = getOfflineCache<SolidWasteData[]>('solid_waste', []);
    if (cached.length > 0) {
      callback(cached);
    }
    const q = query(collection(db, 'solid_waste'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as SolidWasteData);
      setOfflineCache('solid_waste', docs);
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'solid_waste');
    });
  },

  add: async (item: Omit<SolidWasteData, 'id'>): Promise<SolidWasteData> => {
    const id = `SW-${crypto.randomUUID()}`;
    const newItem: SolidWasteData = {
      ...item,
      id
    };

    const parseResult = SolidWasteSchema.safeParse(newItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await setDoc(doc(db, 'solid_waste', id), newItem);

    // Audit Log
    await auditService.createLog({
      collection: 'solid_waste',
      recordId: id,
      action: 'insert',
      details: `Menambah data pengolahan sampah tanggal ${item.date} dari sumber ${item.source}`
    });

    // Hitung persentase pengurangan/terolah sampah (Target Permen LH No 7 Tahun 2025 biasanya minimal 30% pemilahan dan pengolahan)
    const totalGen = item.organicKg + item.inorganicKg + item.residueKg;
    const totalProcessed = item.compostedKg + item.recycledKg;
    const recoveryPct = totalGen > 0 ? (totalProcessed / totalGen) * 100 : 0;

    if (recoveryPct < 30 && totalGen > 10) {
      await notificationService.add({
        type: 'Warning',
        category: 'B3 Waste',
        title: 'Sinergi Pengurangan Sampah Rendah',
        message: `Rasio pemrosesan sampah untuk sumber ${item.source} sebesar ${recoveryPct.toFixed(1)}% di bawah target Permen LH No 7/2025 (min 30%). Optimalkan komposter & pemilahan anorganik!`
      });
    }

    return newItem;
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'solid_waste', id);
    const snap = await getDoc(docRef);
    const oldData = snap.exists() ? snap.data() as SolidWasteData : null;

    await deleteDoc(docRef);

    // Update offline cache
    const docs = getOfflineCache<SolidWasteData[]>('solid_waste', []);
    const updated = docs.filter(x => x.id !== id);
    setOfflineCache('solid_waste', updated);

    await auditService.createLog({
      collection: 'solid_waste',
      recordId: id,
      action: 'delete',
      details: oldData ? `Menghapus data pengolahan sampah tanggal ${oldData.date} dari sumber ${oldData.source}` : `Menghapus data sampah ID ${id}`
    });
  },

  update: async (id: string, item: Partial<SolidWasteData>): Promise<void> => {
    const docRef = doc(db, 'solid_waste', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data sampah tidak ditemukan");
    const oldData = snap.data() as SolidWasteData;
    const updatedItem = { ...oldData, ...item };

    const parseResult = SolidWasteSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem);

    // Update offline cache
    const docs = getOfflineCache<SolidWasteData[]>('solid_waste', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('solid_waste', updatedDocs);

    await auditService.createLog({
      collection: 'solid_waste',
      recordId: id,
      action: 'update',
      details: `Mengubah data pengolahan sampah tanggal ${updatedItem.date} dari sumber ${updatedItem.source}`
    });
  }
};

// 10. CAPA (Temuan & Tindakan Perbaikan)
export const capaService = {
  subscribe: (callback: (data: CapaData[]) => void) => {
    try {
      const q = query(collection(db, 'capa'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as CapaData);
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

  add: async (item: Omit<CapaData, 'id' | 'createdAt'>): Promise<void> => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newItem: CapaData = {
      ...item,
      id,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'capa', id), newItem);
    
    const docs = getOfflineCache<CapaData[]>('capa', []);
    setOfflineCache('capa', [newItem, ...docs]);
    await auditService.createLog({
      collection: 'capa',
      action: 'insert',
      recordId: id,
      details: `Created new CAPA record: ${newItem.title}`
    });
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
      history: updatedHistory
    };

    await updateDoc(docRef, merged as any);

    const docs = getOfflineCache<CapaData[]>('capa', []);
    const updatedDocs = docs.map(x => x.id === id ? merged : x);
    setOfflineCache('capa', updatedDocs);
    await auditService.createLog({
      collection: 'capa',
      action: 'update',
      recordId: id,
      details: `Updated CAPA record status/details.`
    });
  },

  delete: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'capa', id));
    const docs = getOfflineCache<CapaData[]>('capa', []);
    setOfflineCache('capa', docs.filter(x => x.id !== id));
    await auditService.createLog({
      collection: 'capa',
      action: 'delete',
      recordId: id,
      details: `Deleted CAPA record.`
    });
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
      const docs = snapshot.docs.map(doc => doc.data() as ComplianceMatrixData);
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
    await setDoc(docRef, newItem);

    const docs = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    setOfflineCache('compliance_matrix', [newItem, ...docs]);
    
    await auditService.createLog({
      collection: 'compliance_matrix',
      action: 'insert',
      recordId: id,
      details: `Created new Compliance Matrix record for ${newItem.period} (${newItem.aspect})`
    });

    return newItem;
  },

  update: async (id: string, item: Partial<ComplianceMatrixData>): Promise<void> => {
    const docRef = doc(db, 'compliance_matrix', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data matriks tidak ditemukan");

    const oldData = snap.data() as ComplianceMatrixData;
    const updatedItem = { ...oldData, ...item };
    
    const parseResult = ComplianceMatrixSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem as any);

    const docs = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('compliance_matrix', updatedDocs);
    
    await auditService.createLog({
      collection: 'compliance_matrix',
      action: 'update',
      recordId: id,
      details: `Updated Compliance Matrix record for ${updatedItem.period} (${updatedItem.aspect})`
    });
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'compliance_matrix', id);
    await deleteDoc(docRef);

    const docs = getOfflineCache<ComplianceMatrixData[]>('compliance_matrix', []);
    setOfflineCache('compliance_matrix', docs.filter(x => x.id !== id));
    
    await auditService.createLog({
      collection: 'compliance_matrix',
      action: 'delete',
      recordId: id,
      details: `Deleted Compliance Matrix record`
    });
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
      const docs = snapshot.docs.map(doc => doc.data() as IncidentData);
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
    await setDoc(docRef, newItem);

    const docs = getOfflineCache<IncidentData[]>('incidents', []);
    setOfflineCache('incidents', [newItem, ...docs]);
    
    await auditService.createLog({
      collection: 'incidents',
      action: 'insert',
      recordId: id,
      details: `Created new Incident record (${newItem.category} at ${newItem.location})`
    });

    return newItem;
  },

  update: async (id: string, item: Partial<IncidentData>): Promise<void> => {
    const docRef = doc(db, 'incidents', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data insiden tidak ditemukan");

    const oldData = snap.data() as IncidentData;
    const updatedItem = { ...oldData, ...item };
    
    const parseResult = IncidentSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem as any);

    const docs = getOfflineCache<IncidentData[]>('incidents', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('incidents', updatedDocs);
    
    await auditService.createLog({
      collection: 'incidents',
      action: 'update',
      recordId: id,
      details: `Updated Incident record status to ${updatedItem.status}`
    });
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'incidents', id);
    await deleteDoc(docRef);

    const docs = getOfflineCache<IncidentData[]>('incidents', []);
    setOfflineCache('incidents', docs.filter(x => x.id !== id));
    
    await auditService.createLog({
      collection: 'incidents',
      action: 'delete',
      recordId: id,
      details: `Deleted Incident record`
    });
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
      const docs = snapshot.docs.map(doc => doc.data() as RegulatoryWatchData);
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
    await setDoc(docRef, newItem);

    const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    setOfflineCache('regulatory', [newItem, ...docs]);
    
    await auditService.createLog({
      collection: 'regulatory',
      action: 'insert',
      recordId: id,
      details: `Created new Regulatory Watch (${newItem.regulationNo})`
    });

    return newItem;
  },

  update: async (id: string, item: Partial<RegulatoryWatchData>): Promise<void> => {
    const docRef = doc(db, 'regulatory', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Data regulasi tidak ditemukan");

    const oldData = snap.data() as RegulatoryWatchData;
    const updatedItem = { ...oldData, ...item };
    
    const parseResult = RegulatoryWatchSchema.safeParse(updatedItem);
    if (!parseResult.success) {
      handleValidationError(parseResult.error);
    }

    await updateDoc(docRef, updatedItem as any);

    const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    const updatedDocs = docs.map(x => x.id === id ? updatedItem : x);
    setOfflineCache('regulatory', updatedDocs);
    
    await auditService.createLog({
      collection: 'regulatory',
      action: 'update',
      recordId: id,
      details: `Updated Regulatory Watch status/details`
    });
  },

  delete: async (id: string): Promise<void> => {
    const docRef = doc(db, 'regulatory', id);
    await deleteDoc(docRef);

    const docs = getOfflineCache<RegulatoryWatchData[]>('regulatory', []);
    setOfflineCache('regulatory', docs.filter(x => x.id !== id));
    
    await auditService.createLog({
      collection: 'regulatory',
      action: 'delete',
      recordId: id,
      details: `Deleted Regulatory Watch`
    });
  }
};
