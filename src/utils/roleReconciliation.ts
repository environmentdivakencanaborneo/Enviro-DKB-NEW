/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UserProfile } from '../types';
import { ROLES, Role, normalizeRole } from './roles';

export interface RoleDocRecord {
  id: string;
  email?: string;
  level?: string;
  updatedAt?: any;
  updatedBy?: string;
}

export type ReconciliationCategoryCode =
  | 'C_HIGH_RISK'
  | 'A_ACTIVE_NO_ROLE'
  | 'B_ROLE_MISMATCH'
  | 'D_ORPHAN_ROLE'
  | 'CONSISTENT'
  | 'NON_ACTIVE_NO_ROLE';

export interface ReconciliationRow {
  rowKey: string;
  email: string;
  uid: string | null;
  fullName: string;
  status: string;
  usersRole: string | null;
  rolesLevel: string | null;
  roleDocId: string;
  findingCode: ReconciliationCategoryCode;
  findingLabel: string;
  severity: 'critical' | 'warning' | 'info' | 'ok';
  isIssue: boolean;
}

const HIGH_RISK_ROLES = new Set<Role>(['Admin', 'Environment Manager']);

const CATEGORY_ORDER: Record<ReconciliationCategoryCode, number> = {
  C_HIGH_RISK: 0,
  A_ACTIVE_NO_ROLE: 1,
  B_ROLE_MISMATCH: 2,
  D_ORPHAN_ROLE: 3,
  CONSISTENT: 4,
  NON_ACTIVE_NO_ROLE: 5,
};

function isHighRiskUsersRole(rawRole: string | null | undefined): boolean {
  if (!rawRole || !rawRole.trim()) return false;
  return HIGH_RISK_ROLES.has(normalizeRole(rawRole));
}

export function classifyReconciliationRows(
  users: UserProfile[],
  roles: RoleDocRecord[]
): ReconciliationRow[] {
  const rows: ReconciliationRow[] = [];
  const matchedRoleDocIds = new Set<string>();

  const roleByExactId = new Map<string, RoleDocRecord>();
  const roleByLowerEmail = new Map<string, RoleDocRecord>();

  for (const r of roles) {
    if (!r || !r.id) continue;
    roleByExactId.set(r.id, r);
    const lowerId = r.id.trim().toLowerCase();
    if (!roleByLowerEmail.has(lowerId)) {
      roleByLowerEmail.set(lowerId, r);
    }
    if (r.email) {
      const lowerEmail = r.email.trim().toLowerCase();
      if (!roleByLowerEmail.has(lowerEmail)) {
        roleByLowerEmail.set(lowerEmail, r);
      }
    }
  }

  for (const user of users) {
    if (user.deleted) continue;
    const rawEmail = (user.email || '').trim();
    const lowerEmail = rawEmail.toLowerCase();
    const matchedRole =
      (rawEmail ? roleByExactId.get(rawEmail) : undefined) ||
      (lowerEmail ? roleByLowerEmail.get(lowerEmail) : undefined);

    if (matchedRole) {
      matchedRoleDocIds.add(matchedRole.id);
    }

    const usersRole = user.role ? String(user.role).trim() : null;
    const rolesLevel = matchedRole?.level ? String(matchedRole.level).trim() : null;
    const status = user.status || 'Unknown';
    const fullName = user.fullName || user.name || '-';
    const targetRoleDocId = matchedRole?.id || rawEmail || lowerEmail;

    let findingCode: ReconciliationCategoryCode;
    let findingLabel: string;
    let severity: ReconciliationRow['severity'];
    let isIssue: boolean;

    if (!matchedRole) {
      if (isHighRiskUsersRole(usersRole)) {
        findingCode = 'C_HIGH_RISK';
        findingLabel = '(c) RISIKO TINGGI: users.role Admin/Environment Manager tanpa /roles';
        severity = 'critical';
        isIssue = true;
      } else if (status === 'Active') {
        findingCode = 'A_ACTIVE_NO_ROLE';
        findingLabel = '(a) Pengguna Active tanpa dokumen /roles';
        severity = 'warning';
        isIssue = true;
      } else {
        findingCode = 'NON_ACTIVE_NO_ROLE';
        findingLabel = 'Akun non-Active tanpa dokumen /roles';
        severity = 'ok';
        isIssue = false;
      }
    } else if ((usersRole || '') !== (rolesLevel || '')) {
      findingCode = 'B_ROLE_MISMATCH';
      findingLabel = '(b) users.role berbeda dengan roles.level';
      severity = 'warning';
      isIssue = true;
    } else {
      findingCode = 'CONSISTENT';
      findingLabel = 'Konsisten';
      severity = 'ok';
      isIssue = false;
    }

    rows.push({
      rowKey: `user:${user.uid || rawEmail}`,
      email: rawEmail || '-',
      uid: user.uid || null,
      fullName,
      status,
      usersRole,
      rolesLevel,
      roleDocId: targetRoleDocId,
      findingCode,
      findingLabel,
      severity,
      isIssue,
    });
  }

  for (const roleDoc of roles) {
    if (!roleDoc || !roleDoc.id || matchedRoleDocIds.has(roleDoc.id)) continue;
    const email = (roleDoc.email || roleDoc.id).trim();
    const rolesLevel = roleDoc.level ? String(roleDoc.level).trim() : null;

    rows.push({
      rowKey: `role:${roleDoc.id}`,
      email,
      uid: null,
      fullName: '(Tidak ada profil /users)',
      status: 'Tanpa Akun /users',
      usersRole: null,
      rolesLevel,
      roleDocId: roleDoc.id,
      findingCode: 'D_ORPHAN_ROLE',
      findingLabel: '(d) Dokumen /roles tanpa pengguna terkait',
      severity: 'info',
      isIssue: true,
    });
  }

  rows.sort((a, b) => {
    const orderDiff = CATEGORY_ORDER[a.findingCode] - CATEGORY_ORDER[b.findingCode];
    if (orderDiff !== 0) return orderDiff;
    return a.email.localeCompare(b.email);
  });

  return rows;
}

export function validateReconciliationCommitInput(
  selectedLevel: string,
  correctionReason: string
): { valid: true; level: Role; reason: string } | { valid: false; error: string } {
  const trimmedLevel = (selectedLevel || '').trim();
  if (!ROLES.includes(trimmedLevel as Role)) {
    return {
      valid: false,
      error: 'Level peran wajib dipilih secara manual sebelum menetapkan.',
    };
  }
  const trimmedReason = (correctionReason || '').trim();
  if (trimmedReason.length < 10) {
    return {
      valid: false,
      error: 'Alasan koreksi wajib diisi minimal 10 karakter.',
    };
  }
  return {
    valid: true,
    level: trimmedLevel as Role,
    reason: trimmedReason,
  };
}
