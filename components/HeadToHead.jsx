'use client';
import { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import TeamLogo from './TeamLogo';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import data from '@/data/squads.json';

const T  = data.teams;
const SQ = data.squads;

const ALL_PLAYERS = Object.entries(SQ).flatMap(([team, ps]) => ps.map(p => ({ ...p, team })));
function playerById(id) { return ALL_PLAYERS.find(p => p.id === id); }

export default function HeadToHead({ challenge, matchId, myUid, onClose }) {
  const [members, setMembers] = useState([]); // [{ uid, name, players, points }]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!challenge || !matchId) return;
    async function load() {
      try {
        const uids = challenge.members || [];
        const q = query(
          collection(db, 'squads'),
          where('matchId', '==', matchId),
          where('type', '==', challenge.fmt === 'r3' ? 'r3' : 'xi')
        );
        const snap = await getDocs(q);
        const byUid = {};
        snap.docs.forEach(d => {
          const sq = d.data();
          if (uids.includes(sq.uid)) byUid[sq.uid] = sq;
        });
        // Build member list — only those who have a squad + are in this challenge
        const rows = uids.map(uid => ({
          uid,
          name: challenge.memberNames?.[uids.indexOf(uid)] || 'Player',
          squad: byUid[uid] || null,
        }));
        setMembers(rows);
      } catch (e) { /* offline */ }
      setLoading(false);
    }
    load();
  }, [challenge, matchId]);

  const mySquad    = members.find(m => m.uid === myUid)?.squad;
  const opponents  = members.filter(m => m.uid !== myUid);

  function PlayerRow({ pid, myPids }) {
    const p = playerById(pid);
    if (!p) return null;
    const inMine = myPids?.includes(pid);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0', borderBottom: '1px solid #383838' }}>
        <TeamLogo team={p.team} size={16} />
        <span style={{ fontSize: 10, flex: 1, color: '#e8e6e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.n}</span>
        {inMine !== undefined && (
          <span style={{ fontSize: 9, color: inMine ? '#22c55e' : '#5e5a56' }}>{inMine ? '✓' : '—'}</span>
        )}
      </div>
    );
  }

  if (loading) return (
    <BottomSheet onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#9a9590', fontSize: 12 }}>Loading squads...</div>
    </BottomSheet>
  );

  const myPids = mySquad?.players || mySquad?.picks || [];

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#e8e6e0', marginBottom: 4 }}>
        {challenge.name}
      </div>
      <div style={{ fontSize: 10, color: '#9a9590', marginBottom: 14 }}>
        {challenge.fmt === 'r3' ? 'Top 3' : 'Classic XI'} · {members.length} members
      </div>

      {!mySquad && (
        <div style={{ background: '#1a1300', border: '1px solid #f59e0b33', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 10, color: '#fbbf24' }}>
          You haven't picked a squad for this match yet — comparison will show after you pick.
        </div>
      )}

      {opponents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#9a9590', fontSize: 11 }}>
          No opponents in this challenge yet.
        </div>
      ) : opponents.map(opp => {
        const oppPids = opp.squad?.players || opp.squad?.picks || [];
        if (!opp.squad) {
          return (
            <div key={opp.uid} style={{ background: '#222222', borderRadius: 12, border: '1px solid #383838', padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9a9590' }}>{opp.name}</div>
              <div style={{ fontSize: 10, color: '#5e5a56', marginTop: 2 }}>Hasn't picked yet</div>
            </div>
          );
        }

        // Overlap: players in both squads
        const both   = myPids.filter(id => oppPids.includes(id));
        const onlyMe = myPids.filter(id => !oppPids.includes(id));
        const onlyThem = oppPids.filter(id => !myPids.includes(id));

        return (
          <div key={opp.uid} style={{ background: '#222222', borderRadius: 12, border: '1px solid #383838', marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ background: '#383838', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e8e6e0' }}>{opp.name}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {opp.squad?.points > 0 && (
                  <span style={{ fontSize: 10, color: '#818cf8' }}>{opp.squad.points} pts</span>
                )}
                <span style={{ fontSize: 9, color: both.length >= 7 ? '#f5a623' : '#5e5a56', background: '#2a2a2a', padding: '2px 7px', borderRadius: 99 }}>
                  {both.length}/{Math.max(myPids.length, oppPids.length)} same
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              {/* My unique picks */}
              <div style={{ flex: 1, padding: '8px 10px', borderRight: '1px solid #383838' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#6366f1', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Only me</div>
                {onlyMe.length === 0
                  ? <div style={{ fontSize: 9, color: '#5e5a56' }}>None</div>
                  : onlyMe.map(id => {
                      const p = playerById(id);
                      return p ? (
                        <div key={id} style={{ fontSize: 10, color: '#a5b4fc', padding: '2px 0', borderBottom: '1px solid #383838', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.n.split(' ').pop()}
                        </div>
                      ) : null;
                    })
                }
              </div>
              {/* Shared picks */}
              <div style={{ flex: 1, padding: '8px 10px', borderRight: '1px solid #383838', background: '#2a2a2a' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#22c55e', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Both</div>
                {both.length === 0
                  ? <div style={{ fontSize: 9, color: '#5e5a56' }}>None</div>
                  : both.map(id => {
                      const p = playerById(id);
                      return p ? (
                        <div key={id} style={{ fontSize: 10, color: '#86efac', padding: '2px 0', borderBottom: '1px solid #383838', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.n.split(' ').pop()}
                        </div>
                      ) : null;
                    })
                }
              </div>
              {/* Their unique picks */}
              <div style={{ flex: 1, padding: '8px 10px' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#f5a623', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Only them</div>
                {onlyThem.length === 0
                  ? <div style={{ fontSize: 9, color: '#5e5a56' }}>None</div>
                  : onlyThem.map(id => {
                      const p = playerById(id);
                      return p ? (
                        <div key={id} style={{ fontSize: 10, color: '#fcd34d', padding: '2px 0', borderBottom: '1px solid #383838', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.n.split(' ').pop()}
                        </div>
                      ) : null;
                    })
                }
              </div>
            </div>
          </div>
        );
      })}
    </BottomSheet>
  );
}
