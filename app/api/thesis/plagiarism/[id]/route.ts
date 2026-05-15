import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { AcademicEngine } from '@/lib/academic-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const projectRef = adminDb.collection("projects").doc(id);
    const doc = await projectRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    
    const projectData = doc.data() as any;
    
    // Concatenar el contenido de los capítulos para el análisis
    let fullContent = "";
    if (projectData.content && typeof projectData.content === 'object') {
      fullContent = Object.values(projectData.content)
        .filter((c) => typeof c === 'string')
        .join("\n\n");
    }
    
    if (!fullContent || fullContent.trim() === "") {
      return NextResponse.json({ error: "No hay contenido para analizar" }, { status: 400 });
    }

    const engine = new AcademicEngine();
    const report = await engine.plagiarismCheck(fullContent);
    
    // Guardar el reporte en Firebase
    await projectRef.update({
      plagiarism_report: report,
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json(report);
  } catch (error: any) {
    console.error("Error en análisis de plagio:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
