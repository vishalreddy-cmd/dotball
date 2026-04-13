'use client';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { db, auth } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let messaging = null;

function getMsg() {
  if (messaging) return messaging;
  if (typeof window === 'undefined') return null;
  const { initializeApp, getApps } = require('firebase/app');
  const app = getApps()[0];
  if (!app) return null;
  messaging = getMessaging(app);
  return messaging;
}

/**
 * Request notification permission and save FCM token to Firestore.
 * Returns 'granted' | 'denied' | 'unsupported'
 */
export async function requestNotificationPermission(uid) {
  if (typeof window === 'undefined') return 'unsupported';
  if (typeof Notification === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (!VAPID_KEY) { console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY not set'); return 'unsupported'; }

  // Register the FCM service worker
  let swReg;
  try {
    swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  } catch (e) {
    console.error('SW register failed', e);
    return 'unsupported';
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;

  try {
    const msg = getMsg();
    if (!msg) return 'unsupported';
    const token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (token && uid) {
      await setDoc(doc(db, 'fcmTokens', uid), { token, uid, updatedAt: Date.now() }, { merge: true });
    }
    return 'granted';
  } catch (e) {
    console.error('FCM token error', e);
    return 'unsupported';
  }
}

/**
 * Listen for foreground messages and call handler(payload).
 */
export function onForegroundMessage(handler) {
  const msg = getMsg();
  if (!msg) return () => {};
  return onMessage(msg, handler);
}
