/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  EvidenceReport, 
  DailyEvidenceSnapshot, 
  WastewaterData, 
  WastewaterPhoto 
} from '../../types';
import EvidenceShell from './EvidenceShell';
import { formatDateLocalIndonesian } from '../../utils/dateUtils';
import { buildDailyEvidence, DEBIT_STATUS_LABEL } from '../../utils/evidenceCalc';
import { generateQrDataUrl } from '../../utils/qr';
import { waterQualityService } from '../../services/dbService';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Image as ImageIcon 
} from 'lucide-react';

interface DailyEvidenceDocumentProps {
  report?: EvidenceReport | null;
  currentRecord?: WastewaterData | null;
  locationName?: string;
  locationCode?: string;
  preloadedPhoto?: WastewaterPhoto | null;
}

export default function DailyEvidenceDocument({
  report,
  currentRecord,
  locationName = 'KPL Tambang Blok Utara',
  locationCode = 'KPL-01',
  preloadedPhoto,
}: DailyEvidenceDocumentProps) {
  const [photoData, setPhotoData] = useState<WastewaterPhoto | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Use snapshot if document has been published (not Draft), otherwise compute live from currentRecord
  const isPublished = Boolean(report && report.status !== 'Draft');
  
  const snapshot: DailyEvidenceSnapshot = isPublished && report?.snapshot
    ? (report.snapshot as DailyEvidenceSnapshot)
    : (() => {
        const rec = currentRecord || ({} as WastewaterData);
        const evalRes = buildDailyEvidence(rec, {
          locationCode: rec.locationCode || locationCode,
          locationName: locationName,
          date: rec.date,
        });

        return {
          recordId: rec.id || '',
          date: rec.date || '',
          locationCode: rec.locationCode || locationCode,
          locationName: locationName,
          locationFullName: `${locationName} (${rec.locationCode || locationCode})`,
          officer: rec.officer || '-',
          weather: rec.weather || 'Cerah',
          wastewaterSource: rec.wastewaterSource || 'Settling Pond Outlet',
          sampleTime: rec.sampleTime || '08:00',
          monitoringType: rec.monitoringType || 'Harian',
          params: evalRes.params,
          overall: evalRes.overall,
          failedParams: evalRes.failedParams,
          conclusionText: evalRes.conclusionText,
          standardsBasis: evalRes.standardsBasis,
          followUpAction: report?.followUpAction,
          hasPhoto: Boolean(rec.hasPhoto),
        };
      })();

  // Lazy-load photo (or use preloadedPhoto if provided)
  useEffect(() => {
    if (preloadedPhoto !== undefined) {
      setPhotoData(preloadedPhoto);
      return;
    }
    let isMounted = true;
    const wwId = report?.wastewaterId || snapshot.recordId || currentRecord?.id;
    if (wwId) {
      waterQualityService.getPhoto(wwId).then((p) => {
        if (isMounted && p) {
          setPhotoData(p);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [preloadedPhoto, report?.wastewaterId, snapshot.recordId, currentRecord?.id]);

  // Generate QR Code URL
  useEffect(() => {
    let isMounted = true;
    const token = report?.verifyToken;
    if (token) {
      const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify/${token}`;
      generateQrDataUrl(verifyUrl).then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      });
    } else {
      generateQrDataUrl(`${window.location.origin}${window.location.pathname}#/verify/preview-draft`).then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [report?.verifyToken]);

  const activePhoto = photoData;
  const isOverallPassed = snapshot.overall === 'MEMENUHI';

  return (
    <div className="evidence-print-root">
      <EvidenceShell
        bannerTitle="EVIDENCE HARIAN"
        bannerSubtitle="PEMANTAUAN AIR LIMBAH TAMBANG"
        documentNo={report?.documentNo || 'DRAFT'}
        revision={report?.revision ?? 0}
        issuedAt={report?.issuedAt || undefined}
        prepared={report?.signatures.prepared}
        reviewed={report?.signatures.reviewed}
        qrCodeUrl={qrCodeDataUrl}
        verifyToken={report?.verifyToken}
        isCancelled={report?.status === 'Dibatalkan'}
        cancelReason={report?.cancellationReason}
      >
        {/* BAGIAN A: DATA SAMPLING */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
            <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">
              A. DATA SAMPLING LAPANGAN
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Metode: In-situ Real-Time Monitoring
            </span>
          </div>

          <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[10.5px]">
            <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Tanggal Sampling:</span>
              <span className="font-bold text-slate-900 text-right">
                {formatDateLocalIndonesian(snapshot.date)}
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Jam Pengambilan:</span>
              <span className="font-bold text-slate-900 text-right font-mono">
                {snapshot.sampleTime ? `${snapshot.sampleTime} WITA` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Lokasi / Titik:</span>
              <span className="font-bold text-slate-900 text-right">
                {snapshot.locationName} ({snapshot.locationCode})
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Kondisi Cuaca:</span>
              <span className="font-bold text-slate-900 text-right">
                {snapshot.weather || 'Cerah'}
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Sumber Air Limbah:</span>
              <span className="font-bold text-slate-900 text-right">
                {snapshot.wastewaterSource || 'Settling Pond Outlet'}
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Petugas Pengambil:</span>
              <span className="font-bold text-slate-900 text-right">
                {snapshot.officer || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* BAGIAN B: HASIL PENGUJIAN (IN-SITU) */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
            <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">
              B. HASIL PENGUJIAN KUALITAS AIR LIMBAH (IN-SITU)
            </span>
            <span className="text-[10px] text-slate-500">
              Instrumen: Water Quality Meter Terkalibrasi
            </span>
          </div>

          <table className="w-full text-left text-[10.5px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-300 font-semibold text-[10px]">
                <th className="py-1.5 px-3 w-10 text-center border-r border-slate-200">No.</th>
                <th className="py-1.5 px-3 border-r border-slate-200">Parameter Uji</th>
                <th className="py-1.5 px-3 w-16 text-center border-r border-slate-200">Satuan</th>
                <th className="py-1.5 px-3 w-24 text-right border-r border-slate-200 font-mono">Hasil Pengujian</th>
                <th className="py-1.5 px-3 w-28 text-center border-r border-slate-200">Baku Mutu</th>
                <th className="py-1.5 px-3 w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {snapshot.params.map((p, idx) => {
                const isFailed = p.status === 'tidak_memenuhi';
                const isWarning = p.status === 'mendekati';
                const isDebit = p.key === 'debit';

                return (
                  <tr key={p.key} className={isFailed ? 'bg-red-50/50' : ''}>
                    <td className="py-1.5 px-3 text-center border-r border-slate-200 font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                      {p.label}
                    </td>
                    <td className="py-1.5 px-3 text-center border-r border-slate-200 font-mono text-slate-600">
                      {p.unit || '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right border-r border-slate-200 font-mono font-bold text-slate-900">
                      {p.display}
                    </td>
                    <td className="py-1.5 px-3 text-center border-r border-slate-200 text-slate-700">
                      {p.limitDisplay || '-'}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {isDebit ? (
                        <span className="inline-block px-2 py-0.5 text-[9px] font-semibold rounded bg-slate-100 text-slate-700">
                          {DEBIT_STATUS_LABEL}
                        </span>
                      ) : isFailed ? (
                        <span className="inline-block px-2 py-0.5 text-[9px] font-black rounded bg-red-100 text-red-800 border border-red-300">
                          TIDAK MEMENUHI
                        </span>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            MEMENUHI
                          </span>
                          {isWarning && (
                            <span className="text-[8px] text-amber-700 font-medium">
                              (mendekati batas)
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="bg-slate-50 px-3 py-1 border-t border-slate-200 text-[9px] text-slate-500 italic">
            * Dasar baku mutu: {snapshot.standardsBasis}. Debit dipantau untuk perhitungan beban pencemaran.
          </div>
        </div>

        {/* BAGIAN C: LAMPIRAN FOTO SAMPLING */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
            <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">
              C. LAMPIRAN FOTO SAMPLING &amp; KONDISI OUTLET
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Evidence Geotag &amp; Visual Lapangan
            </span>
          </div>

          <div className="p-3 flex flex-col sm:flex-row items-stretch gap-4">
            {/* Foto di kiri ~60% lebar, maks tinggi 62mm */}
            <div className="w-full sm:w-[60%] h-36 sm:h-40 rounded border border-slate-300 bg-slate-100 overflow-hidden flex items-center justify-center relative shrink-0">
              {activePhoto?.dataUrl ? (
                <img
                  src={activePhoto.dataUrl}
                  alt="Evidence Visual Pengambilan Sampel"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <ImageIcon className="w-8 h-8 stroke-1 mb-1" />
                  <span className="text-[10px] font-semibold text-slate-500">
                    Foto belum dilampirkan
                  </span>
                  <span className="text-[8.5px] text-slate-400 mt-0.5">
                    Unggah foto saat input data harian di modul Pemantauan
                  </span>
                </div>
              )}
            </div>

            {/* Keterangan di kanan */}
            <div className="flex-1 flex flex-col justify-between py-1 text-[10.5px]">
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">
                  Keterangan Dokumentasi:
                </span>
                <p className="text-slate-700 leading-relaxed">
                  Pengambilan sampel di titik {snapshot.wastewaterSource} ({snapshot.locationCode}).
                </p>
                <div className="pt-1 space-y-0.5 text-slate-600 text-[10px]">
                  <p>
                    <span className="font-semibold text-slate-500">Tanggal:</span>{' '}
                    {formatDateLocalIndonesian(snapshot.date)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">Waktu:</span>{' '}
                    <span className="font-mono">{snapshot.sampleTime ? `${snapshot.sampleTime} WITA` : '-'}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">Kondisi Aliran:</span>{' '}
                    Laminar, tanpa lapisan minyak mengapung
                  </p>
                </div>
              </div>

              {activePhoto?.sizeBytes && (
                <p className="text-[8.5px] font-mono text-slate-400 mt-2">
                  Resolusi: {activePhoto.width}x{activePhoto.height} px • Ukuran: {Math.round(activePhoto.sizeBytes / 1024)} KB
                </p>
              )}
            </div>
          </div>
        </div>

        {/* BAGIAN D: KESIMPULAN HARIAN */}
        <div
          className={`border rounded p-3 ${
            isOverallPassed
              ? 'border-emerald-300 bg-emerald-50/40'
              : 'border-red-300 bg-red-50/40'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className="shrink-0 mt-0.5">
              {isOverallPassed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <span className="font-extrabold text-[11px] uppercase tracking-wide block mb-0.5 text-slate-800">
                D. KESIMPULAN KEPATUHAN HARIAN
              </span>
              <p className="text-[10.5px] leading-relaxed text-slate-800">
                {snapshot.conclusionText}
              </p>

              {/* Tindak Lanjut bila TIDAK MEMENUHI */}
              {!isOverallPassed && (
                <div className="mt-2.5 p-2 bg-white rounded border border-red-200">
                  <span className="font-bold text-[10px] text-red-700 uppercase flex items-center gap-1 mb-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Tindak Lanjut Perbaikan (Wajib):
                  </span>
                  <p className="text-[10.5px] text-slate-800 font-medium">
                    {snapshot.followUpAction || 'Belum diisi. Wajib dilengkapi sebelum penerbitan dokumen.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </EvidenceShell>
    </div>
  );
}
