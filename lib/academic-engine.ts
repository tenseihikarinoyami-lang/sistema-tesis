import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────
// Tipos y Estado Global
// ─────────────────────────────────────────────────────────────
type Provider = "groq" | "gemini" | "openrouter" | "ollama";

// Blacklist persistente en la sesión de Node
const getGlobalState = () => {
  if (!(global as any).AI_STATE) {
    (global as any).AI_STATE = {
      blacklist: new Set<string>(),
      modelCooldowns: new Map<string, number>() // modelName -> timestamp de fallo
    };
  }
  return (global as any).AI_STATE;
};

interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface BaseClient {
  generate(prompt: string, agentName: string): Promise<string>;
}

// ─────────────────────────────────────────────────────────────
// Ayudantes de Reintento y Errores
// ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isRateLimitError(error: unknown): boolean {
  const msg: string = error instanceof Error ? error.message : String(error);
  
  if (msg.includes("403") || msg.includes("Access denied") || msg.includes("401") || msg.includes("Unauthorized")) {
    return false; // Errores permanentes de acceso/auth
  }

  const statusMatch = msg.match(/\b(429|500|502|503|504|402)\b/);
  
  return (
    statusMatch !== null ||
    msg.toLowerCase().includes("too many requests") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate_limit") ||
    msg.includes("CUOTA_DIARIA_AGOTADA") ||
    msg.includes("LIMITE_ALCANZADO") ||
    msg.includes("límite diario") ||
    msg.includes("quota") ||
    msg.includes("overloaded") ||
    msg.includes("payment_required")
  );
}

function isDailyExhausted(error: unknown): boolean {
  const msg: string = (error instanceof Error ? error.message : String(error)).toLowerCase();
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

async function withRetry<T>(
  fn: () => Promise<T>,
  agentName: string,
  provider: Provider,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (!isRateLimitError(error)) throw error;

      if (isDailyExhausted(error) || attempt >= maxRetries) {
        const tag = isDailyExhausted(error) ? "CUOTA_DIARIA_AGOTADA" : "LIMITE_ALCANZADO";
        const errMsg = error instanceof Error ? error.message : "Error de límite de tasa";
        throw new Error(`${tag}[${provider}]: ${errMsg} (Agente: ${agentName})`);
      }

      const waitMs = Math.min(3000 * Math.pow(2, attempt), 30000);
      console.warn(`[${agentName}][${provider}] Reintentando en ${waitMs / 1000}s... (intento ${attempt + 1})`);
      await sleep(waitMs);
    }
  }
  throw lastError;
}

// ─────────────────────────────────────────────────────────────
// Clientes de Proveedores
// ─────────────────────────────────────────────────────────────

class GroqClient implements BaseClient {
  private client: Groq;
  private readonly MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768"
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
        console.log(`[Groq] Probando: ${model}...`);
        return await withRetry(async () => {
          const completion = await this.client.chat.completions.create({
            model: model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 4096,
          });
          return completion.choices[0]?.message?.content || "";
        }, agentName, "groq");
      } catch (error: any) {
        lastError = error;
        const msg = error.message || "";
        console.warn(`[Groq] Modelo ${model} falló: ${msg}`);
        
        if (msg.includes("403") || msg.includes("401")) {
            state.blacklist.add("groq");
            break; 
        }
        
        if (msg.includes("404") || msg.includes("not found")) {
            state.modelCooldowns.set(`groq:${model}`, Date.now());
        }
      }
    }
    throw lastError || new Error(`Fallo total en Groq para ${agentName}`);
  }
}

class OpenRouterClient implements BaseClient {
  private apiKey: string;
  private readonly MODELS = [
    "meta-llama/llama-3.3-70b-instruct",
    "meta-llama/llama-3.1-70b-instruct",
    "meta-llama/llama-3.1-8b-instruct",
    "google/gemini-pro-1.5-exp:free",
    "google/gemini-flash-1.5-8b",
    "mistralai/mistral-7b-instruct:free",
    "openrouter/free",
    "openrouter/auto"
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
        console.log(`[OpenRouter] Probando: ${model}...`);
        return await withRetry(async () => {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://obelisco.ai',
              'X-Title': 'Obelisco AI'
            },
            body: JSON.stringify({
              model: model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.4,
              max_tokens: 4096,
            })
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`OpenRouter Error ${res.status}: ${errText}`);
          }

          const data = (await res.json()) as AIResponse;
          return data.choices?.[0]?.message?.content || "";
        }, agentName, "openrouter");
      } catch (error: any) {
        lastError = error;
        console.warn(`[OpenRouter] Falló ${model}: ${error.message}`);
        
        if (error.message.includes("401")) {
            state.blacklist.add("openrouter");
            break;
        }
        
        if (error.message.includes("404") || error.message.includes("not found")) {
            state.modelCooldowns.set(`openrouter:${model}`, Date.now());
        }
      }
    }
    throw lastError || new Error(`Fallo total en OpenRouter para ${agentName}`);
  }
}

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
      try {
        console.log(`[Gemini] Probando: ${modelName}...`);
        return await withRetry(async () => {
          const model = this.genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          return result.response.text();
        }, agentName, "gemini", 1);
      } catch (error: any) {
        lastError = error;
        console.warn(`[Gemini] Falló ${modelName}: ${error.message}`);
        if (isDailyExhausted(error) && modelName === "gemini-1.5-pro") {
            state.blacklist.add("gemini");
        }
      }
    }
    throw lastError || new Error(`Fallo total en Gemini para ${agentName}`);
  }
}

class OllamaClient implements BaseClient {
  private baseUrl: string;
  private readonly MODELS = ["llama3.3:70b", "llama3.1:8b", "llama3", "mistral"];

  constructor(url: string = "http://localhost:11434") {
    this.baseUrl = url;
  }

  async generate(prompt: string, agentName: string): Promise<string> {
    let lastError: Error | null = null;
    for (const model of this.MODELS) {
      try {
        console.log(`[Ollama] Probando: ${model}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, stream: false }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`Ollama error ${res.status}`);
        const data = await res.json();
        return data.response || "";
      } catch (error: any) {
        lastError = error;
        const isFetchError = error.name === 'AbortError' || error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED");
        
        console.warn(`[Ollama] Falló ${model}: ${error.message}`);
        
        if (isFetchError) {
            throw new Error("OLLAMA_NOT_RUNNING: El servicio local de Ollama no responde. Asegúrate de que esté abierto.");
        }
      }
    }
    throw lastError || new Error("Ollama no disponible");
  }
}

// ─────────────────────────────────────────────────────────────
// AcademicEngine Main Class
// ─────────────────────────────────────────────────────────────

export class AcademicEngine {
  private clients: Partial<Record<Provider, BaseClient>> = {};
  private preferred: Provider;

  constructor(
    geminiKey?: string,
    groqKey?: string,
    openRouterKey?: string,
    preferred: string = "openrouter",
    ollamaUrl: string = "http://localhost:11434"
  ) {
    const cleanKey = (key?: string) => key?.trim().replace(/^["']|["']$/g, '');

    const gKey = cleanKey(geminiKey);
    const grKey = cleanKey(groqKey);
    const orKey = cleanKey(openRouterKey);

    if (gKey) this.clients.gemini = new GeminiClient(gKey);
    if (grKey) this.clients.groq = new GroqClient(grKey);
    if (orKey) this.clients.openrouter = new OpenRouterClient(orKey);
    this.clients.ollama = new OllamaClient(ollamaUrl);
    
    this.preferred = (this.clients[preferred as Provider] ? preferred : "openrouter") as Provider;
  }

  private async safeGenerate(prompt: string, agentName: string): Promise<string> {
    const state = getGlobalState();
    const providers: Provider[] = [this.preferred, "openrouter", "gemini", "groq", "ollama"];
    const uniqueProviders = Array.from(new Set(providers));
    
    const failures: string[] = [];

    for (const pName of uniqueProviders) {
      const client = this.clients[pName];
      if (!client || state.blacklist.has(pName)) {
          if (client && state.blacklist.has(pName)) {
              failures.push(`${pName}: En lista negra (Errores previos)`);
          }
          continue;
      }

      // Evitar Ollama en producción a menos que sea el preferido
      if (pName === "ollama" && process.env.NODE_ENV === "production" && this.preferred !== "ollama") continue;

      try {
        return await client.generate(prompt, agentName);
      } catch (error: any) {
        const msg = error.message || String(error);
        
        // Si Ollama no está corriendo y es el preferido, reportar explícitamente pero seguir con fallback
        if (msg.includes("OLLAMA_NOT_RUNNING")) {
            failures.push(`Ollama: No detectado localmente`);
        } else {
            failures.push(`${pName}: ${msg.substring(0, 60)}`);
        }
        
        console.error(`[AcademicEngine] Fallo en ${pName}: ${msg}`);
      }
    }

    const failureDetails = failures.map(f => `• ${f}`).join("\n");
    throw new Error(`CRÍTICO: No se pudo generar el contenido tras intentar con todos los proveedores.\n\nDETALLES DE FALLOS:\n${failureDetails}\n\nRECOMENDACIÓN: Si usas Ollama, verifica que esté abierto. Si usas Gemini/Groq, espera unos minutos por el límite de cuota.`);
  }

  async researcherAgent(topic: string, context: string): Promise<string> {
    const prompt = `Investiga bibliografía APA 7 y conceptos clave para: ${topic}. Contexto Institucional: ${context}. Responde en ESPAÑOL académico.`;
    return this.safeGenerate(prompt, "Investigador");
  }

  async writerAgent(section: string, research: string, data: any, context: string): Promise<string> {
    const prompt = `Redacta la sección "${section}" para una tesis de "${data.program}" titulada "${data.title}". 
    Usa estos datos de investigación: ${research}. 
    Contexto previo del documento: ${context || "N/A"}. 
    REGLAS: Tercera persona impersonal, ESPAÑOL académico, mínimo 300 palabras, tono "${data.tone || 'académico formal'}".`;
    return this.safeGenerate(prompt, "Redactor");
  }

  async auditorAgent(content: string, type: string): Promise<string> {
    const prompt = `Audita este texto de tesis (${type}): ${content}. 
    Busca errores de estilo (primera persona) y falta de citas. 
    Si está bien, responde 'APROBADO'. Si no, da sugerencias breves en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Auditor");
  }

  async humanizerAgent(content: string): Promise<string> {
    const prompt = `Humaniza este texto académico eliminando rastro de IA pero manteniendo la formalidad y el rigor: ${content}. 
    No acortes el texto, mejora la fluidez y conectores en ESPAÑOL.`;
    return this.safeGenerate(prompt, "Humanizador");
  }

  async generateStructuralPlan(data: any): Promise<string> {
    const prompt = `Diseña un índice detallado (Markdown) para una tesis de ${data.level} en ${data.program}. 
    Título: ${data.title}. Universidad: ${data.university}. 
    Escribe en ESPAÑOL con rigor académico.`;
    return this.safeGenerate(prompt, "Planificador");
  }
}
