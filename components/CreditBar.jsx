'use client';
import { ROLE_COLORS } from '@/lib/credits';

export default function CreditBar({ spent, selCount, roleCounts }) {
  const rem = Math.round((100 - spent) * 10) / 10;
  const pct = Math.min(100, spent);
  const low = rem < 10;

  return (
    <div style={{ background: '#222222', border: '1px solid #383838', borderRadius: 14, padding: '9px 12px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#9a9590' }}>Credits</span>
        <span style={{ fontSize: 11, fontWeight: 700 }}>
          <span style={{ color: low ? '#f87171' : '#22c55e' }}>{spent.toFixed(1)}</span>
          <span style={{ color: '#5e5a56' }}> / 100</span>
          <span style={{ fontSize: 9, color: '#5e5a56', marginLeft: 4 }}>({rem.toFixed(1)} left)</span>
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#383838', overflow: 'hidden' }}>
        <div style={{
          height: 5, borderRadius: 99, width: `${pct}%`,
          transition: 'width .3s',
          background: low
            ? 'linear-gradient(90deg,#ef4444,#f97316)'
            : 'linear-gradient(90deg,#6366f1,#06b6d4)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <div>
          {Object.entries(roleCounts).map(([r, c]) => (
            <span key={r} style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: `${ROLE_COLORS[r]}18`, color: ROLE_COLORS[r], marginRight: 3 }}>
              {r}: {c}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 9, color: '#5e5a56' }}>{selCount} / 11</span>
      </div>
    </div>
  );
}
