import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";

export type AIProvider = "gemini" | "groq" | "openrouter" | "cohere" | "huggingface" | "replicate";

export interface AIROptions {
  maxTokens?: number;
  temperature?: number;
  section?: string;
  model?: string;
  preferredProvider?: AIProvider;
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 4000,
            temperature: options.temperature ?? 0.5,
          },
        });
        const response = await result.response;
        return response.text();
      },
    },
    {
      name: "groq",
      generate: async () => {
        if (!process.env.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const res = await groq.chat.completions.create({
          model: options.model || "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: options.maxTokens || 4000,
          temperature: options.temperature ?? 0.3,
        });
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
            model: options.model || "deepseek/deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: options.maxTokens || 4000,
            temperature: options.temperature ?? 0.4,
          }),
        });
        if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      },
    },
    {
      name: "cohere",
      generate: async () => {
        if (!process.env.COHERE_API_KEY) throw new Error("Missing COHERE_API_KEY");
        const res = await fetch("https://api.cohere.ai/v1/generate", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: options.model || "command-r-plus",
            prompt: prompt,
            max_tokens: options.maxTokens || 4000,
            temperature: options.temperature ?? 0.3,
          }),
        });
        if (!res.ok) throw new Error(`Cohere error: ${res.status}`);
        const data = await res.json();
        return data.generations?.[0]?.text || "";
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
        });
        if (!res.ok) throw new Error(`Replicate error: ${res.status}`);
        const data = await res.json();
        
        let prediction = data;
        let attempts = 0;
        while (prediction.status !== "succeeded" && attempts < 10) {
          await new Promise(r => setTimeout(r, 1000));
          const poll = await fetch(prediction.urls.get, {
            headers: { "Authorization": `Token ${process.env.REPLICATE_API_KEY}` }
          });
          prediction = await poll.json();
          attempts++;
        }
        return prediction.output?.join("") || "";
      }
    }
  ];

  // Reordenar proveedores según especialización y preferencia
  let orderedProviders = [...providers];
  
  const pref = options.preferredProvider;
  
  if (prompt.toLowerCase().includes("humanizador") || prompt.toLowerCase().includes("corrector de estilo")) {
    orderedProviders = [
      providers.find(p => p.name === "cohere")!,
      providers.find(p => p.name === "gemini")!,
      providers.find(p => p.name === "groq")!,
      providers.find(p => p.name === "replicate")!,
      providers.find(p => p.name === "huggingface")!,
      providers.find(p => p.name === "openrouter")!,
    ].filter(Boolean);
  } else if (pref) {
    // Si hay preferencia, ponerla primero
    const preferredObj = providers.find(p => p.name === pref);
    const others = providers.filter(p => p.name !== pref);
    orderedProviders = preferredObj ? [preferredObj, ...others] : providers;
  } else {
    orderedProviders = [
      providers.find(p => p.name === "gemini")!,
      providers.find(p => p.name === "groq")!,
      providers.find(p => p.name === "cohere")!,
      providers.find(p => p.name === "replicate")!,
      providers.find(p => p.name === "huggingface")!,
      providers.find(p => p.name === "openrouter")!,
    ].filter(Boolean);
  }

  const errors: string[] = [];
  let attempts = 0;
  const maxGlobalAttempts = 15; // Resistencia extrema para generación autónoma

  while (attempts < maxGlobalAttempts) {
    attempts++;
    for (const provider of orderedProviders) {
      try {
        console.log(`🔄 [Intento ${attempts}/${maxGlobalAttempts}] Probando con ${provider.name}...`);
        
        // Timeout de seguridad por proveedor
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT_PROVIDER")), 45000)
        );
        
        const result = await Promise.race([
          provider.generate(),
          timeoutPromise
        ]) as string;
        
        if (result && result.trim().length > 30) {
          console.log(`✅ [${provider.name}] Éxito en intento ${attempts}`);
          return { provider: provider.name, content: result };
        }
        throw new Error(`Respuesta vacía o insuficiente de ${provider.name}`);
      } catch (error: any) {
        const errMsg = error.message || "Error desconocido";
        console.warn(`❌ ${provider.name} falló (intento ${attempts}):`, errMsg);
        errors.push(`${provider.name} (Intento ${attempts}): ${errMsg}`);
        
        // Detectar errores de red o cuota para esperar
        const isRetryable = 
          errMsg.includes("429") || 
          errMsg.includes("503") ||
          errMsg.includes("500") ||
          errMsg.includes("504") ||
          errMsg.toLowerCase().includes("limit") ||
          errMsg.toLowerCase().includes("quota") ||
          errMsg.toLowerCase().includes("exhausted") ||
          errMsg.toLowerCase().includes("overloaded") ||
          errMsg.toLowerCase().includes("timeout") ||
          errMsg.toLowerCase().includes("fetch");

        if (isRetryable) {
          const waitTime = 2000 + (attempts * 1500); 
          console.log(`⏳ Error recuperable en ${provider.name}. Esperando ${waitTime}ms para el siguiente...`);
          await new Promise(r => setTimeout(r, waitTime));
        }
        
        // Si es el último proveedor de la lista, forzar una espera mayor
        if (provider === orderedProviders[orderedProviders.length - 1]) {
           const globalWait = 10000 + (attempts * 5000);
           console.log(`⚠️ Fin de ronda ${attempts}. Esperando ${globalWait}ms...`);
           await new Promise(r => setTimeout(r, globalWait));
        }
      }
    }
  }

  throw new Error(`QUOTA_LIMIT_EXHAUSTED: Tras ${maxGlobalAttempts} rondas, todos los servicios (Gemini, Groq, OpenRouter, Cohere, Replicate, HF) están saturados. El sistema intentará recuperarse automáticamente en breve. No detengas el proceso.`);
}
