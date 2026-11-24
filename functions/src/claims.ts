/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { DEFAULT_ROLE, normalizeRole, ROLE_RANK } from '../../shared/roles';
import { buildDocumentTriggerOptions } from './config';
import { readFeatureFlags, type FeatureFlags } from './featureFlags';
import { adminAuth, adminDb, FieldValue } from './firebaseAdmin';

export interface ClaimsUserRecord {
  uid: string;
  email?: string;
  customClaims?: Record<string, any>;
}

export interface ClaimsSyncDeps {
  readFlags: () => Promise<FeatureFlags>;
  getUserByEmail: (email: string) => Promise<ClaimsUserRecord | null>;
  setCustomUserClaims: (uid: string, claims: Record<string, any>) => Promise<void>;
  stampUserClaimsUpdatedAt: (uid: string) => Promise<void>;
}

const defaultClaimsDeps: ClaimsSyncDeps = {
  readFlags: () => readFeatureFlags(adminDb),
  getUserByEmail: async (email) => {
    try {
      const user = await adminAuth.getUserByEmail(email);
      return {
        uid: user.uid,
        email: user.email,
        customClaims: user.customClaims as Record<string, any> | undefined,
      };
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        return null;
      }
      throw err;
    }
  },
  setCustomUserClaims: (uid, claims) => adminAuth.setCustomUserClaims(uid, claims),
  stampUserClaimsUpdatedAt: async (uid) => {
    const ref = adminDb.doc(`users/${uid}`);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update({ claimsUpdatedAt: FieldValue.serverTimestamp() });
    }
  },
};

export async function processRoleClaimsSync(
  emailParam: string,
  beforeData: Record<string, any> | undefined,
  afterData: Record<string, any> | undefined,
  deps: ClaimsSyncDeps = defaultClaimsDeps
): Promise<{ status: 'synced' | 'skipped'; role?: string; rank?: number; reason?: string }> {
  const flags = await deps.readFlags();
  if (!flags.roleClaims) {
    return { status: 'skipped', reason: 'flag_disabled' };
  }

  const email = emailParam.trim();
  if (!email) {
    return { status: 'skipped', reason: 'empty_email' };
  }

  const user = await deps.getUserByEmail(email);
  if (!user) {
    return { status: 'skipped', reason: 'auth_user_not_found' };
  }

  const nextRole = afterData ? normalizeRole(afterData.level) : DEFAULT_ROLE;
  const nextRank = ROLE_RANK[nextRole] ?? 0;

  const existingClaims = user.customClaims || {};
  const levelChanged = !beforeData || !afterData || beforeData.level !== afterData.level;
  if (
    !levelChanged &&
    existingClaims.role === nextRole &&
    existingClaims.rank === nextRank
  ) {
    return { status: 'skipped', reason: 'unchanged', role: nextRole, rank: nextRank };
  }

  const mergedClaims = {
    ...existingClaims,
    role: nextRole,
    rank: nextRank,
  };

  await deps.setCustomUserClaims(user.uid, mergedClaims);
  await deps.stampUserClaimsUpdatedAt(user.uid);

  return { status: 'synced', role: nextRole, rank: nextRank };
}

export const syncRoleCustomClaims = onDocumentWritten(
  buildDocumentTriggerOptions('roles/{email}'),
  async (event) => {
    const email = event.params.email;
    const beforeData = event.data?.before?.exists
      ? (event.data.before.data() as Record<string, any>)
      : undefined;
    const afterData = event.data?.after?.exists
      ? (event.data.after.data() as Record<string, any>)
      : undefined;

    await processRoleClaimsSync(email, beforeData, afterData);
  }
);
