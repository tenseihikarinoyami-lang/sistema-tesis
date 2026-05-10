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
  } catch (error: any) {
    console.error("Error fetching project status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
