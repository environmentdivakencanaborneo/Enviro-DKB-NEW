/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  EvidenceReport, 
  MonthlyEvidenceSnapshot, 
  WastewaterData 
} from '../../types';
import EvidenceShell from './EvidenceShell';
import { 
  buildMonthlyRecap, 
  formatLocaleNumber, 
  DEBIT_STATUS_LABEL 
} from '../../utils/evidenceCalc';
import { generateQrDataUrl } from '../../utils/qr';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  HelpCircle,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { WASTEWATER_STANDARDS, WASTEWATER_BASIS_LABEL } from '../../data/regulations';

interface MonthlyEvidenceDocumentProps {
  report?: EvidenceReport | null;
  records: WastewaterData[];
  locationCode: string;
  locationName: string;
  docSuffix?: string;
  year: number;
  month: number;
  dailyReportsMap?: Record<string, string>; // date (YYYY-MM-DD) -> documentNo
}

export default function MonthlyEvidenceDocument({
  report,
  records,
  locationCode,
  locationName,
  docSuffix = '',
  year,
  month,
  dailyReportsMap = {},
}: MonthlyEvidenceDocumentProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const isPublished = Boolean(report && report.status !== 'Draft');

  // Compute live recap or use snapshot if published
  const recap = buildMonthlyRecap(records, locationCode, year, month);

  const snapshot: MonthlyEvidenceSnapshot = isPublished && report?.snapshot
    ? (report.snapshot as MonthlyEvidenceSnapshot)
    : {
        documentNo: report?.documentNo || `FR-EMS-WQ-${year}-M${String(month).padStart(2, '0')}${docSuffix ? `-${docSuffix}` : ''}`,
        period: `${year}-${String(month).padStart(2, '0')}`,
        periodLabel: `${new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
        locationCode,
        locationName,
        docSuffix,
        daysInMonth: recap.daysInMonth,
        samplingDays: recap.samplingDays,
        passDays: recap.passDays,
        failDays: recap.failDays,
        compliancePct: recap.compliancePct,
        completenessPct: recap.completenessPct,
        overall: recap.overall,
        stats: recap.stats,
        days: recap.days.map((d) => ({
          date: d.date,
          dayNumber: d.dayNumber,
          sampleTime: d.record?.sampleTime,
          officer: d.record?.officer,
          weather: d.record?.weather,
          ph: d.record ? Number(d.record.ph) : null,
          tss: d.record ? Number(d.record.tss) : null,
          debit: d.record ? Number(d.record.debit) : null,
          fe: d.record ? Number(d.record.fe) : null,
          mn: d.record ? Number(d.record.mn) : null,
          status: d.status,
          duplicateCount: d.duplicateCount,
          dailyDocumentNo: dailyReportsMap[d.date] || null,
        })),
        missingDays: recap.missingDays,
        failedParamKeys: recap.failedParamKeys,
        conclusionText: recap.conclusionText,
        standardsBasis: WASTEWATER_BASIS_LABEL,
      };

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
      generateQrDataUrl(`${window.location.origin}${window.location.pathname}#/verify/preview-monthly-draft`).then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [report?.verifyToken]);

  // Transform data for Recharts (fixed dimensions, connectNulls=false)
  const chartData = snapshot.days.map((d) => ({
    day: d.dayNumber,
    date: d.date,
    ph: d.ph,
    tss: d.tss,
    debit: d.debit,
    fe: d.fe,
    mn: d.mn,
  }));

  const maxDataVal = (key: 'ph' | 'tss' | 'debit' | 'fe' | 'mn', fallbackLimit: number) => {
    const valid = snapshot.days.map((d) => d[key]).filter((v): v is number => v != null && !isNaN(v));
    const dataMax = valid.length > 0 ? Math.max(...valid) : fallbackLimit;
    return Math.max(fallbackLimit * 1.15, dataMax * 1.1);
  };

  const isPassed = snapshot.overall === 'MEMENUHI';
  const isFailed = snapshot.overall === 'TIDAK MEMENUHI';

  return (
    <div className="evidence-print-root space-y-8 print:space-y-0">
      {/* ========================================================================= */}
      {/* HALAMAN 1: RINGKASAN REKAPITULASI BULANAN & GRAFIK TREN                  */}
      {/* ========================================================================= */}
      <div className="print:page-break-after-always print:break-after-page">
        <EvidenceShell
          bannerTitle="EVIDENCE BULANAN (REKAP)"
          bannerSubtitle="PEMANTAUAN AIR LIMBAH TAMBANG"
          documentNo={snapshot.documentNo}
          revision={report?.revision ?? 0}
          issuedAt={report?.issuedAt || undefined}
          periodLabel={snapshot.periodLabel}
          prepared={report?.signatures.prepared}
          reviewed={report?.signatures.reviewed}
          approved={report?.signatures.approved || {
            uid: '',
            email: '',
            name: '',
            position: 'Environment Manager',
            signedAt: '',
            signatureDataUrl: '',
          }}
          qrCodeUrl={qrCodeDataUrl}
          verifyToken={report?.verifyToken}
          isCancelled={report?.status === 'Dibatalkan'}
          cancelReason={report?.cancellationReason}
        >
          {/* A. INFORMASI REKAP */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
              <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">
                A. INFORMASI REKAPITULASI BULANAN
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Siklus: Pelaporan Rutin Bulanan KPL
              </span>
            </div>

            <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10.5px]">
              <div>
                <span className="text-slate-500 block text-[9.5px]">Periode Bulan:</span>
                <span className="font-bold text-slate-900">{snapshot.periodLabel}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9.5px]">Lokasi Titik:</span>
                <span className="font-bold text-slate-900">{snapshot.locationName} ({snapshot.locationCode})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9.5px]">Jenis Pemantauan:</span>
                <span className="font-bold text-slate-900">Harian (Daily) In-situ</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9.5px]">Jumlah Hari Sampling:</span>
                <span className="font-bold text-slate-900">{snapshot.samplingDays} dari {snapshot.daysInMonth} Hari</span>
              </div>
            </div>
          </div>

          {/* B. REKAPITULASI HASIL PEMANTAUAN */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
              <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">
                B. REKAPITULASI HASIL PEMANTAUAN AIR LIMBAH
              </span>
              <span className="text-[10px] text-slate-500">
                Statistik Pengujian Lapangan
              </span>
            </div>

            <table className="w-full text-left text-[10.5px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 border-b border-slate-300 font-semibold text-[10px]">
                  <th className="py-1.5 px-3 border-r border-slate-200">Parameter Uji</th>
                  <th className="py-1.5 px-3 w-16 text-center border-r border-slate-200">Satuan</th>
                  <th className="py-1.5 px-3 text-center border-r border-slate-200" colSpan={3}>
                    Statistik Bulan Ini
                    <div className="grid grid-cols-3 font-mono text-[9px] text-slate-500 font-normal mt-0.5">
                      <span>Min</span>
                      <span>Rata-rata</span>
                      <span>Maks</span>
                    </div>
                  </th>
                  <th className="py-1.5 px-3 w-24 text-center border-r border-slate-200">Baku Mutu</th>
                  <th className="py-1.5 px-3 w-32 text-center">Kepatuhan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {WASTEWATER_STANDARDS.map((std) => {
                  const stat = snapshot.stats[std.key as 'ph' | 'tss' | 'debit' | 'fe' | 'mn'];
                  const isDebit = std.key === 'debit';
                  const isFailedParam = stat && stat.exceedDays > 0;
                  const minDec = std.decimals?.min ?? 0;
                  const maxDec = std.decimals?.max ?? 3;

                  return (
                    <tr key={std.key} className={isFailedParam ? 'bg-red-50/50' : ''}>
                      <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        {std.label}
                      </td>
                      <td className="py-1.5 px-3 text-center border-r border-slate-200 font-mono text-slate-600">
                        {std.unit || '-'}
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-100 font-mono text-slate-700 w-16">
                        {stat?.min != null ? formatLocaleNumber(stat.min, minDec, maxDec) : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-100 font-mono font-bold text-slate-900 w-16">
                        {stat?.avg != null ? formatLocaleNumber(stat.avg, minDec, maxDec) : '—'}
                      </td>
                      <td className="py-1.5 px-2 text-right border-r border-slate-200 font-mono text-slate-700 w-16">
                        {stat?.max != null ? formatLocaleNumber(stat.max, minDec, maxDec) : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-center border-r border-slate-200 text-slate-700">
                        {std.display || '-'}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        {isDebit ? (
                          <span className="inline-block px-2 py-0.5 text-[9px] font-semibold rounded bg-slate-100 text-slate-700">
                            {DEBIT_STATUS_LABEL}
                          </span>
                        ) : isFailedParam ? (
                          <span className="inline-block px-2 py-0.5 text-[9px] font-black rounded bg-red-100 text-red-800 border border-red-300">
                            TIDAK MEMENUHI ({stat.exceedDays} hari)
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            MEMENUHI
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="bg-slate-50 px-3 py-1 border-t border-slate-200 text-[9px] text-slate-500 italic space-y-0.5">
              <p>* Dasar baku mutu: {snapshot.standardsBasis}.</p>
              <p>** Rata-rata pH dihitung secara aritmetika. Debit dipantau untuk perhitungan neraca air.</p>
            </div>
          </div>

          {/* C. GRAFIK TREN PARAMETER (FIXED SIZE ~330px x 150px, Recharts, connectNulls=false) */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
              <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                C. GRAFIK TREN FLUKTUASI PARAMETER HARIAN
              </span>
              <span className="text-[9.5px] text-red-600 font-semibold font-mono">
                Garis merah putus-putus (- -) = Baku Mutu
              </span>
            </div>

            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center bg-slate-50/40">
              {/* 1. Grafik pH */}
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-800">Tren Derajat Keasaman (pH)</span>
                  <span className="text-[8.5px] text-emerald-700 font-semibold">Standar: 6.0 - 9.0</span>
                </div>
                <LineChart width={330} height={145} data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 8 }} domain={[1, snapshot.daysInMonth]} interval={2} />
                  <YAxis domain={[0, 14]} tick={{ fontSize: 8 }} ticks={[0, 3, 6, 9, 12, 14]} />
                  <ReferenceLine y={6.0} stroke="#dc2626" strokeDasharray="3 3" />
                  <ReferenceLine y={9.0} stroke="#dc2626" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="ph" stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
                </LineChart>
              </div>

              {/* 2. Grafik TSS */}
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-800">Total Suspended Solids (TSS)</span>
                  <span className="text-[8.5px] text-blue-700 font-semibold">Maks: 300 mg/L</span>
                </div>
                <LineChart width={330} height={145} data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 8 }} domain={[1, snapshot.daysInMonth]} interval={2} />
                  <YAxis domain={[0, maxDataVal('tss', 300)]} tick={{ fontSize: 8 }} />
                  <ReferenceLine y={300} stroke="#dc2626" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="tss" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
                </LineChart>
              </div>

              {/* 3. Grafik Fe (Besi Total) */}
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-800">Besi Total (Fe)</span>
                  <span className="text-[8.5px] text-orange-700 font-semibold">Maks: 7.0 mg/L</span>
                </div>
                <LineChart width={330} height={145} data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 8 }} domain={[1, snapshot.daysInMonth]} interval={2} />
                  <YAxis domain={[0, maxDataVal('fe', 7.0)]} tick={{ fontSize: 8 }} />
                  <ReferenceLine y={7.0} stroke="#dc2626" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="fe" stroke="#ea580c" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
                </LineChart>
              </div>

              {/* 4. Grafik Mn (Mangan Total) */}
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-800">Mangan Total (Mn)</span>
                  <span className="text-[8.5px] text-purple-700 font-semibold">Maks: 4.0 mg/L</span>
                </div>
                <LineChart width={330} height={145} data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 8 }} domain={[1, snapshot.daysInMonth]} interval={2} />
                  <YAxis domain={[0, maxDataVal('mn', 4.0)]} tick={{ fontSize: 8 }} />
                  <ReferenceLine y={4.0} stroke="#dc2626" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="mn" stroke="#9333ea" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
                </LineChart>
              </div>

              {/* 5. Grafik Debit (Dipantau, TANPA ReferenceLine) */}
              <div className="bg-white p-2.5 rounded border border-slate-200 shadow-2xs md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-800">Debit Aliran Air Limbah (m³/s)</span>
                  <span className="text-[8.5px] text-teal-700 font-semibold">Parameter Pantau</span>
                </div>
                <LineChart width={330} height={140} data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 8 }} domain={[1, snapshot.daysInMonth]} interval={2} />
                  <YAxis tick={{ fontSize: 8 }} />
                  <Line type="monotone" dataKey="debit" stroke="#0d9488" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
                </LineChart>
              </div>
            </div>
          </div>

          {/* D. KEPATUHAN BULANAN */}
          <div className="border border-slate-300 rounded p-3 bg-slate-50/50">
            <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide block mb-2">
              D. RINGKASAN KEPATUHAN PEMANTAUAN BULANAN
            </span>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-[9.5px] text-slate-500 block">Jumlah Sampling</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{snapshot.samplingDays} Hari</span>
              </div>
              <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                <span className="text-[9.5px] text-emerald-700 font-medium block">Memenuhi</span>
                <span className="text-sm font-black text-emerald-800 font-mono">{snapshot.passDays} Hari</span>
              </div>
              <div className="p-2 bg-red-50 rounded border border-red-200">
                <span className="text-[9.5px] text-red-700 font-medium block">Tidak Memenuhi</span>
                <span className="text-sm font-black text-red-800 font-mono">{snapshot.failDays} Hari</span>
              </div>
              <div className="p-2 bg-slate-900 text-white rounded border border-slate-800">
                <span className="text-[9.5px] text-slate-300 block">Compliance Rate</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {snapshot.compliancePct != null ? `${formatLocaleNumber(snapshot.compliancePct, 1, 1)}%` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200 text-[10px] text-slate-600 space-y-0.5">
              <p>
                <strong>Kelengkapan data:</strong> {snapshot.samplingDays} dari {snapshot.daysInMonth} hari ({formatLocaleNumber(snapshot.completenessPct, 1, 1)}%).
              </p>
              {snapshot.missingDays.length > 0 && (
                <p className="text-amber-800">
                  <strong>Hari tanpa data ({snapshot.missingDays.length} hari):</strong>{' '}
                  {snapshot.missingDays.map((d) => `${parseInt(d.split('-')[2], 10)} ${snapshot.periodLabel.split(' ')[0]}`).join(', ')}.
                </p>
              )}
            </div>
          </div>

          {/* E. KESIMPULAN BULANAN */}
          <div
            className={`border rounded p-3 ${
              isPassed
                ? 'border-emerald-300 bg-emerald-50/40'
                : isFailed
                ? 'border-red-300 bg-red-50/40'
                : 'border-slate-300 bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="shrink-0 mt-0.5">
                {isPassed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : isFailed ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <HelpCircle className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 text-[10.5px]">
                <span className="font-extrabold text-[11px] uppercase tracking-wide block mb-0.5 text-slate-800">
                  E. KESIMPULAN KEPATUHAN BULANAN
                </span>
                <p className="leading-relaxed text-slate-800">
                  {snapshot.conclusionText}
                </p>
              </div>
            </div>
          </div>
        </EvidenceShell>
      </div>

      {/* ========================================================================= */}
      {/* HALAMAN 2+: LAMPIRAN REKAPITULASI DATA HARIAN LENGKAP                     */}
      {/* ========================================================================= */}
      <div
        className="bg-white text-slate-900 mx-auto w-full max-w-[210mm] shadow-2xl print:shadow-none print:m-0 print:w-full print:max-w-none p-6 md:p-8 font-sans text-xs border border-slate-200 print:border-none print:page-break-before-always print:break-before-page"
        style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      >
        <div className="space-y-4">
          {/* Header Lampiran */}
          <div className="border-b-2 border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 font-mono uppercase tracking-widest block">
                LAMPIRAN DOKUMEN EVIDENCE RESMI
              </span>
              <h2 className="text-sm md:text-base font-black text-slate-900 uppercase">
                REKAPITULASI DATA HARIAN PEMANTAUAN AIR LIMBAH TAMBANG
              </h2>
              <p className="text-[10px] text-slate-500">
                Titik Sampling: <strong>{snapshot.locationName} ({snapshot.locationCode})</strong> &bull; Periode: <strong>{snapshot.periodLabel}</strong>
              </p>
            </div>
            <div className="text-right text-[10px] font-mono border border-slate-300 rounded px-2.5 py-1 bg-slate-50">
              <span className="text-slate-500 block">Lampiran Dokumen:</span>
              <span className="font-bold text-slate-900">{snapshot.documentNo}</span>
            </div>
          </div>

          {/* Table Lampiran with thead repeating on page breaks */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full text-left text-[9.5px] border-collapse print:text-[8.5px]">
              <thead className="print:table-header-group">
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold text-center">
                  <th className="py-2 px-1.5 w-8 border-r border-slate-200">Tgl</th>
                  <th className="py-2 px-1.5 w-12 border-r border-slate-200">Jam</th>
                  <th className="py-2 px-2 border-r border-slate-200 text-left">Petugas</th>
                  <th className="py-2 px-1.5 w-14 border-r border-slate-200">Cuaca</th>
                  <th className="py-2 px-1.5 w-10 border-r border-slate-200">pH</th>
                  <th className="py-2 px-1.5 w-12 border-r border-slate-200">TSS<br/><span className="text-[8px] font-normal">(mg/L)</span></th>
                  <th className="py-2 px-1.5 w-12 border-r border-slate-200">Debit<br/><span className="text-[8px] font-normal">(m³/s)</span></th>
                  <th className="py-2 px-1.5 w-10 border-r border-slate-200">Fe<br/><span className="text-[8px] font-normal">(mg/L)</span></th>
                  <th className="py-2 px-1.5 w-10 border-r border-slate-200">Mn<br/><span className="text-[8px] font-normal">(mg/L)</span></th>
                  <th className="py-2 px-2 w-20 border-r border-slate-200">Status</th>
                  <th className="py-2 px-2 w-28 text-left font-mono text-[8px]">No. Dok Harian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {snapshot.days.map((item) => {
                  const isNoData = item.status === 'tanpa_data';
                  const isFail = item.status === 'tidak_memenuhi';

                  const isPhExceed = item.ph != null && (item.ph < 6.0 || item.ph > 9.0);
                  const isTssExceed = item.tss != null && item.tss > 300;
                  const isFeExceed = item.fe != null && item.fe > 7.0;
                  const isMnExceed = item.mn != null && item.mn > 4.0;

                  return (
                    <tr
                      key={item.date}
                      className={`break-inside-avoid print:break-inside-avoid ${
                        isNoData ? 'bg-slate-100/70 text-slate-400 italic' : isFail ? 'bg-red-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-1 px-1.5 text-center font-mono font-bold border-r border-slate-200">
                        {item.dayNumber}
                        {item.duplicateCount > 1 && <span className="text-amber-600 font-bold ml-0.5" title="Data diperbarui (duplikat input)">†</span>}
                      </td>
                      <td className="py-1 px-1.5 text-center font-mono border-r border-slate-200">
                        {item.sampleTime || '-'}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200 truncate max-w-[90px]">
                        {item.officer || '-'}
                      </td>
                      <td className="py-1 px-1.5 text-center border-r border-slate-200 truncate">
                        {item.weather || '-'}
                      </td>
                      <td className={`py-1 px-1.5 text-right font-mono border-r border-slate-200 ${isPhExceed ? 'text-red-700 font-bold bg-red-100/60' : ''}`}>
                        {item.ph != null ? formatLocaleNumber(item.ph, 1, 2) : '—'}
                      </td>
                      <td className={`py-1 px-1.5 text-right font-mono border-r border-slate-200 ${isTssExceed ? 'text-red-700 font-bold bg-red-100/60' : ''}`}>
                        {item.tss != null ? formatLocaleNumber(item.tss, 0, 1) : '—'}
                      </td>
                      <td className="py-1 px-1.5 text-right font-mono border-r border-slate-200">
                        {item.debit != null ? formatLocaleNumber(item.debit, 2, 3) : '—'}
                      </td>
                      <td className={`py-1 px-1.5 text-right font-mono border-r border-slate-200 ${isFeExceed ? 'text-red-700 font-bold bg-red-100/60' : ''}`}>
                        {item.fe != null ? formatLocaleNumber(item.fe, 2, 2) : '—'}
                      </td>
                      <td className={`py-1 px-1.5 text-right font-mono border-r border-slate-200 ${isMnExceed ? 'text-red-700 font-bold bg-red-100/60' : ''}`}>
                        {item.mn != null ? formatLocaleNumber(item.mn, 2, 2) : '—'}
                      </td>
                      <td className="py-1 px-2 text-center border-r border-slate-200">
                        {isNoData ? (
                          <span className="text-slate-400 font-medium">Tidak ada data</span>
                        ) : isFail ? (
                          <span className="text-[8px] font-black text-red-700 bg-red-100 px-1 py-0.5 rounded">TIDAK MEMENUHI</span>
                        ) : (
                          <span className="text-[8px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded">MEMENUHI</span>
                        )}
                      </td>
                      <td className="py-1 px-2 font-mono text-[8px] truncate max-w-[110px] text-slate-700">
                        {item.dailyDocumentNo || '-'}
                      </td>
                    </tr>
                  );
                })}

                {/* Summary Rows matching Bagian B */}
                <tr className="bg-slate-100 font-bold text-[9px] border-t-2 border-slate-300 break-inside-avoid">
                  <td colSpan={4} className="py-1.5 px-3 text-right border-r border-slate-200 uppercase">
                    Minimum Bulan Ini:
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.ph.min != null ? formatLocaleNumber(snapshot.stats.ph.min, 1, 2) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.tss.min != null ? formatLocaleNumber(snapshot.stats.tss.min, 0, 1) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.debit.min != null ? formatLocaleNumber(snapshot.stats.debit.min, 2, 3) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.fe.min != null ? formatLocaleNumber(snapshot.stats.fe.min, 2, 2) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.mn.min != null ? formatLocaleNumber(snapshot.stats.mn.min, 2, 2) : '—'}
                  </td>
                  <td colSpan={2} className="py-1.5 px-2 bg-slate-50 text-slate-400 italic text-[8px]">
                    Nilai Terendah
                  </td>
                </tr>

                <tr className="bg-slate-100 font-bold text-[9px] border-t border-slate-200 break-inside-avoid">
                  <td colSpan={4} className="py-1.5 px-3 text-right border-r border-slate-200 uppercase">
                    Rata-Rata Bulan Ini:
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200 text-slate-900">
                    {snapshot.stats.ph.avg != null ? formatLocaleNumber(snapshot.stats.ph.avg, 1, 2) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200 text-slate-900">
                    {snapshot.stats.tss.avg != null ? formatLocaleNumber(snapshot.stats.tss.avg, 0, 1) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200 text-slate-900">
                    {snapshot.stats.debit.avg != null ? formatLocaleNumber(snapshot.stats.debit.avg, 2, 3) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200 text-slate-900">
                    {snapshot.stats.fe.avg != null ? formatLocaleNumber(snapshot.stats.fe.avg, 2, 2) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200 text-slate-900">
                    {snapshot.stats.mn.avg != null ? formatLocaleNumber(snapshot.stats.mn.avg, 2, 2) : '—'}
                  </td>
                  <td colSpan={2} className="py-1.5 px-2 bg-slate-50 text-slate-400 italic text-[8px]">
                    Aritmetika
                  </td>
                </tr>

                <tr className="bg-slate-100 font-bold text-[9px] border-t border-slate-200 break-inside-avoid">
                  <td colSpan={4} className="py-1.5 px-3 text-right border-r border-slate-200 uppercase">
                    Maksimum Bulan Ini:
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.ph.max != null ? formatLocaleNumber(snapshot.stats.ph.max, 1, 2) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.tss.max != null ? formatLocaleNumber(snapshot.stats.tss.max, 0, 1) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.debit.max != null ? formatLocaleNumber(snapshot.stats.debit.max, 2, 3) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.fe.max != null ? formatLocaleNumber(snapshot.stats.fe.max, 2, 2) : '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-right font-mono border-r border-slate-200">
                    {snapshot.stats.mn.max != null ? formatLocaleNumber(snapshot.stats.mn.max, 2, 2) : '—'}
                  </td>
                  <td colSpan={2} className="py-1.5 px-2 bg-slate-50 text-slate-400 italic text-[8px]">
                    Nilai Tertinggi
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-[8.5px] text-slate-500 flex items-center justify-between pt-1">
            <span>Tanda † mengindikasikan tanggal dengan beberapa catatan sampling (dipakai entri termutakhir).</span>
            <span>Dokumen Lampiran Resmi ISO 14001:2015</span>
          </div>
        </div>
      </div>
    </div>
  );
}
