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
  executive: 'Environment Superintendent',
  costs: 'Environment Superintendent',
  audit_log: 'Environment Superintendent',
  dashboard: 'Viewer',
  monitoring: 'Viewer',
  surfacewater: 'Viewer',
  rainfall: 'Viewer',
  reclamation: 'Viewer',
  nursery: 'Viewer',
  waste: 'Viewer',
  solid_waste: 'Viewer',
  capa: 'Viewer',
  incidents: 'Viewer',
  documents: 'Viewer',
  compliance: 'Viewer',
  regulatory: 'Viewer',
  reports: 'Viewer'
};

export function canAccessModule(profile: UserProfileLike | null | undefined, moduleKey: string): boolean {
  if (!isActiveApproved(profile)) {
    return false;
  }
  const requiredRole = MODULE_MIN_ROLE[moduleKey] ?? 'Admin'; // Fail-closed for unregistered modules
  return atLeast(effectiveRole(profile), requiredRole);
}
