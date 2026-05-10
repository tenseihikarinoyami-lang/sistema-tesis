"use client";

import React from 'react';
import { Logo } from './logo';
import { ShieldCheck, Mail, Globe, Code } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative z-10 px-8 py-24 bg-[#050816] border-t border-white/5">
      <div className="max-w-7xl mx-auto space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 items-start">
          <div className="space-y-8 col-span-1 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl">
                <Logo className="w-8 h-8" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-white tracking-tighter academic-text">OBELISCO</span>
                <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-accent">Thesis Forge</span>
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">
              Vanguardia tecnológica en investigación académica asistida por Inteligencia Artificial superior.
            </p>
            <div className="flex gap-4">
              <SocialIcon icon={<Mail size={18} />} />
              <SocialIcon icon={<Globe size={18} />} />
              <SocialIcon icon={<Code size={18} />} />
            </div>
          </div>

          <FooterColumn 
            title="Investigación" 
            links={["Método SIGA", "IA Academic", "Fuentes", "Normativas"]} 
          />
          <FooterColumn 
            title="Plataforma" 
            links={["Seguridad", "Privacidad", "Términos", "API Access"]} 
          />
          <FooterColumn 
            title="Institución" 
            links={["Sobre OBELISCO", "Proyectos", "Ética", "Contacto"]} 
          />
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">
            &copy; 2026 ThesisForge AI. Todos los derechos reservados.
          </p>
          
          <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
            <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em]">Diseñado por</span>
            <span className="text-primary font-black text-[12px] uppercase tracking-[0.3em] academic-text">OBELISCO</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                <ShieldCheck size={14} className="text-accent" /> Datos Encriptados
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <a href="#" className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-xl text-slate-400 hover:bg-primary hover:text-white hover:scale-110 transition-all border border-white/5">
      {icon}
    </a>
  );
}

function FooterColumn({ title, links }: { title: string, links: string[] }) {
  return (
    <div className="space-y-8">
      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">{title}</h4>
      <ul className="space-y-4">
        {links.map(link => (
          <li key={link}>
            <a href="#" className="text-sm font-bold text-slate-500 hover:text-white transition-colors">{link}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
