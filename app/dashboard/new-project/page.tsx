"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Book, 
  ChevronRight, 
  ChevronLeft,
  Check,
  BrainCircuit,
  Building2,
  User,
  Users,
  CheckSquare,
  Globe,
  Code,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from '@/lib/api';


const steps = [
  { id: 'requisitos', title: 'Requisitos', icon: <Building2 size={20} /> },
  { id: 'estructura', title: 'Estructura', icon: <CheckSquare size={20} /> },
  { id: 'contenido', title: 'Contenido', icon: <Book size={20} /> },
  { id: 'revision', title: 'Revisión', icon: <BrainCircuit size={20} /> },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [formData, setFormData] = useState({
    university: '',
    faculty: '',
    program: '',
    level: 'Licenciatura / Grado',
    author: '',
    director: '',
    norm: 'APA 7',
    chapters: [
      'Capítulo I: Introducción',
      'Capítulo II: Marco Teórico',
      'Capítulo III: Metodología',
      'Capítulo IV: Resultados',
      'Capítulo V: Discusión',
      'Conclusiones y Referencias'
    ],
    title: '',
    description: '',
    keywords: '',
    language: 'Español',
    aiModel: 'groq',
    tone: 'Académico Formal'
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkBackend = async () => {
      setBackendStatus('checking');
      try {
        const response = await fetch(getApiUrl('/'), { signal: AbortSignal.timeout(5000) });
        if (response.ok) setBackendStatus('online');
        else setBackendStatus('offline');
      } catch (e) {
        setBackendStatus('offline');
      }
    };
    checkBackend();
  }, []);

  const validateStep = () => {
    const errors: string[] = [];
    if (currentStep === 0) {
      if (!formData.university) errors.push('Universidad');
      if (!formData.faculty) errors.push('Facultad');
      if (!formData.program) errors.push('Programa');
      if (!formData.author) errors.push('Autor');
      if (!formData.director) errors.push('Director');
    } else if (currentStep === 1) {
      if (!formData.norm) errors.push('Normativa');
      if (formData.chapters.length === 0) errors.push('Estructura (mínimo 1 capítulo)');
    } else if (currentStep === 2) {
      if (!formData.title) errors.push('Título');
      if (!formData.description) errors.push('Descripción');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    } else {
      toast.error(`Por favor completa los campos requeridos: ${validationErrors.join(', ')}`);
    }
  };
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    setValidationErrors([]);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    if (!validateStep()) {
      toast.error(`Faltan campos por completar en el paso final.`);
      setGenerating(false);
      return;
    }

    try {
      // 1. Generate Plan and create project
      toast.info("Iniciando Planificación...", { description: "El motor OBELISCO está diseñando la estructura." });
      const planResponse = await fetch('/api/thesis/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!planResponse.ok) throw new Error('Error al generar el plan estructural.');
      const { project_id, plan } = await planResponse.json();

      // 2. Generate Chapters Sequentially
      let prevContent = plan;
      const totalSteps = formData.chapters.length;

      for (let i = 0; i < formData.chapters.length; i++) {
        const chapter = formData.chapters[i];
        toast.info(`Generando: ${chapter}`, { 
          description: `Progreso: ${Math.round(((i + 1) / totalSteps) * 100)}%`,
          duration: 3000 
        });

        const chapterResponse = await fetch('/api/thesis/generate-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project_id,
            chapter: chapter,
            formData: formData,
            prevContent: prevContent
          }),
        });

        if (!chapterResponse.ok) {
          toast.error(`Error en capítulo: ${chapter}. El proceso continuará.`);
          continue;
        }

        const chapterData = await chapterResponse.json();
        prevContent = chapterData.content;
      }

      // 3. Finalize
      await fetch('/api/thesis/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project_id }),
      });

      toast.success("¡Investigación Completada!", {
        description: `Proyecto ID: ${project_id}. Todo el contenido ha sido generado exitosamente.`,
        duration: 8000,
      });
      router.push('/projects');
    } catch (error: any) {
      console.error("Error en la generación:", error);
      toast.error("Fallo Crítico", {
        description: error.message || "No se pudo completar la generación integrada en Vercel.",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight academic-text">Nueva Tesis Académica</h1>
        <p className="text-gray-400 mt-2">Sigue los pasos para configurar tu investigación con rigor profesional.</p>
        
        {backendStatus === 'offline' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center justify-center gap-4"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-black uppercase tracking-widest">
              <AlertCircle size={16} /> Motor OBELISCO Desconectado
            </div>
            <button 
              onClick={() => {
                const checkBackend = async () => {
                  setBackendStatus('checking');
                  try {
                    const response = await fetch(getApiUrl('/'), { signal: AbortSignal.timeout(3000) });
                    if (response.ok) setBackendStatus('online');
                    else setBackendStatus('offline');
                  } catch (e) {
                    setBackendStatus('offline');
                  }
                };
                checkBackend();
              }}
              className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Reintentar
            </button>
          </motion.div>
        )}
        {backendStatus === 'online' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-black uppercase tracking-widest"
          >
            <CheckCircle size={16} /> Motor OBELISCO en Línea
          </motion.div>
        )}
      </div>

      {/* Stepper */}
      <div className="flex justify-between mb-16 relative px-10">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200/50 -translate-y-1/2 z-0"></div>
        {steps.map((step, index) => (
          <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
            <motion.div 
              initial={false}
              animate={{ 
                backgroundColor: index <= currentStep ? '#1E3A8A' : '#FFFFFF',
                color: index <= currentStep ? '#FFFFFF' : '#94A3B8',
                scale: index === currentStep ? 1.2 : 1
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                index <= currentStep ? 'border-primary shadow-xl shadow-primary/20' : 'border-gray-200 bg-white'
              }`}
            >
              {index < currentStep ? <Check size={24} /> : step.icon}
            </motion.div>
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
              index <= currentStep ? 'text-accent' : 'text-gray-500'
            }`}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="glass academic-card min-h-[600px] flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {currentStep === 0 && <StepRequisitos key="step0" data={formData} onChange={updateField} />}
          {currentStep === 1 && <StepEstructura key="step1" data={formData} onChange={updateField} />}
          {currentStep === 2 && <StepContenido key="step2" data={formData} onChange={updateField} />}
          {currentStep === 3 && <StepRevision key="step3" data={formData} onChange={updateField} />}
        </AnimatePresence>

        <div className="mt-auto pt-10 flex justify-between items-center border-t border-gray-100">
          <button 
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all ${
              currentStep === 0 ? 'text-gray-700 pointer-events-none' : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            <ChevronLeft size={20} /> Anterior
          </button>
          
          <div className="text-xs text-gray-400 font-medium uppercase tracking-widest">
            Paso {currentStep + 1} de {steps.length}
          </div>

          {currentStep === steps.length - 1 ? (
            <button 
              onClick={handleGenerate}
              disabled={generating || backendStatus === 'offline'}
              className={`academic-btn-gold flex items-center gap-2 ${generating || backendStatus === 'offline' ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesando...
                </>
              ) : backendStatus === 'offline' ? (
                <>Motor Desconectado</>
              ) : (
                <>Generar Tesis ✨</>
              )}
            </button>
          ) : (
            <button 
              onClick={nextStep}
              className="academic-btn-primary flex items-center gap-2"
            >
              Siguiente <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepRequisitos({ data, onChange }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      <div>
        <h2 className="text-4xl font-black text-white mb-3 academic-text tracking-tighter">Parámetros Institucionales</h2>
        <p className="text-slate-400 text-sm font-medium">Define el ecosistema donde se validará tu investigación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <InputGroup 
          label="Universidad / Institución" 
          placeholder="Ej: Universidad Central de Venezuela" 
          required 
          value={data.university}
          onChange={(val: string) => onChange('university', val)}
        />
        <InputGroup 
          label="Facultad / Escuela" 
          placeholder="Ej: Facultad de Ciencias Jurídicas" 
          required 
          value={data.faculty}
          onChange={(val: string) => onChange('faculty', val)}
        />
        <InputGroup 
          label="Programa / Carrera" 
          placeholder="Ej: Derecho Internacional" 
          required 
          value={data.program}
          onChange={(val: string) => onChange('program', val)}
        />
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nivel Académico</label>
          <div className="relative">
            <select 
              value={data.level}
              onChange={(e) => onChange('level', e.target.value)}
              className="academic-input appearance-none bg-black/40 border-white/10 text-white h-16"
            >
              <option value="Licenciatura / Grado" className="bg-slate-900">Licenciatura / Grado</option>
              <option value="Maestría / Máster" className="bg-slate-900">Maestría / Máster</option>
              <option value="Doctorado (PhD)" className="bg-slate-900">Doctorado (PhD)</option>
              <option value="Especialización" className="bg-slate-900">Especialización</option>
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <ChevronRight size={18} className="rotate-90" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-10 border-t border-white/5">
        <h3 className="text-xl font-bold text-white mb-8 academic-text tracking-tight flex items-center gap-3">
           <User size={20} className="text-accent" /> Perfiles de Autoría
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <InputGroup 
            label="Nombre del Investigador" 
            placeholder="Nombre completo" 
            required 
            value={data.author}
            onChange={(val: string) => onChange('author', val)}
          />
          <InputGroup 
            label="Director / Tutor" 
            placeholder="Asesor académico" 
            required 
            value={data.director}
            onChange={(val: string) => onChange('director', val)}
          />
        </div>
      </div>
    </motion.div>
  );
}

function StepEstructura({ data, onChange }: any) {
  const norms = ['APA 7', 'IEEE', 'Vancouver', 'Chicago'];
  const chapters = [
    'Introducción',
    'Capítulo I: El Problema',
    'Capítulo II: Marco Teórico',
    'Capítulo III: Metodología',
    'Capítulo IV: Resultados',
    'Capítulo V: Conclusiones',
    'Anexos y Referencias'
  ];

  const toggleChapter = (chapter: string) => {
    const newChapters = data.chapters.includes(chapter)
      ? data.chapters.filter((c: string) => c !== chapter)
      : [...data.chapters, chapter];
    onChange('chapters', newChapters);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      <div>
        <h2 className="text-4xl font-black text-white mb-3 academic-text tracking-tighter">Arquitectura del Saber</h2>
        <p className="text-slate-400 text-sm font-medium">Configura la normativa y estructura lógica del documento.</p>
      </div>

      <div className="space-y-8">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Normativa de Citación</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {norms.map(norm => (
            <NormCard 
              key={norm}
              title={norm} 
              desc={norm === 'APA 7' ? 'Cs. Sociales' : norm === 'IEEE' ? 'Ingeniería' : norm === 'Vancouver' ? 'Medicina' : 'Humanidades'} 
              selected={data.norm === norm}
              onClick={() => onChange('norm', norm)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-8">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Estructura Modular</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chapters.map(chapter => (
            <ChapterItem 
              key={chapter}
              title={chapter} 
              checked={data.chapters.includes(chapter)}
              onClick={() => toggleChapter(chapter)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function StepContenido({ data, onChange }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      <div>
        <h2 className="text-4xl font-black text-white mb-3 academic-text tracking-tighter">Núcleo Temático</h2>
        <p className="text-slate-400 text-sm font-medium">Define el objeto de estudio y la base conceptual.</p>
      </div>

      <div className="space-y-10">
        <InputGroup 
          label="Título de la Investigación" 
          placeholder="Ej: El impacto de la inteligencia artificial en la soberanía digital del siglo XXI" 
          fullWidth 
          required 
          value={data.title}
          onChange={(val: string) => onChange('title', val)}
        />
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Descripción y Alcance</label>
          <textarea 
            placeholder="Describe el problema, los objetivos generales y la hipótesis de trabajo..."
            value={data.description}
            onChange={(e) => onChange('description', e.target.value)}
            className="academic-input h-48 bg-black/40 border-white/10 text-white p-8 resize-none focus:border-accent/50 transition-all"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <InputGroup 
            label="Conceptos Clave" 
            placeholder="ia, algoritmos, ética" 
            value={data.keywords}
            onChange={(val: string) => onChange('keywords', val)}
          />
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Idioma de Redacción</label>
            <div className="relative">
              <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <select 
                value={data.language}
                onChange={(e) => onChange('language', e.target.value)}
                className="academic-input pl-16 appearance-none bg-black/40 border-white/10 text-white h-16"
              >
                <option value="Español" className="bg-slate-900">Español (Castellano)</option>
                <option value="Inglés" className="bg-slate-900">Inglés (Academic English)</option>
                <option value="Portugués" className="bg-slate-900">Portugués</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StepRevision({ data, onChange }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      <div>
        <h2 className="text-4xl font-black text-white mb-3 academic-text tracking-tighter">Refinamiento Superior</h2>
        <p className="text-slate-400 text-sm font-medium">Ajustes finales para una autoría técnica impecable.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Procesador de IA</label>
            <select 
              value={data.aiModel}
              onChange={(e) => onChange('aiModel', e.target.value)}
              className="academic-input border-accent/30 text-accent font-black bg-accent/5 h-16"
            >
              <option value="gemini" className="bg-slate-900 text-white">Google Gemini 2.0 Flash</option>
              <option value="groq" className="bg-slate-900 text-white">Llama 3 70B (Ultra-Veloz)</option>
              <option value="openrouter" className="bg-slate-900 text-white">Claude 3 Haiku (OpenRouter)</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Tono Académico</label>
            <select 
              value={data.tone}
              onChange={(e) => onChange('tone', e.target.value)}
              className="academic-input bg-black/40 h-16"
            >
              <option value="Académico Formal" className="bg-slate-900">Académico Formal</option>
              <option value="Técnico Especializado" className="bg-slate-900">Técnico Especializado</option>
              <option value="Analítico Crítico" className="bg-slate-900">Analítico Crítico</option>
            </select>
          </div>
        </div>

        <div className="p-10 glass bg-primary/10 rounded-[3rem] border border-primary/20 space-y-8 shadow-2xl shadow-primary/10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
              <BrainCircuit size={32} />
            </div>
            <div>
              <h4 className="font-black text-xl text-white academic-text tracking-tight">Motor SIGA v2.0</h4>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Protocolo Activado</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">
            Se aplicará el **Sistema Inteligente de Generación Académica** para asegurar variabilidad léxica, coherencia transversal y rigor metodológico absoluto.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
             <div className="px-5 py-2.5 bg-black/40 rounded-2xl text-[10px] font-black text-accent border border-accent/20 uppercase tracking-widest flex items-center gap-3">
               <Check size={14} strokeWidth={4} /> Citas {data.norm}
             </div>
             <div className="px-5 py-2.5 bg-black/40 rounded-2xl text-[10px] font-black text-primary border border-primary/20 uppercase tracking-widest flex items-center gap-3">
               <Check size={14} strokeWidth={4} /> Anti-Detección IA
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InputGroup({ label, placeholder, required = false, fullWidth = false, icon = null, value, onChange }: any) {
  return (
    <div className={`space-y-3 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">
        {label} {required && <span className="text-accent">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>}
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`academic-input h-16 ${icon ? 'pl-16' : ''} transition-all font-medium`}
        />
      </div>
    </div>
  );
}

function NormCard({ title, desc, selected = false, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-10 rounded-[2.5rem] border-2 text-center cursor-pointer transition-all duration-500 relative overflow-hidden group ${
      selected 
        ? 'bg-primary text-white border-primary shadow-2xl shadow-primary/40 scale-105' 
        : 'bg-black/40 text-slate-400 border-white/5 hover:border-white/20 hover:bg-black/60'
    }`}>
      {selected && (
        <motion.div 
          layoutId="norm-bg"
          className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-20"
        />
      )}
      <div className="font-black text-3xl mb-2 relative z-10">{title}</div>
      <div className={`text-[9px] uppercase font-black tracking-[0.2em] relative z-10 ${selected ? 'text-white/80' : 'text-slate-600'}`}>
        {desc}
      </div>
    </div>
  );
}

function ChapterItem({ title, checked = false, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-6 p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 group ${
      checked 
        ? 'bg-white/5 border-accent/30 shadow-xl shadow-accent/5' 
        : 'bg-black/20 border-white/5 opacity-50 hover:opacity-80'
    }`}>
      <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-500 ${
        checked ? 'bg-accent border-accent text-white scale-110 shadow-lg shadow-accent/20' : 'bg-transparent border-slate-700'
      }`}>
        {checked && <Check size={20} strokeWidth={4} />}
      </div>
      <span className={`text-sm font-black uppercase tracking-wider transition-colors ${checked ? 'text-white' : 'text-slate-500'}`}>{title}</span>
    </div>
  );
}
