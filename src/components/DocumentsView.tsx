import React, { useState } from 'react';
import { EnvironmentalDocument, ComplianceCalendarEvent } from '../types';
import { computeDocumentStatus } from '../utils/documentStatus';
import { mapRole } from '../services/permissionService';
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

interface DocumentsViewProps {
  documents: EnvironmentalDocument[];
  calendar: ComplianceCalendarEvent[];
  onAddDocument: (item: any) => void;
  onUpdateDocument?: (id: string, item: any) => void;
  onDeleteDocument: (id: string) => void;
  onAddEvent: (item: any) => void;
  onUpdateEventStatus: (id: string, data: any) => void;
  onDeleteEvent: (id: string) => void;
  userRole?: string;
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
  userRole,
  onUnauthorizedAction
}: DocumentsViewProps) {
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
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [obligations, setObligations] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [pic, setPic] = useState('');

  // Event Modals
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState('Pelaporan');

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, type: 'document'|'event', message: string} | null>(null);

  const effectiveRole = mapRole(userRole);
  const canEdit = ['Admin', 'Superintendent', 'Operator'].includes(effectiveRole);

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.docNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = calendar.filter(ev => 
    ev.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveDoc = () => {
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
    
    if (editingId && onUpdateDocument) {
      onUpdateDocument(editingId, item);
    } else {
      onAddDocument(item);
    }
    setFormOpen(false);
    setEditingId(null);
  };

  const handleSaveEvent = () => {
    if (!canEdit) return onUnauthorizedAction("Tambah Kegiatan Agenda Kepatuhan");
    onAddEvent({
      date: eventDate,
      title: eventTitle,
      type: eventType,
      description: eventDesc,
      status: 'Pending',
      progress: 0
    });
    setEventFormOpen(false);
    setEventTitle(''); setEventDate(''); setEventDesc('');
  };

  const calculateCountdown = (expiryDate: string) => {
    if (expiryDate === 'N/A' || !expiryDate) return null;
    const exp = new Date(expiryDate).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div id="documents-view-wrapper" className="space-y-6 text-text-primary text-left max-w-6xl animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[20px] border border-border-custom shadow-custom">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-forest-100/60 text-[#2F5A46] rounded-2xl border border-border-custom">
            <FileLock className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Registrasi Perizinan & Kepatuhan</h2>
            <p className="text-xs text-text-secondary">Register terpusat persetujuan lingkungan, perizinan, dan pemantauan masa berlaku.</p>
          </div>
        </div>
        <div className="flex bg-forest-50 p-1 rounded-xl border border-border-custom shrink-0">
          <button 
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'documents' ? 'bg-[#4D7C5A] text-white shadow-sm' : 'text-[#2F5A46] hover:text-[#2F5A46] hover:bg-forest-100/40'}`}
          >
            Daftar Perizinan
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'calendar' ? 'bg-[#4D7C5A] text-white shadow-sm' : 'text-[#2F5A46] hover:text-[#2F5A46] hover:bg-forest-100/40'}`}
          >
            Agenda Kepatuhan
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7B73] h-4.5 w-4.5" />
          <input 
            type="text" 
            placeholder={activeTab === 'documents' ? "Cari nomor SK, nama izin..." : "Cari kegiatan..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-border-custom rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] text-text-primary shadow-sm placeholder-[#6D7B73]/60"
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
            className="w-full sm:w-auto px-5 py-2.5 bg-[#4D7C5A] hover:bg-[#2F5A46] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-[#2F5A46]/10"
          >
            <Plus size={16} /> Register Izin Baru
          </button>
        ) : (
          <button 
            onClick={() => {
              if (!canEdit) return onUnauthorizedAction("Tambah Kegiatan");
              setEventFormOpen(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#4D7C5A] hover:bg-[#2F5A46] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-[#2F5A46]/10"
          >
            <Calendar size={16} /> Tambah Agenda
          </button>
        )}
      </div>

      {activeTab === 'documents' && (
        <div className="space-y-4">
          {filteredDocs.length === 0 ? (
            <div className="p-16 text-center text-text-secondary bg-white rounded-[20px] border border-border-custom shadow-custom">
              Tidak ada data perizinan yang ditemukan.
            </div>
          ) : (
            filteredDocs.map(doc => {
              const countdown = calculateCountdown(doc.expiryDate);
              const isUrgent = countdown !== null && countdown <= 90;
              const isExpired = countdown !== null && countdown < 0;
              
              return (
                <div key={doc.id} className="bg-white p-6 rounded-[20px] border border-border-custom hover:border-forest-200 transition-all duration-200 shadow-custom text-left">
                  <div className="flex flex-col lg:flex-row gap-5 justify-between">
                    <div className="flex-1 space-y-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-forest-50 border border-border-custom text-[#4D7C5A] font-manrope">
                          {doc.type}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border font-manrope ${
                          doc.status === 'Active' ? 'bg-[#3FA66B]/10 border-[#3FA66B]/15 text-[#2F5A46]' :
                          doc.status === 'Renewal Needed' ? 'bg-[#E2A43B]/10 border-[#E2A43B]/15 text-[#8F5E13]' :
                          'bg-[#D95C5C]/10 border-[#D95C5C]/15 text-[#9C3333]'
                        }`}>
                          {doc.status}
                        </span>
                        {isUrgent && !isExpired && (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#A33E3E] text-white animate-pulse tracking-wider font-manrope">
                            H-{countdown} KEDALUWARSA
                          </span>
                        )}
                        {isExpired && (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#853030] text-white tracking-wider font-manrope">
                            KEDALUWARSA
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-base font-bold text-text-primary">{doc.name}</h3>
                        <p className="text-xs font-mono text-text-secondary mt-1">{doc.docNo} {doc.issuer ? `— ${doc.issuer}` : ''}</p>
                      </div>

                      {doc.obligations && (
                        <div className="bg-forest-50/50 p-4 rounded-[15px] border border-[#E6ECE6]">
                          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-manrope">Ringkasan Kewajiban</p>
                          <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">{doc.obligations}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3.5 border-t border-[#E6ECE6]">
                        <div>
                          <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">Tgl Terbit</p>
                          <p className="text-xs font-semibold text-text-primary mt-1">{doc.issuedDate}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">Berlaku S/D</p>
                          <p className={`text-xs font-semibold mt-1 ${isUrgent ? 'text-[#A33E3E] font-bold' : 'text-text-primary'}`}>{doc.expiryDate}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">PIC Pemenuhan</p>
                          <p className="text-xs font-semibold text-text-primary mt-1">{doc.pic}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">Dokumen Fisik</p>
                          {doc.documentUrl ? (
                            <a href={doc.documentUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#4D7C5A] hover:underline flex items-center gap-1 mt-1">
                              <LinkIcon size={12}/> Lihat Dokumen →
                            </a>
                          ) : (
                            <p className="text-xs font-semibold text-text-secondary mt-1">Tidak ada tautan</p>
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
                        className="p-2.5 border border-border-custom hover:bg-forest-50 text-text-primary rounded-xl transition-all cursor-pointer bg-white shadow-sm"
                        title="Edit Data"
                      >
                        <Pencil size={14}/>
                      </button>
                      <button 
                        onClick={() => {
                          if (!canEdit) return onUnauthorizedAction("Hapus Dokumen");
                          setDeleteConfirm({
                            id: doc.id,
                            type: 'document',
                            message: `Apakah Anda yakin ingin menghapus registrasi perizinan "${doc.name}" secara permanen?`
                          });
                        }}
                        className="p-2.5 border border-[#D95C5C]/20 hover:bg-[#D95C5C]/5 text-[#A33E3E] rounded-xl transition-all cursor-pointer bg-white shadow-sm"
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
             <div className="p-16 text-center text-text-secondary bg-white rounded-[20px] border border-border-custom shadow-custom">
               Tidak ada agenda kepatuhan.
             </div>
           ) : (
             filteredEvents.map(ev => (
               <div key={ev.id} className="bg-white p-5 rounded-[18px] border border-border-custom flex items-center justify-between shadow-custom text-left hover:border-forest-200 transition-all duration-200">
                 <div className="flex gap-4 items-center">
                   <div className="h-12 w-12 rounded-xl bg-forest-50 text-[#2F5A46] flex flex-col items-center justify-center shrink-0 border border-border-custom font-manrope">
                     <span className="text-sm font-bold leading-tight">{new Date(ev.date).getDate()}</span>
                     <span className="text-[9px] uppercase font-bold leading-none tracking-wide text-[#6D7B73]">{new Date(ev.date).toLocaleString('id-ID', { month: 'short' })}</span>
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold uppercase bg-forest-50 text-[#4D7C5A] border border-border-custom px-2 py-0.5 rounded-full font-manrope">{ev.type}</span>
                       <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full font-manrope ${ev.status === 'Completed' ? 'bg-[#3FA66B]/10 text-[#2F5A46]' : 'bg-[#E2A43B]/10 text-[#8F5E13]'}`}>{ev.status === 'Completed' ? 'Selesai' : 'Pending'}</span>
                     </div>
                     <h4 className="text-sm font-bold text-text-primary mt-1.5">{ev.title}</h4>
                     <p className="text-xs text-text-secondary leading-relaxed line-clamp-1">{ev.description}</p>
                   </div>
                 </div>
                 <div className="flex gap-2">
                   {ev.status !== 'Completed' && (
                     <button onClick={() => onUpdateEventStatus(ev.id, {status: 'Completed'})} className="p-2.5 text-[#2F5A46] hover:bg-forest-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-border-custom" title="Tandai Selesai"><CheckSquare size={16}/></button>
                   )}
                   <button onClick={() => {
                     if (!canEdit) return onUnauthorizedAction("Hapus Agenda");
                     setDeleteConfirm({id: ev.id, type: 'event', message: `Apakah Anda yakin ingin menghapus agenda "${ev.title}"?`});
                   }} className="p-2.5 text-[#A33E3E] hover:bg-[#D95C5C]/5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-[#D95C5C]/20" title="Hapus Agenda"><Trash2 size={16}/></button>
                 </div>
               </div>
             ))
           )}
        </div>
      )}

      {/* Register Document Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] shadow-2xl border border-border-custom w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="px-6 py-4 border-b border-[#E6ECE6] flex justify-between items-center shrink-0 z-10">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <FileLock className="text-[#4D7C5A] h-5 w-5" />
                {editingId ? 'Edit Register Izin' : 'Registrasi Izin & Persetujuan Baru'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="p-2 bg-forest-50 hover:bg-[#DCE5DA] rounded-full text-[#2F5A46] cursor-pointer transition-colors"><X size={16}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">NAMA IZIN / PERSETUJUAN</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" placeholder="ex: AMDAL Operasi Produksi" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">KATEGORI</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer font-medium">
                    <option value="AMDAL">AMDAL</option>
                    <option value="UKL-UPL">UKL-UPL</option>
                    <option value="Persetujuan Lingkungan">Persetujuan Lingkungan (PP 22/2021)</option>
                    <option value="Pertek Air Limbah">Pertek Air Limbah</option>
                    <option value="Pertek Emisi">Pertek Emisi</option>
                    <option value="Izin TPS B3">Persetujuan Teknis TPS B3</option>
                    <option value="Persetujuan Rencana Reklamasi">Rencana Reklamasi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">NOMOR SK</label>
                  <input type="text" value={docNo} onChange={e => setDocNo(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" placeholder="SK.123/MENLHK/..." />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">INSTANSI PENERBIT</label>
                  <input type="text" value={issuer} onChange={e => setIssuer(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" placeholder="Kementerian LHK / DLH Provinsi" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TANGGAL TERBIT</label>
                  <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">MASA BERLAKU S/D (KOSONGKAN JIKA SELAMANYA)</label>
                  <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">PIC PEMENUHAN / DEPARTEMEN</label>
                <input type="text" value={pic} onChange={e => setPic(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" placeholder="HSE Dept" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">RINGKASAN KEWAJIBAN</label>
                <textarea value={obligations} onChange={e => setObligations(e.target.value)} rows={3} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] resize-none" placeholder="1. Lapor RKL-RPL per semester. 2. Uji baku mutu air..." />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TAUTAN DOKUMEN DIGITAL (G-DRIVE/SHAREPOINT)</label>
                <input type="url" value={documentUrl} onChange={e => setDocumentUrl(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" placeholder="https://drive.google.com/..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E6ECE6] flex justify-end gap-2.5 shrink-0 bg-white rounded-b-[20px]">
              <button onClick={() => setFormOpen(false)} className="px-5 py-2.5 text-xs font-bold text-text-secondary hover:bg-forest-50 rounded-xl transition-all cursor-pointer">Batal</button>
              <button onClick={handleSaveDoc} disabled={!name || !docNo} className="px-5 py-2.5 text-xs font-bold text-white bg-[#4D7C5A] hover:bg-[#2F5A46] disabled:opacity-40 rounded-xl transition-all cursor-pointer shadow-sm">Simpan Register</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div id="delete-confirm-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] shadow-2xl border border-border-custom w-full max-w-sm p-6 text-left animate-fade-in">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#A33E3E]/10 text-[#A33E3E]"><Trash2 size={16}/></span>
              Konfirmasi Hapus
            </h3>
            <p className="text-xs text-text-secondary mt-4 leading-relaxed">{deleteConfirm.message}</p>
            <div className="flex gap-2.5 justify-end mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-forest-50 rounded-xl transition-all">Batal</button>
              <button onClick={() => {
                if(deleteConfirm.type === 'document') onDeleteDocument(deleteConfirm.id);
                else onDeleteEvent(deleteConfirm.id);
                setDeleteConfirm(null);
              }} className="px-4 py-2.5 text-xs font-bold text-white bg-[#A33E3E] hover:bg-[#853030] rounded-xl transition-all shadow-sm">Hapus Permanen</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Event form simplified */}
      {eventFormOpen && (
        <div id="event-form-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[20px] shadow-2xl border border-border-custom w-full max-w-sm p-6 text-left space-y-4 animate-fade-in">
             <h3 className="text-sm font-bold text-text-primary">Tambah Agenda Kepatuhan</h3>
             <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TANGGAL AGENDA</label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
             </div>
             <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">JUDUL KEGIATAN</label>
                <input type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" placeholder="Laporan RKL-RPL Semester I" />
             </div>
             <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">KATEGORI AGENDA</label>
                <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer">
                  <option value="Pelaporan">Pelaporan</option>
                  <option value="Kalibrasi">Kalibrasi</option>
                  <option value="Pembayaran">Pembayaran</option>
                  <option value="Perpanjangan Izin">Perpanjangan Izin</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
             </div>
             <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">DESKRIPSI RINGKAS</label>
                <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] resize-none" rows={2} placeholder="Penjelasan singkat tugas agenda..." />
             </div>
             <div className="flex gap-2.5 justify-end mt-5 pt-3 border-t border-[#E6ECE6]">
               <button onClick={() => setEventFormOpen(false)} className="px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-forest-50 rounded-xl transition-all cursor-pointer">Batal</button>
               <button onClick={handleSaveEvent} disabled={!eventTitle || !eventDate} className="px-5 py-2.5 text-xs font-bold text-white bg-[#4D7C5A] hover:bg-[#2F5A46] disabled:opacity-40 rounded-xl transition-all cursor-pointer shadow-sm">Simpan Agenda</button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
}
