"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Cuenta creada exitosamente');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Bienvenido de nuevo');
      }
      router.push('/dashboard');
    } catch (error: any) {
      const msg = error.message?.includes('user-not-found') 
        ? 'Usuario no encontrado' 
        : error.message?.includes('wrong-password') 
        ? 'Contraseña incorrecta'
        : error.message?.includes('email-already-in-use')
        ? 'El correo ya está registrado'
        : 'Error de autenticación';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm sm:max-w-md space-y-6 md:space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-white academic-text">OBELISCO</h1>
          <p className="text-gray-400 mt-1 md:mt-2 text-sm">Accede a tu cuenta académica</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="academic-input w-full mt-1.5 h-12 md:h-14 text-sm md:text-base"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="academic-input w-full mt-1.5 h-12 md:h-14 text-sm md:text-base"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="academic-btn-primary w-full py-3 md:py-4 text-sm md:text-base"
          >
            {loading ? 'Procesando...' : isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>

        <Link href="/" className="block text-center text-[10px] md:text-xs text-gray-500 hover:text-gray-400">
          ← Volver al inicio
        </Link>
      </motion.div>
    </div>
  );
}