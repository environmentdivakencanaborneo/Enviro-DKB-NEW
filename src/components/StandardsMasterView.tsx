/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  EnvironmentalStandard,
  InternalThresholdsConfig,
  StandardEffectiveStatus,
  StandardMedia,
  StandardVerificationStatus,
} from '../types';
import { INITIAL_STANDARDS_SEED } from '../data/regulations';
import { standardsService, internalThresholdsService } from '../services/dbService';
import { triggerToast } from '../utils/errorHandler';
import { todayLocalISO } from '../utils/dateUtils';
import { formatStandardLimitDisplay, parseStrictNumber } from '../utils/waterQualityEval';
import {
  Sliders,
  Plus,
  AlertTriangle,
  Pencil,
  Trash2,
  Database,
  ShieldCheck,
  History,
  ExternalLink,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

interface StandardsMasterViewProps {
  standards: EnvironmentalStandard[];
  internalThresholds: InternalThresholdsConfig;
  canManage: boolean;
  canDelete?: boolean;
}

export default function StandardsMasterView({
  standards,
  internalThresholds,
  canManage,
  canDelete = false,
}: StandardsMasterViewProps) {
  const [activeTab, setActiveTab] = useState<'standards' | 'thresholds'>('standards');
  const [mediaFilter, setMediaFilter] = useState<'all' | StandardMedia>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [media, setMedia] = useState<StandardMedia>('air_limbah');
  const [parameterKey, setParameterKey] = useState('tss');
  const [parameterLabel, setParameterLabel] = useState('');
  const [unit, setUnit] = useState('mg/L');
  const [minLimitStr, setMinLimitStr] = useState('');
  const [maxLimitStr, setMaxLimitStr] = useState('');
  const [basisRegulasi, setBasisRegulasi] = useState('');
  const [kelasAir, setKelasAir] = useState<'' | 'I' | 'II' | 'III' | 'IV'>('II');
  const [locationCode, setLocationCode] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(todayLocalISO());
  const [effectiveTo, setEffectiveTo] = useState('');
  const [approvalDocNo, setApprovalDocNo] = useState('');
  const [decreeDate, setDecreeDate] = useState('');
  const [sourceDocument, setSourceDocument] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [effectiveStatus, setEffectiveStatus] = useState<StandardEffectiveStatus>('MENUNGGU VERIFIKASI');
  const [applicable, setApplicable] = useState(true);
  const [revisionReason, setRevisionReason] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<StandardVerificationStatus>('Perlu verifikasi');
  const [notes, setNotes] = useState('');

  const [warningRatio, setWarningRatio] = useState(internalThresholds.warningRatio ?? 0.85);
  const [phMargin, setPhMargin] = useState(internalThresholds.phMargin ?? 0.3);
  const [solidWasteTargetPct, setSolidWasteTargetPct] = useState(internalThresholds.solidWasteTargetPct ?? 30);

  useEffect(() => {
    setWarningRatio(internalThresholds.warningRatio ?? 0.85);
    setPhMargin(internalThresholds.phMargin ?? 0.3);
    setSolidWasteTargetPct(internalThresholds.solidWasteTargetPct ?? 30);
  }, [internalThresholds]);

  const displayList: EnvironmentalStandard[] =
    standards.length > 0 ? standards : (INITIAL_STANDARDS_SEED as EnvironmentalStandard[]);

  const filteredStandards =
    mediaFilter === 'all' ? displayList : displayList.filter((s) => s.media === mediaFilter);

  const unverifiedList = displayList.filter(
    (s) => s.isActive && (s.verificationStatus === 'Perlu verifikasi' || s.effectiveStatus === 'MENUNGGU VERIFIKASI')
  );

  const isSeedPreviewOnly = standards.length === 0;

  const resetForm = () => {
    setEditingId(null);
    setMedia('air_limbah');
    setParameterKey('tss');
    setParameterLabel('');
    setUnit('mg/L');
    setMinLimitStr('');
    setMaxLimitStr('');
    setBasisRegulasi('');
    setKelasAir('II');
    setLocationCode('');
    setEffectiveFrom(todayLocalISO());
    setEffectiveTo('');
    setApprovalDocNo('');
    setDecreeDate('');
    setSourceDocument('');
    setSourceUrl('');
    setEffectiveStatus('MENUNGGU VERIFIKASI');
    setApplicable(true);
    setRevisionReason('');
    setIsActive(true);
    setVerificationStatus('Perlu verifikasi');
    setNotes('');
  };

  const startEdit = (std: EnvironmentalStandard) => {
    setEditingId(std.id);
    setMedia(std.media);
    setParameterKey(std.parameterKey);
    setParameterLabel(std.parameterLabel);
    setUnit(std.unit);
    setMinLimitStr(std.minLimit !== null && std.minLimit !== undefined ? String(std.minLimit) : '');
    setMaxLimitStr(std.maxLimit !== null && std.maxLimit !== undefined ? String(std.maxLimit) : '');
    setBasisRegulasi(std.basisRegulasi);
    setKelasAir(std.kelasAir || 'II');
    setLocationCode(std.locationCode || '');
    setEffectiveFrom(std.effectiveFrom || todayLocalISO());
    setEffectiveTo(std.effectiveTo || '');
    setApprovalDocNo(std.approvalDocNo || '');
    setDecreeDate(std.decreeDate || '');
    setSourceDocument(std.sourceDocument || '');
    setSourceUrl(std.sourceUrl || '');
    setEffectiveStatus(std.effectiveStatus || (std.verificationStatus === 'Terverifikasi' ? 'BERLAKU' : 'MENUNGGU VERIFIKASI'));
    setApplicable(std.applicable !== false);
    setRevisionReason('');
    setIsActive(std.isActive);
    setVerificationStatus(std.verificationStatus || 'Terverifikasi');
    setNotes(std.notes || '');
    setShowForm(true);
  };

  const handleSeedDefaults = async () => {
    try {
      setIsSaving(true);
      const res = await standardsService.seedDefaults();
      triggerToast(`Baku mutu bawaan dimuat: ${res.inserted} ditambahkan, ${res.skipped} sudah ada.`, 'success');
    } catch (err: any) {
      triggerToast(err.message || 'Gagal menginisialisasi baku mutu bawaan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickVerify = async (std: EnvironmentalStandard) => {
    if (isSeedPreviewOnly) {
      triggerToast('Klik "Muat Baku Mutu Default" terlebih dahulu untuk menyimpan master ke Firestore.', 'warning');
      return;
    }
    try {
      setIsSaving(true);
      await standardsService.update(
        std.id,
        { verificationStatus: 'Terverifikasi', effectiveStatus: 'BERLAKU' },
        'Verifikasi dokumen resmi oleh Superintendent/Admin'
      );
      triggerToast(`Parameter ${std.parameterLabel} telah ditandai Terverifikasi & BERLAKU.`, 'success');
    } catch (err: any) {
      triggerToast(err.message || 'Gagal memverifikasi baku mutu.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    const minVal = minLimitStr.trim() === '' ? null : parseStrictNumber(minLimitStr);
    const maxVal = maxLimitStr.trim() === '' ? null : parseStrictNumber(maxLimitStr);
    if (minLimitStr.trim() !== '' && minVal === null) {
      triggerToast('Batas minimum harus berupa angka valid atau dikosongkan.', 'error');
      return;
    }
    if (maxLimitStr.trim() !== '' && maxVal === null) {
      triggerToast('Batas maksimum harus berupa angka valid atau dikosongkan.', 'error');
      return;
    }

    const payload: Omit<EnvironmentalStandard, 'id'> = {
      media,
      parameterKey: parameterKey.trim(),
      parameterLabel: parameterLabel.trim() || parameterKey.trim(),
      unit: unit.trim() || '-',
      minLimit: minVal,
      maxLimit: maxVal,
      basisRegulasi: basisRegulasi.trim(),
      approvalDocNo: approvalDocNo.trim() || undefined,
      decreeDate: decreeDate.trim() || undefined,
      effectiveFrom,
      effectiveTo: effectiveTo.trim() || undefined,
      sourceDocument: sourceDocument.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      effectiveStatus,
      applicable,
      kelasAir: media === 'air_permukaan' ? (kelasAir || 'II') : undefined,
      locationCode: locationCode.trim() ? locationCode.trim().toUpperCase() : undefined,
      isActive,
      verificationStatus,
      notes: notes.trim() || undefined,
    };

    try {
      setIsSaving(true);
      if (editingId && !isSeedPreviewOnly) {
        await standardsService.update(editingId, payload, revisionReason.trim() || undefined);
        triggerToast('Baku mutu berhasil diperbarui dan dicatat dalam riwayat revisi.', 'success');
      } else {
        await standardsService.add(editingId ? { ...payload, id: editingId } : payload);
        triggerToast('Baku mutu berhasil ditambahkan.', 'success');
      }
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      triggerToast(err.message || 'Gagal menyimpan baku mutu.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStandard = async (std: EnvironmentalStandard) => {
    if (isSeedPreviewOnly) return;
    try {
      setIsSaving(true);
      await standardsService.delete(std.id);
      triggerToast(`Baku mutu ${std.parameterLabel} dihapus.`, 'success');
    } catch (err: any) {
      triggerToast(err.message || 'Gagal menghapus baku mutu.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await internalThresholdsService.save({
        warningRatio: Number(warningRatio),
        phMargin: Number(phMargin),
        solidWasteTargetPct: Number(solidWasteTargetPct),
      });
      triggerToast('Konfigurasi ambang internal berhasil disimpan.', 'success');
    } catch (err: any) {
      triggerToast(err.message || 'Gagal menyimpan ambang internal.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const mediaLabel = (m: StandardMedia) => {
    if (m === 'air_limbah') return 'Air Limbah';
    if (m === 'air_limbah_domestik') return 'Air Limbah Domestik';
    if (m === 'air_permukaan') return 'Air Permukaan';
    if (m === 'udara') return 'Udara & Emisi';
    if (m === 'kebisingan') return 'Kebisingan';
    return 'Lainnya';
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-hi text-left">
      <div className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 border border-neon-cyan/35 flex items-center justify-center text-neon-cyan shadow-glow-cyan shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-hi font-heading">
              Master Baku Mutu Lingkungan &amp; Konfigurasi Ambang Internal
            </h3>
            <p className="text-xs text-text-mid mt-0.5">
              Pengelolaan koleksi <code className="font-mono font-bold text-neon-cyan">standards/{'{id}'}</code> (termasuk Air Limbah Domestik Permen LH/BPLH 11/2025) &amp; <code className="font-mono font-bold text-neon-cyan">app_meta/env_thresholds</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-border-neon bg-bg-2/60 rounded-t-2xl px-4 pt-2 border-x border-t border-border-neon">
        <button
          type="button"
          onClick={() => setActiveTab('standards')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'standards' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-text-mid hover:text-text-hi'
          }`}
        >
          Master Baku Mutu ({displayList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('thresholds')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'thresholds' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-text-mid hover:text-text-hi'
          }`}
        >
          Ambang Internal &amp; Target Sampah
        </button>
      </div>

      {activeTab === 'standards' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          {unverifiedList.length > 0 && (
            <div className="p-3.5 rounded-xl bg-neon-amber/10 border border-neon-amber/35 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-neon-amber">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>PERLU VERIFIKASI MANUAL ({unverifiedList.length} Parameter Baku Mutu)</span>
              </div>
              <p className="text-text-mid">
                Parameter berikut memiliki status <strong className="text-text-hi">Perlu verifikasi / MENUNGGU VERIFIKASI</strong> dan tidak dapat menghasilkan kesimpulan <strong className="text-text-hi">MEMENUHI</strong> sebelum nilai batas resmi diverifikasi dari dokumen SK Pertek/regulasi:{' '}
                <span className="font-mono text-text-hi">
                  {unverifiedList.map((u) => `${u.parameterLabel}${u.approvalDocNo ? ` (${u.approvalDocNo})` : ''}`).join(', ')}
                </span>
              </p>
            </div>
          )}

          {isSeedPreviewOnly && (
            <div className="p-3.5 rounded-xl bg-neon-amber/10 border border-neon-amber/35 text-neon-amber text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-neon-amber shrink-0 mt-0.5" />
                <span>
                  Koleksi <code className="font-mono font-bold">standards</code> di Firestore masih kosong. Klik tombol di samping untuk memuat master baku mutu ke database.
                </span>
              </div>
              {canManage && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSeedDefaults}
                  className="px-3 py-1.5 bg-neon-amber hover:brightness-110 text-[#04121A] font-bold rounded-lg text-[11px] flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  Muat Baku Mutu Default
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-text-mid">Media:</label>
              <select
                value={mediaFilter}
                onChange={(e) => setMediaFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs cursor-pointer"
              >
                <option value="all">Semua Media</option>
                <option value="air_limbah">Air Limbah Tambang</option>
                <option value="air_limbah_domestik">Air Limbah Domestik (Permen LH 11/2025)</option>
                <option value="air_permukaan">Air Permukaan (Sungai)</option>
                <option value="udara">Udara &amp; Emisi</option>
                <option value="kebisingan">Kebisingan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                {!isSeedPreviewOnly && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSeedDefaults}
                    className="px-3 py-1.5 bg-bg-1 border border-border-neon hover:bg-bg-2 text-text-hi font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-neon-cyan" />
                    Sinkronkan Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(!showForm);
                  }}
                  className="px-3.5 py-1.5 neon-btn-primary rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showForm ? 'Tutup Form' : 'Tambah Parameter'}
                </button>
              </div>
            )}
          </div>

          {showForm && canManage && (
            <form onSubmit={handleSaveStandard} className="p-4 rounded-xl border border-neon-cyan/30 bg-neon-cyan/5 space-y-3">
              <h4 className="text-xs font-bold text-neon-cyan border-b border-border-neon pb-1.5 font-heading">
                {editingId ? `Edit Baku Mutu (${editingId})` : 'Tambah Parameter Baku Mutu Baru'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Media *</label>
                  <select value={media} onChange={(e) => setMedia(e.target.value as StandardMedia)} className="w-full px-3 py-1.5 text-xs">
                    <option value="air_limbah">Air Limbah Tambang</option>
                    <option value="air_limbah_domestik">Air Limbah Domestik (Permen LH 11/2025)</option>
                    <option value="air_permukaan">Air Permukaan</option>
                    <option value="udara">Udara &amp; Emisi</option>
                    <option value="kebisingan">Kebisingan</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Key Parameter *</label>
                  <input type="text" required placeholder="ph / bod / cod / tss / oilgrease / ammonia / totalcoliform" value={parameterKey} onChange={(e) => setParameterKey(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Label Parameter *</label>
                  <input type="text" required value={parameterLabel} onChange={(e) => setParameterLabel(e.target.value)} className="w-full px-3 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Satuan *</label>
                  <input type="text" required value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Batas Minimum</label>
                  <input type="text" inputMode="decimal" value={minLimitStr} onChange={(e) => setMinLimitStr(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Batas Maksimum</label>
                  <input type="text" inputMode="decimal" value={maxLimitStr} onChange={(e) => setMaxLimitStr(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Basis Regulasi / SK Pertek *</label>
                  <input type="text" required value={basisRegulasi} onChange={(e) => setBasisRegulasi(e.target.value)} className="w-full px-3 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Nomor SK / Pertek</label>
                  <input type="text" placeholder="cth: 600.4/865/B.III.2/DLH/2025" value={approvalDocNo} onChange={(e) => setApprovalDocNo(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Tanggal Penetapan SK</label>
                  <input type="date" value={decreeDate} onChange={(e) => setDecreeDate(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Berlaku Mulai *</label>
                  <input type="date" required value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Berlaku Sampai (Opsional)</label>
                  <input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Status Berlaku *</label>
                  <select value={effectiveStatus} onChange={(e) => setEffectiveStatus(e.target.value as StandardEffectiveStatus)} className="w-full px-3 py-1.5 text-xs font-mono">
                    <option value="DRAFT">DRAFT</option>
                    <option value="MENUNGGU VERIFIKASI">MENUNGGU VERIFIKASI</option>
                    <option value="BERLAKU">BERLAKU</option>
                    <option value="DIUBAH">DIUBAH</option>
                    <option value="DICABUT">DICABUT</option>
                  </select>
                </div>
                {media === 'air_permukaan' && (
                  <div>
                    <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Kelas Air (PP 22/2021)</label>
                    <select value={kelasAir} onChange={(e) => setKelasAir(e.target.value as any)} className="w-full px-3 py-1.5 text-xs">
                      <option value="I">Kelas I</option>
                      <option value="II">Kelas II</option>
                      <option value="III">Kelas III</option>
                      <option value="IV">Kelas IV</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Kode Lokasi (Opsional)</label>
                  <input type="text" value={locationCode} onChange={(e) => setLocationCode(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Verifikasi Hukum *</label>
                  <select value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value as StandardVerificationStatus)} className="w-full px-3 py-1.5 text-xs">
                    <option value="Terverifikasi">Terverifikasi (Evaluasi Kepatuhan Aktif)</option>
                    <option value="Perlu verifikasi">Perlu verifikasi (Belum dapat disimpulkan MEMENUHI)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Dokumen Sumber</label>
                  <input type="text" placeholder="cth: SK Bupati / Lampiran VI" value={sourceDocument} onChange={(e) => setSourceDocument(e.target.value)} className="w-full px-3 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">URL Sumber Resmi</label>
                  <input type="url" placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className="w-full px-3 py-1.5 text-xs font-mono" />
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-text-hi cursor-pointer">
                    <input id="master-std-active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-neon-cyan rounded" />
                    <span>Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-text-hi cursor-pointer">
                    <input type="checkbox" checked={applicable} onChange={(e) => setApplicable(e.target.checked)} className="accent-neon-cyan rounded" />
                    <span>Berlaku di Titik (Applicable)</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-mid uppercase mb-1 font-mono">Catatan Teknis</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-1.5 text-xs" />
                </div>
                {editingId && (
                  <div>
                    <label className="block text-[10px] font-bold text-neon-amber uppercase mb-1 font-mono">Alasan Revisi / Perubahan</label>
                    <input type="text" placeholder="Catat alasan revisi parameter untuk riwayat..." value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} className="w-full px-3 py-1.5 text-xs" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { resetForm(); setShowForm(false); }} className="px-3 py-1.5 text-xs text-text-mid hover:text-text-hi cursor-pointer">Batal</button>
                <button type="submit" disabled={isSaving} className="px-4 py-1.5 neon-btn-primary text-xs rounded-lg cursor-pointer">
                  {isSaving ? 'Menyimpan...' : 'Simpan Baku Mutu'}
                </button>
              </div>
            </form>
          )}

          <div className="border border-border-neon rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="neon-table w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase">
                    <th className="p-3">Media &amp; Parameter</th>
                    <th className="p-3 text-center">Ambang Batas</th>
                    <th className="p-3">Basis Regulasi &amp; SK</th>
                    <th className="p-3 text-center">Status &amp; Verifikasi</th>
                    {canManage && <th className="p-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredStandards.map((std) => (
                    <React.Fragment key={std.id}>
                      <tr>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-bg-2 text-text-hi border border-border-subtle font-semibold">{mediaLabel(std.media)}</span>
                            {std.kelasAir && <span className="text-[10px] px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 font-mono">Kelas {std.kelasAir}</span>}
                            {std.locationCode && <span className="text-[10px] px-2 py-0.5 rounded bg-neon-violet/10 text-neon-violet border border-neon-violet/30 font-mono">{std.locationCode}</span>}
                            {std.applicable === false && <span className="text-[10px] px-2 py-0.5 rounded bg-bg-2 text-text-low border border-border-subtle font-mono">Tidak Berlaku</span>}
                          </div>
                          <div className="font-bold text-text-hi mt-1">
                            {std.parameterLabel} <span className="text-[10px] font-mono text-text-low">({std.parameterKey})</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono tabular-nums font-bold text-neon-cyan">
                          {formatStandardLimitDisplay(std)} {std.unit}
                        </td>
                        <td className="p-3 text-[11px] text-text-mid max-w-xs">
                          <span className="block font-medium text-text-hi">{std.basisRegulasi}</span>
                          {std.approvalDocNo && <span className="block text-[10px] font-mono text-neon-cyan mt-0.5">SK: {std.approvalDocNo}{std.decreeDate ? ` (${std.decreeDate})` : ''}</span>}
                          <span className="block text-[10px] font-mono text-text-low">
                            Berlaku: {std.effectiveFrom || '-'}{std.effectiveTo ? ` s.d. ${std.effectiveTo}` : ''}
                          </span>
                          {std.sourceUrl && (
                            <a href={std.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-neon-cyan hover:underline mt-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> Dokumen Sumber
                            </a>
                          )}
                        </td>
                        <td className="p-3 text-center space-y-1">
                          <div>
                            <StatusBadge
                              status={std.verificationStatus === 'Terverifikasi' ? 'Safe' : 'Perlu Verifikasi'}
                              label={std.verificationStatus === 'Terverifikasi' ? 'Terverifikasi' : 'Perlu verifikasi'}
                            />
                          </div>
                          {std.effectiveStatus && (
                            <div className="text-[10px] font-mono text-text-mid">{std.effectiveStatus}</div>
                          )}
                        </td>
                        {canManage && (
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {std.verificationStatus === 'Perlu verifikasi' && !isSeedPreviewOnly && (
                                <button type="button" onClick={() => handleQuickVerify(std)} className="px-2 py-1 text-[10px] font-bold bg-neon-green/15 hover:bg-neon-green/25 text-neon-green border border-neon-green/35 rounded-lg cursor-pointer flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Verifikasi
                                </button>
                              )}
                              {std.revisionHistory && std.revisionHistory.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedHistoryId(expandedHistoryId === std.id ? null : std.id)}
                                  className="p-1.5 text-neon-amber hover:bg-neon-amber/15 rounded-lg cursor-pointer"
                                  title={`Riwayat Revisi (${std.revisionHistory.length})`}
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button type="button" onClick={() => startEdit(std)} className="p-1.5 text-neon-cyan hover:bg-neon-cyan/15 rounded-lg cursor-pointer" title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {canDelete && !isSeedPreviewOnly && (
                                <button type="button" onClick={() => handleDeleteStandard(std)} className="p-1.5 text-neon-red hover:bg-neon-red/15 rounded-lg cursor-pointer" title="Hapus">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                      {expandedHistoryId === std.id && std.revisionHistory && (
                        <tr>
                          <td colSpan={canManage ? 5 : 4} className="p-3 bg-bg-0/80 border-t border-border-subtle">
                            <div className="text-[11px] font-bold text-neon-amber mb-1.5">Riwayat Perubahan Baku Mutu ({std.id}):</div>
                            <div className="space-y-1">
                              {std.revisionHistory.map((rev, rIdx) => (
                                <div key={rIdx} className="text-[10px] font-mono text-text-mid flex flex-wrap gap-2">
                                  <span className="text-text-hi">{rev.revisedAt}</span>
                                  <span>oleh {rev.revisedBy}</span>
                                  <span>• Min: {rev.previousSnapshot?.minLimit ?? '-'} / Max: {rev.previousSnapshot?.maxLimit ?? '-'}</span>
                                  <span>• Status: {rev.previousSnapshot?.effectiveStatus || '-'}</span>
                                  <span className="text-neon-cyan">({rev.reason})</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'thresholds' && (
        <form onSubmit={handleSaveThresholds} className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="p-4 rounded-xl bg-bg-0/70 border border-border-subtle text-xs text-text-mid">
            Nilai di bawah ini adalah <strong className="text-text-hi">ambang peringatan internal perusahaan</strong> (bukan batas regulasi pemerintah) yang disimpan di <code className="font-mono font-bold text-neon-cyan">app_meta/env_thresholds</code>.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-text-mid uppercase mb-1 font-mono">Rasio Peringatan Dini (0.50 – 0.99)</label>
              <input type="number" step="0.01" min="0.5" max="0.99" required disabled={!canManage} value={warningRatio} onChange={(e) => setWarningRatio(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-mid uppercase mb-1 font-mono">Margin Peringatan pH (0.05 – 2.00)</label>
              <input type="number" step="0.05" min="0.05" max="2.0" required disabled={!canManage} value={phMargin} onChange={(e) => setPhMargin(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-mid uppercase mb-1 font-mono">Target Pengolahan Sampah Internal (%)</label>
              <input type="number" step="1" min="1" max="100" required disabled={!canManage} value={solidWasteTargetPct} onChange={(e) => setSolidWasteTargetPct(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
            </div>
          </div>
          {canManage && (
            <div className="flex justify-end pt-3 border-t border-border-neon">
              <button type="submit" disabled={isSaving} className="px-5 py-2 neon-btn-primary text-xs rounded-xl cursor-pointer">
                {isSaving ? 'Menyimpan...' : 'Simpan Ambang Internal'}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
