import { NextRequest, NextResponse } from 'next/server';
import { AcademicEngine } from '@/lib/academic-engine';
import { adminDb } from '@/lib/firebase-admin';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
  const rateLimit = checkRateLimit(clientId);
  const rateHeaders = getRateLimitHeaders(rateLimit);
  
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Límite de solicitudes alcanzado. Espera un momento." }, { status: 429, headers: rateHeaders });
  }
  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.title || !data.university || !data.author) {
      return NextResponse.json({ error: "Faltan campos requeridos: título, universidad o autor" }, { status: 400 });
    }
    
    console.log("Plan API: Received request data:", { ...data, author: "REDACTED" });
    
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
      console.error("Plan API: No AI API keys configured!");
      return NextResponse.json({ error: "Configuración de IA faltante (API Key)." }, { status: 500 });
    }

    const preferredModel = data.aiModel || 'openrouter';

    const engine = new AcademicEngine(
      process.env.GEMINI_API_KEY,
      process.env.GROQ_API_KEY,
      process.env.OPENROUTER_API_KEY,
      preferredModel
    );
    
    console.log("Plan API: Generating structural plan...");
    let plan;
    try {
      plan = await engine.generateStructuralPlan(data);
      console.log("Plan API: Structural plan generated successfully.");
    } catch (aiError: unknown) {
      console.error("Plan API: Error en motor de IA:", aiError);
      const aiMsg: string = aiError instanceof Error ? aiError.message : String(aiError);
      const isRateLimit = aiMsg.includes("CUOTA_DIARIA_AGOTADA") || aiMsg.includes("LIMITE_ALCANZADO") || aiMsg.includes("429");
      const isRegionalBlock = aiMsg.includes("403") || aiMsg.includes("Access denied");
      const isAuthError = aiMsg.includes("AUTH_ERROR") || aiMsg.includes("401");
      
      let status = 500;
      if (isRateLimit) status = 429;
      if (isRegionalBlock) status = 403;
      if (isAuthError) status = 401;

      return NextResponse.json({ 
        error: isRegionalBlock ? "Bloqueo Regional: El proveedor de IA no está disponible en tu ubicación. Usa OpenRouter." : (aiMsg || "Error crítico en el motor de IA"),
        details: String(aiError)
      }, { status });
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
    } catch (dbError: unknown) {
      console.error("Plan API: Error saving to Firestore:", dbError);
      const errMsg = dbError instanceof Error ? dbError.message : "Desconocido";
      return NextResponse.json({ 
        error: "Error al guardar en base de datos: " + errMsg,
        details: String(dbError)
      }, { status: 500 });
    }

    return NextResponse.json({ 
      project_id, 
      plan,
      message: "Plan estructural generado." 
    });
  } catch (error: unknown) {
    console.error("Plan API: Unexpected error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error inesperado: " + errMsg }, { status: 500 });
  }
}
