import React, { useState, useMemo } from 'react';
import ModalPortal from './ModalPortal';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';
import { CapaData, CapaHistory } from '../types';
import { capaService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
import { todayLocalISO } from '../utils/dateUtils';
import { 
  AlertOctagon, Plus, Search, Filter, Download, 
  Trash2, Edit, CheckCircle, Clock, ShieldAlert,
  Save, X
} from 'lucide-react';
import ModuleErrorBoundary from './ModuleErrorBoundary';

interface CapaViewProps {
  findings: CapaData[];
  isLoading: boolean;
  userEmail?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onUnauthorizedAction: (action: string) => void;
}

export default function CapaView({ 
  findings, 
  isLoading, 
  userEmail, 
  canEdit = false, 
  canDelete,
  onUnauthorizedAction 
}: CapaViewProps) {
  const allowedDelete = canDelete ?? false;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  
  // View Details Modal
  const [selectedFinding, setSelectedFinding] = useState<CapaData | null>(null);
  
  // Status Update Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const [formData, setFormData] = useState<Partial<CapaData>>({
    source: 'Audit Eksternal',
    title: '',
    description: '',
    severity: 'NC Minor',
    discoveryDate: todayLocalISO(),
    targetDate: todayLocalISO(Date.now() + 30*24*60*60*1000), // +30 days
    pic: '',
    why1: '', why2: '', why3: '', why4: '', why5: '', rootCause: '',
    correctiveAction: '',
    preventiveAction: '',
    status: 'Terbuka'
  });

  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      const matchSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.pic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || f.status === statusFilter;
      const matchSeverity = severityFilter === 'All' || f.severity === severityFilter;
      return matchSearch && matchStatus && matchSeverity;
    });
  }, [findings, searchQuery, statusFilter, severityFilter]);

  const stats = {
    total: findings.length,
    open: findings.filter(f => f.status === 'Terbuka').length,
    inProgress: findings.filter(f => f.status === 'Dalam Proses' || f.status === 'Verifikasi').length,
    closed: findings.filter(f => f.status === 'Selesai').length,
    overdue: findings.filter(f => f.status !== 'Selesai' && new Date(f.targetDate) < new Date()).length
  };

  const handleSave = async () => {
    if (!canEdit) return onUnauthorizedAction("Simpan Temuan CAPA");
    
    try {
      if (editingId) {
        await capaService.update(editingId, formData);
      } else {
        await capaService.add({
          ...(formData as any),
          history: [{
            status: formData.status,
            notes: 'Temuan dicatat',
            updatedAt: new Date().toISOString(),
            updatedBy: userEmail || 'unknown'
          }]
        });
      }
      setFormOpen(false);
      setEditingId(null);
    } catch (error: any) {
      console.error("Gagal menyimpan data:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!allowedDelete) return onUnauthorizedAction("Hapus Temuan CAPA");
    try {
      await capaService.delete(id);
      setDeleteConfirm(null);
      setFormOpen(false);
      setEditingId(null);
    } catch (e) {
      setDeleteConfirm(null);
    }
  };

  const handleUpdateStatus = async () => {
    if (!canEdit) return onUnauthorizedAction("Update Status CAPA");
    if (!selectedFinding) return;
    try {
      const historyEntry: CapaHistory = {
        status: newStatus as any,
        notes: statusNotes,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail || 'unknown'
      };
      await capaService.update(selectedFinding.id, { status: newStatus as any }, historyEntry);
      setStatusModalOpen(false);
      setSelectedFinding(null);
    } catch (e: any) {
      console.error("Gagal update status:", e);
    }
  };

  const handleExport = () => {
    exportToExcel(filteredFindings, "Register_Temuan_CAPA");
  };

  const calculateAging = (discoveryDate: string, closedDate?: string) => {
    const end = closedDate ? new Date(closedDate) : new Date();
    const start = new Date(discoveryDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <ModuleErrorBoundary moduleName="Register Temuan & CAPA">
      <div className="space-y-6 animate-fade-in text-text-hi font-sans">
        {/* Header & Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glass-panel p-6 rounded-[20px]">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-neon-cyan/10 text-neon-cyan rounded-2xl border border-border-neon">
              <AlertOctagon className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-text-hi font-heading">Register Temuan &amp; CAPA</h2>
              <p className="text-xs text-text-mid">Konsolidasi temuan audit, inspeksi, dan investigasi (Root Cause 5-Why).</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-border-neon hover:bg-bg-2 text-text-hi text-xs font-bold rounded-xl transition-all cursor-pointer bg-bg-2/70"
            >
              <Download size={14} className="text-neon-green" /> Ekspor Excel
            </button>
            <button 
              onClick={() => {
                if (!canEdit) return onUnauthorizedAction("Tambah Temuan Baru");
                setEditingId(null);
                setFormData({
                  source: 'Audit Eksternal',
                  title: '',
                  description: '',
                  severity: 'NC Minor',
                  discoveryDate: todayLocalISO(),
                  targetDate: todayLocalISO(Date.now() + 30*24*60*60*1000),
                  pic: '',
                  why1: '', why2: '', why3: '', why4: '', why5: '', rootCause: '',
                  correctiveAction: '',
                  preventiveAction: '',
                  status: 'Terbuka'
                });
                setFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 neon-btn-primary text-xs rounded-xl cursor-pointer"
            >
              <Plus size={14} /> Register Temuan Baru
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="neon-card p-6 text-left">
            <p className="text-[10px] uppercase font-bold text-text-mid tracking-wider font-mono">Total Temuan</p>
            <p className="text-3xl font-bold text-text-hi mt-1 font-mono tabular-nums">{stats.total}</p>
          </div>
          <div className="neon-card p-6 text-left">
            <p className="text-[10px] uppercase font-bold text-neon-red tracking-wider font-mono">Terbuka</p>
            <p className="text-3xl font-bold text-neon-red mt-1 font-mono tabular-nums">{stats.open}</p>
          </div>
          <div className="neon-card p-6 text-left">
            <p className="text-[10px] uppercase font-bold text-neon-amber tracking-wider font-mono">Dalam Proses</p>
            <p className="text-3xl font-bold text-neon-amber mt-1 font-mono tabular-nums">{stats.inProgress}</p>
          </div>
          <div className="neon-card p-6 text-left">
            <p className="text-[10px] uppercase font-bold text-neon-green tracking-wider font-mono">Selesai (Closed)</p>
            <p className="text-3xl font-bold text-neon-green mt-1 font-mono tabular-nums">{stats.closed}</p>
          </div>
          <div className={`neon-card p-6 relative overflow-hidden text-left col-span-2 md:col-span-1 ${stats.overdue > 0 ? 'border-neon-red/40 shadow-glow-red' : ''}`}>
            <p className="text-[10px] uppercase font-bold text-neon-red tracking-wider font-mono">Overdue (Terlambat)</p>
            <p className="text-3xl font-bold text-neon-red mt-1 font-mono tabular-nums">{stats.overdue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-low h-4.5 w-4.5" />
            <input 
              type="text" 
              placeholder="Cari judul, deskripsi, atau PIC..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-cyan h-3.5 w-3.5" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="pl-8 pr-8 py-2.5 text-xs font-semibold cursor-pointer appearance-none"
              >
                <option value="All">Semua Status</option>
                <option value="Terbuka">Terbuka</option>
                <option value="Dalam Proses">Dalam Proses</option>
                <option value="Verifikasi">Verifikasi</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="px-4 py-2.5 text-xs font-semibold cursor-pointer"
            >
              <option value="All">Semua Severity</option>
              <option value="NC Mayor">NC Mayor</option>
              <option value="NC Minor">NC Minor</option>
              <option value="Observasi">Observasi</option>
              <option value="OFI">OFI</option>
            </select>
          </div>
        </div>

        {/* Data List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-6 glass-panel rounded-[20px]">
              <TableSkeleton columns={4} rows={4} />
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="p-8 glass-panel rounded-[20px]">
              <EmptyState
                icon={CheckCircle}
                title="Tidak ada temuan yang sesuai dengan filter"
                description="Semua temuan audit, inspeksi, dan CAPA sesuai filter saat ini telah tertangani atau belum dicatat."
              />
            </div>
          ) : (
            filteredFindings.map(finding => {
              const overdue = finding.status !== 'Selesai' && new Date(finding.targetDate) < new Date();
              return (
                <div key={finding.id} className="glass-panel p-6 rounded-[20px] hover:border-neon-cyan/40 transition-all duration-200 text-left">
                  <div className="flex flex-col lg:flex-row gap-5 justify-between">
                    <div className="flex-1 space-y-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge
                          status={
                            finding.status === 'Dalam Proses'
                              ? 'Proses'
                              : finding.status === 'Verifikasi'
                              ? 'Dipantau'
                              : finding.status
                          }
                          label={finding.status}
                        />
                        <StatusBadge
                          status={
                            finding.severity === 'NC Mayor'
                              ? 'NC Mayor'
                              : finding.severity === 'NC Minor'
                              ? 'Warning'
                              : finding.severity === 'Observasi'
                              ? 'Observasi'
                              : 'Memenuhi'
                          }
                          label={finding.severity}
                        />
                        <span className="text-[10px] text-text-mid font-mono font-semibold flex items-center gap-1 bg-bg-2 border border-border-subtle px-2.5 py-0.5 rounded-md">
                          <ShieldAlert size={12} className="text-neon-cyan"/> {finding.source}
                        </span>
                        {overdue && (
                          <StatusBadge status="Overdue" label="TERLAMBAT" className="animate-critical-pulse" />
                        )}
                      </div>
                      
                      <h3 className="text-base font-bold text-text-hi font-heading">{finding.title}</h3>
                      <p className="text-xs text-text-mid leading-relaxed line-clamp-2">{finding.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-3.5 border-t border-border-subtle">
                        <div>
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider font-mono">Ditemukan</p>
                          <p className="text-xs font-semibold text-text-hi mt-0.5 font-mono tabular-nums">{finding.discoveryDate}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider font-mono">Target</p>
                          <p className={`text-xs font-semibold mt-0.5 font-mono tabular-nums ${overdue ? 'text-neon-red font-bold' : 'text-text-hi'}`}>{finding.targetDate}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider font-mono">PIC</p>
                          <p className="text-xs font-semibold text-text-hi mt-0.5">{finding.pic}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider font-mono">Aging</p>
                          <p className="text-xs font-semibold text-text-hi mt-0.5 flex items-center gap-1 font-mono tabular-nums">
                            <Clock size={12} className="text-neon-cyan"/> {calculateAging(finding.discoveryDate, finding.closedDate)} Hari
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex lg:flex-col gap-2 shrink-0 justify-end md:justify-start lg:justify-end">
                      <button 
                        onClick={() => setSelectedFinding(finding)}
                        className="px-3.5 py-2 bg-bg-2 hover:bg-neon-cyan/10 text-neon-cyan text-xs font-bold rounded-xl transition-all cursor-pointer border border-border-neon"
                      >
                        Lihat Detail
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedFinding(finding);
                          setNewStatus(finding.status);
                          setStatusNotes('');
                          setStatusModalOpen(true);
                        }}
                        className="px-3.5 py-2 border border-border-neon hover:bg-bg-2 text-text-hi text-xs font-bold rounded-xl transition-all cursor-pointer bg-bg-2/70"
                      >
                        Update Status
                      </button>
                      <button 
                        onClick={() => {
                          if (!canEdit) return onUnauthorizedAction("Edit Temuan CAPA");
                          setEditingId(finding.id);
                          setFormData(finding);
                          setFormOpen(true);
                        }}
                        className="px-3.5 py-2 border border-border-neon hover:bg-bg-2 text-text-hi text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 bg-bg-2/70"
                      >
                        <Edit size={12}/> Edit Data
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* View Details Modal */}
        {selectedFinding && !statusModalOpen && (
          <ModalPortal>
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-[20px] shadow-glow-cyan w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in">
                <div className="sticky top-0 bg-bg-1/95 backdrop-blur-md border-b border-border-neon px-6 py-4 flex justify-between items-center z-10 shrink-0">
                  <h3 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                    <AlertOctagon className="text-neon-cyan h-5 w-5" />
                    Detail Register Temuan &amp; CAPA
                  </h3>
                  <button onClick={() => setSelectedFinding(null)} className="p-2 bg-bg-2 hover:bg-neon-cyan/10 rounded-full text-text-mid hover:text-neon-cyan cursor-pointer transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 space-y-6 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[9px] font-bold text-text-mid uppercase tracking-wider mb-1.5 font-mono">Informasi Utama</h4>
                        <p className="text-sm text-text-hi font-bold">{selectedFinding.title}</p>
                        <p className="text-xs text-text-mid mt-2 bg-bg-2/60 p-4 rounded-[15px] border border-border-subtle leading-relaxed">{selectedFinding.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-bg-2/40 p-3.5 rounded-xl border border-border-subtle">
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider font-mono">Sumber / Severity</p>
                          <p className="text-xs font-bold text-text-hi mt-1">{selectedFinding.source} / {selectedFinding.severity}</p>
                        </div>
                        <div className="bg-bg-2/40 p-3.5 rounded-xl border border-border-subtle">
                          <p className="text-[9px] text-text-low font-bold uppercase tracking-wider font-mono">PIC / Target</p>
                          <p className="text-xs font-bold text-text-hi mt-1 font-mono tabular-nums">{selectedFinding.pic} / {selectedFinding.targetDate}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-[9px] font-bold text-text-mid uppercase tracking-wider mb-1.5 flex items-center gap-1 font-mono">
                          <CheckCircle size={12} className="text-neon-green"/> Tindakan Perbaikan (Corrective)
                        </h4>
                        <p className="text-xs text-text-hi bg-neon-green/5 p-4 rounded-[15px] border border-neon-green/25 whitespace-pre-wrap leading-relaxed">{selectedFinding.correctiveAction}</p>
                      </div>
                      <div>
                        <h4 className="text-[9px] font-bold text-text-mid uppercase tracking-wider mb-1.5 flex items-center gap-1 font-mono">
                          <ShieldAlert size={12} className="text-neon-cyan"/> Tindakan Pencegahan (Preventive)
                        </h4>
                        <p className="text-xs text-text-hi bg-bg-2/40 p-4 rounded-[15px] border border-border-subtle whitespace-pre-wrap leading-relaxed">{selectedFinding.preventiveAction}</p>
                      </div>
                    </div>
                  </div>

                  {/* 5-Why Analysis */}
                  <div className="border-t border-border-subtle pt-5">
                    <h4 className="text-xs font-bold text-text-hi font-heading mb-3.5 flex items-center gap-2">
                      <Search className="text-neon-cyan h-4.5 w-4.5" /> Root Cause Analysis (5-Why)
                    </h4>
                    <div className="bg-bg-2/40 border border-border-neon rounded-xl p-5 text-left">
                      <div className="space-y-2 relative">
                        {selectedFinding.why1 && <div className="flex gap-3 text-xs"><span className="font-bold text-neon-cyan w-12 shrink-0 font-mono">Why 1:</span><span className="text-text-hi leading-normal">{selectedFinding.why1}</span></div>}
                        {selectedFinding.why2 && <div className="flex gap-3 text-xs"><span className="font-bold text-neon-cyan w-12 shrink-0 font-mono">Why 2:</span><span className="text-text-hi leading-normal">{selectedFinding.why2}</span></div>}
                        {selectedFinding.why3 && <div className="flex gap-3 text-xs"><span className="font-bold text-neon-cyan w-12 shrink-0 font-mono">Why 3:</span><span className="text-text-hi leading-normal">{selectedFinding.why3}</span></div>}
                        {selectedFinding.why4 && <div className="flex gap-3 text-xs"><span className="font-bold text-neon-cyan w-12 shrink-0 font-mono">Why 4:</span><span className="text-text-hi leading-normal">{selectedFinding.why4}</span></div>}
                        {selectedFinding.why5 && <div className="flex gap-3 text-xs"><span className="font-bold text-neon-cyan w-12 shrink-0 font-mono">Why 5:</span><span className="text-text-hi leading-normal">{selectedFinding.why5}</span></div>}
                      </div>
                      {selectedFinding.rootCause && (
                        <div className="mt-4 pt-3.5 border-t border-border-subtle">
                          <p className="text-[9px] font-bold text-text-mid uppercase tracking-wider font-mono">Kesimpulan Akar Masalah</p>
                          <p className="text-xs text-neon-green font-bold mt-1 leading-normal">{selectedFinding.rootCause}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Append-Only History */}
                  <div className="border-t border-border-subtle pt-5">
                    <h4 className="text-xs font-bold text-text-hi font-heading mb-3.5 flex items-center gap-2">
                      <Clock className="text-neon-cyan h-4.5 w-4.5" /> Riwayat Progres Kepatuhan (Audit Trail)
                    </h4>
                    <div className="space-y-3">
                      {(selectedFinding.history || []).map((h, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-neon-cyan mt-1.5"></div>
                            {i !== selectedFinding.history.length - 1 && <div className="w-px h-full bg-border-neon mt-1.5"></div>}
                          </div>
                          <div className="bg-bg-2/40 border border-border-subtle rounded-xl p-3.5 flex-1 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-neon-green font-mono uppercase tracking-wide text-[10px]">{h.status}</span>
                              <span className="text-[10px] text-text-mid font-mono tabular-nums">{new Date(h.updatedAt).toLocaleString('id-ID')}</span>
                            </div>
                            <p className="text-text-hi mt-1 leading-relaxed">{h.notes}</p>
                            <p className="text-[9px] text-text-low italic mt-1.5">Diproses oleh: {h.updatedBy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* Status Update Modal */}
        {statusModalOpen && selectedFinding && (
          <ModalPortal>
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-[20px] shadow-glow-cyan w-full max-w-md overflow-hidden animate-fade-in">
                <div className="px-6 py-4 border-b border-border-neon flex justify-between items-center bg-bg-2/60">
                  <h3 className="text-base font-bold text-text-hi font-heading">Update Status Temuan</h3>
                  <button onClick={() => setStatusModalOpen(false)} className="p-2 bg-bg-2 hover:bg-neon-cyan/10 rounded-full text-text-mid hover:text-neon-cyan cursor-pointer transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 text-left space-y-4">
                  <div className="bg-bg-2/50 p-3 rounded-xl border border-border-subtle text-xs font-mono text-text-mid">
                    <strong className="text-text-hi">ID Temuan:</strong> {selectedFinding.id}
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-text-mid tracking-wider uppercase mb-1.5 font-mono">Status Baru</label>
                    <select 
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value)}
                      className="w-full p-2.5 text-sm cursor-pointer font-medium"
                    >
                      <option value="Terbuka">Terbuka</option>
                      <option value="Dalam Proses">Dalam Proses</option>
                      <option value="Verifikasi">Verifikasi</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-mid tracking-wider uppercase mb-1.5 font-mono">Catatan Progres (Wajib)</label>
                    <textarea 
                      value={statusNotes}
                      onChange={e => setStatusNotes(e.target.value)}
                      rows={3}
                      placeholder="Tulis detail perbaikan atau alasan update status..."
                      className="w-full p-2.5 text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-2.5 justify-end pt-4 border-t border-border-neon">
                    <button 
                      onClick={() => setStatusModalOpen(false)}
                      className="px-4 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi hover:bg-bg-2 rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleUpdateStatus}
                      disabled={!statusNotes.trim()}
                      className="px-5 py-2.5 text-xs neon-btn-primary disabled:opacity-40 rounded-xl cursor-pointer"
                    >
                      Simpan Riwayat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* Add/Edit Form Modal */}
        {formOpen && (
          <ModalPortal>
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-[20px] shadow-glow-cyan w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden">
                <div className="sticky top-0 bg-bg-1/95 backdrop-blur-md border-b border-border-neon px-6 py-4 flex justify-between items-center shrink-0 z-10">
                  <h3 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                    <Edit className="text-neon-cyan h-5 w-5" />
                    {editingId ? 'Edit Temuan Register' : 'Registrasi Temuan Baru'}
                  </h3>
                  <button onClick={() => setFormOpen(false)} className="p-2 bg-bg-2 hover:bg-neon-cyan/10 rounded-full text-text-mid hover:text-neon-cyan cursor-pointer transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto text-left space-y-6">
                  
                  {/* Basic Info */}
                  <div className="bg-bg-2/40 p-5 rounded-[18px] border border-border-subtle space-y-4">
                    <h4 className="text-xs font-bold text-neon-cyan uppercase tracking-wider font-mono">1. Informasi Dasar</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">JUDUL TEMUAN</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2.5 text-sm" placeholder="Contoh: Ceceran Oli di Area Workshop" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">SUMBER TEMUAN</label>
                        <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value as any})} className="w-full p-2.5 text-sm cursor-pointer">
                          <option value="Audit Eksternal">Audit Eksternal</option>
                          <option value="Audit Internal">Audit Internal ISO 14001</option>
                          <option value="Inspeksi DLH">Inspeksi DLH / ESDM</option>
                          <option value="Pengawasan Eksternal">Pengawasan Eksternal (DLH/KLH/ESDM/Kehutanan)</option>
                          <option value="PROPER">Penilaian PROPER</option>
                          <option value="Inspeksi Internal">Inspeksi Internal</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">DESKRIPSI KETIDAKSESUAIAN</label>
                        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full p-2.5 text-sm resize-none" placeholder="Tuliskan deskripsi lengkap kondisi ketidaksesuaian yang ditemukan di lapangan..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">SEVERITY</label>
                        <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value as any})} className="w-full p-2.5 text-sm cursor-pointer">
                          <option value="NC Mayor">NC Mayor</option>
                          <option value="NC Minor">NC Minor</option>
                          <option value="Observasi">Observasi</option>
                          <option value="OFI">OFI (Opportunity for Improvement)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">TGL DITEMUKAN</label>
                        <input type="date" value={formData.discoveryDate} onChange={e => setFormData({...formData, discoveryDate: e.target.value})} className="w-full p-2.5 text-sm font-mono" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">TARGET SELESAI</label>
                        <input type="date" value={formData.targetDate} onChange={e => setFormData({...formData, targetDate: e.target.value})} className="w-full p-2.5 text-sm font-mono" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">PIC (DEPARTEMEN)</label>
                        <input type="text" value={formData.pic} onChange={e => setFormData({...formData, pic: e.target.value})} className="w-full p-2.5 text-sm" placeholder="ex: K3LH, Sipil" />
                      </div>
                    </div>
                  </div>

                  {/* 5-Why */}
                  <div className="bg-bg-2/40 p-5 rounded-[18px] border border-border-subtle space-y-4">
                    <h4 className="text-xs font-bold text-neon-cyan uppercase tracking-wider flex justify-between items-center font-mono">
                      2. Analisis Akar Masalah (5-Why)
                      <span className="text-[9px] font-semibold text-text-mid lowercase bg-bg-1 px-2.5 py-1 rounded-full border border-border-subtle">Opsional tapi sangat direkomendasikan</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2 md:border-r border-border-subtle md:pr-4">
                        <input type="text" placeholder="Why 1? Mengapa hal ini bisa terjadi?" value={formData.why1} onChange={e => setFormData({...formData, why1: e.target.value})} className="w-full p-2.5 text-xs" />
                        <input type="text" placeholder="Why 2? Mengapa demikian?" value={formData.why2} onChange={e => setFormData({...formData, why2: e.target.value})} className="w-full p-2.5 text-xs" />
                        <input type="text" placeholder="Why 3? Mengapa?" value={formData.why3} onChange={e => setFormData({...formData, why3: e.target.value})} className="w-full p-2.5 text-xs" />
                        <input type="text" placeholder="Why 4? Mengapa?" value={formData.why4} onChange={e => setFormData({...formData, why4: e.target.value})} className="w-full p-2.5 text-xs" />
                        <input type="text" placeholder="Why 5? Mengapa?" value={formData.why5} onChange={e => setFormData({...formData, why5: e.target.value})} className="w-full p-2.5 text-xs" />
                      </div>
                      <div className="flex flex-col">
                        <label className="block text-[10px] font-bold text-text-mid mb-1.5 tracking-wider font-mono">KESIMPULAN ROOT CAUSE</label>
                        <textarea value={formData.rootCause} onChange={e => setFormData({...formData, rootCause: e.target.value})} className="w-full p-2.5 text-xs flex-1 resize-none" placeholder="Ringkas akar masalah utama berdasarkan rangkaian analisis 5-Why di samping..." />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-bg-2/40 p-5 rounded-[18px] border border-border-subtle space-y-4">
                    <h4 className="text-xs font-bold text-neon-cyan uppercase tracking-wider font-mono">3. Rencana Tindakan (CAPA)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-bold text-neon-green mb-1.5 tracking-wider font-mono">CORRECTIVE ACTION (TINDAKAN PERBAIKAN LANGSUNG)</label>
                        <textarea value={formData.correctiveAction} onChange={e => setFormData({...formData, correctiveAction: e.target.value})} rows={4} className="w-full p-2.5 text-sm resize-none" placeholder="Tuliskan tindakan langsung yang diambil untuk menanggulangi temuan ini sekarang..." />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neon-cyan mb-1.5 tracking-wider font-mono">PREVENTIVE ACTION (PENCEGAHAN AGAR TIDAK TERULANG)</label>
                        <textarea value={formData.preventiveAction} onChange={e => setFormData({...formData, preventiveAction: e.target.value})} rows={4} className="w-full p-2.5 text-sm resize-none" placeholder="Sistem, instruksi kerja, SOP, atau perbaikan fisik apa yang diubah agar kejadian ini tidak terulang di masa depan..." />
                      </div>
                    </div>
                  </div>

                </div>
                <div className="p-4 border-t border-border-neon flex justify-between shrink-0 bg-bg-1/95 rounded-b-[20px]">
                  {editingId && (
                    <button 
                      onClick={() => {
                        if (!allowedDelete) return onUnauthorizedAction("Hapus Temuan CAPA");
                        setDeleteConfirm({ id: editingId, title: formData.title || 'Temuan' });
                      }}
                      className="px-4 py-2.5 text-xs neon-btn-danger rounded-xl cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={14}/> Hapus Permanen
                    </button>
                  )}
                  <div className="flex gap-2.5 ml-auto">
                    <button 
                      onClick={() => setFormOpen(false)}
                      className="px-4 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi hover:bg-bg-2 rounded-xl transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={!formData.title || !formData.description || !formData.correctiveAction}
                      className="px-5 py-2.5 text-xs neon-btn-primary disabled:opacity-40 rounded-xl cursor-pointer flex items-center gap-2"
                    >
                      <Save size={14}/> Simpan Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* Delete Confirm Modal */}
        {deleteConfirm && (
          <ModalPortal>
            <div className="fixed inset-0 bg-bg-0/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-[20px] shadow-glow-red w-full max-w-md p-6 text-left animate-fade-in">
                <h3 className="text-sm font-bold text-text-hi font-heading flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-neon-red/10 text-neon-red"><Trash2 size={16}/></span>
                  Konfirmasi Hapus Temuan
                </h3>
                <p className="text-xs text-text-mid mt-4 leading-relaxed">
                  Apakah Anda yakin ingin menghapus temuan <strong className="text-text-hi">"{deleteConfirm.title}"</strong> secara permanen? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-2.5 justify-end mt-6">
                  <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 text-xs font-bold text-text-mid hover:text-text-hi hover:bg-bg-2 rounded-xl transition-all cursor-pointer">Batal</button>
                  <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2.5 text-xs neon-btn-danger rounded-xl cursor-pointer">Hapus Permanen</button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

      </div>
    </ModuleErrorBoundary>
  );
}
