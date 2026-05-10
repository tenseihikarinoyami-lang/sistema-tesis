"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/logo';
import { Mail, Lock, ShieldCheck, ArrowRight, EyeOff, KeyRound, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const disabledError = searchParams?.get('error') === 'disabled';

  useEffect(() => {
    if (disabledError) {
      setError("Tu cuenta ha sido inhabilitada por el administrador central.");
    }
  }, [disabledError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const loginEmail = email === 'admin' ? 'admin@obelisco.ai' : email;
      await signInWithEmailAndPassword(auth, loginEmail, password);
      router.push('/');
    } catch (err: any) {
      setError('Credenciales inválidas o error de conexión.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper flex items-center justify-center p-8 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-dot-pattern opacity-[0.03] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/10 blur-[150px] -z-10 rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="glass rounded-[3rem] p-12 md:p-20 space-y-12 shadow-2xl shadow-black/50 border-white/10">
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-black/40 backdrop-blur-xl rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30 transform hover:rotate-6 transition-transform border border-white/10">
              <Logo className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-white tracking-tighter academic-text">Forja tu Acceso</h1>
              <p className="text-slate-400 font-medium">Ingresa a la infraestructura de investigación OBELISCO.</p>
            </div>
          </div>

          {/* Secure Form */}
          <form className="space-y-8" onSubmit={handleLogin}>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">ID de Investigador</label>
              <div className="relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@obelisco.ai"
                  className="input-premium pl-16 h-16"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Clave Maestra</label>
                <a href="#" className="text-[10px] font-bold text-primary hover:text-accent transition-colors uppercase tracking-widest">Recuperar</a>
              </div>
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
                <button type="button" className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  <EyeOff size={18} />
                </button>
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className="btn-premium w-full flex items-center justify-center gap-4 text-xl py-5 h-20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verificando...' : 'Verificar Identidad'} <KeyRound size={24} />
              </button>
            </div>
          </form>

          {/* Security Banner */}
          <div className="pt-10 border-t border-white/5 flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <ShieldCheck size={16} className="text-accent" /> Protocolo de Cifrado SIGA Activo
            </div>
            
            <p className="text-slate-500 text-sm font-medium">
              ¿Sin acceso? <Link href="/register" className="text-primary font-bold hover:text-accent transition-colors">Solicitar Credenciales</Link>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center opacity-30">
          <p className="text-[10px] text-white uppercase tracking-[0.5em] font-black">
            PROPIEDAD DE OBELISCO LABS &copy; 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}
