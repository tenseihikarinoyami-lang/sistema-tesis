import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { uid, newPassword } = await req.json();

    if (!uid || !newPassword) {
      return NextResponse.json({ error: 'uid y newPassword son requeridos' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    // Update password in Firebase Auth
    await adminAuth.updateUser(uid, { password: newPassword });

    // Log update in Firestore
    await adminDb.collection('users').doc(uid).update({
      passwordChangedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
