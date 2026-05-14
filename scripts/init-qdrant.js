require('dotenv').config();
const { QdrantClient } = require('@qdrant/js-client-rest');

const COLLECTION = "thesis_context";

async function main() {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (!url) {
    console.error("❌ QDRANT_URL is not defined in .env");
    process.exit(1);
  }

  console.log(`🔍 Connecting to Qdrant at ${url}...`);
  const client = new QdrantClient({ url, apiKey });

  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION);

    if (!exists) {
      console.log(`🆕 Creating collection "${COLLECTION}"...`);
      await client.createCollection(COLLECTION, {
        vectors: { size: 384, distance: "Cosine" }
      });
      console.log(`✅ Collection "${COLLECTION}" created successfully.`);
    } else {
      console.log(`ℹ️ Collection "${COLLECTION}" already exists.`);
    }
  } catch (error) {
    console.error("❌ Error initializing Qdrant:", error);
    process.exit(1);
  }
}

main();
