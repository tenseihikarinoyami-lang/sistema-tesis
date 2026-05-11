import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { email, password, displayName, role, expirationDays } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || '',
      disabled: false,
    });

    // Set custom claims for role
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: role || 'researcher' });

    // Calculate expiration date
    let expiresAt: string | null = null;
    if (expirationDays && expirationDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + Number(expirationDays));
      expiresAt = expDate.toISOString();
    }

    // Save to Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      email,
      displayName: displayName || '',
      role: role || 'researcher',
      status: 'active',
      expiresAt,
      expirationDays: expirationDays || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      uid: userRecord.uid,
      email: userRecord.email,
      expiresAt,
      message: 'Usuario creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    const msg = error.code === 'auth/email-already-exists'
      ? 'Ya existe una cuenta con ese correo electrónico'
      : error.message || 'Error al crear usuario';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
