import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Provider = "groq" | "gemini";

// ─────────────────────────────────────────────────────────────
// Retry helper with exponential backoff for rate-limit errors
// ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isRateLimitError(error: unknown): boolean {
  const msg: string = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("429") ||
    msg.includes("Too Many Requests") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate_limit") ||
    msg.includes("rate limit") ||
    msg.includes("CUOTA_DIARIA_AGOTADA") ||
    msg.includes("LIMITE_ALCANZADO") ||
    msg.includes("límite diario") ||
    msg.includes("quota")
  );
}

function isDailyExhausted(error: unknown): boolean {
  const msg: string = error instanceof Error ? error.message : String(error);
  return (
    (msg.includes("FreeTier") && (msg.includes("PerDay") || msg.includes("generate_content_free_tier_requests"))) ||
    msg.includes("tokens_per_day") ||
    msg.includes("requests_per_day") ||
    msg.includes("alcanzó su límite diario") ||
    msg.includes("límite diario")
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  agentName: string,
  provider: Provider,
  maxRetries = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (!isRateLimitError(error)) throw error; // Propagate non-quota errors immediately

      if (isDailyExhausted(error) || attempt >= maxRetries) {
        const tag = isDailyExhausted(error) ? "CUOTA_DIARIA_AGOTADA" : "LIMITE_ALCANZADO";
        const errMsg = error instanceof Error ? error.message : "Rate limit exceeded";
        throw new Error(
          `${tag}[${provider}]: ${errMsg} (Agente: ${agentName})`
        );
      }

      // Backoff: 5s → 10s → 20s → 40s (Max 45s wait, enough to clear Groq's 1-min limits)
      const waitMs = Math.min(5000 * Math.pow(2, attempt), 45000);
      console.warn(
        `[${agentName}][${provider}] Rate limit (attempt ${attempt + 1}/${maxRetries + 1}). ` +
        `Retrying in ${waitMs / 1000}s...`
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Provider clients
// ─────────────────────────────────────────────────────────────
class GroqClient {
  private client: Groq;
  // Best free model for academic Spanish text generation
  private readonly MODEL = "llama-3.3-70b-versatile";

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async generate(prompt: string, agentName: string): Promise<string> {
    return withRetry(async () => {
      const completion = await this.client.chat.completions.create({
        model: this.MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 4096,
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error(`Empty response from Groq (${agentName})`);
      return text;
    }, agentName, "groq");
  }
}

class OpenRouterClient {
  private apiKey: string;
  private readonly MODEL = "meta-llama/llama-3.3-70b-instruct";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, agentName: string): Promise<string> {
    return withRetry(async () => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 4096,
        })
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`OpenRouter Error: ${res.status} ${errBody}`);
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error(`Empty response from OpenRouter (${agentName})`);
      return text;
    }, agentName, "openrouter");
  }
}

class GeminiClient {
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { 
        temperature: 0.4, 
        topP: 0.8, 
        topK: 40,
        maxOutputTokens: 8192
      },
    });
  }

  async generate(prompt: string, agentName: string): Promise<string> {
    // Clean prompt to avoid special characters that might confuse the model
    const cleanPrompt = prompt.replace(/[^\x00-\x7F]/g, (char) => {
      // Keep Spanish characters
      if (/[áéíóúñÁÉÍÓÚÑ]/.test(char)) return char;
      return '';
    });
    
    return withRetry(async () => {
      const result = await this.model.generateContent(cleanPrompt);
      const text = result.response?.text?.();
      if (!text || text.trim().length === 0) {
        throw new Error(`Empty response from Gemini (${agentName})`);
      }
      // Validate response doesn't contain image error
      if (text.includes("Cannot read") && text.includes(".png")) {
        throw new Error(`Model attempted image processing. Use text-only prompt.`);
      }
      return text;
    }, agentName, "gemini");
  }
}

// ─────────────────────────────────────────────────────────────
// AcademicEngine — Soporta selección y fallback
// ─────────────────────────────────────────────────────────────
export class AcademicEngine {
  private groq: GroqClient | null = null;
  private gemini: GeminiClient | null = null;
  private openrouter: OpenRouterClient | null = null;
  private preferredModel: string;

  constructor(
    geminiKey?: string,
    groqKey?: string,
    openRouterKey?: string,
    preferredModel: string = "openrouter"
  ) {
    if (groqKey) this.groq = new GroqClient(groqKey);
    if (geminiKey) this.gemini = new GeminiClient(geminiKey);
    if (openRouterKey) this.openrouter = new OpenRouterClient(openRouterKey);
    this.preferredModel = preferredModel;

    if (!this.groq && !this.gemini && !this.openrouter) {
      throw new Error("Se requiere al menos una API key (GROQ, GEMINI u OPENROUTER).");
    }
  }

  /**
   * Intenta usar el modelo preferido. Si se agota, intenta el fallback.
   */
  private async safeGenerate(prompt: string, agentName: string): Promise<string> {
    // Definir orden de proveedores: [primario, secundario, terciario]
    let order: Array<{ name: string, client: GroqClient | GeminiClient | OpenRouterClient | null }> = [];
    
    if (this.preferredModel === "groq") {
      order = [{ name: 'groq', client: this.groq }, { name: 'openrouter', client: this.openrouter }, { name: 'gemini', client: this.gemini }];
    } else if (this.preferredModel === "gemini") {
      order = [{ name: 'gemini', client: this.gemini }, { name: 'openrouter', client: this.openrouter }, { name: 'groq', client: this.groq }];
    } else {
      order = [{ name: 'openrouter', client: this.openrouter }, { name: 'groq', client: this.groq }, { name: 'gemini', client: this.gemini }];
    }

    let lastError: unknown = null;

    for (let i = 0; i < order.length; i++) {
      const provider = order[i];
      if (!provider.client) continue;

      try {
        const result = await provider.client.generate(prompt, agentName);
        return result;
      } catch (error: unknown) {
        lastError = error;
        const msg: string = error instanceof Error ? error.message : String(error);
        
        // Determinar si es un error de cuota para el mensaje final, pero siempre intentar fallback
        const isExhausted = msg.includes("CUOTA_DIARIA_AGOTADA") || msg.includes("LIMITE_ALCANZADO") || msg.includes("429");
        if (isExhausted) {
            lastError = new Error(`CUOTA_DIARIA_AGOTADA[${provider.name}]: ${msg}`);
        }

        const nextProvider = (i < order.length - 1 && order[i+1].client) ? order[i+1] : null;
        console.warn(
          `[${agentName}] ${provider.name} falló (Error: ${msg.substring(0, 50)}...). ` +
          (nextProvider ? `Haciendo fallback a ${nextProvider.name}...` : "No hay fallback disponible.")
        );
        // Continuar el ciclo para intentar con el siguiente proveedor
      }
    }

    if (lastError) {
      // Si llegamos acá, significa que todos los disponibles fallaron
      throw lastError;
    }

    throw new Error("No hay proveedores de IA disponibles.");
  }

  // ── Agents ────────────────────────────────────────────────

  async researcherAgent(topic: string, context: string): Promise<string> {
    const prompt = `
      Rol: Investigador Académico Senior (Experto en RAG).
      Tarea: Identificar 3 fuentes bibliográficas reales (libros o artículos científicos) y 3 conceptos clave necesarios para investigar: ${topic}
      Contexto Institucional: ${context}
      
      Retorna una lista de hallazgos bibliográficos en formato APA 7 y los conceptos clave.
      Mantén las respuestas en ESPAÑOL y con rigor académico.
    `;
    return this.safeGenerate(prompt, "ResearcherAgent");
  }

  async writerAgent(section: string, researchData: string, data: Record<string, unknown>, context: string): Promise<string> {
    const tono = typeof data.tone === 'string' ? data.tone : "Académico Formal";
    const programa = typeof data.program === 'string' ? data.program : "Investigación Científica";
    const description = typeof data.description === 'string' ? data.description : "";
    const title = typeof data.title === 'string' ? data.title : "";

    const prompt = `
      Eres el Agente Redactor de OBELISCO. Tu objetivo es transformar datos de investigación en prosa académica impecable.
      REGLAS:
      - Tercera persona impersonal (NUNCA 'nosotros' o 'yo').
      - Integrar las fuentes de investigación proporcionadas de forma fluida.
      - Tono: ${tono}. Disciplina: ${programa}.
      - Máximo rigor sintáctico.
      - Escribe siempre en ESPAÑOL académico.
      - Mínimo 300 palabras por sección.

      Sección: ${section}
      Datos de Investigación: ${researchData}
      Contexto del Proyecto: ${description}
      Título de la Tesis: ${title}
      Contenido Previo (para coherencia): ${context || "N/A"}
      
      Redacta el contenido exhaustivo y académico para esta sección.
    `;
    return this.safeGenerate(prompt, "WriterAgent");
  }

  async auditorAgent(content: string, thesisType: string): Promise<string> {
    const prompt = `
      Rol: Auditor Metodológico (Especialista en ${thesisType}).
      Tarea: Evaluar el siguiente contenido académico en ESPAÑOL.
      Contenido: ${content}
      
      Busca:
      1. Uso de primera persona (Prohibido).
      2. Falta de citas.
      3. Coherencia con el título.
      
      Retorna una breve crítica y sugerencias de corrección. Si todo está correcto, indica 'APROBADO'.
    `;
    return this.safeGenerate(prompt, "AuditorAgent");
  }

  async humanizerAgent(content: string): Promise<string> {
    const prompt = `
      Rol: Editor de Estilo Humano.
      Tarea: Refinar el texto para que sea indistinguible de un humano experto.
      - Elimina muletillas de IA ('en conclusión', 'es importante destacar', 'cabe señalar').
      - Varía la longitud de las oraciones.
      - Mejora los conectores lógicos.
      - Mantén el idioma ESPAÑOL y el tono académico formal.
      - NO acortes el texto; solo mejóralo.
      
      Texto Original: ${content}
    `;
    return this.safeGenerate(prompt, "HumanizerAgent");
  }

  async generateStructuralPlan(data: Record<string, unknown>): Promise<string> {
    const levelStr = typeof data.level === 'string' ? data.level : "TEG";
    const nivel = levelStr.toUpperCase();

    const baseStructure = nivel.includes("PNF")
      ? `
        - Páginas Preliminares (Portada, Índice, Resumen)
        - Introducción
        - Capítulo I: Descripción del Proyecto (Diagnóstico, Metodología, Alternativas, Justificación)
        - Capítulo II: Planificación del Proyecto (Cronograma)
        - Capítulo III: Conclusiones y Recomendaciones
        - Capítulo IV: Propuesta (Productos/Servicios, Fundamentación, Plan de Acción)
        - Referencias y Anexos
      `
      : `
        - Páginas Preliminares (Portada, Dedicatoria, Agradecimiento, Índice, Resumen)
        - Introducción
        - Capítulo I: El Problema (Planteamiento, Justificación, Objetivos, Variables)
        - Capítulo II: Marco Teórico (Antecedentes, Bases Teóricas, Bases Legales, Términos)
        - Capítulo III: Marco Metodológico (Diseño, Nivel, Población, Muestra, Instrumentos, Validez)
        - Capítulo IV: Resultados de la Investigación
        - Conclusiones y Recomendaciones
        - Referencias y Anexos
      `;

    const prompt = `
      Rol: Arquitecto de Investigaciones Académicas Senior (Normativa UPEL/IUTAR).
      Institución: ${data.university}, ${data.faculty}.
      Tarea: Diseñar el índice detallado para un trabajo de tipo ${data.level} en ${data.program}.
      Título: ${data.title}
      Tema: ${data.description}
      
      Estructura base obligatoria: ${baseStructure}
      Retorna el índice detallado en formato Markdown. Escribe en ESPAÑOL.
    `;

    return this.safeGenerate(prompt, "StructuralPlanAgent");
  }
}
