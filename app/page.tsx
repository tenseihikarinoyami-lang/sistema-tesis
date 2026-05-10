"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  GraduationCap, 
  FileText,
  MousePointer2,
  Lock,
  Search,
  CheckCircle,
  Globe
} from "lucide-react";
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { Footer } from '@/components/ui/footer';

export default function LandingPage() {
  return (
    <div className="page-wrapper flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-[#050816]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-2xl shadow-primary/20">
              <Logo className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-white tracking-tighter academic-text">OBELISCO</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-accent">Thesis Forge</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-10">
            <NavLink href="#features">Tecnología</NavLink>
            <NavLink href="#method">Método SIGA</NavLink>
            <div className="w-[1px] h-6 bg-white/10"></div>
            <Link href="/login" className="text-sm font-black text-white/60 hover:text-white transition-colors uppercase tracking-widest">
              Acceso
            </Link>
            <Link href="/new-project" className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">
              Empezar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-48 pb-32 px-8 flex flex-col items-center relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] -z-10 rounded-full"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl text-center space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
            <div className="w-2 h-2 bg-accent rounded-full shadow-[0_0_8px_#fbbf24]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">Inteligencia Académica Superior</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight leading-[1] academic-text">
            Forja tu éxito académico con <br />
            <span className="text-gradient-primary">precisión humana.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            La plataforma líder en generación de tesis de grado doctoral, utilizando el motor SIGA para un rigor intelectual indistinguible.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            <Link href="/new-project" className="btn-premium flex items-center gap-3 text-lg">
              Iniciar Proyecto <ArrowRight size={20} />
            </Link>
            <button className="flex items-center gap-3 px-8 py-4 font-bold text-slate-300 hover:text-white transition-all group">
              <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
                <MousePointer2 size={20} />
              </div>
              Ver Demostración
            </button>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <section id="features" className="mt-48 max-w-7xl w-full grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          <FeatureCard 
            icon={<ShieldCheck className="text-primary" size={32} />}
            title="Integridad Total"
            desc="Contenido 100% original, libre de patrones de IA y validado por algoritmos de detección avanzada."
          />
          <FeatureCard 
            icon={<Zap className="text-accent" size={32} />}
            title="Rigor Científico"
            desc="Cumplimiento absoluto de normativas internacionales como APA 7, Vancouver e IEEE."
          />
          <FeatureCard 
            icon={<GraduationCap className="text-blue-400" size={32} />}
            title="Nivel Doctoral"
            desc="Adaptación dinámica del discurso para igualar la profundidad analítica requerida en cada grado."
          />
        </section>

        {/* trust section */}
        <div className="mt-48 py-12 border-y border-white/5 w-full max-w-5xl flex flex-wrap justify-center gap-12 md:gap-24 opacity-30">
          <TrustItem icon={<Lock size={18} />} text="Cifrado Militar" />
          <TrustItem icon={<CheckCircle size={18} />} text="Fuentes Verificadas" />
          <TrustItem icon={<Search size={18} />} text="Cero Plagio" />
          <TrustItem icon={<Globe size={18} />} text="Estándar Global" />
        </div>
      </main>

      <Footer />
    </div>
  );
}

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <a href={href} className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em]">
      {children}
    </a>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="p-12 rounded-[2.5rem] glass glass-hover transition-all duration-500 text-left space-y-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
        {icon}
      </div>
      <h3 className="text-3xl font-bold text-white academic-text tracking-tight">{title}</h3>
      <p className="text-slate-400 leading-relaxed font-medium">
        {desc}
      </p>
    </motion.div>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-white">
      {icon}
      {text}
    </div>
  );
}
