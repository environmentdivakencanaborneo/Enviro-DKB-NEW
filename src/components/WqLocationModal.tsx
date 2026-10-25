/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import ModalPortal from './ModalPortal';
import { WqLocation } from '../types';
import { wqLocationService } from '../services/wqLocationService';
import { MapPin, Plus, X, Edit2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editDocSuffix, setEditDocSuffix] = useState('');

  if (!isOpen) return null;

  const handleStartEdit = (loc: WqLocation) => {
    setEditingId(loc.id);
    setEditName(loc.name);
    setEditSource(loc.defaultSource);
    setEditDocSuffix(loc.docSuffix || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setIsSubmitting(true);
      await wqLocationService.update(id, {
        name: editName.trim(),
        defaultSource: editSource.trim(),
        docSuffix: editDocSuffix.trim(),
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
        isActive: true,
      });

      // Reset
      setCode('');
      setName('');
      setDefaultSource('Settling Pond Outlet');
      setDocSuffix('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan titik sampling.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Kelola Master Titik Sampling Air Limbah
                </h3>
                <p className="text-[11px] text-slate-500">
                  Koleksi master titik KPL / Settling Pond (Wewenang Superintendent ke atas)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Bar */}
            {canManage && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">
                  Total Terdaftar: <strong className="text-slate-800">{locations.length} Lokasi</strong>
                </span>
                {!showAddForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
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
                className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-3 animate-slide-up"
              >
                <div className="flex items-center justify-between pb-1 border-b border-teal-200/60">
                  <span className="text-xs font-bold text-teal-800">
                    Tambah Titik Sampling Baru
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Kode Titik (cth: KPL-02) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="KPL-02"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Nama Titik Sampling *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="KPL Tambang Blok Selatan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Sumber Air Limbah Default *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Settling Pond Outlet"
                      value={defaultSource}
                      onChange={(e) => setDefaultSource(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Suffix Dokumen (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="cth: SP-02"
                      value={docSuffix}
                      onChange={(e) => setDocSuffix(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Titik'}
                  </button>
                </div>
              </form>
            )}

            {/* List of locations */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {locations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada master titik sampling terdaftar.
                </div>
              ) : (
                locations.map((loc) => {
                  const isEditingThis = editingId === loc.id;

                  return (
                    <div
                      key={loc.id}
                      className={`p-3.5 transition-colors ${
                        !loc.isActive ? 'bg-slate-50/70 opacity-75' : 'bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      {isEditingThis ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 font-bold block">
                                Nama Titik
                              </label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 font-bold block">
                                Sumber Default
                              </label>
                              <input
                                type="text"
                                value={editSource}
                                onChange={(e) => setEditSource(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 font-bold block">
                                Suffix Dokumen
                              </label>
                              <input
                                type="text"
                                value={editDocSuffix}
                                onChange={(e) => setEditDocSuffix(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleSaveEdit(loc.id)}
                              className="px-3 py-1 bg-teal-500 text-slate-950 font-bold rounded text-xs"
                            >
                              Simpan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                {loc.code}
                              </span>
                              <span className="font-semibold text-xs text-slate-800 truncate">
                                {loc.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  loc.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {loc.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                              <span>Sumber: {loc.defaultSource}</span>
                              {loc.docSuffix && (
                                <span>Suffix Dokumen: {loc.docSuffix}</span>
                              )}
                              <span className="text-slate-400 font-mono text-[10px]">
                                Label: {loc.name} ({loc.code})
                              </span>
                            </div>
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(loc)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                title="Ubah Titik"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(loc)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  loc.isActive
                                    ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                                    : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
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
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
