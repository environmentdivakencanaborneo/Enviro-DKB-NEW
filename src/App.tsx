/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertNotification,
  WasteStock,
  BatchWarning
} from './types';

// Page Views
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import MonitoringView from './components/MonitoringView';
import ReclamationView from './components/ReclamationView';
import WasteB3View from './components/WasteB3View';
import EnvironmentalCostsView from './components/EnvironmentalCostsView';
import ReportsView from './components/ReportsView';
import ESGMonitoringView from './components/ESGMonitoringView';
import PropernasReport from './components/PropernasReport';
import DocumentsView from './components/DocumentsView';
import NotificationsView from './components/NotificationsView';
import SettingsModals from './components/SettingsModals';
import AuthView from './components/AuthView';
import TableSkeleton from './components/TableSkeleton';
import ModuleErrorBoundary from './components/ModuleErrorBoundary';
import SolidWasteView from './components/SolidWasteView';
import CapaView from './components/CapaView';
import ComplianceMatrixView from './components/ComplianceMatrixView';
import IncidentView from './components/IncidentView';
import ExecutiveDashboardView from './components/ExecutiveDashboardView';
import RegulatoryWatchView from './components/RegulatoryWatchView';
import AdminManagementView from './components/AdminManagementView';

import { useAuth } from './services/authService';
import { canAccessModule, isAdmin, isSuperintendent } from './services/permissionService';
import { useFirestoreData } from './hooks/useFirestoreData';
import { handleGlobalError } from './utils/errorHandler';
import { 
  waterQualityService,
  surfaceWaterService,
  rainfallService,
  nurseryService,
  reclamationService,
  wasteB3Service,
  documentService,
  environmentalCostService,
  notificationService,
  solidWasteService
} from './services/dbService';
import type { BackupStatus } from './services/backupService';
import { getScopedKey } from './utils/googleSync';

import { VALID_TABS, AppTabId } from './data/navigation';
import { ShieldAlert } from 'lucide-react';

export default function App() {
  const { 
    user, 
    profile, 
    token, 
    loading, 
    isNewUser, 
    authError,
    hasWriteAuthority, 
    logout 
  } = useAuth();

  // Tabs layout navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modal Dialogs
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // Real-time local state pools loaded from custom useFirestoreData hook
  const {
    wastewater,
    surfaceWater,
    rainfall,
    nursery,
    reclamationPlans,
    reclamationGuarantees,
    wasteIn,
    wasteOut,
    documents,
    calendarEvents,
    environmentalCosts,
    alerts,
    solidWaste,
    capaFindings,
    complianceMatrix,
    incidents,
    regulatory,
    isLoadingWastewater,
    isLoadingSurfaceWater,
    isLoadingRainfall,
    isLoadingNursery,
    isLoadingReclamation,
    isLoadingWaste,
    isLoadingDocuments,
    isLoadingCosts,
    isLoadingAlerts,
    isLoadingSolidWaste,
    isLoadingCapa,
    isLoadingCompliance,
    isLoadingIncidents,
    isLoadingRegulatory
  } = useFirestoreData(activeTab);
  
  // Backup Sync and Retry State
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({ status: 'idle', lastSynced: null });
  const [authorityAlert, setAuthorityAlert] = useState<string | null>(null);
  
  // Toast & Offline states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const lastWarningRef = useRef<Record<string, number>>({});
  const showAuthorityWarning = (actionDesc: string) => {
    const now = Date.now();
    if (now - (lastWarningRef.current[actionDesc] || 0) < 5000) return;
    lastWarningRef.current[actionDesc] = now;
    setAuthorityAlert(actionDesc);
    setTimeout(() => {
      setAuthorityAlert(current => current === actionDesc ? null : current);
    }, 6000);

    // Record access restriction in the database notifications view
    notificationService.add({
      type: 'Warning',
      category: 'Permit',
      title: 'Akses Terbatas',
      message: `Gagal memproses "${actionDesc}": Akun dengan peran ${profile?.role || 'Viewer'} tidak memiliki wewenang memodifikasi database tambang.`,
      createdBy: user?.email || 'system'
    });
  };

  // Compile Dynamic inventory waste stocks from live inputs using FIFO simulation
  const wasteStocks = useMemo<WasteStock[]>(() => {
    // Kelompokkan wasteIn dan wasteOut per jenis limbah
    const wasteTypes = Array.from(new Set([
      ...wasteIn.map(w => w.wasteType),
      ...wasteOut.map(w => w.wasteType)
    ]));

    return wasteTypes.map(type => {
      // Dapatkan semua input untuk jenis ini, urutkan berdasarkan tanggal masuk terawal
      const inputs = wasteIn
        .filter(w => w.wasteType === type)
        .sort((a, b) => new Date(a.dateIn).getTime() - new Date(b.dateIn).getTime());

      // Dapatkan semua output untuk jenis ini, urutkan berdasarkan tanggal keluar terawal
      const outputs = wasteOut
        .filter(w => w.wasteType === type)
        .sort((a, b) => new Date(a.dateOut).getTime() - new Date(b.dateOut).getTime());

      const code = inputs[0]?.code || 'N/A';
      const totalIn = inputs.reduce((sum, item) => sum + item.weightKg, 0);
      const totalOut = outputs.reduce((sum, item) => sum + item.weightKg, 0);
      const currentStock = Math.max(0, totalIn - totalOut);

      // Simulasi FIFO untuk melacak sisa berat dan hari penyimpanan per batch masuk
      const batches = inputs.map(inp => ({
        id: inp.id,
        entryDate: inp.dateIn,
        weightRemaining: inp.weightKg,
        code: inp.code
      }));

      let outgoingPool = totalOut;
      for (const batch of batches) {
        if (outgoingPool <= 0) break;
        if (outgoingPool >= batch.weightRemaining) {
          outgoingPool -= batch.weightRemaining;
          batch.weightRemaining = 0;
        } else {
          batch.weightRemaining -= outgoingPool;
          outgoingPool = 0;
        }
      }

      // Saring batch yang masih memiliki sisa stok limbah di TPS
      const activeBatches = batches.filter(b => b.weightRemaining > 0);

      const warnings: BatchWarning[] = activeBatches.map(b => {
        const d = new Date(b.entryDate);
        const timeVal = isNaN(d.getTime()) ? Date.now() : d.getTime();
        const diffTime = Date.now() - timeVal;
        const daysInTps = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysRemaining = 90 - daysInTps; // Batas izin TPS adalah 90 hari sesuai Permen LHK 6/2021
        return {
          batchId: b.id,
          weightRemaining: b.weightRemaining,
          daysRemaining,
          entryDate: b.entryDate
        };
      });

      // Hitung daysInTps sebagai umur batch terlama yang masih tersisa
      let maxDaysInTps = 0;
      let earliestDateIn: string | null = null;

      if (warnings.length > 0) {
        // Cari batch terlama (daysRemaining paling kecil / entryDate terlama)
        const oldestBatch = warnings.reduce((oldest, current) => 
          current.daysRemaining < oldest.daysRemaining ? current : oldest
        , warnings[0]);

        earliestDateIn = oldestBatch.entryDate;
        const diffTime = Date.now() - new Date(oldestBatch.entryDate).getTime();
        maxDaysInTps = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        wasteType: type,
        code,
        totalIn,
        totalOut,
        currentStock,
        earliestDateIn,
        daysInTps: currentStock > 0 ? maxDaysInTps : 0,
        batchWarnings: warnings
      };
    });
  }, [wasteIn, wasteOut]);

  // Global Event Listeners for Toast notification and Online/Offline state changes
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: 'success' | 'error' | 'warning' | 'info' }>;
      if (customEvent.detail) {
        setToast(customEvent.detail);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setToast({ message: "Koneksi terhubung kembali.", type: 'success' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setToast({ message: "Koneksi terputus. Bekerja dalam mode offline sementara.", type: 'warning' });
    };

    window.addEventListener('coal_monitor_toast', handleToastEvent);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('coal_monitor_toast', handleToastEvent);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Firestore reactive subscriptions are now consolidated inside useFirestoreData hook!

  // Routing and Navigation mapping
  useEffect(() => {
    const handleHashRouter = () => {
      const hash = window.location.hash.replace('#', '');
      if (VALID_TABS.includes(hash as any)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashRouter);
    handleHashRouter();

    return () => {
      window.removeEventListener('hashchange', handleHashRouter);
    };
  }, []);

  const setTabAndHash = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  // Google Drive Backup trigger
  const handleGoogleSync = async () => {
    setSyncModalOpen(true);
  };

  // COMPILATION SAFE WRAPPERS DISPLAY FOR SUB-VIEWS
  const syncConfigForLegacyComponents = {
    clientId: 'google-oauth-client',
    spreadsheetId: localStorage.getItem(getScopedKey('env_coal_pro_spreadsheet_id')) || 'Belum Dihubungkan',
    folderId: localStorage.getItem(getScopedKey('env_coal_pro_backup_folder_id')) || '',
    isAuthenticated: !!token,
    syncStatus: ((isOnline && (user || profile)) 
      ? (backupStatus.status === 'syncing' ? 'syncing' : 'synced')
      : 'offline') as 'synced' | 'syncing' | 'offline',
    lastSynced: backupStatus.lastSynced || new Date().toISOString()
  };

  // MUTATIONAL ACTIONS WRAPPED IN SECURITY POLICY INTERCEPTORS
  const handleAddWastewater = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Tambah Data Kualitas Air Limbah");
      return;
    }
    try {
      await waterQualityService.add(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Data Air Limbah");
    }
  };
  const handleUpdateWastewater = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Data Kualitas Air Limbah");
      return;
    }
    try {
      await waterQualityService.update(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Data Air Limbah");
    }
  };
  const handleDeleteWastewater = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Data Air Limbah");
      return;
    }
    try {
      await waterQualityService.delete(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Data Air Limbah");
    }
  };

  const handleAddSurfaceWater = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Tambah Data Kualitas Air Permukaan");
      return;
    }
    try {
      await surfaceWaterService.add(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Data Air Permukaan");
    }
  };
  const handleUpdateSurfaceWater = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Data Kualitas Air Permukaan");
      return;
    }
    try {
      await surfaceWaterService.update(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Data Air Permukaan");
    }
  };
  const handleDeleteSurfaceWater = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Data Air Permukaan");
      return;
    }
    try {
      await surfaceWaterService.delete(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Data Air Permukaan");
    }
  };

  const handleAddRainfall = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Tambah Catatan Curah Hujan");
      return;
    }
    try {
      await rainfallService.add(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Data Curah Hujan");
    }
  };
  const handleUpdateRainfall = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Catatan Curah Hujan");
      return;
    }
    try {
      await rainfallService.update(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Data Curah Hujan");
    }
  };
  const handleDeleteRainfall = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Catatan Curah Hujan");
      return;
    }
    try {
      await rainfallService.delete(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Catatan Curah Hujan");
    }
  };

  const handleAddNursery = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Tambah Inventaris Nursery/Spesies");
      return;
    }
    try {
      await nurseryService.add(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Data Nursery");
    }
  };
  const handleUpdateNursery = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Inventaris Nursery/Spesies");
      return;
    }
    try {
      await nurseryService.update(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Data Nursery");
    }
  };
  const handleDeleteNursery = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Catatan Nursery");
      return;
    }
    try {
      await nurseryService.delete(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Catatan Nursery");
    }
  };

  const handleAddPlan = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Tambah Rencana/Realisasi Reklamasi");
      return;
    }
    try {
      await reclamationService.addPlan(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Rencana Reklamasi");
    }
  };
  const handleUpdatePlan = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Update Rencana/Realisasi Reklamasi");
      return;
    }
    try {
      await reclamationService.updatePlan(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Rencana Reklamasi");
    }
  };
  const handleDeletePlan = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Rencana Reklamasi");
      return;
    }
    try {
      await reclamationService.deletePlan(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Rencana Reklamasi");
    }
  };

  const handleAddGuarantee = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Tambah Jaminan Reklamasi");
      return;
    }
    try {
      await reclamationService.addGuarantee(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Jaminan Reklamasi");
    }
  };
  const handleUpdateGuarantee = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Jaminan Reklamasi");
      return;
    }
    try {
      await reclamationService.updateGuarantee(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Jaminan Reklamasi");
    }
  };
  const handleDeleteGuarantee = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Jaminan Reklamasi");
      return;
    }
    try {
      await reclamationService.deleteGuarantee(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Jaminan Reklamasi");
    }
  };

  const handleAddWasteIn = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Log Masuk Limbah B3");
      return;
    }
    try {
      await wasteB3Service.addIn(item);
    } catch (e: any) {
      handleGlobalError(e, "Log Masuk Limbah B3");
    }
  };
  const handleUpdateWasteIn = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Log Masuk Limbah B3");
      return;
    }
    try {
      await wasteB3Service.updateIn(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Log Masuk Limbah B3");
    }
  };
  const handleDeleteWasteIn = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Log Masuk Limbah B3");
      return;
    }
    try {
      await wasteB3Service.deleteIn(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Log Masuk Limbah B3");
    }
  };

  const handleAddWasteOut = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Log Keluar Limbah B3");
      return;
    }
    try {
      await wasteB3Service.addOut(item);
    } catch (e: any) {
      handleGlobalError(e, "Log Keluar Limbah B3");
    }
  };
  const handleUpdateWasteOut = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Log Keluar Limbah B3");
      return;
    }
    try {
      await wasteB3Service.updateOut(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Log Keluar Limbah B3");
    }
  };
  const handleDeleteWasteOut = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Log Keluar Limbah B3");
      return;
    }
    try {
      await wasteB3Service.deleteOut(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Log Keluar Limbah B3");
    }
  };

  const handleAddDocument = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Unggah Dokumen AMDAL/RKL-RPL");
      return;
    }
    try {
      await documentService.addDoc(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Dokumen Lingkungan");
      throw e;
    }
  };
  const handleUpdateDocument = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Dokumen AMDAL/RKL-RPL");
      return;
    }
    try {
      await documentService.updateDoc(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Dokumen Lingkungan");
      throw e;
    }
  };
  const handleDeleteDocument = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Dokumen AMDAL/RKL-RPL");
      return;
    }
    try {
      await documentService.deleteDoc(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Dokumen Lingkungan");
    }
  };

  const handleAddCalendarEvent = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Tambah Kegiatan Agenda Kepatuhan");
      return;
    }
    try {
      await documentService.addEvent(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Kegiatan Agenda");
      throw e;
    }
  };
  const handleDeleteCalendarEvent = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Kegiatan Agenda Kepatuhan");
      return;
    }
    try {
      await documentService.deleteEvent(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Kegiatan Agenda");
    }
  };
  const handleUpdateCalendarStatus = async (id: string, status: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Status Agenda");
      return;
    }
    try {
      await documentService.updateEvent(id, status);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Status Agenda");
    }
  };

  const handleAddCost = async (item: any) => {
    if (!isSuperintendent(profile)) {
      showAuthorityWarning("Tambah Catatan Biaya Lingkungan");
      return;
    }
    try {
      await environmentalCostService.add(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Catatan Biaya");
    }
  };
  const handleUpdateCost = async (id: string, item: any) => {
    if (!isSuperintendent(profile)) {
      showAuthorityWarning("Ubah Catatan Biaya Lingkungan");
      return;
    }
    try {
      await environmentalCostService.update(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Catatan Biaya Lingkungan");
    }
  };
  const handleDeleteCost = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Catatan Biaya Lingkungan");
      return;
    }
    try {
      await environmentalCostService.delete(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Catatan Biaya Lingkungan");
    }
  };

  const handleAddSolidWaste = async (item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Tambah Data Pengolahan Sampah");
      return;
    }
    try {
      await solidWasteService.add(item);
    } catch (e: any) {
      handleGlobalError(e, "Tambah Data Pengolahan Sampah");
    }
  };
  const handleUpdateSolidWaste = async (id: string, item: any) => {
    if (!hasWriteAuthority) {
      showAuthorityWarning("Ubah Data Pengolahan Sampah");
      return;
    }
    try {
      await solidWasteService.update(id, item);
    } catch (e: any) {
      handleGlobalError(e, "Ubah Data Pengolahan Sampah");
    }
  };
  const handleDeleteSolidWaste = async (id: string) => {
    if (!isAdmin(profile)) {
      showAuthorityWarning("Hapus Data Pengolahan Sampah");
      return;
    }
    try {
      await solidWasteService.delete(id);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Data Pengolahan Sampah");
    }
  };

  const handleNotificationMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id, user?.email || undefined);
    } catch (e: any) {
      handleGlobalError(e, "Tandai Notifikasi Dibaca");
    }
  };
  const handleNotificationMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(alerts, user?.email || undefined);
    } catch (e: any) {
      handleGlobalError(e, "Tandai Semua Notifikasi Dibaca");
    }
  };
  const handleNotificationClearAll = async () => {
    try {
      await notificationService.clearAll(alerts, user?.email || undefined);
    } catch (e: any) {
      handleGlobalError(e, "Hapus Semua Notifikasi");
    }
  };

  // Render controller per routed tab
  const renderCurrentView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ModuleErrorBoundary moduleName="Dashboard Utama">
            <DashboardView 
              wastewater={wastewater}
              surfaceWater={surfaceWater}
              rainfall={rainfall}
              nursery={nursery}
              guarantees={reclamationGuarantees}
              wasteStocks={wasteStocks}
              solidWaste={solidWaste}
              documents={documents}
              alerts={alerts}
              calendar={calendarEvents}
              environmentalCosts={environmentalCosts}
              setCurrentTab={setTabAndHash}
            />
          </ModuleErrorBoundary>
        );

      case 'monitoring':
        if (isLoadingWastewater || isLoadingSurfaceWater || isLoadingRainfall) {
          return (
            <div className="bg-white border border-slate-200/50 rounded-xl p-6">
              <h3 className="text-xs font-semibold font-mono tracking-widest text-slate-500 uppercase mb-4">MEMUAT DATA MONITORING LINGKUNGAN...</h3>
              <TableSkeleton columns={5} rows={4} />
            </div>
          );
        }
        return (
          <ModuleErrorBoundary moduleName="Monitoring Mutu Air & Curah Hujan">
            <MonitoringView 
              wastewater={wastewater}
              surfaceWater={surfaceWater}
              rainfall={rainfall}
              onAddWastewater={handleAddWastewater}
              onUpdateWastewater={handleUpdateWastewater}
              onDeleteWastewater={handleDeleteWastewater}
              onAddSurfaceWater={handleAddSurfaceWater}
              onUpdateSurfaceWater={handleUpdateSurfaceWater}
              onDeleteSurfaceWater={handleDeleteSurfaceWater}
              onAddRainfall={handleAddRainfall}
              onUpdateRainfall={handleUpdateRainfall}
              onDeleteRainfall={handleDeleteRainfall}
              plans={reclamationPlans}
            />
          </ModuleErrorBoundary>
        );
      case 'reclamation':
        if (isLoadingNursery || isLoadingReclamation) {
          return (
            <div className="bg-white border border-slate-200/50 rounded-xl p-6">
              <h3 className="text-xs font-semibold font-mono tracking-widest text-slate-500 uppercase mb-4">MEMUAT DATA REKLAMASI & NURSERY...</h3>
              <TableSkeleton columns={6} rows={4} />
            </div>
          );
        }
        return (
          <ModuleErrorBoundary moduleName="Reklamasi Area Tambang & Nursery">
            <ReclamationView 
              nursery={nursery}
              plans={reclamationPlans}
              guarantees={reclamationGuarantees}
              onAddNursery={handleAddNursery}
              onUpdateNursery={handleUpdateNursery}
              onDeleteNursery={handleDeleteNursery}
              onAddPlan={handleAddPlan}
              onUpdatePlan={handleUpdatePlan}
              onDeletePlan={handleDeletePlan}
              onAddGuarantee={handleAddGuarantee}
              onUpdateGuarantee={handleUpdateGuarantee}
              onDeleteGuarantee={handleDeleteGuarantee}
            />
          </ModuleErrorBoundary>
        );
      case 'waste':
        if (isLoadingWaste) {
          return (
            <div className="bg-white border border-slate-200/50 rounded-xl p-6">
              <h3 className="text-xs font-semibold font-mono tracking-widest text-slate-500 uppercase mb-4">MEMUAT DATA PERSEDIAAN LIMBAH B3...</h3>
              <TableSkeleton columns={6} rows={4} />
            </div>
          );
        }
        return (
          <ModuleErrorBoundary moduleName="Pengelolaan Limbah Industri B3">
            <WasteB3View 
              wasteIn={wasteIn}
              wasteOut={wasteOut}
              wasteStocks={wasteStocks}
              onAddIn={handleAddWasteIn}
              onUpdateIn={handleUpdateWasteIn}
              onDeleteIn={handleDeleteWasteIn}
              onAddOut={handleAddWasteOut}
              onUpdateOut={handleUpdateWasteOut}
              onDeleteOut={handleDeleteWasteOut}
            />
          </ModuleErrorBoundary>
        );
      case 'solid_waste':
        if (isLoadingSolidWaste) {
          return (
            <div className="bg-white border border-slate-200/50 rounded-xl p-6">
              <h3 className="text-xs font-semibold font-mono tracking-widest text-slate-500 uppercase mb-4">MEMUAT REKAMAN DATA PENGOLAHAN SAMPAH...</h3>
              <TableSkeleton columns={8} rows={4} />
            </div>
          );
        }
        return (
          <ModuleErrorBoundary moduleName="Aspek Pengolahan Sampah Permen LH 7/2025">
            <SolidWasteView 
              solidWasteList={solidWaste}
              onAdd={handleAddSolidWaste}
              onUpdate={handleUpdateSolidWaste}
              onDelete={handleDeleteSolidWaste}
            />
          </ModuleErrorBoundary>
        );

      case 'findings':
        return (
          <CapaView
            findings={capaFindings}
            isLoading={isLoadingCapa}
            userEmail={user?.email || undefined}
            canEdit={hasWriteAuthority}
            canDelete={isAdmin(profile)}
            onUnauthorizedAction={showAuthorityWarning}
          />
        );

      case 'compliance_matrix':
        return (
          <ComplianceMatrixView
            data={complianceMatrix}
            isLoading={isLoadingCompliance}
            canEdit={hasWriteAuthority}
            canDelete={isAdmin(profile)}
            onUnauthorizedAction={showAuthorityWarning}
          />
        );

      case 'incidents':
        return (
          <IncidentView
            incidents={incidents}
            isLoading={isLoadingIncidents}
            canEdit={hasWriteAuthority}
            canDelete={isAdmin(profile)}
            onUnauthorizedAction={showAuthorityWarning}
          />
        );

      case 'executive':
        return (
          <ExecutiveDashboardView
            capa={capaFindings}
            compliance={complianceMatrix}
            documents={documents}
            guarantees={reclamationGuarantees}
            incidents={incidents}
            isLoading={isLoadingCapa || isLoadingCompliance || isLoadingDocuments || isLoadingReclamation || isLoadingIncidents}
          />
        );

      case 'regulatory_watch':
        return (
          <RegulatoryWatchView
            data={regulatory}
            isLoading={isLoadingRegulatory}
            canEdit={hasWriteAuthority}
            canDelete={isAdmin(profile)}
            onUnauthorizedAction={showAuthorityWarning}
          />
        );
      case 'esg':
        if (isLoadingWastewater || isLoadingNursery || isLoadingReclamation || isLoadingWaste || isLoadingSolidWaste || isLoadingCosts || isLoadingAlerts) {
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
              <h3 className="text-xs font-semibold font-mono tracking-widest text-slate-500 uppercase mb-4">MEMUAT MODUL ESG & GRI...</h3>
              <TableSkeleton columns={4} rows={5} />
            </div>
          );
        }
        return (
          <ModuleErrorBoundary moduleName="ESG & GRI Disclosure">
            <ESGMonitoringView 
              wastewater={wastewater}
              nursery={nursery}
              plans={reclamationPlans}
              guarantees={reclamationGuarantees}
              wasteIn={wasteIn}
              wasteOut={wasteOut}
              solidWaste={solidWaste}
              documents={documents}
              calendarEvents={calendarEvents}
              environmentalCosts={environmentalCosts}
              alerts={alerts}
            />
          </ModuleErrorBoundary>
        );
      case 'proper':
        if (isLoadingWastewater || isLoadingSolidWaste || isLoadingReclamation || isLoadingWaste) {
          return (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
              <h3 className="text-xs font-semibold font-mono tracking-widest text-slate-500 uppercase mb-4">MEMUAT SIMULASI PROPERNAS...</h3>
              <TableSkeleton columns={4} rows={5} />
            </div>
          );
        }
        return (
          <ModuleErrorBoundary moduleName="Simulasi PROPER">
            <PropernasReport 
              activeWater={wastewater}
              solidWaste={solidWaste}
              plans={reclamationPlans}
              activeWasteIn={wasteIn}
              activeWasteOut={wasteOut}
              nurseryHealthIndex={85} // fallback or calculate if we have it
              user={profile}
            />
          </ModuleErrorBoundary>
        );
      case 'reports':
        return (
          <ModuleErrorBoundary moduleName="Laporan Terintegrasi AMDAL">
            <ReportsView 
              wastewater={wastewater}
              surfaceWater={surfaceWater}
              rainfall={rainfall}
              nursery={nursery}
              plans={reclamationPlans}
              wasteIn={wasteIn}
              wasteOut={wasteOut}
              guarantees={reclamationGuarantees}
              documents={documents}
              calendarEvents={calendarEvents}
              environmentalCosts={environmentalCosts}
              solidWaste={solidWaste}
              user={profile}
            />
          </ModuleErrorBoundary>
        );

      case 'documents':
        if (isLoadingDocuments) {
          return (
            <div className="bg-white border border-slate-200/50 rounded-xl p-6">
              <h3 className="text-xs font-semibold font-mono tracking-widest text-slate-500 uppercase mb-4">MEMUAT DOKUMEN & JADWAL KEPATUHAN...</h3>
              <TableSkeleton columns={5} rows={4} />
            </div>
          );
        }
        return (
          <ModuleErrorBoundary moduleName="Dokumen Lingkungan & Kepatuhan">
            <DocumentsView 
              documents={documents}
              calendar={calendarEvents}
              onAddDocument={handleAddDocument}
              onUpdateDocument={handleUpdateDocument}
              onDeleteDocument={handleDeleteDocument}
              onAddEvent={handleAddCalendarEvent}
              onDeleteEvent={handleDeleteCalendarEvent}
              onUpdateEventStatus={handleUpdateCalendarStatus}
              canEdit={hasWriteAuthority}
              canDelete={isAdmin(profile)}
              onUnauthorizedAction={showAuthorityWarning}
            />
          </ModuleErrorBoundary>
        );
      case 'costs':
        if (isLoadingCosts) {
          return (
            <div className="bg-white border border-slate-200/50 rounded-xl p-6">
              <h3 className="text-xs font-semibold font-mono tracking-widest text-slate-500 uppercase mb-4">MEMUAT DATA ANGGARAN & BIAYA LINGKUNGAN...</h3>
              <TableSkeleton columns={4} rows={3} />
            </div>
          );
        }
        return (
          <ModuleErrorBoundary moduleName="Anggaran Biaya Lingkungan Hidup">
            <EnvironmentalCostsView 
              costs={environmentalCosts}
              onAddCost={handleAddCost}
              onUpdateCost={handleUpdateCost}
              onDeleteCost={handleDeleteCost}
              canEdit={isSuperintendent(profile)}
              canDelete={isAdmin(profile)}
              onUnauthorizedAction={showAuthorityWarning}
            />
          </ModuleErrorBoundary>
        );
      case 'notifications':
        if (isLoadingAlerts) {
          return (
            <div className="bg-white border border-slate-200/50 rounded-xl p-6">
              <h3 className="text-xs font-semibold font-mono tracking-widest text-slate-500 uppercase mb-4">MEMUAT NOTIFIKASI SYSTEM...</h3>
              <TableSkeleton columns={3} rows={4} />
            </div>
          );
        }
        return (
          <ModuleErrorBoundary moduleName="Notifikasi & Peringatan Lapangan">
            <NotificationsView 
              alerts={alerts}
              onMarkRead={handleNotificationMarkRead}
              onMarkAllRead={handleNotificationMarkAllRead}
              onClearAll={handleNotificationClearAll}
              userEmail={profile?.email}
            />
          </ModuleErrorBoundary>
        );

      case 'registration_approval':
      case 'user_management':
      case 'role_management': {
        if (!canAccessModule(profile, activeTab)) {
          return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-xl mx-auto my-12 space-y-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Akses Ditolak</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Modul administrasi ini hanya dapat diakses oleh Environment Manager atau Administrator sistem.
              </p>
            </div>
          );
        }

        const adminTabMap: Record<string, 'approval' | 'users' | 'roles'> = {
          registration_approval: 'approval',
          user_management: 'users',
          role_management: 'roles'
        };

        return (
          <ModuleErrorBoundary moduleName="Administrasi Sistem">
            <AdminManagementView initialTab={adminTabMap[activeTab] || 'users'} />
          </ModuleErrorBoundary>
        );
      }

      default:
        return <div className="p-8 text-center text-slate-900">Modul tidak ditemukan.</div>;
    }
  };

  const isApprovedUser = user && profile && (profile.status === 'Active' || profile.isApproved === true);

  // Show a full-screen sleek loader if checking auth states
  if (loading && !user && !authError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-700 font-sans">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-sm font-semibold text-slate-500 font-mono uppercase tracking-widest mt-4">DIVA KENCANA BORNEO SECURE ENCLAVE</h2>
        <p className="text-xs text-slate-500 mt-2">Menyiapkan konektivitas data terenkripsi...</p>
      </div>
    );
  }

  // Handle Login Wall & Unapproved / Pending Wall
  if (!user || isNewUser || !isApprovedUser) {
    return (
      <AuthView />
    );
  }

  return (
    <div id="app-workspace-shell" className="min-h-screen bg-white text-slate-800 flex flex-col md:flex-row font-sans relative overflow-hidden">
      
      {/* Collapsible Sidebar Navigation Panel */}
      <Sidebar 
        currentTab={activeTab}
        setCurrentTab={setTabAndHash}
        syncConfig={syncConfigForLegacyComponents}
        user={profile}
        setSyncModalOpen={setSyncModalOpen}
        onLogout={logout}
      />

      {/* Floating Bottom Nav Bar for Mobile Viewports */}
      <MobileNav 
        currentTab={activeTab}
        setCurrentTab={setTabAndHash}
        syncConfig={syncConfigForLegacyComponents}
        user={profile}
        setSyncModalOpen={setSyncModalOpen}
        setUserModalOpen={setUserModalOpen}
        onLogout={logout}
      />

      {/* Main viewport frame */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden min-w-0 z-10 relative">
        {/* Top Header Panel */}
        <Header 
          backupStatus={backupStatus}
          alerts={alerts}
          user={profile}
          setSyncModalOpen={setSyncModalOpen}
          setUserModalOpen={setUserModalOpen}
          currentTab={activeTab}
          hasWriteAuthority={hasWriteAuthority}
          onSync={handleGoogleSync}
        />

        {/* Scrollable Content Views */}
        <main className="flex-1 p-5 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full pb-20 relative z-10">
          {renderCurrentView()}
        </main>
      </div>

      {/* Settings Modal Configurator */}
      <SettingsModals 
        syncModalOpen={syncModalOpen}
        setSyncModalOpen={setSyncModalOpen}
        userModalOpen={userModalOpen}
        setUserModalOpen={setUserModalOpen}
        syncConfig={syncConfigForLegacyComponents}
        user={profile}
        onRefresh={() => {}}
        onLogout={logout}
        onBackupStatusChange={setBackupStatus}
      />

      {/* Floating System-Wide Toast Notification */}
      {toast && (
        <div 
          id="global-system-toast" 
          className={`fixed bottom-24 md:bottom-6 left-6 z-50 max-w-sm sm:max-w-md border shadow-lg shadow-slate-200/60 rounded-2xl p-4 flex items-center gap-3.5 animate-bounce-short backdrop-blur-md ${
            toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
            'bg-white/95 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex-1">
            <p className="text-[11.5px] font-sans font-medium leading-relaxed">
              {toast.message}
            </p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-slate-900 transition-colors cursor-pointer p-0.5 ml-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Network Connectivity Indicator */}
      {!isOnline && (
        <div 
          id="network-offline-ribbon" 
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white border border-rose-500/30 shadow-lg px-4 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider flex items-center gap-2 animate-pulse"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white block" />
          <span>Offline Mode / Kerja Lokal Aktif</span>
        </div>
      )}

      {/* Floating Alert Trigger for Access Violations */}
      {authorityAlert && (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-50 max-w-sm sm:max-w-md bg-white border border-red-500/30 shadow-[0_10px_40px_rgba(239,68,68,0.15)] rounded-2xl p-4 flex items-start gap-3.5 text-slate-800 animate-fade-in backdrop-blur-md">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-shield-alert"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest font-mono">Akses Ditolak (View-Only)</h4>
            <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
              Gagal memproses <span className="font-bold text-slate-900">"{authorityAlert}"</span>. Jabatan Anda sebagai <span className="font-semibold text-amber-600">{profile?.role || 'Guest'}</span> tidak memiliki wewenang untuk mengubah database tambang.
            </p>
          </div>
          <button 
            onClick={() => setAuthorityAlert(null)}
            className="text-slate-500 hover:text-slate-600 transition-colors cursor-pointer p-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
