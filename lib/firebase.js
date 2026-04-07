import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const FB_CONFIG = {
  apiKey:            'AIzaSyAWx28076A7YTeS6egBJr0HJPA4lvdfiE0',
  authDomain:        'dotball-ce1f8.firebaseapp.com',
  projectId:         'dotball-ce1f8',
  storageBucket:     'dotball-ce1f8.firebasestorage.app',
  messagingSenderId: '965083043591',
  appId:             '1:965083043591:web:64eebe5586ff77e256d7a2',
  measurementId:     'G-CH1ZSCCC6B',
};

const app = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);

export const db   = getFirestore(app);
export const auth = getAuth(app);
