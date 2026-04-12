'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import TeamLogo from './TeamLogo';

const ROLE_COLORS = { BAT: '#60a5fa', WK: '#fbbf24', AR: '#34d399', BOWL: '#f87171' };

function StatPill({ label, value, color }) {
  if (!value && value !== 0) return null;
  return (
    <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: `${color}18`, color, border: `1px solid ${color}33`, marginLeft: 3 }}>
      {label} {value}
    </span>
  );
}

/**
 * Reads live score from Firestore liveCache/{matchId}.
 * The API route (called by Vercel Cron every 30s) writes to this doc.
 * All users share the same cached data — zero extra API calls per user.
 */
export default function LiveSquadScore({ matchId, players, captainId, vcId, ip1Id, ip2Id, match }) {
  const [cache, setCache] = useState(null);

  useEffect(() => {
    if (!matchId) return;
    const unsub = onSnapshot(doc(db, 'liveCache', matchId), snap => {
      if (snap.exists()) setCache(snap.data().payload);
    });
    return () => unsub();
  }, [matchId]);

  // Poll the API to keep Firestore cache fresh — all clients benefit via onSnapshot above
  useEffect(() => {
    if (!matchId) return;
    const poll = () => fetch(`/api/live-score?matchId=${matchId}`).catch(() => {});
    poll(); // fetch immediately on mount
    const id = setInterval(poll, 15_000); // then every 15s
    return () => clearInterval(id);
  }, [matchId]);

  const playerStats    = cache?.playerStats    || {};
  const score          = cache?.score          || [];
  const status         = cache?.status         || '';
  const live           = cache?.live           || false;
  const complete       = cache?.complete       || false;
  const noResult       = cache?.noResult       || false;
  const realImpactSubs = cache?.realImpactSubs || [];

  // ×1.25 only if you predicted the correct real impact sub
  const ipMultiplier = (id) =>
    (id === ip1Id || id === ip2Id) && realImpactSubs.includes(id) ? 1.25 : 1;

  const totalPts = players.reduce((sum, p) => {
    const s = playerStats[p.id];
    if (!s?.pts) return sum;
    let pts = s.pts;
    if (captainId === p.id) pts *= 2;
    else if (vcId === p.id) pts *= 1.5;
    else pts *= ipMultiplier(p.id);
    return sum + pts;
  }, 0);

  const sorted = [...players].sort((a, b) =>
    (playerStats[b.id] ? 1 : 0) - (playerStats[a.id] ? 1 : 0)
  );

  // Not live yet and no cache — show waiting state
  if (!cache && match.status !== 'live' && match.status !== 'past') {
    return (
      <div>
        {players.map(p => {
          const rc = ROLE_COLORS[p.r] || '#818cf8';
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 9, background: '#222222', border: `1px solid ${rc}22`, marginBottom: 4 }}>
              <TeamLogo team={p.team} size={22} />
              <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#e8e6e0' }}>{p.n}</div>
              {captainId === p.id && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#f59e0b', color: '#000', fontWeight: 800 }}>C</span>}
              {vcId === p.id      && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#818cf8', color: '#fff', fontWeight: 800 }}>VC</span>}
              {ip1Id === p.id     && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#34d399', color: '#000', fontWeight: 800 }}>IP1</span>}
              {ip2Id === p.id     && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#34d399', color: '#000', fontWeight: 800 }}>IP2</span>}
            </div>
          );
        })}
        <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 10, color: '#5e5a56' }}>
          Live stats appear here once the match starts
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Live scoreboard */}
      {(live || complete || score.length > 0) && (
        <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ background: live ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : '#383838', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>
              {live ? '🔴 Live' : noResult ? '🌧 No Result' : '✅ Final'}
            </span>
            {live && <span style={{ fontSize: 9, color: '#c7d2fe' }}>auto-updating</span>}
            {noResult && <span style={{ fontSize: 9, color: '#c7d2fe' }}>Match abandoned</span>}
          </div>
          {score.length > 0 && (
            <div style={{ background: '#2a2a2a', padding: '10px 14px', display: 'flex', gap: 8 }}>
              {score.map((s, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 3 }}>
                    <TeamLogo team={i === 0 ? match.t1 : match.t2} size={16} />
                    <span style={{ fontSize: 9, color: '#9a9590' }}>{i === 0 ? match.t1 : match.t2}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#e8e6e0' }}>{s.r}/{s.w}</div>
                  <div style={{ fontSize: 8, color: '#5e5a56' }}>{s.o} ov</div>
                </div>
              ))}
            </div>
          )}
          {status && (
            <div style={{ background: '#222222', padding: '5px 14px', fontSize: 9, color: '#22c55e', textAlign: 'center' }}>
              {status}
            </div>
          )}
        </div>
      )}

      {/* Squad total */}
      {(live || complete) && (
        <div style={{ borderRadius: 12, padding: '10px 14px', background: '#0c1040', border: '1px solid #6366f133', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc' }}>My squad points</div>
            <div style={{ fontSize: 9, color: '#5e5a56', marginTop: 1 }}>
              {live ? 'Updates in real time' : 'Final score'}
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#818cf8' }}>{Math.round(totalPts)}</div>
        </div>
      )}

      {/* Player rows */}
      {sorted.map(p => {
        const s     = playerStats[p.id];
        const isC   = captainId === p.id;
        const isVC  = vcId === p.id;
        const isIP1 = ip1Id === p.id;
        const isIP2 = ip2Id === p.id;
        const rc    = ROLE_COLORS[p.r] || '#818cf8';

        let pts = s?.pts || 0;
        if (isC)        pts = Math.round(pts * 2);
        else if (isVC)  pts = Math.round(pts * 1.5);
        else            pts = Math.round(pts * ipMultiplier(p.id));

        return (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 10px', borderRadius: 10, marginBottom: 5,
            background: s ? '#222222' : '#2a2a2a',
            border: `1px solid ${s ? '#383838' : '#2a2a2a'}`,
            opacity: s ? 1 : 0.4,
          }}>
            <TeamLogo team={p.team} size={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#e8e6e0' }}>{p.n}</span>
                {isC   && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: '#f59e0b', color: '#000', fontWeight: 800 }}>C×2</span>}
                {isVC  && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: '#818cf8', color: '#fff', fontWeight: 800 }}>VC×1.5</span>}
                {(isIP1 || isIP2) && realImpactSubs.includes(p.id) && (
                  <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: '#34d399', color: '#000', fontWeight: 800 }}>IP ×1.25</span>
                )}
                {(isIP1 || isIP2) && !realImpactSubs.includes(p.id) && realImpactSubs.length > 0 && (
                  <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: '#374151', color: '#9ca3af', fontWeight: 800 }}>IP missed</span>
                )}
                {(isIP1 || isIP2) && realImpactSubs.length === 0 && (
                  <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: '#34d39922', color: '#34d399', fontWeight: 800 }}>IP pick</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 4, background: `${rc}18`, color: rc }}>{p.r}</span>
                {s ? (
                  <>
                    {s.runs  !== undefined && <StatPill label="runs" value={s.runs}  color="#60a5fa" />}
                    {s.balls !== undefined && <StatPill label="b"    value={s.balls} color="#9a9590" />}
                    {s.fours > 0           && <StatPill label="4s"   value={s.fours} color="#34d399" />}
                    {s.sixes > 0           && <StatPill label="6s"   value={s.sixes} color="#f59e0b" />}
                    {s.wickets > 0         && <StatPill label="wkts" value={s.wickets} color="#f87171" />}
                    {s.overs               && <StatPill label="ov"   value={s.overs}   color="#818cf8" />}
                    {s.economy > 0         && <StatPill label="eco"  value={s.economy?.toFixed(1)} color="#a78bfa" />}
                  </>
                ) : (
                  <span style={{ fontSize: 8, color: '#5e5a56' }}>Yet to bat / bowl</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 32 }}>
              {s ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 900, color: pts > 0 ? '#22c55e' : '#9a9590' }}>{pts}</div>
                  <div style={{ fontSize: 8, color: '#5e5a56' }}>pts</div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: '#383838' }}>—</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
