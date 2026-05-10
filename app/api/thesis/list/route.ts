import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const snapshot = await adminDb.collection("projects").orderBy("created_at", "desc").get();
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Error listing projects:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
