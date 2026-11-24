/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deterministically stringify an object by sorting its keys alphabetically.
 * Ensures consistent hash generation across browser client and Node Cloud Functions.
 */
export function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const entries: string[] = [];

  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined && typeof val !== 'function') {
      entries.push(JSON.stringify(key) + ':' + canonicalStringify(val));
    }
  }

  return '{' + entries.join(',') + '}';
}
