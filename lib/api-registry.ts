/**
 * API Registry - OBELISCO v2.0 (MODO GRATUITO)
 * Lista de APIs que tienen planes gratuitos o de prueba (Trial) sin pago obligatorio inicial.
 */

export interface APIRegistryStatus {
  name: string;
  category: "LLM" | "Academic" | "Writing" | "Storage";
  isConfigured: boolean;
  tier: "Free" | "Free Trial" | "Open Access";
  description: string;
}

export function getAPIRegistryStatus(): APIRegistryStatus[] {
  return [
    {
      name: "Google Gemini",
      category: "LLM",
      isConfigured: !!process.env.GEMINI_API_KEY,
      tier: "Free",
      description: "Proveedor principal (1.5k req/día)."
    },
    {
      name: "Groq",
      category: "LLM",
      isConfigured: !!process.env.GROQ_API_KEY,
      tier: "Free",
      description: "Máxima velocidad para borradores (Llama 3)."
    },
    {
      name: "OpenRouter",
      category: "LLM",
      isConfigured: !!process.env.OPENROUTER_API_KEY,
      tier: "Free",
      description: "Acceso a DeepSeek y otros modelos abiertos."
    },
    {
      name: "Cohere",
      category: "LLM",
      isConfigured: !!process.env.COHERE_API_KEY,
      tier: "Free Trial",
      description: "Especialista en estilo académico."
    },
    {
      name: "Hugging Face",
      category: "LLM",
      isConfigured: !!process.env.HUGGINGFACE_API_KEY,
      tier: "Free",
      description: "Modelos open-source vía Inference API."
    },
    {
      name: "Replicate",
      category: "LLM",
      isConfigured: !!process.env.REPLICATE_API_KEY,
      tier: "Free Trial",
      description: "Modelos avanzados vía API (Llama 3 70B)."
    },
    {
      name: "Semantic Scholar",
      category: "Academic",
      isConfigured: true,
      tier: "Free",
      description: "Búsqueda académica sin costo."
    },
    {
      name: "arXiv",
      category: "Academic",
      isConfigured: true,
      tier: "Open Access",
      description: "Repositorio de preprints libre."
    },
    {
      name: "Crossref",
      category: "Academic",
      isConfigured: true,
      tier: "Open Access",
      description: "Metadata de DOIs gratuita."
    }
  ];
}
