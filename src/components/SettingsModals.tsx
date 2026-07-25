/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GoogleSyncConfig } from '../types';
import { isAdmin } from '../services/permissionService';
import { 
  X, 
  HelpCircle, 
  RefreshCw, 
  User, 
  Cloud, 
  ExternalLink,
  Save,
  LogOut,
  Download,
  Upload,
  Database,
  Calendar,
  AlertTriangle,
  Check,
  Clock,
  HardHat,
  Shield
} from 'lucide-react';
import { auth } from '../utils/firebaseAuth';
import { useAuth } from '../services/authService';
import { backupService, BackupStatus, DriveBackupFile } from '../services/backupService';
import { exportAllDataToXLSX } from '../services/exportService';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseAuth';
import { auditService } from '../services/auditService';
import {
  WastewaterData, RainfallData, NurseryData,
  ReclamationPlan, ReclamationGuarantee,
  WasteIn, WasteOut, EnvironmentalDocument,
  ComplianceCalendarEvent, EnvironmentalCost, SolidWasteData
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
  syncConfig,
  user,
  onRefresh,
  onLogout,
  onBackupStatusChange
}: SettingsModalsProps) {

  const { registerProfile, token: authServiceToken, loginWithGoogle, logout: authLogout, profile } = useAuth();

  // Live Google Auth state
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isGAuthLoading, setIsGAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Export XLSX state
  const [isExportingXLSX, setIsExportingXLSX] = useState(false);
  const [xlsxExportStatus, setXlsxExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Backup state
  const [backupFiles, setBackupFiles] = useState<DriveBackupFile[]>([]);
  const [customFileName, setCustomFileName] = useState('');
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backupActionStatus, setBackupActionStatus] = useState<BackupStatus>({ status: 'idle', lastSynced: null });
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<DriveBackupFile | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);

  // Check Google Auth on mount and modal open
  useEffect(() => {
    if (syncModalOpen) {
      if (authServiceToken && auth.currentUser) {
        setGoogleUser(auth.currentUser);
      } else {
        setGoogleUser(null);
      }
    }
  }, [syncModalOpen, authServiceToken]);

  // Load backups when authenticated
  useEffect(() => {
    const loadBackups = async () => {
      if (authServiceToken && syncModalOpen) {
        setIsLoadingBackups(true);
        try {
          const files = await backupService.getBackupsFromGoogleDrive(authServiceToken);
          setBackupFiles(files);
        } catch (error) {
          console.error("Gagal memuat cadangan dari Drive:", error);
        } finally {
          setIsLoadingBackups(false);
        }
      }
    };
    loadBackups();
  }, [syncModalOpen, authServiceToken]);

  const handleGoogleLogin = async () => {
    setIsGAuthLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      onRefresh();
    } catch (err: any) {
      console.error('Login Google gagal:', err);
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

  const handleExportBackup = async () => {
    if (!authServiceToken) {
      setBackupActionStatus({ status: 'error', lastSynced: null, message: "Akses Token Google tidak tersedia." });
      return;
    }

    try {
      const success = await backupService.exportToGoogleDrive(authServiceToken, customFileName, (status) => {
        setBackupActionStatus(status);
        onBackupStatusChange?.(status);
      });
      if (success) {
        setCustomFileName('');
        onBackupStatusChange?.({ status: 'synced', lastSynced: new Date().toISOString() });
        // Reload list
        const files = await backupService.getBackupsFromGoogleDrive(authServiceToken);
        setBackupFiles(files);
      }
    } catch (err: any) {
      setBackupActionStatus({ status: 'error', lastSynced: null, message: err?.message || "Kesalahan proses cadangan." });
    }
  };

  const handleManualRestore = async (file: DriveBackupFile) => {
    if (!authServiceToken) return;

    setRestoreProgress("Sedang mengunduh file cadangan dari Google Drive...");
    try {
      const backupData = await backupService.importFromGoogleDrive(authServiceToken, file.id);
      if (!backupData) {
        throw new Error("Konten file cadangan tidak ditemukan.");
      }

      setRestoreProgress("Melakukan pemulihan data ke database Firestore...");
      const success = await backupService.restoreBackupToFirestore(backupData);
      if (success) {
        setRestoreProgress("Pemulihan data berhasil diselesaikan!");
        setTimeout(() => {
          setConfirmRestoreFile(null);
          setRestoreProgress(null);
          setSyncModalOpen(false);
          window.location.reload(); // Reload full context
        }, 1500);
      } else {
        throw new Error("Pemulihan database Firestore gagal.");
      }
    } catch (err: any) {
      console.error(err);
      setRestoreProgress(`Pemulihan gagal: ${err?.message || 'Proses terputus.'}`);
      setTimeout(() => {
        setRestoreProgress(null);
      }, 5000);
    }
  };

  // User profile state
  const [uName, setUName] = useState(user?.name || '');
  const [uEmail, setUEmail] = useState(user?.email || '');
  const [uCompany, setUCompany] = useState(user?.company || '');
  const [uRole, setURole] = useState(user?.role || '');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userSaveError, setUserSaveError] = useState<string | null>(null);

  const [rolesList, setRolesList] = useState<{email: string, role: string}[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [roleUpdateMsg, setRoleUpdateMsg] = useState<{type: 'success'|'error', msg: string} | null>(null);

  useEffect(() => {
    if (userModalOpen && isAdmin(profile)) {
      loadRoles();
    }
  }, [userModalOpen, profile]);

  const loadRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const snap = await getDocs(collection(db, 'roles'));
      const list = snap.docs.map(d => ({ email: d.id, role: d.data().level || 'Viewer' }));
      setRolesList(list);
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const handleRoleChange = async (email: string, newRole: string) => {
    setRoleUpdateMsg(null);
    try {
      await setDoc(doc(db, 'roles', email), { level: newRole }, { merge: true });
      await auditService.createLog({
        collection: 'roles',
        recordId: email,
        action: 'update',
        details: `Changed role for ${email} to ${newRole}`
      });
      setRolesList(prev => prev.map(r => r.email === email ? { ...r, role: newRole } : r));
      setRoleUpdateMsg({ type: 'success', msg: `Berhasil mengubah role ${email}` });
      setTimeout(() => setRoleUpdateMsg(null), 3000);
    } catch(e: any) {
      setRoleUpdateMsg({ type: 'error', msg: e.message || 'Gagal mengubah role' });
    }
  };


  // Sync profile edits with initial props changes
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
      await registerProfile(uName, uCompany, uRole);
      setUserModalOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error("Gagal memperbarui profil:", err);
      setUserSaveError(err?.message || 'Isian profil tidak valid.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleExportXLSX = async () => {
    setIsExportingXLSX(true);
    setXlsxExportStatus('idle');
    try {
      // Ambil semua data langsung dari Firestore
      const [wwSnap, rfSnap, nsSnap, rcSnap, wb3Snap, docSnap, costSnap, swSnap] = await Promise.all([
        getDocs(collection(db, 'wastewater')),
        getDocs(collection(db, 'rainfall')),
        getDocs(collection(db, 'nursery')),
        getDocs(collection(db, 'reclamation')),
        getDocs(collection(db, 'waste_b3')),
        getDocs(collection(db, 'documents')),
        getDocs(collection(db, 'costs')),
        getDocs(collection(db, 'solid_waste')),
      ]);

      exportAllDataToXLSX({
        wastewater:           wwSnap.docs.map(d => d.data() as WastewaterData),
        rainfall:             rfSnap.docs.map(d => d.data() as RainfallData),
        nursery:              nsSnap.docs.map(d => d.data() as NurseryData),
        reclamationPlans:     rcSnap.docs.filter(d => d.id.startsWith('RP-')).map(d => d.data() as ReclamationPlan),
        reclamationGuarantees:rcSnap.docs.filter(d => d.id.startsWith('RG-')).map(d => d.data() as ReclamationGuarantee),
        wasteIn:              wb3Snap.docs.filter(d => d.id.startsWith('WI-')).map(d => d.data() as WasteIn),
        wasteOut:             wb3Snap.docs.filter(d => d.id.startsWith('WO-')).map(d => d.data() as WasteOut),
        documents:            docSnap.docs.filter(d => d.id.startsWith('DOC-')).map(d => d.data() as EnvironmentalDocument),
        calendarEvents:       docSnap.docs.filter(d => d.id.startsWith('EV-')).map(d => d.data() as ComplianceCalendarEvent),
        environmentalCosts:   costSnap.docs.map(d => d.data() as EnvironmentalCost),
        solidWaste:           swSnap.docs.map(d => d.data() as SolidWasteData),
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
      {/* GOOGLE DRIVE BACKUP & RESTORE MODAL */}
      {syncModalOpen && (
        <div id="google-sync-settings-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-700">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 text-left animate-slide-up max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Database className="text-teal-600 h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Ekspor/Import Google Drive</h3>
              </div>
              <button 
                id="sync-modal-close"
                onClick={() => setSyncModalOpen(false)} 
                className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <p className="text-slate-500 leading-relaxed">
                Modul ini mengizinkan pencadangan aman seluruh isi database kepatuhan pertambangan pertambangan langsung ke akun **Google Drive** Anda. File cadangan disimpan dalam format struktural JSON terenkripsi dan dapat dipulihkan kapan saja.
              </p>

              {/* Akun Google status/login panel */}
              <div className="p-4 bg-white/60 border border-slate-200/80 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Akses Otoritas Google Drive</span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded text-teal-600">
                    {googleUser ? '🟢 Terkoneksi' : '⚪ Standalone'}
                  </span>
                </div>

                {googleUser ? (
                  <div className="flex items-center justify-between p-3 bg-teal-500/5 border border-teal-500/20 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      {googleUser.photoURL ? (
                        <img src={googleUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-teal-500/20" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-600 font-bold uppercase text-xs">
                          {googleUser.email?.slice(0, 1) || 'G'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-700 text-xs">{googleUser.displayName || 'Pengawas Lapangan'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{googleUser.email}</p>
                      </div>
                    </div>
                    <button
                      id="google-disconnect-btn"
                      type="button"
                      onClick={handleGoogleLogout}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-semibold rounded-lg text-[10.5px] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <LogOut className="h-3 w-3" />
                      Putuskan Akun
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center py-5 bg-white border border-slate-900 rounded-xl text-center gap-3">
                      <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
                        Hubungkan ke Google Drive untuk mengunggah salinan database atau mengunduh cadangan aktif.
                      </p>
                      <button 
                        id="google-signin-btn-modal"
                        type="button"
                        disabled={isGAuthLoading}
                        onClick={handleGoogleLogin}
                        className="inline-flex items-center justify-center gap-2 bg-white hover:bg-white text-slate-900 duration-150 px-4 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                        {isGAuthLoading ? 'Menyambungkan...' : 'Hubungkan dengan Google'}
                      </button>
                    </div>

                    {authError && (
                      <p className="text-rose-600 text-[11px] text-center font-mono">{authError}</p>
                    )}

                    {/* OAuth Verification Walkthrough */}
                    <div id="google-auth-error-guide" className="p-3.5 bg-amber-950/40 rounded-2xl border border-amber-800/30 leading-relaxed text-slate-600 text-[11px] space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-600">
                        <HelpCircle className="h-4 w-4 shrink-0 text-amber-500" />
                        <span>Panduan Menyelesaikan Kendala Login Google (Testing Mode)</span>
                      </div>
                      <p className="text-slate-600">
                        Jika Anda diarahkan ke layar error <strong>"Access Blocked"</strong>, hal ini terjadi karena Google Client ID Anda dideploy dalam status <strong>"Testing"</strong>. Silakan mendaftarkan akun email pendukung Anda ke Console:
                      </p>
                      <ul className="list-decimal pl-4 space-y-1 text-slate-500">
                        <li>Buka akun <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-semibold">Google Cloud Console</a>.</li>
                        <li>Pergi ke menu <strong>APIs & Services</strong> &gt; <strong>OAuth consent screen</strong>.</li>
                        <li>Scroll ke bagian <strong>Test users</strong> dan klik tombol <strong>+ ADD USERS</strong>.</li>
                        <li>Tambahkan email Anda, klik simpan, lalu coba Hubungkan kembali!</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {googleUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* EXPORT CADANGAN BARU */}
                  <div className="p-4 bg-white/40 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Upload className="h-4 w-4 text-emerald-600" />
                      <h4 className="font-bold text-slate-700">Buat Cadangan Baru</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Kirim seluruh data audit, kualitas air limah, curah hujan, nursery, dokumen, dan anggaran opex/capex ke Google Drive.
                    </p>
                    
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Nama File (Opsional)</label>
                      <input
                        id="custom-filename-backup"
                        type="text"
                        placeholder="Contoh: cadangan_mei_2026"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-700"
                      />
                    </div>

                    <button
                      id="export-backup-btn"
                      onClick={handleExportBackup}
                      disabled={backupActionStatus.status === 'syncing'}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-white disabled:text-slate-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {backupActionStatus.status === 'syncing' ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          Ekspor ke Google Drive
                        </>
                      )}
                    </button>

                    {/* Tombol Export Spreadsheet */}
                    <div className="mt-4 pt-4 border-t border-slate-300/50">
                      <p className="text-xs text-slate-500 mb-3 font-mono uppercase tracking-widest font-bold">
                        Export Data Mentah
                      </p>
                      <button
                        onClick={handleExportXLSX}
                        disabled={isExportingXLSX}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl
                          bg-emerald-600 hover:bg-emerald-600 disabled:bg-slate-200 disabled:cursor-not-allowed
                          text-slate-900 font-semibold text-xs transition-all duration-200
                          border border-emerald-500/40 shadow-lg shadow-emerald-900/20 cursor-pointer"
                      >
                        {isExportingXLSX ? (
                          <>
                            <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Mengambil data dari Firestore...
                          </>
                        ) : (
                          <>
                            <Download size={14} />
                            Export Semua Data ke Excel (.xlsx)
                          </>
                        )}
                      </button>

                      {xlsxExportStatus === 'success' && (
                        <p className="mt-2 text-[11px] text-emerald-600 text-center flex items-center justify-center gap-1.5 font-bold">
                          <Check size={12} /> File berhasil diunduh ke perangkat Anda.
                        </p>
                      )}
                      {xlsxExportStatus === 'error' && (
                        <p className="mt-2 text-[11px] text-rose-600 text-center flex items-center justify-center gap-1.5 font-bold">
                          <AlertTriangle size={12} /> Gagal mengekspor. Cek koneksi dan coba lagi.
                        </p>
                      )}

                      <p className="mt-2 text-[10px] text-slate-500 text-center leading-relaxed font-sans">
                        Mengunduh 10 sheet: Kualitas Air, Curah Hujan, Nursery, Reklamasi,
                        Jaminan, Limbah B3, Dokumen, Agenda, dan Biaya Lingkungan.
                      </p>
                    </div>

                    {backupActionStatus.message && (
                      <p className={`p-2 rounded text-[10px] font-mono leading-relaxed ${
                        backupActionStatus.status === 'error' ? 'bg-rose-50/80 border border-rose-200 text-rose-600' :
                        backupActionStatus.status === 'synced' ? 'bg-emerald-950/40 border border-emerald-800/30 text-emerald-300' :
                        'bg-white border border-slate-200 text-slate-600'
                      }`}>
                        {backupActionStatus.message}
                      </p>
                    )}
                  </div>

                  {/* LISTING & RESTORE CADANGAN */}
                  <div className="p-4 bg-white/40 border border-slate-200 rounded-2xl flex flex-col space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Download className="h-4 w-4 text-cyan-600" />
                      <h4 className="font-bold text-slate-700">Dua Puluh Sembilan Cadangan Terakhir</h4>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[160px] space-y-2 pr-1 custom-scrollbar">
                      {isLoadingBackups ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-1.5">
                          <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
                          <span className="text-[10px]">Memindai Google Drive...</span>
                        </div>
                      ) : backupFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-center gap-1 max-w-xs mx-auto">
                          <Clock className="h-4 w-4 text-slate-600" />
                          <span className="text-[10px] font-semibold text-slate-500">Tidak ada file cadangan</span>
                          <p className="text-[9.5px] leading-relaxed text-slate-500">Folder 'DEM system Backups' di Google Drive kosong atau belum dibuat.</p>
                        </div>
                      ) : (
                        backupFiles.map((file) => (
                          <div key={file.id} className="p-2 border border-slate-200/80 rounded-lg flex items-center justify-between text-[11px] hover:border-slate-300 transition-colors bg-white">
                            <div className="space-y-0.5 max-w-[70%]">
                              <p className="font-semibold text-slate-700 truncate font-mono" title={file.name}>{file.name}</p>
                              <div className="flex items-center gap-1 text-[9.5px] text-slate-500 font-mono">
                                <Calendar className="h-3 w-3 text-slate-500" />
                                <span>{new Date(file.createdTime).toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                            <button
                              id={`restore-btn-${file.id}`}
                              onClick={() => setConfirmRestoreFile(file)}
                              className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-900 rounded font-bold text-[10px] transition-colors cursor-pointer"
                            >
                              Pulihkan
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3.5 border-t border-slate-200 text-[10px]">
              <span className="text-slate-500 font-mono">
                Penyimpanan Utama: Firestore (Cloud Database)
              </span>
              <button
                id="sync-modal-footer-close"
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-teal-600 hover:text-teal-300 transform duration-100 cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION PANEL (IFRAME/ZERO PROTECTION INTERCEPTOR) */}
      {confirmRestoreFile && (
        <div id="restore-confirm-dialog" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in text-slate-700">
          <div className="bg-white border border-rose-800/60 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 text-center">
            <div className="flex justify-center flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-slate-800 font-bold uppercase tracking-wider text-sm mt-1">Konfirmasi Pemulihan Database</h3>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed text-left">
              <p className="bg-rose-500/5 p-3 rounded-2xl text-rose-600 border border-rose-950 text-center font-semibold">
                ⚠️ PERINGATAN: Seluruh data lokal dan cloud (Firestore) aktif di konsesi saat ini akan ditimpa secara permanen!
              </p>
              <p className="text-slate-600">
                Aplikasi akan memuat isi dokumen JSON dari Google Drive dan menulis ulang data pada koleksi berikut:
              </p>
              <ul className="list-disc pl-4.5 space-y-1 text-slate-500 text-[11px] font-mono">
                <li>wastewater (Kualitas Air Limbah)</li>
                <li>rainfall (Curah Hujan)</li>
                <li>nursery & reclamation (Sektor Pemulihan & Pembibitan)</li>
                <li>waste_b3 (Log Inbound / Outbound Limbah)</li>
                <li>documents & calendar (AMDAL & Kalender Kepatuhan)</li>
                <li>costs (Opex & Capex)</li>
              </ul>
              <div className="p-3 bg-white border border-slate-900 rounded-xl space-y-1 font-mono text-[10.5px]">
                <p className="text-slate-500">File Sumber di Google Drive:</p>
                <p className="font-bold text-slate-700">{confirmRestoreFile.name}</p>
                <p className="text-[9.5px] text-slate-500">ID: {confirmRestoreFile.id}</p>
              </div>
            </div>

            {restoreProgress && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl font-mono text-[11px] text-teal-600 text-center flex items-center justify-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>{restoreProgress}</span>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                id="restore-cancel-btn"
                disabled={!!restoreProgress}
                onClick={() => setConfirmRestoreFile(null)}
                className="flex-1 py-2.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded-xl font-bold font-sans text-xs cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                id="restore-submit-btn"
                disabled={!!restoreProgress}
                onClick={() => handleManualRestore(confirmRestoreFile)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-slate-900 rounded-xl font-bold font-sans text-xs cursor-pointer text-center"
              >
                Lanjutkan Pemulihan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {userModalOpen && (
        <div id="user-profile-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in text-slate-700">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 text-left animate-slide-up">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <User className="text-teal-600 h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-sans">Kelola Kredensial Pengawas</h3>
              </div>
              <button 
                id="user-modal-close"
                onClick={() => setUserModalOpen(false)} 
                className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Nama Lengkap Pengawas</label>
                <input
                  id="user-field-name"
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Email Kepatuhan Lapangan</label>
                <input
                  id="user-field-email"
                  type="email"
                  disabled
                  value={uEmail}
                  className="w-full bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2 text-xs outline-none text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Nama Perusahaan / Konsesi Tambang</label>
                <input
                  id="user-field-company"
                  type="text"
                  required
                  value={uCompany}
                  onChange={(e) => setUCompany(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase font-sans">Jabatan Sektor</label>
                <input
                  id="user-field-role"
                  type="text"
                  required
                  value={uRole}
                  onChange={(e) => setURole(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                />
              </div>

              {userSaveError && (
                <p className="text-rose-600 text-[10px] font-mono leading-relaxed bg-rose-50 p-2 rounded-xl border border-rose-200">{userSaveError}</p>
              )}
            </div>
            
            {/* ROLE MANAGEMENT (Admin Only UI Mockup) */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h4 className="text-[11px] text-slate-500 font-bold mb-3 uppercase font-sans flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                Manajemen Akses (Admin)
              </h4>
              {roleUpdateMsg && (
                <div className={`p-2 rounded text-[10px] font-semibold mb-2 ${roleUpdateMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {roleUpdateMsg.msg}
                </div>
              )}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {isLoadingRoles ? (
                  <p className="text-[10px] text-slate-500 animate-pulse">Memuat daftar akses...</p>
                ) : rolesList.length === 0 ? (
                  <p className="text-[10px] text-slate-500">Belum ada data akses lain.</p>
                ) : (
                  rolesList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className="text-[10px] font-mono text-slate-600">{item.email}</span>
                      <select 
                        className="text-[10px] font-bold uppercase bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-teal-500 text-slate-700"
                        value={item.role}
                        onChange={(e) => handleRoleChange(item.email, e.target.value)}
                      >
                        <option value="Viewer">Viewer</option>
                        <option value="Operator">Operator</option>
                        <option value="Superintendent">Superintendent</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4 flex-wrap gap-2">
              {onLogout ? (
                <button
                  id="user-modal-logout-btn"
                  type="button"
                  onClick={() => {
                    setUserModalOpen(false);
                    onLogout();
                  }}
                  className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
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
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="user-modal-save"
                  type="button"
                  disabled={isSavingUser}
                  onClick={handleUserSave}
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition-all"
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
