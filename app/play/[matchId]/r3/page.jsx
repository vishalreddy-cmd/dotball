'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useR3Squad } from '@/lib/useSquad';
import { CR, ROLE_COLORS } from '@/lib/credits';
import { buildSchedule, isMatchLocked } from '@/lib/schedule';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import TeamLogo from '@/components/TeamLogo';
import data from '@/data/squads.json';

const T  = data.teams;
const SQ = data.squads;

export default function R3Page() {
  const { matchId } = useParams();
  const { user, profile, challenges } = useAuth();
  const toast = useToast();

  const schedule = useMemo(() => buildSchedule(), []);
  const match    = schedule.find(m => m.id === matchId);

  const { squad3, done, toggle, removeAt, lock, reset, loadR3 } = useR3Squad();

  const [teamFilter, setTeamFilter] = useState('ALL');
  const [query,      setQuery]      = useState('');
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (!user || !match) return;
    getDoc(doc(db, 'squads', `${matchId}_${user.uid}_r3`)).then(snap => {
      if (snap.exists()) {
        const allPlayers = buildAllPlayers(match);
        loadR3(snap.data(), allPlayers);
      }
    }).catch(() => {});
  }, [user, match, matchId, loadR3]);

  if (!match) return <div style={{ padding: 20, color: '#9a9590' }}>Match not found.</div>;

  function buildAllPlayers(m) {
    return [
      ...(SQ[m.t1] || []).map(p => ({ ...p, team: m.t1 })),
      ...(SQ[m.t2] || []).map(p => ({ ...p, team: m.t2 })),
    ];
  }

  const allPlayers = buildAllPlayers(match);
  const filtered   = allPlayers.filter(p =>
    (teamFilter === 'ALL' || p.team === teamFilter) &&
    (!query || p.n.toLowerCase().includes(query.toLowerCase()))
  );

  async function handleSave() {
    if (!user) return;
    if (isMatchLocked(match)) { toast('Match has started — picks are locked!', false); return; }
    setSaving(true);
    try {
      await setDoc(doc(db, 'squads', `${matchId}_${user.uid}_r3`), {
        uid: user.uid, matchId, type: 'r3',
        name: profile?.name || 'Player',
        players: squad3.map(p => p.id),
        lockedAt: serverTimestamp(), revealed: false, runs: 0,
      });
      toast('Top 3 saved to dotball!');
    } catch (e) {
      toast(`Save failed: ${e.message}`, false);
    }
    setSaving(false);
  }

  /* ── DONE view ── */
  if (done) {
    const existingCh = challenges.length ? challenges[0] : null;
    return (
      <div style={{ padding: '12px 12px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 38, marginBottom: 6 }}>🎉</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: '#e8e6e0' }}>Top 3 locked!</div>
        <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 4 }}>Hidden until first ball</div>
        <div style={{ fontSize: 10, color: '#9a9590', marginBottom: 16 }}>1 run = 1 point · no bonuses</div>

        {squad3.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 13, marginBottom: 8, background: '#222222', border: `2px solid ${T[p.team]?.bg || '#6366f1'}66`, textAlign: 'left' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#383838', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#f5a623', flexShrink: 0 }}>{i + 1}</div>
            <TeamLogo team={p.team} size={34} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#e8e6e0' }}>{p.n}</div>
              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: `${ROLE_COLORS[p.r]}18`, color: ROLE_COLORS[p.r], border: `1px solid ${ROLE_COLORS[p.r]}30` }}>{p.r}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#06b6d4' }}>{(CR[p.id] || 7).toFixed(1)} cr</div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, paddingBottom: 12, marginTop: 4 }}>
          <button onClick={reset} style={{ flex: 1, padding: 11, borderRadius: 11, border: '1px solid #383838', background: 'transparent', color: '#9a9590', cursor: 'pointer', fontSize: 12 }}>Edit</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 11, borderRadius: 11, border: '1px solid #383838', background: 'transparent', color: saving ? '#22c55e' : '#9a9590', cursor: 'pointer', fontSize: 12 }}>
            {saving ? 'Saving...' : 'Save this squad'}
          </button>
        </div>
      </div>
    );
  }

  /* ── PICK view ── */
  return (
    <div style={{ padding: '12px 12px 0' }}>
      {/* Match header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <TeamLogo team={match.t1} size={16} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#e8e6e0' }}>{match.t1}</span>
          <span style={{ color: '#5e5a56', fontSize: 9 }}>vs</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#e8e6e0' }}>{match.t2}</span>
          <TeamLogo team={match.t2} size={16} />
        </div>
        <div style={{ fontSize: 9, color: '#06b6d4', background: '#0c1a2c', padding: '3px 7px', borderRadius: 7, border: '1px solid #0e7490' }}>1 run = 1 pt</div>
      </div>

      {/* Info banner */}
      <div style={{ borderRadius: 12, padding: '10px 13px', background: '#0c1040', border: '1px solid #6366f133', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e8e6e0', marginBottom: 2 }}>Top 3 — Predict your top 3 run scorers</div>
        <div style={{ fontSize: 10, color: '#9a9590' }}>Pick 3 batters · max 2 from same team</div>
      </div>

      {/* Slot indicators */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
        {[0, 1, 2].map(i => {
          const p = squad3[i];
          return (
            <div
              key={i}
              onClick={() => p && removeAt(i)}
              style={{
                flex: 1, borderRadius: 11, padding: '9px 4px', textAlign: 'center',
                cursor: p ? 'pointer' : 'default',
                background: p ? `${T[p.team]?.bg || '#6366f1'}22` : '#222222',
                border: p ? `2px solid ${T[p.team]?.bg || '#6366f1'}66` : '1.5px dashed #383838',
              }}
            >
              {p ? (
                <>
                  <TeamLogo team={p.team} size={22} />
                  <div style={{ fontSize: 9, fontWeight: 700, color: T[p.team]?.bg || '#6366f1', marginTop: 3 }}>{p.n.split(' ')[0]}</div>
                  <div style={{ fontSize: 7, color: '#5e5a56' }}>tap to remove</div>
                </>
              ) : (
                <div style={{ fontSize: 9, color: '#5e5a56', paddingTop: 6 }}>Slot {i + 1}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Team filter */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
        {['ALL', match.t1, match.t2].map(v => (
          <button key={v} onClick={() => setTeamFilter(v)} style={{ flex: 1, padding: '5px 3px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, background: teamFilter === v ? '#06b6d4' : '#2a2a2a', color: teamFilter === v ? '#fff' : '#9a9590' }}>{v}</button>
        ))}
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search batter..."
        style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: '1px solid #383838', background: '#2a2a2a', color: '#e8e6e0', fontSize: 11, outline: 'none', marginBottom: 8, fontFamily: 'inherit' }}
      />

      {/* Player list */}
      <div style={{ maxHeight: 290, overflowY: 'auto' }}>
        {filtered.map(p => {
          const isSel = squad3.some(s => s && s.id === p.id);
          const full  = squad3.length >= 3;
          const tooManyTeam = squad3.filter(s => s && s.team === p.team).length >= 2;
          const dis = !isSel && (full || tooManyTeam);
          const tc  = T[p.team];
          const roleColor = ROLE_COLORS[p.r] || '#818cf8';
          return (
            <div
              key={p.id}
              onClick={() => !dis && toggle(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 11, marginBottom: 5,
                cursor: dis && !isSel ? 'not-allowed' : 'pointer',
                border: isSel ? `1.5px solid ${tc?.bg || '#6366f1'}66` : '1px solid #383838',
                background: isSel ? `${tc?.bg || '#6366f1'}18` : '#222222',
                opacity: dis && !isSel ? 0.3 : 1,
              }}
            >
              <TeamLogo team={p.team} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e8e6e0' }}>{p.n}</span>
                  {p.form === 'hot' && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: '#ef444418', color: '#f87171', border: '1px solid #ef444430', marginLeft: 4 }}>🔥</span>}
                </div>
                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30` }}>{p.r}</span>
              </div>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, border: `1.5px solid ${isSel ? `${tc?.bg || '#6366f1'}88` : '#383838'}`, background: isSel ? tc?.bg || '#6366f1' : '#383838', color: isSel ? '#fff' : '#5e5a56' }}>
                {isSel ? '✓' : '+'}
              </div>
            </div>
          );
        })}
      </div>

      {squad3.length === 3 && (
        <button onClick={lock} style={{ width: '100%', marginTop: 10, padding: 13, borderRadius: 12, border: 'none', background: '#06b6d4', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Lock in my Top 3
        </button>
      )}
    </div>
  );
}
