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

type SubStep = 'idle' | 'research' | 'write' | 'audit' | 'humanize' | 'visuals' | 'done';

interface ChapterStatus {
  name: string;
  status: 'pending' | 'researching' | 'writing' | 'auditing' | 'humanizing' | 'done' | 'error';
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

const MAX_RETRIES_PER_STEP = 3;
const STEP_TIMEOUT_MS = 110_000; // 110s (Vercel corta a 120s)
const RETRY_DELAY_MS = 8_000;    // 8s entre reintentos

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
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        STEP_TIMEOUT_MS
      );

      let data: Record<string, unknown>;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch (e) {
        if (!res.ok) {
          throw new Error(`Error del servidor (HTTP ${res.status}): Vercel abortó la conexión (Timeout). Si usas el plan gratuito (Hobby), el límite es de 10-15s.`);
        }
        throw new Error('La respuesta del servidor no es válida (no es JSON).');
      }

      if (!res.ok) {
        const errMsg = (data.error as string) || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      return data;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      
      const isQuotaDaily = lastErr.toLowerCase().includes('diario') || lastErr.includes('CUOTA_DIARIA_AGOTADA');
      const isAuthMissing = lastErr.includes('Configuración de IA faltante');
      const isDbTimeout = lastErr.includes('TIMEOUT_DB');
      const isVercelTimeout = lastErr.includes('Vercel abortó') || lastErr.includes('HTTP 504');
      
      // Errores fatales de configuración o de límites duros (como los 10s de Vercel Hobby)
      // Nota: Retiramos isVercelTimeout de los errores fatales para permitir que el cliente
      // reintente. A veces Groq o la red es más rápida en el segundo intento.
      if (isQuotaDaily || isAuthMissing || isDbTimeout) {
        throw new Error(lastErr);
      }

      if (attempt < maxRetries) {
        const waitSec = Math.round(RETRY_DELAY_MS * attempt / 1000);
        // Mostrar el error real en el toast para que el usuario no crea que está "trabado" sin razón
        toast.warning(`⚠️ Reintento ${attempt}/${maxRetries} (${stepName}): ${lastErr.substring(0, 60)}... Esperando ${waitSec}s`, { duration: waitSec * 1000 });
        await sleep(RETRY_DELAY_MS * attempt);
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
          updateChapterStatus(i, { status: 'researching', subStep: 'research' });
          toast.info(`🔬 [${i + 1}/${totalSteps}] Investigando: ${sectionTitle}`, { duration: 5000 });

          const resData = await callApiWithRetry(
            '/api/thesis/generate-chapter',
            { projectId, sectionTitle, formData, prevContent, step: 'research' },
            `Investigación de "${sectionTitle}"`
          );
          research = resData.research as string;
        }
        setGlobalProgress(progressForThisSection + 2);

        // --- PASO 2: Write ---
        let draft = existingData?.drafts?.[sectionId];
        if (!draft) {
          updateChapterStatus(i, { status: 'writing', subStep: 'write' });
          toast.info(`✍️ [${i + 1}/${totalSteps}] Redactando contenido: ${sectionTitle}`, { duration: 8000 });

          const writeData = await callApiWithRetry(
            '/api/thesis/generate-chapter',
            { projectId, sectionTitle, formData, prevContent, research, step: 'write' },
            `Redacción de "${sectionTitle}"`
          );
          draft = writeData.draft as string;
        } else {
          console.log(`Borrador para "${sectionTitle}" ya existe. Usando existente.`);
        }
        setGlobalProgress(progressForThisSection + 5);

        // --- PASO 3: Audit ---
        let audit = existingData?.audits?.[sectionId];
        if (!audit) {
          updateChapterStatus(i, { status: 'auditing', subStep: 'audit' });
          const auditData = await callApiWithRetry(
            '/api/thesis/generate-chapter',
            { projectId, sectionTitle, formData, draft, step: 'audit' },
            `Auditoría de "${sectionTitle}"`
          );
          audit = auditData.audit as string;
        }

        // --- PASO 4: Humanize ---
        updateChapterStatus(i, { status: 'humanizing', subStep: 'humanize' });
        toast.info(`💎 [${i + 1}/${totalSteps}] Optimizando escritura: ${sectionTitle}`, { duration: 6000 });

        const humanData = await callApiWithRetry(
          '/api/thesis/generate-chapter',
          { projectId, sectionTitle, formData, draft, audit, step: 'humanize' },
          `Humanización de "${sectionTitle}"`
        );
        let finalVersion = humanData.finalVersion as string;
        setGlobalProgress(progressForThisSection + 10);

        // --- PASO 5: Visuals (Opcional) ---
        if (sectionTitle !== "Referencias Bibliográficas") {
          try {
            updateChapterStatus(i, { status: 'humanizing', subStep: 'visuals' });
            const visualsData = await callApiWithRetry(
              '/api/thesis/generate-chapter',
              { projectId, sectionTitle, formData, content: finalVersion, step: 'visuals' },
              `Visuales de "${sectionTitle}"`,
              1 // Solo 1 reintento para visuales ya que son secundarios
            );
            finalVersion = visualsData.finalVersion as string;
          } catch (vErr) {
            console.warn("Visuals failed for section, skipping visuals:", vErr);
            // No fallamos el proceso por los visuales
          }
        }

        prevContent = finalVersion;
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
      console.error('[Generate] Error crítico:', msg);

      // Marcar la sección actual con error si es posible
      setChapterStatuses(prev => {
        const next = [...prev];
        const currentIdx = next.findIndex(s => s.status !== 'done' && s.status !== 'pending');
        if (currentIdx !== -1) {
          next[currentIdx].status = 'error';
          next[currentIdx].error = msg;
        }
        return next;
      });

      if (msg.includes('CUOTA') || msg.includes('429')) {
        toast.error('⏳ Límite de API alcanzado', {
          description: 'Se ha agotado la cuota de la IA. Espera unos minutos y haz clic en "Reanudar".',
          duration: 15000,
        });
      } else {
        toast.error('❌ Error en la generación', {
          description: msg.substring(0, 150) + '...',
          duration: 15000,
          action: {
            label: 'Reanudar',
            onClick: () => handleGenerate(true)
          }
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────
  const statusIcon: Record<ChapterStatus['status'], string> = {
    pending: '○',
    researching: '🔬',
    writing: '✍️',
    auditing: '🔍',
    humanizing: '💎',
    done: '✅',
    error: '❌',
  };

  const statusLabel: Record<ChapterStatus['status'], string> = {
    pending: 'Pendiente',
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
                    { key: 'research',  icon: '🔬', label: 'Investigar' },
                    { key: 'write',     icon: '✍️', label: 'Redactar'  },
                    { key: 'audit',     icon: '🛡️', label: 'Auditar'   },
                    { key: 'humanize',  icon: '💎', label: 'Pulir'     },
                    { key: 'visuals',   icon: '🎨', label: 'Visuales'  },
                  ];
                  const pipelineOrder: SubStep[] = ['research','write','audit','humanize','visuals'];
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
