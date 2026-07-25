/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseAuth';
import { 
  WastewaterData, 
  RainfallData, 
  NurseryData, 
  ReclamationPlan, 
  ReclamationGuarantee, 
  WasteIn, 
  WasteOut, 
  EnvironmentalDocument, 
  ComplianceCalendarEvent, 
  EnvironmentalCost,
  SolidWasteData
} from '../types';
import { auditService } from './auditService';
import { notificationService } from './dbService';
import { getScopedKey } from '../utils/googleSync';

export interface BackupStatus {
  status: 'synced' | 'syncing' | 'error' | 'idle';
  lastSynced: string | null;
  message?: string;
}

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
}

export const backupService = {
  /**
   * Mengambil folder ID backup di Drive, jika belum ada akan dibuat.
   */
  getOrCreateBackupFolder: async (accessToken: string): Promise<string | null> => {
    const folderIdKey = getScopedKey('env_coal_pro_backup_folder_id');
    let folderId = localStorage.getItem(folderIdKey);

    if (folderId) return folderId;

    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='DEM system Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`, 
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          folderId = searchData.files[0].id;
        } else {
          const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: 'DEM system Backups',
              mimeType: 'application/vnd.google-apps.folder'
            })
          });
          if (createRes.ok) {
            const folder = await createRes.json();
            folderId = folder.id;
          }
        }
      }
      if (folderId) {
        localStorage.setItem(folderIdKey, folderId);
      }
      return folderId;
    } catch (e) {
      console.error("Gagal mendapatkan/membuat folder backup Google Drive:", e);
      return null;
    }
  },

  /**
   * Ekspor seluruh data dari Firestore ke Google Drive dalam bentuk file .json
   */
  exportToGoogleDrive: async (
    accessToken: string, 
    customFileName?: string,
    onStatusChange?: (status: BackupStatus) => void
  ): Promise<boolean> => {
    if (!accessToken) {
      if (onStatusChange) onStatusChange({ status: 'error', lastSynced: null, message: "Akses Token Google tidak tersedia." });
      return false;
    }

    if (onStatusChange) onStatusChange({ status: 'syncing', lastSynced: null, message: "Mengambil data terbaru dari Firestore..." });

    try {
      // 1. Fetch ALL data from Firestore
      const wastewaterSnap = await getDocs(collection(db, 'wastewater'));
      const wastewater = wastewaterSnap.docs.map(d => d.data() as WastewaterData);

      const rainfallSnap = await getDocs(collection(db, 'rainfall'));
      const rainfall = rainfallSnap.docs.map(d => d.data() as RainfallData);

      const nurserySnap = await getDocs(collection(db, 'nursery'));
      const nursery = nurserySnap.docs.map(d => d.data() as NurseryData);

      const reclamationSnap = await getDocs(collection(db, 'reclamation'));
      const reclamationPlans = reclamationSnap.docs
        .filter(d => d.id.startsWith('RP-'))
        .map(d => d.data() as ReclamationPlan);
      const reclamationGuarantees = reclamationSnap.docs
        .filter(d => d.id.startsWith('RG-'))
        .map(d => d.data() as ReclamationGuarantee);

      const wasteB3Snap = await getDocs(collection(db, 'waste_b3'));
      const wasteIn = wasteB3Snap.docs
        .filter(d => d.id.startsWith('WI-'))
        .map(d => d.data() as WasteIn);
      const wasteOut = wasteB3Snap.docs
        .filter(d => d.id.startsWith('WO-'))
        .map(d => d.data() as WasteOut);

      const documentsSnap = await getDocs(collection(db, 'documents'));
      const documents = documentsSnap.docs
        .filter(d => d.id.startsWith('DOC-'))
        .map(d => d.data() as EnvironmentalDocument);
      const calendarEvents = documentsSnap.docs
        .filter(d => d.id.startsWith('EV-'))
        .map(d => d.data() as ComplianceCalendarEvent);

      const costsSnap = await getDocs(collection(db, 'costs'));
      const environmentalCosts = costsSnap.docs.map(d => d.data() as EnvironmentalCost);

      const solidWasteSnap = await getDocs(collection(db, 'solid_waste'));
      const solidWaste = solidWasteSnap.docs.map(d => d.data() as SolidWasteData);

      if (onStatusChange) onStatusChange({ status: 'syncing', lastSynced: null, message: "Menghubungi Google Drive..." });

      // 2. Dapatkan folder ID
      const folderId = await backupService.getOrCreateBackupFolder(accessToken);

      // 3. Buat konten file JSON
      const backupDate = new Date().toISOString();
      const backupPayload = {
        backupDate,
        hostSystem: "DEM (diva enviro monitor) system",
        data: {
          wastewater,
          rainfall,
          nursery,
          reclamationPlans,
          reclamationGuarantees,
          wasteIn,
          wasteOut,
          documents,
          calendarEvents,
          environmentalCosts,
          solidWaste
        }
      };

      const fileContent = JSON.stringify(backupPayload, null, 2);
      const sanitisedName = (customFileName || '').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '');
      const fileName = sanitisedName
        ? `${sanitisedName.endsWith('.json') ? sanitisedName : sanitisedName + '.json'}`
        : `DEM-Backup-${backupDate.replace(/:/g, '-')}.json`;

      const boundary = 'env_coal_pro_backup_boundary';
      const metadataBody = {
        name: fileName,
        mimeType: 'application/json',
        parents: folderId ? [folderId] : []
      };

      const multipartBody = [
        `--${boundary}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadataBody),
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        fileContent,
        `--${boundary}--`
      ].join('\r\n');

      const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const driveRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });

      if (!driveRes.ok) {
        const text = await driveRes.text();
        throw new Error(`Ekspor Google Drive gagal: ${text}`);
      }

      const lastSyncedTime = new Date().toLocaleTimeString('id-ID');
      if (onStatusChange) onStatusChange({ status: 'synced', lastSynced: lastSyncedTime, message: "Ekspor Berhasil!" });

      // Create Audit Log
      await auditService.createLog({
        collection: 'backups',
        recordId: 'drive',
        action: 'backup',
        details: `Melakukan ekspor database ke Google Drive dengan nama file ${fileName}`
      });

      // Tambahkan ke notifikasi sistem
      await notificationService.add({
        type: 'Info',
        category: 'Permit',
        title: 'Ekspor Drive Berhasil',
        message: `Salinan database berhasil disimpan ke Google Drive Anda: "${fileName}".`
      });

      return true;
    } catch (error: any) {
      console.error("Gagal melakukan ekspor data ke Drive:", error);
      if (onStatusChange) onStatusChange({ status: 'error', lastSynced: null, message: error.message || "Gagal mengunggah file ke Drive." });
      return false;
    }
  },

  /**
   * Mengambil daftar file .json backup dari folder `DEM system Backups` di Drive
   */
  getBackupsFromGoogleDrive: async (accessToken: string): Promise<DriveBackupFile[]> => {
    if (!accessToken) return [];

    try {
      const folderId = await backupService.getOrCreateBackupFolder(accessToken);
      
      let query = "mimeType = 'application/json' and trashed = false";
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }
      
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime desc&fields=files(id, name, createdTime)&pageSize=30`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Gagal mendapatkan backup dari Google Drive:", errText);
        return [];
      }

      const result = await res.json();
      return result.files || [];
    } catch (error) {
      console.error("Kesalahan listing backup dari Drive:", error);
      return [];
    }
  },

  /**
   * Mengunduh konten backup (.json) dari Google Drive berdasarkan File ID
   */
  importFromGoogleDrive: async (accessToken: string, fileId: string): Promise<any | null> => {
    if (!accessToken || !fileId) return null;

    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        throw new Error(`File gagal diunduh: ${res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      console.error("Kesalahan mengunduh file backup:", error);
      throw error;
    }
  },

  /**
   * Memulihkan (restore) dataset ke Firestore database
   */
  restoreBackupToFirestore: async (backupData: any): Promise<boolean> => {
    if (!backupData || !backupData.data) {
      throw new Error("Format file backup tidak valid atau tidak memiliki data.");
    }

    const { data } = backupData;
    console.log("Restoring data to Firestore...", data);

    try {
      // 1. Wastewater
      if (Array.isArray(data.wastewater)) {
        for (const item of data.wastewater) {
          if (item.id) await setDoc(doc(db, 'wastewater', item.id), item);
        }
      }

      // 2. Rainfall
      if (Array.isArray(data.rainfall)) {
        for (const item of data.rainfall) {
          if (item.id) await setDoc(doc(db, 'rainfall', item.id), item);
        }
      }

      // 3. Nursery
      if (Array.isArray(data.nursery)) {
        for (const item of data.nursery) {
          if (item.id) await setDoc(doc(db, 'nursery', item.id), item);
        }
      }

      // 4. Reclamation Plans
      if (Array.isArray(data.reclamationPlans)) {
        for (const item of data.reclamationPlans) {
          if (item.id) await setDoc(doc(db, 'reclamation', item.id), item);
        }
      }

      // 5. Reclamation Guarantees
      if (Array.isArray(data.reclamationGuarantees)) {
        for (const item of data.reclamationGuarantees) {
          if (item.id) await setDoc(doc(db, 'reclamation', item.id), item);
        }
      }

      // 6. Waste In
      if (Array.isArray(data.wasteIn)) {
        for (const item of data.wasteIn) {
          if (item.id) await setDoc(doc(db, 'waste_b3', item.id), item);
        }
      }

      // 7. Waste Out
      if (Array.isArray(data.wasteOut)) {
        for (const item of data.wasteOut) {
          if (item.id) await setDoc(doc(db, 'waste_b3', item.id), item);
        }
      }

      // 8. Documents
      if (Array.isArray(data.documents)) {
        for (const item of data.documents) {
          if (item.id) await setDoc(doc(db, 'documents', item.id), item);
        }
      }

      // 9. Compliance Calendar
      if (Array.isArray(data.calendarEvents)) {
        for (const item of data.calendarEvents) {
          if (item.id) await setDoc(doc(db, 'documents', item.id), item);
        }
      }

      // 10. Environmental Costs
      if (Array.isArray(data.environmentalCosts)) {
        for (const item of data.environmentalCosts) {
          if (item.id) await setDoc(doc(db, 'costs', item.id), item);
        }
      }

      // 11. Solid Waste
      if (Array.isArray(data.solidWaste)) {
        for (const item of data.solidWaste) {
          if (item.id) await setDoc(doc(db, 'solid_waste', item.id), item);
        }
      }

      // Log activity
      await auditService.createLog({
        collection: 'backups',
        recordId: 'restore',
        action: 'backup',
        details: `Melakukan restore database dari cadangan Drive (Dibuat pada: ${backupData.backupDate || 'N/A'})`
      });

      // System notification
      await notificationService.add({
        type: 'Info',
        category: 'Permit',
        title: 'Pemulihan Database Sukses',
        message: `Seluruh data berhasil dipulihkan dari cadangan Google Drive.`
      });

      return true;
    } catch (err) {
      console.error("Kesalahan pemulihan database:", err);
      throw err;
    }
  }
};
