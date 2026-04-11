'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { buildSchedule, parseMatchUTC, isMatchLocked } from '@/lib/schedule';
import TeamLogo from '@/components/TeamLogo';
import data from '@/data/squads.json';

const T = data.teams;

const STATUS_CFG = {
  ready:      { color: '#22c55e', label: 'Squad ready',          dot: '#22c55e' },
  marinating: { color: '#f59e0b', label: 'Marinating the squad', dot: '#f59e0b' },
  pending:    { color: '#ef4444', label: 'Not ready',            dot: '#ef4444' },
};

function fmtSecs(s) {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ChallengeLobbyPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const { user, profile, challenges, setChallenges } = useAuth();
  const { t }     = useTheme();
  const toast     = useToast();

  const [challenge,     setChallenge]     = useState(null);
  const [notFound,      setNotFound]      = useState(false);
  const [tab,           setTab]           = useState('lobby');
  const [secs,          setSecs]          = useState(null);
  const [hasSavedSquad, setHasSavedSquad] = useState(false);
  const [scores,        setScores]        = useState({});
  const [copied,        setCopied]        = useState(false);
  const [confirming,    setConfirming]    = useState(false);

  const schedule = useMemo(() => buildSchedule(), []);

  /* ── Subscribe to challenge doc (real-time) ── */
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'challenges', id), snap => {
      if (snap.exists()) setChallenge({ id: snap.id, ...snap.data() });
      else setNotFound(true);
    }, () => setNotFound(true));
    return unsub;
  }, [id]);

  const match  = challenge ? schedule.find(m => m.id === challenge.matchId) : null;
  const locked = match ? isMatchLocked(match) : false;

  /* ── Countdown timer ── */
  useEffect(() => {
    if (!match || locked) { setSecs(null); return; }
    const matchUTC = parseMatchUTC(match.date, match.time);
    function tick() {
      const s = Math.floor((matchUTC - Date.now()) / 1000);
      setSecs(s >= 0 ? s : 0);
    }
    tick();
    const tid = setInterval(tick, 1000);
    return () => clearInterval(tid);
  }, [match?.id, locked]);

  /* ── Check saved squad ── */
  useEffect(() => {
    if (!user || !challenge) return;
    const fmt = challenge.fmt === 'r3' ? 'r3' : 'xi';
    getDoc(doc(db, 'squads', `${challenge.matchId}_${user.uid}_${fmt}`))
      .then(snap => setHasSavedSquad(snap.exists()))
      .catch(() => {});
  }, [user?.uid, challenge?.id]);

  /* ── Load leaderboard scores (post-match) ── */
  useEffect(() => {
    if (!challenge || !match) return;
    if (match.status !== 'live' && match.status !== 'past') return;
    const fmt = challenge.fmt === 'r3' ? 'r3' : 'xi';
    Promise.all((challenge.members || []).map(async uid => {
      const snap = await getDoc(doc(db, 'squads', `${challenge.matchId}_${uid}_${fmt}`)).catch(() => null);
      return { uid, points: snap?.exists() ? (snap.data().points ?? 0) : null };
    })).then(results => {
      const s = {};
      results.forEach(r => { s[r.uid] = r.points; });
      setScores(s);
    });
  }, [challenge?.id, match?.status]);

  /* ── Derived state ── */
  const memberStatus = challenge?.memberStatus || {};
  const isMember     = !!(challenge && user && challenge.members?.includes(user.uid));
  const myStatus     = isMember ? (memberStatus[user?.uid] || 'pending') : null;
  const allReady     = !!(challenge && challenge.members?.every(uid => memberStatus[uid] === 'ready'));
  const readyCount   = (challenge?.members || []).filter(uid => memberStatus[uid] === 'ready').length;
  const isPostMatch  = match?.status === 'live' || match?.status === 'past';
  const showTimer    = secs !== null && secs <= 180 && secs > 0 && !locked;

  /* ── Actions ── */
  async function useSavedSquad() {
    if (!user || !challenge) return;
    setConfirming(true);
    try {
      await updateDoc(doc(db, 'challenges', id), {
        [`memberStatus.${user.uid}`]: 'ready',
      });
      toast('Saved squad confirmed!');
    } catch (e) { toast('Could not confirm squad', false); }
    setConfirming(false);
  }

  function pickSquad() {
    const path = challenge.fmt === 'r3' ? 'r3' : 'xi';
    router.push(`/play/${challenge.matchId}/${path}?cid=${id}`);
  }

  function poke(name) {
    const text = `Oi ${name}! 👀 Pick your squad for "${challenge.name}" before it locks!\nCode: ${challenge.code} on dotball`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  function copyCode() {
    navigator.clipboard.writeText(challenge.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast('Could not copy', false));
  }

  function shareWhatsApp() {
    const fmtLabel = challenge.fmt === 'r3' ? 'Top 3' : 'Classic XI';
    const match2   = match ? `${match.t1} vs ${match.t2}` : '';
    const text     = `Join my dotball challenge "${challenge.name}" ${match2 ? `for ${match2}` : ''}!\nFormat: ${fmtLabel}\nCode: *${challenge.code}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  /* ── Not found ── */
  if (notFound) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🤷</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>Challenge not found</div>
        <div style={{ fontSize: 11, color: t.text2, marginTop: 4 }}>The code may be wrong or the challenge was deleted.</div>
        <button onClick={() => router.push('/')} style={{ marginTop: 16, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          Go home
        </button>
      </div>
    );
  }

  if (!challenge) {
    return <div style={{ padding: 32, textAlign: 'center', color: t.text3, fontSize: 12 }}>Loading challenge…</div>;
  }

  const fmtLabel = challenge.fmt === 'r3' ? 'Top 3' : 'Classic XI';

  /* ══════════════ RENDER ══════════════ */
  return (
    <div style={{ padding: '0 14px 24px' }}>

      {/* ── Match banner ── */}
      {match && (
        <div style={{ marginTop: 12, marginBottom: 10, borderRadius: 14, background: t.surface, border: `1px solid ${t.border}`, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            {/* Format badge */}
            <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', background: '#6366f118', padding: '3px 8px', borderRadius: 99, letterSpacing: 0.5 }}>
              {fmtLabel}
            </span>
            <span style={{ fontSize: 9, color: t.text3 }}>{match.date} · {match.time} IST</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TeamLogo team={match.t1} size={30} />
              <span style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{match.t1}</span>
            </div>
            <span style={{ fontSize: 11, color: t.text3, fontWeight: 600 }}>vs</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{match.t2}</span>
              <TeamLogo team={match.t2} size={30} />
            </div>
          </div>
        </div>
      )}

      {/* ── Challenge header: name + code + share ── */}
      <div style={{ marginBottom: 10, borderRadius: 14, background: t.surface, border: `1px solid ${t.border}`, padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{challenge.name}</div>
            <div style={{ fontSize: 10, color: t.text2, marginTop: 2 }}>by {challenge.ownerName} · {challenge.members?.length} players</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {/* Code pill — tap to copy */}
            <button
              onClick={copyCode}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface2, color: copied ? '#22c55e' : '#f5a623', fontSize: 13, fontWeight: 800, letterSpacing: 3, cursor: 'pointer', fontFamily: 'Georgia, serif', transition: 'color 0.15s' }}
              title="Tap to copy code"
            >
              {copied ? '✓ Copied' : challenge.code}
            </button>
            {/* WhatsApp share */}
            <button onClick={shareWhatsApp} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Share
            </button>
          </div>
        </div>
      </div>

      {/* ── Countdown timer (< 180 s) ── */}
      {showTimer && (
        <div style={{ marginBottom: 10, borderRadius: 12, padding: '10px 14px', background: '#ff6b0014', border: '1px solid #fb923c33', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c' }}>⚡ Picks lock in</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#fb923c', fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>{fmtSecs(secs)}</span>
        </div>
      )}

      {/* ── Match locked banner ── */}
      {locked && (
        <div style={{ marginBottom: 10, borderRadius: 12, padding: '10px 14px', background: '#ef444414', border: '1px solid #ef444433', textAlign: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
            {isPostMatch ? 'Match in progress — picks are locked' : 'Picks are locked'}
          </span>
        </div>
      )}

      {/* ── All squads locked celebration ── */}
      {allReady && !locked && (
        <div style={{ marginBottom: 10, borderRadius: 14, padding: '16px 14px', background: 'linear-gradient(135deg,#052e16,#14532d)', border: '1px solid #22c55e44', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🔥</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#22c55e' }}>All squads locked!</div>
          <div style={{ fontSize: 11, color: '#86efac', marginTop: 4 }}>Everyone's ready — match starts soon. May the best team win!</div>
        </div>
      )}

      {/* ── Tabs (post-match) ── */}
      {isPostMatch && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[['lobby', 'Squad Status'], ['leaderboard', 'Leaderboard']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${tab === key ? '#6366f1' : t.border}`, background: tab === key ? '#6366f118' : 'transparent', color: tab === key ? '#818cf8' : t.text2, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ══ LOBBY TAB ══ */}
      {tab === 'lobby' && (
        <>
          {/* Member list */}
          <div style={{ borderRadius: 14, background: t.surface, border: `1px solid ${t.border}`, overflow: 'hidden', marginBottom: 10 }}>
            {/* Header row */}
            <div style={{ padding: '9px 12px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.text2, letterSpacing: 0.5 }}>PLAYERS</span>
              <span style={{ fontSize: 10, color: readyCount === challenge.members?.length ? '#22c55e' : t.text3, fontWeight: 600 }}>
                {readyCount}/{challenge.members?.length} ready
              </span>
            </div>

            {(challenge.members || []).map((uid, i) => {
              const name    = challenge.memberNames?.[i] || 'Player';
              const status  = STATUS_CFG[memberStatus[uid]] || STATUS_CFG.pending;
              const isMe    = uid === user?.uid;
              const isLast  = i === challenge.members.length - 1;
              return (
                <div
                  key={uid}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px',
                    borderBottom: isLast ? 'none' : `1px solid ${t.border}44`,
                    background: isMe ? '#6366f108' : 'transparent',
                  }}
                >
                  {/* Avatar */}
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: isMe ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: isMe ? '#fff' : t.text2, flexShrink: 0 }}>
                    {name.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Name + status */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                      {isMe && <span style={{ fontSize: 9, color: '#818cf8', marginLeft: 5 }}>you</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontSize: 9, color: status.dot, fontWeight: 600 }}>{status.label}</span>
                    </div>
                  </div>

                  {/* Poke button — only for non-ready others, before lock */}
                  {!isMe && memberStatus[uid] !== 'ready' && !locked && (
                    <button
                      onClick={() => poke(name)}
                      style={{ padding: '5px 9px', borderRadius: 7, border: 'none', background: '#25D36620', color: '#25D366', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                    >
                      Poke 👋
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Pick CTA ── */}
          {isMember && !locked && (
            myStatus === 'ready' ? (
              <div style={{ textAlign: 'center', padding: '12px', fontSize: 13, color: '#22c55e', fontWeight: 700 }}>
                ✓ Your squad is locked in!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={pickSquad}
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  {challenge.fmt === 'r3' ? '🏆 Pick my Top 3' : '⚡ Pick my XI'}
                </button>
                {hasSavedSquad && (
                  <button
                    onClick={useSavedSquad}
                    disabled={confirming}
                    style={{ width: '100%', padding: 13, borderRadius: 12, border: '1px solid #22c55e44', background: '#22c55e0c', color: '#22c55e', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: confirming ? 0.6 : 1 }}
                  >
                    {confirming ? 'Confirming…' : '✓ Use my saved squad'}
                  </button>
                )}
              </div>
            )
          )}

          {/* Not a member */}
          {!isMember && user && (
            <div style={{ textAlign: 'center', padding: 16, color: t.text2, fontSize: 12 }}>
              You're viewing this challenge. Go to <strong>Groups</strong> to join with a code.
            </div>
          )}
        </>
      )}

      {/* ══ LEADERBOARD TAB ══ */}
      {tab === 'leaderboard' && (
        <div style={{ borderRadius: 14, background: t.surface, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '9px 12px', borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: t.text2, letterSpacing: 0.5 }}>LEADERBOARD</span>
          </div>
          {(challenge.members || [])
            .map((uid, i) => ({ uid, name: challenge.memberNames?.[i] || 'Player', pts: scores[uid] }))
            .sort((a, b) => {
              if (a.pts == null && b.pts == null) return 0;
              if (a.pts == null) return 1;
              if (b.pts == null) return -1;
              return b.pts - a.pts;
            })
            .map((entry, rank) => {
              const isMe   = entry.uid === user?.uid;
              const rankEl = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}`;
              const isLast = rank === challenge.members.length - 1;
              return (
                <div
                  key={entry.uid}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderBottom: isLast ? 'none' : `1px solid ${t.border}44`, background: isMe ? '#6366f108' : 'transparent' }}
                >
                  <span style={{ fontSize: rank < 3 ? 18 : 12, fontWeight: 900, color: rank === 0 ? '#f59e0b' : rank === 1 ? '#94a3b8' : rank === 2 ? '#b45309' : t.text3, width: 24, textAlign: 'center', flexShrink: 0 }}>
                    {rankEl}
                  </span>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: t.text }}>
                    {entry.name}
                    {isMe && <span style={{ fontSize: 9, color: '#818cf8', marginLeft: 5 }}>you</span>}
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 900, color: entry.pts != null ? '#6366f1' : t.text3 }}>
                    {entry.pts != null ? entry.pts : '—'}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
