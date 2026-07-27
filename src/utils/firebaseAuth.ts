/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore 
} from 'firebase/firestore';
import { logger } from './logger';
import { triggerToast } from './errorHandler';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = (dbId && dbId !== '(default)') ? getFirestore(app, dbId) : getFirestore(app);

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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
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
