/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FeatureFlags {
  serverEvaluation: boolean;
  serverEvidence: boolean;
  roleClaims: boolean;
  updatedAt?: any;
  updatedBy?: string;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  serverEvaluation: false,
  serverEvidence: false,
  roleClaims: false,
};

export function normalizeFeatureFlags(raw: unknown): FeatureFlags {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    serverEvaluation: obj.serverEvaluation === true,
    serverEvidence: obj.serverEvidence === true,
    roleClaims: obj.roleClaims === true,
    updatedAt: obj.updatedAt,
    updatedBy: typeof obj.updatedBy === 'string' ? obj.updatedBy : undefined,
  };
}
