
import { AcademicEngine } from './lib/academic-engine.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const engine = new AcademicEngine(
      process.env.GEMINI_API_KEY,
      process.env.GROQ_API_KEY,
      process.env.OPENROUTER_API_KEY,
      "openrouter"
    );
    console.log("Engine initialized. Testing safeGenerate...");
    // @ts-ignore - reaching into private method for testing
    const res = await engine.safeGenerate("Hola", "TestAgent");
    console.log("Result:", res);
  } catch (e) {
    console.error("FAILED:", e);
  }
}

test();
