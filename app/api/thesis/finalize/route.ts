import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    
    const dbPromise = adminDb.collection("projects").doc(projectId).update({
      status: "completed",
      progress: 100,
      current_phase: "Tesis Finalizada"
    });
    
    await Promise.race([
      dbPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_DB: Firestore no respondió en 10 segundos.")), 10000))
    ]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
