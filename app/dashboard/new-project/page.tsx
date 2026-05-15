'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────
interface FormData {
  title: string;
  university: string;
  author: string;
  program: string;
  level: string;
  description: string;
  chapters: string[];
  norm: string;
  tone: string;
  aiModel: string;
  language: string;
  estimatedPages: number;
}

type SubStep = 'idle' | 'unified' | 'research' | 'write' | 'audit' | 'humanize' | 'visuals' | 'done';

interface ChapterStatus {
  name: string;
  status: 'pending' | 'generating' | 'researching' | 'writing' | 'auditing' | 'humanizing' | 'done' | 'error';
  subStep: SubStep;
  error?: string;
  retries: number;
  isSection?: boolean;
}

// ─── Constantes ───────────────────────────────────────────────
const DEFAULT_CHAPTERS = [
  'Introducción',
  'Marco Teórico',
  'Marco Metodológico',
  'Análisis de Resultados',
  'Conclusiones y Recomendaciones',
];

const LEVELS = ['TEG', 'Pregrado', 'Maestría', 'Doctorado'];
const NORMS = ['APA 7', 'IEEE', 'Vancouver', 'Chicago'];
const TONES = ['Académico formal', 'Técnico-científico', 'Descriptivo', 'Analítico'];
const AI_MODELS = [
  { value: 'groq', label: '⚡ Groq (Llama 3) — Recomendado (Evita bloqueos de Vercel)' },
  { value: 'openrouter', label: '🤖 OpenRouter (Varios modelos) — Puede dar Timeout' },
  { value: 'gemini', label: '🔵 Google Gemini — Rápido pero con límites diarios' },
];

const MAX_RETRIES_PER_STEP = 100; // Resistencia extrema para generación autónoma
const STEP_TIMEOUT_MS = 110_000; // 110s (Vercel corta a 120s)
const RETRY_DELAY_MS = 10_000;    // 10s base entre reintentos

// ─── Helper: fetch con timeout propio ─────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`TIMEOUT: La solicitud tardó más de ${timeoutMs / 1000}s. El servidor está ocupado, reintentando…`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Helper: sleep ────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Helper: una llamada a la API con reintentos propios ──────
async function callApiWithRetry(
  url: string,
  body: Record<string, unknown>,
  stepName: string,
  maxRetries = MAX_RETRIES_PER_STEP
): Promise<Record<string, unknown>> {
  let lastErr = '';
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Manejo de errores 429 y 503 (Sobrecapacidad)
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        const waitMs = 60000; // 60s de espera
        toast.info(`⏳ Red saturada (${attempt}/${maxRetries})`, { 
          description: `Esperando ${Math.round(waitMs/1000)}s para continuar automáticamente...`,
          duration: waitMs 
        });
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg = (data.error as string) || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      return await res.json();
    } catch (err: any) {
      lastErr = err.message || String(err);
      console.warn(`[Retry] ${stepName} intento ${attempt} falló:`, lastErr);
      
      const lastErrLower = lastErr.toLowerCase();
      const isQuota = lastErrLower.includes('cuota') || 
                      lastErrLower.includes('429') || 
                      lastErrLower.includes('limit') ||
                      lastErrLower.includes('límite') ||
                      lastErrLower.includes('agotada') ||
                      lastErrLower.includes('alcanzado') ||
                      lastErrLower.includes('exhausted') ||
                      lastErrLower.includes('overloaded') ||
                      lastErrLower.includes('saturada') ||
                      lastErrLower.includes('solicitudes');

      if (attempt < maxRetries) {
        const waitSec = isQuota ? 90 : Math.min(60, 15 + (attempt * 10));
        toast.warning(`⚠️ [${attempt}/${maxRetries}] ${stepName}: Reintentando en ${waitSec}s...`, { 
          description: lastErr.substring(0, 80),
          duration: waitSec * 1000 
        });
        await sleep(waitSec * 1000);
      } else {
        throw new Error(`${stepName} falló tras ${maxRetries} intentos: ${lastErr}`);
      }
    }
  }
  throw new Error(`${stepName} falló tras ${maxRetries} intentos: ${lastErr}`);
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [chapterStatuses, setChapterStatuses] = useState<ChapterStatus[]>([]);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    university: '',
    author: '',
    program: '',
    level: 'TEG',
    description: '',
    chapters: [...DEFAULT_CHAPTERS],
    norm: 'APA 7',
    tone: 'Académico formal',
    aiModel: 'groq',
    language: 'es',
    estimatedPages: 50,
  });

  const [projectId, setProjectId] = useState<string>('');

  // Generar ID único una sola vez al cargar o recuperar del localStorage
  const [existingProject, setExistingProject] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('active_thesis_project_id');
    if (savedId) {
      setProjectId(savedId);
      // Verificar si el proyecto existe en el servidor para ofrecer reanudar
      fetch(`/api/thesis/resume?projectId=${savedId}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data?.title) {
            setExistingProject({ id: savedId, title: res.data.title });
          }
        })
        .catch(err => console.error("Error al verificar proyecto previo:", err));
    } else {
      const newId = `proj_${Math.floor(Math.random() * 90000) + 10000}`;
      setProjectId(newId);
      localStorage.setItem('active_thesis_project_id', newId);
    }
  }, []);

  // Sincronizar nombre del autor con el usuario logueado
  useEffect(() => {
    if (user?.displayName && !formData.author) {
      setFormData(p => ({ ...p, author: user.displayName! }));
    }
  }, [user, formData.author]);

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(p => ({ ...p, [key]: value }));
  }, []);

  const updateChapterStatus = useCallback((idx: number, patch: Partial<ChapterStatus>) => {
    setChapterStatuses(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }, []);

  // ── Validación por paso ────────────────────────────────────
  const getStepErrors = (s: number): string[] => {
    if (s === 1) {
      const errs: string[] = [];
      if (!formData.title.trim()) errs.push('Título requerido');
      if (!formData.university.trim()) errs.push('Universidad requerida');
      if (!formData.author.trim()) errs.push('Autor requerido');
      return errs;
    }
    if (s === 2) {
      if (!formData.program.trim()) return ['Programa requerido'];
    }
    return [];
  };

  // ── Generación principal ───────────────────────────────────
  // ── Generación principal ───────────────────────────────────
  const handleGenerate = async (isResume = false) => {
    const errors = getStepErrors(2);
    if (errors.length > 0 && !isResume) {
      toast.error('Faltan campos: ' + errors.join(', '));
      return;
    }

    setGenerating(true);
    setGlobalProgress(p => (p > 0 ? p : 2));

    try {
      // ── FASE 0: Verificar/Recuperar estado ──
      toast.info('🔍 Sincronizando con el servidor...', { duration: 3000 });
      const resumeRes = await fetch(`/api/thesis/resume?projectId=${projectId}`).then(r => r.json()).catch(() => ({}));
      let existingData = resumeRes.success ? resumeRes.data : null;
      
      if (existingData && !isResume) {
        // Si no venimos de un clic en "Reanudar" pero hay datos, preguntamos internamente o simplemente seguimos
        console.log("Datos encontrados en el servidor. Sincronizando...");
      }
      
      // Sincronizar formData si es un resume
      if (existingData?.formData) {
        setFormData(prev => ({ ...prev, ...existingData.formData }));
      }
      
      // ── FASE 1: Plan estructural ──────────────────────────
      let sections = [];
      let prevContent = "";

      if (existingData && existingData.steps?.plan === 'done') {
        sections = existingData.sections || [];
        prevContent = existingData.plan || "";
        console.log("Reanudando con plan existente:", sections.length, "secciones");
        toast.success(`📑 Reanudando: ${sections.length} secciones encontradas.`);
      } else {
        toast.info('📐 Planificando estructura de la tesis…', { duration: 8000 });
        const planData = await callApiWithRetry(
          '/api/thesis/plan',
          { ...formData, projectId, ownerId: user?.uid || 'anonymous' },
          'Planificación'
        );
        prevContent = planData.plan as string;
        sections = (planData.sections as any[]) || [];
        // Actualizar existingData localmente para que el bucle lo vea
        if (!existingData) existingData = { content: {}, research: {}, drafts: {}, audits: {}, steps: {} };
      }

      if (!sections || sections.length === 0) {
        throw new Error("No se pudo generar el plan estructural. Intenta con otro modelo de IA (ej. Groq).");
      }
      
      // ── FASE 2: Secciones Detalladas ──────────────────────
      const fullSections = [...sections, { title: "Referencias Bibliográficas", id: "ref" }];
      const totalSteps = fullSections.length;
      
      // Actualizar estados para mostrar secciones y marcar las completadas
      const initialStatuses = fullSections.map(s => {
        const sId = s.title.replace(/\./g, '_');
        const isDone = !!existingData?.content?.[sId];
        return {
          name: s.title,
          status: isDone ? 'done' as const : 'pending' as const,
          subStep: (isDone ? 'done' : 'idle') as SubStep,
          retries: 0,
          isSection: true
        };
      });
      setChapterStatuses(initialStatuses);

      // Calcular progreso inicial basado en secciones hechas
      const completedCount = initialStatuses.filter(s => s.status === 'done').length;
      const progressBaseStart = Math.round(8 + (completedCount / totalSteps) * 85);
      setGlobalProgress(progressBaseStart);

      for (let i = 0; i < totalSteps; i++) {
        const section = fullSections[i];
        const sectionTitle = section.title;
        const sectionId = sectionTitle.replace(/\./g, '_');
        const progressForThisSection = Math.round(8 + (i / totalSteps) * 85);

        // Si ya está terminado en el backup, saltar y actualizar prevContent
        if (existingData?.content?.[sectionId]) {
          console.log(`Section "${sectionTitle}" already exists in DB. Skipping...`);
          prevContent = existingData.content[sectionId];
          updateChapterStatus(i, { status: 'done' });
          continue;
        }

        // --- PASO 1: Research ---
        let research = existingData?.research?.[sectionId];
        if (!research) {
          updateChapterStatus(i, { status: 'generating', subStep: 'unified' });
          toast.info(`🚀 [${i + 1}/${totalSteps}] Generación Unificada: ${sectionTitle}`, { duration: 8000 });

          const resData = await callApiWithRetry(
            '/api/thesis/generate-chapter',
            { projectId, sectionTitle, formData, prevContent, step: 'unified' },
            `Generación de "${sectionTitle}"`
          );
          
          prevContent = resData.finalVersion as string;
        } else {
          console.log(`Section "${sectionTitle}" already exists in DB. Skipping...`);
          prevContent = existingData.content[sectionId];
        }

        updateChapterStatus(i, { status: 'done', subStep: 'done' });
        setGlobalProgress(progressForThisSection + 15);
        toast.success(`✅ Sección lista: ${sectionTitle.substring(0, 30)}...`, { duration: 3000 });

        // Pequeño respiro para evitar saturar APIs
        await sleep(1500);
      }

      // ── FASE 3: Finalización ──────────────────────────────
      setGlobalProgress(98);
      toast.info('🏁 Finalizando documento...', { duration: 5000 });
      await callApiWithRetry(
        '/api/thesis/finalize',
        { projectId },
        'Finalización'
      );

      setGlobalProgress(100);
      toast.success('🎓 ¡Tesis generada al 100%!', {
        description: 'Ya puedes revisar y descargar tu proyecto.',
        duration: 10000,
      });

      localStorage.removeItem('active_thesis_project_id');
      setTimeout(() => router.push('/dashboard/projects'), 2000);

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Generate] Error detectado:', msg);

      // Detección ultra-sensible de límites de cuota o saturación
      const msgLower = msg.toLowerCase();
      const isQuota = msgLower.includes('cuota') || 
                      msgLower.includes('429') || 
                      msgLower.includes('limit') ||
                      msgLower.includes('límite') ||
                      msgLower.includes('agotada') ||
                      msgLower.includes('alcanzado') ||
                      msgLower.includes('exhausted') ||
                      msgLower.includes('overloaded') ||
                      msgLower.includes('solicitudes') ||
                      msgLower.includes('rate') ||
                      msgLower.includes('quota') ||
                      msgLower.includes('saturada') ||
                      msgLower.includes('capacidad') ||
                      msg.includes('QUOTA_LIMIT_EXHAUSTED');

      if (isQuota) {
        const waitSec = 90; // Un poco más de tiempo para que se limpien los buckets de rate limit
        toast.info(`🔄 RECUPERACIÓN AUTÓNOMA ACTIVA`, {
          description: `Se detectó saturación en los proveedores de IA. El sistema OBELISCO esperará ${waitSec}s y continuará la tesis desde donde quedó. No es necesario que hagas nada.`,
          duration: waitSec * 1000,
        });
        
        // Auto-reintento persistente
        setTimeout(() => {
          console.log("Reanudando generación automáticamente tras límite de cuota...");
          handleGenerate(true);
        }, waitSec * 1000);
        
        return; 
      } else {
        // Error potencialmente transitorio (500, 503, etc)
        const isTransient = msg.includes('503') || msg.includes('500') || msg.includes('timeout') || msg.includes('fetch');
        
        if (isTransient) {
           const waitSec = 120;
           toast.warning(`⚠️ Error de red/servidor detectado.`, {
             description: `El servidor está bajo mucha carga. Reintentando automáticamente en ${waitSec}s...`,
             duration: waitSec * 1000
           });
           setTimeout(() => handleGenerate(true), waitSec * 1000);
           return;
        }

        // Error fatal real
        setChapterStatuses(prev => {
          const next = [...prev];
          const currentIdx = next.findIndex(s => s.status !== 'done' && s.status !== 'pending' && s.status !== 'error');
          if (currentIdx !== -1) {
            next[currentIdx].status = 'error';
            next[currentIdx].error = msg;
          }
          return next;
        });

        toast.error('❌ Proceso Interrumpido', {
          description: msg.substring(0, 150),
          duration: 30000,
          action: {
            label: 'Reanudar Manualmente',
            onClick: () => handleGenerate(true)
          }
        });
        setGenerating(false);
      }
    }
  };

  // ─── UI ───────────────────────────────────────────────────
  const statusIcon: Record<ChapterStatus['status'], string> = {
    generating: '🚀',
    researching: '🔬',
    writing: '✍️',
    auditing: '🔍',
    humanizing: '💎',
    done: '✅',
    error: '❌',
  };

  const statusLabel: Record<ChapterStatus['status'], string> = {
    pending: 'Pendiente',
    generating: 'Generando…',
    researching: 'Investigando…',
    writing: 'Redactando…',
    auditing: 'Auditando…',
    humanizing: 'Puliendo…',
    done: 'Completado',
    error: 'Error',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d0d14]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-white/50 hover:text-white transition-colors text-sm"
            disabled={generating}
          >
            ← Volver
          </button>
          <div className="w-px h-5 bg-white/20" />
          <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            OBELISCO — Nueva Investigación
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        
        {/* Aviso de Proyecto en Curso */}
        {existingProject && !generating && step === 1 && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl">
                ⏳
              </div>
              <div>
                <h3 className="text-lg font-bold text-purple-300">Proyecto en curso detectado</h3>
                <p className="text-sm text-white/60 italic">"{existingProject.title}"</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  localStorage.removeItem('active_thesis_project_id');
                  setExistingProject(null);
                  const newId = `proj_${Math.floor(Math.random() * 90000) + 10000}`;
                  setProjectId(newId);
                  localStorage.setItem('active_thesis_project_id', newId);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white transition-colors"
              >
                Descartar
              </button>
              <PrimaryButton onClick={() => handleGenerate(true)}>
                Reanudar →
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Progreso global */}
        {generating && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">Progreso de Generación</span>
              <span className="text-2xl font-bold text-purple-400">{globalProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${globalProgress}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
                }}
              />
            </div>
            {chapterStatuses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {chapterStatuses.map((cs, idx) => {
                  const PIPELINE: { key: SubStep; icon: string; label: string }[] = [
                    { key: 'unified',   icon: '🚀', label: 'Unificado' },
                    { key: 'research',  icon: '🔬', label: 'Investigar' },
                    { key: 'write',     icon: '✍️', label: 'Redactar'  },
                    { key: 'audit',     icon: '🛡️', label: 'Auditar'   },
                    { key: 'humanize',  icon: '💎', label: 'Pulir'     },
                    { key: 'visuals',   icon: '🎨', label: 'Visuales'  },
                  ];
                  const pipelineOrder: SubStep[] = ['unified', 'research','write','audit','humanize','visuals'];
                  const activeIdx = pipelineOrder.indexOf(cs.subStep);
                  const isActive = cs.status !== 'pending' && cs.status !== 'done' && cs.status !== 'error';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col gap-1.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        cs.status === 'done'    ? 'bg-green-500/10 border border-green-500/20' :
                        cs.status === 'error'   ? 'bg-red-500/10 border border-red-500/20' :
                        cs.status === 'pending' ? 'bg-white/5 border border-white/10' :
                        'bg-purple-500/10 border border-purple-500/30 shadow-lg shadow-purple-900/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base shrink-0">{statusIcon[cs.status]}</span>
                        <p className="truncate text-white/90 font-medium flex-1">{cs.name}</p>
                        {cs.status !== 'pending' && cs.status !== 'done' && cs.status !== 'error' && (
                          <span className="text-xs text-purple-400 font-mono animate-pulse shrink-0">
                            {PIPELINE.find(p => p.key === cs.subStep)?.label ?? '…'}
                          </span>
                        )}
                      </div>
                      {/* 5-step mini pipeline — only shown while active or on error */}
                      {(isActive || cs.status === 'error') && (
                        <div className="flex items-center gap-1 pt-0.5">
                          {PIPELINE.map((p, pi) => {
                            const isPast    = activeIdx > pi;
                            const isCurrent = activeIdx === pi;
                            return (
                              <div key={p.key} className="flex items-center gap-1 flex-1">
                                <div
                                  title={p.label}
                                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                                    isPast    ? 'bg-green-500' :
                                    isCurrent ? 'bg-purple-400 animate-pulse' :
                                    'bg-white/10'
                                  }`}
                                />
                                {pi < PIPELINE.length - 1 && (
                                  <div className="w-0.5 h-0.5 rounded-full bg-white/20" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {cs.status === 'done' && (
                        <div className="flex gap-1">
                          {PIPELINE.map(p => (
                            <div key={p.key} className="h-1 flex-1 rounded-full bg-green-500/50" />
                          ))}
                        </div>
                      )}
                      {cs.error && (
                        <p className="text-xs text-red-400 truncate" title={cs.error}>{cs.error.substring(0,60)}…</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Paso 1 */}
        {step === 1 && (
          <div className="space-y-6">
            <SectionTitle number={1} title="Información General" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Título de la Investigación *" span="full">
                <textarea
                  id="title"
                  rows={3}
                  value={formData.title}
                  onChange={e => updateField('title', e.target.value)}
                  placeholder="Ej: Impacto de la Inteligencia Artificial en la Educación Superior venezolana…"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Universidad / Institución *">
                <input
                  id="university"
                  value={formData.university}
                  onChange={e => updateField('university', e.target.value)}
                  placeholder="Ej: Universidad Central de Venezuela"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Autor / Investigador *">
                <input
                  id="author"
                  value={formData.author}
                  onChange={e => updateField('author', e.target.value)}
                  placeholder="Nombre completo"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Descripción del Problema" span="full">
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="Describe brevemente el problema o fenómeno a investigar…"
                  className={inputClass}
                />
              </FormField>

              {/* Extensión del Documento - Ahora en Paso 1 por petición del usuario */}
              <FormField label="Extensión del Documento" span="full">
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-purple-300">Páginas Estimadas</p>
                      <p className="text-xs text-white/50">Determina la profundidad y detalle de cada sección.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        id="estimatedPages"
                        type="number"
                        min="10"
                        max="250"
                        value={formData.estimatedPages}
                        onChange={e => updateField('estimatedPages', parseInt(e.target.value) || 50)}
                        className="w-20 bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-center text-lg font-bold text-purple-400 focus:outline-none focus:border-purple-500"
                      />
                      <span className="text-sm text-white/40">págs.</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[30, 50, 80, 120].map(val => (
                      <button
                        key={val}
                        onClick={() => updateField('estimatedPages', val)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                          formData.estimatedPages === val 
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {val} pág.
                      </button>
                    ))}
                  </div>
                </div>
              </FormField>
            </div>

            <div className="flex justify-end pt-2">
              <PrimaryButton
                onClick={() => {
                  const errs = getStepErrors(1);
                  if (errs.length) { toast.error(errs.join('. ')); return; }
                  setStep(2);
                }}
              >
                Continuar →
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Paso 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <SectionTitle number={2} title="Configuración Académica" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Programa / Carrera *">
                <input
                  id="program"
                  value={formData.program}
                  onChange={e => updateField('program', e.target.value)}
                  placeholder="Ej: Ingeniería Informática"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Nivel Académico">
                <SelectField
                  id="level"
                  value={formData.level}
                  options={LEVELS}
                  onChange={v => updateField('level', v)}
                />
              </FormField>
              <FormField label="Norma de Citación">
                <SelectField
                  id="norm"
                  value={formData.norm}
                  options={NORMS}
                  onChange={v => updateField('norm', v)}
                />
              </FormField>
              <FormField label="Tono del Texto">
                <SelectField
                  id="tone"
                  value={formData.tone}
                  options={TONES}
                  onChange={v => updateField('tone', v)}
                />
              </FormField>

              <FormField label="Proveedor de IA" span="full">
                <select
                  id="aiModel"
                  value={formData.aiModel}
                  onChange={e => updateField('aiModel', e.target.value)}
                  className={inputClass}
                >
                  {AI_MODELS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            {/* Capítulos */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white/70">Capítulos a Generar</label>
              <div className="space-y-2">
                {formData.chapters.map((ch, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-white/30 text-sm w-6 shrink-0">{idx + 1}.</span>
                    <input
                      value={ch}
                      onChange={e => {
                        const next = [...formData.chapters];
                        next[idx] = e.target.value;
                        updateField('chapters', next);
                      }}
                      className={inputClass + ' flex-1'}
                    />
                    <button
                      onClick={() => updateField('chapters', formData.chapters.filter((_, i) => i !== idx))}
                      className="text-red-400/70 hover:text-red-400 text-sm px-2"
                      title="Eliminar capítulo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {formData.chapters.length < 8 && (
                <button
                  onClick={() => updateField('chapters', [...formData.chapters, 'Nuevo Capítulo'])}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  + Agregar capítulo
                </button>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="text-white/50 hover:text-white text-sm transition-colors">
                ← Atrás
              </button>
              <PrimaryButton
                onClick={handleGenerate}
                loading={generating}
                disabled={generating}
              >
                {generating ? `Generando… ${globalProgress}%` : '🚀 Generar Investigación'}
              </PrimaryButton>
            </div>

            {/* Aviso de duración */}
            {!generating && (
              <p className="text-center text-xs text-white/30 mt-2">
                La generación toma entre 10-25 min dependiendo del proveedor de IA y su carga actual.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────
const inputClass = `w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white 
placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 
transition-all resize-none`;

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-1 border-b border-white/10">
      <span className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300">
        {number}
      </span>
      <h2 className="text-base font-semibold text-white/90">{title}</h2>
    </div>
  );
}

function FormField({ label, children, span }: { label: string; children: React.ReactNode; span?: 'full' }) {
  return (
    <div className={span === 'full' ? 'col-span-full' : ''}>
      <label className="block text-sm font-medium text-white/60 mb-2">{label}</label>
      {children}
    </div>
  );
}

function SelectField({ id, value, options, onChange }: {
  id: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <select id={id} value={value} onChange={e => onChange(e.target.value)} className={inputClass}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function PrimaryButton({ children, onClick, loading, disabled }: {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      className="px-7 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
      )}
      {children}
    </button>
  );
}
