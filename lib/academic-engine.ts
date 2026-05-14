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
              max_tokens: 8192,
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
                  max_tokens: 8192,
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

  // ── Citations (Semantic Scholar) ───────────────────────────
  private async fetchRealCitations(topic: string): Promise<string> {
    try {
      console.log(`[Semantic Scholar] Buscando citas para: ${topic}`);
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=8&fields=title,authors,year,abstract,url`;
      const res = await fetch(url);
      if (!res.ok) return "";
      const data = await res.json() as { data?: Array<{ title?: string; authors?: Array<{ name?: string }>; year?: number; abstract?: string; url?: string }> };
      if (!data.data || data.data.length === 0) return "";
      
      let citations = "REFERENCIAS VERIFICADAS EXTRAÍDAS DE SEMANTIC SCHOLAR:\n\n";
      for (const paper of data.data) {
        const authors = paper.authors?.map(a => a.name).join(", ") || "Autores desconocidos";
        const year = paper.year || "s.f.";
        const title = paper.title || "Sin título";
        const url = paper.url ? ` URL: ${paper.url}` : "";
        citations += `- ${authors} (${year}). ${title}. Abstract: ${paper.abstract?.substring(0, 300) || "Sin abstract"}.${url}\n`;
      }
      return citations;
    } catch (e) {
      console.error("[Semantic Scholar] Error fetching citations:", e);
      return "";
    }
  }

  // ── Agentes ──────────────────────────────────────────────
  async researcherAgent(topic: string, context: string): Promise<string> {
    const realCitations = await this.fetchRealCitations(topic);
    
    const prompt =
      `Actúa como un investigador académico experto. ` +
      `Investiga bibliografía APA 7 actualizada y conceptos clave para el tema: "${topic}". ` +
      `Contexto institucional: ${context}. ` +
      (realCitations 
        ? `\n\nATENCIÓN: Usa ESTRICTAMENTE las siguientes referencias verificadas para construir tu respuesta y evitar alucinaciones:\n${realCitations}\n` 
        : `Incluye al menos 8 referencias académicas reales con autores, años y títulos de publicaciones. `) +
      `Asegúrate de citar adecuadamente las fuentes y extraer los conceptos clave del abstract. ` +
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
      `Actúa como un Redactor de Tesis Doctoral de élite. ` +
      `Redacta la sección específica: "${section}" ` +
      `dentro de una tesis titulada "${data.title}". ` +
      `Programa: ${data.program} (${data.level}). Universidad: ${data.university}. ` +
      `INVESTIGACIÓN DE BASE: ${research.substring(0, 3000)}. ` +
      `CONTEXTO PREVIO (Storyline): ${(context || "N/A").substring(0, 800)}. ` +
      `REGLAS CRÍTICAS: ` +
      `1. MÍNIMO 800-1000 PALABRAS para esta sección específica. ` +
      `2. PROFUNDIDAD ACADÉMICA: No seas genérico. Analiza, compara autores de la investigación, desarrolla argumentos complejos. ` +
      `3. TONO: ${data.tone || "académico formal"}, tercera persona impersonal. ` +
      `4. CITAS: Usa citas format ${data.norm || "APA 7"} integradas en el texto. ` +
      `5. ESTRUCTURA: Usa subtítulos internos si es necesario para organizar las 1000 palabras. ` +
      `RESPONDE SOLO EL TEXTO DE LA SECCIÓN EN ESPAÑOL.`;
    return this.safeGenerate(prompt, "Redactor");
  }

  async visualsAgent(content: string, topic: string): Promise<string> {
    const prompt =
      `Analiza el siguiente contenido de tesis y genera un elemento visual complementario (Tabla o Diagrama): ` +
      `CONTENIDO: ${content.substring(0, 3000)}. ` +
      `REGLAS: ` +
      `1. Si hay comparaciones o datos, genera una TABLA en Markdown profesional. ` +
      `2. Si hay procesos o flujos, genera un diagrama MERMAID.JS (usando \`\`\`mermaid ... \`\`\`). ` +
      `3. Si no amerita visual, responde "SIN_VISUAL". ` +
      `Responde SOLO el código del elemento visual o "SIN_VISUAL" en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Visualizador");
  }

  async auditorAgent(content: string, type: string): Promise<string> {
    const prompt =
      `Audita este texto de tesis doctoral/maestría (tipo: ${type}): ` +
      `${content.substring(0, 4000)}. ` +
      `Verifica: rigor científico, suficiencia de extensión (debe ser largo y detallado), citas correctas. ` +
      `Si el texto es excelente, responde solo: "APROBADO". ` +
      `Si es mediocre o corto, lista correcciones críticas en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Auditor");
  }

  async humanizerAgent(content: string): Promise<string> {
    const prompt =
      `Actúa como un corrector de estilo editorial académico. ` +
      `Mejora la fluidez y naturalidad de este texto, eliminando el "vibe" de IA (como listas excesivas o conclusiones repetitivas), ` +
      `pero MANTÉN TODA LA EXTENSIÓN Y DETALLE TÉCNICO: ` +
      `${content.substring(0, 5000)}. ` +
      `Usa transiciones elegantes y vocabulario sofisticado. ` +
      `Responde SOLO el texto pulido en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Humanizador");
  }

  async bibliographyAgent(fullContent: string): Promise<string> {
    const prompt =
      `Actúa como un revisor bibliográfico experto. ` +
      `Extrae todas las referencias y autores mencionados o utilizados implícitamente en el siguiente texto de tesis: ` +
      `${fullContent.substring(0, 8000)}... ` +
      `Genera la lista final de "Referencias Bibliográficas" en estricto formato APA 7. ` +
      `Inventa URLs plausibles (como DOIs) solo si son necesarias y parecen reales. ` +
      `Responde ÚNICAMENTE con la lista de referencias formateadas en Markdown.`;
    return this.safeGenerate(prompt, "Bibliógrafo");
  }

  async generateStructuralPlan(data: Record<string, string>): Promise<string> {
    const prompt =
      `Genera un ÍNDICE TÉCNICO DETALLADO para una tesis de ${data.level} titulada "${data.title}". ` +
      `Descripción: ${data.description}. Programa: ${data.program}. ` +
      `REGLAS DEL ÍNDICE: ` +
      `1. Debe tener una estructura jerárquica de 3 o 4 niveles (ej. 1.1., 1.1.1., 1.1.1.1.). ` +
      `2. Cada capítulo debe tener al menos 4 sub-secciones detalladas. ` +
      `3. El índice debe estar en formato Markdown limpio. ` +
      `4. Añade una etiqueta [TYPE:SECTION] al final de cada línea que represente una unidad de redacción. ` +
      `Responde SOLO el índice en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Planificador");
  }

  /**
   * Parsea el plan en Markdown para extraer las secciones individuales.
   */
  static parsePlan(markdownPlan: string): Array<{ id: string; title: string; level: number }> {
    const lines = markdownPlan.split('\n');
    const sections: Array<{ id: string; title: string; level: number }> = [];
    
    const sectionRegex = /^#*\s*(\d+(?:\.\d+)*)\.?\s+(.*?)(\[TYPE:SECTION\])?$/;

    for (const line of lines) {
      const match = line.trim().match(sectionRegex);
      if (match) {
        const id = match[1];
        const title = match[2].trim();
        const isSection = !!match[3] || id.split('.').length >= 2; // Si tiene nivel 2 o más, es unidad de redacción
        
        if (isSection) {
          sections.push({
            id,
            title: `${id} ${title}`,
            level: id.split('.').length
          });
        }
      }
    }
    
    // Si no detectó nada con el regex específico, intentar uno más genérico
    if (sections.length === 0) {
      const genericRegex = /^\s*[\-\*]\s*(.*)$|^\s*(\d+\..*)$/;
      for (const line of lines) {
        const m = line.trim().match(genericRegex);
        if (m) {
          const content = (m[1] || m[2]).trim();
          sections.push({ id: 'gen', title: content, level: 2 });
        }
      }
    }

    return sections;
  }
}
