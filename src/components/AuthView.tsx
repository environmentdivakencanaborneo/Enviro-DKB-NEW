/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HardHat } from 'lucide-react';
import { useAuth } from '../services/authService';
import DivaLogo from './DivaLogo';

export default function AuthView() {
  const { 
    user, 
    isNewUser, 
    loginWithGoogle, 
    registerProfile, 
    logout,
    loading 
  } = useAuth();

  // Onboarding profile fields
  const [name, setName] = useState(user?.displayName || '');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('Viewer'); // Default role to least-privilege
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    setErrorMsg('');
    try {
      await loginWithGoogle();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Gagal masuk menggunakan Akun Google.");
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!name.trim()) {
      setErrorMsg("Nama Lengkap wajib diisi.");
      return;
    }
    if (!company.trim()) {
      setErrorMsg("Nama Perusahaan wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      await registerProfile(name.trim(), company.trim(), role);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Gagal mendaftarkan profil.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      id="auth-view-container"
      className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden text-slate-700 select-none font-sans"
    >
      {/* Ambient gradient spots */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none glow-bubble-1" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none glow-bubble-2" />

      {/* Auth Glass Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 w-full max-w-md shadow-2xl space-y-7 relative z-10 text-left">
        
        {/* Brand Header */}
        <div className="text-center space-y-4 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center">
            <DivaLogo variant="full" size={64} />
          </div>
          <p className="text-[10px] text-slate-500 font-semibold font-mono uppercase tracking-widest text-emerald-600/80">
            DIVA ENVIRO MONITOR SYSTEM
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-xs text-red-600 font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* LOADING SHIM */}
        {loading && !user ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-mono">Menyiapkan Enclave Autentikasi...</p>
          </div>
        ) : !user ? (
          /* AUTHENTICATION VIEW */
          <div className="space-y-6">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed text-center">
              <span className="font-semibold text-emerald-600">Google Single Sign-On:</span> Untuk menjamin integritas audit log dan sistem RBAC tambang, setiap pengguna wajib login menggunakan Akun Google resmi.
            </div>

            <button
              id="google-sign-in-btn"
              onClick={handleSignIn}
              className="w-full py-3.5 bg-white text-slate-900 border border-slate-300 hover:bg-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2.5 uppercase tracking-wide"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.206 15.55 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"
                />
              </svg>
              Masuk Dengan Akun Google
            </button>
          </div>
        ) : isNewUser ? (
          /* ONBOARDING REGISTRATION VIEW */
          <div className="space-y-5 animate-fade-in">
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 text-[11.5px] text-emerald-300 leading-relaxed text-center">
              <span className="font-bold">Inisialisasi Profil Baru:</span> Akun Google Anda berhasil diautentikasi. Silakan isi data profil dan jabatan untuk mendaftarkan akun ke basis data instansi.
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wide font-mono">Alamat Email (Terkunci)</label>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full bg-black/5 border border-black/10 rounded-xl px-4 py-3 text-xs outline-none text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wide font-mono">Nama Lengkap</label>
                <input
                  id="onboard-field-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/5 border border-black/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 placeholder:text-slate-600 transition-all"
                  placeholder="Contoh: Aditya Perkasa"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wide font-mono">Konsesi Perusahaan</label>
                <input
                  id="onboard-field-company"
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-black/5 border border-black/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 placeholder:text-slate-600 transition-all"
                  placeholder="Contoh: PT Diva Kencana Borneo"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wide font-mono">Peran Hak Akses (RBAC)</label>
                <select
                  id="onboard-field-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-black/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs outline-none text-slate-800 transition-all cursor-pointer font-sans"
                >
                  <option value="Viewer">Viewer (Akses Baca Saja)</option>
                  <option value="User">User (Akses Staff)</option>
                  <option value="Supervisor">Supervisor (Akses Mutasi Data)</option>
                  <option value="Admin">Admin (Akses Penuh)</option>
                  <option value="Super Admin">Super Admin (Akses Penuh)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={logout}
                  className="w-1/3 py-3 border border-black/10 hover:bg-black/5 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="onboard-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all font-sans cursor-pointer flex items-center justify-center"
                >
                  {submitting ? (
                    <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : "Simpan Profil Akun"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-xs text-slate-500 mb-3">Profil sedang dipersiapkan...</p>
            <button 
              onClick={logout} 
              className="px-4 py-2 border border-black/10 hover:bg-black/5 rounded-xl text-xs text-slate-600"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
