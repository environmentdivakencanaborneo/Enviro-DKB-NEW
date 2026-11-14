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
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';

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
      <div className="space-y-6 animate-fade-in text-text-hi font-sans">
        
        {/* Header */}
        <div className="glass-panel flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-[20px]">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-neon-cyan/10 text-neon-cyan rounded-2xl border border-neon-cyan/25">
              <CheckSquare className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-text-hi">Matriks Ketaatan RKL-RPL</h2>
              <p className="text-xs text-text-mid">Evaluasi pemenuhan matriks pengelolaan lingkungan hidup RKL-RPL per semester.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-border-subtle hover:border-border-neon text-text-mid hover:text-text-hi text-xs font-bold rounded-xl transition-all cursor-pointer bg-bg-2"
            >
              <Download size={14} className="text-neon-green" /> Ekspor Excel
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
              className="flex items-center gap-2 px-4 py-2.5 neon-btn-primary text-xs rounded-xl cursor-pointer"
            >
              <Plus size={14} /> Tambah Evaluasi
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="neon-card p-6 rounded-[20px] border-neon-cyan/30 relative overflow-hidden text-left">
            <div className="absolute -right-4 -bottom-4 opacity-10 text-neon-cyan">
              <CheckSquare size={80} className="stroke-[1.5]"/>
            </div>
            <p className="text-[10px] uppercase font-bold text-neon-cyan tracking-wider">Skor Ketaatan</p>
            <div className="flex items-end gap-1 mt-1 font-mono tabular-nums">
              <p className="text-3xl font-bold text-text-hi">{complianceScore}</p>
              <span className="text-sm font-semibold text-neon-cyan mb-1">%</span>
            </div>
          </div>
          <div className="neon-card p-6 rounded-[20px] text-left">
            <p className="text-[10px] uppercase font-bold text-text-low tracking-wider">Total Item</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-text-hi mt-1">{stats.total}</p>
          </div>
          <div className="neon-card bg-neon-green/5 border-neon-green/25 p-6 rounded-[20px] text-left">
            <p className="text-[10px] uppercase font-bold text-neon-green tracking-wider">Taat</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-neon-green mt-1">{stats.taat}</p>
          </div>
          <div className="neon-card bg-neon-amber/5 border-neon-amber/25 p-6 rounded-[20px] text-left">
            <p className="text-[10px] uppercase font-bold text-neon-amber tracking-wider">Belum Taat</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-neon-amber mt-1">{stats.belumTaat}</p>
          </div>
          <div className="neon-card bg-neon-red/5 border-neon-red/25 p-6 rounded-[20px] text-left">
            <p className="text-[10px] uppercase font-bold text-neon-red tracking-wider">Tidak Taat</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-neon-red mt-1">{stats.tidakTaat}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-low h-4.5 w-4.5" />
            <input 
              type="text" 
              placeholder="Cari rincian dampak atau target..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value)}
              className="px-4 py-2.5 text-xs font-semibold cursor-pointer"
            >
              <option value="All">Semua Periode</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={aspectFilter}
              onChange={e => setAspectFilter(e.target.value)}
              className="px-4 py-2.5 text-xs font-semibold cursor-pointer"
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
              className="px-4 py-2.5 text-xs font-semibold cursor-pointer"
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
            <div className="glass-panel rounded-[20px] p-4">
              <TableSkeleton columns={4} rows={4} />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="glass-panel rounded-[20px] p-4">
              <EmptyState
                icon={CheckSquare}
                title="Tidak ada data matriks ketaatan"
                description="Tambahkan item evaluasi RKL-RPL atau sesuaikan filter."
              />
            </div>
          ) : (
            filteredData.map(item => {
              const badgeStatus =
                item.status === 'Taat' ? 'Compliant' :
                item.status === 'Belum Taat' ? 'Pending' :
                item.status === 'Tidak Taat' ? 'Non-Compliant' : 'Dipantau';
              return (
                <div key={item.id} className="glass-panel p-6 rounded-[20px] hover:border-border-neon transition-all duration-200 text-left">
                  <div className="flex flex-col lg:flex-row gap-5 justify-between">
                    <div className="flex-1 space-y-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">
                          {item.period}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-bg-2 border border-border-subtle text-text-mid">
                          {item.aspect}
                        </span>
                        <StatusBadge status={badgeStatus} label={item.status} size="xs" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-bg-2/70 p-4 rounded-[15px] border border-border-subtle">
                          <p className="text-[10px] font-bold text-text-low uppercase tracking-wider mb-1.5">Rincian Dampak</p>
                          <p className="text-xs text-text-hi whitespace-pre-wrap leading-relaxed">{item.impactDetails}</p>
                        </div>
                        <div className="bg-bg-2/70 p-4 rounded-[15px] border border-border-neon/40">
                          <p className="text-[10px] font-bold text-neon-cyan uppercase tracking-wider mb-1.5">Target Pemenuhan</p>
                          <p className="text-xs text-text-hi whitespace-pre-wrap leading-relaxed">{item.target}</p>
                        </div>
                      </div>

                      {(item.notes || item.evidenceUrl) && (
                        <div className="flex gap-4 pt-3 border-t border-border-subtle flex-wrap items-center">
                          {item.evidenceUrl && (
                            <div className="flex items-center gap-1.5">
                              <LinkIcon size={12} className="text-neon-cyan"/>
                              <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-neon-cyan hover:underline">
                                Bukti Ketaatan →
                              </a>
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-xs text-text-mid italic">
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
                        className="px-3.5 py-2 border border-border-subtle hover:border-neon-cyan/40 bg-bg-2 hover:bg-neon-cyan/10 text-neon-cyan text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer"
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
                        className="px-3.5 py-2 border border-neon-red/25 bg-neon-red/10 hover:bg-neon-red/20 text-neon-red text-xs font-bold rounded-xl transition-all flex justify-center items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={12}/> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {formOpen && (
          <ModalPortal>
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-[20px] w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
                <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center shrink-0">
                  <h3 className="text-base font-bold text-text-hi flex items-center gap-2">
                    <CheckSquare className="text-neon-cyan h-5 w-5" />
                    {editingId ? 'Edit Evaluasi Ketaatan' : 'Tambah Evaluasi RKL-RPL Baru'}
                  </h3>
                  <button onClick={() => setFormOpen(false)} className="p-2 bg-bg-2 hover:bg-bg-1 border border-border-subtle rounded-full text-text-mid hover:text-text-hi cursor-pointer transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto text-left space-y-5">
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">PERIODE EVALUASI</label>
                      <input type="text" value={formData.period} onChange={e => setFormData({...formData, period: e.target.value})} className="w-full p-2.5 text-sm font-mono" placeholder="H1-2026" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">ASPEK LINGKUNGAN</label>
                      <select value={formData.aspect} onChange={e => setFormData({...formData, aspect: e.target.value as any})} className="w-full p-2.5 text-sm cursor-pointer font-medium">
                        <option value="Kualitas Air">Kualitas Air</option>
                        <option value="Kualitas Udara/Emisi">Kualitas Udara/Emisi</option>
                        <option value="Pengelolaan Limbah B3">Pengelolaan Limbah B3</option>
                        <option value="Sosial/Masyarakat">Sosial/Masyarakat</option>
                        <option value="Flora/Fauna">Flora/Fauna</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">STATUS EVALUASI</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full p-2.5 text-sm cursor-pointer font-medium">
                        <option value="Taat">Taat</option>
                        <option value="Belum Taat">Belum Taat</option>
                        <option value="Tidak Taat">Tidak Taat</option>
                        <option value="Tidak Relevan">Tidak Relevan</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">RINCIAN DAMPAK (SUMBER DARI MATRIKS)</label>
                    <textarea value={formData.impactDetails} onChange={e => setFormData({...formData, impactDetails: e.target.value})} rows={3} className="w-full p-2.5 text-sm resize-none" placeholder="Penurunan Kualitas Air Permukaan akibat erosi tanah terbuka..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">TARGET PEMENUHAN (PARAMETER & BAKU MUTU)</label>
                    <textarea value={formData.target} onChange={e => setFormData({...formData, target: e.target.value})} rows={3} className="w-full p-2.5 text-sm resize-none" placeholder="TSS < 300 mg/L, pH 6-9 sesuai PerGub Kaltim..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">TAUTAN BUKTI KETAATAN (LINK FOTO/DOKUMEN)</label>
                    <input type="url" value={formData.evidenceUrl} onChange={e => setFormData({...formData, evidenceUrl: e.target.value})} className="w-full p-2.5 text-sm" placeholder="https://drive.google.com/..." />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-low mb-1.5 tracking-wider">CATATAN TAMBAHAN</label>
                    <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 text-sm" placeholder="Masih dalam tahap perbaikan Settling Pond..." />
                  </div>

                </div>
                <div className="p-4 border-t border-border-subtle flex justify-end gap-2.5 shrink-0 bg-bg-1/70 rounded-b-[20px]">
                  <button onClick={() => setFormOpen(false)} className="px-5 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi rounded-xl transition-all cursor-pointer">Batal</button>
                  <button 
                    onClick={handleSave}
                    disabled={!formData.period || !formData.impactDetails || !formData.target}
                    className="px-5 py-2.5 text-xs font-bold neon-btn-primary disabled:opacity-40 rounded-xl cursor-pointer"
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
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-[20px] w-full max-w-md p-6 text-left animate-fade-in">
                <h3 className="text-sm font-bold text-text-hi flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-neon-red/15 text-neon-red border border-neon-red/30"><Trash2 size={16}/></span>
                  Konfirmasi Hapus Evaluasi
                </h3>
                <p className="text-xs text-text-mid mt-4 leading-relaxed">{deleteConfirm.message}</p>
                <div className="flex gap-2.5 justify-end mt-6">
                  <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi bg-bg-2 border border-border-subtle rounded-xl transition-all cursor-pointer">Batal</button>
                  <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2.5 text-xs font-bold neon-btn-danger rounded-xl cursor-pointer">Hapus Permanen</button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

      </div>
    </ModuleErrorBoundary>
  );
}

