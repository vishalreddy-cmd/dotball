'use client';
import TeamLogo from './TeamLogo';
import { CR, ROLE_COLORS } from '@/lib/credits';
import data from '@/data/squads.json';

const T = data.teams;

function FormTag({ form }) {
  if (form === 'hot') return (
    <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: '#ef444418', color: '#f87171', border: '1px solid #ef444430', marginLeft: 4 }}>🔥</span>
  );
  if (form === 'warn') return (
    <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: '#f59e0b18', color: '#fbbf24', border: '1px solid #f59e0b30', marginLeft: 4 }}>⚠</span>
  );
  return null;
}

export default function PlayerCard({ player, selected, disabled, onToggle, ownership }) {
  const cr = CR[player.id] ?? 7;
  const tc = T[player.team];
  const roleColor = ROLE_COLORS[player.r] || '#818cf8';

  return (
    <div
      onClick={() => !disabled && onToggle(player)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 11, marginBottom: 5,
        cursor: disabled && !selected ? 'not-allowed' : 'pointer',
        border: selected ? `1.5px solid ${tc?.bg || '#6366f1'}66` : '1px solid #1c2035',
        background: selected ? `${tc?.bg || '#6366f1'}18` : '#111421',
        opacity: disabled && !selected ? 0.3 : 1,
        transition: 'background 0.15s',
      }}
    >
      <TeamLogo team={player.team} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#eef0ff' }}>{player.n}</span>
          {player.c !== 'IN' && <span style={{ fontSize: 9, color: '#424960', marginLeft: 3 }}>[{player.c}]</span>}
          <FormTag form={player.form} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30` }}>
            {player.r}
          </span>
          {ownership > 0 && (
            <span style={{ fontSize: 8, color: ownership >= 50 ? '#f5a623' : '#424960' }}>
              {ownership}% picked
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: selected ? tc?.bg || '#6366f1' : '#f5a623' }}>
        {cr.toFixed(1)}
      </div>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
        border: `1.5px solid ${selected ? `${tc?.bg || '#6366f1'}88` : '#1c2035'}`,
        background: selected ? tc?.bg || '#6366f1' : '#1c2035',
        color: selected ? '#fff' : '#424960',
        transition: 'transform .15s cubic-bezier(.34,1.56,.64,1)',
      }}>
        {selected ? '✓' : '+'}
      </div>
    </div>
  );
}
