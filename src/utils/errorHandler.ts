/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interface untuk struktur data notifikasi sistem (Toast)
 */
export interface ToastPayload {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Memicu event kustom untuk menampilkan toast notification secara global di aplikasi
 */
export function triggerToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'error') {
  const event = new CustomEvent('coal_monitor_toast', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
}

/**
 * Helper global untuk memetakan error teknis (Firebase, Firestore, Zod-Validasi, Jaringan)
 * ke pesan ramah pengguna (user-friendly) dalam Bahasa Indonesia.
 */
export function handleGlobalError(error: unknown, contextDesc?: string): string {
  console.error(`[Global Error Handler] Context: ${contextDesc || 'General'} | Details:`, error);

  let userFriendlyMsg = 'Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.';

  if (error instanceof Error) {
    const msg = error.message;

    // 1. Pengecekan Hak Akses (Firebase Permission Denied)
    if (
      msg.includes('Missing or insufficient permissions') || 
      msg.includes('permission-denied') || 
      msg.includes('insufficient permissions')
    ) {
      userFriendlyMsg = 'Akses ditolak. Peran/akun Anda tidak memiliki wewenang untuk melakukan operasi ini.';
    }
    // 2. Masalah Jaringan / Offline Mode
    else if (
      msg.includes('offline') || 
      msg.includes('unavailable') || 
      msg.includes('network-request-failed') || 
      msg.includes('Failed to fetch')
    ) {
      userFriendlyMsg = 'Data gagal disimpan/diambil. Periksa koneksi internet Anda.';
    }
    // 3. Batas Quota Firebase Exceeded
    else if (
      msg.includes('quota') || 
      msg.includes('Quota exceeded') ||
      msg.includes('RESOURCE_EXHAUSTED')
    ) {
      userFriendlyMsg = 'Batas kuota baca/tulis harian database terlampaui. Hubungi administrator proyek.';
    }
    // 4. Validasi Zod Gagal
    else if (msg.includes('Validasi gagal')) {
      userFriendlyMsg = msg;
    }
    // 5. Pengecekan Error Firebase Auth spesifik
    else if (msg.includes('auth/popup-closed-by-user')) {
      userFriendlyMsg = 'Masuk dibatalkan. Pop-up autentikasi ditutup sebelum selesai.';
    } else if (msg.includes('auth/cannot-show-popup-request')) {
      userFriendlyMsg = 'Gagal menampilkan jendela login Google. Mohon periksa pemblokir pop-up browser Anda.';
    }
    // 6. Fallback dengan konteks operasi
    else if (contextDesc) {
      userFriendlyMsg = `${contextDesc} gagal diproses. ${msg}`;
    } else {
      userFriendlyMsg = msg;
    }
  } else if (typeof error === 'string') {
    userFriendlyMsg = error;
  }

  // Picu notifikasi visual kepada user
  triggerToast(userFriendlyMsg, 'error');

  return userFriendlyMsg;
}
