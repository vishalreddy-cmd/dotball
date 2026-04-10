import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import rawData from '@/data/squads.json';

const API_KEY = process.env.CRIC_API_KEY;
const CACHE_SECONDS = 30; // refresh every 30s during live match

/**
 * Maps a CricAPI player name to our squad player id.
 * Tries exact match, then last-name match.
 */
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

/**
 * Parse scorecard from CricAPI response into per-player stats.
 * Returns { [playerId]: { runs?, wickets?, catches? } }
 */
function parseScorecard(data) {
  const stats = {};

  const innings = data?.scorecard || data?.score || [];
  innings.forEach(inn => {
    // Skip super over — does not count towards fantasy points
    const innName = (inn.inningsType || inn.inning || '').toLowerCase();
    if (inn.isSuperOver || innName.includes('super over')) return;
    // Batting
    (inn.batting || []).forEach(b => {
      const p = findPlayer(b.batsman?.name || b.name);
      if (!p) return;
      if (!stats[p.id]) stats[p.id] = {};
      stats[p.id].runs    = parseInt(b.r ?? b.runs ?? 0, 10);
      stats[p.id].balls   = parseInt(b.b ?? b.balls ?? 0, 10);
      stats[p.id].fours   = parseInt(b['4s'] ?? 0, 10);
      stats[p.id].sixes   = parseInt(b['6s'] ?? 0, 10);
      stats[p.id].sr      = parseFloat(b.sr ?? 0);
      stats[p.id].pts     = calcPoints(stats[p.id], p.r, false, false, false);
    });
    // Bowling
    (inn.bowling || []).forEach(b => {
      const p = findPlayer(b.bowler?.name || b.name);
      if (!p) return;
      if (!stats[p.id]) stats[p.id] = {};
      stats[p.id].overs      = b.o ?? b.overs ?? 0;
      stats[p.id].wickets    = parseInt(b.w ?? b.wickets ?? 0, 10);
      stats[p.id].runs_given = parseInt(b.r ?? b.runs ?? 0, 10);
      stats[p.id].economy    = parseFloat(b.eco ?? 0);
      stats[p.id].pts        = calcPoints(stats[p.id], p.r, false, false, false);
    });
  });

  return stats;
}

/**
 * Calculate base fantasy points for a player's live stats.
 * C/VC/IP multipliers are applied client-side per squad, not here.
 */
function calcPoints(stat, role) {
  let pts = 0;
  const runs = stat.runs ?? 0;
  const wkts = stat.wickets ?? 0;
  const sr   = stat.sr ?? 0;
  const eco  = stat.economy ?? 0;

  // Batting
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

  // Bowling
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

  // Fielding
  pts += (stat.catches ?? 0) * 8;
  pts += (stat.stumpings ?? 0) * 12;
  pts += (stat.runouts ?? 0) * 6;

  return Math.round(pts);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');

  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'CRIC_API_KEY not set in .env.local' }, { status: 500 });
  }

  try {
    // Check Firestore cache first
    const cacheRef = db.collection('liveCache').doc(matchId);
    const cached = await cacheRef.get();
    const now = Date.now();

    if (cached.exists) {
      const d = cached.data();
      // Return cache if fresh enough
      if (now - d.fetchedAt < CACHE_SECONDS * 1000) {
        return NextResponse.json(d.payload);
      }
    }

    // Find the CricAPI match ID for this matchId
    // First fetch current matches list
    const listRes = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`
    );
    const listData = await listRes.json();

    // Match our schedule entry to a live CricAPI match
    const schedule = rawData.schedule;
    const ourMatch = schedule.find(m => m.id === matchId);
    if (!ourMatch) {
      return NextResponse.json({ error: 'Match not in schedule' }, { status: 404 });
    }

    // Find matching live match by team names
    const liveMatch = (listData.data || []).find(m => {
      const teams = (m.teams || []).join(' ').toLowerCase();
      const t1 = ourMatch.t1.toLowerCase();
      const t2 = ourMatch.t2.toLowerCase();
      // Match by team abbreviation or partial name
      return (teams.includes(t1) || teams.includes(t2));
    });

    if (!liveMatch) {
      return NextResponse.json({ live: false, message: 'Match not currently live' });
    }

    // Fetch scorecard + match info in parallel
    const [scoreRes, infoRes] = await Promise.all([
      fetch(`https://api.cricapi.com/v1/match_scorecard?apikey=${API_KEY}&id=${liveMatch.id}`),
      fetch(`https://api.cricapi.com/v1/match_info?apikey=${API_KEY}&id=${liveMatch.id}`),
    ]);
    const [scoreData, infoData] = await Promise.all([scoreRes.json(), infoRes.json()]);

    const isComplete = liveMatch.matchEnded || scoreData.data?.matchEnded;
    const matchStatus = scoreData.data?.status || liveMatch.status || '';
    const isNoResult  = isComplete && (
      !scoreData.data?.matchWinner ||
      matchStatus.toLowerCase().includes('no result') ||
      matchStatus.toLowerCase().includes('abandoned') ||
      matchStatus.toLowerCase().includes('cancelled')
    );
    const playerStats = parseScorecard(scoreData.data || {});

    // Detect real impact subs from match_info (substitute === true)
    const realImpactSubs = [];
    const teamPlayers = infoData.data?.players || {};
    Object.values(teamPlayers).forEach(teamArr => {
      (teamArr || []).forEach(player => {
        if (player.substitute === true) {
          const p = findPlayer(player.name);
          if (p) realImpactSubs.push(p.id);
        }
      });
    });

    // Build payload
    const payload = {
      live: !isComplete,
      complete: isComplete,
      noResult: isNoResult,
      matchId,
      cricapiId: liveMatch.id,
      status: liveMatch.status || scoreData.data?.status || '',
      score: liveMatch.score || [],
      playerStats,
      realImpactSubs, // which players were actually used as impact subs
      fetchedAt: now,
    };

    // If match complete, write result to Firestore matches collection
    if (isComplete && scoreData.data) {
      const d = scoreData.data;
      const winner = isNoResult ? '' : (d.matchWinner || '');
      const result = {
        t1s: d.score?.[0] ? `${d.score[0].r}/${d.score[0].w}` : '',
        t2s: d.score?.[1] ? `${d.score[1].r}/${d.score[1].w}` : '',
        winner,
        margin: isNoResult ? 'No Result' : (d.status || ''),
        noResult: isNoResult,
      };
      await db.collection('matchResults').doc(matchId).set({
        ...result,
        updatedAt: now,
        playerStats,
      }, { merge: true });

      // Aggregate season stats — merge this match's player stats into seasonStats/ipl2026
      const seasonRef = db.collection('seasonStats').doc('ipl2026');
      const seasonSnap = await seasonRef.get();
      const existing = seasonSnap.exists ? (seasonSnap.data().stats || {}) : {};

      Object.entries(playerStats).forEach(([pid, s]) => {
        const prev = existing[pid] || { mat: 0, runs: 0, wkts: 0, sr: 0, eco: 0 };
        const newMat  = prev.mat + 1;
        const newRuns = prev.runs + (s.runs || 0);
        const newWkts = prev.wkts + (s.wickets || 0);
        // Weighted avg SR and eco
        const newSr  = newRuns > 0 && s.balls > 0 ? Math.round((newRuns / (prev.mat * (prev.sr || 0) / 100 + (s.balls || 0))) * 100) : prev.sr;
        const newEco = s.economy > 0 ? parseFloat(((prev.eco * prev.mat + s.economy) / newMat).toFixed(1)) : prev.eco;
        existing[pid] = { mat: newMat, runs: newRuns, wkts: newWkts, sr: newSr, eco: newEco };
      });

      await seasonRef.set({ stats: existing, updatedAt: now }, { merge: true });

      payload.result = result;
    }

    // Write/update cache
    await cacheRef.set({ payload, fetchedAt: now });

    return NextResponse.json(payload);

  } catch (e) {
    console.error('[live-score]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
