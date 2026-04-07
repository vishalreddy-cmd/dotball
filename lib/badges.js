/**
 * Badge definitions.
 * Each badge has: id, label, desc, icon, color, condition(stats) -> bool
 * stats: { matches, wins, streak, currentStreak, captainDoubles, underdogWins, firstPick }
 */
export const BADGE_DEFS = [
  {
    id: 'first_blood',
    label: 'First Blood',
    desc: 'Picked your first squad',
    icon: '🏏',
    color: '#6366f1',
    condition: s => s.matches >= 1,
  },
  {
    id: 'on_fire',
    label: 'On Fire',
    desc: 'Won 3 matches in a row',
    icon: '🔥',
    color: '#ef4444',
    condition: s => s.maxStreak >= 3,
  },
  {
    id: 'cold_streak',
    label: 'Survivor',
    desc: 'Kept playing after 3 losses in a row',
    icon: '🧊',
    color: '#06b6d4',
    condition: s => s.matches >= 4,
  },
  {
    id: 'centurion',
    label: 'Centurion',
    desc: 'Scored 100+ points in a single match',
    icon: '💯',
    color: '#f5a623',
    condition: s => s.bestScore >= 100,
  },
  {
    id: 'upset_king',
    label: 'Upset King',
    desc: 'Won when you were the underdog (rank 5+)',
    icon: '👑',
    color: '#8b5cf6',
    condition: s => s.underdogWins >= 1,
  },
  {
    id: 'hat_trick',
    label: 'Hat-Trick',
    desc: 'Finished top 3 in 3 different matches',
    icon: '🎩',
    color: '#22c55e',
    condition: s => s.podiums >= 3,
  },
  {
    id: 'lucky_charm',
    label: 'Lucky Charm',
    desc: 'Won a match with 5+ players from the losing team',
    icon: '🍀',
    color: '#34d399',
    condition: s => s.luckyWins >= 1,
  },
  {
    id: 'season_vet',
    label: 'Season Vet',
    desc: 'Played 10 matches in a season',
    icon: '🎖️',
    color: '#f59e0b',
    condition: s => s.matches >= 10,
  },
];

/** Compute which badges a user has earned from their stats object */
export function computeBadges(stats) {
  return BADGE_DEFS.filter(b => b.condition(stats));
}
