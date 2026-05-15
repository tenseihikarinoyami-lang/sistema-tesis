import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = "thesis_context";

// Singleton client
let client: QdrantClient | null = null;

function getClient() {
  if (!client && process.env.QDRANT_URL) {
    client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return client;
}

async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.warn("Hugging Face API key not found, using fallback placeholder vector");
    return Array(384).fill(0).map((_, i) => (text.charCodeAt(i % text.length) / 255));
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
      {
        headers: { 
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      }
    );

    if (!response.ok) {
      throw new Error(`HF API error: ${response.statusText}`);
    }

    const result = await response.json();
    // all-MiniLM-L6-v2 devuelve un array simple de números si se envía un string, 
    // o un array de arrays si se envía una lista.
    return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return Array(384).fill(0).map((_, i) => (text.charCodeAt(i % text.length) / 255));
  }
}

export async function storeThesisChunk(
  projectId: string,
  chapter: string,
  content: string,
  metadata: Record<string, any> = {}
) {
  const qdrant = getClient();
  if (!qdrant) {
    console.warn("Qdrant not configured, skipping vector storage");
    return;
  }

  try {
    const vector = await generateEmbedding(content);
    
    await qdrant.upsert(COLLECTION, {
      wait: true,
      points: [{
        id: crypto.randomUUID(), 
        vector,
        payload: { 
          projectId, 
          chapter, 
          content, 
          ...metadata, 
          timestamp: new Date().toISOString() 
        },
      }],
    });
    console.log(`✅ Chunk stored in vector memory: ${chapter}`);
  } catch (error) {
    console.error("Failed to store thesis chunk in Qdrant:", error);
  }
}

export async function retrieveRelevantContext(
  projectId: string,
  query: string,
  limit: number = 3
) {
  const qdrant = getClient();
  if (!qdrant) return [];

  try {
    const vector = await generateEmbedding(query);

    const results = await qdrant.search(COLLECTION, {
      vector,
      filter: {
        must: [{ key: "projectId", match: { value: projectId } }]
      },
      limit,
      with_payload: true,
    });

    return results.map(r => ({
      chapter: r.payload?.chapter as string,
      content: r.payload?.content as string,
      metadata: r.payload,
    }));
  } catch (error) {
    console.error("Failed to retrieve context from Qdrant:", error);
    return [];
  }
}

/**
 * Inicializa la colección si no existe
 */
export async function initVectorDb() {
  const qdrant = getClient();
  if (!qdrant) return;

  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION);
    
    if (!exists) {
      await qdrant.createCollection(COLLECTION, {
        vectors: { size: 384, distance: "Cosine" }
      });
      console.log(`Collection ${COLLECTION} created in Qdrant.`);
    }
  } catch (error) {
    console.error("Error initializing Qdrant:", error);
  }
}

