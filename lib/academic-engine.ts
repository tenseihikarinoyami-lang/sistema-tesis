import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────
type Provider = "groq" | "gemini" | "openrouter" | "ollama";

// Blacklist con TTL de 30 minutos por proveedor
const BLACKLIST_TTL_MS = 30 * 60 * 1000;

interface GlobalAIState {
  blacklist: Map<string, number>;
  modelCooldowns: Map<string, number>;
}

const getGlobalState = (): GlobalAIState => {
  const g = global as Record<string, unknown>;
  if (!g.AI_STATE) {
    g.AI_STATE = {
      blacklist: new Map<string, number>(),
      modelCooldowns: new Map<string, number>(),
    } satisfies GlobalAIState;
  }
  return g.AI_STATE as GlobalAIState;
};

const isBlacklisted = (state: GlobalAIState, provider: string): boolean => {
  const ts = state.blacklist.get(provider);
  if (!ts) return false;
  if (Date.now() - ts > BLACKLIST_TTL_MS) {
    state.blacklist.delete(provider);
    return false;
  }
  return true;
};

interface AIResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string; code?: number };
}

interface BaseClient {
  generate(prompt: string, agentName: string): Promise<string>;
}

// ─────────────────────────────────────────────────────────────
// Ayudantes
// ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("403") ||
    msg.includes("Access denied") ||
    msg.includes("401") ||
    msg.includes("Unauthorized")
  )
    return false;
  const statusMatch = msg.match(/\b(429|500|502|503|504|402)\b/);
  return (
    statusMatch !== null ||
    msg.toLowerCase().includes("too many requests") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate_limit") ||
    msg.includes("rate-limited") ||
    msg.includes("CUOTA_DIARIA_AGOTADA") ||
    msg.includes("LIMITE_ALCANZADO") ||
    msg.includes("límite diario") ||
    msg.includes("quota") ||
    msg.includes("overloaded") ||
    msg.includes("payment_required")
  );
}

function isDailyExhausted(error: unknown): boolean {
  const msg = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();
  return (
    msg.includes("daily") ||
    msg.includes("diario") ||
    msg.includes("quota") ||
    msg.includes("cuota") ||
    msg.includes("limit reached") ||
    msg.includes("límite alcanzado") ||
    msg.includes("free_tier") ||
    msg.includes("exhausted")
  );
}

function isNetworkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("fetch failed") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("network error") ||
    msg.includes("Failed to fetch")
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  agentName: string,
  provider: Provider,
  maxRetries = 1
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      // Errores de red: propagar inmediatamente para activar fallback
      if (isNetworkError(error)) throw error;
      if (!isRateLimitError(error)) throw error;
      if (isDailyExhausted(error) || attempt >= maxRetries) {
        const tag = isDailyExhausted(error)
          ? "CUOTA_DIARIA_AGOTADA"
          : "LIMITE_ALCANZADO";
        const errMsg =
          error instanceof Error ? error.message : "Error de límite de tasa";
        throw new Error(`${tag}[${provider}]: ${errMsg} (Agente: ${agentName})`);
      }
      const waitMs = Math.min(3000 * Math.pow(2, attempt), 15000);
      console.warn(
        `[${agentName}][${provider}] Reintentando en ${waitMs / 1000}s... (intento ${attempt + 1})`
      );
      await sleep(waitMs);
    }
  }
  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Groq Client
// ─────────────────────────────────────────────────────────────
class GroqClient implements BaseClient {
  private client: Groq;
  // Modelos Groq activos (verificados mayo 2026)
  private readonly MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
  ];

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async generate(prompt: string, agentName: string): Promise<string> {
    let lastError: Error | null = null;
    const state = getGlobalState();

    for (const model of this.MODELS) {
      if (state.modelCooldowns.has(`groq:${model}`)) continue;
      try {
        console.log(`[Groq] Probando modelo: ${model}`);
        return await withRetry(
          async () => {
            const completion = await this.client.chat.completions.create({
              model,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3,
              max_tokens: 4096,
            });
            const content = completion.choices[0]?.message?.content;
            if (!content) throw new Error("Groq devolvió respuesta vacía");
            return content;
          },
          agentName,
          "groq"
        );
      } catch (error: unknown) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        const msg = lastError.message;
        console.warn(`[Groq] Modelo ${model} falló: ${msg.substring(0, 100)}`);
        if (msg.includes("403") || msg.includes("401")) {
          state.blacklist.set("groq", Date.now());
          break;
        }
        if (msg.includes("404") || msg.includes("not found") || msg.includes("does not exist")) {
          state.modelCooldowns.set(`groq:${model}`, Date.now());
        }
      }
    }
    throw (
      lastError || new Error(`Groq: todos los modelos fallaron para ${agentName}`)
    );
  }
}

// ─────────────────────────────────────────────────────────────
// OpenRouter Client  
// Modelos verificados con API key actual (12 Mayo 2026)
// ─────────────────────────────────────────────────────────────
class OpenRouterClient implements BaseClient {
  private apiKey: string;
  // IMPORTANTE: Lista actualizada con modelos VERIFICADOS activos
  private readonly MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free", // ✅ Muy potente, gratuito
    "meta-llama/llama-3.1-8b-instruct:free",  // ✅ Estable
    "google/gemma-2-9b-it:free",              // ✅ Rápido
    "mistralai/mistral-7b-instruct:free",     // ✅ Confiable
    "openrouter/auto:free",                    // 🔄 Fallback automático universal
  ];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, agentName: string): Promise<string> {
    let lastError: Error | null = null;
    const state = getGlobalState();

    for (const model of this.MODELS) {
      if (state.modelCooldowns.has(`openrouter:${model}`)) continue;
      try {
        console.log(`[OpenRouter] Probando modelo: ${model}`);
        return await withRetry(
          async () => {
            const res = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${this.apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "https://obelisco-ai.vercel.app",
                  "X-Title": "Obelisco Academic AI",
                },
                body: JSON.stringify({
                  model,
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0.4,
                  max_tokens: 4096,
                }),
              }
            );

            const data = (await res.json()) as AIResponse;

            // Manejar errores de la API que vienen en JSON con status 200
            if (data.error) {
              const code = data.error.code ?? 0;
              const errMsg = data.error.message ?? "Error desconocido de OpenRouter";
              throw new Error(`OpenRouter Error ${code}: ${errMsg}`);
            }

            if (!res.ok) {
              throw new Error(`OpenRouter HTTP ${res.status}`);
            }

            const content = data.choices?.[0]?.message?.content;
            if (!content) throw new Error("OpenRouter devolvió respuesta vacía");
            return content;
          },
          agentName,
          "openrouter"
        );
      } catch (error: unknown) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        const msg = lastError.message;
        console.warn(
          `[OpenRouter] Modelo ${model} falló: ${msg.substring(0, 120)}`
        );

        if (msg.includes("401") || msg.includes("Invalid API key")) {
          state.blacklist.set("openrouter", Date.now());
          break;
        }
        // Modelo no disponible → cooldown para este modelo específico
        if (
          msg.includes("404") ||
          msg.includes("not found") ||
          msg.includes("not a valid model") ||
          msg.includes("No endpoints found")
        ) {
          state.modelCooldowns.set(`openrouter:${model}`, Date.now());
          continue; // Seguir con el siguiente modelo
        }
        // Rate limit → esperar y seguir con siguiente
        if (
          msg.includes("429") ||
          msg.includes("rate-limited") ||
          msg.includes("temporarily")
        ) {
          state.modelCooldowns.set(`openrouter:${model}`, Date.now());
          continue;
        }
      }
    }
    throw (
      lastError ||
      new Error(`OpenRouter: todos los modelos fallaron para ${agentName}`)
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Gemini Client (backup, puede estar bloqueado por cuota)
// ─────────────────────────────────────────────────────────────
class GeminiClient implements BaseClient {
  private genAI: GoogleGenerativeAI;
  private readonly MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generate(prompt: string, agentName: string): Promise<string> {
    let lastError: Error | null = null;
    const state = getGlobalState();

    for (const modelName of this.MODELS) {
      if (state.modelCooldowns.has(`gemini:${modelName}`)) continue;
      try {
        console.log(`[Gemini] Probando modelo: ${modelName}`);
        return await withRetry(
          async () => {
            const model = this.genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            if (!text) throw new Error("Gemini devolvió respuesta vacía");
            return text;
          },
          agentName,
          "gemini",
          1
        );
      } catch (error: unknown) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        const msg = lastError.message;
        console.warn(
          `[Gemini] Modelo ${modelName} falló: ${msg.substring(0, 100)}`
        );
        // Solo añadir a blacklist si es cuota diaria real (no errores de red)
        if (isDailyExhausted(error) && !isNetworkError(error)) {
          state.blacklist.set("gemini", Date.now());
          break; // No tiene caso intentar el siguiente si la cuota está agotada
        }
        if (msg.includes("403") || msg.includes("401")) {
          state.blacklist.set("gemini", Date.now());
          break;
        }
      }
    }
    throw (
      lastError ||
      new Error(`Gemini: todos los modelos fallaron para ${agentName}`)
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Ollama Client (solo funciona en local)
// ─────────────────────────────────────────────────────────────
class OllamaClient implements BaseClient {
  private baseUrl: string;
  private readonly MODELS = ["llama3.3", "llama3.1", "llama3", "mistral", "phi3"];

  constructor(url = "http://localhost:11434") {
    this.baseUrl = url;
  }

  async generate(prompt: string, agentName: string): Promise<string> {
    let lastError: Error | null = null;

    for (const model of this.MODELS) {
      try {
        console.log(`[Ollama] Probando modelo: ${model}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${this.baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt, stream: false }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
        const data = await res.json() as { response?: string };
        return data.response || "";
      } catch (error: unknown) {
        lastError =
          error instanceof Error ? error : new Error(String(error));
        const isOffline =
          lastError.name === "AbortError" ||
          lastError.message.includes("fetch failed") ||
          lastError.message.includes("ECONNREFUSED");

        if (isOffline) {
          throw new Error(
            "OLLAMA_NOT_RUNNING: El servicio local de Ollama no está activo."
          );
        }
        console.warn(`[Ollama] Modelo ${model} no disponible.`);
      }
    }
    throw lastError || new Error("Ollama: sin modelos disponibles");
  }
}

// ─────────────────────────────────────────────────────────────
// AcademicEngine — Motor Principal
// ─────────────────────────────────────────────────────────────
export class AcademicEngine {
  private clients: Partial<Record<Provider, BaseClient>> = {};
  private preferred: Provider;

  constructor(
    geminiKey?: string,
    groqKey?: string,
    openRouterKey?: string,
    preferred = "openrouter",
    ollamaUrl = "http://localhost:11434"
  ) {
    const clean = (k?: string) => k?.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, "");

    const gKey = clean(geminiKey);
    const grKey = clean(groqKey);
    const orKey = clean(openRouterKey);

    if (orKey) {
      this.clients.openrouter = new OpenRouterClient(orKey);
      console.log("[AcademicEngine] ✅ OpenRouter configurado");
    } else {
      console.warn("[AcademicEngine] ⚠️ OPENROUTER_API_KEY no configurada");
    }

    if (grKey) {
      this.clients.groq = new GroqClient(grKey);
      console.log("[AcademicEngine] ✅ Groq configurado");
    } else {
      console.warn("[AcademicEngine] ⚠️ GROQ_API_KEY no configurada");
    }

    if (gKey) {
      this.clients.gemini = new GeminiClient(gKey);
      console.log("[AcademicEngine] ✅ Gemini configurado");
    } else {
      console.warn("[AcademicEngine] ⚠️ GEMINI_API_KEY no configurada");
    }

    this.clients.ollama = new OllamaClient(ollamaUrl);

    // Determinar proveedor preferido (validar que tenga clave)
    const pref = preferred as Provider;
    this.preferred = this.clients[pref] ? pref : "openrouter";
    console.log(`[AcademicEngine] Proveedor preferido: ${this.preferred}`);
  }

  private async safeGenerate(prompt: string, agentName: string): Promise<string> {
    const state = getGlobalState();

    // Orden de prioridad: preferido → openrouter → groq → gemini → ollama
    const order: Provider[] = [
      this.preferred,
      "openrouter",
      "groq",
      "gemini",
      "ollama",
    ];
    const tried = new Set<Provider>();
    const failures: string[] = [];

    for (const pName of order) {
      if (tried.has(pName)) continue;
      tried.add(pName);

      // Omitir Ollama en producción salvo que sea el preferido
      if (
        pName === "ollama" &&
        process.env.NODE_ENV === "production" &&
        this.preferred !== "ollama"
      )
        continue;

      const client = this.clients[pName];
      if (!client) {
        failures.push(`${pName}: Sin API Key configurada (saltado)`);
        continue;
      }

      if (isBlacklisted(state, pName)) {
        failures.push(`${pName}: En cuarentena temporal (cuota agotada)`);
        continue;
      }

      try {
        console.log(`[AcademicEngine] Intentando con proveedor: ${pName}`);
        const result = await client.generate(prompt, agentName);
        if (result && result.trim().length > 20) {
          console.log(`[AcademicEngine] ✅ Éxito con: ${pName}`);
          return result;
        }
        throw new Error(`Respuesta demasiado corta de ${pName}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);

        if (msg.includes("OLLAMA_NOT_RUNNING")) {
          failures.push(`Ollama: No está ejecutándose (solo disponible en local)`);
        } else {
          failures.push(`${pName}: ${msg.substring(0, 100)}`);
        }
        console.error(`[AcademicEngine] ❌ Fallo en ${pName}: ${msg.substring(0, 120)}`);
      }
    }

    const details = failures.map((f) => `• ${f}`).join("\n");
    throw new Error(
      `No se pudo generar el contenido con ningún proveedor de IA.\n\n` +
      `DETALLES:\n${details}\n\n` +
      `SOLUCIÓN: Verifica que las API Keys (OPENROUTER_API_KEY, GROQ_API_KEY) ` +
      `estén configuradas en Vercel → Settings → Environment Variables.`
    );
  }

  // ── Agentes ──────────────────────────────────────────────
  async researcherAgent(topic: string, context: string): Promise<string> {
    const prompt =
      `Actúa como un investigador académico experto. ` +
      `Investiga bibliografía APA 7 actualizada y conceptos clave para el tema: "${topic}". ` +
      `Contexto institucional: ${context}. ` +
      `Incluye al menos 5 referencias académicas reales (autores conocidos, revistas indexadas). ` +
      `Responde en ESPAÑOL académico formal.`;
    return this.safeGenerate(prompt, "Investigador");
  }

  async writerAgent(
    section: string,
    research: string,
    data: Record<string, string>,
    context: string
  ): Promise<string> {
    const prompt =
      `Redacta la sección "${section}" para una tesis de "${data.program}" ` +
      `(nivel: ${data.level}) titulada "${data.title}". ` +
      `Universidad: ${data.university}. ` +
      `Usa esta investigación de base: ${research.substring(0, 2000)}. ` +
      `Contexto previo del documento: ${(context || "N/A").substring(0, 500)}. ` +
      `REGLAS ESTRICTAS: Tercera persona impersonal, mínimo 400 palabras, ` +
      `citas en formato ${data.norm || "APA 7"}, tono ${data.tone || "académico formal"}, ` +
      `SOLO en ESPAÑOL. NO uses primera persona ("yo", "nosotros").`;
    return this.safeGenerate(prompt, "Redactor");
  }

  async auditorAgent(content: string, type: string): Promise<string> {
    const prompt =
      `Audita este texto de tesis (tipo: ${type}): ` +
      `${content.substring(0, 3000)}. ` +
      `Verifica: uso de tercera persona, citas APA presentes, coherencia académica. ` +
      `Si el texto cumple todos los criterios, responde solo: "APROBADO". ` +
      `Si no, lista las correcciones necesarias de forma concisa en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Auditor");
  }

  async humanizerAgent(content: string): Promise<string> {
    const prompt =
      `Reescribe este texto académico mejorando su naturalidad y fluidez, ` +
      `eliminando patrones repetitivos de IA pero manteniendo el rigor académico y la extensión: ` +
      `${content.substring(0, 3500)}. ` +
      `Usa conectores variados, sinónimos técnicos, y mantén la tercera persona. ` +
      `NO reduzcas el contenido. Responde SOLO el texto mejorado en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Humanizador");
  }

  async generateStructuralPlan(data: Record<string, string>): Promise<string> {
    const prompt =
      `Crea un índice detallado en Markdown para una tesis de ${data.level} ` +
      `en el programa "${data.program}" de la Universidad "${data.university}". ` +
      `Título de la investigación: "${data.title}". ` +
      `Descripción del problema: ${(data.description || "").substring(0, 500)}. ` +
      `Capítulos a incluir: ${(data.chapters as unknown as string[])?.join(", ") || "estándar"}. ` +
      `Normativa de citación: ${data.norm || "APA 7"}. ` +
      `El índice debe incluir subcapítulos detallados para cada sección. ` +
      `Responde en ESPAÑOL con rigor académico.`;
    return this.safeGenerate(prompt, "Planificador");
  }
}
