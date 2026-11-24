/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebaseAuth';
import {
  DEFAULT_FEATURE_FLAGS,
  normalizeFeatureFlags,
  type FeatureFlags,
} from '../../shared/featureFlags';

export type { FeatureFlags };
export { DEFAULT_FEATURE_FLAGS };

let cachedFlags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };
const listeners = new Set<(flags: FeatureFlags) => void>();

function notifyListeners(next: FeatureFlags) {
  cachedFlags = next;
  listeners.forEach((cb) => {
    try {
      cb(next);
    } catch {
      // ignore subscriber failure
    }
  });
}

export function getCachedFeatureFlags(): FeatureFlags {
  return cachedFlags;
}

export async function refreshFeatureFlags(): Promise<FeatureFlags> {
  try {
    const snap = await getDoc(doc(db, 'app_meta', 'feature_flags'));
    const next = snap.exists() ? normalizeFeatureFlags(snap.data()) : { ...DEFAULT_FEATURE_FLAGS };
    notifyListeners(next);
    return next;
  } catch {
    return cachedFlags;
  }
}

export function subscribeFeatureFlags(callback?: (flags: FeatureFlags) => void): () => void {
  if (callback) {
    listeners.add(callback);
    callback(cachedFlags);
  }
  const unsub = onSnapshot(
    doc(db, 'app_meta', 'feature_flags'),
    (snap) => {
      const next = snap.exists() ? normalizeFeatureFlags(snap.data()) : { ...DEFAULT_FEATURE_FLAGS };
      notifyListeners(next);
    },
    () => {
      // Non-fatal: keep defaults
    }
  );
  return () => {
    unsub();
    if (callback) {
      listeners.delete(callback);
    }
  };
}

export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(cachedFlags);
  useEffect(() => {
    const cb = (next: FeatureFlags) => setFlags(next);
    listeners.add(cb);
    setFlags(cachedFlags);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return flags;
}
