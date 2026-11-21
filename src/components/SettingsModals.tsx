/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleSyncConfig } from '../types';
import { canAccessModule, isStrictAdmin, isSuperintendent, effectiveRole } from '../services/permissionService';
import { ROLES, MANAGER_ASSIGNABLE_ROLES } from '../utils/roles';
import {
  X,
  HelpCircle,
  RefreshCw,
  User,
  Save,
  LogOut,
  Download,
  Upload,
  Database,
  Calendar,
  AlertTriangle,
  Check,
  Clock,
  Shield,
  KeyRound,
  FileJson,
  CheckCircle2,
} from 'lucide-react';
import { auth, db } from '../utils/firebaseAuth';
import { useAuth } from '../services/authService';
import {
  backupService,
  BackupStatus,
  DriveBackupFile,
  BackupPreviewSummary,
  RestoreExecutionReport,
  decryptAndVerifyBackup,
} from '../services/backupService';
import { BACKUP_INVENTORY, RESTORE_EXCLUDED_COLLECTIONS } from '../constants/collections';
import { exportAllDataToXLSX } from '../services/exportService';
import { collection, getDocs, doc, query, where, documentId, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auditService } from '../services/auditService';
import {
  WastewaterData, RainfallData, NurseryData,
  ReclamationPlan, ReclamationGuarantee,
  WasteIn, WasteOut, EnvironmentalDocument,
  ComplianceCalendarEvent, EnvironmentalCost, SolidWasteData,
  SurfaceWaterData, NurseryStockOut, CapaData,
  ComplianceMatrixData, IncidentData, RegulatoryWatchData,
  AmdTreatmentData, AirEmissionData, TopsoilErosionData,
  BiodiversityData, IadlRiskData, ProperRkabData
} from '../types';

interface SettingsModalsProps {
  syncModalOpen: boolean;
  setSyncModalOpen: (open: boolean) => void;
  userModalOpen: boolean;
  setUserModalOpen: (open: boolean) => void;
  syncConfig: GoogleSyncConfig;
  user: any;
  onRefresh: () => void;
  onLogout?: () => void;
  onBackupStatusChange?: (status: BackupStatus) => void;
}

export default function SettingsModals({
  syncModalOpen,
  setSyncModalOpen,
  userModalOpen,
  setUserModalOpen,
  user,
  onRefresh,
  onLogout,
  onBackupStatusChange
}: SettingsModalsProps) {
  const { updateUserProfile, token: authServiceToken, loginWithGoogle, logout: authLogout, profile } = useAuth();
  const canManageBackups = canAccessModule(profile, 'backup_restore');
  const canManageRoles = canAccessModule(profile, 'role_management');
  const isStrictAdminUser = isStrictAdmin(profile);
  const assignableRoles = isStrictAdminUser ? ROLES : MANAGER_ASSIGNABLE_ROLES;
  const canReadConfidential = isSuperintendent(profile) || effectiveRole(profile) === 'Auditor';

  // Live Google Auth state
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isGAuthLoading, setIsGAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Export XLSX state
  const [isExportingXLSX, setIsExportingXLSX] = useState(false);
  const [xlsxExportStatus, setXlsxExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Encrypted Backup & Restore state
  const [backupFiles, setBackupFiles] = useState<DriveBackupFile[]>([]);
  const [customFileName, setCustomFileName] = useState('');
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isExportingLocal, setIsExportingLocal] = useState(false);
  const [backupActionStatus, setBackupActionStatus] = useState<BackupStatus>({ status: 'idle', lastSynced: null });

  // Preview + Restore Flow state
  const [selectedSourceLabel, setSelectedSourceLabel] = useState<string | null>(null);
  const [rawBackupObj, setRawBackupObj] = useState<unknown | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [previewSummary, setPreviewSummary] = useState<BackupPreviewSummary | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);
  const [restoreReport, setRestoreReport] = useState<RestoreExecutionReport | null>(null);

  useEffect(() => {
    if (syncModalOpen) {
      if (authServiceToken && auth.currentUser) {
        setGoogleUser(auth.currentUser);
      } else {
        setGoogleUser(null);
      }
    } else {
      setBackupPassphrase('');
      setRestorePassphrase('');
    }
  }, [syncModalOpen, authServiceToken]);

  useEffect(() => {
    const loadBackups = async () => {
      if (authServiceToken && syncModalOpen && canManageBackups) {
        setIsLoadingBackups(true);
        try {
          const files = await backupService.getBackupsFromGoogleDrive(authServiceToken);
          setBackupFiles(files);
        } catch (error) {
          console.error('Gagal memuat cadangan dari Drive:', error);
        } finally {
          setIsLoadingBackups(false);
        }
      }
    };
    loadBackups();
  }, [syncModalOpen, authServiceToken, canManageBackups]);

  const handleGoogleLogin = async () => {
    setIsGAuthLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      onRefresh();
    } catch (err: any) {
      setAuthError(err?.message || 'Akses ditolak / Gagal menghubungkan ke akun Google.');
    } finally {
      setIsGAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await authLogout();
      setGoogleUser(null);
      setBackupFiles([]);
      onRefresh();
    } catch (err) {
      console.error('Logout Google gagal:', err);
    }
  };

  const handleExportLocalEncrypted = async () => {
    if (!canManageBackups) return;
    if (backupPassphrase.trim().length < 8) {
      setBackupActionStatus({
        status: 'error',
        lastSynced: null,
        message: 'Kata sandi enkripsi AES-256-GCM minimal 8 karakter wajib diisi.',
      });
      return;
    }

    setIsExportingLocal(true);
    setBackupActionStatus({ status: 'syncing', lastSynced: null, message: 'Mengenkripsi snapshot 32 koleksi...' });
    try {
      const res = await backupService.exportEncryptedToLocalFile(backupPassphrase, customFileName);
      setBackupActionStatus({
        status: 'synced',
        lastSynced: new Date().toLocaleTimeString('id-ID'),
        message: `Berkas terenkripsi "${res.fileName}" (${(res.sizeBytes / 1024).toFixed(1)} KB) berhasil diunduh.`,
      });
      setCustomFileName('');
    } catch (err: any) {
      setBackupActionStatus({
        status: 'error',
        lastSynced: null,
        message: err?.message || 'Gagal membuat cadangan lokal terenkripsi.',
      });
    } finally {
      setIsExportingLocal(false);
    }
  };

  const handleExportBackupDrive = async () => {
    if (!canManageBackups) return;
    if (!authServiceToken) {
      setBackupActionStatus({ status: 'error', lastSynced: null, message: 'Akses Token Google tidak tersedia.' });
      return;
    }
    if (backupPassphrase.trim().length < 8) {
      setBackupActionStatus({
        status: 'error',
        lastSynced: null,
        message: 'Masukkan kata sandi enkripsi minimal 8 karakter sebelum mengunggah ke Google Drive.',
      });
      return;
    }

    try {
      const success = await backupService.exportToGoogleDrive(
        authServiceToken,
        backupPassphrase,
        customFileName,
        (status) => {
          setBackupActionStatus(status);
          onBackupStatusChange?.(status);
        }
      );
      if (success) {
        setCustomFileName('');
        onBackupStatusChange?.({ status: 'synced', lastSynced: new Date().toISOString() });
        const files = await backupService.getBackupsFromGoogleDrive(authServiceToken);
        setBackupFiles(files);
      }
    } catch (err: any) {
      setBackupActionStatus({ status: 'error', lastSynced: null, message: err?.message || 'Kesalahan proses cadangan.' });
    }
  };

  const openDriveRestoreModal = async (file: DriveBackupFile) => {
    if (!authServiceToken || !canManageBackups) return;
    setRestoreErrorReset();
    setSelectedSourceLabel(`Google Drive: ${file.name}`);
    setRestoreProgress('Mengunduh berkas cadangan dari Google Drive...');
    try {
      const raw = await backupService.importFromGoogleDrive(authServiceToken, file.id);
      setRawBackupObj(raw);
      if (raw && typeof raw === 'object' && (raw as any).format !== 'DEM_ENCRYPTED_BACKUP_V1') {
        // File format lama tidak terenkripsi -> langsung pratinjau
        const preview = await decryptAndVerifyBackup(raw);
        setPreviewSummary(preview);
      }
    } catch (err: any) {
      setPreviewError(err?.message || 'Gagal memuat berkas cadangan dari Drive.');
    } finally {
      setRestoreProgress(null);
    }
  };

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canManageBackups) return;
    setRestoreErrorReset();
    setSelectedSourceLabel(`File Lokal: ${file.name}`);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setRawBackupObj(parsed);
      if (parsed && typeof parsed === 'object' && parsed.format !== 'DEM_ENCRYPTED_BACKUP_V1') {
        const preview = await decryptAndVerifyBackup(parsed);
        setPreviewSummary(preview);
      }
    } catch (err: any) {
      setPreviewError(err?.message || 'File bukan JSON cadangan DEM yang valid.');
    } finally {
      e.target.value = '';
    }
  };

  const setRestoreErrorReset = () => {
    setPreviewError(null);
    setPreviewSummary(null);
    setRestoreReport(null);
    setReplaceConfirmed(false);
    setRestorePassphrase('');
  };

  const handleDecryptPreview = async () => {
    if (!rawBackupObj) return;
    setPreviewError(null);
    try {
      const summary = await decryptAndVerifyBackup(rawBackupObj, restorePassphrase);
      setPreviewSummary(summary);
    } catch (err: any) {
      setPreviewError(err?.message || 'Dekripsi gagal. Periksa kata sandi backup.');
      setPreviewSummary(null);
    }
  };

  const handleExecuteRestore = async () => {
    if (!previewSummary || !canManageBackups) return;
    if (restoreMode === 'replace' && !replaceConfirmed) {
      setPreviewError('Centang konfirmasi penghapusan/penggantian penuh untuk mode Replace.');
      return;
    }

    setRestoreProgress('Menjalankan pemulihan bertahap ke Firestore...');
    setPreviewError(null);
    try {
      const report = await backupService.restoreBackupToFirestore(previewSummary.payload, {
        mode: restoreMode,
        adminConfirmedReplace: restoreMode === 'replace' ? replaceConfirmed : false,
      });
      setRestoreReport(report);
      setRestoreProgress(null);
    } catch (err: any) {
      setPreviewError(err?.message || 'Proses restore gagal.');
      setRestoreProgress(null);
    }
  };

  // User profile state
  const [uName, setUName] = useState(user?.name || '');
  const [uEmail, setUEmail] = useState(user?.email || '');
  const [uCompany, setUCompany] = useState(user?.company || '');
  const [uRole, setURole] = useState(user?.role || '');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userSaveError, setUserSaveError] = useState<string | null>(null);

  const [rolesList, setRolesList] = useState<{ email: string; role: string }[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [roleUpdateMsg, setRoleUpdateMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (userModalOpen && canManageRoles) {
      loadRoles();
    }
  }, [userModalOpen, canManageRoles]);

  const loadRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const snap = await getDocs(collection(db, 'roles'));
      const list = snap.docs.map((d) => ({ email: d.id, role: d.data().level || 'Viewer' }));
      setRolesList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const handleRoleChange = async (email: string, newRole: string) => {
    if (!canManageRoles || !auth.currentUser?.uid || !auth.currentUser?.email) return;
    if (email.toLowerCase() === auth.currentUser.email.toLowerCase()) {
      setRoleUpdateMsg({ type: 'error', msg: 'Tidak dapat mengubah peran akun milik sendiri.' });
      return;
    }
    const existingItem = rolesList.find((r) => r.email === email);
    const oldRole = existingItem?.role || 'Viewer';
    if (!isStrictAdminUser) {
      if (
        !(MANAGER_ASSIGNABLE_ROLES as readonly string[]).includes(oldRole) ||
        !(MANAGER_ASSIGNABLE_ROLES as readonly string[]).includes(newRole)
      ) {
        setRoleUpdateMsg({ type: 'error', msg: 'Environment Manager hanya dapat menetapkan peran hingga Environment Superintendent.' });
        return;
      }
    }
    setRoleUpdateMsg(null);
    try {
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();

      if (isStrictAdminUser) {
        const matchedUsersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
        matchedUsersSnap.forEach((userDoc) => {
          batch.update(doc(db, 'users', userDoc.id), {
            role: newRole,
            updatedAt: nowIso,
          });
        });
      }

      batch.set(
        doc(db, 'roles', email),
        {
          email,
          level: newRole,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser.email,
        },
        { merge: true }
      );

      const logId = `LOG-${crypto.randomUUID()}`;
      batch.set(doc(db, 'audit_logs', logId), {
        id: logId,
        uid: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        user: auth.currentUser.email,
        actorName: (profile?.fullName || profile?.name || auth.currentUser.email).slice(0, 120),
        actorRole: profile?.role || (isStrictAdminUser ? 'Admin' : 'Environment Manager'),
        module: 'role_management',
        collection: 'roles',
        recordId: email.slice(0, 128),
        action: 'role_change',
        details: `Changed role for ${email} from ${oldRole} to ${newRole}`.slice(0, 995),
        beforeData: { role: oldRole },
        afterData: { role: newRole },
        status: 'SUCCESS',
      });

      await batch.commit();
      setRolesList((prev) => prev.map((r) => (r.email === email ? { ...r, role: newRole } : r)));
      setRoleUpdateMsg({ type: 'success', msg: `Berhasil mengubah role ${email}` });
      setTimeout(() => setRoleUpdateMsg(null), 3000);
    } catch (e: any) {
      setRoleUpdateMsg({ type: 'error', msg: e.message || 'Gagal mengubah role' });
    }
  };

  useEffect(() => {
    if (user) {
      setUName(user.name || '');
      setUEmail(user.email || '');
      setUCompany(user.company || '');
      setURole(user.role || '');
    }
  }, [user]);

  const handleUserSave = async () => {
    setIsSavingUser(true);
    setUserSaveError(null);
    try {
      await updateUserProfile(uName, uCompany);
      setUserModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setUserSaveError(err?.message || 'Isian profil tidak valid.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleExportXLSX = async () => {
    setIsExportingXLSX(true);
    setXlsxExportStatus('idle');
    try {
      const [
        wwSnap, rfSnap, nsSnap, rpSnap, rgSnap, wb3Snap, docSnap, costSnap, swSnap, surfSnap, nsoSnap,
        capaSnap, cmSnap, incSnap, regSnap, amdSnap, airSnap, topsoilSnap, bioSnap, iadlSnap, properSnap
      ] = await Promise.all([
        getDocs(collection(db, 'wastewater')),
        getDocs(collection(db, 'rainfall')),
        getDocs(collection(db, 'nursery')),
        getDocs(query(collection(db, 'reclamation'), where(documentId(), '>=', 'RP-'), where(documentId(), '<', 'RP.'))),
        canReadConfidential
          ? getDocs(query(collection(db, 'reclamation'), where(documentId(), '>=', 'RG-'), where(documentId(), '<', 'RG.')))
          : Promise.resolve(null),
        getDocs(collection(db, 'waste_b3')),
        getDocs(collection(db, 'documents')),
        canReadConfidential ? getDocs(collection(db, 'costs')) : Promise.resolve(null),
        getDocs(collection(db, 'solid_waste')),
        getDocs(collection(db, 'surfacewater')),
        getDocs(collection(db, 'nursery_stock_out')),
        getDocs(collection(db, 'capa')),
        getDocs(collection(db, 'compliance_matrix')),
        getDocs(collection(db, 'incidents')),
        getDocs(collection(db, 'regulatory')),
        getDocs(collection(db, 'amd_treatment')),
        getDocs(collection(db, 'air_emission')),
        getDocs(collection(db, 'topsoil_erosion')),
        getDocs(collection(db, 'biodiversity')),
        getDocs(collection(db, 'iadl_risk')),
        canReadConfidential ? getDocs(collection(db, 'proper_rkab')) : Promise.resolve(null),
      ]);

      await exportAllDataToXLSX({
        wastewater:            wwSnap.docs.map(d => d.data() as WastewaterData),
        rainfall:              rfSnap.docs.map(d => d.data() as RainfallData),
        nursery:               nsSnap.docs.map(d => d.data() as NurseryData),
        reclamationPlans:      rpSnap.docs.map(d => d.data() as ReclamationPlan),
        reclamationGuarantees: rgSnap ? rgSnap.docs.map(d => d.data() as ReclamationGuarantee) : [],
        wasteIn:               wb3Snap.docs.filter(d => d.id.startsWith('WI-')).map(d => d.data() as WasteIn),
        wasteOut:              wb3Snap.docs.filter(d => d.id.startsWith('WO-')).map(d => d.data() as WasteOut),
        documents:             docSnap.docs.filter(d => d.id.startsWith('DOC-')).map(d => d.data() as EnvironmentalDocument),
        calendarEvents:        docSnap.docs.filter(d => d.id.startsWith('EV-')).map(d => d.data() as ComplianceCalendarEvent),
        environmentalCosts:    costSnap ? costSnap.docs.map(d => d.data() as EnvironmentalCost) : [],
        solidWaste:            swSnap.docs.map(d => d.data() as SolidWasteData),
        surfaceWater:          surfSnap.docs.map(d => d.data() as SurfaceWaterData),
        nurseryStockOut:       nsoSnap.docs.map(d => d.data() as NurseryStockOut),
        capa:                  capaSnap.docs.map(d => d.data() as CapaData),
        complianceMatrix:      cmSnap.docs.map(d => d.data() as ComplianceMatrixData),
        incidents:             incSnap.docs.map(d => d.data() as IncidentData),
        regulatory:            regSnap.docs.map(d => d.data() as RegulatoryWatchData),
        amdTreatments:         amdSnap.docs.map(d => d.data() as AmdTreatmentData),
        airEmissions:          airSnap.docs.map(d => d.data() as AirEmissionData),
        topsoilErosions:       topsoilSnap.docs.map(d => d.data() as TopsoilErosionData),
        biodiversity:          bioSnap.docs.map(d => d.data() as BiodiversityData),
        iadlRisks:             iadlSnap.docs.map(d => d.data() as IadlRiskData),
        properRkab:            properSnap ? properSnap.docs.map(d => d.data() as ProperRkabData) : [],
      }, user?.company);

      setXlsxExportStatus('success');
      setTimeout(() => setXlsxExportStatus('idle'), 3000);
    } catch (err) {
      console.error('Gagal export XLSX:', err);
      setXlsxExportStatus('error');
      setTimeout(() => setXlsxExportStatus('idle'), 4000);
    } finally {
      setIsExportingXLSX(false);
    }
  };

  return (
    <div id="settings-modals-container">
      {/* BACKUP, RESTORE & EXPORT MODAL */}
      {syncModalOpen && (
        <div id="google-sync-settings-modal" className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in text-text-mid">
          <div className="glass-panel border border-border-neon rounded-3xl p-6 w-full max-w-3xl shadow-2xl space-y-5 text-left animate-slide-up max-h-[92vh] overflow-y-auto">

            <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Database className="text-neon-cyan h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-hi font-heading">
                  Backup Terenkripsi (AES-256-GCM), Restore &amp; Ekspor Data
                </h3>
              </div>
              <button
                id="sync-modal-close"
                onClick={() => setSyncModalOpen(false)}
                className="p-1.5 hover:bg-bg-2 rounded-lg text-text-low hover:text-text-hi transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {!canManageBackups ? (
              <div className="p-5 rounded-2xl bg-neon-red/10 border border-neon-red/35 text-xs space-y-2 text-center">
                <AlertTriangle className="h-7 w-7 text-neon-red mx-auto" />
                <p className="font-bold text-neon-red">Akses Dibatasi Khusus Administrator (Rank 5)</p>
                <p className="text-text-mid leading-relaxed">
                  Operasi cadangan penuh dan pemulihan database (Backup/Restore) mencakup <strong>{BACKUP_INVENTORY.length} koleksi</strong> dan hanya diizinkan bagi akun dengan peran <strong>Admin</strong>.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleExportXLSX}
                    disabled={isExportingXLSX}
                    className="neon-btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs cursor-pointer disabled:opacity-50"
                  >
                    <Download size={14} />
                    {isExportingXLSX ? 'Menyiapkan Excel...' : 'Ekspor Workbook Excel (.xlsx) Read-Only'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-sans">
                <div className="p-3.5 rounded-2xl bg-neon-cyan/5 border border-neon-cyan/30 space-y-1 text-[11px] text-text-mid">
                  <p className="font-bold text-neon-cyan flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Enkripsi End-to-End AES-256-GCM + PBKDF2-SHA256 (210.000 Iterasi) &amp; Checksum SHA-256
                  </p>
                  <p>
                    Mencakup seluruh <strong>{BACKUP_INVENTORY.length} koleksi</strong> operasional &amp; konfigurasi.
                    Koleksi dikecualikan saat restore demi keamanan: <code className="font-mono text-text-hi">{RESTORE_EXCLUDED_COLLECTIONS.join(', ')}</code>.
                    Kata sandi enkripsi tidak pernah disimpan dalam file backup.
                  </p>
                </div>

                {/* Akun Google status/login panel */}
                <div className="p-4 bg-bg-1/60 border border-border-neon rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-low uppercase tracking-wider">Koneksi Google Drive</span>
                    <span className={`text-[10px] font-mono bg-bg-0/80 border border-border-subtle px-2.5 py-0.5 rounded-full ${googleUser ? 'text-neon-green' : 'text-text-mid'}`}>
                      {googleUser ? 'Terkoneksi Drive' : 'Offline / Lokal Tersedia'}
                    </span>
                  </div>

                  {googleUser ? (
                    <div className="flex items-center justify-between p-3 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        {googleUser.photoURL ? (
                          <img src={googleUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-neon-cyan/35" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold uppercase text-xs">
                            {googleUser.email?.slice(0, 1) || 'G'}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-text-hi text-xs">{googleUser.displayName || 'Administrator'}</p>
                          <p className="text-[10px] text-text-mid font-mono">{googleUser.email}</p>
                        </div>
                      </div>
                      <button
                        id="google-disconnect-btn"
                        type="button"
                        onClick={handleGoogleLogout}
                        className="px-2.5 py-1.5 bg-neon-red/15 hover:bg-neon-red/25 text-neon-red border border-neon-red/35 font-semibold rounded-lg text-[10.5px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <LogOut className="h-3 w-3" />
                        Putuskan Akun
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-between py-2 px-3 bg-bg-0/60 border border-border-subtle rounded-xl gap-3">
                      <p className="text-[11px] text-text-mid leading-relaxed">
                        Anda tetap dapat membuat/memulihkan berkas <code className="font-mono">.dembackup.json</code> terenkripsi secara lokal tanpa Google Drive, atau hubungkan Google Drive untuk cloud backup.
                      </p>
                      <button
                        id="google-signin-btn-modal"
                        type="button"
                        disabled={isGAuthLoading}
                        onClick={handleGoogleLogin}
                        className="shrink-0 inline-flex items-center justify-center gap-2 bg-bg-1 hover:bg-bg-2 border border-border-neon text-text-hi px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {isGAuthLoading ? 'Menyambungkan...' : 'Hubungkan Google Drive'}
                      </button>
                    </div>
                  )}
                  {authError && (
                    <p className="text-neon-red text-[11px] font-mono">{authError}</p>
                  )}
                </div>

                {/* EXPORT & IMPORT CONTROLS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* EXPORT CADANGAN BARU */}
                  <div className="p-4 bg-bg-1/50 border border-border-neon rounded-2xl space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Upload className="h-4 w-4 text-neon-green" />
                      <h4 className="font-bold text-text-hi font-heading">Buat Cadangan Terenkripsi Baru</h4>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-text-low">
                        Kata Sandi Enkripsi Backup (Min. 8 Karakter) <span className="text-neon-red">*</span>
                      </label>
                      <input
                        id="backup-passphrase-input"
                        type="password"
                        placeholder="Masukkan kata sandi kuat..."
                        value={backupPassphrase}
                        onChange={(e) => setBackupPassphrase(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-text-low">Nama File (Opsional)</label>
                      <input
                        id="custom-filename-backup"
                        type="text"
                        placeholder="Contoh: dem_dkb_mei_2026"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        className="w-full px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        id="export-local-encrypted-btn"
                        type="button"
                        onClick={handleExportLocalEncrypted}
                        disabled={isExportingLocal}
                        className="neon-btn-primary w-full py-2 text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {isExportingLocal ? 'Mengenkripsi...' : 'Unduh Backup Terenkripsi (.dembackup.json)'}
                      </button>

                      {googleUser && (
                        <button
                          id="export-backup-btn"
                          type="button"
                          onClick={handleExportBackupDrive}
                          disabled={backupActionStatus.status === 'syncing'}
                          className="w-full py-2 bg-bg-2 hover:border-neon-cyan border border-border-neon text-text-hi text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {backupActionStatus.status === 'syncing' ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Mengunggah...
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5 text-neon-cyan" />
                              Unggah Terenkripsi ke Google Drive
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {backupActionStatus.message && (
                      <p className={`p-2 rounded-lg text-[10px] font-mono leading-relaxed border ${
                        backupActionStatus.status === 'error' ? 'bg-neon-red/10 border-neon-red/35 text-neon-red' :
                        backupActionStatus.status === 'synced' ? 'bg-neon-green/10 border-neon-green/35 text-neon-green' :
                        'bg-bg-0/60 border-border-subtle text-text-mid'
                      }`}>
                        {backupActionStatus.message}
                      </p>
                    )}

                    {/* Export Workbook Excel */}
                    <div className="pt-3 border-t border-border-subtle">
                      <button
                        onClick={handleExportXLSX}
                        disabled={isExportingXLSX}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-bg-0/80 hover:bg-bg-2 border border-border-subtle text-text-hi rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <Download size={13} />
                        {isExportingXLSX ? 'Mengambil data Firestore...' : 'Export Laporan Mentah ke Excel (.xlsx)'}
                      </button>
                      {xlsxExportStatus === 'success' && (
                        <p className="mt-1.5 text-[10px] text-neon-green text-center font-bold flex items-center justify-center gap-1">
                          <Check size={12} /> File Excel berhasil diunduh.
                        </p>
                      )}
                      {xlsxExportStatus === 'error' && (
                        <p className="mt-1.5 text-[10px] text-neon-red text-center font-bold">
                          Gagal mengekspor Excel.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* LISTING & UNGGAH FILE RESTORE */}
                  <div className="p-4 bg-bg-1/50 border border-border-neon rounded-2xl flex flex-col space-y-3">
                    <div className="flex items-center gap-1.5">
                      <FileJson className="h-4 w-4 text-neon-cyan" />
                      <h4 className="font-bold text-text-hi font-heading">Pilih Sumber Pemulihan (Restore)</h4>
                    </div>

                    <label className="block p-3 border border-dashed border-border-neon rounded-xl bg-bg-0/50 hover:border-neon-cyan cursor-pointer text-center space-y-1">
                      <span className="text-[11px] font-bold text-neon-cyan block">Muat File Cadangan Lokal (.dembackup.json / .json)</span>
                      <span className="text-[10px] text-text-low block">File akan didekripsi &amp; diperiksa pratinjaunya sebelum menulis ke database.</span>
                      <input
                        type="file"
                        accept=".json,.dembackup.json"
                        onChange={handleLocalFileUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="flex-1 overflow-y-auto max-h-[180px] space-y-2 pr-1 custom-scrollbar">
                      {!googleUser ? (
                        <div className="py-4 text-center text-[10px] text-text-low">
                          Hubungkan Google Drive untuk melihat daftar cadangan cloud.
                        </div>
                      ) : isLoadingBackups ? (
                        <div className="flex flex-col items-center justify-center py-6 text-text-low gap-1.5">
                          <RefreshCw className="h-4 w-4 animate-spin text-neon-cyan" />
                          <span className="text-[10px]">Memindai Google Drive...</span>
                        </div>
                      ) : backupFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-text-low text-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-[10px] font-semibold">Tidak ada file cadangan di Drive</span>
                        </div>
                      ) : (
                        backupFiles.map((file) => (
                          <div key={file.id} className="p-2.5 border border-border-subtle rounded-xl flex items-center justify-between text-[11px] hover:border-border-neon bg-bg-0/60">
                            <div className="space-y-0.5 max-w-[70%]">
                              <p className="font-semibold text-text-hi truncate font-mono" title={file.name}>{file.name}</p>
                              <div className="flex items-center gap-1 text-[9.5px] text-text-low font-mono tabular-nums">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(file.createdTime).toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                            <button
                              id={`restore-btn-${file.id}`}
                              onClick={() => openDriveRestoreModal(file)}
                              className="px-2.5 py-1.5 bg-neon-cyan/15 hover:bg-neon-cyan/25 text-neon-cyan border border-neon-cyan/40 rounded-lg font-bold text-[10px] cursor-pointer"
                            >
                              Pratinjau
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3.5 border-t border-border-subtle text-[10px]">
              <span className="text-text-low font-mono">
                Penyimpanan Utama: Cloud Firestore (Non-atomic multi-batch restore)
              </span>
              <button
                id="sync-modal-footer-close"
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neon-cyan hover:text-text-hi transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRE-RESTORE PREVIEW & EXECUTION DIALOG */}
      {selectedSourceLabel && (
        <div id="restore-confirm-dialog" className="fixed inset-0 bg-bg-0/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-fade-in text-text-mid">
          <div className="glass-panel border border-border-neon rounded-3xl p-6 w-full max-w-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-text-hi font-heading font-bold uppercase tracking-wider text-sm">
                  Pratinjau &amp; Verifikasi Pemulihan Database
                </h3>
                <p className="text-[11px] font-mono text-text-low">{selectedSourceLabel}</p>
              </div>
              <button
                disabled={!!restoreProgress}
                onClick={() => { setSelectedSourceLabel(null); setRawBackupObj(null); setRestoreErrorReset(); }}
                className="p-1.5 hover:bg-bg-2 rounded-lg text-text-low hover:text-text-hi cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!previewSummary && !restoreReport && (
              <div className="space-y-3 text-xs">
                <p className="text-text-mid">
                  Masukkan kata sandi enkripsi untuk mendekripsi berkas cadangan AES-256-GCM dan memverifikasi integritas SHA-256 sebelum melihat pratinjau.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Kata sandi dekripsi..."
                    value={restorePassphrase}
                    onChange={(e) => setRestorePassphrase(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleDecryptPreview}
                    disabled={!rawBackupObj || !!restoreProgress}
                    className="neon-btn-primary px-4 py-2 rounded-xl text-xs cursor-pointer disabled:opacity-50"
                  >
                    Dekripsi &amp; Verifikasi
                  </button>
                </div>
              </div>
            )}

            {previewError && (
              <div className="p-3 rounded-xl bg-neon-red/10 border border-neon-red/35 text-neon-red text-xs font-mono">
                {previewError}
              </div>
            )}

            {restoreProgress && (
              <div className="p-3 bg-bg-0/70 border border-border-neon rounded-xl font-mono text-xs text-neon-cyan flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{restoreProgress}</span>
              </div>
            )}

            {previewSummary && !restoreReport && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-bg-1/70 border border-border-neon rounded-2xl">
                  <div>
                    <span className="text-[10px] text-text-low block">Versi Skema</span>
                    <span className="font-mono font-bold text-text-hi">{previewSummary.schemaVersion}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-low block">Tanggal Backup</span>
                    <span className="font-mono text-text-hi">{new Date(previewSummary.backupDate).toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-low block">Integritas &amp; Enkripsi</span>
                    <span className="font-mono font-bold text-neon-green">
                      {previewSummary.encrypted ? 'AES-256-GCM · ' : ''}SHA-256 OK
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-low block">Total Dokumen</span>
                    <span className="font-mono font-bold text-neon-cyan">{previewSummary.totalDocs} dok ({previewSummary.collectionCount} kol)</span>
                  </div>
                </div>

                {/* Per-collection preview counts */}
                <div className="max-h-40 overflow-y-auto rounded-xl border border-border-subtle bg-bg-0/60 p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10.5px]">
                  {previewSummary.collections.map((c) => (
                    <div key={c.key} className="flex justify-between px-2 py-1 rounded bg-bg-1/50 border border-border-subtle">
                      <span className="truncate text-text-mid">{c.key}</span>
                      <span className="font-mono font-bold text-text-hi tabular-nums">{c.count}</span>
                    </div>
                  ))}
                </div>

                {/* Mode selector */}
                <div className="space-y-2 p-3 rounded-2xl border border-border-neon bg-bg-1/40">
                  <span className="text-[10px] font-bold uppercase text-text-low block">Mode Pemulihan:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className={`p-3 rounded-xl border cursor-pointer ${restoreMode === 'merge' ? 'border-neon-cyan bg-neon-cyan/10' : 'border-border-subtle bg-bg-0/50'}`}>
                      <div className="flex items-center gap-2 font-bold text-text-hi">
                        <input
                          type="radio"
                          checked={restoreMode === 'merge'}
                          onChange={() => { setRestoreMode('merge'); setReplaceConfirmed(false); }}
                        />
                        Merge / Gabung (Aman)
                      </div>
                      <p className="text-[10px] text-text-mid mt-1">
                        Menulis ulang / memperbarui dokumen sesuai backup tanpa menghapus dokumen tambahan yang tidak ada di backup.
                      </p>
                    </label>
                    <label className={`p-3 rounded-xl border cursor-pointer ${restoreMode === 'replace' ? 'border-neon-red bg-neon-red/10' : 'border-border-subtle bg-bg-0/50'}`}>
                      <div className="flex items-center gap-2 font-bold text-neon-red">
                        <input
                          type="radio"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                        />
                        Replace Penuh (Destruktif)
                      </div>
                      <p className="text-[10px] text-text-mid mt-1">
                        Menimpa koleksi backup dan menghapus dokumen di Firestore yang tidak ada pada berkas cadangan ini.
                      </p>
                    </label>
                  </div>

                  {restoreMode === 'replace' && (
                    <div className="mt-2 p-3 rounded-xl bg-neon-red/10 border border-neon-red/35 space-y-2">
                      <label className="flex items-start gap-2 cursor-pointer text-[11px] text-text-hi font-semibold">
                        <input
                          type="checkbox"
                          checked={replaceConfirmed}
                          onChange={(e) => setReplaceConfirmed(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          Saya Administrator menyadari bahwa mode Replace akan MENGHAPUS dokumen yang tidak ada di berkas backup, dan pemulihan berjalan bertahap per-batch (non-atomic lintas-koleksi).
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    disabled={!!restoreProgress}
                    onClick={() => { setSelectedSourceLabel(null); setRawBackupObj(null); setRestoreErrorReset(); }}
                    className="w-1/3 py-2.5 bg-bg-1 hover:bg-bg-2 border border-border-subtle rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    id="restore-submit-btn"
                    type="button"
                    disabled={!!restoreProgress || (restoreMode === 'replace' && !replaceConfirmed)}
                    onClick={handleExecuteRestore}
                    className={`${restoreMode === 'replace' ? 'neon-btn-danger' : 'neon-btn-primary'} flex-1 py-2.5 rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50`}
                  >
                    Jalankan Pemulihan ({restoreMode.toUpperCase()})
                  </button>
                </div>
              </div>
            )}

            {restoreReport && (
              <div className="space-y-4 text-xs">
                <div className={`p-4 rounded-2xl border space-y-2 ${restoreReport.failedCount === 0 ? 'bg-neon-green/10 border-neon-green/35' : 'bg-neon-amber/10 border-neon-amber/35'}`}>
                  <div className="flex items-center gap-2 font-bold text-text-hi">
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                    Laporan Hasil Pemulihan ({restoreReport.mode.toUpperCase()})
                  </div>
                  <p className="text-[11px] text-text-mid">{restoreReport.atomicityNote}</p>
                  <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                    <div className="p-2 rounded bg-bg-0/60">Ditulis: <strong className="text-neon-green">{restoreReport.successCount}</strong></div>
                    <div className="p-2 rounded bg-bg-0/60">Dihapus: <strong className="text-neon-amber">{restoreReport.deletedCount}</strong></div>
                    <div className="p-2 rounded bg-bg-0/60">Gagal: <strong className="text-neon-red">{restoreReport.failedCount}</strong></div>
                    <div className="p-2 rounded bg-bg-0/60">Dilewati: <strong className="text-text-hi">{restoreReport.skippedCount}</strong></div>
                  </div>
                  {restoreReport.unprocessedCollections.length > 0 && (
                    <p className="text-[11px] text-neon-red font-mono">
                      Koleksi gagal/tidak lengkap: {restoreReport.unprocessedCollections.join(', ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="neon-btn-primary w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Muat Ulang Aplikasi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {userModalOpen && (
        <div id="user-profile-modal" className="fixed inset-0 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4 z-55 animate-fade-in text-text-mid">
          <div className="glass-panel border border-border-neon rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 text-left animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <User className="text-neon-cyan h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-hi font-heading">Kelola Kredensial Pengawas</h3>
              </div>
              <button
                id="user-modal-close"
                onClick={() => setUserModalOpen(false)}
                className="p-1.5 hover:bg-bg-2 rounded-lg text-text-low hover:text-text-hi transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-text-low font-bold mb-1.5 uppercase font-sans">Nama Lengkap Pengawas</label>
                <input
                  id="user-field-name"
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  className="w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-text-low font-bold mb-1.5 uppercase font-sans">Email Kepatuhan Lapangan</label>
                <input
                  id="user-field-email"
                  type="email"
                  disabled
                  value={uEmail}
                  className="w-full px-3 py-2 text-xs opacity-70 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-text-low font-bold mb-1.5 uppercase font-sans">Nama Perusahaan / Konsesi Tambang</label>
                <input
                  id="user-field-company"
                  type="text"
                  required
                  value={uCompany}
                  onChange={(e) => setUCompany(e.target.value)}
                  className="w-full px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-text-low font-bold mb-1.5 uppercase font-sans">Jabatan Sektor</label>
                <input
                  id="user-field-role"
                  type="text"
                  disabled
                  value={uRole}
                  className="w-full px-3 py-2 text-xs opacity-70 cursor-not-allowed"
                />
              </div>

              {userSaveError && (
                <p className="text-neon-red text-[10px] font-mono leading-relaxed bg-neon-red/10 p-2 rounded-xl border border-neon-red/30">{userSaveError}</p>
              )}
            </div>

            {canManageRoles && (
              <div className="mt-6 pt-4 border-t border-border-subtle">
                <h4 className="text-[11px] text-text-low font-bold mb-3 uppercase font-sans flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-neon-cyan" />
                  Manajemen Akses (Admin)
                </h4>
                {roleUpdateMsg && (
                  <div className={`p-2 rounded-lg text-[10px] font-semibold mb-2 border ${roleUpdateMsg.type === 'success' ? 'bg-neon-green/10 border-neon-green/35 text-neon-green' : 'bg-neon-red/10 border-neon-red/35 text-neon-red'}`}>
                    {roleUpdateMsg.msg}
                  </div>
                )}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {isLoadingRoles ? (
                    <p className="text-[10px] text-text-low animate-pulse">Memuat daftar akses...</p>
                  ) : rolesList.length === 0 ? (
                    <p className="text-[10px] text-text-low">Belum ada data akses lain.</p>
                  ) : (
                    rolesList.map((item, idx) => {
                      const isSelf = item.email.toLowerCase() === (auth.currentUser?.email || user?.email || '').toLowerCase();
                      const canEditTarget = !isSelf && (isStrictAdminUser || (MANAGER_ASSIGNABLE_ROLES as readonly string[]).includes(item.role));
                      return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-bg-0/60 border border-border-subtle rounded-xl">
                        <span className="text-[10px] font-mono text-text-mid">
                          {item.email}{isSelf ? ' (Anda)' : ''}
                        </span>
                        <select
                          disabled={!canEditTarget}
                          className="text-[10px] font-bold uppercase px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          value={item.role}
                          onChange={(e) => handleRoleChange(item.email, e.target.value)}
                        >
                          {assignableRoles.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-4 flex-wrap gap-2">
              {onLogout ? (
                <button
                  id="user-modal-logout-btn"
                  type="button"
                  onClick={() => {
                    setUserModalOpen(false);
                    onLogout();
                  }}
                  className="px-3.5 py-2 bg-neon-red/15 hover:bg-neon-red/25 text-neon-red border border-neon-red/35 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Keluar / Logout
                </button>
              ) : <div />}

              <div className="flex items-center gap-3">
                <button
                  id="user-modal-cancel"
                  type="button"
                  disabled={isSavingUser}
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-mid hover:text-text-hi cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="user-modal-save"
                  type="button"
                  disabled={isSavingUser}
                  onClick={handleUserSave}
                  className="neon-btn-primary px-5 py-2.5 disabled:opacity-50 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  {isSavingUser ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Perbarui Profil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
