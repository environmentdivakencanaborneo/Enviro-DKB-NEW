/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { atLeast, DEFAULT_ROLE, normalizeRole, ROLE_RANK, type Role } from '../../shared/roles';

export interface CallerContext {
  uid: string;
  email: string;
  name: string;
  position: string;
  role: Role;
  rank: number;
}

export interface AuthzDbReader {
  doc(path: string): {
    get(): Promise<{ exists: boolean; data(): Record<string, any> | undefined }>;
  };
}

export interface CallableAuthInfo {
  uid?: string;
  token?: {
    email?: string;
    email_verified?: boolean;
    name?: string;
    role?: string;
    [key: string]: unknown;
  };
}

export async function verifyCallerContext(
  auth: CallableAuthInfo | undefined | null,
  db: AuthzDbReader,
  minimumRole: Role = 'Viewer'
): Promise<CallerContext> {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autentikasi pengguna wajib tersedia.');
  }

  const email = typeof auth.token?.email === 'string' ? auth.token.email.trim() : '';
  if (!email) {
    throw new HttpsError('permission-denied', 'Email akun tidak ditemukan pada token sesi.');
  }

  if (auth.token?.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Email akun belum terverifikasi.');
  }

  const userSnap = await db.doc(`users/${auth.uid}`).get();
  if (!userSnap.exists) {
    throw new HttpsError('permission-denied', 'Profil pengguna belum terdaftar.');
  }

  const userData = userSnap.data() || {};
  if (
    userData.status !== 'Active' ||
    userData.isApproved !== true ||
    userData.isActive === false ||
    userData.deleted === true
  ) {
    throw new HttpsError(
      'permission-denied',
      'Akun Anda belum aktif atau belum disetujui administrator.'
    );
  }

  // Otoritatif: baca peran dari /roles/{email} (K-03)
  let roleSnap = await db.doc(`roles/${email}`).get();
  if (!roleSnap.exists && email.toLowerCase() !== email) {
    roleSnap = await db.doc(`roles/${email.toLowerCase()}`).get();
  }

  const role: Role = roleSnap.exists
    ? normalizeRole(roleSnap.data()?.level)
    : DEFAULT_ROLE;

  if (!atLeast(role, minimumRole)) {
    throw new HttpsError(
      'permission-denied',
      `Akses ditolak: tindakan ini membutuhkan peran minimal ${minimumRole}.`
    );
  }

  const displayName =
    (typeof userData.fullName === 'string' && userData.fullName.trim()) ||
    (typeof userData.name === 'string' && userData.name.trim()) ||
    (typeof auth.token?.name === 'string' && auth.token.name.trim()) ||
    email;

  const position =
    (typeof userData.position === 'string' && userData.position.trim()) || role;

  return {
    uid: auth.uid,
    email,
    name: displayName,
    position,
    role,
    rank: ROLE_RANK[role] ?? 0,
  };
}
