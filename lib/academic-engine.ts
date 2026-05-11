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

function isRateLimitError(error: any): boolean {
  const msg: string = error?.message || error?.toString() || "";
  return (
    msg.includes("429") ||
    msg.includes("Too Many Requests") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate_limit") ||
    msg.includes("rate limit") ||
    msg.includes("CUOTA_DIARIA_AGOTADA") ||
    msg.includes("LIMITE_ALCANZADO")
  );
}

function isDailyExhausted(error: any): boolean {
  const msg: string = error?.message || error?.toString() || "";
  return (
    (msg.includes("FreeTier") && (msg.includes("PerDay") || msg.includes("generate_content_free_tier_requests"))) ||
    msg.includes("tokens_per_day") ||
    msg.includes("requests_per_day")
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  agentName: string,
  provider: Provider,
  maxRetries = 2
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (!isRateLimitError(error)) throw error; // Propagate non-quota errors immediately

      if (isDailyExhausted(error) || attempt >= maxRetries) {
        const tag = isDailyExhausted(error) ? "CUOTA_DIARIA_AGOTADA" : "LIMITE_ALCANZADO";
        throw new Error(
          `${tag}[${provider}]: ${error?.message || "Rate limit exceeded"} (Agente: ${agentName})`
        );
      }

      // Backoff: 4s → 12s → 30s
      const waitMs = Math.min(4000 * Math.pow(3, attempt), 35000);
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

class GeminiClient {
  private model: any;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature: 0.4, topP: 0.8, topK: 40 },
    });
  }

  async generate(prompt: string, agentName: string): Promise<string> {
    return withRetry(async () => {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      if (!text) throw new Error(`Empty response from Gemini (${agentName})`);
      return text;
    }, agentName, "gemini");
  }
}

// ─────────────────────────────────────────────────────────────
// AcademicEngine — Groq primary, Gemini fallback
// ─────────────────────────────────────────────────────────────
export class AcademicEngine {
  private groq: GroqClient | null = null;
  private gemini: GeminiClient | null = null;

  constructor(
    geminiKey?: string,
    groqKey?: string
  ) {
    if (groqKey) this.groq = new GroqClient(groqKey);
    if (geminiKey) this.gemini = new GeminiClient(geminiKey);

    if (!this.groq && !this.gemini) {
      throw new Error("Se requiere al menos una API key (GROQ o GEMINI).");
    }
  }

  /**
   * Try Groq first (10x more free quota, fastest).
   * If Groq fails with daily exhaustion → fallback to Gemini.
   * If both fail → throw the last error.
   */
  private async safeGenerate(prompt: string, agentName: string): Promise<string> {
    // 1. Try Groq
    if (this.groq) {
      try {
        const result = await this.groq.generate(prompt, agentName);
        return result;
      } catch (groqError: any) {
        const msg: string = groqError?.message || "";
        const isExhausted = msg.includes("CUOTA_DIARIA_AGOTADA") || msg.includes("LIMITE_ALCANZADO");

        if (!isExhausted) throw groqError; // Unexpected error → propagate

        console.warn(
          `[${agentName}] Groq quota exhausted. ` +
          (this.gemini ? "Switching to Gemini fallback..." : "No fallback available.")
        );

        // 2. Fallback to Gemini
        if (this.gemini) {
          try {
            return await this.gemini.generate(prompt, agentName);
          } catch (geminiError: any) {
            const gMsg: string = geminiError?.message || "";
            // Both exhausted → throw user-friendly error
            throw new Error(
              `CUOTA_DIARIA_AGOTADA[ambos]: Tanto Groq como Gemini han agotado su cuota diaria. ` +
              `Espera hasta mañana o activa un plan de pago. (Agente: ${agentName})`
            );
          }
        }

        throw groqError;
      }
    }

    // Groq not configured → use Gemini directly
    if (this.gemini) {
      return this.gemini.generate(prompt, agentName);
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

  async writerAgent(section: string, researchData: string, data: any, context: string): Promise<string> {
    const tono = data.tone || "Académico Formal";
    const programa = data.program || "Investigación Científica";

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
      Contexto del Proyecto: ${data.description || ""}
      Título de la Tesis: ${data.title || ""}
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

  async generateStructuralPlan(data: any): Promise<string> {
    const nivel = (data.level || "TEG").toUpperCase();

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
