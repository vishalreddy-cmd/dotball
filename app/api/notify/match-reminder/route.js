import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { buildSchedule } from '@/lib/schedule';

/**
 * GET /api/notify/match-reminder
 * Called by the client every 5 minutes via polling.
 * Sends push notifications for:
 *   - Match starting in ~10 minutes (once per match)
 *   - Toss done / Playing XI announced (once per match)
 */
export async function GET(request) {
  const now = Date.now();
  const TEN_MIN = 10 * 60 * 1000;
  const schedule = buildSchedule();

  const results = [];

  for (const match of schedule) {
    if (match.status !== 'upcoming' && match.status !== 'next') continue;

    const matchTime = new Date(match.date).getTime();
    const timeToMatch = matchTime - now;

    // 10-min reminder window: between 8 and 12 minutes before start
    if (timeToMatch > 0 && timeToMatch < TEN_MIN + 2 * 60 * 1000 && timeToMatch > TEN_MIN - 2 * 60 * 1000) {
      const sentRef = db.collection('notifSent').doc(`reminder_${match.id}`);
      const sent = await sentRef.get();
      if (!sent.exists) {
        // Find all users who have squads or challenges for this match
        const [squadSnap, challengeSnap] = await Promise.all([
          db.collection('squads').where('matchId', '==', match.id).get(),
          db.collection('challenges').where('matchId', '==', match.id).get(),
        ]);
        const uids = new Set([
          ...squadSnap.docs.map(d => d.data().uid),
          ...challengeSnap.docs.flatMap(d => d.data().members || []),
        ]);

        if (uids.size > 0) {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uids: [...uids],
              title: `${match.t1} vs ${match.t2} — 10 mins to go!`,
              body: 'Lock your squad before the match starts.',
              url: `/play/${match.id}/xi`,
            }),
          });
          await sentRef.set({ sentAt: now });
          results.push({ matchId: match.id, type: 'reminder', uids: uids.size });
        }
      }
    }
  }

  return NextResponse.json({ checked: schedule.length, sent: results });
}
