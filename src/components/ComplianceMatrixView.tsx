import React, { useState, useMemo } from 'react';
import ModalPortal from './ModalPortal';
import { ComplianceMatrixData } from '../types';
import { complianceMatrixService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { 
  CheckSquare, Plus, Search, Download, 
  Trash2, Edit, X, Link as LinkIcon
} from 'lucide-react';
import ModuleErrorBoundary from './ModuleErrorBoundary';

interface ComplianceMatrixViewProps {
  data: ComplianceMatrixData[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function ComplianceMatrixView({ 
  data, 
  isLoading, 
  canEdit = false, 
  canDelete,
  onUnauthorizedAction 
}: ComplianceMatrixViewProps) {
  const allowedDelete = canDelete ?? false;
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('All');
  const [aspectFilter, setAspectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<ComplianceMatrixData>>({
    period: 'H1-' + new Date().getFullYear(),
    aspect: 'Kualitas Air',
    impactDetails: '',
    target: '',
    status: 'Belum Taat',
    evidenceUrl: '',
    notes: ''
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, message: string} | null>(null);

  const periods = useMemo(() => Array.from(new Set(data.map(d => d.period))).sort().reverse(), [data]);

  const filteredData = useMemo(() => {
    return data.filter(f => {
      const matchSearch = f.impactDetails.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.target.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPeriod = periodFilter === 'All' || f.period === periodFilter;
      const matchAspect = aspectFilter === 'All' || f.aspect === aspectFilter;
      const matchStatus = statusFilter === 'All' || f.status === statusFilter;
      return matchSearch && matchPeriod && matchAspect && matchStatus;
    });
  }, [data, searchQuery, periodFilter, aspectFilter, statusFilter]);

  const stats = {
    total: filteredData.length,
    taat: filteredData.filter(d => d.status === 'Taat').length,
    belumTaat: filteredData.filter(d => d.status === 'Belum Taat').length,
    tidakTaat: filteredData.filter(d => d.status === 'Tidak Taat').length,
    tidakRelevan: filteredData.filter(d => d.status === 'Tidak Relevan').length,
  };

  const complianceScore = stats.total > 0 
    ? Math.round((stats.taat / (stats.total - stats.tidakRelevan)) * 100) || 0
    : 0;

  const handleSave = async () => {
    if (!canEdit) return onUnauthorizedAction("Simpan Matriks Ketaatan");
    
    try {
      if (editingId) {
        await complianceMatrixService.update(editingId, formData);
      } else {
        await complianceMatrixService.add(formData as any);
      }
      setFormOpen(false);
      setEditingId(null);
    } catch (error: any) {
      alert("Gagal menyimpan data: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!allowedDelete) return onUnauthorizedAction("Hapus Item Matriks Ketaatan");
    try {
      await complianceMatrixService.delete(id);
      setDeleteConfirm(null);
    } catch (e: any) {
      alert("Gagal menghapus: " + e.message);
    }
  };

  const handleExport = () => {
    exportToExcel(filteredData, "Matriks_Ketaatan_RKL_RPL");
  };

  return (
    <ModuleErrorBoundary moduleName="Matriks Ketaatan RKL-RPL">
      <div className="space-y-6 animate-fade-in text-text-primary font-sans">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[20px] border border-border-custom shadow-custom">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-forest-100/60 text-[#2F5A46] rounded-2xl border border-border-custom">
              <CheckSquare className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-text-primary">Matriks Ketaatan RKL-RPL</h2>
              <p className="text-xs text-text-secondary">Evaluasi pemenuhan matriks pengelolaan lingkungan hidup RKL-RPL per semester.</p>
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
                if (!canEdit) return onUnauthorizedAction("Tambah Evaluasi RKL-RPL");
                setEditingId(null);
                setFormData({
                  period: periods.length > 0 ? periods[0] : 'H1-' + new Date().getFullYear(),
                  aspect: 'Kualitas Air',
                  impactDetails: '',
                  target: '',
                  status: 'Belum Taat',
                  evidenceUrl: '',
                  notes: ''
                });
                setFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#4D7C5A] hover:bg-[#2F5A46] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer border border-[#2F5A46]/10"
            >
              <Plus size={14} /> Tambah Evaluasi
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#2E4B3D] border border-[#233B2F] p-6 rounded-[20px] text-white shadow-custom relative overflow-hidden text-left">
            <div className="absolute -right-4 -bottom-4 opacity-10 text-white">
              <CheckSquare size={80} className="stroke-[1.5]"/>
            </div>
            <p className="text-[10px] uppercase font-bold text-[#A8B9A5] tracking-wider font-manrope">Skor Ketaatan</p>
            <div className="flex items-end gap-1 mt-1 font-manrope">
              <p className="text-3xl font-bold">{complianceScore}</p>
              <span className="text-sm font-semibold text-[#A8B9A5] mb-1">%</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom text-left">
            <p className="text-[10px] uppercase font-bold text-text-secondary tracking-wider font-manrope">Total Item</p>
            <p className="text-3xl font-bold text-text-primary mt-1 font-manrope">{stats.total}</p>
          </div>
          <div className="bg-[#3FA66B]/5 border border-[#3FA66B]/15 p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#2F5A46] tracking-wider font-manrope">Taat</p>
            <p className="text-3xl font-bold text-[#2F5A46] mt-1 font-manrope">{stats.taat}</p>
          </div>
          <div className="bg-[#E2A43B]/5 border border-[#E2A43B]/15 p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#8F5E13] tracking-wider font-manrope">Belum Taat</p>
            <p className="text-3xl font-bold text-[#8F5E13] mt-1 font-manrope">{stats.belumTaat}</p>
          </div>
          <div className="bg-[#D95C5C]/5 border border-[#D95C5C]/15 p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#9C3333] tracking-wider font-manrope">Tidak Taat</p>
            <p className="text-3xl font-bold text-[#9C3333] mt-1 font-manrope">{stats.tidakTaat}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7B73] h-4.5 w-4.5" />
            <input 
              type="text" 
              placeholder="Cari rincian dampak atau target..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border-custom rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] text-text-primary shadow-sm placeholder-[#6D7B73]/60"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-border-custom rounded-xl text-xs font-semibold text-[#2F5A46] focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer shadow-sm"
            >
              <option value="All">Semua Periode</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={aspectFilter}
              onChange={e => setAspectFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-border-custom rounded-xl text-xs font-semibold text-[#2F5A46] focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer shadow-sm"
            >
              <option value="All">Semua Aspek</option>
              <option value="Kualitas Air">Kualitas Air</option>
              <option value="Kualitas Udara/Emisi">Kualitas Udara/Emisi</option>
              <option value="Pengelolaan Limbah B3">Limbah B3</option>
              <option value="Sosial/Masyarakat">Sosial/Masyarakat</option>
              <option value="Flora/Fauna">Flora/Fauna</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-border-custom rounded-xl text-xs font-semibold text-[#2F5A46] focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer shadow-sm"
            >
              <option value="All">Semua Status</option>
              <option value="Taat">Taat</option>
              <option value="Belum Taat">Belum Taat</option>
              <option value="Tidak Taat">Tidak Taat</option>
              <option value="Tidak Relevan">Tidak Relevan</option>
            </select>
          </div>
        </div>

        {/* Data List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-text-secondary animate-pulse bg-white rounded-[20px] border border-border-custom shadow-custom">
              Memuat data ketaatan...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-16 text-center text-text-secondary bg-white rounded-[20px] border border-border-custom shadow-custom">
              Tidak ada data matriks ketaatan yang sesuai dengan filter.
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.id} className="bg-white p-6 rounded-[20px] border border-border-custom hover:border-forest-200 transition-all duration-200 shadow-custom text-left">
                <div className="flex flex-col lg:flex-row gap-5 justify-between">
                  <div className="flex-1 space-y-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#2E4B3D] text-white font-manrope">
                        {item.period}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-forest-50 border border-border-custom text-[#4D7C5A] font-manrope">
                        {item.aspect}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border font-manrope ${
                        item.status === 'Taat' ? 'bg-[#3FA66B]/10 border-[#3FA66B]/15 text-[#2F5A46]' :
                        item.status === 'Belum Taat' ? 'bg-[#E2A43B]/10 border-[#E2A43B]/15 text-[#8F5E13]' :
                        item.status === 'Tidak Taat' ? 'bg-[#D95C5C]/10 border-[#D95C5C]/15 text-[#9C3333]' :
                        'bg-forest-50 border-border-custom text-text-secondary'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-forest-50/50 p-4 rounded-[15px] border border-[#E6ECE6]">
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-manrope">Rincian Dampak</p>
                        <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{item.impactDetails}</p>
                      </div>
                      <div className="bg-forest-50/30 p-4 rounded-[15px] border border-border-custom">
                        <p className="text-[10px] font-bold text-[#2F5A46] uppercase tracking-wider mb-1.5 font-manrope">Target Pemenuhan</p>
                        <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">{item.target}</p>
                      </div>
                    </div>

                    {(item.notes || item.evidenceUrl) && (
                      <div className="flex gap-4 pt-3 border-t border-[#E6ECE6] flex-wrap items-center">
                        {item.evidenceUrl && (
                          <div className="flex items-center gap-1.5">
                            <LinkIcon size={12} className="text-[#4D7C5A]"/>
                            <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#4D7C5A] hover:underline">
                              Bukti Ketaatan →
                            </a>
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-xs text-text-secondary italic">
                            Catatan: {item.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex lg:flex-col gap-2 shrink-0 justify-end md:justify-start lg:justify-end">
                    <button 
                      onClick={() => {
                        if (!canEdit) return onUnauthorizedAction("Edit Matriks");
                        setEditingId(item.id);
                        setFormData(item);
                        setFormOpen(true);
                      }}
                      className="px-3.5 py-2 border border-border-custom hover:bg-forest-50 text-text-primary text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer shadow-sm bg-white"
                    >
                      <Edit size={12}/> Edit Data
                    </button>
                    <button 
                      onClick={() => {
                        if (!allowedDelete) return onUnauthorizedAction("Hapus Matriks");
                        setDeleteConfirm({
                          id: item.id,
                          message: `Apakah Anda yakin ingin menghapus evaluasi ketaatan ini secara permanen? Tindakan ini tidak dapat dibatalkan.`
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
              <div className="bg-white rounded-[20px] shadow-2xl border border-border-custom w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
                <div className="px-6 py-4 border-b border-[#E6ECE6] flex justify-between items-center shrink-0">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <CheckSquare className="text-[#4D7C5A] h-5 w-5" />
                    {editingId ? 'Edit Evaluasi Ketaatan' : 'Tambah Evaluasi RKL-RPL Baru'}
                  </h3>
                  <button onClick={() => setFormOpen(false)} className="p-2 bg-forest-50 hover:bg-[#DCE5DA] rounded-full text-[#2F5A46] cursor-pointer transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto text-left space-y-5">
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">PERIODE EVALUASI</label>
                      <input type="text" value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A]" placeholder="H1-2026" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">ASPEK LINGKUNGAN</label>
                      <select value={formData.aspect} onChange={e => setFormData({...formData, aspect: e.target.value as any})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] cursor-pointer font-medium">
                        <option value="Kualitas Air">Kualitas Air</option>
                        <option value="Kualitas Udara/Emisi">Kualitas Udara/Emisi</option>
                        <option value="Pengelolaan Limbah B3">Pengelolaan Limbah B3</option>
                        <option value="Sosial/Masyarakat">Sosial/Masyarakat</option>
                        <option value="Flora/Fauna">Flora/Fauna</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">STATUS EVALUASI</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] cursor-pointer font-medium">
                        <option value="Taat">Taat</option>
                        <option value="Belum Taat">Belum Taat</option>
                        <option value="Tidak Taat">Tidak Taat</option>
                        <option value="Tidak Relevan">Tidak Relevan</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">RINCIAN DAMPAK (SUMBER DARI MATRIKS)</label>
                    <textarea value={formData.impactDetails} onChange={e => setFormData({...formData, impactDetails: e.target.value})} rows={3} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] resize-none" placeholder="Penurunan Kualitas Air Permukaan akibat erosi tanah terbuka..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TARGET PEMENUHAN (PARAMETER & BAKU MUTU)</label>
                    <textarea value={formData.target} onChange={e => setFormData({...formData, target: e.target.value})} rows={3} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] resize-none" placeholder="TSS < 300 mg/L, pH 6-9 sesuai PerGub Kaltim..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TAUTAN BUKTI KETAATAN (LINK FOTO/DOKUMEN)</label>
                    <input type="url" value={formData.evidenceUrl} onChange={e => setFormData({...formData, evidenceUrl: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A]" placeholder="https://drive.google.com/..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">CATATAN TAMBAHAN</label>
                    <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A]" placeholder="Masih dalam tahap perbaikan Settling Pond..." />
                  </div>

                </div>
                <div className="p-4 border-t border-[#E6ECE6] flex justify-end gap-2.5 shrink-0 bg-white rounded-b-[20px]">
                  <button onClick={() => setFormOpen(false)} className="px-5 py-2.5 text-xs font-bold text-text-secondary hover:bg-forest-50 rounded-xl transition-all cursor-pointer">Batal</button>
                  <button 
                    onClick={handleSave}
                    disabled={!formData.period || !formData.impactDetails || !formData.target}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#4D7C5A] hover:bg-[#2F5A46] disabled:opacity-40 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Simpan Evaluasi
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
                  Konfirmasi Hapus Evaluasi
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
