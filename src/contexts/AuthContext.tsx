
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/config'; 
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  type User 
} from 'firebase/auth';
import { checkAdminStatusFS } from '@/lib/firebase/firestoreService'; // Import the new function

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  login: (email?: string, password?: string) => Promise<{success: boolean, error?: string}>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const adminStatus = await checkAdminStatusFS(user.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe(); 
  }, []);

  const login = useCallback(async (email?: string, password?: string): Promise<{success: boolean, error?: string}> => {
    if (!email || !password) {
      return { success: false, error: "Email e senha são obrigatórios." };
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // onAuthStateChanged will fetch admin status, but we can check here for immediate redirect decision
      const adminStatus = await checkAdminStatusFS(user.uid);
      setIsAdmin(adminStatus); // Set immediately for this session

      if (adminStatus) {
        router.push('/dashboard');
        return { success: true };
      } else {
        await signOut(auth); 
        return { success: false, error: "Acesso negado. Este usuário não é um administrador."};
      }
    } catch (error: any) {
      console.error("Firebase login error:", error);
      let errorMessage = "Falha no login. Verifique suas credenciais.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "E-mail ou senha inválidos.";
      }
      setIsLoading(false); // Only set loading to false on error here, onAuthStateChanged handles success
      return { success: false, error: errorMessage };
    }
    // setIsLoading(false) will be managed by onAuthStateChanged primarily
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Firebase logout error:", error);
    } finally {
      setIsLoading(false); // Ensure loading is false after logout attempt
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, login, logout, isLoading }}>
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
