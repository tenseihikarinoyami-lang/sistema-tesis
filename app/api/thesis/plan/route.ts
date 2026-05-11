import { NextRequest, NextResponse } from 'next/server';
import { AcademicEngine } from '@/lib/academic-engine';
import { adminDb } from '@/lib/firebase-admin';

// Vercel Timeout Adjustment
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log("Plan API: Received request data:", { ...data, author: "REDACTED" });
    
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
      console.error("Plan API: No AI API keys configured!");
      return NextResponse.json({ error: "Configuración de IA faltante (API Key)." }, { status: 500 });
    }

    const engine = new AcademicEngine(
      process.env.GEMINI_API_KEY,
      process.env.GROQ_API_KEY
    );
    
    console.log("Plan API: Generating structural plan...");
    let plan;
    try {
      plan = await engine.generateStructuralPlan(data);
      console.log("Plan API: Structural plan generated successfully.");
    } catch (aiError: any) {
      console.error("Plan API: Error generating plan with Gemini:", aiError);
      const aiMsg: string = aiError?.message || "";
      const isRateLimit = aiMsg.includes("CUOTA_DIARIA_AGOTADA") || aiMsg.includes("LIMITE_ALCANZADO") || aiMsg.includes("429");
      return NextResponse.json({ 
        error: aiMsg || "Error en el motor de IA",
        details: aiError.toString()
      }, { status: isRateLimit ? 429 : 500 });
    }
    
    const project_id = `proj_${Math.floor(Math.random() * 90000) + 10000}`;
    
    if (!data.ownerId) {
      console.warn("Plan API: ownerId is missing, using 'anonymous' for now.");
    }
    
    const projectData = {
      id: project_id,
      ownerId: data.ownerId || 'anonymous',
      title: data.title,
      university: data.university,
      author: data.author,
      status: "processing",
      progress: 5,
      current_phase: "Planificación Estructural",
      created_at: new Date().toISOString(),
      plan: plan,
      content: { "Plan de Investigación": plan }
    };

    console.log("Plan API: Saving project to Firestore...", project_id);
    try {
      await adminDb.collection("projects").doc(project_id).set(projectData);
      console.log("Plan API: Project saved successfully.");
    } catch (dbError: any) {
      console.error("Plan API: Error saving to Firestore:", dbError);
      return NextResponse.json({ 
        error: "Error al guardar en base de datos: " + (dbError.message || "Desconocido"),
        details: dbError.toString()
      }, { status: 500 });
    }

    return NextResponse.json({ 
      project_id, 
      plan,
      message: "Plan estructural generado." 
    });
  } catch (error: any) {
    console.error("Plan API: Unexpected error:", error);
    return NextResponse.json({ error: "Error inesperado: " + error.message }, { status: 500 });
  }
}
