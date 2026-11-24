/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { logger } from './logger';
import { triggerToast } from './errorHandler';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);

// Cloud Functions Gen 2 client instance (region dikonfigurasi via env/config bila berbeda dari default)
const functionsRegion =
  ((import.meta as any).env?.VITE_FIREBASE_FUNCTIONS_REGION as string | undefined)?.trim() ||
  ((firebaseConfig as any).functionsRegion as string | undefined)?.trim() ||
  '';
export const functions = functionsRegion ? getFunctions(app, functionsRegion) : getFunctions(app);

// Firebase App Check (T-08): aktif hanya jika recaptchaSiteKey telah dikonfigurasi
const envRecaptchaKey =
  ((import.meta as any).env?.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY as string | undefined)?.trim() || '';
const configRecaptchaKey = ((firebaseConfig as any).recaptchaSiteKey as string | undefined)?.trim() || '';
const recaptchaSiteKey = envRecaptchaKey || configRecaptchaKey;

export const isAppCheckConfigured = recaptchaSiteKey.length > 0;

if (typeof window !== 'undefined') {
  if (recaptchaSiteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      logger.warn('Gagal menginisialisasi Firebase App Check:', err);
    }
  } else {
    logger.warn(
      '[T-08] Firebase App Check belum aktif: recaptchaSiteKey pada firebase-applet-config.json / VITE_RECAPTCHA_ENTERPRISE_SITE_KEY masih kosong. Aplikasi tetap berjalan, namun callable function dengan enforceAppCheck akan memerlukan App Check di produksi.'
    );
  }
}

// --- Firestore Hardened Error Handlers ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  logger.error('Firestore Error:', errInfo);

  const errString = error instanceof Error ? error.message : String(error);
  const moduleName = path || 'data';
  const isPermissionDenied =
    errString.includes('permission-denied') ||
    errString.includes('permission_denied') ||
    errString.includes('Missing or insufficient permissions');

  const userMessage = isPermissionDenied
    ? `Akses ditolak pada modul [${moduleName}]. Peran akun Anda belum berwenang atau akun belum disetujui administrator.`
    : `Terjadi gangguan koneksi data pada modul [${moduleName}].`;

  triggerToast(userMessage, 'error');
}
