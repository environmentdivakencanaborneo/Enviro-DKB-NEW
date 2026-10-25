/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { EvidenceVerification } from '../../types';
import { evidenceService } from '../../services/evidenceService';
import DivaLogo from '../DivaLogo';
import { formatDateLocalIndonesian } from '../../utils/dateUtils';
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  ArrowLeft,
  Calendar,
  MapPin,
  Lock
} from 'lucide-react';

interface PublicVerifyViewProps {
  token: string;
  onBackToApp?: () => void;
}

export default function PublicVerifyView({ token, onBackToApp }: PublicVerifyViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EvidenceVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    evidenceService.verifyToken(token).then((res) => {
      if (!isMounted) return;
      if (res) {
        setData(res);
        setError(null);
      } else {
        setData(null);
        setError('Dokumen tidak ditemukan dalam arsip resmi PT Diva Kencana Borneo.');
      }
      setLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      setData(null);
      setError(err?.message || 'Gagal memverifikasi dokumen');
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleReturn = () => {
    if (onBackToApp) {
      onBackToApp();
    } else {
      window.location.hash = '';
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="p-6 bg-slate-900 text-white text-center border-b border-slate-800">
          <div className="flex justify-center mb-3">
            <DivaLogo variant="icon" size={52} />
          </div>
          <h1 className="text-sm md:text-base font-extrabold uppercase tracking-wide">
            PT Diva Kencana Borneo
          </h1>
          <p className="text-[11px] text-emerald-400 font-mono tracking-widest uppercase mt-0.5">
            Layanan Verifikasi Publik Dokumen Lingkungan
          </p>
        </div>

        {/* Verification Status Banner */}
        <div className="p-6 md:p-8 space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500 font-mono">
                Memvalidasi tanda tangan kriptografi dokumen...
              </p>
            </div>
          ) : error || !data ? (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Dokumen Tidak Sah atau Tidak Ditemukan
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-sm mx-auto">
                  {error || 'Kode verifikasi tidak sesuai dengan dokumen resmi yang terdaftar.'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 font-mono text-[11px]">
                Token: {token}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Authenticity Badge */}
              <div
                className={`p-4 rounded-2xl border text-center ${
                  data.status === 'Dibatalkan'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2 font-black text-sm md:text-base uppercase tracking-wide">
                  {data.status === 'Dibatalkan' ? (
                    <>
                      <XCircle className="w-5 h-5 text-red-600" />
                      Dokumen Telah Dibatalkan
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Dokumen Resmi Terverifikasi
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Arsip resmi Environmental Management System (ISO 14001:2015)
                </p>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                <div className="grid grid-cols-2 p-3 bg-slate-50/50">
                  <span className="text-slate-500 font-medium">Nomor Dokumen:</span>
                  <span className="font-bold text-slate-900 text-right font-mono">
                    {data.documentNo}
                  </span>
                </div>

                <div className="grid grid-cols-2 p-3">
                  <span className="text-slate-500 font-medium">Jenis Dokumen:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {data.type === 'daily' ? 'Evidence Harian Air Limbah' : 'Evidence Bulanan (Rekapitulasi)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 p-3 bg-slate-50/50">
                  <span className="text-slate-500 font-medium">Titik Sampling:</span>
                  <span className="font-bold text-slate-900 text-right font-mono">
                    {data.locationCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 p-3">
                  <span className="text-slate-500 font-medium">Tanggal Diterbitkan:</span>
                  <span className="font-medium text-slate-900 text-right">
                    {formatDateLocalIndonesian(data.issuedAt.slice(0, 10))}
                  </span>
                </div>

                <div className="grid grid-cols-2 p-3 bg-slate-50/50">
                  <span className="text-slate-500 font-medium">Hasil Kepatuhan:</span>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                        data.overall === 'MEMENUHI'
                          ? 'bg-emerald-100 text-emerald-800'
                          : data.overall === 'BELUM ADA DATA'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {data.overall}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 p-3">
                  <span className="text-slate-500 font-medium">Status Pengesahan:</span>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      data.status === 'Disetujui'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : data.status === 'Diperiksa'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {data.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 p-3 bg-slate-50/50">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Hash SHA-256:
                  </span>
                  <span className="font-mono text-slate-600 text-right text-[11px]">
                    {data.hashPrefix}...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleReturn}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Aplikasi Utama
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Sistem Verifikasi Digital Terpadu &bull; ISO 14001:2015 Clause 9.1
        </div>
      </div>
    </div>
  );
}
