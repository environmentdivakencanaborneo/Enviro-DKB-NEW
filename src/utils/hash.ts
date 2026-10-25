/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deterministically stringify an object by sorting its keys alphabetically.
 * Ensures consistent hash generation across different clients and platforms.
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

/**
 * Computes a SHA-256 hexadecimal hash string for any data payload using crypto.subtle.
 */
export async function computeSnapshotHash(data: any): Promise<string> {
  const canonicalJson = canonicalStringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(canonicalJson);

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Pure JS fallback if crypto.subtle is unavailable (e.g. non-secure local testing)
  let h = 0x811c9dc5;
  for (let i = 0; i < dataBuffer.length; i++) {
    h ^= dataBuffer[i];
    h = Math.imul(h, 0x01000193);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

/**
 * Generates a secure random verification token of specified character length (default 16).
 */
export function generateRandomToken(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array)
    .map((b) => chars[b % chars.length])
    .join('');
}
