import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK — server-side only (API routes, not browser).
 * Requires FIREBASE_ADMIN_KEY env var set to your service account JSON (stringified).
 */

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || '{}');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const db = getFirestore();
