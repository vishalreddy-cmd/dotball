'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MatchCard from '@/components/MatchCard';
import PreMatchSheet from '@/components/PreMatchSheet';
import { buildSchedule, parseMatchUTC, isMatchLocked } from '@/lib/schedule';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

const fmtDocId = (code, fmt) => `${fmt}_${code}`;

function fmtSecs(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function JoinChallengeBanner({ schedule }) {
  const { user, profile, challenges, setChallenges } = useAuth();
  const { t }   = useTheme();
  const toast   = useToast();
  const router  = useRouter();
  const [code,  setCode]  = useState('');
  const [busy,  setBusy]  = useState(false);
  const [secs,  setSecs]  = useState(null);
  const [timerMatchId, setTimerMatchId] = useState(null);

  // Show countdown for the next upcoming match (not necessarily the live one)
  const nextMatch = schedule.find(m => m.status === 'next') || schedule.find(m => m.status === 'future');
  useEffect(() => {
    if (!nextMatch) return;
    const matchUTC = parseMatchUTC(nextMatch.date, nextMatch.time);
    setTimerMatchId(nextMatch.id);
    function tick() {
      const s = Math.floor((matchUTC - Date.now()) / 1000);
      setSecs(s >= 0 ? s : 0);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextMatch?.id]);

  async function join() {
    const c = code.trim().toUpperCase();
    if (c.length < 4) { toast('Enter a valid challenge code', false); return; }
    if (!user)        { toast('Please sign in first', false); return; }
    setBusy(true);
    try {
      const ids = [fmtDocId(c, 'xi'), fmtDocId(c, 'r3')];
      let found = null;
      for (const fid of ids) {
        if (challenges.some(ch => ch.id === fid)) {
          router.push(`/challenge/${fid}`); setBusy(false); return;
        }
        const snap = await getDoc(doc(db, 'challenges', fid));
        if (snap.exists()) { found = { id: fid, ...snap.data() }; break; }
      }
      if (!found) { toast('Challenge not found — check the code', false); setBusy(false); return; }

      // Check lock status of THIS challenge's specific match, not the current live match
      const challengeMatch = schedule.find(m => m.id === found.matchId);
      if (challengeMatch && isMatchLocked(challengeMatch)) {
        toast(`${found.matchLabel || 'That match'} has already started — picks are locked`, false);
        setBusy(false); return;
      }

      await updateDoc(doc(db, 'challenges', found.id), {
        members:     arrayUnion(user.uid),
        memberNames: arrayUnion(profile?.name || 'Player'),
        [`memberStatus.${user.uid}`]: 'pending',
      });
      setChallenges(prev => [...prev, { ...found, own: false }]);
      toast('Joined! Pick your squad now');
      router.push(`/challenge/${found.id}`);
    } catch (e) { toast(`Failed: ${e.message}`, false); }
    setBusy(false);
  }

  const showTimer = secs !== null && secs <= 180 && secs > 0;
  const canJoin   = code.length >= 4;

  return (
    <div style={{ marginTop: 12, marginBottom: 12, padding: '11px 12px', background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>Have a code? Join here</div>
          <div style={{ fontSize: 10, color: t.text2, marginTop: 1 }}>Enter the code your friend shared</div>
        </div>
        {/* Countdown pill — next match locking soon */}
        {showTimer && (
          <div style={{ padding: '4px 10px', borderRadius: 99, background: '#fb923c18', border: '1px solid #fb923c44', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 9, color: '#fb923c', fontWeight: 700 }}>Next locks in</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#fb923c', fontVariantNumeric: 'tabular-nums' }}>{fmtSecs(secs)}</span>
          </div>
        )}
      </div>

      {/* Code input + button */}
      <div style={{ display: 'flex', gap: 7 }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder=""
          maxLength={12}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 9,
            border: `1px solid ${t.border}`, background: t.surface2,
            color: '#f5a623', fontSize: 16, fontWeight: 800,
            letterSpacing: 4, textAlign: 'center', outline: 'none',
            fontFamily: 'Georgia, serif',
          }}
        />
        <button
          onClick={join}
          disabled={busy || !canJoin}
          style={{
            padding: '10px 16px', borderRadius: 9,
            background: canJoin ? '#6366f1' : t.surface2,
            color: canJoin ? '#fff' : t.text3,
            fontWeight: 700, fontSize: 12,
            cursor: canJoin ? 'pointer' : 'default',
            opacity: busy ? 0.6 : 1, flexShrink: 0,
            border: `1px solid ${canJoin ? 'transparent' : t.border}`,
          }}
        >
          {busy ? '...' : 'Join'}
        </button>
      </div>
    </div>
  );
}

function ScoringGuide() {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 18, marginBottom: 20 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, cursor: 'pointer' }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: t.text2 }}>How scoring works</span>
        <span style={{ color: t.text3 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ background: t.surface2, borderRadius: '0 0 10px 10px', border: `1px solid ${t.border}`, borderTop: 'none', padding: '10px 12px' }}>
          {SCORING_ROWS.map((row, i) =>
            row.section ? (
              <div key={i} style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, marginTop: i === 0 ? 0 : 10, marginBottom: 4 }}>
                {row.section}
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 4, borderBottom: `1px solid ${t.border}44`, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: t.text2 }}>{row.label}</span>
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
  { label: 'Impact Player (correct prediction)', pts: '×1.25' },
  { label: 'Impact Player (wrong prediction)', pts: '×1.0' },
  { section: 'IPL Rules' },
  { label: 'Max overseas in XI', pts: '4' },
  { label: 'Impact sub (if 4 overseas)', pts: 'Indian only' },
];

export default function HomePage() {
  const { t } = useTheme();
  const { challenges } = useAuth();
  const [schedule,     setSchedule]     = useState(() => buildSchedule());
  const [pastOpen,     setPastOpen]     = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [preMatch,     setPreMatch]     = useState(null);

  useEffect(() => {
    const id = setInterval(() => setSchedule(buildSchedule()), 60_000);
    return () => clearInterval(id);
  }, []);

  const past   = schedule.filter(m => m.status === 'past');
  const live   = schedule.filter(m => m.status === 'live');
  const next   = schedule.filter(m => m.status === 'next');
  const future = schedule.filter(m => m.status === 'future');

  const pinnedMatch = live[0] || next[0] || future[0] || null;
  const collapsible = (() => {
    if (live.length > 0)  return [...next, ...future];
    if (next.length > 0)  return future;
    return future.slice(1);
  })();

  return (
    <div style={{ padding: '0 14px' }}>

      {/* Join challenge banner */}
      <JoinChallengeBanner schedule={schedule} />

      {/* Live match banner — only if user has a challenge for this match */}
      {live.length > 0 && challenges.some(ch => ch.matchId === live[0].id) && (
        <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12, border: `1px solid ${t.border}`, background: t.surface }}>
          <div style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>How am I doing? <span style={{ opacity: .7, fontWeight: 400 }}>Tap to see</span></span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#c7d2fe' }}>Live now</span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: t.text2, marginBottom: 5, textAlign: 'center' }}>Match in progress</div>
            <div style={{ height: 4, borderRadius: 99, background: t.surface2, overflow: 'hidden' }}>
              <div style={{ height: 4, borderRadius: 99, background: 'linear-gradient(90deg,#6366f1,#06b6d4)', width: '60%' }} />
            </div>
            <div style={{ fontSize: 9, color: t.text2, marginTop: 5, textAlign: 'center' }}>Tap to see your squad points</div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 2 }}>IPL 2026</div>
      <div style={{ fontSize: 11, color: t.text2, marginBottom: 13 }}>Pick a match</div>

      {/* Past matches — collapsible */}
      {past.length > 0 && (
        <>
          <button
            onClick={() => setPastOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, cursor: 'pointer', marginBottom: 9 }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: t.text3 }}>Past matches</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, color: t.text3, background: t.surface2, padding: '2px 8px', borderRadius: 99 }}>{past.length} matches</span>
              <span style={{ color: t.text3 }}>{pastOpen ? '▲' : '▼'}</span>
            </div>
          </button>
          {pastOpen && past.map(m => <MatchCard key={m.id} match={m} dim />)}
        </>
      )}

      {/* Pinned next match */}
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

      <ScoringGuide />

      {preMatch && <PreMatchSheet match={preMatch} onClose={() => setPreMatch(null)} />}
    </div>
  );
}
