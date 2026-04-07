'use client';
import { useState, useEffect } from 'react';
import MatchCard from '@/components/MatchCard';
import PreMatchSheet from '@/components/PreMatchSheet';
import { buildSchedule } from '@/lib/schedule';

function ScoringGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 18, marginBottom: 20 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, border: '1px solid #1c2035', background: '#111421', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#7a85a0' }}>How scoring works</span>
        <span style={{ color: '#424960' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ background: '#0d0f1a', borderRadius: '0 0 10px 10px', border: '1px solid #1c2035', borderTop: 'none', padding: '10px 12px' }}>
          {SCORING_ROWS.map((row, i) =>
            row.section ? (
              <div key={i} style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, marginTop: i === 0 ? 0 : 10, marginBottom: 4 }}>
                {row.section}
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4, borderBottom: '1px solid #1c203522', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#7a85a0' }}>{row.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: row.pts.startsWith('-') ? '#f87171' : row.pts.startsWith('+') ? '#22c55e' : '#f5a623' }}>{row.pts}</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

const SCORING_ROWS = [
  { section: 'Batting' },
  { label: 'Per run', pts: '+1' },
  { label: '25 runs', pts: '+4' },
  { label: '50 runs', pts: '+8' },
  { label: '75 runs', pts: '+12' },
  { label: '100 runs', pts: '+16' },
  { label: 'Duck (BAT/WK)', pts: '-2' },
  { label: 'Per boundary (4)', pts: '+1' },
  { label: 'Per six', pts: '+2' },
  { label: 'SR ≥ 170 (min 10 runs)', pts: '+6' },
  { label: 'SR ≥ 150', pts: '+4' },
  { label: 'SR ≥ 130', pts: '+2' },
  { label: 'SR < 70 (min 10 balls)', pts: '-6' },
  { label: 'SR < 80', pts: '-4' },
  { label: 'SR < 100', pts: '-2' },
  { section: 'Bowling' },
  { label: 'Per wicket', pts: '+25' },
  { label: '3 wickets', pts: '+8' },
  { label: '4 wickets', pts: '+12' },
  { label: '5 wickets', pts: '+16' },
  { label: 'Economy < 5 (min 2 ov)', pts: '+6' },
  { label: 'Economy < 6', pts: '+4' },
  { label: 'Economy < 7', pts: '+2' },
  { label: 'Economy > 10', pts: '-2' },
  { label: 'Economy > 11', pts: '-4' },
  { label: 'Economy > 12', pts: '-6' },
  { section: 'Fielding' },
  { label: 'Catch', pts: '+8' },
  { label: 'Stumping', pts: '+12' },
  { label: 'Run out', pts: '+6' },
  { section: 'Multipliers' },
  { label: 'Captain', pts: '×2' },
  { label: 'Vice-Captain', pts: '×1.5' },
  { label: 'Impact Player', pts: '×1.25' },
  { section: 'IPL Rules' },
  { label: 'Max overseas in XI', pts: '4' },
  { label: 'Impact sub (if 4 overseas)', pts: 'Indian only' },
];

export default function HomePage() {
  const [schedule,    setSchedule]    = useState(() => buildSchedule());
  const [pastOpen,    setPastOpen]    = useState(false);
  const [upcomingOpen,setUpcomingOpen]= useState(false);
  const [notif,       setNotif]       = useState(true);
  const [preMatch,    setPreMatch]    = useState(null);

  useEffect(() => {
    const id = setInterval(() => setSchedule(buildSchedule()), 60_000);
    return () => clearInterval(id);
  }, []);

  const past   = schedule.filter(m => m.status === 'past');
  const live   = schedule.filter(m => m.status === 'live');
  const next   = schedule.filter(m => m.status === 'next');
  const future = schedule.filter(m => m.status === 'future');

  // Always pin the very next upcoming match; rest go in the collapsible
  const pinnedMatch = live[0] || next[0] || future[0] || null;
  const collapsible = (() => {
    if (live.length > 0)       return [...next, ...future];
    if (next.length > 0)       return future;
    return future.slice(1);
  })();

  return (
    <div style={{ padding: '0 14px' }}>

      {/* Notification banner */}
      {notif && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 12, marginBottom: 12, padding: '11px 12px', background: '#111421', borderRadius: 14, border: '1px solid #1c2035' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#eef0ff', marginBottom: 2 }}>dotball</div>
            <div style={{ fontSize: 11, color: '#7a85a0', lineHeight: 1.45 }}>Playing XI announced. Your winning team ready?</div>
            <div style={{ fontSize: 9, color: '#424960', marginTop: 3 }}>Preview of the notification you'll receive</div>
          </div>
          <button onClick={() => setNotif(false)} style={{ background: 'transparent', border: 'none', color: '#424960', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {/* Live match banner */}
      {live.length > 0 && (
        <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12, border: '1px solid rgba(99,102,241,.4)', background: 'linear-gradient(150deg,#0d0f1a,#111421)' }}>
          <div style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>How am I doing? <span style={{ opacity: .7, fontWeight: 400 }}>Tap to see</span></span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#c7d2fe' }}>Live now</span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#7a85a0', marginBottom: 5, textAlign: 'center' }}>Match in progress</div>
            <div style={{ height: 4, borderRadius: 99, background: '#1c2035', overflow: 'hidden' }}>
              <div style={{ height: 4, borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#06b6d4)', width: '60%' }} />
            </div>
            <div style={{ fontSize: 9, color: '#7a85a0', marginTop: 5, textAlign: 'center' }}>Tap to see your squad points</div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: '#eef0ff', marginBottom: 2 }}>IPL 2026</div>
      <div style={{ fontSize: 11, color: '#7a85a0', marginBottom: 13 }}>Pick a match</div>

      {/* Past matches — collapsible */}
      {past.length > 0 && (
        <>
          <button
            onClick={() => setPastOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, border: '1px solid #42496033', background: '#42496008', cursor: 'pointer', marginBottom: 9 }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: '#424960' }}>Past matches</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#424960aa', background: '#42496018', padding: '2px 8px', borderRadius: 99 }}>{past.length} matches</span>
              <span style={{ color: '#424960' }}>{pastOpen ? '▲' : '▼'}</span>
            </div>
          </button>
          {pastOpen && past.map(m => <MatchCard key={m.id} match={m} dim />)}
        </>
      )}

      {/* Pinned next match — always visible */}
      {pinnedMatch && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: live.length > 0 ? '#6366f1' : '#f5a623', marginBottom: 7, marginTop: 4 }}>
            {live.length > 0 ? 'Live now' : 'Next match'}
          </div>
          <MatchCard match={pinnedMatch} onInfo={setPreMatch} />
        </>
      )}

      {/* Upcoming — collapsible */}
      {collapsible.length > 0 && (
        <>
          <button
            onClick={() => setUpcomingOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, border: '1px solid #6366f133', background: '#6366f108', cursor: 'pointer', marginBottom: 9, marginTop: 4 }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8' }}>Upcoming matches</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#818cf8aa', background: '#6366f118', padding: '2px 8px', borderRadius: 99 }}>{collapsible.length} matches</span>
              <span style={{ color: '#818cf8' }}>{upcomingOpen ? '▲' : '▼'}</span>
            </div>
          </button>
          {upcomingOpen && collapsible.map(m => <MatchCard key={m.id} match={m} onInfo={setPreMatch} />)}
        </>
      )}

      {/* Scoring rules — collapsible */}
      <ScoringGuide />

      {/* Pre-match analysis sheet */}
      {preMatch && <PreMatchSheet match={preMatch} onClose={() => setPreMatch(null)} />}
    </div>
  );
}
