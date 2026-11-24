/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DEFAULT_FEATURE_FLAGS,
  normalizeFeatureFlags,
  type FeatureFlags,
} from '../../shared/featureFlags';

export type { FeatureFlags };
export { DEFAULT_FEATURE_FLAGS };

export interface FirestoreFlagReader {
  doc(path: string): {
    get(): Promise<{ exists: boolean; data(): Record<string, any> | undefined }>;
  };
}

export async function readFeatureFlags(db: FirestoreFlagReader): Promise<FeatureFlags> {
  try {
    const snap = await db.doc('app_meta/feature_flags').get();
    if (!snap.exists) {
      return { ...DEFAULT_FEATURE_FLAGS };
    }
    return normalizeFeatureFlags(snap.data());
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}
