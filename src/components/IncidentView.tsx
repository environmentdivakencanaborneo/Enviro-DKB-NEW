import React, { useState, useMemo } from 'react';
import ModalPortal from './ModalPortal';
import { IncidentData } from '../types';
import { incidentService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import { 
  Flame, Search, Download, 
  Trash2, Edit, AlertTriangle, X,
  Link as LinkIcon, Calendar, Clock
} from 'lucide-react';
import ModuleErrorBoundary from './ModuleErrorBoundary';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';

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
    date: todayLocalISO(),
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

  const mapIncidentStatus = (status: string) => {
    if (status === 'Ditutup') return 'Closed';
    if (status === 'Tindakan Korektif') return 'Dipantau';
    if (status === 'Investigasi') return 'Warning';
    return 'Terbuka';
  };

  return (
    <ModuleErrorBoundary moduleName="Insiden & Kedaruratan">
      <div className="space-y-6 animate-fade-in text-text-hi font-sans">
        
        {/* Header */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-neon-red/10 text-neon-red rounded-2xl border border-neon-red/30 shadow-glow-red">
              <Flame className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-text-hi font-heading">Manajemen Insiden Lingkungan</h2>
              <p className="text-xs text-text-mid">Register pelaporan, investigasi, dan penanganan kedaruratan tambang.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-border-neon bg-bg-1 hover:bg-bg-2 text-text-hi text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Download size={14} className="text-neon-cyan" /> Ekspor Excel
            </button>
            <button 
              onClick={() => {
                if (!canEdit) return onUnauthorizedAction("Lapor Insiden Baru");
                setEditingId(null);
                setFormData({
                  date: todayLocalISO(),
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
              className="flex items-center gap-2 px-4 py-2.5 bg-neon-red/15 hover:bg-neon-red/25 text-neon-red border border-neon-red/45 shadow-glow-red text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <AlertTriangle size={14} /> Lapor Insiden Baru
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="neon-card p-5 text-left">
            <p className="text-[10px] uppercase font-bold text-text-mid tracking-wider font-mono">Total Insiden</p>
            <p className="text-3xl font-bold text-text-hi mt-1.5 font-mono tabular-nums">{stats.total}</p>
          </div>
          <div className="neon-card p-5 text-left">
            <p className="text-[10px] uppercase font-bold text-neon-red tracking-wider font-mono">Dilaporkan</p>
            <p className="text-3xl font-bold text-neon-red mt-1.5 font-mono tabular-nums">{stats.dilaporkan}</p>
          </div>
          <div className="neon-card p-5 text-left">
            <p className="text-[10px] uppercase font-bold text-neon-amber tracking-wider font-mono">Investigasi</p>
            <p className="text-3xl font-bold text-neon-amber mt-1.5 font-mono tabular-nums">{stats.investigasi}</p>
          </div>
          <div className="neon-card p-5 text-left">
            <p className="text-[10px] uppercase font-bold text-neon-violet tracking-wider font-mono">Tindakan Korektif</p>
            <p className="text-3xl font-bold text-neon-violet mt-1.5 font-mono tabular-nums">{stats.korektif}</p>
          </div>
          <div className="neon-card p-5 text-left">
            <p className="text-[10px] uppercase font-bold text-neon-green tracking-wider font-mono">Selesai Ditutup</p>
            <p className="text-3xl font-bold text-neon-green mt-1.5 font-mono tabular-nums">{stats.ditutup}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-low h-4.5 w-4.5" />
            <input 
              type="text" 
              placeholder="Cari lokasi atau kronologi..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 text-xs font-semibold cursor-pointer"
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
              className="px-4 py-2.5 text-xs font-semibold cursor-pointer"
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
            <div className="glass-panel p-6 rounded-2xl">
              <TableSkeleton columns={4} rows={4} />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="glass-panel p-6 rounded-2xl">
              <EmptyState
                title="Belum ada data insiden"
                description="Tidak ada data insiden yang sesuai dengan filter."
                icon={Flame}
              />
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.id} className="glass-panel p-6 rounded-2xl hover:border-neon-cyan/40 transition-all duration-200 text-left">
                <div className="flex flex-col lg:flex-row gap-5 justify-between">
                  <div className="flex-1 space-y-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={mapIncidentStatus(item.status)} label={item.status} />
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-bg-2 border border-border-neon text-neon-cyan">
                        {item.category}
                      </span>
                      <span className="text-xs text-text-mid font-mono tabular-nums font-semibold whitespace-nowrap inline-flex items-center gap-1.5">
                        <Calendar size={12} className="text-neon-cyan" /> {item.date}
                        <span className="text-text-low">•</span>
                        <Clock size={12} className="text-neon-cyan" /> {item.time} WIB
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-text-hi font-heading">{item.location}</h3>
                      <p className="text-xs text-text-mid mt-1">Dilaporkan oleh: <span className="font-semibold text-text-hi">{item.reporter}</span></p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-bg-0/60 p-4 rounded-xl border border-border-subtle">
                        <p className="text-[10px] font-bold text-text-mid uppercase tracking-wider mb-1.5 font-mono">Kronologi Kejadian</p>
                        <p className="text-xs text-text-hi whitespace-pre-wrap leading-relaxed">{item.chronology}</p>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-neon-red/5 p-4 rounded-xl border border-neon-red/25">
                          <p className="text-[10px] font-bold text-neon-red uppercase tracking-wider mb-1.5 font-mono">Dampak / Kerugian Lingkungan</p>
                          <p className="text-xs text-text-hi whitespace-pre-wrap leading-relaxed">{item.environmentalLoss}</p>
                        </div>
                        <div className="bg-neon-green/5 p-4 rounded-xl border border-neon-green/25">
                          <p className="text-[10px] font-bold text-neon-green uppercase tracking-wider mb-1.5 font-mono">Tindakan Pertama (Respons Cepat)</p>
                          <p className="text-xs text-text-hi whitespace-pre-wrap leading-relaxed">{item.firstAction}</p>
                        </div>
                      </div>
                    </div>

                    {item.documentationUrl && (
                      <div className="flex gap-4 pt-3 border-t border-border-subtle">
                        <div className="flex items-center gap-1.5">
                          <LinkIcon size={12} className="text-neon-cyan"/>
                          <a href={item.documentationUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-neon-cyan hover:underline">
                            Dokumentasi Insiden &amp; Investigasi →
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
                      className="px-3.5 py-2 border border-border-neon bg-bg-1 hover:bg-bg-2 text-text-hi text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer"
                    >
                      <Edit size={12} className="text-neon-cyan"/> Edit &amp; Update
                    </button>
                    <button 
                      onClick={() => {
                        if (!allowedDelete) return onUnauthorizedAction("Hapus Insiden");
                        setDeleteConfirm({
                          id: item.id,
                          message: `Apakah Anda yakin ingin menghapus laporan insiden secara permanen? Tindakan ini tidak dapat dibatalkan.`
                        });
                      }}
                      className="px-3.5 py-2 neon-btn-danger text-xs rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer"
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
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="px-6 py-4 bg-bg-2/60 border-b border-border-neon flex justify-between items-center shrink-0">
                  <h3 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                    <AlertTriangle className="text-neon-red h-5 w-5" />
                    {editingId ? 'Update Insiden Lingkungan' : 'Lapor Insiden Kedaruratan Baru'}
                  </h3>
                  <button onClick={() => setFormOpen(false)} className="p-2 bg-bg-1 hover:bg-bg-2 border border-border-subtle rounded-full text-text-mid hover:text-text-hi cursor-pointer transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto text-left space-y-5">
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">TANGGAL INSIDEN</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">JAM KEJADIAN</label>
                      <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full p-2.5 text-sm font-mono" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">KATEGORI INSIDEN</label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full p-2.5 text-sm cursor-pointer font-medium">
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
                      <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">LOKASI KEJADIAN</label>
                      <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-2.5 text-sm" placeholder="Workshop / KM 12 / Settling Pond..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">NAMA PELAPOR &amp; DEPARTEMEN</label>
                      <input type="text" value={formData.reporter} onChange={e => setFormData({...formData, reporter: e.target.value})} className="w-full p-2.5 text-sm" placeholder="Nama Lengkap / Dept HSE..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">KRONOLOGI KEJADIAN (SECARA DETAIL)</label>
                    <textarea value={formData.chronology} onChange={e => setFormData({...formData, chronology: e.target.value})} rows={3} className="w-full p-2.5 text-sm resize-none" placeholder="Jelaskan secara kronologis bagaimana insiden terjadi di area operasional..." />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">TINDAKAN PERTAMA (RESPONS CEPAT)</label>
                      <textarea value={formData.firstAction} onChange={e => setFormData({...formData, firstAction: e.target.value})} rows={3} className="w-full p-2.5 text-sm resize-none" placeholder="Isolasi area tumpahan, memasang oil boom, penyebaran absorbent..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">DAMPAK / ESTIMASI KERUGIAN LINGKUNGAN</label>
                      <textarea value={formData.environmentalLoss} onChange={e => setFormData({...formData, environmentalLoss: e.target.value})} rows={3} className="w-full p-2.5 text-sm resize-none" placeholder="Luas tanah terkontaminasi +/- 5m2, ceceran solar ke drainase..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">STATUS PENANGANAN</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-2.5 text-sm cursor-pointer font-medium">
                        <option value="Dilaporkan">Baru Dilaporkan</option>
                        <option value="Investigasi">Dalam Investigasi</option>
                        <option value="Tindakan Korektif">Tindakan Korektif Berjalan</option>
                        <option value="Ditutup">Selesai (Ditutup)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">TAUTAN DOKUMENTASI &amp; BUKTI (URL FOTO/PDF)</label>
                      <input type="url" value={formData.documentationUrl} onChange={e => setFormData({...formData, documentationUrl: e.target.value})} className="w-full p-2.5 text-sm" placeholder="https://drive.google.com/..." />
                    </div>
                  </div>

                </div>
                <div className="p-4 bg-bg-2/60 border-t border-border-neon flex justify-end gap-2.5 shrink-0">
                  <button onClick={() => setFormOpen(false)} className="px-5 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi bg-bg-1 hover:bg-bg-2 border border-border-subtle rounded-xl transition-all cursor-pointer">Batal</button>
                  <button 
                    onClick={handleSave}
                    disabled={!formData.location || !formData.chronology || !formData.environmentalLoss}
                    className="px-5 py-2.5 text-xs neon-btn-primary disabled:opacity-40 rounded-xl transition-all cursor-pointer"
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
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-2xl w-full max-w-md p-6 text-left animate-fade-in">
                <h3 className="text-sm font-bold text-text-hi font-heading flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-neon-red/10 border border-neon-red/30 text-neon-red"><Trash2 size={16}/></span>
                  Konfirmasi Hapus Laporan
                </h3>
                <p className="text-xs text-text-mid mt-4 leading-relaxed">{deleteConfirm.message}</p>
                <div className="flex gap-2.5 justify-end mt-6">
                  <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi bg-bg-1 hover:bg-bg-2 border border-border-subtle rounded-xl transition-all cursor-pointer">Batal</button>
                  <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2.5 text-xs font-bold bg-neon-red/15 hover:bg-neon-red/25 text-neon-red border border-neon-red/45 rounded-xl transition-all cursor-pointer">Hapus Permanen</button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

      </div>
    </ModuleErrorBoundary>
  );
}
