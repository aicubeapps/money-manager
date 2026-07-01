import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import type { User as AppUser } from '../types';
import { seedDefaultCategories } from '../services/categoryService';

interface AuthContextType {
  currentUser: User | null;
  userData: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUserData = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      // New user – create document and seed default categories
      const now = new Date();
      const newUser: AppUser = {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName!,
        photoURL: user.photoURL || undefined,
        createdAt: now,
        updatedAt: now,
      };
      // Store Timestamps in Firestore so SettingsPage can read them correctly
      await setDoc(userRef, {
        ...newUser,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });
      // Seed default categories
      await seedDefaultCategories(user.uid);
      setUserData(newUser);
    } else {
      setUserData(docSnap.data() as AppUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncUserData(user);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    currentUser,
    userData,
    loading,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};