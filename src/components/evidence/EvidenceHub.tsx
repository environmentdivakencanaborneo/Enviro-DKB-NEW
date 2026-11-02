/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  WastewaterData, 
  EvidenceReport, 
  WqLocation, 
  EvidenceSignature,
  DailyEvidenceSnapshot,
  MonthlyEvidenceSnapshot,
  MonthlyDayItem,
  WastewaterPhoto
} from '../../types';
import { wqLocationService } from '../../services/wqLocationService';
import { evidenceService } from '../../services/evidenceService';
import { signatureService } from '../../services/signatureService';
import { waterQualityService } from '../../services/dbService';
import { exportMonthlyWastewaterRecapToXLSX } from '../../services/exportService';
import { 
  selectDailyRecord, 
  buildDailyEvidence,
  buildMonthlyRecap 
} from '../../utils/evidenceCalc';
import { 
  formatDateLocalIndonesian, 
  todayLocalISO, 
  getDayNameIndonesian 
} from '../../utils/dateUtils';
import { normalizeRole, atLeast } from '../../utils/roles';
import { computeSnapshotHash } from '../../utils/hash';
import DailyEvidenceDocument from './DailyEvidenceDocument';
import MonthlyEvidenceDocument from './MonthlyEvidenceDocument';
import SignaturePad from './SignaturePad';
import { 
  FileText, 
  Printer, 
  Eye, 
  PenTool, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Clock, 
  Calendar, 
  MapPin, 
  ShieldAlert, 
  Layers, 
  Send,
  Ban,
  Download,
  CheckCheck,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { WASTEWATER_BASIS_LABEL } from '../../data/regulations';

interface EvidenceHubProps {
  wastewater: WastewaterData[];
  user: any;
}

type SigningType = 
  | 'prepare' 
  | 'review' 
  | 'revision' 
  | 'prepare_monthly' 
  | 'review_monthly' 
  | 'approve_monthly' 
  | 'revision_monthly';

export default function EvidenceHub({ wastewater, user }: EvidenceHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'harian' | 'bulanan'>('harian');
  const [locations, setLocations] = useState<WqLocation[]>([]);
  const [selectedLocationCode, setSelectedLocationCode] = useState<string>('KPL-01');
  const [selectedMonth, setSelectedMonth] = useState<string>(todayLocalISO().slice(0, 7));
  const [reports, setReports] = useState<EvidenceReport[]>([]);
  
  // Daily Modal / Preview state
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [savedUserSig, setSavedUserSig] = useState<string | null>(null);
  const [isSigningOpen, setIsSigningOpen] = useState(false);
  const [signingType, setSigningType] = useState<SigningType>('prepare');
  const [followUpInput, setFollowUpInput] = useState<string>('');
  const [revisionReasonInput, setRevisionReasonInput] = useState<string>('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Monthly Preview & Action state
  const [isMonthlyPreviewOpen, setIsMonthlyPreviewOpen] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isMonthlyCancelModalOpen, setIsMonthlyCancelModalOpen] = useState(false);

  // Batch Daily Print state
  const [batchPrintProgress, setBatchPrintProgress] = useState<{
    isOpen: boolean;
    current: number;
    total: number;
    status: 'loading' | 'ready' | 'idle';
  }>({ isOpen: false, current: 0, total: 0, status: 'idle' });
  const [batchDailyItems, setBatchDailyItems] = useState<{
    date: string;
    record: WastewaterData | null;
    report: EvidenceReport | null;
  }[]>([]);
  const [preloadedPhotos, setPreloadedPhotos] = useState<Record<string, WastewaterPhoto | null>>({});
  const [isBatchPrintingActive, setIsBatchPrintingActive] = useState(false);

  // Roles & permissions
  const userRole = normalizeRole(user?.role);
  const canPublish = atLeast(userRole, 'Operator');
  const canReview = atLeast(userRole, 'Foreman');
  const canRevise = atLeast(userRole, 'Environment Superintendent');
  const canApprove = atLeast(userRole, 'Environment Manager');
  const canCancel = userRole === 'Admin';

  // Load locations
  useEffect(() => {
    const unsub = wqLocationService.subscribe((locs) => {
      setLocations(locs);
      if (locs.length > 0 && !selectedLocationCode) {
        setSelectedLocationCode(locs[0].code);
      }
    });
    return () => unsub();
  }, [selectedLocationCode]);

  // Load reports for selected month and location
  useEffect(() => {
    if (!selectedMonth || !selectedLocationCode) return;
    const unsub = evidenceService.subscribe(selectedMonth, selectedLocationCode, (data) => {
      setReports(data);
    });
    return () => unsub();
  }, [selectedMonth, selectedLocationCode]);

  // Load user saved signature if available
  useEffect(() => {
    if (user?.uid) {
      signatureService.getUserSignature(user.uid).then((sig) => {
        setSavedUserSig(sig);
      });
    }
  }, [user?.uid]);

  const selectedLocation = useMemo(() => {
    return locations.find((l) => l.code === selectedLocationCode) || {
      id: 'default',
      code: selectedLocationCode,
      name: 'KPL Tambang Blok Utara',
      defaultSource: 'Settling Pond Outlet',
      docSuffix: '',
      isActive: true,
    };
  }, [locations, selectedLocationCode]);

  // Map of daily document numbers by date
  const dailyReportsMap = useMemo(() => {
    const map: Record<string, string> = {};
    reports.forEach((r) => {
      if ((r.type === 'daily' || !r.type) && r.date && r.documentNo) {
        map[r.date] = r.documentNo;
      }
    });
    return map;
  }, [reports]);

  // Generate all calendar days of selected month
  const calendarDays = useMemo(() => {
    if (!selectedMonth) return [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const lastDay = new Date(year, month, 0).getDate();

    const days: {
      date: string;
      dayName: string;
      dayNumber: number;
      record: WastewaterData | null;
      duplicateCount: number;
      report: EvidenceReport | null;
      overall: 'MEMENUHI' | 'TIDAK MEMENUHI' | null;
      statusDoc: string;
    }[] = [];

    const monthPrefix = `${yearStr}-${monthStr.padStart(2, '0')}`;

    for (let d = 1; d <= lastDay; d++) {
      const dayPad = String(d).padStart(2, '0');
      const dateStr = `${monthPrefix}-${dayPad}`;
      const dayName = getDayNameIndonesian(dateStr);

      const { selected: record, count } = selectDailyRecord(wastewater, selectedLocationCode, dateStr);
      const report = reports.find((r) => (r.type === 'daily' || !r.type) && r.date === dateStr) || null;

      let overall: 'MEMENUHI' | 'TIDAK MEMENUHI' | null = null;
      if (record) {
        const evalRes = buildDailyEvidence(record);
        overall = evalRes.overall;
      } else if (report?.snapshot) {
        overall = (report.snapshot as DailyEvidenceSnapshot).overall;
      }

      let statusDoc = 'Belum dibuat';
      if (report) {
        statusDoc = report.status;
      } else if (record) {
        statusDoc = 'Draft';
      }

      days.push({
        date: dateStr,
        dayName,
        dayNumber: d,
        record,
        duplicateCount: count,
        report,
        overall,
        statusDoc,
      });
    }

    return days;
  }, [selectedMonth, selectedLocationCode, wastewater, reports]);

  // Monthly recap calculations
  const [yearNum, monthNum] = useMemo(() => {
    if (!selectedMonth) return [new Date().getFullYear(), new Date().getMonth() + 1];
    const [y, m] = selectedMonth.split('-');
    return [parseInt(y, 10), parseInt(m, 10)];
  }, [selectedMonth]);

  const monthlyRecap = useMemo(() => {
    if (!selectedMonth || !selectedLocationCode) return null;
    return buildMonthlyRecap(wastewater, selectedLocationCode, yearNum, monthNum);
  }, [wastewater, selectedLocationCode, yearNum, monthNum]);

  // Monthly published report from Firestore
  const monthlyReport = useMemo(() => {
    return reports.find((r) => r.type === 'monthly') || null;
  }, [reports]);

  // Non-compliant days that have no follow-up action on their daily evidence
  const failDaysWithoutFollowUp = useMemo(() => {
    if (!monthlyRecap) return [];
    return monthlyRecap.days
      .filter((d) => d.status === 'tidak_memenuhi')
      .filter((d) => {
        const dailyRep = reports.find((r) => (r.type === 'daily' || !r.type) && r.date === d.date);
        return !dailyRep?.followUpAction || dailyRep.followUpAction.trim().length === 0;
      })
      .map((d) => d.dayNumber);
  }, [monthlyRecap, reports]);

  // Selected active item for preview modal
  const activeDayItem = useMemo(() => {
    if (!previewDate) return null;
    return calendarDays.find((d) => d.date === previewDate) || null;
  }, [calendarDays, previewDate]);

  // Current calculated evaluation for active item
  const activeEvalResult = useMemo(() => {
    if (!activeDayItem?.record) return null;
    return buildDailyEvidence(activeDayItem.record, {
      locationCode: selectedLocation.code,
      locationName: selectedLocation.name,
      date: activeDayItem.date,
    });
  }, [activeDayItem, selectedLocation]);

  // Check if daily published snapshot is out of sync with current record
  const [isDailyHashMismatch, setIsDailyHashMismatch] = useState(false);
  useEffect(() => {
    let isMounted = true;
    if (!activeDayItem?.report || activeDayItem.report.status === 'Draft' || !activeDayItem.record) {
      setIsDailyHashMismatch(false);
      return;
    }

    const checkHash = async () => {
      const currentEval = buildDailyEvidence(activeDayItem.record!, {
        locationCode: selectedLocation.code,
        locationName: selectedLocation.name,
        date: activeDayItem.date,
      });

      const currentSnapshot = {
        ...(activeDayItem.report!.snapshot as DailyEvidenceSnapshot),
        params: currentEval.params,
        overall: currentEval.overall,
        failedParams: currentEval.failedParams,
        conclusionText: currentEval.conclusionText,
      };

      const freshHash = await computeSnapshotHash(currentSnapshot);
      if (isMounted) {
        setIsDailyHashMismatch(freshHash !== activeDayItem.report?.snapshotHash);
      }
    };

    checkHash();
    return () => {
      isMounted = false;
    };
  }, [activeDayItem, selectedLocation]);

  // Check if monthly published snapshot is out of sync with current data
  const [isMonthlyHashMismatch, setIsMonthlyHashMismatch] = useState(false);
  useEffect(() => {
    let isMounted = true;
    if (!monthlyReport || monthlyReport.status === 'Draft' || !monthlyRecap) {
      setIsMonthlyHashMismatch(false);
      return;
    }

    const checkHash = async () => {
      const snapshotDays: MonthlyDayItem[] = monthlyRecap.days.map((d) => ({
        date: d.date,
        dayNumber: d.dayNumber,
        sampleTime: d.record?.sampleTime || null,
        officer: d.record?.officer || null,
        weather: d.record?.weather || null,
        ph: d.record?.ph != null ? Number(d.record.ph) : null,
        tss: d.record?.tss != null ? Number(d.record.tss) : null,
        debit: d.record?.debit != null ? Number(d.record.debit) : null,
        fe: d.record?.fe != null ? Number(d.record.fe) : null,
        mn: d.record?.mn != null ? Number(d.record.mn) : null,
        status: d.status,
        duplicateCount: d.duplicateCount,
        dailyDocumentNo: dailyReportsMap[d.date] || null,
      }));

      const currentSnapshot: MonthlyEvidenceSnapshot = {
        ...(monthlyReport.snapshot as MonthlyEvidenceSnapshot),
        daysInMonth: monthlyRecap.daysInMonth,
        samplingDays: monthlyRecap.samplingDays,
        passDays: monthlyRecap.passDays,
        failDays: monthlyRecap.failDays,
        compliancePct: monthlyRecap.compliancePct,
        completenessPct: monthlyRecap.completenessPct,
        overall: monthlyRecap.overall,
        stats: monthlyRecap.stats,
        days: snapshotDays,
        missingDays: monthlyRecap.missingDays,
        failedParamKeys: monthlyRecap.failedParamKeys,
        conclusionText: monthlyRecap.conclusionText,
      };

      const freshHash = await computeSnapshotHash(currentSnapshot);
      if (isMounted) {
        setIsMonthlyHashMismatch(freshHash !== monthlyReport.snapshotHash);
      }
    };

    checkHash();
    return () => {
      isMounted = false;
    };
  }, [monthlyReport, monthlyRecap, dailyReportsMap]);

  // Trigger browser print for single-page A4
  const handlePrint = useCallback(() => {
    document.body.classList.add('evidence-printing');
    const onAfterPrint = () => {
      document.body.classList.remove('evidence-printing');
      window.removeEventListener('afterprint', onAfterPrint);
    };
    window.addEventListener('afterprint', onAfterPrint);
    window.print();
    setTimeout(() => {
      document.body.classList.remove('evidence-printing');
    }, 2000);
  }, []);

  // Open signature dialog
  const handleOpenSign = (type: SigningType) => {
    setSigningType(type);
    setDeclarationAccepted(false);
    setIsSigningOpen(true);
    setErrorMessage(null);
  };

  // Submit Signature Flow (Daily & Monthly)
  const handleSubmitSignature = async (signatureDataUrl: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const userName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'Petugas Lingkungan';
    const userRoleStr = user?.role || 'Operator';
    const userEmail = user?.email || 'operator@divakencana.com';
    const timestampStr = `${todayLocalISO()} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA`;

    const sigObj: EvidenceSignature = {
      uid: user?.uid || 'anon',
      signatureDataUrl,
      name: userName,
      position: userRoleStr,
      email: userEmail,
      signedAt: timestampStr,
    };

    try {
      // 1. Daily signatures
      if (signingType === 'prepare') {
        if (!activeDayItem) return;
        const docId = `WQD-${selectedLocation.code}-${activeDayItem.date.replace(/-/g, '')}`;
        const record = activeDayItem.record!;
        const evalRes = activeEvalResult!;

        const snapshot: DailyEvidenceSnapshot = {
          recordId: record.id,
          date: activeDayItem.date,
          locationCode: selectedLocation.code,
          locationName: selectedLocation.name,
          locationFullName: `${selectedLocation.name} (${selectedLocation.code})`,
          officer: record.officer || userName,
          weather: record.weather || 'Cerah',
          wastewaterSource: record.wastewaterSource || selectedLocation.defaultSource,
          sampleTime: record.sampleTime || '08:00',
          monitoringType: record.monitoringType || 'Harian',
          params: evalRes.params,
          overall: evalRes.overall,
          failedParams: evalRes.failedParams,
          conclusionText: evalRes.conclusionText,
          standardsBasis: evalRes.standardsBasis,
          followUpAction: followUpInput.trim() || undefined,
          hasPhoto: Boolean(record.hasPhoto),
        };

        await evidenceService.publishDailyEvidence({
          id: docId,
          period: selectedMonth,
          locationCode: selectedLocation.code,
          wastewaterId: record.id,
          date: activeDayItem.date,
          snapshot,
          preparedSignature: sigObj,
          followUpAction: followUpInput.trim() || undefined,
        });

      } else if (signingType === 'review') {
        if (!activeDayItem?.report) throw new Error('Dokumen harian belum diterbitkan.');
        await evidenceService.signReviewed(activeDayItem.report.id, sigObj);

      } else if (signingType === 'revision') {
        if (!activeDayItem?.report) throw new Error('Dokumen harian belum diterbitkan.');
        const record = activeDayItem.record!;
        const evalRes = activeEvalResult!;

        const newSnapshot = {
          ...(activeDayItem.report.snapshot as DailyEvidenceSnapshot),
          params: evalRes.params,
          overall: evalRes.overall,
          failedParams: evalRes.failedParams,
          conclusionText: evalRes.conclusionText,
          officer: record.officer || userName,
          weather: record.weather || (activeDayItem.report.snapshot as DailyEvidenceSnapshot).weather,
          sampleTime: record.sampleTime || (activeDayItem.report.snapshot as DailyEvidenceSnapshot).sampleTime,
        };

        await evidenceService.publishRevision(
          activeDayItem.report.id,
          newSnapshot,
          sigObj,
          revisionReasonInput.trim() || 'Pembaruan data hasil pengujian air limbah'
        );

      // 2. Monthly signatures
      } else if (signingType === 'prepare_monthly') {
        if (!monthlyRecap) throw new Error('Data rekapitulasi belum siap.');
        const [yearStr, monthStr] = selectedMonth.split('-');
        const docId = `WQM-${selectedLocation.code}-${yearStr}${monthStr.padStart(2, '0')}`;
        const monthName = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1).toLocaleDateString('id-ID', { month: 'long' });

        const snapshotDays: MonthlyDayItem[] = monthlyRecap.days.map((d) => ({
          date: d.date,
          dayNumber: d.dayNumber,
          sampleTime: d.record?.sampleTime || null,
          officer: d.record?.officer || null,
          weather: d.record?.weather || null,
          ph: d.record?.ph != null ? Number(d.record.ph) : null,
          tss: d.record?.tss != null ? Number(d.record.tss) : null,
          debit: d.record?.debit != null ? Number(d.record.debit) : null,
          fe: d.record?.fe != null ? Number(d.record.fe) : null,
          mn: d.record?.mn != null ? Number(d.record.mn) : null,
          status: d.status,
          duplicateCount: d.duplicateCount,
          dailyDocumentNo: dailyReportsMap[d.date] || null,
        }));

        const snapshot: MonthlyEvidenceSnapshot = {
          documentNo: '', // Set by publishMonthlyEvidence
          period: selectedMonth,
          periodLabel: `${monthName} ${yearStr}`,
          locationCode: selectedLocation.code,
          locationName: selectedLocation.name,
          docSuffix: selectedLocation.docSuffix || null,
          daysInMonth: monthlyRecap.daysInMonth,
          samplingDays: monthlyRecap.samplingDays,
          passDays: monthlyRecap.passDays,
          failDays: monthlyRecap.failDays,
          compliancePct: monthlyRecap.compliancePct,
          completenessPct: monthlyRecap.completenessPct,
          overall: monthlyRecap.overall,
          stats: monthlyRecap.stats,
          days: snapshotDays,
          missingDays: monthlyRecap.missingDays,
          failedParamKeys: monthlyRecap.failedParamKeys,
          conclusionText: monthlyRecap.conclusionText,
          standardsBasis: WASTEWATER_BASIS_LABEL,
        };

        await evidenceService.publishMonthlyEvidence({
          id: docId,
          period: selectedMonth,
          locationCode: selectedLocation.code,
          docSuffix: selectedLocation.docSuffix || undefined,
          snapshot,
          preparedSignature: sigObj,
        });

      } else if (signingType === 'review_monthly') {
        if (!monthlyReport) throw new Error('Dokumen rekap bulanan belum diterbitkan.');
        await evidenceService.signReviewed(monthlyReport.id, sigObj);

      } else if (signingType === 'approve_monthly') {
        if (!monthlyReport) throw new Error('Dokumen rekap bulanan belum diverifikasi oleh pemeriksa.');
        await evidenceService.signApproved(monthlyReport.id, sigObj);

      } else if (signingType === 'revision_monthly') {
        if (!monthlyReport) throw new Error('Dokumen rekap bulanan belum diterbitkan.');
        if (!monthlyRecap) throw new Error('Data rekapitulasi belum siap.');
        const [yearStr, monthStr] = selectedMonth.split('-');
        const monthName = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1).toLocaleDateString('id-ID', { month: 'long' });

        const snapshotDays: MonthlyDayItem[] = monthlyRecap.days.map((d) => ({
          date: d.date,
          dayNumber: d.dayNumber,
          sampleTime: d.record?.sampleTime || null,
          officer: d.record?.officer || null,
          weather: d.record?.weather || null,
          ph: d.record?.ph != null ? Number(d.record.ph) : null,
          tss: d.record?.tss != null ? Number(d.record.tss) : null,
          debit: d.record?.debit != null ? Number(d.record.debit) : null,
          fe: d.record?.fe != null ? Number(d.record.fe) : null,
          mn: d.record?.mn != null ? Number(d.record.mn) : null,
          status: d.status,
          duplicateCount: d.duplicateCount,
          dailyDocumentNo: dailyReportsMap[d.date] || null,
        }));

        const newSnapshot: MonthlyEvidenceSnapshot = {
          ...(monthlyReport.snapshot as MonthlyEvidenceSnapshot),
          period: selectedMonth,
          periodLabel: `${monthName} ${yearStr}`,
          locationCode: selectedLocation.code,
          locationName: selectedLocation.name,
          docSuffix: selectedLocation.docSuffix || null,
          daysInMonth: monthlyRecap.daysInMonth,
          samplingDays: monthlyRecap.samplingDays,
          passDays: monthlyRecap.passDays,
          failDays: monthlyRecap.failDays,
          compliancePct: monthlyRecap.compliancePct,
          completenessPct: monthlyRecap.completenessPct,
          overall: monthlyRecap.overall,
          stats: monthlyRecap.stats,
          days: snapshotDays,
          missingDays: monthlyRecap.missingDays,
          failedParamKeys: monthlyRecap.failedParamKeys,
          conclusionText: monthlyRecap.conclusionText,
        };

        await evidenceService.publishRevision(
          monthlyReport.id,
          newSnapshot,
          sigObj,
          revisionReasonInput.trim() || 'Pembaruan data rekapitulasi pemantauan air limbah bulanan'
        );
      }

      setIsSigningOpen(false);
      setFollowUpInput('');
      setRevisionReasonInput('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memproses tanda tangan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit cancellation (Daily)
  const handleCancelReport = async () => {
    if (!activeDayItem?.report || !cancelReasonInput.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await evidenceService.cancelReport(activeDayItem.report.id, cancelReasonInput.trim());
      setIsCancelModalOpen(false);
      setCancelReasonInput('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal membatalkan dokumen');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit cancellation (Monthly)
  const handleCancelMonthlyReport = async () => {
    if (!monthlyReport || !cancelReasonInput.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await evidenceService.cancelReport(monthlyReport.id, cancelReasonInput.trim());
      setIsMonthlyCancelModalOpen(false);
      setCancelReasonInput('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal membatalkan dokumen rekap bulanan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export Monthly Excel (.xlsx)
  const handleExportMonthlyExcel = () => {
    if (!monthlyRecap) return;
    const daysForExcel = monthlyRecap.days.map((d) => ({
      date: d.date,
      dayNumber: d.dayNumber,
      sampleTime: d.record?.sampleTime || '-',
      officer: d.record?.officer || '-',
      weather: d.record?.weather || '-',
      ph: d.record?.ph != null ? Number(d.record.ph) : null,
      tss: d.record?.tss != null ? Number(d.record.tss) : null,
      debit: d.record?.debit != null ? Number(d.record.debit) : null,
      fe: d.record?.fe != null ? Number(d.record.fe) : null,
      mn: d.record?.mn != null ? Number(d.record.mn) : null,
      status: d.status === 'tanpa_data' ? 'tanpa_data' : d.status === 'memenuhi' ? 'memenuhi' : 'tidak_memenuhi',
      duplicateCount: d.duplicateCount,
      dailyDocumentNo: dailyReportsMap[d.date] || null,
    }));

    exportMonthlyWastewaterRecapToXLSX(
      selectedLocation.code,
      selectedLocation.name,
      selectedMonth,
      daysForExcel,
      monthlyRecap.stats
    );
  };

  // Batch Daily Print flow
  const handleBatchDailyPrint = async () => {
    const publishedDays = calendarDays.filter((d) => Boolean(d.report && d.report.status !== 'Draft'));
    const targetDays = publishedDays.length > 0
      ? publishedDays
      : calendarDays.filter((d) => Boolean(d.record));

    if (targetDays.length === 0) {
      setErrorMessage('Tidak ada data pemantauan air limbah pada bulan ini untuk dicetak.');
      return;
    }

    setBatchPrintProgress({
      isOpen: true,
      current: 0,
      total: targetDays.length,
      status: 'loading',
    });

    const photoMap: Record<string, WastewaterPhoto | null> = {};
    for (let i = 0; i < targetDays.length; i++) {
      const item = targetDays[i];
      const recId = item.report?.wastewaterId || item.record?.id;
      if (recId) {
        try {
          const photo = await waterQualityService.getPhoto(recId);
          photoMap[item.date] = photo;
        } catch {
          photoMap[item.date] = null;
        }
      } else {
        photoMap[item.date] = null;
      }
      setBatchPrintProgress((prev) => ({
        ...prev,
        current: i + 1,
      }));
    }

    setPreloadedPhotos(photoMap);
    setBatchDailyItems(targetDays);
    setIsBatchPrintingActive(true);
    setBatchPrintProgress((prev) => ({
      ...prev,
      status: 'ready',
    }));

    setTimeout(() => {
      document.body.classList.add('evidence-printing');
      const onAfterPrint = () => {
        document.body.classList.remove('evidence-printing');
        setIsBatchPrintingActive(false);
        setBatchPrintProgress({ isOpen: false, current: 0, total: 0, status: 'idle' });
        window.removeEventListener('afterprint', onAfterPrint);
      };
      window.addEventListener('afterprint', onAfterPrint);
      window.print();
      setTimeout(() => {
        document.body.classList.remove('evidence-printing');
        setIsBatchPrintingActive(false);
        setBatchPrintProgress({ isOpen: false, current: 0, total: 0, status: 'idle' });
      }, 2000);
    }, 600);
  };

  const isPrintingModalOrBatch = Boolean(previewDate || isMonthlyPreviewOpen || isBatchPrintingActive);

  return (
    <div className="space-y-6">
      {/* Sub-tab segmented bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3 no-print">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start">
          <button
            type="button"
            onClick={() => setActiveSubTab('harian')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'harian'
                ? 'bg-white text-emerald-800 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Evidence Harian KPL
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('bulanan')}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'bulanan'
                ? 'bg-white text-emerald-800 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Evidence Bulanan (Rekapitulasi)
          </button>
        </div>

        <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          ISO 14001:2015 Clause 9.1 &bull; PROPER Compliance
        </div>
      </div>

      {/* Global Filter Bar: Titik Sampling & Bulan */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-4">
          {/* Lokasi Selector */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
            <label className="text-xs font-bold text-slate-700">Titik Sampling:</label>
            <select
              value={selectedLocationCode}
              onChange={(e) => setSelectedLocationCode(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold outline-none focus:ring-1 focus:ring-emerald-600"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.code}>
                  {loc.name} ({loc.code})
                </option>
              ))}
              {locations.length === 0 && (
                <option value="KPL-01">KPL Tambang Blok Utara (KPL-01)</option>
              )}
            </select>
          </div>

          {/* Bulan Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
            <label className="text-xs font-bold text-slate-700">Bulan &amp; Tahun:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-500 block">
            Titik: {selectedLocation.name} ({selectedLocation.code})
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold">
            {activeSubTab === 'harian'
              ? `${calendarDays.filter((d) => Boolean(d.record)).length} dari ${calendarDays.length} hari memiliki data`
              : monthlyRecap
              ? `${monthlyRecap.samplingDays} dari ${monthlyRecap.daysInMonth} hari sampling (${monthlyRecap.completenessPct.toFixed(1)}%)`
              : 'Menghitung...'}
          </span>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SUB-TAB 1: EVIDENCE HARIAN */}
      {activeSubTab === 'harian' && (
        <div className={`space-y-6 ${isPrintingModalOrBatch ? 'no-print' : ''}`}>
          {/* Table of calendar days in month */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">Tgl</th>
                    <th className="py-3 px-4">Hari &amp; Tanggal</th>
                    <th className="py-3 px-4 text-center">Data Lapangan</th>
                    <th className="py-3 px-4 text-center">Hasil Kualitas</th>
                    <th className="py-3 px-4 text-center">Status Dokumen</th>
                    <th className="py-3 px-4 text-center">No. Dokumen</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calendarDays.map((item) => {
                    const hasData = Boolean(item.record);
                    const isPassed = item.overall === 'MEMENUHI';
                    const isFailed = item.overall === 'TIDAK MEMENUHI';

                    return (
                      <tr
                        key={item.date}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !hasData ? 'opacity-60 bg-slate-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                          {item.dayNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {item.dayName}, {formatDateLocalIndonesian(item.date)}
                          </span>
                          {item.duplicateCount > 1 && (
                            <span className="inline-block text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium mt-0.5">
                              {item.duplicateCount} data pada hari ini (dipakai yang terakhir)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {hasData ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Ada Data
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                              Tidak ada data
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isFailed ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                              TIDAK MEMENUHI
                            </span>
                          ) : isPassed ? (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              MEMENUHI
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.statusDoc === 'Diperiksa' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              Diperiksa
                            </span>
                          )}
                          {item.statusDoc === 'Disiapkan' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <Clock className="w-3 h-3" />
                              Disiapkan
                            </span>
                          )}
                          {item.statusDoc === 'Draft' && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              Draft
                            </span>
                          )}
                          {item.statusDoc === 'Dibatalkan' && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 line-through">
                              Dibatalkan
                            </span>
                          )}
                          {item.statusDoc === 'Belum dibuat' && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                              Belum dibuat
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-700">
                          {item.report?.documentNo || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={!hasData}
                            onClick={() => {
                              setPreviewDate(item.date);
                              setErrorMessage(null);
                            }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-slate-800 hover:bg-slate-900 text-white shadow-xs flex items-center gap-1.5 ml-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Buka
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REKAP BULANAN */}
      {activeSubTab === 'bulanan' && monthlyRecap && (
        <div className={`space-y-6 ${isPrintingModalOrBatch ? 'no-print' : ''}`}>
          {/* 1. Monthly Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Hari Sampling */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Hari Sampling
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl md:text-2xl font-black text-slate-900 font-mono">
                  {monthlyRecap.samplingDays}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {monthlyRecap.daysInMonth} Hari
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold block">
                Kelengkapan: {monthlyRecap.completenessPct.toFixed(1)}%
              </span>
            </div>

            {/* Hari Memenuhi */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Hari Memenuhi
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl md:text-2xl font-black text-emerald-600 font-mono">
                  {monthlyRecap.passDays}
                </span>
                <span className="text-xs text-slate-400 font-mono">Hari</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Sesuai Baku Mutu
              </span>
            </div>

            {/* Hari Tidak Memenuhi */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Tidak Memenuhi
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl md:text-2xl font-black font-mono ${
                  monthlyRecap.failDays > 0 ? 'text-red-600' : 'text-slate-400'
                }`}>
                  {monthlyRecap.failDays}
                </span>
                <span className="text-xs text-slate-400 font-mono">Hari</span>
              </div>
              <span className={`text-[10px] font-semibold block ${
                monthlyRecap.failDays > 0 ? 'text-red-700' : 'text-slate-400'
              }`}>
                {monthlyRecap.failDays > 0 ? 'Melebihi Batas Ambang' : 'Nihil Pelanggaran'}
              </span>
            </div>

            {/* Tingkat Kepatuhan */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Kepatuhan (%)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl md:text-2xl font-black font-mono ${
                  monthlyRecap.compliancePct === null
                    ? 'text-slate-400'
                    : monthlyRecap.compliancePct === 100
                    ? 'text-emerald-600'
                    : 'text-amber-600'
                }`}>
                  {monthlyRecap.compliancePct !== null ? `${monthlyRecap.compliancePct.toFixed(1)}%` : '-'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">
                Baku Mutu Permen LH 113/2003
              </span>
            </div>

            {/* Status Dokumen Rekap */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1 col-span-2 md:col-span-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Status Dokumen
              </span>
              <div className="pt-0.5">
                {monthlyReport ? (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                    monthlyReport.status === 'Disetujui'
                      ? 'bg-emerald-600 text-white'
                      : monthlyReport.status === 'Diperiksa'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : monthlyReport.status === 'Disiapkan'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : monthlyReport.status === 'Dibatalkan'
                      ? 'bg-red-100 text-red-800 line-through'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {monthlyReport.status === 'Disetujui' && <ShieldCheck className="w-3.5 h-3.5" />}
                    {monthlyReport.status}
                  </span>
                ) : (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                    Belum Diterbitkan
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-600 font-mono truncate block mt-0.5">
                {monthlyReport?.documentNo || 'Format: FR-EMS-WQ-YYYY-MM'}
              </span>
            </div>
          </div>

          {/* 2. Warning Card: Missing Days */}
          {monthlyRecap.missingDays.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Tidak terdapat data pemantauan pada {monthlyRecap.missingDays.length} hari:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {monthlyRecap.missingDays.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 bg-white border border-amber-300 rounded text-[11px] font-mono text-amber-900 shadow-2xs font-semibold"
                  >
                    Tgl {parseInt(d.slice(8, 10), 10)}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                Hari tanpa data merupakan celah pemantauan dan tidak diisi angka nol. Pastikan log lapangan telah diinput sebelum pengesahan final.
              </p>
            </div>
          )}

          {/* 3. Warning Card: Non-compliant Days */}
          {monthlyRecap.failDays > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  Terdapat {monthlyRecap.failDays} hari pemantauan yang tidak memenuhi baku mutu lingkungan:
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {monthlyRecap.days
                  .filter((d) => d.status === 'tidak_memenuhi')
                  .map((d) => {
                    const failedNames = d.dailyEvidence?.failedParams || [];
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => {
                          setPreviewDate(d.date);
                          setErrorMessage(null);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-red-100 border border-red-300 rounded-lg text-xs font-semibold text-red-800 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Klik untuk membuka Evidence Harian tanggal ini"
                      >
                        <span className="font-mono font-bold">
                          Tgl {d.dayNumber}
                        </span>
                        <span className="text-[10px] text-red-600 font-normal">
                          ({failedNames.join(', ') || 'Parameter'})
                        </span>
                        <Eye className="w-3 h-3 text-red-600" />
                      </button>
                    );
                  })}
              </div>
              <p className="text-[11px] text-red-800/80 leading-relaxed">
                Klik kartu tanggal di atas untuk melihat dokumen Evidence Harian beserta catatan tindak lanjut perbaikan teknis.
              </p>
            </div>
          )}

          {/* 4. Warning: Hash Mismatch (Data Changed After Publish) */}
          {isMonthlyHashMismatch && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    Data Harian Berubah Setelah Rekap Diterbitkan
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Terdapat pembaruan data pemantauan harian. Dokumen resmi saat ini masih menampilkan snapshot saat terbit. Silakan terbitkan revisi resmi bila diperlukan.
                  </p>
                </div>
              </div>
              {canRevise && (
                <button
                  type="button"
                  onClick={() => handleOpenSign('revision_monthly')}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Terbitkan Revisi
                </button>
              )}
            </div>
          )}

          {/* 5. Main Action Toolbar */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Pratinjau Rekap */}
              <button
                type="button"
                onClick={() => setIsMonthlyPreviewOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                Pratinjau Rekap Bulanan
              </button>

              {/* Terbitkan Rekap Bulanan (Operator+) */}
              {(!monthlyReport || monthlyReport.status === 'Draft') && canPublish && (
                <button
                  type="button"
                  disabled={monthlyRecap.overall === 'BELUM ADA DATA'}
                  onClick={() => {
                    if (monthlyRecap.overall === 'BELUM ADA DATA') {
                      setErrorMessage('Penerbitan dokumen ditolak: Belum terdapat data pemantauan air limbah pada bulan ini.');
                      return;
                    }
                    if (monthlyRecap.failDays > 0 || monthlyRecap.missingDays.length > 0) {
                      setIsPublishConfirmOpen(true);
                    } else {
                      handleOpenSign('prepare_monthly');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                  title={monthlyRecap.overall === 'BELUM ADA DATA' ? 'Belum terdapat data pemantauan air limbah pada bulan ini' : undefined}
                >
                  <Send className="w-4 h-4" />
                  Terbitkan Rekap Bulanan
                </button>
              )}

              {/* Tanda Tangan Pemeriksa (Foreman+) */}
              {monthlyReport && monthlyReport.status === 'Disiapkan' && canReview && (
                <button
                  type="button"
                  onClick={() => {
                    if (monthlyReport.signatures.prepared?.email === user?.email) {
                      setErrorMessage('Pemeriksa tidak boleh orang yang sama dengan penyiap dokumen.');
                      return;
                    }
                    handleOpenSign('review_monthly');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <PenTool className="w-4 h-4" />
                  Tanda Tangan Pemeriksa
                </button>
              )}

              {/* Tanda Tangan Persetujuan (Manager / Admin) */}
              {monthlyReport && monthlyReport.status === 'Diperiksa' && canApprove && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      monthlyReport.signatures.prepared?.email === user?.email ||
                      monthlyReport.signatures.reviewed?.email === user?.email
                    ) {
                      setErrorMessage('Penyetuju dokumen tidak boleh orang yang sama dengan penyiap atau pemeriksa dokumen.');
                      return;
                    }
                    handleOpenSign('approve_monthly');
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  Tanda Tangan Persetujuan
                </button>
              )}

              {/* Batalkan Dokumen (Admin) */}
              {monthlyReport && monthlyReport.status !== 'Dibatalkan' && canCancel && (
                <button
                  type="button"
                  onClick={() => setIsMonthlyCancelModalOpen(true)}
                  className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Batalkan
                </button>
              )}
            </div>

            {/* Utility Export & Batch Print Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Batch Daily Print */}
              <button
                type="button"
                onClick={handleBatchDailyPrint}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
                title="Cetak berturut-turut seluruh dokumen evidence harian bulan ini"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                Cetak Semua Evidence Harian
              </button>

              {/* Export Excel (.xlsx) */}
              <button
                type="button"
                onClick={handleExportMonthlyExcel}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                Export Rekap Harian (.xlsx)
              </button>
            </div>
          </div>

          {/* 6. Document Preview Card Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-800" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Tinjauan Dokumen Evidence Bulanan &amp; Lampiran
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMonthlyPreviewOpen(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Layar Penuh
                </button>
              </div>
            </div>

            {/* In-page Render of Monthly Document */}
            <div className="overflow-x-auto bg-slate-100/60 p-4 rounded-2xl flex justify-center">
              <MonthlyEvidenceDocument
                report={monthlyReport}
                records={wastewater}
                locationCode={selectedLocation.code}
                locationName={selectedLocation.name}
                docSuffix={selectedLocation.docSuffix}
                year={yearNum}
                month={monthNum}
                dailyReportsMap={dailyReportsMap}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW HARIAN & TOOLBAR */}
      {previewDate && activeDayItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-300">
            {/* Modal Header & Action Toolbar */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
              <div>
                <h3 className="text-sm md:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-700" />
                  Pratinjau Dokumen Evidence Harian
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Titik {selectedLocation.name} ({selectedLocation.code}) &bull; {formatDateLocalIndonesian(previewDate)}
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Print button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak / PDF (A4)
                </button>

                {/* Publish button if not yet published */}
                {(!activeDayItem.report || activeDayItem.report.status === 'Draft') && canPublish && (
                  <button
                    type="button"
                    disabled={!activeDayItem.record?.hasPhoto}
                    onClick={() => handleOpenSign('prepare')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Terbitkan Dokumen
                  </button>
                )}

                {/* Reviewer signature button if published & awaiting review */}
                {activeDayItem.report && activeDayItem.report.status === 'Disiapkan' && canReview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeDayItem.report?.signatures.prepared?.email === user?.email) {
                        setErrorMessage('Pemeriksa tidak boleh orang yang sama dengan penyiap dokumen.');
                        return;
                      }
                      handleOpenSign('review');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PenTool className="w-4 h-4" />
                    Tanda Tangan Pemeriksa
                  </button>
                )}

                {/* Revision button if data changed */}
                {isDailyHashMismatch && canRevise && (
                  <button
                    type="button"
                    onClick={() => handleOpenSign('revision')}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Terbitkan Revisi
                  </button>
                )}

                {/* Cancel button for Admin */}
                {activeDayItem.report && activeDayItem.report.status !== 'Dibatalkan' && canCancel && (
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Batalkan
                  </button>
                )}

                {/* Close modal */}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDate(null);
                    setErrorMessage(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Warning: Photo not attached */}
            {!activeDayItem.record?.hasPhoto && (!activeDayItem.report || activeDayItem.report.status === 'Draft') && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-800 font-medium flex items-center gap-2 no-print">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Evidence belum lengkap:</strong> Foto sampling belum dilampirkan pada catatan pemantauan. Dokumen dapat dicetak sebagai draft tetapi tidak dapat diterbitkan sebelum foto dilengkapi.
                </span>
              </div>
            )}

            {/* Warning: Data changed after document published */}
            {isDailyHashMismatch && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-800 font-medium flex items-center justify-between no-print">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Pemberitahuan Audit:</strong> Data sumber air limbah mengalami perubahan setelah dokumen ini terbit. Nilai tercetak tetap menggunakan snapshot saat terbit. Environment Superintendent dapat menerbitkan revisi resmi.
                  </span>
                </div>
              </div>
            )}

            {/* Modal Body: A4 Document Preview */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-200/60 flex justify-center">
              <DailyEvidenceDocument
                report={activeDayItem.report}
                currentRecord={activeDayItem.record}
                locationCode={selectedLocation.code}
                locationName={selectedLocation.name}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL FULLSCREEN PREVIEW REKAP BULANAN */}
      {isMonthlyPreviewOpen && monthlyRecap && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-300">
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
              <div>
                <h3 className="text-sm md:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-700" />
                  Pratinjau Dokumen Evidence Bulanan (Rekapitulasi)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Titik {selectedLocation.name} ({selectedLocation.code}) &bull; Periode {selectedMonth}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Print button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak / Simpan PDF (A4)
                </button>

                {/* Close modal */}
                <button
                  type="button"
                  onClick={() => setIsMonthlyPreviewOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-200/60 flex justify-center">
              <MonthlyEvidenceDocument
                report={monthlyReport}
                records={wastewater}
                locationCode={selectedLocation.code}
                locationName={selectedLocation.name}
                docSuffix={selectedLocation.docSuffix}
                year={yearNum}
                month={monthNum}
                dailyReportsMap={dailyReportsMap}
              />
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG: PUBLISH WITH MISSING OR FAIL DAYS */}
      {isPublishConfirmOpen && monthlyRecap && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-amber-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Konfirmasi Penerbitan Dokumen</h4>
                <p className="text-xs text-slate-500">Evidence Bulanan: Periode {selectedMonth}</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Terdapat <strong>{monthlyRecap.failDays} hari tidak memenuhi baku mutu</strong> dan <strong>{monthlyRecap.missingDays.length} hari tanpa data pemantauan</strong>.
            </p>

            {failDaysWithoutFollowUp.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <span className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Peringatan Tindak Lanjut:
                </span>
                Terdapat <strong>{failDaysWithoutFollowUp.length} hari tidak patuh</strong> yang belum memiliki Rencana Tindak Lanjut pada Evidence Harian (Tanggal: {failDaysWithoutFollowUp.join(', ')}). Rencana perbaikan sangat dianjurkan untuk pemenuhan audit PROPER, namun <em>tidak memblokir</em> penerbitan rekapitulasi bulanan ini.
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Setelah diterbitkan, rekapitulasi ini akan dikunci dalam bentuk snapshot kriptografis resmi untuk diajukan ke pemeriksa. Yakin ingin menerbitkan rekap?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPublishConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPublishConfirmOpen(false);
                  handleOpenSign('prepare_monthly');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Lanjutkan Terbitkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DAILY PRINT PROGRESS MODAL */}
      {batchPrintProgress.isOpen && (
        <div className="fixed inset-0 z-70 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
              <Printer className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Mempersiapkan Cetak Semua Evidence Harian
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Mengunduh bukti foto visual dan memverifikasi kelengkapan halaman...
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300"
                  style={{
                    width: `${batchPrintProgress.total > 0 ? (batchPrintProgress.current / batchPrintProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800">
                Memuat foto {batchPrintProgress.current} / {batchPrintProgress.total} hari ({Math.round(batchPrintProgress.total > 0 ? (batchPrintProgress.current / batchPrintProgress.total) * 100 : 0)}%)
              </span>
            </div>

            {batchPrintProgress.status === 'ready' && (
              <p className="text-xs text-slate-500 italic">
                Membuka kotak dialog cetak peramban...
              </p>
            )}
          </div>
        </div>
      )}

      {/* HIDDEN BATCH PRINT CONTAINER (FOR WINDOW.PRINT ONLY) */}
      {isBatchPrintingActive && (
        <div className="print-only hidden">
          {batchDailyItems.map((item) => (
            <div
              key={item.date}
              className="break-after-page page-break-after-always"
              style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              <DailyEvidenceDocument
                report={item.report}
                currentRecord={item.record}
                locationCode={selectedLocation.code}
                locationName={selectedLocation.name}
                preloadedPhoto={preloadedPhotos[item.date]}
              />
            </div>
          ))}
        </div>
      )}

      {/* SIGNING DIALOG (DAILY & MONTHLY) */}
      {isSigningOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-900">
                {signingType === 'prepare' && 'Tanda Tangan Penyiap Dokumen Harian'}
                {signingType === 'review' && 'Tanda Tangan Pemeriksa Dokumen Harian'}
                {signingType === 'revision' && 'Tanda Tangan Penerbit Revisi Harian'}
                {signingType === 'prepare_monthly' && 'Tanda Tangan Penyiap Rekap Bulanan'}
                {signingType === 'review_monthly' && 'Tanda Tangan Pemeriksa Rekap Bulanan'}
                {signingType === 'approve_monthly' && 'Tanda Tangan Pengesahan (Persetujuan)'}
                {signingType === 'revision_monthly' && 'Tanda Tangan Penerbit Revisi Rekap'}
              </h4>
              <button
                type="button"
                onClick={() => setIsSigningOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If TIDAK MEMENUHI and preparing daily, require Follow-up Action */}
            {signingType === 'prepare' && activeEvalResult?.overall === 'TIDAK MEMENUHI' && (
              <div className="space-y-1.5 p-3 bg-red-50 rounded-xl border border-red-200">
                <label className="block text-xs font-bold text-red-800">
                  Rencana Tindak Lanjut Perbaikan (Wajib, min. 10 karakter):
                </label>
                <textarea
                  rows={2}
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  placeholder="Contoh: Penambahan dosis kapur tohor (quicklime) pada kompartemen 2 dan evaluasi debit..."
                  className="w-full bg-white border border-red-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            )}

            {/* If Revision, require Revision Reason */}
            {(signingType === 'revision' || signingType === 'revision_monthly') && (
              <div className="space-y-1.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <label className="block text-xs font-bold text-amber-800">
                  Alasan Penerbitan Revisi (Wajib):
                </label>
                <input
                  type="text"
                  value={revisionReasonInput}
                  onChange={(e) => setRevisionReasonInput(e.target.value)}
                  placeholder="Contoh: Koreksi pembacaan in-situ atau penyesuaian data lapangan..."
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            {/* Pernyataan Kebenaran Data */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-emerald-950">
                <input
                  type="checkbox"
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5 cursor-pointer"
                />
                <span>Saya menyatakan data pada dokumen ini benar dan sesuai catatan pemantauan lapangan.</span>
              </label>
            </div>

            {/* Quick use saved user signature */}
            {savedUserSig && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 block">
                    Gunakan Tanda Tangan Tersimpan
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Tanda tangan akun {user?.email}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={
                    isSubmitting || 
                    !declarationAccepted ||
                    (signingType === 'prepare' && activeEvalResult?.overall === 'TIDAK MEMENUHI' && followUpInput.trim().length < 10) ||
                    ((signingType === 'revision' || signingType === 'revision_monthly') && !revisionReasonInput.trim())
                  }
                  onClick={() => handleSubmitSignature(savedUserSig)}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Memproses...' : 'Terapkan'}
                </button>
              </div>
            )}

            {/* Or draw new signature on pad */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">
                Atau goreskan tanda tangan baru:
              </span>
              <SignaturePad
                onSave={(sigDataUrl) => {
                  if (!declarationAccepted) {
                    setErrorMessage('Harap centang konfirmasi pernyataan kebenaran data terlebih dahulu.');
                    return;
                  }
                  if (signingType === 'prepare' && activeEvalResult?.overall === 'TIDAK MEMENUHI' && followUpInput.trim().length < 10) {
                    setErrorMessage('Rencana tindak lanjut perbaikan wajib diisi minimal 10 karakter.');
                    return;
                  }
                  if ((signingType === 'revision' || signingType === 'revision_monthly') && !revisionReasonInput.trim()) {
                    setErrorMessage('Alasan penerbitan revisi wajib diisi.');
                    return;
                  }
                  if (user?.uid) {
                    signatureService.saveUserSignature(user.uid, sigDataUrl).catch(() => {});
                  }
                  handleSubmitSignature(sigDataUrl);
                }}
                onCancel={() => setIsSigningOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL (DAILY) */}
      {isCancelModalOpen && activeDayItem?.report && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Batalkan Dokumen Evidence Harian</h4>
                <p className="text-xs text-slate-500">Nomor: {activeDayItem.report.documentNo}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Dokumen yang dibatalkan tidak akan dihapus dari audit trail, melainkan diberi watermark permanen &ldquo;DIBATALKAN&rdquo; sesuai standar kepatuhan ISO 14001.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Alasan Pembatalan (Wajib, min. 10 karakter):
              </label>
              <textarea
                rows={3}
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="Contoh: Kesalahan input sampling pada titik yang berbeda saat kalibrasi sensor..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={cancelReasonInput.trim().length < 10 || isSubmitting}
                onClick={handleCancelReport}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Membatalkan...' : 'Konfirmasi Batalkan Dokumen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL (MONTHLY) */}
      {isMonthlyCancelModalOpen && monthlyReport && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Batalkan Dokumen Rekap Bulanan</h4>
                <p className="text-xs text-slate-500">Nomor: {monthlyReport.documentNo}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Dokumen rekap bulanan yang dibatalkan akan ditandai dengan watermark &ldquo;DIBATALKAN&rdquo; pada audit trail ISO 14001 dan status verifikasi publik.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Alasan Pembatalan (Wajib, min. 10 karakter):
              </label>
              <textarea
                rows={3}
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="Contoh: Kesalahan penetapan periode atau pembaruan menyeluruh titik sampling..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMonthlyCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={cancelReasonInput.trim().length < 10 || isSubmitting}
                onClick={handleCancelMonthlyReport}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Membatalkan...' : 'Konfirmasi Batalkan Rekap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
