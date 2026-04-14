'use client';
import TeamLogo from './TeamLogo';
import { ROLE_COLORS } from '@/lib/credits';

export default function RoleAssigner({ players, C, VC, IP1, IP2, onC, onVC, onIP, onLock, onBack, ipMustBeIndian }) {
  const ipInvalid = (p) => ipMustBeIndian && p.c && p.c !== 'IN' && (IP1?.id === p.id || IP2?.id === p.id);
  const hasInvalidIP = players.some(p => ipInvalid(p));
  const ready = !!(C && VC && IP1 && IP2 && !hasInvalidIP);
  const missing = [!C && 'Captain', !VC && 'Vice-Captain', !IP1 && 'IP1', !IP2 && 'IP2', hasInvalidIP && 'IP must be Indian'].filter(Boolean);

  return (
    <div style={{ padding: '12px 12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#eef0ff' }}>Assign roles</div>
        {onBack && (
          <button
            onClick={onBack}
            style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #1c2035', background: 'transparent', color: '#7a85a0', fontSize: 11, cursor: 'pointer' }}
          >
            ← Change players
          </button>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#7a85a0', marginBottom: 6 }}>
        C = 2× · VC = 1.5× · IP1 &amp; IP2 = predict impact sub (×1.25 if correct)
      </div>

      {/* Overseas IP warning */}
      {ipMustBeIndian && (
        <div style={{ borderRadius: 9, padding: '7px 10px', background: '#1a0a00', border: '1px solid #f59e0b44', marginBottom: 10, fontSize: 10, color: '#fbbf24' }}>
          Your XI has 4 overseas players — Impact Players must be Indian (IPL rule)
        </div>
      )}

      {players.map(p => {
        const roleColor = ROLE_COLORS[p.r] || '#818cf8';
        const isC   = C?.id === p.id;
        const isVC  = VC?.id === p.id;
        const isIP1 = IP1?.id === p.id;
        const isIP2 = IP2?.id === p.id;
        const isOverseas = p.c && p.c !== 'IN';
        const isIP = isIP1 || isIP2;
        // C/VC blocked if player is already an IP
        const cvBlocked = isIP && !isC && !isVC;
        // IP blocked if player is C or VC, or overseas rule applies
        const ipBlocked = ((isC || isVC) && !isIP) || (ipMustBeIndian && isOverseas && !isIP);
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 11, background: '#111421', border: `1px solid ${ipInvalid(p) ? '#ef444444' : '#1c2035'}`, marginBottom: 6 }}>
            <TeamLogo team={p.team} size={26} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#eef0ff' }}>{p.n}</span>
                {isOverseas && <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 4, background: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed33' }}>{p.c}</span>}
              </div>
              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 99, background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30` }}>{p.r}</span>
              {ipInvalid(p) && <span style={{ fontSize: 8, color: '#ef4444', marginLeft: 4 }}>⚠ must be Indian</span>}
            </div>
            <button
              onClick={() => !cvBlocked && onC(p.id)}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: cvBlocked ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 9, background: isC ? '#f59e0b' : '#1c2035', color: isC ? '#000' : '#424960', opacity: cvBlocked ? 0.25 : 1 }}
            >C</button>
            <button
              onClick={() => !cvBlocked && onVC(p.id)}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: cvBlocked ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 9, background: isVC ? '#818cf8' : '#1c2035', color: isVC ? '#fff' : '#424960', opacity: cvBlocked ? 0.25 : 1 }}
            >VC</button>
            <button
              onClick={() => !ipBlocked && onIP(p.id)}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: ipBlocked ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 8, background: isIP ? '#34d399' : '#1c2035', color: isIP ? '#000' : '#424960', opacity: ipBlocked ? 0.25 : 1 }}
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
