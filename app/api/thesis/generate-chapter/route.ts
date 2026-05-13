import { NextRequest, NextResponse } from 'next/server';
import { AcademicEngine } from '@/lib/academic-engine';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const clientId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
  const rateLimit = checkRateLimit(clientId);
  const rateHeaders = getRateLimitHeaders(rateLimit);
  
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Límite de solicitudes alcanzado. Espera un momento." }, { status: 429, headers: rateHeaders });
  }
  
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { projectId, chapter, sectionTitle, formData, prevContent, step = 'all' } = body;
    const taskName = sectionTitle || chapter;
    console.log(`[${projectId}] Chapter API: Starting step "${step}" for "${taskName}"`);
    
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Configuración de IA faltante." }, { status: 500 });
    }

    // Usar openrouter por defecto, tal como lo pide el usuario (Llama 3 70B)
    const preferredModel = formData.aiModel || 'openrouter';

    const engine = new AcademicEngine(
      process.env.GEMINI_API_KEY,
      process.env.GROQ_API_KEY,
      process.env.OPENROUTER_API_KEY,
      preferredModel
    );
    const projectRef = adminDb.collection("projects").doc(projectId);
    
    try {
      let result: Record<string, unknown> = { success: true };
      
      // Step 1: Research
      if (step === 'all' || step === 'research') {
        console.log(`[${projectId}] [1/4] Researching...`);
        result.research = await engine.researcherAgent(`${taskName} sobre: ${formData.title}`, formData.university);
        if (step === 'research') return NextResponse.json(result);
      }
      
      // Step 2: Write
      if (step === 'all' || step === 'write') {
        const researchData = step === 'write' ? body.research : result.research;
        console.log(`[${projectId}] [2/4] Writing draft...`);
        result.draft = await engine.writerAgent(taskName, researchData || "", formData, prevContent);
        if (step === 'write') return NextResponse.json(result);
      }
      
      // Step 3: Audit
      if (step === 'all' || step === 'audit') {
        const draftData = step === 'audit' ? body.draft : result.draft;
        console.log(`[${projectId}] [3/4] Auditing...`);
        result.audit = await engine.auditorAgent(draftData || "", formData.level || "TEG");
        if (step === 'audit') return NextResponse.json(result);
      }
      
      // Step 4: Humanize
      if (step === 'all' || step === 'humanize') {
        const draft = step === 'humanize' ? body.draft : result.draft;
        const audit = step === 'humanize' ? body.audit : result.audit;
        
        console.log(`[${projectId}] [4/4] Humanizing...`);
        const finalVersion = await engine.humanizerAgent(
          audit?.includes("APROBADO") ? draft : `${draft}\n\nNota de Auditoría: ${audit}`
        );
        
        // Step 5: Visuals (Opcional pero recomendado)
        console.log(`[${projectId}] [5/5] Generating Visuals...`);
        const visuals = await engine.visualsAgent(finalVersion, taskName);
        
        result.finalVersion = visuals !== "SIN_VISUAL" ? `${finalVersion}\n\n${visuals}` : finalVersion;

        // Final step updates Firestore
        await projectRef.update({
          [`content.${taskName.replace(/\./g, '_')}`]: result.finalVersion,
          current_phase: `Completado: ${taskName}`,
          progress: FieldValue.increment(0.5) // Incremento pequeño por sección
        });
      }

      return NextResponse.json(result);
    } catch (aiError: unknown) {
      console.error(`[${projectId}] Chapter API Failure:`, aiError);
      const aiMsg: string = aiError instanceof Error ? aiError.message : String(aiError);
      const isRateLimit = aiMsg.includes("CUOTA_DIARIA_AGOTADA") || aiMsg.includes("LIMITE_ALCANZADO") || aiMsg.includes("429");
      return NextResponse.json({ 
        error: aiMsg || `Error en motor de IA durante ${chapter} (${step})`,
        timeElapsed: Date.now() - startTime
      }, { status: isRateLimit ? 429 : 500 });
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error fatal: " + errMsg }, { status: 500 });
  }
}
