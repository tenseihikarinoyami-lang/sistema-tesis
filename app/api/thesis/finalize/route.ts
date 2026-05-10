import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    
    await adminDb.collection("projects").doc(projectId).update({
      status: "completed",
      progress: 100,
      current_phase: "Tesis Finalizada"
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
