import data from '@/data/squads.json';

// Build credit map deterministically (no randomness).
// Non-star players: 7.0 + min(3, index * 0.12), rounded to 1 dp.
// Star players: exact values from data.starCredits.
function buildCreditMap() {
  const CR = {};
  Object.keys(data.squads).forEach(team => {
    data.squads[team].forEach((p, i) => {
      CR[p.id] = parseFloat((7 + Math.min(3, i * 0.12)).toFixed(1));
    });
  });
  Object.entries(data.starCredits).forEach(([id, v]) => {
    CR[id] = v;
  });
  return CR;
}

export const CR = buildCreditMap();

/** Avoids JS floating-point drift (e.g. 99.9999 vs 100). */
export function creditSum(players) {
  return Math.round(players.reduce((acc, p) => acc + (CR[p.id] ?? 7), 0) * 10) / 10;
}

export const ROLE_COLORS = {
  BAT:  '#60a5fa',
  BOWL: '#f87171',
  AR:   '#34d399',
  WK:   '#fbbf24',
};

export const ROLE_LABELS = {
  BAT:  'Batter',
  BOWL: 'Bowler',
  AR:   'All-Rounder',
  WK:   'WK',
};
