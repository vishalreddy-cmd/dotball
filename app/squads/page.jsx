'use client';
import { useState } from 'react';
import TeamLogo from '@/components/TeamLogo';
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/credits';
import data from '@/data/squads.json';

const T  = data.teams;
const SQ = data.squads;

export default function SquadsPage() {
  const [team,   setTeam]   = useState('RCB');
  const [filter, setFilter] = useState('ALL');

  const t       = T[team];
  const players = SQ[team] || [];
  const shown   = filter === 'ALL' ? players : players.filter(p => p.r === filter);
  const captain = players.find(p => p.cap);

  return (
    <div style={{ padding: '12px 12px 0' }}>
      {/* Team grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, marginBottom: 12 }}>
        {Object.keys(T).map(k => (
          <button
            key={k}
            onClick={() => { setTeam(k); setFilter('ALL'); }}
            style={{
              padding: '6px 2px', borderRadius: 9,
              border: team === k ? `2px solid ${T[k].bg}aa` : '1px solid #383838',
              background: team === k ? `${T[k].bg}18` : '#222222',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}
          >
            <TeamLogo team={k} size={26} />
          </button>
        ))}
      </div>

      {/* Team header */}
      <div style={{ borderRadius: 13, padding: '11px 13px', marginBottom: 10, background: `linear-gradient(135deg,${t?.dbg || '#2a2a2a'},#222222)`, border: `1px solid ${t?.bg || '#6366f1'}44`, display: 'flex', gap: 10, alignItems: 'center' }}>
        <TeamLogo team={team} size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#e8e6e0' }}>{t?.name || team}</div>
          <div style={{ fontSize: 10, color: '#9a9590' }}>Captain: {captain?.n || '—'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: t?.bg || '#6366f1' }}>{players.length}</div>
          <div style={{ fontSize: 8, color: '#5e5a56' }}>players</div>
        </div>
      </div>

      {/* Role filter */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 9 }}>
        {['ALL', 'WK', 'BAT', 'AR', 'BOWL'].map(rx => (
          <button
            key={rx}
            onClick={() => setFilter(rx)}
            style={{ padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 700, background: filter === rx ? t?.bg || '#6366f1' : '#222222', color: filter === rx ? '#fff' : '#9a9590' }}
          >
            {rx === 'ALL' ? 'All' : ROLE_LABELS[rx]}
          </button>
        ))}
      </div>

      {/* Player list */}
      {shown.map(p => {
        const roleColor = ROLE_COLORS[p.r] || '#818cf8';
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: '#222222', border: '1px solid #383838', marginBottom: 4 }}>
            <div style={{ width: 18, flexShrink: 0 }}>
              {p.c !== 'IN' && <span style={{ fontSize: 7, color: '#5e5a56', border: '1px solid #383838', padding: '1px 3px', borderRadius: 3 }}>{p.c}</span>}
            </div>
            <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#e8e6e0', display: 'flex', alignItems: 'center' }}>
              {p.n}
              {p.form === 'hot'  && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: '#ef444418', color: '#f87171', border: '1px solid #ef444430', marginLeft: 4 }}>🔥</span>}
              {p.form === 'warn' && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: '#f59e0b18', color: '#fbbf24', border: '1px solid #f59e0b30', marginLeft: 4 }}>⚠</span>}
            </div>
            {p.cap && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: `${t?.bg || '#6366f1'}33`, color: t?.bg || '#6366f1', border: `1px solid ${t?.bg || '#6366f1'}55`, fontWeight: 700 }}>Cap</span>}
            <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30` }}>{p.r}</span>
          </div>
        );
      })}
    </div>
  );
}
