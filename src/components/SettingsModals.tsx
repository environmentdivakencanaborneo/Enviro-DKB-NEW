/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GoogleSyncConfig } from '../types';
import { 
  X, 
  HelpCircle, 
  RefreshCw, 
  User, 
  CloudCheck, 
  ExternalLink,
  Save,
  HardHat,
  LogOut,
  Globe2
} from 'lucide-react';
import { saveSyncConfig, saveUserProfile, runGoogleSync, getSyncConfig, syncLocalDataToFirestore } from '../utils/googleSync';
import { auth, googleSignIn, googleSignOut, getAccessToken } from '../utils/firebaseAuth';

interface SettingsModalsProps {
  syncModalOpen: boolean;
  setSyncModalOpen: (open: boolean) => void;
  userModalOpen: boolean;
  setUserModalOpen: (open: boolean) => void;
  syncConfig: GoogleSyncConfig;
  user: any;
  onRefresh: () => void;
}

export default function SettingsModals({
  syncModalOpen,
  setSyncModalOpen,
  userModalOpen,
  setUserModalOpen,
  syncConfig,
  user,
  onRefresh
}: SettingsModalsProps) {

  // Sync state
  const [clientId, setClientId] = useState(syncConfig.clientId || '');
  const [sheetId, setSheetId] = useState(syncConfig.spreadsheetId || '');
  const [folderId, setFolderId] = useState(syncConfig.folderId || '');
  const [simOauthStatus, setSimOauthStatus] = useState(syncConfig.isAuthenticated);

  // Live Google Auth state
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isGAuthLoading, setIsGAuthLoading] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  useEffect(() => {
    const checkGAuth = async () => {
      const token = await getAccessToken();
      if (token && auth.currentUser) {
        setGoogleUser(auth.currentUser);
      } else {
        setGoogleUser(null);
      }
    };
    if (syncModalOpen) {
      checkGAuth();
    }
  }, [syncModalOpen]);

  const handleGoogleLogin = async () => {
    setIsGAuthLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        saveSyncConfig({ isAuthenticated: true });
        await syncLocalDataToFirestore();
        onRefresh();
      }
    } catch (err) {
      console.error('Login Google gagal:', err);
    } finally {
      setIsGAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      saveSyncConfig({ isAuthenticated: false });
      onRefresh();
    } catch (err) {
      console.error('Logout Google gagal:', err);
    }
  };

  const handleManualSyncInsideModal = async () => {
    setSyncingNow(true);
    try {
      const success = await runGoogleSync();
      if (success) {
        const freshConfig = getSyncConfig();
        setSheetId(freshConfig.spreadsheetId);
        setFolderId(freshConfig.folderId);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingNow(false);
    }
  };

  // User state
  const [uName, setUName] = useState(user?.name || '');
  const [uEmail, setUEmail] = useState(user?.email || '');
  const [uCompany, setUCompany] = useState(user?.company || '');
  const [uRole, setURole] = useState(user?.role || '');

  const handleSyncSave = () => {
    saveSyncConfig({
      clientId,
      spreadsheetId: sheetId,
      folderId,
      isAuthenticated: !!googleUser || (!!clientId && !!sheetId)
    });
    setSyncModalOpen(false);
    onRefresh();
  };

  const handleUserSave = () => {
    saveUserProfile({
      name: uName,
      email: uEmail,
      company: uCompany,
      role: uRole
    });
    setUserModalOpen(false);
    onRefresh();
  };

  return (
    <div id="settings-modals-container">
      {/* GOOGLE SYNC CONFIG MODAL */}
      {syncModalOpen && (
        <div id="google-sync-settings-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in text-slate-200">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5 text-left animate-slide-up">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CloudCheck className="text-teal-400 h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">Integrasi Google Drive & Google Sheets</h3>
              </div>
              <button 
                id="sync-modal-close"
                onClick={() => setSyncModalOpen(false)} 
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-400 font-sans">
              <p>
                Aplikasi ini mendukung sinkronisasi database real-time ke **Google Sheets** (setiap modul memiliki sheet tersendiri) serta backup laporan digital PDF langsung ke **Google Drive**.
              </p>

              {/* Live Google Auth Area */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Akses Akun Google Workspace</span>
                  <span className="text-[10px] font-mono">
                    {googleUser ? '🔴 Terkoneksi' : '⚪ Standalone'}
                  </span>
                </div>

                {googleUser ? (
                  <div className="flex items-center justify-between p-3 bg-teal-500/5 border border-teal-500/10 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      {googleUser.photoURL ? (
                        <img src={googleUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-teal-500/20" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold uppercase text-xs">
                          {googleUser.email?.slice(0, 1) || 'G'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-slate-200 text-xs">{googleUser.displayName || 'Akun Pengawas'}</p>
                        <p className="text-[10.5px] text-slate-400 font-mono">{googleUser.email}</p>
                      </div>
                    </div>
                    <button
                      id="google-disconnect-btn"
                      type="button"
                      onClick={handleGoogleLogout}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-lg text-[10.5px] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <LogOut className="h-3 w-3" />
                      Keluar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 bg-slate-950/40 border border-slate-900 rounded-xl text-center gap-3">
                    <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                      Hubungkan ke Google Drive & Sheets untuk mengaktifkan sinkronisasi awan otomatis.
                    </p>
                    {/* Official Sign in with Google Button layout */}
                    <button 
                      id="google-signin-btn-modal"
                      type="button"
                      disabled={isGAuthLoading}
                      onClick={handleGoogleLogin}
                      className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 duration-150 px-4 py-2 rounded-xl text-xs font-bold font-sans cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      {isGAuthLoading ? 'Mengubungkan...' : 'Hubungkan Akun Google'}
                    </button>
                  </div>
                )}
              </div>

              {googleUser && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-bold mb-1.5 uppercase font-sans flex items-center justify-between">
                      <span>Google Spreadsheet ID (Database)</span>
                      <span className="text-[10px] text-slate-500 normal-case font-normal">(Kosongkan untuk membuat spreadsheet baru otomatis)</span>
                    </label>
                    <input
                      id="sync-field-sheet-id"
                      type="text"
                      placeholder="Contoh: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                      value={sheetId}
                      onChange={(e) => setSheetId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-bold mb-1.5 uppercase font-sans flex items-center justify-between">
                      <span>Google Drive Folder ID (Backup)</span>
                      <span className="text-[10px] text-slate-500 normal-case font-normal">(Opsional)</span>
                    </label>
                    <input
                      id="sync-field-folder-id"
                      type="text"
                      placeholder="Masukkan Folder ID Drive (Opsional)"
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      id="sync-manual-now-modal"
                      type="button"
                      disabled={syncingNow}
                      onClick={handleManualSyncInsideModal}
                      className="w-full py-2.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 text-teal-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncingNow ? 'animate-spin' : ''}`} />
                      {syncingNow ? 'Sedang Sinkronisasi...' : 'Sinkronisasikan Sekarang'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3.5 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono">
                Status: {googleUser ? '🟢 Terkoneksi Awan' : '🔴 Penyimpanan Lokal'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  id="sync-modal-cancel"
                  type="button"
                  onClick={() => setSyncModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="sync-modal-save"
                  type="button"
                  onClick={handleSyncSave}
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan Konfigurasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {userModalOpen && (
        <div id="user-profile-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fade-in text-slate-200">
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 text-left animate-slide-up">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <User className="text-teal-400 h-5 w-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-sans">Kelola Kredensial Pengawas</h3>
              </div>
              <button 
                id="user-modal-close"
                onClick={() => setUserModalOpen(false)} 
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Nama Lengkap Pengawas</label>
                <input
                  id="user-field-name"
                  type="text"
                  required
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Email Kepatuhan Mandiri</label>
                <input
                  id="user-field-email"
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Nama Perusahaan / Konsesi Tambang</label>
                <input
                  id="user-field-company"
                  type="text"
                  required
                  value={uCompany}
                  onChange={(e) => setUCompany(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase font-sans">Jabatan Sektor</label>
                <input
                  id="user-field-role"
                  type="text"
                  required
                  value={uRole}
                  onChange={(e) => setURole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
              <button
                id="user-modal-cancel"
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                id="user-modal-save"
                type="button"
                onClick={handleUserSave}
                className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                Perbarui Profil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
