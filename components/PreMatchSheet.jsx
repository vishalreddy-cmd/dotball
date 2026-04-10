'use client';
import BottomSheet from './BottomSheet';
import TeamLogo from './TeamLogo';
import data from '@/data/squads.json';

const T    = data.teams;
const SQ   = data.squads;
const VEN  = data.venues || {};
const STATS = data.stats2026 || {};

/** Parse "203/4" → 203 */
function parseRuns(scoreStr) {
  if (!scoreStr) return null;
  const n = parseInt(scoreStr.split('/')[0], 10);
  return isNaN(n) ? null : n;
}

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
  const avg  = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const high = Math.max(...scores);
  const low  = Math.min(...scores);
  return { avg, high, low, matches: played.length };
}

function getH2H(t1, t2) {
  const matches = data.schedule.filter(
    m => m.res && ((m.t1 === t1 && m.t2 === t2) || (m.t1 === t2 && m.t2 === t1))
  );
  const t1Wins = matches.filter(m => m.res?.winner === t1).length;
  const t2Wins = matches.filter(m => m.res?.winner === t2).length;
  return { total: matches.length, t1Wins, t2Wins, matches };
}

/** Find orange cap (most runs) and purple cap (most wickets) holder IDs across all players */
function getCapHolders() {
  let orangeId = null, orangeRuns = 0;
  let purpleId = null, purpleWkts = 0;
  Object.entries(STATS).forEach(([id, s]) => {
    if ((s.runs || 0) > orangeRuns) { orangeRuns = s.runs; orangeId = id; }
    if ((s.wkts || 0) > purpleWkts) { purpleWkts = s.wkts; purpleId = id; }
  });
  return { orangeId, purpleId };
}

/** Top 3 most impactful players from a team based on 2026 stats */
function getKeyPlayers(team, limit = 3) {
  const players = (SQ[team] || []).map(p => {
    const s = STATS[p.id];
    const impact = s ? (s.runs || 0) + (s.wkts || 0) * 25 : 0;
    return { ...p, impact, runs: s?.runs || 0, wkts: s?.wkts || 0, mat: s?.mat || 0 };
  });
  players.sort((a, b) => b.impact - a.impact);
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
  const { orangeId, purpleId } = getCapHolders();

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

      {/* Key Players — top 3 by 2026 impact (runs + wkts) */}
      <div style={{ background: '#0d0f1a', borderRadius: 12, padding: '12px 14px', marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#eef0ff' }}>Key Players</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: '#f97316' }}>
              <img src="/orange-cap.svg" width={14} height={10} alt="Orange Cap" /> Orange Cap
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: '#8b5cf6' }}>
              <img src="/purple-cap.svg" width={14} height={10} alt="Purple Cap" /> Purple Cap
            </span>
          </div>
        </div>
        <div style={{ fontSize: 9, color: '#424960', marginBottom: 10 }}>Top 3 by IPL 2026 impact</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ team: t1, players: keyT1 }, { team: t2, players: keyT2 }].map(({ team, players }) => (
            <div key={team} style={{ flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: T[team]?.bg || '#7a85a0', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <TeamLogo team={team} size={14} /> {team}
              </div>
              {players.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 0', borderBottom: '1px solid #1c2035' }}>
                  <span style={{ fontSize: 9, color: '#424960', width: 10 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: '#eef0ff', fontWeight: 600 }}>{p.n}</span>
                      {p.id === orangeId && <img src="/orange-cap.svg" width={16} height={11} alt="Orange Cap" title="Orange Cap" />}
                      {p.id === purpleId && <img src="/purple-cap.svg" width={16} height={11} alt="Purple Cap" title="Purple Cap" />}
                    </div>
                    <div style={{ fontSize: 8, color: '#7a85a0', marginTop: 1 }}>
                      {p.mat > 0 ? (
                        <>
                          {p.runs > 0 && <span>{p.runs} runs</span>}
                          {p.runs > 0 && p.wkts > 0 && <span> · </span>}
                          {p.wkts > 0 && <span>{p.wkts} wkts</span>}
                          {p.mat > 0 && <span style={{ color: '#424960' }}> ({p.mat}m)</span>}
                        </>
                      ) : (
                        <span style={{ color: '#424960' }}>No stats yet</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
