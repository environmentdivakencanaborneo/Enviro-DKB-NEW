/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Ban, 
  RotateCcw, 
  KeyRound, 
  Trash2, 
  Search, 
  Filter, 
  AlertTriangle, 
  ShieldAlert, 
  UserPlus, 
  Check, 
  X, 
  Edit, 
  Building2, 
  Briefcase, 
  MapPin, 
  Calendar, 
  Activity,
  FileText,
  Lock,
  ChevronRight
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  getDocs,
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from '../utils/firebaseAuth';
import { UserProfile, PermissionMatrixItem, RolePermissions } from '../types';
import { useAuth } from '../services/authService';
import { auditService } from '../services/auditService';

interface AdminManagementViewProps {
  initialTab?: 'approval' | 'users' | 'roles' | 'audit';
}

const AVAILABLE_ROLES = [
  'Admin',
  'Environment Manager',
  'Environment Superintendent',
  'Foreman',
  'Operator',
  'Auditor',
  'Viewer'
];

const MODULE_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard Operasional' },
  { key: 'executive', label: 'Executive Dashboard' },
  { key: 'monitoring', label: 'Pemantauan Air' },
  { key: 'reclamation', label: 'Reklamasi' },
  { key: 'waste', label: 'Limbah B3 TPS' },
  { key: 'solid_waste', label: 'Pengolahan Sampah' },
  { key: 'documents', label: 'Documents / Perizinan' },
  { key: 'regulatory_watch', label: 'Regulatory Watch' },
  { key: 'compliance_matrix', label: 'Compliance (RKL-RPL)' },
  { key: 'incidents', label: 'Incidents & Kedaruratan' },
  { key: 'findings', label: 'CAPA Findings' },
  { key: 'reports', label: 'Reports' },
  { key: 'esg', label: 'ESG & GRI' },
  { key: 'costs', label: 'Environmental Costs' },
  { key: 'export', label: 'Export Data' },
  { key: 'import', label: 'Import Data' },
  { key: 'user_management', label: 'User Management' },
  { key: 'role_management', label: 'Role Management' },
  { key: 'approval', label: 'Registration Approval' },
  { key: 'settings', label: 'Settings' },
  { key: 'audit_log', label: 'Audit Log' },
];

export default function AdminManagementView({ initialTab = 'approval' }: AdminManagementViewProps) {
  const { user: currentUser, profile: currentProfile, sendPasswordReset } = useAuth();
  const [activeTab, setActiveTab] = useState<'approval' | 'users' | 'roles' | 'audit'>(initialTab);

  // State pools
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [approveUserTarget, setApproveUserTarget] = useState<UserProfile | null>(null);
  const [selectedApproveRole, setSelectedApproveRole] = useState<string>('Viewer');
  const [rejectUserTarget, setRejectUserTarget] = useState<UserProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editRoleTarget, setEditRoleTarget] = useState<UserProfile | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('Viewer');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Permission Matrix State
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, Record<string, boolean>>>({});

  // Real-time listener for users
  useEffect(() => {
    setLoadingUsers(true);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        if (!data.deleted) {
          users.push({
            ...data,
            uid: docSnap.id
          });
        }
      });
      // Sort: Pending first, then active
      users.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      setUsersList(users);
      setLoadingUsers(false);
    }, (err) => {
      console.error("Error subscribing to users list:", err);
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for audit logs
  useEffect(() => {
    if (activeTab === 'audit') {
      setLoadingAudit(true);
      const q = query(collection(db, 'audit_logs'), limit(150));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs: any[] = [];
        snapshot.forEach((docSnap) => {
          logs.push(docSnap.data());
        });
        logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setAuditLogs(logs);
        setLoadingAudit(false);
      }, (err) => {
        console.error("Error fetching audit logs:", err);
        setLoadingAudit(false);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  // Load / initialize permission matrix
  useEffect(() => {
    const defaultMatrix: Record<string, Record<string, boolean>> = {};
    AVAILABLE_ROLES.forEach(role => {
      defaultMatrix[role] = {};
      MODULE_PERMISSIONS.forEach(mod => {
        if (role === 'Admin') {
          defaultMatrix[role][mod.key] = true;
        } else if (role === 'Environment Manager' || role === 'Environment Superintendent') {
          defaultMatrix[role][mod.key] = mod.key !== 'user_management' && mod.key !== 'role_management';
        } else if (role === 'Auditor') {
          defaultMatrix[role][mod.key] = ['dashboard', 'executive', 'monitoring', 'reclamation', 'documents', 'compliance_matrix', 'reports', 'esg', 'audit_log'].includes(mod.key);
        } else if (role === 'Foreman' || role === 'Operator') {
          defaultMatrix[role][mod.key] = ['dashboard', 'monitoring', 'reclamation', 'waste', 'solid_waste', 'incidents', 'findings'].includes(mod.key);
        } else {
          // Viewer
          defaultMatrix[role][mod.key] = ['dashboard', 'monitoring', 'reports'].includes(mod.key);
        }
      });
    });
    setPermissionMatrix(defaultMatrix);
  }, []);

  const triggerToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // HANDLERS
  const handleApproveConfirm = async () => {
    if (!approveUserTarget || !approveUserTarget.uid) return;
    try {
      const userRef = doc(db, 'users', approveUserTarget.uid);
      const updatePayload = {
        status: 'Active',
        isApproved: true,
        isActive: true,
        role: selectedApproveRole,
        approvedBy: currentUser?.email || 'Admin',
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updatePayload);

      await auditService.createLog({
        collection: 'users',
        recordId: approveUserTarget.uid,
        action: 'update',
        details: `APPROVE_USER: ${approveUserTarget.email} assigned role ${selectedApproveRole} by ${currentUser?.email}`
      });

      triggerToast(`Pengguna ${approveUserTarget.fullName || approveUserTarget.email} berhasil disetujui sebagai ${selectedApproveRole}.`);
      setApproveUserTarget(null);
    } catch (err: any) {
      console.error("Approve failed:", err);
      alert("Gagal menyetujui pengguna: " + err.message);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectUserTarget || !rejectUserTarget.uid) return;
    if (!rejectReason.trim()) {
      alert("Alasan penolakan wajib diisi.");
      return;
    }
    try {
      const userRef = doc(db, 'users', rejectUserTarget.uid);
      await updateDoc(userRef, {
        status: 'Rejected',
        isApproved: false,
        isActive: false,
        rejectedBy: currentUser?.email || 'Admin',
        rejectedAt: new Date().toISOString(),
        rejectReason: rejectReason.trim(),
        updatedAt: new Date().toISOString()
      });

      await auditService.createLog({
        collection: 'users',
        recordId: rejectUserTarget.uid,
        action: 'update',
        details: `REJECT_USER: ${rejectUserTarget.email} by ${currentUser?.email}. Reason: ${rejectReason}`
      });

      triggerToast(`Pendaftaran ${rejectUserTarget.fullName || rejectUserTarget.email} telah ditolak.`);
      setRejectUserTarget(null);
      setRejectReason('');
    } catch (err: any) {
      console.error("Reject failed:", err);
      alert("Gagal menolak pengguna: " + err.message);
    }
  };

  const handleDisableUser = async (u: UserProfile) => {
    if (!u.uid) return;
    if (!confirm(`Nonaktifkan akses pengguna ${u.fullName || u.email}?`)) return;
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        status: 'Disabled',
        isActive: false,
        updatedAt: new Date().toISOString()
      });
      await auditService.createLog({
        collection: 'users',
        recordId: u.uid,
        action: 'update',
        details: `DISABLE_USER: ${u.email} disabled by ${currentUser?.email}`
      });
      triggerToast(`Pengguna ${u.email} berhasil dinonaktifkan.`);
    } catch (err: any) {
      alert("Gagal menonaktifkan pengguna: " + err.message);
    }
  };

  const handleEnableUser = async (u: UserProfile) => {
    if (!u.uid) return;
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        status: 'Active',
        isApproved: true,
        isActive: true,
        updatedAt: new Date().toISOString()
      });
      await auditService.createLog({
        collection: 'users',
        recordId: u.uid,
        action: 'update',
        details: `ENABLE_USER: ${u.email} enabled by ${currentUser?.email}`
      });
      triggerToast(`Pengguna ${u.email} berhasil diaktifkan kembali.`);
    } catch (err: any) {
      alert("Gagal mengaktifkan pengguna: " + err.message);
    }
  };

  const handleResetPassword = async (u: UserProfile) => {
    if (!u.email) return;
    if (!confirm(`Kirim tautan reset password ke ${u.email}?`)) return;
    try {
      await sendPasswordReset(u.email);
      await auditService.createLog({
        collection: 'users',
        recordId: u.uid || u.email,
        action: 'update',
        details: `RESET_PASSWORD email sent to ${u.email} by ${currentUser?.email}`
      });
      triggerToast(`Email reset password berhasil dikirim ke ${u.email}.`);
    } catch (err: any) {
      alert("Gagal mengirim reset password: " + err.message);
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (!u.uid) return;
    if (!confirm(`Hapus pengguna ${u.fullName || u.email}? Pengguna akan dihapus secara soft-delete.`)) return;
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        deleted: true,
        status: 'Deleted',
        isActive: false,
        deletedAt: new Date().toISOString(),
        deletedBy: currentUser?.email || 'Admin',
        updatedAt: new Date().toISOString()
      });
      await auditService.createLog({
        collection: 'users',
        recordId: u.uid,
        action: 'delete',
        details: `DELETE_USER (soft delete): ${u.email} deleted by ${currentUser?.email}`
      });
      triggerToast(`Pengguna ${u.email} berhasil dihapus.`);
    } catch (err: any) {
      alert("Gagal menghapus pengguna: " + err.message);
    }
  };

  const handleEditRoleConfirm = async () => {
    if (!editRoleTarget || !editRoleTarget.uid) return;
    try {
      await updateDoc(doc(db, 'users', editRoleTarget.uid), {
        role: selectedNewRole,
        updatedAt: new Date().toISOString()
      });
      await auditService.createLog({
        collection: 'users',
        recordId: editRoleTarget.uid,
        action: 'update',
        details: `CHANGE_ROLE: ${editRoleTarget.email} role changed to ${selectedNewRole} by ${currentUser?.email}`
      });
      triggerToast(`Peran pengguna ${editRoleTarget.email} berhasil diubah ke ${selectedNewRole}.`);
      setEditRoleTarget(null);
    } catch (err: any) {
      alert("Gagal memperbarui peranan: " + err.message);
    }
  };

  const togglePermission = (role: string, modKey: string) => {
    setPermissionMatrix(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [modKey]: !prev[role]?.[modKey]
      }
    }));
  };

  // Filtered lists
  const pendingUsers = usersList.filter(u => u.status === 'Pending' || u.isApproved === false);
  
  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (u.fullName || u.name || '').toLowerCase().includes(q) ||
                        (u.email || '').toLowerCase().includes(q) ||
                        (u.department || '').toLowerCase().includes(q) ||
                        (u.site || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in text-left font-sans">
      
      {/* Toast Banner */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[11px] font-mono font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              ENTERPRISE GOVERNANCE & ACCESS CONTROL
            </div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Persetujuan Registrasi & Manajemen Pengguna
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Pusat kendali autentikasi enterprise, persetujuan pendaftaran karyawan, alokasi peranan (RBAC), serta pemantauan jejak audit log keamanan.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/60 rounded-2xl p-2 shrink-0">
            <div className="text-right px-2">
              <p className="text-[10px] text-slate-400 font-mono">Pending Approval</p>
              <p className="text-lg font-bold text-amber-400">{pendingUsers.length} Permohonan</p>
            </div>
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-700/60 mt-6">
          <button
            onClick={() => setActiveTab('approval')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'approval'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Registration Approval
            {pendingUsers.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-extrabold">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management ({usersList.length})
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Role Management & Permission Matrix
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-900/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Audit Log Activity
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: REGISTRATION APPROVAL */}
      {activeTab === 'approval' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-700/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Permohonan Registrasi Menunggu Persetujuan
              </h2>
              <p className="text-xs text-slate-400">
                Verifikasi identitas karyawan sebelum memberikan otorisasi akses ke sistem EEMS tambang.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Permohonan: <strong className="text-amber-400">{pendingUsers.length}</strong>
            </span>
          </div>

          {loadingUsers ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">Memuat permohonan...</div>
          ) : pendingUsers.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-slate-700/70 rounded-2xl bg-slate-900/30">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
              <p className="text-sm font-bold text-slate-200">Tidak Ada Permohonan Pending</p>
              <p className="text-xs text-slate-400">Seluruh registrasi akun telah diproses dan disetujui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Foto & Nama</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Departemen</th>
                    <th className="p-3.5">Jabatan</th>
                    <th className="p-3.5">Site</th>
                    <th className="p-3.5">Tanggal Registrasi</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 bg-slate-800/40">
                  {pendingUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.fullName} className="w-9 h-9 rounded-full object-cover border border-slate-600" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-slate-300">
                              {(u.fullName || u.name || 'U').charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-100">{u.fullName || u.name}</p>
                            {u.nik && <p className="text-[10px] text-slate-400 font-mono">NIK: {u.nik}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">{u.email}</td>
                      <td className="p-3.5">{u.department || '-'}</td>
                      <td className="p-3.5">{u.position || '-'}</td>
                      <td className="p-3.5">{u.site || '-'}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setApproveUserTarget(u);
                              setSelectedApproveRole('Viewer');
                            }}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-[11px] transition-all flex items-center gap-1 cursor-pointer shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>

                          <button
                            onClick={() => {
                              setRejectUserTarget(u);
                              setRejectReason('');
                            }}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold rounded-xl text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-700/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Direktori & Status Pengguna Enterprise
              </h2>
              <p className="text-xs text-slate-400">
                Kelola hak akses role, status aktifasi, reset password, dan pemantauan aktivitas login seluruh pengguna.
              </p>
            </div>

            {/* Search & Status Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, email, site..."
                  className="bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500 w-48 sm:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Disabled">Disabled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-700">
                <tr>
                  <th className="p-3.5">Nama & Profil</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role (RBAC)</th>
                  <th className="p-3.5">Departemen & Site</th>
                  <th className="p-3.5">Last Login</th>
                  <th className="p-3.5">Login Count</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-center">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-800/40">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-mono">
                      Tidak ada data pengguna yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-600" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-slate-300">
                              {(u.fullName || u.name || 'U').charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-100">{u.fullName || u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.position || 'Staff'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">{u.email}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-900 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          {u.role || 'Viewer'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <p className="text-slate-200">{u.department || '-'}</p>
                        <p className="text-[10px] text-slate-400">{u.site || '-'}</p>
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-slate-400">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Belum Pernah'}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-300 text-center">
                        {u.loginCount || 0}
                      </td>
                      <td className="p-3.5">
                        {u.status === 'Active' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        ) : u.status === 'Pending' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Pending
                          </span>
                        ) : u.status === 'Disabled' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-400 border border-slate-600">
                            Disabled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            {u.status || 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ubah Peran */}
                          <button
                            onClick={() => {
                              setEditRoleTarget(u);
                              setSelectedNewRole(u.role || 'Viewer');
                            }}
                            title="Ubah Peran (Role)"
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Enable / Disable */}
                          {u.status === 'Active' ? (
                            <button
                              onClick={() => handleDisableUser(u)}
                              title="Nonaktifkan Akun"
                              className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnableUser(u)}
                              title="Aktifkan Akun"
                              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            onClick={() => handleResetPassword(u)}
                            title="Kirim Email Reset Password"
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Hapus Pengguna (Soft Delete)"
                            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: ROLE MANAGEMENT & PERMISSION MATRIX */}
      {activeTab === 'roles' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-700/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Matrix Matriks Hak Akses & Peranan (RBAC)
              </h2>
              <p className="text-xs text-slate-400">
                Konfigurasi otorisasi modul aplikasi berdasarkan peranan jabatan teknis dan manajerial.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-700">
                <tr>
                  <th className="p-3.5 w-64">Modul / Fitur Aplikasi</th>
                  {AVAILABLE_ROLES.map(role => (
                    <th key={role} className="p-3.5 text-center min-w-[110px]">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 bg-slate-800/40">
                {MODULE_PERMISSIONS.map(mod => (
                  <tr key={mod.key} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5 font-bold text-slate-200">
                      {mod.label}
                    </td>
                    {AVAILABLE_ROLES.map(role => {
                      const isAllowed = permissionMatrix[role]?.[mod.key] ?? false;
                      return (
                        <td key={role} className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(role, mod.key)}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                              isAllowed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-900/50 text-slate-600 border border-slate-700/50 hover:bg-slate-800'
                            }`}
                          >
                            {isAllowed ? <Check className="w-4 h-4 font-bold" /> : <X className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: AUDIT LOG ACTIVITY */}
      {activeTab === 'audit' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-700/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Audit Trail activity Keamanan & Autentikasi
              </h2>
              <p className="text-xs text-slate-400">
                Catatan immutable otomatis untuk setiap peristiwa REGISTER_USER, LOGIN, LOGOUT, APPROVE_USER, REJECT_USER, CHANGE_ROLE, ENABLE_USER, DISABLE_USER, DELETE_USER, RESET_PASSWORD.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Log: <strong className="text-emerald-400">{auditLogs.length}</strong>
            </span>
          </div>

          {loadingAudit ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">Memuat audit log...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              Belum ada data audit log tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
              <table className="w-full text-left text-xs text-slate-300 font-mono">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">User Executed</th>
                    <th className="p-3.5">Koleksi</th>
                    <th className="p-3.5">Tipe Aksi</th>
                    <th className="p-3.5">Detail Catatan Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 bg-slate-800/40">
                  {auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-700/30 transition-colors text-[11px]">
                      <td className="p-3.5 text-slate-400 whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : '-'}
                      </td>
                      <td className="p-3.5 text-emerald-400 font-semibold">{log.user || 'system'}</td>
                      <td className="p-3.5 text-slate-300">{log.collection || 'users'}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'insert' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          log.action === 'delete' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                          'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        }`}>
                          {log.action?.toUpperCase() || 'INFO'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-200">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DIALOG 1: APPROVE USER MODAL */}
      {approveUserTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Approve User Registration
              </h3>
              <button 
                onClick={() => setApproveUserTarget(null)}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Lengkap:</span>
                <span className="font-bold text-slate-100">{approveUserTarget.fullName || approveUserTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-slate-300">{approveUserTarget.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Departemen:</span>
                <span className="text-slate-200">{approveUserTarget.department || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jabatan:</span>
                <span className="text-slate-200">{approveUserTarget.position || '-'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1.5 uppercase tracking-wide">
                Pilih Peran Hak Akses (Role RBAC) <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedApproveRole}
                onChange={(e) => setSelectedApproveRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-3 text-xs outline-none text-slate-100 cursor-pointer font-sans"
              >
                {AVAILABLE_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveUserTarget(null)}
                className="w-1/3 py-3 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApproveConfirm}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 2: REJECT USER MODAL */}
      {rejectUserTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Tolak Pendaftaran User
              </h3>
              <button 
                onClick={() => setRejectUserTarget(null)}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              Anda akan menolak permohonan pendaftaran <strong className="text-slate-100">{rejectUserTarget.fullName || rejectUserTarget.email}</strong>.
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1.5 uppercase tracking-wide">
                Alasan Penolakan <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Email bukan domain resmi perusahaan / data NIK tidak terverifikasi..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-red-500 rounded-xl p-3 text-xs outline-none text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectUserTarget(null)}
                className="w-1/3 py-3 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-xl transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <XCircle className="w-4 h-4" />
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 3: EDIT ROLE MODAL */}
      {editRoleTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" />
                Ubah Peran Hak Akses (Role)
              </h3>
              <button 
                onClick={() => setEditRoleTarget(null)}
                className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Pengguna: <strong className="text-slate-100">{editRoleTarget.fullName || editRoleTarget.email}</strong>
            </p>

            <div>
              <label className="block text-[11px] text-slate-300 font-semibold mb-1.5 uppercase tracking-wide">
                Peran Baru <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-3 text-xs outline-none text-slate-100 cursor-pointer font-sans"
              >
                {AVAILABLE_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditRoleTarget(null)}
                className="w-1/3 py-3 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleEditRoleConfirm}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <Check className="w-4 h-4" />
                Simpan Perubahan Role
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
