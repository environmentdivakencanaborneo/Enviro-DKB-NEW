/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  WastewaterData, 
  RainfallData, 
  NurseryData, 
  ReclamationPlan, 
  ReclamationGuarantee, 
  WasteIn, 
  WasteOut, 
  WasteStock,
  EnvironmentalDocument, 
  ComplianceCalendarEvent, 
  AlertNotification,
  GoogleSyncConfig,
  SyncQueueItem
} from '../types';
import { 
  INITIAL_WASTEWATER, 
  INITIAL_RAINFALL, 
  INITIAL_NURSERY, 
  INITIAL_RECLAMATION, 
  INITIAL_GUARANTEE, 
  INITIAL_WASTE_IN, 
  INITIAL_WASTE_OUT, 
  INITIAL_DOCUMENTS, 
  INITIAL_CALENDAR, 
  INITIAL_ALERTS 
} from '../data/initialData';
import { evaluateWastewaterStatus } from '../data/regulations';
import { 
  getAccessToken, 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './firebaseAuth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

// Names of localStorage keys
const KEYS = {
  WASTEWATER: 'coal_monitor_wastewater',
  RAINFALL: 'coal_monitor_rainfall',
  NURSERY: 'coal_monitor_nursery',
  RECLAMATION: 'coal_monitor_reclamation',
  GUARANTEE: 'coal_monitor_guarantee',
  WASTE_IN: 'coal_monitor_waste_in',
  WASTE_OUT: 'coal_monitor_waste_out',
  DOCUMENTS: 'coal_monitor_documents',
  CALENDAR: 'coal_monitor_calendar',
  ALERTS: 'coal_monitor_alerts',
  SYNC_CONFIG: 'coal_monitor_sync_config',
  SYNC_QUEUE: 'coal_monitor_sync_queue',
  USER: 'coal_monitor_user_profile',
};

// Check and initialize local storage with pre-seeded values if empty
export function initializeLocalStorage() {
  if (!localStorage.getItem(KEYS.WASTEWATER)) {
    localStorage.setItem(KEYS.WASTEWATER, JSON.stringify(INITIAL_WASTEWATER));
  }
  if (!localStorage.getItem(KEYS.RAINFALL)) {
    localStorage.setItem(KEYS.RAINFALL, JSON.stringify(INITIAL_RAINFALL));
  }
  if (!localStorage.getItem(KEYS.NURSERY)) {
    localStorage.setItem(KEYS.NURSERY, JSON.stringify(INITIAL_NURSERY));
  }
  if (!localStorage.getItem(KEYS.RECLAMATION)) {
    localStorage.setItem(KEYS.RECLAMATION, JSON.stringify(INITIAL_RECLAMATION));
  }
  if (!localStorage.getItem(KEYS.GUARANTEE)) {
    localStorage.setItem(KEYS.GUARANTEE, JSON.stringify(INITIAL_GUARANTEE));
  }
  if (!localStorage.getItem(KEYS.WASTE_IN)) {
    localStorage.setItem(KEYS.WASTE_IN, JSON.stringify(INITIAL_WASTE_IN));
  }
  if (!localStorage.getItem(KEYS.WASTE_OUT)) {
    localStorage.setItem(KEYS.WASTE_OUT, JSON.stringify(INITIAL_WASTE_OUT));
  }
  if (!localStorage.getItem(KEYS.DOCUMENTS)) {
    localStorage.setItem(KEYS.DOCUMENTS, JSON.stringify(INITIAL_DOCUMENTS));
  }
  if (!localStorage.getItem(KEYS.CALENDAR)) {
    localStorage.setItem(KEYS.CALENDAR, JSON.stringify(INITIAL_CALENDAR));
  }
  if (!localStorage.getItem(KEYS.ALERTS)) {
    localStorage.setItem(KEYS.ALERTS, JSON.stringify(INITIAL_ALERTS));
  }
  
  if (!localStorage.getItem(KEYS.SYNC_CONFIG)) {
    const defaultConfig: GoogleSyncConfig = {
      clientId: '',
      spreadsheetId: '',
      folderId: '',
      isAuthenticated: false,
      syncStatus: 'offline',
      lastSynced: null,
    };
    localStorage.setItem(KEYS.SYNC_CONFIG, JSON.stringify(defaultConfig));
  }
  
  if (!localStorage.getItem(KEYS.SYNC_QUEUE)) {
    const emptyQueue: SyncQueueItem[] = [];
    localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(emptyQueue));
  }

  if (!localStorage.getItem(KEYS.USER)) {
    const defaultUser = {
      name: 'Aditya Perkasa',
      email: 'environmentdivakencanaborneo@gmail.com',
      company: 'PT Diva Kencana Borneo',
      role: 'Environmental Manager & Mine Superintendent'
    };
    localStorage.setItem(KEYS.USER, JSON.stringify(defaultUser));
  }
}

// Generic Getter
export function getStoredItems<T>(key: string): T[] {
  initializeLocalStorage();
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

// Generic Setter with Sync Trigger
export function updateStoredItems<T>(key: string, items: T[], tableName: string, actionDesc: string) {
  localStorage.setItem(key, JSON.stringify(items));
  addToSyncQueue(tableName, actionDesc, items);
}

// Sync Queue helpers
export function getSyncQueue(): SyncQueueItem[] {
  const raw = localStorage.getItem(KEYS.SYNC_QUEUE);
  return raw ? JSON.parse(raw) : [];
}

function addToSyncQueue(table: string, action: string, data: any) {
  const queue = getSyncQueue();
  const newItem: SyncQueueItem = {
    id: `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    table,
    action: action as any,
    data
  };
  queue.push(newItem);
  localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
  
  // Set status as syncing or offline depending on auth
  const config = getSyncConfig();
  if (config.isAuthenticated) {
    updateSyncStatus('syncing');
  } else {
    updateSyncStatus('offline');
  }
}

export function clearSyncQueue() {
  localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify([]));
}

// Google Sync Config Helper
export function getSyncConfig(): GoogleSyncConfig {
  initializeLocalStorage();
  const raw = localStorage.getItem(KEYS.SYNC_CONFIG);
  return raw ? JSON.parse(raw) : {
    clientId: '',
    spreadsheetId: '',
    folderId: '',
    isAuthenticated: false,
    syncStatus: 'offline',
    lastSynced: null,
  };
}

export function saveSyncConfig(config: Partial<GoogleSyncConfig>) {
  const current = getSyncConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(KEYS.SYNC_CONFIG, JSON.stringify(updated));
  return updated;
}

export function updateSyncStatus(status: 'synced' | 'syncing' | 'offline') {
  const current = getSyncConfig();
  current.syncStatus = status;
  if (status === 'synced') {
    current.lastSynced = new Date().toISOString();
  }
  localStorage.setItem(KEYS.SYNC_CONFIG, JSON.stringify(current));
  
  // Dispatch a custom event to update status globally across elements
  window.dispatchEvent(new Event('coal_monitor_sync_changed'));
}

// Helper to update value grids on Google Sheets
async function updateGoogleSheetTab(accessToken: string, spreadsheetId: string, sheetName: string, headers: string[], items: any[], mapFn: (x: any) => any[]) {
  const rows = [headers, ...items.map(mapFn)];
  try {
    const resUpdate = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z5000?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rows
      })
    });
    return resUpdate.ok;
  } catch (err) {
    console.error(`Error updating sheet ${sheetName}:`, err);
    return false;
  }
}

// Helper to actual Google Sheet and Drive Integration
export async function runGoogleSync(): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    updateSyncStatus('offline');
    return false;
  }

  updateSyncStatus('syncing');

  try {
    const config = getSyncConfig();
    let spreadsheetId = config.spreadsheetId;

    // 1. Auto-create Spreadsheet if none is configured
    if (!spreadsheetId) {
      const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: 'ENV-COAL PRO Database Lingkungan Tambang'
          }
        })
      });

      if (createSheetRes.ok) {
        const sheetData = await createSheetRes.json();
        spreadsheetId = sheetData.spreadsheetId;
        saveSyncConfig({ spreadsheetId });
      } else {
        throw new Error('Gagal mem-provisioning Google Spreadsheet baru secara otomatis.');
      }
    }

    // 2. Query existing sheet titles to verify we have all required tabs
    const resMetadata = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!resMetadata.ok) {
      throw new Error('Database Spreadsheet target tidak dapat diakses atau salah ID.');
    }

    const metadata = await resMetadata.json();
    const existingTitles = (metadata.sheets || []).map((s: any) => s.properties.title);

    const requiredSheets = [
      "Wastewater", "Rainfall", "Nursery", "Reclamation Plans", "Reclamation Guarantees", 
      "Waste B3 In", "Waste B3 Out", "Environmental Documents", "Compliance Calendar"
    ];

    const addSheetRequests: any[] = [];
    for (const title of requiredSheets) {
      if (!existingTitles.includes(title)) {
        addSheetRequests.push({
          addSheet: {
            properties: { title }
          }
        });
      }
    }

    if (addSheetRequests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests: addSheetRequests })
      });
    }

    // 3. Write data tables to respective sheets
    await updateGoogleSheetTab(
      accessToken, spreadsheetId, "Wastewater",
      ["ID", "Tanggal", "Lokasi", "Petugas", "pH", "TSS (mg/L)", "Debit (m³/s)", "Besi Fe (mg/L)", "Mangan Mn (mg/L)", "Status"],
      getStoredItems<WastewaterData>(KEYS.WASTEWATER),
      x => [x.id, x.date, x.location, x.officer, x.ph, x.tss, x.debit, x.fe, x.mn, x.status]
    );

    await updateGoogleSheetTab(
      accessToken, spreadsheetId, "Rainfall",
      ["ID", "Tanggal", "Mulai", "Selesai", "Durasi (Min)", "Stasiun", "Tipe Alat", "Curah Hujan (mm)", "Intensitas", "Cuaca", "Catatan"],
      getStoredItems<RainfallData>(KEYS.RAINFALL),
      x => [x.id, x.date, x.startTime, x.endTime, x.duration, x.station, x.gaugeType, x.rainfall, x.intensity, x.weather, x.notes || '']
    );

    await updateGoogleSheetTab(
      accessToken, spreadsheetId, "Nursery",
      ["ID", "Jenis Tanaman", "Jumlah Bibit", "Sumber", "Usia (Minggu)", "Tinggi (cm)", "Status", "Lokasi", "Tanggal Masuk"],
      getStoredItems<NurseryData>(KEYS.NURSERY),
      x => [x.id, x.plantType, x.quantity, x.source, x.ageWeeks, x.heightCm, x.status, x.location, x.dateIn]
    );

    await updateGoogleSheetTab(
      accessToken, spreadsheetId, "Reclamation Plans",
      ["ID", "Area", "Luas (Ha)", "Tahun Target", "Jenis Tanaman", "Metode", "Estimasi Biaya", "Status", "PIC"],
      getStoredItems<ReclamationPlan>(KEYS.RECLAMATION),
      x => [x.id, x.areaName, x.sizeHa, x.targetYear, x.plantType, x.method, x.estimatedCost, x.status, x.pic]
    );

    await updateGoogleSheetTab(
      accessToken, spreadsheetId, "Reclamation Guarantees",
      ["ID", "No Jaminan", "Tipe", "Nilai (IDR)", "Lembaga Penerbit", "Tanggal Terbit", "Tanggal Jatuh Tempo", "Status", "Tautan Dokumen"],
      getStoredItems<ReclamationGuarantee>(KEYS.GUARANTEE),
      x => [x.id, x.guaranteeNo, x.guaranteeType, x.value, x.issuingInstitution, x.issuedDate, x.dueDate, x.status, x.docUrl || '']
    );

    await updateGoogleSheetTab(
      accessToken, spreadsheetId, "Waste B3 In",
      ["ID", "Tanggal Masuk", "Jenis Limbah", "Sumber", "Berat (Kg)", "Karakteristik", "Kode PP", "Lokasi TPS", "Petugas", "Dokumentasi"],
      getStoredItems<WasteIn>(KEYS.WASTE_IN),
      x => [x.id, x.dateIn, x.wasteType, x.source, x.weightKg, x.characteristic, x.code, x.tpsLocation, x.officer, x.documentationUrl || '']
    );

    await updateGoogleSheetTab(
      accessToken, spreadsheetId, "Waste B3 Out",
      ["ID", "Tanggal Keluar", "Jenis Limbah", "Berat (Kg)", "Tujuan", "Transporter", "No Manifest", "No Kendaraan", "Nama Driver", "Penerima", "Dokumentasi"],
      getStoredItems<WasteOut>(KEYS.WASTE_OUT),
      x => [x.id, x.dateOut, x.wasteType, x.weightKg, x.destination, x.transporter, x.manifestNo, x.vehicleNo, x.driverName, x.recipient, x.documentationUrl || '']
    );

    await updateGoogleSheetTab(
      accessToken, spreadsheetId, "Environmental Documents",
      ["ID", "Nama Dokumen", "Jenis", "No Dokumen", "Tanggal Terbit", "Tanggal Expired", "Status", "PIC", "Ukuran"],
      getStoredItems<EnvironmentalDocument>(KEYS.DOCUMENTS),
      x => [x.id, x.name, x.type, x.docNo, x.issuedDate, x.expiryDate, x.status, x.pic, x.fileSize || '']
    );

    await updateGoogleSheetTab(
      accessToken, spreadsheetId, "Compliance Calendar",
      ["ID", "Tanggal", "Judul", "Jenis", "Deskripsi", "Status"],
      getStoredItems<ComplianceCalendarEvent>(KEYS.CALENDAR),
      x => [x.id, x.date, x.title, x.type, x.description, x.status]
    );

    // 4. Drive backup creation
    let folderId = config.folderId;
    if (!folderId) {
      // Find or create 'ENV-COAL PRO Backups' folder
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='ENV-COAL PRO Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
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
              name: 'ENV-COAL PRO Backups',
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
        saveSyncConfig({ folderId });
      }
    }

    // Multipart upload dynamic backup JSON file to Google Drive
    const boundary = 'coal_monitor_boundary';
    const metadataBody = {
      name: `Kepatuhan-Lingkungan-Backup-${new Date().toISOString().split('T')[0]}.json`,
      mimeType: 'application/json',
      parents: folderId ? [folderId] : []
    };
    const fileContent = JSON.stringify({
      backupDate: new Date().toISOString(),
      user: getUserProfile(),
      wastewater: wastewaterDb.getAll(),
      rainfall: rainfallDb.getAll(),
      nursery: nurseryDb.getAll(),
      reclamationPlans: reclamationDb.getPlans(),
      reclamationGuarantees: reclamationDb.getGuarantees(),
      wasteIn: wasteDb.getIn(),
      wasteOut: wasteDb.getOut(),
      documents: documentsDb.getAll()
    }, null, 2);

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

    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    clearSyncQueue();
    updateSyncStatus('synced');

    addSystemNotification(
      'B3 Waste', 
      'Sinkronisasi Google Sukses', 
      `Seluruh data lokal berhasil disinkronkan ke Google Sheet (ID: ...${spreadsheetId.slice(-6)}) dan file backup laporan diunggah ke Google Drive.`
    );

    return true;

  } catch (error: any) {
    console.error('Google Sync Error:', error);
    updateSyncStatus('offline');
    addSystemNotification(
      'B3 Waste',
      'Sinkronisasi Gagal',
      `Sinkronisasi gagal: ${error.message || 'Error tidak diketahui'}`
    );
    return false;
  }
}

// Firestore Helpers for Realtime Persistence
export async function fsWrite(col: string, id: string, data: any) {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, col, id), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${col}/${id}`);
  }
}

export async function fsDelete(col: string, id: string) {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, col, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${col}/${id}`);
  }
}

// Initial Sync helper
export async function syncLocalDataToFirestore() {
  if (!auth.currentUser) return;
  console.log("Synchronizing database to Firestore...");
  
  try {
    // Sync User Profile
    const uProfile = getUserProfile();
    if (uProfile) {
      await fsWrite('users', auth.currentUser.uid, {
        name: uProfile.name || 'Aditya Perkasa',
        email: uProfile.email || auth.currentUser.email || 'operator@domain.com',
        company: uProfile.company || 'PT Diva Kencana Borneo',
        role: uProfile.role || 'Environmental Manager'
      });
    }

    // List of keys, collection paths and items
    const collectionsToSync = [
      { key: KEYS.WASTEWATER, path: 'wastewater' },
      { key: KEYS.RAINFALL, path: 'rainfall' },
      { key: KEYS.NURSERY, path: 'nursery' },
      { key: KEYS.RECLAMATION, path: 'reclamation_plans' },
      { key: KEYS.GUARANTEE, path: 'reclamation_guarantees' },
      { key: KEYS.WASTE_IN, path: 'waste_in' },
      { key: KEYS.WASTE_OUT, path: 'waste_out' },
      { key: KEYS.DOCUMENTS, path: 'environmental_documents' },
      { key: KEYS.CALENDAR, path: 'compliance_calendar' },
      { key: KEYS.ALERTS, path: 'alerts' }
    ];

    for (const col of collectionsToSync) {
      const items = getStoredItems<any>(col.key);
      for (const item of items) {
        if (!item.id) continue;
        await fsWrite(col.path, item.id, item);
      }
    }
    console.log("Firestore Synchronization Complete.");
  } catch (error) {
    console.error("Failed to sync local data to Firestore:", error);
  }
}

// Notification Helper
export function addSystemNotification(category: any, title: string, message: string) {
  const alerts = getStoredItems<AlertNotification>(KEYS.ALERTS);
  const newAlert: AlertNotification = {
    id: `AL-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'Info',
    category,
    title,
    message,
    read: false
  };
  alerts.unshift(newAlert);
  localStorage.setItem(KEYS.ALERTS, JSON.stringify(alerts));
  fsWrite('alerts', newAlert.id, newAlert);
  window.dispatchEvent(new Event('coal_monitor_alerts_changed'));
}

// USER CRUD Wrappers
export function getUserProfile(): any {
  initializeLocalStorage();
  const raw = localStorage.getItem(KEYS.USER);
  return raw ? JSON.parse(raw) : null;
}

export function saveUserProfile(user: any) {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
  window.dispatchEvent(new Event('coal_monitor_user_changed'));
  if (auth.currentUser) {
    fsWrite('users', auth.currentUser.uid, {
      name: user.name || 'Aditya Perkasa',
      email: user.email || auth.currentUser.email || 'operator@domain.com',
      company: user.company || 'PT Diva Kencana Borneo',
      role: user.role || 'Environmental Manager'
    });
  }
}

// WASTEWATER API Operations
export const wastewaterDb = {
  getAll: () => getStoredItems<WastewaterData>(KEYS.WASTEWATER),
  add: (item: Omit<WastewaterData, 'id' | 'status'>) => {
    const list = getStoredItems<WastewaterData>(KEYS.WASTEWATER);
    const status = evaluateWastewaterStatus(item.ph, item.tss, item.debit, item.fe, item.mn);
    const newItem: WastewaterData = {
      ...item,
      id: `WW-${Date.now().toString().slice(-4)}`,
      status
    };
    list.unshift(newItem);
    updateStoredItems(KEYS.WASTEWATER, list, 'Wastewater', 'insert');
    fsWrite('wastewater', newItem.id, newItem);
    
    // Check if exceeded for immediate alert
    if (status === 'Exceeded') {
      triggerThresholdAlert('Wastewater', 'Melebihi Baku Mutu!', 
        `Pengujian di ${item.location} melampaui ambang batas regulasi. pH: ${item.ph}, TSS: ${item.tss}mg/L. Segera lakukan penambahan kapur hidrat/perbaikan tawas.`);
    } else if (status === 'Warning') {
      triggerThresholdAlert('Wastewater', 'Mendekati Batas Baku Mutu', 
        `Pengujian di ${item.location} mendekati parameter kritis. Awasi penataan KPL secara berkala.`);
    }

    return newItem;
  },
  update: (id: string, item: Partial<WastewaterData>) => {
    let list = getStoredItems<WastewaterData>(KEYS.WASTEWATER);
    list = list.map(x => {
      if (x.id === id) {
        const merged = { ...x, ...item };
        merged.status = evaluateWastewaterStatus(merged.ph, merged.tss, merged.debit, merged.fe, merged.mn);
        fsWrite('wastewater', id, merged);
        return merged;
      }
      return x;
    });
    updateStoredItems(KEYS.WASTEWATER, list, 'Wastewater', 'update');
  },
  delete: (id: string) => {
    let list = getStoredItems<WastewaterData>(KEYS.WASTEWATER);
    list = list.filter(x => x.id !== id);
    updateStoredItems(KEYS.WASTEWATER, list, 'Wastewater', 'delete');
    fsDelete('wastewater', id);
  }
};

// RAINFALL API Operations
export const rainfallDb = {
  getAll: () => getStoredItems<RainfallData>(KEYS.RAINFALL),
  add: (item: Omit<RainfallData, 'id'>) => {
    const list = getStoredItems<RainfallData>(KEYS.RAINFALL);
    const newItem: RainfallData = {
      ...item,
      id: `RF-${Date.now().toString().slice(-4)}`
    };
    list.unshift(newItem);
    updateStoredItems(KEYS.RAINFALL, list, 'Rainfall', 'insert');
    fsWrite('rainfall', newItem.id, newItem);
    return newItem;
  },
  update: (id: string, item: Partial<RainfallData>) => {
    let list = getStoredItems<RainfallData>(KEYS.RAINFALL);
    list = list.map(x => {
      if (x.id === id) {
        const merged = { ...x, ...item };
        fsWrite('rainfall', id, merged);
        return merged;
      }
      return x;
    });
    updateStoredItems(KEYS.RAINFALL, list, 'Rainfall', 'update');
  },
  delete: (id: string) => {
    let list = getStoredItems<RainfallData>(KEYS.RAINFALL);
    list = list.filter(x => x.id !== id);
    updateStoredItems(KEYS.RAINFALL, list, 'Rainfall', 'delete');
    fsDelete('rainfall', id);
  }
};

// NURSERY API Operations
export const nurseryDb = {
  getAll: () => getStoredItems<NurseryData>(KEYS.NURSERY),
  add: (item: Omit<NurseryData, 'id'>) => {
    const list = getStoredItems<NurseryData>(KEYS.NURSERY);
    const newItem: NurseryData = {
      ...item,
      id: `NS-${Date.now().toString().slice(-4)}`
    };
    list.unshift(newItem);
    updateStoredItems(KEYS.NURSERY, list, 'Nursery', 'insert');
    fsWrite('nursery', newItem.id, newItem);
    return newItem;
  },
  update: (id: string, item: Partial<NurseryData>) => {
    let list = getStoredItems<NurseryData>(KEYS.NURSERY);
    list = list.map(x => {
      if (x.id === id) {
        const merged = { ...x, ...item };
        fsWrite('nursery', id, merged);
        return merged;
      }
      return x;
    });
    updateStoredItems(KEYS.NURSERY, list, 'Nursery', 'update');
  },
  delete: (id: string) => {
    let list = getStoredItems<NurseryData>(KEYS.NURSERY);
    list = list.filter(x => x.id !== id);
    updateStoredItems(KEYS.NURSERY, list, 'Nursery', 'delete');
    fsDelete('nursery', id);
  }
};

// RECLAMATION PLAN API Operations
export const reclamationDb = {
  getPlans: () => getStoredItems<ReclamationPlan>(KEYS.RECLAMATION),
  addPlan: (item: Omit<ReclamationPlan, 'id'>) => {
    const list = getStoredItems<ReclamationPlan>(KEYS.RECLAMATION);
    const newItem: ReclamationPlan = {
      ...item,
      id: `RP-${Date.now().toString().slice(-4)}`
    };
    list.unshift(newItem);
    updateStoredItems(KEYS.RECLAMATION, list, 'ReclamationPlan', 'insert');
    fsWrite('reclamation_plans', newItem.id, newItem);
    return newItem;
  },
  updatePlan: (id: string, item: Partial<ReclamationPlan>) => {
    let list = getStoredItems<ReclamationPlan>(KEYS.RECLAMATION);
    list = list.map(x => {
      if (x.id === id) {
        const merged = { ...x, ...item };
        fsWrite('reclamation_plans', id, merged);
        return merged;
      }
      return x;
    });
    updateStoredItems(KEYS.RECLAMATION, list, 'ReclamationPlan', 'update');
  },
  deletePlan: (id: string) => {
    let list = getStoredItems<ReclamationPlan>(KEYS.RECLAMATION);
    list = list.filter(x => x.id !== id);
    updateStoredItems(KEYS.RECLAMATION, list, 'ReclamationPlan', 'delete');
    fsDelete('reclamation_plans', id);
  },

  // GUARANTEE operations
  getGuarantees: () => getStoredItems<ReclamationGuarantee>(KEYS.GUARANTEE),
  addGuarantee: (item: Omit<ReclamationGuarantee, 'id'>) => {
    const list = getStoredItems<ReclamationGuarantee>(KEYS.GUARANTEE);
    const newItem: ReclamationGuarantee = {
      ...item,
      id: `RG-${Date.now().toString().slice(-4)}`
    };
    list.unshift(newItem);
    updateStoredItems(KEYS.GUARANTEE, list, 'ReclamationGuarantee', 'insert');
    fsWrite('reclamation_guarantees', newItem.id, newItem);
    
    if (item.status === 'Renewal Needed') {
      triggerThresholdAlert('Guarantee', 'Butuh Perpanjangan Jaminan', 
        `Dokumen jaminan reklamasi No. ${item.guaranteeNo} membutuhkan koordinasi bank penjamin sesegera mungkin.`);
    }
    return newItem;
  },
  updateGuarantee: (id: string, item: Partial<ReclamationGuarantee>) => {
    let list = getStoredItems<ReclamationGuarantee>(KEYS.GUARANTEE);
    list = list.map(x => {
      if (x.id === id) {
        const merged = { ...x, ...item };
        fsWrite('reclamation_guarantees', id, merged);
        return merged;
      }
      return x;
    });
    updateStoredItems(KEYS.GUARANTEE, list, 'ReclamationGuarantee', 'update');
  },
  deleteGuarantee: (id: string) => {
    let list = getStoredItems<ReclamationGuarantee>(KEYS.GUARANTEE);
    list = list.filter(x => x.id !== id);
    updateStoredItems(KEYS.GUARANTEE, list, 'ReclamationGuarantee', 'delete');
    fsDelete('reclamation_guarantees', id);
  }
};

// WASTE B3 API Operations
export const wasteDb = {
  getIn: () => getStoredItems<WasteIn>(KEYS.WASTE_IN),
  addIn: (item: Omit<WasteIn, 'id'>) => {
    const list = getStoredItems<WasteIn>(KEYS.WASTE_IN);
    const newItem: WasteIn = {
      ...item,
      id: `WI-${Date.now().toString().slice(-4)}`
    };
    list.unshift(newItem);
    updateStoredItems(KEYS.WASTE_IN, list, 'WasteIn', 'insert');
    fsWrite('waste_in', newItem.id, newItem);
    return newItem;
  },
  updateIn: (id: string, item: Partial<WasteIn>) => {
    let list = getStoredItems<WasteIn>(KEYS.WASTE_IN);
    list = list.map(x => {
      if (x.id === id) {
        const merged = { ...x, ...item };
        fsWrite('waste_in', id, merged);
        return merged;
      }
      return x;
    });
    updateStoredItems(KEYS.WASTE_IN, list, 'WasteIn', 'update');
  },
  deleteIn: (id: string) => {
    let list = getStoredItems<WasteIn>(KEYS.WASTE_IN);
    list = list.filter(x => x.id !== id);
    updateStoredItems(KEYS.WASTE_IN, list, 'WasteIn', 'delete');
    fsDelete('waste_in', id);
  },

  getOut: () => getStoredItems<WasteOut>(KEYS.WASTE_OUT),
  addOut: (item: Omit<WasteOut, 'id'>) => {
    const list = getStoredItems<WasteOut>(KEYS.WASTE_OUT);
    const newItem: WasteOut = {
      ...item,
      id: `WO-${Date.now().toString().slice(-4)}`
    };
    list.unshift(newItem);
    updateStoredItems(KEYS.WASTE_OUT, list, 'WasteOut', 'insert');
    fsWrite('waste_out', newItem.id, newItem);
    return newItem;
  },
  updateOut: (id: string, item: Partial<WasteOut>) => {
    let list = getStoredItems<WasteOut>(KEYS.WASTE_OUT);
    list = list.map(x => {
      if (x.id === id) {
        const merged = { ...x, ...item };
        fsWrite('waste_out', id, merged);
        return merged;
      }
      return x;
    });
    updateStoredItems(KEYS.WASTE_OUT, list, 'WasteOut', 'update');
  },
  deleteOut: (id: string) => {
    let list = getStoredItems<WasteOut>(KEYS.WASTE_OUT);
    list = list.filter(x => x.id !== id);
    updateStoredItems(KEYS.WASTE_OUT, list, 'WasteOut', 'delete');
    fsDelete('waste_out', id);
  },

  // Compiled dynamic inventory
  getStocks: (): WasteStock[] => {
    const ins = getStoredItems<WasteIn>(KEYS.WASTE_IN);
    const outs = getStoredItems<WasteOut>(KEYS.WASTE_OUT);

    // Grouping stock by waste fields
    const map = new Map<string, { in: number; out: number; code: string; earliest: string | null }>();

    ins.forEach(x => {
      const key = x.wasteType;
      const exist = map.get(key) || { in: 0, out: 0, code: x.code, earliest: null };
      exist.in += x.weightKg;
      
      // Calculate earliest age of remaining items in warehouse
      const inDate = new Date(x.dateIn);
      if (!exist.earliest || inDate < new Date(exist.earliest)) {
        // Simple logic: if it's not cleared fully yet
        exist.earliest = x.dateIn;
      }
      map.set(key, exist);
    });

    outs.forEach(x => {
      const key = x.wasteType;
      if (map.has(key)) {
        const exist = map.get(key)!;
        exist.out += x.weightKg;
        map.set(key, exist);
      } else {
        map.set(key, { in: 0, out: x.weightKg, code: 'N/A', earliest: null });
      }
    });

    const stocks: WasteStock[] = [];
    map.forEach((value, key) => {
      const currentStock = Math.max(0, value.in - value.out);
      let days = 0;
      if (currentStock > 0 && value.earliest) {
        const diffTime = Math.abs(Date.now() - new Date(value.earliest).getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      stocks.push({
        wasteType: key,
        code: value.code,
        totalIn: value.in,
        totalOut: value.out,
        currentStock,
        earliestDateIn: currentStock > 0 ? value.earliest : null,
        daysInTps: currentStock > 0 ? days : 0
      });
    });

    return stocks;
  }
};

// COMPLIANCE LICENSING OPERATIONS
export const documentsDb = {
  getAll: () => getStoredItems<EnvironmentalDocument>(KEYS.DOCUMENTS),
  add: (item: Omit<EnvironmentalDocument, 'id'>) => {
    const list = getStoredItems<EnvironmentalDocument>(KEYS.DOCUMENTS);
    const newItem: EnvironmentalDocument = {
      ...item,
      id: `DOC-${Date.now().toString().slice(-4)}`
    };
    list.unshift(newItem);
    updateStoredItems(KEYS.DOCUMENTS, list, 'Document', 'insert');
    fsWrite('environmental_documents', newItem.id, newItem);
    return newItem;
  },
  update: (id: string, item: Partial<EnvironmentalDocument>) => {
    let list = getStoredItems<EnvironmentalDocument>(KEYS.DOCUMENTS);
    list = list.map(x => {
      if (x.id === id) {
        const merged = { ...x, ...item };
        fsWrite('environmental_documents', id, merged);
        return merged;
      }
      return x;
    });
    updateStoredItems(KEYS.DOCUMENTS, list, 'Document', 'update');
  },
  delete: (id: string) => {
    let list = getStoredItems<EnvironmentalDocument>(KEYS.DOCUMENTS);
    list = list.filter(x => x.id !== id);
    updateStoredItems(KEYS.DOCUMENTS, list, 'Document', 'delete');
    fsDelete('environmental_documents', id);
  },

  // Calendar
  getEvents: () => getStoredItems<ComplianceCalendarEvent>(KEYS.CALENDAR),
  addEvent: (item: Omit<ComplianceCalendarEvent, 'id'>) => {
    const list = getStoredItems<ComplianceCalendarEvent>(KEYS.CALENDAR);
    const newItem: ComplianceCalendarEvent = {
      ...item,
      id: `EV-${Date.now().toString().slice(-4)}`
    };
    list.unshift(newItem);
    updateStoredItems(KEYS.CALENDAR, list, 'Calendar', 'insert');
    fsWrite('compliance_calendar', newItem.id, newItem);
    return newItem;
  },
  updateEvent: (id: string, item: Partial<ComplianceCalendarEvent>) => {
    let list = getStoredItems<ComplianceCalendarEvent>(KEYS.CALENDAR);
    list = list.map(x => {
      if (x.id === id) {
        const merged = { ...x, ...item };
        fsWrite('compliance_calendar', id, merged);
        return merged;
      }
      return x;
    });
    updateStoredItems(KEYS.CALENDAR, list, 'Calendar', 'update');
  },
  deleteEvent: (id: string) => {
    let list = getStoredItems<ComplianceCalendarEvent>(KEYS.CALENDAR);
    list = list.filter(x => x.id !== id);
    updateStoredItems(KEYS.CALENDAR, list, 'Calendar', 'delete');
    fsDelete('compliance_calendar', id);
  }
};

// ALERTS API OPERATIONS
export const alertsDb = {
  getAll: () => getStoredItems<AlertNotification>(KEYS.ALERTS),
  markAsRead: (id: string) => {
    let list = getStoredItems<AlertNotification>(KEYS.ALERTS);
    list = list.map(x => {
      if (x.id === id) {
        const updated = { ...x, read: true };
        fsWrite('alerts', id, updated);
        return updated;
      }
      return x;
    });
    localStorage.setItem(KEYS.ALERTS, JSON.stringify(list));
    window.dispatchEvent(new Event('coal_monitor_alerts_changed'));
  },
  markAllAsRead: () => {
    let list = getStoredItems<AlertNotification>(KEYS.ALERTS);
    list = list.map(x => {
      const updated = { ...x, read: true };
      fsWrite('alerts', x.id, updated);
      return updated;
    });
    localStorage.setItem(KEYS.ALERTS, JSON.stringify(list));
    window.dispatchEvent(new Event('coal_monitor_alerts_changed'));
  },
  clearAll: () => {
    const list = getStoredItems<AlertNotification>(KEYS.ALERTS);
    list.forEach(x => {
      fsDelete('alerts', x.id);
    });
    localStorage.setItem(KEYS.ALERTS, JSON.stringify([]));
    window.dispatchEvent(new Event('coal_monitor_alerts_changed'));
  }
};

function triggerThresholdAlert(category: any, title: string, message: string) {
  const list = getStoredItems<AlertNotification>(KEYS.ALERTS);
  const newAlert: AlertNotification = {
    id: `AL-CRIT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: 'Critical',
    category,
    title,
    message,
    read: false
  };
  list.unshift(newAlert);
  localStorage.setItem(KEYS.ALERTS, JSON.stringify(list));
  fsWrite('alerts', newAlert.id, newAlert);
  
  // Dispatch notification sounds or visual changes via browser context triggers
  window.dispatchEvent(new Event('coal_monitor_alerts_changed'));
}
