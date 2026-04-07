import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import rawData from '@/data/squads.json';

const API_KEY = process.env.CRIC_API_KEY;

/**
 * Vercel Cron endpoint — called every minute during match hours.
 * Fetches CricAPI once, updates Firestore liveCache for any active IPL match.
 * Protected by CRON_SECRET so only Vercel scheduler can trigger it.
 *
 * vercel.json schedule: every minute ("* * * * *") — requires Vercel Pro.
 * Free tier alternative: call manually or use GitHub Actions cron.
 */
export async function GET(request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'CRIC_API_KEY not set' }, { status: 500 });
  }

  try {
    const now = Date.now();

    // Fetch all currently live matches from CricAPI (1 call)
    const listRes = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`,
      { cache: 'no-store' }
    );
    const listData = await listRes.json();
    const liveMatches = listData.data || [];

    if (liveMatches.length === 0) {
      return NextResponse.json({ message: 'No live matches', updated: 0 });
    }

    // Find which of our IPL schedule matches overlap with live matches
    const schedule = rawData.schedule;
    const updated = [];

    for (const liveMatch of liveMatches) {
      const teams = (liveMatch.teams || []).join(' ').toLowerCase();

      // Find our schedule match by team abbreviations
      const ourMatch = schedule.find(m => {
        const t1 = m.t1.toLowerCase();
        const t2 = m.t2.toLowerCase();
        return teams.includes(t1) || teams.includes(t2);
      });

      if (!ourMatch) continue; // not one of our matches

      // Fetch full scorecard (1 call per live match — usually just 1 at a time in IPL)
      const scoreRes = await fetch(
        `https://api.cricapi.com/v1/match_scorecard?apikey=${API_KEY}&id=${liveMatch.id}`,
        { cache: 'no-store' }
      );
      const scoreData = await scoreRes.json();
      const d = scoreData.data || {};

      const isComplete = liveMatch.matchEnded || d.matchEnded || false;

      // Parse player stats from scorecard
      const playerStats = parseScorecard(d);

      const payload = {
        live:        !isComplete,
        complete:    isComplete,
        matchId:     ourMatch.id,
        cricapiId:   liveMatch.id,
        status:      liveMatch.status || d.status || '',
        score:       liveMatch.score  || d.score  || [],
        playerStats,
      };

      // Write to liveCache — all clients reading onSnapshot get this instantly
      await db.collection('liveCache').doc(ourMatch.id).set({
        payload,
        fetchedAt: now,
      });

      // If match ended, persist result so home page / pre-match sheet reflect it
      if (isComplete) {
        const result = {
          t1s:    d.score?.[0] ? `${d.score[0].r}/${d.score[0].w} (${d.score[0].o})` : '',
          t2s:    d.score?.[1] ? `${d.score[1].r}/${d.score[1].w} (${d.score[1].o})` : '',
          winner: d.matchWinner || '',
          margin: d.status || '',
        };
        await db.collection('matchResults').doc(ourMatch.id).set({
          ...result,
          playerStats,
          updatedAt: now,
        }, { merge: true });

        payload.result = result;
      }

      updated.push(ourMatch.id);
    }

    return NextResponse.json({ updated, count: updated.length });

  } catch (e) {
    console.error('[cron/update-scores]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── Helpers (duplicated from live-score route to keep cron self-contained) ───

const ALL_PLAYERS = Object.entries(rawData.squads).flatMap(([team, players]) =>
  players.map(p => ({ ...p, team }))
);

function findPlayer(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return (
    ALL_PLAYERS.find(p => p.n.toLowerCase() === lower) ||
    ALL_PLAYERS.find(p => lower.includes(p.n.split(' ').pop().toLowerCase())) ||
    null
  );
}

function parseScorecard(data) {
  const stats = {};
  const innings = data?.scorecard || data?.score || [];
  innings.forEach(inn => {
    (inn.batting || []).forEach(b => {
      const p = findPlayer(b.batsman?.name || b.name);
      if (!p) return;
      if (!stats[p.id]) stats[p.id] = {};
      stats[p.id].runs    = parseInt(b.r ?? b.runs ?? 0, 10);
      stats[p.id].balls   = parseInt(b.b ?? b.balls ?? 0, 10);
      stats[p.id].fours   = parseInt(b['4s'] ?? 0, 10);
      stats[p.id].sixes   = parseInt(b['6s'] ?? 0, 10);
      stats[p.id].sr      = parseFloat(b.sr ?? 0);
      stats[p.id].pts     = calcPoints(stats[p.id], p.r);
    });
    (inn.bowling || []).forEach(b => {
      const p = findPlayer(b.bowler?.name || b.name);
      if (!p) return;
      if (!stats[p.id]) stats[p.id] = {};
      stats[p.id].overs      = b.o ?? b.overs ?? 0;
      stats[p.id].wickets    = parseInt(b.w ?? b.wickets ?? 0, 10);
      stats[p.id].runs_given = parseInt(b.r ?? b.runs ?? 0, 10);
      stats[p.id].economy    = parseFloat(b.eco ?? 0);
      stats[p.id].pts        = calcPoints(stats[p.id], p.r);
    });
  });
  return stats;
}

function calcPoints(stat, role) {
  let pts = 0;
  const runs = stat.runs ?? 0;
  const wkts = stat.wickets ?? 0;
  const sr   = stat.sr ?? 0;
  const eco  = stat.economy ?? 0;

  pts += runs;
  if (runs >= 100) pts += 16;
  else if (runs >= 75) pts += 12;
  else if (runs >= 50) pts += 8;
  else if (runs >= 25) pts += 4;
  if (runs === 0 && (role === 'BAT' || role === 'WK')) pts -= 2;
  pts += (stat.fours ?? 0);
  pts += (stat.sixes ?? 0) * 2;
  if (sr >= 170 && runs >= 10) pts += 6;
  else if (sr >= 150 && runs >= 10) pts += 4;
  else if (sr >= 130 && runs >= 10) pts += 2;
  else if (sr > 0 && sr < 70  && (stat.balls ?? 0) >= 10) pts -= 6;
  else if (sr > 0 && sr < 80  && (stat.balls ?? 0) >= 10) pts -= 4;
  else if (sr > 0 && sr < 100 && (stat.balls ?? 0) >= 10) pts -= 2;

  pts += wkts * 25;
  if (wkts >= 5) pts += 16;
  else if (wkts >= 4) pts += 12;
  else if (wkts >= 3) pts += 8;
  if (eco > 0 && eco < 5 && (stat.overs ?? 0) >= 2) pts += 6;
  else if (eco > 0 && eco < 6) pts += 4;
  else if (eco > 0 && eco < 7) pts += 2;
  else if (eco > 12) pts -= 6;
  else if (eco > 11) pts -= 4;
  else if (eco > 10) pts -= 2;

  pts += (stat.catches ?? 0) * 8;
  pts += (stat.stumpings ?? 0) * 12;
  pts += (stat.runouts ?? 0) * 6;

  return Math.round(pts);
}
