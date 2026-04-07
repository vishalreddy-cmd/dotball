'use client';
import BottomSheet from './BottomSheet';
import TeamLogo from './TeamLogo';
import data from '@/data/squads.json';

const T   = data.teams;
const SQ  = data.squads;
const VEN = data.venues || {};
const SC  = data.starCredits || {};

/** Parse "203/4" → 203, handles all formats */
function parseRuns(scoreStr) {
  if (!scoreStr) return null;
  const n = parseInt(scoreStr.split('/')[0], 10);
  return isNaN(n) ? null : n;
}

/**
 * Compute 2026 average scores at a venue from actual results.
 * Returns { avg, count } or null if no matches played there yet.
 */
function venueAvg2026(venue) {
  const played = data.schedule.filter(m => m.res && m.venue === venue);
  if (played.length === 0) return null;
  const scores = [];
  played.forEach(m => {
    const s1 = parseRuns(m.res.t1s);
    const s2 = parseRuns(m.res.t2s);
    if (s1 !== null) scores.push(s1);
    if (s2 !== null) scores.push(s2);
  });
  if (scores.length === 0) return null;
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const high = Math.max(...scores);
  const low  = Math.min(...scores);
  return { avg, high, low, matches: played.length, scores };
}

function getH2H(t1, t2) {
  const matches = data.schedule.filter(
    m => m.res && ((m.t1 === t1 && m.t2 === t2) || (m.t1 === t2 && m.t2 === t1))
  );
  const t1Wins = matches.filter(m => m.res?.winner === t1).length;
  const t2Wins = matches.filter(m => m.res?.winner === t2).length;
  return { total: matches.length, t1Wins, t2Wins, matches };
}

/** Top 3 players by credit (star players) for a team */
function getKeyPlayers(team, limit = 3) {
  const players = (SQ[team] || []).map(p => ({
    ...p,
    cr: SC[p.id] ?? (7 + 0),
  }));
  players.sort((a, b) => b.cr - a.cr);
  return players.slice(0, limit);
}

function PitchMeter({ pace, spin }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: '#7a85a0' }}>Pace {pace}%</span>
        <span style={{ fontSize: 9, color: '#7a85a0' }}>Spin {spin}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#1c2035', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${pace}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: '99px 0 0 99px', transition: 'width .4s' }} />
        <div style={{ flex: 1, background: 'linear-gradient(90deg,#06b6d4,#0891b2)', borderRadius: '0 99px 99px 0' }} />
      </div>
    </div>
  );
}

export default function PreMatchSheet({ match, onClose }) {
  if (!match) return null;
  const { t1, t2, venue, date, day, time } = match;
  const h2h    = getH2H(t1, t2);
  const venInfo = VEN[venue] || {};
  const avg2026 = venueAvg2026(venue);
  const keyT1  = getKeyPlayers(t1);
  const keyT2  = getKeyPlayers(t2);

  const pitchColor = venInfo.pitch === 'Batting' ? '#f5a623'
    : venInfo.pitch === 'Spin' ? '#06b6d4'
    : venInfo.pitch === 'Bowling' ? '#22c55e'
    : '#818cf8';

  return (
    <BottomSheet onClose={onClose}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
          <TeamLogo team={t1} size={32} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#eef0ff' }}>{t1} vs {t2}</div>
            <div style={{ fontSize: 10, color: '#7a85a0' }}>{day} {date} · {time} IST</div>
          </div>
          <TeamLogo team={t2} size={32} />
        </div>
        <div style={{ fontSize: 10, color: '#424960' }}>{venue}</div>
      </div>

      {/* Venue / Pitch */}
      <div style={{ background: '#0d0f1a', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#eef0ff' }}>Pitch Report</span>
          {venInfo.pitch && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${pitchColor}22`, color: pitchColor, border: `1px solid ${pitchColor}44` }}>
              {venInfo.pitch}
            </span>
          )}
        </div>

        {venInfo.pace !== undefined && (
          <PitchMeter pace={venInfo.pace} spin={venInfo.spin} />
        )}

        {venInfo.note && (
          <div style={{ marginTop: 8, fontSize: 10, color: '#7a85a0', lineHeight: 1.55 }}>{venInfo.note}</div>
        )}

        {/* 2026 actual averages */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {avg2026 ? (
            <>
              <div style={{ flex: 1, background: '#111421', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#eef0ff' }}>{avg2026.avg}</div>
                <div style={{ fontSize: 8, color: '#424960' }}>Avg score (IPL 2026)</div>
                <div style={{ fontSize: 8, color: '#424960', marginTop: 2 }}>{avg2026.matches} match{avg2026.matches > 1 ? 'es' : ''} played here</div>
              </div>
              <div style={{ flex: 1, background: '#111421', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#22c55e' }}>{avg2026.high}</div>
                <div style={{ fontSize: 8, color: '#424960' }}>Highest score</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#f87171', marginTop: 4 }}>{avg2026.low}</div>
                <div style={{ fontSize: 8, color: '#424960' }}>Lowest score</div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, background: '#111421', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#424960' }}>No IPL 2026 matches at this venue yet</div>
              <div style={{ fontSize: 9, color: '#424960', marginTop: 3 }}>Stats will update after first game</div>
            </div>
          )}
        </div>
      </div>

      {/* H2H */}
      <div style={{ background: '#0d0f1a', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#eef0ff', marginBottom: 10 }}>
          Head to Head <span style={{ fontSize: 9, color: '#424960', fontWeight: 400 }}>IPL 2026</span>
        </div>
        {h2h.total === 0 ? (
          <div style={{ fontSize: 10, color: '#424960', textAlign: 'center', padding: '8px 0' }}>
            These teams haven't met yet this season.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: T[t1]?.bg || '#6366f1' }}>{h2h.t1Wins}</div>
                <div style={{ fontSize: 9, color: '#7a85a0' }}>{t1} wins</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0 8px' }}>
                <div style={{ fontSize: 11, color: '#424960' }}>{h2h.total} played</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: T[t2]?.bg || '#06b6d4' }}>{h2h.t2Wins}</div>
                <div style={{ fontSize: 9, color: '#7a85a0' }}>{t2} wins</div>
              </div>
            </div>
            {h2h.matches.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderTop: '1px solid #1c2035' }}>
                <span style={{ fontSize: 9, color: '#424960' }}>{m.day} {m.date} · {m.res.t1s} vs {m.res.t2s}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: m.res.winner === t1 ? T[t1]?.bg || '#6366f1' : T[t2]?.bg || '#06b6d4' }}>
                  {m.res.winner} won · {m.res.margin}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Key Players — by credit (star value), not form tags */}
      <div style={{ background: '#0d0f1a', borderRadius: 12, padding: '12px 14px', marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#eef0ff', marginBottom: 4 }}>Key Players</div>
        <div style={{ fontSize: 9, color: '#424960', marginBottom: 10 }}>Highest-valued players in each squad</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ team: t1, players: keyT1 }, { team: t2, players: keyT2 }].map(({ team, players }) => (
            <div key={team} style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T[team]?.bg || '#7a85a0', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <TeamLogo team={team} size={14} /> {team}
              </div>
              {players.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0', borderBottom: '1px solid #1c2035' }}>
                  <span style={{ fontSize: 9, color: '#424960', width: 10 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: '#eef0ff', fontWeight: 600, lineHeight: 1.2 }}>{p.n}</div>
                    <span style={{ fontSize: 8, color: '#7a85a0' }}>{p.r}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#f5a623' }}>{p.cr}cr</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
