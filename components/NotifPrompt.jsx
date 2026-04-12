'use client';
import { useState, useEffect } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/notifications';
import { useToast } from '@/context/ToastContext';

/**
 * Shows a one-time permission prompt for push notifications.
 * Dismissed permanently once user taps Allow or Not now.
 */
export default function NotifPrompt({ uid }) {
  const toast = useToast();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!uid) return;
    if (typeof window === 'undefined') return;
    if (Notification?.permission === 'granted' || Notification?.permission === 'denied') return;
    const dismissed = localStorage.getItem('notifDismissed');
    if (dismissed) return;
    // Show prompt after 3 seconds
    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, [uid]);

  // Listen for foreground messages and show as toast
  useEffect(() => {
    if (!uid) return;
    const unsub = onForegroundMessage(payload => {
      const { title, body } = payload.data || {};
      if (title || body) toast(`${title || 'dotball'}: ${body || ''}`);
    });
    return unsub;
  }, [uid, toast]);

  async function allow() {
    setShow(false);
    const result = await requestNotificationPermission(uid);
    if (result === 'granted') toast('Notifications enabled!');
    else if (result === 'denied') toast('Notifications blocked — enable in browser settings', false);
    localStorage.setItem('notifDismissed', '1');
  }

  function dismiss() {
    setShow(false);
    localStorage.setItem('notifDismissed', '1');
  }

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 9999,
      background: '#111421', border: '1px solid #6366f144', borderRadius: 16,
      padding: '14px 16px', boxShadow: '0 8px 32px #00000066',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 24, flexShrink: 0 }}>🔔</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#eef0ff', marginBottom: 3 }}>
            Stay in the game
          </div>
          <div style={{ fontSize: 11, color: '#7a85a0', lineHeight: 1.5 }}>
            Get notified when the Playing XI is announced, match starts in 10 mins, or a friend accepts your wager.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={allow}
          style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          Allow notifications
        </button>
        <button onClick={dismiss}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #1c2035', background: 'transparent', color: '#7a85a0', fontSize: 12, cursor: 'pointer' }}>
          Not now
        </button>
      </div>
    </div>
  );
}
