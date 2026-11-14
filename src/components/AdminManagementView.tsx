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
import { isAdmin as isAdminRole } from '../services/permissionService';
import { auditService } from '../services/auditService';
import { ROLES } from '../utils/roles';
import { getTimeMs, formatTimestamp } from '../utils/dateUtils';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import TableSkeleton from './TableSkeleton';

interface AdminManagementViewProps {
  initialTab?: 'approval' | 'users' | 'roles' | 'audit';
}

const AVAILABLE_ROLES = ROLES;

const MODULE_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard Operasional' },
  { key: 'executive', label: 'Executive Dashboard' },
  { key: 'proper_rkab', label: 'PROPER & RKAB' },
  { key: 'monitoring', label: 'Pemantauan Air & Hujan' },
  { key: 'amd_treatment', label: 'Pengelolaan AAT (AMD)' },
  { key: 'domestic_wastewater', label: 'Air Limbah Domestik' },
  { key: 'air_emission', label: 'Udara Ambien & Emisi' },
  { key: 'ghg_inventory', label: 'Inventarisasi Emisi GRK' },
  { key: 'evidence', label: 'Evidence & Berita Acara' },
  { key: 'reclamation', label: 'Reklamasi & Nursery' },
  { key: 'reclamation_guarantee', label: 'Jaminan Reklamasi & Pascatambang' },
  { key: 'topsoil_erosion', label: 'Topsoil & Erosi' },
  { key: 'biodiversity', label: 'Keanekaragaman Hayati' },
  { key: 'waste', label: 'Limbah B3 TPS' },
  { key: 'solid_waste', label: 'Pengolahan Sampah' },
  { key: 'documents', label: 'Dokumen & Izin' },
  { key: 'pertek_slo', label: 'Register Pertek & SLO' },
  { key: 'compliance_matrix', label: 'Matriks Kepatuhan RKL/RPL' },
  { key: 'reporting_calendar', label: 'Kalender Pelaporan Wajib' },
  { key: 'iadl_risk', label: 'Register IADL (ISO 14001)' },
  { key: 'supervision', label: 'Pengawasan Eksternal & Sanksi' },
  { key: 'findings', label: 'Temuan & CAPA' },
  { key: 'incidents', label: 'Insiden Lingkungan' },
  { key: 'regulatory_watch', label: 'Regulatory Watch' },
  { key: 'costs', label: 'Biaya Lingkungan' },
  { key: 'reports', label: 'Laporan Tambang' },
  { key: 'export', label: 'Export Data' },
  { key: 'import', label: 'Import Data' },
  { key: 'user_management', label: 'User Management' },
  { key: 'role_management', label: 'Role Management' },
  { key: 'approval', label: 'Registration Approval' },
  { key: 'standards_master', label: 'Master Baku Mutu & Konfigurasi' },
  { key: 'audit_log', label: 'Audit Log' },
];

export default function AdminManagementView({ initialTab = 'approval' }: AdminManagementViewProps) {
  const { user: currentUser, profile: currentProfile, sendPasswordReset } = useAuth();
  const canManageUsers = isAdminRole(currentProfile);
  const [activeTab, setActiveTab] = useState<'approval' | 'users' | 'roles' | 'audit'>(
    canManageUsers ? initialTab : 'audit'
  );

  useEffect(() => {
    setActiveTab(canManageUsers ? initialTab : 'audit');
  }, [initialTab, canManageUsers]);

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

  // Real-time listener for users (Admin only — menghindari permission-denied pada Auditor / read-only)
  useEffect(() => {
    if (!canManageUsers) {
      setUsersList([]);
      setLoadingUsers(false);
      return;
    }
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
        return getTimeMs(b.createdAt) - getTimeMs(a.createdAt);
      });
      setUsersList(users);
      setLoadingUsers(false);
    }, (err) => {
      console.error("Error subscribing to users list:", err);
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [canManageUsers]);

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
        logs.sort((a, b) => getTimeMs(b.timestamp) - getTimeMs(a.timestamp));
        setAuditLogs(logs);
        setLoadingAudit(false);
      }, (err) => {
        console.error("Error fetching audit logs:", err);
        setLoadingAudit(false);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  // Load / initialize permission matrix and listen to real-time updates from /app_meta/permission_matrix
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
          defaultMatrix[role][mod.key] = [
            'dashboard', 'executive', 'proper_rkab', 'monitoring', 'amd_treatment', 'air_emission', 'evidence',
            'reclamation', 'topsoil_erosion', 'biodiversity', 'documents', 'compliance_matrix',
            'iadl_risk', 'findings', 'incidents', 'regulatory_watch', 'reports', 'audit_log'
          ].includes(mod.key);
        } else if (role === 'Foreman' || role === 'Operator') {
          defaultMatrix[role][mod.key] = [
            'dashboard', 'monitoring', 'amd_treatment', 'air_emission', 'evidence',
            'reclamation', 'topsoil_erosion', 'biodiversity', 'waste', 'solid_waste',
            'documents', 'compliance_matrix', 'iadl_risk', 'findings', 'incidents', 'reports'
          ].includes(mod.key);
        } else {
          // Viewer
          defaultMatrix[role][mod.key] = [
            'dashboard', 'monitoring', 'amd_treatment', 'air_emission', 'reclamation',
            'topsoil_erosion', 'biodiversity', 'waste', 'solid_waste', 'reports'
          ].includes(mod.key);
        }
      });
    });
    setPermissionMatrix(defaultMatrix);

    const unsub = onSnapshot(doc(db, 'app_meta', 'permission_matrix'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.matrix) {
          setPermissionMatrix(prev => ({
            ...defaultMatrix,
            ...data.matrix
          }));
        }
      }
    }, (err) => {
      console.warn("Could not read app_meta/permission_matrix:", err);
    });

    return () => unsub();
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

      if (approveUserTarget.email) {
        await setDoc(doc(db, 'roles', approveUserTarget.email), {
          level: selectedApproveRole,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

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
        isApproved: false,
        isActive: false,
        updatedAt: new Date().toISOString()
      });
      if (u.email) {
        await setDoc(doc(db, 'roles', u.email), {
          level: 'Viewer',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
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
        isApproved: false,
        isActive: false,
        deletedAt: new Date().toISOString(),
        deletedBy: currentUser?.email || 'Admin',
        updatedAt: new Date().toISOString()
      });
      if (u.email) {
        await setDoc(doc(db, 'roles', u.email), {
          level: 'Viewer',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
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
      if (editRoleTarget.email) {
        await setDoc(doc(db, 'roles', editRoleTarget.email), {
          level: selectedNewRole,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
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

  const togglePermission = async (role: string, modKey: string) => {
    const nextMatrix = {
      ...permissionMatrix,
      [role]: {
        ...permissionMatrix[role],
        [modKey]: !permissionMatrix[role]?.[modKey]
      }
    };
    setPermissionMatrix(nextMatrix);
    try {
      await setDoc(doc(db, 'app_meta', 'permission_matrix'), {
        matrix: nextMatrix,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || 'Admin'
      }, { merge: true });
    } catch (err: any) {
      console.error("Gagal menyimpan matriks izin:", err);
    }
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
    <div className="space-y-6 animate-fade-in text-left font-sans text-text-mid">
      
      {/* Toast Banner */}
      {actionSuccessMsg && (
        <div className="p-4 bg-neon-green/10 border border-neon-green/35 rounded-2xl text-neon-green text-xs font-semibold flex items-center gap-3 shadow-glow-green">
          <CheckCircle2 className="w-5 h-5 text-neon-green shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header Banner - Neon Mining Ops */}
      <div className="glass-panel border border-border-neon rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neon-green/10 border border-neon-green/35 rounded-full text-neon-green text-[11px] font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-neon-green" />
              ENTERPRISE GOVERNANCE & ACCESS CONTROL
            </div>
            <h1 className="text-2xl font-bold text-text-hi tracking-tight font-heading">
              Persetujuan Registrasi & Manajemen Pengguna
            </h1>
            <p className="text-xs text-text-mid leading-relaxed max-w-2xl">
              Pusat kendali autentikasi enterprise, persetujuan pendaftaran karyawan, alokasi peranan (RBAC), serta pemantauan jejak audit log keamanan.
            </p>
          </div>

          {canManageUsers && (
            <div className="flex items-center gap-3 bg-neon-amber/10 border border-neon-amber/35 rounded-2xl p-3 shrink-0 shadow-glow-amber">
              <div className="text-right px-1">
                <p className="text-[10px] text-neon-amber font-mono font-semibold uppercase">Pending Approval</p>
                <p className="text-xl font-bold text-neon-amber font-mono tabular-nums">{pendingUsers.length} Permohonan</p>
              </div>
              <div className="p-2.5 bg-neon-amber/20 border border-neon-amber/40 text-neon-amber rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex flex-wrap gap-2 pt-6 border-t border-border-subtle mt-6">
          {canManageUsers && (
            <>
              <button
                onClick={() => setActiveTab('approval')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'approval'
                    ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/45 shadow-glow-cyan'
                    : 'bg-bg-1 text-text-mid hover:text-text-hi hover:bg-bg-2 border border-border-subtle'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                Registration Approval
                {pendingUsers.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-neon-amber/20 text-neon-amber border border-neon-amber/40 font-mono tabular-nums font-bold">
                    {pendingUsers.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/45 shadow-glow-cyan'
                    : 'bg-bg-1 text-text-mid hover:text-text-hi hover:bg-bg-2 border border-border-subtle'
                }`}
              >
                <Users className="w-4 h-4" />
                User Management (<span className="font-mono tabular-nums">{usersList.length}</span>)
              </button>

              <button
                onClick={() => setActiveTab('roles')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'roles'
                    ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/45 shadow-glow-cyan'
                    : 'bg-bg-1 text-text-mid hover:text-text-hi hover:bg-bg-2 border border-border-subtle'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Role Management & Permission Matrix
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/45 shadow-glow-cyan'
                : 'bg-bg-1 text-text-mid hover:text-text-hi hover:bg-bg-2 border border-border-subtle'
            }`}
          >
            <Activity className="w-4 h-4" />
            Audit Log Activity
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: REGISTRATION APPROVAL */}
      {activeTab === 'approval' && (
        <div className="glass-panel border border-border-neon rounded-3xl p-6 space-y-5 text-text-mid">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border-subtle pb-4">
            <div>
              <h2 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                <Clock className="w-5 h-5 text-neon-amber" />
                Permohonan Registrasi Menunggu Persetujuan
              </h2>
              <p className="text-xs text-text-mid">
                Verifikasi identitas karyawan sebelum memberikan otorisasi akses ke sistem EEMS tambang.
              </p>
            </div>
            <span className="text-xs text-text-mid font-mono tabular-nums">
              Total Permohonan: <strong className="text-neon-amber font-bold">{pendingUsers.length}</strong>
            </span>
          </div>

          {loadingUsers ? (
            <TableSkeleton columns={8} rows={4} />
          ) : pendingUsers.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tidak Ada Permohonan Pending"
              description="Seluruh registrasi akun telah diproses dan disetujui."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border-neon bg-bg-1/40">
              <table className="neon-table">
                <thead>
                  <tr>
                    <th className="pl-4">Foto & Nama</th>
                    <th>Email</th>
                    <th>Departemen</th>
                    <th>Jabatan</th>
                    <th>Site</th>
                    <th>Tanggal Registrasi</th>
                    <th>Status</th>
                    <th className="text-center pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u) => (
                    <tr key={u.uid}>
                      <td className="pl-4">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.fullName} className="w-9 h-9 rounded-full object-cover border border-border-neon" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-neon-cyan/15 border border-neon-cyan/35 flex items-center justify-center font-bold text-neon-cyan">
                              {(u.fullName || u.name || 'U').charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-text-hi">{u.fullName || u.name}</p>
                            {u.nik && <p className="text-[10px] text-text-low font-mono tabular-nums">NIK: {u.nik}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-text-mid">{u.email}</td>
                      <td>{u.department || '-'}</td>
                      <td>{u.position || '-'}</td>
                      <td>{u.site || '-'}</td>
                      <td className="font-mono tabular-nums text-[11px] text-text-mid">
                        {formatTimestamp(u.createdAt, 'id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <StatusBadge status="Warning" label="Pending" />
                      </td>
                      <td className="pr-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setApproveUserTarget(u);
                              setSelectedApproveRole('Viewer');
                            }}
                            className="neon-btn-primary px-3 py-1.5 rounded-xl text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </button>

                          <button
                            onClick={() => {
                              setRejectUserTarget(u);
                              setRejectReason('');
                            }}
                            className="px-3 py-1.5 bg-neon-red/15 hover:bg-neon-red/25 text-neon-red border border-neon-red/35 font-bold rounded-xl text-[11px] transition-all flex items-center gap-1 cursor-pointer"
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
        <div className="glass-panel border border-border-neon rounded-3xl p-6 space-y-5 text-text-mid">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border-subtle pb-4">
            <div>
              <h2 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                <Users className="w-5 h-5 text-neon-cyan" />
                Direktori & Status Pengguna Enterprise
              </h2>
              <p className="text-xs text-text-mid">
                Kelola hak akses role, status aktifasi, reset password, dan pemantauan aktivitas login seluruh pengguna.
              </p>
            </div>

            {/* Search & Status Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-text-low" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, email, site..."
                  className="pl-9 pr-3 py-2 text-xs w-48 sm:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Disabled">Disabled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border-neon bg-bg-1/40">
            <table className="neon-table">
              <thead>
                <tr>
                  <th className="pl-4">Nama & Profil</th>
                  <th>Email</th>
                  <th>Role (RBAC)</th>
                  <th>Departemen & Site</th>
                  <th>Last Login</th>
                  <th className="text-center">Login Count</th>
                  <th>Status</th>
                  <th className="text-center pr-4">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-low font-mono">
                      Tidak ada data pengguna yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid}>
                      <td className="pl-4">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.fullName} className="w-8 h-8 rounded-full object-cover border border-border-neon" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-neon-cyan/15 border border-neon-cyan/35 flex items-center justify-center font-bold text-neon-cyan">
                              {(u.fullName || u.name || 'U').charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-text-hi">{u.fullName || u.name}</p>
                            <p className="text-[10px] text-text-low">{u.position || 'Staff'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-text-mid">{u.email}</td>
                      <td>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-neon-cyan" />
                          {u.role || 'Viewer'}
                        </span>
                      </td>
                      <td>
                        <p className="text-text-hi font-medium">{u.department || '-'}</p>
                        <p className="text-[10px] text-text-low">{u.site || '-'}</p>
                      </td>
                      <td className="font-mono tabular-nums text-[10px] text-text-mid">
                        {formatTimestamp(u.lastLogin, 'id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }, 'Belum Pernah')}
                      </td>
                      <td className="font-mono tabular-nums font-bold text-text-hi text-center">
                        {u.loginCount || 0}
                      </td>
                      <td>
                        {u.status === 'Active' ? (
                          <StatusBadge status="Safe" label="Active" />
                        ) : u.status === 'Pending' ? (
                          <StatusBadge status="Warning" label="Pending" />
                        ) : u.status === 'Disabled' ? (
                          <StatusBadge status="Dipantau" label="Disabled" />
                        ) : (
                          <StatusBadge status="Exceeded" label={u.status || 'Inactive'} />
                        )}
                      </td>
                      <td className="pr-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ubah Peran */}
                          <button
                            onClick={() => {
                              setEditRoleTarget(u);
                              setSelectedNewRole(u.role || 'Viewer');
                            }}
                            title="Ubah Peran (Role)"
                            className="p-1.5 bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25 border border-neon-cyan/30 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Enable / Disable */}
                          {u.status === 'Active' ? (
                            <button
                              onClick={() => handleDisableUser(u)}
                              title="Nonaktifkan Akun"
                              className="p-1.5 bg-neon-amber/15 text-neon-amber hover:bg-neon-amber/25 border border-neon-amber/30 rounded-lg transition-colors cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEnableUser(u)}
                              title="Aktifkan Akun"
                              className="p-1.5 bg-neon-green/15 text-neon-green hover:bg-neon-green/25 border border-neon-green/30 rounded-lg transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            onClick={() => handleResetPassword(u)}
                            title="Kirim Email Reset Password"
                            className="p-1.5 bg-bg-2 text-text-mid hover:text-text-hi hover:bg-bg-1 border border-border-subtle rounded-lg transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Hapus Pengguna (Soft Delete)"
                            className="p-1.5 bg-neon-red/15 text-neon-red hover:bg-neon-red/25 border border-neon-red/30 rounded-lg transition-colors cursor-pointer"
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
        <div className="glass-panel border border-border-neon rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border-subtle pb-4">
            <div>
              <h2 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-neon-cyan" />
                Matriks Hak Akses & Peranan (RBAC)
              </h2>
              <p className="text-xs text-text-mid">
                Konfigurasi otorisasi modul aplikasi berdasarkan peranan jabatan teknis dan manajerial.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border-neon bg-bg-1/40">
            <table className="neon-table">
              <thead>
                <tr>
                  <th className="pl-4 w-64">Modul / Fitur Aplikasi</th>
                  {AVAILABLE_ROLES.map(role => (
                    <th key={role} className="text-center min-w-[110px]">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_PERMISSIONS.map(mod => (
                  <tr key={mod.key}>
                    <td className="pl-4 font-bold text-text-hi">
                      {mod.label}
                    </td>
                    {AVAILABLE_ROLES.map(role => {
                      const isAllowed = permissionMatrix[role]?.[mod.key] ?? false;
                      return (
                        <td key={role} className="text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(role, mod.key)}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer ${
                              isAllowed
                                ? 'bg-neon-green/15 text-neon-green border border-neon-green/40 hover:bg-neon-green/25 shadow-glow-green'
                                : 'bg-bg-0/60 text-text-low border border-border-subtle hover:bg-bg-2 hover:text-text-mid'
                            }`}
                            title={`${role}: ${isAllowed ? 'Diizinkan' : 'Dilarang'}`}
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
        <div className="glass-panel border border-border-neon rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border-subtle pb-4">
            <div>
              <h2 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                <Activity className="w-5 h-5 text-neon-cyan" />
                Audit Trail Aktivitas Keamanan & Autentikasi
              </h2>
              <p className="text-xs text-text-mid">
                Catatan immutable otomatis untuk setiap peristiwa registrasi, persetujuan, pergantian peranan, dan pembaruan akun.
              </p>
            </div>
            <span className="text-xs text-text-mid font-mono tabular-nums">
              Total Log: <strong className="text-neon-green">{auditLogs.length}</strong>
            </span>
          </div>

          {loadingAudit ? (
            <TableSkeleton columns={5} rows={6} />
          ) : auditLogs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Belum Ada Data Audit Log"
              description="Belum ada aktivitas keamanan atau autentikasi yang tercatat."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border-neon bg-bg-1/40">
              <table className="neon-table font-mono">
                <thead>
                  <tr>
                    <th className="pl-4">Timestamp</th>
                    <th>User Executed</th>
                    <th>Koleksi</th>
                    <th>Tipe Aksi</th>
                    <th className="pr-4">Detail Catatan Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="text-[11px]">
                      <td className="pl-4 text-text-mid whitespace-nowrap tabular-nums">
                        {formatTimestamp(log.timestamp, 'id-ID')}
                      </td>
                      <td className="text-neon-cyan font-semibold">{log.user || 'system'}</td>
                      <td className="text-text-mid">{log.collection || 'users'}</td>
                      <td>
                        <span className={
                          log.action === 'insert' ? 'badge-safe' :
                          log.action === 'delete' ? 'badge-exceeded' :
                          'badge-monitored'
                        }>
                          {log.action?.toUpperCase() || 'INFO'}
                        </span>
                      </td>
                      <td className="pr-4 text-text-hi font-sans">{log.details}</td>
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
        <div className="fixed inset-0 z-50 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-border-neon rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-neon-green" />
                Approve User Registration
              </h3>
              <button 
                onClick={() => setApproveUserTarget(null)}
                className="p-1 hover:bg-bg-2 rounded-lg text-text-low hover:text-text-hi cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-bg-0/60 border border-border-subtle rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-text-low">Nama Lengkap:</span>
                <span className="font-bold text-text-hi">{approveUserTarget.fullName || approveUserTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-low">Email:</span>
                <span className="font-mono text-text-mid">{approveUserTarget.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-low">Departemen:</span>
                <span className="text-text-mid">{approveUserTarget.department || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-low">Jabatan:</span>
                <span className="text-text-mid">{approveUserTarget.position || '-'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-mid font-semibold mb-1.5 uppercase tracking-wide">
                Pilih Peran Hak Akses (Role RBAC) <span className="text-neon-red">*</span>
              </label>
              <select
                value={selectedApproveRole}
                onChange={(e) => setSelectedApproveRole(e.target.value)}
                className="w-full px-3 py-2.5 text-xs cursor-pointer font-sans"
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
                className="w-1/3 py-2.5 border border-border-subtle hover:bg-bg-2 text-text-mid hover:text-text-hi text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApproveConfirm}
                className="neon-btn-primary flex-1 py-2.5 text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
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
        <div className="fixed inset-0 z-50 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-neon-red/45 shadow-glow-red rounded-3xl p-6 w-full max-w-md space-y-5 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 className="text-base font-bold text-neon-red font-heading flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Tolak Pendaftaran User
              </h3>
              <button 
                onClick={() => setRejectUserTarget(null)}
                className="p-1 hover:bg-bg-2 rounded-lg text-text-low hover:text-text-hi cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-text-mid leading-relaxed">
              Anda akan menolak permohonan pendaftaran <strong className="text-text-hi">{rejectUserTarget.fullName || rejectUserTarget.email}</strong>.
            </div>

            <div>
              <label className="block text-[11px] text-text-mid font-semibold mb-1.5 uppercase tracking-wide">
                Alasan Penolakan <span className="text-neon-red">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Email bukan domain resmi perusahaan / data NIK tidak terverifikasi..."
                className="w-full p-3 text-xs"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectUserTarget(null)}
                className="w-1/3 py-2.5 border border-border-subtle hover:bg-bg-2 text-text-mid hover:text-text-hi text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="neon-btn-danger flex-1 py-2.5 text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
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
        <div className="fixed inset-0 z-50 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-border-neon rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                <Edit className="w-5 h-5 text-neon-cyan" />
                Ubah Peran Hak Akses (Role)
              </h3>
              <button 
                onClick={() => setEditRoleTarget(null)}
                className="p-1 hover:bg-bg-2 rounded-lg text-text-low hover:text-text-hi cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-mid">
              Pengguna: <strong className="text-text-hi">{editRoleTarget.fullName || editRoleTarget.email}</strong>
            </p>

            <div>
              <label className="block text-[11px] text-text-mid font-semibold mb-1.5 uppercase tracking-wide">
                Peran Baru <span className="text-neon-red">*</span>
              </label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value)}
                className="w-full px-3 py-2.5 text-xs cursor-pointer font-sans"
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
                className="w-1/3 py-2.5 border border-border-subtle hover:bg-bg-2 text-text-mid hover:text-text-hi text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleEditRoleConfirm}
                className="neon-btn-primary flex-1 py-2.5 text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
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
