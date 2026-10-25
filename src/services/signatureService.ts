/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../utils/firebaseAuth';
import { UserSignature } from '../types';
import { triggerToast } from '../utils/errorHandler';

export const signatureService = {
  getUserSignature: async (uid: string): Promise<string | null> => {
    try {
      const snap = await getDoc(doc(db, 'signatures', uid));
      if (snap.exists()) {
        const data = snap.data() as UserSignature;
        return data.dataUrl || null;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `signatures/${uid}`);
      return null;
    }
  },

  saveUserSignature: async (uid: string, dataUrl: string): Promise<void> => {
    if (dataUrl.length > 80000) {
      throw new Error('Ukuran tanda tangan digital melebihi batas 60 KB.');
    }

    try {
      const payload: UserSignature = {
        uid,
        dataUrl,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'signatures', uid), payload);
      triggerToast('Tanda tangan digital berhasil disimpan', 'success');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `signatures/${uid}`);
      throw err;
    }
  },
};
