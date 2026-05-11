'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Award, 
  Edit3,
  CheckCircle2,
  Lock,
  Camera
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, role } = useAuth();

  const stats = [
    { label: "Tesis Generadas", value: "12", icon: <Award className="text-accent" /> },
    { label: "Nivel Académico", value: "Doctorado", icon: <Shield className="text-primary" /> },
    { label: "Miembro Desde", value: "2024", icon: <Calendar className="text-purple-500" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      {/* Header Profile Section */}
      <div className="relative">
        <div className="h-48 w-full bg-gradient-to-r from-primary/20 via-purple-600/20 to-accent/20 rounded-[40px] border border-white/5 overflow-hidden">
          <div className="absolute inset-0 bg-mesh opacity-30"></div>
        </div>
        
        <div className="px-12 -mt-20 flex flex-col md:flex-row items-end gap-8">
          <div className="relative group">
            <div className="w-40 h-40 rounded-[40px] bg-gradient-to-br from-primary to-accent p-1 shadow-2xl">
              <div className="w-full h-full bg-[#0A0A0A] rounded-[38px] flex items-center justify-center overflow-hidden">
                <span className="text-6xl font-black text-white academic-text">
                  {user?.email?.[0].toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            <button className="absolute bottom-2 right-2 p-3 bg-white text-black rounded-2xl shadow-xl hover:scale-110 transition-transform">
              <Camera size={20} />
            </button>
          </div>
          
          <div className="flex-grow pb-4">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-white academic-text tracking-tighter">
                {user?.displayName || user?.email?.split('@')[0] || 'Investigador'}
              </h1>
              <div className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-black text-accent uppercase tracking-widest">
                {role === 'admin' ? 'Administrador' : 'Investigador Premium'}
              </div>
            </div>
            <p className="text-gray-400 flex items-center gap-2 font-medium">
              <Mail size={16} className="text-primary" />
              {user?.email}
            </p>
          </div>
          
          <div className="pb-4">
            <button className="academic-btn-gold flex items-center gap-2 px-8">
              <Edit3 size={18} /> Editar Perfil
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass academic-card p-8 flex items-center gap-6"
          >
            <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
              {React.cloneElement(stat.icon as React.ReactElement<{ size?: number }>, { size: 24 })}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Account Details */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass academic-card p-10 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                <User size={24} className="text-primary" />
                Información Personal
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Nombre Completo</label>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold">
                  {user?.displayName || 'No especificado'}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Correo Electrónico</label>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold flex items-center justify-between">
                  {user?.email}
                  <CheckCircle2 size={16} className="text-accent" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Institución Principal</label>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold">
                  Universidad Central de Venezuela
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Especialidad</label>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-white font-bold">
                  Ciencias de la Computación
                </div>
              </div>
            </div>
          </div>

          <div className="glass academic-card p-10 space-y-8">
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <Lock size={24} className="text-accent" />
              Seguridad
            </h2>
            <div className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 group hover:border-accent/30 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl">
                  <Lock size={20} className="text-gray-400 group-hover:text-accent transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-white">Contraseña</p>
                  <p className="text-xs text-gray-500 font-medium">Actualizada hace 3 meses</p>
                </div>
              </div>
              <button className="text-xs font-black uppercase tracking-widest text-accent hover:underline">Cambiar</button>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-8">
          <div className="glass academic-card p-8 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <h3 className="text-lg font-black text-white mb-6 academic-text">Plan Actual</h3>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/10 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Enterprise AI</span>
                <span className="px-3 py-1 bg-accent text-black text-[10px] font-black rounded-full uppercase">Activo</span>
              </div>
              <p className="text-3xl font-black text-white mb-1 tracking-tighter">$99<span className="text-sm text-gray-500 font-bold tracking-normal">/mes</span></p>
              <p className="text-xs text-gray-400 font-medium">Próxima facturación: 15 Jun 2024</p>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-xs font-bold text-gray-300">
                <CheckCircle2 size={16} className="text-accent" /> Tesis ilimitadas
              </li>
              <li className="flex items-center gap-3 text-xs font-bold text-gray-300">
                <CheckCircle2 size={16} className="text-accent" /> Acceso a GPT-4 Turbo
              </li>
              <li className="flex items-center gap-3 text-xs font-bold text-gray-300">
                <CheckCircle2 size={16} className="text-accent" /> Soporte prioritario 24/7
              </li>
            </ul>
            <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
              Gestionar Suscripción
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
