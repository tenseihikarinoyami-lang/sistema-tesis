
import { AcademicEngine } from '../lib/academic-engine.ts';
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
    console.log("Engine initialized. Generating Structural Plan...");
    const res = await engine.generateStructuralPlan({
      title: "Impacto de la IA en la Educación Superior",
      university: "Universidad Central de Venezuela",
      faculty: "Ciencias",
      program: "Computación",
      level: "Licenciatura",
      description: "Un estudio sobre cómo los LLMs están cambiando la forma en que los estudiantes aprenden programación."
    });
    console.log("SUCCESS! Plan length:", res.length);
    console.log("Plan preview:", res.substring(0, 200));
  } catch (e) {
    console.error("FAILED COMPLETELY:", e);
  }
}

test();
