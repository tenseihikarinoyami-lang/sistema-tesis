import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────
// Retry helper with exponential backoff for 429 rate-limit errors
// ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  agentName: string,
  maxRetries = 3
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg: string = error?.message || "";
      const is429 = msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("RESOURCE_EXHAUSTED");

      if (!is429) throw error; // Non-rate-limit error → propagate immediately

      // Detect DAILY quota exhaustion (limit: 0 on the free tier daily metric)
      const isDailyExhausted =
        msg.includes("FreeTier") &&
        (msg.includes("PerDay") || msg.includes("generate_content_free_tier_requests"));

      if (isDailyExhausted || attempt >= maxRetries) {
        // Parse server-suggested retry delay if present
        const retryMatch = msg.match(/retry.*?(\d+)[\s.]/i) || msg.match(/retryDelay[^\d]*(\d+)/i);
        const retrySeconds = retryMatch ? parseInt(retryMatch[1]) : null;

        if (isDailyExhausted) {
          throw new Error(
            `CUOTA_DIARIA_AGOTADA: La cuota diaria gratuita de la API de Gemini se ha agotado. ` +
            `Por favor, espera hasta mañana o configura un plan de pago en Google AI Studio. ` +
            `(Agente: ${agentName})`
          );
        }
        throw new Error(
          `LIMITE_ALCANZADO: Se superó el límite de solicitudes por minuto tras ${maxRetries} reintentos. ` +
          `Intenta de nuevo en ${retrySeconds ? `${retrySeconds} segundos` : "unos minutos"}. ` +
          `(Agente: ${agentName})`
        );
      }

      // Exponential backoff: 5s, 15s, 35s
      const waitMs = Math.min(5000 * Math.pow(3, attempt), 40000);
      console.warn(
        `[${agentName}] 429 Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}). ` +
        `Retrying in ${waitMs / 1000}s...`
      );
      await sleep(waitMs);
    }
  }

  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Main engine
// ─────────────────────────────────────────────────────────────
export class AcademicEngine {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("API Key for Gemini is required");
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
      },
    });
  }

  private async safeGenerate(prompt: string, agentName: string): Promise<string> {
    return withRetry(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (!text) throw new Error(`Empty response from ${agentName}`);
      return text;
    }, agentName);
  }

  async researcherAgent(topic: string, context: string): Promise<string> {
    const prompt = `
      Rol: Investigador Académico Senior (Experto en RAG).
      Tarea: Identificar 3 fuentes bibliográficas reales (libros o artículos científicos) y 3 conceptos clave necesarios para investigar: ${topic}
      Contexto Institucional: ${context}
      
      Retorna una lista de hallazgos bibliográficos simulados en formato APA 7 y los conceptos clave.
      Mantén las respuestas en ESPAÑOL y con rigor académico.
    `;
    return this.safeGenerate(prompt, "ResearcherAgent");
  }

  async writerAgent(section: string, researchData: string, data: any, context: string): Promise<string> {
    const tono = data.tone || "Académico Formal";
    const programa = data.program || "Investigación Científica";

    const systemPrompt = `
      Eres el Agente Redactor de OBELISCO. Tu objetivo es transformar datos de investigación en prosa académica impecable.
      REGLAS:
      - Tercera persona impersonal (NUNCA 'nosotros' o 'yo').
      - Integrar las fuentes de investigación proporcionadas de forma fluida.
      - Tono: ${tono}. Disciplina: ${programa}.
      - Máximo rigor sintáctico.
      - Escribe siempre en ESPAÑOL académico.
      - Mínimo 300 palabras por sección.
    `;

    const humanPrompt = `
      Sección: ${section}
      Datos de Investigación: ${researchData}
      Contexto del Proyecto: ${data.description || ""}
      Título de la Tesis: ${data.title || ""}
      Contenido Previo (para coherencia): ${context || "N/A"}
      
      Redacta el contenido exhaustivo y académico para esta sección.
    `;

    return this.safeGenerate(`${systemPrompt}\n\n${humanPrompt}`, "WriterAgent");
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
      
      Retorna una breve crítica y sugerencias de corrección. Si todo está perfecto, indica 'APROBADO'.
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
    let baseStructure = "";

    if (nivel.includes("PNF")) {
      baseStructure = `
        - Páginas Preliminares (Portada, Índice, Resumen)
        - Introducción
        - Capítulo I: Descripción del Proyecto (Diagnóstico, Metodología, Alternativas, Justificación)
        - Capítulo II: Planificación del Proyecto (Cronograma)
        - Capítulo III: Conclusiones y Recomendaciones
        - Capítulo IV: Propuesta (Productos/Servicios, Fundamentación, Plan de Acción)
        - Referencias y Anexos
      `;
    } else {
      baseStructure = `
        - Páginas Preliminares (Portada, Dedicatoria, Agradecimiento, Índice, Resumen)
        - Introducción
        - Capítulo I: El Problema (Planteamiento, Justificación, Objetivos, Variables)
        - Capítulo II: Marco Teórico (Antecedentes, Bases Teóricas, Bases Legales, Términos)
        - Capítulo III: Marco Metodológico (Diseño, Nivel, Población, Muestra, Instrumentos, Validez)
        - Capítulo IV: Resultados de la Investigación
        - Conclusiones y Recomendaciones
        - Referencias y Anexos
      `;
    }

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
