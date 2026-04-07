import rawData from '@/data/squads.json';

const MONTHS = { Mar: 2, Apr: 3, May: 4 };

/** Parse a "28 Mar" + "7:30 PM" pair into a UTC Date (IST = UTC+5:30). */
export function parseMatchUTC(dateStr, timeStr) {
  const [dayStr, monStr] = dateStr.split(' ');
  const day   = parseInt(dayStr, 10);
  const month = MONTHS[monStr] ?? 3;

  const clean = timeStr.replace(' PM', '').replace(' AM', '');
  const [hStr, mStr] = clean.split(':');
  let hour = parseInt(hStr, 10);
  const min  = parseInt(mStr, 10) || 0;
  if (timeStr.includes('PM') && hour !== 12) hour += 12;

  // IST = UTC+5:30 → subtract 5h30m
  return new Date(Date.UTC(2026, month, day, hour - 5, min - 30, 0));
}

/** Returns { status, lock } for a match that has no result yet. */
function liveStatus(dateStr, timeStr) {
  const matchUTC   = parseMatchUTC(dateStr, timeStr);
  const matchEndUTC = new Date(matchUTC.getTime() + 4 * 60 * 60 * 1000);
  const now         = new Date();

  if (now > matchEndUTC) return { status: 'past', lock: null };
  if (now >= matchUTC)   return { status: 'live', lock: null };

  // Countdown label
  const diff  = matchUTC - now;
  const diffH = Math.floor(diff / 3_600_000);
  const diffM = Math.floor((diff % 3_600_000) / 60_000);
  const diffD = Math.floor(diffH / 24);
  const lock  = diffD > 0
    ? `${diffD}d ${diffH % 24}h`
    : diffH > 0
      ? `${diffH}h ${diffM}m`
      : `${diffM}m`;

  // Is match today in IST?
  const nowIST   = new Date(now.getTime() + 5.5 * 3_600_000);
  const matchIST = new Date(matchUTC.getTime() + 5.5 * 3_600_000);
  const sameDay  =
    nowIST.getUTCFullYear() === matchIST.getUTCFullYear() &&
    nowIST.getUTCMonth()    === matchIST.getUTCMonth()    &&
    nowIST.getUTCDate()     === matchIST.getUTCDate();

  return { status: sameDay ? 'next' : 'future', lock };
}

/** Build the full schedule with computed status fields. */
export function buildSchedule() {
  return rawData.schedule.map(m => {
    if (m.res) return { ...m, status: 'past', lock: null };
    const { status, lock } = liveStatus(m.date, m.time);
    return { ...m, status, lock };
  });
}

/** Is the match locked (started or past)? */
export function isMatchLocked(m) {
  if (m.status === 'past' || m.status === 'live') return true;
  return new Date() >= parseMatchUTC(m.date, m.time);
}
