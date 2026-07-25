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
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebaseAuth';
import { UserProfile } from '../types';
import { UserProfileSchema } from '../utils/validation';

import { canWrite } from './permissionService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  isNewUser: boolean;
  hasWriteAuthority: boolean;
  loginWithGoogle: () => Promise<void>;
  registerProfile: (name: string, company: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Token hanya di-simpan di memory untuk keamanan (tidak di-persist storage)
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Load Profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setProfile(data);
            setIsNewUser(false);
          } else {
            // User authenticated with Google but has no Firestore profile doc yet
            setProfile(null);
            setIsNewUser(true);
          }
        } catch (error) {
          console.error("Error fetching user profile from Firestore:", error);
          setProfile(null);
        }

        // Coba ambil token OAuth dari credential provider jika ada
        try {
          await firebaseUser.getIdToken(true);
          const storedToken = sessionStorage.getItem(`gat_${firebaseUser.uid}`);
          if (storedToken) {
            setToken(storedToken);
          }
        } catch (e) {
          console.warn('Gagal memulihkan token Google:', e);
        }
      } else {
        setUser(null);
        setProfile(null);
        setToken(null);
        setIsNewUser(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || null;
      
      if (accessToken) {
        setToken(accessToken);
        if (result.user) {
          sessionStorage.setItem(`gat_${result.user.uid}`, accessToken);
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
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
    const newProfile: UserProfile = {
      name,
      email,
      company,
      role
    };

    // Validate using Zod schema
    const parseResult = UserProfileSchema.safeParse(newProfile);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || "Validasi gagal";
      throw new Error(firstError);
    }

    try {
      setLoading(true);
      
      // Save user profile to Firestore users/{uid}
      await setDoc(doc(db, 'users', user.uid), newProfile);
      
      setProfile(newProfile);
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
      
      // Bersihkan cache local storage agar data tidak berpindah ke pengguna lain
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
      hasWriteAuthority,
      loginWithGoogle,
      registerProfile,
      logout
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
