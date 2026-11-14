/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import ModalPortal from './ModalPortal';
import { WqLocation } from '../types';
import { wqLocationService } from '../services/wqLocationService';
import { MapPin, Plus, X, Edit2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface WqLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: WqLocation[];
  canManage: boolean;
}

export default function WqLocationModal({
  isOpen,
  onClose,
  locations,
  canManage,
}: WqLocationModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [defaultSource, setDefaultSource] = useState('Settling Pond Outlet');
  const [docSuffix, setDocSuffix] = useState('');
  const [kelasAir, setKelasAir] = useState<'I' | 'II' | 'III' | 'IV'>('II');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editDocSuffix, setEditDocSuffix] = useState('');
  const [editKelasAir, setEditKelasAir] = useState<'I' | 'II' | 'III' | 'IV'>('II');

  if (!isOpen) return null;

  const handleStartEdit = (loc: WqLocation) => {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditSource(loc.defaultSource);
    setEditDocSuffix(loc.docSuffix || '');
    setEditKelasAir(loc.kelasAir || 'II');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setIsSubmitting(true);
      await wqLocationService.update(id, {
        name: editName.trim(),
        defaultSource: editSource.trim(),
        docSuffix: editDocSuffix.trim(),
        kelasAir: editKelasAir,
      });
      setEditingId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah titik sampling.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (loc: WqLocation) => {
    try {
      await wqLocationService.update(loc.id, {
        isActive: !loc.isActive,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah status keaktifan.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Kode titik sampling wajib diisi.');
      return;
    }

    if (locations.some((l) => l.code.toUpperCase() === cleanCode)) {
      setErrorMsg(`Titik sampling dengan kode ${cleanCode} sudah terdaftar.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await wqLocationService.add({
        code: cleanCode,
        name: name.trim(),
        defaultSource: defaultSource.trim(),
        docSuffix: docSuffix.trim(),
        kelasAir,
        isActive: true,
      });

      // Reset
      setCode('');
      setName('');
      setDefaultSource('Settling Pond Outlet');
      setDocSuffix('');
      setKelasAir('II');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan titik sampling.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-0/75 backdrop-blur-md animate-fade-in">
        <div className="glass-panel rounded-2xl shadow-2xl border border-border-neon w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-2/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neon-cyan/15 border border-neon-cyan/35 flex items-center justify-center text-neon-cyan">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-hi font-heading">
                  Kelola Master Titik Sampling Air Limbah
                </h3>
                <p className="text-[11px] text-text-mid">
                  Koleksi master titik KPL / Settling Pond (Wewenang Superintendent ke atas)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-low hover:text-text-hi hover:bg-bg-2 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-neon-red/10 border border-neon-red/35 text-neon-red text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Bar */}
            {canManage && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-mid font-medium">
                  Total Terdaftar: <strong className="text-text-hi font-mono tabular-nums">{locations.length} Lokasi</strong>
                </span>
                {!showAddForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="neon-btn-primary px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Titik Baru
                  </button>
                )}
              </div>
            )}

            {/* New Point Form */}
            {showAddForm && canManage && (
              <form
                onSubmit={handleCreate}
                className="p-4 rounded-xl border border-neon-cyan/35 bg-neon-cyan/5 space-y-3 animate-slide-up"
              >
                <div className="flex items-center justify-between pb-1 border-b border-neon-cyan/25">
                  <span className="text-xs font-bold text-neon-cyan font-heading">
                    Tambah Titik Sampling Baru
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-text-low hover:text-text-hi cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-text-low uppercase mb-1">
                      Kode Titik (cth: KPL-02) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="KPL-02"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-low uppercase mb-1">
                      Nama Titik Sampling *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="KPL Tambang Blok Selatan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-low uppercase mb-1">
                      Sumber Air Limbah Default *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Settling Pond Outlet"
                      value={defaultSource}
                      onChange={(e) => setDefaultSource(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-low uppercase mb-1">
                      Suffix Dokumen (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="cth: SP-02"
                      value={docSuffix}
                      onChange={(e) => setDocSuffix(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-low uppercase mb-1">
                      Kelas Air (PP 22/2021 Lampiran VI)
                    </label>
                    <select
                      value={kelasAir}
                      onChange={(e) => setKelasAir(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs cursor-pointer"
                    >
                      <option value="I">Kelas I</option>
                      <option value="II">Kelas II (Default)</option>
                      <option value="III">Kelas III</option>
                      <option value="IV">Kelas IV</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs text-text-mid hover:text-text-hi cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="neon-btn-primary px-4 py-1.5 text-xs rounded-lg cursor-pointer"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Titik'}
                  </button>
                </div>
              </form>
            )}

            {/* List of locations */}
            <div className="border border-border-neon rounded-xl overflow-hidden divide-y divide-border-subtle bg-bg-1/40">
              {locations.length === 0 ? (
                <div className="p-8 text-center text-text-low text-xs">
                  Belum ada master titik sampling terdaftar.
                </div>
              ) : (
                locations.map((loc) => {
                  const isEditingThis = editingId === loc.id;

                  return (
                    <div
                      key={loc.id}
                      className={`p-3.5 transition-colors ${
                        !loc.isActive ? 'bg-bg-0/40 opacity-75' : 'bg-transparent hover:bg-bg-2/50'
                      }`}
                    >
                      {isEditingThis ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="text-[10px] text-text-low font-bold block mb-0.5">
                                Nama Titik
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-text-low font-bold block mb-0.5">
                                Sumber Default
                              </label>
                              <input
                                type="text"
                                value={editSource}
                                onChange={(e) => setEditSource(e.target.value)}
                                className="w-full px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-text-low font-bold block mb-0.5">
                                Suffix Dokumen
                              </label>
                              <input
                                type="text"
                                value={editDocSuffix}
                                onChange={(e) => setEditDocSuffix(e.target.value)}
                                className="w-full px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-text-low font-bold block mb-0.5">
                                Kelas Air
                              </label>
                              <select
                                value={editKelasAir}
                                onChange={(e) => setEditKelasAir(e.target.value as any)}
                                className="w-full px-2 py-1 text-xs cursor-pointer"
                              >
                                <option value="I">Kelas I</option>
                                <option value="II">Kelas II</option>
                                <option value="III">Kelas III</option>
                                <option value="IV">Kelas IV</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 text-xs text-text-mid hover:text-text-hi cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleSaveEdit(loc.id)}
                              className="neon-btn-primary px-3 py-1 rounded text-xs cursor-pointer"
                            >
                              Simpan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-bg-0/80 text-neon-cyan border border-border-neon">
                                {loc.code}
                              </span>
                              <span className="font-semibold text-xs text-text-hi truncate">
                                {loc.name}
                              </span>
                              <span className="badge-monitored text-[10px] px-1.5 py-0.5 rounded font-mono">
                                Kelas {loc.kelasAir || 'II'}
                              </span>
                              <StatusBadge status={loc.isActive ? 'Aktif' : 'Non-compliant'} label={loc.isActive ? 'Aktif' : 'Nonaktif'} />
                            </div>
                            <div className="text-[11px] text-text-mid mt-1 flex items-center gap-3 flex-wrap">
                              <span>Sumber: {loc.defaultSource}</span>
                              {loc.docSuffix && (
                                <span>Suffix Dokumen: {loc.docSuffix}</span>
                              )}
                              <span className="text-text-low font-mono text-[10px]">
                                Label: {loc.name} ({loc.code})
                              </span>
                            </div>
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(loc)}
                                className="p-1.5 rounded-lg text-text-mid hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors cursor-pointer"
                                title="Ubah Titik"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(loc)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  loc.isActive
                                    ? 'text-neon-red hover:bg-neon-red/15'
                                    : 'text-neon-green hover:bg-neon-green/15'
                                }`}
                                title={loc.isActive ? 'Nonaktifkan Titik' : 'Aktifkan Titik'}
                              >
                                {loc.isActive ? (
                                  <XCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border-subtle bg-bg-2/60 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-bg-1 border border-border-subtle hover:bg-bg-2 text-text-mid hover:text-text-hi font-medium text-xs rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
