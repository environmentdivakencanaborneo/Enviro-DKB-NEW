import React, { useState, useMemo } from 'react';
import ModalPortal from './ModalPortal';
import { IncidentData } from '../types';
import { incidentService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { 
  Flame, Plus, Search, Download, 
  Trash2, Edit, AlertTriangle, X,
  Link as LinkIcon, ShieldAlert, CheckCircle
} from 'lucide-react';
import ModuleErrorBoundary from './ModuleErrorBoundary';

interface IncidentViewProps {
  incidents: IncidentData[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function IncidentView({ 
  incidents, 
  isLoading, 
  canEdit = false, 
  canDelete,
  onUnauthorizedAction 
}: IncidentViewProps) {
  const allowedDelete = canDelete ?? false;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<IncidentData>>({
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    category: 'Tumpahan Hidrokarbon',
    location: '',
    chronology: '',
    firstAction: '',
    status: 'Dilaporkan',
    environmentalLoss: '',
    reporter: '',
    documentationUrl: ''
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, message: string} | null>(null);

  const filteredData = useMemo(() => {
    return incidents.filter(f => {
      const matchSearch = f.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.chronology.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || f.status === statusFilter;
      const matchCategory = categoryFilter === 'All' || f.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [incidents, searchQuery, statusFilter, categoryFilter]);

  const stats = {
    total: incidents.length,
    dilaporkan: incidents.filter(d => d.status === 'Dilaporkan').length,
    investigasi: incidents.filter(d => d.status === 'Investigasi').length,
    korektif: incidents.filter(d => d.status === 'Tindakan Korektif').length,
    ditutup: incidents.filter(d => d.status === 'Ditutup').length,
  };

  const handleSave = async () => {
    if (!canEdit) return onUnauthorizedAction("Simpan Data Insiden");
    
    try {
      if (editingId) {
        await incidentService.update(editingId, formData);
      } else {
        await incidentService.add(formData as any);
      }
      setFormOpen(false);
      setEditingId(null);
    } catch (error: any) {
      alert("Gagal menyimpan data: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!allowedDelete) return onUnauthorizedAction("Hapus Laporan Insiden");
    try {
      await incidentService.delete(id);
      setDeleteConfirm(null);
    } catch (e: any) {
      alert("Gagal menghapus: " + e.message);
    }
  };

  const handleExport = () => {
    exportToExcel(filteredData, "Manajemen_Insiden_Lingkungan");
  };

  return (
    <ModuleErrorBoundary moduleName="Insiden & Kedaruratan">
      <div className="space-y-6 animate-fade-in text-text-primary font-sans">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[20px] border border-border-custom shadow-custom">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-forest-100/60 text-[#2F5A46] rounded-2xl border border-border-custom">
              <Flame className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-text-primary">Manajemen Insiden Lingkungan</h2>
              <p className="text-xs text-text-secondary">Register pelaporan, investigasi, dan penanganan kedaruratan tambang.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-border-custom hover:bg-forest-50 text-[#2F5A46] text-xs font-bold rounded-xl transition-all cursor-pointer bg-white shadow-sm"
            >
              <Download size={14} /> Ekspor Excel
            </button>
            <button 
              onClick={() => {
                if (!canEdit) return onUnauthorizedAction("Lapor Insiden Baru");
                setEditingId(null);
                setFormData({
                  date: new Date().toISOString().split('T')[0],
                  time: '12:00',
                  category: 'Tumpahan Hidrokarbon',
                  location: '',
                  chronology: '',
                  firstAction: '',
                  status: 'Dilaporkan',
                  environmentalLoss: '',
                  reporter: '',
                  documentationUrl: ''
                });
                setFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#A33E3E] hover:bg-[#853030] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer border border-[#853030]/10"
            >
              <AlertTriangle size={14} /> Lapor Insiden Baru
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom text-left">
            <p className="text-[10px] uppercase font-bold text-text-secondary tracking-wider font-manrope">Total Insiden</p>
            <p className="text-3xl font-bold text-text-primary mt-1 font-manrope">{stats.total}</p>
          </div>
          <div className="bg-[#A33E3E]/5 border border-[#A33E3E]/15 p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#A33E3E] tracking-wider font-manrope">Dilaporkan</p>
            <p className="text-3xl font-bold text-[#A33E3E] mt-1 font-manrope">{stats.dilaporkan}</p>
          </div>
          <div className="bg-[#E2A43B]/5 border border-[#E2A43B]/15 p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#8F5E13] tracking-wider font-manrope">Investigasi</p>
            <p className="text-3xl font-bold text-[#8F5E13] mt-1 font-manrope">{stats.investigasi}</p>
          </div>
          <div className="bg-forest-50 border border-border-custom p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#4D7C5A] tracking-wider font-manrope">Tindakan Korektif</p>
            <p className="text-3xl font-bold text-[#2F5A46] mt-1 font-manrope">{stats.korektif}</p>
          </div>
          <div className="bg-[#3FA66B]/5 border border-[#3FA66B]/15 p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#2F5A46] tracking-wider font-manrope">Selesai Ditutup</p>
            <p className="text-3xl font-bold text-[#2F5A46] mt-1 font-manrope">{stats.ditutup}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7B73] h-4.5 w-4.5" />
            <input 
              type="text" 
              placeholder="Cari lokasi atau kronologi..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border-custom rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] text-text-primary shadow-sm placeholder-[#6D7B73]/60"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-border-custom rounded-xl text-xs font-semibold text-[#2F5A46] focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer shadow-sm"
            >
              <option value="All">Semua Kategori</option>
              <option value="Tumpahan Hidrokarbon">Tumpahan Hidrokarbon</option>
              <option value="Tanggul Jebol">Tanggul Jebol</option>
              <option value="Air Asam Tambang">Air Asam Tambang</option>
              <option value="Kebakaran Hutan/Lahan">Kebakaran Hutan/Lahan</option>
              <option value="Emisi Asap Tebal">Emisi Asap Tebal</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-border-custom rounded-xl text-xs font-semibold text-[#2F5A46] focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer shadow-sm"
            >
              <option value="All">Semua Status</option>
              <option value="Dilaporkan">Dilaporkan</option>
              <option value="Investigasi">Investigasi</option>
              <option value="Tindakan Korektif">Tindakan Korektif</option>
              <option value="Ditutup">Ditutup</option>
            </select>
          </div>
        </div>

        {/* Data List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-text-secondary animate-pulse bg-white rounded-[20px] border border-border-custom shadow-custom">
              Memuat data insiden...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-16 text-center text-text-secondary bg-white rounded-[20px] border border-border-custom shadow-custom">
              Tidak ada data insiden yang sesuai dengan filter.
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-[20px] border border-border-custom hover:border-forest-200 transition-all duration-200 shadow-custom text-left">
                <div className="flex flex-col lg:flex-row gap-5 justify-between">
                  <div className="flex-1 space-y-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        item.status === 'Ditutup' ? 'bg-[#3FA66B]/10 border-[#3FA66B]/15 text-[#2F5A46]' :
                        item.status === 'Tindakan Korektif' ? 'bg-forest-50 border-border-custom text-[#4D7C5A]' :
                        item.status === 'Investigasi' ? 'bg-[#E2A43B]/10 border-[#E2A43B]/15 text-[#8F5E13]' :
                        'bg-[#A33E3E]/10 border-[#A33E3E]/15 text-[#A33E3E]'
                      }`}>
                        {item.status}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#2E4B3D] text-white">
                        {item.category}
                      </span>
                      <span className="text-xs text-text-secondary font-manrope font-semibold whitespace-nowrap">
                        📅 {item.date} • 🕒 {item.time} WIB
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-text-primary">{item.location}</h3>
                      <p className="text-xs text-text-secondary mt-1">Dilaporkan oleh: <span className="font-semibold text-text-primary">{item.reporter}</span></p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-forest-50/50 p-4 rounded-[15px] border border-[#E6ECE6]">
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-manrope">Kronologi Kejadian</p>
                        <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{item.chronology}</p>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-[#A33E3E]/5 p-4 rounded-[15px] border border-[#A33E3E]/10">
                          <p className="text-[10px] font-bold text-[#A33E3E] uppercase tracking-wider mb-1.5 font-manrope">Dampak / Kerugian Lingkungan</p>
                          <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{item.environmentalLoss}</p>
                        </div>
                        <div className="bg-forest-50/30 p-4 rounded-[15px] border border-border-custom">
                          <p className="text-[10px] font-bold text-[#2F5A46] uppercase tracking-wider mb-1.5 font-manrope">Tindakan Pertama (Respons Cepat)</p>
                          <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{item.firstAction}</p>
                        </div>
                      </div>
                    </div>

                    {item.documentationUrl && (
                      <div className="flex gap-4 pt-3 border-t border-[#E6ECE6]">
                        <div className="flex items-center gap-1.5">
                          <LinkIcon size={12} className="text-[#A33E3E]"/>
                          <a href={item.documentationUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#A33E3E] hover:underline">
                            Dokumentasi Insiden & Investigasi →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2 shrink-0 justify-end md:justify-start lg:justify-end">
                    <button 
                      onClick={() => {
                        if (!canEdit) return onUnauthorizedAction("Edit Insiden");
                        setEditingId(item.id);
                        setFormData(item);
                        setFormOpen(true);
                      }}
                      className="px-3.5 py-2 border border-border-custom hover:bg-forest-50 text-text-primary text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer shadow-sm bg-white"
                    >
                      <Edit size={12}/> Edit & Update
                    </button>
                    <button 
                      onClick={() => {
                        if (!allowedDelete) return onUnauthorizedAction("Hapus Insiden");
                        setDeleteConfirm({
                          id: item.id,
                          message: `Apakah Anda yakin ingin menghapus laporan insiden secara permanen? Tindakan ini tidak dapat dibatalkan.`
                        });
                      }}
                      className="px-3.5 py-2 border border-[#D95C5C]/20 hover:bg-[#D95C5C]/5 text-[#A33E3E] text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Trash2 size={12}/> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {formOpen && (
          <ModalPortal>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[20px] shadow-2xl border border-border-custom w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in">
                <div className="px-6 py-4 border-b border-[#E6ECE6] flex justify-between items-center shrink-0">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <AlertTriangle className="text-[#A33E3E] h-5 w-5" />
                    {editingId ? 'Update Insiden Lingkungan' : 'Lapor Insiden Kedaruratan Baru'}
                  </h3>
                  <button onClick={() => setFormOpen(false)} className="p-2 bg-forest-50 hover:bg-[#DCE5DA] rounded-full text-[#2F5A46] cursor-pointer transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto text-left space-y-5">
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TANGGAL INSIDEN</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">JAM KEJADIAN</label>
                      <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A]" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">KATEGORI INSIDEN</label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] cursor-pointer font-medium">
                        <option value="Tumpahan Hidrokarbon">Tumpahan Hidrokarbon</option>
                        <option value="Tanggul Jebol">Tanggul Jebol / Longsor</option>
                        <option value="Air Asam Tambang">Limpasan Air Asam Tambang</option>
                        <option value="Kebakaran Hutan/Lahan">Kebakaran Hutan/Lahan</option>
                        <option value="Emisi Asap Tebal">Emisi Asap Tebal</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">LOKASI KEJADIAN</label>
                      <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A]" placeholder="Workshop / KM 12 / Settling Pond..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">NAMA PELAPOR & DEPARTEMEN</label>
                      <input type="text" value={formData.reporter} onChange={e => setFormData({...formData, reporter: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A]" placeholder="Nama Lengkap / Dept HSE..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">KRONOLOGI KEJADIAN (SECARA DETAIL)</label>
                    <textarea value={formData.chronology} onChange={e => setFormData({...formData, chronology: e.target.value})} rows={3} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] resize-none" placeholder="Jelaskan secara kronologis bagaimana insiden terjadi di area operasional..." />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TINDAKAN PERTAMA (RESPONS CEPAT)</label>
                      <textarea value={formData.firstAction} onChange={e => setFormData({...formData, firstAction: e.target.value})} rows={3} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] resize-none" placeholder="Isolasi area tumpahan, memasang oil boom, penyebaran absorbent..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">DAMPAK / ESTIMASI KERUGIAN LINGKUNGAN</label>
                      <textarea value={formData.environmentalLoss} onChange={e => setFormData({...formData, environmentalLoss: e.target.value})} rows={3} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] resize-none" placeholder="Luas tanah terkontaminasi +/- 5m2, ceceran solar ke drainase..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">STATUS PENANGANAN</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] cursor-pointer font-medium">
                        <option value="Dilaporkan">Baru Dilaporkan</option>
                        <option value="Investigasi">Dalam Investigasi</option>
                        <option value="Tindakan Korektif">Tindakan Korektif Berjalan</option>
                        <option value="Ditutup">Selesai (Ditutup)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TAUTAN DOKUMENTASI & BUKTI (URL FOTO/PDF)</label>
                      <input type="url" value={formData.documentationUrl} onChange={e => setFormData({...formData, documentationUrl: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A]" placeholder="https://drive.google.com/..." />
                    </div>
                  </div>

                </div>
                <div className="p-4 border-t border-[#E6ECE6] flex justify-end gap-2.5 shrink-0 bg-white rounded-b-[20px]">
                  <button onClick={() => setFormOpen(false)} className="px-5 py-2.5 text-xs font-bold text-text-secondary hover:bg-forest-50 rounded-xl transition-all cursor-pointer">Batal</button>
                  <button 
                    onClick={handleSave}
                    disabled={!formData.location || !formData.chronology || !formData.environmentalLoss}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#4D7C5A] hover:bg-[#2F5A46] disabled:opacity-40 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Simpan Laporan
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* Delete Confirm Modal */}
        {deleteConfirm && (
          <ModalPortal>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[20px] shadow-2xl border border-border-custom w-full max-w-md p-6 text-left animate-fade-in">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-[#A33E3E]/10 text-[#A33E3E]"><Trash2 size={16}/></span>
                  Konfirmasi Hapus Laporan
                </h3>
                <p className="text-xs text-text-secondary mt-4 leading-relaxed">{deleteConfirm.message}</p>
                <div className="flex gap-2.5 justify-end mt-6">
                  <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-forest-50 rounded-xl transition-all">Batal</button>
                  <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2.5 text-xs font-bold text-white bg-[#A33E3E] hover:bg-[#853030] rounded-xl transition-all shadow-sm">Hapus Permanen</button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

      </div>
    </ModuleErrorBoundary>
  );
}
