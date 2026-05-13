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
}

interface ChapterStatus {
  name: string;
  status: 'pending' | 'researching' | 'writing' | 'auditing' | 'humanizing' | 'done' | 'error';
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
  { value: 'openrouter', label: '🤖 OpenRouter (Llama / GPT-OSS) — Recomendado' },
  { value: 'groq', label: '⚡ Groq (Llama 3.3 70B) — Muy rápido' },
  { value: 'gemini', label: '🔵 Google Gemini — Puede tener límites diarios' },
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

      const data = await res.json() as Record<string, unknown>;

      if (!res.ok) {
        const errMsg = (data.error as string) || `HTTP ${res.status}`;
        // Si es cuota diaria agotada no tiene sentido reintentar
        if (res.status === 429 && errMsg.toLowerCase().includes('diario')) {
          throw new Error(errMsg);
        }
        throw new Error(errMsg);
      }

      return data;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      const isQuotaDaily = lastErr.toLowerCase().includes('diario') || lastErr.includes('CUOTA_DIARIA_AGOTADA');
      if (isQuotaDaily) throw new Error(lastErr); // No reintentar

      if (attempt < maxRetries) {
        const waitSec = Math.round(RETRY_DELAY_MS * attempt / 1000);
        toast.warning(`⚠️ ${stepName} — Reintentando (${attempt}/${maxRetries}) en ${waitSec}s…`, { duration: waitSec * 1000 });
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
    aiModel: 'openrouter',
    language: 'es',
  });

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
  const handleGenerate = async () => {
    const errors = getStepErrors(2);
    if (errors.length > 0) {
      toast.error('Faltan campos: ' + errors.join(', '));
      return;
    }

    setGenerating(true);
    setGlobalProgress(2);

    try {
      // ── FASE 1: Plan estructural ──────────────────────────
      toast.info('📐 Planificando estructura…', { duration: 8000 });

      const planData = await callApiWithRetry(
        '/api/thesis/plan',
        { ...formData, ownerId: user?.uid || 'anonymous' },
        'Planificación'
      );

      const projectId = planData.project_id as string;
      let prevContent = planData.plan as string;
      setGlobalProgress(8);
      toast.success('✅ Plan estructural listo', { duration: 3000 });

      // ── FASE 2: Secciones Detalladas ──────────────────────
      const sections = (planData.sections as any[]) || [];
      const totalSteps = sections.length;
      
      // Actualizar estados para mostrar secciones
      setChapterStatuses(sections.map(s => ({
        name: s.title,
        status: 'pending',
        retries: 0,
        isSection: true
      })));

      for (let i = 0; i < totalSteps; i++) {
        const section = sections[i];
        const sectionTitle = section.title;
        const progressBase = 8 + Math.round((i / totalSteps) * 90);

        updateChapterStatus(i, { status: 'researching' });
        toast.info(`🔬 [${i + 1}/${totalSteps}] Investigando: ${sectionTitle}`, { duration: 10000 });

        // PASO 1 — Research
        const resData = await callApiWithRetry(
          '/api/thesis/generate-chapter',
          { projectId, sectionTitle, formData, prevContent, step: 'research' },
          `Investigación de "${sectionTitle}"`
        );
        const research = resData.research as string;
        setGlobalProgress(progressBase + 2);
        await sleep(1500);

        // PASO 2 — Write
        updateChapterStatus(i, { status: 'writing' });
        toast.info(`✍️ [${i + 1}/${totalSteps}] Redactando: ${sectionTitle}`, { duration: 15000 });

        const writeData = await callApiWithRetry(
          '/api/thesis/generate-chapter',
          { projectId, sectionTitle, formData, prevContent, research, step: 'write' },
          `Redacción de "${sectionTitle}"`
        );
        const draft = writeData.draft as string;
        setGlobalProgress(progressBase + 5);
        await sleep(1500);

        // PASO 3 — Audit
        updateChapterStatus(i, { status: 'auditing' });
        const auditData = await callApiWithRetry(
          '/api/thesis/generate-chapter',
          { projectId, sectionTitle, formData, draft, step: 'audit' },
          `Auditoría de "${sectionTitle}"`
        );
        const audit = auditData.audit as string;

        // PASO 4 — Humanize
        updateChapterStatus(i, { status: 'humanizing' });
        toast.info(`💎 [${i + 1}/${totalSteps}] Puliendo: ${sectionTitle}`, { duration: 12000 });

        const humanData = await callApiWithRetry(
          '/api/thesis/generate-chapter',
          { projectId, sectionTitle, formData, draft, audit, step: 'humanize' },
          `Pulido de "${sectionTitle}"`
        );
        const finalVersion = humanData.finalVersion as string;

        prevContent = finalVersion;
        updateChapterStatus(i, { status: 'done' });
        setGlobalProgress(progressBase + 15);
        toast.success(`✅ Sección completada: ${sectionTitle}`, { duration: 4000 });

        // Pausa entre secciones para no saturar rate limit
        if (i < totalSteps - 1) await sleep(3000);
      }

      // ── FASE 3: Finalización ──────────────────────────────
      setGlobalProgress(98);
      await callApiWithRetry(
        '/api/thesis/finalize',
        { projectId },
        'Finalización'
      ).catch(() => { /* Finalización opcional */ });

      setGlobalProgress(100);
      toast.success('🎓 ¡Tesis completada exitosamente!', {
        description: 'Accede a tus proyectos para descargar el documento.',
        duration: 8000,
      });

      setTimeout(() => router.push('/dashboard/projects'), 2000);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[NewProject] Error en generación:', msg);

      if (msg.includes('CUOTA_DIARIA_AGOTADA') || msg.includes('diario') || msg.includes('429')) {
        toast.error('⏳ Cuota gratuita agotada', {
          description: 'Los proveedores gratuitos (OpenRouter/Groq) han alcanzado su límite. Espera unos minutos y vuelve a intentarlo, o cambia de proveedor de IA.',
          duration: 12000,
        });
      } else if (msg.includes('TIMEOUT')) {
        toast.error('⌛ Tiempo de espera excedido', {
          description: 'El servidor tardó demasiado. Esto puede ocurrir en horas de mucho tráfico. Intenta de nuevo en unos minutos.',
          duration: 10000,
        });
      } else if (msg.includes('API Key') || msg.includes('configurada') || msg.includes('401')) {
        toast.error('🔑 Error de configuración', {
          description: 'Las API Keys de IA no están configuradas en el servidor. Contacta al administrador.',
          duration: 10000,
        });
      } else {
        toast.error('❌ Error durante la generación', {
          description: msg.substring(0, 200),
          duration: 10000,
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {chapterStatuses.map((cs, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      cs.status === 'done' ? 'bg-green-500/10 border border-green-500/20' :
                      cs.status === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                      cs.status === 'pending' ? 'bg-white/5 border border-white/10' :
                      'bg-purple-500/10 border border-purple-500/20'
                    }`}
                  >
                    <span className="text-base">{statusIcon[cs.status]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-white/90 font-medium">{cs.name}</p>
                      <p className="text-xs text-white/50">{statusLabel[cs.status]}</p>
                    </div>
                  </div>
                ))}
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
