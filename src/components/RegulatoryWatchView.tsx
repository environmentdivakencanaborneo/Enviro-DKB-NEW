import React, { useState, useMemo } from 'react';
import { RegulatoryWatchData } from '../types';
import { regulatoryService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { 
  BookOpen, Plus, Search, Filter, Download, 
  Trash2, Edit, AlertTriangle, X,
  Link as LinkIcon, CheckCircle
} from 'lucide-react';
import ModuleErrorBoundary from './ModuleErrorBoundary';

interface RegulatoryWatchViewProps {
  data: RegulatoryWatchData[];
  isLoading: boolean;
  canEdit?: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function RegulatoryWatchView({ 
  data, 
  isLoading, 
  canEdit = false, 
  onUnauthorizedAction 
}: RegulatoryWatchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<RegulatoryWatchData>>({
    source: 'KLHK',
    regulationNo: '',
    about: '',
    issueDate: new Date().toISOString().split('T')[0],
    implication: '',
    status: 'Draft',
    link: ''
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, message: string} | null>(null);

  const filteredData = useMemo(() => {
    return data.filter(f => {
      const matchSearch = f.regulationNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.about.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || f.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [data, searchQuery, statusFilter]);

  const handleSave = async () => {
    if (!canEdit) return onUnauthorizedAction("Simpan Regulasi");
    
    try {
      if (editingId) {
        await regulatoryService.update(editingId, formData);
      } else {
        await regulatoryService.add(formData as any);
      }
      setFormOpen(false);
      setEditingId(null);
    } catch (error: any) {
      alert("Gagal menyimpan data: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await regulatoryService.delete(id);
      setDeleteConfirm(null);
    } catch (e: any) {
      alert("Gagal menghapus: " + e.message);
    }
  };

  const handleExport = () => {
    exportToExcel(filteredData, "Pemantau_Regulasi_LHK_ESDM");
  };

  return (
    <ModuleErrorBoundary moduleName="Pemantau Regulasi">
      <div className="space-y-6 animate-fade-in text-slate-800">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pemantau Regulasi (Regulatory Watch)</h2>
              <p className="text-xs text-slate-500">Pemantauan peraturan terbaru LHK & ESDM beserta dampaknya.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Download size={14} /> Ekspor Excel
            </button>
            <button 
              onClick={() => {
                if (!canEdit) return onUnauthorizedAction("Tambah Pemantauan Regulasi");
                setEditingId(null);
                setFormData({
                  source: 'KLHK',
                  regulationNo: '',
                  about: '',
                  issueDate: new Date().toISOString().split('T')[0],
                  implication: '',
                  status: 'Draft',
                  link: ''
                });
                setFormOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={14} /> Tambah Regulasi
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Cari nomor peraturan atau tentang..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="All">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Berlaku">Berlaku</option>
              <option value="Dicabut">Dicabut</option>
            </select>
          </div>
        </div>

        {/* Data List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse bg-white rounded-2xl border border-slate-200">
              Memuat data regulasi...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              Tidak ada data regulasi yang sesuai dengan filter.
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors shadow-sm text-left">
                <div className="flex flex-col lg:flex-row gap-4 justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        item.status === 'Berlaku' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                        item.status === 'Draft' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                        'bg-slate-100 border-slate-300 text-slate-500'
                      }`}>
                        {item.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-white">
                        {item.source}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Terbit: {item.issueDate}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-slate-800">{item.regulationNo}</h3>
                      <p className="text-sm text-slate-600 mt-1 font-semibold">{item.about}</p>
                    </div>

                    <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 mt-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-purple-600">Implikasi & Dampak Operasional</p>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{item.implication}</p>
                    </div>

                    {item.link && (
                      <div className="flex gap-4 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <LinkIcon size={12} className="text-purple-500"/>
                          <a href={item.link} target="_blank" rel="noreferrer" className="text-xs font-bold text-purple-600 hover:underline">
                            Tautan Regulasi Resmi
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2 shrink-0 justify-end">
                    <button 
                      onClick={() => {
                        if (!canEdit) return onUnauthorizedAction("Edit Regulasi");
                        setEditingId(item.id);
                        setFormData(item);
                        setFormOpen(true);
                      }}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <Edit size={12}/> Edit Data
                    </button>
                    <button 
                      onClick={() => {
                        if (!canEdit) return onUnauthorizedAction("Hapus Regulasi");
                        setDeleteConfirm({
                          id: item.id,
                          message: `Hapus data pantauan regulasi permanen?`
                        });
                      }}
                      className="px-3 py-1.5 border border-red-100 hover:bg-red-50 text-red-600 text-xs font-bold rounded-lg transition-colors flex justify-center items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12}/> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Form */}
        {formOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen className="text-purple-600" />
                  {editingId ? 'Edit Regulasi' : 'Tambah Pantauan Regulasi'}
                </h3>
                <button onClick={() => setFormOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-left space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">SUMBER INSTITUSI</label>
                    <input type="text" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full p-2 text-sm border rounded-lg" placeholder="KLHK / ESDM / Pemda" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">TANGGAL TERBIT / DRAFT</label>
                    <input type="date" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} className="w-full p-2 text-sm border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">NOMOR PERATURAN</label>
                    <input type="text" value={formData.regulationNo} onChange={e => setFormData({...formData, regulationNo: e.target.value})} className="w-full p-2 text-sm border rounded-lg" placeholder="Permen LHK No 5 Tahun 2021" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">STATUS</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-2 text-sm border rounded-lg">
                      <option value="Draft">Draft</option>
                      <option value="Berlaku">Berlaku</option>
                      <option value="Dicabut">Dicabut</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TENTANG (JUDUL REGULASI)</label>
                  <textarea value={formData.about} onChange={e => setFormData({...formData, about: e.target.value})} rows={2} className="w-full p-2 text-sm border rounded-lg resize-none" placeholder="Tata Cara Penerbitan Persetujuan Teknis..." />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">IMPLIKASI / DAMPAK KE OPERASIONAL</label>
                  <textarea value={formData.implication} onChange={e => setFormData({...formData, implication: e.target.value})} rows={4} className="w-full p-2 text-sm border rounded-lg resize-none" placeholder="Perusahaan wajib mengurus penambahan lingkup baku mutu..." />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">TAUTAN DOKUMEN RESMI</label>
                  <input type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full p-2 text-sm border rounded-lg" placeholder="https://..." />
                </div>

              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 shrink-0 bg-white rounded-b-2xl">
                <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button 
                  onClick={handleSave}
                  disabled={!formData.regulationNo || !formData.about || !formData.implication}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
                >
                  Simpan Regulasi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 text-left">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1 rounded-lg bg-red-50 text-red-500"><Trash2 size={16}/></span>
                Konfirmasi Hapus
              </h3>
              <p className="text-xs text-slate-500 mt-3">{deleteConfirm.message}</p>
              <div className="flex gap-2 justify-end mt-5">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Batal</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl">Hapus Permanen</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ModuleErrorBoundary>
  );
}
