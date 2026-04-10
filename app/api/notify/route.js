import { NextResponse } from 'next/server';
import { db, messaging } from '@/lib/firebase-admin';

/**
 * POST /api/notify
 * Body: { uids: string[], title: string, body: string, url?: string }
 *
 * Looks up FCM tokens for each uid and sends a push notification.
 * Called internally by wager accept, toss detection, match reminders.
 */
export async function POST(request) {
  try {
    const { uids, title, body, url } = await request.json();
    if (!uids?.length || !title || !body) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    // Fetch tokens for all uids in parallel
    const tokenDocs = await Promise.all(
      uids.map(uid => db.collection('fcmTokens').doc(uid).get())
    );
    const tokens = tokenDocs
      .filter(d => d.exists && d.data()?.token)
      .map(d => d.data().token);

    if (!tokens.length) {
      return NextResponse.json({ sent: 0, message: 'no tokens found' });
    }

    // Send via FCM multicast
    const result = await messaging.sendEachForMulticast({
      tokens,
      data: { title, body, url: url || '/' },
      webpush: {
        notification: { title, body, icon: '/icon-192.png', badge: '/icon-192.png' },
        fcmOptions: { link: url || '/' },
      },
    });

    return NextResponse.json({ sent: result.successCount, failed: result.failureCount });
  } catch (e) {
    console.error('[notify]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
