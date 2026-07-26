import React, { useState, useMemo } from 'react';
import { CapaData, CapaHistory } from '../types';
import { capaService } from '../services/dbService';
import { exportToExcel } from '../services/exportService';
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
  onUnauthorizedAction: (action: string) => void;
}

export default function CapaView({ 
  findings, 
  isLoading, 
  userEmail, 
  canEdit = false, 
  onUnauthorizedAction 
}: CapaViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
    discoveryDate: new Date().toISOString().split('T')[0],
    targetDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // +30 days
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
      alert("Gagal menyimpan data: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return onUnauthorizedAction("Hapus Temuan CAPA");
    if (confirm("Apakah Anda yakin ingin menghapus temuan ini secara permanen?")) {
      try {
        await capaService.delete(id);
      } catch (e: any) {
        alert("Gagal menghapus: " + e.message);
      }
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
      alert("Gagal update status: " + e.message);
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
      <div className="space-y-6 animate-fade-in text-text-primary font-sans">
        {/* Header & Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[20px] border border-border-custom shadow-custom">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-forest-100/60 text-[#2F5A46] rounded-2xl border border-border-custom">
              <AlertOctagon className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-text-primary">Register Temuan & CAPA</h2>
              <p className="text-xs text-text-secondary">Konsolidasi temuan audit, inspeksi, dan investigasi (Root Cause 5-Why).</p>
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
                if (!canEdit) return onUnauthorizedAction("Tambah Temuan Baru");
                setEditingId(null);
                setFormData({
                  source: 'Audit Eksternal',
                  title: '',
                  description: '',
                  severity: 'NC Minor',
                  discoveryDate: new Date().toISOString().split('T')[0],
                  targetDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                  pic: '',
                  why1: '', why2: '', why3: '', why4: '', why5: '', rootCause: '',
                  correctiveAction: '',
                  preventiveAction: '',
                  status: 'Terbuka'
                });
                setFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#4D7C5A] hover:bg-[#2F5A46] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer border border-[#2F5A46]/10"
            >
              <Plus size={14} /> Register Temuan Baru
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom text-left">
            <p className="text-[10px] uppercase font-bold text-text-secondary tracking-wider font-manrope">Total Temuan</p>
            <p className="text-3xl font-bold text-text-primary mt-1 font-manrope">{stats.total}</p>
          </div>
          <div className="bg-[#D95C5C]/5 border border-[#D95C5C]/15 p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#9C3333] tracking-wider font-manrope">Terbuka</p>
            <p className="text-3xl font-bold text-[#9C3333] mt-1 font-manrope">{stats.open}</p>
          </div>
          <div className="bg-[#E2A43B]/5 border border-[#E2A43B]/15 p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#8F5E13] tracking-wider font-manrope">Dalam Proses</p>
            <p className="text-3xl font-bold text-[#8F5E13] mt-1 font-manrope">{stats.inProgress}</p>
          </div>
          <div className="bg-[#3FA66B]/5 border border-[#3FA66B]/15 p-6 rounded-[20px] text-left shadow-sm">
            <p className="text-[10px] uppercase font-bold text-[#2F5A46] tracking-wider font-manrope">Selesai (Closed)</p>
            <p className="text-3xl font-bold text-[#2F5A46] mt-1 font-manrope">{stats.closed}</p>
          </div>
          <div className="bg-[#853030] border border-[#6B2424] p-6 rounded-[20px] text-white shadow-custom relative overflow-hidden text-left">
            <p className="text-[10px] uppercase font-bold text-[#E6C5C5] tracking-wider font-manrope">Overdue (Terlambat)</p>
            <p className="text-3xl font-bold text-white mt-1 font-manrope">{stats.overdue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D7B73] h-4.5 w-4.5" />
            <input 
              type="text" 
              placeholder="Cari judul, deskripsi, atau PIC..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border-custom rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] focus:border-[#4D7C5A] text-text-primary shadow-sm placeholder-[#6D7B73]/60"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2F5A46] h-3.5 w-3.5" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="pl-8 pr-8 py-2.5 bg-white border border-border-custom rounded-xl text-xs font-semibold text-[#2F5A46] focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer shadow-sm appearance-none"
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
              className="px-4 py-2.5 bg-white border border-border-custom rounded-xl text-xs font-semibold text-[#2F5A46] focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer shadow-sm"
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
            <div className="p-12 text-center text-text-secondary animate-pulse bg-white rounded-[20px] border border-border-custom shadow-custom">
              Memuat data register temuan...
            </div>
          ) : filteredFindings.length === 0 ? (
            <div className="p-16 text-center text-text-secondary bg-white rounded-[20px] border border-border-custom shadow-custom">
              <CheckCircle className="mx-auto h-8 w-8 text-[#A8B9A5] mb-3" />
              <p className="font-semibold text-sm">Tidak ada temuan yang sesuai dengan filter.</p>
            </div>
          ) : (
            filteredFindings.map(finding => {
              const overdue = finding.status !== 'Selesai' && new Date(finding.targetDate) < new Date();
              return (
                <div key={finding.id} className="bg-white p-6 rounded-[20px] border border-border-custom hover:border-forest-200 transition-all duration-200 shadow-custom text-left">
                  <div className="flex flex-col lg:flex-row gap-5 justify-between">
                    <div className="flex-1 space-y-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-manrope ${
                          finding.status === 'Selesai' ? 'bg-[#3FA66B]/10 border border-[#3FA66B]/15 text-[#2F5A46]' :
                          finding.status === 'Verifikasi' ? 'bg-[#2E4B3D]/10 border border-[#2E4B3D]/15 text-[#2E4B3D]' :
                          finding.status === 'Dalam Proses' ? 'bg-[#E2A43B]/10 border border-[#E2A43B]/15 text-[#8F5E13]' :
                          'bg-[#D95C5C]/10 border border-[#D95C5C]/15 text-[#9C3333]'
                        }`}>
                          {finding.status}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold font-manrope tracking-wider ${
                          finding.severity === 'NC Mayor' ? 'border-[#D95C5C]/30 text-[#9C3333] bg-[#D95C5C]/5' :
                          finding.severity === 'NC Minor' ? 'border-[#E2A43B]/30 text-[#8F5E13] bg-[#E2A43B]/5' :
                          finding.severity === 'Observasi' ? 'border-[#E2A43B]/20 text-[#8F5E13] bg-[#E2A43B]/5' :
                          'border-[#4D7C5A]/30 text-[#2F5A46] bg-[#4D7C5A]/5'
                        }`}>
                          {finding.severity}
                        </span>
                        <span className="text-[10px] text-text-secondary font-manrope font-semibold flex items-center gap-1 bg-forest-50 border border-border-custom px-2.5 py-0.5 rounded-full">
                          <ShieldAlert size={12} className="text-[#4D7C5A]"/> {finding.source}
                        </span>
                        {overdue && (
                          <span className="text-[9px] font-bold text-white bg-[#A33E3E] px-2.5 py-0.5 rounded-full animate-pulse tracking-wider">
                            TERLAMBAT
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-base font-bold text-text-primary">{finding.title}</h3>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{finding.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-3.5 border-t border-[#E6ECE6]">
                        <div>
                          <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">Ditemukan</p>
                          <p className="text-xs font-semibold text-text-primary mt-0.5">{finding.discoveryDate}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">Target</p>
                          <p className={`text-xs font-semibold mt-0.5 ${overdue ? 'text-[#A33E3E] font-bold' : 'text-text-primary'}`}>{finding.targetDate}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">PIC</p>
                          <p className="text-xs font-semibold text-text-primary mt-0.5">{finding.pic}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">Aging</p>
                          <p className="text-xs font-semibold text-text-primary mt-0.5 flex items-center gap-1">
                            <Clock size={12} className="text-[#4D7C5A]"/> {calculateAging(finding.discoveryDate, finding.closedDate)} Hari
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex lg:flex-col gap-2 shrink-0 justify-end md:justify-start lg:justify-end">
                      <button 
                        onClick={() => setSelectedFinding(finding)}
                        className="px-3.5 py-2 bg-forest-50 hover:bg-[#DCE5DA] text-[#2F5A46] text-xs font-bold rounded-xl transition-all cursor-pointer border border-[#2F5A46]/5 shadow-sm"
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
                        className="px-3.5 py-2 border border-border-custom hover:bg-forest-50 text-text-primary text-xs font-bold rounded-xl transition-all cursor-pointer bg-white shadow-sm"
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
                        className="px-3.5 py-2 border border-border-custom hover:bg-forest-50 text-text-primary text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 bg-white shadow-sm"
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl border border-border-custom w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in">
              <div className="sticky top-0 bg-white border-b border-[#E6ECE6] px-6 py-4 flex justify-between items-center z-10 shrink-0">
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <AlertOctagon className="text-[#4D7C5A] h-5 w-5" />
                  Detail Register Temuan & CAPA
                </h3>
                <button onClick={() => setSelectedFinding(null)} className="p-2 bg-forest-50 hover:bg-[#DCE5DA] rounded-full text-[#2F5A46] cursor-pointer transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-manrope">Informasi Utama</h4>
                      <p className="text-sm text-text-primary font-bold">{selectedFinding.title}</p>
                      <p className="text-xs text-text-secondary mt-2 bg-forest-50/50 p-4 rounded-[15px] border border-[#E6ECE6] leading-relaxed">{selectedFinding.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-forest-50/30 p-3.5 rounded-xl border border-border-custom">
                        <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">Sumber / Severity</p>
                        <p className="text-xs font-bold text-text-primary mt-1">{selectedFinding.source} / {selectedFinding.severity}</p>
                      </div>
                      <div className="bg-forest-50/30 p-3.5 rounded-xl border border-border-custom">
                        <p className="text-[9px] text-[#6D7B73] font-bold uppercase tracking-wider font-manrope">PIC / Target</p>
                        <p className="text-xs font-bold text-text-primary mt-1">{selectedFinding.pic} / {selectedFinding.targetDate}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1 font-manrope">
                        <CheckCircle size={12} className="text-[#2F5A46]"/> Tindakan Perbaikan (Corrective)
                      </h4>
                      <p className="text-xs text-text-primary bg-[#3FA66B]/5 p-4 rounded-[15px] border border-[#3FA66B]/15 whitespace-pre-wrap leading-relaxed">{selectedFinding.correctiveAction}</p>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1 font-manrope">
                        <ShieldAlert size={12} className="text-[#4D7C5A]"/> Tindakan Pencegahan (Preventive)
                      </h4>
                      <p className="text-xs text-text-primary bg-forest-50/30 p-4 rounded-[15px] border border-border-custom whitespace-pre-wrap leading-relaxed">{selectedFinding.preventiveAction}</p>
                    </div>
                  </div>
                </div>

                {/* 5-Why Analysis */}
                <div className="border-t border-[#E6ECE6] pt-5">
                  <h4 className="text-xs font-bold text-text-primary mb-3.5 flex items-center gap-2">
                    <Search className="text-[#4D7C5A] h-4.5 w-4.5" /> Root Cause Analysis (5-Why)
                  </h4>
                  <div className="bg-forest-50/40 border border-border-custom rounded-xl p-5 text-left">
                    <div className="space-y-2 relative">
                      {selectedFinding.why1 && <div className="flex gap-3 text-xs"><span className="font-bold text-[#4D7C5A] w-12 shrink-0 font-manrope">Why 1:</span><span className="text-text-primary leading-normal">{selectedFinding.why1}</span></div>}
                      {selectedFinding.why2 && <div className="flex gap-3 text-xs"><span className="font-bold text-[#4D7C5A] w-12 shrink-0 font-manrope">Why 2:</span><span className="text-text-primary leading-normal">{selectedFinding.why2}</span></div>}
                      {selectedFinding.why3 && <div className="flex gap-3 text-xs"><span className="font-bold text-[#4D7C5A] w-12 shrink-0 font-manrope">Why 3:</span><span className="text-text-primary leading-normal">{selectedFinding.why3}</span></div>}
                      {selectedFinding.why4 && <div className="flex gap-3 text-xs"><span className="font-bold text-[#4D7C5A] w-12 shrink-0 font-manrope">Why 4:</span><span className="text-text-primary leading-normal">{selectedFinding.why4}</span></div>}
                      {selectedFinding.why5 && <div className="flex gap-3 text-xs"><span className="font-bold text-[#4D7C5A] w-12 shrink-0 font-manrope">Why 5:</span><span className="text-text-primary leading-normal">{selectedFinding.why5}</span></div>}
                    </div>
                    {selectedFinding.rootCause && (
                      <div className="mt-4 pt-3.5 border-t border-[#E6ECE6]">
                        <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-manrope">Kesimpulan Akar Masalah</p>
                        <p className="text-xs text-[#2F5A46] font-bold mt-1 leading-normal">{selectedFinding.rootCause}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Append-Only History */}
                <div className="border-t border-[#E6ECE6] pt-5">
                  <h4 className="text-xs font-bold text-text-primary mb-3.5 flex items-center gap-2">
                    <Clock className="text-[#2F5A46] h-4.5 w-4.5" /> Riwayat Progres Kepatuhan (Audit Trail)
                  </h4>
                  <div className="space-y-3">
                    {(selectedFinding.history || []).map((h, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#4D7C5A] mt-1.5"></div>
                          {i !== selectedFinding.history.length - 1 && <div className="w-px h-full bg-border-custom mt-1.5"></div>}
                        </div>
                        <div className="bg-forest-50/20 border border-border-custom rounded-xl p-3.5 flex-1 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[#2F5A46] font-manrope uppercase tracking-wide text-[10px]">{h.status}</span>
                            <span className="text-[10px] text-text-secondary font-manrope">{new Date(h.updatedAt).toLocaleString('id-ID')}</span>
                          </div>
                          <p className="text-text-primary mt-1 leading-relaxed">{h.notes}</p>
                          <p className="text-[9px] text-text-secondary italic mt-1.5">Diproses oleh: {h.updatedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {statusModalOpen && selectedFinding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl border border-border-custom w-full max-w-md overflow-hidden animate-fade-in">
              <div className="px-6 py-4 border-b border-[#E6ECE6] flex justify-between items-center">
                <h3 className="text-base font-bold text-text-primary">Update Status Temuan</h3>
                <button onClick={() => setStatusModalOpen(false)} className="p-2 bg-forest-50 hover:bg-[#DCE5DA] rounded-full text-[#2F5A46] cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 text-left space-y-4">
                <div className="bg-forest-50/50 p-3 rounded-xl border border-border-custom text-xs font-manrope text-text-secondary">
                  <strong>ID Temuan:</strong> {selectedFinding.id}
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary tracking-wider uppercase mb-1.5 font-manrope">Status Baru</label>
                  <select 
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full p-2.5 bg-white border border-border-custom rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] text-text-primary cursor-pointer font-medium"
                  >
                    <option value="Terbuka">Terbuka</option>
                    <option value="Dalam Proses">Dalam Proses</option>
                    <option value="Verifikasi">Verifikasi</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-secondary tracking-wider uppercase mb-1.5 font-manrope">Catatan Progres (Wajib)</label>
                  <textarea 
                    value={statusNotes}
                    onChange={e => setStatusNotes(e.target.value)}
                    rows={3}
                    placeholder="Tulis detail perbaikan atau alasan update status..."
                    className="w-full p-2.5 bg-white border border-border-custom rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] text-text-primary resize-none"
                  />
                </div>

                <div className="flex gap-2.5 justify-end pt-4 border-t border-[#E6ECE6]">
                  <button 
                    onClick={() => setStatusModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-forest-50 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleUpdateStatus}
                    disabled={!statusNotes.trim()}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#4D7C5A] hover:bg-[#2F5A46] disabled:opacity-40 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Simpan Riwayat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {formOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl border border-border-custom w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
              <div className="sticky top-0 bg-white border-b border-[#E6ECE6] px-6 py-4 flex justify-between items-center shrink-0 z-10">
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Edit className="text-[#4D7C5A] h-5 w-5" />
                  {editingId ? 'Edit Temuan Register' : 'Registrasi Temuan Baru'}
                </h3>
                <button onClick={() => setFormOpen(false)} className="p-2 bg-forest-50 hover:bg-[#DCE5DA] rounded-full text-[#2F5A46] cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-left space-y-6">
                
                {/* Basic Info */}
                <div className="bg-forest-50/30 p-5 rounded-[18px] border border-border-custom space-y-4">
                  <h4 className="text-xs font-bold text-[#2F5A46] uppercase tracking-wider font-manrope">1. Informasi Dasar</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">JUDUL TEMUAN</label>
                      <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" placeholder="Contoh: Ceceran Oli di Area Workshop" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">SUMBER TEMUAN</label>
                      <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value as any})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer">
                        <option value="Audit Eksternal">Audit Eksternal</option>
                        <option value="Audit Internal">Audit Internal ISO 14001</option>
                        <option value="Inspeksi DLH">Inspeksi DLH / ESDM</option>
                        <option value="PROPER">Penilaian PROPER</option>
                        <option value="Inspeksi Internal">Inspeksi Internal</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">DESKRIPSI KETIDAKSESUAIAN</label>
                      <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] resize-none" placeholder="Tuliskan deskripsi lengkap kondisi ketidaksesuaian yang ditemukan di lapangan..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">SEVERITY</label>
                      <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value as any})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] cursor-pointer">
                        <option value="NC Mayor">NC Mayor</option>
                        <option value="NC Minor">NC Minor</option>
                        <option value="Observasi">Observasi</option>
                        <option value="OFI">OFI (Opportunity for Improvement)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TGL DITEMUKAN</label>
                      <input type="date" value={formData.discoveryDate} onChange={e => setFormData({...formData, discoveryDate: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">TARGET SELESAI</label>
                      <input type="date" value={formData.targetDate} onChange={e => setFormData({...formData, targetDate: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">PIC (DEPARTEMEN)</label>
                      <input type="text" value={formData.pic} onChange={e => setFormData({...formData, pic: e.target.value})} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" placeholder="ex: K3LH, Sipil" />
                    </div>
                  </div>
                </div>

                {/* 5-Why */}
                <div className="bg-forest-50/30 p-5 rounded-[18px] border border-border-custom space-y-4">
                  <h4 className="text-xs font-bold text-[#2F5A46] uppercase tracking-wider flex justify-between items-center font-manrope">
                    2. Analisis Akar Masalah (5-Why)
                    <span className="text-[9px] font-semibold text-[#2F5A46] lowercase bg-white px-2.5 py-1 rounded-full border border-border-custom">Opsional tapi sangat direkomendasikan</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 border-r border-[#E6ECE6] pr-4">
                      <input type="text" placeholder="Why 1? Mengapa hal ini bisa terjadi?" value={formData.why1} onChange={e => setFormData({...formData, why1: e.target.value})} className="w-full p-2.5 text-xs border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
                      <input type="text" placeholder="Why 2? Mengapa demikian?" value={formData.why2} onChange={e => setFormData({...formData, why2: e.target.value})} className="w-full p-2.5 text-xs border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
                      <input type="text" placeholder="Why 3? Mengapa?" value={formData.why3} onChange={e => setFormData({...formData, why3: e.target.value})} className="w-full p-2.5 text-xs border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
                      <input type="text" placeholder="Why 4? Mengapa?" value={formData.why4} onChange={e => setFormData({...formData, why4: e.target.value})} className="w-full p-2.5 text-xs border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
                      <input type="text" placeholder="Why 5? Mengapa?" value={formData.why5} onChange={e => setFormData({...formData, why5: e.target.value})} className="w-full p-2.5 text-xs border border-border-custom rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#4D7C5A]" />
                    </div>
                    <div className="flex flex-col">
                      <label className="block text-[10px] font-bold text-text-secondary mb-1.5 tracking-wider font-manrope">KESIMPULAN ROOT CAUSE</label>
                      <textarea value={formData.rootCause} onChange={e => setFormData({...formData, rootCause: e.target.value})} className="w-full p-2.5 text-xs border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] flex-1 resize-none" placeholder="Ringkas akar masalah utama berdasarkan rangkaian analisis 5-Why di samping..." />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-forest-50/30 p-5 rounded-[18px] border border-border-custom space-y-4">
                  <h4 className="text-xs font-bold text-[#2F5A46] uppercase tracking-wider font-manrope">3. Rencana Tindakan (CAPA)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#2F5A46] mb-1.5 tracking-wider font-manrope">CORRECTIVE ACTION (TINDAKAN PERBAIKAN LANGSUNG)</label>
                      <textarea value={formData.correctiveAction} onChange={e => setFormData({...formData, correctiveAction: e.target.value})} rows={4} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] resize-none" placeholder="Tuliskan tindakan langsung yang diambil untuk menanggulangi temuan ini sekarang..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#2F5A46] mb-1.5 tracking-wider font-manrope">PREVENTIVE ACTION (PENCEGAHAN AGAR TIDAK TERULANG)</label>
                      <textarea value={formData.preventiveAction} onChange={e => setFormData({...formData, preventiveAction: e.target.value})} rows={4} className="w-full p-2.5 text-sm border border-border-custom rounded-xl bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-[#4D7C5A] resize-none" placeholder="Sistem, instruksi kerja, SOP, atau perbaikan fisik apa yang diubah agar kejadian ini tidak terulang di masa depan..." />
                    </div>
                  </div>
                </div>

              </div>
              <div className="p-4 border-t border-[#E6ECE6] flex justify-between shrink-0 bg-white rounded-b-[20px]">
                {editingId && (
                  <button 
                    onClick={() => { setFormOpen(false); handleDelete(editingId); }}
                    className="px-4 py-2.5 text-xs font-bold text-[#A33E3E] hover:bg-[#D95C5C]/5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 size={14}/> Hapus Permanen
                  </button>
                )}
                <div className="flex gap-2.5 ml-auto">
                  <button 
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-forest-50 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={!formData.title || !formData.description || !formData.correctiveAction}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#4D7C5A] hover:bg-[#2F5A46] disabled:opacity-40 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <Save size={14}/> Simpan Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </ModuleErrorBoundary>
  );
}
