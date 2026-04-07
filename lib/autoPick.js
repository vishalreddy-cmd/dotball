import { CR, creditSum } from './credits';
import squadsData from '@/data/squads.json';

const STATS = squadsData.stats2026 || {};

/**
 * Compute a fantasy-points-per-match score from 2026 actual stats.
 * Uses the same scoring system as the live scoring engine so the number
 * reflects real fantasy value, not a made-up heuristic.
 */
function fantasyScore(playerId, role) {
  const s = STATS[playerId];

  // No stats yet (hasn't played or isn't in top performers) —
  // fall back to star credit value so expensive players rank above cheap benchwarmers.
  if (!s || s.mat === 0) {
    return (CR[playerId] ?? 7) * 1.5;
  }

  const perMatch = (total, mat) => total / mat;
  const runs  = s.runs  ?? 0;
  const wkts  = s.wkts  ?? 0;
  const sr    = s.sr    ?? 0;
  const eco   = s.eco   ?? 0;
  const mat   = s.mat   ?? 1;

  // ── Batting points per match ──────────────────────────────────────
  let bat = perMatch(runs, mat);                           // 1pt per run
  if (runs / mat >= 50) bat += 8;
  else if (runs / mat >= 25) bat += 4;

  if (sr >= 170) bat += 6;
  else if (sr >= 150) bat += 4;
  else if (sr >= 130) bat += 2;

  // ── Bowling points per match ──────────────────────────────────────
  let bowl = perMatch(wkts, mat) * 25;                    // 25pts per wicket
  if (wkts / mat >= 3) bowl += 8;
  else if (wkts / mat >= 2) bowl += 4;

  if (eco > 0 && eco < 5)  bowl += 6;
  else if (eco < 6)         bowl += 4;
  else if (eco < 7)         bowl += 2;
  else if (eco > 12)        bowl -= 4;
  else if (eco > 10)        bowl -= 2;

  return bat + bowl;
}

/**
 * Auto-pick 11 players for Classic XI based on actual IPL 2026 stats.
 *
 * Rules:
 *  - ≤ 100 credits total
 *  - max 6 players per team
 *  - min 1 WK, 2 BAT, 2 BOWL, 1 AR (standard constraints)
 *  - target composition: 1 WK, 3 BAT, 3 BOWL, 4 AR (balanced)
 *  - ranked by fantasy points per match from 2026 season data
 *
 * Returns array of 11 players or null if impossible.
 */
export function autoPick(match, squads) {
  const t1Players = (squads[match.t1] || []).map(p => ({ ...p, team: match.t1 }));
  const t2Players = (squads[match.t2] || []).map(p => ({ ...p, team: match.t2 }));
  const all = [...t1Players, ...t2Players];

  if (all.length < 11) return null;

  // Score every player by actual 2026 fantasy points per match
  const scored = all.map(p => ({
    ...p,
    score: fantasyScore(p.id, p.r),
  }));
  scored.sort((a, b) => b.score - a.score);

  const TARGET = { WK: 1, BAT: 3, BOWL: 3, AR: 4 };
  const MINS   = { WK: 1, BAT: 2, BOWL: 2, AR: 1 };
  const MAXS   = { WK: 4, BAT: 6, BOWL: 6, AR: 4 };

  const picked = [];
  const rc = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
  const tc = { [match.t1]: 0, [match.t2]: 0 };

  function canAdd(p) {
    if (picked.some(s => s.id === p.id))   return false;
    if (tc[p.team] >= 6)                   return false;
    if (rc[p.r]    >= MAXS[p.r])           return false;
    if (creditSum([...picked, p]) > 100)   return false;
    // ensure remaining slots can still satisfy minimums
    const slotsLeft = 10 - picked.length;
    const stillNeeded = Object.entries(MINS).reduce(
      (n, [r, mn]) => n + Math.max(0, mn - (rc[r] + (p.r === r ? 1 : 0))),
      0,
    );
    return stillNeeded <= slotsLeft;
  }

  // Phase 1: fill minimums with top-scored players in each role
  for (const role of ['WK', 'BAT', 'BOWL', 'AR']) {
    for (const p of scored.filter(x => x.r === role)) {
      if (rc[role] >= MINS[role]) break;
      if (canAdd(p)) { picked.push(p); rc[p.r]++; tc[p.team]++; }
    }
  }

  // Phase 2: fill toward target composition (best-scored first)
  for (const role of ['AR', 'BAT', 'BOWL', 'WK']) {
    for (const p of scored.filter(x => x.r === role)) {
      if (picked.length >= 11 || rc[role] >= TARGET[role]) break;
      if (canAdd(p)) { picked.push(p); rc[p.r]++; tc[p.team]++; }
    }
  }

  // Phase 3: fill any remaining slots with highest-scored eligible players
  for (const p of scored) {
    if (picked.length >= 11) break;
    if (canAdd(p)) { picked.push(p); rc[p.r]++; tc[p.team]++; }
  }

  return picked.length === 11 ? picked : null;
}
