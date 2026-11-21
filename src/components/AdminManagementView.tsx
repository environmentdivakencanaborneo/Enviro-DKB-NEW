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
  ChevronRight,
  Download
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
  limit,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../utils/firebaseAuth';
import { UserProfile } from '../types';
import { useAuth } from '../services/authService';
import { isAdmin as isAdminRole, isStrictAdmin } from '../services/permissionService';
import { auditService } from '../services/auditService';
import { ROLES, MANAGER_ASSIGNABLE_ROLES } from '../utils/roles';
import {
  classifyReconciliationRows,
  validateReconciliationCommitInput,
  type ReconciliationRow,
  type RoleDocRecord,
} from '../utils/roleReconciliation';
import { exportRoleReconciliationToXLSX } from '../services/exportService';
import { getTimeMs, formatTimestamp } from '../utils/dateUtils';
import { runSafeDataMigrations } from '../utils/migrations';
import { triggerToast as pushGlobalToast } from '../utils/errorHandler';
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
  const isStrictAdminUser = isStrictAdmin(currentProfile);
  const assignableRoles = isStrictAdminUser ? AVAILABLE_ROLES : MANAGER_ASSIGNABLE_ROLES;
  const [activeTab, setActiveTab] = useState<'approval' | 'users' | 'roles' | 'reconcile' | 'audit'>(
    canManageUsers ? initialTab : 'audit'
  );

  useEffect(() => {
    setActiveTab(canManageUsers ? initialTab : 'audit');
  }, [initialTab, canManageUsers]);

  // State pools
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [rolesDocs, setRolesDocs] = useState<RoleDocRecord[]>([]);
  const [loadingRolesDocs, setLoadingRolesDocs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);

  // Rekonsiliasi Peran state (K-03) — tanpa auto-copy / tanpa auto-fix
  const [reconcileFilter, setReconcileFilter] = useState<'ALL' | 'ISSUES_ONLY'>('ALL');
  const [reconcileDrafts, setReconcileDrafts] = useState<Record<string, { level: string; reason: string }>>({});
  const [savingReconcileKey, setSavingReconcileKey] = useState<string | null>(null);

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
  const [confirmAction, setConfirmAction] = useState<{
    type: 'disable' | 'reset_password' | 'delete';
    user: UserProfile;
  } | null>(null);
  const [isConfirmExecuting, setIsConfirmExecuting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

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

  // Real-time listener for /roles (Admin & Environment Manager — sumber peran tunggal K-03)
  useEffect(() => {
    if (!canManageUsers) {
      setRolesDocs([]);
      setLoadingRolesDocs(false);
      return;
    }
    setLoadingRolesDocs(true);
    const unsubscribe = onSnapshot(
      collection(db, 'roles'),
      (snapshot) => {
        const list: RoleDocRecord[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as Record<string, any>;
          list.push({
            id: docSnap.id,
            email: d?.email,
            level: d?.level,
            updatedAt: d?.updatedAt,
            updatedBy: d?.updatedBy,
          });
        });
        setRolesDocs(list);
        setLoadingRolesDocs(false);
      },
      (err) => {
        console.error('Error subscribing to /roles collection:', err);
        setLoadingRolesDocs(false);
      }
    );

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

  const reconcileRows = React.useMemo(
    () => classifyReconciliationRows(usersList, rolesDocs),
    [usersList, rolesDocs]
  );

  const visibleReconcileRows = React.useMemo(
    () => (reconcileFilter === 'ISSUES_ONLY' ? reconcileRows.filter((r) => r.isIssue) : reconcileRows),
    [reconcileRows, reconcileFilter]
  );

  const reconcileStats = React.useMemo(() => {
    let highRisk = 0;
    let activeNoRole = 0;
    let mismatch = 0;
    let orphanRole = 0;
    for (const r of reconcileRows) {
      if (r.findingCode === 'C_HIGH_RISK') highRisk += 1;
      else if (r.findingCode === 'A_ACTIVE_NO_ROLE') activeNoRole += 1;
      else if (r.findingCode === 'B_ROLE_MISMATCH') mismatch += 1;
      else if (r.findingCode === 'D_ORPHAN_ROLE') orphanRole += 1;
    }
    return {
      highRisk,
      activeNoRole,
      mismatch,
      orphanRole,
      totalIssues: highRisk + activeNoRole + mismatch + orphanRole,
    };
  }, [reconcileRows]);

  const handleReconcileDraftChange = (
    rowKey: string,
    patch: Partial<{ level: string; reason: string }>
  ) => {
    setReconcileDrafts((prev) => {
      const current = prev[rowKey] || { level: '', reason: '' };
      return {
        ...prev,
        [rowKey]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const handleReconcileAssign = async (row: ReconciliationRow) => {
    if (!isStrictAdminUser) {
      pushGlobalToast('Hanya peran Admin yang dapat melakukan rekonsiliasi /roles.', 'error');
      return;
    }
    if (!currentUser?.uid || !currentUser?.email) {
      pushGlobalToast('Sesi Admin tidak valid (UID/Email tidak ditemukan).', 'error');
      return;
    }
    if (!row.roleDocId || row.roleDocId === '-') {
      pushGlobalToast('Email target tidak valid untuk penulisan dokumen /roles.', 'error');
      return;
    }

    const draft = reconcileDrafts[row.rowKey] || { level: '', reason: '' };
    const check = validateReconciliationCommitInput(draft.level, draft.reason);
    if (!check.valid || 'error' in check) {
      pushGlobalToast(('error' in check ? check.error : 'Input tidak valid.'), 'warning');
      return;
    }

    setSavingReconcileKey(row.rowKey);
    try {
      const batch = writeBatch(db);
      const roleRef = doc(db, 'roles', row.roleDocId);
      batch.set(
        roleRef,
        {
          email: row.roleDocId,
          level: check.level,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.email,
        },
        { merge: true }
      );

      if (row.uid) {
        const userRef = doc(db, 'users', row.uid);
        batch.update(userRef, {
          role: check.level,
          updatedAt: new Date().toISOString(),
        });
      }

      const logId = `LOG-${crypto.randomUUID()}`;
      const oldUsersRole = row.usersRole ?? '(kosong)';
      const oldRolesLevel = row.rolesLevel ?? '(tidak ada)';
      const actorName = (
        currentProfile?.fullName ||
        currentProfile?.name ||
        currentUser.displayName ||
        currentUser.email
      ).slice(0, 120);

      batch.set(doc(db, 'audit_logs', logId), {
        id: logId,
        uid: currentUser.uid,
        timestamp: serverTimestamp(),
        user: currentUser.email,
        actorName,
        actorRole: 'Admin',
        module: 'role_reconciliation',
        collection: 'roles',
        recordId: row.roleDocId.slice(0, 128),
        action: 'role_change',
        details: `RECONCILE_ROLE [${row.findingLabel}] ${row.email}: users.role=${oldUsersRole}, roles.level=${oldRolesLevel} -> ${check.level}`.slice(0, 995),
        beforeData: {
          usersRole: row.usersRole ?? null,
          rolesLevel: row.rolesLevel ?? null,
          findingCode: row.findingCode,
        },
        afterData: {
          usersRole: row.uid ? check.level : null,
          rolesLevel: check.level,
        },
        correctionReason: check.reason.slice(0, 400),
        status: 'SUCCESS',
      });

      await batch.commit();

      setReconcileDrafts((prev) => {
        const next = { ...prev };
        delete next[row.rowKey];
        return next;
      });
      triggerToast(`Rekonsiliasi peran untuk ${row.email} berhasil ditetapkan sebagai ${check.level}.`);
    } catch (err: any) {
      console.error('Role reconciliation commit failed:', err);
      pushGlobalToast(`Gagal menetapkan peran untuk ${row.email}: ${err?.message || 'Error'}`, 'error');
    } finally {
      setSavingReconcileKey(null);
    }
  };

  const rolesByEmailMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rolesDocs) {
      const key = (r.email || r.id || '').toLowerCase().trim();
      if (key && r.level) map.set(key, String(r.level));
    }
    return map;
  }, [rolesDocs]);

  const getAuthoritativeRole = (u: UserProfile): string => {
    const key = (u.email || '').toLowerCase().trim();
    return (key && rolesByEmailMap.get(key)) || 'Viewer';
  };

  const isSelfUser = (u: UserProfile): boolean => {
    if (!currentUser) return false;
    return (
      u.uid === currentUser.uid ||
      Boolean(u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
    );
  };

  const canActOnTargetUser = (u: UserProfile): boolean => {
    if (isSelfUser(u)) return false;
    if (isStrictAdminUser) return true;
    const authRole = getAuthoritativeRole(u);
    return (MANAGER_ASSIGNABLE_ROLES as readonly string[]).includes(authRole);
  };

  const getActorName = () =>
    (currentProfile?.fullName || currentProfile?.name || currentUser?.displayName || currentUser?.email || 'Admin').slice(0, 120);

  const getActorRoleLabel = () =>
    currentProfile?.role || (isStrictAdminUser ? 'Admin' : 'Environment Manager');

  // HANDLERS
  const handleApproveConfirm = async () => {
    if (!approveUserTarget || !approveUserTarget.uid) return;
    if (!currentUser?.uid || !currentUser?.email) {
      pushGlobalToast('Sesi pengguna tidak valid untuk persetujuan.', 'error');
      return;
    }
    if (isSelfUser(approveUserTarget)) {
      pushGlobalToast('Tidak dapat menyetujui akun milik sendiri.', 'error');
      return;
    }
    if (!isStrictAdminUser && !(MANAGER_ASSIGNABLE_ROLES as readonly string[]).includes(selectedApproveRole)) {
      pushGlobalToast('Environment Manager hanya dapat menetapkan peran hingga Environment Superintendent.', 'error');
      return;
    }
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', approveUserTarget.uid);
      const nowIso = new Date().toISOString();
      const userUpdatePayload: Record<string, any> = {
        status: 'Active',
        isApproved: true,
        isActive: true,
        approvedBy: currentUser.email,
        approvedAt: nowIso,
        updatedAt: nowIso,
      };
      if (isStrictAdminUser) {
        userUpdatePayload.role = selectedApproveRole;
      }

      batch.update(userRef, userUpdatePayload);

      if (approveUserTarget.email) {
        batch.set(
          doc(db, 'roles', approveUserTarget.email),
          {
            email: approveUserTarget.email,
            level: selectedApproveRole,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.email,
          },
          { merge: true }
        );
      }

      const logId = `LOG-${crypto.randomUUID()}`;
      batch.set(doc(db, 'audit_logs', logId), {
        id: logId,
        uid: currentUser.uid,
        timestamp: serverTimestamp(),
        user: currentUser.email,
        actorName: getActorName(),
        actorRole: getActorRoleLabel(),
        module: 'approval',
        collection: 'users',
        recordId: approveUserTarget.uid.slice(0, 128),
        action: 'approve',
        details: `APPROVE_USER: ${approveUserTarget.email} assigned role ${selectedApproveRole} by ${currentUser.email}`.slice(0, 995),
        beforeData: { status: approveUserTarget.status || 'Pending', role: approveUserTarget.role || 'Viewer' },
        afterData: { status: 'Active', role: selectedApproveRole },
        status: 'SUCCESS',
      });

      await batch.commit();

      triggerToast(`Pengguna ${approveUserTarget.fullName || approveUserTarget.email} berhasil disetujui sebagai ${selectedApproveRole}.`);
      setApproveUserTarget(null);
    } catch (err: any) {
      console.error("Approve failed:", err);
      pushGlobalToast("Gagal menyetujui pengguna: " + (err?.message || 'Unknown error'), 'error');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectUserTarget || !rejectUserTarget.uid) return;
    if (isSelfUser(rejectUserTarget)) {
      pushGlobalToast('Tidak dapat menolak akun milik sendiri.', 'error');
      return;
    }
    if (!rejectReason.trim()) {
      pushGlobalToast("Alasan penolakan wajib diisi.", 'warning');
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
        module: 'approval',
        recordId: rejectUserTarget.uid,
        action: 'reject',
        details: `REJECT_USER: ${rejectUserTarget.email} by ${currentUser?.email}. Reason: ${rejectReason}`
      });

      triggerToast(`Pendaftaran ${rejectUserTarget.fullName || rejectUserTarget.email} telah ditolak.`);
      setRejectUserTarget(null);
      setRejectReason('');
    } catch (err: any) {
      console.error("Reject failed:", err);
      pushGlobalToast("Gagal menolak pengguna: " + (err?.message || 'Unknown error'), 'error');
    }
  };

  const executeDisableUser = async (u: UserProfile) => {
    if (!u.uid || !currentUser?.uid || !currentUser?.email) return;
    if (!canActOnTargetUser(u)) {
      pushGlobalToast('Anda tidak memiliki kewenangan untuk menonaktifkan akun ini.', 'error');
      return;
    }
    try {
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();
      batch.update(doc(db, 'users', u.uid), {
        status: 'Disabled',
        isApproved: false,
        isActive: false,
        updatedAt: nowIso
      });
      if (u.email) {
        batch.set(doc(db, 'roles', u.email), {
          email: u.email,
          level: 'Viewer',
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.email,
        }, { merge: true });
      }
      const logId = `LOG-${crypto.randomUUID()}`;
      batch.set(doc(db, 'audit_logs', logId), {
        id: logId,
        uid: currentUser.uid,
        timestamp: serverTimestamp(),
        user: currentUser.email,
        actorName: getActorName(),
        actorRole: getActorRoleLabel(),
        module: 'user_management',
        collection: 'users',
        recordId: u.uid.slice(0, 128),
        action: 'update',
        details: `DISABLE_USER: ${u.email} disabled by ${currentUser.email}`.slice(0, 995),
        status: 'SUCCESS',
      });
      await batch.commit();
      triggerToast(`Pengguna ${u.email} berhasil dinonaktifkan.`);
    } catch (err: any) {
      pushGlobalToast("Gagal menonaktifkan pengguna: " + (err?.message || 'Unknown error'), 'error');
    }
  };

  const handleEnableUser = async (u: UserProfile) => {
    if (!u.uid) return;
    if (!canActOnTargetUser(u)) {
      pushGlobalToast('Anda tidak memiliki kewenangan untuk mengaktifkan akun ini.', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        status: 'Active',
        isApproved: true,
        isActive: true,
        updatedAt: new Date().toISOString()
      });
      await auditService.createLog({
        collection: 'users',
        module: 'user_management',
        recordId: u.uid,
        action: 'update',
        details: `ENABLE_USER: ${u.email} enabled by ${currentUser?.email}`
      });
      triggerToast(`Pengguna ${u.email} berhasil diaktifkan kembali.`);
    } catch (err: any) {
      pushGlobalToast('Gagal mengaktifkan pengguna: ' + err.message, 'error');
    }
  };

  const handleSuspendUser = async (u: UserProfile) => {
    if (!u.uid) return;
    if (!canActOnTargetUser(u)) {
      pushGlobalToast('Anda tidak memiliki kewenangan untuk menangguhkan akun ini.', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        status: 'Suspended',
        isApproved: false,
        isActive: false,
        updatedAt: new Date().toISOString()
      });
      await auditService.createLog({
        collection: 'users',
        module: 'user_management',
        recordId: u.uid,
        action: 'update',
        details: `SUSPEND_USER: ${u.email} ditangguhkan oleh ${currentUser?.email}`,
        beforeData: { status: u.status, isApproved: u.isApproved },
        afterData: { status: 'Suspended', isApproved: false },
      });
      triggerToast(`Akun ${u.email} berhasil ditangguhkan (Suspended).`);
    } catch (err: any) {
      pushGlobalToast('Gagal menangguhkan pengguna: ' + err.message, 'error');
    }
  };

  const handleRunMigrations = async () => {
    setIsMigrating(true);
    try {
      const report = await runSafeDataMigrations();
      triggerToast(
        `Migrasi aman selesai: ${report.standardsSeeded} standar ditambah, ${report.standardsUpdated} standar diperbarui, ${report.usersNormalized} profil user dinormalisasi, ${report.ghgBackfilled} aktivitas GRK ditandai.`,
      );
      pushGlobalToast('Migrasi aman database selesai dijalankan.', 'success');
    } catch (err: any) {
      pushGlobalToast('Gagal menjalankan migrasi aman: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setIsMigrating(false);
    }
  };

  const executeResetPassword = async (u: UserProfile) => {
    if (!u.email) return;
    try {
      await sendPasswordReset(u.email);
      await auditService.createLog({
        collection: 'users',
        module: 'user_management',
        recordId: u.uid || u.email,
        action: 'update',
        details: `RESET_PASSWORD email sent to ${u.email} by ${currentUser?.email}`
      });
      triggerToast(`Email reset password berhasil dikirim ke ${u.email}.`);
    } catch (err: any) {
      pushGlobalToast("Gagal mengirim reset password: " + (err?.message || 'Unknown error'), 'error');
    }
  };

  const executeDeleteUser = async (u: UserProfile) => {
    if (!u.uid || !currentUser?.uid || !currentUser?.email) return;
    if (!canActOnTargetUser(u)) {
      pushGlobalToast('Anda tidak memiliki kewenangan untuk menghapus akun ini.', 'error');
      return;
    }
    try {
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();
      batch.update(doc(db, 'users', u.uid), {
        deleted: true,
        status: 'Deleted',
        isApproved: false,
        isActive: false,
        deletedAt: nowIso,
        deletedBy: currentUser.email,
        updatedAt: nowIso
      });
      if (u.email) {
        batch.set(doc(db, 'roles', u.email), {
          email: u.email,
          level: 'Viewer',
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.email,
        }, { merge: true });
      }
      const logId = `LOG-${crypto.randomUUID()}`;
      batch.set(doc(db, 'audit_logs', logId), {
        id: logId,
        uid: currentUser.uid,
        timestamp: serverTimestamp(),
        user: currentUser.email,
        actorName: getActorName(),
        actorRole: getActorRoleLabel(),
        module: 'user_management',
        collection: 'users',
        recordId: u.uid.slice(0, 128),
        action: 'delete',
        details: `DELETE_USER (soft delete): ${u.email} deleted by ${currentUser.email}`.slice(0, 995),
        status: 'SUCCESS',
      });
      await batch.commit();
      triggerToast(`Pengguna ${u.email} berhasil dihapus.`);
    } catch (err: any) {
      pushGlobalToast("Gagal menghapus pengguna: " + (err?.message || 'Unknown error'), 'error');
    }
  };

  const handleConfirmActionExecute = async () => {
    if (!confirmAction) return;
    setIsConfirmExecuting(true);
    try {
      if (confirmAction.type === 'disable') {
        await executeDisableUser(confirmAction.user);
      } else if (confirmAction.type === 'reset_password') {
        await executeResetPassword(confirmAction.user);
      } else if (confirmAction.type === 'delete') {
        await executeDeleteUser(confirmAction.user);
      }
      setConfirmAction(null);
    } finally {
      setIsConfirmExecuting(false);
    }
  };

  const handleEditRoleConfirm = async () => {
    if (!editRoleTarget || !editRoleTarget.uid || !currentUser?.uid || !currentUser?.email) return;
    if (isSelfUser(editRoleTarget)) {
      pushGlobalToast('Tidak dapat mengubah peran akun milik sendiri.', 'error');
      return;
    }
    const oldAuthRole = getAuthoritativeRole(editRoleTarget);
    if (!isStrictAdminUser) {
      if (
        !(MANAGER_ASSIGNABLE_ROLES as readonly string[]).includes(oldAuthRole) ||
        !(MANAGER_ASSIGNABLE_ROLES as readonly string[]).includes(selectedNewRole)
      ) {
        pushGlobalToast('Environment Manager hanya dapat mengelola peran hingga Environment Superintendent.', 'error');
        return;
      }
    }
    try {
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();
      if (isStrictAdminUser) {
        batch.update(doc(db, 'users', editRoleTarget.uid), {
          role: selectedNewRole,
          updatedAt: nowIso,
        });
      }
      if (editRoleTarget.email) {
        batch.set(doc(db, 'roles', editRoleTarget.email), {
          email: editRoleTarget.email,
          level: selectedNewRole,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser.email,
        }, { merge: true });
      }
      const logId = `LOG-${crypto.randomUUID()}`;
      batch.set(doc(db, 'audit_logs', logId), {
        id: logId,
        uid: currentUser.uid,
        timestamp: serverTimestamp(),
        user: currentUser.email,
        actorName: getActorName(),
        actorRole: getActorRoleLabel(),
        module: 'role_management',
        collection: 'roles',
        recordId: (editRoleTarget.email || editRoleTarget.uid).slice(0, 128),
        action: 'role_change',
        details: `CHANGE_ROLE: ${editRoleTarget.email} role changed from ${oldAuthRole} to ${selectedNewRole} by ${currentUser.email}`.slice(0, 995),
        beforeData: { role: oldAuthRole },
        afterData: { role: selectedNewRole },
        status: 'SUCCESS',
      });
      await batch.commit();
      triggerToast(`Peran pengguna ${editRoleTarget.email} berhasil diubah ke ${selectedNewRole}.`);
      setEditRoleTarget(null);
    } catch (err: any) {
      pushGlobalToast("Gagal memperbarui peranan: " + (err?.message || 'Unknown error'), 'error');
    }
  };

  const togglePermission = async (role: string, modKey: string) => {
    if (!isStrictAdminUser) {
      pushGlobalToast('Hanya Strict Admin yang dapat mengubah matriks izin aplikasi.', 'error');
      return;
    }
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
      pushGlobalToast("Gagal menyimpan matriks izin: " + (err?.message || 'Permission denied'), 'error');
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

          {isStrictAdminUser && (
            <button
              onClick={() => setActiveTab('reconcile')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'reconcile'
                  ? 'bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/45 shadow-glow-cyan'
                  : 'bg-bg-1 text-text-mid hover:text-text-hi hover:bg-bg-2 border border-border-subtle'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Rekonsiliasi Peran
              {reconcileStats.totalIssues > 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-bold border ${
                    reconcileStats.highRisk > 0
                      ? 'bg-neon-red/20 text-neon-red border-neon-red/40'
                      : 'bg-neon-amber/20 text-neon-amber border-neon-amber/40'
                  }`}
                >
                  {reconcileStats.totalIssues}
                </span>
              )}
            </button>
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
                <option value="Suspended">Suspended</option>
                <option value="Disabled">Disabled</option>
                <option value="Rejected">Rejected</option>
              </select>

              <button
                type="button"
                disabled={isMigrating}
                onClick={handleRunMigrations}
                className="px-3 py-2 bg-bg-1 hover:bg-bg-2 border border-border-neon text-neon-cyan text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                title="Normalisasi aman data lama (standar PERTEK, flag isApproved, status GRK)"
              >
                {isMigrating ? 'Migrasi...' : 'Migrasi Aman Data'}
              </button>
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
                  filteredUsers.map((u) => {
                    const authRole = getAuthoritativeRole(u);
                    const isSelf = isSelfUser(u);
                    const canAct = canActOnTargetUser(u);
                    const hasRoleMismatch = isStrictAdminUser && u.role && u.role !== authRole;

                    return (
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
                            <p className="font-bold text-text-hi">
                              {u.fullName || u.name}
                              {isSelf && <span className="ml-1.5 text-[10px] font-mono text-neon-cyan">(Anda)</span>}
                            </p>
                            <p className="text-[10px] text-text-low">{u.position || 'Staff'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-text-mid">{u.email}</td>
                      <td>
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-neon-cyan" />
                            {authRole}
                          </span>
                          {hasRoleMismatch && (
                            <span className="text-[10px] font-mono text-neon-amber">
                              users.role: {u.role} (tidak sinkron)
                            </span>
                          )}
                        </div>
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
                        ) : u.status === 'Suspended' ? (
                          <StatusBadge status="Exceeded" label="Suspended" />
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
                            type="button"
                            disabled={!canAct}
                            onClick={() => {
                              if (!canAct) return;
                              setEditRoleTarget(u);
                              const nextInitial = (assignableRoles as readonly string[]).includes(authRole)
                                ? authRole
                                : assignableRoles[0];
                              setSelectedNewRole(nextInitial);
                            }}
                            title={
                              isSelf
                                ? 'Tidak dapat mengubah peran akun sendiri'
                                : !canAct
                                  ? 'Hanya Strict Admin yang dapat mengubah peran Admin/Manager'
                                  : 'Ubah Peran (Role)'
                            }
                            className="p-1.5 bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25 border border-neon-cyan/30 rounded-lg transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Suspend / Disable / Enable */}
                          {u.status === 'Active' ? (
                            <>
                              <button
                                type="button"
                                disabled={!canAct}
                                onClick={() => handleSuspendUser(u)}
                                title={canAct ? 'Tangguhkan Akun (Suspend)' : 'Tidak diizinkan untuk akun ini'}
                                className="p-1.5 bg-neon-red/15 text-neon-red hover:bg-neon-red/25 border border-neon-red/30 rounded-lg transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={!canAct}
                                onClick={() => setConfirmAction({ type: 'disable', user: u })}
                                title={canAct ? 'Nonaktifkan Akun' : 'Tidak diizinkan untuk akun ini'}
                                className="p-1.5 bg-neon-amber/15 text-neon-amber hover:bg-neon-amber/25 border border-neon-amber/30 rounded-lg transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAct}
                              onClick={() => handleEnableUser(u)}
                              title={canAct ? 'Aktifkan Akun' : 'Tidak diizinkan untuk akun ini'}
                              className="p-1.5 bg-neon-green/15 text-neon-green hover:bg-neon-green/25 border border-neon-green/30 rounded-lg transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => setConfirmAction({ type: 'reset_password', user: u })}
                            title="Kirim Email Reset Password"
                            className="p-1.5 bg-bg-2 text-text-mid hover:text-text-hi hover:bg-bg-1 border border-border-subtle rounded-lg transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            type="button"
                            disabled={!canAct}
                            onClick={() => setConfirmAction({ type: 'delete', user: u })}
                            title={canAct ? 'Hapus Pengguna (Soft Delete)' : 'Tidak diizinkan untuk akun ini'}
                            className="p-1.5 bg-neon-red/15 text-neon-red hover:bg-neon-red/25 border border-neon-red/30 rounded-lg transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })
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
                            disabled={!isStrictAdminUser}
                            onClick={() => togglePermission(role, mod.key)}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              isAllowed
                                ? 'bg-neon-green/15 text-neon-green border border-neon-green/40 hover:bg-neon-green/25 shadow-glow-green'
                                : 'bg-bg-0/60 text-text-low border border-border-subtle hover:bg-bg-2 hover:text-text-mid'
                            }`}
                            title={
                              !isStrictAdminUser
                                ? 'Hanya Strict Admin yang dapat mengubah matriks izin'
                                : `${role}: ${isAllowed ? 'Diizinkan' : 'Dilarang'}`
                            }
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

          <div className="p-3.5 rounded-2xl bg-neon-amber/10 border border-neon-amber/35 text-[11px] text-text-mid leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-neon-amber shrink-0 mt-0.5" />
            <div>
              <strong className="text-text-hi">Catatan Keamanan Arsitektur (Audit &amp; Kontrol Backend):</strong>{' '}
              Jejak audit terstruktur (modul, actorRole, before/after snapshot, correctionReason, serverTimestamp) divalidasi oleh Firestore Security Rules yang bersifat append-only (immutable).
              Custom claims otomatis Firebase Auth, counters/neraca transaksi atomik lintas-dokumen, dan pencatatan audit server-side penuh memerlukan deployment Firebase Cloud Functions (Admin SDK).
            </div>
          </div>

          {loadingAudit ? (
            <TableSkeleton columns={6} rows={6} />
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
                    <th>Modul / Koleksi</th>
                    <th>Tipe Aksi</th>
                    <th className="pr-4">Detail &amp; Alasan Koreksi</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="text-[11px]">
                      <td className="pl-4 text-text-mid whitespace-nowrap tabular-nums">
                        {formatTimestamp(log.timestamp, 'id-ID')}
                      </td>
                      <td>
                        <div className="text-neon-cyan font-semibold">{log.user || 'system'}</div>
                        {log.actorRole && <div className="text-[10px] text-text-low font-sans">{log.actorRole}</div>}
                      </td>
                      <td className="text-text-mid">
                        <div className="text-text-hi font-semibold">{log.module || log.collection || '-'}</div>
                        <div className="text-[10px] text-text-low">{log.collection || '-'} · {log.recordId || '-'}</div>
                      </td>
                      <td>
                        <span className={
                          log.action === 'insert' ? 'badge-safe' :
                          log.action === 'delete' ? 'badge-exceeded' :
                          'badge-monitored'
                        }>
                          {log.action?.toUpperCase() || 'INFO'}
                        </span>
                      </td>
                      <td className="pr-4 text-text-hi font-sans">
                        <div>{log.details}</div>
                        {log.correctionReason && (
                          <div className="mt-1 text-[10px] text-neon-amber font-mono">
                            Alasan koreksi: {log.correctionReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: REKONSILIASI PERAN (STRICT ADMIN ONLY — K-03 PERSIAPAN) */}
      {activeTab === 'reconcile' && isStrictAdminUser && (
        <div className="glass-panel border border-border-neon rounded-3xl p-6 space-y-5 text-text-mid">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-border-subtle pb-4">
            <div>
              <h2 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-neon-amber" />
                Rekonsiliasi Peran (/users vs /roles)
              </h2>
              <p className="text-xs text-text-mid mt-0.5">
                Audit dan penertiban manual dokumen /roles dan /users sebelum penguncian sumber peran tunggal. Pilih level peran tiap baris secara manual disertai alasan koreksi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={reconcileFilter}
                onChange={(e) => setReconcileFilter(e.target.value as 'ALL' | 'ISSUES_ONLY')}
                className="px-3 py-2 text-xs cursor-pointer"
                aria-label="Filter baris rekonsiliasi peran"
              >
                <option value="ALL">Semua Baris ({reconcileRows.length})</option>
                <option value="ISSUES_ONLY">Hanya Temuan a–d ({reconcileStats.totalIssues})</option>
              </select>

              <button
                type="button"
                onClick={() => exportRoleReconciliationToXLSX(visibleReconcileRows)}
                className="neon-btn-primary px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor .xlsx ({visibleReconcileRows.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-neon-red/10 border border-neon-red/35">
              <p className="text-[10px] font-mono font-bold text-neon-red uppercase">(c) Risiko Tinggi</p>
              <p className="text-lg font-bold text-text-hi font-mono tabular-nums mt-0.5">{reconcileStats.highRisk}</p>
              <p className="text-[10px] text-text-mid">Admin/Manager tanpa /roles</p>
            </div>
            <div className="p-3 rounded-2xl bg-neon-amber/10 border border-neon-amber/35">
              <p className="text-[10px] font-mono font-bold text-neon-amber uppercase">(a) Active Tanpa /roles</p>
              <p className="text-lg font-bold text-text-hi font-mono tabular-nums mt-0.5">{reconcileStats.activeNoRole}</p>
              <p className="text-[10px] text-text-mid">Pengguna aktif tanpa /roles</p>
            </div>
            <div className="p-3 rounded-2xl bg-neon-amber/10 border border-neon-amber/35">
              <p className="text-[10px] font-mono font-bold text-neon-amber uppercase">(b) Role ≠ Level</p>
              <p className="text-lg font-bold text-text-hi font-mono tabular-nums mt-0.5">{reconcileStats.mismatch}</p>
              <p className="text-[10px] text-text-mid">users.role beda dgn roles.level</p>
            </div>
            <div className="p-3 rounded-2xl bg-neon-violet/10 border border-neon-violet/35">
              <p className="text-[10px] font-mono font-bold text-neon-violet uppercase">(d) /roles Yatim</p>
              <p className="text-lg font-bold text-text-hi font-mono tabular-nums mt-0.5">{reconcileStats.orphanRole}</p>
              <p className="text-[10px] text-text-mid">/roles tanpa pengguna /users</p>
            </div>
          </div>

          {loadingUsers || loadingRolesDocs ? (
            <TableSkeleton columns={7} rows={5} />
          ) : visibleReconcileRows.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tidak Ada Data Rekonsiliasi"
              description="Tidak ditemukan baris yang sesuai dengan filter rekonsiliasi peran."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border-neon bg-bg-1/40">
              <table className="neon-table">
                <thead>
                  <tr>
                    <th className="pl-4">Nama</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>users.role</th>
                    <th>roles.level</th>
                    <th>Kategori Temuan</th>
                    <th className="pr-4">Penetapan Manual &amp; Alasan (min. 10 karakter)</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReconcileRows.map((row) => {
                    const draft = reconcileDrafts[row.rowKey] || { level: '', reason: '' };
                    const isSaving = savingReconcileKey === row.rowKey;
                    const canCommit =
                      Boolean(draft.level) &&
                      draft.reason.trim().length >= 10 &&
                      Boolean(row.roleDocId) &&
                      row.roleDocId !== '-' &&
                      !isSaving;

                    return (
                      <tr key={row.rowKey}>
                        <td className="pl-4 font-semibold text-text-hi">{row.fullName}</td>
                        <td className="font-mono text-xs text-neon-cyan">{row.email}</td>
                        <td>
                          <span className="text-xs font-mono text-text-hi">{row.status}</span>
                        </td>
                        <td className="font-mono text-xs">
                          {row.usersRole ?? <span className="text-text-low italic">(kosong)</span>}
                        </td>
                        <td className="font-mono text-xs">
                          {row.rolesLevel ?? <span className="text-neon-red italic">(tidak ada)</span>}
                        </td>
                        <td>
                          {row.findingCode === 'C_HIGH_RISK' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-neon-red/20 text-neon-red border border-neon-red/40">
                              {row.findingLabel}
                            </span>
                          ) : row.findingCode === 'A_ACTIVE_NO_ROLE' || row.findingCode === 'B_ROLE_MISMATCH' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-neon-amber/20 text-neon-amber border border-neon-amber/40">
                              {row.findingLabel}
                            </span>
                          ) : row.findingCode === 'D_ORPHAN_ROLE' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-neon-violet/20 text-neon-violet border border-neon-violet/40">
                              {row.findingLabel}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neon-green/15 text-neon-green border border-neon-green/35">
                              {row.findingLabel}
                            </span>
                          )}
                        </td>
                        <td className="pr-4">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-[340px]">
                            <select
                              value={draft.level}
                              onChange={(e) =>
                                handleReconcileDraftChange(row.rowKey, { level: e.target.value })
                              }
                              disabled={isSaving}
                              className="px-2.5 py-1.5 text-xs cursor-pointer"
                              aria-label={`Pilih level untuk ${row.email}`}
                            >
                              <option value="">-- Pilih Level --</option>
                              {AVAILABLE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>

                            <input
                              type="text"
                              value={draft.reason}
                              onChange={(e) =>
                                handleReconcileDraftChange(row.rowKey, { reason: e.target.value })
                              }
                              disabled={isSaving}
                              maxLength={400}
                              placeholder="Alasan koreksi (min 10 char)"
                              className="px-2.5 py-1.5 text-xs flex-1 min-w-[160px]"
                              aria-label={`Alasan koreksi untuk ${row.email}`}
                            />

                            <button
                              type="button"
                              disabled={!canCommit}
                              onClick={() => handleReconcileAssign(row)}
                              className="neon-btn-primary px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isSaving ? 'Menyimpan...' : 'Tetapkan'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                {assignableRoles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {!isStrictAdminUser && (
                <p className="mt-1.5 text-[10px] text-text-low">
                  Environment Manager dapat menetapkan peran hingga Environment Superintendent. Peran Admin &amp; Manager ditetapkan oleh Strict Admin.
                </p>
              )}
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
                {assignableRoles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {!isStrictAdminUser && (
                <p className="mt-1.5 text-[10px] text-text-low">
                  Environment Manager dapat mengubah peran hingga Environment Superintendent.
                </p>
              )}
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

      {/* DIALOG 4: KONFIRMASI AKSI PENGGUNA (DISABLE / RESET PASSWORD / SOFT DELETE) */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-bg-0/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel border border-border-neon rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 className="text-base font-bold text-text-hi font-heading flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-neon-amber" />
                {confirmAction.type === 'disable'
                  ? 'Nonaktifkan Akses Pengguna'
                  : confirmAction.type === 'reset_password'
                    ? 'Kirim Tautan Reset Password'
                    : 'Hapus Pengguna (Soft Delete)'}
              </h3>
              <button
                type="button"
                disabled={isConfirmExecuting}
                onClick={() => setConfirmAction(null)}
                className="p-1 hover:bg-bg-2 rounded-lg text-text-low hover:text-text-hi cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-mid leading-relaxed">
              {confirmAction.type === 'disable' && (
                <>Nonaktifkan akses pengguna <strong className="text-text-hi">{confirmAction.user.fullName || confirmAction.user.email}</strong>? Peran akan diturunkan ke Viewer dan akses masuk dicabut.</>
              )}
              {confirmAction.type === 'reset_password' && (
                <>Kirim tautan reset password ke alamat email <strong className="text-neon-cyan font-mono">{confirmAction.user.email}</strong>?</>
              )}
              {confirmAction.type === 'delete' && (
                <>Hapus pengguna <strong className="text-text-hi">{confirmAction.user.fullName || confirmAction.user.email}</strong> secara soft-delete? Peran di /roles akan diturunkan ke Viewer dan akses masuk dinonaktifkan.</>
              )}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isConfirmExecuting}
                onClick={() => setConfirmAction(null)}
                className="w-1/3 py-2.5 border border-border-subtle hover:bg-bg-2 text-text-mid hover:text-text-hi text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isConfirmExecuting}
                onClick={handleConfirmActionExecute}
                className={`${
                  confirmAction.type === 'delete' ? 'neon-btn-danger' : 'neon-btn-primary'
                } flex-1 py-2.5 text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider disabled:opacity-50`}
              >
                {isConfirmExecuting ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
