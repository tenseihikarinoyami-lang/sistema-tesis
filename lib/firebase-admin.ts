/**
 * firebase-admin.ts
 *
 * Lazy initialization of Firebase Admin SDK.
 * The SDK is only initialized when a getter is first called at RUNTIME,
 * NOT at module import time. This prevents build-time crashes on Vercel
 * when FIREBASE_SERVICE_ACCOUNT is not available during the build phase.
 */
import * as admin from 'firebase-admin';

let _app: admin.app.App | null = null;

function getApp(): admin.app.App {
  if (_app) return _app;

  // Reuse existing app if already initialized (e.g. hot-reload in dev)
  if (admin.apps.length > 0) {
    _app = admin.apps[0]!;
    return _app;
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      _app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      return _app;
    } catch (err) {
      console.error('[firebase-admin] Could not parse FIREBASE_SERVICE_ACCOUNT:', err);
    }
  }

  // Fallback used only at build time — no real operations will succeed,
  // but the module will import without throwing.
  _app = admin.initializeApp({
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'thesisforge-ai-obelisco',
  });
  return _app;
}

/**
 * Return the real Firestore instance (lazy).
 * Use this everywhere you need Firestore — it's identical to admin.firestore().
 */
export function getAdminDb(): admin.firestore.Firestore {
  return getApp().firestore();
}

/**
 * Return the real Auth instance (lazy).
 */
export function getAdminAuth(): admin.auth.Auth {
  return getApp().auth();
}

// ---------------------------------------------------------------------------
// Convenience re-exports so existing route files don't need to change their
// call sites — they already do things like `adminDb.collection(...)`.
// We create module-level getter shims using Object.defineProperty so the
// value is resolved lazily on first property access.
// ---------------------------------------------------------------------------

// eslint-disable-next-line prefer-const
export let adminDb: admin.firestore.Firestore;
Object.defineProperty(exports, 'adminDb', {
  get() {
    return getAdminDb();
  },
  enumerable: true,
});

// eslint-disable-next-line prefer-const
export let adminAuth: admin.auth.Auth;
Object.defineProperty(exports, 'adminAuth', {
  get() {
    return getAdminAuth();
  },
  enumerable: true,
});

export { admin };
