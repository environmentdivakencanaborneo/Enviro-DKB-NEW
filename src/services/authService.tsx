/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebaseAuth';
import { UserProfile } from '../types';
import { canWrite } from './permissionService';
import { auditService } from './auditService';

export interface RegisterUserData {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  site: string;
  nik?: string;
  photoURL?: string;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  isNewUser: boolean;
  authError: string | null;
  hasWriteAuthority: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerUser: (data: RegisterUserData) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  registerProfile: (name: string, company: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to enforce timeouts on Firestore operations and prevent infinite loading
const withTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs = 8000,
  errorMsg = "Koneksi Firestore mengalami batas waktu. Periksa koneksi internet Anda."
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  // Safeguard: Force disable full screen loader after 8 seconds under any circumstance
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Loading safeguard timeout reached (8s). Disabling loading state.");
          return false;
        }
        return false;
      });
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const fetchUserProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      const userDoc = await withTimeout(
        getDoc(userRef),
        8000,
        "Gagal membaca data pengguna dari Firestore (timeout). Silakan coba lagi."
      );

      if (userDoc.exists()) {
        const data = userDoc.data() as any;
        
        const createdAtStr = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());
        const updatedAtStr = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString());

        const updatedProfile: UserProfile = {
          ...data,
          uid: firebaseUser.uid,
          name: data.fullName || data.displayName || data.name || firebaseUser.displayName || 'Pengguna',
          fullName: data.fullName || data.displayName || data.name || firebaseUser.displayName || 'Pengguna',
          displayName: data.displayName || data.fullName || data.name || firebaseUser.displayName || 'Pengguna',
          email: firebaseUser.email || data.email || '',
          photoURL: firebaseUser.photoURL || data.photoURL || '',
          role: data.role || 'User',
          status: data.status || (data.isApproved === true ? 'Active' : 'Pending'),
          isApproved: data.isApproved ?? (data.status === 'Active'),
          isActive: data.isActive ?? true,
          createdAt: createdAtStr,
          updatedAt: updatedAtStr
        };
        
        setProfile(updatedProfile);
        setIsNewUser(false);
        setAuthError(null);
        return updatedProfile;
      } else {
        // Document users/{uid} does NOT exist -> automatically create it
        const defaultFirestoreData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pengguna',
          fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pengguna',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pengguna',
          photoURL: firebaseUser.photoURL || '',
          company: 'PT Diva Kencana Borneo',
          phone: '',
          department: 'Umum',
          position: 'Staff',
          site: 'Main Site',
          status: 'Pending' as const,
          role: 'User',
          isApproved: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: new Date().toISOString(),
          loginCount: 1,
          approvedBy: null,
          approvedAt: null,
          isActive: true,
          deleted: false
        };

        await withTimeout(
          setDoc(userRef, defaultFirestoreData),
          8000,
          "Gagal membuat dokumen pengguna baru di Firestore (timeout)."
        );

        await auditService.createLog({
          collection: 'users',
          recordId: firebaseUser.uid,
          action: 'insert',
          details: `REGISTER_USER auto-created on auth check: ${firebaseUser.email}`
        }).catch(() => {});

        const defaultProfileState: UserProfile = {
          ...defaultFirestoreData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setProfile(defaultProfileState);
        setIsNewUser(false);
        setAuthError(null);
        return defaultProfileState;
      }
    } catch (error: any) {
      console.error("Error fetching/creating user profile in Firestore:", error);
      const errMsg = error?.message || "Gagal memuat profil pengguna dari Firestore.";
      setAuthError(errMsg);
      setProfile(null);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      try {
        await fetchUserProfile(auth.currentUser);
      } catch (e) {
        console.warn("refreshProfile failed:", e);
      }
    }
  };

  // Monitor Auth Changes
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (isMounted) setAuthError(null);

      try {
        if (firebaseUser) {
          if (isMounted) setUser(firebaseUser);
          await fetchUserProfile(firebaseUser);

          try {
            await firebaseUser.getIdToken(true);
            const storedToken = sessionStorage.getItem(`gat_${firebaseUser.uid}`);
            if (storedToken && isMounted) {
              setToken(storedToken);
            }
          } catch (e) {
            console.warn('Gagal memulihkan token Google:', e);
          }
        } else {
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setToken(null);
            setIsNewUser(false);
          }
        }
      } catch (error: any) {
        console.error("onAuthStateChanged error:", error);
        if (isMounted) {
          setAuthError(error?.message || "Gagal memverifikasi status autentikasi.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    
    try {
      setLoading(true);
      setAuthError(null);

      const result = await withTimeout(
        signInWithPopup(auth, provider),
        30000,
        "Proses masuk Google membutuhkan waktu terlalu lama atau dibatalkan."
      );

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || null;
      
      if (accessToken) {
        setToken(accessToken);
        if (result.user) {
          sessionStorage.setItem(`gat_${result.user.uid}`, accessToken);
        }
      }

      if (result.user) {
        setUser(result.user);
        const p = await fetchUserProfile(result.user);
        if (p && (p.status === 'Active' || p.isApproved)) {
          await updateDoc(doc(db, 'users', result.user.uid), {
            lastLogin: new Date().toISOString(),
            loginCount: (p.loginCount || 0) + 1
          }).catch(() => {});
          await auditService.createLog({
            collection: 'users',
            recordId: result.user.uid,
            action: 'update',
            details: `LOGIN: ${result.user.email}`
          }).catch(() => {});
        }
      }
    } catch (error: any) {
      console.error("Login Google failed:", error);
      const errorMsg = error?.message || "Gagal masuk menggunakan Akun Google.";
      setAuthError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const firebaseUser = cred.user;
      setUser(firebaseUser);
      const p = await fetchUserProfile(firebaseUser);

      if (p && (p.status === 'Active' || p.isApproved)) {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          lastLogin: new Date().toISOString(),
          loginCount: (p.loginCount || 0) + 1
        }).catch(() => {});
        await auditService.createLog({
          collection: 'users',
          recordId: firebaseUser.uid,
          action: 'update',
          details: `LOGIN: ${firebaseUser.email}`
        }).catch(() => {});
      }
    } catch (error: any) {
      console.error("Login email failed:", error);
      const errorMsg = error?.message || "Gagal masuk. Periksa email dan password.";
      setAuthError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (data: RegisterUserData) => {
    if (!data.password) {
      throw new Error("Password wajib diisi.");
    }

    try {
      setLoading(true);
      setAuthError(null);
      const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      const firebaseUser = cred.user;

      try {
        await updateProfile(firebaseUser, {
          displayName: data.fullName,
          photoURL: data.photoURL || undefined
        });
      } catch (profileErr: any) {
        console.warn("User profile update failed:", profileErr);
      }

      const userDocData = {
        uid: firebaseUser.uid,
        fullName: data.fullName,
        displayName: data.fullName,
        name: data.fullName,
        email: data.email.trim(),
        company: 'PT Diva Kencana Borneo',
        phone: data.phone || '',
        department: data.department || '',
        position: data.position || '',
        site: data.site || '',
        nik: data.nik || '',
        photoURL: data.photoURL || '',
        status: 'Pending' as const,
        role: 'User',
        isApproved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: null,
        loginCount: 0,
        approvedBy: null,
        approvedAt: null,
        isActive: true,
        deleted: false
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userDocData);

      await auditService.createLog({
        collection: 'users',
        recordId: firebaseUser.uid,
        action: 'insert',
        details: `REGISTER_USER: ${data.email} (${data.fullName} - ${data.department})`
      }).catch(e => console.warn('Audit log creation failed:', e));

      const localProfileState: UserProfile = {
        ...userDocData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setUser(firebaseUser);
      setProfile(localProfileState);
      setIsNewUser(false);
    } catch (error: any) {
      console.error("Registration failed in registerUser:", error);
      const errorMsg = error?.message || "Gagal melakukan pendaftaran akun.";
      setAuthError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      await sendPasswordResetEmail(auth, email.trim());
      await auditService.createLog({
        collection: 'users',
        recordId: email,
        action: 'update',
        details: `RESET_PASSWORD email sent to ${email}`
      }).catch(() => {});
    } catch (error: any) {
      console.error("Reset password failed:", error);
      const errorMsg = error?.message || "Gagal mengirimkan email reset password.";
      setAuthError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerProfile = async (name: string, company: string, role: string) => {
    if (!user) {
      throw new Error("No authenticated user found.");
    }

    const email = user.email || '';
    const userDocData = {
      uid: user.uid,
      fullName: name,
      name,
      email,
      company,
      role: 'Pending',
      status: 'Pending' as const,
      isApproved: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      deleted: false
    };

    try {
      setLoading(true);
      await setDoc(doc(db, 'users', user.uid), userDocData);

      const localProfileState: UserProfile = {
        ...userDocData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setProfile(localProfileState);
      setIsNewUser(false);
    } catch (error) {
      console.error("Failed to register user profile:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      if (user) {
        await auditService.createLog({
          collection: 'users',
          recordId: user.uid,
          action: 'update',
          details: `LOGOUT: ${user.email}`
        });
      }

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('coal_monitor') || key.includes('coal_pro'))) {
          localStorage.removeItem(key);
        }
      }

      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
      setToken(null);
      setIsNewUser(false);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasWriteAuthority = canWrite(profile);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      token,
      loading,
      isNewUser,
      authError,
      hasWriteAuthority,
      loginWithGoogle,
      loginWithEmail,
      registerUser,
      sendPasswordReset,
      registerProfile,
      logout,
      refreshProfile,
      clearAuthError
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
