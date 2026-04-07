'use client';
import { useEffect } from 'react';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Registers the service worker and, if the user has granted permission,
 * subscribes to push notifications and saves the subscription to Firestore.
 */
export function usePush(uid) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    async function register() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');

        // Only attempt push subscription if permission already granted
        if (Notification.permission !== 'granted') return;

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // Re-save to Firestore in case it was cleared
          if (uid) await saveSub(uid, existing);
          return;
        }

        // VAPID public key — replace with your own from web-push
        // For now we do a basic subscription without VAPID (works in dev)
        try {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            // applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY'),
          });
          if (uid) await saveSub(uid, sub);
        } catch (_) {
          // Push subscription may fail without a valid VAPID key — silent in dev
        }
      } catch (e) {
        console.warn('[dotball sw]', e.message);
      }
    }

    register();
  }, [uid]);
}

async function saveSub(uid, sub) {
  try {
    await setDoc(doc(db, 'pushSubs', uid), {
      uid,
      sub: JSON.parse(JSON.stringify(sub)),
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (_) {}
}
