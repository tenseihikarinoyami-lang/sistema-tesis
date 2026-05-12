/**
 * lib/firebase-admin.ts
 *
 * Lazy Firebase Admin SDK. The SDK initializes only on first method call
 * at RUNTIME — never during the Next.js build phase.
 */
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';

let _app: admin.app.App | null = null;

function getApp(): admin.app.App {
  if (_app) return _app;
  if (admin.apps.length > 0) {
    _app = admin.apps[0]!;
    return _app;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      _app = admin.initializeApp({ credential: admin.credential.cert(sa) });
      return _app;
    } catch (err) {
      console.error('[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:', err);
    }
  }

  // Build-time fallback — no real operations will succeed, but the module loads cleanly.
  _app = admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'thesisforge-ai-obelisco',
  });
  return _app;
}

/**
 * Creates a transparent Proxy that forwards every property access to the real
 * SDK instance, resolved lazily. Methods are automatically bound to the real
 * instance so `this` is always correct.
 */
function lazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = getInstance();
      const value = Reflect.get(instance, prop);
      if (typeof value === 'function') {
        return value.bind(instance);
      }
      return value;
    },
    set(_target, prop, value) {
      return Reflect.set(getInstance(), prop, value);
    },
  });
}

export const adminDb: Firestore = lazyProxy(() => getApp().firestore());
export const adminAuth: Auth = lazyProxy(() => getApp().auth());
export { admin };
