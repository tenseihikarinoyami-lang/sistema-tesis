import { NextRequest, NextResponse } from 'next/server';
import { AcademicEngine } from '@/lib/academic-engine';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { projectId, chapter, formData, prevContent } = await req.json();
    const engine = new AcademicEngine(process.env.GEMINI_API_KEY || '');
    
    // 1. Research
    const research = await engine.researcherAgent(`${chapter} sobre: ${formData.title}`, formData.university);
    
    // 2. Write
    const draft = await engine.writerAgent(chapter, research, formData, prevContent);
    
    // 3. Audit
    const audit = await engine.auditorAgent(draft, formData.level || "TEG");
    
    // 4. Humanize
    const finalVersion = await engine.humanizerAgent(
      audit.includes("APROBADO") ? draft : `${draft}\n\nNota de Auditoría: ${audit}`
    );

    // Update Firestore
    const projectRef = adminDb.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (projectDoc.exists) {
      const currentContent = projectDoc.data()?.content || {};
      currentContent[chapter] = finalVersion;
      
      await projectRef.update({
        content: currentContent,
        current_phase: `Completado: ${chapter}`,
      });
    }

    return NextResponse.json({ 
      success: true, 
      content: finalVersion 
    });
  } catch (error: any) {
    console.error("Error in chapter generation API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
