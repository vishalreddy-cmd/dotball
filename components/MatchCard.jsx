'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TeamLogo from './TeamLogo';
import { parseMatchUTC } from '@/lib/schedule';
import { useTheme } from '@/context/ThemeContext';
import data from '@/data/squads.json';

const T = data.teams;

function useLiveCountdown(dateStr, timeStr, status) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (status === 'past' || status === 'live') return;

    function compute() {
      const matchUTC = parseMatchUTC(dateStr, timeStr);
      const diff = matchUTC - Date.now();
      if (diff <= 0) { setLabel(''); return; }
      const totalSec = Math.floor(diff / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (d > 0)  setLabel(`${d}d ${h}h ${m}m`);
      else if (h > 0) setLabel(`${h}h ${m}m ${s}s`);
      else        setLabel(`${m}m ${s}s`);
    }

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [dateStr, timeStr, status]);

  return label;
}

export default function MatchCard({ match, dim = false, onInfo }) {
  const router = useRouter();
  const { t } = useTheme();
  const { t1, t2, day, date, time, venue, status, res } = match;
  const isLive = status === 'live';
  const isNext = status === 'next';
  const countdown = useLiveCountdown(date, time, status);

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden', marginBottom: 10,
      border: isLive ? '1.5px solid rgba(99,102,241,.4)' : `1px solid ${t.border}`,
      background: `linear-gradient(135deg,${T[t1]?.dbg || t.surface} 0%,${t.surface} 50%,${T[t2]?.dbg || t.surface} 100%)`,
      cursor: isLive ? 'pointer' : 'default',
    }}>
      {isLive && (
        <div style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', padding: '5px 13px', fontSize: 10, fontWeight: 600, color: '#fff' }}>
          Live now — tap for scorecard
        </div>
      )}
      {dim && res && (
        <div style={{ background: t.surface2, padding: '4px 13px', fontSize: 9, color: '#22c55e', fontWeight: 600 }}>
          {res.winner} won by {res.margin}
        </div>
      )}
      {dim && !res && (
        <div style={{ background: t.surface2, padding: '3px 13px', fontSize: 9, color: t.text3 }}>Completed</div>
      )}

      <div style={{ padding: '11px 13px 10px' }}>
        {/* Teams row */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ textAlign: 'center', width: 72 }}>
            <TeamLogo team={t1} size={44} />
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: t.text2, marginBottom: 3 }}>{day} {date} · {time}</div>
            {isLive
              ? <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>Live <span style={{ fontSize: 10, color: t.text2, fontWeight: 400 }}>in progress</span></div>
              : res
                ? <div style={{ fontSize: 12, fontWeight: 800, color: t.text }}>{res.t1s} <span style={{ color: t.text3, fontWeight: 400 }}>vs</span> {res.t2s}</div>
                : <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>vs</div>
            }
            <div style={{ fontSize: 8, color: t.text3, marginTop: 2 }}>{venue}</div>

            {!isLive && !dim && countdown && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '3px 9px', borderRadius: 99, background: isNext ? '#f59e0b18' : t.surface2, border: `1px solid ${isNext ? '#f59e0b44' : t.border}` }}>
                <span style={{ fontSize: 8, color: isNext ? '#f5a623' : t.text2 }} className={isNext ? 'blink' : ''}>●</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: isNext ? '#f5a623' : t.text2, fontVariantNumeric: 'tabular-nums' }}>
                  Locks in {countdown}
                </span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', width: 72 }}>
            <TeamLogo team={t2} size={44} />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 7 }}>
          {dim ? (
            <div style={{ display: 'flex', gap: 7, width: '100%' }}>
              <div style={{ flex: 1, padding: 10, borderRadius: 9, background: t.surface2, textAlign: 'center', fontSize: 11, color: t.text3, fontWeight: 600 }}>
                Match completed
              </div>
              <button
                onClick={() => router.push(`/play/${match.id}/recap`)}
                style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid #6366f133', background: '#6366f111', color: '#818cf8', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
              >
                My recap
              </button>
            </div>
          ) : (
            <>
              {onInfo && (
                <button
                  onClick={() => onInfo(match)}
                  style={{ padding: '10px 12px', borderRadius: 9, border: `1px solid ${t.border}`, background: 'transparent', color: t.text2, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  title="Pre-match analysis"
                >
                  📊
                </button>
              )}
              <button
                onClick={() => router.push(`/play/${match.id}/xi`)}
                style={{ flex: 2, padding: 10, borderRadius: 9, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Classic XI
              </button>
              <button
                onClick={() => router.push(`/play/${match.id}/r3`)}
                style={{ flex: 1, padding: 10, borderRadius: 9, border: '1.5px solid #06b6d4', background: 'transparent', color: '#06b6d4', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
              >
                Top 3
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
