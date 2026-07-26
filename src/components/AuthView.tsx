/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Building2, 
  Briefcase, 
  MapPin, 
  CreditCard, 
  Camera, 
  ArrowLeft,
  KeyRound,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { useAuth, RegisterUserData } from '../services/authService';
import DivaLogo from './DivaLogo';
import { triggerToast } from '../utils/errorHandler';

type AuthMode = 'login' | 'register' | 'registered_success' | 'reset_password';

export default function AuthView() {
  const { 
    user, 
    profile, 
    loginWithGoogle, 
    loginWithEmail,
    registerUser,
    sendPasswordReset,
    logout,
    refreshProfile,
    loading,
    authError
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('KPL / Environmental');
  const [position, setPosition] = useState('Staff');
  const [site, setSite] = useState('Site Muara Teweh');
  const [nik, setNik] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Status message state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validation function for registration
  const validateRegisterForm = (): string | null => {
    if (!fullName.trim() || fullName.trim().length < 3) {
      return "Nama Lengkap minimal 3 karakter.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      return "Alamat email tidak valid.";
    }
    if (password.length < 8) {
      return "Password minimal 8 karakter.";
    }
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(password)) {
      return "Password harus mengandung minimal satu huruf besar, satu huruf kecil, dan satu angka.";
    }
    if (password !== confirmPassword) {
      return "Konfirmasi password tidak cocok dengan password.";
    }
    const phoneRegex = /^\d+$/;
    if (!phone.trim() || !phoneRegex.test(phone.trim())) {
      return "Nomor HP hanya boleh berisi angka.";
    }
    if (!department.trim()) {
      return "Departemen wajib dipilih / diisi.";
    }
    if (!position.trim()) {
      return "Jabatan wajib dipilih / diisi.";
    }
    if (!site.trim()) {
      return "Lokasi Site wajib dipilih / diisi.";
    }
    return null;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg("Email dan password wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await loginWithEmail(loginEmail, loginPassword);
    } catch (e: any) {
      console.error(e);
      let msg = "Gagal masuk. Periksa kembali email dan password Anda.";
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        msg = "Email atau password yang Anda masukkan salah.";
      } else if (e.code === 'auth/operation-not-allowed') {
        msg = "Metode autentikasi Email/Password belum diaktifkan di Firebase Console. Silakan gunakan tombol 'Masuk Dengan Akun Google' di bawah.";
      } else if (e.message) {
        msg = e.message;
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      await loginWithGoogle();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Gagal masuk menggunakan Akun Google.");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const validationError = validateRegisterForm();
    if (validationError) {
      setErrorMsg(validationError);
      triggerToast(validationError, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload: RegisterUserData = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        department,
        position,
        site,
        nik: nik.trim() || undefined,
        photoURL: photoURL.trim() || undefined
      };
      await registerUser(payload);
      setMode('registered_success');
    } catch (e: any) {
      console.error("Registration error:", e);

      let detailMessage = e?.message || "Gagal mendaftarkan akun baru.";
      if (e?.code === 'auth/email-already-in-use') {
        detailMessage = "Email ini sudah terdaftar. Silakan gunakan email lain atau Login.";
      } else if (e?.code === 'auth/operation-not-allowed') {
        detailMessage = "Metode pendaftaran Email/Password belum diaktifkan di Firebase Console. Silakan gunakan 'Masuk Dengan Akun Google'.";
      } else if (e?.code === 'auth/weak-password') {
        detailMessage = "Password terlalu lemah. Gunakan minimal 8 karakter.";
      } else if (e?.code === 'auth/invalid-email') {
        detailMessage = "Format email tidak valid.";
      }

      setErrorMsg(detailMessage);
      triggerToast(detailMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!resetEmail.trim()) {
      setErrorMsg("Masukkan email Anda.");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(resetEmail);
      setResetSent(true);
      setSuccessMsg(`Tautan reset password telah dikirimkan ke email ${resetEmail}.`);
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/operation-not-allowed') {
        setErrorMsg("Fitur reset password via Email belum diaktifkan di Firebase Console. Silakan gunakan 'Masuk Dengan Akun Google'.");
      } else {
        setErrorMsg(e.message || "Gagal mengirimkan email reset password.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setResetSent(false);
    if (user) {
      await logout();
    }
    setMode('login');
  };

  // CHECK LOGGED IN USER PENDING OR REJECTED OR DISABLED STATUS
  const isPendingUser = user && (profile?.status === 'Pending' || profile?.isApproved === false || !profile);
  const isRejectedUser = user && profile?.status === 'Rejected';
  const isDisabledUser = user && (profile?.status === 'Disabled' || profile?.isActive === false);

  return (
    <div 
      id="auth-view-container"
      className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[140px] pointer-events-none" />

      {/* Main Glass Card Container */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-10 w-full max-w-xl shadow-2xl space-y-6 relative z-10 backdrop-blur-md">
        
        {/* Brand Header */}
        <div className="text-center space-y-3 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center p-2 bg-slate-900/50 rounded-2xl border border-slate-700/50">
            <DivaLogo variant="full" size={60} />
          </div>
          <p className="text-[11px] font-mono tracking-widest text-emerald-400 font-semibold uppercase">
            Enterprise Environmental Management System (EEMS)
          </p>
        </div>

        {(errorMsg || authError) && (
          <div className="p-3.5 bg-red-500/15 border border-red-500/30 rounded-xl text-center text-xs text-red-400 font-medium leading-relaxed flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg || authError}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-300 font-medium leading-relaxed flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STATE 1: PENDING / REJECTED / DISABLED FOR LOGGED IN USER */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Memverifikasi Enclave Autentikasi...</p>
          </div>
        ) : isPendingUser ? (
          /* MENUNGGU PERSETUJUAN ADMINISTRATOR SCREEN */
          <div className="space-y-6 text-center animate-fade-in py-2">
            <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Registration Successful</h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                Your account is awaiting administrator approval.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-left text-xs space-y-2 text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Status:</span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pending
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold text-slate-200">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role:</span>
                <span className="text-slate-200">{profile?.role || 'User'}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-medium">
              Please contact the system administrator.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={refreshProfile}
                className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Cek Status Approval
              </button>
              <button
                type="button"
                onClick={handleReturnToLogin}
                className="py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </div>
        ) : isRejectedUser ? (
          /* PENDAFTARAN DITOLAK SCREEN */
          <div className="space-y-6 text-center animate-fade-in py-2">
            <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Pendaftaran Ditolak</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Permohonan akun Anda telah ditolak oleh Administrator.
              </p>
            </div>

            {profile?.rejectReason && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-left text-xs text-red-300 space-y-1">
                <p className="font-semibold text-red-400 text-[11px] uppercase tracking-wider">Alasan Penolakan:</p>
                <p className="leading-relaxed">{profile.rejectReason}</p>
              </div>
            )}

            <button
              onClick={handleReturnToLogin}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>
          </div>
        ) : isDisabledUser ? (
          /* AKUN NONAKTIF SCREEN */
          <div className="space-y-6 text-center animate-fade-in py-2">
            <div className="w-16 h-16 bg-slate-700 border border-slate-600 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-100">Akun Nonaktif</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Akun Anda telah dinonaktifkan oleh Administrator sistem. Silakan hubungi tim K3LH / Super Admin untuk informasi lebih lanjut.
              </p>
            </div>

            <button
              onClick={handleReturnToLogin}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>
          </div>
        ) : mode === 'registered_success' ? (
          /* SUCCESS SCREEN JUST AFTER REGISTERING */
          <div className="space-y-6 text-center animate-fade-in py-2">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-slate-100">Pendaftaran Berhasil</h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                Akun Anda berhasil dibuat. Saat ini akun masih menunggu persetujuan Administrator. Anda akan dapat menggunakan aplikasi setelah akun disetujui.
              </p>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 text-left leading-relaxed">
              <p className="font-semibold mb-1">Catatan Keamanan & Hak Akses:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
                <li>Peran default diawali sebagai <strong className="text-emerald-400">Viewer</strong>.</li>
                <li>Administrator akan meninjau Departemen, Jabatan, dan NIK Anda sebelum memberikan otorisasi penuh.</li>
              </ul>
            </div>

            <button
              onClick={handleReturnToLogin}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </button>
          </div>
        ) : mode === 'reset_password' ? (
          /* RESET PASSWORD FORM */
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-2 text-slate-200">
              <button 
                onClick={() => setMode('login')} 
                className="p-1 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-100">Reset Password</h2>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">
                  Masukkan Alamat Email Terdaftar
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-500 transition-all"
                    placeholder="nama@divaborneo.co.id"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || resetSent}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Kirim Tautan Reset Password
                  </>
                )}
              </button>
            </form>
          </div>
        ) : mode === 'register' ? (
          /* REGISTER FORM */
          <div className="space-y-5 animate-fade-in max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                Pendaftaran Akun Baru
              </h2>
              <button
                onClick={() => setMode('login')}
                className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Sudah punya akun?
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-left">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  Nama Lengkap <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none text-slate-100 placeholder:text-slate-500 transition-all"
                    placeholder="Contoh: Perkasa Utama"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  Email Perusahaan / Resmi <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none text-slate-100 placeholder:text-slate-500 transition-all font-mono"
                    placeholder="nama@divaborneo.co.id"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none text-slate-100 transition-all"
                      placeholder="Min. 8 kar, Aa1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Konfirmasi Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none text-slate-100 transition-all"
                      placeholder="Ulangi password"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & NIK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Nomor HP <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none text-slate-100 placeholder:text-slate-500 transition-all font-mono"
                      placeholder="081234567890"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    NIK / Nomor Induk Karyawan <span className="text-slate-500">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={nik}
                      onChange={(e) => setNik(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none text-slate-100 placeholder:text-slate-500 transition-all font-mono"
                      placeholder="620101..."
                    />
                  </div>
                </div>
              </div>

              {/* Department & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Departemen <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs outline-none text-slate-100 transition-all cursor-pointer font-sans"
                  >
                    <option value="KPL / Environmental">KPL / Environmental</option>
                    <option value="Mining Operations">Mining Operations</option>
                    <option value="Health & Safety (HSE)">Health & Safety (HSE)</option>
                    <option value="Processing Plant">Processing Plant</option>
                    <option value="Maintenance & Asset">Maintenance & Asset</option>
                    <option value="Engineering & Geology">Engineering & Geology</option>
                    <option value="HR & General Affairs">HR & General Affairs</option>
                    <option value="Finance & Supply Chain">Finance & Supply Chain</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                    Jabatan <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs outline-none text-slate-100 transition-all cursor-pointer font-sans"
                  >
                    <option value="General Manager">General Manager</option>
                    <option value="Manager">Manager</option>
                    <option value="Superintendent">Superintendent</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Foreman">Foreman</option>
                    <option value="Operator">Operator</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Staff">Staff / Engineer</option>
                  </select>
                </div>
              </div>

              {/* Site Location */}
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  Lokasi Site Tambang <span className="text-red-400">*</span>
                </label>
                <select
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs outline-none text-slate-100 transition-all cursor-pointer font-sans"
                >
                  <option value="Site Muara Teweh">Site Muara Teweh (Kalteng)</option>
                  <option value="Site Lahat">Site Lahat (Sumsel)</option>
                  <option value="Site Kutai Barat">Site Kutai Barat (Kaltim)</option>
                  <option value="Head Office Jakarta">Head Office Jakarta</option>
                  <option value="Port & Transshipment">Port & Transshipment Terminal</option>
                </select>
              </div>

              {/* Photo URL optional */}
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                  URL Foto Profil <span className="text-slate-500">(Opsional)</span>
                </label>
                <div className="relative">
                  <Camera className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none text-slate-100 placeholder:text-slate-500 transition-all"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    "Daftar Akun Baru"
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* LOGIN FORM */
          <div className="space-y-5 animate-fade-in text-left">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1.5 uppercase tracking-wide">
                  Email Terdaftar
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-500 transition-all font-mono"
                    placeholder="nama@divaborneo.co.id"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] text-slate-300 font-semibold uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('reset_password')}
                    className="text-[11px] text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-100 transition-all"
                    placeholder="Masukkan password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  "Masuk ke Sistem"
                )}
              </button>
            </form>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-700/80 w-full" />
              <span className="bg-slate-800 px-3 text-[10px] text-slate-400 font-mono uppercase tracking-widest absolute">
                atau
              </span>
            </div>

            <button
              id="google-sign-in-btn"
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-slate-900/90 text-slate-100 border border-slate-700 hover:bg-slate-900 font-semibold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2.5 uppercase tracking-wide"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.281 1.206 15.55 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"
                />
              </svg>
              Masuk Dengan Akun Google
            </button>

            {/* REGISTER BUTTON LINK */}
            <div className="pt-3 text-center border-t border-slate-700/60">
              <p className="text-xs text-slate-400">
                Belum memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setMode('register');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline cursor-pointer ml-1 inline-flex items-center gap-1"
                >
                  Daftar
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
