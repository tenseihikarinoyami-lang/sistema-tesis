import { NextRequest, NextResponse } from 'next/server';
import { AcademicEngine } from '@/lib/academic-engine';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const engine = new AcademicEngine(process.env.GEMINI_API_KEY || '');
    
    const plan = await engine.generateStructuralPlan(data);
    
    const project_id = `proj_${Math.floor(Math.random() * 90000) + 10000}`;
    
    const projectData = {
      id: project_id,
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

    await adminDb.collection("projects").doc(project_id).set(projectData);

    return NextResponse.json({ 
      project_id, 
      plan,
      message: "Plan estructural generado." 
    });
  } catch (error: any) {
    console.error("Error in plan API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
