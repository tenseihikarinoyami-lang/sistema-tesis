import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = await req.json();

    if (!uid || !role) {
      return NextResponse.json({ error: 'uid y role son requeridos' }, { status: 400 });
    }

    // Set custom claim
    await adminAuth.setCustomUserClaims(uid, { role });

    // Update Firestore
    await adminDb.collection('users').doc(uid).update({
      role,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
