/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  doc, setDoc, writeBatch, runTransaction 
} from 'firebase/firestore';
import { db } from '../utils/firebaseAuth';
import { 
  INITIAL_WASTEWATER, 
  INITIAL_SURFACE_WATER,
  INITIAL_RAINFALL, 
  INITIAL_NURSERY, 
  INITIAL_RECLAMATION, 
  INITIAL_GUARANTEE, 
  INITIAL_WASTE_IN, 
  INITIAL_WASTE_OUT, 
  INITIAL_DOCUMENTS, 
  INITIAL_CALENDAR, 
  INITIAL_ENVIRONMENTAL_COSTS,
  INITIAL_ALERTS,
  INITIAL_SOLID_WASTE,
  INITIAL_COMPLIANCE_MATRIX,
  INITIAL_INCIDENTS,
  INITIAL_REGULATORY_WATCH
} from '../data/initialData';

export async function seedFirestoreDatabaseIfEmpty(): Promise<void> {
  try {
    const sentinelRef = doc(db, 'app_meta', 'seed_status');
    
    // Gunakan transaction untuk mencegah race condition
    const shouldSeed = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(sentinelRef);
      const data = snap.data();
      if (snap.exists() && (data?.seeded === true || data?.seeding === true)) {
        return false;
      }
      // Mark as seeding immediately dalam transaction
      transaction.set(sentinelRef, { seeded: false, seeding: true, startedAt: new Date().toISOString() });
      return true;
    });

    if (!shouldSeed) {
      console.log("Database already seeded. Skipping...");
      return;
    }

    console.log("Seeding database with batch writes...");
    
    // Gunakan multiple batches (Firestore limit: 500 ops per batch)
    const batch1 = writeBatch(db);
    const batch2 = writeBatch(db);
    
    INITIAL_WASTEWATER.forEach(item => batch1.set(doc(db, 'wastewater', item.id), item));
    INITIAL_SURFACE_WATER.forEach(item => batch1.set(doc(db, 'surfacewater', item.id), item));
    INITIAL_RAINFALL.forEach(item => batch1.set(doc(db, 'rainfall', item.id), item));
    INITIAL_NURSERY.forEach(item => batch1.set(doc(db, 'nursery', item.id), item));
    INITIAL_RECLAMATION.forEach(item => batch1.set(doc(db, 'reclamation', item.id), item));
    INITIAL_GUARANTEE.forEach(item => batch1.set(doc(db, 'reclamation', item.id), item));
    
    INITIAL_WASTE_IN.forEach(item => batch2.set(doc(db, 'waste_b3', item.id), item));
    INITIAL_WASTE_OUT.forEach(item => batch2.set(doc(db, 'waste_b3', item.id), item));
    INITIAL_DOCUMENTS.forEach(item => batch2.set(doc(db, 'documents', item.id), item));
    INITIAL_CALENDAR.forEach(item => batch2.set(doc(db, 'documents', item.id), item));
    INITIAL_ENVIRONMENTAL_COSTS.forEach(item => batch2.set(doc(db, 'costs', item.id), item));
    INITIAL_ALERTS.forEach(item => batch2.set(doc(db, 'notifications', item.id), item));
    INITIAL_SOLID_WASTE.forEach(item => batch2.set(doc(db, 'solid_waste', item.id), item));
    INITIAL_COMPLIANCE_MATRIX.forEach(item => batch2.set(doc(db, 'compliance_matrix', item.id), item));
    INITIAL_INCIDENTS.forEach(item => batch2.set(doc(db, 'incidents', item.id), item));
    INITIAL_REGULATORY_WATCH.forEach(item => batch2.set(doc(db, 'regulatory', item.id), item));

    await Promise.all([batch1.commit(), batch2.commit()]);
    
    // Update sentinel ke seeded = true
    await setDoc(sentinelRef, { seeded: true, seeding: false, seededAt: new Date().toISOString() });
    console.log("Database seeded successfully!");
    
  } catch (error) {
    console.warn("Seeding failed:", error);
    // Reset sentinel agar bisa di-retry
    try {
      await setDoc(doc(db, 'app_meta', 'seed_status'), { seeded: false, seeding: false });
    } catch {}
  }
}
