import React, { useState } from 'react';
import ModalPortal from './ModalPortal';
import { EnvironmentalDocument, ComplianceCalendarEvent } from '../types';
import { computeDocumentStatus } from '../utils/documentStatus';
import { todayLocalISO } from '../utils/dateUtils';
import { 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  FileLock, 
  CheckSquare, 
  Pencil,
  Link as LinkIcon,
  X
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';

interface DocumentsViewProps {
  documents: EnvironmentalDocument[];
  calendar: ComplianceCalendarEvent[];
  onAddDocument: (item: any) => void;
  onUpdateDocument?: (id: string, item: any) => void;
  onDeleteDocument: (id: string) => void;
  onAddEvent: (item: any) => void;
  onUpdateEventStatus: (id: string, data: any) => void;
  onDeleteEvent: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function DocumentsView({
  documents,
  calendar,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onAddEvent,
  onUpdateEventStatus,
  onDeleteEvent,
  canEdit = false,
  canDelete,
  onUnauthorizedAction
}: DocumentsViewProps) {
  const allowedDelete = canDelete ?? false;
  const [activeTab, setActiveTab] = useState<'documents' | 'calendar'>('documents');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Document Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Persetujuan Lingkungan');
  const [docNo, setDocNo] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issuedDate, setIssuedDate] = useState(todayLocalISO());
  const [expiryDate, setExpiryDate] = useState('');
  const [obligations, setObligations] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [pic, setPic] = useState('');

  // Event Modals
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState('Reporting');

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, type: 'document'|'event', message: string} | null>(null);

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.docNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = calendar.filter(ev => 
    ev.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveDoc = async () => {
    if (!canEdit) {
      onUnauthorizedAction(editingId ? "Ubah Dokumen AMDAL/RKL-RPL" : "Unggah Dokumen AMDAL/RKL-RPL");
      return;
    }
    const item = {
      name, type, docNo, issuer, issuedDate,
      expiryDate: expiryDate || 'N/A',
      obligations, documentUrl, pic,
      status: computeDocumentStatus(expiryDate || 'N/A')
    };
    
    try {
      if (editingId && onUpdateDocument) {
        await onUpdateDocument(editingId, item);
      } else {
        await onAddDocument(item);
      }
      setFormOpen(false);
      setEditingId(null);
    } catch {
      // Formulir dibiarkan terbuka agar isian pengguna tidak hilang.
      // Pesan galat sudah ditampilkan oleh handleGlobalError di App.tsx.
    }
  };

  const handleSaveEvent = async () => {
    if (!canEdit) return onUnauthorizedAction("Tambah Kegiatan Agenda Kepatuhan");
    try {
      await onAddEvent({
        date: eventDate,
        title: eventTitle,
        type: eventType,
        description: eventDesc,
        status: 'Pending',
        progress: 0
      });
      setEventFormOpen(false);
      setEventTitle(''); setEventDate(''); setEventDesc('');
    } catch {
      // Formulir dibiarkan terbuka agar isian pengguna tidak hilang.
      // Pesan galat sudah ditampilkan oleh handleGlobalError di App.tsx.
    }
  };

  const calculateCountdown = (expiryDate: string) => {
    if (expiryDate === 'N/A' || !expiryDate) return null;
    const exp = new Date(expiryDate).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div id="documents-view-wrapper" className="space-y-6 text-text-hi text-left max-w-6xl animate-fade-in font-sans">
      {/* Header */}
      <div className="glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-[20px]">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-neon-cyan/10 text-neon-cyan rounded-2xl border border-neon-cyan/25">
            <FileLock className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-hi">Registrasi Perizinan &amp; Kepatuhan</h2>
            <p className="text-xs text-text-mid">
              Register terpusat persetujuan lingkungan &amp; Pertek — mengacu PP No. 28 Tahun 2025 (menggantikan PP No. 5/2021, berlaku 5 Juni 2025) &amp; Permen LH/BPLH No. 22 Tahun 2025.
            </p>
          </div>
        </div>
        <div className="flex bg-bg-1 p-1 rounded-xl border border-border-subtle shrink-0">
          <button 
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'documents' ? 'bg-neon-cyan text-bg-0 shadow-sm' : 'text-text-mid hover:text-text-hi hover:bg-bg-2'}`}
          >
            Daftar Perizinan
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'calendar' ? 'bg-neon-cyan text-bg-0 shadow-sm' : 'text-text-mid hover:text-text-hi hover:bg-bg-2'}`}
          >
            Agenda Kepatuhan
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-low h-4.5 w-4.5" />
          <input 
            type="text" 
            placeholder={activeTab === 'documents' ? "Cari nomor SK, nama izin..." : "Cari kegiatan..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        
        {activeTab === 'documents' ? (
          <button 
            onClick={() => {
              if (!canEdit) return onUnauthorizedAction("Tambah Dokumen");
              setEditingId(null);
              setName(''); setDocNo(''); setIssuer(''); setObligations(''); setDocumentUrl(''); setPic(''); setExpiryDate('');
              setFormOpen(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 neon-btn-primary text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Register Izin Baru
          </button>
        ) : (
          <button 
            onClick={() => {
              if (!canEdit) return onUnauthorizedAction("Tambah Kegiatan");
              setEventFormOpen(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 neon-btn-primary text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calendar size={16} /> Tambah Agenda
          </button>
        )}
      </div>

      {activeTab === 'documents' && (
        <div className="space-y-4">
          {filteredDocs.length === 0 ? (
            <div className="glass-panel rounded-[20px] p-4">
              <EmptyState
                icon={FileLock}
                title="Tidak ada data perizinan"
                description="Register izin atau persetujuan lingkungan baru, atau ubah kata kunci pencarian."
              />
            </div>
          ) : (
            filteredDocs.map(doc => {
              const countdown = calculateCountdown(doc.expiryDate);
              const isUrgent = countdown !== null && countdown <= 90;
              const isExpired = countdown !== null && countdown < 0;
              const docBadgeStatus =
                doc.status === 'Active' ? 'Active' :
                doc.status === 'Renewal Needed' ? 'Segera Habis' : 'Expired';
              
              return (
                <div key={doc.id} className="glass-panel p-6 rounded-[20px] hover:border-border-neon transition-all duration-200 text-left">
                  <div className="flex flex-col lg:flex-row gap-5 justify-between">
                    <div className="flex-1 space-y-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-bg-2 border border-border-subtle text-neon-cyan">
                          {doc.type}
                        </span>
                        <StatusBadge status={docBadgeStatus} label={doc.status} size="xs" />
                        {isUrgent && !isExpired && (
                          <StatusBadge status="Warning" label={`H-${countdown} KEDALUWARSA`} size="xs" />
                        )}
                        {isExpired && (
                          <StatusBadge status="Expired" label="KEDALUWARSA" size="xs" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-base font-bold text-text-hi">{doc.name}</h3>
                        <p className="text-xs font-mono text-text-mid mt-1">{doc.docNo} {doc.issuer ? `— ${doc.issuer}` : ''}</p>
                      </div>

                      {doc.obligations && (
                        <div className="bg-bg-2/70 p-4 rounded-[15px] border border-border-subtle">
                          <p className="text-[10px] font-bold text-text-low uppercase tracking-wider mb-1.5">Ringkasan Kewajiban</p>
                          <p className="text-xs text-text-mid leading-relaxed whitespace-pre-wrap">{doc.obligations}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3.5 border-t border-border-subtle">
                        <div>
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider">Tgl Terbit</p>
                          <p className="text-xs font-mono tabular-nums font-semibold text-text-hi mt-1">{doc.issuedDate}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider">Berlaku S/D</p>
                          <p className={`text-xs font-mono tabular-nums font-semibold mt-1 ${isUrgent ? 'text-neon-red font-bold' : 'text-text-hi'}`}>{doc.expiryDate}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider">PIC Pemenuhan</p>
                          <p className="text-xs font-semibold text-text-hi mt-1">{doc.pic}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider">Dokumen Fisik</p>
                          {doc.documentUrl ? (
                            <a href={doc.documentUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-neon-cyan hover:underline flex items-center gap-1 mt-1">
                              <LinkIcon size={12}/> Lihat Dokumen →
                            </a>
                          ) : (
                            <p className="text-xs font-semibold text-text-low mt-1">Tidak ada tautan</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex lg:flex-col gap-2 shrink-0 justify-end md:justify-start lg:justify-end">
                      <button 
                        onClick={() => {
                          if (!canEdit) return onUnauthorizedAction("Edit Dokumen");
                          setEditingId(doc.id);
                          setName(doc.name); setType(doc.type); setDocNo(doc.docNo); 
                          setIssuer(doc.issuer || ''); setIssuedDate(doc.issuedDate); 
                          setExpiryDate(doc.expiryDate === 'N/A' ? '' : doc.expiryDate);
                          setObligations(doc.obligations || ''); setDocumentUrl(doc.documentUrl || ''); setPic(doc.pic);
                          setFormOpen(true);
                        }}
                        className="p-2.5 border border-border-subtle hover:border-neon-cyan/40 bg-bg-2 hover:bg-neon-cyan/10 text-neon-cyan rounded-xl transition-all cursor-pointer"
                        title="Edit Data"
                      >
                        <Pencil size={14}/>
                      </button>
                      <button 
                        onClick={() => {
                          if (!allowedDelete) return onUnauthorizedAction("Hapus Dokumen");
                          setDeleteConfirm({
                            id: doc.id,
                            type: 'document',
                            message: `Apakah Anda yakin ingin menghapus registrasi perizinan "${doc.name}" secara permanen?`
                          });
                        }}
                        className="p-2.5 border border-neon-red/25 bg-neon-red/10 hover:bg-neon-red/20 text-neon-red rounded-xl transition-all cursor-pointer"
                        title="Hapus Data"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-4">
           {filteredEvents.length === 0 ? (
             <div className="glass-panel rounded-[20px] p-4">
               <EmptyState
                 icon={Calendar}
                 title="Tidak ada agenda kepatuhan"
                 description="Tambahkan jadwal pelaporan atau inspeksi lapangan baru."
               />
             </div>
           ) : (
             filteredEvents.map(ev => (
               <div key={ev.id} className="glass-panel p-5 rounded-[18px] flex items-center justify-between text-left hover:border-border-neon transition-all duration-200">
                 <div className="flex gap-4 items-center">
                   <div className="h-12 w-12 rounded-xl bg-bg-2 text-neon-cyan flex flex-col items-center justify-center shrink-0 border border-border-neon font-mono">
                     <span className="text-sm font-bold leading-tight tabular-nums">{new Date(ev.date).getDate()}</span>
                     <span className="text-[9px] uppercase font-bold leading-none tracking-wide text-text-low">{new Date(ev.date).toLocaleString('id-ID', { month: 'short' })}</span>
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold uppercase bg-bg-2 text-neon-cyan border border-border-subtle px-2 py-0.5 rounded-full">{ev.type}</span>
                       <StatusBadge
                         status={ev.status === 'Completed' ? 'Selesai' : 'Pending'}
                         label={ev.status === 'Completed' ? 'Selesai' : 'Pending'}
                         size="xs"
                       />
                     </div>
                     <h4 className="text-sm font-bold text-text-hi mt-1.5">{ev.title}</h4>
                     <p className="text-xs text-text-mid leading-relaxed line-clamp-1">{ev.description}</p>
                   </div>
                 </div>
                 <div className="flex gap-2">
                   {ev.status !== 'Completed' && (
                     <button onClick={() => onUpdateEventStatus(ev.id, {status: 'Completed'})} className="p-2.5 text-neon-green hover:bg-neon-green/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-neon-green/30" title="Tandai Selesai"><CheckSquare size={16}/></button>
                   )}
                   <button onClick={() => {
                     if (!allowedDelete) return onUnauthorizedAction("Hapus Agenda");
                     setDeleteConfirm({id: ev.id, type: 'event', message: `Apakah Anda yakin ingin menghapus agenda "${ev.title}"?`});
                   }} className="p-2.5 text-neon-red hover:bg-neon-red/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-neon-red/30" title="Hapus Agenda"><Trash2 size={16}/></button>
                 </div>
               </div>
             ))
           )}
        </div>
      )}

      {/* Register Document Form Modal */}
      {formOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-panel rounded-[20px] w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in">
              <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center shrink-0 z-10">
                <h3 className="text-base font-bold text-text-hi flex items-center gap-2">
                  <FileLock className="text-neon-cyan h-5 w-5" />
                  {editingId ? 'Edit Register Izin' : 'Registrasi Izin & Persetujuan Baru'}
                </h3>
                <button onClick={() => setFormOpen(false)} className="p-2 bg-bg-2 hover:bg-bg-1 border border-border-subtle rounded-full text-text-mid hover:text-text-hi cursor-pointer transition-colors"><X size={16}/></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-5 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">NAMA IZIN / PERSETUJUAN <span className="text-neon-red">*</span></label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 text-sm" placeholder="ex: AMDAL Operasi Produksi" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">KATEGORI</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2.5 text-sm cursor-pointer font-medium">
                      <option value="AMDAL">AMDAL</option>
                      <option value="UKL-UPL">UKL-UPL</option>
                      <option value="Persetujuan Lingkungan">Persetujuan Lingkungan (PP 22/2021)</option>
                      <option value="Pertek Air Limbah">Pertek Air Limbah</option>
                      <option value="Pertek Emisi">Pertek Emisi</option>
                      <option value="Izin TPS B3">Persetujuan Teknis TPS B3</option>
                      <option value="Izin Pemanfaatan">Persetujuan Teknis Pemanfaatan Limbah</option>
                      <option value="Persetujuan Rencana Reklamasi">Rencana Reklamasi</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">NOMOR SK <span className="text-neon-red">*</span></label>
                    <input type="text" value={docNo} onChange={e => setDocNo(e.target.value)} className="w-full p-2.5 text-sm font-mono" placeholder="SK.123/MENLHK/..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">INSTANSI PENERBIT</label>
                    <input type="text" value={issuer} onChange={e => setIssuer(e.target.value)} className="w-full p-2.5 text-sm" placeholder="KLH/BPLH / Kementerian Kehutanan / DLH Provinsi" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">TANGGAL TERBIT</label>
                    <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="w-full p-2.5 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">MASA BERLAKU S/D (KOSONGKAN JIKA SELAMANYA)</label>
                    <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full p-2.5 text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">PIC PEMENUHAN / DEPARTEMEN <span className="text-neon-red">*</span></label>
                  <input type="text" value={pic} onChange={e => setPic(e.target.value)} className="w-full p-2.5 text-sm" placeholder="HSE Dept" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">RINGKASAN KEWAJIBAN</label>
                  <textarea value={obligations} onChange={e => setObligations(e.target.value)} rows={3} className="w-full p-2.5 text-sm resize-none" placeholder="1. Lapor RKL-RPL per semester. 2. Uji baku mutu air..." />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">TAUTAN DOKUMEN DIGITAL (G-DRIVE/SHAREPOINT)</label>
                  <input type="url" value={documentUrl} onChange={e => setDocumentUrl(e.target.value)} className="w-full p-2.5 text-sm" placeholder="https://drive.google.com/..." />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border-subtle flex justify-end gap-2.5 shrink-0 bg-bg-1/70 rounded-b-[20px]">
                <button onClick={() => setFormOpen(false)} className="px-5 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi rounded-xl transition-all cursor-pointer">Batal</button>
                <button onClick={handleSaveDoc} disabled={name.trim().length < 3 || !docNo.trim() || pic.trim().length < 2} className="px-5 py-2.5 text-xs font-bold neon-btn-primary disabled:opacity-40 rounded-xl cursor-pointer">Simpan Register</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <ModalPortal>
          <div id="delete-confirm-modal" className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-panel rounded-[20px] w-full max-w-sm p-6 text-left animate-fade-in">
              <h3 className="text-sm font-bold text-text-hi flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-neon-red/15 text-neon-red border border-neon-red/30"><Trash2 size={16}/></span>
                Konfirmasi Hapus
              </h3>
              <p className="text-xs text-text-mid mt-4 leading-relaxed">{deleteConfirm.message}</p>
              <div className="flex gap-2.5 justify-end mt-6">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi bg-bg-2 border border-border-subtle rounded-xl transition-all cursor-pointer">Batal</button>
                <button onClick={() => {
                  if(deleteConfirm.type === 'document') onDeleteDocument(deleteConfirm.id);
                  else onDeleteEvent(deleteConfirm.id);
                  setDeleteConfirm(null);
                }} className="px-4 py-2.5 text-xs font-bold neon-btn-danger rounded-xl cursor-pointer">Hapus Permanen</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      
      {/* Event form simplified */}
      {eventFormOpen && (
        <ModalPortal>
          <div id="event-form-modal" className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="glass-panel rounded-[20px] w-full max-w-sm p-6 text-left space-y-4 animate-fade-in">
               <h3 className="text-sm font-bold text-text-hi">Tambah Agenda Kepatuhan</h3>
               <div>
                  <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">TANGGAL AGENDA <span className="text-neon-red">*</span></label>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full p-2.5 text-sm font-mono" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">JUDUL KEGIATAN <span className="text-neon-red">*</span></label>
                  <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="w-full p-2.5 text-sm" placeholder="Laporan RKL-RPL Semester I" />
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">KATEGORI AGENDA</label>
                  <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full p-2.5 text-sm cursor-pointer">
                    <option value="Reporting">Pelaporan (Reporting)</option>
                    <option value="Inspection">Inspeksi Lapangan (Inspection)</option>
                    <option value="Permit Expiry">Masa Berlaku Izin (Permit Expiry)</option>
                    <option value="Exceedance">Penanganan Baku Mutu (Exceedance)</option>
                  </select>
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">DESKRIPSI RINGKAS <span className="text-neon-red">*</span></label>
                  <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="w-full p-2.5 text-sm resize-none" rows={2} placeholder="Penjelasan singkat tugas agenda..." />
               </div>
               <div className="flex gap-2.5 justify-end mt-5 pt-3 border-t border-border-subtle">
                 <button onClick={() => setEventFormOpen(false)} className="px-4 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi rounded-xl transition-all cursor-pointer">Batal</button>
                 <button onClick={handleSaveEvent} disabled={eventTitle.trim().length < 3 || !eventDate || eventDesc.trim().length < 3} className="px-5 py-2.5 text-xs font-bold neon-btn-primary disabled:opacity-40 rounded-xl cursor-pointer">Simpan Agenda</button>
               </div>
             </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}

