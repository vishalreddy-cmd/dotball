'use client';
import TeamLogo from './TeamLogo';
import { ROLE_COLORS } from '@/lib/credits';

export default function RoleAssigner({ players, C, VC, IP1, IP2, onC, onVC, onIP, onLock }) {
  const ready = !!(C && VC && IP1 && IP2);
  const missing = [!C && 'Captain', !VC && 'Vice-Captain', !IP1 && 'Impact Player 1', !IP2 && 'Impact Player 2'].filter(Boolean);

  return (
    <div style={{ padding: '12px 12px 0' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#eef0ff', marginBottom: 2 }}>Assign roles</div>
      <div style={{ fontSize: 11, color: '#7a85a0', marginBottom: 12 }}>
        C = 2× · VC = 1.5× · IP1 &amp; IP2 = Impact subs (one per team)
      </div>

      {players.map(p => {
        const roleColor = ROLE_COLORS[p.r] || '#818cf8';
        const isC   = C?.id === p.id;
        const isVC  = VC?.id === p.id;
        const isIP1 = IP1?.id === p.id;
        const isIP2 = IP2?.id === p.id;
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 11, background: '#111421', border: '1px solid #1c2035', marginBottom: 6 }}>
            <TeamLogo team={p.team} size={26} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#eef0ff' }}>{p.n}</div>
              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30` }}>{p.r}</span>
            </div>
            <button
              onClick={() => onC(p.id)}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 9, background: isC ? '#f59e0b' : '#1c2035', color: isC ? '#000' : '#424960' }}
            >C</button>
            <button
              onClick={() => onVC(p.id)}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 9, background: isVC ? '#818cf8' : '#1c2035', color: isVC ? '#fff' : '#424960' }}
            >VC</button>
            <button
              onClick={() => onIP(p.id)}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 8, background: isIP1 || isIP2 ? '#34d399' : '#1c2035', color: isIP1 || isIP2 ? '#000' : '#424960' }}
            >{isIP1 ? 'IP1' : isIP2 ? 'IP2' : 'IP'}</button>
          </div>
        );
      })}

      <button
        onClick={ready ? onLock : undefined}
        disabled={!ready}
        style={{
          width: '100%', padding: 13, borderRadius: 12, border: 'none',
          fontWeight: 700, fontSize: 13,
          cursor: ready ? 'pointer' : 'not-allowed',
          background: ready ? '#6366f1' : '#1e293b',
          color: ready ? '#fff' : '#475569',
          marginTop: 4,
        }}
      >
        {ready ? 'Lock squad' : `Need: ${missing.join(', ')}`}
      </button>
    </div>
  );
}
