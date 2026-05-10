import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await adminDb.collection("projects").doc(params.id).delete();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
