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
    // En una implementación real, aquí generaríamos un embedding real usando OpenAI o Transformers
    // Por ahora, usamos un vector determinista basado en el contenido para el placeholder
    const vector = Array(384).fill(0).map((_, i) => (content.charCodeAt(i % content.length) / 255));
    
    const id = `${projectId}_${chapter.replace(/\s+/g, '_')}_${Date.now()}`;
    
    await qdrant.upsert(COLLECTION, {
      wait: true,
      points: [{
        id: Math.random().toString(36).substring(7), // Qdrant prefiere UUID o int, pero aceptamos strings en JS SDK a veces
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
    // Generar vector placeholder (debe coincidir con la lógica de store)
    const vector = Array(384).fill(0).map((_, i) => (query.charCodeAt(i % query.length) / 255));

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
