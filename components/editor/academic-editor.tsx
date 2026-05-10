"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, 
  Download, 
  Eye, 
  Maximize2, 
  FileCheck,
  MessageSquare,
  Search,
  History
} from "lucide-react";

export default function AcademicEditor({ title, content }: { title: string, content: any }) {
  const [isFocusMode, setIsFocusMode] = useState(false);

  return (
    <div className={`transition-all duration-500 ${isFocusMode ? 'fixed inset-0 z-50 bg-background p-12' : 'w-full'}`}>
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">
        {/* Toolbar */}
        <div className="glass-morphism p-3 rounded-2xl border border-white/20 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-500"
              title="Modo Focus"
            >
              <Maximize2 size={18} />
            </button>
            <div className="h-4 w-px bg-gray-200 mx-1"></div>
            <span className="text-xs font-bold text-primary truncate max-w-[200px]">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <ToolbarBtn icon={<History size={18} />} label="Versiones" />
            <ToolbarBtn icon={<MessageSquare size={18} />} label="Comentarios" />
            <ToolbarBtn icon={<FileCheck size={18} />} label="Originalidad" />
            <div className="h-4 w-px bg-gray-200 mx-1"></div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md">
              <Download size={16} /> Exportar
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-grow glass-morphism rounded-3xl border border-white/20 shadow-2xl overflow-hidden flex flex-col">
          <div className="h-12 bg-white/50 border-b border-gray-100 flex items-center px-6 gap-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vista Previa Académica</span>
            <div className="flex items-center gap-2 ml-auto">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-gray-400 font-medium">Auto-guardado activo</span>
            </div>
          </div>

          <div className="flex-grow p-12 overflow-auto bg-[#FAFAF9] text-[#1a1a1a] selection:bg-accent/30">
            <article className="max-w-2xl mx-auto space-y-8 academic-text">
              <header className="text-center space-y-4 mb-16">
                <h1 className="text-4xl font-bold tracking-tight leading-tight">{title}</h1>
                <div className="h-1 w-20 academic-gradient mx-auto rounded-full"></div>
                <p className="text-sm text-gray-400 uppercase tracking-[0.2em]">Borrador Generado por ThesisForge AI</p>
              </header>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary border-b border-primary/10 pb-2">Resumen</h2>
                <p className="text-lg leading-relaxed text-justify">
                  La presente investigación aborda la intersección entre los sistemas de inteligencia artificial y la producción de conocimiento académico en el siglo XXI. A través de un análisis fenomenológico, se examina cómo estas herramientas no solo optimizan los tiempos de redacción, sino que reconfiguran la estructura epistémica de la tesis tradicional...
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-2xl font-bold text-primary border-b border-primary/10 pb-2">1. Introducción</h2>
                <p className="text-lg leading-relaxed text-justify">
                  En el contexto actual, la aceleración tecnológica ha permeado todas las esferas de la actividad humana. El ámbito académico no es la excepción. No obstante, surge la interrogante sobre la autenticidad y el rigor cuando se integran sistemas automatizados en la síntesis de información compleja (García, 2023)...
                </p>
                <p className="text-lg leading-relaxed text-justify">
                  Los hallazgos preliminares sugieren que la co-creación entre el investigador humano y la IA produce resultados de una densidad argumental superior, siempre que se mantenga un control ético y metodológico estricto sobre las fuentes citadas.
                </p>
              </section>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-500 group">
      {icon}
      <span className="text-xs font-medium hidden lg:block group-hover:text-primary">{label}</span>
    </button>
  );
}
