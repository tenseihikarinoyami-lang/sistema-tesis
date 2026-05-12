import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const doc = await adminDb.collection("projects").doc(id).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }
    
    return NextResponse.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching project status:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
