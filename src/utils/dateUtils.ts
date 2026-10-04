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

/**
 * Mengembalikan tanggal dalam zona waktu WITA (UTC+8, Asia/Makassar) format YYYY-MM-DD.
 * Jika parameter ref diberikan (Date | number | string), membentuk YYYY-MM-DD dari tanggal lokal tersebut.
 */
export function todayLocalISO(ref: Date | number | string = new Date()): string {
  try {
    const d = ref instanceof Date ? ref : new Date(ref);
    if (isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch {
    const d = ref instanceof Date ? ref : new Date(ref);
    if (isNaN(d.getTime())) return '';
    const witaMs = d.getTime() + (8 * 60 + d.getTimezoneOffset()) * 60 * 1000;
    return new Date(witaMs).toISOString().slice(0, 10);
  }
}

/**
 * Menghitung selisih HARI KALENDER lokal (WITA) antara ref (default hari ini) dan dateStr (YYYY-MM-DD).
 * Hasil positif jika ref lebih baru dari dateStr (misalnya umur / waktu yang sudah berlalu).
 * Jika parameter ref diatur ke hari ini, dan dateStr adalah tanggal di masa depan, nilainya negatif.
 */
export function daysBetweenLocal(dateStr: string, ref: Date | string = new Date()): number {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const cleanDateStr = dateStr.trim().slice(0, 10);
  const refStr = typeof ref === 'string' ? ref.trim().slice(0, 10) : todayLocalISO(ref);
  const [y1, m1, d1] = refStr.split('-').map(Number);
  const [y2, m2, d2] = cleanDateStr.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;

  // Bandingkan secara absolut hari kalender di level UTC midnight
  const utcRef = Date.UTC(y1, m1 - 1, d1);
  const utcTarget = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utcRef - utcTarget) / (1000 * 60 * 60 * 24));
}

/**
 * Menghitung sisa hari kalender hingga tanggal target (targetDateStr - ref).
 * Positif jika tanggal target di masa depan, negatif jika sudah kedaluwarsa.
 */
export function daysUntilLocal(targetDateStr: string, ref: Date | string = new Date()): number {
  return -daysBetweenLocal(targetDateStr, ref);
}

/**
 * Comparator urutan entri log berdasarkan:
 * 1) Tanggal transaksi (dateIn / dateOut) MENURUN
 * 2) Waktu input (createdAt) MENURUN
 * 3) ID MENURUN
 */
export function compareLatestFirst<T extends { dateIn?: string; dateOut?: string; createdAt?: any; id: string }>(a: T, b: T): number {
  const dateA = a.dateIn || a.dateOut || '';
  const dateB = b.dateIn || b.dateOut || '';
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  const timeA = getTimeMs(a.createdAt);
  const timeB = getTimeMs(b.createdAt);
  if (timeA !== timeB) {
    return timeB - timeA;
  }
  return (b.id || '').localeCompare(a.id || '');
}

/**
 * Comparator urutan murni berdasarkan waktu input terakhir (createdAt menurun lalu id)
 */
export function compareCreatedAtFirst<T extends { createdAt?: any; id: string }>(a: T, b: T): number {
  const timeA = getTimeMs(a.createdAt);
  const timeB = getTimeMs(b.createdAt);
  if (timeA !== timeB) {
    return timeB - timeA;
  }
  return (b.id || '').localeCompare(a.id || '');
}
