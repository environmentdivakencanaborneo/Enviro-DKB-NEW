/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { auth } from '../utils/firebaseAuth';

export type Role = 'Viewer' | 'Operator' | 'Superintendent' | 'Admin';

/**
 * Validasi apakah pengguna saat ini berhak membaca data.
 * Semua pengguna yang terautentikasi memiliki akses baca.
 */
export function canRead(): boolean {
  return !!auth.currentUser;
}

export async function refreshAndGetClaims(): Promise<Record<string, any>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdTokenResult(true);
  return token.claims;
}

export function mapRole(roleString: string | null | undefined): Role {
  if (!roleString) return 'Viewer';
  const role = roleString.toLowerCase().trim();
  
  if (role === 'admin' || role === 'super admin' || role.includes('admin') || role.includes('administrator') || role.includes('env manager') || role.includes('environment manager')) {
    return 'Admin';
  }
  
  if (role.includes('superintendent') || role.includes('chief') || role.includes('pimpinan') || (role.includes('manager') && !role.includes('env manager'))) {
    return 'Superintendent';
  }
  
  if (role.includes('user') || role.includes('supervisor') || role.includes('foreman') || role.includes('operator') || role.includes('lead') || role.includes('inspector') || role.includes('pengawas') || role.includes('staff')) {
    return 'Operator';
  }
  
  if (role.includes('viewer') || role.includes('auditor') || role.includes('direktur') || role.includes('guest') || role.includes('baca')) {
    return 'Viewer';
  }
  
  return 'Viewer';
}

export function canWrite(profile: { role?: string, level?: string } | null | undefined): boolean {
  if (!profile) return false;
  const role = (profile.level as Role) || mapRole(profile.role);
  return role === 'Operator' || role === 'Superintendent' || role === 'Admin';
}

export function isAdmin(profile: { role?: string, level?: string } | null | undefined): boolean {
  if (!profile) return false;
  const role = (profile.level as Role) || mapRole(profile.role);
  return role === 'Admin';
}
