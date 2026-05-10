"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  role: string | null;
  status: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, status: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch role and status from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role ?? null);
            setStatus(userData.status ?? 'active');
          } else {
            // User exists in Auth but not Firestore — treat as standard researcher
            setRole('researcher');
            setStatus('active');
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole('researcher');
          setStatus('active');
        }
      } else {
        setUser(null);
        setRole(null);
        setStatus(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, status, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
