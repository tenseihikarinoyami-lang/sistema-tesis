import dotenv from 'dotenv';
import { AcademicEngine } from '../lib/academic-engine.js'; // Note: might need to adjust based on build

dotenv.config();

async function diagnose() {
  console.log("=== DIAGNÓSTICO DEL MOTOR ACADÉMICO OBELISCO ===");
  console.log("Fecha:", new Date().toLocaleString());
  
  const keys = {
    GEMINI: process.env.GEMINI_API_KEY ? "CONFIGURADA (OK)" : "FALTANTE",
    GROQ: process.env.GROQ_API_KEY ? "CONFIGURADA (OK)" : "FALTANTE",
    OPENROUTER: process.env.OPENROUTER_API_KEY ? "CONFIGURADA (OK)" : "FALTANTE",
  };
  
  console.table(keys);
  
  const engine = new AcademicEngine(
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.OPENROUTER_API_KEY
  );

  const testPrompt = "Di 'Hola, soy el motor académico' en una sola línea.";
  
  console.log("\nProbando proveedores en orden de fallback...");
  
  // Test each one specifically if possible by temporarily changing preferredModel
  const providers = ["openrouter", "groq", "gemini"];
  
  for (const p of providers) {
    console.log(`\n--- Probando: ${p.toUpperCase()} ---`);
    try {
      // Create a temporary engine for this provider
      const testEngine = new AcademicEngine(
        p === 'gemini' ? process.env.GEMINI_API_KEY : undefined,
        p === 'groq' ? process.env.GROQ_API_KEY : undefined,
        p === 'openrouter' ? process.env.OPENROUTER_API_KEY : undefined,
        p
      );
      
      const start = Date.now();
      const res = await testEngine.researcherAgent("Test", "Diagnóstico");
      console.log(`[EXITO] Tiempo: ${Date.now() - start}ms`);
      console.log(`Respuesta: ${res.substring(0, 50)}...`);
    } catch (err) {
      console.error(`[FALLO] ${p.toUpperCase()}:`, err.message);
    }
  }
}

diagnose().catch(console.error);
