/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import DivaLogo from '../DivaLogo';
import { APP_NAME, COMPANY_NAME } from '../../constants/app';
import { formatDateLocalIndonesian } from '../../utils/dateUtils';
import { EvidenceSignature } from '../../types';

interface EvidenceShellProps {
  bannerTitle?: string;
  bannerSubtitle?: string;
  documentNo?: string;
  revision?: number;
  issuedAt?: string;
  periodLabel?: string;
  prepared?: EvidenceSignature;
  reviewed?: EvidenceSignature;
  approved?: EvidenceSignature;
  qrCodeUrl?: string;
  verifyToken?: string;
  isCancelled?: boolean;
  cancelReason?: string;
  children: React.ReactNode;
}

export default function EvidenceShell({
  bannerTitle = 'EVIDENCE HARIAN',
  bannerSubtitle = 'PEMANTAUAN AIR LIMBAH TAMBANG',
  documentNo = 'DRAFT',
  revision = 0,
  issuedAt,
  periodLabel,
  prepared,
  reviewed,
  approved,
  qrCodeUrl,
  verifyToken,
  isCancelled = false,
  cancelReason,
  children,
}: EvidenceShellProps) {
  const formattedIssuedDate = issuedAt
    ? formatDateLocalIndonesian(issuedAt.slice(0, 10))
    : '-';

  const hasApprovalCol = approved !== undefined;

  return (
    <div
      className="relative bg-white text-slate-900 mx-auto w-full max-w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none print:m-0 print:w-full print:max-w-none print:min-h-0 p-6 md:p-8 flex flex-col justify-between font-sans text-xs box-border border border-slate-200 print:border-none"
      style={{
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
    >
      {/* Watermark for Cancelled Documents */}
      {isCancelled && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20 select-none overflow-hidden">
          <div className="transform -rotate-45 border-8 border-red-500/30 rounded-3xl px-12 py-6 text-center bg-red-50/20 backdrop-blur-[1px]">
            <span className="text-6xl md:text-8xl font-black text-red-600/30 tracking-widest font-mono">
              DIBATALKAN
            </span>
            {cancelReason && (
              <p className="text-sm font-semibold text-red-700/60 mt-2 max-w-md mx-auto">
                Alasan: {cancelReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top Section */}
      <div className="space-y-4">
        {/* 1. Full-width dark green banner (#14532d) */}
        <div
          className="w-full text-center py-2.5 px-4 text-white rounded-md shadow-sm"
          style={{ backgroundColor: '#14532d' }}
        >
          <h1 className="text-sm md:text-base font-extrabold tracking-wider uppercase">
            {bannerTitle}
          </h1>
          <p className="text-[10px] md:text-xs font-semibold tracking-widest text-emerald-200 uppercase mt-0.5">
            {bannerSubtitle}
          </p>
        </div>

        {/* 2. Header Bar: Logo + Company name + Right bordered meta box */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <DivaLogo variant="icon" size={44} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black tracking-tight text-slate-900 leading-tight">
                PT DIVA KENCANA BORNEO
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Good Energy for a Better Future
              </p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                Site Project: Tabang Coal Mining Operations, Kalimantan Timur
              </p>
            </div>
          </div>

          {/* Right meta box */}
          <div className="border-2 border-slate-800 rounded px-3 py-1.5 min-w-[170px] text-[10px] bg-slate-50/60 font-mono">
            <div className="grid grid-cols-2 gap-x-2 py-0.5">
              <span className="text-slate-500 font-semibold">No. Dok:</span>
              <span className="font-bold text-slate-900 text-right truncate">
                {documentNo}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 py-0.5 border-t border-slate-200">
              <span className="text-slate-500 font-semibold">Revisi:</span>
              <span className="font-bold text-slate-900 text-right">
                Revisi {String(revision ?? 0).padStart(2, '0')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 py-0.5 border-t border-slate-200">
              <span className="text-slate-500 font-semibold">{periodLabel ? 'Periode:' : 'Tgl Terbit:'}</span>
              <span className="font-bold text-slate-900 text-right truncate">
                {periodLabel || formattedIssuedDate}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Main Content (Sections A, B, C, D) */}
        <div className="space-y-4">{children}</div>
      </div>

      {/* Bottom Section: Signatures + Footer */}
      <div className="mt-6 pt-3 border-t border-slate-300 space-y-4 break-inside-avoid">
        {/* Signature Block (3 or 4 columns) */}
        <div className={`grid ${hasApprovalCol ? 'grid-cols-4' : 'grid-cols-3'} gap-3 border border-slate-300 rounded p-3 bg-slate-50/40 text-center text-[10px]`}>
          {/* Column 1: Disiapkan oleh */}
          <div className="flex flex-col justify-between items-center h-32 px-1">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[8.5px]">
              Disiapkan Oleh:
            </span>
            <div className="flex-1 flex items-center justify-center my-1 w-full">
              {prepared?.signatureDataUrl ? (
                <img
                  src={prepared.signatureDataUrl}
                  alt={`Tanda tangan ${prepared.name}`}
                  className="max-h-14 max-w-full object-contain"
                />
              ) : (
                <div className="w-3/4 border-b border-dashed border-slate-400 py-4 text-[8.5px] text-slate-400 italic">
                  (belum ditandatangani)
                </div>
              )}
            </div>
            <div className="w-full border-t border-slate-300 pt-1">
              <p className="font-extrabold text-slate-900 uppercase truncate text-[9.5px]">
                {prepared?.name || 'Petugas Sampling'}
              </p>
              <p className="text-[8.5px] text-slate-600 truncate">
                {prepared?.position || 'Operator Lingkungan'}
              </p>
              <p className="text-[8px] text-slate-400 font-mono mt-0.5 truncate">
                {prepared?.signedAt || '-'}
              </p>
            </div>
          </div>

          {/* Column 2: Diperiksa oleh */}
          <div className="flex flex-col justify-between items-center h-32 px-1 border-l border-slate-300">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[8.5px]">
              Diperiksa Oleh:
            </span>
            <div className="flex-1 flex items-center justify-center my-1 w-full">
              {reviewed?.signatureDataUrl ? (
                <img
                  src={reviewed.signatureDataUrl}
                  alt={`Tanda tangan ${reviewed.name}`}
                  className="max-h-14 max-w-full object-contain"
                />
              ) : (
                <div className="w-3/4 border-b border-dashed border-slate-400 py-4 text-[8.5px] text-slate-400 italic">
                  (belum ditandatangani)
                </div>
              )}
            </div>
            <div className="w-full border-t border-slate-300 pt-1">
              <p className="font-extrabold text-slate-900 uppercase truncate text-[9.5px]">
                {reviewed?.name || 'Pemeriksa / Pengawas'}
              </p>
              <p className="text-[8.5px] text-slate-600 truncate">
                {reviewed?.position || 'Environment Superintendent'}
              </p>
              <p className="text-[8px] text-slate-400 font-mono mt-0.5 truncate">
                {reviewed?.signedAt || '-'}
              </p>
            </div>
          </div>

          {/* Column 3 (Optional): Disetujui oleh */}
          {hasApprovalCol && (
            <div className="flex flex-col justify-between items-center h-32 px-1 border-l border-slate-300">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-[8.5px]">
                Disetujui Oleh:
              </span>
              <div className="flex-1 flex items-center justify-center my-1 w-full">
                {approved?.signatureDataUrl ? (
                  <img
                    src={approved.signatureDataUrl}
                    alt={`Tanda tangan ${approved.name}`}
                    className="max-h-14 max-w-full object-contain"
                  />
                ) : (
                  <div className="w-3/4 border-b border-dashed border-slate-400 py-4 text-[8.5px] text-slate-400 italic">
                    (belum ditandatangani)
                  </div>
                )}
              </div>
              <div className="w-full border-t border-slate-300 pt-1">
                <p className="font-extrabold text-slate-900 uppercase truncate text-[9.5px]">
                  {approved?.name || 'Kepala Teknik Tambang'}
                </p>
                <p className="text-[8.5px] text-slate-600 truncate">
                  {approved?.position || 'Environment Manager'}
                </p>
                <p className="text-[8px] text-slate-400 font-mono mt-0.5 truncate">
                  {approved?.signedAt || '-'}
                </p>
              </div>
            </div>
          )}

          {/* QR Code Dokumen Column */}
          <div className="flex flex-col justify-between items-center h-32 px-1 border-l border-slate-300">
            <span className="font-bold text-slate-600 uppercase tracking-wider text-[8.5px]">
              Verifikasi Dokumen:
            </span>
            <div className="flex-1 flex items-center justify-center my-1">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code Verifikasi Dokumen"
                  className="w-14 h-14 object-contain rounded border border-slate-200 p-0.5 bg-white"
                />
              ) : (
                <div className="w-14 h-14 bg-slate-100 rounded border border-slate-300 flex items-center justify-center text-[7.5px] text-slate-400 text-center p-1">
                  QR Code Draft
                </div>
              )}
            </div>
            <div className="w-full border-t border-slate-300 pt-1">
              <p className="text-[7.5px] text-slate-500 font-medium leading-tight">
                Pindai untuk verifikasi keaslian dokumen
              </p>
              {verifyToken && (
                <p className="text-[7px] font-mono text-slate-400 mt-0.5 truncate">
                  ID: {verifyToken.slice(0, 8)}...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center Small Footer */}
        <div className="text-center text-[8.5px] text-slate-500 pt-2 border-t border-slate-200">
          <p>
            Dokumen ini dihasilkan secara otomatis oleh sistem {APP_NAME} {COMPANY_NAME} dan merupakan bagian dari evidence kepatuhan ISO 14001:2015 &amp; PROPER.
          </p>
        </div>
      </div>
    </div>
  );
}
