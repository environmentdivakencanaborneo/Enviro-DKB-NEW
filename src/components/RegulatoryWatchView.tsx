import React, { useState, useMemo, useEffect } from 'react';
import ModalPortal from './ModalPortal';
import { RegulatoryWatchData } from '../types';
import { regulatoryService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import { 
  BookOpen, Plus, Search, Download, 
  Trash2, Edit, X,
  Link as LinkIcon, CheckCircle
} from 'lucide-react';
import ModuleErrorBoundary from './ModuleErrorBoundary';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';

interface RegulatoryWatchViewProps {
  data: RegulatoryWatchData[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canSeed?: boolean;
  initialSearch?: string;
  onClearInitialSearch?: () => void;
  onUnauthorizedAction: (action: string) => void;
}

const STANDARD_SOURCES = [
  'KLH/BPLH',
  'Kementerian Kehutanan',
  'Kementerian ESDM',
  'Pemerintah Pusat',
  'Pemprov Kaltim',
  'Pemkab/Pemkot',
  'Lainnya'
];

export default function RegulatoryWatchView({ 
  data, 
  isLoading, 
  canEdit = false, 
  canDelete,
  canSeed = false,
  initialSearch = '',
  onClearInitialSearch,
  onUnauthorizedAction 
}: RegulatoryWatchViewProps) {
  const allowedDelete = canDelete ?? false;
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedInfo, setSeedInfo] = useState<string | null>(null);
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<RegulatoryWatchData>>({
    source: 'KLH/BPLH',
    regulationNo: '',
    about: '',
    issueDate: todayLocalISO(),
    implication: '',
    status: 'Perlu Kajian',
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
    if (!allowedDelete) return onUnauthorizedAction("Hapus Data Regulasi");
    try {
      await regulatoryService.delete(id);
      setDeleteConfirm(null);
    } catch (e: any) {
      alert("Gagal menghapus: " + e.message);
    }
  };

  const handleSeedRegulations = async () => {
    if (!canSeed) return onUnauthorizedAction("Muat 15 Regulasi Referensi 2024–2026");
    setIsSeeding(true);
    setSeedInfo(null);
    try {
      const res = await regulatoryService.seedLatestRegulations();
      setSeedInfo(`Seed selesai: ${res.inserted} regulasi baru ditambahkan (status Perlu Kajian), ${res.skipped} sudah tersedia.`);
    } catch (err: any) {
      setSeedInfo(`Gagal memuat seed regulasi: ${err?.message || 'Terjadi kesalahan.'}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleExport = () => {
    exportToExcel(filteredData, "Pemantau_Regulasi_LH_ESDM");
  };

  const mapRegulatoryStatus = (status: string) => {
    if (status === 'Berlaku') return 'Aktif';
    if (status === 'Perlu Kajian') return 'Perlu Kajian';
    if (status === 'Draft') return 'Dipantau';
    return 'Dicabut';
  };

  return (
    <ModuleErrorBoundary moduleName="Pemantau Regulasi">
      <div className="space-y-6 animate-fade-in text-text-hi">
        
        {/* Header */}
        <div className="glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl">
          <div className="flex items-center gap-3.5 text-left">
            <div className="p-3 bg-neon-violet/15 text-neon-violet border border-neon-violet/35 rounded-xl shadow-glow-violet">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-hi font-heading">Pemantau Regulasi (Regulatory Watch)</h2>
              <p className="text-xs text-text-mid">Pemantauan peraturan terbaru KLH/BPLH, Kementerian Kehutanan &amp; ESDM beserta dampaknya.</p>
              {searchQuery && (
                <div className="mt-1.5 inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-neon-violet/10 border border-neon-violet/30 text-[11px] text-neon-violet">
                  <span>Filter aktif: <strong>{searchQuery}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      onClearInitialSearch?.();
                    }}
                    className="font-bold underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSeed && (
              <button
                onClick={handleSeedRegulations}
                disabled={isSeeding}
                className="flex items-center gap-2 px-3.5 py-2 border border-neon-violet/35 bg-neon-violet/10 hover:bg-neon-violet/20 text-neon-violet text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCircle size={14} />
                {isSeeding ? 'Memuat Seed...' : 'Muat 15 Regulasi Terbaru (2024–2026)'}
              </button>
            )}
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-3.5 py-2 border border-border-neon bg-bg-1 hover:bg-bg-2 text-text-hi text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Download size={14} className="text-neon-cyan" /> Ekspor Excel
            </button>
            <button 
              onClick={() => {
                if (!canEdit) return onUnauthorizedAction("Tambah Pemantauan Regulasi");
                setEditingId(null);
                setFormData({
                  source: 'KLH/BPLH',
                  regulationNo: '',
                  about: '',
                  issueDate: todayLocalISO(),
                  implication: '',
                  status: 'Perlu Kajian',
                  link: ''
                });
                setFormOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 neon-btn-primary text-xs rounded-xl transition-all cursor-pointer"
            >
              <Plus size={14} /> Tambah Regulasi
            </button>
          </div>
        </div>

        {seedInfo && (
          <div className="p-3.5 rounded-xl bg-neon-violet/10 border border-neon-violet/30 text-xs text-neon-violet flex items-center justify-between">
            <span>{seedInfo}</span>
            <button onClick={() => setSeedInfo(null)} className="text-neon-violet hover:underline font-bold cursor-pointer">Tutup</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-low h-4 w-4" />
            <input 
              type="text" 
              placeholder="Cari nomor peraturan atau tentang..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 text-sm cursor-pointer"
            >
              <option value="All">Semua Status</option>
              <option value="Perlu Kajian">Perlu Kajian</option>
              <option value="Berlaku">Berlaku</option>
              <option value="Draft">Draft</option>
              <option value="Dicabut">Dicabut</option>
            </select>
          </div>
        </div>

        {/* Data List */}
        <div className="space-y-3.5">
          {isLoading ? (
            <div className="glass-panel p-6 rounded-2xl">
              <TableSkeleton columns={3} rows={4} />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="glass-panel p-6 rounded-2xl">
              <EmptyState
                title="Belum ada data regulasi"
                description="Tidak ada data regulasi yang sesuai dengan filter."
                icon={BookOpen}
              />
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.id} className="glass-panel p-5 rounded-2xl hover:border-neon-cyan/40 transition-all text-left">
                <div className="flex flex-col lg:flex-row gap-4 justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={mapRegulatoryStatus(item.status)} label={item.status} />
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-bg-2 border border-border-subtle text-text-hi">
                        {item.source}
                      </span>
                      <span className="text-xs text-text-mid font-mono tabular-nums">
                        Terbit: {item.issueDate}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-base font-bold text-text-hi font-heading">{item.regulationNo}</h3>
                      <p className="text-sm text-text-mid mt-1 font-semibold">{item.about}</p>
                    </div>

                    <div className="bg-neon-violet/8 p-3.5 rounded-xl border border-neon-violet/25 mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-neon-violet font-mono">Implikasi &amp; Dampak Operasional</p>
                      <p className="text-xs text-text-hi whitespace-pre-wrap leading-relaxed">{item.implication}</p>
                    </div>

                    {item.link && (
                      <div className="flex gap-4 pt-2.5 border-t border-border-subtle">
                        <div className="flex items-center gap-1.5">
                          <LinkIcon size={12} className="text-neon-cyan"/>
                          <a href={item.link} target="_blank" rel="noreferrer" className="text-xs font-bold text-neon-cyan hover:underline">
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
                      className="px-3.5 py-2 border border-border-neon bg-bg-1 hover:bg-bg-2 text-text-hi text-xs font-bold rounded-xl transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
                    >
                      <Edit size={12} className="text-neon-cyan"/> Edit Data
                    </button>
                    <button 
                      onClick={() => {
                        if (!allowedDelete) return onUnauthorizedAction("Hapus Regulasi");
                        setDeleteConfirm({
                          id: item.id,
                          message: `Hapus data pantauan regulasi permanen?`
                        });
                      }}
                      className="px-3.5 py-2 neon-btn-danger text-xs rounded-xl transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
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
          <ModalPortal>
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                <div className="px-6 py-4 bg-bg-2/60 border-b border-border-neon flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-bold text-text-hi font-heading flex items-center gap-2">
                    <BookOpen className="text-neon-violet" />
                    {editingId ? 'Edit Regulasi' : 'Tambah Pantauan Regulasi'}
                  </h3>
                  <button onClick={() => setFormOpen(false)} className="p-2 bg-bg-1 hover:bg-bg-2 border border-border-subtle rounded-full text-text-mid hover:text-text-hi cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto text-left space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1 font-mono">SUMBER INSTITUSI</label>
                      <select
                        value={formData.source || 'KLH/BPLH'}
                        onChange={e => setFormData({...formData, source: e.target.value})}
                        className="w-full p-2.5 text-sm"
                      >
                        {STANDARD_SOURCES.map(src => (
                          <option key={src} value={src}>{src}</option>
                        ))}
                        {formData.source && !STANDARD_SOURCES.includes(formData.source) && (
                          <option value={formData.source}>{formData.source} (Data Lama)</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1 font-mono">TANGGAL TERBIT / DRAFT</label>
                      <input type="date" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} className="w-full p-2.5 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1 font-mono">NOMOR PERATURAN</label>
                      <input type="text" value={formData.regulationNo} onChange={e => setFormData({...formData, regulationNo: e.target.value})} className="w-full p-2.5 text-sm" placeholder="Permen LH/BPLH No. 7 Tahun 2025" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-mid mb-1 font-mono">STATUS</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-2.5 text-sm">
                        <option value="Perlu Kajian">Perlu Kajian</option>
                        <option value="Berlaku">Berlaku</option>
                        <option value="Draft">Draft</option>
                        <option value="Dicabut">Dicabut</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-mid mb-1 font-mono">TENTANG (JUDUL REGULASI)</label>
                    <textarea value={formData.about} onChange={e => setFormData({...formData, about: e.target.value})} rows={2} className="w-full p-2.5 text-sm resize-none" placeholder="Tata Cara Penerbitan Persetujuan Teknis..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-mid mb-1 font-mono">IMPLIKASI / DAMPAK KE OPERASIONAL</label>
                    <textarea value={formData.implication} onChange={e => setFormData({...formData, implication: e.target.value})} rows={4} className="w-full p-2.5 text-sm resize-none" placeholder="Perusahaan wajib mengurus penambahan lingkup baku mutu..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-mid mb-1 font-mono">TAUTAN DOKUMEN RESMI</label>
                    <input type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="w-full p-2.5 text-sm" placeholder="https://..." />
                  </div>

                </div>
                <div className="p-4 bg-bg-2/60 border-t border-border-neon flex justify-end gap-2 shrink-0">
                  <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-xs font-bold text-text-mid hover:text-text-hi bg-bg-1 hover:bg-bg-2 border border-border-subtle rounded-xl transition-colors cursor-pointer">Batal</button>
                  <button 
                    onClick={handleSave}
                    disabled={!formData.regulationNo || !formData.about || !formData.implication}
                    className="px-4 py-2 text-xs neon-btn-primary disabled:opacity-50 rounded-xl transition-all cursor-pointer"
                  >
                    Simpan Regulasi
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <ModalPortal>
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-2xl w-full max-w-sm p-6 text-left animate-fade-in">
                <h3 className="text-sm font-bold text-text-hi font-heading flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red"><Trash2 size={16}/></span>
                  Konfirmasi Hapus
                </h3>
                <p className="text-xs text-text-mid mt-3">{deleteConfirm.message}</p>
                <div className="flex gap-2 justify-end mt-5">
                  <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-xs font-bold text-text-mid hover:text-text-hi bg-bg-1 hover:bg-bg-2 border border-border-subtle rounded-xl cursor-pointer">Batal</button>
                  <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 text-xs font-bold bg-neon-red/15 hover:bg-neon-red/25 text-neon-red border border-neon-red/45 rounded-xl cursor-pointer">Hapus Permanen</button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

      </div>
    </ModuleErrorBoundary>
  );
}
