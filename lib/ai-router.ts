import { GoogleGenerativeAI } from "@google/generative-ai";
import { Groq } from "groq-sdk";

export type AIProvider = "gemini" | "groq" | "openrouter" | "cohere" | "huggingface" | "replicate";

export interface AIROptions {
  maxTokens?: number;
  temperature?: number;
  section?: string;
  model?: string;
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

  // Reordenar proveedores según especialización
  let orderedProviders = [...providers];
  
  if (prompt.toLowerCase().includes("humanizador") || prompt.toLowerCase().includes("corrector de estilo")) {
    orderedProviders = [
      providers.find(p => p.name === "cohere")!,
      providers.find(p => p.name === "gemini")!,
      providers.find(p => p.name === "groq")!,
      providers.find(p => p.name === "replicate")!,
      providers.find(p => p.name === "huggingface")!,
      providers.find(p => p.name === "openrouter")!,
    ].filter(Boolean);
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
  for (const provider of orderedProviders) {
    try {
      console.log(`🔄 Intentando con ${provider.name}...`);
      const result = await provider.generate();
      if (result && result.trim().length > 50) {
        return { provider: provider.name, content: result };
      }
      throw new Error(`Respuesta vacía o muy corta de ${provider.name}`);
    } catch (error: any) {
      console.warn(`❌ ${provider.name} falló:`, error.message);
      errors.push(`${provider.name}: ${error.message}`);
      continue;
    }
  }
  throw new Error(`Todos los proveedores de IA fallaron:\n${errors.join("\n")}`);
}
