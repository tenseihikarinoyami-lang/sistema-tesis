"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/logo';
import { Mail, Lock, ShieldCheck, UserPlus, EyeOff, KeyRound, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        role: 'user',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      router.push('/');
    } catch (err: any) {
      setError('Error al crear la cuenta. Intente con otro correo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper flex items-center justify-center p-8 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-dot-pattern opacity-[0.03] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-emerald-500/5 blur-[150px] -z-10 rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="glass rounded-[3rem] p-12 md:p-20 space-y-12 shadow-2xl shadow-black/50 border-white/10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-black/40 backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-2xl shadow-accent/30 transform hover:-rotate-6 transition-transform border border-white/10">
              <Logo className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-white tracking-tighter academic-text">Crea tu Identidad</h1>
              <p className="text-slate-400 font-medium">Únete a la nueva era de investigación OBELISCO.</p>
            </div>
          </div>

          {/* Secure Form */}
          <form className="space-y-6" onSubmit={handleRegister}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3 text-sm"
              >
                <AlertCircle size={18} /> {error}
              </motion.div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Correo Institucional</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investigador@obelisco.ai"
                  className="input-premium pl-16 h-16"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nueva Clave Maestra</label>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-premium pl-16 h-16"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Confirmar Clave</label>
              <div className="relative">
                <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-premium pl-16 h-16"
                  required
                />
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className="btn-premium w-full flex items-center justify-center gap-4 text-xl py-5 h-20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : 'Registrar Investigador'} <UserPlus size={24} />
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="pt-10 border-t border-white/5 flex flex-col items-center gap-6">
            <p className="text-slate-500 text-sm font-medium">
              ¿Ya tienes cuenta? <Link href="/login" className="text-accent font-bold hover:text-white transition-colors">Ingresar al Sistema</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
