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
      undefined,
      undefined,
      undefined,
      preferredModel
    );
    const projectRef = adminDb.collection("projects").doc(projectId);
    
    // Initialize result object to avoid ReferenceError
    const result: any = {
      research: '',
      draft: '',
      audit: '',
      finalVersion: '',
      visuals: ''
    };

    try {
      // Function to persist result and return
      const persistAndReturn = async (currentStep: string) => {
        try {
          const updateData: Record<string, any> = {
            last_updated: FieldValue.serverTimestamp(),
            [`steps.${taskName.replace(/\./g, '_')}`]: currentStep,
          };

          if (result.research) updateData[`research.${taskName.replace(/\./g, '_')}`] = result.research;
          if (result.draft) updateData[`drafts.${taskName.replace(/\./g, '_')}`] = result.draft;
          if (result.audit) updateData[`audits.${taskName.replace(/\./g, '_')}`] = result.audit;
          if (result.finalVersion) {
            updateData[`content.${taskName.replace(/\./g, '_')}`] = result.finalVersion;
            updateData.current_phase = `Completado: ${taskName}`;
          } else {
            updateData.current_phase = `Generando ${currentStep}: ${taskName}`;
          }

          await projectRef.update(updateData);
        } catch (dbError) {
          console.error(`[${projectId}] Database update failed (non-critical):`, dbError);
        }
        return NextResponse.json(result);
      }      // Step 0: Unified (QUOTA OPTIMIZER)
      if (step === 'all' || step === 'unified') {
        console.log(`[${projectId}] Running UNIFIED agent for "${taskName}"...`);
        const unifiedResult = await engine.unifiedAgent(
          taskName,
          formData,
          prevContent || "",
          projectId,
          req.signal
        );
        
        result.research = unifiedResult.research;
        result.draft = unifiedResult.content;
        result.visuals = unifiedResult.visuals;
        
        // El contenido final inicial es el borrador + visuales si existen
        result.finalVersion = result.visuals !== "SIN_VISUAL" 
          ? `${result.draft}\n\n${result.visuals}` 
          : result.draft;

        // Si es 'all' o 'unified', ya tenemos lo básico. 
        // En modo 'all' podríamos querer auditar/humanizar extra, pero para máxima robustez y ahorro
        // vamos a considerar 'unified' como suficiente si el prompt ya incluye esas instrucciones.
        if (step === 'unified' || step === 'all') return await persistAndReturn(step);
      }
      
      // Los pasos individuales se mantienen por si se llaman específicamente (ej. re-generar solo visuales)
      
      // Step 1: Research
      if (step === 'research') {
        console.log(`[${projectId}] [1/5] Researching...`);
        const aiPromise = engine.researcherAgent(`${taskName} sobre: ${formData.title}`, formData.university || "Institución Académica", req.signal);
        result.research = await Promise.race([
          aiPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_AI: La investigación tardó más de 90 segundos.")), 90000))
        ]);
        return await persistAndReturn('research');
      }
      
      // Step 2: Write
      if (step === 'write') {
        const researchData = body.research || result.research;
        console.log(`[${projectId}] [2/5] Writing draft with RAG context...`);
        const aiPromise = engine.writerAgent(taskName, researchData || "", formData, prevContent || "", projectId, req.signal);
        result.draft = await Promise.race([
          aiPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_AI: La redacción tardó más de 90 segundos.")), 90000))
        ]);
        return await persistAndReturn('write');
      }
      
      // Step 3: Audit
      if (step === 'audit') {
        const draftData = body.draft || result.draft;
        console.log(`[${projectId}] [3/5] Auditing...`);
        const aiPromise = engine.auditorAgent(draftData || "", formData.level || "TEG", req.signal);
        result.audit = await Promise.race([
          aiPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_AI: La auditoría tardó más de 90 segundos.")), 90000))
        ]);
        return await persistAndReturn('audit');
      }
      
      // Step 4: Humanize
      if (step === 'humanize') {
        const draft = body.draft || result.draft || "";
        const audit = body.audit || result.audit || "";
        
        console.log(`[${projectId}] [4/5] Humanizing "${taskName}"...`);
        const aiPromise = engine.humanizerAgent(
          audit.includes("APROBADO") ? draft : `${draft}\n\nNota de Auditoría: ${audit}`,
          req.signal
        );
        const finalVersion = await Promise.race([
          aiPromise,
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_AI: El pulido tardó más de 90 segundos.")), 90000))
        ]);
        
        result.finalVersion = finalVersion;
        return await persistAndReturn('humanize');
      }

      // Step 5: Visuals
      if (step === 'visuals') {
        const contentForVisuals = body.content || result.finalVersion;
        console.log(`[${projectId}] [5/5] Generating Visuals for "${taskName}"...`);
        const visualsPromise = engine.visualsAgent(contentForVisuals || "", taskName, req.signal);
        const visuals = await Promise.race([
          visualsPromise,
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_AI: Los visuales tardaron más de 45 segundos.")), 45000))
        ]);
        
        result.visuals = visuals;
        if (visuals !== "SIN_VISUAL") {
          result.finalVersion = `${contentForVisuals}\n\n${visuals}`;
        } else {
          result.finalVersion = contentForVisuals;
        }
        
        return await persistAndReturn('visuals');
      }

      // PERSISTENCIA FINAL
      return await persistAndReturn('done');
    } catch (aiError: unknown) {
(aiError: unknown) {
      console.error(`[${projectId}] Chapter API Failure:`, aiError);
      const aiMsg: string = aiError instanceof Error ? aiError.message : String(aiError);
      
      const isQuotaError = aiMsg.includes("QUOTA_LIMIT_EXHAUSTED") || 
                           aiMsg.includes("429") || 
                           aiMsg.toLowerCase().includes("quota") || 
                           aiMsg.toLowerCase().includes("rate limit") || 
                           aiMsg.toLowerCase().includes("exhausted") ||
                           aiMsg.toLowerCase().includes("overloaded");

      let userMessage = aiMsg;
      if (aiMsg.includes("QUOTA_LIMIT_EXHAUSTED")) {
        userMessage = "⚠️ Los servicios de IA están saturados en este momento. Hemos intentado con todos los proveedores disponibles sin éxito. Por favor, intenta de nuevo en unos minutos o cambia el proveedor preferido en la configuración.";
      } else if (aiMsg.includes("TIMEOUT_AI")) {
        userMessage = "⏳ La IA tardó demasiado en responder. Este tema es complejo; por favor intenta re-generar solo esta sección.";
      }

      return NextResponse.json({ 
        error: userMessage,
        details: aiMsg,
        timeElapsed: Date.now() - startTime
      }, { status: isQuotaError ? 429 : 500 });
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Error fatal: " + errMsg }, { status: 500 });
  }
}
