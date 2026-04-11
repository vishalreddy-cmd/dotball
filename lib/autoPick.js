import { CR, creditSum } from './credits';
import squadsData from '@/data/squads.json';

const STATS = squadsData.stats2026 || {};

function fantasyScore(playerId) {
  const s = STATS[playerId];
  if (!s || s.mat === 0) return (CR[playerId] ?? 7) * 2;

  const mat  = s.mat  ?? 1;
  const runs = s.runs ?? 0;
  const wkts = s.wkts ?? 0;
  const sr   = s.sr   ?? 0;
  const eco  = s.eco  ?? 0;

  let bat = runs / mat;
  if (runs / mat >= 50) bat += 8;
  else if (runs / mat >= 25) bat += 4;
  if (sr >= 170) bat += 6;
  else if (sr >= 150) bat += 4;
  else if (sr >= 130) bat += 2;

  let bowl = (wkts / mat) * 25;
  if (wkts / mat >= 3) bowl += 8;
  else if (wkts / mat >= 2) bowl += 4;
  if (eco > 0 && eco < 5)  bowl += 6;
  else if (eco < 6)         bowl += 4;
  else if (eco < 7)         bowl += 2;
  else if (eco > 12)        bowl -= 4;
  else if (eco > 10)        bowl -= 2;

  return bat + bowl;
}

const MINS   = { WK: 1, BAT: 2, BOWL: 2, AR: 1 };
const MAXS   = { WK: 4, BAT: 6, BOWL: 6, AR: 4 };
const TARGET = { WK: 1, BAT: 3, BOWL: 3, AR: 4 };

function tryPick(match, sorted) {
  const picked = [];
  const rc = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
  const tc = { [match.t1]: 0, [match.t2]: 0 };

  const overseas = () => picked.filter(p => p.c && p.c !== 'IN').length;

  function canAdd(p) {
    if (picked.some(s => s.id === p.id))             return false;
    if ((tc[p.team] ?? 0) >= 6)                      return false;
    if (rc[p.r] >= MAXS[p.r])                        return false;
    if (creditSum([...picked, p]) > 100)              return false;
    // Budget headroom: every remaining empty slot costs at least 7cr
    const after = 11 - picked.length - 1;
    if (after > 0 && creditSum([...picked, p]) + after * 7 > 100) return false;
    if (p.c && p.c !== 'IN' && overseas() >= 4)      return false;
    // Minimum feasibility: enough slots left to satisfy remaining minimums
    const slotsLeft = 10 - picked.length;
    const needed = Object.entries(MINS).reduce(
      (n, [r, mn]) => n + Math.max(0, mn - (rc[r] + (p.r === r ? 1 : 0))), 0
    );
    return needed <= slotsLeft;
  }

  function fill(pool, limitFn) {
    for (const p of pool) {
      if (picked.length >= 11) break;
      if (limitFn && !limitFn(p)) continue;
      if (canAdd(p)) { picked.push(p); rc[p.r]++; tc[p.team] = (tc[p.team] ?? 0) + 1; }
    }
  }

  // Phase 1: minimums — cheapest first per role (preserves budget)
  for (const role of ['WK', 'BAT', 'BOWL', 'AR']) {
    const cheap = [...sorted.filter(x => x.r === role)]
      .sort((a, b) => (CR[a.id] ?? 7) - (CR[b.id] ?? 7));
    for (const p of cheap) {
      if (rc[role] >= MINS[role]) break;
      if (canAdd(p)) { picked.push(p); rc[p.r]++; tc[p.team] = (tc[p.team] ?? 0) + 1; }
    }
  }

  // Phase 2: fill toward target, best scored first
  for (const role of ['AR', 'BAT', 'BOWL', 'WK']) {
    fill(sorted.filter(x => x.r === role), p => rc[p.r] < TARGET[p.r]);
  }

  // Phase 3: fill any remaining slots
  fill(sorted);

  return picked.length === 11 ? picked : null;
}

/**
 * Auto-pick 11 players. Tries three strategies and returns the first success.
 */
export function autoPick(match, squads) {
  const t1 = (squads[match.t1] || []).map(p => ({ ...p, team: match.t1 }));
  const t2 = (squads[match.t2] || []).map(p => ({ ...p, team: match.t2 }));
  const all = [...t1, ...t2];
  if (all.length < 11) return null;

  const withScore = all.map(p => ({ ...p, score: fantasyScore(p.id) }));

  // Strategy 1: best fantasy score first
  const byScore = [...withScore].sort((a, b) => b.score - a.score);
  // Strategy 2: best value (score per credit) first
  const byValue = [...withScore].sort((a, b) =>
    b.score / (CR[b.id] ?? 7) - a.score / (CR[a.id] ?? 7)
  );
  // Strategy 3: cheapest first (always fits in budget)
  const byCost = [...withScore].sort((a, b) => (CR[a.id] ?? 7) - (CR[b.id] ?? 7));

  return tryPick(match, byScore)
      || tryPick(match, byValue)
      || tryPick(match, byCost)
      || null;
}
