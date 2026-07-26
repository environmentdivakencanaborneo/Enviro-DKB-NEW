/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ROLES = [
  'Admin',
  'Environment Manager',
  'Environment Superintendent',
  'Foreman',
  'Operator',
  'Auditor',
  'Viewer'
] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = 'Viewer';

export const ROLE_RANK: Record<Role, number> = {
  Viewer: 0,
  Auditor: 1,
  Operator: 2,
  Foreman: 2,
  'Environment Superintendent': 3,
  'Environment Manager': 4,
  Admin: 5
};

export const LEGACY_ROLE_MAP: Record<string, Role> = {
  'User': 'Viewer',
  'Pending': 'Viewer',
  'ADMIN': 'Admin',
  'admin': 'Admin',
  'Super Admin': 'Admin',
  'Env Manager': 'Environment Manager',
  'Manager': 'Environment Manager',
  'Superintendent': 'Environment Superintendent',
  'SUPERINTENDENT': 'Environment Superintendent',
  'Supervisor': 'Foreman',
  'OPERATOR': 'Operator',
  'operator': 'Operator'
};

export function toRole(raw: unknown): Role {
  if (typeof raw !== 'string') return DEFAULT_ROLE;
  const trimmed = raw.trim();
  const found = ROLES.find(r => r.toLowerCase() === trimmed.toLowerCase());
  return found ?? DEFAULT_ROLE;
}

export function normalizeRole(raw: unknown): Role {
  if (typeof raw !== 'string') return DEFAULT_ROLE;
  const trimmed = raw.trim();
  if (trimmed in LEGACY_ROLE_MAP) {
    return LEGACY_ROLE_MAP[trimmed];
  }
  // Try case-insensitive lookup in LEGACY_ROLE_MAP
  const lower = trimmed.toLowerCase();
  for (const [legacyKey, mappedRole] of Object.entries(LEGACY_ROLE_MAP)) {
    if (legacyKey.toLowerCase() === lower) {
      return mappedRole;
    }
  }
  return toRole(trimmed);
}

export function atLeast(role: Role, minimum: Role): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minimum] ?? 0);
}
