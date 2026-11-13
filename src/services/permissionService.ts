/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from '../utils/firebaseAuth';
import { 
  Role, 
  DEFAULT_ROLE, 
  normalizeRole, 
  atLeast 
} from '../utils/roles';

export type { Role };

export function canRead(): boolean {
  return !!auth.currentUser;
}

export async function refreshAndGetClaims(): Promise<Record<string, any>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdTokenResult(true);
  return token.claims;
}

export interface UserProfileLike {
  role?: string;
  level?: string;
  status?: string;
  isApproved?: boolean;
  isActive?: boolean;
  deleted?: boolean;
}

export function isActiveApproved(profile: UserProfileLike | null | undefined): boolean {
  if (!profile) return false;
  const blockedStatuses = ['Disabled', 'Deleted', 'Rejected', 'Pending'];
  if (profile.status && blockedStatuses.includes(profile.status)) {
    return false;
  }
  const isStatusActiveOrApproved = (profile.status === 'Active' || profile.isApproved === true);
  const isNotDisabled = profile.isActive !== false;
  const isNotDeleted = profile.deleted !== true;
  return isStatusActiveOrApproved && isNotDisabled && isNotDeleted;
}

export function effectiveRole(profile: UserProfileLike | null | undefined): Role {
  if (!isActiveApproved(profile)) {
    return DEFAULT_ROLE;
  }
  const rawRole = profile?.level ?? profile?.role;
  return normalizeRole(rawRole);
}

export function canWrite(profile: UserProfileLike | null | undefined): boolean {
  if (!auth.currentUser || !isActiveApproved(profile)) {
    return false;
  }
  return atLeast(effectiveRole(profile), 'Operator');
}

export function canCreate(profile: UserProfileLike | null | undefined): boolean {
  return canWrite(profile);
}

export function canEdit(profile: UserProfileLike | null | undefined): boolean {
  return canWrite(profile);
}

export function canDelete(profile: UserProfileLike | null | undefined): boolean {
  if (!auth.currentUser || !isActiveApproved(profile)) {
    return false;
  }
  return atLeast(effectiveRole(profile), 'Environment Superintendent');
}

export function canApprove(profile: UserProfileLike | null | undefined): boolean {
  if (!auth.currentUser || !isActiveApproved(profile)) {
    return false;
  }
  return atLeast(effectiveRole(profile), 'Environment Superintendent');
}


export function isSuperintendent(profile: UserProfileLike | null | undefined): boolean {
  return atLeast(effectiveRole(profile), 'Environment Superintendent');
}

export function isAdmin(profile: UserProfileLike | null | undefined): boolean {
  return atLeast(effectiveRole(profile), 'Environment Manager');
}

export const MODULE_MIN_ROLE: Record<string, Role> = {
  registration_approval: 'Environment Manager',
  user_management: 'Environment Manager',
  role_management: 'Admin',
  standards_master: 'Environment Superintendent',
  executive: 'Environment Superintendent',
  proper_rkab: 'Environment Superintendent',
  regulatory_watch: 'Environment Superintendent',
  costs: 'Environment Superintendent',
  audit_log: 'Environment Superintendent',
  dashboard: 'Viewer',
  monitoring: 'Viewer',
  amd_treatment: 'Viewer',
  domestic_wastewater: 'Viewer',
  air_emission: 'Viewer',
  ghg_inventory: 'Viewer',
  surfacewater: 'Viewer',
  rainfall: 'Viewer',
  evidence: 'Viewer',
  reclamation: 'Viewer',
  reclamation_guarantee: 'Viewer',
  topsoil_erosion: 'Viewer',
  biodiversity: 'Viewer',
  forestry_ppkh: 'Viewer',
  nursery: 'Viewer',
  waste: 'Viewer',
  solid_waste: 'Viewer',
  documents: 'Viewer',
  pertek_slo: 'Viewer',
  compliance_matrix: 'Viewer',
  reporting_calendar: 'Viewer',
  iadl_risk: 'Viewer',
  supervision: 'Viewer',
  findings: 'Viewer',
  incidents: 'Viewer',
  notifications: 'Viewer',
  reports: 'Viewer'
};

export const AUDITOR_READONLY_MODULES = new Set<string>([
  'audit_log',
  'compliance_matrix',
  'regulatory_watch',
  'proper_rkab',
  'costs',
]);

export function canAccessModule(profile: UserProfileLike | null | undefined, moduleKey: string): boolean {
  if (!isActiveApproved(profile)) {
    return false;
  }
  const role = effectiveRole(profile);
  if (role === 'Auditor' && AUDITOR_READONLY_MODULES.has(moduleKey)) {
    return true;
  }
  const requiredRole = MODULE_MIN_ROLE[moduleKey] ?? 'Admin'; // Fail-closed for unregistered modules
  return atLeast(role, requiredRole);
}

