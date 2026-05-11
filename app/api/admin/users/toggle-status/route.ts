import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { uid, status } = await req.json();

    if (!uid || !status) {
      return NextResponse.json({ error: 'uid y status son requeridos' }, { status: 400 });
    }

    const disabled = status === 'disabled';

    // Update Firebase Auth
    await adminAuth.updateUser(uid, { disabled });

    // Update Firestore
    await adminDb.collection('users').doc(uid).update({
      status,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('Error toggling status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
