/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HardHat, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { saveUserProfile } from '../utils/googleSync';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [name, setName] = useState('Aditya Perkasa');
  const [email, setEmail] = useState('environmentdivakencanaborneo@gmail.com');
  const [company, setCompany] = useState('PT Diva Kencana Borneo');
  const [role, setRole] = useState('Environmental Site Manager');
  const [password, setPassword] = useState('password123');

  // Real-time basic validator
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setValidationError("Format alamat email tidak valid!");
      return;
    }
    if (password.length < 6) {
      setValidationError("Kata sandi harus minimal 6 karakter.");
      return;
    }

    setValidationError('');
    // Store profile configuration
    saveUserProfile({
      name,
      email,
      company,
      role
    });

    onLoginSuccess();
  };

  return (
    <div 
      id="auth-view-container"
      className="min-h-screen bg-[#050811] flex items-center justify-center p-4 relative overflow-hidden text-slate-200 select-none font-sans"
    >
      {/* Decorative ambient blurred spots for that premium visual flavor */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none glow-bubble-1" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none glow-bubble-2" />

      {/* Main Glass card container */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 w-full max-w-md shadow-2xl space-y-7 relative z-10 text-left">
        
        {/* Upper Brand Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-xl shadow-emerald-500/20 mx-auto">
            <HardHat className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              ENV-COAL <span className="text-emerald-500 font-extrabold">PRO</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-1 font-mono uppercase tracking-widest text-emerald-400">PERTAMBANGAN BATUBARA</p>
          </div>
        </div>

        {/* Real-time validators */}
        {validationError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-xs text-red-400 font-semibold">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Sign Up extra descriptors */}
          {!isLogin && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide font-mono">Nama Lengkap Anda</label>
                <input
                  id="auth-field-signup-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-600 transition-all"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide font-mono">Perusahaan Pertambangan</label>
                <input
                  id="auth-field-signup-company"
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-600 transition-all"
                  placeholder="Contoh: PT Diva Kencana Borneo"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide font-mono">Jabatan Sektor</label>
                <input
                  id="auth-field-signup-role"
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-600 transition-all"
                  placeholder="Contoh: Environmental Site Supervisor"
                />
              </div>
            </div>
          )}

          {/* Email field */}
          <div>
            <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide font-mono">Email Instansi</label>
            <input
              id="auth-field-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-600 transition-all"
              placeholder="operator@perusahaan.com"
            />
          </div>

          {/* Password field */}
          <div>
            <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide font-mono">Kata Sandi (6+ Karakter)</label>
            <div className="relative">
              <input
                id="auth-field-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 rounded-xl pl-4 pr-11 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-600 transition-all"
                placeholder="••••••••"
              />
              <button
                id="auth-field-password-toggle"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-emerald-400 cursor-pointer transition-colors"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/15 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-widest font-sans"
          >
            {isLogin ? (
              <>
                <LogIn className="h-4 w-4" />
                Masuk ke Area Panel
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Daftarkan & Inisialisasi Akun
              </>
            )}
          </button>
        </form>

        {/* Transition link toggle */}
        <div className="pt-4 border-t border-white/5 text-center">
          <button
            id="auth-toggle-view-btn"
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-slate-450 hover:text-white transition-colors cursor-pointer"
          >
            {isLogin 
              ? "Belum memiliki hak akses? Daftar Akun Baru" 
              : "Sudah terdaftar? Silakan Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
}
