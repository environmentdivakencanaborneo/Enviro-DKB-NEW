/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Safely converts any date/timestamp representation (string, number, Firestore Timestamp, Date)
 * into milliseconds since epoch (number).
 */
export function getTimeMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  }
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val.seconds === 'number') {
    return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000);
  }
  if (val instanceof Date) return val.getTime();
  return 0;
}

/**
 * Safely formats any date/timestamp into localized string.
 */
export function formatTimestamp(
  val: any,
  locale = 'id-ID',
  options?: Intl.DateTimeFormatOptions,
  fallback = '-'
): string {
  if (!val) return fallback;
  const ms = getTimeMs(val);
  if (!ms) return fallback;
  return new Date(ms).toLocaleString(locale, options);
}
