'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { buildSchedule } from '@/lib/schedule';
import { CR } from '@/lib/credits';
import TeamLogo from '@/components/TeamLogo';
import data from '@/data/squads.json';

const T  = data.teams;
const SQ = data.squads;

const ALL_PLAYERS = Object.entries(SQ).flatMap(([team, players]) =>
  players.map(p => ({ ...p, team }))
);

function playerById(id) {
  return ALL_PLAYERS.find(p => p.id === id);
}

export default function RecapPage() {
  const { matchId } = useParams();
  const router      = useRouter();
  const { user, profile } = useAuth();

  const schedule = useMemo(() => buildSchedule(), []);
  const match    = schedule.find(m => m.id === matchId);

  const [xiSquad,  setXiSquad]  = useState(null);
  const [r3Squad,  setR3Squad]  = useState(null);
  const [groupRank, setGroupRank] = useState(null); // { rank, total }
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user || !match) return;
    async function load() {
      try {
        const [xiSnap, r3Snap] = await Promise.all([
          getDoc(doc(db, 'squads', `${matchId}_${user.uid}_xi`)),
          getDoc(doc(db, 'squads', `${matchId}_${user.uid}_r3`)),
        ]);
        if (xiSnap.exists()) setXiSquad(xiSnap.data());
        if (r3Snap.exists()) setR3Squad(r3Snap.data());

        // Compute rank among all revealed xi squads
        if (xiSnap.exists() && xiSnap.data().revealed) {
          const q = query(
            collection(db, 'squads'),
            where('matchId', '==', matchId),
            where('type', '==', 'xi'),
            where('revealed', '==', true)
          );
          const allSnap = await getDocs(q);
          const allRows = allSnap.docs.map(d => d.data());
          allRows.sort((a, b) => (b.points || 0) - (a.points || 0));
          const myRank = allRows.findIndex(r => r.uid === user.uid) + 1;
          setGroupRank({ rank: myRank, total: allRows.length });
        }
      } catch (e) { /* offline */ }
      setLoading(false);
    }
    load();
  }, [user, match, matchId]);

  if (!match) return <div style={{ padding: 20, color: '#7a85a0' }}>Match not found.</div>;

  if (loading) return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 28 }}>⏳</div>
      <div style={{ fontSize: 12, color: '#7a85a0', marginTop: 8 }}>Loading your recap...</div>
    </div>
  );

  const noPicks = !xiSquad && !r3Squad;

  return (
    <div style={{ padding: '12px 14px 24px' }}>
      {/* Match result banner */}
      {match.res ? (
        <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 14, border: '1px solid #22c55e44', background: 'linear-gradient(135deg,#0d1a0d,#111421)' }}>
          <div style={{ background: '#22c55e22', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e' }}>Match result</span>
            <span style={{ fontSize: 9, color: '#424960' }}>{match.day} {match.date}</span>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <TeamLogo team={match.t1} size={36} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#eef0ff', marginBottom: 2 }}>
                {match.res.t1s} <span style={{ color: '#424960', fontWeight: 400 }}>vs</span> {match.res.t2s}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e' }}>
                {match.res.winner} won by {match.res.margin}
              </div>
            </div>
            <TeamLogo team={match.t2} size={36} />
          </div>
        </div>
      ) : (
        <div style={{ borderRadius: 14, padding: '12px 14px', marginBottom: 14, background: '#111421', border: '1px solid #1c2035', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#7a85a0' }}>Result not yet added</div>
        </div>
      )}

      {noPicks ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', background: '#111421', borderRadius: 14, border: '1px solid #1c2035' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>😶</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#eef0ff', marginBottom: 6 }}>No squad picked</div>
          <div style={{ fontSize: 11, color: '#7a85a0' }}>You didn't pick a squad for this match.</div>
        </div>
      ) : (
        <>
          {/* Rank badge */}
          {groupRank && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, borderRadius: 12, padding: '10px 14px', background: groupRank.rank <= 3 ? '#1a1300' : '#111421', border: `1px solid ${groupRank.rank === 1 ? '#f5a62366' : groupRank.rank <= 3 ? '#f5a62333' : '#1c2035'}`, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: groupRank.rank === 1 ? '#f5a623' : groupRank.rank <= 3 ? '#f5a623' : '#eef0ff' }}>
                  {groupRank.rank === 1 ? '🥇' : groupRank.rank === 2 ? '🥈' : groupRank.rank === 3 ? '🥉' : `#${groupRank.rank}`}
                </div>
                <div style={{ fontSize: 9, color: '#7a85a0', marginTop: 2 }}>of {groupRank.total} players</div>
              </div>
              {xiSquad?.points > 0 && (
                <div style={{ flex: 1, borderRadius: 12, padding: '10px 14px', background: '#0c1040', border: '1px solid #6366f133', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#818cf8' }}>{xiSquad.points}</div>
                  <div style={{ fontSize: 9, color: '#7a85a0', marginTop: 2 }}>points</div>
                </div>
              )}
            </div>
          )}

          {/* Classic XI recap */}
          {xiSquad && (
            <div style={{ background: '#111421', borderRadius: 14, border: '1px solid #1c2035', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ background: '#6366f111', padding: '8px 14px', borderBottom: '1px solid #1c2035', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8' }}>Classic XI</span>
                {xiSquad.revealed
                  ? <span style={{ fontSize: 9, color: '#22c55e' }}>Points counted</span>
                  : <span style={{ fontSize: 9, color: '#f5a623' }}>Awaiting reveal</span>
                }
              </div>
              <div style={{ padding: '8px 10px' }}>
                {(xiSquad.players || []).map(pid => {
                  const p = playerById(pid);
                  if (!p) return null;
                  const pts = p.pts || null;
                  const isC   = xiSquad.captainId === pid;
                  const isVC  = xiSquad.vcId === pid;
                  const isIP1 = xiSquad.ip1Id === pid;
                  const isIP2 = xiSquad.ip2Id === pid;
                  return (
                    <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid #1c2035' }}>
                      <TeamLogo team={p.team} size={20} />
                      <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#eef0ff' }}>{p.n}</div>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {isC   && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#f59e0b', color: '#000', fontWeight: 800 }}>C</span>}
                        {isVC  && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#818cf8', color: '#fff', fontWeight: 800 }}>VC</span>}
                        {isIP1 && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#34d399', color: '#000', fontWeight: 800 }}>IP1</span>}
                        {isIP2 && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#34d399', color: '#000', fontWeight: 800 }}>IP2</span>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: pts ? '#22c55e' : '#424960', minWidth: 28, textAlign: 'right' }}>
                        {pts || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top 3 recap */}
          {r3Squad && (
            <div style={{ background: '#111421', borderRadius: 14, border: '1px solid #1c2035', marginBottom: 12, overflow: 'hidden' }}>
              <div style={{ background: '#06b6d411', padding: '8px 14px', borderBottom: '1px solid #1c2035', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4' }}>Top 3 Batters</span>
                {r3Squad.runs > 0
                  ? <span style={{ fontSize: 9, color: '#22c55e' }}>{r3Squad.runs} total runs</span>
                  : <span style={{ fontSize: 9, color: '#f5a623' }}>Awaiting reveal</span>
                }
              </div>
              <div style={{ padding: '8px 10px' }}>
                {(r3Squad.picks || []).map((pid, i) => {
                  const p = playerById(pid);
                  if (!p) return null;
                  return (
                    <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', borderBottom: '1px solid #1c2035' }}>
                      <span style={{ fontSize: 12, width: 18, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                      <TeamLogo team={p.team} size={20} />
                      <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#eef0ff' }}>{p.n}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: r3Squad.runs ? '#22c55e' : '#424960' }}>
                        {r3Squad.runs ? '—' : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <button
        onClick={() => router.back()}
        style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #1c2035', background: 'transparent', color: '#7a85a0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
      >
        Back
      </button>
    </div>
  );
}
