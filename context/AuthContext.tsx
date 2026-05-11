"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  role: string | null;
  status: string | null;
  expiresAt: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  status: null,
  expiresAt: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData.role ?? 'researcher';
            const userStatus = userData.status ?? 'active';
            const userExpiresAt = userData.expiresAt ?? null;

            // ── Check expiration ──
            if (userExpiresAt && new Date(userExpiresAt) < new Date()) {
              // Account expired → auto-disable and sign out
              try {
                await updateDoc(doc(db, "users", firebaseUser.uid), {
                  status: 'disabled',
                  updatedAt: new Date().toISOString(),
                });
              } catch (_) {}
              await signOut(auth);
              window.location.href = '/login?error=expired';
              return;
            }

            // ── Check disabled ──
            if (userStatus === 'disabled') {
              await signOut(auth);
              window.location.href = '/login?error=disabled';
              return;
            }

            setUser(firebaseUser);
            setRole(userRole);
            setStatus(userStatus);
            setExpiresAt(userExpiresAt);
          } else {
            // Auth user without Firestore doc — standard researcher
            setUser(firebaseUser);
            setRole('researcher');
            setStatus('active');
            setExpiresAt(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(firebaseUser);
          setRole('researcher');
          setStatus('active');
          setExpiresAt(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setStatus(null);
        setExpiresAt(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, status, expiresAt, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
