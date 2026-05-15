import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";

export type AIProvider = "gemini" | "groq" | "openrouter" | "cohere" | "huggingface" | "replicate";

export interface AIROptions {
  maxTokens?: number;
  temperature?: number;
  section?: string;
  model?: string;
  preferredProvider?: AIProvider;
  signal?: AbortSignal;
}

// Registro global de proveedores degradados (403 Forbidden) para evitar reintentos inútiles
declare global {
  var __degradedAIProviders: Set<string> | undefined;
}

const degradedProviders = global.__degradedAIProviders || (global.__degradedAIProviders = new Set());

// Función de ayuda para reintentos con exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 2, // Reducido de 3 a 2 para rotar proveedores más rápido
  initialDelay: number = 1500,
  providerName: string = "unknown",
  signal?: AbortSignal
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (signal?.aborted) throw new Error("AbortError");
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errMsg = error.message || "";
      
      // Si es un error fatal (403, 401, 400), no reintentar
      if (
        errMsg.includes("403") || 
        errMsg.includes("401") || 
        errMsg.includes("400") || 
        errMsg.toLowerCase().includes("blocked") ||
        errMsg.toLowerCase().includes("invalid_api_key")
      ) {
        throw error;
      }

      // Si es el último intento, no esperar
      if (attempt === maxAttempts) break;

      // Calcular delay
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️ [${providerName}] Intento ${attempt} fallido. Reintentando en ${delay}ms...`);
      
      await new Promise(resolve => {
        const timer = setTimeout(resolve, delay);
        signal?.addEventListener('abort', () => clearTimeout(timer));
      });
    }
  }
  throw lastError;
}

export async function generateWithFallback(
  prompt: string,
  options: AIROptions = {}
) {
  const providers: Array<{
    name: AIProvider;
    generate: () => Promise<string>;
  }> = [
    {
      name: "gemini",
      generate: async () => {
        if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Usar gemini-2.0-flash para velocidad y cuota, o pro para calidad
        const model = genAI.getGenerativeModel({ model: options.model || "gemini-2.0-flash" });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 4000,
            temperature: options.temperature ?? 0.5,
          },
        }, options.signal ? { signal: options.signal } : undefined);
        const response = await result.response;
        return response.text();
      },
    },
    {
      name: "groq",
      generate: async () => {
        if (!process.env.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const reqOptions: any = {
          model: options.model || "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature ?? 0.3,
        };
        const res = await groq.chat.completions.create(reqOptions, options.signal ? { signal: options.signal } : undefined);
        return res.choices[0]?.message?.content || "";
      },
    },
    {
      name: "openrouter",
      generate: async () => {
        if (!process.env.OPENROUTER_API_KEY) throw new Error("Missing OPENROUTER_API_KEY");
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://obelisco-ai.vercel.app",
            "X-Title": "ThesisForge Academic",
          },
          body: JSON.stringify({
            model: options.model || "qwen/qwen-2.5-72b-instruct",
            messages: [{ role: "user", content: prompt }],
            max_tokens: options.maxTokens || 4000,
            temperature: options.temperature ?? 0.4,
          }),
          signal: options.signal,
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(`OpenRouter error (${res.status}): ${JSON.stringify(errorData.error || errorData)}`);
        }
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      },
    },
    {
      name: "cohere",
      generate: async () => {
        if (!process.env.COHERE_API_KEY) throw new Error("Missing COHERE_API_KEY");
        const res = await fetch("https://api.cohere.com/v1/chat", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: options.model || "command-r-plus-08-2024",
            message: prompt,
            max_tokens: options.maxTokens || 4000,
            temperature: options.temperature ?? 0.3,
          }),
          signal: options.signal,
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(`Cohere error (${res.status}): ${errorData.message || JSON.stringify(errorData)}`);
        }
        const data = await res.json();
        return data.text || "";
      },
    },
    {
      name: "huggingface",
      generate: async () => {
        if (!process.env.HUGGINGFACE_API_KEY) throw new Error("Missing HUGGINGFACE_API_KEY");
        const res = await fetch(`https://api-inference.huggingface.co/models/${options.model || "meta-llama/Llama-3.1-70B-Instruct"}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: options.maxTokens || 2048,
              temperature: options.temperature ?? 0.5,
            }
          }),
          signal: options.signal,
        });
        if (!res.ok) throw new Error(`HuggingFace error: ${res.status}`);
        const data = await res.json();
        return data[0]?.generated_text || data.generated_text || "";
      },
    },
    {
      name: "replicate",
      generate: async () => {
        if (!process.env.REPLICATE_API_KEY) throw new Error("Missing REPLICATE_API_KEY");
        const res = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${process.env.REPLICATE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "a1653c0f41b37537b986cf33e55ad03cf970ef9a37e8992e5c9498a3b839178f", // Llama-3-70b-instruct
            input: {
              prompt: prompt,
              max_new_tokens: options.maxTokens || 2048,
              temperature: options.temperature ?? 0.5,
            }
          }),
          signal: options.signal,
        });
        if (!res.ok) throw new Error(`Replicate error: ${res.status}`);
        const data = await res.json();
        
        let prediction = data;
        let attempts = 0;
        while (prediction.status !== "succeeded" && attempts < 10) {
          await new Promise(r => setTimeout(r, 1000));
          const poll = await fetch(prediction.urls.get, {
            headers: { "Authorization": `Token ${process.env.REPLICATE_API_KEY}` },
            signal: options.signal,
          });
          prediction = await poll.json();
          attempts++;
        }
        return prediction.output?.join("") || "";
      }
    }
  ];

  // Reordenar proveedores: Gemini es ahora el primario por alta cuota y calidad
  let orderedProviders = [];
  
  const pref = options.preferredProvider;
  
  if (prompt.toLowerCase().includes("humanizador") || prompt.toLowerCase().includes("corrector de estilo")) {
    orderedProviders = [
      providers.find(p => p.name === "cohere")!,
      providers.find(p => p.name === "gemini")!,
      providers.find(p => p.name === "groq")!,
      providers.find(p => p.name === "openrouter")!,
      providers.find(p => p.name === "replicate")!,
      providers.find(p => p.name === "huggingface")!,
    ].filter(Boolean);
  } else if (pref) {
    const preferredObj = providers.find(p => p.name === pref);
    const others = providers.filter(p => p.name !== pref);
    orderedProviders = preferredObj ? [preferredObj, ...others] : providers;
  } else {
    // Orden optimizado 2024: Gemini > Groq > OpenRouter > Cohere > Replicate
    orderedProviders = [
      providers.find(p => p.name === "gemini")!,
      providers.find(p => p.name === "groq")!,
      providers.find(p => p.name === "openrouter")!,
      providers.find(p => p.name === "cohere")!,
      providers.find(p => p.name === "replicate")!,
      providers.find(p => p.name === "huggingface")!,
    ].filter(Boolean);
  }

  const errors: string[] = [];

  for (const provider of orderedProviders) {
    // Si el proveedor está marcado como bloqueado permanentemente (403), saltarlo
    if (degradedProviders.has(provider.name)) {
      console.log(`⏩ Saltando ${provider.name} (marcado como bloqueado/403)`);
      continue;
    }

    try {
      console.log(`🔄 Probando con ${provider.name}...`);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT_PROVIDER")), 60000) // Aumentado a 60s
      );
      
      // Envolver la generación con reintentos automáticos
      const result = await Promise.race([
        retryWithBackoff(
          provider.generate, 
          3, 
          2500, 
          provider.name, 
          options.signal
        ),
        timeoutPromise
      ]) as string;
      
      if (result && result.trim().length > 30) {
        console.log(`✅ [${provider.name}] Éxito`);
        return { provider: provider.name, content: result };
      }
      throw new Error(`Respuesta insuficiente de ${provider.name}`);
    } catch (error: any) {
      if (error.name === 'AbortError' || options.signal?.aborted || error.message === "AbortError") throw error;
      
      const errMsg = error.message || "Error desconocido";
      console.warn(`❌ ${provider.name} falló tras reintentos:`, errMsg);
      
      // Manejo específico de errores fatales
      if (
        errMsg.includes("403") || 
        errMsg.toLowerCase().includes("blocked") || 
        errMsg.toLowerCase().includes("permission") ||
        errMsg.toLowerCase().includes("unsupported_location")
      ) {
        console.error(`🚩 Proveedor ${provider.name} bloqueado o no disponible regionalmente. Añadiendo a blacklist.`);
        degradedProviders.add(provider.name);
      }

      errors.push(`${provider.name}: ${errMsg}`);
    }
  }

  throw new Error(`QUOTA_LIMIT_EXHAUSTED: Todos los servicios de IA están saturados o bloqueados. Errores: ${errors.join(" | ")}`);
}
