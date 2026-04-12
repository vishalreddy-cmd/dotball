'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { buildSchedule } from '@/lib/schedule';

export default function BoardsPage() {
  const { user } = useAuth();
  const [tab,     setTab]     = useState('xi');
  const [rows,    setRows]    = useState([]);
  const [season,  setSeason]  = useState([]);
  const [matchId, setMatchId] = useState(null);
  const [matchLabel, setMatchLabel] = useState('');
  const [seasonLoading, setSeasonLoading] = useState(false);

  useEffect(() => {
    const schedule = buildSchedule();
    const live = schedule.find(m => m.status === 'live');
    const last = [...schedule].filter(m => m.status === 'past').pop();
    const target = live || last;
    if (target) {
      setMatchId(target.id);
      setMatchLabel(`${target.t1} vs ${target.t2}`);
    }
  }, []);

  /* Per-match real-time leaderboard */
  useEffect(() => {
    if (!matchId || tab === 'season') return;
    let unsub;
    try {
      const q = query(
        collection(db, 'squads'),
        where('matchId', '==', matchId),
        where('revealed', '==', true)
      );
      unsub = onSnapshot(q, snap => {
        const all = snap.docs.map(d => ({ ...d.data(), isMe: d.data().uid === user?.uid }));
        const xiRows = all.filter(r => r.type === 'xi').sort((a, b) => (b.points || 0) - (a.points || 0));
        const r3Rows = all.filter(r => r.type === 'r3').sort((a, b) => (b.runs || 0) - (a.runs || 0));
        if (tab === 'xi') setRows(xiRows);
        else if (tab === 'r3') setRows(r3Rows);
      });
    } catch (e) { /* offline */ }
    return () => unsub?.();
  }, [matchId, user, tab]);

  /* Season leaderboard — aggregate all revealed xi squads */
  useEffect(() => {
    if (tab !== 'season') return;
    setSeasonLoading(true);
    async function loadSeason() {
      try {
        const q = query(
          collection(db, 'squads'),
          where('type', '==', 'xi'),
          where('revealed', '==', true)
        );
        const snap = await getDocs(q);
        const byUser = {};
        snap.docs.forEach(d => {
          const sq = d.data();
          if (!sq.uid) return;
          if (!byUser[sq.uid]) {
            byUser[sq.uid] = { uid: sq.uid, name: sq.name || 'Player', total: 0, matches: 0, gold: 0, silver: 0, bronze: 0 };
          }
          byUser[sq.uid].total   += sq.points || 0;
          byUser[sq.uid].matches += 1;
        });

        // Medal computation: for each match, rank all xi squads
        const byMatch = {};
        snap.docs.forEach(d => {
          const sq = d.data();
          if (!byMatch[sq.matchId]) byMatch[sq.matchId] = [];
          byMatch[sq.matchId].push(sq);
        });
        Object.values(byMatch).forEach(matchSquads => {
          const sorted = [...matchSquads].sort((a, b) => (b.points || 0) - (a.points || 0));
          sorted.forEach((sq, i) => {
            if (!byUser[sq.uid]) return;
            if (i === 0) byUser[sq.uid].gold++;
            else if (i === 1) byUser[sq.uid].silver++;
            else if (i === 2) byUser[sq.uid].bronze++;
          });
        });

        const sorted = Object.values(byUser)
          .sort((a, b) => b.total - a.total)
          .map(u => ({ ...u, isMe: u.uid === user?.uid }));
        setSeason(sorted);
      } catch (e) { /* offline */ }
      setSeasonLoading(false);
    }
    loadSeason();
  }, [tab, user]);

  const tabBtn = (id, label, activeColor) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: tab === id ? activeColor : 'transparent', color: tab === id ? (id === 'season' ? '#000' : '#fff') : '#9a9590' }}
    >
      {label}
    </button>
  );

  const rankIcon = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

  const displayRows = tab === 'season' ? season : rows;

  const emptyState = (
    <div style={{ background: '#222222', border: '1px solid #383838', borderRadius: 14, padding: '28px 16px', textAlign: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{tab === 'season' ? '🏆' : '📊'}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e8e6e0', marginBottom: 4 }}>
        {tab === 'season' ? 'Season underway' : 'No rankings yet'}
      </div>
      <div style={{ fontSize: 11, color: '#9a9590', lineHeight: 1.5 }}>
        {tab === 'season'
          ? 'Season standings appear once match squads are revealed. Play more matches to climb!'
          : 'Rankings appear once match squads are revealed after the first ball. Pick your squad now!'}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '12px 12px 0' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12, background: '#222222', padding: 4, borderRadius: 11, border: '1px solid #383838' }}>
        {tabBtn('xi', 'Classic XI', '#6366f1')}
        {tabBtn('r3', 'Top 3', '#06b6d4')}
        {tabBtn('season', 'Season', '#f59e0b')}
      </div>

      {/* Context info */}
      <div style={{ background: '#222222', border: '1px solid #383838', borderRadius: 14, padding: '9px 11px', marginBottom: 12, fontSize: 10, color: '#9a9590', lineHeight: 1.7 }}>
        {tab === 'xi' && <><span style={{ color: '#818cf8', fontWeight: 600 }}>Classic XI — </span>{matchLabel && <span style={{ color: '#5e5a56' }}>{matchLabel} · </span>}Points from batting, bowling, fielding, economy &amp; strike rate.</>}
        {tab === 'r3' && <><span style={{ color: '#06b6d4', fontWeight: 600 }}>Top 3 — </span>{matchLabel && <span style={{ color: '#5e5a56' }}>{matchLabel} · </span>}Total runs from your 3 predicted run scorers.</>}
        {tab === 'season' && <><span style={{ color: '#f5a623', fontWeight: 600 }}>Season — </span>Cumulative Classic XI points across all 74 matches. All-time rankings.</>}
      </div>

      {/* Season loading */}
      {tab === 'season' && seasonLoading && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#9a9590', fontSize: 11 }}>Loading season data...</div>
      )}

      {/* Rows */}
      {!seasonLoading && (displayRows.length === 0 ? emptyState : (
        displayRows.map((u, i) => (
          <div key={u.uid || i} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px', borderRadius: 13, marginBottom: 7,
            background: u.isMe ? (tab === 'season' ? '#1a1400' : '#1c1040') : '#222222',
            border: u.isMe
              ? `1.5px solid ${tab === 'season' ? '#f59e0b' : '#6366f1'}`
              : i === 0 ? '1.5px solid #f5a62344' : '1px solid #383838',
          }}>
            <div style={{ fontSize: i < 3 ? 19 : 12, width: 26, textAlign: 'center', flexShrink: 0 }}>{rankIcon(i)}</div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.isMe ? '#312e81' : '#383838', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: u.isMe ? '#c7d2fe' : '#9a9590', border: u.isMe ? '2px solid #6366f1' : '1px solid #383838', flexShrink: 0 }}>
              {(u.name || '?').substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e8e6e0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                {u.isMe && <span style={{ fontSize: 9, color: '#818cf8', background: '#312e81', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>You</span>}
              </div>
              {tab === 'season'
                ? <div style={{ fontSize: 10, color: '#5e5a56' }}>{u.matches || 0} matches · <span style={{ color: '#f5a623' }}>🥇{u.gold}</span> <span style={{ color: '#9ca3af' }}>🥈{u.silver}</span> <span style={{ color: '#b45309' }}>🥉{u.bronze}</span></div>
                : <div style={{ display: 'flex', gap: 5, marginTop: 2, fontSize: 9, color: '#5e5a56' }}>
                    <span>🥇{u.gold || 0}</span><span>🥈{u.silver || 0}</span><span>🥉{u.bronze || 0}</span>
                  </div>
              }
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: (u.points || u.total || u.runs) ? '#e8e6e0' : '#383838' }}>
                {tab === 'season' ? (u.total || '—') : (u.points || u.runs || '—')}
              </div>
              {(u.points || u.total || u.runs) ? <div style={{ fontSize: 8, color: '#9a9590' }}>{tab === 'r3' ? 'runs' : 'pts'}</div> : null}
            </div>
          </div>
        ))
      ))}
    </div>
  );
}
