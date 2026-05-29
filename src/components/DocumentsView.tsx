/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EnvironmentalDocument, ComplianceCalendarEvent } from '../types';
import { 
  Plus, 
  Trash2, 
  Search, 
  CloudCheck, 
  Calendar, 
  FileLock, 
  ShieldAlert, 
  CheckSquare, 
  BookOpen, 
  User, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

interface DocumentsViewProps {
  documents: EnvironmentalDocument[];
  calendar: ComplianceCalendarEvent[];
  onAddDocument: (item: any) => void;
  onDeleteDocument: (id: string) => void;
  onAddEvent: (item: any) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEventStatus: (id: string, status: any) => void;
}

export default function DocumentsView({
  documents,
  calendar,
  onAddDocument,
  onDeleteDocument,
  onAddEvent,
  onDeleteEvent,
  onUpdateEventStatus
}: DocumentsViewProps) {
  const [activeTab, setActiveTab] = useState<'permits' | 'calendar'>('permits');

  // PERMIT FORM STATE
  const [showDocForm, setShowDocForm] = useState(false);
  const [dName, setDName] = useState('');
  const [dType, setDType] = useState<'AMDAL' | 'UKL-UPL' | 'Izin Lingkungan' | 'Izin TPS B3' | 'Izin Pembuangan Air Limbah'>('AMDAL');
  const [dNo, setDNo] = useState('');
  const [dIssued, setDIssued] = useState(new Date().toISOString().slice(0, 10));
  const [dExpiry, setDExpiry] = useState(new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dStatus, setDStatus] = useState<'Active' | 'Expired' | 'Renewal Needed'>('Active');
  const [dPic, setDPic] = useState('Indra Sukma');

  // CALENDAR FORM STATE
  const [showEventForm, setShowEventForm] = useState(false);
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10));
  const [eTitle, setETitle] = useState('');
  const [eType, setEType] = useState<'Reporting' | 'Inspection' | 'Exceedance' | 'Permit Expiry'>('Reporting');
  const [eDesc, setEDesc] = useState('');

  // Submit permit
  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dName || !dNo) {
      alert("Lengkapi kolom nama dokumen & nomor surat!");
      return;
    }
    onAddDocument({
      name: dName,
      type: dType,
      docNo: dNo,
      issuedDate: dIssued,
      expiryDate: dType === 'AMDAL' || dType === 'Izin Lingkungan' ? 'N/A' : dExpiry,
      status: dStatus,
      pic: dPic,
      fileSize: "4.2 MB"
    });
    setDName('');
    setDNo('');
    setShowDocForm(false);
  };

  // Submit calendar
  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eTitle) {
      alert("Masukkan judul agenda.");
      return;
    }
    onAddEvent({
      date: eDate,
      title: eTitle,
      type: eType,
      description: eDesc,
      status: 'Pending'
    });
    setETitle('');
    setEDesc('');
    setShowEventForm(false);
  };

  return (
    <div id="documents-view-wrapper" className="space-y-6 text-slate-200">
      {/* Sub tabs header selectors */}
      <div className="flex border-b border-slate-800">
        <button
          id="documents-tab"
          onClick={() => setActiveTab('permits')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'permits' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Sertifikasi & Perizinan ESDM (AMDAL)
        </button>
        <button
          id="calendar-tab"
          onClick={() => setActiveTab('calendar')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'calendar' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Kalender Kepatuhan (Compliance Calendar)
        </button>
      </div>

      {activeTab === 'permits' && (
        <div id="permits-panel" className="space-y-6 text-left">
          {/* Action Row */}
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Arsip Izin Operasi & Perlindungan Lingkungan Hidup</h4>
            <button
              id="permits-add-btn"
              onClick={() => setShowDocForm(!showDocForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Upload & Daftarkan Sertifikasi Izin
            </button>
          </div>

          {/* Collapsible permit form */}
          {showDocForm && (
            <form 
              id="permits-form-element"
              onSubmit={handleDocSubmit}
              className="bg-[#111726]/80 p-5 rounded-2xl border border-slate-800 animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-4 pb-2 border-b border-slate-800">
                Data Administrasi Sertifikasi Perizinan Baru
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Nama Izin / Dokumen</label>
                  <input
                    id="doc-field-name"
                    type="text"
                    required
                    placeholder="Contoh: AMDAL Sektor Penambangan Barat"
                    value={dName}
                    onChange={(e) => setDName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Jenis Dokumen</label>
                  <select
                    id="doc-field-type"
                    value={dType}
                    onChange={(e) => setDType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 animate-none"
                  >
                    <option value="AMDAL">AMDAL (Analisa Mengenai Dampak Lingkungan)</option>
                    <option value="UKL-UPL">UKL-UPL (Upaya Pengelolaan & Pemantauan)</option>
                    <option value="Izin Lingkungan">Izin Kelayakan Lingkungan Terpadu</option>
                    <option value="Izin TPS B3">Izin Penyimpanan Sementara Limbah B3</option>
                    <option value="Izin Pembuangan Air Limbah">Izin IPAL / Pembuangan Air Limbah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Nomor Surat Keputusan (SK)</label>
                  <input
                    id="doc-field-no"
                    type="text"
                    required
                    placeholder="Contoh: SK-104/MENLHK/PLB3"
                    value={dNo}
                    onChange={(e) => setDNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-teal-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Tanggal Penerbitan</label>
                  <input
                    id="doc-field-issued"
                    type="date"
                    required
                    value={dIssued}
                    onChange={(e) => setDIssued(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Masa Kadaluarsa (Jika ada)</label>
                  <input
                    id="doc-field-expiry"
                    type="date"
                    required
                    disabled={dType === 'AMDAL' || dType === 'Izin Lingkungan'}
                    value={dExpiry}
                    onChange={(e) => setDExpiry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Penanggung Jawab PIC</label>
                  <input
                    id="doc-field-pic"
                    type="text"
                    required
                    value={dPic}
                    onChange={(e) => setDPic(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Status Keaktifan Izin</label>
                  <select
                    id="doc-field-status"
                    value={dStatus}
                    onChange={(e) => setDStatus(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  >
                    <option value="Active">🟢 Active / Berlaku Sah</option>
                    <option value="Renewal Needed">⚠️ Renewal Needed / Perlu Renewal</option>
                    <option value="Expired">❌ Expired / Kadaluarsa</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
                <button
                  id="permits-form-cancel"
                  type="button"
                  onClick={() => setShowDocForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="permits-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Daftarkan Dokumen
                </button>
              </div>
            </form>
          )}

          {/* List display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 py-2">
            {documents.map(doc => {
              const renewalAlert = doc.status === 'Renewal Needed';
              return (
                <div 
                  key={doc.id} 
                  className={`bg-[#111726]/80 p-5 rounded-2xl border text-left flex flex-col justify-between min-h-[170px] hover:border-slate-700 transition-all shadow ${
                    renewalAlert ? 'border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.05)]' : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-teal-400 px-2 py-0.5 rounded font-bold font-mono uppercase tracking-wider">
                        {doc.type}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        doc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/15 text-amber-500 animate-pulse'
                      }`}>
                        {doc.status === 'Active' ? 'Berlaku Sah' : 'Renewal Segera'}
                      </span>
                    </div>

                    <h5 className="text-sm font-bold text-slate-100 mt-3 hover:text-teal-400 cursor-pointer">{doc.name}</h5>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono uppercase tracking-wide">No SK: {doc.docNo}</p>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>Berlaku s.d. <strong className="text-slate-200">{doc.expiryDate}</strong></span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">PIC: {doc.pic}</span>
                      <button
                        id={`permits-delete-${doc.id}`}
                        onClick={() => {
                          if (confirm(`Hapus dokumen perizinan ${doc.name}?`)) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Hapus Izin"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div id="calendar-panel" className="space-y-6 text-left">
          {/* Calendar header trigger button */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Jadwal Pengajuan RKL-RPL & Kunjungan Lapangan DLH</h4>
              <p className="text-xs text-slate-500 mt-0.5">Pantau agenda pengawasan teknis & deadline administratif</p>
            </div>
            <button
              id="calendar-add-btn"
              onClick={() => setShowEventForm(!showEventForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tambah Agenda Compliance Baru
            </button>
          </div>

          {/* Form and Events */}
          {showEventForm && (
            <form 
              id="calendar-form"
              onSubmit={handleEventSubmit}
              className="bg-[#111726]/80 p-5 rounded-2xl border border-slate-800 animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-400 mb-4 pb-2 border-b border-slate-800">
                Pendaftaran Tanggal Agenda Kepatuhan DLH / Kehutanan
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Batas Hari (Deadline)</label>
                  <input
                    id="event-field-date"
                    type="date"
                    required
                    value={eDate}
                    onChange={(e) => setEDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Judul Agenda</label>
                  <input
                    id="event-field-title"
                    type="text"
                    required
                    placeholder="Contoh: Pengumpulan Laporan Triwulan-II"
                    value={eTitle}
                    onChange={(e) => setETitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Kelompok Kegiatan</label>
                  <select
                    id="event-field-type"
                    value={eType}
                    onChange={(e) => setEType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100 animate-none"
                  >
                    <option value="Reporting">Reporting (Pelaporan DLH/Dinas ESDM)</option>
                    <option value="Inspection">Inspection (Evaluasi KPL / Audit Visit)</option>
                    <option value="Permit Expiry">Permit Expiry (Kadaluarsa Dokumen SK)</option>
                    <option value="Exceedance">Exceedance (Tindak Lanjut Batas Baku)</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] text-slate-400 font-bold mb-1.5 uppercase">Keterangan / Deskripsi Rincian</label>
                <textarea
                  id="event-field-desc"
                  rows={2}
                  value={eDesc}
                  onChange={(e) => setEDesc(e.target.value)}
                  placeholder="Lengkapi instruksi pengerjaan berkas..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-800">
                <button
                  id="calendar-form-cancel"
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="calendar-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Jadwalkan Kepatuhan
                </button>
              </div>
            </form>
          )}

          {/* Agenda listing elements */}
          <div className="space-y-3.5 max-w-4xl">
            {calendar.map(event => (
              <div 
                key={event.id} 
                className="bg-[#111726]/80 p-4.5 rounded-2xl border border-slate-850 flex items-start justify-between gap-5 hover:border-slate-800 transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-3.5 rounded-xl border shrink-0 ${
                    event.type === 'Reporting' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                    event.type === 'Inspection' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' :
                    event.type === 'Permit Expiry' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  }`}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono font-bold">
                        {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        event.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        {event.status === 'Completed' ? 'Selesai' : 'Pending'}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-100 mt-1">{event.title}</h5>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">{event.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {event.status === 'Pending' && (
                    <button
                      id={`calendar-resolve-${event.id}`}
                      onClick={() => onUpdateEventStatus(event.id, 'Completed')}
                      className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-750 transition-colors cursor-pointer"
                    >
                      Selesaikan
                    </button>
                  )}
                  
                  <button
                    id={`calendar-delete-${event.id}`}
                    onClick={() => {
                      if (confirm(`Hapus agenda ini?`)) {
                        onDeleteEvent(event.id);
                      }
                    }}
                    className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
