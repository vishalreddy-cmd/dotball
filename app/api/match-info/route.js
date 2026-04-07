import { NextResponse } from 'next/server';
import rawData from '@/data/squads.json';

const API_KEY = process.env.CRIC_API_KEY;

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
 * Returns playing XI status for each player in a match.
 * { [playerId]: 'playing' | 'impact' | 'bench' }
 * Called client-side every 60s once match is within 1 hour of start.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('matchId');

  if (!matchId || !API_KEY) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  try {
    // Find live CricAPI match
    const listRes  = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`);
    const listData = await listRes.json();

    const schedule = rawData.schedule;
    const ourMatch = schedule.find(m => m.id === matchId);
    if (!ourMatch) return NextResponse.json({ error: 'match not found' }, { status: 404 });

    const liveMatch = (listData.data || []).find(m => {
      const teams = (m.teams || []).join(' ').toLowerCase();
      return teams.includes(ourMatch.t1.toLowerCase()) || teams.includes(ourMatch.t2.toLowerCase());
    });

    if (!liveMatch) return NextResponse.json({ lineup: null });

    // Fetch match info for playing XI
    const infoRes  = await fetch(`https://api.cricapi.com/v1/match_info?apikey=${API_KEY}&id=${liveMatch.id}`);
    const infoData = await infoRes.json();

    const matchInfo = infoData.data;
    if (!matchInfo) return NextResponse.json({ lineup: null });

    // Build lineup map
    const lineup = {};

    // playing11 arrays per team
    const teamPlayers = matchInfo.players || {};
    Object.values(teamPlayers).forEach(teamArr => {
      (teamArr || []).forEach(player => {
        const p = findPlayer(player.name);
        if (!p) return;
        if (player.playing11 === true) {
          lineup[p.id] = 'playing';
        } else if (player.substitute === true) {
          lineup[p.id] = 'impact';
        } else {
          lineup[p.id] = 'bench';
        }
      });
    });

    return NextResponse.json({ lineup, toss: matchInfo.tossChoice || null, tossWinner: matchInfo.tossWinner || null });

  } catch (e) {
    console.error('[match-info]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
