
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Client } from '@/types/firestore';
import { getClientsFS } from '@/lib/firebase/firestoreService';
import { auth } from '@/lib/firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser
} from 'firebase/auth';

const ADMIN_EMAIL_FOR_CLIENT_AREA_CHECK = "admin@nailstudio.ai";

interface ClientAuthContextType {
  currentAuthUser: FirebaseUser | null;
  currentClient: Client | null;
  isClientAuthenticated: boolean;
  loginClient: (email?: string, password?: string) => Promise<{ success: boolean, error?: string }>;
  clientLogout: () => void;
  isLoadingClient: boolean;
  refreshCurrentClient: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

const PUBLIC_CLIENT_PATHS = ['/client/login', '/client/register', '/client/forgot-password'];

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [currentAuthUser, setCurrentAuthUser] = useState<FirebaseUser | null>(null);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [isClientAuthenticated, setIsClientAuthenticated] = useState(false);
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchClientProfileAndSetState = useCallback(async (fbUser: FirebaseUser | null) => {
    if (fbUser && fbUser.email) {
      if (fbUser.email.toLowerCase() === ADMIN_EMAIL_FOR_CLIENT_AREA_CHECK.toLowerCase()) {
        console.warn("[ClientAuthContext] Admin user detected during client authentication flow. Signing out from client area.");
        await signOut(auth); // This will trigger onAuthStateChanged again with user=null
        return; // Exit early, onAuthStateChanged will handle the null user state
      }
      try {
        const allClients = await getClientsFS();
        const matchedClient = allClients.find(c => c.email.toLowerCase() === fbUser.email!.toLowerCase());
        if (matchedClient) {
          setCurrentClient(matchedClient);
          setIsClientAuthenticated(true);
        } else {
          // Firebase user exists, but no matching Firestore profile.
          setCurrentClient(null);
          setIsClientAuthenticated(false); // Keep Firebase auth user, but app-level is not client-authenticated.
          
          // If they are on a protected client page without a profile, it's an issue, sign out Firebase user.
          if (!PUBLIC_CLIENT_PATHS.includes(pathname)) {
            console.warn(`[ClientAuthContext] No client profile for ${fbUser.email} on protected path ${pathname}. Signing out.`);
            await signOut(auth); // This will re-trigger onAuthStateChanged with user=null
            // No need to set states here, as onAuthStateChanged will handle the fbUser=null case.
            return; 
          }
          // If on a public path (like /register or /login), allow Firebase auth to persist
          // while app-level client auth is false. The registration/login flow will handle it.
        }
      } catch (error) {
        console.error("[ClientAuthContext] Error fetching client profile:", error);
        setCurrentClient(null);
        setIsClientAuthenticated(false);
      }
    } else { // No Firebase user
      setCurrentClient(null);
      setIsClientAuthenticated(false);
    }
    setIsLoadingClient(false);
  }, [pathname]); // Removed `auth` from dependencies as it's stable

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingClient(true); // Set loading true at the start of auth state change
      setCurrentAuthUser(user);
      await fetchClientProfileAndSetState(user);
      // setIsLoadingClient(false) is called at the end of fetchClientProfileAndSetState
    });
    return () => unsubscribe();
  }, [fetchClientProfileAndSetState]);

  const loginClient = useCallback(async (email?: string, password?: string): Promise<{ success: boolean, error?: string }> => {
    if (!email || !password) {
      return { success: false, error: "Email e senha são obrigatórios." };
    }
    if (email.toLowerCase() === ADMIN_EMAIL_FOR_CLIENT_AREA_CHECK.toLowerCase()) {
      return { success: false, error: "Administradores não podem acessar a área do cliente por este login." };
    }

    setIsLoadingClient(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting currentAuthUser & fetching client profile.
      // fetchClientProfileAndSetState will be called by onAuthStateChanged.
      // isLoadingClient will be set to false by fetchClientProfileAndSetState.
      return { success: true };
    } catch (error: any) {
      console.error("[ClientAuthContext] Firebase client login error:", error);
      let errorMessage = "Falha no login. Verifique suas credenciais.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "E-mail ou senha inválidos.";
      }
      setCurrentAuthUser(null); // Ensure auth user is cleared on login fail
      setCurrentClient(null);
      setIsClientAuthenticated(false);
      setIsLoadingClient(false); // Explicitly set loading false on error
      return { success: false, error: errorMessage };
    }
  }, []); // Removed `auth`

  const clientLogout = useCallback(async () => {
    setIsLoadingClient(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set currentAuthUser, currentClient to null and isClientAuthenticated to false.
      // It will also set isLoadingClient to false via fetchClientProfileAndSetState.
      // The redirect logic is in ClientAreaContent's useEffect.
    } catch (error) {
      console.error("[ClientAuthContext] Firebase client logout error:", error);
      setIsLoadingClient(false); // Ensure loading is false on error
    }
  }, []); // Removed `auth`

  const refreshCurrentClient = useCallback(async () => {
    const user = auth.currentUser; 
    setIsLoadingClient(true);
    setCurrentAuthUser(user); // Re-set currentAuthUser in case it's stale
    await fetchClientProfileAndSetState(user);
    // setIsLoadingClient(false) is called at the end of fetchClientProfileAndSetState
  }, [fetchClientProfileAndSetState]); // Removed `auth`

  return (
    <ClientAuthContext.Provider value={{ 
        currentAuthUser, 
        currentClient, 
        isClientAuthenticated, 
        loginClient, 
        clientLogout, 
        isLoadingClient, 
        refreshCurrentClient,
      }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
}
