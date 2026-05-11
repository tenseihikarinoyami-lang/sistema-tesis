import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: 'UID requerido' }, { status: 400 });
    }

    // Delete from Firebase Auth
    await adminAuth.deleteUser(uid);

    // Delete from Firestore
    await adminDb.collection('users').doc(uid).delete();

    return NextResponse.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
