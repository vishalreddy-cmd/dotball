'use client';
import { useEffect } from 'react';
import { requestNotificationPermission, onForegroundMessage } from './notifications';

/**
 * Registers FCM if permission already granted (no prompt — that's in NotifPrompt).
 * Also polls match-reminder API every 5 minutes.
 */
export function usePush(uid) {
  // Auto-register FCM token if permission was previously granted
  useEffect(() => {
    if (!uid || typeof window === 'undefined') return;
    if (Notification?.permission !== 'granted') return;
    requestNotificationPermission(uid).catch(() => {});
  }, [uid]);

  // Poll match reminder check every 5 minutes
  useEffect(() => {
    if (!uid) return;
    const check = () => fetch('/api/notify/match-reminder').catch(() => {});
    check();
    const id = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [uid]);
}
