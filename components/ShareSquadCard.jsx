'use client';
import { useRef, useState } from 'react';
import TeamLogo from './TeamLogo';
import { CR } from '@/lib/credits';
import data from '@/data/squads.json';

const T = data.teams;

/* Role shorthand for rendering */
const ROLE_LABEL = { BAT: 'BAT', WK: 'WK', AR: 'AR', BOWL: 'BOWL' };

export default function ShareSquadCard({ match, players, C, VC, IP1, IP2, onClose }) {
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied]  = useState(false);

  const t1Players = players.filter(p => p.team === match.t1);
  const t2Players = players.filter(p => p.team === match.t2);

  function badge(p) {
    if (C?.id  === p.id) return { label: 'C',   bg: '#f59e0b', tc: '#000' };
    if (VC?.id === p.id) return { label: 'VC',  bg: '#818cf8', tc: '#fff' };
    if (IP1?.id === p.id) return { label: 'IP1', bg: '#34d399', tc: '#000' };
    if (IP2?.id === p.id) return { label: 'IP2', bg: '#34d399', tc: '#000' };
    return null;
  }

  /* Share as text via Web Share API */
  async function shareText() {
    setSharing(true);
    const lines = [
      `🏏 My dotball XI — ${match.t1} vs ${match.t2}`,
      `${match.day} ${match.date} · ${match.time} IST`,
      '',
      ...players.map(p => {
        const b = badge(p);
        const tag = b ? ` [${b.label}]` : '';
        return `• ${p.n}${tag} (${p.r})`;
      }),
      '',
      'Pick yours on dotball!'
    ];
    const text = lines.join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My dotball XI', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) { /* cancelled */ }
    setSharing(false);
  }

  /* Copy as text fallback */
  async function copyText() {
    const lines = [
      `🏏 My dotball XI — ${match.t1} vs ${match.t2}`,
      `${match.day} ${match.date} · ${match.time} IST`,
      '',
      ...players.map(p => {
        const b = badge(p);
        const tag = b ? ` [${b.label}]` : '';
        return `• ${p.n}${tag}`;
      }),
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div
        className="sheet-enter"
        style={{ width: '100%', maxWidth: 430, background: '#111421', borderRadius: '20px 20px 0 0', border: '1px solid #1c2035', paddingBottom: 'max(32px, calc(18px + env(safe-area-inset-bottom))', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#1c2035', margin: '12px auto 16px' }} />

        {/* Visual card preview */}
        <div
          ref={cardRef}
          style={{
            margin: '0 16px 16px',
            borderRadius: 16,
            background: 'linear-gradient(135deg,#0c1040 0%,#111421 50%,#0d1a00 100%)',
            border: '1px solid #6366f144',
            overflow: 'hidden',
          }}
        >
          {/* Card header */}
          <div style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', padding: '10px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>🏏 dotball XI</div>
            <div style={{ fontSize: 10, color: '#c7d2fe', marginTop: 1 }}>{match.t1} vs {match.t2} · {match.day} {match.date}</div>
          </div>

          {/* Team columns */}
          <div style={{ display: 'flex', padding: '12px 10px', gap: 6 }}>
            {[{ team: match.t1, ps: t1Players }, { team: match.t2, ps: t2Players }].map(({ team, ps }) => (
              <div key={team} style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <TeamLogo team={team} size={16} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: T[team]?.bg || '#eef0ff' }}>{team}</span>
                </div>
                {ps.map(p => {
                  const b = badge(p);
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 0', borderBottom: '1px solid #1c2035' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#eef0ff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.n.split(' ').pop()}</span>
                      {b && <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: b.bg, color: b.tc, fontWeight: 800, flexShrink: 0 }}>{b.label}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ background: '#0d0f1a', padding: '6px 16px', textAlign: 'center' }}>
            <span style={{ fontSize: 9, color: '#424960' }}>Made with dotball · No money, just cricket knowledge</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={shareText}
            disabled={sharing}
            style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#25D366,#128C7E)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {sharing ? 'Sharing...' : '🟢 Share on WhatsApp'}
          </button>
          <button
            onClick={copyText}
            style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #1c2035', background: 'transparent', color: copied ? '#22c55e' : '#7a85a0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
          >
            {copied ? '✓ Copied to clipboard' : 'Copy squad list'}
          </button>
          <button
            onClick={onClose}
            style={{ width: '100%', padding: 10, borderRadius: 12, border: 'none', background: 'transparent', color: '#424960', fontSize: 12, cursor: 'pointer', marginBottom: 4 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
