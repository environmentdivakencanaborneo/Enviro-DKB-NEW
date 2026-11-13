/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../utils/firebaseAuth';
import { WqLocation } from '../types';
import { WqLocationSchema } from '../utils/validation';
import { auditService } from './auditService';
import { triggerToast } from '../utils/errorHandler';
import { getOfflineCache, setOfflineCache } from '../utils/googleSync';
import { logger } from '../utils/logger';

const DEFAULT_WQ_LOCATION: Omit<WqLocation, 'id'> = {
  code: 'KPL-01',
  name: 'KPL Tambang Blok Utara',
  defaultSource: 'Settling Pond Outlet',
  docSuffix: '',
  kelasAir: 'II',
  isActive: true,
};

export const formatWqLocationLabel = (loc: { name: string; code: string }): string => {
  return `${loc.name} (${loc.code})`;
};

let hasAttemptedSeed = false;

export const wqLocationService = {
  subscribe: (callback: (data: WqLocation[]) => void) => {
    const cached = getOfflineCache<WqLocation[]>('wq_locations', []);
    if (cached.length > 0) {
      callback(cached);
    }

    const q = query(collection(db, 'wq_locations'), orderBy('code', 'asc'));
    return onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty && !hasAttemptedSeed) {
          hasAttemptedSeed = true;
          try {
            const seedId = 'WQL-KPL-01';
            const seedData: WqLocation = {
              id: seedId,
              ...DEFAULT_WQ_LOCATION,
              createdAt: serverTimestamp(),
              createdBy: auth.currentUser?.email || 'system',
              updatedAt: serverTimestamp(),
              updatedBy: auth.currentUser?.email || 'system',
            };
            await setDoc(doc(db, 'wq_locations', seedId), seedData);
            logger.info('Auto-seeded default WQ Location: KPL-01');
          } catch (err) {
            // Seeding might fail if user does not have Superintendent role yet (e.g. read-only viewer)
            logger.warn('Auto-seed WQ location skipped or failed:', err);
            // Deliver fallback default to UI in case collection is empty
            const fallback: WqLocation = {
              id: 'WQL-KPL-01',
              ...DEFAULT_WQ_LOCATION,
            };
            callback([fallback]);
            return;
          }
        }

        const docs = snapshot.docs.map((docSnap) => docSnap.data() as WqLocation);
        setOfflineCache('wq_locations', docs);
        callback(docs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'wq_locations');
      }
    );
  },

  add: async (item: Omit<WqLocation, 'id'>): Promise<WqLocation> => {
    const id = `WQL-${item.code.trim().toUpperCase()}`;
    const userEmail = auth.currentUser?.email || 'unknown';

    const newLocation: WqLocation = {
      ...item,
      id,
      code: item.code.trim().toUpperCase(),
      name: item.name.trim(),
      defaultSource: item.defaultSource.trim(),
      docSuffix: item.docSuffix?.trim() || '',
      kelasAir: item.kelasAir ?? 'II',
      isActive: item.isActive ?? true,
      createdAt: serverTimestamp(),
      createdBy: userEmail,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail,
    };

    const parseResult = WqLocationSchema.safeParse(newLocation);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
        .join('; ');
      throw new Error(`Validasi Master Lokasi gagal - ${errorMsg}`);
    }

    try {
      await setDoc(doc(db, 'wq_locations', id), newLocation);

      await auditService.createLog({
        collection: 'wq_locations',
        recordId: id,
        action: 'insert',
        details: `Menambah master titik sampling kualitas air ${newLocation.name} (${newLocation.code})`,
      });

      triggerToast(`Titik sampling ${newLocation.code} berhasil ditambahkan`, 'success');
      return newLocation;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'wq_locations');
      throw err;
    }
  },

  update: async (id: string, updates: Partial<WqLocation>): Promise<void> => {
    const userEmail = auth.currentUser?.email || 'unknown';
    const docRef = doc(db, 'wq_locations', id);

    const updatePayload = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail,
    };

    try {
      await updateDoc(docRef, updatePayload);

      await auditService.createLog({
        collection: 'wq_locations',
        recordId: id,
        action: 'update',
        details: `Memperbarui master titik sampling ${id}: ${JSON.stringify(updates)}`,
      });

      triggerToast(`Titik sampling ${id} berhasil diperbarui`, 'success');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'wq_locations');
      throw err;
    }
  },
};
