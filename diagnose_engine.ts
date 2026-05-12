import { AcademicEngine } from './lib/academic-engine.ts';
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar .env.local explícitamente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function diagnose() {
  console.log("--- INICIANDO DIAGNÓSTICO DEL MOTOR ACADÉMICO ---");
  console.log("Variables de entorno detectadas:");
  console.log("- GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "CONFIGURADA" : "FALTA");
  console.log("- GROQ_API_KEY:", process.env.GROQ_API_KEY ? "CONFIGURADA" : "FALTA");
  console.log("- OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "CONFIGURADA" : "FALTA");
  console.log("- NODE_ENV:", process.env.NODE_ENV || "development");

  const engine = new AcademicEngine(
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.OPENROUTER_API_KEY,
    "openrouter" // Preferencia por defecto
  );

  const testTopic = "La inteligencia artificial en la educación superior";
  
  console.log("\nProbando generación de plan estructural...");
  try {
    const plan = await engine.generateStructuralPlan({
      title: "Impacto de la IA en el aprendizaje",
      program: "Educación",
      level: "Maestría",
      university: "Universidad Nacional"
    });
    console.log("✅ PLAN GENERADO CON ÉXITO");
    console.log("Resumen del plan:", plan.substring(0, 100) + "...");
  } catch (error: any) {
    console.error("❌ ERROR EN GENERACIÓN DE PLAN:");
    console.error(error.message);
  }

  console.log("\n--- DIAGNÓSTICO FINALIZADO ---");
}

diagnose();
